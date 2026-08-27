# Impeccable

> 설계-리뷰-감사-개선을 명령 단위로 제공하는 디자인 운영 워크플로

| 항목 | 내용 |
|---|---|
| 성격 | 디자인 운영 / 품질 검수 워크플로 |
| 핵심 역할 | 기존 UI 검수와 지속적인 품질 개선 |
| 가장 잘 맞는 용도 | 운영 중인 UI의 반복 개선 |

## 개요

Impeccable은 비교 대상 세 프로젝트 중 디자인 작업 프로세스 자체를 가장 적극적으로 도구화한 프로젝트다. 단순한 디자인 지침을 넘어서 초기 디자인 컨텍스트 정의, UX/UI 설계, 리뷰, 기술 감사, 폴리시, edge case 보강 등 전체 개선 흐름을 명령 단위로 제공한다.

## 프로젝트 디자인 컨텍스트

초기화 과정에서 UI가 마케팅/랜딩/포트폴리오 같은 brand surface인지 앱/대시보드/업무도구 같은 product surface인지 구분하고 이후 명령들이 공통으로 참조하는 제품 및 디자인 문서를 만든다.

## 대표 명령 역할

| 명령 | 역할 |
|---|---|
| `shape` | 구현 전 UX/UI 구조 설계 |
| `craft` | 설계부터 visual iteration까지 전체 흐름 |
| `document` | 기존 코드에서 디자인 문서 생성 |
| `extract` | reusable component/token 추출 |
| `critique` | hierarchy, clarity, emotional resonance 중심 디자인 리뷰 |
| `audit` | accessibility, performance, responsive 품질 검사 |
| `polish` | 최종 디자인 완성도 개선 |
| `layout` | spacing과 visual rhythm 개선 |
| `typeset` | typography 개선 |
| `colorize` | 색상 사용 개선 |
| `animate` | 목적 있는 motion 추가 |
| `harden` | error handling, i18n, text overflow, edge case 대응 |
| `adapt` | 여러 device 대응 |
| `optimize` | 성능 개선 |

## Anti-pattern과 자동 검사

Impeccable은 AI UI에서 반복적으로 나타나는 흔한 패턴과 일반적인 UI 품질 문제를 명시적으로 관리한다. 모든 요소를 카드로 만드는 패턴, 부적절한 easing, typography 문제, spacing, touch target, heading hierarchy 등을 점검할 수 있다.

또한 Claude Code, Codex, Cursor 등의 개발 흐름에 디자인 hook을 연결할 수 있고, 별도 detector를 통해 현재 프로젝트나 URL을 검사하는 형태도 제공한다. 공식 문서 기준 detector는 59개의 deterministic issue를 다룬다.

## 추천 상황

- 이미 운영 중인 UI를 지속적으로 개선할 때
- AI에게 디자인 리뷰 루프까지 맡기고 싶을 때
- 디자인 품질 검사를 자동화하고 싶을 때
- 한 번 생성하는 것보다 shape → build → critique → audit → polish 반복 과정이 중요할 때
- 프로젝트 디자인 컨텍스트를 문서로 유지하고 싶을 때

## 링크

- GitHub: https://github.com/pbakaus/impeccable
- 공식 사이트: https://impeccable.style/
- Detector 문서: https://impeccable.style/docs/detector

## 관련 문서

- [AI UI/UX 디자인 스킬 비교](../design-skills-comparison.md)
- [UI UX Pro Max](ui-ux-pro-max.md) — 디자인 시스템 결정 단계
- [Taste Skill](taste-skill.md) — 미감·Art Direction 단계
