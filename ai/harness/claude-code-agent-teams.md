---
title: Claude Code Agent Teams
category: harness
tags:
  - ai
  - claude-code
  - agent
  - multi-agent
  - orchestration
source: https://code.claude.com/docs/ko/agent-teams
updated: 2026-09-05
---

# Claude Code Agent Teams

> 여러 개의 독립적인 Claude Code 세션을 Team Lead가 공유 Task List와 Agent 간 메시징으로 조율하는 실험적 멀티 에이전트 실행 구조.

## 프로젝트 개요

Claude Code Agent Teams는 하나의 Claude Code 세션 안에서 보조 작업을 수행하는 Subagent보다 한 단계 확장된 구조다. Team Lead가 여러 Claude Code 인스턴스를 teammate로 생성하고, 각 teammate는 독립적인 context window를 가진 채 작업한다.

핵심은 단순 병렬 실행이 아니라 **공유 Task List + 직접 Agent-to-Agent 메시징 + 중앙 Lead 조율**이다.

공식 문서 기준 v2.1.178 계열부터 팀 생성/정리 과정이 단순화되었으며, 기능 자체는 여전히 experimental이고 기본 비활성화 상태다.

## 해결하려는 문제

일반적인 Subagent 구조는 worker가 메인 Agent에게 결과를 반환하는 star topology에 가깝다. 이 방식은 작은 위임에는 효율적이지만 여러 worker가 서로의 결과를 참고하거나 반박하고, 작업 의존성을 직접 조율해야 하는 상황에서는 메인 Agent가 병목이 된다.

Agent Teams는 이를 다음 구조로 바꾼다.

- teammate별 독립 context
- 모든 Agent가 보는 공유 Task List
- teammate 간 직접 메시징
- dependency 기반 task unblock
- Lead에 의한 최종 조율과 결과 종합

따라서 연구, 리뷰, 대규모 기능 구현, 경쟁 가설 기반 디버깅처럼 병렬 탐색 자체가 가치가 있는 작업을 목표로 한다.

## 핵심 기능

### 독립 Claude Code 세션

각 teammate는 완전한 별도 Claude Code 인스턴스이며 자신의 context window를 사용한다. Lead의 대화 기록은 teammate에게 그대로 전달되지 않는다.

대신 일반 Claude Code 세션처럼 프로젝트의 `CLAUDE.md`, MCP 서버, Skills를 로드하고 Lead가 생성 시 전달한 spawn prompt를 받는다.

### 공유 Task List

Lead와 teammate가 동일한 작업 목록을 사용한다. Task는 pending / in progress / completed 상태를 가지며 dependency를 설정할 수 있다.

선행 Task가 완료되면 의존 Task가 자동으로 unblock된다.

### Agent 간 직접 메시징

Subagent와 달리 teammate는 Lead뿐 아니라 다른 teammate에게 직접 메시지를 보낼 수 있다.

이 특성이 Agent Teams의 가장 중요한 차별점이다. 예를 들어 구현 Agent가 테스트 Agent에게 API 변경을 직접 알리거나, 두 분석 Agent가 서로 다른 가설을 검증할 수 있다.

### 팀원 직접 개입

사용자가 Lead뿐 아니라 개별 teammate의 세션을 열어 직접 추가 지시, 질문, 방향 변경을 할 수 있다.

### Plan Approval

위험하거나 복잡한 작업은 teammate를 read-only plan mode에서 시작하게 만들고 Lead가 계획을 승인한 뒤 구현하도록 구성할 수 있다.

승인 기준도 프롬프트로 지정할 수 있다. 예를 들어 테스트 커버리지 없는 계획을 거부하거나 DB schema 변경 계획을 거부하도록 만들 수 있다.

### 모델 지정

팀원 수와 모델을 명시적으로 지정할 수 있다. teammate 기본 모델은 설정에서 제어할 수 있으며 작업별로 Sonnet 등의 모델을 지정할 수 있다.

## 아키텍처

```text
                    User
                      │
                      ▼
              ┌──────────────┐
              │  Team Lead   │
              │ Claude Code  │
              └──────┬───────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
 ┌────────────┐ ┌────────────┐ ┌────────────┐
 │ Teammate A │ │ Teammate B │ │ Teammate C │
 │ own context│ │ own context│ │ own context│
 └─────┬──────┘ └─────┬──────┘ └─────┬──────┘
       │              │              │
       └──── Agent-to-Agent ─────────┘
                      │
              ┌───────▼───────┐
              │ Shared Tasks  │
              │ + Mailbox     │
              └───────────────┘
```

공식 문서가 설명하는 주요 구성요소는 다음과 같다.

| Component | 역할 |
|---|---|
| Team Lead | teammate 생성, 작업 조율, 할당, 결과 종합 |
| Teammates | 독립 Claude Code 세션으로 실제 작업 수행 |
| Task List | 모든 Agent가 공유하는 작업 상태 및 dependency 관리 |
| Mailbox | Agent 간 메시징 |

