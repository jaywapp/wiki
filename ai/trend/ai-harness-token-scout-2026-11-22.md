---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-22"
category: trend
updated: 2026-11-22
tags: [ai-harness, token-cost, provenance, compaction, mcp, task-lifecycle, perforce, claude-code, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-11-22

> 조사 기준: 2026-11-22 06시 KST 전후, 11월 21일 UTC 공개 이슈 중심. jaywapp/wiki develop의 11/21 Scout 원문을 직접 확인하고 중복을 제외했다. **오늘은 신규 병합된 최적화 알고리즘 또는 독립적으로 입증된 Provider 비용 절감률을 확인하지 못했다.** 아래는 신규 공개 재현 이슈와 제안으로, 수정 릴리스가 아니다.

## 0. Executive summary

오늘의 의미 있는 신규 신호는 (1) Memory Evidence가 우선순위 적용 전에 잘리는 선택 순서 결함, (2) Compaction 뒤 옛 사용자 지시가 최신 지시처럼 재전송되는 Provenance 소실, (3) Background Shell의 완료 상태가 영속 Tool Part에 반영되지 않는 Lifecycle 불일치, (4) Codex MCP 대규모 Catalog의 비결정적 Discovery 지연, (5) 모델별 Background Tool 결과 경계 오인으로 인한 허구 출력, (6) Code Mode Hook의 내부 Tool 호출 관측 공백이다.

**권장 우선순위:** Evidence-first Selective Context → Compaction Provenance Tag → Durable Tool State Reconciliation → MCP Catalog Cache/Telemetry → Runtime Model Boundary Contract. 신규 토큰 절감의 직접 실측은 없으며 장애/재작업 예방의 잠재적 비용 효과만 있다.

## 1. Codex #63024 — Memory v2: 8 MiB Recency Cap이 Human Evidence를 선제 제거

- 원본: https://github.com/openai/codex/issues/63024
- 신규성/상태: 11/21 공개된 구체적 소스/Commit 기반 문제 제기. Memory v2의 provenance-tiered selection #43799 (commit `6924ce636b2186948f2332ac9460b5871b50aa2f`)과 공통 recent-rollout reader #53940 (commit `5670b1c18e861e5f89bafaff768b86ed579edd81`) 사이 선택 순서 충돌. 수정 병합은 미확인.
- 내부 동작: 전체 rollout → **최신부터 8 MiB 바이트 제한** → Human > Final > OtherAgent > Commentary > Context > Tool 우선순위 → Stage 1. Tool Output이 최신 8 MiB를 채우면 오래된 사람의 정정·승인·결정은 우선순위 평가 기회조차 받지 못한다. 모델 단계가 정상 완료돼도 결과가 불완전한 Silent Evidence Loss.
- 토큰 원리: 단순 recency cap은 입력 크기를 줄이나 중요한 근거를 버려 재탐색/오답 비용 증가 가능. **source-tier별 quota 또는 Human/Approval/Final을 먼저 보존한 뒤 잔여 예산에 Tool을 채우는 구조**로 같은 Context 예산에서 정확도를 높이는 것이 목표. 절감률 실측 없음.
- 장단점: Evidence Recall 향상 / 우선순위 Index·메타데이터·스캔 비용 증가, 긴 Human 메시지의 별도 상한 필요.
- 적용: P4 CL 승인·Build ID·사용자 지시를 별도 Evidence Ledger에 영속 저장. 8 MiB/토큰 Budget 이전에 `source_type, timestamp, authority, task_id, evidence_hash`로 Tier를 구분. Claude Code/Codex Context Builder에 pinned decisions를 선주입.
- 재현: 오래된 Human 정정 20건 + 최신 10 MiB TeamCity 로그, A=recency-only B=tier-first. `human_decision_recall=100%`, `stale_decision_replay=0`, 동일 입력 Budget, 비용·latency 측정.
- 평가: **PoC 최우선**. 기존 Compaction 누락 이슈와 달리 *우선순위 전에 잘리는 prefilter* 결함이다.

## 2. Codex #63017 — Compaction 이후 과거 사용자 메시지의 시점·출처 소실

- 원본: https://github.com/openai/codex/issues/63017
- 신규성/상태: 11/21 신고, Codex 0.171.0 + Mock Responses Endpoint로 compaction 강제 후 Request Body 확인. 패치 병합 미확인.
- 내부 동작: Compaction 이후 Summary와 함께 이전의 실제 user 메시지가 원문 `message/user`로 재전송되지만, 이 메시지가 **compaction 이전의 오래된 요청**이라는 시간/경계 마커가 없다. 이미 처리하거나 철회한 `restore X` 명령을 최신 요청으로 오해해 재실행할 수 있다.
- 토큰 원리: 반복 보존 메시지의 비용보다 **옛 작업을 재실행하는 Side Effect/Token 비용**이 위험. Boundary-aware wrapper는 몇 토큰 증가하더라도 잘못된 재작업을 줄일 가능성. 실측 비용 없음.
- 장단점: Provenance 정확성/안전성 향상 / Wrapper 추가 토큰, 기존 모델·Prompt 호환성 검증 필요.
- 적용: `message_origin=historical|current`, `compaction_epoch`, `superseded_by`, `instruction_status=active|fulfilled|revoked`를 별도 Durable Handoff Ledger에 보존. P4 Submit·Reset·Build Cancel은 현재 Turn의 명시적 승인 없이 과거 메시지로 재실행 불가.
- 재현: Turn 1 파괴적 요청, Turn 2 철회, 강제 Compaction, Turn 3 상태 조회. A=원문 Replay B=역사 메시지 표시+권한 Gate. 오래된 지시 재실행 0, 승인 누락 0.
- 평가: **바로 적용 원칙 / Codex Adapter PoC**. 11/19의 요약 템플릿 검증과 다른 **Instruction Temporal Provenance** 문제.

## 3. OpenCode #65438 — Background Shell의 Persisted State가 영구 Running

- 원본: https://github.com/anomalyco/opencode/issues/65438
- 신규성/상태: 11/21 공개 신고. Background Shell 완료 알림은 별도 메시지로 저장되지만 최초 Tool Part의 `metadata.status="running"`이 갱신되지 않는 사례. 공식 수정 확인 못함.
- 내부 동작: `shell id=...` 완료(종료 코드 포함) 후에도 원래 Tool Part는 Running. Compaction/Resume가 최초 Part를 보고 완료된 테스트를 실행 중으로 요약; 이미 실패/성공한 Build를 다시 대기하거나 중복 실행할 수 있다.
- 토큰 원리: Polling·재요약·중복 Tool Call 감소 가능성. 완료 이벤트 Reconciliation 비용 발생. 실측 절감 없음.
- 장단점: Task Lifecycle의 사실 일치 / Eventual Consistency·중복/순서 뒤집힘 처리 복잡성.
- 적용: `tool_execution_id`를 키로 Append-only `started, backgrounded, completed, failed, verified` Event Ledger. Resume 시 최신 이벤트를 Fold해 단일 Truth State를 구성하고 외부 TeamCity Build ID와 대조. 완료 이벤트가 있어도 결과 Artifact/Evidence를 검증하기 전 `verified`로 승격하지 않음.
- 재현: 100개 Shell Job × 완료/실패/취소/중복 이벤트/부모 종료, Reconciliation 후 잘못된 Running 0, 중복 Trigger 0, Evidence 누락 0.
- 평가: **PoC 최우선**. 11/20의 병렬 파일 변경 유실과 다른 **완료 상태 투영 불일치**다.

## 4. Codex #63019 — 976개 MCP Tool Catalog의 비결정적 Discovery 지연

- 원본: https://github.com/openai/codex/issues/63019
- 신규성/상태: 11/21 공개, Codex Desktop 26.1117.41037, bundled CLI 0.171.0-alpha.13, macOS. 단일 신고자 로그 측정이며 원인 미확정.
- 내부 동작/측정: Mac mini 초기 Catalog Load **22.854초**, 그 중 `mcpServerStatus/list` **12.833초**, 후속 동일 창 Load **274ms**. MacBook 로컬에서 MCP Client 7개 초기화 이후 Catalog 완료까지 **3.65~4.19초**, 별도 요청은 마지막 초기화 후 **5ms**. Inventory는 976개. 공통 Request ID가 없어 일부 지연 귀속 불가.
- 토큰 원리: Tool 정의 전부를 모델에 주입하면 Context 비용이 커질 수 있으나 **이 이슈의 실측은 UI/Discovery Latency**이고 Token 절감 근거는 아니다. Tool Search와 Catalog Fingerprint Cache를 결합할 PoC 동기는 있음.
- 장단점: Discovery 선택적 로딩/Cache로 시작 시간 개선 가능 / Stale Tool Schema, 권한별 Cache 오염 위험.
- 적용: MCP Server별 `schema_hash, auth_scope, ttl, last_refresh, request_id`를 저장하고 Tool Search 결과 상위 N개만 모델에 노출. Codex/Claude Code에서 Cold/Warm Startup과 `tool_schema_tokens`를 별도로 계측. 서버 Capability 변화는 TTL 만료/명시적 Invalidation.
- 재현: 7개 Server/976개 Tool Fixture, Cold/Warm 각 30회, P50/P95 Catalog Latency, Token Count, Tool Selection Accuracy, Auth Scope Leak 0.
- 평가: **PoC**. 11/14의 선택적 Discovery 일반 원칙을 반복하는 것이 아니라 **실제 대규모 Catalog 지연 데이터**가 신규 근거.

## 5. OpenCode #65444 — Background Tool Boundary 오인과 허구 Tool Output

- 원본: https://github.com/anomalyco/opencode/issues/65444
- 신규성/상태: 11/21 공개. 신고자는 약 50세션 중 특정 모델(gemini-4-neon)에서 Assistant가 문자열 `user`와 가짜 Shell/Subagent 완료 태그를 생성해 Max Tokens까지 계속 출력하는 사례를 보고. 310개 메시지 중 20개 영향(13개 Background Shell 대기 후, 6개 Subagent 대기 후). 비교 모델에서는 242/130/105/91개 메시지에 동일 현상 0개로 보고. 샘플·워크로드 차이와 신고자 편향으로 일반 모델 우열 결론 불가.
- 내부 동작: 실제 Tool Completion과 모델이 생성한 텍스트 태그가 섞일 때 Runtime이 Text를 완료 이벤트로 믿거나 모델이 Turn Boundary를 오인할 위험. 최대 한 메시지 65,420 출력 토큰·약 166KB라는 신고.
- 토큰 원리: 비정상 생성 조기 종료·Tool Event 서명 검증·출력 Budget 상한으로 낭비 방지 가능. 제공된 수치는 발생 횟수/출력량이지 절감 실험이 아님.
- 장단점: 품질·비용 폭주 억제 / 정상 긴 응답 조기 종료 위험, Provider별 Formatting 차이.
- 적용: Runtime Adapter에서 Tool Completion은 `trusted_tool_event`만 인정, Assistant Text 내 가짜 XML 태그는 데이터로 처리. Model Routing에 Background Job Capability/Fixture 통과 여부 추가, `max_output_tokens`와 Per-turn Deadline 상한.
- 재현: 5개 모델 × Background Shell/Subagent 완료/중단/지연 Fixture 30회. Fake Event Acceptance 0, 정상 완료율·실제 비용 비교.
- 평가: **PoC**. 기존 11/21 Shell Timeout과 달리 **Model/Runtime Boundary와 출력 폭주** 문제.

## 6. Claude Code #111575 — Code Mode Hook가 내부 Tool Read를 관측하지 못함

- 원본: https://github.com/anthropics/claude-code/issues/111575
- 신규성/상태: 11/21 신고. Code Mode 스크립트 내부 Tool Call이 Script 종료 후 Transcript에 기록되어 PreToolUse Hook가 앞선 Read를 보지 못하고, `file(path).text()`도 Read Hook 이벤트를 내지 않는다고 주장. 약 900 REPL Call 중 실패의 주요 원인이라는 신고자 정성 평가(정확한 실패율 없음). 수정 미확인.
- 내부 동작: Hook의 Policy Check가 Transcript/Hook 이벤트에 의존하는데 내부 실행 순서와 관측 가능한 기록의 Commit 시점이 달라 Read-before-Edit 불변식이 깨짐. 실패한 Script의 일부 파일 변경은 이미 적용될 수 있음.
- 토큰 원리: 거짓 차단으로 인한 Retry 감소 가능. 이벤트 로깅/Policy Gate 오버헤드 증가. 절감률 미검증.
- 장단점: 정책 일관성/재현성 향상 / Tool Event Volume 증가, Hook 재진입 위험.
- 적용: Claude Code Hook에 의존하는 승인 Gate 외에 Wrapper 레벨 `read_evidence` Ledger와 Write Interceptor를 배치. P4 Workspace에서 Script Transaction의 변경 파일 목록/Hash를 기록하고 실패 시 별도 Reconcile. Shell Plan Mode도 OS Sandbox 권한으로 강제.
- 재현: Read→Edit 동일 Script, file.text Read, Read-only Pipeline, 중간 실패 Script 4종 × 30회. False Denial 0, Unauthorized Write 0, Partial Edit 식별 100%.
- 평가: **PoC**. Hook 설정만으로 실행 안전성이 완성된다고 가정하지 않는다.

## 7. 기타 관찰 및 제외

- Codex #63027 (https://github.com/openai/codex/issues/63027): MCP 2026-07-28 Lifecycle 기본 활성화 요청. 신고자는 0.171.0에서 Feature가 UnderDevelopment/기본 Off라고 확인. **새 기능 릴리스가 아닌 제안**이므로 **아이디어 참고**. 2025/2026 Protocol Negotiation Contract Test 후보.
- OpenCode #65447 (https://github.com/anomalyco/opencode/issues/65447): ECONNREFUSED Subagent 10회 재시도로 약 78~92초 지연 신고. 실패 유형별 Retry Classification/Backoff 상한을 **바로 적용 원칙**으로 평가. 실제 토큰 절감량 미측정.
- Deep Agents #7920 (https://github.com/langchain-ai/deepagents/issues/7920): 예상 가능한 `glob path_not_found`를 ERROR로 로깅. Context/Cost 측면 정량 근거 부족으로 **도입 가치 낮음**(Logging Hygiene 참고).
- OpenCode #65442 Plan Mode Shell Write Bypass는 11/17 기존 Plan Mode Shell 우회 사례와 중복되어 제외.
- 신규 정량 Benchmark/PR Merge/공식 릴리스 검증은 제한적이다. 이슈의 단일 신고를 전체 제품 상태로 일반화하지 않는다.

## 8. 범주별 Scout Coverage

| 범주 | 신규 근거/오늘 판단 |
|---|---|
| Coding workflow/orchestration | Background Shell 상태 Fold, Runtime Model Boundary |
| Skills/hooks/progressive disclosure | Claude Code Hook Read 이벤트 공백; 신규 Skill Progressive Disclosure 실측 없음 |
| Pruning/compaction | Codex Historical User Provenance, Memory 8 MiB Prefilter |
| Subagent isolation | Background Tool Text vs Trusted Event 분리 |
| RAG/selective context | Tier-first Evidence Selection PoC; 새 RAG Retrieval Benchmark 없음 |
| Prompt/skill 파일 경량화 | 새 검증 수치 없음 |
| Tool output 축약 | Tool Output 8 MiB 오염의 우선순위 역전; 압축률 신규 검증 없음 |
| Cache | MCP Catalog Schema Fingerprint PoC; Prompt Cache 신규 절감 검증 없음 |
| Session/handoff/durable state | Historical Instruction Epoch, Tool Completion Ledger |
| Model routing | Background Tool Compatibility Fixture |
| Token/cost | Abnormal 65,420 Output Tokens 신고; 실제 Provider 청구 절감률 없음 |
| Runtime adapter/evidence verification | Tool Event 신뢰 경계, P4/TeamCity 외부 상태 검증 |
| Task lifecycle | Running/Completed/Verified 3단계 구분 |

## 9. 재현 가능한 통합 실험 설계

**Baseline:** 동일 P4 CL/TeamCity Log/UE5 Build Fixture, 동일 Provider/Model/Temperature/품질 Rubric, Cold/Warm 분리. A=기존 Recency/Compaction, B=Evidence-first+Temporal Provenance, C=Durable Tool State Fold, D=MCP Schema Cache+Selective Tool Search, E=Trusted Tool Event+Model Routing.

**Fixture:** (1) 최신 10 MiB Tool Output와 과거 사용자 승인, (2) 과거 지시 철회 후 Compaction, (3) 완료된 Background Shell의 Running Tool Part, (4) 976개 Tool Discovery, (5) 가짜 Tool Completion 텍스트. 각 30회 이상, 장애 주입/프로세스 재시작 포함.

**계측:** `evidence_recall`, `historical_instruction_reexecution`, `orphan_running`, `duplicate_p4_submit`, `tool_schema_tokens`, `provider_input/output/cache_tokens`, `provider_billed_cost_per_verified_task`, `p95_latency`, `verified_task_completion`. Request ID/청구액 없는 호출은 Estimated로만 기록. Tool Output 원본은 Content-addressed Artifact에 저장하고 모델에는 Preview+Hash 제공.

**Safety Gate:** P4 Submit/Build Cancel/삭제는 독립 승인 토큰 및 External State Reconciliation 필수. 실제 Workspace Side Effect는 Sandbox에서만 테스트. 성공 메시지보다 Evidence Hash·실제 P4 CL/TeamCity ID·종료 코드가 우선.

## 10. 근거·한계

- 저장 전 2026-11-22 canonical 경로를 GitHub Connector `fetch_file(ref=develop)`로 조회해 **404 미존재** 확인. 11/21 Scout 원문을 직접 확인해 중복 항목 제외.
- GitHub Connector에서 Codex/OpenCode/Claude Code/Deep Agents 11/21 생성 이슈를 조회. Microsoft Agent Framework 검색은 GitHub API **422**로 조회 불가. 전체 저장소 Commit/PR Diff/Release 전수 감사는 하지 않았다.
- 위 수치는 신고자의 재현/로그 관측이다. 공식 패치 병합·독립 재현·실제 사내 환경 실측으로 주장하지 않는다.
- **오늘 새로 검증된 동일 품질당 Provider 비용 절감률: 없음.**

## 원본 링크

- https://github.com/openai/codex/issues/63024
- https://github.com/openai/codex/issues/63017
- https://github.com/anomalyco/opencode/issues/65438
- https://github.com/openai/codex/issues/63019
- https://github.com/anomalyco/opencode/issues/65444
- https://github.com/anthropics/claude-code/issues/111575
- https://github.com/openai/codex/issues/63027
- https://github.com/anomalyco/opencode/issues/65447
- https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-21.md
