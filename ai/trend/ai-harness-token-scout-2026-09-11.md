---
title: AI Harness & Token Scout - 2026-09-11
category: trend
tags:
  - ai
  - harness
  - token-optimization
  - context-engineering
  - claude-code
  - codex
source: GitHub and official technical sources
updated: 2026-09-11
---

# AI Harness & Token Scout - 2026-09-11

> 2026-09-11 KST 기준, 전일 리포트와 Wiki 기존 문서를 제외하고 새롭게 확인된 Harness·Context Engineering·Token Optimization 변화 중 실무 가치가 높은 항목만 정리했다.

## 한줄 요약

오늘의 핵심은 **Context를 영구 기록과 작업용 working set으로 분리하고, cache prefix를 안정화하며, 토큰을 줄이기 위해 추가 turn을 만들지 않는 것**이다.

## 오늘의 핵심 발견

| 항목 | 신규성 | 핵심 포인트 | 평가 |
|---|---|---|---|
| Strands Agents Context Manager | 2026-09-10 session/cache 관련 구현 변경 | L0 working context와 L1 durable stash 분리, session-derived cache key | PoC |
| Claude Code v2.1.268 | 2026-09-10 공개 | prompt cache를 깨던 dynamic prefix/tool-list 변경 수정 | 바로 적용 |
| Codex compaction issue #44363 | 2026-09-10 신규 bug report | compaction과 durable transcript를 분리해야 한다는 운영 경고 | 바로 적용(설계 원칙) |
| Token Optimizer MCP | 2026-09-09~10 주요 실험/기능 변경 | deny→retry보다 same-turn rewrite, net token accounting | PoC |
| base-harness | 2026-09-10 첫 공개 release | 공통 Harness SoT → Claude/Codex/OpenCode adapter → evidence doctor | PoC |

전일 리포트에서 이미 다룬 `superharness`, `AOS Harness`, `repo-harness`, `Harness Kit`, `agent-harness-dev`는 오늘 신규 항목으로 반복하지 않았다.

## 핵심 방법론

- **Working Context와 Durable History 분리**: 모델이 지금 보는 working set과 원본/evidence 저장소를 별도 계층으로 관리한다.
- **Stable Prefix + Dynamic Tail**: system/core rules/tool contract/stable skills를 cache-friendly prefix로 유지하고 task/session 상태는 뒤에 둔다.
- **Compaction은 derived state**: append-only raw ledger를 보존하고 compact summary는 재생성 가능한 snapshot으로 취급한다.
- **Token보다 Turn 최적화**: `deny → retry`로 추가 turn을 만드는 대신 Hook에서 동일 호출의 output을 compact/rewrite한다.
- **Harness SSoT**: Contract/Skill/Rule/Hook을 공통 registry에서 관리하고 Claude/Codex adapter가 runtime 형식으로 materialize한다.

## Perforce + Claude Code + Codex 적용

```text
                    Task / Pending CL ID
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
 Append-only Ledger   Session Metadata   Harness Registry
        │                  │                  │
 raw events/evidence   stable cache key   rules/skills/hooks
        │                  │                  │
        └──────────┐       │       ┌──────────┘
                   ↓       ↓       ↓
                Working Context Manager
                ├─ recent turns
                ├─ first read: full-enough
                ├─ repeat read: diff/outline
                ├─ tool-specific compaction
                └─ bounded rehydration
                           │
                    Runtime Adapters
                   ┌───────┴───────┐
                   ↓               ↓
              Claude Code        Codex
                   │               │
                   └──── Hook Rewrite ────┐
                                         ↓
                              Build / Test / p4
                                         │
                                  Evidence Review
```

## 우선순위

1. stable prefix와 dynamic tail 분리
2. append-only durable ledger
3. gross/net token accounting
4. deny→retry 대신 same-turn Hook rewrite
5. first-full → repeated diff/outline
6. Perforce revision/hash 기반 cache invalidation
7. Common Harness registry + runtime adapter/Doctor

## 참고 자료

- https://github.com/strands-agents/harness-sdk
- https://github.com/anthropics/claude-code
- https://github.com/openai/codex/issues/44363
- https://github.com/ooples/token-optimizer-mcp
- https://github.com/areopact/base-harness
