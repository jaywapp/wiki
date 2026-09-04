---
title: Pixel Agents
category: tools
tags:
  - ai
  - agent
  - claude-code
  - multi-agent
  - visualization
  - monitoring
source: https://github.com/pixel-agents-hq/pixel-agents
updated: 2026-09-05
---

# Pixel Agents

> Claude Code 및 멀티 에이전트 세션의 실제 활동 상태를 픽셀 아트 오피스 캐릭터로 시각화하는 VS Code 확장/Standalone 관제 도구.

## 프로젝트 개요

Pixel Agents는 터미널에서 실행 중인 AI 코딩 에이전트를 픽셀 아트 캐릭터로 표현해, 여러 에이전트의 상태를 한눈에 파악하게 해주는 오픈소스 프로젝트다.

단순한 장식형 UI가 아니라 에이전트가 파일을 읽는지, 편집하는지, 명령을 실행하는지, 사용자 입력이나 권한 승인을 기다리는지를 실제 Claude Code 이벤트와 세션 기록을 기반으로 표시한다.

동일 코드베이스에서 두 가지 형태를 제공한다.

- VS Code Extension: VS Code 터미널과 패널 안에서 에이전트를 실행하고 관찰
- Standalone CLI: `npx pixel-agents`로 로컬 서버를 실행하고 브라우저에서 관찰

2026-09-05 기준 GitHub 저장소는 약 9.1k stars, 1.4k forks 규모이며 MIT License다. 최신 공식 릴리스는 v1.4.1(2026-08-15)이다.

## 해결하려는 문제

멀티 에이전트 개발 환경은 터미널 수가 늘어날수록 현재 상황을 파악하기 어렵다.

예를 들어 다음 상태를 사람이 계속 터미널을 전환하며 확인해야 한다.

- 어떤 에이전트가 실제 작업 중인가
- 어떤 에이전트가 대기 중인가
- 어떤 에이전트가 권한 승인을 기다리는가
- 서브에이전트 또는 팀원이 생성되었는가
- 현재 컨텍스트가 어느 정도 사용되었는가
- 특정 프로젝트/워크스페이스에 어떤 에이전트가 배치되어 있는가

Pixel Agents는 이 정보를 공간 기반 UI로 바꿔 인지 부하를 줄이는 것을 목표로 한다.

특히 Claude Code Agent Teams 및 sub-agent를 별도 캐릭터로 표시하기 때문에 단일 에이전트 모니터가 아니라 멀티 에이전트 관제 UI로 활용할 수 있다.

## 핵심 기능

### 1. 에이전트별 캐릭터 표현

각 Claude Code 세션을 하나의 캐릭터로 표현한다.

- 파일 편집 시 타이핑
- 검색/읽기 시 읽기 동작
- 명령 실행 상태 표시
- 사용자 입력/권한 승인 대기 시 speech bubble
- 작업 완료 및 permission 요청 사운드 알림

### 2. Claude Code Agent Teams / Sub-agent 시각화

v1.4.0부터 Claude Code Agent Teams가 주요 기능으로 포함됐다.

- Team Lead와 Teammate를 별도 캐릭터로 표시
- role label 및 lead badge
- teammate lifecycle 반영
- sub-agent 표시
- agent별 context gauge

다만 최근 이슈를 보면 named sub-agent/teammate의 좌석 배치와 캐릭터 겹침 문제는 아직 완전히 안정화되지 않았다.

### 3. Workspace Area

오피스 내부에 Area를 만들고 workspace folder와 연결할 수 있다.

예를 들어 다음처럼 공간을 구성할 수 있다.

```text
┌──────────────────────────────────────┐
│ Project A         │ Project B        │
│ 🤖 🤖              │ 🤖               │
│                   │                  │
├───────────────────┼──────────────────┤
│ Orchestrator      │ Release / Review │
│ 👑                │ 🤖 🤖             │
└──────────────────────────────────────┘
```

프로젝트별 Agent Team 운영 상황을 공간적으로 구분하는 데 특히 유용하다.

### 4. 레이아웃 편집

내장 Layout Editor를 제공한다.

- floor / wall / furniture
- carpet
- named area
- character / pet / furniture external asset
- layout JSON import/export

레이아웃은 최대 64×64 tile까지 확장할 수 있다.

### 5. Headless Agent 표현

외부에서 시작된 Claude 세션이나 `claude -p` 형태처럼 연결 가능한 터미널이 없는 세션을 ghost 캐릭터로 표시할 수 있다.

