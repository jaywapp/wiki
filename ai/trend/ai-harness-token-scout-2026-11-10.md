---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-10"
category: trend
tags: [ai-harness, coding-agent, orchestration, context-engineering, token-optimization, skills, hooks, progressive-disclosure, selective-context, compaction, prompt-cache, subagents, durable-state, runtime-adapter, evidence-verification, handoff, ledger, task-lifecycle, model-routing, cost-accounting, perforce, claude-code, codex]
updated: 2026-11-10
source:
  - https://github.com/anomalyco/opencode/pull/62806
  - https://github.com/anomalyco/opencode/pull/62835
  - https://github.com/anomalyco/opencode/pull/62823
  - https://github.com/anomalyco/opencode/pull/62827
  - https://github.com/anomalyco/opencode/pull/62796
  - https://github.com/anomalyco/opencode/pull/62034
  - https://github.com/anomalyco/opencode/pull/62830
  - https://github.com/anomalyco/opencode/pull/62829
  - https://github.com/anomalyco/opencode/commits
  - https://github.com/langchain-ai/langchainjs/pulls
  - https://github.com/openai/codex/issues/60378
---

# AI Harness · Context/Token Optimization Scout — 2026-11-10

> 조사 기준: 2026-11-10 05:56 KST 전후. 중심 관찰 기간은 2026-11-09 UTC에 반영된 변경. 원본 GitHub commit 목록 및 공개 PR 설명을 우선 확인했다. 일부 PR 상세 페이지는 조회가 제한되어 **커밋 제목만 확인한 항목은 내부 동작·효과를 확정하지 않는다.** 수치가 없으면 없다고 명시한다. 이 보고서의 적용 아이디어는 제안이며 사내 측정 결과가 아니다.

## 0. 전일 대비 결론과 중복 제거

**의미 있는 신규 변경이 있다.** 이번 날짜에는 OpenCode의 실행 Span에 Session/Agent/Command/Model Stream 연결을 추가한 변경이 가장 검증 가능하다. 그 밖에 Session Generate 사용량 반환, Workspace 사용량 제한 재시도 차단, MCP OAuth 공유 Credential Lock, Plugin 준비 대기 경로 축소, Copilot Native AI Protocol 전환, ACP Steering 지원이 11/09 커밋 목록에서 확인된다. 단, 대부분은 상세 Diff/테스트를 이번 조사에서 끝까지 읽지 못했으므로 정량 성과를 주장하지 않는다.

비교 기준은 develop의 [11/09](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-09.md), [11/08](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-08.md) 보고서를 직접 조회했다. 11/09의 Catalog Delta 11,255→1,918 토큰, 이미지 25→15MiB, MCP 반환 Schema, Policy Cache, Agent Tree, 11/08의 Durable Tool, Guardian Evidence, Incremental Exec Tool, Lazy MCP 기동을 **신규 발견으로 재포장하지 않는다.** 11/02에 다룬 OpenCode #60974 Trace 기초 기능과 달리 #62806은 Shell/Agent/Model Stream에 누락된 Span 속성을 채우는 후속 변경이다. 11/02에 다룬 Cache Warming의 11/09 문서 변경은 새 알고리즘으로 분류하지 않는다.

