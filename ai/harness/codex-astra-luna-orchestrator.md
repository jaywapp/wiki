---
title: Codex Astra Luna Orchestrator
category: harness
tags:
  - ai
  - codex
  - multi-agent
  - orchestration
  - astra
  - luna
source: https://github.com/donvito/codex-astra-luna-orchestrator
updated: 2026-09-09
---

# Codex Astra Luna Orchestrator

> 고성능 모델을 오케스트레이션·최종 검토에 집중시키고, 탐색·구현·테스트·리서치는 더 빠른 모델에 위임하는 Codex용 멀티 에이전트 Harness 예제다.

## 프로젝트 개요

`donvito/codex-astra-luna-orchestrator`는 Codex의 root agent와 역할별 subagent를 명시적으로 분리해 비용·속도·품질을 조절하는 구성 저장소다. Pro 구성은 GPT-6 Astra를 root/orchestrator로 두고 GPT-5.6 Luna를 실행 subagent로 사용한다. Plus 구성은 rate-limit 부담을 줄이기 위해 root도 Luna max reasoning으로 바꾸되 reviewer는 Astra로 유지한다.

저장소는 단순 프롬프트 모음이 아니라 `.codex` 설정, 역할별 agent TOML, orchestration Skill, `AGENTS.md`, Windows/macOS/Linux installer, 운영 가이드와 token usage 측정 도구를 함께 제공한다.

## 해결하려는 문제

멀티 에이전트 코딩에서 모든 작업을 최고급 모델에 맡기면 품질은 높일 수 있지만 rate limit과 context/token 비용이 빠르게 증가한다. 반대로 저비용 모델 하나에 전체 설계와 구현을 맡기면 복잡한 변경에서 방향 설정과 검증 품질이 떨어질 수 있다.

이 프로젝트의 핵심 해법은 역할 분리다.

- 상위 모델: 문제 이해, 아키텍처 결정, 작업 분해, 통합, 독립 검토
- 실행 모델: repository 탐색, bounded implementation, 테스트, 외부 조사
- 명확한 delegation gate: 작은 작업에는 orchestration을 사용하지 않음
- bounded contract: subagent에게 Objective/Scope/Context/Constraints/Deliverable/Acceptance criteria를 전달

## 핵심 기능

1. **모델 라우팅**: explorer/worker/tester/researcher는 Luna, reviewer는 Astra로 고정한다.
2. **Plan별 root 전략**: Pro는 Astra root, Plus는 Luna max root를 제공한다.
3. **Delegation gate**: 다중 파일, 독립 workstream, repository exploration, cross-component debugging 등의 조건에서 실제 `spawn_agent` 사용을 강제한다.
4. **역할 기반 subagent**: explorer, worker, tester, reviewer, researcher를 분리한다.
5. **병렬 실행 규칙**: 독립적인 탐색/조사는 동시에 실행하고 의존 단계는 직렬화한다.
6. **컨텍스트 절약 규칙**: raw log와 전체 파일 대신 결론, 경로, symbol, test result 중심으로 root에 반환한다.
7. **Token 측정**: `~/.codex/sessions` rollout JSONL을 분석하는 `scripts/token_usage.py`를 제공한다.
8. **설치 자동화**: `setup.sh`와 `setup.ps1`로 project-scoped 설정을 설치할 수 있다.

## 아키텍처

```text
                 Root / Orchestrator
            Astra(Pro) or Luna Max(Plus)
                       |
       +---------------+----------------+
       |               |                |
   Explorer          Worker         Researcher
     Luna             Luna              Luna
       |               |
       +-------+-------+
               |
            Tester
             Luna
               |
           Reviewer
            Astra
               |
               v
       Root integrates + verifies
```

일반적인 실행 흐름은 다음과 같다.

```text
Task classification
  -> delegation gate
  -> Luna explorer(s)
  -> root architecture decision
  -> Luna worker(s)
  -> Luna tester
  -> Astra reviewer (필요 시)
  -> root fixes/integration
  -> final verification
```

중요한 점은 subagent가 전체 아키텍처를 결정하지 않는다는 것이다. root가 방향과 ownership을 유지하고 subagent는 제한된 범위의 evidence 또는 implementation을 제공한다.

## Token / Cost

저장소가 제공하는 샘플은 작은 TypeScript desktop app의 cross-component bug fix에서 explorer/worker/tester/reviewer 4개 subagent를 사용했다.

- Wall time: 13분 49초
- uncached input: 약 340k
- cached input: 약 8.95M
- output: 약 26k
- input cache hit: 96.3%
- 샘플 Plus 5시간 window: 0% -> 66%

저자가 강조하는 핵심은 raw total token보다 **uncached input/output과 rate-limit window delta**를 봐야 한다는 점이다. 샘플에서도 root가 전체 task 동안 살아 있으면서 subagent를 poll하고 context를 반복해서 읽기 때문에 가장 큰 비용 항목이었다.

따라서 orchestration 자체는 무료 최적화가 아니다. 작은 작업에서 agent를 많이 생성하면 오히려 손해가 될 수 있다.

## 장점

