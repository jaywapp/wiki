---
title: Prompt Motion
category: tools
tags:
  - ai
  - claude
  - opus
  - motion-design
  - prompt
  - agent-skill
  - remotion
source: https://www.prompt-motion.com/
updated: 2026-10-07
---

# Prompt Motion

> Claude Opus 5.5로 코드 기반 모션 그래픽을 만든 실제 결과물과 그 Prompt/Agent Skill을 함께 모아, 결과와 제작 지시를 역으로 학습할 수 있게 한 모션 디자인 레퍼런스 라이브러리.

## 프로젝트 개요

Prompt Motion은 Claude Opus 5.5로 제작된 motion video를 수집하고, 각 결과에 사용된 Prompt 또는 Skill, 제작자, 모델, 사용 stack 등을 함께 보여주는 큐레이션 사이트다.

일반적인 prompt gallery와 다른 점은 텍스트만 모으지 않고 **완성된 영상 결과 ↔ 실제 prompt/skill ↔ 사용 stack**을 연결한다는 것이다. 사이트는 Prompt와 Skill 항목을 별도로 필터링할 수 있으며 원 게시물과 원 제작자를 연결한다.

이 사이트 자체가 영상을 생성하는 SaaS라기보다는, AI Coding Agent 기반 motion workflow의 사례/패턴을 관찰하는 레퍼런스 데이터베이스에 가깝다.

## 해결하려는 문제

AI에게 단순히 "멋진 모션을 만들어라"라고 요청하면 결과 편차가 크다. 특히 코드 기반 motion graphics는 다음 정보가 함께 있어야 재현성이 높아진다.

- 입력 asset과 필요한 질문
- visual direction
- scene/state structure
- timing/beat
- 기술 stack
- rendering 방식
- 금지 규칙
- 중간 검증 단계

Prompt Motion은 실제로 좋은 결과가 나온 사례의 prompt와 skill을 결과물 옆에 공개함으로써, 어떤 지시 구조가 어떤 결과로 이어지는지 비교할 수 있게 한다.

## 핵심 기능

### 결과물 + Prompt 연결

각 motion video에서 제작자가 공개한 prompt를 확인할 수 있다. 짧은 one-shot prompt부터 inputs/direction/structure/build/gotchas/start처럼 세분화된 production spec까지 사례의 폭이 넓다.

### Prompt / Skill 분리

메인 페이지에서 Prompt와 Skill을 구분해 볼 수 있다. 이는 단발성 지시와 재사용 가능한 Agent Skill을 별도의 제작 패턴으로 관찰하는 데 유용하다.

### 제작 메타데이터

항목에 따라 다음 정보가 표시된다.

- Model
- Effort / Iterations
- Stack
- 게시 날짜
- 원 게시물
- Skill repository

모든 항목에 동일한 메타데이터가 존재하는 것은 아니다.

### Agent Skill 사례

단순 prompt뿐 아니라 실제 재사용 가능한 motion-production skill도 포함한다.

예를 들어 Product Film Skill 사례는 제품의 design system을 학습하고, 사용자 인터뷰 후 실제 component/logo/music을 사용해 Remotion 기반 launch/landing-page video를 생성한다.

Cinetic 사례는 coding agent가 concept, brand, score를 바탕으로 code에서 cinematic launch film/motion piece를 구성하고 render하는 Agent Skill이다.

## 구조 및 동작 방식

Prompt Motion 자체는 생성 runtime이라기보다 아래 관계를 연결하는 catalog 역할을 한다.

```text
Creator
   │
   ├─ Prompt ───────────────┐
   │                        │
   └─ Agent Skill ──────┐   │
                        ▼   ▼
                 Claude Opus 5.5
                        │
                        ▼
               Code / Motion Project
                  │            │
          HTML/Canvas       Remotion
          Playwright       React/TS
                  │            │
                  └─────┬──────┘
                        ▼
                     Render
                        │
                        ▼
                  Motion Video
                        │
                        ▼
                 Prompt Motion
          result + prompt/skill + metadata
```

중요한 점은 Claude가 직접 video frame을 생성하는 전통적인 text-to-video 모델처럼 동작한다기보다, 많은 사례에서 animation/rendering code를 작성하고 외부 rendering stack이 이를 영상으로 만든다는 것이다.

대표적인 UI morph prompt는 모든 style을 `seek(t)`의 시간 함수로 계산하고 HTML + Playwright로 frame을 render하며 ffmpeg 기반 motion blur와 beat 단위 pre-render 검증까지 명시한다.

## 관찰되는 Prompt 패턴

