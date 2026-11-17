---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-18"
category: trend
updated: 2026-11-18
tags: [ai-harness, agentic-workflows, model-routing, token-cost, context-engineering, subagents, perforce, claude-code, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-11-18

> 조사 기준: 2026-11-18 KST 오전, 주 관찰 구간 2026-11-16~17 UTC. jaywapp/wiki develop의 11/16·11/17 Scout 원문과 대조. 11/13 출시 기술을 11/16 공식 주간 업데이트에서 확인한 경우 릴리스 날짜와 발견 날짜를 분리했다. 업스트림 실행 Audit와 공식 릴리스 중심이며 사내 실측은 수행하지 않았다.

## 0. 핵심 결론

오늘은 **GitHub Agentic Workflows(gh-aw)의 모델 라우팅 기본값 변경 및 비용·Subagent 감사 자료**가 가장 의미 있다. 11/17 게시된 공식 Agent Persona Explorer 사례는 실제 세 번의 실행에서 토큰·Turn·모델 식별 실패·결정적 스크립트로 대체 가능한 데이터 수집 비중을 제시한다. 11/16 게시된 Agent Job Health Monitor 사례는 완료 성공과 무관하게 Context 증가·Cache Window·Turn 폭증을 추적해야 한다는 재현 가능한 신호를 제공한다. 11/13 gh-aw v1.2.3은 모델 자동 라우팅과 선언적 Connector 및 보호 파일 검사 등을 포함한다. 이전 Scout에서 다룬 Headroom, Tool Search BM25, Context Offload, Guardian Evidence, Codex History 오류를 신규 항목으로 반복하지 않는다.

**주의:** 아래 수치는 gh-aw 공개 Audit의 실행별 관측치다. A/B 인과적 절감률이나 동일 품질 작업당 Provider 청구 비용 절감률은 아니다.

## 1. gh-aw Agent Persona Explorer — Subagent 전략 실험의 실측 및 Audit 결함

- **원본/날짜:** GitHub Agentic Workflows 공식 블로그 2026-11-17, https://github.github.com/gh-aw/blog/ ; 소스 https://github.com/github/gh-aw .
- **신규성:** 11/14·15·16 세 번의 성공한 워크플로 실행을 공개하고 `sub_agent_strategy_prefix_v1` A/B 구성을 노출. `per_scenario`와 `batch`를 비교하지만 서로 다른 날짜·작업량·모델 관측 조건이므로 전략 간 성능 우열은 단정할 수 없다.
- **관측:** 11/14 per_scenario 23 turns / 1.44M audit tokens / 14.6분; 11/15 batch 20 turns / 1.11M / 13.9분; 11/16 per_scenario 9 turns / 690k / 12.7분. 3회 모두 이슈 생성 성공. 합계 37.1 AI credits. Audit는 선언된 Subagent Model이 실제 관측되지 않았다고 세 번 모두 경고. 로그의 11/14 토큰=0과 Audit 1.44M이 충돌하므로 Audit 기준으로만 비교해야 한다.
- **내부 동작:** 정기 워크플로가 Persona별 Agent 응답을 평가하고 결과를 이슈에 게시하며 실행 Audit가 Turn·토큰·Subagent 모델 관측·결정론적 대체 가능 작업을 판정. 데이터 수집으로 분류된 Turn 비율은 11/14 91%, 11/15 90%, 11/16 77%. 이 수치는 자동 대체 시 실제 절감률이 아니라 Audit의 분류 결과다.
- **토큰 절감 원리:** API 검색/파일 수집/정규화/중복 검사 같은 결정론적 부분을 Agent Turn 밖의 Script로 이동하고, 모델에는 필터링된 증거만 전달. 같은 데이터 수집을 반복하는 Tool Loop를 줄이는 것이 핵심. Turn 수 감소가 토큰 감소를 설명할 가능성은 있으나 동일 입력 A/B 검증 필요.
- **장점:** 작업 단위 Audit, Subagent 모델 검증 실패를 숨기지 않음, Script Offload의 측정 가능한 후보. **단점/위험:** Audit Token과 로그 Token 불일치, Subagent 실제 Model 미확인, 자동 스크립트의 검색 누락·신선도 문제, 3회 표본과 날짜 혼입.
- **P4·Claude Code·Codex 적용:** `p4 describe`, TeamCity Build 상태, GitHub PR 목록, Log Hash 및 변경 파일 추출은 Deterministic Collector에서 수행. Agent에는 Evidence Manifest와 상위 관련 조각만 전달. 각 호출에 `requested_model`, `observed_model`, `task_id`, `audit_tokens`, `provider_billed_cost` 별도 기록.
- **재현:** 동일 P4/UE5/TeamCity 실패 사례 30개를 (A) Agent 직접 수집, (B) Script 수집+Agent 판단으로 각 3회 교차 실행. 결과 정확도, Evidence Recall, Provider 실제 비용, Tool Turn, P95 지연 비교. 모델 관측 누락 0, 근거 누락 0이 게이트. **평가: PoC 최우선.**

## 2. gh-aw Agent Job Health Monitor — 성공한 Agent의 비용 폭주 탐지

- **원본/날짜:** GitHub 공식 블로그 2026-11-16, https://github.github.com/gh-aw/blog/ .
- **신규성:** 모니터 워크플로의 11/13~15 실행 Audit를 공개하여 성공 여부와 비용 효율을 분리해 보여줌.
- **관측:** 11/13 60 turns / 3.25M audit tokens / 21.6분, 11/14 3 turns / 547k / 26.5분, 11/15 2 turns / 339k / 24.1분. 모두 성공하고 각 실행 2회 Write. 11/15 Audit의 Context Growth 약 29배, Loop Check 275 vs Threshold 3, Firewall 155 requests, Cache Window 5분 초과 가능성 경고. Loop Check 실패를 실제 275회 재시도로 해석하면 안 된다(실제 Retry 기록 0).
- **내부 동작/절감 원리:** 실행 완료 여부가 아닌 Audit 신호(`turns`, `context_growth_ratio`, `cache_window_gap`, `tool_calls`, `write_actions`)로 이상 작업을 식별. 정적 데이터 수집을 스크립트로 이관하고 Cache Window를 깨는 긴 간격 및 불필요한 컨텍스트 재주입을 검토한다.
- **Trade-off:** 감사 비용·추적 저장량 증가, 과도한 Turn Limit이 장기 디버깅 품질을 해칠 수 있음. Cache Window 경고는 가능성으로 보고되었지 실제 청구액 원인으로 검증된 것은 아님.
- **P4 적용:** TeamCity 실패 모니터에서 1일당 동일 경고 1회로 묶고, 변경 없는 Build 상태 Poll은 LLM을 호출하지 않음. `cost_per_verified_incident` 및 불필요한 Repeat Turn 비율로 평가.
- **평가: 바로 적용할 관측 원칙 / 구현 PoC.**

## 3. gh-aw v1.2.3 — Cost-first Model Routing과 Connector Runtime 정책

- **원본:** 2026-11-13 pre-release https://github.com/github/gh-aw/releases/tag/v1.2.3 ; 2026-11-16 공식 Weekly Update https://github.github.com/gh-aw/blog/ .
- **신규성:** 모델 미지정 Eligible Workflow가 GitHub Copilot에서 `goal: cost`, `mode: auto`로 라우팅. `model: router`, `router/economy`, `router/balanced`, `router/robust` 지원. 이전 고정 모델 선택을 보존하려면 `engine.model-routing: false`. 이 릴리스는 11/13에 나왔으므로 11/17 신규 출시로 기록하지 않는다.
- **내부 동작:** Workflow Compiler/Runtime이 명시 모델 또는 Routing Profile을 받아 실행 모델을 선택. 선언적 Connector는 `.github/workflows/connectors/<provider>.md`에서 읽기 Profile과 쓰기 효과를 지정. `merge-pull-request`는 실제 변경 파일의 Protected File 정책을 확인. MCP Workflow Write Tool은 기본 비활성. 429 `Retry-After`를 제한적으로 준수하며, 로그는 JSONL Streaming 지원.
- **토큰·비용 원리:** 적합한 단순 작업을 저비용 모델로 라우팅하고 불필요한 실행을 Skip Gate로 차단할 수 있음. **정량 청구 비용 감소는 릴리스에 제시되지 않았다.** 모델 라우팅의 Tool 선택 정확도, Guardian 검토 품질, Cache 적중, 실패 재시도까지 측정해야 함.
- **장점:** 정책 중심 Model Selection, Connector Capability 명세, 보호 파일 검사, 감사 가능한 실행 로그. **위험:** 기본 라우팅 변경이 재현성과 모델 품질을 바꿈; Protected File 예외 오설정; Connector Migration 및 재컴파일 필요. P4에 그대로 사용 가능한 공식 Connector가 있다는 뜻은 아님.
- **P4·Claude Code·Codex 적용:** Task Classify → Route Profile → Worker → Evidence Reviewer. Read-only P4 조회는 Economy 후보, Submit·CL Review·Build Cancel 등 고위험 작업은 고품질 검토 및 별도 승인. Model Routing의 실제 선택 모델과 비용을 Ledger에 기록.
- **재현:** 50개 태스크를 Fixed Model과 Routed Model로 교차 평가. 성공률, Reviewer Agreement, 부작용 0건, Cache Read/Write, 청구 비용, 실패 재시도 포함 비용 측정. 기본 모델 변경 시 품질 Regression Test 필수. **평가: PoC.**
- **추가:** v1.2.2(11/10)의 `cancel-work --obsolete` 및 Skip-if-decision은 Durable Task Lifecycle에서 불필요한 작업을 제거하는 구현 사례이나, 오늘 신규 릴리스로 계산하지 않음.

## 4. OpenCode #64304 — Model Routing에서 Privacy Policy와 Quota를 혼동하지 말 것

- **원본/날짜:** https://github.com/anomalyco/opencode/issues/64304 , 2026-11-16 등록, 11/17 지원 응답 반영.
- **신규성:** 4개 Free Model에서 Training Consent가 꺼진 상태에서 HTTP 400 발생. 신고자는 11/17 Support가 네 모델 모두의 오류를 확인하고 Quota Limit이 아니며 Zero Retention/No Training 조건과 동작이 어긋난다고 인정했다고 기록. **수정 확인 없음.**
- **내부 동작:** Hosted Service의 Consent Gate가 문서상 Provider Privacy 속성과 일치하지 않음. Client 자체에서 Consent Check를 찾지 못했다는 응답도 있으나 서버 소스 미공개. Provider Policy가 실제 실행을 결정하므로 모델 메타데이터만으로 호출 가능 여부를 확정하면 안 됨.
- **토큰 원리:** 직접 압축 없음. 잘못된 모델 선택 후 실패·Fallback을 줄이는 운영 효과만 예상. 신고 사례의 요청은 Tool 실행 전 실패했고 Reported Cost $0. 이는 일반적인 재시도 비용 0을 뜻하지 않음.
- **적용:** `model_capability`, `data_retention_policy`, `consent_required`, `quota_remaining`, `routing_eligibility`, `last_verified_at`를 분리. 실제 Consent Policy 거절은 Quota Exhaustion과 다른 에러 코드로 Ledger에 남기고 자동 정책 완화를 금지.
- **평가: 바로 적용할 정책 원칙 / OpenCode Free Provider 직접 도입은 가치 낮음(사내 데이터 정책 검증 전).**

## 5. 범주별 변화 및 중복 제거

| 범주 | 이번 신규 근거 |
|---|---|
| Coding-agent workflow / orchestration | gh-aw 실행 Audit, Script Collector와 Agent 판단 분리 |
| Skills/hooks / progressive disclosure | 별도 신규 구현 확증 없음. gh-aw Connector 명세는 Capability 분리 참고 |
| Context pruning / compaction | 29배 Context Growth 관측. 신규 압축 알고리즘 아님 |
| Sub-agent context isolation | 선언된 Subagent Model 미관측 Audit 경고 |
| RAG·검색 selective context | Deterministic Evidence Collector PoC, 새 Retrieval 알고리즘 아님 |
| Prompt/Skill 경량화 | 신규 실측 없음 |
| Tool Output 축약 | 신규 압축 성과 없음; Evidence Manifest 선별 전달 실험 |
| Cache | Cache Window 초과 가능성 경고, 청구액 검증 없음 |
| Session / handoff / ledger | JSONL 로그 및 Task/Model Attribution Ledger 설계 |
| Model routing | gh-aw v1.2.3 Cost-first Routing |
| Token/cost | 공개 Audit Token과 Log Token 불일치, 3회 실행 37.1 AIC |
| Durable state / runtime adapter / evidence verification / task lifecycle | gh-aw obsolete queue, skip gate, protected-file 정책, Model Consent 실패 분류 |

## 6. 공통 실험 및 측정 계약

```json
{
  "task_id": "string",
  "phase": "collect|reason|review|execute|verify",
  "requested_model": "string",
  "observed_model": "string|null",
  "provider": "string",
  "input_tokens": 0,
  "output_tokens": 0,
  "cache_read_tokens": 0,
  "cache_write_tokens": 0,
  "provider_billed_cost": null,
  "audit_tokens": null,
  "tool_output_bytes": 0,
  "evidence_manifest_sha256": "string",
  "p4_cl": null,
  "teamcity_build_id": null,
  "approval_version": null,
  "idempotency_key": "string",
  "result_verified": false
}
```

측정 단위는 **`verified_task_cost = sum(all_provider_billed_cost_including_failures) / count(verified_completed_tasks)`**. Audit Token은 별도 열로 유지하고 Provider Billing Token과 혼용하지 않는다. `observed_model=null`이면 Model Routing 절감 실증에서 제외하고 관측 실패를 보고한다. Task Lifecycle은 `created → collecting → reasoning → reviewing → awaiting_approval → executing → verifying → completed/failed/cancelled`로 관리. P4 Submit은 Approval Version과 Idempotency Key를 검증하고 실제 Submit 결과를 재조회한다.

## 7. 한계 및 다음 검증

오늘의 가장 구체적인 정량 자료는 공개 gh-aw Audit다. 세 번의 서로 다른 작업 실행을 동일 입력 A/B로 해석하지 않았으며, 91%·90%·77% 데이터 수집 분류가 실제 절감 가능 토큰 비율이라고 주장하지 않는다. 11/13 pre-release가 사내에서 안전하게 배포 가능한 정식 버전이라는 의미도 아니다. OpenCode 이슈는 외부 신고 및 Support 응답에 의존한다. 주요 모든 저장소의 전체 Commit/Diff/Benchmark를 전수 검증하지 않았고, 11/17 UTC 신규 병합 PR을 빠짐없이 열거하지 않았다. **동일 품질 완료 작업당 실제 Provider 비용 절감률은 신규 확증되지 않았다.**

## 원본

- https://github.github.com/gh-aw/blog/
- https://github.com/github/gh-aw/releases/tag/v1.2.3
- https://github.com/github/gh-aw
- https://github.com/anomalyco/opencode/issues/64304
- https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-17.md
- https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-16.md
