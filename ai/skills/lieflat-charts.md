---
title: Lieflat Charts
category: skills
tags:
  - ai
  - agent-skill
  - data-visualization
  - reporting
  - claude-code
  - codex
source: https://github.com/larashero3-dotcom/lieflat-charts
updated: 2026-09-05
---

# Lieflat Charts

> `SKILL.md`를 이해하는 AI Agent가 데이터의 형태와 목적을 판단해, 정해진 시각 문법과 실제 HTML 템플릿을 골라 출판 가능한 차트·리포트를 생성하도록 만드는 템플릿 중심 데이터 시각화 Agent Skill.

## 프로젝트 개요

Lieflat Charts는 일반적인 JavaScript 차트 라이브러리라기보다 **Agent Skills 호환 데이터 시각화/리포트 생성 Skill**이다. Claude Code, Codex, moxt 등 `SKILL.md` 기반 작업 지침을 읽을 수 있는 Agent에게 차트 선택 규칙, 디자인 토큰, 실제 구현 템플릿, 보고서 템플릿과 검증 절차를 함께 제공한다.

핵심은 Agent가 매번 CSS/SVG/Chart.js/ECharts 코드를 즉흥적으로 디자인하지 않도록 하고, 이미 정의된 시각 언어 안에서 데이터 구조에 맞는 템플릿을 선택·변형하게 하는 것이다.

조사 기준일은 2026-09-05이며 공식 릴리스는 v1.2.0까지 확인했다. 이후 main 브랜치에는 추가 차트 유형과 Maps, 카탈로그/미리보기 개선이 계속 반영되고 있다.

## 해결하려는 문제

LLM에게 단순히 "이 데이터를 예쁜 차트로 만들어줘"라고 지시하면 결과가 세션마다 달라지고, 차트 라이브러리의 기본 스타일로 회귀하거나 데이터와 맞지 않는 시각화를 임의로 선택하기 쉽다. 여러 장을 만들면 폰트·여백·색·선·주석 규칙도 흔들린다.

Lieflat Charts는 이 문제를 **선택 규칙 + 디자인 시스템 + 검증된 구현 템플릿**으로 제한한다. Agent는 먼저 데이터 형태를 판별하고, 카탈로그에서 후보를 비교한 다음, 선택한 gallery의 실제 코드 골격을 유지한 채 데이터와 문구만 바꾸는 방식으로 작업한다.

## 핵심 기능

- **Agent Skills 형식**: 저장소 루트의 `SKILL.md`가 전체 작업 규칙과 선택 정책을 정의한다.
- **Lupi Editorial**: 세부 기록, 주석, 여백을 중시하는 편집/서사형 차트.
- **Lupi Basics**: bar, line, area, donut, scatter 등 익숙한 형태를 편집 디자인 문법으로 재구성한다.
- **Glance**: 큰 숫자, 굵은 막대, 순위 중심으로 수 초 내 판단해야 하는 dashboard/주간 보고용 표현을 제공한다.
- **Maps / Interactive**: 명시적인 지도 요청과 network/path/고밀도 관계 데이터용 별도 템플릿을 제공한다.
- **보고서 모드**: R01–R12의 12개 전체 페이지 템플릿을 중국어/영어 버전으로 제공한다.
- **색상 시스템**: Mono를 안전한 기본값으로 두고 Porcelain, Palm, Wire를 데이터 의미에 맞춰 선택한다. 사용자 브랜드 색을 기반으로 custom palette도 구성할 수 있다.
- **단일 HTML 산출물**: 빌드 과정 없이 브라우저에서 열 수 있는 HTML 차트/보고서를 목표로 한다. 단, 외부 Chart.js/ECharts/GeoJSON/온라인 폰트를 인라인하지 않은 템플릿은 네트워크가 필요할 수 있다.
- **검증 스크립트**: gallery/색상/번호/컨테이너 일관성을 검사하는 validation과 신규 차트 smoke test가 포함되어 있다.

## 구조 및 아키텍처

