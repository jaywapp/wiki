---
title: AI Harness & Token Scout - 2026-09-11
category: news
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

## 1. Strands Agents: Context를 Working Set과 Durable Stash로 분리

Strands `harness-sdk`에는 2026-09-10 Context Manager stash의 session manager 연동과 session id 기반 OpenAI prompt-cache key 자동 생성 변경이 들어왔다.

Context Manager 설계의 핵심은 다음과 같다.

```text
L1 Durable Stash / Message Store
        │  original data
        │
        └── compact representation / bounded retrieval
                         ↓
                L0 Active Context
```

L0는 model이 지금 보는 working set이고, L1은 원본을 보존하는 source of truth다. 오래된 Tool output은 L0에서 truncate/summary/skeleton으로 줄일 수 있지만 원본은 L1에 남는다. 필요할 때도 전체를 다시 넣지 않고 bounded/paginated retrieval한다.

또한 `bash/list_files`와 `read_file`을 같은 비율로 압축하지 않고 tool별 selector와 recency를 적용한다. 설계 문서가 보고한 자체 실험에서는 exploration-heavy 작업에 개선이 있었지만 focused 작업에서는 오히려 악화된 경우도 있어, 전역 압축보다 **tool-specific policy**가 중요하다.

### 우리 환경 적용

Pending CL/task를 durable session 단위로 보고, 파일 원본·build/test evidence는 L1에 보존한다. Claude/Codex prompt에는 최근 turn과 outline/diff만 L0로 전달한다. 파일 identity는 `DepotPath + HaveRevision + ContentHash`로 두면 sync/edit 시 staleness를 판별하기 쉽다.

상세 문서: [Strands Agents Context Manager](../tools/strands-agents-context-manager.md)

## 2. Claude Code v2.1.268: Prompt Cache는 Prefix Stability 문제

2026-09-10 공개된 Claude Code v2.1.268은 token 최적화 관점에서 의미 있는 cache 관련 수정이 포함됐다.

- SDK session의 `excludeDynamicSections` 사용 시 첫 message를 요청마다 다시 render하여 prompt caching과 extended thinking이 깨지던 문제 수정
- Bedrock/Vertex/Foundry session에서 conversation 중 tool list를 다시 작성하지 않고 byte-stable하게 유지하도록 변경
- late tool은 기존 tool list를 변경하는 대신 지연 로드
- `--continue` / `--resume` 첫 진입 시 전체 transcript 재읽기를 줄이는 개선
- compact 이후 side request가 pre-compaction conversation을 다시 보내는 문제 수정

이 변화의 실무적 의미는 단순하다. **Prompt cache는 "같은 의미"보다 "같은 prefix"에 민감하므로 안정적인 영역과 동적 영역을 구조적으로 분리해야 한다.**

```text
[Stable Prefix]
System / Core Rules / Tool Contract / Stable Skills
--------------------------------------------------- cache-friendly boundary
[Dynamic Tail]
Task state / Hook result / Session context / Latest evidence
```

### 우리 환경 적용 — 바로 적용

- Task 수행 중 core system/rules/tool inventory를 불필요하게 재생성하지 않는다.
- SessionStart/Hook의 가변 정보는 가능한 stable prefix 뒤로 보낸다.
- Skill을 동적으로 추가할 때 전체 tool/system prefix를 다시 구성하는 방식은 피한다.
- Token ledger에서 `uncached input`, `cache creation`, `cache read`, `output`을 분리한다.

## 3. Codex: Compaction이 Durable Transcript를 덮어쓰면 안 된다

OpenAI Codex 저장소에는 2026-09-10 `Context compaction rewrites the stored rollout in place and permanently destroys the conversation transcript`라는 bug report가 등록됐다.

보고자는 약 2개월 이어진 장기 session에서 rollout JSONL이 약 851 MB / 122,877 records에서 약 7 MB / 762 records로 축소되고, 과거 assistant transcript가 사라졌다고 보고했다. 이 현상은 현재 maintainer가 확정한 제품 전체 동작이 아니라 **열린 사용자 bug report**이므로 일반화하면 안 된다.

하지만 Harness 설계 관점에서는 중요한 failure mode다.

```text
Append-only Raw Ledger  ───────────────┐
                                       │
                                       ├─> Rebuildable Working Context
                                       │       ├─ compact summary
                                       │       └─ recent events
                                       │
Derived Snapshot / Compaction ─────────┘
```

**Compaction은 원본 log의 대체물이 아니라 derived state여야 한다.** 모델이 보는 context를 줄이는 것과 감사·복구용 durable transcript를 줄이는 것은 다른 문제다.

### 우리 환경 적용 — 바로 적용

- `.ai`/DB의 raw event ledger는 append-only로 둔다.
- compact summary는 snapshot으로 추가하고 원본을 덮어쓰지 않는다.
- task/CL handoff는 원문 event에서 재생성할 수 있어야 한다.
- Claude/Codex 자체 session log 하나를 내부 Harness의 유일한 authoritative ledger로 사용하지 않는다.

## 4. Token Optimizer MCP: 토큰보다 먼저 Turn을 줄여라

`ooples/token-optimizer-mcp`의 최근 benchmark가 오늘 가장 실무적인 최적화 결과를 제공한다.

