---
title: Uber Efficient Software Factory
category: research
tags:
  - ai
  - agent
  - software-factory
  - token-optimization
  - mcp
  - context-engineering
  - model-routing
source: https://www.uber.com/us/en/blog/efficient-software-factory/
updated: 2026-09-08
---

# Uber Efficient Software Factory

> Uber는 AI 코딩 비용을 단순히 싼 모델로 줄이는 대신, 모델 라우팅·컨텍스트·도구 호출·캐싱·가시성을 하나의 Software Factory 운영 문제로 보고 **완료된 가치 단위당 비용**을 최적화한다.

## 프로젝트 개요

Uber가 2026년 8월 공개한 대규모 AI 개발 환경 운영 사례다. Uber 내부에서는 AI 도구가 SDLC 전반에 들어가 있으며, PR의 70% 이상이 로컬 또는 클라우드 에이전트에 귀속되고 3,600개 이상의 Agent Skill, 일 30K 이상의 Skill 실행이 발생한다고 설명한다.

2026년 2월~8월 사이 agentic 제품의 주간 활성 사용자는 7배, 요청 수는 9.4배 증가했지만 전체 AI 비용은 4월 이후 상대적으로 안정화되었다. 동일 모델을 고정해 비교했을 때 1,000 요청당 비용은 peak 대비 약 34%, 세션당 비용은 6월 peak 대비 52% 감소했다.

핵심은 AI 비용을 사용 제한 문제로 취급하지 않고 **소프트웨어 생산 시스템의 unit economics 문제**로 취급한다는 점이다.

## 해결하려는 문제

AI 코딩 에이전트 사용량이 커지면 비용은 단순한 `token price × tokens` 문제가 아니다.

Uber는 총 비용을 다음과 같이 분해한다.

```text
Total Spend
 = Users
 × Sessions / User
 × Turns / Session
 × Requests / Turn
 × Tokens / Request
 × Price / Token
```

Users와 Sessions/User는 채택률이므로 오히려 증가시키고 싶다. 따라서 주된 최적화 대상은 에이전트가 사용자 요청을 수행하면서 추가로 발생시키는 `Turns`, `Requests`, `Tokens`와 workload에 적합한 `Price/Token`이다.

즉 목표는 **AI를 덜 쓰게 하는 것**이 아니라 **가치가 없는 에이전트 작업을 제거하는 것**이다.

## 핵심 기능 및 운영 전략

### 1. Benchmark 기반 모델 라우팅

각 Managed Agent마다 실제 업무로 benchmark를 만든다.

1. 실제 agent workload를 benchmark dataset으로 구성
2. 여러 frontier/open-weight model을 동일 harness에서 실행
3. 품질·비용·신뢰성을 함께 측정
4. Pareto-optimal model을 선택
5. 모델 frontier 변화에 따라 지속 재평가

예를 들어 AI 코드 리뷰 시스템 `uReview`는 실제 PR의 알려진 bug를 easy/medium/hard로 분류하고 precision, recall, F1, review cost, latency, timeout, noise를 함께 측정한다.

Uber는 대규모 monorepo의 실제 작업을 이용한 내부 SWE Benchmark도 운영한다.

### 2. Main Model / Subagent 분리

Primary model은 작업 분해와 결과 평가를 담당하고, 잘 정의된 실행 작업은 더 저렴한 subagent model에 맡긴다.

```text
Primary Model
  ├─ decomposition
  ├─ orchestration
  └─ evaluation
       │
       ├─ Subagent: bounded task
       ├─ Subagent: bounded task
       └─ Subagent: bounded task
```

Uber는 subagent 기본 모델을 낮추는 것이 특히 영향이 큰 비용 최적화 수단이라고 설명한다. 단순히 모든 작업에 frontier model을 사용하는 구조보다 workload 성격에 맞는 계층형 모델 선택이 중요하다.

### 3. Context Window 기본값 제어

Interactive harness의 기본 정책으로 다음을 적용한다.

- 1M context model이라도 400K token에서 automatic compaction
- reasoning effort 기본값 Medium

큰 context window를 사용할 수 있다는 이유만으로 끝까지 유지하지 않는다. 긴 prefix는 다음 turn마다 다시 전송되고 cache miss 시 비용이 크게 증가하기 때문이다.

### 4. Prompt Cache TTL 최적화

대화형 개발 세션은 5분 이상 idle 상태가 자주 발생하기 때문에 main session은 1시간 cache TTL을 사용하고, 짧은 단일 작업 중심의 subagent는 5분 TTL을 유지한다.

