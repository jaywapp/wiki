---
title: TeamAI CLI
category: tools
tags:
  - ai
  - agent
  - cli
  - harness
  - knowledge-base
  - team-collaboration
source: https://github.com/Tencent/teamai-cli
updated: 2026-09-09
---

# TeamAI CLI

> Git 저장소를 중심으로 여러 AI 코딩 에이전트의 Skills, Rules, Agents, Hooks, MCP, 지식과 세션 학습을 팀 단위로 배포·회수하는 AI 협업 CLI.

## 프로젝트 개요

Tencent의 TeamAI CLI는 Claude Code, Codex, Cursor, CodeBuddy, WorkBuddy, OpenCode, Qoder 등 서로 다른 AI 에이전트에 팀 공통 Harness와 Knowledge를 공급하기 위한 협업 계층이다. 핵심은 특정 모델을 대체하는 것이 아니라, 팀이 정의한 작업 방식과 지식을 Git 저장소에 모아 여러 에이전트가 같은 기준으로 일하도록 만드는 것이다.

프로젝트가 제시하는 제품 구조는 세 층이다.

1. **Team Execution** — Skills, Rules, Docs, Env, Agents, Hooks, MCP 등을 배포한다.
2. **Team Context (beta)** — Learnings, Codebase Graph, Team Wiki를 검색·회수한다.
3. **Team Improvement (beta)** — 실제 세션의 friction과 usage를 이용해 팀 지식을 다시 축적한다.

즉 `Execute → Understand → Learn → Self-Improve` 루프를 Git 기반으로 구현하려는 프로젝트다.

## 해결하려는 문제

개인 단위 AI 코딩 도구는 강력하지만 다음 문제가 있다.

- 개발자마다 Skills/Rules/CLAUDE.md/AGENTS.md 설정이 달라진다.
- Claude Code, Codex, Cursor 등 도구마다 설정 포맷과 설치 위치가 다르다.
- 한 사람이 AI와 시행착오를 통해 얻은 지식이 다른 팀원에게 자동 전달되지 않는다.
- 프로젝트 규칙과 코드베이스 지식을 매 세션 다시 탐색하면서 토큰과 시간이 낭비된다.
- 팀 공통 Harness를 변경해도 구성원 로컬 환경에 일관되게 배포하기 어렵다.

TeamAI는 Git을 중앙 배포 채널로 사용해 이 문제를 해결한다.

## 핵심 기능

### 1. Git 기반 Harness 배포

팀 저장소에 다음 리소스를 관리한다.

- `skills/<name>/SKILL.md`
- `rules/*.md`
- `docs/`
- `agents/*.yaml`
- `culture.md`
- `claudemd/*.md`
- `env/`
- `hooks/hooks.yaml`
- `mcp/mcp.yaml`
- `teamai.yaml`

`teamai push`는 변경사항을 브랜치/MR(PR) 흐름으로 공유하고, `teamai pull`은 승인된 최신 Harness를 로컬 AI 도구 형식으로 동기화한다. SessionStart hook을 이용한 자동 pull도 지원한다.

### 2. 멀티 에이전트 어댑터

하나의 Team Repo를 Claude Code, Codex, Cursor, CodeBuddy, WorkBuddy, OpenCode, OpenClaw, Hermes, DeepSeek Harness, Qoder 등 여러 에이전트에 맞게 배포한다. 지원 기능은 에이전트별로 차이가 있으며 일부 도구는 Agents/Hooks/MCP 또는 Usage/Session Dashboard를 지원하지 않는다.

### 3. 역할·태그·프로젝트 단위 배포

- `roles`: 역할별 namespace
- `tags`: 필요한 Skill/Rule만 구독
- `sources`: 다른 팀/공용 Skill 저장소 구독
- `projects`: 하나의 Team Repo에서 여러 프로젝트를 분리

Role은 직무, Project는 작업 대상이라는 독립적인 축으로 취급하며, 필요한 리소스의 합집합을 배포한다. 프로젝트별 Learnings 격리도 지원한다.

### 4. Team Knowledge Recall

Recall은 기본 비활성화이며 명시적으로 켜야 한다. 활성화하면 `teamai-recall` subagent가 배포되고 작업 전 relevance precheck를 거쳐 필요한 팀 지식을 검색한다.

단순 키워드 검색만 하는 것이 아니라 source 파일을 읽고 구조화된 요약을 반환하는 형태다.

### 5. Codebase Knowledge Graph

`teamai import` / `teamai codebase --extract`로 소스 저장소를 `teamwiki/` 그래프로 변환한다.

TypeScript/JavaScript, Python, Go는 WASM tree-sitter 기반 AST 분석을 사용하고, 그 외 언어까지 포함하기 위해 heuristic regex 추출도 병행한다. AST 결과가 겹치는 경우 우선된다. 구성요소, 인터페이스, 설정, import/call/implements 관계 등을 저장하고 recall의 재랭킹에 사용한다.

### 6. Friction 기반 학습 공유

