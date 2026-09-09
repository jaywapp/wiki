---
title: Claude Managed Agents - Scheduled Deployments와 Vaults
category: news
tags:
  - ai
  - agent
  - claude
  - managed-agents
  - scheduling
  - vault
  - mcp
source: https://claude.com/blog/whats-new-in-claude-managed-agents
updated: 2026-09-09
---

# Claude Managed Agents - Scheduled Deployments와 Vaults

> Claude Managed Agents가 cron 기반의 무인 반복 실행과 모델에 비밀값을 직접 노출하지 않는 Vault 인증을 지원하면서, 에이전트용 스케줄러·시크릿 관리 인프라를 Claude Platform 안으로 흡수했다.

## 프로젝트 개요

Anthropic은 2026-06-09 Claude Managed Agents의 **Scheduled Deployments**와 **Vaults**를 public beta로 공개했다. Managed Agents는 Anthropic이 agent harness와 실행 인프라를 관리하는 서비스이며, 이번 업데이트의 핵심은 에이전트를 일회성 대화형 실행에서 **지속적으로 운영되는 자동화 워커**로 확장하는 것이다.

## 해결하려는 문제

운영형 에이전트를 만들 때 모델 호출만으로는 부족하다. 반복 실행을 위한 scheduler, API key와 OAuth credential 관리, 실행 sandbox, 외부 CLI/API/MCP 연결, 실패 및 세션 추적 같은 별도 인프라가 필요하다.

이번 기능은 특히 다음 두 부분을 플랫폼 기능으로 제공한다.

1. cron scheduler를 직접 구축·호스팅하지 않고 정기적으로 agent session을 시작한다.
2. API key를 prompt나 agent process에 직접 전달하지 않고 외부 시스템을 인증한다.

## 핵심 기능

### Scheduled Deployments

- cron schedule 기반 실행
- schedule이 발화할 때마다 새 Managed Agent session 시작
- pause / resume / archive 지원
- schedule 외 수동 실행 가능
- nightly data sync, weekly compliance scan, daily digest 등 반복 작업에 적합

Anthropic이 소개한 사례에는 Rakuten의 주·월간 spreadsheet 분석 및 report/deck 생성, production log/metric 점검, Actively AI의 정기 검색 결과 갱신, Ando의 follow-up 및 meeting reminder 자동화가 포함된다.

### Vaults

Vault는 agent가 사용하는 environment variable과 credential을 보관한다.

중요한 보안 설계는 실제 secret을 agent sandbox에 그대로 넣지 않는다는 점이다. sandbox에는 placeholder가 존재하고, 실제 key는 네트워크 경계에서 허용된 domain으로 나가는 요청에만 붙는다. 따라서 모델이 API key 자체를 읽을 필요가 없다.

- API key와 environment variable name 등록
- key가 접근 가능한 domain 제한
- 실행 중 key 교체 가능
- CLI / direct API / MCP 기반 외부 시스템 연동
- 대부분의 HTTP 기반 CLI 인증 패턴 지원

Browserbase와 KERNEL 같은 browser infrastructure도 Vault 인증 CLI를 통해 Managed Agents에 연결할 수 있다.

## 아키텍처

```text
                Claude Platform
                     |
              Cron Deployment
                     |
                     v
             New Agent Session
                     |
          Anthropic Managed Harness
             /       |        \
            /        |         \
       Built-in     CLI        MCP/API
        Tools         |           |
                      v           v
                  Sandbox ---- Network Boundary
                                  |
                              Vault Secret
                                  |
                         allowlisted domains
                                  |
                                  v
                           External Services
```

핵심은 **schedule → session 생성 → sandbox에서 agent 실행 → network boundary에서 credential 주입 → 외부 시스템 접근** 흐름이다.

## 장점

### 운영 인프라 감소

기존에는 TeamCity/Jenkins/GitHub Actions/cron 같은 scheduler와 별도의 secret store를 agent runtime 주변에 구성해야 했다. Managed Agents에서는 이 기능이 agent lifecycle과 직접 결합된다.

### Secret의 모델 노출 최소화

API key를 prompt, tool result 또는 shell environment의 평문 값으로 모델이 읽는 구조보다 안전한 방향이다. domain allowlist와 network-boundary injection은 agent가 credential을 임의 목적지로 전송할 위험을 줄인다.

### CLI를 1급 integration 방식으로 활용

모든 서비스를 MCP server로 감쌀 필요 없이 기존 CLI를 그대로 활용할 수 있다. 내부 개발 도구가 CLI 중심인 조직에서는 integration 비용을 크게 줄일 수 있다.

### 반복 업무의 Agent화

