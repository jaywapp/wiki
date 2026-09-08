---
title: vs-token-safer
category: tools
tags:
  - ai
  - claude-code
  - token-optimization
  - mcp
  - code-search
  - lsp
  - tree-sitter
source: https://github.com/JSungMin/vs-token-safer
updated: 2026-09-08
---

# vs-token-safer

> Claude Code의 grep/read 중심 코드 탐색을 LSP·tree-sitter 기반의 짧은 `file:line` 질의로 바꿔, 대형 코드베이스에서 컨텍스트와 입력 토큰 소비를 줄이는 로컬 코드 인덱싱/MCP 플러그인.

## 프로젝트 개요

`vs-token-safer`는 코딩 에이전트가 대형 저장소를 탐색할 때 `grep`, 전체 파일 Read, 대량 로그 출력으로 컨텍스트를 소모하는 문제를 줄이기 위한 Claude Code 플러그인이다.

핵심은 단순한 출력 압축이 아니라, 검색 자체를 텍스트 검색에서 구조화된 코드 인덱스 질의로 전환하는 것이다. Claude가 grep을 시도하면 PreToolUse hook이 안전한 검색을 `search_symbol` 등의 질의로 재작성할 수 있고, 결과는 소스 본문 대신 제한된 `file:line` 목록으로 반환된다.

TypeScript/JavaScript/Python은 비교적 낮은 설정 비용으로 사용할 수 있고, C#/C++는 Roslyn/clangd를 semantic backend로 사용한다. 언어 서버가 없거나 준비되지 않은 상황에서는 tree-sitter 기반 syntactic index로 내려가는 구조다.

조사 기준 최신 릴리스는 **v1.1.9 (2026-09-07)** 이다.

## 해결하려는 문제

AI 코딩 에이전트의 컨텍스트 창은 저장소 크기에 비해 작다. 특히 대규모 C++/Unreal 또는 모노레포에서 다음 패턴이 큰 비용을 만든다.

- 저장소 전체 `grep`/`rg` 결과를 컨텍스트에 주입
- 심볼 위치를 찾기 위해 파일 전체 Read
- 정의/참조를 텍스트 일치로 찾으면서 주석·include·문자열까지 수집
- 동일 탐색을 세션마다 반복
- 언어 서버가 제공하는 이미 존재하는 semantic index를 에이전트가 활용하지 못함

vs-token-safer는 에이전트가 필요한 것이 대개 "전체 코드"가 아니라 **정확한 다음 탐색 위치**라는 점을 이용한다.

## 핵심 기능

### Precision Ladder

검색을 다음 계층으로 처리한다.

1. **EXACT** — clangd / Roslyn / tsserver / pyright 등의 언어 서버를 통한 semantic 검색
2. **SYNTACTIC** — tree-sitter 기반 선언 인덱스
3. **FUZZY** — 저장소 식별자와 주석을 이용한 로컬 concept search
4. **SECTION** — Markdown/TOML/YAML 등 문서의 section 단위 탐색

언어 서버가 cold 상태이거나 존재하지 않아도 하드 실패하지 않고 낮은 계층에서 결과를 반환한 뒤, backend가 준비되면 더 높은 정밀도로 올라가는 graceful degradation을 지향한다.

### grep 재작성

Claude Code가 단순 코드 검색을 Bash grep/rg로 수행하려 할 때 hook이 이를 감지해 token-capped 인덱스 질의로 바꿀 수 있다.

이 방식은 단순히 grep을 금지하는 것보다 에이전트 흐름을 덜 끊는다. 모호하거나 안전하게 변환하기 어려운 명령은 차단/경고 경로를 사용한다.

### 심볼 기반 탐색과 편집

대표적으로 다음 종류의 작업을 제공한다.

- symbol search
- definition 이동
- reference 검색
- 심볼 body 교체
- 심볼 앞/뒤 삽입
- 삭제

즉 `파일 전체 읽기 → 라인 번호 계산 → Edit` 대신 `심볼 이름 → 범위 결정 → 수정` 흐름을 만들 수 있다.

### 변경 영향 분석

`detect_changes`는 git diff를 변경된 심볼에 연결하고 호출자와 변경 이력을 이용해 영향 반경을 평가한다. 영속 그래프 DB나 외부 embedding 서비스 없이 언어 서버와 git history를 활용하는 것이 특징이다.

