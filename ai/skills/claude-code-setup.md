---
title: Claude Code Setup
category: skills
tags:
  - ai
  - claude-code
  - skill
  - plugin
  - automation
source: https://claude.com/plugins/claude-code-setup
updated: 2026-08-31
---

# Claude Code Setup

> 코드베이스를 읽어 Claude Code의 MCP, Skill, Hook, Subagent, Plugin 자동화 구성을 프로젝트별로 추천해 주는 Anthropic 공식 메타 Skill/Plugin.

## 프로젝트 개요

Claude Code Setup은 Anthropic이 공식 배포하는 Claude Code 플러그인이다. 실제 구성의 핵심은 `claude-automation-recommender`라는 하나의 Skill이며, 현재 프로젝트의 언어·프레임워크·의존성·테스트·CI/CD·기존 `.claude` 설정 등을 읽고 Claude Code 확장 포인트를 추천한다.

공식 Claude 플러그인 페이지 기준 Anthropic Verified이며 Claude Code에서 설치할 수 있다. 분석은 read-only로 동작하고 파일을 직접 수정하지 않는다.

## 해결하려는 문제

Claude Code는 MCP, Skills, Hooks, Subagents, Plugins 등 확장 수단이 많다. 문제는 프로젝트마다 무엇을 적용해야 효과적인지 판단하기 어렵다는 점이다.

Claude Code Setup은 코드베이스의 실제 신호를 먼저 수집하고 그 결과를 기반으로 필요한 자동화를 좁혀 추천한다. 즉, 범용적인 Claude Code 설정 가이드가 아니라 `현재 저장소에 무엇을 붙일 것인가`를 결정하는 진단기 역할을 한다.

## 핵심 기능

1. 코드베이스 프로파일링
   - 언어 및 런타임
   - Framework / 주요 dependency
   - Frontend / Backend 구조
   - Database 및 외부 API
   - Test framework
   - CI/CD
   - 기존 Claude Code 설정

2. 자동화 유형별 추천
   - MCP Servers
   - Skills
   - Hooks
   - Subagents
   - Plugins

3. 코드 신호 기반 매핑
   - React 등 일반 라이브러리 → Context7
   - Frontend/UI 테스트 → Playwright
   - Supabase → Supabase MCP
   - GitHub 저장소 → GitHub MCP
   - Prettier → 편집 후 자동 format Hook
   - ESLint/Ruff → 자동 lint Hook
   - `.env` → 수정 방지 Hook
   - 인증/결제 코드 → security-reviewer Subagent
   - 대규모 코드베이스 → code-reviewer Subagent

4. 추천 개수 제한
   - 기본적으로 카테고리당 가치가 높은 1~2개만 추천
   - 특정 유형을 요청하면 3~5개 수준으로 확장

## 아키텍처

```text
Claude Code
    |
    v
claude-automation-recommender Skill
    |
    +-- Read / Glob / Grep / Bash
    |
    v
Codebase Signals
    |- package / project metadata
    |- dependencies
    |- source tree
    |- tests
    |- CI/CD
    |- .claude / CLAUDE.md
    |
    v
Recommendation Engine (LLM + reference patterns)
    |
    +-- MCP Servers
    +-- Skills
    +-- Hooks
    +-- Subagents
    +-- Plugins
    |
    v
Recommendation Report
```

별도의 독립 실행형 분석 엔진이라기보다 Claude Code가 Skill의 지침에 따라 저장소를 탐색하고 판단하는 구조다. Skill frontmatter에서 사용하는 도구는 `Read`, `Glob`, `Grep`, `Bash`로 정의되어 있다.

## 동작 방식

### Phase 1 — Codebase Analysis

`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml` 같은 프로젝트 파일과 `.claude/`, `CLAUDE.md`, `src/`, `tests/` 등의 구조를 탐색한다.

### Phase 2 — Recommendation

찾은 신호를 Claude Code 확장 포인트와 연결한다. 예를 들어 테스트 디렉터리가 있으면 관련 테스트 Hook/Subagent, 데이터베이스가 있으면 해당 MCP, 반복 작업이 보이면 Custom Skill 후보를 제시한다.

### Phase 3 — Report

프로젝트 프로파일과 함께 카테고리별 추천 이유, 설치 또는 생성 위치를 제공한다. 중요한 점은 여기서 끝이며 실제 파일 생성이나 설정 변경은 수행하지 않는다는 것이다.

## 장점

- Anthropic 공식 Plugin/Skill이라 Claude Code의 확장 모델과 방향이 잘 맞는다.
- 프로젝트를 먼저 분석하므로 무작정 MCP나 Skill을 많이 설치하는 것보다 합리적이다.
- read-only라 기존 저장소를 망가뜨릴 위험이 낮다.
- MCP만 보지 않고 Hook, Skill, Subagent, Plugin까지 한 번에 점검한다.
- 신규 프로젝트의 Claude Code 초기 세팅뿐 아니라 기존 프로젝트의 자동화 구성 audit 용도로도 쓸 수 있다.
- 추천 개수를 의도적으로 제한해 과도한 설정을 줄인다.

## 단점 및 한계

- 추천기이지 자동 구축기는 아니다. 실제 적용은 사용자가 다시 요청하거나 직접 해야 한다.
- 판단의 상당 부분이 LLM과 Skill에 정의된 reference pattern에 의존한다.
- Bash 기반 탐색 예시는 Unix shell 중심이다. Windows 환경에서는 Claude Code의 실제 shell 환경에 따라 일부 탐색 패턴을 조정할 필요가 있다.
- 저장소에 기술 스택이나 운영 규칙이 명시적으로 드러나지 않으면 추천 품질이 낮아질 수 있다.
- 조직 보안 정책, MCP 승인 목록, 비용 제한 같은 Enterprise 제약을 자동으로 알고 있는 것은 아니다.
- MCP/Plugin 추천은 외부 도구의 현재 상태와 보안성을 별도로 검증해야 한다.
- 자동화의 실제 ROI나 토큰 비용을 측정하는 기능은 확인되지 않는다.

