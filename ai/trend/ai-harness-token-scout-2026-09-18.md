---
title: AI Harness Token Scout - 2026-09-18
category: trend
tags:
  - ai
  - harness
  - context-engineering
  - token-optimization
  - claude-code
  - codex
  - skills
  - review
source: GitHub / official releases / arXiv
updated: 2026-09-18
---

# AI Harness · Context/Token Optimization Scout — 2026-09-18

> 2026-09-18 KST 기준. `ai/trend/`의 2026-09-10~17 보고서를 먼저 대조해 이미 다룬 Tool/Skill deferral, model-visible token accounting, context budget admission, cache affinity, review cursor, checkpoint compatibility, Docket/CCompactor, Deep Agents 0.7.15 offload pointer, HarnessMark, OpenHands capability profile 등은 반복하지 않았다.

## 한줄 요약

오늘의 가장 뚜렷한 흐름은 **Context를 더 잘 요약하는 것보다 `누가 어떤 Context를 볼지`, `어떤 부분을 cache-stable하게 유지할지`, `Review cache가 어떤 evidence 범위를 실제로 검증했는지`, `Skill catalog를 언제 무효화할지`를 Harness가 명시적으로 관리하는 방향**이다.

## 오늘의 유의미 항목

| 항목 | 새로 확인된 변화 | 평가 |
|---|---|---|
| Claude Code v2.1.274 | deferred MCP startup, Monitor 결과+종료 통합, 기본 Code Review의 inline화 | **바로 적용 / PoC** |
| Codex Guardian context layout | delegation sender context는 reviewer만 보고, reusable transcript prefix는 안정화 | **바로 적용** |
| Codex Guardian cached evidence | risk score·authorization·tool coverage를 atomic snapshot으로 publish | **바로 적용** |
| Deep Agents main | Skill catalog에 명시적 invalidation/reload semantics와 fork/isolation 규칙 추가 | **바로 적용 / PoC** |
| twaldin/harness | 26개 coding-agent CLI를 공통 `RunSpec → RunResult`로 감싸는 runtime adapter | **PoC 가치 높음** |
| Harness-of-Harness | 반복 plan→code→test loop + evidence carry-over로 장기 자율개발 품질 향상 | **아이디어 참고** |

---

## 1. Claude Code v2.1.274 — Tool deferral 다음 단계는 `Turn deferral`과 Review topology 최적화

Claude Code `v2.1.274`는 2026-09-17 00:12 UTC에 공개됐다. Harness/Token 관점에서 의미 있는 변경은 세 가지다.

### A. MCP가 아직 연결 중이어도 첫 turn을 막지 않는다

`CLAUDE_CODE_MCP_STARTUP_WAIT_MS`가 추가되어 non-interactive 첫 turn이 MCP 연결을 얼마나 기다릴지 제한할 수 있게 됐다. 특히 `--input-format stream-json`에서는 Tool Search가 어차피 지연 로드할 MCP 서버라면 첫 turn이 최대 2초 기다리던 동작을 제거하고, 준비된 뒤 다음 turn부터 도구가 나타난다.

```text
기존
session start
  -> 모든 MCP 연결 대기
  -> first model turn

변경
session start
  -> 현재 사용 가능한 capability만 materialize
  -> first model turn
  -> 늦게 준비된 MCP는 이후 catalog에 합류
```

Token 자체보다 startup latency 절감 효과가 직접적이지만, **Capability가 준비되지 않았다는 이유로 모델 호출 자체를 늦추지 않는 progressive capability loading** 패턴이라는 점이 중요하다.

### B. Monitor의 `완료 알림 → 결과 조회`를 한 turn으로 합친다

Monitor tool은 script의 마지막 output과 exit notification을 두 번 보내던 구조를 하나의 notification으로 합쳤다. 공식 release note가 명시적으로 **model turn 하나를 절약**한다고 설명한다.

Perforce Harness에서 TeamCity/UE build/test worker에도 같은 구조를 바로 적용할 수 있다.

