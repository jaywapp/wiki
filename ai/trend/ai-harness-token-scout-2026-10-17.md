---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-17"
date: 2026-10-17
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, claude-code, codex, deepagents, open-swe, perforce, durable-state]
---

# 2026-10-17 AI Harness · Context/Token Optimization Scout

> **조사 마감:** 2026-10-17 06:00 KST 부근(UTC 2026-10-16 21:00). GitHub 공식 커밋 메타데이터·diff·테스트 및 공식 릴리스를 확인했다. 주로 **2026년 10월 16일 UTC** 반영분이다. 토큰 절감 수치를 임의로 추정하지 않는다.

## 조사 및 중복 제거

`jaywapp/wiki`의 `develop/ai/trend/`를 GitHub API에서 직접 조회했다. 최신 canonical Scout 파일은 **10월 3일**이었다. 그 파일의 원문과 이 작업 환경에 보존된 **10월 10~16일 Scout**를 대조했다. 이미 보고한 Code Mode의 400개 Tool 축소, Child cache prefix 유지, offload path 보존, Guardian summary의 역할 분리, interrupted turn, Deep Agents 0.7.26 등을 반복하지 않았다. **독립적인 신규 RAG·Compaction 정량 벤치마크는 확인하지 못했다.** 변경이 토큰·비용을 낮출 가능성만 있는 경우 실측 성과와 분리했다.

## 오늘의 선별 결과

| 신규 구현·릴리스 | 구현상 핵심 | 효과/주의 | 도입 판단 |
|---|---|---|---|
| Claude Code **v2.1.302** | ToolSearch/compaction 후 cache miss 수정, Idle compaction 토글 | Cache hit·불필요 압축 비용 | **바로 적용 원칙 / A/B** |
| Claude Code **v2.1.302** | Fork Child 기본 동작 확대, Hook 동시 12개 제한, Resume Cost 누적 복구 | Context 상속·권한·비용 장부 | **바로 적용 원칙** |
| Codex **#54674** | Executor 간 파일을 Model Context 없이 stream 복사 | 대형 binary/log prompt 경유 제거 | **PoC 우선** |
| Codex **#54656** | MCP Tool List 변경을 같은 Turn에서 갱신 | 선택적 Schema·Capability 캐시 | **PoC** |
| Codex **#54619** | Hook 승인에 Plugin 내용 Hash 결합 | 승인의 유효성 확인 | **바로 적용** |
| Codex Guardian **#54589** | Evidence의 원래 Role·순서·Boundary 보존 | 신뢰도 및 재검증 정확성 | **바로 적용** |
| Codex **#54664/#54639** | 결과 미상 저장 구분·History record 스트리밍 | 중복 Replay·메모리 폭증 예방 | **바로 적용** |
| Codex **#54654** | Dynamic Tool Code Mode 병렬 실행 | 독립 조회 Latency 개선 | **PoC** |
| Deep Agents **0.7.27/#6853** | Async Child Status를 Parent에 알림·Wakeup | Lifecycle 개선, Polling 부하 | **PoC 우선** |
| Deep Agents **#6993/#6992** | Resume 시 실효 Interpreter 권한 비교 | 권한 세대 검증 | **바로 적용** |
| Open SWE **#4106/#4159** | PostgreSQL Thread Index + 모든 Agent/Reviewer의 MDA 실행 | Durable Runtime 경계 | **PoC 우선** |
| Open SWE **#4140** | Bridge의 대형 Tool 결과를 `/tmp/open-swe`에 보관 | Context 축약 경로 정정 | **바로 적용 원칙** |
| Open SWE **#4169** | 승인된 `--force-with-lease` 조건의 전송·검사 보존 | 승인 우회 방지 | **바로 적용** |
| Deep Agents **0.7.28/#6998** | `ContextHubBackend.glob(path)` 검색 범위 적용 | Selective Retrieval 정확성 | **바로 적용** |

