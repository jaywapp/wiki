# GSD Core vs Superpowers

> AI Coding Agent 개발 방법론 / 워크플로 비교

## 한 줄 요약

- **GSD Core**: 큰 개발 작업을 Phase/Milestone 단위로 나누고, 상태와 컨텍스트를 파일로 유지하면서 끝까지 운영하는 **프로젝트 실행 프레임워크**
- **Superpowers**: 코딩 에이전트가 설계·TDD·디버깅·리뷰를 어떤 규칙으로 수행해야 하는지 강제하는 **Skill 기반 개발 방법론**

즉, 둘은 경쟁 관계이면서도 초점이 다르다.

```text
GSD Core     = Project / Context Orchestration
Superpowers  = Engineering Discipline / Skills Workflow
```

## 공통점

둘 다 단순 프롬프트 모음보다 한 단계 높은 AI 개발 워크플로다.

공통적으로 다음을 강조한다.

- 바로 코딩하지 않고 먼저 요구사항/설계를 정리
- 구현 계획을 작은 작업으로 분해
- Subagent를 활용한 분업
- 구현 결과 검증
- Claude Code 외 Codex 등 여러 Coding Agent 지원
- 장시간 Agent 작업에서 품질 저하를 줄이려는 목적

## 핵심 차이

| 항목 | GSD Core | Superpowers |
|---|---|---|
| 중심 철학 | Context Engineering / Spec-driven Development | Engineering Discipline / Skill-driven Development |
| 운영 단위 | Project → Milestone → Phase → Plan | Design → Plan → Task → Skill |
| 핵심 문제 | Context Rot, 장기 프로젝트 상태 유지 | Agent가 즉흥적으로 코딩/디버깅하는 문제 |
| 컨텍스트 관리 | 매우 강함. 상태 파일 + fresh-context subagent | Subagent를 활용하지만 프로젝트 상태 파일 체계가 핵심은 아님 |
| 상태 지속성 | 강함 (`STATE.md`, `CONTEXT.md` 등) | 상대적으로 약함 |
| TDD | 필수 철학은 아님 | 매우 강함. RED-GREEN-REFACTOR를 기본 원칙으로 강제 |
| 디버깅 | 전체 Verify 단계 중심 | `systematic-debugging` 등 전용 Skill 제공 |
| 코드 리뷰 | Phase/Verify 관점 | Task 단위 spec review + code quality review가 강함 |
| Git Worktree | 핵심 철학은 아님 | 기본 Workflow에 `using-git-worktrees` 포함 |
| 사용 방식 | `/gsd-*` 명령 중심의 명시적 Workflow | 관련 Skill이 상황에 따라 자동 활성화 |
| 프로세스 강도 | 프로젝트 관리 측면에서 무거움 | 코딩 규율 측면에서 강제성이 강함 |
| 적합한 규모 | 중대형 Feature / 장기 프로젝트 | 작은 Feature부터 중대형 Feature까지 |

## GSD Core Workflow

```text
Discuss
  ↓
Plan
  ↓
Execute
  ↓
Verify
  ↓
Ship
```

GSD Core의 가장 큰 특징은 **Context Rot 대응**이다.

무거운 리서치, 계획, 실행을 fresh-context subagent에 맡기고 메인 세션은 가볍게 유지한다. 프로젝트 상태는 구조화된 파일에 기록해 세션 경계를 넘어 이어간다.

따라서 다음과 같은 작업에 특히 적합하다.

```text
대규모 기능 개발
→ 여러 Phase로 분해
→ 며칠/여러 세션 동안 작업
→ 각 Phase별 계획/실행
→ 상태 저장
→ 최종 Verify/Ship
```

## Superpowers Workflow

기본 흐름은 다음에 가깝다.

```text
Brainstorming
  ↓
Design Approval
  ↓
Git Worktree
  ↓
Writing Plan
  ↓
Subagent-driven Development
  ↓
TDD
  ↓
Code Review
  ↓
Finish Branch
```

Superpowers는 여러 개의 독립적인 Skill이 개발 행동을 제어한다.

주요 Skill 예:

- `brainstorming`
- `writing-plans`
- `using-git-worktrees`
- `subagent-driven-development`
- `executing-plans`
- `test-driven-development`
- `systematic-debugging`
- `verification-before-completion`
- `requesting-code-review`
- `receiving-code-review`
- `finishing-a-development-branch`

특히 TDD에 매우 강한 입장을 취한다.

```text
RED
→ GREEN
→ REFACTOR
```

테스트보다 구현 코드를 먼저 작성하는 것을 허용하지 않는 수준으로 규율이 강하다.

