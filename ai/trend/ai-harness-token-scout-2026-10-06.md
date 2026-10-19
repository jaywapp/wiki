---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-06"
date: 2026-10-06
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, codex, deep-agents, open-swe, durable-state, perforce]
---

# 2026-10-06 AI Harness · Context/Token Optimization Scout

## 조사 범위와 중복 제거

`jaywapp/wiki`의 최근 Scout/Trend 보고서와 2026-10-04·10-05 임시 branch 산출물까지 대조했다. 전일까지 다룬 AgentRuntimeIdentity, CapabilitySelection/ExecutionReadiness 분리, RuntimeProfileGeneration, TaskClassRouting, Incremental Tool Catalog, strict third-party Tool deferral, Typed World-State Update, durable Tool projection, Skill→Tool disclosure 초기 구현 등은 반복하지 않았다.

오늘은 2026-10-05 UTC 이후 OpenAI Codex main, Deep Agents main/stable, Open SWE main의 실질 변경과 기존 Wiki에서 누락된 PRO-LONG coding-agent memory 구현을 확인했다. Claude Code는 latest stable이 2.1.289로 전일과 동일해 별도 항목을 만들지 않았다.

| 항목 | 신규 변화 | 토큰/컨텍스트 관점 | 평가 |
|---|---|---|---|
| Codex required environment skills | 필요한 Skill이 없으면 모델 호출 전에 turn 실패 | 잘못 준비된 Runtime에 inference 비용을 쓰지 않음 | **바로 적용** |
| Codex instruction identity + compaction baseline | base instruction을 stable-ID developer message로 저장하고 replacement에 full context baseline 포함 | resume/continuation prefix identity와 invalidation 명시화 | **바로 적용** |
| Guardian parent-checkpoint recovery | reviewer compaction으로 evidence가 무효화되면 action-time parent checkpoint에서 1회 fresh recovery | lossy summary 대신 검증 evidence 복구 | **바로 적용** |
| Tool-surface churn + sandbox-only tools | tools_change_count 계측, Open SWE는 integration Tool을 sandbox endpoint로 이동 | schema churn·상시 Tool context 감소 효과 측정 | **PoC 가치 높음** |
| Deep Agents plugin discovery | base prompt에는 skill pointer/CLI만, catalog 지침은 Skill read 시 로드 | prompt/skill 경량화와 progressive disclosure | **바로 적용 원칙 / PoC** |
| Deep Agents thread writer ownership | per-thread lock + ownership token으로 stale checkpoint write 차단 | resume/durable-state corruption과 재작업 방지 | **바로 적용** |
| PRO-LONG coding memory | append-only JSONL + rg/jq/Python selective retrieval, transcript 상시 주입 없음 | 연구 4.2–5.8× fewer tokens; coding CLI MVP는 별도 검증 필요 | **PoC 우선** |

## 1. Codex — 필요한 Skill이 없으면 inference 자체를 시작하지 않는다

Codex #51157은 `environment/add`와 `environments.toml`에 환경별 `skills.required` 목록을 받고, 모델 요청 전에 각 required Skill이 현재 선택된 environment에서 제공되고 enabled 상태인지 검증한다. environment setup이 실패했거나 Skill이 disabled/다른 environment 소속이면 모델 호출 전에 turn을 실패시킨다. environment를 deselect하면 요구조건도 해제되며, 별도 Skill catalog가 없는 isolated Guardian reviewer는 예외다.

Perforce Harness에는 다음 preflight를 두는 것이 적합하다.

```text
CapabilityPreflight
  task_class
  runtime_profile_generation
  selected_environment
  required_skills[]
  available_skills[]
  missing_or_disabled[]
  result: READY | BLOCKED
```

UE 빌드 수정 task에 `perforce-workspace`, `ue-build`, `evidence-query` Skill이 필요하다면 하나라도 준비되지 않은 상태에서 Claude/Codex에게 task를 설명하고 재시작하는 대신 model request 이전에 BLOCKED로 끝낸다.

직접 절감량은 공개되지 않았지만 실패가 확정된 Runtime에 input/context와 reasoning token을 쓰지 않는다는 점에서 비용 구조가 명확하다.

**평가: 바로 적용.**

Source: https://github.com/openai/codex/commit/42312d4ff4e258c1dfa43db9a9c59eed943c98de

## 2. Codex — Instruction stable identity + compaction full baseline

Codex #51156은 Responses API의 top-level `instructions`를 prefixed developer message로 옮기고, thread와 instruction text에서 파생한 stable ID를 부여했다. WebSocket에서는 instruction이 바뀌면 `previous_response_id` continuation을 사용하지 않고 full request로 돌아간다. “같은 session”이 아니라 “현재 prefix 의미가 동일한가”를 continuation 조건으로 다루는 셈이다.

#51117은 local/remote compaction replacement history에 initial context를 즉시 다시 설치한다. replacement마다 full world-state와 turn-context baseline을 저장하고 현재 모델 기준 token usage를 다시 계산한다. 이전 모델이 compaction을 수행했더라도 현재 모델 기준 replacement context를 만들고, 조건이 맞는 retry에는 captured context를 재사용한다.

