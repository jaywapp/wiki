# UI UX Pro Max

> 디자인 지식 데이터베이스 + Design System Generator

| 항목 | 내용 |
|---|---|
| 성격 | 디자인 지식 검색 / Design System 생성 Skill |
| 핵심 역할 | 제품별 디자인 방향과 일관성 확립 |
| 가장 잘 맞는 용도 | 프로젝트 시작 시 디자인 시스템 결정 |

## 개요

UI UX Pro Max는 디자인 지식 데이터베이스와 추천/추론 엔진 성격이 강하다. 제품 요구사항을 분석해서 적합한 UI 스타일, 색상, 폰트, UX 규칙, chart, page pattern, framework별 구현 가이드 등을 선택하도록 AI를 돕는다.

Taste가 `좋은 취향으로 만들어라`에 가깝다면 UI UX Pro Max는 `이 제품에는 어떤 디자인 시스템이 적합한지 근거를 찾아 결정하라`에 가깝다.

## Design System Generator

v2 계열의 핵심 기능은 프로젝트 요구사항에 맞는 Design System을 생성하는 것이다. 생성된 규칙은 프로젝트의 master 디자인 문서와 페이지별 override 구조로 저장할 수 있어 여러 세션과 여러 페이지에 걸쳐 디자인 일관성을 유지하기 좋다.

## 주요 특징

- 제품 유형 기반 디자인 시스템 생성
- UI style, palette, typography, UX rule 검색
- 디자인 시스템을 프로젝트 문서로 지속 관리 가능
- 페이지별 override 가능
- 구현 전후 anti-pattern 검사
- 다양한 UI framework에 대한 stack-specific guideline 제공

## 지원 범위

| 영역 | 지원 스택 |
|---|---|
| 웹 | HTML/Tailwind, React, Next.js, shadcn/ui, Vue, Nuxt, Angular, Laravel, Svelte, Astro, Three.js |
| Desktop | JavaFX, WPF, WinUI 3, Avalonia, Uno Platform, UWP |
| Mobile / Cross-platform | SwiftUI, Jetpack Compose, React Native, Flutter |

특히 WPF와 WinUI 등 데스크톱 UI까지 명시적으로 다룬다는 점은 Taste와 Impeccable 대비 눈에 띄는 특징이다.

## 추천 상황

- 프로젝트 시작 시 디자인 시스템까지 같이 정하고 싶을 때
- AI가 색상이나 폰트를 임의로 고르는 것을 줄이고 싶을 때
- 여러 페이지 간 디자인 일관성이 중요할 때
- 웹 외에 WPF/WinUI/Flutter 등의 UI도 함께 다룰 때
- 디자인 규칙을 문서화해서 이후 AI 세션에서도 재사용하고 싶을 때

## 링크

- GitHub: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- 공식 사이트: https://www.uupm.cc/

## 관련 문서

- [AI UI/UX 디자인 스킬 비교](../design-skills-comparison.md)
- [Taste Skill](taste-skill.md) — 미감·Art Direction 단계
- [Impeccable](impeccable.md) — 검수·반복 개선 단계
