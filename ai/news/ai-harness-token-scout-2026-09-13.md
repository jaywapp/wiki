---
title: AI Harness Token Scout - 2026-09-13
category: news
tags:
  - ai
  - harness
  - context-engineering
  - token-optimization
  - codex
  - claude-code
  - agent
source: GitHub / official docs / arXiv
updated: 2026-09-13
---

# AI Harness Token Scout - 2026-09-13

> 오늘의 핵심은 **컨텍스트를 무조건 요약하는 것에서 벗어나, 모델이 실제로 보는 토큰을 계측하고 지식 타입별로 보존 정책을 달리하며, 세션 identity와 cache affinity를 분리하는 방향**으로 Harness가 진화하고 있다는 점이다.

## 조사 범위와 중복 제외

최근 Wiki와 2026-09-10~12 Scout를 먼저 확인했다. 이미 다룬 `Strands Agents Context Manager`, `Token Optimizer MCP`, `base-harness`, `Flow`, Claude Code v2.1.268~269의 prompt-cache 안정화, Codex request-budget admission/turn×model telemetry는 반복하지 않았다.

Claude Code v2.1.270은 2026-09-13 KST 새벽 공개됐지만 이번 범위에서 의미 있는 변화는 장시간 세션 뒤 read-only git Bash 명령이 permission을 다시 요구하던 v2.1.269 regression 수정이어서 별도 핵심 항목으로 올리지 않았다.

## 오늘의 신규/유의미 항목

| 항목 | 핵심 변화 | 평가 |
|---|---|---|
| Knowledge Triage / Compaction Cliff | 타입별 Context 보존, 반복 compaction에서 rule recall 실측 | **바로 적용 / PoC** |
| Codex main - model-visible token accounting | 저장 JSON 크기가 아니라 모델 가시 content로 token 추정 | **바로 적용** |
| Codex main - bounded recap + cache affinity | 의미 단위 handoff + fork의 cache/session identity 분리 | **PoC 가치 높음** |
| Harness Engineering source study | 11개 production harness의 7개 subsystem/29개 pattern 분석 | **설계 기준으로 바로 활용** |
| GSD Pi recent hardening | durable journal/recovery, routing provenance, tool-visible binding | **PoC / 아키텍처 참고** |

---

## 1. Knowledge Triage - Compaction을 타입 블라인드하게 하면 안 된다

### 한줄 요약

`/compact` 같은 단일 요약 정책으로 모든 지식을 동일하게 압축하지 말고, **Constraint / Procedure / Belief / Preference / Episodic으로 분류한 뒤 서로 다른 보존 정책을 적용**해야 한다.

### 확인된 실험

CIKM 2026 논문과 공개 reference implementation은 20개 production agent configuration에서 Claude Code `/compact` + Sonnet 4.6의 constraint recall이 50% compaction 1회 후 약 53%, 5회 후 약 10%까지 떨어지는 현상을 `Compaction Cliff`로 측정했다.

제안 방식 `TypeCompact`는 같은 5회 반복에서 약 96% recall을 유지했다. 공개 README 기준으로 TypeDecompose는 locality violation을 93%에서 0%로, TypeRetrieve는 in-scope constraint recall@50을 0.73에서 1.00으로 개선했다고 보고한다. deterministic operator 자체는 LLM 호출 없이 동작하도록 구현되어 있다.

### 구조

```text
Raw Knowledge
    │
    ▼
Type Classifier
    │
    ├─ Constraint  ── exact pin
    ├─ Procedural  ── exact / dedupe
    ├─ Belief      ── semantic compact
    ├─ Preference  ── merge / summarize
    └─ Episodic    ── aggressive drop
             │
             ├─ TypeCompact
             ├─ TypeDecompose
             └─ TypeRetrieve
```

Reference implementation의 `type_compact()`는 constraint와 procedure를 먼저 budget에 pin하고, 이것만으로 budget을 초과하면 `COMPACTION_UNSAFE`를 반환한다. 남은 budget만 belief/preference/episodic에 배분한다.

### Perforce + Claude/Codex 적용

현재 Harness에서는 다음을 **절대 요약 금지 lane**으로 두는 것이 좋다.

- 사용자/팀의 hard rule
- `p4 submit` 금지/허용 조건
- workspace/depot/path restriction
- 정확한 build/test command
- Pending CL / review gate 조건
- 보안·권한 정책

반대로 과거 성공 로그, 반복 탐색 결과, 이미 source artifact에 남은 episodic work log는 높은 압축률을 허용한다.

```text
Context Manager
  ├─ PINNED: policy / command / approval / invariant
  ├─ REQUIRED: current task / diff / failing test
  ├─ RETRIEVABLE: facts / architecture / previous findings
  └─ EPHEMERAL: verbose logs / old exploration
```

**평가: 🟢 설계 원칙은 바로 적용, classifier/hook 자동화는 PoC**

참고:
- https://arxiv.org/abs/2608.22752
- https://github.com/searchsim-org/cikm26-knowledge-triage
- https://github.com/searchsim-org/knowledge-triage-skill

---

