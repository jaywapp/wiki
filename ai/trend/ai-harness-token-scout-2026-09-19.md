---
title: AI Harness Token Scout - 2026-09-19
category: trend
tags:
  - ai
  - harness
  - context-engineering
  - token-optimization
  - claude-code
  - codex
  - perforce
updated: 2026-09-19
---

# 2026-09-19 AI Harness · Context/Token Optimization Trend

## 조사 기준

`ai/trend/`의 2026-09-10~18 보고서와 최신 `ai/Orchestration.md`를 먼저 확인했다. 이미 다룬 Tool/Skill deferral, model-visible token accounting, request budget admission, cache affinity, review cursor/checkpoint compatibility, CCompactor, Docket, HarnessMark, Deep Agents offload pointer/skill invalidation, OpenHands capability profile, Claude Code v2.1.274의 MCP startup deferral·notification coalescing, Codex reviewer projection/stable review prefix 등은 반복하지 않았다.

오늘은 **실질적으로 새롭거나, 기존 Trend에서 빠졌지만 구현·측정 가치가 큰 4개 항목**만 남겼다.

| 항목 | 새롭게 확인된 핵심 | 평가 |
|---|---|---|
| Claude Code v2.1.275/276 | 명시적 static/dynamic prompt-cache boundary, compaction/resume cache miss 수정, forked subagent forwarding 보강 | **바로 적용** |
| Codex capability snapshot/cache invalidation | 실행 중 capability를 immutable snapshot으로 고정하고 display-only 변화는 cache invalidation에서 제외 | **바로 적용 / PoC** |
| Token Optimizer MCP v7.1 | 실제 Provider 경로의 compression 상시화 + project-scoped knowledge injection + 신규 27-run 검증 | **바로 적용 / PoC** |
| Better Harness evidence-pack externalization | 74K 문자 evidence를 prompt에서 파일로 이동해 instruction을 876자로 축소 | **바로 적용 / PoC** |

---

## 1. Claude Code v2.1.275/276 — Prompt Cache에 명시적 정적/동적 경계를 둔다

### 무엇이 새로워졌나

Claude Code v2.1.275에는 Context/Cache 관점에서 다음 변화가 들어왔다.

- `--system-prompt` 문자열 안의 `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__`를 기준으로 그 **위쪽 정적 prefix를 전역 cache 대상으로 유지**하도록 개선
- compaction/resume 후 복원된 memory file의 age note가 요청마다 달라져 prompt cache miss를 만들던 문제 수정
- `context: fork` Skill이 생성한 subagent 및 nested fork의 text가 `--forward-subagent-text`에서 누락되던 문제 수정
- claude.ai 계정에서 활성화한 Skills/Plugins를 terminal session에 동기화하는 기능 추가 (`syncClaudeAiSkills`, `syncClaudeAiPlugins`로 opt-out)

직후 v2.1.276은 `ANTHROPIC_BASE_URL`이 proxy/gateway를 가리킬 때 v2.1.275가 모든 요청을 HTTP 400으로 실패시키던 regression을 수정한 hotfix다. 사내 gateway 또는 proxy 경로를 쓰는 환경에서는 2.1.275 자체보다 2.1.276 이상을 기준으로 검증하는 편이 안전하다.

### 내부 동작에서 읽을 수 있는 원칙

Prompt cache 안정성을 위해서는 단순히 "system prompt를 적게 바꾼다"보다 **정적 영역과 동적 영역을 protocol-level contract로 분리**하는 편이 낫다.

```text
[Stable Prefix]
Core policy
Runtime contract
Tool/Skill usage rules
Stable coding conventions
---------------------------- dynamic boundary
[Dynamic Tail]
Task
Pending CL
Latest evidence
Session memory freshness
Hook output
```

또 계정 기반 Skill/Plugin 동기화가 들어오면서 capability catalog 자체가 session 외부에서 바뀔 수 있게 됐다. 따라서 Harness는 `무슨 Skill이 보였는가`뿐 아니라 **어디서 왔고 어느 generation인가**를 기록해야 재현성이 생긴다.

### 토큰/비용 절감 원리

- 정적 system-prefix 재사용률을 높여 cache creation을 반복하지 않는다.
- memory의 시간성 metadata처럼 내용 의미와 무관한 변화가 cache key를 흔들지 않게 한다.
- forked subagent output을 정확히 전달해 누락으로 인한 재조회/retry turn을 줄인다.

공식 release note에는 정량 절감률이 공개되지 않았다.

### Perforce + Claude/Codex Harness 적용

다음 값을 Context envelope에 명시적으로 둘 가치가 있다.

```text
stable_prefix_hash
prompt_schema_version
capability_generation
capability_sources[]
policy_hash
dynamic_context_generation
```

