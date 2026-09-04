---
title: Herdr
category: tools
tags:
  - ai
  - agent
  - coding-agent
  - terminal
  - orchestration
  - claude-code
  - codex
source: https://github.com/herdrdev/herdr
updated: 2026-09-04
---

# Herdr

> Claude Code, Codex, OpenCode 같은 코딩 에이전트가 실행되는 터미널을 지속적으로 유지하고, 여러 에이전트의 상태와 세션을 한곳에서 관리하는 오픈소스 Agent Runtime / Terminal Multiplexer.

## 프로젝트 개요

Herdr는 AI 코딩 에이전트 자체를 대체하는 프레임워크가 아니라 **에이전트가 살아 있는 실행 환경(runtime)** 을 제공한다. 백그라운드 서버가 실제 터미널 세션을 소유하기 때문에 클라이언트가 종료되거나 네트워크가 끊겨도 작업을 유지하고 다시 접속할 수 있다.

2026-09-04 조사 기준 Rust 기반, Apache-2.0 라이선스이며 macOS/Linux/Windows를 지원한다. GitHub 저장소는 2026-03-27 생성되었고 약 3.5만 stars를 기록하고 있어 신생 프로젝트임에도 관심도가 매우 높다. 공식 사이트 기준 안정 버전은 v0.8.2이며 preview 빌드도 빠르게 갱신되고 있다.

## 해결하려는 문제

여러 Claude Code/Codex 등의 CLI 에이전트를 병렬로 돌리면 다음 문제가 생긴다.

- 터미널 창과 세션이 많아져 어떤 에이전트가 무엇을 하는지 추적하기 어렵다.
- 에이전트가 사용자 입력을 기다리는지, 작업 중인지 일일이 확인해야 한다.
- 노트북 종료, SSH 단절, 터미널 종료 시 장시간 작업 관리가 번거롭다.
- 여러 에이전트를 스크립트로 제어하려면 tmux 명령과 화면 파싱을 직접 구성해야 한다.
- 에이전트 간 helper spawn, 대기, 상태 확인 같은 orchestration 기반 기능이 표준화되어 있지 않다.

Herdr는 이 문제를 **persistent terminal + agent state detection + CLI/socket API** 조합으로 해결하려 한다.

## 핵심 기능

### Persistent Agent Runtime

Herdr 서버가 터미널을 소유한다. 사용자가 detach하거나 클라이언트를 닫아도 터미널과 프로세스는 서버에 남는다. 다시 attach하면 기존 작업으로 복귀할 수 있다.

### Agent 상태 추적

pane의 에이전트를 감지해 `working`, `blocked`, `idle`, `done` 등의 상태를 표시한다. 상태는 lifecycle hook/plugin 또는 screen manifest 탐지를 사용하며 workspace/tab 수준으로 roll-up된다.

특히 `blocked` 상태를 상위 workspace까지 전달하기 때문에 여러 에이전트를 돌릴 때 **사람의 개입이 필요한 작업만 찾는 방식**으로 운영할 수 있다.

### 다양한 Coding Agent 지원

공식 문서에서 Claude Code, Codex, OpenCode, Cursor Agent CLI, GitHub Copilot CLI, Devin CLI, Kimi Code CLI, Hermes Agent, Qwen Code, Qoder CLI, Grok CLI 등 다수의 에이전트를 자동 감지한다.

일부 에이전트는 lifecycle hook/plugin을 통해 상태를 직접 보고하고, Claude Code/Codex 등은 session identity integration과 screen manifest 기반 상태 탐지를 조합한다.

### Agent-native CLI / Socket API

Herdr의 CLI와 local socket API를 에이전트 자체가 사용할 수 있다. 따라서 에이전트가 다른 pane을 만들고 helper agent를 실행하거나 다른 agent의 출력/상태를 읽고 완료를 기다리는 형태의 orchestration이 가능하다.

### Agent Skill

저장소의 `skills/herdr/SKILL.md`를 coding agent에 설치할 수 있다. `HERDR_ENV=1`인 Herdr-managed pane에서 agent가 Herdr CLI를 안전하게 사용하는 방법을 제공한다.

Skill을 통해 agent는 workspace/tab/pane 확인, pane split, command 실행, output/log 읽기, 다른 agent 또는 테스트 완료 대기, sibling helper agent 실행 등을 수행할 수 있다.

### Plugin 구조

Herdr는 local executable workflow plugin과 event hook 구조를 제공하며 community plugin marketplace 방향도 제시하고 있다.

