---
title: AI Harness Token Scout - 2026-09-23
category: trend
tags:
  - ai
  - harness
  - context-engineering
  - token-optimization
  - claude-code
  - codex
  - deep-agents
  - skills
  - compaction
  - cache
  - telemetry
  - perforce
updated: 2026-09-23
---

# 2026-09-23 AI Harness · Context/Token Optimization Trend

## 조사 기준

`ai/trend/`의 2026-09-10~22 보고서를 먼저 대조했다. 이미 다룬 Tool/Skill deferral, model-visible token accounting, request-budget admission, cache affinity, stable/dynamic prompt boundary, post-turn compaction, semantic Tool-output compaction, preview+pointer notification, origin-bound async telemetry, ContextSourceManifest, MutationLease, verified-state loop, Harness lockfile 등은 반복하지 않았다.

2026-09-23 06:00 KST 기준으로 GitHub release/commit과 Anthropic 공식 발표를 확인했다. 오늘은 **Claude Code v2.1.280, Codex의 cloud Skill catalog cache 및 compaction/resume 변경, Guardian thread-context 안정화, Deep Agents Code 0.1.73의 cache/cost 계측**이 실질적으로 새롭다.

Token Optimizer MCP는 여전히 `v7.2.0`이 최신이며, 전일 이후 새로운 token/context benchmark는 확인되지 않았다. Deep Agents core `0.7.17`은 exit status와 inline MIME 관련 bug fix 중심이라 별도 핵심 항목으로 올리지 않았다.

| 항목 | 신규 포인트 | 평가 |
|---|---|---|
| Claude Code v2.1.280 + Opus 5.5 | 1M context, 낮아진 cache-read 비용, MCP description cap 조절, Hook offload 계측 | **바로 적용 / Router PoC** |
| Codex cloud Skill catalog cache | 매 turn Skill discovery 제거, auth/resource generation 기반 invalidation | **바로 적용** |
| Codex compaction resume capsule | compaction checkpoint에 runtime/turn/settings를 함께 저장 + child chatter raw retention 축소 | **바로 적용 / PoC** |
| Codex Guardian thread context | thread-owned review context가 stable/default, rigid hash gate 일부 제거 | **바로 적용 / 기존 설계 수정** |
| Deep Agents Code 0.1.73 | provider-aware cache retention telemetry + durable nested-agent cost breakdown | **바로 적용** |

---

## 1. Claude Code v2.1.280 — Context Window보다 `Tool Schema와 Hook Output을 얼마나 통제하는가`가 더 중요해졌다

Claude Code `v2.1.280`은 2026-09-23 01:38 KST경 공개됐다. 이번 release에는 새 모델 지원뿐 아니라 Harness의 context surface를 직접 조절하고 계측하는 기능이 들어왔다.

### 1-1. MCP description에 명시적인 Context Budget knob가 생김

새 환경 변수 `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`로 기존 **2,048-character cap**을 조절할 수 있다. 대상은 session에서 Claude에게 노출되는 MCP Tool description과 server instruction이다.

이건 MCP/Tool optimization에서 중요한 변화다. Tool 개수가 많을 때 문제는 실제 Tool 실행 결과보다 **매 turn 반복되는 description/schema prefix**인 경우가 많다.

```text
Capability Registry
       ↓
Role / Task filter
       ↓
Tool description budget
       ↓
Claude Code model-visible catalog
```

내부 Harness에서는 무작정 cap을 낮추기보다 Tool을 다음 세 그룹으로 나누는 편이 좋다.

```text
Core Tool
- 짧은 description을 항상 노출

Deferred Tool
- 이름/한 줄 capability만 노출
- 필요할 때 상세 schema/Skill 로드

Rare Tool
- 초기 context에서 완전히 제외
```

Perforce 기준으로 `p4 opened`, `p4 diff`, build/test처럼 빈도가 높은 Tool은 짧은 고정 description을 쓰고, stream/client 생성·submit·administrative Tool은 role/policy가 허용할 때만 materialize하는 방식이 적합하다.

**Token 절감 원리:** 반복 prefix에서 Tool description 자체를 줄이고, stable prefix를 더 오래 유지한다.

**Trade-off:** description을 너무 줄이면 Agent가 잘못된 Tool을 고르거나 parameter semantics를 재질문할 수 있다. 따라서 `characters saved`가 아니라 `tokens/solved-task`, wrong-tool rate, discovery turn 수를 함께 봐야 한다.

**평가: 🟢 바로 적용.** 현재 Skill/MCP capability profile과 연결해 `role별 description budget`을 두는 것이 좋다.

