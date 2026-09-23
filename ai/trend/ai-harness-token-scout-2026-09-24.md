---
title: "AI Harness · Context/Token Optimization Scout — 2026-09-24"
date: 2026-09-24
category: trend
tags:
  - ai-harness
  - coding-agent
  - context-engineering
  - token-optimization
  - claude-code
  - codex
  - deep-agents
  - perforce
---

# 2026-09-24 AI Harness · Context/Token Optimization Scout

## 요약

기존 `ai/trend/`의 2026-09-10~23 보고서와 Wiki 검색 결과를 기준으로 중복을 제거했다. 이미 다룬 Tool/Skill deferral, post-turn compaction, Skill catalog generation cache, Resume Capsule, cache-retention telemetry, versioned cost breakdown 등은 반복하지 않았다.

오늘은 **새로운 구현 변화 4건 + 이전 결론을 수정할 정도로 의미 있는 신규 실험 결과 1건**을 남긴다.

| 항목 | 오늘 확인한 핵심 | 평가 |
|---|---|---|
| Claude Code v2.1.281 | MCP 설정을 실행 전에 검증하고 gateway policy/telemetry를 더 명시적으로 고정 | **바로 적용** |
| Codex Tool Lifecycle Observation | dispatch/gate/handler/host-operation 시간을 별도로 측정하고 nested call double-count를 차단 | **바로 적용** |
| Codex Unified Exec Completion Transcript | streaming subscriber 시점과 무관하게 completion evidence를 source에서 직접 보존 | **바로 적용** |
| Codex Guardian Authorization Context | assistant 메시지를 승인 해석에 필요한 **untrusted, low-priority evidence**로 제한적으로 보존 | **바로 적용** |
| Deep Agents 0.7.18 + Token Optimizer THOL | truncation provenance 명시 + hard enforcement가 오히려 turn/cost를 늘릴 수 있다는 실측 | **바로 적용 / PoC** |

---

## 1. Claude Code v2.1.281 — Capability가 실제로 로드되는지 preflight에서 검증

Claude Code `v2.1.281`이 2026-09-23 19:19 UTC에 공개됐다. 이번 릴리스에서 Harness 관점으로 가장 중요한 변화는 `claude plugin validate`가 MCP 설정까지 검사하기 시작한 것이다.

검증 대상에는 다음이 포함된다.

- 로드 시 조용히 버려질 `.mcp.json` 항목
- 선언되지 않은 `${user_config.*}` 참조
- insecure MCP URL

즉 "설정 파일에는 있지만 실제 Agent Capability에는 없는 MCP"를 session이 시작된 뒤 모델이 시행착오로 발견하게 두지 않고, **session startup 이전에 config-materialization mismatch를 찾는 방향**으로 이동했다.

이건 앞서 제안한 `harness.lock`과 잘 맞는다. Lockfile이 버전을 고정한다면 preflight는 **그 locked capability가 현재 runtime에서 실제로 materialize 가능한지** 검증해야 한다.

권장 구조:

```text
Harness Preflight
  ├─ Skill/package hash verify
  ├─ MCP schema/config validate
  ├─ user_config reference resolve
  ├─ URL/security policy validate
  └─ materialized capability hash
              ↓
      TurnCapabilitySnapshot
```

같은 릴리스는 Claude apps gateway에 `blockReadsOutsideWorkingDirectories`, `disableBypassPermissionsMode` 같은 Desktop policy key를 지원하고, `telemetry.resource_attributes`로 고정 label을 telemetry에 붙일 수 있게 했다. 내부 Runtime Adapter에서도 `workspace`, `project`, `runtime`, `agent_role`, `policy_generation` 같은 고정 차원을 model request/Tool/Cost telemetry에 일관되게 붙이는 방식이 좋다.

### Token/Cost 관점

직접적인 절감률은 공개되지 않았다. 다만 invalid MCP가 조용히 누락될 때 발생하는 discovery/retry turn과, capability 구성이 달라져 benchmark/cache prefix가 흔들리는 문제를 줄일 수 있다.

### Perforce · Claude Code · Codex 적용

- session 시작 전에 `p4 client`, depot mapping, Skill/MCP manifest를 한 번에 preflight
- preflight 결과를 `capability_generation`에 묶음
- invalid/missing capability는 model에게 보여주기 전에 fail-closed
- 동일 generation 동안 Tool/Skill schema를 stable prefix로 유지