## 아키텍처

개념적으로 다음 구조로 볼 수 있다.

```text
                  User / Remote Client
                         |
                  attach / SSH
                         |
                  +--------------+
                  | Herdr Client |
                  +------+-------+
                         |
                    local socket
                         |
              +----------v-----------+
              |     Herdr Server     |
              | persistent runtime   |
              +----------+-----------+
                         |
        +----------------+----------------+
        |                |                |
     Workspace A      Workspace B      Workspace C
        |                |                |
      Tab/Pane          Tab/Pane          Tab/Pane
        |                |                |
   Claude Code          Codex          OpenCode
        |                |                |
 lifecycle/screen   session/screen   lifecycle plugin
        +----------------+----------------+
                         |
                 Agent state rollup
            working / blocked / idle / done
```

Herdr의 중요한 설계 포인트는 agent 프로세스를 wrapper로 감싸는 것이 아니라 **터미널 자체를 runtime boundary로 삼는 것**이다. 기존 CLI 사용법은 유지하면서 실행 세션과 상태만 Herdr가 관리한다.

## 실행 흐름

1. `herdr` 서버가 background runtime으로 실행된다.
2. workspace/tab/pane에 Claude Code나 Codex를 실행한다.
3. Herdr가 foreground process와 manifest/hook을 이용해 agent를 식별한다.
4. agent 상태가 pane → tab → workspace로 roll-up된다.
5. 사용자는 sidebar에서 필요한 agent로 이동한다.
6. detach 후에도 agent와 subprocess는 계속 실행된다.
7. 사용자가 다시 attach하면 terminal/session state를 복구한다.
8. Herdr Skill을 설치한 agent는 CLI/socket API를 통해 다른 pane/agent를 직접 제어할 수 있다.

## 장점

### 기존 CLI를 버릴 필요가 없다

Claude Code/Codex를 Herdr 전용 agent로 교체하는 구조가 아니다. 기존 CLI를 그대로 사용하면서 runtime만 추가하는 접근이라 도입 장벽이 낮다.

### 멀티 에이전트 운영 가시성이 좋다

여러 터미널을 직접 순회하는 대신 blocked/working 상태를 기준으로 사람이 개입해야 하는 곳을 찾을 수 있다.

### 장시간 작업에 적합하다

대규모 build, test, refactoring, backfill처럼 수십 분~수시간 걸리는 agent 작업을 client session과 분리할 수 있다.

### Agent가 runtime을 직접 제어할 수 있다

Skill + CLI/socket API를 사용하면 orchestrator agent가 helper agent를 생성하고 완료를 기다리는 패턴을 구성할 수 있다. 단순 terminal multiplexer보다 AI harness에 가까운 활용이 가능해지는 부분이다.

### Windows 지원

Windows x86_64 binary와 PowerShell 설치 경로가 공식 제공된다. Windows 중심 개발 환경에서 tmux 기반 접근보다 매력적이다.

## 단점 및 한계

### 아직 매우 젊은 프로젝트

2026년 3월 시작된 프로젝트이고 안정 버전도 v0.8.x 단계다. 빠른 개발 속도는 장점이지만 Enterprise 환경에서는 breaking change와 운영 안정성을 충분히 검증해야 한다.

### 상태 감지가 agent별로 동일하지 않다

모든 agent가 native lifecycle reporting을 제공하는 것은 아니다. Claude Code/Codex 등 일부는 screen manifest 기반 탐지에 의존하기 때문에 UI 변화나 terminal output 변화가 감지 정확도에 영향을 줄 가능성이 있다.

### VM/container 경계

공식 문서에서도 wrapper, VM, container가 foreground process를 숨기면 `HERDR_AGENT` 힌트나 별도 process detection 설정이 필요할 수 있다고 설명한다. sandbox가 강한 기업 환경에서는 사전 PoC가 필요하다.

### Terminal 중심 UX

시각적인 웹 기반 관제 Dashboard라기보다 terminal multiplexer/TUI에 가깝다. 팀 전체 진행 상황을 비개발자나 관리자가 보는 용도라면 별도 Dashboard가 필요할 수 있다.

### 보안 검토 필요

Herdr 서버가 agent terminal과 shell process를 지속적으로 소유하고 CLI/socket API로 제어한다. 회사 PC에서 도입하려면 local socket 권한, remote attach/SSH, plugin 실행, agent permission model 등을 검토해야 한다.

