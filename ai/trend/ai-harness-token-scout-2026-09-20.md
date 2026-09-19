---
title: AI Harness Token Scout - 2026-09-20
category: trend
tags:
  - ai
  - harness
  - context-engineering
  - token-optimization
  - claude-code
  - codex
  - perforce
updated: 2026-09-20
---

# 2026-09-20 AI Harness · Context/Token Optimization Trend

## 조사 기준

`ai/trend/`의 2026-09-10~19 보고서를 기준점으로 삼아 이미 다룬 Tool/Skill deferral, model-visible token accounting, request budget admission, cache affinity, review cursor/checkpoint compatibility, CCompactor, Docket, HarnessMark, Deep Agents offload pointer/skill invalidation, OpenHands capability profile, Claude Code v2.1.275/276 static/dynamic prompt boundary, Codex capability snapshot, Token Optimizer MCP v7.1, Better Harness evidence externalization 등은 반복하지 않았다.

오늘은 **실질적으로 새롭거나 기존 Trend에서 빠졌지만 구현·측정 가치가 큰 5개 항목**만 남겼다.

| 항목 | 새롭게 확인된 핵심 | 평가 |
|---|---|---|
| Claude Code v2.1.277/278 | Resume cache correctness 보강 + server-side Auto classifier로 routing overhead 분리 | **바로 적용** |
| Codex post-turn compaction | active turn이 끝난 뒤 threshold 기반 opportunistic compaction | **PoC / 원칙 바로 적용** |
| Codex context build modes | history injection에는 Skill discovery를 생략하고 실제 execution에만 full context 구성 | **바로 적용** |
| SoL-Pi | Action Fusion + ObservationPack + evidence-grounded reducer + economic compaction으로 44.7~49.0% token traffic 감소 보고 | **바로 적용 아이디어 / PoC 가치 매우 높음** |
| Harness Design empirical study | rule-based elision→LLM summary, recoverability의 실제 효용, model별 planning/tool topology를 176 matched settings로 검증 | **바로 적용 설계 원칙 / PoC** |

---

## 1. Claude Code v2.1.277/278 — Routing 비용과 Resume Cache를 Harness 계층에서 분리

### 무엇이 새로워졌나

Claude Code `v2.1.277`은 2026-09-18 UTC에 공개되었고, context/cache 관점에서 다음 변화가 중요하다.

- `/clear`, restart, `--continue`, `--resume` 계열의 복구 경로에서 첫 메시지 일부나 attachment가 다시 render되어 prompt cache miss를 일으키던 문제를 수정했다.
- resumed subagent/teammate가 이미 로드했던 MCP tool definitions를 다시 render해 해당 agent의 prompt cache를 깨던 문제를 수정했다.
- headless/SDK 첫 turn이 per-directory project instruction lookup을 기다리지 않도록 startup 경로를 줄였다.
- subagent 결과가 main agent에 전달될 때 명시적인 subagent-output header와 indentation을 붙여, child 결과 안의 텍스트가 session instruction처럼 보이지 않게 했다.
- `AGENTS.md` fallback을 추가했다. 프로젝트에 `CLAUDE.md`가 없으면 `AGENTS.md`를 project instruction으로 읽는다.

직후 `v2.1.278`에서는 Auto mode가 Claude API/Enterprise 및 Bedrock·Vertex·Foundry·gateway 환경에서 **server-side classifier를 기본값으로 사용**하도록 변경됐다. Anthropic 설명상 이 classifier overhead 자체에는 과금하지 않으며, 일부 환경은 `CLAUDE_CODE_AUTO_MODE_SERVER=0`으로 opt-out 가능하다. `/status`에는 현재 session이 server-side Auto classifier를 사용하는지 표시한다.

### 내부 동작에서 읽을 수 있는 원칙

#### 1) Resume는 단순 session ID 복원이 아니라 Cache-Compatible Replay여야 한다

```text
Resume State
  ├─ conversation/history identity
  ├─ stable tool catalog
  ├─ attachment identity
  ├─ subagent capability snapshot
  └─ cumulative usage ledger
           ↓
Cache-Compatible Replay
```

