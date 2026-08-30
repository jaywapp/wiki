---
title: Task Observer
category: skills
tags:
  - ai
  - agent
  - skill
  - meta-skill
  - claude
  - continuous-improvement
source: https://github.com/rebelytics/one-skill-to-rule-them-all
updated: 2026-08-31
---

# Task Observer — One Skill to Rule Them All

> 실제 작업 세션을 관찰해 새로운 Skill 후보와 기존 Skill의 개선점을 지속적으로 수집하고, 검토 가능한 형태로 축적하는 self-improving meta-skill.

## 프로젝트 개요

Task Observer는 Eoghan Henn(rebelytics)이 만든 Agent Skill로, 특정 업무를 직접 수행하는 Skill이 아니라 다른 Skill을 만들고 개선하는 **meta-skill**이다. 작업 중 사용자의 수정, 반복 작업, 기존 Skill의 빈틈, Observer 자체의 실패를 관찰해 구조화된 observation으로 남긴다.

작성자는 7개월 동안 약 70개 Skill에서 1,200개 이상의 observation을 기록했고, 다수의 Skill이 이 관찰에서 파생되었다고 설명한다. Claude Cowork 중심으로 설계되었지만 Claude Code와 일반 Claude Chat, 사용자 보고 기준 Hermes/OpenClaw에도 적용 사례가 있다.

## 해결하려는 문제

일반적인 Agent Skill은 한 번 작성하면 정적이다.

- 실제 사용 중 발견되는 예외와 사용자 수정이 Skill에 다시 반영되지 않는다.
- 반복 작업이 존재해도 사람이 명시적으로 Skill 생성을 떠올려야 한다.
- Skill 수가 많아지면 각각을 수동으로 리뷰하기 어렵다.
- 여러 Skill에 공통으로 적용되는 원칙이 개별 Skill 안에 고립되기 쉽다.

Task Observer는 업무 수행과 Skill engineering 사이에 feedback loop를 추가한다.

```text
Task 실행
   ↓
사용자 수정 / 반복 패턴 / 실패 / workflow friction
   ↓
Task Observer
   ↓
Observation Log
   ├─ Existing Skill improvement
   ├─ New Skill candidate
   └─ Cross-cutting principle
   ↓
Review
   ↓
Skill update / Skill creation
   ↓
다음 Task 실행
```

## 핵심 기능

### 1. Skill 개선 신호 감지

다음과 같은 사건을 개선 신호로 취급한다.

- 사용자가 AI 결과를 수정하거나 방향을 재지정
- 문서화된 Skill 규칙을 Agent가 위반
- 기존 workflow보다 나은 방식 발견
- 기존 Skill에서 처리하지 못하는 edge case 발견
- 도구 변화로 기존 절차가 낡음

단발성 수정이나 프로젝트 고유 맥락처럼 일반화되지 않는 내용은 observation으로 남기지 않는 것을 원칙으로 한다.

### 2. 새로운 Skill 후보 발견

반복되는 multi-step workflow나 아직 Skill이 없는 수작업 패턴을 `proposes_skill` 후보로 기록한다. 즉 Skill을 먼저 설계하는 방식이 아니라 **실제 작업에서 Skill이 자연스럽게 발견되도록 하는 구조**다.

### 3. 구조화된 Observation Log

v3.0부터 observation 하나를 Markdown 파일 하나로 저장한다.

```text
skill-observations/
├── observation-log/
│   ├── 0001-....md
│   ├── 0002-....md
│   └── archive/
├── cross-cutting-principles.md
├── skill-families.md
└── last-review-date.txt
```

각 파일 frontmatter에 status, 대상 Skill, Skill 제안 여부 등의 메타데이터를 두고 session start에서는 body 전체가 아니라 frontmatter만 읽는다. backlog가 커져도 context/token 비용을 제한하기 위한 설계다.

### 4. Cross-cutting Principles

특정 Skill 하나에 국한되지 않는 개선 원칙은 별도 파일에 축적한다. 이후 새로운 Skill을 만들거나 기존 Skill을 수정할 때 이 원칙을 함께 검사하여 전체 Skill library의 품질 하한선을 높인다.

### 5. Skill Family / Sibling Propagation

비슷한 methodology를 공유하는 Skill family를 관리한다. 하나의 Skill에서 발견된 일반적 개선이 sibling Skill에도 적용되어야 하는지 observation 생성 시 검사하도록 한다.

### 6. 주기적 Review

7일 이상 review하지 않았고 open observation이 있으면 review를 제안한다. scheduled/autonomous 환경에서는 정기 review를 실행할 수 있다. 작성자는 Monday/Wednesday/Friday review cadence를 사용한다고 설명한다.

### 7. Self Improvement

Task Observer 자체도 active Skill이므로 자신의 activation 실패, logging 방식 문제, 불필요한 trigger 등을 observation 대상으로 삼는다. 이 때문에 meta-skill 자체가 동일한 feedback loop 안에 들어간다.

## 구조 및 아키텍처

Repository는 단일 `SKILL.md`에 모든 규칙을 넣지 않고 progressive disclosure 구조를 사용한다.

