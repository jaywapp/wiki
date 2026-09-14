---
title: Google Stitch
category: tools
tags:
  - ai
  - ui-ux
  - design
  - agent
  - mcp
source: https://stitch.withgoogle.com/
updated: 2026-09-14
---

# Google Stitch

> 자연어·음성·이미지·기존 코드/디자인을 바탕으로 UI를 생성하고 반복 개선하며, 프로토타입과 코드 단계까지 연결하는 Google Labs의 AI-native 디자인 도구.

## 프로젝트 개요

Google Stitch는 UI 초안을 생성하는 단순한 text-to-UI 도구에서 출발해, 2026년에는 AI-native infinite canvas와 Design Agent를 중심으로 한 이른바 **vibe design** 환경으로 확장되었다. 사용자는 비즈니스 목표, 원하는 사용자 감정, 참고 이미지나 코드 등을 컨텍스트로 주고 여러 UI 방향을 탐색할 수 있다.

공식 사이트: https://stitch.withgoogle.com/

## 해결하려는 문제

기존 제품 개발에서는 아이디어 → 와이어프레임 → 고해상도 디자인 → 프로토타입 → 프론트엔드 구현 사이에 반복적인 전달과 재작업이 발생한다. Stitch는 자연어 기반 생성과 실시간 수정, 프로토타이핑, 디자인 규칙의 기계 판독 가능한 전달을 한 작업 공간에 묶어 이 간극을 줄이려 한다.

특히 AI Coding Agent가 UI를 직접 구현할 때 디자인 의도를 코드만으로 추측해야 하는 문제를 `DESIGN.md` 같은 구조화된 디자인 컨텍스트로 줄이려는 방향이 중요하다.

## 핵심 기능

1. **자연어 기반 UI 생성** — 목표와 요구사항을 설명해 고해상도 UI 방향을 생성하고 반복 수정한다.
2. **AI-native infinite canvas** — 이미지, 텍스트, 코드 등을 같은 캔버스에 컨텍스트로 배치하고 여러 아이디어를 탐색한다.
3. **Design Agent / Agent Manager** — 프로젝트 전체 맥락을 바탕으로 디자인을 수정하고 여러 디자인 방향을 병렬로 관리한다.
4. **실시간 steering** — 에이전트가 결과를 완성할 때까지 기다리지 않고 생성 중 방향을 조정할 수 있다.
5. **Voice 기반 디자인** — 음성으로 디자인 비평, 인터뷰, 메뉴/색상 변형 등의 요청을 수행한다.
6. **Interactive Prototype** — 화면을 연결하고 Play로 사용자 흐름을 검증하며 논리적인 다음 화면도 생성할 수 있다.
7. **DESIGN.md** — 디자인 시스템의 규칙과 의도를 agent-friendly Markdown으로 가져오거나 내보낸다. Google은 2026년 이 포맷의 draft specification을 공개했다.
8. **MCP / SDK / Skills 연동** — Stitch 기능을 외부 에이전트 및 개발 워크플로우에서 활용하는 연결 지점을 제공한다.
9. **개발 단계 연결** — Google AI Studio 및 Antigravity 등 개발 도구로 디자인을 넘길 수 있으며, 공식 발표 기준 Netlify를 통한 웹 게시 흐름도 제공한다.

## 아키텍처

공개 자료로 Stitch 내부 서버 구현이나 모델 라우팅 구조 전체가 공개된 것은 아니다. 확인 가능한 사용자 관점의 실행 구조는 다음과 같다.

```text
Business Goal / Prompt / Voice
            │
            ├── Image / Existing Design
            ├── Existing Codebase
            └── DESIGN.md
            │
            ▼
┌─────────────────────────────┐
│       Stitch Canvas         │
│  AI-native infinite canvas │
└──────────────┬──────────────┘
               │ project context
               ▼
┌─────────────────────────────┐
│       Design Agent          │
│ generate / critique / edit │
│ reflow / variants / steer  │
└──────────────┬──────────────┘
               │
        ┌──────┴─────────┐
        ▼                ▼
 UI Screens         Prototype Flow
        │                │
        └──────┬─────────┘
               ▼
       DESIGN.md / Export
               │
     ┌─────────┼──────────┐
     ▼         ▼          ▼
 MCP/SDK   AI Studio   Antigravity
     │                    │
     └──── Coding Agent ──┘
               │
               ▼
          Production UI
```

핵심은 Stitch를 최종 개발 환경으로 보기보다 **디자인 의도를 생성하고 구조화하여 Coding Agent로 전달하는 앞단의 디자인 컨텍스트 계층**으로 보는 것이다.

## 장점

- 비개발자나 디자인 전문성이 낮은 개발자도 빠르게 UI 방향을 시각화할 수 있다.
- 단일 결과보다 여러 디자인 방향을 빠르게 발산/수렴하는 작업에 적합하다.
- 프로토타입을 즉시 만들어 정적인 화면보다 사용자 흐름을 빨리 검증할 수 있다.
- `DESIGN.md`는 디자인 시스템을 사람용 문서에만 두지 않고 Agent가 소비할 수 있는 컨텍스트로 만든다는 점에서 AX 관점의 가치가 크다.
- MCP/SDK를 통해 디자인 생성이 독립된 웹 도구에서 끝나지 않고 Agent workflow의 tool로 들어갈 가능성이 있다.
- 기존 코드와 디자인 파일을 컨텍스트로 사용할 수 있어 greenfield뿐 아니라 기존 프로젝트의 UI 개선에도 활용 여지가 있다.

