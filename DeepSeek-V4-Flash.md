# DeepSeek-V4-Flash

> Tags: #AI #AX #LLM #DeepSeek #Agent #Coding #Claude #Opus #Fable #Harness

## 한줄 요약

DeepSeek-V4-Flash-0731은 단독 만능 모델보다 **Claude Opus/Fable을 상위 판단 계층으로 두고, 반복 구현·도구 호출·빌드/테스트를 담당하는 저비용 Worker**로 사용할 때 강점이 극대화된다.

## 추천 하네스: Claude Opus / Fable + DeepSeek V4 Flash

### 핵심 원칙

- **Fable**: 행동 규율, 문제 정의, 작업 종료 조건, 검증 철학
- **Opus**: 복잡한 분석, 설계, 계획, arbitration, 최종 판단
- **DeepSeek V4 Flash**: 코드 탐색, 구현, 수정, Tool Call, Build/Test 반복
- **Harness**: 모델이 역할을 넘지 못하도록 단계와 증거 기반 검증을 강제

Fable Harness 계열의 핵심은 특정 모델의 지능을 복제하는 것이 아니라 OODA, assumption 명시, adversarial review, 실제 테스트 증거 같은 절차를 시스템 수준에서 강제하는 것이다.

## 전체 구조

```text
User Request
    │
    ▼
┌──────────────────────────────┐
│ Intake / Harness             │
│ 목표·제약·완료조건 정의      │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ Claude Opus / Fable          │
│ ANALYZE + PLAN               │
│                              │
│ - 요구사항 해석              │
│ - 코드/증거 조사             │
│ - 위험요소 식별              │
│ - Architecture 판단          │
│ - PLAN/TASK 생성             │
└──────────────┬───────────────┘
               ▼
        TASK CONTRACT
               │
     ┌─────────┼─────────┐
     ▼         ▼         ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Flash A │ │ Flash B │ │ Flash C │
│ 구현    │ │ Test    │ │ 조사    │
└────┬────┘ └────┬────┘ └────┬────┘
     └───────────┼────────────┘
                 ▼
┌──────────────────────────────┐
│ Verification Gate            │
│ Build / Test / Lint / Diff   │
└──────────────┬───────────────┘
        PASS   │   FAIL
          ┌────┘     └──────┐
          ▼                 ▼
┌──────────────────┐   Flash Retry
│ Opus / Fable     │       │
│ Final Review     │   retry limit
└────────┬─────────┘       │
         │                 ▼
         │          Opus Escalation
         ▼
       DONE
```

## 역할 분담

| 단계 | 담당 | 이유 |
|---|---|---|
| 요구사항 해석 | Opus/Fable | 모호성 처리와 판단 필요 |
| Repository 탐색 | Opus + Flash | 초기 구조 판단은 Opus, 상세 탐색은 Flash |
| Architecture | Opus | 잘못된 설계는 이후 비용을 크게 증가시킴 |
| Task 분해 | Opus/Fable | Flash에 작은 검증 가능 단위 제공 |
| 코드 구현 | V4 Flash | 비용 대비 Agentic Coding 성능 우수 |
| 반복 수정 | V4 Flash | 가장 비용을 많이 소모하는 구간 |
| Build/Test | Flash + deterministic tools | 모델 판단보다 실제 실행 결과 우선 |
| 실패 원인 1차 분석 | V4 Flash | 반복 작업에 적합 |
| 복잡 실패 분석 | Opus | Flash 반복 실패 시 escalation |
| 최종 Diff Review | Opus/Fable | 구조·누락·회귀 검토 |
| 승인/배포 | Human | 고위험 작업은 자동화하지 않음 |

## Task Contract

Opus가 Flash에게 자연어 요청만 전달하지 않고 명시적인 계약을 만든다.

