---
title: Claude Workspace - Trend 적용 설계
category: harness
tags:
  - ai
  - harness
  - claude-code
  - context-engineering
  - token-optimization
  - perforce
source: ai/trend/ 2026-09-10~2026-09-16 synthesis
updated: 2026-09-16
---

# Claude Workspace - Trend 적용 설계

> `ai/trend/`의 Harness·Context·Token Scout를 Claude 기반 개발 워크스페이스 관점에서 재구성하면, 핵심은 **세션을 오래 유지하는 것**이 아니라 **작업 상태를 외부화하고 필요한 Context만 정확히 투영하며 결과를 Evidence로 검증하는 Workspace OS**를 만드는 것이다.

## 한줄 요약

Claude 기반 Workspace에는 `Durable Task State + Typed Context + Context Topology Router + Evidence Gate + Runtime/Cost Telemetry`를 중심축으로 적용하는 것이 가장 가치가 높다.

## Trend에서 반복적으로 나타난 공통 방향

2026-09-10~16 Scout를 종합하면 개별 프로젝트는 달라도 다음 방향이 반복된다.

1. Chat/session history를 작업 상태의 SSoT로 사용하지 않는다.
2. Durable history와 model-visible working context를 분리한다.
3. Context는 무조건 요약하지 않고 중요도와 용도에 따라 분류한다.
4. Subagent를 호출할 때 무조건 fresh context를 만들지 않고 inline/fork/isolated를 선택한다.
5. Review에는 전체 transcript 대신 변경된 delta와 evidence를 우선 전달한다.
6. 완료 여부를 LLM의 주장보다 build/test/diff 등의 evidence로 판정한다.
7. Token/tool-call이 아니라 solved-task 전체 비용과 재작업률을 본다.
8. Claude/Codex 같은 runtime은 orchestration core와 분리한다.

## 제안 Workspace 구조

```text
root/
├─ CLAUDE.md                  # 최소한의 전역 invariant / routing rule
├─ .claude/
│  ├─ agents/                 # 역할 정의
│  ├─ skills/                 # progressive disclosure 절차
│  └─ hooks/                  # output rewrite / evidence collection
├─ .harness/
│  ├─ tasks/                  # durable task contract
│  ├─ handoffs/               # structured handoff
│  ├─ evidence/               # build/test/p4 evidence
│  ├─ checkpoints/            # context/review checkpoint
│  └─ ledger/                 # append-only execution events
├─ src/
│  ├─ project1/
│  ├─ project2/
│  └─ project3/
├─ release/
└─ docs/
```

핵심은 `.claude/`를 Claude에게 보여줄 행동 규칙 계층으로, `.harness/`를 세션 밖에서도 유지되는 작업 상태 계층으로 분리하는 것이다.

## 1. Durable Task State

### 적용 가치: 매우 높음 / 바로 적용

세션이 끊기거나 compact되어도 작업을 복구할 수 있도록 task state를 외부화한다.

```json
{
  "task_id": "...",
  "project": "project1",
  "goal": "...",
  "pending_cl": 12345,
  "status": "working",
  "owner_agent": "project1-worker",
  "base_revisions": [],
  "constraints": [],
  "next_actions": []
}
```

DB는 scheduling/ownership 상태에 적합하고 workspace artifact는 사람이 읽을 수 있는 context/evidence에 적합하다. 둘을 경쟁시키지 말고 hybrid로 운영한다.

## 2. Typed Context

### 적용 가치: 매우 높음 / 바로 적용

모든 context를 같은 방식으로 compact하지 않는다.

```text
PINNED
- 사용자 요구사항
- 프로젝트 invariant
- 금지사항
- 정확한 명령/경로

REQUIRED
- 현재 task
- 현재 diff
- failing test
- 현재 Pending CL

RETRIEVABLE
- architecture docs
- 과거 findings
- 상세 evidence

EPHEMERAL
- 탐색 로그
- verbose build output
- 중간 reasoning 흔적
```

`CLAUDE.md`에는 PINNED 성격의 최소 규칙만 두고, 상세 절차는 Skill, 과거 지식은 docs/retrieval로 내린다.

## 3. Stable Prefix + Dynamic Tail

### 적용 가치: 높음 / 바로 적용

Claude prompt cache를 고려해 자주 바뀌지 않는 내용을 앞쪽에 고정한다.

```text
Stable Prefix
  system / CLAUDE.md core
  tool contract
  stable policy
  stable skill definition

Dynamic Tail
  task contract
  current diff
  recent evidence
  current handoff
```

세션 상태, 시간, 동적 tool 목록처럼 자주 변하는 값을 stable prefix에 섞지 않는다. resume/compact/interrupt/auth 전환도 cache regression 대상으로 본다.

## 4. Context Topology Router

### 적용 가치: 매우 높음 / PoC 우선

Subagent 호출을 하나의 방식으로 고정하지 않는다.