```text
ContextBaseline
  thread_id
  runtime_generation
  instruction_id
  skill_catalog_generation
  capability_generation
  policy_generation
  world_state_revision
  token_count_for_current_model
  baseline_hash
```

Compaction은 summary를 만드는 동작이 아니라 “현재 Runtime에 맞는 재개 가능한 baseline을 다시 만드는 transaction”으로 보는 편이 맞다. unchanged prefix는 continuation/cache 대상으로 유지하고 실제 instruction이 바뀔 때만 full replay한다.

**평가: 바로 적용.**

Sources:
- https://github.com/openai/codex/commit/c9253c4977e485d6a098282ad583a6db9585d7ff
- https://github.com/openai/codex/commit/8571b9eaa46e42c8f75e0842ac6f2b02f550c9f7

## 3. Guardian — lossy reviewer summary 대신 parent checkpoint에서 bounded fresh recovery

Codex #51137/#51139/#51140은 reviewer compaction 때문에 과거에 admit한 transcript evidence가 무효화됐을 때 action 시점의 parent checkpoint에서 reviewer를 한 번만 다시 시작하도록 바꿨다. recovery는 원래 review deadline 안에서 수행하고 기존 cached reviewer snapshot을 재사용하지 않는다. transcript cursor는 실제 로드된 source에 맞게 재설정하며 checkpoint 이후 들어온 authorization delta는 recovery 뒤 다시 이어 붙인다.

```text
ReviewAttempt
  action_revision
  parent_checkpoint
  evidence_generation
  transcript_source
  reviewer_selection:
    ReuseIfAvailable | FreshParentCheckpoint
  recovery_count <= 1
  original_deadline
```

Perforce에서는 submit authorization, Pending CL identity, build/test evidence처럼 누락 위험이 큰 정보에 특히 적합하다. recovery 1회의 비용은 추가되지만 손실된 summary를 기반으로 잘못된 판정이나 반복 history search를 수행하는 비용을 bounded하게 제한한다.

**평가: 바로 적용.**

Sources:
- https://github.com/openai/codex/commit/5f8b37cc65965bb7b44f45d7e71741fb3a05f742
- https://github.com/openai/codex/commit/16cb72218cb5fa07a5dceca9db58839bd220a049
- https://github.com/openai/codex/commit/3f1ccb7ceb814e54314826f68d61c892e2f5a48e

## 4. Tool surface churn을 먼저 계측하고 sandbox-only Tool을 A/B

Codex #50964는 turn analytics에 `tools_change_count`를 추가했다. 각 sampling request 직전의 전체 model-visible Tool list를 직전 목록과 비교해 schema/add/remove/order 변화가 있으면 count를 올리고, baseline은 turn과 transport reset을 넘어 유지한다.

Open SWE #3645는 `prefer_tools_in_sandbox`가 켜진 thread에서 integration Tool을 모델의 direct Tool surface에서 숨기고 sandbox tools endpoint가 목록과 invocation을 담당하도록 했다. large-result lookup도 sandbox 경로로 보내고 이 mode에서는 별도 `http_request` Tool을 제거한다.

Perforce PoC는 두 arm을 비교할 만하다.

```text
A. Direct Tool Surface
  p4.*, teamcity.*, repo-index.* schema 직접 노출

B. Sandbox Tool Gateway
  shell/core Tool만 직접 노출
  p4/teamcity/repo-index는 CLI/endpoint로 discovery/invoke
```

측정은 `tool_schema_bytes/task`, `tools_change_count`, discovery turns, cache-read ratio, total tokens, `cost/verified-task`, invalid Tool call을 함께 봐야 한다. schema가 줄어도 discovery가 반복되면 총비용은 오를 수 있다.

**평가: tools_change_count는 바로 적용, sandbox-only integration Tool은 PoC 가치 높음.**

Sources:
- https://github.com/openai/codex/commit/4ad985e2caaf877b96dafd8138dae2def467e01e
- https://github.com/langchain-ai/open-swe/commit/433c6ca0b33a98df22d32188a796fad2475eb8b6

## 5. Deep Agents — Plugin catalog도 base prompt 대신 pointer-first

Deep Agents #6719는 disabled/not-yet-installed marketplace plugin을 모델이 발견할 수 있게 하면서도 base prompt에는 전체 catalog나 사용법을 넣지 않는다. base prompt에는 built-in discovery Skill pointer와 CLI 이름만 남기고, read-only marketplace query, 상태 해석, local-profile 제약은 `deepagents-plugin-discovery` Skill 내부로 옮겼다. Install/enable은 사용자 authorization을 요구하며 catalog description은 instruction이 아니라 data로 취급한다.

```text
Base prompt
  capability pointer
  discovery command name

On-demand Skill
  query syntax
  status semantics
  edge cases
  policy constraints
```

Perforce Harness에서는 p4 submit policy, TeamCity matrix, depot ownership query, 드문 maintenance Tool의 상세 사용법을 상시 AGENTS.md/CLAUDE.md에 넣지 않고 pointer만 유지한 뒤 Skill read 시 로드하는 방식이 적합하다.

