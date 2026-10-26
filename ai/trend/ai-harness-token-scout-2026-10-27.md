---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-27"
date: 2026-10-27
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, perforce, claude-code, codex, deepagents, open-swe, agent-framework, durable-state, tool-cache, evidence]
---

# AI Harness · Context/Token Optimization Scout — 2026-10-27

> **조사 기준:** 2026-10-27 05:56 KST / 2026-10-26 20:56 UTC. GitHub 공식 커밋·테스트·release API에서 2026-10-25 20:55~2026-10-26 20:56 UTC 변경을 우선 검증. `jaywapp/wiki` develop의 [10/26](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-26.md), [10/25](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-25.md), [10/24](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-24.md) 보고서와 비교했다. 이 보고서의 **성능 수치는 모두 upstream 작성자의 실험/CI 또는 코드상 한도이며 Perforce 환경 자체 재현 결과가 아니다.** GitHub `main`에 병합된 커밋과 공개된 안정 패키지를 명확히 구분한다.

## 0. 오늘의 판정·중복 제거

**핵심 신규 변화:** ① Open SWE가 run-local orchestration과 stateless backend를 분리하면서 **13-run e2e에서 API request bytes 12.0 MB→0.85 MB**, ② 그래프를 프로세스 단위 재사용하여 **다른 thread 시작의 graph compile 24~25→0.5 ms**, ③ Deep Agents QuickJS에서 cross-run tool-description 캐시 오염을 수정, ④ Codex에서 MCP stdio 연결을 안전하게 공유하고 session queue/resume 및 Memory baseline 복구를 보강, ⑤ Microsoft Agent Framework에서 checkpoint lineage, history transaction, approval/hook 경계를 고쳤다. **직접 확인된 새로운 LLM input/output token 절감률 또는 비용 감소율은 없다.** Tool schema 선택 노출, prompt 재사용, 세션 요약 효과는 아래에서 실험 가설로만 표시한다.

**제외한 전일 항목:** Open SWE #4563 Range Ledger(57 MB→1.49 MB), #4561 Tool HTTP 조회 폭증 감소, #4569 PassageReply, #4530 native merge queue observer; Deep Agents #7233 fork local context, #7244 checkpoint fast-path, #7245 writer queue; OpenCode #58656 media blobs, #58848 schema 1회 변환; Claude Code 2.1.310과 TokenEconomizer의 **기존 논문 18.4~30.9%** 성과 자체, ContextBench 10/23 leaderboard를 신규 발표인 것처럼 재열거하지 않았다. 오늘 TokenEconomizer는 **그 논문과 별개로 구현 기본값 자체가 바뀐 것**만 추적한다.