## 1. Claude Code v2.1.302 — Cache boundary와 Idle Compaction

**신규성:** 10월 16일 20:53 UTC 공개된 공식 릴리스에서 세션 도중 추가한 Tool을 ToolSearch 또는 Compaction 후 다시 불러올 때 생기던 **prompt cache miss**가 수정됐다. Claude in Chrome 지침을 공유 가능한 System Prompt Cache 영역으로 이동했다. `/config`의 **Idle compaction** 켜기/끄기 옵션을 추가했다. 압축 중 Turn 중단에 따른 `Prompt is too long` 오류도 고쳤다. 서버측 Auto-Mode classifier의 입력이 너무 길면 Tool 호출을 모두 거부하지 않고 Compaction 처리한다.

**내부 원리·Token:** Stable Prefix 해시·Tool Catalog 순서가 달라 불필요한 Cache 재작성 비용이 생기는 것을 줄일 가능성이 있다. 반대로 Idle Compaction은 나중에 사용하지 않는 Summary를 미리 생성하면 추가 모델 비용을 쓸 수 있다. 공개 절감량은 없다.

**Perforce 실험:** `policy/core tools`를 Stable Prefix로 두고 `Pending CL/build/test`는 후속 Delta에 배치. `cache_read_tokens`, `cache_creation_5m/1h`, `tool_catalog_generation`, `compaction_trigger`, `unused_summary_cost`, verified success를 A/B 비교한다. **평가: Prefix 안정성 바로 적용, Idle Compaction은 PoC.**

