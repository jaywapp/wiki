---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-24"
date: 2026-10-24
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, perforce, claude-code, codex, deepagents, open-swe, benchmarks]
---

# AI Harness · Context/Token Optimization Scout — 2026-10-24

> **조사 기준:** 2026-10-24 05:58 KST (2026-10-23 20:58 UTC). GitHub의 10월 22일 21:00 UTC 이후 변경, 해당 기간의 공식 릴리스·벤치마크 갱신, 최근 공개되었지만 기존 보고서에서 빠진 검증 가능한 연구를 선별했다. **모델 과금 토큰/비용 절감**, **HTTP·DB·디스크 I/O 절감**, **컨텍스트/보안 정합성**을 혼동하지 않는다.

## 1. 중복 검사와 오늘의 결론

- **중복 비교:** jaywapp/wiki develop의 2026-10-19~22 Scout와 현재 대화에 보존된 2026-10-23 원문을 확인했다. 전일 다룬 Claude Code 2.1.307, Codex Memory V2·Reasoning Effort·Resume Revision, Deep Agents 0.7.30 enqueue, Open SWE MDA Worker·Merge Queue CI 후보, Agent Framework Python builder skill, Gemini usage field preservation는 반복하지 않는다. 2026-10-23 canonical 파일은 조사 시작 시 develop에서 **404**였으므로 전일 보고서와 원격 게시 상태를 분리했다.
- **새로운 정량 근거:** [TokenEconomizer](https://github.com/microsoft/TokenEconomizer)는 실제 cache-aware 과금 비용 기준 **18.4~30.9%** 평균 절감(5개 agent/model 조합, 277 SWE-Bench 작업)을 보고한다. 논문은 10월 15일 공개되고 코드 문서가 10월 22일까지 갱신된 자료로, **오늘 새로 릴리스된 기술이 아니라 기존 Scout에서 놓친 연구의 신규 발굴**이다.
- **새 벤치마크 제출:** [ContextBench leaderboard](https://contextbench.github.io/)가 **10월 23일 갱신**됐다. CodeNib는 500-task 제출에서 Pass@1 **77.6%**, line recall **77.9%**, line F1 **28.11%**, SDK 기반 비용 **$0.678/task**를 보고한다. **1,136 전체 작업 결과가 아니다.**
- **당일 확인된 구현 최적화:** Deep Agents의 checkpoint 중복 프롬프트 제거(4.15→1.86 MB), turn 종료 usage 조회(최대 수 MB→KB), skill-only MCP Tool; Codex Guardian truncation의 준비 단계 이관; Open SWE 런타임/Skill contract의 run-scoped 명시화가 우선 검토 대상이다.

| 중요도 | 신규/변경 | 직접 측정 또는 변경 | 판정 |
| --- | --- | --- | --- |
| 1 | TokenEconomizer (기존 누락 연구) | 18.4~30.9% cache-aware 평균 **비용** 감소; 성공률 4/5 설정 향상 | **PoC 최우선** |
| 2 | Deep Agents /btw checkpoint #7202 | 60 checkpoints: 4.15→1.86 MB 저장량 | **바로 적용 원칙** |
| 3 | Deep Agents usage #7206 | 긴 스레드 본문 3.07 MB→2.3 KB 등 | **바로 적용/PoC** |
| 4 | ContextBench 10/23 결과 | 500건: 77.6% Pass@1 / 77.9% recall / $0.678 | **PoC** |
| 5 | Deep Agents skillOnly #7010 | Skill 조회/고정 시 MCP schema 선택 공개 | **PoC** |
| 6 | Open SWE MDA #4464/#4466/#4488 | typed runtime, model-call shape, run-scoped Skills | **PoC** |
| 7 | Codex Guardian #56505/#56533/#56555/#56556 | 컨텍스트 준비 시 선택/상한, async conversation 경로 단일화 | **바로 적용 원칙/PoC** |
| 8 | Codex tracing #56524/#56530 | turn·tool·skill attribution, catalog publication metrics | **바로 적용 원칙** |
| 9 | Claude Code 2.1.309 | 대형 nested CLAUDE.md 반복 compaction 수정; deny/worktree 격리 | **바로 적용 검증** |
| 10 | Deep Agents 0.7.31 #6876 | Tool 출력 retained/truncated/output_file metadata | **바로 적용 원칙** |
| 11 | Open SWE queue #4424 | session-authenticated control, audit, gateway dependency | **PoC** |
| 12 | Microsoft .NET Skill #9651 / Gemini #29868 | .NET progressive disclosure, cancel 후 auto-nudge 중단 | **아이디어 참고/바로 적용 원칙** |

## 2. TokenEconomizer — 사후 세션 학습 기반 Black-box Cost Controller

**출처·신규성:** [Microsoft 원본](https://github.com/microsoft/TokenEconomizer), [arXiv 2610.22732](https://arxiv.org/abs/2610.22732), [아키텍처](https://github.com/microsoft/TokenEconomizer/blob/main/docs/ARCHITECTURE.md), [재현 가이드](https://github.com/microsoft/TokenEconomizer/blob/main/experiments/README.md). 저장소 생성 10/13, 논문 첫 공개 10/15, GitHub 문서 수정 10/22. 금일 관측기간 신규 커밋으로 소개하지 않는다.

**구현:** 완성된 세션 로그를 에이전트별 adapter로 통일한다. **Micro-skills**는 동일 레포에서 반복 발견되는 환경 제약(예: 실패한 테스트 실행법)을 짧은 사실로 다음 세션 시작 시 주입하고, **Tool pruning**은 기본 5개 연속 세션에서 사용되지 않은 Tool을 다음 세션의 native 설정에서 감춘다. **Loop guard**는 같은 실패 루프가 기준보다 길어지면 한 번 방향을 바꾸도록 안내하며 스스로 실행을 강제 종료하지 않는다. 패키지 구조는 tokeneconomizer/trace, ledger, pricing, domain, stage와 별도 plugin·experiments adapters. Claude Code/Codex/Copilot CLI/Pi 연동 경로가 있다. 학습 사실 모형 호출 없이 추출하는 기본 동작이며 선택형 유료 helper는 별도 비용을 계상한다.

**근거·한계:** 논문은 SWE-Bench 6개 repository의 **277개 연속 작업**, **5개 에이전트/모델 조합**, 3 seeds에서 controller 호출 비용 포함 **평균 cache-aware 비용 18.4~30.9% 감소**, 30개 repo×조합 cell 모두 감소, Pass@1은 5개 중 4개 증가를 보고한다. **Claude Code+Opus 4.8에서는 74.0→73.0%(-1.0%p)로 감소**해 무손실이라고 할 수 없다. Web/보안 벤치로 전이했을 때 6.4~21.2% 절감 범위. 비용 기준 결과이며 **모든 사용 토큰 개수의 감소율이 아니다**. Benchmark CLIs는 Claude Code 2.1.170/Codex 0.153.1 등; 플러그인 검증 범위는 Claude Code 2.1.300~2.1.307, Codex 0.153.1~0.163.0로 명시되어 **오늘의 Claude 2.1.309/Codex 0.164에 즉시 적용 보장 불가**. 실험 재현에는 Linux x86_64, Docker, 약 200GB 이미지, API 키가 필요하다.

**Perforce 적용:** 저장소 경로가 아닌 **P4 stream/client/workspace revision**으로 학습 사실을 묶고, Micro-skill에 최초 실패/성공 명령·증거 SHA·만료 정책을 붙인다. P4 submit/resolve, TeamCity trigger, 승인·권한 확인 Tool은 미사용이더라도 자동 prune 금지. 세션별 도구 접근을 permission gate와 분리하며 Claude/Codex용 native deny 정책 변경은 cache-key invalidation 비용까지 합산한다.

**재현:** 동일한 UE5/Perforce 작업 30개 이상을 연속으로 실행, baseline/마이크로스킬만/prune만/loop만/full ablation. (input_uncached, cache_read, cache_write, output, reasoning, USD, success, retry, policy violations) 수집. 시간 순서로 train→eval하고 서로 다른 stream 지식을 혼용하지 않는다. **판정: PoC 최우선.** 장점은 모델 내부 수정을 요구하지 않는다는 점; 단점은 장기적 학습 오류·권한 실수·버전 호환성이다.

## 3. ContextBench 10/23 — 검색 Agent 병렬화와 Source-location Handoff의 정량 제출

**근거:** [공식 리더보드](https://contextbench.github.io/), [평가 코드](https://github.com/EuniAI/ContextBench), [10/22 UTC 결과 게시 커밋](https://github.com/ContextBench/contextbench.github.io/commit/4f979971e04a), [CodeNib 제출 원본](https://github.com/ContextBench/contextbench.github.io/tree/main/submissions/2026-10-19_codenib-agent-haiku55-opus55), [재현](https://github.com/ContextBench/contextbench.github.io/blob/main/submissions/2026-10-19_codenib-agent-haiku55-opus55/REPRODUCE.md). 연구 데이터셋은 1,136건/66 repo/8언어이지만 오늘 leaderboard의 CodeNib 결과는 **verified 500건만** 사용한다.

**아키텍처:** Haiku 5.5 1차 검색과 독립적인 보완 검색 Worker가 같은 이슈를 다른 창에서 탐색한다. 두 Agent의 source locations를 정규화·중복 interval merge하여 **최대 2,048 navigation tokens**만 Opus 5.5 repair Agent로 전달하고, 본문은 수신자가 codenib-read/grep으로 필요한 범위만 조회한다. 검색 Worker의 원문을 거대한 초기 컨텍스트로 복제하지 않는 **sub-agent isolation + selective source fetch** 구현이다.

**수치:** 500건 중 388 해결(**Pass@1 77.60%**), line recall **77.90%**, precision **20.39%**, F1 **28.11%**. Search+repair SDK usage 총 **$338.8766**, 평균 **$0.67775/건**으로 보고. **단독 검색 대비 비용 절감률은 발표되지 않았고**, 다른 모델을 사용한 leaderboard 행과의 비교는 causal 효과를 분리하지 않는다. README는 벤치마크 개발 중 작업 집합 노출, 일부 retrospective selection, 소스 attribution 한계를 스스로 명시한다. 제출 폴더의 recorded aggregation은 재현 가능하지만 신선한 inference 재실행 보증과는 다르다.

**Perforce 실험:** 두 검색 Worker가 P4 변경파일 목록과 symbol index에서 각각 (변경 API 의존성 / 테스트·설정·호출부)를 찾고, 경로·리비전·라인 범위·근거 SHA만 Coordinator에 넘긴다. Reviewer가 원문을 **해당 changelist revision에서** 재조회한 뒤 편집·검증하도록 한다. 30개 CL에서 단일 검색 vs pair 검색을 동일 repair 모델로 비교; recall, context F1, 정밀도, token, $/verified-CL, stale lines, compile 성공 평가. **판정: PoC.**

## 4. Deep Agents 0.2.1 — Skill-scoped MCP Tool Schema (#7010)

**근거:** [deepagents-code==0.2.1 공식 릴리스](https://github.com/langchain-ai/deepagents/releases/tag/deepagents-code%3D%3D0.2.1), [#7010 커밋](https://github.com/langchain-ai/deepagents/commit/227580e26c6cf0ebe2581dc5b488ad3eb3695b43), 소스 libs/code/deepagents_code/agent.py, mcp_tools.py, plugins/adapters/skills_middleware.py, 테스트 skills/test_skill_tools.py.

**변경:** MCP 서버 설정의 **skillOnly: true**일 때 Tool schema를 기본 모델 호출에서 제거하고 Skill이 읽히거나 pinned일 때만 middleware의 metadata.include_tools 경로로 노출한다. 일반 MCP Tool은 이전처럼 eager 등록이 기본값. Subagent에도 별도 적용하며 기존 Tool filter·승인·hook·timeout 정책은 유지한다. Skills 비활성화 상태에는 skillOnly Tool도 노출하지 않는다. 서버-group 단위와 미연결 MCP deferred-connection은 아직 범위 밖이다.

**토큰 원리:** 모든 Turn마다 Tool JSON schema를 재전송할 필요가 없어질 수 있다. Skill 선택 시 schema 노출 및 오선택으로 인한 retry 비용이 새로 생긴다. **공식 절감률 미공개**. Perforce에서 read-only 탐색 Skill, 제출 Skill, CI Skill별 MCP 목록을 분리하고, submit Tool은 Skill이 로딩되더라도 서버의 별도 권한/승인을 통과하게 한다. SKILL.md 자체의 앞부분에 필수 안전 지침만 남긴다. **판정: PoC**, schema tokens와 cache invalidation을 함께 측정.

## 5. Deep Agents #7202 — 대형 System Prompt를 Checkpoint에서 1회 참조로 전환

**근거:** [#7202](https://github.com/langchain-ai/deepagents/commit/2025b7ca6ad8976e), libs/code/deepagents_code/btw.py, sessions.py, tests/unit_tests/test_btw.py. 10/23 20:27 UTC 병합.

**동작:** 부가 질문 기능 /btw의 전체 system prompt를 모든 conversation checkpoint에 복제하는 대신 SQLite **dcode_btw_prompts**에 thread당 1회 별도 저장한다. 프롬프트가 변경될 때만 async write하며, resume 시 참조·legacy checkpoint fallback·누락 대응·thread 삭제 시 정리를 수행한다. 프롬프트 쓰기 실패가 메인 turn을 중단하지 않도록 설계되어 재시작 직후 prompt 일관성은 별도 검증해야 한다.

**실측:** Fake-model 3 turns, 60 checkpoints 기준 steady-state row **~81.0→34.1 KB(-57.9%)**, 전체 checkpoint **4.15→1.86 MB(-55.2%)**, pending-write **172→31 KB(-82.0%)**. 이는 **DB/I/O 바이트 절감**이지 모델 prompt token 절감률이 아니다.

**적용:** TaskLedger에 긴 고정 지침을 복제하지 말고 **PromptArtifact(prompt_sha,version,source_path)** 1회 등록 후 각 checkpoint는 참조만 한다. P4 client/stream별 변형은 별도 SHA로 구분하고 immutable policy는 외부 보존. 100/1,000 checkpoint에서 저장량, resume p95, crash 복구율, stale-policy loading=0 평가. **판정: 바로 적용 원칙.**

## 6. Deep Agents #7206 — Turn 종료 비용·Cache만 선택 조회

**근거:** [#7206](https://github.com/langchain-ai/deepagents/commit/516247424485), libs/code/deepagents_code/btw_api.py, client/remote_client.py, tests/unit_tests/test_cost_tracking.py. **새 /usage endpoint**가 latest checkpoint에서 cost/cache channel과 부가 질문 비용만 읽고 두 번의 full graph state 요청을 한 번으로 치환한다. 누락 또는 404면 full-state fallback하되 404 endpoint 재시도는 멈춘다. Resume에서는 여전히 전체 이력이 필요해 기존 read를 유지한다.

**실측 (76GB sessions DB):** 706 messages thread의 응답 본문 **3.07 MB→2.3 KB**, read time **83ms cold/36~66ms warm→0.9~3.3ms**. 972 messages **1.76 MB→0.3 KB**, **144ms cold/19ms warm→0.8~1.6ms**. 197 messages **1.14 MB→2.2 KB**, **180ms cold/35~39ms warm→0.8~2.0ms**. *Before 시간은 in-process state read만 측정했으며 전체 HTTP/client p95 비교가 아니다.* **모델 token 절감 증거는 없다.**

**Perforce 적용:** P4 submit/build 이후 dashboard에서 status/tokens만 보여줄 때 TaskLedger 전체 이벤트를 재조회하지 말고 **UsageSummary(task_id,checkpoint_rev,provider_usage,cache_stats)** endpoint를 구현. detail/debug 명시 요청에만 full history를 로드. **판정: 바로 적용/PoC.**

## 7. Deep Agents 0.7.31 #6876 — Tool Output 축약 사실을 Machine-readable Receipt로 남김

**근거:** [0.7.31](https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.31), [#6876](https://github.com/langchain-ai/deepagents/commit/8b8e70a1c5858e44cc4b8e7c499265c90a8c5786), libs/deepagents/deepagents/backends/protocol.py, middleware/filesystem.py.

**동작:** ExecuteArtifact에 **truncated**와 **output_file** 필드를 추가. Output이 backend에서 실제 잘린 것과 일부를 offload하고 저장한 것의 상태를 분리하고 exit_code와 함께 metadata를 노출한다. Output file 자체도 잘렸을 수 있으므로 증거 원문과 동등하다고 가정하면 안 된다. Trace에 남는 일부 metadata와 user-visible 축약을 분리한다.

**적용:** UE5 compile log, P4 sync, TeamCity test의 head/tail 요약에 **retained_bytes, omitted_bytes, artifact_uri, artifact_sha, truncated, source_revision, exit_code**를 붙인다. Reviewer가 오류 첫 줄만 보고 성공 판정하지 않도록 evidence-complete flag를 요구한다. Token 절감은 output caps에 의존하며 이 변경은 **관측가능성**, 별도 모델 토큰 실측 없음. **판정: 바로 적용 원칙.**

## 8. Codex #56505/#56533/#56555 — Reviewer Transcript의 단계별 Budgeting

**근거:** [#56505](https://github.com/openai/codex/commit/1c0c45bfc372fb7d), [#56533](https://github.com/openai/codex/commit/0efc474605ac6983), [#56555](https://github.com/openai/codex/commit/5deceaa92732d1e4), [#56493](https://github.com/openai/codex/commit/e52045f98922e9a7), 파일 codex-rs/guardian-context/src/{profile,transcript,composition}.rs, core/tests/suite/guardian_context_budget.rs.

**구현 변경:** Guardian sync reviewer가 Tool-call / Tool-output / Assistant message를 collector 단계에서 성급하게 잘라버리지 않고 **transcript preparation** 단계에서 profile별 cap과 message admission을 수행한다. Tool description도 raw type로 수집해 context composition에서 bounded·untrusted text로 다룬다. 반면 pending action의 실제 JSON과 필요한 사용자 지시·승인 근거는 optional description budget과 분리해 보존한다. Large action·history·MCP metadata에 대한 회귀 테스트가 추가되었다.

**절약/품질:** 같은 데이터를 단계마다 반복 truncation하는 것을 줄이고, Reviewer가 받은 증거가 최종 선정된 profile에 부합하도록 한다. 실제 모델 token 절감률 없음; cap으로 인해 과거 tool output의 tail이 사라질 수 있다. **중요한 원칙은 selective admission 전에 증거의 출처·우선순위·필수 구간을 확정**하는 것.

**Perforce 적용:** (1) full evidence raw artifact 보관 → (2) 위험도/CL 변경 범위에 따라 required/optional 분류 → (3) approval Reviewer model에만 cap 적용. truncate 단계의 SHA와 omitted marker 보존. mutation 판단에 필요한 P4 CL revision과 check 결과는 필수. **판정: 바로 적용 원칙, cap 수치 PoC.**

## 9. Codex #56556 — Guardian v2 Async Classification을 Conversation 경로로 통일

**근거:** [#56556](https://github.com/openai/codex/commit/4b1cf9a4c9be0f5c), ext/guardian-v2/src/async_scorer/{classification,conversation}.rs 및 model/stateful async tests.

**변경:** Async classifier의 snapshot-vs-conversation 구분을 없애고, **retained conversation backend만** 실행 경로로 사용한다. 이전 설정의 async_classifier_mode는 수용하되 무시하고 startup warning을 남긴다. Conversation backend를 사용할 수 없으면 **fail closed**, 모델 전환 호환성에서는 obsolete 모드 차이를 배제한다. Snapshot sampling은 테스트 전용으로 남겼다.

**의의/Trade-off:** Preview context와 실제 결정 context의 불일치를 줄여 stale approval 위험을 낮추지만 async classifier 추론 비용의 절감은 입증되지 않았다. **P4 적용:** ApprovalClassifier의 입력을 cursor와 evidence_generation으로 식별하고, 승인 직전 CL 최신 revision을 다시 확인한다. Backend 일시 장애 때 자동 허용하지 않는다. **판정: PoC / 안전성 원칙 바로 적용.**

## 10. Codex #56524/#56530 — Turn·Tool·Skill별 Observability와 Catalog 발행 계측

**근거:** [#56524](https://github.com/openai/codex/commit/b82d542aefbbcc1f), [#56530](https://github.com/openai/codex/commit/ea819e1f4d075977), core/src/tools/call_trace.rs, core/src/turn_timing.rs, ext/skills/src/tools/read.rs, ext/extension-api/src/capabilities/metrics.rs.

**변경:** 종료/중단된 turn별 sampling request·retry 횟수를 **codex.turn_profile**로 기록하고, tool dispatch span에 conversation/turn ID, tool source와 dispatch→result-ready elapsed를 붙인다. Skill read는 cache/provider 조회 **이전에 선택한 source**(cloud/executor, plugin/skill, continuation)를 trace로 남긴다. Catalog count histograms **codex.skills.catalog.entries**와 **codex.plugins.catalog.entries**는 새 publication만 기록하고, cache hit/동일 실패 재관측은 표본에 중복 추가하지 않는다. Partial 상태는 warning보다 우선한다.

**효과:** 모델 token을 직접 줄이지는 않지만 절감 주장에 필요한 **attribution·중복 계측 방지**를 만든다. P4 Harness의 turn_id→tool_id→P4 CL→build_id→evidence_sha를 OpenTelemetry span으로 연결하고, cache_hit·schema bytes·retry_after·USD/verified_task를 event attribution에 묶는다. Tool argument/원문 출력 등 비밀 내용은 trace에 담지 않는 기본 원칙을 권고. **판정: 바로 적용 원칙.**

## 11. Claude Code 2.1.309 — Nested CLAUDE.md의 무한 압축 회귀·실행 격리 수정

**근거:** [Anthropic 공식 v2.1.309](https://github.com/anthropics/claude-code/releases/tag/v2.1.309), 2026-10-22 22:18 UTC 공개. 이전 Scout 2.1.307과 다른 새 릴리스다.

**확인된 변경:** 거대한 nested CLAUDE.md를 Read한 뒤 **compaction이 반복되던 회귀를 수정**하고 파일이 상한을 넘으면 **앞부분만 로드**한다. 그 외 symlink 경로의 sandbox denyWrite 적용, --mcp-config 파일 보호, 비활성 MCP 재연결 방지, 분할 agent teammate가 leader의 Tool deny/--tools를 상속하지 않는 문제를 고쳤다. 길어진 Tool preview가 멀티바이트 이모지 중간에서 잘려 transcript JSON이 깨지던 문제도 수정.

**토큰·품질 Trade-off:** 반복 요약과 잘못된 긴 설정 노출을 방지하지만 **front-only loading은 tail에 있는 필수 정책의 누락 위험**이 있다. 정확한 상한 바이트/절감률은 changelog에 공개되지 않았다. P4/UE5는 CLAUDE.md 최상단에 mandatory policy와 reference 인덱스만 두고, 상세 지침은 Skills/references로 분리. 2.1.307→309 A/B에서 compaction_count, input/cache tokens, tail policy coverage, denied Tool 재노출=0 검증. **판정: 바로 적용 검증**, 운영 전 smoke test 필요.

## 12. Open SWE #4464/#4466/#4488 — Typed Runtime + Run-scoped Skill Context

**근거:** [#4464](https://github.com/langchain-ai/open-swe/commit/99afef10c9d8), [#4466](https://github.com/langchain-ai/open-swe/commit/9147f8884cf6), [#4488](https://github.com/langchain-ai/open-swe/commit/dcb41ea38db5), 핵심 mda/rt/backend.py, mda/rt/skills.py, packages/runtime-api/src/runtime_api/{endpoint,skills,loop}.py.

**아키텍처:** 임의 이름의 remote hook JSON 경로를 **공유 typed runtime_api endpoint**로 통합했다. 각 endpoint는 요청/응답 schema, deadline, 실패한 delivery의 재시도 계약을 명시한다. MDA model loop의 middleware는 가짜 ModelRequest를 통과시키지 않고, **CallShape**로 시스템 지시·Tool visibility에 기여하는 내용을 명시적으로 반환한다. 기존 fake request 경로에서 cache markers, model policy, 추가 Tool 등 변화가 묵살될 수 있었다는 회귀를 근거로 한다.

**Skill 격리:** run 시 backend가 허용된 Skill 파일만 나열하고, runtime이 **읽기 전용**으로 보관하여 model call과 subagent에 필요한 Skill descriptor를 공개한다. 개인별 Skill은 public thread의 이전 checkpoint에 남아 있더라도 다른 사용자의 새 run으로 전달되지 않게 run마다 재조회한다. 읽을 때만 필요한 파일을 열도록 하되 list metadata와 실제 파일 body를 구분한다.

**절감·위험:** 중복 시스템 Prompt/Tool을 줄일 가능성이 있지만 **실측 모델 token 개선율 미공개**; run마다 Skill 재조회는 backend I/O를 늘릴 수 있다. ACL 체크 누락은 심각한 정보 누출. **Perforce 적용:** TaskRuntimeAdapter 계약에 **(task_id, run_generation, p4_client, stream, tool_capability, skill_sources, auth_scope)**를 명시하고 child run은 별도 capability로 발급한다. skill snapshot SHA와 model-call-effective-toolset SHA를 기록. 사용자 권한 변경 및 old checkpoint 재개에서 개인 Skill leakage=0. **판정: PoC.**

## 13. Open SWE #4424/#4489 — Durable Queue Control과 불필요한 Replay Stream 제거

**근거:** [#4424](https://github.com/langchain-ai/open-swe/commit/5a062fe23746125b), [#4489](https://github.com/langchain-ai/open-swe/commit/812ae06a6679632a), docs/MERGE_QUEUE.md, merge_queue/routes.py, threads/runtimes.py.

**Lifecycle 변화:** Merge Queue에 세션 인증된 요청/철회/상태·priority·pause/resume API, repo permission과 workspace binding, request owner/operator 제한, audit attribution이 추가됨. API key/bearer는 사람 제어 API 인증에 사용하지 못하며 signed dispatch gateway 전제. **Queue는 여전히 default disabled이며 완성된 자동 promote/merge가 아니다.** Run에서 재생을 듣는 소비자가 없는 durable/background 작업은 stream_resumable 저장을 무작정 켜두지 않고 webhook 정산을 우선한다. Replay 비활성화의 절약은 저장/I/O 영역이고 모델 token 개선은 미측정이다.

**Perforce 적용:** submit queue를 곧장 자동화하기보다 **human admission→shelve evidence→TeamCity 검증→guarded submit** 단계별 lease/fence와 별도 viewer/report API로 구성. 작업 상태가 unknown이면 P4/TeamCity authoritative query로 reconcile. Webhook payload는 generation, idempotency key를 검증. **판정: Queue PoC / no-consumer stream 미생성은 바로 적용 원칙.**

## 14. Microsoft Agent Framework #9651 — .NET Consumer Skill의 Progressive Disclosure

**근거:** [#9651](https://github.com/microsoft/agent-framework/commit/4982e4c61ec8), [skills/agent-framework-builder-dotnet/SKILL.md](https://github.com/microsoft/agent-framework/blob/main/skills/agent-framework-builder-dotnet/SKILL.md), [skills README](https://github.com/microsoft/agent-framework/blob/main/skills/README.md). 전일 보고한 Python consumer skill #9374의 **새 C#/.NET 대상 확장**이며 패턴 자체의 신규 발명으로 계산하지 않는다.

**구조:** 작은 SKILL.md에서 plain/harness/workflow/declarative/evaluation/observability/hosting/integrations를 라우팅한 다음 **references/*.md를 해당 작업에만 읽는다**. AgentBuilder, workflow, extensibility 등 구현별 예제를 나누고 팀 contributor 지침과 소비자용 skill을 분리한다. 실제 reduction benchmark 미공개. UE5 native tool을 건드리는 C++/C# automation에도 단일 긴 Skill 대신 기본 안전 계약+작업별 references 패턴을 차용할 가치가 있다. **판정: 아이디어 참고** (Python 패턴과의 중복성 때문에 독립 우선순위 낮음).

## 15. Gemini CLI #29868 — 취소 이후 Continuation Stream과 Auto-nudge 중단

**근거:** [#29868](https://github.com/google-gemini/gemini-cli/commit/a3dd9f8c7bcb), packages/cli/src/ui/hooks/useGeminiStream.ts 및 테스트.

**변경:** 요청이 취소된 뒤 continuation stream 처리를 이어가거나 automatic nudge를 새로 발행하는 경로를 차단한다. 명시적 취소 후 후속 모델 요청/Tool이 재시작되는 잘못된 lifecycle을 막는 변경이며 **정량적 token/비용 절감률은 공개되지 않았다**. P4 Harness의 cancel은 모델/stream에 적용하고, 이미 출발한 submit/build는 별도의 **outcome_unknown→서버 재조회**로 관리한다. **판정: 바로 적용 원칙.**

## 16. 오늘의 Harness 채택 계획 및 재현 가능한 측정

**P0 — 결과 품질을 망치지 않는 즉시 변경**

1. Immutable 증거: **EvidenceReceipt(task_id, stream, cl_rev, path, line_span, source_sha, content_sha, retained_bytes, truncated, evidence_complete)**. Reviewer가 필요한 원문을 selective fetch한 뒤 승인을 내리게 한다.
2. Durable 상태: **TaskLedger(task_id, execution_generation, state, parent_id, p4_client, stream, cl_rev, model_route, skill_snapshot_sha, context_generation, cost_receipt, effect_receipts, checkpoint_rev)**. Task ID만으로 이전/새 실행을 혼동하지 않는다.
3. Tool/side-effect: **intent→admitted→dispatched→confirmed/unknown**. P4 submit/TeamCity trigger/원격 문서 게시에는 blind retry 금지; readback/reconciliation 필수.
4. 운영 데이터 효율: 상태/비용 UI는 lightweight endpoint만 읽고, DB checkpoint는 긴 system prompt를 SHA 참조로 저장하며, 취소/중단 후 추가 자동 모델 호출을 막는다.

**P1 — 토큰/비용 최적화 PoC, 같은 CL 30개 이상**

| 실험 Arm | 통제할 변수 | 반드시 기록할 수치 | 합격 조건 |
| --- | --- | --- | --- |
| Baseline | 동일 Claude/Codex 버전·모델·effort | token 유형별/실제 USD, cache hit, 성공 | 비교 기준 |
| Micro-skill | 검증된 환경 사실 최대 2개만 | 사실 재사용률, 실패 명령 재시도, USD | USD/성공 CL 하락, 정책오류 0 |
| Skill-only Tool | role/skill 호출 시 schema 노출 | schema byte/token, cache miss, Tool 탐색 지연 | 필수 Tool recall 100% |
| Pair-search+selective fetch | 2 worker가 위치만 handoff | line recall/F1, 중복 조회, 검색 비용 | evidence recall 손실 없이 USD 개선 |
| Reviewer budget | required/optional 후 admission | omitted marker, false approve, review token | critical evidence recall 100% |
| Stage-based routing | 동일 모델 지원 범위의 effort 전환 | reasoning/output/cache tokens, success | 기존 성공률/검증률 비열화 |
| TokenEconomizer full | 5+ 반복 세션에서 학습·prune·redirect | cache-aware **cost**, walltime, 실패 루프, 성공률 | 품질 저하 없을 때만 전개 |

**정량 목표를 결과로 오해하지 않는다:** 사용자 환경에서 18.4~30.9%는 **검증 전 가설**이다. 논문의 277 SWE-Bench 성과를 P4/UE5 수치로 이전하지 않는다. 모델의 cache-read 할인·cache write surcharge·tool schema 변화·한번에 읽는 prompt size를 실제 청구 청구서와 대조한다.

**P2 — 추적 지속/신규 근거 부재**

- **RAG·검색 selective context:** 오늘은 ContextBench의 submission·CodeNib로 증거가 추가되었지만 UE5 C++/Blueprint 단위 정량 성과는 아직 없음.
- **Context pruning/compaction:** Codex Guardian preparation과 Claude nested CLAUDE.md 회귀가 변경된 지점. 별도 회귀 전 **절감률 단정 금지**.
- **Model routing:** Claude/Codex에서 재현된 새 자동 모델 변경 최적 조합의 공개 benchmark는 본 수집에서 확인하지 못함. TokenEconomizer는 model weights/agent 자체를 바꾸지 않는 controller라는 점을 구별.
- **Cache 활용:** TE의 cache-aware cost accounting, Codex catalog publication attribution, Deep Agents token/cache usage selective endpoint만 새 근거. Cache hit의 실제 변화는 아직 미측정.
- **Session/handoff:** CodeNib source-locations only, Open SWE runtime API, Deep Agents durable checkpoint를 추적. Source identity와 execution_generation 없는 handoff는 거부.
- **데이터 분석 주의:** 모델 토큰 절감, USD 감소, 디스크 MB 감소, HTTP 응답 byte 감소, CPU milliseconds 감소는 **서로 다른 축**이다.

## 17. 출처·검증 범위 및 Wiki 반영 정책

- **1차 원본:** GitHub official commit/release, Microsoft TokenEconomizer repository·paper·experiments, ContextBench 평가 코드·심사된 공개 submission artifact. README 주장에 의존하는 결과는 **제작자 보고 값**으로 표기했고 직접 전체 재현을 수행했다고 주장하지 않는다.
- **기준시각:** 2026-10-24 05:58 KST. 이후 올라온 변경·추가 논문은 다음 Scout 대상으로 남긴다.
- **중복/범위:** 이 문서는 날짜별 Trend 관찰 보고서이며 ai/news, ai/tools, ai/harness, ai/research, ai/tips에 별도 동명 보고서를 만들지 않는다.
- **Canonical:** jaywapp/wiki / **develop** / **ai/trend/ai-harness-token-scout-2026-10-24.md**.
- **게시 검증:** GitHub Contents API create/update 후 develop에서 동일 전체 원문을 재조회하고 blob SHA/commit을 별도 작업 결과로 보고한다. **이 문서 본문에는 업로드 완료를 사전 선언하지 않는다.**