중요한 점은 cache TTL 역시 고정된 설정값이 아니라 **session behavior에 따라 최적화해야 하는 운영 파라미터**로 본다는 것이다.

### 5. MCP Schema Context 제거

Uber의 MCP gateway에는 내부 및 SaaS를 포함해 1,000개 이상의 MCP server가 연결된다.

문제는 MCP tool schema를 세션에 직접 preload하면 100개 이상의 tool만으로도 약 50K~70K token이 초기 context에 들어가며 이후 turn마다 반복 전송될 수 있다는 것이다.

Uber는 이를 두 방식으로 해결한다.

```text
Agent
  │
  ├─ Tool Search ──> 필요한 tool만 동적 로딩
  │
  └─ Shell / CLI
        │
        └─ MCP Gateway
              ├─ Internal MCP
              └─ SaaS MCP
```

- **CLI tool resolution**: MCP schema를 prompt에 넣지 않고 shell command가 gateway에서 tool을 동적으로 resolve/invoke
- **Tool search**: 수천 개 tool 중 필요한 tool definition만 on-demand 로딩

이는 MCP를 많이 연결할수록 context가 비대해지는 문제에 대한 매우 실용적인 해결책이다.

### 6. Code-Mode로 Tool Call batching

일반 MCP workflow에서는 `LLM → tool → response → LLM → tool...` 패턴 때문에 polling이나 반복 호출마다 model turn과 context가 증가한다.

Uber의 code-mode는 반복적인 tool 호출을 Python 등의 subprocess loop로 이동하고 최종 결과만 model context로 반환한다.

```text
기존
LLM -> Tool -> Poll -> LLM -> Poll -> LLM -> Result

Code-mode
LLM -> Script/CLI -> [Poll × N] -> Summary -> LLM
```

동일 SQL query 실험에서 작은 결과조차 50% 이상의 token 감소를 보였으며 bulk workflow에서는 90% 이상 절감될 수 있다고 보고한다. wide table 사례에서는 raw result가 context에 들어오는 것을 막아 극단적으로 큰 차이가 발생했다.

Uber는 자주 사용하는 MCP server에 대해 25개 이상의 pre-built code-mode skill을 제공한다.

### 7. AI Context Graph

대규모 코드베이스에서는 에이전트가 코드를 작성하는 시간보다 **필요한 정보를 찾는 데 더 많은 turn을 소비**할 수 있다.

Uber는 이를 위해 30개 이상의 내부 시스템에서 정보를 연결한 AI Context Graph를 운영한다.

- 약 24M nodes
- 약 80M edges
- 86 node types
- 117 edge types
- services
- teams
- incidents
- pull requests
- architecture documents
- deployments
- datasets
- historical query usage 등

동일 prompt 실험에서 graph-grounded agent는 38초 만에 올바른 답을 찾은 반면, graph가 없는 agent는 20분 이상 탐색하고 subagent와 error를 거친 뒤 잘못된 결론을 냈다.

이 사례는 context engineering이 단순히 prompt를 잘 작성하는 것이 아니라 **조직의 지식을 agent가 검색 가능한 구조로 만드는 것**임을 보여준다.

### 8. 비용 가시성 및 Session Analytics

Uber는 비용 제한보다는 실시간 가시성과 feedback loop를 제공한다.

- terminal status line에 live session cost 표시
- interactive harness 전체를 묶은 shared spend tier
- 50/80/100% 사용 시 Slack nudge
- manager approval 기반 tier upgrade
- cost dashboard skill

Session Analysis Dashboard는 local/cloud sandbox의 session trace를 분석하여 16종의 비용 anti-pattern을 탐지한다.

예:

- 단순 작업에 과도하게 비싼 모델 사용
- 대형 MCP payload가 context에 계속 남는 문제
- cache expiration으로 prefix rebuild 반복
- session 시작 전 과도한 system/tool schema preload

## 아키텍처

Uber의 접근을 단순화하면 다음과 같다.

```text
                     ┌──────────────────────┐
                     │ Evaluation Benchmark │
                     └──────────┬───────────┘
                                │
                                v
Developer / Managed Agent -> Agent Harness
                                │
                     ┌──────────┴───────────┐
                     │ Dynamic Model Routing│
                     └──────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              v                 v                 v
         Main Model         Subagents       Context Graph
      plan / evaluate      bounded work       grounding
              │                 │                 │
              └────────────┬────┴─────────────────┘
                           v
                    Tool Search / CLI
                           │
                     Code-mode Skill
                           │
                       MCP Gateway
                           │
               Internal + SaaS Systems
                           │
                           v
                 Session Trace / Metrics
                           │
                Cost & Quality Dashboard
```