```text
INLINE
- 짧은 절차
- 부모 context가 그대로 필요
- Skill 호출 비용이 낮음

FORK
- 부모의 맥락을 많이 알아야 함
- 병렬 분석/리뷰
- 기존 context 재탐색을 피하고 싶음

ISOLATED
- task contract만으로 독립 수행 가능
- context contamination을 피해야 함
- 긴 탐색/전문 작업
```

Task Contract에 다음을 명시한다.

```yaml
execution:
  agent: reviewer
  model: claude
  effort: high
  context_mode: fork
  input_contract:
    - task
    - diff
    - evidence
```

이 구조는 기존의 '모델 라우터'를 '모델 + Context topology 라우터'로 확장한다.

## 5. Structured Handoff

### 적용 가치: 매우 높음 / 바로 적용

자유형 세션 요약 대신 handoff schema를 고정한다.

```yaml
handoff:
  goal:
  completed:
  changed_files:
  constraints:
  decisions:
  corrections:
  evidence:
  unresolved:
  next_actions:
```

짧은 기본 handoff → 상세 ledger/evidence → 필요 시 raw transcript 순으로 계층화한다.

## 6. Delta Reviewer

### 적용 가치: 매우 높음 / PoC

Review가 반복될 때 전체 context를 다시 보내지 않는다.

```text
Review #1
FULL: task + diff + evidence
        ↓ checkpoint(cursor)

Worker 추가 수정
        ↓
Review #2
DELTA: cursor 이후 edit/test/evidence
```

단, 다음 사건에서는 FULL로 안전하게 되돌린다.

- base depot revision 변경
- `p4 revert` 또는 대규모 resync
- task goal hard reset
- evidence policy 변경
- reviewer/context schema 비호환

실패하거나 취소된 review는 checkpoint를 commit하지 않는다.

## 7. Evidence Gate

### 적용 가치: 매우 높음 / 바로 적용

`Reviewer가 좋아 보인다고 판단`하는 것과 `작업이 검증됨`을 분리한다.

```text
Worker
  ↓
p4 diff / opened
  ↓
build
  ↓
test / static checks
  ↓
Evidence Bundle
  ↓
Reviewer
  ↓
PASS / RETRY / HUMAN
```

Evidence에는 값뿐 아니라 근거를 기록한다.

```yaml
claim:
  status: passed
  basis: teamcity-build-result
  source_event_id: ...
  observed_at: ...
  strength: deterministic
```

`observed`, `inferred`, `model_claimed`를 구분한다.

## 8. Output Compression 정책

### 적용 가치: 높음 / 바로 적용

모든 tool output을 줄이지 않는다.

```text
Exact / Lossless
- source file
- p4 diff
- p4 describe
- arbitrary script output

Lossless Reorganization
- search/grep
- p4 files
- opened file list

Selective Compaction
- UE build log
- TeamCity log
- test progress
- install/package output
```

압축된 출력에는 항상 raw artifact pointer를 둔다. 압축 때문에 agent가 원본을 다시 조회하는 recovery가 자주 발생하면 최적화 실패로 본다.

## 9. Background Result는 결과까지 Push

### 적용 가치: 높음 / 바로 적용

`빌드 완료` 같은 notification만 보내면 Claude가 결과를 조회하는 추가 turn을 만든다.

```text
BAD
Build completed
→ Claude: 결과 조회
→ tool call
→ 다음 turn

GOOD
Build completed
status=failed
error=...
artifact=...
→ 바로 다음 판단
```

TeamCity/UE build/background agent 결과는 완료 이벤트에 summary + artifact pointer를 포함한다.

## 10. Runtime Adapter

### 적용 가치: 높음 / PoC

Workspace core가 Claude CLI 세부사항을 직접 알지 않게 한다.

```text
Workspace Orchestrator
        ↓
IAgentRuntime
  ├─ ClaudeCodeRuntime
  ├─ CodexRuntime
  └─ FutureRuntime
```

회사에서는 Claude가 main이더라도 Review나 특정 task를 Codex로 넘길 수 있고, 향후 runtime 교체 비용도 줄어든다.

## 11. Single / Cascade / Critique Routing

### 적용 가치: 중~높음 / 이후 PoC

모델 하나를 고르는 데서 끝내지 않고 작업 난이도와 위험에 따라 실행 패턴을 고른다.

```text
SINGLE
명확하고 저위험 → 한 번 실행

CASCADE
저비용/빠른 실행 → 실패 또는 낮은 confidence일 때 상위 모델

CRITIQUE
Worker 생성 → 독립 Reviewer 검증
```

코드 수정은 기본 SINGLE, 복잡한 분석은 CASCADE, submit 전 검증은 CRITIQUE처럼 사용할 수 있다.

## 12. Token / Cost Telemetry

### 적용 가치: 매우 높음 / 바로 설계

