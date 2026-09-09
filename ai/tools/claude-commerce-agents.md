---
title: Claude Commerce Agents
category: tools
tags:
  - ai
  - agent
  - claude
  - commerce
  - agent-sdk
  - mcp
source: https://github.com/anthropics/commerce-agents
updated: 2026-09-04
---

# Claude Commerce Agents

> Anthropic이 공개한 커머스용 Claude 에이전트 레퍼런스 구현으로, 고객용 Shopping Agent와 운영자용 Merchant Agent를 동일한 prompt·skills·tool contract·gate 설계 위에서 Messages API, Claude Agent SDK, Managed Agents에 배포하는 구조를 보여준다.

## 프로젝트 개요

`anthropics/commerce-agents`는 완성형 쇼핑몰 제품이라기보다 **실서비스형 commerce agent를 어떻게 설계해야 하는지 보여주는 reference architecture**다.

두 역할을 제공한다.

- **Shopping Agent**: 상품 검색·비교·추천·계획·장바구니·주문/정책 질의·고객 메모리
- **Merchant Agent**: 매출/성과 분석·상품 listing 관리·재고·가격/프로모션·캠페인 초안

Retail, Travel, Telecom, Entertainment 네 vertical 예제가 있고, 동일한 core를 Messages API, Agent SDK, Managed Agents 세 runtime으로 실행할 수 있다.

Apache-2.0 라이선스지만 README는 이 저장소를 reference implementation으로 명시하며 유지보수 및 외부 contribution을 받지 않는다고 밝힌다.

## 해결하려는 문제

일반적인 LLM 기반 상거래 assistant는 대화 자체보다 실제 시스템과 연결되는 순간 어려워진다.

- 모델이 보지 않은 상품 ID를 임의로 수정할 수 있음
- 가격·재고·주문처럼 실제 데이터가 필요한 답변의 grounding 문제
- Prompt Injection을 포함한 외부 데이터 신뢰 문제
- 결제나 가격 변경처럼 위험한 action의 승인 경계
- Agent runtime마다 안전장치가 달라지는 문제
- 기존 catalog/cart/order/analytics 시스템과의 통합 문제

Commerce Agents의 핵심 접근은 **안전성과 business boundary를 prompt가 아니라 tool execution layer에 최대한 코드로 강제**하는 것이다.

## 핵심 기능

### 1. Shopping Agent

주요 흐름은 skill로 정의되며 catalog, cart, order, policy backend를 사용한다.

대표 기능:

- 상품 검색 및 비교
- 구매 계획
- 장바구니 구성
- 주문/정책 질의
- 사용자 메모리
- UI presentation payload 생성
- checkout handoff

중요하게도 agent 자체는 결제나 주문을 실행하지 않는다. Checkout은 host application이 완료하도록 넘긴다.

### 2. Merchant Agent

운영자 업무를 위한 agent다.

- 성과 설명 및 분석
- Listing 수정
- 재고 대응
- 가격 및 프로모션 변경
- Campaign draft
- Pending change 관리

쓰기 작업은 바로 실행되지 않고 `stage -> approval -> apply` 구조를 따른다.

### 3. 동일 Agent Definition, 여러 Runtime

핵심 prompt, skill, tool contract, gate는 한 번 정의하고 다음 실행 방식에서 재사용한다.

- Messages API
- Claude Agent SDK
- Managed Agents + MCP

따라서 runtime을 바꾸더라도 domain rule과 tool safety layer를 유지할 수 있다.

### 4. Claude Code Commerce Builder Plugin

저장소에는 `commerce-builder` Claude Code plugin도 포함된다.

주요 command:

- `/scaffold-commerce-agent`
- `/add-commerce-flow`
- `/author-commerce-evals`
- `/review-commerce-agent`

즉 이 저장소 자체가 reference code이면서, 이를 기반으로 자신의 commerce agent를 생성/검토하는 개발 도구 역할도 한다.

## 아키텍처

