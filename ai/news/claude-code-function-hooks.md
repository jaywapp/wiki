---
title: Claude Code Function Hooks
category: news
tags:
  - ai
  - claude-code
  - hooks
  - plugins
  - typescript
  - agent-harness
source: https://github.com/anthropics/claude-code/issues/91870
updated: 2026-09-07
---

# Claude Code Function Hooks

> Claude Code 내부 동작을 TypeScript middleware로 가로채고 수정할 수 있게 하는 차세대 Plugin Hook 제안. 현재 정식 출시 기능이 아니라 Anthropic이 공개 피드백을 받는 **proposal / preview 단계**다.

## 프로젝트 개요

Anthropic의 Claude Code 팀은 2026-09-03 GitHub Issue #91870을 통해 **Function Hooks**라는 새로운 확장 모델을 공개했다.

기존 Claude Code Hooks가 주로 lifecycle event에 command, prompt, agent, HTTP 등의 handler를 연결하는 방식이라면, Function Hooks는 Claude Code 엔진 내부의 event/call 흐름을 **TypeScript 함수로 감싸는 middleware 모델**을 지향한다.

핵심 형태는 Express/Koa middleware와 유사한 다음 모델이다.

```text
Hook A
  └─ Hook B
      └─ Claude Code Core
```

각 Hook은 대략 `$`, event, `next`라는 세 요소를 통해 동작한다.

- `$`: Claude Code가 Plugin에 허용한 capability/side-effect interface
- `event`: 현재 발생한 호출 또는 이벤트 데이터
- `next`: 다음 Hook 또는 Claude Code 기본 동작을 실행하는 continuation

따라서 단순히 이벤트 발생 후 외부 스크립트를 실행하는 수준을 넘어, 호출 전후 처리, 입력 수정, 결과 수정, 호출 대체, UI 수정까지 가능한 구조를 목표로 한다.

> 주의: 공개 Issue 자체가 "internal proposal"에 대한 피드백 요청이며, Anthropic은 커뮤니티 반응이 실제 출시 여부에 영향을 줄 수 있다고 명시했다. 아래 API 세부사항은 최종 제품에서 변경될 수 있다.

## 해결하려는 문제

기존 Hook은 자동화와 정책 적용에는 유용하지만 Claude Code 자체를 하나의 **programmable agent runtime**처럼 확장하기에는 한계가 있다.

Function Hooks가 겨냥하는 문제는 다음과 같다.

1. Hook 로직을 shell/process 중심이 아니라 typed TypeScript 코드로 작성
2. 여러 Plugin이 같은 동작을 수정할 때 명확한 composition 모델 제공
3. tool 호출의 입력/결과를 중간에서 변환하거나 대체
4. CLI/Desktop UI까지 Plugin 확장 범위에 포함
5. Enterprise 관리자가 Plugin에 허용되는 side effect를 세밀하게 통제
6. 모든 이벤트를 관찰하는 audit/security layer 구현

## 핵심 기능

### 1. TypeScript Function Hook

Hook을 TypeScript 함수로 작성하고 타입 정의 및 LSP 지원을 제공하는 방향이다.

이는 shell command 기반 Hook보다 개발 경험이 좋고 복잡한 Plugin 로직을 하나의 코드베이스로 관리하기 쉽다.

### 2. Middleware / continuation 모델

Plugin 등록 순서가 middleware nesting 순서가 된다.

```text
Admin Security Hook
  ↓
Organization Hook
  ↓
Project Plugin Hook
  ↓
Claude Code Core
```

앞에서 등록된 Hook이 뒤쪽 전체를 감싸는 구조이므로 Enterprise 정책 계층을 만들기 좋다.

`next`를 호출하면 다음 계층으로 진행하고, 호출하지 않으면 기본 동작을 차단하거나 대체하는 형태가 가능하다.

### 3. 입력 및 결과 변환

Function Hook은 단순 allow/deny보다 깊은 interception을 목표로 한다.

개념적으로 다음 패턴을 구현할 수 있다.

```text
before
modify request
↓
next()
↓
modify response
after
```

예를 들어 Tool 결과에서 secret을 제거한 뒤 Claude 모델에게 전달하는 Plugin을 만들 수 있다.

