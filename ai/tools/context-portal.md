---
title: Context Portal (ConPort)
category: tools
tags:
  - ai
  - agent
  - mcp
  - memory
  - rag
  - context-engineering
source: https://github.com/GreatScottyMac/context-portal
updated: 2026-09-23
---

# Context Portal (ConPort)

> AI 코딩 에이전트가 프로젝트의 결정·진행상태·아키텍처·사용자 정의 지식을 세션을 넘어 구조적으로 기억하고 검색할 수 있게 하는, workspace별 SQLite + knowledge graph + semantic search 기반 MCP 메모리 서버.

## 프로젝트 개요

Context Portal(ConPort)은 프로젝트별 장기 메모리를 MCP(Model Context Protocol) 도구로 제공하는 오픈소스 프로젝트다. 단순 Markdown 메모리 파일 대신 workspace마다 데이터베이스를 만들고, 제품 컨텍스트, 현재 작업 컨텍스트, 의사결정, 진행상태, 시스템 패턴, 사용자 정의 데이터를 구조적으로 저장한다.

저장된 항목 사이에 명시적 관계를 만들어 project knowledge graph를 구성할 수 있으며, FTS와 vector embedding 기반 semantic search를 통해 필요한 컨텍스트만 다시 검색해 Agent에게 공급하는 RAG backend 역할을 한다.

조사 기준 최신 릴리스는 v0.3.13이며, repository의 마지막 확인 가능한 commit은 2026-01-19의 dependency update다.

## 해결하려는 문제

일반적인 AI 코딩 세션은 대화가 끝나거나 context window가 교체되면 이전의 설계 결정, 현재 작업 상태, 구현 이유를 잃기 쉽다.

CLAUDE.md/AGENTS.md나 memory-bank 형태의 Markdown은 간단하지만 프로젝트가 커지면 전체 문서를 반복 로딩하거나, 필요한 정보를 정확히 찾기 어렵고, 결정-구현-작업 간 관계를 기계적으로 탐색하기 어렵다.

ConPort는 이를 다음 구조로 바꾼다.

- 장기 프로젝트 지식 → Product Context
- 현재 세션/작업 상태 → Active Context
- 설계/구현 판단 → Decisions
- TODO/진행 상황 → Progress
- 반복되는 설계 규칙 → System Patterns
- 용어집·스펙 등 → Custom Data
- 항목 간 관계 → Context Links
- 검색 → FTS + Semantic Search

즉, "모든 컨텍스트를 prompt에 넣는다"가 아니라 "외부 memory store에 저장하고 필요할 때 검색한다"는 접근이다.

## 핵심 기능

1. **Workspace별 persistent memory**
   - workspace마다 SQLite DB를 유지해 프로젝트 컨텍스트를 격리한다.
   - 최신 버전에서는 workspace 자동 감지 기능도 제공한다.

2. **Structured Memory**
   - Product/Active Context, Decision, Progress, System Pattern, Custom Data 등을 별도 entity로 관리한다.

3. **Project Knowledge Graph**
   - 서로 다른 context item을 relationship type으로 연결한다.
   - 예: Decision → implemented_by → System Pattern.

4. **RAG / Semantic Search**
   - SQLite FTS뿐 아니라 SentenceTransformers/ChromaDB 기반 vector search를 제공한다.
   - 키워드가 정확히 일치하지 않아도 의미적으로 관련된 과거 컨텍스트를 찾는 것을 목표로 한다.

5. **History**
   - Product Context와 Active Context의 변경 이력을 보존한다.

6. **MCP Tool Interface**
   - Agent가 memory 조회/기록/검색/링크/삭제/가져오기·내보내기 등을 MCP 호출로 수행한다.
   - v0.3.13에서는 MCP tool annotation(readOnlyHint, destructiveHint, title)을 추가했다.

7. **STDIO / HTTP**
   - 로컬 IDE 연결은 STDIO가 주 사용 방식이며 HTTP 실행도 지원한다.

## 아키텍처

```text
Claude Code / Roo / MCP Client / Agent
                  |
                  | MCP
                  v
        +--------------------+
        | Context Portal MCP |
        |      main.py       |
        +----------+---------+
                   |
            MCP Handlers
                   |
       +-----------+-----------+
       |                       |
       v                       v
+--------------+       +----------------+
| SQLite       |       | Embedding /    |
| structured   |       | Vector Store   |
| project data |       | (ChromaDB)     |
+------+-------+       +--------+-------+
       |                        |
       +------------+-----------+
                    |
                    v
        Project Context Retrieval
      FTS / Semantic / Graph Links
                    |
                    v
             Relevant Context
                    |
                    v
               LLM / Agent
```

주요 source 구조는 다음과 같다.

