---
title: AI Harness Token Scout - 2026-09-22
category: trend
tags:
  - ai
  - harness
  - context-engineering
  - token-optimization
  - codex
  - deep-agents
  - long-horizon
  - context-security
  - perforce
updated: 2026-09-22
---

# 2026-09-22 AI Harness · Context/Token Optimization Trend

## 조사 기준

`ai/trend/`의 2026-09-10~21 보고서를 먼저 대조했다. 이미 다룬 Tool/Skill deferral, model-visible token accounting, request-budget admission, cache affinity, review cursor/checkpoint compatibility, CCompactor, Docket, HarnessMark, Context Router, Skill catalog invalidation, Capability Snapshot, Token Optimizer MCP v7.1~7.2, Better Harness evidence externalization, SoL-Pi, post-turn compaction, Harness supply-chain lockfile, approval batching, subagent MCP elicitation 등은 반복하지 않았다.

2026-09-22 KST 새벽 기준 Claude Code의 최신 stable은 여전히 `v2.1.278`이며, Token Optimizer MCP의 최신 release도 `v7.2.0`으로 어제 이후 새로운 token/context benchmark는 확인하지 못했다. 대신 Codex `main`에서 context/output 축약과 async telemetry에 의미 있는 변화가 들어왔고, Deep Agents `0.7.16`의 mutation ownership 수정이 새로 공개됐다. 기존 Trend에서 빠졌던 LongHorizon-Harness와 최근 Context Privilege Escalation 연구도 현재 Perforce Harness 설계에 직접 연결되는 자료라 보강한다.

| 항목 | 신규/보강 포인트 | 평가 |
|---|---|---|
| Codex bounded response compaction | 구조/ID/상태/최종 답을 보존하고 verbose content만 축약 | **바로 적용** |
| Codex preview-first agent messaging | 알림에 짧은 preview를 실어 mandatory re-read turn 제거 | **바로 적용** |
| Codex originating-turn telemetry | 늦게 끝난 Skill/Tool도 시작한 turn의 비용·metadata에 귀속 | **바로 적용** |
| Deep Agents 0.7.16 | 동일 파일의 병렬 mutation을 Harness 경계에서 거부 | **바로 적용** |
| LongHorizon-Harness | fresh context + verified durable state + independent audit loop | **PoC 가치 매우 높음** |
| Context Privilege Escalation | context source의 role/scope 상승을 명시적으로 통제해야 함 | **원칙 바로 적용 / PoC** |

---

## 1. Codex — `짧게 자르기`보다 `무엇을 절대 잃지 않을지`가 먼저다

2026-09-21 19:41 UTC Codex `main`의 `#47100`은 TUI의 `read_thread`와 `wait_threads` 응답 축약 방식을 크게 바꿨다.

기존 구현은 약 999-byte response budget과 blanket string truncation을 사용해 supporting history뿐 아니라 실제 assistant answer, thread list entry, cursor까지 사라질 수 있었다. 새 구현은 다음 방향으로 바뀌었다.

- response budget을 8,000 bytes로 확대
- assistant message의 별도 2,000-character cap 제거
- oversized thread read는 **각 turn의 최신 assistant answer 중심으로 compact**
- wait target과 list entry, pagination cursor는 모두 보존
- 추가 축약이 필요할 때는 **content field만 줄임**
- ID, cursor, phase, status 같은 protocol value는 보존
- compact/truncate 여부를 결과에 명시
- archived page를 작은 page로 재요청하는 추가 retry를 없앰

핵심은 `minimum bytes`가 아니라 **semantic payload + protocol identity 보존**이다.

```text
Tool / Subagent Result
  ├─ MUST KEEP
  │    final answer / verdict
  │    IDs / cursor / status / phase
  │    evidence pointer
  │    task / thread identity
  │
  └─ SHRINKABLE
       verbose history
       repeated diagnostics
       explanatory detail
       old supporting messages
```

### Token / 비용 의미

표면적으로는 budget이 999B → 8KB로 커졌기 때문에 단일 response token 수는 늘 수 있다. 하지만 중요한 assistant answer를 잘라버린 뒤 다시 `read_thread`를 호출하거나 context를 복원하는 추가 turn을 줄이는 것이 목표다.