### 4. UI Hook

공개 데모에서는 Plugin이 Claude Code UI component의 props를 수정하거나 반환된 render node를 wrapping하는 사례가 제시됐다.

또 `ui.press`와 같은 interaction을 Hook에서 관찰하여 Terminal과 Desktop에서 동일한 사용자 동작을 처리하는 방향도 시연됐다.

이는 Claude Code Plugin이 단순 automation extension에서 **UI extension**으로 확대될 가능성을 의미한다.

### 5. `$` capability interface

가장 중요한 설계 중 하나다.

Plugin이 외부 효과를 직접 자유롭게 수행하게 두는 대신 Claude Code가 제공하는 `$` capability를 통해 side effect를 수행하도록 하는 구조다.

관리자는 상위 Hook에서 `$`의 특정 capability를 제거하여 아래 Plugin들이 해당 동작을 수행하지 못하게 할 수 있다.

```text
Admin Hook
  |
  | remove dangerous capability
  v
Restricted $
  |
  v
Third-party Plugin
```

이는 Function Hooks가 강력한 확장성을 제공하면서 Enterprise policy enforcement를 함께 해결하려는 핵심 아이디어다.

### 6. Global event interception

공개 데모에서는 `*` Hook 하나로 모든 이벤트를 관찰하는 사례가 소개됐다.

이를 이용하면 다음과 같은 기능을 구현할 수 있다.

- Audit log
- Security monitoring
- Tool usage telemetry
- Plugin behavior tracing
- 비용/모델 호출 추적
- 조직 정책 검사

## 아키텍처

공개 제안에서 확인되는 개념 구조를 단순화하면 다음과 같다.

```text
User / Claude / Plugin
        |
        v
+---------------------------+
| Function Hook Pipeline    |
|                           |
| Admin Hook                |
|   |                       |
|   v                       |
| Plugin A Hook             |
|   |                       |
|   v                       |
| Plugin B Hook             |
+-----------+---------------+
            |
            | next(event)
            v
+---------------------------+
| Claude Code Core          |
|                           |
| Tool / Agent / UI / Model |
+---------------------------+
            |
            v
          Result
            |
            +---- Hook chain을 역방향으로 통과
```

핵심은 Hook이 단순 observer가 아니라 **Claude Code 실행 경로 자체를 감싸는 programmable layer**라는 점이다.

## 기존 Hooks와 차이

| 항목 | 기존 Claude Code Hooks | Function Hooks 제안 |
|---|---|---|
| 기본 모델 | Event → Handler | Middleware / continuation |
| 구현 | command, prompt, agent, HTTP 등 | TypeScript function |
| 타입 지원 | 제한적 | TypeScript/LSP 중심 |
| 입력 변경 | 이벤트별 제약 | middleware에서 직접 변환하는 방향 |
| 결과 변경 | 제한적 | next 결과를 후처리 가능 |
| 호출 대체 | 제한적 | next를 호출하지 않고 대체 가능 |
| Plugin 조합 | 독립 Hook 실행 중심 | 등록 순서 기반 nesting |
| UI 확장 | 제한적 | render/interaction hooking 시연 |
| 권한 통제 | settings/policy 중심 | `$` capability 축소 모델 |
| Audit | 이벤트별 구성 | `*` interception 시연 |

Function Hooks는 기존 Hooks의 단순 개선이라기보다 Claude Code Plugin API를 **Agent Harness extension API**로 발전시키는 설계에 가깝다.

## 장점

### Plugin 생태계 확장

Claude Code를 단순 Coding Agent가 아니라 확장 가능한 Agent Platform으로 만들 가능성이 크다.

### TypeScript 기반 개발 경험

복잡한 shell script와 JSON protocol보다 TypeScript + 타입 시스템이 대규모 Plugin 개발과 유지보수에 유리하다.

### 정책과 확장성을 동시에 제공

`$` capability 모델이 계획대로 구현된다면 강력한 Plugin을 허용하면서도 관리자 계층에서 위험한 기능을 제거할 수 있다.

### Cross-cutting concern 구현에 적합

보안, 로깅, secret redaction, telemetry, caching 같은 기능을 개별 Tool마다 수정하지 않고 공통 middleware로 구현할 수 있다.

