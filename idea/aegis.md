- Status: Idea
- Version: 0.1
- Created: 2026-08-31
- Updated: 2026-08-31
- Tags: aegis, ai-agent, multi-agent, claude, codex, workspace, git, perforce, orchestration, runtime-viewer

# Aegis

## 1. 한 줄 요약

Aegis는 AI 작업 Workspace 전체에 적용되는 **Agent Team 실행·관제 계층**이다. Claude와 Codex를 포함한 AI Harness를 작업 특성에 따라 동적으로 조합하고, 병렬화·컨텍스트 분배·코드 변경 충돌 방지·독립 검증·실패 복구를 자동화하며, Live Runtime Viewer를 통해 AI 팀의 현재 작업 상황을 한눈에 파악할 수 있게 한다.

## 2. 배경 및 문제

Claude Code, Codex 등은 Agent/Sub-Agent 기능을 활용할 수 있지만 실제 작업에서는 사용자가 직접 작업을 분해하고 병렬 실행 여부와 역할을 판단해야 하는 경우가 많다. 여러 Agent가 동시에 작업하면 터미널 로그만으로는 전체 작업 진행률, Agent별 담당 업무, 대기/실패 원인, 파일 수정 충돌 등을 파악하기도 어렵다.

또한 사용 환경에 따라 기본 AI와 SCM이 다르다.

- Home: Codex 중심 + Claude 보조 + Git
- Work: Claude 중심 + Codex 보조 + Perforce

프로젝트마다 Agent 운영 규칙을 반복 작성하기보다 AI Workspace Root에 공통 실행 환경을 두고, 하위 프로젝트가 기본적으로 Agent Team 방식으로 작업하도록 만들고자 한다.

핵심 문제는 Agent 수를 늘리는 것이 아니다. 과도한 Agent 생성은 토큰 사용량, 컨텍스트 중복, 파일 충돌, 통합 비용을 증가시킬 수 있다. Aegis는 작업 규모와 의존성을 판단하여 필요한 Agent만 구성하고, 병렬화 가치가 있는 작업만 병렬 실행해야 한다.

## 3. 목표

핵심 목표는 다음과 같다.

> 같은 작업을 더 적은 사용자 개입으로, 더 빠르고, 더 높은 완성도로 처리하면서 현재 AI 팀의 작업 상황을 사용자가 쉽게 이해할 수 있게 한다.

세부 목표:

- Workspace 하위 프로젝트에 공통 Agent Team 환경 제공
- 작업 규모에 따른 Dynamic Agent Team 구성
- Task Graph 기반 Adaptive Parallelism
- Claude/Codex Hybrid Agent Team 지원
- 환경별 Primary/Secondary Harness 설정
- Agent별 최소 필요 Context만 전달하여 토큰 사용 최적화
- 병렬 코드 수정 충돌 방지
- 구현과 검증 역할 분리
- Agent 실패 시 Retry/Fallback/Replanning
- Git/Perforce 환경 지원
- Control Center에서 설정과 Agent Role 관리
- Live Runtime Viewer에서 현재 Team/Task 상태 시각화
- 실행 데이터를 기록하여 Multi-Agent 효과 측정

### 성공 판단 기준

Task Report에서 최소 다음을 기록한다.

- 총 작업 시간
- 사용 Agent 수
- 최대/평균 병렬 실행 수
- Retry/Fallback 횟수
- Review에서 발견된 문제
- 사용자 개입 횟수
- 가능할 경우 Harness/Agent별 토큰 사용량

향후 데이터를 통해 Agent 수 증가가 실제 시간을 줄였는지, 병렬 실행 이득이 통합 비용보다 컸는지, 독립 Reviewer가 실질적인 결함을 발견했는지, Harness별로 어떤 Role에서 효율적인지 판단할 수 있어야 한다.

## 4. 대상 사용자

초기 대상은 Claude Code와 Codex를 사용하여 개발·조사·설계 작업을 수행하는 개인 사용자다.

주요 요구:

- 매번 Sub-Agent 사용을 직접 지시하지 않아도 된다.
- 작업에 적절한 Team이 자동 구성된다.
- 작은 작업은 불필요하게 복잡해지지 않는다.
- 큰 작업은 가능한 부분을 적극 병렬화한다.
- Home/Work 환경에 맞는 AI와 SCM을 사용할 수 있다.
- Claude/Codex 중 하나에 시스템 전체가 종속되지 않는다.
- Agent가 무엇을 하고 있고 전체 작업이 어디까지 진행됐는지 쉽게 확인할 수 있다.
- 설정과 Agent 정책을 UI에서 관리할 수 있다.

## 5. 핵심 아이디어

Aegis는 Workspace Root와 개별 AI Harness 사이의 Agent Team Runtime 역할을 한다.

    User Request
         |
         v
    Lead / Orchestrator
         |
    Task Analysis
         |
    Task Graph
         |
    Dynamic Team Formation
         |
    Parallel / Sequential Execution
         |
    Validation
         |
    Integration
         |
    Result / Report

핵심 원칙은 **항상 Multi-Agent가 아니라 필요한 경우 최적의 Multi-Agent를 사용하는 것**이다.

### Dynamic Agent Team

Role은 지속적으로 정의하지만 실제 Agent Instance는 Task에 따라 일회성으로 생성한다.

예:

- Trivial: Lead 직접 수행
- Small: Lead + Worker
- Medium: Explorer + Developer + Reviewer 등 Dynamic Team
- Large: Task Graph 기반 다수 Agent Team
- 조사: 관점별 Researcher 병렬 실행

### Agent 모델

- Agent: 일회성 실행자
- Role: 지속되는 역할 정의
- Project Context: 프로젝트의 지속 지식과 결정사항
- Task / Result: 개별 실행 기록

Agent 자체를 장기간 유지하기보다 필요한 시점에 생성하고 필요한 Context만 전달한다.

## 6. 주요 사용 흐름

1. 사용자가 Claude 또는 Codex에서 일반적인 작업 요청을 입력한다.
2. Aegis가 Environment Profile과 Execution Preset을 확인한다.
3. Lead가 범위, 난이도, 수정 대상, 필요한 역할, 의존성, 병렬화 가능성, 위험도를 판단한다.
4. Fast Path로 Trivial/Small/Medium/Large 실행 전략을 선택한다.
5. Task Graph를 생성하여 독립 Task와 의존 Task를 구분한다.
6. Role과 Harness Preference, Primary/Secondary 설정, 가용성, 병렬 제한을 기반으로 Agent를 Routing한다.
7. Lead가 Agent별 Task Context Package를 생성한다.
8. 독립 Task는 File Ownership을 확보한 뒤 병렬 실행한다.
9. 구현과 독립 Review/Test를 수행한다.
10. 실패 시 Retry, Agent 재생성, Secondary Harness Fallback 또는 Lead Replanning을 수행한다.
11. Lead가 결과를 통합한다.
12. Report와 필요한 Project Context를 갱신한다.
13. 전체 과정은 Aegis Live Runtime Viewer에 실시간 상태로 반영한다.

## 7. 핵심 기능

### 7.1 Environment Profile

초기 기본값:

#### Home

- Primary Harness: Codex
- Secondary Harness: Claude
- SCM: Git

#### Work

- Primary Harness: Claude
- Secondary Harness: Codex
- SCM: Perforce

Primary는 기본 선호 Harness이며 특정 Role을 강제하지 않는다. 모든 관계는 설정으로 변경 가능하다.

### 7.2 Execution Preset

Environment와 실행 전략을 분리한다.

- Fast: Agent/Research/Review 최소화, 빠른 결과 우선
- Balanced: 속도·품질·비용 균형, 기본값
- Deep: 적극적인 병렬 분석과 독립 Review 강화

예: Home + Deep, Work + Fast 조합이 가능하다.

### 7.3 Role Pool

초기 후보:

- Lead / Orchestrator
- Researcher
- Explorer
- Architect
- Developer
- Specialist
- Tester
- Reviewer

Role별 Harness Preference를 설정할 수 있다.

### 7.4 Fast Path 및 Adaptive Parallelism