```text
User data / request
        |
        v
     AI Agent
        |
        +--> SKILL.md
        |      - chart vs report mode
        |      - data-shape classification
        |      - template priority / constraints
        |
        +--> catalog.md / report-catalog.md
        |      - candidate lookup
        |
        +--> templates/
        |      - Lupi / Basics / Glance
        |      - Maps / Interactive
        |      - Color / Report templates
        |
        +--> mono-tokens.js / color-presets.js
        |      - visual tokens / palette
        |
        v
  template adaptation
        |
        v
 single HTML chart/report
        |
        v
 validation / visual check
```

이 구조에서 중요한 부분은 **LLM이 렌더러 자체가 아니라 템플릿 선택·변환 Orchestrator 역할을 한다는 점**이다.

`SKILL.md`는 단순 프롬프트가 아니다. 예를 들어 기본 차트 선택 순서를 Lupi Editorial → Lupi Basics → 필요할 때 Glance로 제한하고, 주력/후보 템플릿을 나누며, OHLC·box plot·calendar heatmap 등 특정 데이터 형태에는 전용 템플릿을 바로 사용하도록 규정한다. 또한 선택한 gallery 카드의 SVG/Canvas/ECharts 구조와 데이터 인코딩을 유지하도록 강제한다.

보고서는 차트 여러 장을 임의로 붙이는 방식이 아니라 `report-catalog.md`에서 R01–R12 중 전체 페이지 골격을 먼저 고르고, 각 차트 슬롯에서 다시 chart catalog의 실제 구현을 선택한다.

## 설치 및 사용

공식 README가 제시하는 범용 설치 예시는 다음과 같다.

```bash
npx skills add https://github.com/larashero3-dotcom/lieflat-charts --skill lieflat-charts
```

Claude Code에 직접 설치할 경우 `~/.claude/skills/lieflat-charts`, Codex에서는 `~/.codex/skills/lieflat-charts`를 사용할 수 있다. 설치 후 `SKILL.md`, `templates/`, `catalog.md`, `mono-tokens.js`가 함께 있어야 Skill의 의도대로 동작한다.

예시 요청:

```text
Use lieflat-charts to turn this weekly TeamCity build dataset into charts.
Highlight failure rate, build duration trend, and abnormal projects.
```

또는 완전한 보고서가 필요할 때만 명시적으로:

```text
Use lieflat-charts to create a monthly engineering productivity HTML report
from these TeamCity and Perforce metrics.
```

## 장점

### 1. 생성형 UI의 가장 큰 약점인 디자인 일관성을 줄인다

Agent가 자유롭게 "예쁜 그래프"를 만드는 것이 아니라 실제 template implementation을 기준으로 수정한다. 반복 보고서나 팀 단위 산출물에서 스타일 드리프트를 줄이기 좋은 접근이다.

### 2. 차트 선택 자체를 Skill에 넣었다

데이터 형태 → 후보 비교 → 템플릿 선택 → 구현 재사용이라는 판단 절차가 명시되어 있다. 즉 CSS theme만 제공하는 프로젝트보다 Agent의 **판단 품질**까지 통제하려는 설계다.

### 3. Claude Code와 Codex에 그대로 적용하기 쉽다

별도의 MCP 서버나 SaaS API가 필수인 구조가 아니다. 파일 기반 Skill이므로 로컬 Agent workflow에 포함하기 쉽고, 데이터 파일을 로컬에 둔 상태로 HTML을 생성하는 패턴에도 잘 맞는다.

### 4. 차트와 보고서를 분리했다

단순 데이터 시각화 요청을 자동으로 거대한 보고서로 확대하지 않는다. `SKILL.md`가 명시적인 report/annual report/brief/dashboard report 등의 요청이 있을 때만 report mode를 사용하도록 제한한다.

### 5. 결과가 웹 표준 파일이다

최종 결과가 HTML 중심이어서 브라우저 확인, 내부 웹 포털 삽입, 이미지/PDF 변환, CI artifact 배포 같은 후속 자동화와 연결하기 쉽다.

## 단점 및 한계

### 라이선스가 상업적 도입의 가장 큰 제약

