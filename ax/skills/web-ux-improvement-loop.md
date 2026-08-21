# Web UX Improvement Loop

> 웹 프로젝트를 `점검 → 개선점 수집 → 개선 작업 → 재검증`까지 한 번에 수행하는 통합 스킬 설계

## 목적

기존 웹 프로젝트를 대상으로 UX/UI 품질을 자동 점검하고, 발견된 문제를 구조화된 개선 항목으로 정리한 뒤, 실제 코드 수정과 재검증까지 하나의 반복 루프로 수행한다.

## 추천 구성

| 도구 | 역할 |
|---|---|
| Impeccable | UX/UI audit, critique, polish, harden, adapt, optimize |
| Playwright MCP | 실제 브라우저 순회, 사용자 플로우, 인터랙션, 반응형 확인 |
| Chrome DevTools MCP | Console, Network, Performance, 런타임 문제 확인 |
| UI UX Pro Max | 개선안 설계, 디자인 시스템/패턴 참고 |
| Taste 계열 | 시각 완성도 및 AI스러운 UI 패턴 개선(선택) |

## 핵심 플로우

### 1. Inspect

- 프로젝트 구조와 UI 프레임워크 파악
- 실행 방법, 주요 라우트, 핵심 사용자 플로우 식별
- 기존 디자인 시스템/토큰/컴포넌트 규칙 확인

### 2. Audit

Impeccable 및 브라우저 도구를 사용해 다음을 점검한다.

- 정보 구조와 시각적 hierarchy
- 접근성
- semantic HTML / ARIA
- 키보드 탐색
- touch target
- typography
- spacing / alignment
- color / contrast
- responsive layout
- loading / empty / error 상태
- text overflow / i18n edge case
- navigation 및 사용자 플로우
- console error
- network failure
- 주요 performance 문제

### 3. Collect

모든 발견사항을 하나의 Issue 형식으로 정규화한다.

```text
ID: UX-001
Severity: Critical | High | Medium | Low
Category: Accessibility | UX | Visual | Responsive | Performance | Error
Page: /settings
Component: UserProfileForm
Problem: 저장 버튼의 disabled 상태가 시각적으로 구분되지 않음
Evidence: Playwright / Impeccable / DevTools
Impact: 사용자가 저장 가능 여부를 판단하기 어려움
Recommendation: disabled token 적용 및 aria-disabled 상태 확인
Files: src/.../UserProfileForm.tsx
Status: Open
```

### 4. Prioritize

우선순위 기본값:

1. 기능 사용을 막는 문제
2. 접근성/사용성 Critical, High
3. 모바일/반응형 깨짐
4. 주요 사용자 플로우 혼란
5. 시각적 일관성
6. polish 수준 개선

## 5. Improve

- 기존 디자인 시스템을 우선 재사용
- 새로운 컴포넌트/토큰 생성은 최소화
- 관련 이슈를 작은 변경 단위로 묶어서 수정
- UI UX Pro Max는 개선 패턴 결정에 사용
- Taste/Impeccable polish는 시각 완성도 개선에 선택적으로 사용

## 6. Verify

수정 후 반드시 동일한 경로를 다시 점검한다.

- 원래 재현 단계 실행
- Playwright 사용자 플로우 재실행
- desktop/mobile 확인
- accessibility 재검사
- console/network error 재확인
- 해당 Issue를 Resolved / Remaining / Regression으로 분류

## 7. Report

최종 결과 예시:

```text
UX/UI Review Complete

Found: 27
Fixed: 21
Remaining: 6
Critical: 0
High: 1
Medium: 3
Low: 2

Regression: 0
```

## 권장 반복 루프

```text
Inspect
  ↓
Audit
  ↓
Collect Issues
  ↓
Prioritize
  ↓
Improve
  ↓
Verify
  ↓
Remaining issues?
  ├─ Yes → Improve
  └─ No  → Report
```

## 스킬 이름 후보

- `web-ux-review`
- `web-ux-improve`
- `ux-improvement-loop`

추천: `web-ux-improve`

### 사용 예

```text
/web-ux-improve
/web-ux-improve http://localhost:3000
/web-ux-improve --scope settings
/web-ux-improve --audit-only
```

기본 실행은 `점검 → 개선점 수집 → 수정 → 재검증 → 결과 보고`까지 수행한다.

## 운영 원칙

- 첫 audit 결과만 보고 종료하지 않는다.
- 수정 후 반드시 같은 조건에서 재검증한다.
- UX 개선이라는 이유로 제품 요구사항이나 비즈니스 로직을 임의 변경하지 않는다.
- 큰 구조 변경은 별도 개선 항목으로 분리한다.
- 자동 수정이 위험한 경우에는 Issue만 기록하고 코드 수정은 보류한다.
- 최종 보고에는 미해결 이슈와 수정 파일을 명확히 남긴다.

## 관련 문서

- [Impeccable](impeccable.md)
- [UI UX Pro Max](ui-ux-pro-max.md)
- [Taste Skill](taste-skill.md)
