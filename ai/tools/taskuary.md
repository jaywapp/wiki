---
title: Taskuary
category: tools
tags:
  - ai
  - agent
  - automation
  - local-first
  - coding-agent
  - task-management
source: https://github.com/ldbumble/taskuary
updated: 2026-09-15
---

# Taskuary

> 이메일·메신저·이슈·리포트 등에서 들어오는 업무를 하나의 Timeline으로 모아 AI가 triage하고, 실제 작업은 Claude Code·Codex·Gemini 같은 기존 Coding CLI에 넘긴 뒤 사람이 최종 승인하는 local-first AI 업무 허브.

## 프로젝트 개요

Taskuary는 사용자가 여러 업무 채널에서 직접 해야 했던 `수신 → 판단 → 태스크화 → 에이전트 실행 → 결과 검토` 연결 작업을 하나의 로컬 애플리케이션으로 통합한다.

핵심 철학은 완전 자율형 autopilot보다는 **review queue 기반 human-in-the-loop**다. 외부로 답장을 보내거나 결과를 확정하기 전에 사용자가 검토·승인한다.

2026-09-15 조사 기준 저장소는 `ldbumble/taskuary`, Python 기반이며 MIT License다. 프로젝트는 2026-08-17 생성된 초기 단계 프로젝트이고 최신 확인 릴리스는 `v0.3.4.8`이다. 1.0 이전이라 breaking change 가능성을 프로젝트 자체도 명시하고 있다.

## 해결하려는 문제

개발자나 지식 노동자의 업무는 실제로는 이메일, Teams/Slack, GitHub/Jira, 알림, 리포트 등 여러 시스템에서 발생한다. Coding Agent가 강력해져도 사용자는 여전히 다음 변환 계층 역할을 한다.

```text
메시지 확인
  ↓
실제 해야 할 일인지 판단
  ↓
Agent에게 다시 설명
  ↓
작업 세션 실행
  ↓
결과 확인
  ↓
원래 채널에서 응답/처리
```

Taskuary는 이 가운데 **업무 입력과 Coding Agent 사이의 translation/orchestration layer**를 자동화하려 한다.

## 핵심 기능

### Unified Timeline

Outlook/IMAP/Gmail, Teams, Slack, Telegram, WhatsApp, GitHub/GitLab, Jira, Azure DevOps, Linear, Trello, Notion, Sentry/PagerDuty 및 scheduled report 등 다양한 입력을 하나의 Timeline으로 통합하는 것을 목표로 한다.

### AI Triage

수신된 메시지를 단순 요약하지 않고 thread/context를 읽어 다음과 같이 분류한다.

- 실제 작업인지 판단
- 단순 알림/노이즈 분리
- 질문이면 답장 draft 생성
- 작업이면 실행 가능한 task로 전환
- 사용자의 이전 판정을 규칙으로 축적

### Coding Agent 실행

Taskuary 자체 Coding Agent를 강제하지 않고 사용자가 이미 사용하는 CLI를 실제 세션으로 실행하는 구조가 특징이다.

지원 대상으로 Claude Code, Codex, Gemini 등이 공식 페이지에 명시되어 있고 저장소 설명에는 Cursor/Copilot 및 기타 CLI 확장도 언급된다.

### Review Queue

에이전트 결과와 outbound reply를 바로 외부로 보내지 않고 검토 대기열에 둔다. 사용자가 send/change/snooze/dismiss 등의 판단을 수행한다.

### Studio / Live Workspace

Agent별 작업 상태와 terminal session을 관찰하고, 질문에 응답하거나 수정 파일을 확인할 수 있는 UI를 제공한다.

### Reports / Proactive Checks

자연어로 정기적인 데이터 확인 작업을 정의하고 SQL Server/Postgres, AWS/Azure, REST endpoint 등의 데이터를 읽어 리포트·차트를 생성하는 workflow를 구성할 수 있다.

## 아키텍처

공개 저장소 구조와 공식 설명을 종합하면 개념적 흐름은 다음과 같다.

```text
[Mail / Chat / Issues / Alerts / Reports]
                  │
                  ▼
           Unified Timeline
                  │
                  ▼
             AI Triage
        ┌─────────┼─────────┐
        │         │         │
      Noise     Reply      Task
                  │         │
                  │         ▼
                  │   Coding CLI Session
                  │   Claude/Codex/Gemini
                  │         │
                  └────┬────┘
                       ▼
                  Review Queue
                       │
                  Human Approval
                       │
                       ▼
               Send / Close / Apply
```

