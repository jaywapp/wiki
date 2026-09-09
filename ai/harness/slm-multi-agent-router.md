---
title: SLMs as Multi-Agent Routers
category: harness
tags:
  - ai
  - agent
  - multi-agent
  - routing
  - slm
  - reinforcement-learning
source: https://arxiv.org/abs/2608.00030
updated: 2026-09-09
---

# SLMs as Multi-Agent Routers

> 작은 언어 모델(SLM)을 멀티 에이전트의 전면 라우터로 두고, SFT로 의도 기반 라우팅을 학습한 뒤 실제 검색 결과 품질을 보상으로 RL을 적용해 라우팅을 보정하는 접근이다.

## 프로젝트 개요

Kondapalli et al.의 SIGIR 2026 AgentSearch 워크숍 논문이다. 전문 검색 에이전트가 여러 개 존재할 때 사용자 질의를 어떤 에이전트에 전달할지, 그리고 검색에 필요한 키워드와 시간 범위를 어떻게 생성할지를 하나의 SLM이 담당한다.

핵심 주장은 **라우팅을 질의의 주제/의도만 보고 결정하지 말고, 실제 downstream 결과 품질을 학습 신호로 사용해야 한다**는 것이다.

논문은 11개 전문 검색 에이전트를 대상으로 Qwen3-0.6B를 SFT 후 REINFORCE++로 학습했다.

## 해결하려는 문제

일반적인 LLM Router는 대체로 다음처럼 동작한다.

```text
Query -> Intent/Topic 판단 -> Agent 선택
```

하지만 질의가 특정 분야와 표면적으로 일치해도 해당 전문 에이전트가 실제로 좋은 결과를 반환한다는 보장은 없다. 예를 들어 genomics와 biomedical literature 경계의 질의는 genomics agent가 주제상 맞아 보여도 일반 biomedical agent가 더 좋은 결과를 낼 수 있다.

또한 큰 LLM을 모든 요청의 router로 사용하면 라우팅 자체가 비용과 latency의 병목이 된다.

## 핵심 기능

### 1. SLM 기반 Multi-Agent Router

Router는 질의마다 다음 구조를 동시에 생성한다.

```text
phi(q) = (domain/agent selection, keywords, time interval)
```

- agent 선택
- 복수 agent 선택을 위한 bitmask
- 검색 keyword 추출
- temporal interval 추론

즉 단순 classifier가 아니라 downstream tool call의 parameter generator 역할까지 한다.

### 2. Progressive SFT + RL

1단계 SFT는 production search log와 synthetic query로 query understanding과 기본 agent selection을 학습한다.

2단계 RL은 실제 선택된 agent가 반환한 retrieval result를 평가하고 이를 reward로 router를 보정한다.

SFT checkpoint에서 크게 벗어나지 않도록 KL penalty도 사용한다.

### 3. Retrieval-quality grounded reward

Reward는 크게 두 축이다.

```text
R = lambda_src * R_src + lambda_con * R_con
```

`R_src`는 agent/source 선택, 날짜, keyword 등 query 자체에서 판단할 수 있는 routing quality를 평가한다.

`R_con`은 실제 검색 결과의 relevance와 source trust를 평가한다. relevance는 direct answerability, completeness, semantic alignment, factual grounding 등을 포함한다.

따라서 "의도상 맞는 agent"와 "실제로 결과가 좋은 agent" 사이의 차이를 학습할 수 있다.

## 아키텍처

```text
User Query
    |
    v
+-------------------+
| SLM Router        |
| Qwen3-0.6B        |
|                   |
| agent selection   |
| keywords          |
| time interval     |
+---------+---------+
          |
          v
+---------------------------+
| Specialized Agents (11)   |
| Academic / Patents / ...  |
+-------------+-------------+
              |
              v
        Ranked Results
              |
              v
        Reward Oracle
      /               \
 routing quality   content quality
      \               /
              Reward
                |
                +----> RL update
```

운영 시에는 Router -> Agent 호출까지만 수행하며, reward loop는 학습 단계에서 사용된다.

## 학습 구성

