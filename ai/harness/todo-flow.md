---
title: TODO Flow
category: harness
tags:
  - ai
  - agent
  - coding-agent
  - harness
  - claude-code
  - codex
  - git-worktree
source: https://github.com/JakeB-5/todo-flow
updated: 2026-09-26
---

# TODO Flow

> 선택한 TODO를 영속적인 작업 상태로 만들고, Claude/Codex 같은 교체 가능한 코딩 에이전트가 독립 worktree에서 병렬 구현·검증·리뷰·landing까지 수행하도록 연결하는 파일 기반 Coding Agent Harness.

## 프로젝트 개요

TODO Flow는 일반적인 TODO 관리 도구가 아니라 코딩 에이전트의 작업을 세션 밖에서 지속시키기 위한 실행 하네스다.

사용자는 작업을 review 가능한 TODO/track 문서로 등록하고 실행할 track을 선택한다. 이후 엔진이 각 track을 별도 Git worktree에 배치하고 worker에게 bounded task를 할당한다. 결과는 검증되고 별도 reviewer가 후보 변경을 평가한다. landing 권한을 명시한 경우에만 통합과 후속 triage까지 진행한다.

현재 공개 버전은 v0.0.4이며 Python 3.11+, uv, Git, 인증된 Claude 또는 Codex CLI를 요구한다. GitHub issue/PR 연동에는 gh 인증이 추가로 필요하다.

## 해결하려는 문제

일반적인 코딩 에이전트 세션은 다음 문제가 있다.

- 대화 세션이 끝나면 작업 상태와 판단 근거를 다시 복원하기 어렵다.
- 여러 독립 작업을 동시에 수행할 때 어떤 agent가 무엇을 수행 중인지 추적하기 어렵다.
- 구현 결과와 검증 결과, review 근거가 서로 분리되거나 세션 로그 안에 묻힌다.
- 여러 agent가 같은 checkout을 공유하면 변경 충돌과 오염 위험이 커진다.
- 구현 agent가 자신의 결과를 스스로 검증·승인하면 독립적인 review 경계가 약하다.

TODO Flow는 작업 상태, claim, 결과, decision, verification, finding 등을 파일로 영속화하고 worktree와 worker/reviewer 역할을 분리하여 이 문제를 해결하려 한다.

## 핵심 기능

### 1. Reviewable TODO / Track

HTML 또는 Markdown으로 작업 계획을 등록한다. 목표, 범위, evidence, acceptance condition을 실행 전에 사람이 검토할 수 있다.

### 2. 선택 기반 실행

기본 흐름은 다음과 같다.

```text
todo
  ↓
trackpicks
  ↓
사용자 선택
  ↓
trackrun
  ↓
watchlist / 후속 TODO
```

`trackpicks`는 추천만 수행하며 worker를 자동 시작하지 않는다. 실제 실행은 사용자가 선택한 track ID를 `trackrun`에 전달할 때 시작된다.

### 3. 병렬 Worktree

서로 다른 track은 별도의 Git worktree에서 실행된다. 하나의 driver에서 기본 동시 task 수는 2개이며 `--jobs N`으로 조정할 수 있다.

### 4. Replaceable Worker

Claude와 Codex CLI를 기본 worker adapter로 사용할 수 있다. worker는 구현 checkout에서 작업하며 결과를 JSON proposal로 반환한다.

worker protocol 2에서는 프로젝트 전체 소스를 stdin에 밀어 넣지 않는다. 대신 workspace와 evidence/document 경로를 전달하고 agent가 필요한 파일을 직접 검색/읽는다.

### 5. 검증과 독립 Review

엔진은 worker proposal을 적용한 뒤 실제 verification command를 실행한다. review worker는 구현 worker와 분리된 fresh read-only session으로 후보 변경, diff, verification evidence를 평가한다.

v0.0.4에서는 verification/review 전에 checkout이 정확한 candidate HEAD이고 clean 상태인지 확인하는 경계가 강화되었다.

### 6. Landing / Triage

기본 `trackrun`은 review 단계에서 멈춘다. landing을 명시적으로 허용한 경우에만 integration, issue/PR 처리, post-landing triage까지 진행한다.

### 7. Durable State

SQLite DB가 canonical state가 아니다. 파일 시스템이 authoritative source다.

```text
todo/
├── config/1.json
├── tracks/<id>/
│   ├── track.html
│   ├── source.md
│   ├── state.json
│   ├── assets/
│   └── revisions/
├── tasks/
├── attempt-records/
├── results/
├── decisions/
├── events/
├── effects/
├── findings/
├── triages/
├── watches/
└── attempts/
```