팀 관련 runtime 정보는 로컬 `~/.claude/teams/{team-name}/config.json`, Task는 `~/.claude/tasks/{team-name}/`에 저장된다. 이 runtime config는 Claude Code가 관리하므로 직접 편집하는 설정 파일로 사용하면 안 된다.

## Subagent와 비교

| 항목 | Subagent | Agent Teams |
|---|---|---|
| Context | 독립 context | 독립 context |
| 통신 | 메인 Agent에게 결과 반환 | teammate 간 직접 메시징 |
| 조율 | Main Agent 중심 | 공유 Task List + 자체 조율 |
| 비용 | 상대적으로 낮음 | 높음 |
| 적합 작업 | 집중된 단기 위임 | 복잡한 협업/병렬 작업 |
| 사용자 개입 | 주로 Main을 통해 | 개별 teammate 직접 접근 가능 |

단순 검색, 파일 분석, 테스트 실행처럼 결과만 받아오면 되는 작업은 Subagent가 더 경제적이다.

Agent Teams는 worker끼리 정보를 주고받아야 할 이유가 있을 때 사용해야 한다.

## 다른 병렬화 방식과의 관계

Claude Code는 Agent Teams 외에도 Subagents, Agent View, Worktree 기반 병렬 세션, `/batch` 등 여러 병렬화 방식을 제공한다.

특히 중요한 차이는 **Agent Teams 자체는 teammate를 Git worktree로 격리하지 않는다는 점**이다. 따라서 여러 teammate가 동일 파일을 동시에 수정하면 충돌 위험이 있다. 파일 소유권을 분리하거나 별도의 worktree 전략을 함께 설계하는 것이 안전하다.

## 활성화

현재 기본적으로 비활성화되어 있으며 다음 환경 설정이 필요하다.

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

공식 문서에서는 Claude Code v2.1.32 이상을 요구하며 최신 문서는 v2.1.178 이후 동작 변화도 별도로 설명한다.

## 표시 모드

### In-process

기본 방식. 모든 teammate가 하나의 메인 터미널 안에서 실행된다. 별도 terminal multiplexer가 필요하지 않는다.

### Split panes

각 teammate를 별도 pane으로 보여준다. 동시에 여러 Agent의 진행 상태를 관찰할 수 있다는 장점이 있지만 tmux 또는 iTerm2가 필요하다.

Windows 중심 환경에서는 tmux 기반 UI보다 기본 in-process 모드 또는 별도의 dashboard/agent viewer를 검토하는 편이 현실적이다.

## 장점

### 실제 Agent Team에 가까운 협업 구조

단순 orchestrator → worker → result 구조보다 worker 사이의 협업이 가능하다. 복잡한 기능 개발이나 분석에서 중앙 orchestrator의 context 병목을 줄일 수 있다.

### Context 분리

각 teammate가 별도 context를 사용하므로 서로 다른 영역의 대량 코드/로그/문서를 동시에 읽어도 Lead context가 바로 포화되지 않는다.

### 역할 전문화

Subagent definition을 teammate type으로 재사용할 수 있어 architect, implementer, reviewer, tester 같은 역할을 표준화할 수 있다.

### 병렬 탐색

경쟁 가설 디버깅, architecture 검토, research처럼 여러 방향을 동시에 탐색한 뒤 결과를 합치는 작업에 특히 적합하다.

## 단점 및 한계

### Token 비용

각 teammate가 별도 Claude 인스턴스이므로 Agent 수에 비례해 token 사용량이 크게 증가한다. 일상적인 작은 작업에는 비용 대비 효과가 낮다.

### 동일 파일 충돌

Agent Teams는 teammate별 worktree isolation을 자동 제공하지 않는다. 병렬 구현 시 파일 ownership을 명확히 분리해야 한다.

### Experimental

기능이 아직 experimental이다. 공식 문서도 session resume, task coordination, shutdown 동작에 알려진 제한이 있음을 명시한다.

### Runtime 상태 의존

Team runtime 정보가 `~/.claude/teams`와 `~/.claude/tasks`에 로컬 저장된다. 장기 실행/복구/다른 머신 간 상태 이전을 전제로 하는 durable orchestration 플랫폼과는 성격이 다르다.

### Skill/Subagent 설정 차이

Subagent definition을 teammate로 사용할 수 있지만 `skills`와 `mcpServers` frontmatter는 teammate 실행 시 적용되지 않는다. teammate는 일반 세션과 동일하게 프로젝트/user settings에서 Skills와 MCP를 로드한다.

### 권한 전파

teammate는 Lead의 permission settings로 시작한다. Lead가 `--dangerously-skip-permissions`를 사용하면 teammate에도 전파되므로 Enterprise 환경에서는 특히 주의해야 한다.

## 활용 사례