작은 작업은 Lead가 직접 처리하고, Task Graph를 기반으로 독립 작업만 병렬화한다. 병렬 실행 자체를 목표로 하지 않고 Dependency, Context, File Ownership, Agent Availability, Max Parallel, 통합 비용을 고려한다.

### 7.5 Task Context Package

Agent에게 전체 대화와 Workspace Context를 무조건 전달하지 않는다.

기본 구성:

- Objective
- Relevant Decisions
- Target Files
- Dependencies
- Constraints
- Expected Output
- Validation Criteria

### 7.6 Agent Spawn Control

Team topology 변경은 Lead가 통제한다. Worker가 추가 Agent가 필요하면 Lead에게 요청하고 Lead가 비용, 병렬 Slot, Context, 적합한 Role/Harness를 판단한다. 무제한 Recursive Agent Spawn은 허용하지 않는다.

### 7.7 File Ownership

MVP에서는 동일 Workspace에서 Agent별 수정 영역을 관리하여 동일 파일/영역 동시 수정을 방지한다. 대규모 병렬 작업에서는 향후 SCM Isolation을 선택적으로 사용한다.

### 7.8 SCM Adapter

Aegis Runtime에서 SCM 차이를 추상화한다.

#### Git

MVP:
- 동일 Workspace
- File Ownership

Later:
- Agent별 Worktree
- Branch Isolation
- 자동 Merge 지원

#### Perforce

MVP:
- 동일 Workspace
- File Ownership
- 작업 단위 Pending Changelist 활용

Later:
- Agent별 Workspace Isolation
- 복잡한 병렬 변경 관리

### 7.9 Independent Review

원칙적으로 구현 Agent와 최종 Reviewer를 분리한다. Trivial Task는 비용 대비 효과를 판단하여 독립 Review를 생략할 수 있다.

### 7.10 Failure Recovery

- 일시 오류 → Retry
- Context 부족 → Lead Context 요청
- 구현 실패 → 동일 Role Agent 재생성
- 반복 실패 → Secondary Harness Fallback
- 구조적 문제 → Lead Replanning

## 8. Aegis Control Center & Live Runtime Viewer

Aegis의 관리 UI는 단순 Config Editor가 아니라 **AI 개발팀을 관제하는 Command Center**로 설계한다.

메인 정보 구조는 다음을 기본 방향으로 한다.

    +-----------+-----------------------------+----------------+
    | LIVE TEAM |       LIVE TASK GRAPH       |   INSPECTOR    |
    |           |                             |                |
    | Agents    |       Runtime Flow          | Selected       |
    | Status    |                             | Agent / Task   |
    +-----------+-----------------------------+----------------+
    |                    LIVE ACTIVITY                         |
    +----------------------------------------------------------+

### 8.1 핵심 UX

사용자가 터미널 로그를 해석하지 않아도 다음을 즉시 알 수 있어야 한다.

- 전체 작업 진행 상태
- 현재 활동 중인 Agent
- Agent별 Role과 Harness
- Agent별 담당 Task
- 현재 병렬 실행 수
- Waiting/Blocked Task
- 실패/Retry/Fallback 발생 여부
- Agent별 File Ownership
- Integration/Review/Test 단계 진입 여부

상단에는 사람이 바로 이해할 수 있는 상태를 요약한다.

예:

    3 agents working · 1 waiting · No blockers

문제 발생 시:

    DEV-02 blocked · Waiting for file ownership

### 8.2 Live Task Graph

단순 로그 목록보다 Task Graph를 중심으로 시각화한다.

Task Node 상태 예:

- Working
- Waiting
- Blocked
- Reviewing
- Retrying
- Failed
- Completed

독립 Task의 병렬 실행, Dependency, Integration, Review/Test 흐름을 그래프에서 직접 확인할 수 있어야 한다.

### 8.3 Live Team

현재 생성된 Team을 표시한다.

각 Agent에 대해 최소 다음을 보여준다.

- Role
- Harness
- Status
- 담당 Task
- 실행 시간

### 8.4 Agent Inspector

Task Graph 또는 Team에서 Agent를 선택하면 상세 Inspector를 제공한다.

