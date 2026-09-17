---
title: WeKnora
category: tools
tags:
  - ai
  - rag
  - agent
  - knowledge-base
  - wiki
  - mcp
source: https://github.com/Tencent/WeKnora
updated: 2026-09-18
---

# WeKnora

> 문서 RAG를 출발점으로 ReAct Agent, MCP/Skill 실행, 자동 Wiki와 장기 메모리까지 한 플랫폼에 묶은 Tencent의 셀프호스팅 지식 플랫폼.

## 프로젝트 개요

WeKnora는 Tencent가 공개한 LLM 기반 지식 관리 플랫폼이다. PDF·Word·웹·이미지·Excel·XMind와 외부 지식 소스를 수집해 검색 가능한 지식베이스로 만들고, 이를 Quick Q&A(RAG), ReAct Agent, 자동 Wiki에서 공통으로 활용한다.

2026-09-18 조사 기준 GitHub 저장소는 약 26.1k stars / 3.5k forks이며 최신 릴리스는 v0.8.0(2026-09-03)이다. 단순 RAG UI보다 범위가 넓고, 최근에는 Agent Skill Sandbox와 Wiki/운영 기능이 빠르게 확장되고 있다.

## 해결하려는 문제

전통적인 사내 RAG는 문서 수집 → 파싱 → 임베딩 → 검색 → 답변까지는 제공하지만, 복잡한 질문을 여러 단계로 해결하거나 지식을 사람이 읽기 좋은 Wiki로 재구성하고 지속 관리하는 부분은 별도 시스템이 필요하다.

WeKnora는 다음을 하나의 플랫폼으로 통합한다.

- 여러 문서/외부 소스의 수집과 동기화
- Hybrid Retrieval 및 Rerank
- RAG 기반 빠른 질의응답
- ReAct 기반 다단계 Agent 실행
- MCP 및 Skill 호출
- 세션 지속형 Sandbox
- 문서에서 Markdown Wiki 자동 생성
- 장기 메모리
- RBAC, Audit Log, Langfuse 기반 관측성

## 핵심 기능

### 1. RAG / 검색

- Vector + BM25 Hybrid Search
- RRF fusion
- Rerank
- 선택적 GraphRAG
- 답변 원문 citation
- chunk 편집 및 revision history

### 2. ReAct Agent

Agent가 질문을 한 번의 RAG 호출로 끝내지 않고 필요에 따라 지식 검색, MCP Tool, Skill, Sandbox, Web Search를 조합한다.

### 3. Wiki Mode

원본 문서를 Agent가 분석해 상호 연결된 Markdown Wiki로 재구성한다.

- 자동 페이지 생성
- 페이지 간 링크
- Knowledge Graph
- 브라우저 편집
- Revision History
- Diff
- Rollback

즉 "검색용 chunk 저장소"를 사람이 탐색할 수 있는 Knowledge Base로 승격시키는 기능이 핵심 차별점이다.

### 4. Skill Sandbox Runtime

v0.8.0의 핵심 변화다. Skill을 Docker / E2B / Cube 기반의 세션 지속 Sandbox에서 실행한다.

- 세션별 Sandbox
- shell_exec
- file read/write/edit
- attachment staging
- 생성 artifact 수집
- network policy

Agent가 단순 Tool Calling을 넘어 실제 파일 기반 작업을 수행할 수 있게 한다.

### 5. 모델/스토리지 교체 가능성

OpenAI 호환 API, Ollama, DeepSeek, Qwen, Gemini, Hunyuan, MiniMax, NVIDIA, LiteLLM 등 다양한 provider를 지원한다. LLM / Embedding / Rerank / VLM / ASR을 분리 관리한다.

## 아키텍처

핵심은 Web Frontend + Go Main Service + Python Document Parser의 3-process 구조이며 PostgreSQL과 Redis가 기본 인프라다. Vector DB, Object Storage, Knowledge Graph 등은 배포 요구에 따라 교체/선택할 수 있다.

