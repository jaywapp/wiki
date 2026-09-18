---
title: only-cli (oc)
category: tools
tags:
  - ai
  - agent
  - cli
  - web-browsing
  - token-optimization
  - claude-code
  - codex
source: https://github.com/only-cli/oc
updated: 2026-09-19
---

# only-cli (oc)

> 웹 페이지 전체 HTML을 LLM 컨텍스트에 넣는 대신, 페이지를 수백 토큰 규모의 번호 기반 텍스트 인터페이스로 압축해 AI Agent의 웹 탐색 토큰 비용을 줄이는 CLI.

## 프로젝트 개요

only-cli의 `oc`는 Claude Code, Codex, Cursor, Copilot 같은 shell-capable AI Agent가 웹을 읽을 때 사용하는 경량 브라우징 CLI다. 핵심은 브라우저 화면이나 raw HTML을 모델에게 그대로 전달하지 않고, 필요한 텍스트와 링크를 추출해 `[1]`, `[2]` 같은 번호가 붙은 compact view로 변환하는 것이다.

Node.js 20+ 환경에서 동작하며 전역 npm 설치, npx 무설치 실행, Agent Skill, Claude Code plugin 형태를 지원한다. 2026-09-19 조사 기준 최신 GitHub Release는 v0.5.4(2026-09-16)다.

## 해결하려는 문제

Coding Agent가 문서나 웹 페이지를 조사할 때 raw HTML, accessibility snapshot, 브라우저 screenshot 기반 도구는 실제 필요한 정보보다 훨씬 많은 컨텍스트를 모델에 주입할 수 있다.

oc는 이를 다음 구조로 바꾼다.

```text
URL
 ↓
HTTP Fetch
 ↓
HTML / Feed / JSON
 ↓
Distill + Render
 ↓
~500 token compact view
 ↓
Agent
 ├─ do <n>    링크 이동
 ├─ find      현재 페이지 검색
 ├─ read <n>  필요한 영역 확장
 └─ next      다음 구간
```

즉 처음부터 페이지 전체를 읽는 대신 **progressive disclosure** 방식으로 필요한 부분만 추가 조회한다.

## 핵심 기능

### Token-budgeted rendering

`oc open <url>`은 기본 약 500 token budget으로 페이지를 요약된 구조로 렌더링한다. 긴 페이지는 `find`, `read`, `next`를 이용해 필요한 부분만 후속 조회한다.

### Stateful navigation

마지막으로 연 페이지를 session state에 저장하므로 Agent는 URL을 다시 생성하지 않고 `oc do 3`처럼 번호만으로 링크를 따라갈 수 있다.

### 범용 웹 페이지 처리

mostly-static HTML뿐 아니라 XML/Atom/RSS feed와 JSON API도 처리한다. 별도 사이트 adapter 없이 generic renderer를 사용하고, 자주 쓰는 사이트에는 shortcut을 제공한다.

지원 shortcut에는 GitHub, Reddit, Hacker News, Stack Overflow, Wikipedia, X, LinkedIn, Yahoo Finance, YouTube, DuckDuckGo/Bing, AWS/GCP/Microsoft Learn, Python/MDN/Node/Rust/Go/Java/Ruby/PHP/TypeScript/cppreference 등이 있다.

### Browser fingerprint impersonation

요청 시 `impers`를 사용해 Chrome fingerprint를 우선 사용하고 실패하면 Firefox, 다시 실패하면 native fetch로 fallback한다. Reddit처럼 Firefox fingerprint가 더 잘 동작하는 사이트는 별도 전략을 사용한다.

### 인증 세션

v0.5부터 browser cookie를 주입해 로그인된 웹 페이지를 읽는 session 기능을 제공한다.

```text
Browser Cookie
   ↓
oc login --session work
   ↓
~/.only-cli session/cookie state
   ↓
oc open ... --session work
```

credential을 command-line argument로 직접 남기기보다 stdin을 이용하는 방식을 권장한다.

### Agent Skill / Claude Code Plugin

Agent Skill을 설치하거나 `CLAUDE.md` / `AGENTS.md`에 한 줄의 사용 규칙만 추가할 수 있다. Claude Code plugin도 제공한다.

## 구조 및 아키텍처

Repository의 `src/`에는 역할이 비교적 명확하게 분리되어 있다.

