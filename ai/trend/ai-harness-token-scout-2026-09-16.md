---
title: AI Harness Token Scout - 2026-09-16
category: trend
tags:
  - ai
  - harness
  - context-engineering
  - token-optimization
  - claude-code
  - codex
  - subagents
  - skills
  - durable-state
updated: 2026-09-16
---

# AI Harness Token Scout - 2026-09-16

> 오늘의 핵심은 **Context를 더 세게 압축하는 것보다, 어떤 Context가 어떤 모델·Reviewer·Subagent와 호환되는지 명시하고, Skill·Fork·Isolated Subagent 사이에서 실행 위치를 선택하며, 복구 상태를 원자적으로 보존하는 방향**이다.

## 조사 범위와 중복 제외

`ai/trend/`의 2026-09-10~15 보고서와 최신 `ai/Orchestration.md`를 먼저 확인했다. 이미 다룬 Strands Context Manager/preset, Token Optimizer MCP, CCompactor, Docket, Codex의 model-visible token accounting·budget admission·bounded recap·cache affinity·delta reviewer·background persistence, GitHub Copilot output compression, HydraFusion Single/Cascade/Critique routing 등은 반복하지 않았다.

오늘은 2026-09-15 UTC 이후 실제 변경과, 최근 발표됐지만 기존 Scout에서 누락된 **Subagent/Skill 실행 방식 연구** 중 Harness 설계에 직접 영향을 주는 항목만 포함했다.

## 오늘의 핵심 발견

| 항목 | 신규성 | 핵심 | 평가 |
|---|---|---|---|
| Claude Code v2.1.273 | 2026-09-16 05:23 KST 공개 | context 계측 오류·cache rewrite 수정, gateway/OTEL cost attribution, context access policy 강화 | **바로 적용** |
| Codex Guardian checkpoint migration | 2026-09-15 main | compaction checkpoint에 model compatibility를 적용하고 mismatch 시 legacy evidence 보존 | **바로 적용 / PoC** |
| Codex ReviewRequest + ReviewModel | 2026-09-15 main | cached approval·fresh review·routing·model metadata를 reviewer subsystem의 명시적 contract로 승격 | **바로 적용 / PoC** |
| Deep Agents fork + Subagents vs Skills 연구 | 2026-09-01~09-07, 기존 Scout 누락 | Inline Skill / Fork / Isolated Subagent를 Context topology로 선택 | **바로 적용 / PoC** |
| Deep Agents atomic interrupt recovery | 2026-09-15 | interruption recovery를 2개 state write에서 1개 atomic checkpoint로 통합 | **바로 적용** |

---

## 1. Claude Code v2.1.273 — Context 최적화의 전제는 정확한 계측과 Context Firewall

Anthropic은 2026-09-15 20:23 UTC, 한국 시간으로 9월 16일 05:23경 Claude Code `v2.1.273`을 공개했다. 이번 릴리스는 새로운 압축 알고리즘보다 **Context 비용을 잘못 측정하거나 cache를 불필요하게 깨뜨리던 경로를 바로잡는 변화**가 중요하다.

### A. Auto-compact가 실제 window의 절반에서 발동하던 계측 오류 수정

Advisor-tool turn을 실제 context 크기의 약 2배로 계산해 context meter와 auto-compact가 너무 일찍 동작하던 문제가 수정됐다.

이건 단순 UI 버그가 아니다.

```text
잘못된 estimator
  실제 context 45%
       ↓
  계산 context ~90%
       ↓
 premature compact
       ↓
 summary call + 정보 손실 + 재탐색 가능성
```

기존 Scout에서 정리한 `model_visible_tokens` 원칙을 더 강화한다. **Compaction trigger는 저장된 event 크기나 내부 tool bookkeeping이 아니라 모델이 실제로 소비하는 context를 기준으로 해야 한다.**

공식 절감률은 공개되지 않았지만, 이전 동작은 실제 window를 충분히 쓰기도 전에 compaction 비용과 정보 손실을 발생시킬 수 있었다.

