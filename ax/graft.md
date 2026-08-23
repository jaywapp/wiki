# Graft

> 태그: `AI Agent`, `Coding Agent`, `Codebase Context`, `Knowledge Graph`, `Claude Code`, `Codex`, `MCP`, `Token Optimization`

## 한줄 요약

Graft는 코드베이스의 구조와 의미를 **로컬 그래프 형태의 Markdown 컨텍스트**로 미리 구축해 Claude Code, Codex, Cursor, Gemini 등의 코딩 에이전트가 매 작업마다 저장소를 처음부터 탐색하는 비용을 줄이는 도구다.

## 프로젝트 개요

- 프로젝트: NanoNets/Graft
- 패키지: `@nanonets/graft`
- 라이선스: MIT
- 런타임: Node.js 20+
- 주요 구현: TypeScript, tree-sitter
- 지원 Agent: Claude Code, Codex/AGENTS 계열, Cursor, Gemini, Copilot, Kiro, Windsurf 등
- 핵심 철학: 임베딩/Vector DB 기반 RAG 대신 사람이 읽을 수 있는 Markdown 파일 그래프를 에이전트의 코드베이스 메모리처럼 사용한다.

Graft가 만드는 `graft/` 폴더는 Git에 커밋하는 지식 문서가 아니라 각 개발자가 로컬에서 재생성하는 캐시다. Agent 연결 설정(`.claude/`, `AGENTS.md`, MCP 설정 등)만 공유한다.

## 해결하려는 문제

일반적인 Coding Agent는 새 작업을 받을 때마다 저장소를 다시 탐색한다.

1. grep/search로 관련 코드를 찾는다.
2. 파일을 연다.
3. import/call 관계를 추적한다.
4. 다른 파일로 이동한다.
5. 작업이 끝나면 이 탐색 결과 대부분이 세션과 함께 사라진다.

즉 사람은 코드베이스에 한 번 온보딩하지만 Agent는 사실상 매 세션마다 다시 온보딩한다. 이 과정은 Tool Call, 입력 Token, 응답 시간과 비용을 지속적으로 소비한다.

Graft는 코드베이스 이해 결과를 재사용 가능한 그래프로 만들어 이 반복 탐색 비용을 줄이려 한다.

## 핵심 기능

### 1. 코드베이스 Context Graph

코드를 분석해 시스템, API, Symbol, Concept 간 관계를 그래프로 만든다. 단순 Symbol index가 아니라 각 영역이 무엇을 담당하고 다른 영역과 어떻게 연결되는지 자연어 설명을 포함한다.

### 2. Markdown 기반 그래프

별도의 Vector DB나 검색 서버 없이 연결된 Markdown 파일 집합을 사용한다. Agent는 일반 파일처럼 열고, grep하고, 링크를 따라 탐색할 수 있다.

### 3. Structural Build

`tree-sitter` 기반 구조 분석은 결정론적으로 동작하며 LLM 호출이 필요 없다. 따라서 기본 `build`, `check`, 탐색 기능은 API 비용 없이 수행 가능하다.

### 4. Deep Build

개념 노드 및 Symbol 요약을 생성하는 Deep Pass에서는 LLM을 사용할 수 있다. OpenAI-compatible endpoint와 Anthropic wire format을 지원하며 OpenRouter, LiteLLM proxy, 로컬 모델 등으로 연결 가능하다.

### 5. 자동 Freshness 관리

질의 전에 Working Tree와 그래프 상태를 갱신한다. 변경이 없을 때는 매우 가벼운 구조 검사만 수행하고, 변경된 코드가 있으면 그래프를 업데이트한다. `GRAFT_REFRESH=hash`를 사용하면 mtime/size 대신 파일 hash로 변경을 확인할 수도 있다.

### 6. Coding Agent 통합

`graft init`이 Agent별 native instruction/configuration을 연결한다.

- Claude Code: `.claude/` hook, skill, statusline 등 깊은 통합
- Codex 계열: `AGENTS.md`, MCP/config/hook 연계
- Cursor: `.cursor/rules/graft.mdc`
- Gemini: `GEMINI.md`
- GitHub Copilot: `.github/copilot-instructions.md`
- Kiro/Windsurf 등도 전용 rule 파일 지원

### 7. MCP / CLI 탐색

Agent가 Graft graph를 직접 질의하거나 관련 코드/호출 관계/구조를 탐색할 수 있는 CLI와 MCP 인터페이스를 제공한다.