### 1-2. Hook output offload를 실제로 측정할 수 있게 됨

같은 release는 `hook_execution_complete` OpenTelemetry event에:

- Hook output size
- oversized output이 파일로 offload된 횟수

를 추가했다.

즉 Hook 기반 progressive disclosure를 "느낌상 줄었다"가 아니라 실제 데이터로 볼 수 있다.

내부 Harness에서도 다음 metric을 남기는 게 좋다.

```text
hook_id
raw_output_bytes
model_visible_bytes
offloaded_bytes
offload_artifact_count
rehydration_count
consumer_turns
```

특히 build preflight, `p4 opened`, static analysis, repository scan Hook은 output이 커지기 쉽다. Model에는 verdict/preview/pointer만 주고 원문은 Evidence Store에 저장한 뒤, **실제 rehydration이 얼마나 일어나는지** 측정해야 적절한 preview 크기를 결정할 수 있다.

**평가: 🟢 바로 적용.** 현재 Evidence Artifact Store의 효과를 검증하는 핵심 telemetry로 쓰기 좋다.

### 1-3. Opus 5.5 — Model Router의 비용 함수가 크게 바뀜

v2.1.280부터 `claude-opus-5-5`가 Claude Code의 기본 Opus가 됐다. Anthropic 공식 발표 기준:

- context window: **1M tokens**
- input: **$4 / MTok**
- output: **$20 / MTok**
- cache read: **$0.20 / MTok**
- cache write: **$5 / MTok**
- Opus 5 대비 typical workload 비용 **약 40% 감소**
- Opus 5 대비 output generation **30% 이상 빠름**
- cache read 단가는 Opus 5의 $0.50 → $0.20으로 **60% 감소**

Anthropic은 모델 자체가 task당 token도 더 적게 쓰는 것이 전체 비용 감소의 일부라고 설명한다. 200,000-line codebase audit 사례에서는 Opus 5가 20시간 이상 걸리고 2.5배 많은 token을 쓴 반면 Opus 5.5는 3시간 이내였다고 보고했다. 다만 이는 vendor-reported 사례이며 우리 환경에서 그대로 재현된다고 보면 안 된다.

### Perforce + Claude/Codex Router 적용

1M context가 생겼다고 repository context를 더 많이 preload하는 것은 권장하지 않는다. 오히려 cache read가 싸졌기 때문에 **stable prefix 재사용 + selective context**의 경제성이 더 좋아졌다.

PoC는 다음 세 arm 정도가 적절하다.

```text
A. Claude Opus 5.5 medium
B. 기존 Claude coding model
C. Codex reviewer/worker baseline

고정:
- 동일 task
- 동일 workspace snapshot
- 동일 Tool/Skill surface
- 동일 build/test oracle

측정:
- solve rate
- input/output/cache tokens
- turns/task
- wall time
- cost/solve
- reread/retry count
```

**평가: 🟡 Router PoC 가치 높음.** 특히 long-horizon migration, architecture-heavy task, large review에서 별도 route를 시험할 가치가 있다.

Sources:
- https://github.com/anthropics/claude-code/releases/tag/v2.1.280
- https://www.anthropic.com/claude-opus-5-5

---

## 2. Codex — Cloud Skill discovery를 매 Turn 다시 하지 않는다

2026-09-22의 Codex `#47350`은 cloud Skill catalog를 **turn마다 다시 discovery하던 구조**를 바꿨다.

기존:

```text
Turn 1 → list catalog → read skills
Turn 2 → list catalog → read skills
Turn 3 → list catalog → read skills
```

변경 후:

```text
Turn 1
  discover catalog
  └─ cache(auth scope + Apps resource key)

Turn 2..N
  same auth/resource generation
  └─ reuse catalog

invalidate
  connection/auth/resource generation change
  └─ rediscover
```

구체적으로는 warning-free catalog를 재사용하며 **빈 catalog도 valid cache**로 취급한다. Partial/failed discovery는 다음 turn에서 retry하고, discovery 중 Apps resource cache key가 바뀌면 결과를 폐기한다.

테스트도 cached turn에서 catalog list와 Skill read가 발생하지 않는지 확인하고, connection/auth change 시 refresh되는지를 검증한다.

### Token / 비용 의미

이 변경은 model inference token만의 문제가 아니다.

- catalog listing Tool call 제거
- Skill content read 제거
- startup latency 감소
- repeated dynamic context materialization 감소
- stable prefix 변동 감소