```text
                    Host Application
                          │
               session / auth / approval
                          │
              ┌───────────┴───────────┐
              │                       │
       Shopping Agent           Merchant Agent
              │                       │
      prompt + skills           prompt + skills
      tool contracts            tool contracts
      provenance gates          change guardrails
              │                       │
              └───────────┬───────────┘
                          │
                  commerce-common
       fencing / memory / grounding / executor
          presentation / events / delegation
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
 Messages API       Claude Agent SDK    Managed Agents
                                             │
                                             MCP
                          │
                  Backend Interface
          StorefrontBackend / MerchantBackend
                          │
      catalog / cart / order / analytics / pricing
                 enterprise systems
```

### 주요 컴포넌트

`commerce-common/`
: 두 agent가 공유하는 fencing, memory, skill loading, grounding, presentation, executor, event 처리.

`shopping-agent/core/`
: Shopping Agent prompt, type, backend interface, tool contract, provenance gate.

`merchant-agent/core/`
: Merchant Agent prompt, backend interface, staged change, guardrail, approval gate.

`runtime-messages-api/`
: Anthropic Messages API 기반 turn loop.

`runtime-agent-sdk/`
: Claude Agent SDK가 agent loop를 담당하는 구현.

`managed-agents/`
: Managed Agents manifest 및 MCP server.

`examples/`
: retail/travel/telecom/entertainment vertical 및 storefront/merchant portal.

## 실행 흐름

### Shopping

```text
User
 ↓
Dynamic context + fenced external data
 ↓
Claude
 ↓
Tool Call
 ↓
Provenance / limit / grounding gate
 ↓
StorefrontBackend
 ↓
Catalog / Cart / Order / Policy system
 ↓
Validated result / UI
 ↓
Claude response
```

장바구니 쓰기는 현재 session에서 catalog/order tool이 실제 반환했던 product id 또는 기존 cart line만 허용한다.

### Merchant

```text
Operator request
 ↓
Read / analysis
 ↓
Claude proposes action
 ↓
stage_* tool
 ↓
Provenance + guardrails
 ↓
Pending Change
 ↓
Host Approval
 ↓
apply_change
 ↓
Guardrail re-check
 ↓
MerchantBackend
```

가격·재고·listing 등의 write를 LLM의 단일 판단으로 실행하지 않는 것이 핵심이다.

## Safety 설계에서 주목할 부분

이 프로젝트에서 가장 참고 가치가 높은 부분이다.

### Fencing

외부/third-party text를 고정 fence 내부에 넣고 invisible/control character, forged turn marker, tool-call tag 등을 제거한다. Prompt injection에 대한 방어 경계를 runtime에 둔다.

### Provenance Gate

모델이 임의 ID를 만들어 action하지 못하게 한다.

- cart write: 현재 session에서 확인된 상품만
- merchant write: 확인된 listing/campaign만
- apply/discard: session에서 확인된 staged change만

### Grounding

정책, 주문 후 질문, 성과 분석 등 특정 요청은 모델이 답하기 전에 read tool을 강제하거나 prefetch한다.

### Guardrails

Merchant 변경에는 다음과 같은 cap을 코드로 적용한다.

- 한 change의 item 수
- 가격 변경 폭
- promotion depth
- restock size
- campaign budget
- protected field

그리고 stage 시점뿐 아니라 apply 시점에도 다시 검사한다.

### Human Approval

기본 설정에서는 `apply_change` 전에 host approval이 필요하다. 대화에서 사용자가 '승인'이라고 말하는 것과 실제 host approval mark를 구분한다.

### No Payment Boundary

Agent에 payment/order placement method 자체를 제공하지 않는다. Checkout URL도 backend/host가 처리하며 모델이 직접 payment credential을 다루지 않는다.

## Backend / MCP 관계

Commerce Agents는 특정 commerce SaaS용 connector를 내장하지 않는다.

대신 deployment가 다음 interface를 구현한다.

- `StorefrontBackend`
- `MerchantBackend`

실제 Shopify류 commerce platform, 사내 catalog, analytics warehouse, payment system 등은 backend method 내부에서 server-side로 호출한다.