세션 종료 시 단순 길이나 tool call 수가 아니라 다음과 같은 friction 신호를 본다.

- 사용자의 중단/교정
- tool call 거부
- 실패한 tool의 반복 retry

점수가 충분히 높으면 `/teamai-share-learnings`를 제안하고, 세션에서 얻은 교훈을 Team Repo의 learning 문서로 공유할 수 있다. 모든 긴 세션을 지식화하지 않고 실제로 어려움이 있었던 세션을 후보로 삼는 점이 흥미롭다.

## 아키텍처

```text
                    ┌─────────────────────┐
                    │     Team Repo       │
                    │ skills / rules      │
                    │ agents / hooks / MCP│
                    │ docs / learnings    │
                    │ teamwiki / culture  │
                    └─────────┬───────────┘
                              │ Git
                 push / review / merge / pull
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
     Claude Code            Codex               Cursor ...
          │                   │                   │
          └──────── Session / Tool Usage ─────────┘
                              │
                              ▼
                      friction detection
                              │
                    share learnings 후보
                              │
                              ▼
                         Team Repo

Source Repositories
       │
       ▼
 tree-sitter AST + heuristic extraction
       │
       ▼
   teamwiki graph ──→ recall / re-ranking ──→ agent context
```

구현은 TypeScript/Node.js 기반 CLI이며 Commander, simple-git, Zod, YAML, gray-matter, web-tree-sitter/tree-sitter WASM 등을 사용한다. 프로젝트 scope의 machine data는 최근 구조에서 `~/.teamai/projects/<slug>/` partition에 두고, 실제 에이전트 리소스는 프로젝트의 `.claude/`, `.cursor/` 등으로 동기화한다.

## 장점

### Agent-agnostic한 팀 Harness 관리

가장 큰 장점이다. 특정 AI 코딩 도구 하나에 조직 규칙을 종속시키지 않고 공통 소스를 두고 각 도구에 변환·배포한다. Claude Code와 Codex를 함께 사용하는 팀에서 특히 가치가 크다.

### Git을 제어면으로 사용

별도 SaaS 서버가 없어도 버전 관리, 코드 리뷰, rollback, 권한 관리라는 익숙한 운영 모델을 활용할 수 있다. Private/self-hosted Git도 고려되어 있다.

### 배포에서 학습 루프까지 범위가 넓음

단순 Skill Sync에서 끝나지 않고 Recall, Codebase Graph, Session Learning까지 연결한다. 팀 단위 Agent Experience 플랫폼에 가까운 방향이다.

### Progressive Disclosure와 역할 분리

모든 문서를 매번 context에 넣는 대신 필요한 knowledge를 검색하고, role/tag/project로 리소스를 제한할 수 있어 대규모 팀에서 context 폭증을 줄일 여지가 있다.

### 활발한 개발

2026-09-09 기준 main에 같은 날 여러 기능/수정 commit이 반영됐고, 최신 공개 release는 `v0.24.0-beta.2` prerelease다. Multi-project 관리, machine-data partition, Codex 개선, Qoder/JoyCode 지원 등이 빠르게 추가되고 있다.

## 단점 및 한계

### Context/Improvement는 아직 beta

README 자체가 Team Context와 Team Improvement를 beta로 명시한다. 핵심 Execution 배포와 달리 조직 지식 검색과 자동 학습 루프는 운영 안정성을 별도로 검증해야 한다.

### 운영 계층이 하나 더 생김

Team Repo, manifest, role/project/tag, local partition, 각 agent adapter를 관리해야 한다. 소규모 팀에서는 단순 dotfiles/Skills repo보다 과할 수 있다.

### Git workflow 의존성

장점이면서 제약이다. 비개발 직군이나 Git 접근이 제한된 환경에서는 onboarding 비용이 커질 수 있다. 자동 PR/MR 기능도 Git provider별 지원 차이가 있다.

### 에이전트별 기능 parity가 완전하지 않음

공식 지원표에서도 도구에 따라 agents/hooks/MCP/session/dashboard 기능 차이가 있다. '한 번 정의하면 모든 에이전트에서 완전히 동일하게 동작'하는 수준으로 이해하면 안 된다.

### 지식 품질 관리 필요

Friction 기반 learning은 후보 선별에는 유용하지만 잘못된 교훈이나 일회성 workaround가 팀 지식으로 승격될 가능성은 남는다. Review, expiration, ownership 같은 지식 거버넌스가 중요하다.

### 빠른 변경 속도

최신 릴리스가 beta이고 같은 날 데이터 레이아웃 및 worktree 관련 P1 회귀 수정이 이어지고 있다. 실험 도입에는 좋지만 Enterprise 표준 도구로 즉시 고정하기에는 버전 pinning과 upgrade 검증이 필요하다.

### Windows / Enterprise

