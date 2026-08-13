# AI UI/UX 디자인 스킬 비교

정리 기준일: 2026-08-14

비교 대상:
- Taste Skill
- UI UX Pro Max
- Impeccable

## 요약

세 프로젝트 모두 Claude Code, Codex 등 AI 코딩 에이전트의 UI/UX 결과물을 개선하지만 역할이 다르다.

| 스킬 | 핵심 역할 | 가장 잘 맞는 용도 |
|---|---|---|
| Taste Skill | 디자인 미감과 Art Direction 강화 | AI 특유의 평범한 UI 제거 |
| UI UX Pro Max | 디자인 지식 검색 및 Design System 생성 | 제품별 디자인 방향과 일관성 확립 |
| Impeccable | 설계-리뷰-감사-개선 워크플로 | 기존 UI 검수와 지속적인 품질 개선 |

한 문장으로 정리하면 **Taste는 미감, UI UX Pro Max는 디자인 지식, Impeccable은 디자인 운영 체계**에 가깝다.

---

## 1. Taste Skill

### 개요

Taste Skill은 스스로를 `Anti-Slop Frontend Framework for AI Agents`라고 설명한다. AI가 생성하는 획일적이고 안전한 프론트엔드 디자인을 줄이고 레이아웃, 타이포그래피, 모션, 여백 등에 더 강한 디자인 의도를 부여하는 것이 목적이다.

현재 기본 `design-taste-frontend`는 v2 experimental 계열이며 brief를 읽고 디자인 언어를 추론한 뒤 `VARIANCE`, `MOTION`, `DENSITY` 세 축을 조절한다.

### 주요 특징

- AI 특유의 흔한 SaaS 스타일과 반복적인 카드 UI 억제
- 레이아웃, typography, spacing, motion에 강한 방향성 부여
- 기존 프로젝트 리디자인용 스킬 제공
- GPT/Codex에 더 강한 규칙을 적용하는 `gpt-taste` 변형 제공
- minimalist, high-end, brutalist 등 시각적 방향별 세부 스킬 제공
- 웹/모바일 reference image 및 brand kit 생성용 스킬 제공
- 이미지 레퍼런스를 만든 뒤 코드로 옮기는 image-to-code 흐름 지원

### 대표 세부 스킬

- `design-taste-frontend`: 기본 frontend 디자인 스킬
- `gpt-taste`: GPT/Codex 중심의 강한 anti-slop 규칙
- `redesign-existing-projects`: 기존 UI audit 및 리디자인
- `high-end-visual-design`: 차분하고 고급스러운 방향
- `minimalist-ui`: 절제된 product UI
- `industrial-brutalist-ui`: 실험적 brutalist 방향
- `image-to-code`: 이미지 레퍼런스에서 코드 구현까지 연결

### 추천 상황

- AI가 만든 UI가 기능적으로는 괜찮지만 너무 평범할 때
- 화면마다 비슷한 카드와 레이아웃이 반복될 때
- 디자이너 없이도 강한 시각적 방향성을 주고 싶을 때
- Codex가 생성하는 UI에 좀 더 과감한 디자인 규칙을 적용하고 싶을 때

### 링크

- GitHub: https://github.com/Leonxlnx/taste-skill
- 공식 사이트: https://www.tasteskill.dev/
- 문서: https://www.tasteskill.dev/docs

---

## 2. UI UX Pro Max

### 개요

UI UX Pro Max는 디자인 지식 데이터베이스와 추천/추론 엔진 성격이 강하다. 제품 요구사항을 분석해서 적합한 UI 스타일, 색상, 폰트, UX 규칙, chart, page pattern, framework별 구현 가이드 등을 선택하도록 AI를 돕는다.

Taste가 `좋은 취향으로 만들어라`에 가깝다면 UI UX Pro Max는 `이 제품에는 어떤 디자인 시스템이 적합한지 근거를 찾아 결정하라`에 가깝다.

### Design System Generator

v2 계열의 핵심 기능은 프로젝트 요구사항에 맞는 Design System을 생성하는 것이다. 생성된 규칙은 프로젝트의 master 디자인 문서와 페이지별 override 구조로 저장할 수 있어 여러 세션과 여러 페이지에 걸쳐 디자인 일관성을 유지하기 좋다.

### 주요 특징

- 제품 유형 기반 디자인 시스템 생성
- UI style, palette, typography, UX rule 검색
- 디자인 시스템을 프로젝트 문서로 지속 관리 가능
- 페이지별 override 가능
- 구현 전후 anti-pattern 검사
- 다양한 UI framework에 대한 stack-specific guideline 제공

### 지원 범위

웹 영역에서는 HTML/Tailwind, React, Next.js, shadcn/ui, Vue, Nuxt, Angular, Laravel, Svelte, Astro, Three.js 등을 다룬다.

Desktop 영역에서는 JavaFX, WPF, WinUI 3, Avalonia, Uno Platform, UWP를 명시적으로 지원한다.

Mobile/Cross-platform 영역에서는 SwiftUI, Jetpack Compose, React Native, Flutter 등을 지원한다.

특히 WPF와 WinUI 등 데스크톱 UI까지 명시적으로 다룬다는 점은 Taste와 Impeccable 대비 눈에 띄는 특징이다.

### 추천 상황

