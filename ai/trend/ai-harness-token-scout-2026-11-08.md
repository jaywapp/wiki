---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-08"
category: trend
tags: [ai-harness, coding-agent, orchestration, context-engineering, token-optimization, skills, hooks, mcp, progressive-disclosure, selective-context, rag, compaction, prompt-cache, subagents, durable-state, runtime-adapter, evidence-verification, session-handoff, task-lifecycle, model-routing, cost-accounting, perforce, claude-code, codex]
source:
  - https://github.com/openai/codex/pull/60157
  - https://github.com/openai/codex/pull/60163
  - https://github.com/openai/codex/pull/60040
  - https://github.com/anomalyco/opencode/pull/62459
  - https://github.com/openai/codex/pull/60037
  - https://github.com/openai/codex/pull/60038
  - https://github.com/openai/codex/pull/60039
  - https://github.com/openai/codex/pull/59994
  - https://github.com/openai/codex/pull/59995
  - https://github.com/openai/codex/pull/59998
  - https://github.com/openai/codex/pull/59999
  - https://github.com/openai/codex/pull/60000
  - https://github.com/openai/codex/pull/60001
  - https://github.com/openai/codex/pull/60002
  - https://github.com/strands-agents/harness-sdk/pull/5792
  - https://github.com/strands-agents/harness-sdk/pull/5922
  - https://github.com/openai/codex/pull/60041
  - https://github.com/openai/codex/pull/60096
  - https://github.com/openai/codex/pull/60049
  - https://github.com/openai/codex/pull/60080
  - https://github.com/openai/codex/pull/60075
  - https://github.com/openai/codex/pull/60006
  - https://github.com/openai/codex/pull/60018
  - https://github.com/anomalyco/opencode/pull/62507
  - https://github.com/anomalyco/opencode/pull/62569
  - https://github.com/anomalyco/opencode/pull/62571
  - https://github.com/anomalyco/opencode/pull/62266
  - https://github.com/anomalyco/opencode/releases/tag/v2.2.6
  - https://github.com/langchain-ai/deepagents/pull/7589
  - https://github.com/langchain-ai/deepagents/releases/tag/langchain-quickjs%3D%3D0.3.12
updated: 2026-11-08
---

# AI Harness · Context/Token Optimization Scout — 2026-11-08