```text
나쁜 구조
Build completed
  -> Agent wake
  -> result 조회
  -> Agent wake

권장 구조
Build completed
+ exit status
+ compact failure summary
+ evidence/artifact pointer
  -> Agent wake 1회
```

### C. `/code-review` 기본 경로가 다수 Subagent에서 lean inline prompt로 이동

모델별 tuned setting이 없는 경우 `/code-review`가 많은 review subagent를 띄우는 대신 더 얇은 inline review prompt를 사용하도록 변경됐다.

이건 최근의 `Inline / Fork / Isolated` Context Topology 논의에 중요한 보정이다. **Review라고 무조건 별도 Subagent가 이득인 것은 아니다.** 작은 diff나 낮은 위험도의 review는 coordination token과 child-session overhead가 더 클 수 있다.

### Perforce Harness 적용

`ReviewTopologyPolicy`를 두는 것이 좋다.

- 작은/국소 diff + deterministic test 충분 → **inline review**
- 큰 diff / security / architecture / 독립 판단 필요 → **isolated Codex reviewer**
- 기존 분석을 이어받아 수정하는 worker → **fork/handoff**

그리고 build/test completion event에는 결과와 evidence pointer를 반드시 같이 넣어 notification-only turn을 없앤다.

**평가: notification coalescing과 deferred capability startup은 바로 적용, review topology 자동 선택은 PoC.**

Source: https://github.com/anthropics/claude-code/releases/tag/v2.1.274

---

## 2. Codex Guardian — Delegation Context를 Worker와 Reviewer에게 다르게 준다

Codex `main`의 2026-09-17 변경은 multi-agent Context Isolation을 훨씬 구체적으로 만든다.

### Sender의 최근 user restriction은 Reviewer에게만 전달

`send_message_to_thread`로 작업을 위임할 때 sender thread의 최근 local user message를 최대 3개까지 bounded snapshot으로 보존하고 Guardian reviewer에게 제공한다. 중요한 점은 이 snapshot을 **worker prompt에는 넣지 않는다는 것**이다.

또 이 provenance snapshot은 replay, compaction, rollback에는 보존하지만 forked agent history에서는 제거한다. 과거 context가 권한을 자동 승계하지 않는다는 경고도 reviewer에 함께 전달한다.

```text
User restrictions
      │
Delegation Envelope
      ├── Worker projection
      │     task + 필요한 작업 context만
      │
      └── Reviewer projection
            task + recent user restrictions
            + provenance / unavailable-evidence notice
```

이 방식은 `Subagent isolation = context를 적게 주는 것`에서 한 단계 나아가 **Role별 Context Projection**을 만든다.

### Perforce Harness 적용

`DelegationEnvelope`에 다음을 별도 lane으로 두는 것이 좋다.

```text
worker_context
review_context
policy_context
sender_restrictions[]   # bounded
source_event_range
permission_generation
```

예를 들어 Worker에게는 구현 요구와 p4 diff만 제공하고, Reviewer에게는 “submit 금지”, “특정 경로 수정 금지”, “사용자 요청 범위” 같은 restriction을 추가 제공할 수 있다.

이 구조는 token 절감과 correctness를 동시에 노린다. Worker가 필요 없는 정책 history를 매번 들고 다니지 않으면서도 Reviewer가 제약을 잃지 않는다.

**평가: 바로 적용.**

Source: https://github.com/openai/codex/commit/e269f2164cbb9f499e4f22301c393500e2a831f3

---

## 3. Codex Guardian — Prompt Cache와 Review Cache 모두 `변하지 않는 범위`를 명시한다

같은 날 두 변경이 서로 잘 맞물렸다.

### A. Reviewer prompt의 reusable history prefix 안정화

Guardian은 이전 review decision, trusted tool metadata, trusted skill evidence처럼 자주 바뀌는 정보를 transcript/permission context 뒤로 옮겼다. 현재 action보다는 앞에 있지만, 과거 conversation history prefix 자체는 그대로 유지한다.

Regression test도 reviews/tools/skills/action을 바꾸면서 **history prefix가 동일한지** 확인한다.

```text
[Stable Prefix]
transcript
permission context
---------------- cache boundary
[Volatile Tail]
previous reviews
trusted tools / skills
current action
```

