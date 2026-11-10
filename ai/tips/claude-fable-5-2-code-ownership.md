---
title: Claude Fable 5.2 코드 소유권 프롬프트 설계
category: ai/tips
tags: [claude, fable-5-2, prompt-engineering, coding-agent, code-ownership]
source: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#say-who-owns-the-code
updated: 2026-11-11
---

# Claude Fable 5.2: 코드 소유권 선언이 코딩 에이전트에 미치는 영향

## 핵심 요약
Anthropic 공식 가이드에 따르면 코딩 에이전트에게 코드베이스를 스스로 소유하고 계속 유지할 대상으로 설명하면, 기존 코드를 단순히 확장하는 대신 중복 구현을 통합하고 관련 결함을 함께 수정하는 경향이 커진다. 다만 불필요한 변경과 토큰 소비도 증가할 수 있어 적용 범위를 선택해야 한다.

## 공식 문서에서 확인된 사실
- 코드 소유권이 명시되지 않았거나 타인의 코드로 설명되면 기존 구조에 코드를 덧붙이고 주변 문제를 보고만 하는 경향이 있었다.
- 소유권 선언 문장: `This codebase is yours: what it's for and how it's built are your call, and you'll keep building on it.`
- Anthropic의 소규모 코딩 실험에서 중복 코드 통합은 선언 사용 시 약 절반, 미사용 시 10% 미만이었다. 작업별 차이가 있으며 일반적인 성공률로 해석해서는 안 된다.
- 선언 사용 시 출력 토큰이 약 1.5배였으며 요청하지 않은 테스트·문서 등의 변경도 늘었다.
- 선언 사용 조건에서 기존 기능 동작이 바뀐 사례는 대략 6~10회 중 1회였다(버그 수정 제외).
- 별도의 'drive-by refactor 금지' 지시가 있어도 소유권 선언의 효과가 완전히 없어지지 않았다.
- 공식 가이드는 사용자 소유 코드를 최소한만 수정해야 하는 상황에서는 이 문장을 빼라고 권고한다.

## 작동 방식 해석
이 선언은 법적 저작권·소유권 이전이 아니라 에이전트의 역할과 코드 수정 태도를 유도하는 프롬프트다. '기능을 구현하는 외부 기여자'보다 '장기적으로 유지보수하는 담당자'로 행동하도록 유도할 수 있다. 이는 실험 관찰을 바탕으로 한 해석이며 내부 메커니즘이 검증된 것은 아니다.

## 적용 판단
| 상황 | 권장 |
| --- | --- |
| 신규 프로젝트, 구조 개선, 중복 제거 | 소유권 선언 검토 |
| 레거시 운영 코드, 최소 변경 패치 | 소유권 선언 생략 |
| 보안·결제·권한 관련 코드 | 명시적 승인 경계와 diff 리뷰 필수 |
| 자동 실행형 코딩 에이전트 | 테스트·변경 범위·보고 규칙을 함께 설정 |

## 제안 프롬프트
```text
This codebase is yours to maintain and improve over time.
Take responsibility for architecture, consistency, maintainability, and correctness.
Reuse and consolidate existing implementations rather than duplicating code.
Fix directly related defects needed to complete the task.
Preserve public APIs and user-facing behavior unless explicitly authorized to change them.
Avoid unrelated refactoring, renaming, and cleanup.
Run relevant tests, inspect the diff, and report meaningful changes.
Ask for approval before destructive or security-sensitive changes.
```

**주의:** 위 조합은 실무용 제안이지 Anthropic이 전체를 실험으로 검증한 프롬프트는 아니다. 변경 제한 문구만으로 소유권 선언에 따른 확장 수정이 방지되지는 않을 수 있다.

## 검증 및 운영 권장
1. 동일한 코딩 과제를 선언 사용/미사용 두 조건에서 비교한다.
2. 중복 제거율, 기능 테스트 통과, 의도하지 않은 diff, 출력 토큰을 측정한다.
3. 작업 위험도에 따라 프롬프트를 분리하고 승인 절차를 유지한다.
4. 최종 요약만 신뢰하지 말고 실제 diff를 확인한다.

## 출처
- Anthropic, [Prompting Claude Fable 5.2 — Say who owns the code](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-2#say-who-owns-the-code)
- 원본 확인일: 2026-11-11
