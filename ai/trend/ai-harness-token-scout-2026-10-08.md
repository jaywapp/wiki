---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-08"
date: 2026-10-08
category: trend
tags: [ai-harness, context-engineering, agent-orchestration, token-optimization, claude-code, codex, deepagents, perforce, durable-state]
---

# 2026-10-08 AI Harness · Context/Token Optimization Scout

> 조사 마감 2026-10-08 05:59 KST(UTC 2026-10-07 20:59). 공식 GitHub commit/릴리스와 모델 제공사 문서를 우선 확인했다. 절감률·품질 측정이 없는 변경에 추정 숫자를 부여하지 않았다.

## 중복 제거 / 선별

jaywapp/wiki develop의 ai/trend 목록과 10/03 canonical 보고서를 확인했다. 10/08 canonical 파일은 아직 없다. 10/04~07 Scout에서 이미 다룬 Tool schema delta, stable prompt prefix, Skill→Tool disclosure, ContextBaseline, TaskWriterLease, reviewer JSON provenance, 1 KiB notice, prompt cache lease, AgentRuntimeIdentity, bounded retrieval, ±3줄 diff 선택 등은 되풀이하지 않았다. 과거 날짜 보고서 중 develop에 없는 파일은 이 대화의 Scout 본문도 중복 기준으로 삼았다.

