---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-07"
category: trend
tags: [ai-harness, coding-agent, orchestration, context-engineering, token-optimization, mcp, skills, hooks, progressive-disclosure, selective-context, rag, tool-output, compaction, cache, session-handoff, subagents, model-routing, durable-state, runtime-adapter, evidence-verification, task-lifecycle, token-accounting, perforce, claude-code, codex]
source:
  - https://github.com/openai/codex/pull/59973
  - https://github.com/openai/codex/pull/59832
  - https://github.com/openai/codex/pull/59794
  - https://github.com/openai/codex/pull/59902
  - https://github.com/openai/codex/pull/59891
  - https://github.com/openai/codex/pull/59817
  - https://github.com/openai/codex/pull/59910
  - https://github.com/openai/codex/pull/59914
  - https://github.com/openai/codex/pull/59958
  - https://github.com/openai/codex/pull/59969
  - https://github.com/openai/codex/pull/59783
  - https://github.com/openai/codex/releases/tag/rust-v0.167.0
  - https://github.com/google-gemini/gemini-cli/pull/30180
  - https://github.com/google-gemini/gemini-cli/pull/30165
  - https://github.com/google-gemini/gemini-cli/pull/30186
  - https://github.com/google-gemini/gemini-cli/pull/30187
  - https://github.com/microsoft/agent-framework/pull/10148
  - https://github.com/microsoft/agent-framework/pull/10147
  - https://github.com/microsoft/agent-framework/pull/10088
  - https://github.com/microsoft/agent-framework/pull/8662
  - https://github.com/microsoft/agent-framework/pull/10149
  - https://github.com/microsoft/agent-framework/pull/9547
  - https://github.com/strands-agents/harness-sdk/pull/5875
  - https://github.com/strands-agents/harness-sdk/pull/5821
  - https://github.com/strands-agents/harness-sdk/pull/5840
  - https://github.com/strands-agents/harness-sdk/pull/5569
  - https://github.com/langchain-ai/langgraph/pull/9614
  - https://github.com/langchain-ai/langgraph/pull/9615
  - https://github.com/anthropics/claude-code/releases/tag/v2.1.319
updated: 2026-11-07
---

# AI Harness · Context/Token Optimization Scout — 2026-11-07

> **조사 시점:** 2026-11-07 약 05:59 KST(2026-11-06 약 20:59 UTC). 관찰 구간 2026-11-05 21:00~11-06 20:59 UTC. 공식 GitHub PR merged_at, 릴리스 published_at, 수정 파일과 일부 patch·회귀 테스트를 확인했다. develop의 11/06·11/05 Scout 및 Orchestration 정책, 게시 Skill을 먼저 읽고 중복을 제거했다. 아래 벤치마크는 작성자 측 자료이고 Perforce/유료 API에서 독립 재현하지 않았다.

## 0. 핵심 결론과 신규성

**오늘 유의미한 신규 구현과 상태 변화가 확인되었다.** Codex Code Mode의 gRPC 및 Host-side Output Truncation 기본 ON 전환, Strands의 실제 cache-read 계측을 동반한 Harness Cache 연결, Gemini CLI의 멀티파트/멀티모달 Tool Output 누적 예산, 일반 Responses의 증분 Tool 선언, Strands 문서 MCP의 BM25 검색과 비용 계측, MCP Skill 동적 파일 접근, Reviewer Evidence의 원자적 보존, Session Retry/Approval 권한 정합성 개선이 핵심이다.

**전일과 구별:** 11/06의 Codex #59601은 과거 성공 Command Output을 UI 목록에서 필요 시 조회하는 경로이고, 오늘 #59973은 Host가 Model Context로 보내기 전에 출력량을 줄이는 경로다. 11/05의 Turn별 Cache TTL(#59480)은 정책·설정이고 오늘 Strands #5821은 Harness가 실제 cache config와 stable prefix를 구성한다. 11/06의 Guardian Original Evidence 수집(#59669~71)과 오늘 Verified Q/A를 budget 내에서 완전한 단위로 선정하는 #59902/#59891은 서로 다른 계층이다. Deep Agents #7567 및 0.7.34의 cutoff-message-id는 이미 전일 분석한 변경이므로 재수록하지 않는다.

