---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-20"
date: 2026-10-20
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, perforce, claude-code, codex, deep-agents, durable-state]
---

# 2026-10-20 AI Harness · Context/Token Optimization Scout

**조사 기준:** 2026-10-20 오전 6시(KST), GitHub UTC 10월 18일 21시 이후~19일 21시 무렵의 유의미한 업데이트. **주의:** 소스 커밋 확인과 실제 제품·모델 API 배포는 다르다. 업스트림 기능 중 기본 비활성인 경우 명시한다.

## 0. 조사·중복제거·증거 기준

원본 GitHub 저장소 `openai/codex`, `langchain-ai/open-swe`, `langchain-ai/deepagents`, `anthropics/claude-code`의 최근 커밋과 주요 Diff·테스트를 확인했다. `jaywapp/wiki`의 `develop`에서 `ai/README.md`, 기존 `ai/trend/` Scout 및 2026-10-03 문서 존재를 확인했다. 10월 19일 canonical 문서는 `develop`에서 404였으므로, 직전 실행에서 제공한 10월 19일 보고서를 중복 비교 기준으로 삼았다. 직전의 Codex 비동기 Root Wake, Open SWE Monitor, Runtime 소유권, StateHarness는 반복하지 않았다.

오늘 주목할 **신규/실질 변화 10개 흐름**, 추적사항 2개를 정리한다. `구현 확인`은 커밋과 코드·테스트를 대조했다는 뜻이며 `절감 가설`은 내부 Harness에서 별도 실험해야 한다는 뜻이다. 공개되지 않은 절감률은 만들지 않는다.

## 1. 요약

| 항목 | 변경 | 효과/한계 | 평가 |
|---|---|---|---|
| Codex #55368 | Responses Lite 증분 Tool Catalog 기본 활성화 | 반복 Tool Schema 감소 가능; 모델 토큰 실측 없음 | **PoC** |
| Codex #55357 | Step 준비 Hook 후 Skill/Tool Catalog 고정 | Tool 준비 실패·재탐색 방지, 직접 토큰 절감 아님 | **바로 적용 원칙** |
| Open SWE #4256/#4257 | Managed Runtime에서 개인 Skill 복원, Model 전용 Coordinator Tool Surface | 런타임 전환 Capability 결손 예방 | **바로 적용 / PoC** |
| Codex #55327/#55331/#55375 | Subagent에 상속할 환경과 임시 첨부를 분리; Eviction/Resume 검증 | Child 재탐색 감소 가능, 잘못된 Workspace 상속 위험 | **PoC** |
| Open SWE #4186 | Backend Hook/Phase 응답 불명 시 Side Effect 자동 재실행 금지 | 중복 작업·비용 방지, 중단 회복 지연 Trade-off | **바로 적용** |
| Codex #55380/#55365 | Rollout 생성 전 Thread 메타데이터 유지, Claude Continuation 중복 Import 방지 | History 중복 주입·Parent 정보 유실 감소 | **바로 적용** |
| Codex #55347/#55293 | Guardian Retry 원래 Turn에 비용 귀속; 연속 Effort Update는 요청에서만 병합 | 비용 장부 정확성, 소규모 Context 중복 완화 | **바로 적용** |
| Open SWE #4245 | 이전 취소된 CI를 최신 워크플로와 구분 | 잘못된 실패 분석·재작업 예방 | **바로 적용** |
| Open SWE #4222 | Thread 검색 Index 전환, 응답 Projection과 Repo Cache 최적화 | 기존 최대 약 400개 순차 API 조회 문제 완화(모델 토큰 실측 아님) | **PoC** |
| Deep Agents Talon #7043 | 모델별 Reasoning Effort 영속화·Turn Snapshot | Task 난도별 모델 추론비용 라우팅 실험 가능 | **PoC** |

## 2. 구현 상세와 Perforce 적용

### 2.1 Codex #55368 — Incremental Tool Catalog를 Responses Lite 기본 동작으로

