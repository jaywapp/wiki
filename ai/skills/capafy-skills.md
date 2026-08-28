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
  - monetization
source: https://github.com/Capafy/Capafy-skills
updated: 2026-08-29
---

# Capafy Skills

> Agent Skill을 단순 파일 공유물이 아니라 **검색·결제·클라우드 실행·IP 보호·버전 관리가 가능한 상품**으로 만드는 Skill 기반 Agent Marketplace.

## 프로젝트 개요

Capafy는 Skill 기반 AI Agent Marketplace다. 제작자는 `SKILL.md`와 scripts/references/assets 등으로 구성된 재사용 가능한 Skill을 완성형 Agent로 등록하고, 사용자는 웹 또는 Claude Code·Codex·OpenClaw·Hermes 같은 Agent Client에서 이를 검색·구매·실행한다.

플랫폼 운영사는 싱가포르 법인 `CAPAFY PTE. LTD.`이며 Publisher Agreement/Privacy Policy v1.1은 2026-08-08 시행 기준이다.

공개 GitHub 저장소 `Capafy/Capafy-skills`는 2026-05-22 생성되었고 2026-08-29 조사 시점 기준 Python 중심, MIT License, 36 stars, 4 forks다. 정식 GitHub Release는 없으며 마지막 공개 코드 push는 2026-07-27 `publisher-skill 0.9.5` 업데이트다.

## 해결하려는 문제

Agent Skill 생태계에서 좋은 Skill은 프롬프트 하나가 아니라 지침, reference, script, decision rule, example, domain knowledge의 묶음이다. 그러나 GitHub 등에 공개하면 핵심 노하우가 복제되기 쉽고, 비공개로 유지하면 검색·배포·과금·업데이트가 어렵다.

Capafy는 다음 문제를 한 플랫폼에서 해결하려 한다.

1. Skill discovery와 Agent Card
2. 결제 및 정산
3. Run Online을 통한 소스/IP 비공개 실행
4. Download 방식의 로컬 Skill 판매
5. Agent Client에서의 검색·구매·실행
6. 원격 Agent를 로컬 Skill처럼 다루는 Thin Skill
7. credential/secret 처리와 배포 검토
8. 세션 유지, 구독, 환불, 리뷰

핵심은 **Skill을 소스 파일이 아니라 서비스 가능한 소프트웨어 상품 단위로 승격하는 것**이다.

## 사용자 경험

Capafy Agent는 두 경로로 사용할 수 있다.

### Web

`capafy.ai`에서 Agent를 검색·구매하고 웹 채팅에서 즉시 실행한다. 별도 Agent Client가 필요 없다.

### Agent Client

`capafy-user`를 Claude Code/Codex/OpenClaw 등에 설치한다. 사용자가 자연어로 필요한 Agent를 찾으라고 하면 Skill이 카탈로그 검색, 구매 및 실행 흐름을 연결한다.

```text
User
 ↓
Claude Code / Codex / OpenClaw / Hermes
 ↓
capafy-user
 ↓
Marketplace Search
 ↓
Purchase
 ↓
Thin Skill / Download Skill
 ↓
Execution
```

## 실행 모델

### Run on Capafy

Skill은 Capafy Cloud에서 실행되고 사용자는 결과만 받는다. 소스 코드와 프롬프트는 노출되지 않는다. Publisher가 기반 모델을 정하며 사용자가 모델을 변경할 수 없다.

### Download

전체 Skill Package가 사용자에게 전달된다. `SKILL.md`, scripts, references, assets 등이 포함될 수 있으며 로컬 Agent Client에서 실행한다. 이 경우 구매자가 소스 전체에 접근할 수 있다.

## Thin Skill Architecture

Run Online Agent를 Agent Client에서 사용할 때 핵심은 Thin Skill이다.

```text
Local Agent Client
      │
      ▼
capafy-agent-{agentId}
   Thin Skill
      │
      │ conversation / routing
      ▼
Capafy Cloud Instance
      │
      ▼
Private Full Skill
      │
      ▼
Model + Tools + External Services
```

Thin Skill에는 전체 business logic이 없다. 원격 Agent instance로 대화를 전달하는 routing entry point 역할을 한다. 따라서 로컬 Agent는 일반 Skill처럼 해당 capability를 인식하지만 제작자의 핵심 Skill 파일은 서버에 유지된다.

이 패턴은 Capafy에서 가장 재사용 가치가 높은 아키텍처다.

## Publisher 구조

