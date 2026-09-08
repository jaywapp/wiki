---
title: Context Mode
category: tools
tags:
  - ai
  - agent
  - mcp
  - context-engineering
  - token-optimization
  - claude-code
source: https://github.com/mksglu/context-mode
updated: 2026-09-09
---

# Context Mode

> MCP/에이전트 도구의 대용량 원시 출력을 LLM 컨텍스트에 직접 넣지 않고 샌드박스에서 처리·검색해 필요한 결과만 돌려주는 컨텍스트 절약 및 세션 연속성 계층.

## 프로젝트 개요

Context Mode는 AI 코딩 에이전트가 Read, Bash, WebFetch, Playwright, GitHub MCP 같은 도구를 사용할 때 발생하는 대용량 결과가 컨텍스트 윈도우를 빠르게 소모하는 문제를 해결하려는 MCP 서버다. 단순 출력 truncate가 아니라 원본 데이터를 모델 바깥의 실행/저장 계층에 두고, 모델에는 계산 결과나 검색된 일부만 반환하는 방식을 사용한다.

Claude Code에서는 플러그인과 Hook을 통해 자동 라우팅할 수 있고, Gemini CLI, VS Code Copilot 등 여러 클라이언트용 adapter/configuration도 제공한다.

## 해결하려는 문제

일반적인 Agent 루프는 `Tool -> Raw Output -> LLM Context` 형태다. 파일 여러 개, 로그, GitHub Issue, 브라우저 snapshot 같은 결과가 매번 대화 컨텍스트에 누적된다.

문제는 다음과 같다.

- 도구 출력 자체가 토큰 예산을 크게 소비한다.
- context compaction이 빨리 발생한다.
- compaction 이후 작업 파일, 진행 중 task, 사용자 결정 같은 상태를 잃을 수 있다.
- 단순 truncate는 필요한 정보까지 잘라낼 수 있다.
- 모델이 데이터를 직접 읽고 계산하면 많은 tool call과 token을 사용한다.

Context Mode는 이를 `Tool/Raw Data -> Sandbox/SQLite/FTS -> 필요한 결과만 Context` 구조로 바꾼다.

## 핵심 기능

### 1. Sandbox 기반 Context Saving

`ctx_execute`, `ctx_batch_execute`, `ctx_execute_file` 등을 통해 원시 데이터를 모델에게 모두 보여주지 않고 코드로 처리한다.

프로젝트가 강조하는 핵심 원칙은 **Think in Code**다. 예를 들어 수십 개 파일의 라인 수를 구할 때 모든 파일을 LLM이 Read하는 대신 샌드박스 코드 한 번으로 계산하고 결과만 반환한다.

README는 예시 workload에서 315 KB를 5.4 KB로 줄이는 약 98% 감소 사례를 제시한다. 이는 특정 예시 기준의 프로젝트 자체 측정치이며 모든 workload에서 보장되는 수치는 아니다.

### 2. Session Continuity

파일 수정, git operation, task, error, 사용자 결정 같은 이벤트를 SQLite에 기록한다. compaction 시 전체 상태를 다시 주입하는 대신 FTS5 인덱스와 BM25 검색을 이용해 현재 질문과 관련된 이벤트만 검색한다.

이 접근은 '모든 memory를 prompt에 넣는 방식'과 달리 retrieval 기반 세션 복구에 가깝다.

### 3. Persistent Index / Retrieval

주요 도구:

- `ctx_index`: 파일/디렉터리 인덱싱
- `ctx_search`: 인덱스 검색
- `ctx_fetch_and_index`: 외부 자료 fetch 후 인덱싱

로컬 자료를 persistent FTS5 knowledge base에 넣고 필요한 부분만 검색할 수 있다.

### 4. Hook 기반 자동 라우팅

Claude Code 플러그인은 SessionStart, PreToolUse, PostToolUse, UserPromptSubmit, PreCompact, Stop Hook을 등록한다. 모델이 기존 Read/Bash/WebFetch를 무조건 직접 사용하기보다 context-mode 경로를 사용하도록 런타임 지침을 주입한다.

