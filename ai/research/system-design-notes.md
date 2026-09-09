---
title: System Design Notes
category: research
tags:
  - system-design
  - architecture
  - scalability
  - ai-coding
  - agent-context
source: https://github.com/liquidslr/system-design-notes
updated: 2026-09-09
---

# System Design Notes

> 대규모 서비스 설계의 핵심 패턴과 대표 시스템 설계 문제를 장별 Markdown + 다이어그램으로 정리한 학습용 저장소. AI 코딩/설계 에이전트 관점에서는 구현 도구라기보다 아키텍처 판단을 보조하는 reference corpus로 활용 가치가 있다.

## 프로젝트 개요

`liquidslr/system-design-notes`는 시스템 디자인의 기초 개념부터 대표적인 설계 문제까지 단계적으로 정리한 문서형 GitHub 저장소다. 실행 가능한 프레임워크나 라이브러리가 아니라 각 주제를 독립 디렉터리와 `Readme.md`, 이미지 다이어그램으로 구성한 학습 자료에 가깝다.

확인한 저장소 구조에는 Scaling, Back-of-the-Envelope Estimation, System Design Framework, Rate Limiter, Consistent Hashing, Key-Value Store, Unique-ID Generator, URL Shortener, Web Crawler, Notification System, News Feed, Chat System, Search Autocomplete, YouTube, Google Drive 등의 주제가 포함된다.

2026-09-09 조사 기준 최근 커밋은 2026-08-12의 Scaling 문서 오타 수정이며, 2026년에도 문서 수정 PR이 반영되고 있다. 다만 최근 활동의 성격은 기능 개발보다 문서 유지보수에 가깝다.

## 해결하려는 문제

시스템 디자인을 공부할 때 개별 기술을 아는 것만으로는 실제 설계 문제를 풀기 어렵다. 요구사항과 규모를 먼저 정의하고, 용량을 추정하고, 상위 구조를 만든 뒤 병목을 깊게 파고드는 일관된 사고 과정이 필요하다.

이 저장소는 다음 문제를 해결하는 데 초점을 둔다.

- 확장성, 캐시, DB 복제, CDN, 메시지 큐 같은 기본 패턴을 연결해서 이해하기
- 규모 추정과 아키텍처 선택을 함께 연습하기
- Rate Limiter, Chat, News Feed 같은 대표 문제를 end-to-end로 설계하기
- 시스템 디자인 인터뷰에서 사용할 반복 가능한 설계 절차 익히기

## 핵심 내용

### 1. Zero → Millions Scaling

초기 단일 서버에서 출발해 다음 요소를 순차적으로 도입하는 방식으로 확장 과정을 설명한다.

```text
Single Server
    ↓
Separate Database
    ↓
Horizontal Scaling + Load Balancer
    ↓
Database Replication
    ↓
Cache
    ↓
CDN
    ↓
분산 시스템 구성 요소 확대
```

중요한 점은 기술 목록 자체보다 **어떤 병목이 발생했을 때 다음 구성 요소가 필요한지**를 순서대로 보여준다는 것이다.

### 2. System Design 4-Step Framework

저장소가 제안하는 설계 흐름은 다음 네 단계다.

1. 문제와 범위 명확화
2. High-Level Design 제안 및 합의
3. 핵심 영역 Deep Dive
4. 병목·확장·실패 시나리오를 포함한 마무리

45분 인터뷰 기준으로 요구사항 3~10분, 상위 설계 10~15분, Deep Dive 10~25분, 마무리 3~5분 정도를 제안한다.

이 프레임은 인터뷰뿐 아니라 AI 에이전트에게 설계 작업을 시킬 때도 유용하다. 바로 코드를 생성시키기보다 `requirements → scale → high-level architecture → deep dive → failure/scale review` 순서로 강제할 수 있기 때문이다.

### 3. 대표 시스템 설계 패턴

저장소는 단순 개념 설명 외에도 실제 시스템 단위 예제를 제공한다.

- Rate Limiter: Token Bucket, Leaky Bucket, Fixed/Sliding Window 계열
- Consistent Hashing: 서버 추가·제거 시 데이터 재배치 최소화
- Key-Value Store: 분산 저장 구조
- Unique ID Generator: 분산 환경 ID 생성
- URL Shortener
- Web Crawler
- Notification System
- News Feed System
- Chat System
- Search Autocomplete
- YouTube
- Google Drive