`CLAUDE.md`, core Skill contract, Perforce submit/permission rule은 stable prefix로 유지하고 `Pending CL`, `p4 opened`, 현재 diff, build/test evidence만 dynamic tail에 둔다.

**평가: 🟢 바로 적용**

Sources:
- https://github.com/anthropics/claude-code/releases/tag/v2.1.275
- https://github.com/anthropics/claude-code/releases/tag/v2.1.276

---

## 2. Codex — Capability도 Turn 단위 immutable snapshot으로 다룬다

최근 Codex main의 일련의 변경은 Skill/MCP/Environment가 단순 설정 목록이 아니라 **실행 Context의 일부이자 versioned capability state**라는 방향을 더 명확하게 만든다.

### A. 실행 중 environment 변경은 다음 turn까지 보류

`#46310`은 active turn이 수행되는 도중 environment selection이 바뀌더라도 현재 turn의 working directory, MCP workspace root, capability root를 바꾸지 않는다. 새 선택은 future selection으로 저장하고 **새 work가 시작될 때만 activate**한다. Manual compaction이 새 environment를 채택해야 할 때도 running task를 먼저 중단한다.

즉 실행 중 Task가 보는 환경은 다음처럼 고정된다.

```text
Turn N starts
  ↓
Capability / Environment Snapshot N
  ├─ workspace root
  ├─ permissions
  ├─ MCP policy
  ├─ Skill catalog
  └─ environment handles
  ↓
Turn N execution

configuration changed during N
  ↓
pending configuration
  ↓
Turn N+1 snapshot
```

`#46335`도 같은 원칙을 MCP policy까지 확장한다. 실행 중 저장된 environment 변경이 현재 turn의 MCP tool visibility를 뒤집지 않고, **captured environment snapshot과 runtime publication이 같은 authority**를 사용하도록 맞췄다.

### B. 표시용 metadata 변화는 Skill/MCP cache를 깨지 않는다

`#46309`은 plugin image URL, badge 같은 display metadata 갱신이 실제 behavior가 바뀌지 않았는데도 plugin/MCP/Skill cache를 무효화하던 문제를 수정했다.

새 invalidation 기준은 대략 다음과 같다.

- identity
- version
- enablement
- authentication/install policy
- availability

반면 renewed image URL 같은 UI-only metadata는 cache identity에서 제외한다. Regression test에서는 logo/badge 갱신 후에도 기존 MCP session과 Skill resource cache가 그대로 재사용되고, authentication policy가 바뀔 때만 resource cache가 다시 invalidated되는 것을 확인한다.

### 토큰/비용 절감 원리

이건 직접적인 text compression은 아니지만 실제 Agent 비용에는 중요하다.

- 불필요한 Skill catalog 재탐색/재로드 방지
- MCP session 재연결 및 Tool schema rematerialization 방지
- display-only 변화로 stable prefix/tool catalog가 흔들리는 것을 방지
- mid-turn capability drift 때문에 tool call이 실패하고 retry되는 상황 감소

공개된 정량 token 절감치는 없다.

### Perforce Harness 적용

권장 구조:

```text
TurnCapabilitySnapshot
  task_id
  turn_id
  workspace_id
  pending_cl
  environment_generation
  skill_catalog_hash
  mcp_policy_hash
  permission_hash
  behavior_hash
```

설정 변경은 `pending_capability_state`에 넣고 현재 turn에는 절대 반영하지 않는다. Cache invalidation도 전체 JSON hash가 아니라 **behavioral fields만 canonicalize한 hash**로 결정한다.

Perforce 관점에서는 workspace mapping이나 client spec이 turn 도중 바뀌는 것도 같은 종류의 문제다. Agent가 시작할 때 `client/workspace/depot mapping/have revision` snapshot을 잡고 다음 turn/task 경계에서만 새 state를 채택하는 편이 안전하다.

**평가: 🟢 원칙 바로 적용 / 🟡 Runtime Adapter 반영 PoC**

Sources:
- https://github.com/openai/codex/commit/c775dd3c332de1b69b25a4580f6c5bc44b94e284
- https://github.com/openai/codex/commit/7498521d288b9b3b96ffba4eedf089d8d6e06a84
- https://github.com/openai/codex/commit/0c9be8a836a65681bb4e2366f05590babf89edf2

---

## 3. Token Optimizer MCP v7.1 — Compression보다 더 중요한 것은 Scope와 Turn 수

9월 18일 UTC에 `token-optimizer-mcp`는 v7.1 계열 변경을 병합했다. 이전 Trend에서 PR #386의 Tool deferral 실험은 이미 다뤘으므로 여기서는 **새로 추가된 default routing, project-scoped knowledge, 후속 head-to-head 측정**만 다룬다.

