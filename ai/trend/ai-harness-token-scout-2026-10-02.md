---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-02"
date: 2026-10-02
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, claude-code, codex, deep-agents, open-swe, model-routing, durable-state, perforce]
---

# 2026-10-02 AI Harness · Context/Token Optimization Scout

## 요약

`jaywapp/wiki` develop의 최근 canonical 보고서와 직전 Scout 실행 기록을 대조했다. develop에는 2026-09-30 보고서가 존재하고 2026-10-01 canonical 파일은 아직 없지만, 10월 1일 실행에서 이미 다룬 Claude Code 2.1.286, Codex revisioned resume, 1 KiB inter-agent notice, Skill OTel, Open SWE reviewer eval, archive/context 분리, EarlyEval은 중복 방지 기준에 포함했다.

오늘은 **Claude Code 2.1.287의 instruction residency·oversized Tool-result 처리·non-preemptive coordination, Codex의 step-scoped capability snapshot과 history-free Tool inheritance, session eviction과 분리된 mailbox, Guardian의 cache-friendly context ordering, Deep Agents Talon 0.0.9의 evidence-aware handoff와 selective vector indexing, Open SWE의 deterministic Auto routing fallback과 retry policy**가 유의미했다.

새로운 독립 정량 token benchmark는 확인되지 않았다. 오늘 항목들은 대부분 2026-10-01에 merge/release된 실제 구현 변화이며, 절감 효과를 숫자로 과장하지 않고 **재주입·재로딩·불필요 turn·retrieval noise·checkpoint/state bloat를 줄이는 구조적 변화**로 평가했다.

| 항목 | 핵심 | 평가 |
|---|---|---|
| Claude Code 2.1.287 | resume/compaction 뒤 CLAUDE.md 중복 삽입 제거, oversized MCP result의 불필요 token-count upload 제거, agent message queueing | **바로 적용** |
| Codex StepCapabilitySnapshot | 각 step의 plugin/Skill snapshot을 고정하고 fresh child에 Tool만 상속, parent history는 상속하지 않음 | **바로 적용 / PoC** |
| Codex Eviction-safe Mailbox | non-turn message를 unloaded agent에 전달할 때 session reload/turn 시작을 피함 | **원칙 바로 적용 / PoC** |
| Guardian cache-friendly ordering | stable transcript prefix를 유지하면서 user restriction은 pruning하지 않음 | **바로 적용** |
| Talon 0.0.9 handoff | subagent 결과를 untrusted evidence로 취급하고 findings/sources/uncertainty/gaps만 handoff | **바로 적용** |
| Talon selective history index | 실제 user/delivered reply만 vector index, Tool/subagent/internal traffic은 제외; 동일 vector dedupe 지속 | **바로 적용 / PoC** |
| Open SWE Auto routing | classifier 불확실/timeout 시 tier 밖 default가 아니라 Fast tier로 결정적 fallback; stream timeout은 same-model retry | **바로 적용** |
| Open SWE binary offload | binary/blob을 LangGraph state와 repo 밖으로 분리하고 model-visible virtual path만 유지 | **바로 적용** |

## 1. Claude Code 2.1.287 — Instruction Residency와 Tool Result Fast Path

Claude Code `v2.1.287`이 2026-10-01 18:00 UTC에 공개됐다. 이번 릴리스는 새로운 압축 알고리즘보다 **이미 넣은 context를 다시 넣지 않는 것**, **지나치게 큰 Tool result를 처리하기 위해 또 비용을 쓰지 않는 것**, **coordination message가 진행 중 작업을 불필요하게 흔들지 않는 것**에 가깝다.