주요 Python 모듈에는 `agents.py`, `assistant.py`, `channels.py`, `blackboard.py`, `calendar.py`, `chains.py`, `artifacts.py`, AWS/Azure integration 등이 존재한다. 즉 단순 Kanban UI가 아니라 채널 ingestion, agent session, shared coordination, report/integration 기능을 한 프로세스 안에 묶는 비교적 넓은 범위의 애플리케이션이다.

공식 설명 기준 기본 저장은 `~/.taskuary` 아래 SQLite를 사용하며 기본 UI는 localhost에서 동작한다. Python 3.10+, FastAPI, SQLite 기반이며 Windows 단일 실행 파일과 pip, Docker 배포 방식을 제공한다.

### Agent Coordination 관점

특히 `blackboard` 개념이 흥미롭다. 공식 소개에서는 동일 checkout에서 두 Agent가 충돌하지 않도록 blackboard를 사용한다고 설명한다. 이는 여러 Coding Agent가 같은 workspace를 공유할 때 발생하는 파일 충돌·작업 중복을 조정하려는 장치로 볼 수 있다.

## 장점

1. **Coding Agent 앞단의 업무 intake까지 자동화**한다. 일반적인 Coding Agent harness가 이미 만들어진 task를 처리하는 데 집중한다면 Taskuary는 task가 만들어지기 전 단계까지 범위를 확장한다.
2. **기존 CLI를 재사용**한다. Claude Code/Codex/Gemini 구독과 로컬 repository 환경을 그대로 활용할 수 있어 독자적인 Agent runtime에 대한 lock-in이 상대적으로 낮다.
3. **Local-first** 구조다. SQLite와 localhost 중심 설계는 회사 코드와 메시지를 외부 SaaS control plane에 추가로 복제하는 부담을 줄일 수 있다.
4. **Human-in-the-loop가 기본값**이다. 메시지 전송과 결과 반영 전에 review queue를 두어 업무 자동화의 오작동 위험을 낮춘다.
5. Inbox triage, coding session, report automation을 하나의 작업 흐름으로 묶는 관점은 AX/업무 자동화 설계 참고 가치가 높다.

## 단점 및 한계

### 매우 초기 단계

2026-08-17에 시작된 프로젝트이며 2026-09-15 기준 0.3.x다. 최근 릴리스가 빠르게 반복되고 있고 프로젝트도 1.0 이전 breaking change 가능성을 명시한다. 현재는 장기 운영 플랫폼보다는 PoC 대상으로 보는 것이 안전하다.

### 통합 범위가 넓어 운영 복잡도가 커질 수 있음

메일, 메신저, issue tracker, DB, cloud, coding CLI까지 한 애플리케이션이 연결한다. 기능적 장점인 동시에 credential 관리, API 변경 대응, 장애 원인 추적 범위가 커진다.

### Enterprise 보안 검토 필요

Local-first라고 해서 자동으로 enterprise-safe인 것은 아니다. Outlook/Teams/Jira/GitHub 등 업무 시스템 credential을 로컬 프로세스가 다루며 Coding Agent가 실제 checkout에 접근한다. 회사 환경에서는 credential scope, audit log, 데이터 보존, outbound network, agent 실행 권한을 별도 검토해야 한다.

### Perforce 중심 환경은 확인 필요

공식 설명은 repository/checkout 및 GitHub 계열 흐름이 중심이다. Perforce workspace를 first-class VCS로 지원한다는 근거는 이번 조사에서 확인하지 못했다. Perforce 기반 UE5 환경에 적용하려면 task 실행기의 workspace abstraction과 변경 충돌 제어 방식을 별도 검증해야 한다.

### Token/Cost

Taskuary 자체가 token 절약 도구는 아니다. 모든 incoming item을 AI triage하고 일부 작업을 agent로 넘기므로 입력량이 많으면 LLM 호출량이 증가할 수 있다. 반면 사용자의 판정을 rule로 축적해 반복 판단을 줄이는 구조는 장기적으로 불필요한 LLM 판단을 줄일 가능성이 있다. 실제 token benchmark는 확인되지 않았다.

## 활용 사례

### 개발팀 업무 Intake

```text
Teams / Mail / Jira / GitHub
          ↓
      Taskuary Triage
          ↓
 개발 요청만 Task 생성
          ↓
 Claude Code / Codex
          ↓
 개발자 Review
```

### 운영 리포트 자동화

