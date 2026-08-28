---
title: Vibe-Trading
category: tools
tags:
  - ai
  - agent
  - trading
  - finance
  - backtesting
  - mcp
  - multi-agent
source: https://github.com/HKUDS/Vibe-Trading
updated: 2026-08-29
---

# Vibe-Trading

> 자연어 질문을 시장 데이터 수집, 전략 생성, 백테스트, 멀티 에이전트 분석, 리포트 및 선택적 브로커 실행까지 연결하는 오픈소스 개인 트레이딩/금융 리서치 에이전트 플랫폼.

## 프로젝트 개요

HKUDS의 Vibe-Trading은 단순 종목 추천 챗봇이 아니라 **금융 리서치 작업공간 + 실행 가능한 분석 런타임**에 가깝다. 사용자는 자연어로 시장 질문이나 전략 아이디어를 입력하고, 에이전트는 시장 데이터 도구와 백테스트 엔진을 호출해 결과와 재현 가능한 산출물을 만든다.

Python 3.11+, FastAPI 백엔드, React 19 프론트엔드를 사용하며 CLI, Web UI, REST API, MCP 서버 형태로 제공된다. MIT 라이선스다.

조사 기준: 2026-08-29, main 브랜치 및 최근 이슈/커밋 기준.

## 해결하려는 문제

전통적인 퀀트/트레이딩 연구는 데이터 소스 선택, 데이터 정제, 전략 코드 작성, 백테스트, 지표 해석, 보고서 작성이 서로 분리되어 있다. Vibe-Trading은 이 과정을 자연어 기반 에이전트 작업으로 묶어 다음 문제를 줄이려 한다.

- 금융 데이터 API와 라이브러리를 직접 조합해야 하는 비용
- 아이디어를 코드와 백테스트로 변환하는 반복 작업
- 여러 시장/데이터 소스별 구현 차이
- 분석 세션과 근거가 사라지는 문제
- 투자/퀀트/리스크 관점을 각각 수작업으로 검토하는 비용
- 기존 AI 에이전트에서 금융 기능을 다시 구현해야 하는 문제

## 핵심 기능

### 자연어 금융 리서치

시장 질문을 입력하면 데이터 조회, 문서/차트 분석, 전략 초안, 보고서 생성까지 연결한다. 반복 연구는 persistent memory와 editable skill로 재사용할 수 있다.

### 크로스마켓 데이터와 백테스트

A주, 홍콩, 미국, 캐나다, 인도, 한국(KRX), 암호화폐, 선물, FX 등 여러 시장을 지원한다. 데이터 소스 fallback, composite backtest, validation artifact와 run card를 제공한다.

한국 시장이 first-class backtest engine으로 추가되어 KOSPI/KOSDAQ 연구에도 직접 활용 가능하다.

### Multi-Agent Trading Teams

투자, 퀀트, 크립토, 매크로, 리스크 등의 역할을 가진 worker들을 swarm 형태로 실행할 수 있다. 각 worker는 실제 조회한 시장 데이터에 grounding되고 진행 상황과 결과가 저장된다.

### Alpha Zoo / Quant 기능

Qlib 158, Kakushadze Alpha101, GTJA191 및 academic/PIT-safe factor를 포함한 대규모 alpha library를 제공한다. 최근에는 Heston pricing, Hierarchical Risk Parity, copula, VPIN/Roll/Amihud/Kyle 등의 quantlib 기능도 확장되고 있다.

### Shadow Account

실제 broker journal을 읽어 행동 패턴을 진단하고 규칙 기반 가상 계정과 비교한다. 전략 코드와 감사 가능한 리포트를 export할 수 있다.

### MCP / Agent Skill

`vibe-trading-mcp`를 통해 stdio 또는 Streamable HTTP MCP 서버로 실행할 수 있어 Cursor, Windsurf 등 외부 agent/harness가 금융 기능을 도구로 사용할 수 있다. ClawHub/OpenSpace용 skill도 제공한다.

### 선택적 브로커 연동

연구/백테스트가 중심이지만 사용자가 명시적으로 승인한 connector를 통해 실거래 경로도 제공한다. 최근 코드에는 Alpaca, Futu, OKX, IBKR read-only MCP, Binance 관련 기능 및 kill-switch/mandate enforcement 등이 보인다.

## 아키텍처

저장소 구조상 핵심은 다음과 같이 나뉜다.

```text
Natural Language / API / IM / MCP
              |
              v
        Agent Runtime
   +----------+----------+
   |                     |
Memory / Goal        Swarm Workers
   |                     |
   +----------+----------+
              |
          Tool Layer
   +----------+-----------+
   |          |           |
Market Data  Docs      Quant/Factors
   |                      |
Fallback loaders      Alpha Zoo
   |                      |
   +----------+-----------+
              |
        Backtest Engines
              |
   Metrics / Validation / Reports
              |
     Optional Live Governance
              |
      Broker Connectors
```

