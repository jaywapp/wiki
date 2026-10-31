---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-01"
date: 2026-11-01
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, prompt-cache, mcp, skills, hooks, guardian, durable-state, runtime-adapter, session-handoff, model-routing, evidence-verification, cost-telemetry, perforce, claude-code, codex, opencode]
source:
  - https://github.com/anthropics/claude-code/releases/tag/v2.1.316
  - https://github.com/anomalyco/opencode
  - https://github.com/openai/codex
  - https://github.com/langchain-ai/open-swe
  - https://github.com/langchain-ai/deepagents
  - https://github.com/google-gemini/gemini-cli
  - https://github.blog/changelog/2026-10-28-route-and-orchestrate-models-with-github-copilot-fusion/
  - https://arxiv.org/abs/2610.38521
updated: 2026-11-01
---

# AI Harness · Context/Token Optimization Scout — 2026-11-01

> **조사 기준:** 2026-11-01 06:04 KST / 2026-10-31 약 21:04 UTC. 주 비교 구간은 2026-10-30 21:02 ~ 2026-10-31 21:04 UTC. GitHub 기본 브랜치의 커밋, 실제 merged_at, PR 변경 파일·테스트와 공식 릴리스, 10/31·10/30 기존 Scout를 대조했다. 10/28에 공개됐지만 직전 보고서에서 빠진 공식 발표·논문은 **후속 보완 조사**로 날짜를 분리해 수록했다. PR 병합과 패키지 릴리스는 구별한다. 아래 정량 자료는 명시하지 않는 한 **업스트림 작성자의 측정**, 독립 재현 결과가 아니다.

## 0. 핵심 요약 — 신규성과 실제 비용 효과를 구별

오늘의 가장 큰 변화는 (1) MCP Catalog의 SDK 중복 스키마 검사·캐시를 제거한 **선택적 Tool Validator**, (2) 다중 Workspace Provider Discovery의 **단일 비행 캐시와 TTL**, (3) Tool 배열 순서 고정에 따른 **Prompt Prefix 재현성**, (4) Guardian Evidence의 **선 압축 후 탄력 할당**, (5) 작업 실행과 분리된 **세션 Inbox·Cross-backend Handoff**, (6) Claude Code 2.1.316의 **Subagent Effort·기업 공동 Budget·정책 계층화**이다.

**오늘 변경에 대해 작업 성공률을 고정한 실측 LLM token 절감률·청구 비용 절감률은 확인되지 않았다.** 반면 MCP CPU·heap, Provider HTTP 호출, 파일시스템 syscall, 세션 상태 복구에 대한 구체적 검증 자료가 있다. 후속 발견한 10/28 GitHub Copilot Fusion의 약 50% 비용·토큰 및 약 40% 시간 감소는 **GitHub가 발표한 특정 벤치마크 결과**이고 본 조사에서 독립 검증하지 않았다.

