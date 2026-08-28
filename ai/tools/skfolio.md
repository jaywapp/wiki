---
title: skfolio
category: tools
tags:
  - python
  - portfolio-optimization
  - quantitative-finance
  - scikit-learn
  - risk-management
source: https://skfolio.org/
updated: 2026-08-29
---

# skfolio

> scikit-learn 스타일 API로 포트폴리오 최적화·리스크 관리·팩터 모델·검증/튜닝을 하나의 ML 워크플로우로 다루는 Python 오픈소스 라이브러리.

## 프로젝트 개요

skfolio는 전통적인 포트폴리오 최적화 문제를 `scikit-learn`의 estimator/pipeline/model-selection 방식으로 다룰 수 있게 만든 Python 라이브러리다. 단순히 평균-분산 최적화 결과를 계산하는 수준보다, 학습/검증 분리, 교차검증, 하이퍼파라미터 탐색, 스트레스 테스트까지 포함한 재현 가능한 투자 연구 파이프라인 구축에 초점을 둔다.

공식 문서 기준 Python 3.10+를 요구하며 BSD 3-Clause 라이선스로 배포된다. 1.0.0 이후 public API 안정성과 semantic versioning을 명시한다.

## 해결하려는 문제

고전적인 Mean-Variance Optimization은 기대수익률과 공분산 추정치에 매우 민감하고, 특정 자산으로 비중이 집중되거나 turnover가 커지며, in-sample 성과가 좋아도 out-of-sample에서 성능이 악화될 수 있다.

skfolio의 핵심 접근은 포트폴리오 모델을 머신러닝 estimator처럼 취급하여 다음을 체계화하는 것이다.

- 학습/테스트 데이터 분리
- Walk-forward 및 금융 시계열용 교차검증
- 모델/파라미터 선택
- 데이터 누수 및 과적합 완화
- 여러 기대수익/공분산 추정기 조합
- 거래비용과 제약조건을 포함한 현실적인 최적화

## 핵심 기능

### 포트폴리오 최적화

- Equal Weight / Inverse Volatility / Random
- Mean-Risk
- Risk Budgeting
- Maximum Diversification
- Distributionally Robust CVaR
- Benchmark Tracking
- Hierarchical Risk Parity
- Hierarchical Equal Risk Contribution
- Nested Clusters Optimization
- Stacking Optimization

### 추정 및 팩터 모델

- Empirical / EW / Shrinkage expected returns
- Ledoit-Wolf, OAS, Denoising, Detoning, Graphical Lasso 등의 covariance estimator
- Black-Litterman
- Time-Series Factor Model
- Characteristics 기반 Cross-Sectional Factor Model
- Synthetic Data / Stress Test

### 검증과 튜닝

`scikit-learn`의 GridSearchCV/RandomizedSearchCV와 호환되며 금융 데이터에 필요한 다음 방식도 제공한다.

- Walk Forward
- Combinatorial Purged Cross-Validation
- Multiple Randomized Cross-Validation
- Online Predict / Score
- Online Grid / Randomized Search

### 리스크 측정

Variance뿐 아니라 CVaR, EVaR, Maximum Drawdown, CDaR, EDaR, Ulcer Index, VaR, skew, kurtosis 등 다양한 리스크 측정값을 지원한다.

### 현실적 제약

- Transaction costs
- Management fees
- L1/L2 regularization
- Weight / Group / Budget constraints
- Tracking error
- Turnover
- Cardinality
- Long/Short threshold

## 아키텍처

```text
Market / Factor Data
        │
        ▼
 preprocessing / pre-selection
        │
        ▼
 Prior / Moment Estimators
 ├─ expected returns
 ├─ covariance
 ├─ factor model
 └─ uncertainty set
        │
        ▼
 Optimization Estimator
 MeanRisk / HRP / RiskBudgeting / ...
        │ fit()
        ▼
 Portfolio
 ├─ weights
 ├─ returns
 ├─ risk/performance measures
 └─ composition/contribution
        │
        ▼
 Model Selection / Validation
 WalkForward / Purged CV / GridSearch
```

구조적으로 중요한 점은 최적화 알고리즘이 `fit()`/`predict()` 패턴을 따르고 결과 역시 Portfolio 객체로 표현된다는 것이다. 따라서 기존 Python ML 파이프라인과 결합하기 쉽다.

## 장점

- `scikit-learn` 경험을 그대로 활용할 수 있어 연구 코드 구조가 익숙하다.
- 단일 최적화 알고리즘이 아니라 추정→최적화→검증→튜닝을 통합한다.
- Walk-forward와 purged CV 등을 통해 금융 시계열의 데이터 누수 문제를 명시적으로 다룰 수 있다.
- 거래비용, turnover, cardinality 같은 실제 운용 제약을 포함할 수 있다.
- 단순 MVO부터 HRP, Black-Litterman, robust CVaR, factor model까지 범위가 넓다.
- BSD 라이선스로 내부 PoC/상용 시스템에 적용하기 비교적 용이하다.
- `llms.txt` 및 페이지별 Markdown 문서를 제공하여 AI Agent가 문서를 검색·소비하기 좋은 구조다.

