---
title: codebase-memory-mcp
category: tools
tags:
  - ai
  - mcp
  - code-intelligence
  - knowledge-graph
  - token-optimization
source: https://github.com/DeusData/codebase-memory-mcp
updated: 2026-09-12
---

# codebase-memory-mcp

> AI 코딩 에이전트가 저장소를 매번 grep/read로 재탐색하는 대신, 로컬에 영속화한 코드 지식 그래프를 MCP로 질의하게 만드는 고성능 code-intelligence backend.

## 프로젝트 개요

DeusData의 `codebase-memory-mcp`(CBM)는 소스코드를 Tree-sitter AST로 분석하고 함수·클래스·호출 관계·HTTP route·서비스 간 연결 등을 영속 그래프로 저장한 뒤 MCP 도구로 Claude Code, Codex 등 coding agent에 제공한다. 별도 LLM/API key를 내장하지 않고 구조 분석과 질의에 집중하며, 최종 reasoning은 연결된 agent가 담당한다.

2026-09-12 조사 기준 최신 공개 release는 v0.10.8(2026-08-19)이다. README 기준 158개 언어를 파싱하고, Python, TypeScript/JavaScript/JSX/TSX, PHP, C#, Go, C/C++, Java, Kotlin, Rust, Perl 등 주요 언어에는 Hybrid LSP semantic type resolution을 추가한다. macOS/Linux/Windows용 단일 binary를 제공한다.

프로젝트가 제시하는 토큰/성능 수치는 자체 benchmark이므로 절대값보다는 PoC에서 실제 사내 저장소로 재측정하는 것이 적절하다.

## 해결하려는 문제

일반적인 coding agent는 낯선 저장소에서 `grep → 파일 read → reference 검색 → 추가 read`를 반복한다. 대형 monorepo, C++/UE 프로젝트에서는 이 과정이 컨텍스트와 tool call을 크게 소비하고 세션이 바뀌면 같은 구조를 다시 탐색하게 된다.

CBM은 코드 구조를 한 번 인덱싱해 재사용 가능한 graph memory로 만들고, agent에는 질문에 필요한 구조적 결과만 돌려준다. 특히 call chain, impact analysis, architecture, dead code, cross-service HTTP relation처럼 단순 문자열/벡터 검색보다 관계 정보가 중요한 질문을 겨냥한다.

## 핵심 기능

- 158개 언어 Tree-sitter AST parsing
- 주요 언어 Hybrid LSP 기반 type/call resolution
- 함수·클래스·호출·사용·HTTP route 등의 persistent knowledge graph
- search, trace, architecture, impact analysis, index coverage, Cypher, dead-code detection, ADR 등 15개 MCP tool
- compact tree output을 통한 대형 graph 결과의 token 절감
- background daemon/session coordination 및 변경 동기화
- Dockerfile, Kubernetes manifest, Kustomize 등 IaC indexing
- cross-service HTTP endpoint linking
- 선택적 3D graph visualization UI (`localhost:9749`)
- macOS/Linux/Windows binary와 Claude/Codex 등 client 설정 지원
- SQLite 기반 local persistence

## 아키텍처

```text
Repository / Workspace
        │
        ▼
 File discovery + watcher
        │
        ▼
 Tree-sitter AST parsing ─────┐
        │                     │
        ▼                     │
 Hybrid LSP/type resolution   │
        │                     │
        └─────────┬───────────┘
                  ▼
        Multi-pass indexing
                  │
                  ▼
       Persistent Graph Store
             (SQLite)
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
 Coordination daemon     Optional 3D UI
        │
        ▼
 MCP tools / compact tree output
        │
        ▼
 Claude Code / Codex / other Agent
        │
        ▼
 Planning · Editing · Review
```

핵심은 LLM memory가 아니라 **정적 코드 구조를 로컬 graph memory로 지속 유지하는 것**이다. Tree-sitter가 빠른 syntax structure를 만들고 Hybrid LSP 계층이 import, inheritance, receiver type 등의 정보를 이용해 call/usage edge 정확도를 보강한다. v0.9.1-rc.1 이후에는 여러 MCP session/CLI/hook가 독립적으로 store를 여는 대신 coordination daemon을 공유하는 구조로 변경되었다.