같은 의미의 context라도 tool definition이나 attachment가 다른 위치/형식으로 다시 render되면 provider prompt cache 관점에서는 다른 prefix가 된다. 따라서 Harness의 resume/handoff는 내용 복원뿐 아니라 **stable serialization**을 보장해야 한다.

#### 2) Router도 비용 계층으로 독립 계측해야 한다

```text
Task
  ↓
Routing Decision
  ├─ client-side classifier → token/cost 발생 가능
  └─ provider/server classifier → 별도 과금 정책
  ↓
Selected Model / Effort
```

`model routing이 싸다`고 가정하지 말고 최소한 다음을 telemetry에 남기는 편이 좋다.

```text
routing_mode
classifier_location
classifier_model(optional)
classifier_billed
routing_latency_ms
fallback_reason
selected_model
selected_effort
```

### Prompt/Skill 파일 경량화 관점

`AGENTS.md` 지원은 Claude/Codex 공통 bootstrap을 만들기 좋은 변화다. 다만 큰 정책 파일 하나를 모든 runtime에 복제하기보다 root entry를 짧게 유지하는 편이 좋다.

```text
AGENTS.md
  → 공통 workspace identity / 핵심 금지사항
  → 필요 시 role/project Skill 또는 상세 문서 참조

CLAUDE.md
  → Claude-specific runtime override가 꼭 필요한 경우만
```

### Perforce + Claude/Codex Harness 적용

- `ResumeEnvelope`에 `tool_catalog_hash`, `attachment_set_hash`, `stable_prefix_hash`, `capability_generation` 추가.
- resumed Worker/Reviewer가 tool schemas를 다시 materialize해야 하는지 behavioral hash로 판단.
- `task_id` 단위 비용에 router/classifier 비용을 분리 기록.
- root `AGENTS.md`는 공통 최소 규칙만 두고, UE/Perforce/build/review 지침은 progressive-disclosure Skill로 분리.

### Trade-off

Server-side routing은 비용상 유리할 수 있지만 선택 logic이 provider 내부에 있어 자체 routing experiment의 재현성이 낮아질 수 있다. 내부 benchmark에서는 server/client routing arm을 구분해서 기록하는 게 좋다.

**평가: 🟢 Resume serialization / routing telemetry는 바로 적용. `AGENTS.md` 공통 bootstrap은 짧은 PoC 후 적용.**

Sources:
- https://github.com/anthropics/claude-code/releases/tag/v2.1.277
- https://github.com/anthropics/claude-code/releases/tag/v2.1.278

---

## 2. Codex — Compaction을 active turn 도중이 아니라 `turn boundary maintenance`로 실행

Codex main의 2026-09-19 반영 commit `#46541`은 `model_post_turn_compact_threshold_percent`를 추가했다.

### 무엇이 새로워졌나

- 0~100% threshold를 지정해 **final response가 끝난 뒤** context usage가 일정 수준에 도달했을 때 compaction을 실행한다.
- `0` 또는 미지정이면 비활성화된다.
- pending input이 있거나 turn이 cancel된 경우에는 실행하지 않는다.
- token-budget mode에서는 실행하지 않는다.
- approval reviewer에서는 approval 응답을 지연시키지 않도록 비활성화한다.
- `PostTurn`을 별도 analytics phase로 기록한다.
- compact summary가 성공적으로 생성되고 non-empty assistant summary가 확인된 경우에만 history를 교체한다.
- PostTurn compaction 실패는 이미 완료된 사용자 turn을 실패 처리하지 않는다.

### 왜 중요한가

기존 compaction은 흔히 context overflow 직전 또는 active reasoning 중간에 발생한다. 이 방식은 latency와 state complexity를 증가시킨다.

새 패턴은 다음과 같다.

```text
Active Turn
  Edit → Tool → Test → Final
                    ↓
              Turn Completed
                    ↓
       context pressure high?
             ├─ no → idle
             └─ yes
                 ↓
         opportunistic compact
                 ↓
      atomic summary promotion
```

