---
title: OpenSEO
category: tools
tags:
  - ai
  - seo
  - mcp
  - agent-skills
  - self-hosted
source: https://github.com/every-app/open-seo
updated: 2026-09-13
---

# OpenSEO

> Semrush/Ahrefs의 핵심 SEO 워크플로를 오픈소스로 제공하면서, MCP와 Agent Skills를 통해 Claude Code·Codex·Cursor 같은 AI 에이전트가 SEO 데이터를 직접 사용하게 만드는 AI-native SEO 플랫폼.

## 프로젝트 개요

OpenSEO는 키워드 조사, 순위 추적, 경쟁사 분석, 백링크, 사이트 감사, AI Visibility 등을 한곳에서 제공하는 오픈소스 SEO 도구다. 전통적인 SEO SaaS처럼 고정 구독형 데이터 플랫폼을 지향하기보다 DataForSEO API를 사용자가 직접 연결하는 BYO API/pay-as-you-go 구조와 self-hosting을 강조한다.

특히 이 프로젝트의 AX 관점 핵심은 웹 UI만 제공하는 것이 아니라 SEO 기능을 MCP 서버로 노출하고, 반복 가능한 SEO 작업 절차를 Agent Skills로 함께 제공한다는 점이다. 즉 `사람이 SEO 대시보드를 조작`하는 방식과 `AI 에이전트가 SEO 도구를 호출`하는 방식을 동일한 제품 위에 결합한다.

## 해결하려는 문제

기존 Semrush/Ahrefs 계열은 강력하지만 개인 개발자나 소규모 팀에게 가격과 기능 복잡도가 부담이 될 수 있다. 또한 AI coding agent가 SEO 데이터를 활용하려면 별도 API 연동, 프롬프트, 워크플로 정의가 필요하다.

OpenSEO는 이를 다음 방식으로 단순화한다.

- SEO 데이터 비용을 DataForSEO 사용량 중심으로 전환
- Docker/Cloudflare 기반 self-hosting 지원
- MCP를 통해 AI 에이전트에 SEO 기능 노출
- Agent Skills로 분석 절차 자체를 재사용
- UI와 에이전트 인터페이스를 하나의 서비스에서 제공

## 핵심 기능

- Keyword Research
- Rank Tracking
- Competitor Insights / Competitive Landscape
- Backlinks 및 Link Prospecting
- Site Audit
- AI Visibility
- Local SEO
- Google Search Console 연동
- MCP Server
- Agent Skills
- Docker 및 Cloudflare self-hosting

2026-09 기준 저장소에는 `competitive-landscape`, `competitor-analysis`, `keyword-clustering`, `keyword-research`, `link-prospecting`, `local-seo`, `seo-audit`, `seo-coach`, `seo-project-setup` 등의 Skill이 포함되어 있다.

## 아키텍처

```text
┌──────────────────────────────┐
│ User / AI Agent              │
│ Claude Code / Codex / Cursor │
└──────────────┬───────────────┘
               │ MCP + Skills
               ▼
┌──────────────────────────────┐
│ OpenSEO                      │
│                              │
│ Web UI ─── SEO Workflows     │
│ MCP Server ─ Tool Registry   │
│ Agent Skills ─ Procedures    │
│ SAM / AI features            │
└───────┬──────────┬───────────┘
        │          │
        │          ├── Google Search Console
        │          │
        ▼          ▼
   DataForSEO    External data
        │
        ▼
 Keyword/SERP/Backlink/
 Local SEO data
```

코드상 MCP 구현은 `src/server/mcp/` 아래에 서버와 HTTP transport가 존재하며 Model Context Protocol SDK를 사용한다. 공식 플러그인 설정은 hosted MCP endpoint `https://app.openseo.so/mcp`를 가리킨다.

프런트/서버 스택은 TypeScript, React 19, TanStack Start/Router/Query, Vite, Drizzle ORM을 중심으로 구성되어 있으며 Cloudflare Workers 계열 배포와 PostgreSQL/D1 구성을 지원한다. AI 기능에는 Vercel AI SDK 계열 패키지와 OpenRouter provider가 포함되어 있다.

