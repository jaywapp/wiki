---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-20"
category: trend
updated: 2026-11-20
tags: [ai-harness, subagent, durable-state, runtime-adapter, compaction, perforce, codex, opencode]
---

# AI Harness · Context/Token Optimization Scout — 2026-11-20

> 조사 기준: 2026-11-20 KST 오전. 최근 GitHub 공개 이슈를 중심으로 검토. 기존 jaywapp/wiki develop의 2026-11-19 Scout 원문(Blob `ad3633a1ffd574d10cb605017cf3ee068d342a34`)과 비교해 Compaction Fallback, Summary Template, Model Allowlist, Reasoning Replay 이슈의 반복을 제외했다. 아래 신규 항목은 **공개 이슈**이지 병합/배포가 검증된 수정이 아니다.

## 0. 핵심 판단

이번에 확인한 신규 신호는 **병렬 Subagent의 파일 변경 유실, Responses Gateway를 통한 모델 라우팅 시 Worker 메시지 호환성, 서비스 교체 시 SQLite 잠금으로 세션 소실, Compaction 이후 빈 요약/사용자 질문 유실**이다. 대부분 실패 사례이며 새로운 압축 알고리즘이나 동일 품질당 청구 비용 절감률은 확인되지 않았다. 오늘의 우선순위는 토큰 압축률보다 **실행 결과의 신뢰성과 중복 작업 방지**다.

## 1. Deep Agents #7835 — 병렬 Subagent가 별도 파일을 편집해도 한쪽 결과만 남는 문제

- 원본: https://github.com/langchain-ai/deepagents/issues/7835
- 신규성/상태: 최근 검색에서 발견된 병렬 편집 결과 유실 신고. 이슈 본문에서 'Parallel subagents edit separate release docs, but only one edit survives'라고 보고. 커밋·해결 PR·병합 여부는 확인하지 못했다.
- 내부 동작 가설: Subagent가 분리된 상태에서 변경을 만든 뒤 부모 상태에 합치는 단계의 파일 상태 충돌 또는 스냅샷 병합 누락 가능성. 정확한 원인은 소스/재현 테스트 확인 전 **미확정**이다.
- 토큰/비용 원리: 직접 압축하지 않는다. 사라진 편집을 다시 수행하는 재작업과 검증 토큰을 줄이는 신뢰성 게이트다. 정량 절감량 없음.
- 장점: 병렬화의 생산성 유지, Silent Loss 탐지. 단점: 작업별 변경 파일 manifest·충돌 검사와 병합 직렬화 비용 증가.
- Perforce/Claude Code/Codex 적용: 각 Child가 `base_revision`, `read_set`, `write_set`, `artifact_hash`를 반환하고, 부모는 P4 CL 단위로 적용 전후 파일 해시와 변경 목록을 검증. 동일 파일/상위 디렉터리 충돌 시 재검토; 서로 다른 파일이라도 최종 변경 누락 여부 확인. 파일 쓰기/Submit은 부모 또는 전용 Executor에서만 수행.
- 재현: 20개 Fixture × 3회, Child 2~4개가 별도 파일·동일 파일·같은 디렉터리 메타데이터를 변경. 기대 결과와 최종 워크스페이스 diff를 비교. `lost_write_count=0`, `duplicate_submit=0` 필수.
- 평가: **PoC 최우선**. 단, 이슈를 확정된 Framework 결함으로 일반화하지 않음.

## 2. Codex #62562 — Multi-Agent V2와 Responses Gateway 간 Worker 메시지 호환성

- 원본: https://github.com/openai/codex/issues/62562
- 신규성/상태: Responses Gateway가 제3자 모델로 요청을 라우팅하면서 Codex의 Provider 설정은 OpenAI로 남을 때, Worker가 다운스트림 모델에서 해석할 수 없는 메시지를 생성한다는 신고. 신고자는 합성 텍스트 테스트를 언급. 공식 수정·병합 여부 미확인.
- 내부 동작: **Configured Provider와 실제 Upstream Protocol**이 달라질 수 있다. Parent→Child 메시지 직렬화, Tool Call/Result ID, Reasoning/Message Role의 호환성이 런타임 라우팅 이후에도 유효한지 검증해야 한다.
- 절감 원리: 잘못된 Worker 요청과 반복 실패를 차단; 토큰 압축 자체는 아님. Provider별 요청 변환이 추가되면 지연/유지비 증가.
- 장점: 멀티 모델 Orchestration 안전성. 단점: Gateway·Model·API 버전 조합별 계약 테스트 비용.
- 적용: `requested_provider`, `gateway_route`, `observed_upstream`, `wire_protocol`, `worker_message_schema`를 Receipt에 분리. 라우팅 직후 Compatibility Gate에서 Tool Result ID/Role/Reasoning Block 규칙을 검사. 실제 Provider를 확인할 수 없으면 민감한 P4/TeamCity 자료 전송 보류.
- 재현: OpenAI 직결/동일 Provider Gateway/제3자 모델 Gateway의 3×2(단일·멀티 Agent) 행렬에서 30개 메시지 Fixture 실행. Schema 실패 0, 잘못된 Tool Result 0, Provider 정책 위반 0.
- 평가: **PoC 최우선**.

