---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-17"
category: trend
updated: 2026-11-17
tags: [ai-harness, context-engineering, compaction, runtime-adapter, evidence-verification, security, perforce, claude-code, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-11-17

> 조사 시점: 2026-11-17 06:03 KST 이후. 주 관찰 구간: 2026-11-16 UTC. jaywapp/wiki develop의 11/15·11/16 Scout 원문과 비교했다. **새롭게 확인한 것은 주로 재현 가능한 장애 보고 및 11/16 수정 상태이며, 신규 정식 릴리스·독립 검증된 토큰 절감 성과로 해석하지 않는다.**

## 0. 요약 및 신규성 판단

이번 Scout에서 중복 없이 검토할 가치가 있는 항목은 (1) Open WebUI의 대형 Tool Output Compaction 실패 및 dev 수정 보고, (2) Codex Desktop의 Browser Ambient Context를 잘못된 Responses Tool Result로 직렬화해 세션이 영구 실패하는 회귀 보고, (3) Claude Code Windows 자동 승인 환경의 Host 자원 격리 검증, (4) OpenCode Plan Mode의 Shell 경유 쓰기 우회 보고다.

11/16 Scout의 '신규 확증 없음'과 달리, 오늘은 **11/16 날짜에 수정되었다고 Maintainer가 명시한 Compaction 결함**과 **11/16 등록된 신규 회귀/안전성 이슈**를 확인했다. 다만 이슈의 수정 설명과 릴리스 배포 확인은 별개다. **새로운 Provider 청구 비용 절감률은 확인되지 않았다.**

| 항목 | 날짜 및 근거 | 판정 |
|---|---|---|
| Open WebUI #34434 | 11/14 신고, 11/16 maintainer가 dev의 두 결함 수정 확인 | 바로 적용 원칙 / PoC |
| Codex #61770 | 11/16 신규 이슈, Codex App 0.169.0-alpha.11.1 사용자 재현 | PoC 최우선 |
| Claude Code #110393 | 11/16 신규 이슈, Windows 38개 통제 시나리오 | 바로 적용 보안 원칙 |
| OpenCode #64121/#53955 | 11/15 신고, 11/16 기존 이슈로 중복 종료 | 바로 적용 보안 원칙 |

## 1. Open WebUI #34434 — Compaction 성공 신호와 실제 Context 크기 불일치

- 원본: https://github.com/open-webui/open-webui/issues/34434
- **신규성:** 2026-11-16 Maintainer가 dev에서 두 부분이 수정됐다고 댓글로 확인: Tool Result로 끝난 응답도 Compaction 임계치에 포함, 실패한 응답 후 /compact 요약을 다음 메시지에서 유지. 이슈는 완료로 종료됐지만 릴리스 버전 배포는 확인하지 않았다.
- **재현:** v0.13.3, 16개 메시지·73개 Tool Call·Tool Output 23.28MB(단일 출력 22.22MB), 1,048,576-token Context 모델에 13,805,822-token 요청으로 HTTP 400. /compact 성공 응답 후에도 다음 요청 약 13.5M 토큰. Reporter의 dev 모듈 실험은 usage anchor 342,787 대 실제 추정 6,241,247 토큰 불일치, boundary=0에서 원본 유지, Tool/Memory/RAG 후주입 누락을 설명한다.
- **내부 동작 및 원인:** 첫 usage anchor만 확인하는 임계치, 요약 모델에 전체 History 재전송, 메시지 개수 기반 retention, 단일 Tool Result 무제한, 요약 체크포인트 반영 누락이 복합 작용. Dev에서 수정됐다는 부분과 아직 미확인인 per-message cap·post-injection guard를 구분해야 한다.
- **토큰 절감 원리:** Tool Result를 먼저 오프로드하고, 실제 Provider 전송 직전 최종 토큰 예산을 검사하며, 실패 시 요약 결과가 다음 턴에 유지되도록 한다. 이는 **비정상적으로 큰 요청을 방지**하는 것이며 실측 비용 절감률이 아니다.
- **장점:** 400 실패/재시도 및 거대한 Tool Output 재전송 방지. **위험:** 8k-char trim, 40k-token chunk는 Reporter의 제안값이며 정답 Evidence 누락 가능성, Summary 호출 비용 및 지연 증가. 11/16 수정이 모든 실패 모드를 해결했다는 근거 없음.
- **P4·UE5·TeamCity 적용:** Tool Output을 Artifact Store에 SHA-256과 원본 byte range로 보존하고 모델에는 8KiB Preview+retrieval handle을 전달. Compaction 전·후, RAG/Skill/Tool Schema 주입 후 모두 실제 토큰 예산 검사. 22MB 로그·73 Tool Call 및 단일 5MB 출력 재현, HTTP 400=0, Evidence 원본 복구=100%, 요약 재시도 비용 계측.
- **평가:** **바로 적용 원칙 / PoC**. Open WebUI를 도입하라는 뜻이 아니라 Harness의 Compaction 실패 조건을 회귀 테스트로 이식한다.

## 2. Codex #61770 — Runtime Adapter의 Tool Call/Output 계약 위반으로 Durable Thread 오염

- 원본: https://github.com/openai/codex/issues/61770
- **신규성:** 11/16 신규 이슈. Windows Codex App bundled core 0.169.0-alpha.11.1, custom Responses Provider, 인앱 Browser 활성화 환경의 사용자 재현. 해결된 릴리스 아님.
- **내부 동작:** Ambient Browser UI 상태가 원래 User/Context 메타데이터여야 하는데, rollout에 `function_call_output`으로 저장되고 `call_id`가 없다. Strict Responses Provider는 400 `call_id is required` 반환. 영속 History에 잘못된 항목이 남아 이후 모든 재시도도 동일하게 실패한다. 신고자는 같은 장치에서 2/2 재현, Browser Tab을 닫은 뒤 새 History는 성공했다고 보고한다.
- **절감 원리:** 직접 압축 없음. Provider로 보내기 전 Adapter가 Tool Output ↔ Tool Call ID를 검증하고 부적합한 Ambient Context를 별도 메시지로 매핑하거나 격리하면 반복 실패·재전송을 방지할 수 있다. **비용 절감량 미측정**.
- **장점:** Session/Handoff의 복원 가능성·프로토콜 정합성 개선. **위험:** 무조건 Drop하면 Browser Context가 사라져 품질 저하; 자동 복구가 감사 원본을 변경할 수 있으므로 원본 append-only ledger 유지 필요.
- **P4·Claude Code·Codex 적용:** Runtime Adapter에 `validate_response_items()` 구현. `function_call_output`은 선행 `function_call.call_id` 존재 필수, 외부 Ambient Data는 별도 `context_attachment`에 저장. 불일치 발견 시 새 Provider 호출 전에 격리·이벤트 기록, 원본 해시 보존, 복구 가능한 Fork 생성. 100개 Synthetic Session 중 잘못된 10개를 삽입해 오염 재생 0건, 원본 Evidence 누락 0건, 중복 P4 Submit 0건 확인.
- **평가:** **PoC 최우선**. 11/13~14의 History Retention·Session ID 연구와 달리 **실제 프로토콜 계약 위반으로 지속적인 400이 발생하는 회귀**라는 점이 신규성.

## 3. Claude Code #110393 — Windows 자동 승인과 Host Boundary

- 원본: https://github.com/anthropics/claude-code/issues/110393
- **신규성:** 11/16 등록된 외부 연구자의 통제 시나리오 38개. 신고자는 정의된 대상 효과가 36/38에서 발생했다고 보고. 이는 자동 승인(auto), sandbox none, Claude Code 2.1.314, Windows 11, DeepSeek Pro 구성의 결과이며 **기본 Claude Code의 모든 구성에 일반화할 수 없다**.
- **내부 동작:** Shell/프로세스 실행 권한이 승인되면 카메라 접근, 창 조작, 프로세스 종료 등 OS 자원 변경이 가능. Model Prompt의 '하지 말라'는 지시와 실제 OS Capability 경계는 다르다.
- **토큰 효과:** 직접 절감 없음. 안전한 격리로 사고·재실행을 줄일 가능성은 있으나 비용 수치 없음.
- **장점/단점:** 별도 OS 계정, VM/컨테이너, 최소권한 Token, 위험 명령 승인 게이트는 사고 범위를 줄이지만 설정·실행 비용과 작업 편의성 저하.
- **P4 적용:** 자동 Agent는 기본 Read-only P4 계정, Submit/Workspace Write/Build Cancel/Process Kill을 별도 승인된 실행자에게 위임. Windows Sandbox 없음+auto approval 조합을 사내 기본값으로 채택하지 않는다. 권한 거부·허용 매트릭스와 명령/효과 Audit를 수집.
- **평가:** **바로 적용 보안 원칙**. 해당 연구는 제품 보안 결함의 확정 판정이 아니라 명시된 설정에서의 재현 증거다.

## 4. OpenCode #64121/#53955 — Plan Mode의 Shell 우회

- 원본: https://github.com/anomalyco/opencode/issues/64121
- **신규성:** 11/15 신고, 11/16 기존 #53955의 중복으로 종료. 별도 신규 수정 PR은 확인하지 못했다.
- **내부 동작:** Plan Mode의 Write Tool 제한과 Shell 실행 권한이 별도로 관리되면 Shell heredoc/명령으로 파일 변경 가능. 특히 Windows 관리자 권한·드라이브 루트 Workspace는 위험을 키운다.
- **토큰 효과:** 직접 절감 없음. 보안 정책 위반으로 인한 재작업/검증 비용을 방지할 수 있으나 실측 없음.
- **적용:** Plan/Review Agent에서 `shell` action을 기본 Ask 또는 Deny로 제한하고 P4 Submit, 파일 쓰기, 레지스트리 변경, 프로세스 종료는 Tool 종류와 무관하게 Capability Policy에서 검사. 읽기 전용 모드의 Shell 우회 회귀 테스트.
- **평가:** **바로 적용 보안 원칙**. 중복 종료를 해결 완료로 해석하지 않는다.

## 5. 범주별 중복 제거 및 변화 판정

| 조사 범주 | 이번 신규 확증 |
|---|---|
| Coding-agent workflow/orchestration | Runtime Adapter의 History Replay 계약 위반 실증 |
| Skills/hooks/progressive disclosure | 신규 구현 확증 없음 |
| Context pruning/compaction | Tool-heavy History 실패 재현 및 dev 수정 설명 |
| Subagent context isolation | 신규 구현 확증 없음 |
| RAG·검색 기반 selective context | RAG 후주입 토큰 계산 누락 위험, 새 검색 알고리즘 아님 |
| Prompt/Skill 파일 경량화 | 신규 구현 확증 없음 |
| Tool Output 축약 | 단일 22.22MB Tool Result로 실패한 사례 |
| Cache | 새 Cache 효율 벤치마크 없음 |
| Session/handoff/ledger | Durable History에 불법 Tool Result가 영구 기록되는 사례 |
| Model routing | 신규 구현 확증 없음 |
| Token/cost 측정 | 13.8M-token 실패 요청 관측, Provider 청구액 확인 안 됨 |
| Durable state/runtime adapter/evidence verification/task lifecycle | Schema Guard, Replay Quarantine, Host Capability Gate의 검증 과제 |

11/15 Headroom, 11/13 Strands Offload, 11/14 Guardian Evidence, 11/12 BM25 Tool Search를 신규 기능으로 재소개하지 않았다. 오늘 항목은 **실패 조건과 복구 계약의 새 증거**다.

## 6. 실험 우선순위와 측정 규칙

1. **P0: Final Payload Budget Guard.** 22MB Tool Result와 RAG/Skill 후주입을 재현. 실제 Provider 직전 `input_tokens_estimate <= model_limit - reserved_output - safety_margin` 강제. 초과 시 Artifact Offload 후 재계산. 실패 400=0, 원본 Evidence 보존 100%.
2. **P0: Responses Adapter Contract Test.** Tool Call 없는 Tool Result·중복 call_id·순서 역전·중단 재개를 100개 세션에서 검사. Provider 400=0, 원본 Ledger 해시 불변, 복구된 Fork만 실행.
3. **P0: P4 Least-Privilege Executor.** Plan/Reviewer는 Read-only, Submit/Cancel/Write는 Approval Version·Idempotency Key 검증 후 별도 실행. 승인 없이 부작용 0건.
4. **P1: 비용 A/B.** 원본/Preview+Retrieve/Compaction 세 군으로 90개 UE5·TeamCity·P4 로그 비교. Worker/Reviewer/Compactor/실패 재시도 포함 실제 Provider 청구액과 성공률, Cache Read/Write, P95 Latency, Evidence Recall 측정. `verified_task_cost = sum(provider_billed_cost) / verified_completed_tasks`; 실패 비용도 분자 포함. **10% 비용 감소·품질 저하 0%p는 내부 합격 목표이며 측정 성과 아님.**

## 7. 확인 범위와 한계

이번 조사는 GitHub 이슈 본문·재현 절차·유지보수자 댓글, 기존 Wiki 원문을 중심으로 했다. 모든 저장소의 11/16 전체 commit/merged PR/diff/CI를 전수 열람하지 않았고, Open WebUI dev 수정 commit SHA나 정식 릴리스 포함 여부도 확인하지 못했다. Codex/Claude Code/OpenCode 이슈는 신고자의 재현 결과이며 독립 사내 재현을 수행하지 않았다. **새로운 독립 검증 Provider 비용 절감률·모델 품질 개선 수치는 없다.**

## 원본 링크

- https://github.com/open-webui/open-webui/issues/34434
- https://github.com/openai/codex/issues/61770
- https://github.com/anthropics/claude-code/issues/110393
- https://github.com/anomalyco/opencode/issues/64121
- https://github.com/anomalyco/opencode/issues/53955
- https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-16.md
- https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-15.md
