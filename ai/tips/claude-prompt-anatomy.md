---
title: Claude Prompt Anatomy
category: tips
tags:
  - ai
  - claude
  - prompting
  - context-engineering
source: user-provided reference image
updated: 2026-09-14
---

# Claude Prompt Anatomy

> 복잡한 Claude 작업 프롬프트를 **Task → Context → Reference → Success Brief → Rules → Conversation → Plan → Alignment** 순서로 구성해, 모델이 무엇을 해야 하고 무엇이 성공인지 명확히 이해하게 만드는 실전 프롬프트 설계 패턴.

## 개요

이 패턴은 단순히 명령을 길게 쓰는 방식이 아니다. 작업 목표, 필요한 컨텍스트, 원하는 결과의 예시, 성공 기준, 제약 조건, 실행 전 합의 과정을 분리해 Claude의 추측 영역을 줄이는 방식이다.

특히 코드 작성, 문서 작성, 설계 변경처럼 **결과물의 품질 기준이 명확하고 기존 파일/규칙을 반드시 따라야 하는 작업**에 적합하다.

## 핵심 구조

```text
Task
  ↓
Context Files
  ↓
Reference / Blueprint
  ↓
Success Brief
  ↓
Rules
  ↓
Clarifying Conversation
  ↓
Execution Plan
  ↓
Alignment
  ↓
Execution
```

### 1. Task

무엇을 할지뿐 아니라 왜 하는지까지 지정한다.

```text
I want to [TASK] so that [SUCCESS CRITERIA].
```

`TASK`만 주는 것보다 성공 목적까지 함께 주면 구현 선택지가 여러 개일 때 모델이 판단할 기준이 생긴다.

### 2. Context Files

작업 전에 반드시 읽어야 하는 파일과 각 파일의 역할을 명시한다.

```text
First, read these files completely before responding:

[path/file.md] — [what it contains]
[path/rules.md] — [what it contains]
```

핵심은 파일을 무작정 많이 넣는 것이 아니라 **이번 작업의 판단에 필요한 파일만 선별하고 왜 필요한지 알려주는 것**이다.

### 3. Reference

원하는 결과와 비슷한 예시를 제공하고, 단순 복제 대신 그 예시에서 재사용할 패턴을 명시한다.

```text
Here is a reference to what I want to achieve:
[reference]

Extract the relevant patterns, structure, tone, and rules.
```

가능하다면 `Always ...`, `Never ...` 형태의 규칙으로 변환하면 이후 실행 단계에서 검증하기 쉽다.

### 4. Success Brief

출력 자체보다 **받는 사람이 어떻게 반응해야 성공인지**를 정의한다.

확인할 항목:

- 결과물 종류와 길이
- 대상 독자
- 독자가 읽은 뒤 생각/행동해야 하는 것
- 피해야 하는 톤과 패턴
- 최종 성공 조건

예를 들어 코드 작업이라면 `빌드 성공`, `기존 API 호환`, `테스트 통과`, `불필요한 신규 의존성 없음`처럼 바꿀 수 있다.

### 5. Rules

프로젝트 표준, 제약, 금지사항, 대상 독자 등을 컨텍스트 파일에서 읽게 한다. 규칙 위반 가능성이 있다면 임의로 진행하지 않고 사용자에게 알리도록 요구할 수 있다.

다만 규칙이 너무 많으면 모든 규칙을 매번 프롬프트에 복사하지 말고 프로젝트의 `CLAUDE.md`, `AGENTS.md`, 별도 standards 문서 등에 두고 필요한 부분만 참조하는 편이 효율적이다.

### 6. Conversation

불확실성이 큰 작업에서는 바로 실행시키지 않고 필요한 질문을 먼저 하게 한다.

이 단계는 요구사항이 이미 명확한 단순 작업에는 오히려 왕복 횟수와 토큰을 증가시킬 수 있으므로 선택적으로 사용한다.

### 7. Plan

실행 전에 짧은 계획을 요청한다.

```text
Give me your execution plan (5 steps maximum).
```

계획은 상세한 장문 추론을 요구하기보다, 파일 변경 범위와 작업 순서를 확인할 수 있는 수준이면 충분하다.

### 8. Alignment

사용자와 방향이 맞는지 확인한 뒤 실행한다. 대규모 리팩터링, 데이터 변경, 배포처럼 되돌리기 비싼 작업에 특히 유용하다.

## 왜 효과적인가

이 구조의 핵심은 프롬프트를 길게 만드는 것이 아니라 **의사결정에 필요한 정보의 역할을 분리하는 것**이다.

```text
What?      → Task
With what? → Context
Like what? → Reference
How good?  → Success Brief
Limits?    → Rules
Unknowns?  → Conversation
How?       → Plan
Proceed?   → Alignment
```