- 현재 Task
- Role / Harness
- 실행 시간
- 현재 Action
- 전달된 Context 요약
- File Ownership
- Task Checkpoint
- 최근 Activity
- Result
- Retry/Fallback 이력
- 가능할 경우 Token/Tool Call 정보

Agent의 내부 reasoning 전체를 노출하는 것이 아니라 **행동과 상태를 Observable하게 만드는 것**에 집중한다.

### 8.5 Live Activity

Agent Team의 주요 Runtime Event를 시간순으로 표시한다.

예:

- Agent spawned
- Task started/completed
- File ownership acquired/released
- Test started/passed/failed
- Review completed
- Retry/Fallback
- Blocked/Unblocked
- Integration completed

### 8.6 시각 디자인 방향

Aegis 이름에 맞게 **게임 HUD + 개발도구 + 관제센터**의 중간 성격을 지향하되 과도한 사이버펑크 표현은 피한다.

Linear/GitHub/Vercel 계열의 정돈된 개발도구 감성을 기반으로 실시간 Agent 상태만 적절하게 역동적으로 표현한다.

예:

- Working Node: 절제된 Pulse
- Waiting: 낮은 강조도
- Completed: 명확한 완료 표시
- Blocked: 경고 상태
- Failed: 오류 상태
- Retrying: 재시도 상태 변화

PC의 넓은 화면을 적극 활용한다.

### 8.7 Dashboard Navigation

초기 정보 구조 후보:

- Overview
- Live
- History
- Agents
- Settings

기본 진입은 Live View로 한다. 실행 중 Task가 없다면 최근 실행 결과를 보여줄 수 있다.

### 8.8 디자인 시안 요구

**실제 UI/UX 문서화 및 디자인 단계에서 Aegis Command Center / Live Runtime Viewer의 서로 다른 디자인 시안을 최소 5개 제안받아 비교·선택한다.**

각 시안은 단순 색상 변경이 아니라 정보 구조와 시각화 방식이 명확히 다른 방향이어야 한다. 예를 들어 Task Graph 중심, Team 중심, Timeline 중심, Command Center/HUD 중심, 개발도구형 Dashboard 중심 등의 차이를 검토한다.

최종 디자인은 5개 시안을 비교한 뒤 별도로 결정하며 현재 단계에서는 특정 디자인을 확정하지 않는다.

## 9. 예상 Workspace 구조

    AI Workspace Root
    |
    +-- .aegis/
    |   +-- config/
    |   |   +-- environments/
    |   |   |   +-- home.yaml
    |   |   |   +-- work.yaml
    |   |   +-- presets/
    |   |   |   +-- fast.yaml
    |   |   |   +-- balanced.yaml
    |   |   |   +-- deep.yaml
    |   |   +-- roles/
    |   |   +-- routing/
    |   |   +-- policies/
    |   +-- context/
    |   +-- runtime/
    |   |   +-- tasks/
    |   |   +-- sessions/
    |   |   +-- ownership/
    |   |   +-- events/
    |   |   +-- state/
    |   |   +-- reports/
    |   +-- dashboard/
    +-- AGENTS.md
    +-- CLAUDE.md
    +-- projects/

구체적인 구조와 데이터 포맷은 Runtime 상세 설계에서 확정한다.

## 10. 범위

### MVP

- Workspace Root 공통 Agent Team 환경
- Environment Profile: Home / Work
- Execution Preset: Fast / Balanced / Deep
- Dynamic Agent Team
- Role Pool
- Fast Path
- Task Graph
- Adaptive Parallelism
- Claude/Codex Routing
- Primary/Secondary Harness
- Task Context Package
- File Ownership
- Independent Review
- Retry/Fallback/Replanning
- Git SCM Adapter 기본 지원
- Perforce SCM Adapter 기본 지원
- 기본 실행 Report
- Control Center
- **Live Runtime Viewer**
- **실시간 Task Graph**
- **Live Team / Agent Status**
- **Agent Inspector**
- **Live Activity Event Stream**

### Later

