---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-30"
date: 2026-10-30
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, mcp, tool-search, prompt-cache, output-truncation, subagents, hooks, durable-state, evidence, task-lifecycle, model-routing, perforce, claude-code, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-10-30

> **조사 마감:** 2026-10-30 06:02 KST(2026-10-29 21:02 UTC). 신규 변경 검색 범위: **2026-10-28 20:56 ~ 2026-10-29 21:02 UTC**. GitHub 공식 REST API를 통해 default branch의 커밋 시각과 관련 PR의 실제 **merged_at** 및 변경·테스트 근거를 확인했다. 최근 [10/29](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-29.md)와 [10/28](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-28.md) Scout의 관찰 결과를 기준선으로 삼았다. 미병합 PR, 공식 릴리스, main에 머지만 된 구현을 분리한다.

## 0. 결론과 판정 기준

이번 기간에 새로 확인한 핵심 변화는 **대규모 MCP Tool Catalog를 checkpoint에서 분리**, **서로 다른 thread 간 공유 prompt prefix 재배열**, **Code Mode 출력 예산을 host에서 강제**, **모델을 깨우기 전 조건을 결정론적으로 검사**, **Sub-agent/Approval/Trace의 복구 순서 보존**이다. 일반적인 Skill·Compaction 개념 설명이나 전일 반복 항목은 제외했다.