## 단점 및 한계

- 포트폴리오 최적화 프레임워크이지 데이터 수집, 주문 실행, 브로커 연결까지 포함한 트레이딩 엔진은 아니다.
- 좋은 최적화 알고리즘을 사용해도 입력 데이터와 기대수익 추정이 나쁘면 결과가 좋아지는 것은 아니다.
- 고급 convex/mixed-integer 최적화는 solver 의존성과 계산비용이 커질 수 있다.
- 다양한 옵션 때문에 잘못된 검증 설계를 사용하면 여전히 과적합 위험이 존재한다.
- NautilusTrader 같은 execution/backtesting 플랫폼과 역할이 다르므로 실거래 시스템에는 별도의 데이터·백테스트·execution 계층이 필요하다.

## 활용 사례

### 자산배분 연구

ETF/주식 Universe에 대해 Equal Weight, HRP, Mean-Risk, Risk Budgeting을 동일한 데이터와 CV 조건에서 비교할 수 있다.

### 리밸런싱 정책 검증

거래비용과 turnover constraint를 넣어 이론적 최적 포트폴리오와 실제 운용 가능한 포트폴리오 사이의 차이를 평가할 수 있다.

### AI 기반 투자 Agent의 최적화 엔진

LLM이 직접 비중을 임의 생성하는 대신 다음 구조가 더 안전하다.

```text
LLM / Agent
  │ 시장상황·전략 조건 생성
  ▼
Data / Signal Layer
  ▼
skfolio
  │ 제약조건 기반 수학적 최적화
  ▼
Portfolio Weights
  ▼
Backtester / Trading Engine
```

LLM은 전략 선택과 조건 생성에 집중하고, 실제 자산 비중 계산은 검증 가능한 optimizer에 맡기는 방식이다.

## 기존 도구와 비교

### PyPortfolioOpt

PyPortfolioOpt는 비교적 간단하게 포트폴리오 최적화를 시작하기 좋다. skfolio는 여기에 ML 스타일의 pipeline, cross-validation, model selection과 더 폭넓은 estimator 조합을 강조한다.

### Riskfolio-Lib

Riskfolio-Lib 역시 매우 다양한 포트폴리오/리스크 모델을 지원한다. skfolio의 차별점은 scikit-learn API와 모델 검증/튜닝 워크플로우를 핵심 설계로 채택했다는 점이다.

### NautilusTrader

NautilusTrader는 이벤트 기반 백테스트 및 실거래 execution 시스템에 가깝고 skfolio는 portfolio construction/risk optimization 계층이다. 경쟁 관계라기보다 결합 가능한 구성요소다.

## 활용 아이디어

### 바로 적용 가능

- ETF/주식 포트폴리오의 Equal Weight vs HRP vs Mean-Risk 비교
- Walk-forward 기반 out-of-sample 성능 비교
- 거래비용/turnover를 포함한 리밸런싱 실험

### PoC 가치 있음

AI 투자 Agent가 시장 분석 후 직접 주문을 결정하지 않고 `전략/제약조건 → skfolio → 비중 → 별도 실행 엔진` 흐름으로 역할을 분리하는 구조.

특히 LLM이 다음과 같은 구조화된 조건만 생성하도록 제한할 수 있다.

- 최대 종목 비중
- sector/group exposure
- 목표 변동성
- turnover 상한
- 허용 risk measure
- optimizer 후보

이후 skfolio가 결정론적/수학적 최적화를 수행하고, walk-forward 검증을 통과한 결과만 execution 계층으로 넘긴다.

### 아이디어 참고

skfolio가 제공하는 `llms.txt`/Markdown 문서 구조는 사내 기술 문서나 Agent Skill 문서를 LLM-friendly하게 만드는 사례로도 참고 가치가 있다.

## 결론

skfolio의 강점은 '최적화 알고리즘이 많다'는 것보다 **포트폴리오 최적화를 머신러닝 모델처럼 학습·검증·튜닝할 수 있게 만든 구조**에 있다.

단순 자동매매 봇을 만들기 위한 올인원 프레임워크는 아니지만, AI/퀀트 시스템에서 자산배분과 리스크 제어 계층을 담당시키기에는 상당히 적합하다. 특히 LLM Agent와 결합할 경우 LLM의 비결정적 판단과 실제 자산 비중 산출을 분리하는 안전장치로 활용할 가치가 있다.

**평가: PoC 가치 높음 — 특히 AI 기반 투자/자산배분 시스템의 Portfolio Optimization Layer로 유용.**

## 참고 자료

- https://skfolio.org/
- https://skfolio.org/user_guide/index.html
- https://github.com/skfolio/skfolio
- https://arxiv.org/abs/2507.04176
