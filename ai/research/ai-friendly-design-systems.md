---
title: AI 시대의 오픈 디자인 시스템 비교
category: research
tags:
  - ai
  - design-system
  - frontend
  - agent
  - ui-ux
source: https://www.instagram.com/p/DcqeWKFmg-3/
updated: 2026-08-31
---

# AI 시대의 오픈 디자인 시스템 비교

> AI 코딩 에이전트에게 디자인 시스템의 토큰·컴포넌트·문서·도구를 직접 제공하면, 매번 UI를 새로 추측하게 하는 것보다 일관성과 구현 품질을 크게 높일 수 있다. 이 관점에서는 Meta Astryx와 당근 SEED용 AI Skill이 특히 주목할 만하다.

## 조사 배경

Instagram 게시물에서 당근 SEED, Meta Astryx, Microsoft Fluent 2, Adobe Spectrum, Pinterest Gestalt, Toss Design System, Wanted Montage 등을 AI 기반 UI 개발에 활용할 수 있는 디자인 시스템으로 소개했다. 공식 자료와 공개 저장소를 기준으로 실제 AI/Agent 친화성, 코드 제공 범위, 실무 적용성을 다시 확인했다.

## 핵심 결론

디자인 시스템을 AI에 활용하는 방식은 크게 세 단계로 볼 수 있다.

1. **문서 참조형**: Fluent 2, Gestalt, Montage처럼 공개 문서와 컴포넌트를 AI가 참고한다.
2. **AI용 컨텍스트 제공형**: SEED의 공개 자료를 Claude Code Skill 형태로 재가공하거나, React Spectrum처럼 AI-friendly Markdown/MCP를 제공한다.
3. **Agent-native형**: Astryx처럼 CLI/JSON API/MCP와 문서 구조를 처음부터 사람과 Agent가 함께 소비하도록 설계한다.

AI 코딩 워크플로우 관점에서는 3단계가 가장 흥미롭다. 디자인 시스템이 단순 UI 라이브러리가 아니라 **Agent가 UI를 생성할 때 사용하는 구조화된 지식·제약 계층**이 된다.

## Meta Astryx

Meta가 2026년 공개한 React 19+ / StyleX 기반 오픈소스 디자인 시스템이다. MIT 라이선스이며 Beta 상태다. Meta 내부에서 약 8년간 발전한 시스템을 오픈소스 스택으로 재구축했으며 공식 자료 기준 13,000개 이상의 앱에서 계보가 사용됐다.

### 핵심 기능

- 170개 이상 접근성 대응 React 컴포넌트(2026-08 기준 사이트 표기)
- 브랜드 단위 Theme 및 Dark Mode
- Production-ready Template
- CLI
- Agent-ready Documentation
- CLI의 typed JSON API 및 programmatic API
- MCP를 통한 Agent 연동
- Codemod 기반 업그레이드 지원

### AI 관점의 구조

```text
AI Coding Agent
      |
      +-- MCP / CLI / JSON API
      |       |
      |       +-- Component Docs
      |       +-- Design Tokens
      |       +-- Templates
      |       +-- Theme Generator
      |       +-- Migration / Codemod
      |
      v
 Astryx React Components
      |
      +-- StyleX / CSS
      +-- Accessibility
      +-- Theme
      |
      v
 Application UI
```

핵심은 사람이 보는 문서와 Agent가 사용하는 정보를 별도 체계로 관리하지 않는다는 점이다. Astryx는 API, convention, docs, CLI를 함께 설계하고 사람과 AI가 동일한 reference를 사용하도록 한다.

### 실무 평가

**PoC 가치 매우 높음.** AI가 임의의 HTML/CSS를 생성하는 대신 `Agent → Design System API → 검증된 Component` 경로를 만들 수 있다. 특히 사내 웹 관리도구, Dashboard, Agent UI처럼 디자인 인력이 항상 붙기 어려운 환경에 적합하다.

단, React + StyleX 중심이고 현재 Beta이므로 WPF/네이티브 앱에 직접 적용하는 용도와는 맞지 않는다.

## 당근 SEED + daangn-seed-ai

SEED는 당근의 디자인 시스템이다. 게시물은 AI가 공식 SEED 문서를 조회하고 Skill로 규칙적인 코드를 작성할 수 있다고 소개한다.

조사 결과 AI 활용 측면에서 특히 눈에 띄는 공개 프로젝트는 `byunghun-ben/daangn-seed-ai`다. 이는 당근 공식 프로젝트가 아니라 SEED를 AI-first snapshot으로 가공한 Claude Code Plugin/Skill이다.

### 특징

