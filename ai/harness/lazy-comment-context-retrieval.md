---
title: Lazy Comment Context Retrieval
category: harness
tags:
  - ai
  - claude-code
  - context-engineering
  - token-optimization
  - code-retrieval
source: https://docs.anthropic.com/en/docs/claude-code/overview
updated: 2026-09-17
---

# Lazy Comment Context Retrieval

> 소스코드의 주석을 본문에서 분리해 작은 참조 키만 남기고, Coding Agent가 필요하다고 판단한 주석만 온디맨드로 조회하게 하는 **주석 가상화(Comment Virtualization) / Lazy Comment Retrieval** 패턴.

## 프로젝트 개요

Claude Code 같은 Coding Agent가 소스 파일을 읽을 때 코드와 모든 주석을 함께 컨텍스트에 넣는 대신, 전처리 계층이 주석을 AST 기반으로 추출해 별도 Comment Store에 저장한다. 모델에게 전달되는 코드에는 짧은 안정적 ID만 남기며, 의미가 필요한 경우 별도 도구로 원문 주석을 조회한다.

이 아이디어의 핵심은 주석을 삭제하는 것이 아니라 **cold context로 이동**시키는 것이다.

## 해결하려는 문제

대규모/레거시 코드에서는 긴 설명 주석, 라이선스 헤더, 반복 TODO, XML/Javadoc/Doxygen 문서가 코드 탐색 시 항상 모델 입력에 포함될 수 있다. 실제 작업에서는 그중 일부만 필요하지만 전체 파일 읽기 시 모두 토큰 비용을 발생시킨다.

이미 AST/LSP 기반 코드 검색 도구들이 전체 파일 대신 필요한 symbol만 전달해 토큰을 줄이는 방향을 사용한다. 이 패턴은 같은 원리를 symbol 내부의 **comment layer**까지 세분화한다.

## 핵심 아이디어

```text
Original Source
      |
      v
 AST / Tree-sitter Parser
      |
      +---- executable code ----------+
      |                               |
      +---- comments --> Comment Store|
                         {             |
                           C:a81f: ... |
                           C:29bd: ... |
                         }             |
                                       v
                         Virtualized Source
                         /*@C:a81f*/
                         void Foo() {
                           ...
                         }
                               |
                               v
                          Claude Code
                               |
                     comment needed?
                         /           \
                       no             yes
                       |               |
                    continue     get_comment(C:a81f)
                                       |
                                       v
                                  original text
```

## 권장 구조

### 1. Comment Extractor

정규식보다 Tree-sitter/언어 AST를 권장한다. 주석의 위치뿐 아니라 인접 symbol, comment 종류, line range를 함께 저장할 수 있기 때문이다.

분류 예:

- license/header
- line comment
- block comment
- doc comment
- TODO/FIXME
- XML documentation
- disabled-code-like comment

### 2. Stable Comment ID

단순 순번 `C1`, `C2`보다 내용과 위치를 이용한 짧은 hash ID를 권장한다.

예: `C:a81f`, `C:29bd`

파일 내 앞부분에 주석이 추가되어도 이후 ID가 전부 바뀌는 문제를 줄이고 캐시/추적에도 유리하다.

### 3. Comment Store

초기 PoC는 JSON/SQLite면 충분하다.

```json
{
  "C:a81f": {
    "file": "Foo.cpp",
    "symbol": "Foo::Initialize",
    "kind": "doc",
    "line": 42,
    "text": "..."
  }
}
```

### 4. Agent Retrieval Tool

최소 도구는 다음 정도가 적합하다.

- `get_comment(id)`
- `get_comments(ids[])`
- `get_symbol_comments(symbol)`

가능하면 여러 ID를 한 번에 가져오는 batch API를 제공해 tool round-trip을 줄인다.

## 중요한 개선점: 모든 주석을 동일하게 숨기지 않는다

완전한 comment stripping은 정확도를 떨어뜨릴 수 있다. 주석은 종종 코드만으로 알 수 없는 설계 의도, workaround 이유, thread-safety 조건, 외부 시스템 제약을 담는다.

따라서 **3-tier 정책**이 더 적합하다.

| Tier | 처리 | 예 |
|---|---|---|
| Hot | 코드와 함께 유지 | 짧은 TODO, safety invariant, pragma 관련 설명 |
| Warm | 한 줄 요약 + ID | API 계약, 함수 설명, workaround 설명 |
| Cold | ID만 유지 | 긴 문서 주석, 반복 설명, 라이선스 헤더 |

즉 `comment -> key`만 적용하기보다 `comment -> policy -> keep / summarize / virtualize`가 실전성이 높다.

## Claude Code 적용 방식

Claude Code 기본 Read를 그대로 사용하면 원본 파일의 주석까지 읽게 되므로 이 패턴의 효과가 없다. 따라서 **원본 Read 앞에 별도 retrieval layer**가 필요하다.

PoC 우선순위:

1. CLI: `comment-view Foo.cpp`가 virtualized source 출력
2. Claude Skill에서 큰 소스 탐색 시 `comment-view`를 우선 사용하도록 지침
3. 안정화 후 MCP 또는 전용 code retrieval tool로 제공
4. symbol-level retrieval과 결합

