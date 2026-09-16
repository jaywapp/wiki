---
title: TypeSafe AI Jev
category: news
tags:
  - ai
  - model
  - decision-model
  - automation
  - agent
  - cost-optimization
source: https://typesafe.ai/blog/introducing-system-one-models-and-jev
updated: 2026-09-16
---

# TypeSafe AI Jev

> 자유 텍스트를 생성하는 LLM 대신, 비정형 상태를 입력받아 **타입이 지정된 판단과 확률**을 매우 빠르고 저렴하게 반환하도록 설계된 TypeSafe AI의 첫 System One Model.

## 프로젝트 개요

TypeSafe AI는 2026년 9월 Jev를 early access로 공개했다. 창업자 Diogo Almeida는 OpenAI에서 instruction following/ChatGPT 기반 연구에 참여했으며, TypeSafe는 일반적인 대화형 LLM이 아니라 소프트웨어 자동화 내부에서 반복적으로 필요한 판단에 특화된 모델 계층을 제안한다.

핵심 인터페이스는 `unstructured state in -> typed probabilistic decisions out`이다. 즉 문장을 생성하기보다 개발자가 정의한 질문·선택지·평가 기준에 대해 구조화된 값과 확률을 반환하고, 애플리케이션이 그 결과를 바로 분기 조건으로 사용한다.

## 해결하려는 문제

LLM 기반 자동화에서는 분류, 라우팅, 검증, 우선순위 결정처럼 작은 판단도 매번 생성형 모델을 호출한다. 이 방식은 다음 문제가 있다.

- token-by-token 생성 때문에 지연 시간이 커진다.
- 출력 토큰 비용이 반복적으로 발생한다.
- 자유 형식 응답을 다시 파싱하거나 schema validation해야 한다.
- 수십~수백 개의 작은 판단을 agent loop 안에서 반복하면 비용과 latency가 누적된다.
- confidence를 안정적으로 프로그램 분기에 사용하기 어렵다.

Jev는 생성 자체를 포기하고 이 판단 계층만 최적화한다.

## 핵심 기능

- 여러 구조화 질문에 대한 병렬 판단
- typed output
- 각 판단에 대한 probability/confidence 제공
- TypeSafe가 RLCD(Reinforcement Learning for Calibrated Decisions)라고 부르는 학습 방식
- automation/workflow 내부의 분류·검증·라우팅 용도
- 공식 발표 기준 입력 $0.042 / 1M tokens, output token 비용 없음
- 공식 측정에서 System One workflow에 대해 기존 frontier LLM 대비 큰 latency/cost 감소를 주장

성능·가격 수치는 출시 시점 TypeSafe 자체 측정 결과이므로 실제 업무 데이터에서 별도 검증이 필요하다.

## 아키텍처

```text
                    ┌─────────────────────────┐
Raw state/context ─▶│ Jev / System One Model │
                    │                         │
Questions/schema ──▶│ parallel decision      │
                    │ calibrated probability │
                    └───────────┬─────────────┘
                                │
                  typed decisions + probability
                                │
               ┌────────────────┼────────────────┐
               ▼                ▼                ▼
             route           validate          execute
               │                │                │
               └────────────┬───┴────────────────┘
                            ▼
                 Strong LLM / Human only
                   when ambiguous
```

TypeSafe 설명상 Jev stack은 새로운 model architecture, parallel sampler, RLCD로 구성된다. 세부 모델 구조와 학습 데이터 등은 출시 시점 공개 정보만으로 충분히 검증되지 않았다.

## Agent / Harness 관점의 핵심

Jev의 가장 흥미로운 위치는 Claude/Codex 같은 생성형 모델을 대체하는 것이 아니라 **agent loop의 decision plane**을 담당하는 것이다.

```text
Claude / Codex
  │
  ├─ 계획/코드/문서 생성
  │
  └─ Tool 실행 전후
        │
        ▼
       Jev
        ├─ 지금 tool을 호출해야 하는가?
        ├─ 어떤 worker로 routing할 것인가?
        ├─ 결과가 요구사항과 관련 있는가?
        ├─ review가 필요한가?
        ├─ retry해야 하는가?
        └─ human escalation이 필요한가?
```

이 구조는 비싼 생성형 모델 호출 사이에 값싼 판단 계층을 삽입하는 방식이다.

## 활용 사례

### 1. Agent Router

작업을 분석해 coding/research/review/release agent 중 어디로 보낼지 결정한다.

### 2. Tool-call Gate

Claude/Codex가 제안한 tool call이 현재 작업에 필요한지 판단하고, 낮은 confidence일 때만 강한 모델 또는 사용자 확인으로 escalation한다.

### 3. Retrieval Navigator

검색 결과 전체를 LLM context에 넣지 않고 후보 문서의 관련성을 Jev로 판단해 다음에 읽을 문서를 선택한다. 대규모 사내 Wiki/문서 검색에서 특히 흥미롭다.

### 4. Continuous Review

