---
title: Agency Agents
tags: [AX, AI-Agent, Claude-Code, Codex, Cursor, Multi-Agent, Agent-Prompt]
updated: 2026-08-24
---

# Agency Agents

## 한줄 요약

**Agency Agents(The Agency)**는 개발·디자인·마케팅·PM·보안 등 역할별 전문 AI 에이전트 정의를 모아 Claude Code, Codex, Cursor, Gemini CLI, OpenCode 등 여러 AI 코딩 환경에서 재사용할 수 있게 만든 오픈소스 에이전트 라이브러리다.

## 프로젝트 개요

- 저장소: https://github.com/msitarzewski/agency-agents
- 라이선스: MIT
- 핵심 철학: 범용 프롬프트 하나보다 역할·성격·업무 프로세스·산출물·성공 지표가 명확한 전문 에이전트를 사용한다.
- 주요 영역: Engineering, Design, Product, Project Management, Testing, Security, Marketing, Sales, Strategy, Finance, Game Development 등.
- Claude Code뿐 아니라 GitHub Copilot, Antigravity/Gemini, OpenCode, OpenClaw, Cursor, Aider, Windsurf, Kimi Code, Codex, Osaurus, Hermes, Mistral Vibe 등으로 변환·설치할 수 있다.

## 해결하려는 문제

일반적인 AI 코딩 에이전트는 한 세션 안에서 설계, 구현, 리뷰, UX, 테스트 등 서로 다른 역할을 동시에 수행하면서 관점과 품질 기준이 흐려지기 쉽다. Agency Agents는 역할별 시스템 프롬프트에 가까운 정의를 분리하여 다음 문제를 해결한다.

1. 역할별 전문성 부족
2. 작업마다 반복되는 긴 프롬프트 작성
3. 팀/프로젝트 간 AI 작업 방식의 불일치
4. Claude Code, Cursor, Codex 등 도구별 프롬프트 자산의 파편화
5. 결과물의 완료 조건과 품질 기준이 불명확한 문제

## 핵심 기능

### 전문 에이전트 카탈로그

각 에이전트는 단순 직무명이 아니라 Identity & Memory, Core Mission, Critical Rules, Technical Deliverables, Workflow Process, Success Metrics, Communication Style 등을 포함한다.

대표 예:
- Frontend Developer
- Backend Architect
- AI Engineer
- DevOps Automator
- Rapid Prototyper
- UI Designer / UX Researcher / UX Architect
- Security 관련 에이전트
- Reality Checker 등 검증 역할

### Multi-tool 변환 및 설치

`scripts/convert.sh`가 원본 에이전트 정의를 대상 도구 형식으로 변환하고 `scripts/install.sh`가 설치한다.

예:
- Claude Code → `~/.claude/agents/`
- GitHub Copilot → `~/.github/agents/`
- Cursor → `.cursor/rules/*.mdc`
- OpenCode → `.opencode/agents/`
- Aider → 단일 `CONVENTIONS.md`
- OpenClaw → 에이전트별 workspace/SOUL.md/AGENTS.md/IDENTITY.md
- Codex 등도 통합 대상에 포함

division 또는 agent 단위로 필요한 역할만 설치할 수 있어 전체 카탈로그를 무조건 컨텍스트에 넣지 않아도 된다.

## 아키텍처

```text
Agent Markdown Definitions
        │
        ├─ engineering/
        ├─ design/
        ├─ security/
        ├─ testing/
        ├─ product/
        └─ ...
        │
        ▼
 scripts/convert.sh
        │
        ├─ Claude Code format
        ├─ Cursor rules
        ├─ OpenCode agents
        ├─ Aider conventions
        ├─ Gemini skills
        └─ 기타 tool-specific format
        │
        ▼
 scripts/install.sh
        │
        ▼
각 AI Coding Agent Runtime
```

즉 자체 LLM 런타임이나 오케스트레이터라기보다 **에이전트 역할 정의 + 변환기 + 설치 계층**에 가깝다. 실제 실행·툴 호출·컨텍스트 관리는 Claude Code/Codex/Cursor 같은 호스트가 담당한다.

## 장점

- 역할별 프롬프트를 처음부터 설계할 필요가 없다.
- 역할, 프로세스, 산출물, 성공 기준까지 포함해 단순 persona prompt보다 구체적이다.
- 동일한 에이전트 자산을 여러 AI 도구에 이식할 수 있다.
- MIT 라이선스로 사내 표준에 맞게 수정하기 쉽다.
- division/agent 단위 설치가 가능해 필요한 역할만 선택할 수 있다.
- 에이전트 정의 구조가 명확해 사내 전문 에이전트 템플릿의 레퍼런스로 좋다.

## 단점