### UI까지 확장 가능

Plugin이 Claude Code Desktop/Terminal 경험 자체를 변경할 수 있게 되면 VS Code Extension과 비슷한 수준의 생태계로 발전할 여지가 있다.

## 단점 및 한계

### 아직 정식 기능이 아님

가장 큰 문제다. 2026-09-07 기준 GitHub Issue는 여전히 open 상태이며 `enhancement`, `area:hooks`, `area:plugins` 라벨의 제안이다.

Production workflow가 Function Hooks에 의존하도록 설계하는 것은 아직 이르다.

### API 안정성 없음

이벤트 이름, `$` capability, TypeScript API, Plugin packaging 방식은 최종 출시 전에 변경될 수 있다.

### Plugin 충돌 가능성

Middleware 순서가 의미를 가지므로 여러 Plugin이 동일 호출을 수정하면 registration order가 실제 동작을 바꾼다.

이는 강력하지만 Plugin dependency/order 관리 문제를 새로 만든다.

### 보안 영향 범위 확대

Tool, prompt, UI, model interaction까지 Hook할 수 있다면 악성 또는 취약한 Plugin의 영향 범위도 커진다.

따라서 Enterprise 환경에서는 Plugin allowlist, capability restriction, audit가 중요해진다.

### 디버깅 복잡도

여러 Hook이 nested middleware로 동작하면 실제 Tool 호출이 어느 Plugin에서 수정됐는지 추적하기 어려울 수 있다.

Plugin tracing/diagnostic tooling이 충분히 제공되는지가 실사용성의 핵심이 될 것이다.

### Vendor Lock-in

Function Hooks는 Claude Code 내부 extension surface이므로 여기에 깊게 의존하는 Plugin은 Codex, Gemini CLI 등 다른 Agent Harness로 이식하기 어렵다.

## 활용 사례

### Secret Redaction

공개 case study에서 Claude가 Plugin을 작성하여 Tool output의 secret을 모델이 읽기 전에 치환하는 사례가 시연됐다.

```text
Tool Result
   ↓
Secret Redaction Hook
   ↓
Sanitized Result
   ↓
Claude Model
```

### Enterprise Security Policy

```text
Admin Hook
 ├─ shell command 검사
 ├─ network capability 제한
 ├─ sensitive path 접근 제한
 └─ audit log
      ↓
Team Plugins
      ↓
Claude Code
```

조직 공통 guardrail을 가장 바깥 middleware에 배치할 수 있다.

### Tool Call Cache

동일한 expensive tool 요청을 감지하여 실제 Tool 실행 대신 cache result를 반환하는 구조도 가능해진다.

### Observability

`*` event interception을 활용하면 Claude Code의 전체 Agent 실행 흐름을 telemetry system으로 전달하는 Plugin을 설계할 수 있다.

### Custom UI

Build 상태, Agent 상태, token/cost, TeamCity/Perforce 상태 등을 Claude Code UI 안에 표시하는 Plugin도 설계 가능성이 생긴다.

## AX / 개발 생산성 관점 활용 아이디어

### 바로 적용 가능

**없음.** 아직 정식 출시 기능이 아니므로 운영 환경의 핵심 workflow에 적용하는 것은 권장하지 않는다.

### PoC 가치 있음

#### 1. Perforce Guard Hook

Claude가 파일을 수정하기 전에 다음을 검사한다.

```text
File Edit
   ↓
Function Hook
   ↓
Perforce checkout 여부 검사
   ↓
필요 시 checkout / 차단
   ↓
Edit Tool
```

현재 별도 wrapper/tool로 구현해야 하는 정책을 Harness 레벨에서 처리할 가능성이 있다.

#### 2. TeamCity Build UI Plugin

Claude Code UI에 다음을 표시하는 Plugin을 고려할 수 있다.

- 현재 Build 상태
- 최근 실패 Build
- Agent availability
- Deploy 상태

Function Hooks의 UI extension이 실제 출시될 경우 내부 DevOps UX와 결합 가치가 높다.

#### 3. Agent Audit Layer

모든 tool/model/plugin event를 조직 telemetry로 전송해 다음을 분석한다.