- Git Agent별 Worktree 자동 생성
- Git Branch Isolation / 자동 Merge
- Perforce Agent별 Workspace Isolation
- Agent 실행 Timeline 고도화
- 상세 토큰/비용 분석
- Role별 Harness 성능 비교
- 과거 성능 기반 Harness 자동 Routing
- Agent 성능 학습
- 병렬화 전략 자동 최적화
- Task 유형별 최적 Team Pattern 학습
- 장기 실행 History 분석 Dashboard

### Out of Scope

- Claude/Codex 자체를 대체하는 AI Runtime 개발
- 자체 LLM 개발
- 모든 Agent를 항상 병렬 실행
- 무제한 Recursive Spawn
- 초기부터 완전한 Agent별 SCM Workspace 격리
- 초기부터 복잡한 중앙 서버 기반 Control Plane
- Agent 내부 Chain-of-Thought 전체 노출

## 11. 결정된 사항

- 프로젝트명은 Aegis다.
- Workspace Root 전체에 적용한다.
- 하위 프로젝트는 기본적으로 Aegis 운영 체계를 상속한다.
- Dynamic Agent Team을 사용한다.
- Lead는 필요하면 직접 구현한다.
- 구현과 Review는 원칙적으로 분리한다.
- Agent는 Ephemeral, Role과 Project Context는 지속 관리한다.
- Task Graph 기반 Adaptive Parallelism을 사용한다.
- Task Context Package로 Agent Context를 최소화한다.
- Team topology는 Lead가 통제한다.
- Claude + Codex Hybrid Agent Team을 최종 방향으로 한다.
- Home은 Codex Primary + Claude Secondary + Git이다.
- Work는 Claude Primary + Codex Secondary + Perforce다.
- Primary/Secondary 및 Role별 Harness Preference는 설정으로 변경 가능하다.
- Environment와 Execution Preset을 분리한다.
- Balanced를 기본 Preset으로 한다.
- SCM 차이는 Adapter로 추상화한다.
- MVP는 동일 Workspace + File Ownership을 기본으로 한다.
- Git은 필요 시 Worktree Isolation으로 확장한다.
- Perforce는 Pending Changelist를 활용하고 Agent별 Workspace Isolation은 Later다.
- 실패 시 Retry/Fallback/Replanning을 사용한다.
- Control Center는 설정뿐 아니라 Runtime 관제 기능을 담당한다.
- Live Runtime Viewer는 부가기능이 아니라 Aegis의 핵심 UX이며 MVP에 포함한다.
- Runtime Viewer는 Task Graph + Live Team + Inspector + Activity를 핵심 구조로 한다.
- UI는 세련된 개발도구/관제센터 스타일을 지향한다.
- 실제 디자인 단계에서 서로 다른 디자인 시안을 최소 5개 제안받고 비교 후 최종안을 결정한다.
- Multi-Agent 자체가 아니라 사용자 개입 감소, 작업시간, 품질 향상을 성공 기준으로 삼는다.

## 12. 미결정 사항

Runtime/UX 상세 설계에서 다음을 결정한다.

- Task Graph 데이터 Schema
- Runtime Event Schema
- Task Context Package Schema
- Role 정의 Schema
- Agent ↔ Lead 통신 방식
- Claude/Codex Adapter 구조 및 세션 관리
- Harness 자체 Sub-Agent와 Aegis Agent의 경계
- Agent Result Format
- File Ownership 단위와 충돌 해결
- Git Worktree 전환 기준
- Perforce Pending Changelist 세부 정책
- Retry/Escalation/Fallback 기준
- Task Complexity/Fast Path 분류 기준
- Preset별 Agent/Parallel 제한
- Project Context 저장/갱신 정책
- Control Center와 설정 파일 동기화 방식
- Runtime State Store 구현 방식
- Viewer 실시간 갱신 방식(file-watch, IPC, local service 등)
- 전체 진행률 계산 방식
- Agent별 Task Checkpoint 표현 방식
- 5개 디자인 시안 중 최종 UX/UI 방향

## 13. 위험 요소 및 대응

### Agent 증가로 인한 토큰 낭비

Fast Path, Dynamic Team, Context 최소화, Max Agent/Parallel 제한과 실행 지표 기록으로 대응한다.