> **기준:** 2026-11-08 약 05:56 KST(11/07 약 20:56 UTC). 중심 관찰기간은 2026-11-06 21:00~11-07 20:56 UTC. GitHub REST에서 PR의 `merged_at`과 Release의 `published_at`을 대조하고 PR 설명, 실제 Changed Files, 일부 Test/Snapshot을 검사했다. 사전 비교: [11/07](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-07.md), [11/06](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-06.md), [11/05](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-05.md), [11/04](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-04.md), [Wiki 분류 정책](https://github.com/jaywapp/wiki/blob/develop/ai/Orchestration.md). PR의 자체 테스트는 사내 Perforce·유료 Provider에서 독립 재현한 결과가 아니다.

## 0. 핵심 결론·전일 대비 신규성

**이번 조사에서 신규 의미가 큰 구현을 확인했다.** (1) Code Mode 중첩 `functions.exec` Tool Catalog를 증분 갱신하는 실제 실행경로, (2) 에이전트 VM의 일시정지/재개에서 idempotent vs durable Tool을 계약으로 분리, (3) Guardian 원본 Evidence의 Channel 선택·고정 Cutoff·순서·예산 내 전달, (4) Cached Tool List로 stdio MCP 기동 자체를 연기하는 기능, (5) 중형 블록 때문에 영구 실패하던 Context Compaction의 수렴형 복구, (6) Session 내 저장된 System Prompt의 권한 상승을 차단하는 개선, (7) Terminal Auth 오류의 무의미한 재시도 제거와 Host Budget 승인 계약이 핵심이다.

**중복 제거 기준:** 11/07 `Codex #59832`는 일반 Responses Tool Declaration Incremental 실험이고, 오늘 `#60157/#60163`은 Code Mode의 중첩 Tool/Namespace를 별도로 증분 배포한다. 또한 오늘 `#60040`에서 `incremental_tools_legacy`가 **일반 OpenAI Responses가 아닌 Amazon Bedrock Provider로 한정**되도록 변경됐음을 확인했다. 11/06 Guardian `#59669~71`은 Original Capture/Housekeeper이며, 오늘 `#59994~60002`는 Reviewer 선택과 **Original Delivery**까지의 후속 구현이다. 11/07 Strands Stable Prefix Cache와 BM25 검색 성능을 재수록하지 않는다.

| 우선 | 오늘 새로 확인한 구현 | 정량적 근거/한계 | 판단 |
|---|---|---|---|
| 1 | [OpenCode #62459](https://github.com/anomalyco/opencode/pull/62459) Durable/Idempotent Tools & VM Suspend | 19개 파일 변경, 중복 방지 규칙·테스트, USD 미측정 | **PoC 최우선** |
| 2 | [Codex #60157/#60163](https://github.com/openai/codex/pull/60163) Code Mode Nested Tool Incremental Update | 2개 Feature Gate 및 새 Snapshot, Token 절감 미측정 | **PoC 최우선** |
| 3 | [Codex Guardian #59994~60002](https://github.com/openai/codex/pull/60001) Whole-Original Evidence Delivery | Source Order/Admission ACK, 비용 미측정 | **PoC 최우선** |
| 4 | [Codex #60037~39](https://github.com/openai/codex/pull/60039) Cached stdio MCP Lazy Start | 기본 OFF, 실제 Startup과 Catalog 분리 | **PoC** |
| 5 | [Strands #5792](https://github.com/strands-agents/harness-sdk/pull/5792) 중간 크기 블록 Compaction 수렴 | 실패 14/14 재현 사례, 수정 뒤 7라운드 수렴 주장 | **바로 적용 원칙/PoC** |
| 6 | [Strands #5922](https://github.com/strands-agents/harness-sdk/pull/5922)·[Codex #60041](https://github.com/openai/codex/pull/60041) Resume Trust Boundary | 저장된 System Prompt 무시, 신뢰 명시 | **바로 적용 원칙** |
| 7 | [Codex #60096](https://github.com/openai/codex/pull/60096)·[#60080](https://github.com/openai/codex/pull/60080) Retry/Auth Budget | Terminal 401/403 재시도 중단 | **바로 적용 원칙** |
| 8 | [Codex #60049](https://github.com/openai/codex/pull/60049) Child Model Capability 보존 | Warm/Cold/실패 Cache 회귀 검증 | **바로 적용 원칙** |
| 9 | [OpenCode #62507](https://github.com/anomalyco/opencode/pull/62507)·[#62569](https://github.com/anomalyco/opencode/pull/62569) Skill Discovery | Skill endpoint 분리·Cold Start Race 수정 | **PoC** |
| 10 | [OpenCode v2.2.6](https://github.com/anomalyco/opencode/releases/tag/v2.2.6) MCP Pool | 11/06 공식 릴리스로 채택 가능성 변화 | **PoC** |
| 11 | [Codex #60006](https://github.com/openai/codex/pull/60006)·[#60018](https://github.com/openai/codex/pull/60018) Ledger/Cost Trace | 토큰 Total에 대한 부분 DB Update·Turn Trigger | **바로 적용 원칙** |
| 12 | [Deep Agents #7589](https://github.com/langchain-ai/deepagents/pull/7589) Synthetic Message 출처 | HumanMessage 내부 사용자/Tool 구분 | **바로 적용 원칙** |

**숫자 해석:** `14/14`는 수정 전 특정 Overflow 실패 재현, `7`은 Truncation 반복 횟수다. 두 값 모두 Token 절감률이 아니다. 이번 날짜 신규 작업에 대한 **같은 성공률/품질의 LLM Provider Bill·Verified Task 비용 절감률은 확인되지 않았다.** CPU·네트워크·캐시 비율·재시도 횟수와 청구 Token을 별도 측정한다.

## 1. Code Mode Nested Tool 선언을 증분 전파 — Codex #60157/#60163/#60040

**신규성:** [#60157](https://github.com/openai/codex/pull/60157)는 **2026-11-07 18:24 UTC**에 병합, [#60163](https://github.com/openai/codex/pull/60163)는 **19:26 UTC** 병합. 전자는 `functions.exec` 안에 매달린 Tool별 안정적 정의·Namespace Instructions 렌더링과 Hash 기반 변경 감지를 구현하지만 Runtime Activation은 아직 비활성화된 기반 작업이었다. 후자는 그 정보를 Tool Router에서 Session World State로 연결하고 **CodeModeOnly + Responses Lite + IncrementalTools + IncrementalExecTools**를 함께 켠 경우 증분 업데이트를 허용한다.

**코드·테스트:** `codex-rs/core/src/context/world_state/top_level_tools.rs`, `core/src/session/world_state.rs`, `core/src/tools/{router,spec_plan}.rs`, `core/tests/suite/scenarios_exec_tools.rs`, `snapshots/all__suite__scenarios__exec_tools__incremental_exec_tools.snap`. 실제 PR에 Snapshot/Test를 추가해 Tool Addition, Removal, Schema Edit, Namespace Instruction Change, Eager/Deferred 전환, Tool Reenable, Retained Context, Compaction 뒤 Full Catalog 복원 동작을 검사한다.

**동작:** 바깥 `functions.exec`의 공통 설명·타입·선언을 Prefix로 고정하고 그 내부의 작은 Tool/Namespace Entry만 변경 시 Developer Message에 삽입한다. 제거된 Tool은 Explicit Removal, 변경된 Tool은 완전한 새 정의로 대체한다. Exec Tool이 숨겨졌다 복원되더라도 Hash를 보존하고 마지막 상태를 재건한다. Compaction 시점에 최신 전체 Catalog로 정규화한다.

**중요한 Provider Gate 정정:** [#60040](https://github.com/openai/codex/pull/60040)(11/07 02:38 UTC)는 11/07 보고서의 일반 Responses `incremental_tools_legacy` 기능을 **`amazon-bedrock` 및 `amazon-bedrock-runtime` Provider ID로 제한**했다. Responses Lite는 별도 `incremental_tools` 경로다. 이를 일반 OpenAI 모델의 기본 기능으로 안내하면 잘못이다.

**절감 원리/위험:** 150 Tool 중 변경된 몇 항목만 재선언해 Cache Prefix 변화를 억제할 수 있지만, 실측 Cache Tokens/USD가 없고 변경 공지가 누적되면 History가 늘 수 있다. Stale Tool Definition/ACL Drift가 품질·보안 위험이다. P4 PoC는 Full Tool List vs Canonical Sorted vs Nested Incremental을 150 Tool, 50 Task×3회, Permission Revoke 10회, Tool Mutate 20회, Compaction/Resume 20회로 비교한다. Input/Cached/Output Tokens와 `Tool Recall@1`, 권한 위반, Verified Task당 Bill을 반드시 함께 계측한다. **판정: PoC 최우선, 기본 활성화 보류.**

## 2. Tool 실행 단계 자체를 Durable Contract로 분리 — OpenCode #62459

**신규성:** [#62459](https://github.com/anomalyco/opencode/pull/62459), **11/07 19:06 UTC**, `dev` 병합. `packages/codemode/src/{tool.ts,tool-runtime.ts,vm/runtime/driver.ts,vm/snapshot/codec.ts}` 및 `test/vm/suspend.test.ts`에 다수 수정(해당 Test 약 969줄 추가). 실험적 Bytecode VM을 이용하는 `@opencode/codemode` 영역이며 **모든 OpenCode CLI에서 당장 사용 가능한 안정 기능이라고 단정하지 않는다**.

**구현된 세 계약:**
- 일반 `Tool.make.execute`: Plain Tool이 실행 중이면 Suspend를 거부한다. `SuspendError.running`에 각각 `{key,path}`가 들어간다.
- `Tool.idempotent`: Suspend 중 실행 중이면 Interrupt하고 Snapshot에는 `queued`로 남긴다. Resume 후 동일 Call Key로 재실행하고 `maxToolCalls` 및 after-hook에서 중복 집계를 피한다. 읽기·조회·서버 멱등키를 처리하는 작업에 적합하다.
- `Tool.durable({start,wait,cancel})`: Start가 JSON Serializable Job Handle을 반환하면 `started`로 Snapshot 가능하다. Suspend는 Remote Job을 취소하지 않고, Resume할 때 기존 Handle로 `wait`에 다시 붙는다. 진짜 Run Cancel/Exit일 때 `cancel`을 호출한다. `await` 여부나 `Promise.all` 여부에 기대지 않고 VM이 진행 중 Durable Job을 복원한다.

모든 Tool은 `<runId>:<callId>` 형태의 고정 키를 Hook/Tool/Snapshot에 남긴다. Snapshot Codec에는 Extension Callback의 출처(어느 Extension이 만든 함수인가)를 보존하는 메타데이터도 추가했다.

**P4 적용:** `p4 describe`, `p4 filelog` 조회는 idempotent; TeamCity Build Queue 및 원격 테스트 Job은 durable; `p4 submit`은 위험한 Side Effect로 분류한다. Submit을 무작정 idempotent로 등록하지 말고, CL Revision과 External Transaction Receipt를 통해 실행 여부를 Reconcile한다. `start` ACK 전에 Worker가 죽는 구간도 있으므로 서버 측에 Idempotency Key를 먼저 등록하고 같은 키로 Job 조회를 지원해야 한다.

**시험:** Build 100건×중단 시점(시작 전/중, Job 등록 전/후, wait, 완료 직전)에 강제 Kill. Duplicate Build Queue 0, Lost Running Job 0, Double P4 Submit 0, Receipt/Artifact URI 보존, 실제 Retry Token/Cost를 기록한다. 이번 PR은 인터페이스와 테스트이지 이러한 목표가 이미 독립 재현됐다는 뜻은 아니다. **판정: PoC 최우선.**

## 3. Guardian Evidence Delivery의 원자성·Cutoff — Codex #59994~60002

**신규성:** 2026-11-06 **21:54~22:26 UTC**의 연속 병합. [#59994](https://github.com/openai/codex/pull/59994)는 Reviewer용 Read-only Search/List/View, [#59995](https://github.com/openai/codex/pull/59995)는 Reviewer 자신의 Channel Subscribe/Unsubscribe, [#59998](https://github.com/openai/codex/pull/59998)는 Atomic Bulk Subscription Update, [#59999](https://github.com/openai/codex/pull/59999)는 Model-based Channel Selection, [#60000](https://github.com/openai/codex/pull/60000)는 Source Order Delivery Planning, [#60001](https://github.com/openai/codex/pull/60001)는 Whole Original Delivery, [#60002](https://github.com/openai/codex/pull/60002)는 Local Board 구체 구현을 `BoardReadView`/`AgentMessageBoard` Trait로 분리한다.

**실제 소스·테스트:** `codex-rs/ext/guardian-v3/src/delivery.rs`, `tests/retrieval/{delivery,planning}.rs`, `message-board/src/local/catalog.rs`. Reviewer는 캡처된 Board View의 Namespace, Channel Catalog 및 Post Cutoff를 기준으로 Evidence를 읽는다. 다른 Reviewer의 Subscription을 바꾸거나 미래에 추가된 Channel을 몰래 포함하지 못한다. Model이 채널을 고르면 Byte Limit/Deadline/Cancel을 거치고, Commit할 때 원자적으로 반영한다.

**전달:** 선택 채널에서 Original Request ID를 읽어 Cross-Channel Duplicate 제거→Source History Ordinal 순으로 정렬→Budget 내에서 **완전한 Post 단위**로 배치→`guardian_original_evidence` Context로 투입한다. 입장(Admission) 콜백 성공 뒤에만 Delivered Ordinal을 기록하고, 부분 성공 뒤 Retry에서도 성공한 Evidence를 다시 넣지 않도록 한다. Oversized Original을 임의로 잘라 Provenance 없는 Verdict를 내서는 안 된다.

**절감 원리와 Trade-off:** Whole Transcript를 넣지 않고 필요한 Evidence Channel만 선택해 입력 Context를 제한한다. 반면 잘못된 Channel Selection은 False Negative, Whole-Record 제한 초과는 Evidence 누락으로 이어질 수 있다. P4 CL Provenance·TeamCity Build Verdict·Human Approval은 필수 Channel로 강제하고, 너무 큰 Original은 Digest와 Signed Artifact URI를 제공한 뒤 필요하면 '검증 불충분'으로 종료한다. 11/06에 지적한 **Intake Cursor의 메모리 기반 한계**를 독립 Durable Cursor/Outbox/ACK로 보강해야 한다. 새 실제 LLM 비용 벤치마크는 없다. **판정: PoC 최우선.**

## 4. Cached MCP Catalog만 먼저 사용, Process Startup은 나중에 — Codex #60037~39

**신규성:** [#60037](https://github.com/openai/codex/pull/60037), [#60038](https://github.com/openai/codex/pull/60038), [#60039](https://github.com/openai/codex/pull/60039), 11/07 **02:26~02:29 UTC** 병합. `mcp_lazy_stdio_startup`은 **기본 OFF**이며 Config/Experimental Feature에서 켜야 한다.

**동작/소스:** `codex-rs/codex-mcp/src/{connection_manager.rs,runtime.rs}`, `codex-rs/config/src/mcp_types.rs`, `core/src/session/mcp_runtime.rs`, `features/src/lib.rs`와 Cached stdio Dormant Snapshot을 확인. 일반 Chat에서 Tool Definitions가 Cache에 있고 `startup_readiness="catalog"`인 적격 stdio 서버는 Tool이 실제 호출되기까지 Process를 만들지 않는다. 실시간 기동이 필수인 Server와 명시적 Reconnect는 Eager. Subagent가 나중에 첫 호출하면 최신 Protocol Sharing Negotiation이 동작하고, 구형 Legacy Catalog가 New Protocol Discovery를 덮어쓰지 못한다. 기동 실패 시 단순 Unavailable 대신 **해당 Server Startup Error**를 돌려주되 Host Token/비밀값은 오류에 포함하지 않는다.

**P4 PoC:** MCP 서버 20개를 설정하고 실제 사용은 2개인 구성, Cold Start 30회. Eager/Lazy의 p50/p95 Ready, Process·Memory, Discovery Bytes, Connection Count, Cached Catalog Accuracy, Tool ACL 및 Model Input Tokens 측정. 승인·감사 Hook처럼 시작 즉시 살아 있어야 하는 서버는 Lazy하지 않는다. 비용/토큰 개선 실측 없음. **판정: PoC.**

## 5. Mid-size 블록만 잔뜩 있어 Compaction이 영원히 실패하는 문제 — Strands #5792

**원본:** [#5792](https://github.com/strands-agents/harness-sdk/pull/5792), **11/06 21:54 UTC**. `strands-py/src/strands/agent/conversation_manager/compression/truncate_text.py` 및 `summarizing_conversation_manager.py`, 테스트 두 개를 수정했다.

**실패 원인:** 이전 Truncation Fallback은 `preserve_chars=2,000` 기준 `3×preserve_chars=6,000`자 초과인 큰 블록만 잘랐다. User Message 한 건 안에 `5,000자×80블록`이 있으면 전체 Context가 넘쳐도 **어느 블록도 자르지 못해** 다음 Turn마다 `Cannot summarize: insufficient messages`가 반복됐다.

**수정:** 2,000자 이하는 유지한다. 2,000자보다 큰 중간 블록도 앞뒤 각각 `min(preserve_chars, len//4)`자를 보존하므로 해당 블록에서 최소 절반의 문자가 제거된다. 8,000자 초과 기존 동작, 큰 블록 우선, 이미 자른 블록 재처리 금지, Pinned Message 보호, Budget Doubling은 유지한다.

**작성자 주장 및 한계:** 구버전 1.63.0 및 Haiku 4.5/Sonnet 4.6/Opus 5에서 해당 실패를 **14/14** 재현했고, 패치 후 80×5K 예시는 `1+2+4+8+16+32+64`의 **7라운드**로 회복된다고 보고했다. 이는 LLM Token 절감 실측이 아니라 **실패 복구**다. 많은 2K 이하 블록으로 Overflow하면 여전히 해결되지 않으며, 저장소 Session에 중복 재시도 상태가 남는 문제는 별도 Persist Fix 필요.

**P4 적용:** Compiler Error 80×5KB, 작은 Log 500×1KB, 거대한 단일 Log 각각 A/B; Overflow 재시도 수, 에러 위치 유지율, Build Failure Classification, Token/Cost per Verified Task, Raw Artifact Hash 유지 측정. 원본은 보존하고 Model-visible Log만 잘라야 한다. **판정: 바로 적용 원칙 / PoC.**

## 6. Resume한 파일에서 System Prompt를 읽지 않는다 — Strands #5922 / Codex #60041

**Strands [#5922](https://github.com/strands-agents/harness-sdk/pull/5922), 11/06 22:07 UTC:** 프로젝트 안에 위치한 Session Directory의 Snapshot Prompt나 `<session>/agent.json`이 CLI Profile보다 높은 권한으로 로드될 위험을 수정했다. Print/Plain/ACP Resume 경로가 저장된 System Prompt를 제거한 후, 현재 신뢰된 Profile에서 새 Prompt/Agent Definition을 생성하도록 합쳤다. `agent.json`은 더 이상 읽거나 쓰지 않으며 기존 파일도 무시한다. `strands-cli/src/tui/session/agent-definition.ts`, `cli/run.ts`, `tui/acp/server.ts` 및 `test/fixtures/saved-system-prompt.ts`에서 관련 변경/회귀 테스트를 확인했다. Python Project Agent는 범위 밖이고 Live Model Test는 수행되지 않았다.

**Codex [#60041](https://github.com/openai/codex/pull/60041), 11/07 02:39 UTC:** 비대화형 `codex exec`/`codex review`에서 Sandbox가 Workspace Write라도 Project Config/MCP를 자동 신뢰하지 않는다. `--trust`를 명시할 때만 신뢰를 현재·후속 Chat에 저장한다. `--ephemeral`과 결합해도 **Trust는 영속 가능**하고, 명시적으로 Untrusted인 프로젝트나 `--ignore-user-config`와 함께 쓸 수 없다.

**P4 Harness 핵심:** Session Transcript는 복구 가능한 **Data**이고, System Prompt/Managed ACL/Approved Skill Manifest는 Host가 소유하는 **Policy**다. 복제한 Depot Branch, 악성 Session Snapshot, 외부 Agent File에서 권한 상승 0을 검증. CI 배치에 `--trust`를 무차별 붙이는 방식은 도입하지 않는다. Token 절감 자체가 목적이 아니라 작업권한 무결성 확보. **판정: 바로 적용 원칙.**

## 7. Budget/Auth/Child Capability — Codex #60096/#60080/#60075/#60049

**Terminal Denial [#60096](https://github.com/openai/codex/pull/60096), 11/07 09:49 UTC:** HTTP 401/403 Body와 Identity Error Header의 Terminal Runtime Denial, Permanent Refresh Token 실패를 구분해 Retry와 Credential Refresh를 중단한다. 일반 Credential Expiration은 기존 Recovery 유지. `core/tests/suite/runtime_auth_denials.rs` 등에서 Complete Turn 테스트. **목표:** Auth Revoked 상황에서 불필요한 API 시도/회복 Loop 0.

**Async Model Budget [#60080](https://github.com/openai/codex/pull/60080), 11/07 07:45 UTC:** `ModelRequestContributor::budget_exhausted`를 Future로 변경하고 HTTP 및 WebSocket 실제 Generation 직전에 Await한다. WebSocket Warmup은 비용이 드는 Generation이 아니므로 Check를 생략. Await 도중 Account Switch가 일어나면 Setup과 Connection부터 재구성한다. **정확한 Admission Policy** 변화다.

**Tier Acceptance [#60075](https://github.com/openai/codex/pull/60075), 11/07 06:51 UTC:** Service Tier 조회·Host Acceptance Receipt가 비동기화됐으며 Same-Tier 요청은 Receipt를 공유한다. Child Prewarm과 Step Capture에도 Accepted Tier를 이어 붙인다. 모델/비용 Routing의 승인 일관성에 가치가 있다.

**Child Model Catalog [#60049](https://github.com/openai/codex/pull/60049), 11/07 03:17 UTC:** Child를 생성하기 전에 최종 Provider/Auth/Originator의 Model Catalog를 초기화하고 **최신 In-memory Snapshot**에서 모델을 선택한다. Disk 저장 실패와 Concurrent Refresh가 있어도 Tool Search Capability 등을 잃지 않는다. Warm/Cold/Disabled Cache와 Empty Response, Failed Write 테스트를 추가했다.

**P4 적용:** Policy/Budget Permission Epoch 확인 → Model Catalog Capability Hash 확인 → Child Spawn → Tool ACL 재검사. Terminal Denial은 즉시 Stop, Recoverable Expiration은 횟수 제한 후 복구. 신규 Token/USD 측정은 없지만 Retry Waste와 잘못된 Model Routing의 품질 손실을 피할 수 있다. **판정: 바로 적용 원칙.**

## 8. Skill Progressive Disclosure / Discovery Integrity — OpenCode #62507/#62569/#62571/#62266

- [#62507](https://github.com/anomalyco/opencode/pull/62507), **11/07 07:08 UTC**: Console Config의 비표준 `library` 필드에서 Instruction/Skill List를 빼내 `/api/v2/instructions`와 `/api/v2/skills`로 각각 조회하고 필요한 Bundle만 `/api/v2/skills/:slug`로 다운로드. 같은 Credential Header/Cache Refresh 주기를 유지한다. 404/일부 403/잘못된 List는 Empty, 429/5xx/Timeout은 Last Known Good List 보존 및 재시도. List만 변경된 Refresh가 기존 Equality 버그로 Managed Deny 처리되던 문제를 `isDeepStrictEqual`로 수정했다. 작성자 측 530개 테스트 통과 주장; 실제 LLM Token 절감 아님.
- [#62569](https://github.com/anomalyco/opencode/pull/62569), **11/07 11:53 UTC**: `GET /api/skill`가 Plugin 로드 전에 `[]`를 반환하던 Race 수정. Plugin 준비까지 기다리고 실패 시 503을 명시하며 Cold Start 회귀 테스트 추가.
- [#62571](https://github.com/anomalyco/opencode/pull/62571), **11/07 12:12 UTC**: Markdown Agent Discovery가 `node_modules`, `.git` 등 Dependency Directory에서 README를 Agent 정의로 오인하지 않도록 필터 추가. 이미 보고한 Deep Agents Ripgrep Filter와 같은 목표의 별도 코드다.
- [#62266](https://github.com/anomalyco/opencode/pull/62266), **11/07 11:31 UTC**: MCP `prompts/list` Refresh 실패 때 기존 Prompt를 일괄 삭제하지 않고 마지막 정상 Catalog를 유지한다. 최초 List 실패라면 보존 가능한 것이 없어 Empty.

**적용:** Repo/Org Skill과 Role/Principal Scope를 분리한다. 목록은 짧은 Description/Schema만 공개하고 실제 Skill Body는 사용 직전 로드한다. Snapshot TTL과 Permission Version을 포함해 Old Catalog로 ACL을 우회하지 않게 한다. P4 500 Skills·동시 활성 5개, 반복 Refresh 100회, 강제 Credential Revoke 10회 테스트. **평가: PoC, Discovery Filter 및 Last Good Snapshot 원칙은 바로 적용.**

## 9. OpenCode v2.2.6: Shared MCP Pool의 릴리스 도달

[v2.2.6](https://github.com/anomalyco/opencode/releases/tag/v2.2.6) 공식 발표: **11/06 23:37 UTC**. `pool: true` PR [#61185](https://github.com/anomalyco/opencode/pull/61185)은 이미 **11/04 23:43 UTC** 병합되었으므로 신규 PR로 포장하지 않고 “정식 배포 가용성의 변화”로만 수록한다.

설정이 같은 Directory/Workspace는 단일 MCP Connection과 Tool List를 공유한다. Key에는 URL, Header/OAuth, Protocol, Timeout, Selected Credential ID와 Local Command/Resolved CWD/Env 등이 반영되고 Secret은 Hash로 비교한다. MCP 2026-07-28 Sharing Protocol이 아니거나 Sharing을 거부하면 Private로 Fallback. Local Server는 고정 CWD가 필요하고 Workspace-backed는 Private를 유지한다. 각 Directory는 Claim을 갖고 마지막 Holder가 떠나면 Connection이 종료된다.

업스트림 제시된 **10 Directory/Cloudflare Tool Catalog 10중 복제(3,765 Tools), Local MCP 10 Process≈189MB**는 개선 전 문제 사례이지, 개선 후 청구비용 절감량이 아니다. Shared Process Crash가 여러 Project를 동시에 실패시키거나 계정간 Credential 혼합을 만들 수 있다. 사내 P4 Read-only/공통 Service 계정에만 제한적으로 PoC하며 P4 Submit/개별 ACL Tool Pool은 엄격히 분리. **평가: PoC.**

## 10. Durable Ledger/Cost Attribution/메시지 출처 — Codex·Deep Agents

**Codex [#60006](https://github.com/openai/codex/pull/60006), 11/06 22:45 UTC:** SQLite의 Token Total/Timestamp만 변한 Session Activity Update에 전체 Metadata 쓰기 대신 부분 Update. History Writer가 DB Connection을 잡기 전에 직렬화해 Reader Pool을 보호하고, Cumulative Byte Window 조회를 한 번의 SQL로 처리한다. **DB 처리 비용 개선 가능성**이지 LLM Token 감소가 아니다.

**Codex [#60018](https://github.com/openai/codex/pull/60018), 11/07 01:25 UTC:** Tool/Artifact/Skill/App/Plugin/Hook Usage Event에 `turn_trigger`를 넣어 누가 Turn을 유발했는지 원인을 분리한다. User Request·Automation·Compaction·Recovery의 Token/Cost를 하나의 User Turn으로 덮어쓰지 말아야 한다.

**Codex [#60122](https://github.com/openai/codex/pull/60122), 11/07 12:41 UTC:** Code Mode Dispatch가 Code Cell이 생성되기 전에 실패하더라도 실패 요청·결과를 Rollout Trace에 남긴다. Evidence Verification과 Retry Diagnosis를 위해 중요하다.

**Deep Agents [#7589](https://github.com/langchain-ai/deepagents/pull/7589), 11/06 22:14 UTC:** Video Frame/내부 Nemotron Reminder가 기존 `HumanMessage` 타입으로 저장되면 사용자 실제 입력으로 오인될 수 있어 Source Metadata를 추가했다. Message Role과 실제 Actor/Authority를 동일시하면 안 된다. `source_type=user|tool|automation|reviewer|synthetic`, `actor_id`, `origin_tool_call`, `evidence_uri`를 독립적으로 보존해야 한다.

**새 릴리스 확인:** [langchain-quickjs==0.3.12](https://github.com/langchain-ai/deepagents/releases/tag/langchain-quickjs%3D%3D0.3.12), **11/07 05:00 UTC**. [#7460](https://github.com/langchain-ai/deepagents/pull/7460)의 Interpreter Destructor Blocking 문제 수정, 중첩 PTC Schema `$ref` 처리, Per-call Timeout Disable 지원. 종료·Schema 안정성 가치지만 새로운 Token 최적화 실측은 없다. 무제한 Timeout은 CI 기본값으로 권장하지 않는다. **아이디어 참고.**

## 11. Perforce + Claude Code + Codex Harness 적용 설계

`TaskRequest / P4 CL` → `Host-owned Policy / Permission Epoch` → `Durable Ledger(idempotency key, External Job ID)` → `Role-scoped MCP Tool+Skill Catalog / Selective Context` → `Claude Code Build Worker / Codex Guardian Reviewer` → `Original Artifact Store / Captured Evidence View` → `Handoff ACK / Verified Verdict / Provider Cost Receipt`.

**계층 간 계약**
1. Session File은 Resume할 Data만 담고, System Prompt·Managed Approval·Skill Trust는 Signed Host Config에서 재생성한다.
2. Tool Call Intent/External Side Effect Receipt/Model Answer를 분리한다. P4 Submit 불확정 결과는 Blind Retry가 아니라 Remote Reconcile.
3. Guardian이 Evidence Channel을 좁혀도 P4 CL Revision, Build Verdict, User Approval은 필수 Channel이다. Delivery ACK는 모델 Context Admission 성공 뒤에만 기록한다.
4. Cache Key에 Org/Principal, Permission Epoch, Tool Manifest Hash, Model+Provider, P4 Depot Scope를 포함한다. Stale ACL보다 Cache Hit가 우선하지 않는다.
5. Child Model Routing은 Host Budget Accept, Runtime Authentication, 최신 Capability Catalog 검사 이후에만 수행한다.
6. Model-visible Tool Output은 Budgeted Excerpt, 원본 Build Log/Stacktrace는 SHA/Immutable Artifact URI로 별도 보존.
7. Compaction은 Pending Messages의 Consumption Receipt·Boundary ID를 보존하고, Overflow Fallback은 Pinned Evidence 보호/반복 상한을 둔다.

### 재현용 PoC Matrix

| 테스트 | 조건/비교 | 기록값 및 합격 목표(제안) |
|---|---|---|
| Tool Catalog Delta | Full vs Stable Sorted vs Incremental; 150 Tools×50 Tasks×3 | Cache Read/Write, Prompt Bytes, Tool Recall, 권한 오호출 0 |
| Suspend/Durable | 100 TeamCity Builds, Start·Wait 중 Kill | Remote Job 유실 0, 중복 Queue 0, P4 Double Submit 0 |
| Guardian Retrieval | 100 CL Reviews, Channel 10개, 중복/초과 Original | Required Evidence 누락 0, Source Order 보장, 중복 Admission 0 |
| MCP Lifecycle | 20 Servers, 실제 2 Active, Cold Start 30회 | Process 수, p50/p95, Stale-ACL 0, Error Provenance 유지 |
| Context Overflow | 80×5K, 500×1K, 100MB Log | Infinite Retry 0, 중요한 Error Span Recall 비열화 |
| Resume Trust | 위조 System Prompt, Agent File, Private Skill | 정책 상승 0, 사용자별 Tool Access 분리 |
| Child Routing | Warm/Cold Catalog, Disk Write Fail, Auth Revoke | Capability 누락 0, Revoked Auth Retry 0 |
| Token Billing | Claude Code/Codex 2모델×50작업 | Billed Input+Output+Cache Read/Write+Failed Retry 전체 일치 |

**권장 Ledger 필드:** `task_id, run_id, actor_id, turn_trigger, runtime_id, model_id, provider, permission_epoch, skill_manifest_sha, tool_catalog_sha, p4_client, p4_changelist, base_revision, tool_call_id, idempotency_key, external_job_id, evidence_ordinal, original_artifact_uri, artifact_sha256, reviewer_cutoff, context_bytes, raw_tool_bytes, visible_tool_bytes, input_uncached_tokens, cache_read_tokens, cache_write_tokens, output_tokens, retry_count, provider_cost_usd, verified_result, elapsed_ms`.

**KPI:** `cost_per_verified_task = (Provider Billed Tokens+Cache Read/Write 비용+실패·재시도 호출 비용+Host Infra 비용) / 검증 성공 작업 수`. 달러·Token·지연을 혼합하지 말고 품질 비열화 시 불합격. 실측 계약 가격/Region/Provider에 맞춰 계산한다.

**적용 순서:** 이번 주 **즉시 원칙 반영**(Session Policy Trust, Terminal Retry Stop, Original Evidence 보존, Cost/Trigger 분리) → **작은 PoC**(Durable Tool, Nested Incremental Catalog, Guardian Delivery) → **옵션 실험**(Cached MCP Lazy Startup/Connection Pool/Compaction Fallback). 안정 API나 Provider에서 지원하지 않는 실험 Flag는 기본 활성화하지 않는다.

## 12. 신규 정보가 없거나 도입 가치가 낮은 분야

- 11/07 Strands BM25 검색 102→1ms 사례와 Codex Host Output Truncation 기본 ON은 이미 전일 Scout에 기록됐으므로 새 수치로 재사용하지 않았다.
- 이번 조사 구간에는 **독립 재현된 신규 RAG Recall/Context Selectivity·Model Token Saving Benchmark가 없다**. 검색 성능이 빠른 것과 실제 LLM Bill이 적은 것은 다른 관측치다.
- Prompt/Skill File 길이 최적화는 개별 Skill Body Lazy Load·Catalog 분리 위주로 진전했으나, 새로운 Byte/Tokens Reduction 수치는 검증되지 않았다.
- **도입 가치 낮음:** 모든 Tool을 멱등이라고 표시하기, 권한이 다른 사용자의 MCP Connection Pool 강제 공유, 무작정 `--trust`를 CI에 추가, Git Repo Session Snapshot에서 System Prompt를 읽기, Oversized Evidence를 임의 Truncate하고 Valid Verdict 처리, 인증 철회에 무한 Retry.
- 공식 [Claude Code v2.1.319](https://github.com/anthropics/claude-code/releases/tag/v2.1.319)는 **11/06 17:04 UTC** 게시되어 전일에 이미 보고됐다. 이번 조회 시 더 새로운 Stable Claude Code 릴리스는 확인되지 않았다. [Codex v0.169.0-alpha.3](https://github.com/openai/codex/releases/tag/rust-v0.169.0-alpha.3)는 **11/07 19:31 UTC**의 Pre-release로, 오늘 병합된 개별 PR이 정식 Stable 배포됐다는 증거로 취급하지 않는다.

## 13. 참고 원문 및 조사 범위

**Codex:** [#60157](https://github.com/openai/codex/pull/60157), [#60163](https://github.com/openai/codex/pull/60163), [#60040](https://github.com/openai/codex/pull/60040), [#60037](https://github.com/openai/codex/pull/60037), [#60038](https://github.com/openai/codex/pull/60038), [#60039](https://github.com/openai/codex/pull/60039), [#59994](https://github.com/openai/codex/pull/59994), [#59995](https://github.com/openai/codex/pull/59995), [#59998](https://github.com/openai/codex/pull/59998), [#59999](https://github.com/openai/codex/pull/59999), [#60000](https://github.com/openai/codex/pull/60000), [#60001](https://github.com/openai/codex/pull/60001), [#60002](https://github.com/openai/codex/pull/60002), [#60006](https://github.com/openai/codex/pull/60006), [#60018](https://github.com/openai/codex/pull/60018), [#60041](https://github.com/openai/codex/pull/60041), [#60049](https://github.com/openai/codex/pull/60049), [#60075](https://github.com/openai/codex/pull/60075), [#60080](https://github.com/openai/codex/pull/60080), [#60096](https://github.com/openai/codex/pull/60096), [#60122](https://github.com/openai/codex/pull/60122).

**OpenCode:** [#62459](https://github.com/anomalyco/opencode/pull/62459), [#62507](https://github.com/anomalyco/opencode/pull/62507), [#62569](https://github.com/anomalyco/opencode/pull/62569), [#62571](https://github.com/anomalyco/opencode/pull/62571), [#62266](https://github.com/anomalyco/opencode/pull/62266), [#61185](https://github.com/anomalyco/opencode/pull/61185), [v2.2.6](https://github.com/anomalyco/opencode/releases/tag/v2.2.6).

**Strands/Deep Agents:** [Strands #5792](https://github.com/strands-agents/harness-sdk/pull/5792), [Strands #5922](https://github.com/strands-agents/harness-sdk/pull/5922), [Deep Agents #7589](https://github.com/langchain-ai/deepagents/pull/7589), [QuickJS 0.3.12](https://github.com/langchain-ai/deepagents/releases/tag/langchain-quickjs%3D%3D0.3.12).

**검증 수준:** GitHub 공식 REST의 병합·릴리스 시각, PR의 설명, 변경 소스 위치·테스트 목록·Snapshot 파일명 확인. 일부 Diff Patch를 열어 실제 Source/Test의 존재를 확인했으며 로컬 빌드·사내 P4/TeamCity 실험·Provider 실제 Bill 재현은 아직 수행하지 않았다. **새 성능 수치의 독립 재현이 없다는 사실을 성과로 과장하지 않는다.**

**최종 판단:** 이번 Scout의 의미 있는 변화는 Token 자체보다 **비용이 발생하는 실행과 근거 전달을 안전하게 복구·선택적으로 수행하는 Harness 계약의 성숙**에 있다. 모든 새 기능은 최소 Cost/Verified Task와 Permission/Evidence Accuracy를 함께 검증한 뒤 운영으로 승격한다.
