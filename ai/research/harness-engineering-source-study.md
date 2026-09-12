---
title: Harness Engineering - Production Coding Agent Source Study
category: research
tags:
  - ai
  - agent
  - harness
  - context-engineering
  - orchestration
source: https://arxiv.org/abs/2609.00006
updated: 2026-09-13
---

# Harness Engineering - Production Coding Agent Source Study

> **한줄 요약:** Claude Code, Codex, Gemini CLI 등 11개 production coding harness를 실제 소스 코드 기준으로 비교한 연구로, 현대 Coding Agent가 `Agent Loop / LLM Integration / Tools / Context / Safety / Orchestration / Extensibility`의 7개 subsystem으로 수렴하고 있음을 보여준다.

## 프로젝트 개요

`Harness Engineering: Anatomy, Architecture, and Evolution of Coding Agents — A Source-Code Study of Eleven Systems`는 production coding agent를 단순 제품 기능 비교가 아니라 **실제 runtime architecture** 관점에서 분석한 연구다.

조사 대상에는 다음이 포함된다.

- Claude Code
- OpenAI Codex CLI
- Gemini CLI
- Mistral Vibe
- OpenHands
- Aider
- Mini-SWE-Agent
- Hermes
- Pi
- OpenCode
- OpenClaw
- Omnigent(meta-harness contrast)

논문은 약 4M LOC 규모의 Python/TypeScript/Rust 코드와 April→July 2026 source diff를 기반으로 7개 canonical subsystem, 13개 cross-cutting observation, 29개 recurring architecture pattern을 정리한다.

## 해결하려는 문제

Coding Agent를 비교할 때 흔히 다음 수준에 머문다.

- 어떤 모델을 쓰는가
- MCP를 지원하는가
- Subagent가 있는가
- Benchmark 점수가 얼마인가

하지만 실제 장기 운영 품질은 모델 밖의 runtime 구조에 크게 좌우된다.

```text
Agent = Model + Harness
```

이 연구는 `Harness`를 구체적인 editable/runtime surface로 분해해 서로 다른 제품이 실제로 어디에서 같은 선택과 다른 선택을 하는지 확인한다.

## 7개 Canonical Subsystem

```text
Agent Harness
 │
 ├─ 1. Agent Loop
 │     └─ thought / action / observation lifecycle
 │
 ├─ 2. LLM Integration
 │     └─ provider, routing, model-specific feature
 │
 ├─ 3. Tools & Actions
 │     └─ shell, edit, search, browser, MCP
 │
 ├─ 4. Memory & Context
 │     └─ context file, compaction, JIT loading, memory
 │
 ├─ 5. Safety & Permission
 │     └─ approval, sandbox, policy, path restriction
 │
 ├─ 6. Orchestration
 │     └─ child agent, thread tree, parallelism, protocol
 │
 └─ 7. Extensibility
       └─ skills, hooks, plugins, MCP/ACP
```

현재 사내 Harness 설계를 검토할 때도 이 7개 축을 architecture checklist로 사용할 수 있다.

## 핵심 관찰

### 1. 범용 Agent Framework가 production coding harness의 중심이 아니다

논문은 조사한 대규모 production runtime에서 LangChain/LangGraph/AutoGen 같은 범용 agent framework가 핵심 실행 loop에 사용되지 않는다는 점을 지적한다.

실제 구현은 대체로 제품 특성에 맞춘 async/event loop와 tool runtime을 직접 가진다.

이 결과는 `Framework를 고르는 것`보다 **작은 명시적 runtime contract를 직접 통제하는 것**이 Coding Harness에 더 중요할 수 있음을 시사한다.

### 2. Code Retrieval은 Vector RAG가 기본값이 아니다

조사 corpus에서 코드 검색은 embedding/vector DB보다 다음 deterministic primitive가 주로 사용된다.

- glob
- grep/ripgrep
- syntax/tree-sitter
- file tree
- symbol/search tool
- BM25/deferred tool discovery 일부

이는 개발 agent의 retrieval이 일반 문서 RAG와 다를 수 있다는 중요한 근거다.