멀티 세션 관찰 환경에서 직접 제어 가능한 세션과 관찰 전용 세션을 구분할 때 유용하다.

### 6. Standalone Browser Dashboard

VS Code에 종속되지 않고 브라우저 UI로 사용할 수 있다.

```bash
cd /workspace/project
npx pixel-agents
```

로컬 Fastify 서버와 WebSocket 기반 UI가 실행된다.

tmux, remote 개발 환경, 별도 관제 모니터 등에 활용할 수 있다.

## 아키텍처

Pixel Agents는 최신 버전에서 VS Code 종속적인 확장 프로그램 구조에서 provider/adapter 기반 구조로 크게 분리되었다.

```text
Claude Code
   │
   ├─ Hooks
   │   SessionStart
   │   PreToolUse
   │   PermissionRequest
   │   Stop
   │   ...
   │
   └─ JSONL Session Transcript
          │
          ▼
   Claude HookProvider
          │
          ▼
      AgentEvent
          │
          ▼
   AgentRuntime
   AgentStateStore
          │
          ▼
  ┌───────────────────┐
  │ Transport Adapter │
  ├───────────────────┤
  │ VS Code Webview   │
  │ WebSocket         │
  └───────────────────┘
          │
          ▼
       React UI
          │
          ▼
      Canvas 2D
   Pixel Office / FSM
```

### core/

런타임 의존성을 최소화한 공통 계약 계층.

- Provider interface
- Adapter interface
- Transport
- Schema
- AsyncAPI message contract

### server/

실제 런타임 계층.

- Fastify server
- AgentRuntime
- AgentStateStore
- Claude provider
- transcript scanner
- Standalone CLI

### adapters/vscode/

VS Code 연결 계층.

- terminal integration
- persistence
- webview bridge

### webview-ui/

시각화 계층.

- React 19
- Vite
- Canvas 2D
- WebSocket / VS Code transport
- 캐릭터 state machine
- pathfinding

## 상태 수집 방식

Pixel Agents는 Claude Code 상태를 두 경로로 수집한다.

### Hooks Mode

기본 모드.

Claude Code hook 이벤트를 받아 즉시 상태를 반영한다.

예:

```text
SessionStart
PreToolUse
PermissionRequest
Stop
```

Hook script는 현재 실행 중인 Pixel Agents server를 찾아 이벤트를 전달한다.

### Heuristic Mode

Hook 사용이 어려운 경우의 fallback.

`~/.claude/projects/` 아래 JSONL transcript를 읽어 에이전트 상태를 추론한다.

Hooks mode에서도 hook 이벤트에 포함되지 않는 세부 정보는 transcript를 보완적으로 사용한다.

## Multi-server 구조

VS Code Extension과 Standalone CLI를 동시에 사용할 수 있다.

각 서버는 다음 경로에 등록된다.

```text
~/.pixel-agents/servers/
```

Claude hook script가 활성 서버를 탐색한 후 이벤트를 fan-out한다.

```text
Claude Hook
   │
   ├── VS Code Pixel Agents
   ├── Browser Pixel Agents
   └── Another Pixel Agents Server
```

따라서 개발 PC의 VS Code에서 작업하면서 별도 모니터나 브라우저에서 전체 상황을 관찰하는 구성도 가능하다.

## 보안 구조

Standalone은 기본적으로 `127.0.0.1`에 바인딩된다.

`0.0.0.0`으로 공개할 수 있지만 로컬 네트워크에 WebSocket/UI가 노출된다.

Hook 설치 등 설정 변경 기능은 URL의 `?token=` bearer capability를 가진 세션에 제한된다.

이 token은 사실상 권한 토큰이므로 공유 채널이나 로그에 노출하면 안 된다.

또한 Pixel Agents는 Claude Code의 `~/.claude/settings.json`에 hook 설정을 추가한다.

v1.4.1에서는 이 부분의 안전성이 크게 강화되었다.

- 최초 수정 전 사용자 동의
- 기존 settings 보존
- malformed settings 발견 시 fail-closed
- 최초 변경 전 backup
- concurrent modification 대응
- uninstall 시 자체 hook만 제거

기업 환경에서는 이 동작을 보안 정책 관점에서 반드시 검토해야 한다.

## 장점

### 멀티 에이전트 가시성이 매우 좋음

터미널 목록보다 공간 UI가 에이전트 수가 많아질수록 훨씬 빠르게 상황을 파악하게 해준다.

특히 Agent Teams, sub-agent, waiting 상태가 캐릭터로 분리되기 때문에 "현재 누가 일하고 있는가"를 즉시 알 수 있다.

