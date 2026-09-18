---
title: Virtual Remark
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

# Virtual Remark

> 소스코드의 주석을 별도 저장소로 가상화하고 코드에는 짧은 참조 키만 유지하여, Coding Agent가 필요하다고 판단한 주석만 온디맨드로 조회하는 **Virtual Remark (VR)** Context Optimization 패턴.

## 프로젝트 개요

Claude Code 같은 Coding Agent가 소스 파일을 읽을 때 코드와 모든 주석을 함께 컨텍스트에 넣는 대신, 전처리 계층이 주석을 AST 기반으로 추출해 별도 Remark Store에 저장한다. 모델에게 전달되는 코드에는 짧은 안정적 ID만 남기며, 의미가 필요한 경우 별도 도구로 원문 주석을 조회한다.

이 아이디어의 핵심은 주석을 삭제하는 것이 아니라 **cold context로 이동**시키는 것이다.

## 해결하려는 문제

대규모/레거시 코드에서는 긴 설명 주석, 라이선스 헤더, 반복 TODO, XML/Javadoc/Doxygen 문서가 코드 탐색 시 항상 모델 입력에 포함될 수 있다. 실제 작업에서는 그중 일부만 필요하지만 전체 파일 읽기 시 모두 토큰 비용을 발생시킨다.

Virtual Remark는 선택된 코드 조각 안에서도 자연어 설명 계층을 필요할 때만 읽게 하여 context 사용량을 줄이는 것을 목표로 한다.

## 핵심 아이디어

```text
Original Source
      |
      v
 Virtual Remark Preprocessor
      |
      +---- executable code ----------+
      |                               |
      +---- remarks --> Remark Store  |
                         {             |
                           VR:a81f ... |
                           VR:29bd ... |
                         }             |
                                       v
                         Virtualized Source
                         /*@VR:a81f*/
                         void Foo() {
                           ...
                         }
                               |
                               v
                          Claude Code
                               |
                       remark needed?
                         /           \
                       no             yes
                       |               |
                    continue     get_remark(VR:a81f)
                                       |
                                       v
                                  original text
```

## 권장 구조

### 1. Remark Extractor

정규식보다 Tree-sitter/언어 AST를 권장한다. 주석의 위치뿐 아니라 인접 symbol, 종류, line range를 함께 저장할 수 있기 때문이다.

분류 예:

- license/header
- line comment
- block comment
- doc comment
- TODO/FIXME
- XML documentation
- disabled-code-like comment

### 2. Stable Remark ID

단순 순번보다 내용과 위치를 이용한 짧은 hash ID를 권장한다.

예: `VR:a81f`, `VR:29bd`

파일 내 앞부분에 주석이 추가되어도 이후 ID가 전부 바뀌는 문제를 줄이고 캐시/추적에도 유리하다.

### 3. Remark Store

초기 PoC는 JSON/SQLite면 충분하다.

