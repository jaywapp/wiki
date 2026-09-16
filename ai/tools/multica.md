---
title: Multica
category: tools
tags:
  - ai
  - agent
  - coding-agent
  - orchestration
  - claude-code
  - codex
  - self-hosted
source: https://github.com/multica-ai/multica
updated: 2026-09-16
---

# Multica

> Claude Code, Codex, Cursor 등 여러 Coding Agent CLI를 팀원처럼 Issue에 배정하고 실행·상태·리뷰·비용을 하나의 워크스페이스에서 관리하는 오픈소스 Agent Workspace다.

## 프로젝트 개요

Multica는 AI 모델이나 Coding Agent 자체가 아니라 이미 설치된 Coding Agent CLI를 관리하는 상위 운영 계층이다. 사용자는 Issue를 만들고 Agent를 assignee로 지정하며, Agent는 연결된 Runtime 머신의 daemon을 통해 작업을 수행하고 진행 상황과 결과를 Issue에 남긴다.

2026-09-16 기준 README는 Claude Code, Codex, Cursor Agent, Copilot CLI, OpenCode, DeepSeek Harness 등 26개 Agent CLI Runtime을 지원한다고 설명한다. Web, Electron Desktop, iOS 클라이언트와 CLI/API를 제공하며 전체 서버를 Self-host할 수 있다.

## 해결하려는 문제

Coding Agent를 여러 개 사용할 때 흔히 생기는 문제는 다음과 같다.

- Agent마다 별도 터미널/세션을 관리해야 함
- 누가 어떤 작업을 수행 중인지 한눈에 보기 어려움
- Agent 간 작업 전달과 역할 분배가 수동화됨
- 작업 의도, 실행 로그, 결정, diff가 분리됨
- 반복 작업에서 같은 컨텍스트를 다시 설명함
- 실행 비용과 Token 사용량을 작업 단위로 추적하기 어려움

Multica는 이를 Issue/Project/Agent/Runtime/Run이라는 팀 협업 모델로 통합한다.

## 핵심 기능

### Agent를 팀원처럼 관리

Agent에 이름, Provider, Runtime을 설정하고 Issue의 assignee로 지정한다. Agent는 작업을 가져가 실행하고 진행 상황을 comment로 보고하며 완료 후 review 단계로 넘긴다.

### Multi-Agent Squad

사람과 Agent를 Squad로 구성하고 leader가 작업을 분배하는 형태를 지원한다. 개별 CLI를 직접 조작하는 방식보다 조직/팀 단위 Agent 운영에 가깝다.

### Runtime 추상화

Multica가 모델을 직접 제공하지 않는다. 각 머신에 설치된 Claude Code, Codex 등의 CLI를 daemon이 탐지하고 실행한다. 따라서 Agent UI/Issue 관리 계층과 실제 Coding Agent 실행기를 분리할 수 있다.

### Skills

반복 가능한 작업 방식을 Skill로 저장해 여러 Agent가 재사용할 수 있다. Agent 운영 경험을 팀 Knowledge로 축적하는 계층이다.

### Autopilot

정기적인 audit, report, standup 등의 작업을 스케줄 기반으로 실행할 수 있다.

### 실행 추적

Run별 command/tool/error를 확인할 수 있고 Token usage를 Agent 및 Issue 기준으로 추적한다. 실패한 Run의 retry/timeout 처리도 지원한다.

### Review Gate

Agent 작업 결과를 바로 main에 반영하기보다 review 단계로 전달하여 사람이 최종 확인하는 흐름을 기본 모델로 삼는다.

### Self-hosting

Go Backend + Next.js Frontend + PostgreSQL을 Docker Compose 또는 Helm 기반으로 운영할 수 있다. Agent daemon은 코드가 존재하는 개발자 PC 또는 별도 Runtime 머신에서 실행된다.

## 아키텍처

```text
                 ┌────────────────────────────┐
                 │ Web / Desktop / Mobile     │
                 │ Issue · Board · Review     │
                 └──────────────┬─────────────┘
                                │
                                ▼
                 ┌────────────────────────────┐
                 │ Go Backend                 │
                 │ REST API + WebSocket       │
                 └──────────────┬─────────────┘
                                │
                 ┌──────────────┴─────────────┐
                 ▼                            ▼
        ┌────────────────┐          ┌────────────────────┐
        │ PostgreSQL 17  │          │ Agent Daemon       │
        │ Workspace/Run  │          │ Developer Machine  │
        └────────────────┘          └─────────┬──────────┘
                                             │ spawn
                            ┌────────────────┼────────────────┐
                            ▼                ▼                ▼
                      Claude Code          Codex            Cursor ...
                            │                │                │
                            └──────────── local code ─────────┘
```