공개 저장소에는 `capafy-publisher`와 `capafy-user`가 있다. Publisher는 단순 prompt Skill이 아니라 Python CLI와 플랫폼 API를 host LLM이 orchestration하는 형태다.

주요 구성:

- `SKILL.md`
- `publish-workflow.md`
- `packager.py`
- `self_update.py`
- `api-docs/`
- `packaging/`
- `capafy_platform/`

기본 흐름:

```text
Workspace
 ↓
publish-init
 ↓
Skill candidate discovery
 ↓
Web: 파일 및 mode 확인
 ↓
publish-configure
 ↓
credential / secret scan
 ↓
Web: credential mapping
 ↓
publish-ship
 ↓
validation + packaging + upload
 ↓
Web: final audit / submit
 ↓
Marketplace Review
```

Publisher CLI는 structured JSON을 반환하고 host LLM이 `status`, `requires_action`, `review_url`, blocking reason 등을 해석한다. 즉 자연어 Agent가 모든 로직을 직접 수행하는 것이 아니라 deterministic Python tooling을 감싼 구조다.

Self-update는 manifest의 SHA-256 검증을 수행하고 Windows file-lock 상황까지 별도로 고려한다.

## User Skill 구조

`capafy-user`는 다음을 담당한다.

- Marketplace 검색
- Agent 상세 조회
- Credits/Card 구매 흐름
- subscription 관리
- Download Agent 설치
- Thin Skill 설치 및 routing
- 기존 cloud instance resume
- 계정/잔액/주문 조회

User Skill에는 **Local Secret Exfiltration Hard Prohibition**이 명시되어 있다. `.env`, API key/token/password, AWS/GCP/Azure credential, SSH/config, IDE Agent 설정 등 로컬 secret을 읽어 cloud Agent에 자동 전송해서는 안 된다.

## 가격 및 수익 모델

사용자 가격 모델은 세 가지다.

| 모델 | 실행 | 결제 | 소스 |
|---|---|---|---|
| Hourly | Capafy Cloud | 사용 시간 선결제 | 비공개 |
| Subscription | Capafy Cloud | 일/주/월 자동 갱신 | 비공개 |
| One-Time Purchase | Local | 일회성 | 전체 Skill 제공 |

Hourly는 결제 완료 순간부터 시간이 계산된다. 종료 후 7일 grace period 동안 instance와 대화 상태가 유지되어 같은 Agent를 다시 구매하면 이어서 사용할 수 있다.

Subscription은 기간 동안 cloud instance가 유지되고 자동 갱신된다.

One-Time Purchase는 유료 또는 무료로 제공 가능하다.

## 결제 및 정산

Capafy는 카드와 Credits를 지원한다. 카드 처리는 Stripe를 사용한다. US$5 미만 거래는 Credits 결제가 요구된다. Credits는 만료되지 않지만 환불·출금·사용자 간 이전이 불가능하다.

Publisher Agreement v1.1 기준:

- Platform Fee: **20%**
- Hourly payout = Net Transaction Amount - 20% Platform Fee
- Download payout = Net Transaction Amount - 20% Platform Fee
- Subscription은 먼저 Platform Sandbox Fee를 차감한 뒤 나머지 금액에 20% Platform Fee 적용
- 정산 계산 통화: USD
- 월 단위 정산
- 익월 15일 이후 payout 시작
- 최소 payout: US$100
- refund/chargeback/compliance/KYC 상황에서는 payout hold 가능

Subscription Sandbox Fee의 실제 금액은 Publisher Console에서 공개하며 고정 수치는 문서에서 확인되지 않는다.

## Marketplace 품질 관리

Skill은 listing 전에 review를 거친다. 구매 후 실제 사용 경험이 있는 사용자만 review/rating을 남길 수 있도록 정책이 존재한다.

사용자 refund request window는 구매 후 7일이다. Capafy가 최종 환불 여부를 검토한다.

보안 문제로 Agent가 제거될 경우 접근을 즉시 제한하고 미사용 부분을 Credits로 비례 환불할 수 있다.

## 데이터 및 보안

Privacy Policy v1.1 기준 Capafy는 플랫폼 데이터에 대해 전송 중/저장 시 암호화, 접근 통제, 정기 보안 검토를 명시한다. 직원의 raw interaction data 접근은 제한되며 분쟁/감사 시 이중 승인을 요구한다고 설명한다.

Capafy는 개인정보를 광고주/데이터 브로커에게 판매하지 않고 사용자 AI interaction을 Capafy 자체 모델 학습에 사용하지 않는다고 밝힌다. 다만 Publisher가 선택한 외부 LLM/서비스가 데이터를 어떻게 처리하는지는 각 Agent의 data-flow declaration과 해당 서비스 정책을 확인해야 한다.

