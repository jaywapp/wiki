# persona-lightsim

> Tags: `AX` `Claude Code` `Persona` `Market Research` `Simulation` `Nemotron-Personas` `Synthetic Population` `AI Agent`

## 한줄 요약

**persona-lightsim**은 NVIDIA Nemotron-Personas 기반의 10개국 합성 인구를 Claude Code의 Skill/Agent 워크플로우에 연결해, 제품 시장조사·지불의사·반응 시뮬레이션·페르소나 카드 생성을 로컬에서 가볍게 수행하는 하네스다.

## 프로젝트 개요

persona-lightsim은 별도 웹앱이나 상시 시뮬레이션 서버 없이 Claude Code 자체를 실행 환경으로 활용한다. 약 63MB의 lite 데이터셋에 국가별 10,000명씩, 총 10개국의 합성 페르소나를 담고 있으며 제품/서비스 브리프를 입력하면 표본 추출부터 국가별 분석, 종합, 반응 판정, 2차 사회효과 근사, 세그먼트 카드 생성까지 이어진다.

지원 국가는 벨기에, 브라질, 엘살바도르, 프랑스, 인도, 일본, 한국, 싱가포르, 미국, 베트남이다. lite pack은 NVIDIA Nemotron-Personas 원본에서 seed 42로 국가당 10,000명을 추출하고, 실제 하네스가 사용하는 15개 컬럼과 축약된 서사 필드만 유지한다.

## 해결하려는 문제

일반적인 LLM 기반 페르소나 조사는 모델에게 임의의 고객상을 만들어 달라고 한 뒤 몇 명의 가상 사용자에게 질문하는 수준에 머무르기 쉽다. 이 경우 표본 구성이 불명확하고, 국가별 비교나 반복 가능한 분석이 어렵고, 많은 개별 에이전트를 대화형으로 돌리면 토큰·시간 비용도 커진다.

persona-lightsim은 다음 방식으로 이를 완화한다.

- 대규모 합성 인구 데이터에서 실제 레코드를 표본으로 사용
- 국가별 분석 방법론과 오케스트레이션을 Claude Code Skill로 고정
- 여러 사람을 개별 대화시키지 않고 batch judgment 방식으로 묶어서 평가
- 1차 결과의 집단 의견을 다시 주입하는 mean-field 2-pass로 제한적인 사회효과 근사
- 최종 결과를 재사용 가능한 persona card와 SQLite pack으로 증류

## 핵심 기능

### 1. persona-research

제품을 합성 인구에 매핑해 시장조사를 수행하는 오케스트레이터다.

`brief audit → sampling → per-country analyst fan-out → synthesis → QA`

주요 분석 대상은 유즈케이스, 지불 의사(WTP), 세그먼트 정량화, 국가별 차이 등이다.

### 2. persona-country-analysis

국가 단위 분석 방법론을 담당한다. 실카운트 스크리닝, 샘플 정독, 정해진 섹션 구조의 리포트 작성으로 국가별 분석 형식을 통일한다.

### 3. persona-lightsim

대화형 멀티에이전트 시뮬레이션 대신 batch judgment를 사용한다.

`persona sample → batch judgment → deterministic aggregation → opinion re-injection → second pass → segment cards → local SQLite pack`

README 기준 한 번의 batch-judge 호출에서 25개 persona를 판정할 수 있다.

### 4. 역할별 Agent

`.claude/agents/persona-*` 아래에 다음 역할이 분리돼 있다.

- brief-auditor
- country-analyst
- synthesis-critic
- batch-judge
- distiller

### 5. 경량 데이터셋

`scripts/setup_data.py`가 Hugging Face의 `dominicDK94/nemotron-personas-lite`를 받아 로컬 환경과 pyarrow용 venv를 구성한다. 원본 약 24GB 대비 lite pack은 약 63MB다. 필요하면 `NEMOTRON_PERSONAS_BASE` 환경변수로 NVIDIA 원본 데이터를 사용할 수 있다.

### 6. 다국어 Skill 문서

`scripts/set_language.py ko`로 Claude Skill/Agent 문서를 한국어로 전환할 수 있으며 영어·한국어·일본어·중국어 locale을 제공한다.

## 아키텍처

