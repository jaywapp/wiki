---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-05"
date: 2026-10-05
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, claude-code, codex, open-swe, perforce]
---

# 2026-10-05 AI Harness · Context/Token Optimization Scout

## 조사 범위와 중복 제거

`jaywapp/wiki`의 최근 Trend와 자동화 산출물을 먼저 대조했다. `develop`에는 2026-10-03 canonical 보고서가 존재하고, 2026-10-04 보고서는 canonical 반영에 실패했지만 `automation/ai-harness-token-scout-2026-10-04` branch의 원문을 다시 확인했다. 따라서 10월 4일에 이미 다룬 Incremental Tool Catalog, strict third-party Tool deferral, stable discovery prefix, MCP durable projection, Typed World-State Update, authoritative review config와 review transaction barrier는 제외했다.

오늘은 2026-10-04 UTC~10-05 KST에 실제로 반영된 Claude Code, Codex, Open SWE 변화를 중심으로 확인했다. 신규 독립 논문/benchmark 중 기존 Trend보다 추가할 만큼 재현성과 신호가 높은 결과는 확인하지 못했으므로 기존 연구를 억지로 재포장하지 않았다.

| 항목 | 신규 변화 | 토큰/비용 관점 | 평가 |
|---|---|---|---|
| Claude Code 2.1.289 | teammate `agent.spawn`, hook 전 구간 stable `agent_id`, `idle/waiting` state | 상태 복원/coordination turn 감소 기반. 정량 공개 없음 | **바로 적용 / spawn은 PoC** |
| Codex #50741 | environment readiness가 바뀌어도 Tool/parameter schema 유지 | schema churn과 prompt-cache invalidation 방지. 정량 공개 없음 | **바로 적용** |
| Codex #50913 + #50811 | fresh start의 model/reasoning-summary default를 destination server가 결정 | stale client 설정으로 잘못된 route/prefix 사용 방지 | **바로 적용** |
| Codex #50804 | review-entry event를 task 시작보다 먼저 기록, 실패 뒤 queued review 유지 | 중복 review/retry와 lifecycle 재구성 감소 | **바로 적용** |
| Open SWE #3648 + #3649 | incident는 Performance tier pin, blocked review는 side-channel 우회 금지 | 저가 model 반복 실패와 우회 side effect 방지 | **PoC / lifecycle은 바로 적용** |

## 1. Claude Code 2.1.289 — Sub-agent를 transcript 속 객체가 아니라 Runtime Identity로 다루기

Claude Code 최신 CHANGELOG의 `2.1.289`에는 teammate용 `agent.spawn`이 추가되고, plugin hook event 사이에서 동일 Agent를 추적할 수 있도록 하나의 `agent_id`를 유지하며, `$.agent.list()`가 `idle`과 `waiting` 상태를 노출하도록 바뀌었다.

이 변화는 multi-agent harness에서 중요하다. Agent 상태를 transcript의 텍스트나 마지막 Tool call로 추론하면 resume, background task, queued message, hook 실행이 겹칠 때 동일 Worker를 다른 실행으로 오인하기 쉽다. Runtime이 stable identity와 명시적 state를 제공하면 orchestration ledger를 model context와 분리할 수 있다.

권장 구조:

```text
AgentRuntimeIdentity
  agent_id
  parent_agent_id
  root_task_id
  role
  runtime
  state: running | idle | waiting | done | failed
  workspace / p4_client / pending_cl
  capability_generation
```

Perforce에서는 `agent_id`를 workspace identity와 동일시하지 않는다. 하나의 runtime Agent가 workspace를 교체하거나 resume될 수 있으므로 `agent_id`, `workspace_generation`, Pending CL을 분리한다.

같은 release는 user-installed plugin이 organization-managed MCP server의 sign-in Tool description을 다시 쓰지 못하도록 막았다. 즉 Agent identity와 managed capability metadata의 authority는 Runtime control plane이 소유하고 plugin/prompt는 이를 덮어쓰지 못하게 하는 방향이다.

직접 token benchmark는 없다. 기대 효과는 상태 확인용 polling/질문 turn, transcript 기반 identity 복원, 잘못된 handoff 후 재시도 감소다.

**평가: stable Agent identity/state는 바로 적용. `agent.spawn` orchestration은 PoC.**

Source: https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md

## 2. Codex #50741 — Capability와 Readiness를 분리하면 Tool prefix가 안정된다

Codex #50741은 selected environment가 `absent → starting → failed → ready`로 바뀌는 동안에도 command, patch, image, permission Tool을 같은 schema로 노출하도록 변경했다.

- environment가 usable하지 않아도 enabled Tool definition은 유지
- usable environment가 없으면 Tool 제거 대신 일관된 wait 결과 반환
- environment selector를 ready environment만이 아니라 선택된 모든 environment에서 생성
- `exec_command`의 `shell`, `login` parameter를 readiness와 무관하게 항상 광고
- 실제 login 허용 여부는 execution-time policy에서 검증