이전 Trend에서 `SkillCatalog generation/invalidation`을 제안했는데, 이번 Codex 변경은 실제 production 구현이 같은 방향으로 수렴하고 있다는 근거가 된다.

### Perforce Harness 적용

```text
SkillCatalogKey
  workspace_id
  role
  runtime
  auth_scope_hash
  capability_generation
  skill_policy_hash
```

다음 경우에만 invalidation한다.

- workspace/project 전환
- Skill 파일/Plugin generation 변경
- role 변경
- permission/auth scope 변경
- Runtime Adapter capability 변경

단순 turn 증가나 history append는 invalidation 이유가 아니다.

**평가: 🟢 바로 적용.** 특히 Analysis/Worker/Reviewer가 서로 다른 catalog를 가지되 각 role 안에서는 generation 기반으로 재사용하도록 하는 게 좋다.

Source:
- https://github.com/openai/codex/commit/8edfca892d46624a114a1e9a7095a8ed4e334232

---

## 3. Codex — Compaction Checkpoint가 `Summary`가 아니라 `Resume Capsule`로 진화

Codex `#47323`은 `CompactedItem`에 `resume_metadata`를 추가했다.

새 metadata는 최소한 다음을 기록한다.

```text
multi_agent_version
last_started_turn_id
previous_turn_settings
```

이 값은 compaction checkpoint와 **같은 settings persistence lock** 아래에서 함께 저장된다. Child Agent가 checkpoint를 상속하면 runtime identity를 child runtime으로 다시 쓰고, child가 context rebuild를 해야 하는 경우 이전 turn settings는 제거한다.

이 변화가 중요한 이유는 compaction 후 resume에서 필요한 정보가 summary text만으로는 충분하지 않기 때문이다.

```text
Durable Ledger
      ↓
Compaction
      ↓
Checkpoint
  summary/projection
  source range
  evidence baseline
  resume metadata
  runtime identity
      ↓
Resume / Fork
```

### 같은 날 추가된 pruning — child progress는 compaction 입력에는 넣되 follow-up raw history에는 남기지 않음

`#47249`는 remote compaction v2에서 descendant Agent의 `CHANNEL_POST`도 일반 progress `MESSAGE`와 동일하게 처리한다.

즉 child progress는 **compaction을 만들 때는 참고**하지만, compaction 이후 follow-up request의 retained raw history에서는 제외한다.

이건 multi-agent context에 꽤 중요한 원칙이다.

> Subagent chatter는 요약을 만들기 위한 evidence일 수 있지만, 그 raw chatter가 parent의 장기 context에 영구히 남아야 하는 것은 아니다.

Perforce 환경에서는 Worker/Subagent의 다음 메시지를 compaction input에는 포함하되, checkpoint 이후 raw context에서는 제거하는 정책이 적합하다.

```text
retain after compaction
- verified result
- unresolved failure
- changed file set
- build/test verdict
- decision/rationale
- user restriction

drop raw after compaction
- progress heartbeat
- repeated status
- intermediate CHANNEL_POST
- exploration narration
```

### Handoff/Ledger 적용

현재 `ContextCheckpoint`에 아래 필드를 추가할 가치가 있다.

```text
checkpoint_id
source_event_range
resume_runtime
last_started_step_id
previous_execution_settings
capability_generation
evidence_generation
pending_cl
rebuild_required
```

**Token 절감 원리:** child progress raw history를 반복 전달하지 않고 checkpoint에 의미만 흡수한다.

**Trade-off:** compactor가 중요한 중간 signal을 누락하면 raw 메시지가 이미 context에서 사라질 수 있다. 따라서 raw event는 Durable Ledger에는 계속 보존하고, **model-visible retained history에서만 제거**해야 한다.

**평가: 🟢 Resume metadata/ledger schema는 바로 적용, 🟡 자동 raw-pruning rule은 PoC.**

Sources:
- https://github.com/openai/codex/commit/286d4ecf44b4e9daba0a9fdd229a4047b770a71a
- https://github.com/openai/codex/commit/c117207a6f1f948ac7fcdd5e784d75fc4e9d13e1

---

## 4. Codex Guardian — Thread-owned Review Context가 stable/default가 됨

기존 Trend에서는 Guardian의 thread-owned context, review cursor, checkpoint compatibility를 실험적 변화로 추적했다. 9월 22일에는 이 구조가 한 단계 더 올라갔다.

`#47275`에서 `guardianv2.thread_context`가 **stable + default enabled**가 됐다. Sync/async Guardian 모두 thread-owned context를 사용하며, 테스트는 다음을 명시적으로 검증한다.