- `src/context_portal_mcp/main.py`: MCP server와 tool registration
- `handlers/`: MCP tool 실행 로직
- `db/`: SQLite CRUD, schema/model
- `core/`: configuration, embedding 등 핵심 서비스
- `conport-custom-instructions/`: Agent가 ConPort를 사용하는 전략
- `tests/`: 테스트

데이터는 기본적으로 workspace의 `context_portal/context.db`와 vector store에 저장된다.

## 컨텍스트 흐름

```text
작업 발생
   |
   +--> 중요한 결정 ------> Decision 저장
   +--> 현재 상태 --------> Active Context 갱신
   +--> 작업 진행 --------> Progress 저장
   +--> 반복 규칙 --------> System Pattern 저장
                              |
                              v
                      관계(Link) 구성
                              |
다음 세션 -------------------+
   |
   v
query / task
   |
FTS / semantic search / graph traversal
   |
관련 항목만 retrieval
   |
LLM context에 주입
```

이 구조의 핵심은 전체 프로젝트 지식을 매번 LLM context에 싣지 않는다는 점이다.

## 장점

### 세션 간 기억

설계 결정과 작업 상태를 대화 history에만 의존하지 않고 project-local persistent memory로 유지할 수 있다.

### 컨텍스트 선택적 로딩

전체 memory 파일을 반복해서 읽는 방식보다 필요한 항목을 query해서 가져오는 구조이므로 프로젝트가 커질수록 context engineering 관점의 장점이 생길 수 있다.

### 구조화된 결정 기록

"무엇을 만들었는가"뿐 아니라 rationale, implementation detail, 관계를 별도 필드로 남길 수 있다. 코드 리뷰나 과거 결정 추적에 특히 유용하다.

### Vendor-neutral backend

MCP client가 ConPort를 사용할 수 있다면 특정 LLM의 자체 memory 기능에 프로젝트 지식을 종속시키지 않는 방향으로 운영할 수 있다.

### Local-first

기본 저장소가 workspace-local SQLite이므로 중앙 SaaS형 memory보다 데이터 통제와 프로젝트 격리가 단순하다.

## 단점 및 한계

### Memory write discipline이 필요

가장 큰 문제는 DB가 있다고 기억이 자동으로 좋아지는 것이 아니라는 점이다. Agent instruction에서 무엇을 언제 저장하고 갱신할지를 잘 정의하지 않으면 오래된 결정과 불필요한 로그가 쌓인다.

### MCP 호출 비용

파일 하나를 읽는 것과 달리 memory 저장/검색/링크가 tool call이 된다. 작은 프로젝트에서는 오히려 Agent workflow와 token/tool latency가 늘 수 있다.

### 운영 구성요소 증가

SQLite 외에 embedding model과 ChromaDB가 포함되므로 단순 Markdown memory보다 dependency와 장애 지점이 늘어난다.

### Knowledge graph 품질

관계가 자동으로 항상 정확하게 생성되는 것은 아니다. 잘못된 link나 stale context가 누적되면 retrieval 품질도 떨어진다.

### 협업/동기화

workspace-local DB는 개인 Agent memory에는 적합하지만 Git으로 diff/review하기 쉬운 Markdown과 달리 팀 단위 변경 검토 및 merge에는 불편하다. 팀 공용 knowledge source로 사용하려면 별도 운영 전략이 필요하다.

### 현재 프로젝트 성숙도 주의

최신 릴리스는 v0.3.13이고 마지막 확인 commit은 2026-01-19이다. 또한 open issue에는 Python/ChromaDB dependency import 문제와 OpenAI 계열의 엄격한 MCP JSON Schema validation 호환성 문제가 보고되어 있다. 최신 Agent 환경에 넣기 전 실제 client 조합으로 PoC가 필요하다.

### Windows / Enterprise

Python + uv 기반이라 Windows에서도 원칙적으로 사용할 수 있지만, workspace path 자동 감지, 로컬 DB 위치, MCP process 실행 권한, embedding dependency 배포를 사내 보안 정책과 함께 검증해야 한다. 중앙 정책/권한/감사 기능이 핵심인 Enterprise memory service와는 성격이 다르다.

## 기존 방식과 비교

| 방식 | 장점 | 단점 | 적합한 상황 |
|---|---|---|---|
| CLAUDE.md / AGENTS.md | 단순, Git 관리 쉬움 | 커질수록 전체 context 로딩 | 안정적인 규칙/지침 |
| Markdown Memory Bank | 사람이 읽고 diff 가능 | 검색·관계 탐색 한계 | 소규모 프로젝트 |
| ConPort | 구조화, semantic search, graph, persistent state | MCP/tool/dependency 운영비 | 장기 Agent 프로젝트 |
| 일반 Vector DB RAG | 대량 문서 검색에 강함 | 프로젝트 작업 상태/결정 모델은 직접 설계 | 문서 검색 중심 |
| Agent 자체 Memory | 설치가 단순할 수 있음 | provider/client 종속 | 단일 Agent 사용 |

