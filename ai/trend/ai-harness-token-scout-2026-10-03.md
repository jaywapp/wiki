---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-03"
date: 2026-10-03
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, claude-code, codex, deep-agents, perforce]
---

# 2026-10-03 AI Harness · Context/Token Optimization Scout

## 조사 범위와 중복 제거

`jaywapp/wiki` develop의 `ai/trend/`와 최근 Scout 실행 내용을 대조했다. develop에는 2026-09-30까지 canonical 보고서가 존재한다. 10월 1~2일 실행에서 이미 조사한 BareBaseline, revisioned resume, Skill invocation telemetry, 1 KiB inter-agent notice, archive/context 분리, StepCapabilitySnapshot, eviction-safe mailbox, Guardian stable-prefix ordering, evidence-aware handoff, selective vector indexing은 중복 제외했다.

오늘은 다음 7개 흐름이 새로 볼 가치가 있었다.

| 항목 | 핵심 | 평가 |
|---|---|---|
| Claude Code 2.1.288 | partial-response continuation, compaction/resume 정합성 강화 | 바로 적용 |
| Deep Agents Skill Tool Disclosure | Skill을 읽은 뒤에만 해당 Tool schema 공개 | 원칙 바로 적용 / PoC |
| Codex command persistence projection | durable command output 64 KiB 제한 | 바로 적용 |
| Talon bounded retrieval | scan budget 소진과 no-match를 구분 | 바로 적용 |
| Guardian shadow verifier | 기존/후보 verifier의 agreement와 latency 비교 | 바로 적용 |
| Trajectory-aware benchmark subset | 10% subset으로 token cost 약 90% 감소 | Harness Lab PoC |
| HERO | 성공 trajectory의 불필요 turn을 학습 단계에서 억제 | 아이디어 참고 |

## 1. Claude Code 2.1.288 — timeout 뒤 새 turn보다 continuation

2026-10-02 공개된 v2.1.288은 non-interactive session과 subagent의 mid-response API timeout 때 이미 받은 partial response에서 계속 진행하도록 수정했다. thinking-only response는 retry하고, unattended watchdog은 긴 stream timeout을 무한 반복하지 않고 3회 후 중단한다.

또 직전 reply가 token usage를 0으로 보고해도 긴 conversation은 auto-compaction을 수행한다. compaction 직후 resume에서 복원한 file/context가 사라지는 문제, 마지막 response가 저장되지 않는 문제, 동일 session file이 load 중 다시 쓰여 잘린 transcript를 읽는 문제도 수정됐다. 원격 MCP 결과가 16 MB를 넘거나 parse되지 않을 때 동일 Tool call이 중복 실행될 수 있던 문제도 고쳤다.

Harness에서는 timeout을 곧바로 fresh replay로 처리하지 말고, task/turn/provider-response/partial-response hash/마지막 완료 Tool/model generation/capability generation을 가진 ContinuationReceipt를 두는 편이 좋다. Runtime generation이 유지되는 동안 continuation을 우선하고, model·permission·capability가 바뀌면 fresh projection으로 전환한다.

토큰 절감은 이미 생성한 reasoning과 Tool planning을 재실행하지 않는 데서 나온다. Perforce 환경에서는 모델 요청의 timeout과 원격 작업의 완료 여부 불명 상태를 분리해 중복 실행 가능성을 낮춰야 한다.

**평가: 바로 적용.**

Source: https://github.com/anthropics/claude-code/releases/tag/v2.1.288

## 2. Deep Agents — Skill을 읽을 때 Tool도 함께 progressive disclosure

Deep Agents main의 #6552는 `SKILL.md` frontmatter에 `metadata.include_tools`를 선언할 수 있게 했다. 해당 Skill이 읽히기 전에는 전용 Tool schema가 모델에게 노출되지 않고, Skill을 읽은 뒤에만 Tool definition이 추가된다.

mid-conversation Tool definition을 지원하는 Claude/OpenAI 경로에서는 Skill read 직후 Tool definition을 system message에 추가해 기존 cached prefix를 유지한다. Tool resolver는 runtime context를 받아 역할과 권한에 따라 노출 Tool을 달리할 수 있다. Skill read가 compaction으로 사라지면 그 Tool도 다시 호출할 수 없게 된다. SkillsMiddleware 위치도 prompt caching 직전으로 이동해 실제 fallback/routing 결과와 compacted conversation을 기준으로 disclosure를 결정한다.