- sender user messages
- review prompt snapshot
- compaction 후 history retention
- checkpoint provenance
- review 중 새로운 user input이 들어오면 기존 in-flight authorization 무효화

또 직전 `#47272`는 synchronous reviewer가 parent compaction checkpoint를 사용할 때 `comp_hash`가 다르거나 unknown이라는 이유만으로 거부하던 local compatibility gate를 제거했다. 대신 usable checkpoint를 backend에 전달하고 **payload-level validation**을 맡기며, unusable/empty checkpoint와 review error에는 계속 fail-closed한다.

### 기존 설계에 대한 수정점

이전에는 다음처럼 생각하기 쉬웠다.

```text
producer hash != reviewer hash
→ checkpoint 폐기
```

이번 변화는 더 정교한 정책이 필요하다는 근거다.

```text
Checkpoint Compatibility
  1. schema/provenance/content validity
  2. required evidence 존재
  3. consumer/backend가 payload를 실제로 해석 가능한가
  4. policy/restriction freshness
       ↓
  compatible / rebuild
```

즉 model/runtime hash는 좋은 signal이지만 **절대적인 compatibility 판정값은 아니다.** Consumer가 explicit validation을 제공한다면 다른 hash의 checkpoint도 안전하게 재사용할 수 있다.

### Perforce Reviewer 적용

Codex Review checkpoint에는 다음을 유지하되:

```text
source_diff_hash
evidence_generation
policy_hash
producer_runtime
schema_version
review_cursor
```

`producer_runtime/model != reviewer_runtime/model`만으로 무조건 rebuild하지 말고, Runtime Adapter가 `can_consume(checkpoint)`를 제공하도록 하는 편이 낫다.

반대로 사용자 restriction, Pending CL generation, diff/evidence가 달라졌다면 model 호환성과 무관하게 review authorization은 invalidation해야 한다.

**평가: 🟢 바로 적용 + 기존 strict hash rule 수정.** `compatibility hash`보다 `consumer validation contract`를 중심으로 바꾸는 것이 좋다.

Sources:
- https://github.com/openai/codex/commit/279ba894152b2c01c5294cc0723b463b209bdca4
- https://github.com/openai/codex/commit/99784bd09b234ce11d8e91041d445e3eb49a609a

---

## 5. Deep Agents Code 0.1.73 — Prompt Cache의 `남은 시간`과 비용 내역을 Durable State로 다루기 시작

Deep Agents Code `0.1.73`은 2026-09-22 공개됐고, context/token 운영 관점에서 두 기능이 특히 유의미하다.

### 5-1. Cache token 수뿐 아니라 cache retention timing을 추적

footer가 마지막 prompt-cache write 시각과 provider retention bound까지의 countdown을 표시한다.

구현은 단순한 local timer가 아니다.

- checkpointed model-request timestamp 사용
- endpoint/provider policy를 고려
- cache read/write가 있는 **completed turn**은 countdown을 갱신
- write만 displayed write time을 갱신
- interrupted turn은 countdown을 재시작하지 않음
- thread 전환 시 timing state clear
- policy를 확정할 수 없는 endpoint는 정확한 countdown 대신 write time만 표시
- retention은 guaranteed eviction time이 아니라 **minimum/maximum bound**로 표현

이건 cache-aware scheduling에서 매우 좋은 원칙이다. Provider cache는 "cache hit token 수"만 기록해서는 충분하지 않고 **언제까지 재사용 가능성이 높은가**를 함께 알아야 한다.

### Perforce Harness 적용

```text
PromptCacheState
  runtime
  model
  endpoint_identity
  prefix_hash
  last_cache_write_at
  last_cache_use_at
  retention_policy
  retention_bound_at
```

긴 작업에서 cache가 충분히 warm하다면 동일 prefix를 쓰는 다음 slice/review를 먼저 수행하고, cache가 이미 cold라면 억지로 task 순서를 비틀 필요가 없다.

단, countdown을 실제 eviction guarantee로 쓰면 안 된다. Gateway나 provider 정책이 불명확하면 `unknown`으로 두는 게 맞다.

**평가: 🟢 바로 적용.** `cache_tokens`만 보던 telemetry를 시간 축으로 확장할 가치가 높다.

### 5-2. Cost breakdown도 checkpoint/event를 따라간다

같은 release의 Debug Console은 기존 authoritative scalar cost는 유지하면서 **versioned additive cost breakdown**을 별도로 지속 저장한다.