**릴리스 경계:** [Claude Code 안정 v2.1.310](https://github.com/anthropics/claude-code/releases/tag/v2.1.310) (10/23 23:39 UTC), [Codex 안정 rust-v0.164.0](https://github.com/openai/codex/releases/tag/rust-v0.164.0) (10/23 04:48 UTC), [Deep Agents SDK 0.7.32](https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.32) (10/23 21:30 UTC)는 이번 구간 신규 안정 릴리스가 아니다. 반면 [deepagents-code==0.2.2](https://github.com/langchain-ai/deepagents/releases/tag/deepagents-code%3D%3D0.2.2)는 **10/26 20:39 UTC 정식 공개**, 오늘 관찰 구간에 해당한다. Codex/Open SWE/OpenCode/Agent Framework의 10/26 커밋은 **main/HEAD 변경**이며 해당 안정 버전 배포와 동일시하지 않는다. 2026-10-26 이후의 릴리스는 조사 기준 시각에 포함하지 않는다.

| 우선 | 변경(원본) | 검증된 변화/수치 | 모델 토큰·비용 | Harness 판단 |
| --- | --- | --- | --- | --- |
| P0 | [Open SWE #4560](https://github.com/langchain-ai/open-swe/commit/477b8f1184273bee5aaaf154623725612818fccf) stateless backend·run-owned hooks | 13-run e2e 요청 **12.0→0.85 MB**, 360→338 calls | **미측정**, 백엔드 통신 절감 | **PoC 최우선** |
| P0 | [Open SWE #4589](https://github.com/langchain-ai/open-swe/commit/918a1046243e5be450397c5dd14f360040b8b9d3) compiled graph 공유 | 재실행 graph compile **24~25→0.5 ms** | cache-prefix 안정성 기대, token 미측정 | **PoC 최우선** |
| P0 | [Deep Agents #7296](https://github.com/langchain-ai/deepagents/commit/e72c1e6ca67f23ce49f6cbefcc1805f20133dea1) code-mode tool prompt slot cache | 다른 run의 동명이 tool 설명 오염 차단 | 절감량 없음, **정확성 복구** | **바로 적용 원칙** |
| P0 | [Codex #57211](https://github.com/openai/codex/commit/5e3496e0ad6a85d7f57cbe3b6d576db3b317766) stdio MCP pool | 안전한 프로토콜 지원 서버만 process 공유 | 서버 기동·메모리 절감 기대, 토큰 미측정 | **PoC** |
| P0 | [Agent Framework #9261](https://github.com/microsoft/agent-framework/commit/b9c5905d38be91630f06a63097a83075d62a90c6) checkpoint lineage | 같은 timestamp의 더 오래된 parent 복원 방지 | 모델 토큰 절감 아님 | **바로 적용 원칙** |
| P0 | [Codex #57240](https://github.com/openai/codex/commit/333d7bde0fb3f7299e758dd75a7d4405e8b541ed) memory baseline recovery | 파일당 10 MiB 상한·legacy reset 안전성 | runaway context 원인 억제, 절감 미측정 | **PoC** |
| P1 | [TokenEconomizer 기본값 변경](https://github.com/microsoft/TokenEconomizer/commit/46f6069a972bd448dd32076af34335dc54a0003f) | micro-skills 기본 **off**, judge 기본 **on** | 기존 논문 비용률에 재적용 불가 | **PoC** |
| P1 | [Codex #57232](https://github.com/openai/codex/commit/4fc522f5e0d3187af8047c4d666d67da3a27ef9b) + [#57227](https://github.com/openai/codex/commit/3047741b63abd7543ed78f0f8e0f703b0125ceea) | queue 후 조건부 resume; permission snapshot 보존 | 반복 시작 토큰 감소는 미측정 | **PoC** |
| P1 | [Agent Framework #9405](https://github.com/microsoft/agent-framework/commit/18adf808a57eb6668fc773162037b311d36c5678) + [#9606](https://github.com/microsoft/agent-framework/commit/477c6dea16587429f78ee997163a36715fa53ea5) | 선언형 hooks·tool approval bypass 회귀 수정 | 비용보다 **권한 보장** | **바로 적용 원칙** |
| P1 | [Codex #57249](https://github.com/openai/codex/commit/3ad642e520f76ccec0cbb5964ce605629751ebff) | plugin discovery startup prefetch opt-out | HTTP 요청 절감, schema tokens 그대로 | **바로 적용 검증** |
| P1 | [Deep Agents Code 0.2.2](https://github.com/langchain-ai/deepagents/releases/tag/deepagents-code%3D%3D0.2.2) UI lazy groups | mounted widgets **7,900→1,100** (author bench) | **UI/메모리만**, LLM compaction 아님 | **아이디어 참고** |
| P1 | [Agent Framework #9260](https://github.com/microsoft/agent-framework/commit/5b780766cefab3353c7f3cd0c4260322209c5dd1) | MessagePack **64 MiB** 상한 쓰기 전 검증/rollback | checkpoint 오류 복구, 토큰 아님 | **바로 적용 원칙** |
| P1 | [Codex #57251](https://github.com/openai/codex/commit/f358635d8e9341c46def8a89372fc03f6bffec56) | ENT26 native USD, null≠zero | 정확한 청구 계측, 절감률 아님 | **바로 적용 원칙** |
| P2 | [OpenCode #59205](https://github.com/anomalyco/opencode/commit/d641fc45f52bd35b410c8c0230e023a503de1e73) | ripgrep matched line **2,000 문자** 경계 앞당김 | tool-output 컨텍스트 상한 유지 | **바로 적용** |
| P2 | [Agent Framework #8729](https://github.com/microsoft/agent-framework/commit/9337c508e46d5712578bacb2772825fd4da82989) | workflow 결과에서 내부 role·고아 tool-call 제거 | handoff 오염 방지, 토큰 미측정 | **PoC** |

## 1. Open SWE #4560 — Orchestrator가 middleware를 소유하고 backend는 stateless named API 제공

**신규성/근거:** [10/25 21:21 UTC 커밋](https://github.com/langchain-ai/open-swe/commit/477b8f1184273bee5aaaf154623725612818fccf). `mda/rt/loop.py`, `mda/rt/backend.py`, `openswe/agent_api/{agent,tokens,run_parts,runs}.py`, `AGENTS.md`, `mda/tests/test_backend_calls.py`와 전체 e2e의 **3 replica round-robin** 검사.

**작동:** 이전 backend는 run의 계획을 특정 pod에 캐시하고 일반 `before_model/after_model/after_agent` 콜백 때마다 전체 conversation/state를 넘겼다. 로드밸런서가 다른 pod에 연결하면 실행 계획, MCP catalog, GitHub identity를 재계산했다. 변경 후 MDA runtime의 `RunLoop`가 model 선택·tool 조립·중단조건·reply nudge·end-of-run settle을 직접 실행한다. backend는 `inbox`, `task_context`, `route_model`, `model_choice`, `operation`, `check_shell`, `model_result`, `run_ended`처럼 **이름 붙은 작은 요청**에 run token을 이용해 응답한다. 초기 catalog의 operation grant는 HMAC으로 묶여 허가되지 않은 이름의 도구를 뒤늦게 임의 호출할 수 없다. report는 answer가 필요한 경우만 await, 기타는 순서 있는 background queue로 처리한다. 중요한 stop-during-start race도 별도 보정한다.

**제작자 e2e 13회:** `/agent-api` 총 360→338 calls, payload **12.0 MB→0.85 MB(약 92.9% 감소)**, run plan **50→26**, MCP catalog load **48→24**, 모델/Tool 리포트 본문 약 **5.4 MB→108 KB**. 이는 재현 가능하게 기록된 **HTTP/request payload 바이트**이며 **LLM prompt 토큰 92.9% 감소가 아니다**. 장점: 멀티 replica consistency, 분산 확장성, report/data-plane traffic 감소. 단점: run token의 grant/만료, async receipt 유실·복제, 상태 불명확 시 authoritative reconciliation 설계가 필요하며 `prepare` 단계는 여전히 일부 plan에 의존한다.

**Perforce + Claude/Codex 설계:** `RunTicket(task_id, generation, catalog_hash, policy_hash, p4_client, have_cl, grants, expires_at)`를 immutable context로 정하고, UE5 Worker/Reviewer middleware는 runtime adapter가 소유한다. backend에는 `get_cl_summary`, `get_teamcity_result`, `check_p4_submit_status`, `store_evidence` 같은 stateless endpoint만 둔다. 모델 경계에는 사건에 필요한 **receipt와 passage만**, 전체 P4 diff/build log는 artifact handle로 준다. 30개의 동일 CL/CI 시나리오를 1/3/5 replica로 시험해 API bytes, catalog builds, delivery duplication, authorization bypass, complete task 비율, `USD/verified-CL` 비교. **판정: PoC 최우선.**

## 2. Open SWE #4589 — Immutable compiled graph + run-scoped context/tool/skill

**근거:** [10/26 18:53 UTC 커밋](https://github.com/langchain-ai/open-swe/commit/918a1046243e5be450397c5dd14f360040b8b9d3). `mda/agent.py`, `mda/rt/{backend,run_tools,skills,managed_sandbox}.py`, `mda/tests/test_shared_graph.py`, `vendor/mda-changes/2026-10-26-openswe-graph-inputs.md`.

**내부 구조:** graph를 run마다 빌드하지 않고 **graph kind별 정적 topology**로 컴파일하여 process 내 공유한다. 사용자별 MCP tools, per-run skill source, subagent model/prompt, sandbox, evidence policy는 **컴파일된 그래프 안의 shared state에 보관하지 않고** `Run`/`RunLocal`에서 model/tool 호출 때 runtime-context로 주입한다. Code mode는 실행 중 노출된 도구가 없으면 `eval`조차 모델에 보이지 않는다. Code interpreter slot은 정상 종료 및 실패/취소 finalizer에서 회수된다. `/threads/{id}/state`가 예전에는 tool/skill/channel이 없는 **잘못된 빈 catalog graph**로 checkpoint를 읽었다는 정확성 결함도 수정한다.

**upstream 수치:** synthetic 70 operations+subagents+code mode+skills의 15회 중앙값: 첫 run **81~125→61~76 ms**, 다른 thread **24~25→0.5 ms**, 첫 state read는 14~15 ms(잘못된 graph)→18~19 ms(올바른 graph), 이후 read **14.5→약 0 ms**. 종전 production graph load **2.2~4.9초/run**은 기록돼 있지만 **변경 후 production 수치는 아직 없다**. compile 비용 절감과 안정적 Tool/Skill 스코프가 핵심이지 **모델 토큰 비용 실측이 아니다**. **주의:** 프로젝트 자체 vendored SDK seam 사용, upstream 공용 API의 보장으로 취급하지 않는다.

**적용:** P4 Harness graph cache key는 `graph_kind + adapter_version + policy_schema_version`처럼 정적 요소만; task-unique `client`, workspace root, changelist, role grant, selected skill, model, evidence는 `RunContext`에. 서로 다른 두 worker가 `p4_describe`라는 동명의 Tool을 갖되 다른 workspace를 조회하는 교차 실행을 100회 반복해서 **wrong-tool/cross-tenant evidence 0건**을 합격조건으로 둔다. `compile_count`, p50/p95 start, cache-hit input tokens, tool-schema token count, reviewer 정확성을 함께 측정. **판정: PoC 최우선.**

## 3. Deep Agents QuickJS #7296 — PTC 프롬프트 캐시의 정합성을 이름 아닌 run/Tool 정체성으로 판단

**원본:** [10/26 20:18 UTC](https://github.com/langchain-ai/deepagents/commit/e72c1e6ca67f23ce49f6cbefcc1805f20133dea1), `libs/partners/quickjs/langchain_quickjs/middleware.py`, `tests/unit_tests/test_ptc.py`. **0.2.2 release notes에 해당 QuickJS 패키지 버전 포함은 확인되지 않아 HEAD 변경으로 표기한다.**

**문제:** 기존 `CodeInterpreterMiddleware`가 code mode PTC tool 목록을 tool **이름들의 set**으로 캐시했다. `lookup`이라는 같은 이름을 갖지만 설명·인자·허용 리소스가 다른 Run A/B를 shared graph로 실행하면 B의 모델이 A의 tool 설명을 받았다. 변경은 `_ptc_prompt_by_slot`을 **run별 interpreter slot**에 두고 Tool 객체 tuple의 정체성과 순서를 비교해 변경 시 재렌더링하며 `after_agent`에서 slot을 해제한다. **알려진 잔여:** `after_agent`를 거치지 못하는 실패 run은 slot 잔존 가능성이 커서 Open SWE 자체 finalizer 보정과 함께 봐야 한다.

**토큰 관점:** 잘못된 캐시 재활용으로 생기는 prompt 오류/재시도를 막지만 "cache hit가 늘었다"거나 절감률이 측정된 것은 아니다. Run별 재렌더링 비용이 늘 수 있다. **P4 적용:** P4 Tool이 `p4 describe`라는 같은 이름이어도 `(capability, server/client, schema_hash, instruction_hash, policy_hash, run_id)`로 ToolCatalog 프롬프트를 키잉. LLM prefix cache는 정적 공통 prefix만, 권한/도구 설명은 run별 별도. 동일 이름 다른 `P4CLIENT`·submit 권한 test 100건, stale instruction 0건, ToolSchema tokens/time 측정. **판정: 바로 적용 원칙.**

## 4. Codex #57211 — 여러 chat에서 MCP stdio connection pool 공유하되 tool 권한은 분리

**근거:** [10/26 19:37 UTC](https://github.com/openai/codex/commit/5e3496e0ad6a85d7f57cbe3b6d576db3b317766), `codex-rs/codex-mcp/src/{connection_pool,connection_manager,runtime,client_tool_catalog}.rs` 및 pool/runtime/app-server 테스트.

**변경:** 기존 `mcp_connection_sharing`에 **local stdio** 공유 지원을 추가했다. 단 MCP protocol `2026-07-28`을 negotiate하고 startup 과정에서 입력을 요청하지 않은 호환 서버만 pool에 들어간다. 레거시 또는 startup elicitation 서버는 독립 연결을 유지한다. 같은 프로세스를 쓰더라도 각 채팅의 tool catalog와 calling-chat 입력 응답 라우팅을 분리하고, lease 마지막 release 때 종료하며 refresh 시 기존 작업을 끊지 않는 retire 정책이 있다.

**토큰/비용:** 서버 프로세스 재시작, 포트/stdio 수, 초기화 지연, RSS를 줄일 개연성은 있으나 **각 chat의 Tool JSON schema가 모델에 몇 토큰 들어가는지는 별개**이며 새 벤치마크는 없다. 공유 서버가 세션별 상태를 몰래 저장하거나 인증이 섞이면 치명적. **PoC:** read-only `p4 files/describe` MCP는 pool 후보, `p4 submit`/resolve/checkout 권한 tool은 원칙적으로 Run마다 별도 grant 및 서버 측 정책 적용. 10 병렬 Worker에서 process count, cold start, RSS, cross-chat leak, tool-call provenance 및 prompt tokens 측정. **판정: PoC.**

## 5. Codex #57249 — Plugin discovery prefetch만 비활성화하고 설치된 Skill/Bundle은 유지

**원본:** [10/26 20:54 UTC](https://github.com/openai/codex/commit/3ad642e520f76ccec0cbb5964ce605629751ebff), `codex-rs/features/src/lib.rs`, `core-plugins/src/manager.rs`, `app-server/tests/suite/v2/plugin_list.rs`.

**구현:** 안정 feature flag `features.plugin_discovery_prefetch`(기본 true)를 false로 놓으면 app-server 시작 시 plugin directory/featured/recommendations 원격 prefetch를 건너뛴다. **이미 설치된 remote plugin의 cache refresh와 bundle 다운로드는 유지**된다. 테스트는 해당 추천 API 호출 예상 0회를 보장한다. 사용자 인터랙션 중 plugin 목록 조회 또는 수동 갱신의 semantics는 별도 확인 필요.

**효과:** 외부 카탈로그 **HTTP 요청과 startup dependency**를 줄인다. **이미 모델 prompt에 들어간 Tool schema 토큰은 줄지 않는다**; `skillOnly`/ToolSearch progressive disclosure와 구별할 것. CLI/Enterprise P4 Harness가 설치 플러그인만 사용한다면 startup catalog prefetch opt-out 후 필요한 Skill 선택 가능성, warm/cold start, catalog requests, cache expiration을 A/B 시험. **판정: 바로 적용 검증(실행 버전에 flag가 포함된 뒤).**

## 6. TokenEconomizer 10/26 — 비용절감 연구를 플러그인 기본 정책으로 옮길 때의 안전성 변화

**근거:** [10/26 01:58 UTC 커밋](https://github.com/microsoft/TokenEconomizer/commit/46f6069a972bd448dd32076af34335dc54a0003f), `README.md`, `docs/PLUGIN.md`, `tokeneconomizer/{loopguard,microskills}`와 신규 generic microskill tests. 10/24 보고서가 다룬 **277 SWE-Bench / 평균 18.4~30.9% cache-aware 비용 절감**과 중복 보고하지 않는다.

**정확한 변경:** 지금 플러그인은 **micro-skills를 기본 off**로 두고, 켜면 여러 도구/언어의 반복 환경 사실을 탐색하고 **3 sessions마다 모델 proposer**를 호출할 수 있도록 확장했다. **Tool pruning과 loop guard는 기본 on**. Loop guard는 이상 징후 때 모델 **judge**를 별도 호출하는 방식이며 그 비용을 ledger에 기록한다. 훅이 기본적으로 LLM을 전혀 호출하지 않는다는 종전 문서 설명은 이제 성립하지 않는다. 플러그인 generic command recognizer는 build/test/lint 및 여러 언어의 파일 편집을 본다. 논문 벤치마크에 쓴 좁은 vocab/설정과 현재 플러그인 기본 동작은 동일 실험 조건이 아니다.

**효과·trade-off:** 반복 환경학습 성공 시 token/실패 loop 감소 가능 vs proposer/judge의 추가 모델 과금, tool auto-deny로 인한 기능 누락/보안 실수. 지난 18.4~30.9% 수치를 **새 기본값 재실측 값으로 표기 금지**. **PoC:** UE5/P4 30 태스크 × `(none, prune, loop, micro-skill, full)` ablation. 각 feature의 incremental API USD, cache-read/write, 성공 CL, blocked submit, 재현 가능한 사실 확인횟수와 hallucinated fact율 비교. 승인/submit/resolve 안전 도구는 사용 횟수만으로 prune 금지. **판정: PoC(먼저 관찰 전용).**

## 7. Codex #57240 — Memory baseline은 크기 제한·버전·원자적 복구가 있는 파생 상태

**원본:** [10/26 20:40 UTC](https://github.com/openai/codex/commit/333d7bde0fb3f7299e758dd75a7d4405e8b541ed), `codex-rs/git-utils/src/baseline.rs`, `baseline_recovery_tests.rs`, `memories/write/src/{startup_tests,workspace}.rs`.

**내부:** 메모리 baseline이 너무 큰 파일을 diff/index에 담는 일을 막기 위해 **단일 파일 10 MiB** 한도를 두고 기존 blob size를 먼저 확인한다. baseline format 버전이 빠졌거나 손상/구버전이면 신뢰 가능한 기준이라고 간주하지 않고 **빈 baseline**으로 시작해서 실제 working memory 파일을 다시 "새로운 변경"으로 consolidation에 드러낸다. 동일 workspace baseline 갱신/리셋/diff는 cross-process lock으로 직렬화한다. 테스트는 oversized, interrupted reset, legacy migration, concurrent lock 및 "입력 불변이어도 손상 기준 복구 후 데이터 보임"을 검증한다.

**절감과 위험:** 잘못된 baseline으로 인한 데이터 누락·큰 컨텍스트 팽창을 막는 효과이며 토큰 감축 %는 측정하지 않았다. **10 MiB는 허용되는 모델 프롬프트 길이가 아니다.** P4 Harness `MemoryBaseline(p4_stream, have_cl, schema_version, manifest_sha)`를 파생 인덱스로 관리하고 파일 크기 및 evidence digest를 먼저 검증, 장애 후 전체 memory artifact를 prompt로 재주입하는 대신 chunk hash→선택 검색으로 복구. 실패/회복 중 정확도와 input tokens 측정. **판정: PoC.**

## 8. Microsoft Agent Framework #9261 + #9260 — Durable checkpoint lineage와 write-safe history

**출처:** [#9261](https://github.com/microsoft/agent-framework/commit/b9c5905d38be91630f06a63097a83075d62a90c6) (`python/packages/{core,azure-cosmos,foundry_hosting}` checkpoint storage 및 tests), [#9260](https://github.com/microsoft/agent-framework/commit/5b780766cefab3353c7f3cd0c4260322209c5dd1) (`core/agent_framework/_sessions.py` 및 tests).

**#9261 작동:** `get_latest`를 단순 timestamp max로 결정하면 같은 superstep에서 parent/child checkpoint가 같은 timestamp여도 저장순서에 따라 **폐기된 parent**로 복구될 수 있다. 최신 timestamp 그룹에서 `previous_checkpoint_id` lineage를 추적하여 자식에게 supersede된 후보를 제거하고 남은 tie는 checkpoint ID로 결정한다. Cosmos는 `ORDER BY timestamp DESC` **단일 쿼리**를 페이지 크기 10으로 시작해 최고시간 그룹만 검사한다. Foundry/인메모리/파일에도 동일 원칙을 적용. **절감:** 토큰이 아니라 resume 정확성.

**#9260 작동:** MessagePack history writer가 reader의 **64 MiB/record 제한**보다 큰 메시지를 추가해 이후 session을 읽을 수 없게 만들던 버그를 방지한다. append 전에 **batch 전체 검사**, 재사용 buffer를 써서 메모리 상한을 최대 record 크기로 제한, 실제 쓰기 중 변형/오류에도 재검증해 append 시작 위치로 truncate rollback한다. **장점:** 이후 모든 session save의 연쇄 장애 방지. **단점:** preflight 2회 인코딩·거대 첨부의 별도 저장이 필요.

**Perforce 적용:** `TaskCheckpoint(id,parent_id,logical_seq,run_generation,created_at,content_sha,p4_client,have_cl)`에서 우선순위는 **lineage·논리적 seq**, timestamp만으로 최신 상태를 찾지 않는다. `EvidenceArtifact`/TeamCity 로그는 inline history에 붙이지 않고 hash/URI로 저장하며 payload limit 실패를 rollback한다. 같은 timestamp 100개, concurrent writers, crash half-write, stale CL 상황에서 올바른 latest 선택 및 완전한 rollback을 시험. **판정: 두 변경 모두 바로 적용 원칙.**

## 9. Codex #57232 + #57227 — Session Queue/Handoff와 권한 상태 복구를 분리

**근거:** [queue --resume #57232](https://github.com/openai/codex/commit/4fc522f5e0d3187af8047c4d666d67da3a27ef9b) `codex-rs/cli/src/queue_cmd.rs`, `tui/src/session_queue_commands.rs` 및 tests; [permission snapshot #57227](https://github.com/openai/codex/commit/3047741b63abd7543ed78f0f8e0f703b0125ceea) `app-server/src/request_processors/persisted_resume_settings.rs` 및 resume/fork tests.

**Queue:** `codex queue --resume`은 먼저 daemon/remote session inbox에 메시지를 **성공적으로 넣고**, 상태가 unloaded인 경우만 재개한다. 이미 loaded면 재시작하지 않으며 resume이 실패해도 queue 성공 자체는 유지하고 경고한다. archived queue 대상은 거부한다. remote path가 다른 OS 형식일 수 있어 resume 확인 시 불필요한 경로 파싱 없이 thread status만 읽는다.

**Permission:** turn history에 남은 예전 허가 기록보다 **thread 소유자의 최신 settings snapshot**을 우선한다. 식별 가능한 legacy update와 unnamed profile도 다루되 소유자를 판별할 수 없는 raw grant는 복원하지 않고 호출자의 명시적 override를 존중한다. fork/resume 경로를 통일했다. **trade-off:** 이미 큐잉된 메시지 ≠ 성공적으로 실행한 메시지; 중복 resume·권한 stale replay, "at least once" delivery와 idempotent action을 분리해야 한다.

**P4 적용:** `MessageOwed`를 durability ledger에 저장 후 `run_state=unloaded`이면 resume signal을 발행. `message_id`·`generation`·`applied_receipt`로 idempotency 제어. 포크는 `policy_digest`/permission profile/stream-base를 읽고 권한 전파를 서버가 재검증. `p4 submit`은 queue/retry 성공과 별도 authoritative `p4 changes`·CL 상태 조회 후 재실행 여부 판정. **판정: PoC.**

## 10. Microsoft Agent Framework #9405 + #9606, Deep Agents #7275 — 선언형 Hooks와 Trust Boundary의 실제 결합

**근거:** [Agent Hooks declaration #9405](https://github.com/microsoft/agent-framework/commit/18adf808a57eb6668fc773162037b311d36c5678) `python/packages/core/agent_framework/_agent_hooks.py`, `tests/core/test_agent_hooks.py`; [Function approval #9606](https://github.com/microsoft/agent-framework/commit/477c6dea16587429f78ee997163a36715fa53ea5) `declarative/_workflows/_executors_tools.py`; [Deep Agents project env trust #7275](https://github.com/langchain-ai/deepagents/commit/ebdee3ef5be4ecea4e1bd973c24e219ffaa4464e), 안정 [deepagents-code 0.2.2](https://github.com/langchain-ai/deepagents/releases/tag/deepagents-code%3D%3D0.2.2) 수록.

**Hooks:** Agent Framework는 `agent-hooks-declaration/1.0` 문서를 mapping/file/JSON으로 읽는 factory와 `HostRegistry`를 도입했다. **8개 hook point**, binding identity·approval resolver·redactor·buffered stream/posture 지원 여부를 factory 구축 시 검증하고, 선언 문서는 한 번 해석하지만 **run마다 sealed emitter**를 새로 만든다. 선언에 없는 binding/잘못된 capability는 실행 전에 거부된다. 현재 구현/테스트는 `agent-hooks-sdk >=0.1.0b2` 필요. 공식 성능·토큰 실측 없음.

**Tool approval:** 이전 declarative workflow는 `requireApproval:false`만 보고 등록 도구 자체의 `approval_mode="always_require"`를 무시해 실행할 수 있었다. 이제 **둘 중 하나라도 요구하면 승인**받아야 한다. 프로젝트 `.env`에서 Deep Agents 실행권한 변수 `EXPERIMENTAL`, `EXTENSIONS_TRUST`, `PLUGIN_CACHE_DIR`, `SHELL_ALLOW_LIST`, `EXTRA_SKILLS_DIRS`를 지정하여 권한을 상승시키는 길도 0.2.2에서 차단됐다. 전역/shell 설정은 별도 신뢰 구역이다.

**P4 실행원칙:** 권한 우선순위 `host policy/registered tool > signed run grant > declarative workflow > repo skill prompt`. 제출·resolve·빌드 트리거 같은 write Tool의 승인은 `SKILL.md` 내용이나 `.env`가 낮출 수 없어야 한다. Hook emitter는 Run 별 격리하되 정적 선언만 cache. **검증:** 악성 프로젝트 `.env`, `always_require+false`, repo가 바꾼 Tool schema, 다른 실행자 식별자, hook 중단/취소 100 케이스에서 bypass 0. **판정: 바로 적용 원칙.**

## 11. Codex #57251 — 진짜 청구 달러와 추정 크레딧을 별도 수치로 보존

**출처:** [10/26 20:54 UTC #57251](https://github.com/openai/codex/commit/f358635d8e9341c46def8a89372fc03f6bffec56), `codex-rs/app-server-protocol/src/protocol/v2/thread_usage.rs`, `account_processor.rs`, TUI 및 native-dollar 테스트.

**내부:** 특정 ENT26 dollar-billed 플랜에서 `ThreadUsage.nativeUsageUsdMicros: Option<i64>`를 제공하고 `/status`, terminal title, agents overview, post-turn settlement에 **실제 native dollar 수치**를 사용한다. `None`은 **미확인**, `Some(0)`은 **정확히 0**이며, credit-weighted 집계와 섞지 않는다. 다른 구독 모델 또는 API 청구까지 일반화하지 않는다. 10/25 OpenCode가 provider cost vs estimate를 분리한 사례와 같은 **계측 원칙**이지만 Codex 프로토콜/플랜의 **새 구현**이다.

**P4 Harness:** 모델 요청 receipt를 `(provider, model, request_id, input_uncached, cache_read, cache_write, output, reasoning, estimated_usd, billed_usd_nullable, currency, source, task_id, cl)`로 저장하고 NULL을 0으로 바꾸지 않는다. cost/verified-CL의 결측률과 추정 오차를 따로 공개. 할인/신용/월 사용량 한도와 직접 USD는 다른 차원. **판정: 바로 적용 원칙; 실제 비용 절감 자체는 아님.**

## 12. Deep Agents Code 0.2.2 — UI Tool Group은 모델 Compaction과 다르다

**원본/배포:** [0.2.2](https://github.com/langchain-ai/deepagents/releases/tag/deepagents-code%3D%3D0.2.2) (10/26 20:39 UTC). [#7254](https://github.com/langchain-ai/deepagents/commit/a18ca04b534718e396fdd1815e236ecfb3d5fea7) `app.py`, `tui/widgets/{message_store,messages}.py`; [#7256](https://github.com/langchain-ai/deepagents/commit/71c9792c998b30b4130f7379a8cda9d93398d3e7) `message_store.py`, tests.

**방법:** 완료되고 성공한 5 Tool call 등의 live transcript 위젯들을 **하나의 lazy `TOOL_GROUP`**으로 바꾸되 원본 내용·타임스탬프·확장상태를 보존한다. 확장 시 8개 row 단위로 mount/yield하고 취소 시 중간 위젯을 정리한다. 실행 중/실패/보호된 Tool 출력은 강제로 접지 않는다. mounted window를 **800→350**(hard 900→400)으로 줄이되 옛 대화는 scroll로 접근 가능하다.

**upstream headless 합성 수치:** 100 turns×5 tools에서 store rows **800→400**, mounted widgets **7,900→1,100**, RSS 증가 **약 164→101~122 MB**, append frame **267→95~120 ms**, build 100 turns **24~28→약 9초**. 또 300-turn scenario에서 새 메시지 frame **176→89 ms**, terminal resize **431→233 ms**(각 비교 조건 주의). **UI rendering/메모리만 최적화**했고 **모델 대화 history pruning·prompt compaction·token 사용량 감소를 의미하지 않는다**. 장점은 긴 대화 TUI 안정성, 단점은 scroll 추가 로딩과 큰 group 확장 시 순간 지연. **P4:** TeamCity 1,000-tool step 대시보드에 lazy group/receipt, 로그 원문 fetch-on-expand를 적용. **판정: 아이디어 참고(UI 구현 시 바로 적용할 수 있는 원칙).**

## 13. Deep Agents #6368 — Headless Sandbox의 Owner를 Server가 아닌 Client에 둬서 과금 누수 제거

**근거:** [10/26 커밋](https://github.com/langchain-ai/deepagents/commit/4711bf2fe0fc0c0f161db59f42a4708473b9769e), `libs/code/deepagents_code/client/non_interactive.py`, `integrations/sandbox_factory.py`, 테스트, 0.2.2 release notes.

**이전 장애:** `-n` 실행을 제어하던 CLI가 server process를 종료할 때 server cleanup handler가 실행되지 않아 **sandbox가 provider timeout까지 살아 비용이 쌓일 수 있었다**. 변경은 재연결 가능한 sandbox provider에 한해 CLI가 생성·ID 전달·run finally cleanup을 소유한다. 이미 `--sandbox-id`로 주어진 외부 sandbox/미지원 provider/interactive TUI는 동작 범위가 다르다.

**토큰·트레이드오프:** 모델 토큰 감소가 아닌 VM/sandbox wallclock bill 개선 가능성; 실제 USD/분 절감량은 공개하지 않았다. CLI crash·kill -9까지 항상 정리된다는 보장도 없으므로 별도 TTL sweeper와 lease가 필요하다. **P4 PoC:** Worker가 만든 workspace/sandbox는 owner+lease+expiry+cleanup receipt, CL/CI ticket은 영속. 프로세스 SIGINT/SIGTERM/kill, 네트워크 단절, provider timeout에서 orphan count와 sandbox-minutes/verified-CL 검증. **판정: PoC.**

## 14. OpenCode #59205 + #59315 — Tool 출력은 생성 경계에서 상한, Code Mode 거부 시 직접도구 복구

**원본:** [ripgrep #59205](https://github.com/anomalyco/opencode/commit/d641fc45f52bd35b410c8c0230e023a503de1e73) `packages/core/src/ripgrep.ts`, [code mode #59315](https://github.com/anomalyco/opencode/commit/b2526211ece5f0aad40229aab83701ef4f80f2df) `packages/core/src/{tool,mcp/instructions}.ts`, 테스트.

**검색 메모리:** Ripgrep JSON decode 후 match 객체를 축적하는 단계에서 **line text 2,000 문자**, `submatches` 100건으로 제한하도록 truncation을 앞당겼다. 이전에는 늦게 잘라 매우 긴 match line이 객체 안에 남을 수 있었다. **주의:** JSON parse 전 원본 line이 이미 메모리에 들어왔을 수 있고 **2,000 characters는 2,000 tokens가 아니다**. trim 전/후 원본 line의 hash·file·offset을 ledger에 두어 필요할 때 re-read. CLI code-search 모델 결과는 실패 요약만 전달, 긴 한 줄 minified JS/UE5 stack은 artifact URI로.

**Code Mode fallback:** `execute` 권한이 전면 금지되면 종전에는 code mode 전용 Tool이 보이지 않아 실제 사용 가능한 read Tool까지 막히던 사례를, **명시적으로 허용된 도구를 직접 노출**하는 형태로 복구. 이는 도구 권한 상승이 아니라 presentation 재배치이며 tool schema 수가 증가할 수 있어 **token 비용이 더 높을 수도 있다**. 3가지 설정(`execute allow/deny`, `read grant allow`, `submit deny`)에서 권한 준수·tool call 성공·schema tokens와 검색 context recall을 시험. **판정: output 조기 경량화는 바로 적용, fallback은 PoC.**

## 15. Agent Framework #8729 — Sub-agent Handoff는 역할/Tool-call 균형을 맞춘 최소 완성 응답만

**근거:** [10/26 커밋](https://github.com/microsoft/agent-framework/commit/9337c508e46d5712578bacb2772825fd4da82989), `python/packages/core/agent_framework/_workflows/_agent.py`, workflow/foundry tests.

**변경:** `workflow.as_agent()`에서 내부 orchestration이 반환한 user/system/tool messages를 client-facing assistant 결과로 다시 보낼 수 있던 문제를 수정. 스트리밍/비스트리밍, `AgentResponse`/`Message`/list 형태 모두 assistant-only 정책으로 정규화한다. 단순 role filtering만 하면 `assistant(function_call)`에 대응하는 tool result가 사라져 replay에서 invalid transcript가 되므로 **도구 호출만 있던 고아 assistant message도 제거**한다. `raw_representation`도 원본 내부 리스트 누출을 피하도록 함께 처리한다.

**효과·주의:** 필요한 답변 요약만 Coordinator로 건네 토큰 사용량을 줄일 잠재력은 있지만 모델 토큰은 미측정. 일부 tool evidence까지 모두 제거하면 정답 검증이 약해질 수 있어 **assistant answer와 별도 evidence receipt**를 함께 보내야 한다. P4 Reviewer/Worker 간 `Handoff(answer, changed_cl, evidence_refs, validation, unresolved, next_action)`를 사용하고 내부 system 지시 및 개인 도구 응답을 전달하지 않는다. `assistant tool-call → tool result → final` fixture, evidence recall/정보노출 0건 검사. **판정: PoC.**

## 16. 짧은 관찰: 새로 확인했지만 독립 도입 항목으로 과대평가하지 않은 변경

- [Codex #57212](https://github.com/openai/codex/commit/dd5521406a801212f7742432bcacb06e91823b01): code-mode gRPC response에서 negotiation된 클라이언트에 한해 zstd(level 1), 미지원 client에는 무압축. **네트워크 바이트/지연 trade-off**, model input tokens에 직접 영향을 주지 않는다. 구체적인 byte-ratio는 공개되지 않았다. **평가: 아이디어 참고**.
- [Open SWE #4603](https://github.com/langchain-ai/open-swe/commit/bce4428ae1c653bb026febe03a3684faa1bb9434): 중복 root `CLAUDE.md` 삭제, `AGENTS.md` 단일 원본 유지, OpenWiki 자동 생성에서도 재유입 차단. **문서 중복에 따른 instruction drift 위험 감소**는 확인되나 실제 context token 감축량/각 CLI가 자동 읽는 파일 우선순위는 미측정. **평가: 바로 적용 원칙(단일 SSOT + 런타임별 얇은 shim)**.
- [Open SWE #4592](https://github.com/langchain-ai/open-swe/commit/0cce7e50bb72e6675ff9368f9f304b29bd2dac92): PR 복구 요청이 실제 CI failure/merge conflict에 맞춰 범위를 정하고 상태 불명확하면 일반 요청으로 fallback. 매번 양쪽 모두 고치라고 지시하는 불필요한 작업 감소 **예상**. **평가: 바로 적용 원칙**.
- [Gemini CLI #29910](https://github.com/google-gemini/gemini-cli/commit/33dce9518957587ce894cc3ad4f9e63981056f4b): ACP permission request에 MCP server/tool metadata 보강. [#29961](https://github.com/google-gemini/gemini-cli/commit/a2e7ef025792619b450fab177b2c71f4e8efaa87): project spend cap 오류를 terminal quota로 분류. 승인 UX와 모델 fallback 무한재시도 차단 참고. **평가: 아이디어 참고**.
- [OpenCode #59166](https://github.com/anomalyco/opencode/commit/4e0fca1617a1e264b3d965c8d0a1c6f31fee9a2f): tab 복귀 시 기존 timeline을 추가 불필요하게 다시 읽지 않고 실제 위로 스크롤할 때만 페이지 fetch. **UI history requests 감소**, LLM context 절감률 아님. **평가: 아이디어 참고**.

## 17. P4·Claude Code·Codex Harness에서 바로 재현할 3가지 실험

### PoC A — Runtime Ownership + Immutable Graph (가장 높은 우선순위)
- Baseline: 작업마다 agent/tool/skill graph 전체 재빌드, generic phase hook에서 전 대화 전달.
- Variant: `graph_kind` 단위 공유 compile, per-run `RunTicket`와 tool-grant, 전 대화 대신 named small API/receipt.
- Task set: UE5 CI 실패 10, Perforce 변경 리뷰 10, 코드/테스트 수정 10(총 30). 1·3 replica, 1·10 병렬 Worker, 반드시 **권한 다른 동일 Tool 이름** scenario 포함.
- 수집: `compile_count, graph_prepare_p50/p95, backend_request_bytes, full_history_reads, input_uncached_tokens, cache_read/write_tokens, tool_schema_tokens, billed_usd_nullable, verified_task_rate, permission_leak_count`.
- **합격:** cross-client evidence/tool leak = 0, stale-state wrong resume = 0, verified-task rate baseline 이상, request-bytes 감소가 LLM 비용 증가로 상쇄되지 않는지 확인.

### PoC B — Durable Queue + Checkpoint/Evidence
- `TaskLedger(task_id,generation,parent_id,logical_seq,phase,checkpoint_sha,approval_digest,p4_client,have_cl)`와 `MessageOwed(message_id,payload_ref,acked_at)` 분리.
- 모델에 넣을 컨텍스트는 `ContextContract(p4_depot_path,revision,line_span,hash,summary)`만. TeamCity raw log와 `p4 describe`는 reviewer가 revision/hash 확인 후 selective retrieval.
- 같은 timestamp checkpoint 100개, 이미 ACK한 permission을 fork/resume, stop-during-start, write 중 kill, tool receipt 64MiB 초과, detached resume, duplicate queue 5회, submit response timeout을 fault injection.
- **합격:** lineage latest 정확, history file 100% loadable, duplicate external submit 0, 필수 evidence recall baseline 이상. retry=0이라고 성공률을 왜곡하지 말고 정확한 최종 상태로 평가.

### PoC C — Token/Cost Optimization의 실측
- 조건: baseline / tool+skill progressive disclosure / 2,000-character output summary+retrieval / Tool-pruning 관찰형 / micro-skills on / shared static prefix. 실험 기간 내 동일 작업의 seed·모델·맥락을 통제.
- TokenEconomizer **변경 전 논문 설정과 새로운 플러그인 default**는 직접 비교 대상으로 간주하지 않고 각각 별도 실험군을 둔다.
- 수집: provider 반환 input/output/reasoning/cache read/cache write tokens와 실제 billed USD(없으면 null), 누적 Tool retries, evidence false-accept/false-reject, completed & verified CL. `savings%=(baseline USD - variant USD)/baseline USD ×100`은 **동일 품질·동일 작업·동일 과금 기준일 때만** 표기.
- **합격:** valid CL 성공률 하락 없음, 승인 위반 0, 비용/verified-CL 감소. Tool catalog prefetch HTTP 절감이나 TUI RSS 감소를 모델 토큰 절감으로 대체하지 않는다.

## 18. 지속 추적 레이더와 다음 관측 포인트

| 관찰 축 | 10/27 신규 상태 | 다음 검증 |
| --- | --- | --- |
| Durable state / task lifecycle | Codex #57232 queued≠resumed, Agent Framework #9261 lineage tie-break | queued→admitted→executed→verified의 정확한 receipt와 cancel-race |
| Runtime adapter / orchestration | Open SWE #4560 stateless backend, #4589 shared graph | production post-deploy CPU/latency, instance 노드 간 tool permission 분리 |
| Evidence verification | Open SWE 작은 report 전송, Agent Framework #8729 role filter | Reviewer가 누락된 Raw Tool evidence를 hash/source로 복구 가능 여부 |
| Handoff / ledger | Codex 최신 permission snapshot 복원, TokenEconomizer default policy | abort/restart 상황의 signed grant consistency 및 비용 영수증 |
| Context/Skill/Hook | DeepAgents #7296 run-local PTC prompt, Codex #57249 prefetch flag, Agent Framework #9405 hook declaration | prompt/schema token count, SKILL 원문 보존 정책 및 role mismatch |
| RAG·검색 selective context | 오늘 **독립 신규 정량 benchmark 확인 못함**; OpenCode ripgrep #59205 경계 조정만 확인 | P4 revision-aware retrieval의 Recall@k/Pass@1/토큰 |
| Model routing | Open SWE model choice가 runtime 내부로 이동했으나 비용/성공률 새 A/B 없음 | Haiku/Opus/Codex 역할별 routing ablation, 무효 재호출 수 |
| Prompt/cache/compaction | prompt cache correctness와 baseline safety 위주; 새 token 절감률 없음 | shared graph vs static prefix cache hit, compaction policy recall |
| Release | Deep Agents Code 0.2.2 신규, Claude Code/Codex 안정 릴리스 신규 없음 | HEAD 기능의 CLI 실제 배포 여부·회귀 테스트 |

**요약:** 오늘 가장 재현 가치가 높은 변화는 **Open SWE의 run-local middleware/stateless backend 전환과 static compiled graph 재사용**이다. 수 MB의 HTTP payload를 없애고 그래프 구성 비용을 반복 지불하지 않도록 하면서 권한·Tool 설명·checkpoint 정합성을 함께 개선한다. Perforce Harness는 **그래프/연결은 공유하되 실행별 권한·스냅샷·evidence·Tool prompt는 절대로 무심코 공유하지 않는 구조**로 PoC를 시작해야 한다.

## 원본 자료 색인(중복 항목 제외)

- Open SWE: [#4560](https://github.com/langchain-ai/open-swe/commit/477b8f1184273bee5aaaf154623725612818fccf), [#4589](https://github.com/langchain-ai/open-swe/commit/918a1046243e5be450397c5dd14f360040b8b9d3), [#4603](https://github.com/langchain-ai/open-swe/commit/bce4428ae1c653bb026febe03a3684faa1bb9434), [#4592](https://github.com/langchain-ai/open-swe/commit/0cce7e50bb72e6675ff9368f9f304b29bd2dac92).
- Deep Agents: [Code 0.2.2 release](https://github.com/langchain-ai/deepagents/releases/tag/deepagents-code%3D%3D0.2.2), [#7296](https://github.com/langchain-ai/deepagents/commit/e72c1e6ca67f23ce49f6cbefcc1805f20133dea1), [#7254](https://github.com/langchain-ai/deepagents/commit/a18ca04b534718e396fdd1815e236ecfb3d5fea7), [#7256](https://github.com/langchain-ai/deepagents/commit/71c9792c998b30b4130f7379a8cda9d93398d3e7), [#7275](https://github.com/langchain-ai/deepagents/commit/ebdee3ef5be4ecea4e1bd973c24e219ffaa4464e), [#6368](https://github.com/langchain-ai/deepagents/commit/4711bf2fe0fc0c0f161db59f42a4708473b9769e).
- Codex: [#57211](https://github.com/openai/codex/commit/5e3496e0ad6a85d7f57cbe3b6d576db3b317766), [#57249](https://github.com/openai/codex/commit/3ad642e520f76ccec0cbb5964ce605629751ebff), [#57240](https://github.com/openai/codex/commit/333d7bde0fb3f7299e758dd75a7d4405e8b541ed), [#57232](https://github.com/openai/codex/commit/4fc522f5e0d3187af8047c4d666d67da3a27ef9b), [#57227](https://github.com/openai/codex/commit/3047741b63abd7543ed78f0f8e0f703b0125ceea), [#57251](https://github.com/openai/codex/commit/f358635d8e9341c46def8a89372fc03f6bffec56).
- Microsoft Agent Framework: [#9261](https://github.com/microsoft/agent-framework/commit/b9c5905d38be91630f06a63097a83075d62a90c6), [#9260](https://github.com/microsoft/agent-framework/commit/5b780766cefab3353c7f3cd0c4260322209c5dd1), [#9405](https://github.com/microsoft/agent-framework/commit/18adf808a57eb6668fc773162037b311d36c5678), [#9606](https://github.com/microsoft/agent-framework/commit/477c6dea16587429f78ee997163a36715fa53ea5), [#8729](https://github.com/microsoft/agent-framework/commit/9337c508e46d5712578bacb2772825fd4da82989).
- Others: [TokenEconomizer default-mode change](https://github.com/microsoft/TokenEconomizer/commit/46f6069a972bd448dd32076af34335dc54a0003f), [OpenCode #59205](https://github.com/anomalyco/opencode/commit/d641fc45f52bd35b410c8c0230e023a503de1e73), [OpenCode #59315](https://github.com/anomalyco/opencode/commit/b2526211ece5f0aad40229aab83701ef4f80f2df).

> **문서 위치 정책:** 본 Scout의 유일한 날짜별 원본은 `ai/trend/ai-harness-token-scout-2026-10-27.md`다. 개별 스킬/제품 문서의 추후 개정은 별도 작업이다. 저장 성공 여부는 파일이 `develop`에서 전체 원문과 일치하는지 외부 검증하여 보고하며, 원문은 다른 카테고리에 복제하지 않는다.
