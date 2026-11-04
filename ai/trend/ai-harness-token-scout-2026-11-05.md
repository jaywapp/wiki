---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-05"
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, skills, hooks, progressive-disclosure, mcp, selective-context, rag, compaction, prompt-cache, session-handoff, subagents, model-routing, durable-state, runtime-adapter, evidence-verification, ledger, tool-output, cost-accounting, perforce, claude-code, codex]
source:
  - https://github.com/openai/codex/pull/59404
  - https://github.com/openai/codex/pull/59480
  - https://github.com/openai/codex/pull/59445
  - https://github.com/openai/codex/pull/59280
  - https://github.com/openai/codex/pull/59489
  - https://github.com/openai/codex/pull/59401
  - https://github.com/openai/codex/pull/59493
  - https://github.com/langchain-ai/langgraph/pull/9568
  - https://github.com/langchain-ai/langgraph/pull/9574
  - https://github.com/langchain-ai/langgraph/pull/9589
  - https://github.com/langchain-ai/langgraphjs/pull/3208
  - https://github.com/langchain-ai/deepagents/pull/7545
  - https://github.com/langchain-ai/deepagents/pull/7509
  - https://github.com/microsoft/agent-framework/pull/10042
  - https://github.com/microsoft/agent-framework/pull/10035
  - https://github.com/microsoft/agent-framework/pull/9722
  - https://github.com/microsoft/agent-framework/pull/9294
  - https://github.com/anomalyco/opencode/pull/61582
  - https://github.com/anomalyco/opencode/pull/60699
  - https://github.com/google-gemini/gemini-cli/pull/30135
  - https://github.com/anthropics/claude-code/releases/tag/v2.1.318
updated: 2026-11-05
---

# AI Harness · Context/Token Optimization Scout — 2026-11-05

> **기준 시각:** 2026-11-05 06:01 KST(2026-11-04 21:01 UTC). 주 관찰 구간은 2026-11-03 21:01~2026-11-04 21:01 UTC. 실제 merge 시각(merged_at)과 릴리스 게시 시각(published_at)을 확인했으며, GitHub 변경이 default branch에 병합됐다는 사실과 버전 릴리스에 포함됐다는 사실을 구분한다. [전일 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-04.md), [11/03 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-03.md), [11/02 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-02.md) 및 ai/Orchestration.md와 비교했다. 공식 PR·수정 파일·테스트·릴리스 근거를 우선하며 상용 API/Perforce에서의 독립 재현은 수행하지 않았다.

## 0. 핵심 결론과 중복 제거

**오늘은 의미 있는 신규 변경이 있다.** 특히 모델이 실제로 읽었는지 확인하지 않은 Subagent 메시지를 Compaction이 삭제하지 못하게 한 Codex의 sampling checkpoint, LangGraph의 선택적 State 조회, Prompt Cache TTL을 Turn별로 전파하는 Codex 변경, MCP Tool Catalog 갱신의 원자성·권한 정책, 수명주기를 전제로 한 Workflow/Approval 격리에서 새 구현이 확인됐다.

