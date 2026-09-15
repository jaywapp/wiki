---
title: Claude Workspace - Trend 기반 심층 설계
category: harness
tags:
  - ai
  - harness
  - claude-code
  - context-engineering
  - token-optimization
  - perforce
  - evidence
  - orchestration
source: ai/trend/ 2026-09-10~2026-09-16 synthesis
updated: 2026-09-16
---

# Claude Workspace - Trend 기반 심층 설계

> 최근 Harness/Context Engineering 사례가 공통으로 가리키는 방향은 Claude 세션을 더 오래 유지하는 것이 아니라, **작업 상태를 세션 밖에 보존하고, 매 실행에 필요한 Context만 투영하며, 완료 여부를 Evidence로 판정하는 Workspace OS**를 만드는 것이다.

## 한줄 요약

Claude 기반 개발 Workspace의 핵심 구성은 `Durable Task State + Typed Context + Context Topology Router + Evidence Gate + Delta Review + Runtime/Cost Telemetry`이며, 각 요소는 최근 공개된 Harness 구현과 실험에서 반복적으로 관찰된다.

## 1. 왜 Workspace OS인가

일반적인 Claude Code 작업 환경은 대화 세션을 중심으로 움직인다.

```text
User → Claude Session → Read/Search → Edit → Build/Test → Answer
```

짧은 작업에서는 충분하지만 작업이 길어지면 다음 문제가 생긴다.

- 세션 종료/compact 이후 이전 판단 근거가 약해진다.
- 다른 agent가 작업을 이어받을 때 transcript를 다시 읽어야 한다.
- Reviewer가 반복 호출될 때 이미 본 Context까지 재전송된다.
- build/test 결과가 대화 속 텍스트로만 남으면 완료 판정의 근거가 약하다.
- 긴 로그를 무조건 압축하면 agent가 원본을 다시 읽어 전체 비용이 오히려 증가할 수 있다.
- Skill/Subagent를 언제 사용해야 하는지에 대한 실행 정책이 없다.

따라서 세션을 작업의 Single Source of Truth로 두지 않고 Workspace 자체가 상태와 증거를 소유하도록 한다.

```text
                    User / Goal
                        │
                        ▼
                 Root Orchestrator
                        │
                 ┌──────┴──────┐
                 │ Task Contract│
                 └──────┬──────┘
                        │
              Context Topology Router
                 /       |       \
             INLINE     FORK    ISOLATED
                │         │         │
              Skill    Project   Specialist
                        Agent      Agent
                 \       |       /
                  └──────┬──────┘
                         ▼
                   Tool Execution
                         │
                  Code / Perforce
                         │
               Evidence Collector
                         │
                  Delta Reviewer
                         │
              PASS / RETRY / HUMAN
                         │
                   Durable State
```

---

# 2. Durable Task State

## 아이디어

**대화가 아니라 외부 artifact가 작업 상태를 보유한다.**

Trend의 `repo-harness`, `superharness`, Flow, Codex Guardian 계열에서 형태는 달라도 반복되는 패턴이다. `repo-harness`는 plan/handoff/check/review evidence를 repository file에 기록하고, `superharness`는 task lifecycle과 ledger를 durable state로 관리한다.

### 근거가 되는 문제

LLM conversation history는 실행에 좋은 working memory이지만 장기 기록의 원본으로 쓰기에는 불안정하다.

- context window 제한
- compaction
- session 종료
- model/runtime 변경
- subagent delegation
- reviewer 재시작

때문에 `현재 모델에게 보여주는 상태`와 `실제 작업 상태`를 분리해야 한다.

## Workspace 적용

```text
.harness/
├─ tasks/
│   └─ TASK-1042.json
├─ handoffs/
│   └─ TASK-1042.md
├─ evidence/
│   └─ TASK-1042/
├─ checkpoints/
│   └─ TASK-1042-review.json
└─ ledger/
    └─ TASK-1042.jsonl
```

Task 예시:

