---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-09"
category: trend
tags: [ai-harness, context-engineering, token-optimization, hooks, subagents]
source: "reconstructed from archived Scout response"
updated: 2026-10-30
reconstructed: true
---
# AI Harness · Context/Token Optimization Scout — 2026-10-09

> 당시 전체 Markdown 유실로 2026-10-30 복원.

## 핵심 요약
당시 10개 항목을 선별했으며 핵심은 **Claude Code 2.1.295 Hook 실패 차단, Codex Content Part별 출처 관리, Subagent History·Capability 독립 상속, Open SWE TLA+ 기반 메시지 순서 검증**이었다. Claude Code는 Subagent Skill 사전 로드를 최대 32개로 제한하고 SessionStart Hook의 Context 중복 삽입 문제도 수정했다.

Open SWE에서는 동적 Context가 새로운 입력으로 잘못 해석돼 **279회 반복 호출과 약 $67 비용**이 발생한 운영 사례를 확인했다. 해당 수정은 이후 되돌려져 해결 기능이 아닌 loop-guard 설계 사례로 분류했다.

## Perforce 적용
중요 Hook 실패는 fail-closed, Evidence 출처 보존, 동일 상태에서 반복 Tool 호출 차단을 우선한다. 비용 최적화는 token만이 아니라 loop/retry 비용을 포함한 cost/verified-task로 측정한다.

## 결론
신규 독립 RAG·Compaction 절감 벤치마크는 확인되지 않았다.