이전 방식은 readiness가 바뀔 때 Tool schema도 변해 model-visible capability prefix가 흔들리고 cache 재사용이 깨질 수 있었다.

```text
CapabilitySelection
  selected tools / environments
  schema hash
  permission contract

ExecutionReadiness
  environment_id
  pending | ready | failed
  readiness_generation
  retry_after / failure_reason
```

TeamCity agent가 준비 중이거나 Perforce workspace sync가 끝나지 않았더라도 Build/P4 Tool schema는 유지하고 호출 시 `WAITING_FOR_ENVIRONMENT` 같은 deterministic status를 반환하는 방식이 적합하다.

장점은 stable prefix, cache reuse, catalog churn 감소다. 단 모델이 당장 실행 불가능한 Tool을 볼 수 있으므로 wait/failure 응답을 짧고 기계적으로 해석 가능하게 해야 한다.

**평가: 바로 적용.**

Source: https://github.com/openai/codex/commit/550eb50545a78468a09ce86b82426338640ef22d

## 3. Codex #50913 + #50811 — Runtime Adapter 기본값은 destination server가 소유

#50913은 app server에 연결하는 fresh TUI start가 client에 남아 있던 stale model 설정을 먼저 사용하던 문제를 수정했다. 이제 explicit profile이 없는 fresh start에서는 server config를 model bootstrap보다 먼저 읽는다.

- explicit model/reasoning-effort override는 유지
- implicit client 설정은 server configuration보다 우선하지 않음
- `config/read` 미지원 server에서는 암묵적 client 설정을 비워 stale 값 유지 방지
- model catalog가 비어 있어도 managed new-thread default가 model을 공급 가능
- remote는 destination server directory 기준 config를 읽음

#50811은 같은 원칙을 reasoning summary에도 적용한다. client가 summary를 임의로 끄지 않고 server configuration과 model default가 기본값을 결정하며, 사용자가 명시한 profile/CLI override만 우선한다.

권장 precedence:

```text
1. Explicit user/task override
2. Authoritative server / managed RuntimeProfile
3. Task-class policy
4. Adaptive router
5. Model/runtime default
```

Perforce Harness에서는 Claude Code/Codex 실행기가 로컬 설정을 각자 기억하게 두기보다 중앙 `RuntimeProfileGeneration`이 model, effort, summary, auto-compaction, Tool exposure policy를 공급하고 Worker/Reviewer가 snapshot해서 쓰는 편이 좋다.

직접 절감량은 공개되지 않았다. 잘못된 model/effort로 시작한 뒤 session을 재시작하거나 cache prefix를 버리는 비용을 막는 효과가 핵심이다.

**평가: 바로 적용.**

Sources:
- https://github.com/openai/codex/commit/c2f7fe89d87ce853900d0b5cb1f5dc4863e44d73
- https://github.com/openai/codex/commit/afb436df8b70bb5bc57b86d9a3e829968988cd21

## 4. Codex #50804 — Lifecycle event는 side effect보다 먼저 기록

#50804는 review가 실제 시작되기 전에 실패하면 UI가 review mode 진입 event를 받지 못할 수 있던 ordering 문제를 수정했다.

새 순서는 기존 task를 abort하고 connector selection을 정리한 뒤 **review-entry lifecycle event를 먼저 emit하고 review task를 시작**한다. failed-turn completion이 이미 처리한 오류를 다시 보더라도 queued `/review`가 startup 대기 중이면 running state를 지우지 않고 queued input 처리를 계속한다.

일반화하면 Task Ledger의 상태를 worker 함수의 성공/실패로 추론하지 말고, 의도와 transition을 먼저 durable event로 남긴 뒤 side effect를 수행하는 편이 안전하다.

```text
ReviewRequested
  -> ReviewEntered
  -> ReviewStarting
  -> ReviewRunning
  -> ReviewCompleted | ReviewFailed | ReviewBlocked
```

각 transition에는 `task_revision`, `pending_cl_generation`, `review_policy_generation`을 둔다. ReviewStarting 뒤 provider overload가 나도 “review 요청 자체가 없었다”로 되돌아가지 않는다.

토큰 효과는 간접적이다. 상태 race 때문에 review를 중복 시작하거나 Orchestrator가 상태를 다시 묻는 turn을 줄인다.

**평가: 바로 적용.**

Source: https://github.com/openai/codex/commit/ab45264919aaeb8a421cc156f1a5459ef9d60b72

## 5. Open SWE #3648 — Adaptive routing 앞에 Task-class hard policy를 둘 것