## 활용 사례

### 신규 프로젝트 Bootstrap

프로젝트를 만든 직후 실행해 필요한 MCP, formatter/linter Hook, project-specific Skill, reviewer agent 후보를 빠르게 정한다.

### 기존 Claude Code 구성 Audit

이미 `.claude` 구성이 있는 저장소에서 빠진 자동화가 무엇인지 검토하는 용도로 사용할 수 있다.

### 팀 표준화의 전단계

여러 저장소를 분석해 반복적으로 등장하는 추천을 수집한 뒤 조직 공통 Claude Code baseline으로 승격할 수 있다.

### 프로젝트 전용 Skill 발굴

API route, migration, test, component, PR, release 등의 반복 패턴을 찾아 `api-doc`, `create-migration`, `gen-test`, `pr-check`, `release-notes`, `project-conventions` 같은 Custom Skill 후보를 제안하는 패턴이 포함되어 있다.

## 기존 방식과 비교

| 방식 | 특징 | 한계 |
|---|---|---|
| CLAUDE.md 수동 작성 | 완전한 통제 가능 | 경험과 지속 관리 필요 |
| MCP 목록 보고 직접 설치 | 빠름 | 프로젝트와 무관한 도구가 늘기 쉬움 |
| 범용 Claude Code Starter Template | 팀 표준화에 유리 | 프로젝트별 차이를 반영하기 어려움 |
| Claude Code Setup | 저장소를 분석한 뒤 맞춤 추천 | 추천 후 실제 구현 단계는 별도 |

따라서 이 Plugin은 Starter Template을 대체한다기보다 `프로젝트 진단 → 필요한 자동화 선정 → 팀 표준에 반영` 사이의 진단 단계에 가장 적합하다.

## 활용 아이디어

### 바로 적용 가능

각 저장소의 Claude Code 설정을 처음 구성할 때 `recommend automations for this project` 형태로 실행하고 추천 결과를 검토한다.

특히 기존 프로젝트에서는 다음 순서가 유용하다.

```text
Repository
  ↓
Claude Code Setup 진단
  ↓
추천 결과 검토
  ↓
필요 항목만 구현
  ↓
테스트/Review
  ↓
.claude 설정 또는 팀 템플릿 반영
```

### PoC 가치 있음 — Setup → Implement → Review 파이프라인

이 Skill은 read-only라는 점을 오히려 활용해 진단과 변경 권한을 분리할 수 있다.

```text
Observer / Setup Agent (read-only)
        ↓ recommendations
Implementation Agent
        ↓ changes
Review Agent / Codex
        ↓
approved Claude configuration
```

진단 Agent가 직접 파일을 수정하지 않으므로 자동화 추천을 독립된 Analysis 단계로 배치하기 좋다.

### PoC 가치 있음 — 조직용 Claude Bootstrap Skill

공식 Skill을 그대로 사용하는 대신 조직 규칙을 추가한 상위 Skill을 만들 수 있다.

예:

- 승인된 MCP allowlist만 추천
- Windows 우선
- .NET / WPF / UE 프로젝트 패턴 추가
- TeamCity / Perforce 감지
- 사내 보안 규칙 Hook 자동 추천
- 공통 reviewer agent 추천
- 추천 후 사용자가 승인하면 구현 Agent로 전달

이렇게 하면 단순 Claude Code Setup을 `Repository AI Readiness Scanner` 형태로 발전시킬 수 있다.

### 아이디어 참고 — 지속적 Configuration Audit

CI 또는 주기적 점검에서 dependency와 프로젝트 구조가 크게 변경되었을 때 Claude Code 자동화 구성이 여전히 적절한지 재진단하는 방식도 가능하다. 다만 공식 Skill 자체는 지속 감시 기능을 제공하는 것으로 확인되지 않았다.

## Enterprise 적용성

Enterprise에서는 자동 추천을 그대로 설치하는 것보다 다음 정책 계층을 추가하는 편이 안전하다.

```text
Official Recommender
      ↓
Organization Policy Filter
      |- Approved MCP
      |- Approved Plugins
      |- Security rules
      |- Cost/token rules
      |- OS constraints
      ↓
Human approval
      ↓
Implementation
```

특히 MCP와 Plugin은 외부 실행 코드나 서비스 연결을 포함할 수 있으므로 추천과 설치 승인을 분리하는 것이 좋다.

## 결론

Claude Code Setup의 핵심 가치는 새로운 기능 자체가 아니라 **Claude Code의 많은 확장 포인트 중 현재 코드베이스에 필요한 것을 자동으로 선별하는 메타 Skill**이라는 점이다.

개인 개발자에게는 Claude Code 초기 설정 도우미이고, 조직 관점에서는 저장소별 AI 개발환경을 진단하는 bootstrap/audit 단계로 활용할 가치가 크다. 특히 read-only 분석 Agent와 구현 Agent를 분리한 Harness로 확장하기 좋다.

평가: **바로 적용 가능 + 조직용 Bootstrap/Audit Harness로 PoC 가치 높음**.

## 참고 자료

- Claude 공식 Plugin: https://claude.com/plugins/claude-code-setup
- Anthropic official plugins repository: https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-code-setup
- Skill source: https://github.com/anthropics/claude-plugins-official/blob/main/plugins/claude-code-setup/skills/claude-automation-recommender/SKILL.md
