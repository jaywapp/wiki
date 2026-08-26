# Toss Open API 기반 자동 트레이딩 봇 사례 조사

> 조사일: 2026-08-26 (KST)
> 목적: 토스증권 Open API를 활용한 개인용 자동 트레이딩 봇 아이디어 및 구현 가능성 검토

## 1. 한 줄 요약

토스증권은 2026년 공식 Open API를 공개하면서 국내·미국 주식의 시세 조회, 계좌 조회, 주문 생성·정정·취소, 조건주문까지 공식 지원하기 시작했다. 공개 직후 GitHub에는 실제 자동매매 봇, 제한적 자동거래 대시보드, MCP 기반 AI 에이전트 연동 프로젝트가 빠르게 등장했고, 공통적으로 `dry-run 기본`, `실주문 이중 잠금`, `허용 IP 고정`, `rate limit 대응`, `주문 상태/체결 재동기화`, `AI와 주문 실행 계층 분리`를 핵심 안전장치로 채택하고 있다.

## 2. 조사 배경

기존 국내 개인 자동매매 환경은 한국투자증권, 키움증권 등 증권사별 API에 크게 의존했다. 토스증권은 비교적 늦게 공식 Open API를 공개했지만 다음 특징 때문에 개인 자동매매 및 AI Agent 연동 관점에서 주목할 가치가 있다.

- 국내주식과 미국주식을 하나의 API 체계로 제공
- OAuth 2.0 Client Credentials 기반 인증
- REST 중심의 비교적 단순한 API 구조
- 주문 생성·정정·취소뿐 아니라 조건주문(SINGLE/OCO/OTO) 공식 지원
- OpenAPI 3.1 명세 공개
- AI 에이전트용 `llms.txt` 제공
- 허용 IP 기반 접근 통제
- API별 rate limit 정보를 응답 헤더로 제공

공식 홈페이지는 반복 매매 자동화와 새벽 미국장 자동 실행을 명시적인 활용 예로 소개하고 있어, 자동 트레이딩 자체가 비공식 우회 사용 사례가 아니라 공식 Open API의 대표 목적 중 하나로 볼 수 있다.

## 3. 공식 API 지원 범위

### 3.1 인증

토스증권 Open API는 OAuth 2.0 Client Credentials Grant 방식으로 access token을 발급한다.

기본 흐름:

1. 토스증권 WTS → 설정 → Open API에서 `client_id`, `client_secret` 발급
2. API 호출 서버의 공인 IP를 허용 IP에 등록
3. `POST /oauth2/token`으로 access token 발급
4. 모든 API에 `Authorization: Bearer {token}` 전달
5. 계좌·자산·주문 관련 요청은 `X-Tossinvest-Account` 헤더 추가

허용 IP에 등록되지 않은 위치에서 요청하면 403으로 차단되기 때문에, 자동매매 봇은 일반적으로 고정 공인 IP를 가진 서버/VM에서 운영하는 편이 안전하다.

### 3.2 시세 및 시장 데이터

공식 문서 기준 주요 기능:

- 현재가
- 호가
- 최근 체결
- 상·하한가
- 1분봉 / 일봉 캔들
- 종목 기본정보
- 투자경고·위험 등 매수 유의사항
- 환율
- 국내/미국 장 운영 캘린더
- 거래량·거래대금·등락률 랭킹
- 국내 투자자별 매매동향, 프로그램매매, 공매도, 신용/대차 데이터

현재가 API는 한 번에 최대 200개 종목을 조회할 수 있어 단순 종목 스캐너를 만들 때 호출량을 크게 줄일 수 있다.

### 3.3 주문

공식 지원 범위:

- 주문 생성
- 주문 정정
- 주문 취소
- 대기/종료 주문 목록 조회
- 주문 상세 조회
- 매수 가능 금액
- 판매 가능 수량
- 수수료 조회

국내/미국 주식 모두 통합된 주문 API를 사용한다.

### 3.4 조건주문

토스증권 API의 중요한 차별점 중 하나다.

지원 유형:

- `SINGLE`: 단일 조건 주문
- `OCO`: 한쪽 조건이 실행되면 다른 주문 취소
- `OTO`: 첫 주문 체결 후 후속 주문 실행

즉, 단순 지정가 주문만 제공하는 API보다 손절·익절·연속 주문 로직을 서버 바깥에서 직접 계속 감시하지 않고도 일부 구현할 수 있다.