`.cache/query.sqlite`는 삭제 가능한 query cache일 뿐 canonical work를 보관하지 않는다.

### 8. Dashboard

로컬 dashboard에서 TODO, 실행 중 worker, decision wait, evidence, 완료 archive 등을 확인한다. 한국어/영어 UI를 지원한다.

## 아키텍처

```text
                    ┌──────────────────┐
                    │ User / Dashboard │
                    └────────┬─────────┘
                             │ select
                             ▼
┌──────────────┐     ┌───────────────┐
│ TODO / Track │────▶│ trackrun      │
│ HTML / MD    │     │ Driver/Engine │
└──────────────┘     └───────┬───────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌────────────┐ ┌────────────┐ ┌────────────┐
       │ Worktree A │ │ Worktree B │ │ Worktree N │
       │ Worker     │ │ Worker     │ │ Worker     │
       │ Claude/    │ │ Claude/    │ │ Claude/    │
       │ Codex      │ │ Codex      │ │ Codex      │
       └─────┬──────┘ └─────┬──────┘ └─────┬──────┘
             └───────────────┼───────────────┘
                             ▼
                    ┌────────────────┐
                    │ JSON Proposal  │
                    └───────┬────────┘
                            ▼
                    ┌────────────────┐
                    │ Engine applies │
                    │ bounded writes │
                    └───────┬────────┘
                            ▼
                    ┌────────────────┐
                    │ Verification   │
                    └───────┬────────┘
                            ▼
                    ┌────────────────┐
                    │ Independent    │
                    │ Review Agent   │
                    └───────┬────────┘
                            ▼
              ┌─────────────┴─────────────┐
              │ default: stop at review   │
              │ authorized: land + triage │
              └───────────────────────────┘

       모든 상태/증거/결정/attempt → todo/ 파일에 영속화
```

핵심 설계 포인트는 LLM 자체가 repository를 직접 통제하는 것이 아니라, worker가 proposal을 반환하고 엔진이 허용된 write boundary 안에서 적용·검증·commit·외부 effect를 처리한다는 점이다.

## 장점

### 세션 독립성

작업 상태가 채팅 history가 아니라 파일에 남는다. agent나 세션을 교체해도 track 문서, attempt, result, decision, evidence를 통해 복구할 수 있다.

### 병렬 작업 격리

track별 Git worktree를 사용하므로 독립 작업의 checkout 충돌을 줄인다.

### 구현과 리뷰 분리

구현 worker와 review worker를 분리하고 exact candidate에 verification evidence를 묶는 구조는 단순 multi-agent fan-out보다 delivery 품질 관리에 유리하다.

### Context 효율 구조

protocol 2는 source 전체를 prompt/stdin으로 수집하지 않고 경로와 탐색 힌트를 전달한다. agent가 필요한 소스를 직접 검색하기 때문에 큰 코드베이스에서 불필요한 초기 context 주입을 줄일 가능성이 있다.

단, 실제 token 절감률에 대한 공개 benchmark는 확인되지 않았다.

### 사람이 실행 경계를 통제

추천과 실행이 분리되고 landing은 별도 authorization이 필요하다. 완전 자율 agent보다 사람이 작업 선택과 merge 경계를 유지하기 쉽다.

## 단점 및 한계

### 매우 초기 단계

2026-09-26 조사 기준 공개 release는 v0.0.4다. API/상태 형식/운영 방식의 변화 가능성을 고려해야 한다.

### Windows 미지원

공식 운영 문서에서 Windows는 현재 지원 범위 밖이라고 명시한다. Windows 중심 개발 환경에서는 즉시 도입하기 어렵다.

### Git 중심 구조

격리와 landing이 Git worktree/branch/commit을 중심으로 설계되어 있다. Perforce 같은 비-Git SCM에는 직접 적용할 수 없다.

### 여러 저장소 통합 한계

현재 여러 repository를 함께 merge하는 workflow는 지원 범위 밖이다.

### 운영 복잡도

driver, dashboard, worktree, worker process, claims, leases, attempts, verification, reviewer, landing 상태를 관리한다. 단일 agent 세션보다 구성 요소가 많다.

### 비용 증가 가능성

병렬 worker와 독립 reviewer를 사용하므로 모델 호출량은 단일-agent 방식보다 증가할 수 있다. Context 전달 효율과 전체 token 비용을 별도로 측정해야 한다.

### 성능 주장 주의

