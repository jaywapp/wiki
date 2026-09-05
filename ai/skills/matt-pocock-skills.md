---
title: Matt Pocock Skills
category: skills
tags:
  - ai
  - agent
  - skills
  - claude-code
  - codex
  - software-engineering
source: https://github.com/mattpocock/skills
updated: 2026-09-06
---

# Matt Pocock Skills

> AI 코딩 에이전트가 개발 프로세스 전체를 소유하게 하기보다, 기존 소프트웨어 엔지니어링 원칙을 작고 조합 가능한 Agent Skill로 제공하는 실전형 스킬 모음.

## 프로젝트 개요

Matt Pocock이 실제 개발에 사용하는 Agent Skills를 공개한 저장소다. 프로젝트는 GSD, BMAD, Spec-Kit처럼 전체 개발 프로세스를 프레임워크가 장악하는 방식과 거리를 두고, 개발자가 통제권을 유지하면서 필요한 규율만 선택적으로 조합하는 방식을 지향한다.

Claude Code에서는 플러그인 형태로 전체 세트를 관리형·읽기 전용으로 설치할 수 있고, Codex 및 기타 Agent에서는 `skills.sh` 계열 설치기를 통해 원하는 스킬 파일을 프로젝트에 복사해 수정할 수 있다. 두 설치 철학은 각각 자동 업데이트와 직접 커스터마이징에 초점이 있다.

## 해결하려는 문제

AI 코딩 에이전트 사용에서 반복되는 네 가지 실패 유형을 주로 다룬다.

1. 요구사항 정렬 실패: 사용자가 원하는 것을 Agent가 충분히 이해하지 못한 채 구현을 시작한다.
2. 과도한 설명과 컨텍스트 비용: 프로젝트 고유 용어를 모르기 때문에 장황한 표현과 불일치한 명명이 발생한다.
3. 피드백 루프 부족: 테스트·타입체크·실행 검증 없이 코드를 생성해 오류를 늦게 발견한다.
4. 코드베이스 엔트로피 증가: Agent의 높은 구현 속도가 나쁜 설계와 복잡도 증가까지 가속한다.

이 저장소는 이를 새로운 거대한 개발 방법론으로 해결하기보다 grilling, domain modeling, TDD, debugging, code review, architecture review 같은 기존 엔지니어링 규율을 Agent가 반복 실행할 수 있는 Skill로 만든다.

## 핵심 기능

### 요구사항 정렬

- `grill-me`: 계획이나 아이디어를 질문 중심으로 압박해 미결정 사항을 드러낸다.
- `grill-with-docs`: grilling과 domain-modeling을 함께 호출해 대화 중 프로젝트 용어와 ADR까지 정리한다.
- `to-spec`: 이미 논의된 대화를 실행 가능한 spec으로 변환한다.
- `to-tickets`: 계획/spec을 blocking 관계가 있는 작은 tracer-bullet ticket으로 분해한다.

### 구현 및 검증

- `implement`: spec/ticket 기반 구현을 진행하고 TDD, 정기적 typecheck/test, 마지막 code review를 연결한다.
- `tdd`: red-green-refactor 루프를 강제한다.
- `diagnosing-bugs`: 재현 → 최소화 → 가설 → 계측 → 수정 → 회귀 테스트의 단계적 디버깅 루프를 제공한다.
- `code-review`: 변경 사항을 Standards와 Spec 두 축으로 분리해 병렬 sub-agent가 검토한다.

### 설계 및 장기 유지보수

- `domain-modeling`: 프로젝트의 ubiquitous language와 domain model을 지속적으로 정제한다.
- `codebase-design`: deep module 중심의 설계 원칙과 공통 어휘를 제공한다.
- `improve-codebase-architecture`: 코드베이스에서 구조 개선 후보를 탐색하고 보고한다.
- `wayfinder`: 한 세션보다 큰 작업을 decision ticket과 blocking graph로 관리한다.

### 생산성

`handoff`, `teach`, `to-questionnaire`, `wait-what`, `writing-for-agents` 등 개발 외 Agent 협업을 위한 스킬도 제공한다.

## 아키텍처

이 프로젝트에서 중요한 구분은 **user-invoked skill**과 **model-invoked skill**이다.

```text
User
  |
  v
User-invoked Skill (orchestration)
  |   grill-with-docs / implement / to-spec / wayfinder ...
  |
  +----> Model-invoked Skill (reusable discipline)
          grilling
          domain-modeling
          tdd
          code-review
          codebase-design
          diagnosing-bugs
          research
          ...
                 |
                 v
       Repo context / CONTEXT.md / ADR / Issue Tracker / Tests
```