```text
External Sources / Files
        |
        v
+-----------------------+
| Document Parser       |
| Python / docreader    |
+-----------+-----------+
            |
            v
+-----------------------+
| Knowledge Pipeline    |
| chunk / index / graph |
+-----------+-----------+
            |
      +-----+------+
      |            |
      v            v
 Quick Q&A      ReAct Agent
   RAG          /    |    \
                KB   MCP  Skill
                          |
                          v
                 Session Sandbox
                Docker/E2B/Cube

            |
            v
       Wiki Generator
            |
            v
 Markdown Wiki + Knowledge Graph
```

Go app은 REST API, RAG 검색, Agent Engine, async worker, 채널 연동을 담당하고 Redis가 비동기 작업 조정에 사용된다. Frontend는 Vue 3 기반이다.

## 장점

### RAG와 Agent/Wiki의 통합

Dify류의 범용 Workflow 플랫폼과 달리 WeKnora의 중심축은 지식 자체다. 같은 지식베이스를 Q&A, Agent, Wiki에서 재사용할 수 있다는 점이 좋다.

### Self-hosting / 데이터 통제

Docker Compose 및 private deployment가 가능해 사내 문서가 외부 SaaS Knowledge Base로 나가는 것을 피해야 하는 환경에서 검토 가치가 있다.

### Agent 친화적인 방향

MCP, Skill Catalog, Sandbox, CLI 등 최근 Agent 생태계의 구성요소를 빠르게 흡수하고 있다.

### Knowledge Curation

chunk를 단순 내부 데이터로 취급하지 않고 수정/버전관리할 수 있으며, Wiki 또한 revision과 rollback을 제공한다. 장기 운영되는 사내 Knowledge Base에서 중요한 특성이다.

## 단점 및 한계

### 운영 구성요소가 많다

Go app, Vue frontend, Python parser, PostgreSQL, Redis를 기본으로 하고 기능에 따라 vector DB, graph, object storage, sandbox까지 추가된다. 작은 개인 RAG 용도에는 과한 구조가 될 수 있다.

### 빠른 개발 속도와 안정성의 trade-off

2026년에도 문서 삭제 후 vector/graph/wiki 정리 문제, 대량 문서 parsing 실패, parsing 중 Agent 응답 정체 등 운영 관련 Issue가 보고됐다. 최신 버전에서 개별 문제가 해결됐는지는 도입 전 반드시 재검증해야 한다.

### Sandbox 보안

Agent가 shell/file/network 기능을 사용하는 구조이므로 Enterprise 도입 시 sandbox isolation, egress, credential 전달, artifact 검증 정책이 필수다.

### Windows 중심 개발환경

공식 핵심 배포 흐름은 Docker 기반이다. Windows 개발 PC에서 직접 서비스처럼 사용하는 것보다 Linux/Docker 서버에 배치하고 API/MCP/CLI로 연결하는 형태가 현실적이다.

### 라이선스 확인 필요

GitHub repository metadata의 SPDX가 NOASSERTION으로 표시된다. Enterprise 재배포/상용 사용 전 저장소의 실제 LICENSE 조건을 별도로 검토해야 한다.

## 활용 사례

- 사내 기술 문서 / 개발 가이드 RAG
- Confluence/Notion/Feishu 계열 지식 통합
- 제품/운영 매뉴얼 Q&A
- 문서 기반 조사 Agent
- 문서 집합에서 자동 Wiki 생성
- 사내 Agent의 Knowledge Retrieval Backend
- MCP를 통한 외부 도구 결합

## 기존 도구와 비교

| 관점 | WeKnora | 일반 RAG 플랫폼 | 범용 Agent Workflow |
|---|---|---|---|
| 중심 | Knowledge Platform | 검색/Q&A | Workflow/Agent |
| Hybrid RAG | 강함 | 주 기능 | 구현에 따라 다름 |
| Agent | ReAct 내장 | 제한적일 수 있음 | 강함 |
| MCP/Skill | 지원 | 제품별 상이 | 제품별 상이 |
| Sandbox | 세션 지속형 지원 | 드묾 | 일부 지원 |
| 자동 Wiki | 핵심 기능 | 드묾 | 보통 별도 구현 |
| Self-host | 지원 | 다수 지원 | 제품별 상이 |

