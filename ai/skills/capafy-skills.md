---
title: Capafy Skills
category: skills
tags:
  - ai
  - agent
  - skills
  - marketplace
  - claude-code
  - codex
  - openclaw
source: https://github.com/Capafy/Capafy-skills
updated: 2026-08-29
---

# Capafy Skills

> Claude Code·Codex·OpenClaw 등에서 만든 Agent Skill을 마켓플레이스에 유료 배포하거나, 다른 사람의 Skill을 검색·구매·실행할 수 있게 하는 Capafy용 Publisher/User Skill 세트.

## 프로젝트 개요

Capafy는 Skill 기반 Agent의 마켓플레이스를 지향한다. 이 저장소는 Capafy 플랫폼 자체보다는 Agent Client에서 플랫폼과 상호작용하기 위한 두 개의 Skill을 제공한다.

- `capafy-publisher`: 자신이 만든 Skill/Agent를 검색·검증·패키징하여 Capafy에 게시하는 제작자용 Skill
- `capafy-user`: Capafy 카탈로그에서 Agent를 검색하고 구매·설치·실행·재개하는 사용자용 Skill

공식 README 기준 Claude Code, Codex, OpenClaw를 주요 클라이언트로 안내하며 Publisher Skill의 메타데이터에는 Hermes 호스트 지원도 명시되어 있다. Python 3.8+가 필요하다.

## 해결하려는 문제

기존 Agent Skill 생태계는 GitHub 등에 Skill 파일과 프롬프트를 공개하는 형태가 많다. 이는 공유에는 유리하지만 제작자의 전문 지식과 프롬프트/IP가 그대로 노출되고, 실행 단위 과금이나 구독형 판매 구조를 붙이기 어렵다.

Capafy는 이를 다음 방식으로 해결하려 한다.

1. Skill을 파일이 아니라 실행 가능한 Agent 서비스로 판매
2. Run Online 모드에서 Skill 내부 구현을 사용자에게 공개하지 않음
3. Publisher가 배포·가격·검토 과정을 Agent Client 안에서 진행
4. Buyer가 Agent Client에서 검색·구매·실행
5. 원격 Agent는 로컬에 설치되는 Thin Skill을 통해 라우팅

즉, 핵심 가치는 **Agent Skill의 배포 + IP 보호 + 수익화 + 소비를 하나의 생태계로 묶는 것**이다.

## 핵심 기능

### Capafy Publisher

Publisher의 기본 배포 흐름은 다음과 같다.

```text
Skill workspace
    ↓
publish-init
    ↓
파일/Skill 후보 확인 (Web checkpoint)
    ↓
publish-configure
    ↓
credential / secret scan
    ↓
Run Online이면 credential mapping (Web checkpoint)
    ↓
publish-ship
    ↓
최종 검토 및 제출 (Web checkpoint)
    ↓
Capafy Marketplace
```

주요 특징:

- workspace에서 `SKILL.md` 기반 Skill 후보 탐색
- Run Online / Download 배포 모드
- credential/secret 검사 및 hosted credential mapping
- 패키징 및 검증
- 로컬 publish 상태와 원격 review/listing 상태를 분리해 조회
- self-update 기능
- 계정 로그인, earnings/payout/statistics/refund/KYC 관련 흐름 지원

### Capafy User

사용자 측 흐름은 다음과 같다.

```text
Agent Client
    ↓
Capafy catalog search
    ↓
Agent 선택 / 주문
    ↓
Credits 또는 Web 결제
    ↓
┌───────────────┬───────────────┐
│ Run Online    │ Download      │
│ Thin Skill    │ Full Skill    │
└───────┬───────┴───────┬───────┘
        ↓               ↓
Cloud Agent        Local execution
```

Run Online Agent 구매 시 로컬에는 전체 Skill 대신 `capafy-agent-{agentId}` 형태의 Thin Skill이 설치된다. Thin Skill은 실제 비즈니스 로직을 담기보다 해당 cloud instance로 대화를 전달하는 라우터 역할을 한다.

User Skill은 검색, 주문, 크레딧/구독 관리, 구매 Agent 설치, 기존 인스턴스 재개 등을 담당한다.

## 아키텍처

Capafy Skills의 중요한 설계 포인트는 **Skill을 또 다른 Skill을 유통하고 호출하는 메타 레이어로 사용한다는 점**이다.

```text
Claude Code / Codex / OpenClaw / Hermes
                 │
        ┌────────┴────────┐
        │                 │
capafy-publisher     capafy-user
        │                 │
        │           Thin Skill Router
        │                 │
        └────────┬────────┘
                 │ HTTPS/API
                 ▼
           Capafy Platform
                 │
        ┌────────┴────────┐
        │                 │
 Marketplace       Cloud Agent Runtime
        │                 │
        └──── Payments / Credentials
```

### Publisher 내부