### 4. Chat System 예시

Chat System 장은 1:1/그룹 채팅, presence, multi-device, push notification을 포함하고 5천만 DAU를 가정한다.

주요 구성은 다음과 같다.

```text
Client
  │
  ├─ API / Stateless Services
  │
  └─ WebSocket
       ↓
   Chat Server ── Service Discovery
       │
       ├─ Key-Value Store (chat history)
       ├─ Presence Server
       └─ Notification Service
```

WebSocket 기반 실시간 연결, service discovery, KV 기반 메시지 저장, device별 message-id 기반 동기화, heartbeat 기반 presence 등 실제 서비스 설계에서 반복되는 패턴을 한 사례 안에서 연결한다.

## 구조 및 아키텍처

이 저장소 자체는 소프트웨어 아키텍처가 아니라 문서 저장소다.

```text
system-design-notes/
├── 01. Scaling/
│   ├── Readme.md
│   └── images/
├── 02. Back Of the Envelope Estimation/
├── 03. System Design Framework/
├── 04. Rate Limiter/
├── 05. Consistent Hashing/
├── ...
└── 15. Google Drive/
```

각 챕터가 독립적인 Markdown 문서이며 필요한 경우 PNG 다이어그램을 함께 둔다. 따라서 전체 저장소를 clone하거나 특정 챕터만 reference context로 가져오기 쉽다.

## 장점

- 시스템 디자인 핵심 주제를 한 저장소에서 단계적으로 볼 수 있다.
- Markdown 중심이라 검색, RAG, Agent context, 로컬 Knowledge Base에 넣기 쉽다.
- 다이어그램이 많아 구조를 빠르게 파악하기 좋다.
- 단순 정의가 아니라 요구사항 → 상위 설계 → deep dive 흐름을 반복한다.
- 개별 패턴과 실제 시스템 예제를 함께 제공한다.
- 실행 코드 의존성이 없어 기술 스택과 무관하게 참고할 수 있다.

## 단점 및 한계

- production reference architecture가 아니라 학습/인터뷰 노트다. 그대로 구현 명세로 사용하면 안 된다.
- 각 설계의 선택 근거와 trade-off가 실제 production postmortem이나 공식 아키텍처 문서만큼 깊지는 않다.
- 클라우드 서비스, Kubernetes, observability, security, compliance, multi-region 운영 등 현대 Enterprise 환경의 세부 운영 이슈는 제한적이다.
- 비용 모델과 실제 benchmark 데이터가 충분하지 않다.
- 예를 들어 Chat System의 Zookeeper, KV Store 등의 선택은 가능한 설계안이지 모든 환경의 정답이 아니다.
- 저장소 활동은 문서 유지보수 중심이므로 최신 분산 시스템 기술을 지속적으로 추적하는 자료로 보기는 어렵다.

## AI / AX 관점 활용 가치

이 저장소 자체는 AI 프로젝트가 아니다. 따라서 AI Knowledge Base에서는 **도구**보다 AI coding/architecture agent가 사용할 수 있는 설계 reference corpus라는 관점이 더 중요하다.

### 바로 적용 가능 — 설계 프롬프트의 사고 순서

Coding Agent에게 큰 기능을 맡길 때 다음 순서를 기본 설계 instruction으로 사용할 수 있다.

```text
1. Clarify requirements
2. Define scale / constraints
3. Estimate capacity when relevant
4. Draw high-level architecture
5. Identify critical components
6. Deep-dive into bottlenecks
7. Review failure modes and scaling path
8. Only then create implementation plan
```

바로 구현에 들어가는 agent의 성향을 억제하고, 설계 근거를 먼저 남기게 하는 데 유용하다.

### PoC 가치 있음 — Architecture Skill

저장소 전체를 항상 context에 넣는 것보다 필요한 패턴만 검색하는 Skill/RAG 형태가 적합하다.