| 우선 | 새 구현·관찰 | 공식 근거 / 계측 | 적용 평가 |
|---|---|---|---|
| 1 | OpenCode MCP 스키마 지연 검사·Cache Bypass | [#60733](https://github.com/anomalyco/opencode/pull/60733) · 296 Tool 첫 Call 45.8→0.3ms(legacy), Heap 3.58→1.82MiB | **PoC 최우선** |
| 2 | OpenCode Provider SharedCache | [#60082](https://github.com/anomalyco/opencode/pull/60082) · 30 Location일 때 Provider별 Discovery 32→1 요청 | **PoC 최우선** |
| 3 | Claude Code 2.1.316: Subagent Effort·공동 Budget·계층형 Policy | [공식 릴리스](https://github.com/anthropics/claude-code/releases/tag/v2.1.316) · 10/31 01:01 UTC | **바로 적용 검증** |
| 4 | Codex Guardian Elastic Context·Entry Cap | [#58444](https://github.com/openai/codex/pull/58444), [#58454](https://github.com/openai/codex/pull/58454) · Fixed가 여전히 기본 | **PoC** |
| 5 | OpenCode Tool 순서 안정화·중복 이름 거부 | [#60811](https://github.com/anomalyco/opencode/pull/60811) · 2005 테스트 통과 | **바로 적용 원칙** |
| 6 | Codex 소유 Backend 간 세션 이동 | [#58457](https://github.com/openai/codex/pull/58457) · 진행 중 Turn 전환 금지, 실패 시 원 세션 유지 | **PoC** |
| 7 | OpenCode Folder 없이 Synthetic/Compact Inbox 저장 | [#60801](https://github.com/anomalyco/opencode/pull/60801) · 삭제된 Worktree에서도 200·0 Folder Boot | **바로 적용 원칙** |
| 8 | Codex 실패 추론의 미완료 Tool Evidence 영속화 | [#58456](https://github.com/openai/codex/pull/58456) · Trace에는 기록, Tool 실제 실행은 금지 | **바로 적용 원칙** |
| 9 | Open SWE 모델 전달용 Sandbox Link 단축 | [#4651](https://github.com/langchain-ai/open-swe/pull/4651) · 825자 Signed URL 대신 약 70자 | **PoC** |
| 10 | OpenCode JSON Schema Cache의 Location Retention 수정 | [#60800](https://github.com/anomalyco/opencode/pull/60800) · 10 Location 154→113MB | **PoC** |
| 11 | OpenCode MCP 첫 Turn 등록 Barrier | [#60490](https://github.com/anomalyco/opencode/pull/60490) · 연결 시작 후 최대 2초/서버 | **바로 적용 원칙** |
| 12 | Gemini CLI Turn 범위 Fallback 복원 | [#30059](https://github.com/google-gemini/gemini-cli/pull/30059) · 취소/Rewind 뒤 선택 Model 복구 | **바로 적용 원칙** |
| 보완 | GitHub Copilot Fusion 동적 Single/Cascade/Critique | [10/28 공식 발표](https://github.blog/changelog/2026-10-28-route-and-orchestrate-models-with-github-copilot-fusion/) · 벤더 벤치 약 절반 비용·토큰 | **PoC** |
| 보완 | Memory 파일 Injection의 실험적 품질 영향 | [10/28 논문](https://arxiv.org/abs/2610.38521) · 36 Tasks, 변화 −8~+6%p, 일관된 방향 없음 | **바로 적용 보안 원칙** |

## 1. OpenCode #60733 — MCP Catalog를 미리 전부 검증하지 않고 호출 시 해당 Validator만 컴파일

**신규성·문제:** 10/31 03:19 UTC 병합. MCP SDK가 tools/list의 모든 항목을 Zod로 깊이 검사하고, OpenCode도 다시 SDK Codec 검사를 하며, SDK는 Catalog 전체를 JSON 직렬화·재파싱했다. 첫 tools/call에서 **사용하지 않을 도구들의 Output Validator까지 컴파일**하던 경로가 CPU와 Heap을 차지했다. 이는 전일 Open SWE의 **Backend ToolSet Digest/BM25**(#4697)와 다르다. 오늘 변경은 **Client의 검증 시점과 객체 보존 방식**을 손본 것이다.

**구현 확인:** packages/core/src/mcp/client.ts와 patches/@modelcontextprotocol%2Fclient@2.3.1.patch. listTools의 Tool Item을 SDK가 깊이 검사하지 않게 하고, OpenCode connection.tools()에서 name·inputSchema.type 등 최소 구조만 검사한다. 잘못된 선택적 필드는 버리고 유효한 Tool은 유지하며 중첩 Properties는 그대로 둔다. **tools/list cacheMode=bypass**를 사용하고, callTool에 **실제로 호출할 Tool 정의 하나**를 전달한다. 최신 MCP Header가 맞지 않으면 **-32020에서 한 번만 재조회/재시도**한다. 잘못된 Tool을 무조건 신뢰하는 변화가 아니라, 등록 시 검증의 범위를 줄이는 설계다.

| 업스트림 PR Microbenchmark | 이전 | 변경 후 | 측정 성격 |
|---|---:|---:|---|
| 296 Tool legacy: tools/list CPU | 6.7ms | 1.6ms | 로컬 CPU |
| 296 Tool legacy: 첫 tools/call CPU | 45.8ms | 0.3ms | 로컬 CPU |
| 296 Tool legacy: Connection Heap | 3.58MiB | 1.82MiB | 메모리 |
| 296 Tool modern: 첫 tools/call CPU | 47.9ms | 0.3ms | 로컬 CPU |
| 3,763 Tool modern: tools/list CPU | 10.1ms | 7.4ms | 로컬 CPU |
| 3,763 Tool modern: 첫 tools/call CPU | 6.7ms | 0.4ms | 로컬 CPU |
| 3,763 Tool modern: Connection Heap | 12.12MiB | 4.14MiB | 메모리 |

테스트는 packages/core/test/mcp.test.ts와 SDK Patch를 사용했다. 측정은 로컬 20 Connection을 포함하는 작성자 Bench이며 LLM 입력 토큰은 미측정. **토큰 절감 원리:** 이 패치 자체는 Schema를 모델에서 감추지 않으므로 직접적인 모델 토큰 감소를 입증하지 않는다. Model Tool Catalog를 별도 Dynamic Discovery와 결합할 때만 간접적인 Token 최적화 가능성이 있다.

**장점/한계:** 도구 다수 환경에서 초기 지연·메모리 감소. 반면 MCP SDK 버전 업그레이드 시 사설 Patch 유지 비용, 일부 잘못된 Optional Schema Field를 버리는 Compatibility 변화, 호출 시 Schema Error 지연 발견 위험이 있다. 권한 검사는 Executor에서 따로 시행해야 한다.

**Perforce PoC:** P4/Build/TeamCity Tool 50·150·500개를 가상 MCP로 만들고 기존 Deep Validation과 Selective Validation을 비교. 최초 모델 호출 p95, Catalog CPU, RSS, Tool-call 정상/비정상율, API input/cache tokens를 기록. Tool Registry의 Validation과 실제 P4 submit 권한은 분리. **평가: PoC 최우선.**

## 2. OpenCode #60082/#60787/#60782 — Provider Discovery 결과의 공유·중복 Event 제거

**10/31 01:35 UTC 병합 #60082**. 30 Location이 열리면 Copilot /models 등 Provider Discovery가 Location별로 반복됐다. 새 packages/core/src/shared-cache.ts / plugin/provider/refresh.ts는 전역 내부 SharedCache를 사용한다.

**실행:**

1. key는 Integration·Connection/계정 식별자·정적 Key Fingerprint·결과에 영향을 주는 Config로 구성한다. 원문 자격 증명 Token 자체를 Key로 저장하지 않는다.
2. 기본 Freshness Interval 10분. 유효한 결과는 반환, 같은 Key 로드 중이면 동시 요청을 결합(single-flight).
3. 네트워크/Timeout/408/429/5xx는 제한적으로 재시도. 실패 시 Last Good Catalog를 유지할 수 있다. 미사용 Entry는 24시간 또는 더 긴 Interval 조건에 맞춰 회수.
4. 계정 전환 시 캐시된 목록을 먼저 표시하고 백그라운드 Force Refresh, 변경이 있을 때만 Provider를 Reload.

**작성자 A/B:** 30 Location 열기에서 Copilot/DigitalOcean/Azure 각 API 호출이 **32→1**, Copilot 계정 전환 시 **31→1**. 이는 Provider HTTP Request 수이지 97% LLM 비용 절감이라는 뜻이 아니다. 후속 [#60787](https://github.com/anomalyco/opencode/pull/60787)은 Credential 변경이 있어도 Plugin의 실제 State가 변하지 않으면 Catalog Rebuild를 생략한다. [#60782](https://github.com/anomalyco/opencode/pull/60782)는 무관한 Credential Event로 각 Location의 여러 Listener가 재조회하던 문제를 억제한다.

**품질·보안 Trade-off:** 응답 빠름/Rate Limit 회피 vs 최대 10분까지의 Catalog Staleness. Account ID·권한·Policy Change에 민감한 Model Availability는 강제 Invalidate가 필요하다. 공유 Cache가 다른 Tenant에게 잘못된 Catalog를 제공하지 않도록 Key에 Principal/Policy Fingerprint를 포함해야 한다.

**P4 적용:** Claude Code/Codex Worker가 여러 개여도 P4 Depot Metadata, CI Build Type, 허용 Model List의 Read-only Discovery를 Scope-Keyed Single-flight Cache로 공유. P4 Protections·제출 승인 자체는 캐시로 대체하지 않는다. 1/10/30 Worker의 Metadata RPC/Cold TTFT/권한 누출·Model Missing을 검증. **평가: PoC 최우선.**

## 3. OpenCode #60811/#60918 — Tool 순서와 Instruction 변경 이벤트를 안정화

**#60811(10/31 06:12 UTC):** @opencode/ai의 Tool Container를 이름 있는 배열로 변경했다. Model Wire에 **배열 순서 그대로** 전달해 동일 ToolSet의 Tool 순서가 프롬프트 접두부를 흔들지 않도록 한다. generate/stream/loop에서 중복 Tool Name은 호출 전에 InvalidRequest로 거부한다. API는 Record Tool 형식 제거로 **Breaking Change**이며 2,005개 AI 패키지 테스트가 통과했다. Core의 ai.request 직접 Wire 도구 처리에는 일부 이전 동작이 남으므로 전체 SDK가 자동으로 강제된다고 일반화하지 않는다.

**#60918(10/31 16:35 UTC):** 동일 Instruction 파일의 **순서만 바뀌고 경로/내용이 불변**이면 Model에 빈 Instruction Update를 보내는 대신 Silent State Update(undefined)로 처리한다. 이전에는 requireText가 빈 문자열 오류를 발생시켰다. 390 Test Pass. 초기 로딩 및 Compaction 이후 파일 순서는 본 변경 범위가 아니다.

**토큰·캐시 원리:** 동일 Tool Catalog를 같은 순서로 노출하면 Prefix Cache Miss를 줄일 잠재력이 있고, No-op Instruction Update는 불필요한 모델 메시지를 없앤다. 그러나 Cache Hit/청구액 감소는 아직 **미측정**. 모델 Tool Selection 품질은 동일해야 하며, 에이전트가 순서에 민감하면 회귀할 수 있다.

**Perforce 적용:** Tool Catalog를 정렬된 명시적 Version/Hash로 관리하고, Skill/CLAUDE.md/AGENTS.md 변경은 Path+Content Hash로 비교. Instruction Array Order만 바뀌면 Model Turn 중간에 System Update를 주입하지 않는다. 단 **Policy/ACL Hash**는 별도 버전으로 강제한다. Prefix-Read Tokens, Tool Selection 오류율, 작업 성공률을 비교. **평가: 바로 적용 원칙 + Cache PoC.**

## 4. Claude Code 2.1.316 — Subagent 모델 Effort·월간 공동 예산·Policy Layering

**10/31 01:01 UTC 공식 릴리스**: [v2.1.316](https://github.com/anthropics/claude-code/releases/tag/v2.1.316). 전일 v2.1.314의 Idle Compaction과 구분된다.

- **CLAUDE_CODE_SUBAGENT_EFFORT**: 별도 Effort 지정이 없는 Subagent의 기본 Effort를 Main Session 상속 대신 독립 지정. Main=High, 조사 Worker=Low/Medium 같은 정책을 Runtime에서 명확히 할 수 있다. 모델이 수행하는 reasoning 양·비용은 실측 필요.
- **Claude apps Gateway pooled_budget**: 개인 한도 위에 Group이 공유하는 월별 Budget을 설정. 이는 자동 비용 절약이 아니라 **총 지출 상한 통제** 기능이다.
- **managed.policy_mode: layered**: Developer에 매칭하는 모든 정책을 명시적 순서대로 병합. First-match-only 정책과 동작 차이가 있으므로 Merge Conflict/거부 우선순위 테스트 필요.
- **Bedrock guardrail.input_tagging**: Bedrock Prompt Attack Filter가 기대하는 Input Tagging을 적용. all_messages_and_system 옵션은 System Prompt도 태그한다.
- **Windows PowerShell Hooks**: 명령 시작 부분에 Type Cast/param/using/Attribute가 있을 때 Exit Code 2 차단 실패를 수정. Windows Harness의 Permission Guard와 직접 관련 있다.
- **기타 신뢰성:** --restricted가 허용 Read Path를 근거로 Workspace 밖 파일을 Upload하던 문제, 하위 Subagent가 Background Wake 뒤 Main Model로 되돌아가는 문제, 게이트웨이가 요청의 모든 Model Field를 Policy에 비추어 검사하지 않던 문제, Windows Grep/Glob Process Timeout 무한 대기, Self-hosted Runner의 중단 이후 오래된 메시지 응답 등을 수정.
- **Opus 4.8 Fast Mode:** 2026-10-30 Deprecated, 2026-11-30 제거 예정. 제거 후 자동 Standard Fallback이 없다는 릴리스 공지이므로 해당 Tier에 의존하는 스케줄/워크플로우는 명시적으로 확인.

**Perforce/Claude Code PoC:** Windows PowerShell PreToolUse Hook이 Exit 2로 실제 Submit/Write를 막는지 테스트하고, Subagent Effort=Low/Medium/High × 동일 20개 검색/리뷰 작업으로 Input/Output/Cache/Reasoning Token, Task Accuracy, P4 ACL Violation, Provider Bill을 기록. Group Budget은 Cost Receipt·Org Spend Limit과 대조. **평가: 바로 적용 검증**, 비용 절감률은 **미측정**.

## 5. Codex #58444/#58454 — Guardian Evidence 선압축과 탄력 예산 할당

**10/30 22:25 UTC #58444, 23:54 UTC #58454 병합.** 전일 #58388은 Evidence를 조각으로 자르지 않고 Whole-entry로 할당하는 원칙이었다. 오늘은 그 원칙의 빈틈을 보완했다.

- **Entry Cap Preparation(#58444):** Required/Optional Evidence의 Text를 Allocation 전 한 번만 UTF-8 안전하게 줄인다. JSON Escaping/Metadata/Framing까지 포함한 Rendered Size를 계측하고, 잘림을 Truncation Observation에 남긴다. **계획된 Action의 JSON, 이미지·오디오·Opaque Native Payload는 그대로** 유지한다. Action 전체가 Budget에 못 들어가면 조용히 잘라내는 대신 거절.
- **Elastic Preparation(#58454):** ContextBudgeting::Elastic은 Root Conversation과 Node REPL Evidence를 Fixed Section Cap 없이 준비해, 이후 필요한 Evidence가 유연하게 할당되도록 한다. Source Dedup, Omission Notice, Multimodal Representation을 유지한다. **ContextBudgeting::Fixed가 현재 기본**, 새 Elastic을 기본 정책이라고 단정할 수 없다.

**확인 코드:** codex-rs/guardian-context/src/preparation/elastic.rs, allocation.rs, truncation.rs, codex-rs/core/src/guardian/input_budget.rs. Source·Entry Caps·REPL의 Text/Image/Omission Count를 검사하는 테스트가 추가됐다.

**절감/품질:** Model에 전달하는 Evidence의 상한을 관리해 Context Overflow 회피를 기대한다. 단 필요 근거 누락 시 Guardian Approval False Positive/Negative가 악화될 수 있다. **전체 Evidence Accuracy vs Token 비용**을 같이 측정해야 한다.

**P4 Evidence Budget 제안:** Planned Submit Action의 P4CL/Files/ACL/Approver는 완전 보존, 대형 Diff/Compiler Log는 Source URI·Line Span·SHA-256와 함께 Entry Cap. Guardian에 원본과 Summary의 Provenance/Completeness를 전달한다. 승인 위반 0, 근거 누락 0, Verify Success ≥Baseline, Model Token/Approval 한도 측정. **평가: PoC.**

## 6. Codex #58456 — 미완료 Model Tool Call도 실패 Trace에 남기되 실행하지 않는다

**10/30 23:56 UTC 병합.** Inference가 ResponseIncompleteError로 끝날 때 일부 시도된 Tool Call이 Streaming Event에는 없고 Terminal Payload에만 있던 경우, 기존 Failed Inference Trace는 그 정보가 빠졌다.

**동작:** incomplete로 표시된 Output Item만 Failure Trace에 포함하고 Item ID로 중복 제거. 그러나 **Stream Output, Tool Dispatch, Continuation Cache에는 넣지 않는다.** Error Debug Text에는 민감 Payload도 포함하지 않는다. 관련 코드·회귀 테스트는 Codex PR [#58456](https://github.com/openai/codex/pull/58456).

**P4 적용:** Model이 p4 submit을 제안한 흔적과 실제 p4 submit 실행 영수증은 별개. Trace에 Attempted Tool Call이 있다는 이유로 명령을 이미 실행했다고 오인하거나 반대로 재실행해서는 안 된다. Tool Receipt ID·Remote CL State와 정합성 검증. **평가: 바로 적용 원칙.** Token 절감은 직접적이지 않고 사고·중복 재실행 비용 감소 가능성이 핵심이다.

## 7. Codex #58457 — Backend 간 Session Handoff와 소유권 경계

**10/30 23:56 UTC 병합.** Codex TUI의 Session Picker가 서로 다른 Backend의 Thread를 보여주면서도 실제 Resume은 거부하던 문제를 해결했다.

**내부 구조:** Session의 Owning Backend를 기준으로 대상 Runtime·설정·계정·Model Catalog·Workspace Service를 먼저 준비한다. **준비 성공 뒤에만 현재 Thread를 교체**하고 Draft를 보존한다. 진행 중인 Turn에서는 Backend Switch를 거부한다. 표시되지 않는 Backend의 Background Request는 보류하고, 이미 해결됐거나 Disconnect된 Request는 정리한다. Background Event가 현재 표시한 Conversation에 섞이지 않도록 분리하며 Source Backend로 Detach/Reconnect를 수행한다.

**근거:** [#58457](https://github.com/openai/codex/pull/58457), codex-rs/tui/src/app/backend_sessions.rs, backend_selection.rs, resume_preparation.rs 및 backend_ownership_tests.rs.

**토큰·장단점:** 모델 Context의 자동 전송/정확한 토큰 절감 기능이 아니다. 잘못된 Backend에서 비어 있는 Session을 재시작하거나 중복 작업을 수행하는 위험을 줄인다. 서로 다른 Backend의 Model/Tool/Permission이 동등하다고 가정하면 안 된다.

**P4/Codex/Claude Adapter 제안:** P4 Workspace·Base Revision·Pending CL은 Orchestrator가 소유하고 Runtime은 adapter_id/owner_backend/instance_generation을 가진다. 새 Runtime 준비·권한 확인이 성공하기 전 기존 Worker/Lease를 회수하지 않는다. **평가: PoC.**

## 8. OpenCode #60801 — Worktree가 없어도 Durable Inbox에 Compaction·Synthetic Event를 쌓는다

**10/31 05:30 UTC 병합.** 기존 session.synthetic 및 session.compact Endpoint는 단순히 SQLite Inbox Row를 쓰는데도 Session Folder Middleware가 Workspace Service Container를 Boot했다. 삭제된 Worktree에서는 400이 발생했다.

**수정:** POST /synthetic, POST /compact가 전역 Session Service로 직접 연결. resume:false면 죽거나 잠든 Folder를 깨우지 않음. 삭제된 Worktree에서도 Inbox Admission이 200을 반환한다. 현재 Run의 Model Execution 동작은 변경하지 않는다. 코드: packages/protocol/src/groups/session.ts, server/test/session-admit-location.test.ts.

**측정:** Sleep Folder에서 0 Boot, Deleted Worktree에서 기존 400→200. 이 수치는 **모델을 쓰지 않는 상태 저장**이며 자동으로 Compaction에 LLM 호출이 없어졌다는 뜻은 아니다.

**P4 적용:** Build Completed/Review Finding/Handoff Note는 Worktree Lease와 독립인 Durable Inbox에 먼저 적재. Worker Resume 이후 적용할 때 CL/Base Revision/Permission Version을 재검사한다. Compaction Request도 Idempotency Key 및 Ordering Barrier 유지. **평가: 바로 적용 원칙.**

## 9. Open SWE #4651 — 모델이 긴 URL을 복사하지 않도록 Artifact Locator를 단축

**10/30 23:04 UTC 병합.** 모델이 825자 Signed Sandbox URL을 재작성하다 공백 하나를 넣어 Link가 깨진 운영 사례 대응. 모델에 약 800자 Signed URL을 주는 대신 **약 70자**의 Open SWE Short Link를 전달한다.

**구현:** openswe/short_links/models.py·routes.py, DB Migration 0088, create_sandbox_file_download_url. Random 22자 Token으로 Target URL과 Expiry를 DB에 기록하고 GET /dashboard/api/l/{token}에서 302 Redirect. 없는 Token=404, 만료=410, Local Public HTTPS Origin이 없으면 이전 Signed URL Fallback. GitHub Image Proxy 때문에 별도 로그인 요구 없이 Redirect한다.

**Token/Trade-off:** 모델이 복사해야 하는 Text 길이와 오류 가능성을 줄인다. **825→70자 ≠ 모델 토큰 91% 절감**이고 전체 Prompt 대비 효과도 미측정. Short Token은 사실상 Bearer Capability이며 Access Log·PR/Slack에 유출되면 원 Signed URL의 권한을 전달한다. Preview Deployment가 폐기되면 Link도 깨질 수 있다.

**Perforce/UE5 적용:** 수백 줄 P4 Diff와 대용량 Build Log를 모델에 재전달하기보다 짧은 Artifact ID(예: artifact://task/sha)와 검증 가능한 Full Hash, Expiry를 전달. 내부 Auth Gateway의 ACL로 접근 제한, 승인 없는 외부 공유 금지. Link Integrity·Expiry·Leak 테스트 포함. **평가: PoC.**

## 10. OpenCode #60800/#60803 — 메모리 누수 방지와 Workspace Config Discovery 단순화

**#60800(10/31 16:58 UTC):** process-wide JSON Schema Codec Cache가 Effect Fiber의 Call Stack Closure를 붙잡아 Location 전체를 GC할 수 없었다. packages/core/src/tool/runtime.ts의 Cache를 **Schema Object Identity 기반 WeakMap + 동기 Codec Build**로 교체. GC 후 10 Location의 Heap이 작성자 단일 시험에서 **154→113MB**. 3 Location 중 일부는 별도의 Effect Root Cause로 계속 남아 있으므로 **완전한 메모리 누수 제거는 아님**. 테스트는 GC를 강제하는 방식이고 JIT 상태에 따라 Flaky 가능성이 공개됐다.

**#60803(10/31 05:58 UTC):** 부모 디렉터리마다 opencode.json/jsonc, .opencode, .claude, .agents 후보를 각각 realpath하던 방식에서 **부모별 한 번 Directory Listing 후 존재하는 항목만 검사**하도록 변경. 파일 생성 감시 대상은 유지하고, Directory Listing 권한이 없으면 기존 개별 검사로 Fallback. 4계층 예제에서 **realpath 20→2회, stat 4→1회**, 89 Config 관련 테스트 통과. Windows Case-insensitive 탐색 테스트 포함. 실제 Boot ms는 미측정.

**Perforce/Windows:** 커다란 Workspace와 Nested .claude/.agents에서 Startup Syscall을 계측하되 Symbolic Link·Case Sensitivity·ACL·Watcher 새 파일 반영을 회귀 확인. 메모리/시작 시간은 LLM Token 비용과 별도로 기록. **평가: PoC.**

## 11. OpenCode #60490 — MCP 연결 완료와 Tool Registry 공개 사이의 짧은 Barrier

**10/31 03:50 UTC 병합.** MCP Server는 백그라운드로 연결되기 때문에 첫 Model Call에서 Server가 Connecting이거나 Status=Connected라도 Debounce Registry Refresh가 100ms 늦어 Tool이 없는 경우가 있었다.

**구현:** McpTool.flush에서 초기 등록 완료 후 각 연결 시도 시작부터 최대 **2초/서버**만 병렬 대기. Registry와 현재 Catalog가 다르면 Debounce를 기다리지 않고 즉시 Reconcile. 오래 걸린 서버는 Prompt마다 계속 막지 않는다. [#60490](https://github.com/anomalyco/opencode/pull/60490), packages/core MCP 및 Session Context.

**장단점:** 첫 Turn의 Tool Recall·Task Quality를 보호하지만 느린 MCP Server가 많으면 최대 2초 초기 지연이 생길 수 있다. 관련 Tool 없이 실행하는 것보다 나은지 Task별 측정 필요. **P4:** P4 Read-only Tool이 없으면 Task Planning을 연기할지, 독립 작업만 먼저 할지 Stage별 Required Tool Barrier 정의. **평가: 바로 적용 원칙.**

## 12. Provider Routing/Reasoning과 안정적 재시도

### Gemini CLI #30059 — Turn Scoped Model Fallback

**10/30 21:54 UTC 병합**, [Gemini CLI Nightly 0.67.0-20261031](https://github.com/google-gemini/gemini-cli/releases/tag/v0.67.0-nightly.20261031.g6814e00d6)에 기록. 일시적인 MODEL_CAPACITY_EXHAUSTED를 영구 Quota 오류로 오인해 사용자 지정 Pro가 Flash로 **영구 강등**되는 사례를 수정했다. retry_once는 해당 Turn에서만 Fallback하고, resetTurn/Cancel/Rewind에서 선택 Model과 ModelAvailability를 정합 복구한다. Custom Tool 전용 Model 선택 정보도 유지한다.

**적용:** Claude Code/Codex Adapter에서 원래 User Policy와 임시 Fallback Model을 별도 기록. model_requested / model_effective / fallback_reason / expiry_scope / cost_receipt를 두고, 단기 Capacity Error로 영구 변경하지 않는다. **평가: 바로 적용 원칙.** 과금 절감 실측 없음.

### Deep Agents #7047/#7439 및 QuickJS #6958

10/30에 병합된 Talon 변경은 LangSmith Gateway/ Baseten/DeepSeek Provider마다 **Reasoning Effort Request Field**를 올바르게 변환한다. [#7047](https://github.com/langchain-ai/deepagents/pull/7047), [#7439](https://github.com/langchain-ai/deepagents/pull/7439). 라우팅된 Model ID의 Provider Namespace를 먼저 해석하며 특정 DeepSeek 모델의 effort 목록과 none을 지원한다. **잘못된 Provider Effort Field로 요청이 실패하거나 의도와 다른 비용 Tier를 쓰는 위험**을 줄이지만 Model 단위 비용/품질 비교는 없다.

[#6958](https://github.com/langchain-ai/deepagents/pull/6958)은 QuickJS CodeInterpreterMiddleware(timeout=None)으로 Per-call VM Execution Deadline을 제거할 수 있게 했다. 기본은 5초이며, 이 Deadline은 Python Host Tool Await 시간을 세지 않는 **VM 실행 Budget**이다. 무한 Sync Loop는 asyncio Cancel/Outer Async Timeout으로 중단할 수 없으므로 **Windows Harness에 기본 적용 가치 낮음**; 격리 프로세스 Kill/Resource Limit이 준비된 곳에서만 아이디어 참고.

### OpenCode #60764/#60783/#60934

- [#60764](https://github.com/anomalyco/opencode/pull/60764): Gemini MALFORMED_FUNCTION_CALL/UNEXPECTED_TOOL_CALL 및 Interactions Premature EOF를 incomplete-stream으로 세분화. 무의미한 재시도와 잘못된 즉시 실패를 줄이되 Retry Rate/비용 실측 없음.
- [#60783](https://github.com/anomalyco/opencode/pull/60783): Structured Output은 generate/stream/loop의 schema 인자로 통합. 기존 generateObject API 제거는 Breaking Change. 아직 Provider Native JSON Mode가 아닌 **Hidden Tool** 방식, 2003 Tests Pass.
- [#60934](https://github.com/anomalyco/opencode/pull/60934): Azure AI Foundry Claude의 Anthropic Messages API Route 제공. 작성자가 Azure 실계정에서 Text·Tool Call을 검증. Enterprise Provider Adapter 참고. 비용 절감 아님.

## 13. Durable State·Evidence·Lifecycle 후속 관찰

- [Open SWE #4840](https://github.com/langchain-ai/open-swe/pull/4840): 관리자만 조회 가능한 **14일 보존** Human Review Coordination Event Log 추가. Request/Card/Assignment/Agent Wake/GitHub Approval/Delivery 상태를 기록하되 개인 DM 본문과 Run Config는 로그에 넣지 않는다. Admin Only Subscription 필터가 중요. **평가: 바로 적용 원칙.**
- [Open SWE #4857](https://github.com/langchain-ai/open-swe/pull/4857): 10/31 21:02 UTC 메모리 Prompt에 **검증된 Lesson만 선제적으로 저장**할 것을 권장. 전일 #4815 Workspace Memory의 **Prompt-only Follow-up**이며 새 Runtime/Token Benchmark가 아니다. 중복/임시 정보/사적 대화 공유를 거르도록 지시. **평가: PoC.**
- [Open SWE #4859](https://github.com/langchain-ai/open-swe/pull/4859): Workspace Snapshot Capture HTTP POST의 기본 10초 Timeout과 뒤 단계의 30분 Wait Timeout을 분리해 POST에 600초를 적용. 이전에는 실패 Capture가 약 10.3초, 성공은 1~3초였다고 기록. 오래된 Snapshot으로 작업 Boot하는 위험을 줄이지만 600초 대기 증가를 허용. **평가: 바로 적용 원칙(Timeout 단계별 구분).**
- [Open SWE #4834](https://github.com/langchain-ai/open-swe/pull/4834): Monitor 이벤트에 더 이상 필요 없는 Monitor를 종료하도록 Model에 Prompt. **실제 종료 강제는 아닌 Reminder**이므로 Durable Monitor Lease/Task Finalizer가 별도 필요. **평가: 아이디어 참고.**

## 14. 후속 보완 조사: 10/28 공식 모델 라우팅·Memory File 보안 실험

> 다음 두 항목은 **오늘 병합 건이 아닌 2026-10-28 공개 자료**다. 기존 10/30·10/31 Scout에 동일 주제의 분석이 없어서 이번에 보완 수록한다. 11/01 신규 릴리스라고 표현하지 않는다.

### GitHub Copilot Fusion — 실제 발표된 Single/Cascade/Critique 라우팅

[GitHub 공식 10/28 Changelog](https://github.blog/changelog/2026-10-28-route-and-orchestrate-models-with-github-copilot-fusion/)는 Fusion GA와 **Single(단일 모델) / Cascade(저비용 Draft→Quality Judge→필요 시 Escalate) / Critique(Draft→Read-only Critic→필요 시 Revision)** 3개 Workflow를 공개했다. Standard/High/Max Effort 및 Enterprise Allowed Model 정책을 결합한다.

**벤더 보고 수치:** Artificial Analysis Coding Agent Index에서 Fusion Max 60점, Claude Code Opus 5.5 Max 대비 약 **절반의 평균 API 비용·토큰**, 작업 시간 약 **40% 감소**. 같은 모델·Task 난이도·캐시·API 단가가 일치하도록 사용자가 직접 재현한 값이 아니며, Github의 자체 발표로 분류한다. **여러 Model을 쓰면 반드시 저렴하다**는 일반론으로 확대할 수 없다. 요금은 Fusion이 사용한 **각 모델의 표준 단가**를 합산하며 한시적 할인 30%는 실제 기술 절감률과 분리해야 한다.

[동일 10/28 Local Model 발표](https://github.blog/changelog/2026-10-28-github-copilot-fusion-now-supports-selection-of-local-models/)에 따르면 Windows ML 또는 구성된 로컬 서버의 모델과 Cloud를 **Experimental Opt-in**으로 라우팅할 수 있다. 지원 환경과 Model Eligibility를 확인해야 하며, **라우팅 판단은 Cloud에서 하므로 완전 오프라인은 아니다**. 자사 P4 사내 Code/Policy가 외부 Cloud로 나갈 수 있는지 보안 승인 필요.

**P4/Claude/Codex PoC:** 50개 Task에서 A=고성능 단일 모델, B=저비용 Draft + Static Check + 필요 시 Strong Reviewer, C=모델 Critique를 비교. Actual API Bill(Discount 분리), Verified Result, Security Finding, Retry Cost, p95 Latency로 검증. **평가: PoC.**

### 연구: Security Impact of Coding Agent's Memory Files

[arXiv:2610.38521, 2026-10-28](https://arxiv.org/abs/2610.38521). 12 CWE 클래스, 36 SecRepoBench Task에 두 변형의 악성 Project Memory Instruction을 넣고 Claude Code(Sonnet 5.5), OpenCode(Qwen/DeepSeek)를 비교. Secure Completion Rate 영향은 **−8~+6%p로 방향이 일관되지 않았다**. 즉 모든 Agent가 항상 악화됐다고 주장할 근거는 없다. Claude Code는 약 2/3의 Final Message에서 해당 파일을 언급했지만 OpenCode는 주로 내부 Reasoning에서만 언급했다는 관찰이다.

**실무 의미:** Token 최적화를 위해 Memory/Skill을 압축·캐시할수록 **출처 신뢰·권한·수정 이력**이 별도로 필요하다. PR에서 바뀐 CLAUDE.md/AGENTS.md/Skill File을 Trusted System Prompt로 승격하지 말 것. P4 Submit/Gateway Hook은 파일 출처와 Policy Revision을 검사하고 변경 전후 Diff를 Reviewer에게 별도 제공. 논문의 효과는 이 실험 조건에 한정된다. **평가: 바로 적용 보안 원칙.**

## 15. 기존 항목과 분류 — 이번 보고서에서 반복하지 않은 내용

- 10/31 [전일 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-31.md)의 Open SWE Workspace Cached Memory #4815, Codex Deferred Tool World State #58410, Guardian Whole-entry #58388, OpenCode Schedule Leader #60478, Cost Usage #60475는 오늘 신규 성과가 아님.
- 10/30 [이전 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-30.md)의 Open SWE Backend ToolSet Digest #4697, Cross-thread Prefix #4762, Codex Host Output Truncation #58125 등은 별도 재인용만 했다.
- OpenCode [v2.2.5](https://github.com/anomalyco/opencode/releases/tag/v2.2.5)는 **10/30 23:17 UTC 공식 배포**가 확인됐다. 주요 Percentage Compaction Buffer #60647은 **10/31 Scout에 이미 분석**돼 신규 최적화 실험으로 세지 않았다. 후속 10/31 Main PR 모두 v2.2.5에 포함됐다고 주장하지 않는다.
- Claude Code v2.1.316은 릴리스로 확인, Codex #58454·OpenCode #60733 등은 **Main 병합** 확인이다. 해당 PR이 이미 일반 사용자 Stable Release에 포함됐다고 일괄 단정하지 않는다.
- 새 **RAG Retrieval Recall Benchmark, Prompt/Skill 경량화의 전후 Model Token 비용, Compaction Quality A/B, Cache TTL별 신규 Provider Bill**은 이번 조회 구간에서 독립적으로 확인되지 않았다. Related Code Path가 없는데 추측 수치를 생성하지 않는다.

## 16. Perforce·UE5·Windows·Claude Code·Codex Harness: 제안 아키텍처

> **아래는 업스트림 여러 구현에서 추출한 원칙을 적용한 제안 아키텍처**이며 특정 저장소에 그대로 구현된 구조는 아니다.

    Task Intake / Workspace+P4 Revision+Policy Snapshot
        │
        ├── Shared Discovery Cache (key: org/user/connection/policy)
        │     ├── MCP Catalog → minimal schema → lazy call validation
        │     ├── Skill/Instruction Hash → deterministic tool order
        │     └── Prompt Prefix (immutable) + Task Context Delta
        │
        └── Durable Task Ledger
              ├── Task/Attempt/Child Edge + Lifecycle State
              ├── Inbox + Event/Approval/Cost Receipt
              ├── Runtime Adapter (Claude Code / Codex / Read-only Worker)
              │     ├── Stage-specific Model Effort / Budget
              │     ├── Tool Barrier → P4 Read → Edit → Build
              │     └── Guardian Evidence Budget → Verify / Approve
              ├── Evidence Store (P4 CL, full diff, TeamCity log, SHA256)
              └── Remote Reconcile (actual P4 submit/build state) → Delivery

**불변조건:** P4 Submit/Changelist 변경은 별도 권한 Gate; Tool Catalog 공개와 실제 실행 승인 분리. Model-generated Summary·Link와 원본 Evidence는 분리. Worker 교체는 Backend 준비 성공 뒤에만. Task Success/Trace Complete/Delivery Complete은 서로 다른 State. 원격 효과를 낸 Tool은 재실행 전에 P4/TeamCity에서 상태 확인. Logging/RAG Scope는 (org,user,workspace,depot,task,policy_version)으로 제한.

### PoC A — MCP Lazy Validator + Stable Prefix + Cached Discovery

**구성:** 150/500개 Tool 정의, 1/10/30개 Worker, 50개 P4 Read/Review/Build Simulation Task. 같은 Request Prefix, Tool Order, Skill Content를 유지. A=SDK 전량 검사 + Location별 Discovery + Record Tool, B=선택 검사 + Scoped SharedCache + Tool Array.

**기록:** RPC Request Count, MCP list/call CPU, Heap/RSS, Model input/output/cache-read/cache-write tokens, Prompt Prefix Hash, Tool Recall@1, Task Success, Retry, 실제 Provider Bill. **제안 합격선:** 필수 Tool 누락 0, 잘못된 권한 부여 0, 품질 하락 ≤2%p, CPU/HTTP 30% 이상 감소 또는 verified task당 비용 10% 이상 감소. 비용 개선은 독립 지표로만 판정한다.

### PoC B — Guardian Context Elastic vs Fixed와 Evidence Completeness

**구성:** 1KB/1MB/100MB TeamCity 로그 + P4 Diff 각 30건. A=Fixed, B=Entry Cap+Elastic, C=B+Error Span Extract/Artifact URI. 모든 경우 Planned Action JSON, Revision, Approval, Source Hash 100% 보존. **측정:** Reviewer Approval Accuracy, Missing Evidence, Prompt Overflow, Token/Verified Review, p95 Latency. **통과:** Unauthorized Approval 0, Critical Error Evidence 누락 0, Task Quality ≥Baseline. Token 감소만으로 성공 판정하지 않는다.

### PoC C — Durable Inbox·Cross-backend Handoff·No-model Polling

**구성:** P4 Workspace 삭제/경로 변경, Backend Disconnect, Worker Kill, Completion 직전 Network Fail, Repeat Event를 주입한 100회 Fault Test. Durable Inbox Write는 Sandbox 없이 수락하고, 재개 시 Policy/CL Revision 재검증. Tool Receipt 없이 실행 여부 불확실한 P4 Submit은 Remote Reconcile 이후 판단.

**측정/합격:** Child Orphan 0, Duplicate Submit/Build 0, Lost Inbox 0, Late Response Wrong Session 0, Trace vs Action Evidence Misclassification 0, Cross-tenant Cache/RAG Leakage 0. Latency·Model Bill은 별도 보조 KPI.

### PoC D — Model/Reasoning Effort Routing 및 실제 청구액 검증

**구성:** Claude Code 2.1.316 Subagent Effort=Low/Medium/High, Codex Strong/Light Reviewer, Fusion 유사 Cascade/Critique의 실험군을 같은 50개 Task에 3회 반복. 모델/Provider, 컨텍스트, Prompt Cache TTL, Confidence/Verifier Strength는 기록. 토큰 사용량 = provider가 반환한 **입력·출력·추론·cache-read·cache-write**를 구분해 합산; **USD는 해당 Provider 단가·할인·재시도와 미완료 Turn까지 반영**. 단순 Token×단일 단가 금지.

**비용 지표:** Total Provider Charge / Number of Verified Successful Tasks. 비교군은 실패 재실행·Reviewer Cost를 모두 포함. 조직 Budget Limit 준수 및 Model Routing 정책 위반 0도 확인한다.

## 17. 확인 한계와 다음 추적 항목

1. 오늘 실제 Model Token/Provider Bill 절감이 재현된 Upstream A/B는 없음. OpenCode MCP Benchmark·SharedCache는 **CPU/Heap/HTTP 요청**, GitHub Fusion 수치는 **벤더 발표 benchmark**로 출처를 구분했다.
2. Codex Guardian Elastic은 **기본 비활성(Fixed가 기본)**. 실제 Production Reviewer의 False Negative·Context Quality 결과가 필요하다.
3. OpenCode SDK Patch 기반 Lazy Validation과 Schema Identity WeakMap은 SDK/Effect 버전 업그레이드 시 회귀 위험이 있다.
4. Open SWE Short Link는 길이가 짧아도 인증 없는 Bearer Redirect로 운영된다. Enterprise P4 Evidence에는 동일 접근 모델을 그대로 복제하지 않는다.
5. 오늘 공개된 Open SWE 메모리 강화는 Prompt-only, Deep Agents QuickJS 무기한 실행은 운영상 위험. 새 Token 최적화 효과라고 과장하지 않는다.
6. Windows PowerShell Hook 실패 차단, Cla​ude Gateway Policy Layering, Runtime Swap Ownership, Cross-Workspace Memory File Trust는 보안·정합성 테스트 우선 대상.
7. 다음 Scout는 #60733 Lazy Validation의 Tool Success/Schema Compatibility, #60082 TTL Staleness, #58454 Guardian Elastic 기본 전환 여부, Claude Code 2.1.316의 Subagent Effort 비용, 10/28 Fusion 벤치 재현 자료를 확인한다.

**최종 판단:** **바로 적용 원칙**은 (1) Subagent Effort·Group Budget/Policy 검증, (2) Stable Tool Order·No-op Instruction Update, (3) Durable Inbox·Trace vs Action 구분, (4) Windows Hook Fail-closed. **PoC 우선순위**는 (1) MCP Lazy Validator + SharedCache, (2) Guardian Evidence Budget, (3) Runtime Cross-backend Handoff, (4) Cascade/Reviewer Model Routing이다.

## 18. 원본 참고 자료

- [Claude Code v2.1.316 릴리스](https://github.com/anthropics/claude-code/releases/tag/v2.1.316)
- [OpenCode #60733 MCP Selective Validation](https://github.com/anomalyco/opencode/pull/60733), [#60082 Shared Provider Cache](https://github.com/anomalyco/opencode/pull/60082), [#60811 Stable Tool Order](https://github.com/anomalyco/opencode/pull/60811), [#60918 Instruction Reorder](https://github.com/anomalyco/opencode/pull/60918)
- [Codex #58444 Evidence Cap](https://github.com/openai/codex/pull/58444), [#58454 Elastic Context](https://github.com/openai/codex/pull/58454), [#58456 Incomplete Trace](https://github.com/openai/codex/pull/58456), [#58457 Cross-backend Session](https://github.com/openai/codex/pull/58457)
- [OpenCode #60801 Durable Inbox](https://github.com/anomalyco/opencode/pull/60801), [#60490 MCP First-turn Barrier](https://github.com/anomalyco/opencode/pull/60490), [#60800 Schema Codec Cache](https://github.com/anomalyco/opencode/pull/60800), [#60803 Config Discovery](https://github.com/anomalyco/opencode/pull/60803)
- [Open SWE #4651 Artifact Short Link](https://github.com/langchain-ai/open-swe/pull/4651), [#4840 Review Event Log](https://github.com/langchain-ai/open-swe/pull/4840), [#4857 Verified Memory Prompt](https://github.com/langchain-ai/open-swe/pull/4857), [#4859 Snapshot Timeout](https://github.com/langchain-ai/open-swe/pull/4859)
- [Gemini CLI #30059 Model Fallback](https://github.com/google-gemini/gemini-cli/pull/30059), [Deep Agents #6958 QuickJS Timeout](https://github.com/langchain-ai/deepagents/pull/6958), [#7439 DeepSeek Effort](https://github.com/langchain-ai/deepagents/pull/7439)
- [GitHub Copilot Fusion 공식 10/28 발표](https://github.blog/changelog/2026-10-28-route-and-orchestrate-models-with-github-copilot-fusion/), [Local Model Routing 공식 발표](https://github.blog/changelog/2026-10-28-github-copilot-fusion-now-supports-selection-of-local-models/)
- [Security Impact of Coding Agent's Memory Files — arXiv 2610.38521](https://arxiv.org/abs/2610.38521)
