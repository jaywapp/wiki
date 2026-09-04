---
title: oh-my-fable
category: tools
tags:
  - ai
  - claude-code
  - fable
  - prompt-engineering
  - plugin
  - agent
source: https://github.com/Junhan2/oh-my-fable
updated: 2026-09-04
---

# oh-my-fable

> Anthropic의 Claude Fable 5.1 프롬프팅 가이드를 Claude Code의 SessionStart/SubagentStart 훅과 Skill로 자동 적용해, 사용자가 매번 긴 운영 지침을 작성하지 않아도 작업 품질과 자율성을 안정화하는 플러그인.

## 프로젝트 개요

`oh-my-fable`은 Claude Code용 플러그인이다. 핵심은 새로운 에이전트 런타임을 만드는 것이 아니라, Anthropic이 공개한 Fable 5.1 프롬프팅 권장사항을 Claude Code 실행 환경에 자동 주입하는 것이다.

기본 설치에서는 CLAUDE.md를 수정하지 않고 훅을 통해 메인 세션과 서브에이전트에 규칙을 주입한다. 필요할 때만 `/fable-prompt`, `/fable-status`, `/fable-setup` Skill을 사용한다.

2026-09-04 조사 기준 최신 커밋에서는 2.0.1까지 업데이트되어 있으며, 2.0.0부터 기본 전달 방식이 hook-only 구조로 변경됐다.

## 해결하려는 문제

Fable 5.1은 긴 작업의 자율 수행 능력이 좋아진 반면, 모델 특성 변화 때문에 다음과 같은 운영 문제가 생길 수 있다.

- 작업 중 진행 상황을 충분히 설명하지 않음
- 도구 호출을 순차적으로 수행해 불필요하게 느려짐
- 작은 수정에도 파일 전체를 다시 작성
- 낮은 effort에서 검색보다 기억에 의존
- 막연한 사용자 요청을 그대로 수행해 범위와 완료 기준이 불명확해짐
- 서브에이전트가 메인 세션과 동일한 규칙을 받지 못함

이 프로젝트는 이를 사용자별 CLAUDE.md 작성 문제로 남겨두지 않고 플러그인 수준에서 표준화한다.

## 핵심 기능

### 1. 세션 시작 시 상시 규칙 자동 주입

`SessionStart` 훅이 startup, clear, compact 시점에 `session-start.sh`를 실행한다.

상시 규칙에는 다음 성격의 지침이 포함된다.

- 요청된 작업을 끝까지 수행
- 분석 요청과 변경 요청을 구분
- 근거 없이 시스템 상태를 변경하지 않음
- 요청 범위를 넘어선 수정 억제
- 파일 전체 rewrite보다 surgical edit 선호
- 작업 시작/진행/완료 상황 보고
- 독립적인 도구 호출을 가능한 한 묶어서 처리

### 2. 서브에이전트 규칙 주입

`SubagentStart`에도 같은 훅이 연결되어 있으며 서브에이전트에는 축약된 규칙을 주입한다. 특히 일반 rules 파일을 읽지 않는 Explore/Plan 계열까지 훅으로 보완하려는 구조다.

### 3. `/fable-prompt`

짧거나 모호한 요청을 다음 네 요소 중심의 실행 가능한 요청으로 재작성한다.

- Goal
- Context
- Scope
- Done criteria

기본 동작은 프롬프트를 보여주는 데서 끝나지 않고 같은 턴에서 실제 작업까지 수행하는 것이다. `프롬프트만`을 지정하면 실행하지 않는다.

### 4. `/fable-status`

현재 플러그인 버전, 규칙 위치, 감지 모드, effort 관련 상태, 규칙 파일 버전 및 CLAUDE.md 충돌 등을 확인하기 위한 진단 Skill이다.

### 5. `/fable-setup`

기본 hook-only 방식 대신 규칙 파일이나 CLAUDE.md 기반 배치를 선택해야 하는 특수 환경에서 사용한다. 일반 사용자는 설치만으로 동작하도록 설계됐다.

## 아키텍처

```text
User Request
    |
    v
Claude Code Session
    |
    +-- SessionStart(startup/clear/compact)
    |       |
    |       v
    |   session-start.sh
    |       |
    |       +--> always-on rules
    |       +--> interactive / unattended mode detection
    |       +--> optional status / config handling
    |
    +-- Agent Tool --> SubagentStart
    |                    |
    |                    v
    |                short subagent rules
    |
    +-- /fable-prompt --> request rewrite
    |                    Goal / Context / Scope / Done
    |
    +-- /fable-status --> diagnostics
    |
    +-- /fable-setup  --> optional delivery/config changes
```