- **신규성:** 2026-10-19 20:01 UTC. `incremental_tools`를 Stable·기본 활성화. Responses Lite의 첫 Turn Tool Declaration 및 이후 변경 Catalog를 Request History에 증분 반영. Compaction/Model Switch/Child Agent의 Tool 변경과 기본 설정 테스트 추가.
- **내부 원리:** Tool/MCP Catalog를 통째로 재선언하는 대신 추가·변경 선언을 기록으로 유지. 이는 반복 Schema Byte와 Prompt Prefix 변동을 줄일 수 있는 설계이지만, 모든 API 또는 모든 Model에 동일하게 적용된다고 확장해서는 안 된다.
- **토큰/품질:** 공개 전후 billed token 수치 없음. 동적 MCP 수정 시 Catalog 불일치·Tool 호출 실패 가능성이 있어 테스트 필수.
- **Perforce PoC:** 20개 P4·TeamCity Tool, 동일 30-Turn 시나리오로 전체 재선언 대 증분 선언 비교. `schema_bytes`, `input_tokens`, `cache_read/write_tokens`, ToolNotFound, VerifiedTaskCost를 수집. **평가: PoC.**
- 소스/테스트: https://github.com/openai/codex/commit/c953dacb42d2773d0ca9cc25a01129bba2ca36a8 (`codex-rs/features/src/lib.rs`, `codex-rs/core/tests/suite/scenarios_incremental_tools.rs` 등).

### 2.2 Codex #55357 — Step별 Capability 준비와 노출의 원자적 순서

- **신규성:** 2026-10-19 19:33 UTC. `ToolContributor::prepare_for_step` 비동기 Hook을 추가하여 준비 완료 후 Tool을 만든다. 이전에는 World State Rendering이 Skill Catalog 생성의 부작용이어서 렌더링 전 Tool 호출이 `skill catalog is not ready` 오류를 낼 수 있었다.
- **내부 원리:** Skill, Alias, Plugin Policy, Config의 Step Snapshot을 Tool/World State/Invocation Detector가 공유. Config Reload는 다음 Step에 반영하고 실제 Skill 파일 Read Authorization은 계속 검사한다.
- **토큰/품질:** 준비 오류로 재호출하는 모델 Turn 감소는 가설; 시작 시 준비 대기 시간은 늘 수 있다. 직접 토큰 절감 실측 없음.
- **적용:** `StepCapabilitySnapshot = {skill_hashes, mcp_catalog, policy_generation, p4_client, stream, executor_id}`를 생성한 뒤 Tool Schema 확정. Preflight 실패 시 모델 노출을 막는다. **평가: 바로 적용 원칙.**
- 소스/테스트: https://github.com/openai/codex/commit/9b865ab31e2c225cb82d99d1e62d7a6f670729ca (`session/step_context.rs`, `extension-api/src/contributors.rs`, `executor_discovery_v2.rs`).

### 2.3 Open SWE #4256/#4257 — Runtime Migration의 Skill/Tool Surface 회귀 방지

- **신규성:** 10월 19일 18:53~19:00 UTC. Managed Deep Agents는 명시 등록된 Middleware만 실행하므로 Private Thread의 개인 Skill을 누락하던 문제를 `SkillsMiddleware` 명시 등록으로 수정. 서브에이전트도 동일 Middleware를 재사용. Coordinator 도구(`spawn_worker`, `control_worker`, `message_task_thread`)가 Sandbox Tool Filter 때문에 Model List에서도 제거되던 문제를 `ToolSurface(for_model=True)`로 수정.
- **내부 원리:** **Model-direct Tool과 Sandbox HTTP/Code Mode Tool을 구별**하고, 작업 조정 권한은 모델 전용 표면에만 제공. 기존 Role/Permission 검사 유지.
- **토큰/품질:** Tool 가용성 결손으로 인한 불필요한 검색을 막을 수 있으나 직접 Model에 노출되는 Tool 정의가 늘면 Input Token은 커질 수 있다.
- **적용:** Claude Code/Codex Runtime Adapter마다 Private/Public/Child Agent 역할의 `expected_skill_set`·`model_direct_tool_set`·`sandbox_tool_set`을 계약 테스트. 권한과 발견을 분리. **평가: 바로 적용 원칙 / PoC.**
- 소스: https://github.com/langchain-ai/open-swe/commit/cb4d1652dcae015054081a95653c2207b261067f (`openswe/server.py`), https://github.com/langchain-ai/open-swe/commit/1f5d79c4713ceebbf735238e68591d844d1f8e11 (`openswe/remote_runtime/graph.py`, `sandboxes/tool_runtime.py`).

