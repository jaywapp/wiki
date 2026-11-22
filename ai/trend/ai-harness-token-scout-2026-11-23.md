---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-23"
category: trend
updated: 2026-11-23
tags: [ai-harness, token-cost, prompt-cache, progressive-disclosure, durable-state, perforce, claude-code, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-11-23

> 조사 시점: 2026-11-23 KST 오전, 11월 22일 UTC 신규 GitHub 공개 자료 중심. jaywapp/wiki develop의 11/21·11/22 Scout 전체 원문을 조회해 중복을 제외. **오늘 새로 독립 검증된 동일 품질 작업당 Provider 청구 비용 절감률은 없다.** 아래의 수치는 이슈 신고자 또는 공개 자동 Audit의 관측이며 공식 수정 배포를 의미하지 않는다.

## 0. Executive summary

신규성이 있는 핵심 신호는 (1) Claude Code의 nested CLAUDE.md 부분 읽기가 on-demand 메모리 로딩을 막는 progressive-disclosure 결함, (2) OpenCode Compaction 요청의 system-prefix 변경으로 KV/prompt cache가 처음부터 무효화되는 성능 회귀, (3) ACP Root/Child 비용 합산 누락, (4) Subagent return_direct 결과 전달 오류, (5) 자동 Agent Workflow의 첫 요청 Prefix 구성 Audit, (6) 변경된 Context의 우선순위 표현, (7) DCode History 파일의 무제한 성장/동시 세션 충돌이다. 이전 Scout의 일반적인 Compaction 실패, Context provenance, 비용 누락과 **다른 구체적 경로**를 다룬다.

**우선순위:** Nested Skill/Memory Loading Contract → Cache Prefix Diff Test → Recursive Cost Receipt → Typed Child Result Verification → Session History Isolation. 새 릴리스로 확정된 항목보다 재현 가능한 공개 이슈와 Audit이 많다.

## 1. Claude Code #111719 — 부분 Read 이후 nested CLAUDE.md의 on-demand 로딩 누락

- 원본: https://github.com/anthropics/claude-code/issues/111719 ; 공식 동작 문서: https://code.claude.com/docs/en/memory
- 신규성/상태: 11/22 공개 신고. 하위 디렉터리 CLAUDE.md는 해당 디렉터리 파일을 읽을 때 자동 첨부되지만, 먼저 CLAUDE.md 자체를 Read(offset/limit)로 부분 열면 이후 자동 첨부가 누락되는 사례. 수정 병합 미확인.
- 내부 동작/재현: 신고자의 84개 Subagent 중 CLAUDE.md를 직접 열지 않은 47개는 모두 nested_memory 첨부. 먼저 직접 연 37개 중 24개는 첨부되지 않았고 13개는 Compaction 후에만 첨부됨. 샘플은 신고자 워크로드로, 일반 실패율은 아니다.
- 절감/품질 원리: Progressive Disclosure는 필요 시 하위 지침을 읽어 초기 Context를 줄이지만, 부분 읽기만으로 '이미 로드됨'으로 표시하면 나머지 규칙이 누락된다. 무조건 전체 로딩은 토큰을 증가시키므로 **loaded-range, full-document-hash, required-coverage**를 구분해야 한다. 절감률 실측 없음.
- 장점/단점: 선택적 로딩 유지하면서 규칙 Recall 확보 / 파일 상태 추적 및 완전성 검사 비용.
- 적용: Perforce Workspace의 프로젝트별 CLAUDE.md/AGENTS.md 및 사내 Skill 로더에서 partial_read와 full_load를 별도 상태로 보관. 중요한 Policy 파일은 Write/Submit 전 전체 규칙 Manifest 해시 확인. Claude Code의 내부 동작을 직접 수정할 수 없으면 Wrapper의 사전 검사로 보완.
- 실험: 4종 (미열람/부분열람/전체열람/Compaction 후) × 30회, 정책 Recall·Context Tokens·잘못된 P4 파일 수정·Latency 비교. 필수 지침 누락 0 목표.
- 평가: **PoC 최우선**.

## 2. OpenCode #65549 — Compaction Prompt Prefix Cache Miss와 456초 재평가

- 원본: https://github.com/anomalyco/opencode/issues/65549
- 신규성/상태: 11/22 공개, OpenCode 2.3.2 + 로컬 llama.cpp prefix cache. 이전 11/21 Claude Code Resume/Fork Cache Write 이슈와 달리 **Compaction 요청의 system prompt가 기존 Prefix와 달라지는** 원인이다. 수정 확인 못함.
- 내부 동작/관측: 약 50k-token 대화의 Warm KV Cache가 Compaction 요청에서 system-prefix 차이로 LCP=0이 되어 전체 재-prefill. 신고자는 436-token 요약 생성 전에 prompt evaluation **456초** 관측.
- 원리: Stable Prefix를 유지하고 Compaction 전용 지시를 후단에 배치하거나 별도 요약 Context를 선택적으로 구성하면 재평가 비용 감소 가능. 하지만 캐시 키·요약 품질·모델별 prompt 구조 제약이 있다. 로컬 시간 관측을 Provider 청구 비용 절감률로 환산하지 않는다.
- 장단점: 장문 Session Compaction 지연 개선 가능 / Prefix 변경 제한이 요약 정확도·안전 지침 우선순위에 영향 가능.
- 적용: Claude Code/Codex Runtime Adapter에 request별 system-prefix SHA, LCP 길이, cache_read/write, compaction latency 기록. TeamCity 50k-token 로그 분석에서 A=기존 Compaction, B=Stable Prefix+suffix instruction, C=Evidence-only summary를 동일 품질 Rubric으로 비교.
- 실험: 10k/50k/100k Context × Cold/Warm × 10회, 요약 Recall, P95 prefill, 실제 비용, Cache Hit 측정.
- 평가: **PoC 최우선**.

## 3. OpenCode #65616 — ACP usage_update의 Subagent 비용 누락

- 원본: https://github.com/anomalyco/opencode/issues/65616
- 신규성/상태: 11/22 공개, OpenCode 2.3.2 및 dev 8ba44455a3 기준 신고. TUI는 Parent+Child를 합산하지만 ACP usage_update는 Root 비용만 표시. 공식 수정 확인 못함.
- 내부 동작: Child Session 각각에 비용이 저장되지만 ACP 부모 세션 이벤트에 Recursive Rollup이 없다. 이전 11/21 '실패 Attempt Cost Receipt' 문제와 달리 **계층 합산 범위 불일치**다.
- 토큰 원리: 직접 절감 아님. Parent-only 비용을 기준으로 Model Routing/Orchestration을 최적화하면 Child 비용을 과소평가한다. Recursive Cost Receipt로 검증 완료 작업당 총비용을 정확히 측정할 수 있다.
- 장단점: 총비용 가시화 / Child 공유·재시도·중복 이벤트의 이중 계상 위험.
- 적용: `task_id, session_id, parent_session_id, provider_request_id, attempt_id, cost_source`를 저장하고 request ID 기준 중복 제거. ACP/TUI/Provider Invoice를 동일 범위로 Reconcile.
- 실험: Parent 1 + Child 3, Child 실패·재시도·재연결 Fixture 각 30회. Root-only vs Recursive 비용 비교, Double Count 0, Unknown Billing 별도 표시.
- 평가: **바로 적용 원칙 / PoC**.

## 4. Deep Agents #7942 — return_direct=True Tool 결과가 Child Task 반환값에서 사라짐

- 원본: https://github.com/langchain-ai/deepagents/issues/7942 (중복 자동 종료 #7939 제외)
- 신규성/상태: 11/22 공개. FakeMessagesListChatModel과 @tool(return_direct=True) 최소 재현 코드 제시. 기존 마지막 non-empty AIMessage fallback (#2857)을 우회하는 경우. 패치 미확인.
- 내부 동작: Child가 Tool에서 최종 값을 반환했지만 부모 task는 그 값 대신 앞선 Assistant preamble 또는 빈 문자열을 받을 수 있다. Tool 완료와 Child Result 전달은 다른 계약.
- 토큰 원리: 결과 유실에 따른 재조회·재실행을 줄일 가능성. Typed Result Envelope 및 Artifact 검증 자체에 소량 비용 발생. 직접 절감 수치 없음.
- 장단점: Handoff 정확성·Evidence 보존 / Framework별 direct-return semantics 호환성.
- 적용: P4 Diff 분석 Child가 최종 Tool Result에 `result_artifact_hash, tool_call_id, status, verified`를 기록; Parent는 Assistant Text 대신 Typed Result를 검증해 수용. Child Completion과 Evidence Verification 분리.
- 실험: Tool direct-return/일반 AI Final/빈 AI Final/실패 4종 × 30회, 결과 해시 일치 100%, 누락 0, 재시도 비용 측정.
- 평가: **PoC 최우선**.

## 5. GitHub gh-aw #80143 — 첫 요청 Ambient Prefix Audit

- 원본: https://github.com/github/gh-aw/issues/80143
- 신규성/상태: 11/22 생성된 Daily Ambient Context Optimizer Audit. 4개 완료 Run 표본(성공 3, 실패 1). 로그 API는 60개 요청 중 20개만 반환, canonical event-logs.jsonl 부재로 ATIF의 첫 user.message 사용. 일부 Run은 prompt.txt와 바이트 일치 확인.
- 관측: 첫 요청 크기 중앙값 **25,347자**, p95 **27,018자**. Avenger 요청 25,676자 중 Workflow 제목이 바이트 18,109(71%) 지점에 나타남. 고정 플랫폼/Safe Output Boilerplate가 크며 Workflow 작성자가 제어할 수 있는 부분은 ADR Writer import, 공통 PR Review 설정, 7,500-byte prefix budget 안의 지시 순서 등.
- 토큰 원리: 무조건 Prompt를 줄이기보다 **누가 소유하는 Prefix인지 분해**해 수정 가능한 구간만 최적화. 첫 요청 위치/길이와 Cache Reuse/Instruction Compliance를 함께 측정해야 한다. 4개 Run은 절감 실험이 아니다.
- 장단점: Repo-owned Prompt 수정 지점이 명확 / 플랫폼 Prefix는 조정 불가, 순서 변경이 Cache/정책 우선순위에 영향.
- 적용: Claude Code CLAUDE.md, Codex AGENTS.md, Skill 설명/본문, P4 TeamCity Wrapper를 platform/agent/project/task/tool-schema 단위로 Prefix Attribution. 각 구간 Bytes·Tokens·Hash·명령 순서 기록.
- 실험: 20개 대표 작업, A=현행, B=Skill Metadata 경량화, C=On-demand Skill 본문, D=Stable Prefix+Task Suffix. 동일 품질 Rubric과 Cache Cold/Warm 측정.
- 평가: **PoC**.

## 6. OpenCode #65605 — 변경된 Context의 우선순위 문구가 모호함

- 원본: https://github.com/anomalyco/opencode/issues/65605 ; 제안 PR https://github.com/anomalyco/opencode/pull/65604
- 신규성/상태: 11/22, 변경된 Instruction Source의 안내 문구가 'supersedes'라고만 되어 새 값과 이전 값 중 어느 것이 우선인지 모호할 수 있다는 구체적 문제. 제안 PR은 문구 변경이며 병합 확인하지 못함.
- 내부 동작: 세션 중 deploy-target 등 Context 값 변경 시 다음 모델 요청에 변경 안내를 삽입. 문구가 방향을 명시하지 않으면 이전 값을 최신으로 오인할 위험.
- 토큰 원리: 절감 기법 자체는 아니며 잘못된 Context로 인한 재작업 방지 가능. 명확한 `new_value replaces old_value` 문구의 Token Overhead는 작지만 측정 필요.
- 적용: P4 Stream/CL/Build Target의 변경은 `context_version, effective_at, supersedes_version`을 함께 전송하고 과거 지시 Replay를 금지.
- 실험: 값 변경/삭제/철회 3종 × 30회, 최신 값 선택률 100%, 이전 승인 재사용 0.
- 평가: **바로 적용 원칙**.

## 7. Deep Agents #7947 — DCode Prompt History 무제한 성장과 동시 세션 손실

- 원본: https://github.com/langchain-ai/deepagents/issues/7947
- 신규성/상태: 11/22 신고, HistoryManager(max_entries=3)로 13회 add 시 JSONL 13행 유지된다는 최소 코드. 같은 파일을 공유하는 두 HistoryManager의 Compaction이 다른 세션의 Prompt를 삭제할 수 있다는 문제 제기. 수정 확인 못함.
- 내부 동작: History Retention 정책이 물리적 파일 크기 상한으로 적용되지 않고, 동시 writer가 동일 JSONL을 Compact할 때 Race Condition이 발생할 수 있다.
- 토큰 원리: Disk History 증가는 곧바로 모델 Context 증가를 뜻하지 않는다. 다만 불필요한 History 재조회/동시 Compaction 장애를 줄일 가능성. 토큰 절감 실측 없음.
- 적용: Session별 Namespace, append-only 원본, snapshot generation, atomic rename/compare-and-swap. P4 작업별 승인·Evidence Ledger와 사용자 Prompt History는 보존 정책 분리.
- 실험: 2/10/100 동시 Session, 1k Prompt, 재시작/Compaction Fault Injection. 타 세션 데이터 손실 0, Retention 상한 준수 100%.
- 평가: **PoC**.

## 8. 범주별 점검과 제외

| 범주 | 신규 근거/판단 |
|---|---|
| Coding workflow/orchestration | Direct Tool Result Handoff #7942; 비용 Rollup #65616 |
| Skills/hooks/progressive disclosure | Nested CLAUDE.md Partial Read #111719 |
| Context pruning/compaction | Prefix Cache Miss #65549; History Retention #7947 |
| Subagent context isolation | Typed Result Envelope 및 Parent/Child 비용 분리 |
| RAG/search selective context | 오늘 신규 독립 Retrieval Benchmark 미확인 |
| Prompt/skill 파일 경량화 | gh-aw First-request Prefix Attribution #80143 |
| Tool output 축약 | 신규 압축률 검증 없음, 기존 Headroom 반복 제외 |
| Cache | Local KV Prefill 456초 관측, Provider 비용 효과 미검증 |
| Session/handoff/ledger | History Namespace, Child Result Evidence Hash |
| Model routing | 모델별 Compaction 비용 분리 필요, 신규 라우팅 릴리스 확인 못함 |
| Token/cost | ACP Root-only 비용 누락, Prefix 분해 측정 |
| Durable state/runtime adapter | Context Version, Typed Tool Completion, Atomic History |
| Evidence verification/task lifecycle | Parent 완료 선언과 Tool Result/Artifact 검증 분리 |

추가 관찰: OpenCode #65601은 built-in date/environment 674바이트가 Prompt에서 제거 불가능하다는 신고자 HTTP Body 측정(2,683바이트 중 674바이트). 설정 기능 제안이며 신규 릴리스 아님; **아이디어 참고**. Claude Code #111725는 Feature Flag로 설정한 모델이 바뀌었다는 단일 신고; 사용량/할당량의 다른 모델 간 비교는 동일 단가·동일 작업이 아니므로 비용 절감 근거 아님; **PoC**(Effective Model Receipt). gh-aw #80138은 Smoke Queue Dispatcher 실패와 Worker 0건, 73분 51초 미검증 실행을 보고; 실제 Work Queue 배포/복구 검증의 운영 참고 자료이며 새로운 안정 기능으로 분류하지 않음.

## 9. Perforce·Claude Code·Codex 통합 실험

**계측 스키마:** `task_id, parent_session_id, child_session_id, request_id, attempt_id, effective_model, context_version, instruction_source_sha, loaded_ranges, prompt_prefix_sha, prefix_lcp_tokens, cache_read_tokens, cache_write_tokens, child_cost, root_cost, billed_cost_source, tool_result_artifact_sha, verified_completion`.

**Fixture/조건:** (1) 중첩 CLAUDE.md 부분 Read, (2) 50k TeamCity 로그 Compaction, (3) Parent+3 Child와 Child 실패/Retry, (4) Tool direct-return, (5) 변경된 P4 Stream Context, (6) 동시 Session History Compact. 각 30회 이상. Baseline과 개선안을 동일 Model/Provider/입력·품질 Rubric으로 비교하며 Cold/Warm Cache를 분리.

**합격 기준:** 필수 Instruction Recall 100%, 승인 누락/옛 승인 재실행 0, Child Artifact Hash 일치 100%, 비용 중복 합산 0, History Cross-session Loss 0. P95 Latency와 Provider 청구액은 실제 Request ID가 있는 경우에만 실측으로 표시. Token Count만 확보한 경우 절감률은 '추정'으로 표기.

**안전성:** P4 Submit·Build Cancel·삭제는 독립 승인, Idempotency Key, 외부 상태 Reconciliation 필수. 원본 Tool Output/Build Log는 Content-addressed Artifact로 보존하고 모델에는 Preview+Hash만 전달. 모델이 생성한 완료 텍스트를 Trusted Tool Event로 인정하지 않음.

## 10. 근거 수준 및 한계

- 저장 전 develop canonical 2026-11-23 경로를 GitHub Connector fetch_file로 조회해 404 미존재 확인. 11/21·11/22 전체 Scout 원문을 직접 읽고 중복 제외.
- GitHub Connector 검색: Codex, OpenCode, Deep Agents, Claude Code, gh-aw의 11/22 신규 이슈. Microsoft Agent Framework 검색은 실제 GitHub API 422(검색 접근/저장소 선택 문제)로 실패. Commit/PR Diff/Release 전수 감사는 하지 않았다.
- 수치는 공개 이슈 신고자와 gh-aw Audit의 관측이다. 별도 사내 실험이나 독립 Benchmark를 수행하지 않았다. 특히 456초는 로컬 Prefill 시간이지 청구 비용이 아니다.
- **새로 입증된 동일 품질당 Provider 청구 비용 절감률: 없음.** 위 기술은 실험 후보이며 수정 병합/공식 릴리스 확정으로 표현하지 않는다.

## 원본 링크

- https://github.com/anthropics/claude-code/issues/111719
- https://github.com/anomalyco/opencode/issues/65549
- https://github.com/anomalyco/opencode/issues/65616
- https://github.com/langchain-ai/deepagents/issues/7942
- https://github.com/github/gh-aw/issues/80143
- https://github.com/anomalyco/opencode/issues/65605
- https://github.com/langchain-ai/deepagents/issues/7947
- https://github.com/anomalyco/opencode/issues/65601
- https://github.com/anthropics/claude-code/issues/111725
- https://github.com/github/gh-aw/issues/80138
- https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-22.md