프로젝트 구조도 단순하다.

```text
.claude-plugin/   plugin / marketplace metadata
hooks/            SessionStart/SubagentStart scripts and rule text
skills/
  fable-prompt/
  fable-setup/
  fable-status/
```

핵심 설계 포인트는 **프로젝트별 CLAUDE.md를 오염시키지 않고 세션 런타임에서 공통 정책을 주입한다는 것**이다.

## 장점

### 설치 후 운영 부담이 작다

매 프로젝트마다 프롬프팅 가이드를 CLAUDE.md에 복사할 필요가 없다. 플러그인 업데이트만으로 규칙을 갱신할 수 있다.

### 메인 세션과 서브에이전트의 행동 규칙을 맞출 수 있다

멀티 에이전트 환경에서 흔한 문제는 메인 세션의 지침이 서브에이전트에 완전히 전달되지 않는다는 것이다. SubagentStart 훅을 사용한 보완은 실무적으로 가치가 높다.

### 짧은 지시를 구조화하는 방식이 실용적이다

Goal / Context / Scope / Done criteria는 Fable 전용이라기보다 코딩 에이전트 전반에 유효한 요청 구조다. 특히 범위 확대와 완료 조건 누락을 줄이는 데 도움이 된다.

### CLAUDE.md와 역할이 분리된다

프로젝트 고유 규칙은 CLAUDE.md, 모델 행동 보정은 플러그인이라는 식으로 책임을 분리할 수 있다.

## 단점 및 한계

### Fable 최적화 규칙의 수명이 모델 변화에 좌우된다

Fable 5.1의 특정 행동 특성을 보정하는 규칙은 향후 모델 업데이트에서 필요성이 줄거나 반대로 부작용을 낼 수 있다. 플러그인의 지속적인 유지보수가 중요하다.

### 프롬프트 주입은 컨텍스트 비용이 0이 아니다

상시 규칙과 서브에이전트 규칙이 세션 컨텍스트에 추가되므로 토큰 비용이 발생한다. 규칙 자체는 크지 않지만 에이전트를 많이 생성하는 하네스에서는 누적 비용을 측정할 필요가 있다.

### 기존 CLAUDE.md / rules와 충돌 가능

프로젝트 자체 운영 규칙과 플러그인의 행동 규칙이 반대 방향이면 우선순위와 실제 모델 반응을 확인해야 한다. 프로젝트는 명시적 반대 지침을 우선하도록 설계했지만 실제 복합 프롬프트에서는 검증이 필요하다.

### Windows는 Git Bash 의존

훅이 bash로 실행되므로 Windows에서는 Git for Windows/Git Bash가 필요하다. 순수 PowerShell 기반 엔터프라이즈 환경에서는 배포 정책을 확인해야 한다.

### 에이전트 팀 적용은 별도 검증 필요

README에서도 일부 에이전트 팀 관련 동작을 미검증으로 표시한다. Claude Code의 서브에이전트와 외부 하네스가 동일한 것은 아니므로 ATOM 같은 자체 orchestration 환경에 그대로 적용된다고 가정하면 안 된다.

### 품질 향상 수치가 검증된 벤치마크는 확인되지 않음

프로젝트가 주장하는 품질 개선 방향은 공식 프롬프팅 가이드와 합리적으로 연결되지만, 독립적인 정량 벤치마크나 대규모 사용자 사례는 현재 확인되지 않았다. GitHub Issues도 조사 시점에는 공개 이슈가 없었다.

## 활용 사례

### Claude Code 개인 개발 환경

가장 직접적인 사용처다. 프로젝트마다 CLAUDE.md에 모델 행동 보정 문구를 반복하지 않고 공통 정책으로 적용할 수 있다.

### 여러 프로젝트를 동시에 다루는 개발 환경

프로젝트별 저장소에는 도메인 규칙만 두고 공통 Claude 행동 정책은 플러그인에서 관리할 수 있다.

### Headless / Agent SDK 실행

무인 세션을 감지해 별도 autonomy 문단을 추가하는 구조를 제공한다. 단 `claude -p --bare`처럼 훅과 플러그인을 건너뛰는 실행 방식에서는 별도 시스템 프롬프트 주입이 필요하다.

### 멀티 에이전트 작업