| 우선순위 | 새 변경(11/06 UTC) | 관측/구현 | 평가 |
|---|---|---|---|
| 1 | [Codex #59973](https://github.com/openai/codex/pull/59973) | gRPC와 host output truncation stable/default ON(20:29 병합) | **바로 적용 검증** |
| 2 | [Strands #5821](https://github.com/strands-agents/harness-sdk/pull/5821) | Harness CacheConfig·per-session key; cached input 96~98% 작성자 실험(15:01) | **PoC 최우선** |
| 3 | [Gemini CLI #30180](https://github.com/google-gemini/gemini-cli/pull/30180) | 전체 Part 64KiB/History 256KiB/최근 3턴 보호(19:47) | **바로 적용 원칙** |
| 4 | [Codex #59832](https://github.com/openai/codex/pull/59832) | Regular Responses Tool Declarations 증분화, flag 기본 OFF(06:08) | **PoC 최우선** |
| 5 | [Strands #5875](https://github.com/strands-agents/harness-sdk/pull/5875) | Weighted BM25, 1,144 pages/300 queries: mean 102→1ms(17:25) | **PoC 최우선** |
| 6 | [Agent Framework #10148](https://github.com/microsoft/agent-framework/pull/10148) | Dynamic Skill Resources lazy read(19:52) | **PoC** |
| 7 | [Strands #5840/#5569](https://github.com/strands-agents/harness-sdk/pull/5840) | Signed server-side summary 및 durable context injection | **PoC** |
| 8 | [Codex #59902/#59891](https://github.com/openai/codex/pull/59902) | Verified Evidence 원자성, REPL Header 비용 10k 응답 회귀 | **바로 적용 원칙** |
| 9 | [Agent Framework #10088](https://github.com/microsoft/agent-framework/pull/10088) | Streaming usage delta 합산 누락 수정 | **바로 적용** |
| 10 | [Agent Framework #8662/#10147](https://github.com/microsoft/agent-framework/pull/8662) | Invocation-owned MCP Session / 동일 ID 병렬 호출 | **보안 원칙 적용/PoC** |
| 11 | [Gemini #30165/#30186/#30187](https://github.com/google-gemini/gemini-cli/pull/30165) | Retry 잔여 Tool 폐기, Resume 복원, quota 실패 상한(20:52) | **바로 적용 원칙** |
| 12 | [Claude Code 2.1.319](https://github.com/anthropics/claude-code/releases/tag/v2.1.319) | MCP Background Task, 권한·Context·Gateway 수정(17:04 릴리스) | **바로 적용 검증** |
| 13 | [Codex #59794/#59817](https://github.com/openai/codex/pull/59794) | Budget Preflight, Message Delivery Receipt | **바로 적용 원칙** |
| 14 | [LangGraph #9614/#9615](https://github.com/langchain-ai/langgraph/pull/9614) | Subgraph 조회 fallback의 결함과 namespace 정렬 | **제한적 PoC** |

**정량 해석:** 96~98%는 두 번째 호출 이후 cached input tokens가 전체 input tokens에서 차지하는 비율이지 최종 청구금액 절감률이 아니다. Strands의 102→1ms는 검색 CPU Latency다. 64KiB·256KiB는 메모리 상한/트리거다. Agent Framework의 usage 600/60은 회계 정확도 회복이지 절약이 아니다. **동일 품질 작업당 실제 Provider Bill/verified-task 절감률에 대한 오늘의 독립 재현 결과는 없음.**

## 1. Codex #59973 — Host Output Truncation이 기본 ON으로 전환

**근거:** [PR #59973](https://github.com/openai/codex/pull/59973)(11/06 20:29 UTC 병합). 확인 코드: codex-rs/features/src/lib.rs, core/tests/suite/code_mode.rs 및 scenarios.rs. 두 FeatureSpec인 code_mode_host_grpc와 code_mode_host_output_truncation이 Stage::UnderDevelopment/default_enabled=false에서 **Stage::Stable/default_enabled=true**가 되었다. 관련 통합 테스트는 default/explicit opt-out, output budget, truncation notice, wait/terminate 경로를 검사한다.

**문제와 동작:** 10/30에 분석한 #57870/#58125/#58159의 Host-side truncation을 **실험 플래그가 아닌 기본 실행 경로**로 만든 변경이다. Code Mode는 gRPC-over-stdio를 사용하며 Host가 execute/wait/terminate 출력에 길이 상한을 적용한 뒤 Core로 전달한다. Head/tail 및 생략 표시만 모델이 보고, 원본 로그를 따로 보관하는 것은 Harness 책임이다.

**효과와 트레이드오프:** 모델 입력으로 유입되는 불필요한 Build Log와 원격 전송량을 줄일 수 있다. 반면 Error Span이 잘리면 실패 진단 정확도가 하락한다. 중복 Client+Host Truncation이 생기지 않도록 negotiate해야 한다. 신규 실제 토큰/USD 벤치마크는 없다. Codex 0.167.0은 같은 날 01:40 UTC 공식 게시되어 20:29 UTC 병합된 이 PR을 **0.167.0 포함이라고 간주하지 않는다**.

**P4 적용:** TeamCity 10KB/1MB/100MB Log에서 원본 SHA256/URI를 별도 Artifact Store에 두고, 전처리 한도 1k/4k/8k tokens와 오류 정규식 span 추출을 비교한다. 컴파일 실패 판정 정확도, bytes on wire, actual provider input/cached tokens, verified task당 비용을 측정한다. **판정: 바로 적용 검증.**

## 2. Codex #59832 — 전체 Tool Schema 반복 대신 Incremental Declarations

**근거:** [PR #59832](https://github.com/openai/codex/pull/59832)(11/06 06:08 UTC 병합). 확인한 소스/테스트: codex-rs/core/src/session/world_state.rs, session/turn.rs, compact_remote_v2_attempt.rs, codex-rs/features/src/lib.rs, scenarios_incremental_tools.rs, snapshots.

**신규성/내부 동작:** 기존에는 Responses Lite에만 증분 Tool Declaration을 쓸 수 있었다. Regular OpenAI Responses에도 incremental_tools_legacy 실험 플래그를 별도로 추가했으며 **기본 OFF**이다. 첫 Window에서 Tool Definitions를 제공한 뒤 Tool/MCP 변경을 History Developer 공지로 추가하면서 Stable Prefix를 유지한다. Model Switch, MCP Tool 제거/재등장, Compaction 뒤 새 Window를 여는 경우에 대한 Snapshot을 추가했다. Hosted web_search는 History Tool Declaration이 아닌 최상위 tools에 남긴다.

**절감 원리:** 매 Turn Catalog 재전송과 Prefix Cache 무효화를 억제할 수 있다. 그러나 삭제된 Tool을 오래된 History 선언으로 호출하거나 Provider가 Declaration Update를 다르게 해석할 위험이 있다. 이전 OpenCode의 Tool 배열 정렬, Agent Framework의 Tool JSON Schema 재귀 정렬과는 **표현 안정성 vs 변경 내용의 증분 게시**라는 차이가 있다.

**P4 PoC:** 150 Tools(조회 50, Edit 30, CI 40, Admin 30)에서 A=Full Schema/B=Stable Sorted/C=Incremental을 50 작업×3회로 비교. 변경된 Tool 허용/거부 ACL, Tool Recall@1, cached tokens, 실제 Bill, Compaction/Resume 이후 Correct Tool Selection을 검증. **판정: PoC 최우선.**

## 3. Strands #5821 — Stable Prefix Cache의 실제 Cache Read 관측

**근거:** [PR #5821](https://github.com/strands-agents/harness-sdk/pull/5821)(11/06 15:01 UTC). harness-py/src/strands_harness/models.py, harness-ts/src/models.ts, docs/context-and-caching.mdx, Test OpenAI Injection Cache, SDK 최소 버전 변경을 확인.

**구현:** caching 기본 ON이면 OpenAI·Bedrock Mantle 모델에 CacheConfig(strategy=auto)를 전달한다. 지원 모델 정보에서 GPT-5.6+의 Durable Content 지점에 cache point를 설정하고 prompt_cache_key에 session 식별자를 사용한다. Stable Instructions·Tools·History 뒤에 cache boundary를 두고 Per-turn Memory, Todos, Environment를 그 뒤에 붙여 변동 Context가 이전 Prefix를 무효화하지 않게 한다. caching=false/None은 해당 Harness Cache 필드를 끈다.

**실측/제한:** 작성자 실험에서 Harness Resolver+4 Invocations+Memory/Todo/Environment를 포함하고 Client를 Sandbox Federation으로 대체한 테스트에서, 두 번째 Turn 이후 OpenAI gpt-5.6-luna/gpt-6-luna의 Cached Input Share가 97~98%, Mantle은 96~97%로 나타났다. Provider Bill/Verified Task 절감치는 없다. Python 811 tests pass(기존 환경 의존 1 failure), TS 675/675 pass를 보고한다. Python strands-agents>=1.64.0, TS @strands-agents/sdk>=1.24.0을 요구한다. 오래된 SDK에 Harness 설정만 이식하면 Cache API가 미지원일 수 있다.

**P4 적용:** System Stable Prefix에 고정 Policy·Tool Contract·Skill Catalog 이름만 넣고 P4CLIENT/CL/Base Revision, TeamCity Build ID, Reviewer Evidence URI는 Run Delta로 분리한다. 캐시된 권한 설명을 최종 ACL로 사용하지 말고 Executor에서 Permission을 재검사한다. Cold/Warm 30회, TTL/Model Routing 교차하여 Cache Read/Write와 실제 USD, Verified Accuracy를 비교한다. **판정: PoC 최우선.**

## 4. Strands #5875 — 문서 MCP의 BM25 검색 순위·성능 수정

**근거:** [PR #5875](https://github.com/strands-agents/harness-sdk/pull/5875)(11/06 17:25 UTC), strands-mcp indexer/parser, tests_integ/test_search_ranking.py. 기존은 substring 빈도를 길이 정규화 없이 세어, 먼저 다운로드한 350KB Changelog가 후속 모든 Query에서 상위에 남는 문제가 있었다. llms.txt Description/Full URL Path도 색인하지 않았다.

**구현:** Title/Headings/Body 별 BM25 Term Saturation과 길이 보정, 필드 Weight 4/1/1. Title b=0.3, Headings/Body b=0.75. llms.txt Description과 URL 전체 Path를 Title 필드 검색에 포함한다. 대형 Changelog Index는 Title+Description만 색인한다. 동일 질의에 대해 페이지 본문을 나중에 hydrate해도 Ranking이 급변하지 않도록 한다.

**정량:** 기대 문서 순위가 evals quickstart 13/14→1/1, harness configuration 6/16→1/1, strands.models.bedrock 7/검색불가→1/1(fresh/hydrated). 완전 hydrate된 1,144 pages/300 queries에서 mean 102ms→1.0ms, p95 277ms→3.0ms. 결과는 **문서 검색 CPU**의 PR 작성자 측 측정이며 답변 품질이나 LLM 비용 변화는 아직 미측정.

**P4 적용:** UE5 Error Code, P4 Command, TeamCity 실패 Keyword, 문서 제목과 설명을 가중 색인. 검색 100개/정답 문서 쌍으로 recall@3, Evidence Anchor Accuracy, Latency 및 Model Context Tokens를 평가. 문서 선택 품질이 낮으면 짧은 Context를 넣어도 오답이 발생한다. **판정: PoC 최우선.**

## 5. Gemini CLI #30180 — Multi-part, InlineData까지 포함한 누적 Output/History 제한

**근거:** [PR #30180](https://github.com/google-gemini/gemini-cli/pull/30180)(11/06 19:47 UTC). 확인 경로: packages/core/src/scheduler/tool-executor.ts, context/chatCompressionService.ts, context/toolOutputMaskingService.ts, core/client.ts, agents/local-executor.ts 및 memory-leak-regression.test.ts.

**문제:** 여러 Tool Output 배열 요소 각각 64KB 이하로 제한해도 합산 후 몇 MB가 될 수 있었다. Nested functionResponse.parts.inlineData 이미지/스크린샷이 History Byte Count와 Masking에서 제외되어, 예상 Token이 낮아도 V8 OOM이 발생했다.

**변경:** 전체 Part의 누적 MAX_STORED_TOOL_OUTPUT_BYTES=64KiB를 적용하고 convertToFunctionResponse 이후도 재검사한다. Nested inlineData Base64를 Byte Size에 합산하고, 오래된 Masked Tool Response에서 실제 제거한다. 최근 3턴은 보호, 오래된 exempt Retrieval Tool 응답은 합계 64KiB 예산을 준다. 256KiB History Byte Trigger가 일어나면 500,000-token compression threshold 미도달 시에도 오래된 Tool Output을 collapse한다. 기록된 HistoryTurn ID를 유지한다.

**효과/리스크:** 모델 컨텍스트 절약뿐 아니라 런타임 메모리 안전성과 반복 응답 팽창 방지에 유용하다. 단 이미지/로그의 중요한 Evidence가 제거될 수 있으므로 Model에는 URI+Hash+필요 Error Span만 남기고 원본은 Artifact Store에 둔다. 64KiB/256KiB는 설정 상한이지 검증된 절감량이 아니다. **판정: 바로 적용 원칙.**

## 6. Agent Framework #10148 — Dynamic MCP Skill Resource 읽기

**근거:** [PR #10148](https://github.com/microsoft/agent-framework/pull/10148)(11/06 19:52 UTC). dotnet/src/Microsoft.Agents.AI.Mcp/Skills/AgentMcpSkill.cs, AgentMcpSkillsSource.cs, McpSkillResourcesConverter.cs 등. MCP Skill Catalog가 resources에 Manifest File List 대신 "dynamic" 문자열을 쓸 수 있게 지원한다.

**동작:** SKILL.md의 상대경로를 모델이 필요할 때 요청하면 해당 지원 파일을 Lazy Read한다. Root SKILL.md alias(./SKILL.md, URI escape)와 Nested SKILL.md 구별, Path Safety/Size Limit/Cache Scope/Front Matter 검사, ResourceNotFound는 supporting resource에서 null 반환하고 필수 Instruction은 오류 처리한다.

**단점:** 동적 리소스는 Manifest의 Size/Hash 사전 검증이 불가능하다. 작성자는 Bounded Dynamic Cache와 Failed/Expired Cache Cleanup을 후속 PR로 남겼다. Token/Latency 절감 실측 없음. **판정: PoC.** P4 Skill Registry에는 Auth Scope+Tool Policy Version+Path Traversal 차단+TTL 캐시 무효화가 필수.

## 7. Strands #5840/#5569 — Signed Compaction과 Durable Context Injection

**#5840:** [PR](https://github.com/strands-agents/harness-sdk/pull/5840)(11/06 17:38 UTC). Python AnthropicModel에서 serverSideSummary Capability가 지원되면 Anthropic의 On-demand Compaction이 반환하는 Signed SummaryBlock(provider/signature/text)를 저장한다. Client-side 요약이 Preserved Thinking을 무효화해 요청이 거절되는 문제를 피한다. 다른 모델로 옮길 때 Summary Text로 변환할 수 있으며 서버 경로 실패 시 Client-side fallback과 경고를 사용한다. 작성자 기준 일부 Claude 5.5/Fable 5.1에 활성; 그 외 Provider는 Off. TS는 Capability Field만 추가되고 실제 실행 경로는 후속 예정. Vendor-specific이며 Cache/Token 절감 실측 없음.

**#5569:** [PR](https://github.com/strands-agents/harness-sdk/pull/5569)(11/06 18:20 UTC). TS ContextInjector의 변동 Context를 최신 User Message의 임시 복사본이 아닌 **영속 InjectedBlock**으로 기록한다. 지원 Anthropic은 turn-scoped system clear_at=next_user_message, 그 외 Provider는 최신 Turn의 Injection Text만 노출해 Stable Prefix와 Retry/Resume 정합성을 개선한다. Breaking API Change 및 저장 이력 증가를 수반한다. 외부 Retrieval Text를 System 권한으로 잘못 승격하면 Prompt Injection 위험이 커지므로 신뢰된 Environment Context에만 적용한다. **판정: 두 항목 모두 제한적 PoC.**

## 8. Codex #59902/#59891 — Reviewer Evidence를 완전한 단위로 보호

**근거:** [#59902](https://github.com/openai/codex/pull/59902)(11/06 12:50 UTC), [#59891](https://github.com/openai/codex/pull/59891)(11:53 UTC). 전일 원본 Evidence Collection 이후 Elastic Reviewer Context 선정 단계에서 생긴 다른 문제다.

Verified Q/A를 문자 단위로 잘라서 질문과 상반된 답변이 섞이는 사고를 방지한다. #59902는 Evidence Unit이 상한 내에 있으면 완전 보존하고, 초과 시 Protected Incomplete-answer Notice로 바꾸며 retained evidence bytes를 0으로 기록한다. #59891은 10,000개 REPL 응답의 Provenance Header와 Separator가 본문보다 먼저 Budget을 소진하는 현상을 해결한다. 우선 **가장 최근 연속 Suffix의 Header Token Cost**를 상한 내로 선정한 뒤 Body/Image Budget을 배분하며 누락 응답 수를 추적한다. 텍스트/멀티모달 회귀 테스트가 있다.

**P4 적용:** CL Diff Hunk, Build Finding, Reviewer Q/A를 Atomic Evidence Unit으로 유지. 길이 초과는 explicit omission marker로 표시하고 불완전 Evidence를 Verified Answer로 인용하지 않는다. Tool Output 요약은 원본 URI·Hash를 항상 유지. **판정: 바로 적용 원칙.**

## 9. Token Cost Receipt와 Budget/Model Routing

**Agent Framework #10088:** [PR](https://github.com/microsoft/agent-framework/pull/10088)(11/06 09:32 UTC). Streaming GitHubCopilotAgent의 ASSISTANT_USAGE 이벤트는 모델 호출 1회씩의 delta인데 기존 merge_mode=replace로 이전 이벤트를 덮어썼다. merge_mode=append로 바꾸고 테스트에서 100/10+200/20+300/30 → **600 input/60 output**, 종전에는 마지막 300/30만 보고했다. **이것은 비용 절감이 아니라 과소 계상 시정**. 여러 호출·Tool Loop 포함 Task의 사용량 Receipt는 모델별 합계·cache-read/write·Reasoning 포함 여부까지 저장. **바로 적용.**

**Codex #59794:** [PR](https://github.com/openai/codex/pull/59794)(11/06 02:32 UTC). ModelRequestContributor::budget_exhausted를 HTTP Request 전/WS 연결 전·후 확인해 이미 한도를 넘은 Thread의 다음 Model Generation을 SessionBudgetExceeded로 차단한다. WS Warmup은 허용. 예산 제어가 Client에서 사후 판단하는 것이 아니라 **Provider 비용 발생 전 Admission Gate**라는 점이 핵심. **바로 적용 원칙.**

**Codex #59958:** [PR](https://github.com/openai/codex/pull/59958)(11/06 19:17 UTC). Thread별 Model Catalog/Settings/Override에서 selected_model_info와 Context Window를 읽도록 하여 Routing과 Budget의 전제조건을 일관성 있게 한다. Classification 정확도가 개선됐다는 근거는 없음. **바로 적용 원칙.**

## 10. Claude Code v2.1.319 — MCP Background Task, 권한, Context Grid

**공식 릴리스:** [v2.1.319](https://github.com/anthropics/claude-code/releases/tag/v2.1.319), 11/06 17:04 UTC. 오늘 정식 공개 버전으로 확인. Auto Mode는 게이트웨이 등에서 서버 Policy Check가 불가능하면 조용히 내장 Classifier로 fallback하지 않고 확인/거절하며, denyInsteadOfPrompting은 비대화형 Agent가 권한 질문에 영원히 걸리지 않도록 거절을 선택할 수 있다. MCP Tool이 Task로 실행되면 즉시 Background로 옮겨 완료를 통보하며 CLAUDE_CODE_DISABLE_MCP_TASK_BACKGROUND로 동기 실행할 수 있다.

**Context 비용에 직접 관련된 수정:** /context의 전체 Visual Grid가 이후 Turn마다 모델에 반복 전송되던 문제를 수정해 간결한 Table만 읽게 했다. Terminal 표는 각 목록 Top 10만 표시하고 On-demand MCP Tool은 호출 전 Server별 집계 Row로 묶는다. Read-only Command Permission, Background Task 완료 결과, Resume 후 Deferred MCP Tool 보존, Permission Mode 변경 후 재실행 방지, Managed Gateway 정책·Windows 파일 저장 회복·Self-hosted runner도 수정됐다.

**적용:** Enterprise Gateway의 Auto Mode Policy/LLM Gateway 설정, Background Task Cancellation/ACK, /context 실제 Token 변화와 /usage Provider Bill을 분리해 검증. Perforce Submit은 MCP Background Task가 종료 알림을 보냈다는 것만으로 성공 처리하지 말고 원격 CL 상태를 재조회. **판정: 바로 적용 검증, 정량 Token 절감률은 미측정.**

## 11. Durable Task, Approval, MCP Session Isolation

**Codex #59817:** [PR](https://github.com/openai/codex/pull/59817)(11/06 03:51 UTC). Cloud TUI Submit과 Queue를 Client Message ID에 대응된 Server Admission Receipt로 확정한다. 응답을 놓친 메시지는 자동 재전송하지 않고 History 확인으로 reconcile한 다음 Draft를 복구한다. **중복 Submit 예방에 바로 적용할 원칙**.

**Codex #59910:** [PR](https://github.com/openai/codex/pull/59910)(13:21 UTC). CancelPatchApproval은 approval ID + requesting turn ID가 모두 일치할 때만 취소하여 늦은 취소가 다음 Turn의 동일 Call ID에 영향을 주지 않는다. **바로 적용**.

**Codex #59914:** [PR](https://github.com/openai/codex/pull/59914)(13:54 UTC). Guardian Decision은 Reviewed Thread의 ProviderAuthContext에 묶고 Queue 중 로그인 변경·키 교체 시 재검증. 다른 계정으로 Evidence 평가가 전송되는 것을 방지. **바로 적용**.

**Codex #59783/#59969:** [gRPC Session Lease](https://github.com/openai/codex/pull/59783)(01:49 UTC)는 Active Session이 Connection을 소유하고 120초 유휴 뒤에도 Worker Lease를 유지하는 테스트를 추가. [Writer Lock](https://github.com/openai/codex/pull/59969)(20:16 UTC)은 다른 Thread의 Lock 획득 병렬성을 높이면서 같은 Thread 중복 Writer를 배제. 정량 Latency 없음. **PoC/원칙 적용**.

**Agent Framework #8662:** [PR](https://github.com/microsoft/agent-framework/pull/8662)(08:52 UTC). Python Declarative MCP Handler가 동일 Endpoint/Header의 서로 다른 Workflow에 Server Session을 공유하지 않도록 매 Invocation에서 MCPStreamableHTTPTool을 생성·정리한다. **BREAKING:** cache_max_size, aclose 및 Handler Async Context Manager 제거, 매 호출 Connection/Discovery 비용 추가. Stateful MCP Workflow가 Session 연속성을 요구한다면 명시적 Remote Handle 또는 Scope-aware Handler 필요. **보안 원칙 적용/성능 PoC**.

**Agent Framework #10147:** [PR](https://github.com/microsoft/agent-framework/pull/10147)(15:24 UTC). Header별 Mutable Session을 잠그고 RPC 전체를 직렬화하던 구조를 Request-owned Header Snapshot/Owner Tag로 교체했다. 같은 유효 Identity에서는 병렬 호출, Identity 변경/Recovery/Close에서는 Active Attempt Drain 후 Session 전환. Timeout은 Admission·Recovery 등의 개별 예산이지 전체 End-to-end Timeout이 아님. Stateful MCP Server가 동시성 안전하다는 보장은 없다. **PoC**.

**Agent Framework #10149:** [PR](https://github.com/microsoft/agent-framework/pull/10149)(13:23 UTC). 명시적인 domain이 없는 URL Session Approval은 Host 기반 광범위 권한 대신 **ApproveOnce**로 줄여 Fail Closed. Scheme/Port/IPv4/IPv6/IDNA 등 경계 테스트. **바로 적용**.

**Agent Framework #9547:** [PR](https://github.com/microsoft/agent-framework/pull/9547)(09:30 UTC). 깨진 Memory state.json을 그대로 매 Turn 읽으며 실패하지 않고 UUID 접미사를 가진 .corrupt 파일로 격리·보존하고 새 기본 State를 시작. 36개 관련 테스트 작성자 보고. 단 Single-process/Single-writer 전제이며 다중 실행기 Shared State를 위한 분산 Lock 솔루션이 아니다. 승인·권한 상태까지 기본값으로 재설정하면 안 된다. **PoC**.

## 12. Gemini CLI Retry·Resume·Quota: 버려진 시도의 Tool 실행 방지

**#30165:** [PR](https://github.com/google-gemini/gemini-cli/pull/30165)(11/06 20:52 UTC). RETRY 때 debugResponses, cachedResponseText, pendingToolCalls, Citation, finishReason 등을 초기화한다. ACP Client에도 retry/reset Metadata를 보내 포기한 시도의 Partial Text와 Tool Call이 다음 시도에 이어 붙지 않도록 한다.

**#30186:** [PR](https://github.com/google-gemini/gemini-cli/pull/30186)(동시 병합). Thought-only/Interrupted Model Turn, Tool Response가 마지막인 비정상 History를 정규화해 Resume의 HTTP 400 및 Pending Prompt Duplication을 막는다. JSONL 전체 동기 Read·Rewind 대신 Async I/O와 최근 History Cache를 활용한다. 복구 Baseline을 Tool 응답 정리 이후 기록한다.

**#30187:** [PR](https://github.com/google-gemini/gemini-cli/pull/30187)(동시 병합). QUOTA_EXHAUSTED와 몇 시간 뒤 reset되는 HTTP 429는 장시간 무의미한 재시도 대신 Terminal/Fallback 처리. maxDelayMs 강제, ACP Session에 Retry Event를 알려 실행 중단 원인을 노출한다.

**P4 적용:** Agent가 재시도 전후 서로 다른 attempt_id를 갖고, 실패한 Attempt의 Tool Call은 폐기한다. P4 Submit/Build 같은 Side Effect는 Remote Reconcile 후에만 재시작하며 429·Timeout을 Context Overflow로 오판해 Compaction을 반복하지 않는다. **세 변경 모두 바로 적용 원칙**.

## 13. LangGraph #9614/#9615 — Subgraph Checkpoint 조회의 조용한 오류 경계

[LangGraph #9614](https://github.com/langchain-ai/langgraph/pull/9614)(11/06 15:25 UTC), [#9615](https://github.com/langchain-ai/langgraph/pull/9615)(16:08 UTC). Deep Agents의 Child가 Parent tools Node 안에서 생성되면 tools:<task_id>의 Checkpoint가 부모에 선언되지 않은 Subgraph로 저장되는 경우가 있다. get_state/history는 과거 400 Subgraph not found를 반환했다.

**신규 동작:** 실제 Subgraph를 못 찾을 때 부모 Graph로 읽어 공통 messages 등을 반환하게 하고, update_state는 계속 잘못된 Namespace를 거부한다. get_subgraphs는 research/research_review와 같은 Prefix 충돌을 Full Namespace Segment Match로 변경.

**주의:** 작성자 본문에서 이 Parent Fallback을 **Tactical이며 잘못된 상태를 조용히 반환할 수 있다**고 명시했다. Subgraph 전용 Key가 빠지고 next/tasks/interrupts가 부모 기준으로 비어 있을 수 있다. 없는 Namespace는 200/빈 State로 보일 수 있다. 따라서 Child의 Resume/완료 확인에 이 동작만을 의존하면 안 된다. **판정: 제한적 PoC, 단독으로는 현재 도입 가치 낮음.** Checkpoint Writer Graph ID/Namespace 소유 메타데이터를 별도 영속화할 것을 제안한다.

## 14. Perforce·Claude Code·Codex 제안 아키텍처

**아래는 여러 공식 구현에서 확인한 패턴을 결합한 제안 아키텍처이며 어느 프로젝트의 완성된 통합 구현이 아니다.**

~~~mermaid
flowchart TD
 A[P4 CL / UE5 Task / TeamCity Event] --> B[Admission + Permission + Budget Gate]
 B --> C[Durable Ledger / Idempotency]
 C --> D[Stable Prompt Prefix + Tool/Skill Registry]
 D --> E{Runtime Adapter}
 E --> F[Claude Code Worker]
 E --> G[Codex Worker / Reviewer]
 F --> H[Host Output Budget + Artifact URI]
 G --> H
 H --> I[Immutable Original Evidence Store]
 I --> J[Atomic Verified Q-A / Provenance]
 J --> K[Remote P4 & CI Reconciliation]
 K --> L[Delivery ACK + Provider Cost Receipt]
 L --> M[Resume / Handoff / Retry with Policy Hash]
~~~

Orchestrator는 Task State, P4 Workspace/Revision, 권한 승인, 비용 Ledger를 소유한다. Worker는 교체 가능하되 Claude Code와 Codex 각각의 Context Window/Model Catalog를 Session 시작·재개 시 조회한다. 원본 Build Log와 Diff, 툴 출력의 모든 이미지/바이너리 Evidence는 별도 Store에 두고 모델에는 필수 Error Span, SHA, URI만 노출한다. Dynamic Skill/RAG는 허용된 Org/Project/Auth Scope를 기반으로 필요한 리소스만 로드한다.

**불변조건:** 중복 Submit/Build=0, 승인 턴 혼동=0, Verified Evidence가 불완전하면 Verified로 사용 불가, Cross-tenant Skill/Memory 누출=0, Retry에서 Abandoned Tool 폐기, 모든 Model Invocation의 usage 합산, 불확실한 Side Effect는 자동 재실행 전에 반드시 Remote Read-back.

## 15. 재현 가능한 실험 계획

**PoC A — Host Output / Multi-part Budget:** UE5/TeamCity 로그 10KB·1MB·100MB 및 스크린샷, Part 1/5/50개. A=Full Output, B=Client Truncate, C=Host Aggregate Budget+Evidence URI, D=C+Error Span 추출. peak RSS, bytes-on-wire, Provider Input/Cache Tokens, Error Recall, verified task 비용을 기록. 제안 통과: Unauthorized Write 0, Evidence SHA 100%, Compile Error Miss 0, Verified Success 하락 2%p 이하.

**PoC B — Prefix Cache/Incremental Catalog:** 150 MCP Tool과 같은 요청 30개×3 Turn, Tool 추가/삭제·ACL 교체·Compaction·Fork/Resume·모델 전환. A=Full schema, B=Sorted static, C=Incremental, D=C+Stable Prefix Cache. Model Choice, Tool Recall@1, stale Tool 호출, Cache Read/Write/TTL, 실제 Provider Bill을 비교. 제안 통과: Write 권한 우회 0, Tool Recall 하락 ≤2%p, Bill/Verified Task 10% 이상 감소 또는 p95 Latency 20% 이상 개선. 두 지표를 섞지 말 것.

**PoC C — Durable Ledger/Approval/Retry:** 50개 Task에 Worker Kill 100회, 원격 429/Timeout, 중복 Approval ID, Prompt Compaction, MCP Credential 교체, 로그 손상 주입. task_id/attempt_id/client_message_id/turn_id/tool_call_id/approval_id/policy_hash/base_cl/evidence_sha/receipt_id 보존. 중복 Submit 0, stale Approval accepted 0, Wrong User/Org Scope 0, Pending Mail Loss 0, unbilled invocation 0을 합격 조건으로 둔다.

**PoC D — RAG/Skill Retrieval:** 1,000개의 문서/Skill에서 Weighted BM25 vs Substring, Manifest vs Dynamic, fresh vs hydrated Index. Query 100개, 정답 문서 recall@3, evidence correctness, Runtime Permission, bytes returned, Tokens, p95 Latency 및 실제 Bill. Cache Cleanup·Scope Enforcement 완성 전에는 Dynamic Skill 기본 도입 보류.

## 16. 제한·적용 우선순위

| 방식 | 얻는 이점 | 반드시 검증할 위험 | 판정 |
|---|---|---|---|
| Host-side Truncation | 불필요한 Tool Output·전송량 축소 | Error Span 누락 | **바로 적용 검증** |
| Stable Prefix + Cache Key | 반복 컨텍스트 할인 가능 | 캐시 TTL·적중·보안 Scope·단가 | **PoC 최우선** |
| Incremental Tool Declarations | Catalog 중복 전송 최소화 | Stale Tool·Provider 호환성 | **PoC 최우선** |
| BM25 Selective Context | Retrieval 안정성·검색 속도 | 도메인별 Recall Drift | **PoC** |
| Dynamic Skill Files | 초기 Skill Payload 축소 | 무해시 파일/캐시 무효화 | **PoC** |
| Signed Compaction | Preserved Thinking/History Integrity | Model Lock-in, Fallback 품질 | **PoC** |
| Evidence Atomicity | 잘린 답을 증거로 오판 방지 | 지나친 Omission | **바로 적용 원칙** |
| Budget + Usage Receipt | 과금 통제와 계측 정확화 | False Budget Stop | **바로 적용 원칙** |
| Invocation-owned MCP | 사용자 간 Stateful Session 격리 | Connection/Discovery 비용 증가 | **PoC** |
| Parent Graph Fallback | 조회 오류 일부 완화 | 상태가 틀려도 성공으로 표시 | **단독 도입 가치 낮음** |

**우선순위:** 원본 Evidence/Output Budget 및 사용량 Ledger → Provider Budget Gate·승인 정합성 → Prompt Cache/Tool Incremental A/B → Selective RAG/Skill → Durable Runtime/Compaction 모델별 PoC.

## 17. 확인되지 않은 사항·다음 추적

1. Strands Cached Read 96~98%의 실제 Payable USD 절감률과 다양한 TTL/Model Switch에서의 유지율은 확인되지 않았다.
2. Codex #59973은 11/06 main 병합이며 11/06 01:40 UTC 게시된 0.167.0에 포함됐다는 근거가 없다. 실제 버전별 바이너리 동작을 따로 확인해야 한다.
3. Agent Framework Dynamic Skill의 Bounded Cache Cleanup은 아직 후속 과제이고, #8662는 명백한 BREAKING Interface다.
4. Strands #5840은 Python Server-side Summary, #5569는 TS Context Injection의 서로 다른 기능이다. 다른 Provider에 동일하게 작동한다고 단정하지 않는다.
5. LangGraph의 Parent Fallback은 잘못된 Checkpoint를 조용히 돌려줄 수 있다. 상태 Writer Graph ID를 복구하는 구조가 필요하다.
6. 테스트·검색 성능·Prompt Cache 수치는 업스트림 작성자 자료로, Perforce/Enterprise 실제 코드 및 유료 모델에서 재현하지 않았다. 동일 작업 품질의 실제 청구 비용 절감 실측은 오늘도 없다.

**오늘 판정:** Token을 무조건 짧게 만드는 것보다 **Host에서 출력 상한을 집행하되 Evidence는 완전하게 보존하고, Stable Cache와 Incremental Tool 선언의 실제 비용을 측정하며, Resume/Retry/Approval/Ledger를 결정론적으로 검증**하는 구현을 우선한다.
