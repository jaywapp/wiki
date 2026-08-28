# 오픈소스 축구 분석 도구 조사

> 조사일: 2026-08-29  
> 범위: 해외 축구/K리그 경기 데이터 분석, 경기 흐름·이벤트·트래킹·예측·시각화

## 결론

축구 분석 오픈소스 생태계는 꽤 성숙해 있다. 다만 **K리그를 데이터까지 포함해 바로 지원하는 대표 오픈소스는 확인하기 어렵고**, 실전 적용의 핵심은 K리그 이벤트/트래킹 데이터를 확보해 범용 분석 포맷으로 변환하는 것이다.

개인 프로젝트 기준 추천 조합은 다음과 같다.

1. **Kloppy** — 여러 공급자의 이벤트/트래킹 데이터를 공통 모델로 표준화
2. **SoccerAction** — xT, VAEP 등 플레이 가치 평가
3. **mplsoccer** — 패스 네트워크, 슈팅맵, 히트맵 등 시각화
4. **PenaltyBlog** — 경기 결과 확률·Poisson/Elo 기반 예측 및 베팅 분석
5. **DataBallPy / Floodlight** — 트래킹 데이터까지 확보했을 때 고급 공간·움직임 분석

즉, K리그 데이터를 확보할 수 있다면 다음 구조가 현실적이다.

```text
K리그 원천 데이터
    ↓
수집 / Parser
    ↓
Kloppy 또는 자체 표준 Event Schema
    ↓
SoccerAction ── xT / VAEP / 선수 행동 가치
    ↓
mplsoccer ───── 패스맵 / 슈팅맵 / 경기 흐름 시각화
    ↓
PenaltyBlog ─── 경기 결과 확률 / 예측 모델
```

---

## 주요 프로젝트 비교

| 프로젝트 | 핵심 역할 | 주요 기능 | K리그 | 난이도 | 라이선스 |
|---|---|---|---|---|---|
| Kloppy | 데이터 표준화 | Event/Tracking 로딩, 좌표 변환 | 데이터 변환 시 가능 | 중 | BSD-3 |
| SoccerAction | 행동 가치 분석 | SPADL, xT, VAEP | Event 데이터 확보 시 가능 | 중 | MIT |
| mplsoccer | 시각화 | Pitch, Pass Network, Shot Map, Heatmap | 매우 쉬움 | 중하 | MIT |
| PenaltyBlog | 경기 예측 | Poisson, Bayesian, Elo/Massey, 베팅 모델 | 경기 결과 데이터만으로 가능 | 중 | MIT |
| DataBallPy | Event+Tracking | 동기화, xG/xT, Game 모델 | Tracking 확보 필요 | 상 | MIT |
| Floodlight | 고급 Tracking | Space Control, 속도/가속도, Metabolic Power | Tracking 확보 필요 | 상 | MIT |
| SoccerHistory | 경기 결과 수집 | 해외 리그 일정/스코어 | 미지원 | 하 | MIT |

---

## 1. Kloppy

GitHub: https://github.com/PySport/kloppy

축구 이벤트 및 트래킹 데이터를 **공급자 독립적인 데이터 모델**로 표준화하는 Python 라이브러리다.

### 지원 데이터

- StatsBomb
- Stats Perform
- Opta F7/F24/F73
- Wyscout
- Tracab
- Second Spectrum 등

### 활용

- 패스/슈팅/드리블 등 이벤트 정규화
- 공급자별 좌표계 통일
- Event/Tracking 데이터 DataFrame 변환
- 서로 다른 데이터 소스를 동일 분석 파이프라인으로 처리

K리그 데이터가 자체 JSON/CSV 형태라면 Kloppy 모델 또는 StatsBomb 계열의 표준 스키마로 변환하는 Adapter를 두는 방식이 유용하다.

**추천도: ★★★★★** — 데이터 파이프라인의 기반 계층으로 가장 유용하다.

---

## 2. SoccerAction

GitHub: https://github.com/ML-KULeuven/socceraction

이벤트 스트림을 공통 액션 언어인 **SPADL**로 변환하고 각 플레이의 가치를 정량화한다.

### 핵심 분석

- Expected Threat (xT)
- VAEP
- Atomic-VAEP
- 선수별 on-ball action 가치
- 패스/드리블/슈팅이 득점 가능성에 미친 영향

지원 입력에는 StatsBomb, Opta, Wyscout, Stats Perform, WhoScored 등이 포함된다.

### K리그 활용

