---
title: "AI Harness · Context/Token Optimization Scout — 2026-09-29"
date: 2026-09-29
category: trend
tags:
  - ai-harness
  - coding-agent
  - context-engineering
  - token-optimization
  - claude-code
  - codex
  - open-swe
  - rag
  - perforce
---

# 2026-09-29 AI Harness · Context/Token Optimization Scout

## 요약

`jaywapp/wiki`의 `develop` 브랜치를 다시 확인했다. canonical 일일 보고서는 현재 `2026-09-24`까지 존재하고, 9월 25~28일 파일은 아직 `develop`에 없다. 다만 해당 날짜 자동화에서 이미 조사했던 RRSI, Tool Schema Budget, catalog-first MCP startup, deferred mailbox, Harness-R1, Ecdysis, JIT-Agent, OpenMemory, Persistent Billable State, Repowise, cache-aware routing, ContextDoctor, shared MCP catalog cache, CliffCompaction, Growing Harness 등은 중복 방지 기준에 포함해 이번 보고서에서 반복하지 않았다.

오늘은 **새 stable 릴리스/구현 변화 5개 흐름 + selective structured context의 정량 연구 1건**이 의미 있었다.

| 항목 | 오늘 확인한 핵심 | 평가 |
|---|---|---|
| Claude Code v2.1.284 + Sonnet 5.5 | compaction 재시도·resume capability wait + 모델×effort×Harness의 비단조 cost/quality | **바로 적용 / Router PoC** |
| Codex history-aware prewarm | idle 동안 기존 history를 `generate:false`로 준비하고 prefix/settings 일치 시 다음 turn에서 재사용 | **PoC 가치 높음** |
| Codex Guardian selective review context | worker handoff window + 필요 시 bounded conversation-history retrieval | **원칙 바로 적용 / PoC** |
| Codex pending environment inheritance | child spawn 시 ready뿐 아니라 아직 준비 중인 environment ownership까지 snapshot으로 상속 | **바로 적용 / PoC** |
| Open SWE Claude Code → cloud handoff | verbatim transcript + pushed branch로 실제 cross-harness session migration 구현 | **아이디어 참고 / PoC** |
| Sola Security Brain 연구 | live enumeration 대신 offline relational substrate + query-time reasoning으로 coverage·cost 크게 개선 | **PoC 가치 높음** |

---

## 1. Claude Code v2.1.284 + Sonnet 5.5 — Context가 커진 만큼 Router는 모델만이 아니라 Effort와 Harness까지 함께 봐야 한다

Claude Code `v2.1.284`가 2026-09-28 18:02 UTC에 공개됐다. Harness/Context 관점에서 중요한 변화는 세 가지다.

첫째, compaction 후에도 여전히 `Prompt is too long`이면 이제 **한 번 더 compaction을 수행하면서 최근 conversation 보존량을 더 줄인다.** 즉 한 번의 summary가 항상 context budget을 만족한다고 가정하지 않고, 실제 request admission 결과를 보고 다시 축약한다.

둘째, resumed session에서 MCP Tool call이 server reconnect보다 먼저 재생되어 `No such tool available`이 나던 경우, 최대 10초까지 server readiness를 기다린다. 이것은 Resume Capsule이 transcript만 복원해서는 충분하지 않고 **Capability readiness도 함께 복원되어야 한다**는 사례다.

셋째, startup에서 settings schema 전체를 만들지 않고 **실제로 사용된 settings file 부분만 materialize**하도록 바뀌었다. 직접적인 prompt token 절감은 아니지만 Harness startup에서도 `필요한 schema/capability만 구성`하는 demand-driven materialization이 확산되는 흐름이다.

또한 같은 릴리스부터 Anthropic API의 기본 Sonnet이 `claude-sonnet-5-5`가 됐다. Sonnet 5.5는 1M context, input/output $2/$10 per MTok, cache read $0.20/MTok이며 Anthropic은 Sonnet 5 대비 output 생성이 30%+ 빠르고 task당 비용이 최대 30% 낮다고 보고한다.

더 중요한 점은 **effort가 높을수록 항상 결과가 좋아지지 않았다는 것**이다. FrontierCode에서 Sonnet 5.5는 Max effort가 Xhigh보다 낮은 점수를 냈다. Anthropic 설명에 따르면 Max에서 Claude Code의 code-review Skill이 더 자주 여러 subagent를 띄웠고, 일부 case에서 timeout 또는 scope 밖 추가 수정으로 점수가 떨어졌다.

즉 Router의 단위는 이제 다음이어야 한다.