```text
SKILL.md
├── Session Start Protocol
├── Observe / Log 핵심 규칙
└── references/ (필요할 때만 load)
    ├── environments.md
    ├── observation-log.md
    ├── signals.md
    ├── skill-authoring.md
    ├── weekly-review.md
    └── migration.md

scripts/
├── migration helper
└── skill bundle validation helper
```

항상 필요한 핵심 규칙은 SKILL.md에 두고 특정 episode가 발생할 때만 reference를 읽는다. 이는 always-on meta-skill이 context를 과도하게 소비하는 것을 줄이기 위한 중요한 설계다.

## 실행 흐름

### Session Start

1. persistent workspace 확인
2. observation storage 초기화/기존 log 탐색
3. observation frontmatter scan
4. review 필요 여부 확인
5. Skill activation 설정 확인
6. 대상 Skill 및 staged update 상태 확인
7. 첫 실행이라면 기존 project history backfill 제안

### Task 실행 중

Observer는 background mindset로 유지된다.

```text
사용자 요청
 → Agent가 기존 Skill/Tool 사용
 → Task 수행
 → correction / friction / repeated workflow 감지
 → generalisability 판단
 → 대상 Skill 및 sibling 확인
 → observation 즉시 기록
```

특히 observation을 머릿속에 모아 두었다가 세션 끝에 한꺼번에 기록하지 않고 같은 turn 또는 다음 turn에 저장하도록 강제한다.

### Review

```text
Open observations
      +
Cross-cutting principles
      +
Installed skills
      ↓
Review / conflict check
      ↓
Skill update candidate
      ↓
skill-updates/ staging
      ↓
Human review
```

Observer가 Skill을 무조건 직접 덮어쓰는 구조가 아니라 변경안을 검토 가능한 상태로 만드는 human-in-the-loop 방식이다.

## v3.0 핵심 변화

2026-08-28 공개된 v3.0은 observation storage architecture를 크게 변경했다.

기존 single `log.md`에서 observation별 개별 Markdown 파일로 전환했다. 이 방식은 parallel session에서 동일 파일을 수정하며 생기는 collision을 줄이고, session-start scan에서 frontmatter만 읽을 수 있어 backlog 증가 시 비용도 낮춘다.

또한 project-completing command(push/deploy/release 등)를 observation flush point로 취급하고, sibling propagation, parked status, broken scan 감지, staging manifest 등 운영 안정성을 강화했다.

## 장점

### 실제 사용에서 Skill이 진화한다

Skill authoring을 별도 활동으로만 두지 않고 실제 업무 friction을 improvement signal로 사용한다. Skill이 문서가 아니라 운영 중 개선되는 asset에 가까워진다.

### Skill 생성 아이디어를 자동 발견한다

"어떤 Skill을 만들까?"에서 시작하지 않고 반복 업무를 관찰한 뒤 Skill 후보를 만든다. 실제 효용이 있는 Skill이 생성될 확률이 높다.

### Skill library 규모가 커질수록 가치가 증가한다

수십 개 Skill을 사람이 정기적으로 audit하기는 어렵다. Observer + review queue가 Skill maintenance layer 역할을 한다.

### Human-in-the-loop

관찰 결과가 곧바로 Skill mutation으로 이어지지 않는다. 변경을 staging/review하는 구조라 잘못된 한 번의 관찰이 Skill 전체를 오염시키는 위험을 줄인다.

### Context 비용을 고려한 구조

reference on-demand loading과 observation frontmatter scan은 always-on Skill에서 중요한 token 최적화 패턴이다.

## 단점 및 한계

### 작은 Skill library에서는 과한 구조

Skill이 몇 개뿐이면 observation storage, review cycle, family registry 등을 운영하는 비용이 직접 수정 비용보다 클 수 있다. 프로젝트 README도 이 한계를 명시한다.

### 완전한 자기학습 시스템은 아니다

이름과 설명 때문에 자동으로 Skill을 학습/수정하는 Agent처럼 보일 수 있지만 실제 구조는 **관찰 → 기록 → 검토 → 변경**이다. Human review가 중요한 안전장치다.

### Activation 신뢰성이 핵심

Observer가 session 시작부터 활성화되지 않으면 중요한 신호를 놓칠 수 있다. 프로젝트 역시 description matching만으로는 강제할 수 없음을 인정하며 CLAUDE.md instruction 또는 harness SessionStart hook 같은 이중 activation을 권장한다.

### Claude 중심 가정

SKILL.md 포맷 자체는 이식 가능하지만 `<available_skills>`, Claude Skill creator, Cowork filesystem 등 Claude architecture를 전제로 한 부분이 있다. ChatGPT/Codex/Gemini/Cursor에서는 adapter가 필요하다.

### Observation 품질이 잘못되면 noise가 누적될 수 있다

사소한 수정까지 모두 기록하면 backlog가 커지고 review 비용이 증가한다. 따라서 generalisability gate와 review가 실질적인 품질 관리 장치다.

### Enterprise 환경

작업 로그가 실제 업무 패턴과 수정 사항을 축적하므로 회사 코드, 고객 정보, 내부 프로세스가 observation에 포함되지 않도록 저장 위치와 open-source/internal Skill 경계를 명확히 해야 한다.