K리그 이벤트를 다음과 같은 형태로 확보하면 적용할 수 있다.

```text
minute / second
team
player
operation type
start_x / start_y
end_x / end_y
result
```

이를 SPADL로 변환하면 경기별 xT 흐름, 선수별 공격 기여도 등을 계산할 수 있다.

**추천도: ★★★★★** — 단순 스코어/스탯을 넘어 경기의 실제 흐름을 수치화하는 핵심 후보.

---

## 3. mplsoccer

GitHub: https://github.com/andrewRowlinson/mplsoccer

Matplotlib 기반 축구 전용 시각화 라이브러리다.

### 만들 수 있는 것

- Pitch
- Pass Network
- Pass Flow Map
- Shot Map / xG Shot Map
- Heatmap
- Radar Chart
- 선수 평균 위치
- 공격 방향 및 공간 점유 시각화

StatsBomb Open Data를 바로 불러올 수도 있지만 일반 Pandas DataFrame만 있으면 K리그에도 쉽게 적용할 수 있다.

**추천도: ★★★★★** — 경기 분석 대시보드나 리포트의 시각화 계층으로 가장 빠르게 효과를 볼 수 있다.

---

## 4. PenaltyBlog

GitHub: https://github.com/martineastwood/penaltyblog

경기 결과 예측 및 베팅 분석에 초점을 둔 Python 패키지다.

### 주요 기능

- Poisson 계열 득점 모델
- Bayesian 모델
- Elo / Massey Rating
- 승/무/패 확률
- 예상 스코어 분포
- 데이터 수집/모델링 파이프라인

K리그처럼 세밀한 이벤트 데이터 확보가 어려운 환경에서도 **과거 경기 결과, 홈/원정, 득실점 데이터만 확보하면 바로 활용 가능**하다는 점이 중요하다.

**추천도: ★★★★★** — 경기 사전 예측이나 배당 대비 자체 확률 산출을 목표로 할 경우 특히 유용하다.

---

## 5. DataBallPy

GitHub: https://github.com/Alek050/databallpy

Event와 Tracking 데이터를 하나의 `Game` 객체로 묶고 두 데이터 스트림을 동기화하는 데 강점이 있다.

### 주요 기능

- Opta 이벤트 데이터
- Tracab / Metrica / DFL / Sportec 트래킹
- Event ↔ Tracking 시간 동기화
- xG/xT 등 지표 계산
- 선수 및 볼 움직임 분석

특히 이벤트 시점과 트래킹 프레임의 시간이 정확히 일치하지 않는 문제를 해결하기 위한 동기화 기능이 특징이다.

**추천도: ★★★★☆** — 트래킹 데이터가 있을 때 가치가 크게 올라간다.

---

## 6. Floodlight

GitHub: https://github.com/floodlight-sports/floodlight

축구를 포함한 팀 스포츠의 Event/Tracking 데이터를 분석하는 과학 계산 중심 프레임워크다.

### 주요 기능

- Tracking/Event 데이터 구조
- Space Control
- Voronoi 기반 공간 분석
- 선수 거리·속도·가속도
- Metabolic Power
- Approximate Entropy

Opta, Tracab, Second Spectrum, SkillCorner, StatsPerform, StatsBomb 등 다양한 공급자 파서를 지원한다.

K리그 트래킹 좌표를 확보한다면 압박, 라인 간격, 공간 지배, 선수 이동량 같은 고급 분석까지 확장할 수 있다.

**추천도: ★★★★☆** — 고급 분석에는 강력하지만 초기 PoC에는 다소 무겁다.

---

## 7. SoccerHistory

GitHub: https://github.com/korECM/SoccerHistory

해외 주요 리그의 일정과 과거 경기 결과를 간단히 조회하기 위한 Node.js/TypeScript 라이브러리다.

지원 예시:

- EPL
- LaLiga
- Bundesliga
- Serie A
- Ligue 1
- Champions League
- Europa League

K리그는 지원하지 않으며 세부 이벤트 분석보다는 과거 스코어 수집 용도에 가깝다.

**추천도: ★★☆☆☆** — 참고용 데이터 수집 프로젝트.

---

# 경기 흐름을 어떻게 수치화할 것인가

단순 점유율보다 다음 지표를 시간축으로 누적/구간 집계하면 경기 흐름을 훨씬 잘 볼 수 있다.

```text
0 ───── 15 ───── 30 ───── 45 ───── 60 ───── 75 ───── 90

xG           ███      ██████        ██
xT        ████████       █████████
Shots       ● ● ●            ● ●
Box Entry   ▲ ▲     ▲ ▲ ▲       ▲
Possession █████   ████      ██████
```

