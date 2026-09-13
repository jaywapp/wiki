---
title: AI Harness Token Scout - 2026-09-14
category: news
tags:
  - ai
  - harness
  - context-engineering
  - token-optimization
  - handoff
  - evidence
  - codex
  - strands
source: GitHub / official repositories
updated: 2026-09-14
---

# AI Harness Token Scout - 2026-09-14

> 오늘의 핵심은 **장기 세션을 잘 요약하는 것에서 더 나아가, handoff 자체를 검증 가능한 계층형 artifact로 만들고 audit/evidence metadata는 모델 context와 분리하는 방향**이다.

## 조사 범위와 중복 제외

2026-09-10~13 Scout와 기존 Wiki를 먼저 확인했다. 이미 다룬 Knowledge Triage, Codex model-visible token estimator·bounded recap·cache affinity, Strands durable stash/session integration, Token Optimizer MCP, Flow, GSD Pi, base-harness 등은 반복하지 않았다.

Claude Code는 최신 확인 버전이 v2.1.270으로 전일 보고서 이후 Harness/Token 관점의 새 release는 확인되지 않았다. OpenHands, Aider, Cline, Roo Code도 전일 기준점 이후 의미 있는 신규 commit을 확인하지 못했다.

## 오늘의 신규/유의미 항목

| 항목 | 신규성 | 핵심 포인트 | 평가 |
|---|---|---|---|
| CCompactor | 2026-09-12 생성, 09-13 v0.1.16 | deterministic ledger + 4-layer handoff + provenance retrieval | **PoC 가치 높음** |
| Docket | 2026-09-13 생성, v0.0.4 | per-hunk agent provenance + after-edit evidence + review priority | **PoC 가치 매우 높음** |
| Codex main #45185 | 2026-09-13 | audit/tool-call metadata를 inference·compaction·history budget과 분리 | **바로 적용** |
| Codex main #45248 | 2026-09-13 | model/effort/tool inventory를 turn 초기값이 아니라 issuing step에 귀속 | **바로 적용** |
| Strands Context Manager presets | 2026-09-11 UTC | auto/agentic preset + proactive/agentic compression 정책 분리 | **PoC / 설계 참고** |

---

## 1. CCompactor - Handoff를 Summary가 아니라 계층형 Retrieval Artifact로

CCompactor는 Claude Code, Codex CLI, Pi의 local transcript를 읽어 다른 Agent가 이어받을 수 있는 compact handoff artifact로 변환하는 신생 TypeScript CLI다.

핵심 구조는 네 계층이다.

```text
Raw Transcript
     │
     ▼
Agent Adapter → Common IR / Ledgers
     │
     ▼
L0 Brief
  goal / hard constraints / last commands / verify-first
     │
L1 Continuation Summary
  optional LLM narrative
     │
L2 Deterministic Ledgers
  files / commands / errors / tools
     │
L3 Retrieval Index
  omitted event ranges → bounded expand
```

가장 중요한 점은 L0~L2에서 빠진 정보를 버리지 않고 event range pointer로 L3에 남긴다는 것이다. successor는 전체 transcript를 받지 않고 필요한 경우에만 `expand`로 원문을 조회한다.

프로젝트는 `--llm none`으로 모델 호출 없이도 artifact를 만들 수 있다. 공개된 자체 측정에서는 103,757-event 실제 세션을 약 4,050 tokens의 artifact로 2초 안에 처리했다고 한다.

`bench`도 제공하지만 결과는 보수적으로 봐야 한다. 프로젝트 자체 설명에서 `none/tail`보다 `artifact/retrieval`이 낫다고 보고하는 한편, sctxx와의 과거 직접 비교는 질문 집합이 달라 스스로 철회했다. 공통 22문항만 놓고 보면 sctxx 14/22, CCompactor 3/22로 오히려 크게 뒤진다. 따라서 구조는 흥미롭지만 handoff quality는 아직 성숙하지 않았다.

### Perforce 적용

```text
Pending CL
   │
   ├─ Claude transcript
   ├─ Codex transcript
   └─ build/test/tool events
          │
          ▼
     Common Handoff IR
      ├─ L0 task brief
      ├─ L2 file/command ledger
      └─ L3 evidence pointer
          │
          ▼
     Claude / Codex successor
```

Git commit identity를 `pending_cl + depot path#revision + content hash`로 바꾸면 현재 Harness에 잘 맞는다. 특히 자유형 `handoff.md` 하나에 모든 것을 밀어 넣는 대신 **짧은 기본 handoff + 원문으로 복귀 가능한 evidence index**를 분리하는 방향이 유용하다.

**평가: 🟡 PoC 가치 높음**

