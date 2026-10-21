---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-16"
date: 2026-10-16
category: trend
tags: [ai-harness, context-engineering, token-optimization, codex, claude-code, deepagents, open-swe, perforce, agent-lifecycle, durable-state]
---

# 2026-10-16 AI Harness · Context/Token Optimization Scout

> **조사 마감:** 2026-10-16 06:00 KST 전후(UTC 2026-10-15 21:00). 새로 검토한 upstream 변경은 주로 **10월 15일 UTC**의 commit/release이다. 공식 GitHub changelog/release, 커밋 diff와 테스트 파일을 우선 확인했다. 정량 수치는 upstream에 근거가 있는 관측만 표기하고 직접 추정 절감률은 작성하지 않는다.

## 조사 범위·중복 제거

- 대상: `openai/codex`, `anthropics/claude-code`, `langchain-ai/deepagents`, `langchain-ai/open-swe`, 기존 `jaywapp/wiki`의 `develop/ai/trend/`, 2026-10-10~15 로컬 Scout 원문.
- 확인 결과: `develop/ai/trend/`에는 2026-10-03까지 canonical Scout가 있고, 10월 14일 및 15일 파일은 `develop`에서 404였다. 누락 파일도 로컬 보고서 원문을 읽어 중복 대조에 포함했다.
- 중복 제외: 10월 15일의 `SummarizationMiddleware.summarizer`, cache-write lifetime 계측, Managed Agent Runtime 전환, async trace parentage; 10월 14일의 speculative compaction, Capability Discovery V2, Tool search 최적화 등.
- **오늘 독립적인 신규 RAG/Context Compression 실측 벤치마크 확인: 없음.** 구현 이력과 성능 관측을 정량 성과로 혼동하지 않았다.

## 한눈에 보기

| 분류 | 신규로 확인한 구현/릴리스 | 토큰·비용의 직접성 | 평가 |
|---|---|---|---|
| Skills/Hooks·Telemetry | Claude Code **2.1.301**: `tool_decision`의 classifier/permission 분리, watchdog 제한, compact/model-switch 회귀 수정 | 비용 계측·실패 비용 방지(절감률 미공개) | **바로 적용** |
| Tool schema 측정 | Codex **#54133**: Tool별 incremental 변경·description byte histogram | **직접 측정** | **바로 적용** |
| Progressive disclosure | Open SWE **#4111/#4118**: 약 400개 통합 Tool의 직접 schema 대신 code-mode 접근, 직접/코드 양쪽 접근 Tool은 구분 | schema 입력 축소 가능(실측 절감률 미공개) | **PoC 우선** |
| Sub-agent Cache | Open SWE **#3893**: fork 시 동일 Tool 순서·모델 인스턴스·effort 유지, 실행 시 권한 차단 | cache prefix 재사용 가능(적중률 미공개) | **PoC 우선** |
| Tool output pruning | Deep Agents **0.7.26/#6968**: Offload된 결과의 실제 저장 경로 반환 | 재조회 실패·중복 출력 방지 | **바로 적용** |
| Evidence provenance | Codex Guardian **#54281/#54264**: 합성 summary의 assistant 귀속·실패한 리뷰 입력의 admission 추적 | evidence 중복·권한 오인 방지 | **바로 적용** |
| Approval/Review | Codex **#54263**: 샌드박스 밖 권한 상승 재시도는 새 Guardian 승인 | 잘못된 승인 캐시 재사용 방지 | **바로 적용** |
| Durable Handoff | Codex **#54414**: 살아 있는 child가 있어도 root 중단·writer flush 뒤 이동 가능 | 불필요한 root 재실행 감소 가능 | **PoC** |
| Human-gated async child | Deep Agents **0.7.26/#6842**: `waiting` 상태와 `parent_thread_id` 메타데이터 | 잘못된 완료 판정·중복 복구 방지 | **바로 적용 원칙 / PoC** |
| Task lifecycle | Open SWE **#4127**: interrupted run의 열려 있던 Turn을 `turn.interrupted` 이벤트로 종결 | 잘못된 running 상태 비용 차단 | **바로 적용** |
| Runtime adapter | Open SWE **#4100/#4120**: 실행 기한과 HTTP timeout 분리, 결과 미확인 작업 replay 금지 | 실패·중복 명령 비용 차단 | **바로 적용** |
| Persistent state | Codex **#54369**: SQLite `BEGIN IMMEDIATE` + 최대 2회 busy 재시도(100/200ms) | duplicate ledger/update 방지 | **바로 적용** |
| Access control | Open SWE **#4110**: Direct Agent Server mutation은 backend credential에만 허용 | 보안·소유권 검증, 직접 토큰 절감 없음 | **바로 적용** |