### 자체 사용량 관찰

`vts discover`와 savings 관련 기능으로 Claude 세션에서 vts를 우회한 검색과 잠재적 토큰 낭비를 찾는다. 다만 hook 자체의 안내 문구도 토큰을 소비하기 때문에 최신 v1.1.9에서는 `hookNoise: quiet` 설정이 추가되었다.

### 로컬 우선

코드 인덱싱과 concept search는 로컬에서 수행하며 외부 AI 모델/embedding 전송을 요구하지 않는 방향으로 설계되어 있다.

## 아키텍처

```text
Claude Code
    |
    | Bash / Grep / Read / Edit 시도
    v
PreToolUse Hooks
    |
    +-- 안전한 검색 --> vts 질의로 rewrite
    +-- 모호한 검색 --> block / nudge
    |
    v
vs-search MCP / CLI
    |
    +-- EXACT ------> clangd / Roslyn / tsserver / pyright
    +-- SYNTACTIC --> tree-sitter index (.vts-index)
    +-- FUZZY ------> repo identifier/comment concept dictionary
    +-- SECTION ----> Markdown/config section index
    |
    v
Token-capped result
`kind symbol @ file:line`
    |
    v
Claude가 필요한 부분만 후속 Read/Edit
```

핵심 설계 포인트는 **코드를 모델에게 덜 보여 주는 대신 모델이 어디를 봐야 하는지 더 정확하게 알려 주는 것**이다.

## 성능 및 Token 절감

프로젝트가 공개한 benchmark는 두 종류로 보는 것이 안전하다.

### 재현 가능한 synthetic benchmark

150-file corpus에서 TypeScript/Python/Go를 합산한 검색 토큰 감소가 약 **87%**라고 보고한다. 언어별 수치는 TypeScript 약 87%, Python 약 83%, Go(tree-sitter) 약 91%다.

CI의 mock LSP gate에서는 raw language-server response 약 57k tokens를 capped output 약 1.5k tokens로 줄여 약 **97.4%** 감소시키는 검사를 수행한다.

### Unreal Engine 실측 주장

프로젝트 문서에서는 대형 UE5 트리에서 공개 엔진 심볼 `FGameplayTag` 검색 시 whole-repo grep 약 282k tokens 대비 plugin 약 2k tokens, 즉 약 **99.3% / 138x 감소**를 보고한다.

또 다른 UE 모듈에서는 tree-sitter locate가 cold clangd보다 훨씬 빠르게 위치를 반환했다고 보고한다.

### 해석 주의

이 수치는 "일반적인 모든 Claude Code 세션의 총 토큰이 87~99% 감소한다"는 의미가 아니다. **검색 결과를 컨텍스트에 넣는 비용**에 대한 비교가 중심이다. 실제 세션 절감률은 검색 비중, hook 출력, 후속 Read 횟수, 프로젝트 인덱싱 상태에 따라 달라진다.

실제로 v1.1.9 변경 내역에는 장시간 세션에서 PreToolUse nudge 자체가 상당한 토큰을 소비할 수 있다는 관찰이 포함되어 `hookNoise: quiet`가 추가됐다. 이 부분은 도구의 장점뿐 아니라 overhead도 실제 사용에서 측정했다는 점에서 중요하다.

## C# / C++ / Windows 관점

### C++ / Unreal

clangd를 semantic backend로 사용하며 Unreal 규모를 주요 검증 대상으로 삼고 있다. `compile_commands.json` 준비와 cold index 비용이 핵심 운영 포인트다.

프로젝트는 compile DB와 clangd cache를 source tree 밖에 둘 수 있도록 지원해 Git/Perforce reconcile 오염을 피하려 한다. 대형 Perforce UE 저장소에서는 특히 유용한 설계다.

### C# / Unity / .NET

Roslyn/csharp-ls 계층을 지원한다. 최신 v1.1.9에서는 `vts setup --csharp` provisioning이 추가되어 dotnet 경로, Roslyn launcher, 여러 csproj를 여는 solution 구성 문제를 자동화하려는 방향으로 개선됐다.

### Windows