참고: https://github.com/ccompactor/ccompactor

---

## 2. Docket - Agent가 만든 Diff를 Evidence-aware Review Surface로

Docket은 2026-09-13 공개된 프로젝트로, Agent가 만든 최종 commit diff의 각 hunk에 구현 과정의 provenance와 검증 evidence를 연결한다.

```text
Claude / Codex events
      │
      ├─ Edit / Patch
      ├─ Shell mutation observation
      ├─ Test / Type / Static check
      └─ Coverage
             │
             ▼
      File Replay Engine
             │
             ▼
       Final Diff Hunks
             │
       ┌─────┴─────┐
       │           │
 Provenance     Evidence
 who/why       what verified
       │           │
       └─────┬─────┘
             ▼
     Risk-ordered Review
```

Docket은 timestamp만 보고 작성자를 추정하지 않는다. 특정 line이 credit 대상 edit의 recorded output에 실제 존재하고 정렬된 위치도 맞을 때만 attribution한다. 중간에 shell/editor/human edit가 끼어 pre-image가 달라지면 `unknown`으로 남기며 억지로 이어 붙이지 않는다.

검증도 단순히 “테스트를 실행했다”가 아니다. 코드 변경 **이후** 실행된 test/type/static result만 해당 edit evidence로 인정하고, coverage report가 code보다 오래되었으면 제외한다.

프로젝트의 자체 측정에서는 Claude Code Edit/Write 세션이 hunk 98.1%, Codex apply_patch 세션이 94.7% attribution을 보였고 content verification은 각각 100%, 99.8%였다. 반면 shell-heavy Claude 세션은 hunk 59.2%로 크게 떨어졌다. 즉 Hook으로 shell mutation까지 관찰하지 않으면 provenance hole이 커진다는 점도 실제 수치로 드러난다.

### Perforce 적용

현재 `Work → Review` 사이에 **Evidence Collector**를 명시적으로 넣을 수 있다.

```text
Worker
  ↓
Pending CL changes
  ↓
Evidence Collector
  ├─ source edit events
  ├─ after-edit tests
  ├─ coverage/static result
  └─ human review contact
  ↓
Per-hunk Evidence Map
  ↓
Codex Reviewer
  low-evidence hunks first
```

Git commit/orphan ref 대신 Harness DB 또는 `.ai/evidence/`에서 Pending CL에 record를 bind하면 된다. Submitted CL이 생기면 final depot revision/hash를 붙여 immutable evidence로 승격한다.

중요한 점은 Agent가 자기 evidence를 자연어로 써서 제출하게 하지 않고 Hook/collector가 실제 event에서 deterministic하게 만드는 것이다.

**평가: 🟡 PoC 가치 매우 높음**

참고: https://github.com/Dillonsmart/docket

---

## 3. Codex main - Audit Metadata는 Context가 아니다

2026-09-13 Codex main commit #45185는 direct tool-call metadata의 lifecycle을 정교하게 바꿨다. tool call record를 실제 invocation output에 binding하고 pending metadata를 bounded하게 관리하는 동시에, capture가 꺼진 경우 이 metadata를 inference와 compaction input에서 제거한다.

또 executed-call metadata를 app-server raw notification에서 제거하고 Guardian history retention budget 계산에서도 그 크기를 제외한다.

이 변화는 전일의 `model-visible token accounting`을 한 단계 더 구체화한다.

```text
Tool Execution
    │
    ├─ Model-visible Result
    │     text / data needed for next reasoning
    │
    └─ Audit Metadata
          call inventory
          attribution
          host/private metadata
          telemetry
             │
             └─ Durable Ledger / Observability
                  NOT automatic model context
```

Harness에서 auditability를 강화하다 보면 JSON metadata가 계속 커진다. 이것을 그대로 context/compaction budget에 포함시키면 **관찰 가능성을 높일수록 Agent context가 비싸지는 역설**이 생긴다.

따라서 Event Store schema에서도 `model_visible_payload`와 `audit_payload`를 분리하고, audit lane은 durable하게 보존하되 model이 필요로 할 때만 작은 projection을 생성하는 방식이 좋다.

**평가: 🟢 바로 적용**

참고: https://github.com/openai/codex/commit/1715e55076737158ba61d43158ede504de6d4ce1

---

## 4. Codex main - Model Routing Telemetry는 Turn이 아니라 Issuing Step에 귀속

같은 날 commit #45248은 turn 도중 model이나 reasoning effort가 바뀔 때 metadata/hook이 처음 설정을 잘못 보고할 수 있는 문제를 수정했다.

