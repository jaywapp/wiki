# AI Harness · Context/Token Optimization Scout — 2026-11-24

> 2026-11-24 KST 조사. 11/23 UTC 신규 GitHub 공개 이슈 중심. jaywapp/wiki develop의 11/23 Scout 원문을 확인해 중복을 제외했다. 신규 독립 검증 Provider 비용 절감률은 없다. 신고자 관측은 공식 수정·배포가 아니다.

## Executive summary
오늘 새롭게 주목할 것은 Codex encrypted reasoning의 직렬화 바이트 크기에 따른 compaction 실패, OpenCode 다중 터미널 세션 환경 덮어쓰기, 첫 Turn Plugin 지침 경합, Deep Agents truncation 안내의 없는 도구 추천, Codex peer thread 전문 로딩, OpenCode detached HEAD 결과의 영속성 위험이다. 전날 nested CLAUDE.md, prefix cache, recursive cost, direct tool return 문제와 구분된다.

## 1. Codex #63411 — encrypted reasoning과 remote compaction의 바이트 예산
원본: https://github.com/openai/codex/issues/63411
신규성: 11/23 Bedrock app-server 0.171.0-alpha.13 재현. 이전 대형 Tool Output 이슈와 달리 encrypted reasoning history의 직렬화 크기가 핵심 후보.
내부: 마지막 checkpoint 이후 reasoning record 251개, encrypted_content 32,041,416자. 전체 History compaction은 HTTP 400 request_too_large(약 4초); 오래된 reasoning 231개 제거 후 최신 20개만 유지한 복제본은 HTTP 200(약 42초). 직전 성공 sampling 304,509 input tokens / effective window 475,000 tokens. 직렬화 History 감소량 27,254,592 bytes. 실제 HTTP 요청 바이트 수·Provider 제한은 미측정이며 기록 삭제로 내용도 달라져 인과 확정 불가.
절감 원리: 토큰 Window Guard 외에 Provider별 serialized-byte preflight와 checkpoint-aware reasoning retention이 필요. 반복 실패 요청 비용과 재작업 감소 가능성은 있으나 실측 절감률 없음. 장점은 400 복구, 단점은 추론·Evidence 손실 가능성.
적용: Codex Runtime Adapter에서 serialized_request_bytes, encrypted_reasoning_bytes, checkpoint_sha 기록. P4 승인과 TeamCity Evidence는 별도 불변 Ledger로 보존. 10/50/100MB History, reasoning 비율 0/50/90% × 10회 비교; 400 재시도 상한, Evidence Recall, 실제 비용 검증. 평가: PoC 최우선.

## 2. OpenCode #65883 — 공유 Session의 환경 변수 소유권 경합
원본: https://github.com/anomalyco/opencode/issues/65883
신규성: 11/23 신고, 2/2 재현. 동일 Session을 A(PROBE=A), B(PROBE=B) 터미널에서 열고 B가 Prompt를 보내도 Agent Shell은 A 환경을 출력. 세 터미널에서도 idle client 환경이 선택되는 사례. 신고자 지목 소스: packages/core/src/session/environment.ts, packages/tui/src/app.tsx, packages/tui/src/component/prompt/index.tsx. 독립 소스 검증은 미실시.
내부: session당 하나의 환경에 last-writer-wins 적용. 토큰 압축 기법은 아니지만 잘못된 P4CLIENT, SSH_AUTH_SOCK로 재작업·위험이 증가할 수 있음. 장점은 명시적 환경 소유권으로 결정성 확보, 단점은 lease와 secret 관리 복잡성.
적용: client_instance_id, task_id, env_snapshot_sha, cwd, p4client, lease_id를 Tool Call과 바인딩. 환경은 Prompt 텍스트가 아닌 Executor에서 검증. A/B/C 동시 세션 30회, Resume 및 Child 실행 테스트; 잘못된 P4 Client 실행 0. 평가: 바로 적용 원칙 / PoC.