핵심은 model, context, tool, skill, gateway, telemetry를 각각 독립적인 제품이 아니라 하나의 agent execution platform으로 운영한다는 점이다.

## 측정 지표

Uber는 단순 token 총량보다 여러 계층의 unit economics를 측정한다.

### Portfolio

- total attributed cost
- distinct users
- tool/agent별 cost 및 spend share

### Tool Unit Economics

- cost/user
- requests/user
- cost/1K requests
- tokens/request
- cost/1M tokens
- cost/1K sessions
- cost/active session hour
- prompt cache hit rate

### Model Economics

- model별 cost/share
- request/share
- cost/1K requests
- cost/1M tokens

### Managed Agent Outcome

가장 중요한 관점이다.

- cost / merged PR
- cost / review
- cost / alert
- cost / cleanup
- revert rate
- F1
- MTTR

즉 최종적으로 **token당 비용보다 업무 결과 하나를 만들어내는 비용**을 본다.

## 장점

### 비용과 품질을 동시에 최적화

싼 모델로 일괄 downgrade하지 않고 실제 workload benchmark를 기준으로 모델을 선택하므로 품질 저하를 최소화할 수 있다.

### Agent Scale에 적합

사용자 수가 증가할수록 비용을 제한하는 대신 agent 내부의 zero-value work를 제거한다. 따라서 adoption과 efficiency를 동시에 높일 수 있다.

### MCP 확장성 문제를 현실적으로 해결

Tool schema preload 문제는 MCP를 대규모로 사용할 때 쉽게 간과되는 비용이다. CLI projection과 tool search는 수백~수천 tool 환경에서 특히 유효하다.

### Context Engineering을 조직 지식 문제로 확장

Context Graph는 prompt engineering보다 한 단계 높은 접근이다. 코드·조직·배포·incident·dataset의 관계를 graph로 연결하여 agent 탐색 비용 자체를 줄인다.

### 측정 가능한 Agent 운영

`cost / merged PR`, `cost / review`, F1, MTTR처럼 업무 outcome에 연결된 지표를 사용하므로 AI 투자 ROI를 설명하기 쉽다.

## 단점 및 한계

### Uber 규모의 인프라가 필요

1,000+ MCP server, 24M-node context graph, 중앙 gateway, 공통 harness, session telemetry는 일반 조직이 그대로 구축하기 어렵다.

### Evaluation 구축 비용

각 managed agent마다 실제 workload benchmark를 만들고 모델별 품질을 지속 측정해야 한다. benchmark가 부실하면 routing 역시 잘못 최적화된다.

### 플랫폼 운영 복잡도

Model routing, cache policy, tool catalog, CLI projection, gateway, telemetry, spend tier 등을 중앙 플랫폼 팀이 지속 운영해야 한다.

### Context Graph freshness

Graph 기반 grounding은 강력하지만 source synchronization과 stale data 관리가 중요하다. 잘못된 graph 정보가 agent 판단을 오히려 강하게 왜곡할 가능성도 있다.

### Vendor별 cache 정책 차이

Prompt caching TTL과 가격 구조는 provider마다 다르며 변경될 수 있다. Uber의 구체적인 TTL 전략을 다른 환경에 그대로 적용하기보다 session trace를 기반으로 다시 계산해야 한다.

### 공개 수치의 일반화 한계

Uber 역시 비용 절감 수치는 자체 codebase, workload, 조직 규모에 특화되어 있으며 방법론이 보편적으로 적용 가능하다고 설명한다. 따라서 34%, 52%, 90% 등의 수치를 다른 조직의 기대 절감률로 사용하면 안 된다.

## 활용 사례

### Enterprise AI Coding Platform

Claude Code, Codex 등 여러 coding harness를 조직에서 동시에 운영할 때 공통 wrapper를 두고 authentication, model routing, tool access, cost telemetry를 통합할 수 있다.

### AI Code Review

실제 bug가 포함된 과거 PR을 benchmark로 구성하고 model별 F1/cost/latency를 측정하여 review agent의 모델을 결정할 수 있다.

### CI Self-Healing Agent

CI failure → log 분석 → 원인 탐색 → 수정 → validation workflow를 managed agent로 이동하고 `cost / recovered failure`, 성공률, MTTR을 측정할 수 있다.

### 대규모 MCP 환경

MCP server를 모두 session에 연결하지 않고 catalog/search + CLI gateway 구조로 전환하여 tool schema token을 줄일 수 있다.

## 기존 방식과 비교

