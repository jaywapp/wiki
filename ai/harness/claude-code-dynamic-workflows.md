---
title: Claude Code Dynamic Workflows
category: harness
tags:
  - ai
  - claude-code
  - agent
  - multi-agent
  - workflow
  - orchestration
source: https://code.claude.com/docs/ko/workflows
updated: 2026-09-05
---

# Claude Code Dynamic Workflows

> Claude Code의 동적 워크플로우는 멀티 에이전트의 **조율 계획 자체를 JavaScript 코드로 옮겨**, 수십~수백 개의 서브에이전트를 반복 가능하고 관찰 가능한 방식으로 실행하는 오케스트레이션 런타임이다.

## 프로젝트 개요

Claude Code v2.1.154 이상에서 제공되는 기능이다. 일반적인 서브에이전트 호출에서는 Claude가 대화 턴 안에서 다음 작업을 판단하지만, Workflow는 Claude가 먼저 JavaScript 오케스트레이션 스크립트를 만들고 별도 런타임이 이를 백그라운드에서 실행한다.

공식 문서가 제시하는 대표 용도는 코드베이스 전체 감사, 대규모 파일 마이그레이션, 다수 소스의 교차 검증 연구, 여러 독립 관점의 계획 비교 등이다.

## 해결하려는 문제

일반적인 멀티 에이전트 패턴은 규모가 커질수록 다음 문제가 생긴다.

- 오케스트레이터 Claude의 컨텍스트에 중간 결과가 계속 쌓인다.
- 반복/분기/재시도 로직이 대화 흐름에 의존한다.
- 동일한 에이전트 운영 패턴을 정확히 재현하기 어렵다.
- 수십 개 이상의 작업을 한 대화 턴에서 관리하기 어렵다.

Dynamic Workflow는 **계획을 코드로 이동**시킨다. 루프, 분기, 중간 결과를 스크립트 변수가 보유하고 Claude의 대화 컨텍스트에는 최종 결과 중심으로 전달한다.

## 핵심 기능

### 대규모 Fan-out

`agent()`로 하나의 서브에이전트를 실행하고 `pipeline()`을 사용해 항목별 에이전트를 병렬/파이프라인 형태로 실행할 수 있다.

예를 들어 파일 목록을 먼저 찾고 각 파일마다 별도의 감사 에이전트를 실행한 뒤 결과를 수집하는 구조를 코드화할 수 있다.

### 반복 가능한 오케스트레이션

실행 결과가 만족스러우면 `/workflows` 화면에서 스크립트를 저장할 수 있다.

- 프로젝트 공유: `.claude/workflows/`
- 개인 공용: `~/.claude/workflows/`

저장된 Workflow는 이후 `/<name>` 명령처럼 실행할 수 있으며 `args`를 통해 입력도 받을 수 있다.

### 백그라운드 실행 및 관찰

Workflow는 대화와 분리된 런타임에서 실행된다. `/workflows`에서 단계별 에이전트 수, 토큰 사용량, 경과 시간, 각 에이전트의 프롬프트/도구 호출/결과를 확인할 수 있다.

실행 중 일시정지, 재개, 개별 에이전트 중지/재시작도 지원한다.

### Ultracode

단일 요청에 `ultracode`를 넣으면 Claude가 해당 작업을 Workflow로 구성하도록 요청할 수 있다.

`/effort ultracode`는 더 적극적인 모드로, Claude가 실질적인 작업마다 Workflow 사용 여부를 판단한다. Claude Code v2.1.203 이상이 필요하며 xhigh reasoning effort를 지원하는 모델에서 제공된다.

### 내장 `/deep-research`

Claude Code는 Dynamic Workflow의 대표 예제로 `/deep-research <question>`을 제공한다. 여러 관점의 웹 검색 → 소스 수집 → 교차 검증 → 주장 검증/투표 → 인용 보고서 합성 과정을 멀티 에이전트 Workflow로 수행한다.

## 아키텍처

```text
User Prompt
   |
   v
Claude Code
   |
   | Workflow script 생성
   v
Workflow Runtime (격리된 실행 환경)
   |
   +--> agent() ------> Subagent A
   |
   +--> pipeline() ---> Subagent B1
   |                  Subagent B2
   |                  Subagent B3 ...
   |
   +--> loop / branch / retry
   |
   +--> script variables에 중간 결과 유지
   |
   v
Final Result
   |
   v
Claude conversation context
```

핵심은 **Claude가 모든 중간 결과를 직접 들고 오케스트레이션하지 않는다는 것**이다. 런타임이 스크립트 상태와 에이전트 결과를 관리한다.

