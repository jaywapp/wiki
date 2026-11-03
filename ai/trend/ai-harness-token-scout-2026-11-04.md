---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-04"
category: trend
tags: [ai-harness, coding-agent, orchestration, context-engineering, token-optimization, progressive-disclosure, mcp, skills, hooks, prompt-cache, compaction, selective-context, rag, subagents, model-routing, tool-output, durable-state, evidence-verification, session-handoff, runtime-adapter, cost-accounting, perforce, claude-code, codex]
source:
  - https://github.com/microsoft/agent-framework/pull/9986
  - https://github.com/microsoft/agent-framework/pull/8960
  - https://github.com/anomalyco/opencode/pull/61421
  - https://github.com/anomalyco/opencode/pull/61188
  - https://github.com/langchain-ai/open-swe/pull/5052
  - https://github.com/langchain-ai/open-swe/pull/4929
  - https://github.com/openai/codex/pull/59071
  - https://github.com/openai/codex/pull/59139
  - https://github.com/openai/codex/pull/59115
  - https://github.com/openai/codex/pull/58983
  - https://github.com/anthropics/claude-code/releases/tag/v2.1.317
  - https://github.com/openai/codex/pull/59041
  - https://github.com/openai/codex/pull/59011
  - https://github.com/langchain-ai/open-swe/pull/4861
  - https://github.com/microsoft/agent-framework/pull/9813
updated: 2026-11-04
---

# AI Harness · Context/Token Optimization Scout — 2026-11-04

> **조사 기준:** 2026-11-04 약 05:57 KST / 2026-11-03 약 20:57 UTC. 중심 관찰 구간은 2026-11-02 21:03 ~ 2026-11-03 20:57 UTC. GitHub 공식 PR REST API의 merged_at과 변경 파일, 릴리스 published_at, 테스트/벤치마크 설명을 대조했다. [전일 11/03 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-03.md), [11/02](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-02.md), [11/01](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-01.md)와 중복 제거. 별도 명시가 없으면 수치는 **업스트림 PR 작성자의 측정**이며 유료 LLM/Perforce 환경에서 독립 재현하지 않았다.

## 0. 요약 및 핵심 판정

**유의미한 신규 항목이 있다.** 오늘의 구조 변화는 (1) **MCP Skill 캐시의 사용자별 권한 격리**, (2) **MCP Tool Schema의 재귀적 정규화로 Prompt Prefix 안정화**, (3) **완료되지 않은 Assistant Row만 선택 조회해 긴 세션 복구 비용 감소**, (4) **프로세스 전역 Skill/Config 다운로드 공유**, (5) **Subagent Mailbox·권한 스냅샷·Session Replay 복구 개선**, (6) **Claude Code 2.1.317의 Hook 차단·Compaction/Transcript·비용 계측 수정**이다.

이전 보고서가 MCP 선택적 Validator, Tool Catalog 순서 고정, Stateless Run Token, Host-owned Turn Budget을 다뤘다면, 오늘은 **캐시 사용자가 누구인가**, **스키마 중첩 필드까지 byte-stable한가**, **복구시에 전체 대화를 또 역직렬화해야 하는가**, **유휴 Child에게 메시지가 손실 없이 도착하는가**로 초점을 이동했다.

**측정 한계:** 신규 PR에 대한 동일 성공률·동일 품질 작업당 실제 모델 입력/출력 토큰 절감률 또는 공급자 청구액 절감률은 **확인되지 않았다**. 1,011→143ms 등은 시뮬레이션 네트워크 지연, 10.56→3.88ms는 SQLite 로컬 읽기 경로, 70~500ms는 업스트림 분류기 지연 주장이다. 이 수치를 LLM 비용 절감으로 환산하지 않는다.

