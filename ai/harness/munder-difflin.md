---
title: Munder Difflin
category: harness
tags:
  - ai
  - agent
  - harness
  - multi-agent
  - claude-code
  - codex
  - orchestration
  - local-first
source: https://github.com/chaitanyagiri/munder-difflin
updated: 2026-09-10
---

# Munder Difflin

> Claude Code, Codex, Gemini 계열 등 기존 터미널 코딩 에이전트를 실제 PTY 프로세스로 실행하고, 파일 기반 Hive·장기 메모리·메일박스·오케스트레이터를 얹어 하나의 로컬 멀티 에이전트 조직으로 만드는 데스크톱 하네스.

## 프로젝트 개요

Munder Difflin은 새로운 에이전트 런타임을 만드는 대신 사용자가 이미 사용하는 터미널 기반 코딩 CLI를 그대로 프로세스로 실행한다. 각 세션은 `node-pty` 기반 실제 터미널이며 Electron/React/xterm.js로 제어되고 Pixi.js의 2D 사무실 UI에서 에이전트 아바타로 표현된다.

지원 대상으로 Claude Code, OpenAI Codex, Gemini/Antigravity, Grok, Kimi Code, Qwen, OpenCode, Crush, pi.dev, GitHub Copilot CLI, Cursor 및 custom command를 제시한다. Ollama, LM Studio, vLLM 같은 로컬 모델 연결도 지원한다.

핵심은 UI보다 `Hive`라는 로컬 협업 계층이다. 각 에이전트에 identity, memory, inbox/outbox를 주고 중앙 orchestrator(Michael/GOD)가 작업 배정과 에스컬레이션을 담당한다.

조사 기준: 2026-09-10. README는 v0.4.6 상태를 설명하고 있으며 CHANGELOG에는 이후 Unreleased 변경도 존재한다.

## 해결하려는 문제

개별 Claude Code/Codex 세션을 여러 개 띄우는 방식은 다음 문제가 있다.

- 에이전트 사이에 작업 배정과 통신 규약이 없다.
- 세션이 끝나면 학습한 정보가 단절되기 쉽다.
- 병렬 에이전트가 동일 파일이나 Git index를 건드리면 충돌할 수 있다.
- 사용자가 모든 에이전트에게 직접 지시하고 상태를 추적해야 한다.
- 자율 실행이 길어지면 루프, 비용 폭주, destructive operation을 통제하기 어렵다.

Munder Difflin은 기존 CLI를 교체하지 않고 그 위에 orchestration, mailbox, memory, audit, budget, human gate를 추가하는 접근을 취한다.

## 핵심 기능

1. **기존 CLI를 실제 프로세스로 실행** — provider API를 자체 추상화하기보다 사용자가 이미 인증한 CLI와 구독을 활용한다.
2. **GOD/Michael orchestrator** — 사용자는 기본적으로 한 orchestrator와 대화하고, orchestrator가 worker에게 업무를 배정한다.
3. **Hive 파일 기반 협업** — `registry.json`, `board.md`, `tasks.json`, `log.jsonl`, 에이전트별 inbox/outbox/memory로 상태를 공유한다.
4. **지속 메모리** — 에이전트별 markdown memory와 공유 검색/semantic recall을 제공한다.
5. **병렬 작업 격리** — per-agent working directory 및 선택적 Git worktree를 사용한다.
6. **Human-in-the-loop / circuit breaker** — 비용, scope, destructive operation 등을 사람에게 올리고 반복/오류/예산 폭주 시 steer → constrain → stop 단계로 제한한다.
7. **관찰 가능성** — live terminal, activity log, token/cost telemetry, task board, CI watcher 등을 한 UI에 모은다.
8. **Skills 및 외부 입력** — Skills catalog, Slack/webhook, scheduled missions/heartbeat 등을 제공한다.

## 아키텍처

```text
                         User
                          |
                          v
                +-------------------+
                | Michael / GOD     |
                | Orchestrator      |
                +---------+---------+
                          |
             assign / route / adjudicate
          +---------------+---------------+
          |               |               |
          v               v               v
   +-------------+ +-------------+ +-------------+
   | Claude Code | | Codex CLI   | | Gemini/...  |
   | PTY Agent A | | PTY Agent B | | PTY Agent C |
   +------+------+ +------+------+ +------+------+
          |               |               |
          +---------------+---------------+
                          |
                          v
                 +------------------+
                 | Local Hive       |
                 |------------------|
                 | registry.json    |
                 | board.md         |
                 | tasks.json       |
                 | log.jsonl        |
                 | agents/*/        |
                 | memory.md        |
                 | inbox / outbox   |
                 +---------+--------+
                           |
              single committer / audit
                           v
                         Git

Renderer: Electron + React + xterm.js + Pixi.js
Agent process: node-pty -> actual coding CLI
Optional memory/model layer: semantic index, Ollama / LM Studio / vLLM
```