주요 변화:
- session resume 또는 compaction 후 project `CLAUDE.md`가 두 번째로 attach되던 문제 수정
- Opus 5.5 ↔ Sonnet 5.5 전환 시 과거 MCP Tool announcement rewrite로 earlier thinking이 탈락할 수 있던 문제 수정
- limit를 크게 초과한 MCP Tool result는 **token을 세기 위한 추가 upload를 하지 않도록** 개선
- large MCP result 처리 시 메모리와 session-file 크기 감소
- `claude agents` reply는 queued message로 전달
- turn 도중 slash command는 `/stop`을 제외하면 turn 종료 후 실행
- SDK의 priority-now message가 진행 중 web fetch/search를 취소하지 않고 background에서 계속 수행
- mid-session 추가 repository의 Skill/plugin/CLAUDE.md 로딩 시점 수정

Perforce Harness에서는 instruction을 파일 경로가 아니라 다음 identity로 추적하는 편이 좋다.

```text
InstructionResidencyKey
  logical_project
  source_kind
  content_hash
  generation
```

workspace가 agent마다 달라도 같은 logical instruction이면 한 session generation 안에서 중복 주입하지 않는다. `p4 describe`, UE build log, TeamCity log가 hard cap을 넘으면 `root_error + verdict + artifact_ref + hash`로 바꾸고 full log의 token count를 얻기 위해 provider path로 다시 보내지 않는 fast path가 적합하다.

**토큰 절감 원리:** resume/compaction 뒤 instruction 중복 재주입 제거, oversized Tool output의 부수 upload 제거, coordination preemption으로 생기는 새 turn 감소. 정량 절감률은 공개되지 않았다.

**평가: 바로 적용.**

Sources:
- https://github.com/anthropics/claude-code/releases/tag/v2.1.287
- https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md

### Claude Mods

같은 릴리스에는 더 깊은 behavior extension을 허용하는 Claude Mods와 built-in side-agent 계열 기능도 추가됐다. Extension surface로는 흥미롭지만 side-agent 상시 감시는 task당 호출·context·latency를 늘릴 수 있다. 별도 cost/quality benchmark가 없는 현재는 high-risk review lane에서만 실험하는 편이 낫다.

**평가: 아이디어 참고 / 기본 상시 활성화는 도입 가치 낮음.**

## 2. Codex — StepCapabilitySnapshot: History와 Capability의 생명주기를 분리

Codex `#50050`은 environment 변화나 겹치는 catalog refresh 때문에 한 step이 다른 step의 plugin/Skill 선택 결과를 사용할 수 있던 문제를 수정했다. 이제 각 step은 그 step에서 ready인 capability root를 기준으로 selected plugin snapshot을 만들고 disabled plugin을 제외한 뒤 step extension data와 함께 보존한다. Skill attribution과 World State도 이 snapshot을 사용한다.

`#50082`는 fresh V2 subagent가 parent history를 fork하지 않더라도 opt-in flag 아래에서 parent의 client-defined dynamic Tool definition을 상속하고 session metadata에 보존할 수 있게 했다.

핵심은 **HistoryInheritance와 CapabilityInheritance를 별도 축으로 다루는 것**이다.

```text
Parent
  History: large
  Dynamic Tools: P4 / Build / Test / Evidence
        ↓ spawn
Child
  History: fresh
  Tools: minimal inherited capability profile
```

Perforce에서는 Build Worker, Reviewer, Research Worker마다 최소 capability profile을 달리한다.

```text
StepCapabilitySnapshot
  step_id
  capability_generation
  ready_roots
  selected_plugins
  dynamic_tools_digest
  disabled_ids
```

측정값은 Tool schema bytes/child, child initial input tokens, capability correction turns, parent-history reread count, solve rate가 적합하다.

**토큰 절감 원리:** Tool 접근을 위해 parent transcript 전체를 상속하지 않고 필요한 capability만 전달한다. 단 모든 Tool schema를 무차별 상속하면 이득이 줄어든다.

**평가: StepCapabilitySnapshot은 바로 적용, dynamic-tool inheritance 구현은 PoC.**

Sources:
- https://github.com/openai/codex/commit/9561a345310f74d4798d678109ccb4eb9d8cd984
- https://github.com/openai/codex/commit/e4e33a56b073b5d9a550aaf513798480f88e4a38

