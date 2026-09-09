---
title: ECC
category: harness
tags:
  - ai
  - agent
  - harness
  - claude-code
  - codex
  - skills
  - security
source: https://github.com/affaan-m/ECC
updated: 2026-09-09
---

# ECC

> 코딩 에이전트에 `plan → test → implement → review → verify → remember → improve` 개발 루프와 Skills·Agents·Hooks·Memory·Security를 설치해, 단순 코딩 도구를 반복 가능한 엔지니어링 시스템으로 만드는 멀티 하네스 레이어.

## 프로젝트 개요

ECC는 개별 프롬프트나 Skill 모음보다는 **agent harness operating system**을 지향하는 오픈소스 프로젝트다. Claude Code를 가장 완전하게 지원하고, Codex에는 공식 sync/native plugin 경로를 제공하며 Cursor, OpenCode, Gemini, Zed 등에는 기능 범위가 제한된 adapter를 제공한다.

2026-09-09 조사 기준 README는 68 Agents, 286 Skills, 94 legacy command shims와 Hooks, Rules, Memory, Continuous Learning, AgentShield를 하나의 배포 단위로 설명한다. MIT 라이선스 OSS이며 별도의 ECC Tools GitHub App/Pro 서비스도 존재한다.

현재 최신 릴리스는 v2.2.1(2026-09-08)로, v2.2의 guided installer 이후 보안·설치 안정성을 보강한 패치다.

## 해결하려는 문제

코딩 에이전트는 코드를 생성할 수 있지만 실제 개발 업무에서는 다음이 반복적으로 필요하다.

- 구현 전에 계획 수립
- 테스트 우선 또는 검증 가능한 구현
- 구현 후 별도 관점의 리뷰
- 세션 간 지식 보존
- 반복 성공 패턴의 Skill화
- Hook/MCP/명령 실행의 안전성 통제
- Claude Code, Codex 등 서로 다른 하네스 간 설정 이식

이를 매번 프롬프트에 다시 적는 대신 ECC는 실행 규칙과 자산을 하네스에 설치하여 개발 프로세스 자체를 지속 가능한 런타임으로 만든다.

## 핵심 기능

### 1. Skills / Agents / Commands

대규모 Skill 라이브러리와 역할별 Agent를 제공한다. planning, review, build repair, security, architecture, TDD, research, documentation, frontend, data/ML, operations 등 개발 사이클 전반을 다룬다.

Commands는 기존 진입점 호환을 위한 shim 성격이 강하며 프로젝트는 skills-first surface로 이동 중이다.

### 2. Hooks와 실행 정책

에이전트 실행 과정에 Hook을 넣어 세션/도구 실행/검증/안전 정책을 자동 적용한다. 사용자가 매 프롬프트마다 규칙을 기억할 필요를 줄이는 것이 목적이다.

### 3. Memory와 Continuous Learning

세션 요약, 기억, instinct/learning 계층을 이용해 반복되는 성공 패턴을 보존하고 재사용한다. 핵심 철학은 README의 `Optimize the context window. Persist everything else.`로 요약할 수 있다.

### 4. Multi-harness adapter

Claude Code를 중심으로 Codex, OpenCode, Cursor, Gemini, Zed 및 기타 환경을 adapter/sync 형태로 지원한다. 단, 플랫폼별 Hook·plugin·session store가 다르기 때문에 기능 동등성은 보장하지 않는다.

### 5. AgentShield / GateGuard

Agent 설정, Prompt, Hook, MCP config, permissions, secret 등을 스캔하는 보안 계층을 제공한다. destructive operation을 제어하려는 GateGuard도 포함된다.

### 6. Guided installer

`ecc-universal`을 통해 Claude Code, Codex, Kimi Code 등의 설치/업데이트/진단 흐름을 통합한다. 같은 하네스에 native plugin과 manual/sync 방식을 중복 설치하지 않는 것이 중요하다.

## 아키텍처

ECC의 2.0 Reference Architecture는 다음과 같은 계층을 목표로 한다.

```text
Operator Surface
  CLI / Plugin / TUI / HUD / PR Checks
            │
            ▼
Harness Adapter Layer
  Claude Code / Codex / OpenCode / Cursor / Gemini / Zed / ...
            │
            ▼
Worktree · Session · Queue Runtime
  session / worktree / todo / check / merge-conflict / handoff
            │
            ▼
Observability · Evaluation Loop
  trace / status / risk ledger / verifier / promoted playbook / RAG
            │
            ▼
Security · Commercial Platform
  AgentShield / SARIF / ECC Tools / GitHub integration
```

