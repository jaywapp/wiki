---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-31"
date: 2026-10-31
category: trend
tags: [ai-harness, coding-agent, context-engineering, context-compaction, token-optimization, prompt-cache, mcp, skills, hooks, tool-search, subagents, durable-state, evidence-verification, model-routing, cost-telemetry, perforce, claude-code, codex, opencode, open-swe]
source:
  - https://github.com/langchain-ai/open-swe
  - https://github.com/openai/codex
  - https://github.com/anthropics/claude-code/releases/tag/v2.1.314
  - https://github.com/anomalyco/opencode
  - https://github.com/microsoft/agent-framework
updated: 2026-10-31
---

# AI Harness · Context/Token Optimization Scout — 2026-10-31

> **조사 기준:** 2026-10-31 06:02 KST, 약 2026-10-30 21:02 UTC까지. **신규 비교 구간:** 2026-10-29 21:02 ~ 2026-10-30 21:02 UTC. GitHub REST 커밋 목록, 실제 PR merged_at, Changed Files/대표 소스/테스트, 공식 릴리스 노트를 확인했다. 업스트림 작성자의 로컬 벤치마크는 독립 재현 결과와 구분한다. 바로 전 [10/30 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-30.md), [10/29 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-29.md)에서 다룬 동일 변경은 반복하지 않는다.

## 0. 요약 및 신규성

**오늘 가장 큰 변화:** (1) Open SWE가 전일의 deployment/thread 공유 Prefix에 이어 **workspace별 큐레이션 메모리라는 두 번째 캐시 계층**을 추가, (2) Codex가 **deferred tool world state를 기본 활성화**하고 Guardian의 Evidence 할당을 **항목 전체 보존 우선**으로 변경, (3) Claude Code 2.1.314가 **캐시 만료 조건에 연동한 idle compaction**과 PreCompact Hook 출력 제한을 제공, (4) Open SWE가 시작·종료 장부 처리를 critical path 밖으로 이동하면서 실제 준비/종료 지연을 측정, (5) OpenCode의 **SQLite 단일 리더 lease 기반 schedule/typed background job recovery**, (6) 비용 영수증에서 마지막 Step 누락과 Context 사용량 경계 누락을 직접 수정한 사례다.

**검증 결과:** 구조·실행시간·계측에는 새 근거가 있지만, 오늘 병합된 기능에 대해 **동일 품질 작업당 검증된 LLM 토큰 절감률이나 실제 provider 청구액 절감률은 확인되지 않음**. PR의 이전 장애 수치나 네트워크·CPU 벤치를 모델 비용 절감률로 환산하지 않는다. 실제 model/context 동작 변경과 컴파일러/운영 지연 개선을 분리한다.

