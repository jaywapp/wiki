---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-29"
date: 2026-10-29
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, tool-search, prompt-cache, compaction, skill-discovery, durable-state, runtime-adapter, evidence-verification, handoff-ledger, model-routing, perforce, claude-code, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-10-29

> **조사 기준:** 2026-10-29 05:56 KST(2026-10-28 20:56 UTC). GitHub에서 **2026-10-27 20:55~2026-10-28 20:56 UTC**에 병합된 커밋·PR·공식 릴리스 중심으로 조회. 직전 [10/28 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-28.md), [10/27](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-27.md), [10/26](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-26.md)와 비교했다. 링크는 가급적 실제 머지 PR과 연결 커밋·테스트를 가리킨다. 작성자가 발표한 벤치마크와 사내 재현 결과를 구분한다.

## 0. 오늘의 결론

1. **모델에 보여주는 Tool Schema를 늦게 선택:** Deep Agents Code [#7304](https://github.com/langchain-ai/deepagents/pull/7304)는 기본적으로 지원 모델의 provider-native Tool Search를 사용하고, 실제 MCP Tool 실행·승인 절차는 기존 경로를 유지한다. 전일 Talon의 skillOnly 구현과 달리 **공급자 네이티브 검색**이 신규성이다. 서버로 전송하는 HTTP payload 자체가 반드시 줄어드는 것은 아니다.
2. **캐시의 대상은 고정된 Prompt Prefix:** Open SWE [#4677](https://github.com/langchain-ai/open-swe/pull/4677), [#4374](https://github.com/langchain-ai/open-swe/pull/4374), [#4571](https://github.com/langchain-ai/open-swe/pull/4571)은 thread 최초 system prompt를 불변으로 유지하고 변화하는 환경·PR SHA·역할·지시를 별도 run 메시지로 이동했다. Compaction 후 사라진 지시는 다시 전달한다. 실제 cache-read token·청구 비용의 통제된 비교는 아직 없다.
3. **컨텍스트 압축을 Agent가 명시적으로 요청:** Microsoft Agent Framework Python [#9384](https://github.com/microsoft/agent-framework/pull/9384)는 실험적 AgentTriggeredCompactionStrategy와 UnloadSkillsCompactionStrategy를 추가했다. Agent가 시점을 선택하되 어떤 데이터를 제거할지는 개발자 정의 전략이 결정한다.
4. **Durable Delivery + Evidence 비용 계측:** Open SWE [#4575](https://github.com/langchain-ai/open-swe/pull/4575)는 체크포인트 Outbox와 PostgreSQL 수신 영수증으로 백엔드 이벤트를 유실·중복 없이 전송하려는 구조를 구현했다. 작성자 측 과거 20-run 시험에서 **보고용 HTTP 호출 15.8→4.7회/실행(약 70% 감소)**, 반면 body bytes는 **10.4→12.5 KB 증가**했다. 이는 LLM 토큰 절감이 아니다.
5. **RAG Scope 정확성과 Context Artifact 생존:** Agent Framework [#9461](https://github.com/microsoft/agent-framework/pull/9461)은 Redis 검색의 app/agent/user/thread/conversation scope를 case-sensitive 해시 TAG로 격리한다. Open SWE [#4627](https://github.com/langchain-ai/open-swe/pull/4627)는 대용량 Tool Output이 잘못된 sandbox로 offload되어 run이 종료되는 문제를 해결했다.
6. **토큰 제한 경계와 선택적 검색:** Codex [#57584](https://github.com/openai/codex/pull/57584)는 truncation 후 UTF-8 출력 경계 매핑을 보존하고, [#57598](https://github.com/openai/codex/pull/57598)는 FS watch가 확인한 경우에만 빈 Skill Discovery 결과를 캐싱한다. OpenCode [#59934](https://github.com/anomalyco/opencode/pull/59934)는 provider와 내부 계산 오차로 인한 context 초과를 줄이려고 모델 window의 **1% 여유분**을 둔다.
7. **Model/Runtime 분리:** Open SWE [#4662](https://github.com/langchain-ai/open-swe/pull/4662)는 공유 compiled graph의 summarizer가 다른 모델을 사용하던 버그를 해결했다. Codex [#57568](https://github.com/openai/codex/pull/57568)는 background memory consolidation의 service tier를 세션과 분리했다.

**정량 판정:** 오늘 확인된 새로운 동일 품질 작업당 LLM 입력/출력 토큰 또는 실제 청구액 절감률은 **없다**. 캐시·Tool Disclosure의 효과는 구조상 가능성이지만 검증 전 가설이다. 과거에 다룬 TokenEconomizer의 18.4~30.9% 결과, Deep Agents checkpoint 55% 감소, Open SWE 12.0→0.85MB 요청 감소, graph compile 24~25→0.5ms는 오늘 실적에 재사용하지 않았다.

### 신규 변경 분류·우선순위

| 신규 근거 | 실제 구현/측정 | 모델 token 또는 bill 상태 | Perforce·Claude/Codex 판단 |
|---|---|---|---|
| [Deep Agents #7304](https://github.com/langchain-ai/deepagents/pull/7304) | 네이티브 Tool Search로 MCP Schema 선택 공개 | 직접 절감량 미측정 | **PoC 최우선** |
| [Open SWE #4677/#4374/#4571](https://github.com/langchain-ai/open-swe/pull/4677) | 고정 System Prefix + 변화분 메시지 + 1h breakpoint | cache hit 미측정 | **PoC 최우선** |
| [Agent Framework #9384](https://github.com/microsoft/agent-framework/pull/9384) | Agent-triggered Compaction + Skill Unload, 실험적 | 절감량 미측정 | **PoC 최우선** |
| [Open SWE #4575](https://github.com/langchain-ai/open-swe/pull/4575) | 20-run HTTP 호출 15.8→4.7, body 10.4→12.5KB; 60초 장애 복구 | network/내구성 지표 | **바로 적용 원칙** |
| [Codex #57598](https://github.com/openai/codex/pull/57598) | Watch-confirmed 빈 Skill Discovery Cache | 메타데이터 RPC 절약, token 미측정 | **PoC** |
| [Codex #57584](https://github.com/openai/codex/pull/57584) | UTF-8·멀티모달 Output Boundary 보존 | output 예산 안정성 | **바로 적용 원칙** |
| [Open SWE #4662](https://github.com/langchain-ai/open-swe/pull/4662) | 모델별 2-phase graph factory, 최대 32 cache | context 정확성, token 미측정 | **바로 적용 원칙** |
| [Agent Framework #9461](https://github.com/microsoft/agent-framework/pull/9461) | Redis Retrieval Scope identity와 구버전 Index 차단 | 검색 보안/정확성 | **바로 적용 원칙** |
| [OpenCode #59934](https://github.com/anomalyco/opencode/pull/59934) | 정상 turn의 출력 fit 시 window 1% headroom | 실패 재요청 방지 기대 | **바로 적용 원칙** |
| [Open SWE #4627](https://github.com/langchain-ai/open-swe/pull/4627) | 100k자 Tool 결과의 artifact-root offload 테스트 | model token 미측정 | **PoC** |
| [Open SWE #4678](https://github.com/langchain-ai/open-swe/pull/4678) | 24 checkout 첫 scan 3.06~3.51→2.02~2.50s | git IO/latency만 | **PoC** |
| [Codex #57586](https://github.com/openai/codex/pull/57586) | Host-reserved Child ID, 분리 시작, live-call 예약 | 안정성/생명주기 | **PoC** |
| [Codex #57568](https://github.com/openai/codex/pull/57568) | Memory Consolidation Tier 독립 설정 | 비용 가설, 청구 비교 없음 | **PoC** |
| [Deep Agents #7358](https://github.com/langchain-ai/deepagents/pull/7358) | OpenRouter Anthropic Cache Control 자동 주입 | cache usage 미측정 | **PoC** |
| [OpenCode #59401](https://github.com/anomalyco/opencode/pull/59401) | 실험적 Durable Schedule DB/Timer, 24 tests | 토큰 절감 목적 아님 | **아이디어 참고/PoC** |
| [Agent Framework #9802](https://github.com/microsoft/agent-framework/pull/9802) | Monty 산출물 capture 20개/20MiB/파일5MiB 제한 | 증거 크기/IO 경계 | **바로 적용 원칙** |
| [Gemini CLI #29980](https://github.com/google-gemini/gemini-cli/pull/29980) | Extension Manifest/MCP 경로 검증 CLI | 토큰 무관, Skill 공급망 검증 | **바로 적용 원칙** |

## 1. Deep Agents Code #7304 — Provider-native MCP Tool Search

**변경·원문:** [10/27 21:40 UTC 병합 PR](https://github.com/langchain-ai/deepagents/pull/7304), [커밋](https://github.com/langchain-ai/deepagents/commit/f9cbdbaebe9a07c3024d389bbaa2cabde4fc3a7b); 신규 코드 **libs/code/deepagents_code/provider_tool_search.py**와 **tests/unit_tests/test_provider_tool_search.py**, **test_provider_tool_search_extra.py**. 2026-10-28 현재 main 소스 변화로, 별도 stable release 포함을 확정하지 않는다.

**내부 동작:** 모델 Provider를 해석한 후 LangChain ProviderToolSearchMiddleware가 지원되는 OpenAI Responses 또는 Anthropic Messages의 네이티브 Tool 검색을 연결한다. 코딩의 기본 Tool은 바로 노출하고 MCP Tool 정의의 Model-visible Schema는 요청 시점으로 미룬다. 실제 Tool executor, approval, server-side filtering, 비용 기록은 유지한다. LangSmith Gateway 네이티브 API도 지원하며 Chat Completions·Gemini·미확인 custom endpoint는 eager Tool 노출을 유지한다. 설정 **models.provider_tool_search=false** 또는 환경변수 **DEEPAGENTS_CODE_PROVIDER_TOOL_SEARCH=false**로 해제한다. 모델 프로필에 capability override가 있지만 API 형식·전역 opt-out을 무시하지 않는다. QuickJS code-mode Tool Reference에는 지연 공개 schema를 중복 싣지 않도록 처리한다.

**Token 원리:** 처음부터 모든 MCP Tool 설명을 추론 컨텍스트에 펼치지 않는 것이 목표. **중요:** PR에 따르면 네트워크 요청에는 여전히 전체 schema가 포함될 수 있어 전송 HTTP 바이트·실제 provider 과금 감소와 곧바로 같지 않다. Tool search가 Tool을 잘못 찾으면 추가 탐색 step/latency와 실행 품질 저하가 생긴다. Mock/provider-serialization/streaming/HITL 회귀 테스트는 확인했지만 동일 작업 품질과 USD A/B는 없다.

**P4 구현 실험:** 150개 Tool(P4/UE5/TeamCity)을 Read/Change/CI/Submit으로 태그. A=eager 전체 공개, B=provider tool search, C=전일 Talon skillOnly, D=둘 결합을 **실제 모델 요청**으로 비교한다. 50개 작업에서 선택 Recall@1, 잘못된 Tool 호출 수, input/cache-read/cache-write tokens, 실제 USD/verified task, initial latency를 기록. Tool Search는 **Tool ACL을 대신하지 않으므로** p4 submit과 destructive clean은 별도 권한 검사. **평가: PoC 최우선.**

## 2. Open SWE #4677/#4374/#4571 — 불변 Prefix·Run Context Delta·Cache Breakpoint

**변경·근거:** [thread의 System Prompt 불변화 #4677](https://github.com/langchain-ai/open-swe/pull/4677)(10/28 19:10 UTC), [compiled graph static blocks·1h breakpoint #4374](https://github.com/langchain-ai/open-swe/pull/4374)(10/28 18:57), [review rerun Prompt Cache Prefix #4571](https://github.com/langchain-ai/open-swe/pull/4571)(10/28 18:31). 주요 코드 **openswe/prompt.py**, **mda/rt/loop.py**, **mda/rt/middleware.py**, **mda/rt/model_calls.py**, reviewer/review-scout의 run-context Jinja와 테스트.

**내부 동작:** Thread 최초 실행에서 고정 System Prompt를 렌더해 State에 저장하고 이후 **byte-identical**하게 사용한다. 실행마다 변하는 작업 환경, 출처(Slack/대시보드), PR 비교 SHA, walkthrough, reviewer 역할, 사용자 추가 지침은 고유 ID가 있는 **dynamic-context kind=run / run-context** 메시지로 후행한다. Compaction이 과거 메시지를 접은 위치를 Runtime이 전달하면 더 이상 모델에 보이지 않는 최신 컨텍스트를 다시 올린다. Graph의 static system blocks와 code-mode reference를 backend prompt 앞에 둔 뒤 cache breakpoint를 명시하고, 주 Agent와 Subagent에 1시간 TTL 설정을 적용할 수 있다. Reviewer 재실행에서는 과거 run 메시지를 '현재'라고 혼동하지 않도록 최신 컨텍스트를 표시한다.

**Trade-off:** 정적 접두부의 반복 재활용 및 불필요한 System Prompt rewrite 방지가 목표지만 upstream에서 **실제 cache-hit 검증은 모델 credential 부재로 수행하지 못했다**고 공개한다. 1h TTL은 provider cache-write 추가 단가가 있어 비용이 반드시 낮아지지 않는다. Prompt Snapshot에 남은 기본 repo·workspace 단위 지침은 해당 thread 내 즉시 갱신되지 않을 수 있다. 역할·권한은 그 대신 다음 turn 메시지와 server-side policy로 강제해야 한다. Backend/Runtime 버전 혼용 배포 시 일부 지침이 중복되거나 빠질 수도 있다.

**P4 실험:** 고정 System에는 허가/정책과 Tool contract만 포함하고, **RunContext**에 p4_client, stream, base CL, 현재 checkout/revision, CI build ID를 둔다. 매번 System Prefix를 재조립하지 않되 정책 변경 시 **policy hash mismatch는 fail closed**. 40개의 멀티-turn 작업에 5m·1h TTL을 교차하고, 정책 업데이트/compaction/restart/Reviewer rerun을 주입. 측정은 cache-read/write, 실제 가격, System Prefix SHA, 잘못된 revision 참조, 가려진 RunContext 재주입 횟수. **평가: PoC 최우선.**

## 3. Microsoft Agent Framework #9384 — Agent-triggered Compaction과 Skill Unload

**원문:** [10/28 16:25 UTC 병합 PR](https://github.com/microsoft/agent-framework/pull/9384), [커밋](https://github.com/microsoft/agent-framework/commit/c2a8f91b3070596c30723f74f303a124332bbb77). **python/packages/core/agent_framework/_compaction.py**와 **_skills.py**, tests/core/test_compaction.py 등. 코드에 ExperimentalFeature가 등록되어 있어 **실험적 기능**이다.

**구현:** AgentTriggeredCompactionStrategy가 기존 CompactionStrategy를 감싸서 명시적 trigger Tool을 제공한다. Agent는 planning 종료, debug 결과 확보, 특정 Skill이 더는 필요 없는 시점을 선택하고, **어떤 메시지를 삭제·요약·보존하는가는 개발자 지정 내부 전략**이 결정한다. UnloadSkillsCompactionStrategy는 하나/여러/전체 Skill을 종료·제거하는 trigger를 제공한다. Trigger Tool과 일반 Tool이 한 병렬 batch에 섞인 경우 atomic group ordering을 보존한다. Trigger를 내부 compaction의 retention count에서 잠시 빼되 정책에 따라 다시 보존 또는 제외한다. 외부 provider-managed history를 쓰는 모드와 호환성 제한이 있어 필요한 경우 거부한다.

**절감 및 품질:** Task phase 종료 시 Skill 본문·긴 탐색 결과를 일찍 정리할 수 있다. 그러나 조기 unload가 CI 검증에 필요한 정책·중간 사실까지 없앨 수 있으므로 immutable Evidence URI와 replay state를 모델 대화와 분리해야 한다. 신규 token/USD 정량 결과 없음. 회귀 테스트는 Trigger 그룹, streaming/non-streaming, function invocation 경계를 다룬다.

**Perforce 적용:** Skill을 [DISCOVERY, EDIT, BUILD, REVIEW, SUBMIT]의 명시적 scope로 로드. 각 단계 종료 시 **unload 후보는 Skills와 ephemeral search text에 한정**하고 실행 중인 P4 checkout 변경 사실, CL, Permission, Evidence manifest는 durable State에 유지. Compaction 후 정책·증거의 보존율 100%, Skill selection error 0, full-history 대비 verified task USD 등을 측정. 승인/submit 전에는 full provenance를 재검증. **평가: PoC 최우선.**

## 4. Open SWE #4575 — Acknowledged Idempotent Outbox와 Cost/Evidence Receipt

**원본:** [10/27 21:48 UTC 병합 PR](https://github.com/langchain-ai/open-swe/pull/4575); **mda/rt/outbox.py**, **openswe/agent_api/report_receipts.py**, **mda/tests/test_backend_calls.py** 및 DB migration.

**구현:** Agent Runtime이 Tool 결과·모델 Reply·Usage·Notification을 전송할 때 **50ms까지 모아 순서대로 batch**, backend의 receipt를 기다려 확인된 이벤트만 큐에서 제거한다. 미확인 이벤트는 backoff 재시도하고 명시적으로 3회 거절된 항목은 뒤의 이벤트까지 막지 않도록 처리한다. Pending Outbox를 graph checkpoint와 함께 저장해 프로세스가 재시작해도 **다음 run의 이벤트보다 앞서 재전송**한다. PostgreSQL은 delivery key의 중복 처리를 방지한다. 이미 checkpoint에 있는 Tool 결과는 복사하지 않고 참조한다. 중단된 실행을 무조건 성공시키는 기능은 아니며 반드시 필요한 backend call의 오류는 여전히 run을 실패시킬 수 있다.

**원문 정량:** Proxy refresh 변경 전 **20-run** 비교에서 report/notification HTTP **15.8→4.7회/실행(약 -70%)**, request+response body **10.4→12.5KB(증가)**. 별도 **60초 backend outage** 실험에서 27개 transcript event가 중복 없이 순서대로 복구됐다는 작성자 테스트. 현재 HEAD의 네트워크·실제 모델 bill과 동일한 수치가 아니다. rollout은 DB migration을 적용한 backend를 **먼저** 배포하고 MDA를 나중에 교체하도록 권장한다.

**P4 Harness:** 각 실행 Event에 **task_id, attempt, event_id, sequence, p4_client, changelist, evidence_hash, usage_receipt**를 저장하고 write-ahead/outbox→backend receipt→ACK 순으로 처리한다. TeamCity 결과 수집과 GitHub Wiki 반영은 멱등키(예: run+path+content_hash)를 둔다. 단 **p4 submit 자체는 event delivery와 별개의 외부 side effect**이므로 원격 CL state를 다시 확인한 뒤만 재시도한다. 60s/5min outage 및 재시작 100회에서 누락 0, 중복 알림 0, 허용되지 않은 재-submit 0을 요구. **평가: 바로 적용 원칙.**

## 5. Codex #57598 — 감시가 증명된 Empty Skill Discovery Cache

**원본:** [PR #57598](https://github.com/openai/codex/pull/57598), [커밋](https://github.com/openai/codex/commit/28cade4f5a7a41fe628791128ccff444a0996b5c) 10/27 23:53 UTC. 관련 **codex-rs/exec-server/src/server/missing_watch.rs**, **codex-rs/ext/skills/src/host_roots.rs** 및 mount/case/reconnect tests.

**메커니즘:** 원격 저장소에 .agents/skills 폴더가 없는데도 매번 메타데이터 RPC로 음성 결과를 확인하던 낭비를 줄인다. Linux executor의 **fs_watch_missing**, **fs/watchMissing**, **fs/missingChanged** 프로토콜을 추가한다. FileSystem·working directory·project root marker를 cache key에 포함하고, Executor가 해당 경로를 **실제로 감시한다는 ACK를 보낸 뒤에만** 빈 결과를 재사용한다. 새 폴더 생성·마운트 교체·연결 손실·수동 reload 등은 invalidate. Watch 불가능·등록 중이면 매번 정상 조회한다. 명시적 수치가 있는 controlled token/USD benchmark는 없다(수동 latency 테스트는 기본 ignored).

**Perforce 관점:** P4 depot의 특정 workspace에 Skill 파일이 없다는 사실도 **have revision / p4 sync generation / watch coverage**가 유지될 때만 캐싱한다. sync 후 Skill 추가가 조용히 누락되면 생산성·정확성 손실. 음성 결과 RPC 횟수, false-negative discovery, sync 이후 발견 지연, CPU를 측정한다. **평가: PoC.**

## 6. Codex #57584 — Token Truncation 중 Output Boundary·Evidence Anchor 보존

**원본:** [PR #57584](https://github.com/openai/codex/pull/57584), [커밋](https://github.com/openai/codex/commit/5078420b01eb8a4d2bc62e887d00068123fd52ec), **codex-rs/utils/output-truncation/src/lib.rs**, **truncate_tests.rs**, **core/src/tools/code_mode/mod.rs**.

**구현:** OutputBoundary가 **원본 item index와 UTF-8 text offset**을 기록하고, 모델에 전달할 output이 토큰 예산에 맞춰 잘렸을 때 retained text 안의 새 위치로 remap한다. 생략 안내 문구 생성 전의 end boundary를 유지한다. Text-only, text+audio 혼합, image, encrypted content 순서와 보존 구분을 처리한다. 소유권이 있는 Output item은 불필요한 media clone 없이 이동한다. 회귀 테스트는 0/nonzero budget, 중간·끝 경계, Unicode/UTF-8, owned/borrowed equivalence를 포함한다.

**효과:** 입력 Tool Output 길이 제한과 **Evidence 인용 범위의 정합성**을 함께 유지하는 기능. 단순 문자열 slice보다 잘못된 Line Ref/Tool Result 잘림을 피한다. Tool output이 잘렸다는 사실도 시스템이 알릴 필요가 있다. 모델 토큰 축약률은 budget 설정에 의존하므로 별도 수치 없음.

**P4 적용:** 10~100MB UE5/TeamCity 로그를 Artifact Store에 보관하고 모델에는 line ranges + snippet digest만 준다. Truncation 뒤에도 **원본 depot/revision/log URI/hash/span** 연결이 보존되는지 UTF-8·한글·stack trace·CRLF·multi-chunk 테스트 1,000개를 수행. 결함 로그의 진짜 실패 행을 제거하면 안 되므로 **symptom/cause/error summary recall**을 먼저 점검. **평가: 바로 적용 원칙.**

## 7. Open SWE #4662 — Shared Compiled Graph는 Model/Route별로 파티션

**원본:** [PR #4662](https://github.com/langchain-ai/open-swe/pull/4662) 10/28 17:17 UTC, **mda/agent.py**, **vendor/managed-deepagents-sdk** 및 shared_graph tests.

**문제:** 전일 Scout에서 graph compile 재사용 최적화(#4589)를 소개했지만, 실제 구현에는 Graph가 최초 placeholder Anthropic 모델을 기억하고 **길어진 비-Anthropic 세션의 summarizer조차 Anthropic을 호출**하는 문제가 있었다. 모델 창 크기를 잘못 판단하거나 인증 오류로 중단됐다.

**수정:** 2단계 shared_factory에서 매 실행 **graph kind + model + subagent model + gateway**로 재사용 key를 계산하고, miss일 때만 해당 key로 graph를 구성한다. Summarizer와 주 Agent의 model profile이 맞는다. 프로세스별 최대 **32개** 모델 구성 Graph Cache; vision / per-message routing은 별도 override를 유지한다. 이는 단일 graph 무조건 재사용보다 메모리를 더 사용하지만 재개·compaction 정확성을 높인다.

**P4 적용:** RuntimeAdapter와 CompactionPlan의 cache key에 **model_id, context_window, reasoning_effort, tokenizer_version, gateway_policy_hash**를 포함한다. Codex/Claude Code를 섞은 Worker Pool에서 어떤 provider로 비용 영수증·압축 호출이 발생했는지 대조. 모델 변경 50회 후 wrong-provider count 0, context overflow 0, graph cache hit/size 측정. **평가: 바로 적용 원칙.**

## 8. Agent Framework #9461 — Redis RAG Scope Identity를 정확하게 격리

**원본:** [10/28 13:50 UTC 병합](https://github.com/microsoft/agent-framework/pull/9461), **python/packages/redis/agent_framework_redis/_context_provider.py** 및 새 **test_context_provider_integration.py**.

**문제와 해결:** Redis TAG의 기본 case-insensitive 처리와 구두점 처리 때문에 **서로 다른 application/agent/user/thread/conversation 식별자가 같다고 검색될 위험**이 있었다. 업데이트는 원문 식별자는 메타데이터에 두되, 별도의 **domain-separated SHA-256 token**을 case-sensitive scope TAG로 색인한다. 사용자 입력 문서의 scope보다 provider 설정을 신뢰하며 hybrid/text/vector 및 search_all도 동일 scope 필터를 사용한다. 새로운 스키마와 맞지 않는 인덱스는 **fail closed**한다.

**주의:** 기존 beta RedisContextProvider Index는 **호환되지 않는다**. 구버전 Index와 context hashes 삭제 후 재생성이 필요하며 overwrite_index=true만으로 이행되지 않는다. 반드시 백업과 재색인 준비. Search scope를 넓히면 유사 문서 검색 Recall이 늘 수도 있으나 잘못된 작업·사용자의 Context가 모델에 섞이는 보안 문제보다 우선할 수 없다. Token 절감 데이터는 없다.

**P4 RAG:** depot, stream, project, workspace, user, agent role, tenant와 revision anchor를 각각 권한 scope로 정규화. **검색 이전에 ACL**을 적용하고 Query 후에도 Scope/Revision을 확인. 예: TeamCity 실패로그가 다른 Stream의 CL Evidence로 섞이지 않도록 회귀 테스트. 같은 단어 다른 대소문자/쉼표/Slash/Unicode 입력 조합 1,000개에서 cross-scope leakage 0. **평가: 바로 적용 원칙.**

## 9. OpenCode #59934 — Max Output Fit에 Context Window 1% 헤드룸

**원본:** [PR #59934](https://github.com/anomalyco/opencode/pull/59934) 10/28 19:37 UTC, **packages/core/src/session/model-request.ts** 와 **session-runner.test.ts**. 작성자 검증에 core 4개 테스트 파일 **282 tests pass**.

**고장 원인:** 모델 프롬프트 크기 추정이 Provider 내부 template·Tool Schema Tokens보다 몇 개 작을 수 있다. Max output을 딱 **window - input estimate**에 맞추면 실제 API에는 몇 token이 초과되어 거부된다. 특히 window 대비 output limit이 큰 모델에서 빈번하다.

**변경:** 정상 turn에서 output limit을 window에 맞춰 줄일 경우에만 **window의 1%를 reserve**한다. 예: window 262k면 약 2.6k, 1M이면 10k 정도. 원래 여유가 있는 요청은 바꾸지 않으며 **compaction 요청의 별도 reserve는 변경하지 않는다**.

**Trade-off:** prompt-too-long 재시도 감소가 기대되지만 output 최대 길이가 일부 줄어 긴 코드·로그 생성이 일찍 끊길 수 있다. 1%가 모든 provider/tokenizer 차이를 해결하는 보증은 아니다. UE5 긴 diff 작업에서 headroom 0%/1%/2%를 검증하고 overflow rate, 재시도 USD, answer truncated, verified tests를 함께 본다. **평가: 바로 적용 원칙.**

## 10. Open SWE #4627 — 대용량 Tool Result는 실제 실행 Sandbox의 Artifact Root로

**원본:** [PR #4627](https://github.com/langchain-ai/open-swe/pull/4627), **mda/rt/remote_files.py**, **managed_sandbox.py** 및 backend tests.

**배경:** 전일 graph 공유 구조에서는 graph가 MDA Sandbox를 선언하지만 실제 run은 다른 backend sandbox 또는 사용자 브리지에서 실행되기도 한다. 대량 Tool Output을 자동 offload할 때 graph 고정 Sandbox를 선택하면 **"This run has no sandbox"** 예외로 중단됐다. 작성자 PR은 10/26 이후 19개 Tool step 실패를 관측했다고 밝혔다.

**수정:** Run별 Catalog가 알려주는 **files.artifacts_root**를 기반으로 RunArtifacts/RemoteFiles를 고르고, box가 없는 실행은 backend file tool로 offload한다. 한 환경의 파일이 다른 사용자 로컬 머신의 root를 잘못 가리키지 않게 bridged 작업의 artifact root를 분리한다. 100,000자 Tool 응답을 비-MDA sandbox에서 offload/재조회하는 회귀 테스트를 추가했다.

**P4 적용:** Tool 결과와 직접 포함할 Context의 크기를 분리. 대용량 p4 describe, compile log, asset list는 URI+hash로 저장한 뒤 표본/에러 인덱스만 모델에 전달. Artifact 경로를 **task_id/run_id/workspace_id** 범위에 격리. 미존재 sandbox, 연결 끊김, 재개 후 다른 Worker, 권한 없는 다른 Task 열람을 회귀 테스트. Token budget은 작업별 별도 산출. **평가: PoC.**

## 11. Codex #57586 + #57568 — Subagent Life Cycle과 Background Memory Tier

**Host-reserved Child API:** [#57586](https://github.com/openai/codex/pull/57586)는 실행 중인 Tool call의 controller가 Child thread ID를 사전 예약하여 idle child를 만들거나, 정책/설정 및 fresh/forked history를 캡처해 **다른 ThreadManager에서 나중에 시작**하도록 한다. Parent가 종료돼도 detached startup 가능하지만 live binding을 옮길 수 없는 경우 요청을 거부한다. Opt-in HostToolInvocationLookup은 같은 turn의 duplicate call ID를 차단하며 invocation 종료 시 접근을 회수, 시작 실패/취소 시 provisional child를 정리한다. **기존 fork/subagent 개선과 달리 host가 child admission과 생명주기를 직접 제어하는 API가 신규성**이다. P4 Worker는 Parent의 승인권한을 자동 승계하지 않고 Child의 Tool grants·workspace lease를 새로 검증. **평가: PoC.**

**Memory Consolidation Tier:** [#57568](https://github.com/openai/codex/pull/57568)은 메모리 압축/통합 Worker가 대화의 고속 서비스 tier를 불필요하게 상속하지 않도록 **memories.consolidation_service_tier**를 도입한다. 기본은 **default(Standard)**, fast alias는 priority로 정규화되며 flex override도 가능하다. 느린 Tier가 비용을 낮추는지 여부는 가격/latency/timeout과 비동기 완료율에 달렸고 PR에 bill benchmark는 없다. P4 context index build/low-priority summarization만 별도 tier 라우팅하는 PoC가 적합. **평가: PoC.**

## 12. Open SWE #4678 — 다중 저장소 Git Evidence Scan의 병렬화

**원본:** [10/28 17:42 UTC 병합](https://github.com/langchain-ai/open-swe/pull/4678). 각 turn 전후 checkout 변경 여부를 확인하는 Git scan을 **최대 16개 worker**로 병렬화하고 모든 git command에 **20초 공유 deadline**을 둔다. 실패한 checkout만 건너뛰되 다른 repo의 결과는 보존하며, 이전 scan에서 실패한 checkout이 다음에 복구됐다고 거짓 변경으로 표시하지 않는다.

**작성자 수치:** 신규 Sandbox/24 checkouts, 각 2회 시험에서 첫 scan **3.06~3.51 → 2.02~2.50초**, 반복 scan **0.73~0.89 → 0.23~0.28초**. 원래 생산 환경에서 관측한 24~28초 지연은 해당 소규모 재현 실험에서 나오지 않았다. Token 절감 없음.

**P4 적용:** 10개 Stream/Client의 have-revision·opened·pending CL을 동시 확인할 때 RPC 폭주 제한을 둔다(예: concurrent=4~8). **프린트된 Git SHA만 근거로 UE5/P4 변경 상태를 판정하지 않는다.** P4 Client와 changelist를 분리하고 snapshot generation 및 Evidence Freshness 검사를 추가. latency p50/p95, RPC count, stale have-race 측정. **평가: PoC.**

## 13. Deep Agents #7358 — OpenRouter 경유 Claude Prompt Cache 기본화

**원본:** [PR #7358](https://github.com/langchain-ai/deepagents/pull/7358) 10/28 14:54 UTC, **libs/code/deepagents_code/config.py**와 config tests. OpenRouter의 model 이름이 **anthropic/**로 시작하고 명시적 cache_control 설정이 없을 때 ChatOpenRouter의 model_kwargs에 **cache_control type=ephemeral**을 추가한다. 명시적 None 또는 1h TTL은 유지하며 비-Anthropic OpenRouter 모델에는 영향을 주지 않는다.

**의미:** 모델 경유 Gateway에서 cache marker가 누락되는 구성 오류를 줄인다. 그러나 실제 cache hit/가격이 올바르게 전달되는지, OpenRouter가 요청별로 어떤 정책을 적용하는지는 원문에서 계량하지 않았다. P4 PoC는 direct Anthropic/OpenRouter의 동일 Prompt Prefix와 실제 usage 및 bill 항목을 비교하고 provider별 TTL 가격을 반영한다. **평가: PoC.**

## 14. Experimental Task Scheduler·Audit Tooling — OpenCode / Microsoft / Gemini CLI

**OpenCode Durable Scheduler:** [#59401](https://github.com/anomalyco/opencode/pull/59401) 10/28 20:06 UTC. experimental.schedules off가 기본이며, DB/Timer에 한해 단발/at/every/cron과 ends(after/at/times), timezone을 지원한다. 동일 메시지 ID를 재사용해 crash 후 중복 발행을 방지하고, 실행이 지연된 경우 **catch-up 1회**, 전송 실패 시 **5분 뒤 retry**, 이전 프롬프트가 unread 상태면 중복 wake를 건너뛴다. DST 반복 1시간도 한 번만 건드리도록 조절. 24 tests 통과 주장. **Agent/App에서 schedule을 생성하는 API는 아직 이 PR에 없다.** 직접 배포보다는 P4 Harness TaskLifecycle의 wake/admission 규칙 참고. **평가: 아이디어 참고/PoC.**

**Monty Artifact Capture Budget:** [Agent Framework #9802](https://github.com/microsoft/agent-framework/pull/9802) 10/28 19:46 UTC는 읽기/쓰기 마운트의 실행 산출물 캡처를 **최대 20개 파일, 원본 총 20MiB, 파일별 5MiB**로 제한한다. 실제 인코딩 전에 용량을 검증하고 커진 파일도 bounded read, 누락된 파일은 단일 omission summary로 보고한다. 크기 제한은 **디스크 Write 자체가 아니라 결과 첨부 캡처에만 적용**된다. UE5 로그/바이너리에서는 항상 별도 Artifact Store 참조가 필요. **평가: 바로 적용 원칙.**

**Gemini Extension Validation:** [Gemini CLI #29980](https://github.com/google-gemini/gemini-cli/pull/29980) 10/28 18:19 UTC는 **gemini extensions validate <path>**의 Manifest 검증, context file path traversal/존재, semver 및 MCP transport/URL validation을 추가했다. Linux tests는 확인되지만 모든 OS에서의 실제 배포 검증은 아니다. P4 Harness에 연결하는 Skill/MCP bundle의 정적 lint 검증 파이프라인에 대응한다. **평가: 바로 적용 원칙.**

## 15. 측정 가능한 Perforce·Claude Code·Codex Harness 로드맵

### P0 — 먼저 고정할 실행·보안 계약

- **Durable RunTicket:** task_id, attempt, generation, p4_port, p4_client, stream, base_cl, workspace_snapshot, model_id, context_window, policy_hash, tool_catalog_version, skill_set_hash, lease_owner, resumed_from, timeout. Secret/token 값은 영속 로그에 기록하지 않는다.
- **TaskLifecycle:** NEW → DISCOVER → PLAN → EDIT → EVIDENCE_PENDING → VERIFY → HUMAN_APPROVAL → SUBMIT → VERIFIED_DONE. 실패와 재시도는 FAILED_RETRYABLE / FAILED_TERMINAL로 구분. 외부 제출은 별도 idempotency check.
- **Context Partition:** Immutable System/Policy, versioned RunContext, role-scoped Skill/Tool catalog, checkpointed handoff, 검색된 일시성 Evidence를 구분한다. **모델에 보이는 schema를 숨기는 것만으로 권한이 생기거나 없어지는 것은 아니다.**
- **ToolEvidenceReceipt:** event_id, artifact_uri, source_depot_rev, output_hash, raw_span, visible_span, truncation_reason, completion_state. 이벤트와 사용자에게 노출할 summary는 별도 저장.
- **CostReceipt:** run/turn/agent/model/tier별 input, output, reasoning, cache-create, cache-read, request count, 실제 청구 USD, 과금 방식, 수집 출처, unknown marker. HTTP 바이트와 LLM token을 혼동하지 않는다.
- **RAG Scope:** tenant/user/agent/project/stream/CL/role 등을 검색 전과 검색 후에 검사한다. 다른 scope의 문서가 prompt에 들어오면 해당 작업은 실패로 처리한다.

### P1 — 재현 가능한 실험계획 (아래 기준은 제안치, 업스트림 측정치 아님)

| 실험 | 대상 및 A/B | 계측 | 합격 기준 |
|---|---|---|---|
| Provider-native MCP search | 50 Task × 150 Tools, eager / native-search / skillOnly | input+cache tokens, bill USD, tool Recall@1, added turns | 권한위반 0, tool-selection quality -1pp 이내에서 비용 개선 |
| Immutable Prompt Prefix | 40 Tasks × 5m/1h TTL, 정적/동적 Prompt | provider cache hit/write/read, bill, policy hashes | 지침 누락·구형 권한 인용 0, USD/verified task 감소 |
| Agent-triggered Skill Unload | 30 long sessions, 자동 Threshold vs phase unload | compact 전후 visible tokens, 재탐색, CI 성공률 | Evidence 손실 0, Task success 하락 0 |
| Durable Outbox | 100 events, 60s·300s outage, Worker restart | ack lag, duplicate receipt, missed event, repeated p4 submit | 중요 이벤트 유실 0, 중복 side effect 0 |
| Model-aware Graph | Claude / Codex / Gateway 섞은 50 resumes | summarizer provider, context-window, graph cache hit | wrong provider 0, 잘못된 compaction 0 |
| P4 RAG Scope | 1,000 scope-collision cases: case/slash/punctuation/Unicode | retrieval leakage, recall, precision | cross-scope leakage 0 |
| Tool Output Evidence | 1,000 UE5/TeamCity logs, 100k+ characters | span/hash correctness, root-cause recall, prompt tokens | 잘못된 evidence anchor 0, 중요한 오류 누락 0 |
| Negative Skill Watch | Skill 없는 repo → P4 sync → 새 Skill 생성 | RPC, stale negative cache, discovery latency | 새 Skill 누락 0, RPC 감소 |
| Token Safety Headroom | 30 task × window reserve 0/1/2% | overflow, retries, output truncation, USD | 오류/재시도 감소, 검증 품질 무저하 |

**우선 작업 순서:** 1) **Budget/Usage/Evidence Receipts**를 수집하는 공통 Harness Adapter 작성 → 2) 150 Tools 단계적 공개와 불변 System Prefix A/B → 3) resume/outbox 권한·증거 안전성 → 4) 검색 Scope와 Compaction 시점 자동화. P4-submit, 삭제, 권한 변경은 실험에서도 기본적으로 read-only/sandbox 클라이언트로 수행하고 운영 Depot에는 별도 승인 후 진행한다.

## 16. 릴리스 경계, 보류·중복 제외, 확인 수준

- **Claude Code:** 공식 [v2.1.312](https://github.com/anthropics/claude-code/releases/tag/v2.1.312)는 **10/27 20:24 UTC** 출시되어 전일 Scout에 이미 포함됐다. **이번 구간 신규 Stable Release 확인 없음**; 기존 대형 CLAUDE.md/compaction 수정 재보고 제외.
- **Codex:** Stable [rust-v0.165.0](https://github.com/openai/codex/releases/tag/rust-v0.165.0)은 **10/27 20:09 UTC** 공개(전일 보고). 이번 기간 [rust-v0.166.0-alpha.5.1](https://github.com/openai/codex/releases/tag/rust-v0.166.0-alpha.5.1)(10/28 19:17 UTC) 등의 **alpha**는 확인되지만 HEAD PR의 Stable 포함은 보장하지 않는다.
- **OpenCode:** [v2.2.0](https://github.com/anomalyco/opencode/releases/tag/v2.2.0)(10/27 09:04 UTC)은 전일에 다룸. [v1.19.5](https://github.com/anomalyco/opencode/releases/tag/v1.19.5)(10/28 06:17 UTC)는 레거시 1.x 채널이며 2.x의 이번 HEAD 기능이 포함된 릴리스라고 오해하지 않는다. 10/28의 Scheduler와 Context Headroom은 **dev/main 병합**, 안정 2.x 릴리스에 배포 확정 아님.
- **Agent Framework:** 현재 공식 Python release [python-1.23.0](https://github.com/microsoft/agent-framework/releases/tag/python-1.23.0)(10/22), .NET [dotnet-1.26.0](https://github.com/microsoft/agent-framework/releases/tag/dotnet-1.26.0)(10/23). 10/28 merged PR은 **main/HEAD** 기준.
- **Gemini CLI:** [v0.66.0](https://github.com/google-gemini/gemini-cli/releases/tag/v0.66.0)(10/27 20:26 UTC) stable 및 [v0.67.0-preview.0](https://github.com/google-gemini/gemini-cli/releases/tag/v0.67.0-preview.0)(10/27 20:07 UTC)와 코드 HEAD를 구분. Extension validate의 main merge가 stable에 포함됐다고 단정하지 않는다.
- **아직 신규 정량 효과로 판정하지 않음:** Open SWE 1h Prompt Cache, Deep Agents Tool Search, OpenRouter cache marker, Codex memory tier는 공식 코드/테스트가 있어도 동일 작업의 cache/bill 수치가 없다. Shorter prompts, reduced API calls, faster CPU execution을 달러 비용 절감으로 환산하지 않는다.
- **조사 주제별 상태:** tool progressive disclosure(신규), skills discovery negative cache(신규), compaction/skill unload(신규), prompt cache/run handoff(신규), tool output truncation/offload(신규), retrieval scope(신규), durable outbox/task lifecycle(신규), model routing(신규); 일반적인 context pruning/RAG 안내나 이미 소개한 TokenEconomizer·ContextBench 정량 성과는 **중복 제외**.
- **근거 등급:** A=공식 Stable release note, B=merged PR + 변경 파일 + unit/integration tests, C=PR 작성자 실험/수치(독립 재현 없음), D=Issue/Discussion 단독 주장. 본 보고서의 대다수 신규 소스는 B이고 벤치마크 숫자는 C. 한국어 해석과 P4 PoC는 저자의 설계 제안이지 upstream 보장 기능이 아니다.

---

**조사 종료 기준:** 2026-10-29 05:56 KST. GitHub canonical 저장 여부 및 전체 원문 read-back은 게시 작업에서 별도 검증한다. 날짜별 보고서는 **ai/trend/**에만 저장하며 다른 카테고리에 복제하지 않는다.