### 2.4 Codex #55327 → #55331 → #55375 — Subagent 환경 상속 정책 수정의 왕복

- **신규성:** 같은 날 구현이 추가/제거/재추가되었다. **가장 최근인 #55375(20:30 UTC)**는 기본 비활성 `subagent_thread_environments`를 다시 추가했다. Parent의 **Configured Thread Environment**를 Child Spawn Step에서 캡처하면서 **Turn-only Attachment**는 Child의 영구 환경으로 보존하지 않는다.
- **내부 원리:** Evict 시 Environment Selection 및 Binding을 별도 저장, 이후 복구 시 Parent의 Workspace Root·권한·적합성을 재검증. 신규 Child/기존 Child/Fork/Pending Config 및 Workspace 변경 테스트. 중간 #55331의 단순화만 보고 최종 동작으로 주장하면 틀린다.
- **토큰/품질:** 중복 환경 검색·부팅을 줄일 여지는 있으나 Cross-Stream 상속은 심각한 무결성 오류. 직접 절감량 없음.
- **적용:** `p4_server`, `stream`, `client`, `workspace_root`, `policy_generation`, `executor_generation`을 Child Snapshot으로 주고, 일회성 Attachment는 제외. Evict→Resume 및 Parent Client Change를 필수 회귀 테스트로 고정. **평가: PoC** (업스트림 기본 비활성).
- 소스: https://github.com/openai/codex/commit/d70c2c2cdf0226b4b5d393d30c6785850d0ce85b , https://github.com/openai/codex/commit/fbb2f9dbec300d59699e52a47ecd9fa49f28b948 , https://github.com/openai/codex/commit/e389b2444c75cbc92d40b2135ca5db300d076979 (`agent/control/residency.rs`, `session/environment.rs`, Snapshot Tests 등).

### 2.5 Open SWE #4186 — Backend 불명 응답에 Side Effect Hook 자동 Replay 금지

- **신규성:** 2026-10-19 16:34 UTC. Managed Backend의 `prepare`, `before_model`, `after_model`, `after_agent` 실행 중 502/503/504 등 Gateway 오류가 생겼을 때 실행되었는지 알 수 없는 Hook을 재시도하면 Side Effect를 중복할 수 있다. 변경 이력 중간에는 Retry 시도가 있었으나 **최종 변경은 Unknown 상태를 사용자에게 알리고 Replay를 차단**한다.
- **내부 원리:** `open_swe_backend_failure`를 Run State에 기록하고 Completion Notification으로 전달. `Tool` 자체를 재실행하지 않는 회귀 테스트 포함. 일부 PostgreSQL/환경 의존 검증은 실행되지 못했다고 Commit에 기록됨.
- **토큰/품질:** 중복 P4 Write/Build Trigger와 모델 재호출 비용은 줄일 수 있으나 자동 복구 빈도는 감소. 토큰 절감률 실측 없음.
- **적용:** `ExecutionReceipt={task_id, turn_id, call_id, phase, idempotency_key, external_operation_id, status}`. `unknown_after_dispatch`는 `p4 shelve/submit`, TeamCity Trigger 자동 재실행 금지. 외부 상태 먼저 조회. **평가: 바로 적용.**
- 소스: https://github.com/langchain-ai/open-swe/commit/a8463926d1df0e67569a8792890a878eaa6c4a33 (`mda/rt/backend.py`, `middleware.py`, `completion.py`).