- 고성능 모델을 모든 실행에 사용하지 않고 의사결정과 검증에 집중시킬 수 있다.
- 역할별 context가 분리되어 대형 repository에서 root context 오염을 줄일 수 있다.
- worker/tester/reviewer 분리로 구현자와 검증자의 관점을 분리한다.
- delegation contract와 file ownership 규칙이 agent 간 충돌을 줄인다.
- Windows PowerShell installer가 있어 Windows 중심 개발 환경에도 적용하기 쉽다.
- token/rate-limit을 실제 Codex rollout log 기준으로 측정하는 도구가 포함되어 있어 튜닝하기 좋다.

## 단점 및 한계

- 멀티 에이전트 자체의 context 복제 비용이 크다. 샘플에서도 하나의 중간 규모 작업이 Plus 5시간 window의 상당 부분을 소비했다.
- root가 계속 orchestration loop에 남아 있기 때문에 root 비용이 생각보다 크다.
- 역할별 model 이름과 Codex agent configuration 동작에 강하게 의존하므로 Codex 버전 변화에 영향을 받을 수 있다.
- reviewer까지 항상 사용하면 저위험 변경에는 과도한 비용이 될 수 있다.
- 여러 worker가 동일 파일을 수정하는 경우 충돌 위험이 있으므로 ownership 설계가 필요하다.
- 제공 benchmark는 단일 repository의 단일 sample이므로 일반적인 성능 우위를 입증하는 benchmark로 볼 수 없다.
- Enterprise 환경에서는 외부 모델 사용 정책, source 접근 권한, agent별 workspace-write 범위를 별도로 통제해야 한다.

## 활용 사례

### 바로 적용 가능

- Codex에서 다중 파일 기능 구현
- cross-component bug tracing
- repository 탐색과 구현 context 분리
- 구현 후 별도 reviewer 모델을 통한 독립 검증
- Windows 환경에서 project-scoped Codex agent 구성 실험

### PoC 가치 있음

사내 Harness에서 `Orchestrator -> Analysis/Explorer -> Work -> Review` 구조를 운영한다면 이 프로젝트의 다음 규칙을 가져올 가치가 높다.

- delegation gate
- bounded delegation contract
- one writer per file/subsystem
- independent tasks parallel / dependent tasks serial
- root context에는 evidence summary만 회수
- expensive reviewer를 모든 작업이 아니라 위험도 기반으로 호출
- session log 기반 비용 측정

### 아이디어 참고

모델 이름 자체보다 **역할별 모델 경제성**이 핵심이다. 즉, 가장 비싼 모델을 root와 reviewer에만 사용하고 반복적인 탐색·수정·테스트는 더 빠른 모델에 맡기는 패턴은 Claude/Codex 혼합 Harness에도 그대로 적용할 수 있다.

### 현재는 도입 가치 낮음

- 단일 파일의 명확한 수정
- 간단한 설정 변경
- repository 탐색이 필요 없는 질문
- 테스트/리뷰 분리가 품질을 크게 개선하지 않는 저위험 작업

이 경우 orchestration overhead가 실제 작업보다 커질 수 있다.

## 기존 방식과 비교

| 방식 | 장점 | 단점 |
|---|---|---|
| Astra root-only | 구조 단순, context 공유 쉬움 | 반복 실행까지 고성능 모델이 담당 |
| Luna root-only | 빠르고 rate-limit 효율적 | 복잡한 설계/통합 판단에서 품질 위험 |
| Astra + Luna orchestration | 고급 추론과 실행 비용을 역할별 분리 | context 복제와 orchestration overhead |
| 모든 agent Astra | 최대 추론 능력 | 비용/rate-limit 부담이 매우 큼 |

## 실무 적용 아이디어

사내 AI Workflow에 적용한다면 저장소를 그대로 복제하기보다 정책을 추출하는 편이 유용하다.

```text
Task
 -> Complexity/Risk Gate
 -> Orchestrator
    -> Explorer/Analysis (read-only)
    -> Worker (bounded write ownership)
    -> Tester (verification)
    -> Reviewer (risk-based expensive model)
 -> Integrate
 -> Final verification
```

특히 현재의 Orchestrator/Analysis/Work/Review 계층에 `delegation gate`와 `bounded contract`를 추가하면 불필요한 subagent 호출을 줄이면서 역할 경계를 더 명확하게 만들 수 있다. 또한 token usage script의 접근처럼 agent session별 모델·입력·cache·output·rate-limit을 계측하면 모델 라우팅 정책을 경험이 아니라 데이터로 조정할 수 있다.

## 결론

이 저장소의 가치가 가장 큰 부분은 Astra/Luna라는 특정 모델 조합보다 **고급 모델은 판단과 검증, 저비용 모델은 bounded execution**이라는 Harness 설계와 이를 강제하는 구체적인 운영 규칙이다.

특히 delegation gate, 역할별 ownership, context summary discipline, 비용 계측은 실제 멀티 에이전트 개발 환경에 바로 참고할 만하다. 반면 orchestration이 token을 절약한다고 단순하게 보면 안 된다. subagent context 복제와 root orchestration overhead 때문에 작은 작업에서는 root-only가 더 효율적이다.

**평가: PoC 가치 높음.** 전체 구성을 그대로 도입하기보다 orchestration policy와 계측 방식을 기존 Harness에 흡수하는 방향을 권장한다.

## 참고 자료

- https://github.com/donvito/codex-astra-luna-orchestrator
- https://github.com/donvito/codex-astra-luna-orchestrator/blob/main/.agents/skills/astra-orchestrator/SKILL.md
- https://github.com/donvito/codex-astra-luna-orchestrator/blob/main/guides/token-usage.md
