---
title: Open Notebook
category: tools
tags:
  - ai
  - research-assistant
  - rag
  - self-hosted
  - notebooklm
source: https://github.com/lfnovo/open-notebook
updated: 2026-09-13
---

# Open Notebook

> Google NotebookLM의 핵심 연구 경험을 self-hosted·provider-agnostic 형태로 가져오고, RAG·노트·변환·팟캐스트를 하나의 개인 지식 연구 환경으로 묶은 오픈소스 AI Research Assistant.

## 프로젝트 개요

Open Notebook은 문서/PDF/웹/오디오/비디오 등의 자료를 Notebook 단위로 수집하고, 검색·질의응답·노트 생성·변환·팟캐스트 생성을 수행하는 privacy-focused 연구 도구다. 핵심 차별점은 특정 AI 모델에 종속되지 않고 다수의 cloud provider와 Ollama/LM Studio 같은 local model을 선택할 수 있다는 점이다.

NotebookLM의 단순 복제라기보다, 데이터와 모델 선택권을 사용자가 소유하는 self-hosted research workspace에 가깝다.

## 해결하려는 문제

상용 AI 연구 도구는 편리하지만 데이터 저장 위치와 모델 선택, 비용 구조, 기능 확장에 제약이 있다. Open Notebook은 다음 문제를 겨냥한다.

- 연구 자료를 외부 SaaS에 종속시키는 문제
- 특정 vendor/model에 대한 lock-in
- 로컬 모델과 클라우드 모델을 동일한 연구 환경에서 사용하기 어려움
- 자료 수집 → 검색 → Q&A → 요약/노트 → 오디오 결과물 과정이 여러 도구로 분리됨
- 개인 Knowledge Base를 AI가 검색 가능한 형태로 운영하기 위한 인프라 구축 비용

## 핵심 기능

- PDF, URL, audio, video, text 등 다양한 source 수집
- Full-text + semantic search 기반 RAG
- source 기반 AI chat 및 citation
- AI note/summary/insight 생성
- reusable transformation을 통한 자료 가공
- 1~4 speaker 기반 podcast 생성
- 다수 AI provider 및 local model 지원
- Docker 기반 self-hosting
- 장시간 source processing/podcast 작업을 위한 background job 처리
- Docling 및 Crawl4AI 같은 heavy extraction runtime을 opt-in 방식으로 지원

## 아키텍처

공식 architecture 문서 기준으로 3-tier 구조다.

```text
Browser
   │
   ▼
Next.js / React Frontend
   │  /api/* proxy
   ▼
FastAPI Backend
   │
   ├── LangGraph workflows
   ├── Model / Provider abstraction (Esperanto)
   ├── Source processing / Transformations
   ├── Background jobs
   │
   ▼
SurrealDB
 ├── application data
 ├── graph relationships
 └── vector/search data

External / Local AI Providers
   ▲
   └── OpenAI / Anthropic / Google / OpenRouter / Ollama / LM Studio ...
```

### 주요 설계 포인트

**Async-first**

DB query, graph invocation, AI call을 비동기로 처리한다. I/O가 많은 RAG 및 생성형 AI workload에서 UI 응답성과 동시성을 확보하려는 설계다.

**LangGraph 기반 workflow**

Ask, Chat, Transformation 같은 복합 AI 처리를 graph/state-machine 형태로 구성한다. 단순한 endpoint 내부 prompt chain보다 실행 흐름을 명시적으로 관리하기 쉽다.

**Provider abstraction**

Esperanto 계층을 이용해 AI provider를 추상화한다. 모델 교체가 application workflow 변경으로 직접 이어지지 않도록 설계되어 비용 최적화와 vendor lock-in 완화에 유리하다.

**SurrealDB**

일반 application data와 graph/vector 검색을 한 시스템에 통합한다. 별도 vector DB를 추가하지 않아도 되는 장점이 있지만 SurrealDB 자체의 운영 경험이 필요하다.

**Background workers**

문서 처리나 podcast 생성처럼 오래 걸리는 작업은 job 형태로 넘겨 HTTP request timeout과 UI blocking을 피한다.

## 최근 개발 방향

