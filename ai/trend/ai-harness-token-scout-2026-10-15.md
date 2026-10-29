---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-15"
category: trend
tags: [ai-harness, context-engineering, token-optimization, cache, runtime-adapter, durable-state]
source: "reconstructed from archived Scout response"
updated: 2026-10-30
reconstructed: true
---
# AI Harness · Context/Token Optimization Scout — 2026-10-15

> 당시 전체 Markdown 유실로 2026-10-30 복원.

## 주요 변화
- Claude Code 2.1.300: 5분/1시간 Prompt Cache 생성 token 별도 계측 — **바로 적용**
- Claude Code 2.1.300: Compaction/Resume History 손실과 Tool 재검색 오류 수정
- Deep Agents #6900: Coding Model과 별도의 저비용 Summarizer — **PoC 우선**
- Deep Agents #6823/#6836: Async Subagent 부모 정보와 분산 Trace 연결
- Codex #54059: 준비된 History/Writer State 재사용 단회 Resume
- Codex #54008/#54060: 압축 세션 복원 및 필요한 Thread만 검색
- Codex Guardian: 승인과 Reviewer 정리 분리, stale Evidence 폐기
- Codex #54094: MCP 실패 원인 구조화
- Deep Agents Talon #6936: 예약 작업마다 독립 새 Thread
- Open SWE #4053: Model Loop는 Managed Runtime, Sandbox는 Backend 소유 — **PoC 우선**
- Open SWE #3958/#4060: 설정·Skill·MCP 연결 정보 영속 구조 개선
- Open SWE #4063: 결과 불확실 Review 제출 자동 재시도 방지

## 적용
주 작업 모델과 Compaction Model을 분리해 cost/quality를 A/B한다. 중앙 Orchestrator가 Perforce Workspace/Pending CL/Evidence를 소유하고 Claude Code/Codex Runtime만 교체하는 Adapter 구조를 PoC한다.
