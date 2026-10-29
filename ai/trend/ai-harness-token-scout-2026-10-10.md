---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-10"
category: trend
tags: [ai-harness, context-engineering, token-optimization, claude-code, codex, open-swe]
source: "reconstructed from archived Scout response"
updated: 2026-10-30
reconstructed: true
---
# AI Harness · Context/Token Optimization Scout — 2026-10-10

> 당시 전체 Markdown 유실로 2026-10-30 복원.

## 주요 변화
| 항목 | 변화 | 평가 |
|---|---|---|
| Claude Code 2.1.296 | Subagent별 autoCompactWindow, Workflow 전용 모델 설정 | 바로 적용 / A/B |
| Claude Code 2.1.296 | Resume 중 완료 Tool 중복 실행 방지, token/cost 계산 수정 | 바로 적용 |
| Codex #52671/#52686 | 필요한 Tool Output만 History에 보존하는 retain 옵션 | PoC |
| Codex #52535/#52659 | Parent History Cache Prefix 재사용, Child Context Window 분리 | PoC |
| Codex #52295/#52676 | Tool Catalog 변경 안내 최소화, Capability Root 복구 | 바로 적용 |
| Codex #52568/#52640 | 권한 거절 구조화, 진전 없는 Agent 반복 제한 | 바로 적용 |
| Open SWE #3793/#3840 | Skill·Blob PostgreSQL 영속화, 실행 단위 비용 기록 | 바로 적용 / PoC |
| Open SWE #3557/#3858 | QuickJS 선택적 Tool 실행, 구조화 입력 | 제한적 PoC |
| Open SWE #3817 | 승인 가능한 Diff Hunk 선택적 제외 및 Coverage 검증 | 고위험 PoC |

## 적용 판단
Research/Build/Reviewer가 동일 Context Window와 Compaction 정책을 쓸 필요가 없다. 대용량 TeamCity/P4 output은 retain 대상 핵심 verdict/evidence pointer와 원본 Artifact를 분리한다. Task Ledger, Evidence Store, Cost Receipt도 분리한다.

## 결론
새 독립 RAG/Compaction 절감률은 확인되지 않았다.
