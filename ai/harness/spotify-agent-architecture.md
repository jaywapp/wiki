---
title: Spotify Agent Architecture
category: harness
tags:
  - ai
  - agent
  - agentic-development
  - harness
  - context-engineering
  - backstage
  - xirp
  - honk
source: https://portal.spotify.com/blog/introducing-xirp
updated: 2026-09-07
---

# Spotify Agent Architecture

> Spotify의 에이전트 전략은 특정 코딩 에이전트 하나를 표준화하는 것이 아니라, **Backstage/Portal을 조직 컨텍스트 계층으로 두고 Xirp를 대화형 멀티에이전트 실행 환경, Fleet Management + Honk를 대규모 비동기 코드 변경 계층으로 구성하는 구조**에 가깝다.

## 프로젝트 개요

Spotify는 AI 코딩 도구 사용이 개인 단위에서 수십 개 병렬 세션으로 확대되면서 `CLAUDE.md`, 개인 MCP 설정, 프롬프트, 세션별 지식이 분산되는 문제를 겪었다. 이를 모델 자체의 문제가 아니라 **조직 컨텍스트와 에이전트 실행 인프라 문제**로 보고 기존 Backstage/Fleet Management 기반 플랫폼을 확장했다.

현재 공개 자료에서 확인되는 주요 축은 다음과 같다.

- **Backstage / Spotify Portal**: 서비스 카탈로그, ownership, dependency graph, architecture decision 등 조직 지식의 구조화된 source of truth
- **Xirp**: Claude Code, Gemini CLI, Codex 등 여러 harness/session을 병렬 관리하는 vendor-neutral agentic development environment
- **Fleet Management / Fleetshift**: 수백~수천 repository를 대상으로 변경 대상을 선정하고 실행/PR 상태를 관리하는 orchestration 계층
- **Honk**: 실제 코드 수정, build/test, 평가, PR 생성을 수행하는 background coding agent
- **MCP / trusted tools**: lint, formatting, build, CI 등 deterministic tool을 agent에 제공
- **Evaluation / Observability**: LLM-as-a-judge, MLflow trace, GCP log 등을 이용해 autonomous 작업을 검증

## 해결하려는 문제

### 1. Agent마다 반복되는 orientation 비용

코딩 에이전트는 작업을 시작할 때마다 repository 구조, 서비스 관계, ownership, 과거 결정 등을 다시 탐색한다. 조직은 이미 이 정보를 알고 있지만 agent가 접근 가능한 구조로 제공되지 않으면 매 세션마다 토큰과 시간이 소비된다.

Spotify가 공개한 동일 task/model/codebase 비교에서는 Portal Workspace context를 선주입했을 때 비용이 $18.08 → $12.21, 시간은 38분 → 13분으로 감소했고 correctness 평가가 4/10 → 8/10으로 개선됐다. 이는 Spotify 자체 실험 결과이며 일반 환경에서 동일하게 재현된다는 의미는 아니다.

### 2. 개인별 Agent 환경 파편화

Agent 사용이 늘면서 CLAUDE.md, MCP, prompt library, rules, plugin 등이 개인 또는 팀별로 분산된다. 한 세션이 학습한 내용을 다른 세션/agent가 재사용하지 못하고, 모델이나 harness를 바꾸면 context를 다시 구축해야 한다.

### 3. Fleet-wide 변경의 복잡성

기존 deterministic source transformation은 dependency bump 같은 단순 변경에는 강하지만 API migration/refactoring처럼 corner case가 많은 작업에서는 변환 스크립트 자체가 복잡해진다. Spotify는 기존 Fleet Management의 target selection/PR workflow는 유지하고, **코드 변환 부분만 agent로 대체**했다.

## 핵심 아키텍처