## Agent Skills 관점

OpenSEO의 흥미로운 부분은 MCP만 제공하지 않는다는 것이다.

MCP가 `무엇을 실행할 수 있는가`를 제공한다면 Skill은 `그 도구들을 어떤 순서와 판단 기준으로 사용할 것인가`를 제공한다.

```text
사용자 목표
  ↓
Agent Skill
  ↓ 분석 절차/판단 규칙
MCP Tool 호출
  ↓
OpenSEO
  ↓
SEO Data
  ↓
Agent가 결과 해석 및 다음 작업 결정
```

이 구조는 범용 AI 에이전트에 도메인별 실행 능력을 붙이는 좋은 참고 사례다. Claude/Cursor/Codex용 플러그인 메타데이터도 저장소에 포함되어 있어 동일한 Skill+MCP 패키지를 여러 에이전트 환경으로 배포하려는 방향이 보인다.

## 장점

1. **AI-native 인터페이스** — SEO 데이터를 UI뿐 아니라 MCP로 직접 소비할 수 있다.
2. **MCP + Skill 조합** — 단순 API wrapper보다 실제 업무 절차 자동화에 가깝다.
3. **Self-hosting** — Docker 또는 Cloudflare를 선택할 수 있어 데이터/운영 통제 범위가 넓다.
4. **비용 구조** — 고가 SEO SaaS의 고정 구독 대신 DataForSEO 사용량 기반 접근이 가능하다.
5. **확장성** — 오픈소스이므로 조직별 SEO workflow나 Skill을 추가하기 쉽다.
6. **활발한 개발** — 2026년에도 릴리스와 PR/Issue 활동이 빠르게 이어지고 있다.

## 단점 및 한계

### DataForSEO 의존성

Self-hosting을 해도 핵심 SEO 데이터는 DataForSEO에 의존한다. 따라서 완전한 독립형 SEO 엔진은 아니다. 과거 issue에서도 provider modularization 요구가 제기된 바 있어 vendor dependency는 중요한 평가 포인트다.

### 사용량 비용

OpenSEO 자체가 오픈소스여도 SERP/keyword/backlink 조회는 외부 API 비용이 발생한다. Agent가 자율적으로 많은 도구 호출을 수행하면 전통적인 수동 UI보다 API 요청량이 빠르게 증가할 수 있으므로 MCP tool에 budget/cache/limit 정책을 두는 편이 안전하다.

### Self-host 운영 복잡도

Cloudflare Access, OAuth, 환경 변수, 데이터베이스, 외부 API credential 등 운영 요소가 존재한다. 과거 Cloudflare 인증/배포 관련 issue도 보고됐다. 개인 로컬 Docker는 비교적 단순하지만 팀/외부 공개 환경은 일반 SaaS보다 운영 부담이 크다.

### 프로젝트 성숙도

현재 버전은 아직 0.x 계열이며 빠르게 변화하고 있다. 기능 추가 속도가 빠른 만큼 API/배포 방식/Skill 구성이 바뀔 가능성을 고려해야 한다.

### 범위 제한

현재 중심은 웹 검색 SEO다. App Store/Play Store 검색 최적화 지원은 issue 단계로 확인되며 ASO까지 하나의 제품에서 처리하는 수준은 아니다.

## 활용 사례

### 콘텐츠 자동화 Agent

```text
주제 입력
 ↓
keyword-research
 ↓
competitor-analysis
 ↓
keyword-clustering
 ↓
콘텐츠 구조 생성
 ↓
게시
 ↓
rank-tracking
 ↓
개선 Agent
```

콘텐츠 기반 사이드 프로젝트에서 특히 유용하다. AI가 단순히 글을 생성하는 것이 아니라 실제 검색 데이터에 근거해 주제 선정 → 경쟁 분석 → 작성 → 순위 추적 루프를 만들 수 있다.