```text
Architecture Agent
      │
      ├─ requirements / scale 분석
      │
      ├─ retrieve(system-design-notes)
      │      ├─ scaling
      │      ├─ rate limiting
      │      ├─ consistent hashing
      │      ├─ messaging
      │      └─ storage patterns
      │
      ├─ 프로젝트 코드/제약과 비교
      │
      └─ ADR / architecture proposal 생성
```

특히 Claude Code/Codex 같은 coding agent에 `system-design-review` Skill을 만들어 설계 단계에서만 필요한 챕터를 동적으로 읽게 하면 context 낭비를 줄일 수 있다.

### 아이디어 참고 — Reviewer용 체크리스트

PR 또는 설계 문서를 리뷰할 때 다음 질문을 자동화할 수 있다.

- 예상 트래픽과 데이터 규모가 정의되어 있는가?
- SPOF가 존재하는가?
- read/write 비율에 맞는 저장 전략인가?
- cache consistency와 eviction이 고려됐는가?
- horizontal scaling이 가능한가?
- failure recovery 경로가 있는가?
- realtime 요구사항에 polling/WebSocket 등의 선택 근거가 있는가?
- message ordering/idempotency 문제가 있는가?

## 기존 자료와 비교

이 저장소의 강점은 깊은 production 사례보다는 **압축된 학습 구조**다.

- 공식 AWS/Azure/GCP Architecture Center: production 패턴과 특정 클라우드 구현은 더 깊지만 자료 범위가 크다.
- 실제 기업 Engineering Blog: 현실적인 trade-off와 장애 경험은 강하지만 체계적인 학습 순서가 약하다.
- `system-design-notes`: 깊이는 상대적으로 얕지만 한 저장소 안에서 기본 개념과 대표 문제를 빠르게 탐색하기 좋다.

따라서 Agent knowledge source로 쓸 경우 이 저장소만 정답 소스로 사용하기보다 공식 DB/Cloud 문서 및 실제 production 사례를 추가 검증하는 구조가 안전하다.

## 활용 아이디어

### 바로 적용 가능

- 시스템 설계 전 `4-step framework`를 planning prompt에 반영
- Architecture Review 체크리스트의 기초 자료로 사용
- 신규 개발자의 system design 학습용 reference로 활용

### PoC 가치 있음

- `system-design-review` Agent Skill 제작
- 챕터별 Markdown을 임베딩해 architecture RAG 구축
- ADR 작성 Agent가 관련 설계 패턴을 검색하도록 연결
- 코드 생성 전 Architect Agent → Coding Agent → Review Agent 파이프라인의 Architect 단계 reference로 사용

### 아이디어 참고

- 사내 실제 장애/성능 사례를 각 패턴에 연결해 내부 버전으로 확장
- Perforce/TeamCity/Unreal 기반 대규모 개발 인프라에 맞는 `Developer Infrastructure System Design` corpus로 재구성

### 현재는 도입 가치 낮음

- 저장소 전체를 모든 coding session의 고정 context로 넣는 방식. 문서량 대비 실제 작업과 무관한 토큰이 많이 들어갈 수 있어 필요한 챕터만 retrieval하는 편이 낫다.

## 결론

`system-design-notes`는 새로운 프레임워크나 혁신적인 아키텍처를 제안하는 프로젝트라기보다 **시스템 설계의 기본 사고법과 대표 패턴을 압축한 reference repository**다.

AI/AX 관점에서 가장 가치 있는 사용법은 문서를 그대로 읽는 것보다, 설계 에이전트가 요구사항 분석 후 필요한 챕터만 검색해 architecture proposal이나 review checklist에 근거로 사용하는 것이다. 특히 coding agent가 구현부터 시작하는 문제를 막기 위한 `requirements → architecture → deep dive → review → implementation` 단계화에 잘 맞는다.

평가: **PoC 가치 있음**. 독립 도구로 도입할 대상은 아니지만 Architecture Skill/RAG의 seed corpus로 활용하기 좋다.

## 참고 자료

- Repository: https://github.com/liquidslr/system-design-notes
- Scaling: https://github.com/liquidslr/system-design-notes/tree/main/01.%20Scaling
- System Design Framework: https://github.com/liquidslr/system-design-notes/tree/main/03.%20System%20Design%20Framework
- Chat System: https://github.com/liquidslr/system-design-notes/tree/main/12.%20Chat%20System
