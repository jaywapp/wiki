---
title: Claude Agent Team Manager
category: tools
tags:
  - ai
  - claude-code
  - multi-agent
  - agent-management
  - orchestration
  - desktop-tool
source: https://github.com/DatafyingTech/Claude-Agent-Team-Manager
updated: 2026-09-05
---

# Claude Agent Team Manager (ATM)

> Claude Code의 여러 Agent/Skill/Team 구성을 조직도 형태로 설계·관리하고, 배포·스케줄·파이프라인 실행까지 연결하는 Tauri 기반 데스크톱 관리 UI.

## 프로젝트 개요

Claude Code Agent가 늘어나면 `.claude/agents/`와 Skill Markdown/YAML 파일을 직접 찾아 수정하고, 팀 구조와 컨텍스트를 매번 프롬프트로 다시 설명해야 하는 문제가 생긴다. Claude Agent Team Manager(ATM)는 이 구성을 시각적 조직도로 올려 Agent, Team, Project Manager, Skill을 한 화면에서 관리하도록 만든 오픈소스 도구다.

Reddit의 최초 소개 글은 "5+ agent team members" 관리의 복잡성을 해결하기 위해 만든 시각적 org chart로 소개했으며, 이후 프로젝트는 단순 편집 UI에서 팀 배포, 파이프라인, OS 스케줄링, 원격 접근까지 확장됐다.

## 해결하려는 문제

- Agent 정의가 여러 Markdown/YAML 파일에 흩어짐
- Agent별 역할과 Skill 관계를 한눈에 파악하기 어려움
- API Key/변수 등 공통 설정의 중복 관리
- 팀 실행 때마다 조직 구조와 컨텍스트를 긴 프롬프트로 재작성
- 여러 Team의 순차 실행 및 Context handoff를 수작업으로 구성
- cron/Windows Task Scheduler를 직접 구성해야 하는 운영 부담

핵심은 **Agent 실행 엔진 자체를 새로 만드는 것보다 Claude Code 위에 관리·시각화·배포 계층을 제공하는 것**이다.

## 핵심 기능

### Visual Org Chart

Agent 구조가 단순 그림이 아니라 실제 배포 구조다. Drag & Drop으로 Agent를 Team에 배치하고 계층을 변경할 수 있다.

주요 Node 유형:

- User / Root
- Team
- Agent
- Project Manager
- Skill

### Agent / Skill 관리

기존 Claude Code Agent와 Skill을 자동 탐지하고 UI에서 편집한다. Agent 생성 템플릿, Monaco Editor, YAML/Frontmatter 파싱 및 검증을 제공한다.

### One-click Deploy

사용자가 Objective를 입력하면 ATM이 Team 구조, Skill 내용, 변수, coordination rule 등을 포함하는 deployment primer를 생성하고 Claude CLI가 실행되는 터미널을 연다.

### Project Manager Pipeline

여러 Team을 순차 연결할 수 있다.

```text
Objective
   |
Project Manager
   |
   +--> Research Team
   |       +--> Agent A
   |       +--> Agent B
   |
   +--> Analysis Team
   |       +--> Agent C
   |
   +--> Implementation Team
           +--> Agent D
           +--> Agent E
```

Team 내부 작업은 병렬화할 수 있지만 Team 간 Pipeline은 이전 단계 완료 후 다음 Team을 실행하는 구조를 지향한다.

### Scheduling

- Windows Task Scheduler
- macOS/Linux cron

을 이용해 Team 또는 Pipeline을 반복 실행할 수 있다. ATM이 종료된 상태에서도 생성된 스크립트와 OS Scheduler를 통해 실행 가능하도록 설계됐다.

### Variables / Context

API Key, Password, Note, Text 등 Typed Variable을 관리하며 상위 Node에서 하위 Agent로 상속할 수 있다. Agent별 Context/Skill 구성도 UI에서 관리한다.

### Remote / Mobile

0.8 계열에서는 Remote 기능이 추가됐다. v0.8.5 기준 Working Folder 선택, Mobile LAN 수정, 90일 pairing token, PWA 및 pairing 관리 기능이 포함되어 있다.

## 아키텍처

```text
React 19 + TypeScript
        |
 React Flow / Zustand
        |
   Tauri v2
   (Rust Backend)
        |
 +------+-------------------+
 |                          |
Claude config files      OS APIs
.claude/                 - File System
agents / skills          - Terminal
                         - Task Scheduler / cron
        |
   Claude Code CLI
        |
 Agent Team Execution
```

주요 기술 스택은 Tauri v2, React 19, TypeScript, Vite 7, React Flow, dagre, Zustand, Monaco Editor, gray-matter/YAML, Zod다.

ATM 자체가 LLM orchestration runtime을 완전히 대체하는 구조라기보다 **Claude Code 구성 파일과 CLI 실행을 조립하는 control plane/UI layer**에 가깝다.

## 장점

- Agent가 5~30개 이상으로 늘어날 때 구성 가시성이 크게 좋아짐
- Agent/Skill/Team 관계를 파일 탐색 없이 관리 가능
- 반복 가능한 Team Template 및 Layout을 만들 수 있음
- Team 간 Pipeline을 시각적으로 표현할 수 있음
- Windows를 공식 지원하며 Task Scheduler 연동 가능
- 표준 Claude Code 구성 파일을 사용하므로 포맷 Lock-in이 비교적 낮음
- JSON Export/Import로 조직 구성을 이동 가능
- MIT License

## 단점 및 한계

### Claude Code 중심