이건 기존의 전역 `stable prefix + dynamic tail` 원칙을 **Reviewer 내부 Context layout**까지 적용한 사례다.

### B. Cached score와 evidence coverage를 원자적으로 publish

비동기 Guardian score가 risk score, authorization, tool-call coverage를 각각 따로 갱신하던 구조에서는 approval check가 서로 다른 시점의 정보를 섞어 읽을 수 있었다.

이제 하나의 lock/snapshot 아래에서 성공한 score와 authorization, classified tool-call index를 함께 publish하고, 그 사이 새 tool call이 발생하면 오래된 score를 stale로 판단한다. timestamp 동률에서도 fail-closed precedence를 유지한다.

Perforce Reviewer cache에도 거의 그대로 가져올 수 있다.

```text
ReviewSnapshot
  diff_hash
  evidence_generation
  reviewed_event_cursor
  classified_tool_calls[]
  decision
  reviewer_model
  policy_hash
  created_at
```

`decision=PASS`만 cache하면 안 되고 **그 PASS가 어느 diff/evidence/tool-call 범위까지 관찰했는지** 함께 atomic하게 저장해야 한다.

Worker가 review 실행 중 추가 edit/build/tool call을 만들었다면 늦게 도착한 PASS는 자동 폐기한다.

### Token 절감 원리

- stable prefix → repeated reviewer request의 cache reuse 가능성 증가
- fresh review가 필요 없는 경우 → cached decision 재사용 가능
- stale cache를 잘못 재사용해 retry/re-review하는 비용 감소

정량 token 절감률은 공개되지 않았다.

**평가: 바로 적용.**

Sources:
- https://github.com/openai/codex/commit/d7f8e48d7d9211e169b5b4b438798e21caa923a4
- https://github.com/openai/codex/commit/fcf05456bb27e6c3d5677550f54011db6a2a0817

---

## 4. Deep Agents — Skill Catalog도 cacheable state이며 명시적 invalidation이 필요하다

Deep Agents `main`에는 2026-09-17 `skills_metadata`를 `None`으로 reset하면 다음 run에서 Skill source를 다시 읽는 기능이 들어왔다.

기존에는 Skill metadata가 thread당 한 번 로드된 뒤 state에 cache되어 mid-thread에 Skill을 추가/수정/삭제해도 보이지 않았다. 특히 `None`이 저장되면 “Skill 없음” 상태가 thread 끝까지 고정될 수 있었다.

새 semantics는 다음처럼 명확하다.

```text
skills_metadata = None
→ unknown / invalidated
→ next run에서 source reload

skills_metadata = []
→ 이미 로드했고 실제로 Skill이 없음
→ 추가 backend call 없음

skills_metadata = [...]
→ valid cached catalog
```

또 non-forked subagent는 parent의 Skill metadata를 상속하지 않고 자기 Skill을 로드하며, declarative fork는 parent catalog를 상속한다. child가 parent list를 덮어쓰지 못하도록 state key도 명시적으로 제외한다.

### Perforce/Claude Harness 적용

이걸 내부 `SkillCatalog`에 그대로 적용할 수 있다.

```text
skill_catalog_generation
skill_catalog_state = unknown | loaded
skill_policy_hash
workspace_id
role
```

- CLAUDE.md / Skill 파일 변경
- workspace/project 변경
- Agent role 변경
- Skill allow/deny policy 변경

중 하나가 발생할 때만 generation을 올려 catalog를 invalidation한다. 매 turn 전체 Skill discovery를 다시 하지 않는다.

그리고 Context Topology와 연결한다.

- fork worker → parent Skill catalog 재사용 가능
- isolated reviewer → Reviewer 전용 Skill catalog 새로 materialize
- child → parent catalog overwrite 금지

이는 Prompt/Skill 파일 경량화보다 한 단계 상위의 최적화다. **Skill text를 줄이는 것보다 Skill discovery/catalog 자체를 cache하고 필요할 때만 무효화**한다.

**평가: cache/invalidation semantics는 바로 적용, runtime integration은 PoC.**

