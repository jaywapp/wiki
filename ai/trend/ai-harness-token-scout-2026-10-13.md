---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-13"
category: trend
tags: [ai-harness, context-engineering, token-optimization, skills, compaction]
source: "reconstructed from archived Scout response"
updated: 2026-10-30
reconstructed: true
---
# AI Harness · Context/Token Optimization Scout — 2026-10-13

> 당시 전체 Markdown 유실로 2026-10-30 복원.

## 주요 변화
- Deep Agents 0.7.24: Async Subagent fork/isolated 선택 및 부모 상태 격리 — **PoC 우선**
- Deep Agents Code 0.1.84: Skill 서버 로드 및 경로·신뢰 검증 — 바로 적용 원칙
- Deep Agents ACP #6840: Compaction 이후 환경 변경을 Delta로 전달해 Stable Prefix 보존
- Open SWE #3943: Tool Schema를 Worker별 재사용
- Open SWE #3946/#3945: 중복 Thread 조회 제거, Sandbox 초기화 병렬화
- Codex #53451: Output 한도 불완전 응답의 무의미한 재시도 방지 — **바로 적용**
- Codex #53452: Turn 종료 시 입력 interleave 방지 — **바로 적용**
- Codex #53331: 원격 프로세스 종료 후 열린 Output Stream 정리
- Open SWE #3972: 승인 정책을 작업 branch가 아닌 default branch에서 조회
- Codex Guardian #53393: Compaction 실패 원인 세분화, 잘못된 Evidence 재사용 방지

## 적용
Turn Finalization Barrier → FailurePolicy 분리 → Skill Trust Gate → Parent/Child State 격리 → Stable Context Delta → Async Fork A/B 순으로 권장한다.