편집 단계에서는 원본 파일이 필요하므로 virtualized source는 탐색/분석용 read path로 한정하는 것이 안전하다.

## 기존 접근과의 관계

### LSP / AST symbol retrieval

LSP나 AST 기반 retrieval은 **어떤 코드 조각을 읽을지** 줄인다. Lazy Comment Retrieval은 선택된 코드 조각 안에서도 **어떤 설명 텍스트를 읽을지** 줄인다. 경쟁 관계가 아니라 직렬로 결합할 수 있다.

```text
Repository
  -> Symbol Retrieval
  -> Selected Function/Class
  -> Comment Virtualization
  -> Claude
```

### ASTral / CodeMunch / Clang AST MCP 계열

이들 도구는 전체 파일 대신 symbol 단위 source를 전달하는 방향이다. 일부 AST 인덱서는 doc comment도 symbol metadata로 저장한다. 따라서 독립 MCP를 하나 더 만드는 것보다 기존 symbol index에 `comments=lazy` 옵션을 추가하는 형태가 더 단순할 수 있다.

## 장점

- 주석이 많은 레거시 C++/C#/Java 코드에서 입력 토큰 절감 가능
- 긴 XML/Javadoc/Doxygen 주석의 반복 전송 방지
- 코드 구조 탐색 단계에서 signal-to-noise 개선
- 필요한 주석은 원문 그대로 복원 가능
- symbol retrieval과 결합하면 계층적 context loading 구현 가능

## 단점 및 한계

### Tool call 비용

필요한 주석을 하나씩 가져오면 오히려 round-trip과 tool schema/output 비용이 늘 수 있다. batch retrieval과 짧은 ID가 중요하다.

### 의미 손실

주석에만 존재하는 비즈니스 규칙이나 위험한 invariant를 모델이 '읽을 필요 없음'으로 오판할 수 있다. safety/concurrency/workaround 관련 주석은 Hot/Warm으로 유지하는 정책이 필요하다.

### 편집 시 위치 문제

가상화된 코드는 원본과 line/column이 달라질 수 있다. 편집은 원본 파일을 대상으로 하고, Comment Store에 원본 line range를 유지해야 한다.

### 작은 파일에서는 이득이 작음

주석 비율이 낮거나 파일 자체가 작은 경우 placeholder와 retrieval layer가 순수 overhead가 된다. 파일 크기/주석 토큰 비율 임계치를 두는 편이 좋다.

### 캐시와의 상호작용

반복적으로 동일 파일을 읽는 워크플로에서는 prompt caching 때문에 단순 토큰 수 감소가 실제 비용 감소와 정확히 비례하지 않을 수 있다. 실제 Claude Code 세션에서 측정해야 한다.

## 활용 사례

- UE5 C++의 긴 클래스/헤더 탐색
- 사내 C# 코드의 XML documentation이 많은 프로젝트
- 자동 생성 코드에 설명 주석이 대량 포함된 경우
- 레거시 코드의 장문 workaround/history comment
- 여러 Agent가 같은 코드베이스를 탐색하는 Harness

## 활용 아이디어

### 바로 적용 가능

CLI 기반 PoC. Tree-sitter 또는 언어 parser로 comments를 추출하고 virtualized view를 생성한다. Claude Skill에 "탐색 단계에서는 원본 Read보다 virtualized view를 우선"하도록 지정한다.

### PoC 가치 높음

현재 Perforce/UE5 Claude Harness에서 C++ 파일 30~50개를 선정해 A/B 테스트한다.

측정값:

- 원본 source tokens
- virtualized source tokens
- 추가 comment retrieval tokens
- tool call 횟수
- task completion 정확도
- 수정 후 test/build 성공률
- 총 context/token 절감률

주석 비율별로 나누어 측정해야 한다.

### 다음 단계

Comment virtualization만 단독 구현하기보다 향후 **Code Context Gateway**로 확장할 가치가 있다.

```text
Claude
  |
Code Context Gateway
  |-- symbol source
  |-- comments (lazy)
  |-- references
  |-- call graph
  |-- git/perforce history (lazy)
  `-- docs/specs (lazy)
```

이렇게 하면 코드 본문만 hot context로 두고 주석·history·docs를 필요 시 로딩하는 계층형 Context Architecture가 된다.

## 결론

아이디어 자체는 충분히 타당하며 특히 주석이 많은 엔터프라이즈/UE C++ 코드베이스에서 실험 가치가 높다. 다만 **모든 주석을 key로 치환하는 방식보다 주석 중요도에 따라 Hot/Warm/Cold로 분류하는 Lazy Comment Context가 더 안전하다.**

또한 이것만 별도 MCP로 만들기보다 symbol-level source retrieval 계층과 결합하는 편이 토큰 효율과 운영 복잡도 양쪽에서 유리할 가능성이 높다.

## 참고 자료

- Anthropic Claude Code documentation: https://docs.anthropic.com/en/docs/claude-code/overview
- Anthropic MCP documentation: https://docs.anthropic.com/en/docs/mcp
- ASTral: https://github.com/Atypical-Consulting/ASTral
- Clang AST MCP Server: https://github.com/daveelton/clast
- CodeMunch: https://github.com/benmarte/codemunch
- Claude Code structural file reading feature discussion: https://github.com/anthropics/claude-code/issues/34304