### 3.5 Rate Limit

공식 문서는 API 그룹별 TPS 제한을 제공한다.

대표 값:

| 그룹 | 기본 한도 |
|---|---:|
| AUTH | 5 TPS |
| ACCOUNT | 1 TPS |
| ASSET | 5 TPS |
| MARKET_DATA | 15 TPS |
| MARKET_DATA_CHART | 20 TPS |
| ORDER | 10 TPS |
| ORDER_HISTORY | 5 TPS |
| ORDER_INFO | 6 TPS |
| CONDITIONAL_ORDER | 5 TPS |

한도는 운영 상황에 따라 변경될 수 있으며, 클라이언트는 다음 헤더를 기반으로 동적으로 대응하는 것이 권장된다.

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After`

429 발생 시 단순 재호출보다 `Retry-After + exponential backoff + jitter`를 적용해야 한다.

## 4. 공개 구현 사례

## 사례 A. Joyanggi/toss_invest_trading_bot

GitHub: https://github.com/Joyanggi/toss_invest_trading_bot

### 성격

현재 공개 사례 중 가장 완성도가 높은 편에 속하는 개인용 미국주식 자동투자 대시보드다. 단순 주문 봇보다 운영 가능한 자동매매 시스템에 초점을 맞춘다.

### 주요 구조

- Node.js 기반
- 15초 Trader Loop
- Toss Open API 연동
- 상태 저장 및 주기적 백업
- 별도 전략 엔진
- 리스크/뉴스/거시/실적 가드
- 반응형 웹 대시보드

구조 개념:

`Dashboard → HTTP API → State Store`

`Trader Loop → Strategy → Risk Guards → Toss Open API`

### 핵심 구현 포인트

#### 1. 실주문 이중 잠금

실제 주문은 다음 두 조건이 모두 만족되어야 실행된다.

- 환경변수 `LIVE_TRADING=true`
- 웹 UI의 “실제 주문 허용” ON

코드 배포 또는 UI 조작 하나만으로 실거래가 활성화되지 않도록 분리한 구조다.

#### 2. 봇 전용 장부

실계좌 전체 보유량을 곧바로 봇 포지션으로 간주하지 않고:

- 수동 보유
- 봇 보유

를 분리한다.

자동매매 봇에서는 동일 계좌를 사람이 직접 거래할 가능성이 있기 때문에 중요한 설계다.

#### 3. 체결 및 부분체결 동기화

주문 전송 성공을 거래 완료로 간주하지 않고, 주문/체결 상태를 주기적으로 재조회하여 장부와 맞춘다.

#### 4. 위험관리

- 종목별 한도
- 총 위험 노출
- 당일 손실 한도
- 급락 감지
- 손절
- 부분 익절
- trailing stop

등을 전략 판단과 별도 계층으로 둔다.

#### 5. 시세 API와 백테스트 데이터 분리

백테스트는 외부 일봉 데이터를 활용해 Toss API의 호출 한도와 실거래 API 부하를 분리한다.

### 참고 가치

자동매매 시스템을 실제 운영한다면 전략보다 다음 요소가 더 중요하다는 점을 잘 보여준다.

- 주문 idempotency
- 상태 복구
- 체결 동기화
- 운영 로그
- 수동 거래와 자동 거래의 구분
- 실거래 enable/disable 안전장치

---

## 사례 B. chanjoongx/toss-invest-bot

GitHub: https://github.com/chanjoongx/toss-invest-bot

### 성격

토스증권 Open API를 기반으로 국내 + 미국 정규장을 다루는 Python asyncio 자동매매 봇이다.

### 특징

- Python
- asyncio 기반 비동기 실행
- 1분봉 기반 전략
- REST polling
- long-only
- `DRY_RUN` 기본

### 구현 포인트

공식 OpenAPI 3.1 명세를 기준으로 실제 endpoint와 schema를 반영했다.

사용 API 예:

- `/prices`
- `/holdings`
- `/buying-power`
- `/sellable-quantity`
- `/accounts`
- `/candles`
- `/orders`

### 참고 가치

초기 PoC를 빠르게 만들기 좋은 형태다.

특히 다음 구조가 실용적이다.

`Market Poller → Strategy → Risk Check → Order Executor`

이후 주문 상태를 다시 조회해 Portfolio State와 동기화한다.

---

## 사례 C. nalbam/toss-invest

GitHub: https://github.com/nalbam/toss-invest

### 성격

개인 투자 대시보드에 수동 주문과 제한적 자동거래를 결합한 프로젝트다.

### 주요 특징

- 계좌/포트폴리오 대시보드
- 현재가, 호가, 체결, 캔들
- 주문 생성·정정·취소
- 기본 `dry-run`
- 주문 단위 사용자 confirm
- 제한적 자동거래

특히 자동거래를 처음부터 BUY/SELL 전체에 적용하지 않고 `SELL-only` 전략과 gated executor로 제한한 점이 인상적이다.

### 참고 가치

자동매매 초기 버전에서 다음 단계적 접근이 가능하다는 사례다.

1. Read-only 대시보드
2. Dry-run 주문
3. 수동 confirm 주문
4. 매도 자동화
5. 제한된 전략 자동화
6. 완전 자동화

실계좌 리스크를 줄이며 신뢰성을 확인하기 좋은 단계다.

---

## 사례 D. kcw2034/toss-invest-mcp

GitHub: https://github.com/kcw2034/toss-invest-mcp

### 성격

토스증권 Open API를 MCP 도구로 제공하여 Claude/Codex/LLM Agent가 계좌·시세·주문 기능을 호출할 수 있게 만든 프로젝트다.

### 기술

- Python
- FastMCP
- httpx
- pydantic

### 노출 도구

- 시세
- 주문장
- 체결
- 캔들
- 계좌
- 보유자산
- 매수 가능 금액
- 판매 가능 수량
- 주문 조회
- 주문 생성/정정/취소

### 핵심 포인트

MCP 계층에서 주문 guardrail을 강제한다.

즉, AI 모델이 직접 REST API를 호출하는 것이 아니라:

`LLM → MCP Tool → Guardrail → Toss API`

구조를 사용한다.

### 참고 가치

AI 기반 투자 Agent를 만들 때 매우 중요한 패턴이다.

LLM은 다음 역할만 담당하게 하고:

- 시장 해석
- 전략 판단
- 주문 의도 생성

실제 주문 여부/수량/한도 검증은 deterministic code가 담당해야 한다.

---

## 사례 E. Kuco-dev/tossinvest-api-mcp

GitHub: https://github.com/Kuco-dev/tossinvest-api-mcp

### 성격

공식 OpenAPI 명세를 읽어 MCP tool을 자동 생성하는 프로젝트다.

### 특징

- OpenAPI endpoint 자동 도구 생성
- Node.js 기반
- stdio MCP
- 주문 API 포함
- 주문 기본 비활성 + dry-run
- 조건주문 지원
- mutation 자동 재시도 금지 정책
- Rate limit 처리

### 매우 중요한 구현 포인트: mutation 재시도 금지

GET 조회는 실패 후 재시도해도 일반적으로 큰 문제가 없지만, 주문 POST 요청은 네트워크 타임아웃 시 실제 서버에 주문이 도착했는지 알 수 없는 상태가 발생할 수 있다.

따라서 다음과 같이 분리해야 한다.

- 조회 API → 자동 retry 가능
- 주문/정정/취소 → 무조건 자동 retry 금지 또는 주문 상태 확인 후 판단

이는 실제 자동매매 시스템 설계에서 반드시 반영해야 하는 규칙이다.

---

## 사례 F. dev-wooyeon/toss-invest-mcp-server

GitHub: https://github.com/dev-wooyeon/toss-invest-mcp-server

### 성격

토스증권 Open API를 ChatGPT, Codex, Claude Desktop 등과 연결하는 로컬 MCP 서버다.

### 안전 설계

- 기본 `READ_ONLY`
- API Key는 로컬 환경변수로만 관리
- LIVE_TRADING은 별도 활성화
- 주문 한도 및 allow/block list 적용 권장

### 참고 가치

AI Agent에서 “계좌 조회”와 “실주문 권한”을 같은 수준으로 제공하면 안 된다는 점을 보여준다.

권장 Permission Level 예:

- Level 0: 시장 데이터 조회
- Level 1: 내 계좌 조회
- Level 2: 주문 계획 생성
- Level 3: Dry-run 주문
- Level 4: 제한된 실주문

---

## 사례 G. jea0716/TossInvestKit

GitHub: https://github.com/jea0716/TossInvestKit

### 성격

Swift에서 토스 Open API를 쉽게 사용할 수 있도록 하는 SDK 형태 프로젝트다.

2026-07-16 기준 OpenAPI v1.2.4의 endpoint coverage를 문서화했다.

흥미로운 점은 초기 구현에서 주문 API를 의도적으로 뒤로 미루고:

1. 인증
2. 계좌
3. 시세
4. 시장정보
5. Rate limiting
6. 안정화
7. 주문

순으로 구현한다는 점이다.

이는 직접 SDK/Client Layer를 만든다면 합리적인 개발 순서다.

## 5. 공통 아키텍처 패턴

공개 사례를 종합하면 안정적인 자동매매 봇은 대체로 다음 구조로 수렴한다.

### 5.1 권장 구조

`Scheduler / Market Clock`

↓

`Market Data Collector`

↓

`Strategy Engine`

↓

`Risk Engine`

↓

`Order Planner`

↓

`Execution Guard`

↓

`Toss API Client`

↓

`Order / Fill Reconciliation`

↓

`Position Ledger`

↓

`Monitoring / Alert`

### 5.2 Strategy와 Execution 분리

전략 모듈은 “무엇을 사고팔 것인가”만 판단한다.

예:

- BUY AAPL 5%
- SELL TSLA 30%

실제 주문 생성은 Execution 계층이 다음을 검증한 뒤 수행한다.

- 시장 운영 여부
- 주문 가능 금액
- 판매 가능 수량
- 종목 허용 목록
- 일일 손실 한도
- 단일 주문 금액 한도
- 전체 투자 비중
- 중복 주문 여부
- 기존 미체결 주문 여부

### 5.3 Reconciliation 필수

내부 상태만 신뢰하면 안 된다.

주기적으로 Toss API의 실제 계좌/주문 상태와 비교해:

- Pending
- Partial Fill
- Filled
- Cancelled
- Rejected

상태를 다시 맞춰야 한다.

### 5.4 단일 실행 인스턴스

동일 계좌를 여러 봇 인스턴스가 동시에 제어하면 중복 주문 위험이 발생한다.

권장:

- Leader election
- distributed lock
- 또는 초기 버전에서는 단일 서버 인스턴스 강제

## 6. AI Agent와 결합할 때의 권장 구조

LLM이 직접 주문 API를 호출하게 만드는 것은 피하는 것이 좋다.

권장 구조:

`LLM Research Agent`

↓

`Structured Trade Intent`

예:

- symbol
- side
- rationale
- confidence
- target allocation
- stop condition

↓

`Deterministic Validator`

↓

`Risk Engine`

↓

`Order Executor`

↓

`Toss Open API`

즉, AI는 “판단”하고 코드가 “권한과 리스크”를 통제한다.

## 7. 보안 및 운영 제약

### 7.1 Client Secret

- 채팅에 입력하지 않음
- Git에 commit하지 않음
- `.env`, secret manager, OS credential storage 사용

### 7.2 허용 IP

토스 Open API는 등록된 허용 IP 외 요청을 차단한다.

따라서 다음 운영 방식이 적합하다.

- 고정 공인 IP가 있는 VM
- NAT Gateway 고정 IP
- 홈서버 + 고정 IP 환경

동적 IP 가정망은 운영 편의성이 떨어질 수 있다.

### 7.3 실주문 기능

최소 2중 안전장치 권장:

- server env `LIVE_TRADING`
- DB/UI runtime switch

추가 권장:

- 종목 allow-list
- 일일 최대 매수 금액
- 주문당 최대 금액
- 최대 포지션 수
- 일일 손실 circuit breaker
- kill switch

### 7.4 로그

반드시 기록할 항목:

- 전략 판단 시점
- 입력 시장 데이터
- 판단 결과
- 주문 계획
- Risk Check 결과
- API request id
- 주문 ID
- 체결 결과
- 잔고 변화

수익률보다 먼저 “왜 주문이 발생했는지 설명할 수 있는가”가 운영 안정성 측면에서 중요하다.

## 8. 토스 API의 장점

### 장점 1. 국내/미국 통합

시장별로 완전히 다른 API client를 유지할 필요가 적다.

### 장점 2. 표준 API 설계

OAuth2 + REST + OpenAPI 3.1 기반이라 일반 백엔드 개발자가 접근하기 쉽다.

### 장점 3. 조건주문

OCO/OTO를 활용하면 손절·익절 등의 일부 로직을 증권사 서버에 위임할 수 있다.

### 장점 4. Agent 친화성

공식 `llms.txt`와 OpenAPI schema가 있어 MCP/Agent tool generation이 쉽다.

### 장점 5. API Rate Limit 가시성

응답 헤더로 현재 limit을 확인할 수 있어 adaptive throttling 구현이 가능하다.

## 9. 한계 및 주의사항

### 9.1 WebSocket 상태

공식 홈페이지 소개 문구에는 REST와 WebSocket을 언급하지만, 현재 개발자 문서의 Market Data 페이지에는 “웹 소켓은 추후 지원 예정”이라고 적혀 있고 전체 가이드에도 현재 REST API 중심으로 기술되어 있다.

따라서 실제 구현에서는 현재 문서 버전을 기준으로 WebSocket 제공 여부를 다시 확인해야 한다.

현 시점에는 공개 프로젝트 대부분이 REST polling을 사용한다.

### 9.2 초단타에는 부적합

REST polling + Rate Limit 구조이므로 밀리초 단위 HFT 성격의 시스템에는 적합하지 않다.

적합한 전략:

- 분봉
- 스윙
- 정기 리밸런싱
- 조건주문 기반
- 시간 기반 자동매매

### 9.3 API 스펙 변경 가능성

2026년 공개된 비교적 새로운 API라 버전 변화가 계속 발생하고 있다.

따라서 endpoint를 코드에 직접 산재시키기보다:

- API client module 분리
- OpenAPI schema 기반 타입 생성
- contract test

구조를 권장한다.

## 10. 다른 국내 증권사 OpenAPI 대비 포지션

| 항목 | Toss | 전통 국내 OpenAPI 일반 경향 |
|---|---|---|
| 인증 | OAuth2 Client Credentials | 증권사별 상이 |
| API 스타일 | REST / OpenAPI | REST + 전용 프로토콜 혼재 |
| 국내/미국 통합 | 강점 | API/endpoint가 분리되는 경우 많음 |
| Agent 연동 | 매우 쉬움 | 별도 wrapper 필요 가능 |
| 조건주문 | 공식 API 지원 | 증권사별 차이 큼 |
| API 역사/레퍼런스 | 아직 짧음 | 일부 증권사는 매우 오래됨 |
| 커뮤니티 규모 | 빠르게 성장 중 | 키움/한투 등이 더 큼 |
| 초단타 적합성 | 낮음 | API에 따라 상대적으로 나음 |

## 11. 자동 트레이딩 봇 기획에 적용할 수 있는 방향

### 1단계: Read-only Portfolio Agent

- 계좌 조회
- 보유종목
- 손익
- 시장 데이터
- AI 분석

주문 기능 없음.

### 2단계: Paper Trading

- 전략 실행
- 가상 주문
- 체결 시뮬레이션
- 성과 측정

### 3단계: Human-in-the-loop

- AI 주문 제안
- 사용자 승인
- 실제 주문

### 4단계: Limited Auto Trading

- 허용 종목만
- 금액 제한
- 일일 손실 제한
- SELL 자동화 우선

### 5단계: Full Auto

- 전략별 자동 매수/매도
- 포지션 관리
- 조건주문
- 장애 자동복구
- 알림/모니터링

## 12. MVP 권장 구성

초기 MVP는 전략보다 안전성 검증에 집중하는 것이 좋다.

### 필수 기능

1. Toss API 인증
2. 계좌/보유종목 조회
3. 현재가/캔들 조회
4. Paper Trading
5. 전략 인터페이스
6. Risk Engine
7. Dry-run Order Executor
8. 실주문 이중 잠금
9. 주문/체결 reconciliation
10. 거래 로그
11. Kill Switch

### 초기 제외 권장

- 다중 계좌
- 다중 사용자
- 초단타
- 복잡한 AI 자율 매매
- 자동 전략 생성
- 레버리지/파생상품

## 13. 추천 기술 구조

개인용 또는 사내 PoC 기준:

### Option A — Python

- FastAPI
- asyncio
- httpx
- pydantic
- APScheduler
- SQLite/PostgreSQL

장점: 퀀트/데이터 분석 생태계 활용이 쉽다.

### Option B — Node.js/TypeScript

- Fastify/NestJS
- native fetch/undici
- Zod
- PostgreSQL

장점: OpenAPI/MCP/Web dashboard를 한 언어로 구성하기 쉽다.

## 14. 핵심 위험 요소

| 위험 | 영향 | 대응 |
|---|---|---|
| 중복 주문 | 실제 손실 가능 | idempotency + 주문 상태 확인 + 단일 executor |
| 네트워크 timeout 후 재주문 | 동일 주문 중복 | mutation 자동 retry 금지 |
| 부분 체결 | 내부 장부 불일치 | periodic reconciliation |
| API limit 초과 | 전략/주문 지연 | token bucket + rate header 기반 throttle |
| 서버 재시작 | 포지션 상태 상실 | persistent ledger + startup reconciliation |
| AI hallucination | 잘못된 주문 | LLM과 executor 분리 |
| 계정 Secret 유출 | 계좌 접근 위험 | secret manager + local env |
| 잘못된 전략 폭주 | 큰 손실 | 일일 손실 limit + kill switch |

## 15. 결론

토스증권 Open API는 2026년 현재 개인 자동매매 시스템을 만들기 위한 기능을 충분히 제공한다. 특히 국내/미국 통합 API, 조건주문, 표준 OAuth/REST/OpenAPI 구조는 기존 국내 증권 API보다 개발 경험 측면에서 강점이 있다.

공개 사례들을 보면 실제 구현 난이도의 핵심은 매수/매도 전략 자체가 아니라 다음 다섯 가지다.

1. 실주문 권한 통제
2. 주문 중복 방지
3. 체결/부분체결 동기화
4. API Rate Limit 대응
5. 장애 후 상태 복구

따라서 토스 API 기반 자동 트레이딩 봇을 기획한다면 `AI가 알아서 투자하는 봇`에서 시작하기보다 `계좌/시장 데이터 → Paper Trading → Human Approval → 제한 자동매매 → 완전자동` 순으로 확장하는 것이 현실적이다.

AI Agent를 결합한다면 가장 중요한 원칙은 다음과 같다.

> LLM은 거래 아이디어와 주문 의도를 생성할 수 있지만, 실제 주문 가능 여부와 위험 한도는 deterministic execution layer가 최종 결정해야 한다.

## 16. 후속 검토 과제

- 토스 Open API 실계정 발급 및 sandbox/paper 환경 제공 여부 확인
- 미국주식 소수점 주문 API 지원 범위 확인
- 조건주문(OCO/OTO)의 실제 체결/취소 시나리오 테스트
- 주문 timeout 발생 시 서버 처리 상태 확인 방법 검증
- REST polling으로 허용 가능한 전략 최소 주기 측정
- 홈서버/클라우드 VM 중 허용 IP 운영 방식 결정
- MCP Agent 기반과 일반 Strategy Engine 기반 구조 비교 PoC
- 토스 API와 한국투자증권 OpenAPI 동일 전략 비교 벤치마크

## 참고 자료

### 공식

- 토스증권 Open API 소개: https://home.tossinvest.com/ko/open-api
- 토스증권 Open API 개발자 문서: https://developers.tossinvest.com/docs
- 토스증권 Market Data 문서: https://developers.tossinvest.com/docs/market-data
- OpenAPI Spec: https://openapi.tossinvest.com/openapi-docs/latest/openapi.json

### 공개 구현

- Joyanggi/toss_invest_trading_bot: https://github.com/Joyanggi/toss_invest_trading_bot
- chanjoongx/toss-invest-bot: https://github.com/chanjoongx/toss-invest-bot
- nalbam/toss-invest: https://github.com/nalbam/toss-invest
- kcw2034/toss-invest-mcp: https://github.com/kcw2034/toss-invest-mcp
- Kuco-dev/tossinvest-api-mcp: https://github.com/Kuco-dev/tossinvest-api-mcp
- dev-wooyeon/toss-invest-mcp-server: https://github.com/dev-wooyeon/toss-invest-mcp-server
- jea0716/TossInvestKit: https://github.com/jea0716/TossInvestKit
- JeongSeongMok/tossinvest-openapi-mcp: https://github.com/JeongSeongMok/tossinvest-openapi-mcp
- JungHoonGhae/tossinvest-cli: https://github.com/JungHoonGhae/tossinvest-cli