MCP-only 설치도 가능하지만 이 경우 자동 라우팅 강제력이 약해진다.

### 5. Context/Cost 관측

`ctx_stats`로 context 절감량을 확인할 수 있으며 최근 릴리스에서는 per-turn token, model id, cost, bytes avoided/retrieved를 이용한 FinOps 정확도 개선이 추가됐다.

## 아키텍처

```text
User
  |
  v
Coding Agent (Claude Code / Codex / Gemini / Copilot ...)
  |
  | Hook / routing
  v
Context Mode MCP
  |-- executor / runtime ------> sandbox code execution
  |-- store / db-base --------> SQLite
  |-- search -----------------> FTS5 + BM25 retrieval
  |-- session / lifecycle ----> session event tracking
  |-- adapters ---------------> host별 integration
  |
  +--> 작은 결과 / 관련 chunk만 LLM context로 반환
```

저장소의 `src/`에는 `adapters`, `executor.ts`, `runtime.ts`, `store.ts`, `db-base.ts`, `search/`, `session/`, `lifecycle.ts`, `security.ts`, `server.ts` 등이 분리되어 있다. 즉 단순 prompt wrapper가 아니라 실행, 저장, 검색, 세션 관리, 보안, client adapter를 포함한 중간 계층이다.

## 장점

### Context 절감 효과가 구조적이다

단순히 '짧게 답해라' 같은 prompt optimization이 아니라 raw data가 애초에 context window로 들어가는 경로를 바꾼다. 대규모 로그, repository 탐색, MCP-heavy workflow에서 특히 의미가 있다.

### 긴 Coding Session과 궁합이 좋다

SQLite 이벤트 기록 + FTS5 retrieval 때문에 compaction 이후에도 작업 상태를 복구할 수 있는 구조를 제공한다.

### 기존 MCP 생태계 위에 적용 가능하다

특정 agent framework를 새로 도입하는 것이 아니라 MCP 및 Hook 계층에서 동작하기 때문에 기존 Claude Code workflow에 비교적 작은 변경으로 붙일 수 있다.

### Think in Code 패턴을 강제한다

LLM을 '데이터 처리기'가 아니라 '데이터 처리 코드를 만드는 orchestrator'로 사용한다. 대량 파일 분석, 로그 집계, repository 통계 등에 특히 적합하다.

## 단점 및 한계

### 중간 계층 복잡도 증가

기존 `Agent -> Tool` 구조가 `Agent -> Hook -> Context Mode -> Sandbox/Store -> Tool/Data` 형태가 된다. 장애 지점과 디버깅 대상이 늘어난다.

### 모든 작업에서 이득이 있는 것은 아니다

짧은 파일 하나를 읽거나 작은 command output을 확인하는 작업에서는 sandbox/index/search 비용이 오히려 불필요할 수 있다. 출력 크기와 반복성에 따라 선택적으로 사용하는 것이 합리적이다.

### Retrieval miss 가능성

FTS5/BM25 기반 검색은 전체 데이터를 prompt에 넣는 것보다 저렴하지만 필요한 이벤트나 chunk를 검색하지 못할 가능성이 있다. 정확한 코드 수정에서는 결국 원본 파일을 다시 읽어야 한다.

### 로컬 데이터 저장 및 보안 검토 필요

세션 이벤트와 indexed content를 SQLite에 저장하므로 Enterprise 환경에서는 저장 위치, retention, 민감 코드/로그의 취급 정책을 확인해야 한다.

### 라이선스

저장소는 Elastic License 2.0(ELv2)을 사용한다. 사내 사용 자체와 별개로 재배포, 서비스화, 제품 내 포함을 고려한다면 라이선스 조건을 별도로 검토해야 한다.

### 프로젝트 자체 benchmark와 실제 환경은 구분해야 한다

README의 98% 절감 수치는 대표 예시이지 일반적인 보장값이 아니다. 실제 사내 repository와 MCP workflow에서 before/after 측정이 필요하다.

## 활용 사례

### 대규모 로그 분석