즉 **작업이 멈춘 자연스러운 경계에서 maintenance**를 수행한다.

### 토큰 절감 원리

현재 turn 비용을 줄이는 게 아니라 다음 turn이 오래된 context를 그대로 재전송하는 것을 예방한다. 특히 장기 coding session에서 `next turn`의 cache/context 비용을 낮추는 방식이다.

정량 절감률은 공개되지 않았다.

### Perforce Harness 적용

우리 환경에서는 하나의 Worker slice 또는 검증 단계가 끝났을 때만 compact 후보로 삼는 것이 적합하다.

```text
Slice completed
  ├─ p4 opened snapshot
  ├─ test/build evidence committed
  ├─ handoff cursor committed
  └─ no pending user input
          ↓
Context pressure gate
          ↓
Compact projection
```

Raw event ledger는 그대로 유지하고, compact된 working context만 derived snapshot으로 갱신한다.

PoC metric:

- `compaction_phase`
- compact 전/후 model-visible tokens
- 다음 turn cache-read/cache-create tokens
- compaction model cost
- rehydration 횟수
- next-turn latency
- task success / retry

Threshold를 임의로 80%처럼 고정하기보다 60/70/80/90 등의 arm을 실제 task set에서 비교하는 편이 좋다.

**평가: 🟡 자동 threshold는 PoC. `turn boundary maintenance + atomic promotion + raw ledger 보존` 원칙은 바로 적용.**

Source:
- https://github.com/openai/codex/commit/49e248d4c3ad76fc29519bd0aa9e532f448fa90f

---

## 3. Codex — Context Build 자체도 작업 종류에 따라 달라야 한다

같은 시점의 Codex commit `#46546`은 history item을 기존 thread에 주입할 때 host Skill discovery를 수행하지 않도록 context build mode를 분리했다.

### 구현 구조

Codex는 context 준비를 세 종류로 나눴다.

```text
Full
  model/multi-agent metadata
  + normal Skill discovery
  → 실제 execution / 초기 context

StartupPrewarm
  startup resource 준비
  + Skill discovery
  - shared runtime metadata overwrite 없음

InjectItems
  recording metadata
  - Skill discovery
  - execution step capture 금지
  → history/evidence item injection 전용
```

이미 초기화된 thread에 response/history item을 기록하는 데 Skill catalog를 다시 스캔하는 것은 실제 reasoning이 발생하지 않으므로 불필요하다는 판단이다.

Compaction 때문에 reference context가 사라져 초기화가 필요한 경우에는 다시 `Full` context로 fallback한다.

### 토큰/컨텍스트 절감 원리

Skill discovery 자체는 host-side 작업일 수 있지만, discovery 결과가 prompt/tool catalog materialization이나 dynamic context generation을 일으키면 cache churn과 metadata 비용으로 이어진다.

핵심은 **모든 상태 변경이 Execution Context를 필요로 하지는 않는다**는 점이다.

### 내부 Harness에 적용할 API 분리

다음 작업들은 `HistoryOnlyContext` 또는 `LedgerContext`로 처리할 수 있다.

```text
append_event
attach_evidence
inject_handoff_annotation
record_review_result
restore_transcript
persist_usage
```

반면 아래에서만 `ExecutionContext`를 materialize한다.

```text
run_model_step
invoke_tool
start_subagent
perform_review
```

권장 구조:

```text
ContextBuildMode
  ├─ Execution
  ├─ Prewarm
  ├─ HistoryOnly
  └─ ReviewOnly(optional)
```

`HistoryOnly`에서는 Skill/MCP/RAG discovery를 호출하지 않는다. 이 구조는 현재 계획 중인 durable event ledger와 특히 잘 맞는다.

### Perforce 적용

`p4 opened` snapshot이나 TeamCity evidence를 DB/ledger에 저장할 때 Claude/Codex Skill catalog를 다시 구성할 이유가 없다. 다음 reasoning step이 시작될 때만 workspace generation과 capability policy를 확인하고 Execution Context를 만든다.