## 3. Codex — Session Residency와 Agent Mailbox 분리

Codex `#50087`은 unread queue-only message 때문에 idle agent가 unload되지 못하고, 이미 evict된 agent에게 메시지를 보내면 session 전체가 다시 load되던 문제를 수정했다.

새 구조는 non-turn-triggering mail을 in-memory runtime mailbox에 남긴다.
- session unload 후 queue-only mail 유지
- evicted agent에게 새 mail이 와도 session reload/turn 시작 안 함
- `take_mailbox`, `watch_mailbox`로 availability와 consume 분리
- eviction → reload → follow-up을 지나도 message order 보존
- durable sleep/turn-triggering message가 있으면 loaded 유지
- agent 제거/tree 종료 시 mailbox 폐기

```text
AgentMailboxEnvelope
  root_task_id
  recipient
  seq
  trigger_turn
  kind
  evidence_ref
  expires_at
```

Perforce의 progress, low-priority finding, build 완료 알림은 mailbox에 두고 필요한 시점에만 active context로 승격한다.

**토큰·비용 절감 원리:** coordination state가 존재한다는 이유만으로 session context를 복구하고 inference turn을 여는 것을 막는다.

**Trade-off:** upstream mailbox는 in-memory이므로 crash-resilient durable source가 아니다. 중요한 identity/order/evidence pointer는 Task Ledger에도 남기는 편이 좋다.

**평가: 원칙 바로 적용 / runtime 구현 PoC.**

Source:
- https://github.com/openai/codex/commit/960e878df4bf87b9d7fa0849f14561d7cdcca942

## 4. Guardian — Stable Prefix와 User Restriction을 동시에 지킨다

Codex Guardian `#49993`은 async request에서 rolling retained-context가 transcript 앞에 있으면 assistant message 추가/eviction 때마다 reusable history prefix가 깨지는 문제를 수정했다. 새 구조는 stable transcript와 action attestation 뒤에 rolling retained user context를 두고 마지막에 planned action을 둔다.

`#50026`은 handoff relevance filtering에서도 root user message를 보존한다. “배포 취소”, “submit 금지” 같은 restriction이 recent window 밖으로 밀려나도 shared cap 안에서는 남긴다. Assistant context를 줄였다면 context incomplete를 표시해 평범한 reply를 빠진 질문 맥락 없이 authorization으로 오인하지 않게 한다.

```text
Stable
  task contract
  transcript / verified evidence

Semi-stable
  action attestations

Volatile but authoritative
  user restrictions / revocations

Action
  proposed submit / revert / deploy
```

**토큰 절감 원리:** 내용을 무조건 삭제하기보다 변동성이 큰 context를 stable prefix 뒤로 이동시켜 cache reuse를 지킨다. user restriction은 pruning 대상에서 제외한다.

Perforce Reviewer에서도 `constraint_generation`이 바뀌면 ReviewDecision은 invalidate하되 stable evidence prefix는 유지하는 방식이 좋다.

**평가: 바로 적용.**

Sources:
- https://github.com/openai/codex/commit/57ac6f51639f7cad705a48ac4bd8073034a2f150
- https://github.com/openai/codex/commit/2685e3a4cec1cf6ec8df5231bf2311ff7ae9551f

## 5. Deep Agents Talon 0.0.9 — Handoff는 Summary가 아니라 Evidence Contract

Deep Agents Talon `0.0.9`가 2026-10-01 공개됐다. 이미 다룬 ContextDoctor와 archive scope는 제외하고 stable release에 포함된 subagent research handoff 규칙을 본다.

