---
title: AI Harness Token Scout - 2026-09-15
category: trend
tags:
  - ai
  - harness
  - context-engineering
  - token-optimization
  - orchestration
  - evidence
  - codex
  - copilot
updated: 2026-09-15
---

# AI Harness Token Scout - 2026-09-15

> 오늘의 핵심은 **반복 Review에는 전체 대화를 다시 보내지 않고 검증된 delta만 동기화하고, 출력 압축은 의미 종류별로 다르게 적용하며, 모델 선택 자체를 Single/Cascade/Critique 실행 정책으로 확장하는 방향**이다.

## 조사 범위와 중복 제외

`ai/trend/`의 2026-09-10~14 보고서를 기준점으로 확인했다. 이미 다룬 Strands Context Manager/preset, Token Optimizer MCP, CCompactor, Docket 초기 버전, Codex의 model-visible token accounting·budget admission·bounded recap·cache affinity·audit/context 분리·step attribution 등은 반복하지 않았다.

Claude Code의 최신 공개 release는 확인 기준 `v2.1.270`으로, 전일 보고서 이후 Harness/Token 관점에서 별도 신규 stable release는 확인되지 않았다. Codex는 `0.155.0-alpha.4` prerelease가 2026-09-14 공개되었고, 아래 Codex 항목은 주로 같은 날 `main`에 병합된 구현을 분석한 것이므로 stable contract로 단정하지 않는다.

새로 생성된 harness 저장소도 확인했지만, 단순 seed/template 수준이거나 검증 데이터가 없는 프로젝트는 이번 핵심 항목에서 제외했다.

## 오늘의 핵심 발견

| 항목 | 신규성 | 핵심 | 평가 |
|---|---|---|---|
| Codex Guardian incremental context | 2026-09-14 main | Full/Delta transcript + cursor + committed checkpoint + reset lineage | **바로 적용 / PoC** |
| Codex background persistence | 2026-09-14 main | 안전한 상태는 inference와 persistence 중첩, tool output은 durability barrier 유지 | **PoC** |
| Docket v0.0.5 | 2026-09-14 | Evidence claim에 `contact_basis` 추가, 관찰 불가능한 상태 제거 | **바로 적용 / PoC** |
| GitHub Copilot cost-efficiency 실험 | 2026-09-02 공식, 기존 Scout 누락 | selective output compaction, formatting 제거, prompt behavior eval, retrieval-turn 제거 | **바로 적용** |
| Project HydraFusion | 2026-09-04 공식, 기존 Scout 누락 | Single/Cascade/Critique adaptive routing + complete cost accounting | **PoC 가치 매우 높음** |

---

## 1. Codex Guardian - Reviewer Context를 전체 Replay가 아닌 Versioned Delta Sync로

OpenAI Codex `main`의 9월 14일 변경은 반복 review를 위한 context 전달을 별도 subsystem으로 구체화했다.

`TranscriptMode::select`는 reviewer가 이전에 확인한 transcript 위치를 `TranscriptCursor`로 기억하고, parent history lineage가 그대로라면 그 이후에 추가된 entry만 `Delta`로 선택한다. history version이 달라졌거나 cursor가 현재 entry 범위를 벗어나면 자동으로 `Full`로 되돌아간다. 중요한 점은 sliding-window/profile retention으로 일부 entry를 실제 prompt에서 생략하더라도 cursor는 **수집된 전체 entry 수**를 기준으로 전진한다는 것이다.

또 `ConversationState`와 `ConversationCheckpoint`를 분리해 review 중의 live progress와 외부에 상속 가능한 committed snapshot을 구분한다. fork reviewer는 마지막으로 commit된 history/cursor/review count를 상속하며, 완료되지 않은 review의 임시 상태는 다음 reviewer에 전파하지 않는다.

별도 변경에서는 summary 없이 parent history를 파괴적으로 reset했을 때 과거 reviewer rationale이 재사용되는 것을 막기 위해 `reset_version`을 추가했다. 일반 input과 compaction은 reset lineage를 유지하지만 destructive history replacement는 새 reviewer session을 요구한다.

```text
Parent Task History
      │
      ├─ history_version
      ├─ reset_version
      └─ collected events
              │
              ▼
       Review Checkpoint
       cursor + count + snapshot
              │
      ┌───────┴────────┐
      │ same lineage   │ reset / mismatch
      ▼                ▼
   DELTA only        FULL sync
      │                │
      └───────┬────────┘
              ▼
          Reviewer
              │
       successful review
              │
              ▼
      commit checkpoint
```

### Token/Context 효과

