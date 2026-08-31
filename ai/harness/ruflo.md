---
title: Ruflo
category: harness
tags:
  - ai
  - agent
  - harness
  - claude-code
  - codex
  - multi-agent
  - mcp
  - memory
source: https://github.com/ruvnet/ruflo
updated: 2026-08-31
---

# Ruflo

> Claude Code와 Codex 위에 멀티 에이전트 오케스트레이션, 장기 메모리, 학습 루프, MCP, 훅, 보안 및 분산 협업을 얹는 대규모 Agent Meta-Harness.

## 프로젝트 개요

Ruflo는 과거 Claude Flow 계열에서 발전한 에이전트 실행·조정 계층이다. 프로젝트가 스스로 제시하는 핵심 정의는 `Agent = Model + Harness`이며, Claude Code나 Codex가 실제 작업을 수행할 때 필요한 도구, 메모리, 반복 실행, 샌드박스, 제어 계층을 제공하는 것을 목표로 한다.

단순한 Agent Framework라기보다 기존 Coding Agent를 감싸는 Meta-Harness에 가깝다. CLI 설치 방식에서는 agent definitions, skills, MCP server, hooks, daemon 등을 프로젝트에 구성하고 작업을 자동 라우팅한다.

조사 기준 최신 릴리스는 v3.38.20(2026-08-24)이며 main 브랜치에는 2026-08-30까지 수정 커밋이 확인된다.

## 해결하려는 문제

Claude Code/Codex를 단독으로 사용할 때 복잡한 작업은 하나의 세션과 하나의 에이전트에 집중되기 쉽다. Ruflo는 이를 다음과 같이 확장하려 한다.

- 작업을 역할별 전문 Agent로 분리
- 여러 Agent를 Swarm으로 조정
- 세션을 넘어 기억을 유지
- 성공 패턴을 학습하여 이후 라우팅에 활용
- MCP와 Hook을 통해 자동 실행 흐름 구성
- 여러 머신의 Agent를 Federation으로 연결
- 보안/감사/관측 계층을 Harness에 포함

즉, 모델 자체의 지능을 높이는 것이 아니라 모델 주변의 실행 시스템을 강화하는 접근이다.

## 핵심 기능

### Multi-Agent / Swarm

README 기준 CLI 설치 트랙은 다수의 전문 Agent와 명령, Skill을 제공하며 `ruflo-swarm`, `ruflo-autopilot`, `ruflo-workflows` 등의 플러그인으로 역할 분담과 반복 실행을 구성한다.

### Memory / RAG

AgentDB, RAG Memory, RuVector, Knowledge Graph, RVF 등을 통해 세션 간 기억과 검색을 제공한다. 단순 Vector Search를 넘어 Graph RAG 및 관계 탐색까지 확장하려는 구조다.

### Learning Loop

작업 결과와 성공 패턴을 저장하고 이후 라우팅과 실행 전략에 재사용하는 self-learning/self-optimizing 구조를 지향한다.

### MCP / Hooks / Daemon

CLI 설치 시 MCP server, hooks, daemon이 함께 구성된다. 사용자는 Claude Code를 평소처럼 사용하면서 hook이 작업을 분류하고 필요한 Agent/Memory 기능을 호출하도록 설계되어 있다.

### Plugin Architecture

Core/Swarm/Autopilot/Workflows/Federation, Memory, Intelligence, Code Quality, Security, Architecture, Observability 등으로 기능을 플러그인화한다. 필요한 기능만 Claude Code plugin 방식으로 가볍게 도입하는 경로도 제공한다.

### Claude Code + Codex

Claude Code 중심에서 출발했지만 현재는 Codex package/plugin도 포함하며 README는 Ruflo를 Claude Code와 Codex를 위한 meta-harness로 정의한다.

## 아키텍처

공식 README가 제시하는 기본 흐름은 다음과 같다.

```text
User
  |
  v
Ruflo CLI / MCP
  |
  v
Router
  |
  v
Swarm
  |
  +--> Specialized Agent A
  +--> Specialized Agent B
  +--> Specialized Agent C
  |
  v
Memory / RAG / Knowledge Graph
  |
  v
LLM Providers
  |
  +--------------------+
                       |
               Learning Loop
                       |
                       +--> Router / Memory
```

