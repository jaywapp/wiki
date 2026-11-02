---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-03"
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, mcp, progressive-disclosure, hooks, skills, compaction, prompt-cache, cost-accounting, model-routing, subagents, durable-state, runtime-adapter, evidence-verification, handoff, lifecycle, perforce, claude-code, codex]
source:
  - https://github.com/langchain-ai/open-swe/pull/4922
  - https://github.com/langchain-ai/open-swe/pull/4908
  - https://github.com/langchain-ai/open-swe/pull/4728
  - https://github.com/openai/codex/pull/58963
  - https://github.com/openai/codex/pull/58975
  - https://github.com/openai/codex/pull/58956
  - https://github.com/openai/codex/pull/58973
  - https://github.com/openai/codex/pull/58962
  - https://github.com/langchain-ai/deepagents/releases/tag/deepagents-code%3D%3D0.2.3
  - https://github.com/anomalyco/opencode/pull/61194
  - https://github.com/microsoft/agent-framework/pull/9859
  - https://github.com/microsoft/agent-framework/pull/9971
updated: 2026-11-03
---

# AI Harness · Context/Token Optimization Scout — 2026-11-03

> **조사 기준:** 2026-11-03 06:03 KST(2026-11-02 21:03 UTC). 주 관찰 범위는 2026-11-01 21:04~2026-11-02 21:03 UTC에 병합된 GitHub PR, 공식 릴리스 및 관련 source/tests/docs다. [11/02 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-02.md), [11/01 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-01.md), [10/31 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-31.md)와 중복 제거. 날짜는 PR 생성·업데이트 날짜가 아니라 **merged_at**, 릴리스는 **published_at**을 기준으로 삼았다. 모든 테스트·벤치마크는 별도 표시가 없으면 업스트림 작성자의 결과이며, P4/TeamCity/유료 API 환경에서 독립 재현하지 않았다.

## 0. 요약: 이번 관찰 구간의 실제 신규 변경

**오늘은 유의미한 신규 항목이 있다.** 가장 큰 구조적 변경은 Open SWE의 **Backend Mirror Graph 제거 및 Run Token 기반 Stateless Dispatch**, Codex의 **Host-owned Agent Runtime Admission + Usage Accounting**, Codex의 **임시 MCP Message Board 기반 Subagent Handoff**, Open SWE의 **Shadow Reviewer를 통한 모델 비용·품질 비교 실험 구조**다. Context 측면에서는 **Compaction 직후 Volatile World State 갱신**, **Guardian의 Required Evidence 보존 정책 복구**, **Deep Agents의 사전 Hook Command Rewrite와 Provider-native Tool Search 정식 패키지화**가 중요하다.