## 단점 및 한계

- Google Labs 계열의 실험적 제품이므로 기능, 정책, 모델, 연동 방식이 빠르게 변경될 수 있다.
- 생성된 디자인이 실제 제품의 접근성, 복잡한 상태 관리, 장기 유지보수성을 자동으로 보장하지 않는다.
- 자연어 기반 반복 생성은 요구사항이 모호할수록 결과 편차와 불필요한 iteration을 만들 수 있다.
- Google AI Studio/Antigravity 중심의 매끄러운 경로는 Google 생태계 의존성을 높일 수 있다.
- 공개 자료만으로 기업 데이터의 세부 보안/보존 정책, 온프레미스 지원, Windows Enterprise 제약 등을 충분히 판단하기 어렵다. 실제 기업 도입 전 별도 검증이 필요하다.
- 내부 token 사용량과 생성 비용 구조는 공개 자료만으로 정밀 비교하기 어렵다.
- WPF/WinUI/UE Editor 같은 데스크톱 네이티브 UI로 직접 변환하는 전용 production pipeline은 확인되지 않았다.

## 활용 사례

### 웹/모바일 신규 서비스

PM 또는 개발자가 요구사항을 Stitch에 전달해 여러 화면을 생성하고 프로토타입을 검증한 뒤 Coding Agent에 넘기는 흐름에 적합하다.

### 사내 도구 UI PoC

Dashboard, Installer, CI/CD 관리 화면, Agent 상태판처럼 기능 요구는 명확하지만 전문 디자이너 투입이 어려운 사내 도구의 초기 UX 설계에 유용하다.

### Agent 기반 Software Factory

Design Agent가 `DESIGN.md`와 UI artifact를 만들고 Coding Agent가 구현하며 Reviewer Agent가 디자인 규칙 준수 여부를 검사하는 파이프라인으로 확장할 수 있다.

## 기존 도구와 비교

Stitch의 차별점은 단순 UI 코드 생성보다 **디자인 작업 자체를 Agent workflow로 취급**한다는 데 있다. Figma 계열의 전통적인 디자인 캔버스와 비교하면 자연어/음성 생성과 Agent orchestration이 강하고, 순수 vibe-coding 도구와 비교하면 구현 이전의 디자인 탐색과 디자인 시스템 전달에 더 초점을 둔다.

특히 `DESIGN.md` + MCP/SDK 조합은 디자인과 코딩 에이전트 사이의 인터페이스를 파일/프로토콜 형태로 명시하려는 시도로 볼 수 있다.

## 활용 아이디어

### 바로 적용 가능

- 사내 Dashboard / Installer / 관리도구의 UI 시안 생성
- 신규 기능 요구사항을 실제 화면으로 빠르게 시각화
- 여러 UI variation을 만들어 개발 전 UX 방향 검토
- DESIGN.md를 프로젝트의 디자인 규칙 문서로 보관

### PoC 가치 있음

현재 운영 중인 AI Harness에 다음 단계를 추가하는 것을 검토할 가치가 있다.

```text
Requirement
   ↓
Design Agent (Stitch)
   ↓
DESIGN.md + Prototype
   ↓
Analysis Agent
   ↓
Coding Agent (Claude/Codex)
   ↓
UI implementation
   ↓
Review Agent
   ├─ code review
   └─ DESIGN.md compliance
```

특히 WPF 사내 도구의 경우 Stitch 결과를 그대로 코드로 사용하는 것보다 **레이아웃·정보 구조·디자인 토큰을 참고 자료로 추출한 뒤 WPF 구현 Agent가 재구성하는 방식**이 현실적이다.

### 아이디어 참고

`DESIGN.md` 방식은 특정 제품을 사용하지 않더라도 내부 AI 개발 환경에 도입할 가치가 있다. 예를 들어 각 프로젝트 루트에 `DESIGN.md`를 두고 Claude/Codex가 UI 변경 시 이를 항상 읽도록 하면 UI 일관성을 높일 수 있다.

### 현재는 도입 가치 낮음

디자인 변경이 거의 없는 CLI/백엔드 도구, 픽셀 단위로 이미 확정된 Enterprise UI, 외부 AI 서비스로 디자인/코드를 전달할 수 없는 보안 환경에서는 Stitch 자체의 이점이 제한적이다.

## 결론

Stitch의 실무적 가치는 단순히 "프롬프트로 예쁜 화면을 만드는 도구"보다 **Design → Agent Context → Code의 연결 계층**에 있다. 특히 DESIGN.md, MCP/SDK, Design Agent가 결합되면서 디자인을 AI Software Factory의 독립 단계로 다룰 수 있게 된 점이 중요하다.

개인/사내 AI Harness 관점에서는 전면 도입보다 `Requirement → Stitch → DESIGN.md → Claude/Codex → Review` 흐름을 작은 웹 Dashboard 또는 사내 관리도구에서 PoC하는 것을 추천한다.

## 참고 자료

- Stitch: https://stitch.withgoogle.com/
- Google Labs, Introducing vibe design with Stitch (2026-03-18): https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/
- Google Labs, DESIGN.md open-source draft specification (2026-04-21): https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/
- Google Labs, Real-time design with Stitch (2026-05-19): https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-updates/