범용 Agent Orchestrator라기보다 Claude Code Agent 관리에 최적화돼 있다. Codex, Gemini CLI 등 이기종 Agent runtime을 동일 계층에서 직접 운영하는 기능은 확인되지 않았다.

### Runtime 관측성은 제한적

Org Chart는 구조 설계와 배포에 강하지만, 실제 실행 중 Agent별 상태, Token/Cost, Tool Call, 작업 Queue, 로그, 병목을 실시간으로 보여주는 완성형 observability dashboard와는 다르다.

### 보안 모델

Reddit에서도 dependency sandboxing, commit provenance, context bleed 문제가 지적됐다. 변수 masking과 계층적 관리 기능은 있지만 OS 수준 Sandbox, Secret Vault, Agent별 최소 권한 실행을 완전히 해결한다고 보기는 어렵다.

특히 Enterprise에서는 API Key를 UI/설정에 직접 저장하는 방식보다 Vault 또는 사내 Secret Manager 연동 여부를 별도 검토해야 한다.

### 프로젝트 성숙도

2026-03 기준 최신 공개 Release는 v0.8.5로 아직 1.0 이전이다. 기능 변화가 빠르므로 Production 표준 도구로 채택하기 전에 저장 포맷, migration, scheduler 안정성, remote security를 검증할 필요가 있다.

## 활용 사례

공식 README에는 다음과 같은 사례가 소개된다.

- 6-Agent 암호화폐 투자 Research Team
- 8-Agent IT Security/SOC Team
- 7-Agent Social Media Content Pipeline

실무 개발 환경에서는 다음 구조가 더 흥미롭다.

```text
Project Manager
 |
 +-- Analysis Team
 |    +-- Requirement Agent
 |    +-- Architecture Agent
 |
 +-- Implementation Team
 |    +-- Coding Agent
 |    +-- Test Agent
 |
 +-- Review Team
      +-- Code Review Agent
      +-- Documentation Agent
```

## 기존 도구와 비교

ATM의 차별점은 Agent 실행 알고리즘보다 **사람이 여러 Agent를 운영하기 위한 GUI Control Plane**에 있다.

CLI/Markdown 기반 Claude Code 운영은 유연하지만 Agent 수가 증가할수록 전체 구조 파악이 어렵다. ATM은 이를 Org Chart와 Pipeline으로 추상화한다. 반대로 LangGraph류 runtime처럼 상태 머신, durable execution, checkpoint를 핵심으로 제공하는 orchestration framework와는 목적이 다르다.

## 활용 아이디어

### 바로 적용 가능 — Agent/Skill 구성 시각화

여러 프로젝트에서 Claude Code Agent와 Skill이 증가할 경우 `.claude/` 구성 탐색기로 사용할 가치가 높다.

### PoC 가치 높음 — 메인 비서 + 프로젝트별 Claude 세션 구조

Root의 Main/PM Agent가 여러 프로젝트 Team을 관리하고 Team 아래에 프로젝트별 Agent를 배치하는 형태는 "메인 세션에서 지시하고 프로젝트별 세션이 수행"하는 구조의 UI 모델로 잘 맞는다.

다만 ATM의 현재 Pipeline은 **새 Claude CLI 실행을 조립하는 방식**에 가까우므로, 이미 살아 있는 장기 실행 Claude 세션과 양방향 통신하는 Session Broker가 필요한 구조라면 별도 Relay/IPC 계층이 필요하다.

### PoC 가치 높음 — Agent Team Runtime Dashboard의 UI 참고

특히 다음 UI 개념은 Agent Team Dashboard 설계에 참고 가치가 크다.

- Org Chart 기반 Team/Agent topology
- Node별 Role/Skill/Context Inspector
- Project Manager → Team → Agent 계층
- Pipeline 시각화
- Layout 저장/전환

여기에 실제 업무용으로는 다음 기능을 추가하는 방향이 좋다.

```text
ATM-style Org Chart
        +
Runtime Status
        +
Task Queue / Progress
        +
Token & Cost
        +
Logs / Tool Calls
        +
Git / Perforce Changes
        +
Approval / Review Gate
```

즉, ATM을 그대로 최종 플랫폼으로 쓰기보다 **Agent 조직 설계 UI의 좋은 Reference Implementation**으로 보고 Runtime/Observability를 결합하는 것이 더 가치 있다.

## 결론

Claude Agent Team Manager는 Agent가 많아졌을 때 생기는 "Markdown 설정 파일 관리 문제"를 시각적 조직도와 배포 Workflow로 해결하려는 실용적인 프로젝트다. 특히 Agent Team을 조직 구조처럼 설계하고 Project Manager가 여러 Team을 순차 연결한다는 모델이 직관적이다.

Agent Team 운영을 터미널만으로 관리하기 어렵다는 문제에 대한 실제 구현 사례라는 점에서 가치가 높다. 다만 Runtime orchestration/observability/security까지 완성된 Enterprise 플랫폼은 아니므로, **Agent Team Manager UI + 별도 Session Broker + Runtime Dashboard** 형태로 아이디어를 가져오는 것이 가장 유용하다.

**평가: PoC 가치 높음 / UI·운영 모델 참고 가치 매우 높음.**

## 참고 자료

- Reddit 소개: https://www.reddit.com/r/ClaudeAI/comments/1rf0199/managing_5_agent_team_members_was_a_mess_until_i/
- GitHub: https://github.com/DatafyingTech/Claude-Agent-Team-Manager
- Latest checked release: v0.8.5 (2026-03-11)