저장소는 **PolyForm Noncommercial License 1.0.0**을 사용한다. 개인 연구·실험 등 비상업 목적은 허용하지만 일반적인 회사 업무에 그대로 포함하는 것은 라이선스 검토가 필요하다. 특히 사내 생산성 시스템이나 상용 제품의 기본 Skill로 복제·배포하려면 법무/저작권 확인 없이 도입하면 안 된다.

### 템플릿 밖 표현에는 구조적 한계가 있다

일관성을 얻는 대신 표현 공간을 의도적으로 제한한다. 프로젝트 규칙상 library 밖 새 chart는 마지막 수단이며, template 골격을 임의로 혼합하는 것도 금지한다. 특수한 사내 dashboard 요구에는 오히려 답답할 수 있다.

### HTML 의존성 관리가 필요하다

순수 SVG는 오프라인 친화적이지만 Chart.js, ECharts, GeoJSON, 온라인 폰트 등을 외부에서 읽는 결과물은 폐쇄망/사내망에서 바로 동작하지 않을 수 있다. Enterprise 환경에서는 의존성을 vendoring하거나 inline하는 별도 정책이 필요하다.

### Skill 자체가 상당히 크고 규칙이 강하다

`SKILL.md`가 매우 상세하고 catalog/templates도 함께 읽어야 한다. 단순 그래프 하나를 그릴 때는 context/token 비용과 파일 탐색 비용이 가벼운 chart prompt보다 높다. 반대로 반복 산출물에서는 이 비용이 일관성으로 보상될 수 있다.

### 아직 빠르게 변화하는 프로젝트다

v1.1.0(색상), v1.2.0(보고서)에 이어 main에서는 추가 차트/Maps가 들어오는 등 기능 확장이 빠르다. 고정된 사내 표준으로 채택하려면 commit/tag pinning과 업데이트 검증이 필요하다.

## 활용 사례

- AI가 조사한 기술 자료의 핵심 수치를 Wiki용 HTML 차트로 생성
- TeamCity build time / failure rate / queue time 주간 리포트
- Perforce changelist, submit volume, sync time 등의 개발 생산성 지표 시각화
- Agent 작업 현황 dashboard의 정적 summary artifact 생성
- 모델 benchmark / token / cost 비교 자료
- 월간 AX 도입 성과 보고서 및 기술 리서치 one-pager
- 축구 경기/배당/ROI처럼 시간 흐름과 순위가 함께 필요한 개인 데이터 리포트

## 기존 방식과 비교

| 방식 | 장점 | 약점 | Lieflat Charts와 차이 |
|---|---|---|---|
| Chart.js / ECharts 직접 생성 | 자유도와 기능성이 높음 | Agent가 디자인과 차트 선택을 매번 결정 | Lieflat은 라이브러리 위에 선택 정책과 디자인 문법을 추가 |
| 일반 chart prompt | 매우 간단하고 빠름 | 세션마다 스타일/품질 편차가 큼 | Lieflat은 template 구현을 source of truth로 사용 |
| BI Dashboard | 데이터 연결, 필터, 운영성이 강함 | 정형화된 운영 플랫폼이 필요 | Lieflat은 일회성/문서형 HTML artifact 생성에 강함 |
| 자체 HTML report template | 회사 스타일에 정확히 맞춤 | 템플릿/선택 로직을 직접 유지보수 | Lieflat은 이미 구축된 chart taxonomy와 Agent workflow를 참고 가능 |

## 활용 아이디어

### 바로 적용 가능 — 개인/비상업 실험

Claude Code 또는 Codex의 개인 Skill로 설치해 실제 업무와 유사한 비민감 샘플 데이터에 적용해볼 가치가 높다. 특히 "같은 데이터를 자유 생성 차트와 Lieflat으로 각각 생성"해 결과 일관성과 수정 횟수를 비교하면 효과를 빨리 판단할 수 있다.

### PoC 가치 있음 — 사내 AX 리포트 디자인 참고

회사 환경에서는 라이선스 때문에 그대로 내장하기보다 **설계 패턴을 연구하는 PoC**가 적합하다. 특히 다음 패턴은 자체 Skill 설계에 참고 가치가 높다.

