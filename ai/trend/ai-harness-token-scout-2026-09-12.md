---
title: AI Harness & Token Scout - 2026-09-12
category: trend
tags: [ai, harness, agent, claude-code, codex, context-engineering, token-optimization]
source: GitHub and official project sources
updated: 2026-09-12
---
# AI Harness & Token Scout - 2026-09-12

> 전일 리포트 이후 새롭게 확인된 Coding Harness·Context Engineering·Token Optimization 변화 중 실무 가치가 높은 것만 선별한 일일 리포트.

## 핵심

1. **Claude Code v2.1.269** — resume/interrupt/cloud-first-request 경로의 prompt-cache correctness를 강화하고 `claude plugin eval`을 추가했다. Token-saving Hook/Skill은 토큰 감소뿐 아니라 task score 유지 여부까지 regression test하는 방향이 적합하다.
2. **Codex main** — context overflow 후 truncate하는 대신 최종 request overhead와 reserved margin을 포함한 Budget Admission을 적용하고 Required/Optional evidence를 구분하는 방향으로 진화했다. 또한 task/turn/model 단위 token telemetry가 중요해졌다.
3. **Flow** — session memory를 revisioned instructions, findings+evidence, work log, docs/skills로 구성된 source-cited Project Brain으로 승격하고 bounded linked retrieval을 적용한다.

## Perforce + Claude/Codex 적용

```text
Durable Task State
  ├─ Revisioned Notes
  ├─ Evidence
  └─ Root Turn ID
          ↓
Context Budget
required / useful / optional
          ↓
Runtime Adapter
Claude / Codex
          ↓
Turn×Model Telemetry
          ↓
Cache / Quality Regression
```

### 우선순위

- Reviewer context를 Required/Optional로 분류하고 request budget admission 적용
- Task/turn/model 단위 token-cost telemetry 설계
- Claude resume/auto-resume/compact cache regression test
- Pending CL 기반 revisioned notes + evidence-required findings PoC
- 반복 검증된 knowledge를 Skill/Doc로 승격

## 참고 자료

- https://github.com/anthropics/claude-code/releases/tag/v2.1.269
- https://github.com/openai/codex/releases
- https://github.com/openai/codex/commit/fcd90d8f07ab558dc4a5d44ca85f9c6ae67d13e1
- https://github.com/openai/codex/commit/c8a8295e798af970ef5a2bcd9ce2229db87edb6b
- https://github.com/samyakkkk/flow
- https://github.com/samyakkkk/flow/pull/108