추천 Momentum 지표 후보:

- Rolling xG
- Rolling xT
- Box Entries
- Progressive Passes
- Final-third Entries
- Shots / Shots on Target
- Dangerous Possession
- PPDA
- Field Tilt
- Set Piece Threat

예를 들어 5분 단위로 계산하면 다음과 같은 **Momentum Timeline**을 만들 수 있다.

```text
Momentum(t)
 = w1 * xT
 + w2 * xG
 + w3 * BoxEntry
 + w4 * ProgressivePass
 + w5 * FieldTilt
```

이 값을 양 팀 기준 ± 형태로 표현하면 SofaScore류의 Attack Momentum과 비슷한 경기 흐름 그래프를 자체 구현할 수 있다.

---

# K리그 적용 전략

가장 큰 문제는 라이브러리가 아니라 **데이터 확보**다.

### Level 1 — 경기 결과 기반

필요 데이터:

- 경기 결과
- 홈/원정
- 득실점
- 최근 경기

활용:

- PenaltyBlog
- Elo
- Poisson

구현 난이도가 가장 낮다.

### Level 2 — 경기 통계 기반

추가 데이터:

- 슈팅
- 유효슈팅
- 점유율
- 코너킥
- 공격지역 진입
- 카드

활용:

- Momentum
- 팀 form
- 공격/수비 강도
- 경기 흐름 그래프

### Level 3 — Event 데이터 기반

필요 데이터:

```text
Pass
Shot
Carry
Dribble
Tackle
Interception
Foul
Ball Recovery
```

각 이벤트에 시간과 좌표가 있어야 한다.

활용:

- SoccerAction
- xT
- VAEP
- mplsoccer
- Pass Network
- Progressive Pass

### Level 4 — Tracking 데이터 기반

선수 22명 + 공의 프레임별 좌표가 필요하다.

활용:

- DataBallPy
- Floodlight
- Space Control
- Pressing Structure
- Defensive Line
- Compactness

개인 개발 프로젝트라면 **Level 2 → Level 3** 순으로 접근하는 것이 현실적이다.

---

# 개인 개발자용 추천 아키텍처

```text
                  ┌───────────────────┐
                  │ Data Collectors   │
                  │ KLeague / Europe  │
                  └─────────┬─────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Canonical Event DB  │
                 │ Match / Event / Odds│
                 └─────────┬───────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
        Kloppy        SoccerAction   PenaltyBlog
            │              │              │
            │           xT / VAEP      Win Prob
            │              │          Score Prob
            └───────┬──────┴───────┬──────┘
                    ▼              ▼
               Momentum Engine   Prediction
                    │
                    ▼
                 mplsoccer
                    │
                    ▼
              Web Dashboard / AI
```

## PoC 우선순위

### 1단계

- K리그/유럽 경기 기본 데이터 수집
- 경기/팀/배당/결과 DB
- PenaltyBlog Poisson/Elo 모델

### 2단계

- 슈팅/공격 이벤트 확보
- mplsoccer Shot Map
- 자체 Momentum Timeline

### 3단계

- 좌표 포함 Event 데이터
- SoccerAction SPADL
- xT / VAEP
- Pass Network

### 4단계

- Tracking 데이터 확보 시 DataBallPy/Floodlight 추가

---

# 최종 추천

현재 개인 개발자가 실제 서비스를 만들 목적이라면 **하나의 거대한 축구 분석 프로젝트를 찾기보다 여러 검증된 오픈소스를 조합하는 방식**이 적합하다.

특히 다음 조합이 좋다.

```text
Data ingestion / normalization : Kloppy
Action value                  : SoccerAction
Match prediction              : PenaltyBlog
Visualization                 : mplsoccer
Advanced tracking             : DataBallPy / Floodlight
```

K리그에서 먼저 확인해야 할 것은 **어디에서 어느 수준의 데이터를 안정적으로 수집할 수 있는가**이다. Event 좌표까지 확보된다면 오픈소스 분석 생태계의 상당 부분을 그대로 활용할 수 있다.

## 참고 링크

- https://github.com/PySport/kloppy
- https://github.com/ML-KULeuven/socceraction
- https://github.com/andrewRowlinson/mplsoccer
- https://github.com/martineastwood/penaltyblog
- https://github.com/Alek050/databallpy
- https://github.com/floodlight-sports/floodlight
- https://github.com/korECM/SoccerHistory
