---
title: AI Harness Token Scout - 2026-09-13
category: trend
tags: [ai, harness, context-engineering, token-optimization, codex, claude-code, agent]
source: GitHub / official docs / arXiv
updated: 2026-09-13
---
# AI Harness Token Scout - 2026-09-13

> 핵심은 컨텍스트를 무조건 요약하는 것에서 벗어나, 모델이 실제로 보는 토큰을 계측하고 지식 타입별 보존 정책을 달리하며 세션 identity와 cache affinity를 분리하는 방향이다.

## 주요 흐름

- **Knowledge Triage / Compaction Cliff**: Constraint/Procedure를 pin하고 Belief/Preference/Episodic에 서로 다른 압축 정책을 적용. Harness에서는 `PINNED / REQUIRED / RETRIEVABLE / EPHEMERAL`로 단순화 가능.
- **Codex model-visible token accounting**: ledger JSON 크기와 모델 입력 비용을 분리해 `raw_storage_bytes`, `model_visible_bytes`, `estimated_input_tokens`, `actual_input_tokens`, `cache_read_tokens`를 따로 계측.
- **Bounded Recap**: 최근 N자 자르기 대신 whole exchange 단위 선택, correction/caveat/evidence/next_action을 구조화한 handoff contract 사용.
- **Cache Affinity**: task/session identity와 prompt-cache reuse identity를 분리. `task_id`, `agent_session_id`, `parent_session_id`, `cache_affinity_id`, `pending_cl`을 별도 관리.
- **Production Harness Source Study**: Agent Loop, LLM Integration, Tools, Memory/Context, Safety, Orchestration, Extensibility의 7개 subsystem 관점으로 내부 Harness를 검토.
- **GSD Pi hardening**: requested/effective model provenance, journal reconciliation, model-visible tool contract를 복구 가능한 장기 실행의 핵심으로 활용.

## Perforce Harness 적용 구조

```text
Task / Pending CL
  │
  ├─ PINNED: policy / invariant / exact command
  ├─ REQUIRED: task / diff / failing test
  ├─ RETRIEVABLE: architecture / findings / evidence
  └─ EPHEMERAL: verbose logs / exploration
           ↓
 Model-visible Token Estimate
           ↓
 Budget Admission
           ↓
 Runtime Adapter
 Claude / Codex
           ↓
 Structured Handoff + Durable Ledger
```

## 우선순위

1. Typed Context 분류
2. model-visible token estimator
3. structured handoff
4. cache affinity ID
5. tool-contract regression
6. recovery reconciliation

## 참고 자료

- https://arxiv.org/abs/2608.22752
- https://github.com/searchsim-org/cikm26-knowledge-triage
- https://github.com/searchsim-org/knowledge-triage-skill
- https://github.com/openai/codex/commit/b04a2c264516ec2e6b3c91dd73ad18a21fd5a88f
- https://github.com/openai/codex/commit/8d3c6cc13d41127faa25eebeac00c48410dfe5c5
- https://github.com/openai/codex/commit/bc5957eac9e89e66f990ed490d11e625a4a3b02c
- https://arxiv.org/abs/2609.00006
- https://github.com/open-gsd/gsd-pi