## 장점

1. **토큰 절감 가능성이 큼** — agent가 관련 파일 전체를 계속 읽지 않고 필요한 관계만 질의할 수 있다.
2. **세션 간 코드 구조 재사용** — persistent graph이므로 Claude와 Codex가 같은 구조 정보를 재사용하는 공통 memory layer로 쓰기 좋다.
3. **대형 저장소 지향** — 프로젝트는 Linux kernel 28M LOC/75K files를 약 3분에 indexing한다고 제시한다.
4. **로컬 처리** — indexing/query에 외부 LLM API가 필요 없어 사내 source 적용 시 데이터 외부 전송 면에서 유리하다.
5. **C#/C++ 지원이 중요** — WPF/.NET과 Unreal/C++ 같이 대형 정적 코드베이스를 함께 다루는 환경에서 PoC 가치가 높다.
6. **VCS 독립적** — 분석 대상은 local working tree이므로 Git뿐 아니라 Perforce workspace에도 구조적으로 적용 가능하다.
7. **MCP 기반 재사용** — 특정 agent vendor에 종속된 memory가 아니라 여러 MCP client 앞에 공통 backend를 둘 수 있다.

## 단점 및 한계

1. **정적 분석의 본질적 한계** — reflection, dynamic dispatch, macro-heavy C++, generated code, Unreal reflection/UHT 계층 등은 실제 runtime 관계와 차이가 날 수 있다.
2. **158개 언어의 품질이 동일하지 않음** — Hybrid LSP semantic resolution은 일부 주요 언어에 집중된다.
3. **자체 benchmark 의존** — README의 큰 token reduction 수치는 실제 조직 코드에서 재검증해야 한다.
4. **background daemon 운영 비용** — 여러 agent와 동시에 쓸 때 daemon/cache lifecycle 및 CPU/memory 상태를 운영해야 한다.
5. **Windows 성숙도 주의** — 최근 release에서 Windows 설치·daemon·memory 관련 수정이 반복되었고, 2026-09 초에도 idle MCP frontend CPU 사용 및 hook daemon restart latency 같은 Windows 이슈가 열려 있다.
6. **업데이트 안정성 확인 필요** — 2026-09-04에는 `update` 과정에서 index 삭제 후 업데이트가 수행되지 않는 high-priority issue가 보고됐다. 운영 환경에서는 버전 고정과 cache backup/재index 전략이 필요하다.
7. **graph 정확도 검증 필요** — overload나 language-specific construct가 잘못 합쳐져 fake caller가 생기는 유형의 parsing issue가 실제로 보고되고 있다.
8. **소스 접근 권한** — 전체 workspace를 읽고 local cache/daemon을 운용하므로 Enterprise 환경에서는 binary provenance, 실행 허용 정책, cache 위치를 검토해야 한다.

## 활용 사례

- 대형/legacy codebase onboarding
- 변경 전 impact analysis 및 call-chain 추적
- refactoring 대상과 dead-code 후보 탐색
- monorepo/microservice HTTP dependency 분석
- AI code review 전 변경 symbol 영향 범위 수집
- 여러 coding agent에 공통 repository context 제공
- ADR과 실제 코드 구조를 함께 agent context로 제공

## 기존 도구와 비교

| 방식 | 강점 | CBM과 차이 |
|---|---|---|
| grep/ripgrep | 빠르고 단순함 | 문자열 검색이며 관계 graph/type 의미가 없음 |
| LSP | definition/reference/type 정확도 | IDE session 중심; agent용 persistent integrated graph가 주목적은 아님 |
| Vector code RAG | 자연어/유사 코드 검색 | semantic similarity 중심, CBM은 structural relation 중심 |
| Sourcegraph 계열 | 강력한 enterprise code intelligence | 중앙 플랫폼 성격이 강하고 CBM은 local MCP backend에 집중 |
| Agent 기본 file tools | 별도 설치가 거의 없음 | 반복 read/grep 때문에 token/tool-call 증가 가능 |