```text
RoutingDecision
  model
  effort
  harness_profile
  subagent_policy
  tool_budget
  review_topology
  expected_cache_reuse
```

### 정량 신호

Anthropic 공개 자료 기준:

- Terminal-Bench 4.0: Sonnet 5.5 70.6%, Sonnet 5 10.3%
- Medium effort Sonnet 5.5는 Sonnet 5의 best score를 **1/10 미만 비용**으로 상회
- High effort FrontierCode에서 GPT-6 Sol best score를 약 **1/5 task cost**로 맞췄다고 보고
- Slack offline eval: 약 **14% fewer output tokens**
- Balyasny private 2,441-task suite: answer당 약 **121k tokens vs 497k**
- Lovable coding eval: **tool call 약 1/3 감소, shell run 약 절반 감소**

후자의 customer 수치는 독립 benchmark가 아니라 early-tester 결과이므로 방향성 신호로만 봐야 한다.

### Perforce · Claude Code · Codex 적용

- well-scoped bugfix/리뷰/반복 수정은 Sonnet 5.5 Medium/High arm을 내부 CL corpus에서 추가
- open-ended architecture/큰 migration은 Opus 계열과 별도 비교
- `model × effort × HarnessProfile`을 하나의 실험 key로 기록
- `subagents/task`, `tool_calls/task`, `out_of_scope_edits`, `timeout_rate`, `cost/verified-task`를 함께 측정
- compaction은 fixed 1회가 아니라 `admission → compact → 재측정 → 필요 시 더 강한 compact` lifecycle로 구현

**평가: compaction 재-admission과 model×effort×harness telemetry는 바로 적용. Sonnet 5.5 routing policy는 내부 Perforce task corpus로 PoC.**

Sources:
- https://github.com/anthropics/claude-code/releases/tag/v2.1.284
- https://www.anthropic.com/claude-sonnet-5-5

---

## 2. Codex — Idle thread의 기존 History를 미리 Warm-up하고, 정확히 같은 Prefix일 때만 재사용

Codex commit `#48812`는 `CodexThread::prewarm_with_history()`를 추가했다.

기존 startup prewarm은 empty input 기반으로 connection을 준비했다. 새 경로는 idle thread의 **현재 conversation history와 executed-tool metadata**를 포함한 request를 `generate:false`로 미리 준비한다. 다음 실제 turn에서:

1. 새 prompt가 미리 준비한 history를 prefix로 그대로 확장하고,
2. request settings도 일치할 때만

prepared response를 재사용한다. 그렇지 않으면 continuation을 버리고 정상 request로 돌아간다.

```text
Idle
  ↓
History + executed-tool metadata
  ↓
generate:false prewarm
  ↓
Next input arrives
  ├─ prefix/settings match → prepared continuation reuse
  └─ mismatch               → discard + normal request
```

이 방식은 context를 삭제하는 최적화가 아니라 **동일한 history/cache state를 다시 준비하는 지연을 idle time으로 옮기는 최적화**다.

### Perforce 적용 아이디어

TeamCity build, UE Automation Test, 장시간 `p4 sync`처럼 Agent가 외부 작업을 기다리는 동안:

- 현재 verified context generation을 snapshot
- Provider/Runtime이 지원하면 idle prewarm 수행
- build 결과가 도착했을 때 해당 결과만 delta로 추가
- 아래 값이 바뀌지 않았을 때만 prepared continuation 재사용

```text
PrewarmLease
  history_digest
  tool_execution_digest
  model + effort
  capability_generation
  permission_hash
  p4_client
  pending_cl
```

workspace, model, permission, Skill/MCP generation이 바뀌면 즉시 폐기해야 한다.

### 측정

직접 token 절감량은 공개되지 않았다. 내부 PoC에서는:

- prewarm hit rate
- stale prewarm discard rate
- next-turn first-token latency
- cache read/create
- extra prewarm request cost
- build-wait 이후 total cost/turn

을 비교해야 한다. Hit가 낮으면 prewarm 자체가 낭비다.

**평가: PoC 가치 높음. 특히 build/test 대기 시간이 긴 Perforce/UE workflow에 적합.**

Source:
- https://github.com/openai/codex/commit/3f4668da20a56907f0a8c546c8cffa16e5e03f28

---

## 3. Codex Guardian — Reviewer Context를 “전체 Parent Transcript” 대신 Handoff Window + 필요할 때만 검색

9월 28일 Codex Guardian에 두 가지 변화가 연속으로 들어왔다.

### 3-1. Worker-specific Handoff Window