반복 reviewer 호출이 `전체 과거 context + 신규 변경`이 아니라 `신규 event delta` 중심으로 움직일 수 있으므로 장기 작업에서 context 재전송량을 구조적으로 줄일 수 있다. 다만 이 변경에 대한 공식 token 절감률 benchmark는 공개되지 않았다. 절감보다 중요한 점은 **delta 최적화와 correctness fallback을 함께 둔 것**이다.

### Perforce Harness 적용

현재 Pending CL 단위 Review에도 그대로 적용할 수 있다.

```text
review_generation
review_cursor
pending_cl
base_depot_revisions
last_committed_review_snapshot
```

- Worker가 새 edit/test/build evidence를 추가하면 reviewer에는 cursor 이후 event만 전달한다.
- `p4 revert`, base revision 변경, workspace 재동기화, 작업 목표 hard reset처럼 이전 review rationale를 무효화하는 사건은 `review_generation/reset_version`을 올린다.
- 일반 summary/compaction은 generation을 바꾸지 않는다.
- 취소·실패한 review는 cursor를 commit하지 않는다.
- Reviewer fork는 마지막 성공 checkpoint에서만 시작한다.

**평가: 🟢 schema/lineage 원칙은 바로 적용, 자동 delta renderer는 🟡 PoC**

참고:
- https://github.com/openai/codex/commit/b3e0c49dfbc6744cd71a8c36a9ad1840966404e4
- https://github.com/openai/codex/commit/9d036249da5945e6b478f2c0b8b99b49f4a0d005
- https://github.com/openai/codex/commit/99cda7a9a5997c36aff413d42a222bdb5f95c434

---

## 2. Codex - Durable State도 모든 Event를 같은 동기화 Barrier로 처리하지 않는다

또 다른 9월 14일 변경은 active turn 중 새 user steering을 저장할 때 persistence가 다음 model request를 불필요하게 막는 문제를 해결했다.

저장소가 background persistence를 지원하면 `SteeredUserInput` checkpoint는 inference와 저장을 겹쳐 실행할 수 있다. 대신 이후 `flush`/shutdown에서 durability와 error reporting을 보장한다. 반면 function/tool output은 mixed batch 안에 있더라도 계속 synchronous persistence barrier를 유지한다.

이 구분은 내부 Harness의 durable ledger에도 유용하다.

```text
Fast lane - background 가능
- steering / annotation
- non-critical metadata
- progress signal

Durability barrier - sync
- tool side-effect 결과
- build/test evidence
- p4 edit/revert/submit 관련 상태
- reviewer pass/fail checkpoint
```

즉 **durable state = 모든 write 전에 기다린다**가 아니라, 다음 inference가 의존하는 correctness boundary를 기준으로 동기/비동기를 구분한다. 이 변화는 직접적인 token 최적화보다는 latency와 retry 감소를 위한 방법론이다. timeout/retry가 줄면 중복 inference 비용도 간접적으로 줄 수 있지만 공개된 정량 token 수치는 없다.

Perforce Harness에서는 `flush()`를 handoff, review 시작, submit gate, 프로세스 종료 같은 경계에 강제하고, evidence/형상관리 side effect는 해당 turn이 계속 진행하기 전에 commit하는 편이 안전하다.

**평가: 🟡 PoC**

참고:
- https://github.com/openai/codex/commit/b9bfc0aff84de6af4c549f1ae544de569474f5f4

---

## 3. Docket v0.0.5 - Evidence에는 값뿐 아니라 '그 값을 왜 믿는지'가 필요하다

전일 Scout에서 Docket의 per-hunk provenance/evidence 구조를 다뤘는데, 9월 14일 `v0.0.5` 방향에서 중요한 보강이 들어왔다.

이전에는 `human_contact`가 `edited / approved / viewed / none` 같은 상태를 가질 수 있었지만 실제 기록으로 증명할 수 없는 값이 섞여 있었다. 새 구현은 값을 **기록된 event에서 얻을 수 있을 때만** 부여한다.

- `edited`: 해당 hunk line이 이후 edit의 recorded pre-image에서 실제로 달라진 경우.
- `approved`: 그 edit 시점의 Claude Code permission mode 또는 Codex approval+sandbox policy상 permission prompt가 필요한 경우.
- `viewed`: terminal에는 read receipt가 없으므로 제거.
- 기록이 부족한 runtime은 억지 attribution 대신 unknown/none 계열로 남긴다.

더 중요한 변화는 `contact_basis`다. 예를 들어 `approved`는 실제 사람이 diff 내용을 읽었다는 관찰이 아니라 **그 시점 설정상 prompt가 요구됐다는 추론**이므로, 결과와 근거를 함께 노출한다.

### 내부 Evidence Bundle에 적용

`verified=true` 같은 boolean 하나 대신 다음처럼 저장하는 것이 좋다.

