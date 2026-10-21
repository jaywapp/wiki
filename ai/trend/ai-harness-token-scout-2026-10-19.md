---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-19"
date: 2026-10-19
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, codex, deep-agents, open-swe, perforce, claude-code, durable-state]
---

# 2026-10-19 AI Harness · Context/Token Optimization Scout

> 조사 기준: 2026-10-19 오전(KST), 2026-10-18(UTC) 전후의 GitHub 공식 커밋 및 최근 연구. 릴리스 번호 대신 실제 커밋 일시로 신규성을 판단했다. 기존 대화의 2026-10-18 Scout와 `jaywapp/wiki` `develop` 문서를 대조했다. `develop`에는 10월 18일 날짜의 Scout 파일이 없어, 직전 보고서는 대화 기록에 있는 요약을 기준으로 비교했다.

## 핵심 판단

**새로운 구현 7건 + 이전 Scout에서 확인되지 않았던 정량 연구 1건 + 운영상 후속 변경 1건**을 남긴다. 가장 실용적인 변화는 **대기 중인 부모 Agent의 이벤트 기반 재개, 샌드박스 로그의 선택적 이벤트화와 예산 차단, 새 Thread의 Runtime 소유권 확정, 검색에서 Binary 제외**다. 반면 Tool 선언의 공유는 프로세스 메모리 최적화일 뿐 모델 토큰 절감 실측은 아니다.

| 항목 | 최초 확인된 변화 (UTC) | 토큰/비용 관점 | 평가 |
|---|---|---|---|
| Codex #54961 | 10/18 01:58, 완료한 Root가 Child mail로 다시 깨어남(기본 OFF) | 불필요한 polling 제거 가능, wake 자체가 호출비 발생 | **PoC** |
| Open SWE #4196 | 10/18 03:55, sandbox Monitor + selective output + wake budgets | 전체 빌드 로그 대신 필터 이벤트·필요 시 원문 조회 | **PoC 우선** |
| Open SWE #4216 | 10/18 03:57, 신규 Thread는 생성 시점부터 MDA 소유 | 재시작/이중 실행 위험 축소, 직접 토큰 수치 없음 | **바로 적용 원칙** |
| Deep Agents #7032 | 10/18 12:50, in-memory grep이 base64 binary 무시 | 검색 노이즈·매치 예산 낭비 제거 | **바로 적용** |
| Codex #54946 | 10/17 23:22, 인증 헤더 갱신 시 모델 카탈로그 cache 유지 | 재조회·지연 감소; 모델 토큰 절감 아님 | **PoC** |
| Deep Agents #7037 | 10/18 17:50, 진행 알림 0/최대2/무제한 정책 | 중간 알림·호출 폭주 제어; LLM 토큰 수치 미측정 | **PoC** |
| Codex #54945 | 10/17 23:17, Tool 선언 Arc 공유 | 메모리 복사 감소, **LLM 토큰 절감 아님** | **아이디어 참고** |
| StateHarness (기존 보고서 누락 연구) | **10/13 공개**, 프로젝트 상태/작업 영향 추적의 정량 평가 | 성공률↑, **기존 기본 Agent 대비 토큰↑** | **PoC 우선** |
| Open SWE #4212 (보완) | 10/18 03:56, 부분 Diff에 전체 파일 hydration 금지 | 리뷰 근거 위치 일치성, 토큰 절감 아님 | **아이디어 참고** |

## 1. Codex #54961 — 종료된 Root를 Child 결과로 다시 깨우기