**평가: 바로 적용.**

Source: https://github.com/anthropics/claude-code/releases/tag/v2.1.281

---

## 2. Codex — Tool 비용을 `Tool 전체 시간` 하나로 보지 않는다

Codex commit `#47662`는 extension이 Tool lifecycle을 직접 관찰할 수 있도록 `on_tool_dispatch`와 `on_tool_timing`을 추가했다.

핵심은 시간을 다음처럼 분리한다는 점이다.

```text
Tool Call
  │
  ├─ readiness / dispatch wait
  ├─ gate / hook wait
  ├─ handler execution
  └─ code-mode host operation
```

각 observation에는 `thread_id`, `turn_id`, `call_id`가 포함된다. Handler duration은 gate를 실제 통과한 시점부터 측정하며, gate를 통과하지 못한 call은 0으로 남긴다. Code Mode 내부 nested Tool call은 상위 HostOperation과 시간이 겹치므로 독립 Tool latency처럼 중복 계산하지 않는다.

이건 지금까지의 token/cost telemetry를 한 단계 개선한다. 단순히 `Tool X = 4.2s`라고 기록하면 실제 병목이 permission gate인지, Hook인지, queue인지, handler인지 알 수 없다.

내부 Runtime Adapter에는 다음 정도의 공통 event가 유용하다.

```text
ToolTiming
  task_id
  turn_id
  call_id
  runtime
  tool
  dispatch_wait_ms
  gate_wait_ms
  handler_ms
  host_operation_ms
  result_tokens
  result_bytes
  status
```

### Token/Cost 절감 원리

직접 압축하지는 않지만, "짧은 Tool output"만 최적화하다 실제로는 Hook/queue/retry가 비용을 만드는 문제를 구분할 수 있다. 특히 Tool routing/deferral/approval policy A/B에서 **turn과 latency 증가가 어디서 발생하는지** 측정할 수 있다.

### Perforce 적용

- `p4 sync`, `p4 describe`, UE Build, TeamCity queue, Codex Review를 같은 timing schema로 수집
- queue/gate 시간과 실제 실행 시간을 분리
- async child Tool의 시간을 parent Tool과 중복 합산하지 않음
- `cost/solved-task`와 함께 `wait/solved-task`도 비교

**평가: 바로 적용.**

Source: https://github.com/openai/codex/commit/a79a18cd0eb8c9264f0488168407aee821e2f7ef

---

## 3. Codex — Evidence는 subscriber가 본 로그가 아니라 producer가 만든 transcript여야 한다

Codex `#47665`는 Unified Exec의 completion event에서 **stream subscriber가 붙기 전에 출력된 내용이 빠질 수 있던 문제**를 수정했다.

기존에는 model이 이미 `early output`을 받았더라도 streaming observer가 늦게 붙으면 completion event의 aggregated output에는 해당 내용이 없을 수 있었다. 새 구조는 `UnifiedExecProcess` 자체가 output이 도착하는 순간부터 bounded completion transcript를 기록하고, streaming/polling delivery와 독립적으로 completion event를 만든다.

```text
Process stdout/stderr
        │
        ├─ Model streaming channel
        ├─ UI/subscriber channel
        └─ Authoritative bounded transcript
                    ↓
             Completion Event
```

이 패턴은 Evidence Ledger에 바로 적용할 가치가 높다. **관찰자/UI가 본 데이터로 evidence를 재구성하지 말고, 실행 source가 직접 durable receipt를 만들어야 한다.**

### Token/Cost 절감 원리

결과 앞부분이 completion evidence에서 사라지면 다음 Agent/Reviewer가 로그를 다시 읽거나 command를 재실행할 수 있다. Source-level transcript는 이런 reread/retry turn을 줄인다.

### Perforce/TeamCity 적용

Build/Test Adapter가 다음을 동시에 남기도록 한다.

```text
ExecutionReceipt
  command/build_id
  exit_code
  started_at / completed_at
  bounded_head
  bounded_tail
  root_error_summary
  full_artifact_ref
  content_hash
```

UI stream이나 Agent notification은 이 receipt의 projection일 뿐이고, evidence identity는 receipt 자체로 고정한다.

**평가: 바로 적용.**

Source: https://github.com/openai/codex/commit/d47b9a8c002f41433784fef2536892d49c9facfb

---

