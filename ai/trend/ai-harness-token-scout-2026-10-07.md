---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-07"
category: trend
tags: [ai-harness, context-engineering, token-optimization, claude-code, codex, deep-agents, open-swe]
source: "reconstructed from archived Scout response"
updated: 2026-10-30
reconstructed: true
---
# AI Harness · Context/Token Optimization Scout — 2026-10-07

> **복원 문서:** 당시 전체 Markdown은 유실됐으며, 2026-10-07 Scout 응답에 남은 검증 요약을 바탕으로 2026-10-30에 복원했다.

## 핵심 요약
오늘 핵심은 **prompt-cache boundary 명시화, reviewer evidence 구조 보존, sub-agent별 model/effort 계측, resume hook context 검증, sub-agent Skill isolation, diff 기반 selective context**였다.

| 항목 | 변화 | 평가 |
|---|---|---|
| Claude Code 2.1.292 | Agent별 effort, block-level prompt cache, workflow spawn guard, MCP startup 비동기화 | 바로 적용 원칙 / PoC |
| Codex Guardian #51465/#51466 | JSON provenance transcript + 구조 보존형 budget recovery | 바로 적용 |
| Codex #51463 | sub-agent resolved model/reasoning effort를 durable history에 저장 | 바로 적용 |
| Deep Agents Code 0.1.81 | provider-confirmed cache activity 기반 expiry 관리 | 바로 적용 |
| Deep Agents #6712/#6820 | resume hook 검증 + fresh child Skill isolation | 바로 적용 원칙 / PoC |
| Open SWE #3705 | 선택 diff + 앞뒤 3줄만 초기 Context에 전달 | 바로 적용 / PoC |

## 실무 적용
Model-visible text는 줄여도 authority/provenance는 줄이지 않는 것을 우선 원칙으로 잡는다. Perforce Reviewer Evidence는 actor/source/action/evidence generation/artifact ref를 구조적으로 보존하고, Skill catalog는 role별로 격리한다. Diff는 작은 excerpt로 시작하되 필요할 때 semantic expansion한다.

## 결론
Structured ReviewerEvidenceRecord → PromptCacheLease → SubAgent model/effort/cost telemetry → HookContextFingerprint → role-scoped Skill catalog → DiffExcerpt 순으로 적용 가치가 높다.
