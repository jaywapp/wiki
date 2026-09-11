---
title: Dryforge
category: harness
tags:
  - ai
  - harness
  - claude-code
  - codex
  - bounded-autonomy
source: https://github.com/prekuter/dryforge
updated: 2026-09-12
---

# Dryforge

> Claude Code와 Codex가 사용자가 승인한 의도와 검증 가능한 증거의 경계 안에서 자율적으로 구현하도록 만드는 bounded-autonomy 플러그인 하네스.

## 프로젝트 개요

Dryforge는 Claude Code와 Codex용 코딩 에이전트 하네스다. 핵심은 planner/orchestrator/memory를 각각 추가하는 것이 아니라, 사용자 의도·스펙·계획·코드가 각각 무엇에 대한 권한을 가지는지 명시하고 그 경계 안에서 모델의 추론을 최대한 열어두는 것이다.

일반 요청을 자동으로 가로채지 않고 `/ready`, `/go`, `/migration`을 명시적으로 호출할 때만 전체 워크플로우가 동작한다. 별도 서버나 계정은 필요하지 않으며 Git 저장소와 Markdown 문서를 프로젝트의 지속 컨텍스트로 사용한다.

## 해결하려는 문제

AI 코딩 하네스는 두 극단으로 흐르기 쉽다.

- 절차와 체크리스트를 과도하게 강제하면 모델이 실제 목적보다 프로세스 통과를 최적화한다.
- 반대로 자유도를 지나치게 주면 요구사항을 잘못 해석한 채 장시간 구현할 수 있다.

Dryforge는 이를 `bounded autonomy`로 해결한다. 사용자가 결정해야 할 WHAT은 승인받고, 구현 HOW는 에이전트에게 맡긴다. 또한 완료 여부는 말이 아니라 실제 검증 결과로 증명하도록 한다.

## 핵심 기능

### `/ready`

자연어 목표, 기존 스펙, 메모 등 임의 입력을 받아 코드베이스와 대조하고 필요한 사용자 결정을 확인한 뒤 `.dryforge/`에 handoff/spec/plan 3개 실행 문서를 만든다. 입력 문서 자체를 진실로 간주하지 않고 사용자 승인 후에만 의도로 확정한다.

### `/go`

승인된 스펙과 계획을 실행한다. 작업 의존성과 위험도에 맞춰 실행하고 실제 프로젝트의 빌드/테스트/검증 명령으로 결과를 확인하는 실행 단계다.

### `/migration`

기존 프로젝트의 코드와 규칙을 읽어 Claude Code/Codex가 재사용할 수 있는 프로젝트 컨텍스트를 구축한다. 신규 프로젝트 전용이 아니라 기존 코드베이스 도입을 위한 진입점이다.

### Persistent project context

프로젝트에 `CLAUDE.md`, `AGENTS.md`, `docs/architecture.md`, `business-rules.md`, `security.md`, `standards.md`, `engineering-notes.md`, `operations.md`, `contracts.md`, tracking 문서 등을 남긴다. 플러그인을 제거해도 Markdown 기반 지식은 저장소에 남는다.

## 아키텍처

```text
사용자 목표 / 기존 문서 / 메모
            |
            v
        /ready
  코드 + 기존 프로젝트 컨텍스트 확인
            |
  사용자만 결정할 수 있는 항목 확인
            |
  intent completeness 독립 검토
            |
   handoff + spec + plan
            |
        사용자 승인
            |
            v
          /go
  의존성/위험 기반 작업 실행
            |
   실제 build/test/verify
            |
   증명 가능한 상태만 보고
            |
   프로젝트 문서/추적 정보
```

`ready` 구현에서 특히 흥미로운 점은 대부분의 의도 형성 과정을 메인 세션에서 수행한다는 것이다. 원시 컨텍스트가 요약 과정에서 손실되는 것을 막기 위해 ORIENT/DECOMPOSE/ELICIT/SPEC/PLAN/HANDOFF는 메인 세션이 처리하고, 서브에이전트는 `intent-completeness`와 최종 `3-doc-gate`라는 독립 검토에만 사용한다.

또한 기존 프로젝트에서는 `.dryforge/status.json`을 기준으로 기존 harness context를 불러오며, 코드 탐색은 전체를 무작정 읽는 대신 manifest, repo instruction, verify script 등 가장 싼 map부터 읽고 필요한 계약과 대표 패턴만 깊게 읽도록 설계되어 있다.

## 권한 모델

| Source | 담당 |
|---|---|
| User | 의도, 선호, trade-off 결정 |
| Specification | 동작, invariant, scope, interface contract |
| Plan | 작업 대상, 의존 순서, 실행 구조 |
| Code | 현재 구현 사실과 프로젝트 convention |

이 분리는 기존 코드가 존재한다는 이유만으로 현재 구현을 요구사항으로 오해하거나, 계획 문서가 스펙을 덮어쓰는 drift를 줄이는 장치다.

## 장점

- 사용자 승인 의도와 구현 자율성의 경계를 명확하게 나눈다.
- Claude Code와 Codex를 같은 중립적인 skill source에서 지원한다.
- 프로젝트 컨텍스트가 Markdown과 표준 agent entry file로 남아 vendor-specific memory에만 종속되지 않는다.
- 작은 수정에는 전체 프로세스를 강제하지 않고 명시적 호출 방식이라 기존 작업 흐름과 공존하기 쉽다.
- 완료를 실제 검증 결과와 연결하고 동일 실패의 무의미한 반복을 제한하는 철학이 좋다.
- 기존 프로젝트 migration을 별도 일급 기능으로 다룬다.

## 단점 및 한계

