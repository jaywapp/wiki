---
title: AI Harness Scout - 2026-09-10
category: news
tags:
  - ai
  - harness
  - agent
  - claude-code
  - codex
  - context-engineering
source: GitHub discovery scan
updated: 2026-09-10
---

# AI Harness Scout - 2026-09-10

> GitHub에서 최근 활동이 확인되는 AI coding harness와 harness/context engineering 방법론을 탐색하고, Claude Code + Codex + Perforce 중심 개발 환경에 적용할 가치를 평가한 테스트 리포트.

## 한줄 요약

이번 스캔에서 가장 주목할 흐름은 **모델 자체보다 durable state, task lifecycle, verification gate, runtime-neutral adapter를 외부 Harness가 책임지는 방향**이며, 현재 내부 Harness에는 `repo-harness`의 file-backed handoff와 `superharness`의 lifecycle/ledger 구조를 우선 참고할 가치가 있다.

## 주요 발견

### 1. superharness

Source: https://github.com/artificemachine/superharness

Claude Code, Codex CLI, Gemini CLI, OpenCode, Pi 등을 하나의 프로젝트에서 조율하는 multi-agent orchestration harness. SQLite 기반 shared contract, queue delegation, task lifecycle, handoff/ledger, autonomous dispatch와 dashboard를 제공한다.

**주목 포인트**
- 세션이 종료되어도 작업 상태를 durable state로 유지
- 여러 coding agent가 같은 프로젝트에서 충돌하지 않도록 task ownership/lifecycle 관리
- handoff와 ledger를 명시적 데이터로 관리
- watcher/heartbeat/retry/approval/discussion 등 운영 계층을 포함

**평가:** PoC 가치 높음

현재의 Claude/Analysis/Work/Review 역할 분리 구조에서 DB queue와 task lifecycle을 설계할 때 참고 가치가 크다. 단, Git 중심 가정이 Perforce 환경에 그대로 맞는지는 별도 검증이 필요하다.

### 2. AOS Harness

Source: https://github.com/aos-engineer/harness

Agentic Orchestration System. Claude Code, Codex, Gemini, Pi 등을 adapter로 연결하고 specialized agent를 deliberation/execution team으로 구성한다. 최근 구조에서는 vendor CLI adapter를 core에서 분리된 패키지로 취급한다.

**주목 포인트**
- Harness core와 vendor runtime adapter 분리
- Claude/Codex를 동일 orchestration layer 아래에서 교체 가능하게 만드는 구조
- task decomposition, code review, security scan 등의 reusable skill 제공

**평가:** PoC

현재 내부 Harness에서도 `ClaudeRunner`, `CodexRunner`처럼 runtime adapter를 명확히 분리하면 향후 모델/CLI 교체 비용을 줄일 수 있다.

### 3. repo-harness

Source: https://github.com/Ancienttwo/repo-harness

Claude Code와 Codex 세션 사이의 context, plan, handoff, checks, review evidence를 repository 파일에 기록하는 file-backed workflow harness.

**주목 포인트**
- chat history 대신 repository file을 continuity의 SSoT로 사용
- 다음 agent/session이 이전 대화가 아니라 persisted artifact에서 작업을 이어감
- plan/handoff/check/review evidence를 분리

**평가:** 바로 적용 아이디어

Perforce 환경과 특히 궁합이 좋다. Git branch/worktree 없이도 workspace 내부의 `.ai/` 또는 별도 state directory에 task contract, handoff, review evidence를 저장하는 방식으로 적용할 수 있다. 기존 DB 중심 orchestration과도 충돌하지 않고, DB에는 scheduling state를 두고 repository에는 작업 문맥과 증거를 두는 hybrid 구조가 가능하다.

### 4. Harness Kit

Source: https://github.com/deepklarity/harness-kit

multi-agent orchestration CLI, proof-of-work task board, TDD-first execution, structured root-cause analysis, knowledge compounding, cost-aware delegation을 묶은 Harness Engineering toolkit.

**주목 포인트**
- 작업을 dependency graph로 표현
- 완료 여부뿐 아니라 evidence를 task에 결합
- 모델별 비용/역할을 고려한 delegation
- TDD/verification을 workflow의 외부 규칙으로 승격

**평가:** 아이디어 참고 ~ PoC

현재 Review 단계를 단순 LLM 검토가 아니라 test/build/log 등의 evidence 기반 gate로 강화하는 데 참고할 가치가 있다.

### 5. agent-harness-dev

Source: https://github.com/WakeUp-Jin/agent-harness-dev