## 4. Codex Guardian — Assistant message도 Authorization Evidence가 될 수 있지만 권한은 없다

9월 23일 Codex Guardian에 연속으로 병합된 `#47582`, `#47584`, `#47585`는 review/approval context의 의미를 정교하게 바꿨다.

문제는 다음과 같다.

```text
Assistant: "이 변경을 submit할까요?"
User: "응"
```

compaction 후 앞의 Assistant 메시지가 사라지면 Reviewer는 `응`이 무엇을 승인한 것인지 해석할 수 없다. 반대로 Assistant가 자기 메시지를 authorization source처럼 취급하면 권한 상승 문제가 생긴다.

새 구조는:

- 실제 Assistant 메시지를 원래 순서대로 checkpoint/resume에서 보존
- **confirmed delivered message**만 승인 맥락에 사용
- assistant context는 `untrusted context`
- user instruction보다 별도/낮은 budget priority
- compaction output 자체는 evidence에서 제외
- rollback 경계를 넘어간 assistant evidence는 제거
- context가 없으면 의미를 추측하지 않음

즉 "대화 전체를 보존"하는 방식이 아니라 **승인 해석에 필요한 bounded conversational evidence만 provenance와 함께 유지**한다.

내부 Harness에서는 다음 형태가 적합하다.

```text
AuthorizationContext
  user_restrictions[]       # highest priority
  delivered_agent_prompt?   # untrusted evidence
  user_reply
  requested_action
  diff/evidence_generation
  policy_hash
```

중요한 원칙은 `delivered_agent_prompt`가 user reply를 해석하는 근거는 될 수 있어도 **그 자체로 permission을 생성하지 못한다**는 것이다.

### Token/Context 절감 원리

Reviewer에게 전체 transcript를 넘기지 않고 authorization과 직접 관련된 message pair만 bounded projection으로 제공한다. 일반 assistant commentary는 먼저 버릴 수 있다.

### Perforce 적용

- `submit`, `revert`, 대규모 edit, workspace scope 변경 승인에 적용
- "응/그래/진행해" 같은 짧은 응답은 직전 **실제로 전달된** prompt와 함께 저장
- Reviewer에게는 user restriction > delivered prompt > user reply 순으로 제공
- compaction 후에도 approval provenance 유지

**평가: 바로 적용.**

Sources:
- https://github.com/openai/codex/commit/29aa1df62ea188036a3219f6a6a0dd6063badae9
- https://github.com/openai/codex/commit/876ce590e179ba8b4adbf5e64b9954a67f6f2fac
- https://github.com/openai/codex/commit/7342991f0c100151def8f621ebb6ed12e49b657d

---

## 5. Deep Agents 0.7.18 — 압축된 Tool Result는 `잘렸다는 사실`도 Context다

Deep Agents `0.7.18`은 대형 Tool result preview에서 truncation 의미를 더 명확히 했다.

- byte cap 때문에 손실된 경우 명시
- per-line clipping을 별도로 명시
- 실제 truncation이 발생한 경우에만 notice 표시
- legacy preview format은 deprecation 경로로 유지
- Task tool은 unknown argument key를 조용히 무시하지 않고 reject

특히 Tool output 축약에서 중요한 원칙은 **preview 자체뿐 아니라 preview의 완전성(completeness)을 model에게 알려야 한다**는 것이다.

```text
ToolResultEnvelope
  preview
  truncated: true
  truncation_reason: byte_cap | line_clip
  original_bytes
  visible_bytes
  artifact_ref
  content_hash
```

이렇게 해야 모델이 preview를 full evidence로 오해하지 않는다.

**평가: 바로 적용.**

Source: https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.18

---

## 6. Token Optimizer MCP — Hard Enforcement가 오히려 비쌀 수 있다는 신규 THOL 결과

최근 Token Optimizer MCP의 main README와 committed benchmark가 기존 Scout의 결론을 업데이트할 만한 새 결과를 공개했다.

THOL에서 default `assist`와 no-proxy control, `enforce`를 비교한 결과:

| Arm | 품질 | 평균 Turns | 비용 |
|---|---:|---:|---:|
| Assist | **0.971** | **14.4** | control보다 유리한 방향 |
| Control | 0.969 | 16.2 | 1.0x |
| Enforce | 0.960 | **20.3** | **1.471x control/task** |

