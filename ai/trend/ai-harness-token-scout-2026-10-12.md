---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-12"
category: trend
tags: [ai-harness, context-engineering, token-optimization, cache, durable-state]
source: "reconstructed from archived Scout response"
updated: 2026-10-30
reconstructed: true
---
# AI Harness · Context/Token Optimization Scout — 2026-10-12

> 당시 전체 Markdown 유실로 2026-10-30 복원.

## 주요 변화
- Codex #53150: Session 재개 시 기존 Thread 권한/설정 복구 — **바로 적용**
- Open SWE #3940: Agent·Reviewer·Subagent 1시간 Prompt Cache — PoC
- Codex #53049: 연결별 승인 응답 격리 및 중복 응답 방지 — **바로 적용**
- Open SWE #3939: 자동화가 이전 실행 공개 Thread를 읽도록 개선
- Codex #53155: Runtime 종료 중 마지막 이벤트 유실 방지
- Open SWE #3936: 전체 대화 대신 최종 요구사항을 간결하게 전달
- Deep Agents Talon #6862: 검색된 대화 작성자와 실행 권한 분리
- VulContextBench: 검색 코드와 최종 Evidence 코드의 차이 측정 — PoC

## 적용
Prompt cache TTL은 cache-write/read 가격과 유휴시간을 함께 비교한다. Durable State에는 Permission Generation과 Connection Generation을 포함한다. Reviewer 최적화는 token 절감과 함께 Evidence 전달률/결함 탐지율을 측정한다.