CBM은 vector RAG를 대체한다기보다 **구조적 질문을 먼저 graph로 좁히고 필요한 코드만 agent가 읽게 하는 전처리 계층**으로 보는 편이 적절하다.

## 활용 아이디어

### 바로 적용 가능 — Claude/Codex 공통 Code Memory Layer

Claude Code와 Codex가 각각 전체 workspace를 재탐색하지 않도록 동일 CBM graph를 공유한다. 작업 시작 시 `architecture/search/trace → 필요한 파일만 read → 수정` 순서를 기본 harness 규칙으로 두면 효과를 측정하기 쉽다.

### PoC 가치 높음 — Perforce + UE/C++ Harness

Perforce 자체와 직접 통합되는 제품은 아니지만 local P4 workspace를 repository root로 indexing할 수 있으므로 현재 Perforce 기반 개발 환경과 궁합이 좋다.

```text
p4 sync
   │
   ▼
Perforce Workspace
   │
   ├── CBM watcher/index ──► Shared Code Graph
   │                           │
   │              ┌────────────┴────────────┐
   │              ▼                         ▼
   │         Claude Code                 Codex
   │              │                         │
   └──────────────┴──── edit/test/review ──┘
                  │
                  ▼
              p4 diff / CL
```

UE 프로젝트에서는 특히 macro/UHT/generated-code 때문에 graph accuracy를 별도로 측정해야 한다. PoC 지표는 `초기 indexing 시간`, `p4 sync 후 incremental 반영 시간`, `trace 정확도`, `agent input/output token`, `file read 횟수`, `tool call 수`, `잘못된 caller/impact 비율` 정도가 적합하다.

### PoC 가치 높음 — AI Code Review 보조

CL/PR diff에서 변경 symbol을 뽑고 CBM으로 inbound/outbound caller와 usage를 조회한 뒤 reviewer agent에 함께 제공한다. diff-only review가 놓치기 쉬운 영향 영역을 구조적으로 추가할 수 있다.

### 아이디어 참고 — CI 품질 게이트

CI에서 impact graph, dead-code 후보, architecture violation을 추출해 AI review와 결합할 수 있다. 다만 ephemeral build agent에서 persistent daemon/cache를 유지할지, 매번 재index할지 운영 설계가 필요하다.

## 도입 판단

**평가: PoC 가치 높음.** 특히 대형 C#/C++ 코드와 Claude/Codex를 함께 사용하는 환경에서는 단순 MCP 하나 추가 이상의 의미가 있다. 현재 harness의 `context discovery` 단계를 CBM에 맡기면 모델이 직접 grep/read하는 양을 줄일 가능성이 크다.

다만 즉시 전사 표준으로 넣기보다는 Windows + Perforce + UE 코드베이스 한 프로젝트에서 먼저 검증하는 것이 좋다. 최근 Windows/daemon/update 관련 issue가 활발하므로 버전을 고정하고, 실패 시 기존 grep/LSP 탐색으로 fallback하는 구조가 안전하다.

## 결론

`codebase-memory-mcp`의 핵심 가치는 "AI에게 더 큰 context를 주는 것"이 아니라 **AI가 context를 얻는 비용 자체를 줄이는 것**이다. 코드 구조를 LLM context 밖의 persistent graph에 보관하고 필요한 순간에만 compact하게 꺼낸다는 점에서 token optimization과 multi-agent harness 모두에 잘 맞는다.

현재 환경 기준으로는 **Claude/Codex 공통 code-memory + Perforce workspace indexing** 조합이 가장 먼저 시험해볼 가치가 있다.

## 참고 자료

- GitHub: https://github.com/DeusData/codebase-memory-mcp
- Releases: https://github.com/DeusData/codebase-memory-mcp/releases
- Issues: https://github.com/DeusData/codebase-memory-mcp/issues
- Documentation: https://deusdata.github.io/codebase-memory-mcp/
- Research preprint: arXiv:2603.27277