Open SWE #3648은 incident investigation과 그 subagent를 기본 Fast model이 아니라 configured **Performance model + effort**로 보내도록 바꿨다. 이 task class에서는 adaptive routing도 끄고, 사용자가 incident model을 명시적으로 지정한 경우만 override를 유지한다.

Incident investigation은 초기에 난이도를 정확히 분류하기 어렵고 evidence 수집, 원인 추적, cross-system correlation이 많아 low tier에서 실패한 뒤 상위 model로 재시도하면 총 비용이 더 커질 수 있다.

```text
Deterministic / narrow edit -> Fast 또는 adaptive
Review / bounded refactor -> adaptive + evidence-based escalation
Incident / unknown root cause -> Performance model 고정
Explicit user override -> 항상 우선
```

PoC에서는 `initial_model`, `escalation_count`, `failed_fast_attempt_cost`, `total_cost/verified-task`, `time-to-root-cause`를 task class별로 비교해야 한다. Upstream은 별도 benchmark를 공개하지 않았으므로 Performance가 항상 더 싸다고 일반화하면 안 된다.

**평가: TaskClassRouting 원칙은 바로 적용, 실제 threshold/model 조합은 PoC.**

Source: https://github.com/langchain-ai/open-swe/commit/549b6c6c6192022b009247ee46d1c3174e3d094f

## 6. Open SWE #3649 — Blocked action은 다른 통로로 우회하지 못하게 한다

#3649은 review readiness check가 막은 요청에 대해 blocker를 보고하고 해결 후 재시도하라고 명시하며, manual Slack post, 직접 GitHub reviewer request, 다른 review Tool 같은 side-channel fallback을 금지했다.

이는 9월 30일 Scout의 `BlockedByPolicy`와 이어지는 변화다. 새 아키텍처라기보다 production semantics 보강으로 보는 편이 맞다. 정식 Tool 하나가 막혔을 때 동일 semantic action을 shell/API/custom wrapper로 우회하지 못하도록 block을 action 전체에 전파해야 한다.

```text
BlockedAction
  semantic_action: submit | request_review | publish
  blocker_ids[]
  policy_generation
  blocked_at_revision
  allowed_resume_condition
```

Perforce submit readiness가 실패했다면 `p4 submit` Tool뿐 아니라 같은 side effect를 만드는 모든 transport를 같은 key로 차단한다.

**평가: 기존 `BlockedByPolicy` 구현에 바로 반영.**

Source: https://github.com/langchain-ai/open-swe/commit/5fa3079e6e4d0a20cba5cd7024f8a088f49278b8

## 오늘의 통합 결론

오늘 변화는 Context compression 자체보다 **Authority · Readiness · Lifecycle · Routing을 분리하면 불필요한 context churn과 재시도를 줄일 수 있다**는 쪽으로 모인다.

적용 우선순위:

1. `AgentRuntimeIdentity`와 explicit lifecycle state를 Task Ledger에 도입
2. Tool schema를 environment readiness와 분리해 `CapabilitySelection` 안정화
3. `RuntimeProfileGeneration`을 server-authoritative하게 만들고 stale client defaults 제거
4. review/start/blocked transition을 side effect보다 먼저 durable event로 기록
5. Router 앞에 `TaskClassRoutingPolicy`를 두고 incident/unknown-scope는 최소 Performance tier 보장
6. semantic blocked action을 여러 Tool/transport에 공통 적용

측정 지표:
- Tool schema hash churn / task
- prompt cache read ratio before/after readiness transition
- Agent state 확인용 coordination turn 수
- stale model/effort mismatch 발생 수
- review duplicate-start / retry count
- task-class별 first-pass solve rate
- escalation count와 escalation 전 소모 비용
- `cost/verified-task`, `time-to-verified-task`

## 신규성 판단

- **Claude Code:** `2.1.289` 최신 CHANGELOG의 orchestration identity/state 변화만 포함했다. UI/plugin rendering 수정은 제외했다.
- **Codex:** 2026-10-04 UTC의 #50741, #50804, #50811, #50913을 확인했다. 10월 4일 보고서의 incremental catalog/stable prefix와 겹치지 않는 readiness/config/lifecycle 변화다.
- **Deep Agents:** 10월 4일 이후 main은 문서 업데이트 중심이었고, 기존 Scout를 갱신할 정도의 새 context/token architecture 변화는 확인하지 못했다.
- **신규 독립 benchmark/논문:** 오늘 범위에서 기존 Trend보다 추가할 만큼 새롭고 재현 가능한 정량 결과는 확인하지 못했다.

## Wiki 반영 경로

Canonical path: `ai/trend/ai-harness-token-scout-2026-10-05.md`

다른 `ai/news/`, `ai/tools/`, `ai/harness/`, `ai/research/`, `ai/tips/`에는 오늘 날짜 Scout report를 생성하지 않는다.