Node.js 20+와 Git이 기본 전제다. 문서에서 Windows를 배제한다고 확인되지는 않았지만 shell/plugin install, hook, agent별 경로 동작은 사내 Windows 표준 환경에서 별도 PoC가 필요하다. 특히 보안상 외부 npm 설치, MCP 배포, 환경변수 공유 정책을 점검해야 한다. `env/`에는 secret을 넣지 말라고 공식 문서도 명시한다.

## 활용 사례

### 여러 AI 코딩 도구를 쓰는 개발팀

Claude Code 사용자와 Codex 사용자가 섞여 있어도 공통 Skill/Rule/Docs를 하나의 저장소에서 관리할 수 있다.

### 조직 표준 AI Harness 배포

코드 리뷰 규칙, Perforce/TeamCity 작업 Skill, 사내 개발 규약, MCP 설정 등을 팀 단위로 배포하는 용도다.

### 팀의 시행착오를 Knowledge로 축적

특정 빌드 오류, Perforce 문제, 사내 툴 제약처럼 LLM이 기본적으로 알 수 없는 경험을 learning으로 축적하고 다음 작업에서 recall할 수 있다.

### 여러 프로젝트를 가진 Productivity/Platform 팀

공통 Skill은 공유하면서 프로젝트별 규칙과 Learnings를 분리하는 운영에 적합하다.

## 기존 방식과 비교

| 방식 | 강점 | 약점 |
|---|---|---|
| 단순 Git dotfiles/skills repo | 단순, 투명, 유지보수 쉬움 | 에이전트별 변환·자동 배포·Recall 부족 |
| Claude Code 전용 Skills/Rules | Claude 생태계 기능 활용이 가장 직접적 | Codex/Cursor 등과 팀 규칙 공유가 어려움 |
| 사내 Wiki/RAG | 문서 지식 검색에 강함 | Harness 배포와 세션 학습을 별도로 구현해야 함 |
| TeamAI CLI | Harness + Context + Improvement를 Git 중심으로 통합 | beta 기능, 운영 복잡도, adapter parity 문제 |

## 활용 아이디어

### 바로 적용 가능 — 공통 Skills/Rules 저장소 패턴

현재 로컬에서 관리하는 Skills와 개발 규칙을 Team Repo 형태로 정리하는 설계는 바로 참고할 가치가 있다. 특히 Claude Code와 Codex에서 같은 규칙을 유지해야 한다면 단일 source of truth + adapter 방식이 유용하다.

### PoC 가치 높음 — 사내 AI Harness 배포 계층

개발 생산성 팀 관점에서는 다음 조합을 작은 팀에서 검증할 가치가 높다.

```text
Team Repo
├─ common skills
├─ Perforce / TeamCity skills
├─ coding rules
├─ project docs
├─ MCP manifests
└─ learnings
       ↓
TeamAI
       ↓
Claude Code + Codex
```

특히 '한 사람이 고친 AI 행동을 다음 날 다른 사람의 Agent가 재사용'하는 흐름은 조직 AX 관점에서 가치가 크다.

### PoC 가치 있음 — friction 기반 Skill 개선 파이프라인

세션 실패/교정 횟수를 Skill 개선 후보 신호로 사용하는 아이디어를 기존 Harness에 차용할 수 있다. 자동으로 Skill을 수정하기보다 `friction → learning 후보 → review → skill/rule 승격` 단계로 운영하는 것이 안전하다.

### 아이디어 참고 — Codebase Graph

대형 UE/Perforce 코드베이스에서 전체 source를 매번 탐색하는 대신 구조 정보를 별도 graph/wiki로 추출해 Agent의 탐색 시작점을 제공하는 패턴은 참고 가치가 있다. 다만 현재 TeamAI의 AST 지원 언어는 TS/JS, Python, Go 중심이므로 C++/C# 중심 환경에서는 heuristic 품질 검증 또는 별도 extractor가 필요하다.

## 결론

TeamAI CLI의 핵심 가치는 **'팀용 AI 설정 동기화 도구'보다 'Agent Harness의 GitOps 계층'**으로 보는 편이 정확하다.

특히 여러 AI 코딩 도구를 병행하고 팀 공통 Skill/Rule/MCP를 관리하려는 조직에는 방향성이 매우 잘 맞는다. 반면 Team Context/Improvement는 아직 beta이고 프로젝트 변화 속도가 매우 빠르므로 전사 표준으로 바로 채택하기보다는 소규모 PoC에서 Execution 계층부터 검증하는 것이 적절하다.

현재 관점의 평가:

- **Team Execution:** 바로 PoC 가치 높음
- **Team Context / Recall:** PoC 가치 있음
- **Friction Learning:** 아이디어 및 실험 가치 높음
- **Enterprise 전사 도입:** 아직 성숙도 관찰 필요

## 참고 자료

- Repository: https://github.com/Tencent/teamai-cli
- Usage Guide: https://github.com/Tencent/teamai-cli/blob/main/docs/usage-guide.md
- Releases: https://github.com/Tencent/teamai-cli/releases
- Latest checked prerelease: v0.24.0-beta.2 (2026-09-09)