### 병렬 수정 충돌

Task Graph 단계에서 수정 영역을 분석하고 File Ownership을 사용한다. 필요 시 SCM Isolation으로 확장한다.

### Orchestration 비용 증가

Trivial/Small Fast Path를 두고 Task를 지나치게 세분화하지 않는다. 실제 실행 데이터를 기반으로 정책을 개선한다.

### 잘못된 병렬화

Dependency를 명시한 Task Graph와 Adaptive Parallelism을 사용하고 Lead가 최종 Validation한다.

### Claude/Codex 기능 차이

공통 Role/Task 규격과 Harness Adapter를 사용하고 Harness 특화 기능은 Adapter 내부에서 활용한다.

### Viewer가 실제 상태와 달라지는 문제

Runtime State와 Event를 UI가 추정하지 않고 Runtime이 명시적으로 발행하도록 설계한다. 상태 전이와 Event Schema를 Runtime 상세 설계의 핵심 계약으로 정의한다.

### 과도한 시각화

내부 reasoning이나 모든 로그를 화면에 노출하지 않고 사용자가 판단하는 데 필요한 Task/Agent/Dependency/Blocker/Event 중심으로 표현한다.

## 14. 단계별 구현

### Phase 1 — Prototype

- Workspace 기본 구조
- Environment/Role 정의
- 기본 Lead Workflow
- Task Context Package Prototype
- 단순 Claude/Codex Routing 기술 검증
- Runtime State/Event Prototype
- **가짜 Runtime 데이터 기반 Live Viewer UI Prototype**
- **서로 다른 Live Viewer 디자인 시안 5개 비교**

UI Prototype을 비교적 일찍 수행하여 사용자가 실제로 보고 싶은 상태 정보를 확인하고, 이를 Runtime Event/State 설계에 역으로 반영한다.

### Phase 2 — MVP

- Dynamic Team
- Task Graph
- Adaptive Parallelism
- Fast Path
- Hybrid Claude/Codex Routing
- File Ownership
- Git/Perforce Adapter
- Review
- Retry/Fallback
- Report
- Control Center
- Live Runtime Viewer 실제 Runtime 연결

### Phase 3 — Operational Improvement

- 실행 History
- Token/Time 분석
- Harness별 성능 비교
- Timeline/Task Graph 고도화
- SCM Isolation 고도화

### Phase 4 — Adaptive Aegis

- Role별 최적 Harness 자동 선택
- Task별 최적 Agent 수 추천
- 병렬화 수준 자동 조정
- Team Pattern 학습
- 비용/속도/품질 기반 Routing

## 15. 다음 작업

### 1순위 — Aegis Runtime 상세 설계

Task, Task Graph, Agent, Role, Context Package, Result, Review, Ownership, Session, Runtime State, Runtime Event, Report의 Schema와 상태 흐름을 설계한다.

### 2순위 — Live Runtime Viewer UX/UI 기획

가짜 Runtime 데이터를 사용하여 **정보 구조와 시각화 방식이 서로 다른 디자인 시안 5개 이상**을 제작·비교한다. 단순 테마 변형이 아닌 Task Graph 중심, Team 중심, Timeline 중심, Command Center/HUD 중심, 개발도구 Dashboard 중심 등 실질적으로 다른 접근을 제안받는다.

선택된 시안을 기반으로 Runtime에서 반드시 제공해야 하는 State/Event 정보를 확정한다.

### 3순위 — Claude/Codex Harness 기술 검증

Agent 생성, Sub-Agent, 병렬 실행, Session 유지/Resume, Context 전달, 결과 수집, 외부 Orchestrator 연동 가능성을 검증한다.

### 4순위 — SCM Adapter 상세 설계

Git의 File Ownership/Worktree/Branch/Merge와 Perforce의 File Ownership/Pending Changelist/Reconcile/Workspace Isolation을 공통 인터페이스로 설계한다.

### 5순위 — Prototype 구현

실제 작업 하나를 Aegis 방식으로 수행하여 기존 단독 Claude/Codex 방식과 작업시간, 사용자 개입, 검증 품질, 관찰 가능성을 비교한다.
