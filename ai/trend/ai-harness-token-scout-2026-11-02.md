---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-02"
date: 2026-11-02
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, prompt-cache, compaction, skills, hooks, selective-context, model-routing, durable-state, runtime-adapter, session-handoff, tool-output, telemetry, evidence-verification, task-lifecycle, perforce, claude-code, codex]
source:
  - https://github.com/anomalyco/opencode/pull/61015
  - https://github.com/anomalyco/opencode/pull/60969
  - https://github.com/anomalyco/opencode/pull/60025
  - https://github.com/anomalyco/opencode/pull/60921
  - https://github.com/anomalyco/opencode/pull/60401
  - https://github.com/anomalyco/opencode/pull/60974
  - https://github.com/anomalyco/opencode/pull/60812
  - https://github.com/anomalyco/opencode/pull/61005
  - https://github.com/anomalyco/opencode/pull/60879
  - https://github.com/anomalyco/opencode/pull/60808
  - https://github.com/langchain-ai/open-swe/pull/4877
  - https://github.com/langchain-ai/open-swe/pull/4886
  - https://github.com/langchain-ai/open-swe/pull/4838
  - https://github.com/langchain-ai/open-swe/pull/4852
  - https://github.com/langchain-ai/open-swe/pull/4876
  - https://github.com/openai/codex/pull/58751
updated: 2026-11-02
---

# AI Harness · Context/Token Optimization Scout — 2026-11-02

> **조사 시각:** 2026-11-02 06:04 KST(= 2026-11-01 21:04 UTC). 비교 기준은 [11/01](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-01.md), [10/31](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-31.md) Scout다. 주요 GitHub 기본 브랜치 commit 및 PR merged_at 기준 관찰 구간은 **2026-10-31 21:04~2026-11-01 21:04 UTC**다. GitHub 원본 PR 본문, 실제 변경 파일·테스트 패치, 공식 release API와 기존 Wiki를 대조했다. 조사자가 유료 LLM·Perforce로 독립 재현한 수치는 없다.

## 0. 결론: 오늘의 변화

이번 관찰 구간에는 **실제로 새로 병합된 구현이 있다.** 가장 직접적인 낭비 제거는 OpenCode의 **overflow 후 동일 거절 요청 재전송 방지**이고, 가장 실험 가치가 큰 비용 정책은 **모델별 cache TTL에 맞춘 warming**이다. 그 외에 **Diskless Skill Registry와 Workspace Library**, **Turn 단위 Observability/정확한 Usage Ledger**, **개인 Memory에서 Shared Curator로 승격하는 Context 격리**, **Claude Code–Open SWE의 단회성 권한 인계**, **복구 가능한 Merge Queue**, **Codex의 live/persisted History 분리**를 확인했다.

**엄격한 결과 구분:** 오늘 변경에서 **품질이 동일한 검증 작업당 LLM 실제 입력 토큰 절감률 또는 Provider 청구액 절감률이 독립 검증된 사례는 0건**이다. 아래 숫자는 PR 작성자의 회귀 테스트, 변경 *전* 관측값, 구성 파라미터 및 재현 테스트 결과다. CPU/메모리/Telemetry 저장량 감소를 LLM token 절감이라고 표기하지 않는다.

### 신규성·우선순위 요약