## 3. OpenCode #65885 — 첫 모델 호출 이전 Plugin Instruction 주입 실패
원본: https://github.com/anomalyco/opencode/issues/65885
신규성: 11/23 기능 제안. optimistic session 생성 중 entry.put은 404, session.created 뒤에는 Prompt가 먼저 시작. 신고자 실험에서 session 생성 26ms 뒤 Prompt 수락, instruction은 첫 응답에 미포함. 전날 부분 CLAUDE.md 로딩과는 다른 initialization race.
원리: 첫 Turn의 필수 정책 누락을 방지하기 위해 session.create에 initial instruction manifest를 원자적으로 포함하거나 Prompt 전 awaitable barrier 제공. 최소 정책만 선행 주입하고 Skill 본문은 지연 로딩해 토큰 절약; 실제 비용 수치 없음. 단점은 초기 응답 지연.
적용: Claude Code/Codex 공통 create_session(initial_policy_manifest, environment, capability_set) 계약, 첫 Tool 실행 전 SHA 검증. 0/50/250ms 지연 × 100회; 필수 정책 Recall 100%, 404/누락 0. 평가: PoC 최우선.

## 4. Deep Agents #7951 — Truncation 안내와 Tool Capability 불일치
원본: https://github.com/langchain-ai/deepagents/issues/7951
신규성: 11/23, deepagents 0.7.41 최소 재현. FilesystemBackend는 execute 도구가 없는데 read_file의 긴 단일 라인 JSON(4,000행, 약 540k 문자) truncation 안내는 execute(command='jq ...')를 권함. grep 설명에는 capability별 분기가 있으나 read_file 메시지에는 없음. 과거 #5798/#5799는 이슈 템플릿 사유로 종료.
원리: Output 제한은 토큰을 줄이지만 불가능한 다음 Tool을 권하면 실패 Turn을 증가시킴. 실제 허용된 Tool 목록에 맞는 안내 또는 Executor-side JSONPath/grep-window 선택 조회가 필요. 장점은 작은 변경으로 유효한 다음 행동 유도, 단점은 단일 라인 JSON 부분 조회 한계.
적용: TeamCity JSON, UE5 crash, P4 describe를 불변 Artifact로 보관하고 head/tail/jsonpath/error-cluster selector만 허용. 1KB/500KB/10MB × execute on/off × 30회; 존재하지 않는 도구 호출 0, 진단 정확도·토큰 비교. 평가: 바로 적용 원칙.

## 5. Codex #63255 — Peer Thread 상태 확인의 전문 로딩
원본: https://github.com/openai/codex/issues/63255
신규성: 11/23 기능 요청. read_thread(turnLimit:1,includeOutputs:false)도 대화 본문 포함 6,208자 반환. list_threads(limit:3)은 신고자 샘플에서 4,132자→1,222자. 문자 수이며 실제 토큰/청구 비용 절감률 아님.
원리: Parent Coordinator는 status-only(thread_id, task_id, last_turn_id, state, artifact_sha, cursor)를 기본으로 사용하고 실패/검증 시에만 상세 내용을 cursor 기반 요청. 장점은 Parent Context Isolation, 단점은 축약 상태만으로 완료 검증 불가.
적용: P4 Reviewer Child 1/5/20개, 100 Turn, 10회 Polling. 상태 정확도 100%, Parent 입력 토큰, P95 latency, verified task cost 비교. 평가: PoC.

## 6. OpenCode #65784 — Detached HEAD와 Durable Artifact Ref
원본: https://github.com/anomalyco/opencode/issues/65784
신규성: 11/23 관찰 대상. Desktop의 Session Git Worktree가 detached HEAD여서 Agent Commit이 원래 Branch를 이동시키지 않음. 신고자는 2개 프로젝트 3개 Session 확인. Worktree 정리 후 Commit의 참조가 사라질 수 있음. 기존 병렬 Child 변경 유실과 달리 Git Ref Reachability 문제.
원리: 직접 토큰 절감은 없으나 재구현·재검증 비용 예방 가능. 장점은 검증 가능한 완료, 단점은 별도 Artifact Lifecycle 관리.
적용: Git에는 Session Branch Ref, Perforce에는 Pending/Shelved CL과 Patch Artifact를 task_id, locator, content_sha로 영속화. Worktree/Workspace 삭제 및 Crash 이후 재조회 테스트; 완료 Artifact 유실 0, 무승인 Submit 0. 평가: 바로 적용 원칙 / PoC.

