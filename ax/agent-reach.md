# Agent Reach

> **Tags:** `AI Agent` `AX` `Internet Access` `CLI` `MCP` `Web Research` `Agent Tooling`

## 한줄 요약

**Agent Reach는 AI Agent가 Twitter/X, Reddit, YouTube, GitHub, 웹, RSS, Bilibili, Xiaohongshu 등 다양한 인터넷 채널을 안정적으로 읽고 검색할 수 있도록, 플랫폼별 최적 도구의 선택·설치·설정·상태 진단·fallback 라우팅을 표준화하는 capability layer다.**

## 프로젝트 개요

Agent Reach는 인터넷 데이터를 직접 읽는 새로운 크롤러나 MCP 서버라기보다, 여러 기존 CLI/MCP/리더 도구를 AI Agent가 사용할 수 있게 준비해 주는 상위 계층이다.

핵심 철학은 **"wrapper가 아니라 capability layer"**다. 설치 이후 실제 읽기/검색 작업은 Agent Reach를 거치지 않고 `twitter-cli`, `rdt-cli`, `yt-dlp`, `bili-cli`, `gh`, `mcporter`, Jina Reader 등 업스트림 도구를 Agent가 직접 호출한다.

- Repository: https://github.com/Panniantong/Agent-Reach
- License: MIT
- Python 패키지/CLI 기반
- Claude Code, Cursor, Windsurf, OpenClaw 등 명령줄 실행이 가능한 Agent 환경을 주요 대상으로 함

## 해결하려는 문제

AI Agent에 인터넷 조사 능력을 붙일 때 플랫폼마다 접근 방식이 다르다.

- Twitter/X: API 비용 및 인증
- Reddit: 익명 접근 차단과 로그인 문제
- YouTube/Bilibili: 검색·자막·플랫폼별 차단 문제
- GitHub: `gh` 인증과 private repository 접근
- Xiaohongshu/Instagram/Facebook: 로그인 세션 및 Cookie 관리
- RSS/Web: 파싱 및 콘텐츠 정제

결국 Agent마다 동일한 도구 조사, 설치, 인증, 장애 대응을 반복하게 된다. Agent Reach는 이 작업을 중앙화하여 **"현재 가장 안정적인 접속 방법을 선택하고 설치한 뒤 정상 동작 여부까지 검사"**하는 문제를 해결한다.

## 핵심 기능

### 1. 플랫폼별 인터넷 capability 설치

웹, YouTube, RSS, GitHub, Twitter/X, Reddit, Bilibili, Xiaohongshu, LinkedIn 등 여러 채널에 필요한 업스트림 도구를 설치·설정한다.

### 2. Primary + Fallback backend

각 채널을 하나의 구현에 고정하지 않고 우선순위가 있는 backend 목록으로 관리한다.

```text
Channel
  ├─ Primary backend
  ├─ Fallback backend #1
  └─ Fallback backend #2
```

플랫폼 정책이나 upstream 프로젝트 변화로 기존 접근법이 막혀도 backend 우선순위를 바꾸는 방식으로 대응할 수 있다.

### 3. `agent-reach doctor`

설치된 채널과 backend의 상태를 검사하여 어떤 채널이 사용 가능하고 무엇을 추가 설정해야 하는지 확인한다.

### 4. Agent 친화적 설치

사용자가 설치 문서를 Agent에게 전달하면 Agent가 필요한 의존성과 설정을 준비하도록 설계되어 있다.

### 5. 인증/Cookie 로컬 관리

로그인이 필요한 플랫폼은 브라우저 로그인 상태나 Cookie 기반 접근을 활용하며 프로젝트는 Cookie가 로컬에 유지되는 방식을 지향한다.

## 아키텍처

```text
User Request
     │
     ▼
AI Agent (Claude Code / Cursor / OpenClaw / etc.)
     │
     ├──── Agent Reach ──────────────────────┐
     │      │                                │
     │      ├─ Installer                     │
     │      ├─ Config                        │ Capability Layer
     │      ├─ Doctor / Health Check         │
     │      └─ Channel Backend Selection     │
     │                                       │
     └───────────────────────────────────────┘
     │
     ▼
Upstream Tools
 ├─ twitter-cli
 ├─ rdt-cli / OpenCLI
 ├─ yt-dlp
 ├─ bili-cli
 ├─ gh CLI
 ├─ mcporter + MCP servers
 ├─ Jina Reader
 └─ RSS/parser tools
     │
     ▼
External Platforms
```

중요한 점은 **실제 데이터 요청 경로에 Agent Reach가 항상 끼어 있지 않다는 것**이다. Agent Reach는 환경을 구성하고 검사하며, 실행 시 Agent는 업스트림 도구를 직접 호출한다. 따라서 불필요한 wrapper latency와 새로운 API abstraction을 줄인다.

## 장점

1. **Agent 환경 구축 비용 감소** — 플랫폼별 도구 조사와 설치 과정을 반복하지 않아도 된다.
2. **Fallback 구조** — 특정 CLI나 접근법이 막혀도 대체 backend로 교체하기 쉽다.
3. **낮은 런타임 결합도** — 데이터 호출을 별도 proxy/wrapper에 강제하지 않는다.
4. **Agent 독립적** — 특정 LLM이나 Agent Framework에 종속되지 않는다.
5. **진단 가능성** — `doctor` 명령으로 인터넷 capability 상태를 빠르게 확인할 수 있다.
6. **무료/오픈소스 중심** — 유료 공식 API 의존도를 낮추려는 방향성이 강하다.
7. **채널 추가/교체가 쉬운 구조** — 플랫폼과 backend 매핑을 변경하는 방식으로 확장할 수 있다.