```json
{
  "VR:a81f": {
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

- `get_remark(id)`
- `get_remarks(ids[])`
- `get_symbol_remarks(symbol)`

가능하면 여러 ID를 한 번에 가져오는 batch API를 제공해 tool round-trip을 줄인다.

## 중요한 개선점: 모든 주석을 동일하게 숨기지 않는다

완전한 comment stripping은 정확도를 떨어뜨릴 수 있다. 주석은 종종 코드만으로 알 수 없는 설계 의도, workaround 이유, thread-safety 조건, 외부 시스템 제약을 담는다.

따라서 **3-tier 정책**이 더 적합하다.

| Tier | 처리 | 예 |
|---|---|---|
| Hot | 코드와 함께 유지 | 짧은 TODO, safety invariant, pragma 관련 설명 |
| Warm | 한 줄 요약 + ID | API 계약, 함수 설명, workaround 설명 |
| Cold | ID만 유지 | 긴 문서 주석, 반복 설명, 라이선스 헤더 |

즉 `remark -> key`만 적용하기보다 `remark -> policy -> keep / summarize / virtualize`가 실전성이 높다.

## Claude Code 적용 방식

Claude Code 기본 Read를 그대로 사용하면 원본 파일의 주석까지 읽게 되므로 이 패턴의 효과가 없다. 따라서 **원본 Read 앞에 별도 retrieval layer**가 필요하다.

PoC 우선순위:

1. CLI: `virtual-remark Foo.cpp`가 virtualized source 출력
2. Claude Skill에서 큰 소스 탐색 시 Virtual Remark view를 우선 사용하도록 지침
3. 안정화 후 MCP 또는 전용 code retrieval tool로 제공
4. symbol-level retrieval과 결합

편집 단계에서는 원본 파일이 필요하므로 virtualized source는 탐색/분석용 read path로 한정하는 것이 안전하다.

## 장점

- 주석이 많은 레거시 C++/C#/Java 코드에서 입력 토큰 절감 가능
- 긴 XML/Javadoc/Doxygen 주석의 반복 전송 방지
- 코드 구조 탐색 단계에서 signal-to-noise 개선
- 필요한 주석은 원문 그대로 복원 가능
- symbol retrieval과 결합하면 계층적 context loading 구현 가능

## 단점 및 한계

- 필요한 주석을 하나씩 가져오면 tool round-trip 비용이 늘 수 있어 batch retrieval이 중요하다.
- 주석에만 존재하는 invariant를 모델이 읽지 않을 위험이 있어 Hot/Warm 정책이 필요하다.
- 가상화된 코드와 원본의 line/column 차이를 관리해야 한다.
- 작은 파일이나 주석 비율이 낮은 파일에서는 overhead가 더 클 수 있다.
- prompt caching과의 상호작용 때문에 실제 비용 절감률은 실측이 필요하다.

## 활용 사례

- UE5 C++의 긴 클래스/헤더 탐색
- 사내 C# 코드의 XML documentation이 많은 프로젝트
- 자동 생성 코드에 설명 주석이 대량 포함된 경우
- 레거시 코드의 장문 workaround/history comment
- 여러 Agent가 같은 코드베이스를 탐색하는 Harness

## 활용 아이디어

### 바로 적용 가능

CLI 기반 PoC. Tree-sitter 또는 언어 parser로 remarks를 추출하고 virtualized view를 생성한다. Claude Skill에 탐색 단계에서는 원본 Read보다 Virtual Remark view를 우선하도록 지정한다.

### PoC 가치 높음

현재 Perforce/UE5 Claude Harness에서 C++ 파일 30~50개를 선정해 A/B 테스트한다.

측정값:

- 원본 source tokens
- virtualized source tokens
- 추가 remark retrieval tokens
- tool call 횟수
- task completion 정확도
- 수정 후 test/build 성공률
- 총 context/token 절감률

### 다음 단계

Virtual Remark만 단독 구현하기보다 향후 **Code Context Gateway**로 확장할 가치가 있다.

```text
Claude
  |
Code Context Gateway
  |-- symbol source
  |-- remarks (lazy)
  |-- references
  |-- call graph
  |-- git/perforce history (lazy)
  `-- docs/specs (lazy)
```

## 결론

**Virtual Remark (VR)** 는 소스 주석을 삭제하는 대신 가상화하여 필요할 때만 hydrate하는 Context Engineering 패턴이다. 특히 주석이 많은 엔터프라이즈/UE C++ 코드베이스에서 실험 가치가 높다. 모든 주석을 무조건 숨기기보다 중요도에 따라 Hot/Warm/Cold로 분류하고, 장기적으로 symbol-level retrieval 계층과 결합하는 방향을 권장한다.

## 참고 자료

- Anthropic Claude Code documentation: https://docs.anthropic.com/en/docs/claude-code/overview
- Anthropic MCP documentation: https://docs.anthropic.com/en/docs/mcp
- ASTral: https://github.com/Atypical-Consulting/ASTral
- Clang AST MCP Server: https://github.com/daveelton/clast
- CodeMunch: https://github.com/benmarte/codemunch
- Claude Code structural file reading feature discussion: https://github.com/anthropics/claude-code/issues/34304