1. **가장 큰 구조적 개선:** [Open SWE #4697](https://github.com/langchain-ai/open-swe/pull/4697)은 매 실행 약 1MB/404 specs의 Tool Catalog가 Checkpoint를 부풀리던 경로를 SHA-256 해시 기반 backend tool-set과 원격 BM25 검색으로 분리했다. 운영 DB 증가 87→369GB/3일 및 25건 checkpoint 실패가 동기였다. 변경 적용 뒤의 실제 DB/토큰 절감치는 아직 공개되지 않았다.
2. **Prompt cache의 다른 문제 발견:** [Open SWE #4762](https://github.com/langchain-ai/open-swe/pull/4762)는 *thread 내부*의 System Prompt 불변화(전일 #4677)와 달리, *thread 간* 공통 접두부를 앞에 모았다. 운영에서 43k-token의 비슷한 첫 호출 23건 모두 cached token=0이었다. OpenAI 공통 prefix 예상 길이 400→약 23k tokens. 배포 후 cache hit 실측은 아직 없다.
3. **Tool Output 비용의 실제 경계:** [Codex #57870](https://github.com/openai/codex/pull/57870), [#58125](https://github.com/openai/codex/pull/58125), [#58159](https://github.com/openai/codex/pull/58159)는 code-mode host가 execute/wait/terminate 응답을 token budget에 맞춰 head-tail로 잘라서 전송하는 경로를 추가했다. **기본 기능 플래그는 비활성**이며 동일 작업당 토큰 절감 측정은 없다.
4. **모델 호출 자체 생략:** [OpenCode #60137](https://github.com/anomalyco/opencode/pull/60137), [#60140](https://github.com/anomalyco/opencode/pull/60140)은 schedule이 조용히 poll할 때 shell 또는 제한된 Code Mode 조건만 실행하게 했다. 정기 CI 감시에서 매번 LLM을 호출하지 않는 것이 목표. 아직 **experimental.schedules 기본 비활성, 과금 실측 없음**.
5. **실행 내구성:** [Codex #58129](https://github.com/openai/codex/pull/58129)는 child history 생성 전에 spawn relationship부터 저장하고, [#58166](https://github.com/openai/codex/pull/58166)는 기록 완료/중단을 명시했다. [Deep Agents #7380~7382](https://github.com/langchain-ai/deepagents/pull/7380)는 메인/자식 Agent의 command hook 실행·승인·transcript 수명주기를 정리했다.
6. **실측 latency, 토큰과 구분:** [Open SWE #4720](https://github.com/langchain-ai/open-swe/pull/4720)의 제어된 두 개 50ms backend 요청 microbenchmark에서 model 준비 중앙값 100.96→50.64ms. [#4772](https://github.com/langchain-ai/open-swe/pull/4772)는 과거 219개 review에서 별도 walkthrough 준비가 p50 122s/p90 295s였던 blocking dependency를 제거. 후자의 새 end-to-end p50은 **미측정**이다.

**엄격한 정량 판정:** 이번 조사 기간에 새로 확보한 **검증 완료된 동일 품질 작업당 모델 입력/출력 토큰 절감률 또는 실제 청구액 절감률은 없음**. 아래 수치는 PR 작성자 자료의 메시지 길이, DB 크기, RPC 횟수, 단위 테스트, 사전 측정 latency로 표시한다. 10/24 TokenEconomizer 결과나 전일 checkpoint 등 과거 수치를 오늘 신규 절감 성과로 재사용하지 않는다.

### 신규 변경 우선순위 요약

| 구분 | 신규 구현/관찰 | 수치·검증 상태 | 판정 |
|---|---|---|---|
| Tool Catalog | Open SWE #4697 Backend-resolved Tool Set / BM25 | 약 404 specs, 1MB/run; 운영 DB 87→369GB/3일은 **변경 전 문제** | **PoC 최우선** |
| Prefix Cache | Open SWE #4762 Cross-thread shared prefix | 23개 첫 호출 cached token=0; 공통 prefix 약 400→23k, **사후 hit 미측정** | **PoC 최우선** |
| Tool Output | Codex #57870/#58125/#58159 Host truncation | head/tail + 별도 error diagnostic 64KiB; 기본 flag off | **PoC 최우선** |
| No-model Polling | OpenCode #60137/#60140/#60349 | 148 shell/permission 및 46 code 관련 테스트 등; **청구액 미측정** | **PoC 최우선** |
| Hook/Delegation | Deep Agents #7380~7382 | Main/child hook, 허용 후에도 최종 approval, 삭제 시 transcript cleanup | **PoC** |
| Durable Spawn | Codex #58129 | Edge 선기록, cancellation/late ACK 회귀 검사 | **바로 적용 원칙** |
| Tool Lease | Codex #57978 | Chat별 MCP lease와 cancel-before-release | **PoC** |
| Ledger | Codex #58166/#58172, #58144 | recording_complete, UTF-8 replay 검증, 추가 Context byte telemetry | **바로 적용 원칙** |
| P4 전처리 유사 | Open SWE #4720/#4749/#4772 | 100.96→50.64ms synthetic; reviewer walkthrough 전 p50 122s | **PoC** |
| RAG Scope | Agent Framework #9827 | 복구된 Mem0 state의 무범위 DELETE 차단, 57/57 단위 테스트 | **바로 적용 원칙** |
| SQLite Session | OpenCode #58915 | Dual-read migration **병합**; WAL 47.89→7.46MB는 **아직 미병합 #58916의 실험** | **아이디어 참고/PoC** |
| Prompt Integrity | Gemini CLI #30035 | 안전한 한 번의 template 치환, 107개 관련 테스트 | **바로 적용 원칙** |

## 1. Open SWE #4697 — 대규모 MCP Tool Schema를 Run Context/Checkpoint에서 분리

**근거:** [10/29 00:40 UTC 병합 PR](https://github.com/langchain-ai/open-swe/pull/4697), 관련 MDA/Backend tool-search·run-tool-set migration·QuickJS resolver 코드. 전일 #7304의 **provider-native model-visible Tool Search**와 구별되는, **실제 런타임 저장소와 checkpoint payload** 최적화다.

**문제:** Open SWE가 실행마다 **404개 Tool Spec, 약 1MB**를 run context에 넣고 있었고, 그중 약 **300개 통합 MCP Tool/935KB**는 모델이 code mode에서만 사용한다. Agent Server는 이 컨텍스트를 checkpoint metadata에 1회, 저장된 kwargs에 2회 복사했다. PR은 운영 checkpoint table이 **3일간 87GB→369GB**, 10/27의 autovacuum과 1초 lock timeout으로 **25개 run 실패**를 기록했다고 설명한다. 이 수치는 **패치 이전 장애 측정**, 개선 후 절감 수치가 아니다.

**구현:** Backend의 **run_tool_sets** 테이블에 정규화된 JSON의 SHA-256 digest로 Catalog를 저장·공유한다. Run Context에는 Catalog의 names-only 형태(약 **2KB**)를 전달하고, Backend가 서명한 Run Token에는 digest를 넣는다. MDA가 run 시작/다른 process resume 시 **tool_specs**로 명시적 도구들의 정의와 grant를 불러온다. 통합 MCP 도구는 **search_tools(BM25)**로 선택 검색하고, code-mode **tools.name** 부재 시 JS Proxy/resolve_tool로 실제 Tool과 grant를 백엔드에서 확인한다. 기존 Operation Wire Field와 Grant Enforcement는 유지한다. 48시간 토큰 수명보다 긴 3일 비사용 set GC가 있다.

**트레이드오프:** 저장 DB 중복·checkpoint 부하 감소가 기대되나 원격 검색 RPC와 검색 실패/지연이 증가할 수 있다. 거대한 tool spec을 완전히 제거한 게 아니라 **접근·저장 계층을 옮겼다**. Backend/MDA 버전 혼용 시 오래된 MDA는 names-only catalog를 이해하지 못하는 구간이 있어, PR이 배포 순서와 호환성 위험을 명시한다. 실제 과금 토큰과 user-visible Tool 선택 성공률은 아직 공개되지 않았다. Provider-native #7304는 API Tool Selection이고 이 PR은 Catalog Persistence/Resolution이므로 서로 보완적이다.

**Perforce Harness PoC:** P4/TeamCity/UE5 관련 150개 도구를 공통 ToolSet Digest에 넣고, 각 Run에는 tool names + scope만 저장. P4 제출 Tool은 필요할 때 resolve하되 **서버 ACL/Perforce protections/승인** 검사를 반드시 별도 시행한다. 모델은 먼저 files·describe·opened 검색 결과에서 필요한 세부 Tool을 선택한다. 100개 run×5 checkpoint, 50개 도구 선택 작업으로 persisted bytes/run, DB write p95, tool recall@1, search miss, 첫 실행 latency, 실제 input/cache tokens/verified task USD, 권한 위반 0을 비교한다. **평가: PoC 최우선.**

## 2. Open SWE #4762 — Thread 간 Prompt Cache Prefix를 400→23k tokens로 확대

**근거:** [10/29 20:16 UTC 병합 PR](https://github.com/langchain-ai/open-swe/pull/4762). Cache-affinity routing [#4730](https://github.com/langchain-ai/open-swe/pull/4730)은 조사 시점 **미병합**이며, 그 효과를 출시 기능으로 간주하지 않는다.

**신규성:** 전일 #4677이 **동일 thread에서 system prompt를 고정**했다면, 오늘 변경은 **다른 thread의 초기 호출 사이**의 캐시 공유 실패를 고친다. Thread별 artifact URL 등이 system prompt 앞쪽에 있어서 공통 지침이 같아도 cache prefix가 조기 분기했다. 작성자의 운영 Trace에서 **거의 같은 43k-token 첫 호출 23개 모두 cached token=0**이었다.

**내부:** System Prompt 순서를 (1) Shared Agent/Code Mode/Browser Instructions → (2) Shared Deployment Instructions → (3) Available Skills → (4) Thread-specific Context로 배치한다. Anthropic은 공유 섹션별 cache boundary를 사용하되 **4개 경계 제한**을 넘기지 않도록 중복 Tool Boundary 제거. 다른 Provider로 retry할 때 Anthropic 전용 cache 설정은 넣지 않는다. 기존 thread의 고정 prompt는 유지한다. OpenAI에서 요청 공통 prefix 예상 구간을 **약 400→23,000 tokens**로 늘렸다.

**비용·품질 주의:** 길어진 prefix 자체가 **23k 토큰을 절약했다**는 뜻이 아니다. 캐시가 실제로 일치하고 유효한 TTL 내 provider/backend에 도달하는지, Tool Spec이 동일한지에 따라 cache-read/write 및 할인 금액이 결정된다. [#4730](https://github.com/langchain-ai/open-swe/pull/4730)의 affinity 변경은 아직 merge되지 않았다. 오래된 Session Prompt와 변경된 조직 정책의 충돌은 policy hash/authorization을 별도 검증해야 한다.

**P4 PoC:** System shared prefix(허용된 도구·읽기 전용 절차·UE5 규칙·Skill Catalog)와 **run-specific** P4CLIENT, Depot, CL, Base Revision, Build ID, Evidence URI를 분리. A=thread별 volatile prefix 우선, B=shared prefix 우선, 동일 작업 30건×cold/warm 연속 실행, 5m/1h TTL/모델 라우팅을 교차. **cached input tokens, cache write/read, provider bill/verified task, prompt hash, tool selection, change-level 정확도**를 측정한다. **평가: PoC 최우선.**

## 3. Codex #57870/#58125/#58159 — Host-side Code Mode Output Truncation

**근거:** [#57870](https://github.com/openai/codex/pull/57870)(10/29 01:05 UTC), [#58125](https://github.com/openai/codex/pull/58125)(10/29 16:57), [#58159](https://github.com/openai/codex/pull/58159)(10/29 19:29). 관련 Rust runtime, stdio/gRPC host, bounded output collector/rendering, transport regression tests.

**내부:** 기존 Client가 결과를 받은 뒤 truncation하던 대신, Host가 협상한 server-side 모드일 때 **execute / wait / terminate 결과 각각**의 max_output_tokens budget을 적용한다. 긴 결과는 head+tail과 생략 알림으로 축약하고, script error도 같은 모델 관찰 예산에 포함한다. 진단용 상세 오류는 별도 최대 **64KiB**로 유지한다. stdio/gRPC Client가 지원 Capability를 negotiate하고 **구 Host면 Client-side fallback**, reconnect 시 협상 모드를 유지·검증한다. **code_mode_host_output_truncation feature flag는 기본 비활성**이다. 주입된 host는 자체 정책을 유지한다.

**절감 원리:** 대형 UE5 빌드/TeamCity 로그가 네트워크 전송과 모델 입력 이전에 잘려, Client가 이미 큰 전송을 받아 버린 뒤 자르는 불필요한 흐름을 없앤다. 하지만 예산 축소 시 **실패 원인이 잘려 품질 저하**, 잘린 tail이 중요한 컴파일 오류를 포함하지 못할 위험이 있다. 기존 client-side truncation과 **이중 적용 금지**, error status는 반드시 독립 유지. 실제 token/USD 절감률이나 실사용 성공률은 제공되지 않았다.

**P4 PoC:** 팀별 UE5 compile/test/submit 로그(10KB, 1MB, 100MB)에서 원본 Evidence Artifact는 외부 보존하고 Model에는 구조화된 head+error-span+tail+URI만 전달. A=client truncate, B=host truncate, C=host+error-pattern extraction을 비교. bytes on wire, input tokens, missed error rate, failure triage 성공률, p95 TTFT, original hash 100%를 검증한다. **평가: PoC 최우선.**

### 3-A. Codex #58144 — 추가 컨텍스트의 실제 크기를 전후 계측

[10/29 병합 PR](https://github.com/openai/codex/pull/58144)은 **codex.additional_context**에서 변경되지 않은 항목까지 제출 건수를 세고, **codex.additional_context.value_bytes**로 UTF-8 truncate 전후 크기를 기록한다. 종류·잘림 여부·명시적 이름만 Metric Tag로 사용하고, 불투명/민감 source key를 label로 쓰지 않는다. Tool output/멀티바이트/빈 값/Turn 귀속 테스트. **실제 토큰 절감이 아닌 계측 기반**. P4도 Tool Output Artifact별 bytes_raw, bytes_visible, token_est, truncation_reason, evidence_hash를 남겨야 한다. **평가: 바로 적용 원칙.**

## 4. OpenCode #59457/#60137/#60140/#60349 — 조건부 Schedule로 무의미한 LLM Poll 제거

**근거:** [Agent가 schedule 생성 #59457](https://github.com/anomalyco/opencode/pull/59457)(10/29 02:37 UTC), [Shell Check #60137](https://github.com/anomalyco/opencode/pull/60137)(17:10), [Code Mode AST Scan #60140](https://github.com/anomalyco/opencode/pull/60140)(19:29), [즉시 오류 중단 #60349](https://github.com/anomalyco/opencode/pull/60349)(19:54). 실험적 기능이며 **experimental.schedules 기본 OFF**. 정식 사용자/과금 실험 없음.

**실행:** Schedule가 매 tick마다 모델을 깨우는 대신 **if/until** 조건을 Shell 또는 격리된 Code Mode JS에서 수행한다. Shell: 예를 들어 CI가 success로 바뀌거나 hash가 바뀌는지 판단하고 참일 때만 wake. Code: Acorn AST로 **tools.path(...)** 정적 호출만 추출, dynamic tools[x]/alias 사용은 거절. 생성 시 해당 도구만 1회 승인(프로젝트 전역 grant 저장 안 함), 백그라운드 Tick 때 지정 도구만 노출하고 fetch 및 편집·재귀 schedule Tool을 배제한다. **state/now/runs**로 시점과 증분 cursor를 관리한다. Tick 중 live deny 규칙은 재검사한다.

**후속 안전성:** #60349는 Code Check가 baseline에서 RuntimeError를 내면 CRON 등 모든 when 형태에서 **생성 즉시 실패**시킨다. 이후 Check Return Shape가 결정론적으로 invalid면 2회 재시도 없이 **첫 번째 오류에서 pause/wake**시킨다. Shell transient 에러는 기존대로 not-yet 처리 가능. Shell 쪽 PR은 core/permission 관련 **148 pass**를, Code 쪽 PR은 **4 AST + 46 core + 1 server test**를 보고했다(각 PR 작성자 테스트).

**토큰/품질:** 조용한 poll의 모델 호출 건수 자체를 0으로 만들 수 있지만, 조건 검사 실행비·외부 API rate limit은 남는다. Code AST 정적 추출은 동적 alias 허용과 trade-off. 재시작, Permission 변경, Cursor 누락 시 체크 누락이 발생하면 잘못된 완료 판단이 가능하다.

**P4+TeamCity 예시:** Task A는 P4 CL 12345의 TeamCity Build가 종료되는지 30초 간격 read-only Check, **변경/실패 때만** Claude/Codex Worker 재개. B는 새로운 PR/Issue가 생겼을 때 revision cursor를 state로 유지해 wake. 24시간 2,880개 폴링 시뮬레이션에서 A=모든 tick 모델 호출, B=조건부 wake를 비교: model invocation, actual bill, missed event=0, duplicate wake=0, Permission Bypass=0, restart cursor loss=0. 단, 외부 API polling cost도 함께 계산. **평가: PoC 최우선.**

## 5. Deep Agents Talon #7380/#7381/#7382 — Main/Subagent Command Hooks·Transcript Lifecycle

**근거:** 10/29 14:12 UTC 연속 병합 [#7380 Main Hooks](https://github.com/langchain-ai/deepagents/pull/7380), [#7381 Local Child Hooks](https://github.com/langchain-ai/deepagents/pull/7381), [#7382 History Cleanup](https://github.com/langchain-ai/deepagents/pull/7382). Talon 코드 및 graph/approval/cleanup 회귀 테스트; 구성 전체 스택의 후속 #7384/#7385는 본 조사에서 병합 확인하지 않았으므로 포함됐다고 단정하지 않는다.

**동작:** Assistant-local hooks.json을 **turn당 한 번 로드**해 Tool 호출 전에 Hook Rule을 판단. Hook Deny는 Tool을 막지만 Hook Allow가 있어도 **일반 Tool Approval을 건너뛰지 않는다**. Workspace hook은 비활성. 로컬 Subagent는 부모의 **config snapshot**을 상속하되 invocation ID와 transcript는 별도로 둔다. Background/스케줄 작업 및 동적으로 첨부된 Tool에도 적용. Main-agent Stop Hook은 자식에게 중복 실행하지 않는다. 대화 삭제 시 자식 기록, backup, Hook Transcript까지 소유권 기준 삭제하고 Writer를 먼저 회수, symlink traversal 금지, 실패 cleanup은 재시작 뒤 재시도한다.

**Token/Trade-off:** Hook 결정으로 반복 모델 정책 질의를 일부 결정론적 규칙으로 옮길 여지는 있으나 **실제 token 또는 bill 수치 없음**. Hook 자체에서 느린 subprocess 호출, 잘못된 trust source, 장기 스냅샷으로 인한 정책 변경 누락 위험이 있으므로 Runtime ACL과 latest policy hash는 별도 Enforcement 대상이다.

**P4 적용:** P4 Read/Edit/Submit Tool의 pre-tool Hook은 depot/client 허용 범위 및 Evidence Receipt를 검사한다. 자식 조사 Worker는 부모 권한보다 좁게 쓰고, submit은 승인된 Main Worker에서만. 100건의 hook deny/allow/approve, 병렬 child, config reload, history delete, symlink 공격 테스트를 재현. **평가: PoC(정책·감사 측면 우선).**

## 6. Codex #58129 — Spawn 관계를 먼저 기록하는 Durable Child Lifecycle

[10/29 17:26 UTC 병합 #58129](https://github.com/openai/codex/pull/58129). Subagent의 Child Storage/복제 History를 먼저 만든 뒤 Parent-Child Edge 기록이 실패하면, 이후 부모 subtree 삭제가 Orphan Child를 발견하지 못하는 문제가 있었다. 변경은 **Child ID 예약 → Spawn Edge 영속화 → Child Storage 생성/실행** 순서를 보장한다. 호출 취소 중에도 Edge 쓰기 결과가 확정될 때까지 소유권을 유지하고, commit 성공 후 ACK 오류도 reconciliation한다. Edge publication 실패 시 child 실행·알림·history 생성이 모두 없어야 한다는 통합 테스트를 추가했다.

**P4:** Parent Task ID, Child Task ID, Repo/Client 권한, P4 ChangeList를 Durable Spawn Ledger에 기록하고 ACK 후에만 작업 디렉터리·Subagent를 만든다. Failpoint: Edge write 전/후 crash, ACK lost, cancellation, 동일 Child ID collision. orphan workspace 0, child side effect without edge 0, resume correctness를 측정. **토큰 직접 절감 없음. 평가: 바로 적용 원칙.**

## 7. Codex #57978 — 한 MCP 연결의 Chat별 Lease 분리

[10/29 03:48 UTC 병합 #57978](https://github.com/openai/codex/pull/57978)은 공유 stdio MCP 연결에서 **codex/connection-lease** 확장을 지원하는 서버라면 Chat별 Lease를 열고, Tool/Resource Read에 host-owned **codex/connectionLease** ID를 부착한다. Caller가 임의로 보낸 Lease Metadata는 덮어쓴다. 해제 시 pending Tool을 먼저 cancel하고 release하며, startup timeout/late ACK 및 cleanup 실패 시 Connection Pool에서 제거한다. 확장을 지원하지 않는 서버는 기존 모드 유지.

**의미:** 전일 '공유 연결' 자체의 후속 안정성. 연결 수는 줄여도 다른 Chat의 Tool Cancellation/Resource Read가 섞이면 격리 실패가 생긴다. Perforce MCP Adapter에는 Lease별 P4CLIENT·User·Policy Version을 귀속하고, read-only/submit capability는 lease 간 공유하지 않는다. 여러 Worker 8개, 연결 drop/late ACK/forced unload에서 정보 오염·의도치 않은 cancel 0. **효과는 안정성/초기화 비용 가설, token 수치 없음. 평가: PoC.**

## 8. Codex #58040/#58045 — Evidence를 보존한 Guardian 검토와 Fresh Human Approval

[Guardian native evidence #58040](https://github.com/openai/codex/pull/58040)(10/29 11:16 UTC)은 Multi-Agent Tool Call이 live history에서 사라져도 **원본 Tool Call ID·Encrypted Argument Metadata**를 dispatch에 남겨 Guardian이 평가하도록 한다. Hook이 argument를 수정했다면 수정된 본문을 검토하되, call identity 및 암호화 메타데이터는 보존한다. Debug Output은 name과 call ID까지만 공개한다.

[Fresh Human Command Approval #58045](https://github.com/openai/codex/pull/58045)(11:24 UTC)은 관리형 requirements.toml에 **decision=prompt-user**를 추가해 저장된 Allow/Hook Allow/자동 Guardian Allow와 별개로 매 실행 **새 사람의 1회 승인**을 요구한다. Client가 experimentalApi와 requiredHumanApproval Capability를 모두 제공할 때만 accept/decline/cancel을 받고, 재연결 때는 호환 Client에 pending prompt를 replay한다. 적합한 Client 없으면 fail closed. **실험적 프로토콜**이다.

**P4 적용:** p4 submit, obliterate, workspace cleanup, CI 장시간 빌드 비용 발생은 immutable Evidence Digest + 정확한 Tool Arguments + Fresh Approval Receipt를 묶는다. 승인 없이 오래된 allowance만 사용한 replay, Hook Argument 변경, encrypted call 경계 회귀 100건에서 unauthorized submit=0. **평가: 바로 적용 원칙(승인 경계); Cost/latency는 PoC.**

## 9. Codex #58166/#58172와 #57839 — Recording Complete / Replay / Reasoning Usage

**Trace:** [#58166](https://github.com/openai/codex/pull/58166)(10/29 19:56 UTC)은 Recording이 활성인데 초기화 실패하면 시작/재개 자체를 실패시키고, 최초 Write/Serialization 오류를 공유 Writer에 보존한다. 마지막 Writer 종료 때 오류가 없으면 Closing Record를 추가하며 **state.json의 recording_complete**를 Task Success와 독립 표시한다. 중단된 prefix는 replay 가능하되 complete=false로 명시. Missing/Reordered Event, mismatched Rollout ID, completion 뒤 추가 Event, malformed JSON을 거부한다. [#58172](https://github.com/openai/codex/pull/58172)(20:44 UTC)는 UTF-8과 completion payload validation을 보완했다.

**Reasoning accounting:** [#57839](https://github.com/openai/codex/pull/57839)(10/28 21:22 UTC, 0.166.0 릴리스 포함)은 resume/fork 후 이미 사용량에 포함된 retained reasoning을 다시 합산하던 문제를 해결하려고 **last_usage_includes_reasoning**을 TokenUsageInfo에 영속화했다. 같은 reasoning token을 재계산하면 context가 실제보다 크게 측정돼 불필요한 compaction이 촉발될 수 있다.

**P4 설계:** Task Completion=SUCCESS와 Trace Completion=COMPLETE를 별도로 저장. 각 Model Usage Receipt에 provider usage, reasoning_included, cache_write/read, model_id, confidence, turn_id와 원본 JSON hash를 둔다. P4 submit 후 Trace Recording이 실패하면 **실제 원격 CL 상태를 조회**해야 하며 전체 task를 재실행하지 않는다. Fault Injection: write fail, partial JSON, resume, rollback, double-count를 테스트. **평가: 바로 적용 원칙; token 정확도 효과는 계측 후 판정.**

## 10. Open SWE #4720/#4760/#4752/#4749 — Model 앞 직렬 RPC 제거

**전처리 병렬화:** [#4720](https://github.com/langchain-ai/open-swe/pull/4720)(10/29 01:08 UTC)은 Sandbox GitHub Token Refresh와 Task Context Fetch를 동시 실행하되 **모델 앞에서 양쪽 완료를 보장**한다. 두 50ms Response를 가정한 10회 local Microbenchmark의 Median은 **100.96→50.64ms**. 실제 운영 TTFT 수치는 없다. [#4760](https://github.com/langchain-ai/open-swe/pull/4760)(19:47 UTC)은 메시지 ACK를 다음 Inbox Read에 piggyback하고 Task Messages/Follow-ups/Events를 병렬 조회하되 conversation ordering을 보존한다. [#4752](https://github.com/langchain-ai/open-swe/pull/4752)(18:19 UTC)는 Sandbox Open, Tool Specs, Pending Event Delivery 및 Skill Fetch를 일부 병렬화한다.

**첫 모델 호출의 차단 의존성 재설계:** [#4749](https://github.com/langchain-ai/open-swe/pull/4749)(17:14 UTC)은 기존에 첫 모델 호출을 **3.1~3.5초** 지연시킨 Git Baseline Snapshot을 첫 Model Request와 겹치게 한다. 단 **첫 파일 수정 Tool 실행 전에는 반드시 Baseline 결과를 기다린다**. Baseline 실패는 기록하고 Run을 계속하며, 재시작 시 미회수 결과를 임의로 다시 캡처하면 Agent 수정 이후를 Baseline으로 오인할 수 있어 재캡처하지 않는다.

**P4 PoC:** 첫 Model Call을 *읽기 전용 계획/검색*으로 제한하고 P4 HaveList/Baseline을 백그라운드 준비한다. 쓰기/submit 전 Barrier를 둬 Revision Freshness 확인. 독립 RPC만 병렬화하고 Permission/Token/CL 상태는 필수 완료 Barrier. 50개 샘플의 model-start p50/p95, first-write p95, stale baseline 0, rollback success, model/USD는 별도. **평가: PoC.**

### 10-A. Open SWE #4772 — 리뷰에서 Walkthrough 생성을 Critical Path 밖으로

[10/29 19:53 UTC 병합](https://github.com/langchain-ai/open-swe/pull/4772). 기존 자동 Review는 별도 PR Walkthrough Scout가 끝날 때까지 기다렸다. PR의 Datadog **219회/6시간** 운영 샘플에서 그 준비 시간만 **p50 122초, p90 295초**였다. 변경은 Review Agent가 Walkthrough를 기다리거나 입력으로 사용하지 않고, PR Description/Diff/기존 Finding/Review Comment만 받게 한다. Walkthrough는 UI를 위해 독립 생성된다. 따라서 **전의 2~5분 의존성은 제거됐지만 전체 Review p50의 실제 절감 실측이 나온 것은 아니다**. 빠진 설명이 Review 품질에 영향을 주는지 회귀 검사해야 한다. P4 Review에는 Diff Anchor + CL Description + CI Finding 위주 최소 컨텍스트를 제공. **평가: 바로 적용 원칙/품질 PoC.**

### 10-B. Open SWE #4731 — Run-local Guidance Parsing Cache

[10/29 16:57 UTC 병합](https://github.com/langchain-ai/open-swe/pull/4731). 각 Model Call 전 과거 Message XML의 RunContext ID를 반복 파싱하던 부분에 Run 단위 최대 **512개**, 길이 **16,384자 이하**만 Cache한다. 메시지 내용은 매 호출 재확인해 수정·Compaction 반영. 작성자 microbenchmark **3,000 messages: 25.761→첫 14.052→후속 2.461ms**, 6,000 messages로 Capacity 초과 시 25.873→26.134ms로 오히려 소폭 느림. 이는 JS/XML CPU 시간 절감이지 LLM Token 절감이 아니다. P4에서 Run Guidance를 hash+version으로 memoize하되 정책·Permission 변경 이벤트로 invalidate. **평가: PoC.**

### 10-C. Open SWE #4764 — Model Routing의 실패 경로 제거

[10/29 18:17 UTC 병합](https://github.com/langchain-ai/open-swe/pull/4764). Auto Model Classifier(Jev) 호출이 생산 환경에서 TypeSafe 직접 경로로 먼저 가 **403**을 내고 LangSmith Gateway로 fallback되어 건당 **약 60~140ms**가 불필요하게 쓰였다. 변경은 분류 요청을 Gateway로만 보내며 기본 모델 fallback은 유지. **모델 라우팅 정책 자체가 새로 더 정확해졌다는 근거는 없음**. P4 Harness에서 모델/권한 라우팅 실패를 classification + gateway auth + default fallback으로 계측. **평가: 바로 적용 원칙(불필요한 실패 호출 제거).**

## 11. Open SWE #4711/#4709/#4372 — Durable Task Delivery / Stalled Run / 비용 영수증

**정기 결과의 귀속:** [#4711](https://github.com/langchain-ai/open-swe/pull/4711)(10/29 15:18 UTC). Schedule가 요청자에게 결과 DM을 발송할 수 없어 **과거 173개 Run의 전달이 실패**했던 문제. Backend가 스케줄 작성자 ID를 조회하고 **그 작성자 본인에게만**, 해당 Schedule Thread에서 전송 허용. 매 Run마다 조직 접근과 Linked Account를 재검사한다. Agent는 다른 사람에게 DM할 새 권한을 얻지 않는다.

**멈춘 Run의 종료:** [#4709](https://github.com/langchain-ai/open-swe/pull/4709)(19:47 UTC). 장기간 이벤트가 없는 Run이 영원히 busy로 남으면 Webhook이 발생하지 않아 전달이 실패한다. 1분마다 상태 점검하고 Transcript가 **90분 이상 조용한** Run을 DB Claim 1회로 잡아 Failed(run_stalled) 공지 + Run Cancel을 수행한다. 기존 정상 호출은 최장 약 45분 조용할 수 있으므로 안전 여유를 둔다. 원인 Freeze는 **해결하지 않았고 자동 재시작도 하지 않는다**. PR은 10/26에 수백 건이 있었다고 기록한다.

**Review usage 누락:** [#4372](https://github.com/langchain-ai/open-swe/pull/4372)(17:40 UTC)은 Reviewer Run에 Transcript/Terminal Usage Middleware가 빠져 Timestamp, 실제 Model/Effort, Invocation Cost가 누락되던 문제를 수정했다. **과거 기록은 backfill하지 않는다**.

**P4 운영 정책:** Task Lifecycle는 QUEUED → PREPARING → RUNNING → VERIFYING → DELIVERED/FAILED를 별도 영속화. Run Progress Heartbeat는 Tool Activity/Model Activity/External Build Wait를 구분하고, 정지 시간은 실제 최장 Tool Wait에 맞게 설정. Completion과 Delivery Receipt는 독립. 인앱 비통지 자동화라도 결과 Artifact URI와 develop read-back은 필수. Reviewer 모델비 누락률 0, duplicate delivery 0, wrong recipient 0. **평가: 바로 적용 원칙.**

## 12. Microsoft Agent Framework #9827 — 복구된 RAG Memory의 Scope도 검증

**원문:** [.NET #9827, 10/29 14:35 UTC](https://github.com/microsoft/agent-framework/pull/9827). Mem0Provider에서 신규 State 초기화 때는 Storage/Search Scope를 검사했지만, 저장된 StateBag을 **복원**하면 Initializer를 우회해 빈 Scope가 통과했다. 이때 ClearStoredMemoriesAsync가 scope filter 없이 **DELETE /v1/memories/** 호출을 보낼 수 있었고 에러를 로깅만 할 가능성이 있었다.

**변경:** Provider Session State를 가져올 때마다 공통 GetState/HasValidScopes를 거쳐 Search/Store/Clear 모두 범위를 검사. 빈 문자열/공백 ID도 무효로 간주. Restored StateBag에서 Request가 **송신되기 전에** 예외가 발생하는 테스트 포함. 작성자 **57/57 Mem0 Unit Tests** 통과. Client 자체 ClearMemoryAsync의 별도 문제는 **다른 수정 범위**로 남아 있다.

**P4/RAG:** Context Store 조회·삭제 Scope를 (org, workspace, depot, user, task, auth_version)로 강제. Restore된 Checkpoint/RAG Cursor에서도 동일 검사를 반복하고 범위 없는 Retrieve/Delete는 Fail Closed. 캐시 재사용과 Scope 보안은 독립. 정상 검색 Recall, Leakage 0, unauthorized delete 0. **평가: 바로 적용 원칙.**

### 12-A. Agent Framework #9804 — CodeAct Provenance 정책의 Alias·Import 우회 차단

[10/29 11:29 UTC 병합](https://github.com/microsoft/agent-framework/pull/9804). OS/Process Capability 검사에서 Function Helper, Loop, Alias/Import 경로에 따라 OS-derived call을 놓치던 범위를 확장했다. 이름 Dependency Worklist, _make_subprocess_transport / Popen / _winapi 등을 보수적으로 추적해 Runner 실행 전에 거부. 작성자 **264개 LocalCodeAct Unit Tests** 통과, 다만 **외부 Sandbox/OS 격리를 대체하지 않는다**. P4/UE5 Script Runner는 Static Scan을 도입해도 p4 submit이나 Shell 실행은 실제 Capability/Permission Gate 필수. **평가: PoC(보안).**

## 13. OpenCode #58915 — 세션 메시지 Part 분리의 안전한 Rollout

[10/29 04:30 UTC 병합 #58915](https://github.com/anomalyco/opencode/pull/58915)은 SQLite **session_part(message_id,ordinal)** Table을 추가하고, 각 메시지 읽기·통계·Compaction·Fork 경로에서 해당 Part Row가 있을 때 우선 사용하도록 했다. 기존 Inline JSON Content는 계속 읽고 쓴다. 향후 Writer가 새 형식으로 저장한 뒤 한 버전 Rollback해도 History가 유실되지 않도록 **Read-New → Write-New**의 두 단계 배포를 선택했다.

**과장 금지:** 이 PR만 적용할 때 작성자 벤치의 WAL Write는 기존과 동일한 **47.89MB/10 step**이다. **47.89→7.46MB(−84.4%), fsync 22→2**는 **아직 미병합 [Writer #58916](https://github.com/anomalyco/opencode/pull/58916)**을 함께 적용한 작성자 실험 값이며 **오늘 릴리스 성과가 아니다**. Read Path는 500 Assistant Message당 추가 Query 1회를 수행한다. PR 작성자 세션 관련 304 테스트 통과.

**P4 적용:** Durable Event Store 구조 변경 시 Dual-Read/Versioned Writer/Backward-Compatible Rollback을 먼저 배포. 대형 diff/artifact는 Content-addressed Blob으로 분리할 수 있지만 이전 버전 reader가 Blob Ref를 읽는지 확인. 10회 Tool-heavy Session의 WAL, fsync, recovery, media hydration, retention policy를 계측한다. **평가: 아이디어 참고/PoC.**

## 14. Gemini CLI #30035 — Tool Output의 안전한 Prompt Template 대입

[10/29 19:05 UTC 병합 #30035](https://github.com/google-gemini/gemini-cli/pull/30035). JavaScript String.replace(placeholder, dynamicText)를 일반 replacement string으로 쓰면 Tool Output이나 User Payload에 있는 **$&, $', $백틱, $$** 등의 특수 치환 패턴이 Prompt를 조용히 변형한다. 특히 $'는 템플릿 뒤 내용을 중간에 끼워 넣고, chained replace는 먼저 넣은 텍스트에 나중 Placeholder가 있을 때 이중 치환까지 일으켰다.

**수정:** Summarizer, Edit Fixer, Session Summary의 Prompt를 **safeTemplateReplace를 이용한 single-pass** 치환으로 바꿨다. 실제 내용·Tool Evidence가 토큰 절약 요약에 들어갈 때 임의의 부풀림·손상이 없도록 보호. 작성자 **관련 4파일 107 tests** 통과(신규 회귀 4개 포함). 정량 token savings는 없으며, 본질은 **Evidence/Prompt Integrity**다.

**P4 적용:** Unreal Log나 P4 Description을 시스템 지침과 이어 붙일 때 단순 replace chain을 쓰지 말고 함수 기반 substitution/explicit template engine, untrusted boundary, length hash를 적용. '$', '{{error}}', 중첩 Placeholder, UTF-8, EOL 조합을 Property-based Test로 검증. **평가: 바로 적용 원칙.**

## 15. 공식 릴리스 확인과 보고 범위의 보수적 해석

- [Codex 0.166.0](https://github.com/openai/codex/releases/tag/rust-v0.166.0) **2026-10-29 19:47 UTC 게시**: codex queue --resume, Standalone Executor 패키지, Resume/Fork 뒤 Reasoning Token 중복 계상 수정(#57839), Approval 복원 등 포함. 같은 날 **20시 전후 main에 머지된 #58125/#58159 등이 이 릴리스에 포함됐다고 단정하면 안 된다**. 릴리스 Changelog와 병합 순서를 분리했다.
- [OpenCode v2.2.1](https://github.com/anomalyco/opencode/releases/tag/v2.2.1) **2026-10-29 05:16 UTC**, [v2.2.2](https://github.com/anomalyco/opencode/releases/tag/v2.2.2) **18:43 UTC**. v2.2.1의 Goal Loop([#59437](https://github.com/anomalyco/opencode/pull/59437))는 idle hook을 통해 reviewer가 완료를 확인할 때까지 계속 진행하며, 직접 subagent/background 상태를 확인한다. 그러나 **무제한 지속 모델 실행이 곧 비용 최적화는 아님**. 시간/turn/USD budget, 중단 및 handoff receipt를 별도로 요구한다. 오늘 병합된 experimental scheduling 전체가 2.2.2에 포함됐다고 단정하지 않는다.
- [Claude Code 공식 릴리스 목록](https://github.com/anthropics/claude-code/releases): 조사 마감 시 최신으로 조회된 것은 **v2.1.312(10/27 20:24 UTC)**다. 전일 이미 분석한 CLAUDE.md/Skill/Compaction 수정과 **중복이므로 신규 항목으로 재기록하지 않는다**. 새 버전 확인 불가와 기술 후속 커밋 확인 불가를 혼동하지 않는다.
- [Deep Agents 공식 릴리스 목록](https://github.com/langchain-ai/deepagents/releases): 새 Talon Command Hooks는 **10/29 main 병합** 근거이지 당일 정식 버전 배포를 확인한 결과가 아니다.
- 기타 Context Pruning, Provider-native Skill Search, Tool Schema Progressive Disclosure, Cache TTL, RAG Selective Retrieval, Session Handoff는 전일 확정 기법을 반복하지 않았다. 오늘 추가 확인한 범위에서 **새 정량 Token/Quality 벤치마크는 없었다**.

## 16. Perforce·Claude Code·Codex Harness 적용 제안: 실행 가능한 최소 실험

### 제안된 시스템 경계

| 계층 | 소유 데이터 | 정책 |
|---|---|---|
| Shared Prompt Prefix | 공통 읽기 규칙, Tool Contract, Skill 이름과 짧은 설명 | Thread/Run volatile data를 앞에 넣지 않음; policy hash 검증 |
| Run Context Delta | P4CLIENT, Depot, Base CL, UE5 Project, Build ID, Role, Model | 최신 Revision 검증, Compaction 후 재주입 |
| Tool Registry Backend | Tool Spec, ToolSet Digest, ACL/Grant, Discover/Search | Model에 Tool Schema 최소 노출, Executor에서 최종 권한 검사 |
| Runtime Adapter | Claude Code, Codex, P4 CLI, TeamCity, Code Mode Output | host-side budget; no-op polling; idempotent read와 side-effect 분리 |
| Durable Ledger | task, child edge, checkpoint, event/outbox, approval, cost, delivery | Atomic/lease/reconcile; Client 탈락 시 부모 상태 보존 |
| Evidence Store | 원본 diff, CL, build log, binary output, source hash, replay trace | 모델에는 요약/범위/URI만; 원본은 보관 정책에 따라 별도 관리 |
| Policy/Reviewer | Approval, Guardian, Hooks, Remote Scope, Verification | 승인/공개/실행 권한은 다른 검사; fail closed |

### PoC A — 150 Tool + Prefix + Output 예산을 한 번에 A/B/C/D

**환경:** P4 Read 50, Edit 30, CI/Build 40, Repo/Admin 30 = 150개의 가상 Tool Spec. 실제 Perforce Submit은 Mock으로 제한하고 위험 명령은 별도 수동 승인. Claude Code·Codex에 동일 50개 Task(검색 20, 수정 15, Reviewer 10, 장애 대응 5) 각각 3회.

- A: 모든 Tool Schema 공개, Run별 변동 Context를 System 앞에 배치, Client에서 Output Cut.
- B: Backend ToolSet Digest+검색, Shared Prefix 선두, Host에서 Output Cut.
- C: B+Task phase별 Skill 선택/Unload, Reviewer 독립 Context.
- D: C+No-model CI Polling, Durable Event/Cost Receipt.
- **측정:** provider input/output/reasoning/cache-write/cache-read tokens, 실제 Provider Bill, HTTP bytes, Context bytes, Tool Recall@1, verified task success, Evidence Anchor 정확도, approval bypass, p50/p95 latency.
- **통과 기준(제안):** Unauthorized write 0, Evidence Anchor 100%, 기존 A 대비 verified success 저하 ≤2%p, Provider Bill/verified task ≥10% 감소 **또는** latency p95 ≥20% 감소. 두 효과는 서로 대체하지 않고 별도 표시.

### PoC B — P4/TeamCity Durable Recovery와 승인

Run에 **task_id / attempt_id / child_id / p4_client / base_revision / cl / tool_set_digest / policy_hash / trace_complete / receipt_id**를 기록한다. [Edge Persist → Child Start], [Action Review → Submit → Remote Reconcile], [Event Commit → Delivery ACK], [Output Hash → Artifact URI → Model Summary]를 독립 Transaction으로 분리한다.

**검증:** Worker/Kill 100회, 중복 Submit/Build 0, CL 증거 누락 0, orphan child 0, 다른 project의 Memory/RAG 누출 0, 잘못된 recipient delivery 0, API 429나 Tool Timeout을 Context Overflow로 오인한 compaction 0. 실패한 작업은 실제 P4 원격 상태를 먼저 조회하고 재시도한다.

### PoC C — 장기 세션과 Prompt/Session Handoff

같은 1시간짜리 UE5 조사·수정 Task를 5m/1h Cache TTL, 1/4/8 Worker, Resume/Fork, 3천/6천 메시지 history, Large CLAUDE.md·중첩 Skill, 100MB compiler log로 반복한다. Prefix Hash와 Policy Version을 유지하되 **volatile Revision**은 Run Context Delta로 갱신한다. Skill/Tool Output 요약은 Source URI/Hash를 남기고, 모델 Context에서 제거해도 Evidence Store는 보존한다. Compaction 뒤 Context Scope가 정확히 복구되는지 검증한다. 사내 토큰 사용 제한을 고려해 **Cache 단가까지 포함한 실제 USD, 재시도 모델비, 실패 Task 재실행비**로 결론을 내린다.

## 17. 한계, 남은 확인점, 다음 조사 조건

1. 각 PR 작성자가 제시한 테스트·벤치마크·운영 장애는 **공식 PR 서술과 Source/Changed Files에 기반한 upstream 근거**이며, 조사자가 동일 하드웨어·유료 API/Perforce에서 재현한 결과가 아니다.
2. Open SWE #4697의 Backend ToolSet 변화가 실제 DB 369GB를 얼마나 줄였는지, #4762의 캐시 hit가 운영 배포 뒤 얼마나 증가했는지, Codex Host Truncation이 실제 LLM Token/비용을 얼마나 줄였는지는 **미측정**. 사전의 문제 수치를 개선 성과로 표기하지 않았다.
3. OpenCode #58916는 **Open PR**이므로 WAL −84.4% 결과는 장래 Writer 코드의 작성자 벤치일 뿐, #58915 병합 효과나 v2.2.2 릴리스 효과가 아니다.
4. Claude Code의 신규 공개 릴리스가 없었던 관찰 기간에 전일 분석한 항목을 재추가하지 않았고, 미병합 Open SWE #4730 cache-affinity도 출시 상태로 오인하지 않았다.
5. 일반적 Prompt Compression, RAG Re-ranking, Model Routing, Tool Output Summarization, Subagent Context Isolation은 오늘 새로운 소스·차별적 실험이 확인된 것만 기록했다. 검증되지 않은 절감률을 만들어 채우지 않았다.

**오늘 판정:** **구조·내구성·Latency에서 의미 있는 변경 다수 확인, 신규 청구 비용/토큰 절감 정량 실측은 없음.** 우선 재현은 **ToolSet Digest + Cross-thread Cache Prefix + Host Output Budget + Conditional No-model Polling**, 그 다음 **P4 Durable Ledger/Guardian Approval** 순으로 추천한다.


<!-- republished: 2026-10-30T07:39+09:00 -->