---
title: DeepSeek Harness
category: harness
tags:
  - ai
  - agent
  - harness
  - deepseek
  - cordis
  - plugin
  - claude-code
  - codex
source: https://github.com/deepseek-ai/deepseek-harness
updated: 2026-08-29
---

# DeepSeek Harness

> DeepSeek가 공개한 오픈소스 Agent Harness로, 모델·도구·세션·Agent Loop·UI까지 거의 모든 요소를 교체 가능한 플러그인으로 구성하는 실행 플랫폼이다.

## 프로젝트 개요

DeepSeek Harness(`dsh`)는 DeepSeek AI가 개발한 MIT 라이선스 오픈소스 Agent Harness다. 핵심 철학은 **Everything is a Plugin**이며, Cordis를 기반으로 모델 어댑터, 도구 레지스트리, 세션 로그, Agent Loop 등을 플러그인으로 구성한다.

단순한 DeepSeek 전용 Coding CLI라기보다 다양한 모델과 도구, subagent, 실행 환경, UI를 조립하는 **Agent Runtime / Harness Platform**에 가깝다.

2026-08-29 기준 Developer Preview이며 최신 릴리스는 `v0.1.2-alpha.1` 계열이다. 호환성을 깨는 변경이 빠르게 발생하고 있어 프로덕션 표준화보다는 실험 및 PoC 성격이 강하다.

## 해결하려는 문제

일반적인 Coding Agent는 모델 호출, Agent Loop, 도구 실행, 세션 저장, UI가 제품 내부에 강하게 결합되는 경우가 많다. 이 구조에서는 모델이나 sandbox, tool pipeline, subagent 전략을 바꾸려면 핵심 구현을 수정하거나 별도 fork를 유지해야 한다.

DeepSeek Harness는 이를 플러그인 서비스와 이벤트 기반 extension point로 분리한다.

- 모델 공급자 교체
- Tool 추가/교체
- Sandbox 및 filesystem provider 교체
- Agent Loop 확장
- 세션 및 context 관리
- Subagent provider 변경
- Web/Headless/SDK/ACP 실행 형태 변경

을 core fork 없이 구성하는 것이 목표다.

## 핵심 기능

### Everything-is-a-plugin

Cordis Context의 `ctx.<service>`를 중심으로 기능을 등록한다. 대표 서비스는 다음과 같다.

- `ctx.sessions`: append-only SessionEvent log
- `ctx.systemPrompt`: system prompt/tool schema 조립
- `ctx.tools`: scoped tool registry 및 실행 pipeline
- `ctx.agents`: Agent registry
- `ctx.agentLoop`: 기본 Agent driver
- `ctx.llm`: LLM adapter seam
- `ctx.webhookRuntime`: 외부 webhook 기반 Session 생성

따라서 특정 기능을 교체할 때 Agent Loop 전체를 fork할 필요가 없다.

### Profile / Bundle 구성

실행 환경은 Profile과 Bundle의 계층으로 조합된다.

기본 Profile:

- `web`
- `headless`
- `sdk`
- `sdk-minimal`
- `acp`

`web`, `headless`, `sdk`, `acp`는 공통 `dsh-base` 위에 애플리케이션별 bundle을 추가한다. 설정 patch를 상위 레이어에서 덮어쓸 수 있어 사용자별 Harness 구성을 유지하기 쉽다.

### Durable Session Log

모델이 보는 context는 append-only SessionEvent log에서 재구성된다.

`Model-visible means logged` 원칙으로 모델에 전달되는 입력을 session log에서 재현할 수 있도록 설계한다. Fork, resume, transcript, telemetry, persistence도 이 이벤트 스트림을 기반으로 한다.

### Tool 실행 Pipeline

Agent step에서 tool 호출은 다음 형태로 흘러간다.

```text
Model Request
  ↓
assistant/message
  ↓
tool/call
  ↓
tools/pre-execute
  ↓
tools/execute
  ↓
tools/post-execute
  ↓
tool/result
```

이 extension point를 이용하면 승인, 정책, logging, sandbox, telemetry 등을 tool 실행 전후에 삽입할 수 있다.

### Subagent 및 외부 Agent 연동

최근 릴리스에서는 subagent 시작 시 provider/model/reasoning effort/max output length 선택이 가능해졌고 Claude Code와 Codex subagent의 모델 설정도 지원한다.