`#49057`의 opt-in `guardian_root_handoff_context`는 reviewer에게 root transcript 전체를 주는 대신, 기록된 `spawn_agent`, `send_message`, `followup_task`에서 특정 worker 또는 ancestor로 이어지는 handoff를 찾아 **handoff 직전 root message 3개 + 최신 root message 3개**를 선택한다.

최신 message를 별도로 유지하는 이유는 handoff 뒤에 생긴 cancellation/revocation 같은 새 상태를 reviewer가 놓치지 않게 하기 위해서다.

Verified Tool answer와 ordering을 확정할 수 없는 evidence도 별도 보존하고, handoff evidence가 compaction으로 사라져 selection을 안전하게 만들 수 없으면 기존 context로 fallback한다.

### 3-2. Bounded Conversation-History Retrieval

`#49036`은 opt-in `guardian_conversation_history_tools`를 추가해 reviewer가 정말 필요한 경우에만 `search_messages` / `read_messages`로 과거 사용자 message를 조회할 수 있게 했다.

중요한 guardrail은 다음과 같다.

- 매 호출마다 **현재 parent의 Tool/App policy를 다시 확인**
- disabled Tool 또는 approval이 필요한 retrieval은 거절
- user authorization과 assistant context를 구분
- 이후의 revocation을 고려하도록 prompt에 명시
- incomplete search result를 완전한 기록처럼 취급하지 않음
- 기본 history Tool response budget은 **약 4,000 estimated tokens**
- parent/reviewer 쪽에 더 엄격한 limit이 있으면 그것을 우선

이를 합치면 Reviewer Context가 다음 구조가 된다.

```text
Reviewer Base Context
  task contract
  worker-specific handoff window
  latest cancellations/revocations
  verified diff/build/test evidence
        │
        └─ ambiguity exists?
               ↓
        bounded history search/read
```

### Token 절감 원리

과거 사용자 restriction이 필요할 수 있다는 이유로 root conversation 전체를 모든 review에 넣지 않는다. 평소에는 작은 handoff window만 유지하고 **authorization ambiguity가 있을 때만 selective retrieval**한다.

### Perforce 적용

Codex Reviewer에게 기본으로:

- Pending CL / depot scope
- Worker handoff summary
- latest user restriction
- build/test verdict
- diff/evidence refs

만 주고, “이 submit이 정말 승인됐는가?”, “이 경로 수정 금지가 이전에 있었는가?” 같은 경우에만 Durable User Message Ledger를 검색하게 한다.

검색 결과에도 `source_message_id / order / revoked_by / completeness / truncation`을 붙여야 한다.

**평가: handoff-window + selective history 원칙은 바로 적용. 실제 retrieval Tool은 PoC.**

Sources:
- https://github.com/openai/codex/commit/6288753b469615a0b62e8cf0dd65c6e893eb4849
- https://github.com/openai/codex/commit/41ed72c32b4980cd7919e1c2a45ecb1f96c5911a

---

## 4. Codex — Sub-agent Isolation은 “현재 준비된 환경”만 복사하면 안 된다

Codex `#49075`는 child를 spawn하는 시점에 environment가 아직 준비 중이면 그 selection이 child에서 빠지던 문제를 수정했다.

새 구현은 spawning step의 environment snapshot을 child에 넘기면서:

- ready environment
- **starting/pending environment**
- configuration ownership

을 함께 유지한다.

원 owner가 처음 받은 configuration result/failure는 descendant로 전달되고 각 session에서 다시 validation한다. Child가 독립적으로 configuration을 정했다면 parent의 이후 update가 그것을 덮어쓰지 않는다. Pending wait는 executor retry를 지나도 유지한다.

```text
Parent Environment Snapshot
  ├─ ready
  ├─ pending
  ├─ owner
  └─ generation
        ↓ spawn
Child
  ├─ same pending selection
  ├─ waits for owner's first resolution
  └─ may override independently
```

### 왜 중요한가

기존 Capability Snapshot 패턴은 “spawn 순간 현재 상태를 freeze”하는 데 초점이 있었다. 하지만 async environment에서는 **아직 확정되지 않은 future state도 task identity의 일부**다.

이를 누락하면 child가 default environment로 실행하고, 나중에 workspace/capability mismatch를 발견해 다시 탐색·재실행할 수 있다.

### Perforce 적용

예를 들어 parent가:

- 특정 P4 client sync 중
- UE SDK/toolchain bootstrap 중
- TeamCity agent workspace 할당 대기 중

인 상황에서 child를 띄웠다면, child가 다른 준비된 default workspace를 고르는 것이 아니라 동일 selection의 resolution을 기다려야 한다.