## 2. Codex main - Token estimator가 serialized envelope이 아니라 model-visible content를 본다

OpenAI Codex main의 2026-09-12 commit `b04a2c2`는 history token 추정 방식을 수정했다. 기존에는 response item을 serialize한 JSON envelope에 포함된 ID, metadata, escaping 등 **모델 의미와 관계없는 storage/transport overhead**까지 token estimate에 포함될 수 있었다.

변경 후에는 text/audio/image/tool payload 등 모델이 실제로 소비하는 content를 중심으로 계산하고, bookkeeping-only item이나 plaintext reasoning 등 replay accounting에 불필요한 요소는 별도로 다룬다.

### 왜 중요한가

잘못된 token estimator는 실제 window가 충분한데도 너무 일찍 compaction을 발생시킬 수 있다.

```text
잘못된 방식
Ledger JSON 120 KB
      ↓
"context가 크다"
      ↓
조기 compact
      ↓
정보 손실 + 추가 compactor turn

권장 방식
Raw storage bytes
      │
      ├─ transport metadata 제외
      └─ model-visible representation
                 ↓
          estimated input tokens
                 ↓
          budget admission
```

### Harness 적용

Task ledger의 크기와 모델 요청 비용을 같은 metric으로 쓰지 않는다.

권장 계측:

- `raw_storage_bytes`
- `model_visible_bytes`
- `estimated_input_tokens`
- `actual_input_tokens`
- `cache_read_tokens`
- `compaction_trigger_reason`

**평가: 🟢 바로 적용**

참고: https://github.com/openai/codex/commit/b04a2c264516ec2e6b3c91dd73ad18a21fd5a88f

---

## 3. Codex main - Recap은 문자 자르기가 아니라 의미 단위 Selection이어야 한다

Commit `8d3c6cc`는 Codex TUI recap의 900-byte 중심 접근을 바꾸고, 약 8,192-token/32KiB ceiling 안에서 과거 exchange를 선택해 recap하도록 확장했다.

핵심은 단순히 뒤쪽 N자를 남기는 것이 아니다.

- 최대 8개의 answered exchange와 pending request 선택
- 최근 correction/steering/progress를 인접하게 보존
- 오래된 **whole exchange부터** 제거
- oversized message는 마지막 단계에서 head/tail excerpt
- 결과를 `summary`와 nullable `next_action`으로 분리
- proposed / queued / implemented / tested / published / installed 상태를 구분
- unresolved validation/availability caveat를 우선 보존

### Harness handoff schema로 가져오기

```text
Handoff
  ├─ goal
  ├─ completed_outcomes[]
  ├─ unresolved_caveats[]
  ├─ corrections[]
  ├─ evidence_refs[]
  └─ next_action?
```

이 방식은 기존의 자유형 `handoff.md`를 더 안정적인 contract로 바꾸는 데 유용하다.

또 관련 변경은 automatic recap을 3분에서 30분으로 늦췄다. recap 자체도 별도 model call이므로, 짧은 이탈마다 요약을 만들지 않는 **debounce** 역시 비용 최적화다.

**평가: 🟢 schema 원칙은 바로 적용 / 🟡 자동 recap은 PoC**

참고:
- https://github.com/openai/codex/commit/8d3c6cc13d41127faa25eebeac00c48410dfe5c5
- https://github.com/openai/codex/commit/f16c2237a561c008375f10e3ae64600654ebd758

---

## 4. Codex main - Session identity와 Prompt-cache affinity를 분리

Commit `bc5957e`는 ephemeral fork가 **자기 session/thread identity는 유지하면서 parent의 cache routing key를 상속**하도록 변경했다.

```text
Parent Task
  session = A
  cache_group = A
       │
       ├─ Fork Worker B
       │    session = B
       │    cache_group = A
       │
       └─ Fork Reviewer C
            session = C
            cache_group = A
```

이 구조가 중요한 이유는 multi-agent에서 observability/ownership을 위해 session ID는 분리해야 하지만, 긴 stable prefix와 동일 tool definitions를 공유하는 child까지 cache를 새로 만들 필요는 없기 때문이다.

현재 Harness에서는 다음 ID를 별도로 두는 게 좋다.

- `task_id`: durable 업무 identity
- `agent_session_id`: agent 실행 identity
- `parent_session_id`: genealogy
- `cache_affinity_id`: 공통 stable-prefix reuse group
- `pending_cl`: VCS identity

**평가: 🟡 PoC 가치 높음**

참고: https://github.com/openai/codex/commit/bc5957eac9e89e66f990ed490d11e625a4a3b02c

---

## 5. Harness Engineering source study - production harness가 실제로 수렴하는 방향

최근 arXiv의 source-code study는 Claude Code, Codex, Gemini CLI, Mistral Vibe, OpenHands, Aider, Mini-SWE-Agent, Hermes, Pi, OpenCode, OpenClaw 등 11개 production harness와 meta-harness를 분석했다.

논문은 harness를 다음 7개 subsystem으로 분해한다.

```text
Harness
 ├─ Agent Loop
 ├─ LLM Integration
 ├─ Tools / Actions
 ├─ Memory / Context
 ├─ Safety / Permission
 ├─ Orchestration
 └─ Extensibility
```