### Base model 선정

3B 이하 모델을 비교한 결과 Qwen3-0.6B가 선택됐다. zero-shot 단계에서 source selection 44%, recency 70%, full correctness 30%를 기록했다.

### SFT

- production search log 기반 56,000 queries
- 11 domains
- train/validation/test = 70/15/15
- Unsloth
- bf16, no quantization
- LoRA rank 16 / alpha 32
- 2 epochs
- max sequence length 512

### RL

- production search log 11,000 queries
- REINFORCE++
- temperature 1.0
- KL penalty 0.15
- actor learning rate 5e-6
- batch size 32

## 실험 결과

논문이 보고한 전체 mean NDCG@10은 다음과 같다.

| Router | Mean NDCG@10 |
|---|---:|
| Qwen3-0.6B SFT+RL | **0.771** |
| Amazon Nova Lite | 0.594 |
| Claude Haiku 4.5 | 0.552 |

전문 agent와 query가 표면적으로는 맞지만 실제 전문성이 어긋나는 targeted subset에서는 다음 결과를 보고했다.

| Router | NDCG@10 |
|---|---:|
| SLM SFT+RL | **0.918** |
| Nova Lite | 0.539 |
| Haiku 4.5 | 0.490 |

평균 selection latency는 120.1ms이며 Nova Lite 대비 82.4% 감소했다고 보고한다.

단, relevance 평가에 Claude Sonnet 4.6 기반 LLM-as-judge를 사용했으므로 숫자를 절대적인 품질 지표로 해석해서는 안 된다.

## 두 번째 이미지의 AI Gateway와의 관계

첨부된 두 번째 구조는 Envoy Proxy + ExtProc sidecar 기반 AI Gateway가 OpenAI, OpenRouter, Bedrock, Vertex AI, Qwen 등 **모델 제공 업체**로 요청을 전달하는 구조다.

두 구조는 비슷해 보이지만 routing layer의 목적이 다르다.

```text
현재 Gateway
Request
  -> Gateway policy
  -> Provider / Model

논문의 Router
Query
  -> semantic + learned routing
  -> Specialized Agent(s)
  -> downstream quality feedback
```

따라서 논문의 SLM Router를 AI Gateway 자체와 교체하기보다는 **Gateway의 semantic routing decision layer**로 추가하는 것이 자연스럽다.

```text
Application
    |
    v
AI Gateway
    |
    +--> Auth / quota / logging / policy
    |
    +--> SLM Router
            |
            +--> Coding Agent
            +--> Search Agent
            +--> Analysis Agent
            +--> Review Agent
            +--> General Agent
                    |
                    v
             Model Provider
```

Gateway는 인증·관측·rate limit·provider abstraction을 담당하고, SLM Router는 요청 특성에 따라 agent/model/tool을 결정한다.

## 장점

- 0.6B급 모델로 critical-path routing latency를 낮출 수 있다.
- 대형 LLM Router 호출 비용을 줄일 가능성이 크다.
- 단순 intent classifier보다 실제 downstream 성능에 최적화할 수 있다.
- agent 선택과 tool parameter 생성을 한 모델에서 수행한다.
- 복수 agent routing을 지원한다.
- production feedback이 쌓일수록 조직 고유 workload에 특화할 수 있다.

## 단점 및 한계

### 학습 파이프라인 비용

SFT dataset, production logs, reward evaluation, RL pipeline이 필요하다. Agent 종류나 backend 특성이 자주 바뀌면 재학습 비용이 생긴다.

### Reward 설계가 어렵다

잘못 설계된 reward는 실제 사용자 가치가 아니라 proxy metric을 최적화할 수 있다. 검색이 아닌 coding/build/review agent에 적용하려면 NDCG 대신 task-specific reward를 새로 설계해야 한다.

### LLM-as-judge 의존

학습 label과 retrieval relevance 평가 모두 LLM judge에 상당 부분 의존한다. judge bias가 router policy로 전파될 수 있다.

### 비교 범위 제한