## 3. OpenCode #64978 — 서비스 교체 시 SQLite Lock Race와 세션 유실

- 원본: https://github.com/anomalyco/opencode/issues/64978
- 신규성/상태: Windows 11, OpenCode 2.3.2에서 이전 백그라운드 서비스가 종료되는 동안 새 서비스를 부팅할 때 `SQLiteError: database is locked`, exit code 1, 기존 서비스 세션 소실을 신고. 수정 여부 미확인.
- 내부 동작: 서비스 생명주기와 DB Writer 소유권의 인계 순서가 경쟁할 수 있다. 이전부터 존재하던 일반 동시 SQLite 경합과 달리 **버전 불일치에 따른 서비스 교체**라는 구체적인 재현 경로가 중요하다.
- 토큰/비용 원리: 세션 유실 이후 Context 재구성·중복 도구 호출·재시도 감소 가능. 정량 청구 비용 검증 없음.
- 장점: Durable State 복구, 안전한 Upgrade. 단점: Shutdown Drain/Lease/Backoff 때문에 교체 지연 증가.
- 적용: Runtime Adapter가 `service_generation`, `db_writer_lease`, `session_checkpoint_sha`, `resume_policy`를 기록. 새 서비스는 이전 Writer 종료·Checkpoint Flush를 확인한 뒤 시작. 미완료 P4 Submit/TeamCity Build는 재실행 전 외부 시스템에서 실제 상태 확인.
- 재현: Windows에서 서비스 교체 100회, 활성 Child 1~10개, 강제 종료·DB Lock 주입. 세션 유실 0, 이중 Submit 0, 복구 가능한 Task 비율 100% 목표.
- 평가: **바로 적용할 운영 원칙 / 실제 Adapter PoC**.

## 4. Deep Agents #7834/#7833, #7814 — Compaction History 경계의 빈 요약과 질문 유실

- 원본: https://github.com/langchain-ai/deepagents/issues/7834 ; https://github.com/langchain-ai/deepagents/issues/7833 ; https://github.com/langchain-ai/deepagents/issues/7814
- 신규성/상태: 이전 Summary만 Evict되는 경우 `## Summarized at` 아래 빈 섹션이 생성된다는 신고와, 압축 History를 정리할 때 다음 사용자 질문이 사라진다는 별도 신고. 중복 제보 #7833/#7834는 **한 건의 현상**으로 취급. 수정/릴리스 미확인.
- 내부 동작: Summary Boundary, Eviction Window, 최신 User Message 보존 조건 사이의 경계 사례. 정확한 구현 원인은 미확정.
- 토큰 원리: 빈 요약은 표면상 짧지만 **유효한 정보 압축이 아님**. 최신 요청 유실은 실패·재작업을 유발할 수 있으므로 압축률 단독 최적화 금지.
- 장점: Compaction Quality Gate로 Task Continuity 보장. 단점: 추가 Evidence 검증과 Replay 테스트의 처리시간.
- 적용: `last_user_turn_id`, `summary_covers_until`, `preserved_message_ids`, `evidence_manifest_hash`를 Compaction Transaction에 포함. 최신 사용자 요청, P4 CL, Build ID, 승인 상태가 Summary 이후에도 남아야 Atomic Commit 허용.
- 재현: Previous Summary만 Evict, Summary+User Turn 동시 Evict, 새 User Turn 직후 Evict, 중단된 Tool Call 포함 4종 × 20 Fixture. 최신 요청 보존 100%, 빈 유효 Summary 0, 검증 실패 시 기존 History 유지 100%.
- 평가: **바로 적용 원칙 / PoC**.

