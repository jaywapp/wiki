---
title: Claude Opus / Fable + DeepSeek V4 Flash Harness
category: harness
tags:
  - ai
  - agent
  - harness
  - claude
  - opus
  - fable
  - deepseek
source: https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731
updated: 2026-08-27
---

# Claude Opus / Fable + DeepSeek V4 Flash Harness

> **Fable의 작업 규율 + Opus의 판단력 + DeepSeek V4 Flash의 실행 가성비 + 실제 Build/Test 기반 검증**을 결합하는 개발 Agent Harness.

## 핵심 원칙

- **Fable**: 행동 규율, 문제 정의, 가정 명시, 작업 종료 조건, 검증 철학
- **Claude Opus**: 복잡한 분석, Architecture, 계획, arbitration, 최종 판단
- **DeepSeek V4 Flash**: 코드 탐색, 구현, 수정, Tool Call, Build/Test 반복
- **Harness**: 역할 경계, Task Contract, Retry, Escalation, Evidence를 강제

핵심 목표는 단순히 Opus 사용량을 줄이는 것이 아니다. **Opus는 판단에 집중시키고 Flash는 시행착오가 많은 실행을 담당하게 한다.**

## 전체 구조

```text
                  USER
                    │
                    ▼
        ┌─────────────────────┐
        │   HARNESS / INTAKE  │
        │ 목표 / 제약 / 완료조건 │
        └──────────┬──────────┘
                   ▼
        ┌─────────────────────┐
        │   OPUS / FABLE      │
        │ Observe / Analyze   │
        │ Architecture / Plan │
        │ Task Decomposition  │
        └──────────┬──────────┘
                   │
              TASK CONTRACT
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
       Flash     Flash     Flash
       CODE      TEST      RESEARCH
          │        │        │
          └────────┼────────┘
                   ▼
        ┌─────────────────────┐
        │ VERIFICATION GATE   │
        │ Build / Test / Diff │
        └──────────┬──────────┘
             PASS  │  FAIL
              │    └──→ Flash Retry
              │              │
              │        2~3회 실패
              │              ▼
              │        OPUS ESCALATE
              ▼
        ┌─────────────────────┐
        │    OPUS / FABLE     │
        │    FINAL REVIEW     │
        └──────────┬──────────┘
                   ▼
                  DONE
```

## 역할 분담

| 영역 | 담당 |
|---|---|
| 요구사항 해석 | Opus/Fable |
| Architecture | Opus |
| Task 분해 | Opus/Fable |
| 코드 구현 | V4 Flash |
| Tool/MCP/CLI 실행 | V4 Flash |
| Build → Fix 반복 | V4 Flash |
| Test 생성/수정 | V4 Flash |
| 복잡한 실패 분석 | Opus Escalation |
| 최종 Diff Review | Opus/Fable |
| 배포/삭제 등 고위험 작업 | Human Approval |

## Task Contract

Opus가 Flash에게 단순 자연어 지시를 넘기지 않고 검증 가능한 계약을 만든다.

```yaml
objective: Submit Dialog validation 개선
scope:
  allowed_files:
    - SubmitDialogViewModel.cs
    - SubmitValidator.cs
  forbidden_files:
    - '*.csproj'
    - infrastructure/*
constraints:
  - 기존 public API 변경 금지
  - 신규 dependency 금지
acceptance:
  - build succeeds
  - tests pass
  - 기존 behavior 유지
  - unrelated diff 없음
commands:
  build: dotnet build
  test: dotnet test
retry_limit: 3
escalate_when:
  - architecture 변경 필요
  - scope 밖 수정 필요
  - 동일 오류 2회 반복
```

Flash는 계약 범위 안에서만 작업한다.

## 실행 루프

### 1. Observe — Opus/Fable

바로 코드를 수정하지 않는다.

- 실제 파일 읽기
- 관련 코드 검색
- 기존 패턴 확인
- 테스트/빌드 상태 확인
- 추측과 확인된 사실 분리

### 2. Orient / Plan — Opus/Fable

작업을 Flash가 한 세션에서 끝낼 수 있는 검증 가능한 Task로 분해한다.

```text
TASK-01 interface 수정
TASK-02 implementation
TASK-03 unit tests
TASK-04 integration verification
```

### 3. Act — DeepSeek V4 Flash

Flash는 정의된 Task를 실행한다.

```text
Read → Edit → Build → Test → Inspect → Fix
```

새로운 Architecture 결정이나 Scope 확대가 필요하면 임의로 처리하지 않고 `ESCALATE`한다.

### 4. Verify — Deterministic Gate

모델의 완료 선언을 그대로 신뢰하지 않는다.