```text
                     ┌──────────────────────────────┐
                     │ Backstage / Spotify Portal  │
                     │ Catalog / Ownership / ADR   │
                     │ Dependency / Wiki / History │
                     └──────────────┬───────────────┘
                                    │ context
                    ┌───────────────┴────────────────┐
                    │                                │
             Interactive Path                Background/Fleet Path
                    │                                │
              ┌─────▼─────┐                   ┌──────▼─────────┐
              │   Xirp    │                   │ Fleetshift /   │
              │ Command   │                   │ Fleet Mgmt     │
              │ Center    │                   └──────┬─────────┘
              └─────┬─────┘                          │ targets/jobs
                    │                                ▼
       ┌────────────┼────────────┐              ┌───────────┐
       ▼            ▼            ▼              │   Honk    │
 Claude Code    Gemini CLI      Codex            │ Agent SDK │
       │            │            │              └─────┬─────┘
       └──── per-session Git worktree ────┐            │
                                          │      ┌─────▼────────────┐
                                          │      │ Trusted Tools    │
                                          │      │ Build/Test/Lint  │
                                          │      │ CI / MCP         │
                                          │      └─────┬────────────┘
                                          │            │
                                          │      ┌─────▼────────────┐
                                          │      │ Eval/Observability│
                                          │      │ LLM Judge/MLflow │
                                          │      └─────┬────────────┘
                                          │            │
                                          └──────► PR / Results

                 session transcript / metadata / learned context
                                    │
                                    └────────────► Portal
```

## Xirp: Agent Command Center

Xirp는 단일 coding agent가 아니라 **여러 agent harness를 관리하는 상위 실행 환경**이다.

공개된 특징:

- Claude Code, Gemini CLI, Codex 등 여러 harness 지원
- 50개 이상의 병렬 session 운영을 염두에 둔 구조
- 각 session을 별도 Git worktree에서 실행해 동일 repository 병렬 작업 충돌을 줄임
- agent/model과 context를 분리하여 중간에 도구를 바꿔도 working state 유지
- 모델별 price/performance에 따라 작업을 라우팅할 수 있는 vendor-neutral 구조
- Portal 연결 시 catalog/ownership/dependency/architecture context를 session 시작 전에 제공
- session 종료 후 transcript와 metadata를 Portal에 다시 저장하여 후속 agent/session이 이어받을 수 있게 함

핵심은 **Agent = state**로 만들지 않는 것이다. Claude/Codex/Gemini는 교체 가능한 executor이고, project/session context는 별도 계층에 유지한다.

## Portal / Backstage: Context Layer

Spotify 구조에서 가장 중요한 부분은 모델보다 context layer다.

Portal은 다음과 같은 정보를 agent가 조회 가능한 구조로 제공한다.

- component/service metadata
- owner/team
- upstream/downstream dependency
- architectural decision
- wiki/documentation
- project resources
- agent session transcript/metadata
- skills/rules/plugins/MCP configuration

이를 통해 agent가 repository를 처음부터 탐색하면서 이미 조직이 알고 있는 사실을 재발견하는 비용을 줄인다.

Portal MCP를 통해 Xirp를 사용하지 않는 coding agent에서도 동일한 조직 context를 노출할 수 있다는 점도 중요하다.

## Honk: Background Coding Agent

Honk는 interactive coding assistant보다 **대규모 background automation worker**에 가깝다.

초기 Fleet Management는 transformation script를 container job으로 실행하고 PR을 생성하는 deterministic 구조였다. Spotify는 이 파이프라인 전체를 agent로 교체하지 않았다.

대신 다음처럼 역할을 나눴다.

```text
Target discovery / Scheduling / Tracking / PR workflow
                  Fleet Management
                         │
                         ▼
                 Code Transformation
                       Honk
                         │
                         ▼
              Build / Test / Lint / Eval
                         │
                         ▼
                        PR
```

즉 **deterministic orchestration + probabilistic code transformation** 패턴이다.

Honk 내부 실행에 대해서 Spotify는 다음을 공개했다.

- Claude + Agent SDK 사용
- Spotify 자체 harness로 감쌈
- Kubernetes pod에서 session을 병렬 실행
- trusted tools만 제공
- CI에서 여러 OS build를 실행하여 변경 검증
- local MCP로 formatting/linting 등의 tool 제공
- LLM-as-a-judge로 diff 평가
- MLflow tracing
- GCP logging
- agent/LLM을 교체할 수 있도록 내부 CLI abstraction 사용

## Context Feedback Loop

