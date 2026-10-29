---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-11"
category: trend
tags: [ai-harness, context-engineering, token-optimization, durable-state, model-routing]
source: "reconstructed from archived Scout response"
updated: 2026-10-30
reconstructed: true
---
# AI Harness · Context/Token Optimization Scout — 2026-10-11

> 당시 전체 Markdown 유실로 2026-10-30 복원.

## 주요 변화
- Codex #52937: 선택 Tool Output을 Compaction/Resume 이후에도 보존 — **PoC 우선**
- Codex #52825: Runtime 교체 후 이전 실행 재사용·중복 실행 차단 — **바로 적용**
- Codex #52742: Provider별 암호화 Output Replay 보존 — 제한 PoC
- Codex #52736: 모델별 Tool Catalog 변경 안내 최적화 — 아이디어 참고
- Open SWE #3907: 효과 없는 Reviewer Prompt 자동 재작성 제거
- Open SWE #3874: 동일 PR 기존 Worker 재사용 — **바로 적용**
- Open SWE #3842: Workspace 중심 Model Routing 설정 일원화 — **바로 적용**
- Open SWE #3917: Remote MCP에서도 Review 권한/Task Lifecycle 공유 — PoC

## 누락 연구 보강
*Beyond Token Savings*의 약 35,000 Agent 실행 분석에서는 일부 Terminal-Bench 실험에서 token을 약 1/3로 줄인 압축 정책이 실행 시간을 **20~80% 증가**시켰다. 따라서 핵심 KPI는 token 감소율보다 **검증 성공 작업당 총비용과 완료시간**이다.

## Perforce 적용
핵심 Evidence는 bounded retained context로 두고 원본은 Evidence Store에 둔다. Runtime generation과 execution receipt를 분리해 이미 실행됐을 가능성이 있는 shelve/build/submit을 재실행하지 않는다.
