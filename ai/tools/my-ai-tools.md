---
title: my-ai-tools
category: tools
tags:
  - ai
  - coding-agent
  - configuration-management
  - mcp
  - skills
  - claude-code
  - codex
source: https://github.com/jellydn/my-ai-tools
updated: 2026-09-10
---

# my-ai-tools

> 여러 AI 코딩 CLI의 설정·MCP·Skills·Plugins·Commands를 하나의 Git 저장소를 Source of Truth로 삼아 배포하고, 로컬 변경을 다시 저장소로 역동기화하는 개인용 AI 개발환경 구성 관리 프로젝트.

## 프로젝트 개요

`jellydn/my-ai-tools`는 Claude Code, Codex, OpenCode, Amp, Gemini CLI 등 다수의 AI 코딩 도구를 한 저장소에서 관리하기 위한 configuration-as-code 성격의 프로젝트다. 핵심은 새로운 에이전트를 만드는 것이 아니라, 서로 다른 AI CLI의 설정과 공통 자산을 버전 관리하고 여러 머신에 재현하는 것이다.

2026-09-10 조사 시점에 저장소는 300회 이상의 커밋이 누적되어 있고 지속적으로 변경되고 있다. 별도의 GitHub Release는 확인되지 않아, 버전 릴리스 제품보다는 `main` 브랜치 중심으로 발전하는 개인 dotfiles/toolchain 저장소에 가깝다.

## 해결하려는 문제

AI 코딩 도구를 여러 개 사용하면 다음 문제가 생긴다.

- 도구마다 설정 위치와 형식이 다르다.
- MCP 서버, instructions, commands, skills가 중복 관리된다.
- PC를 바꾸거나 회사/집 환경을 나누면 동일 환경 재현이 어렵다.
- 로컬에서 개선한 설정이 Git 저장소와 쉽게 어긋난다.
- Claude Code, Codex, OpenCode 등으로 도구를 바꿀 때 공통 운영 규칙을 다시 구성해야 한다.

my-ai-tools는 이를 `configs/`, `skills/` 및 설치/생성 스크립트로 중앙화한다.

## 핵심 기능

### 1. 다중 AI CLI 설정 관리

다수의 AI 코딩 도구 설정을 `configs/` 아래에서 관리하고 각 도구의 실제 홈/config 경로로 배포한다.

### 2. 양방향 동기화

- `cli.sh`: 저장소 → 로컬 홈 디렉터리
- `generate.sh`: 로컬 환경 → 저장소

즉 단순 dotfiles 설치기가 아니라 로컬에서 튜닝한 구성을 다시 Git에 반영할 수 있는 왕복 흐름을 제공한다.

### 3. 공용 Skills

저장소에 다수의 재사용 가능한 Skill이 포함되어 있다. 예를 들어 ADR 생성, codebase map, code-quality review, PR monitoring, architecture improvement, context discovery, handoff, git context 등의 개발 워크플로우가 포함된다.

### 4. MCP 통합

README 기준 Context7, Sequential Thinking, qmd, codebase-memory-mcp, agentmemory, sem, ctx 등의 MCP/컨텍스트 도구를 통합 대상으로 다룬다.

### 5. 설치 안전장치

설치 과정에서 dry-run, backup/no-backup, non-interactive 모드를 제공한다. Windows용 `install.ps1`은 PowerShell 5.1+, Git for Windows/Git Bash, jq 등의 전제조건을 처리하고 Bash 기반 설치 흐름으로 연결한다.

### 6. Repository Q&A

README/docs/config/scripts를 색인하고 저장소 내용만 근거로 답하는 repository assistant도 포함한다. 서버 모드뿐 아니라 WebGPU와 소형 Qwen coder 모델을 사용하는 브라우저 모드도 문서화되어 있다.

## 아키텍처

```text
                Git Repository
        jellydn/my-ai-tools
                 │
     ┌───────────┼─────────────┐
     │           │             │
  configs/     skills/       docs/
     │           │
     │      shared agent skills
     │
     ▼
 cli.sh / install.sh
     │
     ├── Claude Code config
     ├── Codex config
     ├── OpenCode config
     ├── Gemini / other CLIs
     └── shared MCP / guidance
     │
     ▼
 Local AI Development Environment
     │
     │ local customization
     ▼
 generate.sh
     │
     └──────────────► Git Repository
```

구조상 핵심 Source of Truth는 `configs/`와 `skills/`이며 `lib/`가 공통 shell 로직을 제공한다. Node.js/Bun 코드는 hooks/plugins/skills 및 repository assistant와 같은 부가기능에 사용된다.

## 장점

- **AI CLI용 dotfiles 패턴**: Git 기반이어서 변경 이력과 rollback이 쉽다.
- **도구 종속성 완화**: Claude Code 하나에 운영 자산을 가두지 않고 여러 CLI로 확장할 수 있다.
- **환경 재현성**: 새 PC나 별도 개발환경 구축 시 설정을 빠르게 복원할 수 있다.
- **공통 Skill 재사용**: ADR, review, codemap 등의 반복 작업을 재사용 가능한 자산으로 관리한다.
- **Windows 고려**: PowerShell wrapper가 별도로 존재한다.
- **dry-run/backup**: 홈 디렉터리 설정을 다루는 프로젝트에서 중요한 최소 안전장치가 있다.