Managed Agents에서는 role MCP server를 사용하며, 외부 platform MCP를 함께 mount할 수 있다. 중요한 점은 외부 MCP를 직접 agent에게 노출하기보다 provenance/guardrail boundary를 유지하도록 backend 또는 role server 뒤에 배치하는 설계다.

## 장점

### 실서비스 Agent Safety의 구체적인 예제

'프롬프트에 조심하라고 적기'가 아니라 provenance, caps, approval, fencing을 코드로 구현한 사례다. Commerce 외의 enterprise agent에도 그대로 응용할 수 있다.

### Core와 Runtime 분리

Agent definition과 execution runtime을 분리해서 Messages API → Agent SDK → Managed Agents 전환 시 domain logic을 재사용한다.

### Human-in-the-loop 패턴이 명확함

Merchant Agent의 staged change 패턴은 DevOps, 코드 변경, Perforce, CI/CD, 사내 운영 자동화에도 매우 잘 맞는다.

### Backend 추상화

모델이 credential이나 내부 시스템 세부사항을 직접 다루지 않고 server-side backend가 처리한다.

### 실제 vertical 예제

단순 toy chatbot이 아니라 retail/travel/telecom/entertainment의 서로 다른 business constraint를 보여준다.

## 단점 및 한계

### 아직 매우 초기 상태

2026-09-04 조사 기준 repository history는 사실상 2026-08-31의 초기 공개 commit 한 건으로 확인된다. Release도 없고 공개 Issue도 없다. 프로젝트 성숙도나 장기 API 안정성을 기대하기 어렵다.

### Maintained Product가 아님

Anthropic README 자체가 reference implementation이며 maintained project가 아니고 contribution도 받지 않는다고 명시한다. 따라서 dependency처럼 직접 의존하기보다 설계 패턴과 코드를 가져와 자체 관리하는 접근이 적합하다.

### Business Logic은 직접 구현해야 함

Fraud, authorization, pricing, eligibility, inventory consistency 등의 실제 규칙은 deployment 책임이다. Reference gate가 비즈니스 안전성을 대신 보장하지 않는다.

### 인증이 예제 수준

Demo route에는 실제 authentication이 없다. MCP server도 production에서는 authenticating gateway가 필요하다.

### Runtime별 기능 차이

Grounding, analysis budget, memory extraction 등 일부 기능은 Messages API / Agent SDK / Managed Agents에서 동일하지 않다. '동일 definition'이라고 해도 runtime behavior가 완전히 동일한 것은 아니다.

### Claude 생태계 의존

Messages API, Claude Agent SDK, Managed Agents, Claude Code plugin을 중심으로 설계되어 있다. Core safety pattern은 이식 가능하지만 repository를 그대로 사용하면 Anthropic stack에 대한 vendor lock-in이 크다.

### Token / Cost

정확한 benchmark 비용은 제공되지 않는다. Grounding read, tool loop, memory extraction, merchant analysis delegate가 추가 model/tool call을 만들 수 있으므로 단순 chat보다 비용이 증가한다. 반면 prompt prefix caching을 고려한 구조와 cache usage 확인 방법은 제공한다.

### Windows / Enterprise

Quick Start는 Unix shell 명령을 중심으로 설명된다. Python/Node 기반이라 Windows 이식 자체는 어렵지 않겠지만 enterprise Windows 환경에서의 공식 검증 수준은 확인되지 않는다.

## 활용 사례

### Commerce

- 쇼핑몰 AI 구매 assistant
- 여행 상품 itinerary agent
- 통신 요금제 추천
- 티켓 검색/hold/waitlist assistant
- 상품 운영/재고/가격 assistant

### Commerce 외 Enterprise Agent

구조적으로 더 흥미로운 활용은 다음과 같다.

- CI/CD 변경 Agent
- Perforce operation Agent
- 인프라 운영 Agent
- 사내 관리자 Agent
- 데이터 수정 Agent
- 배포 승인 Agent

`read -> propose -> stage -> human approval -> apply -> verify` 패턴을 그대로 재사용할 수 있다.