실제 저장소는 TypeScript/Node CLI 계층과 Rust/Cargo 구성, Claude/Codex 관련 package, plugin marketplace, MCP 및 memory/vector 계층을 함께 가진 큰 monorepo 성격이다. Node >=20을 요구하며 native SQLite, RuVector 계열 등 일부 기능은 optional/native dependency의 영향을 받는다.

## 설치 방식

### Claude Code Plugin

가볍게 특정 기능을 시험할 때 적합하다. Workspace에 Ruflo 전체 scaffold를 만들지 않고 slash command, skill, agent definition 중심으로 사용할 수 있다. 다만 full hook/daemon/orchestration 경험과는 차이가 있다.

### CLI `npx ruflo init`

전체 Harness를 사용하는 방식이다. `.claude/`, `.claude-flow/`, `CLAUDE.md` 등의 파일과 MCP/hooks/daemon을 구성한다. 실제 Ruflo의 핵심 가치는 이 경로에서 드러난다.

## 장점

### Coding Agent를 '시스템'으로 확장

Claude Code/Codex를 단순 대화형 코딩 도구가 아니라 Router → Worker → Memory → Review/Feedback 구조로 확장할 수 있다.

### 구성 요소가 매우 풍부함

Swarm, RAG, Knowledge Graph, Browser, Test Generation, Security Audit, Observability, ADR/DDD 등 Agent 개발 환경에서 필요한 기능을 하나의 생태계로 제공한다.

### Harness 연구용 레퍼런스 가치

모든 기능을 실제 도입하지 않더라도 Agent orchestration, memory, hook, routing, learning loop를 어떻게 묶는지 연구하기 좋은 구현체다.

### Claude Code에 점진적 도입 가능

Plugin 방식으로 일부 기능부터 시험하고, 가치가 확인되면 CLI 기반 전체 Harness로 확장할 수 있다.

## 단점 및 한계

### 매우 큰 복잡도

기능과 plugin, agent, command, memory 계층이 많아 작은 팀이나 단순 Coding Agent 용도에서는 Ruflo 자체를 이해하고 운영하는 비용이 커질 수 있다.

### 안정성 주의

2026-08 릴리스에서도 dependency graph publish race로 v3.38.17/18이 폐기되고 v3.38.19로 교체되는 일이 있었다. 릴리스 노트에는 병렬 subagent와 background daemon이 같은 checkout/package.json을 건드리며 publish race가 발생한 postmortem이 공개되어 있다.

이는 역설적으로 multi-agent harness가 공유 작업공간을 어떻게 격리해야 하는지 보여주는 중요한 사례다.

### Memory 계층 성숙도

최근 이슈에는 SQLite persistence fallback, encrypted memory migration, backup integrity, AgentDB export mismatch 등이 보고되었다. 장기 메모리를 핵심 업무 데이터에 사용한다면 백업 및 무결성 검증을 별도로 두는 편이 안전하다.

### Windows / Native Dependency

v3.38.19에서 Windows CI가 VS2026 환경 변화로 native module 빌드에 실패해 `windows-2022`로 고정한 사례가 있다. `better-sqlite3`, HNSW 계열 등 native dependency가 있어 Windows Enterprise 환경에서는 설치/업데이트 검증이 필요하다.

### Token / Cost

Swarm과 다수 Agent를 적극 사용하면 단일 Agent보다 모델 호출과 context 전달 횟수가 증가할 가능성이 높다. Ruflo가 이를 라우팅/메모리로 최적화하려 하지만 실제 비용 절감 여부는 업무별 측정이 필요하며 저장소 자료만으로 일반적인 절감률은 확인되지 않는다.

### 과도한 자동화 위험

Autopilot, daemon, self-learning을 동시에 사용하면 실행 흐름이 사용자 눈에 덜 명확해질 수 있다. 코드 변경 권한, checkout 격리, publish/deploy 권한은 특히 보수적으로 설계해야 한다.

## 활용 사례