주요 보존 기간:

| 데이터 | 보존 |
|---|---|
| 계정 기본 정보 | 계정 폐쇄 후 2년 |
| 거래/주문 기록 | 거래 후 7년 |
| Publisher KYC | 계정 폐쇄 후 5년 |
| Publisher 금융 기록 | 지급 후 7년 |
| Cloud instance execution log | instance 정리 후 90일 |

데이터는 싱가포르 및 서비스 제공자/Publisher가 선택한 외부 서비스가 운영되는 다른 국가에서 처리될 수 있다.

따라서 Enterprise에서 '암호화되어 있으니 안전하다'고 판단하기에는 부족하다. Agent별 외부 서비스, 데이터 residency, DPA, retention, audit, tenant isolation을 별도로 확인해야 한다.

## 프로젝트 성숙도

2026-08-29 조사 기준 공개 저장소는 36 stars/4 forks 규모이고 정식 GitHub Release가 없다. 공개 코드의 마지막 push는 2026-07-27이다.

현재 공개 Issue #1에서는 외부 credential이 전혀 필요 없는 Download Agent도 최종 submission 단계에서 `requiredCredentials.url_proxy`를 요구해 review 제출이 막히는 문제가 재현되어 있다. 2026-08-22 등록 후 조사 시점까지 open 상태다.

이는 Marketplace 자체가 동작하지 않는다는 의미는 아니지만 Publisher workflow와 backend validation 사이에 아직 edge-case가 존재한다는 실증 사례다.

따라서 **기능적으로는 이미 실제 marketplace/결제/정책 체계를 갖췄지만 ecosystem과 tooling은 초기 성장 단계**로 평가하는 것이 적절하다.

## 공개된 수익 사례 주장

Capafy Publisher 페이지는 최근 30일 수익 사례로 다음 수치를 제시한다.

- KOL Hunter Pro: US$10,000+/month
- Financial Report Analyst: US$5,000+/week
- SEO Content Planner: US$1,000+/week

다만 이는 Capafy 자체 마케팅 페이지의 주장이다. 독립적인 거래 내역이나 제3자 검증 자료는 이번 조사에서 확인하지 못했으므로 **실제 수익 사례로 참고하되 검증된 benchmark로 취급하면 안 된다.**

## 장점

### Skill IP 보호

Run Online은 prompt/script/reference를 사용자에게 전달하지 않는다. 전문 노하우 자체가 경쟁력인 Skill에 중요하다.

### Skill 수익화 인프라

결제·subscription·refund·payout·KYC·review를 직접 구현하지 않아도 된다.

### Agent-native Marketplace

웹뿐 아니라 Agent Client 내부에서 자연어로 다른 Agent를 검색·구매·호출하는 구조를 제공한다. 사람이 App Store를 탐색하는 모델에서 Agent가 capability를 동적으로 발견하는 모델로 확장될 수 있다.

### Thin Skill

Capability metadata/routing만 로컬에 두고 실제 구현을 원격에 두는 구조는 Skill distribution과 IP 보호를 동시에 해결한다.

### Deterministic Tooling 결합

Publisher가 LLM prompt만으로 패키징하지 않고 Python CLI/structured JSON으로 배포 작업을 수행하는 점은 신뢰성 측면에서 좋은 설계다.

## 단점 및 리스크

### Vendor Lock-in

Run Online은 Capafy marketplace, runtime, billing, session state에 강하게 의존한다.

### 20% 수수료

Marketplace discovery와 infrastructure를 제공하지만 20%는 자체 판매 채널이 있는 제작자에게는 상당한 비용이다. Subscription에는 Sandbox Fee도 추가된다.

### 외부 데이터 처리

Agent마다 Publisher가 선택한 LLM/API가 다를 수 있다. Capafy 자체 보안 정책만 확인해서는 전체 data flow를 평가할 수 없다.

### 품질 편차

Marketplace 구조상 Agent 품질은 Publisher마다 다르다. review/sales history가 중요하다.

### Download Agent 위험

다운로드 후에는 Capafy가 실행을 통제하거나 관찰할 수 없다. 민감한 환경에서는 sandbox/container에서 검증 후 사용하는 것이 적절하다.

### 초기 생태계

GitHub 규모, Release 부재, 실제 open bug 등을 보면 아직 mature infrastructure로 보기는 어렵다.

## 기존 방식과 비교