- SEED의 Token과 Component 지식 제공
- Decision Matrix
- Anti-pattern
- Claude Code Plugin/Skill 형태
- AI가 흔히 생성하는 획일적인 UI(AI-slop)를 줄이는 것을 목표로 함

### 의미

이 방식은 기존 디자인 시스템을 바꾸지 않고도 다음과 같이 Agent-friendly layer를 추가할 수 있다는 좋은 사례다.

```text
Existing Design System
        |
        v
AI Knowledge Snapshot
(tokens / components / rules / anti-patterns)
        |
        v
Claude Code Skill
        |
        v
UI Generation
```

사내 디자인 시스템을 AI에 연결할 때 가장 현실적으로 복제하기 쉬운 패턴이다.

## Adobe Spectrum / React Spectrum

Adobe Spectrum은 Adobe 제품군의 디자인 시스템이며 React Spectrum은 React 구현체다. React Aria와 React Stately를 통해 접근성, interaction, state를 분리한다.

Spectrum 2 stable 릴리스에서는 AI-friendly page Markdown과 MCP server가 공식적으로 언급됐다. 따라서 단순 공개 디자인 시스템보다 AI 코딩 Agent와의 연결성이 높은 편이다.

장점은 접근성·국제화·키보드/터치 interaction에 대한 오랜 투자가 이미 라이브러리에 포함되어 있다는 점이다.

## Microsoft Fluent 2

Microsoft 365, Teams, Outlook 등 Microsoft 경험을 위한 크로스플랫폼 디자인 시스템이다.

- React
- Web Components
- iOS
- Android
- Windows
- Figma UI Kit
- Design Token
- Copilot UI Kit

특히 Windows/Enterprise 애플리케이션이나 Microsoft 스타일 UI를 만들 때 참고 가치가 높다. Figma asset과 code library의 property mapping도 명시되어 있어 Design-to-Code에 유리하다.

다만 Astryx처럼 Agent API 자체가 핵심인 시스템이라기보다는 방대한 공식 디자인/개발 문서를 AI가 잘 활용할 수 있는 유형에 가깝다.

## Pinterest Gestalt

Pinterest가 실제 제품에서 사용하는 React 디자인 시스템이다.

- React Component Library
- Design guideline / best practice
- TypeScript 지원
- `gestalt`, `gestalt-charts`, `gestalt-datepicker`
- Breaking change에 대한 Codemod 제공

Codemod까지 공개되어 있다는 점은 Agent가 UI 코드 migration을 수행할 때 유용하다. 다만 Pinterest 팀은 외부 사용자를 위한 지원 리소스는 제한적이라고 명시한다.

## Wanted Montage

Wanted의 제품 경험을 위한 디자인 시스템으로 코드, 리소스, UX guideline과 Figma UI Kit를 공개한다. 공개 Web 저장소도 존재한다.

국내 서비스 스타일의 실전 디자인 시스템을 분석하거나 한국어 기반 UI를 만들 때 참고 가치가 있다. AI-native 기능 자체보다는 공개된 Design Language + Component를 AI 컨텍스트로 활용하는 방식이 적합하다.

## Toss Design System

게시물에서는 버튼·스위치·배지 등의 패키지와 색상/글자 스타일을 코드 패키지로 제공하며 앱인토스 미니앱 개발에서 활용할 수 있다고 소개한다.

이번 조사에서는 게시물의 구체적 라이선스/AI 연동 설명 전체를 공식 자료로 충분히 교차검증하지 못했으므로, AI Agent 통합 수준에 대해서는 별도 검증이 필요하다.

## 비교

| 시스템 | 주 플랫폼 | AI/Agent 연동 | 강점 | 평가 |
|---|---|---|---|---|
| Meta Astryx | React/StyleX | CLI, JSON API, MCP, Agent-ready docs | AI-native 구조, 170+ 컴포넌트, 테마 | **PoC 최우선** |
| SEED + daangn-seed-ai | Web / Claude Code | Skill/Plugin | 기존 DS를 AI Skill로 변환하는 좋은 사례 | **아이디어 최우선** |
| Adobe Spectrum 2 | React | AI-friendly Markdown, MCP | 접근성/국제화/행동 계층 | **PoC 가치 높음** |
| Fluent 2 | Web/iOS/Android/Windows | 문서/코드 기반 | Enterprise, Cross-platform, Copilot UI | **바로 참고 가능** |
| Gestalt | React | 문서/코드/Codemod | 실서비스 검증, migration | 참고 가치 높음 |
| Wanted Montage | Web/Figma | 문서/코드 기반 | 국내 서비스 사례 | 참고 가치 높음 |
| Toss DS | 앱인토스 중심 | 추가 검증 필요 | 국내 모바일 UI | 제한적 적용 |

