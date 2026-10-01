---
title: AI Coding Agent를 위한 Motion Design Vocabulary
category: skills
tags:
  - ai
  - agent
  - ui
  - ux
  - motion-design
  - frontend
  - opus
updated: 2026-10-01
---

# AI Coding Agent를 위한 Motion Design Vocabulary

> Claude Opus 같은 AI Coding Agent에게 UI 모션을 모호한 자연어 대신 표준 모션 용어와 파라미터로 지시하기 위한 실전 Vocabulary 가이드.

## 개요

AI에게 "자연스럽게 움직여줘", "고급스럽게 등장시켜줘"라고 요청하면 구현 결과가 세션과 모델에 따라 크게 달라질 수 있다. 모션 디자인에서 이미 사용하는 카메라·전환·타이밍 용어를 공통 Vocabulary로 정의하면, AI가 의도를 더 구체적인 코드로 변환하도록 만들 수 있다.

이 문서의 목적은 영상 제작 용어 자체를 설명하는 데 그치지 않고, Claude Opus 등 Coding Agent가 React/CSS/Framer Motion/Web Animation을 구현할 때 재사용할 수 있는 모션 지시 체계를 정리하는 것이다.

## 해결하려는 문제

- "부드럽게", "빠르게", "강조해서" 같은 지시는 구현 해석의 범위가 넓다.
- AI가 매번 다른 easing, duration, 이동 거리와 효과를 임의로 선택할 수 있다.
- 디자이너와 개발자, AI Agent 사이에서 같은 움직임을 다른 표현으로 설명하기 쉽다.
- 여러 화면을 생성하면 제품 전체의 Motion Language가 일관되지 않을 수 있다.

따라서 **Motion Vocabulary + 구현 파라미터 + 사용 규칙**을 함께 제공하는 방식이 유용하다.

## 핵심 Vocabulary

### 1. Camera Motion

| 용어 | 의미 | UI/웹 적용 예 |
| --- | --- | --- |
| Pan | 고정된 카메라가 좌우로 회전 | 넓은 Scene 탐색 |
| Tilt | 고정된 카메라가 상하로 회전 | 세로 Scene 탐색 |
| Roll | 카메라 축 자체를 회전 | 강한 전환/특수 효과 |
| Truck | 카메라 자체가 좌우 이동 | 수평 Scene 이동 |
| Pedestal | 카메라 자체가 상하 이동 | 수직 Scene 이동 |
| Dolly | 카메라가 피사체 방향으로 앞뒤 이동 | 공간감 있는 접근/이탈 |
| Zoom | 카메라는 고정하고 화각 변경 | 대상 확대/축소 강조 |
| Orbit | 대상을 중심으로 카메라 회전 | 3D Product/Scene 탐색 |

Pan/Tilt/Zoom과 Truck/Pedestal/Dolly를 구분하는 것이 중요하다. 전자는 카메라의 방향 또는 렌즈 변화이고 후자는 카메라 위치 자체의 이동이다.

### 2. Emphasis & Transition

| 용어 | 의미 | 활용 |
| --- | --- | --- |
| Whip Pan | 매우 빠른 Pan으로 장면 연결 | 화면 전환 |
| Snap Zoom | 짧은 시간에 빠르게 Zoom | 순간 강조 |
| Punch In | 컷 또는 즉각적 확대 | CTA/중요 정보 강조 |
| Dolly Zoom | 피사체 크기를 유지하며 배경 원근 변화 | 극적인 공간 효과 |
| Speed Ramp | 동작 중 속도를 변화 | 전환 리듬 조절 |
| Parallax | 깊이가 다른 레이어를 서로 다른 속도로 이동 | Hero/스크롤 공간감 |
| Rack Focus | 초점 대상을 이동 | 시선 유도 |
| Perspective Tilt | 평면을 기울여 원근감 생성 | 카드 Hover/3D UI |
| 2.5D Camera | 2D 레이어에 깊이를 주고 카메라 이동 | Landing/Hero Scene |

### 3. Timing & Animation Principles

| 용어 | 의미 | 구현 포인트 |
| --- | --- | --- |
| Easing | 움직임의 가속/감속 곡선 | cubic-bezier/spring |
| Ease Out | 빠르게 시작하고 천천히 정지 | 등장/사용자 입력 반응 |
| Overshoot | 목표값을 살짝 지나 복귀 | 강조/탄성 |
| Anticipation | 본 동작 전 반대 방향으로 준비 동작 | 캐릭터/강한 CTA |
| Stagger | 여러 요소를 시간차로 실행 | List/Card 등장 |
| Motion Blur | 빠른 움직임에 잔상 표현 | 빠른 전환 |

## Agent에게 전달할 구현 파라미터

용어만 지정하지 말고 다음 값을 함께 전달하는 것을 권장한다.

```yaml
motion:
  type: stagger
  target: cards
  trigger: viewport-enter
  duration: 350ms
  delay: 80ms
  translateY: 16px
  opacity: [0, 1]
  easing: ease-out
  overshoot: subtle
  reducedMotion: fade-only
```

핵심 파라미터는 다음과 같다.

- **target**: 어떤 요소가 움직이는가
- **trigger**: load, viewport, hover, click, route-change 등
- **duration**: 동작 시간
- **delay / stagger**: 시작 시간 관계
- **distance / scale / rotation / opacity**: 변화량
- **easing / spring**: 속도 곡선
- **direction**: 이동 방향
- **depth**: Parallax/2.5D의 레이어 깊이
- **reduced-motion**: 접근성 대응
- **interrupt behavior**: 사용자 입력으로 애니메이션이 중단될 때 처리

