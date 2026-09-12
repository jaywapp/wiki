---
title: GSD Pi
category: harness
tags:
  - ai
  - agent
  - harness
  - orchestration
  - context-engineering
  - multi-agent
source: https://github.com/open-gsd/gsd-pi
updated: 2026-09-13
---

# GSD Pi

> **한줄 요약:** GSD Pi는 milestone → slice → task 단위의 장기 개발 workflow를 DB와 local artifact에 durable하게 유지하면서 여러 model/provider를 실행·복구·검증하는 local-first Coding Agent Harness다.

## 프로젝트 개요

GSD Pi는 Open GSD 제품군의 독립 실행형 Coding Agent / Orchestrator다. 기존 Claude Code·Codex 같은 Runtime 위에 workflow를 얹는 `GSD Core`와 달리, GSD Pi는 자체 terminal agent와 control loop를 가진다.

공식 README 기준 주요 성격은 다음과 같다.

- local-first terminal coding agent
- milestone / slice / task 기반 autonomous workflow
- Git worktree isolation
- `.gsd/` local project memory
- DB-authoritative project state + Markdown projection
- multi-provider model routing
- Claude Code / Cursor Agent 등 external CLI provider 연결
- tool / skill / extension surface
- TUI / Web UI

현재 Wiki의 `ai/skills/gsd-core.md`에는 GSD Pi가 제품군 내 독립 Orchestrator라는 위치만 언급되어 있었고, GSD Pi 자체 분석 문서는 없었다.

## 해결하려는 문제

장기 autonomous coding workflow는 단순한 prompt chain으로 운영하기 어렵다.

```text
Plan
→ Implement
→ Tool call
→ Verify
→ Retry
→ Human approval
→ Resume
→ Finalize
```

이 과정에서 다음 상태를 LLM context에만 맡기면 장애 후 복구가 어렵다.

- 현재 task ownership
- 실행 attempt
- retry/recovery 권한
- milestone validation
- model routing 결과
- tool invocation/result
- artifact/evidence identity
- human acceptance

GSD Pi는 이를 DB와 journal/projection 계층에 외부화한다.

## 핵심 기능

### 1. Hierarchical Work Lifecycle

```text
Project
  └─ Milestone
       └─ Slice
            └─ Task
                 ├─ Plan
                 ├─ Execute
                 ├─ Verify
                 ├─ Recovery
                 └─ Complete
```

Auto mode는 이 상태를 따라 계획→구현→검증→다음 단계로 진행한다.

### 2. Durable Project State

`.gsd/` 아래 요구사항, 결정, runtime note, plan, summary, validation evidence를 저장하며 DB를 authoritative state로 사용하고 Markdown을 reviewable projection으로 제공한다.

이 구조의 핵심은 Markdown 파일 자체를 유일한 truth로 쓰는 것이 아니라 **DB state와 projection의 관계**를 관리하는 점이다.

### 3. Multi-provider Routing

API/OAuth provider뿐 아니라 external CLI provider도 다룬다.

최근 main에서는 assistant message에 다음 provenance를 함께 보존하도록 변경됐다.

```text
requested model
   ↓
router/provider
   ↓
effective response model
   ↓
dynamic routing tier
```

예를 들어 `openrouter/auto`를 요청했지만 실제 응답이 `anthropic/claude-opus-4.7`인 경우 둘을 구분해 기록할 수 있다.

### 4. Verification / Recovery

실패를 단순 `retry`로 처리하지 않고 failure class와 recovery action을 durable state에 남기는 방향이다.

최근 변경에서 특히 확인되는 패턴은:

- 동일 finalize를 끝없이 재시도하지 않음
- validation failure에서 canonical artifact를 덮어쓰지 않음
- recovery-exhausted 상태는 pause/fail-closed 처리
- persisted journal과 현재 disk identity가 다르면 reconcile
- contradiction은 evidence를 보존한 뒤 journal entry를 retire

## 최근 Architecture Hardening

### A. Routing Provenance

2026-09-12 main commit은 requested model, provider-reported effective model, dynamic routing tier를 assistant message metadata에 보존하도록 했다.

```text
Task
 │
 ├─ requested: openrouter/auto
 │
 ├─ effective: anthropic/claude-opus-4.7
 │
 └─ route: dynamic/heavy
```

#### 실무 의미

Model routing을 평가할 때 configuration만 보면 안 된다. **실제로 응답을 생성한 model**이 무엇인지 task/turn ledger에 남겨야 비용·품질 평가가 가능하다.

현재 Harness에서도 다음을 분리하는 것이 좋다.

- requested_model
- effective_model
- routing_reason
- fallback_count
- token/cost
- quality outcome

### B. Journaled Exchange Replay

최근 `converge journaled exchange replay` 변경은 interrupted file/project projection 작업을 재생할 때 persisted journal을 그대로 다시 실행하지 않고 현재 disk state와 먼저 대조한다.

```text
Persisted Journal
      │
      +------ Current Disk Identity
                    │
                    ▼
                Reconcile
          ┌─────────┼─────────┐
          │         │         │
      converged  restage   contradiction
          │         │         │
      retire     replay    retain evidence
```

모순이 확인되면 raw error로 영원히 wedge시키는 대신 관련 canonical/temp/quarantine artifact를 reviewable evidence로 보존한다.

#### Perforce로 치환

```text
Pending CL desired state
        │
        +------ p4 opened / have / depot revision
                         │
                         ▼
                      reconcile
```

Agent가 이전 세션의 추정 state를 믿고 바로 재시도하기보다 현재 workspace와 server state를 다시 읽은 뒤 복구 route를 결정하게 만들 수 있다.