공식 README 기준 기술 스택은 다음과 같다.

- Web: Next.js 16 App Router
- Desktop: Electron
- Mobile: Expo / React Native
- Backend: Go + Chi + sqlc + gorilla/websocket
- Database: PostgreSQL 17 (`pgcrypto`, `pg_trgm`)
- Runtime: 로컬 daemon + 외부 Coding Agent CLI

핵심은 **Control Plane과 Execution Plane의 분리**다. Multica 서버는 작업/상태/협업 정보를 관리하고 실제 코드 작업은 개발 머신의 daemon이 기존 Coding Agent CLI를 spawn하여 수행한다.

## Claude 기반 작업 Workspace 관점

Multica는 Claude Code를 대체하는 제품이 아니라 Claude Code 위에 운영 계층을 추가한다.

```text
사용자
  ↓
Issue / Project / Board
  ↓
Multica Agent / Squad
  ↓
Runtime 선택
  ↓
Claude Code / Codex / 기타 CLI
  ↓
Repository 작업
  ↓
Run Log → Issue Comment → Review
```

따라서 여러 Claude 세션을 프로젝트별로 상시 띄우고 사람이 직접 상태를 관리하는 구조를 Issue 중심 비동기 작업 구조로 바꾸는 데 참고 가치가 높다.

특히 참고할 패턴은 다음 네 가지다.

1. **Agent와 Runtime 분리** — 역할 정의와 실제 실행 머신을 분리한다.
2. **Issue를 Context Anchor로 사용** — 요구사항, 실행, 결과, review를 하나의 작업 객체에 연결한다.
3. **Human Review Gate** — Agent 완료와 배포/merge를 분리한다.
4. **Execution Observability** — Agent 상태뿐 아니라 Run, Token, Error까지 관찰한다.

## Perforce / UE5 환경 적용성

Multica 공식 VCS 통합은 README 기준 GitHub, GitLab, Gitea, Forgejo를 중심으로 설명되어 있으며 Perforce는 공식 지원 대상으로 확인되지 않았다. 따라서 회사의 Perforce 기반 UE5 환경에 그대로 도입하기보다는 **Multica의 운영 패턴을 자체 Harness에 이식하는 접근**이 현실적이다.

예를 들면:

```text
Task / Issue
   ↓
Agent Role
   ↓
Runtime / Workspace 할당
   ↓
Claude Code
   ↓
P4 workspace
   ↓
Pending CL
   ↓
Reviewer Agent
   ↓
Human Review
```

기존의 `one workspace per agent`, 프로젝트별 Claude 세션, release 담당 Agent 구조와 결합하기 좋다.

## 장점

- Claude Code/Codex 등 기존 CLI 투자를 그대로 활용한다.
- 특정 모델 Provider 하나에 실행 구조가 강하게 묶이지 않는다.
- Agent 실행 상태를 터미널이 아니라 팀 Board에서 관리한다.
- Issue가 작업 컨텍스트의 영속적인 Anchor 역할을 한다.
- 사람과 Agent를 동일한 협업 모델로 표현한다.
- 실행 로그와 Token usage를 운영 지표로 볼 수 있다.
- Self-host가 가능하여 사내 환경 PoC가 가능하다.
- Windows용 설치 경로도 공식 제공한다.

## 단점 및 한계

### Perforce 미지원

현재 공식 자료에서 Perforce native integration은 확인되지 않는다. Perforce 중심 조직에서는 핵심 VCS 흐름을 별도로 구현해야 할 가능성이 높다.

### 운영 복잡도

Self-host 시 Backend, Web, PostgreSQL, daemon, 각 Agent CLI 및 인증을 함께 운영해야 한다. 단일 Claude Code CLI보다 관리 대상이 크게 늘어난다.

### Agent CLI 의존성

Multica 자체가 Coding Agent 능력을 제공하지 않기 때문에 실제 품질, 비용, context 동작은 Claude Code/Codex 등 Runtime에 영향을 받는다.

### 빠른 변화와 성숙도

2026년 9월에도 릴리스가 매우 빈번하며 Issue/PR 규모도 크다. 기능 발전 속도는 빠르지만 Enterprise 표준 플랫폼으로 채택할 경우 버전 고정과 업그레이드 검증이 필요하다.

### Telemetry

Self-host API server는 기본적으로 하루 한 번 익명 deployment-level telemetry snapshot을 Multica endpoint로 전송한다. `DO_NOT_TRACK=1` 또는 `true`로 비활성화할 수 있으므로 폐쇄망/Enterprise 도입 시 반드시 확인해야 한다.

### 라이선스 주의

