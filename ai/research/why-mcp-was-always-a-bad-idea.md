---
title: Why MCP Was Always a Bad Idea
category: research
tags:
  - ai
  - agent
  - mcp
  - context-engineering
  - token-optimization
  - security
source: https://maharship.com/blog/why-mcp-was-always-a-bad-idea/
updated: 2026-09-22
---

# Why MCP Was Always a Bad Idea

> 최신 Coding Agent 관점에서 MCP의 핵심 약점은 “외부 도구 연결” 자체가 아니라, 많은 tool schema를 모델 컨텍스트에 미리 노출하는 eager discovery 구조이며, CLI/API 직접 호출과 lazy discovery가 상당수 MCP 사용 사례를 대체할 수 있다는 비판이다.

## 프로젝트 개요

Maharshi Patel이 2026년 9월 공개한 MCP 비판 글을 중심으로, MCP가 현재의 고성능 Agent 환경에서도 필요한 추상화인지 검토한다.

저자의 핵심 주장은 MCP가 2024년 당시 상대적으로 약한 모델을 전제로 설계되었지만, 현재 Agent는 shell, CLI의 `--help`, HTTP API 문서, 코드 실행을 직접 활용할 수 있으므로 많은 MCP server가 불필요한 중간 계층이 되었다는 것이다.

## 해결하려는 문제

MCP는 Agent가 외부 서비스와 데이터를 공통 인터페이스로 발견하고 호출하도록 만든다. 그러나 MCP server가 늘어나면 각 server가 노출하는 tool 이름·설명·입력 schema가 컨텍스트를 차지한다.

문제는 실제 작업에서 대부분의 tool을 사용하지 않아도 harness가 이를 미리 모델에 보여주는 경우가 많다는 점이다.

즉 다음 비용이 발생한다.

- Context bloat
- Tool selection 복잡도 증가
- 반복되는 schema token 비용
- 기존 API/CLI 위에 별도 MCP wrapper 유지보수
- Agent가 이미 가진 코드 실행 능력과의 기능 중복

## 핵심 주장

### 1. 현대 Agent는 CLI를 스스로 탐색할 수 있다

Coding Agent는 terminal 접근 권한이 있다면 `--help` 등을 사용해 CLI 기능을 발견하고 필요한 명령을 조합할 수 있다.

따라서 CLI가 이미 잘 설계된 서비스에서는 별도 MCP wrapper의 가치가 낮아질 수 있다.

### 2. 대부분의 remote MCP는 기존 API wrapper다

많은 MCP server는 본질적으로 이미 존재하는 HTTP API를 tool schema로 다시 감싼다.

모델이 API 문서를 이해하고 코드를 작성할 수 있다면 다음 구조가 가능하다.

```text
Traditional MCP

Agent
  ↓
Tool Schema
  ↓
MCP Client
  ↓
MCP Server
  ↓
HTTP API

Direct / Code Mode

Agent
  ↓
CLI / API documentation
  ↓
generated script
  ↓
sandbox
  ↓
HTTP API
```

### 3. Tool schema의 eager loading이 Context를 낭비한다

여러 MCP server를 연결하면 실제 사용 여부와 관계없이 많은 tool definition이 모델 context에 들어갈 수 있다.

이를 해결하기 위해 search/execute 같은 소수의 generic tool만 노출하고 필요할 때 실제 기능을 찾는 패턴이 등장했다.

이 변화는 MCP 자체보다 **tool discovery 방식**이 핵심 문제일 가능성을 보여준다.

### 4. Code Mode가 더 강력한 대안이 될 수 있다

Agent가 여러 tool call을 하나씩 수행하는 대신 필요한 로직을 코드로 작성하고 sandbox에서 실행하면 중간 결과를 모두 모델 context로 반환할 필요가 없다.

```text
Tool Calling
Agent → call → result → Agent → call → result → Agent

Code Mode
Agent → generate program → sandbox
                         ├─ API A
                         ├─ API B
                         └─ API C
                    ↓
              compact result
                    ↓
                  Agent
```

이는 context/token 최적화뿐 아니라 loop, filtering, aggregation 같은 작업에서도 표현력이 높다.

## 반론: MCP가 완전히 불필요한 것은 아니다

원문의 주장은 terminal 접근이 가능한 강력한 Agent에서는 설득력이 크지만 Enterprise/Production 환경에서는 전제가 달라진다.

MCP는 단순한 API wrapper가 아니라 다음과 같은 **통제 가능한 integration boundary** 역할을 할 수 있다.

- credential isolation
- permission boundary
- 허용된 operation 제한
- 중앙화된 audit/logging
- 사용자 authorization flow
- client와 backend 사이의 표준 계약

Agent에게 shell과 API credential을 직접 제공하면 integration layer는 줄지만 blast radius가 커질 수 있다.

따라서 실제 논점은 “MCP vs HTTP”보다 다음에 가깝다.

> Agent가 외부 capability를 얼마나 미리 알아야 하며, capability discovery와 credential/control boundary를 어디에 둘 것인가?

## 장점

원문이 제시하는 방향을 적용하면 다음 효과를 기대할 수 있다.