## 1. Claude Code 2.1.301 — Tool 정책 결정을 구분해 비용/실패를 계측

**신규성:** 2026-10-15 19:22 UTC 공개된 **v2.1.301**은 OpenTelemetry `tool_decision`에 `classifier_verdict`, `permission_mode`를 추가하고, Tool detail 로깅을 켜면 `classifier_category`도 기록한다. 무인 retry watchdog의 사용량 제한 대기 상한(`CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS`)을 추가했다. Grep/Glob이 내부 실패했을 때 빈 검색결과로 속이지 않으며, 모델을 더 작은 Context Window로 바꿀 때 이전 모델로 먼저 요약하는 경로와 gateway에서의 반복 compaction 오류도 고쳤다. Skill/Hook argument placeholder는 이름 수 최대 **64개**, 이름 길이 최대 **64자**로 제한해 폭증 비용을 방지한다. Workflow agent가 스텝을 건너뛰어도 성공으로 보고하던 사례도 수정했다.

**내부 동작·효과:** classifier가 거절한 Tool과 ACL/승인 mode가 막은 Tool을 분리해 `tool_denials_by_reason`, `retry_token_after_denial`, `model-switch_compaction_count`를 계산한다. 이는 직접 토큰 절감 기능이 아니라 **무의미한 재시도/재압축의 비용을 찾아내는 관측 기반**이다. 사용자 문자열을 포함한 OTel 상세 로그에는 개인정보·기밀 유출 우려가 있으므로 기본 비활성/민감정보 마스킹을 권장한다.

**Perforce 적용:** `ToolDecisionReceipt(decision_source, policy_generation, runtime_id, permission_mode, classifier_category, operation_id)`로 분리한다. `p4 submit`, `p4 unshelve`, `tc.build` 실패/승인 거절을 반드시 별도 코드로 보고하고, 모델 교체 전 `baseline/model/window` 일치 여부를 검사한다. Skill 인수 폭발은 별도 validator로 차단한다. **평가: 바로 적용.**