저장소에는 단순 `SKILL.md` 외에도 `packager.py`, `self_update.py`, `publish-workflow.md`, `api-docs/`, `packaging/`, `capafy_platform/` 등이 존재한다. 즉 프롬프트 지침만으로 배포하는 Skill이 아니라 Python 기반 배포 도구와 플랫폼 API를 Skill이 orchestration하는 구조다.

Publisher는 CLI의 structured JSON 결과를 host LLM이 해석하도록 설계되어 있으며 실제 target/mode/scan/stage/package/validate 등의 내부 처리는 코드가 담당한다.

### User 내부

`capafy-user`에는 `SKILL.md`, `scripts/`, `references/`, API 문서 및 HTTP helper가 포함된다. Run Online Agent에서는 전체 Skill을 내려받지 않고 Thin Skill을 설치해 원격 인스턴스로 라우팅한다.

특히 로컬 secret을 cloud instance로 자동 전송하지 못하도록 강한 금지 규칙을 두고 있다. credential이 필요한 경우 플랫폼의 seller-side credential UI 사용을 기본 경로로 요구한다.

## 판매 모델

README에 정의된 주요 판매 방식은 다음과 같다.

| 방식 | 실행 위치 | 과금 | 소스 노출 |
|---|---|---|---|
| Run Online - Subscription | Capafy 인프라 | 주/월 구독 | 비공개 |
| Run Online - Hourly | Capafy 인프라 | 시간 기반 | 비공개 |
| Download | 사용자 로컬 | 일회성 | 전체 파일 공개 |
| Free | 설정된 실행 형태 | 무료 | 해당 형태를 따름 |

Skill 제작자 입장에서는 Run Online이 IP 보호와 지속 수익화에 가장 중요한 모델이다.

## 장점

### 1. Skill의 수익화 경로

GitHub에 Skill을 무료 공개하는 것과 달리 실행 단위/구독 단위 판매가 가능하다. 전문 업무 Skill을 제품화하려는 제작자에게 명확한 경제적 동기를 제공한다.

### 2. 프롬프트와 업무 노하우 보호

Run Online 모드는 사용자에게 Skill 파일을 전달하지 않는다. 프롬프트, reference, script 등에 축적된 업무 노하우가 제품 경쟁력인 Skill에 특히 적합하다.

### 3. 기존 Agent Client를 UX로 재사용

별도 앱을 항상 열 필요 없이 Claude Code/Codex/OpenClaw의 대화 인터페이스에서 Skill 검색과 실행 흐름을 연결한다. 기존 Agent Workflow와 결합하기 쉽다는 점이 강점이다.

### 4. Thin Skill 패턴

원격 Agent마다 최소 라우터만 로컬에 설치하는 방식은 로컬 context에서 '어떤 Agent를 호출해야 하는가'를 표현하면서 실제 구현은 서버에 유지하는 실용적인 구조다.

### 5. 보안 관련 명시적 가드레일

Publisher는 credential scan/mapping 단계를 제공하며 User Skill은 로컬 secret exfiltration을 명시적으로 금지한다. Agent가 로컬 환경을 폭넓게 읽을 수 있다는 점을 고려한 설계다.

## 단점 및 한계

### 플랫폼 종속성

Run Online Agent는 Capafy API, marketplace, cloud runtime, 결제 시스템에 의존한다. Capafy 서비스 상태나 정책 변화가 Agent 사용 가능성과 제작자 수익에 직접 영향을 준다.

### 신생 생태계 리스크

저장소의 최근 확인 커밋은 2026-07-27의 `update publisher-skill 0.9.5`다. 버전 표기와 현재 구조를 보면 빠르게 개발 중인 단계로 보는 것이 적절하며, 장기 운영 안정성·시장 규모·실제 판매자 수익 사례는 별도 검증이 필요하다.

### 원격 실행의 보안/컴플라이언스

Run Online은 업무 데이터를 외부 인프라로 전송할 가능성이 있다. 회사 코드, 문서, 개인정보가 포함되는 Enterprise 환경에서는 데이터 저장 위치, retention, subprocess/tool 권한, tenant isolation, audit log 등을 추가 검증해야 한다.

### 비용 구조 확인 필요

Marketplace 수수료, cloud runtime 원가, 실제 hourly/subscription 가격 경쟁력과 대규모 사용 시 비용은 저장소 코드만으로 충분히 평가하기 어렵다.

### Windows/Enterprise 운영성

Skill 자체에는 Windows에서 self-update 중 파일 lock을 처리하는 로직이 언급되어 있어 Windows를 고려한 흔적은 있다. 다만 사내 proxy, SSO, private network, endpoint security 환경에서의 실제 호환성은 확인되지 않았다.

## 활용 사례

### Skill 제작자의 수익화