SubagentStart 훅을 이용해 worker/explore/plan 계열 에이전트에 최소 공통 규칙을 주입하는 패턴 자체가 참고 가치가 높다.

## 기존 방식과 비교

| 방식 | 장점 | 단점 |
|---|---|---|
| CLAUDE.md에 직접 규칙 작성 | 프로젝트별 세밀한 제어 | 중복, 업데이트 어려움, 프로젝트 파일 오염 |
| `~/.claude/rules` 공통 규칙 | 전역 적용이 단순 | 일부 서브에이전트/실행 모드 대응 필요 |
| oh-my-fable hook-only | 설치 후 자동, 서브에이전트 보완, 업데이트 용이 | 플러그인/훅 의존, 토큰 추가, 모델 버전 의존 |
| 자체 Harness system prompt | 완전한 중앙 제어 | Claude Code 기본 세션과 별도 관리 필요 |

## 활용 아이디어

### 바로 적용 가능

Claude Code를 Fable 중심으로 사용하는 개발 PC에 설치해 공통 행동 정책을 맡기는 것은 실용적이다. 특히 여러 저장소를 오갈 때 CLAUDE.md 중복을 줄일 수 있다.

### PoC 가치 있음 — 프로젝트별 Claude 세션 + 메인 오케스트레이터

`root/src/project1`, `project2`, `project3`처럼 프로젝트별 Claude 세션을 띄우고 상위 오케스트레이터가 작업을 지시하는 구조에서 worker 세션의 공통 실행 규칙으로 사용할 가치가 있다.

이 경우 역할을 다음처럼 나누는 것이 좋다.

```text
Root Orchestrator
  - 작업 분해 / 라우팅 / 상태 관리

Project Claude Session
  - 프로젝트 CLAUDE.md: 프로젝트 고유 규칙
  - oh-my-fable: 공통 실행 행동 규칙

Release Agent
  - integration / deployment 규칙
```

즉 oh-my-fable을 오케스트레이터 자체로 보는 것보다 **각 worker Claude 세션의 행동 안정화 레이어**로 사용하는 것이 적합하다.

### 아이디어 참고 — 사내 공통 Agent Policy Plugin

이 프로젝트의 가장 큰 참고 포인트는 Fable용 문구 자체보다 `SessionStart + SubagentStart`를 이용한 정책 배포 방식이다.

사내 환경에서는 이를 포크하거나 유사한 플러그인을 만들어 다음을 중앙 관리할 수 있다.

- 코드 수정 범위 제한
- Perforce 작업 규칙
- 테스트/검증 정책
- 작업 완료 보고 포맷
- 서브에이전트 공통 지침
- 회사 보안 정책

단, 저장소별 규칙과 전역 정책을 과도하게 섞지 않는 것이 중요하다.

### 현재는 도입 가치 낮음

Fable을 거의 사용하지 않거나 자체 Harness에서 system prompt를 완전히 통제하고 있다면 플러그인을 추가할 이유가 작다. 이 경우 `always-on.md`와 SubagentStart 설계 패턴만 참고하는 편이 낫다.

## Enterprise 적용성

- **배포**: Claude Code plugin marketplace 또는 사내 mirror/포크 전략 검토 필요
- **Windows**: Git Bash 필요
- **보안**: SessionStart에서 실행되는 shell script이므로 도입 전 코드 리뷰와 버전 고정 필요
- **업데이트**: 자동 업데이트보다 검증된 버전을 내부 배포하는 방식이 안전
- **정책 관리**: 프로젝트 규칙과 조직 공통 규칙의 우선순위를 명확히 정의해야 함

## 결론

`oh-my-fable`은 거대한 프레임워크라기보다 **Claude Code의 모델 행동을 hook 기반으로 보정하는 얇은 policy layer**다.

개인 환경에서는 설치 후 관리 부담이 적다는 점이 좋고, 멀티 프로젝트/멀티 에이전트 환경에서는 SessionStart와 SubagentStart를 이용한 공통 정책 주입 패턴이 더 중요한 가치다.

특히 상위 오케스트레이터와 프로젝트별 Claude worker 세션을 분리하는 구조에서는 오케스트레이션을 담당시키기보다 각 worker의 실행 품질을 균일하게 만드는 레이어로 활용하는 것이 적절하다.

**평가: 바로 적용 가능 + 사내 Agent Policy 구조로 PoC 가치 높음.**

## 참고 자료

- https://github.com/Junhan2/oh-my-fable
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1
- Repository README, hooks, skills, recent commits 확인 (2026-09-04)