```yaml
objective: 구현해야 할 결과
scope:
  allowed_files: []
  forbidden_files: []
constraints: []
acceptance:
  - build succeeds
  - tests pass
  - no unrelated changes
commands:
  build: ...
  test: ...
risk_level: medium
retry_limit: 3
escalate_when:
  - architecture change required
  - destructive operation required
  - same failure repeated twice
```

Flash는 이 계약 안에서만 작업한다.

## 실행 루프

### 1. OBSERVE — Opus/Fable

바로 코드를 수정하지 않는다.

- 실제 파일 읽기
- 관련 코드 검색
- 기존 패턴 확인
- 테스트/빌드 상태 확인
- 추측과 확인된 사실 분리

### 2. ORIENT — Opus/Fable

작업을 검증 가능한 단위로 분해한다.

```text
TASK-01 interface 수정
TASK-02 implementation
TASK-03 unit tests
TASK-04 integration verification
```

각 Task는 가능하면 Flash가 한 세션에서 완료 가능한 크기로 제한한다.

### 3. ACT — DeepSeek V4 Flash

Flash의 책임은 생각의 범위를 확장하는 것이 아니라 **정의된 Task를 끝내는 것**이다.

```text
Read → Edit → Build → Test → Inspect → Fix
```

작업 중 새로운 Architecture 결정이 필요하면 임의로 결정하지 않고 `ESCALATE`한다.

### 4. VERIFY — Deterministic Gate

모델의 “완료했습니다”를 신뢰하지 않는다.

최소 검증:

```text
Build exit code == 0
Tests == PASS
Lint/static analysis == PASS
Git diff 범위 == Task scope
```

### 5. REVIEW — Opus/Fable

Opus는 전체 코드를 다시 만드는 것이 아니라 결과를 감사한다.

- 요구사항 누락
- Architecture 위반
- 불필요한 변경
- 오류 처리
- 테스트 충분성
- 보안/성능 문제

문제가 작으면 Flash에게 재작업시키고, 구조 문제면 Opus가 Plan을 수정한다.

## Retry / Escalation 정책

```text
Flash Attempt #1
   ↓ FAIL
Flash 자체 원인 분석 + Retry
   ↓ FAIL
Flash Attempt #2
   ↓ FAIL (동일 원인)
Opus Escalation
   ↓
Plan 수정 또는 직접 해결
```

권장 기본값은 Flash 최대 2~3회다. 싼 모델이라고 무한 반복시키면 Context 오염과 잘못된 수정이 누적될 수 있다.

즉 **비용 제한보다 실패 패턴 제한이 중요하다.**

## Context 전략

모델끼리 전체 대화 Context를 공유하지 않는다.

공유 상태는 파일 기반으로 유지한다.

```text
.agent/
 ├─ SPEC.md
 ├─ PLAN.md
 ├─ TASKS/
 │   ├─ 001.md
 │   └─ 002.md
 ├─ STATE.md
 ├─ EVIDENCE/
 │   ├─ build.log
 │   └─ test.log
 └─ REVIEW.md
```

Flash에게는 현재 TASK + 필요한 파일 + 관련 증거만 전달한다. 1M context를 사용할 수 있어도 모든 히스토리를 계속 넣는 방식은 피한다.

## Multi-Agent 확장

서로 독립적인 작업만 병렬화한다.

```text
              Opus Planner
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
 Flash-Code   Flash-Test   Flash-Research
       │           │           │
       └───────────┼───────────┘
                   ▼
             Verification
                   ▼
              Opus Review
```

같은 파일을 여러 Flash가 동시에 수정하는 구조는 기본적으로 금지한다.

## Fable식 Adversarial Review

중요 변경은 하나의 Reviewer 판단에만 의존하지 않는다.

- **Skeptic**: 근거가 충분한가?
- **Red Team**: 어떤 방식으로 깨질 수 있는가?
- **Simplifier**: 더 단순한 구현이 가능한가?

저위험 변경은 Flash reviewer를 사용할 수 있고, Architecture/보안/대규모 변경은 Opus가 arbitration한다.