특정 업무에서 반복적으로 좋은 결과를 내는 Skill을 보유했다면 Run Online Agent로 배포하여 내부 프롬프트를 공개하지 않고 판매할 수 있다.

예:

- 코드 리뷰/아키텍처 리뷰 Skill
- UX/UI 평가 Skill
- 문서 품질 검수 Skill
- 특정 도메인 Research Agent
- CI/CD 장애 분석 Agent
- 업무 문서 생성/변환 Skill

### 조직 내부 Skill Marketplace 아이디어

Capafy의 구조는 외부 marketplace 자체보다 **사내 Skill Registry/Marketplace 설계 참고 사례**로도 가치가 있다.

```text
Internal Skill Registry
      ↓
Skill metadata + pricing 대신 권한/비용센터
      ↓
Thin Skill
      ↓
Internal Agent Runtime
      ↓
Claude Code / Codex
```

기업에서는 결제를 권한·quota·비용센터로 치환하면 내부 전문가의 Skill을 조직 전체에 배포하는 구조로 응용할 수 있다.

## 기존 방식과 비교

| 방식 | 배포 | IP 보호 | 실행 위치 | 수익화 |
|---|---|---|---|---|
| GitHub 공개 Skill | 파일 공유 | 낮음 | 로컬 | 거의 없음 |
| 사내 Skill 저장소 | 파일/패키지 | 조직 내부 | 로컬/사내 | 내부 비용 처리 |
| MCP 서비스 | Tool API | 서버 구현 보호 가능 | 서버 | 별도 구축 필요 |
| Capafy Run Online | Marketplace + Thin Skill | 높음 | Capafy Cloud | 기본 제공 |
| Capafy Download | Marketplace | 낮음 | 로컬 | 일회성 판매 |

Capafy는 MCP marketplace라기보다 **Agent Skill을 SaaS처럼 판매하기 위한 distribution/runtime layer**에 가깝다.

## 활용 아이디어

### 바로 적용 가능

- 공개 가능한 개인 Skill이 있다면 Publisher의 패키징/secret scan 구조 참고
- Thin Skill을 이용한 remote Agent routing 패턴 연구
- `SKILL.md + Python CLI + structured JSON` 방식의 Skill 설계 참고

### PoC 가치 있음

- 개발 생산성 Skill 하나를 Run Online으로 게시해 실제 배포 UX와 비용 측정
- Claude Code와 Codex에서 동일 Skill의 cross-client 호환성 테스트
- Thin Skill이 context/token 사용량에 미치는 영향 측정
- Agent의 세션 resume 및 remote state 관리 방식 분석

### 아이디어 참고

- 사내 Agent Skill Registry
- 조직 전문가가 만든 Skill의 인증/검수 체계
- Skill versioning + hosted runtime
- Skill별 quota/사용량/성과 측정
- 내부 Agent marketplace 및 자동 라우팅

### 현재 도입 가치 낮음

민감한 사내 코드와 데이터를 외부 cloud Agent에 전달하는 업무는 Enterprise 보안·데이터 정책이 명확히 검증되기 전까지 바로 도입하기 어렵다.

## 실무 평가

**관찰 가치: 높음 / 개인 PoC 가치: 중상 / Enterprise 즉시 도입: 낮음**

Capafy에서 가장 흥미로운 부분은 판매 기능 자체보다 `Skill → Marketplace → Thin Skill → Remote Agent Runtime`으로 이어지는 구조다. Agent Skill이 단순 프롬프트 파일을 넘어 배포·검색·결제·실행·업데이트 가능한 소프트웨어 단위로 발전할 때 필요한 구성요소를 비교적 구체적으로 보여준다.

특히 Agent Workflow/Harness를 운영하는 관점에서는 Thin Skill 라우팅과 structured CLI 기반 orchestration이 재사용 가치가 높다. 반면 실제 외부 서비스 도입은 플랫폼 성숙도와 Enterprise 데이터 처리 조건을 더 확인한 뒤 판단하는 것이 적절하다.

## 결론

Capafy Skills는 **Agent Skill을 위한 앱스토어 + SaaS 실행 레이어**라는 방향을 구현한 프로젝트다. Skill 제작자에게는 IP를 숨긴 채 판매할 방법을, 사용자에게는 기존 Agent Client에서 전문 Skill을 구매해 사용하는 방법을 제공한다.

현재 단계에서는 Capafy 자체를 핵심 업무 인프라로 채택하기보다, Skill 생태계가 향후 어떻게 배포·수익화·원격 실행될 수 있는지를 보여주는 선행 사례로 보는 가치가 더 크다.

## 참고 자료

- Repository: https://github.com/Capafy/Capafy-skills
- Website: https://capafy.ai
- Publisher Skill: https://github.com/Capafy/Capafy-skills/blob/main/capafy-publisher/SKILL.md
- User Skill: https://github.com/Capafy/Capafy-skills/blob/main/capafy-user/SKILL.md