## 단점 및 한계

### 개인 설정 저장소 성격

범용 프레임워크라기보다 저자 개인의 AI CLI 운영환경을 공개한 프로젝트다. 그대로 설치하면 필요 없는 도구·규칙·MCP까지 따라갈 수 있으므로 전체 복제보다는 구조와 패턴을 선별 도입하는 편이 안전하다.

### 설정 표면적이 매우 큼

지원 도구가 많아질수록 각 CLI의 설정 포맷 변경과 deprecated 기능을 계속 추적해야 한다. 중앙화가 관리 문제를 없애는 것이 아니라 한 저장소로 모으는 방식이다.

### Secret 관리와 분리 필요

Git 저장소를 Source of Truth로 사용하는 구조에서는 API key, 개인 MCP 인증정보, 회사 내부 경로 등을 반드시 별도 secret/config 계층으로 분리해야 한다.

### Git 중심

Perforce 자체를 configuration backend로 다루는 프로젝트는 아니다. Perforce 중심 회사 환경에서는 AI 설정 저장소만 Git으로 별도 운영하거나 내부 Git mirror를 두는 방식이 현실적이다.

### Release 안정성 판단 어려움

조사 시점에 GitHub Releases가 없어 특정 안정 버전을 pin하기 어렵다. 설치 스크립트를 원격 `curl | bash` 형태로 사용할 경우 변경된 최신 스크립트가 즉시 실행된다는 점도 Enterprise 환경에서는 주의해야 한다.

## 활용 사례

### 개인 개발환경

집 PC/회사 PC에서 Claude Code, Codex 등 여러 CLI를 동일한 rules/skills/MCP 구성으로 맞추는 용도.

### 팀 AI 개발환경 Bootstrap

팀 표준 `AGENTS.md`, Skill, MCP 목록과 AI CLI 설정을 저장소로 만들고 신규 개발자가 bootstrap script 하나로 설치하도록 구성할 수 있다.

### AI CLI 비교/전환

동일한 개발 원칙과 Skill 자산을 유지한 상태에서 Claude Code, Codex, OpenCode 등을 바꿔 테스트하기 좋다.

## 기존 방식과 비교

| 방식 | 장점 | 한계 |
|---|---|---|
| 각 CLI 수동 설정 | 단순함 | 머신/도구가 늘면 drift 발생 |
| 일반 dotfiles | 검증된 패턴 | AI Skill/MCP 의미를 별도로 설계해야 함 |
| my-ai-tools | AI CLI·Skill·MCP까지 통합 | 개인 설정이 많고 유지보수 범위가 큼 |
| 전용 Harness | 모델 라우팅/워크플로우 자동화에 강함 | 로컬 CLI configuration 관리와 목적이 다름 |

이 프로젝트는 Harness라기보다 **AI 개발환경 Configuration Layer**로 보는 것이 정확하다.

## 활용 아이디어

### 바로 적용 가능

전체 설치보다 다음 패턴을 가져오는 것이 가치가 높다.

1. `configs/`를 AI CLI별 Source of Truth로 구성
2. `skills/`를 도구 독립적인 공용 Skill 계층으로 구성
3. `install --dry-run` + backup 패턴 적용
4. 로컬 → repo reverse sync 도입

### PoC 가치 있음

회사/집에서 서로 다른 AI 환경을 쓴다면 하나의 개인 `ai-env` 저장소를 만들고 다음처럼 계층화할 수 있다.

```text
ai-env/
├── common/
│   ├── AGENTS.md
│   └── skills/
├── claude/
├── codex/
├── mcp/
└── profiles/
    ├── home/
    └── company/
```

특히 회사 profile에서는 외부 MCP, API key, 경로, 회사 정책을 분리하는 것이 중요하다.

### 기존 Harness와 결합

ATOM/workspace-harness 같은 실행 Harness가 **어떤 모델에게 어떤 작업을 맡길지** 담당한다면, my-ai-tools 방식은 그 아래에서 **각 CLI가 어떤 공통 규칙·Skill·MCP를 가지고 시작할지** 담당하게 할 수 있다.

```text
Configuration Layer
  rules / skills / MCP / CLI settings
             │
             ▼
Harness / Orchestrator
  routing / task decomposition / review
             │
       ┌─────┼─────┐
       ▼     ▼     ▼
    Claude  Codex  Other
```

따라서 두 개념은 경쟁 관계라기보다 상하 계층으로 결합 가능하다.

## 결론

**평가: PoC 가치 높음 / 전체 그대로 도입은 비추천.**

my-ai-tools의 가장 중요한 아이디어는 특정 Skill 하나가 아니라 **AI 코딩 환경 전체를 코드로 관리(Configuration as Code)하고 양방향 동기화하는 운영 방식**이다. 여러 AI CLI를 병행하는 환경일수록 가치가 커진다.

특히 개인/팀 환경에서는 저장소를 그대로 fork하기보다 `configs + shared skills + profile + install/generate` 패턴만 추출하여 작은 사내/개인용 AI 환경 관리 저장소로 만드는 접근이 적합하다.

## 참고 자료

- https://github.com/jellydn/my-ai-tools
- https://ai-tools.itman.fyi/
- Repository README, GEMINI.md, install.ps1, skills/, configs/ (2026-09-10 확인)