주요 소스 영역에는 `agent`, `api`, `channels`, `core`, `factors`, `goal`, `governance`, `hypotheses`, `live`, `memory`, `openbb_bridge`, `portfolio` 등이 존재한다. 즉 단일 LangChain agent라기보다 데이터/백테스트/거버넌스가 포함된 금융 특화 agent platform이다.

### 데이터 흐름

1. 사용자가 자연어로 연구 목표를 입력한다.
2. Agent가 필요한 tool과 데이터 소스를 선택한다.
3. Market loader가 시장별 fallback chain을 통해 데이터를 가져온다.
4. 전략이 필요한 경우 코드/규칙을 만들고 backtest engine을 실행한다.
5. metrics, benchmark, validation artifact, report를 생성한다.
6. 반복 작업은 memory/skill/session에 저장한다.
7. Swarm 모드에서는 역할별 worker가 병렬/분담 분석한다.
8. 실거래 connector를 사용하면 governance/mandate/kill-switch 계층을 통과한 뒤 broker로 전달한다.

## 장점

### 1. AI Trading의 범위가 넓다

단순 LLM 종목추천이 아니라 데이터 조회 → 전략 → 백테스트 → 검증 → 리포트 → MCP → 선택적 실행까지 하나의 플랫폼에 포함한다.

### 2. 기존 Agent에 붙이기 좋다

MCP와 skill 형태가 있어 전체 UI를 쓰지 않고도 기존 Claude/Codex/자체 harness에 금융 research capability만 추가할 수 있다.

### 3. 한국 시장 지원

KRX 백테스트 엔진과 `pykrx` 선택적 loader가 있어 국내 주식 연구 PoC에도 의미가 있다.

### 4. 활발한 개발

2026-08-28까지도 backtest correctness, quantlib, live trading safety 관련 수정이 연속적으로 반영되고 있다. 프로젝트가 빠르게 진화 중이다.

### 5. 재현성과 감사 가능성을 의식한다

run/session persistence, validation artifact, provenance, report, mandate/kill-switch 등 단순 대화형 AI보다 금융 시스템에서 중요한 추적 가능성을 설계에 포함한다.

## 단점 및 한계

### 금융 정확성은 아직 빠르게 보강 중

최근 프로젝트 자체의 financial correctness roadmap과 수정 내역을 보면 실거래 gate, 데이터 adjustment, composite engine, options margin, shadow account 등에서 실제 결과를 왜곡할 수 있는 문제가 계속 발견되고 있다.

2026-08-28에도 cross-market backtest의 annualization 오류와 warm-up 기간이 평가기간에 섞이는 문제가 수정됐다. 따라서 현재 결과를 검증 없이 투자 판단에 사용하는 것은 위험하다.

### 실거래 기능은 특히 보수적으로 접근해야 한다

프로젝트 README도 broker trading capability가 experimental이며 실제 broker account에 대해 검증되지 않았다고 명시한다. 최근에는 kill-switch 재시작 중복 실행, broker error envelope 처리, exposure 계산 등의 안전성 문제가 수정되고 있다.

**권장: 연구/백테스트 용도로 먼저 사용하고 실거래는 별도 검증 전까지 비활성화.**

### 생성된 전략 코드 실행 위험

생성된 Python 전략을 로컬 subprocess로 실행한다. 프로젝트는 환경변수 전달을 제한하지만 subprocess 자체는 market data fetch를 위해 network-capable이다. 민감한 파일이나 내부 네트워크가 있는 개발 PC에서는 sandbox/container 격리가 바람직하다.

### 운영 복잡도

기능 범위가 넓어 데이터 provider, LLM provider, broker connector, MCP, Web UI, memory, swarm까지 모두 사용하면 운영 복잡도가 커진다. 단순한 주가 질의 용도에는 과한 플랫폼일 수 있다.

### Token/LLM 비용

Swarm과 반복 리서치는 worker 수와 도구 호출 수만큼 LLM 사용량이 증가한다. 최근 streaming usage가 실제보다 크게 누락되던 버그도 수정되었으므로 비용 관측을 별도로 두는 것이 좋다.

## 활용 사례

- 자연어로 투자 가설을 만들고 즉시 백테스트
- KOSPI/KOSDAQ 전략 PoC
- 여러 LLM agent가 투자/퀀트/리스크 관점으로 동일 전략 검토
- 매일 정해진 조건으로 시장 리서치 자동 실행
- PDF/공시/차트와 시장 데이터를 함께 분석
- 기존 Claude/Codex Agent에 MCP 기반 금융 도구 제공
- 실제 매매 journal을 Shadow Account와 비교해 행동 편향 분석
- Alpha Zoo를 이용한 factor screening 및 연구