프레임워크가 아니라 AI coding assistant가 Agent backend를 설계할 때 소비하는 Skill. Context Engineering과 Harness Engineering 원칙을 executable guidance로 패키징한다.

**평가:** 아이디어 참고

Harness 구현 자체보다 내부 개발용 Skill을 만드는 방식이 흥미롭다. Harness architecture 규칙을 긴 전역 프롬프트에 넣는 대신 필요할 때 로드되는 Skill로 분리하는 패턴은 token 최적화에도 연결된다.

## 공통 아키텍처 흐름

```text
User / Work Item
       |
       v
 Orchestrator
       |
       +--> Task Contract / Durable State
       |
       +--> Runtime Adapter
       |      +--> Claude Code
       |      +--> Codex
       |      +--> Other CLI
       |
       v
 Worker Agent
       |
       +--> Code / Tool execution
       +--> Build / Test / Evidence
       |
       v
 Verification Gate
       |
       +--> Review Agent
       +--> deterministic checks
       |
       v
 Handoff / Ledger / Knowledge
       |
       +--> next task/session
       +--> human approval
```

## 이번 스캔에서 보이는 방법론 변화

### Prompt Engineering → Context Engineering → Harness Engineering

최근 프로젝트들은 agent의 성능 문제를 prompt 하나로 해결하려 하기보다 다음 세 계층으로 분리하는 경향이 강하다.

1. **Context**: 이번 turn에 무엇을 보여줄 것인가
2. **Harness**: agent가 어떤 상태/도구/권한/feedback loop 안에서 움직이는가
3. **Evaluation/Verification**: 완료를 누가, 어떤 evidence로 인정하는가

특히 `durable state + verification gate + runtime adapter` 조합이 반복적으로 등장한다.

## 현재 내부 Harness에 적용할 아이디어

### 바로 적용 가능

**File-backed handoff artifact**

DB queue만으로 작업 상태를 전달하지 않고 workspace에 최소 artifact를 남긴다.

```text
.ai/
  task.json
  context.md
  handoff.md
  evidence.jsonl
```

Perforce에서는 이 파일을 반드시 submit할 필요 없이 local workspace state 또는 별도 state root로 관리할 수 있다.

### PoC 가치 있음

**Runtime Adapter Layer**

```text
Orchestrator
   |
IAgentRuntime
   +-- ClaudeCodeRuntime
   +-- CodexRuntime
   +-- LocalModelRuntime
```

Orchestrator가 Claude/Codex CLI 세부 명령이나 output format을 직접 알지 않게 한다.

**Evidence-based Review Gate**

Reviewer가 코드만 읽는 구조에서 다음과 같이 변경한다.

```text
Worker
  -> build
  -> test
  -> static checks
  -> evidence bundle
  -> Codex Review
  -> pass / retry / human
```

### 아이디어 참고

- heartbeat / stale task detection
- append-only execution ledger
- retry budget
- human approval boundary
- dependency graph 기반 parallel dispatch
- architecture guidance를 progressive-disclosure Skill로 분리

## Perforce 환경 관점

Git 기반 Harness를 그대로 도입하기보다는 orchestration 개념만 가져오는 것이 적합하다.

특히 Git worktree/branch isolation 대신 다음 매핑을 검토할 수 있다.

```text
Git Harness                Perforce Harness
-----------------------------------------------
worktree / branch     ->   agent workspace
commit                ->   pending changelist
PR                    ->   review / submit gate
Git diff              ->   p4 diff / opened
merge conflict        ->   resolve / ownership gate
repo state file       ->   local .ai state or DB
```

따라서 현재 환경에서는 **one workspace per agent + pending CL ownership + durable handoff + evidence gate** 조합이 가장 현실적인 방향이다.

## 결론

이번 테스트에서 당장 새 Framework를 도입하는 것보다 가치가 높은 것은 다음 세 가지 패턴이다.

1. `repo-harness`: file-backed continuity/handoff
2. `superharness`: task lifecycle + ledger + autonomous dispatch
3. `AOS Harness`: vendor-neutral runtime adapter

현재 Harness에 이 세 가지를 결합하면 모델을 추가하는 것보다 운영 안정성과 세션 간 연속성을 크게 개선할 가능성이 있다. 다음 PoC 우선순위는 **Runtime Adapter → durable handoff → evidence-based review gate** 순서를 권장한다.

## 참고 자료

- https://github.com/artificemachine/superharness
- https://github.com/aos-engineer/harness
- https://github.com/Ancienttwo/repo-harness
- https://github.com/deepklarity/harness-kit
- https://github.com/WakeUp-Jin/agent-harness-dev