논문의 주된 baseline은 Nova Lite와 Haiku 4.5이다. 최신 router-specific classifier, embedding router, rules+classifier hybrid 등 모든 실무 대안을 포괄적으로 비교한 것은 아니다.

### Retrieval 중심 연구

11개의 전문 retrieval agent 환경에서 검증됐다. 일반적인 coding agent orchestration으로 동일한 성능 향상이 재현된다고 보장할 수 없다.

## 기존 방식과 비교

| 방식 | 장점 | 단점 |
|---|---|---|
| Rule Router | 빠르고 설명 가능 | 복잡한 의도 처리 취약 |
| Embedding/Classifier | 저렴하고 빠름 | tool parameter 생성과 복합 reasoning 한계 |
| Large LLM Router | 높은 zero-shot 범용성 | 비용/latency |
| SLM + SFT | 빠르고 workload 특화 | intent 수준에 머무를 수 있음 |
| **SLM + SFT + RL** | 실제 downstream 결과로 최적화 | 데이터·reward·학습 인프라 필요 |

## 활용 사례

- enterprise AI gateway의 semantic model/agent routing
- 사내 전문 검색 agent 선택
- coding / review / documentation agent 분배
- MCP tool selection
- cheap/fast model과 expensive/reasoning model 사이의 routing
- 조직 내부 workload에 특화된 model gateway

## 활용 아이디어

### 바로 적용 가능 — 로그 수집부터 시작

현재 AI Gateway에서 다음 데이터를 남긴다.

```text
request features
selected model/agent
tool calls
latency
token usage
success/failure
retry/fallback
user/automated evaluation
```

학습보다 먼저 routing dataset을 만드는 것이 중요하다.

### PoC 가치 높음 — 작은 Router를 Gateway sidecar로 배치

ExtProc sidecar 내부 또는 별도 inference service에 0.5~1.5B SLM을 배치하고 다음처럼 시작할 수 있다.

```text
Rule Guard
   |
   v
SLM Router
   |
   +-- simple -> cheap model
   +-- coding -> coding model/agent
   +-- analysis -> reasoning model
   +-- uncertain -> strong general LLM
```

처음에는 SFT 없이 shadow mode로 기존 routing decision과 비교하고, 충분한 로그가 확보된 뒤 SFT를 적용하는 편이 현실적이다.

### 중기 PoC — 결과 기반 reward 도입

개발 환경에서는 retrieval NDCG 대신 다음 신호를 reward 후보로 사용할 수 있다.

- 코드 리뷰 acceptance
- build/test pass
- retry 횟수
- task completion
- latency
- token/cost
- human override

예를 들면:

```text
Reward = task_success
       - cost_penalty
       - latency_penalty
       - retry_penalty
```

### 현재는 신중 — 곧바로 RL production 적용

Agent/Model 구성이 아직 자주 바뀌거나 충분한 feedback data가 없다면 RL router부터 구축하는 것은 과도하다. 우선 rules -> logging -> shadow SLM -> SFT -> offline reward evaluation -> RL 순서가 안전하다.

## 결론

이 논문의 가장 중요한 아이디어는 **"Router도 실제 작업 결과를 보고 학습해야 한다"**는 것이다.

특히 AI Gateway에서 매 요청마다 대형 LLM에게 "어떤 모델/에이전트를 쓸까?"를 묻는 구조보다, 조직 workload에 맞게 학습된 작은 Router를 앞단에 배치하는 방향에 강한 근거를 제공한다.

첨부된 AI Gateway 구조에는 직접 대체보다는 semantic routing layer로 결합하는 것이 적합하다. 실무적으로는 RL 자체보다 먼저 routing telemetry와 평가 신호를 설계하는 것이 핵심이다.

**평가: PoC 가치 높음.** 특히 다중 모델·다중 agent를 AI Gateway 뒤에서 운영하고 있다면 shadow routing부터 실험할 가치가 있다.

## 참고 자료

- Paper: https://arxiv.org/abs/2608.00030
- HTML: https://arxiv.org/html/2608.00030v1
- AgentSearch @ SIGIR 2026: https://agent-search.github.io/agentsearch-sigir26/