### 실제 이벤트 기반

단순 프로세스 목록이나 임의 animation이 아니라 Claude Code hook / transcript에 기반한다.

즉 visual metaphor가 실제 작업 상태와 연결되어 있다.

### Standalone 지원

VS Code를 사용하지 않아도 브라우저 관제 UI로 활용할 수 있다.

이는 tmux, 원격 개발, 별도 모니터 구성에 상당히 유용하다.

### Provider 확장 구조

HookProvider interface를 통합 경계로 사용하기 때문에 아키텍처적으로 Claude Code에 완전히 묶여 있지는 않다.

README 기준 Claude Code가 reference implementation이며 Codex, Gemini, Cursor 등은 roadmap이다.

### 프로젝트별 공간 모델

Areas 기능을 이용하면 workspace/project별 에이전트 위치를 구분할 수 있다.

단순 리스트형 dashboard보다 "팀/프로젝트 구조"를 표현하는 데 적합하다.

## 단점 및 한계

### 현재 실사용 Agent Provider는 사실상 Claude Code 중심

구조는 agent-agnostic을 지향하지만 현재 공식 구현은 Claude Code가 중심이다.

Codex, Gemini, Cursor 등을 바로 동일 수준으로 사용할 수 있다고 보면 안 된다.

### 아직 Orchestration 제어 기능은 제한적

현재 가장 강한 기능은 visualization/monitoring이다.

프로젝트가 장기적으로 목표로 하는 다음 기능은 아직 대부분 roadmap이다.

- drag로 agent team 구성
- orchestrator character
- agent 간 작업 handoff
- task board에서 agent가 작업 선택
- rate limit / token budget health bar

따라서 현재 Pixel Agents 자체를 "멀티 에이전트 오케스트레이터"라고 평가하는 것은 과장이다.

### 캐릭터 겹침/좌석 관리 이슈

최근 open issue에서 agent swarm 시 sub-agent가 부모 주변에 겹치는 문제가 반복 보고되고 있다.

에이전트 수가 많을 때 시각화 품질이 저하될 가능성이 있다.

### 세션 이름 식별 문제

동일 repository에서 orchestrator/helper 등 여러 장기 세션을 운영할 경우 workspace folder 기반 label만으로는 구분하기 어렵다는 feature request가 존재한다.

대규모 팀 환경에서는 custom display name이 중요한 기능이 될 수 있다.

### Claude 설정 파일 수정

Hook 설치 과정에서 `~/.claude/settings.json`을 수정한다.

최근 버전에서 consent, backup, merge-safe write가 추가되었지만 Enterprise 환경에서는 중앙 관리 정책과 충돌 가능성을 검토해야 한다.

### UI가 업무 도구라기보다 게임형 UX

Pixel Art UI는 직관적이지만 다음 정보가 필요한 조직에서는 별도 dashboard가 필요할 수 있다.

- task progress percentage
- backlog
- job queue
- error rate
- throughput
- cost
- token consumption history
- SLA

Pixel Agents는 운영 관제 시스템 전체를 대체하는 도구가 아니다.

## 활용 사례

### 1. Claude Agent Team 관제

Claude Code Agent Teams를 여러 개 실행할 때 lead와 teammate 상태를 빠르게 확인한다.

### 2. 프로젝트별 Agent Workspace

Areas를 다음처럼 구성할 수 있다.

```text
src/project1 → Project 1 Area
src/project2 → Project 2 Area
src/project3 → Project 3 Area
root         → Orchestrator Area
release      → Release Area
```

각 프로젝트 세션이 어느 팀에 속하는지 시각적으로 구분할 수 있다.

### 3. 별도 관제 모니터

개발 터미널과 분리된 모니터에서 Standalone Pixel Agents를 실행한다.

```text
Developer Monitor
VS Code / Claude / Codex

       │ events
       ▼

Dashboard Monitor
Pixel Agents Browser
```

### 4. Agent Swarm 상태 확인

sub-agent를 병렬로 많이 생성하는 작업에서 현재 동작 중인 worker 수와 대기 상태를 확인한다.

## 기존 도구와 비교

Pixel Agents는 일반적인 Agent framework와 비교하기보다 Agent monitoring UI로 보는 것이 적합하다.