## 5. 범주별 신규성 점검

| 범주 | 이번 확인 |
|---|---|
| Coding-agent workflow / orchestration | 병렬 편집 결과 검증과 실행권한 분리 (#7835) |
| Skills/hooks / progressive disclosure | 새 병합 구현 또는 정량 근거 확인 없음 |
| Context pruning / compaction | Eviction Boundary와 Latest User Turn 보존 (#7834, #7814) |
| Subagent context isolation | Child 변경 산출물과 Parent Merge 계약 (#7835) |
| RAG / selective search | 새 검색 정확도/비용 Benchmark 확인 없음 |
| Prompt/Skill 경량화 | 새 실측 없음 |
| Tool output 축약 | 기존 Scout의 대형 Output 사례 반복 제외 |
| Cache | 새 Provider Cache 비용 A/B 근거 없음 |
| Session/handoff/ledger | 서비스 교체 전 Checkpoint Flush 및 Writer Lease (#64978) |
| Model routing | Configured Provider와 Observed Upstream 분리 (#62562) |
| Token/cost | 실패 재작업 가능성은 확인; 청구액 절감률 미확인 |
| Durable state | 세션 유실/중복 실행 방지 (#64978) |
| Runtime adapter | Gateway Protocol Compatibility Contract (#62562) |
| Evidence verification | Child Diff/Hash, Summary Latest Turn 검증 |
| Task lifecycle | `child_done → artifact_verified → merge_committed`; `service_draining → checkpointed → lease_released → new_service_ready` |

## 6. 통합 PoC — Verified Task Completion Ledger

```json
{
  "task_id": "string",
  "parent_session_id": "string",
  "child_run_id": "string",
  "runtime_generation": 0,
  "requested_provider": "string",
  "observed_upstream": null,
  "wire_protocol": "string",
  "base_revision": "string",
  "read_set": [],
  "write_set": [],
  "artifact_sha256": "string",
  "evidence_manifest_sha256": "string",
  "last_user_turn_id": "string",
  "approval_version": "string",
  "p4_changelist": null,
  "teamcity_build_id": null,
  "checkpoint_sha256": "string",
  "merge_verified": false,
  "resume_verified": false,
  "input_tokens": 0,
  "output_tokens": 0,
  "cache_read_tokens": 0,
  "provider_billed_cost": null
}
```

실험군: A=현재 Harness, B=Child Artifact Verification, C=Gateway Contract, D=Checkpoint+Compaction Gate, E=B+C+D. 동일 30개 Task × 3회, Cold/Warm Cache 분리. 핵심 지표: `verified_completion_rate`, `lost_write_count`, `replayed_side_effect_count`, `evidence_recall`, `provider_billed_cost_per_verified_task`, P95 Latency. 비용은 실제 Provider Receipt 확보 시에만 절감률 산출. P4 Submit은 테스트 서버에서만 실행하고 운영 환경의 자동 재실행은 금지한다.

## 7. 조사 범위와 한계

- GitHub Connector로 `jaywapp/wiki` develop의 2026-11-19 전체 보고서를 직접 조회했으며, 오늘 canonical 경로는 조회 시 404로 아직 존재하지 않았다.
- GitHub Issues 검색에서 Codex, OpenCode, Deep Agents의 최근 갱신 이슈를 확인했다. 검색은 `updated` 기준이므로 최초 작성일이 모두 11/19임을 보증하지 않는다. 공식 PR Diff·최근 Commit·릴리스·Benchmark의 전수 검증은 수행하지 못했다.
- 일부 과거 관련 이슈(예: SQLite 경합, 병렬 Child 재실행)는 이전부터 존재했으므로 이번 보고서는 **새롭게 식별된 실패 경로와 계약 테스트**에 집중했다.
- 신규 확정 병합 구현 및 독립적으로 검증된 **동일 품질 작업당 Provider 청구액 절감률은 없음**. 신고자의 주장과 재현 계획을 실측 결과로 표현하지 않는다.

## 원본

- https://github.com/langchain-ai/deepagents/issues/7835
- https://github.com/openai/codex/issues/62562
- https://github.com/anomalyco/opencode/issues/64978
- https://github.com/langchain-ai/deepagents/issues/7834
- https://github.com/langchain-ai/deepagents/issues/7833
- https://github.com/langchain-ai/deepagents/issues/7814
- https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-19.md
