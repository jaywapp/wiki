---
title: Strands Agents Context Manager
category: tools
tags:
  - ai
  - agent
  - context-engineering
  - token-optimization
  - session
  - prompt-cache
source: https://github.com/strands-agents/harness-sdk
updated: 2026-09-14
---

# Strands Agents Context Manager

> Strands Agents Harness SDK의 Context Manager는 활성 context를 작업용 cache처럼 작게 유지하면서 원본은 durable stash에 보존하고, tool별 offload·selective inject·bounded retrieval로 긴 Agent session을 운영하는 구조다.

## 프로젝트 개요

Strands Agents의 `harness-sdk`는 Python/TypeScript Agent를 in-process로 실행하는 오픈소스 SDK다. Agent lifecycle, tool/MCP, structured output, multi-agent, memory/session, model portability, hooks, tracing/evaluation을 한 SDK에서 제공한다.

2026-09-10에는 context/session 영역에서 두 가지 의미 있는 변경이 들어왔다.

1. Context Manager의 stash를 session snapshot과 함께 저장·복원·삭제하는 session manager integration
2. OpenAI 계열 prompt cache key를 명시하지 않은 경우 durable session id에서 자동 유도하는 기능

두 변경을 같이 보면 **session identity → cache identity → durable offloaded context lifecycle**을 연결하려는 방향이 보인다.

2026-09-11 UTC에는 Python/TypeScript Context Manager에 named strategy preset이 추가되어, 같은 L0/L1 architecture 안에서도 task 특성에 따라 proactive compression과 agentic compression을 다르게 선택할 수 있게 되었다.

## 해결하려는 문제

긴 Coding Agent 작업에서는 context window를 그대로 history 저장소처럼 사용하기 어렵다.

- 탐색 단계의 대형 file/tool output이 계속 쌓인다.
- 오래된 메시지를 무조건 순서대로 요약하면 나중에 필요한 원문이 사라진다.
- `read_file`과 `list_files`처럼 정보 가치가 다른 Tool output을 같은 정책으로 압축하면 품질이 떨어진다.
- offload 후 다시 전체 원문을 inject하면 context overflow가 재발할 수 있다.
- session을 재개했는데 compact preview가 가리키던 외부 stash가 사라져 있으면 context reference가 깨진다.
- cache key가 session lifecycle과 분리되어 있으면 같은 장기 작업의 prompt cache 활용이 불안정해진다.
- exploration-heavy 작업과 focused coding 작업에 같은 compression threshold를 적용하면 한쪽에서는 context가 과도하게 커지고 다른 쪽에서는 필요한 원문이 너무 빨리 사라질 수 있다.

Strands의 설계는 context window를 source of truth로 보지 않고, durable storage에서 필요한 표현만 활성 context에 올리는 방향으로 문제를 분리한다.

## 핵심 아이디어: L0 / L1 분리

설계 문서는 활성 agent message context를 L0, offload된 원본을 포함한 durable stash/message store를 L1로 구분한다.

```text
Durable Session / Task
        │
        ├─ L1 Durable Stash
        │    ├─ original tool result
        │    ├─ original message
        │    └─ external context
        │
        └─ L0 Working Context
             ├─ recent turns
             ├─ compact preview
             ├─ outline / summary
             └─ bounded injected slice
```

Offload는 원본을 파괴하는 동작이 아니라 **L0 표현을 compact하게 바꾸는 동작**이다. 원본은 L1에 남고 필요할 때 selective inject/retrieval한다.

## Context Manager 동작 방식

### Tool별 Offload Policy

모든 output에 동일한 compression ratio를 적용하지 않는다. 예를 들어 `bash`, `list_files`처럼 반복/대량 출력이 흔한 Tool은 적극적으로 줄이고, 실제 source 내용인 `read_file`은 더 보수적으로 유지하는 식의 selector가 가능하다.

정책은 context utilization threshold, 최근 몇 turn 보호, 특정 tool include/exclude, pinned system prompt 등의 조건을 조합할 수 있다.

### Representation

원문을 L0에 유지하는 대신 다음과 같은 작은 표현으로 치환할 수 있다.

- head truncation
- tail truncation
- head + tail
- summary
- skeleton
- budget-limited injection

중요한 것은 representation과 원본 storage를 분리한다는 점이다.

### Bounded Retrieval

Offload된 원문을 다시 필요로 하더라도 한 번에 전부 반환하면 overflow를 재현할 수 있다. 따라서 retrieval 자체도 offset/limit 등의 bounded/paginated 형태여야 한다는 설계 원칙을 둔다.

