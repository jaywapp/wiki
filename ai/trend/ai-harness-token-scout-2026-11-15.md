---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-15"
category: trend
updated: 2026-11-15
tags: [ai-harness, coding-agent, context-engineering, token-optimization, tool-output, model-routing, durable-state, evidence-verification, perforce, claude-code, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-11-15

> 조사 시점: 2026-11-15 06:00 KST 전후. 관찰 대상: 2026-11-14 UTC의 GitHub 변화. 이전 canonical Scout(11/13, 11/14)를 develop에서 직접 읽고 중복을 배제했다. GitHub PR 검색에서 지정 날짜에 병합된 신규 PR을 확인하지 못했으므로 **신규 병합 구현이 확인되었다고 주장하지 않는다.** 아래 항목은 신규로 확인한 프로젝트/이슈이며, 릴리스·신규 기능과 구별한다. 업스트림 주장에 대한 사내 독립 벤치마크는 없다.

## 0. 오늘의 판정

**기존 주요 저장소에서 확증 가능한 의미 있는 신규 병합 구현은 확인하지 못했다.** 11/14 Scout의 Guardian Elastic Evidence Budget, MCP Selective Discovery, History Retention, Session Model ID, Selective History, Async Subagent Streaming, MCP 응답 상한을 반복 소개하지 않는다. 다만 새로운 PoC 후보 1개와 운영 관측 관련 신규 이슈 1개를 발견했다. 신규 기능 릴리스가 아니라는 점을 명시한다.

- 확인한 GitHub PR 검색: `openai/codex`, `langchain-ai/deepagents`, `anomalyco/opencode`, `microsoft/agent-framework`, `strands-agents/harness-sdk`의 `is:pr is:merged merged:2026-11-14` 쿼리. 결과 0건. 이는 GitHub 검색의 색인/검색 범위 제약이 있을 수 있으므로 해당 날짜 변경이 전혀 없었다는 증명은 아니다.
- 기존 Wiki: `ai/trend/ai-harness-token-scout-2026-11-14.md` (7823자), `...2026-11-13.md` (26387자), develop에서 원문 조회.
- 신규 Provider 비용 절감률: **독립 검증 없음**.

## 1. 새 PoC 후보: Headroom — LLM 직전 Tool/Log/JSON 압축

- 원본: https://github.com/headroomlabs-ai/headroom
- 검증 범위: 공개 저장소 README와 디렉터리 구조. `benchmarks/`, `crates/`, `docs/`, `e2e/`, `examples/`, `headroom/`, `plugins/`, `sdk/typescript/`, `tests/`가 존재한다. **11/14에 처음 공개되거나 해당 날짜에 기능이 병합됐다는 근거는 확보하지 못했다.** 따라서 '새 릴리스'가 아니라 '새로 포착한 평가 후보'로만 분류.
- 동작: 모델에 전달하기 전 Tool Output, 로그, RAG Chunk, JSON 반복 구조 등을 로컬에서 압축. Python `compress(messages, model=...)` 라이브러리, Proxy, Agent Wrapper(`headroom wrap claude`/`codex`), MCP `headroom_compress`/`headroom_retrieve`/`headroom_stats`를 제공한다고 README가 설명한다. 원본 참조와 검색 경로를 분리하는 패턴은 Evidence Store + Preview 설계와 비교할 가치가 있다.
- 절감 원리: 중복 JSON 필드·로그 반복 줄 등 높은 중복률의 입력을 압축하여 모델이 읽는 입력 토큰을 줄인다. 업스트림 README는 4개 Agent 시나리오에서 입력 토큰 21~57% 감소, 반복 JSON/로그에서 90% 이상 감소를 주장한다. **벤치마크 설정·정답 보존·청구액은 이번 조사에서 재현하지 않았다.** 동일 품질/실제 비용 절감률로 해석 금지.
- Trade-off: 오류 발생 위치·라인 번호·원본 스택 프레임이 사라지면 분석 정확도가 저하될 수 있다. 모델 입력 압축 자체가 Cache Prefix를 변경해 Cache Hit을 낮출 수 있다. 로컬 압축 지연과 원본 복구 횟수, PII/비밀 마스킹 정책, 라이선스/공급망 검토 필요.
- P4/Claude Code/Codex 적용: TeamCity 빌드 로그 30개, UE5 Crash 로그 30개, P4 Diff 30개를 각 원본/기존 정규식 요약/Headroom 압축의 3군으로 평가. `artifact_sha256`, `task_id`, `source_range`, `retrieval_id`는 별도 Evidence Ledger에 남긴다. 오류 코드/첫 실패 위치/원인 파일/검증 가능한 수정안 일치율을 측정하고, Provider 실제 `input_tokens`, `cached_input_tokens`, `output_tokens`, `billed_cost`, 재조회 횟수, 지연을 수집한다.
- PoC 통과 게이트(제안): 필수 오류 증거 누락 0건, 근본 원인 식별률 원본 대비 저하 0%p, 동일 품질 완료 작업당 청구 비용 10% 이상 감소, P95 지연 10% 이내 증가. 임계치는 **내부 제안**이지 업스트림 실험값이 아니다.
- 평가: **PoC**. 기존 11/13 Strands Offload 및 11/12 Compact JSON과 목적이 겹치므로 새로운 Harness 아키텍처를 도입하기보다 동일 데이터셋에서 세 기법을 비교할 것.

## 2. 신규 운영 이슈: OpenCode #63916 — Account-wide Usage Limit 관측 공백

- 원본: https://github.com/anomalyco/opencode/issues/63916
- 날짜/상태: 2026-11-14 등록, **Open 이슈/기능 제안**, 구현된 기능 아님.
- 핵심: TUI의 세션 단위 토큰/비용과 Console 계정 전체 사용량 한도가 분리되어 있다. 이슈에서 `opencode usage --json`을 제안. Maintainer Bot 설명에 따르면 `opencode api get /api/experimental/usage/limits`는 Console Workspace/Go 일부 한도를 제공하지만 Free Tier 잔여량은 포함하지 않는다. 이 설명은 이슈 댓글 수준의 근거이며 공식 안정 API 보증이 아니다.
- 절감 원리: **직접 토큰 압축 없음.** 한도 소진 전 모델을 전환하고 중간 작업 실패/재시도를 줄일 가능성이 있다. Provider 청구액 절감률 없음.
- 장단점: 자동 Routing의 사전 한도 신호가 되지만 실험적 Endpoint 의존, Workspace별 Scope, 갱신 주기, 429 및 인증 실패 처리 위험. 할당량/요금과 Session Cost를 하나의 값으로 혼동하지 말 것.
- P4/Claude Code/Codex 적용: Provider별 `quota_remaining`, `quota_reset_at`, `quota_source`, `quota_freshness`, `session_usage`, `task_cost`를 분리한 Cost Receipt 스키마 제안. 확인되지 않은 한도는 `unknown`으로 두고 임의 숫자를 생성하지 않는다. 모델 전환은 승인된 정책/성능 하한 내에서만 허용.
- 평가: **아이디어 참고**. OpenCode 전용 구현으로 바로 도입할 가치는 낮지만 Runtime Adapter의 비용/할당량 표준 필드 설계에는 유용.

## 3. 범주별 신규성 점검

| 범주 | 11/14 UTC 신규 확증 | 처리 |
|---|---|---|
| Coding Agent Workflow / Orchestration | 확인 못함 | 기존 Durable Child/Approval 설계 유지 |
| Skills/Hooks / Progressive Disclosure | 확인 못함 | 11/13 MCP Skills와 11/14 Selective Discovery 재소개 제외 |
| Pruning/Compaction / Subagent Isolation | 확인 못함 | 기존 Offload/Retention 설계 유지 |
| RAG / Selective Context / Tool Output | 신규 릴리스 확인 못함, Headroom 후보 포착 | 동일 데이터셋 PoC |
| Prompt/Skill 경량화 / Cache | 확인 못함 | Stable Prefix·Cache Read 계측 유지 |
| Session/Handoff/Ledger / Durable State | 확인 못함 | 기존 Checkpoint/Outbox/Evidence 정책 유지 |
| Model Routing / Token Cost | 새 기능 확인 못함, OpenCode #63916 신규 이슈 | Quota/Cost 분리 설계 참고 |
| Runtime Adapter / Evidence Verification / Task Lifecycle | 확인 못함 | Provider 호출 Receipt와 P4 CL Evidence 검증 유지 |

## 4. 재현 가능한 실험 설계

1. **Baseline 동결:** P4 CL 및 TeamCity/UE5 로그 90개, 동일 모델·Temperature·Tool Catalog·입력 작업 정의·평가자·동일 횟수 반복. 원본 Evidence는 해시와 보존 기간을 기록.
2. **세 군 A/B/C:** A 원본, B 기존 Regex/Compact JSON, C Headroom. 캐시 Cold/Warm을 각각 분리하고 Prompt Prefix Hash 기록. B/C는 동일 Tool Output 최대 예산 적용.
3. **정답 검증:** 모델의 원인/수정안을 독립 Reviewer와 실행 테스트로 확인. Tool 출력의 중요 라인 누락, Artifact Retrieval 실패, Hallucinated File Path, P4 Revision 불일치 기록.
4. **Cost Receipt:** 모든 Worker/Reviewer/Compactor 호출, 실패 재시도, Cache Write/Read, 중단 호출을 합산. `verified_task_cost = sum(provider_billed_cost) / verified_completed_tasks`; 실패 작업은 분모에서 제외하되 실패 비용은 분자에 포함.
5. **Durability Fault Injection:** Worker 종료, 재개, 승인 만료, P4 Submit 중복 요청 각 20회. `task_id`와 `idempotency_key` 기준으로 Submit 중복 0건, Evidence Hash mismatch 0건, 승인 재사용 0건 요구.
6. **판정:** Token 절감만으로 합격시키지 않는다. 정확도·Evidence 재현·캐시 손익·P95 지연·실제 비용을 함께 보고한다.

## 5. 최종 도입 판정

- **바로 적용:** 신규 기능은 없음. 기존 Cost Receipt에 `quota_source`/`quota_freshness`/`unknown` 구분을 추가하는 설계 원칙은 바로 적용 가능.
- **PoC:** Headroom의 Tool Output 압축과 기존 Compact JSON/Strands Offload 비교.
- **아이디어 참고:** OpenCode #63916의 Account Quota CLI와 Model Routing 신호.
- **도입 가치 낮음:** 새 벤치마크 없이 '90% 압축' 수치를 전체 작업 비용 절감으로 간주하거나 Proxy를 전면 도입하는 것.

## 6. 확인 범위와 한계

2026-11-14 병합 PR 검색 결과는 대상 5개 저장소에서 0건이었다. 개별 저장소의 모든 Commit, Diff, CI, Release 및 전체 GitHub를 완전 열람한 것은 아니다. Headroom README의 수치는 업스트림 주장으로, 이 날짜의 신규 릴리스 또는 독립적으로 검증된 비용 절감 근거가 아니다. 오늘은 **검증 가능한 새 병합 구현 없음**을 명시하고, 유용한 PoC 후보와 운영 이슈만 별도 추적한다.

## 원본 링크

- https://github.com/headroomlabs-ai/headroom
- https://github.com/anomalyco/opencode/issues/63916
- https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-14.md
- https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-13.md