| 우선 | 변경과 근거 | 확인 수준 | 판단 |
|---|---|---|---|
| 1 | [OpenCode #62806](https://github.com/anomalyco/opencode/pull/62806) Shell/Tool/LLM Span 상관관계 | PR 본문, 테스트 결과, 리뷰, merge 확인 | **바로 적용 원칙** |
| 2 | [OpenCode #62835](https://github.com/anomalyco/opencode/pull/62835) Session Generate에서 Usage 반환 | dev 커밋 제목 확인 | **PoC** |
| 3 | [OpenCode #62823](https://github.com/anomalyco/opencode/pull/62823) ChatGPT Workspace Limit 불필요 재시도 중단 | dev 커밋 제목 확인 | **바로 적용 원칙** |
| 4 | [OpenCode #62827](https://github.com/anomalyco/opencode/pull/62827) 공유 Credential Lock 아래 MCP OAuth Refresh | dev 커밋 제목 확인 | **바로 적용 원칙** |
| 5 | [OpenCode #62796](https://github.com/anomalyco/opencode/pull/62796) Request Handler에서 Plugin 대기 제거 | dev 커밋 제목 확인 | **PoC** |
| 6 | [OpenCode #62034](https://github.com/anomalyco/opencode/pull/62034) Copilot Native AI Protocol로 전환 | dev 커밋 제목 확인 | **PoC** |
| 7 | [OpenCode #62830](https://github.com/anomalyco/opencode/pull/62830) Catalog Sync에서 무효 Plugin Boot Retry 제거 | dev 커밋 제목 확인 | **바로 적용 원칙** |
| 8 | [OpenCode #54394](https://github.com/anomalyco/opencode/pull/54394) ACP Session Steering | dev 커밋 제목 확인 | **아이디어 참고 / PoC** |
| 관찰 | [LangChain.js #12165](https://github.com/langchain-ai/langchainjs/pull/12165), [#12163](https://github.com/langchain-ai/langchainjs/pull/12163), [#12162](https://github.com/langchain-ai/langchainjs/pull/12162) | 공개 PR 목록의 제목·Open 상태 확인; 병합 미확인 | **추적만, 도입 보류** |

**정량 판정:** 오늘 확인한 신규 변경에 대해 동일 성공률·동일 품질의 Verified Task당 LLM 입력/출력/Cache Token 및 Provider Bill 절감률은 **검증된 수치가 없다.** #62806은 관측성 개선이지 토큰을 직접 절약하는 변경이 아니다. 11/09 보고서의 83% Catalog Update Token 감소는 오늘 성과에 포함하지 않는다.

## 1. OpenCode #62806 — Shell·Tool·LLM Span을 하나의 실행 원장으로 연결

**신규성:** 2026-11-09 dev 병합. 이전 #60974가 Turn/Step/Tool Call에 Session ID를 연결한 뒤에도 사용자가 직접 실행한 `!` Shell은 Turn 밖에서 실행되어 Session 귀속이 누락됐고, Step Span은 Model Stream과 Tool 시간을 합쳐 병목을 분리하기 어려웠다. [PR 원문](https://github.com/anomalyco/opencode/pull/62806)은 이 빈틈을 보완한다.

**내부 동작:** Shell 자체 Metadata에서 Session을 읽어 부모 Turn이 종료된 뒤에도 Session ID를 보존한다. Shell Span에는 Shell ID, 최대 200자 Command Prefix, Background Flag, 완료 Status와 Exit Code가 추가된다. Tool이 시작한 Shell은 Tool Call ID를 포함한다. Step 아래 별도 `LLM.stream` Span이 Provider Stream 시작~완료만 측정하고 Provider/Model 속성을 기록한다. Step과 Tool Span에는 `gen_ai.agent.name`을 기록한다. Background Subagent 완료 전달에는 Parent Session을 기록한다. 명령 문자열을 UTF-8 유효 텍스트로 유지하도록 처리한다.

**테스트·근거:** PR은 Session Shell, Recorded Runner, Subagent 관련 24개 테스트 통과, Shell Tool 65개 중 2개 실패(기준 dev에도 존재하는 실패), Typecheck 통과를 보고한다. 리뷰는 Shell Span에 민감한 명령 앞 200자가 OTLP Endpoint로 전송될 수 있다고 경고한다. **보안상 중요한 Trade-off:** `curl -H 'Authorization: ...'` 같은 명령을 Tracing에 그대로 보내면 Token이 유출될 수 있다. Secret Redaction, Command Hash 또는 Allowlist 기반 표시, 수집자 ACL과 보존기간 제한이 필수다.

**토큰/비용 절감 원리:** 직접적인 Token 감소는 없다. 다만 LLM Stream 시간과 Tool/Build 대기시간을 분리해 비싼 모델 호출을 최적화할 지점, 재시도 루프, 긴 Shell Output을 찾아낼 수 있다. **효과 미측정.** Observability 자체의 CPU·Storage·민감정보 비용도 발생한다.

**Perforce/Claude Code/Codex 적용:** 공통 Span Key를 `task_id, session_id, run_id, agent_id, parent_agent_id, tool_call_id, p4_cl, teamcity_build_id, model, provider`로 정의한다. Runtime Adapter가 Claude Code/Codex의 서로 다른 이벤트를 이 공통 Envelope로 변환하고, LLM Stream/Tool/Queue/Build/Approval 대기시간을 구분한다. P4 CL은 원본 로그가 아닌 ID/Hash만 Span에 기록한다. **평가: 바로 적용 원칙.** 사내 P4 Submit/TeamCity Build가 Span의 성공만으로 실제 성공했다고 간주해서는 안 된다.

## 2. OpenCode #62835 — Session Generate Usage 반환

**신규성:** 11/09 dev 커밋 목록에 `feat(core): return usage from session generate (#62835)`가 있다. [커밋 목록](https://github.com/anomalyco/opencode/commits)에서 병합 흔적을 확인했지만 상세 API 응답 구조·테스트·Usage 필드의 정확한 정의는 검증하지 못했다.

**가능한 적용 지점:** 호출 경계에서 Usage를 반환하면 비동기 Session 종료 후 별도 로그 수집 없이 Cost Receipt를 생성할 수 있다. 단, 이는 제목에서 추론한 설계 활용이며 PR의 구체 구현이 확인된 것은 아니다. Provider Usage가 없을 때는 `estimated`로 표시하고 실제 청구액과 섞지 않는다.

**PoC:** 30개 Task×2 Runtime을 수행해 Request/Turn/Session별 Input, Output, Cache Read, Cache Write, Reasoning, Retry/Discarded Calls와 USD를 수집한다. `sum(turn_receipts) == session_receipt`을 검증하고 누락·중복 비율을 산출한다. Claude Code/Codex의 Subscription 사용량은 API Token Cost와 동일시하지 않는다. **평가: PoC.** 절감량 확인 전까지 비용 최적화 성과 없음.

## 3. OpenCode #62823 — Workspace Limit 재시도 차단

**확인된 변경:** 11/09 커밋 제목 `fix(core): stop retrying ChatGPT workspace usage limits`. 정확한 HTTP 코드 분류, 오류 본문 매칭, 백오프 정책은 상세 Diff를 읽지 못해 미확정이다.

**기술적 의미:** 고정된 사용량 한도 오류를 일시적인 429와 동일하게 재시도하면 응답 불가 구간의 Latency와 Tool/Model Attempt만 증가한다. 재시도 판단을 `retryable | terminal | unknown`으로 분리하고 Provider별 오류를 원본과 함께 기록하는 것이 안전하다. Terminal 판정은 벤더가 명시한 확정적인 Quota/Entitlement 오류에만 적용한다. 일시적 Rate Limit은 `Retry-After`와 Deadline을 존중한다.

**Perforce Harness 적용:** Claude Code/Codex Runtime Adapter의 오류 분류 표에 `provider, scope, error_code, retry_after, terminal_reason`을 저장한다. Terminal Error 시 같은 모델 반복 호출 대신 사용자 승인 대기 또는 별도 허용 모델로 Handoff한다. 잘못된 Terminal 판정은 복구 가능한 Task를 중단시키므로 테스트 필수. **평가: 바로 적용 원칙.** 실제 절감액 미측정.

## 4. OpenCode #62827 — MCP OAuth Refresh 공유 Credential Lock

**확인된 변경:** 11/09 dev의 `fix(core): refresh MCP OAuth tokens under the shared credential lock`. 락 구현 세부 및 분산 환경에서의 보장은 확인되지 않았다.

**문제 가설과 재현:** 같은 MCP Credential을 쓰는 10개 Worker가 만료 직후 동시에 Refresh하면 중복 Refresh, 마지막 쓰기 덮어쓰기, Token Rotation 충돌이 발생할 수 있다. Credential Key별 Lock과 Singleflight를 사용하고 Refresh 결과에 Version/Expiry를 기록한다. 100회 동시 Refresh 테스트에서 성공 응답과 재사용된 Credential Version을 비교한다. 락이 프로세스 내부라면 다중 Host에서는 Redis/DB Lock 또는 CAS가 별도로 필요하다.

**Token 영향:** LLM 토큰 감소는 간접적이다. 인증 실패로 인한 재시도·Context Rebuild가 줄 가능성은 있으나 미측정. **평가: 바로 적용 원칙.** 민감 Credential을 Evidence/Span에 기록하지 않는다.

## 5. OpenCode #62796/#62830 — Plugin Boot·Catalog Sync의 불필요 대기 제거

**확인된 변경:** 11/09 커밋 목록의 `fix(server): stop waiting for plugins in request handlers`, `fix(app): drop the dead plugin-boot retry on catalog syncs`. 정확한 Async Lifecycle 및 Ready Barrier는 상세 Diff 미확인이다.

**적용 아이디어:** Request Handler의 Fast Path는 이미 준비된 Catalog Snapshot을 읽고, Plugin Boot/Refresh는 Background에서 수행한다. 다만 첫 요청에서 필수 Plugin이 없으면 안전한 명시적 `not_ready`를 반환해야 한다. 오래된 Catalog로 허용되지 않은 Tool을 실행하지 않도록 ACL은 매 호출 재검사한다. P4 Submit/TeamCity Trigger는 Plugin Ready 여부뿐 아니라 Durable Execution Receipt를 확인한다.

**재현:** Plugin 0/20/100개, Cold/Warm Boot, 100개 동시 요청에서 P50/P95 Handler Latency, Ready Miss, Failed Tool Calls, Retry Count를 측정한다. **평가: PoC(#62796), 바로 적용 원칙(#62830).** Token/Cost 절감 미검증.

## 6. OpenCode #62034, #54394 — Provider Native Protocol과 ACP Steering

**확인:** 11/09 dev 커밋 목록에서 `refactor(core): run GitHub Copilot on native ai protocols (#62034)` 및 `feat(acp): support _session/steering (#54394)` 확인. 상세 Runtime Adapter 계약·호환성 테스트는 미확인이다.

**의미:** Provider별 Tool/Usage/Streaming Event의 손실 없는 Native Adapter와, 실행 중 사용자 Steering Event를 Turn Queue와 구분하는 Lifecycle은 장기 작업에서 중요하다. Steering은 취소가 아니라 변경 요청일 수 있으므로 `event_id, target_turn_id, ordering, ack, accepted_at`을 별도 기록한다. Windows Codex의 [#60378](https://github.com/openai/codex/issues/60378)은 11/09 제기된 Steering 반응 지연 사용자 보고로, 공식 재현·수정은 확인되지 않았다.

**Perforce 적용:** 진행 중 Build/Submit을 Steering으로 무조건 취소하지 않는다. 취소 가능 작업과 이미 외부 Side Effect가 발생한 작업을 분리한다. Provider Native Protocol을 추상화할 때 Raw Event 원본을 Durable Store에 보존하고 Normalized Event와 함께 비교한다. **평가: PoC / 아이디어 참고.** Token 절감 검증 없음.

## 7. 기타 관찰 — 미병합 후보를 성과로 오인하지 않기

[LangChain.js PR 목록](https://github.com/langchain-ai/langchainjs/pulls)에서 11/08~09 제안된 `#12165 preserve parent updates in tool handoffs`, `#12163 propagate graph control flow in model retry/fallback middleware`, `#12162 keep run-level call limit counters out of checkpoint`를 확인했다. 이들은 Handoff Ledger, Control Flow, Checkpoint Scope에 유의미한 주제지만 **열린 PR 목록의 제목 수준만 확인했으며 병합 및 기능 채택을 확인하지 않았다.** 후속 Scout에서 병합·테스트·릴리스가 확인되면 신규성 검토 대상으로 삼는다.

## 8. 오늘의 주제별 Scout Coverage

| 범주 | 오늘 신규성/판정 |
|---|---|
| Coding Agent Workflow/Orchestration | ACP Steering 및 Plugin Ready Lifecycle 후속 변경 확인 |
| Skills/Hooks, Progressive Disclosure | 전일 이후 독립 검증 가능한 새 절감 성과 없음 |
| Context Pruning/Compaction | 전일 이후 독립 검증 가능한 새 알고리즘/벤치마크 없음 |
| Subagent Context Isolation | #62806에서 Agent/Parent Session Trace 연결; Context 절감 자체는 미측정 |
| RAG/Selective Context | 신규 검증 사례 없음 |
| Prompt/Skill 파일 경량화 | 신규 검증 사례 없음 |
| Tool Output 축약 | 신규 검증 사례 없음 |
| Prompt Cache | #62829 TTL/Warming 문서화는 기존 기능 설명이며 신규 최적화로 제외 |
| Session/Handoff/Ledger | ACP Steering, LangChain.js 미병합 제안 추적 |
| Model Routing/Runtime Adapter | Copilot Native Protocol 전환 커밋 확인, 성능 미측정 |
| Token/Cost 측정 | #62835 Usage 반환, #62806 Stream Span |
| Durable State/Task Lifecycle | OAuth Lock, Plugin Ready, Terminal Limit 분류 |
| Evidence Verification | 원본 Execution Receipt/Tool Outcome 확인 원칙 유지; 새 검증 수치 없음 |

## 9. Perforce·Claude Code·Codex 재현 실험 설계

**실험 A — Unified Trace/Cost Receipt (우선 1):** 동일 UE5/TeamCity/P4 Task 30건을 Claude Code와 Codex에서 수행. 각 Task는 `session_id → agent_id → tool_call_id → external_execution_id`로 연결한다. LLM Stream, Tool, Queue, Build를 분리하고 Provider Usage 누락률, Trace 연결률, 성공 검증률을 기록한다. 목표: 실행 Span 99% 이상 상관관계 확보, P4 Submit 중복 0건, Provider Bill과 내부 Receipt 불일치 원인 100% 분류. 이 수치는 제안 합격 기준이지 측정 결과가 아니다.

**실험 B — Terminal Retry vs Backoff (우선 2):** 모의 Provider에서 401/403/Quota/429/5xx/Timeout을 주입하고 100회 반복한다. Terminal 오류의 재시도 0회, Retryable 오류의 Deadline 준수, 재시도 뒤 Tool Side Effect 중복 0건을 검증한다. 총 시도 횟수, Latency, Provider Usage, Task Success를 함께 비교한다.

**실험 C — MCP OAuth/Plugin Race (우선 3):** 동일 Credential 10개 Worker, Plugin 100개, 서버 재시작과 Network Delay를 주입한다. Refresh 중복, Catalog Ready Miss, 권한 우회, Cold Start P95, 재개 후 Ledger Reconcile를 측정한다. Shared Lock이 Process Local인지 Distributed인지 별도 표시한다.

**실험 D — Steering/Handoff (우선 4):** Task 실행 중 사용자 방향 변경 30회, Worker 강제 종료 20회, P4 Submit 전/후 Steering을 각각 주입한다. Accepted Steering의 대상 Turn 정확성, Handoff 재개 성공, 완료된 외부 작업의 재실행 0건을 확인한다.

**비용 계산:** `verified_task_cost = (sum(input_uncached_price + cache_read_price + cache_write_price + output_price + retries) + infra_cost) / verified_successes`. 단, Subscription Plan의 내부 사용량은 USD Provider Bill로 환산하지 않고 별도 `quota_units`로 측정한다. 품질·성공률 하락을 숨기지 않는다. Cache Hit 비율, Output Byte 감소, Wall Time 개선은 청구액 감소와 구분한다.

## 10. 제한·다음 조사

이번 날짜의 주요 신규성은 **관측성과 Runtime Lifecycle**에 집중되어 있으며 새로운 Token 절감률 벤치마크는 확보하지 못했다. GitHub dev 커밋 목록으로 존재를 확인했으나 일부 PR 상세 Diff와 Benchmark를 읽지 못한 항목은 **제목 기반 확인**으로 낮은 증거 등급을 명시했다. 특히 #62835 Usage의 정확한 API Shape, #62823 Terminal Error 분류, #62827 Lock Scope, #62796 Plugin Ready Barrier, #62034 Native Protocol Mapping은 후속 코드 확인이 필요하다.

참고: [OpenCode dev 커밋 목록](https://github.com/anomalyco/opencode/commits), [#62806 PR 상세](https://github.com/anomalyco/opencode/pull/62806), [LangChain.js PR 목록](https://github.com/langchain-ai/langchainjs/pulls), [Codex Steering Issue](https://github.com/openai/codex/issues/60378).

**최종 판단:** 당장 적용할 것은 Tool/LLM/Shell Span 상관관계와 Terminal Retry 분류의 설계 원칙이다. 실제 코드 도입은 사내 Credential/Telemetry Policy 검토 후 진행한다. 오늘은 검증 가능한 신규 Provider Cost 절감률을 제시하지 않는다.
