---
title: Scrapling
category: tools
tags:
  - ai
  - web-scraping
  - mcp
  - rag
  - agent
source: https://github.com/D4Vinci/Scrapling
updated: 2026-09-13
---

# Scrapling

> 웹 페이지 변경에 적응하는 파서, HTTP/브라우저 Fetcher, 대규모 Spider, MCP와 LLM용 Markdown 추출을 하나로 묶은 Python 웹 스크래핑 프레임워크.

## 프로젝트 개요

Scrapling은 단순 HTML 파싱 라이브러리가 아니라 수집, 브라우저 렌더링, DOM 추출, 크롤링, AI 전달까지 한 프레임워크에서 처리한다. Python 3.10+ 기반이며 BSD-3-Clause 라이선스다.

2026-09-13 조사 기준 저장소는 약 8만 스타와 8천 포크 규모이며 최근에도 활발히 업데이트되고 있다. 최신 확인 릴리스 v0.4.15(2026-08-23)는 MCP 서버 재설계, RAG용 Markdown 변환, 브라우저 탭 재사용 등을 포함한다.

## 해결하려는 문제

전통적인 스크래퍼는 사이트 DOM이 바뀌면 CSS/XPath selector가 깨지고, JavaScript 렌더링 페이지에서는 별도 브라우저 자동화 계층이 필요하다. 대규모 수집에서는 세션, 동시성, 프록시, 재시도 등을 별도로 조합해야 하며, AI Agent가 웹 전체 HTML을 읽으면 불필요한 토큰도 많이 소비한다.

Scrapling은 Adaptive Scraping, 목적별 Fetcher, Spider, MCP 및 Markdown 변환으로 이를 통합한다.

## 핵심 기능

### Adaptive Scraping
최초 선택 시 요소 정보를 저장하고 이후 구조가 바뀐 페이지에서 유사 요소를 재탐색할 수 있다. 반복 수집 사이트의 작은 DOM 변경에 대한 유지보수 부담을 줄이는 것이 핵심 차별점이다.

### Fetcher 계층
- `Fetcher` / `FetcherSession`: 빠른 HTTP 요청과 세션 기반 수집
- Dynamic 계열: JavaScript 렌더링이 필요한 페이지
- Stealthy 계열: 브라우저 기반 수집이 필요한 페이지
- Async API 및 세션 유지 지원

### Spider
Scrapy와 유사하게 `start_urls`, async `parse`, `Request`/`Response` 구조를 제공한다. 동시성, 도메인별 throttle, delay, 멀티 세션, 프록시 회전, pause/resume 등을 지원한다.

### XHR/API Capture
브라우저 로딩 중 발생하는 XHR/fetch 응답을 패턴으로 캡처할 수 있어 웹 앱의 데이터 응답을 수집하는 작업을 단순화한다.

### AI / MCP
`pip install "scrapling[ai]"`로 MCP 기능을 설치할 수 있다. v0.4.15에서 MCP는 one-shot 도구와 persistent session 도구로 재설계되었으며 HTTP 및 브라우저 세션 재사용을 지원한다. HTTP transport는 기본 localhost bind와 인증 토큰을 지원한다.

공식 Agent Skill도 제공하며 AI 대상 추출 시 불필요한 페이지 요소와 prompt-injection 위험을 줄이는 사용 방식을 안내한다.

### RAG-ready Markdown
v0.4.15의 `Response.markdown()`은 페이지를 LLM/RAG에 넣기 쉬운 Markdown으로 변환한다. script/style 등 불필요한 요소를 제거하고 main content 또는 CSS selector 범위만 변환할 수 있다. `SiteToMarkdownSpider`는 사이트를 페이지별 Markdown corpus로 만들 수 있다.

## 아키텍처

```text
URL / Crawl Job
      │
CLI / Python / MCP
      │
Fetcher / Session
 ┌────┼────────┐
HTTP Dynamic Browser
 └────┼────────┘
      ▼
Response / Parser
CSS / XPath / Search
 ┌────┴────────────┐
Adaptive DOM   Markdown/RAG
 relocation    targeted output
 └────┬────────────┘
      ▼
Claude / Codex / Agent

대규모 작업:
Spider → Concurrency/Session → Fetcher → Parser → Items/Stream
```

실제 패키지는 `core`, `engines`, `fetchers`, `integrations`, `spiders`, `parser.py`, `cli.py` 등으로 나뉜다.

## 장점

- HTTP scraping부터 브라우저 자동화, crawler까지 한 API 계열로 통합한다.
- Adaptive selector는 장기 운영 스크래퍼의 DOM 변경 유지보수 비용을 낮출 가능성이 크다.
- MCP와 targeted extraction으로 Agent에 필요한 콘텐츠만 전달해 토큰 효율을 높일 수 있다.
- Markdown/RAG 기능으로 웹 문서에서 Knowledge Base/RAG corpus를 만들기 쉽다.
- 세션, 비동기, crawl throttling 등 운영 기능 범위가 넓다.
- BSD-3-Clause라 내부 도구 및 상용 환경에 활용하기 비교적 편하다.