최적화 KPI를 `tokens/tool-call`로 두지 않는다.

최소 계측:

```text
Task
 └─ Agent
     └─ Turn / Step
         ├─ model
         ├─ effort
         ├─ skill
         ├─ MCP/tool
         ├─ input tokens
         ├─ cache read
         ├─ output tokens
         ├─ duration
         └─ cost
```

상위 KPI:

- cost / solved task
- turns / solved task
- time / solved task
- recovery rate
- tool rerun rate
- review retry count
- quality / evidence pass rate

## 13. Context Access Policy

### 적용 가치: 매우 높음 / Enterprise 필수

읽기 권한만 막아서는 부족하다. 같은 allowlist를 다음 경로에 모두 적용한다.

```text
ContextAccessPolicy
  ├─ file read
  ├─ p4 print
  ├─ search/index
  ├─ RAG
  ├─ durable memory
  ├─ handoff generation
  └─ prompt preload
```

특히 회사 Workspace에서는 project별 context boundary가 subagent와 memory에도 유지되어야 한다.

## 14. Atomic Recovery Checkpoint

### 적용 가치: 높음 / 바로 적용

interrupt 직전의 작업 상태와 재개 정보를 여러 파일/트랜잭션으로 따로 쓰지 않는다.

```text
Checkpoint
- task state
- current agent
- pending tool/action
- latest evidence generation
- review cursor
- handoff pointer
```

가능하면 하나의 원자적 write/transaction으로 기록하고 resume은 마지막 valid checkpoint에서 시작한다.

## 현재 Workspace에 맞춘 목표 구조

```text
                         /goal
                           │
                           ▼
                    Root Orchestrator
                           │
              Task Contract + Router
                           │
          ┌────────────────┼────────────────┐
          │                │                │
       INLINE            FORK           ISOLATED
          │                │                │
          ▼                ▼                ▼
        Skill        Project Agent     Specialist Agent
                           │
                           ▼
                  One Agent Workspace
                           │
                     Pending CL
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       Durable Ledger             Evidence Collector
              │                         │
              └────────────┬────────────┘
                           ▼
                    Delta Reviewer
                           │
                    PASS / RETRY
                           │
                           ▼
                     Release Agent
```

## 도입 우선순위

### Phase 1 — 바로 적용

1. `.harness/` durable task/handoff/evidence 구조
2. Typed Context (`PINNED/REQUIRED/RETRIEVABLE/EPHEMERAL`)
3. Structured Handoff
4. Evidence Bundle schema
5. background completion result push
6. Context Access Policy
7. task/agent/step telemetry schema

### Phase 2 — PoC

1. `inline / fork / isolated` Context Topology Router
2. Delta Reviewer + review cursor/checkpoint
3. Runtime Adapter
4. selective log compactor + raw recovery
5. atomic recovery checkpoint

### Phase 3 — 최적화

1. Single/Cascade/Critique adaptive routing
2. Review Decision Cache
3. Context checkpoint compatibility
4. model-visible token budget admission
5. cache-affinity-aware session scheduling

## 당장은 하지 않아도 되는 것

- 복잡한 autonomous multi-agent scheduler부터 만드는 것
- 모든 로그를 LLM summary로 변환하는 것
- 모든 subagent에 독립 workspace를 강제하는 것
- token 수치 하나만 보고 aggressive compaction하는 것
- 세션 transcript를 장기 기억의 SSoT로 사용하는 것

먼저 **작업 상태·Context·Evidence의 contract를 안정화**한 뒤 자동화를 키우는 편이 안전하다.

## 결론

Trend 전체를 Claude Workspace에 적용할 때 가장 중요한 변화는 'Claude를 더 잘 프롬프트하는 법'이 아니다.

Workspace 자체가 다음 다섯 가지를 책임하도록 만드는 것이다.

1. **State** — 세션 밖에서도 작업을 복구한다.
2. **Context** — 필요한 정보만 적절한 topology로 전달한다.
3. **Execution** — Skill/Agent/Runtime을 task에 맞게 선택한다.
4. **Evidence** — 완료를 deterministic evidence로 검증한다.
5. **Telemetry** — token이 아니라 solved-task 비용과 품질을 측정한다.

이 구조가 자리 잡으면 Claude Code 세션은 Workspace의 '두뇌' 중 하나가 되고, 실제 연속성과 신뢰성은 Harness가 담당하게 된다.

## 참고 자료

- `ai/trend/ai-harness-scout-2026-09-10.md`
- `ai/trend/ai-harness-token-scout-2026-09-11.md`
- `ai/trend/ai-harness-token-scout-2026-09-12.md`
- `ai/trend/ai-harness-token-scout-2026-09-13.md`
- `ai/trend/ai-harness-token-scout-2026-09-14.md`
- `ai/trend/ai-harness-token-scout-2026-09-15.md`
- `ai/trend/ai-harness-token-scout-2026-09-16.md`