## 활용 아이디어

### 바로 적용 가능 — AI Wiki의 검색 계층

현재 Markdown 기반 AI Knowledge Base를 WeKnora에 ingest하여 자연어 검색/RAG 계층으로 사용하는 방식은 바로 PoC할 가치가 있다. GitHub Wiki를 Source of Truth로 유지하고 WeKnora는 derived index로 두면 기존 Git 기반 운영방식을 훼손하지 않는다.

### PoC 가치 있음 — Claude Code Knowledge Backend

Claude Code workspace에서 모든 원문을 context에 넣는 대신 필요한 지식만 WeKnora 검색/MCP를 통해 가져오도록 구성할 수 있다.

```text
Claude Code
    |
    | query
    v
MCP / WeKnora
    |
    +-- AI Wiki
    +-- Project Docs
    +-- Specs
    +-- Historical Decisions
    |
    v
Relevant chunks only
```

이 구조는 특히 장기 프로젝트에서 context window에 전체 문서를 반복 투입하는 비용을 줄이는 실험 대상으로 적합하다. 실제 token 절감량은 별도 benchmark가 필요하다.

### PoC 가치 있음 — Perforce 개발 Harness의 지식 서버

Perforce workspace 자체를 실시간 코드 검색 DB로 넣기보다는, 안정적인 문서·설계·운영 규칙·과거 장애 기록을 WeKnora에 넣고 코드 컨텍스트는 별도 code-index/virtualization 계층으로 분리하는 편이 적합하다.

### 아이디어 참고 — 자동 Wiki 생성

사내 문서를 WeKnora Wiki Mode로 정리한 뒤 결과를 Git Markdown으로 export/sync할 수 있다면 현재 Wiki 작성 파이프라인의 초안 생성기로 활용 가능하다. 다만 Git Wiki와 WeKnora Wiki 중 어느 쪽을 Source of Truth로 둘지는 명확히 해야 한다.

## 도입 판단

현재 환경에서는 WeKnora를 기존 Claude/Codex Harness 자체를 대체하는 제품으로 보기보다 **Knowledge Infrastructure**로 보는 것이 적합하다.

특히 다음 PoC가 가치 있다.

1. 기존 `ai/` Wiki ingest
2. Claude Code에서 MCP/RAG 질의
3. 동일 작업을 전체 문서 직접 주입 방식과 비교
4. 입력 token, retrieval latency, 정답률, citation accuracy 측정
5. Wiki 자동 생성 결과와 기존 수동 Wiki 품질 비교

핵심 검증 포인트는 "RAG 정확도" 하나가 아니라 **Agent 작업 시 필요한 컨텍스트를 얼마나 적은 token으로 정확히 공급할 수 있는가**다.

## 결론

WeKnora는 단순한 Tencent판 RAG UI라기보다 RAG를 중심으로 Agent 실행과 Knowledge Curation을 합친 플랫폼에 가깝다. 특히 자동 Wiki와 세션 지속 Skill Sandbox의 조합이 흥미롭다.

현재 AI/AX 관점에서는 **Claude/Codex의 장기 지식 및 선택적 Context 공급 계층으로 PoC할 가치가 높은 도구**다. 다만 운영 복잡도와 빠르게 변하는 프로젝트의 안정성은 실제 사내 문서 규모로 검증해야 한다.

## 참고 자료

- https://github.com/Tencent/WeKnora
- https://github.com/Tencent/WeKnora/blob/main/README_KO.md
- https://github.com/Tencent/WeKnora/blob/main/website-docs/02-architecture/01-overview.md
- https://github.com/Tencent/WeKnora/blob/main/CHANGELOG.md
- https://github.com/Tencent/WeKnora/releases
