# 한국 스포츠토토 공식 배당률 수집 방법

> 목적: 프로토 승부식 축구 분석 자동화에서 **최신 Betman 공식 배당을 최우선 가격 데이터**로 사용하기 위한 수집 전략.

## 결론

권장 우선순위는 다음과 같다.

1. **Betman 공식 프로토 승부식 페이지의 공개 데이터 요청(XHR/Fetch) 확인 후 직접 수집**
2. 요청 구조가 불안정하거나 브라우저 세션이 필요하면 **Playwright로 공식 페이지를 정상 이용하면서 DOM/Network 응답 수집**
3. 공식 페이지 자동 수집이 일시적으로 실패하면 **와이즈토토를 fallback**으로 사용
4. 실제 구매 및 ROI 정산은 항상 **사용자 Betman 구매 캡처의 실제 배당**을 최종값으로 사용

공식 페이지 자체에서 프로토 승부식의 경기번호, 마감시간, 종목/대회, 게임유형, 홈/원정, 배당률을 표시하므로 원천 데이터는 Betman을 기준으로 삼는 것이 가장 적절하다.

## 1. 공식 데이터 소스

### Betman

공식 온라인 발매 사이트:

- https://www.betman.co.kr/
- 프로토 승부식 구매 페이지 예시: `https://www.betman.co.kr/main/mainPage/gamebuy/gameSlip.do?frameType=typeA&gmId=G101&gmTs=...`

프로토 승부식 화면에는 다음 데이터가 표시된다.

- 회차
- 발매기간
- 발매중 / 발매전 / 발매마감 상태
- 경기번호
- 마감시간
- 종목 / 대회
- 게임유형
- 홈팀 / 원정팀
- 승/무/패 또는 U/O 배당
- 대상경기 개최시간

따라서 분석 시스템에서는 해외 bookmaker 가격보다 Betman 가격을 직접 확보하는 것이 우선이다.

### 스포츠토토 공식 사이트

- https://sportstoto.co.kr/

2026년 3월 신규 시스템 도입과 함께 프로토 운영 방식이 변경되었다. 2026-03-27 발매 회차부터 주초/주중/주말 회차 구조가 적용되고 경기번호가 기존 3자리에서 **4자리**로 변경되었다. 수집기의 경기번호 스키마를 문자열 또는 4자리 대응 정수로 설계해야 한다.

## 2. 공개 API 존재 여부

현재 공개 검색으로 확인 가능한 범위에서는 일반 개발자가 바로 사용할 수 있는 **공식 Betman 배당 Open API 문서**를 확인하기 어렵다.

따라서 API가 있다고 가정해서 URL을 하드코딩하지 말고 실제 브라우저가 사용하는 요청을 확인하는 방식이 현실적이다.

## 3. 가장 먼저 할 일: Network 요청 확인

Chrome/Edge 개발자도구에서 Betman 프로토 승부식 페이지를 연다.

1. DevTools → Network
2. Fetch/XHR 필터
3. 회차 변경
4. `배당률 실시간` on/off
5. 발매중/발매전 필터 변경
6. 경기 유형 필터 변경
7. 발생하는 요청의 URL, Method, Query/Form Payload, Response 확인

JSON 응답으로 경기와 배당이 내려온다면 DOM 파싱보다 해당 공개 웹 요청을 재현하는 것이 훨씬 안정적이다.

확인할 필드:

```text
round / gmTs
matchNo
sport
league
marketType
homeTeam
awayTeam
handicapOrLine
oddsHome
oddsDraw
oddsAway
kickoffAt
closeAt
saleStatus
updatedAt
```

주의: 로그인 토큰, CAPTCHA, 접근통제 등을 우회하지 않는다. 브라우저에서 비로그인 또는 정상 세션으로 공개되는 정보만 대상으로 한다.

## 4. requests 방식

Network에서 별도의 공개 JSON/HTML 요청이 확인되면 Python `requests`/`httpx` 기반 수집기를 우선 고려한다.

장점:

- 빠름
- 서버 자원 사용량이 작음
- 주기적 수집이 쉬움
- DOM 변경에 덜 민감함

구조 예시:

```text
Scheduler
  -> BetmanCollector
      -> HTTP request
      -> response parser
      -> schema validation
  -> OddsNormalizer
  -> SnapshotStore
  -> CurrentOddsStore
```

반드시 브라우저에서 실제 확인한 요청만 구현한다. 추정한 내부 endpoint를 무작위 탐색하지 않는다.

## 5. Playwright 방식

XHR 요청을 직접 재현하기 어렵거나 정상 브라우저 세션이 필요한 경우 Playwright가 현실적인 2순위다.

권장 방식:

- Betman 페이지 정상 접속
- 프로토 승부식 이동
- 현재 회차 선택
- 필요한 경우 `배당률 실시간` 활성화
- DOM에서 표 추출 또는 response 이벤트로 배당 응답 캡처

가능하면 DOM selector보다 Network response 기반 추출을 선호한다.

Playwright는 인증/CAPTCHA 우회 도구가 아니라 **정상 브라우저 자동화** 용도로만 사용한다.

## 6. 와이즈토토 fallback

- https://www.wisetoto.com/
- 모바일 프로토 페이지: https://mw.wisetoto.com/

와이즈토토 프로토 페이지는 회차별로 경기번호, 경기시간, 리그, 홈/원정, 승/무/패, 핸디캡, U/O 기준값과 배당을 구조적으로 노출한다.

예시 query 구조:

```text
game_category=pt1   # 프로토 승부식
game_round=...
game_year=2026
tab_type=proto
```

