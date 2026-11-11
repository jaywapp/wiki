---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-12"
category: trend
updated: 2026-11-12
tags: [ai-harness, coding-agent, orchestration, context-engineering, token-optimization, skills, hooks, progressive-disclosure, compaction, selective-context, subagents, mcp, durable-state, runtime-adapter, evidence-verification, handoff, ledger, task-lifecycle, model-routing, cost-accounting, perforce, claude-code, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-11-12

> 조사 시점: 2026-11-12 약 05:56 KST. **핵심 관찰일: 2026-11-11 UTC에 실제 병합된 PR.** GitHub 원본 PR 메타데이터(병합시각·본문·변경 파일 수), 선별된 실제 Diff/테스트 경로, 공식 Claude Code·Codex·Deep Agents 릴리스 목록을 조사했다. \`jaywapp/wiki\` develop의 11/09·11/10·11/11 보고서 원문을 직접 읽고 중복을 제거했다. 수치들은 원저자 실험이며 사내 재현 결과가 아니다. 원본 논문/벤치마크를 검증하지 못한 항목은 그렇게 표시한다.

## 0. Executive summary / 중복 제거

**유의미한 신규 구현이 있다.** 가장 직접적인 Context 절약 근거는 OpenCode의 대규모 Tool Search용 field-weighted BM25(#62984), 모델에는 compact JSON을 보내고 UI만 pretty-print하는 분리(#63258), 그리고 Talon의 중복 Subagent Poll 결과 억제(#7677)다. Task Lifecycle 측면에서는 OpenCode의 **idle 전이와 동일 트랜잭션에 기록되는 Durable Report Outbox**(#63209) 및 모든 Subagent의 Background 전환(#63382), Codex의 **승인된 Plan을 Attachment로 전달하면서 완전성을 확인하는 새 세션 Handoff**(#60763)가 가장 중요하다. 보안·복구에서는 FIDES Replay Authority(#9876), Windows Snapshot 원자 교체 재시도(#10200), MCP OAuth Stale Write 방지(#60849)를 추적한다.

중복 제외: 11/11의 Deep Agents Git Attribution #7660/#7661, Compaction Usage #7644, Subagent Reasoning 정리 #7645/#7652, Codex MCP Refresh #60639·Guardian 정책 #60646·Turn Snapshot #60620은 **재등장시키지 않았다**. 11/10의 OpenCode Trace #62806, Usage #62835, Credential Lock #62827도 재포장하지 않았다. 11/09의 Tool Catalog Delta #62176(11,255→1,918 토큰)와 기존 BM25 사례(#5875)는 오늘의 #62984와 대상·실험이 달라 별도 신규 항목으로 분리했다. 11/08의 Durable Tool #62459와 오늘의 Durable Subagent Report는 영속화하는 대상이 다르다. 기존 GCP Incremental Tools #60617과 오늘의 #60848은 **GCP에서 기본값을 활성화한 정책 변경**만 신규로 인정한다.

| 우선순위 | 새 변경 (UTC 11/11 병합) | 핵심 근거 | 적용 평가 |
|---|---|---|---|
| 1 | [OpenCode #62984: Tool Search BM25](https://github.com/anomalyco/opencode/pull/62984) | 11k Tool, 600 audited tasks, 5,202 generated searches, 960 paired agent runs | **PoC 최우선** |
| 2 | [OpenCode #63209 + #63382: Durable Idle Report / Always Background](https://github.com/anomalyco/opencode/pull/63209) | SQLite outbox/restart E2E, 7k+ core tests | **PoC 최우선** |
| 3 | [Codex #60763: Approved Plan Attachment Handoff](https://github.com/openai/codex/pull/60763) | 새 Thread 준비 실패 시 기존 Session 보존, 10k-token fallback cap | **PoC 최우선** |
| 4 | [OpenCode #63258: Compact JSON Tool Result](https://github.com/anomalyco/opencode/pull/63258) | 영향 Trial 7~17%, 결과당 약 300~700자 제거 | **바로 적용** |
| 5 | [Deep Agents #7677: 중복 Poll 억제](https://github.com/langchain-ai/deepagents/pull/7677) | Turn별 ContextVar Snapshot/Result ACK | **바로 적용** |
| 6 | [Deep Agents #7676: Fresh Subagent Compaction](https://github.com/langchain-ai/deepagents/pull/7676) | 유효 모델 Context Window 기반 요약/Artifact Offload | **바로 적용 원칙** |
| 7 | [Agent Framework #10200: Windows Atomic Snapshot](https://github.com/microsoft/agent-framework/pull/10200) | 32 동시 저장 × 6회: 실패 2~7건→0건 | **바로 적용 원칙** |
| 8 | [Agent Framework #9876: FIDES Replay/Approval Authority](https://github.com/microsoft/agent-framework/pull/9876) | Replay·승인·Provider Label 출처 격리 | **PoC 최우선(보안)** |
| 9 | [OpenCode #63259: Config-gated Skill Fetch](https://github.com/anomalyco/opencode/pull/63259) | 매시간 110만 요청, 99.8% 404였던 경로 | **바로 적용** |
| 10 | [Agent Framework #10265: MCP Skill Resource Limits](https://github.com/microsoft/agent-framework/pull/10265) | 기본 512개/16MiB, SKILL.md 포함 | **바로 적용 원칙** |
| 11 | [Codex #60849: OAuth Stale Write Guard](https://github.com/openai/codex/pull/60849) | 저장 전 현재 Credential 재검증 | **바로 적용 원칙** |
| 12 | [Codex #60839/#60771: Replay ID/Revision](https://github.com/openai/codex/pull/60839) | Checkpoint 후 할당 ordinal 및 Revision 보존 | **PoC** |
| 13 | [OpenCode #63254/#63269: MCP Event Watch](https://github.com/anomalyco/opencode/pull/63269) | Cursor/Heartbeat/중복 방지/재연결 | **PoC** |
| 14 | [Strands #5995: DecisionModel Routing](https://github.com/strands-agents/harness-sdk/pull/5995) | Classifier의 모델/정책/입력 예산 분리 | **PoC** |
| 15 | [Codex #60848: GCP Incremental Tool 기본 ON](https://github.com/openai/codex/pull/60848) | GCP와 Bedrock 플래그 분리 | **PoC** |

**계측 결론:** 오늘 확인된 토큰·비용 절감 관련 수치는 *Tool Search 횟수, JSON 출력 문자, 불필요한 HTTP 호출, Snapshot 오류* 등이다. **동일 품질의 Verified Task당 Provider 실제 청구액 절감률을 입증한 신규 자료는 없다.** 검색 품질 향상과 성공률 향상을 혼동하지 말 것.

## 1. OpenCode #62984 — Field-weighted BM25 + 공유 Word Index

- **원본/구현:** [PR #62984](https://github.com/anomalyco/opencode/pull/62984), \`packages/codemode/src/tool-runtime.ts\`, \`packages/codemode/test/codemode.test.ts\`, [실험 저장소 PR](https://github.com/anomalyco/evals/pull/23). 2026-11-11 01:44 UTC 병합. 실제 Diff에서 검색 인덱스·공유 캐시·점수식·테스트를 확인.
- **이전 문제:** 고정 Substring 보너스가 흔한 \`list\`/\`get\`을 과대평가하고, 11k Tool Catalog의 모든 텍스트를 검색마다 재스캔했다. 첫 페이지에 정확한 Tool이 없으면 모델이 반복 검색한다.
- **내부 동작:** CamelCase/비문자 분할 및 복수형 정규화, BM25(\`k1=1.2,b=0.75\`). Field Weight: Tool name 3, namespace 2, description 1, namespace description 0.4, parameter names 0.3. 네 글자 이상 Prefix 확장에 0.3 가중치. 짧은 Tool 이름 우대 계수. 최초 검색 시 역색인 생성, 동일 Tool Catalog의 위치 간 해시 기반 공유, WeakRef로 수명 관리. 권한별 검색 결과는 호출자의 Catalog로 제한한다.
- **측정:** 11k Tool, 감사된 Task 600건, 8개 모델이 작성한 검색 5,202건, 실제 검색 378건. Offline 첫 순위 +8.8%p(95% 범위 +6.4~11.3), Top10 +6.0%p. 실제 검색 첫 순위 +4.8%p는 통계적으로 불확실, Top10 +1.9%p. 8모델×60 Task×2반복 실실행에서 정답 Tool 호출 +0.4%p(잡음), 검색 횟수 **26% 감소**(95% 범위 -35~-19), execute 호출 -7.5%, step -6.5%. 10,925 Tool 검색 약 **12~19ms→3ms**; 첫 색인 구축 65~90ms, 메모리 약 21→14MB(11k 조건). 3.3k Tool에서는 단일 위치 메모리가 오히려 5.2→5.7MB.
- **절감 원리:** Tool Search 결과가 더 정확해지면 Search/Execute Loop와 Tool 출력 누적을 줄일 수 있다. **LLM Token과 비용 절감률은 직접 측정되지 않음.** Offline 검색 향상이 실제 Task 성공률 향상을 보장하지 않으며 한 단어 Query는 기존 방식이 유리한 경우도 있다.
- **P4/Claude Code/Codex 적용:** P4/TeamCity/Slack/GitHub MCP 150~1,000 Tool을 명칭·네임스페이스·파라미터 인덱스로 검색한다. ACL 변경 시 Catalog Generation을 갱신해 인덱스를 무효화. 작은 모델과 큰 모델을 분리해 Precision@1/@10, 검색 호출 수, 최종 작업 성공률, USD/verified-task를 측정한다. **평가: PoC 최우선.**

## 2. OpenCode #63209/#63382/#63367 — Idle Report Outbox와 Background-only Subagent

- **원본:** [#63209](https://github.com/anomalyco/opencode/pull/63209) (11/11 18:09 UTC), [#63382](https://github.com/anomalyco/opencode/pull/63382) (19:49 UTC), [#63367](https://github.com/anomalyco/opencode/pull/63367) (19:53 UTC). #63209 구현 경로: \`packages/core/src/session/execution/subagent-report.ts\`, \`job.ts\`, \`execution/restart.ts\`. #63382의 \`packages/core/src/tool/plugin/subagent.ts\` 등 31개 파일 Diff 확인.
- **신규성/내부:** 기존 한 번짜리 Subagent Job Observer는 Shell wake·직접 Prompt·후속 Turn을 놓쳤다. 이제 Child가 busy→idle로 전환할 때 최신 완료된 답변(\`seq > startedSeq\`)만 뽑아 보고한다. 같은 SQLite \`BEGIN IMMEDIATE\` 트랜잭션에서 완료 Job Row를 Outbox로 기록하고 Commit 후 Parent Inbox에 전달한다. Commit 이후 Crash면 Boot에서 Outbox Replay, Commit 이전 Crash면 기존 Claim/재시작 규칙으로 복구. 이미 보고한 결과는 중복 전송하지 않는다. #63382는 Subagent를 모두 Background로 전환하고 호출 즉시 \`sessionID\` 반환, idle마다 \`<subagent>\` 보고; Parent Escape는 Child를 자동 중단하지 않는다. #63367은 Restart Sweep이 Parent의 Restart Attempt를 계수하기 전 Child Wake가 끼어드는 경쟁을 Finalizer/Deferred Wake로 차단한다.
- **증거:** #63209는 실제 SQLite 파일·Shell Wake·Crash After Commit E2E, Full Core 7,093 pass/354 skip/환경성 3 fail. #63382는 Core 7,007 pass/354 skip/환경성 3 fail 및 CLI·TUI·Session UI 테스트. #63367 회귀 테스트 10회 반복 통과. **동일 작업의 비용/토큰 절감률은 없음.** 백그라운드 동시성으로 비용이 늘 수도 있다.
- **Trade-off:** Child가 여러 차례 idle이면 여러 보고가 발생한다. Parent가 결과를 소비하기 전에 중복·순서·Task 완료 판정을 보장해야 한다. Background Shell을 가진 Child는 중간 답변과 최종 답변을 분리해야 한다. Restart Budget이 우회되지 않아야 한다.
- **P4 적용:** \`child_run_id, busy_epoch, report_seq, result_hash, parent_task_id, p4_cl\`을 Durable Ledger의 Outbox에 기록하고, Parent ACK 이후에만 완료 처리. TeamCity Build의 중간 성공 보고는 최종 Build Success로 오인하지 않는다. 100회 Crash/Resume 테스트에서 Report 유실 0, 중복 처리 0, P4 Submit 중복 0을 목표로 한다. **평가: PoC 최우선.**

## 3. Codex #60763 — 승인된 Plan의 Fresh Session Handoff

- **원본/코드:** [#60763](https://github.com/openai/codex/pull/60763), \`codex-rs/core/src/session/approved_plan.rs\`, \`codex-rs/app-server/src/request_processors/turn_processor.rs\`, \`codex-rs/tui/src/attachment_files.rs\` 및 테스트. 11/11 09:01 UTC 병합. 실제 Diff에서 \`MAX_FALLBACK_TOKENS=10_000\`, \`MAX_FALLBACK_ITEMS=32\`, 유효 Context Window와 Attachment 절대 경로 검사를 확인.
- **동작:** 사용자가 'Yes, clear context and implement'를 선택하면 승인된 전체 Plan을 App Server Attachment로 기록하고 새 Thread에는 짧은 참조 Prompt를 보낸다. 실험적 \`thread/prepareApprovedPlan\` 요청이 새 실행자가 해당 파일을 읽을 수 있고 내용이 동일한지 검증한다. 파일 쓰기·읽기 실패 시 전체 Plan을 \`proposed_plan\` Tool Output으로 주입하되 Context/Truncation 한도 안에 완전히 들어갈 때만 허용. 한도 초과 시 오류를 반환하고 **원래 Session을 유지**한다. 새 Thread로 전환하는 것은 준비 성공 후.
- **절감 원리:** 승인된 긴 계획을 새 Session의 초기 대화 전체 대신 파일 참조로 전달해 초기 Prompt 부담을 낮출 가능성. 그러나 실행자가 Attachment를 읽을 때의 Token은 별도로 청구될 수 있다. 실제 절감률 없음.
- **Trade-off:** 파일 접근권한, 파일 변조, Plan Version 불일치, 실패한 Fallback에서의 부분 계획 수행 위험. 계획의 Approval Hash와 Attachment Hash가 같아야 하며 파일 접근 불가 시 Fail Closed.
- **P4 적용:** \`plan_id, approved_plan_sha256, p4_base_cl, reviewer_id, artifact_uri, approval_timestamp\`를 Ledger에 기록하고, Claude Code 계획→Codex 구현 또는 반대로 새 세션 시작. 실행자는 Plan SHA·P4 Base Revision·Permission Scope를 검증한 뒤 작업. 10KB/100KB/1MB Plan, 파일권한 거부, 디스크 Full, 중간 수정 50회 실험. **평가: PoC 최우선.**

## 4. OpenCode #63258 — Model-facing Compact JSON과 UI Formatting 분리

- **원본/코드:** [#63258](https://github.com/anomalyco/opencode/pull/63258), \`packages/core/src/codemode/tool.ts\`, \`packages/util/src/execute-output.ts\`, TUI/Session UI 렌더러. 11/11 05:55 UTC 병합. Diff에서 모델용 \`JSON.stringify(value)\`와 UI용 \`JSON.stringify(decoded.value,null,2)\` 분리 확인.
- **문제/효과:** 구조화된 Code Mode \`execute\` 결과를 들여쓴 JSON으로 전달하면 공백이 대화 기록에 남아 후속 Turn마다 재읽힌다. Terminal-Bench Code Mode 작성자 실험에서 영향 Trial 7~17%, 영향 출력당 **약 300~700자**의 불필요한 공백. Pass Rate·시간·오류에는 측정 가능한 변화가 없었다고 보고. **토큰 수·USD 절감률은 미측정**(문자 수를 토큰으로 환산해 주장하지 말 것).
- **장단점:** 모델은 짧은 JSON, 사람은 가독성 높은 UI를 본다. JSON을 사람이 직접 복사하는 Tool에서는 UI Pretty-print를 유지해야 한다. 구조화된 원본 데이터·Hash는 그대로 저장.
- **P4 적용:** \`p4 describe -ztag\`, TeamCity JSON, MCP Tool Result는 모델 경로에서 compact serialize, 운영 UI에서는 Pretty-print. 50개 Task의 \`tool_result_chars\`, \`input_tokens\`, \`cached_input_tokens\`, Provider Bill, 성공률을 비교. **평가: 바로 적용.**

## 5. Deep Agents #7677 — Turn-scoped Subagent Poll Suppression

- **원본/코드:** [#7677](https://github.com/langchain-ai/deepagents/pull/7677), \`libs/talon/deepagents_talon/background.py\` 및 테스트. 11/11 06:26 UTC 병합. Diff에서 \`contextvars.ContextVar\`, Owner별 \`snapshot\` 및 결과 전달 상태 확인.
- **동작:** \`list_subagents\` 반복 호출에서 Job 상태가 이전 Snapshot과 동일하면 짧은 '변경 없음'만 반환. 완료 결과는 Turn당 한 번만 전달하고, 명시적 \`inspect_subagent\`는 전체 결과 재조회 가능. Owner/Turn이 바뀌면 상태 초기화, Detached Worker에는 이전 상태를 누출하지 않는다. Status 전이는 계속 보고하고 성공한 전달에만 ACK.
- **절감:** 완료된 긴 답변과 Status 목록의 중복 Context 누적을 방지. Token 절감률 미측정. Talon Python 1,947 pass/14 skip, WhatsApp Bridge 31 pass(실서비스 연동은 미실행).
- **P4 적용:** \`list_builds\`/\`list_agents\` Poll을 \`snapshot_etag\` 기반 Delta로 교체, \`inspect_build(id)\`에서만 전체 로그 제공. 누락·상태 전이·동시 세션 격리 테스트. **평가: 바로 적용.**

## 6. Deep Agents #7676 — Fresh Subagent에 모델별 Compaction 추가

- **원본:** [#7676](https://github.com/langchain-ai/deepagents/pull/7676), 11/11 06:25 UTC 병합. \`_compile_fresh\`가 기존 자동 Summarization Factory와 유효 모델의 Context Budget을 재사용.
- **문제:** Fresh Talon 역할은 Main Graph Middleware를 통과하지 않아 반복 Transcript Read 시 History가 Context Window를 초과할 수 있었다.
- **내부 동작:** Backend를 초기 준비 및 Tool-attached Task Compile에 전달, 상속·Override된 실제 모델을 먼저 확정한 뒤 Compaction Input Budget을 산정. 요약으로 제거한 History는 Artifact Backend로 Offload. MCP/Approval/Hook Middleware 순서는 유지.
- **검증:** Prepared/Tool-attached Fresh Agent, 상속/Override Model, 두 가지 Context Budget의 회귀 테스트. 요약 비활성 시 새 테스트가 실패하도록 설계. Live Provider 호출 검증은 없음. 요약 모델 호출 비용과 정보 손실 위험 존재.
- **P4 적용:** Claude Code/Codex Subagent Spawn 시 Effective Model Context Window를 조회, \`summary_hash, evicted_artifact_refs, last_uncompacted_seq\` 저장. Evidence는 요약하지 않고 원본 참조로 보존. **평가: 바로 적용 원칙.**

## 7. Agent Framework #10200 — Windows Atomic Session Snapshot 재시도

- **원본/코드:** [#10200](https://github.com/microsoft/agent-framework/pull/10200), \`python/packages/core/agent_framework/_sessions.py\`, \`tests/core/test_sessions.py\`. 11/11 09:53 UTC 병합.
- **내부 동작:** Windows의 동시 \`FileSessionStore.set()\`에서 \`os.replace()\`가 일시적 \`PermissionError\`를 내면 파일별 기존 Lock 안에서 최대 3회 시도(10ms, 20ms 간격). POSIX에서는 권한 오류를 재시도하지 않는다. 지속적 오류는 그대로 올리고 기존 Snapshot을 보존.
- **정량:** Windows 11 23H2, Python 3.11.16, 동일 Session 32개 동시 저장 × 6회. 변경 전 실패 건수 **7,6,6,4,7,2/32**, 변경 후 **모든 회차 0/32**. 100회 순차 저장은 양쪽 모두 0건. 192 pass/1 skip 테스트. 단일 PC 실험으로 모든 네트워크 공유·Antivirus 조건을 대표하지 않는다. 토큰 절감과 무관.
- **P4 적용:** Windows Worker/Assistant PC의 Session JSON·Ledger Snapshot 원자 교체에 제한된 Backoff. 단, 다중 프로세스·네트워크 파일 시스템은 SQLite/Postgres Transaction이 더 적합. 원격 저장 확인 없이 작업 완료 처리 금지. **평가: 바로 적용 원칙.**

## 8. Agent Framework #9876 — FIDES Replay 및 Approval Authority 경계

- **원본:** [#9876](https://github.com/microsoft/agent-framework/pull/9876), 11/11 17:10 UTC 병합. 7개 파일 변경, 약 2,727행 추가. 승인/리플레이 신뢰 경계 구현이며 토큰 최적화 자체는 아님.
- **내부 동작:** Unstamped Assistant/Tool/Function Result Replay는 보수적으로 분류. 숨긴 Placeholder는 해당 Session이 실제 소유한 정확한 객체인지 확인. Approval은 저장된 Canonical Tool Call Body, 실제 Live Control, Pending Session Snapshot에 귀속. \`SecureAgentConfig.message_labeler(source_id,message)\`는 앱 소유 Context Provider의 Trust/Privacy Label을 실행 중 해당 객체에만 부여하며 Provider Message를 수정하지 않는다. 나중에 로드한 일반 History도 Tool Policy 전에 보수적으로 재구성. 출처 불명 Service History는 **UNTRUSTED + PRIVATE**로 Fail Closed.
- **장단점:** 재생된 ID만으로 권한 상승하는 것을 방지. Label Source 순서와 정확한 객체 수명 관리가 복잡하다. PR이 명시한 범위 밖: 서비스 History의 정밀한 Continuation Ownership, AG-UI Provenance, MCP Result Carrier.
- **P4 적용:** \`approval_id\`만 확인하지 말고 \`tool_call_hash, p4_cl, workspace_id, allowed_action, expiry, reviewer_identity\`까지 Binding. Resume·Replay·Fork·Plan 수정 시 재승인. 외부 Jira/Slack/Build Log는 명령이 아닌 UNTRUSTED Evidence. **평가: PoC 최우선(보안).**

## 9. OpenCode #63259 — Skill/Instruction HTTP 요청의 Capability-gated Fetch

- **원본:** [#63259](https://github.com/anomalyco/opencode/pull/63259), 11/11 11:15 UTC 병합. Server 선행 변경 [opencode-console #6839](https://github.com/anomalyco/opencode-console/pull/6839)와 함께 작동.
- **문제:** 로그인된 모든 Workspace에서 매분 Instructions/Skills Endpoint를 조회해 **시간당 약 110만 요청, 99.8%가 404**. 이는 서버/네트워크 비용이지 LLM Token 비용이 아니다.
- **동작:** Config 응답의 \`x-opencode-instructions-skills: 1\` Capability Header가 있을 때만 두 목록을 Fetch. 없으면 기존 404와 같은 빈 목록. Config Refresh 실패 시 이전 Capability 값 보존. 작성자는 Server가 2026-11-11 05:31 UTC부터 Header를 배포했다고 보고; Client만 먼저 업데이트하면 실제 Skill이 있는 구형 Server에서도 목록이 사라질 위험.
- **검증:** 90개 Provider/Watch 테스트 통과, Production Header/200 확인(작성자 보고). 절감되는 실제 요청량은 배포 비율에 따라 달라지며 사후 관측 필요.
- **P4 적용:** 사내 Skill Registry/MCP Registry에 \`has_skills, catalog_generation, etag, ttl\` Capability를 넣고 미사용 Workspace Poll 금지. 최초 서버 버전 호환·캐시 무효화 검증. **평가: 바로 적용.**

## 10. Agent Framework #10265 — MCP Skill Resource 수량/용량 상한

- **원본/코드:** [#10265](https://github.com/microsoft/agent-framework/pull/10265), \`dotnet/src/Microsoft.Agents.AI.Mcp/Skills/AgentMcpSkill.cs\`, \`AgentMcpSkillsSourceOptions.cs\`, \`McpCache.cs\`, 테스트. 11/11 15:38 UTC 병합.
- **동작:** 동적 Skill 리소스까지 \`SKILL.md\` 포함 **최대 512개 / 총 16MiB(16,777,216바이트)** 기본 상한. Discovery에서 초과 Resource List를 거절, Read 시에도 Cache 누적량을 검사. 실패한 Read에서 기존 캐시를 유지하고 빈 Cache State 정리. 병렬 Fetch 유지. 상한은 Configurable이며 MCP Client가 수신/파싱하기 **이전** 메시지 크기를 제한하지는 않는다.
- **절감:** 비정상 Skill이 Context/Cache 메모리를 폭증시키는 것을 방지하지만 실제 모델에 공개되는 토큰 상한은 별도로 필요. Resource Limit만으로 Token 절감량을 주장할 수 없다.
- **P4 적용:** Skill Manifest와 참조 파일의 합계 Byte/Resource 수 검사, 모델에 노출할 Description은 별도 1~2k Token Budget. 대형 UE5 Script 문서·예제를 단계적 로딩. ACL별 Cache Partition 유지. **평가: 바로 적용 원칙.**

## 11. Codex #60849/#60839/#60771/#60700 — Credential/Replay/Task Lifecycle

**[#60849 — MCP OAuth Stale Credential Write](https://github.com/openai/codex/pull/60849)** (11/11 19:19 UTC): Refresh 완료 시 저장소의 Credential이 예상값과 같은지 Lock 아래 재확인. 그 사이 새 Login 또는 Logout이 일어났다면 오래된 Refresh로 새 자격증명을 덮어쓰거나 로그아웃한 Credential을 복원하지 않는다. Legacy File Entry의 Key·Owner·Server Name 보존, 무관한 Credential 유지. **평가: 바로 적용 원칙.** P4/MCP OAuth Token 저장 시 Credential Generation과 Compare-and-swap 사용.

**[#60839 — Retained Assistant Revision Replay](https://github.com/openai/codex/pull/60839)** (18:57 UTC): 실시간 기록의 Retained Source Revision을 Rollout Metadata에 남겨 Replay에서 같은 Revision을 복원. \`next_item_ordinal\`과 Model ID Allocation 복구 Helper. [#60771](https://github.com/openai/codex/pull/60771)은 Response Item ID의 Rendered String은 유지하면서 내부 Allocation Ordinal을 History·Inter-Agent Message·Guardian Checkpoint에 보존하고 Legacy String과 호환. **평가: PoC.** Durable Replay는 ID뿐 아니라 Revision/Ordinal을 검증해야 하며, 잘못된 Thread Salt는 거절한다.

**[#60700 — Late Abort Scope](https://github.com/openai/codex/pull/60700)** (02:14 UTC): 종료된 Turn을 다시 중단시키는 늦은 Abort가 다른 활성 Turn에 영향을 주지 않도록 ID/상태를 확인. **평가: 바로 적용 원칙.** P4 Task의 Cancel/Abort는 반드시 \`run_id, turn_id\`에 귀속하고 이미 완료된 실행은 소급 취소하지 않는다.

세 변경 모두 Token 절감 실험은 없다. 하지만 Restart/Approval/Result Ledger 정합성에 직접 연결된다.

## 12. OpenCode #63254/#63269 — MCP Event 기반 Selective Wake

- **원본:** [#63254](https://github.com/anomalyco/opencode/pull/63254) (06:22 UTC), [#63269](https://github.com/anomalyco/opencode/pull/63269) (07:18 UTC). **실험 기능 \`mcp_events\` 기본 OFF.**
- **동작:** MCP Draft Events Extension을 선언한 서버에서 Event List를 Cursor로 최대 100페이지 순회, \`active/event/heartbeat/error\` Stream 처리. 60초 무응답 시 재연결. \`watch_mcp_event\`는 Background로 구독해 Event 발생 시 Session을 Wake. Session·Server·Event·Arguments·Event ID의 Hash로 중복 Wake 방지. 재연결 1/2/4초, 3회 연속 실패 시 Stop. 서버 입력은 User 지시가 아닌 외부 데이터로 표기, 제어문자 제거, Fence 탈출 방지, 16KB 상한.
- **Trade-off:** Rate Limit, Watch Expiry, Restart 후 Subscription Persistence, Unwatch/List 관리가 아직 미구현. 즉 Durable Event Watch가 아니다.
- **P4 적용:** TeamCity Build 완료 Event, P4 Trigger, Slack/Jira 알림을 Poll 대신 구독하되 Event ID/Sequence/ACL을 Ledger에 기록. Cursor Gap·Replay·장애·권한 변경을 검증. **평가: PoC** (영속 구독 없이는 프로덕션 자동 실행 금지).

## 13. Strands #5995 — DecisionModel 기반 Model Routing

- **원본:** [#5995](https://github.com/strands-agents/harness-sdk/pull/5995), 11/11 20:22 UTC 병합. Python \`ClassifierStrategy\`가 일반 \`Model\`뿐 아니라 \`DecisionModel\`을 수용, 정책·Timeout·메시지/후보 길이 상한을 명시.
- **내부:** 기존 Model은 \`LLMDecisionModel\`로 래핑. \`candidate\` Question, \`c0,c1,...\` Position Key, 불확실 답변 비허용, 제한된 JSON Context, 30초 Timeout. Default Max Characters는 Message/Agent Instructions/Candidate 각각 4,000. 기존 \`system_prompt\`는 \`routing_policy\`의 Deprecated Alias. Live Haiku Schema 오류로 기존 Routing 테스트 4/4 실패했던 사례를 수정했다고 보고. Unit 8,631 pass.
- **Trade-off:** Router 호출 자체의 Token·Latency 비용, Provider별 Structured Output 차이, 정책 문구 위치 변경으로 선택 결과 변화. Ollama/llama.cpp의 Prompt 전달은 다른 PR #6000에 의존한다는 작성자 주의.
- **P4 적용:** Build Failure Classification/단순 문서 검색은 저가 DecisionModel, P4 Submit·권한 승인·복잡한 UE5 Script 변경은 별도 Policy Gate. 100 Task×모델별 Cost/Success/False Routing 비교. **평가: PoC.**

## 14. Codex #60848 — GCP Incremental Tool 선언 기본 활성화

- **원본:** [#60848](https://github.com/openai/codex/pull/60848), 11/11 19:18 UTC 병합. 이전 #60617의 GCP 지원을 **기본 ON인 Stable Feature \`incremental_tools_legacy_gcp\`**로 전환. Bedrock \`incremental_tools_legacy\`는 독립적이고 기본 OFF 유지.
- **동작/검증:** Provider별 Feature Flag와 Config Schema, GCP Default/Opt-out, Remote Compaction 후 증분 Tool Declaration 테스트. Tool Catalog 전체를 매 Turn 반복 선언하지 않는 방식이어서 Prompt Prefix 안정성·Tool 선언 비용에 도움이 될 수 있으나, 이번 PR의 실제 Token 절감량은 제시되지 않았다.
- **P4 적용:** Claude Code/Codex Runtime Adapter가 Provider Capability를 별도로 선언하도록 하고, Catalog Generation 변경·Compaction 이후 Tool 가용성/Cache Hit/Task Success 비교. **평가: PoC.**

## 15. 기타 실무상 유의미한 소규모 변경

- [OpenCode #63334](https://github.com/anomalyco/opencode/pull/63334) (11/11 17:02 UTC): 대형 Tool Output을 원본 파일로 저장하다 디스크 Full/권한 오류가 나더라도 **이미 계산된 축약 Preview를 모델에 반환**, \`outputPath\`를 허위로 남기지 않음. 원본 저장이 필수인 Evidence 작업은 별도 실패 처리해야 한다. **평가: 바로 적용.**
- [Codex #60845](https://github.com/openai/codex/pull/60845) (19:16 UTC): 겹치는 검색 Root가 동일 파일을 중복 Result Slot에 채우지 않도록 Dedup. 검색 상위 K의 다양성을 유지. **평가: 바로 적용 원칙.**
- [Codex #60846](https://github.com/openai/codex/pull/60846) (19:18 UTC): Session Search에서 공백 정규화 **전에** 원문 Match/Excerpt를 선택하여 Tab/개행/연속 공백 Query의 Snippet 누락 수정. **평가: 바로 적용 원칙.**
- [Deep Agents JS 1.16.4](https://github.com/langchain-ai/deepagentsjs/releases/tag/deepagents%401.16.4) (11/10 19:02 UTC): Subagent \`task\` Call ID를 Trace/Checkpoint Metadata로 전달하고 Model Refusal을 성공으로 오인하지 않는 변경. Python 측 이전 보고와 의미가 겹치므로 **플랫폼 확대만 추적**, 새 핵심 항목으로 점수화하지 않음.
- [Claude Code v2.1.322](https://github.com/anthropics/claude-code/releases/tag/v2.1.322) (11/10 02:29 UTC): Vertex의 Fast Mode 지원과 거부 시 표준 속도 Fallback. 11/11 병합 대상이 아니므로 **신규 Token 절감 사례로 계산하지 않음**. [v2.1.321](https://github.com/anthropics/claude-code/releases/tag/v2.1.321) (11/09 19:22 UTC)의 Tool 정의 Context 추정 과대계상 수정과 Background Subagent Report/Compaction 보존은 회귀 검증 후보이나 오늘의 신규 구현으로 재분류하지 않음.
- [Codex Releases](https://github.com/openai/codex/releases): 11/11 UTC Alpha 배포는 존재하나 위 PR이 특정 안정 릴리스에 포함되었다는 것은 확인하지 못했다. **Merged PR ≠ 배포된 Stable Release**.

## 16. 구현·측정 가능한 사내 PoC 우선순위

### A. Tool Search + Output Budget (가장 직접적인 Context 절약)

**실험:** P4/TeamCity/GitHub/Slack 150개 및 1,000개 Tool Catalog, 실제 Task 50개×3 모델×2반복. Baseline: 기존 문자열 검색+Pretty JSON. Variant: Field-weighted BM25+Compact JSON+필요 시 상세 Tool Schema 지연 공개. 같은 Task/Evidence/권한 조건을 유지한다.

**계측:** \`tool_search_count\`, \`precision_at_1/10\`, \`execute_calls\`, \`tool_output_bytes\`, \`model_input_tokens\`, \`cache_read/write_tokens\`, \`output_tokens\`, \`provider_bill_usd\`, \`verified_task_success\`. 캐시 Cold/Warm을 분리. 성공률 하락 0%p(허용 오차는 사전 등록), Search 횟수 감소 및 USD/Verified Task 개선을 함께 충족할 때만 도입. BM25의 업스트림 -26% 검색 횟수는 사내 기대값이 아니라 비교 참고치다.

### B. Durable Subagent / TeamCity Handoff

**실험:** 100개 Background Child·TeamCity Build를 실행하며 Child Idle 직전/Outbox Commit 직전·직후/Parent ACK 전후/Restart Sweep 도중 강제 종료. \`task_id, run_id, busy_epoch, outbox_seq, artifact_hash, p4_cl, restart_attempt\`을 DB에 영속화. Crash 뒤 정확히 한 번의 **처리 효과**를 보장하도록 Inbox Idempotency를 검증한다.

**합격:** 완료 Report 유실 0, 승인되지 않은 재실행 0, P4 Submit 중복 0, 잘못된 Build Success 0. Outbox의 전달은 At-least-once일 수 있으므로 처리 효과의 Exactly-once는 Dedup/Receipt로 구현.

### C. Plan Attachment + Evidence Verification

**실험:** 승인된 1/10/100KB Plan, 5개 P4 Changelist, 권한 거부/Hash 불일치/Artifact 삭제/디스크 Full/중간 편집/새 Session Restart. Plan SHA256와 Approval Scope가 일치하지 않으면 구현을 시작하지 않음. Fallback으로 전달하는 계획이 일부만 잘렸다면 실행하지 않음.

**합격:** 손상된 Plan으로 작업 시작 0, 기존 Session 유실 0, 원본 Evidence Hash 불일치 미탐지 0. Claude Code↔Codex Runtime Adapter 교차 재개도 포함.

### D. Context/Cost Ledger

**실험:** Fresh Subagent의 Context Window Override, Summarizer Offload, Poll 중복, Compact JSON을 A/B. 사용량은 \`request/turn/agent/task\` 단위로 집계하고 Cache Read/Write, Compaction, Retry/Discarded Call, Tool Search를 별도 계상. Provider Bill과 내부 추정액을 구분한다.

**합격:** 누락 Usage Receipt 0, 중복 집계 0, 품질 회귀 없음. Subscription 한도·좌석 요금은 API 토큰 청구액으로 환산하지 않는다.

## 17. 분야별 Scout 상태 / 후속 추적

| 분야 | 오늘 검증된 변화 | 미확인·후속 |
|---|---|---|
| Coding workflow / orchestration | Background-only Subagent, Idle Outbox, Plan Handoff | 실제 Multi-agent 비용·완료율 |
| Skills / hooks / progressive disclosure | Capability-gated Fetch, MCP Skill Cache Limits | SKILL.md 자체의 Prompt Token 감소 실측 없음 |
| Context pruning / compaction | Fresh Subagent Model-aware Summarization | 요약 정보 손실률·추가 모델 비용 |
| Subagent context isolation | Turn-scoped Poll State, FIDES Authority | 동시 Parent/Child ACL Leak Test |
| RAG / selective search | Field-weighted BM25, Search Root Dedup | Tool Search와 문서 RAG는 별도 평가 필요 |
| Prompt / Skill 파일 경량화 | 불필요한 Skill HTTP Fetch 제거 | Prompt 파일 Bytes/Token 감소 신규 자료 없음 |
| Tool output 축약 | Compact JSON, Save 실패 시 Preview 보존 | 원본 Artifact 저장 실패 시 Evidence 정책 |
| Cache | BM25 Word Index 공유, Skill Resource Limit | 신규 Provider Prompt Cache 비용 절감 검증 없음 |
| Session / handoff | Approved Plan Attachment, Replay Revision/Ordinal | Cross-runtime Resume Hash 검증 |
| Model routing | DecisionModel Classifier, GCP Incremental Tool 기본값 | Router 자체 비용·성공률 Trade-off |
| Token / cost 측정 | 검색 횟수·출력 문자·HTTP 요청 수 실측 | Provider Bill / Verified Task 실측 없음 |
| Durable state / ledger | Transactional Idle Outbox, Windows Atomic Snapshot | P4 Submit Idempotency |
| Runtime adapter / evidence | FIDES Replay Authority, OAuth CAS, Scoped Abort | MCP Event Watch Restart Persistence 미구현 |
| Task lifecycle | Background Child Wake/Restart Attempt, Abort Scope | Child Idle != Task Complete |

**신규 발견이 없거나 실측이 없는 분야는 억지로 성과를 만들지 않았다.** 특히 오늘은 Prompt Cache 적중률, RAG 문서 검색 품질, 직접적인 USD 절감률을 새로 입증한 자료가 없다.

## 18. 원본·검증 범위·한계

원본 PR은 위 항목별 링크를 우선한다. 실제 Diff를 직접 검토한 대표 항목: OpenCode #62984(\`tool-runtime.ts\`), #63258(\`execute-output.ts\`), #63382(\`subagent.ts\` 등), Deep Agents #7677(\`background.py\`), Codex #60763(\`approved_plan.rs\` 등), Agent Framework #10200(\`_sessions.py\`), #10265(\`AgentMcpSkill.cs\` 등). 나머지는 GitHub PR 본문·병합 메타데이터·테스트 설명을 읽었으며 **모든 변경 줄·CI·Benchmark를 독립 실행한 것은 아니다**. 11/11 UTC 병합 여부는 개별 PR의 \`merged_at\`으로 확인했다. 일부 수치는 작성자 벤치마크이며, 사용자 환경/모델/권한/프로바이더별 재현이 필요하다.

**결론:** 당장 적용할 원칙은 Compact JSON, Poll Delta, Capability-gated Skill Fetch, Snapshot 원자 저장, 승인/Replay의 엄격한 ID·Hash Binding. 가장 가치 높은 PoC는 **BM25 Tool Search와 Durable Subagent Outbox 및 Plan Attachment Handoff**다. **실제 LLM 비용 절감은 미검증** 상태로 유지한다.