모든 실행은 `~/.claude/projects/` 아래 세션 디렉터리에 실행 스크립트를 기록한다.

## Subagent / Skill / Agent Team과 비교

| 방식 | 계획 주체 | 중간 상태 | 적합한 규모 | 반복성 |
|---|---|---|---|---|
| Subagent | Claude | Claude Context | 턴당 소수 작업 | Worker 정의 |
| Skill | Claude + 지침 | Claude Context | 소수 작업 | 지침 재사용 |
| Agent Team | Lead Agent | Shared Task List | 소수의 장기 실행 Peer | 팀 구조 |
| Dynamic Workflow | Script Runtime | Script Variables | 수십~수백 Agent | 오케스트레이션 자체 |

Agent Team이 **장시간 협업하는 소수의 동료 세션**에 가깝다면 Workflow는 **대량 작업을 처리하는 프로그래밍 가능한 Agent Batch/Graph Runtime**에 가깝다.

두 기능은 경쟁 관계라기보다 작업 성격에 따라 구분하는 것이 좋다.

## 장점

### 컨텍스트 압력 감소

중간 결과가 스크립트 변수에 남기 때문에 대규모 Fan-out 결과가 메인 Claude 컨텍스트를 직접 잠식하는 문제를 줄인다.

### 결정론적인 실행 구조

오케스트레이션을 코드로 저장할 수 있으므로 매번 Claude가 즉흥적으로 작업 분배를 다시 설계하는 것보다 재현성이 높다.

### 대규모 작업에 적합

공식 제한은 동시 최대 16개 에이전트, 실행당 최대 1,000개 에이전트다. 수백 파일 분석/마이그레이션 같은 작업에 기존 단일 세션보다 구조적으로 적합하다.

### 검증 패턴 구현 용이

Worker → Reviewer, 다수 독립 분석 → Voting, 실패 → Retry, 발견 → 검증 → 종합 같은 품질 패턴을 코드로 고정할 수 있다.

### 운영 가시성

`/workflows`에서 에이전트별 실행 상태와 토큰을 볼 수 있어 단순 서브에이전트 대화보다 대규모 작업을 관찰하기 쉽다.

## 단점 및 한계

### 토큰 비용

많은 에이전트를 생성하므로 같은 문제를 단일 대화로 처리하는 것보다 토큰 사용량이 크게 증가할 수 있다.

25개 이상의 에이전트를 예약하거나 예상 토큰이 150만을 넘으면 Claude Code v2.1.203 이상에서 `Large workflow` 경고가 표시된다.

### 실행 중 Human-in-the-loop 제약

Workflow 실행 중 일반 사용자 입력은 받을 수 없다. 단계별 사람 승인이 필요한 프로세스라면 Workflow를 여러 단계로 나누는 편이 적합하다.

### Workflow Script의 직접 I/O 제한

오케스트레이션 스크립트 자체는 파일 시스템이나 Shell을 직접 사용하지 않는다. 실제 읽기/쓰기/명령 실행은 Agent가 수행해야 한다.

### 세션 간 Resume 제한

중지 후 재개는 같은 Claude Code 세션에서 가능하다. Claude Code를 종료하면 다음 세션에서는 Workflow를 새로 시작한다.

### 로컬 자원 영향

동시 Agent 상한은 16개지만 CPU 코어가 제한된 환경에서는 실제 동시성이 더 낮아질 수 있다.

### 권한 관리

Workflow가 생성하는 서브에이전트는 `acceptEdits` 모드로 실행되며 파일 편집은 자동 승인된다. 허용 목록 밖의 Shell/Web/MCP 도구는 추가 권한 프롬프트가 발생할 수 있으므로 Enterprise 환경에서는 허용 정책 설계가 중요하다.

## 활용 사례

### 코드베이스 전체 Audit

파일 또는 API Endpoint별 Worker를 생성하고 결과를 별도 Reviewer Agent가 적대적으로 검증한 뒤 최종 보고서를 만든다.

### 대규모 Migration

수백 개 파일을 개별 Agent에 분배하고 각각 변환 → 빌드/검증 → 실패 재처리를 수행한다.

### PR Review

변경 파일별 Reviewer를 병렬 실행하고 마지막 Aggregator가 중복 제거와 심각도 순위를 수행한다.

### 반복 Fix Loop

컴파일/테스트 실패 → 오류 분석 → 수정 → 재검증을 성공하거나 진행이 멈출 때까지 반복한다.

