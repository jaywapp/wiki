---
title: public-apis
category: tools
tags:
  - api
  - dataset
  - developer-resources
  - agent-tools
source: https://github.com/public-apis/public-apis
updated: 2026-09-13
---

# public-apis

> 수많은 공개 API를 분야별로 모아 둔 초대형 커뮤니티 큐레이션 카탈로그로, AI 에이전트가 외부 데이터·기능을 찾는 Discovery Source로 활용 가치가 크다.

## 프로젝트 개요

`public-apis/public-apis`는 직접 API를 제공하는 프레임워크가 아니라, 공개적으로 사용할 수 있는 API의 문서 링크와 인증 방식, HTTPS/CORS 등의 정보를 분야별 표로 정리한 GitHub 저장소다. 2016년에 시작되었고 MIT 라이선스로 배포된다.

2026-09-13 조사 시점 GitHub 메타데이터 기준 약 47.9만 Stars, 5.29만 Forks를 가진 매우 큰 개발자 리소스다. 기본 브랜치는 `master`다.

## 해결하려는 문제

외부 서비스를 연동하려면 보통 검색 → 공식 문서 확인 → 인증 방식 확인 → 브라우저 호출 가능 여부 확인을 반복해야 한다. public-apis는 이 탐색 비용을 줄이기 위해 여러 분야의 API를 하나의 인덱스로 모은다.

AI/Agent 관점에서는 Agent가 사용할 Tool 후보나 데이터 소스를 찾을 때 초기 Discovery Catalog로 사용할 수 있다는 점이 중요하다.

## 핵심 기능

- Animals, Finance, Government, Development, Weather 등 다수 카테고리의 API 목록
- 각 API의 설명 및 공식 문서 링크
- 인증 방식(apiKey, OAuth, No 등) 표시
- HTTPS 및 CORS 관련 메타데이터
- 일부 API의 Postman 실행 링크
- 커뮤니티 PR 기반의 신규 API 추가 및 수정
- GitHub Actions를 통한 링크/README 검증
- 별도 `davemachado/public-api` 프로젝트를 통한 목록의 API 형태 접근 가능

## 구조 및 아키텍처

이 프로젝트의 핵심은 애플리케이션 코드보다 README 기반의 데이터셋이다.

```text
Contributor
   │
   │ PR: API 추가/수정
   ▼
public-apis/public-apis
   │
   ├─ README.md ── 카테고리별 API Catalog
   ├─ CONTRIBUTING.md ── 등록/품질 규칙
   └─ GitHub Actions
       ├─ 신규 PR 링크 검사
       ├─ 링크 유효성 검사
       ├─ README 검증
       └─ validate 테스트

                 활용
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
     Developer            AI Agent
        │                     │
        ▼                     ▼
  API 직접 선택        Tool/Data Source 탐색
```

즉, Runtime API Gateway나 MCP Server가 아니라 **API Discovery Dataset**에 가깝다.

## AI / Agent 활용 관점

Agent가 인터넷 검색으로 API를 매번 찾게 하는 것보다 이 저장소를 주기적으로 구조화해 로컬 인덱스로 만들면 후보 탐색 비용을 낮출 수 있다.

예시 흐름:

```text
public-apis README
      ↓ parse
Structured API Catalog
      ↓ filter
Auth / CORS / Category / Keyword
      ↓
Agent Tool Candidate
      ↓ docs verification
OpenAPI/MCP wrapper generation
      ↓
Agent Tool Registry
```

중요한 점은 목록에 있다고 해서 곧바로 Agent Tool로 신뢰해서는 안 된다는 것이다. 실제 endpoint, 요금, 인증, rate limit, 이용약관은 공식 문서를 다시 검증해야 한다.

## 장점

- 압도적으로 큰 커뮤니티와 인지도
- 다양한 분야를 한 번에 탐색 가능
- GitHub 저장소라 자동 수집·파싱·diff 추적이 쉬움
- 인증/CORS 등의 1차 필터링 정보 제공
- MIT 라이선스로 데이터 가공 실험에 부담이 적음
- Agent Tool Discovery 데이터셋의 seed로 활용하기 좋음

## 단점 및 한계

### 데이터 신선도

외부 API는 종료·유료화·인증 변경이 잦다. 2026년 8월에도 저장소 전체에서 다수의 404 링크를 지적하는 Issue가 등록되어 있다. 따라서 목록 자체를 실시간 진실의 원천으로 보면 안 된다.

### PR 적체