```text
Build exit code == 0
Tests == PASS
Lint/static analysis == PASS
Git diff 범위 == Task scope
```

### 5. Review — Opus/Fable

Opus는 구현을 다시 하는 대신 결과를 감사한다.

- 요구사항 누락
- Architecture 위반
- 불필요한 변경
- 오류 처리
- 테스트 충분성
- 보안/성능 문제

작은 문제는 Flash에 재작업시키고 구조적 문제는 Opus가 Plan을 수정한다.

## Retry / Escalation

```text
Flash Attempt #1
   ↓ FAIL
Flash 자체 분석 + Retry
   ↓ FAIL
Flash Attempt #2
   ↓ 동일 실패
Opus Escalation
   ↓
Plan 수정 / 직접 판단
```

Flash 최대 2~3회 정도를 기본값으로 두는 것이 좋다. 무한 반복은 Context 오염과 잘못된 수정 누적 위험이 있다.

## Context 전략

모델 간 전체 대화를 공유하기보다 상태와 증거를 파일로 공유한다.

```text
.agent/
├── SPEC.md
├── PLAN.md
├── TASKS/
│   ├── 001.md
│   └── 002.md
├── STATE.md
├── EVIDENCE/
│   ├── build.log
│   └── test.log
└── REVIEW.md
```

Flash에는 현재 Task, 필요한 코드, 관련 Evidence만 전달한다.

## Multi-Agent 확장

초기에는 단일 Worker로 검증한다.

```text
Opus → Flash → Verification → Opus
```

안정화 후 독립 Task만 병렬화한다.

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

동일 파일을 여러 Worker가 동시에 수정하는 방식은 기본적으로 피한다.

## Fable식 Adversarial Review

중요 작업에는 독립 관점을 추가한다.

- **Skeptic**: 근거가 충분한가?
- **Red Team**: 어떤 방식으로 깨질 수 있는가?
- **Simplifier**: 더 단순하게 구현할 수 있는가?

저위험 변경은 Flash reviewer를 사용할 수 있고 Architecture·보안·대규모 변경은 Opus가 arbitration한다.

## Model Router

```text
LOW
단순 수정 / 반복 / 문서
→ Flash

MEDIUM
일반 기능 / Bug Fix
→ Opus Plan
→ Flash Execute
→ 자동 Verification

HIGH
Architecture / 복잡 장애 / 보안
→ Opus Analyze
→ Flash Execute
→ Opus Review

CRITICAL
배포 / 데이터 삭제 / Infra
→ Opus
→ Human Approval
```

## Guardrail

- Task scope 밖 파일 수정 금지
- 삭제/대량 rename 승인 필요
- git push 자동 실행 금지
- production deploy 승인 필요
- secret 접근 제한
- Build/Test 결과 원문 저장
- exit code 기반 성공 판정
- 작업 전후 git diff 검사
- 동일 오류 반복 시 escalation

## 추천 기본 구성

```yaml
planner: claude-opus
executor: deepseek-v4-flash-0731
reviewer: claude-opus
cheap_reviewer: deepseek-v4-flash-0731
execution:
  max_retries: 3
  parallel_workers: 1
  require_build: true
  require_tests: true
  require_diff_check: true
escalation:
  architecture_change: opus
  repeated_failure: opus
  scope_expansion: opus
approval:
  delete: human
  push: human
  deploy: human
```

## 도입 순서

1. 단일 `Opus → Flash → Opus` 루프
2. Task Contract 도입
3. Build/Test Verification Gate
4. Retry/Escalation 자동화
5. Task 단위 Context 격리
6. 독립 작업에 한해 Flash 병렬화
7. Fable식 adversarial review
8. 작업 유형별 Model Router

## 평가 지표

- Task Success Rate
- First-pass Build Rate
- Test Pass Rate
- Flash Retry Count
- Opus Escalation Rate
- Human Intervention Rate
- 작업당 Opus/Flash Token 및 비용
- 작업 완료 시간
- Scope 밖 수정 횟수
- Regression 발생률

## 결론

이 Harness의 핵심은 다음과 같다.

> **Opus는 판단하고, Flash는 실행하며, Harness는 둘 모두를 검증한다.**

고가 Frontier 모델의 토큰을 반복 구현에 소비하지 않고 분석·설계·최종 판단에 집중시키면서, V4 Flash의 저비용 Agentic Coding 능력을 Worker 계층에서 활용하는 구조다.

## 참고 자료

- https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731
- https://github.com/Miguok/fable-harness
- https://github.com/rennf93/opus-fable-playbook
- https://support.claude.com/en/articles/11940350-claude-code-model-configuration