## 활용 사례

### Skill Library 자동 유지보수

Claude Code Skill을 여러 개 운영하는 개발자가 매번 수동 audit하지 않고 실제 작업에서 발견되는 개선점을 backlog로 관리한다.

### 반복 업무 → Skill 후보 발견

Agent가 여러 세션에서 동일한 multi-step 절차를 반복하면 이를 reusable Skill 후보로 제안한다.

### Agent Harness 품질 개선

Task Observer의 methodology를 Orchestrator에 넣으면 worker/reviewer 실행 중 사용자 correction이나 workflow failure를 skill improvement event로 변환할 수 있다.

### 팀 Skill 운영

개별 개발자의 correction을 observation으로 수집하고 review를 거쳐 공통 Skill에 반영하는 내부 Skill governance workflow로 확장할 수 있다.

## 기존 방식과 비교

| 방식 | 개선 신호 | 지속성 | 자동 Skill 발견 | 운영 복잡도 |
|---|---|---|---|---|
| 수동 Skill 관리 | 사람이 직접 발견 | 높음 | 없음 | 낮음 |
| Chat/Agent Memory | 대화/사용자 정보 | 플랫폼 의존 | 낮음 | 낮음 |
| Task Observer | 실제 task friction | 파일 기반 | 높음 | 중간 |
| 완전 자동 self-modifying agent | 실행 결과 | 구현에 따라 다름 | 가능 | 높음/위험 |

Task Observer의 포지션은 Memory와 autonomous self-modification 사이에 있다. **관찰은 자동화하되 변경 승인권은 사람에게 남긴다.**

## ChatGPT / Codex 적용 가능성

직접 설치 호환성은 Claude보다 낮지만 methodology 자체는 충분히 이식할 가치가 있다.

ChatGPT 환경에서는 매 turn에 SKILL.md를 filesystem에서 실행하는 Claude Code 방식보다 다음 구조가 현실적이다.

```text
ChatGPT / Agent Harness
        ↓
Task execution telemetry
        ↓
Observer middleware
        ↓
Observation Store
        ↓
Scheduled Review Agent
        ↓
Skill / Prompt / Workflow PR
```

즉 Task Observer를 단순 ChatGPT Custom Instruction으로 복사하기보다 **Agent Harness의 관찰 계층**으로 구현하는 편이 적합하다.

Codex용 사용자 adaptation도 upstream README에서 별도로 소개하고 있어 Claude 외 환경으로 methodology가 이식 가능하다는 실사용 신호는 존재한다. 다만 upstream 최신 v3.x와 adaptation의 기능 차이는 확인해야 한다.

## 활용 아이디어

### 바로 적용 가능

**Claude Code Skill library 운영**에 적용 가치가 높다. `.claude/skills/task-observer/`에 설치하고 stable workspace에 observation log를 두는 방식이 가장 자연스럽다.

### PoC 가치 높음 — Agent Harness Observer Layer

Task Observer의 핵심 아이디어를 일반화해 Agent Harness에 다음 이벤트를 추가할 수 있다.

```text
User Correction
Agent Retry
Reviewer Reject
Tool Failure
Manual Override
Repeated Workflow
      ↓
Observation Event
      ↓
Skill / Prompt / Workflow improvement backlog
```

특히 Analysis → Work → Review 구조에서는 Reviewer reject와 사용자 수정이 강한 observation signal이 된다.

### PoC 가치 높음 — Git 기반 Skill Improvement

Observation review 결과를 Skill 파일에 바로 반영하지 않고 branch/PR로 생성한다.

```text
Observation
 → Improvement Agent
 → Skill diff
 → Git branch
 → PR
 → Human review
 → Merge
```

기업 환경에서는 원본 방식의 local staging보다 auditability와 rollback이 좋아질 수 있다.

### 아이디어 참고 — Wiki/Knowledge Base까지 확장

Skill뿐 아니라 반복적으로 수정되는 runbook, coding guideline, troubleshooting guide에도 같은 observation loop를 적용할 수 있다.

## 도입 평가

**평가: PoC 가치 매우 높음.**

Task Observer의 가장 중요한 부분은 `SKILL.md` 자체보다 **업무 수행에서 발생하는 friction을 reusable knowledge improvement event로 바꾸는 feedback loop**다.

Skill 수가 적은 개인 환경에서는 다소 과하지만 Skill/Agent workflow가 지속적으로 증가하는 환경에서는 maintenance 문제를 구조적으로 해결한다. 특히 여러 Agent와 Skill을 조합하는 Harness라면 원본을 그대로 설치하기보다 observation event model, persistent store, scheduled reviewer를 Harness 수준으로 재구현하는 방향이 더 확장성이 높다.

## 참고 자료

- Repository: https://github.com/rebelytics/one-skill-to-rule-them-all
- User Guide: https://github.com/rebelytics/one-skill-to-rule-them-all/blob/main/USER-GUIDE.md
- v3.0 release: https://github.com/rebelytics/one-skill-to-rule-them-all/releases/tag/v3.0.0
- License: CC BY 4.0