2026-09-09 프로젝트 자체 THOL 실험에서 16개 완전 데이터 task를 비교했을 때 `assist`는 control 대비 median cost 0.932였지만, 비싼 Read를 거부하고 다른 Tool로 재시도시키는 `enforce`는 1.724였다. 평균적인 turn도 11.5에서 15.0으로 늘었다. 프로젝트 분석에 따르면 redirect 1회당 약 0.90개의 추가 turn이 생겼다.

이를 바탕으로 large Read를 `deny → smart_read 재호출`시키는 대신 **현재 Read 호출 자체를 outline 대상으로 rewrite**하도록 수정했다. 같은 probe에서 156 KB 파일을 약 8.4 KB outline 대상으로 바꾸면서 별도 retry turn을 만들지 않았다.

### 핵심 방법론

```text
나쁜 최적화
Read → DENY → Agent reasoning → 다른 Tool 호출 → 결과
                 ↑ 추가 prefix/cache/turn 비용

좋은 최적화
Read → Hook Rewrite → Compact/Outline Result
```

또한 프로젝트는 gross saving과 실제 net saving을 구분한다. 나중에 compact preview를 다시 expand한 비용은 `expansion debit`으로 빼며, graph reuse 추정치나 repository scan byte는 verified saving에 넣지 않는다.

2026-09-10에는 현재 사용 중인 AI Client의 headless CLI 자체를 session finding extractor로 사용하는 opt-in harvest 기능도 추가했다. 이때 child CLI가 다시 Hook을 실행해 무한 재귀하지 않도록 optimizer mode를 완전히 끄는 recursion guard가 포함됐다.

### 우리 환경 적용

- `p4 diff`, build/test output을 거부 후 다른 명령으로 돌리지 말고 Hook에서 같은 호출의 output을 compact한다.
- **첫 실행 full-enough → 반복 실행 delta/compact**를 기본 정책으로 둔다.
- Token KPI는 `saved tokens` 하나가 아니라 `cost / solved task`, `turns / solved task`, `gross reduction - re-read/expand`로 측정한다.
- 자동 optimization 기능은 모델이 직접 선택할 필요가 없다면 MCP Tool보다 Hook layer에 둘 수 있는지 먼저 검토한다.

상세 문서: [Token Optimizer MCP](../tools/token-optimizer-mcp.md)

## 5. base-harness: Harness 자체도 Single Source of Truth로 생성

`areopact/base-harness`는 2026-09-08 생성되어 2026-09-10 첫 공개 release 0.1.0을 낸 매우 신생 프로젝트다. Claude Code, Codex CLI, OpenCode에 필요한 Contract, Skill, Rule, Hook을 `harness/` 한 곳에서 정의한 뒤 runtime adapter가 각 클라이언트 형식으로 materialize한다.

특히 `Doctor`가 `configured → loaded → trusted → fired → enforced → outcome-proven`처럼 단계를 나눠 "설정 파일이 있다"와 "실제로 Hook이 동작했다"를 구분하는 점이 좋다.

또한 runtime capability 차이를 다음과 같은 degradation ladder로 처리한다.

```text
Native Hook
   ↓ 지원 불가/제약
Contract Rule
   ↓ 최종 안전망
SCM Guard
```

현재 SCM floor가 Git pre-commit이라 Perforce에는 그대로 쓸 수 없지만, 마지막 rung을 Pending CL/submit validator로 바꾸면 내부 Harness에 잘 맞는다.

프로젝트는 아직 생성된 지 며칠 되지 않았고 별도 SLA가 없으며, Codex hook enforcement도 trust/hash approval 제약 때문에 완전히 검증되지 않았다고 명시한다. 따라서 직접 도입보다 설계 참고가 적절하다.

상세 문서: [base-harness](../harness/base-harness.md)

## 오늘의 통합 설계 제안

오늘 항목을 하나로 합치면 내부 Harness의 다음 형태가 가장 설득력 있다.

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

1. **바로 적용:** stable prefix와 dynamic tail 분리, append-only durable ledger, gross/net token accounting
2. **바로 적용:** deny→retry를 피하고 same-turn Hook rewrite 우선
3. **PoC:** first full → repeated diff/outline, Perforce revision/hash 기반 cache invalidation
4. **PoC:** Common Harness registry에서 Claude/Codex 설정을 생성하는 runtime adapter + Doctor
5. **PoC:** L1 durable stash와 bounded selective retrieval

## 결론

오늘은 신규 프로젝트 수보다 **비용 최적화의 실패 패턴이 구체적으로 드러난 날**에 가깝다. 공통 결론은 세 가지다.

- Context compaction과 durable history를 분리한다.
- Prompt cache를 살리려면 stable prefix를 구조적으로 지킨다.
- Token을 줄이기 위해 Agent에게 추가 turn을 요구하지 않는다.

이 세 가지는 현재 Perforce + Claude Code + Codex Harness 설계에 바로 반영하거나 짧은 PoC로 검증할 가치가 있다.

## 참고 자료

- Strands Agents Harness SDK: https://github.com/strands-agents/harness-sdk
- Claude Code changelog/feed: https://github.com/anthropics/claude-code
- Codex compaction issue #44363: https://github.com/openai/codex/issues/44363
- Token Optimizer MCP: https://github.com/ooples/token-optimizer-mcp
- base-harness: https://github.com/areopact/base-harness