## 7. 추가 추적 및 제외
OpenCode #65876 https://github.com/anomalyco/opencode/issues/65876 : Synthetic Provider invalid stream event로 11/23 16:02~18:21 UTC 31건 실패 신고. Runtime Adapter malformed-event quarantine, bounded retry, 실패 Attempt 비용 기록 PoC. 단일 신고자 수치.
Claude Code #111878 https://github.com/anthropics/claude-code/issues/111878 : Cloud Session의 매 Turn MCP 동적 RAG Context Injection 제안. 아이디어 참고, 구현·Benchmark 없음.
Claude Code #111879 https://github.com/anthropics/claude-code/issues/111879 : 프로젝트 디렉터리별 Resume 제안. 아이디어 참고.
Codex #63429 https://github.com/openai/codex/issues/63429 : Compact Chat 버튼 제안. 기존 Compaction과 중복, 신규 기술 근거로 도입 가치 낮음.
Claude Code #111875 https://github.com/anthropics/claude-code/issues/111875 : Desktop Context Card의 토큰 범주 설명 요청. 실제 Provider Usage와 UI 범주를 동일시하지 말 것.
오늘 공개 GitHub 이슈를 우선 검토했으며 전체 Release/Commit/PR의 완전한 열거는 수행하지 못했다. 병합·정식 배포를 단정하지 않는다.

## 8. 범주별 점검
| 범주 | 오늘의 판단 |
|---|---|
| Coding workflow/orchestration | Peer status polling, durable artifact refs |
| Skills/hooks/progressive disclosure | First-turn atomic policy manifest |
| Context pruning/compaction | Reasoning serialized-byte preflight |
| Sub-agent context isolation | Metadata-only thread cursor |
| RAG/selective context | Cloud injection 제안만 확인, Benchmark 없음 |
| Prompt/skill 경량화 | Minimal initial manifest; 정량 절감 없음 |
| Tool output 축약 | Capability-aware truncation |
| Cache | 전일 prefix-cache 이슈 중복 제외, 신규 측정 없음 |
| Session/handoff/ledger | Environment lease, artifact reachability |
| Model routing | Provider stream compatibility 관찰, 신규 routing release 미확인 |
| Token/cost | Thread 문자량 관측만; 비용 실측 없음 |
| Durable state/runtime adapter | Byte preflight, atomic initialization, environment snapshot |
| Evidence verification/task lifecycle | Verified artifact ref와 완료 선언 분리 |

## 9. 재현 PoC 및 품질 기준
공통 Event: task_id, session_id, client_instance_id, parent_session_id, provider_request_id, attempt_id, effective_model, env_snapshot_sha, instruction_manifest_sha, capability_manifest_sha, serialized_request_bytes, input_tokens, encrypted_reasoning_bytes, cache_read_tokens, cache_write_tokens, artifact_locator, artifact_sha, completion_verified, billed_cost_source.
Fixture: (A) 10~100MB History, (B) 3 터미널 환경 경합, (C) 첫 Turn Plugin 지연, (D) execute 미지원 JSON truncation, (E) 20 Child status polling, (F) Worktree 삭제 후 Artifact recovery. 기본 30회, 첫 Turn 경합 100회. 동일 Provider·모델·입력·품질 Rubric, Cold/Warm Cache 구분.
합격: 승인된 P4 Workspace 불일치 실행 0, 첫 Turn 필수 정책 누락 0, 없는 Tool 추천 0, Artifact 유실 0, 동일 실패 요청 무한 반복 0. verified_completed_tasks당 실제 Provider 청구 비용, Evidence Recall, P95 Latency를 함께 기록. 원본 History/로그는 불변 보존, Compaction은 복제본에서 실행. P4 Submit/Build Cancel은 별도 승인.

## 10. 결론
오늘의 실무적 신규 신호는 토큰 Window보다 큰 serialized bytes, 첫 Turn의 지침 주입 순서, Tool 실행 환경의 소유권, 완료 Artifact의 영속 참조다. 실제 비용 절감률은 아직 입증되지 않았다. Payload Byte Guard와 Session Environment Lease를 우선 PoC로 권한다.