1. `SKILL.md`에 data-shape 기반 선택 정책을 둔다.
2. `catalog.md`에서 사내 승인 차트와 사용 조건을 관리한다.
3. `templates/`에는 실제 검증된 HTML 구현만 둔다.
4. 브랜드 토큰을 별도 파일로 관리한다.
5. 생성 후 validation/smoke test를 실행한다.

이 패턴을 TeamCity/Perforce/Agent Dashboard 전용 사내 visualization skill로 재구성하면, 개발 생산성 데이터를 매번 다른 스타일로 그리는 문제를 크게 줄일 수 있다.

### 아이디어 참고 — Agent Harness의 Presentation Layer

멀티 Agent Harness에서 Analyst가 JSON/CSV 형태의 결과를 만들고 마지막 Presentation Agent가 Lieflat 계열 Skill을 사용해 HTML artifact를 만드는 구조가 잘 맞는다.

```text
Collectors -> Analyst -> normalized metrics.json
                         |
                         v
                  Presentation Agent
                         |
                 visualization skill
                         |
                  report/index.html
```

분석 Agent와 표현 Agent를 분리하면 데이터 해석과 디자인 지침이 서로 context를 침범하는 문제도 줄일 수 있다.

## Enterprise / Windows 관점

Windows 자체가 핵심 장애물은 아니다. 결과가 HTML/JS이고 Claude Code/Codex가 파일을 다룰 수 있다면 사용할 수 있다. 오히려 사내 적용에서 중요한 것은 OS보다 다음 세 가지다.

1. PolyForm Noncommercial 라이선스 검토
2. CDN/온라인 폰트/ECharts/Chart.js/GeoJSON의 오프라인화
3. 검증된 버전(tag 또는 commit)의 pinning

따라서 **개인 Skill로는 바로 시험할 만하지만, 회사 표준 Skill로 그대로 채택하는 것은 현재 기준 권장하지 않는다.** 회사에서는 디자인/Agent-selection 구조를 참고해 자체 라이선스가 명확한 사내 Skill을 만드는 방향이 더 안전하다.

## 프로젝트 성숙도

공식 release는 v1.1.0과 v1.2.0이 확인된다. v1.2.0은 2026-08-14 공개되었고 12개의 중/영문 보고서 템플릿을 추가했다. 2026-08-19에는 main에 Lupi/Basics/Glance/Maps 전반의 16개 신규 차트 유형이 추가되었으며, 2026-09-03까지 보고서 미리보기와 카탈로그 자산을 다듬는 commit이 이어졌다.

Issue에서도 긴 카테고리명을 빠르게 읽는 horizontal chunky bar 같은 실제 표현 공백과 금융경제 report preset 요청이 논의되고 있다. 즉 단순 샘플 저장소보다는 실제 디자인 시스템을 계속 확장하는 단계로 보인다.

## 결론

Lieflat Charts의 핵심 가치는 차트 개수가 아니라 **"AI에게 디자인 취향과 차트 선택 기준을 파일 기반 Skill로 어떻게 주입할 것인가"에 대한 구체적인 구현 사례**라는 점이다.

개인 Claude Code/Codex 환경에서 데이터 시각화 품질을 높이는 용도로는 바로 시험할 가치가 높다. 특히 AI 조사 결과, 개발 생산성 metric, 정기 기술 보고서를 HTML로 남기는 workflow와 궁합이 좋다.

반면 회사 업무에 저장소를 그대로 설치·재배포하는 것은 Noncommercial 라이선스 때문에 주의가 필요하다. Enterprise 관점에서는 프로젝트 자체보다 `SKILL.md + catalog + real templates + design tokens + validation` 구조를 분석해 사내 전용 visualization skill을 만드는 참고 모델로 보는 것이 가장 가치가 높다.

## 참고 자료

- Repository: https://github.com/larashero3-dotcom/lieflat-charts
- English README: https://github.com/larashero3-dotcom/lieflat-charts/blob/main/README.en.md
- Skill specification: https://github.com/larashero3-dotcom/lieflat-charts/blob/main/SKILL.md
- Releases: https://github.com/larashero3-dotcom/lieflat-charts/releases
- License: https://github.com/larashero3-dotcom/lieflat-charts/blob/main/LICENSE