실무적으로 중요한 관찰:

- 약 4M LOC 조사에서 production harness는 범용 agent framework를 거의 사용하지 않고 자체 async/control loop를 가진다.
- code retrieval도 vector embedding보다 deterministic search/glob/tree-sitter 계열이 지배적이다.
- `SKILL.md` 계열 skill이 11개 중 9개, MCP가 8개에서 확인됐다고 보고한다.
- Deferred Loading은 Claude Code/Codex/Hermes 및 여러 Skill 구현에서 반복된다.
- multi-agent는 single/sequential/parallel child/hierarchical tree/recursive composition/registry+protocol로 나뉜다.
- policy가 prompt prose에서 hook/config/policy-as-code로 이동하는 흐름이 관찰된다.

### 현재 Harness 설계에 주는 시사점

우리의 `Orchestrator → Analysis → Work → Review` 구조를 더 복잡한 agent framework에 얹는 것보다, 작은 runtime contract와 deterministic retrieval, durable state, permission/policy layer를 직접 제어하는 방향이 production harness의 실제 구조와 더 가깝다.

**평가: 🟢 설계 기준으로 바로 활용**

참고: https://arxiv.org/abs/2609.00006

---

## 6. GSD Pi - Harness 신뢰성은 prompt보다 durable state/recovery에서 갈린다

GSD Pi는 local-first coding agent/orchestrator로 milestone → slice → task workflow, `.gsd/` local project state, DB-authoritative progress, worktree isolation, multi-provider routing, skills/tools/extensions를 제공한다.

최근 main의 의미 있는 변경은 기능 추가보다 **장기 autonomous execution의 복구 가능성**에 집중돼 있다.

### 확인된 패턴

1. **Model routing provenance**
   - requested model과 provider가 실제 사용한 response model을 분리 기록
   - dynamic routing tier도 함께 저장

2. **Journaled exchange recovery**
   - 중간 파일 교환/재생 과정에서 identity가 바뀐 경우 무한 retry 대신 현재 disk 상태와 journal을 reconcile
   - 모순된 상태는 evidence를 보존하고 journal entry를 retire

3. **Model-visible tool contract**
   - 다음 tool이 필요로 하는 `criterionId`, `questionId`, `interactionId`, revision, option ID를 structured details에만 두지 않고 **모델이 실제 보는 text channel에도 출력**
   - text alone으로 다음 tool call을 구성할 수 있는 regression test 추가

### Perforce Harness에 가져올 것

```text
Pending CL Task
   │
   ├─ Durable DB / Ledger
   │     ├─ desired state
   │     ├─ actual state
   │     └─ recovery evidence
   │
   ├─ Agent Runtime
   │     ├─ requested model
   │     └─ effective model
   │
   └─ Tool Contract
         └─ 다음 action에 필요한 join key를 model-visible 결과에 포함
```

Perforce에서는 worktree 대신 workspace/pending CL isolation으로 치환하면 된다.

**평가: 🟡 GSD Pi 자체 도입보다 recovery/model-provenance 패턴을 PoC**

참고: https://github.com/open-gsd/gsd-pi

---

## 오늘의 실무 결론

오늘까지의 결과를 합치면 Context Manager를 다음처럼 설계하는 것이 가장 합리적이다.

```text
                 Durable Task Ledger
                        │
          ┌─────────────┼─────────────┐
          │             │             │
       Policy        Evidence       History
          │             │             │
       TYPED          REFERENCED     EXCHANGES
          │             │             │
          └─────── Context Manager ───┘
                        │
       ┌────────────────┼─────────────────┐
       │                │                 │
  Pinned Context   Selective/JIT     Compactable
  rules/commands   code/evidence     episodic/log
       │                │                 │
       └────────── Budget Admission ──────┘
                        │
            model-visible token estimate
                        │
                 Runtime Adapter
                /               \
          Claude Code          Codex
                \               /
                 Evidence + Cost
                        │
            Turn/Model/Cache Ledger
```

### 우선순위

1. **Context Type 추가**: `PINNED / REQUIRED / RETRIEVABLE / EPHEMERAL`
2. **Token estimator 변경**: 저장 byte가 아니라 model-visible representation 기준
3. **Handoff schema 구조화**: summary와 next action 분리, unresolved caveat 보존
4. **Cache affinity ID 분리**: agent session ID와 cache group 분리
5. **Tool contract test**: 다음 action의 필수 join key가 모델-visible output에 있는지 자동 검증
6. **Recovery journal**: retry 전에 actual state와 desired state를 reconcile하고 evidence 보존

## 결론

오늘의 가장 높은 가치 항목은 **Knowledge Triage와 Codex의 model-visible token accounting**이다. 전자는 compaction으로 무엇을 버릴지 결정하는 문제를, 후자는 compaction을 언제 시작할지 결정하는 문제를 각각 다룬다. 둘을 합치면 `정확한 budget 측정 → 타입별 admission/retention → bounded handoff → cache reuse`라는 꽤 완성도 높은 Context Engineering 계층을 만들 수 있다.