### 2.6 Codex #55380/#55365 — Durable Metadata와 Handoff History의 중복 방지

- **신규성:** #55380(2026-10-19 21:02 UTC)은 SQLite Thread Meta가 Rollout File보다 먼저 생기는 구간에서 Parent/Fork 속성이 유실되던 문제를 수정했다. Rollout Writer가 지연된 Creation Meta를 제공하고 DB Meta와 병합한다. 저장되지 않은 Thread의 Fork/Resume 거절 원칙은 유지. #55365(19:53 UTC)는 Claude Background Session의 `continued-in` Record를 보고 Parent와 전체 History를 담은 Continuation을 **둘 다 Import하지 않도록** 수정했다.
- **토큰/품질:** 중복 History 주입, 불필요한 파일 검색, 잘못된 Parent 복원 감소; 전후 토큰 미측정. DB/File 간 일관성 로직 복잡도 증가.
- **적용:** Session Lineage(`parent_id`, `continuation_of`, `import_source`, `history_digest`)와 Task Ledger, Evidence Storage, Rollout Transcript를 별도로 유지. Import는 Continuation 하나를 대표로 택하고 Digest 중복 검사. **평가: 바로 적용.**
- 소스: https://github.com/openai/codex/commit/1e4ba692b841edc8e51295a631f07d83d9f69b0d (`rollout/src/recorder.rs`, `thread-store/src/local/read_thread.rs`), https://github.com/openai/codex/commit/ee8b4ea181dc5baa735c0cd9ec5009a85d2e46fb (`external-agent-migration/src/detect/sessions/cla.rs`).

### 2.7 Codex #55347/#55293 — Guardian Retry Cost 귀속과 Request Projection 경량화

- **신규성:** #55347(18:49 UTC)은 Guardian의 `attempt_count`, `retry_outcome`, `retry_wait_ms`, `failure_reason`, `required_sync`를 계측하면서 **원래 Turn의 Telemetry와 Model**에 비용을 귀속한다. #55293(14:34 UTC)은 장애 복구 시 인접한 `configuration_update`(Reasoning Effort) 항목 중 마지막만 Model Request로 내보낸다. **저장된 History는 손대지 않는다.**
- **토큰/품질:** Reviewer Retry 비용 장부의 정확성이 개선되고 요청 중복 Item만 줄어든다. 다만 모델 Input 절감 수치와 성공률 개선 수치는 없음. 높은 Telemetry Cardinality 주의.
- **적용:** `CostReceipt={origin_turn, model, effort, actual_input, output, cache_read, cache_write, review_attempts, retry_wait_reason, cost}`. History는 Append-Only, Model Request는 검증된 Projection으로 분리. **평가: 바로 적용.**
- 소스: https://github.com/openai/codex/commit/941b32bf57e520f506cda9741de615f64f53fbe6 (`ext/guardian-reviewer/src/metrics.rs`, `retry.rs`, 테스트), https://github.com/openai/codex/commit/7c073196a1673a0b248b2e5edfb7548d2c2290ac (`core/src/client.rs`).

### 2.8 Open SWE #4245 — 오래된 CI 취소와 실제 실패의 분리

- **신규성:** 2026-10-19 14:49 UTC. 같은 SHA의 이전 Cancelled/Stale GitHub Actions Check를 최신 Run과 구분한다. App ID, Workflow ID, Event, Check Name이 같은 최신 Workflow Run으로 **대체된 경우만** 이전 취소를 Filter. 검증 불가하거나 다른 Workflow라면 취소를 마음대로 정상 처리하지 않는다.
- **토큰/품질:** 허위 CI 실패로 재분석/재실행하는 비용 감소 기대, 공개 정량 없음. 지나친 Filter는 실제 실패를 감출 수 있다.
- **적용:** TeamCity `build_configuration+VCS_revision+trigger+build_id`의 동일성, 더 새로운 Run 유무, 정책별 예외를 구분한다. Raw Receipt는 영구 보존하고 Verdict Projection만 최신 실행을 따른다. **평가: 바로 적용.**
- 소스: https://github.com/langchain-ai/open-swe/commit/1ad56cd8d5ee6a016cff8c6092226e6ff162ea09 (`github/http.py`, `pull_request_status.py`, 테스트).