```yaml
id: TASK-1042
goal: Submit Dialog validation 수정
project: P4VCustom
pending_cl: 182934
status: implementing
owner: project-p4v-worker
context_policy: balanced
review_generation: 3
```

Claude가 종료되어도 이 정보는 사라지지 않는다.

## 기대 효과

- 세션 재시작 비용 감소
- Claude → Codex 또는 다른 Claude session handoff 가능
- 장기 작업 복구 가능
- 사람이 현재 작업 상태를 직접 확인 가능
- transcript 전체를 durable memory로 사용할 필요 감소

## 효과의 근거

이 패턴 자체에 대한 단일 정량 benchmark는 아직 부족하다. 따라서 `세션 재시작 시 토큰 N% 감소`처럼 수치화해서 주장해서는 안 된다. 현재 근거는 여러 Harness가 동일한 문제를 durable state/ledger/checkpoint로 해결하고 있다는 구조적 수렴에 있다.

---

# 3. Typed Context — 모든 Context의 가치가 같지 않다

## 아이디어

Context를 단순히 `있음/없음`으로 관리하지 않고 의미와 중요도에 따라 분류한다.

```text
PINNED
REQUIRED
RETRIEVABLE
EPHEMERAL
```

### PINNED

절대 압축 과정에서 의미가 변하면 안 되는 정보.

- 사용자 restriction
- 프로젝트 invariant
- 금지 명령
- 정확한 build command
- Perforce workspace 규칙

### REQUIRED

현재 task 해결에 직접 필요한 정보.

- requirement
- current diff
- failing test
- 관련 interface

### RETRIEVABLE

필요할 때 다시 가져올 수 있는 정보.

- architecture docs
- 과거 findings
- API documentation
- 이전 task evidence

### EPHEMERAL

현재 탐색에만 필요한 정보.

- verbose build log
- search 과정
- 임시 hypothesis
- progress output

## 근거

9/13 Trend의 Knowledge Triage/Compaction 분석에서 Constraint/Procedure와 episodic information을 같은 압축 정책으로 처리하지 않는 방향이 확인됐다. Codex 계열 변화에서도 raw durable state와 model-visible projection을 분리하는 패턴이 반복된다.

## 적용 사례

TeamCity build가 30,000줄 로그를 생성했다고 가정한다.

기존 방식:

```text
30,000 line log
      ↓
Claude Context
      ↓
context pressure
```

Typed Context 방식:

```text
Raw Build Log                 EPHEMERAL
     │
     ├─ Error CS0123          REQUIRED
     ├─ failed project        REQUIRED
     ├─ build command         PINNED
     └─ full artifact path    RETRIEVABLE
                │
                ▼
             Claude
```

원본을 버리는 것이 아니라 **모델에 보이는 projection만 줄인다.**

---

# 4. 선택적 Output Compaction — 적게 보여주는 것이 항상 싸지는 않다

이 원칙은 실제 공개 실험 결과가 있어 특히 중요하다.

GitHub는 Copilot CLI Harness에서 shell output 압축을 실험했다. 강한 압축으로 개별 tool response는 짧아졌지만 필요한 정보가 사라진 경우 agent가 원본을 다시 열거나 command를 재실행했다. 즉 local token 절약이 task 전체 비용 증가로 이어질 수 있었다.

GitHub가 최종적으로 채택한 방향은 output 종류별 선택적 압축이었다.

```text
원문 유지
- source file
- diff
- arbitrary script output

lossless 재구성
- search / grep 결과
- file 목록

선택적 압축
- build progress
- test progress
- install logs
- 반복적인 diagnostic noise
```

또 불필요한 line-number formatting 제거는 Copilot Code Review 실험에서 평균 prompt token을 약 5% 줄였고 추적한 review-quality metric의 유의미한 악화가 관찰되지 않았다.