### B. `/login`, `/upgrade`, `/extra-usage`가 prompt cache를 전체 rewrite시키던 문제 수정

이 명령들이 기존 thinking context를 버려 다음 요청에서 full prompt-cache rewrite를 발생시키던 문제가 수정됐다.

Harness 입장에서는 **업무 logic과 무관한 lifecycle/auth operation도 cache continuity를 깨뜨릴 수 있다**는 뜻이다. 따라서 token regression test에 정상 turn뿐 아니라 다음 경로를 포함하는 편이 좋다.

```text
normal
resume
compact
interrupt/resume
auth refresh
quota / usage state transition
```

### C. Gateway hint와 component-level token attribution

옵트인 환경변수 `CLAUDE_CODE_GATEWAY_HINT_HEADERS=1`을 켜면 LLM gateway 요청에 request class, agent type, 이전 tool duration, compaction 여부, context-compacted 여부를 나타내는 hint header가 추가된다.

또 `OTEL_LOG_TOOL_DETAILS=1`은 cost/token metric에 실제 agent, skill, plugin, MCP server 이름까지 포함하도록 확장됐다.

이 변화는 Prompt에 routing metadata를 넣지 않고도 Harness/Gateway에서 다음과 같은 계측이 가능해지는 방향이다.

```text
Task
 └─ Agent
     └─ Skill / MCP / Tool
         ├─ uncached input
         ├─ cache read
         ├─ output
         ├─ duration
         └─ cost
```

내부 Harness에서도 `cost / solved task`만 보지 말고 `agent_type × skill × tool × runtime`까지 drill-down할 수 있게 만드는 것이 좋다.

### D. 권한 정책은 Tool 실행만 막는 것이 아니라 Context 유입까지 막아야 한다

`permissions.blockReadsOutsideWorkingDirectories`가 활성화되어 있을 때 repository 설정으로 지정된 외부 memory directory가 prompt에 로드되거나 recall/index/memory extraction에 사용되던 경로도 차단됐다.

이건 Context Engineering에서 중요한 패턴이다.

```text
Access Policy
  ├─ direct Read
  ├─ search / RAG indexing
  ├─ memory recall
  ├─ memory extraction
  └─ prompt preload
```

Perforce Harness에서도 depot/workspace allowlist를 `p4 print/read`에만 적용하지 말고 **검색 index, embedding, durable memory, handoff 생성**에도 동일하게 적용해야 한다.

### 적용

- `raw_event_bytes`와 `model_visible_tokens`를 분리하고 compact trigger는 후자를 기준으로 한다.
- cache regression fixture에 auth/resume/compaction lifecycle을 포함한다.
- Agent/Skill/MCP/Tool 단위 cost attribution schema를 둔다.
- `ContextAccessPolicy`를 만들어 Read/RAG/Memory/Prompt preload에 공통 적용한다.

**평가: 🟢 바로 적용**

Source:
- https://github.com/anthropics/claude-code/releases/tag/v2.1.273
- https://github.com/anthropics/claude-code/blob/main/feed.xml

---

## 2. Codex Guardian — Compaction Checkpoint도 Model Compatibility를 가져야 한다

9월 15일 Codex `main`의 Guardian 관련 변경은 전일의 `review_cursor / delta context`에서 한 단계 더 나간다. 이제 **이전 모델이 만든 compact checkpoint를 다른 reviewer가 그대로 소비해도 되는가**를 명시적으로 다룬다.

### 새 구조

`#45782`, `#45789`는 새 compaction에 producer model hash를 기록하고, resume/remote compaction 시 현재 선택된 reviewer와 checkpoint의 compatibility를 확인한다.

```text
Raw transcript + evidence
        │
        ▼
   Compaction
 producer_model_hash
        │
        ▼
 Checkpoint
        │
   Reviewer 변경
        │
        ├─ compatible → compact checkpoint 사용
        │
        └─ unknown / mismatch
              ↓
        legacy transcript + retained evidence 보존
```

호환성을 알 수 없거나 맞지 않으면 legacy transcript를 즉시 버리지 않는다. 사용자 restriction과 verified answer를 retained evidence로 유지하며, compatible compaction이 생성된 뒤에야 parent-context review로 이동한다.

