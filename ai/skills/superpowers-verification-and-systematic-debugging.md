# Superpowers: Verification Before Completion & Systematic Debugging

> Superpowers의 품질 통제 핵심 Skill 2종 정리

## 한 줄 요약

- **`verification-before-completion`**: 완료했다고 말하기 전에 반드시 최신 검증 명령을 실행하고 결과를 증거로 확인한다.
- **`systematic-debugging`**: 수정부터 하지 않고, 재현·증거 수집·원인 추적을 통해 Root Cause를 먼저 찾은 뒤 최소 수정으로 해결한다.

---

## 6. 검증 강제 — `verification-before-completion`

핵심 원칙은 **Evidence before claims**다.

```text
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

즉, 에이전트가 단순히 "수정했습니다", "테스트 통과합니다", "완료했습니다"라고 말하는 것을 허용하지 않는다.

완료를 주장하기 전에 다음 절차를 거친다.

1. 무엇을 실행하면 완료를 증명할 수 있는지 정한다.
2. 해당 검증 명령을 현재 시점에 다시 실행한다.
3. 전체 출력과 exit code, 실패 개수를 확인한다.
4. 실제 결과가 주장과 일치하는지 확인한다.
5. 그 뒤에만 완료/성공을 말한다.

예시:

```text
테스트 통과 주장 → 실제 test command 실행 + 0 failures 확인
빌드 성공 주장   → 실제 build command 실행 + exit code 0 확인
버그 수정 주장   → 원래 재현 절차/회귀 테스트가 실제로 통과하는지 확인
Agent 완료 주장  → Agent 보고만 믿지 않고 diff와 결과를 직접 검증
```

### 막으려는 전형적인 문제

```text
"이제 될 겁니다"
"코드를 수정했으니 해결됐습니다"
"린터가 통과했으니 빌드도 괜찮습니다"
"Subagent가 성공했다고 했습니다"
```

이런 추정형 완료 보고를 금지하고 **검증 결과를 근거로 상태를 보고**하게 만드는 Skill이다.

---

## 7. 체계적 디버깅 — `systematic-debugging`

핵심 원칙은 **Root Cause를 찾기 전에는 수정하지 않는다**는 것이다.

```text
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

에러가 발생하면 "아마 이거겠지" 식으로 코드를 바꾸는 대신 다음 4단계로 진행한다.

### Phase 1 — Root Cause Investigation

- 에러/경고/Stack Trace를 끝까지 읽기
- 문제를 안정적으로 재현하기
- 최근 diff/commit/config/dependency 변화 확인
- 여러 컴포넌트가 연결된 시스템이면 경계마다 입력/출력/환경값을 로깅
- 잘못된 값이 어디서 시작됐는지 call/data flow를 역추적

### Phase 2 — Pattern Analysis

- 같은 코드베이스에서 정상 동작하는 유사 사례 찾기
- 레퍼런스 구현과 비교
- 정상 사례와 문제 사례의 차이를 모두 나열
- 필요한 설정, 환경, 의존성을 확인

### Phase 3 — Hypothesis & Testing

```text
"원인은 X이고, 근거는 Y다"
```

형태로 하나의 가설을 세운 뒤, 가장 작은 변경으로 한 변수만 검증한다.

가설이 틀리면 수정을 덧붙이지 않고 새로운 가설로 돌아간다.

### Phase 4 — Implementation

- 재현 가능한 실패 테스트를 먼저 만든다.
- Root Cause를 해결하는 하나의 수정만 적용한다.
- 전체 테스트와 실제 증상을 다시 검증한다.
- 완료 선언 전 `verification-before-completion`을 적용한다.

특히 **3번 이상 수정이 실패하면 더 이상 땜질하지 않고 아키텍처 자체를 의심**하도록 규정한다.

---

## 두 Skill의 관계

둘은 순서대로 연결된다.

```text
Bug / Failure
   ↓
systematic-debugging
   ↓
Root Cause 확인
   ↓
최소 수정
   ↓
verification-before-completion
   ↓
실제 테스트/빌드/재현 검증
   ↓
완료 보고
```

즉,

```text
systematic-debugging          = 어떻게 제대로 고칠 것인가
verification-before-completion = 정말 고쳐졌는지 어떻게 증명할 것인가
```

Superpowers가 일반적인 AI Coding Agent보다 강한 부분이 바로 이 두 지점이다. **추측성 수정**과 **근거 없는 완료 보고**를 각각 별도의 Skill로 막는다.

## 실무적으로 기대되는 효과

- Agent의 "수정 완료" 오판 감소
- 연쇄적인 임시 수정/땜질 감소
- CI/빌드/통합 문제에서 원인 위치를 빠르게 좁힘
- Subagent 결과를 메인 Agent가 다시 검증
- 회귀 버그 가능성 감소
- 디버깅 과정 자체가 재현 가능하고 리뷰 가능한 형태로 남음

## 참고

- Superpowers repository: https://github.com/obra/superpowers
- Verification Before Completion: https://github.com/obra/superpowers/tree/main/skills/verification-before-completion
- Systematic Debugging: https://github.com/obra/superpowers/tree/main/skills/systematic-debugging

## 관련 문서

- [GSD Core vs Superpowers](./gsd-core-vs-superpowers.md)