## 아키텍처

```text
Source Repository
      │
      ▼
 tree-sitter parser
      │
      ├── Symbol / Structure 분석
      │
      ▼
 Structural Graph
      │
      ├── optional Deep Pass ──► LLM Provider
      │                         (OpenAI/Anthropic/OpenRouter/
      │                          LiteLLM/local model ...)
      ▼
 Local graft/ Graph Cache
 (linked Markdown nodes)
      │
      ├── ask / grep / map / callers / skeleton
      ├── MCP Server
      └── Agent-specific integration
              │
              ├── Claude Code
              ├── Codex
              ├── Cursor
              ├── Gemini
              └── Copilot / Kiro / Windsurf
```

핵심은 **Code → AST/Structure → Semantic Context Graph → Agent Context** 파이프라인이다.

Graft는 소스 자체를 Vector DB에 embedding하는 전형적인 Code RAG와 달리, 코드 구조에서 의미 있는 노드를 추출하고 그 결과를 파일 기반 graph/cache로 제공한다.

## 장점

### 반복 탐색 비용 감소

가장 큰 장점이다. Agent가 매 작업마다 동일한 디렉터리와 호출 관계를 다시 조사하지 않아도 된다.

프로젝트가 공개한 controlled benchmark에서는 Cold Claude Code 대비 Graft 사용 시 평균적으로 Token 약 42%, Tool Call 약 46% 감소를 보고하고 있다. 시간 감소도 크게 측정됐다. 단, 이는 프로젝트 자체 benchmark이므로 모든 저장소에서 동일한 개선을 보장하는 수치는 아니다.

### Vector DB가 필요 없음

Embedding pipeline, Vector DB, indexing service 등을 별도로 운영할 필요가 없다. 파일 기반이라 디버깅과 관찰도 쉽다.

### Agent 독립적

Claude Code에 특히 깊게 통합되지만 Graft 자체는 특정 Agent에 종속되지 않는다. Codex, Cursor, Gemini 등 여러 Agent가 동일한 코드 이해 계층을 사용할 수 있다.

### LLM Provider 독립적

Deep summary를 생성할 때도 특정 모델에 고정되지 않는다. 저렴한 모델이나 로컬 LLM을 graph 생성에 사용하고 비싼 Coding Agent 모델은 실제 작업에 집중시키는 구조가 가능하다.

### Working Tree 반영

Commit된 코드만 보는 정적 문서와 달리 uncommitted change까지 반영하도록 설계되어 실제 Agent 작업 중 Context stale 문제를 줄인다.

### 사람이 읽을 수 있음

그래프가 Markdown 파일이기 때문에 Agent 전용 opaque index가 아니다. 개발자가 직접 내용을 확인하고 문제를 추적할 수 있다.

## 단점

### 초기 Build 비용

대형 저장소에서는 최초 graph 생성 비용이 발생한다. Deep Build를 사용하면 LLM API 비용과 시간이 추가된다.

### 생성된 설명의 정확성

Deep Pass에서 만들어지는 자연어 설명은 LLM이 생성하므로 실제 코드 의미를 완벽하게 보장하지 않는다. 구조 정보와 Semantic Summary를 구분해서 신뢰해야 한다.

### 캐시가 개발자별 로컬 상태

현재 `graft/`는 Git ignored local cache다. 팀 전체가 동일한 완성된 graph artifact를 공유하는 방식이 아니므로 각 개발 환경에서 build가 필요하다.

### 언어 지원 범위

구조 분석 품질은 tree-sitter parser와 Graft의 언어별 처리 구현에 영향을 받는다. 지원되지 않거나 분석이 약한 언어/DSL에서는 효과가 감소할 수 있다.

### Agent 자체 Context 기능과 중복

Claude Code/Codex 등의 자체 code search와 repo instruction, IDE index, 다른 memory/context tool을 이미 적극적으로 사용한다면 일부 기능이 겹친다.

### 자체 Benchmark 해석 주의

README의 비용/Token/시간/정확도 개선치는 인상적이지만 Graft 프로젝트가 정의한 benchmark 환경의 결과다. 사내 대규모 monorepo나 C++/UE 환경에서는 별도 검증이 필요하다.

## 기존 도구와 비교

