---
title: UI Design Agent Skills - Emil Kowalski, Matt Pocock, Kill AI Slop
category: skills
tags:
  - ai
  - agent
  - skills
  - ui
  - ux
  - animation
  - frontend
source: https://github.com/emilkowalski/skills
updated: 2026-09-07
---

# UI Design Agent Skills - Emil Kowalski, Matt Pocock, Kill AI Slop

> AI가 UI를 '그럴듯하게 생성'하는 단계를 넘어, 어디에 움직임이 필요한지 판단하고, 검증된 UI 라이브러리를 선택하고, 짧은 프로토타입으로 의사결정을 검증하고, 전형적인 AI 디자인 흔적까지 제거하도록 만드는 실전 Agent Skill 묶음이다.

## 프로젝트 개요

최근 UI/UX용 Agent Skill은 단순한 스타일 프롬프트보다 **판단 기준을 에이전트에 주입하는 방향**으로 발전하고 있다. 특히 Emil Kowalski의 `skills` 저장소는 애니메이션/디자인 엔지니어링 판단을 작은 Skill들로 분리하며, Matt Pocock의 `prototype`은 구현 전에 질문 하나를 실행 가능한 코드로 검증하는 패턴을 제공한다. `yetone/kill-ai-slop`은 AI가 생성한 웹 UI에서 반복되는 시각·카피 패턴을 정적 분석해 제거하는 반대 방향의 품질 게이트다.

조사 기준일: 2026-09-07.

## 해결하려는 문제

AI 코딩 에이전트는 UI 구현 자체는 빠르지만 다음과 같은 실패가 반복된다.

- 움직여야 할 곳과 움직이면 안 되는 곳을 구분하지 못한다.
- easing, duration, transform 등 애니메이션 재료를 관성적으로 선택한다.
- 이미 검증된 컴포넌트가 있는데도 직접 구현하거나 불필요한 패키지를 추가한다.
- UI 의사결정을 곧바로 production code에 넣어 실험 비용이 커진다.
- 보라색 gradient, 과한 glass 효과, 카드 안의 카드 등 생성형 AI 특유의 반복적 디자인 패턴이 남는다.

이 Skill들의 공통점은 생성 능력을 더 키우기보다 **선택·판단·검증 규칙을 제공해 에이전트의 자유도를 필요한 범위로 제한한다는 것**이다.

## 핵심 Skill

### 1. find-animation-opportunities

Emil Kowalski의 Skill. 기존 UI를 보고 실제로 motion이 사용자 이해나 feedback에 도움이 되는 지점을 찾는다. 중요한 특징은 '애니메이션 후보를 많이 제안'하는 것이 아니라 **움직이면 안 되는 부분도 함께 걸러낸다**는 점이다.

적합한 용도:
- 상태 변화가 순간 이동처럼 보이는 UI
- action 결과를 명확히 알려야 하는 feedback
- hierarchy/relationship을 설명하는 transition
- 기존 화면의 motion audit 전 단계

### 2. pick-ui-library

상황에 맞는 UI 라이브러리를 하나 선택하도록 유도하는 Skill이다. Emil이 실제로 신뢰하는 curated list를 기준으로 toast, command menu, chart, drag-and-drop 등에서 직접 구현보다 검증된 구현을 우선하게 한다.

핵심 가치는 '라이브러리 추천 목록'보다 **후보를 무한히 늘리지 않고 한 가지 선택으로 수렴시키는 것**이다. AI가 `<div>` 기반 dropdown처럼 접근성·focus management를 빠뜨린 구현을 만드는 위험도 줄일 수 있다.

### 3. prototype

이름이 같은 Skill이 있어 제작자를 구분해야 한다.

- Emil Kowalski 버전: 설명한 UI 조각에 대해 서로 충분히 다른 여러 변형을 만들고 selector로 비교하는 UI 탐색용 Skill.
- Matt Pocock 버전: production 구현 전에 하나의 질문에 답하기 위한 throwaway prototype. 현재 저장소 문서에서는 state/logic 질문이면 단일 공유 HTML, UI 질문이면 한 route에서 여러 UI variation을 전환하는 방식으로 분기한다.

따라서 전자는 **시각적 선택지 탐색**, 후자는 **설계 가설 검증**에 더 가깝다.

### 4. animate

Emil Kowalski의 animation construction Skill. 단순히 '애니메이션 추가'가 아니라 다음 순서로 결정을 강제한다.

1. 애니메이션이 필요한가?
2. 목적이 무엇인가?
3. 가장 저렴한 구현 도구는 무엇인가?
4. 어떤 property를 움직일 것인가?
5. curve와 duration은 무엇인가?
6. interrupt/exit/reduced-motion을 어떻게 처리할 것인가?

CSS transition → `@starting-style` → CSS animation → WAAPI → Motion 순으로 필요한 수준까지만 도구를 선택하도록 안내한다. `transform`/`opacity` 우선, reduced motion 포함, 불필요한 motion library 설치 금지 등 production 품질 규칙이 포함된다.

### 5. kill-ai-slop

`yetone/kill-ai-slop`은 AI-generated product에서 반복되는 시각·카피 습관을 정리한 field guide이자 Agent Skill/scanner다. 프로젝트 파일을 스캔해 문제가 있는 패턴을 찾고 위치를 알려주는 방식이며 CI scanner도 운영되고 있다.