### 기능 개발 팀

```text
Lead
 ├─ Architect
 ├─ Backend Implementer
 ├─ UI Implementer
 └─ Test/Review Agent
```

서로 다른 파일/모듈을 담당하도록 분리하면 효과적이다.

### 경쟁 가설 디버깅

```text
Agent A → race condition 가설
Agent B → cache/state 가설
Agent C → network/IO 가설
Lead    → evidence 비교 및 결론
```

한 Agent가 순차적으로 가설을 확인하는 것보다 병렬 탐색의 이점이 크다.

### Research Team

여러 Agent가 architecture, 운영성, 비용, security, 사용자 사례를 나누어 조사하고 서로 결과를 검토하게 할 수 있다.

## 활용 아이디어

### 바로 적용 가능 — Claude Code 내부 개발팀

프로젝트 단위로 Architect / Worker / Reviewer / Test teammate 역할을 정의하고 Lead가 공유 Task List를 관리하도록 구성할 수 있다.

특히 서로 다른 프로젝트나 모듈을 담당하는 작업이라면 효과가 크다.

### PoC 가치 높음 — Root 비서 + 프로젝트별 Claude 세션 구조

여러 프로젝트 세션을 Root의 메인 Claude가 관리하는 구조와 매우 유사하다.

다만 Agent Teams teammate는 **Lead가 생성하고 관리하는 세션**이라는 점에서 이미 별도로 실행 중인 장기 프로젝트 Claude 세션을 외부에서 연결하는 범용 session bus와는 다르다.

따라서 다음처럼 역할을 나누는 것이 현실적이다.

```text
Root Claude (Team Lead)
 │
 ├─ project1 teammate
 ├─ project2 teammate
 ├─ project3 teammate
 └─ release/integration teammate
```

프로젝트별 파일 ownership이 자연스럽게 분리되므로 Agent Teams의 동일 파일 충돌 문제도 상대적으로 작다.

### PoC 가치 높음 — Perforce 환경

Git worktree를 전제로 하지 않기 때문에 Perforce에서도 개념적으로 사용할 수 있다. 하지만 teammate들이 같은 workspace를 동시에 수정하면 충돌과 changelist ownership 문제가 생긴다.

Enterprise 환경에서는 **one workspace per agent** 또는 최소한 project/path ownership을 분리하는 방식이 필요하다.

### PoC 가치 있음 — Runtime Dashboard

공식 Agent panel은 기본 상태 확인에는 충분하지만 다수 Agent의 진행률, dependency, changelist, build/test 상태까지 한 화면에서 운영하려면 별도 dashboard가 유용하다.

`~/.claude/tasks`의 Task 상태와 각 Agent의 작업 결과를 별도 viewer로 수집하는 구조를 실험할 가치가 있다. 단, `~/.claude/teams/.../config.json`은 Claude가 관리하는 runtime 파일이므로 직접 수정하지 않고 read-only 관찰 대상으로 취급해야 한다.

## 기존 멀티 에이전트 Harness 설계에 주는 의미

Agent Teams는 자체적으로 다음 primitives를 제공한다.

- session spawning
- role separation
- shared task coordination
- dependency management
- agent messaging
- human intervention
- plan approval

따라서 Claude 중심의 로컬 Agent Harness를 새로 만든다면 이 기능들을 처음부터 자체 구현하기 전에 Agent Teams를 execution layer로 사용할 수 있는지 먼저 검증할 가치가 있다.

반면 durable queue, DB 기반 상태, cross-machine worker, Perforce changelist 정책, TeamCity 연동, Claude 외 모델(Codex 등) 라우팅이 필요하다면 Agent Teams만으로는 부족하다. 이 경우 상위 Orchestrator/Harness가 필요하고 Claude Agent Teams는 그 내부의 Claude execution backend 중 하나로 보는 편이 적절하다.

## 결론

Claude Code Agent Teams는 기존 Subagent보다 훨씬 실제 개발팀에 가까운 multi-agent primitive다. 특히 공유 Task List와 teammate 간 직접 통신이 핵심이며, 연구·리뷰·독립 모듈 개발·경쟁 가설 디버깅에서 가치가 높다.

반면 token 비용, experimental 상태, session resume 제약, 동일 workspace/file 충돌 문제 때문에 모든 작업을 Agent Teams로 전환하는 것은 적절하지 않다.

현재 관점에서는 **Claude Code 기반 프로젝트별 Agent Team PoC에 적극 활용할 가치가 높으며**, 장기적으로는 외부 Orchestrator가 Claude Agent Teams와 Codex/CI/Perforce 등을 함께 관리하는 계층형 Harness 구조가 가장 확장성이 높다.

## 참고 자료

- Claude Code Agent Teams 공식 문서: https://code.claude.com/docs/ko/agent-teams
- Claude Code Parallel Agents 공식 문서: https://code.claude.com/docs/en/agents