수십 MB 로그를 LLM에게 전달하지 않고 sandbox에서 error grouping, frequency 계산, 특정 pattern 추출 후 요약만 전달한다.

### 대규모 코드베이스 조사

수십~수백 파일을 모두 Read하지 않고 script로 symbol, dependency, line count, pattern을 계산한다. 이후 수정 대상 파일만 원문을 읽는다.

### GitHub / MCP 조사

Issue, PR, API response를 context에 전부 쌓지 않고 index 후 검색한다. MCP 호출이 많은 research agent에 특히 적합하다.

### 장시간 Claude Code 세션

compaction 전후에 작업 상태를 persistent event store에서 retrieval해 세션 연속성을 높인다.

## 기존 방식과 비교

| 방식 | 장점 | 약점 |
|---|---|---|
| Raw Tool Output | 단순하고 정확 | Context 폭증 |
| Truncation | 구현이 쉬움 | 중요한 정보 손실 가능 |
| Prompt 요약 | 범용적 | 요약 자체도 token 사용, 세부 정보 손실 |
| Sub-agent 위임 | 메인 context 보호 | 결과 전달/세션 상태 관리 필요 |
| Context Mode | raw data 격리 + 계산 + retrieval + session tracking | MCP/Hook/DB라는 추가 계층 필요 |

Context Mode는 sub-agent 전략을 대체하기보다 함께 사용할 수 있다. 메인 agent와 sub-agent 모두에서 raw output을 줄이면 context budget을 reasoning에 더 많이 사용할 수 있다.

## 활용 아이디어

### 바로 적용 가능

Claude Code에서 plugin으로 설치해 실제 업무 세션의 `ctx_stats`를 측정한다. 특히 repository-wide 검색, 빌드 로그, Perforce/TeamCity 로그처럼 출력이 큰 작업부터 적용한다.

### PoC 가치 높음

현재 사용하는 AI Harness에서 다음 원칙을 도입할 가치가 높다.

```text
복잡한 추론        -> Main Agent
대량 데이터 처리   -> Sandbox / Code
기계적 조사        -> Sub-agent
정확한 코드 수정   -> 원본 파일 직접 Read 후 Edit
과거 상태 복구     -> Retrieval
```

Context Mode를 그대로 채택하지 않더라도 **'raw context를 모델에게 주지 말고 계산을 데이터 가까이에서 수행한다'**는 설계 원칙은 자체 Harness에 적용 가치가 높다.

### 아이디어 참고

Perforce changelist, TeamCity build log, UE build output 등을 SQLite/FTS 계층에 넣고 main agent에는 검색된 오류와 관련 파일만 전달하는 사내 전용 Context Gateway로 확장할 수 있다.

## Enterprise / Windows 관점

Node.js 기반 MCP 서버이므로 Windows 개발 환경에서도 적용 가능한 형태지만, 실제 회사 환경에서는 다음 PoC 검증이 필요하다.

- 사내 proxy / npm registry에서 설치 가능 여부
- SQLite/FTS5 runtime 호환성
- 저장 DB 위치와 보안 정책
- 대형 UE/Perforce workspace에서 index 비용
- antivirus/EDR가 sandbox execution에 미치는 영향
- TeamCity/Perforce CLI output 처리 성능

## 결론

Context Mode의 핵심 가치는 단순 token compression이 아니라 **Agent가 데이터를 다루는 위치를 LLM context 밖으로 옮기는 것**이다.

특히 대규모 코드베이스와 긴 세션을 사용하는 AI coding workflow에서는 PoC 가치가 높다. 다만 모든 Read/Tool call을 우회시키기보다 '대량/반복/집계성 데이터는 Context Mode, 정확한 수정 근거는 원본 Read'로 역할을 나누는 것이 안전하다.

평가: **PoC 가치 높음**. 자체 Harness 설계 관점에서도 Context Gateway/Sandbox Compute 패턴은 적극적으로 참고할 만하다.

## 참고 자료

- Repository: https://github.com/mksglu/context-mode
- Releases: https://github.com/mksglu/context-mode/releases
- Latest checked release: v1.0.169 (2026-06-29)
- 조사 기준일: 2026-09-09