`#6674`는 parent가 subagent research를 재사용하되 trusted fact가 아니라 **untrusted evidence**로 취급하도록 한다. Handoff는 findings, sources, uncertainty, remaining gaps 중심으로 짧게 유지하고 coverage/freshness는 필요한 경우에만 요구한다. Gap, contradiction, suspicious claim, stale evidence가 있을 때만 후속 research를 하며 이미 조사한 범위를 broad research로 반복하지 않는다. Subagent가 claimed approval이나 instruction을 적어도 authority로 취급하지 않는다.

```text
ResearchHandoff
  finding[]
  evidence_ref[]
  uncertainty[]
  coverage?
  freshness?
  remaining_gap[]
```

Perforce에서 Worker가 “이 API 호출부는 4곳”이라고 보고하면 Reviewer는 Worker transcript 전체 대신 이 handoff와 symbol-index evidence만 받는다. submit/revert 같은 consequential action 전에 coverage/freshness가 중요한 항목만 다시 검증한다.

**토큰 절감 원리:** subagent transcript replay 제거 + 해결된 영역 broad re-research 감소 + gap-driven selective follow-up.

새 live-model benchmark는 공개되지 않았다.

**평가: 바로 적용.**

Sources:
- https://github.com/langchain-ai/deepagents/releases/tag/deepagents-talon%3D%3D0.0.9
- https://github.com/langchain-ai/deepagents/commit/ab57eab7e51121a2677d0c5b5aa396487ed2b9ee

## 6. Talon 0.0.9 — Archive와 Vector Index를 같은 것으로 취급하지 않는다

`#6358`은 vector embedding 대상을 실제 user message와 실제 delivered final reply로 제한한다. Tool output, subagent result, intermediate reply, synthetic input, suppressed/failed delivery는 vector index에서 제외하지만 archive text는 keyword search용으로 남긴다.

`#6357`은 같은 chunk가 message revision이나 restart를 지나도 다시 embedding되지 않도록 session-scoped content identity를 persistent Store에 저장한다. Archive write가 acknowledge된 뒤에만 unchanged checkpoint message를 skip하고 deletion 시 mapping도 정리한다.

```text
Archive
  everything needed for audit / keyword retrieval

Vector Index
  trusted visible conversational content only
  content_hash / provenance / scope로 dedupe
```

**토큰·비용 절감 원리:** 불필요 embedding 감소, internal Tool/subagent chatter에 의한 semantic retrieval noise 감소, revision/restart 후 동일 content 재-embedding 방지.

Perforce 장기 memory는 사용자 결정/제약, verified architecture decision, delivered task summary, 반복 검증된 failure signature를 중심으로 embed하고 raw build/test/tool evidence는 artifact/keyword store에 두는 편이 좋다.

```text
MemoryChunkIdentity
  content_hash
  provenance_class
  repository_scope
  generation
```

`#6358`은 295 focused tests, `#6357`은 222 tests를 보고했지만 production token 절감률은 공개되지 않았다.

**평가: indexing policy 바로 적용 / 기존 vector store migration PoC.**

Sources:
- https://github.com/langchain-ai/deepagents/commit/f6850e9d25854b5679010c08f02adae99e6b8a2c
- https://github.com/langchain-ai/deepagents/commit/b3d4967bdcda5b42e976b3e97c357deea82d63ac

## 7. Open SWE — Router Failure와 Transport Failure를 구분

Open SWE `#3529` 이전에는 route classifier가 confidence 0.60 미만, timeout, credential 없음 등으로 `default`를 반환하면 workspace/profile model로 떨어질 수 있었고 그 모델은 Auto tier 밖일 수 있었다. 이제 Auto mode base model은 configured Fast tier다.

- classifier uncertain → Fast
- classifier timeout → Fast
- credential 없음 → Fast
- explicit user/subagent model → 유지
- capability override → 유지

`#3499`는 reviewer/review-scout의 stream stall에 대해 최종적으로 **configured same-model retry**를 사용한다. Stream stall이 request-level transient failure이므로 바로 cross-model fallback할 필요가 없다는 판단이다.