### Research Harness

다수 소스를 독립 조사하고 별도 Agent가 주장들을 교차 검증한 뒤 Synthesizer가 최종 보고서를 작성한다. `/deep-research`가 공식 구현 예다.

## 기존 Harness 관점에서의 의미

Dynamic Workflow는 Claude Code가 단순 Coding Agent에서 **Agent Orchestration Runtime**으로 확장되는 기능으로 볼 수 있다.

기존에 별도 Python/Node 프로그램이나 Agent Framework로 구현하던 다음 구조를 Claude Code 내부에서 상당 부분 처리할 수 있다.

```text
Discover
  -> Fan-out Workers
  -> Validate
  -> Retry
  -> Aggregate
  -> Final Review
```

특히 자체 Orchestrator/Worker/Reviewer Harness를 설계하는 경우 Workflow는 좋은 비교 기준이 된다. 단순한 작업 분배는 외부 Harness 없이 Claude Code Workflow로 충분할 가능성이 커졌다.

반대로 장기 실행 서비스, DB 기반 Queue, 세션 간 상태 보존, 서로 다른 Vendor 모델의 정교한 라우팅, 외부 Dashboard 중심 운영이 필요하면 독립 Harness가 여전히 유리하다.

## 활용 아이디어

### 바로 적용 가능

- 대규모 코드 리뷰
- 반복적인 정적 분석 및 수정
- 변경 파일별 병렬 검증
- 기술 조사 + 교차 검증
- 여러 프로젝트의 동일 규칙 Audit

### PoC 가치 있음

기존 `Analysis -> Work -> Review` Agent 구조를 Workflow로 구현해볼 가치가 높다.

예:

```text
Analyzer Agents (parallel)
        |
        v
Work Agents (parallel)
        |
        v
Codex/Claude Review Agents
        |
        v
Aggregator
```

다만 Claude Code Workflow 내부 Agent는 기본적으로 세션 모델 또는 `CLAUDE_CODE_SUBAGENT_MODEL` 영향을 받으므로, Claude와 Codex처럼 Vendor가 다른 모델을 직접 Worker로 혼합하는 부분은 별도 Tool/MCP/Harness가 필요할 수 있다.

### 아이디어 참고

자체 Agent 플랫폼을 구축한다면 다음 설계는 특히 참고할 만하다.

- orchestration state를 LLM context 밖에 저장
- Agent 실행 상태 관찰 UI
- Agent별 token accounting
- pause/resume/restart
- fan-out + validation + aggregation 패턴
- workflow definition의 repository 공유

### 현재 도입 가치 낮음

작은 코드 수정, 한두 파일 분석, 단순 질문처럼 에이전트 Fan-out이 필요 없는 작업은 Workflow 오버헤드와 토큰 비용이 더 크다. 일반 Claude Code 또는 소수 Subagent가 낫다.

## Enterprise / Windows 관점

공식 문서상 Workflow는 CLI, Desktop, IDE Extension, `claude -p`, Agent SDK에서 사용할 수 있다. Windows/Linux에서는 prompt의 `ultracode` trigger를 임시 무시할 때 `Alt+W`를 사용할 수 있다.

조직 단위에서는 managed settings의 `disableWorkflows: true`로 비활성화할 수 있다. Shell/Web/MCP 권한은 기존 allowlist 정책을 따르므로 회사 환경에서는 대규모 Workflow 실행 전에 필요한 명령과 MCP 권한을 명시적으로 관리하는 것이 좋다.

## 결론

Dynamic Workflows의 핵심은 "서브에이전트를 더 많이 실행한다"가 아니다. **Agent orchestration을 LLM의 대화 판단에서 실행 가능한 코드로 분리했다는 점**이 중요하다.

대규모 반복 작업과 교차 검증에서는 Claude Code의 기존 Subagent/Agent Team보다 훨씬 명확한 실행 모델을 제공한다. 특히 자체 Agent Harness를 설계하고 있다면 Workflow가 담당할 수 있는 영역과 외부 Harness가 필요한 영역을 다시 나누어 볼 필요가 있다.

실무적으로는 전체 개발 작업을 무조건 Ultracode로 돌리기보다, `대량 Fan-out`, `반복/재시도`, `교차 검증`, `재사용할 오케스트레이션`이 필요한 작업에 선택적으로 적용하는 것이 적절하다.

## 참고 자료

- Claude Code Dynamic Workflows: https://code.claude.com/docs/ko/workflows
- Claude Code Agent Teams: https://code.claude.com/docs/ko/agent-teams