| 이번 신규 변화 | 근거 | 평가 |
|---|---|---|
| Haiku 5.5 / Sonnet cache 단가 인하 | 10/07 Anthropic 출시, Claude Code 2.1.293 | **CostEstimator 바로 적용 / Router PoC** |
| Deep Agents pinned_skills | 10/07 SDK 0.7.23 (#6810) | **PoC** |
| Open SWE async task coordination | 10/07 #3658/#3681, DB migration | **PoC 우선** |
| Open SWE cloud↔Mac checkout handoff | 10/07 #3704/#3769 | **Perforce 대응 PoC** |
| Codex Guardian stale review / persisted sender | 10/07 #51683/#51734/#51651 | **바로 적용 원칙** |
| Codex context-window Tool declaration mode | 10/06~07 #51480/#51755/#51823 | **바로 적용 원칙** |
| Open SWE event feedback loop breaker | 10/06 #3651 실사례 | **바로 적용** |
| Open SWE Reviewer prompt 축소 | 10/07 #3713 | **A/B만, 기본 도입 보류** |

## 1. Haiku 5.5 출시 — 저비용 Subagent와 Cache-aware Router 재평가

**신규성:** 2026-10-07 출시 Claude Haiku 5.5(model ID claude-haiku-5-5)는 1M context, effort 제어를 제공하며 Claude Code 2.1.293의 기본 Haiku다. 공식 MTok 단가(100K 이하 prompt)는 input $0.10/output $0.50/cache read $0.01/cache write $0.125, 100K 초과 시 $0.50/$2.50/$0.05/$0.625이다. 100K 경계에서 모든 단가가 5배 증가한다. 제조사는 종전 Haiku 4.5 대비 평균 작업 비용 약 75% 감소를 추정한다. **같은 날 Sonnet 5.5 cache read는 $0.20→$0.10/MTok로 인하**돼 제조사는 일반적인 agentic workload 비용 약 20% 감소를 제시했다.

**정량/품질:** 제조사 평가 Terminal-Bench 4.0 Haiku 39.2%, Sonnet 70.6%; FrontierCode 1.1 Main Haiku 46.4%, Sonnet 52.1%(Xhigh). 다른 노력 수준/하네스 조건을 직접 동일 환경 성능으로 해석하면 안 된다. Haiku에서 출력이 길어지거나 prompt 100K를 넘으면 비용 이점이 감소한다.

**내부 원리:** token compression이 아니라 단순 결정(Goal grading, 분류, 요약, 짧은 검색)을 저비용 모델로 라우팅한다. Deep Agents #6844도 Auto classification/summarization/rubric/goal sidecar에 Haiku 5.5를 추천하도록 바꾸면서 main-agent 선택은 유지했다.

**Perforce+Claude+Codex PoC:** 과거 30~50개 CL로 ①모든 단계 Sonnet/Codex, ②Haiku로 Tool-output 분류·root-error 추출·Skill 라우팅만, ③Haiku self-confidence 낮을 때 상위 모델 승격을 비교한다. input/output/cache read/write, 전체 subagent 합산 API 비용, verified completion, critical miss, Tool reread, retry 및 latency를 기록한다. 최종 submit approval은 반드시 authoritative verifier에서 수행한다.

**평가: CostEstimator 단가 바로 반영; 실제 routing PoC.**

Sources: [Anthropic 출시](https://www.anthropic.com/claude-haiku-5-5), [Claude Code 2.1.293](https://github.com/anthropics/claude-code/releases/tag/v2.1.293), [Deep Agents #6844](https://github.com/langchain-ai/deepagents/commit/9597f95948b7b018af919448a0d67b4c3d71c2b1).

### Claude Code 2.1.293 보조 변경

Mod의 tool.register에 isDeferred가 추가되어 false일 때 Tool schema를 초기에 공개할 수 있다. 반면 default deferred Tool search를 유지하면 드문 Tool은 필요할 때만 발견한다. Context compaction 직전 완료한 행동을 compaction 후 다시 실행하거나 철회하던 문제, Bash cat/head/tail/grep로 파일을 볼 때 path-scoped CLAUDE.md가 누락되던 문제도 수정됐다. 이는 Tool disclosure 실험에서 **문맥 생존성·중복행동**까지 확인해야 한다는 실증적인 버그 수정이지 별도 절감 벤치마크는 아니다.

## 2. Deep Agents 0.7.23 — 사용자/앱이 선택한 Skill을 다음 호출 전에 주입

**신규성:** 10/07 #6810에서 state의 pinned_skills 이름 배열을 SkillsMiddleware가 읽고 다음 model call **전에** 선택된 SKILL.md의 frontmatter를 제외한 본문을 순서대로 HumanMessage에 삽입한다. 각 메시지에 Skill name/path/description 등의 source metadata가 붙는다. Skill include_tools도 같은 경로에서 노출한다. Pending pins는 소비 후 지우고 parent↔child로 미전달하며, History의 이미 삽입된 Skill 본문은 보존하여 cached prefix 재사용을 유지한다. 파일을 편집한 뒤 동일 Skill을 다시 pin하면 최신 본문이 새 메시지로 들어간다. v0.7.23에는 fresh subagent의 별도 SkillsMiddleware 버그 수정 #6820도 포함되지만 해당 설계는 전일 Scout에서 이미 다뤘다.

**절감 원리:** 전체 Skill body를 상시 prompt에 싣지 않고 사용자 요청/TaskClass에 따라 소수만 공개한다. 위험은 pin 반복에 따른 문맥 증가 및 존재하지 않는 Skill을 조용히 건너뛰는 동작이다. 필수 skill은 별도 CapabilityPreflight에서 fail-closed 검사한다.

**Perforce 적용:** p4-review/UE-build-log/symbol-index-lookup/TeamCity-report 중 Task별 1~2개만 pin한다. pinned-skill 본문과 Tool schema의 content hash를 ledger에 남긴다. Eager all-skills, on-demand read, pinned-skills 3-arm에서 초기/전체 tokens, body reread, cache hit, miss/solve rate를 비교한다.

**평가: PoC.**

Sources: [#6810](https://github.com/langchain-ai/deepagents/commit/70226333bac013b1b1e37acedfb7955f7e6cd6f8), [0.7.23](https://github.com/langchain-ai/deepagents/commit/9f4bdf7c8b8bfc86877729d80ed286bd71d78706). Implementation: libs/deepagents/deepagents/middleware/skills.py, tests/unit_tests/middleware/test_pinned_skills.py.

## 3. Open SWE — Durable Task Coordinator와 비동기 Worker가 실제 데이터 모델로 구현됨

**신규성:** #3658(10/07)은 약 76개 파일에서 task coordinator, spawn_worker/message_task_thread/task_status Tool, background worker, transcript/event 연결, cancellation/결과 전달을 구현한다. #3681은 sidebar에서 coordinator 아래 worker를 계층화한다. **기본값은 OFF인 실험 기능**이다. DB migrations 0051/0052에는 task, task_membership, task_delegation, task_message 등이 있다. TaskEvent를 model chatter와 분리하고 worker result는 untrusted로 표시한다. Working sandbox는 공유될 수 있으므로 role별 workspace isolation을 자동 보장한다고 해석해서는 안 된다.

**절감 원리/비용:** Worker의 전체 history 대신 event/result만 coordinator context로 전달하고 대기 중 불필요 wakeup을 줄일 수 있다. 반대로 worker가 많아지면 총 inference·중복 탐색·동일 파일 충돌이 증가한다. 공개 token/latency 절감률은 없다.

**Perforce 구현안:** Task(root_id, coordinator_thread, ledger_revision, status), Membership(worker_thread, role), Delegation(model, effort, client, pending_cl, launch_error, cancelled), TaskEvent(seq, kind, origin, evidence_ref, ack_state)로 관리한다. read-only reviewer는 같은 depot view를 공유할 수 있지만 mutating worker의 p4 client/CL은 개별 MutationLease로 격리한다. TeamCity 완료 이벤트도 TaskEvent만 남기고 parent를 항상 깨우지 않는다.

**평가: PoC 우선.** 단일 worker 대비 cost/verified-task, duplicate edit/build, cancel/restart, completion ledger 정확도로 검증.

Sources: [#3658](https://github.com/langchain-ai/open-swe/commit/1483d1e8cd6f160bd7247f9bcca43918c1e7c6c2), [#3681](https://github.com/langchain-ai/open-swe/commit/a425c60c634fc47d210a1139cb30f2d33d5b526c). Implementation: agent/tasks/, agent/middleware/task_coordination.py, agent/database/migrations/versions/0051_*, 0052_*.

## 4. Open SWE — Cloud↔Local Session Handoff에서 작업물까지 원자적으로 이동

**신규성:** #3704는 cloud와 Mac의 동일 thread 간 이동을 구현하며 agent/sandboxes/handoff.py에서 git bundle과 임시 commit-tree를 이용한다. Branch, origin에 없는 commit, uncommitted changes를 별도 index에서 패키징하여 작업 중인 index를 변경하지 않는다. Target은 origin fetch 이후 bundle을 적용한다. Ignored file, 다른 repository, 실행 중 프로세스, local 환경은 옮기지 않는다. #3769는 작업자가 사용자의 기존 checkout에 직접 commit하지 않도록 새 branch/worktree로 옮기는 handoff를 추가했다.

**Context/Token 효과:** 요약된 대화만 옮기고 실제 diff가 사라져 같은 파일을 다시 읽거나 수정하는 일을 줄일 수 있다. 그러나 전송·복원 자체에는 시간 비용이 있고 Git과 Perforce의 상태 모델이 다르다. 공개 정량 결과 없음.

**Perforce PoC:** SessionHandoffPackage(task_id, runtime, depot_scope, p4_stream, source/target_p4_client, pending_cl, shelf_id, have_list_hash, build_artifact_refs, instruction_generation, evidence_hash). Source/target 상태 동등성을 p4 have/where/describe/shelved diff로 검사하고 실패 시 resume 금지. Untracked/un-shelved binary·독립 Tool process는 별도 수집 항목으로 명시한다.

**평가: Perforce 방식으로 PoC.**

Sources: [#3704](https://github.com/langchain-ai/open-swe/commit/fdb69cb0d10bc5b42a8d85fa2bad2c77304375d2), [#3769](https://github.com/langchain-ai/open-swe/commit/6d0ebe12d1973f6fd673a4bf17c6d54ac1814f4c), agent/sandboxes/handoff.py, tests/sandbox/test_sandbox_handoff.py.

## 5. Codex Guardian — 승인 무효화, 다른 Host의 Sender Context, 재시작 후 검증 증거

**신규성:** #51683은 reviewer 예약 중 user authorization이 바뀌면 최신 reviewer attempt를 마지막 committed review로 rollback하여 예전 유효 history를 보존하고 새 authorization으로 재검토한다. Issuing action의 repository AGENTS.md snapshot을 pin해 reviewer 재실행 중 환경이 달라도 동일 instruction base를 사용한다. #51734는 sender가 다른 host에 있어 실행 중인 sender runtime이 없더라도 인증된 Thread Store에서 history를 복원한다. Compaction/rollback을 반영하고 **새로운 비영속 메시지는 빠질 수 있음**을 명시하며, 최대 5초 읽기 제한·active turn lock 획득 전 수집으로 blocked turn을 방지한다.

#51651은 실패한 Guardian Review 기록을 opt-in 비임시 session에서 SQLite에 저장하여 process restart 후 진단에 사용한다. 제한: 전체 64 record, thread당 8, 전체 8MiB, 저장 시도 250ms 이내, 실패하면 bounded in-memory fallback. Thread 삭제 시 증거 삭제.

**절감/품질 trade-off:** 이미 발생한 stale review의 inference 비용은 회수할 수 없다. 그러나 승인 변경 이후 오래된 요약/판단을 재활용하여 잘못 submit하거나 재리뷰를 반복하는 비용을 방지한다. Stored sender evidence는 complete/possibly-stale로 구분해야 한다.

**Perforce 적용:** ReviewAttempt(action_revision, user_authorization_generation, policy_generation, project_instruction_hash, pending_cl_generation, source_checkpoint, verdict, evidence_ref)를 만들고 실제 submit 직전 재검증한다. ReviewFailed receipt는 개인정보/승인 정보 최소화와 TTL을 둔다. Same request 재시도가 실제 제출 side effect를 중복 실행하지 않는지 검증한다.

**평가: 바로 적용 원칙.**

Sources: [#51683](https://github.com/openai/codex/commit/3421c660d043e39d1bff8cee136c0ceeb006177c), [#51734](https://github.com/openai/codex/commit/2dae757b8713d3317e8da58828bdac821386982c), [#51651](https://github.com/openai/codex/commit/30bdfec59ddf8df9eaf44e8f367ba7fef4b2ffbc).

## 6. Codex — Context Window의 Tool Declaration Mode 안정성

**신규성:** #51480은 resume 전후 incremental tools 설정이 달라도 **현재 Context Window**의 Tool declaration 방식과 base instruction 위치를 바꾸지 않는다. 설정 변경은 다음 compaction/context reset부터 적용한다. 해당 모드는 sampling, remote compaction, startup prewarm, prompt debugger, Guardian budgeting, fork history에 동일하게 적용된다. #51755는 MCP handler와 cache 간 중복 ToolInfo 저장을 제거하고, 내부 namespace description은 원문을 보존하면서 model-facing spec/search metadata에만 기존 1,000-byte cap을 적용한다. #51823은 준비된 MCP call이 binding catalog의 ToolInfo를 별도 clone하지 않고 index로 참조하게 했다.

**토큰 원리/주의:** 명시적인 window mode는 prefix churn/cache invalidation을 줄일 수 있다. 메모리 clone 제거는 주로 프로세스 RAM 최적화이지 직접적인 token 절감이라고 주장하면 안 된다. Policy revoke는 prompt schema 변경을 기다리지 말고 execution gate에서 즉시 강제해야 한다.

**Perforce 적용:** CapabilityWindow(window_id, declaration_mode, model_id, catalog_hash, prefix_hash, generation), Result(model_visible_schema_bytes, tools_change_count, cache_read_tokens, invalid_tool_call)를 기록한다. MCP reconnect 시 같은 tool list를 다시 inject하지 않는지 테스트한다.

**평가: 바로 적용 원칙.**

Sources: [#51480](https://github.com/openai/codex/commit/e79c498b5e44352eb1543d5631bdaec0a57bae58), [#51755](https://github.com/openai/codex/commit/4d53e6ba0e71ed45510b5846424666a7687ffb33), [#51823](https://github.com/openai/codex/commit/cef2a64531430e96efd69ceed18b8c34dc2cb98f).

## 7. Open SWE — 이벤트 자기증폭 800+건을 막은 Circuit Breaker

**운영 실증:** #3651에서 PR을 감시하는 preview thread가 자신의 failure comment를 issue_comment webhook으로 다시 받아 agent run을 열고, 다시 실패 댓글을 남기는 loop로 **800건 이상** 댓글을 약 1초 간격으로 생성한 사건이 공개됐다. 기존 Bot login whitelist에 preview 봇이 없어 self-origin 필터가 뚫린 것이 원인이었다.

**구현:** 수행 GitHub App ID를 기준으로 self-event를 구분한다. Event subscription으로 깨워진 동일 thread가 연속 3번 실패하면 자동 실패 댓글을 더 이상 게시하지 않는 circuit breaker를 둔다. 사람이 시작한 run의 실패 보고는 계속한다. Source code에는 preview 봇 이름도 공통 Bot 목록에 추가한다.

**토큰 원리:** 무한 webhook→agent→댓글 재귀를 모델 호출 전 차단한다. 800+는 실제 증폭 횟수이지 측정된 token 절감 수치는 아니다.

**Perforce 적용:** TeamCity callback, P4 trigger, GitHub webhook에 EventOrigin(app_id, root_task_id, caused_by, event_depth, idempotency_key), FailureBudget를 두고 self-origin/duplicate를 inference 전에 거부한다. 차단되면 BlockedByLoop lifecycle event를 기록한다.

**평가: 바로 적용.**

Source: [#3651](https://github.com/langchain-ai/open-swe/commit/22bfe8acbcdbfb61f538c5c5b7cd8400de087244).

## 8. 경고: Reviewer Prompt 파일 경량화는 품질을 별도 검증해야 함

10/07 Open SWE #3713은 reviewer/main.md.jinja를 약 131줄에서 55줄로 줄였고 반복된 상세 검토 체크리스트를 삭제했다. Subagent 1회 제한도 제거하되 finding 등록과 publish의 정해진 순서, Read-only 제약은 유지했다. **공개 token/cost/defect-recall A/B 결과는 없다.** Prompt가 짧아도 critical miss 증가 또는 subagent 과다 호출이 생길 수 있다.

Perforce Reviewer는 ①현행 상세 prompt, ②짧은 핵심 prompt+on-demand Skill, ③짧은 prompt+deterministic code-review checklist Tool을 CL corpus에서 비교하고 critical finding recall, false-positive, cost/verified CL, subagent 수를 측정한다.

**평가: 아이디어 참고 / production 전환 가치는 검증 전까지 낮음.**

Source: [#3713](https://github.com/langchain-ai/open-swe/commit/aaecdb79cce4dec0d772d86933c316b19780f712).

## 이번 조사에서 의미 있는 새 결과가 없는 범위

별도의 독립적인 RAG selective-retrieval 품질 benchmark, context compaction 압축률 실험, 토큰 절감 논문이 전일 이후 확정됐다는 근거는 찾지 못했다. 이전 결과를 숫자만 바꾸어 재게시하지 않았다. Durable state, runtime adapter, evidence verification, handoff/ledger, task lifecycle은 위의 실제 코드 변화를 통해 지속 추적한다.

## 바로 실행할 순서 / 실험 설계

1. **즉시:** 새 모델 가격표·캐시 단가 반영, self-origin EventLoopGate, approval revision check, 모델·Tool declaration generation 로깅.
2. **1차 PoC:** Haiku sidecar 모델 분기 + pinned Skill. Task/role/model/effort별 전체 subagent 비용과 verified outcome 수집.
3. **2차 PoC:** Durable TaskCoordinator, Reviewer Ledger, handoff package(P4 shelve + have-list identity). Read-only와 mutating worker 각각 race/rollback 평가.
4. **품질 게이트:** Reviewer prompt 단축 전에는 critical defect recall/false positive 및 task total cost를 A/B. 새로운 독립 결과가 없다면 promotion하지 않음.

모든 실험의 기본 지표는 verified solve rate, critical-miss, input/cache read/cache write/output tokens, cost/verified-task, turn/retry 횟수, tool schema bytes, cancellation/resume 성공률, workspace/CL mutation 안전성이다. 프로덕션 활성화 전 작은 고정 CL corpus와 run-scoped evidence를 사용한다.

## Wiki canonical 경로

jaywapp/wiki **develop**: ai/trend/ai-harness-token-scout-2026-10-08.md. 날짜별 Scout는 다른 ai/news, ai/tools, ai/harness, ai/research, ai/tips 폴더로 작성하지 않는다. 실제 성공 여부는 git ref 및 파일 재조회로 검증한다.