```text
Product / Service Brief
        │
        ▼
  brief-auditor
        │
        ├──────── persona-research ────────┐
        │                                  │
        ▼                                  ▼
Nemotron-Personas Lite              Country Analysts
10 countries × 10K                  parallel fan-out
        │                                  │
        └──────────────┬───────────────────┘
                       ▼
                 Synthesis + QA
                       │
             ┌─────────┴─────────┐
             │                   │
       Research Report     persona-lightsim
                                 │
                         Batch Judgment
                           25 personas/call
                                 │
                      Deterministic Aggregate
                                 │
                      Mean-field Re-injection
                                 │
                            Second Pass
                                 │
                     Distiller / Segment Cards
                                 │
                         Local SQLite Pack
```

핵심 설계 포인트는 **Claude Code를 오케스트레이터이자 실행 UI로 사용하고, Python은 데이터 샘플링/가공을 담당하는 구조**라는 점이다. 별도의 프론트엔드와 백엔드 서비스를 유지할 필요가 없다.

## 장점

- **설치와 운영이 가볍다.** 별도 웹 서비스나 시뮬레이션 서버 없이 repo + Claude Code + Python 환경으로 동작한다.
- **합성 인구 기반이다.** LLM이 즉석에서 만든 몇 명의 임의 페르소나보다 표본 구성과 반복성이 명확하다.
- **비용 효율적인 시뮬레이션 구조다.** 개별 persona와 장시간 대화하지 않고 batch judgment를 사용한다.
- **Skill/Agent 구조가 명확하다.** 조사, 국가 분석, 비판, 판정, 증류 역할이 분리돼 확장하기 좋다.
- **국가 간 비교가 쉽다.** 동일한 분석 파이프라인을 여러 국가에 병렬 적용한다.
- **결과 재사용성이 있다.** 일회성 보고서뿐 아니라 persona card와 SQLite pack을 생성한다.
- **원본/경량 데이터 전환이 가능하다.** 빠른 탐색은 63MB lite, 정밀 분석은 full dataset을 선택할 수 있다.

## 단점

- **실제 소비자 행동 데이터가 아니다.** 합성 인구이므로 구매 전환율이나 매출 예측의 실측 대체재로 보면 안 된다.
- **결과는 LLM 판단에 의존한다.** 동일 persona라도 모델·프롬프트·temperature 등의 변화로 판단이 달라질 수 있다.
- **mean-field 모델의 한계가 명확하다.** 동조/의견 경화 같은 1차 효과는 근사하지만 네트워크 구조, 에코챔버, 정보 확산 경로 등은 모델링하지 않는다.
- **현재 국가 범위가 10개국으로 제한된다.** 특정 시장이나 세부 지역 연구에는 데이터 보강이 필요하다.
- **lite 데이터는 서사 정보가 잘려 있다.** 긴 필드가 300~400자로 축약되어 정교한 질적 분석에서는 full dataset보다 정보 손실이 있다.
- **검증 지표는 프로젝트 자체 파이프라인의 일관성 검증에 가깝다.** README의 schema-valid 99/99, 2차 의견 변화 24.2%, evidence quote 39/39는 실제 시장 예측 정확도를 의미하지 않는다.
- **기본 Agent 모델이 Opus다.** 규모를 크게 돌리면 Claude 사용량/비용이 커질 수 있어 모델 라우팅 최적화가 필요하다.

## 기존 도구와 비교

| 접근 | persona-lightsim | 일반 LLM 페르소나 | 설문조사 | Agent-Based Simulation |
|---|---|---|---|---|
| 모집 비용 | 낮음 | 매우 낮음 | 높음 | 데이터/모델에 따라 다름 |
| 표본 기반 | Nemotron 합성 인구 | 대개 즉석 생성 | 실제 응답자 | 설계한 agent population |
| 반복성 | 비교적 높음 | 낮음~중간 | 높음 | 높음 |
| 국가 비교 | 내장 | 직접 설계 필요 | 조사 설계 필요 | 직접 모델링 필요 |
| 사회효과 | mean-field 2-pass | 거의 없음 | 제한적 | 정교하게 구현 가능 |
| 실행 복잡도 | 낮음 | 매우 낮음 | 높음 | 높음 |
| 실제 시장 검증력 | 가설 생성용 | 가설 생성용 | 높음 | 모델 품질에 좌우 |
| Claude Code 통합 | 핵심 구조 | 프롬프트 수준 | 없음 | 별도 통합 필요 |

