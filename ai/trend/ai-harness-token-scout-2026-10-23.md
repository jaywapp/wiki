---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-23"
date: 2026-10-23
category: trend
tags: [ai-harness, context-engineering, coding-agent, token-optimization, codex, claude-code, open-swe, deepagents, perforce]
---

# AI Harness · Context/Token Optimization Scout — 2026-10-23

> 조사 기준: 2026-10-23 06:01 KST(10-22 21:01 UTC). GitHub 변경사항·공식 릴리스·주요 소스/테스트를 확인. 이전 `jaywapp/wiki` develop의 10/19~22 보고서와 비교해 중복 항목은 제외했다. **오늘 새로 공개·재현된 정량 토큰/비용 절감률은 확인하지 못했다.** 기능값·테스트 fixture 값은 절감률과 구분한다.

## 핵심 요약

| 신규 변화 | 핵심 판단 | 판정 |
| --- | --- | --- |
| Claude Code 2.1.307: HTTP MCP 안전 재시도, compaction thrash 수정 | 무조건 Tool replay 금지, 불필요한 요약 반복 회피 | 바로 적용 검증 |
| Codex retained reasoning 중복 계산 제거·Hook 수락 후 telemetry | 비용·컨텍스트 추정 정확도 향상 | 바로 적용 원칙 |
| Codex reasoning effort override 기본 활성화 | 작업 단계별 routing을 실제 history 업데이트로 수행 가능 | PoC |
| Codex 신규 메모리 프로필 V2·resume revision 검증 | 선택적 기억과 안전한 이력 재사용, 중복 I/O 축소 | PoC |
| Codex MCP CancelOnDrop·direct tool critical-path recorder | 취소 전파, latency 귀속 개선 | PoC |
| Deep Agents enqueue follow-up/notify_parent, Open SWE MDA Worker 전환 | durable handoff 및 실행 세대별 context 격리 | PoC |
| Open SWE 후보 CI validation dispatch 및 stale approval 회수 | evidence verification와 lifecycle 완결성 보강 | 바로 적용 원칙 / PoC |
| Microsoft Agent Framework installable consumer skill | progressive disclosure와 참조 링크 자동 검증 | 바로 적용 패턴 |
| Gemini CLI 확장 사용량 필드 복원 | 모델별 token/cost 측정 누락 예방 | 바로 적용 원칙 |

## 중복 검사

기준 보고서: [10/22](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-22.md), [10/21](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-21.md), [10/20](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-20.md), [10/19](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-19.md). 기존 PromptCacheKey 분리, Deep Agents idle compaction·stale thinking 처리, Open SWE BM25 ToolSearch, Codex Cloud Catalog backoff, Tool subset, Merge Queue 후보 생성·DB schema, UTF-8 byte limit 등을 다시 신규 항목으로 세지 않았다. 이번 보고서는 해당 기능의 후속 코드 변경 또는 새로운 아키텍처 전환만 다룬다.

## 1. Claude Code v2.1.307 (10월 21일 22:17 UTC)