단순 정기 script가 아니라 매 실행마다 Claude가 상황을 읽고 판단한 뒤 도구를 사용할 수 있다. report 생성, 로그 분석, 상태 점검, follow-up처럼 입력 상태에 따라 행동이 달라지는 cron job에 특히 적합하다.

## 단점 및 한계

### Anthropic Vendor Lock-in

schedule, session, sandbox, vault, harness가 Claude Platform lifecycle에 묶인다. 다른 모델로 교체하려면 orchestration/runtime 계층을 다시 설계할 가능성이 크다.

### Public Beta

발표 시점 기준 두 기능 모두 public beta다. 장기 운영 정책, SLA, 기능 안정성은 production 도입 전에 별도 검증이 필요하다.

### 기존 CI/CD와 역할 중복

결정론적인 build/deploy, 정해진 script 실행은 TeamCity나 GitHub Actions가 더 단순하고 추적하기 쉽다. 모든 cron job을 agent로 바꾸는 것은 비용과 비결정성을 증가시킬 수 있다.

### 비용

Managed Agents는 token 비용 외 runtime 비용이 존재한다. 단순한 정기 스크립트까지 agent화하면 기존 scheduler 대비 비용 효율이 떨어질 수 있다.

### Enterprise 검토 포인트

외부 SaaS에 code/data가 전달되는 정책, outbound domain allowlist, audit/tracing, 사내 credential 정책, self-hosted 경계 요구사항을 확인해야 한다. Vault가 secret 노출 문제를 줄이지만 전체 데이터 거버넌스 문제를 해결하는 것은 아니다.

## 활용 사례

- 매일 코드베이스 / Wiki 변경점 분석 및 digest 생성
- 정기 production log와 metric 분석
- nightly repository health check
- 주간 dependency / security review
- backlog 또는 issue triage
- 정기 spreadsheet 분석 후 report/deck 생성
- 사내 CLI를 이용한 운영 데이터 수집 및 후속 작업

## 기존 도구와 비교

| 방식 | 장점 | 단점 | 적합한 작업 |
|---|---|---|---|
| TeamCity / GitHub Actions | 결정론적, CI/CD에 강함 | AI 판단 로직을 직접 구성 | build, test, deploy |
| OS cron + script | 단순, 저비용 | 상태·보안·관측 인프라 직접 구성 | 고정 반복 작업 |
| 직접 구축 Agent Worker | 자유도와 모델 선택권 높음 | scheduler, secrets, sandbox 운영 필요 | 사내 맞춤 agent platform |
| Claude Managed Agents | harness + schedule + vault 통합 | Claude 종속성과 사용 비용 | 판단이 필요한 장기/반복 agent 업무 |

## 활용 아이디어

### 바로 적용 가능

**AI Wiki Daily Digest** 같은 작업은 Scheduled Deployments와 잘 맞는다. 매일 repository 변경을 확인하고 관련 문서를 분류·요약해 결과를 생성하는 흐름은 고정 script보다 agent 판단이 유용하다.

### PoC 가치 있음

사내 CLI가 존재한다면 Vault에 credential을 두고 CLI를 Managed Agent가 호출하게 하는 구조를 시험할 가치가 있다. MCP server를 새로 개발하지 않고도 agent integration을 빠르게 검증할 수 있다.

### 기존 Harness와 결합

내부 Orchestrator/Worker/Reviewer 구조 전체를 Managed Agents로 교체하기보다는, **Scheduled Trigger + secure external-tool execution layer**만 비교 대상으로 보는 것이 현실적이다. 복잡한 multi-model routing이나 Codex review가 필요하면 자체 harness가 더 유연하다.

### 현재 도입 가치 낮음

컴파일, 패키징, 배포처럼 입력과 출력이 명확한 TeamCity pipeline은 기존 CI를 유지하는 편이 낫다. AI 판단이 실제로 필요한 단계만 agent task로 분리하는 것이 비용·재현성 측면에서 유리하다.

## 결론

이번 업데이트의 의미는 단순한 cron 기능 추가보다 크다. Claude Managed Agents가 **모델 + agent harness + sandbox + scheduler + secret management + external tool integration**을 하나의 운영 플랫폼으로 묶고 있다는 신호다.

특히 Vault의 network-boundary credential injection은 autonomous agent가 사내/외부 시스템을 다룰 때 가장 까다로운 secret 관리 문제를 직접 겨냥한다. 반면 결정론적인 CI/CD까지 Managed Agents로 이전할 이유는 적다. 실무적으로는 **AI 판단이 필요한 정기 운영 업무**를 우선 PoC 대상으로 삼는 것이 적절하다.

## 참고 자료

- https://claude.com/blog/whats-new-in-claude-managed-agents
- https://claude.com/blog/claude-managed-agents
- https://platform.claude.com/docs/en/release-notes/overview