**신규성.** 10월 17일 Scout의 Deep Agents 비동기 Child 완료 통지(#6853)와 목적은 유사하지만, Codex는 **Root가 이미 Final을 보낸 뒤에도 mailbox의 `trigger_turn=false` 알림으로 후속 Turn을 생성**한다는 별도 실행 경계가 추가됐다. `wake_on_agent_messages` Feature Flag는 기본 비활성화다.

**내부 동작.** `codex-rs/core/src/session/handlers.rs`의 직접 mail 전달과 host mailbox 구독 경로 모두 `maybe_start_turn_for_pending_work*`를 호출한다. `turn_input.rs`는 active turn이 없을 때만 예약하고, 자동 wake는 과거 Turn 설정을 재사용한다. **Interrupted 세션, Plan Mode, Child Agent에서는 wake를 제한**한다. `turn_input_tests.rs`, `agent_control_tests.rs`, `scenarios.rs`에서 메시지 한 번에 Root가 한 번 깨어나고 Child→Parent 완료가 이어지는 경로를 검증한다.

**절감 원리/Trade-off.** 부모가 `wait_agents`를 반복 호출하는 polling 비용과 수동 재개를 줄일 수 있다. 다만 늦게 온 Child 결과마다 새 모델 Turn이 생길 수 있어 토큰 절감률을 단정할 수 없다. Context/권한이 오래된 상태로 재개될 위험과 Wake Storm이 단점이다. 공개 정량 절감치는 **없음**.

**적용.** Perforce/TeamCity의 `BuildFinished`, `ReviewFinished`를 `task_id, event_id, generation, parent_turn_id`가 있는 durable mailbox에 적재한다. Root가 완료했을 때 `auto_wake_enabled`와 `human_interrupted=false`인지 확인한 뒤 **동일 task-generation에서 한 번만** wake한다. Claude Code는 기존 Session/Hook과 자체 Child 완료 이벤트, Codex는 #54961을 PoC로 비교. **평가: PoC**. 검증: Child 3개가 동시에 완료한 경우 Turn 수, 이벤트 누락, 최종 Evidence 전달률, 부가 모델 비용.

원본: https://github.com/openai/codex/commit/8c076942cb70fba8e5c4732c23f1faabc4aed484

## 2. Open SWE #4196 — Sandbox Monitor를 '선택적 이벤트 + 원본 증거'로 분리

**신규성.** 기존 `background_execute`와 달리 장시간 실행되는 Command의 **원문은 로컬 번호 매긴 로그에 보존하고, `filter`로 선별한 줄만 Thread Event로 전달**한다. 사용자별 `experimental_monitor`가 기본 OFF이고, Dashboard Background Work 목록은 기본 ON이다.

**내부 동작.** `openswe/sandbox_scripts/monitor.py`가 stdout/stderr를 `raw.log`와 10MiB 단위 segment에 기록한다(최근 50MiB 보관). `filter`는 별도 shell command로 실행하고 줄 단위로 추출한다. `openswe/monitors/delivery.py`가 이벤트를 `mon-<id>:<seq>` 키로 저장해 Callback+Polling 중복 입력을 억제한다. Callback 플래그 OFF일 때 약 1분마다 Poll. `monitor(action=output, start_line, end_line)`로 정확한 원문 범위를 요청하고 기본 조회는 마지막 200줄이다. 종료 이벤트에는 사유, 종료 코드, raw/event 카운트, 최근 20줄, filter stderr를 붙인다.

**Durable Budget.** Thread 동시 모니터 **최대 3개**, 사용자 메시지당 **시작 10번 / 총 Event 50건 / 24시간**, Event로만 자동 재개한 Run은 **최대 10번**. 개별 Monitor는 기본 1시간/최대 24시간이며 2분에 40건 또는 총 200건을 넘으면 `too_noisy`로 종료한다. `monitors/budget.py`, `wake_budget.py`, DB migration 0071 및 `event_match`가 관련 상태를 저장한다. `monitor`의 `command`뿐 아니라 `filter`에도 Push Guard를 적용한다.

**절감 원리/Trade-off.** 수십만 줄의 TeamCity 빌드 로그를 모델에 주입하지 않고 실패 이벤트·Artifact Reference만 전달한다. 그러나 필터가 핵심 오류를 누락하면 품질이 떨어지고, Callback/복구 시 추가 Run 비용이 생긴다. 정량적인 모델 토큰 절감 데이터는 **공개되지 않았다**.

**적용.** `teamcity build --watch` 등과 별도 실행기에서 `WARN|ERROR|FAIL|TEST FAILED` 필터를 운용하되, filter가 빈 결과를 내도 전체 로그의 SHA256과 `log_ref`를 Ledger에 남긴다. Perforce Submit 승인 이벤트를 이 Monitor만으로 자동 처리하지 않는다. 실험: 30개 빌드의 **원문 투입 vs 최근 200줄 vs filtered event + on-demand 200줄**을 비교; 실패 원인 재현율, 모델 토큰, 비용, 시작→발견 지연, false-negative를 측정. **평가: PoC 우선**.

원본: https://github.com/langchain-ai/open-swe/commit/d306285cea768680f0802d7e8b8247825916f377

## 3. Open SWE #4216 — Runtime을 '최초 생성 시점'에 결정

**신규성.** 10월 17일 Scout는 Open SWE의 MDA 전면 전환(#4159)까지 다뤘다. **이번 후속 구현은 신규 Thread가 첫 Run 시에야 `local`에서 `mda`로 claim되는 과도기 구조를 제거**했다. 단순 반복이 아니라 실제 Ownership 전이 시점 변경이다.

**내부 동작.** `openswe/threads/router.py`와 `openswe/threads/index.py`: 신규 Thread는 **생성 시점에 `runtime=mda`로 색인되고 MDA에 생성**된다. `_claim_for_mda`, `/state` first-write claiming, `set_runtime` 등을 제거했다. 기존 Local Thread는 원래 Runtime에서 계속 실행하고, 라우터는 Legacy 접근마다 Context(스레드 ID, runtime, 상태, path 등)를 포함한 경고를 기록한다. 경고 자체의 오류가 조회 API를 실패시키지 않도록 처리했다. `mda/README.md`에는 Run/State/History/Stream/Cancel 전달 계약이 기술돼 있다.

**절감 원리/Trade-off.** 최초 상태 쓰기에서의 이중 경로와 이관 중 불확실성을 제거해 장애/중복 작업 가능성을 줄인다. 모델 토큰 절감 측정은 없다. 구 Thread를 즉시 옮기지 못한다는 운영 부담이 남는다.

**적용.** `TaskCreated -> RuntimeBound(adapter_id, generation, workspace_lease) -> RunStarted`를 단방향 Ledger로 고정한다. Claude Code/Codex Runtime을 바꾸려면 미진행 새 Task만 다른 어댑터로 보내고, 진행 중 Perforce Workspace와 Pending CL은 명시적 Handoff Receipt와 승인 없이 이전하지 않는다. 이전 세션을 읽으면 `legacy_runtime_seen` 지표를 남긴다. **평가: 바로 적용 원칙**. 실험: Run 시작 전 장애, Session Resume, Adapter 교체, Sandbox 분리 시 **동일 외부 Write 0~1회**를 확인.

원본: https://github.com/langchain-ai/open-swe/commit/aa00dc83871b11e134d30565e7901d4b8ae3ed1f

## 4. Deep Agents #7032 — Binary 파일은 in-memory grep 결과에서 완전히 제외

**신규성.** 전일의 CompositeBackend 경로 수정(#7028)과 달리, 이번 변경은 **StateBackend/StoreBackend 검색 결과의 매치 집계 규칙 자체를 수정**한다.

**내부 동작.** `libs/deepagents/deepagents/backends/utils.py`의 `grep_matches_from_files()`가 `encoding=="base64"`를 만나면 `_normalize_content()` 전에 `continue`한다. `test_state_backend.py`, `test_store_backend.py`는 async/sync, glob(`*.txt`, `*.png`), `max_count=1` 조합을 테스트한다. Binary 파일은 **결과에도 없고 `max_count` 한도도 사용하지 않는다**.

**절감 원리/Trade-off.** 잘못 해석된 Binary 데이터가 Search Context에 섞이지 않고 상위 Text Match를 밀어내지 않는다. 특히 Perforce Workspace의 `.uasset`, `.pak`, 이미지, 컴파일 산출물에 중요하다. 단 Binary에 텍스트 메타데이터가 실제 존재해도 이 단순 정책은 찾지 못한다. **모델 토큰 절감량 공개 없음**.

**적용.** Perforce Depot/Workspace 검색 Adapter에 Text-only 기본 정책과 Binary 전용 Metadata Index를 별도 제공한다. Binary 검색이 필요한 Task만 파일 형식별 Extractor를 명시적으로 활성화한다. 검증: 100개의 텍스트 파일+100개의 바이너리에 `max_count=1`을 적용해 최우선 유효 Text Match가 출력되는지 확인한다. **평가: 바로 적용**.

원본: https://github.com/langchain-ai/deepagents/commit/97f856dcb08264ef78722a4687cab9133ec5fb7a

## 5. Codex #54946 — 인증 헤더 로테이션과 모델 Catalog Cache를 분리

**신규성.** 일반 Cache TTL 조정이 아니라 **캐시 Identity 구성 방식을 변경**한 것이다. 안정적 Account ID가 있으면 `CodexAuth::Headers`의 opaque 헤더 변경에 캐시가 불필요하게 무효화되지 않는다.

**내부 동작.** `model-provider/src/models_identity.rs`에서 Provider/Account ID를 identity에 반영한다. ID가 없는 헤더, 명시적 API Key/Bearer/Command Auth에서는 여전히 인증정보 기반 Identity를 사용해 유효 범위를 보수적으로 제한한다. `models-manager/src/manager.rs`는 Caller가 User/Country 등 Catalog의 결과를 달리하는 Context별로 Manager+저장소를 분리할 책임을 명시한다. 회전 시 무효화 테스트는 안정적인 Account ID가 없는 Fixture로 유지된다.

**절감 원리/Trade-off.** Credential Refresh 뒤 Catalog 재조회·Startup 지연을 줄인다. **모델 입력 토큰 절감은 아님**. Workspace 공유 Account ID만으로 멀티테넌트 캐시를 묶으면 다른 사용자의 Catalog를 노출할 위험이 있다.

**적용.** Claude Code/Codex Routing Catalog 키를 `(provider, tenant, principal, geographic_scope, model_catalog_version)`로 관리하고 Credential 자체는 저장하지 않는다. API Key 타입에서는 강제 무효화. 측정: 인증 회전 100회에 Catalog HTTP 재조회 수·Cold Start Latency·Cross-user Leak 0건. **평가: PoC**.

원본: https://github.com/openai/codex/commit/ffd3429d754991183433b4d41b67551e5656ba27

## 6. Deep Agents Talon #7037 — 알림 Budget은 모델 Tool 목록까지 줄인다

**신규성.** `DEEPAGENTS_TALON_VERBOSITY=1|2|3`으로 진행 상황 전달을 Runtime 정책화했다. 1은 중간 알림 0회, 2는 최대 2회, 3은 기존 무제한(기본값)이다.

**내부 동작.** `talon/runtime.py`는 1에서 `send_message` Tool 선언을 제외하고 System Prompt에 최종 응답만 보내도록 명시한다. `messaging.py`는 Tool 외에 자동 서술형 Progress 경로까지 **공유 Invocation Budget**으로 제한한다. ContextVar를 써서 병렬 호출을 분리하고 Resume/Approval 후에도 같은 호출 예산을 유지한다. 106개 집중 테스트가 통과했고 Scripted Model 기반 Talon host/graph E2E에서 두 Turn 동안 각각 중간 알림 **0/2/6건**, 최종 답변은 각 Turn 한 번씩, Tool Activity는 유지됐다. **실제 Live Provider는 Gateway 401 등으로 확인하지 못했다.**

**절감 원리/Trade-off.** 모델에 보여주는 Tool Schema 일부와 외부 Chat Update 수를 줄일 수 있으나, 모델 토큰/비용 감소가 실측된 것은 아니다. 조용한 모드에서는 긴 작업이 중단된 것처럼 보일 수 있다.

**적용.** TeamCity 장기 빌드 중 `ProgressNotificationBudget`을 알림 채널과 모델 호출 Budget과 분리해서 적용. 기본 2(장기 단계 시작/거의 완료), 대화형 디버깅 3, 무인 배치 알림 1을 PoC에서 비교한다. 성공 과제당 Input/Output/Cache Token, 사용자에게 보이는 알림 수, 성공률을 따로 기록. **평가: PoC**.

원본: https://github.com/langchain-ai/deepagents/commit/4bf50225d9f2bd777c1b2aa722e76273eb772ab0

## 7. Codex #54945 — Tool JSON 선언의 구조 공유, Token 절감과 구분

**내부 동작/신규성.** `codex-rs/protocol/src/models.rs`의 `ResponseItem::AdditionalTools.tools`를 `Vec<serde_json::Value>`에서 `Arc<[serde_json::Value]>`로 변경, History/Request/Context Copy가 대형 JSON Tool 선언을 복제할 때 Read-only 메모리를 공유하게 했다. 관련 생성자/테스트 Fixture도 Arc로 교체됐다.

**효과/주의.** 동일 JSON을 모델 API에 전송하는 양이 자동으로 줄지는 않는다. **토큰 절감 주장 금지**. 다만 Subagent가 많을 때 Process RSS, Clone CPU, GC/Allocator 비용에 영향을 줄 수 있다. Mutable Tool Schema와 Revision Update는 Immutable Snapshot으로 버전 관리해야 한다.

**적용.** Harness `ToolCatalogSnapshot(hash, immutable_descriptors)`를 Parent/Child Adapter 사이에 공유하되, 실행 중 Capability/Permission Generation 변경 시 새 Snapshot을 생성한다. 비교 지표: Subagent 1/5/20개에서 RSS, Clone Microbenchmark, Tool Schema Bytes, Input Tokens. **평가: 아이디어 참고**.

원본: https://github.com/openai/codex/commit/1cc7dc8f2acc63ce6c1cb72271e6b90a76136c2b

## 8. StateHarness — 프로젝트 상태 유지의 품질·토큰 상충 (기존 보고서 누락 보강)

**공개일은 2026-10-13(UTC)로, 오늘 신규 발표가 아니다.** 기존 Wiki 검색과 10월 18일까지의 요약에 존재하지 않아 별도 보강으로 수록했다. 원 논문 *StateHarness: Maintaining Evolving Project State for Long-Horizon Coding Agents* (arXiv:2610.17616). 저자는 재현 코드 주소 `https://anonymous.4open.science/r/StateHarness`를 기재했지만 이번 조사 환경에서 저장소 콘텐츠까지 검증하지 못했다.

**구조.** 장기 Task에 현재 문제/가설, Decision 및 Event Log, 저장소 Caller/Test/Doc 관계, 미완료 Work를 영속 상태로 기록한다. 이후 복잡한 과거 Conversation 전체 대신 Compact Working Brief를 전달한다. Interface 변경/삭제처럼 영향도가 높은 작업 전후에 Caller/Test/Docs 후보를 검색하고, 반복 읽기·미완료 상태 등의 징후가 쌓이면 별도 Diagnostic Session이 이전 Evidence를 점검한다. 실험의 Brief 업데이트는 규칙 기반이며 특정 변경 횟수·테스트 호출 수 이후 상태를 갱신하도록 촉구한다.

**검증된 결과와 한계.** RefactorBench의 Full-chain Completion **29.4%→35.3%**, Cleanup-check **87.0%→95.4%**. LHTB 평균 Reward **0.427→0.576**. ChainSWE Bug-fix **35.1%→39.5%**, Residual Debt 60→43이지만 **Pass-to-pass Regression 16→23으로 악화**했다. 중요한 비용: RefactorBench 기준 Recorded Token **25.6K→33.1K(+29%)**, Tool **81→110**, 시간 **383초→529초(+38%)**. ChainSWE에서는 24.9K→35.3K Token. 따라서 이것은 **기본 Harness보다 토큰을 절약하는 방법이 아니라 비용을 더 쓰고 품질을 얻는 Trade-off**다. 연구의 일부 Baseline 비교 조건과 비용 집계 범위는 후속 독립 재현이 필요하다.

**적용.** Perforce Pending CL 전반에 `WorkingBrief(task, affected_files, tested_revisions, unresolved, owner, evidence_refs)`를 저장하고, P4 change-list/코드 Caller/TeamCity Test를 선택적으로 조회한다. Reviewer는 Brief의 `unresolved` 항목에 대해 Evidence 검증 후만 DONE으로 종결한다. Context Summary와 Durable Evidence Ledger는 별도 저장한다. 10개 변화 작업을 대상으로 **현재 Harness vs StateBrief vs Full StateHarness** 3군 비교; 성공 작업당 총비용, Revision 회귀, 미검토 Caller 누락률을 측정한다. **평가: PoC 우선**.

원본: https://arxiv.org/abs/2610.17616  
구조와 계측을 포함한 HTML 논문 미러: https://www.paperpeel.com/paper/2610.17616

## 9. 보완 추적 — 리뷰 Diff는 파일 전체와 부분 Slice를 혼동하면 안 된다

Open SWE #4212(10/18 UTC)는 Review Walkthrough의 부분 Diff Slice를 기존 전체 파일 hydrate 로직에 넣을 때 발생한 `trailing context mismatch`·장식 위치 오류를 수정했다. `ui/src/features/reviews/lib/walkthroughDiff.ts`가 `disableHydration`을 지정하고, `@pierre/diffs` Patch가 세 검사에서 이를 존중한다. **토큰 절감은 없음**. 다만 Perforce의 여러 CL/Hunk를 조합하는 Reviewer가 원본 Revision/Line Number를 잃지 않도록 하는 Evidence Integrity 원칙과 부합한다. **평가: 아이디어 참고**. 원본: https://github.com/langchain-ai/open-swe/commit/0db441be6313a260d8e14c724d481ade86b51c4b

## 중요 후속 상태 및 중복 제외

- **Codex WebSocket Zstd #54930**는 전일 Scout에 포함됐다. 10/17 23:34 UTC의 **#54949에서 Feature Flag 뒤로 이동**했으므로, 압축이 기본 켜짐이라고 가정하면 안 된다. 이는 **네트워크 전송량**에 관한 것으로 모델 토큰 압축이 아니다. https://github.com/openai/codex/commit/7b44ac1661433ae3a6f375fde873fa7123c935fe
- **Claude Code**의 확인 가능한 최신 공식 CHANGELOG 헤더는 **2.1.302**이고, 전일 Scout에 해당 변경이 이미 보고됐다. 추가 릴리스라고 추정해 중복 추가하지 않았다. https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md
- 이번 확인 범위에서 **새로운 독립 RAG·Compaction 절감률 실측, Prompt/Skill 파일 경량화 벤치마크, 새로운 대규모 모델 라우팅 정량 실험은 확인되지 않았다.** 없는 항목을 일반론으로 채우지 않는다.
- 기존에서 보고된 Tool Offload, Fork Cache, Guardian Provenance, Review Cache Revision Isolation, MDA 전체 적용, Context Compaction 기능은 기술적 상태가 바뀌지 않은 한 재수록하지 않았다.

## Perforce · Claude Code · Codex Harness 실행 우선순위

### 지금 구현할 Contract (대체로 기존 기능만으로 가능)

1. `task_id, runtime_id, runtime_generation, workspace_lease, pending_cl`의 **생성 시점 Runtime Binding**을 원자적으로 기록.
2. `event_id, source_run_id, output_ref, filter_version, causal_revision`을 가진 **Append-only Evidence Event**와 별도 원본 Blob 저장.
3. `binary/text` 검색 정책과 형식별 Extractor를 분리. Binary는 기본 grep 매치 예산에서 제외.
4. 각 Tool 실행에 **idempotency_key + outcome=success|failed|unknown**을 붙이고 Unknown은 바로 재실행하지 않는다.

### 재현 가능한 PoC

| PoC | 실험군 | KPI 및 필수 Gate |
|---|---|---|
| Build-log selective context | 전체 로그 / 200줄 / 필터 이벤트 + 근거 요청 | `model_input_tokens`, `cache_read/write`, `verified_failure_diagnosis`, 비용, 누락 0건 목표 |
| Async wake | Polling / Event Wake(1회) / 각 Child 자동 Wake | 성공 Task당 추가 모델 Turn, 멱등 실행, 지연, `Root wake after interrupt=0` |
| StateBrief | 전체 기록 / 1KB Brief / Brief+Relation Index | CL 변경 영향도, 회귀/실패 검출, 총 토큰, 총 완료 시간, 성공 1건당 비용 |
| Catalog cache identity | Token rotation 100회 + Tenant A/B | Catalog Cache Hit, HTTP 재조회, 계정간 Leakage=0, 권한 변경 즉시 적용 |

### 계속 추적할 불변조건

`TaskCreated -> RuntimeBound -> Running -> WaitingForEvidence/Approval -> Verified -> Finalized`가 Ledger에서 단일 방향으로 진행해야 한다. Child Wake와 Monitor Callback은 동일 `task_generation`에서 중복 수신되어도 새로운 외부 P4/TeamCity Write를 발생시키면 안 된다. Summary는 원본 Evidence를 대체하지 못하며, Approval은 LLM Summary에서 도출하지 않는다. 오류 미확정(Unknown Outcome)과 모델 호출 실패에 대한 **실제 Cost Receipt**는 Task 실패 시에도 남겨야 한다.

## 원본 대조 기록

- `jaywapp/wiki` 기본 브랜치가 `develop`임을 GitHub Repo API에서 확인했다. 기존 Trend 문서 `ai/trend/ai-harness-token-scout-2026-09-24.md`와 관련 연구/하네스 문서를 검색했다.
- 2026-10-18 Scout의 세부 주제와 중복 비교했으며, `ai/trend/ai-harness-token-scout-2026-10-18.md`는 `develop`에 404로 존재하지 않아 이전 대화의 보고서 요약을 비교 자료로 사용했다.
- 후보 GitHub Commit의 Title뿐 아니라 실제 Diff, Source 파일 및 Test 목록까지 확인했다. 논문의 공개 수치는 저자 Abstract 및 본문에 있는 보고값으로 구분했다. **직접 Benchmark 재실행은 수행하지 않았다**.

## Wiki 저장 및 검증 대상

Canonical 저장 위치는 **`jaywapp/wiki` `develop` 브랜치의 `ai/trend/ai-harness-token-scout-2026-10-19.md`** 단 한 곳이다. 일일 수집 보고서를 `ai/news/`, `ai/tools/`, `ai/harness/`, `ai/research/`, `ai/tips/` 등에 복제하지 않는다. 반영 성공 여부는 **직접 생성 결과의 Commit SHA**와 **같은 브랜치 `fetch_file` 내용 재조회**로 판정한다.

### 2026-10-19 Wiki 반영 실측 결과

- **생성 시도:** 연결된 GitHub의 `create_file`로 `jaywapp/wiki`, `develop`, `ai/trend/ai-harness-token-scout-2026-10-19.md` 생성을 요청함.
- **쓰기 결과: 실패.** OpenAI 연결 안전성 검사에 의해 쓰기 호출이 차단됨. Commit SHA 없음.
- **읽기 재검증: 실패(원격 파일 없음).** 같은 `develop` 브랜치·파일 경로에 `fetch_file`을 다시 수행했고 GitHub Contents API가 **404 Not Found**를 반환함.
- **백업:** 이 Markdown 파일을 로컬에 보존. 다른 Wiki AI 카테고리에 날짜별 Scout 보고서를 생성하지 않음.