- Git이 필수이며 `/go` 실행 전 tracked working state가 clean해야 한다. main이 remote를 추적한다면 unpushed commit도 없어야 하므로 Perforce 중심 환경에는 그대로 적용하기 어렵다.
- `/ready`의 SKILL.md 자체가 상당히 크고 다수 reference를 단계별로 읽는다. 컨텍스트 효율을 중시하는 환경에서는 하네스 자체의 token overhead를 측정할 필요가 있다.
- 의도 확인과 독립 검토를 강조하므로 단순하고 명확한 작업에는 오버헤드가 될 수 있다. 프로젝트도 이런 경우 전체 cycle을 권장하지 않는다.
- GitHub Releases는 조사 시점에 별도 release 항목이 없었다. 프로젝트 성숙도와 버전 안정성은 changelog/commit 기반으로 추가 판단해야 한다.
- Enterprise 보안, 중앙 정책 관리, 감사 로그, 비용/토큰 benchmark는 공식 자료만으로 충분히 검증되지 않았다.
- Windows 자체를 배제하는 구조는 아니지만 실제 Windows/대형 UE 저장소에서의 성능 및 운영 사례는 확인되지 않았다.

## 활용 사례

- 요구가 모호한 신규 기능을 구현하기 전에 사용자 의도를 스펙으로 확정할 때
- 대규모 refactoring/migration처럼 잘못된 가정의 비용이 큰 작업
- Claude Code와 Codex 사이에 공통 프로젝트 지식과 실행 규칙을 유지할 때
- 장기간 운영되는 저장소에서 architecture/business rule/engineering note를 agent-readable 형태로 축적할 때
- 구현 완료를 테스트/빌드 등 증거와 연결하고 싶은 팀

## 기존 방식과 비교

### 일반적인 plan → implement harness

일반 하네스는 계획 단계와 구현 단계를 나누는 데 집중하는 경우가 많다. Dryforge는 그보다 `누가 무엇을 결정할 권한이 있는가`를 먼저 정의한다. 특히 user/spec/plan/code를 서로 다른 authority source로 취급하는 것이 차별점이다.

### 멀티 에이전트 orchestrator/worker 구조

Dryforge의 중심은 여러 worker에게 작업을 분배하는 것이 아니다. 오히려 모델의 판단력을 유지하면서 안전하게 자율성을 허용하는 실행 경계를 만드는 데 가깝다. 따라서 대규모 agent team orchestration과는 목적이 다르며 필요하면 상위/하위 구조로 결합할 수 있다.

## 실무 평가

### 바로 적용 가능

Git 기반 개인/소규모 프로젝트에서 Claude Code 또는 Codex를 사용하는 경우 `/migration → /ready → /go` 흐름은 바로 시험해볼 가치가 있다. 특히 프로젝트 지식을 Markdown으로 남기는 방식은 도구를 바꿔도 재사용 가능하다.

### PoC 가치 있음

현재 사용 중인 workspace harness에서는 Dryforge 전체를 도입하기보다 다음 아이디어를 추출하는 것이 더 가치가 높다.

1. User / Spec / Plan / Code authority 분리
2. 사용자 의도 형성은 메인 세션에서 유지하고 독립 검증만 서브에이전트에 위임
3. `cheap map → 필요한 계약만 deep read` 방식의 컨텍스트 절약
4. 동일 실패 재시도는 새로운 정보가 생긴 경우에만 허용
5. 완료 상태를 실제 verify evidence와 연결

### Perforce 환경

회사 환경이 Perforce 중심이라면 Dryforge를 그대로 핵심 하네스로 사용하기는 어렵다. Git clean-state/worktree를 전제로 하는 실행 경계를 Perforce workspace/changelist/shelve 기반으로 다시 정의해야 한다.

예를 들면 다음처럼 치환할 수 있다.

```text
Git clean boundary
    ↓
P4 dedicated agent workspace
    ↓
Pending CL 생성
    ↓
작업 파일 checkout/edit
    ↓
Build/Test
    ↓
P4 diff + CL evidence
    ↓
Reviewer
```

Dryforge의 핵심 가치는 Git 구현 자체보다 `bounded autonomy + authority separation + evidence-based completion` 철학이므로, 이 부분만 Perforce 하네스에 이식하는 접근이 적합하다.

## 활용 아이디어

현재 Claude 메인/Codex 보조 또는 반대 구조의 하네스에는 Dryforge의 `독립 검토만 서브에이전트로 분리`하는 패턴이 특히 잘 맞는다. 메인 Claude가 원본 사용자 대화와 프로젝트 컨텍스트를 보존하면서 스펙을 만들고 Codex가 spec completeness 또는 final implementation evidence를 독립 검토하도록 구성할 수 있다.

또한 프로젝트별 `docs/architecture.md`, `business-rules.md`, `engineering-notes.md`, `operations.md`, `contracts.md` 구조는 현재 root/src/release/docs 기반 workspace의 프로젝트별 지속 컨텍스트 규약 후보로 참고할 가치가 있다.

## 결론

Dryforge는 기능이 많은 orchestration framework라기보다 **강한 모델을 과도하게 구속하지 않으면서도 잘못된 의도와 검증되지 않은 완료를 막는 실행 규약**에 가깝다. 특히 `floor, not ceiling`이라는 설계 철학과 authority separation은 하네스 설계 관점에서 참고 가치가 높다.

Git 프로젝트라면 직접 PoC 가치가 높고, Perforce 환경에서는 그대로 도입하기보다 bounded-autonomy 규칙을 현재 하네스에 이식하는 편이 현실적이다.

## 참고 자료

- https://github.com/prekuter/dryforge
- https://dryforge.dev/
- https://dryforge.dev/ko