### Session Lifecycle Integration

2026-09-10 변경에서는 Context Manager stash가 session manager와 연동된다. ephemeral stash는 snapshot에 inline으로 직렬화할 수 있고, durable stash는 외부 storage reference를 snapshot에 저장한다. Session 삭제 시 snapshot과 stash의 lifecycle도 함께 정리한다.

이로써 resume 이후 compact representation이 가리키는 context가 session lifecycle 밖에서 유실되는 문제를 줄인다.

### Session-derived Prompt Cache Key

같은 날 들어온 별도 변경에서는 명시적인 cache key가 없고 opt-out하지 않았다면 session id를 기반으로 OpenAI prompt-cache key를 자동 생성한다.

```text
Session ID
    ↓
Stable Agent Metadata
    ↓
Stable Prompt Cache Key
```

이 방식은 장기 task의 cache identity를 사용자가 매번 직접 관리하지 않도록 한다. 다만 cache key가 같다고 hit가 보장되는 것은 아니다. 실제 cache 효율을 높이려면 system/tool prefix 자체도 안정적으로 유지되어야 한다.

### 2026-09-11 Strategy Presets: `auto` vs `agentic`

Context Manager facade는 `context_manager='auto'`와 `context_manager='agentic'` preset을 지원하도록 바뀌었다. Python 구현 기준 기본 동작은 다음처럼 차이가 난다.

| Preset | Tool result truncation | Summarization |
|---|---|---|
| `auto` | 1,500-token threshold, 750-token preview | 85% utilization에서 최근 4 message 보존 |
| `agentic` | 8,000-token threshold, 750-token preview | overflow 시점까지 지연, 최근 4 message 보존 |

`auto`는 tool-heavy exploration에서 context를 선제적으로 줄이는 쪽이고, `agentic`은 모델에게 더 많은 원문을 남겨두고 필요할 때 context management tool을 쓰는 쪽에 가깝다.

또한 전략 배열 안에서 재사용 가능한 named building-block preset도 생겼다.

| Strategy preset | 기본 의미 |
|---|---|
| `proactive_summarization` | 70% utilization에서 오래된 message summarize |
| `large_tool_offloading` | 2,500-token 초과 tool result를 1,000-token preview로 |
| `overflow_protection` | window가 가득 찼을 때 오래된 message truncate |
| `stale_tool_cleanup` | 최근 5개를 제외한 오래된 tool result drop |

프로젝트 주석은 preset 이름을 stable contract로 보고 내부 threshold/방식은 실제 usage tuning에 따라 바뀔 수 있다고 명시한다. 따라서 threshold 숫자를 외부 Harness에 그대로 복사하기보다 **task별 context policy preset**이라는 구조를 가져오는 편이 낫다.

```text
Task Classifier
      │
      ├─ focused coding  → conservative / agentic
      ├─ exploration     → balanced / auto
      └─ log-heavy task  → aggressive tool offload
                    │
                    ▼
               Context Manager
```

## 토큰 절감 원리

이 접근은 크게 네 군데에서 context 비용을 줄인다.

1. **Active context 축소**: 원본 전체 대신 compact representation만 L0에 둔다.
2. **Selective rehydration**: 필요한 과거 context만 bounded retrieval한다.
3. **Cache identity 안정화**: session id와 cache key를 연결해 같은 장기 작업의 요청을 일관된 cache namespace로 묶는다.
4. **Task-specific policy**: focused 작업과 exploration 작업에 다른 compression aggressiveness를 사용해 과도한 summarization 또는 늦은 offload 비용을 피한다.

Strands 설계 문서는 내부 실험 결과로 exploration-heavy task에서 offloading이 4~6배 수준의 개선을 보인 경우가 있는 반면 focused task에서는 0.4~0.85배로 오히려 악화된 경우도 있다고 기록한다. 또한 특정 head-tail 설정에서 ContextBench task coverage 89%를 유지하면서 token cost를 15~30% 줄였다고 보고한다. 이 수치는 프로젝트 설계 문서의 자체 보고이며 이번 조사에서 독립 재현하지 않았으므로 참고치로만 보는 것이 적절하다.

## 장점