| 방식 | Discovery | IP 보호 | Runtime | Monetization |
|---|---|---|---|---|
| GitHub Skill | GitHub | 낮음 | Local | 없음/별도 |
| 사내 Skill Repo | 내부 검색 | 조직 내부 | Local/Internal | 비용센터 |
| MCP Server | 별도 Registry 필요 | 높음 | Server | 직접 구현 |
| SaaS Agent | 웹 서비스 | 높음 | Vendor Cloud | 서비스별 |
| Capafy Run Online | Marketplace | 높음 | Capafy Cloud | 내장 |
| Capafy Download | Marketplace | 낮음 | Local | 내장 |

Capafy는 단순 Skill repository가 아니라 **Skill Marketplace + Hosted Runtime + Billing + Agent-to-Agent Distribution Layer**다.

## 실무 활용 아이디어

### 바로 적용 가능

- Publisher의 `SKILL.md + deterministic CLI + structured JSON` 설계 참고
- secret scan/credential mapping workflow 참고
- Skill self-update/versioning 구조 참고

### PoC 가치 높음

- 실제 작은 Skill을 Publisher로 등록해 end-to-end 배포 경험 측정
- Claude Code/Codex 양쪽에서 같은 Capafy Agent 호출 테스트
- Thin Skill의 context/token overhead 측정
- Cloud Agent session resume 동작 검증
- Hourly 과금 시 실제 runtime/token cost 대비 margin 계산

### 사내 AX에 특히 참고할 부분

Capafy의 구조에서 결제 부분을 제거하면 내부 Skill Platform으로 전환하기 쉽다.

```text
Internal Skill Registry
       │
       ├─ owner / version / review
       ├─ permission / team
       ├─ usage / quota / cost center
       ▼
Thin Skill / Capability Descriptor
       ▼
Internal Agent Gateway
       ▼
Agent Runtime Pool
       ├─ Claude
       ├─ Codex
       ├─ Internal Model
       └─ MCP / Tools
```

이를 통해 사내 전문가가 만든 Skill을 중앙에서 검수·버전 관리하고 개발자는 Claude Code/Codex에서 필요한 capability를 동적으로 가져오는 구조를 만들 수 있다.

## 실무 평가

| 항목 | 평가 |
|---|---|
| 아이디어 | ★★★★★ |
| Skill 생태계 방향성 | ★★★★★ |
| 개인 PoC | ★★★★☆ |
| 수익화 실험 | ★★★★☆ |
| 프로젝트 성숙도 | ★★★☆☆ |
| Enterprise 즉시 도입 | ★★☆☆☆ |
| 사내 AX 아키텍처 참고 | ★★★★★ |

Capafy의 핵심 가치는 단순히 'Skill을 돈 받고 판다'가 아니다. **Skill이 앞으로 소프트웨어 배포 단위가 된다면 필요한 Registry, Review, Runtime, Secret, Billing, Session, Routing을 하나의 모델로 보여준다는 것**이 더 중요하다.

특히 Thin Skill은 Agent가 다른 전문 Agent를 capability처럼 동적으로 연결하는 구조이므로 Agent Harness/Skill Registry 설계에서 연구 가치가 높다.

## 결론

Capafy는 현재 가장 명확하게 **Agent Skill Economy**를 제품화하려는 프로젝트 중 하나다. GitHub에서 Skill을 공유하는 단계를 넘어 Skill을 SaaS처럼 실행하고, IP를 보호하고, 구매하고, Agent Client에서 다시 호출할 수 있게 한다.

현재 공개 자료상 marketplace·결제·정산·refund·privacy·publisher review 등 상용 서비스에 필요한 구성요소는 상당 부분 갖추고 있다. 반면 공개 개발 생태계는 아직 작고 Publisher edge-case도 남아 있다.

따라서 현재 판단은 다음과 같다.

**개인 Skill 수익화 실험 → 해볼 가치 높음**  
**Agent Skill Architecture 연구 → 매우 높은 가치**  
**민감한 Enterprise 업무 즉시 도입 → 보류**  
**사내 Skill Marketplace 설계 참고 → 강력 추천**

## 참고 자료

- Repository: https://github.com/Capafy/Capafy-skills
- Website: https://capafy.ai
- User Help Center: https://capafy.ai/help-center
- Publisher Guide: https://capafy.ai/developer/doc
- Publisher Agreement: https://capafy.ai/publisher-agreement
- Privacy Policy: https://capafy.ai/privacy-policy
- Publisher/Earn: https://capafy.ai/earn
- Review Guidelines: https://capafy.ai/review-guidelines
- GitHub Issue #1: https://github.com/Capafy/Capafy-skills/issues/1