또 일반적인 compaction은 pending review를 유지하지만, evidence policy가 바뀌는 migration에서는 이전 policy에 묶인 pending review를 무효화한다.

### 왜 중요한가

지금까지의 Context 최적화는 대개 `summary가 최신인가?`, `cursor가 맞는가?`를 봤다. 이번 변화는 여기에 **“그 summary를 만든 모델/정책과 지금 소비하는 reviewer가 의미적으로 호환되는가?”**를 추가한다.

예를 들어 강한 분석 모델이 만든 자유형 summary를 더 작은 reviewer가 소비하거나, 반대로 reviewer schema가 바뀌었는데 예전 compact snapshot을 그대로 사용하면 중요한 restriction/evidence가 암묵적으로 사라질 수 있다.

### Perforce Harness 적용

Compact handoff/checkpoint에 다음 metadata를 붙이는 것이 좋다.

```text
ContextCheckpoint
  checkpoint_id
  task_id
  pending_cl
  producer_runtime
  producer_model
  context_schema_version
  policy_hash
  evidence_generation
  source_event_range
  summary
```

그리고 consumer 쪽에는:

```text
ContextCompatibility
  accepted_schema_versions
  policy_hash
  reviewer_model_family
  evidence_requirements
```

를 둔다.

Mismatch라면 억지로 compact snapshot을 재사용하지 말고 **raw ledger / typed evidence에서 새 projection을 생성**한다. 이는 저장·일시적 context 비용을 더 쓸 수 있지만, 잘못된 summary를 재사용해 review를 다시 하거나 잘못 승인하는 비용보다 안전하다.

정량 token 절감률은 공개되지 않았다.

**평가: 🟢 checkpoint schema 원칙은 바로 적용 / 🟡 compatibility migration은 PoC**

Sources:
- https://github.com/openai/codex/commit/0c3a14bbc20e1b55286d3fb89a3235c1e11d9cc1
- https://github.com/openai/codex/commit/c51cb968e43fd52255aacf568220aed4654c3f97

---

## 3. Codex — Review Decision Cache는 일반 Cache와 다르게 Freshness 조건이 필요하다

같은 날 `#45693`은 Guardian approval routing을 `ReviewRequest`로 모았다. Reviewer extension이 contributor routing, cached approval, synchronous fallback, cancellation을 소유하고, host는 action validation과 session-specific preparation을 담당한다.

중요한 점은 **cached allow가 있어도 fresh review가 필요한 경우 이전 결정을 덮어쓴다**는 것이다. 테스트도 fresh review requirement가 기존 cached allow를 무효화하는 경로를 검증한다.

별도 `#45684`는 reviewer의 model, reasoning effort, preferred model, override 여부 등을 `ReviewModel`이라는 하나의 구조로 묶어 실행, analytics, failed-review record까지 동일한 값을 전달하도록 정리했다.

### Harness 패턴

일반 prompt cache와 review decision cache는 다르다.

```text
Prompt Cache
→ byte/prefix compatibility가 핵심

Review Decision Cache
→ action + evidence + policy + model + workspace state compatibility가 핵심
```

Perforce 환경에서는 최소한 다음을 cache key/invalidation 조건으로 보는 것이 좋다.

```text
ReviewDecisionKey
  action_hash
  pending_cl
  diff_hash
  base_revision_set
  evidence_generation
  policy_hash
  reviewer_signature
```

다음 사건은 `fresh_review=true`로 두는 편이 안전하다.

- `p4 diff` 변경
- base revision/sync 상태 변경
- 사용자 restriction 변경
- sandbox/permission escalation
- 실패 후 retry에서 action argument 변경
- reviewer model/policy 변경

반대로 동일 action, 동일 evidence generation, 동일 policy라면 reviewer call을 재사용할 여지가 있다.

`ReviewModel` 패턴도 유용하다. Orchestrator가 model string만 넘기는 대신 `model + effort + selection reason + override + policy`를 하나의 immutable routing decision으로 만들고 실행·비용·evidence에 동일하게 귀속시키면 분석이 쉬워진다.