- 대규모 코드베이스에서 분석/구현/테스트/리뷰 Agent 분리
- Claude Code 작업 이력을 Memory에 축적하여 반복 조사 감소
- 테스트 생성, 보안 감사, 문서화 Agent를 개발 workflow에 추가
- 장시간 작업을 daemon/autopilot workflow로 운영
- 여러 개발 머신 또는 sandbox의 Agent 협업 실험
- 자체 Agent Harness 설계 시 orchestration/memory/plugin 구조 참고

## 기존 방식과 비교

| 방식 | 특징 | Ruflo 대비 |
|---|---|---|
| Claude Code 단독 | 단순하고 공식 경험에 가까움 | Ruflo가 memory/swarm/hooks를 추가하지만 복잡도 증가 |
| Codex 단독 | Coding Agent 실행에 집중 | Ruflo는 여러 Agent와 memory/orchestration 계층 추가 |
| 직접 만든 Orchestrator | 업무에 맞춰 최소 구조 설계 가능 | Ruflo는 훨씬 많은 기능을 즉시 제공하지만 제어 범위가 넓고 무거움 |
| 일반 Agent Framework | 애플리케이션 Agent 구현 중심 | Ruflo는 Claude Code/Codex라는 기존 coding harness 위에 meta-harness를 얹는 성격이 강함 |

## 활용 아이디어

### 바로 적용 가능

전체 설치보다는 Claude Code Plugin 방식으로 memory, swarm, testgen 등 관심 기능을 별도 sandbox repository에서 시험한다.

### PoC 가치 있음

`Analysis -> Work -> Review`처럼 역할이 명확한 개발 Harness에 Ruflo의 Router/Swarm/Memory 패턴을 대입해 비교한다. 특히 Agent마다 별도 worktree/workspace를 부여하고 공유 checkout 동시 수정은 금지하는 실험이 중요하다.

### 아이디어 참고

Ruflo의 가장 큰 가치는 모든 plugin을 도입하는 것보다 다음 구조를 자체 Harness에 차용하는 데 있다.

```text
Intent Router
   -> Role-specialized Agents
   -> Shared/Scoped Memory
   -> Tool/MCP Layer
   -> Verification Agent
   -> Learning/Pattern Store
```

Agent가 작업할수록 성공 패턴을 축적하고 다음 작업의 라우팅 및 context 구성에 활용하는 구조는 사내 Agent Platform 설계에 특히 참고할 만하다.

### 현재는 도입 가치 낮음

작은 저장소에서 Claude Code/Codex 하나로 충분한 경우, 혹은 변경 추적/보안 정책상 autonomous daemon과 self-modifying workspace 구성이 허용되지 않는 Enterprise 환경에서는 전체 Ruflo 도입보다 필요한 패턴만 선별 구현하는 편이 낫다.

## 실무 평가

Ruflo는 현재 공개된 Coding Agent Harness 중에서도 범위가 매우 큰 편이며 '모델 선택'보다 '모델 주변 실행 시스템'이 중요해지는 흐름을 잘 보여준다. 특히 Claude Code와 Codex를 Worker로 보고 그 위에 Router, Memory, Swarm, Learning을 올리는 관점은 실무 Harness 설계에 참고 가치가 높다.

반면 전체 도입은 운영 복잡도와 native dependency, memory 안정성, 자동화 권한 관리 부담이 크다. 따라서 Production에 바로 전면 적용하기보다 **PoC 가치 높음 / 아키텍처 참고 가치 매우 높음**으로 평가한다.

## 결론

Ruflo를 단순 '100개 Agent 모음'으로 보는 것보다 **Claude Code/Codex를 실행 엔진으로 활용하는 상위 Meta-Harness**로 이해하는 것이 정확하다. 특히 Swarm 자체보다 Router + Memory + Hook + Verification + Learning Loop를 하나의 실행 계층으로 묶는 설계가 핵심이다.

권장 접근은 전체 기능을 한 번에 도입하는 것이 아니라 Plugin 또는 격리된 PoC에서 orchestration과 memory 패턴을 검증한 뒤 필요한 부분만 기존 개발 Harness에 흡수하는 것이다.

## 참고 자료

- https://github.com/ruvnet/ruflo
- https://github.com/ruvnet/ruflo/releases
- https://github.com/ruvnet/ruflo/issues
- https://github.com/ruvnet/ruvector