| 방식 | Context 생성 | 저장 | 검색/탐색 | 장점 | 약점 |
|---|---|---|---|---|---|
| Graft | AST + 구조 + LLM Summary | Markdown graph/cache | 파일/Graph/CLI/MCP | 투명하고 가벼움, Agent 독립적 | 초기 graph 생성, 언어 지원 영향 |
| Vector RAG | Chunk + Embedding | Vector DB | Similarity Search | 대규모 Semantic Search | DB/Embedding 운영 필요, 구조 관계 약함 |
| AGENTS.md / CLAUDE.md | 사람이 작성 | Git 파일 | Agent가 직접 읽음 | 정확한 규칙 전달 | 코드 변화에 자동 대응 어려움 |
| Agent 기본 Code Search | 필요할 때 탐색 | 대부분 세션 Context | grep/search/open | 별도 설정 없음 | 매 세션 반복 탐색 비용 |
| 전통적 Code Index/LSP | AST/Symbol | IDE Index | Symbol/Reference | 코드 탐색 정확도 | Agent에게 시스템 의미를 설명하지 못함 |

Graft의 포지션은 **AGENTS.md 같은 정적 지침과 Code RAG 사이의 Codebase Memory Layer**로 보는 것이 가장 이해하기 쉽다.

## 활용 사례

### 대규모 Legacy Repository

오래된 프로젝트에서 신규 개발자나 Coding Agent가 구조를 파악하는 시간을 줄이는 용도로 적합하다.

### Multi-Agent 개발

Claude Code와 Codex를 병행하는 환경에서 각 Agent가 매번 별도의 코드 탐색을 수행하는 대신 동일한 구조적 Context 계층을 활용할 수 있다.

### 반복적인 유지보수

버그 수정, 리팩터링, 기능 추가처럼 동일 코드 영역을 여러 세션에서 반복해서 다루는 환경일수록 효과가 커질 가능성이 높다.

### Token 최적화

고성능 모델에게 파일 탐색을 반복시키는 대신 저렴한 모델/로컬 모델로 Semantic Graph를 생성하고 실제 Coding Agent에는 필요한 Context만 전달하는 전략이 가능하다.

## 활용 아이디어

### 1. Claude Code + Codex 공통 Context Layer

서로 다른 Coding Agent가 동일 저장소를 작업할 때 Graft를 공통 Codebase Context Layer로 두는 구성이 유용하다.

```text
             Graft Graph
             /         \
     Claude Code      Codex
          │              │
          └──── Repository
```

Agent별 memory/context가 분리되는 문제를 완화할 수 있다.

### 2. 사내 대형 프로젝트 Token 절감 PoC

실제 저장소에서 다음 두 그룹으로 A/B Test하는 것이 좋다.

- Cold Agent
- Agent + Graft

측정 항목:

- Task당 Input Token
- Tool Call 수
- 최초 수정까지 걸린 시간
- 전체 작업 시간
- 수정 파일 정확도
- Build/Test 성공률
- 리뷰 수정 횟수

특히 공개 benchmark 수치를 그대로 신뢰하기보다 실제 사내 저장소에서 효과를 측정하는 것이 중요하다.

### 3. 저가 모델을 Context Builder로 사용

```text
Local/cheap LLM
      │
      ▼
Graft Deep Build
      │
      ▼
Context Graph
      │
      ▼
Expensive Coding Agent
```

코드 이해용 Semantic Summary는 저렴한 모델이 만들고 Claude/Codex 같은 상위 모델은 설계·수정·검증에 Token을 집중시키는 구조다.

### 4. Agent Session 간 Codebase Memory

Graft는 대화 자체의 기억보다는 **Repository에 대한 지속적인 구조 기억** 역할을 한다. Session memory 도구와 결합하면 다음처럼 계층화할 수 있다.

```text
Repository Memory : Graft
Task/Session Memory: Session handoff/memory tool
Project Rules      : AGENTS.md / CLAUDE.md
Agent Reasoning    : Claude Code / Codex
```

각 계층의 책임이 명확해진다는 장점이 있다.

### 5. CI보다 개발자 로컬 Agent 환경에 우선 적용

현재 Graft graph가 재생성 가능한 local cache라는 설계상, 우선 Coding Agent를 많이 사용하는 개발자 환경에 적용하고 효과를 측정하는 편이 적합하다. 효과가 확인된 뒤 CI Agent나 자동 리뷰 Agent로 확장하는 방식이 안전하다.

## 참고 링크

- https://github.com/NanoNets/Graft
- npm package: `@nanonets/graft`

## 검토 시점

2026-08-24 기준 공개 저장소 README, package metadata, CHANGELOG 및 설정 파일을 기준으로 정리.