**평가: 🟢 cache key/invalidation 원칙은 바로 적용 / 🟡 실제 decision cache는 PoC**

Sources:
- https://github.com/openai/codex/commit/7f01a84effccef40d4726c3ca12e6c839ec98d7a
- https://github.com/openai/codex/commit/508a006d7aaa485ac0367c9e45c69ebb948af518

---

## 4. Skill vs Subagent — 이제 `Model Router`뿐 아니라 `Context Topology Router`가 필요하다

이 항목은 오늘 생긴 프로젝트는 아니지만 9월 초에 공개된 뒤 기존 Scout에 누락됐고, 최근의 Context Router 설계와 직접 연결돼 포함했다.

### Deep Agents: isolated vs fork

LangChain Deep Agents는 subagent의 기본 동작을 `isolated`로 두고, 실험적인 `mode="fork"`를 제공한다.

`isolated`는 delegated task description만 받아 새 context에서 시작한다. 반면 `fork`는 parent의 effective conversation history와 system prompt를 이어받는다. 구현은 parent history를 같은 summarization cutoff 규칙으로 재구성하고, 아직 해결되지 않은 trailing tool-call message는 제거해 fork prefix가 실제 cached prefix와 맞도록 한다.

```text
ISOLATED
Parent ── task contract ──> Child fresh context
          <── result ─────

FORK
Parent context ───────────> Child inherited context
                             + child prompt
```

Isolated는 오염을 줄이고 peak context를 분리하지만, parent가 이미 찾은 파일·ID·설계 정보를 다시 전달하거나 재탐색해야 한다. Fork는 재탐색을 줄이지만 parent의 큰 context와 편향도 같이 물려받는다.

### 연구: Subagents vs Agent Skills

최근 arXiv `2609.09233`은 SkillsBench 87개 중 procedural contract skill을 합성할 수 있었던 64개 task에서 Agent Skill과 Subagent execution을 비교했다.

핵심 결과는 단순히 “Subagent가 더 좋다”가 아니다.

- 기존 human-authored skill처럼 **input/output contract가 약한 knowledge package**에서는 inline Agent Skill이 subagent와 비슷하거나 더 좋았다.
- 성공 trajectory에서 합성한 **procedural + explicit input/output contract** skill에서는 subagent 실행이 더 좋아졌고, context bandwidth가 제한된 작은 모델에서 차이가 컸다.
- distracting tool/skill이 많아져 초기 context가 커질수록 subagent 방식이 더 완만하게 성능 저하를 보였다.
- 강한 모델에서는 subagent가 80%가 넘는 task에서 peak context를 낮췄다.
- 대신 total token은 subagent 쪽이 상당히 더 많았다. Parent↔Child communication과 context 복제 비용 때문이다.

즉 **peak context 절감 ≠ total token 절감**이다.

### 3-way Context Topology Router

현재 Harness에는 다음 세 실행 방식을 구분하는 것이 좋다.

```text
1. INLINE SKILL
- 전역 rule / policy
- 짧은 procedure
- 여러 지식을 동시에 결합해야 하는 작업
- input/output contract가 느슨한 reference knowledge

2. FORKED SUBAGENT
- parent가 이미 상당한 탐색을 끝낸 작업
- 기존 symbol/file/decision을 그대로 이어받아야 하는 fixer
- context 재탐색 비용이 큰 작업

3. ISOLATED SUBAGENT
- 명확한 input/output contract가 있는 leaf task
- 독립 reviewer / security reviewer
- 별도 연구/검증
- parent bias를 차단해야 하는 작업
```

Orchestrator contract를 다음처럼 확장할 수 있다.

```text
ExecutionPlan
  model
  effort
  context_mode: inline | fork | isolated
  input_contract
  output_schema
  context_budget
  cache_affinity
```

Claude와 Codex가 서로 다른 runtime이라 진짜 memory fork가 불가능한 경우에는 `fork`를 **stable prefix + structured handoff + bounded recent history**로 에뮬레이션할 수 있다.