Prompt Motion의 가치가 큰 부분은 개별 문구보다 **prompt structure**다.

대표적인 고품질 사례에서 다음 계층이 반복된다.

```text
Inputs
  ↓
Direction / Visual Language
  ↓
Structure / Beat Sheet
  ↓
Build Rules
  ↓
Gotchas / Negative Constraints
  ↓
Pre-render Validation
  ↓
Full Render
```

특히 UI morph 사례는 다음을 명확하게 분리한다.

- `inputs`: 사용자에게 먼저 받아야 하는 정보
- `direction`: visual/motion language
- `structure`: beat별 state transition
- `build`: 구현 및 rendering 규칙
- `gotchas`: 이미 알려진 실패 조건
- `start`: 코드 작성 전에 해야 할 검증

이는 일반적인 자연어 prompt보다 작은 **production specification** 또는 **single-task harness**에 가깝다.

## 장점

### 결과와 지시를 동시에 볼 수 있음

Prompt만 읽는 것보다 결과 영상을 함께 보면서 어떤 표현이 실제 motion으로 변환됐는지 확인할 수 있다.

### Motion Prompt 패턴 학습에 유용

좋은 사례는 "cinematic", "beautiful" 같은 형용사보다 duration, state, beat, easing, asset, rendering rule, negative constraint를 구체적으로 기술한다.

### Skill로의 진화 과정을 관찰 가능

일회성 prompt에서 반복 가능한 Agent Skill로 발전하는 사례를 같은 사이트에서 볼 수 있다. AI motion 제작이 단순 prompt engineering에서 workflow engineering으로 이동하는 흐름을 관찰하기 좋다.

### Coding Agent 활용 범위를 확장

Claude Code 같은 Coding Agent를 단순 개발 도구가 아니라 motion director + implementation agent + renderer controller로 사용하는 사례를 확인할 수 있다.

## 단점 및 한계

### 큐레이션 사이트이지 Benchmark가 아님

선별된 성공 사례 중심이므로 평균적인 성공률, 실패율, token cost, rendering time을 판단할 수 없다.

### 재현성 정보가 완전하지 않음

일부 사례는 한 prompt처럼 보여도 실제로 여러 iteration이 있었을 수 있다. 사이트에서도 항목별로 Effort/Iterations 정보가 다르고 모든 실행 환경이 공개되는 것은 아니다.

### 모델 의존성

현재 사이트의 정체성은 Opus 5.5 결과물에 강하게 묶여 있다. 동일 prompt가 다른 모델이나 향후 모델에서 같은 미학과 구현 품질을 보장하지 않는다.

### 비용 및 실행시간 확인 어려움

긴 autonomous run, frame rendering, image/audio analysis, Remotion/Playwright rendering은 모델 token 외에도 상당한 compute와 시간이 필요할 수 있지만 사이트 자체만으로 정량 비교하기 어렵다.

### 저작권/브랜드/asset 관리

실제 product film에 적용하려면 음악, font, image, logo, UI asset의 라이선스와 브랜드 사용 권한을 별도로 관리해야 한다.

### Enterprise 적용 시 실행 권한 주의

Coding Agent가 package 설치, browser rendering, ffmpeg, 외부 API와 asset에 접근하도록 허용하는 workflow는 sandbox, secret, network, dependency 정책이 필요하다.

## 활용 사례

### Product Launch Film

실제 UI component와 brand asset을 읽어 SaaS/product launch film을 코드로 제작한다.

### UI Motion Prototype

버튼, loader, tabs, chart 등 UI state를 하나의 continuous morph sequence로 만들어 interaction concept을 빠르게 검증한다.

### Design System Motion Reference

브랜드별 easing, duration, transition, camera language를 prompt/skill에 포함해 motion language를 반복 사용한다.

### Shorts / Demo Video 자동화

제품 변경사항이나 release 정보를 받아 short demo video를 생성하는 pipeline의 레퍼런스로 활용할 수 있다.

## 기존 방식과 비교

| 방식 | 강점 | 약점 |
| --- | --- | --- |
| After Effects 중심 | 정밀한 수작업, mature ecosystem | 자동화와 코드 재사용 비용이 큼 |
| Text-to-Video | 빠른 visual generation | UI/text 정확성과 deterministic 수정이 어려움 |
| Remotion 수작업 | 코드 재사용, deterministic render | 구현 비용과 motion design 역량 필요 |
| Coding Agent + Remotion/HTML | 자연어 spec에서 code/render까지 자동화 가능 | 모델 품질, context, iteration, execution 환경에 의존 |
| Prompt Motion | 실제 성공 사례의 결과와 prompt/skill을 빠르게 비교 | 생성 도구가 아니며 benchmark도 아님 |