### Hive의 중요한 설계 결정

Hive 설계 문서는 몇 가지 충돌 회피 원칙을 명시한다.

- **Git single-committer**: 에이전트가 직접 Git commit을 하지 않고 Electron main process만 commit한다. 여러 프로세스의 `.git/index.lock` 충돌을 피하기 위한 구조다.
- **Single-writer-per-file**: 에이전트는 자신의 `agents/<id>/` 영역만 쓰고 router가 outbox → inbox 전달을 담당한다.
- **Markdown-first memory**: 작은 규모의 agent fleet에서 외부 vector-memory runtime을 강제하지 않고 markdown과 검색 계층을 기본으로 둔다.
- **Lifecycle 기반 autonomous loop**: 작업 종료 시 mailbox를 확인해 후속 작업이 있으면 실행을 이어가는 구조를 사용한다.

## 실행 흐름

```text
사용자 요청
   ↓
Michael이 요청 해석
   ↓
Task ledger / 역할에 따라 agent 선택
   ↓
각 CLI agent를 PTY에서 실행
   ↓
Agent가 작업 + memory 참조
   ↓
outbox에 협업 요청 작성
   ↓
Router가 상대 inbox로 전달
   ↓
상대 agent가 lifecycle hook에서 inbox 처리
   ↓
결과 / 상태를 Hive에 기록
   ↓
Michael이 종합·추가 지시 또는 Human escalation
   ↓
사용자에게 결과
```

이 구조는 단순히 여러 CLI 창을 동시에 띄우는 것보다 actor/mailbox + blackboard + supervisor 패턴에 가깝다.

## 장점

- **기존 Claude Code/Codex 투자 재사용**: 별도 agent SDK로 전면 이전하지 않고 현재 CLI를 실행 단위로 사용한다.
- **Provider 혼합 가능**: 작업 성격에 따라 Claude, Codex, Gemini, 로컬 모델 등을 다른 worker로 둘 수 있다.
- **로컬 우선**: 협업 상태와 메모리를 파일/Git 중심으로 관리해 관찰과 백업이 쉽다.
- **병렬 작업 충돌을 구조적으로 고려**: single-writer, router, worktree 같은 원칙이 명시되어 있다.
- **가시성이 높음**: 터미널, task, 메시지, memory, 비용을 한 곳에서 관찰할 수 있다.
- **오케스트레이터 패턴을 제품 수준으로 구현**: 단순 prompt 예제가 아니라 실행기, 통신, 메모리, UI, safety까지 묶었다.

## 단점 및 한계

### 프로젝트 성숙도

빠르게 기능이 추가되고 있지만 이슈 트래커에는 provider spawn, memory condensation, Linux `pty.node`, sandbox working directory, circuit breaker progress detection 등 핵심 실행 경로와 관련된 버그가 보고되어 있다. 실무 핵심 파이프라인에 즉시 의존하기보다는 PoC/개인 개발 환경부터 검증하는 편이 안전하다.

### 자원 사용량

각 worker가 실제 CLI 프로세스이므로 agent 수가 늘수록 CPU/RAM 및 모델 사용량이 증가한다. 전체 hive process tree에 aggregate CPU limit을 두자는 이슈도 존재한다.

### 토큰 비용

여러 agent가 독립 context를 유지하고 서로 메시지를 주고받기 때문에 단일-agent 방식보다 총 token 사용량이 증가할 가능성이 높다. budget/telemetry는 이를 관찰하고 제한하기 위한 기능이지, 멀티 에이전트 자체가 token-efficient하다는 의미는 아니다.

### 파일 기반 coordination의 trade-off

plain file + Git 방식은 단순하고 audit하기 쉽지만 대규모 agent fleet이나 고빈도 메시징에서는 DB/message broker 방식보다 확장성이 제한될 수 있다. 프로젝트 자체도 주 사용 규모를 비교적 작은 local agent fleet으로 보는 설계가 강하다.

### Enterprise 환경

회사 PC에서 여러 외부 CLI/provider를 동시에 사용하려면 인증, source-code 반출 정책, telemetry, local secret 관리, executable allow-list, proxy/망분리 정책을 별도로 검토해야 한다. Windows 빌드는 제공되지만 실제 사내 보안 정책과의 호환성은 별도 검증이 필요하다.

