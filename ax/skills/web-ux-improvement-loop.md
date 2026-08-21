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

### 0. Auth Bootstrap

점검 대상 페이지가 로그인을 요구하면 Audit 전에 인증 상태를 준비한다.

권장 우선순위:

1. 기존 Playwright MCP persistent profile 재사용
2. 저장된 `storageState` 재사용
3. 테스트 계정으로 자동 로그인
4. SSO/MFA 등 자동화가 어려운 경우 최초 1회 수동 로그인 후 세션 저장

Playwright는 쿠키와 localStorage 기반 인증 상태를 저장하고 이후 세션에서 복원할 수 있다. Playwright MCP의 기본 persistent profile을 사용할 경우 프로젝트별 브라우저 프로필에 로그인 상태와 쿠키가 유지될 수 있다.

예시 운영 구조:

```text
/web-ux-improve http://localhost:3000
        │
        ▼
Auth required?
   ├─ No → Inspect
   └─ Yes
       ├─ Valid saved session → Restore
       ├─ Test credentials available → Login automatically
       └─ SSO/MFA/manual auth → User logs in once → Save session
        │
        ▼
Inspect → Audit → Collect → Improve → Verify
```

### 인증 정보 보안 원칙

- 비밀번호를 `SKILL.md`, 프롬프트, 소스코드에 직접 기록하지 않는다.
- 계정 정보가 필요한 경우 환경변수 또는 별도 secret store를 사용한다.
- `playwright/.auth/`, `auth-state.json` 등 인증 상태 파일은 Git에 커밋하지 않는다.
- 인증 상태 파일에는 실제 세션 쿠키/헤더가 포함될 수 있으므로 비밀정보로 취급한다.
- 가능하면 운영 계정 대신 UX/UI 점검용 테스트 계정을 사용한다.
- 데이터 생성/삭제 권한이 큰 관리자 계정 사용은 피한다.

### SSO / MFA 처리

사내 SSO, Microsoft/Google OAuth, OTP, MFA 등은 매번 완전 자동화하지 않는 편이 안전하다.

권장 방식은 최초 실행 때 사용자가 브라우저에서 직접 인증하고, 인증 완료 후 Playwright가 해당 로그인 상태를 저장하여 이후 점검에서 재사용하는 방식이다. 세션이 만료되면 다시 인증을 수행한다.

### 권한별 UI 점검

역할별 UI가 다르면 인증 상태를 분리해서 관리할 수 있다.

```text
playwright/.auth/
├─ user.json
├─ manager.json
└─ admin.json
```

각 역할에 대해 동일한 점검 루프를 수행해 권한별 네비게이션, 버튼 노출, 접근 제어, 빈 상태 등을 검증한다.

### 1. Inspect

- 프로젝트 구조와 UI 프레임워크 파악
- 실행 방법, 주요 라우트, 핵심 사용자 플로우 식별
- 기존 디자인 시스템/토큰/컴포넌트 규칙 확인
- 인증이 필요한 route와 역할별 접근 범위 확인

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
- login/logout/session-expired UX
- 권한 부족/접근 거부 UX
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
3. 인증/권한/세션 관련 UX 문제
4. 모바일/반응형 깨짐
5. 주요 사용자 플로우 혼란
6. 시각적 일관성
7. polish 수준 개선

## 5. Improve

- 기존 디자인 시스템을 우선 재사용
- 새로운 컴포넌트/토큰 생성은 최소화
- 관련 이슈를 작은 변경 단위로 묶어서 수정
- UI UX Pro Max는 개선 패턴 결정에 사용
- Taste/Impeccable polish는 시각 완성도 개선에 선택적으로 사용
- 로그인 방식, 인증 정책, 권한 정책 자체는 UX 개선을 이유로 임의 변경하지 않는다.

## 6. Verify

수정 후 반드시 동일한 경로와 동일한 인증 역할에서 다시 점검한다.

- 원래 재현 단계 실행
- Playwright 사용자 플로우 재실행
- desktop/mobile 확인
- accessibility 재검사
- login/logout/session-expired 상태 확인
- console/network error 재확인
- 해당 Issue를 Resolved / Remaining / Regression으로 분류

## 7. Report

최종 결과 예시:

```text
UX/UI Review Complete

Roles inspected: user, manager
Pages inspected: 14
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
Auth Bootstrap
  ↓
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
/web-ux-improve --role admin
```

기본 실행은 `인증 준비 → 점검 → 개선점 수집 → 수정 → 재검증 → 결과 보고`까지 수행한다.

## 운영 원칙

- 첫 audit 결과만 보고 종료하지 않는다.
- 수정 후 반드시 같은 조건에서 재검증한다.
- UX 개선이라는 이유로 제품 요구사항이나 비즈니스 로직을 임의 변경하지 않는다.
- 큰 구조 변경은 별도 개선 항목으로 분리한다.
- 자동 수정이 위험한 경우에는 Issue만 기록하고 코드 수정은 보류한다.
- 최종 보고에는 미해결 이슈와 수정 파일을 명확히 남긴다.
- 인증 정보와 인증 상태 파일은 비밀정보로 취급한다.

## 관련 문서

- [Impeccable](impeccable.md)
- [UI UX Pro Max](ui-ux-pro-max.md)
- [Taste Skill](taste-skill.md)
