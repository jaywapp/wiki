---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-04"
date: 2026-10-04
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, claude-code, codex, open-swe, perforce]
---

# 2026-10-04 AI Harness · Context/Token Optimization Scout

## 조사 범위와 중복 제거

`jaywapp/wiki` develop의 `ai/trend/`와 2026-10-03 canonical 보고서를 대조했다. 전일까지 이미 다룬 partial-response continuation, Skill→Tool progressive disclosure, command-output 64 KiB persistence projection, bounded retrieval coverage, verifier shadow, trajectory-aware benchmark subset, HERO는 제외했다.

이번 실행에서는 2026-10-03 UTC에 실제로 merge된 Codex/Open SWE 변경을 중심으로 확인했다. Claude Code 공식 release는 조사 시점에도 `v2.1.288`이 최신이었고, Deep Agents에는 전일 보고서 이후 새 stable context/token release가 없었다. 따라서 기존 항목을 반복하지 않는다.

| 항목 | 신규 변화 | 평가 |
|---|---|---|
| Codex Incremental Tool Catalog | Tool catalog 전체 재전송 대신 최초 1회 + 변경된 정의만 append | **바로 적용** |
| Codex Strict Code Mode Tool Deferral | third-party Tool을 eager prefix에서 제외하고 `exec` discovery로 지연 | **PoC 우선** |
| Codex Stable Discovery Prefix | catalog 변화와 무관하게 discovery guidance/MCP helper/type preamble 고정 | **바로 적용** |
| Codex MCP Result Persistence Budget | MCP result도 64 KiB bounded persistence + JSON wrapper overhead까지 예산에 포함 | **바로 적용** |
| Codex Typed World-State Updates | Context 조각을 Prefix/Standalone/Mergeable로 명시 배치 | **바로 적용** |
| Open SWE Review Lifecycle | authoritative config를 default branch에서 SWR cache, review publish는 transaction barrier로 직렬화 | **바로 적용** |

## 1. Codex — Tool Catalog를 매 Turn 다시 보내지 않고 Delta만 보낸다

2026-10-03 Codex #50540은 Responses Lite 경로에 `incremental_tools`를 추가했다. 최초 request에서 full catalog를 한 번 전달하고, Tool definition을 world state와 conversation history에 기록한 뒤 이후 request에는 추가되거나 변경된 definition만 `additional_tools`로 append한다. 삭제된 Tool이나 namespace instruction 변경은 developer notice로 전달하고, JSON object key order가 달라도 동일 schema는 stable hash로 판단한다. remote compaction 이후에도 history에 보존된 Tool definition을 재사용한다.

핵심은 Tool schema를 매 turn의 반복 입력이 아니라 **durable capability history + delta update**로 바꾼 것이다. Tool surface가 큰 MCP 환경에서 반복 schema input과 prefix churn을 줄일 수 있다. Upstream은 별도 token 절감률을 공개하지 않았으므로 내부에서는 schema byte, cache-hit, correction-turn을 함께 측정해야 한다.

권장 구조:

```text
CapabilityCatalogState
  catalog_generation
  full_catalog_hash
  tool_definition_hash[tool]
  namespace_instruction_hash

CapabilityDelta
  added[]
  changed[]
  removed[]
```

Perforce/TeamCity adapter reconnect 자체로 전체 schema를 재전송하지 않고 실제 behavior/schema hash가 바뀔 때만 delta를 만든다.

**평가: 바로 적용.**

Source: https://github.com/openai/codex/commit/6326163b9abd

## 2. Codex — third-party Tool은 eager prefix가 아니라 Code Mode discovery로 지연

Codex #50687은 disabled-by-default `code_mode_only_strict_3p_tools` feature를 추가했다. Code Mode Only에서 MCP, App, client-supplied dynamic Tool 가운데 eligible Tool을 직접 model-visible eager Tool prefix에 넣지 않고 deferred catalog로 유지한다. 모델은 `exec`와 `ALL_TOOLS`를 통해 현재 catalog를 탐색하고 호출한다.

MCP catalog가 turn 사이에서 추가·교체·삭제되어도 eager Tool prefix는 동일하게 유지된다. disabled, app-only, policy-denied, schema-budget 초과 Tool 제한은 보존한다.

절감 원리는 상시 model-visible Tool schema bytes와 catalog refresh에 따른 prompt-cache invalidation을 줄이는 것이다. 단 discovery call이 늘면 총 turn 비용이 오를 수 있으므로 모든 Tool을 일괄 defer하면 안 된다.

```text
ToolExposurePolicy
  Core/Eager:
    read_status
    task_state
    evidence_lookup
  Deferred:
    p4_describe
    p4_filelog
    teamcity_history
    repository_graph
    reviewer_tools
```

측정 지표는 eager schema bytes, discovery calls/task, correction turns/task, cache read ratio, cost/verified-task가 적합하다.

**평가: PoC 우선.**

Source: https://github.com/openai/codex/commit/58ae3ba61186

## 3. Codex — Discovery text도 Catalog 변화에 흔들리지 않게 고정한다