이 도구의 역할은 디자인을 만드는 것이 아니라 **AI가 만든 티를 제거하는 lint/quality gate**에 가깝다. 따라서 생성 Skill 뒤에 배치할 때 가치가 크다.

## 아키텍처 / 권장 실행 흐름

```text
요구사항
   |
   v
[prototype]
설계 질문 / UI 방향 검증
   |
   v
[pick-ui-library]
검증된 구현 재료 선택
   |
   v
[find-animation-opportunities]
움직임이 필요한 지점 판별
   |
   v
[animate]
curve / duration / property / reduced-motion까지 구현
   |
   v
[kill-ai-slop]
AI 특유의 시각·카피 패턴 검사
   |
   v
Review -> Production
```

중요한 점은 이 흐름이 하나의 거대한 UI Agent가 아니라 **각 판단 단계를 작은 Skill로 분리한 pipeline**이라는 것이다. 필요한 단계만 호출할 수 있어 context와 token 낭비도 줄이기 쉽다.

## 장점

- UI 품질을 모델의 감각에만 맡기지 않고 전문가의 판단 규칙으로 보정한다.
- Skill이 작고 역할이 명확해 Claude Code, Codex 등 여러 agent 환경에 재사용하기 쉽다.
- prototype을 production branch와 분리하면 실험 코드가 본선에 섞이는 문제를 줄일 수 있다.
- animation에서 '하지 않는 선택'까지 명시해 과도한 motion을 방지한다.
- kill-ai-slop을 마지막 gate로 두면 생성 단계와 검수 단계를 분리할 수 있다.

## 단점 및 한계

- Emil Skill은 그의 디자인 철학과 선호 라이브러리에 의도적으로 편향되어 있다. 조직 design system과 충돌할 수 있다.
- 웹 UI 중심 규칙이 많아 WPF, Unreal Slate, native desktop 등에 그대로 적용되지는 않는다.
- Skill 문서는 결국 model instruction이므로 deterministic lint나 visual regression test를 대체하지 못한다.
- `kill-ai-slop`의 규칙은 AI가 만들지 않은 의도적 디자인도 false positive로 잡을 수 있다. suppression/검토 단계가 필요하다.
- UI 품질은 코드만으로 판단할 수 없으므로 실제 렌더링, interaction, accessibility 검증이 별도로 필요하다.
- 외부 Skill을 그대로 vendoring하면 upstream 변경과 내부 design system 규칙 사이의 drift 관리가 필요하다.

## 기존 도구와 비교

| 접근 | 목적 | 강점 | 약점 |
|---|---|---|---|
| 일반 frontend-design prompt | UI 생성 | 범용적이고 빠름 | 판단 기준이 넓어 결과 편차가 큼 |
| Emil skills | 디자인/animation 판단을 세분화 | 구체적이고 composable | Emil의 취향/웹 stack 편향 |
| Matt Pocock prototype | 구현 전 질문 검증 | production 오염 방지, 빠른 피드백 | 최종 UI 품질 자체를 보장하지 않음 |
| kill-ai-slop | 생성 결과의 AI 흔적 검사 | 후처리 품질 gate로 좋음 | 규칙 기반 false positive 가능 |

## 활용 사례

### 바로 적용 가능

웹 기반 내부 도구나 Blazor/React 관리 UI에서 다음 흐름을 적용할 가치가 높다.

- UI 요구 → `prototype`
- component 선택 → `pick-ui-library`
- interaction 완성 → `find-animation-opportunities` + `animate`
- PR 전 → `kill-ai-slop`

### PoC 가치 있음

회사 내부 AX Harness에 `UI Design Reviewer` 역할로 넣는 방식이다. Worker가 UI를 만든 뒤 별도 reviewer가 animation/design 규칙과 AI-slop scanner를 적용하고 수정 지시만 반환하게 하면 생성 모델과 평가 기준을 분리할 수 있다.

### 아이디어 참고

WPF/DevExpress 환경에서는 Skill 자체를 그대로 쓰기보다 핵심 철학을 포팅하는 편이 낫다.

- WPF animation opportunity 규칙
- DevExpress control 우선 선택 규칙
- 사내 theme/token 준수 규칙
- 'AI UI smell' 사내 lint checklist

즉 `pick-ui-library`를 `pick-company-control`, `animate`를 `wpf-motion-guidelines` 같은 내부 Skill로 변환하는 방식이다.

## 결론

이 자료에서 가장 중요한 포인트는 개별 Skill보다 **UI 작업을 탐색 → 선택 → motion 판단 → 구현 → anti-slop 검수로 분해하는 구조**다. 특히 AI가 UI 코드를 잘 생성하게 만드는 프롬프트보다, 잘못된 선택을 하지 못하게 만드는 작은 Skill을 조합하는 접근이 실무 AX에 더 재사용성이 높다.

도입 우선순위는 `prototype`과 `pick-ui-library`가 가장 높고, 웹 프론트엔드가 주요 대상이면 Emil의 animation Skill 세트를 함께 적용할 가치가 높다. `kill-ai-slop`은 마지막 자동 리뷰 단계의 보조 lint로 사용하는 것이 적합하다.

## 참고 자료

- https://github.com/emilkowalski/skills
- https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md
- https://github.com/mattpocock/skills
- https://github.com/yetone/kill-ai-slop
- https://killaislop.com
