---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-25"
date: 2026-10-25
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, durable-state, open-swe, deepagents, opencode, claude-code, perforce, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-10-25

> **조사 기준:** 2026-10-25 약 05:56 KST(2026-10-24 약 20:56 UTC). 직전 Scout(10/24 05:58 KST) 이후 공식 릴리스·GitHub 커밋과 테스트를 주로 확인했다. 코드의 변경, 제작자 측정 수치, 자체 미실행의 설계 가설을 구별한다. **오늘 공개된 새 모델 토큰 절감률·동일 작업 대비 USD 절감률 벤치마크는 확인되지 않았다.** 숫자가 있는 변화는 주로 CLI 시작 지연·I/O 및 Tool 실행 안정성이다.

## 1. 전일 대비 신규성 검사와 판단

중복 비교: [10/24](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-24.md), [10/23](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-23.md), [10/22](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-22.md) 원문과 [Wiki 문서 게시 스킬](https://github.com/jaywapp/wiki/blob/develop/ai/skills/github-document-publishing.md) 및 [문서 분류 규칙](https://github.com/jaywapp/wiki/blob/develop/ai/Orchestration.md). 전일 다룬 TokenEconomizer 18.4~30.9% cache-aware 비용, ContextBench CodeNib 500-task, Deep Agents의 Checkpoint 55% 저장 절감과 usage endpoint, Codex Guardian budget, Claude Code 2.1.309, Open SWE typed runtime/skill 격리는 **신규로 재계산하지 않는다**. 이번에는 그 이후의 구체적인 릴리스·커밋을 대상으로 한다.

| 우선 | 실제 신규 변경 | 직접 확인한 구현/수치 | 모델 Token/비용 효과 | 평가 |
| --- | --- | --- | --- | --- |
| 1 | Open SWE #4511: backend-owned typed inbox + 수신 receipt | 기존 3 middleware의 full conversation 검사 제거, `inbox(run_id)` / `inbox_received` 분리 | 호출당 모델 토큰 절감 미측정; 상태 조회/중복 처리 최적화 | **PoC** |
| 2 | Claude Code v2.1.310: dense-input compaction 회귀 수정 | Prompt-too-long 뒤 과다 이력 잔존, headless 대형 transcript 메모리 개선 | 반복 실패/재압축 방지 기대, 수치 미공개 | **바로 적용 검증** |
| 3 | OpenCode #58562→#58765: 실제 청구액과 catalog 추정 분리 | `Usage.cost`가 있으면 0 포함 우선, allowance는 session message에서 제거 | **계측 정합성**; 토큰 절감 아님 | **바로 적용 원칙** |
| 4 | Deep Agents SDK 0.7.32: provider import 지연 | Anthropic 미사용 SDK import 0.491→0.298s; OpenAI 미사용 실험 0.550→0.425s | API 토큰 무관, cold start 시간 감소 | **바로 적용 검증** |
| 5 | Deep Agents Code #7214/#7215: 시작 경로 분리 | 그래프 ready 193→151ms(healthy 이후), TUI first paint 0.473→0.355s | 모델 호출 절감 아님 | **PoC/참고** |
| 6 | Open SWE #4545: 필요할 때만 MCP tool hash suffix | 안전한 경우 10자리 hash 제거, ambiguous name은 유지 | Tool schema 크기 소폭 감소 가능, 미측정 | **바로 적용 원칙** |
| 7 | OpenCode #58694: usage limit 조회/예산 오류 분류 | budget·rolling/weekly/monthly meter 조회, model/workspace 구분 | 불가능한 재시도·비용 낭비 방지 가능, 미측정 | **PoC** |
| 8 | Open SWE #4538: 사용자 승인 전 리뷰 코멘트 | 사용자 review page 발화만 허용, pending review·diff-line 확인 | 검증 품질/권한 정합성, 절감 아님 | **PoC** |
| 9 | OpenCode #51133, #58749: plugin activation·instruction glob 수정 | step/tool 전 활성화 대기, 다중 디렉터리 절대 glob 보정 | 지침 누락/구버전 컨텍스트 방지, 수치 미공개 | **바로 적용 원칙** |
| 10 | OpenCode #58350: 부정확한 MCP Tool만 격리 | SDK 동일 schema 검사에서 개별 Tool을 filter | 전체 도구 탐색 재시도 감소 가능, 미측정 | **PoC** |
| 11 | Daytona Sandbox 0.0.9: deadline 및 timeout partial output | 전체 실행 경로 단일 deadline, 124 + partial log, cleanup 2초 | Tool 반복/재현 비용 감소 가능, 미측정 | **바로 적용 원칙** |
| 12 | Open SWE #4513: 레거시 client 회귀 차단 | 추가되는 `langgraph_client` 참조를 CI에서 거부 | runtime 전환의 아키텍처 drift 방지 | **아이디어 참고** |

## 2. Open SWE #4511 — Typed Inbox, Owed State, Delivery Ledger

**신규성·원본:** 2026-10-24 18:26 UTC 병합 [#4511 commit](https://github.com/langchain-ai/open-swe/commit/a98756552101087d4dfbf57832e10c08b7845c23); `openswe/threads/inbox.py`, `openswe/tasks/messages.py`, `openswe/webhooks/event_matches.py`, `mda/rt/middleware.py`, `packages/runtime-api/src/runtime_api/loop.py`, DB migration `0082_14cf183ef936_track_event_match_delivery.py`. 테스트 `tests/threads/test_inbox.py`, `tests/e2e/tests/inbox.spec.ts`, `mda/tests/test_backend_calls.py`를 확인했다.

**내부 동작:** 이전에는 follow-up queue, event match, task message라는 세 backend middleware가 `before_model` 시점에 작업의 대화 전체를 읽어 전달 대상을 선별했다. 신규 `ThreadInbox`는 백엔드 DB의 '아직 전달해야 할 것'을 관리한다. MDA가 모델 호출 전에 `inbox(run_id)`를 요청하면 `messages`(oldest-first), `update`(reply surface 등), `items`(queue item ID, event UUID)를 응답한다. `before_model`이 실제 모델 호출을 허용한 때에만 `inbox_received` receipt를 비동기 report queue에 넣는다. 다음 inbox read는 앞선 receipt queue의 완료를 기다려 중복 전달을 막는다. 모델 호출이 시작되지 않고 phase가 종료/오류가 나면 메시지는 여전히 owed이다. DB의 `event_match.delivered_at`을 신규 추가했고 과거 이벤트는 migration에서 전달 완료로 마킹한다. Busy thread는 다음 model call에 enqueue되고, idle thread는 run이 생성된다.

**토큰·컨텍스트 원리:** 기존 full conversation을 통한 '수신 여부 확인' 대신 작은 typed selective inbox를 사용하여 **상태 I/O와 중복 메시지 삽입 위험**을 줄인다. 모델의 대화 본문 길이 자체가 줄었다는 증거는 없다. 시스템 장애 시 receipt가 중복 또는 누락되면 동일 메시지 재주입 가능하므로 'exactly once'를 무조건 주장하지 않는다. 선행 DB migration, 응답 순서, model-call admission과 receipt 발송 사이의 crash window가 Trade-off.

**P4 Harness PoC:** `MessageOwed(task_id, run_generation, source_event_id, delivered_at, payload_ref, receipt_seq)`와 `before_model` inbox 조회를 분리. TaskLedger에 Task/TeamCity/P4 update의 통지 상태를 두고 모델에 전달할 요약만 inline, 원문 로그는 artifact URI로. 30개 작업에서 (A) 대화 scan형 (B) typed inbox형을 비교: 대화 조회 byte/DB query, 중복 전달률, crash-restart 누락률, model input 토큰, 작업 결과 검증률. **판정: PoC** (durable state·handoff 분야에서 오늘 최우선).

## 3. Claude Code v2.1.310 — 반복 압축 회귀와 Headless Context Memory

**신규성·원본:** Anthropic [v2.1.310 공식 릴리스](https://github.com/anthropics/claude-code/releases/tag/v2.1.310), 2026-10-23 23:39 UTC. 전일의 v2.1.309 nested CLAUDE.md truncate/compaction 수정과 **다른 입력 경로**의 회귀 수정이다. CLI 본체의 구현 소스 전체는 공개되지 않았으므로 구체적 내부 threshold는 추측하지 않는다.

**내부 동작(공식 릴리스에서 검증):** 매우 조밀한 text(base64/SVG 등) 때문에 'Prompt is too long'이 발생한 뒤 압축해도 이력이 지나치게 남아 다음 요청이 다시 실패하던 문제를 수정했다. `-p`/Agent SDK 비대화형 실행에서 transcript 파일이 클 때 compaction 메모리 소비도 개선했다. MCP elicitation 답변이 없어 headless tool timeout이 난 경우 모델에 '답변이 없어 발생한 타임아웃이므로 같은 호출 반복 금지'를 전달한다. Bedrock/Vertex/Foundry 및 telemetry 제한 환경에 Monitor 도구·plugin monitor 경로를 확장했으며 foreground 장시간 sleep을 제한한다. 일부 gateway가 legacy effort beta 또는 mid-conversation system message를 거절할 때 호환 입력으로 재시도하는 수정도 포함된다.

**절감 원리·한계:** 불필요한 여러 차례 요약, 실패한 prompt 재전송, unanswered elicitation 재호출을 막을 수 있지만 Anthropic이 수치/개별 축약 알고리즘을 공개하지 않았다. Gateway fallback은 cache key/prompt 형태 변화를 동반할 수 있으므로 cache-hit 향상이라고 단정할 수 없다. 어떤 요약이 필요한 보존 지시를 잃는지 검증해야 한다.

**Perforce 검증:** Claude 2.1.309→310에서 ① 100KB+ 밀집된 UE5 diagnostic/base64 테스트 파일, ② 1MB+ 대화 이력/headless `-p`, ③ 답변 없는 MCP elicitation, ④ 캐시 헤더 제한 gateway를 각각 mock으로 재현한다. `compaction_count`, retry_count, RSS peak, API input/cache tokens, 필수 policy recall, p95 완료시간을 비교. P4 submit은 이 수정만 믿고 재호출하지 않는다. **장점:** 토큰 낭비/장애 회피 가능. **단점:** 압축 과정 정합성·시스템별 차이 미측정. **판정: 바로 적용 검증.**

## 4. OpenCode — Provider-reported Cost의 권위와 Subscription Limit의 별도 표현

**신규성·원본:** [#58562](https://github.com/anomalyco/opencode/commit/4cba1b7f5ded9b9fb3a3336baa1510b1ed3378aa) (10/24 08:32 UTC), 후속 [#58765](https://github.com/anomalyco/opencode/commit/de284dc1bc3d319ad40672c3d9704e00c3205f01) (10/24 18:05 UTC). 최종 소스 `packages/core/src/session/usage.ts`, `packages/ai/src/protocols/shared.ts`, provider tests를 확인. **초기 커밋의 allowance 필드가 최종 형태로 유지된다고 오독하지 않는다.**

**내부 동작:** `SessionUsage.record`에서 provider가 보고한 `usage.cost`가 있으면 catalog price 추정 대신 그 값을 쓴다. **0도 유효한 실제 보고값**이다. 미보고 시 모델 catalog의 input/output/reasoning/cache read/cache write 단가를 적용한다. 첫 커밋은 Go allowance를 generic session/usage에 넣었지만 후속 커밋은 allowance를 AI Usage/session event/message에서 제거하고, 사용량 제한은 독립 `UsageLimits` 모델/endpoint로 취급한다. Session 비용은 billed dollar와 estimated dollar를 source별로 구분해야 한다.

**토큰/비용·Trade-off:** 실제 모델 token 감소 없음. 대신 할인·subscription·gateway 경로가 catalog price와 달라 생기는 **비용 비교 오류**를 막는다. Provider가 cost 필드를 잘못 반환할 때 권위가 잘못될 수 있으므로 provider raw receipt를 함께 보관한다. `estimated_cost`와 `reported_billed_cost`를 혼합 집계하지 않는다.

**P4 적용:** `CostReceipt(provider, model, request_id, token_usage, cache_read/write, provider_reported_usd|null, pricebook_usd, billable_usd, source, timestamp)`. 요청별 provider=0을 0 그대로 인정하는 fixture, partial usage, resumed turn, multiple provider routing, subscription limit을 별도 테스트. 성공 CL당 `USD/verified-CL`로 평가. **판정: 바로 적용 원칙.**

## 5. Deep Agents 0.7.32 — Lazy Provider Imports와 Cache Middleware 호환

**신규성·원본:** [deepagents==0.7.32 공식 릴리스](https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.32), 2026-10-23 21:30 UTC. [Anthropic import 지연 #7204](https://github.com/langchain-ai/deepagents/commit/492a184c5fc07364edaae464dd0bdc4e49af3e9e), [OpenAI import 지연 #7185](https://github.com/langchain-ai/deepagents/commit/1fe963145de49dd62af807bff1b0e96f24c9ae07). 소스 `libs/deepagents/deepagents/graph.py`, `middleware/_prompt_caching.py`, `_skill_tools.py`, `unsupported_content.py`, `_utils.py` 및 unit tests.

**내부 동작:** provider 객체의 class 확인 때문에 import 시점에 `langchain_anthropic`/`langchain_openai`를 로드하던 코드를 `sys.modules` 조회/지연 타입 확인으로 바꿨다. Anthropic의 PromptCaching middleware도 lazy stand-in을 사용하되 실제 provider 모델을 선택하면 동작하게 하고, `excluded_as`를 통해 기존 middleware exclusion 설정과 호환한다. Tool schema의 Anthropic/OpenAI 변환은 필요한 시점에 수행.

**제작자 실측:** #7185는 fresh/warm 환경 best-of-5에서 SDK import **0.550→0.425초(-125ms)**, #7204는 별도 fresh interpreter best-of-8에서 **0.491→0.298초(-193ms)**. 테스트 기준이 다르므로 두 수치를 더하거나 동일 조건의 상대 절감률로 합산하지 않는다. 이는 **Python 초기 import latency**이지 LLM inference token 절감이 아니다. 어떤 provider가 쓰이는지에 따라 이점이 달라지고 lazy init 첫 호출 지연이 발생할 수 있다.

**P4 적용:** Claude/Codex 모델별 runtime adapter와 Skill/Tool provider를 eager import하지 말고 필요할 때 load; 단, cache middleware·capability checks는 첫 요청 전에 준비된다. 30회 cold-start, import RSS, 첫 token p95, 첫 Tool success, cache-control 보존을 실측. **장점:** daemon/short-lived worker 초기 비용 감소. **단점:** 첫 호출 이후 warmup 비용 이동. **판정: 바로 적용 검증.**

## 6. Deep Agents Code #7214/#7215 — Prefetch와 Critical-path Instrumentation

**신규성·원본:** 10/23 21:31~21:42 UTC 병합 [#7214](https://github.com/langchain-ai/deepagents/commit/4d461e3ab01e2c5ef9f96b2a5fb099907960d78c), [#7215](https://github.com/langchain-ai/deepagents/commit/470b0753986696b41952c772acd2ee316f930890). `libs/code/deepagents_code/offload_api.py`, `app.py`, `config.py`, `main.py`, 관련 `tests/unit_tests/test_offload_api.py`와 `test_config.py`.

**#7214 구현/수치:** Server startup 시 `get_server_runtime()`을 비동기로 시작하여 클라이언트 health polling과 graph construction을 겹치고 첫 request에서 이미 생성된 graph를 재사용한다. shutdown 시 미완료 작업을 취소하고 startup error를 보존한다. `itest:fake`/tracing off 12회 interleaved median: **healthy 관측 뒤 graph ready 193→151ms(-42ms)**, server spawn 기준 **1538→1472ms(-66ms)**. 내부 단계가 겹쳤지 모델 token이 감소한 것은 아니다.

**#7215 구현/수치:** LangSmith tracing+secret redaction을 켠 interactive TUI에서 redacting client 설치를 초기 렌더 뒤 worker로 이동. 다만 모델 생성 전에는 redaction이 반드시 완료되도록 유지하며 설치 실패 재시도와 새로운 auth credentials를 보존한다. tracing/redaction enabled, unreachable endpoint, 10회 interleaved median: **첫 화면 0.473→0.355s(-118ms)**, server ready **1.720→1.784s** (제작자가 ±200ms 수준의 노이즈로 표기). 비대화형/ACP/subcommand/bootstrap 경로는 대상 아님.

**적용·Trade-off:** Perforce syncer·TeamCity agent·LLM worker가 여러 개 실행될 때 warmup과 health polling을 병렬화하되 **health OK와 ready-to-run은 구분**한다. Secret redaction 및 정책 Hook은 모델/Tool dispatch 이전 barrier다. 초기 화면 속도와 실제 submit 가능 시점이 다를 수 있다. **판정: 시작 최적화 PoC / 토큰 절감 목적으로는 가치 낮음.**

## 7. Open SWE #4545 — MCP Tool Name의 안전한 경량화

**신규성·원본:** 2026-10-24 20:25 UTC [#4545](https://github.com/langchain-ai/open-swe/commit/b80d5fa4abcb48cfb77f2561572495d60ddfdd8e), `openswe/mcp/runtime.py`의 `_tool_name`과 `tests/tools/test_workspace_mcp_tools.py`.

**내부 동작:** 모든 MCP 이름에 10자리 hash를 붙였던 방식 대신, `mcp_<connection>_<tool>` 이름이 그대로 안전하고 64자 이하며 connection 명칭에 underscore가 없고 hashed-name처럼 끝나지 않으면 접미 hash를 생략한다. 특수문자 치환, 64자 초과 절단, connection 내 underscore 등 collision 위험이 있으면 hash suffix를 유지. 이름은 각 (connection,tool) 쌍만의 함수이므로 서버 신규 연결로 기존 이름이 바뀌지 않는다. 공식 예: `mcp_linear_search`.

**절감 원리:** Tool name이 짧으면 반복 노출된 schema 및 assistant Tool call 표기에 문자열 바이트가 줄어들 수 있다. 다만 tokenization/캐시 구조에 따라 실제 Token 감소는 다르며 **공식 benchmark 미공개**. 기존 thread history의 오래된 hashed name과 현재 Tool name이 달라지는 이행 위험이 있다. **P4 적용:** `p4_files`, `p4_describe` 등 Tool 이름 충돌 검사를 중앙 registry에서 하고 normalized namespace→stable ID를 분리 보관. 100 Tool로 schema tokens·cache hit·tool call 오류율·resume 호환성 실험. **판정: 바로 적용 원칙(명명 규칙), 효과는 PoC.**

## 8. OpenCode #58694 — Workspace Budget·Quota-aware Model Routing

**신규성·원본:** 2026-10-24 16:13 UTC [#58694](https://github.com/anomalyco/opencode/commit/e42f6d101663122d239382abefb6977335b272de), `packages/core/src/usage-limits.ts`, `packages/core/src/session/to-session-error.ts`, `packages/schema/src/usage-limits.ts`, `packages/server/src/handlers/usage.ts`, unit tests.

**내부 동작:** 연결된 OpenCode Console workspace의 `GET /api/policies/current-budgets`와 Go 사용률 `/zen/go/v1/usage`를 읽는다. API 두 개는 동시 조회하되 전체 15초 timeout. Budget에는 limit/spent, scope, model coverage, reset time이 있고 Go meter는 rolling·weekly·monthly 각각 percent/rate-limited/resetsAt이다. Provider Error의 `BudgetLimitError`를 model-specific 또는 workspace-wide 예산 초과로 분리한다. 연결/권한 부재는 가용 여부와 구분한다. 이는 **OpenCode Console 연결자 전용 구현**이며 임의 Claude/Codex 계정에 동일 endpoint가 존재한다고 가정해서는 안 된다.

**토큰 원리·위험:** 예산 소진 상태를 quota failure와 구분하여 무효 재시도/불필요한 Tool 탐색·LLM 호출을 줄이고 승인된 다른 모델로 라우팅할 여지를 준다. 절감 USD, successful-route ratio는 새로 공개되지 않았다. Quota 조회 실패 시 fail-open 추측 라우팅을 피하고, 가격/데이터 보존/권한 정책을 만족하는 후보만 선택해야 한다. **P4 PoC:** ProviderAvailability(model_id, budget_scope, remaining, reset_at, freshness, error_category)를 두고 `quota_exceeded`/`budget_exceeded`는 cooldown, `rate_limit`은 Retry-After, `network_error`는 별도 회복 전략. 30-task simulation에서 wasted retry, resolved tasks, fallback 품질, USD 측정. **판정: PoC.**

## 9. Open SWE #4538 — Reviewer가 본 Diff와 사용자 권한을 결합

**신규성·원본:** 2026-10-24 18:27 UTC [#4538](https://github.com/langchain-ai/open-swe/commit/c349f6c6b5db0746489574c2c1e997d9eae2a239), `openswe/tools/add_review_comment.py`, `note_on_diff.py`, `diff_lines.py`, `openswe/resources/prompts/tools/add_review_comment.md`, UI diff search 및 e2e tests.

**내부 동작:** UI에서 diff 내 위치로 검색/안내하는 `note_on_diff`는 사용자 개인만 볼 수 있다. `add_review_comment`는 사용자가 해당 PR review page에서 보낸 메시지인 경우에만 동작하고, 현재 PR URL과 run config를 비교하며 사용자 GitHub identity 및 repo 접근권한을 검증한 뒤 **그 사용자 pending review**에 주석을 추가한다. Slack/백그라운드 등 다른 출처에서는 자기 명의 pending review를 조용히 조작하지 못하게 막는다. 실제 comment 생성과 **최종 review submit/publication은 별개**이며 assistant가 후자를 이미 완료했다고 말하면 안 된다. Row/side/range도 diff에 속하는지 검증한다.

**토큰/품질 Trade-off:** 모델 호출 감소보다 **evidence verification·권한 경계·human approval** 강화. UI와 GitHub review API 결합/정합성 비용 증가. **P4 Harness 적용:** CL diff anchor(`depot_path, base_rev, target_rev, line, side, evidence_sha`)에 내부 reviewer note와 제출 예정 comment를 분리. 사용자가 실제 review 화면에서 승인한 내용만 P4 review artifact로 게시하고, 핵심 제출/병합은 별도 권한. **판정: PoC.**

## 10. OpenCode #51133/#58749 — Dynamic Plugin과 Instruction Discovery 일관성

**원본:** [#51133](https://github.com/anomalyco/opencode/commit/b64cc80db3c933c7a83980b1f36eef047551c845) (10/24 06:15 UTC), [#58749](https://github.com/anomalyco/opencode/commit/99845391b73691cb1a5ea6442bb13912a2bde00f) (10/24 17:42 UTC). `packages/core/src/session/runner/llm.ts`, `packages/core/src/config/plugin/instruction.ts`, `packages/core/test/session-runner.test.ts`, `instruction-discovery.test.ts`.

**구현:** Plugin은 모델 turn 사이에도 reload될 수 있다. #51133은 새 step에서 context 선정/compaction 복원 전에 `plugins.awaitActivation`을 호출하고 tool execution 시에도 activation settled 상태를 확인한다. agent/model/skill/tool 권한의 서로 다른 세대가 혼합되는 회귀를 줄인다. 테스트에서 drain·step1·tool·step2 시점 4개 wait 관측을 검증. #58749는 `~/notes/**/*.md` 같은 절대 glob을 basename만으로 검색해 다중 디렉터리 파일을 놓치던 문제를 수정한다. 문자 그대로 존재하는 부모 폴더는 기존 스캔 경로를 유지하고, 그렇지 않은 패턴은 전체 absolute glob로 탐색한다.

**토큰·Trade-off:** Prompt 변경 후 stale/incomplete instruction 재호출을 막아 불필요한 retry 가능성을 줄이나 실제 모델 토큰 절감률은 미공개. 매 단계 activation barrier는 latency를 늘릴 수 있고, glob 확장으로 불필요한 instruction을 더 많이 읽을 가능성도 있으므로 **입력 파일 수/총 바이트 상한**을 별도 둬야 한다.

**P4 적용:** `RuntimeGeneration`의 model route, plugin version, skill manifest SHA, tool ACL을 같은 snapshot에서 발급; 미완료 plugin reload일 때 Tool 시작 금지. `AGENTS.md/CLAUDE.md` 구성 파일 매칭을 absolute/depot path case·glob 테스트로 검증. 100개 glob fixture, 중간 reload, denied tool 0, 누락 필수 instruction 0. **판정: 바로 적용 원칙.**

## 11. OpenCode #58350 — MCP Catalog의 Fault Isolation

**원본:** [#58350](https://github.com/anomalyco/opencode/commit/2dc8db4a9da777dc03aec112aec891d5bd79211d), 2026-10-24 17:45 UTC, `packages/core/src/mcp/client.ts`와 `packages/core/test/mcp.test.ts`.

**구현:** MCP SDK는 `tools/list` 응답 전체를 schema validation하므로 단 한 개 잘못된 Tool 때문에 서버의 모든 정상 Tool이 실패할 수 있었다. OpenCode는 SDK가 해당 protocol era에서 실제 사용하는 codec과 동일한 validation을 이용해 개별 Tool을 검사하여 부적합한 항목만 삭제하고 warning(log/tool/error)을 남긴 뒤 정상이 남은 원본 응답을 SDK에게 전달한다. Tool-list 자체가 잘못되면 억지 수정하지 않고 SDK 오류로 처리.

**토큰/비용:** 불필요한 재연결/도구 목록 재요청을 줄일 여지가 있지만 정량 미공개. 스키마가 변경·업데이트 중인 서버의 Tool을 제거해 유용한 기능을 숨길 위험이 있으므로 제외 항목을 관찰할 수 있어야 한다. **P4 적용:** 사내 MCP의 `p4_describe`/`teamcity_build` 등 스키마 오류가 있을 때 다른 read-only Tool을 계속 제공하고, 변조/불법 Tool은 별도 security gate에서 거부. 정상 Tool 20 + 불량 1 fixture, 회복률·schema tokens·누락 Tool ratio 기록. **판정: PoC.**

## 12. LangChain Daytona 0.0.9 — Timeout 시 Partial Tool Evidence 유지

**신규성·원본:** [langchain-daytona==0.0.9 릴리스](https://github.com/langchain-ai/deepagents/releases/tag/langchain-daytona%3D%3D0.0.9), 2026-10-23 21:18 UTC, 관련 [#7121](https://github.com/langchain-ai/deepagents/commit/10c02fe01678b976eb2ce6a73e17820215700955), `libs/partners/daytona/langchain_daytona/sandbox.py` 및 tests. 구현 커밋은 릴리스 이전이며 **오늘 새로 릴리스된 계약**으로만 분류.

**내부 동작:** `DaytonaSandbox.execute`의 session setup→command start→polling→log retrieval에 하나의 end-to-end deadline을 적용. Timeout 시 가능한 partial logs를 수거해 `exit_code=124`로 반환하고 session cleanup은 공동 2초 예산 내 처리. Tool 실패를 빈 결과로 덮지 않아 원인 분석 가능한 증거를 보전한다.

**토큰/Trade-off:** 재실행하지 않고 부분 로그로 분기 가능하지만 부분 로그만 보고 성공 판정하면 위험. 완료 여부가 불명확한 원격 side-effect에는 authoritative status 조회가 필요하다. 사용자 환경에서 토큰 절감 미측정. **P4 적용:** TeamCity/UE5 build의 bounded poll + partial output receipt(`truncated=true, complete=false, source_sha`). 실패·timeout에서 `p4 submit`을 무조건 재시도하지 않고 CL/CI 서버 상태를 재조회. **판정: 바로 적용 원칙.**

## 13. Open SWE #4513 — Runtime Adapter Migration의 자동 강제

**원본:** [#4513](https://github.com/langchain-ai/open-swe/commit/e72da4d8e722b6ed3b66439be6c0c73c8b5c2fc2), 2026-10-23 23:08 UTC, `scripts/check_langgraph_client.py`, `.github/workflows/ci.yml`, `AGENTS.md` 및 tests.

**내부 동작:** backend에 새로 추가되는 `langgraph_client`/`get_langgraph_client` 참조를 PR diff 단위에서 탐지·차단한다. 이미 존재하는 레거시 호출과 삭제는 허용한다. 신규 실행은 MDA runtime, thread 상태는 PostgreSQL로 옮기는 아키텍처 방향을 CI에서 enforce한다.

**의의:** 모델 token 감소와 무관하지만 runtime adapter 이중화/회귀를 방지한다. 단순 문자열 검사라 alias·동적 import 등은 놓칠 수 있고 예외 사항 false positive도 생길 수 있다. **P4 적용:** `p4.exe` wrapper와 TaskLedger 신규 코드가 직접 Perforce 명령·임의 로컬 상태를 중복 사용하지 않도록 Repo CI 검사(허용된 adapter만 remote action 수행). **판정: 아이디어 참고 / runtime 통합이 실제로 진행 중이면 바로 적용.**

## 14. 지속 추적: 이번 기간에 신규 정량 결과가 없는 분야

- **Codex 본체:** [openai/codex 최근 commits](https://github.com/openai/codex/commits/main/)는 이번 비교 구간 이후 신규 commit을 확인하지 못했다. 0.164.0 안정 릴리스(10/23 04:48 UTC)와 0.165.0-alpha.1(10/23 14:09 UTC)은 전일 cutoff 이전이므로 이번 신규로 다루지 않았다. 기존 Guardian context preparation/telemetry와 effort override 회귀를 다음 변경 때 다시 검토한다.
- **RAG·검색 기반 selective context / sub-agent context isolation:** 전일 CodeNib/ContextBench 500-task 벤치 외에 **새 독립 결과 없음**. 오늘 Open SWE Inbox는 '메시지 delivery' 최적화이지 code retrieval benchmark가 아니다.
- **Skill progressive disclosure / prompt·skill 파일 경량화:** 전일 Deep Agents `skillOnly` 공개와 Microsoft .NET Skill 이후 직접 토큰을 측정한 새 자료 없음. 오늘 OpenCode absolute glob와 MCP name 길이 최적화는 직접적인 prompt truncation 벤치가 아니다.
- **Tool output 축약:** 전일 Deep Agents execution retained/truncated metadata 이후 새로 측정된 output token 절감량 없음. Daytona는 부분 로그의 정합성을 다루며 단순 더 강한 축약을 권하지 않는다.
- **Compaction / cache:** Claude 2.1.310의 회귀 보정은 확인되나 새로운 cache hit 증가율·토큰 감소율 없음. 0.7.32의 prompt-caching middleware 지연 초기화는 기존 cache 동작을 유지하는 방향.
- **Model routing / cost:** OpenCode budget 관측 및 실제 청구액 분리 방식이 새로 확인됐지만, route별 성공률/비용의 공개 A/B는 확인되지 않았다.
- **Session/handoff, durable state, evidence verification, task lifecycle:** 이번 구간의 실질적 변화는 Open SWE inbox receipt, reviewer pending-comment identity, OpenCode activation barrier, Daytona bounded deadlines. 동일 작업당 모델 비용과 **운영 I/O 지연을 혼합하지 말 것**.

## 15. Perforce·Claude Code·Codex Harness 적용 우선순위와 재현 계획

### P0 — 작업 결과를 망치지 않으면서 즉시 도입할 Contract

1. `TaskLedger(task_id, run_generation, stream, client, cl_rev, state, owed_event_cursor, delivered_receipt_seq, skill_snapshot_sha, model_route, evidence_sha, cost_receipt, effect_receipts)`. 각 모델 호출에서 읽은 inbox와 receipt를 durable하게 관리.
2. `RuntimeAdapter`는 ModelCall/ToolDispatch 직전 settled plugin·tool ACL·skills manifest snapshot을 확인. 취소나 timeout 뒤 미확정 P4 submit/TeamCity trigger에는 blindly retry하지 않는다.
3. `EvidenceReceipt(task_id, command_id, cl_rev, source_uri, source_sha, output_sha, retained_bytes, omitted_bytes, truncated, complete, exit_code, timeout_deadline)`. partial output은 '확인됨'과 '전체 성공'을 구분.
4. `CostReceipt`에서 provider_reported / pricebook_estimated를 구분하고 `0 USD`를 누락으로 처리하지 않는다. Context/Cache billable metrics를 별도 유지.
5. 인스트럭션 로더는 glob match 수/byte cap·policy front-loading·model/tool snapshot SHA를 보존. 실패한 cache/compaction 세션의 결과로부터 정책 보존 여부를 검사.

### P1 — 30개 대표 P4 ChangeList/UE5 Task에 대해 별도 A/B

| 실험 | 비교군 | 핵심 측정값 | 필수 품질 조건 |
| --- | --- | --- | --- |
| Durable inbox | full conversation scan vs typed inbox | query/read bytes, duplicate events, failure recovery, model tokens | 미전달 0, 중복 side-effect 0 |
| Claude 2.1.310 | 2.1.309 vs 2.1.310 | compaction loops, prompt-too-long, RSS, cache input/output, billed USD | mandatory instruction recall 100% |
| Plugin/Skill snapshots | reload without barrier vs with barrier | stale permission incidents, end-to-end p95, retry | deny Tool 실행 0 |
| Provider cost source | catalog-only vs reported-cost-first | 청구 차이, USD/task, cache attributable spend | zero-cost 정상 보존, source trace 100% |
| MCP name/catalog | hashed-all vs collision-only; all-fail vs invalid-skip | schema tokens, catalog failure, resume incompatibility | Tool ID collision 0 |
| Workspace budget routing | retry-all vs limit-aware | quota retry/secondary route completion, quality, USD | 권한·정책 위반 0 |
| Timeout evidence | abort-empty vs receipt+partial | 재호출 수, 원인 파악률, 성공오판 | incomplete evidence로 승인 0 |

### 중단/채택 Gate

- 모든 **비용 절감** 주장은 `uncached_input`, `cache_read`, `cache_write`, `output`, `reasoning`, 재시도, wall-time, provider 실제 과금, 성공률을 같은 작업으로 비교해서 확인한다.
- 사용량이 줄었더라도 성공률·검증률이 떨어지거나 비멱등 remote action 중복이 발생하면 **채택하지 않는다**.
- 업체 주장 숫자는 직접 재현하지 않았고, SDK import ms·first-paint ms를 모델 token 절감률로 바꾸지 않는다.

## 16. 출처 검증과 발행 규칙

이번 조사는 GitHub API에서 대상 저장소의 실제 커밋 일시·변경 파일·패치·테스트를 확인하고, Anthropic·Deep Agents 릴리스 노트와 전일 jaywapp/wiki develop 원문을 대조했다. Deep Agents/Open SWE/OpenCode commit benchmark는 **제작자 보고**이며 사용자 UE5/Perforce 환경에서 별도 재현을 수행하지 않았다. 사전 결과 발표/논문을 무리하게 신규로 넣지 않았다.

- **Canonical destination:** `jaywapp/wiki` / `develop` / `ai/trend/ai-harness-token-scout-2026-10-25.md`.
- **중복 생성 금지:** 동일 날짜 보고서가 develop에 이미 있으면 SHA 확인 후 유지/필요한 경우 update한다.
- **완료 기준:** GitHub Contents API write 응답 후 develop에서 **원문 전체 read-back 동등성 검증**. 사전 성공 선언 금지.