- 프로젝트 시작 시 디자인 시스템까지 같이 정하고 싶을 때
- AI가 색상이나 폰트를 임의로 고르는 것을 줄이고 싶을 때
- 여러 페이지 간 디자인 일관성이 중요할 때
- 웹 외에 WPF/WinUI/Flutter 등의 UI도 함께 다룰 때
- 디자인 규칙을 문서화해서 이후 AI 세션에서도 재사용하고 싶을 때

### 링크

- GitHub: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- 공식 사이트: https://www.uupm.cc/

---

## 3. Impeccable

### 개요

Impeccable은 세 프로젝트 중 디자인 작업 프로세스 자체를 가장 적극적으로 도구화한 프로젝트다. 단순한 디자인 지침을 넘어서 초기 디자인 컨텍스트 정의, UX/UI 설계, 리뷰, 기술 감사, 폴리시, edge case 보강 등 전체 개선 흐름을 명령 단위로 제공한다.

### 프로젝트 디자인 컨텍스트

초기화 과정에서 UI가 마케팅/랜딩/포트폴리오 같은 brand surface인지 앱/대시보드/업무도구 같은 product surface인지 구분하고 이후 명령들이 공통으로 참조하는 제품 및 디자인 문서를 만든다.

### 대표 명령 역할

- `shape`: 구현 전 UX/UI 구조 설계
- `craft`: 설계부터 visual iteration까지 전체 흐름
- `document`: 기존 코드에서 디자인 문서 생성
- `extract`: reusable component/token 추출
- `critique`: hierarchy, clarity, emotional resonance 중심 디자인 리뷰
- `audit`: accessibility, performance, responsive 품질 검사
- `polish`: 최종 디자인 완성도 개선
- `layout`: spacing과 visual rhythm 개선
- `typeset`: typography 개선
- `colorize`: 색상 사용 개선
- `animate`: 목적 있는 motion 추가
- `harden`: error handling, i18n, text overflow, edge case 대응
- `adapt`: 여러 device 대응
- `optimize`: 성능 개선

### Anti-pattern과 자동 검사

Impeccable은 AI UI에서 반복적으로 나타나는 흔한 패턴과 일반적인 UI 품질 문제를 명시적으로 관리한다. 모든 요소를 카드로 만드는 패턴, 부적절한 easing, typography 문제, spacing, touch target, heading hierarchy 등을 점검할 수 있다.

또한 Claude Code, Codex, Cursor 등의 개발 흐름에 디자인 hook을 연결할 수 있고, 별도 detector를 통해 현재 프로젝트나 URL을 검사하는 형태도 제공한다. 공식 문서 기준 detector는 59개의 deterministic issue를 다룬다.

### 추천 상황

- 이미 운영 중인 UI를 지속적으로 개선할 때
- AI에게 디자인 리뷰 루프까지 맡기고 싶을 때
- 디자인 품질 검사를 자동화하고 싶을 때
- 한 번 생성하는 것보다 shape → build → critique → audit → polish 반복 과정이 중요할 때
- 프로젝트 디자인 컨텍스트를 문서로 유지하고 싶을 때

### 링크

- GitHub: https://github.com/pbakaus/impeccable
- 공식 사이트: https://impeccable.style/
- Detector 문서: https://impeccable.style/docs/detector

---

## 핵심 차이

### Taste = 어떤 감각으로 만들 것인가

시각적 결과가 AI스럽지 않도록 미감과 Art Direction을 강화한다. 새로운 UI를 만들 때 결과물의 개성을 높이는 데 가장 직접적이다.

### UI UX Pro Max = 무엇을 어떤 디자인 시스템으로 만들 것인가

제품 특성을 기반으로 스타일, 색상, typography, UX 규칙을 결정하고 이를 지속 가능한 Design System으로 만든다.

### Impeccable = 만든 결과물을 어떻게 검수하고 개선할 것인가

디자인 컨텍스트를 유지하면서 설계, critique, audit, polish를 반복하는 운영 프로세스에 강하다.

---

## 선택 가이드

- **AI 디자인이 너무 평범하다** → Taste Skill
- **프로젝트 전체 Design System이 필요하다** → UI UX Pro Max
- **기존 서비스 UI의 품질을 지속 관리한다** → Impeccable
- **WPF/WinUI 같은 Desktop UI까지 디자인 가이드가 필요하다** → UI UX Pro Max
- **이미지 reference → code 흐름이 필요하다** → Taste Skill
- **자동 design audit가 중요하다** → Impeccable

---

## 세 가지를 함께 사용하는 방법

세 스킬은 완전히 대체 관계가 아니므로 단계별 역할을 분리하면 같이 사용할 수 있다.

1. **UI UX Pro Max**로 제품에 맞는 Design System을 결정한다.
2. **Taste Skill**로 초기 구현의 Art Direction과 시각적 개성을 강화한다.
3. **Impeccable**로 critique, audit, polish, harden을 수행한다.

즉 다음처럼 볼 수 있다.

> UI UX Pro Max = 디자인 방향과 시스템
>
> Taste = 미감과 Art Direction
>
> Impeccable = 검수와 반복 개선

다만 세 스킬 모두 디자인 규칙에 개입하므로 동시에 모든 지침을 무조건 적용하기보다는 각 단계의 역할을 분리해서 사용하는 편이 충돌과 컨텍스트 증가를 줄이기 좋다.

## 출처

- Taste Skill GitHub: https://github.com/Leonxlnx/taste-skill
- Taste Skill Docs: https://www.tasteskill.dev/docs
- UI UX Pro Max GitHub: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Impeccable GitHub: https://github.com/pbakaus/impeccable
- Impeccable Website: https://impeccable.style/