```text
EnvironmentSelectionSnapshot
  selection_id
  owner_task_id
  state: ready | pending | failed
  p4_client
  depot_mapping
  have_generation
  toolchain_generation
  capability_generation
```

**평가: lifecycle/schema는 바로 적용. 실제 child propagation과 retry semantics는 PoC.**

Source:
- https://github.com/openai/codex/commit/3749d1eff7df4ac9a0e2d32099813ba56500b930

---

## 5. Open SWE — Claude Code Session을 실제 Cloud Harness로 넘기는 Cross-Harness Handoff 구현

Open SWE `#3340`은 로컬 Claude Code session을 cloud thread로 옮기는 `oswe mcp upload_session`을 추가했다.

실제 흐름은 꽤 실용적이다.

1. 로컬 Claude Code JSONL transcript를 **verbatim** 전송
2. 해당 작업 디렉터리를 commit/push한 repo+branch 또는 PR을 함께 전달
3. 서버가 Claude transcript를 LangChain message로 변환
4. 새 idle thread를 생성
5. “이전 Tool은 uploader machine에서 실행됐고 이 sandbox에는 없을 수 있다. 먼저 해당 branch를 checkout하라”는 provenance note를 추가

Claude Code가 release마다 transcript shape를 바꾸는 문제도 고려한다. parse하지 못하는 block/record는 전체 import를 실패시키지 않고 skip하며, skipped record의 UUID는 유지해 parent chain은 보존한다. 단 parse 가능한 record가 하나도 없으면 거절한다.

또 fork PR이나 remote에 push되지 않은 branch는 cloud agent가 checkout할 수 없으므로 thread 생성 전에 reject한다.

### 장점

- source runtime의 Tool call이 target runtime에서도 유효하다고 착각하지 않도록 provenance를 명시
- transcript와 working tree state를 동시에 handoff
- format drift를 fail-soft하게 처리
- 실제 checkout 가능성을 preflight

### Context/Token trade-off

현재 구현은 최대 32 MiB transcript를 받을 수 있고 session transcript를 통째로 옮긴다. **호환성에는 강하지만 Context 최소화 전략은 아니다.**

Perforce/Claude Code → Codex Reviewer에는 전체 JSONL을 직접 replay하기보다 이 구조를 변형하는 편이 낫다.

```text
SessionHandoffPackage
  source_runtime
  target_runtime
  original_goal
  p4_client / pending_cl
  verified_checkpoint
  unresolved_work
  evidence_refs
  user_constraints
  transcript_ref          # raw archive
  compact_projection      # target runtime input
```

Target Runtime은 raw transcript를 archive로 보존하되, 기본 model context에는 `compact_projection`만 넣는다. 필요할 때만 transcript selective retrieval을 허용한다.

**평가: 제품/방식 자체는 아이디어 참고~PoC. “working-state preflight + transcript provenance + target-side re-projection”은 바로 적용 가치가 높음.**

Source:
- https://github.com/langchain-ai/open-swe/commit/50fc4099d9b0e5a5c44269720e4f3e2b0b51e309

---

## 6. Sola Security Brain 연구 — Population/Graph 질문은 Live Agent Enumeration보다 Structured Context Layer가 강하다

9월 24일 공개된 `Coding Agents Aren't Enough! Evaluating an Enterprise Security Brain for Agentic Cloud Investigations`는 coding-agent와 purpose-built context substrate를 직접 비교한다.

실험은 28개 cloud-security investigation task에서:

- Sola: offline에서 normalized/versioned relational substrate와 관계를 준비하고 query-time에 security logic 실행
- Claude Code: 같은 AWS environment를 read-only CLI로 live exploration

하는 방식이다.

### 정량 결과

논문 보고 기준:

- coverage: **0.693 vs 0.387** — 상대 +79.2%
- 28개 중 **25개 task**에서 Sola 우위
- reasoning cost/task: **17.7× lower**
- coverage당 cost: **31.6× lower**

가장 중요한 failure example은 `sample-and-generalise`다. Claude Code가 약 5,000개 bucket 중 40개만 조사하고 “bucket policy가 없다”고 일반화했지만, 실제로는 65개 bucket에 wildcard-principal read grant가 존재했다.

즉 “특정 파일 하나 찾아 수정”과 달리 **전체 population을 빠짐없이 훑어야 하는 질문**은 turn-budget 기반 live exploration과 궁합이 나쁠 수 있다.

### Coding Harness로 옮길 수 있는 부분

대규모 Perforce/UE repository에서도 다음은 population/graph query에 가깝다.