```text
EvidenceClaim
  status
  basis
  source_event_id
  observed_at
  strength
```

예:

```text
status = approval_required
basis  = codex: approval=on-request + sandbox=read-only
```

이는 `human_reviewed=true`와 동일하지 않다. 특히 자동화가 커질수록 **관찰한 사실 / 설정에서 추론한 사실 / 모델이 주장한 사실**을 구분해야 reviewer가 evidence의 신뢰도를 제대로 판단할 수 있다.

**평가: 🟢 Evidence schema 원칙은 바로 적용 / Docket 자체는 🟡 PoC**

참고:
- https://github.com/Dillonsmart/docket/commit/107990df34a4d60fb523e7ad239ae9ba21559de1

---

## 4. GitHub Copilot - 'Tool Output를 줄이는 것'보다 Completed Task Cost를 최적화

GitHub가 9월 2일 공개한 Copilot CLI Harness 최적화 실험은 기존 Trend에 없었고, 현재 Perforce Harness의 token 정책을 구체화하는 데 가치가 높아 이번 보고서에 포함했다.

가장 중요한 결과는 **개별 tool call token 수가 좋은 objective가 아니라는 것**이다. GitHub의 실험에서는 shell output을 강하게 축약했을 때 필요한 정보가 빠져 agent가 원본을 다시 열거나 명령을 재실행했고, 평균 task token과 수행 시간이 오히려 증가한 사례가 있었다.

이를 바탕으로 shipped compressor는 output의 의미를 기준으로 정책을 나눴다.

1. `cat`, `git diff`, `git show`, arbitrary script처럼 source-like/임의 출력은 원문 유지.
2. grep/search 결과는 결과를 버리지 않고 grouping/reorganization만 수행.
3. install/build/test/progress처럼 반복 noise가 큰 출력만 충분한 절감 효과가 있을 때 압축.
4. 압축한 경우 전체 원문으로 바로 복구 가능한 경로를 보존하고 recovery 빈도를 quality signal로 측정.

또 파일 read의 모든 줄에 붙던 불필요한 line-number prefix를 제거했을 때 offline model-inference cost가 약 5%, 실제 CLI 사용자 실험에서 일평균 model-inference cost가 약 3% 감소했고 추적한 품질 지표의 유의미한 악화는 없었다.

Prompt 축약도 단순 문장 줄이기가 아니었다. Task-tool prompt를 약 절반으로 줄인 첫 실험은 sub-agent parallelism을 직렬화시키는 regression을 만들었다. 이 behavior를 test로 추가하고 지침을 다시 수정한 뒤, 최종 버전은 turn당 약 1,300 prompt tokens를 제거하고 session 총 prompt token을 약 1.8%, normalized cost/active-hour를 2.9% 줄였다.

Background completion도 결과 없이 '끝났다'는 notification만 보내면 agent가 결과를 가져오기 위해 retrieval-only turn을 추가로 쓴다. GitHub는 완료된 결과를 기존 tool-result 형식으로 notification에 직접 넣고 여러 완료를 batch하여 token-related usage를 약 2.3% 줄였다고 보고한다.

### Perforce/TeamCity 적용 정책

```text
Exact / lossless
- p4 diff
- p4 describe
- source file content
- arbitrary script output

Lossless reorganization
- p4 files
- grep/search result
- opened file lists

Selective compaction
- TeamCity logs
- UE build logs
- test/lint progress
- package/install logs
```

추가로 build/test가 background에서 끝나면 `completed` event만 보내지 말고 핵심 결과와 artifact pointer를 같은 event에 포함해 **결과 조회 전용 model turn**을 없애는 것이 좋다.

KPI도 `tokens/tool-call`보다 `cost/solved-task`, `turns/solved-task`, `recovery_rate`, `rerun_rate`, `quality score`가 적합하다.

**평가: 🟢 바로 적용**

참고:
- https://github.blog/ai-and-ml/github-copilot/how-we-make-ai-coding-more-cost-efficient-without-sacrificing-task-quality/

---

## 5. Project HydraFusion - Model Routing을 Single/Cascade/Critique Workflow Routing으로 확장

GitHub가 9월 4일 공개한 HydraFusion은 단순히 'task에 모델 하나를 고르는 router'보다 한 단계 더 나간 compound runtime이다. 요청마다 capability signal을 보고 세 execution pattern 중 하나를 고른다.

```text
Single
  one model → result

Cascade
  efficient model → quality gate
                    ├─ pass → accept
                    └─ fail → stronger model

Critique
  drafting model → isolated read-only critic
                 → drafting model one revision
```

핵심은 가장 복잡한 workflow를 항상 실행하지 않고 **quality bar를 만족할 가능성이 높은 최소 복잡도 workflow**를 선택하는 것이다.