Source: https://github.com/langchain-ai/deepagents/commit/f86b4e9abef7620b63a7258bc9fab0ccd83de8a4

---

## 5. twaldin/harness — Runtime Adapter를 직접 만들기 전 참고할 만한 공통 Contract

최근 Trend에서 빠져 있던 실무적인 runtime-adapter 프로젝트다. Python/TypeScript에서 26개 coding-agent CLI를 하나의 `RunSpec → RunResult` contract로 실행한다. Claude Code, Codex, Gemini, OpenCode, Aider, SWE-Agent 등을 같은 one-shot API로 다루고 일부 backend는 controlled session API도 제공한다.

중요한 것은 단순 subprocess wrapper보다 contract 경계다.

```text
RunSpec
  agent
  model
  workdir
  permission policy
  timeout
  native options
      ↓
Runtime Adapter
      ↓
RunResult
  exit / termination
  duration
  tokens_in/out
  cost_usd
  stdout/stderr
  truncation / parse errors
```

README는 `null accounting = free가 아니라 unknown`이라고 명시하고, repeated usage snapshot을 단순 합산하지 말라고 경고한다. 출력 capture는 기본 1 MiB cap을 두며 truncated 여부를 별도 상태로 제공한다. unsupported backend/permission 조합은 silent fallback이나 privilege escalation 없이 명시적 error로 종료한다.

### 현재 Harness에 유용한 부분

우리 쪽에서 `ClaudeCodeRuntime`, `CodexRuntime`을 만들 때 최소 공통 contract를 다음처럼 고정하는 참고가 된다.

- 실행 결과와 launch/parse/cleanup failure 구분
- tokens/cost가 unavailable인 상태 표현
- output truncation 여부
- timeout 종류(wall/inactivity) 분리
- permission policy를 runtime adapter가 임의 승격하지 않음
- native capability와 supported backend를 명시적으로 expose

Token 절감 프로젝트는 아니지만 **모델별 cost/token 측정을 같은 schema에 귀속**시키는 기반이 되므로 Harness A/B 최적화에 직접 도움이 된다.

Perforce 환경에서는 workdir을 agent workspace로, 결과에 `pending_cl`, `task_id`, `step_id`를 추가하는 wrapper를 두면 된다.

**평가: 전체 도입보다 Runtime Adapter contract PoC 가치 높음.**

Source: https://github.com/twaldin/harness

---

## 6. Harness-of-Harness — 장기 Agent의 개선 단위는 Turn이 아니라 `검증된 iteration`

최근 논문이지만 기존 Trend/Wiki에 없던 항목이라 보강한다. Harness-of-Harness(HoH)는 기존 coding-agent harness 위에 반복적인 **Planner → Developer → QA Tester** loop를 얹고, 이전 iteration의 artifact와 evidence bundle을 다음 iteration의 starting state로 사용한다.

핵심은 자유로운 장기 session이 아니라 **작고 검증 가능한 increment**다.

```text
Iteration N
Planner (read-only planning)
   ↓ development document
Developer
   ↓ updated artifact
QA Tester (read-only verification)
   ↓ evidence + unresolved gaps
Iteration N+1
```

논문 abstract 기준 GameCraft-Bench, FrontierSWE, ProgramBench에서 Codex/GPT-5.5, OpenCode/DeepSeek-V4-Pro, Pi/MiniMax-M3의 standalone harness와 비교했을 때 3회 iteration 후 평균 상대 향상 52.25%, 최대 82.86%를 보고한다. 또한 실제 FPS 프로젝트를 70회 이상 loop로 진행한 multi-day 사례를 공개했다.

다만 중요한 제약이 있다. 저장소는 현재 **HoH-lite core implementation을 아직 공개 예정**이라고 명시하고 있어 full implementation을 재현 가능한 OSS로 바로 도입할 수 있는 상태는 아니다. 따라서 benchmark 숫자를 내부 Harness에 그대로 기대해서는 안 된다.

### Perforce Harness에 가져올 원칙

장기 Task를 하나의 거대한 Claude session으로 유지하기보다 다음 cycle로 자른다.