## 기존 Wiki와의 연결

### `ai/skills/motion-design-vocabulary.md`

기존 문서가 Agent와 사람이 공유할 **Motion Vocabulary**를 정의한다면 Prompt Motion은 그 vocabulary가 실제 production prompt에서 어떻게 구조화되는지 관찰할 수 있는 사례 저장소다.

둘을 결합하면 다음 구조가 가능하다.

```text
Motion Vocabulary
       ↓
Reusable Motion Skill
       ↓
Prompt Motion 사례에서 pattern 수집
       ↓
Prompt Template / Preset
       ↓
Code Generation
       ↓
Render
       ↓
Visual Review
       ↓
Pattern 개선
```

## 활용 아이디어

### 바로 적용 가능

Prompt Motion의 사례를 그대로 복사하기보다 다음 필드를 추출해 기존 Motion Design Vocabulary를 보강한다.

- input contract
- visual direction
- beat/state structure
- duration
- easing/spring
- camera language
- negative constraints
- render stack
- pre-render review
- loop/ending rule

### PoC 가치 있음

`motion-design` Skill을 **Prompt Compiler**처럼 구성할 가치가 있다.

사용자는 목적과 asset만 제공하고 Skill이 다음 spec을 생성한다.

```yaml
purpose: product-launch
duration: 15s
aspectRatio: 16:9
assets: [...]
motionLanguage: [...]
beats: [...]
constraints: [...]
render:
  stack: remotion
validation:
  - storyboard
  - contact-sheet
  - final-render
```

이후 Agent가 spec → code → preview → critique → render 순서로 실행한다.

### PoC 가치 있음: Motion Pattern Dataset

Prompt Motion에서 공개된 사례를 단순 bookmark로 저장하지 않고 다음 단위로 태깅하면 자체 motion knowledge base를 만들 수 있다.

```text
result
├─ purpose
├─ prompt pattern
├─ motion vocabulary
├─ implementation stack
├─ timing strategy
├─ validation strategy
└─ reusable rules
```

향후 UI/UX Agent가 "어떤 motion pattern을 선택해야 하는가"를 판단하는 retrieval source로 사용할 수 있다.

### 아이디어 참고

기존 `motion-design-vocabulary`를 vocabulary 문서에 그치지 않고 **Vocabulary + Pattern Library + Renderer Adapter + Visual Reviewer** 구조의 Skill로 확장할 때 Prompt Motion을 외부 사례 소스로 사용할 수 있다.

## 실무 평가

Prompt Motion 자체를 도입할 도구라고 보기는 어렵다. 대신 **AI Coding Agent가 motion design을 수행하는 최신 prompt/skill 패턴을 수집하는 레퍼런스 소스**로 가치가 높다.

특히 중요한 관찰은 좋은 결과가 "한 줄짜리 마법 prompt" 때문만은 아니라는 점이다. 공개된 고급 사례는 입력 계약, beat sheet, 기술 구현 규칙, negative constraint, 사전 frame 검증까지 포함한다.

따라서 실무적으로는 Prompt Motion의 prompt를 복사하는 것보다 반복되는 구조를 추출해 자체 Motion Design Skill/Harness에 편입하는 것이 더 가치 있다.

## 결론

Prompt Motion은 Claude Opus 5.5 motion graphics의 쇼케이스인 동시에 **Prompt → Code → Render → Result 관계를 관찰할 수 있는 사례집**이다.

현재 AI Wiki의 관점에서는 독립 도구로 직접 채택하기보다, 기존 Motion Design Vocabulary를 실제 production pattern으로 발전시키기 위한 reference corpus로 활용하는 것이 가장 적합하다.

평가: **PoC 가치 있음**.

특히 `motion-design-vocabulary.md`의 다음 단계인 재사용 가능한 Motion Design Skill을 설계할 때 우선적으로 참고할 자료다.

## 참고 자료

- Prompt Motion: https://www.prompt-motion.com/
- Prompt Motion - Shape morphing through UI states: https://www.prompt-motion.com/twoclipping-5cba86
- Prompt Motion - Reddit marketing tool launch video: https://www.prompt-motion.com/anthonyriera-9b1b2a
- Prompt Motion - Cinetic skill launch film: https://www.prompt-motion.com/lexnlin-6161a6
- Ciyo - Opus 5.5 motion graphics guide: https://ciyo.ai/blog/opus-5-5-video-motion-graphics-guide