ConPort의 차별점은 단순 vector memory가 아니라 **개발 프로젝트의 의사결정과 진행 상태를 명시적인 entity로 모델링했다는 점**이다.

## 활용 사례

- 장기간 진행되는 AI coding 프로젝트의 session handoff
- 여러 Agent가 동일 프로젝트의 결정사항을 공유
- architecture decision/rationale 검색
- 이전 작업에서 왜 특정 구현을 선택했는지 복원
- TODO와 구현 상태를 Agent context로 연결
- 대형 repository에서 관련 memory만 retrieval하여 context 절약
- Agent workflow에서 session 시작 시 Active Context를 bootstrap하고 종료 시 갱신

## 활용 아이디어

### 바로 적용 가능 — 장기 프로젝트 Memory PoC

Claude Code/Codex 등에서 프로젝트별 memory backend 후보로 테스트할 가치가 있다. 특히 세션이 자주 끊기고 과거 의사결정 복원이 중요한 repository가 적합하다.

### PoC 가치 있음 — Context/Token 절감 실험

ConPort를 단순 memory 기능보다 **context virtualization 계층**으로 보는 것이 더 흥미롭다.

비교 실험:

```text
A. CLAUDE.md + 전체 관련 문서 직접 로딩
B. Markdown memory bank
C. ConPort retrieval
```

측정할 항목:

- task당 input token
- memory retrieval tool call 수
- 작업 완료 시간
- 과거 결정 recall 정확도
- stale/wrong context retrieval 비율
- 세션 재시작 후 작업 연속성

ConPort의 실제 가치는 "기억을 저장한다"보다 **필요한 기억만 얼마나 정확하고 싸게 복원하는가**로 평가하는 것이 좋다.

### PoC 가치 있음 — code-virtualize 계열과 결합

코드 자체의 symbol/index 정보와 project decision memory를 분리하면 다음 계층이 가능하다.

```text
Code structure / symbol index
          +
ConPort project memory
          |
          v
Context Resolver
          |
          +--> 필요한 코드
          +--> 관련 설계 결정
          +--> 현재 task state
          |
          v
        Agent
```

즉 코드 위치를 찾는 계층과 "왜 이렇게 만들었는가"를 기억하는 계층을 분리할 수 있다.

### 아이디어 참고 — Agent handoff protocol

Orchestrator/Worker 구조에서 모든 대화를 전달하는 대신 Worker가 완료 시 Decision/Progress/Active Context만 기록하고 다음 Agent가 이를 retrieval하는 handoff backend로 활용할 수 있다.

### 현재는 도입 가치 낮음

짧은 PoC, 하루 안에 끝나는 repository, 컨텍스트가 CLAUDE.md 하나에 충분히 들어가는 프로젝트에는 운영비가 이득보다 클 가능성이 높다.

## 실무 평가

ConPort는 단순 "AI memory MCP"보다 **프로젝트 컨텍스트를 LLM context window 밖에 구조적으로 virtualize하는 도구**로 보는 편이 적절하다.

특히 Context Engineering 관점에서 다음 패턴이 가치 있다.

```text
Store everything important externally
              ↓
Index / Link / Embed
              ↓
Retrieve only what current task needs
              ↓
Keep LLM context small
```

다만 token 절감 효과는 repository가 주장하는 구조적 가능성과 실제 비용을 구분해야 한다. semantic search 자체에도 embedding 및 MCP 호출 비용이 있고, retrieval 결과가 부정확하면 추가 탐색이 발생한다. 따라서 실제 harness에 넣기 전 token/latency/recall benchmark가 필요하다.

## 결론

ConPort는 **PoC 가치가 높은 프로젝트 memory/context backend**다.

특히 장기 AI coding session, multi-agent handoff, context/token 최적화 연구와 연결점이 크다. 반면 단순 프로젝트에서는 Markdown memory보다 복잡하며, 최신 MCP client 및 OpenAI schema 호환성 관련 open issue가 있으므로 바로 표준 인프라로 채택하기보다는 작은 repository에서 비교 실험하는 것이 적절하다.

## 참고 자료

- https://github.com/GreatScottyMac/context-portal
- https://github.com/GreatScottyMac/context-portal/blob/main/conport_mcp_deep_dive.md
- https://github.com/GreatScottyMac/context-portal/releases/tag/v0.3.13
- https://github.com/GreatScottyMac/context-portal/issues