따라서 KPI도 `tokens/tool-call` 하나가 아니라 다음을 함께 봐야 한다.

- `tokens / solved task`
- `follow-up reads / task`
- `answer-survival rate`
- `protocol-field preservation`
- `turns / task`

### Perforce Harness 적용

`p4 describe`, TeamCity build 결과, test report, Codex review 결과를 줄일 때 다음 필드는 절대 제거하지 않는 편이 좋다.

```text
pending_cl
build_id / test_id
verdict
changed_files[]
failing_target
artifact/evidence pointer
cursor / generation
latest decisive message
```

반면 오래된 log body와 반복 warning은 content lane에서만 축약한다.

**평가: 🟢 바로 적용.** 현재 Tool-output compaction policy를 `size-first`에서 `semantic/protocol-aware`로 바꾸는 근거가 충분하다.

Source:
- https://github.com/openai/codex/commit/8e7f50cba9de847b0df487af5ec86371f21ea5f5

---

## 2. Codex — Agent 메시지는 `pointer only`보다 `preview + pointer`가 싸다

Codex `#47075`는 message board notification이 post/thread ID만 전달하던 구조를 바꿨다.

이전에는 Agent가 새 메시지 알림을 받으면 내용이 하나도 없어서 반드시 `read_post`를 한 번 더 호출해야 했다.

새 notification은:

- author / recipient attribution
- channel, message, thread ID
- 최대 150 characters의 post text preview
- preview가 잘린 경우에만 `read_post` guidance

를 함께 전달한다.

```text
기존
notification(id only)
    ↓
model turn
    ↓
read_post
    ↓
model turn

변경
notification(preview + pointer)
    ↓
충분하면 바로 판단
    └─ 부족할 때만 read_post
```

이건 Progressive Disclosure의 아주 실용적인 형태다. **원문을 context에 전부 넣지 않되, 항상 재조회해야 할 정도로 적게 주지도 않는다.**

### Perforce Harness 적용

Agent 간 handoff/event notification을 아래처럼 만들 수 있다.

```text
AgentMessage
  author
  recipient
  task_id
  pending_cl
  kind
  preview          # 150~300 chars
  artifact_ref
  truncated
  generation
```

예를 들어 Worker가 Reviewer에게 `build failed`만 보내는 대신:

```text
Build FAILED: UE5 FooEditor target, first root error C2039 at Foo.cpp:184.
3 downstream errors suppressed. evidence://task-123/build-9821
```

정도를 notification에 싣고, Reviewer가 상세 로그를 정말 필요로 할 때만 artifact를 읽는다.

### Token / 비용 의미

정량 benchmark는 공개되지 않았다. 하지만 ID-only notification이 강제하던 `read → reason` 추가 cycle을 일부 제거하므로, 효과는 `saved bytes`보다 **mandatory turn 제거**로 측정하는 게 맞다.

**평가: 🟢 바로 적용.** Build/Test 완료, Reviewer feedback, child-agent handoff에 특히 적합하다.

Source:
- https://github.com/openai/codex/commit/e51aacad602dec4108db0d2f62bb7f40c6ced56c

---

## 3. Codex — Async Skill의 비용은 `끝난 시점`이 아니라 `시작한 Turn`에 귀속

2026-09-21 20:12 UTC의 Codex `#47106`은 async/yielded Skill callback의 telemetry attribution을 수정했다.

Code Mode callback이 Skill Tool을 보유한 채 yield하고 그 사이 다음 turn이 시작되면, callback 완료 시점에 `active turn`을 조회하는 방식은 **원래 Skill을 시작한 turn의 token/cost/metadata를 잃게 된다.**

새 구조는 Skill analytics object를 만들 때 `SkillTurnMetrics`를 capture하고, turn extension store의 analytics metadata를 Skill/Plugin usage event까지 carry한다. Regression test도 Turn A에서 Skill을 시작하고 Turn B를 연 뒤 두 Skill read를 늦게 완료시켜 각각 원래 `turn_id`를 유지하는지 검증한다.