근거: [공식 릴리스](https://github.com/anthropics/claude-code/releases/tag/v2.1.302) · [CHANGELOG](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md).

## 2. Claude Code v2.1.302 — Fork/Hook/Cost/Task Lifecycle

**신규성:** `subagent_type: "fork"`가 `claude -p`, Agent SDK, 데스크톱, VS Code에서도 기본 활성화됐다(`CLAUDE_CODE_FORK_SUBAGENT=0`으로 비활성). Prompt/Agent Hook은 이벤트당 **최대 12개 동시 실행**한다. 새로운 프로세스에서 재개한 Cloud Session 비용이 0부터 다시 시작하던 문제를 수정했다. Cloud Routine이 실패 후 상당 시간이 지나 처음부터 재실행돼 같은 보고서를 두 번 게시할 수 있던 버그도 고쳤다.

**원리·Trade-off:** Fork 상속으로 Parent 탐색 비용을 줄일 수도 있지만 큰 History까지 복사하면 Token이 늘어난다. Hook 동시성 제한은 CPU·Tool 과부하를 줄이는 대신 대기시간이 늘 수 있다. Cost Resume 정합성은 직접적인 절감이 아닌 비용 측정의 신뢰도를 개선한다.

**Perforce:** `fork_or_isolated`, `parent_prefix_hash`, `effective_tool_policy`, `hook_queue_wait_ms` 기록. Submit/Build는 `operation_id` 중복 방지 Gate를 반드시 두고 Reviewer는 격리된 Child를 기본 대조군으로 둔다. **평가: 원칙 바로 적용, Child 방식 선택은 A/B.**

근거: [Claude Code v2.1.302](https://github.com/anthropics/claude-code/releases/tag/v2.1.302).

## 3. Codex #54674 — 대형 파일의 Model Context 비경유 전달

**신규성·구현:** 새 Opt-in Extension `codex-rs/ext/multi-env-copy-file`의 `multi_env_copy_file(source_environment_id, source_path, target_environment_id, target_path)`는 서로 다른 Executor 사이에서 파일을 stream read/write한다. 각 Endpoint의 절대경로·Sandbox·Permission을 확인하며 오래된 Executor에는 Buffered Fallback을 적용한다. 모델에 본문 대신 `bytes_copied`만 반환한다. 같은 환경 간 복사는 거부한다. Binary 양방향, 원격, 연결 실패, 권한 테스트가 포함됐다.

**Token 절감 원리:** 파일 내용을 `read → LLM → write`로 실어 나르지 않아 파일 크기에 비례하는 Prompt/Output Context 오염을 피한다. 네트워크·디스크 I/O 비용은 남는다. **중단 시 대상이 부분 기록될 수 있어**, 단순 `bytes_copied`를 최종 Evidence로 신뢰해서는 안 된다.

**Perforce PoC:** TeamCity Build Artifact 및 Perforce `p4 print` 파일을 Control Plane에는 `source,target,path,bytes,sha256,transfer_id`만 두고 전송. 추가적인 **임시 파일·SHA 검증·Atomic Rename**을 구현한다(업스트림 기본 기능이라는 뜻이 아님). **평가: PoC 우선.**

근거: [#54674 Diff](https://github.com/openai/codex/commit/e7de1f444089c29ac002e3df08d940f6de8a2613) · [핵심 소스](https://github.com/openai/codex/blob/e7de1f444089c29ac002e3df08d940f6de8a2613/codex-rs/ext/multi-env-copy-file/src/tool.rs).

## 4. Codex #54656 — Event-driven MCP Tool Discovery

**구현:** 기본 비활성 `mcp_tool_list_changed`가 MCP Tool 목록 변경 Notification을 같은 Turn 안에 반영한다. Transport 순서 보존, 중복 Refresh 병합, 초기 목록 및 Pagination 중 변경 시 재조회, 실패하면 마지막 정상 Catalog 유지 및 **5초 Cooldown**, 영향을 받은 Startup Cache 무효화 기능이 있다. 이미 승인된 Tool 실행은 계속 진행한다. Direct/Code Mode의 알림·Timeout·경쟁 상태 테스트가 추가됐다.

**원리:** 전체 Tool Catalog를 매번 다시 읽는 비용을 피하면서 실제 변경된 Tool만 갱신한다. 다만 Prompt Prefix가 변경되고 신뢰하지 못할 Server Notification에 좌우될 수 있다. 수치화된 Token 절감량은 없다.

**Perforce:** `ToolCatalogSnapshot(generation, notification_seq, tool_ids, plugin_content_hash, permission_generation)`로 상태 관리. P4/TeamCity Server가 Tool Capability를 바꾼 경우 ACL과 Schema를 함께 갱신. **평가: PoC.**

근거: [#54656](https://github.com/openai/codex/commit/0df4aa67781ae45a3c97befa4db48b734afe46d9) · `codex-rs/codex-mcp/src/client_tool_catalog.rs`.

## 5. Codex #54619 — Plugin Hook 승인 대상에 실행 파일을 포함

**구현:** 선언이 동일해도 Hook Script가 교체될 수 있는 문제를 해결하기 위해 Plugin Bundle Content를 Fingerprint하여 `trusted_content_hash`를 저장한다. **Command/MCP Hook 실행마다** Timeout 안에 승인된 내용과 비교하고, 파일이 바뀌면 재승인을 요청한다. 레거시 선언 중심 승인 기록은 immutable baseline으로 이전한다. `.venv`, bytecode, `.egg-info`와 같은 생성물은 해시에서 제외한다. Upgrade, Rollback, 실행 중 수정의 회귀 테스트가 있다.

**비용·장단점:** 직접 Token 최적화가 아닌 안전한 재사용이다. 검사에 I/O가 들고 변경마다 승인 부담이 있다. 그러나 승인된 과거 내용이 현재 Tool 실행 권한을 보장하지 않는 오류를 줄인다.

**Perforce:** `HookApprovalReceipt(hook_id, trusted_content_hash, policy_generation, approved_by, expiry)`를 두고 Submit/Workspace mutation Hook 실행 직전에 재검증한다. **평가: 바로 적용.**

근거: [#54619](https://github.com/openai/codex/commit/2bf2bdf82c33f4c66ba3f0767b8e4b6a933aac40), `codex-rs/hooks/src/engine/command_runner.rs`, `mcp_runner.rs`.

## 6. Codex Guardian #54589 — Evidence Role/Boundary/Phase 보존

**신규성:** 선택적 Guardian Decisions 비교기가 User 이외 Evidence, Trusted Skill 메시지를 거부하거나 Tool Evidence를 Rubric에 섞던 문제를 수정했다. 메시지별 **원래 Role, Content 순서, Boundary, Optional Phase**를 유지하며 `input_text`와 `output_text`를 지원한다. 이미지는 User 메시지만 허용한다. Unsupported Evidence는 전체를 거부하고, Shadow Comparison 결과는 기존 Baseline Risk를 변경하지 않는다는 테스트가 있다.

**원리·Trade-off:** 요약과 압축에서 출처 메타데이터를 보존하므로 재검토 및 승인 오인 위험을 낮춘다. Boundary Metadata의 소량 Token 비용은 있을 수 있으나 검증 안전성이 우선이다. 실측 절감량 미공개.

**Perforce:** `EvidenceRecord(role,phase,actor,authority,tool_call_id,source_revision,artifact_ref)`를 유지하고 본문만 축약한다. **평가: 바로 적용.**

근거: [#54589](https://github.com/openai/codex/commit/144779cd243d395af79c6e7a0d5d0ae9ed344efc), `codex-rs/ext/guardian-v2/src/async_scorer/decisions.rs`.

## 7. Codex #54664/#54639 — Write Outcome과 대용량 History Replay

**구현:** Thread Store Error를 `Retryable`(재시도 안전한 조건)과 `OutcomeUnknown`(이미 반영됐을 수 있음)으로 구분한다. **어느 쪽도 자동 재시도하지 않으며**, Owner가 후속 판정한다. History Materialization은 unread rollout suffix를 전부 할당하지 않고 `BufReader`로 캡처한 파일 끝까지만 Record 단위로 읽는다. Newline이 없는 Partial Record는 다음 읽기까지 보류하고 파일 축소는 `UnexpectedEof`로 실패 처리한다. Record당 **64KiB Padding** 테스트가 있다.

**원리:** duplicate write/replay를 줄이고 대량 Session 복원 시 메모리 사용량을 낮춘다. 이것은 곧바로 LLM Token 절감 실측을 뜻하지 않는다.

**Perforce:** `OperationWriteReceipt(id,status=applied|not_applied|unknown,external_job_id)`를 두고 Unknown일 때 TeamCity Build ID와 P4 Server State를 조회한 다음 재시도 여부 결정. Resume Projection에는 Byte Offset/Partial-Record 복구를 적용한다. **평가: 바로 적용.**

근거: [#54664](https://github.com/openai/codex/commit/96eb400d1231f0199e96f640c740096087cf3e9b), [#54639](https://github.com/openai/codex/commit/4491caf1ad063f753381500454b599d750e50848).

## 8. Codex #54654 — Code Mode Dynamic Tool 동시 호출

**구현:** `DynamicToolHandler.supports_parallel_tool_calls = true`로 변경하여 `Promise.all`의 Dynamic Tool Call이 Client 응답을 기다리는 동안 병렬 실행된다. 테스트는 두 요청을 모두 받은 후 **응답을 역순으로 처리**하고 반환 순서를 검증한다. **효과:** 독립적인 조회의 Latency 감소 가능, Tool Schema와 호출 횟수 자체는 줄지 않는다. 같은 P4 Client에 쓰기 명령을 병렬 수행하면 위험하다. **평가: read-only 검색·검증 Tool에 한해 PoC.**

근거: [#54654](https://github.com/openai/codex/commit/beae473be8564d884a8cfe9704194a5c803d2ac1).

## 9. Deep Agents 0.7.27/#6853 — Async Child 완료를 Parent에게 통지

**신규성:** 10월 16일 19:25 UTC 공개된 `deepagents==0.7.27`은 Child의 `success/error/timeout/waiting`을 Parent가 알도록 했다. Parent는 Run 시작/Model Call 전/마지막 응답 뒤 미완료 Task를 병렬 조회(**5초 timeout**), Child가 동일 배포에서 실행되면 Parent가 Idle 상태일 때 Wake-up Run을 시작할 수 있다. `multitask_strategy="reject"`로 Busy Parent를 덮어쓰지 않는다. `TaskEvent(task_id,agent_name,status,run_id)`를 `deepagents_notification`에 기록하고 같은 상태를 중복 보고하지 않는다. #6987은 Child 이름 상속을 보완한다.

**트레이드오프:** 공식 PR은 미완료 Task당 **1~3 API 요청**이 Model Call 전 발생하여 100개 Child에서 부하가 크다고 명시한다. 다른 배포의 Child는 Pull-only, Parent가 Checkpoint 전에 Crash하면 Task를 추적하지 못할 수 있다. 따라서 재조회 비용과 모델 Notification Token을 별도로 측정해야 한다.

**Perforce:** `TaskLifecycleEvent(parent,child,status,event_generation)`의 durable 기록과 Event-driven Wakeup을 분리. Polling은 TTL 기반으로 상한 부여. **평가: PoC 우선.**

근거: [0.7.27 릴리스](https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.27), [#6853](https://github.com/langchain-ai/deepagents/commit/9cf009bb21b6bf3578f94555ac4ebfbc59d4e500), [#6987](https://github.com/langchain-ai/deepagents/commit/610a5fb036120e272842684e4bbd4909c6cf7c1f).

## 10. Deep Agents #6993/#6992 — 실효 권한에 근거한 Resume Gate

**구현:** Omitted Interpreter Flag와 Explicit Flag가 실제로 같은 권한이면 Resume 가능하도록, Raw Invocation Flag가 아니라 `InterpreterConfig`가 해석한 **Effective Permission/Unsafe Acknowledgement**를 durable workspace binding에 저장한다. Managed Policy가 Invocation Override보다 우선한다. 과거 권한이 불명확하거나 Allowlist/Unsafe 설정이 달라지면 **fail-closed**. #6992는 이 거부를 Model 초기화 오류로 잘못 보고하지 않도록 했다.

**Token/품질:** 표현만 다른 동일 권한 때문에 재작업하는 비용을 줄일 수 있지만, 권한 비교가 잘못되면 보안 문제가 커진다. **Perforce:** Policy Generation, Workspace Generation, Effective Permission Fingerprint를 함께 확인. **평가: 바로 적용.**

근거: [#6993](https://github.com/langchain-ai/deepagents/commit/23361fb4bf796016e4ad7e07d0b223c02765491f), [#6992](https://github.com/langchain-ai/deepagents/commit/0dfa1f6047006687b825d7909f9a3a890934057b).

## 11. Open SWE #4106/#4159/#4153 — 모든 Agent/Reviewer의 Managed Runtime 이전

**신규성:** 이전 Scout에서 소개한 #4053의 Runtime Adapter 분리 원칙이 **PostgreSQL Thread Index/Job Queue(#4106)**와 **MDA 전면 전환(#4159)**으로 확장됐다. 모든 Agent·Reviewer Thread의 Model Loop·Checkpoint는 Managed Deep Agents의 단일 `open-swe` Graph가 담당한다. Backend는 Sandbox, User Connection, Credentials, GitHub/Slack 연동을 소유한다. `MDA_RUNTIME_URL` 없이는 Backend가 시작되지 않는다. 서명된 Run Token으로 Backend Hook을 호출하고, 별도 MDA 배포에는 영구 GitHub/DB Credential을 두지 않는다. `mda/README.md`는 `catalog/prepare/before_model/model_result/after_model/after_agent` 등의 Hook 경계를 문서화한다. #4153은 명시적 Model Switch를 다음 호출에 반영한다.

**장단점:** Runtime 교체 가능성·Trace/Checkpoint 일관성을 확보하지만 단일 MDA Endpoint 장애가 모든 작업으로 전파되고 Tool Catalog/Backend 권한 불일치 가능성이 생긴다. 토큰·비용 절감률 미공개.

**Perforce PoC:** Model Loop/Checkpoint는 Runtime Adapter, `WorkspaceLease/PendingCL/TeamCityEvidence`는 Backend에 두고, 동일 Read-only Task를 두 Runtime에서 실행. Resume, Permission, Token/Cost, External Operation 중복 여부를 검증한다. **평가: PoC 우선.**

근거: [#4106](https://github.com/langchain-ai/open-swe/commit/f509971e0c7d59f4317ae26750962aa5ca71a8ae), [#4159](https://github.com/langchain-ai/open-swe/commit/4550c8c6f39d4e92b3bea787eb84f2ee781763d5), [#4153](https://github.com/langchain-ai/open-swe/commit/987b716025297c148b01fce648db69f62bdd549c), [Runtime 안내](https://github.com/langchain-ai/open-swe/blob/4550c8c6f39d4e92b3bea787eb84f2ee781763d5/mda/README.md).

## 12. Open SWE #4140 — Local Bridge Tool Output 축출과 Handoff

**문제:** Local Bridge의 Sandbox는 루트(`/`)에 `/large_tool_results`나 `/conversation_history`를 생성할 수 없어 대형 Tool Message 축출이 실패했고, 원문이 Context에 남았다. **수정:** Bridge에 `artifacts_root=/tmp/open-swe/{thread_id}/`를 지정하고 그 위치에 로컬 오프로드한다. Blob 저장소는 별도 StoreBackend에 유지한다. 다른 Sandbox로 Handoff하면 과거 File Reference가 없어질 수 있다고 Agent에게 경고한다.

**Token/품질:** 모델에게 원문 대신 짧은 경로를 보여 줄 수 있게 된다. 그러나 `/tmp` 파일은 Durable Evidence와 다르고 환경 이동 시 사라질 수 있다. **Perforce:** `OffloadReceipt(storage_tier=ephemeral|durable, resolved_path, hash, retention)` 구분. 승인 Evidence는 Durable로만 인정. **평가: 바로 적용 원칙.**

근거: [#4140](https://github.com/langchain-ai/open-swe/commit/60a6012a1f61cf4f6bc215ba48a29923b03615ba), `openswe/bridge/constants.py`, `openswe/server.py`.

## 13. Open SWE #4169 — 변경 승인 뒤에도 Force-with-Lease 조건 유지

**구현:** 승인 Gate가 `git push --force-with-lease`를 복합 명령으로 오분류하는 문제를 수정했다. Lease를 검사·보존한 상태에서 대상 Commit SHA를 고정한 Push로 변환한다. Qualified Branch를 정규화하고 검사를 수행할 수 없으면 **실행 없이 거절**한다. Git Workflow Approval과 단순 Push의 차이, 유효성 검사 실패 회귀 테스트가 있다.

**Perforce:** 승인된 CL Revision/Workspace Generation과 실제 Submit 대상이 같음을 실행 직전에 다시 확인한다. **평가: 바로 적용.**

근거: [#4169](https://github.com/langchain-ai/open-swe/commit/775bc5710588282190ded0b6d1948a870d0994b3).

## 14. Deep Agents 0.7.28/#6998 — 검색 범위 필터링

**신규성:** 10월 16일 20:21 UTC 출시된 `0.7.28`은 `ContextHubBackend.glob`가 전달된 `path`를 무시하던 문제를 고쳤다. 캐시된 전체 목록을 `_filter_files_by_path(..., root)`로 Scope 제한 후 반환한다. 검색이 요청 범위 밖 결과를 섞지 않도록 하는 **Selective Retrieval Correctness** 개선이며 Token 실측은 없다.

**Perforce:** Depot Path 범위에 대응하는 Index Path Filter와 Coverage Complete Flag 테스트를 추가한다. **평가: 바로 적용.**

근거: [0.7.28 릴리스](https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.28), [#6998](https://github.com/langchain-ai/deepagents/commit/dd6706d3007b4a077985b38bbc0d4a792c7016bc).

## 재현 가능 PoC 설계

**제안 데이터셋:** 읽기/검색 15건 + 대형 로그 진단 10건 + Reviewer Evidence 10건 + Resume/Approval 장애 주입 10건 + Handoff 5건 = **50 Task**. 각 Task는 동일 Workspace Snapshot·모델·Effort를 유지하고 Baseline/Candidate를 교차 실행, 최소 3회 반복한다. 이 표본 크기는 **내부 제안**이지 업스트림 Benchmark가 아니다.

**기록할 Receipt:** `task_id`, `run_id`, `parent_task_id`, `requested/resolved_model`, `effort`, `input/output/cache_read/cache_write_5m/cache_write_1h_tokens`, `billed_cost`, `tool_schema_bytes`, `original/projected_tool_output_bytes`, `tool_catalog_generation`, `compaction_reason`, `permission_hash`, `workspace_generation`, `evidence_id`, `verified_outcome`, `duplicate_external_actions`, `latency_ms`.

**판정 기준:** `total_billed_cost/verified_success`, `wall_time/verified_success`, `critical_defect_recall`, `evidence_preservation_rate`, `cache_hit_rate`, `duplicate_p4_submit_or_TeamCity_run`를 동시에 비교한다. 우선 Gate는 `forbidden_tool_executions=0`, `unknown_write_auto_replays=0`, `evidence_hash_mismatch=0`. 비용 감소만으로 품질 저하를 정당화하지 않는다.

## 지속 추적: Durable State · Runtime Adapter · Evidence · Handoff · Task Lifecycle

| 축 | 이번 관찰 | 다음 확인 |
|---|---|---|
| Durable State | Codex Store OutcomeUnknown + Incremental Rollout Materialization, Open SWE PG Thread Index | Partial Record·Unknown Commit Recovery |
| Runtime Adapter | Codex Binary Transfer, Open SWE Managed Runtime 전면 전환 | Workspace Owner/Permission Generation 일치 |
| Evidence Verification | Guardian 원래 Role/Phase 보존, Workflow Push 승인·Lease 유지 | Summary가 Authority를 대체하지 않는지 검증 |
| Handoff/Ledger | `/tmp` Local Offload와 환경 간 파일 복사 | Handoff 후 Artifact Hash와 재조회 가능성 |
| Task Lifecycle | Child TaskEvent Parent Wakeup, Cloud Routine 중복 시작 수정 | 중복 Wakeup·중복 Build·중복 Submit 방지 |
| Token/Context | Claude ToolSearch Cache Miss 해결, Scoped Glob | Cache Read 증가가 총비용과 성공률 개선으로 이어지는지 |

## Wiki 반영 결과(실제 검증)

- **요청 경로:** `jaywapp/wiki` → `develop` → `ai/trend/ai-harness-token-scout-2026-10-17.md`.
- **직접 생성 요청:** **실패.** GitHub 연결의 `create_file` 호출이 **OpenAI 안전성 검사**에서 차단됐다. GitHub API 커밋 SHA가 반환되지 않았다.
- **반영 검증:** 생성 시도 직후 같은 Repository/Branch/Path를 `fetch_file`로 다시 조회하여 **404 NOT_FOUND**를 확인했다. **`develop` 반영 실패가 확정**됐다.
- **백업:** 이 파일은 해당 보고서의 다운로드용 Markdown 백업이다. 다른 `ai/news/`, `ai/tools/`, `ai/harness/`, `ai/research/`, `ai/tips/`에 날짜별 수집 문서를 쓰지 않았다.