## 기존 도구와 비교

| 도구 | 중심 영역 | Vibe-Trading과 차이 |
|---|---|---|
| OpenBB | 금융 데이터/분석 플랫폼 | Vibe-Trading은 Agent/Swarm/자연어 workflow와 백테스트 실행을 더 전면에 둔다. OpenBB bridge도 제공한다. |
| Qlib | ML/Quant research | Qlib은 전문 퀀트 연구 프레임워크이며 Vibe-Trading은 Qlib factor 정의를 포함하면서 자연어 agent UX와 다양한 시장/도구를 통합한다. |
| Backtrader/VectorBT 계열 | 전략 백테스트 | 더 작고 전문적인 backtest 라이브러리. Vibe-Trading은 agent orchestration, data fallback, reports, memory, MCP까지 포함한다. |
| 일반 LLM Trading Bot | 추천/자동주문 | Vibe-Trading은 research artifact, backtest, governance, multi-agent를 훨씬 강하게 강조한다. |

## 활용 아이디어

### 바로 적용 가능 — 금융 Research MCP

실거래 connector는 끄고 `vibe-trading-mcp`만 띄워 기존 Agent에서 다음 toolchain으로 사용하는 방식이 가장 안전하고 실용적이다.

```text
Orchestrator
  -> Vibe-Trading MCP: 시장 데이터 / 백테스트 / factor
  -> Web/Search Agent: 뉴스/정성 정보
  -> Reviewer Agent: 결과 검증
  -> Report Agent: 최종 보고서
```

### PoC 가치 높음 — 자동 트레이딩 분석 파이프라인의 Research Engine

직접 주문을 맡기기보다 후보 전략 생성과 검증 계층으로 배치한다.

```text
Market Data
    ↓
Vibe-Trading
Research + Backtest
    ↓
Independent Validator
    ↓
Decision Engine
    ↓
Paper Trading
    ↓
Human Approval
```

이 구조는 Vibe-Trading의 넓은 연구 기능을 활용하면서 프로젝트 자체 live trading correctness에 대한 의존도를 낮춘다.

### PoC 가치 있음 — 한국 주식 전략 연구

KRX engine이 존재하므로 국내 주식 데이터 수집 → 전략 가설 → backtest → report 자동화를 빠르게 시험하기 좋다. 다만 거래세, 가격제한폭, corporate action, 데이터 fallback의 정확성을 독립적으로 검증해야 한다.

### 아이디어 참고 — Multi-Agent Investment Committee

Swarm의 investment/quant/risk 역할 구조를 참고해 다른 업무형 Agent Harness에서도 `Analyst → Quant Validator → Risk Reviewer → Final Decision` 패턴을 재사용할 수 있다.

### 현재 도입 가치 낮음 — 무인 실계좌 자동매매

프로젝트가 live safety와 financial correctness를 적극 개선 중이라는 점은 긍정적이지만, 역으로 현재도 money path의 edge case가 계속 발견되고 있다는 뜻이다. 충분한 paper trading, broker별 integration test, 독립적인 risk gate 없이 완전 자율 실거래를 맡기는 것은 권장하지 않는다.

## 결론

Vibe-Trading의 핵심 가치는 **AI가 금융 질문에 답하는 것**보다 **AI가 실제 금융 연구 파이프라인을 실행할 수 있게 만드는 것**이다. 특히 MCP, multi-agent, cross-market backtest, persistent research artifact를 한 프로젝트에서 제공하는 점이 강하다.

현재 가장 가치 있는 도입 방식은 **실거래 봇이 아니라 금융 Research/Backtest Engine**이다. MCP로 기존 AI harness에 연결하고 결과를 별도 validator가 검증하도록 구성하면 활용도가 높다.

프로젝트 성숙도는 빠르게 올라가고 있지만 금융 정확성 관련 수정이 매우 활발하므로, 버전 고정과 회귀 테스트 없이 결과를 신뢰해서는 안 된다.

**실무 평가: PoC 가치 높음. 연구/백테스트 계층은 적극 검토, 무인 실거래 계층은 아직 보수적으로 접근.**

## 참고 자료

- GitHub: https://github.com/HKUDS/Vibe-Trading
- 공식 Wiki: https://vibetrading.wiki/
- Security: https://github.com/HKUDS/Vibe-Trading/security
- Financial correctness roadmap: https://github.com/HKUDS/Vibe-Trading/issues/1207
- License: MIT
