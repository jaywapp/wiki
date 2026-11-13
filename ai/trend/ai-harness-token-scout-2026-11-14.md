---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-14"
category: trend
updated: 2026-11-14
tags: [ai-harness, coding-agent, context-engineering, token-optimization, orchestration, skills, hooks, compaction, subagents, durable-state, evidence-verification, perforce, claude-code, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-11-14

> 조사 기준: 2026-11-14 06:00 KST 전후. 2026-11-13 UTC에 병합된 GitHub PR을 중심으로 조사. 2026-11-13 Scout 원문(26,387자)을 develop에서 조회하고 해당 항목과 중복을 배제했다. 아래 PR의 설명은 원저자/업스트림 주장이고 별도 로컬 벤치마크는 수행하지 않았다. GitHub PR 검색 결과와 본문을 확인했으며 모든 변경 파일의 diff/CI 결과를 독립 검증한 것은 아니다.

## 0. 오늘의 판정

**의미 있는 신규 구현이 있다.** 이번 핵심은 (1) MCP Status 조회의 실제 지연 기동, (2) Guardian Evidence의 탄력 예산 및 메타데이터 비용 예약, (3) Injection History의 항목별 보존 정책, (4) 세션별 모델 노출 ID 영속성, (5) 시간/역할별 선택적 History 조회, (6) 비동기 Subagent 결과 스트리밍, (7) MCP 응답 크기 제한이다. 직접 측정된 동일 품질 작업당 Provider 청구액 절감률은 **없다**.

11/13의 Strands Offload #5325, Scoped Injection #5977, MCP Skills #10275, Subagent Checkpoint #7580, Approval #10291, Child Recovery #63415를 재소개하지 않는다. 오늘의 Codex #61344는 새로운 **주입 History의 항목별 retention**이며 전날의 scoped injection과 다른 구현이다. #61345~47은 기존 Guardian Evidence Budget의 **비동기 경로/오버헤드 계산 개선**이므로 변경된 부분만 다룬다.

## 1. 신규 구현 조사

### 1.1 Codex #61365 — MCP Status 요청 페이지에 한정한 Discovery
- 원본: https://github.com/openai/codex/pull/61365
- **신규성/동작:** 페이지네이션된 MCP 서버 상태 요청에서 기존에는 전체 설정 서버를 먼저 discovery한 뒤 페이지를 잘랐으나, 이제 요청된 페이지 범위만 discovery한다.
- **절감 원리:** 미표시 서버의 연결/상태 조회, 초기화 지연, 네트워크·CPU 사용을 줄인다. **LLM 토큰 절감과 직접 동치가 아니다.**
- **Trade-off:** 전체 Catalog가 이미 초기화되어 있다는 가정에 의존하는 UI/관측 코드는 조정이 필요하다. 페이지 이동 시 새로운 discovery 비용이 발생할 수 있다.
- **P4 적용:** MCP 150개 서버/Tool을 대상으로 첫 페이지·마지막 페이지 조회의 연결 수, latency, 실제 tool schema input tokens를 분리 측정. 20회 cold/warm 반복, 미요청 서버 접속 0건 목표.
- **평가:** 바로 적용 원칙 / 구현 PoC.

### 1.2 Codex #61345/#61346/#61347 — 비동기 Guardian Elastic Evidence Budget
- 원본: https://github.com/openai/codex/pull/61345 , https://github.com/openai/codex/pull/61346 , https://github.com/openai/codex/pull/61347
- **신규성/동작:** 비동기 Guardian 요청에 opt-in `async_elastic_budgeting`, `async_elastic_sections` 추가(기본 비활성). Classifier Evidence에 엔트리 상한을 적용하고, Evidence 선택 이후 붙는 Item ID의 토큰 비용을 예산 할당 전에 예약한다.
- **절감 원리:** Evidence를 무조건 자르는 것이 아니라 필수 레코드와 ID 메타데이터를 보존하며 실제 입력 한도를 준수한다. 한도 초과 재시도 및 과도한 Context 전송 가능성을 낮춘다.
- **Trade-off:** 예산이 작으면 Reviewer가 필요한 증거를 보지 못할 수 있다. 설정이 opt-in이므로 기본 활성화로 오해하지 말 것. 확인된 청구액 절감률 없음.
- **P4 적용:** 50개 Changelist 리뷰에 대해 고정/탄력 예산을 A/B, 증거 누락률 0, 입력 상한 위반 0, 검토 정확도 저하 0을 필수 게이트로 사용. 원본 Evidence Hash는 Ledger에 별도 보존.
- **평가:** PoC 최우선.

### 1.3 Codex #61344 — 주입된 History 항목별 Retention
- 원본: https://github.com/openai/codex/pull/61344
- **신규성/동작:** `thread/inject_items`에 raw item과 함께 `retention: "default" | "always"`로 감싼 항목을 허용하고 명시적 보존 정책을 영속화한다.
- **절감 원리:** 반복적인 전체 세션 주입 대신 지속 보존해야 할 정책·승인·작업 기준만 선택적으로 유지하고 일반 로그는 compaction 대상으로 둔다. **항목별 보존 자체는 토큰을 늘릴 수 있다.**
- **Trade-off:** always 남용 시 compaction 이득 소실, 오래된 정책 잔류 위험. 보존 목록은 승인된 plan/hash, CL, policy version 정도로 제한하고 TTL/갱신 규칙 별도 필요.
- **P4 적용:** `P4_BASE_REV`, 승인된 plan SHA, TeamCity job ID만 always, 대형 로그/검색 결과는 default. 강제 compaction 30회 뒤 승인 정보 보존과 입력 토큰 비교.
- **평가:** PoC 최우선.

### 1.4 Codex #61339 — Session Model-facing ID Store
- 원본: https://github.com/openai/codex/pull/61339
- **신규성/동작:** `SessionModelIdStore`에 SQLite와 메모리 구현을 제공하여 session, namespace, external key 조합으로 모델에 노출하는 alias를 할당·조회한다. SQLite 할당은 영속 저장.
- **절감 원리:** 긴 외부 식별자를 짧고 안정적인 별칭으로 표현할 기반. 단, PR 자체가 절감 토큰을 측정한 것은 아니며 alias가 많으면 매핑 관리 비용 발생.
- **Trade-off:** 충돌/세션 간 누출/DB 손상/재시작 후 복원 검증 필요. P4 CL 번호와 Job ID는 원본 키와 alias를 모두 ledger에 저장.
- **P4 적용:** 100개 작업을 강제 재시작하며 alias 동일성, session isolation, 외부 ID 매핑 무결성을 검사. 모델이 제출하는 alias는 서버에서 다시 원본으로 검증.
- **평가:** PoC.

### 1.5 Deep Agents #7712 — 시간·역할 필터 기반 Selective History
- 원본: https://github.com/langchain-ai/deepagents/pull/7712
- **신규성/동작:** Talon의 conversation-history 도구가 시간 구간과 역할별로 조회할 수 있어 예약된 리뷰가 모든 세션을 처음부터 순회할 필요가 없다.
- **절감 원리:** 필요한 시간대와 role만 읽으므로 Tool Output, 요약용 모델 입력과 조회 대기를 감소시킬 가능성이 있다. 토큰·latency 실측 수치 없음.
- **Trade-off:** 과도한 필터로 필수 승인/오류 맥락 누락 가능. 정책·Evidence ledger는 별도 authoritative store로 유지.
- **P4 적용:** 최근 24시간 실패한 TeamCity Job과 해당 Reviewer/Tool 이벤트만 조회; 전체 조회 기준의 누락률 0, 반환 바이트 및 입력 토큰 감소를 측정.
- **평가:** 바로 적용 원칙 / PoC.

### 1.6 Deep Agents #7722 — 비동기 Subagent 결과 스트리밍
- 원본: https://github.com/langchain-ai/deepagents/pull/7722
- **신규성/동작:** 부모와 독립된 conversation thread에서 수행하는 async subagent가 완료되었을 때 이를 join하는 앱으로 결과 스트리밍을 전달한다.
- **절감 원리:** 반복 poll 및 중복 완료 메시지 제거 여지가 있으나 구현 자체가 비용 절감을 입증하지는 않는다.
- **Trade-off:** 부모가 끊긴 동안의 이벤트 보존, 중복 wake, 재연결 순서 보장이 중요. Durable Outbox와 결합 필요.
- **P4 적용:** Build/Review worker 100개를 중단·복구하여 결과 유실 0, 중복 Submit 0, 최종 ACK 1회를 검증.
- **평가:** PoC.

### 1.7 Agent Framework #10345 — .NET MCP 응답 Read 상한
- 원본: https://github.com/microsoft/agent-framework/pull/10345
- **신규성/동작:** MCP 응답 읽기 크기를 제한하는 수정. 응답을 무제한으로 버퍼링하는 위험을 줄이는 방향이다.
- **절감 원리:** 과도한 응답 메모리 점유와 잠재적인 Context 팽창을 제한. 제한 초과를 에러로 처리한다면 자동으로 LLM 토큰을 절감했다고 주장할 수 없다.
- **Trade-off:** 대형 정상 응답이 차단될 수 있어 artifact store에 원본 저장 후 제한된 preview와 retrieval handle을 제공하는 Adapter가 필요.
- **P4 적용:** 1/8/32MiB TeamCity 로그에 대해 메모리 사용량, 실패 형태, 원본 보존/재조회 성공을 테스트.
- **평가:** 바로 적용 원칙.

### 1.8 Codex #61354 — Guardian Channel Description 재전송 회피
- 원본: https://github.com/openai/codex/pull/61354
- **신규성/동작:** Guardian Housekeeper가 기존 Channel로 Evidence를 전달할 때 동일한 설명을 반복 요구하지 않고, 신규/변경된 목적지에만 설명을 요청한다.
- **절감 원리:** 반복 메타데이터 출력과 Tool 입력 감소 가능. 수치 미제공.
- **Trade-off:** Channel 설명이 변경됐을 때 변경 감지·버전 관리 필요.
- **P4 적용:** 100개 동일 Channel Evidence Route에서 설명 전송 횟수 및 입력 토큰 계측.
- **평가:** 바로 적용 원칙.

## 2. 우선순위·검증 프로토콜

| 우선 | 적용 | 가설 | 검증 지표 | 판정 |
|---|---|---|---|---|
| P0 | Evidence Budget + ID 오버헤드 예약 | Context 초과/재시도 감소 | 입력 토큰, overflow, Evidence recall, 리뷰 정확도 | PoC 최우선 |
| P0 | MCP 요청 범위 Discovery | 비필수 서버 접속 감소 | 연결 수, p50/p95, cold/warm | 바로 적용 원칙 |
| P1 | History retention | 승인/작업 상태 보존과 compaction 양립 | 누락률, 토큰, 오래된 정책 잔류 | PoC |
| P1 | 시간·role 기반 History | 대화 재독해 비용 감소 | 반환 bytes, tokens, recall | PoC |
| P1 | Durable Subagent stream | poll/중복 wake 감소 | 유실·중복·복구 지연 | PoC |
| P2 | Stable alias + MCP read cap | 상태 안정성/대형 출력 보호 | alias collision, memory, retrieval | PoC |

**공통 재현 조건:** Claude Code와 Codex에 동일한 50개 P4/UE5/TeamCity 작업을 제공하고 모델·effort·prompt·tool schema를 고정한다. Cold/Warm Cache 각각 3회, Provider 입력/출력/cache read/write 토큰, 재시도·compaction 호출, 전체 비용, 작업 성공률, Evidence recall, p50/p95를 분리 기록한다. 정확도 또는 안전성 회귀가 있으면 토큰 절감이 있더라도 도입하지 않는다. Token 절감률은 (baseline input - variant input)/baseline input으로 산출하고 실제 청구액은 Provider Receipt를 별도 합산한다.

## 3. 지속 추적 대상

- **Durable state:** #61339 alias 영속화, #61344 retention 기록, #7722 async child completion의 재시작 후 전달 확인.
- **Runtime adapter:** #61365 페이지 범위 discovery, #10345 MCP response bound, 기존 P4/TeamCity adapter의 원본 artifact handle.
- **Evidence verification:** #61345~47 비동기 Guardian budget 및 Item ID 비용 예약, #61354 설명 중복 방지. 원본 Hash·ACK와 delivered-only metadata 분리.
- **Handoff/Ledger:** approval version, plan hash, P4 CL/base revision, TeamCity build ID, tool invocation idempotency key를 단일 task ledger에 연결.
- **Task lifecycle:** created → running → awaiting_evidence → awaiting_approval → completed/failed/cancelled; 중복 wake/재시작 시 단조 상태 전이 확인.
- **Skills/hooks, progressive disclosure, prompt 경량화, RAG, model routing, cache:** 이번 검색 범위에서 전일 보고서와 구분되는 충분한 신규 정량 근거를 확보하지 못했으므로 일반론을 반복하지 않는다.

## 4. 출처·한계

조사 원본은 각 항목에 연결된 GitHub PR이다. 검색은 openai/codex, anomalyco/opencode, langchain-ai/deepagents, microsoft/agent-framework, strands-agents/harness-sdk, google-gemini/gemini-cli의 2026-11-13 UTC merged PR을 대상으로 했다. 해당 날짜 결과 중 UI 수정, 의존성 범프, 단순 CI 변경은 제외했다. PR 제목·설명에 기반한 변경을 구현 확인 수준과 구분해야 하며, 개별 diff 전체·실행 가능한 benchmark의 독립 재현은 미수행이다. 확인된 **실제 Provider 비용 절감량은 없다**. 이 보고서의 모든 PoC 목표치는 업스트림 실측이 아니라 제안한 합격 기준이다.