운영 원칙도 Harness 설계에 직접 참고할 수 있다.

- 모든 draft/critique/revision/escalation/retry/fallback leg의 cost를 합산한다.
- 각 leg에 timeout/cancellation budget을 둔다.
- critic은 tool-less/read-only isolated context에서 실행해 repository를 수정하지 못하게 한다.
- validation 실패나 cancellation 시 incomplete patch를 적용하지 않는다.
- model availability, workflow definition, fallback을 실행 전에 검증한다.
- leg마다 role, outcome, cost, latency, diagnostics를 기록한다.

공식 controlled offline evaluation에서 best tuned configuration은 Opus 5 대비 다음 결과를 보고했다.

| Benchmark | Estimated cost | Verified quality |
|---|---:|---:|
| TerminalBench 2.1 | **67% 낮음** | **+4.9pt** |
| DeepSWE | **36% 낮음** | **-1.5pt** |
| CheckpointBench | **65% 낮음** | **-0.1pt** |

이 수치는 특정 benchmark revision, model pool, pricing, medium reasoning 설정의 offline 결과이므로 그대로 내부 환경의 절감률로 간주하면 안 된다.

### Perforce Harness 적용 PoC

현재 Claude/Codex 역할 분리를 다음처럼 routing policy로 바꿀 수 있다.

```text
Task Classifier
      │
      ├─ easy / deterministic
      │      └─ Single: Claude worker + deterministic gate
      │
      ├─ medium / uncertain
      │      └─ Cascade: 저비용 worker → evidence gate → 필요 시 강한 모델
      │
      └─ risky / broad change
             └─ Critique: worker → read-only Codex critic → one revision
```

Critic에는 write tool을 주지 않고 `Pending CL diff + evidence bundle + requirements`만 전달하면 된다. 무엇보다 retry/escalation을 포함한 **전체 leg cost**를 task 단위로 기록해야 routing이 진짜 절약인지 평가할 수 있다.

**평가: 🟡 PoC 가치 매우 높음**

참고:
- https://github.blog/ai-and-ml/github-copilot/project-hydrafusion-frontier-quality-via-multi-model-orchestration/

---

## 오늘의 통합 설계 제안

```text
                       Task / Pending CL
                              │
                        Durable Ledger
                              │
             ┌────────────────┴────────────────┐
             │                                 │
        Context Lineage                  Evidence Claims
    generation + cursor              status + basis + source
             │                                 │
             └───────────────┬─────────────────┘
                             ▼
                       Workflow Router
                  Single / Cascade / Critique
                             │
                  ┌──────────┴──────────┐
                  │                     │
              Worker Agent       Read-only Reviewer
                  │                     │
                  ├── source/diff: exact
                  ├── search: lossless compact
                  └── logs: selective compact
                             │
                       Evidence Gate
                             │
                  successful checkpoint
                             │
                       Review Cursor ↑
```

## 구현 우선순위

1. **바로 적용** — Tool output을 `exact / lossless-reorganized / selective-compact` 세 정책으로 분류한다.
2. **바로 적용** — `review_generation + review_cursor + committed_review_snapshot`을 도입한다.
3. **바로 적용** — Evidence에 `basis/source/strength`를 추가해 관찰과 추론을 구분한다.
4. **바로 적용** — Background build/test completion에 결과를 직접 첨부해 retrieval-only turn을 제거한다.
5. **PoC** — Cascade: 저비용 worker → deterministic/evidence gate → 강한 모델 escalation.
6. **PoC** — Critique: Worker와 독립된 read-only Codex reviewer → 최대 1회 revision.
7. 모든 실험을 `cost/solved task + turns + recovery/rerun + quality`로 평가한다.

## 결론

오늘 새로 확인한 흐름은 **Context Compression 자체보다 Context Synchronization과 Orchestration Cost가 더 중요한 최적화 계층**으로 올라오고 있다는 점이다.

- 반복 review는 전체 context를 재생하지 않고 cursor 이후 delta를 보낸다.
- history를 파괴적으로 바꾼 경우에는 cache/reviewer context를 과감히 무효화한다.
- output은 길이 기준이 아니라 의미 기준으로 압축한다.
- evidence는 결과뿐 아니라 그 결과가 어떤 관찰에 근거했는지 저장한다.
- 모델 라우팅은 '어떤 모델?'에서 'Single/Cascade/Critique 중 어떤 workflow?'로 확장된다.

현재 Perforce + Claude Code + Codex Harness에는 **Review Cursor + semantic output policy + evidence basis** 세 가지가 가장 낮은 구현 비용으로 바로 가져갈 가치가 높다.