중요한 점은 ECC가 모델 자체를 대체하는 orchestrator가 아니라 **기존 agent harness 위에 engineering workflow와 reusable capability를 주입하는 상위 실행 계층**이라는 것이다.

Self-improvement 방향도 단순히 학습 결과를 즉시 설정에 쓰는 방식이 아니라 다음 단계로 분리하려 한다.

```text
observe → propose → verify → promote → rollback
```

trace와 artifact를 남기고 verifier를 통과한 playbook만 승격하는 구조다.

## 장점

### 개발 프로세스의 재현성

좋은 프롬프트를 매번 작성하는 대신 계획·구현·테스트·리뷰·학습 절차를 시스템화할 수 있다.

### 풍부한 재사용 자산

수백 개 Skill과 수십 개 Agent가 이미 제공되므로 자체 harness를 처음부터 구축할 때 참고할 패턴이 매우 많다.

### Claude Code + Codex 환경과의 높은 관련성

Claude Code를 메인으로 사용하면서 Codex를 reviewer 또는 별도 worker로 사용하는 환경이라면 ECC의 adapter, Skill 구조, review loop가 직접적인 참고 자료가 된다.

### Context 최적화 철학

모든 정보를 현재 context에 밀어 넣기보다 persistent memory, skill, trace, playbook으로 외부화하려는 방향은 장기 세션의 token/context 문제를 줄이는 데 적합하다.

### 보안을 하네스 기능으로 취급

AgentShield/GateGuard처럼 MCP, Hook, agent config, destructive command까지 보안 경계에 포함시키는 점은 기업 환경에서 참고 가치가 높다.

## 단점 및 한계

### 기능 규모가 매우 크다

68 Agents와 286 Skills를 통째로 도입하면 어떤 기능이 실제로 활성화되는지 이해하기 어렵고, 관리 표면과 context/tool 선택 복잡도가 커질 수 있다. 필요한 Skill만 선별하는 전략이 중요하다.

### Claude Code 중심의 기능 비대칭

README도 Claude Code가 현재 가장 잘 지원된다고 명시한다. Codex를 포함한 다른 하네스는 adapter 또는 sync 경로이므로 완전한 feature parity를 전제로 하면 안 된다.

### 설치 방식 중복 위험

native plugin, guided setup, manual install, Codex sync 등 여러 경로가 존재한다. 같은 하네스에 중복 적용하면 Skill·Command·Hook·config가 중복될 수 있다.

### Windows 안정성은 현재 확인 필요

2026-09-09 기준 open issue #3041은 Windows에서 Claude `settings.json` write guard가 `fstat.dev`와 `lstat.dev`를 비교하면서 설치/업데이트가 실패할 수 있다고 보고한다. Windows 중심 기업 환경에서는 이 문제가 해결됐는지 확인한 뒤 PoC하는 편이 안전하다.

### 보안 기능을 절대적 방어선으로 보면 안 됨

v2.2.1은 GateGuard 보안 강화를 포함했지만 open issue #3024에는 quoted SQL에서 destructive SQL detector가 우회될 수 있다는 재현 보고가 있다. GateGuard는 유용한 방어층이지만 OS 권한, sandbox, human approval을 대체하는 보안 경계로 간주하면 위험하다.

### 빠른 변화와 유지보수 부담

프로젝트가 매우 빠르게 확장되고 있어 문서, adapter, installer, security policy의 변화량이 크다. 사내 표준에 그대로 종속시키기보다 필요한 패턴을 추출하는 방식이 유지보수 측면에서 유리할 수 있다.

## 활용 사례

### 개인/소규모 팀의 Claude Code 개발 환경

ECC를 plugin으로 설치해 planning, TDD, review, security, memory workflow를 빠르게 구성한다.

### Claude Code + Codex 병행 환경

공통 Skill과 workflow를 기준으로 Claude Code와 Codex의 행동 차이를 줄이고, Codex를 review/verification lane으로 활용할 수 있다.

### 사내 Agent Harness 설계 참고

ECC 전체를 설치하지 않더라도 다음 요소는 자체 harness 설계에 참고 가치가 높다.

- Skill-first capability registry
- role-based Agent catalog
- Hook 기반 lifecycle enforcement
- persistent memory/learning
- fresh-context review
- trace → verifier → promoted playbook
- harness adapter compliance matrix
- Agent config/MCP/Hook security scanning