Task-tool prompt 최적화에서는 처음 약 50%를 줄였더니 subagent parallelism이 직렬화되는 regression이 발생했다. 이를 behavior test로 잡고 한 문장을 수정한 뒤 최종적으로 **turn당 약 1,300 prompt token**, session 전체 prompt token 약 **1.8%**, normalized cost/active-hour 약 **2.9%** 감소가 보고됐다.

Background task 완료 결과를 별도 retrieval turn 없이 직접 전달한 변경은 평균 token-related usage를 약 **2.3%** 줄였다.

## Workspace 적용

따라서 KPI를 이렇게 잡지 않는다.

```text
BAD
Tokens / Tool Call
```

대신:

```text
GOOD
Tokens / Solved Task
Turns / Solved Task
Recovery Rate
Command Rerun Rate
Quality Regression
Wall-clock / Solved Task
```

### Perforce / UE / TeamCity 적용

```text
Exact
p4 diff
p4 describe
source file
arbitrary script output

Reorganize
p4 files
grep/search
opened file list

Compact
UE build progress
TeamCity logs
test progress
package/install logs
```

---

# 5. Result Push — 조회만 하기 위한 LLM Turn을 없앤다

## 기존 방식

```text
Agent
  │
  ├─ start build
  │
  └─ 다른 작업

Build System
  │
  └─ "completed"

Agent
  │
  └─ get_result()      ← 추가 model/tool turn
```

## 개선

```text
Build System
   │
   └─ completion event
        status
        error summary
        test summary
        artifact pointer
             │
             ▼
           Agent
```

GitHub Copilot Harness에서도 background completion 결과를 notification에 직접 포함해 retrieval-only step을 제거한 결과 token-related usage가 약 2.3% 감소했다.

### 우리 Workspace 적용 예

```json
{
  "event": "build.completed",
  "task": "TASK-1042",
  "status": "failed",
  "errors": [
    "SubmitDialogViewModel.cs:142 CS0123"
  ],
  "artifact": ".harness/evidence/TASK-1042/build-4.log"
}
```

Claude는 `빌드 끝났나? → 결과 가져와`라는 왕복 없이 바로 다음 판단을 할 수 있다.

---

# 6. Context Topology Router — Skill인가, Fork인가, 독립 Agent인가

## 문제

Subagent를 많이 사용한다고 항상 token 효율이 좋아지는 것은 아니다.

새 agent를 만들면 parent context가 줄어드는 대신 child에게 task/background를 다시 설명하고 결과를 parent로 반환해야 한다. 따라서 **peak context 절감과 total token 절감은 다른 문제**다.

## 세 가지 실행 방식

### INLINE

현재 context에서 Skill/Tool을 실행한다.

적합:

- task가 짧음
- parent context가 중요함
- 결과가 즉시 필요함

```text
Parent Context
      │
     Skill
      │
    Result
```

### FORK

Parent의 유효 context를 물려받은 별도 execution branch.

적합:

- 현재 조사/설계 context가 중요함
- 병렬 작업 필요
- 동일한 문제 공간을 공유함

```text
Parent Context ──────────┐
                         ▼
                    Fork Agent
                         │
                       Result
```

### ISOLATED

명시적인 task contract만 전달하는 독립 context.

적합:

- 독립 조사
- 보안 경계
- context pollution 방지
- Reviewer

```text
Parent
  │
Task Contract
  │
  ▼
Fresh Agent Context
```

## 적용

Task Contract에 실행 위치를 명시한다.

```yaml
execution:
  runtime: claude
  model: sonnet
  context_mode: fork
  context_policy: balanced
```

이렇게 하면 Orchestrator는 단순 model router가 아니라 **Context Topology Router** 역할까지 담당한다.

---

# 7. Structured Handoff — 자유형 요약을 Protocol로 바꾼다

## 문제

`지금까지 한 일을 다음 agent에게 설명해줘` 식의 handoff는 모델마다 형식과 정보 밀도가 달라진다.

## 제안

```yaml
handoff:
  goal:
  completed:
  current_state:
  changed_files:
  constraints:
  decisions:
  evidence:
  failures:
  unresolved:
  next_action:
```