10월 3일 Scout에서 main 상태로 다룬 Skill→Tool progressive disclosure는 10월 5일 Deep Agents **0.7.22 stable**에 정식 포함됐다. 즉 이 패턴은 실제 배포된 Harness 기능으로 승격됐다.

**평가: pointer-first 원칙은 바로 적용, 내부 Plugin/Skill marketplace는 PoC.**

Sources:
- https://github.com/langchain-ai/deepagents/commit/52cc3e2f52b5dac038da9f56ddfeb6898c3e8c85
- https://github.com/langchain-ai/deepagents/blob/main/libs/deepagents/CHANGELOG.md

## 6. Deep Agents — durable thread에는 writer ownership이 필요

Deep Agents #6717은 같은 local thread를 여러 client가 동시에 resume해 history/checkpoint를 덮어쓰는 문제를 per-thread file lock과 ownership token으로 막았다. occupied thread는 resume하지 않고, client 종료나 server 교체 뒤 stale checkpoint write도 reject한다. interactive/headless/ACP/switch/delete 경로를 포함해 1,392 unit tests와 lint를 통과했다.

```text
TaskWriterLease
  task_id
  owner_runtime_id
  lease_generation
  acquired_at
  heartbeat_or_expiry
  last_committed_revision
```

Perforce Harness에서는 resume 전에 writer lease를 획득하고 checkpoint/ledger write는 current lease_generation만 허용하는 편이 좋다. Tool side effect는 이 lock만으로 보호되지 않으므로 `p4 edit/submit` 같은 mutation에는 별도 MutationLease 또는 idempotency receipt가 필요하다.

**평가: 바로 적용.**

Source: https://github.com/langchain-ai/deepagents/commit/b0f9b41cad6089640ea479a3fbc255a1fb0171b6

## 7. 기존 Trend 누락 보강 — PRO-LONG: append-only log + programmatic retrieval

기존 `jaywapp/wiki`에서 PRO-LONG을 찾지 못해 보강한다. 논문은 7월 공개됐고 repository에는 8월 19일 Codex/Claude Code/OpenCode/pi용 coding CLI integration이 추가됐다.

구조는 다음과 같다.

- 프로젝트 내부 `.prolong/log.jsonl`에 prompt, Tool activity, assistant handoff, session boundary를 append-only 기록
- Codex는 `.codex/hooks.json`, Claude Code는 `.claude/settings.json` lifecycle hook으로 연결
- `.agents/skills/prolong/SKILL.md`가 `rg`, `jq`, Python으로 필요한 과거 entry만 검색하도록 가이드
- 누적 log를 매 prompt에 넣지 않음
- memory log retrieval 자체는 다시 기록하지 않아 memory가 자기 자신을 재귀 복사하지 않음
- 별도 wrapper/server/database가 필요 없음

ARC-AGI-3 연구 결과는 matched base coding-agent 대비 평균 **+18.0 percentage points**, 최대 **76.1% pass@1**, specialized harness보다 **4.2–5.8배 적은 token**을 보고했다. Fable 5는 **best@2 97.4%**, 총비용 **$1,750**이다. 다만 repo README가 명시하듯 이 수치는 coding-tool MVP 자체의 직접 benchmark가 아니라 원 연구 Harness 결과다.

Perforce에는 다음처럼 적용할 수 있다.

```text
TaskEventLog
  task_id
  seq
  event_kind
  runtime
  p4_client
  pending_cl
  evidence_ref
  tool/action digest
  raw receipt
  timestamp

Model-visible path
  search(query, task/depot/time scope)
  -> bounded matching events
  -> selective evidence read
```

vector memory부터 시작하기보다 lossless event log + programmatic search를 1차 retrieval substrate로 쓰는 접근이다. CL 번호, depot path, build ID, error code처럼 구조적 identifier가 강한 Perforce 환경에 잘 맞는다.

**평가: PoC 우선.** 과거 20~50개 장기 debugging/refactor task에서 native compaction/session resume와 비교해 reread/re-exec, total token, recovery 성공률, stale-retrieval rate를 측정할 가치가 높다.

Sources:
- https://arxiv.org/abs/2607.20064
- https://github.com/alexisfox7/PRO-LONG

## 오늘의 통합 결론

오늘의 방향은 “Context를 더 잘 요약”보다 **preflight → stable context identity → evidence checkpoint recovery → Context 외부화**로 모인다.

Perforce + Claude Code + Codex Harness의 구현 우선순위는 다음이 적합하다.

1. CapabilityPreflight
2. ContextBaseline + instruction stable ID
3. ReviewAttempt의 FreshParentCheckpoint recovery
4. `tools_change_count` 계측
5. TaskWriterLease
6. pointer-first Skill/Plugin discovery
7. Sandbox Tool Gateway A/B
8. PRO-LONG식 append-only event log + programmatic retrieval PoC

오늘은 새로운 독립 token benchmark를 억지로 추가하지 않았다. 정량 수치는 기존 Wiki 누락 항목인 PRO-LONG 연구 결과만 보강했고, coding CLI MVP 자체의 결과와 분리해 기록했다.
