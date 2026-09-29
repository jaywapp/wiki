---
title: "AI Harness · Context/Token Optimization Scout — 2026-09-30"
date: 2026-09-30
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, claude-code, codex, deep-agents, model-routing, durable-state, perforce]
---

# 2026-09-30 AI Harness · Context/Token Optimization Scout

## 요약

`jaywapp/wiki` develop의 2026-09-29 canonical 보고서와 최근 Scout 실행 기록을 대조했다. 9월 25~28일 실행에서 이미 다룬 RRSI, Harness-R1, Ecdysis, JIT-Agent, OpenMemory, Persistent Billable State, Repowise, cache-aware routing, ContextDoctor, shared MCP catalog cache, CliffCompaction, Growing Harness 등도 중복 제거 기준에 포함했다.

오늘은 **Claude Code 2.1.285의 runtime-state 재계산과 불필요 turn 제거, GPT-6.1 Sol의 cache-aware routing 경제성, Deep Agents의 cache-expiry lifecycle hook, resume-safe subagent 비용 장부, Codex의 generation-aware policy/capability state와 blocked-subagent lifecycle**이 유의미했다.

| 항목 | 핵심 | 평가 |
|---|---|---|
| Claude Code 2.1.285 | 모델/Tool/permission 전환 시 runtime limits와 model-visible surface를 다시 맞추고 retry·extra turn 낭비 축소 | **바로 적용** |
| GPT-6.1 Sol + reusable environment | cached input $0.10/MTok, DeepSWE에서 Astra 수준을 약 1/5 비용; 개발환경 setup 재사용 | **Router PoC / 환경은 아이디어 참고** |
| Deep Agents `cache_expiring` | cache 만료 60초 전 모델 호출 없이 lifecycle event 발생 | **바로 적용 / PoC** |
| Deep Agents Code 0.1.79 | child cost receipt를 checkpoint에 먼저 쓰고 request fingerprint로 resume identity 유지 | **바로 적용** |
| Codex policy generation + Guardian stop | stale MCP/cache publication 차단, 반복 거부된 child를 구조화된 blocked state로 parent에 전파 | **바로 적용** |

## 1. Claude Code 2.1.285 — Routing 변경은 Model ID가 아니라 Runtime Generation 변경이다

최신 Claude Code CHANGELOG의 `2.1.285`에서 가장 중요한 수정은 SDK `setModel`로 모델을 바꿨을 때 이전 모델의 output-token limit과 auto-compact window가 남아 있던 문제를 고친 것이다. 모델 변경 시 model-specific context/output budget을 즉시 다시 계산한다.

같은 릴리스에는 Harness 효율과 직접 연결되는 수정이 함께 들어왔다.

- mid-session에 MCP server를 끄면 해당 Tool도 실제 Tool surface에서 제거
- fork subagent가 parent의 plan/permission mode를 유지
- background subagent가 report 전달 뒤 만들던 의미 없는 추가 reply turn 제거
- server fallback으로 실제 사용 모델이 달라졌을 때 `/cost`와 SDK `modelUsage`를 실제 모델에 귀속
- streaming 실패 후 non-streaming fallback이 같은 retry budget을 공유해 retry 폭증 방지
- Tool이 자체적으로 deferred를 요청하면 server가 always-load 설정이어도 deferred 유지
- Bedrock/Vertex의 사용할 수 없는 모델 검사를 매 launch 반복하지 않고 일정 기간 재사용

내부 Runtime Adapter에는 다음과 같은 generation을 두는 것이 적합하다.

```text
RuntimeGeneration
  exact_model
  effort
  context_window
  output_limit
  auto_compact_window
  capability_generation
  permission_generation
  provider_route
  retry_budget
```

모델만 바뀌면 Perforce workspace/evidence는 보존하고 model-dependent projection만 재계산한다. capability나 permission generation이 바뀌면 Tool projection과 관련 cache를 함께 invalidate한다.

**토큰 절감 원리:** 잘못된 compaction threshold, 이미 꺼진 Tool schema, redundant subagent turn, 과도한 retry를 없애며 Router 측정값도 실제 모델 기준으로 정정한다.

**평가: 바로 적용.**

Sources:
- https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md
- https://github.com/anthropics/claude-code/commit/ec44ca97dc86c33d934c8d55b24959aabf076871

## 2. GPT-6.1 Sol — Cache Hit 가능성이 Router 경제성을 바꾼다