| 우선순위 | 신규 변경 / 원본 | 신규성·정량 근거 | P4/Claude Code/Codex 판정 |
|---|---|---|---|
| 1 | [Agent Framework #9986](https://github.com/microsoft/agent-framework/pull/9986) | MCP Skill cacheScope public/private + 인증별 Partition, 기본 최대 100 | **바로 적용 원칙 / PoC 최우선** |
| 2 | [Agent Framework #8960](https://github.com/microsoft/agent-framework/pull/8960) | 중첩 JSON Schema까지 재귀 정렬; restart 후 prefix byte 안정화 | **바로 적용 원칙** |
| 3 | [OpenCode #61421](https://github.com/anomalyco/opencode/pull/61421) | 미완료 Assistant만 조회; 2,000메시지 read 10.56→3.88ms | **PoC 최우선** |
| 4 | [OpenCode #61188](https://github.com/anomalyco/opencode/pull/61188) | Sign-in/Org별 공유 Console/Skill Fetch; 2 Project에서 1 config + 1 skill 요청 | **PoC 최우선** |
| 5 | [Open SWE #5052](https://github.com/langchain-ai/open-swe/pull/5052) | 독립 Context/RPC 동시 요청; 50개 summary 1,011→143ms(모의) | **PoC 최우선** |
| 6 | [Codex #59071](https://github.com/openai/codex/pull/59071) | Code Mode Only에서 제3자 Tool 강제 Deferred, 개발 단계 opt-in | **PoC** |
| 7 | [Codex #59139/#59115](https://github.com/openai/codex/pull/59139) | 유휴 Child Mailbox + eviction 시 실제 Permission Snapshot 유지 | **바로 적용 원칙** |
| 8 | [Claude Code v2.1.317](https://github.com/anthropics/claude-code/releases/tag/v2.1.317) | SDK Hook fail-closed, 긴 Session Compaction, OTel/Cost Receipt 보강 | **바로 적용 검증** |
| 9 | [Open SWE #4929](https://github.com/langchain-ai/open-swe/pull/4929) | Tool Search로 찾아 쓰는 Code Mode 전용 확률형 분류기, 70~500ms 주장 | **PoC** |
| 10 | [Codex #59041/#58983](https://github.com/openai/codex/pull/59041) | 완료 메시지 token 계측 + 실행 세션 50초/80초 복구 창 | **바로 적용 원칙** |
| 11 | [Open SWE #4861/#4864](https://github.com/langchain-ai/open-swe/pull/4861) | Default branch의 경로별 Approval Rule과 조건부 휴먼 승인 | **제한적 PoC / 자동 승인 확대는 도입 가치 낮음** |
| 12 | [Agent Framework #9813/#9973](https://github.com/microsoft/agent-framework/pull/9813) | Citation 손실 방지 및 CodeAct Host Error 기본 비공개 | **바로 적용 원칙** |

## 1. MCP Skill Cache의 사적 응답은 인증 주체별로 격리 — Agent Framework #9986

**신규성:** 11/03 15:51 UTC 병합. 전일의 Workspace Memory 큐레이션과 다르게, MCP로 원격 배포하는 Skill의 **응답 캐시 자체에 접근 주체를 반영**한다. 원본은 [PR #9986](https://github.com/microsoft/agent-framework/pull/9986), [AgentMcpSkillsSource.cs](https://github.com/microsoft/agent-framework/blob/main/dotnet/src/Microsoft.Agents.AI.Mcp/Skills/AgentMcpSkillsSource.cs), [CacheScopeTests](https://github.com/microsoft/agent-framework/blob/main/dotnet/tests/Microsoft.Agents.AI.Mcp.UnitTests/Skills/AgentMcpSkillsTests.CacheScope.cs) 및 [MCP Skills Extension 결정 기록](https://github.com/modelcontextprotocol/ext-skills/blob/main/docs/decisions.md).

**문제:** skills/list, skills/get, resources/read를 공통 캐시하면 사용자 A의 private Skill/Resource가 인증이 다른 사용자 B에게 보일 수 있다. **캐시 적중률과 권한 격리는 다른 문제**다.

**동작:** MCP 응답의 cacheScope를 확인한다. public은 공유 가능, private은 호출자의 인증 컨텍스트에 묶는다. 옵션 CacheIsolationKeySelector는 계정·조직 등 캐시 파티션 키를 정하며 빈 키를 금지한다. 키 선택자가 없는데 private 응답이 반환되면 InvalidOperationException으로 실패한다. Partition 수 기본 상한 **100**, Sliding/Absolute Expiration은 응답 TTL과 별도 관리. 상위 AgentSkillsProviderBuilder에는 별도 캐시가 존재하므로 예제는 **DisableCaching()**을 사용해 실제 MCP Source의 scope 검사·TTL을 우회하지 않게 한다. 중첩 Cache를 믿고 분리했다고 착각하는 것이 핵심 실패 모드다. Missing/null scope는 기존 MCP 서버 호환을 위해 public으로 간주한다는 보수적 한계가 있다.

**토큰 원리 및 Trade-off:** private partition은 다른 사용자 간 재사용을 줄여 캐시 적중률과 비용을 악화시킬 수 있다. 반면 권한 경계 정확도, 감사 추적을 확보한다. 토큰 절감 수치 없음. 100 Partition 상한은 서비스 기본값이며, 100개 계정까지만 지원한다는 의미는 아니다. 인증/권한 자체는 호출 애플리케이션이 검증해야 한다.

**Perforce 적용:** cache key = hash(organization, user/role, P4 depot scope, workspace, permission_version, skill version). Skill 본문이 공통 public인지, 특정 CL/P4CLIENT에 종속된 private인지 분리. 세션 Resume와 사용자 교체 후에도 private Skill 교차 노출 0을 테스트한다. **바로 적용 원칙, 구현 PoC 최우선.**

## 2. MCP inputSchema의 재귀 정렬로 Cache Prefix 안정화 — Agent Framework #8960

**신규성:** 11/03 10:18 UTC 병합. [PR #8960](https://github.com/microsoft/agent-framework/pull/8960)의 제목은 inputSchema 속성 정렬이지만, 실제 [변경 소스](https://github.com/microsoft/agent-framework/blob/main/python/packages/core/agent_framework/_tools.py)는 _canonicalize_schema를 추가해 object-level key를 재귀 정렬한다. properties, patternProperties, $defs, definitions, dependentSchemas, items, allOf/anyOf/oneOf 안의 중첩 구조에도 적용하고 **배열 자체의 요소 순서는 바꾸지 않는다**.

**문제/원리:** 서로 같은 의미의 JSON Schema도 MCP Server 재기동, Tool 목록 새로고침, 언어별 Dict 삽입 순서 차이로 Prompt Bytes가 달라지면 Shared Prefix Cache가 끊긴다. 전일 OpenCode #60811이 **Tool 배열 순서**를 고정했다면 이번 PR은 **Tool 내부 Schema의 재귀적 Key Order**를 안정화한다. Test는 결과 schema property 정렬을 검증한다. Schema가 크고 중첩될수록 정규화 CPU는 약간 증가하며 serialization/Tool call semantics 불변을 검증해야 한다.

**품질·비용:** Cache Read 증가율·공급자 비용은 미측정. 사용자별 scope/권한이 다르면 Prefix를 같게 만들기 위해 권한 Tool을 억지로 합치지 않는다.

**P4 테스트:** P4 Tool 150개, 중첩 object/array, 다른 순서로 생성한 MCP Schema 100세트를 canonical JSON SHA-256으로 비교하고 config/permission mutation 때만 hash 변경. cache_write/read, function-call 정확도, 권한 누출을 기록. **바로 적용 원칙.**

## 3. 장기 Session의 복구 검사만 선택적으로 — OpenCode #61421

**신규성:** [11/03 16:05 UTC 병합 #61421](https://github.com/anomalyco/opencode/pull/61421). 이전에는 LLM 호출 직전 stale Tool Call을 찾으려고 최신 Compaction 이후의 Session 전체(메시지/도구 출력/인라인 이미지)를 복원했고, 바로 다음 Context Loading이 다시 같은 기록을 로드했다. 대부분의 정상 Run에는 stale Tool이 없어 낭비가 컸다.

**내부:** SessionHistory.incompleteAssistants()가 SessionMessageTable에서 type=assistant, JSON time.completed IS NULL, seq>=latest compaction 조건으로 조회한다. 미완료 Assistant만 decode한 다음 streaming/running Tool을 기존과 동일한 Tool.Failed 이벤트로 Settling. Crash mid-tool 및 Subagent Tool metadata, 경계 이전의 미완료 기록 제외를 회귀 테스트한다. 전체 session normalization/compaction이 아니라 **Recovery-specific selective context**다.

**업스트림 측정:** Apple M5 / Bun 1.4.4 / 메모리 SQLite, 완료된 Assistant당 약 5KB Tool Output과 주기적 150KB PNG, warmup 뒤 9회 interleaved median, stale Tool 0건인 정상 경로.

| Compaction 후 메시지 | 변경 전 복구 조회 | 변경 후 | 감소 |
|---|---:|---:|---:|
| 200 | 1.08ms | 0.39ms | 약 64% |
| 1,000 | 4.89ms | 1.91ms | 약 61% |
| 2,000 | 10.56ms | 3.88ms | 약 63% |

이 수치는 **LLM 토큰 절감이 아니라 DB Decode 경로의 CPU/Latency 개선**이며 cold/file-backed DB, Full Drain p95, GC는 미측정. SQLite JSON Filter도 여전히 row 수에 따라 커진다.

**P4 적용:** Worker 복구 시 전체 Perforce diff·100MB TeamCity Log를 읽는 대신 **unfinished_attempt와 unresolved tool_receipt만** 조회. 안전한 Idle 검사와 위험한 Submit Reconcile을 별도로 구현한다. Remote P4 CL/Build 존재 여부는 반드시 실 서버에 재조회한다. **PoC 최우선.**

## 4. Workspace 간 Config·Skill Download 공유 — OpenCode #61188

**신규성:** [11/03 16:27 UTC 병합 #61188](https://github.com/anomalyco/opencode/pull/61188). 전일 Provider Discovery Shared Cache(#60082)와는 별개로 **Console Config·Skill Bundle**을 프로세스 전역으로 공유한다.

**내부:** SharedCache의 키는 server/sign-in/organization, Skill은 추가로 slug/version. 프로젝트마다 네트워크 요청하지 않고 공통 결과를 읽어 개별 Project에 적용한다. Config는 1분 간격 갱신, 인증 실패·SSO 필요는 성공된 오류 응답으로 전파해 이전 설정을 임의로 재사용하지 않는다. Network/5xx는 3회 재시도한 뒤 last-good을 유지하고, 스킬 버전이 바뀐 경우에만 새 bundle을 다운로드한다. PR 작성자의 **두 Plugin Instance 테스트는 최초 1 Config + 1 Skill 요청**, 1분 뒤 Config 1/Skill 0, 새 Version이 500을 반환할 때 총 4회 시도 후 이전 본문 보존이었다.

**Trade-off:** Skill 다운로드/네트워크 비용은 감소 가능하나 Token 절감 직접 실측 없음. 새 권한 정책 적용이 1분 늦을 수 있어 **실행 시 최신 ACL 확인**은 별도 필요. Restart 간 persistence, 실패 Skill 재시도는 아직 제한적.

**P4:** 여러 UE5 Project 및 Claude/Codex Workspace에서 Skill Registry는 shared bundle + version hash, 실행 권한은 per-user/p4-client로 강제한다. 1/5/20 프로젝트 Startup과 Skill Version 변경으로 HTTP count, cold/warm latency, stale policy, cost를 비교. **PoC 최우선.**

## 5. Model 앞 병렬 Context·RPC Prefetch — Open SWE #5052

[11/03 20:07 UTC 병합 #5052](https://github.com/langchain-ai/open-swe/pull/5052)는 구현 직전의 **독립적인** Network/Git Read를 asyncio.gather 등으로 겹친다. Conversation Summary는 8개씩 병렬, Review와 Check, 두 PR Diff, Slack/Webhook 기초 정보도 종속성에 따라 동시 조회. [pull_request_context.py](https://github.com/langchain-ai/open-swe/blob/main/openswe/github/pull_request_context.py), thread/handler/server 변경 파일 확인.

| Workload | Before | After | 범위 |
|---|---:|---:|---|
| Local Git Diff | 101ms | 97ms | 업스트림 환경 |
| 50개 대화 요약 | 1,011ms | 143ms | **모의 네트워크 지연** |
| PR Review + CI Checks | 81ms | 40ms | **모의 네트워크 지연** |
| PR Diff 비교 | 80ms | 40ms | **모의 네트워크 지연** |

독립 요청의 준비 지연만 줄였다. **보안 승인·Revision Baseline·종속 Tool Execution은 순서를 유지**한다. 11/03 이전 Scout의 #4720 RPC 병렬화와 기법은 비슷하지만, 이번 범위는 Conversation 목록/Review/Slack/Webhook/desktop로 확장한 *실제 신규 패치*다.

**Perforce 적용:** P4 files/describe, TeamCity Status, Skill Metadata, Evidence Index를 동시에 fetch하되 ACL과 CL 최신성 확인은 첫 Write 전 Barrier로 묶는다. 30작업의 TTFT, first_safe_edit p95, stale baseline 0과 실제 Provider Bill을 분리 측정. **PoC 최우선.**

## 6. Codex의 선택적 Tool 공개 정책: 같은 날 철회 후 재도입 — #59025 → #59071

이 사례는 PR 제목만 보고 최신 상태를 오판하면 안 되는 대표적인 변경이다.

- [#59025](https://github.com/openai/codex/pull/59025) **11/03 01:31 UTC**: 엄격한 제3자 Tool deferral 로직 제거, caller의 omit_tools_from 및 namespace/직접 공개 설정을 그대로 존중.
- [#59071](https://github.com/openai/codex/pull/59071) **같은 날 06:06 UTC**: **code_mode_only_strict_3p_tools를 개발 단계의 opt-in Feature로 다시 추가**. Effective Mode가 Code Mode Only일 때 허용된 MCP/App/Dynamic Tool을 호출자가 direct-only 또는 omit으로 요청했어도 exec 경유 deferred로 강제한다. Hidden/Policy Denied/Built-in 분류는 유지하고 충돌 경고는 모델 Prompt가 아니라 서버 Log에만 남긴다.

**토큰 절감 원리:** 모델에 150개 제3자 Tool Schema를 직접 보여주지 않고 Code Mode Tool Catalog를 통해 필요할 때 검색/호출한다. 단, **기능 자체는 기본 OFF**이고 도구 검색 추가 지연 및 선택 실패 Trade-off가 있다. 원격 Permission Gate는 필수, 강제 deferral도 임의 Tool 실행 권한이 아니다. Prompt Cache Prefix 보존과 현재 Tool Registry로 실행하는 통합 테스트가 동반된다.

**P4 평가:** read-only Tool은 progressive disclosure하고, Submit/Depot Admin Tool은 검색 가능 여부와 실행 권한을 분리. Feature Gate를 건 150-Tool A/B의 visible Tool Spec bytes, cache hit, Tool Selection Recall, unauthorized call=0 검증. **PoC**, 정식 제공 기능으로 단정 금지.

## 7. 모델을 매번 깨우지 않는 저비용 Classify — Open SWE #4929

[11/02 23:37 UTC 병합 #4929](https://github.com/langchain-ai/open-swe/pull/4929)은 Code Mode 전용 tools.classify를 추가했다. TypeSafe System One의 typed choice(최대 255개 레이블), noul(yes 확률), score(서열형 Rubric)를 통해 모델이 매번 장문 분류·추론 Turn을 만드는 대신 **작고 구조적인 단일 분류 호출**을 사용할 수 있다. 모델 라우팅과 같은 LangSmith Gateway 경유, 별도 API Key 요구 없음, User의 experimental_classify와 Gateway 설정이 모두 있어야 Tool을 공개한다.

**정량:** PR은 결과 생성 지연을 **약 70~500ms**라고 설명하나 비용/정확도 분포·Calibrated Confidence의 도메인 독립 검증은 없다. 분류가 무료가 아니라 **별도 모델 호출**이라는 점을 구분해야 한다. 한 Turn에서 여러 항목을 동시에 분류하고 낮은 Confidence는 강한 모델/사람에게 올리는 구조가 포인트다.

**P4 PoC:** 실패 Log를 compiler/linker/asset/permission/unknown로 먼저 분류해 진단 Worker와 Model을 라우팅. 500개 라벨링된 Build 실패 사례로 macro-F1, calibration, incorrect auto-route, bill/verified-resolution, p95 지연 비교. 보안 위험 여부·P4 Submit 승인 결정은 classifier 단독으로 하지 않는다. **PoC.**

## 8. Subagent Mailbox·권한 Snapshot·수명주기 — Codex #59139/#59115/#59167

**[Mailbox #59139](https://github.com/openai/codex/pull/59139)** (11/03 12:33 UTC): Child가 active Turn을 열고 있지 않으면 Message Board 통지가 누락되던 문제를 해결. Board Notice를 일반 Op::InterAgentCommunication Mailbox에 넣고 trigger_turn=false로 **완료된 Final Answer를 재개방하지 않은 채 다음 Turn에서 전달**. Eviction과 Delivery가 경합하지 않도록 Residency Guard 사용. Idle recipient, late notice, pending Tool 앞 전달의 회귀 테스트를 추가했다.

**[Permission #59115](https://github.com/openai/codex/pull/59115)** (10:44 UTC): 형제 Agent가 Evicted Child를 깨울 때 Profile 이름만으로는 이전 Runtime Grant/Denial/Network Restriction을 복구할 수 없었다. Eviction 시 effective config snapshot을 보관하고 Reload에서 **권한/Reviewer 설정을 보존**, 기타 설정은 최신 Wake Config를 사용. 재실행 때 권한이 예상보다 넓어지는 사고를 막는 데 중요하다.

**[Board Ownership #59167](https://github.com/openai/codex/pull/59167)** (14:16 UTC): 영구 Board 삭제를 Core에서 App Server Thread-Store Cleanup Callback으로 이동. Feature가 OFF여도 이전 Board Cleanup은 수행하고, Guardian Evidence Board Cleanup보다 먼저 순서 제어. 이것은 전일 #58973 임시 Board 생성과 다른 **후속 소유권/수명주기** 수정이다.

**Token/Trade-off:** Message 유실로 인한 Retry·중복 Turn을 줄일 여지는 있지만 청구 비용 실측 없음. Mailbox에 오래된 메시지가 들어와도 stale task/revision은 받아들이면 안 된다. 효과적 Permission Snapshot 저장은 민감한 정보이므로 암호화·TTL·Key Rotation이 필요하다.

**P4:** Parent/Child/Review Agent마다 task_id, child_id, permission_snapshot_hash, receipt_id, mail sequence, parent_generation을 Ledger에 둔다. Late Message는 P4 CL/Task Epoch 검사 후 수용; child 재시작 시 read-only가 write로 승격되지 않는지 회귀. **바로 적용 원칙.**

## 9. Codex 원격 실행 Session Recovery의 명시적 시간 예산 — #58983

[11/02 21:09 UTC 병합 #58983](https://github.com/openai/codex/pull/58983)은 Client Recovery **25→50초**, 마지막 **5초는 Process Output Replay**로 예약하고 Server Detached Session/RPC Process Output Retention을 **80초**로 연장한다. Recovery Registry 요청에 6초, Noise Handshake/Init에 20초 상한을 둔다. 취소된 Handshake는 남은 WebSocket/Transport Task를 종료한다.

단순 Timeout 확대가 아니라 **복구·핸드셰이크·출력 Replay의 서로 다른 Deadline과 보존 기간을 조정**하는 방식이다. 유휴 연결이 깨질 때 Worker가 이미 수행한 P4 Tool을 새로 실행해서는 안 된다. Duration 수치는 Codex의 설계값이지 Perforce 권장 기본값이 아니다. **바로 적용 원칙, 임계값은 자체 계측.**

## 10. Claude Code v2.1.317 — Hook Fail-Closed, Session Integrity, Cost/OTel

**공식 릴리스 [v2.1.317](https://github.com/anthropics/claude-code/releases/tag/v2.1.317), 2026-11-03 01:25 UTC.** 일부 항목은 새 기능, 나머지는 기존 실패 모드의 수정이다. 이전 2.1.316의 Model Effort 기능과 중복시키지 않는다.

1. **SDK Hook 실패 차단:** Hook Callback에 onFailure: "block" 추가. Tool 승인/검증 Hook이 실패했는데도 위험 행동이 계속되는 fail-open을 막는다. 단, 사용 중인 SDK 호출 경로에 이 옵션을 실제 적용해야 한다.
2. **조직 비용/계측:** OTel에 anthropic.plan / seat_type / provider / custom_base_url을 추가. Claude Apps Gateway Admin API **GET /v1/organizations/analytics/cost**로 날짜·개발자·IdP Group별 비용 조회. 이 Endpoint는 사용 환경과 관리자 권한이 있어야 하며, 일반 CLI 단독에서 동작한다고 단정할 수 없다.
3. **긴 세션/Compaction Integrity:** 아주 긴 대화의 앞선 Summary 소실, 큰 CLAUDE.md 변경 후 자동 Compaction 뒤 "Prompt is too long", Full Disk에서 Transcript 쓰기 실패를 claude -p가 exit code 0으로 은폐, 중첩 claude -p가 부모 Session ID/Transcript에 쓰던 문제 수정. 기본적으로 중첩 Session을 분리하되 self-hosted runner의 호환성 옵션 CLAUDE_CODE_DISABLE_NESTED_SESSION_ID=1을 제공.
4. **Cache·Skill:** 캐시 비활성 환경변수가 [1m]/다른 Region/날짜 없는 Model 표기에 적용되지 않던 문제, Disk에 쓰지 못한 동기화 Skill을 10분마다 재다운로드/소실하던 문제 수정. 반복 Skill 다운로드는 Byte/Latency 개선이며 LLM Token 개선치 없음.
5. **Windows/Runner 운영:** Tool path identity 검사, Runner Heartbeat 실패 때 연결 재설정, 설정 초기 변경 누락, Background Permission Mode 전환, Ctrl+C가 Background Agent 전체를 죽이는 문제 등 보완.

**Perforce 적용:** Windows Headless CI에서 Hook fail-closed, Disk-full Failure nonzero Exit, Nested Session Trace Separation, Large CLAUDE.md Compaction, Subagent Effort/Permission, Prompt Cache 비활성화 여부를 Smoke Test한다. **바로 적용 검증**, 새 비용 API의 실제 값과 Provider Bill을 교차 검증.

## 11. Token/Cost 계측은 모델 입력에서 분리 — Codex #59041

[11/03 02:26 UTC 병합 #59041](https://github.com/openai/codex/pull/59041)은 assistant item/completed Notification에 contentTokenCount를 추가한다. Default/Plan Mode의 완료된 Assistant Message에 대한 **Producer-supplied 토큰 수**이고, 없으면 null, 0도 유효하다. Stored Thread Item이나 후속 Model Prompt에 다시 넣지 않는다. 이는 이전 Scout의 Cache Hit Accounting 수정과 달리 **Output Artifact 단위 Telemetry를 Session History에 다시 오염시키지 않는** 구현이다.

이 값이 반드시 청구 Output Token과 동일하다는 보장은 없으므로 billable input, output, reasoning, cache write/read, model tier, turn/child, estimated 여부를 별도로 기록한다. P4는 Task-Level Cost Receipt에 수집하되 Evidence URI와 Source Hash도 연결한다. **바로 적용 원칙.**

## 12. Guardian Evidence의 섹션별 상한과 재검토 실패 복구 — Codex #59011/#59107/#59118

[11/02 23:31 UTC #59011](https://github.com/openai/codex/pull/59011): ElasticSectionLimits에 **max_total_section_tokens**를 추가해 섹션 minimum보다 작은 maximum은 생성·역직렬화 시 거부. 필수 Evidence는 minimum을 사용하며 선택 Evidence는 남은 예약분을 최대치까지 이용한다. 이전 #58444/#58962의 Elastic Budget 패턴을 실제 Config 불변식으로 보강했다.

[11/03 09:51 UTC #59107](https://github.com/openai/codex/pull/59107): Guardian Denial 후 **동일한 보안 정책·Evidence**로 딱 한 번 재검토하는 opt-in 기능. Configurable Developer Message 최대 1,000 UTF-8 Bytes, 검토 결과는 같은 JSON Schema. 실패·Invalid Response이면 기존 Denial을 유지하고 별도 Retry Loop를 만들지 않는다. [10:54 UTC #59118](https://github.com/openai/codex/pull/59118)은 **재검토 Timeout이 이미 확정한 Denial을 덮어쓰던 버그**를 수정해 기존 Risk/Authorization/Rationale을 보존한다.

**Trade-off:** 섹션 Cap은 필수 Evidence 누락을 막는 한편 Optional Context를 줄인다. Denial Reconsideration은 **모델 호출을 하나 더 쓰므로 토큰 비용 증가**가 가능하고, 잘못된 재평가로 승인되는 위험도 있다. Perforce Submit/Delete 권한 판단에는 모델 재검토만으로 정책 승인 결정을 뒤집지 않으며 실제 P4 protections + 별도 Human Approval Gate가 필수다. **Budget 불변식 바로 적용, 자동 Denial 재검토는 제한 PoC.**

## 13. Approval Policy는 Default Branch에서, 조건부 판단은 모델이 — Open SWE #4861/#4864

**[Rule Files #4861](https://github.com/langchain-ai/open-swe/pull/4861), 11/03 16:45 UTC:** .open-swe/auto-approve-rules/*.md의 frontmatter에 **match-all-files**(모든 변경 파일 패턴 일치)와 **match-any-files**(하나 이상 패턴 일치)를 지원한다. **PR의 변경 Branch가 아니라 Default Branch에서** 정책을 읽고 하나라도 Parsing 실패 시 자동 승인 전체 차단. 패턴만 맞아도 검토가 자동 통과한다는 뜻은 아니며 Reviewer가 해당 Rule을 판정한다.

**[Conditional Approval #4864](https://github.com/langchain-ai/open-swe/pull/4864), 14:39 UTC:** Reviewer가 최대 200자 승인 조건과 최대 500자 자동 승인 범위를 작성해 인간에게 한 문장 의도만 승인받는 실험. Default OFF/작성자 Opt-in. Findings가 남아 있으면 Needs Human Review로 fallback. Hidden Diff가 바뀌면 다시 노출하고 auth/CI/dependency/env 같은 민감 경로는 전체 표시. Human이 조건에 동의하면 GitHub approval을 제출하며, Agent가 조건부 결정에 직접 승인하지 않는다.

**판정:** 문서·테스트에 국한된 안전한 Scope Rule은 **PoC** 가치가 있다. 반면 **큰 코드 변경을 실제 Diff 없이 한 문장으로 승인하는 방식은 Perforce·UE5 Enterprise의 기본 제출 경로에 도입 가치 낮음**. 기존 P4 Submit Approval/CI Tests/Review Evidence를 생략하면 안 된다. 인적 Review 시간을 줄여도 검증 품질/보안 Trade-off가 너무 크다.

## 14. Evidence 전달 무결성과 CodeAct 출력 제한 — Agent Framework #9813/#9973

[OpenAI Responses Hosting #9813](https://github.com/microsoft/agent-framework/pull/9813) (11/03 16:17 UTC): Agent의 TextContent에 포함된 Citation Annotation이 Hosting을 통과하면서 사라지던 문제 수정. URL/File/FilePath/ContainerFile Citation을 Wire Representation에 변환하고 Stream Annotation Event 및 완료 Item에 보존. **근거 위치/링크를 최종 소비자에 전달**하는 기능이지 Citation 정확성을 자동 검증하는 기능은 아니다.

[CodeAct #9973](https://github.com/microsoft/agent-framework/pull/9973) (17:04 UTC): .NET Hyperlight 및 LocalCodeAct의 IncludeDetailedErrors 기본값 False. Host 내부 예외·Stack Trace/Inner Exception을 생성 코드에 반환하지 않고 실패 상태는 보존. Policy가 Provider Snapshot/Hyperlight Fingerprint에 반영된다. 작성자 측정은 Hyperlight Unit 58개, LocalCodeAct Host Error 6개 통과이나 **Native Hyperlight Backend 실제 테스트는 해당 환경에서 미실행**.

**P4:** 원본 TeamCity Log/P4 Error는 Secure Evidence Store로 보존, Agent에는 Error Code + Class + Bounded Excerpt + Evidence URI만 반환. External/Untrusted Tool Output은 Injection 방어/민감정보 제거. 반대로 오류 전체를 숨겨서 Triage Accuracy가 낮아지지 않는지 측정. **바로 적용 원칙.**

## 15. 추가 변경: QuickJS Schema 신뢰도와 Windows 설치 안정성

- [Deep Agents #7441](https://github.com/langchain-ai/deepagents/pull/7441), 11/03 03:45 UTC: QuickJS PTC Signature 생성 시 nested Pydantic Model이 unknown으로 뭉개지던 것을 tool.tool_call_schema + dereference_refs로 렌더링. Dict는 Record<string,V>, oneOf/allOf/const, union-array도 처리하고 재귀 자기참조는 unknown으로 안전하게 멈춘다. **명확한 Schema가 늘어 토큰이 증가할 수 있으며 Tool 오류 감소는 미측정**. P4 Argument Schema 품질 PoC.
- [Deep Agents Code 0.2.4](https://github.com/langchain-ai/deepagents/releases/tag/deepagents-code%3D%3D0.2.4), 11/02 23:13 UTC: Interrupt Cancellation Message lc_source 추가 및 MCP Reload/Login 설명 정비. 전일 0.2.3의 Tool Search 기능과 별도 기록.
- [Deep Agents #7518](https://github.com/langchain-ai/deepagents/pull/7518), 11/03 20:02 UTC: Windows 실행 중 dcode.exe가 잠겨 uv가 업데이트 중 설치를 삭제·손상시킬 수 있어, 자체 업데이트/Extras 변경을 **프로세스 종료 후 외부 터미널에서 실행할 명령으로 연기**한다. 이 변경이 0.2.4 릴리스에 포함됐다고 단정하지 않는다. Windows Harness의 Runtime Update/Session Handoff 정책에 유용, **바로 적용 원칙**.
- [OpenCode #60698](https://github.com/anomalyco/opencode/pull/60698), 11/03 16:32 UTC: GET /api/experimental/job 으로 SQLite job + Live Registry의 **미소비 Background Job**을 session/kind/status/descendants별 확인. Foreground Idle과 Background Job Completed/Delivered를 혼동하지 않고 Handoff에 활용. 정식 SDK API가 아닌 Experimental, **PoC**.
- [OpenCode #60970](https://github.com/anomalyco/opencode/pull/60970), 11/03 16:38 UTC: Text/Image/Decision 등 Request Transport의 headers, timeout, fetch를 공통화하고 Per-call Fetch Adapter를 제공. Experimental @opencode/ai의 **호환성이 깨지는 API 변경**이며 네트워크/보안/Trace 주입에는 유용하나 직접 Token 절감 사례 아님. **아이디어 참고**.

## 16. 이번 조사에서 별도로 보강하지 않은 주제

- **RAG/Selective Retrieval:** 새 독립 Retrieval-Quality/Token Benchmark는 확인되지 않았다. 다만 MCP Skill Private Cache Scope와 불완전 Assistant Target Query를 **선택적 Context의 권한·데이터 경계**로 기록한다.
- **Context Pruning/Compaction:** Claude Code 2.1.317의 긴 Summary 유실 및 큰 CLAUDE.md 오류 수정, Codex Elastic Evidence 상한은 변화지만, 실제 동일 품질 Token 절감 실험은 없다.
- **Prompt/Skill 경량화 및 Progressive Disclosure:** Deep Agents QuickJS Signature의 정확도 개선, Codex strict deferred Tool Mode, OpenCode Skill Fetch 공유가 실제 코드 변화다. "설명을 줄이면 X% 절약"이라는 무근거 주장은 제외한다.
- **Tool Output 축약/캐시:** 11/03 #61421은 **DB 디코딩 방지**이지 LLM에 보이는 로그를 잘랐다는 뜻이 아니다. CodeAct Redaction은 민감 데이터 보호 정책이지 성능 Benchmark가 아니다. 기존 Host-side Truncation은 반복 수록하지 않았다.
- **Model Routing:** System One Classify API의 70~500ms 주장은 실험 후보이며 실제 비용·정확도 개선이 확인되기 전까지 기본 적용하지 않는다.
- **Durable State / Evidence / Handoff:** #59139/#59115/#58983/#60698/#9813은 동작·복구·전달 경계를 직접 바꾼 신규 코드다.

## 17. Perforce·TeamCity·UE5·Claude Code·Codex 통합 제안 아키텍처

**아래는 실제 업스트림 구현을 조합한 '제안 아키텍처'다. 특정 프로젝트가 이 전체 구조를 이미 구현했다고 주장하지 않는다.**

    [User / Schedule / TeamCity Event]
               |
        [Task Ledger + Epoch]
               |
       [Orchestrator / Router]
          |       |        |
       [Claude] [Codex] [Cheap Classifier]
          |       |        |
          +--[Shared Skill Catalog / Canonical Schema]
                         |
             [Per-user Private Cache Scope]
                         |
              [Tool Discovery / Guard]
                         |
             [P4 Runtime Adapter / CI]
                         |
           [Receipt + Evidence Store]
                         |
           [Reviewer / Guardian Gate]
                         |
             [Deliver / Ack Ledger]

**경계:**
1. **Context:** Shared Prompt Prefix는 Tool Contract/Policy Hash/Skill Name만. P4CLIENT, CL, Build ID, Date, Permission Version은 Run Delta로 둔다. Compaction/Resume 후 최신 Delta를 주입한다.
2. **Tool:** Discovery는 권한 부여가 아니다. ACL은 P4 protections + Runtime Adapter에서 재검사한다. Skill private cache는 인증별 분리.
3. **Execution:** P4 submit/build 등 부작용은 Tool Receipt와 Remote Reconcile 후에만 Retry. 읽기/분류는 병렬 또는 저비용 Worker 사용 가능.
4. **Evidence:** Diff Anchor, P4 CL, TeamCity Build URL/Log SHA는 원본 저장. Model에는 필요한 오류 Span과 URI만 노출하고 Citation Annotation을 끝까지 유지.
5. **Durability:** Parent/Child Edge, Mailbox, Executor Lease, Permission Snapshot, Evidence Verification, Delivery ACK, Cost Receipt를 별도 기록한다. Foreground Done ≠ Background Job Done ≠ Delivered.
6. **Enterprise/Windows:** Claude SDK Hook onFailure:block과 Windows 실행 중 런타임 업데이트 연기; P4 Writable Workspace와 Reviewer Credential 분리.

### 실험 A — Cache Scope / Prefix / Tool Disclosure

**조건:** 3개 사용자 권한, 2개 Workspace, 150개 MCP Tool, Skill 20개, 동일 Task 30개×3회. A=무공유/모든 Tool 공개, B=공유 Prefix+Schema 정렬, C=B+Auth-partitioned Skill Cache + On-demand Discovery.

**측정:** Visible Tool Schema bytes, Canonical Schema Hash, Cache Read/Write Tokens, Provider Bill/Verified Task, Skill Fetch HTTP, Tool Recall@1, forbidden Skill cross-user leakage, unauthorized Tool Execute. **합격:** Cache cross-user leakage=0, unauthorized P4 action=0, Task Success 저하 2%p 이내, 실제 bill/task 10% 이상 개선 또는 Host/Transport Latency p95 20% 이상 개선. 두 KPI를 구분해 판정.

### 실험 B — Selective Recovery / Agent Mailbox

**조건:** 200/1,000/2,000 Message, Build Log 10KB/1MB/100MB, Worker 강제 중단 100회, Parent/Child 유휴·Evict·Reload, Inbox 순서 뒤섞기, Permission Profile 전환.

**측정:** Full History Decode Bytes, Recovery Latency p50/p95, Stale Tool 이벤트 일치율 100%, Duplicate P4 Submit 0, Orphan Child 0, Wrong Permission Grant 0, Late Mail Drop 0, Evidence Loss 0. 실제 P4 CL/Build Remote State와 Receipt가 다르면 작업을 재실행하지 않고 Reconcile.

### 실험 C — Cheap Classifier + Parallel Context

**조건:** 실패된 UE5/TeamCity Build 500건의 정답 레이블, 독립 읽기 4종(P4/CI/Skill/Evidence), 분류기 단독 vs 강한 모델 단독 vs Confidence Cascade. 민감 P4 Submit Approval은 어떤 경우에도 분류기 자동화 제외.

**측정:** Macro-F1, Confidence ECE, Failure Triage Success, TTFT p50/p95, Actual Provider Charge, Token Usage, false-route/unsafe-route. 독립 RPC만 동시 실행, Revision Barrier는 직렬.

### 실험 D — Cost/Quality/Evidence Receipts

**Cost Receipt 스키마 예시:**
- task_id, attempt_id, turn_id, child_id, source_revision, model_id, effort, policy_hash, tool_set_digest
- input_tokens, output_tokens, reasoning_tokens, cache_write_tokens, cache_read_tokens, assistant_content_tokens(optional), provider_billed_usd, estimated
- tool_output_raw_bytes, model_visible_bytes, evidence_artifact_sha, citation_anchor_count, verification_status
- spawned_at, resumed_at, last_heartbeat_at, trace_complete, task_complete, delivered_at

**통과:** Reviewer Citation Position/URI 100% 보존, Cache/Reasoning 중복 계상 0, 누락된 청구 Receipt 0, 실패한 세션의 stderr 원문은 Secure Store에 보존하되 모델 노출 제한. Provider Bill이 없으면 추정값임을 명시한다. 모델 사용 비용/성공 작업 지표와 준비 지연 개선은 별도 차트로 보고한다.

## 18. 공식 릴리스·병합 상태 확인

- **Claude Code v2.1.317:** 11/03 01:25 UTC 공식 릴리스. 이 문서의 Claude 변경은 배포된 Release Note 기준이다.
- **Deep Agents Code 0.2.4:** 11/02 23:13 UTC 정식 릴리스. QuickJS #7441/Windows #7518은 그 이후 main에 병합됐으므로 **0.2.4 포함 여부를 단정하지 않는다**.
- **Codex:** 조사 시점 최신 조회에서 0.167.0-alpha.4가 11/03 02:24 UTC 게시됐다. 오늘 main에 병합된 #59139/#59115 등 후속 PR을 alpha.4에 들어간 것으로 표시하지 않는다.
- **OpenCode:** 최근 공개 릴리스 목록의 v2.2.5는 10/30 23:17 UTC. 오늘의 #61421/#61188/#60698 등은 **개발 브랜치에 병합된 구현**, 해당 릴리스 수록 확인이 아니다.
- **Agent Framework:** Python 1.24.0(10/30 21:52 UTC), .NET 1.27.0(10/30 18:55 UTC) 다음 11/03 병합된 #9986/#8960/#9973/#9813은 **main 병합과 패키지 릴리스를 구분**한다.

## 19. 출처·검증 범위·다음 확인점

**원본 자료:** [Claude Release](https://github.com/anthropics/claude-code/releases/tag/v2.1.317), [Agent FW Private Skill Scope](https://github.com/microsoft/agent-framework/pull/9986), [Recursive Schema Canonicalization](https://github.com/microsoft/agent-framework/pull/8960), [OpenCode Selective Recovery](https://github.com/anomalyco/opencode/pull/61421), [Skill SharedCache](https://github.com/anomalyco/opencode/pull/61188), [Open SWE Parallel Prefetch](https://github.com/langchain-ai/open-swe/pull/5052), [Classify](https://github.com/langchain-ai/open-swe/pull/4929), [Codex Strict Tool Deferral](https://github.com/openai/codex/pull/59071), [Mailbox](https://github.com/openai/codex/pull/59139), [Permission Restore](https://github.com/openai/codex/pull/59115), [Session Recovery](https://github.com/openai/codex/pull/58983), [Cost Notification](https://github.com/openai/codex/pull/59041), [Evidence Budget](https://github.com/openai/codex/pull/59011), [Approval Rules](https://github.com/langchain-ai/open-swe/pull/4861), [Conditional Approval](https://github.com/langchain-ai/open-swe/pull/4864), [Citation Preserve](https://github.com/microsoft/agent-framework/pull/9813), [Error Redaction](https://github.com/microsoft/agent-framework/pull/9973), [QuickJS PTC](https://github.com/langchain-ai/deepagents/pull/7441), [Windows uv](https://github.com/langchain-ai/deepagents/pull/7518).

**한계:** 각 PR의 독립 벤치마크 재현, 실제 회사 Perforce/TeamCity 비용/권한 검증, Cache Scope 상호운용성, Open SWE Classifier F1, Agent Mailbox 실운영 장애율은 수행하지 않았다. PR 작성자의 테스트/수치를 검증된 운영 개선으로 과장하지 않는다. 검색 날짜는 실제 merged_at/published_at에 맞춰 지정했다.

**최종 판단:** **바로 적용 원칙**은 MCP Skill Private Scope, Schema Canonicalization, Claude SDK Hook Fail-Closed, Agent Permission Snapshot, Remote Action Reconcile, Citation/Cost Receipt. **PoC 최우선**은 Session Incomplete-Only Recovery, Shared Skill/Config Cache, Parallel Prefetch, Selective Code Mode Tool Catalog. **PoC**는 Cheap Classifier/Conditional Approval/Strict 3P Deferral. **현재 도입 가치 낮음**은 Human에게 전체 Diff를 보여주지 않는 대형 자동 승인 확대. 확인된 신규 동일 품질 LLM 토큰 또는 실제 청구 비용 절감 수치는 **없음**.