LICENSE는 Apache License 2.0 전문에 추가 조건을 결합한 `Multica License`다. 조직 내부 사용은 commercial license가 필요하지 않다고 명시하지만, 제3자 대상 hosted service나 상용 제품 embedding에는 별도 commercial license 제한이 있으며 branding/attribution 조건도 존재한다. 따라서 단순히 "Apache-2.0 프로젝트"로 취급하면 안 된다.

## 활용 사례

### 바로 적용 가능

- 개인/소규모 팀의 Claude Code + Codex 작업 통합
- 여러 Coding Agent 실행 현황 Board
- Issue 기반 비동기 Agent 작업
- 반복 audit/report 자동화
- Agent별 Token/Run 관찰

### PoC 가치 있음

- 사내 Agent Control Plane 설계 참고
- 프로젝트별 Agent와 Runtime/Workspace 분리
- Agent Team Board + Human Review Gate
- Agent 역할별 Skill 관리
- 장시간 실행 작업의 retry/timeout/observability

### 아이디어 참고

Perforce 기반 자체 Harness에서는 Multica 전체를 도입하기보다 다음 개념을 우선 차용할 가치가 있다.

- `Issue = Task Context`
- `Agent != Runtime`
- `Run = 관찰 가능한 실행 단위`
- `Squad = 역할 기반 Agent Team`
- `Skill = 조직의 재사용 가능한 실행 지식`
- `Review = Human Gate`

### 현재는 도입 가치 낮음

- Perforce native workflow가 필수이며 adapter 개발 여력이 없는 환경
- 단일 Agent만 짧게 사용하는 개발자
- 서버/DB/daemon 운영 부담을 허용하기 어려운 팀

## 기존 방식과 비교

| 항목 | 직접 Claude/Codex CLI 운영 | Multica |
|---|---|---|
| 작업 단위 | 터미널/세션 | Issue/Project |
| Agent 관리 | 사용자가 직접 | Workspace/Agent/Squad |
| 실행 머신 | 현재 Shell 중심 | Runtime으로 추상화 |
| 상태 확인 | 터미널 확인 | Board/Run/Inbox |
| Context 기록 | 세션 중심 | Issue 중심 |
| 반복 지식 | CLAUDE.md/Skill 수동 관리 | Skill 공유 |
| 자동화 | Hooks/Script/Cron | Autopilot |
| 비용 관찰 | CLI별 확인 | Run/Agent/Issue usage |
| Human Gate | 사용자 workflow에 의존 | Review workflow 제공 |
| VCS | CLI가 접근 가능한 환경 | Git 계열 공식 통합 중심 |

## 활용 아이디어

현재 설계 중인 Claude 기반 작업 Workspace에 Multica에서 특히 가져올 만한 부분은 **UI 자체보다 데이터 모델**이다.

```text
Project
 ├─ Task/Issue
 │   ├─ Context
 │   ├─ Assignee Agent
 │   ├─ Runtime/Workspace
 │   ├─ Runs[]
 │   ├─ Token/Cost
 │   ├─ Artifacts / Pending CL
 │   └─ Review
 │
 ├─ Agents
 │   ├─ Planner
 │   ├─ Worker
 │   ├─ Reviewer
 │   └─ Release
 │
 └─ Skills
```

이 구조를 Perforce에 맞게 변형하면 `Issue → Agent → P4 Workspace → Pending CL → Reviewer → Human Approval` 흐름을 만들 수 있다. Multica는 이 아이디어가 실제 제품 수준에서 어떻게 UI/Runtime/관찰성으로 연결되는지 보여주는 좋은 참조 구현이다.

## 결론

Multica의 핵심 가치는 새로운 Coding Agent를 만드는 것이 아니라 **이미 존재하는 Coding Agent들을 조직적으로 운영하는 Control Plane**을 제공한다는 점이다.

특히 여러 Claude/Codex 세션을 동시에 운영하고 프로젝트/역할별 Agent 구조를 만들려는 Harness 설계에서는 참고 가치가 높다. 다만 Perforce 기반 UE5 회사 환경에는 VCS 차이가 크므로 Multica 자체 도입보다는 **Issue 중심 Context, Agent/Runtime 분리, Run observability, Review Gate, Squad/Skill 모델을 자체 Harness에 반영하는 방향**이 우선적인 PoC 후보로 보인다.

## 참고 자료

- Repository: https://github.com/multica-ai/multica
- Documentation: https://multica.ai/docs
- Changelog: https://multica.ai/changelog
- Self-hosting: https://github.com/multica-ai/multica/blob/main/SELF_HOSTING.md
- License: https://github.com/multica-ai/multica/blob/main/LICENSE
