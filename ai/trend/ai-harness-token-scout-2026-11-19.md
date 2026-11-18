---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-19"
category: trend
updated: 2026-11-19
tags: [ai-harness, compaction, model-routing, runtime-adapter, evidence-verification, perforce, claude-code, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-11-19

> 조사 시각: 2026-11-19 06시 KST. 관찰 중심: 2026-11-18 UTC에 공개된 GitHub 이슈 및 PR. 비교 기준: jaywapp/wiki develop의 2026-11-18 원문(Blob `5e84b4efe3f5b0d5428b8b5f5e51d7781c5ca9fa`)과 11/17 이전 Scout의 기존 항목. 공개 이슈는 구현 완료가 아니며, 별도 재현·비용 실측을 수행하지 않았다.

## 0. 핵심 판단

**오늘 확인된 의미 있는 신규 신호는 Compaction 모델의 실행 시점 장애, Compaction Summary 형식 검증 실패, 모델 허용 목록/자격증명 출처 불투명성, Reasoning Replay 무결성 계측 제안이다.** 기존 11/17의 23MB Tool Output 및 Codex History 손상 사례, 11/18의 gh-aw 모델 라우팅과 Audit 사례를 신규 기술로 재포장하지 않았다. 오늘 확인한 신규 항목은 대부분 **미해결 이슈/열린 PR**이며, 신규 정량 Provider 비용 절감 성과나 안정 배포가 확증된 새 알고리즘은 없다.

**권고:** Compaction을 단순 요약 도구가 아니라 `prepare → generate → validate → commit → replay-check`의 별도 상태 머신으로 관리하고, 모델 라우팅에는 실제 연결 상태·정책 허용 여부·실제 호출 모델을 함께 기록한다. 기존 Harness를 대체하기보다 Runtime Adapter Contract Test에 추가하는 것이 우선이다.

## 1. OpenCode #64553 / #64554 — Compaction 모델 연결 실패 시 세션 모델 Fallback

- **원본:** https://github.com/anomalyco/opencode/issues/64553 ; 관련 PR https://github.com/anomalyco/opencode/pull/64554
- **발견 날짜/상태:** 2026-11-18 등록된 Windows 11 / OpenCode Desktop 이슈. PR 링크는 확인되지만 이번 조사에서 PR Diff·병합 상태는 검증하지 못했다.
- **신규성:** `agents.compaction.model`에 설정한 모델은 해석되지만 로컬 Provider가 중지돼 `ECONNREFUSED`가 나는 경우, 수동/자동 Compaction이 반복 실패하고 정상적인 세션 모델로 돌아가지 않아 Context가 계속 커지는 사례. 유지보수 응답에 따르면 문서의 Fallback은 **모델 해석 실패**에 한정되며 **실행 시점 Provider 장애**는 현재 범위 밖이다. 이 구분이 새 운영상 발견이다.
- **내부 동작:** 모델 해석(Resolve)과 요청 실행(Transport)이 다른 실패 단계. Compaction 실패가 반복될 때 요약 결과가 커밋되지 않고 다음 세션 호출에서 길이 제한을 맞을 수 있다.
- **토큰/비용 원리:** 유효하지 않은 Compaction 반복 호출 및 Context 초과 후 재시도를 예방할 가능성이 있다. **실측 절감률 없음.** 다른 모델로의 Fallback은 비용·품질·개인정보 정책이 달라질 수 있다.
- **장점:** 작업 연속성, 세션 생존성. **단점:** 무제한 자동 Fallback은 승인되지 않은 Provider에 사내 로그가 전송될 위험; 실패 유형이 인증/정책 거부일 때 자동 우회하면 안 됨.
- **Perforce·Claude Code·Codex 적용:** Compactor Adapter가 `model_resolved`, `provider_health`, `failure_class`, `fallback_allowed`를 기록. `ECONNREFUSED`/Timeout은 허용된 Provider 내에서만 최대 1회 Fallback; 401/403/Consent 거부는 실패 종료. 요약 저장 전 기존 P4 CL, TeamCity Build ID, 승인 버전, Evidence Hash를 유지한다.
- **재현:** Local Compactor 서버 종료 → 긴 세션 Compaction 트리거 → 승인된 Session Model Fallback 1회 → 정상 Resume. 비허용 Provider로의 유출 0, 무한 Retry 0, 원본 세션 손상 0. 두 Provider 모두 다운이면 원본 Ledger 보존 후 명시적 실패.
- **평가:** **PoC 최우선**. 직접 OpenCode PR 채택은 병합·테스트 확인 전 보류.

## 2. OpenCode #64598 — Compaction Summary Template 검증 실패

- **원본:** https://github.com/anomalyco/opencode/issues/64598
- **발견 날짜/상태:** 2026-11-18 등록, OpenCode 2.3.0 관련 공개 이슈. 유지보수 측은 모델 접근이 없어 재현하지 못했다고 명시. 해결 확인 없음.
- **신규성:** 신고자는 `gpt-6.2-sol` 모델이 요약 텍스트를 반환했지만 필수 `SUMMARY_TEMPLATE` 헤딩이 일치하지 않아 Compaction이 실패했다고 보고. 새 세션의 짧은 두 Prompt에서도 발생했다고 주장.
- **확인 가능한 수치:** 실패 기록의 출력 토큰 **2,787~3,133개**. 이는 낭비 가능성이 있는 호출당 출력 토큰이며, 청구액 또는 전체 실패율은 아님.
- **내부 동작:** 2.3.0 코드 설명에 따르면 반환 Text Chunk를 합쳐 적어도 한 줄이 템플릿의 `## Objective` 같은 헤딩과 **정확히 일치**해야 통과. 구조적 유효성을 단일 문자열 일치로 판단하는 계약이 모델 출력 변동에 취약할 수 있다.
- **토큰 절감 원리:** 생성 전 Structured Output 계약 강화, 유효성 검증, 제한된 Repair 또는 모델별 템플릿으로 실패 호출을 줄일 가능성. 검증 완화는 필수 정보 누락을 은폐할 수 있어 무조건 허용 금지.
- **장점:** 모델별 형식 불일치 관측, 재시도 비용 추적. **단점:** 출력이 형식만 맞고 의미상 잘못됐을 가능성, Repair 추가 호출 비용.
- **적용:** `summary_raw_sha`, `schema_version`, `validator_error`, `repair_attempts`, `tokens_wasted_on_failed_compaction`을 Receipt에 기록. 요약 커밋 전 Task Goal, P4 CL, Approval, Pending Tool Call, Evidence URI 등 필수 슬롯 검증.
- **재현:** 헤딩 누락/다국어 변형/빈 내용/큰 로그를 포함한 40개 Fixture. (A) 자유 형식, (B) JSON Schema, (C) Repair 1회 비교. 구조 통과율뿐 아니라 Evidence Recall, 비용, 재개 성공률 평가.
- **평가:** **바로 적용할 검증 원칙 / 모델별 구현 PoC**. 모델 자체의 일반적 결함으로 단정하지 않는다.

## 3. OpenCode #64560 / #64561 — Model Allowlist 및 Credential Provenance

- **원본:** https://github.com/anomalyco/opencode/issues/64560 ; https://github.com/anomalyco/opencode/issues/64561
- **발견 날짜/상태:** 2026-11-18 공개 기능 요청. 공식 구현·수정 완료 아님.
- **신규성:** V2의 구형 `whitelist`/`blacklist` 설정은 무시되고 개별 모델의 `disabled: true`로 숨기는 방식이라는 유지보수 응답. 신규 모델이 Catalog에 등장할 때 기본 허용 목록이 열릴 수 있는 거버넌스 문제. Desktop에서 환경 변수 자격증명과 저장 계정, CLI와 GUI의 모델 목록/프리셋이 다르게 보일 수 있다는 사용자 보고도 제기.
- **내부 동작:** Provider Catalog/Config/Runtime Credential이 서로 다른 상태를 소유. 알 수 없는 모델의 기본 Context 200,000 / Output 32,000 설정은 실제 모델 능력 보증이 아니며, 설정된 Preset이 적용됐는지도 별도 확인해야 한다.
- **토큰·비용 원리:** 허용되지 않은 모델 자동 선택, 잘못된 가격·Context Limit 가정, 실패 Fallback을 예방. **정량 절감 근거 없음.** 고정 Allowlist는 신모델 실험 속도를 낮출 수 있음.
- **Perforce·Claude Code·Codex 적용:** `allowed_model_ids`를 런타임 정책에서 강제; `requested_model`, `resolved_model`, `observed_model`, `credential_origin`, `pricing_source`, `policy_version`을 실행마다 기록. 실제 비밀 키 값은 로그에 남기지 않는다. `unknown_model`은 사내 데이터 전송 불가가 기본.
- **재현:** 신규 모델 Catalog 삽입, 저장 계정/환경변수 충돌, GUI/CLI 모델 선택 불일치, Model Context Limit 누락 4종 Fixture. 정책 밖 실행 0, 출처 불명 Credential 0, 비용 영수증의 모델 불일치 0을 합격 조건으로 한다.
- **평가:** **바로 적용할 거버넌스 원칙 / UI 기능 도입 가치 낮음**(실제 Connector 지원 확인 전).

## 4. Inspect AI #6638 — Reasoning Replay 손실 탐지 제안

- **원본:** https://github.com/UKGovernmentBEIS/inspect_ai/pull/6638
- **발견 날짜/상태:** 2026-11-18 열린 PR 목록에서 `feat(openai): warn when GPT-6.2 discards replayed reasoning, such as after edit compaction` 제목 확인. **Diff/Tests/병합 여부는 확인하지 못했으므로 구현 완료로 분류하지 않음.**
- **신규성:** Edit Compaction 이후 Replayed Reasoning이 Provider 경계에서 폐기될 수 있는 상황을 경고 대상으로 명시. 이전 Scout의 History/Replay Integrity 논의를 계측 관점으로 구체화할 신규 신호다.
- **내부 동작/절감 원리:** Replay를 전송했다는 사실과 모델이 유효하게 수용했다는 사실을 분리해 확인해야 한다. 경고는 직접적인 토큰 압축이 아니라 잘못된 Context 가정으로 인한 재작업과 품질 회귀 탐지 목적. Provider가 Reasoning 수용 여부를 어떻게 노출하는지는 이번 조사에서 확인하지 못했다.
- **Trade-off:** 경고 과다/Provider별 신호 차이, Thinking 비공개 데이터 취급, 모델별 호환성 테스트 비용.
- **적용:** `reasoning_replay_attempted`, `replay_acceptance_observed`, `compaction_generation`, `continuity_test_result`를 Ledger에 별도 기록. Hidden Reasoning 자체를 저장하지 않고 공개 가능한 Receipt와 Task Evidence만 보존.
- **재현:** 편집 Compaction 전후 동일 Task 30개에서 Replay Enabled/Disabled와 Evidence Recall, Tool ID 정합성, 최종 검증 성공률 비교. 검증되지 않은 Replay는 연속성 보증으로 취급하지 않음.
- **평가:** **아이디어 참고 / PR 검증 후 PoC**.

## 5. 범주별 Scout 체크리스트

| 범주 | 오늘 새롭게 확인된 근거 / 판단 |
|---|---|
| Coding-agent workflow, orchestration | Compaction 실패를 독립 Task 상태로 관리하는 실험 후보 |
| Skills/hooks, progressive disclosure | 신규 병합 구현·측정 확증 없음 |
| Context pruning/compaction | #64553 런타임 Fallback, #64598 형식 검증 실패 |
| Sub-agent context isolation | 오늘 별도 신규 실측 없음; 기존 Child Checkpoint/Outbox 반복 소개 제외 |
| RAG/검색 selective context | 신규 검색 품질 Benchmark 확인 없음 |
| Prompt/Skill 경량화 | 신규 토큰 절감 실측 없음 |
| Tool output 축약 | 기존 11/17 대형 Output 사례 반복 제외; 요약 입력 예산 가드 유지 |
| Cache | 신규 Cache Hit/Provider 비용 A/B 실측 없음 |
| Session/handoff/ledger | 실패 Compaction을 원자적으로 커밋, 기존 Session/Evidence Ledger 유지 |
| Model routing | Model Allowlist, Credential Provenance, Runtime Provider Health 분리 |
| Token/cost 측정 | 실패 Compaction의 2,787~3,133 출력 토큰 사례, 비용은 미확정 |
| Durable state | 실패 요약이 원본 History를 손상시키지 않도록 Atomic Commit |
| Runtime adapter | Resolve/Transport/Schema/Replay 단계별 계약 검사 |
| Evidence verification | 요약 이후 P4 CL·Build ID·승인·근거 URI 보존 검사 |
| Task lifecycle | `compaction_requested → model_resolved → generating → validating → committed` 및 실패/제한 Fallback 분기 |

## 6. 통합 실험 계약 — Compaction Reliability Gate

```json
{
  "task_id": "string",
  "session_id": "string",
  "compaction_generation": 0,
  "model_requested": "string",
  "model_resolved": "string",
  "model_observed": null,
  "provider_health": "healthy|unreachable|unauthorized|unknown",
  "failure_class": "resolve|transport|schema|policy|replay|null",
  "fallback_attempts": 0,
  "fallback_allowed": false,
  "schema_version": "string",
  "raw_summary_sha256": null,
  "evidence_manifest_sha256": "string",
  "approval_version": null,
  "p4_cl": null,
  "teamcity_build_id": null,
  "input_tokens": 0,
  "output_tokens": 0,
  "cache_read_tokens": 0,
  "cache_write_tokens": 0,
  "provider_billed_cost": null,
  "verified_resume": false
}
```

**비교군:** (A) 현재 Compaction, (B) Health Gate+허용 모델 Fallback, (C) Schema Validation+1회 Repair, (D) B+C. 동일 40개 Session Fixture × 3회, Provider 장애/정책 거부/형식 누락/History Replay 손상 주입. 평가 지표는 `verified_resume_rate`, `evidence_recall`, `provider_billed_cost_per_verified_resume`, `failed_compaction_tokens`, `P95_latency`, `unauthorized_provider_calls`이다. 품질 기준: 근거·승인 누락 0, 정책 위반 0, 무한 재시도 0. 비용 절감률은 실제 Provider 청구 영수증을 확보하기 전까지 발표하지 않는다.

**실행 우선순위:** ① Compaction Atomic Commit/Schema Gate(바로 적용 원칙) ② Provider Health Fallback(PoC) ③ Model Allowlist/Observed Model Receipt(바로 적용 원칙) ④ Reasoning Replay 경고(아이디어 참고).

## 7. 확인 범위·한계·중복 제거

- **확인한 기존 Wiki:** 2026-11-18 Scout 전체 원문을 develop에서 직접 조회했으며, 11/17 이전 Scout의 항목은 해당 원문의 중복 제거 기록 및 앞선 보고서와 대조했다. 11/18의 gh-aw Audit, gh-aw v1.2.3, OpenCode #64304는 신규 항목에서 제외했다.
- **신규 원본:** 11/18 OpenCode 공개 이슈 #64553, #64598, #64560, #64561; Inspect AI PR #6638의 제목·열린 PR 목록. OpenCode #64554는 관련 PR 링크만 확인. GitHub 릴리스 페이지에서 gh-aw v1.2.3(11/13)을 확인했으나 오늘 신규 릴리스로 재분류하지 않았다.
- **제약:** GitHub PR Diff/Commit/Benchmark 전수 검토 미완료. 일부 GitHub 페이지 직접 열기 실패로 이슈의 공개 검색 스니펫과 PR 목록에 근거했다. 실제 사내 Perforce/TeamCity 환경에서 실험하지 않았다. **오늘 신규로 독립 검증된 동일 품질 작업당 Provider 청구액 절감률은 없다.** 확인된 장애 사례는 일반적 재현율이나 모든 모델의 문제로 확대하지 않는다.

## 원본 링크

- https://github.com/anomalyco/opencode/issues/64553
- https://github.com/anomalyco/opencode/pull/64554
- https://github.com/anomalyco/opencode/issues/64598
- https://github.com/anomalyco/opencode/issues/64560
- https://github.com/anomalyco/opencode/issues/64561
- https://github.com/UKGovernmentBEIS/inspect_ai/pull/6638
- https://github.com/github/gh-aw/releases/tag/v1.2.3
- https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-18.md