특히 Perforce 환경에서는 별도 vector index부터 구축하기보다 다음 순서가 현실적이다.

```text
P4 metadata / file tree
→ grep / symbol search
→ asset/code index
→ 필요 시 semantic index
```

### 3. Deferred Loading이 반복되는 Pattern

Claude Code, Codex, Hermes 등의 tool/skill discovery와 여러 context-file 구현에서 **항상 전부 prompt에 넣지 않고 필요할 때 노출하는 방식**이 반복된다.

예:

```text
Always-on Prompt
   ├─ core rules
   └─ small tool surface
          │
          ├─ tool search
          ├─ skill discovery
          └─ nested context JIT
```

Token optimization 관점에서 중요한 패턴이다.

### 4. Skill이 확장 인터페이스로 빠르게 수렴

논문 corpus에서는 `SKILL.md` 계열 skill이 11개 중 9개 시스템, MCP가 8개 시스템에서 확인됐다고 보고한다.

여기서 중요한 것은 Skill과 MCP가 경쟁 관계가 아니라 역할이 다르다는 점이다.

- Skill: task procedure / policy / domain instruction
- MCP: external capability / data / action interface
- Hook: lifecycle interception / enforcement

현재 Harness도 이 세 역할을 섞지 않고 분리하는 편이 좋다.

### 5. Policy가 Prompt Prose에서 Configuration으로 이동

초기 Agent는 긴 system prompt에 행동 규칙을 적는 경우가 많았지만 production runtime은 점차 다음 형태로 이동한다.

- permission rules
- hook
- policy-as-code
- approval mode
- tool allow/deny
- sandbox config

즉 중요한 rule일수록 모델에게 `잘 지켜달라`고 설명하는 것보다 **runtime에서 enforce**한다.

## Context Engineering 관찰

연구에서 확인되는 중요한 context pattern은 다음과 같다.

### JIT Context File

Mistral Vibe는 top-level AGENTS.md는 기본 context에 넣되 nested AGENTS.md는 `read_file`이 해당 subtree에 들어갈 때 JIT로 노출한다.

Hermes도 subdirectory context hint를 tool result에 붙이는 구조를 사용해 cached prompt 자체를 덜 흔든다.

이 패턴은 현재 Workspace 구조에 그대로 적용 가능하다.

```text
root/AGENTS.md       -> always
src/project1/...     -> project1 접근 시 JIT
src/project2/...     -> project2 접근 시 JIT
release/...          -> release agent에서만
```

### Compaction

대부분의 full-scale harness는 conversation summarization/compaction을 가지지만, Mini-SWE-Agent처럼 native context window에 맡기는 최소 구현도 존재한다.

따라서 compaction은 Agent의 필요조건이 아니라 **long-running operation을 위한 runtime policy**로 보는 편이 정확하다.

## Multi-Agent Taxonomy

논문은 multi-agent 구현을 여섯 유형으로 분류한다.

```text
1. Single Agent

2. Sequential Delegation
Parent → Child → Return

3. Parallel Child Sessions
Parent ─┬→ Child A
        └→ Child B

4. Hierarchical Thread Tree
Root → Worker → Subworker

5. Recursive Composition
Agent → Agent → Agent ...

6. Registry + Protocol
Registry ↔ local/remote agent process
```

대표적으로:

- Claude Code: recursive composition + forked/shared context
- Codex: hierarchical thread tree + persisted topology
- OpenHands/OpenCode: parallel child conversation/session
- Gemini/OpenClaw/Hermes: registry/protocol 또는 cross-process 구조

현재 사내 구조의 `Orchestrator → Analysis → Work → Review`는 **hierarchical thread/task graph**에 가장 가깝다.

## 장점

- 특정 벤더의 marketing feature가 아니라 source code 기준 비교
- Harness를 설계할 때 빠지기 쉬운 safety/extensibility까지 포함
- Token/context 최적화가 어디에서 일어나야 하는지 architecture 위치가 명확
- multi-agent 구조를 단순 `에이전트 수`가 아닌 topology로 비교 가능
- April→July longitudinal diff로 production 구조가 어떻게 변하는지 관찰