전일의 **MCP Skill public/private 캐시(#9986), JSON Schema 정렬(#8960), OpenCode 복구 조회 최적화(#61421), Codex 엄격한 Tool 공개(#59071), Claude Code v2.1.317**은 재소개하지 않는다. 오늘은 이들 후속의 **실제 새로운 실패 모드와 실행 경계**에만 집중한다. 비슷한 구조를 다룬 PR도 다른 계층의 변화를 구별한다.

| 우선순위 | 새 변화/원본 | 핵심 구조 및 검증 자료 | 적용 판단 |
|---|---|---|---|
| 1 | [Codex #59404](https://github.com/openai/codex/pull/59404) | Compaction 뒤 아직 모델에 전달되지 않은 Agent Mail 유지, history sequence + sampled_through, 최대 10k 토큰 보호 | **바로 적용 원칙 / PoC 최우선** |
| 2 | [LangGraph #9568](https://github.com/langchain-ai/langgraph/pull/9568), [JS #3204](https://github.com/langchain-ai/langgraphjs/pull/3204) | State/History SELECT: 300턴 샘플의 서버 상태 조회 약 295→35ms(업스트림 수치) | **PoC 최우선** |
| 3 | [Agent Framework #10042](https://github.com/microsoft/agent-framework/pull/10042) | MCP Catalog 페이지·항목 상한, 30초 Framework 소유 Client 기본 Timeout, 원자적 Snapshot | **바로 적용 원칙 / PoC** |
| 4 | [Codex #59480](https://github.com/openai/codex/pull/59480) | Turn 단위 Prompt Cache 최소 TTL 30m/12h, Resume·Compaction·WebSocket까지 전파 | **PoC 최우선** |
| 5 | [Claude Code v2.1.318](https://github.com/anthropics/claude-code/releases/tag/v2.1.318) | Fork Effort 분리, Idle Compaction·Resume·Headless 종료·Runner CWD 무결성 보강 | **바로 적용 검증** |
| 6 | [Codex #59278/#59280/#59291](https://github.com/openai/codex/pull/59280) | Skill 목록/파일 읽기 때 현재 Filesystem Grant 재검사, Symlink·원격 Executor 처리 | **바로 적용 원칙** |
| 7 | [Agent Framework #10035/#9722](https://github.com/microsoft/agent-framework/pull/10035) | Workflow AgentSession/승인 Scope 격리, MCP Client를 호출 단위로 소유·정리 | **바로 적용 원칙** |
| 8 | [LangGraph #9574/#9589](https://github.com/langchain-ai/langgraph/pull/9574) | Strict Resume에서 stale Interrupt 거절, 답변 위치별 ID 분리, Replay 충돌 방지 | **PoC 최우선** |
| 9 | [Deep Agents #7545/#7509](https://github.com/langchain-ai/deepagents/pull/7545) | 선택된 Model Window로 Compaction 판정, Child Checkpoint에 Parent Tool Call ID 보존 | **바로 적용 원칙** |
| 10 | [OpenCode #60699](https://github.com/anomalyco/opencode/pull/60699) | Headless CLI가 Child까지 모든 Background Job/Queued Wake가 끝날 때까지 대기 | **바로 적용 원칙 / PoC** |
| 11 | [OpenCode #61582](https://github.com/anomalyco/opencode/pull/61582) | OpenCode Embedder 제공 Fetch를 Model/MCP/OAuth/Skill 호출에 주입하는 Runtime Adapter | **PoC** |
| 12 | [Agent Framework #9294](https://github.com/microsoft/agent-framework/pull/9294) | Memory Consolidation Session/Turn Marker로 동시 처리 누락 방지 | **바로 적용 원칙** |

**측정 구분:** 오늘 새로 확인한 295→35ms는 Thread State 선택 조회 **서버 지연(작업 예시)**이지 LLM Token 절감이 아니다. 30m/12h는 캐시 최소 수명 **설정값**, 10,000토큰은 안전 보존 상한이다. 같은 품질을 유지한 실제 LLM 청구액 절감률은 **신규로 검증되지 않았다**. PR에 실린 테스트는 작성자 측 결과이며 P4 자체 재현이 아니다.

## 1. Codex #59404 — Compaction의 정보 유실을 막는 Sampling Receipt

**신규성/문제:** 전일 #59139는 Idle Child Mailbox 전달이었지만 오늘 [#59404](https://github.com/openai/codex/pull/59404)(2026-11-04 13:03 UTC 병합)는 **모델 요청이 시작된 이후 들어온 메시지**와 Compaction 충돌을 해결한다. 이전 모델 호출이 시작됐을 때 존재하지 않던 Agent 메시지가 History에 추가되면, 후속 요약 과정에서 Context를 교체하며 모델이 읽지도 않은 메시지를 제거할 수 있었다. **Compactor의 Summary 출력은 정상 Model Inference가 메시지를 샘플링했다는 증거가 아니다.**

**확인된 코드:** codex-rs/core/src/context_manager/sampling.rs에 SamplingProgress와 history_sequence, sampled_through_sequence 메타데이터를 추가했고, compact_pending_input.rs의 MAX_RETAINED_AGENT_MESSAGE_TOKENS=10_000을 확인했다. core/src/compact.rs, compact_remote_v2.rs, session 및 Recovery Test까지 연결한다. Normal Inference Request의 입력 접두부(sequence)를 먼저 찍고 해당 응답과 연결하여 ACK한다. Compaction은 아직 ACK되지 않은 Pending Mail을 요약 뒤에 보존하고 이후 사용자 입력과 순서를 유지한다. Overflow 재시도에서도 이미 폐기된 오래된 입력을 잘못 되살리지 않도록 마지막 입력 상태를 이용한다.

**절감·트레이드오프:** 메시지 재전송/누락으로 인한 중복 작업과 재질문 비용을 줄일 가능성이 있지만 **직접 토큰 절감 자료는 없고**, 10k 토큰을 더 보존하므로 한 번의 입력비용은 **증가할 수 있다**. 오래된 Mail을 무조건 보존하지 말고 Task Epoch/CL Revision과 Source Hash를 검사해야 한다.

**Perforce PoC:** Parent가 Build Worker에 검증을 맡긴 뒤 첫 Inference 진행 중 Child가 P4 CL 결과를 보낸 상황에서 강제로 Compaction/Process Kill. old/new 모델 실행 100회에서 Child 결과 유실 0, 중복 Tool 실행 0, 증거 URI 보존 100%, 추론 비용/verified task, 연장 컨텍스트 토큰을 비교. **평가: 바로 적용 원칙 / PoC 최우선.**

## 2. LangGraph #9568/#3204 — State/History의 서버 측 Selective Retrieval

[Python SDK #9568](https://github.com/langchain-ai/langgraph/pull/9568)(11/04 04:30 UTC), [JS SDK #3204](https://github.com/langchain-ai/langgraphjs/pull/3204)(04:43 UTC)에서는 threads.get_state/get_history가 **select** 인자를 전달한다. 예를 들어 values.messages만 요청하면 Server가 불필요한 다른 State Key를 로드하지 않는다. Checkpoint 기반 State Query는 본문에 Select를 넣고, 일반 GET은 Query Parameter를 사용한다. JS의 GET Dedupe Key는 URL 전체이므로 부분 조회와 전체 조회가 잘못 합쳐지지 않는다.

**실측 자료:** PR 작성자는 **300턴 Thread에서 약 295ms→35ms**의 Server State 조회 예시를 제시했다(약 88% 감소). 같은 작업의 LLM Input Tokens/Provider Bill 측정이 아니다. Server 기능은 먼저 구현됐으며 **이번 PR 자체는 SDK의 선택 옵션 노출**이라는 구분이 중요하다. 오래된 Server는 Select를 무시하고 전체 State를 반환할 수 있다.

**활용:** Reviewer에게는 Evidence URI·마지막 Result·Pending Approvals, Build Worker에게는 CL/Build ID, UI에는 진행 상태만. 전체 채팅 History를 항상 로드하지 않고 필요한 Slice만 요청한다. 단, Checkpoint 버전과 RBAC 검증 없는 Select는 정보 격리 해결책이 아니다. PoC 300턴/1000턴, 전체 대비 Selected Bytes, Server p50/p95, Checkpoint 조회 횟수, State Leakage, 작업 완수 비용을 측정. **평가: PoC 최우선.**

## 3. MCP Catalog를 Limit·Timeout·Atomic Snapshot으로 다루기 — Agent Framework #10042

**[Python #10042](https://github.com/microsoft/agent-framework/pull/10042), 11/04 14:32 UTC 병합. BREAKING.** MCP Server는 여러 페이지의 Tool/Prompt Catalog를 제공하며 일부는 매우 느리거나 끝나지 않는다. 이번 패치는 공유 페이지 조회기, Connection Recovery, Tool/Prompt의 **페이지 수와 항목 수 상한**, 재조회 실패 시 **이전 완전한 스냅샷 유지**, Tool Annotation을 Catalog Snapshot과 함께 보관하는 설계로 변경했다. 이전에는 보안 Annotation 조회를 위해 독립된 Tool List를 다시 불러오는 경로가 있었다.

Framework가 직접 생성한 MCP Client에는 **기본 Request Timeout 30초**를 적용한다. 명시적으로 None을 주면 무제한 정책을 선택할 수 있지만 위험을 인지해야 한다. 반면 Caller가 주입한 Client는 Caller의 Timeout/Transport를 유지한다. Count/Pages 제한에 도달하면 어떤 설정을 바꿔야 할지 설명하고 기본 정책을 무력화하지 않는다. Trusted Server에 대한 명시적 Opt-out이 가능하다.

**토큰:** Schema가 자동으로 압축되는 것은 아니다. Catalog 조회 횟수·응답 크기·장애복구 비용과 Prompt에 실제 공개되는 도구 수를 분리 측정해야 한다. 페이지 중간 실패가 모델에게 'Tool 일부만 존재한다'는 잘못된 Context를 제공할 위험을 줄인다는 점이 핵심이다. **P4:** 150개 Tool/대형 Catalog/잘못된 페이지/30초 지연 서버, 10회 Refresh와 연결 재시작을 넣어 Complete Catalog Published 비율 100%, ACL Annotation 일치 100%, 허용되지 않은 Tool 노출 0, max discovery latency, RSS, Provider Token을 측정. **평가: 바로 적용 원칙 / PoC.**

## 4. Prompt Cache TTL을 Turn과 Compaction 끝까지 전파 — Codex #59480

**[Codex #59480](https://github.com/openai/codex/pull/59480), 11/04 19:58 UTC 병합.** TurnStartOptions/RecoverTurnRequest에 PromptCacheTtl 값을 추가하고 **30분(30m) 또는 12시간(12h)의 최소 캐시 수명**을 Responses API 요청의 prompt_cache_options.ttl로 보낸다. 설정이 없으면 필드를 생략한다. codex-rs/core/src/compact.rs, compact_remote_v2_attempt.rs도 Turn Context의 값을 이어받는다. WebSocket Request 재사용 여부 검사에 TTL을 포함하여 서로 다른 설정을 가진 요청을 잘못 재활용하지 않는다.

이것은 [10/30 Scout의 공유 Prefix 정렬](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-30.md)이나 [11/02 OpenCode Cache Warming](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-02.md)과 달리 **개별 Turn의 TTL 계약/복구 일관성**이다. TTL은 Hit를 강제하지 않는다. 모델·Provider·API 계약/단가·공통 Prefix/Tool 순서와 실제 요청 간격에 따라 경제성이 달라진다.

**실험:** P4/UE5 동일 Task Set의 5m/30m/12h 캐시 옵션을 API 지원 여부에 따라 비교하고, 10/60/180분 유휴 후 Resume와 Compaction을 넣는다. Actual cache_read/write/input/output tokens, 캐시 비용 포함 USD/verified-task, latency, 동일 Prompt Hash, Task Success를 저장한다. 12h 설정의 Cache Storage/Write 비용이 증가할 수 있으므로 **TTL이 길수록 경제적이라는 결론은 금지**. **평가: PoC 최우선.**

## 5. CLAUDE.md/Skills 경량화는 단순 축약이 아니라 권한·예산 관찰 — Codex #59445/#59278~#59295

**Budget 발견:** [Codex #59445](https://github.com/openai/codex/pull/59445)(11/04 16:35 UTC)은 프로젝트 지침을 합친 Byte Limit 때문에 파일 일부가 잘리거나 아예 건너뛰어져도 경고가 없던 점을 고쳤다. Truncated/Skipped File 및 Environment를 사용자에게 알리고 project_doc_max_bytes 변경 시 Cached Project Instructions를 새로고침한다. Global/Thread Instruction은 합산 길이에 기여하지만 제한 적용 대상은 Project Files임을 구분한다. 이는 **실제 토큰 절감 기능이 아닌 지침 누락의 관측성**이다.

**권한 발견:** [#59278](https://github.com/openai/codex/pull/59278)(01:13 UTC)은 캐시된 Skill Metadata만으로 읽기를 허가하지 않고 **현재 Filesystem Accessor**를 사용해 파일·디렉터리 Symlink 대체, 접근권 취소, 환경 불일치 시 읽기를 거절한다. [#59280](https://github.com/openai/codex/pull/59280)(01:15 UTC)은 Skill Discovery도 Executor의 현재 권한을 반영하고 허용되었다가 사라진 Skill을 모델에 안내한다. [#59291](https://github.com/openai/codex/pull/59291)(02:00 UTC)은 Direct Executor Discovery에도 Turn-specific Filesystem Grant를 적용하고 Cache Key에 Access Key를 포함한다. Windows Access Denial/Remote Sandbox 관련 회귀를 포함한다. [#59295](https://github.com/openai/codex/pull/59295)(02:29 UTC)은 Skill Read/Installation Listing 성공·실패에 Bounded Outcome Label Metrics를 더한다.

**Trade-off/PoC:** 접근 권한과 Current Workspace가 바뀔 때 재검색하므로 Redis/Filesystem Hit가 줄고 Catalog 조회 비용이 늘 수 있다. 대신 만료된 Grant를 들고 있는 Agent가 민감 Skill을 읽는 문제를 방지한다. CLAUDE.md와 AGENTS.md는 5/50/500KB, 스킬은 150개, P4 Client/Role은 3종, Grant Revocation/Symlink 교체를 100회 재현한다. Trigger별 Loaded Instruction Bytes, Model-visible Skill Count, 토큰, 누락 지시 비율, 권한 우회 0, Path 변경 감지 p95를 측정. **Project Budget 경고/Permission Gate: 바로 적용 원칙. SKILL 경량화 정책: PoC.**

## 6. Context Compaction은 선택 모델 기준으로, 실패는 명확한 에러로 — Deep Agents #7545/#7538

**[Deep Agents #7545](https://github.com/langchain-ai/deepagents/pull/7545), 11/04 20:29 UTC 병합.** dcode는 Startup Model의 Context Window가 아니라 **현재 /model 명령으로 선택된 모델의 Window와 Output Token Allowance**를 기준으로 Compaction 적정성을 계산하게 수정했다. 예를 들어 32K 모델에서 128K 모델로 바꾼 뒤 기존 32K 한계로 판단하면 불필요한 Compaction 또는 Oversized Input 거절이 발생한다. 반대 방향의 Model Switch에서는 압축을 놓치는 것이 더 위험하다. 변경은 libs/code 쪽 Model Switch/Compaction Input Budget 코드 및 테스트를 수정했다.

**[#7538](https://github.com/langchain-ai/deepagents/pull/7538)(14:39 UTC)**은 compact_conversation이 Summary/Offload 중 예외를 냈는데 Tool Message status='success'로 남기던 오류를 status='error'로 수정했다. 사용자에게 실패 설명과 Recovery 경로는 계속 제공한다.

**토큰:** 모델 변경 시 불필요한 압축을 줄일 수 있지만 실제 절감량은 없다. Compaction에 실패했는데 성공으로 표시하면 새 입력이 중요한 원문을 잃었다고 잘못 믿고 진행할 수 있다. P4 Reviewer/Worker를 다른 모델로 라우팅할 때 Model ID + Window + Output Allowance + Compaction Attempt ID + Result Status를 Ledger에 기록한다. 32K↔128K, 짧은/긴 응답, 429/Timeout/실패한 Offload를 Fault Inject. **평가: 바로 적용 원칙.**

## 7. Guardian의 필수 Evidence와 'MCP 소유 환경의 권한' — Codex #59401/#59444/#59489

[Codex #59401](https://github.com/openai/codex/pull/59401)(13:01 UTC)은 Elastic Context Budget이 필수 섹션 최소 예약을 줄이거나 최대치를 넘길 수 있던 오류를 수정한다. Demand-capped Minimum 먼저, Max까지 Headroom 분배, 필수 Record 우선, Global Framing/Protected Context 보존, 선택된 전체 Transcript로만 Instruction Dedup Proof를 인정한다. [#59444](https://github.com/openai/codex/pull/59444)(16:33 UTC)은 동기 Guardian에도 features.guardianv2.sync_elastic_budgeting / sync_elastic_sections를 추가한다. **Fixed Budget이 기본이며 Elastic은 Opt-in**이고 Capture/Resume에서도 동일 정책을 복원한다.

**더 중요한 권한 경계:** [#59489](https://github.com/openai/codex/pull/59489)(20:37 UTC)은 MCP Server가 Turn의 Primary Environment와 다른 환경에 소속될 수 있음을 반영한다. MCP Tool 실행 준비에서 **Tool Owner Environment의 Permission Snapshot**을 캡처하고, 실행 중 Server-initiated Approval에도 사용한다. 사전 Guardian Score는 Owner Permission과 인증 상태가 다르면 재사용하지 않고 Sync Review를 다시 실행한다.

**적용:** P4 Read-only Model Context에서 TeamCity/P4 Submit MCP를 호출할 때 Turn Owner 권한이 아니라 Tool Owner/Invocation 권한으로 판단한다. Required Evidence에는 CL Diff Hash, P4 Protections, Build Receipt와 승인자를 포함. 100개 위험 Tool/권한 교차 테스트에서 bypass=0, required evidence coverage=100%, unauthorized P4 submit=0을 합격 조건으로 삼는다. Optional Evidence를 줄여 Token을 절감하더라도 **결정에 필요한 필수 증거는 절대 삭제하지 않는다**. **평가: 바로 적용 원칙 / Elastic 배분은 PoC.**

## 8. Workflow의 사람별 격리와 MCP Client 소유권 — Agent Framework #10035/#9722

**[Python AG-UI #10035](https://github.com/microsoft/agent-framework/pull/10035), 11/04 16:17 UTC, BREAKING:** AgentExecutor가 보유한 AgentSession에는 History, Pending Approval, Standing Always-approve Rule이 모두 저장된다. 한 Workflow 객체 또는 WorkflowAgent가 여러 Authorization Scope에 재사용되면 **다른 사용자의 대화 내용과 승인 규칙까지 섞이는 취약점**을 가진다. 새 claim_agent_executors는 각 Executor/Session을 최초 Authorization Scope에 묶고, 다른 Scope가 사용하면 **WORKFLOW_SCOPE_CONFLICT**를 Model Call 이전에 반환한다. Nested Workflow, A2UI, WorkflowAgent 및 Agent.as_tool()로 숨겨진 구조까지 검사한다. WorkflowAgent.as_tool()은 지원되지 않아 명시적으로 거부한다. 사용자/대화별 Workflow Factory 생성이 권장되며 **94 AG-UI Tests**가 PR 작성자에게 보고됐다.

**[.NET #9722](https://github.com/microsoft/agent-framework/pull/9722), 16:26 UTC, BREAKING:** MCP Client의 Session과 Transport를 **호출별** 생성·폐기하고 공용 HTTP Handler Infrastructure만 Application 소유 IHttpClientFactory로 재사용한다. 장기 MCP Session의 암묵적 재활용/권한 오염 위험은 줄지만, 네트워크 Handshake·설정 비용은 늘어날 수 있다. ProtocolVersion 고정은 Known Legacy 버전의 Discovery Probe 생략에만 적용되며 Session 재사용은 아니다. 작성자에 따르면 net10.0/net472 단위 테스트 각각 58건 통과. 기존 Constructor/API가 깨지므로 Upgrade 시 Migration 필수.

**P4 적용:** 조직·프로젝트·사용자·Depot/Client/Task 각각의 Auth Scope와 Workflow Executor 인스턴스를 묶고, MCP P4 Connection은 Invocation 단위로 Open/Dispose한다. 공유 HTTP Handler의 Origin-bound Credentials, Sandbox Admission, Cancellation을 별도 설계한다. 스코프 교차 Memory Leak/승인 누출 0, 평균 Handshake/Provider Bill 증가를 별도로 측정. **평가: 바로 적용 원칙.**

## 9. Human Approval/Tool Resume에서 Stale Answer는 즉시 거부 — LangGraph #9574/#9589

**[LangGraph Python #9574](https://github.com/langchain-ai/langgraph/pull/9574)(20:01 UTC)**는 Command(resume=...)가 이미 해결되거나 삭제된 Interrupt ID를 참조해도 조용히 무시한 뒤 그래프를 다시 실행하던 문제를 다룬다. Private Config인 __pregel_strict_resume를 켜면 Root Graph가 Pending 아닌 ID, Empty Map, 여러 Pending 상황에서 Ambiguous Single Value를 **상태 변경 전에 UnknownInterruptError**로 거부한다. reason에는 not_pending/empty_map/ambiguous와 ID 집합을 담는다. Strict Mode는 **Opt-in**이며 Nested Graph/과거 Checkpoint에는 조건부 예외가 있다. 테스트 계획에 **44개 케이스 및 NO_DOCKER 전체 2,875 Passed**가 포함된다.

**[#9589](https://github.com/langchain-ai/langgraph/pull/9589)(20:53 UTC)**는 같은 Task 내 여러 interrupt()가 동일 Namespace Hash ID를 쓰던 문제를 **답변 Slot Count를 포함한 ID**로 고쳤다. 오래된 첫 ID 호환과 Parallel Interrupt 순서, Retry 후 Answer 재사용까지 다룬다. 작성자의 NO_DOCKER Full Suite **2,886 Passed**, prebuilt **256 Passed**. JS도 [#3211](https://github.com/langchain-ai/langgraphjs/pull/3211)/[#3221](https://github.com/langchain-ai/langgraphjs/pull/3221) 및 [Dev Server #3212](https://github.com/langchain-ai/langgraphjs/pull/3212)가 같은 날 병합됐다.

**토큰/품질:** Silent Re-run과 잘못된 사용자 답변 적용을 방지할 수 있지만 Token 절감 실측은 없다. 엄격한 모드는 이미 전달된 승인 응답을 재전송하는 Client에게 명시적 에러를 돌려줘야 한다. **P4 Submit Approval:** 승인 ID=hash(task, CL Revision, Approval Step, Prompt Slot), Already Handled/Expired/Changed Diff에 Reject+Reconcile. 사람이 승인을 연속해서 두 번 주는 테스트, Rebase 뒤 승인, Multi Worker 동시 승인, Restart를 포함한다. **평가: PoC 최우선.**

## 10. Retry 경계, Session Handoff, 중복 실행 차단 — LangGraphJS/OpenCode/Codex

**[LangGraphJS #3208](https://github.com/langchain-ai/langgraphjs/pull/3208)(11/04 19:39 UTC, BREAKING):** AsyncCaller가 네트워크/5xx/429에 모든 HTTP Method를 자동 Retry하면 서버에 이미 도달한 POST/PATCH가 한 번 더 실행될 수 있었다. 변경 후 POST/PATCH는 **서버에 요청을 보내기 전에 실패한 경우에만 Retry**한다. GET/HEAD/OPTIONS/PUT/DELETE는 기존 정책 유지. 이 기본 정책은 각 API의 실제 Idempotency 계약과는 별개이므로 DELETE/PATCH의 안전성을 무조건 보장하지 않는다. P4 Submit/CI Start/PR Merge는 **확인 불가능한 전송 실패 뒤 원격 상태 확인**을 우선한다.

**[LangGraphJS #3191](https://github.com/langchain-ai/langgraphjs/pull/3191)(18:49 UTC)**은 UI에서 Thread를 바꾸는 중 이전 Thread의 Pending Headless Tool Call이 새로운 Thread에서 재실행되는 Race를 막는다. Old Hook의 Render Thread Identity를 기억하고 변경 뒤에는 실행하지 않는다.

**[OpenCode #60699](https://github.com/anomalyco/opencode/pull/60699)(07:20 UTC)**는 opencode run Headless가 메인 모델 Reply 종료만 보고 나가서 Child/Grandchild가 예약한 Background Shell의 결과를 못 받던 문제를 고친다. Experimental Job API로 전체 Session Tree를 반복 검사하고, Job이 완료됐어도 Wake가 Pending이면 계속 대기한다. CLI 작성자 테스트 15 Passed, 10회 반복 150 Passed. 반면 무한한 Background Server가 있으면 Headless가 끝나지 않는 문제가 **Out of Scope**로 남아 있다.

**[OpenCode #61679](https://github.com/anomalyco/opencode/pull/61679)(17:36 UTC)**은 WebSocket Event 유실로 Outbox에 영원히 Pending이 남는 경우 Transcript Sync에서 같은 Message ID의 Delivered 입력을 보고 Pending을 제거한다. 전달 완료의 **Server 증거**를 사용하는 Reconcile이지 무작정 재전송이 아니다. 작성자 Client Tests 259 Passed.

**[Codex #59493](https://github.com/openai/codex/pull/59493)(20:52 UTC)**은 인증된 Codex Cloud Client를 AppServerClient에 연결하는 Native Cloud Adapter를 추가한다. 대화 ID와 Saved Settings로 Resume, Attachment/Turn Status 추적, Disconnect/Failed Reattachment 처리. 이전 Attachment 교체 실패 시 유지하고 활성 Attachment 없는 Turn은 거절한다. Cloud 쪽 API 지원 범위가 아직 제한돼 있어 기존 Local Runtime Adapter와 기능 동등성을 가정하면 안 된다.

**Perforce 정책:** EXECUTING→REMOTE_UNKNOWN→RECONCILING→CONFIRMED/FAILED, POST Side-effect는 Idempotency Key와 Receipt로 재확인. Background Job Completion/Delivery 완료 여부와 Foreground Agent Reply를 별도로 관리. **평가: 재실행 방지와 Reconcile은 바로 적용, Cloud Adapter는 PoC.**

## 11. Memory Consolidation은 Snapshot에 포함됐던 Turn만 Retirement — Agent Framework #9294

[Python #9294](https://github.com/microsoft/agent-framework/pull/9294)(11/04 09:36 UTC)는 MemoryContextProvider의 세션 메모리 추출·Consolidation이 동시에 일어날 때 Pending Session이 잘못 사라지는 경쟁 조건을 수정한다. 과거에는 A Consolidation이 Topic Snapshot을 가져온 뒤 B가 새로 등록돼도, A가 끝나면서 Pending List 전체를 지우는 문제가 있었다. 또 메모리 추출이 아직 완료되지 않았는데 Pending을 먼저 등록하면 '처리했다'고 잘못 판단할 수 있었다.

**구현:** pending_turn_ids: Session ID → Turn UUID Marker. 메모리 추출/Index Rebuild 완료 후에 Register하고 Finally에서 성공/실패를 반영. Consolidation 시작 때 (Session ID, Marker) Snapshot을 잡고 완료 때 **Marker가 변하지 않은 항목만 제거**한다. 이전 State Shape는 Normalize로 보정해 Legacy Session을 잃지 않는다.

이 변화는 RAG 검색 품질 점수나 Token 절감률을 직접 개선했다는 뜻이 아니다. **Memory/Context의 데이터 신선도·선택 범위 정확성**에 영향이 있다. Perforce Task State에서 Evidence/Memory Update와 Consolidation이 겹쳐도 미처리 Revision을 '처리함'으로 오인하지 않도록 Cursor + Turn Marker + Snapshot Retirement를 사용한다. **평가: 바로 적용 원칙.**

## 12. Runtime Adapter / MCP / Tool Integrity 추가 발견

1. **[OpenCode #61582](https://github.com/anomalyco/opencode/pull/61582)(11/04 10:13 UTC):** Cloudflare Worker 등 Embedder가 제공한 Fetch를 OpenCode.create/Workerd에 주입. MCP HTTP+OAuth+Reconnection, AI SDK Model Request, Skill Download, Console Config, Web Fetch/Search 등에서 같은 Network Policy를 경유. 단, **Code Mode 안의 사용자 Agent 코드, 일부 Provider 로그인/탐색 Helper는 아직 전역 Fetch**를 이용하므로 완전한 Egress 차단이라고 말하면 안 된다. P4 Enterprise Proxy/Telemetry/SSRF Sandbox/Allowed Host를 경유시키는 PoC 가치가 있지만 실제 Token 절감 효과는 없다. 테스트에서 실제 MCP initialize/tools/list/tools/call이 주입 Fetch를 거치는 것 확인.
2. **[Agent Framework #10101](https://github.com/microsoft/agent-framework/pull/10101)(19:06 UTC):** MCP Skills의 skills/list와 skills/get의 광고 Frontmatter를 **전체 JSON**으로 보존한 후 SKILL.md YAML을 파싱해 중첩 객체·배열·숫자를 포함한 모든 Field를 비교한다. License/Custom Metadata를 AgentSkillFrontmatter에 공개. 단순 name/description만 맞아도 무조건 신뢰하는 오류를 막는 후속 변경. **PoC/바로 적용 원칙.**
3. **[Agent Framework #10036](https://github.com/microsoft/agent-framework/pull/10036)(08:43 UTC):** AgentMCPTool이 공개한 JSON Schema와 동일한 Constraint로 Runtime 인자를 검증한다. required/enum/숫자 범위/nested/extra property 위반은 Agent나 Session Store 접근 전에 INVALID_PARAMS로 반환. 업스트림 단위 테스트 329 Passed. **바로 적용 원칙**, Tool Schema 정렬/압축과 런타임 안전성 검증은 독립 과제다.
4. **[OpenCode #61537](https://github.com/anomalyco/opencode/pull/61537)(16:01 UTC):** Plugin Tool 등록 시 입력 Schema가 null이면 {}로 정규화, true/false/string처럼 유효하지 않은 Schema면 등록 거절. 늦은 첫 Tool Call 때 JSON Codec WeakMap 오류가 Turn 전체를 종료하지 않도록 조치. 업스트림 Core Tests 634 Passed. **바로 적용 원칙.**
5. **[Deep Agents #7509](https://github.com/langchain-ai/deepagents/pull/7509)(17:52 UTC):** Child Checkpoint metadata의 lc_subagent_tool_call_id에 부모 task Tool Call ID를 넣는다. 이전 tools:task_id Namespace만으로는 UI·Trace가 Parent/Child 관계를 추론해야 했다. Sync/Async, Parallel Task Test를 포함. Child 실행 자체의 Current Tool ID와 혼동하지 말 것. **바로 적용 원칙.**
6. **[Deep Agents #7539](https://github.com/langchain-ai/deepagents/pull/7539)(15:15 UTC):** ripgrep 없는 환경에서 FilesystemBackend.grep의 Python Fallback이 특정 File 요청에도 Sibling/Descendant File을 반환하던 오류를 수정. 파일 단위 Retrieval Scope를 보존. **바로 적용 원칙.**

## 13. 계측과 새로운 정량 결과: Gemini CLI와 Codex Skill Usage

**[Gemini CLI #30135](https://github.com/google-gemini/gemini-cli/pull/30135), 11/04 20:17 UTC:** /stats heatmap [today|yesterday|YYYY-MM-DD] (별칭 /usage heatmap)으로 28주=196일 Token Usage를 확인하는 기능이 병합됐다. packages/core/src/services/usageAggregator.ts는 프로젝트 chats 및 Subagent Subdirectory의 JSONL을 **Stream 처리**, Message ID 중복 Snapshot은 Deduplicate, Prompt 본문은 즉시 버린다. Local Calendar Date와 Daylight Saving 경계를 처리하고 일자별 Input/Output/Cached Token, Session/Turn/Model 분포를 계산한다. 데이터 외부 업로드 없이 Local Metadata로 비용 추적의 출발점을 제공한다. 하지만 이것은 **토큰 사용량 UI이며 Provider 청구액/Retry 누락이 없다는 증거가 아니다**.

Codex [#59295](https://github.com/openai/codex/pull/59295)는 Skill Read/Install List 결과와 Model ID를 결합한 Telemetry를 제공한다. P4 Harness는 Tool/Skill Adoption을 model/role/task_phase별로 나누고, Token Count뿐 아니라 잘못된 Discovery 때문에 실패한 작업을 함께 측정해야 한다.

| 오늘의 수치 | 출처 | 무엇을 의미하며 무엇은 아닌가 |
|---|---|---|
| 약 295→35ms | LangGraph #9568, 300-Turn Thread 예시 | 서버 State Select 조회 약 88% 지연 감소; LLM Token Saving **아님** |
| 30m / 12h | Codex #59480 | 제공하는 최소 Cache TTL 옵션; Hit Rate/비용 절감 수치 **아님** |
| 최대 10,000 Tokens | Codex #59404 | 아직 모델이 읽지 않은 Mail의 보존 예산; 절감량 **아님** |
| 30초 | Agent Framework #10042 | Framework-owned MCP Client 기본 Timeout; 평균 지연 수치 **아님** |
| 32K→128K 예시 | Deep Agents #7545 | Model Window Switch에 대한 기능 테스트 시나리오; 실제 Context 압축률 **아님** |
| 44 Test Cases, 2,886 Full Pass | LangGraph #9574/#9589 | Strict Resume 구현에 대한 작성자 측 테스트; 비용 절감 **아님** |
| 196일 | Gemini CLI #30135 | 로컬 Token Usage 집계 관찰 기간; Provider Billing Audit **아님** |

**오늘 새로 독립 검증된 Token/USD Savings Benchmark는 없음.** 비용 지표는 input/output/reasoning/cache_write/cache_read/billed_usd + failed task retry cost를 모두 포함하고, 품질 지표는 verified task success + evidence completeness + security violations를 함께 관찰해야 한다.

## 14. Perforce·TeamCity·Claude Code·Codex Harness 적용 설계(제안 아키텍처)

아래 흐름은 여러 프로젝트에서 확인된 개별 패턴을 조합한 **제안 아키텍처**이며 특정 프로젝트가 이 구조 전체를 제공한다고 주장하지 않는다.

~~~mermaid
flowchart TD
  A["P4 Task + CL/Base Revision"] --> L["Durable Task Ledger / Auth Scope / Run Epoch"]
  L --> R["Model Runtime Adapter / Claude Code · Codex"]
  R --> S["Selective Context: State Select + Skill/Tool Catalog"]
  S --> P["Immutable Shared Prefix + Turn-specific Delta"]
  P --> M["Model / Worker / Reviewer"]
  M --> T["MCP Tool via Owner Permission + Invocation Gate"]
  T --> E["Evidence Store: Raw Log + Diff Hash + Build Receipt"]
  E --> G["Guardian: Required Evidence + Approval"]
  G --> C{"Side effect authorized?"}
  C -->|no| H["Deny / Handoff Receipt"]
  C -->|yes| W["P4/TeamCity Execute with Idempotency Key"]
  W --> V["Remote Reconcile + Evidence Verification"]
  V --> L
  M --> Q["Sampling Checkpoint + Pending Mail + Compaction"]
  Q --> L
  L --> D["Delivery Receipt / Cost Accounting / Task Close"]
~~~

### 실험 A — Context Fidelity와 Selective State

같은 50개 P4 작업(탐색 20/수정 15/Review 10/CI 실패 원인 5)을 각 3회 반복. A는 Full State + 150 Tool Schema + Full Log, B는 Selective State + 이름 Catalog + 필요시 Skill/Tool Read, C는 B에 Protected Pending Mail 및 Evidence URI를 추가한다. 비교: Model Input/Output/Cache Tokens, State Payload, State Server p95, Tool Recall@1, 오류 재현율, Missing Evidence=0, verified-task USD. 기준안: 성공률 저하 2%p 이하, Evidence 누락 0, Unauthorized Action 0. 이 기준은 **제안 목표값**, 업스트림 공식 성능 수치가 아니다.

### 실험 B — Cache TTL과 Context/Compaction

Shared Prefix의 순서를 고정하고 Variable P4CLIENT/Depot/CL/Build ID는 Delta로 분리. 30m/12h Cache TTL과 5m 기본 비교를 모델/Provider 지원에 따라 무작위 교차. 32K/128K Window와 Resume/Compaction을 중간에 배치. Cache Read·Write Token, 실패 재실행비용, Output Quality, History Sequence, Pending Child Notice의 모델 확인 여부를 기록한다. TTL은 Task별로 선택하고 무조건 Warm Up하지 않는다.

### 실험 C — Durable Lifecycle / Permissions / Retry

아래 Fault Injection을 실제 P4 Submit 대신 Mock Endpoint로 먼저 시행한다. (1) Agent 응답 전후 Child Mail 도착, (2) Compaction 중 Process Kill, (3) MCP Access Revocation/Symlink 교체, (4) POST 서버 Commit 후 Client Timeout, (5) Approval 중 CL 수정, (6) Workload User Scope 변경, (7) Headless Background Job Wake, (8) Runner 재시작 중 CWD 변경, (9) SSE Event Drop/Outbox Reconcile, (10) Memory Consolidation과 신규 Session 등록 동시 발생. **100회 실행당** Duplicate Side Effect 0, Unauthorized Access 0, Orphan Job 0, Original Evidence Loss 0, Handoff Wrong CL 0, Task Close 전에 Delivery Receipt 확인을 검증한다.

### 적용 우선순위

- **바로 적용:** P4 Tool 실행 전 Owner Scope/ACL/Approval, Submit Remote Reconcile, Missing Instructions Warning, Compaction Error Status, Run/Child/Tool Call ID Receipt, Cost/Evidence Ledger, Background Job 포함 최종 완료 판단.
- **PoC 최우선:** State Selective Retrieval, Pending Mail 보호, Cache TTL의 실제 과금효과, Strict Interrupt Resume, Model Window/Compaction 정책, Runtime별 Cloud/Local Adapter.
- **아이디어 참고:** MCP Catalog 페이지 예산과 Skill/Tool Output 경량화를 하나의 동적 Registry로 구현하되, 원본 자료·검증증거를 외부 Evidence Store로 보존하는 아키텍처.
- **현재 도입 가치 낮음:** 실측 없이 Cache TTL을 무조건 12h로 지정, 승인/권한 불변식을 Model-only Reconsideration으로 대체, 코드/Tool Output 원본을 영구 삭제해 Context만 줄이는 정책.

## 15. 운영 리스크 및 보고서의 경계

1. **릴리스 vs main:** Claude Code v2.1.318은 **2026-11-04 00:01 UTC에 실제 배포**되었다. 이와 달리 위 Codex·Deep Agents·LangGraph·Agent Framework·OpenCode PR들은 병합 시각을 확인했지만, 그것만으로 특정 안정 버전에 포함됐다고 주장하지 않는다. Codex 0.168.0-alpha.2(11/04 20:47 UTC)는 **Pre-release**이며 PR 번호만으로 기능 포함을 확정하지 않았다. OpenCode 공식 Latest Release 목록에서 조회된 것은 **v2.2.5(10/30 23:17 UTC)**다.
2. **Windows/Enterprise:** Codex Skill Access Tests에는 Windows, Remote Executor 관련 사례가 포함된다. Claude Code 2.1.318은 Network Home Directory Config/Lock/Backup, Self-hosted Runner CWD, MCP 초기 Probe 및 Resume 신뢰성 수정이 확인됐다. Perforce/TFS/P4 Protects에 대한 실제 Enterprise 보증은 별도 P4 Test가 필요하다.
3. **Tool Output 축약:** 이번 구간에서 Host-side Output Truncation의 새로운 실측 Token Savings는 확인되지 않았다. 앞선 Codex Host Truncation을 재소개하지 않고, 모델이 아직 못 읽은 Child Mail과 Raw Evidence의 **유실 방지**를 기록했다.
4. **RAG/Progressive Disclosure:** 별도의 새 검색 적중률/비용 벤치마크는 확인되지 않았다. 오늘 확인된 것은 State Select API의 조회 지연, MCP Catalog Atomic Refresh, Skill 권한별 목록 변경, Grep File Scope 및 Memory Consolidation 정확성이다.
5. **모델 라우팅:** Claude Fork Effort low와 Deep Agents Model Switch는 **실제 제어/적용 버그 수정**이다. 저비용 모델 적용의 품질·가격 이익은 독립 검증 전까지 주장하지 않는다.
6. **근거 수준:** GitHub PR Body/Changed Files/Source/Regression Tests 및 공식 Release Notes를 조회했고, Compiler/CI/Perforce Benchmark를 실행하지 않았다. 작성자 숫자는 '업스트림 측정'으로만 취급한다.

## 16. 원본 및 추가 조사 경로

- Codex Compaction/Runtime: [#59404](https://github.com/openai/codex/pull/59404), [#59480](https://github.com/openai/codex/pull/59480), [#59445](https://github.com/openai/codex/pull/59445), [#59280](https://github.com/openai/codex/pull/59280), [#59401](https://github.com/openai/codex/pull/59401), [#59489](https://github.com/openai/codex/pull/59489), [#59493](https://github.com/openai/codex/pull/59493).
- LangGraph Python/JS: [#9568](https://github.com/langchain-ai/langgraph/pull/9568), [#9574](https://github.com/langchain-ai/langgraph/pull/9574), [#9589](https://github.com/langchain-ai/langgraph/pull/9589), [JS #3204](https://github.com/langchain-ai/langgraphjs/pull/3204), [JS #3208](https://github.com/langchain-ai/langgraphjs/pull/3208), [JS #3191](https://github.com/langchain-ai/langgraphjs/pull/3191).
- Microsoft Agent Framework: [#10042](https://github.com/microsoft/agent-framework/pull/10042), [#10035](https://github.com/microsoft/agent-framework/pull/10035), [#9722](https://github.com/microsoft/agent-framework/pull/9722), [#9294](https://github.com/microsoft/agent-framework/pull/9294), [#10101](https://github.com/microsoft/agent-framework/pull/10101), [#10036](https://github.com/microsoft/agent-framework/pull/10036).
- Deep Agents: [#7545](https://github.com/langchain-ai/deepagents/pull/7545), [#7538](https://github.com/langchain-ai/deepagents/pull/7538), [#7509](https://github.com/langchain-ai/deepagents/pull/7509), [#7539](https://github.com/langchain-ai/deepagents/pull/7539).
- OpenCode: [#61582](https://github.com/anomalyco/opencode/pull/61582), [#60699](https://github.com/anomalyco/opencode/pull/60699), [#61679](https://github.com/anomalyco/opencode/pull/61679), [#61537](https://github.com/anomalyco/opencode/pull/61537).
- 공식 릴리스·계측: [Claude Code v2.1.318](https://github.com/anthropics/claude-code/releases/tag/v2.1.318), [Gemini CLI #30135](https://github.com/google-gemini/gemini-cli/pull/30135), [Codex Release List](https://github.com/openai/codex/releases), [OpenCode Release List](https://github.com/anomalyco/opencode/releases).

**최종 판단:** 검증된 비용 절감 데이터는 여전히 없지만, **Context를 실제로 소비했음을 증명하는 Sampling Receipt**, **필요한 State만 가져오는 Select**, **권한에 종속된 Skill/MCP Catalog**, **승인/Side-effect의 Durable Lifecycle**은 Perforce Harness의 정확성과 장기 운영 효율에 즉시 유용하다. 다음 재현 순서는 **(1) State Select + Pending Message → (2) Cache TTL과 Model Window → (3) P4 Approval/Remote Reconcile → (4) Workspace별 Skill Access/Cost Receipt**다.