Spotify의 최근 구조에서 특히 참고할 부분은 context가 단방향 RAG가 아니라는 점이다.

```text
Organizational Context
        ↓
Agent Session
        ↓
Code / Decision / Transcript / Metadata
        ↓
Context Layer
        ↓
Next Agent Session
```

즉 세션이 context를 소비하면서 동시에 다음 세션을 위한 context를 생산한다. 이를 통해 팀 단위의 agent memory를 만드는 방향이다.

## Feedback / Verification Loop

Autonomous coding에서는 생성 능력보다 **agent가 스스로 결과를 검증할 수 있는 환경**이 중요하다.

Spotify의 Honk 사례에서는 build/test/lint 같은 deterministic feedback과 LLM judge를 함께 사용한다. 특히 repository 표준화와 테스트 가능성이 높을수록 agent가 자신의 변경을 자동 검증하기 쉬워진다.

이 때문에 Spotify는 agent 도입을 단순 AI tooling이 아니라 Developer Platform/standardization 문제로 본다.

## 장점

### Vendor lock-in 완화

Context/state를 Claude Code나 Codex 내부에 묶지 않고 상위 계층에 두기 때문에 모델과 harness를 교체하기 쉽다.

### 병렬성

Worktree isolation을 사용해 동일 codebase에서 여러 session을 동시에 실행하기 쉽다.

### 조직 지식 재사용

Ownership/dependency/ADR 등을 매 session에서 다시 찾지 않고 초기 context로 제공한다.

### 기존 DevOps 자산 활용

Fleet Management, CI, Backstage를 버리지 않고 agent를 그 위의 transformation engine으로 삽입했다.

### 검증 가능성

Agent에게 build/test/lint/eval loop를 제공해 단순 코드 생성보다 merge 가능한 결과를 목표로 한다.

## 단점 및 한계

### Context Layer 구축 비용

Spotify 방식의 효과는 Backstage catalog와 조직 metadata 품질에 크게 의존한다. 기존 service catalog/ownership/dependency 정보가 부실한 조직은 Portal/Xirp만 도입한다고 같은 효과를 기대하기 어렵다.

### 플랫폼 복잡도

Agent runner, worktree lifecycle, Kubernetes execution, CI, MCP, tracing, evaluation, context storage까지 운영해야 하므로 소규모 팀에는 과할 수 있다.

### Agent-generated PR 증가

Spotify는 AI 도입 후 PR 빈도가 크게 증가했다고 공개했으며, coding bottleneck이 review/decision bottleneck으로 이동하고 있다고 설명한다. 생성량 증가 자체가 생산성 증가를 보장하지 않는다.

### Context freshness / security

조직 context를 agent가 광범위하게 접근하면 권한 관리, 민감 정보 노출, stale documentation 문제가 중요해진다. 공개 자료만으로 Spotify 내부의 세부 authorization 구현은 확인되지 않는다.

### Xirp 세부 구현 비공개 영역

Xirp의 내부 scheduler, persistence schema, routing algorithm, exact isolation/security model 등은 공개 자료만으로 확인되지 않는다. 공개된 제품 설명 이상으로 추측해서는 안 된다.

## 기존 방식과 비교

| 방식 | Context | 병렬 실행 | 모델 교체 | 조직 단위 자동화 |
|---|---|---:|---:|---:|
| 개별 Claude Code/Codex 세션 | 로컬/세션 중심 | 제한적 | context 재구성 필요 | 낮음 |
| CLAUDE.md + MCP | repository 중심 | 가능 | 비교적 가능 | 중간 |
| Xirp + Portal | 조직 context와 session state 분리 | 높음, worktree 기반 | 높음 | 높음 |
| Fleet Management + Honk | 조직/target context | 대규모 background 실행 | harness abstraction | 매우 높음 |

## 활용 아이디어

### 바로 적용 가능: One Worktree per Agent

프로젝트별 agent session을 독립 worktree에 배치하는 구조는 Spotify 전체 플랫폼 없이도 적용할 수 있다.

```text
project/
├─ main workspace
└─ .agents/
   ├─ task-001-worktree
   ├─ task-002-worktree
   └─ task-003-worktree
```