### Harness 설계 원칙 — causal attribution

```text
잘못된 방식
async result completes
      ↓
current active turn lookup
      ↓
비용/Skill 사용이 다른 turn에 귀속

권장 방식
Dispatch 시점
  capture task_id / turn_id / step_id / model / skill / policy
      ↓
async execution
      ↓
완료 시 origin metadata로 기록
```

### Perforce + TeamCity 적용

특히 다음 작업은 완료가 늦게 도착할 수 있다.

- TeamCity build
- UE automation test
- long-running `p4 sync`
- browser/MCP request
- async Codex review
- remote analysis worker

따라서 `ExecutionOrigin`을 dispatch 시점에 immutable snapshot으로 남기는 게 좋다.

```text
root_task_id
turn_id
step_id
agent_session_id
runtime / model / effort
skill_id / tool_id
pending_cl
capability_generation
policy_hash
started_at
```

완료 시점에는 이 snapshot에 result/cost/token/latency/evidence를 붙인다.

이렇게 해야 `cost / solved task`, `token / role`, `Skill ROI`, `retry cost` 같은 지표가 왜곡되지 않는다.

**평가: 🟢 바로 적용.** 현재 RuntimeAdapter telemetry schema에 넣을 가치가 높다.

Source:
- https://github.com/openai/codex/commit/6a601c00da854de09253952aaf2222f17c7c02ef

---

## 4. Deep Agents 0.7.16 — 병렬화는 `Agent 수`가 아니라 `Mutation Ownership`부터 관리해야 한다

Deep Agents `0.7.16`은 2026-09-21 공개됐고, 기존 Trend에서 다룬 Skill reload 외에 중요한 bug fix가 하나 포함됐다. `#6446`은 한 model response 안에서 **동일 파일에 대한 병렬 write/edit/delete를 거부**한다.

구현은 단순하지만 의미가 크다.

- mutation Tool: `write_file`, `edit_file`, `delete`
- 현재 AI message의 앞선 tool call을 검사
- path를 normalize/validate
- alias path(`/a.txt`, `/./a.txt`)까지 동일 파일로 판정
- 두 번째 동일-path mutation은 실행하지 않고 Tool error 반환

테스트도 이전 `xfail`에서 실제 regression test로 바뀌었고, 첫 edit는 success, 두 번째는 error이며 파일에는 첫 mutation만 반영되는지 검증한다.

### Harness 설계 원칙

멀티 에이전트 병렬화에서 가장 위험한 것은 모델들이 서로 다른 Agent라는 사실보다 **같은 mutable resource를 동시에 소유하는 것**이다.

```text
Parallel OK
Worker A → Foo.cpp
Worker B → Bar.cpp

Reject / Serialize
Worker A → Foo.cpp
Worker B → Foo.cpp
```

### Perforce 적용

Pending CL 단위로 file ownership map을 두는 것이 좋다.

```text
MutationLease
  depot_path
  task_id
  worker_id
  generation
  operation = edit | delete | add
  acquired_at
```

Dispatch 전에 `p4 opened` + planned file set을 보고 충돌을 검사하고, 동일 depot path를 수정하는 task는 serialize한다. local path alias보다 depot path를 canonical identity로 쓰는 게 좋다.

이건 token 압축 기법은 아니지만 충돌 → 재탐색 → resolve → 재review → 재build로 이어지는 **retry token/cost**를 줄이는 Harness 최적화다.

**평가: 🟢 바로 적용.** Dependency graph 기반 parallel dispatch보다 file/resource ownership gate를 먼저 넣는 게 안전하다.

Source:
- https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.16
- https://github.com/langchain-ai/deepagents/commit/2e2ee91b794ed549b299445b7bb5de641e9a4f4d

---

## 5. LongHorizon-Harness — `긴 Session` 대신 `검증된 상태 + Fresh Context`로 장기 Task를 이어간다

이 프로젝트는 오늘 생성된 것은 아니지만 2026-08 공개 후 빠르게 확장됐고, 기존 Wiki/Trend에서 빠져 있었다. 현재 설계 중인 durable state / runtime adapter / evidence verification과 정확히 겹쳐 보강 가치가 높다.