## AI Workflow에 적용하는 방법

가장 중요한 아이디어는 특정 디자인 시스템을 그대로 채택하는 것보다 **사내 디자인 시스템을 Agent-readable하게 만드는 것**이다.

```text
Figma / Existing Design System
          |
          v
Design System Knowledge Layer
- tokens
- component catalog
- usage rules
- examples
- anti-patterns
- accessibility rules
          |
     +----+----+
     |         |
   Skill      MCP
     |         |
     +----+----+
          |
          v
 Claude Code / Codex / Agent
          |
          v
      UI Code
          |
          v
 Visual / UX Review
```

### 바로 적용 가능

- 공개 디자인 시스템 문서를 Claude Code/Codex의 reference로 제공
- UI 생성 규칙에 Design Token 사용을 강제
- 임의 HTML/CSS 대신 허용된 Component Catalog를 우선 사용
- UI Review 단계에서 디자인 시스템 위반을 검사

### PoC 가치 있음

**`Design System Skill` 제작**이 가장 현실적이다.

Skill에는 다음을 포함한다.

- Component 선택 Decision Matrix
- Token 목록과 의미
- Layout / spacing 규칙
- Good/Bad examples
- Anti-pattern
- Accessibility 규칙
- 실제 사내 화면 예시
- Component API 사용법

SEED + daangn-seed-ai 패턴을 사내 UI 환경에 복제하는 방식이다.

### 발전형

Astryx처럼 Design System MCP를 만들어 Agent가 필요할 때만 다음 정보를 조회하게 할 수 있다.

- `search_components(query)`
- `get_component(name)`
- `get_tokens(category)`
- `get_pattern(use_case)`
- `get_example(component)`
- `validate_ui(code)`

이 구조는 전체 디자인 문서를 매번 Context에 넣지 않아도 되므로 토큰 효율도 좋다.

## 장점

- AI 생성 UI의 일관성 향상
- 흔한 generic AI UI 감소
- 디자이너가 없는 내부 도구의 품질 향상
- Accessibility 규칙 재사용
- Design-to-Code 간극 감소
- Agent가 Component를 재발명하는 문제 감소
- Review 기준 자동화 가능

## 단점 및 한계

- 디자인 시스템 자체가 부실하면 AI 결과도 개선되지 않는다.
- 문서와 실제 Component API가 동기화되지 않으면 Agent가 잘못된 코드를 생성한다.
- 방대한 문서를 프롬프트에 직접 넣으면 Context/Token 비용이 증가한다.
- MCP/Skill을 추가하면 유지보수 대상이 하나 더 생긴다.
- Web 중심 시스템은 WPF/UE 등 다른 UI Stack에 직접 재사용하기 어렵다.
- Astryx는 아직 Beta다.
- 브랜드 디자인 시스템을 그대로 사용하면 결과물이 해당 브랜드와 지나치게 비슷해질 수 있으므로 Theme/Token 추상화가 중요하다.

## 결론

이 자료의 핵심은 '예쁜 UI 라이브러리 목록'이 아니다. **AI 코딩 시대에는 디자인 시스템이 Agent의 UI 생성 정책이 될 수 있다**는 점이다.

실무 적용 우선순위는 다음과 같다.

1. **Astryx 구조 분석 및 PoC** — Agent-native Design System의 현재 좋은 참고 사례
2. **SEED → Claude Skill 패턴 복제** — 기존 사내 디자인 시스템을 Skill로 변환
3. **Design System MCP PoC** — 컴포넌트/토큰/예제의 on-demand retrieval
4. **UI Review Agent 추가** — 생성 결과가 Design System 규칙을 지키는지 검증

특히 사내 개발 생산성 환경에서는 'AI에게 UI를 잘 그리라고 프롬프트하는 것'보다 **Design System Skill + MCP + Visual Review**의 3단계 구조가 재현성과 유지보수 측면에서 더 강력하다.

## 참고 자료

- Meta Astryx: https://astryx.atmeta.com/
- Astryx GitHub: https://github.com/facebook/astryx
- Astryx CLI: https://astryx.atmeta.com/docs/cli
- daangn-seed-ai: https://github.com/byunghun-ben/daangn-seed-ai
- Adobe Spectrum: https://spectrum.adobe.com/
- React Spectrum: https://react-spectrum.adobe.com/
- Microsoft Fluent 2: https://fluent2.microsoft.design/
- Pinterest Gestalt: https://github.com/pinterest/gestalt
- Wanted Montage: https://montage.wanted.co.kr/