## 단점

1. **업스트림 의존성이 크다** — Agent Reach 자체가 안정적이어도 twitter-cli, yt-dlp 등의 변화로 기능이 깨질 수 있다.
2. **플랫폼 ToS/차단 정책 영향** — 비공식 접근 방식은 언제든 제한될 수 있다.
3. **인증 방식이 플랫폼마다 다름** — 완전한 zero-config는 아니며 Reddit/Xiaohongshu 등은 로그인이나 Cookie 설정이 필요할 수 있다.
4. **보안 검토 필요** — 여러 CLI/MCP와 브라우저 Cookie를 다루므로 기업 환경에서는 공급망·credential 관리 정책 검토가 필요하다.
5. **정형화된 단일 API가 목적이 아님** — Agent가 각 upstream 도구의 사용법을 알아야 하므로 애플리케이션 코드에서 통일된 SDK를 원하는 경우에는 덜 적합하다.
6. **웹 서비스형 안정성 보장은 어려움** — 개인/로컬 Agent에는 매력적이지만 SLA가 필요한 엔터프라이즈 데이터 파이프라인과는 성격이 다르다.

## 기존 도구와 비교

| 도구/방식 | 중심 역할 | Agent Reach와의 차이 |
|---|---|---|
| MCP Server | 특정 서비스/API를 표준 Tool로 노출 | Agent Reach는 여러 MCP/CLI를 선택·설치·관리하는 상위 capability layer |
| Firecrawl/Crawl4AI | 웹사이트 crawling/extraction | Agent Reach는 웹뿐 아니라 SNS·영상·GitHub·RSS 등 채널 전체를 다룸 |
| Jina Reader | URL → LLM 친화적 텍스트 | Agent Reach에서 Web backend로 활용 가능한 하위 도구 |
| Browser Automation | 실제 브라우저 UI 조작 | Agent Reach는 가능하면 더 가벼운 CLI/API/Reader 경로를 우선 활용 |
| 직접 CLI 구성 | 플랫폼별 도구를 사용자가 직접 설치 | Agent Reach가 도구 선정·설치·진단·fallback 관리를 표준화 |

즉, Agent Reach의 경쟁 대상은 개별 MCP 서버라기보다 **"Agent 인터넷 접근 환경을 사람이 직접 조립하고 유지보수하는 방식"**에 가깝다.

## 활용 사례

### AI Research Agent

Twitter/X + Reddit + YouTube + GitHub + Web을 동시에 조사하는 리서치 Agent의 기본 인터넷 계층으로 사용할 수 있다.

### 기술 조사 Agent

GitHub repository, Issue, Reddit 사례, YouTube 발표 영상을 하나의 조사 workflow에서 교차 검증할 수 있다.

### 개인 AI Assistant

로컬 PC의 로그인 세션을 이용하여 사용자가 접근 가능한 플랫폼의 정보를 Agent가 조사하도록 구성할 수 있다.

### Agent 개발 환경 bootstrap

새로운 Claude Code/Cursor/OpenClaw 환경을 만들 때 Agent Reach를 bootstrap 단계에 포함시켜 인터넷 조사 capability를 일관되게 설치할 수 있다.

## 활용 아이디어

### 1. 공통 `internet-research` Skill의 하위 인프라

Agent에게 사이트별 명령을 직접 지시하기보다 상위 Skill을 만든다.

```text
/internet-research <topic>
       ↓
Source Planner
       ↓
Agent Reach doctor
       ↓
GitHub / Reddit / X / YouTube / Web
       ↓
Cross Validation
       ↓
Research Report
```

### 2. Agent 시작 전 Capability Health Check

Agent session bootstrap 시 `agent-reach doctor`를 실행하고 결과를 context에 주입한다.

```text
Session Start
 → agent-reach doctor
 → 사용 가능한 채널 목록 생성
 → Research Agent에게 전달
 → 사용 가능한 source만으로 조사 계획 수립
```

이렇게 하면 Agent가 사용할 수 없는 도구를 반복 호출하는 문제를 줄일 수 있다.

### 3. AX 표준 인터넷 Capability Layer

여러 Agent마다 별도의 웹 조사 설정을 관리하지 않고 Agent Reach를 공통 기반으로 두고, 각 Agent에는 역할별 Skill만 제공하는 구조가 적합하다.

```text
Agent A ─┐
Agent B ─┼─ Skills ─ Agent Reach ─ Internet Tools
Agent C ─┘
```

### 4. Backend 장애 자동 복구

`doctor` 결과를 주기적으로 검사하여 특정 channel이 실패하면 fallback backend 활성화 또는 설치 복구를 수행하는 self-healing workflow로 확장할 수 있다.

### 5. 조사 결과의 Source Quality Layer 추가

Agent Reach는 "접근" 문제를 해결하므로 그 위에 출처 신뢰도, 최신성, 중복 제거, 교차 검증을 담당하는 별도 Research Quality Layer를 붙이면 실무형 조사 시스템으로 발전시킬 수 있다.

## 참고 링크

- GitHub: https://github.com/Panniantong/Agent-Reach
- Korean README: https://github.com/Panniantong/Agent-Reach/blob/main/docs/README_ko.md
- Releases: https://github.com/Panniantong/Agent-Reach/releases