`enforce`는 17개 task의 median 기준 control보다 47.1% 비쌌고, 실제로 더 저렴했던 task는 2개뿐이라고 보고한다.

이 결과는 중요한 설계 수정점이다.

**비싼 Tool call을 막는 것 자체가 최적화가 아니다.** 모델이 거부를 받은 뒤 다시 계획하고 대체 Tool을 찾으면 추가 turn이 생기며, 그 turn 비용이 제거한 payload보다 더 커질 수 있다.

프로젝트는 이를 줄이기 위해 refusal 시 이미 가진 graph/file snapshot을 함께 돌려주는 `zero-turn refusal`도 사용한다. 하지만 현재 default는 hard deny가 아니라 `assist`: routing/retrieval/capture/harvest는 하되 call 자체를 막지 않는다.

### Perforce · Claude Code · Codex 적용

Context optimizer의 정책을 다음처럼 가져가는 것이 좋다.

```text
Default: ASSIST
  - large/repeated read 감지
  - 더 싼 대안 추천/자동 projection
  - 원 Tool은 막지 않음

ENFORCE only when
  - deterministic substitute 존재
  - substitute 결과를 같은 turn에 반환 가능
  - 반복 실험에서 turns/task 증가 없음
  - quality oracle 통과
```

예를 들어 `p4 describe` 전체를 막고 다른 명령을 다시 호출시키는 것보다, Harness가 같은 call 안에서 compact diff + artifact pointer를 반환하는 편이 낫다.

또 이 프로젝트가 graph delivery/semantic-harvest 자체의 token 비용도 graph에 청구하고, treated/holdout evidence gate를 통과한 경우에만 causal benefit을 인정하는 방식은 내부 Knowledge/RAG ROI 측정에도 참고할 만하다.

### 한계

이 수치는 프로젝트 자체 benchmark다. workload/task 수가 제한적이고 동일 결과가 내부 Perforce/UE 환경에 그대로 재현된다는 보장은 없다. 따라서 **정책 원칙은 바로 적용**, optimizer 도입 자체는 PoC가 적절하다.

**평가: Assist-first 정책은 바로 적용 / 제품 자체는 PoC.**

Source: https://github.com/ooples/token-optimizer-mcp

---

## 오늘의 통합 결론

오늘 변화들을 묶으면 최적화의 초점은 더 분명해진다.

```text
Preflight Capability Validation
            ↓
Stable Runtime / Policy Snapshot
            ↓
Tool Dispatch + Gate + Handler Telemetry
            ↓
Producer-owned Execution Receipt
            ↓
Explicitly Truncated Tool Projection
            ↓
Bounded Authorization Evidence
            ↓
Assist-first Optimization
```

현재 Perforce + Claude Code + Codex Harness에서 구현 우선순위는 다음이 좋다.

1. **MCP/Skill/Hook preflight validator + capability hash**
2. **Tool timing을 dispatch/gate/handler로 분해**
3. **Build/Test output을 source-level `ExecutionReceipt`로 보존**
4. **ToolResultEnvelope에 truncation provenance 추가**
5. **Approval context에 confirmed-delivered prompt provenance 추가**
6. **Token optimization 정책을 hard-deny보다 assist/inline substitution 우선으로 변경**

오늘 가장 중요한 결론은 다음 한 문장으로 정리할 수 있다.

> **Payload를 줄이는 최적화가 추가 turn을 만들면 실패다. Harness는 byte/token 절감보다 `turns per solved task`, evidence completeness, capability correctness를 함께 최적화해야 한다.**

## 신규성 확인

- 2026-09-23 Trend의 Skill catalog cache / Resume Capsule / cache retention / durable cost breakdown과 중복되는 항목은 제외했다.
- Wiki 검색에서 THOL `assist 0.971 / 14.4 turns / enforce 1.471x` 결과, Deep Agents 0.7.18 truncation semantics, Guardian delivered-assistant authorization context가 기존 문서에 없는 것을 확인했다.
- 새 정량 결과가 없는 프로젝트는 억지로 포함하지 않았다.

## Wiki 반영

Canonical path:

`ai/trend/ai-harness-token-scout-2026-09-24.md`

이 보고서는 날짜별 Scout/Trend canonical report로만 생성하며 다른 `ai/news/`, `ai/tools/`, `ai/harness/`, `ai/research/`, `ai/tips/`에는 중복 생성하지 않는다.
