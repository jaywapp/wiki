# Claude Graph Engineering

## 개요

`Graph Engineering`은 Anthropic의 공식 제품명이나 공식 용어는 아니다. 최근 Claude Code 커뮤니티에서, 하나의 에이전트가 긴 루프를 도는 대신 **작업을 DAG(Directed Acyclic Graph) 형태로 분해하고 여러 전문 에이전트가 노드 단위로 수행하도록 설계하는 방식**을 가리키는 표현으로 사용되고 있다.

핵심은 프롬프트 문장 자체보다 **작업의 토폴로지**를 설계하는 것이다.

- Node: 하나의 독립된 작업/전문 에이전트
- Edge: 노드 간 의존성과 데이터 전달
- Fan-out: 독립 작업을 병렬 실행
- Merge/Sink: 여러 결과를 합쳐 최종 산출물 생성
- Verifier/Evaluator: 결과를 별도 컨텍스트에서 검증
- Gate: 테스트, 스키마, 종료 코드 등 기계적으로 확인 가능한 통과 조건

## Anthropic 공식 패턴과의 관계

Anthropic이 공식적으로 설명한 패턴 중 Graph Engineering과 직접 연결되는 것은 다음 두 가지다.

### Orchestrator-Workers

중앙 Orchestrator가 문제를 동적으로 분해하고 Worker들에게 하위 작업을 위임한 뒤 결과를 종합한다.

### Evaluator-Optimizer

하나의 모델/에이전트가 결과를 만들고 다른 평가자가 검증 및 피드백하여 반복적으로 품질을 높인다.

Graph Engineering은 이 패턴들을 DAG 형태로 조합한 커뮤니티식 확장 개념으로 볼 수 있다.

## Loop와 Graph의 차이

### Loop

```text
Goal
  ↓
Claude
  ↓
Implement
  ↓
Review
  ↓
Fix
  └────→ Review
```

장점:
- 단순함
- 컨텍스트 유지가 쉬움
- 토큰/에이전트 비용이 낮음

단점:
- 같은 에이전트가 자기 결과를 검증하는 문제가 생길 수 있음
- 대규모 작업에서 컨텍스트가 비대해짐
- 독립 작업의 병렬화가 어렵다

### Graph

```text
                 ┌─ Worker A ─┐
Goal → Planner ──┼─ Worker B ─┼→ Merge → Verify → Result
                 └─ Worker C ─┘
                         ↑          │
                         └── Fix ───┘
```

장점:
- 병렬화
- 역할별 컨텍스트 격리
- 검증 에이전트를 분리 가능
- 대규모 코드베이스 탐색/감사에 유리
- 작업별 산출물과 검증 근거를 남기기 쉬움

단점:
- 에이전트 수와 토큰 사용량이 크게 증가할 수 있음
- 그래프 설계를 잘못하면 오히려 비효율적
- 모든 노드가 같은 대형 컨텍스트를 반복해서 읽는 작업에는 부적합

## `ayaangazali/graph-engineering`

Claude Code용 Graph Engineering 플러그인 구현 중 하나.

Repository:
- https://github.com/ayaangazali/graph-engineering

주요 명령:

```text
/graph <goal>
/graph-plan <goal>
/graph-save [name]
/graph-goal <goal>
/graph-next [slug]
/graph-eval <task-class>
```

### `/graph`

목표를 DAG로 분해하고 실행한다.

예:

```text
/graph audit src/routes for security issues
```

대략적인 형태:

```text
scope
 ├─ injection finder
 ├─ authorization finder
 └─ secret finder
        ↓
      dedup
        ↓
 adversarial verification
        ↓
    synthesis
```

각 Edge는 자연어 전달이 아니라 JSON Schema 기반의 명시적 계약을 사용하는 것을 지향한다.

### `/graph-plan`

실행 전에 DAG와 예상 에이전트 수를 확인하는 Dry Run 기능.

토큰 비용이 큰 Graph Workflow를 실행하기 전에 가장 먼저 써볼 가치가 있다.

### `/graph-save`

잘 동작한 그래프를 `.claude/workflows/*.js` 형태의 재사용 가능한 워크플로로 저장한다.

반복되는 개발 작업을 팀 단위 Slash Command로 만들 때 유용하다.

### `/graph-goal` + `/graph-next`

장기 작업을 디스크에 Persistent Graph 상태로 저장하고 매 실행마다 하나의 gated node를 처리한다.

특히 여러 세션에 걸친 개발 작업이나 unattended agent workflow와 잘 맞는다.

## 대표 Graph 패턴

해당 프로젝트가 정리한 주요 패턴은 다음과 같다.

1. Validation Chain
2. Fan-out + Merge
3. Judge Panel
4. Adversarial Verify
5. Loop-until-dry
6. Map-Reduce Sweep
7. Evaluator-Optimizer
8. Gated Sequence
9. Oracle Forge
10. Consensus Distribution
11. Obligation Ledger
12. Grounded Audit
13. Crucial Experiment

## 언제 유용한가

Graph Engineering이 특히 효과적인 작업:

- 대규모 Repository Audit
- 수십/수백 파일 Migration
- Security Review
- 여러 독립 가설을 동시에 조사해야 하는 Root Cause 분석
- 여러 소스를 조사하는 Deep Research
- 구현자와 Reviewer를 분리해야 하는 작업
- 결과에 검증 가능한 Evidence/Receipt가 필요한 작업

반대로 아래 작업에는 일반 Claude Loop가 더 효율적이다.

- 작은 버그 수정
- 한두 파일 변경
- 간단한 리팩터링
- 하나의 컨텍스트를 계속 유지하는 것이 중요한 작업
- 토큰 비용이 중요한 작업

## 실무적으로 이해하는 가장 쉬운 표현

```text
Prompt Engineering
= AI에게 어떻게 말할 것인가

Context Engineering
= AI에게 무엇을 보여줄 것인가

Loop Engineering
= AI가 어떻게 반복하게 할 것인가

Graph Engineering
= 여러 AI 작업을 어떤 구조와 의존성으로 연결할 것인가
```

즉 Graph Engineering의 핵심 대상은 **프롬프트가 아니라 작업 구조**다.

## 참고

- Anthropic — Building Effective Agents
  - https://www.anthropic.com/engineering/building-effective-agents
- ayaangazali/graph-engineering
  - https://github.com/ayaangazali/graph-engineering
- Ranteck/graph-engineer
  - https://github.com/Ranteck/graph-engineer

## 주의

`Graph Engineering`이라는 명칭 자체는 Anthropic 또는 OpenAI의 공식 용어가 아니다. 현재는 Claude Code 및 멀티에이전트 커뮤니티에서 사용되는 설계 관점/패턴에 가깝다.