커뮤니티에서도 Codex App Server와 Claude Code를 DSH Session mode로 통합하는 플러그인이 등장하고 있다. 즉 DSH 자체 Agent뿐 아니라 기존 Coding Agent를 상위 Harness에서 조합하는 방향으로 확장 가능하다.

### Web / Headless / SDK / ACP

하나의 Harness를 여러 실행 형태로 사용할 수 있다.

- Web UI: 로컬 Agent 작업 공간
- Headless: 자동화/CI 실행
- SDK: TypeScript/Python에서 JSON-RPC 기반 제어
- ACP: 자동화 및 외부 Agent Client 연동

Python SDK runtime은 최신 릴리스에서 Windows x64 배포도 추가되었다.

## 아키텍처

```text
                 Profile
                   │
        ┌──────────┴──────────┐
        │                     │
      Bundle              User Patch
        │                     │
        └──────────┬──────────┘
                   ↓
             Cordis Context
                   │
 ┌─────────┬───────┼─────────┬──────────┐
 │         │       │         │          │
 LLM     Tools   Sessions   Agent     Sandbox
Adapter Registry   Log      Loop      / FS
 │         │       │         │          │
 └─────────┴───────┴─────────┴──────────┘
                   │
              Agent Turn
                   │
      Model ↔ Tools ↔ Subagents
```

Agent 실행 단위는 Turn과 Step으로 나뉜다. 하나의 Step은 모델 요청 1회와 그에 따른 tool call을 포함하며, 하나의 Turn은 필요한 만큼 여러 Step을 수행한다.

## 장점

### 높은 교체 가능성

LLM, tool, filesystem, sandbox, subagent provider 등이 service seam으로 분리되어 있어 특정 vendor나 구현에 대한 결합도가 낮다.

### Harness 실험에 적합

모델 라우팅, worker/reviewer 분리, custom tool pipeline, context injection, session fork 등 Harness Engineering 아이디어를 구현하기 좋은 구조다.

### 기존 Coding Agent를 하위 Agent로 활용 가능

Claude Code/Codex를 subagent 또는 conversation mode로 통합할 수 있어 기존 Agent를 버리지 않고 상위 orchestration layer를 구축할 수 있다.

### Session Event 기반 재현성

모델에 전달된 context를 durable event log에서 재구성하는 설계는 resume, fork, debugging, telemetry 측면에서 강점이 있다.

### Windows 지원 개선

Python SDK Windows x64 runtime과 Windows 관련 수정이 최신 릴리스에 포함되어 Windows 중심 개발 환경에서도 PoC 가치가 높아졌다.

## 단점 및 한계

### 아직 Developer Preview

공식 README에서 compatibility-breaking change를 명시한다. 최신 alpha 릴리스에서도 대규모 내부 refactor와 API 변경이 계속되고 있어 장기 운영 시스템의 기반으로 바로 채택하기에는 위험하다.

### Cordis 학습 비용

일반적인 Agent Framework와 달리 Cordis의 Context, Service, Plugin lifecycle, reversible effect, profile/bundle/patch 개념을 이해해야 구조를 제대로 활용할 수 있다.

### 복잡한 패키지 구조

Agent Runtime뿐 아니라 Web UI, SDK, ACP, plugin infrastructure까지 포함하는 대형 monorepo다. 작은 자동화 하나를 만들 목적이라면 Claude Code/Codex CLI를 직접 사용하는 것보다 과한 구조가 될 수 있다.

### 보안 보장 없음

공식 Safety 문서는 아직 security audit을 받지 않았으며 sandbox, approval, permission control이 완전한 격리를 보장하지 않는다고 명시한다. 모델 생성 코드/명령, 플러그인, 네트워크, credential, filesystem 접근이 가능한 만큼 Enterprise 환경에서는 VM/container/전용 실행 계정 등의 외부 격리가 필요하다.

### 빠른 Breaking Change

`Code Mode → PTC Mode`, APIProxy 제거, client module 구조 변경 등 짧은 기간에 큰 변경이 발생하고 있다. Plugin을 직접 개발하면 upstream 변화 추적 비용이 상당할 수 있다.

## 활용 사례

### 1. Multi-model Coding Harness

```text
Orchestrator
   ├─ DeepSeek Worker
   ├─ Claude Code Worker
   └─ Codex Reviewer
```