| 우선순위 | 신규 변경 / 원본 | 근거와 상태 | P4·Claude Code·Codex 적용 평가 |
|---|---|---|---|
| 1 | [Open SWE #4815: workspace memory + cached prompt](https://github.com/langchain-ai/open-swe/pull/4815) | 10/30 18:12 UTC 병합; experimental memory 기본 OFF; 사용량 실측 없음 | **PoC 최우선** |
| 2 | [Codex #58410: deferred tool world state 기본 ON](https://github.com/openai/codex/pull/58410) | 10/30 18:33 병합; 테스트/스냅샷 갱신; 릴리스 포함 별도 확인 필요 | **PoC 최우선** |
| 3 | [Codex #58388: whole-entry Guardian context](https://github.com/openai/codex/pull/58388) | 10/30 16:46 병합; Evidence 필수 항목은 budget 초과 시 거부 | **바로 적용 원칙 / PoC** |
| 4 | [Claude Code v2.1.314](https://github.com/anthropics/claude-code/releases/tag/v2.1.314) | 10/30 01:06 UTC 공식 릴리스; idle compaction, hook 10,000자 제한 | **바로 적용 검증** |
| 5 | [Open SWE #4590: turn critical path 분리](https://github.com/langchain-ai/open-swe/pull/4590) | 10/30 20:19 병합; warm-turn 5회/버전 개발자 측정 | **PoC 최우선** |
| 6 | [OpenCode #60478: schedule leader](https://github.com/anomalyco/opencode/pull/60478) | 10/30 14:22 병합; SQLite 60s lease/20s heartbeat; v2.2.4 태그와 default 차이 존재 | **PoC 최우선** |
| 7 | [OpenCode #60475: 마지막 Step 사용량 누락 복구](https://github.com/anomalyco/opencode/pull/60475) | 실사례 JSON $0.1932 vs 세션 $0.2050 | **바로 적용** |
| 8 | [Codex #58404: usage 없는 응답 추정 수정](https://github.com/openai/codex/pull/58404) | compaction이 늦어지는 누락 경계 수정 | **바로 적용** |
| 9 | [OpenCode #60491: background job 전용 table](https://github.com/anomalyco/opencode/pull/60491) | SQLite migration, 세션 삭제 시 child job 정리; 78 tests | **PoC** |
| 10 | [Codex #58390 / #58406: host-managed child context·policy](https://github.com/openai/codex/pull/58406) | 부모 캡처와 정책 상속 검증, 위반 시 거부 | **PoC** |
| 11 | [Agent Framework #9403: dynamic tools evaluation](https://github.com/microsoft/agent-framework/pull/9403) | 실행 시 Tool Schema 스냅샷 보존 | **바로 적용 원칙** |
| 12 | [OpenCode #60647: 상대적 compaction buffer](https://github.com/anomalyco/opencode/pull/60647) | 20% 등 window 비율, 10/30 18:04 병합 | **PoC** |
| 13 | [Codex #58395: MCP request metadata scoped hook](https://github.com/openai/codex/pull/58395) | transport/config 정확 일치 시만 메타데이터 적용 | **바로 적용 원칙** |
| 14 | [Open SWE #4790: repository instructions 32 KiB 상한](https://github.com/langchain-ai/open-swe/pull/4790) | 신규 dashboard 저장 차단, silent truncate 금지 | **바로 적용 원칙** |
| 15 | [OpenCode #60694: MCP stdio 대형 frame 최적화](https://github.com/anomalyco/opencode/pull/60694) | 15MB frame developer microbenchmark, LLM 토큰과 무관 | **PoC / 운영 개선** |

### 전일 대비 차이

- **전일 #4762**는 서로 다른 thread가 공유하는 불변 Deployment Prefix의 순서였다. **오늘 #4815**는 workspace에서 선별해 버전 관리하는 **추가 공유 계층**, 공개 큐레이터, private-memory 분리까지 확장한다.
- **전일 Open SWE #4575**는 durable outbox의 전송 횟수였다. **오늘 #4590**은 그 outbox를 이용해 **Run Start/End와 Git Evidence를 모델 호출/응답 critical path 밖으로 이동**시키는 운영 아키텍처 변경이다.
- **전일 Codex #58144**는 추가 컨텍스트 byte 계측, **오늘 #58404**는 usage 미제공 response 이후 compaction 추정의 누락을 수선한다.
- **전일 OpenCode #60137/#60140**은 조건부 no-model polling의 구현. **오늘 #60478**은 다중 프로세스 실행자의 leader election, **#60491**은 작업·세션 간 durable recovery ownership으로 이어진다.
- **전일 Codex #58129/#58166**이 child edge·trace completion 보존이었다면, 오늘 #58390/#58406은 **host-managed child가 어떤 환경·권한을 상속해도 안전한가**라는 정책 호환성에 초점을 맞춘다.

## 1. Open SWE #4815 — Workspace-curated memory를 캐시 공유 Prefix에 추가

**왜 필요한가:** 전일 변경 후 Deployment에 속한 모든 Thread는 첫 시스템 접두부를 공유할 수 있었지만, 팀별 규칙과 프로젝트에서 축적된 유용한 교훈은 여전히 휘발적이거나 thread-local이었다. 매번 모두 재검색·재설명하면 입력 비용이 늘고, 반대로 모든 팀의 기억을 즉시 공통 프롬프트에 넣으면 잘못된 정보·비공개 내용을 공유할 위험이 있다.

**확인된 내부 구조:** [PR #4815](https://github.com/langchain-ai/open-swe/pull/4815), [openswe/memories/curator.py](https://github.com/langchain-ai/open-swe/blob/main/openswe/memories/curator.py), [mda/rt/run_prompt.py](https://github.com/langchain-ai/open-swe/blob/main/mda/rt/run_prompt.py), store/migration/tests를 확인했다. 에이전트는 remember(text, scope=personal|workspace), forget(memory_id, scope)로 후보를 저장/철회한다. Workspace 범위는 즉시 전체 배포가 아니라 **큐레이터 승인 대기**. Workspace당 system curator thread가 대기 기억을 매일 처리하며 list_memories, decide_memory, read_workspace_prompt, publish_workspace_prompt만 특정 system run에 허용된다. private thread의 memory는 curator로 넘기지 않으며, 공개 큐레이터가 본 텍스트는 공유 Thread의 자료에 한정한다. 반대 의견은 큐레이터의 채택에 제동을 거는 정책이며 운영 규칙이 아니라 기본값으로만 표현한다.

모델이 받는 순서는 **Deployment 공유 Prefix → Workspace 공유 Prefix(기존 workspace instructions + curated memory) → Skills → Thread 변화 컨텍스트**다. Workspace Prompt Version은 **Thread가 열릴 때 고정**되어 진행 중 Thread의 Cache Prefix가 갑자기 바뀌지 않는다. Anthropic RunPromptMiddleware는 Cache Breakpoint 총 4개 제약 내에서 run/workspace 경계를 설정한다. Curator wake는 [curator.py](https://github.com/langchain-ai/open-swe/blob/main/openswe/memories/curator.py)에 cron 및 idempotent claim이 있는 Durable Run으로 구현된다.

**절감 메커니즘:** 반복적인 workspace 규칙·기억을 별도로 재주입하는 대신 같은 텍스트가 첫 부분에 위치하므로 **cross-thread prefix-cache hit의 가능성**이 생긴다. 하지만 캐시 Write의 과금, prefix 길이 증가, cache TTL, 의미 없는 기억이 입력에 계속 붙는 비용을 함께 봐야 한다. 오늘 PR에는 실제 cache-read rate, verified-task cost, hallucination rate의 사후 수치가 없다. 기능은 **사용자별 Experimental Memory 설정 ON을 요구**, 기본 OFF다.

**장단점:** 팀 지식의 공유/출처/철회/이력은 개선. 반대로 큐레이터의 채택·삭제 판단 오류, 변경된 정책을 이미 열린 Thread가 못 받는 문제, 개인·팀 기억 누출, 저장과 큐레이션 모델 비용이 발생한다. 시스템 규칙/승인/보안 정책은 **기억으로 상속하지 말고 매 호출 현재 Policy Hash를 별도 검증**해야 한다.

**Perforce PoC:** Workspace별 Depot/UE5 모듈 Build 노하우를 후보 memory로 저장하되 CL 번호·Secrets·접근 토큰·민감한 사람 정보는 금지. 제안 메모리는 사람 승인 또는 좁은 자동 기준을 통과해야 Shared Prefix로 올라가며, 특정 CL에 종속된 현재 Revision은 절대 shared section에 넣지 않는다. 30개 유사 Task를 **모든 기억 매번 검색 vs curated workspace prefix**로 비교해 cache_read/write tokens, 실제 USD/verified task, stale-rules error, 근거 있는 기억 사용률을 측정한다. **평가: PoC 최우선.**

## 2. Claude Code v2.1.314 — Cache TTL 연동 idle compaction과 bounded Hook

**공식 릴리스:** [v2.1.314, 2026-10-30 01:06 UTC](https://github.com/anthropics/claude-code/releases/tag/v2.1.314). 10/27 v2.1.312 이후 확인된 신규 정식 릴리스다.

**Context Lifecycle:** VS Code와 Claude Desktop **Code 탭**에서 200K+ Token 대화를 유휴 상태로 두었고 **prompt cache가 만료된 경우**, 다음 입력 전에 요약을 준비/사용하는 idle compaction을 추가했다. 릴리스는 1시간 prompt-cache 지원이 켜진 Bedrock·Vertex·Foundry·LLM Gateway와 Telemetry OFF 경로에도 적용 조건을 명시한다. **Terminal CLI 전 경로에서 똑같이 동작한다고 가정하지 않는다.** 모델 호출로 요약이 생성될 수 있으므로 Compaction 자체 비용과 요약 정확도 보존이 trade-off다.

**Tool Output / Hook:** PreCompact Hook의 매우 큰 출력이 압축 실패·반복을 유발하던 문제를 막기 위해 **각 Hook 출력 10,000문자 상한**. 단위는 **characters**, token이 아니다. 이미지가 많은 Bedrock 세션에서 400 Input too long 연쇄 실패를 Older Image 제거+compaction으로 회복. Prompt Cache의 실제 discount 수치나 새 정책의 실사용 토큰 절감률은 공개되지 않았다.

**Agent Lifecycle:** Headless/SDK에서 다수 Subagent를 동작시킨 뒤 Parent가 자식 Tool 결과를 Turn 끝까지 들고 있던 메모리 부담을 줄였다. 이는 **Host 메모리** 개선이지 Provider 입력 Token 절감 계측은 아니다. 이미 실행됐을 수도 있는 중단된 Cloud Command에 대해 모델에게 그 가능성을 전달하도록 오류를 수정했다. Plugin skill watcher가 trash 디렉터리까지 지속 감시하던 I/O도 제외하고 삭제 항목 1,024개 내외 제한.

**Security / Windows:** permissions.blockWritesOutsideWorkingDirectories 옵션은 Write/Edit/NotebookEdit를 **모든 permission mode**에서 작업 경로로 제한한다. CI에서 신뢰할 수 없는 Workspace는 Trust Prompt 없이 거부. MCP tool_search tool_reference 블록을 받지 않는 Gateway에서는 한 번 Tool Search 없이 재시도하고 세션에 기록한다. Model effort가 조직 상한과 맞지 않을 때 자동 하향 조정·재시도. 이는 과금 절감이라기보다 실패·재시도 회복 정책이다.

**P4 실무:** Windows UE5 Worker에서 10MB~100MB 로그/큰 파일에 의존하는 전후 Compaction을 비교, Summary에 P4 Depot/CL/Base Revision/Build Evidence ID가 남는지 검사한다. PreCompact Hook은 10,000문자 안에 **필수 증거 URI·SHA·실패 상태**를 우선 출력하고 자세한 로그는 외부 저장. CLI와 IDE 기능 차이를 표기. **평가: 바로 적용 검증.**

## 3. Codex #58410 — Deferred Tool World의 기본 활성화

**근거:** [2026-10-30 18:33 UTC 병합 #58410](https://github.com/openai/codex/pull/58410). 도구 노출 테스트, prompt-caching snapshot, tool_search snapshot 등 **58개 파일 변경** 확인.

**기능 차이:** deferred_tool_world_state를 stable/default ON으로 바꾸며, 지연 로딩 가능한 Tool Namespace의 **discovery metadata는 tool_search 설명이 아닌 developer tools 컨텍스트로 이동**한다. 명시적 OFF일 때는 이전처럼 검색 설명에 discovery metadata를 둔다. 동적으로 전 도구 스키마를 보이는 대신 Catalog를 단계별로 공개하는 Progressive Disclosure의 구현 계층 변경이다.

**비용 가설:** Tool Catalog 크기/설명 위치가 바뀌면 모델 입력 Prefix와 Prompt Cache key, 단계별 Tool 검색 호출 횟수가 달라진다. **기본 ON=토큰 절감 실측**이라는 증거는 없으며, Tool 발견 정확도·초기 discovery 비용·첫 호출 지연이 나빠질 수 있다. Codex **main 병합**이지 최신 공개 CLI v0.166.0(10/29 릴리스)에 포함됐다는 증거는 없다.

**Perforce PoC:** Claude Code/Codex의 P4 조회 30, 수정 30, TeamCity/UE5 CI 40, 운영/검증 50 등 150개 mock Tool을 Catalog로 만들고 whole-schema vs deferred-discovery를 비교한다. Tool 선택 recall@1, 누락 Tool 회복, 실제 Prompt Cache Read/Write, Tool Schema bytes, latency를 측정. 권한은 Catalog에 나오는가와 무관하게 서버가 재검증. **평가: PoC 최우선.**

## 4. Codex #58388 — Guardian Context를 '잘린 조각'이 아니라 전체 Evidence Item으로 배치

**근거:** [#58388](https://github.com/openai/codex/pull/58388), [allocation.rs](https://github.com/openai/codex/blob/main/codex-rs/guardian-context/src/allocation.rs), allocation_tests, budget.rs. **10/30 16:46 UTC 병합**.

**문제와 구현:** Reviewer/Guardian 예산에 모든 증거를 연속 축약하면 정책 문맥, 승인 이력, 이미지, 명령 Arguments가 중간에서 잘려 **무엇을 승인했는지 검증할 수 없는 상태**가 발생한다. PreparedElasticContext::enforce_budget는 기존 Context·필수 Evidence·히스토리·누락 공지를 먼저 예약하고, 선택 항목을 그룹별 최소값/우선순위/최근성으로 전체 항목 단위로 넣는다. Section framing token도 예산에 포함하고 사용하지 않은 그룹 쿼터를 재분배한다. 이미 승인된 과거 결정과 이미지 한 장을 중간 잘라 표현하지 않는다. 필수 Evidence가 공간에 들어가지 않으면 **거부**한다.

**비용·품질:** 같은 Window에서 가능한 많은 항목을 온전하게 넣는 품질/안전 설계다. 기계적으로 더 많은 토큰을 줄인다는 주장은 아니며, 큰 단일 Evidence가 예산 밖으로 빠져 검증에 필요한 Context가 줄어들 수 있다. 테스트는 recent whole entry selection, framing, image whole retention, required approval history 보존 등을 포함한다. 성공률과 실제 비용 실측 없음.

**P4 Guardian:** 승인된 changelist, executed command, edit hunk, reviewer finding에는 **atomic evidence entry**를 부여하고 SHA/Source/Time/Author/Command/Exit/CL/Build ID를 묶어 보관한다. 중요 항목을 잘라야 한다면 승인 자체를 중지하고 Evidence Store를 다시 조회한다. 100개 테스트에 여러 개의 50KB 증거를 넣고 허위 승인·기각률, 필수 evidence 손실, budget 초과 처리를 검증. **평가: 바로 적용 원칙 / 구현 PoC.**

## 5. Open SWE #4590 — Agent Run 준비·종료 Ledger를 Critical Path 밖으로 이동

**근거:** [#4590, 10/30 20:19 UTC 병합](https://github.com/langchain-ai/open-swe/pull/4590), mda/rt/{outbox,managed_sandbox,git_evidence,loop,middleware}.py, runtime-api, tests 확인. 전일 #4575 Outbox의 후속 아키텍처.

**구조:** Run 시작마다 중복으로 Plan/서명·Sandbox 연결을 하던 작업을 줄이고, 새 Sandbox는 **부팅 완료를 기다리지 않고 준비**한다. Run Started/Ended, Reply, Tool Call은 Durable Outbox에 넣고 Backend가 수신 확인한 뒤 Model Run은 종료될 수 있다. Git Evidence 정리는 비동기 진행한다. 반대로 File/Shell Tool은 **Sandbox Ready 및 Git Baseline 완료**를 기다린다. 이미 기록된 Report는 재시작 이후 재전달 가능. Reviewer의 계획 기반 Run은 기존 준비 경로를 유지한다.

**업스트림 개발자 Preview 측정:** Warm “say hi” 5회/버전에서 preparation request 중앙값 **1,343→384ms**, open sandbox+prepare **1,293~2,680→475~573ms**, run-end middleware **703~800→53~63ms**, 마지막 Model Call 이후 Busy **1.58~1.66→0.67~0.72s**. Repository-backed thread 각 한 개 비교에서는 warm-turn run-end middleware **173~337→4~7ms**, first-turn post-model busy **2.20→0.86s**. 병렬 Sandbox Startup은 **아직 이 수치에 포함되지 않았고**, 운영 p95 및 전체 Task 비용도 측정되지 않았다.

**제약:** Backend를 MDA보다 먼저 배포해야 새 Report Type을 받을 수 있다. 배포 간 혼합 버전에서는 Thread Model/Usage Row 누락 가능. Proxy 설정 시 Sandbox 부팅에 의존하는 일부 경로는 계속 대기. 응답 뒤 Follow-up이 약 2초 Queued에 머무는 문제는 별개다.

**Perforce 적용:** Task 준비에서 P4 Workspace 선택, Ticket Refresh, Skill Catalog, latest task policy read를 독립 요청으로 분리. **Baseline HaveList 완료 전에는 edit/submit 금지**, 모델은 읽기/계획부터 시작할 수 있다. Run 종료와 Evidence Write/Delivery ACK는 독립 Receipt를 기록하고 retry. Task start latency p50/p95와 first mutation wait, data loss, verified completion latency, 네트워크 요청량을 측정. **평가: PoC 최우선.**

## 6. OpenCode #60478 — 조건부 Schedule의 단일 리더 실행과 릴리스 주의점

**근거:** [#60478 10/30 14:22 UTC 병합](https://github.com/anomalyco/opencode/pull/60478), [packages/core/src/schedule.ts](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/schedule.ts), [v2.2.4 공식 릴리스](https://github.com/anomalyco/opencode/releases/tag/v2.2.4). **코드와 릴리스 설명의 차이를 추가 검증했다.**

**내부:** opencode serve/standalone/ACP가 같은 SQLite Database를 사용해 Schedule Tick을 중복 시작할 수 있던 문제에 **schedule:leader KV lease**를 도입. Lease 유효 60초, 긴 Tick 동안 20초 간격 갱신; 각 Row 실행 전 Leader 확인. 서로 다른 Process라도 한 DB에서 한 실행자만 due row 처리. 새 테스트 3개 파일 **48 pass**(PR 작성자 결과).

**매우 중요한 Release 상태 구별:** PR 본문/Dev 코드에서는 experimental.schedules가 **설정 없으면 ON**으로 바뀌었다고 설명한다. 그러나 **10/30 16:59 UTC 공개된 v2.2.4 공식 릴리스 노트는 “schedules remain opt-in”이라고 쓰며, 실제 v2.2.4 태그의 schedule.ts 222행은 여전히 schedules === true를 사용**한다. 따라서 10/31 Scout는 **main/dev에서 기본 ON 병합, v2.2.4 배포 바이너리에는 명시 활성화가 필요한 상태**로 판정한다. 버전만 보고 기본 ON이라고 단정하지 않는다. 이는 소스/태그를 함께 조회해야 드러나는 신규 확인 사항이다.

**모델 비용:** 이미 전일 조사한 no-model if/until 조건부 Tick 방식과 결합하면 빈 Poll마다 모델 호출 자체를 줄일 수 있다. 오늘은 멀티프로세스 중복 Wake를 막는 **실행 안정화**이지 실제 LLM 비용 절감률 검증이 아니다. SQLite 다중 프로세스 lease가 물리적으로 다른 분산 저장소까지 보장하는 것도 아니다.

**P4 PoC:** TeamCity Build ID별 Poll Coordinator를 한곳에서 선점하고 cursor+last_event_id+lease_generation을 영속 저장. 2개의 Worker가 동일 due build를 1,000번 경쟁하도록 테스트, duplicate wake=0, missed build completion=0, lease failover 보장, error 발생 시 permission recheck. **평가: PoC 최우선.**

## 7. OpenCode #60475와 Codex #58404 — 비용/Context Metering의 빈 구간 보존

### 7-A. OpenCode CLI 마지막 Step의 사용량 누락

[OpenCode #60475, 10/30 05:32 UTC 병합](https://github.com/anomalyco/opencode/pull/60475). JSON 모드의 opencode run은 Wait가 끝나면 finalizing으로 전환해 일부 늦은 step_finish SSE 이벤트를 무시했다. Text/Reasoning/Tool Part는 Projection에서 재구성했지만 **마지막 Step의 cost/tokens/finish 이벤트**는 보충하지 않았다. 작성자의 실제 사례: JSON Stream 합계 **$0.1932**, 저장 Session 기록 **$0.2050**, 차이 **$0.0118**. 약 143k cache-read tokens와 마지막 Step output tokens 등이 누락되었다. 변경은 Step별 seen_start/seen_finish를 기록하고 Projected History Reconcile에서 없는 경계만 1회 emit해 중복 보고도 막는다. 단위 테스트에 late finish와 normal finish를 포함.

**실무:** CLI stdout이 CI 예산 통제의 근거가 되면 잘못된 “절감”으로 오판할 수 있다. Provider Usage, Stream Receipt, Persisted Session Cost의 합을 매 Run 종료 시 정합성 검사하고 **reconciled=true/false**를 기록한다. **평가: 바로 적용.**

### 7-B. Codex 사용량 미제공 응답 이후 Context Count 복구

[Codex #58404, 10/30 18:12 UTC 병합](https://github.com/openai/codex/pull/58404). 마지막으로 정상 Usage가 제공된 History Boundary를 기억하고, 그 뒤에 추가된 모든 항목을 추정한다. **Spending-only update**는 경계를 옮기지 않으며, 정상 Report는 output이 없는 경우에도 Request Input 부분까지 커버한다. 미보고 Reasoning을 다시 중복 계상하지 않는다. 실패·미완료 응답의 Reasoning이 커진 경우에도 Compaction이 적시에 발생하도록 회귀 테스트.

**적용:** Accounted History Boundary, estimated_after_boundary, provider_report_valid, reasoning_included를 Cost Receipt에 저장. Compaction은 429, 인증 실패, Context Overflow, 모델 거부를 별개 오류로 분류해야 한다. **평가: 바로 적용.**

## 8. Codex #58390 / #58406 — Host-managed Child Context와 상속 정책 강제

**원본:** [#58390 10/30 17:08](https://github.com/openai/codex/pull/58390), [#58406 18:21](https://github.com/openai/codex/pull/58406).

PreparedChildContext가 부모 Live Tool Invocation의 Instructions/Environment/Permissions/Approval/Disabled Plugins/Dynamic Tools/Execution Policy Snapshot을 캡처한다. Host는 Child Name, Role, History, Destination Service를 정해 구동한다. 기존 PreparedThreadSpawn 경로를 대체하고 Spawn 취소·정리를 Invocation에 귀속한다. **Cold Resume 때 Host가 Inherited 설정을 다시 제공해야 한다.**

Policy 상속은 대상이 로컬 User/Project Rule을 무시하는 독립 관리자일 것, 별도 추가 Policy File이 없을 것, Managed Requirements가 호환될 것이라는 조건을 둔다. 부모보다 약한 상속이나 isolated session 혼합, local/transported policy 동시 사용은 거부한다. Managed command/network deny가 절대 경로 규칙으로 우회되지 않도록 테스트한다.

**절감 가설:** Child가 부모 정보를 다시 탐색·설명할 필요를 줄이는 데 도움이 될 수 있지만 입력 Prefix 재사용과 별도 Executor의 추론 품질은 미계측. **보안 불변식이 더 중요**하다.

**P4:** Researcher Child는 P4 read-only+Scoped Depot, Editor Child는 별도 writable Workspace, Guardian Child는 Source/Evidence read-only. Parent Snapshot은 참고용이고 Current Authorization을 child start/side-effect 전에 다시 검사. 충돌하는 Harness 구성은 실행 거부. **평가: PoC.**

## 9. Codex #58395/#58378/#58368 — MCP Metadata와 PreToolUse 승인 순서

[Codex #58378](https://github.com/openai/codex/pull/58378)는 Root Turn ID 등 Host Metadata를 **Host가 선택한 정확한 Plugin Registration**에만 노출한다. Plugin ID, Installed Root, Server Name, Transport Config가 모두 일치해야 하고 이름만 같은 사용자 Override에는 전송하지 않는다.

[#58395](https://github.com/openai/codex/pull/58395)는 McpToolRequestMetaHook/Provider에서 Thread/Turn/Call ID별 메타데이터를 Tool Dispatch 직전에 생성하며, 등록 정보가 정확히 일치할 때만 적용하고 **기존 _meta Key Collision이나 Provider Error는 Dispatch 전에 실패**시킨다. Tool Schema 선택 노출과 실행시 메타데이터 공개를 별개로 만든 구조다.

[#58368](https://github.com/openai/codex/pull/58368)는 Guardian 직접 검증에서 PreToolUse Hook을 먼저 적용한 뒤 **재작성된 Command Arguments에 대해** 권한/승인을 평가한다. Hook Deny는 정책에서 Allow여도 실행할 수 없다. 수정되기 전 Command를 승인했는데 다른 Command가 실행되는 mismatch를 차단한다.

**P4:** Tool Visibility, Metadata Inject, Hook Rewrite, ACL/Approval, Actual p4 CLI Execution 단계별 독립 Audit. p4 submit 명령 인자 변경 시 이전 승인 무효. GitHub Plugin/Gateway와 실제 P4 Server가 같은 이름의 Tool을 제공해도 Cross-scope Metadata 누출 0. **평가: 바로 적용 원칙.**

## 10. OpenCode #60647 — Model Window 비율 기반 Compaction Reserve

[OpenCode #60647, 10/30 18:04 UTC 병합](https://github.com/anomalyco/opencode/pull/60647), [compaction.ts](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/session/compaction.ts). compaction.buffer에 숫자 Token 외에 **"20%" 또는 "12.5%"** 문자열을 허용. 20%이면 Context Window의 80% 사용 시 압축을 준비한다. 0%, 100% 이상, 음수, 퍼센트 기호 없는 문자열은 오류. 기존 숫자 설정 유지. 기본 설정은 **Window의 15% 및 최소 16k Token Reserve**로 유지한다.

**차별성:** 128k 창에서 30k Token 여유는 약 23%, 1M 창에서 약 3%에 불과하다. 상대 비율은 서로 다른 Coding Model/Reviewer Model에 일관된 정책을 적용하기 쉽다. 그러나 모델마다 Reasoning/Tool Output/Input Limit이 다르므로 단순 Percentage가 최적은 아니다. 조기 압축은 Summarization 호출과 Evidence 누락 비용을 늘릴 수 있고, 늦은 압축은 Overflow/Retry 비용을 늘린다.

**P4 검증:** 모델 창 128k/200k/1M에서 buffer=고정 30k, 15%, 20%, 25% 교차 시험. Compaction 횟수, overflow retry, cache write, cost/task, bug localization recall, CL/Revision 보존률을 측정. **평가: PoC.**

## 11. OpenCode #60491 — Type-safe Durable Background Job Ledger

[OpenCode #60491, 10/30 14:50 UTC 병합](https://github.com/anomalyco/opencode/pull/60491), packages/core/src/job.ts, job/sql.ts, migration 20261030054400_job, restart.ts. 이전에는 KV의 job.background/* JSON Marker를 Prefix Scan해야 했고, 세션 삭제 후 자식 Job/Marker가 남을 수 있었다.

이제 indexed SQLite **job** Table에 notification_id, session_id, child_session_id, kind, status, recovery 등을 명시해 마이그레이션하고, Session.remove가 Live Job을 취소한 후 Row를 정리한다. Shell/Image/Generic Tool 복구는 recoverToolJob로 통합하고 Subagent 별도 복구를 유지한다. 이전 KV Marker는 마이그레이션 시 옮긴다. 작성자 관련 **78 tests** 통과. 이전 바이너리로 되돌렸을 때 새 job Table을 모른다는 배포/롤백 주의점이 있다.

**토큰/운영:** Ledger 스캔 및 Orphan Worker 감소는 직접 Token 절감 근거가 아니다. 하지만 중복 Side Effect, 성공 확인을 못해 전체 Task를 재실행하는 비용을 막는 데 중요하다. **Perforce:** child Job 소유권을 task_id/session_id/attempt_id/CL에 연결하고 Session Delete/Kill/Restart 시 실제 P4 Opened/Pending CL부터 조회해 중복 Submit을 막는다. **평가: PoC.**

## 12. Open SWE #4790 / #4637 / #4816 — 지침 경량화·격리 리뷰·채널 Worker 귀속

**Repository Instruction Size Gate:** [#4790, 10/29 21:27 UTC 병합](https://github.com/langchain-ai/open-swe/pull/4790). Dashboard에서 새로 저장하는 Repo Custom Instructions는 UTF-8 **32 KiB** 이상 차단, Silent Truncation은 하지 않는다. 기존 저장 지침, 기존 Thread, AGENTS.md에는 소급 적용하지 않는다. Prompt/Skill 파일 크기 제한은 직접 모델 토큰 절감이 아니라 입력 오염 방지이며, **큰 AGENTS.md에는 같은 제한이 적용되지 않는다**. P4 Harness에서도 instruction-size lint와 override exception을 구분하고 4K/16K/32K 계층별 영향 측정. **평가: 바로 적용 원칙.**

**Supplementary Reviewer Isolation:** [#4637, 10/30 17:21](https://github.com/langchain-ai/open-swe/pull/4637). .open-swe/settings.json의 path/exclude/criteria/team과 매칭되는 PR에 대해 Security/Design 보충 검토를 **독립 Thread**에서 수행. 이는 Main Engineering Review를 덮어쓰지 않으며, 보충 검토의 승인 자체가 Merge 승인으로 간주되지는 않는다. 새 Commit 이후 자동 재검토는 수행하지 않는 한계. P4에서는 UE5 Gameplay/System/Network 경로에 따라 Reviewer Context를 분리하고 Evidence/Hunk Anchors만 공유. **평가: PoC.**

**Channel Worker Ownership:** [#4796, 10/30 05:15](https://github.com/langchain-ai/open-swe/pull/4796)의 MDA GitHub/Linear/Slack Channel 대규모 통합(193 MDA tests) 뒤, [#4816, 16:32](https://github.com/langchain-ai/open-swe/pull/4816)이 Channel Conversation에서 생성한 Async Helper Thread를 Backend가 중복 생성하려던 문제를 수정. PR은 당일 운영에서 **3건의 adopt failed 500**을 기록한다. 대화가 소유한 Channel ID를 Child가 상속해 Runtime이 중복 Create하지 않게 했다. 이는 token 최적화 아닌 **Runtime Adapter의 ownership 계약/복구** 사례. **평가: 바로 적용 원칙 / PoC.**

## 13. OpenCode #60694 / #60692 / #59954 — Context/Tool Error Recovery의 운영 경계

**MCP 대형 출력 Frame:** [#60694 10/30 21:00 UTC 병합](https://github.com/anomalyco/opencode/pull/60694). MCP stdio의 SDK 기본 ReadBuffer 제한 10MiB가 자체 16MiB 상한보다 먼저 동작해 대형 Tool Response를 Disconnect했다. 전체 Buffer를 Chunk마다 붙이던 경로를 newline 기반 chunk-list framer로 변경. **15MB frame 로컬 테스트**에서 64KB chunk는 약 **150→7ms**, 8KB chunk는 **620→4ms**(작성자가 SDK limit을 올려 비교한 값). 16MiB 초과 시 명시적 오류로 종료, malformed JSON-RPC는 에러를 보고하되 이후 Frame 계속. 네트워크/CPU 벤치이지 Input Token 절감률은 아니다. **평가: 운영 PoC.**

**Overflow 분류:** [#60692 10/30 20:40](https://github.com/anomalyco/opencode/pull/60692)은 LiteLLM의 ContextWindowExceededError/“Context Window exceeded”를 Overflow로 인식해 Compaction 경로로 이동시킨다. 42 Provider tests, 243 Session Runner tests(작성자 결과). Xiaomi MiMo의 1M+ 토큰 Prompt 시험에서 HTTP 200이지만 길이 종료/0 출력이 돌아오는 Edge Case를 기록했다. **413 일반 처리와 다른 Provider의 모든 오류는 해결됐다고 주장하지 않는다**. **평가: 바로 적용 원칙.**

**Code Mode 권한:** [#59954 10/30 06:16](https://github.com/anomalyco/opencode/pull/59954)은 Code Mode fetch(url)가 WebFetch Tool의 권한 검사를 우회하던 문제에 Execute의 Session/Agent/Message/Call ID와 Permission Provider를 주입해, 요청 전에 동일 webfetch permission.assert를 호출한다. **단, Redirect 각 Hop을 재검사하는 것은 PR 범위 밖**이다. 모델에게 Tool Schema를 숨겼다는 사실이 Fetch 권한 제한을 뜻하지 않는다. **평가: 바로 적용 원칙, Redirect 후속 개선 필요.**

## 14. Microsoft Agent Framework #9403 / #9825 / #9828 / #9812 — 증거 평가·Checkpoint 보안

**Dynamic Tool Evaluation Evidence:** [#9403 10/30 16:03](https://github.com/microsoft/agent-framework/pull/9403). Context Provider가 Run 중 주입한 Tool 정의를 평가기가 놓쳐 Tool Selection/Input Accuracy가 null score가 되던 오류를 수정. **실행 시점 Tool Schema의 Schema-only Snapshot**을 AgentResponse에 보존하고 JSON/Pickle, Stream Reconstruction, Approval Continuation과 Loop까지 전달한다. 실행 가능한 Callback이나 Connection을 그대로 저장하지 않는다. Custom Schema가 직렬화 불가능하면 이전보다 이르게 예외가 생길 수 있다. **P4:** Tool Discovery/Use 당시 스키마 버전·권한·결과 Anchor를 Evidence Receipt에 저장해 Offline Evaluation도 동일 기준으로 수행. **평가: 바로 적용 원칙.**

**Checkpoint Metaclass:** [#9825 10/30 08:42](https://github.com/microsoft/agent-framework/pull/9825). _RestrictedUnpickler allowlist에 builtins:type이 포함되면 REDUCE 경로를 통한 새 Class 생성이 가능했던 문제를 해결. Explicit Allowlist나 module prefix alias를 통해 Metaclass가 반환되지 않도록 전역 차단; FileCheckpointStorage 변조 회귀 테스트 포함. **Checkpoint = 신뢰할 수 있는 파일**이 아니라는 점이 핵심. **평가: 바로 적용 원칙.**

**MCP Approval Default:** [#9828 10/30 08:42](https://github.com/microsoft/agent-framework/pull/9828). Local MCP Specific Approval에 명시 default=always_require|never_require를 추가. 우선순위는 tool별 always → never → default → 기존 fallback(no approval). 향후 Discovery한 Tool에도 기본 정책 적용. 별도 설정 없으면 기존 기본 허용이므로 **Enterprise에서는 반드시 명시적 default=always_require**를 검토. **평가: 바로 적용 원칙.**

**Evidence Citation Offset:** [.NET #9812 10/30 02:26](https://github.com/microsoft/agent-framework/pull/9812)은 여러 완성 Text Part를 합칠 때 앞선 Part 길이를 Citation Span에 반영. 같은 URL의 중복 인용이라도 독립 위치를 없애지 않고 Streaming Update의 좌표계는 유지. 작성자 Windows .NET 10 테스트 **572 pass, 1 skip**. P4 로그/코드 excerpt를 Reviewer Output으로 합칠 때 **Anchor Offset의 원본/합본 변환**을 단위 테스트해야 한다. **평가: 바로 적용 원칙.**

## 15. 추가 관찰 및 공식 배포 상태

- **OpenCode Claude Agent Provider**: [#58782 10/30 06:48 병합](https://github.com/anomalyco/opencode/pull/58782), [v2.2.3 10/30 09:55 릴리스](https://github.com/anomalyco/opencode/releases/tag/v2.2.3)는 Claude Agent SDK/Claude Code 로그인으로 Claude 모델을 OpenCode Provider에서 사용하게 한다. 모델 호출 단가가 낮아진다는 보장은 없고, Agent Runtime/Permission/Cost Reporting이 동등한지 계약 테스트가 필요하다. **평가: Runtime Adapter PoC.**
- **OpenCode Artifact Provider**: [#60351](https://github.com/anomalyco/opencode/pull/60351), [v2.2.4 10/30 16:59 릴리스](https://github.com/anomalyco/opencode/releases/tag/v2.2.4)는 experimental.artifacts ON일 때 HTML/static Artifact CRUD, local Provider, Plugin Provider를 제공한다. 별도 Evidence Viewer나 Handoff Report에 활용 가능하지만 Source Artifact Hash/ACL/Storage Retention을 별도로 강제. **평가: 아이디어 참고/PoC.**
- **Codex #58405**: [model 변경 안내 제한](https://github.com/openai/codex/pull/58405)은 default OFF인 suppress_model_change_announcements가 ON일 때 모델 ID 안내만 생략하고 **새 Base Instructions/Tool Definitions는 계속 전달**한다. Model Snapshot은 변경 없이 갱신. 이 정책의 Token 절감률은 확인되지 않았다. **평가: 아이디어 참고.**
- **Deep Agents #7413/#7414/#7415**: [Summarization](https://github.com/langchain-ai/deepagents/pull/7413), [Pinned Skill](https://github.com/langchain-ai/deepagents/pull/7414), [Rubric Revision](https://github.com/langchain-ai/deepagents/pull/7415) 메시지의 source metadata를 공통 Helper로 표준화. 본문을 바꾸지 않고 Summarization/Skill/Grader 출처를 태깅하므로 **Handoff Provenance**에 적용 가능하지만 비용 절감 신규 성과는 아니다. **평가: 바로 적용 원칙.**
- **공식 릴리스 경계:** [Codex v0.166.0](https://github.com/openai/codex/releases/tag/rust-v0.166.0)은 **10/29 19:47 UTC**로 오늘 조사한 10/30 main 병합을 포함했다고 단정할 수 없다. [Claude Code v2.1.314](https://github.com/anthropics/claude-code/releases/tag/v2.1.314)는 실제 공개 릴리스. Agent Framework [.NET 1.27.0](https://github.com/microsoft/agent-framework/releases/tag/dotnet-1.27.0)에는 durable response state 경로 변경과 마이그레이션 없는 저장 형식 변화 안내가 있어 Enterprise의 롤백·데이터 이전을 별도로 검증해야 한다.
- **신규 RAG/Selective Context 성과의 부재:** 오늘은 #4815의 memory curation, #58410의 tool discovery, #9403의 tool-evaluation schema 등 **선택적 노출과 증거 추적**에 관한 구현이 명확하다. 독립 RAG retrieval recall/quality/token-saving benchmark는 추가로 확인되지 않았다. 전일 #4697 BM25, #4762 Prefix 실험 수치를 신규 성과로 재사용하지 않는다.

## 16. Perforce·TeamCity·UE5 Harness: 제안 실행 아키텍처

아래는 위 소스와 실측을 바탕으로 한 **제안 아키텍처**이며 특정 프로젝트에 이미 구현됐다고 주장하지 않는다.

    Event / P4 CL / TeamCity Build / User Task
             |
             v
    Task Ledger & Idempotency Key
        task / attempt / child / workspace / base CL / policy hash
             |
         Read-only Preparation / Sandbox startup / Baseline
             | (독립 작업은 병렬)
             v
    Shared Prefix (deployment + workspace curated memory)
             |
    Phase tool search → selective tool schemas / skill catalog
             |
       Runtime Adapter (Claude Code / Codex / OpenCode)
            |                  |
        Researcher            Editor (independent P4CLIENT)
            |                  |
     Evidence Anchors     Approval + PreToolUse + current ACL
            |                  |
            +----> Guardian Reviewer (whole-entry evidence)
                           |
             Verified P4 CL / TeamCity Receipt
                           |
             Durable Outbox / Cost Ledger / Handoff
                           |
                  Published / Failed / Unknown

### 필수 상태 모델과 경계

| 컴포넌트 | 최소 Durable State | 재시작/권한/검증 불변조건 |
|---|---|---|
| Task Manager | task_id, attempt_id, lifecycle, deadline, retry_class | 완료/전달/trace 종료 독립 |
| Runtime Adapter | worker_id, provider, model, model_effort, session_id, role, scope | Resume 전 최신 permission 확인 |
| P4 Workspace | P4PORT, P4CLIENT, depot_scope, base_cl, pending_cl, have_digest | Edit 전에 Baseline Barrier, Submit 전에 CL Reconcile |
| Prompt Registry | deployment_hash, workspace_prompt_version, skill_version, prefix_hash | Volatile CL/Secrets는 shared prefix에 절대 미포함 |
| Tool Catalog | tool_set_digest, registration_id, transport_config_hash, grant_hash | Tool Discovery 공개 ≠ 권한 허용 |
| Evidence Store | origin URI, raw hash, line/hunk offsets, tool args, exit/status, build ID | Summary/Compaction 뒤에도 원본 조회 가능 |
| Approval Ledger | before_hook/after_hook command digest, actor, decision, policy_hash | Argument 수정 시 기존 승인 재사용 금지 |
| Cost Receipt | provider_usage, cache_read/write, input/output, reasoning, estimated_delta, reconciled | 실제 Provider Bill과 Stream/Storage 대조 |
| Outbox/Delivery | event_id, task_id, checksum, ack, recipient/surface | 중복 전송 방지, 원격 상태 조회 후 재시도 |
| Child Lifecycle | parent_id, child_id, owner/channel, role, effective_policy | Child 관계 선기록, orphan cleanup |

### PoC A — Prefix Cache × Tool Catalog × Memory Curation

**실행:** Mock P4 Tool 150개, Claude Code/Codex 두 Runtime, 30개의 동등 Task를 세 조건으로 수행. A=전체 Tool Schema+매 Thread 중복 Instructions, B=불변 Deployment Prefix+deferred Tool Search, C=B+Workspace Curated Memory. Cold/Warm, 5분/1시간 Cache TTL, Worker 1/4/8개에서 재실행. Workspace Version을 변경한 뒤 Existing Thread가 Cache Prefix를 유지하는지, 새 Thread가 최신 Memory를 받는지 검사.

**계측:** exact provider request bytes, input/output/reasoning, cache_creation/cache_read tokens, provider bill, tool recall@1, search miss, verified fix success, first tool latency, stale memo rate, policy bypass=0. 성공 가설은 verified-task 실청구 비용 -10% 이상, 성공률 하락 2%p 이하이나 이는 **목표치**이지 upstream 실측 결과가 아니다.

### PoC B — Compaction/Reviewer Evidence Integrity

**실행:** 동일 UE5 Bug Localization과 CL Review를 Model Window 128k/200k/1M, buffer 15%/20%/fixed 30k, Compaction 전/후, large build log(1/10/100MB)로 수행. Reviewer Evidence는 Atomic Item(+Original URI/Hash), Text Summary, Truncated Snippet을 교차 비교.

**통과:** 발생한 모든 Runtime Side Effect의 Original Evidence Hash 100%, 승인된 Command Digest 일치 100%, Build Failure 원인 검출률 저하 없음, 출처 불명의 요약 0, 필수 Evidence를 잘라 승인한 사례 0, Context Overflow나 불필요한 재요약률 감소. Prompt-cache 만료 후 idle compaction의 사전 요약 비용까지 포함한다.

### PoC C — Durable Scheduler + Task Lifecycle + Cost Ledger

**실행:** TeamCity Build 30개를 15/30초 간격 Polling으로 감시, 두 프로세스가 같은 SQLite Ledger를 공유해 Schedule Lease 경합, Worker Kill/Restart 100회, Pending CL Submit Mock 충돌 100회. 조건이 false일 때 모델 호출 0, Trigger 1회, Remote Reconcile 후 재시도, 승인 누락 0을 검증. 실제 필요 시 P4 Server를 별도 주체로 통제한다.

**Cost Receipt 검증:** Streaming SSE 일부 마지막 Step을 늦게 전달하고, Provider usage 없는 incomplete response를 주입한다. Session Store와 Stream Cost의 불일치를 반드시 Alert. Reasoning 중복 계상 없음, zero-output response도 Context에 계상, max cost limit 초과 시 안전 중단. **기능별 비용과 전체 verified-task USD를 함께 저장**.

### PoC D — Windows / Enterprise Runtime & Security

**실행:** Win11, P4 CLI, 사내 Claude Code/Codex 실행 조건에서 isolated read-only Reviewer, writable Editor, CI Viewer를 분리. Workspace 바깥 쓰기, symlink, Hook Args Rewrite, MCP 동일 이름 재등록, Redirect URL, 메타데이터 Key Collision, Restored Checkpoint 변조, Approval Default 테스트. Claude Code 2.1.314의 실제 IDE/CLI 적용 범위를 각각 확인한다.

**합격:** 승인 누락 0, 외부 Write/Submit 0, Workspace/사용자 간 Memory 누출 0, Unsafe Checkpoint 로드 0, Child Orphan 0, Evidence Receipt/Cost Receipt 누락 0. 모델별 규칙이 아니라 Harness Executor와 P4 Protections에 최종 권한을 둔다.

## 17. 조사 한계 및 다음 검증 포인트

1. 각 PR은 병합 사실, Changed Files 및 대표 소스·테스트를 직접 확인했다. 벤치 수치(1,343→384ms, MCP framing 150→7ms, JSON billing $0.1932 vs $0.2050 등)는 **업스트림 작성자의 로컬/운영 관찰**이지 동일 하드웨어·P4·유료 API에서 조사자가 독립 재현한 값이 아니다.
2. Codex의 10/30 main 병합은 **v0.166.0 릴리스 포함과 동일하지 않다**. OpenCode #60478의 기본 ON 설정은 **PR/main 코드와 v2.2.4 태그가 실제로 다름**을 확인했다. 설치 버전별 검증 전 운영 정책을 고정하지 않는다.
3. Open SWE Workspace Memory는 **기본 실험 OFF**, OpenCode Artifacts는 **실험 OFF**, Codex Model Announcement Suppression도 **기본 OFF**다. 기능 존재와 배포 기본 상태를 혼동하지 않는다.
4. 새로운 확정 LLM 토큰 또는 실제 청구액 절감률은 오늘 찾지 못했다. 추론/비용/품질 상충을 설명하되 근거 없는 “20~50% 절감” 전망은 작성하지 않는다.
5. 다음 후속 확인은 Open SWE #4815 **workspace memory cache hit/payoff 및 사용자별 권한 격리**, Open SWE #4590 **parallel sandbox startup 실제 운영 p95**, Codex #58410 **catalog tool-discovery 정확도/Prompt Prefix**, OpenCode scheduler **v2.2.4 태그 이후의 기본 설정 정합화**, Claude 2.1.314 **idle-compaction 사전/사후 verified-task 비용**이다.

## 결론

**최우선 PoC:** Workspace-curated Cached Prefix(#4815) + Deferred Tool World(#58410) + Whole-entry Guardian Evidence(#58388) + Durable Run Critical-Path 분리(#4590).

**바로 적용 원칙:** 비용/Context 누락 없는 영수증(#60475/#58404), P4 Approval에서 Hook Args를 먼저 확정(#58368), Child Policy 상속 검증(#58406), Repository Instruction Size Gate(#4790), Checkpoint Metaclass 차단(#9825), Reviewer Tool Schema/Evidence Snapshot(#9403).

**오늘의 판정:** Verified Token/Provider Bill 신규 절감률 **확인되지 않음**. 그러나 장기 Coding Agent Harness의 Context 품질, Durable Lifecycle, Cache 구조, 비용 계측 정확성을 개선하는 **실제 병합 변경과 정량 지연·계측 사례는 유의미**하다. 실무에서는 성공한 Task당 총 청구액과 Evidence 재현성을 최종 지표로 사용한다.

## 참고 자료

- [2026-10-30 Scout 기준선](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-30.md)
- [Open SWE #4815 Workspace Memory](https://github.com/langchain-ai/open-swe/pull/4815), [#4590 Critical Path](https://github.com/langchain-ai/open-swe/pull/4590), [#4790 Instruction Cap](https://github.com/langchain-ai/open-swe/pull/4790), [#4637 Supplementary Review](https://github.com/langchain-ai/open-swe/pull/4637), [#4816 Child Ownership](https://github.com/langchain-ai/open-swe/pull/4816)
- [Codex #58410 Deferred Tool World](https://github.com/openai/codex/pull/58410), [#58388 Guardian Allocation](https://github.com/openai/codex/pull/58388), [#58390 Child Context](https://github.com/openai/codex/pull/58390), [#58406 Inherited Policies](https://github.com/openai/codex/pull/58406), [#58368 Hook Order](https://github.com/openai/codex/pull/58368), [#58404 Usage Boundary](https://github.com/openai/codex/pull/58404)
- [Claude Code v2.1.314 릴리스](https://github.com/anthropics/claude-code/releases/tag/v2.1.314)
- [OpenCode #60478 Scheduler](https://github.com/anomalyco/opencode/pull/60478), [#60491 Job Ledger](https://github.com/anomalyco/opencode/pull/60491), [#60475 CLI Usage](https://github.com/anomalyco/opencode/pull/60475), [#60647 Compaction Buffer](https://github.com/anomalyco/opencode/pull/60647), [#60694 MCP Framing](https://github.com/anomalyco/opencode/pull/60694), [v2.2.4 Release](https://github.com/anomalyco/opencode/releases/tag/v2.2.4)
- [Microsoft Agent Framework #9403 Evaluation](https://github.com/microsoft/agent-framework/pull/9403), [#9825 Checkpoint Security](https://github.com/microsoft/agent-framework/pull/9825), [#9828 Approval Default](https://github.com/microsoft/agent-framework/pull/9828), [#9812 Citation Offsets](https://github.com/microsoft/agent-framework/pull/9812)
