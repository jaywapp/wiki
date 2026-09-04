- Status: Idea
- Version: 0.1
- Created: 2026-09-04
- Updated: 2026-09-04
- Tags: claude-code, multi-agent, orchestrator, workspace, automation, deployment

# Claude Workspace Orchestrator

## 1. 한 줄 요약

회사 워크스페이스의 `root`에서 실행되는 Main Claude를 단일 대화 창구이자 Orchestrator로 두고, `src/<project>`별로 장기 실행 중인 Claude 세션과 통신해 개발 작업을 분배하며, 별도 Deploy Agent가 `release` 배포 경로를 전담하는 멀티에이전트 작업 환경을 구성한다.

## 2. 배경 및 문제

현재 회사 워크스페이스는 다음과 같은 구조를 사용한다.

```text
root/
├─ src/
│  ├─ project1/
│  ├─ project2/
│  └─ project3/
├─ release/
└─ docs/
```

실제 개발은 `src/<project>`에서 진행하고, 배포 대상은 `release` 경로에 반영한다.

프로젝트마다 Claude를 별도로 실행하면 각 세션이 해당 프로젝트의 코드와 맥락을 집중적으로 유지할 수 있지만, 사용자가 여러 세션을 직접 오가며 작업을 지시하고 상태를 확인해야 하는 문제가 생긴다.

이를 해결하기 위해 사용자는 `root`에서 실행되는 하나의 Main Claude에게 비서에게 말하듯 요청하고, Main Claude가 적절한 프로젝트 세션을 찾아 작업을 위임하고 결과를 취합하는 구조를 만든다.

## 3. 목표

- 사용자가 프로젝트별 Claude 세션을 직접 전환하지 않고 `root`의 Main Claude 하나와 대화하도록 한다.
- 각 프로젝트 Claude가 자신의 프로젝트 코드와 이전 작업 맥락을 지속적으로 유지하도록 한다.
- 여러 프로젝트에 걸친 요청을 Main Claude가 분석하고 작업 단위로 분해해 각 담당 세션에 전달한다.
- 개발과 배포 책임을 분리해 Project Agent가 `release`를 직접 관리하지 않도록 한다.
- Main Claude가 전체 작업 진행 상태와 결과를 취합해 사용자에게 일관된 형태로 보고하도록 한다.

## 4. 대상 사용자

### 주요 사용자

회사 로컬 개발 환경에서 여러 프로젝트를 동시에 관리하며 Claude를 개발 도구로 사용하는 개발자.

### 핵심 요구

- 여러 Claude 세션을 직접 관리하는 부담을 줄이고 싶다.
- 자연어 한 번으로 적절한 프로젝트에 작업을 전달하고 싶다.
- 각 프로젝트 세션이 장기적으로 프로젝트 맥락을 유지하기를 원한다.
- 프로젝트 간 연관 작업도 하나의 요청으로 처리하고 싶다.
- 배포 작업은 개발 작업과 분리해 관리하고 싶다.

## 5. 핵심 아이디어

전체 구조는 `Main Orchestrator + Persistent Project Agents + Deploy Agent`로 구성한다.

```text
User
 │
 ▼
Main Claude @ root
비서 / Orchestrator
 │
 ├──────────────┬──────────────┐
 ▼              ▼              ▼
Project1       Project2       Project3
Claude         Claude         Claude
 │              │              │
 ▼              ▼              ▼
src/project1   src/project2   src/project3

               +
               │
               ▼
          Deploy Agent
               │
               ▼
            release/
```

Main Claude는 실제 프로젝트 구현보다는 요청 해석, 대상 프로젝트 선택, 작업 분해, 위임, 진행 상태 관리, 결과 취합을 담당한다.

각 Project Agent는 `src/<project>`에서 장기 실행되는 Claude 세션으로 동작하며 자신의 프로젝트에 대한 분석, 구현, 수정, 테스트를 담당한다.

Deploy Agent는 `root` 하위의 배포 전담 서브 에이전트로 두고 `release` 경로에 대한 반영과 배포 작업을 담당한다.

## 6. 주요 사용 흐름