### 2.9 Open SWE #4222 — Index 기반 Selective Search와 짧은 Cache

- **신규성:** 2026-10-18 23:27 UTC (직전 Scout 후). Thread 검색은 이전에 사용자 Thread 50개씩 매번 가져와 Python으로 비교해 희소 쿼리에서 **최대 약 400번 순차 API 호출**을 했다고 Commit이 기술했다. 새 구현은 `POST /threads/search?text=`로 Index Filter + Ranking하고 Python은 결과의 정확한 Match를 재검증한다. 제목 Prefix 4점, 일반 Title 3점, 나머지 1점과 최신성 가중치를 사용. Repo Listing Cache 최대 60초, 설치 Webhook에 의한 무효화. UI가 사용하지 않는 PR `body` 필드 제외.
- **토큰/품질:** 네트워크 조회·응답 크기 최적화이지 LLM 토큰 절감 실측은 아니다. 권한 변경이 일부 경로에서 캐시 TTL 동안 남을 수 있으므로 실제 파일 읽기 전 실시간 ACL 필수.
- **적용:** Perforce Files/CL/Revision을 색인하여 `path/revision/line_range/evidence_id/snippet`만 우선 전달. 필요할 때만 원문을 확장하는 Selective Context PoC. 전체 Depot 나열 대비 Search Latency, Rerank Accuracy, Evidence Recall을 측정. **평가: PoC.**
- 소스: https://github.com/langchain-ai/open-swe/commit/a5434d9b2e6e6ac531ac41f2b3a42609cc487af9 (`threads/index.py`, `listing.py`, `github/repo_cache.py`).

### 2.10 Deep Agents Talon #7043 — Provider별 Effort Routing 상태 영속화

- **신규성:** 2026-10-19 13:53 UTC. `/effort`로 현재 Model의 Reasoning Effort를 변경하고 Model별 Override를 Atomic Persistence. Turn 시작 시 설정 Capture로 기존 실행에 중도 적용하지 않는다. OpenAI/Anthropic은 지원 Level, Qwen은 Thinking Budget, GLM은 Endpoint 특성으로 매핑. 작성자는 집중 테스트 **188개 통과**를 보고했으나 전체 타입 검사에는 무관한 개발 환경 오류가 있었다.
- **토큰/품질:** 작업 난이도별 추론비용 라우팅 실험 기회. 낮은 Effort가 실패/재시도로 오히려 비싸질 수 있으므로 성공 작업당 총비용으로 판단. 독립 Benchmark 아직 없음.
- **적용:** Research/Implementation/Review 단계마다 Model/Effort 별 교차 실험, Task 난도와 검증 성능 계층화. 장기 작업은 Turn별 적용 Effort Receipt 기록. **평가: PoC.**
- 소스: https://github.com/langchain-ai/deepagents/commit/692c23400e813b37959a206f96e31b89460a310f (`libs/talon/deepagents_talon/effort.py`, `runtime.py`, `tests/unit_tests/test_effort.py`).

## 3. 추적 사항과 제외

**Open SWE #4240 (2026-10-19 14:14 UTC)**: Webhook Event Log 및 Undelivered Event Match의 보관 TTL을 **2일→14일**로 확대. 장기 Task Recovery와 Event Ledger 측면에 중요하지만 저장 비용·보존 정책 부담이 증가하며 Token 최적화는 아니다. PoC/아이디어 참고. https://github.com/langchain-ai/open-swe/commit/3aeb4fac8fe6c478c1a769cf51d9fd4527d55054