OpenAI가 9월 29일 공개한 GPT-6.1 Sol의 API 가격은 input $2/MTok, cached input $0.10/MTok, output $10/MTok이다. cached input은 일반 input보다 95% 낮다. OpenAI는 DeepSWE v1.1에서 GPT-6.1 Sol이 GPT-6 Astra와 비슷한 성능을 약 1/5 비용으로 냈고, GPT-6 Sol의 최고 점수보다 6.4pp 높으면서 더 낮은 reasoning effort와 비용을 사용했다고 보고했다. Terminal-Bench Science 최대 effort의 평균 task cost도 GPT-6.1 Sol $5.47, Opus 5.5 $23.21, Astra $23.80으로 제시됐다.

따라서 Router는 표면적인 token 단가뿐 아니라 다음을 함께 봐야 한다.

```text
RoutingEstimate
  exact_model
  effort
  expected_remaining_turns
  stable_prefix_tokens
  expected_cache_hit_rate
  cache_rebuild_cost
  expected_tool_calls
  expected_subagents
  quality_prior
```

이미 큰 stable prefix를 가진 장기 세션에서는 cache를 유지하는 모델이 단가가 비슷하거나 조금 높더라도 총 task cost가 더 낮을 수 있다.

같은 DevDay 발표에서 Codex cloud는 reusable development environments를 도입해 approved settings/permissions가 들어간 팀 공용 setup을 재사용하고 task startup을 빠르게 한다고 밝혔다. Perforce를 그대로 cloud로 옮기기보다는 내부 `EnvironmentProfile` 설계 참고가 더 적합하다.

```text
EnvironmentProfile
  p4_client_template
  depot_mapping
  toolchain_generation
  UE_version
  approved_tools
  build_test_adapters
  warmup_recipe
```

**평가: cache-aware Router telemetry는 바로 적용, GPT-6.1 Sol은 과거 CL corpus로 PoC, reusable cloud environment는 아이디어 참고.**

Sources:
- https://openai.com/index/introducing-gpt-6-1-sol/
- https://openai.com/index/devday-2026-recap/

## 3. Deep Agents — Prompt Cache 만료를 모델 호출 없는 Lifecycle Event로 노출

Deep Agents `#6638`은 `cache_expiring` hook을 추가했다. 알려진 prompt-cache retention window의 마지막 60초에 active thread/cache window당 한 번 notification을 내며, 이 과정에서 prompt를 열거나 cache를 refresh하거나 model request를 보내지 않는다.

이전의 cache retention telemetry를 실제 정책 실행용 event로 확장한 구현이다.

Perforce/UE Harness에서는 장시간 TeamCity build나 Automation Test를 기다리는 동안 다음처럼 사용할 수 있다.

```text
CacheExpiring
  task_id
  prefix_hash
  cache_generation
  expires_at
  pending_cl
  verified_checkpoint
```

기본 행동은 dummy keepalive가 아니라 TaskLedger·cost receipt·evidence pointer flush, transient chatter 정리, 다음 turn용 compact rehydration package 준비가 좋다. 자연스럽게 다음 inference가 곧 필요한 경우에만 cache affinity를 scheduling signal로 사용한다.

hook 자체는 짧고 idempotent해야 한다. upstream 구현도 단일 worker 때문에 느린 handler가 이후 window를 늦출 수 있음을 명시한다.

**평가: lifecycle event와 checkpoint flush는 바로 적용, cache-aware scheduler는 PoC.**

Source:
- https://github.com/langchain-ai/deepagents/commit/30975d02b9a18e5d6c1dede8bf02313cc024ea70

## 4. Deep Agents Code 0.1.79 — Resume 가능한 비용 장부는 완료 순서가 아니라 Request Identity로 묶는다

Deep Agents Code 0.1.79의 `#6433`은 JavaScript subagent 비용을 interruption/resume 이후에도 보존한다. 핵심은 child 전체 state를 parent에 섞지 않고 accounting receipt만 전달하는 것이다.

- 각 locally priced node의 cost delta를 graph update 반환 전에 thread checkpointer에 기록
- descendant가 이미 전달한 비용을 합계에서 제외해 double count 방지
- child resume identity를 positional task index가 아니라 **request fingerprint + 동일 request occurrence**로 구성
- 병렬 child 완료 순서가 뒤집혀도 서로 다른 request의 결과/비용이 교환되지 않음
- nested child는 resumable receipt 보장을 위해 더 강한 checkpoint durability 사용
- cancellation을 정리한 뒤 spend 수집

```text
AsyncReceipt
  root_task_id
  accounting_owner
  request_fingerprint
  occurrence
  child_checkpoint
  local_cost_delta
  pricing_snapshot
```

