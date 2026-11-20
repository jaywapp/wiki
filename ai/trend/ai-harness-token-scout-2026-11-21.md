---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-21"
category: trend
updated: 2026-11-21
tags: [ai-harness, token-cost, durable-state, compaction, prompt-cache, perforce, claude-code, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-11-21

> 조사 기준: 2026-11-21 06시 KST, 11월 20일 UTC 신규 공개 이슈 중심. GitHub Connector로 jaywapp/wiki develop의 11/19·11/20 Scout 원문을 조회해 중복 제거. 아래는 **신규 이슈·신고자의 재현 결과**이며 수정 병합·정식 배포를 뜻하지 않는다. 사내 재현이나 Provider 청구 실측은 수행하지 않았다.

## 0. 요약 및 우선순위

오늘의 실질적 신규 신호는 **원격에서 수락한 비동기 Task의 응답 유실로 인한 고아 작업**, **Claude Code 재개 세션의 Prompt Cache 재작성**, **Codex Gateway의 표시 이름 기반 Compaction Capability 오판**, **Shell Timeout 무상한**, **실패/중단 호출의 로컬 비용 계측 누락 가능성**이다. 이전 Scout의 일반적인 병렬 파일 병합 유실, Gateway Worker 직렬화, Compaction Fallback 실패와는 서로 다른 구체적인 실패 경로다.

권장 순서: (1) Task Launch Receipt/Idempotency PoC, (2) Runtime Capability 명시와 Compaction 복구 게이트, (3) Cache Receipt 비교 실험, (4) Shell Deadline 상한, (5) 청구 요청별 Cost Reconciliation. 오늘 **동일 품질당 실제 청구 비용 절감률을 새로 검증한 결과는 없다.**

## 1. Deep Agents #7893 — 수락된 비동기 작업의 Launch Receipt 유실

- 원본: https://github.com/langchain-ai/deepagents/issues/7893 (동일 내용 #7892는 자동 제출로 종료되어 별도 발견으로 계산하지 않음).
- 신규성/상태: 11/20 공개 신고. deepagents 0.7.41, langchain 1.5.2, langgraph 1.2.24, langgraph-sdk 0.4.7의 로컬 HTTP 경계 재현 코드와 정상/실패 출력 제공. 공식 수정 여부는 확인되지 않았다.
- 내부 동작: `threads.create`로 thread ID를 받은 후 `runs.create`를 원격이 수락하지만 HTTP 응답이 소실되면 부모는 Launch 실패를 반환하고 `async_tasks`에 저장하지 않는다. 신고자 재현에서 정상은 `accepted_runs=1, tracked_tasks=1`; 응답 소실은 `accepted_runs=1, tracked_tasks=0, untracked_runs=1`. 작업이 실행 중인데 부모는 추적/취소할 수 없는 상태다.
- 토큰/비용: 재시도 시 같은 작업을 중복 실행하는 위험을 막아 비용을 줄일 **가능성**. 실측 절감 없음. 원격 조회·Ledger 저장 오버헤드와 유휴 Task 정리 비용이 추가된다.
- 장단점: 장애 복구와 Task Lifecycle 신뢰성 개선 / ID 발급·중복 제거·Reconciliation 구현 복잡성.
- 적용: P4 Submit, TeamCity Build Trigger, Child Worker Launch 전에 `operation_key=hash(task_id,action,parameters,approval_version)`를 Durable Ledger에 기록. 서버는 같은 키 재요청을 동일 run ID로 해석. 응답 유실 시 재실행하지 말고 키로 조회해 `accepted`/ `running`을 복원. 외부 API가 Idempotency를 지원하지 않으면 먼저 실제 Build/CL 상태를 조회하고 수동 승인 분기.
- 재현: HTTP 서버가 요청 수락 후 응답만 닫는 Fault Injection 100회, 네트워크 지연/중복 요청/부모 프로세스 종료 조합. `orphan_task=0, duplicate_side_effect=0, resumed_task=100%` 목표.
- 평가: **PoC 최우선**. 기존 11/20의 '완료된 Child 파일 결과 유실'과 달리 이번은 **시작 수락 확인 응답의 유실**이다.

## 2. Claude Code #111435 — Resume/Fork 시 Prompt Cache 재사용 불안정

- 원본: https://github.com/anthropics/claude-code/issues/111435
- 신규성/상태: 11/20 신고, Claude Code 2.1.328/macOS/구독 인증. 새 프로세스에서 `claude -p --resume` 또는 `--fork-session`을 반복하는 실험. 원인인 특정 실험적 Beta는 아직 확정되지 않았고 수정 병합도 확인되지 않았다.
- 내부 동작: 기존 부모 세션은 cache-read 147,073, write 413 tokens. 기본 Beta 활성화 상태의 동일 Fork 두 번은 각각 read 61,130, 1시간 TTL cache-write 약 96,900 tokens. Beta 비활성화 조건의 첫 호출은 read 0/write 261,465, 두 번째 동일 호출은 read 261,465/write 0. Beta 비활성화는 Prefix를 크게 만들므로 단순히 '더 저렴'하다고 결론낼 수 없다.
- 절감 원리: 동일 Prefix의 반복 쓰기를 줄이면 cache-write 비용을 절약할 수 있으나 전체 Prompt 길이, cache read 가격, TTL, 모델별 요금이 달라 실제 비용은 별도 계산 필요.
- 장점: 반복 Headless Resume의 비용 원인 관측 / 단점: 실험적 Beta 비활성화에 따른 Prompt 크기 증가·기능 변경, 특정 버전의 단일 신고.
- 적용: Claude Code Batch Runner에서 `session_id, process_generation, beta_flags, prefix_fingerprint, cache_read_input_tokens, cache_creation_input_tokens, input_tokens, billed_cost` 기록. 장시간 P4/UE5 로그 분석 세션을 동일 조건에서 Resume/Fork × 5회, Cold/Warm Cache 분리해 비교. Beta 환경변수는 테스트 전용이며 운영 전역 비활성화 권장하지 않음.
- 평가: **PoC 최우선**. 위 숫자는 신고자 환경의 토큰 사용량이지 재현된 비용 절감률이 아니다.

## 3. Codex #62809 — Provider 표시 이름으로 Remote Compaction v2 오판

- 원본: https://github.com/openai/codex/issues/62809 ; 관련 기존 제안 https://github.com/openai/codex/issues/37010
- 신규성/상태: 11/20 공개. Custom Responses Provider의 표시 이름을 `OpenAI`로 설정하면 타사 Endpoint라도 네이티브 Remote Compaction v2를 선택한다는 구체적 소스 경로 및 재현 보고. 기존 11/20 Scout의 'Worker 메시지 Gateway 호환성'과는 별개의 **Capability Discovery** 결함 가능성.
- 내부 동작: 신고자가 지목한 `codex-rs/model-provider-info/src/lib.rs`의 `is_openai()`가 `name == "OpenAI"`로 판단하고, `model-provider/src/capabilities.rs`가 remote compaction v2를 기본 선택. `core/src/tasks/compact.rs`가 해당 분기로 이동, `core/src/compact_remote_v2.rs`는 compaction item이 정확히 하나가 아니면 Fatal. 타사 Gateway는 이 Item을 반환하지 않아 반복 실패. 신고 사례는 964,199 input tokens의 긴 세션.
- 확인된 우회: Custom Provider 설정에 `[model_providers.custom.capabilities]` / `remote_compaction = "unsupported"` 명시 후 별도 Profile에서 Local Compaction과 정상 다음 Turn을 확인했다고 신고. 이는 범용 해결 검증이 아니다.
- 절감 원리: 실패 Compaction 반복과 Context 재전송을 줄일 가능성. Local Compaction은 품질·비용·지연 Trade-off가 있으며 수치 미검증.
- 적용: Provider Display Name을 Capability 근거로 사용 금지. `provider_id, endpoint_origin, upstream_model, capabilities.remote_compaction, capability_source`를 Runtime Adapter에서 분리. 명시적으로 검증된 Endpoint만 Remote Compaction 허용, 실패 시 승인된 Local Compaction으로 전환하며 History는 Atomic Commit. Perforce 승인·Evidence Ledger 보존 검사.
- 재현: Provider 명칭 OpenAI/Custom × 실제 Endpoint 네이티브/타사 × Capability 명시/누락 8종, Context 임계치 부근 20회. `fatal_compaction_loop=0`, 정책 밖 전송 0, Evidence 누락 0.
- 평가: **바로 적용할 계약 원칙 / Codex Adapter PoC**.

## 4. OpenCode #65254 — Shell Tool의 모델 지정 Timeout 상한 부재

- 원본: https://github.com/anomalyco/opencode/issues/65254
- 신규성/상태: 11/20 신고, Headless Eval에서 4개 Run이 60분 제한 내 답을 완성하지 못한 사례. 신고자는 `packages/opencode/src/tool/shell.ts` 1.19.6과 `packages/core/src/tool/plugin/shell.ts` 개발 Commit fe8def685를 검토. 소스의 최종 상태·패치 병합은 독립 확인하지 못했다.
- 내부 동작: 모델이 `timeout=3,600,000~14,400,000ms`를 지정하면 Foreground Shell이 해당 시간 동안 반환되지 않는다. 기존 Bash Tool에는 `MAX_TIMEOUT_MS=10분` 검사가 있지만 Shell Tool은 해당 제한을 적용하지 않는다는 신고. 44~110개 이전 Tool Call이 정상 완료돼도 마지막 긴 Tool 때문에 전체 작업 결과가 사라질 수 있다.
- 절감 원리: Token Compression은 아님. 장시간 Blocking으로 인한 작업 실패/재실행을 줄여 검증 완료 작업당 비용을 낮출 가능성. 짧은 제한은 정상 장기 빌드에 부적합할 수 있으므로 Background 실행·Polling으로 전환.
- 적용: `foreground_timeout_ms=min(model_requested,600000,remaining_task_budget)`; UE5/TeamCity 장기 Build는 Job ID를 반환하고 Durable Polling. Cancel은 실제 외부 Build 종료 확인 후 기록. 작업별 Wall-clock/Token Budget 분리.
- 재현: 2분/10분/60분/4시간 Shell Fixture와 중단 주입, P95 Turn Blocking, Background Handoff 누락, 중복 Build 측정.
- 평가: **바로 적용** (Shell Wrapper의 시간 제한과 Background Job ID).

## 5. OpenCode #65243 — 중단·재시도 호출의 Cost Receipt 불완전 가능성

- 원본: https://github.com/anomalyco/opencode/issues/65243
- 신규성/상태: 11/20 신고, OpenCode 2.3.2. 로컬 세션 총 $6.1406771, 같은 UTC 날짜 Workspace 전체 Console 집계 128요청/$19.1380. **서로 다른 범위이므로 차액을 과금 누락이나 초과 과금으로 해석하면 안 된다.**
- 내부 동작: 신고자는 `packages/core/src/session/runner/step.ts`의 사용량이 `record.finish`에 의존하고, Stream 실패 시 Finish가 없으면 로컬 비용이 기록되지 않을 가능성을 제기. Retry가 동일 Assistant Message를 재사용하며 시작 시각과 Retry 필드가 갱신될 수 있다는 코드 경로도 제시. 해당 원인이 실제 차액의 원인이라는 증거는 없다.
- 수치: 로컬 83개 비용 기록 Assistant Message, 2개 오류 종료, 201개 Tool Entry. 로컬 cache-read 35,517,751, uncached input 975,488, output 33,819, reasoning 30,080 tokens. Workspace Console은 약 5.6M uncached, 51.6M cached, 280K output. 다른 클라이언트 호출 가능성 때문에 직접 비교 불가.
- 절감 원리: 정확한 Attempt별 Receipt는 실패 비용과 Retry 예산을 보이게 해 Model Routing/Cache 최적화의 판단을 개선. 직접적인 압축은 아님.
- 적용: `logical_turn_id`와 `provider_request_id`를 분리하고 `attempt_no, transport_status, first_token_at, finish_received, usage_source, estimated_cost, billed_cost`를 Append-only Ledger에 저장. 실패 Attempt도 삭제하지 않고 `unknown_billing` 표시. Provider Console과 같은 Workspace/기간/모델/Request ID로만 대조.
- 재현: Mock Provider에서 First Token 전/후 ECONNRESET, Retry, User Cancel 3×30회. Receipt 누락 0, Unknown과 Zero Cost 구분 100%, 동일 요청 이중 합산 0.
- 평가: **PoC 최우선**. 보고된 $6.14 대 $19.14는 절감액도 손실액도 아니다.

## 6. 범주별 점검 및 제외

| 범주 | 오늘 확인한 신규 근거 또는 제외 판단 |
|---|---|
| Workflow/orchestration/task lifecycle | Async Launch Accepted-but-Untracked #7893, Shell Foreground Deadline #65254 |
| Skills/hooks/progressive disclosure | 새 병합 구현·측정 근거 없음 |
| Pruning/compaction | Capability 오판 #62809; 이전 Summary Template/Fallback 이슈 재수록 제외 |
| Sub-agent isolation | Launch Receipt와 Child ID 영속화; 이전 병렬 파일 Merge 유실과 구분 |
| RAG/selective context | 신규 정량 검색 Benchmark 미확인 |
| Prompt/skill 파일 경량화 | 신규 파일 경량화 실측 없음 |
| Tool output 축약 | 기존 Compact JSON/Headroom 사례 반복 제외 |
| Cache | Claude Code Resume/Fork의 Cache Read/Write 관측 #111435 |
| Session/handoff/durable state | 수락된 Run의 ID 복구, Resume Prefix 검증 |
| Model routing/runtime adapter | Provider Identity와 Compaction Capability 분리 #62809 |
| Token/cost 측정 | Finish 누락 가능성 및 Attempt-level Reconciliation #65243 |
| Evidence verification | Task Acceptance, 실제 Run ID, P4 CL/Build ID, Summary 보존 검사 |
| Ledger | Append-only Launch Receipt와 Provider Attempt Receipt |

## 7. Perforce·Claude Code·Codex 통합 PoC 설계

```json
{
  "task_id": "string",
  "operation_key": "sha256",
  "parent_session_id": "string",
  "remote_thread_id": null,
  "remote_run_id": null,
  "launch_state": "prepared|accepted|unknown|running|finished|verified",
  "approval_version": "string",
  "p4_changelist": null,
  "teamcity_build_id": null,
  "provider_id": "string",
  "endpoint_origin": "string",
  "capabilities": {"remote_compaction": "unsupported|v1|v2"},
  "session_prefix_sha256": "string",
  "cache_read_tokens": 0,
  "cache_write_tokens": 0,
  "logical_turn_id": "string",
  "attempts": [{"request_id": null, "finish_received": false, "usage_source": "unknown", "billed_cost": null}],
  "foreground_deadline_ms": 600000,
  "evidence_manifest_sha256": "string",
  "verified_completion": false
}
```

실험: A=기존, B=Idempotent Launch, C=Explicit Capability+Compaction Recovery, D=Cache Prefix Receipt, E=Deadline+Attempt Ledger. 30개 작업 × 3회, Cold/Warm Cache 구분, 동일 모델/Provider/품질 기준 유지. 지표: `orphan_run_count`, `duplicate_side_effect_count`, `verified_resume_rate`, `cache_read/write_tokens`, `provider_billed_cost_per_verified_task`, `p95_latency`, `evidence_recall`. 승인 없는 P4 Submit 금지, Build Trigger는 테스트 환경만 사용. 실제 청구 Request ID가 없으면 비용 절감률 대신 Token/Attempt 수만 보고.

## 8. 근거 수준과 조사 한계

- 2026-11-21 canonical 파일을 develop에서 사전 fetch한 결과 404로 미존재 확인. 11/19·11/20 전체 원문 직접 확인, 기존 보고서 항목과 중복 제거.
- GitHub Connector로 Deep Agents, Claude Code, Codex, OpenCode의 11/20 신규 이슈를 검색하고 주요 이슈 본문·재현 코드·소스 경로·신고자 측정치를 검토. Microsoft Agent Framework 저장소 검색은 GitHub API 422로 실패. 모든 Repo의 Commit/Release/PR Diff를 전수 확인한 것은 아니다.
- 다섯 항목 모두 **이슈 기반 신규 신호**다. 공식 수정 릴리스 또는 독립 검증된 비용 절감 수치로 오인하지 않는다. Claude Code Cache 수치는 환경에 따라 달라지고 OpenCode 비용 수치는 서로 다른 집계 범위다.
- 신규로 확인된 **독립적인 동일 품질당 Provider 청구액 절감률: 없음**.

## 원본 링크

- https://github.com/langchain-ai/deepagents/issues/7893
- https://github.com/anthropics/claude-code/issues/111435
- https://github.com/openai/codex/issues/62809
- https://github.com/anomalyco/opencode/issues/65254
- https://github.com/anomalyco/opencode/issues/65243
- https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-20.md