- 특정 API를 호출하는 모든 module/file은?
- 이 symbol 변경 영향권 전체는?
- 특정 owner/team이 관리하는 모든 asset은?
- build failure가 전파되는 dependency path는?
- 특정 config/flag를 쓰는 모든 target은?
- test coverage가 없는 changed subsystem 전체는?

이런 경우 Agent가 매번 `rg/find/p4 files`로 일부를 탐색하기보다, 별도 context substrate를 유지하는 것이 낫다.

```text
Offline / Incremental Index
  symbols
  call/dependency graph
  ownership
  build targets
  asset refs
  changelist lineage
  test mapping
        ↓
Deterministic query
        ↓
small verified result set
        ↓
Agent reasoning
```

### Token 절감 원리

raw repository를 매 turn 탐색하지 않고, complete inventory/graph에서 task-shaped result만 model에 전달한다. 중요한 것은 “검색 결과가 작은가”보다 **coverage를 증명할 수 있는 query substrate인가**다.

### 주의점

논문의 두 arm은 model tier까지 동일하지 않고 security-specific benchmark다. 따라서 17.7× 수치를 coding Harness에 그대로 기대하면 안 된다. 하지만 “population task는 complete indexed substrate에서 먼저 해결하고 LLM은 interpretation에 사용”한다는 architecture는 매우 강한 PoC 후보다.

내부 benchmark에서는 `coverage oracle / query count / tokens/verified-answer / missing-entity rate / index freshness`를 같이 측정해야 한다.

**평가: 원칙은 바로 적용, Perforce symbol/dependency/ownership context layer는 PoC 가치 높음.**

Source:
- https://arxiv.org/abs/2609.30345

---

## 보조 관찰 — Context 최적화 Metrics가 더 구체화되고 있다

Codex `#48819`은 Tool/Skill context metric에 explicit histogram bucket을 추가했다.

- Tool fragment bytes / namespace count: logarithmic boundary, 32,768까지
- Skill enabled/kept count: 0~512
- removed Skill description chars: 131,072까지
- Skill truncation 여부: 0/1
- 각 범위 초과 overflow bucket 유지

이 변화 자체는 새로운 optimization 기법은 아니므로 별도 핵심 항목으로 승격하지 않았지만, 앞서 제안한 `ContextDoctor`를 실제 telemetry로 만들 때 **평균만 보지 말고 distribution/overflow를 보라**는 좋은 구현 사례다.

Source:
- https://github.com/openai/codex/commit/456212ca2155747d7e9ee752ad3ef010c39be9a5

---

## 오늘의 통합 결론

오늘은 다음 세 방향이 특히 강했다.

### 1. Compaction은 one-shot summarization이 아니라 admission loop

```text
assemble
 → measure
 → compact
 → re-admit
 → still too large?
      └─ stronger compact
```

Claude Code 2.1.284가 이 fallback을 제품 수준에서 명시적으로 구현했다.

### 2. Multi-agent Context는 전체 transcript 공유가 아니라 Handoff-local + On-demand Retrieval

Guardian의 worker-specific handoff window와 bounded history retrieval을 합치면, sub-agent isolation의 실용적 형태가 보인다.

- 평소에는 작은 local context
- authorization/제약이 불명확할 때만 원본 history 검색
- verified evidence는 별도 durable layer
- cancellation/revocation은 최신 delta로 강제 포함

### 3. Context Engineering은 “몇 token 넣을지”보다 어떤 substrate를 미리 계산할지의 문제

Sola 연구의 핵심은 강한 모델보다 **complete inventory/graph를 미리 계산한 context substrate**가 population task에서 더 높은 coverage와 훨씬 낮은 reasoning cost를 낼 수 있다는 점이다.

Perforce Harness에서 다음 구현 우선순위를 권장한다.

1. **Context admission loop** — post-compaction 재측정 + stronger fallback
2. **Model × Effort × HarnessProfile telemetry** — Sonnet 5.5 arm 추가
3. **Reviewer handoff-local context + bounded history retrieval**
4. **Pending EnvironmentSelectionSnapshot 상속**
5. **SessionHandoffPackage + target-side selective re-projection**
6. **Perforce repository graph/index PoC** — symbol/dependency/ownership/test mapping
7. **Idle history prewarm PoC** — build/test wait 구간 활용

가장 중요한 한 문장으로 줄이면:

> **긴 Context를 계속 잘라내는 것만으로는 부족하다. 반복 상태는 cache/prewarm하고, 역할별 context는 handoff 경계로 격리하고, 전체성(coverage)이 필요한 질문은 live exploration 대신 검증 가능한 structured substrate에서 먼저 해결해야 한다.**