### A. Compression을 실제 client traffic에 항상 적용할 수 있게 함

기존 proxy는 `token-optimizer-run`이 직접 실행한 process에만 붙었다. 새 supervisor는 upstream별 loopback route를 장기 유지해 `/plugin`, IDE, shell alias 등 wrapper 밖에서 시작한 지원 client도 compression path를 사용할 수 있게 한다.

중요한 안전 원칙은 다음이다.

- upstream을 추측하지 않는다.
- dead proxy를 client 설정에 남기지 않는다.
- 기존 user setting을 덮으면 원래 값을 기록하고 정확히 복구한다.
- route가 실제 serve된 뒤에만 config를 쓴다.
- optimizer failure 때문에 provider 자체가 막히는 것보다 optimization을 포기하는 fail-open을 선호한다.

### B. RAG/Knowledge injection의 Project Scope를 prompt에서 추론하면 안 된다

초기 supervisor 설계는 daemon의 cwd 또는 proxied request 안의 working-directory text에서 project를 판별하려 했다. 이 방식은 다른 project의 knowledge를 현재 session에 섞을 수 있었다.

실제 seed graph 측정에서는 project-scoped ceiling이 **99,842 characters**, transferable knowledge가 **30,870 characters**라서, scope가 틀리면 약 **69%가 다른 project의 advice**가 될 수 있다고 기록했다. 이 데이터는 cached prefix에서 매 turn 다시 읽히므로 품질 문제이면서 동시에 token 낭비다.

최종 방향은 project identity를 model request 내용에서 추론하지 않고 **launcher/control plane이 신뢰 가능한 project identity를 전달**하게 하고, route key도 `upstream + project`로 분리한다. Project를 확정할 수 없으면 knowledge를 넣지 않는다.

이건 사내 Harness의 RAG에도 그대로 적용해야 한다.

```text
BAD
prompt text / cwd 문자열에서 project 추론
  → RAG namespace 결정

GOOD
Orchestrator-owned workspace identity
  → depot mapping / project id
  → authorized retrieval namespace
  → selective context
```

### C. 신규 head-to-head 측정

공개된 검증은 3 synthetic tasks × 3 repetitions × 3 arms, 총 27 runs이며 모든 run이 correct였다.

| 지표 | Token Optimizer | Uncompressed control | HeadRoom 0.37.0 |
|---|---:|---:|---:|
| Mean input tokens / run | **42,468** | 55,632 | 71,626 |
| Mean input / request | **14,156** | 18,544 | 16,529 |
| Requests / run | **3.0** | 3.0 | 4.3 |
| Agent seconds | **17.3s** | 19.1s | 27.3s |

Control 대비 mean input은 약 **23.7% 감소**, HeadRoom 대비 약 **40.7% 감소**다. Agent seconds는 control 대비 약 **9.4%**, HeadRoom 대비 약 **36.6% 짧았다**.

이 실험의 중요한 해석은 `tokens/request`와 `requests/run`을 따로 본다는 점이다. 압축률이 좋아도 elision을 다시 읽기 위한 추가 turn이 생기면 전체 session은 비싸질 수 있다.

Caveat도 크다: 짧은 synthetic workload 3개, token 수 중심이고 dollar cost가 아니며, fresh workspace라 knowledge injection의 효과는 포함되지 않았다. 따라서 절감률을 그대로 내부 환경에 대입하면 안 된다.

### Perforce + Claude/Codex Harness 적용

RAG namespace authority를 최소 다음 값에서 만들 것을 권장한다.

```text
project_id
p4_client
workspace_root
depot_mapping_hash
pending_cl(optional)
knowledge_generation
```

이 값은 model prompt가 아니라 Harness/Perforce adapter가 공급해야 한다. 확정할 수 없으면 cross-project knowledge를 제공하지 않는 fail-closed가 맞다.

Benchmark도 `tokens/request` 하나가 아니라 아래를 함께 기록한다.

- input tokens / solved task
- requests(turns) / solved task
- cache read/create
- rehydration/readback count
- wall time
- deterministic build/test result

**평가: 🟢 Project-scoped selective context와 계측 방식은 바로 적용 / 🟡 proxy compression 자체는 PoC**

Sources:
- https://github.com/ooples/token-optimizer-mcp/commit/388916f1907a6421412c5cb6fee6dc91a1d3871e
- https://github.com/ooples/token-optimizer-mcp/releases/tag/v7.1.0

---

## 4. Better Harness — 큰 Evidence는 Prompt가 아니라 Agent-readable Artifact로

이 구현은 9월 16일 commit이지만 기존 Trend에서 빠졌고, 현재 Context Engineering에 직접 재현 가능한 수치가 있어 보강 가치가 있다.

