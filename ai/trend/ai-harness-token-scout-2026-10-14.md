---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-14"
category: trend
tags: [ai-harness, context-engineering, token-optimization, compaction, skills, durable-state]
source: "reconstructed from archived Scout response"
updated: 2026-10-30
reconstructed: true
---
# AI Harness · Context/Token Optimization Scout — 2026-10-14

> 당시 전체 Markdown 유실로 2026-10-30 복원.

## 주요 변화
- Codex Capability Discovery V2: 원격 Executor의 Skill·Plugin·MCP metadata 구조화/캐시 — PoC
- Codex Async Compaction: Context 65%부터 비동기 압축 후보 준비 — PoC
- Codex #53691: 암호화 Compaction token budget과 transport size 분리 — 바로 적용 원칙
- Codex #53670: incomplete model response의 실제 사용 token도 비용 기록 — **바로 적용**
- Codex #53654: Subagent 생성 전 취소 시 provisional Worker 정리 — **바로 적용**
- Codex Guardian: stale 검증 취소 및 Evidence loss 계측
- Open SWE #3988: Task Context 중복 주입 방지
- Open SWE #4011: 단계별 Checkpoint 비동기 저장
- Deep Agents #6910/#6919: .git 검색 제외, ripgrep 우선
- Deep Agents #6904/#6906: Skill 변경 감지와 예약 작업별 Skill 고정
- Open SWE #4000: 대용량 파일 전체 다운로드 대신 필요한 부분 조회

## 정량 관찰
Deep Agents 운영 관측에서 2,142건 검색 중 136건이 35초 timeout에 도달했고, .git 제외 후 특정 저장소 검색이 1.9~2.8초에서 약 0.3초로 줄었다. 이는 검색시간 개선이며 LLM token 절감 실측은 아니다.

## 적용
Cost Receipt와 Context Baseline 분리, Provisional Worker Lifecycle, Guardian Evidence Loss 계측, Task Context 중복 주입 방지를 우선한다.