CI가 Windows/Linux 및 Node 18/20/22를 대상으로 하고 있으며 Windows spawn 관련 수정도 지속되고 있다. 다만 실제 Enterprise Windows 환경에서는 언어 서버 설치, PATH/DOTNET_ROOT, compile DB 생성 방식까지 PoC로 확인하는 것이 좋다.

## 장점

- **대형 코드베이스와 궁합이 좋다.** 검색 결과가 커질수록 grep 대비 이득이 커진다.
- **semantic navigation을 에이전트에게 노출한다.** IDE가 이미 활용하던 LSP 인덱스를 Claude Code workflow로 가져온다.
- **graceful degradation.** 언어 서버가 준비되지 않아도 tree-sitter로 기본 탐색이 가능하다.
- **로컬 우선 구조.** 코드 검색 때문에 별도 embedding/vector DB 서비스를 운영할 필요가 없다.
- **Claude 행동을 hook에서 교정한다.** 프롬프트에 "grep 쓰지 마"라고 적는 것보다 강제력이 높다.
- **심볼 단위 편집까지 확장한다.** 검색 최적화가 후속 Read/Edit 감소로 이어질 가능성이 있다.
- **Perforce/UE 환경을 실제 고려한다.** source tree 밖의 index/compile DB는 reconcile 노이즈를 줄이는 데 의미가 있다.

## 단점 및 한계

### 초기 구축 비용

C++는 compile database와 clangd가 제대로 준비되어야 EXACT 계층의 장점을 얻는다. 대형 Unreal 저장소에서는 cold indexing 자체가 상당한 시간이 걸릴 수 있다.

### 검색 recall과 token cap의 trade-off

기본적으로 결과 수를 제한하기 때문에 모든 textual occurrence를 찾는 감사 작업에는 적합하지 않을 수 있다. 이런 경우 cap을 높이거나 의도적으로 grep을 사용해야 한다.

### semantic backend 의존성

정확도는 각 언어 서버와 프로젝트가 올바르게 빌드/분석 가능한 상태인지에 영향을 받는다. 깨진 compile DB, 잘못된 solution, generated code 문제는 결과 품질을 떨어뜨릴 수 있다.

### Hook overhead

검색을 아끼기 위해 넣은 안내 hook이 지나치게 자주 출력되면 그 자체가 토큰 비용이 된다. v1.1.9의 `hookNoise: quiet`는 이 문제를 완화하지만, 실제 조직 환경에서는 savings telemetry를 보고 설정을 조정해야 한다.

### Claude Code 중심

핵심 delivery가 Claude Code plugin/hook/MCP에 맞춰져 있다. 아이디어 자체는 다른 harness에도 적용 가능하지만 Codex 등에서 동일한 자동 rewrite UX를 바로 얻는 것은 아니다.

### 벤치마크 일반화 주의

프로젝트의 큰 절감 수치는 grep output과 token-capped index output 비교다. 전체 coding task의 비용, 정확도, completion time을 독립적으로 비교한 benchmark로 해석하면 안 된다.

### 프로젝트 성숙도

최근에도 릴리스와 C#/Windows 관련 수정이 빠르게 이어지고 있다. 활발한 개선의 장점이 있지만 Enterprise 표준 도구로 고정하기 전에는 버전 pinning과 회귀 테스트가 필요하다.

## 활용 사례

### 대형 Unreal Engine 코드 탐색

수만 translation unit 규모에서 특정 클래스/함수 정의와 reference를 찾을 때 전체 Engine tree grep을 피하는 용도.

### 장시간 Claude Code 세션

탐색이 반복되는 세션에서 코드 본문을 계속 컨텍스트에 넣지 않고 위치 중심으로 작업하도록 유도할 수 있다.

### C#/.NET 또는 Unity 저장소

Roslyn/csharp-ls 인덱스를 Claude가 직접 활용하게 만들어 솔루션 규모가 큰 프로젝트의 symbol navigation 비용을 줄일 수 있다.

### 코드 리뷰 영향 분석

변경된 symbol과 caller를 연결해 단순 diff review보다 영향 반경 중심으로 검토하는 보조 레이어로 활용할 수 있다.

## 기존 방식과 비교

