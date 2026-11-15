---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-16"
category: trend
updated: 2026-11-16
tags: [ai-harness, coding-agent, context-engineering, token-optimization, durable-state, evidence-verification, perforce, claude-code, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-11-16

> 조사 시점: 2026-11-16 06:03 KST 전후. 주 관찰 구간은 2026-11-15 UTC. GitHub 공식 저장소 검색, 공식 릴리스 및 `jaywapp/wiki` develop의 11/14·11/15 canonical 보고서 원문을 대조했다. **이번 조사에서 검증 가능한 의미 있는 신규 병합 구현이나 새로운 비용 벤치마크는 확인되지 않았다.** 이는 변경이 전혀 없다는 단정이 아니다.

## 0. 오늘의 판정: 의미 있는 신규 항목 없음

- **신규 병합 PR:** 아래 6개 저장소에 대해 GitHub 검색 `is:pr is:merged merged:2026-11-15`를 각각 실행했으나 결과가 모두 0건이었다. 검색 색인 지연, 검색 권한 및 날짜 경계 가능성이 있으므로 저장소 전체 commit이 0개였다고 해석하지 않는다.
- **공식 릴리스:** 확인 가능한 Claude Code 최신 릴리스 페이지는 v2.1.322(11/10 공개), Deep Agents 릴리스 페이지는 deepagents 0.7.37(11/12 공개)까지의 변경을 제시한다. 모두 이번 관찰 날짜보다 앞서고 이미 조사된 영역과 겹치므로 **11/15 신규 릴리스로 보고하지 않는다**.
- **정량 검증:** 11/15 신규 동일 품질 완료 작업당 Provider 청구 비용 감소, 토큰 감소, 품질 변화가 함께 측정된 결과를 확보하지 못했다.
- **중복 제거:** 11/14의 Guardian Elastic Evidence Budget·MCP 페이지별 Discovery·History Retention·Session Model ID·선택적 History·Subagent Streaming, 11/15의 Headroom PoC·OpenCode 계정 사용량 이슈를 새로운 구현처럼 재소개하지 않는다.

## 1. 확인한 원본 및 검색 재현

### 1.1 GitHub PR 병합 검색

2026-11-15 날짜로 각각 다음 검색을 수행했다.

| 저장소 | GitHub 검색 | 결과 | 판정 |
|---|---|---|---|
| openai/codex | [merged PR](https://github.com/openai/codex/pulls?q=is%3Apr+is%3Amerged+merged%3A2026-11-15) | 0 | 신규 구현 확증 불가 |
| anomalyco/opencode | [merged PR](https://github.com/anomalyco/opencode/pulls?q=is%3Apr+is%3Amerged+merged%3A2026-11-15) | 0 | 신규 구현 확증 불가 |
| langchain-ai/deepagents | [merged PR](https://github.com/langchain-ai/deepagents/pulls?q=is%3Apr+is%3Amerged+merged%3A2026-11-15) | 0 | 신규 구현 확증 불가 |
| microsoft/agent-framework | [merged PR](https://github.com/microsoft/agent-framework/pulls?q=is%3Apr+is%3Amerged+merged%3A2026-11-15) | 0 | 신규 구현 확증 불가 |
| strands-agents/harness-sdk | [merged PR](https://github.com/strands-agents/harness-sdk/pulls?q=is%3Apr+is%3Amerged+merged%3A2026-11-15) | 0 | 신규 구현 확증 불가 |
| google-gemini/gemini-cli | [merged PR](https://github.com/google-gemini/gemini-cli/pulls?q=is%3Apr+is%3Amerged+merged%3A2026-11-15) | 0 | 신규 구현 확증 불가 |

**검증 수준:** GitHub 연결 검색 결과 기준. 개별 commit 전체, 모든 PR diff, CI 결과, Issues/Discussions 및 모든 Provider 문서를 완전 순회하지 않았다. GitHub 검색의 0건은 실제 변경 없음의 증명이 아니다. 특히 UTC 날짜 경계와 검색 색인 갱신은 다음 조사에서 재검토할 대상이다.

### 1.2 공식 릴리스 교차 확인

- [Anthropic Claude Code releases](https://github.com/anthropics/claude-code/releases): 조회 결과 v2.1.322(11/10), v2.1.321(11/09), v2.1.319(11/06) 확인. v2.1.319의 MCP Background Task·Compaction·Subagent 관련 수정은 이전 Scout에서 이미 다뤘으므로 중복 제외.
- [LangChain Deep Agents releases](https://github.com/langchain-ai/deepagents/releases): deepagents 0.7.37(11/12)의 선택적 Prompt Cache Provider Lookup 캐싱, 0.7.36(11/12)의 Subagent Checkpoint Namespace·Backend Middleware 제공 확인. 11/13 Scout의 Checkpoint 항목과 중복이며 오늘 신규 릴리스가 아님.
- [LangChain Deep Agents JS releases](https://github.com/langchain-ai/deepagentsjs/releases): 1.16.4(11/10)의 Refusal 및 Subagent Tool Call ID 연결은 이번 관찰 날짜 신규 변경이 아님.
- [Deep Agents 저장소](https://github.com/langchain-ai/deepagents): 장기 실행, Subagent Isolation, Context Offload, Skills 및 Checkpoint 구조는 배경 아키텍처로 확인했으나 신규성 근거가 없으므로 별도 신규 항목으로 선정하지 않음.

## 2. 범주별 Scout 결과

| 범주 | 신규성 판정 | 오늘 처리 |
|---|---|---|
| Coding-agent workflow / orchestration | 검증된 신규 PR 없음 | 기존 실행 Receipt·Task ID 추적 유지 |
| Skills / hooks / progressive disclosure | 없음 | Tool Catalog·Skill 동적 로딩 중복 소개 배제 |
| Context pruning / compaction | 없음 | Message ID cutoff·Retention·Offload 기존 검증 계획 유지 |
| Subagent context isolation | 없음 | Child Namespace·승인 경계·Tool 권한 상속 테스트 유지 |
| RAG / selective context | 없음 | BM25 Tool Search·History 필터 기존 PoC 유지 |
| Prompt/Skill 파일 경량화 | 없음 | Stable Prefix Hash 및 Tool Schema 전송량 관측 유지 |
| Tool Output 축약 | 없음 | Headroom·Compact JSON·원본 Artifact 비교는 기존 과제 |
| Cache | 없음 | Cold/Warm, Cache Read/Write, Prefix Invalidations 측정 유지 |
| Session / handoff / ledger | 없음 | Durable Outbox·Resume·Approval Version 검증 유지 |
| Model routing | 없음 | Quota 상태와 실제 청구 비용 구분 유지 |
| Token/cost 측정 | 신규 실측 없음 | 완료 작업당 총 Provider 비용을 핵심 KPI로 유지 |
| Durable state / runtime adapter / evidence verification / task lifecycle | 없음 | 재시작·중복 제출·Evidence ACK Fault Injection 유지 |

**'새로운 내용 없음'을 무리하게 채우지 않는 것이 오늘의 핵심 결과다.** 위 범주별 계획은 신규 기술 소개가 아니라 이전 조사에서 이어지는 검증 백로그다.

## 3. 기존 과제의 실행 가능한 재현 기준 (신규 성과 아님)

### 3.1 P4·UE5·TeamCity Context Compression

- 데이터셋: 실패한 TeamCity 로그 30개, UE5 Crash 30개, Perforce Diff/CL 30개. 정답 및 Evidence 원본 SHA-256을 보존.
- 대조군: A 원본, B 정규식/Compact JSON, C Headroom. 모든 군에서 동일한 모델, effort, Prompt, Tool 정의, Evidence 평가 기준을 사용.
- 기록: 실제 Provider input/output/cache read/cache write 토큰, Provider 청구액, Tool Output Bytes, Cache Prefix Hash, 실패·재시도 비용, 완료율, 원인 파일/라인 검출률, P95 지연.
- 품질 게이트: 원본 근거 누락 0, CL Revision 혼동 0, 독립 평가 성공률 저하 0%p. 제안 합격 기준은 완료 검증 작업당 비용 10% 이상 감소, P95 지연 증가 10% 이하. **이 수치는 목표치이며 측정 결과가 아니다.**
- 평가: **PoC 유지**. 실제 사내 로그와 Provider 영수증이 없는 현재 단계에서는 도입 확정 불가.

### 3.2 Durable Task / Approval / Evidence Ledger

- 단일 `task_id`에 `p4_cl`, `base_revision`, `teamcity_build_id`, `worker_session`, `approval_version`, `plan_sha256`, `artifact_sha256`, `tool_invocation_idempotency_key`를 연결.
- 상태 전이: created → running → awaiting_evidence → awaiting_approval → completed / failed / cancelled. 동일 이벤트 재수신 시 멱등 처리, 역방향 전이 금지.
- Fault Injection: Build Worker 강제 종료·재개, Tool Output Schema 실패, 승인 만료, 네트워크 재전송, P4 Submit 중복 요청 각 20회.
- 필수 합격: 중복 P4 Submit 0건, 완료 결과 유실 0건, Evidence Hash 불일치 0건, 만료 승인 재사용 0건, 최종 ACK 정확히 1회.
- 평가: **바로 적용할 설계 원칙 / 구현 PoC 유지**. 오늘 새 릴리스에 의해 입증된 효과가 아니다.

### 3.3 Model Routing 및 Cost Receipt

- Provider별 `quota_remaining`, `quota_reset_at`, `quota_source`, `quota_freshness`와 실제 `provider_billed_cost`를 분리하고 미확인 값은 `unknown`으로 둔다.
- Worker·Reviewer·Compactor·실패 재시도 호출의 비용을 모두 합산. `verified_task_cost = total_provider_billed_cost / verified_completed_tasks`로 비교하며 실패 비용도 분자에 포함한다.
- 모델별 Tool Discovery 성공률, Evidence Recall, 실제 비용을 함께 평가하고 저성능 모델로 라우팅해 안전성·정확도가 떨어지면 절감으로 인정하지 않는다.
- 평가: **바로 적용할 계측 원칙 / 자동 라우팅은 PoC**.

## 4. 기술별 신규 도입 평가

| 평가 | 이번 날짜 신규 항목 | 근거 |
|---|---|---|
| 바로 적용 | 없음 | 신규 검증된 변경 없음 |
| PoC | 신규 선정 없음 | 기존 Headroom·Evidence·Durability PoC 유지 |
| 아이디어 참고 | 없음 | 신규 확인 이슈 없음 |
| 도입 가치 낮음 | 근거 없는 압축률·비용 절감 주장 | 재현 가능한 품질/청구액 실험 없음 |

**토큰 절감 원리와 Trade-off:** 오늘 신규 구현은 확인되지 않아 특정 구현의 절감 메커니즘·장단점을 신규 사실처럼 작성하지 않는다. 기존 방법의 공통 위험은 Evidence 손실, Cache Prefix 변경, 압축/복원 추가 호출, Tool 선택 오류, 재시작 중 중복 실행이며, 각 위험은 위의 A/B·Fault Injection에서 계측해야 한다.

## 5. 다음 조사에서 확인할 항목

- 11/15 UTC 병합 PR 색인 재확인 및 날짜 경계(11/14~16) Commit/Release 교차검증.
- 11/15 이후 공식 릴리스가 있으면 변경 파일·테스트·기존 보고서 대비 차이만 선별.
- Headroom의 실제 작업 단위 비용/품질 벤치마크가 공개되는지, 계정 Quota API가 정식화되는지 확인. 둘 다 11/15에 신규 구현으로 확정된 것은 아니다.
- 원본 Evidence 복원과 Prompt Cache 손익을 함께 측정하는 공개 benchmark가 생기는지 추적.

## 6. 결론과 조사 한계

**2026-11-16 Scout 결론: 의미 있는 신규 항목을 확증하지 못했다.** 6개 핵심 저장소의 지정 날짜 병합 PR 검색 결과가 0건이고, 공식 릴리스 교차 확인에서 해당 날짜의 새 버전을 확보하지 못했다. 전일 Wiki 원문을 읽고 기존 기술·PoC와 중복을 제거했다. 11/15 전체 GitHub 활동의 부재를 의미하지는 않으며, 모든 diff/issue/benchmark를 전수 조사한 것도 아니다. 사내 Provider 청구액 및 품질 A/B 실험은 수행하지 않았다.

## 원본 링크

- https://github.com/anthropics/claude-code/releases
- https://github.com/langchain-ai/deepagents/releases
- https://github.com/langchain-ai/deepagentsjs/releases
- https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-15.md
- https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-14.md