## 프롬프트 패턴

나쁜 예:

> 카드가 멋있고 자연스럽게 나타나도록 만들어줘.

권장 예:

> 카드 6개를 80ms 간격의 Stagger로 등장시킨다. 각 카드는 translateY 16px→0, opacity 0→1로 변화한다. Duration은 350ms, Ease Out을 사용한다. 마지막에는 매우 약한 Overshoot만 허용한다. prefers-reduced-motion에서는 이동과 Overshoot를 제거하고 Fade만 사용한다.

AI가 시각적 형용사를 임의로 해석하는 대신 구현 가능한 모션 사양으로 변환할 수 있다.

## Agent Skill로 확장

```text
Motion Design Skill
├── Vocabulary
│   ├── Camera
│   ├── Transition
│   └── Timing
├── Intent
│   ├── Enter
│   ├── Exit
│   ├── Emphasis
│   ├── Navigation
│   └── Feedback
├── Parameters
│   ├── Duration
│   ├── Delay
│   ├── Distance
│   ├── Scale
│   ├── Opacity
│   ├── Easing
│   └── Trigger
├── Constraints
│   ├── Reduced Motion
│   ├── Performance
│   └── Interruptibility
└── Implementation
    ├── CSS
    ├── Web Animations API
    └── Framer Motion
```

Skill은 사용자가 모든 모션 용어를 직접 지정하도록 강제하기보다, UI의 **의도(Intent)** 를 분석해 허용된 Motion Pattern 중 하나를 선택하고 표준 파라미터로 구체화하는 방식이 적합하다.

## 실전 활용 사례

### Landing Page

Hero 배경에는 느린 Parallax 또는 2.5D Camera를 사용하고 주요 텍스트와 CTA는 짧은 Stagger + Ease Out으로 등장시킨다. 과도한 카메라 효과는 피한다.

### Dashboard

카드와 목록은 Stagger, 상태 변화는 짧은 Easing, 선택 요소는 작은 Scale/Opacity 변화 정도를 사용한다. 데이터 탐색을 방해하는 Whip Pan이나 강한 Overshoot는 피한다.

### Product Showcase

Orbit, Dolly, Perspective Tilt, Parallax를 이용해 공간감을 줄 수 있다. 3D 요소가 실제로 존재한다면 카메라 이동과 객체 transform을 명확하게 구분한다.

### Micro Interaction

버튼/토글/상태 변경은 100~300ms 수준의 짧은 피드백을 우선하고, Overshoot와 Anticipation은 의도가 있을 때만 제한적으로 사용한다.

## 장점

- Agent와 사용자 사이의 모션 표현을 표준화할 수 있다.
- 프롬프트의 모호성을 줄인다.
- 여러 화면에서 Motion Language의 일관성을 높인다.
- 디자인 의도를 코드 파라미터로 변환하기 쉽다.
- Skill/Prompt/Harness의 재사용 가능한 지식으로 만들 수 있다.

## 단점 및 한계

- 영상 카메라 용어를 웹 UI에 그대로 적용하면 과도한 효과가 될 수 있다.
- 용어를 지정한다고 좋은 Motion Design이 자동으로 보장되는 것은 아니다.
- 모바일 성능, GPU compositing, layout thrashing 등을 별도로 고려해야 한다.
- Motion Blur, Dolly Zoom, 2.5D 같은 효과는 일반적인 업무 UI에는 비용 대비 가치가 낮을 수 있다.
- 사용자의 `prefers-reduced-motion` 설정을 반드시 고려해야 한다.
- AI가 효과를 많이 사용할수록 좋은 디자인이라고 판단하지 않도록 제한 규칙이 필요하다.

## 활용 아이디어

### 바로 적용 가능

Coding Agent 프롬프트에 Vocabulary와 기본 파라미터 규칙을 넣고 UI 구현 요청을 구조화한다.

### PoC 가치 있음

`motion-design` Agent Skill을 만들어 UI Intent를 분석한 뒤 Motion Pattern과 구현 파라미터를 자동 선택하도록 한다.

예:

```text
UI Intent
   ↓
Motion Pattern Selection
   ↓
Parameterization
   ↓
Accessibility / Performance Guard
   ↓
Framework-specific Implementation
   ↓
Visual Review
```

### 아이디어 참고

Taste/UI Skill과 결합해 Visual Design뿐 아니라 Motion Language까지 디자인 시스템의 일부로 관리할 수 있다.

## 결론

핵심은 "Opus에게 모션그래픽 용어를 알려준다"가 아니라 **AI Coding Agent와 사람이 공유하는 Motion Design Vocabulary를 정의한다**는 것이다.

특히 `Stagger`, `Easing`, `Overshoot`, `Anticipation`, `Parallax`, `Perspective Tilt` 같은 개념을 duration·distance·trigger·accessibility와 함께 구조화하면, AI가 생성하는 UI의 모션 품질과 일관성을 높이는 재사용 가능한 Skill로 발전시킬 수 있다.

향후에는 이 문서를 기반으로 실제 `motion-design` Skill의 규칙, preset, framework adapter를 별도 설계하는 것이 적합하다.

## 참고 자료

- 사용자 제공 Motion Design 용어 인포그래픽 (2026-10-01)