```text
Plan
→ Pending CL 작업
→ Build/Test
→ Read-only QA/Review
→ Evidence Bundle
→ 다음 Slice 계획
```

다음 iteration에 넘기는 것은 전체 transcript가 아니라 **검증된 artifact + unresolved gaps + evidence refs + next plan**이다. 이는 durable state, handoff, evidence-based verification을 한 lifecycle로 묶는 방식이다.

토큰 절감 자체의 공개 수치는 없고 iteration이 늘면 총 비용은 증가할 수 있다. 대신 장기 자율 개발에서 품질과 수렴성을 높이는 workflow 방법론으로 의미가 있다.

**평가: 현재는 아이디어 참고. HoH-lite 공개 후 PoC 재평가.**

Sources:
- https://arxiv.org/abs/2609.01481
- https://github.com/Flesymeb/HarnessOfHarness

---

## 오늘의 통합 설계 제안

오늘 결과를 기존 Harness 설계에 합치면 다음 계층이 더 선명하다.

```text
Task / Pending CL
      │
Delegation Envelope
  ├─ worker projection
  ├─ reviewer projection
  └─ bounded user restrictions
      │
Capability / Skill Catalog
  ├─ cached generation
  └─ explicit invalidation
      │
Runtime Adapter
  Claude / Codex
      │
Tool / Build / Test
  final output + exit를 한 event로
      │
Review Context
  stable transcript prefix
  + volatile evidence/action tail
      │
Atomic Review Snapshot
  decision + coverage + evidence generation
      │
Verified Iteration Handoff
```

## 내부 Harness 우선순위

1. **바로 적용** — Build/Test 완료 event에 result + exit + evidence pointer를 합쳐 retrieval-only turn 제거
2. **바로 적용** — `DelegationEnvelope`에서 Worker/Reviewer Context Projection 분리
3. **바로 적용** — Review cache에 `reviewed_event_cursor + evidence_generation + diff_hash`를 decision과 atomic 저장
4. **바로 적용** — Skill catalog에 generation/invalidation semantics 추가
5. **PoC** — small diff는 inline, high-risk diff는 isolated Codex review로 라우팅
6. **PoC** — Claude/Codex 공통 `RunSpec/RunResult` runtime adapter contract 정규화
7. **아이디어 참고** — 장기 task를 verified iteration 단위로 쪼개는 HoH-style lifecycle

## 결론

오늘의 핵심은 **Context Compression보다 Context Ownership**에 가깝다.

- Worker와 Reviewer가 같은 Context를 볼 필요가 없다.
- Review 요청 전체가 매번 바뀔 필요가 없다.
- Review cache는 결과뿐 아니라 그 결과가 관찰한 evidence 범위를 함께 가져야 한다.
- Skill catalog는 매 turn 다시 만드는 prompt 조각이 아니라 explicit invalidation을 가진 cached state가 될 수 있다.
- Tool/Build 상태 변화는 모델을 깨우는 notification 수 자체를 줄여야 한다.

즉 현재 Perforce + Claude Code + Codex Harness에서 다음 최적화 대상은 **`tokens/turn`보다 `unnecessary turns + unnecessary context ownership + stale cache invalidation`**이다.

## 참고 자료

- Claude Code v2.1.274: https://github.com/anthropics/claude-code/releases/tag/v2.1.274
- Codex Guardian delegation context: https://github.com/openai/codex/commit/e269f2164cbb9f499e4f22301c393500e2a831f3
- Codex Guardian stable prefix: https://github.com/openai/codex/commit/d7f8e48d7d9211e169b5b4b438798e21caa923a4
- Codex Guardian atomic cached evidence: https://github.com/openai/codex/commit/fcf05456bb27e6c3d5677550f54011db6a2a0817
- Deep Agents Skill reload: https://github.com/langchain-ai/deepagents/commit/f86b4e9abef7620b63a7258bc9fab0ccd83de8a4
- twaldin/harness: https://github.com/twaldin/harness
- Harness-of-Harness: https://github.com/Flesymeb/HarnessOfHarness
- Harness-of-Harness paper: https://arxiv.org/abs/2609.01481
