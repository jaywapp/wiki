# codebase-memory-mcp

> Tags: `MCP` `Code Intelligence` `Knowledge Graph` `Tree-sitter` `Hybrid LSP` `AI Agent` `Token Optimization`

## 한줄 요약

AI 코딩 에이전트가 대형 코드베이스를 파일 단위로 반복 탐색하지 않고, 로컬에 구축한 영속 코드 지식 그래프를 MCP로 질의하도록 만들어 탐색 속도와 토큰 효율을 크게 높이는 코드 인텔리전스 엔진.

## 프로젝트 개요

DeusData의 `codebase-memory-mcp`는 소스코드를 Tree-sitter AST로 분석하고 함수·클래스·호출 관계·HTTP 라우트·서비스 간 연결 등을 SQLite 기반 영속 그래프로 저장한 뒤 MCP 도구로 제공한다. 158개 언어를 파싱하며 Python, TypeScript/JavaScript, PHP, C#, Go, C/C++, Java, Kotlin, Rust, Perl 등에는 별도의 Hybrid LSP 계층으로 타입/호출 해석을 보강한다. 별도 LLM이나 API Key가 필요하지 않고 로컬에서 동작한다.

프로젝트가 공개한 벤치마크는 31개 실제 저장소 평가에서 파일 단위 탐색 대비 83% answer quality, 10배 적은 토큰, 2.1배 적은 tool call을 보고한다. README의 별도 구조 질의 예에서는 약 120배의 토큰 감소를 주장한다. 수치는 프로젝트 자체 평가이므로 실제 코드베이스에서 별도 검증하는 것이 좋다.

## 해결하려는 문제

AI 코딩 에이전트는 낯선 저장소에서 `grep → 파일 읽기 → 참조 검색 → 추가 파일 읽기`를 반복한다. 대형 monorepo나 UE/C++ 프로젝트에서는 이 과정이 느리고 컨텍스트를 크게 소비하며, 세션이 바뀌면 동일한 구조 탐색을 다시 수행하기 쉽다.

이 프로젝트는 코드 구조를 한 번 인덱싱해 그래프로 기억하고 이후 에이전트가 필요한 관계만 질의하게 함으로써 반복 탐색 비용을 줄인다. 특히 호출 경로, 영향 범위, 아키텍처, dead code, cross-service HTTP 관계처럼 그래프 질의에 적합한 질문을 겨냥한다.

## 핵심 기능

- 158개 언어 Tree-sitter AST 파싱
- Hybrid LSP 기반 타입 인식 호출 관계 보강
- 함수·클래스·호출·사용 관계·HTTP Route 등을 영속 Knowledge Graph로 저장
- 검색, trace, architecture, impact analysis, index coverage, Cypher, dead-code detection, ADR 등 15개 MCP 도구
- 코드 변경을 추적하는 background watcher/자동 동기화
- Dockerfile, Kubernetes, Kustomize 등 IaC 관계 인덱싱
- 서비스 간 HTTP endpoint 연결
- 내장 Cypher 질의 엔진
- 선택적 3D Graph UI (`localhost:9749`)
- macOS/Linux/Windows 네이티브 실행 파일 제공
- Claude Code, Codex 등 다수의 agent/client surface 자동·조건부 설정

## 아키텍처

핵심 흐름은 다음과 같다.

`Repository → File Discovery → Tree-sitter AST → Hybrid LSP/type resolution → Multi-pass indexing → SQLite Knowledge Graph → MCP tools → Coding Agent`

주요 모듈은 MCP JSON-RPC 서버, daemon/session coordination, SQLite graph store, multi-pass indexing pipeline, Cypher parser/planner/executor, 파일 discovery, background watcher, runtime trace ingestion, 3D UI, platform abstraction으로 나뉜다.

Tree-sitter 계층은 모든 지원 언어에서 빠른 구문 구조를 얻고, Hybrid LSP 계층은 import·상속·generic·receiver type 등을 이용해 `CALLS`, `USAGE`, `RESOLVED_CALLS` 같은 edge 정확도를 개선한다. 따라서 전통적인 단순 텍스트 검색보다 호출 그래프와 영향도 분석에 유리하다.

## 장점

1. **토큰 절감** — 파일 전체를 LLM에 계속 읽히지 않고 필요한 구조만 반환한다.
2. **대형 저장소 친화적** — 프로젝트 주장 기준 Linux kernel 28M LOC/75K files도 약 3분에 인덱싱한다.
3. **세션 간 구조 기억** — 영속 그래프이므로 새 agent session에서도 코드 구조를 재탐색할 필요가 줄어든다.
4. **로컬 처리** — 코드 인덱싱과 그래프 질의가 로컬에서 이루어져 사내 코드 적용에 유리하다.
5. **언어 범위가 넓음** — Tree-sitter 기반 158개 언어와 주요 언어의 의미 해석을 결합한다.
6. **MCP 기반** — 특정 LLM에 종속되지 않고 여러 coding agent에 공통 code-intelligence layer로 붙일 수 있다.
7. **관계형 질문에 강함** — call chain, impact, architecture, dead code 등 단순 RAG보다 코드 관계가 중요한 질문에 적합하다.