### C. Model-visible Tool Binding

최근 subjective UAT 관련 수정에서는 다음 action에 반드시 필요한:

- criterionId
- questionId
- interactionId
- testedSourceRevision
- optionId / label

가 structured `details`에는 있었지만 model이 실제 보는 text output에는 없어 Agent가 올바른 다음 tool call을 만들 수 없었다.

수정 후에는 이 binding을 model-visible text에도 명시하고 **text channel만 읽어도 다음 tool call이 성공하는 regression test**를 추가했다.

이 패턴은 Tool/MCP 설계에서 매우 중요하다.

```text
Tool Result
 ├─ machine metadata
 └─ model-visible text
        └─ 다음 action에 필요한 모든 join key 포함
```

JSON에 정보가 존재한다는 사실과 모델이 그 정보를 실제로 받는다는 것은 다르다.

## 아키텍처

```text
                    GSD Pi
                       │
        ┌──────────────┼───────────────┐
        │              │               │
   Workflow State   Agent Runtime    Extension
   DB / Journal     Provider/Model   Tools/Skills
        │              │               │
        ├─ Milestone   ├─ routing      ├─ MCP
        ├─ Slice       ├─ session      ├─ hooks
        ├─ Task        └─ provenance   └─ UI
        └─ Attempt
        │
        ▼
 Markdown / Artifact Projection
        │
        ▼
 Verification / Recovery / Human Gate
```

## 장점

- 장기 workflow 상태를 model conversation 밖에 둠
- retry/recovery가 explicit state machine 형태로 발전
- model routing 실제 결과를 추적 가능
- human UAT, verification evidence를 workflow에 통합
- Windows 지원 경로도 공식 README/install 문서에 존재
- provider/CLI adapter가 다양해 multi-model 실험에 유용

## 단점 및 한계

- Git worktree 중심 isolation이라 Perforce에는 직접 맞지 않음
- local DB + projection + journal + recovery까지 관리하므로 운영 복잡도가 큼
- GSD Core보다 훨씬 opinionated한 독립 runtime
- 빠른 개발 속도로 internal state/schema가 계속 변해 Enterprise 고정 배포 시 버전 관리 필요
- 자체 UI/CLI/DB 계층까지 포함해 기존 사내 Harness와 기능 중복 가능성 높음
- 최근 hardening 변경 일부는 아직 latest stable release v1.19.0 이후 main에만 존재하므로 안정 버전 기능으로 간주하면 안 됨

## GSD Core와 비교

| 항목 | GSD Core | GSD Pi |
|---|---|---|
| 성격 | 기존 Runtime 위 workflow/skills | 독립 Coding Agent Harness |
| 실행기 | Claude Code/Codex 등 기존 runtime | 자체 agent runtime + provider adapters |
| State | workflow artifact 중심 | DB-authoritative + projection/journal |
| Routing | host runtime 의존 비중 큼 | 자체 multi-provider routing |
| Recovery | workflow 단계 중심 | attempt/journal/recovery state가 더 깊음 |
| 현재 환경 적합도 | 바로 참고하기 쉬움 | 구조 PoC/설계 참고 가치 높음 |

## Perforce + Claude/Codex 환경 적용 아이디어

GSD Pi 전체를 도입하는 것보다 다음 네 패턴을 가져오는 것이 가치가 높다.

### 1. Task State를 DB-authoritative로

```text
TaskId
PendingCL
Status
AttemptId
OwnerAgent
RequestedModel
EffectiveModel
RecoveryState
EvidenceRefs
```

### 2. Workspace State Reconciliation

Agent resume 시 항상:

```text
DB desired state
+ p4 opened
+ p4 have
+ pending CL status
+ build/test latest receipt
→ reconcile
→ continue / repair / human
```

### 3. Fail-closed Canonical Artifact

Review/Validation 결과를 만들지 못했을 때 fake `PASS/BLOCKER` 파일로 canonical result를 덮지 않고 별도 recovery evidence에 기록한다.

### 4. Tool Contract Regression Test

Tool A의 output으로 Tool B를 호출해야 한다면 **A의 model-visible 결과만으로 B의 필수 argument를 구성할 수 있는지** 테스트한다.

## 활용 사례

- 장시간 autonomous coding job
- IDE/Slack 등 외부 surface에서 Agent task를 이어가는 workflow
- 여러 model/provider를 동적으로 route하는 개발 Harness
- 실패 후 재기동 시 정확한 resume가 필요한 Agent
- human UAT/approval을 workflow state에 결합하는 시스템

## 활용 아이디어 평가

- **바로 적용 가능**: requested/effective model provenance, tool contract test, fail-closed recovery
- **PoC 가치 높음**: DB-authoritative task/attempt/recovery ledger
- **아이디어 참고**: journaled projection reconciliation
- **현재 도입 가치 낮음**: Git worktree 기반 GSD Pi 전체를 Perforce 사내 환경에 그대로 도입

## 결론

GSD Pi에서 가장 참고할 부분은 Agent 수나 UI가 아니라 **장시간 실행 중 생기는 모순·재시도·복구를 model reasoning이 아니라 durable workflow state로 다루는 방식**이다.

현재 Harness의 다음 성숙 단계도 `Orchestrator 역할 추가`보다:

```text
Task State
→ Attempt State
→ Evidence
→ Recovery Route
→ Effective Model/Cost
```

를 정확히 남기는 계층을 만드는 쪽이 더 중요하다.

## 참고 자료

- Repository: https://github.com/open-gsd/gsd-pi
- Latest stable release 확인: https://github.com/open-gsd/gsd-pi/releases/tag/v1.19.0
- GSD Core Wiki: ../skills/gsd-core.md