- context와 durable memory를 명시적으로 분리해 long-running agent에 적합하다.
- "무조건 오래된 것부터 압축"이 아니라 tool/상황별 정책을 둘 수 있다.
- offload 원본을 보존하므로 summary 오류가 발생해도 다시 확인할 수 있다.
- retrieval까지 bounded하게 설계해 rehydration overflow를 고려한다.
- session lifecycle, stash lifecycle, prompt-cache identity를 연결하려는 구조가 일관적이다.
- 특정 모델에만 종속되지 않는 SDK 안에서 context policy를 구현한다.
- named preset으로 task 특성에 맞는 context-management personality를 선택할 수 있다.

## 단점 및 한계

- 정책 선택이 어렵다. 어떤 Tool을 얼마나 압축할지 잘못 정하면 focused task 품질이 크게 떨어질 수 있다.
- summarization을 사용하면 별도 model invocation 비용과 summary 오류 가능성이 생긴다.
- durable stash가 추가되면서 storage lifecycle, 보안, retention 관리가 필요해진다.
- 공개된 정량 수치는 설계 문서의 자체 실험이며 독립 검증이 부족하다.
- SDK 전체를 도입하지 않는 환경에서는 Context Manager 패턴을 자체 구현해야 한다.
- prompt cache는 cache key뿐 아니라 실제 prefix 안정성에 의존하므로 session-derived key만으로 비용 절감을 보장할 수 없다.
- preset 내부 threshold가 stable API가 아니므로 버전 변경 때 동작 특성이 달라질 수 있다.

## Claude Code + Codex + Perforce 활용 아이디어

Strands SDK 자체를 내부 Harness에 넣기보다 **L0/L1 context architecture + task별 context policy**를 가져오는 것이 현실적이다.

```text
Task / Pending CL
       │
       ├─ L1 Durable Ledger / Stash
       │    ├─ raw tool event
       │    ├─ full file observation
       │    ├─ build/test evidence
       │    └─ handoff
       │
       └─ L0 Working Context
            ├─ current task contract
            ├─ recent observations
            ├─ file outline / diff
            └─ bounded retrieval
                    │
             Context Policy
       conservative / balanced / aggressive
```

Perforce에서는 파일의 durable identity를 `depot path + have revision + content hash`로 두는 것이 적합하다. 동일 파일의 원본 observation은 L1에 남기고, Claude/Codex에 다시 전달할 때는 최신 diff나 outline만 L0에 넣는다.

### 바로 적용 가능

- Active prompt를 durable history로 사용하지 않는 원칙
- 최근 turn 보호 + 오래된 output의 tool-specific compact policy
- full rehydrate 대신 bounded retrieval
- summary/outline을 derived state로 취급하고 원본 evidence는 보존
- task type에 따라 context compression aggressiveness를 다르게 두는 원칙

### PoC 가치 있음

- Pending CL별 durable stash와 context index
- Claude/Codex 공통 Context Manager가 `read`, `p4 diff`, build/test output을 종류별로 압축
- Session/task id를 stable cache namespace로 사용
- `focused/exploration/log-heavy` task classifier를 context policy preset에 연결
- preset별 `cost/solved task`, retry rate, lost-evidence rate 비교

## 활용 평가

**PoC 가치 있음.** SDK 전체 도입 여부와 별개로 `L0 working set / L1 durable source of truth`, tool-specific offload, bounded rehydration, task별 context policy는 현재 장기 Coding Agent Harness에 직접 적용할 수 있는 설계 원칙이다.

## 결론

Strands Context Manager의 핵심은 압축 자체보다 **context window를 영구 기록 저장소가 아니라 제한된 working set으로 재정의한 것**이다. 최근 preset 변화는 여기서 더 나아가 context 관리도 하나의 고정 알고리즘이 아니라 task 성격에 따라 선택할 수 있는 runtime policy라는 방향을 보여준다.

## 참고 자료

- Repository: https://github.com/strands-agents/harness-sdk
- Context Manager design: https://github.com/strands-agents/harness-sdk/blob/main/team/designs/0015-context-manager.md
- OpenAI prompt cache key change: https://github.com/strands-agents/harness-sdk/commit/7462908f4311ff249ddc2b3c2de994fe63291921
- Session manager integration: https://github.com/strands-agents/harness-sdk/commit/bea15fe26e6732934493918591a50b6a075aeebb
- Python context strategy presets: https://github.com/strands-agents/harness-sdk/commit/08ed4cfd3eb42ae9f668595e675d5f196eee7e44
- TypeScript context strategy presets: https://github.com/strands-agents/harness-sdk/commit/a8b1b90afa32f04c8d12ccb7a4a9ce2cf7d9a1d1