| 방식 | 장점 | 단점 | 적합한 작업 |
|---|---|---|---|
| grep / ripgrep | 단순, 빠름, exhaustive text search | 결과 폭증, semantic 구분 없음 | 정확한 문자열 전체 감사 |
| Claude 전체 파일 Read | 구현 단순, 코드 문맥 풍부 | context 비용 큼 | 실제 수정 직전의 좁은 범위 확인 |
| IDE/LSP 직접 사용 | semantic 정확도 높음 | 에이전트 workflow와 자동 연결이 약함 | 사람의 IDE navigation |
| embedding code search | 자연어 검색 강함 | index/비용/보안/운영 부담 | 의미 기반 대규모 검색 |
| vs-token-safer | LSP + tree-sitter + hook rewrite, 로컬, token cap | 초기 설정 및 hook/LSP 운영 필요 | Claude Code의 반복적인 코드 탐색 |

## 활용 아이디어

### 바로 적용 가능

**Claude Code 기반 대형 C#/C++ 저장소에서 PoC** 가치가 높다. 특히 현재 작업 흐름에서 Claude가 grep → Read를 반복하는 세션을 골라 전후 token 사용량을 비교하면 효과를 빠르게 판단할 수 있다.

권장 측정 지표:

- 세션 input tokens
- Grep/Bash 호출 수
- 전체 파일 Read 횟수
- symbol search 성공률
- 첫 검색 latency / warm latency
- hook 자체가 소비한 토큰
- 잘못된 검색/누락으로 다시 탐색한 횟수

### PoC 가치 있음

**Perforce + Unreal + Claude Code** 조합에서 특히 테스트 가치가 있다. compile DB와 clangd index를 workspace 밖에 유지하는 설계가 Perforce reconcile과 잘 맞는다.

단, 실제 depot에서 다음을 먼저 검증해야 한다.

- UBT compile database 생성 시간
- clangd cold/warm index 시간
- generated header resolution
- Perforce workspace 오염 여부
- 여러 프로젝트를 동시에 사용하는 경우 index 저장 공간

### 기존 Harness에 결합

메인 에이전트가 모든 소스를 읽기보다 **Locator 계층**으로 vs-token-safer를 두는 패턴이 적합하다.

```text
Main / Analysis Agent
        |
        | "Foo 처리 위치와 caller 찾아줘"
        v
Code Locator (vs-token-safer)
        |
        +--> file:line + references
        v
Main Agent
        |
        +--> 필요한 범위만 Read
        +--> 직접 추론/편집
```

이 방식은 Locator를 저비용 탐색 레이어로 쓰고, 복잡한 판단과 실제 수정은 메인 모델이 담당하는 구조와 잘 맞는다.

### 아이디어 참고

`precision ladder`와 `grep rewrite`는 도구 자체를 도입하지 않더라도 사내 AI harness에 참고할 가치가 높다. 특히 **raw output을 모델에 전달하기 전에 구조화·dedupe·cap하는 것**은 로그, Perforce 검색, 빌드 결과, TeamCity 출력에도 동일하게 적용할 수 있다.

## 결론

vs-token-safer의 핵심 가치는 "더 좋은 검색 명령"보다 **에이전트의 코드 탐색 I/O를 설계하는 방식**에 있다.

대형 저장소에서 모델에게 grep 결과와 파일 전체를 계속 먹이는 대신, LSP/tree-sitter가 계산한 위치와 관계를 먼저 제공하고 필요한 코드만 읽게 한다. 이 원칙은 Claude Code의 토큰 최적화뿐 아니라 자체 Agent Harness 설계에도 적용 가능하다.

현재 기준으로는 **바로 전사 도입보다는 실제 C#/Unreal 저장소에서 PoC할 가치가 높은 도구**로 평가한다. 특히 대형 UE/Perforce 환경에서는 프로젝트가 실제로 해당 문제를 지속적으로 다루고 있다는 점이 강점이다.

## 참고 자료

- Repository: https://github.com/JSungMin/vs-token-safer
- Korean README: https://github.com/JSungMin/vs-token-safer/blob/main/README.ko.md
- Benchmark: https://github.com/JSungMin/vs-token-safer/blob/main/BENCHMARK.md
- Latest release v1.1.9: https://github.com/JSungMin/vs-token-safer/releases/tag/v1.1.9