| 기존 접근 | Uber Software Factory |
|---|---|
| AI 비용 = token 가격 | AI 비용 = 전체 agent execution equation |
| 모든 작업에 강한 모델 | workload benchmark 기반 routing |
| MCP tool schema preload | tool search / CLI dynamic resolution |
| Tool call을 LLM이 순차 제어 | code-mode subprocess batching |
| prompt에 필요한 정보를 직접 넣음 | Context Graph grounding |
| token 총량 중심 | cost per merged PR/review/alert |
| 사용자별 quota/cap | visibility + spend tier + coaching |
| interactive coding 중심 | managed autonomous agent 중심 |

## 활용 아이디어

### 바로 적용 가능

1. **Main / Subagent 모델 분리**
   - Orchestrator/Analysis에는 강한 모델
   - 검색·파일 조사·정형 작업은 저비용 모델

2. **Session cost metric 추가**
   - tokens/session
   - requests/session
   - tool calls/session
   - cache hit rate
   - cost/completed task

3. **MCP schema audit**
   - 실제 사용하지 않는 MCP를 항상 preload하는지 측정
   - tool schema token 수를 startup cost로 계측

4. **반복 Tool Call을 script로 이동**
   - polling
   - pagination
   - bulk file operations
   - CI status polling
   - DB query lifecycle

### PoC 가치 있음

#### MCP Gateway + CLI Projection

사내 MCP가 증가한다면 다음 구조를 PoC할 가치가 높다.

```text
Claude / Codex / Agent
        │
        └─ company-tool <command>
                  │
             Tool Registry
                  │
             MCP Gateway
           ┌──────┼──────┐
           P4   TeamCity  Docs
```

모든 MCP schema를 model context에 넣지 않고 CLI help/search로 필요한 command만 발견하도록 한다.

#### Workload Benchmark 기반 Model Router

업무를 몇 가지 대표 유형으로 나누고 실제 task corpus를 만든다.

- 코드 수정
- bug 분석
- code review
- 문서 조사
- CI failure 분석
- Perforce 작업

각 모델에 동일 task를 실행하여 quality/cost/latency를 기록하면 모델 선택을 경험이 아닌 데이터로 할 수 있다.

### 아이디어 참고

#### Engineering Context Graph

Uber 수준의 graph부터 만들 필요는 없다. 초기에는 다음 관계만 연결해도 효과를 검증할 수 있다.

```text
Project
 ├─ Repository
 ├─ Owner
 ├─ TeamCity Build
 ├─ Perforce Stream
 ├─ Documentation
 ├─ Recent CL
 └─ Incident / Error
```

Agent가 프로젝트 이름 하나만 받아도 관련 repo/build/docs/history를 찾을 수 있도록 하는 것이 목표다.

### 현재는 도입 가치 낮음

Uber와 동일한 대규모 graph platform이나 1,000+ tool gateway를 처음부터 구축하는 것은 과도하다. 먼저 session trace에서 실제 token waste가 어디에서 발생하는지 측정한 뒤 가장 큰 항목부터 제거하는 것이 적절하다.

## 실무 관점 평가

이 글에서 가장 중요한 부분은 특정 최적화 기법 하나가 아니라 **AI 개발 생산성을 플랫폼 엔지니어링 문제로 정의한 방식**이다.

특히 다음 세 가지는 소규모 조직에도 그대로 적용할 가치가 높다.

1. `Frontier model everywhere` 대신 **작업별 benchmark + model routing**
2. MCP를 많이 연결하는 대신 **tool discovery + lazy loading / CLI execution**
3. token 총량이 아니라 **cost per completed outcome** 측정

또한 Main Agent가 복잡한 추론과 평가를 담당하고 Subagent가 잘 정의된 작업을 실행하는 구조는 멀티에이전트 harness 설계 시 비용과 품질의 균형을 잡는 좋은 기준이 된다.

## 결론

Uber의 Software Factory는 AI coding 비용을 단순 FinOps가 아니라 **Agent Architecture + Context Engineering + Tool Architecture + Evaluation + Observability** 문제로 다룬다.

가장 실용적인 교훈은 "더 싼 모델을 써라"가 아니다. **에이전트가 가치 없는 turn, request, token을 만들지 않도록 실행 구조 자체를 설계하라**는 것이다.

대규모 AI/AX 환경을 설계한다면 이 문서는 model routing, MCP 운영, context engineering, agent telemetry의 기준 아키텍처로 참고할 가치가 높다.

## 참고 자료

- Uber Engineering, *Running a Software Factory Efficiently at Uber Scale*, 2026-08-27: https://www.uber.com/us/en/blog/efficient-software-factory/