Perforce Harness에서는 상시 Core Tool을 최소화하고 Perforce·Build·Review 같은 Skill별 Tool 묶음을 따로 두는 방식이 적합하다. 측정 지표는 schema bytes saved, Skill read rate, invalid Tool call, turns per verified task가 좋다.

토큰 절감 원리는 자주 쓰이지 않는 Tool schema를 매 turn의 stable prefix에서 빼는 것이다. 반대로 자주 쓰는 Tool까지 숨기면 Skill read turn이 늘 수 있으므로 A/B가 필요하다.

조사 시점 latest stable인 deepagents 0.7.21에는 아직 포함되지 않은 main 변화다.

**평가: 원칙 바로 적용 / model별 disclosure 구현은 PoC.**

Sources:
- https://github.com/langchain-ai/deepagents/commit/92cd8e7fa8b1f8da346ec91e420a820518497f2c
- https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.21

## 3. Codex — durable history의 command output도 bounded projection으로

Codex #50427은 paginated history에 저장하는 완료 command의 aggregated output을 64 KiB로 제한했다. UTF-8 경계를 깨지 않으면서 앞·뒤 내용을 보존하고 중간 생략 marker를 넣는다.

중요한 점은 rollout recording, live thread-store append, legacy history migration이 같은 persistence policy를 사용한다는 것이다. Telemetry도 원본 payload bytes와 실제 persisted payload bytes를 따로 측정한다.

내부 Harness도 원본 log와 durable ledger projection을 분리하는 편이 좋다. Ledger에는 command identity, 종료 상태, duration, bounded head/tail, truncation 여부, 원본/영속 byte 수, full artifact reference와 hash를 저장하고 원본은 별도 Evidence Store에 둔다.

이 방식은 resume/review 때 대형 command output이 계속 materialize되는 비용과 state 크기를 동시에 줄인다. 다만 유일한 diagnostic이 중간에 있을 수 있으므로 full artifact 검색 경로는 유지해야 한다.

**평가: 바로 적용.**

Source: https://github.com/openai/codex/commit/bee28e8a061c38c781c74299f2c1d90e3732da18

## 4. Talon — bounded retrieval에서 0건과 incomplete를 구분

Deep Agents Talon #6740은 장기 history 검색이 한 번에 최대 500 ordering records만 scan하도록 제한하면서도, budget을 다 썼다는 사실을 명시한다. 응답은 `scan_status=ok|limit_reached`, `has_more`, continuation token을 가진다.

중요한 차이는 현재 page가 0 results여도 scan budget이 끝났을 뿐 오래된 history가 남아 있다면 `has_more=true`로 반환한다는 것이다. 1201-message test에서도 여러 page를 거쳐 마지막에야 complete 상태가 된다. list/read가 scan budget을 넘는 경우에는 전체 turn을 실패시키기보다 검색 조건을 좁히라는 Tool error를 준다.

Perforce/RAG에서는 "호출부가 없다" 같은 부재 판단을 complete coverage에서만 evidence로 인정해야 한다. SearchEvidence에 query, index generation, scope, results, scan status, continuation, scanned count, freshness를 넣으면 된다.

토큰 절감은 전체 repository/history를 한 turn에서 훑지 않으면서 false negative를 피하는 데서 나온다. continuation이 과도하게 많아지면 더 구조화된 symbol/dependency index로 승격해야 한다.

**평가: 바로 적용.**

Source: https://github.com/langchain-ai/deepagents/commit/11600fb7a

## 5. Codex Guardian — verifier 교체는 shadow agreement부터

Codex #50273은 Guardian V2의 새 Decisions classifier와 기존 authoritative Responses score를 같은 요청에서 비교하는 telemetry를 추가했다. 결과는 agree/disagree/unavailable로 남기며, 두 backend가 모두 성공한 동일 요청에서만 latency를 비교한다. 새 backend의 비교 결과는 기존 authoritative 판정을 바꾸지 않는다.

Perforce Reviewer를 더 빠르거나 저렴한 model로 전환할 때 같은 패턴이 유용하다. 기존 reviewer를 authoritative로 유지하고 후보 reviewer를 shadow로 실행해 verdict agreement, critical false-negative, evidence-missing rate, latency, cost per verified change를 측정한 뒤 promotion한다.

직접적인 context compression은 아니지만 model routing을 품질 저하 없이 최적화하기 위한 안전한 rollout 장치다. Shadow 단계 자체는 비용이 추가되므로 representative subset에 먼저 적용하는 편이 좋다.