## 단점

1. **정적 분석의 한계** — reflection, macro-heavy code, runtime dispatch, generated code 등은 완전한 관계 해석이 어려울 수 있다.
2. **언어별 의미 분석 편차** — 158개 언어 모두가 Hybrid LSP 수준의 의미 해석을 받는 것은 아니다.
3. **자체 벤치마크 의존** — 10×/120× 토큰 절감 등 수치는 실제 조직 코드에서 재검증해야 한다.
4. **강한 파일시스템 권한** — 소스 전체를 읽고 agent 설정 파일을 수정하며 background process를 실행한다. 회사 환경에서는 바이너리/소스 감사와 보안 검토가 필요하다.
5. **그래프 최신성 관리 필요** — watcher가 있지만 branch switch, generated artifacts, 대규모 refactor 등에서 index consistency를 확인해야 한다.
6. **코드 의미 자체를 완전히 이해하는 LLM은 아님** — 구조 인덱스/질의 엔진이며 최종 reasoning은 연결된 agent가 담당한다.

## 기존 도구와 비교

| 방식/도구 | 강점 | codebase-memory-mcp와 차이 |
|---|---|---|
| grep/ripgrep | 매우 빠른 문자열 검색 | 관계 그래프와 타입 의미가 없음 |
| LSP | 정확한 definition/reference | 주로 IDE/현재 프로젝트 중심이며 agent용 영속 통합 그래프가 핵심 목적은 아님 |
| 일반 코드 RAG/Vector DB | 자연어·유사 코드 검색 | semantic similarity 중심. CBM은 구조/호출/의존 관계가 중심 |
| Sourcegraph류 | 강력한 enterprise code search/intelligence | 서버/플랫폼 성격이 강함. CBM은 로컬 MCP agent backend에 집중 |
| 에이전트의 기본 파일 탐색 | 설정이 거의 필요 없음 | 반복 read/grep으로 토큰과 tool call이 커질 수 있음 |

가장 중요한 차이는 **검색 도구 하나를 추가하는 것이 아니라, coding agent 앞에 지속적으로 유지되는 코드 구조 메모리 계층을 둔다**는 점이다.

## 활용 사례

- 대형/레거시 코드베이스 온보딩
- 변경 전 impact analysis
- 특정 API에서 실제 구현까지 call-chain 추적
- 리팩터링 대상과 dead code 후보 탐색
- monorepo/microservice 간 HTTP dependency 분석
- AI code review 전 변경 영향 범위 수집
- 여러 AI agent가 동일 저장소를 사용할 때 공통 구조 context 제공
- ADR과 실제 코드 구조를 함께 agent context로 제공

## 활용 아이디어

### 1. Coding Agent 공통 Code Memory Layer
Claude Code와 Codex 각각이 독립적으로 저장소를 읽게 하지 않고 `codebase-memory-mcp`를 공통 MCP로 연결한다. agent를 바꿔도 동일한 코드 구조 지식을 재사용할 수 있다.

### 2. 작업 시작 전 자동 영향도 분석
에이전트 workflow를 `요청 분석 → CBM architecture/impact/trace → 변경 계획 → 코드 수정 → 테스트/리뷰`로 표준화하면 구현 전에 관련 파일과 호출 경로를 좁힐 수 있다.

### 3. AI Code Review 보조
PR diff의 변경 symbol을 기준으로 callers/callees/usage를 조회하여 리뷰 agent에게 '변경 파일'뿐 아니라 '영향 가능 영역'을 제공한다. 단순 diff review의 blind spot을 줄이는 용도다.

### 4. 대형 C#/C++ 프로젝트 PoC
C#과 C/C++ 모두 Hybrid LSP 지원 대상이므로 대형 WPF/.NET 및 Unreal/C++ 저장소에서 특히 검증 가치가 있다. 실제 PoC에서는 인덱싱 시간, graph accuracy, 변경 후 재색인 시간, agent token/tool-call 감소율을 측정하는 것이 좋다.

### 5. CI 품질 게이트
CI에서 변경된 symbol의 impact graph, dead-code 후보, architecture violation 등을 추출하고 AI review 결과와 합쳐 리포트하는 형태로 확장할 수 있다. 단, CI에서 background daemon 및 cache lifecycle을 어떻게 관리할지 별도 설계가 필요하다.

## 참고 링크

- GitHub: https://github.com/DeusData/codebase-memory-mcp
- Documentation: https://deusdata.github.io/codebase-memory-mcp/
- Research preprint: arXiv:2603.27277
