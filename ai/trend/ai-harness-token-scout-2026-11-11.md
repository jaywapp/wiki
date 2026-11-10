---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-11"
category: trend
updated: 2026-11-11
tags: [ai-harness, coding-agent, orchestration, context-engineering, token-optimization, skills, hooks, progressive-disclosure, compaction, selective-context, subagents, durable-state, runtime-adapter, evidence-verification, handoff, ledger, task-lifecycle, model-routing, cost-accounting, perforce, claude-code, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-11-11

> 조사 시점: 2026-11-11 05:55~06:00 KST. 중심 대상: 2026-11-10 UTC GitHub PR 및 공식 릴리스 설명. 기존 develop의 11/09·11/10 Scout를 직접 조회하여 중복 제거. PR 본문과 제시된 테스트/벤치마크를 확인했으며 전체 소스 Diff와 모든 릴리스 상태를 독립 재현한 것은 아니다. 수치는 원저자 측정이며 사내 결과가 아니다.

## 0. 결론·중복 제거

**의미 있는 신규 항목이 있다.** 특히 (1) Git Attribution 관측 자체의 대규모 저장소 CPU 오버헤드 개선, (2) 비스트리밍 Compaction의 숨은 모델 비용 계측, (3) Subagent Reasoning Block 재전송 차단, (4) MCP Catalog Refresh의 Lock/Generation 정합성, (5) 실행 중 Snapshot과 Guardian 신뢰 정책이 유의미하다.

11/10의 OpenCode Trace #62806, Session Usage #62835, OAuth Lock #62827, 11/09의 Catalog Delta #62176, Image Budget #62270, Agent Tree #60190, 11/08의 Durable Tool #62459 및 Guardian Evidence #60001을 재포장하지 않았다. #60617은 기존 Incremental Tool의 **GCP Adapter 확대**만 신규로 분류한다. 11/10의 Usage 반환과 달리 #7644는 **스트리밍이 없는 Summarizer 호출 비용 누락**을 바로잡는다.

| 우선 | 항목 | 신규성 | 평가 |
|---|---|---|---|
| 1 | [Deep Agents Code #7660/#7661 — Git evidence probe 최적화](https://github.com/langchain-ai/deepagents/pull/7660) | 구현 후속/독립 수정 | **PoC 최우선** |
| 2 | [Deep Agents Code #7644 — 비스트리밍 Compaction의 비용 누락 방지](https://github.com/langchain-ai/deepagents/pull/7644) | 구현 변경 | **바로 적용** |
| 3 | [Deep Agents Talon #7645/#7652 — Subagent 결과에서 Reasoning/Block 표현 제거](https://github.com/langchain-ai/deepagents/pull/7645) | 구현 후속/독립 수정 | **바로 적용 원칙** |
| 4 | [Codex #60639 — MCP Runtime Gate 밖에서 Apps Tool Catalog Refresh](https://github.com/openai/codex/pull/60639) | 구현 변경 | **PoC 최우선** |
| 5 | [Codex #60620 — 실행 중 Turn Snapshot Sampling](https://github.com/openai/codex/pull/60620) | 구현 변경 | **PoC** |
| 6 | [Codex #60646 — Managed Guardian 정책에 신뢰 가능한 Template 강제](https://github.com/openai/codex/pull/60646) | 구현 변경 | **바로 적용 원칙** |
| 7 | [Codex #60617 — GCP Responses Incremental Tool 선언 지원](https://github.com/openai/codex/pull/60617) | 구현 변경 | **PoC** |
| 8 | [Codex #60651 — Cloud Model/Effort 선택의 Turn 단위 Admission](https://github.com/openai/codex/pull/60651) | 구현 변경 | **PoC** |
| 9 | [OpenCode #63109/#63111 — Queue-first와 Steer-next 분리](https://github.com/anomalyco/opencode/pull/63109) | 구현 후속/독립 수정 | **아이디어 참고** |

**정량 결론:** 새로 확인된 0.33→0.12초, 14.07→7.71초 등의 수치는 Git 상태 조회와 Trace Attribution 비용이며 **LLM 토큰 절감률이 아니다.** 동일 품질 Verified Task당 Provider Bill 감소율을 검증한 신규 실험은 없다.

## 1. Deep Agents Code #7660/#7661 — Git evidence probe 최적화

**원본:** [PR/기술 설명](https://github.com/langchain-ai/deepagents/pull/7660), [연계 변경](https://github.com/langchain-ai/deepagents/pull/7661). **평가: PoC 최우선.**

**내부 동작·신규성:** 도구 실행 전후 Git 상태를 반복 스캔하던 관측용 probe를 단일 git status로 합치고, 이전 Tool의 Snapshot을 재사용한다. 실패 후 30초·60초 Backoff, 3회 연속 실패 시 세션 단위 중지, 설정으로 비활성화한다. Repo 전환 시 새 baseline을 잡고 이미 dirty였던 파일은 Agent 기여로 오인하지 않는다.

**토큰/비용·검증:** 100k 파일 0.33→0.12초, 380k 파일 1.29→0.48초; 200k 파일 10 Tool 호출의 attribution 14.07→7.71초, 400k 파일 27.18→15.26초; 30회 timeout 시 123.8→2.07초(합성 환경·작성자 측정). CPU/Latency 절감이며 LLM Token 절감은 미측정.

**장단점 및 Trade-off:** Tool 사이 또는 승인 대기 중 외부 변경이 다음 Tool에 귀속될 수 있다. Git fsmonitor hook을 실행하지 않는 보안 경계는 유지한다.

**Perforce·Claude Code·Codex 적용:** Perforce 환경은 Git status 대신 p4 opened -ztag 및 changelist 기반 delta를 캐시하고, Workspace별 baseline과 event sequence를 Ledger에 기록한다. 읽기 Tool에서는 재스캔을 건너뛰고 submit 직전에는 반드시 최신 서버 상태로 검증한다.


## 2. Deep Agents Code #7644 — 비스트리밍 Compaction의 비용 누락 방지

**원본:** [PR/기술 설명](https://github.com/langchain-ai/deepagents/pull/7644). **평가: 바로 적용.**

**내부 동작·신규성:** 요약 모델 호출에 nostream 태그가 붙으면 messages stream의 요약 chunk가 사라져 TUI offload 알림과 /cost가 누락된다. 서버 측 Cost Recorder callback에서 summarization_started와 model_usage custom 이벤트를 방출한다.

**토큰/비용·검증:** Compaction Token 자체를 줄이지는 않으며 Offload 모델 사용량 누락을 바로잡는다. 수치화된 절감률 없음.

**장단점 및 Trade-off:** 중복 이벤트나 중단된 요약 호출의 과금 귀속을 조심해야 한다.

**Perforce·Claude Code·Codex 적용:** Claude Code/Codex Runtime Adapter에 hidden/nostream summarizer, retry, discarded calls를 포함한 독립 Usage Receipt를 만들고 이벤트 ID로 dedupe한다.


## 3. Deep Agents Talon #7645/#7652 — Subagent 결과에서 Reasoning/Block 표현 제거

**원본:** [PR/기술 설명](https://github.com/langchain-ai/deepagents/pull/7645), [연계 변경](https://github.com/langchain-ai/deepagents/pull/7652). **평가: 바로 적용 원칙.**

**내부 동작·신규성:** Background/Remote/Inline Subagent가 반환한 content block 배열을 문자열화해 암호화된 Reasoning과 내부 표현을 부모에게 다시 전달하던 경로를 수정했다. 최종 답변의 plain text만 추출하고 그 뒤 결과 길이 제한을 적용한다. Tool-attached task wrapper에도 같은 추출기를 재사용한다.

**토큰/비용·검증:** 불필요한 Tool Output 재전송과 Context 오염을 방지할 수 있으나 실제 Token 감소량은 미측정. #7645는 1,064 테스트 통과/14 skipped, #7652는 1,969 테스트 통과/18 skipped라는 작성자 검증을 제시한다.

**장단점 및 Trade-off:** 텍스트만으로 충분하지 않은 Artifact/이미지·구조화 Evidence는 별도 URI/Hash/Type으로 전달해야 한다. 빈 답변 fallback과 승인 interrupt를 유지해야 한다.

**Perforce·Claude Code·Codex 적용:** Subagent Handoff Envelope를 answer_text, artifact_refs, evidence_ids, status, usage_receipt로 분리한다. 내부 reasoning은 전달하지 않고 원본 증거는 Artifact Store에 보존한다.


## 4. Codex #60639 — MCP Runtime Gate 밖에서 Apps Tool Catalog Refresh

**원본:** [PR/기술 설명](https://github.com/openai/codex/pull/60639). **평가: PoC 최우선.**

**내부 동작·신규성:** 세션 MCP gate 아래에서 Apps client를 캡처한 뒤 gate를 놓고 tools/list를 수행한다. 결과 게시 전 runtime/auth generation을 재검증하며, 무효화된 refresh는 한 번 재시도한다. Tool capture·Apps 호출 준비·shutdown은 진행 중 refresh를 기다린다.

**토큰/비용·검증:** MCP Lock Contention 및 응답 지연 감소 가능성이 있으나 Token/비용 수치 없음.

**장단점 및 Trade-off:** 오래된 권한·인증 정보로 Catalog를 게시하거나 종료 중 Tool Call이 살아남을 위험이 있다.

**Perforce·Claude Code·Codex 적용:** P4/GitHub/TeamCity MCP Catalog에 generation, credential_version, ACL_version을 부여하고, refresh 중에는 읽기 Status가 막히지 않도록 한다. 쓰기 Tool 호출 직전 ACL 재확인.


## 5. Codex #60620 — 실행 중 Turn Snapshot Sampling

**원본:** [PR/기술 설명](https://github.com/openai/codex/pull/60620). **평가: PoC.**

**내부 동작·신규성:** thread/sample에 allowInProgressTurn(기본 false)을 추가한다. 최신 Turn의 실행 중 Snapshot을 복제하되 원본은 계속 실행된다. Pending Tool은 복제본에서 aborted로 보일 수 있음을 Context Note로 명시하며 중간 Compaction과 paginated history를 테스트한다.

**토큰/비용·검증:** 대기시간 절감 또는 Reviewer 병렬 시작이 가능하지만 토큰 절감 검증 없음. 복제 Reviewer 비용이 추가될 수 있다.

**장단점 및 Trade-off:** 미완료 Evidence를 확정된 결과로 오인할 수 있다. Snapshot revision 및 watermark를 명시해야 한다.

**Perforce·Claude Code·Codex 적용:** Claude Code Worker 실행 중 Codex Reviewer가 읽기 전용으로 Snapshot을 검토하도록 하되, 최종 승인에는 Worker 완료 후 최신 CL/Evidence 재검증을 강제한다.


## 6. Codex #60646 — Managed Guardian 정책에 신뢰 가능한 Template 강제

**원본:** [PR/기술 설명](https://github.com/openai/codex/pull/60646). **평가: 바로 적용 원칙.**

**내부 동작·신규성:** 사용자 지정 모델 Catalog의 Guardian Prompt가 Managed Policy Slot을 누락·변조할 수 있어 관리형 규칙이 있으면 번들 Trusted Template을 사용한다. 명시적 Host Template은 보존하며 오래된 auto_review 설정은 경고하고 guardian_extra_policy로 이전하도록 안내한다.

**토큰/비용·검증:** 토큰 절감은 없으며 안전성/검증 품질 개선이다.

**장단점 및 Trade-off:** 사용자 커스텀 Prompt와의 호환성에 영향. Trusted Template과 Host Override의 우선순위를 테스트해야 한다.

**Perforce·Claude Code·Codex 적용:** P4 Submit/Build Deploy Reviewer 정책은 사용자 Workspace Skill과 분리하고 중앙 서명된 Guardian Policy를 사용한다. Evidence Verification 실패 시 완료 금지.


## 7. Codex #60617 — GCP Responses Incremental Tool 선언 지원

**원본:** [PR/기술 설명](https://github.com/openai/codex/pull/60617). **평가: PoC.**

**내부 동작·신규성:** GCP Responses에서 incremental_tools_legacy를 켜면 전체 tools 배열 대신 additional_tools 입력으로 Tool 선언을 보낸다. Namespace, Tool Search, exec_command 및 History를 재작성하지 않는 Catalog Update 시나리오를 테스트한다.

**토큰/비용·검증:** 기존 11/08~09의 증분 Tool 원리의 Provider 호환성 확대다. GCP에서 독립적인 Token/Cache/Cost 절감량은 미측정.

**장단점 및 Trade-off:** Provider별 Request Semantics가 다르며 설정이 기본 활성화인지 확인 필요. 과거 결과를 GCP 성과로 재사용하면 안 된다.

**Perforce·Claude Code·Codex 적용:** Claude/Codex의 Provider Adapter에 supports_incremental_tools capability를 명시하고 150개 Tool A/B로 Cache Hit/성공률 측정.


## 8. Codex #60651 — Cloud Model/Effort 선택의 Turn 단위 Admission

**원본:** [PR/기술 설명](https://github.com/openai/codex/pull/60651). **평가: PoC.**

**내부 동작·신규성:** 계정별 /v2/models Catalog를 Queue와 독립 조회하고 다음 새 Turn에 모델·Reasoning Effort를 함께 전송한다. Admission 성공 뒤 선택을 확정하고 계정 변경 시 오래된 Catalog와 선택을 폐기한다.

**토큰/비용·검증:** Task 난도별 모델 라우팅 기반이지만 비용 절감 수치는 없음.

**장단점 및 Trade-off:** Effort 축소로 품질 하락, Queue 순서·권한 변경에 따른 모델 선택 오류 가능.

**Perforce·Claude Code·Codex 적용:** P4 Task Complexity와 Review Risk에 따라 모델/effort를 라우팅하되 실제 모델 ID·승인된 effort를 Task Ledger에 기록한다.


## 9. OpenCode #63109/#63111 — Queue-first와 Steer-next 분리

**원본:** [PR/기술 설명](https://github.com/anomalyco/opencode/pull/63109), [연계 변경](https://github.com/anomalyco/opencode/pull/63111). **평가: 아이디어 참고.**

**내부 동작·신규성:** Alt+Enter는 새 Follow-up을 기존 Queue 앞에 넣지만 실행 중 Turn을 수정하지 않는다. 빈 Composer의 Mod+Enter는 첫 대기 Prompt만 Steer하고 나머지 Queue는 유지한다. 기존 Admission/Reorder/Steer API를 재사용하고 Mutation 중 재진입을 차단한다.

**토큰/비용·검증:** UI 동작의 정합성 개선이며 LLM Token 절감 측정 없음. #63111에서 App Unit 2,608개, Queue E2E 48개 통과를 보고한다.

**장단점 및 Trade-off:** Steer와 Queue의 의미가 혼동되면 장기 작업의 Task Lifecycle이 비결정적으로 바뀔 수 있다.

**Perforce·Claude Code·Codex 적용:** Task Inbox에 append, priority_insert, steer_running, cancel을 분리하고 순서·ACK를 Durable Ledger에 남긴다.

## 10. 공통 Harness 설계 및 재현 가능한 실험

### A. Durable Ledger / Runtime Adapter

각 Task를 `task_id, p4_cl, workspace_revision, runtime, session_id, turn_id, agent_id, parent_agent_id, tool_call_id, attempt_id, model, effort, policy_version, catalog_generation, evidence_watermark`로 연결한다. Tool 실행은 `planned -> admitted -> running -> observed -> verified -> committed`로 관리하고 외부 Side Effect는 `execution_receipt`와 실제 P4/TeamCity 조회로 확인한다. Host/Worker 재시작 후 기존 실행을 조회해 중복 P4 Submit을 방지한다. Snapshot Reviewer는 `provisional`로 표시하고 완료 전 승인 불가.

### B. Context Budget / Progressive Disclosure / RAG

Tool Catalog와 Skill은 Name/Schema Hash 순서를 고정하고 요청 작업에 필요한 Tool만 우선 공개한다. RAG는 P4 File Path/CL/UE5 Module/Build ID를 키로 검색해 상위 N개 결과만 노출하며 원본은 Artifact Store에 보존한다. Large Tool Output은 `summary + bounded excerpts + artifact URI + SHA256`로 전달한다. Prompt Cache는 Cold/Warm을 나눠 측정한다. Compaction은 Durable Task State·승인·Pending Mail·Policy를 별도 저장하고 Summary만 대체한다. Subagent Context는 독립 유지하고 최종 답변 텍스트와 검증 가능한 Evidence Reference만 Handoff한다.

### C. 실험 매트릭스와 합격 기준

| 실험 | A/B 및 규모 | 측정 | 합격 조건 |
|---|---|---|---|
| P4 Attribution Probe | 100k/300k 파일 상당 Workspace, Tool 100회, baseline vs snapshot reuse | Probe p50/p95, CPU, timeout, 잘못된 변경 귀속 | p95 30% 이상 감소, 잘못된 Submit 귀속 0 |
| Summarization Cost | 30개 장기 Turn, streaming vs nostream | summary input/output/cache, retry, receipt 누락 | Provider Usage 대조 누락/중복 0 |
| Subagent Handoff | 100개 결과, reasoning/text/image/tool block 혼합 | Parent 입력 토큰, 전달 오류, Evidence Completeness | Reasoning 재전송 0, Evidence 참조 100% |
| MCP Refresh | 100개 동시 tools/list, logout/credential rotation 중간 삽입 | gate wait p95, stale publish, ACL bypass | stale publish·ACL bypass 0 |
| Snapshot Review | Worker 50건, 중간 Tool/Compaction/취소 | Snapshot watermark, 검토 정확도, 재검증 비용 | 미완료 Evidence 최종 승인 0 |
| Model Routing | 50개 P4/UE5 Task×2 모델×2 effort | Verified success, USD, wall time, cache read/write | 성공률 비열등성 사전 정의 후 비용 비교 |

**비용 공식:** `net_provider_usd = uncached_input*rate_in + cache_read*rate_read + cache_write*rate_write + output*rate_out + other_billable`. Summarizer/Guardian/Retry/Aborted Call도 실제 청구 여부에 따라 포함한다. Subscription 표시량과 API 청구 USD를 혼합하지 않는다. `cost_per_verified_task = total_provider_bill / verified_successes`로 품질을 통제한다.

### D. 추적 항목별 신규성 점검

- Skills/hooks 및 prompt 파일 경량화: 오늘은 독립적인 신규 절감 벤치마크 미확인. #7644의 post-compaction hook 유지가 신규.
- Selective RAG·검색: 독립적인 신규 검색 정확도/토큰 A/B 미확인. 기존 11/07 BM25 결과를 반복하지 않음.
- Cache/Compaction: #7644의 비스트리밍 Summary Usage 이벤트가 신규. Cache TTL 자체는 이전 보고서에서 다룸.
- Subagent Isolation/Handoff: #7645/#7652의 Reasoning Block 누출 차단과 #60620의 provisional snapshot이 신규.
- Durable State/Evidence Verification: #60646 Managed Guardian Template, #60639 Catalog Generation, #60620 Snapshot Watermark를 신규 추적.
- Model Routing: #60651의 Cloud 모델/effort Admission 경계가 신규. 비용 절감 효과는 미측정.
- Task Lifecycle: #63109/#63111 Queue vs Steer 의미 분리. UI 기능이므로 우선순위 낮음.

## 11. 참고 원본 및 검증 한계

- [Deep Agents Code #7660/#7661 — Git evidence probe 최적화](https://github.com/langchain-ai/deepagents/pull/7660) / [연계](https://github.com/langchain-ai/deepagents/pull/7661)
- [Deep Agents Code #7644 — 비스트리밍 Compaction의 비용 누락 방지](https://github.com/langchain-ai/deepagents/pull/7644)
- [Deep Agents Talon #7645/#7652 — Subagent 결과에서 Reasoning/Block 표현 제거](https://github.com/langchain-ai/deepagents/pull/7645) / [연계](https://github.com/langchain-ai/deepagents/pull/7652)
- [Codex #60639 — MCP Runtime Gate 밖에서 Apps Tool Catalog Refresh](https://github.com/openai/codex/pull/60639)
- [Codex #60620 — 실행 중 Turn Snapshot Sampling](https://github.com/openai/codex/pull/60620)
- [Codex #60646 — Managed Guardian 정책에 신뢰 가능한 Template 강제](https://github.com/openai/codex/pull/60646)
- [Codex #60617 — GCP Responses Incremental Tool 선언 지원](https://github.com/openai/codex/pull/60617)
- [Codex #60651 — Cloud Model/Effort 선택의 Turn 단위 Admission](https://github.com/openai/codex/pull/60651)
- [OpenCode #63109/#63111 — Queue-first와 Steer-next 분리](https://github.com/anomalyco/opencode/pull/63109) / [연계](https://github.com/anomalyco/opencode/pull/63111)
- [Deep Agents Code 0.2.7 Release PR](https://github.com/langchain-ai/deepagents/pull/7654)
- [전일 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-10.md), [전전일 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-09.md)

PR 검색의 merged 날짜 필터로 후보를 좁혔으나, 본문/벤치마크는 업스트림 작성자 진술이다. 실제 merge SHA, 모든 source/test diff, 외부 Provider 청구 영수증은 항목별 독립 확인이 제한된다. 해당 한계를 넘어선 성능/절감 주장은 하지 않는다.