2026-09 조사 시 약 1,900개의 Open PR이 표시될 정도로 기여량이 매우 많다. 신규 후보가 많다는 장점이 있지만 검토/병합 지연과 품질 편차가 발생할 수 있다.

### 상업적 노출

현재 README 상단은 APILayer 제품군을 크게 노출한다. 따라서 완전히 중립적인 API 검색 엔진이라기보다 커뮤니티 카탈로그와 상업적 운영이 혼합된 구조로 보는 편이 안전하다.

### 메타데이터 한계

Agent가 실제 Tool을 선택하는 데 중요한 다음 정보는 충분하지 않다.

- Rate limit
- 실제 가격/무료 한도
- SLA
- 응답 latency
- OpenAPI Schema 제공 여부
- MCP 지원 여부
- 데이터 라이선스
- 최근 정상 호출 여부

### 보안

목록에 포함되었다는 사실은 API의 보안성을 보증하지 않는다. Agent가 자동으로 credential을 전달하거나 외부 API를 호출하는 구조에서는 별도의 allowlist, secret isolation, domain verification이 필요하다.

## 활용 사례

1. 사이드 프로젝트의 외부 데이터 API 탐색
2. AI Agent의 Tool 후보 자동 수집
3. MCP Server 자동 생성 후보 탐색
4. API 기반 콘텐츠/데이터 서비스 아이디어 발굴
5. public-apis-4Kr 같은 지역 특화 카탈로그와 병합
6. API 생존 여부 및 변화 추적 데이터셋 구축

## 기존 도구와 비교

### public-apis-4Kr

`yybmion/public-apis-4Kr`는 한국 서비스에 초점을 맞춘 API 목록이라 국내 서비스 개발에는 더 직접적이다. 반면 `public-apis/public-apis`는 전 세계 범위와 카테고리 다양성이 훨씬 크다.

둘은 경쟁 관계보다는 다음처럼 결합하는 것이 적합하다.

```text
Global Discovery     Korea Discovery
public-apis          public-apis-4Kr
       └──────┬──────┘
              ▼
       Unified API Catalog
              ▼
        Verification Layer
              ▼
       Agent / Content / App
```

## 활용 아이디어

### 바로 적용 가능

**API 아이디어 검색 소스**로 사용한다. 서비스나 콘텐츠 아이디어가 생겼을 때 키워드 기반으로 후보 API를 빠르게 좁힌 뒤 공식 문서를 검증한다.

### PoC 가치 있음

**Agent Tool Discovery Pipeline**을 만든다.

1. README를 정기적으로 수집한다.
2. API 항목을 JSON/DB로 변환한다.
3. URL health check를 수행한다.
4. 공식 문서에서 OpenAPI 여부와 인증 방식을 추가 추출한다.
5. Agent가 자연어 요구사항으로 API 후보를 검색한다.
6. 검증된 API만 MCP/Tool wrapper 생성 대상으로 넘긴다.

특히 기존 Harness에 `Tool Scout` 역할을 두어 "이 작업에 필요한 외부 API 후보를 찾아라"라는 단계에서 이 Catalog를 검색하게 하는 방식이 실용적이다.

### 아이디어 참고

API의 신규 추가/삭제 diff를 매일 추적하면 "새로 등장한 공개 API" 자체를 개발자용 콘텐츠 소재로 만들 수 있다. 국내용 `public-apis-4Kr`와 결합하면 글로벌/국내 API 변화 비교도 가능하다.

### 현재는 도입 가치 낮음

목록의 API를 검증 없이 자동으로 Agent Tool Registry에 등록하는 방식은 권장하지 않는다. 오래된 링크, 인증 변경, 악성/저품질 서비스, 비용 변화 가능성이 있기 때문이다.

## 결론

`public-apis`는 AI 도구나 Agent Framework 자체는 아니다. 그러나 **Agent가 사용할 외부 데이터와 기능을 발견하는 거대한 원천 데이터셋**으로 보면 가치가 높다.

가장 좋은 활용법은 저장소를 그대로 사용하는 것이 아니라 `수집 → 구조화 → health check → 공식 문서 검증 → allowlist → MCP/Tool 생성` 파이프라인의 첫 단계로 두는 것이다. 기존 `public-apis-4Kr`와 합치면 개인용 API Discovery Knowledge Base를 구축하기에도 적합하다.

## 참고 자료

- https://github.com/public-apis/public-apis
- https://github.com/public-apis/public-apis/blob/master/CONTRIBUTING.md
- https://github.com/public-apis/public-apis/issues
- https://github.com/public-apis/public-apis/pulls
- https://github.com/davemachado/public-api