**평가: 🟢 바로 적용. 구현량 대비 Context churn과 불필요 discovery를 줄일 가능성이 높다.**

Source:
- https://github.com/openai/codex/commit/7e0463b568f8506f61b58ca46dcb1846e06ba31c

---

## 4. SoL-Pi — 이번 주 가장 강한 정량 Token Optimization 결과

NVIDIA의 `NVlabs/SoL-Pi`는 2026-09-17 공개된 연구/오픈소스 Harness extension이다. Pi를 수정하지 않고 public extension API 위에 네 가지 효율화 메커니즘을 조합한다.

논문은 51-task EdgeBench에서 GPT-5.6 Sol과 Opus 5를 사용했을 때 원본 Pi와 유사한 성능을 유지하면서 **recorded token traffic을 44.7~49.0% 줄이고 API cost를 약 1/3 줄였다**고 보고한다. 논문 추정 hourly saving은 native Codex/Claude Code harness 대비 `$8.75~$13.50`, Pi 대비 `$4.36~$5.71`이다.

### 4개 메커니즘

#### A. Action Fusion

파일 edit/write 뒤에 거의 항상 이어지는 validation command를 **같은 Tool call 안에서 실행**한다.

```text
기존
Edit
 → model turn
 → test/compile command
 → result

Fusion
Edit + follow-up validation
 → one tool result
```

불필요한 모델 turn과 repeated prefix를 제거한다.

Perforce 환경에서는 다음 조합이 후보가 된다.

```text
edit source
+ targeted compile/test
+ p4 diff summary
```

단, arbitrary shell을 자동 붙이는 것이 아니라 allow-listed validation recipe만 fusion하는 편이 안전하다.

#### B. ObservationPack

반복해서 등장하는 큰 text Tool result를 stable handle로 바꾸고 원문은 local archive에 저장한다. 모델은 preview와 handle만 보고 필요할 때 exact paged recall을 수행한다.

이는 TeamCity/UE build log, `p4 describe`, large test output에 바로 매핑 가능하다.

```text
ObservationHandle
  artifact_id
  content_hash
  source_step
  total_bytes
  preview
  page contract
```

#### C. Evidence-Preserving Reducer

긴 diagnostic log를 LLM으로 줄일 때 retained quotation이 archived original에 실제 존재하는지 확인한다. Reducer가 실패하면 압축 결과를 사용하지 않고 원본을 유지한다.

단순 summary보다 **evidence-grounded receipt**에 가깝다.

#### D. Online Context Compact

완료된 plan step을 compaction 후보점으로 사용하되 window pressure와 cache economics를 함께 본다. 성공적으로 compact한 뒤 새 turn에서 작업을 계속한다.

SoL-Pi의 `cacheWriteReadRatio`는 가격 청구 자체를 추정하는 값이 아니라 compaction 의사결정에 사용하는 경제성 parameter다.

### 구현·검증 수준

Repository는 네 기능을 각각 extension module로 분리하며 `action-fusion`, `observation-pack`, `evidence-preserving-reducer`, `online-context-compact`가 opt-in이다. 보수적 설정은 추가 model call이 없는 `Action Fusion + ObservationPack`만 활성화한다.

Compatibility 문서는 Pi 0.85.1과 0.84.2에서 **19개 test file / 140 tests**, type check, package inspection, public API check, offline extension startup을 통과했다고 명시한다.

또 prompt/skill 경량화 측면에서 root `AGENTS.md`와 `CLAUDE.md`에는 짧은 bootstrap만 두고 실제 설치/검증 절차의 SSoT는 `agents-install.md` 한 파일에 둔다. 즉 runtime별 entry point는 작게 유지하고 executable guidance를 한 곳에 모은다.

### Trade-off / Caveat

- EdgeBench 51 tasks라는 제한된 evaluation이다.
- `recorded token traffic`이 모든 provider에서 billable input token과 동일한 의미는 아니다.
- Evidence reducer와 online compaction은 추가 model call을 발생시킬 수 있다.
- Observation recall machinery가 모든 task에서 필요하다는 보장은 없다.

