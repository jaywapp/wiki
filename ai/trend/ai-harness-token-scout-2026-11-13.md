---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-13"
category: trend
updated: 2026-11-13
tags: [ai-harness, coding-agent, context-engineering, token-optimization, orchestration, skills, hooks, progressive-disclosure, compaction, subagents, durable-state, runtime-adapter, evidence-verification, handoff, ledger, task-lifecycle, mcp, prompt-cache, model-routing, cost-accounting, perforce, claude-code, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-11-13

> 조사 시점: 2026-11-13 06:00 KST 전후. 주 관찰 구간은 2026-11-12 UTC에 실제 병합된 PR과 당일 공식 릴리스다. GitHub REST에서 개별 PR의 merged_at, 본문, changed_files와 선별된 /files Diff 및 테스트 경로를 확인했다. jaywapp/wiki develop의 11/08~11/12 Scout와 기존 Strands Context Manager, Skill File Context Optimization, Evidence-First Harness, Claude+Codex 토큰 최적화 문서를 읽어 중복을 제외했다. 업스트림 테스트와 수치는 작성자 보고이며 사내 독립 재현이 아니다.

## 0. 결론, 신규성 및 중복 판정

**오늘은 의미 있는 신규 구현이 있다.** 우선순위는 (1) Context offload의 메시지/블록 단위 분리 및 검색 가능한 원본 보존, (2) Turn별 주입 Context와 캐시 Prefix의 안정화, (3) MCP Skills의 온디맨드 조회·캐시 격리, (4) Subagent 체크포인트 위치의 명시적 기록, (5) Background/Resume/Approval/Evidence의 정확한 영속성, (6) Reasoning Replay 제거량 계측이다. 실제 Provider Bill 절감률을 입증한 신규 자료는 없다.

**중복 제거:** 11/12의 BM25 Tool Search #62984, Compact JSON #63258, Durable Subagent Outbox #63209/#63382, Plan Attachment #60763, MCP Skill 512개/16MiB 제한 #10265, Model Routing #5995는 반복하지 않는다. 오늘 #10275는 단순 리소스 상한이 아니라 기존 MCP Skill 발견 프로토콜을 대체하는 BREAKING 구현이고, #7580은 기존 Durable Outbox와 달리 완료된 Subagent의 실제 Checkpoint Namespace를 노출한다. 11/11의 Compaction Usage #7644와 오늘 #61017은 각각 비용 누락 수정과 Provider Reasoning Replay 제거 계측으로 구분한다. 기존 Wiki의 Strands Context Manager는 stash·preset의 기초 구조를 이미 다루므로 오늘 #5325는 새로운 granularity 계약과 typed placeholder에 한정한다. 기존 Skill File Optimization의 일반적인 3계층 설계는 다시 설명하지 않는다.

| 순위 | 11/12 UTC 병합 항목 | 새로운 실체 | 평가 |
|---|---|---|---|
| 1 | [Strands #5325](https://github.com/strands-agents/harness-sdk/pull/5325) | Offload 조건/대상 분리, Typed OffloadedBlock, Stash Retrieval | **PoC 최우선** |
| 2 | [Strands #5977](https://github.com/strands-agents/harness-sdk/pull/5977) | Durable InjectedBlock + Turn-scoped System + Cache Prefix | **PoC 최우선** |
| 3 | [Agent Framework #10275](https://github.com/microsoft/agent-framework/pull/10275) | MCP skills/list/get 전환, TTL·Hash·Caller Scope | **PoC 최우선** |
| 4 | [Deep Agents #7580](https://github.com/langchain-ai/deepagents/pull/7580) | Task ToolMessage에 실제 Checkpoint Namespace | **PoC 최우선** |
| 5 | [Codex #61017](https://github.com/openai/codex/pull/61017) | Reasoning Replay Removal Telemetry | **바로 적용 계측 원칙** |
| 6 | [Agent Framework #9874](https://github.com/microsoft/agent-framework/pull/9874) | Background/Continuation 이중 History 저장 제거 | **바로 적용 원칙** |
| 7 | [OpenCode #63415](https://github.com/anomalyco/opencode/pull/63415) | 직접 구동 Child Session의 재시작 복구 | **PoC 최우선** |
| 8 | [Agent Framework #10291](https://github.com/microsoft/agent-framework/pull/10291) | 승인 상태의 Native Session 단일 소유 | **PoC 최우선** |
| 9 | [Codex #61163](https://github.com/openai/codex/pull/61163) | Guardian Direct Review의 독립 History 재사용 | **PoC** |
| 10 | [Agent Framework #9877/#9878](https://github.com/microsoft/agent-framework/pull/9878) | FIDES Continuation/Replay 출처 검증 | **바로 적용 보안 원칙** |
| 11 | [Agent Framework #10282](https://github.com/microsoft/agent-framework/pull/10282) | MCP Toolbox를 Response/Caller별로 격리 | **바로 적용 보안 원칙** |
| 12 | [Strands #6055](https://github.com/strands-agents/harness-sdk/pull/6055) | MCP Tool Catalog Refresh의 소유권 충돌 방지 | **바로 적용 원칙** |
| 13 | [OpenCode #63592](https://github.com/anomalyco/opencode/pull/63592) | Prompt/Tool 변경 후 서명된 Thinking 충돌 회피 | **PoC/주의** |
| 14 | [Codex #60981](https://github.com/openai/codex/pull/60981) | OAuth Refresh 취소와 Credential Persistence 분리 | **바로 적용 원칙** |
| 15 | [Gemini CLI #30258](https://github.com/google-gemini/gemini-cli/pull/30258) | Silent Stream의 Body Timeout 재시도 낭비 방지 | **바로 적용 원칙** |

**정량 판정:** #5325의 122개 추가 테스트, #5977의 Claude 실호출 5회, #63415의 124개 회귀 테스트, #10282의 603개 .NET 테스트는 동작 검증이지 토큰 절감률이 아니다. #5977의 Cache Read 관찰은 적중의 존재만 보여준다. 동일 품질의 Verified Task당 Provider 실제 청구액 절감률은 오늘도 **새로 검증되지 않았다**.

## 1. Context Engineering / Offload / Prompt Cache

### 1.1 Strands #5325 — Offload의 트리거와 제거 단위 분리

- **신규성·내부:** 11/12 19:19 UTC 병합. TypeScript에서 대상이 "*"이면 메시지 단위, toolResults/media 등은 블록 단위로 고정한다. blockThreshold는 대상 크기, contextUtilization은 발동 시점, preserveRecent는 보호 범위를 의미한다. 수치와 "N%" 표현을 구분하고 구형 threshold/utilization 및 소수 0.85는 거부한다. OffloadedBlock 타입이 원본 Ref와 제거 방법을 기록한다. 메시지 제거 시 Tool Call/Result Pair와 Role 교대를 보존하고 Stash에 저장한 뒤 retrieve_context가 필요 부분을 원래 Content Block으로 반환한다.
- **Source/Test:** strands-ts/src/context-manager/strategies/offload/conditions.ts, target.ts, base.ts, context-manager/message-trimming.ts, placeholder.ts, retrieval-tool.ts, stash.ts. PR은 50개 파일, 122개 추가 케이스, Context Manager 중심 480개 통과, 확장 범위 1,889개 통과를 보고한다.
- **토큰 원리·Trade-off:** 전체 로그/미디어를 매 Turn 반복 전달하지 않고 작은 Preview+Ref만 모델에 보인다. 원본 재조회로 복원 가능하지만 요약 호출 비용, 검색 지연, 누락된 Retrieval로 인한 답변 품질 저하가 있다. Offload 자체의 입력 토큰 감소율/비용 절감률은 미측정. TypeScript와 Python API의 의미가 일부 다르므로 기계적 설정 복사는 위험하다.
- **Perforce 적용·평가:** **PoC 최우선.** UE5 Cook/TeamCity Log는 ToolResult 블록으로 500-token Preview+Artifact SHA를 남기고, P4 CL Description·검증 Evidence는 보호 대상으로 둔다. 100개 실패 로그에서 오류 근거 회수율 100%, 원문 Hash 일치, 모델 입력 토큰/재조회 횟수/청구 비용을 A/B 측정한다. Media Drop 시 UI의 이미지·영상 Evidence 접근도 유지해야 한다.
- **원본:** https://github.com/strands-agents/harness-sdk/pull/5325

### 1.2 Strands #5977 — 주입된 지침의 Durable Representation과 Stable Prefix

- **신규성·내부:** 11/12 15:38 UTC 병합된 Python 포트. ContextInjector가 최근 User Message에 source/text를 가진 InjectedBlock을 기록하고 세션에도 남긴다. 지원 Anthropic 모델에서는 각 주입을 다음 User Message까지 유효한 임시 System Message로 변환하며, 기타 모델에는 최신 주입 텍스트만 전송한다. Cache Point는 변동 주입 텍스트 앞에 둔다. Subagent Fork는 부모의 Reasoning/InjectedBlock을 제외한다.
- **Source/Test:** strands-py/src/strands/injection/_message_injection.py, models/_model_proxy.py, models/anthropic.py, harness-py/tools/subagent.py 및 test_openai_injection_cache.py. 작성자는 strands-py 8,736개·harness-py 849개 테스트 통과와 Claude Opus 5.5 실호출 5회에서 Cache Read를 보고한다. 기능을 끄거나 기존 main에서는 2번째 호출에 Thinking Signature 400 오류가 났다는 대조가 있다.
- **토큰 원리·Trade-off:** AGENTS.md/환경/일시적인 Tool 지침이 System Prefix를 매번 흔들지 않도록 분리해 Cache 재사용을 돕는다. 다만 Durable History에는 주입 블록이 추가되고 Provider의 Temporary Message Capability와 Beta 지원에 의존한다. Cache Read 비율, 실제 요금 절감률, 장기 세션 품질은 미측정이다. 일부 문서가 이전 Ephemeral 동작을 설명하므로 버전·지원 모델 확인이 필요하다.
- **Perforce 적용·평가:** **PoC 최우선.** 고정 정책/Skill Definition은 Cache Prefix, 변동 CL 번호·Workspace Root·P4 Revision·오늘 날짜는 Turn-scoped Injection으로 분리한다. Claude Code와 Codex의 실제 Provider 요청 형식이 다르므로 동일 API로 가정하지 말고 Adapter별 Capability를 검증한다. 30 Turn Cold/Warm 실험에서 Cache Read, Signature 오류, 총 비용, 완료율을 비교한다.
- **원본:** https://github.com/strands-agents/harness-sdk/pull/5977

### 1.3 Agent Framework #10275 — MCP Skills Extension으로 전환

- **신규성·내부:** 11/12 17:35 UTC 병합, .NET BREAKING. 과거 skill://index.json·Archive 기반 발견을 폐기하고 MCP 서버가 io.modelcontextprotocol/skills를 광고하면 페이지형 skills/list, 선택적 skills/get을 사용한다. SKILL.md Frontmatter를 완전 검증하고 Manifest의 Size/Hash, 지원 파일 Path Traversal, 총 Resource 상한, Caller별 cacheScope, TTL 및 서버 변경 후 갱신을 다룬다. Dynamic Resource도 지원한다.
- **Source/Test:** dotnet/src/Microsoft.Agents.AI.Mcp/Skills/AgentMcpSkill.cs, AgentMcpSkillsSource.cs, McpCache.cs, McpSkillsCatalog.cs, McpSkillFrontmatterParser.cs, AgentMcpSkillsSourceOptions.cs, 샘플 Agent_Step06_McpBasedSkills. 58개 변경 파일을 확인했다. 기존 11/12 #10265의 512개/16MiB 제한과 달리 오늘은 프로토콜 및 Cache Architecture 전환이다.
- **토큰 원리·Trade-off:** Skill 전체를 System Prompt에 붙이지 않고 메타데이터 탐색→필요 Skill/Resource 조회로 Progressive Disclosure를 구현한다. 실제 모델 Input Token/Cache Hit/요금은 미측정. Private Scope를 공유하면 타 사용자 Skill 내용 누출 위험, 지나친 TTL은 갱신 지연, 너무 짧은 TTL은 네트워크 비용이 생긴다. 외부 Provider Cache를 중첩하면 TTL 무효화가 발생할 수 있어 문서가 Outer Cache 비활성화를 요구한다.
- **Perforce 적용·평가:** **PoC 최우선.** 사내 P4/TeamCity/UE5/Script Tool Skill 150개를 Catalog로 분리한다. Public Metadata와 Project/권한별 Private Resource Cache를 분리하고 Hash·Revision을 Ledger에 남긴다. Skill 교체/권한 변경/동시 사용자 10명 테스트에서 Unauthorized Disclosure 0, stale Skill 실행 0을 우선 합격 기준으로 둔다.
- **원본:** https://github.com/microsoft/agent-framework/pull/10275

### 1.4 Deep Agents #7580 + LangGraph 1.2.21 — Subagent History의 정확한 Locator

- **신규성·내부:** 11/12 09:14 UTC 병합, deepagents 0.7.36(11/12 16:14 UTC) 포함. Task ToolMessage의 Model-visible Text는 그대로 두고, 모델에 전달하지 않는 artifact.checkpoint_ns에 실제 Subagent Checkpoint Namespace를 기록한다. Compiled Graph를 values/checkpoints Stream으로 실행해 첫 Checkpoint Event의 Namespace를 잡는다. Retry 시 tools:<id>|1, 별도 checkpointer 사용 시 tools처럼 Tool Call ID에서 추정한 값과 달라질 수 있다. Checkpoint가 저장되지 않으면 빈 값이다.
- **Source/Test:** libs/deepagents/deepagents/middleware/subagents.py, tests/unit_tests/test_subagents.py, 후속 #7695의 RunnableBinding/RunnableRetry 회귀 테스트. LangGraph 1.2.21(11/12 17:47 UTC)은 미선언 Namespace 읽기 시 Parent Graph로 Fallback한다. 이 Fallback은 Subgraph 고유 State/Interrupt를 누락하거나 잘못 해석할 수 있다는 #9614의 경고를 유지해야 한다.
- **토큰 원리·Trade-off:** 부모 Context에는 짧은 Task Result와 Namespace Locator만 전달하고 필요할 때 해당 Child History를 선택적으로 읽는다. 무분별한 전체 Child History Replay를 피할 수 있으나 실제 Token 절감률은 미측정. Namespace만으로 State Schema를 증명할 수 없고 런타임·Graph Version을 함께 보관해야 한다.
- **Perforce 적용·평가:** **PoC 최우선.** Task ID, Child Runtime ID, Checkpoint Namespace, Graph Schema Version, P4 CL, Artifact SHA를 Ledger로 연결한다. Retry/Resume/동시 Child 100개에서 잘못된 Child History 0, Evidence 참조 100%를 검증한다.
- **원본:** https://github.com/langchain-ai/deepagents/pull/7580 ; https://github.com/langchain-ai/langgraph/releases/tag/1.2.21

## 2. Cost / Reasoning / Model Routing

### 2.1 Codex #61017 — Reasoning Replay Removal의 관측 가능성

- **신규성·내부:** 11/12 04:31 UTC 병합. Responses의 input_transformations에서 제거된 Reasoning Item 수와 사유를 읽어 SSE/WebSocket Completion Event 및 Sampling Telemetry로 전달한다. codex.responses.reasoning_replay 상태와 codex.responses.reasoning_items_removed Histogram을 추가하고 Unknown Reason은 other로 묶는다. 누락/Null/Malformed는 0으로 속이지 않고 Histogram에서 제외한다.
- **Source/Test:** codex-rs/core/tests/suite/reasoning_replay_metrics.rs, codex-rs/otel/src/events/session_telemetry.rs, codex-rs/otel/src/metrics/names.rs. SSE·WebSocket, Unknown Reason, Zero, Missing Report, Product SKU Tag 회귀 검증을 PR이 명시한다.
- **토큰 원리·Trade-off:** 절감 기능 자체가 아니라 Replay Context에서 무엇이 사라졌는지 계측하는 기능이다. 모델 내부 Reasoning 손실을 Input Token 감소와 혼동하면 안 된다. 실제 청구 비용·성공률 변화는 미측정. 민감한 Reasoning 원문 대신 Count/Reason만 수집해 Privacy 비용을 낮출 수 있다.
- **Perforce 적용·평가:** **바로 적용 계측 원칙.** Claude Code/Codex Adapter에 Replay Removed Count, Compaction Summary Usage, Cached Input, Retry Discarded Usage를 구분한 Cost Receipt를 추가한다. Provider가 보고하지 않은 경우 Unknown으로 유지한다.
- **원본:** https://github.com/openai/codex/pull/61017

### 2.2 Strands #5842 — Tenant Policy가 Failover에도 유지되는 Model Routing

- **신규성·내부:** 11/12 01:31 UTC 병합된 실행 가능한 공식 Guide. BeforeModelCall Hook보다 늦게 후보를 선택하는 ModelRouter에 대해 Tenant Allowlist와 Provider Failover를 RoutingStrategy에서 적용한다. DecisionModel 선택 자체의 Trace와 Usage도 요청 비용에 포함한다. 9개 시나리오를 Python/TypeScript × Local Decider/LLM DecisionModel 네 조합으로 검증했다고 보고한다.
- **토큰 원리·Trade-off:** 쉬운 작업을 저렴한 모델에 배정할 가능성은 있지만 Routing Model의 추가 Token과 Failover 재시도 비용이 생긴다. 작업별 Bill·Quality 비교 수치는 없다. Content 기반 Failover가 아니라 Provider 오류 기반 Failover임을 명시한다.
- **Perforce 적용·평가:** **PoC.** P4 읽기/로그 분류는 소형 모델 후보, Submit/권한/릴리스 승인은 높은 신뢰도 Reviewer로 제한한다. Tenant/Project별 Provider 제한을 Failover에도 재적용한다. Decision Cost를 포함한 Cost per Verified Task를 측정한다.
- **원본:** https://github.com/strands-agents/harness-sdk/pull/5842

### 2.3 Deep Agents #7585 — Optional Prompt-Caching Provider 탐색 Negative Cache

- **신규성·내부:** 11/12 19:54 UTC 병합, deepagents 0.7.37(20:03 UTC) 포함. Bedrock/Fireworks의 Optional Provider Class Import를 functools.cache로 성공/부재 모두 Memoize하고 Middleware Instance는 매번 새로 생성한다.
- **토큰 원리·Trade-off:** 반복 Agent 생성의 Import/초기화 오버헤드 감소이지 Provider Prompt Cache 적중률이나 Token 절감과 직접 관련이 없다. Cold Concurrent Lookup은 중복될 수 있고 Process Lifetime Cache로 환경이 변경되면 재시작이 필요할 수 있다.
- **Perforce 적용·평가:** **아이디어 참고.** Runtime Adapter Capability/Provider Discovery의 Negative Cache를 짧은 TTL로 구현하되 Credential·Project별 결과는 격리한다. 직접적인 Token 최적화 우선순위는 낮다.
- **원본:** https://github.com/langchain-ai/deepagents/pull/7585 ; https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.37

## 3. Durable State / Task Lifecycle / Approval / Evidence

### 3.1 Agent Framework #9874 — Background/Continuation의 History 이중 저장 방지

- **신규성·내부:** 11/12 19:20 UTC 병합. Background/Continuation 실행에서 PerServiceCallChatHistoryPersistingChatClient의 서비스별 Persist와 ChatClientAgent의 종료 Persist가 동일 메시지를 두 번 저장하던 경로를 정리한다. 중단된 Streaming이 Continuation Token을 발급했으면 현재 실행에서 Input을 Persist하지 않고 재개 실행이 최종 기록한다.
- **검증·토큰:** dotnet/src/Microsoft.Agents.AI/ChatClient/PerServiceCallChatHistoryPersistingChatClient.cs 및 297줄 규모의 추가 회귀 테스트. Duplicate History 감소는 장기 Context 재주입 비용을 줄일 잠재력이 있으나 Token 수치 미측정. 반대로 종료 Persist가 실패하면 누락 위험이 있어 Transaction/Outbox가 필요하다.
- **Perforce 적용·평가:** **바로 적용 원칙.** Run/Continuation ID별 단일 History Writer, Unique Event Key, Finalization Receipt를 사용한다. Background Build Resume 100회에서 History Duplicate 0, Missing 0, P4 Submit 중복 0을 검증한다.
- **원본:** https://github.com/microsoft/agent-framework/pull/9874

### 3.2 OpenCode #63415 — 직접 실행 Child의 Crash Recovery

- **신규성·내부:** 11/12 19:23 UTC 병합. Child를 직접 Continue하면 Execution Claim이 Durable Store에 남는데, 이전 Restart Sweep은 Running Subagent Job이 없는 Child Claim을 버렸다. 이제 Root와 같은 Bounded Recovery 경로로 Child도 재개하며 Job이 소유한 Child는 Job 복구가 담당한다. 영속 Cancellation이 우선한다.
- **검증·토큰:** packages/core/src/session/execution/restart.ts, session/store.ts, test/session-execution.test.ts. 7개 Fixture Suite 124개 통과, 두 번 Sweep에서 정확히 한 번 Drain 보고. Token 절감 직접 수치는 없으나 유실된 작업 재수행 비용을 피한다. Claim만으로 외부 P4 Submit 완료 여부를 추정하면 위험하다.
- **Perforce 적용·평가:** **PoC 최우선.** Parent/Child/Job Owner, Claim Lease, Cancellation, Tool Receipt를 독립 보존하고 재시작 때 외부 Build ID/P4 CL부터 조회한다. Kill -9 및 두 번 Recovery Sweep 테스트에서 Double Execution 0.
- **원본:** https://github.com/anomalyco/opencode/pull/63415

### 3.3 Agent Framework #10291 — 승인 권한을 Native Session으로 일원화

- **신규성·내부:** 11/12 12:50 UTC 병합, Python Foundry Hosting BREAKING. 별도 Approval Store를 폐기하고 AgentSession의 Pending Approval/Policy/Consumption을 유일한 권위로 사용한다. 승인 요청을 외부에 공개하기 전에 Native Session 전체를 Persist한다. Wire ID와 Native ID 상관관계만 Transport Metadata에 둔다. 과거 별도 Approval Record는 자동 마이그레이션되지 않는다.
- **토큰·Trade-off:** Approval History 중복과 상태 충돌을 줄일 수 있지만 직접 Token 절감 수치는 없다. Native Session Store 장애 시 Approval Publication 차단이 필요하고 기존 세션 Migration은 Breaking이다.
- **Perforce 적용·평가:** **PoC 최우선.** P4 Submit/Force Sync/Workspace Delete는 승인 Ledger의 Pending→Approved→Consumed 상태를 원자적으로 관리한다. 중복 승인 응답·재시작·이전 Session Token Replay를 모두 거부한다.
- **원본:** https://github.com/microsoft/agent-framework/pull/10291

### 3.4 Codex #61163 — Actor와 분리된 Reusable Guardian Reviewer History

- **신규성·내부:** 11/12 18:31 UTC 병합. 동일 Parent Thread의 순차 Direct Guardian Review가 독립 Reviewer Session의 과거 Review History를 재사용한다. Actor Context와 혼합하지 않으며 Parent 간 분리, Parent의 Persistence Policy 상속, Retry 시 현재 Policy로 재판정을 보장한다.
- **Source/Test:** codex-rs/core/src/guardian/review.rs, codex-rs/ext/guardian-reviewer/src/pool.rs, app-server/tests/suite/v2/guardian_sync_session_tests.rs, scenarios_guardian_direct_review.rs. 기존 Fresh Review와 달리 History 재사용은 Token/Cache 비용을 증가시키거나 낮출 수 있으며 수치 미측정.
- **Perforce 적용·평가:** **PoC.** CL 단위 Guardian History를 유지하되 다른 CL/Project의 Evidence와 Policy는 절대 섞지 않는다. Review Repeat 50회에서 False Approval 0, Cached Input, Reviewer Token, Quality를 비교한다.
- **원본:** https://github.com/openai/codex/pull/61163

### 3.5 Agent Framework #9877/#9878 — Continuation 및 AG-UI Replay의 출처 보존

- **신규성·내부:** 각각 11/12 11:14/13:15 UTC 병합. #9877은 Model이 실제 받은 History와 FIDES가 평가한 History/Continuation Identity를 일치시키고 부분 Archive·불명확한 Continuation은 Fail Closed 처리한다. #9878은 AG-UI에서 복원된 Snapshot과 새 Client Tool Result를 출처별로 표시해 Dedup/Reasoning Removal/Approval Safe Point를 지나도 서로의 신뢰 등급을 잘못 상속하지 않게 한다. Transport Marker는 Provider 호출 전에 제거한다.
- **토큰·Trade-off:** 불필요한 재분류/중복 Transcript Conversion을 줄이는 경로가 있으나 Token 절감률은 미측정. Security Label의 보수적 전파는 실행 차단을 늘릴 수 있다. Partial Archive를 완전한 History로 취급하면 안전성 실패다.
- **Perforce 적용·평가:** **바로 적용 보안 원칙.** P4/TeamCity Evidence에 trusted-server, restored-checkpoint, fresh-user-input 출처와 Hash를 붙이고, Handoff/Compaction 뒤에도 원본 Source Authority를 검증한다. Forged Approval, Partial History, Mixed Tenant 테스트 100% 차단.
- **원본:** https://github.com/microsoft/agent-framework/pull/9877 ; https://github.com/microsoft/agent-framework/pull/9878

### 3.6 Codex #61014 — Client Reconnect 중 Recovery Turn 보호

- **신규성·내부:** 11/12 04:18 UTC 병합. Recovery Turn이 Core Slot을 점유했지만 TurnStarted 이벤트가 아직 공개되지 않은 구간에서, Resume Override가 Thread를 Idle로 오인해 종료하던 문제를 Core has_active_turn()으로 막는다. Residency Unload에도 같은 Guard를 적용한다.
- **토큰·Trade-off:** 중단된 Recovery 재시도 비용 감소 가능, 실측 없음. 잘못된 Busy 판정은 Session Unload 지연을 일으킬 수 있다.
- **Perforce 적용·평가:** **바로 적용 원칙.** Task Status UI가 Idle이어도 Runtime Slot/Lease를 확인한 뒤 Worker 교체. Reconnect Race 100회, 완료 Event 누락 0.
- **원본:** https://github.com/openai/codex/pull/61014

## 4. MCP Runtime / Tool Catalog / Failure Handling

### 4.1 Agent Framework #10282 — Response별 MCP Toolbox Identity

- **신규성·내부:** 11/12 18:37 UTC 병합. Startup에 만든 MCP Session을 여러 Response에서 재사용하던 방식이 Caller Identity/OAuth Consent를 혼동시킬 수 있어, Response마다 Toolbox를 열고 Call ID를 바인딩하고 종료 시 Dispose한다. HTTP Connection Pool만 공유한다.
- **검증·Trade-off:** 25개 변경 파일, .NET 8/9/10 빌드 및 603개 Unit Test 통과(1개 기존 Skip), Live Foundry MCP 호출 확인. Session Setup/Discovery 비용은 증가할 수 있고 Token 절감은 미측정. 기존 Health Check 이름 제거는 Breaking이다.
- **Perforce 적용·평가:** **바로 적용 보안 원칙.** P4 Credential·MCP Session은 사용자/Project/Task Response별 격리, TCP Pool만 공유. 동시 사용자 10명에서 Tool 목록·승인·P4 Workspace Cross-talk 0.
- **원본:** https://github.com/microsoft/agent-framework/pull/10282

### 4.2 Strands #6055 — MCP Tool Refresh의 Namespace Ownership

- **신규성·내부:** 11/12 02:36 UTC 병합. MCP 서버가 Tool 목록을 갱신할 때 사용자 Tool이나 retrieve_context와 이름이 겹치면 덮어쓰고 나중에 삭제하던 문제를 해결한다. Registry.swap은 변경 전에 충돌/유효성을 검사하고 잘못된 Tool은 Warning으로 Skip하되 나머지 유효한 변경은 적용한다. 최초 등록 충돌은 기존처럼 실패한다.
- **토큰·Trade-off:** Dynamic Discovery 신뢰성 향상이지 Token 절감률 없음. 충돌 Tool을 Skip하면 특정 기능이 Catalog에서 빠지므로 Alert 필요.
- **Perforce 적용·평가:** **바로 적용 원칙.** P4/TeamCity Tool Registry는 Source ID + Name + Version으로 소유권을 구분한다. 150개 Tool Refresh와 공격적 Name Collision에서 Built-in Guardian/Retrieval Tool 유실 0.
- **원본:** https://github.com/strands-agents/harness-sdk/pull/6055

### 4.3 OpenCode #63592 — Prompt/Tool 변경 시 Stale Signed Thinking

- **신규성·내부:** 11/12 19:56 UTC 병합. Claude Agent Child 9개가 AGENTS.md/Agent Definition 변경 후 Signed Thinking이 이전 System Prompt에 결합되어 400 오류가 난 사례. Claude 프로세스에 내부 환경변수를 설정해 Prefix Mismatch Thinking Block을 Drop하도록 유도한다. OpenCode의 직접 Anthropic 경로는 이미 drop_block 옵션을 사용한다.
- **토큰·Trade-off:** 실패한 호출/재시도 감소 가능하나 수치 없음. 기존 Reasoning을 버리므로 품질/재추론 비용 Trade-off가 있고 해당 환경변수는 비공개·비보장 인터페이스다. 작성자는 Typecheck만 실행했고 Live Claude Subscription 검증은 하지 않았다.
- **Perforce 적용·평가:** **PoC/주의.** 내부 비공개 환경변수 복제는 **도입 가치 낮음**. 대신 Prompt/Tool Catalog Version 변경 시 새 Child Session 시작, 기존 Reasoning Replay 금지, 명시적 Handoff Ledger를 구현한다. 동시 Worker 20개에서 Signature 오류 0과 재추론 비용을 측정한다.
- **원본:** https://github.com/anomalyco/opencode/pull/63592

### 4.4 Codex #60981 + Gemini CLI #30258 — 취소/Timeout에 안전한 실행 경계

- **Codex 신규성:** 11/12 02:54 UTC 병합. MCP HTTP 401 후 OAuth Token Rotation을 Caller Cancellation과 독립된 Task로 완료해 Persist하고, 동시 Refresh는 Lock·Token 재확인으로 합친다. Session Cleanup은 Cached Credential만 사용한다. **바로 적용 원칙.** P4 인증 갱신·MCP OAuth를 Request Cancellation에 종속시키지 않되, Secret/Expiry를 재검증한다. Token 절감 수치 없음. https://github.com/openai/codex/pull/60981
- **Gemini CLI 신규성:** 11/12 19:33 UTC 병합. Request Timeout을 15분으로 늘려도 undici Body Timeout이 300초로 남아 Silent Tool Argument Stream이 중단되고 최대 4회 청구된 요청을 Replay하던 문제를 수정한다. bodyTimeout은 max(300초, configured request timeout)로 맞추며 30개 테스트 통과를 보고한다. **바로 적용 원칙.** UE5 대형 Tool Argument/Build Stream에서 Header/Body/Model Timeout을 따로 계측하고, Side Effect Tool은 Retry 전에 Receipt를 확인한다. "최대 4회 Replay"는 오류 경로 설명이지 절감된 청구액 측정이 아니다. https://github.com/google-gemini/gemini-cli/pull/30258

## 5. 선택적 검색 / Tool Discovery의 보조 신규 항목

**Strands #5878 (11/12 17:52 UTC 병합):** Read-only find_integrations가 Integrations JSON Feed를 조건 필터·검색하고 최대 50개 결과와 전체 Match Count를 제공한다. Feed TTL 10분, Stale-While-Error, Schema Version 확인, MCP 1.21.2/2.1.1에서 각각 123개 테스트 및 141개 Catalog E2E를 보고한다. **아이디어 참고/PoC.** 사내 Skill Catalog에서 Keyword/Type/Runtime/Owner 필터를 도입해 150개 Tool 정의의 일괄 노출을 줄이는 설계에 참고하되 실제 Model Input Token/검색 정확도 수치는 없다. https://github.com/strands-agents/harness-sdk/pull/5878

**OpenCode #63261 (11/12 03:41 UTC 병합):** Draft MCP Events를 Public Bus로 전달하고 Subscription ID의 Canonical Arguments Hash, Cursor/Heartbeat, 1~30초 Backoff, At-least-once Delivery를 구현했다. 단 Restart Persistence는 없고 실험 Flag 뒤에 있다. **PoC.** P4/TeamCity Event Stream은 Durable Cursor/Outbox가 별도 필요하며 중복 Event ID 처리 필수. https://github.com/anomalyco/opencode/pull/63261

**Codex #61178 (11/12 20:57 UTC 병합):** Cloud Conversation 단위 Speed/Service Tier 선택을 다음 Turn Admission에 적용하고 Model Compatibility를 검사한다. **아이디어 참고.** 모델 Routing의 비용·지연 제어면이지만 가격/성공률 절감 수치는 없고 Queue된 요청의 Tier Override는 거절된다. https://github.com/openai/codex/pull/61178

**추적만:** Codex #60942는 Thread-local Item/Context Window ID Cursor를 Replay/Compaction에 걸쳐 유지한다. 11/12에 병합됐으나 이전 #60839의 Replay ID/Revision에 대한 후속이므로 별도 핵심 항목으로 재포장하지 않는다. https://github.com/openai/codex/pull/60942 . Gemini CLI #30253은 Output Token Limit 표시를 8,192에서 알려진 모델의 65,536으로 수정했으며 실제 모델 Token 최적화가 아니라 Metadata 정확성이다. https://github.com/google-gemini/gemini-cli/pull/30253

**오늘 신규성 없음으로 분류:** 독립적으로 재현된 RAG Retrieval Precision 개선, SKILL.md 문자 압축만으로 검증된 품질 유지, Prompt/Skill 파일 경량화의 새로운 벤치마크, 동일 작업에서 Provider 청구액 절감률이 검증된 Cache/Model Routing 실험은 발견하지 못했다. 기존 Wiki의 Progressive Disclosure/Selective Context 기본 원칙을 반복하지 않는다.

## 6. Perforce·Claude Code·Codex Harness 실행 계획

### 6.1 권장 아키텍처 계약

1. **Task Lifecycle:** Task ID → P4 Workspace/CL/Base Revision → Parent/Child Session → Runtime Adapter → Durable Claim/Checkpoint → Tool Receipt → Approval → Evidence Verification → Cost Receipt → Handoff/Done. Task 상태는 queued, running, waiting-approval, recovering, verifying, done, failed, cancelled로 제한하고 모든 전이는 Event ID와 Epoch를 가진다.
2. **Context Plane:** 고정 정책/Tool Schema는 Stable Prefix, 매 Turn 변경되는 CL/Build/Workspace는 Scoped Injection. 대형 Tool Output은 Artifact Store에 원본+SHA를 남기고 Model에는 Preview/Ref/Provenance만 전달한다. Subagent History는 Checkpoint Namespace로 선택 조회한다.
3. **Trust Plane:** P4 Submit·Workspace Delete·Build Trigger는 Approval Authority와 Execution Receipt를 분리한다. AG-UI/Slack/Client 입력은 서버 Evidence/승인으로 승격되지 않으며 Resume/Replay 시 Current Policy로 재검증한다.
4. **Runtime Adapter:** Claude Code/Codex/기타 Provider의 Temporary Message, Cache Point, Reasoning Replay, Incremental Tool, Compaction, Tool Result Format, Cost Usage Capability를 Feature Matrix로 보관한다. 지원하지 않는 기능을 가정하지 않고 명시적으로 Fallback한다.
5. **Measurement:** Total Input/Output/Cached Input/Cache Write/Reasoning Removed/Compaction/Decision Model/Retry/Discarded Calls를 별도 Receipt로 기록한다. Task Quality Gate는 P4 Diff 검증, Test/Build Evidence, Guardian 승인 정확도, 중복 Side Effect 0을 포함한다.

### 6.2 재현 가능한 PoC 순서와 합격 기준

| 실험 | 입력/대조 | 반드시 기록할 지표 | 승격 조건 |
|---|---|---|---|
| A. Offload Granularity | UE5/TeamCity Log 100개, Message Drop vs Block Preview+Stash | Model Input, Retrieval 횟수, Evidence 회수율, Provider Bill | Evidence 100%, 성공률 비열화 없음, 비용 감소 확인 |
| B. Stable Prefix/Injection | 30 Turn × 3 모델/Adapter, 고정 Prompt vs Scoped Injection | Cache Read/Write, Signature 400, Input Token, Cost | 오류 0, 동일 품질, Provider별 실측 비용 우위 |
| C. MCP Skills On Demand | 150 Skill, 10명/3 Project, Full Load vs skills/list/get | Prompt Token, Fetch Latency, Stale/Private Leak | Unauthorized 0, stale 실행 0, Verified Task 품질 유지 |
| D. Child Checkpoint/Resume | 100 Child, Retry/Crash/Cancel/Restart Sweep 2회 | 정확한 Namespace, Duplicate Tool, Missing Evidence | Wrong History 0, Duplicate P4 Submit 0 |
| E. Approval/Guardian | 50 CL × Sequential Review/Replay/Policy 변경 | False Approval, Reviewer Token, Cached Input, Time | False Approval 0, Cross-Task Leakage 0 |
| F. Cost Receipt Completeness | 50 Task, Compaction/Decision/Retry/Timeout 포함 | Provider Usage vs Local Ledger Diff | 누락/중복 Receipt 0, 미보고 Usage는 Unknown |
| G. MCP Collision/Isolation | 150 Tool × 10 Concurrent Caller, Refresh/401/Cancel | Tool Owner, OAuth Credential, Caller Session | Cross-Tenant/Tool Hijack 0 |

**A/B 운영 원칙:** 동일 Task Dataset, 동일 P4 Base Revision, 동일 모델/Reasoning Effort/Temperature/권한, Cache Cold/Warm 분리, 실행 순서 무작위화. 결과는 Total Provider Billed Cost per Verified Task와 성공률의 Pareto 비교로 판단한다. Token 수치가 없으면 절감률을 임의 추정하지 않는다. P4 Submit/TeamCity Build는 Dry Run 또는 격리된 Test Workspace에서만 수행한다.

### 6.3 도입 순서

**바로 적용:** History/Approval 단일 소유권, Tool Registry Ownership, Response별 Credential/Session 격리, Replay 출처 검증, Cost Receipt 필드, Timeout/Retry 분류, Child Recovery Claim 검증.

**PoC 최우선:** Strands Block-level Offload, Scoped Injection/Cache Prefix, MCP Skills Discovery, Child Checkpoint Locator, Guardian History Isolation. 비용 절감이 검증되기 전에는 사내 기본값으로 강제하지 않는다.

**아이디어 참고:** Strands Multi-tenant Decision Routing, Integrations Feed 검색, Codex Cloud Speed Tier. **도입 가치 낮음:** 문서화되지 않은 Claude 내부 환경변수에 의존한 Signed Thinking 우회 및 단순 Import Negative Cache를 토큰 최적화의 핵심으로 채택하는 것.

## 7. 출처/검증 수준과 제한

- **직접 확인:** 2026-11-12 UTC 병합 여부(GitHub REST PR merged_at), PR 원문 설명과 테스트 주장, 선택한 PR의 changed_files 및 소스/테스트 경로, 공식 Deep Agents 0.7.36/0.7.37·LangGraph 1.2.21 릴리스, Claude Code 공개 릴리스(최신 확인 2.1.322, 11/10 게시)와 Codex 공개 릴리스(11/12 Alpha). Claude Code에는 11/12에 새로 게시된 공개 Release를 확인하지 못했다.
- **읽은 기존 Wiki:** 11/08~11/12 canonical Scout, ai/tools/strands-agents-context-manager.md, ai/skills/skill-file-context-optimization.md, ai/harness/evidence-first-agent-harness.md, ai/tips/token-optimization-claude-codex.md. 같은 일반 원칙과 이미 소개한 PR은 제외했다.
- **독립 재현하지 못함:** 업스트림 PR의 전체 CI 로그·모든 Diff 줄, Provider 실청구 영수증, 사내 Perforce/TeamCity/UE5 환경, Anthropic Beta Capability의 현재 운영 허용 여부, 모든 버전의 Feature Flag 기본값. PR 병합은 즉시 안정 버전 사용 가능을 의미하지 않는다.
- **측정 결론:** 오늘 확인된 Test Count, Cache Read 관측, 중복 History 제거, Timeout/Retry 회피는 모두 잠재적 효율 개선의 근거다. **동일 성공률/품질을 유지한 실제 Provider Cost 절감률은 확인되지 않았다.**

**최종 판단:** 오늘의 가장 높은 실무 가치는 단순 Prompt 단축이 아니라 **원본 Evidence를 유지한 Block-level Offload + Cache-stable Scoped Injection + Caller-isolated Skill Discovery + Durable Child/Approval Ledger**를 하나의 측정 가능한 Harness 계약으로 결합하는 것이다.