장점은 HTML 구조가 단순해 수집이 쉽다는 점이다.

단, 와이즈토토 자체도 정보가 공식 집계 결과가 아니며 **공식 배당률과 결과는 스포츠토토에서 최종 확인**하라고 명시한다. 과거 공지에서도 발매중단 등의 상황에 따라 배당 업데이트/변동/기준값 업데이트가 지연될 수 있다고 안내한 사례가 있다.

따라서 역할은 다음으로 제한한다.

```text
Betman 성공 -> Betman 사용
Betman 실패 -> WiseToto 임시 사용 + source=Wisetoto 표시
구매 캡처 확보 -> 실제 구매 배당으로 최종 확정
```

## 7. 권장 데이터 모델

```json
{
  "product": "PROTO_WIN",
  "year": 2026,
  "round": 123,
  "match_no": "0123",
  "sport": "SOCCER",
  "league": "K리그1",
  "home_team": "...",
  "away_team": "...",
  "kickoff_at": "2026-08-29T19:00:00+09:00",
  "close_at": "2026-08-29T18:50:00+09:00",
  "market": "1X2",
  "line": null,
  "odds": {
    "home": 2.10,
    "draw": 3.10,
    "away": 2.75
  },
  "sale_status": "OPEN",
  "source": "BETMAN",
  "collected_at": "2026-08-29T09:00:00+09:00"
}
```

시장 타입 예:

```text
1X2
HANDICAP_1X2
TOTAL_OU
```

핸디캡/UO는 반드시 `line`을 별도 저장한다. 동일 경기에서 여러 기준값이 발매될 수 있기 때문이다.

## 8. 배당 스냅샷

현재 배당만 overwrite하지 말고 history를 남긴다.

```text
odds_current
odds_snapshots
```

스냅샷 key 권장:

```text
year + round + match_no + market + line + collected_at
```

이를 통해 다음을 분석할 수 있다.

- 최초 배당
- 현재 배당
- 구매 직전 배당
- 배당 이동폭
- 추천 시점 대비 실제 구매가격 변화

## 9. 수집 주기

프로젝트 운영 기준으로는 기본 1시간 주기가 충분하다. 분석 직전에는 추가 refresh를 수행한다.

```text
평시: 60분
09:00 국내 분석 직전: 강제 refresh
21:00 해외 분석 직전: 강제 refresh
경기 시작 1~2시간 전 관심 경기: 필요 시 10~15분
```

과도한 polling은 피한다.

## 10. 장애 대응

```text
Betman request
  -> 성공: 저장
  -> parser/schema 오류: raw snapshot 저장 + alert
  -> 일시 오류: exponential backoff 재시도
  -> 반복 실패: WiseToto fallback
```

권장:

- timeout
- 2~3회 제한 재시도
- exponential backoff
- User-Agent 명시
- 요청 간격 제한
- 동일 응답 hash cache
- raw response 일부 보존
- schema validation
- selector/API 변경 감지

## 11. 데이터 신뢰도

각 가격에 source와 신뢰도를 붙인다.

```text
BETMAN_LIVE       HIGH
BETMAN_PAGE       HIGH
WISETOTO          MEDIUM
USER_SCREENSHOT   FINAL (실제 구매 정산)
```

분석 리포트에도 가격 출처를 명시하면 잘못된 fallback 가격으로 EV를 계산하는 문제를 줄일 수 있다.

## 12. Soccer Decision System 적용안

현재 프로젝트에는 다음 파이프라인이 가장 적합하다.

```text
Betman Collector
      |
      v
Odds Normalizer ----> Odds Snapshot DB
      |                       |
      v                       v
Current Betman Odds      Line Movement
      |
      v
Match Analysis
      |
      v
Estimated Probability
      |
      v
EV = P × Betman Odds - 1
      |
      v
BET / PASS / WAIT_FOR_LINEUP
```

분석 시 반드시 `collected_at`을 확인해 오래된 배당이면 다시 수집한다.

추천 이후 사용자가 Betman 구매 캡처를 제공하면 추천 가격과 별도로 실제 구매 가격을 저장하고 ROI는 실제 가격 기준으로 계산한다.

## 13. 구현 우선순위

### Phase 1 — Network 조사

Betman DevTools에서 실제 경기/배당 요청을 식별한다.

### Phase 2 — Collector PoC

한 회차를 대상으로 다음이 정확히 추출되는지 확인한다.

- 경기번호
- 팀
- 시장
- 기준값
- 배당
- 마감시간
- 상태

### Phase 3 — 검증

같은 시점의 Betman 화면과 Collector 결과를 diff 한다.

### Phase 4 — WiseToto fallback

공식 수집 실패 시에만 활성화한다.

### Phase 5 — 자동화

1시간 수집 + 09:00/21:00 분석 직전 강제 refresh를 연결한다.

## 핵심 원칙

**공식 가격이 분석의 기준이며, fallback 가격은 공식 가격처럼 취급하지 않는다.**

특히 EV 기반 의사결정에서는 0.05~0.10 수준의 배당 차이도 BET/PASS 판정을 바꿀 수 있으므로 `odds`, `source`, `collected_at`을 항상 함께 저장해야 한다.

## 참고

- Betman 프로토 승부식: https://www.betman.co.kr/
- 스포츠토토: https://sportstoto.co.kr/
- 와이즈토토: https://www.wisetoto.com/
- 2026-03-13 스포츠토토 공지: 프로토(승부식/기록식) 운영 방식 개편 안내