- 에이전트가 전문적으로 보이는 것과 실제 모델의 전문성이 증가하는 것은 별개다. 품질은 기반 모델과 제공 컨텍스트에 크게 의존한다.
- 많은 역할을 설치하면 어떤 에이전트를 언제 호출할지 선택 비용이 커진다.
- 역할 간 자동 handoff, dependency graph, shared memory, task queue 같은 진짜 multi-agent orchestration은 핵심 기능이 아니다.
- 일부 정의는 특정 기술 스택이나 작성자의 업무 철학에 편향될 수 있어 조직별 커스터마이징이 필요하다.
- 긴 역할 프롬프트는 토큰 소비를 증가시킬 수 있다.
- 호스트별 agent/rule/skill 개념이 달라 변환 후 동작 의미가 완전히 동일하다고 보장하기 어렵다.

## 기존 도구와 비교

| 구분 | Agency Agents | 일반 Claude/Codex Agent 정의 | CrewAI/AutoGen류 |
|---|---|---|---|
| 핵심 | 전문 역할 라이브러리 | 프로젝트별 사용자 정의 역할 | Multi-agent 실행 프레임워크 |
| 실행 엔진 | 없음, 호스트 사용 | Claude/Codex | 자체 orchestration runtime |
| 역할 카탈로그 | 매우 큼 | 직접 작성 | 직접 작성 중심 |
| Multi-tool 이식 | 강점 | 제한적 | 프레임워크 종속 |
| 자동 handoff | 제한적 | 호스트 기능 의존 | 핵심 기능 |
| 도입 난이도 | 낮음 | 낮음~중간 | 중간~높음 |
| 적합 용도 | 역할 프롬프트 표준화 | 개별 프로젝트 최적화 | 복잡한 agent workflow |

Agency Agents의 경쟁력은 새로운 agent runtime을 만드는 데 있지 않고 **검증 가능한 역할 프롬프트 자산을 카탈로그화하고 여러 도구로 배포하는 방식**에 있다.

## 활용 사례

1. 구현 전 Backend Architect에게 설계를 검토시키고 Frontend/Backend Developer에게 구현을 맡긴 뒤 Reality Checker 또는 테스트 역할로 최종 검증한다.
2. CI/CD 변경은 DevOps Automator, 보안 검토는 Security 역할처럼 작업 유형별 전문 reviewer를 붙인다.
3. UI 작업에서 UX Architect → UI Designer → Frontend Developer 순으로 관점을 분리한다.
4. 조직에서 자주 반복되는 업무를 자체 Agent Markdown으로 추가하여 AI 업무 표준으로 사용한다.

## 활용 아이디어

### 1. 사내 Agent Catalog의 베이스 템플릿

Agency Agents의 구조를 그대로 복사하기보다 `Identity → Mission → Rules → Deliverables → Workflow → Success Metrics` 스키마를 사내 에이전트 표준으로 채택할 가치가 높다.

예를 들어 다음과 같은 조직 특화 에이전트를 만들 수 있다.
- WPF/.NET Reviewer
- Unreal Tooling Engineer
- Perforce Workflow Specialist
- TeamCity Pipeline Reviewer
- Internal Tool UX Reviewer

### 2. Planner → Worker → Reviewer 조합

단일 에이전트를 호출하는 방식보다 역할을 세 단계로 묶는 패턴이 실용적이다.

```text
Architect / Planner
       ↓
Implementation Agent
       ↓
Reality Checker / Reviewer
```

특히 마지막 Reviewer에게 구현 에이전트와 다른 성공 기준을 주면 self-review 편향을 줄일 수 있다.

### 3. 에이전트 자동 선택 Router

작업 입력을 분석해 적절한 에이전트를 선택하는 얇은 Router를 추가하면 Agency Agents를 단순 프롬프트 모음에서 실질적인 Agent System으로 확장할 수 있다.

```text
User Task
   ↓
Task Classifier
   ↓
Agent Selector
   ↓
Selected Agency Agent
   ↓
Reviewer
```

### 4. 필요한 에이전트만 로딩

전체 카탈로그를 항상 활성화하지 말고 작업별로 필요한 agent definition만 동적 로딩하는 방식이 토큰 효율 면에서 유리하다. 저장소 자체도 division/agent 선택 설치를 지원하므로 이 방향과 잘 맞는다.

### 5. Agent 품질 평가 체계

Agency Agents의 Success Metrics 개념을 확장해 각 역할에 테스트 케이스와 평가 기준을 붙이면 에이전트 프롬프트 변경을 회귀 테스트할 수 있다.

```text
agent.md
examples/
evals/
  input-01.md
  expected-01.md
metrics.yaml
```

이렇게 구성하면 단순 프롬프트 컬렉션을 버전 관리 가능한 **Agent Engineering 자산**으로 발전시킬 수 있다.

## 참고 링크

- Agency Agents: https://github.com/msitarzewski/agency-agents
- 공식 앱: https://agencyagents.app
- CONTRIBUTING: https://github.com/msitarzewski/agency-agents/blob/main/CONTRIBUTING.md

## Tags

`AX` `AI Agent` `Claude Code` `Codex` `Cursor` `Agent Engineering` `Multi-Agent` `Prompt Engineering`
