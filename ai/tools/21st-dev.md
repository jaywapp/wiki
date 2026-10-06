---
title: 21st.dev
category: tools
tags:
  - ai
  - ui
  - frontend
  - shadcn
  - mcp
  - claude-code
  - codex
  - agent
source: https://21st.dev/
updated: 2026-10-07
---

# 21st.dev

> shadcn 호환 UI를 사람이 탐색하는 마켓플레이스에서 더 나아가, Coding Agent가 검증된 컴포넌트를 검색·가져오기·생성하도록 연결하는 UI Registry + MCP/CLI 플랫폼.

## 프로젝트 개요

21st.dev는 React/Tailwind 및 shadcn 생태계의 커뮤니티 UI 컴포넌트, 테마, 템플릿을 탐색하고 프로젝트에 가져올 수 있는 플랫폼이다.

AI/AX 관점에서 중요한 부분은 단순 컴포넌트 갤러리가 아니라 동일 카탈로그를 **21st MCP와 CLI를 통해 Claude Code, Codex, Cursor, VS Code, Windsurf 같은 Coding Agent에 노출**한다는 점이다.

공식 GitHub 조직은 21st.dev를 "npm for design engineers"에 비유하며, Magic MCP는 2026년에 통합 21st MCP로 전환되었다. 과거 `@21st-dev/magic` 패키지는 신규 MCP가 아니라 기존 설정 호환을 위한 proxy로 유지된다.

## 해결하려는 문제

AI Coding Agent에게 "멋진 Hero를 만들어줘", "Dashboard를 만들어줘"라고만 요청하면 Agent는 학습 데이터와 현재 Context를 바탕으로 UI를 새로 발명한다.

이 방식은 빠르지만 다음 문제가 있다.

- 결과가 generic한 AI UI 패턴으로 수렴하기 쉽다.
- 이미 검증된 컴포넌트가 있어도 Agent가 중복 구현한다.
- 좋은 레퍼런스를 찾기 위해 개발자가 브라우저와 IDE를 오간다.
- 디자인 취향을 프롬프트만으로 반복 전달해야 한다.
- 팀 내부 컴포넌트가 있어도 Agent가 존재를 모르면 사용하지 않는다.

21st.dev의 핵심 접근은 **Agent에게 UI를 무조건 생성시키기 전에 실제 카탈로그를 검색하게 하는 것**이다.

## 핵심 기능

### UI Marketplace

공식 사이트는 2026년 10월 기준 12,000개 이상의 컴포넌트·테마·템플릿을 제공한다고 설명한다.

Hero, Pricing, Navigation, Dashboard, Form뿐 아니라 AI Chat, Shader, Gradient, ASCII Art 등으로 범위가 확장되어 있다.

각 컴포넌트는 Preview, Code, dependency, source/license 등의 정보를 확인할 수 있다.

### shadcn 호환 Source Install

21st의 주요 컴포넌트는 패키지를 runtime dependency로 추가하는 모델보다 shadcn CLI와 호환되는 source install 방식을 사용한다.

즉 설치 후 코드는 프로젝트 안에 존재하며 개발자와 Agent가 읽고 수정할 수 있다.

### 21st MCP

기존 Magic MCP는 현재 **21st MCP**로 통합되었다.

권장 설치:

```bash
npx @21st-dev/cli@latest init --client claude
npx @21st-dev/cli@latest init --client codex
```

원격 MCP endpoint는 `https://21st.dev/api/mcp`이며 API key 인증을 사용한다.

현재 공개 자료에서 확인되는 주요 기능은 다음과 같다.

- `search`: 컴포넌트 검색
- `get_component`: prompt/code를 Agent Context로 가져오기
- `get_inspiration`: UI inspiration 검색
- `generate`: AI UI 생성(계정의 AI 기능 활성화 필요)
- `search_logo`: SVG/logo 검색

실제 tool 목록은 계정 capability에 따라 달라질 수 있다.

### 21st CLI

터미널에서도 컴포넌트 검색, 설치, publish, 생성 workflow를 사용할 수 있다.

### 21st AI

웹 또는 Agent에서 UI를 AI로 생성할 수 있다. 한 prompt에서 여러 variant를 만들고 비교한 뒤 선택하고, 선택한 결과를 chat으로 refine하는 흐름을 제공한다.

### Component Libraries / Team Registry