같은 release는 MCP Tool에 configurable timeout도 넣었다. 기본 120초, 허용 범위 1~900초이며 timeout 결과는 server/tool을 식별하는 model-readable error다. 중요한 점은 timeout 뒤에도 server-side operation이 진행 중일 수 있어 blind retry가 중복 작업을 만들 수 있다고 명시한 것이다.

Perforce/TeamCity mutation성 remote operation은 `TimedOutUnknownCompletion` 상태로 두고 operation ID/status probe를 통해 확인한 뒤 재시도해야 한다.

**평가: request fingerprint 기반 AsyncReceipt와 unknown-completion timeout state 모두 바로 적용.**

Sources:
- https://github.com/langchain-ai/deepagents/commit/f6f97216bae2d1c969fe6c045420b4dd75795bdb
- https://github.com/langchain-ai/deepagents/commit/340a73c5b3a8d503bbdc7141d23b2523bbf715d3
- https://github.com/langchain-ai/deepagents/commit/d1c5a8ef6af2a2bf3951808a53a257e97d87946f

## 5. Codex — Policy/Capability Cache를 Revision에 묶고 반복 거부된 Child를 Blocked State로 승격

Codex `#49269`은 config reload와 cloud policy refresh에서 policy revision을 runtime과 cache publication에 묶었다. 오래된 MCP refresh를 거부하고, cloud cache write를 임시 상태에 준비한 뒤 해당 revision이 여전히 current일 때만 atomic publish한다. 오래 걸린 refresh가 더 새로운 generation의 state를 덮어쓰지 못하게 하는 패턴이다.

Perforce Harness에서는 다음 artifact의 cache key에 `policy_generation`을 포함할 가치가 있다.

- Capability catalog
- ReviewDecision cache
- Tool approval receipt
- RAG scope
- reusable EnvironmentProfile

Codex `#49312`은 child가 반복 Guardian denial로 `TooManyDenials`에 도달했을 때 child를 Interrupted로 유지하고 parent에게 명시적 control event를 보낸다. Parent는 같은 작업을 자동 retry하지 않고 사용자 확인을 기다린다. 일반 interruption은 계속 조용히 처리한다.

이 방식은 반복적인 `deny → retry → deny` coordination loop를 차단한다. 내부 task lifecycle에는 다음 상태가 적합하다.

```text
BlockedByPolicy
  child_task_id
  policy_generation
  denial_count
  last_reason
  required_resume_authority
```

normal retry queue에서는 제외한다.

**평가: policy-generation cache key, atomic publish, BlockedByPolicy lifecycle 모두 바로 적용.**

Sources:
- https://github.com/openai/codex/commit/0b1b78a4f1694e2b9e393d385c7b82ca714ca08a
- https://github.com/openai/codex/commit/63475131ce5f6a479ffdf01163bd1d95873536a2

## 보조 관찰 — Routing Metadata는 상속하되 Output에서는 숨긴다

Open SWE `#3402`는 parallel fork subagent가 parent의 `requested_model`을 내부 state로는 상속하지만 result/output에서는 `OmitFromOutput`으로 제거한다. requested model, router reason, policy/capability generation, accounting owner처럼 control-plane에 필요한 값은 durable state에는 남기되 Agent report와 다음 model-visible projection에는 기본 포함하지 않는 편이 좋다.

Source:
- https://github.com/langchain-ai/open-swe/commit/974368c295232f4f992b9ec23f9947036f435c00

## 오늘의 결론

오늘의 흐름은 Context 압축 자체보다 **runtime 파생 상태의 정확한 invalidation, cache expiry의 lifecycle화, resume-safe accounting, policy generation과 retry semantics** 쪽이 강하다.

현재 구현 우선순위는 다음이 적합하다.

1. `RuntimeGeneration` — model/effort/context limit/auto-compaction/Tool projection을 한 generation으로 추적
2. 실제 fallback model 기준 cost attribution
3. `CacheExpiring` event와 checkpoint flush
4. `AsyncReceipt + request_fingerprint`로 resume-safe 비용 장부
5. `TimedOutUnknownCompletion`으로 remote mutation blind retry 금지
6. `PolicyGeneration`으로 Capability/Review/RAG/Environment cache stale publish 차단
7. `BlockedByPolicy`를 normal retry queue에서 제외
8. GPT-6.1 Sol을 포함한 model × effort × cache-state Router benchmark

핵심은 **token을 몇 개 삭제했는가보다 어떤 state가 어떤 generation에 속하는지, cache 만료 시 무엇을 보존할지, resume 뒤 비용과 작업 identity가 정확히 이어지는지, 실패가 retryable인지 blocked인지 구분하는 것**이다.