## 기존 도구와 비교

| 관점 | ECC | 단순 Skill 모음 | 자체 Orchestrator |
| --- | --- | --- | --- |
| 주 목적 | 엔지니어링 하네스 운영 계층 | 작업 지침 재사용 | Agent/Model 작업 분배 |
| Agents | 다수 내장 | 보통 없음/제한적 | 직접 정의 |
| Skills | 대규모 내장 | 핵심 기능 | 필요 시 직접 구성 |
| Hooks | 핵심 런타임 기능 | 거의 없음 | 구현에 따라 다름 |
| Memory/Learning | 내장 | 제한적 | 직접 설계 |
| Multi-harness | adapter/sync 제공 | 파일 복사 중심 | 자체 adapter 필요 |
| Security | AgentShield/GateGuard | 보통 없음 | 별도 구현 필요 |
| 커스터마이징 비용 | 초기 탐색 비용 큼 | 낮음 | 가장 큼 |

ECC는 `mattpocock/skills`나 `google/skills`처럼 Skill 자산 자체가 핵심인 프로젝트보다 범위가 넓고, 모델을 직접 라우팅하는 전용 orchestrator보다는 하네스의 **공통 운영체제/툴박스**에 가깝다.

## 활용 아이디어

### 바로 적용 가능 — 패턴 선별 도입

전체 ECC를 사내 개발 환경에 설치하기보다는 다음 패턴부터 가져오는 것을 추천한다.

1. `plan → test → implement → review → verify` 기본 루프
2. Review를 fresh context Agent에 맡기는 구조
3. Skill을 항상 context에 넣지 않고 필요할 때 로드하는 구조
4. Session summary/learning을 persistent artifact로 외부화
5. Hook에서 destructive action과 검증 단계를 강제

### PoC 가치 있음 — Claude Code / Codex 공통 Skill Layer

Claude Code와 Codex에서 동일한 Skill source를 유지하고 harness별 adapter만 생성하는 구조를 실험할 가치가 있다. ECC의 `.agents/skills/*/agents/openai.yaml` 같은 multi-provider packaging 방식은 좋은 참고 사례다.

### PoC 가치 있음 — 자체 Harness의 Learning Pipeline

사내 workflow에 다음 승격 과정을 적용할 수 있다.

```text
실행 로그
  ↓
Observation
  ↓
Candidate Skill / Playbook
  ↓
Reviewer / Test
  ↓
승인된 Skill Registry
```

에이전트가 성공 경험을 곧바로 규칙으로 덮어쓰게 하지 않고 검증된 지식만 승격시키는 방식이다.

### 아이디어 참고 — AgentShield

회사 환경에서는 ECC AgentShield를 그대로 신뢰하기보다 scanner의 검사 범주를 참고해 자체 검사기를 만드는 편이 적합하다.

- MCP server command/URL
- Hook script
- permission wildcard
- secret-like value
- prompt injection pattern
- destructive shell/PowerShell command
- 외부 Skill provenance

### 현재는 신중 — ECC 전체 사내 표준화

현재 규모와 변화 속도, Windows open issue, 플랫폼별 기능 차이를 고려하면 ECC 전체를 사내 표준 harness로 즉시 채택하는 것보다는 **reference implementation + 선택적 PoC** 가치가 더 높다.

## 결론

ECC의 가장 중요한 가치는 286개 Skill의 개수가 아니다. **코딩 에이전트를 좋은 프롬프트 모음이 아니라 지속적으로 검증·기억·개선되는 engineering harness로 취급한다는 설계**가 핵심이다.

Claude Code/Codex 기반 자체 Harness를 설계하는 입장에서는 ECC 전체를 복제하기보다 `Skill registry + lifecycle hooks + fresh-context review + persistent learning + verifier-gated promotion + security scan`의 여섯 가지 패턴을 우선 흡수하는 것이 실용적이다.

도입 판단: **PoC 가치 높음 / 전체 표준화는 신중**.

## 참고 자료

- https://github.com/affaan-m/ECC
- https://github.com/affaan-m/ECC/blob/main/README.md
- https://github.com/affaan-m/ECC/blob/main/docs/ECC-2.0-REFERENCE-ARCHITECTURE.md
- https://github.com/affaan-m/ECC/releases/tag/v2.2.1
- https://github.com/affaan-m/ECC/issues/3041
- https://github.com/affaan-m/ECC/issues/3024