코드·문서 생성 중 반복 표현, 요구사항 충족 여부, 위험 패턴 등을 작은 질문으로 분해해 지속 검사한다.

### 5. Ticket / Incident Triage

문의 종류, 담당 팀, urgency, human review 필요 여부를 한 번에 판단해 기존 workflow에 전달한다.

## Claude 기반 작업 워크스페이스 적용 아이디어

현재 Claude/Codex 중심 Harness에 적용한다면 다음 형태가 적합하다.

```text
User Goal
   │
   ▼
Claude Orchestrator ── 생성/복잡 추론
   │
   ├── Jev: task classification
   ├── Jev: worker selection
   ├── Jev: context relevance filter
   ├── Worker Claude/Codex
   │       │
   │       └── Jev: result / requirement checks
   │
   ├── confidence high ──▶ continue automatically
   └── confidence low  ──▶ Claude reviewer / human
```

특히 반복적인 `LLM-as-a-judge` 호출을 Jev로 치환할 수 있는지가 PoC의 핵심이다.

## 장점

- 판단 전용 workload에서 매우 낮은 latency/cost 가능성
- typed output이라 기존 코드와 연결하기 쉽다.
- probability를 threshold 기반 automation에 직접 활용할 수 있다.
- agent loop의 작은 판단마다 frontier LLM을 호출하는 구조를 줄일 수 있다.
- output generation이 없으므로 생성 결과 파싱 비용을 줄인다.

## 단점 및 한계

- 자유 텍스트, 코드, 설명을 생성할 수 없으므로 Claude/Codex 대체 모델이 아니다.
- 출시 초기/early access 단계다.
- 공식 benchmark가 TypeSafe가 정의한 System One workflow 중심이다.
- 실제 enterprise 데이터에서 calibration과 정확도를 직접 검증해야 한다.
- closed/hosted 서비스 중심으로 보이며 self-host/on-premise 가능 여부가 확인되지 않았다.
- 사내 코드·문서·계약 정보 전달 시 데이터 보안 및 enterprise 정책 확인이 필요하다.
- `can't hallucinate`라는 표현은 자유 형식 hallucination을 구조적으로 없앤다는 의미로 이해해야 하며, **판단 자체가 항상 정답이라는 의미는 아니다.**
- confidence threshold 설계가 잘못되면 잘못된 자동화가 빠르게 확대될 수 있다.

## 기존 LLM과 비교

| 구분 | Jev | Claude/Codex 계열 LLM |
|---|---|---|
| 주 역할 | 판단/분류/확률 | 생성/추론/코딩 |
| 출력 | typed decision + probability | text/code/tool call |
| 생성 | 없음 | 있음 |
| 적합한 위치 | inner loop / router / judge | planner / worker / reviewer |
| 비용 구조 | 반복 판단에 최적화 | 복잡 작업에 적합 |
| 대체 관계 | 보완재 | 보완재 |

핵심은 `small model vs big model` 라우팅보다 더 극단적으로 **decision model vs generative model**로 역할을 분리한다는 점이다.

## 활용 아이디어 평가

### 바로 적용 가능

현재는 early access이므로 일반적인 즉시 도입보다는 API 접근권 확보 후 제한된 실험이 현실적이다.

### PoC 가치 높음

- Claude/Codex agent routing
- context relevance filtering
- tool-call validation
- PR/code review의 반복 rule checks
- Perforce changelist triage
- 사내 ticket routing
- human escalation gate

특히 기존 Harness에서 LLM 호출 로그를 분석해 **짧고 반복되며 출력이 enum/bool/score인 호출**을 먼저 찾으면 Jev 후보를 빠르게 식별할 수 있다.

### 아이디어 참고

Jev를 사용할 수 없는 환경에서도 이 설계 자체는 유용하다. 생성형 모델을 모든 단계에 쓰지 않고 `decision plane`을 별도로 두는 Harness architecture를 고려할 수 있다.

### 현재 도입 가치 낮음

- 코드 생성
- 요구사항 인터뷰
- 복잡한 설계
- 긴 문서 작성
- 설명이 필요한 리뷰

이 영역은 생성형 LLM이 계속 담당하는 편이 자연스럽다.

## 결론

Jev의 중요한 포인트는 더 작은 챗봇이 아니라 **생성하지 않는 AI 판단 계층**이라는 점이다. Agent Harness 관점에서는 Claude/Codex가 계획·생성·복잡 추론을 담당하고 Jev가 routing, gating, validation, retrieval navigation 같은 반복 판단을 담당하는 구조가 가장 현실적이다.

따라서 도입 여부를 평가할 때는 전체 LLM을 교체하려 하지 말고 현재 workflow에서 `bool / enum / score / probability`로 끝나는 반복 호출을 찾아 latency·cost·정확도를 비교하는 PoC가 적합하다.

## 참고 자료

- TypeSafe AI, Introducing System One Models and Jev: https://typesafe.ai/blog/introducing-system-one-models-and-jev
- TypeSafe AI: https://typesafe.ai/
- Business Wire, TypeSafe AI emerges from stealth (2026-09-15)