## 단점 및 한계

- 웹 수집은 대상 사이트 정책, robots.txt, 개인정보 및 저작권 정책을 검토해야 한다.
- 브라우저 계층은 단순 HTTP 요청보다 CPU, 메모리, 실행 시간이 크다.
- Fetcher 확장 기능은 별도 브라우저 의존성 설치가 필요해 배포가 무거워질 수 있다.
- Adaptive matching은 사이트가 크게 개편되면 오탐 또는 실패 가능성을 고려해야 한다.
- MCP/AI 기능은 빠르게 변경 중이며 v0.4.15에도 breaking change가 있어 버전 고정과 회귀 테스트가 필요하다.
- Enterprise에서는 외부 사이트 수집, proxy, 수집 데이터 정책을 별도 통제해야 한다.

## 활용 사례

### AI Agent의 웹 조사 도구
Agent가 웹 페이지 전체를 직접 읽는 대신 Scrapling MCP에 필요한 URL/target을 전달하고 정제된 결과만 컨텍스트로 받는 구조가 가능하다.

```text
Agent → MCP → Scrapling → Website
  ▲                         │
  └──── Targeted Markdown ──┘
```

### Wiki / RAG 자료 수집
공식 문서 사이트를 `SiteToMarkdownSpider`로 수집하여 Markdown corpus를 만든 뒤 Knowledge Base나 embedding pipeline에 반영할 수 있다.

### 정기 데이터 수집
공개 통계, 기술 문서, Release 정보처럼 구조가 조금씩 변하는 사이트의 장기 수집에 Adaptive selector를 활용할 수 있다.

## 기존 도구와 비교

| 도구 | 강점 | Scrapling과의 차이 |
|---|---|---|
| BeautifulSoup | 단순 HTML parsing | Scrapling은 fetch/browser/adaptive/crawl 포함 |
| Playwright | 실제 브라우저 자동화 | Scrapling은 scraping 중심 parser와 Spider를 상위 계층으로 제공 |
| Scrapy | 성숙한 대규모 crawler | Scrapling은 브라우저/adaptive/AI 통합을 강조 |
| Firecrawl 계열 | AI/RAG용 웹→Markdown | Scrapling은 로컬 Python 프레임워크로 직접 제어하기 쉬움 |

Scrapling은 대략 Scrapy + 브라우저 계층 + resilient parser + AI-facing MCP를 하나의 개발 경험으로 묶는 방향에 가깝다.

## 활용 아이디어

### 바로 적용 가능
AI Wiki 조사 파이프라인의 웹 수집기로 가치가 높다. `Response.markdown(main_content_only=True)` 또는 selector 기반 추출은 HTML 전체를 Agent에게 전달하는 것보다 컨텍스트 낭비를 줄이는 데 유리하다.

### PoC 가치 있음
사내 AI Harness에 `WebResearchWorker`를 두고 Scrapling MCP를 전담 도구로 붙이는 구성을 검토할 만하다.

```text
Orchestrator
    │
WebResearchWorker
    │ MCP
Scrapling
    │
Targeted Markdown
    │
Analysis Agent
```

PoC에서는 동일 URL 집합을 대상으로 기존 웹 수집 방식 대비 Agent 입력 token, 성공률, 페이지당 latency, JS 페이지 수집 성공률, selector 변경 후 Adaptive 복구율, 메모리/CPU를 측정하면 된다.

### 아이디어 참고
Adaptive selector의 개념은 사내 UI automation이나 테스트 Harness에도 참고할 만하다. 고정 selector 대신 대상 요소의 특징을 저장해 변경 후 재탐색하는 방식은 유지보수 비용을 낮추는 일반 패턴으로 확장 가능하다.

## 결론

**평가: PoC 가치 높음. 특히 AI Agent용 Web Research / RAG ingestion 계층으로 주목할 만하다.**

Scrapling의 핵심 가치는 빠른 Python scraper 자체보다 변경에 견디는 추출, 브라우저, crawler, AI용 정제 출력/MCP를 통합했다는 점이다. AI Harness 관점에서는 전문적인 Web Acquisition Layer로 볼 수 있다.

## 참고 자료

- https://github.com/D4Vinci/Scrapling
- https://scrapling.readthedocs.io/en/latest/
- https://github.com/D4Vinci/Scrapling/releases/tag/v0.4.15
- https://github.com/D4Vinci/Scrapling/blob/main/agent-skill/Scrapling-Skill/SKILL.md