2026년 중반 changelog에서는 단순 NotebookLM clone을 넘어 운영성과 확장성을 강화하는 방향이 보인다.

- Docling/Crawl4AI를 기본 이미지에 포함하지 않고 필요 시 설치하는 opt-in runtime 구조
- capability probe를 통한 실제 설치 기능 확인
- VISION.md와 ADR/PDR 기반 architectural decision 관리
- coding agent용 AGENTS.md 도입
- AI-assisted/agent-generated PR에 대한 contribution 규칙 명시
- release image 수준의 자동 검증 강화

Plugin architecture는 source/note format/deliverable 확장을 위한 제안이 존재하지만 아직 design 단계 이슈이므로 현재 구현된 안정 기능으로 간주하면 안 된다.

## 장점

### 1. 모델 선택 자유도

Cloud와 local model을 같은 제품 안에서 선택할 수 있어 privacy, 품질, 비용에 따라 모델을 바꿀 수 있다.

### 2. Knowledge Base 구축 비용 감소

직접 RAG UI, embedding pipeline, vector search, chat, source ingestion을 모두 구현하는 대신 이미 통합된 환경을 사용할 수 있다.

### 3. Self-hosted

문서와 연구 데이터를 직접 통제할 수 있다. 사내 문서나 개인 Knowledge Base처럼 SaaS 업로드가 부담스러운 환경에서 가치가 크다.

### 4. AI workflow가 비교적 명확함

LangGraph와 background worker를 사용해 복잡한 처리 흐름을 구조화하고 있다. AI workflow/harness 설계 참고 사례로도 가치가 있다.

### 5. Provider lock-in 완화

Provider abstraction은 특정 모델 가격/성능 변화에 대응하기 쉽다.

## 단점 및 한계

### 운영 복잡도

Self-hosting은 privacy와 제어권을 얻는 대신 Frontend, FastAPI, SurrealDB, AI provider 및 선택적 extraction runtime을 직접 운영해야 한다.

### Local LLM의 품질/성능 의존성

Ollama/LM Studio를 사용할 수 있다고 해서 cloud frontier model과 동일한 Q&A/RAG 품질이 보장되는 것은 아니다. 모델 크기, context window, embedding 선택, GPU 자원에 따라 체감 품질 차이가 클 수 있다.

### SurrealDB 의존성

DB와 vector/graph 역할을 통합하는 것은 단순하지만, PostgreSQL/SQLite 중심 환경보다 조직 내 운영 경험과 tooling이 부족할 수 있다.

### 보안 hardening 필요

공식 security policy도 built-in password middleware를 기본 access control 수준으로 설명한다. CORS, reverse proxy, encryption key, DB exposure 등을 production/enterprise 환경에서 별도로 hardening해야 한다.

2026년 4월에는 Local File Inclusion, path traversal, Jinja2 SSTI/RCE, SurrealDB injection 관련 security advisory가 공개된 이력이 있다. 최신 버전만 security fix 대상이므로 장기 운영 시 update 정책이 중요하다.

### 아직 발전 중인 기능

Issue tracker에는 context-length retry, answer truncation, document search/content processing 관련 이슈가 계속 보고되고 있다. 따라서 mission-critical enterprise knowledge platform보다는 적극적으로 업데이트 가능한 환경에서 먼저 검증하는 편이 적절하다.

## 활용 사례

### 개인 AI Knowledge Base

기술 문서, 논문, GitHub 분석 자료를 source로 넣고 semantic search + chat layer를 제공하는 개인 연구 서버로 사용할 수 있다.

### 사내 기술 문서 Research Assistant

보안 정책을 충족하도록 내부망에 배포하고 local model을 연결하면 사내 문서 검색/요약 PoC로 활용할 수 있다. 다만 인증/권한 체계는 별도 검토가 필요하다.

### 기술 조사 자료의 전처리 허브

여러 URL/PDF를 Open Notebook에 수집한 뒤 summary, insight, note를 생성하고 최종 산출물을 Wiki나 다른 agent workflow로 넘기는 방식이다.

### AI Harness 참고 구현