## 기존 방식과 비교

| 방식 | Action 안전성 | 시스템 통합 | Human approval | Runtime 독립성 |
|---|---|---|---|---|
| 단순 LLM + API tool | Prompt 의존이 큼 | 직접 연결 | 별도 구현 | 낮음 |
| MCP tool 직접 노출 | MCP 구현에 따라 다름 | 쉬움 | 서버별 상이 | 중간 |
| Commerce Agents 패턴 | Executor/Gate에서 강제 | Backend abstraction | Staged change 기본 | Core/runtime 분리 |

이 프로젝트의 차별점은 새로운 agent algorithm보다 **tool boundary와 action governance를 architecture의 중심으로 둔 것**이다.

## 활용 아이디어

### 바로 적용 가능 — Agent Action Gate 패턴

사내 Agent가 Perforce, TeamCity, 파일 시스템 등에 write할 때 다음 구조를 가져올 가치가 높다.

```text
Agent
  ↓
Tool Contract
  ↓
Provenance Gate
  ↓
Policy / Limit Guardrail
  ↓
Stage
  ↓
Human Approval
  ↓
Execute
  ↓
Verify
```

특히 모델이 이전 read에서 실제 확인한 changelist/project/build id만 write 대상으로 허용하는 provenance 방식은 안전한 enterprise automation에 적합하다.

### PoC 가치 있음 — Runtime Adapter 구조

하나의 Agent Core를 Claude Messages API, Claude Agent SDK, 다른 harness에서 공통으로 사용할 수 있도록 분리하는 패턴은 자체 AI Harness 설계에 참고할 가치가 높다.

```text
Agent Definition
 ├─ Prompt
 ├─ Skills
 ├─ Tool Contracts
 └─ Gates
      ↓
 Runtime Adapter
 ├─ Claude API
 ├─ Claude Agent SDK
 └─ Internal Harness
```

### PoC 가치 있음 — Approval-aware Agent

코드/배포/Perforce 작업을 agent가 바로 실행하지 않고 change object를 생성하여 UI dashboard에서 승인한 뒤 실행하는 구조는 운영 안전성과 관찰성을 동시에 개선할 수 있다.

### 아이디어 참고 — Fenced Context

Issue, log, source file, 웹 문서 등 외부 텍스트를 agent system instruction과 명확히 분리하고 sanitation + size cap을 적용하는 방식은 prompt injection 방어 layer로 참고할 만하다.

## 프로젝트 성숙도

2026-09-04 기준 확인 내용:

- 공개 저장소
- Apache-2.0
- 최초/최근 확인 commit: 2026-08-31
- GitHub Release 없음
- 공개 Issue 없음
- Anthropic이 maintained reference가 아니라고 명시

따라서 **라이브러리 채택보다는 reference architecture 연구 대상으로 보는 것이 적절하다.**

## 결론

Claude Commerce Agents의 핵심 가치는 commerce 기능 자체보다 **'실제 시스템을 변경하는 Agent를 어떻게 안전하게 설계할 것인가'에 대한 Anthropic의 구체적인 reference implementation**이라는 점이다.

특히 다음 네 가지가 중요하다.

1. Prompt/Skill과 Runtime의 분리
2. Provenance 기반 Tool Gate
3. Stage → Human Approval → Apply 패턴
4. Backend abstraction을 통한 credential/system boundary

Enterprise AI/AX 관점에서는 commerce agent를 그대로 도입하기보다 이 구조를 **사내 Agent Harness의 action governance layer 설계 참고자료**로 활용하는 가치가 더 크다.

평가: **PoC 가치 높음 / 아키텍처 참고 가치 매우 높음 / 직접 production dependency 채택은 아직 낮음**.

## 참고 자료

- https://github.com/anthropics/commerce-agents
- https://github.com/anthropics/commerce-agents/blob/main/docs/safety.md
- https://github.com/anthropics/commerce-agents/blob/main/docs/backends.md
- https://github.com/anthropics/commerce-agents/blob/main/docs/deployment.md