분해 항목은 동일 pricing calculation에서 파생되는 input/output, cache, reasoning attribution이며, nested agent와 offload operation도 detail을 checkpoint/event path로 전달한다. Legacy checkpoint는 과거 usage를 새 가격으로 다시 계산하지 않고 그대로 읽을 수 있게 했다.

이 구조는 내부 비용 ledger에 매우 적합하다.

```text
AuthoritativeCost
  total_usd

CostBreakdownV1
  input_tokens / cost
  output_tokens / cost
  cache_read_tokens / cost
  cache_write_tokens / cost
  reasoning_tokens / cost
  child_agent_cost
  offload_cost
  pricing_snapshot_id
```

중요한 점은 **과거 run을 최신 가격표로 repricing하지 않는 것**이다. 재현 가능한 benchmark를 위해 당시 pricing snapshot을 저장하고, 필요하면 별도 analysis layer에서 hypothetical repricing을 해야 한다.

**평가: 🟢 바로 적용.** RuntimeAdapter의 `RunResult`와 durable TaskLedger에 versioned cost breakdown을 넣는 게 좋다.

Sources:
- https://github.com/langchain-ai/deepagents/releases/tag/deepagents-code%3D%3D0.1.73
- https://github.com/langchain-ai/deepagents/commit/f4c226b21cc07ee6cee6472ed726f86e69b8af36
- https://github.com/langchain-ai/deepagents/commit/c9817483eeea620b1523dcfaed2802269c79d4fe

---

## 오늘의 설계 결론

오늘 변화는 `더 좋은 summarizer`보다 **Context/Capability/Cost를 versioned state로 관리하는 것**에 집중돼 있다.

현재 Perforce + Claude Code + Codex Harness 구현 우선순위는 다음이 적합하다.

1. **SkillCatalog generation cache** — 매 turn discovery 금지
2. **Hook/MCP context telemetry** — model-visible bytes와 offload/rehydration 측정
3. **Compaction Resume Capsule** — summary와 runtime/turn/settings를 같이 checkpoint
4. **Ephemeral child chatter pruning** — Durable Ledger에는 보존, model retained history에서는 제거
5. **Reviewer consumer-validation contract** — strict producer hash equality에서 벗어나기
6. **PromptCacheState** — token뿐 아니라 retention timing 기록
7. **Versioned CostBreakdown** — nested agent/offload까지 origin을 유지한 비용 ledger
8. **Opus 5.5 Router benchmark** — 동일 Tool/Skill surface에서 cost/solve 검증

통합하면 다음 구조가 된다.

```text
Task / Pending CL
      ↓
Capability Generation
  SkillCatalog cache
  MCP description budget
      ↓
Execution
  Claude / Codex
      ↓
Hook + Tool output
  preview / pointer / offload metrics
      ↓
Durable Ledger
  evidence
  usage
  cost breakdown
      ↓
Compaction
  semantic checkpoint
  resume metadata
  cache state
      ↓
Consumer Validation
  Worker / Reviewer / Child
      ↓
Next bounded slice
```

오늘 가장 바로 적용 가치가 큰 것은 **`Skill catalog를 매 turn 재탐색하지 않는 것`과 `compaction checkpoint에 resume metadata를 같이 저장하는 것`**이다. 둘 다 모델 품질을 건드리지 않으면서 반복 Context 생성과 resume 재탐색을 줄일 수 있다.

또 하나의 중요한 수정은 **checkpoint compatibility를 단순 model/hash equality로 정의하지 않는 것**이다. Schema/provenance/evidence/policy가 유효하고 consumer가 실제로 payload를 검증할 수 있다면, 다른 runtime/model에서도 재사용 가능한 checkpoint가 존재할 수 있다.

## 이번 조사에서 핵심으로 올리지 않은 항목

- Token Optimizer MCP: `v7.2.0` 이후 새 release/benchmark 없음.
- Deep Agents core `0.7.17`: backend exit status 보존과 inline MIME 제한이 중심으로, 이번 Trend의 Context/Token 핵심 변화에는 미치지 못함.
- OpenHands `1.21.0`: stale conversation-history merge 방지 수정은 의미 있으나, 이전 Trend의 origin-bound async result / generation ownership 원칙과 상당히 겹쳐 중복 방지를 위해 본문 핵심 항목에서는 제외.

## Wiki 반영

Canonical report path:

`ai/trend/ai-harness-token-scout-2026-09-23.md`

다른 `ai/news/`, `ai/tools/`, `ai/harness/`, `ai/research/`, `ai/tips/`에는 날짜별 Scout 보고서를 생성하지 않는다.