### Perforce + Claude/Codex Harness 적용 우선순위

1. **Action Fusion**: edit 후 deterministic targeted validation을 같은 execution step에 묶기.
2. **ObservationPack**: build/test/p4 대형 출력은 content-addressed handle + exact retrieval로 변경.
3. **Reducer**: build failure summary는 archived original과 quote/evidence 검증 후만 채택.
4. **Economic Compaction**: plan/slice completion 시 window pressure + cache economics로 compact 여부 결정.

**평가: 🟢 Action Fusion/ObservationPack 패턴은 바로 적용 가치 높음. 전체 SoL-Pi 방식은 🟡 PoC 가치 매우 높음.**

Sources:
- https://github.com/NVlabs/SoL-Pi
- https://arxiv.org/abs/2609.20519
- https://github.com/NVlabs/SoL-Pi/blob/main/docs/compatibility.md
- https://github.com/NVlabs/SoL-Pi/blob/main/agents-install.md

---

## 5. `An Empirical Study of Harness Design for Coding Agents` — Recoverable Context가 항상 이득이라는 가정에 반례

2026-09-17 공개된 이 연구는 Harness 전체를 비교하지 않고 execution loop를 고정한 뒤 `planning`, `action space`, `context management`만 바꿔 비교했다.

### 실험 규모

- 4개 model
- SWE-Bench Verified + Terminal-Bench 2.1
- 176 matched settings
- 5가지 context-management 전략
- 4가지 context-window budget
- planning/action-space ablation

### 핵심 결과

#### 1) Context management의 가장 큰 가치는 `더 똑똑한 기억`보다 overflow 방지

Context budget이 작아질수록 context management의 가치가 커졌고, 상당 부분은 context-overflow failure를 막아서 생겼다.

즉 복잡한 memory architecture를 만들기 전에 **hard overflow와 runaway history를 안정적으로 제어하는 것**이 우선이다.

#### 2) `Rule-based elision → 필요 시 LLM summary`가 가장 효율적

처음부터 모든 오래된 context를 LLM으로 요약하기보다 deterministic한 rule-based elision을 먼저 적용하고, 그래도 필요한 경우에만 summary를 수행하는 staged 방식이 가장 좋은 efficiency를 보였다.

이는 내부 Harness에 다음 순서를 제안한다.

```text
1. deterministic drop/elide
   - duplicated logs
   - stale success output
   - known low-value episodic data

2. compact representation
   - diff outline
   - error receipt

3. LLM summarization
   - semantic state가 꼭 필요한 경우만
```

#### 3) Recoverable elision machinery는 모델이 거의 사용하지 않았고 정확도 개선도 없었다

이 결과는 지금까지 Trend에서 반복한 `원문 pointer를 남겨 필요하면 expand` 패턴에 중요한 보정이다.

원본은 **durable evidence store에 보존**하되, 모든 elided item에 model-visible expansion tool을 제공할 필요는 없다는 뜻이다.

권장 분류:

```text
Retrieval exposed
  사용자 요구사항
  failing test evidence
  핵심 diff
  architecture decision
  아직 unresolved인 log

Archive only
  반복 성공 log
  오래된 탐색 noise
  이미 deterministic하게 소모된 출력
```

즉 `durable recoverability`와 `model-facing recoverability`를 구분해야 한다.

#### 4) Planning과 Tool surface는 모델 능력에 따라 달라야 한다

- weaker model에서는 planning이 accuracy scaffold 역할을 했다.
- stronger model에서는 accuracy 변화는 작고 주로 cost를 줄였다.
- shell/bash 숙련도가 낮은 model은 predefined tool의 도움을 받았다.
- shell에 강한 model은 bash-only interface로도 잘 동작했고 CLI 중심 task에서는 상당히 낮은 cost를 보였다.

이는 `모든 Agent에 많은 structured Tool을 제공`하는 전략보다 model/role-aware capability surface가 필요하다는 뜻이다.