User-invoked skill은 명시적으로 호출하는 상위 workflow 역할을 하고, model-invoked skill은 사용자가 직접 부르거나 Agent가 상황에 맞춰 재사용할 수 있는 규율 역할을 한다. 상위 스킬이 다른 상위 스킬을 연쇄 호출하기보다는 하위 reusable discipline을 조합하도록 설계되어 있다.

예를 들어 `grill-with-docs`의 SKILL.md 자체는 매우 작고 `grilling`과 `domain-modeling` 두 스킬을 호출하도록 위임한다. 반면 `code-review`는 Standards와 Spec을 별도 sub-agent로 병렬 실행하고 결과를 다시 합치는 비교적 구체적인 orchestration을 정의한다.

## CONTEXT.md 접근

이 저장소의 특히 실용적인 아이디어는 Agent와 개발자가 공유하는 프로젝트 언어를 `CONTEXT.md`에 축적하는 것이다. 프로젝트 용어를 짧고 일관된 표현으로 정의하면 Agent 응답의 장황함을 줄이고, 변수·함수·파일 명명과 코드 탐색에도 동일한 언어를 사용할 수 있다.

단순한 토큰 절약 팁보다 중요한 점은 **domain vocabulary를 Agent의 장기적인 코드 이해 인터페이스로 사용한다는 것**이다.

## 장점

- 거대한 workflow framework를 도입하지 않고 필요한 규율만 선택할 수 있다.
- Markdown 기반 Skill이므로 특정 모델에 강하게 종속되지 않는다.
- Claude Code와 Codex 계열 모두 활용 가능한 구조를 지향한다.
- 요구사항 정렬 → 설계 → spec → ticket → 구현 → TDD → review까지 실제 개발 lifecycle을 넓게 다룬다.
- 기존 소프트웨어 공학 원칙을 Agent 시대에 재사용한다는 방향이 명확하다.
- CONTEXT.md/ADR/issue tracker를 통해 세션을 넘어 프로젝트 지식을 유지하는 패턴이 좋다.
- code review에서 Standards와 Spec을 별도 context의 병렬 Agent로 분리하는 방식은 review 관점 오염을 줄이는 데 유용하다.

## 단점 및 한계

- 스킬 수가 많아 전체 세트를 무작정 도입하면 사용자가 어떤 skill을 언제 호출해야 하는지 학습 비용이 생긴다.
- 일부 user-invoked skill은 다른 model-invoked skill에 의존한다. 필요한 의존 스킬이 빠지면 의도한 workflow가 깨질 수 있다.
- 2026-09 기준 open issue에는 단일 skill 설치 명령이 전체 스킬을 설치할 수 있다는 설치 관련 문제와 delegating skill의 prerequisite 문서화 문제 등이 보고되어 있다. 설치 방식은 최신 README/issue 상태를 확인하는 것이 안전하다.
- `implement` 같은 orchestration은 TDD seam이나 review 범위를 사전에 잘 합의하지 않으면 workflow 비용이 커질 수 있다.
- code-review의 병렬 sub-agent 사용은 품질상 장점이 있지만 token/API 비용과 실행 시간이 증가한다.
- GitHub/Linear/local issue tracker와 문서 구조를 연결하는 방식은 기존 Enterprise workflow와 충돌할 수 있으므로 사내 Perforce·TeamCity·Hansoft 환경에서는 adapter가 필요하다.
- Agent가 프로세스를 대신 판단하는 프레임워크가 아니라 개발자의 엔지니어링 판단을 보조하는 도구이므로, 좋은 설계 기준이 없는 팀에 자동으로 좋은 설계를 만들어 주지는 않는다.

## 활용 사례

### 기능 개발

```text
/grill-with-docs
      ↓
/to-spec
      ↓
/to-tickets
      ↓
/implement
      ↓
TDD + typecheck + tests
      ↓
/code-review
```

기능을 바로 코딩시키기 전에 요구사항과 domain language를 정리하고, 구현 단위를 잘게 나눈 뒤 피드백 루프를 유지하는 흐름이다.

### 난해한 버그

`diagnosing-bugs`를 통해 재현 가능한 실패 상태를 먼저 만들고 원인을 최소화한 후 계측과 회귀 테스트까지 연결할 수 있다. Agent가 추측으로 여러 파일을 동시에 고치는 패턴을 줄이는 데 적합하다.

### 오래된 코드베이스 개선

`improve-codebase-architecture`를 주기적으로 실행해 구조 개선 후보를 찾고, `codebase-design`과 `domain-modeling`을 함께 사용해 단순 리팩터링보다 module boundary와 domain vocabulary를 개선하는 방식으로 활용할 수 있다.

## 기존 도구와 비교