#50562, #50546, #50536은 Code Mode의 stable discovery prefix를 강화했다.

- #50562: deferred Tool이 현재 0개인지 N개인지와 무관하게 `exec` description의 discovery guidance를 동일하게 유지
- #50546: MCP server가 없어도 `list_mcp_resources`, `list_mcp_resource_templates`, `read_mcp_resource` helper definition을 유지
- #50536: deferred Tool의 output schema 존재 여부와 무관하게 shared MCP TypeScript preamble을 고정

Context 절감은 문자열을 짧게 만드는 것만이 아니다. 자주 바뀌는 몇 줄이 stable prefix 앞부분에 있으면 큰 cache region 전체를 재사용하지 못할 수 있다. Tool catalog가 변해도 discovery/control-plane 문구는 고정하고 실제 capability 변화는 delta/history 쪽으로 분리하는 편이 cache-friendly하다.

권장 구조:

```text
StableCapabilityControlPlane
  discovery instructions
  core helper schema
  shared type preamble

DynamicCapabilityPlane
  catalog delta
  permission delta
  environment delta
```

직접 token reduction benchmark는 공개되지 않았다. 기대 효과는 cache hit와 prefix reuse 증가다.

**평가: 바로 적용.**

Sources:
- https://github.com/openai/codex/commit/58ca099b0302
- https://github.com/openai/codex/commit/55b6f282a810
- https://github.com/openai/codex/commit/e1b5b56a4fe6

## 4. Codex — MCP Tool result도 Durable History에 raw로 남기지 않는다

전일 보고서에서는 command output을 64 KiB로 제한한 #50427을 다뤘다. #50458과 #50470은 같은 원칙을 structured MCP result까지 확장했다.

#50458은 paginated thread history에 저장하는 oversized MCP result를 64 KiB preview budget으로 제한하고 serialized JSON의 시작/끝과 truncation marker를 보존한다. `is_error`는 유지하되 oversized persistence projection에서는 `structuredContent`와 `_meta`를 제거한다. Tool arguments는 유지한다.

#50470은 preview text byte만 세지 않고 JSON escaping과 wrapper object까지 포함한 **실제 serialized result size**를 측정한다. 전체 object가 budget을 넘으면 preview budget을 반복적으로 줄여 최종 payload가 cap 안에 들어오도록 한다.

#50454는 original item bytes와 persisted item bytes를 stage별 histogram으로 기록하고 실제 제거된 bytes를 `codex.rollout.persistence.bytes_removed`로 계측한다.

권장 구조:

```text
EvidenceArtifact
  full_blob_ref
  content_hash
  original_bytes

DurableToolProjection
  tool
  args_digest
  is_error
  head_tail_preview
  persisted_bytes
  truncated
  artifact_ref
```

UE build log, `p4 describe`, test report, repository search 결과 모두 같은 persistence policy를 사용한다. structuredContent가 제거될 수 있으므로 원본 artifact는 별도 Evidence Store에 보존해야 한다.

**평가: 바로 적용.**

Sources:
- https://github.com/openai/codex/commit/820f85cf597b
- https://github.com/openai/codex/commit/be48ae396e57
- https://github.com/openai/codex/commit/3c3a990da04e

## 5. Codex — Context Assembly를 문자열 concat이 아니라 Typed World-State Update로

Codex #50441은 world-state section이 단일 text fragment만 반환하던 구조를 바꾸어 명시적인 `WorldStateUpdate`를 반환하도록 했다.

각 update는 `Prefix`, `Standalone`, `Mergeable` placement를 가진다. text fragment뿐 아니라 explicit `ResponseItem`도 반환할 수 있고 grouping 과정에서 role/message boundary를 유지한다. Initial context assembly에서는 prefix update를 먼저 둔다.

실제 Agent Context는 instruction, permission, environment, Skill/plugin, task state, multi-agent hint, evidence 등 수명과 권한이 다른 항목으로 구성된다. 하나의 문자열로 렌더링하면 작은 변화에도 전체 prefix hash가 바뀌고 compaction/resume에서 중복 삽입하기 쉽다.

권장 구조:

```text
ContextSegment
  source
  generation
  placement: Prefix | Standalone | Mergeable
  authority
  cache_stability
  content_hash
  model_visible_bytes
```

Perforce 기준으로 고정 Harness policy와 Tool discovery contract는 Prefix, 사용자 승인·build/test verdict·handoff receipt는 Standalone, compact repository hint는 Mergeable로 분리할 수 있다.

**평가: 바로 적용.**

Source: https://github.com/openai/codex/commit/0df76892b132

## 6. Codex — 상태 저장에 모델 호출이 필요하지 않은 경로를 분리한다

Codex #50531은 realtime session 종료 시 남은 transcript tail을 model/client history에 직접 기록하고 추가 inference 없이 persistence를 완료한 뒤 closure event를 낸다.

일반화하면 durable state transition은 둘로 나눌 수 있다.

```text
Inference-required
  semantic summary
  ambiguity resolution
  reviewer judgment

Inference-free
  transcript tail
  tool receipt
  cost receipt
  approval event
  build/test completion
  p4 workspace generation
```