**근거:** [Claude Code v2.1.301 release](https://github.com/anthropics/claude-code/releases/tag/v2.1.301), [공식 CHANGELOG](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md).

## 2. Codex #54133 — Schema 절감 효과를 Tool별 bytes로 측정

**신규성:** 기존 `tools_change_count`의 후속이며, incremental Tool transition에 `codex.tools.incremental_updates{action,tool}` 태그를 추가했다. 교체된 description의 UTF-8 크기를 `codex.tools.spec_description_bytes` histogram으로 기록하고, initial catalog·namespace header는 제외한다. 전체 namespace 제거는 구성 Tool별로 계수한다. 로그 histogram 경계는 약 1 MiB까지 확장된다.

**구현/검증:** `codex-rs/core/src/context/world_state/top_level_tools.rs`, `codex-rs/otel/src/metrics/names.rs`, `top_level_tools_tests.rs`, `scenarios_incremental_tools.rs`. 모델이 실제로 받는 Tool 스펙 delta를 단순 Tool 수가 아닌 **설명 byte 수**로 비교할 수 있다. 다만 UTF-8 byte는 provider token 수와 다르므로 tokenized prompt와 교차 검증해야 한다.

**Perforce 적용:** `tool_schema_bytes_by_name`, `schema_change_count`, `cache_read_tokens`, `schema_discovery_turns`, `cost/verified_task`를 같은 ModelCallReceipt에 결합한다. `p4 describe`/TeamCity 툴의 description을 짧게 바꾸되 인자 validation 실패율도 본다. **평가: 바로 적용.**

**근거:** [Codex #54133](https://github.com/openai/codex/commit/348ef773eec1a42d6b3cede64a50aeb3e0448e71).

## 3. Open SWE #4111/#4118 — ~400개 통합 Tool을 Code Mode 뒤로, 필수 도구는 직접/코드 양쪽

**신규성:** Managed Deep Agents에서 연결된 integration Tool 약 **400개**를 매 모델 요청의 schema로 내보내던 동작이 일부 모델의 빈/incomplete response를 유발해, integration Tool 대부분을 `eval` 안의 `tools.*` 호출로 숨겼다. 후속 변경은 `code_only`/`also_from_code` catalog 두 경로를 구별한다. 메인 경로는 **16개 핵심 Tool**(파일·shell·task·eval·reply·web 등)은 직접 노출하되, 자주 쓰지 않는 Tool은 Code Mode에서만 접근하도록 했다.

**내부·안전성:** `openswe/middleware/code_mode.py`, `openswe/server.py`, `mda/agent.py`, `mda/rt/backend.py`, `openswe/remote_runtime/graph.py`. Guard 적용 누락 위험이 있다. Hosted MDA는 Code Mode 호출을 backend tool node로 통과시켜 guard를 보존한다. 반면 in-process 실험 경로는 shell execute가 기존 guard를 우회할 수 있어 해당 Tool의 Code Mode 실행을 허용하지 않는다. **단순히 Tool schema를 숨기고 JS/Python 우회 경로를 여는 것은 금지.**

**토큰/품질:** 생략한 schema가 prompt prefix 입력을 줄일 수 있다. 그러나 별도 `eval` 코드 작성과 discovery turn, result envelope decoding으로 총 토큰이 늘 수도 있다. 업스트림의 ~400개는 Tool 수 관측이지 검증된 절감률이 아니다.

**Perforce PoC:** direct arm(A: core + p4 tools)과 selective arm(B: core 12~16개 + p4/TeamCity Code Gateway)를 동일 30개 작업으로 비교. Guard 미통과 shell/submit 호출 **0건**, verified success/total tokens/cached tokens/Tool schema bytes/재조회·실패율을 함께 기록. **평가: PoC 우선.**

**근거:** [Open SWE #4111](https://github.com/langchain-ai/open-swe/commit/98337e7982982a58b49c24733784630c856c754e), [Open SWE #4118](https://github.com/langchain-ai/open-swe/commit/ee9f839192cc9de194509b0b1842c93db8819b9e).

## 4. Open SWE #3893 — Fork Context의 Prefix는 Tool 순서와 Reasoning Effort까지 동일해야 함

**신규성:** 이전 Scout의 Deep Agents `fork/isolated` 소개와 달리, 이번 변경은 **같은 모델을 쓰는 fork에서 캐시가 왜 깨지는지** 실제 구현으로 다뤘다. Child가 Parent conversation을 replay해도 Child Tool Schema가 필터링·재정렬되고 reasoning effort가 달라지면 cache-relevant prefix가 다르다. Fork는 Parent의 ordered application Tool을 유지하고, 동일 모델이면 동일 인스턴스/effort를 사용한다. 금지된 Tool은 **실행 시점의 guard**에서 차단한다. 다른 모델에는 별도 설정을 유지하며 캐시 공유는 기대하지 않는다.

**구현/검증:** `openswe/server.py`의 `_SubagentToolGuard`, `tests/agent/test_agent_assembly_context.py`, `test_agent_integration_tools.py`, `docs/CUSTOMIZATION.md`. 로컬에서 PostgreSQL 의존 테스트는 돌리지 못했다고 PR 자체가 명시한다.

**Trade-off:** prefix/cache hit는 개선될 가능성이 있지만, Child에게 실제 접근 못 하는 Tool의 스키마가 보이는 UX 문제와 prompt injection/guard drift가 있다. Reviewer는 capability 권한을 Parent에게서 그대로 상속하면 안 된다.

**Perforce PoC:** parent research → fork child summary와 isolated child를 비교. `stable_prefix_hash`, `effective_model`, `effort`, `tool_order_hash`, cache-read, forbidden-call-denied, cost/success를 측정. 권한은 모델 노출과 별개로 `CapabilityPreflight` + runtime guard로 검증한다. **평가: PoC 우선.**

**근거:** [Open SWE #3893](https://github.com/langchain-ai/open-swe/commit/52fae7bbe02716464087c01898c771d906a5434a).

## 5. Deep Agents 0.7.26/#6968 — Tool Output을 외부화했다면 실제 경로를 모델에 알려야 함

**신규성:** oversized ToolMessage를 외부 파일로 offload할 때 원래 요청 경로를 그대로 안내하면 Backend가 경로를 재작성한 경우 재조회가 실패한다. `CompositeBackend`는 routing에서 경로를 실제로 바꿨을 때만 `WriteResult.path`를 재설정하고, eviction message는 `result.path`가 있으면 **실제 반환된 경로**를 링크로 사용한다. Sync/async, direct/default/routed Backend와 resolved-path 존재/부재에 대한 테스트가 포함됐다.

**구현/검증:** `libs/deepagents/deepagents/backends/composite.py`, `middleware/_message_eviction.py`, `tests/unit_tests/test_artifacts_root.py`. 2026-10-15 공개된 **deepagents 0.7.26** 릴리스에 포함.

**원리/위험:** 긴 Build/Perforce 로그 원문을 모델 Context에서 제거하고 짧은 상태/파일참조로 교체할 때 **검증 가능한 retrieval 주소**가 핵심이다. 실제 경로가 보존되지 않으면 짧게 만든 Tool 결과가 업무 실패를 일으킨다. storage retention·ACL·hash가 없으면 외부화 자체가 Evidence 보존을 보장하지 않는다. **평가: 바로 적용.**

**Perforce:** `ToolResultOffloadReceipt(logical_path, resolved_path, sha256, bytes, read_acl, storage_generation)`를 저장하고 head/tail + error summary + ref만 모델에 전달. “오류 없음” 판정 전 원문 조회 가능한지 자동 검증한다.

**근거:** [Deep Agents release 0.7.26](https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.26), [#6968 diff](https://github.com/langchain-ai/deepagents/commit/29d646fd2d832a44c476964333eddecb0ec1c0cd).

## 6. Codex Guardian #54281/#54264 — Summary Role과 Reviewer Input Admission을 별도 보존

**신규성:** (1) Compaction summary가 wire format에 `user`로 저장돼도 `compaction.summary` metadata가 있다면 Reviewer transcript에서는 **assistant-generated evidence**로 귀속시킨다. 합성된 summary 텍스트를 사용자 승인으로 착각하지 않도록 한다. (2) Guardian inference가 실패했어도 요청 입력이 재사용 가능한 session에 들어갔다면 `admitted_transcript_cursor`를 전진시켜 같은 Evidence를 다시 투입하지 않는다. 하지만 Review는 완료로 간주하지 않고 committed fork checkpoint도 갱신하지 않는다. 요청이 모델에 전달되기 전 실패라면 cursor를 전진시키지 않는다.

**구현/검증:** `codex-rs/guardian-context/src/transcript.rs`, `guardian-context/.../transcript_tests.rs`, `codex-rs/ext/guardian-reviewer/src/conversation.rs`, `core/src/guardian/review_session.rs`, `core/tests/suite/guardian_retry.rs`. line/JSON 양식과 failure/compaction retry 테스트를 확인했다.

**Perforce:** `EvidenceRecord(origin_actor=user|assistant|tool, authority=user_authorized|derived, transcript_admitted, review_completed, checkpoint_committed, evidence_hash)`를 분리한다. 예컨대 요약문에 “submit 승인됨”이 있어도 원래 승인 영수증 없는 한 승인으로 간주하지 않는다. **평가: 바로 적용.**

**근거:** [Guardian #54281](https://github.com/openai/codex/commit/3ee47c10513f1bb57d869ea650aba28638e3d11c), [#54264](https://github.com/openai/codex/commit/b687844674bdd8c800f342089c0fae2ae2a96447).

## 7. Codex #54263 — 재시도의 권한이 바뀌면 재승인

**신규성:** Sandbox에서 허용된 원래 명령을 샌드박스 외부에서 재시도할 때, 기존 Guardian 판정이 더 큰 권한까지 승인하는 오류를 막는다. 최초 승인 경로를 추적하고 `RequireEscalated`로 다시 검토하며 retry의 실제 permission 기준으로 캐싱한다. 기존 사용자/Hook 승인 동작은 유지한다.

**Perforce:** `ApprovalReceipt(action_hash, authority_scope, sandbox_policy, permission_generation, attempt, reviewer_verdict)`를 사용한다. `p4 changes -s pending` 허용으로 `p4 submit` 또는 별도 depot write가 승인되지는 않도록 한다. 최소권한에서 권한 확대가 생기면 항상 재검토. 지연·추가 reviewer token 증가라는 대가가 있으나 품질·권한상 필요하다. **평가: 바로 적용.**

**근거:** [Codex #54263](https://github.com/openai/codex/commit/4b9c24f98c6d886134fd2fc237355064708ff21f).

## 8. Codex #54414 — 살아 있는 Child가 있는 Root Turn도 Suspend/Recovery 가능

**신규성:** 이전에는 live descendant가 있으면 `suspend_turn_and_shutdown`이 거부됐다. 이제 Root Turn을 terminal event 없이 중단하고, 같은 local agent runtime 전체에 새 시작을 막는 fence와 shutdown을 걸며, Root의 history writer flush/close 성공 후 original turn ID로 회복할 수 있다. Child 종료는 별도이며 **중단된 Child는 자동 복구되지 않는다**. 리스 이전 전에 tree 전체의 writer를 정지·종결하도록 요구한다.

**구현/검증:** `codex-rs/core/src/session/turn_suspension.rs`, `codex-rs/core/src/codex_thread.rs`, `codex-rs/core/tests/suite/abort_tasks.rs` (root resume·child shutdown·writer error reporting).

**Perforce:** `TaskLease`와 `WriterLease`를 분리하고 `ROOT_SUSPENDED`, `CHILD_INTERRUPTED`, `WRITERS_FENCED`, `OWNERSHIP_TRANSFERRED`를 명시한다. P4 Workspace/CL writer는 새 주인이 등장하기 전에 fence 완료 필수. 완결된 Child 결과만 ledger에서 읽는다. **평가: PoC**(상태 손실/복구 race 검증 필요).

**근거:** [Codex #54414](https://github.com/openai/codex/commit/341de32c33fb00b88b5dd50be70610dc59dad045).

## 9. Deep Agents 0.7.26/#6842 — Async Worker의 Human-Approval Wait는 완료가 아니다

**신규성:** `interrupt()`로 멈춘 async child는 이전에 run 결과만 보면 `success`로 보였으나 이제 `check_async_task`/`list_async_tasks`가 Thread의 pending interrupt를 확인해 **`waiting`과 질문 내용**을 반환한다. `parent_thread_id` 메타데이터로 계보를 조회할 수 있으며 이후 다른 UI에서 Resume한 신규 Run도 추적한다. Main Agent는 계속 진행하지만 Child 자신의 승인 요청에는 답할 수 없다. 변경은 **beta**로 표시됐다.

**Perforce:** `TaskState=RUNNING|WAITING_FOR_HUMAN|COMPLETED|FAILED|INTERRUPTED`와 `ApprovalRecipient`를 별도 명시한다. Child가 pending submit approval 상태라면 Parent가 임의 승인하거나 완료로 보고하지 못하도록 한다. 비용 절감은 잘못된 상태로 인한 duplicate work 회피이며 직접 토큰 절감은 입증되지 않았다. **평가: 바로 적용 원칙 / SDK 연동 PoC.**

**근거:** [Deep Agents #6842](https://github.com/langchain-ai/deepagents/commit/825acb3ca03bd103e4df6013b122eca8475d1982), [0.7.26 release](https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.26).

## 10. Open SWE #4127 — Interrupt된 Turn은 Event Ledger에도 종결돼야 함

**신규성:** Slack 후속 메시지가 `multitask_strategy="interrupt"`로 기존 Run을 대체하면, 이전 Turn이 영원히 `running`으로 남는 운영 사례가 있었다. 변경 설명은 실제 운영 DB에 **열려 있는 Turn 56건**이 있었다고 보고한다. 새 Run 시작 시 이전 Run의 미종결 Turn에 `turn.interrupted` 이벤트를 기록해 transcript projection·실시간 dashboard·이벤트 로그를 일치시킨다. 단순히 UI만 `finished`로 덮지 않는다.

**구현/검증:** `openswe/transcript/turns.py`의 `superseded_turns`, `openswe/middleware/transcript.py`, `tests/middleware/test_transcript.py`. 후속 Run이 이전 Turn을 **이어받는 경우**에는 열린 상태로 남긴다.

**Perforce:** `TaskLifecycleLedger`를 event-sourced projection으로 유지한다. `RUN_STARTED` 이전에는 predecessor `RUN_INTERRUPTED` 또는 explicit reuse receipt가 있어야 한다. 56건은 해당 프로젝트의 당시 운영 관측값이며 우리 환경에 일반화할 수 없다. **평가: 바로 적용.**

**근거:** [Open SWE #4127](https://github.com/langchain-ai/open-swe/commit/e17c4bf38849029ce4059df72c6813bc9403e73b).

## 11. Open SWE #4100/#4120 — Timeout과 “실행 결과를 모름”은 구분해야 함

**신규성:** 장시간 Sandbox 호출의 명령 자체 deadline과 Hook HTTP timeout이 모두 **1800초**면, Sandbox가 timeout 판정에 사용하는 추가 **30초** 전에 HTTP가 먼저 끊기고 전체 Agent Run까지 실패할 수 있었다. Hook timeout을 `max(1800, tool_timeout+300)`으로 수정하고 transport timeout은 “명령이 여전히 실행 중일 수 있음”이라는 ToolMessage로 돌려준다. 별도 수정은 reconnect 중 `CommandNotFound`를 실행파일 미존재로 오인하지 않고 **재실행하지 않고 결과 미확인**으로 전달한다.

**구현/검증:** `mda/rt/backend.py`, `mda/rt/tools.py`, `openswe/sandboxes/providers/langsmith.py`, `tests/sandbox/test_langsmith_sandbox_timeout.py`. 명시적인 timeout은 곧 `command_did_not_execute`가 아니다.

**Perforce:** `ToolExecutionReceipt(idempotency_key, started_at, timeout_kind, remote_command_id, observed_exit_code?, outcome=SUCCEEDED|FAILED|UNKNOWN)`을 기록. `UNKNOWN`인 `p4 submit`/TeamCity trigger는 remote ID/P4 change history로 조회한 뒤에만 재시도한다. 확실한 토큰 절감률은 없지만 과금된 실패 Run과 부작용 중복 실행을 줄일 수 있다. **평가: 바로 적용.**

**근거:** [Open SWE #4100](https://github.com/langchain-ai/open-swe/commit/827577db9c08359b023511f737b56a9ab48b3ac1), [#4120](https://github.com/langchain-ai/open-swe/commit/e06c33b7cb0cb338eab836f33f7bf3491cb4fafc).

## 12. Codex #54369 / Open SWE #4110 — Ledger Commit과 API Mutation Authority

**Durable State:** Codex의 SQLite 쓰기는 transient `SQLITE_BUSY`에 대해 **100ms·200ms 최대 2회 재시도**한다. `BEGIN IMMEDIATE`로 write admission을 먼저 획득하고, transaction이 시작된 이후 전체 로직은 다시 실행하지 않는다. 인자 binding과 single revision increment가 테스트에 포함됐다. `codex-rs/state/src/sqlite.rs`, `ext/agent-message-board/src/local/*`에서 확인. 이는 **중복 append/삭제 없는 ledger 안정성** 문제다. **평가: 바로 적용.** [원본](https://github.com/openai/codex/commit/7ae831991792744434027c431dfbc7e81dd5c12c).

**Runtime Adapter 보안:** Open SWE는 사용자가 소유한 연결 키로 Agent Server API를 직접 호출해 타인의 Thread metadata 변경 또는 Run 실행이 가능한 문제를 수정했다. 이제 mutation은 backend 자체 key만, Dashboard는 소유 Thread 읽기만 가능하다. `openswe/api/agent_server_auth.py`, `langgraph.json`, `tests/auth/test_agent_server_auth.py`에서 확인. Tool Capability Discovery가 있다고 곧 Runtime mutation 권한을 주는 것은 아니다. **평가: 바로 적용.** [원본](https://github.com/langchain-ai/open-swe/commit/3df68ff6e0155cbac220201d2a5e6c4c8dba06f7).

## 실험 설계·적용 순서

### 즉시 통합할 계측/방어

1. **Tool Catalog Cost Receipt:** `{tool_name, schema_update_action, description_bytes, tokenizer_estimate, cache_read/write, input/output_tokens}`. Description byte와 모델 토큰이 다름을 명시.
2. **Evidence/Approval Provenance:** 사용자 원문·모델이 생성한 Summary·Tool 증거·Guardian Review 입력/완료/승인을 모두 다른 타입으로 기록.
3. **Unknown Outcome:** timeout, reconnect, 서버 응답 유실 시 부작용 있는 Tool 호출을 자동 재실행하지 말고 receipt와 원격 조회로 복구.
4. **Lifecycle Repair:** Run interrupt/recover 시 Event Log를 먼저 일관되게 commit하고 projection은 그 결과로 재구성.
5. **Offload Path Check:** 큰 TeamCity 로그를 저장한 뒤 실제 읽기 가능한 반환 경로·hash를 검증.

### 검증 가능한 PoC

| 실험 | A/B | 성공 기준 | 중지 기준 |
|---|---|---|---|
| Tool Schema/Code Gateway | A: direct Tool, B: core + code_only | 총 입력·캐시·출력 비용 및 verified-task 비용 동시 감소 | ACL/Hook guard bypass 1건 이상 또는 완료율 악화 |
| Fork Cache | A: isolated, B: parent-ordered fork | cache-hit 상승 및 총비용 감소, 검증 성공률 유지 | 권한 초과/혼동 또는 review 증거 손실 |
| Root Suspension | A: child가 끝날 때까지 대기, B: tree fence 후 root suspend | 중복 명령 0, ledger/writer 소유권 1개, 복구 성공 | 동시 writer·CL mutation 발견 |
| Async Human Wait | A: 기존 completed/running 분류, B: waiting 상태 별도 | Human 요청 유실 0, 중복 승인 0 | Parent가 Child 승인할 수 있게 되는 경우 |

**측정 공통 분모:** `cost_per_verified_task`, `task_pass_rate`, `critical_evidence_recall`, `total_input+cached_input+output_tokens`, `wall_time`, `retry/escalation`, `tool_schema_bytes`, `prompt_cache_hit`, `unexpected_side_effects`. 동일 저장소 snapshot·Pending CL·Task Set에서 실행하고 실패 호출 비용도 포함한다. 성공한 작업만 분모에 넣어 성공률 저하를 숨기지 않는다.

### 계속 추적할 분류

| 영역 | 오늘의 상태 | 다음 검증 포인트 |
|---|---|---|
| Durable State/Task Lifecycle | root suspend, interrupted event, SQLite writer retry에 새 구현 | multi-host fencing·writer flush 원자성 |
| Runtime Adapter | code-only tools/hosted MDA API mutation guard | code-mode에서 guard 우회 여부 |
| Evidence Verification | compaction summary role 귀속, failed review admission | authority 위조·중복 evidence 회귀 테스트 |
| Handoff/Ledger | remote command UNKNOWN, child `waiting` | 작업 재개 시 동일 원격 side-effect 탐지 |
| Context·Token | Tool별 description byte, fork prefix, backend-resolved result path | 회귀 benchmark에서 비용+성공률 둘 다 측정 |
| Model Routing/Cache | Claude classifier telemetry·same-model effort 유지 | effective model/effort 변경 시 prefix hash invalidate |
| Selective RAG/검색 | **실질적인 새로운 독립 실험 결과 확인되지 않음** | corpus·task 기반 retrieval completeness·token 검증 |

## Wiki 반영 검증

- **요청 canonical:** `jaywapp/wiki`, `develop`, `ai/trend/ai-harness-token-scout-2026-10-16.md`.
- 다른 `ai/news/`, `ai/tools/`, `ai/harness/`, `ai/research/`, `ai/tips/`에 이 날짜 Scout 파일을 만들지 않음.
- **실제 반영 여부: ❌ 실패.** `mcp__GitHub__create_file`을 명시적인 `develop` 브랜치/정확한 canonical path로 호출했으나 **OpenAI 연결 안전성 검사에서 차단**됐다. 이어서 `fetch_file(ref=develop)`로 다시 조회한 결과 GitHub API **404 (Not Found)**였다. 따라서 본 보고서는 `develop`에 저장되지 않았다.
- **백업: ✅ 성공.** `/mnt/data/ai-harness-token-scout-2026-10-16.md`의 로컬 Markdown 파일을 생성해 보존했다. 다른 AI 문서 폴더에는 날짜별 Scout 파일을 만들지 않았다.