## 활용 사례

- 복잡한 기능 개발을 planner / implementer / reviewer로 나눠 병렬 실행
- Claude Code가 분석하고 Codex가 독립 코드 리뷰를 수행하는 cross-model workflow
- 장시간 migration/refactoring 작업을 여러 worker에게 분할
- CI failure watcher가 문제를 감지하고 worker에게 수정 작업을 할당
- 로컬 모델을 저비용 worker로 두고 고급 모델은 어려운 reasoning/review에만 배치
- 여러 저장소나 worktree를 동시에 다루는 autonomous coding office

## 기존 방식과 비교

| 방식 | 장점 | 한계 | Munder Difflin과 차이 |
|---|---|---|---|
| Claude Code/Codex 단일 세션 | 단순, context 집중, 비용 예측 쉬움 | 병렬화/역할 분리 제한 | Munder Difflin은 여러 실제 CLI를 orchestration |
| 단순 shell multiplexer | 기존 CLI 그대로 병렬 실행 | 통신/메모리/작업 장부 없음 | Hive가 coordination layer 제공 |
| Agent SDK 기반 framework | workflow를 코드로 정밀하게 설계 | 기존 CLI 사용 경험/구독 재사용이 어려울 수 있음 | CLI 자체를 runtime으로 취급 |
| 파일 기반 자체 harness | 조직 환경에 맞게 최소 구성 가능 | UI, memory, safety, telemetry 직접 구현 필요 | Munder Difflin은 이를 통합 desktop product로 제공 |

## 현재 AI Workflow/Harness 관점의 활용 아이디어

### 바로 적용 가능

**아키텍처 패턴 참고** 가치가 높다. 특히 다음은 자체 harness에 그대로 참고하기 좋다.

- `single-writer-per-file`
- 중앙 router가 inbox/outbox 전달
- append-only event log
- agent별 memory + shared blackboard 분리
- orchestrator가 routine request를 처리하고 critical request만 human escalation
- worktree 기반 병렬 작업 격리

### PoC 가치 있음

Claude Code + Codex를 동시에 사용하는 로컬 개발 업무에서 2~4개 agent 규모로 실제 효율을 측정할 가치가 있다.

예시:

```text
Orchestrator: Claude
Analysis: Claude high-reasoning
Implementation: Claude/Codex
Review: Codex
Cheap worker: local model
```

측정해야 할 지표는 작업 완료 시간, 총 token, human intervention 횟수, merge conflict, 재작업률이다.

### 아이디어 참고

2D office UI는 실무 필수 요소는 아니지만 agent 상태를 사람이 직관적으로 파악하게 만드는 observability UX 사례로 볼 수 있다. 실제 사내 도구라면 avatar보다 task/state/dependency/token/error 중심 dashboard가 더 실용적일 가능성이 높다.

### 현재는 신중

대규모 Enterprise automation의 중앙 실행 플랫폼으로 바로 채택하기에는 아직 변화 속도와 핵심 버그가 부담이다. 먼저 설계 패턴을 흡수하고 작은 팀/로컬 PoC에서 안정성을 확인하는 것이 적합하다.

## 결론

Munder Difflin의 가장 중요한 점은 '에이전트를 사무실 캐릭터로 보여준다'는 UI가 아니다. **이미 존재하는 Claude Code/Codex 같은 강력한 CLI를 수정하지 않고, 그 바깥에 orchestration/communication/memory/safety 계층을 씌운다**는 점이다.

특히 자체 AI harness를 설계한다면 Hive의 single-committer Git, single-writer 파일, mailbox router, shared blackboard, persistent memory 패턴은 참고 가치가 높다. 반면 여러 실제 CLI를 동시에 돌리는 만큼 자원·token 비용과 운영 복잡도는 반드시 측정해야 한다.

**도입 평가: PoC 가치 높음 / 아키텍처 참고 가치 매우 높음 / Enterprise 즉시 도입은 보류.**

## 참고 자료

- Repository: https://github.com/chaitanyagiri/munder-difflin
- README: https://github.com/chaitanyagiri/munder-difflin/blob/main/README.md
- Hive design: https://github.com/chaitanyagiri/munder-difflin/blob/main/HIVE.md
- Changelog: https://github.com/chaitanyagiri/munder-difflin/blob/main/CHANGELOG.md
- Memory Graph spec: https://github.com/chaitanyagiri/munder-difflin/blob/main/MEMORY_GRAPH_SPEC.md
- Issues: https://github.com/chaitanyagiri/munder-difflin/issues