| 구분 | Pixel Agents | 일반 Agent Orchestrator | 일반 Dashboard |
|---|---|---|---|
| 에이전트 실행 | 일부 | 핵심 | 없음 |
| Agent Team 제어 | 제한적 | 핵심 | 없음 |
| 상태 시각화 | 매우 강함 | 보조 | 강함 |
| 실제 Tool activity | 지원 | 구현별 상이 | 연동 필요 |
| 공간/캐릭터 UI | 핵심 | 거의 없음 | 거의 없음 |
| Claude Code 통합 | 강함 | 구현별 상이 | 별도 연동 |
| Task Queue | 없음/roadmap | 핵심 | 표시 가능 |
| 비용/성능 분석 | 제한적 | 구현별 상이 | 구현 가능 |

## 활용 아이디어

### 바로 적용 가능: Agent Team 현황판

멀티 Claude Code 세션을 관리하면서 "누가 일하고 있고 누가 멈췄는지" 확인하는 용도로는 바로 사용할 가치가 있다.

특히 Standalone 모드는 별도 상태 모니터로 쓰기 좋다.

### PoC 가치 높음: 기존 Multi-Agent Harness UI

현재 설계 중인 Orchestrator / Project Agent / Release Agent 구조에 Pixel Agents의 시각화 개념을 결합할 가치가 높다.

예:

```text
                 Main Orchestrator
                        👑
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    Project 1        Project 2        Project 3
      🤖 🤖             🤖               🤖 🤖
        │                │                │
        └────────────────┼────────────────┘
                         ▼
                   Release Agent
                        🚀
```

Pixel Agents 자체를 그대로 쓰거나, architecture를 참고해 자체 Runtime Dashboard를 만들 수 있다.

### 특히 참고할 구조

자체 Agent Dashboard 구현 시 다음 요소는 재사용 가치가 높다.

- AgentEvent normalized model
- AgentRuntime / AgentStateStore 분리
- Provider interface
- Transport adapter
- AsyncAPI protocol contract
- WebSocket 관제 UI
- Hook + transcript 이중 수집
- Workspace Area mapping

### 아이디어 참고: Agent Team을 공간 모델로 표현

일반 dashboard의 table/card 대신 다음 관계를 공간으로 표현할 수 있다.

- 프로젝트별 영역
- 팀별 영역
- Orchestrator desk
- Review desk
- Release desk
- Waiting zone
- Failed/Blocked zone

이는 에이전트가 10개 이상 동작하는 환경에서 특히 인지성이 좋다.

### 현재는 도입 가치 낮음: 중앙 Enterprise 관제 플랫폼 대체

Pixel Agents 자체에는 RBAC, audit, 중앙 저장소, 비용 분석, 조직 단위 관리 기능이 부족하다.

따라서 Enterprise Agent Control Plane 용도로 직접 사용하기보다는 개인/소규모 팀의 실시간 UX 또는 자체 관제 UI의 참고 구현으로 보는 것이 적절하다.

## 프로젝트 성숙도

2026-09-05 기준:

- 약 9.1k GitHub stars
- 약 1.4k forks
- MIT License
- VS Code Marketplace / Open VSX 배포
- npm Standalone CLI 제공
- 최신 Release v1.4.1
- TypeScript 중심
- Vitest / Node test runner / Playwright E2E
- AsyncAPI contract 사용

성장 속도와 구조 개선은 빠른 편이지만 Agent Teams와 Standalone 관련 edge case 이슈가 계속 발생하고 있어 아직 완성형 관제 도구로 보기는 이르다.

## 결론

Pixel Agents의 가장 중요한 가치는 픽셀 아트 자체가 아니라 **멀티 에이전트 상태를 공간 기반 인터페이스로 바꾸는 UX**다.

Claude Code Agent Teams를 여러 터미널에서 운영하는 환경에서는 기존 터미널 중심 방식보다 작업 상태 파악이 훨씬 쉽다.

현재 단계에서는 완전한 orchestration 플랫폼보다는 "Agent Runtime Viewer" 또는 "Agent Team Cockpit"으로 평가하는 것이 정확하다.

특히 프로젝트별 Claude 세션을 실행하고 상위 Orchestrator에서 작업을 지시하는 구조를 운영한다면 Pixel Agents의 Area, Agent Team visualization, HookProvider, AgentRuntime 구조는 직접 적용하거나 자체 현황판 설계의 레퍼런스로 활용할 가치가 높다.

**평가: PoC 가치 높음.**

## 참고 자료

- GitHub Repository: https://github.com/pixel-agents-hq/pixel-agents
- Releases: https://github.com/pixel-agents-hq/pixel-agents/releases
- Issues: https://github.com/pixel-agents-hq/pixel-agents/issues
- VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=pablodelucca.pixel-agents
- npm: https://www.npmjs.com/package/pixel-agents