## 기존 도구와 비교

| 도구 | 주 역할 | Agent 상태 인식 | 세션 지속 | Agent 제어 API | 특징 |
|---|---|---:|---:|---:|---|
| tmux | terminal multiplexer | X | O | 제한적 | 범용/성숙 |
| zellij | terminal workspace | X | O | 제한적 | 현대적 terminal UX |
| Claude Code Agent Teams | Claude 중심 multi-agent | O | 제품 내부 | O | Claude 생태계 중심 |
| Herdr | coding-agent runtime | O | O | O | agent 종류에 독립적인 terminal runtime |

Herdr의 차별점은 **terminal multiplexer와 agent orchestration 사이의 레이어**를 목표로 한다는 점이다.

## 활용 사례

### 여러 Coding Agent 병렬 운영

프로젝트별로 Claude Code/Codex/OpenCode를 띄우고 sidebar에서 상태를 확인한다. 사용자는 blocked agent에만 개입한다.

### 장시간 Codex 작업

대규모 테스트나 리팩터링을 Codex에 맡긴 후 detach하고 다른 PC/SSH에서 다시 확인한다.

### Orchestrator + Worker 구조

Orchestrator agent가 Herdr Skill을 이용해 pane을 분할하고 Claude/Codex worker를 실행한 뒤 결과를 기다리도록 구성할 수 있다.

### 로컬 Agent Control Plane

여러 repository/worktree를 workspace로 나누고 agent runtime을 Herdr로 통일하면 로컬 PC 한 대를 lightweight agent execution server처럼 사용할 수 있다.

## 활용 아이디어

### 바로 적용 가능

개인 개발 환경에서 Claude Code + Codex를 동시에 사용하는 경우 Herdr를 terminal/session manager로 적용할 가치가 높다. 특히 Windows 공식 지원은 장점이다.

### PoC 가치 있음: Agent Team Runtime

현재 구상 중인 Orchestrator / Analysis / Work / Review 형태의 agent team에서 Herdr를 **execution/runtime layer**로 시험할 가치가 있다.

```text
Orchestrator
   |
   +-- Herdr pane -> Analysis Agent
   +-- Herdr pane -> Work Agent
   +-- Herdr pane -> Review Agent
   |
   +-- wait / inspect / spawn / resume
```

상위 orchestration은 별도 로직이 담당하고 Herdr는 다음 역할만 맡기는 방식이 적합하다.

- 프로세스 lifecycle
- persistent terminal
- agent status
- pane/workspace isolation
- remote attach
- helper agent spawn

즉 **Herdr를 orchestration brain으로 쓰기보다 execution substrate로 쓰는 것**이 좋다.

### PoC 가치 있음: Agent Team Dashboard backend

Herdr socket API의 workspace/pane/agent 상태를 별도 Blazor/Web dashboard에서 읽는 구조를 검토할 수 있다. Herdr TUI는 개발자 제어면으로 유지하고, 상위 dashboard는 팀 전체 상태와 작업 흐름을 시각화한다.

### Enterprise 검증 필요

회사 환경에서는 Windows + Perforce + worktree가 아닌 workspace 전략, endpoint protection, proxy, SSH 정책, socket/plugin 권한을 먼저 검증해야 한다.

## 결론

Herdr는 단순한 tmux 대체재보다 **AI coding agent용 runtime substrate**라는 관점에서 보는 것이 적절하다.

특히 여러 Claude Code/Codex agent를 동시에 운영하고 장시간 실행하며 사람이 필요한 agent만 빠르게 찾아야 하는 환경에서 가치가 크다. Agent Skill과 CLI/socket API 때문에 향후 multi-agent harness의 실행 계층으로도 활용 가능하다.

다만 프로젝트가 아직 v0.8.x이고 agent별 상태 탐지 방식이 다르므로, 조직 표준 runtime으로 바로 채택하기보다는 개인/소규모 Agent Team 환경에서 PoC한 뒤 안정성과 보안을 검증하는 것이 적절하다.

**평가: PoC 가치 높음.** 특히 멀티 에이전트 실행 현황을 terminal 밖의 Dashboard로 확장하려는 구조와 결합 가능성이 높다.

## 참고 자료

- https://herdr.dev/
- https://herdr.dev/docs/
- https://herdr.dev/docs/agents/
- https://herdr.dev/docs/integrations/
- https://herdr.dev/docs/agent-skill/
- https://github.com/herdrdev/herdr