**평가: 🟢 routing rule은 바로 적용 / 🟡 fork 실행기는 PoC**

Sources:
- https://github.com/langchain-ai/deepagents/commit/6b4427f07dc35a0b61cf8224db090ea6bee6f72f
- https://github.com/langchain-ai/deepagents/blob/main/libs/deepagents/deepagents/middleware/subagents.py
- https://arxiv.org/abs/2609.09233

---

## 5. Deep Agents — Interrupt Recovery도 하나의 Atomic Checkpoint여야 한다

2026-09-15 Deep Agents의 `#6319`는 interruption recovery state를 두 번의 순차 `aupdate_state` 호출에서 하나로 합쳤다.

기존에는:

```text
write 1: reconstructed partial assistant message
write 2: cancellation notice + context token count
```

였기 때문에 remote recovery에서 불필요한 request가 하나 더 발생하고, 첫 write만 성공한 뒤 두 번째가 실패하면 불완전한 checkpoint가 남을 수 있었다.

변경 후에는 ordered message delta와 최신 nonzero context-token count를 **한 번의 state update**로 저장한다.

```text
Atomic Recovery Checkpoint
  partial_output?
  interruption_notice
  context_tokens
```

### Perforce Harness 적용

Agent process interruption, 사용자 취소, timeout, CLI crash 등에서 아래 state를 여러 write로 나누지 않는 편이 좋다.

```text
RecoveryCheckpoint
  task_status
  cancellation_reason
  last_partial_output
  context_token_count
  evidence_cursor
  review_cursor
  pending_cl
  last_tool_state
```

DB transaction 또는 append-only single event로 먼저 기록하고, 성공한 뒤에만 다음 handoff generation을 노출한다.

직접적인 token 절감량은 공개되지 않았고 효과의 중심은 consistency와 remote request 감소다. 하지만 불완전 checkpoint 때문에 resume agent가 과거 작업을 다시 탐색하거나 recovery turn을 반복하는 간접 비용을 줄일 수 있다.

**평가: 🟢 바로 적용**

Source:
- https://github.com/langchain-ai/deepagents/commit/2ab439449f0040fdf0f89f30fbf852313c24a5a6

---

## 오늘의 통합 결론

최근 며칠간의 흐름을 합치면 Harness의 Context 계층은 단순한 `Context Manager` 하나보다 다음처럼 나누는 것이 더 적합해 보인다.

```text
                     Task / Pending CL
                            │
                      Durable Ledger
                            │
           ┌────────────────┼────────────────┐
           │                │                │
      Access Policy    Evidence/Review   Raw History
           │                │                │
           └────────── Context Projection ───┘
                            │
                  Compatibility Check
            schema / policy / producer model
                            │
                    Context Topology Router
             ┌──────────────┼──────────────┐
             │              │              │
         Inline Skill   Fork Context   Isolated Context
             │              │              │
             └──────────────┼──────────────┘
                            │
                       Runtime Adapter
                    Claude Code / Codex
                            │
                      Tool / Edit / Test
                            │
                    Evidence + Review Cache
                            │
                       Atomic Checkpoint
```

### 구현 우선순위

1. **바로 적용** — `ContextCheckpoint`에 schema/policy/producer-model metadata 추가
2. **바로 적용** — compact trigger를 model-visible token 기준으로 통일
3. **바로 적용** — `inline / fork / isolated` Context Topology를 Task Contract에 추가
4. **바로 적용** — interruption/recovery state를 atomic checkpoint로 기록
5. **PoC** — ReviewDecision cache와 explicit invalidation/fresh-review 조건
6. **PoC** — Gateway/OTEL 기반 Agent·Skill·MCP 단위 cost attribution

## 한줄 결론

**Token 최적화의 다음 단계는 “무엇을 얼마나 압축할까”가 아니라 “누가 만든 Context를 누구에게 재사용할 수 있는가, 그리고 이 작업은 어느 Context에서 실행해야 하는가”를 Harness가 결정하는 것이다.**