README의 "up to 33×"는 이 패키지에 대한 통제된 생산성 benchmark가 아니다. 프로젝트도 선행 workflow에서 관찰한 commit activity이며 노동 생산성 multiplier가 아니라고 명시한다. 공개된 source material도 식별 가능하게 제공되지 않았다.

## 활용 사례

- 서로 독립적인 여러 기능/버그를 Claude와 Codex에 병렬 할당
- 장시간 또는 여러 세션에 걸친 agent coding 작업
- 구현 agent와 review agent를 분리한 자동 코드 리뷰
- 작업별 verification evidence가 필요한 repository
- 사람이 TODO 선택권을 유지하면서 execution만 agent에게 위임하는 환경
- agent 실행 실패 후 durable state에서 재개해야 하는 workflow

반대로 짧은 단일 수정, Windows 전용 환경, Git을 사용하지 않는 프로젝트, agent 병렬화가 필요 없는 작은 작업에는 구조가 과할 수 있다.

## 기존 방식과 비교

| 관점 | 일반 Claude/Codex 세션 | TODO Flow |
|---|---|---|
| 작업 상태 | 대화/세션 중심 | 파일 기반 durable state |
| 병렬화 | 수동 세션 관리 | track + worktree |
| checkout 격리 | 사용자가 관리 | track별 worktree |
| 구현/리뷰 | 동일 세션 가능 | 독립 reviewer 구조 |
| 검증 증거 | 로그에 흩어질 수 있음 | candidate에 연결해 보관 |
| 세션 교체 | context 재구성 필요 | 파일 상태에서 복구 |
| 실행 통제 | prompt 중심 | select/run/landing 경계 |
| agent | 특정 CLI 세션 | replaceable adapter |

## 활용 아이디어

### 바로 적용 가능

Git 기반 개인 프로젝트에서 독립 TODO 2~3개를 Claude/Codex로 병렬 처리하는 실험에는 바로 적용해볼 수 있다.

특히 "계획을 먼저 검토하고 실행은 선택한 작업만 수행한다"는 흐름은 무분별한 autonomous execution을 막는 좋은 패턴이다.

### PoC 가치 있음

기존 Coding Agent Harness를 설계할 때 다음 요소를 별도로 벤치마크할 가치가 있다.

1. file-backed durable state
2. worktree-per-task 격리
3. path-based context handoff
4. worker와 reviewer 분리
5. exact candidate verification
6. landing authorization gate
7. interrupted session recovery

평가 지표는 completion time만 보지 말고 token usage, 재시작 복구시간, merge conflict, verification 실패율, review defect 발견률까지 포함하는 것이 적절하다.

### 아이디어 참고

TODO Flow의 가장 흥미로운 부분은 UI가 아니라 **agent가 교체되어도 작업이 계속되는 상태 프로토콜**이다.

Agent Harness를 설계할 때 세션 자체를 durable하게 만들기보다 다음처럼 보는 접근이 유용하다.

```text
Agent = disposable executor
State = durable files
Workspace = isolated checkout
Evidence = candidate-bound artifact
Review = independent stage
Landing = explicit capability
```

이 구조는 특정 모델에 workflow를 종속시키지 않는 방향과 잘 맞는다.

### 현재 도입 가치 낮음

Perforce 기반 대형 프로젝트나 Windows-only 환경에 그대로 도입하는 것은 현재 적합하지 않다. 이 경우 TODO Flow 자체보다 durable state, task isolation, reviewer separation 같은 설계 패턴을 가져오는 편이 현실적이다.

## 결론

TODO Flow는 TODO manager라기보다 **파일 기반 상태 머신 + Git worktree + 교체 가능한 coding agent + verification/review gate**를 결합한 작은 Coding Agent Harness다.

특히 세션을 지속시키는 대신 **상태와 증거를 세션 밖으로 빼서 agent를 disposable하게 만드는 접근**이 핵심 인사이트다.

현재 v0.0.4로 성숙도는 낮고 Windows/비-Git 환경 제약이 크므로 즉시 표준 도구로 채택하기보다는 Git 기반 소규모 프로젝트에서 PoC하고, architecture pattern을 기존 harness 설계에 반영할 가치가 높다.

## 참고 자료

- https://github.com/JakeB-5/todo-flow
- https://github.com/JakeB-5/todo-flow/blob/main/README.md
- https://github.com/JakeB-5/todo-flow/blob/main/OPERATIONS.md
- https://github.com/JakeB-5/todo-flow/blob/main/UPDATES.md
- https://github.com/JakeB-5/todo-flow/releases/tag/v0.0.4
