# Sentry Flutter PII 마스킹 — copyWith(user: null) 함정

> 2026-06-11, card-radar / baby_calendar / Crewith 공통 모니터링 구축 중 발견

## 문제

Sentry `beforeSend`에서 사용자 정보를 제거하려고 흔히 이렇게 작성한다:

```dart
options.beforeSend = (event, hint) {
  return event.copyWith(user: null); // ❌ 동작하지 않음
};
```

**Dart의 `copyWith` 관례는 `null` 인자를 "변경 없음"으로 처리한다** (`user: user ?? this.user`). 즉 `user: null`을 전달해도 기존 user가 그대로 유지되어, PII가 마스킹되지 않은 채 Sentry로 전송된다. 코드 리뷰 없이는 알아채기 어렵다 — 이벤트는 정상 수신되고, user 필드가 남아 있는지 대시보드에서 확인해야만 보인다.

## 해결

sentry_flutter **v9부터 SentryEvent가 mutable**로 바뀌었고 (copyWith는 deprecated), 직접 대입이 공식 패턴이다:

```dart
options.beforeSend = (event, hint) {
  event.user = null;                       // ✅ v9 mutable API
  event.breadcrumbs = event.breadcrumbs
      ?.map(scrubBreadcrumb)               // data 키 필터 + message 마스킹
      .toList();
  return event;
};
```

- 출처: [Flutter Migration Guide](https://docs.sentry.io/platforms/dart/guides/flutter/migration/), [Filtering 문서](https://docs.sentry.io/platforms/flutter/configuration/filtering/)

## 원칙 (defense-in-depth)

1. **1차: PII를 처음부터 붙이지 않는다** — `Sentry.setUser()` 호출 금지, 민감 데이터(카드번호, 아동 이름·생년월일, 전화번호, 토큰)를 breadcrumb·로그에 남기지 않는다.
2. **2차: beforeSend 필터** — 민감 키워드 목록으로 breadcrumb data 키 제거 + message 마스킹.

전체 표준 구성(스택별 코드, 샘플링, DSN 주입 규칙)은 워크스페이스 팀 위키 참조:
`D:\workspace\teams\software-team\wiki\ops\sentry-standard.md`

## 함께 알아둘 것

- **무료 Developer 플랜: 월 5,000 에러 이벤트** 한도, 초과분은 과금 없이 폐기. 프로젝트 여러 개를 한 조직에 두면 합산 소진된다.
- Flutter는 release를 패키지 정보에서 자동 태깅(`패키지명@버전+빌드`) — `options.release` 수동 설정 불필요.
- Next.js는 `withSentryConfig`가 빌드 시 release 자동 생성(기본: git SHA).
- `@sentry/nextjs` v10은 `instrumentation-client.ts`에 `onRouterTransitionStart` export를 요구한다 (빌드 로그에 ACTION REQUIRED로 표시됨).