### 바로 적용 가능: Context를 Agent와 분리

`CLAUDE.md` 하나에 모든 지식을 넣기보다 다음처럼 분리하는 것이 Spotify 방향과 유사하다.

```text
Context Service
├─ repository metadata
├─ ownership
├─ dependency graph
├─ ADR
├─ task/session history
└─ reusable skills
        │
        └─ MCP/API
             ├─ Claude Code
             ├─ Codex
             └─ Other Agent
```

### PoC 가치 있음: 메인 비서 + 프로젝트 Agent 구조

여러 프로젝트별 Claude/Codex session을 메인 orchestrator에서 관리하려는 구조에는 Xirp 패턴이 직접적으로 참고된다.

- 메인 세션: Xirp 역할
- 프로젝트별 session: execution agent
- 프로젝트별 worktree/workspace: isolation
- 중앙 DB/문서: Portal 역할
- MCP: context/tool access
- CI/Reviewer: Honk의 verification loop 역할

핵심은 메인 orchestrator가 모든 코드를 직접 이해하는 것이 아니라 **session lifecycle과 context routing을 관리**하도록 만드는 것이다.

### PoC 가치 있음: Fleet-wide maintenance Agent

TeamCity/Perforce/내부 도구 환경에서도 dependency update, API migration, config 변경 같은 반복 작업을 대상으로 다음 구조를 시험할 가치가 있다.

```text
Target Selector
   ↓
Task Queue
   ↓
Agent Worker
   ↓
Build/Test
   ↓
Codex/LLM Review
   ↓
Human Approval
   ↓
Submit/Integrate
```

GitHub PR 대신 Perforce changelist를 artifact로 사용하면 Spotify Fleet Management + Honk 패턴과 유사한 내부 구조를 만들 수 있다.

## 실무 평가

**평가: PoC 가치 매우 높음**

Spotify 사례의 핵심은 새로운 agent framework 자체보다 **Agent Harness + Developer Platform + Context Engineering**의 결합이다.

특히 다음 세 원칙은 그대로 참고할 가치가 높다.

1. **Context는 모델 밖에 둔다.**
2. **Agent마다 독립된 execution workspace를 준다.**
3. **AI에는 코드 변경을 맡기고 scheduling/build/test/review 같은 제어 구조는 deterministic하게 유지한다.**

단순히 Claude Code를 여러 개 실행하는 구조보다 한 단계 위에서 session/context/workspace/verification을 관리하는 Harness를 두는 것이 장기적으로 안정적이다.

## 결론

Spotify의 공개된 agent architecture를 하나의 그림으로 요약하면 **Portal = Memory/Context Plane, Xirp = Interactive Control Plane, Fleet Management = Orchestration Plane, Honk = Autonomous Execution Plane**으로 볼 수 있다.

가장 중요한 설계 포인트는 특정 LLM의 성능이 아니다. 조직이 이미 가지고 있는 지식을 agent가 재사용할 수 있게 구조화하고, agent 실행 상태를 모델에서 분리하며, deterministic feedback loop를 제공하는 것이다.

## 참고 자료

- Spotify Portal, "What we've learned scaling AI coding agents at Spotify" (2026-08-10): https://portal.spotify.com/blog/introducing-xirp
- Spotify Portal, "The Hidden Tax on Your AI Agents" (2026-08-28): https://portal.spotify.com/blog/the-hidden-tax-on-your-ai-agents
- Spotify Engineering, "1,500+ PRs Later: Spotify’s Journey with Our Background Coding Agent (Honk, Part 1)" (2025-11)
- Spotify Engineering, "Background Coding Agents: Context Engineering (Honk, Part 2)" (2025-11)
- Spotify Engineering, "Background Coding Agents: Predictable Results Through Strong Feedback Loops (Honk, Part 3)" (2025-12)
- Spotify Engineering, "Background Coding Agents: Supercharging Downstream Consumer Dataset Migrations (Honk, Part 4)" (2026-04)
- Spotify Engineering, "Coding Is No Longer the Constraint: Scaling Developer Experience to Teams and Agents at Spotify" (2026-06)