### 단일 프로젝트 작업

1. 사용자가 Main Claude에 자연어로 작업을 요청한다.
2. Main Claude가 요청 대상 프로젝트를 판단한다.
3. 해당 `src/<project>`에서 실행 중인 Project Agent에 작업을 전달한다.
4. Project Agent가 분석, 구현, 수정, 테스트를 수행한다.
5. Project Agent가 결과와 상태를 Main Claude에 반환한다.
6. Main Claude가 결과를 요약해 사용자에게 보고한다.

예:

```text
사용자: project1 로그인 오류 수정해줘.

Main Claude
  → Project1 Agent에 작업 전달
  → Project1 Agent 분석/수정/테스트
  → 결과 수신
  → 사용자에게 변경 내용과 결과 보고
```

### 여러 프로젝트에 걸친 작업

1. 사용자가 하나의 요청으로 여러 프로젝트에 영향을 주는 작업을 지시한다.
2. Main Claude가 요청을 프로젝트별 하위 작업으로 분해한다.
3. 각 Project Agent에 필요한 작업을 전달한다.
4. 각 결과를 수집하고 필요하면 작업 순서를 조정한다.
5. 전체 작업 결과를 사용자에게 통합 보고한다.

예:

```text
Parent Task
├─ Project1 Task
│  └─ 기능 구현
└─ Project2 Task
   └─ API 변경 대응
```

### 배포 포함 작업

1. Project Agent가 개발 및 테스트를 완료한다.
2. Main Claude가 작업 완료 상태를 확인한다.
3. 배포 요청이 포함된 경우 Deploy Agent에 배포 작업을 전달한다.
4. Deploy Agent가 필요한 결과물을 확인하고 `release`에 반영한다.
5. 배포 결과를 Main Claude에 반환한다.
6. Main Claude가 개발 및 배포 결과를 사용자에게 최종 보고한다.

## 7. 핵심 기능

### Main Orchestrator

**설명**  
`root`에서 실행되는 사용자와의 단일 대화 창구다.

**필요한 이유**  
사용자가 프로젝트별 Claude 세션을 직접 오가며 지시하고 결과를 취합하는 부담을 제거하기 위해 필요하다.

**주요 역할**

- 사용자 자연어 요청 해석
- 관련 프로젝트 판단
- 작업 분해 및 순서 결정
- Project Agent 선택 및 작업 전달
- 여러 Agent의 진행 상태 확인
- 결과 취합 및 사용자 보고
- 필요 시 Deploy Agent 호출

### Persistent Project Agent

**설명**  
각 `src/<project>`에서 실행되는 프로젝트 전담 Claude 세션이다.

**필요한 이유**  
매 작업마다 새 Claude 세션을 생성하는 대신, 프로젝트의 코드 구조와 이전 작업 맥락을 지속적으로 유지하기 위해 필요하다.

**주요 역할**

- 담당 프로젝트 분석
- 코드 구현 및 수정
- 테스트 및 검증
- 작업 상태 및 결과 반환

초기 방향은 가능한 경우 프로젝트 세션을 업무 시간 동안 유지하는 장기 실행 세션으로 운영하는 것이다.

### Deploy Agent

**설명**  
`root` 하위에서 동작하며 `release` 경로와 배포 작업을 전담하는 서브 에이전트다.

**필요한 이유**  
개발과 배포의 책임을 분리하고 Project Agent가 직접 배포 영역을 관리하지 않도록 하기 위해 필요하다.

**주요 역할 후보**

- 개발 결과물 확인
- 배포 전 검증
- `release` 반영
- 배포 실행
- 배포 결과 확인 및 보고

세부 배포 정책과 실제 권한 범위는 아직 미결정이다.

### 세션 식별 및 통신

**설명**  
Main Claude가 현재 실행 중인 Project Agent를 식별하고 작업을 전달하며 결과를 받을 수 있어야 한다.

**필요한 이유**  
전체 구조의 핵심은 새로운 Claude 프로세스를 반복 생성하는 것이 아니라 이미 실행 중인 프로젝트별 세션을 재사용하는 데 있기 때문이다.