LongHorizon-Harness의 핵심은 기존 Agent의 native loop를 대체하는 게 아니라 외부에서 다음 MEA(Manage–Execute–Audit) loop를 반복하는 것이다.

```text
Original Goal + Verified State
        ↓
Manager: 다음 bounded step
        ↓
Executor: fresh context에서 실행
        ↓
Auditor: 실제 파일/UI/log/test를 독립 확인
        ↓
PASS → verified checkpoint
FAIL → failure evidence
        ↓
다음 round
```

중요한 규칙은 **Executor가 성공했다고 말한 것은 progress가 아니다. Auditor가 확인한 결과만 trusted task state가 된다.** 실패 결과도 삭제하지 않고 evidence로 남긴다.

Claude Code, Codex CLI, OpenCode, DeepSeek Harness 등을 `AgentAdapter`로 연결하며 Manager/Executor/Auditor에 서로 다른 backend/model/reasoning effort를 선택할 수 있다.

### 공개 benchmark

프로젝트가 공개한 same-backbone/same-execution-backend 비교에서 Qwen 3.7-Plus + Claude Code baseline 대비:

| Benchmark | Baseline | LongHorizon | 변화 |
|---|---:|---:|---:|
| WeaveBench 114 tasks PassRate | 51.8 | **80.7** | +28.9pt |
| OSWorld 2.0 binary | 2.8 | **8.3** | 3.0× |
| Terminal-Bench 2.1 | 69.7 | **77.2** | +7.5pt |

Terminal-Bench 2.1에서는 성공률 상승과 함께 **baseline보다 24% 적은 token**을 보고한다. 다만 이는 프로젝트 자체 benchmark이며 task/domain/backbone에 따라 비용은 반대로 증가할 수 있다. 프로젝트도 Games subset에서 Qwen 3.7-Plus는 Harness가 3.2× token을 쓰지만 Opus 4.7은 33% 적게 쓴 사례를 공개한다.

즉 `more orchestration = always cheaper`가 아니라 **강한 모델이 bounded contract를 적은 round에 만족할 수 있을 때 audit/replan overhead가 상쇄**된다는 해석이 적절하다.

### 현재 Perforce Harness에 가져올 것

```text
TaskLedger
  original_goal
  verified_checkpoint
  unresolved_work[]
  failure_evidence[]
  pending_cl

Round
  Manager   -> bounded TaskContract
  Worker    -> fresh context + one mutation scope
  Reviewer  -> read-only p4 diff/build/test audit
  Promote   -> verified state only
```

특히 다음 세 가지가 가치가 높다.

1. Worker가 이전 session transcript를 계속 물고 가지 않고 **fresh context**로 시작
2. 다음 round context는 `원래 목표 + 검증된 상태 + 현재 step + 필요한 실패 evidence`로 제한
3. Review 결과가 PASS해야만 task state를 `verified`로 승격

**평가: 🟡 PoC 가치 매우 높음.** 제품 전체 도입보다 `verified-state ledger + fresh-context round` 패턴을 현재 Perforce Harness에 이식하는 쪽이 현실적이다.

Sources:
- https://github.com/AMAP-ML/LongHorizon-Harness
- https://lh-harness.pages.dev
- https://arxiv.org/abs/2608.01964

---

## 6. Context Privilege Escalation — Context에는 내용뿐 아니라 `권한/범위 provenance`가 필요하다

2026-09-01 공개된 `What's in Your Agent's Context? Context Privilege Escalation Attacks against AI Agent Harness`는 Claude Code와 Codex를 포함한 12개 real-world harness의 context assembly를 분석했다. 기존 Trend에서는 빠져 있었지만, 최근 추가한 `harness.lock`이 **구성 요소의 공급망 무결성**을 다룬다면 이 연구는 **context 자체의 role/scope 무결성**을 다룬다는 점에서 보강 가치가 높다.

연구가 정의한 두 공격 유형은 다음과 같다.

### M-CPE — MessageRole Context Privilege Escalation