## Model Router

```text
LOW
문서 생성 / 단순 수정 / 반복 작업
→ Flash

MEDIUM
일반 기능 구현 / 버그 수정
→ Opus Plan → Flash Execute

HIGH
Architecture / 복잡 장애 / 보안
→ Opus 직접 분석
→ Flash 보조
→ Opus Review

CRITICAL
배포 / 데이터 삭제 / 인프라 변경
→ Opus + Human Approval
```

## Guardrail

Flash Worker에는 다음을 기본 적용한다.

- Task scope 밖 파일 수정 금지
- 삭제/대량 rename 승인 필요
- git push 금지
- production deploy 금지
- secret 접근 금지
- Build/Test 결과 원문 저장
- 실패를 성공으로 표현하지 못하도록 exit code 확인
- 작업 전후 `git diff` 검사
- 동일 오류 반복 시 escalation

## 비용 최적화 포인트

가장 비싼 토큰은 구현 과정의 반복에서 발생한다.

기존:

```text
Opus
Analyze → Code → Build → Error → Fix → Build → Error → Fix → Review
```

추천:

```text
Opus
Analyze → Plan
          │
          ▼
Flash
Code → Build → Fix → Build → Test → Fix
          │
          ▼
Opus
Review
```

즉 Opus 토큰을 **판단력이 필요한 구간**에 집중시키고 Flash 토큰을 **시행착오가 많은 구간**에 사용한다.

## 추천 기본 구성

```yaml
planner: claude-opus
executor: deepseek-v4-flash-0731
reviewer: claude-opus
cheap_reviewer: deepseek-v4-flash-0731

execution:
  max_retries: 3
  parallel_workers: 3
  require_build: true
  require_tests: true

approval:
  delete: human
  deploy: human
  push: human
  architecture_change: opus
```

## 도입 순서

1. 단일 `Opus → Flash → Opus` 루프부터 시작
2. TASK Contract 도입
3. Build/Test Verification Gate 추가
4. Retry/Escalation 자동화
5. Context를 TASK 단위로 격리
6. 독립 작업에 한해 Flash Worker 병렬화
7. Fable식 adversarial review 추가
8. 작업 유형별 Model Router 적용

처음부터 복잡한 Multi-Agent 시스템을 만드는 것보다 **단일 Planner/Executor/Reviewer 루프의 성공률과 비용을 먼저 측정**하는 편이 좋다.

## 평가 지표

- Task Success Rate
- First-pass Build Rate
- Test Pass Rate
- Flash Retry Count
- Opus Escalation Rate
- Human Intervention Rate
- 작업당 Opus token
- 작업당 Flash token
- 작업 완료 시간
- 잘못 수정한 파일 수
- Regression 발생률

핵심 KPI는 **Opus 사용량을 얼마나 줄였는가가 아니라 동일 품질을 유지하면서 Opus가 판단에만 집중하게 되었는가**이다.

## 결론

가장 추천하는 형태는 다음 한 줄로 정리된다.

> **Fable의 작업 규율 + Opus의 판단력 + DeepSeek V4 Flash의 실행 가성비 + 실제 Build/Test 기반 검증**

DeepSeek V4 Flash 0731은 공식 모델 카드에서도 이전 Flash보다 agentic capability가 크게 향상됐으며 TerminalBench 2.1 82.7, Toolathlon-Verified 70.3 등 Tool/Agent 작업에서 강한 결과를 보인다. 따라서 Opus/Fable을 완전히 대체하기보다 반복 실행 계층을 분리하는 것이 합리적이다.

## 참고 링크

- DeepSeek V4 Flash 0731: https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731
- Fable Harness: https://github.com/Miguok/fable-harness
- Opus Fable Playbook: https://github.com/rennf93/opus-fable-playbook
- Anthropic Claude Code Model Configuration: https://support.claude.com/en/articles/11940350-claude-code-model-configuration