LangGraph orchestration, provider abstraction, async background job, capability detection 등은 자체 AI harness를 설계할 때 참고할 만하다.

## 기존 도구와 비교

| 항목 | Open Notebook | NotebookLM | 직접 구축 RAG |
|---|---|---|---|
| Self-host | 강점 | 불가 | 가능 |
| 모델 선택 | 매우 높음 | Google 중심 | 자유 |
| 초기 구축 | Docker 필요 | 매우 쉬움 | 가장 어려움 |
| 커스터마이징 | 높음 | 제한적 | 가장 높음 |
| 운영 부담 | 중간~높음 | 낮음 | 높음 |
| Podcast | 지원, speaker customization | 지원 | 직접 구현 |
| 내부 구조 학습 가치 | 높음 | 낮음 | 구현에 따라 다름 |

## 활용 아이디어

### 바로 적용 가능

**개인 기술 Research Notebook**

GitHub repository, AI 논문, 기술 블로그를 주제별 notebook에 넣어 조사용 RAG workspace로 사용한다. 현재 Wiki가 최종 정리 저장소라면 Open Notebook은 그 앞단의 원자료/질의 환경 역할을 맡길 수 있다.

```text
GitHub / Blog / PDF
        │
        ▼
   Open Notebook
 ingest / RAG / Q&A
 summary / insights
        │
        ▼
 AI 분석 Agent
        │
        ▼
  jaywapp/wiki
```

### PoC 가치 있음

**회사 내부 기술 Knowledge Assistant**

Perforce/TeamCity/UE/내부 개발도구 문서를 source로 적재하고 local model 또는 승인된 enterprise API를 연결하는 PoC 가치가 있다. 다만 실제 사내 도입 전에는 인증, 사용자별 ACL, credential 관리, backup/upgrade 정책을 먼저 검증해야 한다.

**기존 AI Harness의 Research Memory Layer**

Claude/Codex가 직접 모든 원문을 context에 넣는 대신 Open Notebook에서 먼저 검색/요약한 결과만 agent context로 전달하면 context 크기를 줄일 수 있다. 다만 공식적으로 Claude Code/Codex용 MCP memory server 역할을 제공하는 프로젝트는 아니므로 연결 adapter/API 설계가 필요하다.

### 아이디어 참고

- Provider abstraction 구조
- LangGraph 기반 workflow 분리
- background worker를 통한 긴 AI task 격리
- AGENTS.md + ADR/PDR로 AI coding agent와 사람의 개발 규칙을 통합 관리하는 방식
- heavy dependency를 capability 기반 opt-in runtime으로 분리하는 방식

### 현재는 도입 가치 낮음

강한 multi-user RBAC/SSO, enterprise compliance, 장기간 지원되는 LTS가 즉시 필요한 핵심 사내 플랫폼을 Open Notebook 하나로 대체하는 것은 아직 신중할 필요가 있다.

## 결론

Open Notebook의 가장 큰 가치는 "오픈소스 NotebookLM"이라는 UI 복제보다 **self-hosted RAG research stack을 이미 제품 형태로 묶어 놓았다는 것**이다.

개인 AI Knowledge Base의 조사 전단이나 기술자료 Research Assistant로는 바로 시험해볼 가치가 높다. 특히 현재처럼 GitHub/AI 기술 자료를 지속적으로 조사해 Wiki에 축적하는 workflow에서는 **Open Notebook = 원자료 수집·검색·질의 계층, Wiki = 검증된 최종 지식 계층**으로 역할을 나누는 구성이 잘 맞는다.

반면 회사 production 환경에서는 인증/권한, 보안 hardening, update 운영, SurrealDB 관리 부담을 별도 평가해야 한다.

**평가: 개인 환경은 바로 적용 가능 / 사내 환경은 PoC 가치 높음.**

## 참고 자료

- https://github.com/lfnovo/open-notebook
- https://github.com/lfnovo/open-notebook/blob/main/docs/7-DEVELOPMENT/architecture.md
- https://github.com/lfnovo/open-notebook/blob/main/CHANGELOG.md
- https://github.com/lfnovo/open-notebook/security
- https://github.com/lfnovo/open-notebook/issues