낮은 권한의 source에서 온 attacker-controlled content가 Harness 조립 과정에서 더 높은 message role로 올라간다.

예:

```text
Git/Perforce metadata 또는 Tool output
        ↓
Harness가 developer/system-like context로 승격
        ↓
모델이 instruction으로 신뢰
```

### X-CPE — Cross-Scope Context Privilege Escalation

특정 task/workspace에서만 유효해야 할 content가 memory/handoff를 통해 더 넓은 scope로 살아남는다.

```text
Task A의 untrusted finding
        ↓ auto-memory/promotion
Workspace / Project memory
        ↓
Task B에서도 고권한 context로 재사용
```

### Harness 적용 — Context Manifest

`harness.lock` 옆에 model-facing context source도 provenance를 갖게 해야 한다.

```text
ContextSource
  source_id
  kind
  role = system | developer | user | tool | data
  trust_class
  scope = org | project | workspace | task | turn
  provenance
  content_hash
  generation
  allowed_promotions[]
  expires_at
```

특히 다음 데이터는 **내용에 instruction처럼 보이는 문장이 있더라도 data/tool role을 유지**해야 한다.

- Perforce changelist description
- `p4 describe` / history
- Git commit message
- Issue/PR text
- MCP/browser output
- 검색/RAG 문서
- build/test logs
- 다른 Agent의 unverified self-report

Task evidence를 project memory나 reusable Skill로 승격할 때는 explicit policy/evidence gate를 거쳐야 한다.

### Token / Context 관점

주 목적은 security/correctness지만, scope를 명시하면 불필요한 persistent context도 줄어든다. Task-local evidence가 workspace/global memory로 무작정 승격되지 않기 때문에 unrelated session의 context budget과 cache prefix 오염을 동시에 줄일 수 있다.

**평가: 🟢 Context Manifest와 role/scope monotonicity 원칙은 바로 적용. 🟡 자동 context-flow audit는 PoC.**

Source:
- https://arxiv.org/abs/2609.01222

---

## 오늘의 통합 결론

오늘 결과를 합치면 현재 Harness가 관리해야 할 단위는 단순 `context tokens`보다 더 구체적이다.

```text
                 Durable Task Ledger
                        │
      ┌─────────────────┼──────────────────┐
      │                 │                  │
 Verified State    Context Manifest   Mutation Ownership
      │            role/scope/trust      depot path
      │                 │                  │
      └──────────────┬──┴──────────────────┘
                     ↓
             Fresh Execution Context
                     │
              Worker / Subagent
                     │
        preview-first event / result
                     │
            Evidence-aware Review
                     │
              PASS only promotes
                     │
              Verified Checkpoint
```

구현 우선순위는 다음과 같이 보는 것이 좋다.

1. **Semantic Tool-output contract** — verdict/ID/status/pointer는 pin, verbose body만 truncate
2. **Preview + Pointer notification** — build/review/handoff의 mandatory re-read 제거
3. **Origin-bound telemetry** — async Skill/Build/Test 비용을 dispatch turn에 귀속
4. **Perforce MutationLease** — 동일 depot path 병렬 write 금지
5. **ContextSource Manifest** — role/trust/scope promotion 통제
6. **Verified-state round PoC** — fresh context + independent review + checkpoint

오늘의 핵심 문장은 다음과 같다.

> **Context를 줄일 때 중요한 것은 가장 작게 만드는 것이 아니라, 결정에 필요한 의미와 protocol identity는 보존하고 나머지만 지연 로딩하는 것이다. 장기 작업에서는 그 위에 verified durable state와 mutation ownership까지 붙여야 한다.**

## 참고 상태

- Claude Code stable: `v2.1.278` — 2026-09-19 이후 새 stable 없음
- Codex: `0.157.0-alpha.1` prerelease가 2026-09-21 공개됐고, 위 Codex 항목은 현재 `main` 변화이므로 stable 전체 동작으로 일반화하지 않음
- Deep Agents: `0.7.16` — 2026-09-21 공개
- Token Optimizer MCP: `v7.2.0` — 전일 이후 신규 token/context benchmark 없음