자체 component library를 publish하고 public, unlisted, private 범위로 관리할 수 있다.

Agent rule에 팀 library를 우선 검색하도록 지정하면 이미 존재하는 조직 컴포넌트를 새로 생성하는 문제를 줄일 수 있다.

## 아키텍처

```text
                   ┌─────────────────────────┐
                   │ Developer / Designer    │
                   └────────────┬────────────┘
                                │
                Browse / Publish│
                                ▼
                    ┌──────────────────────┐
                    │      21st.dev        │
                    │ Marketplace/Registry │
                    │ Components/Themes    │
                    │ Templates/Prompts    │
                    └───────┬──────┬───────┘
                            │      │
                   21st CLI │      │ 21st MCP
                            │      │
              ┌─────────────▼┐    ┌▼────────────────────┐
              │ Terminal     │    │ Coding Agent         │
              │ install      │    │ Claude/Codex/Cursor  │
              └──────┬───────┘    └──────────┬───────────┘
                     │                       │
                     └───────────┬───────────┘
                                 ▼
                       shadcn-compatible
                         source files
                                 │
                                 ▼
                       Project Source Tree
                                 │
                          inspect / modify
                                 ▼
                         Developer + Agent
```

핵심은 **검색/선택과 코드 생성을 분리**하는 데 있다.

```text
기존 Agent
Prompt → Agent가 UI를 발명 → 코드

21st 연결 Agent
Prompt → 실제 UI 검색 → Preview/Prompt/Code → 선택 → 설치/수정
                                     └→ 필요할 때만 AI 생성
```

## shadcn/ui와의 관계

21st.dev와 shadcn/ui는 경쟁 제품으로 보는 것보다 계층이 다르다고 보는 편이 정확하다.

| 구분 | shadcn/ui | 21st.dev |
|---|---|---|
| 핵심 역할 | UI primitive/source distribution 기반 | UI marketplace + discovery + Agent access |
| 기본 자산 | 공식 component set/registry | 대규모 community component catalogue |
| 코드 전달 | shadcn CLI/Registry | shadcn 호환 install + 21st CLI/MCP |
| AI Agent | Registry/MCP 기반 활용 가능 | 검색·retrieval·generation을 직접 Agent에 제공 |
| 강점 | 일관된 foundation | 다양성, inspiration, 검색, Agent UX |
| 위험 | 기본 UI가 비슷해질 수 있음 | community 품질/의존성 편차 |

실무적으로는 **shadcn을 foundation으로 두고 21st를 discovery/extension layer로 사용하는 조합**이 자연스럽다.

## 장점

- Agent가 UI를 매번 처음부터 발명하지 않고 실제 컴포넌트 카탈로그를 검색할 수 있다.
- source code가 프로젝트에 들어오기 때문에 수정과 코드 리뷰가 쉽다.
- Claude Code와 Codex를 공식 CLI 초기화 대상으로 지원한다.
- Preview와 실제 코드를 함께 탐색할 수 있어 UI reference 전달 비용을 줄인다.
- Prompt 자체를 제공하는 컴포넌트는 다른 stack에서 재구현할 때도 reference로 활용할 수 있다.
- 팀 private component library를 Agent workflow에 연결할 수 있다.
- MCP를 이용하면 브라우저↔IDE context switching을 줄일 수 있다.

## 단점 및 한계

### Community 품질 편차

Marketplace 특성상 작성자마다 코드 품질, 접근성, dependency, responsive 처리 수준이 다를 수 있다. 설치 전 Preview뿐 아니라 source와 dependency 검토가 필요하다.

### 공급망/코드 검토 필요

Registry에서 가져오는 것은 결국 외부 source code다. Agent가 자동 설치하도록 만들수록 **설치 후 diff/review 단계**가 중요해진다.

### React/Tailwind/shadcn 중심

가장 큰 효율은 이 생태계에서 나온다. WPF, Unreal Slate 등 다른 UI stack에는 코드 자체보다 디자인 reference/prompt 활용 가치가 더 크다.

### 서비스 의존성

MCP 검색과 hosted AI는 21st.dev 원격 서비스/API key에 의존한다. 사내 폐쇄망이나 엄격한 Enterprise 환경에서는 적용 제약이 생길 수 있다.

### 비용

2026-10-07 공식 가격 기준:

- Free: browsing 가능, component copy/install 일일 제한 존재
- Builder: 연간 결제 기준 월 $6, unlimited marketplace/CLI/MCP install
- Builder + AI: 연간 결제 기준 월 $15부터, AI credit 포함
- Team: 연간 결제 기준 seat당 월 $7.50부터

가격과 credit 정책은 변경 가능성이 있으므로 도입 시 공식 pricing 재확인이 필요하다.

### AI generation은 별도 capability

MCP 연결 자체가 hosted AI generation 권한을 의미하지 않는다. Builder 계정은 검색/retrieval 중심으로 사용하고, hosted generation은 AI가 포함된 plan/capability가 필요하다.

## 활용 사례

### 1. Claude Code / Codex UI 구현

```text
사용자 요구
   ↓
UX/Design Skill
   ↓
21st MCP search
   ↓
후보 UI 3~5개
   ↓
사용자/Agent 선택
   ↓
source install
   ↓
현재 프로젝트 theme/token에 맞게 수정
   ↓
browser screenshot review
```

### 2. Agent의 AI Slop 감소

Agent rule을 다음 방향으로 구성할 수 있다.

```text
UI 구현 전:
1. 기존 local components 검색
2. 없으면 조직 Registry 검색
3. 없으면 21st MCP에서 적절한 component 검색
4. 적합한 후보가 없을 때만 새 UI 생성
5. 외부 component 설치 후 반드시 diff/dependency/accessibility 검토
```

이 패턴은 "Generate First"가 아니라 **Reuse/Search First** workflow다.

### 3. 팀 Design System

사내 공통 UI를 private library로 publish하고 Agent가 이를 우선 사용하게 한다.

```text
Company UI Library
      ↓ publish
21st Team Library
      ↓ MCP
Coding Agent
      ↓
Search existing first
      ↓
Project
```

## 활용 아이디어

### 바로 적용 가능

개인 React/Next.js 프로젝트에서 Claude Code 또는 Codex에 21st MCP를 연결하고 UI 구현 시 **기존 local component → 21st 검색 → 생성** 순서를 지침으로 넣는 것은 바로 적용할 가치가 있다.

특히 UI 디자인 세션에서 screenshot/reference를 수동 전달하는 횟수를 줄일 수 있다.

### PoC 가치 있음

현재 AI 개발 workflow에 다음 체인을 실험할 가치가 높다.

```text
UI/UX Skill
  → 21st MCP 후보 검색
  → Agent가 후보 설명
  → 선택
  → shadcn source install
  → 구현
  → Browser/Screenshot Review
```

평가 항목:

- UI 구현 소요시간
- 생성/수정 token 사용량
- 처음부터 생성했을 때 대비 재작업 횟수
- 디자인 품질
- 접근성 문제 수
- 외부 dependency 증가량

### 아이디어 참고

21st의 가장 중요한 아이디어는 특정 컴포넌트보다 **Agent에게 생성 능력만 주지 말고 curated retrieval layer를 제공한다**는 것이다.

이는 UI 외 영역에도 적용할 수 있다.

```text
Agent
 ├─ 먼저 검증된 asset/search
 ├─ 있으면 reuse/adapt
 └─ 없으면 generate
```

AI Harness 설계에서 "검색 → 재사용 → 생성" 우선순위는 token 절감과 품질 일관성을 동시에 노릴 수 있는 패턴이다.

## 결론

21st.dev의 가치는 "shadcn 컴포넌트가 많이 있는 사이트"보다 **AI Coding Agent용 UI retrieval layer**로 볼 때 더 크다.

shadcn/ui가 Open Code와 Registry라는 배포 기반을 제공한다면, 21st.dev는 그 위에 대규모 UI 카탈로그, discovery, prompt, MCP/CLI, AI generation을 결합한다.

개인 프로젝트에는 바로 적용할 가치가 높고, 조직 환경에서는 private component library + Agent rule 조합을 PoC할 가치가 있다. 다만 외부 Registry 코드를 자동 설치하는 workflow에는 dependency/diff/security review gate를 반드시 두는 편이 좋다.

## 참고 자료

- https://21st.dev/
- https://21st.dev/community/components
- https://21st.dev/mcp
- https://21st.dev/ai
- https://21st.dev/pricing
- https://github.com/21st-dev
- https://github.com/21st-dev/magic-mcp