따라서 이 프로젝트의 포지션은 **실제 설문조사를 대체하는 예측 시스템이라기보다, 제품 아이디어를 실제 사용자 조사 전에 빠르게 압축·선별하는 synthetic pre-research layer**에 가깝다.

## 활용 사례

- 신규 서비스 기획 단계에서 타깃 고객군과 예상 유즈케이스 탐색
- 한국/일본/미국 등 국가별 제품 반응 차이 비교
- 가격 정책 초안에 대한 지불 의사 가설 생성
- UX 기능 후보에 대한 persona별 선호/거부 요인 탐색
- 여러 제품 아이디어를 실제 사용자 인터뷰 전에 빠르게 스크리닝
- 사내 도구 신규 기능의 직군/숙련도별 예상 반응 탐색
- AI Agent/개발도구의 사용자 세그먼트 정의 및 persona card 생성

## 활용 아이디어

### 1. AX 도구의 `Synthetic User Review` 단계

새로운 사내 도구나 AI 기능을 만들 때 개발 완료 후 바로 배포하지 않고 다음 단계를 자동화할 수 있다.

`PRD → persona-lightsim → 반응/거부요인 → UX 개선 → 실제 파일럿`

실사용자에게 보여주기 전에 기능 가치, 진입장벽, 예상 질문을 빠르게 찾아내는 사전 검증 단계로 유용하다.

### 2. UX/UI 점검 파이프라인과 결합

화면 캡처나 UX 설명을 persona segment별로 평가시켜 다음과 같은 결과를 만들 수 있다.

- 초보 사용자
- 파워유저
- 관리자
- 개발자
- 비개발 직군

각 segment의 `이해도 / 사용 의향 / 불편 요소 / 기능 가치`를 batch judgment로 산출하면 기존 정적 UX 체크리스트보다 사용자 관점이 강화된다.

### 3. 제품 요구사항의 Persona Regression Test

기능 변경 전후 동일 seed의 persona population을 돌려 반응 변화를 비교하는 방식이다.

`Feature v1 → fixed persona sample → score`

`Feature v2 → same sample → score`

이를 CI 리포트처럼 누적하면 제품 요구사항 변경이 특정 사용자군을 악화시키는지 추적하는 실험 도구가 될 수 있다.

### 4. 모델 라우팅 최적화

기본 Opus 고정 대신 역할별로 모델을 분리할 수 있다.

- brief-auditor / synthesis-critic: 고성능 모델
- batch-judge: 저비용·고속 모델
- deterministic aggregation: 코드
- distiller: 중간급 모델

이렇게 하면 대규모 persona 실험의 토큰 비용을 크게 줄일 가능성이 있다.

### 5. 실제 사용자 데이터와 결합

가장 가치 있는 확장은 synthetic-only 구조에서 끝내지 않고 실제 설문/로그와 비교하는 것이다.

`Synthetic hypothesis → real telemetry/survey → calibration → next simulation`

실제 결과와 synthetic 결과의 편향을 지속적으로 측정하면 조직 특화 persona simulator로 발전시킬 수 있다.

## 참고 링크

- Project: https://github.com/Dongkyu-ES/persona-lightsim
- Korean README: https://github.com/Dongkyu-ES/persona-lightsim/blob/main/README.ko.md
- Nemotron-Personas Lite: https://huggingface.co/datasets/dominicDK94/nemotron-personas-lite
- NVIDIA Nemotron-Personas: https://huggingface.co/nvidia/Nemotron-Personas-USA

## 결론

persona-lightsim의 핵심 가치는 'AI에게 가상의 고객 몇 명을 만들어 물어본다'를 넘어서 **합성 인구 데이터 + 반복 가능한 샘플링 + 역할 분리 Agent + batch judgment + 사회효과 근사 + 결과 증류**를 하나의 Claude Code 워크플로우로 만든 데 있다.

시장 예측기로 받아들이기보다는 **실제 사용자 조사 전에 가설 공간을 빠르게 좁히는 AX용 Synthetic Research Harness**로 사용하는 것이 가장 적합하다.