```text
Routing Failure
  classifier uncertain / unavailable
      → known cheap-safe tier

Transport Failure
  stream timeout
      → same-model bounded retry

Capability / Provider Failure
      → cross-model fallback 고려
```

**토큰·비용 절감 원리:** routing failure 때문에 의도치 않은 고비용 default로 올라가거나 transient timeout 때문에 model/cache topology를 불필요하게 바꾸는 것을 막는다. 정량 절감률은 공개되지 않았다.

Perforce Router에는 classifier confidence, selected tier, fallback reason, exact model, explicit override, subagent inheritance를 남기고 실제 사용 모델 기준으로 cost attribution해야 한다.

**평가: 바로 적용.**

Sources:
- https://github.com/langchain-ai/open-swe/commit/48410d9e37c132b697a8fad2de798791401fd904
- https://github.com/langchain-ai/open-swe/commit/e6873ce01ec50e320378e781a5f4acf531bc09e3

## 8. 보조 관찰 — Binary/Blob은 Agent State가 아니다

Open SWE `#3437`은 `FilesystemMiddleware.offload_binary_content`를 활성화해 binary content를 LangGraph state 밖으로 저장한다. Desktop에서는 `/large_tool_results/`, `/conversation_history/`, `/blobs/`를 project repo 밖 artifact root로 route하면서 model이 보는 virtual path는 유지한다.

Perforce Harness에서도 screenshot, binary test artifact, crash dump, 대용량 raw log는 Task Ledger나 workspace에 직접 넣기보다 Evidence Blob Store에 두는 편이 좋다.

```text
EvidenceBlobRef
  blob_id
  content_hash
  mime
  bytes
  storage_uri
  created_by
  evidence_generation
```

직접 text-token 최적화보다는 durable state/checkpoint bloat와 accidental workspace mutation을 줄이는 효과다.

**평가: 바로 적용.**

Source:
- https://github.com/langchain-ai/open-swe/commit/9e17a54da78706f602f570cf42d0b3f19b215def

## 오늘의 통합 결론

오늘 흐름은 **“Context를 전달하는 단위를 더 작게 만들되, Capability·Evidence·Coordination state는 transcript와 분리해 독립 lifecycle을 갖게 하라”**로 정리된다.

현재 구현 우선순위:

1. `InstructionResidencyKey` — resume/compaction 후 동일 instruction 재주입 방지
2. Oversized Tool Result Fast Path — full log token-count 재업로드 금지
3. `StepCapabilitySnapshot` — step마다 plugin/Skill/Tool generation 고정
4. History-free Subagent Spawn + minimal capability profile
5. `AgentMailbox` — non-turn coordination과 session residency 분리
6. Guardian request ordering — stable prefix + volatile authoritative restriction tail
7. Evidence-aware `ResearchHandoff`
8. Archive vs Vector Index 분리
9. Router failure semantics — classifier failure와 transport failure 구분
10. Evidence Blob Store — binary를 task/model state 밖으로 이동

```text
Durable Task Ledger
  goal / restrictions / lifecycle / receipts
             │
             ├─ StepCapabilitySnapshot
             ├─ AgentMailbox
             ├─ ResearchHandoff
             └─ Evidence refs
                    │
             Evidence Store
        text archive / blobs / raw logs
                    │
       selective projection / vector index
                    │
              Model Context
```

원본 상태를 context에 계속 실어 나르는 대신 각 상태를 자기 저장소와 generation에 유지하고 매 step에 필요한 projection만 만든다. 토큰 절감은 그 결과로 따라오고 resume·subagent isolation·review safety·routing 안정성도 함께 개선할 수 있다.

## 신규 정량 결과 여부

오늘 조사 범위에서는 전일까지 다룬 CliffCompaction, Persistent Billable State, RRSI, Repowise, EarlyEval 등을 넘어서는 **새로운 독립적 token/cost benchmark는 확인되지 않았다.** 숫자를 채우기 위해 오래된 benchmark를 반복하지 않았다.