- `fetch.js`: HTTP fetch 및 browser impersonation 계층
- `distill.js`: HTML/응답에서 의미 있는 내용을 정제
- `render.js`: token budget 기반 compact representation 생성
- `act.js`: numbered action 처리
- `session.js`: 현재 페이지/session 상태
- `cookies.js`, `auth.js`: 인증 cookie/session
- `sites.js`: site shortcut 처리
- `apisearch.js`, `nodedocs.js`, `sphinx.js`, `rdoc.js`: 문서 검색 및 특정 documentation format 지원
- `cli.js`: CLI entry/control layer

```text
Agent
  │
  │ oc open / do / find / read
  ▼
CLI
  ├── Sites / shortcut resolver
  ├── Session + Cookie store
  │
  ▼
Fetch
  ├── Chrome impersonation
  ├── Firefox fallback
  └── Native fetch fallback
  │
  ▼
Distill
  ├── HTML
  ├── Feed/XML
  └── JSON
  │
  ▼
Budget-aware Renderer
  │
  ▼
Compact numbered text
  │
  └──────────────► Agent context
```

특히 `open` 이후 `find/read/next`는 저장된 페이지를 재사용하기 때문에 불필요한 network fetch도 줄인다.

## Benchmark

공식 프로젝트 benchmark는 매우 큰 token 감소를 보고한다. 다만 **프로젝트 자체가 수행한 benchmark이므로 독립 검증 결과로 보아서는 안 된다.**

2026년 9월 README에 공개된 15개 실제 페이지 비교에서:

| 방식 | 페이지 입력 토큰 |
|---|---:|
| oc open | 9,913 |
| Jina Reader | 145,679 |
| Playwright MCP accessibility snapshot | 535,908 |
| raw HTML fetch | 1,119,003 |

양쪽 모두 읽을 수 있었던 14개 페이지 기준 raw HTML 대비 약 118배 적은 입력량을 보고한다.

Claude Code task-level 실험에서도 Wikipedia 5건은 oc 5/5, WebFetch 5/5, WebSearch 5/5였고 fresh input은 각각 5,535 / 129,257 / 136,982 tokens로 보고되었다. 반면 Codex documentation lookup에서는 Codex 자체 search가 더 저렴했던 사례도 명시되어 있다.

따라서 핵심은 **항상 oc가 최적이라는 것이 아니라, 이미 URL을 알고 있고 실제 페이지 내용을 읽어야 하는 작업에서 강점이 크다**는 점이다.

## 장점

### 1. Token 절약 구조가 Agent workflow와 잘 맞음

전체 페이지 → 모델이 버릴 정보 제거 방식이 아니라, 애초에 모델에게 필요한 정보만 단계적으로 공급한다.

### 2. Skill 자체의 context 비용이 작음

복잡한 MCP schema나 browser tool definition을 매번 context에 넣는 방식보다 CLI command surface가 작다. Agent가 shell 실행이 가능한 환경이라면 통합 비용도 낮다.

### 3. Claude Code / Codex 공통 계층으로 사용 가능

특정 vendor API에 종속되지 않고 CLI이므로 여러 Coding Agent가 동일한 웹 접근 방식을 공유할 수 있다.

### 4. 세션 재사용

페이지를 한 번 가져온 뒤 `find/read/next`로 재사용하는 방식은 network 요청과 모델 입력 모두 줄이는 데 유리하다.

### 5. Windows 사용 가능

README에 PowerShell cookie login 예제가 있고 v0.5.4 release에서 Windows 관련 test fix가 포함됐다.

## 단점 및 한계

### JavaScript rendering 부재

현재 headless browser가 아니므로 client-side rendering에 전적으로 의존하는 SPA는 읽지 못할 수 있다. 프로젝트도 JS-only page 지원을 planned 상태로 명시한다.

### 쓰기/상호작용 미지원

`fill`, `submit`은 planned 상태다. 따라서 Playwright 기반 browser agent처럼 form 작성, 버튼 클릭, workflow automation을 수행하는 도구를 대체하지 않는다.

### Bot challenge 한계

browser fingerprint impersonation으로 단순 fetch보다 접근성이 좋아질 수 있지만 강한 CAPTCHA/anti-bot은 여전히 실패할 수 있다.

### 인증정보 관리

cookie 기반 authenticated session은 편리하지만 enterprise 환경에서는 credential 저장 위치(`~/.only-cli` 또는 `OC_HOME`)와 파일 접근 권한을 별도로 검토해야 한다.

### 자체 benchmark 편향 가능성

토큰 감소 수치는 인상적이지만 benchmark 설계와 페이지 선택은 프로젝트 작성자가 관리한다. 실제 회사 documentation, Perforce 관련 portal, 사내 인증 페이지를 대상으로 별도 PoC가 필요하다.

### 프로젝트 성숙도