DB/REST/Cloud 데이터를 정기적으로 조회해 이상이 있을 때만 사용자에게 전달하는 quiet-check 구조로 활용할 수 있다.

### 개인 AI 업무 허브

여러 채널의 업무를 하나의 Timeline에서 확인하고 Agent 작업 결과까지 같은 UI에서 관리하는 개인용 AI Operations Console로 사용할 수 있다.

## 기존 도구와 비교

### 일반 Kanban / Task Manager와 차이

일반 Task Manager는 사람이 task를 생성한 이후를 관리한다. Taskuary의 핵심은 **메시지 자체에서 task를 추출하고 실행 Agent까지 연결**한다는 점이다.

### Coding Agent Harness와 차이

Claude Code Agent Teams나 자체 Orchestrator는 주로 `주어진 개발 목표 → Agent 분배 → 실행`에 집중한다. Taskuary는 그보다 한 단계 위에서 `업무 채널 → 목표/Task 생성 → Agent 전달 → 결과 승인`을 담당한다.

따라서 Taskuary를 Coding Harness 자체라기보다 **Work Intake + Agent Control Plane**으로 보는 편이 적절하다.

## 활용 아이디어

### 바로 적용 가능 — UI/Workflow 참고

Timeline → Triage → Agent Working → Review의 상태 모델은 사내 Agent dashboard 설계에 바로 참고할 가치가 있다.

### PoC 가치 있음 — 기존 Harness 앞단에 Intake Layer 추가

사내 Harness가 다음 구조라면:

```text
현재
User → Orchestrator → Worker → Review
```

Taskuary의 아이디어를 결합해 다음처럼 확장할 수 있다.

```text
Mail / Teams / Issue / Manual Request
              ↓
        Intake + Triage
              ↓
          Task Contract
              ↓
          Orchestrator
        ┌─────┴─────┐
      Claude       Codex
        └─────┬─────┘
              ↓
          Review Gate
              ↓
         Human Approval
```

핵심은 Taskuary 전체를 도입하기보다 **Intake/Triage/Review Gate 패턴**을 기존 Harness 앞뒤에 붙이는 것이다.

### PoC 가치 있음 — Perforce Agent Blackboard

Taskuary의 blackboard 아이디어는 Perforce의 `one workspace per agent` 구조와 결합해 다음 정보를 공유하는 방식으로 발전시킬 수 있다.

- Agent가 현재 수정 중인 파일
- 담당 Task
- pending changelist
- lock/conflict 상태
- 다른 Agent에게 전달할 context

Git checkout 충돌 방지 개념을 Perforce workspace/changelist 충돌 방지 계층으로 재해석할 가치가 있다.

### 아이디어 참고 — 사용자 판정의 Rule 승격

`이 메일은 작업 아님`, `이 종류는 다른 담당자`, `이 sender는 자동 처리` 같은 사용자의 반복 판정을 자연어 rule로 축적하는 구조는 LLM을 매번 호출하는 대신 deterministic pre-filter로 승격하는 설계와 연결할 수 있다.

이는 Agent Harness의 token 최적화에도 좋은 패턴이다.

### 현재는 도입 가치 낮음 — 사내 핵심 업무 플랫폼 전체 대체

0.3.x 단계에서 메일·메신저·VCS·DB·Agent 실행을 모두 Taskuary에 의존하는 것은 리스크가 크다. 먼저 demo 또는 격리된 개인 프로젝트에서 workflow와 agent session 관리 방식만 검증하는 편이 적절하다.

## 결론

Taskuary의 가장 중요한 아이디어는 **Coding Agent를 더 똑똑하게 만드는 것이 아니라, Coding Agent에게 일이 도달하는 과정을 자동화하는 것**이다.

AI Harness 관점에서는 Orchestrator 내부 구현보다 한 단계 상위의 `Work Intake Layer`를 보여준다. 특히 Timeline, AI Triage, 기존 Coding CLI 재사용, Blackboard, Review Gate의 조합은 사내 개발 생산성 Harness를 설계할 때 참고 가치가 높다.

현재 프로젝트 성숙도를 고려하면 직접 표준 플랫폼으로 채택하기보다는 **PoC 가치 있음**으로 평가한다. 특히 Intake/Triage와 Blackboard 패턴을 분리해 기존 Harness에 흡수하는 방향이 가장 현실적이다.

## 참고 자료

- https://taskuary.com/
- https://github.com/ldbumble/taskuary
- https://github.com/ldbumble/taskuary/releases
- https://pypi.org/project/taskuary/