- 어떤 Tool을 가장 많이 사용하는가
- Agent가 어디서 실패하는가
- 불필요한 Tool 호출
- Token/Model 비용
- 위험 명령 실행 패턴

#### 4. Context Sanitizer

회사 코드/로그에서 secret, account, internal URL 등을 탐지하여 모델 context에 들어가기 전에 redaction하는 middleware를 만들 수 있다.

### 아이디어 참고

현재 구축 중인 Orchestrator → Worker → Reviewer 형태의 Harness에서 공통 정책을 각 Agent prompt나 wrapper에 반복 구현하는 대신, 향후 Function Hook을 **Claude Code runtime middleware**로 사용할 수 있다.

```text
Company Policy Hook
       ↓
Context / Secret Hook
       ↓
Perforce Hook
       ↓
Observability Hook
       ↓
Claude Code Agent
       ↓
Tools / MCP
```

이 구조가 안정화되면 Claude Code 자체를 사내 Agent Harness의 execution runtime으로 사용하는 설계가 훨씬 현실적이 된다.

## 기존 도구와 비교

### Express / Koa Middleware

Function Hooks의 `next` composition은 웹 서버 middleware와 매우 유사하다.

차이는 HTTP request pipeline이 아니라 **Agent runtime event pipeline**을 감싼다는 점이다.

### VS Code Extension

UI와 내부 command까지 확장 범위가 넓어진다면 장기적으로 Claude Code Plugin은 VS Code Extension과 비슷한 역할을 할 수 있다.

다만 현재는 proposal이므로 실제 API surface와 sandbox/security model을 더 확인해야 한다.

### MCP

MCP와 경쟁 관계가 아니다.

```text
MCP
= Agent가 사용할 외부 Tool/Resource를 제공

Function Hooks
= Agent runtime 내부의 실행 흐름을 가로채고 변경
```

따라서 둘을 결합하는 구조가 자연스럽다.

```text
Claude Code
   ↓
Function Hook
   ↓
MCP Tool Call
   ↓
MCP Server
```

예를 들어 모든 MCP 호출을 감사하거나 특정 MCP 입력을 검증하는 공통 Hook을 만들 수 있다.

## 실무 평가

**관심도: 매우 높음 / 도입 시점: 아직 이름**

Function Hooks가 현재 제안대로 출시된다면 Claude Code의 성격을 크게 바꿀 수 있다.

지금까지 Claude Code의 customization이 settings, hooks, skills, MCP, plugins의 조합이었다면 Function Hooks는 그 위에 **programmable runtime interception layer**를 추가한다.

특히 사내 개발 생산성 플랫폼에서는 다음 세 가지 가치가 크다.

1. 조직 공통 정책을 Agent 실행 레이어에 강제
2. Tool/MCP 호출 전체에 observability 적용
3. 내부 DevOps/Perforce 시스템을 Claude Code UI와 통합

반면 아직 proposal 단계이므로 현재 production architecture를 이에 맞춰 변경할 이유는 없다. API가 정식 공개되면 가장 먼저 **security/audit + Perforce guard** 두 가지 PoC를 수행할 가치가 있다.

## 결론

Function Hooks의 핵심은 "Hook을 TypeScript로 쓸 수 있다"가 아니다.

더 중요한 변화는 Claude Code 내부의 Tool, UI, Plugin interaction을 **middleware처럼 조합 가능한 실행 레이어**로 노출한다는 것이다.

이 방향이 정식 출시되면 Claude Code는 Coding Agent에서 한 단계 더 나아가 **확장 가능한 Agent Harness / Platform**에 가까워진다.

현재 평가는 다음과 같다.

- **기술적 중요도:** 높음
- **AX 활용 가능성:** 매우 높음
- **Enterprise 활용 가능성:** 높음
- **현재 Production 도입:** 권장하지 않음
- **Preview PoC:** 가치 있음
- **정식 출시 후 재검토:** 필수

## 참고 자료

- Anthropic Claude Code GitHub Issue #91870 — Function Hooks - make plugins 10x more powerful
  - https://github.com/anthropics/claude-code/issues/91870
- Function Hooks Core Architecture PDF — Issue #91870 첨부 자료
- Claude Code 공식 Hooks 문서
  - https://docs.claude.com/en/docs/claude-code/hooks
