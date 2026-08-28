---
title: Kronos
category: tools
tags:
  - ai
  - finance
  - time-series
  - foundation-model
  - forecasting
source: https://github.com/shiyu-coder/Kronos
updated: 2026-08-29
---

# Kronos

> 금융 캔들(OHLCV/K-line)을 언어처럼 토큰화해 다음 캔들 시퀀스를 생성하는 금융 시계열 특화 Foundation Model이다.

## 프로젝트 개요

Kronos는 일반 LLM이 텍스트 토큰을 예측하듯 금융시장의 K-line(캔들) 시퀀스를 토큰화하고 autoregressive Transformer로 미래 시퀀스를 모델링하는 오픈소스 프로젝트다. 논문은 arXiv 2508.02739로 공개됐으며 AAAI 2026에 채택되었다고 프로젝트가 밝히고 있다.

학습 데이터는 45개 이상의 글로벌 거래소에서 수집한 120억 개 이상의 K-line 레코드다. 주된 대상은 가격 예측뿐 아니라 변동성 예측, 합성 금융 시계열 생성 등이다.

## 해결하려는 문제

기존 범용 Time Series Foundation Model은 금융 데이터의 높은 노이즈, OHLCV 간 관계, 거래 활동 패턴을 충분히 반영하지 못하는 경우가 있다. 또한 가격 forecasting에만 초점을 두어 변동성 예측이나 합성 데이터 생성 같은 금융 특화 downstream task를 통합적으로 처리하기 어렵다.

Kronos는 금융 캔들 자체를 별도의 언어로 보고 금융 전용 tokenizer와 대규모 autoregressive pre-training을 결합한다.

## 핵심 기능

- OHLC 및 선택적 volume/amount 기반 K-line forecasting
- 금융 데이터 전용 hierarchical discrete tokenizer
- autoregressive Transformer 기반 probabilistic forecasting
- `KronosPredictor`를 통한 전처리·정규화·추론·역정규화 통합
- `predict_batch`를 통한 GPU 병렬 batch inference
- 자체 데이터 fine-tuning 파이프라인
- Qlib 기반 A-share 예제 및 backtesting 예제
- CSV 기반 별도 fine-tuning 경로
- Flask 기반 Web UI
- CPU, CUDA, Apple MPS 지원

## 모델 구성

| 모델 | 파라미터 | Context | 공개 여부 |
|---|---:|---:|---|
| Kronos-mini | 4.1M | 2048 | 공개 |
| Kronos-small | 24.7M | 512 | 공개 |
| Kronos-base | 102.3M | 512 | 공개 |
| Kronos-large | 499.2M | 512 | 미공개 |

공개 모델은 Hugging Face의 `NeoQuasar` 계정에서 배포된다.

## 아키텍처

```text
Raw K-line
OHLC + Volume/Amount
       │
       ▼
Normalization / preprocessing
       │
       ▼
Kronos Tokenizer
continuous multidimensional values
       │
       ▼
hierarchical discrete tokens
       │
       ▼
Decoder-only Autoregressive Transformer
       │
       ▼
Future token sequence sampling
(T / top_p / sample_count)
       │
       ▼
Decode + inverse normalization
       │
       ▼
Predicted future K-lines
```

핵심은 숫자를 그대로 Transformer에 입력하는 대신 금융시장의 연속형 다차원 캔들을 discrete token으로 변환한다는 점이다. 이를 통해 LLM의 next-token prediction과 유사한 방식으로 다음 금융 상태를 생성한다.

## Benchmark

논문 보고 기준으로 Kronos는 zero-shot 금융 task에서 다음 성과를 주장한다.

- 가격 시계열 forecasting RankIC: 주요 TSFM 대비 약 93% 향상
- best non-pretrained baseline 대비 RankIC 약 87% 향상
- volatility forecasting MAE 약 9% 감소
- synthetic K-line generation fidelity 약 22% 향상

다만 이는 논문의 benchmark 결과이며 개별 종목의 실전 수익률이나 매매 성과를 의미하지 않는다.

## 실사용 관점

프로젝트는 단순 논문 코드 수준을 넘어 prediction example, batch inference, fine-tuning, tests, Web UI까지 포함한다. Web UI에서는 실제 모델을 선택하고 K-line 파일을 로드하여 temperature, top-p, sample count 등을 조절하면서 예측과 실제 데이터를 비교할 수 있다.

2026년 공개 사용자 테스트 사례에서는 중국 A-share 종목별 편차가 크게 나타났다. 한 사용자의 Kronos-small 테스트에서 China Mobile은 MAPE 약 8.25%였지만 Zijin Mining은 약 44.26%였으며 방향 자체가 틀렸다고 보고했다. 해당 사용자는 상대적으로 안정적인 종목의 trend/risk observation에는 가능성이 있으나 3~5% 수준의 단기 매매 신호로 직접 사용하기에는 오차가 크다고 평가했다.

이는 OHLCV만으로는 원자재 가격, 환율, macro, sector factor, 뉴스 같은 외생 변수를 설명할 수 없다는 구조적 한계를 잘 보여준다.

## 장점

### 금융 데이터에 특화된 Foundation Model

일반 시계열 모델을 그대로 적용하는 것이 아니라 금융 캔들의 구조를 위한 tokenizer부터 설계했다는 점이 가장 큰 차별점이다.

### Zero-shot 출발점

처음부터 개별 시장용 모델을 학습하지 않고 pretrained model을 baseline으로 사용할 수 있어 금융 AI PoC 비용을 낮춘다.

### 모델 크기가 비교적 작음

4.1M~102.3M 공개 모델은 LLM에 비하면 매우 작아 로컬 inference와 반복 실험에 유리하다.

### Fine-tuning 가능