## GSD Core 장점

### 1. 장기 프로젝트에 강함

여러 세션/여러 날에 걸친 작업에서도 상태를 구조화해서 유지하기 좋다.

### 2. Context Rot 대응이 명확함

큰 컨텍스트 하나에 모든 작업을 쌓지 않고 fresh-context subagent를 적극적으로 사용한다.

### 3. 프로젝트 전체를 관리하기 좋음

Feature 하나가 아니라 Roadmap/Milestone/Phase 단위로 AI 개발을 운영하기 좋다.

### 4. 구현 방식에 비교적 덜 독선적

Superpowers처럼 TDD를 절대 규칙으로 강제하는 것이 핵심은 아니다.

## GSD Core 단점

### 1. 작은 작업에는 과함

간단한 버그 수정이나 작은 UI 수정도 GSD 전체 흐름으로 처리하면 오버헤드가 커질 수 있다.

### 2. 관리 Artifact가 많음

상태/계획/컨텍스트 문서를 계속 유지하기 때문에 저장소에 관리 파일이 늘어난다.

### 3. 사용자가 Workflow를 이해해야 함

`/gsd-*` 명령과 Phase 개념을 이해해야 효율이 올라간다.

## Superpowers 장점

### 1. 코드 품질 규율이 강함

TDD, systematic debugging, verification, review가 명확한 규칙으로 제공된다.

### 2. Skill이 자동으로 개입

사용자가 매번 명령어를 기억하지 않아도 관련 Skill이 자동 활성화되는 구조다.

### 3. Task 단위 검증이 강함

Subagent가 구현한 뒤 spec compliance와 code quality를 별도로 검토하는 방식이 강력하다.

### 4. 작은 Feature에도 적용하기 쉬움

전체 프로젝트 관리 프레임워크보다 개발 행동을 제어하는 Skill 중심이라 단일 Feature에도 적용하기 편하다.

## Superpowers 단점

### 1. 상당히 Opinionated

특히 TDD에 대한 강제성이 매우 높다.

기존 프로젝트가 테스트 중심 개발이 아니거나 테스트 작성 비용이 큰 환경에서는 마찰이 발생할 수 있다.

### 2. 작업이 장황해질 수 있음

작은 변경에도 brainstorming → plan → test → review 등의 절차가 개입하면 속도가 떨어질 수 있다.

### 3. 장기 프로젝트 상태 관리가 GSD만큼 강하지 않음

Task 실행 규율은 뛰어나지만 Milestone/Phase/STATE 기반의 장기 프로젝트 운영은 GSD Core 쪽이 더 전문적이다.

## 어떤 것을 선택할까

### GSD Core가 더 좋은 경우

- 며칠 이상 이어지는 큰 작업
- 여러 Phase로 쪼개야 하는 Feature
- Agent 세션이 길어지면서 품질이 떨어지는 문제가 있음
- Codex/Claude Code에 프로젝트를 장시간 맡기고 싶음
- Context와 프로젝트 상태를 구조적으로 관리하고 싶음

### Superpowers가 더 좋은 경우

- 코드 품질과 개발 규율이 우선
- TDD를 적극적으로 사용
- 버그 수정/Feature 구현을 체계화하고 싶음
- Agent가 성급하게 코딩하거나 추측성 디버깅을 하는 것이 문제
- Task 단위 리뷰와 검증을 강화하고 싶음

## 추천

둘 중 하나만 고른다면 목적에 따라 결정한다.

```text
장기 Agent 운영 / Context 관리  → GSD Core
코딩 품질 / TDD / Debugging 규율 → Superpowers
```

개인적으로는 **큰 프로젝트를 AI에게 위임하는 것이 주 목적이면 GSD Core를 우선 검토**하고, 코딩 품질 통제가 더 중요하다면 Superpowers가 적합하다.

둘의 아이디어를 조합하는 것도 가능하다.

```text
GSD Core
  └─ Phase / Context / State 관리
       └─ Implementation
            ├─ TDD
            ├─ Systematic Debugging
            └─ Code Review
                ↑
          Superpowers 방식
```

다만 두 프레임워크를 그대로 동시에 설치하면 명령/Skill/Agent orchestration 규칙이 충돌할 수 있으므로, 병행 사용보다는 한쪽을 기본 프레임워크로 정하고 다른 쪽의 좋은 Skill/규칙만 가져오는 편이 안전하다.

## 링크

- GSD Core: https://github.com/open-gsd/gsd-core
- Superpowers: https://github.com/obra/superpowers

## 관련 문서

- [GSD Core](./gsd-core.md)