### 개인 SEO Copilot

Claude Code/Codex에 OpenSEO MCP를 연결하고 다음과 같은 자연어 요청을 수행하는 방식이다.

- 이 사이트에서 SEO 문제가 큰 페이지 찾아줘
- 경쟁사가 순위에 있는데 우리에게 없는 키워드 찾아줘
- 이번 주 순위가 급락한 키워드 분석해줘
- 다음 콘텐츠 후보를 검색량/난이도 기준으로 정리해줘

### 자동화 파이프라인

GitHub Actions/cron/Agent Harness와 결합해 주기적으로 rank tracking → 변화 탐지 → Agent 분석 → 리포트 생성 구조를 만들 수 있다.

## 기존 도구와 비교

| 항목 | OpenSEO | Semrush / Ahrefs |
|---|---|---|
| 형태 | Open source + hosted | SaaS |
| 비용 | BYO DataForSEO / usage 기반 | Subscription 중심 |
| Self-host | 가능 | 불가 |
| MCP | 핵심 기능 | 제품별 AI/API 전략에 의존 |
| Agent Skills | 공식 제공 | 일반적으로 핵심 모델 아님 |
| 커스터마이징 | 코드/Skill 수정 가능 | 제한적 |
| 운영 편의성 | 직접 운영 필요 가능 | SaaS가 우수 |
| 데이터 독립성 | DataForSEO 의존 | 자체 데이터 플랫폼 |

대규모 SEO 전문 조직에서는 데이터 규모와 완성도 측면에서 기존 상용 제품이 유리할 수 있지만, AI Agent 중심의 개인/소규모 자동화에서는 OpenSEO의 MCP+Skill 구조가 훨씬 흥미롭다.

## 활용 아이디어

### 바로 적용 가능

- Claude Code/Codex SEO MCP로 사용
- 개인 사이트 keyword research 및 site audit
- AI 콘텐츠 작성 전 keyword/competitor 데이터 수집

### PoC 가치 있음

**콘텐츠 수익 자동화 Harness**

```text
Scheduler
  ↓
Research Agent
  ├─ OpenSEO keyword research
  ├─ competitor analysis
  └─ keyword clustering
  ↓
Writer Agent
  ↓
Review Agent
  ↓
Publish
  ↓
OpenSEO rank tracking
  ↓
Optimization Agent
```

이 경우 OpenSEO는 `SEO Tool`이 아니라 에이전트들이 공유하는 **SEO Data/Action Layer** 역할을 한다.

### 아이디어 참고

OpenSEO의 `MCP + Skill + UI` 패턴은 사내 AX 도구 설계에도 참고할 가치가 높다. 내부 서비스가 기능을 MCP Tool로 제공하고, Skill이 업무 절차를 정의하며, UI는 사람이 상태를 확인하거나 개입하는 구조로 일반화할 수 있다.

```text
Domain Service
   ├─ Human UI
   ├─ MCP Tools
   └─ Agent Skills
```

이는 Perforce/TeamCity/사내 도구를 AI Agent에 연결할 때도 그대로 적용 가능한 패턴이다.

## 결론

OpenSEO의 가장 중요한 포인트는 `오픈소스 Semrush`라는 설명보다 **SEO 도메인을 Agent-ready 서비스로 만든 방식**이다.

특히 MCP로 원시 기능을 제공하고 Agent Skills로 상위 워크플로를 정의한 구조는 AI/AX 관점에서 좋은 사례다. 개인 콘텐츠 자동화나 SEO Agent를 만들 계획이라면 바로 PoC할 가치가 높다.

평가: **PoC 가치 높음 / AI Agent 기반 콘텐츠·SEO 자동화에는 바로 적용 가능**.

## 참고 자료

- https://github.com/every-app/open-seo
- https://github.com/every-app/open-seo/releases
- https://github.com/every-app/open-seo/tree/main/plugins/openseo/skills
- https://github.com/every-app/open-seo/blob/main/web/content/docs/mcp.md
- https://openseo.so/