**평가: 바로 적용.**

Source: https://github.com/openai/codex/commit/ca466061d64f0b44f416135c7fd06aa7af850bbc

## 6. Harness Lab — trajectory-aware subset으로 regression 평가비 절감

Trajectory-Aware Benchmark Subset Selection 연구는 historical pass/fail outcome으로 task를 먼저 grouping하고, sanitized agent trajectory embedding에서 각 group의 대표 task를 deterministic하게 선택한다. 이후 Harness/model/config 변경 때 full benchmark 대신 5~10% subset으로 regression signal을 먼저 본다.

연구는 76개 subset configuration을 same-config rerun, model/config 변경, framework 변경의 세 scenario에서 비교했다. 5~10% trajectory-aware subset은 강한 baseline보다 average estimation error를 3~11%, worst-case error를 4~11% 낮췄다. 10% subset은 median estimation error를 5% 미만으로 유지하면서 token cost를 약 90% 줄였다.

Replication repo에는 `reproduce.py`, pipeline, baseline/trajectory-aware/ablation/cost 실험 코드와 결과가 공개되어 있다.

Perforce Harness Lab에서는 100~300개의 과거 CL/task corpus를 full set으로 유지하고, 주기적 full run에서 얻은 trajectory/outcome으로 약 10% daily/PR subset을 갱신하는 방식이 현실적이다. model/framework가 크게 바뀌면 subset drift가 생길 수 있으므로 full evaluation을 완전히 대체하면 안 된다.

전날 조사한 EarlyEval과는 상호 보완적이다. EarlyEval은 이미 시작한 task를 중간 종료하고, trajectory subset은 실행할 task 자체를 줄인다.

**평가: Harness Lab PoC 우선순위 높음.**

Sources:
- https://arxiv.org/abs/2609.24928
- https://github.com/SAILResearch/swe-agent-subset-selection

## 7. Research Watch — HERO

HERO는 inference-time compaction과 다른 방향으로, token-efficient coding behavior를 RL training에 내재화한다. 논문은 성공한 trajectory 사이에도 token 사용량 차이가 크고, 반복 Tool call·과도 탐색·잘못된 command 같은 unproductive turn이 효율 저하와 연결된다고 본다.

Resolution-first 학습 뒤 trajectory-level/turn-level 효율 credit를 추가한다. 논문 보고 기준 640 training tasks로 Qwen3.5 variants의 SWE-bench 평균 resolution을 37.4%에서 42.2%로 높였고, GRPO 대비 더 높은 평균 resolution 향상과 함께 39.8% 적은 token을 사용했다.

현재 Claude Code/Codex API Harness에 직접 적용하기보다는 repeated Tool call rate, exploration without state change, erroneous command rate, successful-task token p25/p50/p90 같은 telemetry를 추가하는 근거로 활용하는 편이 낫다. 공식 GitHub는 조사 시점 README만 있어 training pipeline 재현성도 아직 낮다.

**평가: 아이디어 참고 / 직접 도입 가치 낮음.**

Sources:
- https://arxiv.org/abs/2609.38885
- https://github.com/XLearning-SCU/HERO
- https://huggingface.co/collections/XLearning-SCU/hero

## 오늘의 적용 우선순위

1. ContinuationReceipt로 partial-response timeout과 resume를 연결
2. SkillCapabilityBundle로 Skill 활성화 뒤 Tool schema disclosure
3. CommandEvidence persistence projection으로 durable history를 bounded하게 유지
4. SearchEvidence에 complete/incomplete coverage와 continuation 추가
5. VerifierShadowRecord로 reviewer/model 교체 전 shadow 검증
6. Trajectory-aware 10% regression set으로 Harness Lab 반복 실험비 절감
7. HERO식 unproductive-turn 지표만 telemetry에 우선 추가

## 결론

오늘 변화는 하나의 방향으로 모인다. **Context를 항상 싣지 않고 필요할 때만 capability를 공개하며, durable state에도 raw Tool output을 그대로 쌓지 않고, bounded retrieval은 coverage 상태를 명시하고, cheaper verifier나 Harness 변경은 representative evaluation으로 검증한다.**

Perforce + Claude Code + Codex 환경에서는 Context Plane, Capability Plane, Durable Evidence Plane, Evaluation Plane을 분리해 각각의 generation과 projection을 관리하는 것이 가장 재사용성이 높다.
