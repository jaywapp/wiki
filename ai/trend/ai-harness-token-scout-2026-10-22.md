---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-22"
date: 2026-10-22
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, codex, claude-code, deepagents, open-swe, perforce]
---

# AI Harness · Context/Token Optimization Scout — 2026-10-22

> 조사 기준: **2026-10-22 06:06 KST / 2026-10-21 21:06 UTC**. GitHub 원본 커밋·변경 코드·회귀 테스트와 Claude Code 공식 릴리스 중심. 숫자나 기능 상태는 확인된 소스에만 귀속하며 **새롭게 측정된 토큰 절감률은 확인되지 않았음**.

## 1. 중복 점검과 우선순위

전일 로컬 보고서 `ai-harness-token-scout-2026-10-21.md`와 `jaywapp/wiki` `develop`의 과거 Trend 보고서를 참조했다. 전일에 다룬 Codex PromptCacheKey #55587, Deep Agents idle compaction #6956, Open SWE BM25 ToolSearch #4217, cloud skill snapshot #55631, Reviewer evidence dedupe, async checkpoint를 반복하지 않았다. 단, 10/21 canonical 보고서는 `develop`에 없고 10/09~20 보고서도 일부 누락되어 전 기간 중복 비교에는 한계가 있다. 신규 선정 기준은 **10/21 UTC에 병합된 구체적 소스**나 Anthropic의 새 공식 버전으로 한정했다.