| 접근 | Matt Pocock Skills | GSD/BMAD/Spec-Kit 계열 |
|---|---|---|
| 철학 | 작은 규율을 선택·조합 | 전체 개발 프로세스 구조화 |
| 개발자 통제 | 높음 | 프레임워크 흐름 의존도가 상대적으로 높음 |
| 커스터마이징 | Skill 파일 단위로 쉬움 | workflow 구조 이해 필요 |
| 도입 범위 | 부분 도입 가능 | 전체 flow 도입 시 효과가 큼 |
| 핵심 가치 | Engineering discipline | Process orchestration |

직접 경쟁이라기보다 레이어가 다르다. Matt Pocock Skills는 Harness 자체라기보다 Harness에 삽입할 수 있는 **engineering behavior library**에 가깝다.

## 활용 아이디어

### 바로 적용 가능

1. `grill-with-docs` 개념을 기능 개발 시작 단계에 적용한다.
2. 프로젝트별 `CONTEXT.md`를 두고 사내 용어, 폴더 의미, 배포 용어, Perforce/TeamCity 용어를 짧게 정의한다.
3. `diagnosing-bugs`의 단계적 디버깅 루프를 Claude/Codex 공통 Skill로 사용한다.
4. `code-review`의 Standards/Spec 분리 리뷰를 기존 Codex review 단계에 적용한다.

### PoC 가치 있음

현재 사용 중인 Orchestrator → Analysis → Work → Review 형태의 Harness에 다음과 같이 결합할 가치가 있다.

```text
Orchestrator
   |
   +--> Analysis Agent
   |      grilling
   |      domain-modeling
   |      to-spec
   |
   +--> Work Agent
   |      tdd
   |      diagnosing-bugs
   |
   +--> Review Agents (parallel)
          Standards Review
          Spec Review
```

특히 Review를 단일 Codex reviewer 하나로 끝내지 않고 **coding standards 검증과 요구사항 충족 검증을 분리**하는 패턴은 바로 실험할 가치가 높다.

### 아이디어 참고

`wayfinder`의 blocking graph 개념은 여러 프로젝트/agent session을 메인 orchestrator가 관리하는 구조에서 장기 작업의 진행 상태를 표현하는 데 참고할 수 있다.

### 현재는 그대로 도입 가치 낮음

GitHub/Linear 중심 tracker integration은 회사의 Perforce/Hansoft 환경에 그대로 적용하기보다 tracker abstraction만 참고하고 별도 adapter를 만드는 편이 낫다.

## 설치 및 운영 메모

Claude Code에서는 저장소 README 기준 공식 marketplace plugin을 통한 전체 설치 경로를 제공한다. Codex 및 기타 Agent에서는 `npx skills@latest add mattpocock/skills`로 선택 설치할 수 있으며, 프로젝트별 setup skill을 한 번 실행해 issue tracker, triage label, 문서 위치 등을 구성한다.

다만 설치 관련 open issue가 존재하므로 특정 스킬만 설치할 경우 최신 CLI 옵션과 prerequisite를 확인하는 것이 좋다.

## 프로젝트 성숙도

2026-09-06 조사 기준 저장소는 최근까지 활발하게 변경되고 있다. 2026-09-04에도 merge commit이 존재하며, 8월에는 retrospective 관련 스킬 변경이 이어졌다. 반면 활발한 변화만큼 설치 방식이나 orchestration 경계에 관한 open issue도 존재한다. 안정된 표준 라이브러리라기보다 실제 사용을 통해 빠르게 개선되는 실전형 Skill collection으로 보는 것이 적절하다.

## 결론

이 저장소의 가장 큰 가치는 개별 명령어보다 **AI 코딩에서도 소프트웨어 엔지니어링 기본기를 workflow primitive로 만들어 반복 실행해야 한다**는 접근이다.

특히 `grilling + domain model + TDD + two-axis review` 조합은 특정 모델과 무관하게 재사용할 수 있다. 기존 Agent Harness를 통째로 교체하기보다 현재 workflow의 Analysis/Work/Review 단계에 필요한 Skill을 골라 삽입하는 방식이 가장 적합하다.

도입 우선순위는 다음을 추천한다.

1. `grill-with-docs` / `domain-modeling`
2. `diagnosing-bugs`
3. `code-review`
4. `tdd`
5. `to-spec` / `to-tickets`
6. `wayfinder` / architecture 관련 skill

## 참고 자료

- Repository: https://github.com/mattpocock/skills
- README: https://github.com/mattpocock/skills/blob/main/README.md
- Engineering Skills: https://github.com/mattpocock/skills/tree/main/skills/engineering
- grill-with-docs: https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md
- implement: https://github.com/mattpocock/skills/blob/main/skills/engineering/implement/SKILL.md
- code-review: https://github.com/mattpocock/skills/blob/main/skills/engineering/code-review/SKILL.md
- Installation/prerequisite issue: https://github.com/mattpocock/skills/issues/1012