## 효과

- 다음 agent가 transcript를 읽을 필요 감소
- 중요한 restriction 누락 위험 감소
- machine-readable
- reviewer input으로 재사용 가능
- UI dashboard에 바로 표시 가능

단, handoff summary 자체를 원본으로 취급하면 안 된다. Raw ledger/evidence가 원본이고 handoff는 **재생성 가능한 projection**이어야 한다.

---

# 8. Delta Reviewer — 이미 본 것을 다시 보내지 않는다

Codex Guardian의 최근 구현에서 매우 직접적인 사례가 나타났다.

Reviewer가 이전에 본 transcript 위치를 cursor로 보존하고 parent history lineage가 동일하면 이후 추가된 event만 `Delta`로 전달한다. history/reset lineage가 달라지면 안전하게 `Full` sync로 되돌아간다.

```text
Review #1
A B C D
    │
    └─ cursor = D

Worker 추가 작업
E F G

Review #2
E F G              ← Delta
```

하지만 다음과 같은 사건은 이전 review reasoning을 무효화할 수 있다.

```text
p4 revert
base revision 변경
workspace resync
requirement hard reset
review policy 변경
```

이때는:

```text
review_generation++
FULL REVIEW
```

으로 되돌린다.

## Perforce용 Key

```text
pending_cl
base_depot_revisions
diff_hash
evidence_generation
review_generation
review_cursor
policy_hash
```

### 기대 효과

반복 Review에서 과거 transcript 재전송을 구조적으로 줄인다. 다만 현재 공개 자료에는 이 변경 하나만의 정량 token 절감률은 없다. 따라서 PoC에서 직접 측정해야 한다.

---

# 9. Evidence Gate — Agent의 '완료했습니다'를 신뢰하지 않는다

## 아이디어

Task completion을 자연어 답변이 아니라 deterministic evidence와 reviewer 판단으로 결정한다.

```text
Worker
  │
  ├─ edit
  ├─ build
  ├─ test
  ├─ p4 diff
  │
  ▼
Evidence Bundle
  │
  ▼
Reviewer
  │
  ├─ PASS
  ├─ RETRY
  └─ HUMAN
```

## Evidence 예

```yaml
build:
  status: pass
  command: dotnet build
  artifact: build.log

tests:
  total: 132
  passed: 132
  failed: 0

perforce:
  pending_cl: 182934
  diff_hash: abc123
```

## Docket에서 얻을 수 있는 추가 원칙

Evidence에는 결과만 저장하지 말고 **그 결과를 왜 믿는지**도 기록한다.

```text
EvidenceClaim
  status
  basis
  source_event_id
  observed_at
  strength
```

예를 들어 `approval_required`와 `human_reviewed`는 같은 사실이 아니다. 설정상 permission prompt가 필요했다는 것은 관찰/추론 가능한 반면 실제 사람이 diff를 읽었다는 사실은 별도 evidence가 없으면 주장할 수 없다.

이 원칙은 자동화가 커질수록 중요하다.

---

# 10. Stable Prefix + Dynamic Tail

Claude의 prompt cache를 활용하려면 자주 바뀌지 않는 instruction을 앞쪽에 두고 task-specific context를 뒤쪽으로 보낸다.

```text
Stable Prefix
├─ system
├─ organization policy
├─ project invariants
├─ tool contracts
└─ stable skills

Dynamic Tail
├─ task
├─ current diff
├─ recent evidence
└─ latest handoff
```

9/11 이후 Scout에서는 Claude Code의 cache correctness 수정 사례가 반복적으로 확인됐다. 중요한 점은 단순히 cache를 켜는 것이 아니라 **불필요한 prefix 변화가 cache reuse를 깨지 않도록 Workspace materialization을 안정화하는 것**이다.

CLAUDE.md에 runtime state나 timestamp 같은 동적 정보를 계속 삽입하는 것은 피한다.