### Perforce Harness용 실험 제안

같은 task/model을 고정하고 다음 3개 context policy를 A/B/C로 비교할 가치가 있다.

```text
A: deterministic elision only
B: deterministic elision + model-visible expand
C: deterministic elision + selective LLM summary
```

측정:

- solve rate
- provider input/output/cache tokens
- turns / solved task
- context overflow count
- expansion tool usage count
- summary calls / cost
- reread ratio
- build/test correctness

또 Claude/Codex 역할에 따라 planning/tool profile을 고정하지 말고 실제 benchmark로 선택한다.

**평가: 🟢 `elision first`, `durable vs model-visible recovery 분리`, `model-aware tool surface`는 바로 적용 설계 원칙. 내부 수치 검증은 🟡 PoC.**

Source:
- https://arxiv.org/abs/2609.20804

---

## 오늘의 통합 결론

오늘 결과는 기존 Trend의 `Progressive Disclosure + Durable Evidence` 방향을 조금 더 정교하게 만든다.

```text
                  Durable Ledger / Artifact Store
                            │
               ┌────────────┴────────────┐
               │                         │
         Archive-only Evidence     Retrieval-worthy Evidence
               │                         │
               └────────────┬────────────┘
                            ▼
                  Deterministic Elision
                            │
                  Selective Representation
                            │
             ┌──────────────┴──────────────┐
             │                             │
       HistoryOnly Context           Execution Context
       no Skill/RAG/MCP              role/model-aware capability
             │                             │
             └──────────────┬──────────────┘
                            ▼
                      Active Agent Turn
                            │
                Action + Validation Fusion
                            │
                       Final Response
                            │
                  Post-Turn Maintenance
                   compact only if useful
```

현재 Perforce + Claude Code + Codex Harness에서 구현 우선순위를 정하면 다음과 같다.

1. **HistoryOnly vs Execution Context 분리** — ledger/evidence 기록에는 Skill/MCP/RAG discovery 금지.
2. **Action Fusion** — edit 이후 deterministic targeted build/test를 같은 execution step에 묶기.
3. **Observation handle** — UE/TeamCity/p4 대형 출력의 content-addressed archive + 작은 preview.
4. **Deterministic elision first** — LLM summary 전에 low-value context를 규칙 기반으로 제거.
5. **Model-facing retrieval 선별** — 모든 archive를 expand 가능하게 만들지 말고 실제 reread 가치가 있는 evidence만 노출.
6. **Post-turn compaction** — slice가 완료된 안전한 경계에서만 pressure/economics 기준으로 실행.
7. **Routing telemetry** — router 자체 비용/위치/fallback까지 task cost에 귀속.

한 문장으로 정리하면:

> **이제 Context Optimization의 핵심은 '모든 정보를 나중에 다시 읽을 수 있게 압축'하는 것이 아니라, reasoning이 필요한 순간에만 full capability를 만들고, deterministic하게 버릴 수 있는 것은 먼저 버리며, 실제로 재조회 가치가 있는 evidence만 model-facing retrieval로 남기는 것이다.**

## 이번 조사에서 확인했지만 별도 핵심 항목으로 올리지 않은 것

- Token Optimizer MCP는 `v7.2.0`이 공개됐지만 이번 변경의 중심은 OrcaRouter credential/login 및 live model discovery와 dashboard security hardening으로, 전일 `v7.1`의 token/context 실험을 넘어서는 신규 정량 결과는 확인하지 못해 반복하지 않았다.
- OpenHands 최신 release의 Agent Profile secret scoping은 이미 9/17 Trend에서 capability profile 방향으로 다뤘으므로 재수록하지 않았다.
- Deep Agents 최근 Talon/MCP 2 변경 중 protocol-error data를 model context에서 제외하는 패턴은 유용하지만, 오늘 보고서의 `HistoryOnly/Execution Context` 및 audit/context 분리 원칙의 연장선이라 별도 항목으로 승격하지 않았다.