| 신규 변경 | 핵심 구현·관찰 | 수치 또는 배포 상태 | Perforce Harness 평가 |
|---|---|---|---|
| [Open SWE #4922](https://github.com/langchain-ai/open-swe/pull/4922) | 매 Run의 Backend Mirror Graph 제거; MDA는 모델 Loop/Checkpoint를 소유, Backend는 TokenRun으로 응답 | 87개 파일 변경; 기존 graph.py 1,703줄 제거; LLM 비용 실측 없음 | **PoC 최우선** |
| [Codex #58963/#58975](https://github.com/openai/codex/pull/58975) | Host Turn Admission과 실행 중 Provider Usage·Compaction Budget 정산 | 각각 25/18개 파일; 컨트롤러 기본값 유지 | **PoC 최우선** |
| [Codex #58973](https://github.com/openai/codex/pull/58973) | Parent/Child 공유 Tree-scoped HTTP MCP Message Board, 설정 없이 자동 발견 | multi_agent_v2 + agent_message_board_mcp opt-in, 후자는 기본 OFF; 메모리만 사용 | **PoC** |
| [Open SWE #4908](https://github.com/langchain-ai/open-swe/pull/4908) | 실 PR에서 다른 모델의 Shadow Review를 비공개 병렬 실행하여 Finding 비교 | 30파일, +1,015줄; 운영 비용·정확도 결과 미공개 | **PoC 최우선** |
| [Open SWE #4728](https://github.com/langchain-ai/open-swe/pull/4728) | SDK 재시도 중첩 방지, Main/Backup 공통 Deadline, 완료 Tool 비재실행 | 최대 5회 임시 오류 재시도; 10분 main silence/15분 전체 deadline | **바로 적용 원칙** |
| [Codex #58956/#58962](https://github.com/openai/codex/pull/58956) | Compaction 이후 가변 Budget Context 갱신, Guardian Required Evidence/정책 보존 | Source/회귀 테스트 존재, 토큰 절감 실측 없음 | **바로 적용 원칙** |
| [Deep Agents Code 0.2.3](https://github.com/langchain-ai/deepagents/releases/tag/deepagents-code%3D%3D0.2.3) | Provider-native Tool Search 포함, Hook Command Rewrite를 **승인 이전** 적용 | 공식 릴리스 11/02 17:12 UTC | **PoC 최우선** |
| [OpenCode #61194](https://github.com/anomalyco/opencode/pull/61194) | Streaming Delta당 Event Array 전체 복사 제거, Fold 내부 소유권으로 전환 | 50k delta 1,390→34ms, 20k 244→15ms(작성자 로컬) | **PoC(지연 최적화)** |
| [Agent Framework #9859/#9773](https://github.com/microsoft/agent-framework/pull/9859) | Anthropic Cache 토큰/ Copilot Reasoning 토큰 회계 오류 수정 | Anthropic 예시 입력 12→9,312(누락된 캐시 반영); 실제 비용 감소 아님 | **바로 적용** |
| [Open SWE #4190](https://github.com/langchain-ai/open-swe/pull/4190) | 개인 Private Thread에서만 관리자 지정 Managed Tool Catalog 검색 | 인증정보 노출 없음, 개인 계정으로 목록 확인 | **PoC** |
| [Open SWE #4742](https://github.com/langchain-ai/open-swe/pull/4742) | Goal Mode, 완료/차단될 때만 보고, 최대 5회 진행 재촉 | 사용자별 실험 기능, USD 상한 자체는 없음 | **아이디어 참고/PoC** |
| [Agent Framework #9971](https://github.com/microsoft/agent-framework/pull/9971) | CodeAct Host Tool 실패 원문을 Guest에 기본 비노출; Policy가 Snapshot/Cache까지 이어짐 | Breaking change, Hyperlight Native 백엔드 별도 검증 필요 | **바로 적용 원칙** |
| [OpenCode #60697/#60502](https://github.com/anomalyco/opencode/pull/60697) | 비PTY Process Daemon의 장기 프로세스 경계, Code Mode Redirect마다 Permission 재검사 | Pipe mode는 Unix만; Windows 후속 필요 | **보안 바로 적용 / Windows는 참고** |
| [Codex #58964/#58980](https://github.com/openai/codex/pull/58964) | Client Tool Output Retention 기본 ON; Turn Critical Path Histogram | Retention은 절감 보장 아님, 비용계측과 함께 검증 | **조건부 PoC** |

**정량 판정:** 신규 코드 변경에 대해 **품질을 고정한 실제 Provider 청구 비용 감소율 또는 LLM 모델 입·출력 토큰 감소율을 확인한 사례는 0건**이다. OpenCode 50k delta 1,390→34ms는 CPU 이벤트 조립 비용 개선이며 모델 토큰 감소율이 아니다. Anthropic 12→9,312는 누락된 사용량을 바로잡은 수치다. 병합 PR과 배포 버전도 구별한다.

### 이전 보고서와 구분

11/02: Overflow 거절 요청의 중복 재전송 제거(#61015), 모델별 Cache TTL Warming(#60969/#60025), Skill 가상 파일/Workspace Library(#60921/#60401), Shared Memory Curator(#4877), Merge Queue Recovery(#4838), Live Text Eviction(#58751) 등은 재수록하지 않았다.

11/01: MCP Lazy Schema Validation(#60733), Provider Shared Discovery Cache(#60082), Stable Tool Order(#60811), Guardian Elastic Context 초기 설계(#58444/#58454), Deferred World State 기본 활성화(#58410)는 기존 사항이다. 오늘은 해당 기능 이후의 **정책 복구/재압축/Host ownership**처럼 새 코드가 확인된 부분만 다룬다.

## 1. Open SWE #4922 — Backend의 Mirror Graph를 없애고 Run Token으로 모든 호출 처리

**신규성:** [2026-11-02 03:42 UTC 병합](https://github.com/langchain-ai/open-swe/pull/4922). 전일의 ToolSet Digest/Shared Prefix/Run Token 개선과 다르게, Backend 쪽에 다시 생성하던 두 번째 Agent Graph와 Replica-local 세션 상태 자체를 제거했다.

**문제와 내부 구조:** 이미 MDA가 모델 Loop, Checkpoint, Tool Call, Middleware를 실행하는데 Backend도 모델 그래프별 Middleware Stack을 복제했다. Backend가 Tool Catalog를 읽고, Reviewer/Incident 등 일부 Run에서 Replica에 종속된 Hook을 실행하기 위해 이 복제 구조를 유지했다. 변경 후에는 Run 시작에서 **Thread Settings, Workspace Defaults, 발신자 권한, Credentialed Integration**을 읽어 RunCatalog를 한 번 결정한다. Backend는 서명된 Run Token의 RunSettings/Grant와 요청만으로 **TokenRun.answer**를 호출한다. Agent/Reviewer/ReviewScout는 별도 Graph가 아니라 **RunKind**이고 모델 Loop는 MDA의 단일 Graph다.

**확인한 실제 파일:** 삭제된 openswe/agent_api/graph.py(1,703줄), 신규 **run_catalog.py(277줄), run_calls.py(792줄), run_kinds.py, run_sandbox.py, file_calls.py**, mda/rt/kinds.py, mda/rt/offload.py, 관련 tests. Run token에는 Operation Grant가 있으며 tool_specs/search_tools/resolve_tool이 ToolSet Digest를 통해 실제 Schema/Grant를 해결한다. Report는 Key별 멱등 처리, Subagent Tool은 Namespace로 귀속한다. 오래된 Grant가 빠진 Token의 호환 분기는 제거됐다(이미 만료된 Token이라는 업스트림 전제).

~~~mermaid
flowchart LR
 A[사용자 요청 / Run 생성] --> B[Backend RunCatalog + 권한 / ToolSet Digest]
 B --> C[서명된 Run Token + MDA 실행]
 C --> D[MDA 모델 Loop / Middleware / Checkpoint]
 D --> E[TokenRun.answer]
 E --> F[Operation / Tool Search / File / Sandbox]
 E --> G[Evidence / Ordered Report / Durable Ledger]
~~~

**토큰·성능:** 백엔드의 중복 모델 그래프 생성/상태 복제/복구 비용을 줄일 여지가 크지만, 자체로 **LLM 입력 토큰 절감이나 기존 DB 크기 감소 수치를 제시하지 않았다**. Token에 Grant·정책을 캡처하므로 권한 변경 시 Token 회수/만료, Runtime/Backend Schema Version 불일치, Deployment 순서가 핵심 리스크다.

**P4 적용 PoC:** P4 Runtime Adapter가 (1) Run 시작에 Depot/Client/Role/Base CL/ToolSet Digest/Policy Version 확정, (2) Claude Code 또는 Codex Worker가 Loop 소유, (3) 중앙 Backend가 p4 describe/changes/opened, TeamCity/Evidence/Submit을 작업별 Grant로 수행하는 구조. 100 Run×재시작 20회에서 Replica Memory/초기화 시간, Worker Migration, Cross-depot 권한 누출 0, Tool Selection Recall 및 Verified Task Cost를 검증. **평가: PoC 최우선.**

## 2. Codex #58963 + #58975 — Host-owned Turn Admission과 Usage Accounting

**원본:** [Turn Admission #58963](https://github.com/openai/codex/pull/58963) 11/02 20:10 UTC, [Usage Accounting #58975](https://github.com/openai/codex/pull/58975) 20:38 UTC. Controller 소유 기본값과 별개로 Host가 Runtime Capacity와 모델 예산의 권한 있는 소유자가 될 수 있는 확장이다.

**실행:** AgentRuntimeOwnership::Host를 명시 선택하고 AgentTurnAdmission Provider를 시작 전에 등록해야 한다. Provider 누락은 조용한 로컬 fallback이 아니라 startup 오류다. Root/Child Turn의 실행 **직전** Host Guard를 acquire하고 Task 종료까지 Guard를 유지한다. Pending Admission은 취소 가능하고 입력을 받아들인 뒤 거절되어도 수신 입력은 기록하며, Suspension 시 아직 실행하지 못한 Prompt의 Recovery를 보존한다. Controller Budget/Reminder/Subagent Roster Context는 Host Ownership에서 끈다.

**비용·Context:** Host가 AgentUsageReport/UsageAccountingDecision으로 각 Model Response, Foreground/Background Compaction의 사용량을 **원 Turn ID/Thread ID**에 귀속한다. 예산 초과는 SessionBudgetExceeded, Accounting 실패는 추론 재시도를 해서는 안 되는 치명 오류다. Incomplete Response의 원래 오류도 보존한다. Host 소유 Runtime이 Provider를 등록하지 않으면 회계는 비활성이다.

**Source/Tests:** codex-rs/core/src/agent/host/admission.rs, ownership.rs, usage.rs, session/rollout_budget.rs; tests/suite/rollout_budget.rs, scenarios_reserved_spawn.rs. 스폰 예약, 즉시 거부, 예산 차감, Compaction 이중 과금, 중단 후 수신 메시지, Guard 수명에 대한 회귀 검사가 있다.

**장단점:** 장점은 여러 Worker/모델의 사내 한도를 중앙 Budget Authority에 모으고 중복 Counter를 없앤다는 점. 단점은 Host Ledger 장애가 곧 Turn 불가로 이어질 수 있다는 점. Usage Callback의 처리/전달 시간도 새 Critical Path다. **실제 비용 감소율은 없음.**

**P4 적용:** Host Budget Service에 task_id, attempt_id, turn_id, child_id, model_id, provider_usage, reasoning_tokens, cache_creation/read, compaction, actual_billed_cost, ledger_version을 저장한다. P4 Submit/TeamCity처럼 부작용이 있는 Tool은 Admission과는 별도 승인/Idempotency를 유지. 동일 100개 Task에서 Host/Controller 비교, 제한 도달 후 새 Model Call 0, Compaction 중복 청구 0, 빠진 Cost Receipt 0을 합격 기준으로 사용. **평가: PoC 최우선.**

## 3. Codex #58973 / #58909 / #58904 — 일시적인 Subagent MCP Message Board

**원본:** [자동 Discovery #58973](https://github.com/openai/codex/pull/58973)(20:34 UTC), [메모리 Launcher #58909](https://github.com/openai/codex/pull/58909), [HTTP MCP Server #58904](https://github.com/openai/codex/pull/58904). Parent/Child가 단순 Prompt 전달 외에 서로 Message/Subscription으로 협력하게 하는 새 Runtime Adapter다.

**동작:** multi_agent_v2와 새 agent_message_board_mcp를 동시에 활성화하면 **Tree Scope의 임시 HTTP MCP 서버**가 자동 시작한다. Parent/Child는 Server를 공유하지만 호출자 Host Binding은 각각 보존한다. 쓰기 작업은 MCP Server를 통해 직렬화한다. Parent가 unload된 뒤에도 Child가 남아 있는 동안 Board가 살아 있어 Message를 계속 게시/구독할 수 있다. 새로운 플래그는 **기본 OFF**이고 이전 Board 기능보다 우선한다. DB 영속성이 없는 메모리 Board이므로 Worker/Server Crash 이후 Replay를 기대하면 안 된다.

**검증:** codex-rs/ext/agent-message-board/src/mcp.rs, message-board-mcp/src/local.rs, core/tests/suite/scenarios_agent_message_board_http.rs에서 Discovery, 자동 Spawn, Parent Unload 뒤 Child Post, 직렬화 및 DB 부재 확인.

**Token 절감 원리:** Worker 사이 전체 대화 전사를 반복 붙이는 대신 짧은 Message/Pointer로 Handoff하면 중복 Context를 줄일 *가능성*은 있다. 하지만 샘플에 따른 모델 호출 증가와 MCP Schema 비용이 있고 절감량은 아직 없다. Board는 **Durable Ledger 대체물이 아님**.

**P4 PoC:** Orchestrator→Code Search Worker→Reviewer→Verifier 사이 Tool Request는 Message Board; 승인/CL/Build/Evidence Receipt는 별도 Durable Store. Worker 20개 병렬, Parent Kill 후 Child Post, 재시작 뒤 미전달 메시지는 Ledger Replay로 재동기화. Parent-Child Permission/Scope 격리 필수. **평가: PoC.**

## 4. Open SWE #4908 — 다른 모델의 Shadow Review로 품질과 비용을 함께 측정

**원본:** [#4908, 11/02 20:55 UTC 병합](https://github.com/langchain-ai/open-swe/pull/4908), 변경 files: openswe/review/shadow.py, review/publish.py, reviewer.py, migrations/0092_..._record_shadow_reviews.py, tests/reviewer/test_review_shadow.py 및 관리 UI.

**실행:** Workspace별 review_shadow_percent로 **최초 Review 시 PR Sampling**을 고정하고, 그때 대조 모델과 Reasoning Effort를 기록한다. 이후 재리뷰에도 같은 모델이 따라간다. Shadow는 별도 Read-only Thread에서 같은 Prompt/Context로 실행하되, Live Open SWE Bot의 리뷰 코멘트를 보지 않는다. Finding과 Head Commit, 순위, 심사 결과는 review_shadow 및 publications 테이블에 저장한다. GitHub PR Comment, Check Run, Slack 알림, Suggested Task 생성은 모두 금지하거나 Dry Run한다. PublishSelection 규칙은 Live와 Shadow가 공유한다.

**비용/품질:** 이 기능 자체는 **추가 모델 호출로 비용을 늘린다**. 그러나 Shadow의 Precision/Recall, False Positive, Evidence Accuracy, Cost per Valid Finding를 측정하여 저비용 모델 대체나 Cascade 정책을 증명할 수 있는 실제 실험 기반을 제공한다. **성능·비용 개선 실측은 아직 없음.**

**P4/UE5 실험:** 같은 40개 CL에서 Live=주력 Model Reviewer, Shadow=낮은 가격/effort Model. 두 모델에 동등한 Diff+Build Result+Evidence를 주고, Shadow는 Perforce Write/Comment/Submit 권한 없이 별도 Evidence Store만 기록. Reviewer Blind Labeling으로 precision@finding, critical miss, false block, USD/valid finding, p95 time을 측정. 낮은 비용이라도 치명 결함 누락이 늘면 채택하지 않는다. **평가: PoC 최우선.**

## 5. Open SWE #4728 — 1개 Deadline, 1개 Retry Authority, 완료된 Tool은 절대 Replay 금지

**원본:** [#4728, 11/02 18:17 UTC 병합](https://github.com/langchain-ai/open-swe/pull/4728). 새로운 모델 라우팅 알고리즘이 아니라 실패 복구 경계 개선이다.

**동작:** SDK 재시도를 비활성화하고 Open SWE가 Provider별 임시 오류를 **최대 5회**, 대기 상한 **60초**로 직접 다룬다. 요청 전체 Deadline은 **15분**이며 Main Model이 **10분 동안 시작 응답이 없다면** 남은 시간에 Backup Model을 시도한다. 이미 Streaming이 시작됐다면 나머지 Deadline 범위에서 진행한다. Streaming 도중 연결이 끊겨도 실패한 Attempt를 Superseded로 표시하고 Partial Text와 미완료 Tool Call을 사용자 Live View에서 제거한다. **이미 완료된 Tool은 재실행하지 않는다.**

**Token 비용:** 숨은 SDK Retry + App Retry의 곱셈을 줄여 실패 실행의 낭비 토큰을 낮출 가능성이 있다. 대신 최대 5회 재시도와 Backup Invocation 자체도 비용이다. Retry Count, Provider Error, Complete Tool Receipt, Billed Attempt를 반드시 분리해야 한다.

**P4 적용:** TeamCity Build 요청, p4 shelve/submit은 성공 ACK를 놓쳐도 우선 원격 CL/Build ID를 조회하고 재호출을 피한다. Model Invocation은 같은 Task의 attempt_id를 바꾸고, 차단된 Attempt는 Final Output으로 섞지 않는다. 429/5xx/스트림 끊김 100건 Fault Injection에서 중복 Tool Side Effect 0, 무한 Retry 0, Deadline 초과 0. **평가: 바로 적용 원칙.**

## 6. Codex #58956 / #58962 / #58935 — Compaction 뒤 가변 Context와 필수 Evidence의 별도 복구

**원본:** [World State #58956](https://github.com/openai/codex/pull/58956), [Guardian Budget Policy #58962](https://github.com/openai/codex/pull/58962), [Elastic Preparation #58935](https://github.com/openai/codex/pull/58935), 모두 11/02 병합. 10/31~11/01의 Elastic 설계 설명을 반복하지 않고, **Compaction 이후 잘못 남는 Snapshot/중복 검증**을 수정한 부분만 다룬다.

**World State:** Budget Reminder 같은 Host의 Volatile Context는 Compaction하는 순간 복사한 값을 다음 Turn에도 재사용하면 오래된 수치가 유지될 수 있다. WorldStateSectionContribution::without_full_context()로 해당 섹션의 Compacted Prefix와 비교 Snapshot을 제외하되, 일반 Step Delta는 계속 허용한다. Prefix Compaction 이후 비교 상태를 초기화하고 Live Suffix가 남은 경우도 새 Budget Reminder를 전달한다.

**Guardian:** Optional Transcript Entry를 Required Entry와 동등하게 중복 처리하면 Optional이 Eviction될 때 필수 Instructions/Tool Call Evidence까지 사라질 수 있다. 수정은 Budget Policy를 Admission·Feasibility·Restore까지 보존하고, **Required/Protected Native Messages 우선**이며 Evidence 전달 판정에는 **완료된 Required Entry**만 사용한다. Elastic Instruction Duplicate는 Source Revision으로 매칭한다. #58935는 Elastic Mode에서 Transcript/Supporting Text/Image Candidate를 조기에 잘라버리지 않고 최종 할당까지 보존한다. Fixed Mode Caller의 기존 동작은 유지한다.

**토큰·위험:** 오래된 Budget Context가 잘못되거나 Required Evidence가 빠져 발생하는 재실행/오판을 막는 변경이지 직접 Token Compression 성과가 아니다. 재활용 가능한 Prefix와 실시간 업데이트가 필요한 Delta를 잘못 분류하면 Cache Hit 또는 정확성이 악화된다.

**P4 적용:** Stable Prefix=회사 코딩 규칙·Tools/Skill Catalog, Volatile=남은 Token Budget·CL/Build 결과·P4 Have Revision. Required Evidence=승인/원본 CL/검증 명령과 Hash, Optional=부가 탐색 출력. Compaction/Fork/Resume 100회에서 Required Evidence 100%, Stale Budget 0, Source Revision/Permission Scope mismatch 0. **평가: 바로 적용 원칙.**

## 7. Deep Agents Code 0.2.3 — Deferred Tool Search가 실제 릴리스, Hook Rewrite는 승인 이전

**공식 릴리스:** [deepagents-code==0.2.3, 2026-11-02 17:12 UTC](https://github.com/langchain-ai/deepagents/releases/tag/deepagents-code%3D%3D0.2.3). 전일 조사한 Provider-native Tool Search PR #7304의 **정식 코드 패키지 포함 여부가 오늘 확인됐다**. 이 점이 어제와의 신규성이다. 릴리스는 Official Marketplace 기본 포함, 명시/저장된 Model 선택 요구, Model Classifier 불능 시 Auto Mode 차단, OpenRouter Claude Prompt Cache 활성화, MCP Startup 중복 Probe 제거도 명시한다.

**Hook Command Rewrite:** [#7384, 11/02 15:34 UTC 병합](https://github.com/langchain-ai/deepagents/pull/7384). PreToolUse Hook의 updatedInput.command를 검증해 Model이 요청한 Shell Command를 **Permission 승인 전에** 바꾼다. 승인 화면, 실제 실행, Post-Tool Hook은 최종 Rewrite를 본다. Hook이 여럿이면 마지막 유효 Rewrite가 우선하나 각 Hook은 원래 입력을 본다. Deny는 Rewrite로 무효화할 수 없다. Shell execute만 허용하고 MCP Tool이나 임의 다른 파라미터 Rewrite는 차단한다. Source: libs/code/deepagents_code/hooks/models/domain.py, hooks/reducer.py, hooks/server_middleware.py, tests/unit_tests/hooks/test_engine.py.

**적용 예:** git status → rtk git status 같은 Context-Efficient Command Wrapper는 가능하지만 **Formatter/Log Compactor로 바꿨다는 사실을 사용자·Policy·Audit에 기록**해야 한다. Hook Allow가 Backend Permission/Perforce Protection을 우회하면 안 된다. Tool Schema Deferred Search 자체의 절감 입력 Token 비율은 릴리스에서 검증되지 않았다.

**Windows:** [#7361](https://github.com/langchain-ai/deepagents/pull/7361)은 PowerShell 5.1이 UTF-16으로 저장할 수 있는 Subagent AGENTS.md를 읽을 때 전체 CLI Startup 대신 해당 Subagent만 경고 후 Skip하도록 바꿨다. 반면 잘못된 파일이 **정상적으로 로드된 것과 동등하지 않다**. UTF-8 Files Validation Gate를 설치 시 수행한다.

**Perforce PoC:** Skill/Tool 150개에서 전체 Schema 선노출 vs Provider-native Search, read-only Command Wrapper 적용 전/후, 승인 대상 문자열 불변성, Tool Recall, Token, USD, 편집 영향, Unauthorized Command 0을 비교. **평가: PoC 최우선.**

## 8. Microsoft Agent Framework #9859/#9773 — Cache Hit/Reasoning Token 계측 오류 수정

**Anthropic:** [Python #9859, 11/02 09:36 UTC 병합](https://github.com/microsoft/agent-framework/pull/9859). Anthropic usage.input_tokens는 마지막 Cache Breakpoint 이후의 입력만 포함할 수 있는데, Framework의 input_token_count에 그대로 매핑해서 Cached Input을 빼먹었다. 수정은 **input_tokens + cache_creation_input_tokens + cache_read_input_tokens**를 Total Input에 반영하면서 Cache Read/Creation 세부 필드는 별도로 보존한다. 업스트림 제시 예에서는 **12로 보고하던 값을 9,312로 바로잡는다**. 작은 회귀 Fixture는 100+20+30=150을 검증한다. Source는 python/packages/anthropic/agent_framework_anthropic/_chat_client.py 및 tests/test_anthropic_client.py.

**Copilot:** [.NET #9773, 11/02 14:44 UTC 병합](https://github.com/microsoft/agent-framework/pull/9773)은 Copilot SDK AssistantUsageData.ReasoningTokens를 UsageDetails.ReasoningTokenCount로 전달한다. 0/양수/누락/Usage 없음의 4개 케이스가 있다. 작성자는 .NET 전체 **9,865 pass/74 skipped**, Copilot **51 pass/2 skipped**를 보고했다. 단순 Counter 복구이며 Output/Total은 변경하지 않는다.

**측정 교훈:** Cache가 잘 맞으면 **총 입력 토큰은 그대로지만 실제 청구 단가는 달라질 수 있다**. Cached Token을 Total Input에서 빼면 Model Context 사용량과 Token Economics를 동시에 잘못 해석한다. 반대로 Cache Read를 다시 Total에 더해 중복 계상해도 안 된다. Price Table/Provider Billing과 수집 Usage를 교차 검증해야 한다.

**P4 계측:** 입력/출력/추론/Cache 생성/읽기/모델별 Price/Provider Bill, Retry/Superseded Attempt/Compaction/Reviewer를 분리한 Cost Receipt를 모델별 통합. Billing discrepancy가 1%를 넘으면 Token 절감 주장 보류. **평가: 바로 적용.**

## 9. OpenCode #61194/#61159 — Event Fold O(N²)를 O(N) 형태로 바꿈

**원본:** [#61194 11/02 05:33 UTC](https://github.com/anomalyco/opencode/pull/61194), [#61159 03:09 UTC](https://github.com/anomalyco/opencode/pull/61159). 모델 입력 최적화가 아닌 **장기 Streaming Session의 CPU·메모리 최적화**이다.

**Source:** packages/ai/src/schema/events.ts에서 매 Delta마다 events=[...events,event]로 전체 배열을 복사하던 Fold를 **ResponseFold 내부 mutable append**로 변경했다. 단일 소유자 State에 push하고 최종 LLMResponse는 별도 Copy를 만든다. generate/stream/tool-loop 경로를 모두 변경했다. 공개 API에서 State/empty/reduce/complete/partial export가 빠지는 **라이브러리 API Breaking Change**가 있으며, 기본 사용자에게 동일한 Event 순서를 제공해야 한다. 세션 조회는 이미 완료된 Assistant를 매번 Full Decode하지 않도록 1줄 Early Return을 넣었다.

| LLM Delta 수 | 변경 전 | 변경 후 | 해석 |
|---|---:|---:|---|
| 20,000 | 244ms | 15ms | 로컬 5회 Median |
| 50,000 | 1,390ms | 34ms | 로컬 5회 Median |

작성자가 packages/ai **2,034 테스트**, 세션 관련 **734 테스트**를 보고했다. 대용량 Stream에서 모델 응답보다 UI 조립이 병목이면 유용하나 **출력 토큰/청구액은 감소하지 않는다**.

**P4 적용:** 장시간 UE5 Build Streaming/Tool Events가 10만 건 이상이면 Model에게 Event별 Raw 텍스트를 보내는 대신 서버에 Append-only Event Stream을 유지하고 Model에는 Event Summary/Evidence URI만 보낸다. 전자는 CPU 최적화, 후자는 Token 최소화라는 **서로 다른 실험**으로 분리한다. **평가: PoC(지연/메모리); 직접 Token 효과는 낮음.**

## 10. Open SWE #4190 — Private Thread 한정 MCP Managed Tool Discovery

**원본:** [#4190, 11/02 19:54 UTC 병합](https://github.com/langchain-ai/open-swe/pull/4190). 이전 ToolSet Digest/Search와 달리 **어떤 외부 연결이 사용자의 계정에서 실제 사용 가능한지**를 개인 권한으로 조회하는 Discovery다.

**구조:** discover_managed_tools가 이름·설명으로 도구를 검색하고 연결하지 않은 Service를 알려 준다. 사용자의 LangSmith Account를 사용하며 **소유자 자신의 Private Thread**에서만 동작한다. Shared Thread에서는 금지. 반환에 Credentials는 포함되지 않는다. Admin이 사전에 선택한 Tool Set 밖의 서비스는 검색할 수 없고 Discovery만으로 Connection/API Action을 수행하지 않는다.

**Context 효과:** Model이 무조건 모든 Connector를 Prompt에 싣지 않고 가능한 Service부터 좁힌 뒤 Tool Schema/Connection 단계를 진행할 수 있다. 그러나 이번 PR에는 Prompt Token Savings 실측이 없다. Discovery Cache가 개인/Workspace Scope를 섞으면 보안 사고가 된다.

**P4 적용:** P4/TeamCity/Issue Tracker/Build Artifact Connector Inventory를 (principal, project, depot, auth_version) Scope로 검색; Tool Schema는 선택 후 노출, Credential은 전달하지 않음. Cross-project Leakage 0, Wrong Tool Recall 0을 기준으로 PoC. **평가: PoC.**

## 11. Open SWE #4742 — Goal Mode: ACK 대신 작업 종료 조건이 명확한 Loop

**원본:** [#4742, 11/01 22:49 UTC 병합](https://github.com/langchain-ai/open-swe/pull/4742). 사용자별 실험이며 **Default Loop 대체가 자동으로 일반 배포됐다는 의미는 아니다**.

**실행:** Goal Mode에서 Agent는 ACK나 진행 메시지를 보내지 않고 사용자 개입 필요(blocked) 또는 PR 검사·Reviewer 반복·최신 Walkthrough가 갖춰진 complete 시점에 report_work_state Tool로 보고한다. 진행을 마쳤다고 말하지 않은 일반 Turn End는 WorkStateRules가 최대 **5회** 추가 작업을 유도한다. Schedule/Background/Monitor Wait는 예외이며 새 Work State Tool은 플래그가 On일 때만 사용 가능하다.

**Trade-off:** 진행 메시지 모델 출력과 사용자 응답 수를 줄일 가능성은 있지만 Loop가 여러 차례 더 돌아 **총 Token/비용이 오히려 증가할 수 있다**. 사용자에게 아무 알림도 하지 않는 모드가 장애 감지를 늦출 수 있다.

**P4 설계:** Task State QUEUED→PREPARING→IMPLEMENTING→BUILDING→REVIEWING→VERIFYING→COMPLETE/BLOCKED/FAILED; 진행 메시지는 Event Ledger로 남기고 사용자에게는 최종 확정만 전달. MAX_STEP/MAX_RETRY/USD_LIMIT/WALLTIME_LIMIT를 강제해야 한다. **평가: 아이디어 참고/제한 PoC.**

## 12. CodeAct/Tool 실행 신뢰 경계 — Error Redaction, Redirect, Guardian Patch

**Agent Framework #9971:** [11/02 15:03 UTC 병합](https://github.com/microsoft/agent-framework/pull/9971). Python Monty/Hyperlight CodeAct Host Tool Exception의 상세 내용이 Guest Generated Code에 실수로 노출될 수 있어 include_detailed_errors를 **기본 False**로 변경했다. 기본 Failure는 Generic RuntimeError, 신뢰 채널만 Opt-in 상세 오류. Policy는 Run Snapshot/Serialized State에 보존하고 Hyperlight Sandbox Cache를 Policy별 격리한다. **Breaking Change**이고 Hyperlight Native Verification은 작성자 환경에서 완료되지 않았다. 원문 Error는 모델이 아닌 비공개 Evidence Store로 분리한다.

**OpenCode #60502:** [11/02 02:09 UTC 병합](https://github.com/anomalyco/opencode/pull/60502). Code Mode fetch가 첫 URL만 Permission 검사하고 Redirect는 자동 추적하면, 허용된 주소에서 Denied Domain으로 넘어갈 수 있다. 수정은 Redirect 수동 처리 후 **매 Hop Permission.assertNotDenied**, Cross-Origin 이동 시 Authorization/Cookie 제거, 20 Hop/30초 제한 적용. Code Mode가 Fetch를 스스로 수행해도 ACL을 우회하지 않도록 한다.

**Codex #58931:** [11/02 17:06 UTC 병합](https://github.com/openai/codex/pull/58931). exec_command로 감싼 apply_patch도 Direct Guardian Review에서 Native Patch와 동일한 Verified Patch/Approval Requirement로 심사하며 **Direct Review 단계에서 파일을 쓰지 않는다**. P4 Diff/Shelve Review의 Preflight-only Principle에 적합하다.

**평가:** 모두 **보안·Evidence 측면 바로 적용 원칙**. Token 절감 수치는 없으나 실패한 검증으로 인한 재실행 비용·민감 정보 노출을 줄일 수 있다.

## 13. Session/Handoff/Task Lifecycle의 오늘 변경

**Open SWE #4909:** [11/02 17:53 UTC](https://github.com/langchain-ai/open-swe/pull/4909). QuickJS Interpreter Crash 뒤 다음 eval은 반드시 Empty State가 아니라 **이전 Run의 Snapshot으로 복구**할 수 있다. Crash Run 이후 JS 변수는 Rollback되지만 이미 수행된 파일 쓰기/API 호출은 Rollback되지 않는다. Agent에게 이를 명시하며 Crash Code를 자동 재실행하지 않는다. P4 Submit 재시도 전에 Remote CL을 재조회하는 근거다.

**Open SWE #4792:** [11/02 18:30 UTC](https://github.com/langchain-ai/open-swe/pull/4792). invocation_id를 단일 Canonical Identity로 기록하되 과거 prepare_run_id는 Reader에서 수용하고 두 값이 충돌하면 거부한다. Durable Ledger Schema Migration은 **Read-Old/Write-New**와 Rollback 가능성을 분리해야 한다.

**Microsoft Agent Framework #9873:** [11/02 13:04 UTC](https://github.com/microsoft/agent-framework/pull/9873). Checkpoint에서 복원된 Agent Mode가 현재 설정에 없으면 기본 Mode로 교정·영속화한다. 복원된 State를 새로운 Policy/Schemas와 재검증해야 한다는 점에서 중요하다.

**Microsoft Agent Framework #9681/#9931:** [Middleware Termination](https://github.com/microsoft/agent-framework/pull/9681)은 중간 종료 결과를 잃지 않고, [Foundry Reasoning Replay](https://github.com/microsoft/agent-framework/pull/9931)는 Multi-message Response의 실제 소유 메시지에 Replay Payload를 연결한다. 잘못 연결된 Reasoning은 다음 Resume에서 중복/거짓 Context가 된다.

**Open SWE #4842:** [Area Map Review](https://github.com/langchain-ai/open-swe/pull/4842)은 default-branch .open-swe/settings.json의 supplementaryReviews[].areas에 Area Description/GitHub Login을 저장하고, 근무 시간/가용성/정책에 따라 Specialist에게 요청한다. Engineering Approval과 Specialist Review는 분리. P4 Module/UE5 Plugin Owner Lookup에도 같은 패턴 적용 가능하다.

**Codex #58980:** [Turn Critical Path Metrics](https://github.com/openai/codex/pull/58980)에서 Turn별 Complete/Incomplete Capture, Total/Component Time을 2시간 구간까지 계측한다. Usage와 시간 프로파일을 결합해 실제 병목을 찾을 수 있으나 과금 실측은 없다.

**OpenCode #60697:** [Unix Pipe Process](https://github.com/anomalyco/opencode/pull/60697)에서는 PTY 없이 Shell 프로세스를 Daemon에 두고 Replay/Subscribe/Terminate하도록 Protocol을 확장했다. Process Group, Signal Mask, PID Reuse까지 고려했지만, **이번 PR 시점은 향후 재시작 Handoff를 위한 기반**이며 **Windows 구현은 후속**이다. Windows/P4 환경에 그대로 설치 가능하다고 오인하지 않는다.

## 14. 오늘의 Cross-project Pattern 판정

| 추적 주제 | 11/03 신규 근거 | 토큰·비용에 대한 엄격한 판정 |
|---|---|---|
| Orchestration / Durable State | MDA Single Graph+Run Token, Codex Host Admission, Message Board, Snapshot Recovery | 중복 실행·불필요 Middleware 제거 가능; 실제 Model Token 감소 미측정 |
| Skills/Hooks/Progressive Disclosure | Deep Agents 0.2.3 Tool Search 정식 릴리스, PreToolUse Rewrite, Managed Tool Discovery | Schema 선택 노출 가능; Cache/Token 검증 필요 |
| Context Pruning/Compaction | Codex Volatile World State Refresh, Guardian Required Evidence 복구 | 안전성·정합성 개선; 최소화 성과 미측정 |
| Subagent Context Isolation | Codex Tree Message Board/Host Binding, Open SWE Shadow Review Separate Thread | Board와 Evidence Ledger 분리 필수 |
| RAG/Search Selective Context | Scope 제한 Managed Tool Discovery, Repo-owned Specialist Area Map | 새로운 독립 RAG Recall/Token Benchmark는 없음 |
| Prompt/Skill 파일 경량화 | 0.2.3 Tool Catalog Deferred, UTF-8 AGENTS.md 실패 격리 | 새 파일 자체 압축률/Token 실측 없음 |
| Tool Output 축약 | Codex #58964 Client Tool Output Retention 기본 ON, OpenCode Response Fold | Retention ON은 오히려 입력 Context 증가 위험; Fold는 CPU만 개선 |
| Cache | Anthropic Cache Usage 정상화, Stable vs Volatile Prefix 재검증 | Cache Hit로 절감 청구액을 단정하지 않음 |
| Session/Handoff/Ledger | TokenRun, Host Usage, In-memory Board, Invocation ID, QuickJS Snapshot | Board는 비영속; 최종 작업 상태는 Durable Store에서 조회 |
| Model Routing/Cost | Shadow Reviewer, Bounded Fallback, Explicit Model Selection, Host Usage | 정확도 보존/총 청구액 A/B 필수 |
| Evidence Verification | Guardian Required/Protected Recovery, Patch Review, Shadow Findings | Evidence Anchor/Hash의 누락 없는 보존이 목표 |

**주의 — Retention과 Compression의 구별:** [Codex #58964](https://github.com/openai/codex/pull/58964)는 retain_client_tool_outputs Feature를 UnderDevelopment/기본 OFF에서 **Stable/기본 ON**으로 바꾼 한 줄 설정 변경이다. 필요 Evidence의 Context 유지에는 이득이지만 *모든* 긴 로그를 Model에 보존하면 토큰이 늘 수 있다. 따라서 **Artifact 원본 보존 + 중요 Output 제한 Retention + 나머지 Pointer화**를 별도 실험해야 한다.

## 15. Perforce·TeamCity·UE5·Claude Code·Codex용 제안 아키텍처

다음은 위 프로젝트의 확인된 동작을 조합해 **제안한 Harness 아키텍처**이며 상용 구현이 그대로 제공된다는 의미가 아니다.

~~~mermaid
flowchart TB
 U[Task / P4 CL / Workspace] --> O[Durable Orchestrator: State + Admission + Budget]
 O --> C[Catalog Builder: Tool Digest / Skill Index / Policy Version]
 C --> R[Runtime Adapter: Claude Code or Codex]
 R --> M[Model Loop: Worker / Reviewer / Shadow]
 M --> S[Selective Tool Discovery + MCP]
 S --> P[Perforce / TeamCity / Artifact APIs]
 P --> E[Evidence Store: CL / Diff / Build Log / Hash]
 E --> V[Guardian / Reviewer Verification]
 M --> B[In-memory Message Board: Worker Handoff]
 B --> O
 O --> L[Ledger: Runs / Events / Approval / Cost / Completion]
 V --> L
 L --> D[Delivery + develop/GitHub Remote Reconcile]
~~~

**데이터 소유권 원칙:** Run State/Approval/CL/Cost/Event는 Orchestrator의 Durable Storage가 소유한다. Model Loop와 Tool 자체는 Runtime Adapter가 실행하되, Persistent Side Effect를 수행한 적이 있는지 **Remote Source of Truth**로 확인한다. In-memory Board는 Task Coordination에만 사용한다.

### PoC A — Runtime Ownership vs Mirror Graph

- 환경: Windows 11/TeamCity, Mock P4 100 CL, Tool 150개(P4 50, Build 40, Analysis 30, Admin 30), Claude Code·Codex 각각 동일 30개 Task.
- A=Backend Graph Replica + Worker 고정; B=Shared Run Catalog+TokenRun/Stateless Backend; C=B+Host-owned Turn Admission/Usage.
- 장애 주입: 10개 Worker Kill, 5개 Network Partition, 중단 후 중복 Tool Result 10회, Policy Revision 변경 5회.
- 지표: 첫 Model Call p50/p95, Run/Checkpoint Stored Bytes, orphan child, duplicate side-effect, lost approval, Token/Cost Ledger 불일치, verified task 성공률.
- **합격 제안:** Cross-depot Leak/Unauthorized Submit/Orphan 0, 중복 CL/Build 0, Success Drop 2%p 이하, p95 또는 검증 작업당 USD가 유의미하게 개선. Token과 CPU 개선은 분리 보고.

### PoC B — 0.2.3 Tool Search + Hook Rewrite + Stable/Volatile Context

- 150개 Tool Spec을 모두 노출(A), Provider-native Tool Search(B), B+승인 이전 PreTool Hook Command Wrapper(C)로 비교.
- 동일 50 작업×3회, Cold/Warm Prompt Cache 분리. 매 Turn Hook Rewrite 원문과 최종 명령/승인 결정/Executor Permission을 Log.
- Cache 총 입력/생성/읽기 Token, SDK Request Size, Tool Recall@1, Missing Tool, Prompt Prefix Hash, Hook Failure, 실제 Provider Bill/Verified Task 수집.
- **합격 제안:** 잘못된 Tool Invocation/Approval Bypass 0, Critical Tool Recall 감소 없음, Provider Bill 최소 10% 감소 확인 시 채택. 모듈 설치/구성 변동으로 Cache가 불안정하면 재평가.

### PoC C — Reviewer Shadow Model, Evidence Completeness

- 40개 P4 CL(의도적으로 삽입된 버그 10, 실제 정상 변경 30), Live Reviewer와 Shadow Reviewer에게 동일 Base CL/Build Log Evidence 제공.
- Shadow는 Read-only 실행, 실제 Review Comment나 CL Update 금지. Finding 출처(P4 Line/Build ID/Artifact Hash) 필수.
- Metric: Precision/Recall, Critical Missing Rate, False Block Rate, Verified Finding당 USD, p50/p95 Time, Reviewer Context Token.
- **합격 제안:** 치명 결함 누락 0 증가, Verified Finding Precision 악화 2%p 이하, 비용 최소 15% 감소. Shadow에 비용이 추가되므로 실험 비용도 Accounting.

### PoC D — Retry/Compaction/Handoff/Cost Ledger

- 동일 CI/Build Task에서 429/Timeout/Stream Drop/Runtime Crash를 각 25회 주입. 도구 호출 전/중/후 장애를 분리.
- 사고 시 QuickJS/P4/TeamCity 실제 상태를 원격 조회, Pending Ack/Completed Tool 분리. Partial Model Text는 Final Verdict로 재사용 금지.
- Compaction 전후 Stable Policy와 Volatile Token Budget, Required Evidence Hash를 비교하고, Cache Usage Total을 Anthropic/Create/Read 합계와 대조한다.
- **합격 제안:** 중복 Submit 0, Evidence Loss 0, Cost Attribution 누락 0, Budget 초과 후 추가 요청 0, Resume 후 stale auth 0.

## 16. 실무 우선순위 및 한계

**바로 적용할 설계 원칙:** (1) SDK+App 이중 Retry 제거와 Deadline 통일, (2) Tool Side Effect 이후 원격 상태 확인, (3) Cache Token·Reasoning Token을 포함한 실제 Cost Receipt, (4) Compaction 후 Volatile Context Refresh/Required Evidence 보존, (5) Hook Rewrite 이후 **변경된 명령으로 승인**, (6) Code Mode Redirect마다 Permission 재검사, (7) Host Tool 실패 상세 로그는 Model 외부 Evidence Store 보존.

**PoC 최우선:** (1) MDA Single Graph/TokenRun과 Codex Host Runtime 소유권을 기반으로 한 **Runtime-independent Durable Orchestrator**, (2) Deep Agents 0.2.3 Provider-native Tool Search, (3) Shadow Review로 Model Routing/비용 정책 평가.

**아이디어 참고:** Open SWE Goal Mode, Unix Pipe Process Daemon, Event Fold CPU 최적화는 적용 전 Platform/실제 비용 성격이 맞는지 검증해야 한다.

**이번 조사에서 독립적으로 확인되지 않은 것:** 동일 품질 과제의 새로운 RAG 검색 Token 절감률, Prompt/Skill 파일 압축 대비 성공률, Host Runtime 대비 Provider Billing의 순절감률, Windows용 Pipe Daemon 완성, 주요 신규 PR이 Codex 정식 rust-v0.166.0에 포함된다는 증거. 11/02 Codex 변경 대부분은 **main 병합**이며 공식 정식 Rust Release로 확인된 최신은 **0.166.0(10/29 게시)**, 0.167.0-alpha.3(11/01)는 Pre-release다. Claude Code의 최신 확인 정식 버전은 **2.1.316(10/31 게시)**로 이번 관찰 기간에 새로운 정식 버전은 확인되지 않아 중복 분석하지 않았다. Open SWE의 Desktop 0.3.11(11/02 게시)과 Nightly에 특정 PR이 포함된 것, 제품 전체의 정식 Agent Runtime 기능 배포 여부는 같은 명제가 아니다.

## 참고 자료 및 추적 원본

- [Open SWE TokenRun/Backend Mirror 제거 #4922](https://github.com/langchain-ai/open-swe/pull/4922)
- [Open SWE Shadow Review #4908](https://github.com/langchain-ai/open-swe/pull/4908)
- [Open SWE Bounded Retry #4728](https://github.com/langchain-ai/open-swe/pull/4728)
- [Open SWE Private Managed Tool Discovery #4190](https://github.com/langchain-ai/open-swe/pull/4190)
- [Open SWE Goal Mode #4742](https://github.com/langchain-ai/open-swe/pull/4742)
- [Open SWE QuickJS Snapshot 설명 #4909](https://github.com/langchain-ai/open-swe/pull/4909)
- [Codex Host Admission #58963](https://github.com/openai/codex/pull/58963)
- [Codex Host Usage #58975](https://github.com/openai/codex/pull/58975)
- [Codex Message Board #58973](https://github.com/openai/codex/pull/58973)
- [Codex World State Refresh #58956](https://github.com/openai/codex/pull/58956)
- [Codex Guardian Budget Restore #58962](https://github.com/openai/codex/pull/58962)
- [Codex Client Output Retention #58964](https://github.com/openai/codex/pull/58964)
- [Deep Agents Code 0.2.3 정식 릴리스](https://github.com/langchain-ai/deepagents/releases/tag/deepagents-code%3D%3D0.2.3)
- [Deep Agents Hook Rewrite #7384](https://github.com/langchain-ai/deepagents/pull/7384)
- [OpenCode Response Fold #61194](https://github.com/anomalyco/opencode/pull/61194)
- [OpenCode Code Mode Redirect #60502](https://github.com/anomalyco/opencode/pull/60502)
- [Microsoft Agent Framework Anthropic Cache Usage #9859](https://github.com/microsoft/agent-framework/pull/9859)
- [Microsoft Agent Framework Copilot Reasoning #9773](https://github.com/microsoft/agent-framework/pull/9773)
- [Microsoft Agent Framework CodeAct Redaction #9971](https://github.com/microsoft/agent-framework/pull/9971)

**결론:** 새로운 Harness의 핵심 진전은 단순한 Context 압축보다 **누가 Runtime/예산/증거를 소유하는지 결정하고, 압축·복구·Handoff 뒤에도 그 소유권을 검증하는 구조**에 있다. 가장 재현 가치가 높은 조합은 **TokenRun 기반 Stateless Backend + Host-owned Admission/Usage + Provider-native Tool Search + Shadow Evidence Reviewer**다. 수치가 없는 토큰 절감 기대를 실적처럼 제시하지 않고, 검증된 작업당 실제 Provider Bill을 최종 지표로 삼는다.