Responses, MCP, extension tool call은 tool을 실제 발행한 step의 captured execution metadata를 공유하고, pre/post-tool hook도 그 step의 model·approval settings를 사용한다. remote compaction에는 해당 issuing step에서 확정된 tool inventory를 별도로 연결한다.

```text
Root Turn
   │
   ├─ Step A
   │    model = Claude/Codex A
   │    effort = medium
   │    tools = {read, search}
   │
   └─ Step B
        model = Model B
        effort = high
        tools = {p4, build, review}
              │
              ▼
      Tool/Hook Metadata
      MUST point to Step B
```

현재 multi-model Harness도 `turn_id`만 남기지 말고 `step_id + effective_model + effort + tool_inventory_version + approval_policy`를 event에 snapshot하는 편이 좋다. 그래야 나중에 cost/evidence/review failure를 실제 실행 설정에 귀속할 수 있다.

**평가: 🟢 바로 적용**

참고: https://github.com/openai/codex/commit/16537b20a5ec0ea9aa079f4ad4b0e30e8a9efacf

---

## 5. Strands - `auto`와 `agentic` Context Strategy를 명시적으로 분리

Strands Harness SDK의 Context Manager에는 Python/TypeScript 양쪽에 strategy preset 계층이 추가되었다. 기존 Context Manager의 durable stash 구조에 더해 context reduction 정책을 named preset으로 선택할 수 있게 한 변화다.

Python 구현 기준 `context_manager='auto'`는 tool result를 1,500-token threshold부터 proactive하게 truncate하고 context utilization 85%에서 최근 4 messages를 보존한 summarization을 수행한다. `agentic`은 tool-result truncation threshold를 8,000으로 높이고 summarization을 overflow 시점까지 늦춘다.

별도 building-block preset도 제공한다.

| Preset | 기본 정책 |
|---|---|
| `proactive_summarization` | 70% utilization에서 오래된 message summarize |
| `large_tool_offloading` | 2,500 tokens 초과 tool result를 1,000-token preview로 |
| `overflow_protection` | window full일 때 오래된 context truncate |
| `stale_tool_cleanup` | 최근 5개를 제외한 오래된 tool result drop |

여기서 중요한 것은 정확한 threshold 숫자보다 **Context Manager에 personality를 부여했다는 것**이다. Focused coding처럼 원문 연속성이 중요한 task와 exploration/log-heavy task에 같은 compression policy를 쓰지 않는다.

현재 Harness에서는 task classifier 결과를 `context_policy=conservative|balanced|aggressive`처럼 context policy preset으로 연결해 볼 수 있다.

**평가: 🟡 PoC / 설계 참고**

참고: https://github.com/strands-agents/harness-sdk/commit/08ed4cfd3eb42ae9f668595e675d5f196eee7e44

---

## 오늘의 Harness 설계 결론

오늘 결과를 누적하면 다음 계층이 추가로 선명해진다.

```text
                        Task / Pending CL
                               │
                       Durable Event Ledger
                               │
              ┌────────────────┴────────────────┐
              │                                 │
       Audit / Provenance                Model-visible Context
       full trace / metadata              compact projection
              │                                 │
              │                         Context Policy Preset
              │                      conservative / balanced / aggressive
              │                                 │
              │                         Layered Handoff Artifact
              │                       L0 → L1 → L2 → L3 retrieve
              │                                 │
              └───────────────┬─────────────────┘
                              ▼
                     Claude / Codex Runtime
                              │
                        Edit / Tool / Test
                              │
                              ▼
                      Evidence Collector
                              │
                         Pending CL Diff
                              │
                      Evidence-aware Review
```

우선순위는 **① audit payload와 model-visible payload 분리 → ② structured layered handoff → ③ Pending CL evidence collector → ④ step-level execution metadata → ⑤ task별 context strategy preset** 순으로 보는 것이 좋다.

토큰 절감 관점에서도 오늘의 결론은 단순하다. **모든 정보를 압축할 필요는 없다. 모델이 볼 필요가 없는 audit 데이터는 아예 context lane에서 빼고, 다시 필요할 수 있는 작업 정보는 작은 pointer와 retrieval 경로로 남기는 편이 더 안정적이다.**

## 참고 자료

- CCompactor: https://github.com/ccompactor/ccompactor
- Docket: https://github.com/Dillonsmart/docket
- Codex direct tool metadata: https://github.com/openai/codex/commit/1715e55076737158ba61d43158ede504de6d4ce1
- Codex issuing-step metadata: https://github.com/openai/codex/commit/16537b20a5ec0ea9aa079f4ad4b0e30e8a9efacf
- Strands Context Manager presets: https://github.com/strands-agents/harness-sdk/commit/08ed4cfd3eb42ae9f668595e675d5f196eee7e44