결과적으로 모델이 요구사항을 임의 해석하는 범위를 줄이고, 작업 전 잘못된 방향을 발견하기 쉬워진다.

## 장점

- 복잡한 작업에서 목표와 성공 기준을 분리할 수 있다.
- 기존 코드베이스/문서 규칙을 명시적으로 컨텍스트에 포함시킨다.
- 예시를 단순 모방하지 않고 재사용 가능한 규칙으로 추출할 수 있다.
- 실행 전에 요구사항 누락과 방향 오류를 발견하기 쉽다.
- 반복 작업에서는 템플릿으로 재사용하기 좋다.

## 단점 및 한계

- 모든 작업에 전체 구조를 적용하면 프롬프트와 왕복 대화가 과도하게 길어진다.
- `read these files completely`는 큰 파일에서 컨텍스트와 토큰을 낭비할 수 있다. 필요한 파일/섹션을 선별하는 것이 더 좋다.
- 매번 clarifying questions와 alignment를 강제하면 자율 실행형 에이전트의 처리량이 떨어진다.
- reference blueprint를 프롬프트에 그대로 반복 삽입하면 토큰 비용이 증가한다.
- 잘못된 reference나 오래된 context를 제공하면 구조가 잘 잡혀 있어도 결과가 잘못될 수 있다.

## 토큰 최적화 관점의 개선

원본 패턴을 그대로 상시 사용하는 것보다 작업 난이도에 따라 단계를 줄이는 것이 좋다.

### Small Task

```text
Task → Success Criteria → Execute
```

버그 한 줄 수정, 단순 조회, 작은 문서 변경에 적합하다.

### Medium Task

```text
Task → Relevant Context → Constraints → Execute → Verify
```

일반적인 기능 구현과 유지보수에 적합하다.

### Large / Risky Task

```text
Task → Context → Reference → Success Brief → Rules
     → Questions → Plan → Alignment → Execute → Verify
```

대규모 리팩터링, 아키텍처 변경, 배포 및 파괴적 작업에 적합하다.

즉, **프롬프트 구조 자체를 작업 위험도에 따라 라우팅**하는 것이 효율적이다.

## 개발용 개선 템플릿

```text
# Task
[TASK]

# Success
- [measurable outcome]
- [build/test/behavior requirement]

# Context
Read only the files needed for this task:
- [file] — [reason]
- [file] — [reason]

# Reference
Follow these existing patterns where applicable:
- [reference implementation]

# Constraints
- Always: [rule]
- Never: [rule]

# Execution policy
If a missing requirement would materially change the implementation,
ask before proceeding. Otherwise make the safest reasonable assumption.

For high-risk or broad changes, show a plan of at most 5 steps first.
For routine changes, execute directly.

# Verification
Before finishing:
- [build/test]
- [check compatibility]
- [summarize changed files]
```

이 버전은 원본의 장점을 유지하면서 **모든 작업에서 질문/계획/승인을 강제하지 않는 것**이 핵심이다.

## Harness 적용 아이디어

멀티 에이전트 환경에서는 이 구조를 하나의 거대한 프롬프트로 전달하기보다 필드를 구조화해 에이전트 사이에서 전달할 수 있다.

```text
Orchestrator
  ├─ task
  ├─ success_criteria
  ├─ context_refs
  ├─ constraints
  └─ risk_level
       ↓
Analysis / Planner (필요한 경우만)
       ↓
Worker
       ↓
Verifier / Reviewer
```

`risk_level`에 따라 `plan_required`, `approval_required`, `verification_level`을 결정하면 단순 작업의 토큰 낭비를 줄이면서 위험한 작업에는 강한 통제를 적용할 수 있다.

## 활용 아이디어

**바로 적용 가능:** Claude Code의 복잡한 기능 구현 프롬프트 템플릿, 문서 작성, 설계 변경 요청.

**PoC 가치 있음:** Harness의 Task Contract 스키마로 변환해 Orchestrator가 각 Worker에게 `task/context/success/constraints`만 전달하도록 구성.

**아이디어 참고:** 모든 작업에서 전체 템플릿을 강제하는 대신 작업 규모와 위험도를 판단해 프롬프트 단계를 자동 축소하는 Prompt Router.

## 결론

이 이미지의 가장 유용한 인사이트는 "좋은 프롬프트는 자세한 명령문"이라는 점이 아니라 **Task, Context, Reference, Success, Constraints, Execution Control을 서로 다른 책임으로 분리한다**는 점이다.

실무에서는 원본 템플릿 전체를 상시 사용하기보다 작업 난이도에 따라 Small / Medium / Large 템플릿으로 라우팅하는 방식이 토큰 효율과 자율성 측면에서 더 적합하다.

## 참고 자료

- 사용자 제공 이미지: *The Anatomy of a Claude prompt* (2026-09-14 확인)