2026년 8~9월에 빠르게 기능이 추가되는 초기 프로젝트다. API/CLI behavior 변경 가능성을 고려해 Agent Skill에서는 버전을 pin하는 편이 안전하다.

## 기존 도구와 비교

| 방식 | 강점 | 약점 | 적합한 작업 |
|---|---|---|---|
| oc | 매우 작은 context, CLI, progressive read | JS interaction 없음 | 문서/블로그/GitHub 조사 |
| WebFetch | Agent 내장, 단순 | 페이지 크기 영향 큼/사이트 차단 가능 | 단일 URL 간단 조회 |
| WebSearch | URL 탐색에 강함 | 실제 페이지 상세 읽기는 비효율 가능 | 자료 발견 |
| Playwright MCP | JS 렌더링/상호작용 | snapshot/tool context가 큼 | 웹 앱 자동화 |
| Jina Reader 계열 | URL→정제 text 단순화 | interactive navigation이 약함 | 페이지 전체 텍스트 추출 |

oc와 Playwright는 경쟁재라기보다 계층을 나누는 것이 합리적이다.

```text
Need web information?
        │
        ├─ URL discovery ──► Search
        │
        ├─ Static/read-only ──► oc
        │
        └─ JS / interaction ──► Playwright/Browser
```

## 활용 사례

- Claude Code가 GitHub issue, README, 공식 documentation을 조사할 때
- Codex가 Microsoft Learn / Python / Node / MDN 문서를 조회할 때
- Agent가 여러 URL을 순차적으로 조사하는 research workflow
- 긴 문서에서 특정 keyword만 찾아 읽는 작업
- Browser MCP를 호출하기 전에 cheap path로 정적 페이지를 우선 확인하는 routing layer

## 활용 아이디어

### 바로 적용 가능 — Claude 기반 Workspace의 기본 Web Read Layer

현재 Claude/Codex workspace에서는 가장 먼저 적용해볼 가치가 있다.

```text
Agent Web Request
      │
      ├─ Search 필요 → 기존 Search
      │
      └─ URL 확보
            │
            ▼
          only-cli
            │
       readable?
        ┌───┴───┐
       yes      no
        │        │
       use    Browser MCP
```

CLAUDE.md/AGENTS.md에는 긴 설명 대신 “URL 내용을 읽을 때 먼저 oc를 사용하고 JS 렌더링/interaction이 필요한 경우에만 browser tool로 fallback” 정도의 routing rule만 두는 것이 context 관점에서 좋다.

### PoC 가치 있음 — Token 측정 Harness와 결합

웹 조사 작업별로 다음을 측정하면 실제 도입 효과를 검증할 수 있다.

- 동일 URL raw/WebFetch/oc 입력 token
- 전체 작업 token
- tool call 횟수
- latency
- 성공률
- 최종 답변 정확도

특히 기존 작업별 token 측정 도구와 결합하면 “웹 조사 때문에 소비된 token”을 별도로 계측하기 좋다.

### PoC 가치 있음 — Enterprise 내부 문서

사내 Confluence/문서 portal 등 cookie 인증이 필요한 페이지에서 session 기능을 검증할 수 있다. 단 보안 정책상 cookie export가 허용되는지 먼저 확인해야 한다.

### 아이디어 참고 — Progressive Context 패턴

oc에서 가장 중요한 아이디어는 제품 자체보다 **500-token initial view → 필요한 영역만 추가 read**라는 구조다.

이 패턴은 웹뿐 아니라 코드베이스 virtualize, 주석 virtualize, symbol dictionary 같은 context virtualization에도 그대로 적용할 수 있다.

## 결론

only-cli는 “웹 브라우저를 Agent에게 제공한다”기보다 **웹 페이지를 Agent가 소비하기 좋은 작은 context interface로 virtualize하는 도구**에 가깝다.

특히 Claude Code/Codex가 문서·GitHub·기술 자료를 자주 조사하는 환경에서는 Browser MCP를 항상 호출하는 것보다 `oc → Browser fallback` 구조가 token/context 효율 측면에서 유망하다.

현재 가장 큰 제약은 JavaScript rendering과 form interaction 부재다. 따라서 browser automation 대체재가 아니라 **read-only web research의 cheap first layer**로 배치하는 것이 적절하다.

실무 분류: **바로 적용 가능 + 실제 token 절감률 PoC 권장**

## 참고 자료

- https://github.com/only-cli/oc
- https://only-cli.com/
- https://github.com/only-cli/oc/tree/main/skills/web-browsing-cli
- https://github.com/only-cli/oc/releases