**원본:** [v2.1.307 공식 릴리스](https://github.com/anthropics/claude-code/releases/tag/v2.1.307), [v2.1.308](https://github.com/anthropics/claude-code/releases/tag/v2.1.308), [Claude Agent SDK Python 0.2.172](https://github.com/anthropics/claude-agent-sdk-python/releases/tag/v0.2.172).

**신규성·내부 동작:** HTTP MCP 연결이 Tool call 중 끊어져도 기존처럼 무조건 재전송하지 않고 **read-only 또는 idempotent 도구만 자동 재시도**하도록 변경했다. PDF 다량 페이지·이미지·대형 Tool 결과를 읽을 때 나타난 `Autocompact is thrashing` 관련 오류와 cloud session 재시작 이후 `/autocompact` 설정 창 초기화 문제를 수정했다. `claude_code.safety_event` OpenTelemetry 이벤트를 추가해 권한 규칙, auto mode, hook, sandbox 등으로 tool 실행이 정지·반송되는 사유를 기록한다. Subagent 사용량의 placeholder와 동시 fork identity 혼동도 수정했다. 2.1.308의 노트는 포괄적인 안정성 개선만 밝히므로 세부 토큰 효과를 추정하지 않는다.

**토큰/비용·Trade-off:** 중복 요청과 반복 요약 가능성을 줄이지만 실제 호출 횟수 및 청구 절감률은 미공개. 비멱등 도구를 재시도하지 않으면 불확정 결과를 운영자가 조정해야 하며, telemetry 자체의 비용도 발생한다.

**Perforce·Claude Code·Codex 적용:** `p4 submit`, `p4 resolve`, TeamCity build trigger, GitHub write 등에는 side-effect receipt와 서버 재조회가 반드시 선행되어야 한다. `ToolEffect(intent_id,request_hash,dispatched,remote_receipt,outcome_unknown)` 계약을 적용한다. 2.1.306→307/308 간 대형 Tool 결과, MCP 연결 절단, 압축 횟수, 동일 mutation 중복 발생 여부를 회귀 테스트한다. **판정: 바로 적용 검증.**

## 2. Codex #55991·#56234 — Retained Reasoning와 실제 수락된 입력의 Token Accounting

**원본:** [#55991](https://github.com/openai/codex/commit/07cc649c658be7018b6913299f12f843b24679f8), [#56234](https://github.com/openai/codex/commit/8c7affbe1b8a912e92dbfd75b8d0cceb9ca34507).

**신규성·소스:** `codex-rs/core/src/compact.rs`, `session/mod.rs`, `session/turn.rs`에서 Responses Lite와 local estimate의 retained reasoning 포함 여부를 구분해 암호화 reasoning이 두 번 더해지지 않도록 했다. `session/turn_input.rs`에서는 `UserPromptSubmit` Hook이 거부한 사용자 입력이 rollout 및 prompt telemetry에 기록되지 않도록 계측을 수락 이후로 이동했다. Guardian이 승인된 입력을 ResponseItem으로 바꾼 경로는 별도 처리했다. `core/tests/suite/compact.rs`, `hooks.rs`, `guardian_review.rs`에 테스트가 있다.

**효과/한계:** 실제 모델 호출에 포함되지 않은 입력을 사용량으로 잘못 계상하거나 local context를 과대 평가하는 문제를 감소시킨다. 모델 API의 직접 절감률이 아니라 **계측 정확도**의 개선이다. `submitted`, `hook_accepted`, `sent`, `billed`를 서로 다른 이벤트로 보존해야 한다.

**적용:** Perforce 작업당 `UsageReceipt(usage_source,reasoning_included,accepted_input,provider_total,cache_read)`를 기록한다. Mock gateway에 reasoning+hook deny를 주입해 거부 입력의 과금 이벤트 0, reasoning 중복합산 0을 검사한다. **판정: 바로 적용 원칙.**

## 3. Codex #56163 — Reasoning Effort Override의 기본 활성화

**원본:** [#56163](https://github.com/openai/codex/commit/2f3fb111be71d277c80bd5b96d9019748b921f5a).

**신규성:** `reasoning_effort_override`가 실험 옵션에서 기본 활성화로 전환되었고, 지원 모델의 history에 `configuration_update:reasoning={"effort":"low"}` 등의 업데이트가 들어간다. 이전 보고서의 resume 후 모델·tier 보존과는 별개의 모델 요청·history 표현 변화다.

**절감 원리·위험:** 작업 단계별 low/medium/high의 reasoning 예산을 통제할 수 있지만 해당 변경 자체에 절감 벤치마크는 없다. 이전 요청의 캐시 활용, 미지원 모델 fallback, compaction 후 effort baseline 일관성이 관건이다.

**적용:** P4 CL 분석→수정→검증/리뷰 세 단계에 low/medium/high를 부여한 arm과 고정 medium arm을 동일 30개 업무에서 비교한다. `USD/verified-task`, reasoning tokens, cache hit, critical evidence recall을 수집한다. **판정: PoC.**

## 4. Codex #56211 — 신규 Memory 프로필 V2 기본화

**원본:** [#56211](https://github.com/openai/codex/commit/a390571745da105cfdc85443dd1d38bf78e5ea6e).

**내부 동작:** `config/src/types.rs`는 새 프로필에서 Memory V2를 기본값으로 하되 V1 workspace가 이미 존재하는 경우 기존 동작을 유지한다고 명시한다. `app-server/src/request_processors/memory_status.rs`는 새 프로필에 불필요한 V1 consolidating 조건을 요구하지 않으며, `memory_read/reset` 테스트가 V1/V2 marker 누수와 새 프로필의 V1 경로 무단 생성 여부를 검증한다.

**토큰·품질:** 선택적 memory 재사용 기반이며 **V2가 V1보다 token을 얼마나 줄이는지 공개 실측 없음**. 메모리 profile·프로젝트/stream 경계가 혼동되면 재사용된 사실이 잘못된 코딩 지시로 전파될 위험이 있다.

**적용:** `MemoryProfile(profile_id,version,source_rev,stream,content_sha)`를 기록하고 신규 V2 / 기존 V1 / 명시 V2 3그룹의 memory recall, stale evidence, prompt tokens를 비교한다. **판정: PoC.**

## 5. Codex #56224·#56250 — Resume Context Reuse, Revision Validation, 중복 Checkpoint 제거

**원본:** [#56224](https://github.com/openai/codex/commit/ffda54f5b8d5595eb0963594de32e206f98cc77f), [#56250](https://github.com/openai/codex/commit/40db507eeca2ff778c040c325449eb72e90c0590).

**구현:** `app-server/src/request_processors/thread_processor.rs`의 `PreparedResumeConfig`에 `model_context`를 보존해 paginated history에서 config 읽기와 resume 본문 초기화 사이에 같은 이력을 중복 로드하지 않는다. `thread-store/src/store.rs`의 `is_model_context_current`는 revision을 재확인하고, 검증할 수 없으면 cache hit 대신 fresh read한다. 파일 append/removal 시 revision invalidation 테스트가 있다. `session/mod.rs`는 resume 설정이 변하지 않았을 경우 `ThreadSettingsApplied` checkpoint를 추가로 기록하지 않는다.

**효과·Trade-off:** I/O·resume 지연·롤아웃 부피를 줄이는 방향이지만 **모델 입력 토큰 감소와 직접 동일하지 않다**. Revision 검증은 약간의 읽기 비용이 생겨도 오래된 설정의 위험을 막는다.

**적용:** `ResumeSnapshot(task_id,history_revision,have_revision,settings_sha)`를 P4 stream/client와 연결한다. 100/1,000 페이지 history에서 read call·bytes·resume p95·stale reuse를 비교한다. **판정: 바로 적용 원칙, PoC.**

## 6. Codex #56132 — MCP CancelOnDrop·전송 순서

**원본:** [#56132](https://github.com/openai/codex/commit/2dbe6bfa44195e0c63b9a2ee59f46482bfd64fae).

**구현:** `rmcp-client/src/tool_request.rs`에서 요청 Future가 drop되면 동일 request ID의 `CancelledNotification`을 보내는 guard를 만든다. `ordered_byte_transport.rs`는 전송 순서를 강제하여 취소 통지가 원 요청보다 먼저 기록되는 상황을 방지한다. `cancellation_cannot_overtake_request` 테스트가 있다.

**원리·제약:** 버려진 원격 Tool 연산을 중단시켜 compute를 절약할 수 있으나 cancellation 수신과 side-effect rollback을 보장하지 않는다. 서버가 이미 `p4 submit`을 완료했다면 취소 통지는 소급 효과가 없다.

**적용:** read-only fetch에는 cancel 허용, mutation에는 `unknown_outcome`을 기록하고 authoritative status 재조회. 취소 경쟁/중복 실행/서버 응답 유실 50회 검증. **판정: PoC.**

## 7. Codex #56008 — Tool Critical-path 실행 시간 Recorder

**원본:** [#56008](https://github.com/openai/codex/commit/082900149cc7c0985e15a1d1ce0330a9e81e53b1).

**구현:** 전일 `utils/critical-path` crate 도입에 이어 `codex-rs/direct-tool-timing/src/recorder.rs`와 테스트를 추가했다. `DirectToolTimings`, `ToolBatchTiming`, Tool/Review/Blocking Guard 등으로 inference 이전 공통 경로, 병렬 Tool 분기, 자동 리뷰, 사람 대기, history 미상 구간을 구분하고 병렬 완료의 critical path에서 시간을 중복 귀속하지 않는다.

**효과:** 토큰 절감 자체는 없다. 대신 실제 병목을 P4 sync, UE compile, CI, 모델 추론, reviewer 단계 중 어디서 발생하는지 파악한다. 모든 실행 경로에 이미 연결되었다는 근거는 없다.

**적용:** 성능 측정에서 tool wall-clock 단순 합산을 금지하고 latency p95, critical-path exclusive ms, USD/task를 분리한다. **판정: PoC.**

## 8. Deep Agents 0.7.30 — Queue 기반 Async Follow-up과 Notify Parent 제어

**원본:** [공식 0.7.30 릴리스](https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.30), [#7082](https://github.com/langchain-ai/deepagents/commit/a7e1e2575c1e96b721a0a3e0ecde6e85612ac30d6), [#7132](https://github.com/langchain-ai/deepagents/commit/3ae25ff85f94f15815c377e73841173a722299d6).

**구현:** `async_subagents.py`가 `update_strategy="enqueue"`를 지원한다. 기본값 `interrupt`와 달리 진행 중인 일을 끊지 않고 후속 입력을 pending 상태에 놓는다. 같은 turn에서 동일 task에 두 개 이상의 enqueue는 상태 유실을 막기 위해 거부한다. 오래된 run completion은 무시하며 취소 시 active+queued를 정리한다. `notify_parent=false`는 외부 앱이 webhook으로 결과를 전달할 때 parent를 불필요하게 깨우지 않게 한다. Local follow-up은 enqueue 시점의 parent context를 캡처하며 remote URL subagent에는 같은 방식의 context 전달을 가정하면 안 된다.

**절감·Trade-off:** 불필요한 중단·재시작을 줄일 수 있으나 성능 데이터 미공개. 대기 중인 human approval이 queued follow-up에 의해 무시될 수 있는 정책상 위험에 주의한다.

**적용:** `WorkerTask(task_id,run_generation,context_sha,pending,notify_policy)`를 기록하고 오래된 completion, 중복 enqueue, parent idle을 fault injection한다. **판정: PoC.**

## 9. Open SWE #4267/#4382 — MDA Async Worker Migration과 Durable Webhook

**원본:** [#4267](https://github.com/langchain-ai/open-swe/commit/5b9bb872ddb5a4cefb539b07fa32895f2815379a), [#4382](https://github.com/langchain-ai/open-swe/commit/7d48af3fa70ac8aafea59ffb113a8f68b168d7ea).

**구현:** `spawn_worker`를 MDA `start_async_task`로 치환하고 별도의 Open SWE worker thread/`open-swe--general-purpose` graph를 사용한다. Coordinator의 실행 권한을 무비판적으로 자식에 복사하지 않도록 **worker grant → adopt → 독립 run token**을 적용한다. Migration 0077은 `(coordinator_thread_id, launch_request_id)` unique index로 launch 중복을 막는다. 후속 #4382는 완료 webhook을 이용한 worker 정산을 강화하고 불필요한 launch-run polling 경로를 제거했다. 서버가 성공을 반환해도 task가 사람 승인 `interrupts`에서 대기 중일 수 있어 checkpoint로 구분한다.

**Trade-off:** 토큰 절약이 검증된 변경은 아니며, 실행 격리와 handoff 정합성 개선이다. Parent context 최소화는 별도의 Prompt A/B가 필요하다. 비동기 webhook의 재전달/유실과 run generation이 난점이다.

**적용:** Perforce worker당 독립 client/stream을 제공하고 `WorkerIdentity(coordinator,launch_request_id,worker_thread,run_token_scope)` 및 durable inbox를 구성한다. 복수 webhook·누락·restart에서도 중복 실행 0, cross-stream credential exposure 0. **판정: PoC.**

## 10. Open SWE #4366 — 후보 CI Dispatch·Evidence Verification

**원본:** [#4366](https://github.com/langchain-ai/open-swe/commit/781b37c3c102bbf0f9170745f8ae8b2e1700f43e).

**구현:** 전일의 Merge Queue DB/후보 생성 이후 `merge_queue/validation.py`, `runtime.py`, `scheduler.py`에 불변 CI validation intent·deadline 저장, workflow dispatch, 불확정 응답 시 기존 run 재검색, required job/artifact 검증을 추가했다. Candidate SHA, trusted workflow revision, dispatcher/triggering actor, run attempt를 교차 확인하고 검증 중 candidate가 바뀌면 무효화한다. **Smoke success는 증거 저장일 뿐 자동 promotion/merge는 연결되지 않았다.** 신뢰할 수 있는 서버 policy/controller가 없으면 reconciliation job은 비활성 상태다.

**효과:** CI 중복 발사·오염된 증거 사용을 줄이는 구현이며 실제 모델 토큰 개선 benchmark는 없다. 검증 CPU·CI비용 및 latency가 증가한다.

**적용:** P4 `shelve → isolated validation → TeamCity evidence → review → guarded submit` 상태 머신을 설계한다. Build trigger timeout이면 먼저 TeamCity build 목록을 확인한다. `ValidationIntent(cl_rev,stream,policy_sha,deadline)`와 `ValidationEvidence(build_id,job_sha,artifact_sha)`를 독립 보존한다. **판정: PoC.**

## 11. Open SWE #4312/#4296 — 오래된 승인 폐기와 Diff Selective Retrieval

**원본:** [#4312](https://github.com/langchain-ai/open-swe/commit/b439c53e27b97a4701a4680afb96cd7fd682c1a9), [#4296](https://github.com/langchain-ai/open-swe/commit/73952ef886f32ed029cdb86c674c4b9523835000).

**승인 갱신:** Push나 후속 리뷰로 이전 Open SWE approval이 무효화되면 앱이 승인 철회를 시도한다. Auto-review가 꺼져도 오래된 승인 회수 대상이며 인간 승인은 건드리지 않는다. P4에서는 `ApprovalReceipt(review_sha,cl_revision)`를 CL이 바뀌는 즉시 무효화한다. **판정: 바로 적용.**

**Diff retrieval:** `pulls/{n}/files` 변경 파일 페이지를 병렬 조회하며 전체 compare 호출을 줄인다. 파일의 원본 내용을 요구할 때만 `base/head` merge-base를 조회하고 24시간 TTL single-flight cache를 활용한다. 이는 GitHub API round-trip·I/O 최적화다. 모델 입력 토큰이 줄었다는 주장은 diff 부분 검색 결과를 실제 Prompt에 제한했을 때에만 검증 가능하다. P4 `describe`와 변경 파일 목록을 받고 필요한 파일 hunk만 추가로 조회하는 방식으로 PoC. **판정: PoC.**

## 12. Microsoft Agent Framework #9374 — Progressive Disclosure Consumer Skill

**원본:** [#9374](https://github.com/microsoft/agent-framework/commit/d0c3e6acfe4e3fb08887d13b4a1f9ddea0d6509c), [SKILL.md](https://github.com/microsoft/agent-framework/blob/main/skills/agent-framework-builder-python/SKILL.md), [skills/README](https://github.com/microsoft/agent-framework/blob/main/skills/README.md).

**구현:** `skills/agent-framework-builder-python/SKILL.md`는 plain agent, harness agent, workflow, declarative, evaluation, observability, extensibility, integration, hosting 등의 작업에 대해 경로를 선택하는 표를 제공한다. 선택된 항목의 `references/*.md`만 읽으라는 **explicit on-demand loading** 계약이 있다. `validate_agent_skill_links.py` 및 unit test/CI는 로컬 링크 오류를 찾아낸다. 소비자용 Skill을 개발자 내부 repo contributor 지침 폴더와 분리해 자동 로딩을 막는다.

**효과:** 관련 없는 참고문서 전체를 모델에 삽입하지 않아도 된다. 단, SKILL 본문과 선택 reference의 실제 tokenizer 결과·업무 품질 벤치마크는 없다. 잘못된 reference 선택은 정보 누락 위험이다.

**적용:** Perforce review/submit/CI/incident를 별도 `references`로 분리하고 라우팅 표+필수 안전 정책만 기본 SKILL에 유지한다. TeamCity에서 link checker와 필수 정책 coverage test를 실행한다. Full-load vs conditional-load의 input/cache tokens, USD/verified task, 오류 누락률 비교. **판정: 바로 적용 패턴, 절감률 PoC.**

## 13. Gemini CLI #29834 — Token/Cost 측정 필드 손실 방지

**원본:** [#29834](https://github.com/google-gemini/gemini-cli/commit/dbc73408840332c7faa0f40a4286641d7cdfc7a8).

**구현:** `converter.ts`, `hookTranslator.ts`, A2A `task.ts`가 `thoughtsTokenCount`, `toolUsePromptTokenCount`, `cachedContentTokenCount`를 보존하도록 변경했다. 응답의 total이 불완전할 경우 구성별 합과 제공된 total 중 더 큰 값을 보존하고, final usage 상태를 전달한 뒤 누적을 정리한다. 관련 테스트의 prompt 400·candidate 300·thought 700·tool use 100·cached 50은 **test fixture이지 개선 수치가 아니다**.

**적용:** Provider-neutral `UsageReceipt(input,output,reasoning,tool_use_prompt,cache_read,cache_creation,reported_total)`를 수집하되 모델마다 token field 의미가 다르므로 요금표·cache inclusion 규칙을 별도 매핑. `cachedContentTokenCount`를 total에 중복 합산하지 않는다. **판정: 바로 적용 원칙.**

## 14. Microsoft Agent Framework #9442 — Background Task 실행 Identity Fence

**원본:** [#9442](https://github.com/microsoft/agent-framework/commit/70ba23a3970cc8ab829eed2cc887a25137f3a1e5).

**구현:** `_harness/_background_agents.py`는 오래된 waiter가 동일 task ID의 새 continuation까지 완료로 확정하거나 in-flight map에서 지우지 못하도록 정확한 `asyncio.Task` 객체 identity를 비교한다. 테스트는 오래된 실행 complete/failed/cancelled와 새 실행 running/completed/finalized/failed 조합을 확인한다.

**효과:** token 절감이 직접 목적은 아니지만 불필요한 재실행과 잘못된 durable state 전이를 줄인다. Task ID만으로 정확한 실행 generation을 나타낼 수 없다는 점이 핵심이다.

**적용:** `TaskLifecycle(task_id,execution_generation,run_id,cl_revision,status)`와 immutable completion receipt를 사용한다. 오래된 completion이 새 CL 수정 작업을 종결하지 못하게 한다. **판정: 바로 적용 원칙.**

## 추가 추적 및 제외

- **RAG/selective context:** 기존 Open SWE index search·BM25 검색의 후속 정량 실험은 확인하지 못함. 오늘의 PR diff 병렬 다운로드는 Retrieval API 성능 변경이며 토큰 절감 측정은 아님.
- **Context compaction/pruning:** Claude 2.1.307 대형 Tool 결과의 thrashing 회귀, Codex reasoning 집계가 신선한 변화. 이미 보고한 idle compaction·stale thinking filter 반복 제외.
- **Skill/Prompt 경량화:** Microsoft 소비자 Skill의 reference lazy-loading과 local-link CI가 신규 구현; 실측 모델 토큰 개선률은 미발표.
- **Tool output 축약:** UTF-8 byte cap 이후 신규 절감률 없음. Tool 출력 축약은 raw artifact/sha를 보존하는 evidence 기반 PoC만 제시.
- **Model routing:** reasoning effort override 기능 변경은 확인. 품질 유지 조건의 최적 effort 조합은 미측정.
- **호환성:** [deepagents-code 0.2.0](https://github.com/langchain-ai/deepagents/releases/tag/deepagents-code%3D%3D0.2.0)과 [deepagents-talon 0.1.0](https://github.com/langchain-ai/deepagents/releases/tag/deepagents-talon%3D%3D0.1.0)은 Python 3.14 요구. UE/CI 고정 Python 환경에 즉시 운영 반영은 **도입 가치 낮음**. 별도 이미지 검증 권장.

## Perforce · Claude Code · Codex Harness 적용 로드맵

1. **바로 적용:** Mutating Tool의 `outcome_unknown` 상태+server receipt, CL revision에 결합된 Approval/Evidence Ledger, task execution-generation fence, accepted prompt만 token accounting에 반영.
2. **PoC 우선:** `SKILL.md` conditional reference read 및 Tool schema selective exposure; Codex reasoning effort stage routing; Memory V2/session resume revision cache; completion webhook을 사용하는 MDA Worker.
3. **PoC 후속:** P4 shelve→TeamCity validate→evidence verify→guarded submit 단계식 Controller; 별도 CI 이미지에서 Deep Agents Python 3.14 compatibility 확인.

**재현 설계:** 익명화된 30개 이상의 실제 P4 CL을 구현·리뷰·CI 오류 조사로 균등 구성한다. 동일 CL have revision, 모델 버전, Skill SHA, prompt/Tool catalog, cache 정책을 고정해 baseline vs candidate 비교. `input/output/reasoning/cache_read/cache_creation` token, 청구 USD/verified-task, Tool schema bytes, context compaction 횟수, critical evidence recall, stale authorization, duplicate submit, p95 latency, critical-path exclusive ms를 기록한다. 합격 불변조건은 **critical evidence recall 100%, stale approval 0, duplicate mutation 0, cross-stream 권한 노출 0**. 성능 수치를 만들지 않고 결과가 쌓이면 별도 검증 실험으로 게시한다.

## Wiki 반영 결과 — 2026-10-23

- 필수 canonical 경로: `jaywapp/wiki` → `develop` → `ai/trend/ai-harness-token-scout-2026-10-23.md`.
- 게시 전 GitHub `fetch_file`: **404, 파일 미존재**.
- GitHub Contents API `create_file(branch=develop)` **2회 모두 커넥터 안전 검사 차단**. GitHub API HTTP 403/branch protection 오류가 확인된 것은 아님.
- Fallback `automation/ai-harness-token-scout-2026-10-23` 브랜치는 생성되었으나 그 브랜치의 `create_file`도 안전 검사 차단, PR 생성되지 않음.
- 두 브랜치에서 최종 `fetch_file`: **404**. 따라서 **Canonical Wiki 미반영 / 임시 브랜치 문서 없음**. 이 파일은 원문 조사 결과를 보존한 Markdown 백업임.
- 커넥터 safety 차단이 정상 정책 판정인지 일시적인 오탐인지 내부 원인은 외부에서 확인할 수 없어 추정하지 않는다.