**Deep Agents #7005 (10월 16일 UTC)**: Cache Expiration Banner의 정확한 시각·경과시간 표시. 기존 만료 UI 개선으로 신규 토큰 방법론은 아니다. 도입 가치 낮음. https://github.com/langchain-ai/deepagents/commit/3407dc33b9918c98c126097bf485dbf6d2f035bd

**Claude Code 2.1.303**: 공식 변경 기록은 일반적인 Bug Fixes와 안정성 개선으로, 이번 시점에 새로 구현·측정된 Harness 토큰 절감 기법으로 올리지 않았다. https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md

**유의미한 신규 검증 결과 없음:** 이번 구간의 Progressive Disclosure, Skill/Prompt File 자체 경량화, RAG Hit-rate, 독립 Compaction Bench는 출처·절감량·품질을 함께 확인할 자료가 없었다. 기존 수치를 새 결과처럼 반복하지 않는다.

## 4. 즉시 적용/PoC 제안 및 검증 지표

**P0 바로 적용 — 정확성과 중복 실행 방지.** `StepCapabilitySnapshot`, Model-direct/Sandbox Tool Surface 분리, Origin Turn 기반 Guardian Cost Receipt, `unknown_after_dispatch`의 재실행 금지, Superseded CI 분리, Session Lineage/History Digest를 Harness 공통 계약으로 만든다.

**PoC A — Context 비용:** 동일한 작업 30건을 기준으로 `전체 Tool 선언+로그 원문` 대 `증분 Catalog+Structured Evidence Pointer+필요 시 Range Read` A/B. 고정: Model, Effort, Toolset, 입력 Prompt, Workspace Revision. 측정: `input_tokens`, `cache_read/write_tokens`, `tool_schema_bytes`, `tool_result_visible_bytes`, `cost_per_verified_task`, `evidence_recall`, Time-to-Verification.

**PoC B — Subagent Handoff:** Parent Full Fork / Isolated Child + Bounded Brief / Step Environment Snapshot 조합 실험. Parent Stream 변경, Child Evict/Resume, Pending CL 잔존, Approval Generation 변경을 포함. Cross-Stream 오류·권한 우회는 0건이어야 한다.

**PoC C — Routing:** 구현/리뷰/검색 작업에 Effort Low/Medium/High를 배정해 같은 Task를 반복 검증하고 Retry, CI 실패, Evidence 누락을 포함한 성공 작업당 비용으로 비교. 단순 토큰 수만으로 채택 금지.

**공통 최소 Ledger:**

```text
TaskIdentity: task_id, thread_id, invocation_id, parent_id, turn_id
Runtime: adapter, executor_generation, workspace_root, stream, client, pending_cl
Configuration: model, effort, tool_catalog_hash, capability_generation, policy_hash
CostReceipt: billed_input/output, cache_read/write, reviewer_retry, elapsed_ms
EvidenceReceipt: source, artifact_ref, revision, content_hash, completeness, verdict
Lifecycle: created -> queued -> running -> waiting/result_unknown -> verified -> finished
```

## 5. Wiki 경로 및 반영 검증

**Canonical:** `jaywapp/wiki` · `develop` · `ai/trend/ai-harness-token-scout-2026-10-20.md`.

`ai/news/`, `ai/tools/`, `ai/harness/`, `ai/research/`, `ai/tips/`에는 오늘의 날짜별 수집 보고서를 생성하지 않는다.

**반영 결과: ❌ 실패.** GitHub Connector의 `create_file` 요청이 OpenAI 쓰기 안전성 검사에서 차단됐다. 이어서 `develop`의 위 **정확한 경로를 다시 조회한 결과 GitHub Contents API 404 Not Found**가 반환됐다. 따라서 원격 Commit SHA는 없으며, 해당 브랜치에서 오늘 파일은 확인되지 않았다. 본 Markdown 파일은 로컬 백업으로 보존한다.