DSH의 subagent/provider seam을 이용해 모델 역할별 Harness를 구성할 수 있다.

### 2. 사내 Agent Runtime PoC

filesystem/shell/sandbox/tool provider를 사내 정책에 맞게 교체하고 Web UI 또는 SDK를 프론트엔드로 사용할 수 있다.

### 3. CI/자동화 Agent

Headless 또는 ACP profile을 이용해 정기 코드 분석, 문서 생성, 리뷰 등의 자동화 worker로 사용할 수 있다.

### 4. Agent Plugin Platform

특정 업무 기능을 DSH plugin으로 패키징해 Harness 자체를 사내 Agent 플랫폼으로 확장할 수 있다.

## 기존 도구와 비교

| 항목 | DeepSeek Harness | Claude Code | Codex CLI |
|---|---|---|---|
| 주 목적 | Agent Harness / Runtime 조립 | 완성형 Coding Agent | 완성형 Coding Agent |
| 구조 | Everything-is-a-plugin | 제품 중심 확장 | 제품 중심 확장 |
| 모델 교체 | 높음 | 제한적 | 제한적 |
| Agent Loop 교체 | 가능 | 제한적 | 제한적 |
| Subagent 조합 | 핵심 확장 포인트 | 지원하지만 제품 구조 내부 | 지원하지만 제품 구조 내부 |
| Web UI | 기본 제공 | 주로 CLI/제품 UI | 주로 CLI/제품 UI |
| Headless/SDK | 제공 | CLI 자동화 중심 | CLI/App Server 중심 |
| 성숙도 | Developer Preview | 높음 | 높음 |

DSH는 Claude Code/Codex의 직접 대체재라기보다 **이들을 포함해 여러 Agent를 조합할 수 있는 상위 Harness 후보**로 보는 편이 적절하다.

## 활용 아이디어

### 바로 적용 가능

- 로컬 Web UI로 DeepSeek Harness 자체 기능 평가
- Headless mode를 이용한 단발성 Agent 자동화 실험
- Windows x64 Python SDK 검증

### PoC 가치 있음

- `DeepSeek Worker + Claude Code/Codex Subagent` 구성
- 분석/구현/리뷰 모델을 분리한 Multi-Agent Harness
- Session fork/resume을 활용한 장기 작업 인계 구조
- Tool execution event에 사내 approval/logging 정책 삽입
- Sandbox provider를 VM/container 실행 환경으로 교체

### 아이디어 참고

기존 자체 Harness를 유지하더라도 다음 설계는 참고 가치가 높다.

- 모든 model-visible context를 event log에 남기는 방식
- provider/service seam으로 vendor 의존성을 격리하는 방식
- Profile + Bundle + Patch 계층형 구성
- Agent/Tool event waterfall을 통한 interception
- session fork/resume을 1급 기능으로 취급하는 방식

### 현재는 도입 가치 낮음

- 안정성이 최우선인 Enterprise Production Agent Runtime
- 장기간 API 호환성이 필요한 사내 플랫폼
- 단순 Coding Agent 하나만 필요한 환경

현재 단계에서는 핵심 업무 시스템의 기반으로 전환하기보다 **별도 PoC Harness로 운영하면서 구조와 plugin 생태계를 관찰하는 전략**이 적합하다.

## 결론

DeepSeek Harness의 중요한 점은 DeepSeek 모델을 실행한다는 것보다 **Agent Harness 자체를 플러그인 플랫폼으로 만든 것**이다.

특히 Claude Code/Codex 같은 기존 Agent를 subagent로 조합하고, model/tool/session/sandbox를 독립적으로 교체할 수 있다는 점에서 Harness Engineering 관점의 실험 가치가 높다.

다만 2026-08 기준 Developer Preview/alpha 단계이고 공식적으로 보안 감사 및 호환성을 보장하지 않는다. 따라서 당장은 기존 개발 workflow를 대체하기보다 별도 환경에서 PoC하고, 안정화 이후 상위 orchestration layer 후보로 재평가하는 것이 적절하다.

## 참고 자료

- https://github.com/deepseek-ai/deepseek-harness
- https://deepseek-harness.github.io/deepseek-harness/
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/SAFETY.md
- https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-alpha.1
- https://github.com/deepseek-ai/deepseek-harness/discussions/4561