## 단점 및 한계

- Snapshot 기반 연구라 빠르게 바뀌는 Claude/Codex 최신 구현과 이미 차이가 존재
- architecture study이며 동일 benchmark로 11개 시스템 성능을 직접 비교한 연구는 아님
- source 공개 수준이 제품마다 달라 일부 구현은 간접 관찰일 수 있음
- `vector RAG를 쓰지 않는다`는 결과가 vector retrieval 자체의 무가치를 뜻하지는 않음
- production complexity는 benchmark score 외에 UX/security/transport 요구를 포함하므로 작은 Harness와 단순 LOC 비교는 위험

## 기존 도구/접근과 비교

| 접근 | 장점 | 단점 |
|---|---|---|
| LangGraph/범용 Agent Framework | 빠른 PoC, 기존 컴포넌트 | Coding Harness 특화 제어에서 추상화가 과할 수 있음 |
| 단일 CLI + Prompt | 단순 | durable state/safety/recovery 부족 |
| Production Harness | lifecycle/context/safety를 직접 소유 | 구현·운영 복잡도 큼 |
| Meta-Harness | 여러 Harness 통합 | vendor feature 차이를 추상화하기 어려움 |

## 현재 Harness에 적용할 Architecture Checklist

### Agent Loop
- task lifecycle이 명시적인가?
- retry/stuck/timeout이 model prompt 밖에서 처리되는가?

### LLM Integration
- requested/effective model이 기록되는가?
- routing 결정과 fallback 원인을 추적할 수 있는가?

### Tools
- tool schema가 stable한가?
- model이 보는 결과와 machine-only metadata가 구분되는가?

### Context
- stable prefix / dynamic tail이 분리되는가?
- nested project context를 JIT로 로드하는가?
- compaction에서 pinned evidence/rule을 보존하는가?

### Safety
- Prompt rule을 runtime enforcement로 옮길 수 있는가?
- Perforce submit / filesystem / command permission을 강제하는가?

### Orchestration
- parent/child genealogy와 task ownership을 저장하는가?
- subagent가 fresh/forked/shared 중 어떤 context를 받는지 명시적인가?

### Extensibility
- Skill / MCP / Hook 역할이 분리되는가?
- plugin이 core runtime을 침범하지 않고 확장 가능한가?

## 활용 아이디어

### 바로 적용 가능

- 7 subsystem을 내부 Harness architecture review checklist로 사용
- deterministic retrieval을 기본 경로로 두고 semantic retrieval은 필요성이 확인될 때 추가
- root/project별 context를 JIT로 로드
- prompt 규칙을 Hook/Policy/Validator로 단계적으로 외부화

### PoC 가치 있음

- Agent Runtime Adapter + common Task Contract
- Skill registry + lazy loading
- Pending CL 기반 task graph/agent genealogy

### 아이디어 참고

- ACP/A2A 같은 cross-process agent protocol
- meta-harness 형태로 Claude/Codex 자체 runtime을 동일 contract 아래 호스팅

### 현재 도입 가치 낮음

- Harness 구축을 위해 처음부터 범용 Agent Framework를 추가하는 것. 현재 요구가 단순한 adapter/task-state 계층이라면 오히려 dependency와 abstraction cost가 늘 수 있다.

## 결론

이 연구가 주는 가장 큰 인사이트는 **Production Coding Agent의 차별점이 모델 호출 자체가 아니라 모델 주변 runtime의 구체적인 engineering 선택**에 있다는 것이다.

현재 환경에는 거대한 범용 framework보다 다음 조합이 더 적합하다.

```text
Small explicit control loop
+ Durable Task State
+ Deterministic retrieval
+ JIT context
+ Runtime policy / hooks
+ Evidence-based verification
+ Claude/Codex adapter
```

## 참고 자료

- Paper: https://arxiv.org/abs/2609.00006
- Newly surfaced reading map: https://github.com/wannabeyourfriend/awesome-harness-evolution