특정 거래소, 종목군, 주기 등에 맞춰 tokenizer와 predictor를 fine-tuning할 수 있다.

### 생성 모델 특성

단일 point estimate만 반환하기보다 sampling을 통해 여러 미래 price path를 생성할 수 있어 시나리오 생성, risk simulation 등에 활용할 여지가 있다.

### MIT License

상용 PoC나 내부 연구에 적용하기 비교적 편한 라이선스다.

## 단점 및 한계

### 가격 예측 모델을 곧바로 Trading Model로 볼 수 없음

예측 정확도가 높더라도 transaction cost, slippage, portfolio construction, position sizing, risk management가 포함되지 않는다. 프로젝트도 제공하는 backtest pipeline이 production-ready quantitative system이 아니라고 명시한다.

### 외생 변수 부족

기본 입력은 K-line 중심이다. 기업 실적, 뉴스, macro, FX, commodity, sector factor 등의 정보가 기본 구조에 포함되지 않는다.

### 개별 자산별 성능 편차

실사용 피드백에서 안정적 종목과 고변동·경기민감 종목 사이에 큰 편차가 보고됐다. Foundation Model이라는 이유만으로 개별 종목에서 안정적인 alpha를 보장하지 않는다.

### Context 제한

small/base의 max context는 512다. 장기 market regime을 단일 context로 표현하는 데 제약이 있을 수 있다.

### Fine-tuning 운영 비용

공식 fine-tuning 예제는 `torchrun` 기반 multi-GPU 학습을 전제로 한 구성이 있으며 데이터 leakage 방지, train/validation/test split, rolling backtest 등의 금융 특화 MLOps가 별도로 필요하다.

### 프로젝트 성숙도

2026-04까지 batch dimension, normalization data leakage, sampling 관련 버그 수정이 merge된 기록이 있다. 활발히 개선된다는 장점과 동시에 production 적용 전 코드 검증이 필요하다는 의미이기도 하다.

## 활용 사례

### 바로 적용 가능

- 로컬 금융 시계열 forecasting 실험
- 기존 ARIMA/LSTM/Transformer/TSFM과 benchmark
- K-line 시나리오 생성
- 연구용 Web UI를 통한 모델 특성 탐색

### PoC 가치 있음

- 국내 주식/ETF/암호화폐 데이터로 fine-tuning
- prediction 결과를 하나의 feature/alpha factor로 사용
- 여러 sample path 기반 변동성·risk score 산출
- 기존 trading pipeline의 ensemble signal 중 하나로 사용

### 아이디어 참고

금융 데이터를 언어처럼 tokenizer → autoregressive model로 처리하는 구조는 다른 고빈도 telemetry나 이벤트 기반 시계열 Foundation Model 설계에도 참고할 수 있다.

### 현재 도입 가치 낮음

Kronos prediction 하나만 사용해 자동 매수/매도하는 시스템. 실전 사용자 사례와 모델 입력 구조를 고려하면 독립적인 trading oracle로 사용하기에는 위험하다.

## 기존 도구와 비교

일반 TSFM과 가장 큰 차이는 금융 전용 tokenizer다. Chronos류 모델이 범용 시계열 forecasting을 목표로 한다면 Kronos는 OHLCV와 금융 downstream task에 집중한다.

전통적인 supervised quant model과 비교하면 대규모 multi-market pre-training을 통해 zero-shot baseline을 제공하는 것이 장점이다. 반대로 특정 시장의 factor와 목적 함수에 맞춘 LightGBM/XGBoost/전용 Transformer가 충분한 데이터와 feature engineering을 가진 경우 실전 alpha 측면에서는 더 적합할 수 있다.

## 활용 아이디어

Kronos의 가장 현실적인 활용법은 `예측기 = 최종 의사결정기`가 아니라 `금융 Agent의 하나의 signal provider`로 두는 것이다.

```text
Market Data ───────────────┐
                          ▼
                    Kronos Forecast
                          │
News / Macro ──► LLM Agent├──► Signal Aggregator
                          │
Technical Factors ────────┤
                          ▼
                  Risk / Position Rules
                          │
                          ▼
                      Backtest
```

Kronos에서 방향성, 예상 가격 path, uncertainty를 만들고 별도의 뉴스/거시경제 Agent와 technical factor model을 조합한 뒤 risk engine에서 최종 의사결정을 하는 방식이 더 적합하다.

특히 자동매매 PoC에서는 Kronos output을 직접 주문으로 연결하지 않고 feature 또는 ensemble vote로 사용하고 walk-forward validation으로 유효성을 검증하는 것을 권장한다.

## 결론

Kronos는 단순한 'AI 주가 예측기'보다 **금융 K-line 전용 Foundation Model을 만들 수 있는가**라는 질문에 대한 흥미로운 구현체다. 금융 전용 tokenizer, 대규모 multi-market pre-training, 작은 공개 모델, fine-tuning 및 Web UI까지 갖추고 있어 연구와 PoC 가치는 높다.

반면 실전 매매에서는 OHLCV만으로 설명하기 어려운 외생 변수와 자산별 성능 편차가 크므로 단독 매매 신호로 사용하는 것은 권장하기 어렵다. 가장 가치 있는 위치는 기존 quant/agent pipeline 안의 forecasting 및 scenario-generation component다.

**평가: PoC 가치 높음 / 단독 자동매매 도입 가치는 낮음.**

## 참고 자료

- GitHub: https://github.com/shiyu-coder/Kronos
- Paper: https://arxiv.org/abs/2508.02739
- Hugging Face paper page: https://huggingface.co/papers/2508.02739
- Web UI: https://github.com/shiyu-coder/Kronos/tree/master/webui
- User test issue: https://github.com/shiyu-coder/Kronos/issues/319