Better Harness의 architecture-model generation은 원래 generated candidate, bindings, manifests, source directories를 전부 run prompt에 넣었다. 200-element 실제 project에서 prompt가 **74,788 characters**가 되어 protocol의 **65,536-character limit**을 넘고 run 자체가 시작되지 않았다.

수정 후 구조는 다음과 같다.

```text
Large Evidence Pack
(candidate / bindings / manifests / source dirs)
            │
            ▼
 candidate.json
 inside agent's allowed working fence
            │
            ▼
Small Prompt
"read candidate.json and perform contract X"
```

같은 project에서 evidence pack은 **74,095 characters**, 실제 instruction prompt는 **876 characters**가 됐다. 문자량 기준 prompt는 기존 74,788에서 876으로 약 **98.8% 감소**했다.

이건 단순한 `파일로 빼라` 일반론보다 구현상 중요한 조건이 붙는다.

- evidence file은 Agent가 이미 읽을 권한이 있는 fence 안에 둔다.
- 기존 사용자의 `candidate.json`을 덮어쓰지 않고 run-scoped 이름을 사용한다.
- run이 만든 임시 evidence만 종료 시 제거한다.
- prompt에는 evidence의 위치와 수행 contract만 남긴다.
- large payload는 project size와 함께 커져도 instruction prompt 크기는 거의 고정된다.

테스트는 200-element candidate, evidence round-trip, prompt bound, failure propagation을 포함해 통과했지만, commit 시점에는 실제 ACP agent + Rust host의 desktop E2E run은 아직 pending이라고 명시되어 있다.

### Perforce Harness 적용

아래 종류는 직접 prompt에 넣기보다 content-addressed evidence artifact로 빼는 게 좋다.

- 대형 `p4 describe`/diff
- UE asset registry 결과
- build/test full log
- architecture inventory
- generated schema/index
- 코드 심볼 dictionary

예시:

```text
.ai/evidence/<task>/<content-hash>.json

Context message:
- evidence_id
- content_hash
- kind
- source revision / pending CL
- bounded read contract
```

단, 이전 Trend에서 다룬 offload pointer와 마찬가지로 **pointer 자체가 evidence identity**이므로 collision, stale path, permission mismatch를 반드시 검증해야 한다.

**평가: 🟢 large static evidence externalization은 바로 적용 / 🟡 Better Harness 전체 도입은 PoC**

Sources:
- https://github.com/QoderAI/better-harness
- https://github.com/QoderAI/better-harness/commit/38f2d89b59e7cba3a2f61bb0e2f9964cc3b23e2b

---

## 오늘의 통합 결론

오늘 항목은 서로 다른 프로젝트지만 하나의 방향으로 수렴한다.

> **Context를 텍스트 덩어리로 관리하지 말고, Authority·Generation·Scope·Artifact Reference가 붙은 versioned projection으로 관리한다.**

현재 Perforce + Claude Code + Codex Harness에 맞추면 다음 구조가 가장 자연스럽다.

```text
Durable Task / Pending CL
          │
          ├─ Authoritative Workspace Identity
          │      p4 client / depot mapping / project
          │
          ├─ Turn Capability Snapshot
          │      skill / MCP / policy / environment generation
          │
          ├─ Stable Prompt Prefix
          │      core rules / contracts
          │
          ├─ Dynamic Context Projection
          │      current task / diff / latest evidence
          │
          └─ Evidence Artifact Store
                 large logs / inventories / source-linked data
                         │
                         ▼
                  Claude / Codex
```

### 구현 우선순위

1. **Stable/Dynamic Prompt Boundary** — core rules와 task state를 물리적으로 분리
2. **TurnCapabilitySnapshot** — 한 turn 동안 Skill/MCP/workspace authority 고정
3. **Behavioral Cache Key** — display metadata가 아니라 version/policy/enablement로 invalidation
4. **Trusted Knowledge Scope** — RAG namespace를 prompt가 아닌 Perforce/Harness identity로 결정
5. **Evidence Artifact Externalization** — 대형 payload는 file/blob + pointer로 전달
6. **Task-level KPI** — token/request와 requests/task를 반드시 동시에 측정

### 오늘 제외한 항목

Deep Agents의 최신 commit/release도 확인했지만 전일 이후 Context/Harness 관점에서 별도 항목으로 올릴 정도의 핵심 architecture 변화는 확인하지 못했다. OpenHands의 최근 profile 관련 변화도 기존 Trend에서 다룬 capability profile/secret scope의 연장선이라 중복 항목으로 올리지 않았다.

## 참고 자료

- Claude Code releases: https://github.com/anthropics/claude-code/releases
- OpenAI Codex: https://github.com/openai/codex
- Token Optimizer MCP: https://github.com/ooples/token-optimizer-mcp
- Better Harness: https://github.com/QoderAI/better-harness