- tool schema로 인한 context 소비 감소
- MCP wrapper 개발/유지 비용 감소
- 기존 CLI/API ecosystem 재사용
- Agent의 코드 생성 능력을 적극 활용
- 여러 API 호출을 sandbox 내부에서 처리하여 intermediate token 감소
- 새로운 service integration 속도 향상

## 단점 및 한계

### 보안

Agent가 API와 credential에 직접 접근하면 MCP gateway보다 권한 범위가 넓어질 수 있다.

### 결정성

정의된 MCP tool 호출보다 Agent가 문서를 읽고 즉석에서 API 호출 코드를 만드는 방식은 실행 경로가 더 다양하다.

### 문서 품질 의존

API/CLI documentation이 부실하면 discovery 성능도 떨어진다.

### Enterprise 환경

감사, 권한 분리, credential 관리가 필요한 환경에서는 중앙 integration layer를 제거하기 어렵다.

### Token 비용의 이동

MCP schema를 없애도 API 문서나 CLI help를 매번 읽는다면 token 비용이 다른 위치로 이동할 수 있다. 따라서 discovery 결과 cache가 중요하다.

## 기존 방식과 비교

| 방식 | Context 비용 | Agent 자유도 | 보안 통제 | 유지보수 |
|---|---:|---:|---:|---:|
| 많은 MCP Tool 상시 노출 | 높음 | 중간 | 높음 | MCP wrapper 필요 |
| Lazy MCP discovery | 낮음 | 중간 | 높음 | MCP 유지 |
| CLI 직접 호출 | 낮음 | 높음 | 환경 의존 | 기존 CLI 활용 |
| HTTP API 직접 호출 | 낮음~중간 | 매우 높음 | 별도 설계 필요 | API 재사용 |
| Code Mode + Sandbox | 낮음 | 매우 높음 | Sandbox 정책 의존 | 실행 환경 필요 |

## 활용 아이디어

### 바로 적용 가능 — MCP inventory

현재 Agent 환경에서 MCP server별로 다음을 측정한다.

- tool 수
- tool schema token
- 실제 호출 빈도
- session별 사용률
- 동일 기능 CLI/API 존재 여부

사용률이 낮고 CLI/API가 존재하는 MCP는 제거 후보로 분류한다.

### PoC 가치 있음 — Lazy Tool Discovery

Agent 시작 시 전체 schema를 주입하지 않고 최소한의 discovery interface만 제공한다.

```text
Agent
  ↓
search_capability("perforce changelist")
  ↓
small capability description
  ↓
execute / CLI / API
```

이 구조는 기존 MCP ecosystem을 유지하면서 context bloat를 줄일 수 있다.

### PoC 가치 있음 — CLI-first Harness

Coding Agent 환경에서는 integration 우선순위를 다음처럼 실험할 가치가 있다.

```text
Native CLI
   ↓ unavailable
HTTP API
   ↓ policy/control required
MCP
```

다만 인증·감사·권한 경계가 중요한 기능은 MCP/API gateway를 유지한다.

### PoC 가치 있음 — Session Capability Dictionary

세션 시작 또는 최초 필요 시 CLI/API capability를 탐색하고 compact dictionary로 저장한다.

이후 Agent는 전체 help/documentation 대신 dictionary를 먼저 검색하고 필요한 경우에만 원문을 읽는다.

이는 context virtualization 관점에서도 유용한 패턴이다.

## 실무 평가

이 글의 가장 중요한 인사이트는 “MCP를 없애자” 자체가 아니다.

**Static Tool Schema → Dynamic Capability Discovery → Code Execution** 으로 Agent harness의 중심이 이동하고 있다는 점이다.

특히 Coding Agent처럼 shell과 sandbox를 이미 가진 환경에서는 모든 integration을 MCP로 만드는 전략을 재검토할 가치가 크다.

반대로 Enterprise 환경에서는 MCP가 제공하는 통제 지점을 CLI/API direct access로 대체할 경우 인증, 최소 권한, 감사, sandbox 정책을 별도로 구축해야 한다.

따라서 실무적인 방향은 MCP 전면 제거보다 다음 구조가 더 현실적이다.

```text
                 ┌─ Native CLI
Agent ─ Discovery├─ Direct API
                 ├─ Code/Sandbox
                 └─ MCP (controlled capability)
```

핵심은 protocol 선택보다 **필요한 capability만 필요할 때 발견하도록 만드는 것**이다.

## 결론

MCP의 문제를 protocol 자체의 실패로만 보는 것은 과도하다. 하지만 모든 tool schema를 사전에 context에 노출하는 MCP 사용 패턴은 최신 Agent 환경에서 비효율적일 수 있다.

향후 Harness 설계에서는 MCP 여부보다 다음 세 가지를 우선 검토하는 것이 유용하다.

1. Lazy capability discovery
2. CLI/API direct execution
3. Sandbox와 credential boundary

즉 MCP는 기본 통합 방식이 아니라 **보안·표준화·통제가 필요한 capability에 선택적으로 사용하는 integration option**으로 보는 접근이 실용적이다.

## 참고 자료

- Maharshi Patel, Why MCP Was Always a Bad Idea
  - https://maharship.com/blog/why-mcp-was-always-a-bad-idea/
- Anthropic Model Context Protocol
  - https://modelcontextprotocol.io/
- Cloudflare Code Mode 관련 논의
  - https://blog.cloudflare.com/code-mode/