| 변경 | 실제로 바뀐 구조 | 정량 근거와 제한 | Perforce Harness 평가 |
|---|---|---|---|
| [OpenCode #61015](https://github.com/anomalyco/opencode/pull/61015) | Overflow 직후 첫 compaction이 축약된 text transcript로 시작 | 불필요한 거절 왕복 1회를 피하는 재현 테스트; 실제 USD 미측정 | **바로 적용 원칙 + PoC** |
| [OpenCode #60969/#60025](https://github.com/anomalyco/opencode/pull/60969) | Cache TTL의 90%로 warming 간격 산출, provider/model별 override | 5m TTL→4.5m ping, 과금 절감 실측 없음 | **PoC 최우선** |
| [OpenCode #60921/#60401](https://github.com/anomalyco/opencode/pull/60401) | Memory-backed skill://, Console Workspace Library의 비동기 Skill 설치 | 작성자 520+450+34개 관련 테스트, Console 870 tests | **PoC 최우선** |
| [OpenCode #60974](https://github.com/anomalyco/opencode/pull/60974) | Request/Turn 독립 Trace, Tool/Model/Usage span 계측 | 기존 650만 span의 97%가 상위 두 Trace에 집중; 사후 비용 미측정 | **바로 적용 원칙** |
| [OpenCode #60812/#61005](https://github.com/anomalyco/opencode/pull/60812) | Step와 Loop 완료를 분리, Usage 총합과 마지막 Context 기록 | ai 패키지 2,004 tests; 변경은 계측 정합성 | **바로 적용 원칙** |
| [Open SWE #4877](https://github.com/langchain-ai/open-swe/pull/4877) | 개인 Memory 우선 → Curator가 일반 규칙만 재작성 | shared-context leakage 방지 구조, 절감량 미측정 | **PoC 최우선** |
| [Open SWE #4886](https://github.com/langchain-ai/open-swe/pull/4886) | Claude Code Hook Connection을 5분 1회 Claim으로 인계 | 재사용 409, 원본 Long-lived Token을 모델에 비노출 | **PoC** |
| [Open SWE #4838](https://github.com/langchain-ai/open-swe/pull/4838) | Merge Queue recovering/cancelled + ACK 영속화 | 재시작·응답 유실·교체 시나리오 테스트, 시간/비용 미측정 | **바로 적용 원칙** |
| [Codex #58751](https://github.com/openai/codex/pull/58751) | Live paginated History에서 과거 Assistant Text 제거/Resume 시 복원 | 메모리/페이징 최적화, LLM Context Token 직접 감소 아님 | **PoC** |
| [Open SWE #4852](https://github.com/langchain-ai/open-swe/pull/4852) | Implementer가 자신의 Checkout에서 PR Walkthrough 생성 | 기본 OFF, 추가 모델 작업 가능; 비용 미측정 | **PoC** |
| [OpenCode #60879/#60808](https://github.com/anomalyco/opencode/pull/60879) | Claude Plan Limit 이벤트와 Retry 분류를 정형 Telemetry로 노출 | 81 tests 및 작성자 사용량 비교; Provider Bill 아님 | **바로 적용 원칙** |
| [OpenCode #61067/#61069](https://github.com/anomalyco/opencode/pull/61067) | Claude Adapter에서 무신고 모델 전환·무응답 fallback 차단 | Fake Provider 재현, 성공률/토큰 미측정 | **PoC** |

### 10/31·11/01과 중복 제거

- 11/01의 [Open SWE #4815](https://github.com/langchain-ai/open-swe/pull/4815) Workspace Memory/Cache 소개 자체는 다시 기록하지 않았다. 오늘 #4877은 **개인 Memory의 출처와 Curator의 일반화·대체 상태가 바뀐 후속 설계**이므로 별도 기록한다.
- 전일 [OpenCode #60811](https://github.com/anomalyco/opencode/pull/60811)의 Tool Catalog 순서 안정화와 오늘 #60921의 **가상 Skill 파일 시스템**은 다른 구현 계층이다.
- 10/30의 [Open SWE #4575](https://github.com/langchain-ai/open-swe/pull/4575) Durable Outbox와 오늘 #4838의 **기존 Check Run 취소·Recovery ACK 보존**도 다른 문제다.
- Claude Code 신규 정식 릴리스는 조사 시점 **v2.1.316(10/31 UTC)**가 최신이고 11/01 Scout에 이미 반영됨. Codex 안정판 최신 **0.166.0(10/29 UTC)**, 0.167.0-alpha.2는 **11/01 19:00 UTC 프리릴리스**다. OpenCode 정식 최신 **v2.2.5(10/30 23:17 UTC)**. 오늘 GitHub main/dev 병합 변경을 위 정식 바이너리에 포함됐다고 주장하지 않는다.
- Deep Agents는 관찰 구간 [#7486 OpenWiki 문서 수정](https://github.com/langchain-ai/deepagents/pull/7486) 외에 관련 새로운 기본 브랜치 구현을 확인하지 못했다. Microsoft Agent Framework, Gemini CLI, OpenAI Agents Python도 해당 기간에 조사 대상 기본 브랜치 신규 커밋이 확인되지 않았다.

## 1. OpenCode #61015 — 거절된 전체 Context를 다시 보내지 않는 Overflow Compaction

**원본:** [PR #61015](https://github.com/anomalyco/opencode/pull/61015) (2026-11-01 05:03 UTC 병합), packages/core/src/session/compaction.ts와 test/session-runner.test.ts.

**해결 문제:** Provider가 전체 conversation+tools를 Prompt Too Long으로 거절한 뒤에도, 과거 축약 로직은 **문자 수 기반 추정치가 Provider Token Count보다 작으면** 같은 Conversation에 Summary Prompt만 추가해 첫 압축 호출을 시도했다. 거절된 입력이 거의 그대로 재전송되므로 두 번째 요청도 거절될 가능성이 매우 높고, 압축을 위한 추가 RTT·오류 비용을 만든다.

**확인된 실행 흐름:**

    Provider가 full request 거절
       -> Compaction trigger.reason == overflow
       -> shrink.text = true
       -> 최초 compaction부터 tools를 제거한 text transcript 사용
       -> 요약 생성
       -> 축약 Context로 본 작업 재개

반면 **수동/예방 Compaction**은 기존 Prompt와 Cache Prefix를 우선 재사용하며 이 패치의 text-first 처리가 강제되지 않는다. 테스트에서는 Provider는 60k 토큰으로 세고 문자 추정은 작게 보는 입력을 만들어, 재시도 Request의 tool 목록이 비어 있고 메시지가 User Text Transcript 위주인지 검증한다.

**절감 원리/한계:** 실재 거절을 경험한 뒤 동일 Request를 재송신하는 *한 차례의 무의미한 모델 왕복*을 제거한다. **절감률/Provider 청구금액은 미측정**이고 거절 요청의 과금 방식은 Provider마다 다르다. Text-only Summary는 Tool Input/Output의 구조화 Evidence를 잃을 수 있으므로 원본 Tool Trace는 외부 보존해야 한다.

**P4/UE5 구현:** TeamCity 100MB 로그/대용량 Blueprint 메타데이터가 섞인 테스트에서 Provider Overflow를 감지하면 첫 compaction은 Error Span, CL, Source URI, Revision Hash, 사람 결정을 유지한 텍스트 Evidence로 구성한다. 실제 CL 수치와 파일 Revision은 Checkpoint Ledger에서 별도 복구. 30회 Overflow/비Overflow A/B에서 **identical rejected retry=0**, Error Root Cause Recall 저하 없음, Provider input/cache-write/read, verified-task 비용을 측정. **평가: 바로 적용 원칙; 실제 효과 PoC.**

## 2. OpenCode #60969 + #60025 — TTL/Provider/Model 단위 Prompt Cache Warming

**원본:** [#60969](https://github.com/anomalyco/opencode/pull/60969)(10/31 22:26 UTC), [#60025](https://github.com/anomalyco/opencode/pull/60025)(11/01 02:05 UTC); packages/core/src/plugin/warming.ts, packages/schema/src/provider.ts 및 services/www/src/docs/content/warming.mdx.

**신규성:** 기존 고정 4분 Keep-alive가 1시간 TTL에서도 너무 자주 발생하거나 Cache가 없는 Local Model에 불필요하게 전송됐다. 이제 warming.interval=auto는 **설정된 해당 모델 cache.ttl의 90%** 간격으로 실행하고 TTL이 없는 모델은 건너뛴다. warming 설정은 **모델 settings.cache.warming → Provider settings.cache.warming → 최상위 warming** 순으로 선택하며 Subagent는 계속 warming하지 않는다. 잘못된 duration 등은 경고 또는 상위 설정 fallback 처리한다. 현재 모델 기본 TTL을 자동 발견하는 기능이라고 오인하면 안 된다. 명시된 cache.ttl을 기준으로 한다.

    warming: { interval: "auto", duration: "2 hours" }
    providers:
      anthropic:
        settings:
          cache: { ttl: "1h", warming: { duration: "2 hours" } }
        models:
          some-low-cost-model:
            settings: { cache: { warming: false } }

**원리:** 5분 TTL이면 4.5분마다, 1시간 TTL이면 약 54분마다 Cache를 따뜻하게 유지하는 정책이다. 동일 Prefix가 다음 모델 요청에도 재사용될 가능성을 높이지만 **Keep-alive 자체가 모델 호출**이므로 무조건 싸지지 않는다. Cache Write/Read 할인, idle 분포, 요청 최소요금, Provider affinity, TTL 유효성에 따라 *오히려 비싸질 수 있다*. duration은 interval보다 길어야 하고, 모델/정책 변경 후 이전 Prefix를 살려두면 개인정보·지침 만료 정책에 어긋날 수 있다.

**Perforce·Enterprise PoC:** Claude/Codex Worker의 세션 유형을 Interactive, CI-watch, Batch, Local로 나누고 워밍 OFF/고정 4m/0.9×TTL을 비교한다. Idle 2/10/30/60분, 공통 Prefix 4k/24k 토큰, cache 5m/1h, 작업 성공률/실제 Provider 청구액을 기록한다. cached_input, cache_creation, keepalive_bill, saved_startup_latency를 모두 포함해 **verified-task USD**를 계산하며 Session 종료/Permission Revocation 시 warming 취소. **평가: PoC 최우선; 운영 전 비용 실측 필수.**

## 3. OpenCode #60921 + #60401 — Diskless Skill Files와 Workspace Library

**원본:** [#60921](https://github.com/anomalyco/opencode/pull/60921)(11/01 06:07 UTC), [#60401](https://github.com/anomalyco/opencode/pull/60401)(16:33 UTC). Skill.Service, Skill.prepare, ReadTool, plugin/provider/opencode.ts 및 샘플 Skill 테스트 확인.

**구조:** 기존 Memory-based Builtin Skill은 가짜 /builtin/*.md 경로를 썼고 ReadTool이 여러 보조 파일을 읽으려면 Disk Cache가 필요했다. 새로운 가상 경로 **skill://<id>/SKILL.md**와 Skill.Service의 editor.add(skill, files)/skills.files(id), Environment.makeMemoryDriver를 통해 보조 파일·디렉터리를 Memory Driver에서 직접 읽을 수 있다. **ReadTool은 virtual path도 skill+read Permission을 먼저 검사**한다. Disk Skill은 기존 Filesystem Path로 유지한다.

Console Workspace Config가 공급하는 library.instructions는 **전역 AGENTS.md 앞쪽** 지침으로 전달되고, library.skills의 slug/version은 별도 API에서 **SKILL.md 우선**으로 비동기 다운로드된다. 이전 구성은 새 구성이 준비될 때까지 유지하되, 계정/Workspace가 바뀌면 기존 Source의 Skill은 바로 숨겨진다. Unsafe Path, Redirect, SKILL.md 누락, 다운로드 실패는 해당 Skill만 skip. integration.use=deny 또는 skill.use=deny를 집행하며 인증 포함 Request는 Redirect를 허용하지 않는다. **Bundle 캐시/다운로드 재시도, 스크립트 Disk 실행은 이번 변경 범위 밖**.

**근거:** #60921에서 작성자 520 Skill/Read Tests + Browser 450 + GUI 34 + 반복 E2E 10 통과, #60401에서 Console 관련 870 tests 통과를 보고했다. 이 수치는 Tool Schema를 모델에 미노출한 토큰 절감 측정이 아니다.

**절감/대가:** 필요한 Skill만 실제 Read하므로 모든 Skill 본문을 사전 주입하는 설계에 비해 *점진적 공개를 구현할 수 있는 인프라*가 된다. 단, 이 PR 자체로 모델 Prompt의 Skill 목록이 얼마나 줄었는지 보고되지 않았고, 매번 Read하면 모델 토큰은 여전히 소비된다. In-memory bundle의 버전·서명·무결성·TTL·Trust Boundary 관리가 중요하다.

**P4 PoC:** Depot/Role별 200개 Skill Manifest만 짧게 노출하고 실행 단계에서 필요한 1~3개를 skill:// 기반으로 선택 Read한다. 서명된 Skill Digest, Workspace/Org ACL, version pin, 일시적 다운로드 실패 fallback을 구현한다. Windows + Offline Worker에서 API 동작과 경로 안전성, Prompt Token, Startup p95, Skill 선택 Recall@k, Cross-workspace leakage 0을 검증한다. **평가: PoC 최우선(Windows Skill Distribution 설계 참고).**

## 4. OpenCode #60974 — Session·Turn·Tool·Model 단위 Distributed Trace와 비용 계측

**원본:** [#60974](https://github.com/anomalyco/opencode/pull/60974)(10/31 22:38 UTC), packages/core/src/session/runner/llm.ts, telemetry spans, request tracing/replay tests.

**이전:** 서버 시작 시 생성된 Root Span 아래 모든 Request/Model/Tool 실행이 누적되어 한 서버의 일일 **650만 Span 중 97%가 가장 큰 두 개 Trace에 포함**되었다고 PR이 보고한다. Tool 70,193개 Span 중 Attribute가 있는 것은 504개. 30분 25만 Span 가운데 약 3.9만(16%)은 단순 Plumbing Span이었다. **모두 패치 전 관측/작성자 분석이며, 사후 운영비 측정은 아니다.**

**변경:** 각 HTTP Request와 SessionRunner.drain(한 Turn)을 각각 Root Trace로 시작하고, 내부 Tool Span에 session.id, tool.name, call.id를, Model Span에는 provider/model, input/output/cache-read tokens, TTFO, 종료 사유, 오류 정보를 붙인다. Event Publishing/Path Resolution/Credential Listing의 고빈도 Span을 줄인다. 테스트는 더 이상 Server Boot Span을 모든 Request가 공유하지 않으며 Turn Span의 session.id 누락이 없는지 검사한다. 작성자 Targeted 413 tests 통과.

**절감/위험:** Observability Export Cardinality/Storage를 낮추고 비용 귀속과 장애 추적을 가능하게 하지만, **LLM Prompt를 직접 줄이지 않는다**. Session ID를 Trace에 포함할 때 사용자 정보/Code Path/Tool Args 노출 방지, PII Redaction, Retention, Sampling 정책이 필요하다.

**P4:** Task→Attempt→Turn→Tool/Model→Artifact Evidence 관계를 Trace와 별도 Durable Ledger로 이중 관리. Trace는 샘플링 가능하지만 Approval/Submit/Cost Receipt는 샘플링 금지. Request별 cache-write/read/reasoning/uncached usage + P4 CL/TeamCity Build ID를 상관 연결. OTel Trace Export p95, 누락 Usage 0, Customer Path Leakage 0을 확인. **평가: 바로 적용 원칙.**

## 5. OpenCode #60812 + #61005 — Stream Completion과 정확한 Usage Receipt

**원본:** [#60812](https://github.com/anomalyco/opencode/pull/60812)(11/01 03:52 UTC), [#61005](https://github.com/anomalyco/opencode/pull/61005)(05:50 UTC), packages/ai/src/{llm.ts,loop.ts,tool-runtime.ts}, packages/core/src/session/runner/{step,publish-llm-event}.ts.

**동작 변경:** 과거 Loop가 각 Step마다 finish를 방출해 실제 Task 종료와 Model Step 종료가 모호했다. 이제 개별 호출은 step-finish, 전체 ai.loop 종료에서 **finish 단 1회**를 내보낸다. 전체 Usage의 input/output token과 cost는 단계별 합산, **contextTokens는 마지막 단계의 Window 상태**로 기록한다(누적값이 아님). 실패 Tool 이벤트 tool-error + tool-result(error) 중복을 없애고 한 개 tool-result만 보존한다. Provider 오류는 도달하지 않는 provider-error 이벤트 대신 분류된 AIError/실패 Stream으로 처리한다. 중간 Stream 실패 시 AIError.partial을 Attach하도록 Stream/Loop Fold를 공통화했다. Tool Runner는 여러 Tool을 병렬 실행하되 결과는 원래 Call 순서를 유지한다.

**검증:** #60812 작성자 packages/ai **2,004 tests pass**, #61005 작성자 22개 기록된 Tool-Loop Cassette 재생 결과가 기존과 동일. #60812는 이벤트 타입 제거 때문에 **이 이벤트들을 구독한 외부 Plugin에는 Breaking Change**가 될 수 있다.

**토큰 절약 여부:** 요청 횟수 자체를 줄이기보다는, Double-count/Under-count에 의한 비용 오판 및 조기/지연 Compaction을 방지할 기반이다. Failure Partial을 그대로 User-visible History에 넣으면 중복/비밀 노출 위험이 있으므로 Error Receipt와 Model Context의 구분이 필요하다.

**P4:** Step Receipt(단계별), Turn Receipt(총합), Session Receipt(최종 정산)를 분리. 마지막 Context Window Token은 Sum하지 않는다. ToolError는 call-id별 정확히 한 번 확정하고 ToolResult 원문은 Artifact URI/Hash로 보존. 100개 Partial Stream/429/Length/Tool Failure/Resume 시나리오에서 Amount Reconciliation 오차 0, duplicate tool event 0을 목표. **평가: 바로 적용 원칙.**

## 6. OpenCode #60879 + #60808 — 모델 사용 한도 및 Retry 정책을 구조화

**원본:** [#60879](https://github.com/anomalyco/opencode/pull/60879)(11/01 16:04 UTC), [#60808](https://github.com/anomalyco/opencode/pull/60808)(17:04 UTC).

Claude Agent Adapter는 Claude Code의 **rate_limit_event**를 이전에는 오류 메시지 작성에만 사용했다. 이제 해당 이벤트를 수신한 Step의 finish Provider Metadata에 그대로 넣어 session.step.ended의 native.rateLimit으로 내보낸다. five_hour, seven_day 사용량·Reset 시각·상태가 해당 Step에만 들어가고 **다음 Step에서 값이 없다는 것은 새 보고가 없다는 뜻**이다. 작성자는 관련 81개 테스트 및 실계정 1개 비교에서 5시간 창/Reset은 일치, 주간 사용량은 1%p 안팎 차이였다고 보고한다. 이는 **Subscription utilization 정보**이지 모델별 USD 비용이 아니다.

AIError의 status, code, isRetryable, retryAfterMs getter도 공개되어 Provider 응답 본문 또는 Transport Code를 반복 Parsing하지 않고 오류의 유형·대기 시간을 이용할 수 있다. 새 모델을 비싸게 재실행하기 전에 **RateLimit/Quota/Provider Internal/Context Overflow**를 분리하는 데 도움이 된다.

**P4:** Claude Code/Codex Adapter에서 Rate Limit Reset, Retry-after, Provider Bill, Enterprise Quota를 **서로 다른 필드**로 추적한다. Pending Build가 끝나도 모델 예산이 없으면 Worker 대신 Durable Queue에 남기고 해당 Reset 이후 재개. 429/403/500/Length/Overflow 오류의 잘못된 fallback 0을 검증. **평가: 바로 적용 원칙.**

## 7. OpenCode #61067/#61069 — Claude Agent Adapter의 모델 정합성 및 실패 격리

**원본:** [#61067](https://github.com/anomalyco/opencode/pull/61067)(11/01 15:14 UTC), [#61069](https://github.com/anomalyco/opencode/pull/61069)(15:44 UTC).

Claude Code SDK가 연속 Streaming 장애 시 Non-streaming Fallback으로 전환하면 OpenCode Parser는 최종 Tool Call 뒤 Message Stop을 못 받아 Session이 멈췄다. **CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK=1**로 기존에 검증되지 않은 Reply Shape를 막는다. 또한 Safety Refusal 때 Claude Code가 낮은/다른 모델로 전환했지만 OpenCode UI/Cost Meter는 원래 선택 모델만 표시하는 오류를 **CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK=1**로 막는다. 거절 시 같은 모델에서 제한된 재시도 후 오류로 끝낸다. 작성자가 **Claude Code 2.1.316 + 가짜 Provider**로 Stream 단절 및 Safety Flag를 재현했다.

**이점:** 설정과 실제 Model Executor의 불일치로 생기는 숨겨진 비용·품질 왜곡 방지, 실패한 Tool Call이 영원히 Pending 상태가 되는 문제 감소. **Trade-off:** Fallback을 차단하면 가용성/성공률이 낮아질 수 있다. Enterprise Harness는 무조건 fallback OFF가 아니라 **Provider 응답의 actual_model_id를 검증하고 안전한 승인된 대체 모델만 사용**하는 경로가 바람직하다.

**P4 실험:** Claude Code와 Codex 같은 Task에서 Requested/Resolved/Executed Model을 Receipt에 별도로 기록하고, fallback 이벤트·Refusal·Streaming Interrupted를 주입. 다른 모델로 무단 실행 0, hanging tool 0, 비용 정확도 100%, 검증 작업 성공률 저하 관찰. **평가: PoC.**

## 8. Open SWE #4877 — Personal Memory → Curator → Shared Context의 신뢰 경계

**원본:** [#4877](https://github.com/langchain-ai/open-swe/pull/4877)(11/01 17:24 UTC), openswe/memories/{store,curator}.py, openswe/tools/{remember,curator}.py, tests/memories/test_memories.py.

**전일과의 차이:** 11/01 #4815는 Workspace Memory가 Prompt Cache에 재사용되는 큰 구조를 다뤘다. 오늘 후속 #4877은 **누가 저장한 메모리가 누구의 프롬프트를 바꿀 수 있는가**라는 문제를 별도로 해결한다.

**구현:** remember(text)는 더 이상 workspace/personal 선택을 모델에 맡기지 않는다. 모든 새 Memory는 **처음에는 개인 소유**이며 Workspace Curator가 일반화된 지침으로 승격할지 판단한다. Private/Single-writer Thread의 Memory는 해당 Owner에게 바로 적용되지만, 다수 작성자가 있는 Thread에서는 타인의 발언이 즉시 개인 메모리로 침투하지 않도록 먼저 Curator로만 간다. Curator는 제보자의 개인 신원이나 비공개 대화 본문을 읽지 않고, 여러 독립적인 요청을 검토하여 **공통된 규칙을 새로 작성**한다. 새 superseded 상태는 Shared Prompt가 개인 Memory 전체를 커버할 때, 그 Shared Prompt를 실제로 읽는 사람에 한하여 원래 개인 Memory를 Context에서 뺀다. adopted/declined는 원 개인 Memory를 유지한다. 기존 held Memory는 별도 보존한다.

**절감 가설:** 공유 규칙이 개인 규칙을 대체하면 중복 Context 삽입을 줄일 수 있다. 하지만 Prompts의 변화로 품질·Privacy Leakage가 발생할 수 있고 **새로운 Token Savings 수치도 없다.**

**Perforce 설계:** 각 사람의 CLAUDE.md/Workspace Skill 요청을 즉시 조직 정책으로 승격하지 말고 Evidence Provenance(작성자, Owner 범위, Trust Level)를 기록한다. Workspace Curator는 여러 사용자의 검증된 사례만 Shared Instructions에 합치며 정책 hash와 version을 남긴다. RAG Memory의 (organization, depot, owner, task) Scope는 Resume 이후에도 독립 재검증. Cross-user Injection 0, 중복 Prompt Bytes, Compaction 이후 지침 유지율을 A/B. **평가: PoC 최우선(보안 우선).**

## 9. Open SWE #4886 — Claude Code Plugin: 장기 토큰을 모델에 노출하지 않는 Connect/Handoff

**원본:** [#4886](https://github.com/langchain-ai/open-swe/pull/4886)(11/01 19:17 UTC), claude-code-plugin/, openswe/claude_code/{routes,sync_tokens}.py, openswe/tools/connect_claude_code.py, DB migration 0090, Hook 및 Thread Tests.

**실행 구조:**

    Claude Code /open-swe:connect
      -> MCP connect_claude_code(machine_name)
      -> 5분 유효한 1회성 Claim + URL 반환
      -> 로컬 connect.py가 Claim을 HTTPS POST로 교환
      -> 장기 Hook Token이 설정 파일(~/.claude/settings.json, mode 0600)로 직접 저장
      -> Session Hook이 개인 Private Thread에 미러링
      -> /open-swe:thread는 session_id로 본인 Thread만 조회

Claim ID UNIQUE INDEX로 중복 Claim 교환은 409, Token을 모델 답변에 표시하지 않도록 한다. Plugin이 Hook 자체를 배포하는 방식이 아닌 이유는 Claude Code Plugin Hook HTTP Header 설정의 User Variable 제약 때문이다. Mirror Thread는 Owner와 Workspace Admin만 조회한다. **Claim 자체도 단기 Secret이므로 Tool Log/Trace에서 마스킹해야 한다.**

**토큰 절감과 차별성:** 장기 Token을 모델에게 넣을 필요가 없어 Prompt Security/Length를 개선할 수 있지만 실측 Token 절감 없음. 세션을 별도 Thread로 매핑하면 Context Full Copy 없이 Link/Artifact Reference로 Handoff 가능하나 실제 원격 저장/검색 비용은 별도다.

**P4/Windows 적용:** Claude Code·Codex Runtime 연결에 1회 Ticket/Capability Claim, Device Binding, TTL, Atomic Redeem, Revocation을 사용한다. Windows의 설정 경로·ACL(Unix mode 0600과 다름)과 Python3 실행 가정은 별도 Adapter가 필요하다. Perforce Ticket이나 Long-lived Refresh Token은 모델 Context를 통과시키지 않는다. Replay/Expired/Wrong Workspace/Wrong Session 100건, Secret Exposure 0. **평가: PoC.**

## 10. Open SWE #4838 — Merge Queue의 Recovering/Cancelled와 Durable ACK

**원본:** [#4838](https://github.com/langchain-ai/open-swe/pull/4838)(11/01 20:15 UTC), openswe/merge_queue/{dispatch,native,store}.py, tests/merge_queue/test_merge_queue_store.py.

**이전 문제:** Batch Validation이 실패하거나 취소·교체됐을 때 기존 GitHub Check가 무기한 Pending으로 남거나, 복구가 진행 중인데 설명이 없었다. Worker가 재시작한 뒤 기존 Report ACK를 잃으면 같은 상태를 다시 전파해야 한다.

**변경:** Check Report State에 **recovering**, **cancelled**를 추가한다. 선택 Batch가 복구 가능할 때 recovering을 알리고, 더 이상 유효하지 않은 Attempt는 원래 Dispatch Envelope를 기준으로 취소한다. Cancellation의 ACK를 DB에 저장해 응답 유실/재시작 시 재시도하고, 교체된 Attempt도 사용하는 Commit SHA의 Check는 잘못 삭제하지 않는다. 오래된 Attempt의 Cleanup 실패가 실제 현재 Validation을 막지 않게 한다. 뒤에 붙은 PR에 앞선 Batch의 실패를 잘못 귀속하지 않는다. **Gateway가 recovering과 만료 뒤 최대 1일 취소를 먼저 지원하도록 배포하고 그 뒤 Controller를 배포**해야 한다. 완료된 Success Check는 유지한다.

**P4/TeamCity:** Task Attempt/CL/Base Revision/Build ID/Check Run ID를 Durable Ledger로 묶고 Abandoned Check Reconciliation을 Background Job으로 돌린다. 별도 Worker가 이미 성공한 Change를 다시 Submit하지 않도록 Actual P4 Server/Build Server를 조회한다. 2개 Worker/100회 Kill/ACK Loss를 테스트하고 Duplicate Submit 0, Stale Pending Check 0, Failed Attribution 0, Owner Scope 100%를 기준으로 한다. **절감 원리는 중복 실행/오류 복구 재실행 방지이며 LLM Token 수치는 미검증. 평가: 바로 적용 원칙.**

## 11. Codex #58751 — Live Text Eviction과 Durable Full Resume

**원본:** [#58751](https://github.com/openai/codex/pull/58751)(11/01 20:10 UTC), codex-rs/app-server-protocol/src/protocol/thread_history.rs, app-server/src/request_processors/thread_lifecycle.rs, thread-store/src/local/thread_history/segment_paging.rs, tests/suite/v2/thread_resume.rs.

**원리:** 활성 Thread에서 오래된 Assistant Text까지 전부 메모리에 유지하던 Live Paginated History를 **최신 Assistant Text/Correction만 남기고 과거 Text는 Evict**한다. Full Resume 응답을 요청하면 Persisted History Page에서 필요한 Text를 다시 채운다. 현재 Prepared Page에 없으면 **Item ID Indexed Lookup + 제한된 Batch 조회**를 하고, 저장된 원문이 없으면 빈값을 돌려주는 대신 오류를 내보낸다. 처음 요청한 Page에 Active Turn이 포함될 때만 Live Turn을 합친다.

**Trade-off:** 일반 UI/운영 중 Memory Residency와 Paging Query 개선 목적이다. *모델 입력 Context 자체를 줄이는 기능이 아니며* LLM Token 절감 측정 근거가 없다. Resume 시 Database Round Trip이 증가하고 History Storage 손상 시 Error가 드러날 수 있다. Diff/Approval/Evidence 같은 수정된 메시지는 Eviction/Restoration에서 정확히 일치해야 한다.

**P4 적용:** Long-running Worker의 Live State에는 최근 응답/현재 Tool Call만 두고 전체 Source Review, CL Diff, Approval Receipt, Model Text는 Indexed Immutable Event Store에서 복구한다. Resume Full vs Summary A/B에서 Memory RSS, Indexed Read p95, Replay Integrity Hash, Orphan Step 0, Evidence Loss 0을 비교한다. **평가: PoC.**

## 12. Open SWE #4852 — Draft 포함 PR Walkthrough를 Implementer가 소유하는 옵션

**원본:** [#4852](https://github.com/langchain-ai/open-swe/pull/4852)(11/01 20:56 UTC), openswe/{walkthrough/planner,tools/plan_walkthrough,agent_api/agent}.py 및 tests/reviewer/test_pr_ready_auto_review.py.

**변경:** 새 PR(초안·사람 작성 포함)의 공유 Diff Walkthrough를 자동 Review 설정과 독립적으로 생성하고 Head Push마다 갱신할 수 있다. 별도 **implementation_walkthrough_enabled(기본 OFF)**가 켜져 있으면 원래 Implementation Thread가 자기 Checkout에서 Shared Hunk Planner를 사용해 **최신 Head의 Walkthrough를 직접 만든 뒤 PR 완료를 알린다**. 별도 Scout를 새로 띄우지 않으며, Review/Approval/Ready-for-review 정책은 변경하지 않는다. Plan Chunk Tool은 Latest Head SHA와 Complete 상태를 확인한다.

**Token/Cycle trade-off:** Scout와 Implementer가 같은 Diff를 두 번 조사하는 일을 피할 잠재력은 있으나, Implementer의 Context가 길어지거나 완료 전 추가 모델 호출이 증가할 수 있다. 원래 Reviewer와 작성자가 Context를 격리해야 하는 경우 **같은 Thread를 Reviewer로 재사용해서는 안 된다**. Tool-assisted Walkthrough는 Evidence Store의 Hunk Range/Hash를 공유하고 Reviewer는 별도 Thread에서 검증한다.

**P4 적용:** Shelved CL의 Hunk별 Walkthrough를 변경 작성 Worker가 만든 뒤 TeamCity/Review에 넘기되, 독립 Reviewer가 근거와 최신 Revision을 검증한다. 50개 CL에서 Scout 중복 실행 수, 작성자/Reviewer Model Cost, Hunk Coverage, Stale Head Reject, Review Recall을 측정. **평가: PoC.**

## 13. Open SWE #4876 — 세션 Identity와 GitHub Credential Scope 분리

**원본:** [#4876](https://github.com/langchain-ai/open-swe/pull/4876)(10/31 22:00 UTC). GitHub 개인 Owner OAuth Credential과 Workspace/System App Credential을 명시적으로 분리하고, 개인 자격이 없을 때 **더 넓은 App Credential로 자동 대체하지 않도록** 했다. Session/Thread Identity/Attribution은 기존 방식 보존. 관련 후속 [#4871](https://github.com/langchain-ai/open-swe/pull/4871), [#4872](https://github.com/langchain-ai/open-swe/pull/4872), [#4873](https://github.com/langchain-ai/open-swe/pull/4873)는 조사 마감 시 **OPEN/미병합**이다. 따라서 Work/Coding Experience 분리나 LangSmith 로그인까지 이미 배포됐다고 해석하지 않는다.

**실무:** P4 Service Account/Workspace Agent/Ticket을 별도 Credential Class로 두고, 개인 Agent의 권한 부족을 Bot Credential로 몰래 승격하지 않는다. Session Owner ID와 Actor/Executor Credential ID를 모두 Audit한다. 직접 Token 절감 없음. **평가: 바로 적용 원칙.**

## 14. 적용 설계 — Perforce + Claude Code + Codex Harness

다음은 업스트림 구조를 참고한 **제안 아키텍처**이며 실제 저장소의 완성 구현도를 복제한 것이 아니다.

    [P4 Depots / CLs]        [TeamCity Build / Logs]
             \                       /
              \                     /
               -> [Durable Task/Attempt Ledger]
                          |
                [Policy + Credential Gate]
                          |
           +--------------+---------------+
           |                              |
    [Shared Prompt/Skill Manifest]   [Evidence Store]
      + policy & tool digests       + CL/source/hash/URI
      + personal memory scope       + immutable build output
           |                              |
           +--------------+---------------+
                          |
                  [Runtime Adapter]
              / Claude Code | Codex \
              |              |       |
         [Read Worker] [Edit Worker] [Independent Reviewer]
              \              |       /
               [Per-Tool Receipt + Cost Usage]
                          |
              [Verify CL/Build/Evidence]
                          |
               [Remote Reconcile/Delivery]

### 우선 실험 A — Overflow, Compaction, Evidence Integrity

샘플 50개(일반 코드·대형 Tool Output·Dense JSON/Base64·Encoding 특이 사례)에서 A=현재 Full Retry, B=Text-first on real overflow, C=B+Error Span/Hash selective retrieval로 비교한다. Provider가 거절한 Request를 동일하게 반복하는 행위 0, Revision/CL/Build Reference Accuracy 100%, Unauthorized Write 0을 강제한다. **측정: input/output/reasoning/cache-read/cache-write tokens, billed USD, rejection count, verified-task success, investigation latency.** B/C 품질 저하가 2%p를 넘으면 채택하지 않는다.

### 우선 실험 B — Cache Warming과 Workspace Skill Context

Claude Code/Codex에 동일한 50개 Task를 3회씩 수행하고 5분/1시간 TTL, 0~60분 Idle, Skill 10/100/200개, Warm OFF/고정/auto, Disk/Memory Skill Registry를 교차한다. System Prefix가 정책·Tool Digest와 일치할 때만 Cache Hit를 유효로 본다. **채택 기준(제안): 실제 청구 USD/Verified Task 10% 이상 절감 또는 p95 latency 20% 이상 감소, 성공률 저하 2%p 이내, Owner Scope Leakage 0.** Keep-alive 모델비를 비용에서 누락하지 않는다.

### 우선 실험 C — Durable Lifecycle/Adapter/Model Routing

P4 Job State를 QUEUED→PREPARING→RUNNING→VERIFYING→COMPLETED→DELIVERED/FAILED로 정의하되 **Task Completion과 Delivery/Trace Completion은 별도**다. Resume은 External P4/TeamCity State Reconcile 후 진행한다. Child Spawn과 Approval, Tool Permission, Model Fallback, Evidence Receipt를 각각 별도 Event로 기록한다. 100회 Kill/Network Timeout/429/Partial Stream 테스트에서 중복 CL Submit 0, Evidence Loss 0, 취소된 작업의 Stale Pending 0, 승인 없는 Write 0을 확인한다.

### 우선 실험 D — Observability/Cost Ledger

각 Task별 (session_id, turn_id, attempt_id, child_id, requested_model, executed_model, reason, tool_call_id, CL, build_id, evidence_hash, provider_usage, cache_read, cache_creation, reasoning_included, invoice_cost, trace_complete)를 관리한다. Trace는 요청/Turn 경계로 분리하고 **Trace Sampling과 회계 Receipt 저장을 혼동하지 않는다**. Service/Personal/Organization Credential의 별도 Actor Scope를 검증한다.

## 15. 미확인·제외·다음 확인 조건

1. OpenCode #61015는 **실제 Prompt Rejection 직후**에만 Text-first Compaction을 강제한다. 일반 압축의 Cache 재사용 제거로 과장하지 않는다.
2. #60969/#60025는 자동 Keep-alive 구현이지 Token Savings Bench가 아니다. 실제 API 비용표/TTL/청구 데이터를 넣은 재현 실험이 없으므로 비용 절감률을 주장하지 않는다.
3. #60974의 650만 Span, 97%, 16%는 **수정 전 운영 관측**과 제거 대상 추정이다. 변경 후 운영 Export Volume 감소율로 바꿔 적지 않는다.
4. Claude Code Plugin/Skill 변경은 Open SWE·OpenCode 코드의 Integration 사례이지, Claude Code 자체의 11/02 신규 정식 릴리스라고 표현하지 않는다.
5. Codex #58751은 주로 **App Server Working Set** 최적화이고, 모델에 보내는 Prompt Text 감소와 혼동하지 않는다.
6. **RAG 재랭킹, Context Pruning/Prompt Compression, Sub-agent 독립 모델 Routing, Provider-native Tool Search, 새로운 공개 Token/Quality Benchmark**는 관찰 구간에 기존 Scout와 구별되는 병합·실측 변화가 확인되지 않아 반복 항목을 만들지 않았다.
7. 각 PR의 개발자 테스트, 운영 관측 및 구성 수치를 원본 근거로 기록했으나 **본 조사자가 동일 기업 환경의 Perforce, TeamCity, 유료 Claude Code/Codex에서 재현한 결과는 아니다**.
8. 최신 Tag 배포 여부는 개별 PR Merged Timestamp와 동일하지 않다. 기업 도입 전에 Release Artifact Source/Version Pin과 Dependency Lock을 별도로 확인한다.

**최종 판정:** 2026-11-02에는 의미 있는 새 구현이 확인됐다. **즉시 도입할 원칙:** Overflow 재전송 방지, Usage Event/Step 분리, Owner Credential 분리, Durable ACK/Check Reconcile, Evidence/Trace 귀속. **가장 먼저 실제 비용을 측정할 PoC:** Cache TTL 기반 Warming, Skill Manifest+Memory-backed Selective Read, 개인/공용 Context Curator, Live/Persisted Session State 분리. **당일 검증된 LLM Token/청구 절감률은 없음.**