구현 방식은 아직 결정하지 않았다. Claude Code가 제공하는 공식 세션, 서브에이전트, resume 기능 등을 먼저 검토하고, 부족할 경우 세션 레지스트리, 작업 큐, 파일/IPC 기반 메시징 등의 자체 계층을 추가하는 방향을 검토한다.

## 8. 범위

### MVP

- `root` Main Claude를 단일 사용자 인터페이스로 사용
- 프로젝트별 `src/<project>` Claude 세션 운영
- Main → Project Agent 작업 전달
- Project Agent → Main 결과 반환
- 단일 프로젝트 요청 처리
- 여러 프로젝트 요청의 기본 작업 분해 및 전달
- 별도 Deploy Agent 구성
- 프로젝트 세션 식별 및 최소 상태 관리

### Later

- 작업 큐 및 의존성 관리
- 세션 상태 자동 감지 (`idle`, `working`, `blocked`, `offline` 등)
- 작업 실패 시 재시도 또는 세션 resume
- 프로젝트별 동시 작업 제어
- 세션/작업 히스토리 저장
- 진행 중인 전체 작업 상태 시각화
- 사용자 승인 기반 배포 정책
- 작업 우선순위 및 스케줄링

### Out of Scope

- 초기 단계에서 모든 프로젝트의 완전 자동 배포
- Project Agent가 다른 프로젝트 또는 `release` 영역을 직접 관리하는 구조
- Claude 외 다른 모델/에이전트와의 통합

## 9. 결정된 사항

- 회사 워크스페이스는 `root/src`, `root/release`, `root/docs` 구조를 사용한다.
- 실제 개발 작업은 `src/<project>`에서 수행한다.
- 각 프로젝트별로 해당 프로젝트 경로에서 Claude 세션을 실행한다.
- `root`에서 실행되는 Main Claude가 사용자와 직접 대화하는 단일 창구가 된다.
- Main Claude는 사용자의 요청을 적절한 프로젝트 Claude 세션에 전달한다.
- 프로젝트별 Claude는 가능한 한 장기 실행 세션으로 운영하는 방향을 사용한다.
- 여러 프로젝트에 걸친 작업은 Main Claude가 작업을 분해하고 각 Project Agent에 전달한다.
- `release`는 개발 경로가 아니라 배포를 담당하는 경로다.
- `release` 관리는 `root` 하위의 별도 Deploy Agent가 담당한다.

## 10. 미결정 사항

- Main Claude와 이미 실행 중인 Project Claude 세션 간 실제 통신 방식
- Claude Code 공식 기능만으로 장기 실행 세션 제어가 가능한 범위
- 세션 레지스트리 필요 여부와 저장 형식
- 작업 큐 필요 여부와 구현 방식
- Agent 상태 모델 및 완료 판정 방식
- 세션이 종료되거나 중단된 경우 복구/resume 정책
- Project Agent가 동시에 여러 작업을 받을 수 있는지 여부
- 여러 프로젝트 작업의 의존성 및 순서 관리 방식
- Deploy Agent의 실제 배포 명령, 권한, 검증 및 실패 처리 정책
- Main Claude가 프로젝트 코드를 직접 수정할 수 있는 예외를 허용할지 여부
- 프로젝트 추가/삭제 시 Agent 등록을 자동화할지 여부

## 11. 다음 작업

1. 최신 Claude Code의 세션 관리, resume, 서브에이전트 및 에이전트 간 통신 관련 기능을 조사한다.
2. 공식 기능만으로 `Main → 기존 실행 세션 → 결과 반환` 흐름을 구현할 수 있는지 기술 검증한다.
3. 부족한 경우 최소한의 세션 레지스트리 및 IPC/메시지 전달 구조를 설계한다.
4. `project1` 하나와 Main Claude를 연결하는 최소 Prototype을 만든다.
5. Prototype에서 세션 유지, 작업 전달, 완료 감지, 오류 복구 가능성을 검증한다.
6. 검증 결과를 바탕으로 멀티 프로젝트와 Deploy Agent까지 확장한 MVP 아키텍처를 확정한다.