두 번째를 모델을 거쳐 저장하면 불필요한 token/latency가 추가되고 authoritative data가 모델 요약으로 변형될 수 있다. TeamCity build 완료, `p4 sync` receipt, Pending CL update, approval, Reviewer verdict는 Task Ledger에 직접 append/flush하고 다음 turn에서 compact projection만 모델에게 주는 편이 맞다.

**평가: 바로 적용.**

Source: https://github.com/openai/codex/commit/7d5f55bdad2d

## 7. Open SWE — Runtime routing config는 Task branch가 아니라 Authoritative config에서 읽는다

Open SWE #3610은 standard/expedited PR review channel 설정을 PR head가 아니라 default branch의 현재 설정에서 읽고 LangGraph stale-while-revalidate cache에 30분 freshness window를 적용했다.

오래된 feature branch의 설정 파일이 현재 review routing을 되돌리는 문제를 막는 변경이다. Task code state와 operational routing state의 source of truth를 분리한 것이다.

Perforce에서도 작업 workspace/pending CL에 들어 있는 Harness 설정을 operational authority로 쓰지 않는 편이 좋다.

```text
TaskWorkspaceState
  source code
  pending CL
  local test config

AuthoritativeRuntimeConfig
  reviewer routing
  model policy
  permissions
  notification destinations
  capability exposure policy
```

RuntimeConfig는 별도 generation으로 캐시하고 SWR 또는 push invalidation을 사용한다. token 절감보다 stale routing 오류 방지가 주효과지만 매 turn config file을 repository에서 다시 읽는 낭비도 줄일 수 있다.

**평가: 바로 적용.**

Source: https://github.com/langchain-ai/open-swe/commit/5a1299981a26

## 8. Open SWE — Review publish를 Transaction Barrier로 만든다

Open SWE #3601은 Reviewer가 같은 turn에서 `add_finding`과 `publish_review`를 병렬 호출하면 publish가 finding persistence보다 먼저 실행되어 새 finding이 누락될 수 있던 race를 수정했다.

새 동작은 `publish_review`가 같은 turn의 유일한 Tool call이 아닐 경우 publish 자체를 거부한다. 이후 모델이 별도 turn에서 publish를 다시 호출한다.

Correctness는 높지만 model turn 하나가 추가될 수 있다. 내부 Harness에서는 이 패턴을 prompt instruction으로만 해결하기보다 transaction state machine으로 내리는 편이 더 효율적이다.

```text
CollectFindings
  -> FlushFindings
  -> VerifyRevision
  -> PublishReview
```

submit/review/build promotion도 같은 원칙을 적용할 수 있다. review finding persistence 완료 전 submit 금지, build/test evidence generation과 Pending CL generation 불일치 시 publish 금지, parallel worker가 evidence를 추가 중이면 final transition 금지다.

**평가: transaction barrier 원칙은 바로 적용. 추가 model turn으로 해결하는 방식은 참고만.**

Source: https://github.com/langchain-ai/open-swe/commit/c085237f1d60

## 오늘의 통합 결론

오늘 변화는 **Context와 Capability를 delta/generation/persistence policy로 관리하는 방향**으로 수렴한다.

적용 우선순위:

1. `CapabilityCatalogState + CapabilityDelta`로 Tool catalog 전체 반복 주입 중단
2. Stable/Dynamic Capability Plane 분리로 catalog 변화에도 cache prefix 안정화
3. Role별 eager/deferred Tool 정책 PoC
4. `DurableToolProjection`으로 command/MCP/log persistence를 serialized byte budget으로 제한
5. Typed `ContextSegment`에 Prefix/Standalone/Mergeable placement와 generation 도입
6. Inference-free Ledger write path로 receipt/state 저장에 모델 호출 금지
7. `AuthoritativeRuntimeConfig`로 Task workspace와 operational config 분리
8. Review/Submit finalization에 durable revision 기반 Transaction Barrier 적용

측정 지표는 eager tool schema bytes/turn, incremental tool delta bytes/task, prompt cache read/create ratio, discovery calls/task, original vs persisted Tool result bytes, cumulative re-ingestion tokens, context segment churn rate, inference-free state writes/task, review transaction retry turns, cost/verified-task를 권장한다.

## 신규성 판단

- **Claude Code:** 조사 시점 latest stable은 `v2.1.288`. 전일 이후 새 release가 없어 반복하지 않음.
- **Deep Agents:** 전일 Scout의 Skill→Tool disclosure 이후 새 stable context/token 변화는 확인되지 않음.
- **새 독립 benchmark/논문:** 전일 이후 이번 범위에 직접 연결되면서 구현·측정까지 검증할 만한 신규 결과는 찾지 못함. 기존 연구를 억지로 재포장하지 않음.

## Wiki 반영 경로

Canonical path: `ai/trend/ai-harness-token-scout-2026-10-04.md`

다른 `ai/news/`, `ai/tools/`, `ai/harness/`, `ai/research/`, `ai/tips/`에는 오늘 날짜 Scout report를 생성하지 않는다.