| 변화 | 직접 확인된 사실 | 판단 |
|---|---|---|
| [Claude Code 2.1.306](https://github.com/anthropics/claude-code/releases/tag/v2.1.306) | MCP-heavy session에서 불필요한 compaction을 유발한 API 오류 분류 회귀 수정 | **바로 적용 검증** |
| [Codex #55954](https://github.com/openai/codex/commit/d685e61e1f63b0222cc51017b175d20c14ecd02d) | Reviewer retained instructions의 의미/출처와 budget policy 분리 | **바로 적용 원칙** |
| [Codex #55913](https://github.com/openai/codex/commit/a6839a481223fb5faab539a9eb2b7174ae29e560) | Score와 history에 의해 대체된 classifier의 inference 사전 생략 | **바로 적용/PoC** |
| [Codex #55957, #55958, #55968](https://github.com/openai/codex/commit/3fd08b540570a5dd9c61d98560a0231f7b43891f) | Cloud Skill/Plugin/Model catalog auth-generation·last-good cache·backoff | **PoC** |
| [Codex #55973](https://github.com/openai/codex/commit/8d06d62e15ebbe1ad42324232b6e8a7e2e432793) | 협업 Tool 9개 전량 대신 역할별 subset 선택 | **바로 적용** |
| [Codex #55724](https://github.com/openai/codex/commit/2744e8686c3defaa96f7aff6c51a9df961c51224) | Prepared MCP Tool definition을 같은 manager의 세션 사이 공유 | **PoC** |
| [Codex #55969](https://github.com/openai/codex/commit/02c6a2d3f1a0b906f53770ad45ef61327509d551) | Agent mail 선점 시 response ID·Tool dispatch fence 보존 | **바로 적용 원칙** |
| [Codex #55804](https://github.com/openai/codex/commit/af91f6ef2cd66ead278ebe7d5751973eef430aee) | 병렬 Agent의 중복 없는 critical-path 시간 귀속 유틸리티 | **PoC** |
| [Deep Agents #7127](https://github.com/langchain-ai/deepagents/commit/6032a5ade4908d75eb2662e602f1f61a1d7a9bcf) | Compaction 전에 생성된 Claude reasoning block의 선택적 제거 | **바로 적용 원칙** |
| [Deep Agents #7072](https://github.com/langchain-ai/deepagents/commit/7a7c4e3708981568f96eb7fbc86aaef696c03001) | AsyncSubAgent의 완료 webhook을 runs.create로 전달 | **PoC** |
| [Open SWE #4347, #4356](https://github.com/langchain-ai/open-swe/commit/4745b1aaa79093aaf5547918ac4bb4896cecbaae) | Durable merge queue 및 sandbox 기반 batch candidate Git 작업 | **PoC** |
| [Codex #55923](https://github.com/openai/codex/commit/430a16799d90e296fb27b1e94f206023902b7e56) | Resume/revert 뒤 모델 및 service tier 설정 보존 | **바로 적용 원칙** |

## 2. Claude Code 2.1.306 — 오류를 '컨텍스트 초과'로 오진하여 발생하는 압축 방지

**신규성/근거:** Anthropic [v2.1.306 공식 릴리스](https://github.com/anthropics/claude-code/releases/tag/v2.1.306)는 Tool이 많은 MCP session에서 실제 API 오류가 `prompt is too long`으로 덮인 뒤 **필요 없는 compaction**이 수행되던 문제를 고쳤다. 환경 변수 없이 실행하는 cloud `claude -p`의 잘못된 로그인 메시지도 수정했다.

**내부 동작·토큰 원리:** 공식 자료는 오류 분류와 압축 트리거의 수정만 확인해 준다. 요약 호출을 피하면 요약에 사용될 input/output 및 이후 재요청 비용을 절감할 수 있지만, 구체적인 소스 코드·절감량은 공개되지 않았다. 실제 context overflow일 때는 정상 압축이 여전히 필요하다.

**적용/평가:** Claude Code 2.1.305 대비 2.1.306, 다수 MCP schema 등록 및 mock gateway 오류 환경에서 API 원본 오류 보존, `compaction_count`, 재시도, 청구 토큰, 증거 회복률을 비교한다. **바로 적용 검증**; 운영 gateway에서 smoke test 없이 일괄 업그레이드하지 않는다.

## 3. Codex Guardian — 의미 기반 Retention과 stale scoring 제거

**A. Retained Instruction Composition.** [#55954](https://github.com/openai/codex/commit/d685e61e1f63b0222cc51017b175d20c14ecd02d)는 `codex-rs/guardian-context/src/retained_instructions.rs`와 `composition.rs`에서 수집 단계에 `RetainedInstructionItem(content, kind, source)`를 사용한다. `UserInstruction`, `HostNotice`, `Framing`은 편집 시 `Retention::Required`, Assistant의 역사적 context는 선택 우선순위로 배치한다. 문서·지시의 provenance와 예산 정책을 섞지 않는 구조다. **토큰 원리:** 중요도가 낮은 이전 답변을 먼저 줄이되 정책/승인은 잃지 않는다. 잘못된 분류로 증거가 빠질 위험이 있어 반드시 `source_sha`와 required 정책 검사 필요. **평가: 바로 적용 원칙.**

**B. Scorer cancellation.** [#55913](https://github.com/openai/codex/commit/a6839a481223fb5faab539a9eb2b7174ae29e560)의 `ext/guardian-v2/src/async_scorer/conversation.rs`는 실행 대기 중 오래된 요청의 `sampled_at`을 보관하다가 **새로운 score와 새로운 retained history가 모두 존재**하면 `Superseded`로 종료하며 실제 inference를 호출하지 않는다. 하나만 바뀌었다면 생략하지 않는다. 테스트는 권한 허용 대기와 부분 갱신을 포함한다. **토큰 원리:** 호출하지 않은 분류 요청의 비용 자체를 방지; 절감량 미공개. **적용:** `ReviewRequest(task_id,cl_rev,evidence_gen,score_gen,sampled_at)` 기반 stale-classifier fence, false skip=0 목표. **평가: 바로 적용 원칙, 실제 API 경로 PoC.**

## 4. Codex — Authentication-scoped Cloud Catalog Lifecycle

세 커밋이 상호 보완적이다. [#55957](https://github.com/openai/codex/commit/9e12b148918b6189b90ccd33be68f7811adfe81f)는 `refresh_catalog_for_step`로 turn 진행 중 auth scope가 바뀌면 다음 model step에서 Skill/Plugin을 갱신하고 MCP를 재구성한다. Prewarm/context-only capture에는 discovery를 일으키지 않는다. [#55958](https://github.com/openai/codex/commit/067249a28329feec4a097f55413894acb4a6378a)는 model catalog refresh의 일반 네트워크 실패 때 마지막 성공 catalog·ETag·기존 freshness를 보존하여 ToolSearch를 유지하되 **401/403/로그인 재요구에는 invalidate**하고, 성공한 빈 catalog는 권위 있는 빈 목록으로 취급한다. [#55968](https://github.com/openai/codex/commit/3fd08b540570a5dd9c61d98560a0231f7b43891f)는 Cloud Skill/Plugin discovery 실패를 매 model step마다 재시도하던 문제를 **30초부터 최대 5분** backoff로 고친다. Auth/resource generation이 바뀌면 cooldown을 재설정한다.

**내부 소스:** `codex-rs/core/src/session/mcp.rs`, `codex-rs/models-manager/src/manager.rs`, `codex-rs/ext/extension-api/src/catalog_refresh.rs`, `codex-rs/ext/mcp/src/cloud_plugin.rs`와 lifecycle/concurrency 테스트.

**효과와 위험:** discovery 호출/네트워크 지연·잘못된 ToolSearch disable 감소가 우선이며 **model token 절감은 입증되지 않았다**. 401 후 기존 Tool catalog를 계속 노출하면 권한 누수가 발생한다. **Perforce 적용:** `CatalogSnapshot(auth_scope,provider,resource_generation,etag,content_sha,last_success)`와 `RefreshReceipt(error_class,next_retry_at)`를 분리. P4 권한 변경·503·401을 주입해 stale Tool 노출 0, discovery 횟수, schema token, p95 비교. **평가: PoC.**

## 5. Codex — Tool Progressive Disclosure와 Prepared-Schema 재사용 구분

**역할별 Tool subset:** [#55973](https://github.com/openai/codex/commit/8d06d62e15ebbe1ad42324232b6e8a7e2e432793)는 `codex-rs/message-board/src/tools/selection.rs`, `spec.rs`, `tests/local_board.rs`에서 전체 9개의 협업 Tool을 상시 공개하지 않고 `MessageBoardTool::{ReadThread,ListThreads,...}` 목록으로 순서까지 명시해 원하는 Tool만 공개하도록 했다. 내부 응답 JSON 상한은 **8,000 bytes**로 유지. Tool 비노출은 storage permission을 대체하지 않는다. **토큰 원리:** 9→2 설정은 schema 7개를 노출 대상에서 제거하지만 모델에서 절약되는 토큰은 실제 tool spec 직렬화를 계측해야 한다. Planner read-only, Reviewer diff/CI-read, Mutator write-lease 단계에 맞는 공개 정책으로 시작할 가치가 있다. **평가: 바로 적용.**

**세션 간 준비된 정의 재사용:** [#55724](https://github.com/openai/codex/commit/2744e8686c3defaa96f7aff6c51a9df961c51224)는 `core/src/mcp_tool_exposure.rs`·`tools/handlers/mcp.rs`의 불변 `McpHandlerDefinition`을 같은 manager 안에서 재사용한다. Metadata·plugin mode·schema byte budget이 같아야 하고 `Weak`로 세션 종료 후 회수한다. 이는 **CPU/메모리 최적화이지 prompt tokens 절감이 아니다**. 공유 ToolSpec에 실행 권한을 결합하지 않아야 한다. **평가: PoC.**

## 6. Codex — Stream Preemption 시 Handoff·Tool Lifecycle 정합성

[#55969](https://github.com/openai/codex/commit/02c6a2d3f1a0b906f53770ad45ef61327509d551)의 `core/src/session/turn.rs`, `stream_events_utils.rs`, `tools/parallel.rs`, `scenarios_mailbox_preemption_tests.rs`는 새 Agent 메시지로 모델 스트림을 선점할 때 WebSocket Responses Lite stream을 graceful interrupt/drain하여 **완료 응답 item과 response ID**를 보존한다. Buffered Tool call은 dispatch 전에 취소하고, partial item은 버리고, 사용자 steering은 drain까지 queue에 보관한다. 테스트는 disconnect, ACK 누락, buffered calls, content filter 회복을 포괄한다.

**토큰 원리:** Response ID를 잃지 않으면 이미 생성된 내용을 재샘플링하거나 전체 history를 재전송할 위험을 낮춘다. 절감량 미공개. **Perforce 적용:** `ToolDispatchIntent(intent_id,response_id,cl_revision,status)`의 `buffered→admitted→dispatched→receipt_confirmed` 상태 관리. P4 submit/TeamCity build trigger는 메시지 수신만으로 곧바로 실행하지 말고 실행 영수증과 서버 상태를 대조한다. **평가: 바로 적용 원칙.**

## 7. Codex — 병렬 작업 Critical Path에 대한 독점 시간 측정

[#55804](https://github.com/openai/codex/commit/af91f6ef2cd66ead278ebe7d5751973eef430aee) 신규 crate `codex-rs/utils/critical-path`는 경로를 `Inference`, `AutoReview`, `UserWait`, `Tools`, `Overhead`, `Unknown` 등으로 나눠 **병렬 분기의 경과 시간을 중복 합산하지 않고** 늦게 완료되는 의존 경로를 따라 귀속한다. 측정 범위 외 시간은 잘라내며 관측하지 못한 구간은 overhead, history depth 초과는 unknown으로 처리. Parallel join/overlap/time clipping unit test 포함.

**한계:** 소스 상 유틸리티를 추가한 것이지 모든 Codex 경로에 자동 측정이 이미 연결됐다고 확인된 것은 아니다. Token 절감 없음. **적용:** UE compile/P4 sync/TeamCity/inference/review를 같은 Span graph로 보고, latency p95/병목 시간 및 billed tokens와 별도 관리. **평가: PoC.**

## 8. Deep Agents — Compaction 이후 Claude Thinking의 정합성

[#7127](https://github.com/langchain-ai/deepagents/commit/6032a5ade4908d75eb2662e602f1f61a1d7a9bcf)은 `libs/deepagents/deepagents/middleware/summarization.py`에서 `SummarizationEvent.created_at_index`를 추가한다. Summary가 과거 대화를 대체한 후 **그 대화에 묶여 있던 Claude/Bedrock Claude의 native `thinking`, `redacted_thinking`, `reasoning_content` block만 모델 요청에서 필터**한다. Raw state의 메시지는 삭제하지 않고 **요약 이후 새로 발생한 reasoning은 유지**한다. Bedrock의 다른 모델·타 모델 thinking까지 일괄 제거하지 않는다. Sync/async 회귀 테스트 포함.

**원리·Trade-off:** 무효화된 reasoning block을 후속 prompt에 다시 싣지 않아 context token과 API 오류를 줄일 여지가 있다. 다만 타 모델 지원이나 원본 evidence 검증의 누락은 위험. 정량 절감 없음. **Perforce 적용:** `CompactionReceipt(cutoff_index,created_at_index,history_generation,summary_sha)`로 모델 요청에만 필터 적용하고 원본 로그/CL diff는 immutable artifact로 보존한다. **평가: 바로 적용 원칙.**

## 9. Deep Agents — AsyncSubAgent Webhook 기반 Task Handoff

[#7072](https://github.com/langchain-ai/deepagents/commit/7a7c4e3708981568f96eb7fbc86aaef696c03001)에서 `AsyncSubAgent`에 선택형 `webhook`을 넣어 `start_async_task`와 `update_async_task`의 `runs.create`에 전달한다. Agent Server에 이미 있는 run-completion webhook을 사용해 앱 내부 in-memory watcher를 대체할 수 있다. **Webhook 자체는 exactly-once/서명 검증을 제공한다는 증거가 없다.**

**비용 원리:** 모델을 이용한 polling 구현이면 간접 절감할 수 있지만 단순 HTTP polling이면 모델 token은 그대로. **Perforce 적용:** `ChildRunReceipt(parent_task,run_id,event_id,cl_rev,result_sha)`를 durable inbox에 적재하고 이벤트 중복·유실을 reconciliation query로 해결한다. **평가: PoC.**

## 10. Open SWE — Durable Merge Queue와 단계적 후보 빌드

[#4347](https://github.com/langchain-ai/open-swe/commit/0af248eed8ee6697a7e5aedae55967f00fd87e47)은 `openswe/merge_queue/store.py`, SQL migrations, PostgreSQL tests를 통해 Queue/Request/Batch/Evidence/Attempt를 durable 상태로 만든다. `lease_owner`, `lease_until`, `fence` 및 repository binding 잠금 순서로 동시 controller 충돌을 막는다. [#4356](https://github.com/langchain-ai/open-swe/commit/4745b1aaa79093aaf5547918ac4bb4896cecbaae)에서는 `admission.py`/`scheduler.py`/`git.py`가 PR·CI provenance·required checks를 검증하고 유효기간 **120초**의 admission snapshot과 isolated sandbox의 bare Git 후보 작업을 제공한다. Failed batch recovery와 CI/permission 경계 테스트 포함.

**중요 범위 제한:** 첫 migration에 **"No queue workers or repositories are enabled"**, `scheduler.py`에 **"Explicitly invoked candidate preparation; no workers, CI dispatch or promotion"**이라고 명시. **완성된 자동 병합 제품은 아니다.** Token 절감 benchmark 없음. **Perforce 적용:** Git merge queue를 직접 이식하지 않고, `TaskAdmission(p4_stream,cl,review_sha,ci_receipt,lease_fence)`와 단계형 `shelve→resolve→verify→submit` 승인·복구 흐름만 차용. **평가: PoC.**

## 11. Codex — 모델·Service Tier 설정의 Durable Resume

[#55923](https://github.com/openai/codex/commit/430a16799d90e296fb27b1e94f206023902b7e56)의 `app-server/src/request_processors/persisted_resume_settings.rs`, `thread_processor.rs` 및 resume/revert 테스트. 재개 시 저장된 model, tier, reasoning summary, personality를 복원하고 명시적인 사용자 override를 존중한다. 선택 tier는 snapshot에 남기되 현재 모델이 미지원이면 실제 sampling 요청에는 넣지 않는다. 첫 turn의 MCP 기동 도중 중단되어도 설정 checkpoint가 남도록 수정했다.

**원리:** 기본값으로 예기치 않게 모델/tier가 교체되어 비용이나 cache 정책을 어기는 상황을 감소시키지만, **새 자동 model routing 절감 성과는 아니다**. **적용:** `ModelRouteReceipt(model,service_tier,effort,policy_rev,chosen_at)`를 ledger에 보존하고 resume/revert 시 capability validation 후 복원. **평가: 바로 적용 원칙.**

## 12. 추가 관찰 — Idle Suspend Retry는 Side-effect Retry와 달라야 함

[Open SWE #4318](https://github.com/langchain-ai/open-swe/commit/af107092b00557dd00a9ca1df29d5116ceb2b683)은 idle-suspend 중 proxy-config PATCH가 500을 반환해 세션이 즉시 죽던 문제를 **최대 180초** bounded retry 및 `Retry-After` 지원으로 수정했다 (`openswe/sandboxes/retry.py`, `providers/langsmith.py`). Idempotent한 환경 설정 API에 관한 정책이며 **P4 submit이나 TeamCity build trigger에 이 retry를 무조건 적용해서는 안 된다**. **평가: 정책 참고.**

## 13. Perforce·Claude Code·Codex Harness 채택 순서와 실험 설계

1. **바로 적용 원칙:** `EvidenceLedger(source_sha,cl_revision,context_generation,required,verification_receipt)`와 source-aware pruning. Side-effect의 `buffered/admitted/dispatched/confirmed/unknown`을 독립적으로 기록해 중복 submit 0건 유지.
2. **우선 PoC:** Tool Registry 역할별 selective disclosure + 서버 권한 검증, Cloud Catalog 권한 세대별 cache/backoff, compaction 이전 reasoning filter. Claude Code ToolSearch와 Codex 선택적 schema를 동일 업무 조건에서 A/B 비교.
3. **Lifecycle:** `TaskLedger(task_id,goal_rev,p4_client,stream,cl_rev,model_route,auth_scope,skill_snapshot,context_gen,evidence_cursor,child_runs,mutation_receipts)` 및 webhook durable inbox. Worker 종료/timeout/재시작/권한 회수에서 복구 재현.
4. **측정:** 고정된 30개 이상 CL/task, A/B의 input/output/cache read/cache write tokens, 실제 청구 비용(USD/verified-task), schema tokens, discovery 횟수, 불필요한 compaction, skipped inference, critical evidence recall, p95 critical path, 재시도·중복 제출 수집. 최소 합격 조건은 **critical evidence recall 저하 0, stale permission exposure 0, duplicate submit 0**.

**이번 기간에 새로운 검증 자료가 없었던 영역:** RAG 기반 selective context의 실측 개선율, Prompt/Skill 파일 경량화 benchmark, subagent context isolation의 비용/정확도 A/B, automatic model routing 절감률. 일반적인 주의사항으로 숫자를 만들지 않았다. **9→2 tool, 8,000 byte cap, 30초~5분 cooldown, admission 120초, proxy retry 180초는 설정값이지 개선율이 아니다.**

## 14. Canonical Wiki 반영 상태

- 요청한 위치: `jaywapp/wiki` → `develop` → `ai/trend/ai-harness-token-scout-2026-10-22.md`
- **현재 상태: 미반영.** GitHub `create_file`을 직접 시도했으나 안전 검사로 차단됨. 미반영 파일을 성공이라고 표현하지 않았다. 변경된 Report 원본은 이 Markdown 파일로 보존했다.