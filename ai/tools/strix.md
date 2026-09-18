---
title: Strix
category: tools
tags:
  - ai
  - agent
  - security
  - pentesting
  - devsecops
  - multi-agent
source: https://github.com/usestrix/strix
updated: 2026-09-13
---

# Strix

> LLM 에이전트에게 격리된 보안 도구 환경을 제공하고, 멀티 에이전트가 실제 공격·검증·PoC 생성까지 수행하게 만드는 오픈소스 자율 침투테스트 도구다.

## 프로젝트 개요

Strix는 전통적인 정적 취약점 스캐너보다 한 단계 더 나아가 실제 애플리케이션을 실행·탐색하고 취약점을 동적으로 검증하는 AI pentesting 시스템이다. 소스 디렉터리, URL, 도메인/IP 등을 대상으로 사용할 수 있으며 개발자용 CLI/TUI와 headless 자동화, CI/CD 통합을 제공한다.

오픈소스 CLI는 Docker 기반 로컬 sandbox와 사용자가 선택한 LLM API를 결합하는 BYO-model 구조다. 별도의 관리형 Strix Platform도 제공한다.

## 해결하려는 문제

기존 SAST/취약점 스캐너는 많은 후보를 빠르게 찾지만 false positive와 실제 악용 가능성 판단이 개발자에게 남는다. 반대로 수동 pentest는 실제 검증 품질은 높지만 비용과 시간이 크고 배포 주기에 맞춰 반복하기 어렵다.

Strix의 핵심 접근은 LLM을 단순 코드 리뷰어가 아니라 브라우저·HTTP proxy·terminal·보안 도구를 사용하는 실행형 보안 에이전트로 두고, 발견한 문제를 실제 PoC로 검증하도록 하는 것이다.

## 핵심 기능

- 실제 PoC를 통한 취약점 검증 및 재현 절차 생성
- 전문 역할을 나누는 multi-agent orchestration과 병렬 테스트
- Kali Linux 기반 Docker sandbox에서 보안 도구 실행
- 브라우저 자동화, HTTP proxy, terminal, Python runtime 활용
- Semgrep, Nuclei, SQLMap, Trivy, Gitleaks, Nmap, Playwright, Caido 등 다양한 도구 통합
- 소스 기반 white-box 분석과 동적 테스트 결합
- CLI/TUI 및 headless 실행
- GitHub Actions/CI 파이프라인 연동
- 결과 보고서 및 remediation/auto-fix 워크플로우
- OpenAI/Anthropic/Google 등 여러 LLM provider를 LiteLLM 계층으로 사용할 수 있는 구조
- Agent Skill 형태로 pentest, managed pentest, 취약점 수정, CI scanning 워크플로우 제공

## 아키텍처

공식 문서와 저장소 구조를 종합하면 Strix는 보안 도메인에 특화된 agent harness로 보는 것이 가장 이해하기 쉽다.

```text
Target
  │
  │ source / URL / domain / IP
  ▼
Strix CLI / Headless / CI
  │
  ▼
Root / Orchestrator Agent
  │
  ├── task decomposition
  ├── specialist agent spawning
  └── findings coordination
        │
        ├──────────────┬──────────────┐
        ▼              ▼              ▼
   Recon Agent     Web/Auth Agent   Code Agent ...
        │              │              │
        └──────────────┴──────────────┘
                       │
                       ▼
             Tool Invocation Layer
                       │
                       ▼
            Docker / Kali Sandbox
        ┌──────────────┼───────────────┐
        ▼              ▼               ▼
     Terminal       Browser/Proxy   Security Tools
                                  Nuclei/Semgrep/
                                  Nmap/SQLMap/Trivy...
        │
        ▼
  exploit / validation / evidence
        │
        ▼
 Findings + PoC + remediation/report
```

### 실행 흐름

1. 사용자가 target과 LLM 설정을 지정한다.
2. 루트 에이전트가 전체 pentest를 조정하고 필요한 전문 작업을 분해한다.
3. 하위 에이전트들이 reconnaissance, 코드 분석, 인증/웹 취약점 등 영역별 작업을 병렬 또는 분산 수행한다.
4. 에이전트의 tool call은 sandbox 실행 계층을 통해 격리된 컨테이너에서 수행된다.
5. terminal, browser/proxy 및 보안 도구의 결과가 다시 에이전트 context로 전달된다.
6. 단순 탐지 결과를 그대로 보고하지 않고 가능한 경우 exploit/PoC를 수행해 실제 취약성을 검증한다.
7. 최종적으로 finding, 재현 방법, 증거, remediation/report를 생성한다.

최근 버전에서는 root agent를 orchestration 중심으로 제한하고, agent image/context memory budget과 sandbox resource limit, 긴 tool output 처리 등 harness 안정성을 개선하는 방향으로 발전하고 있다.

## Harness 관점에서 볼 포인트

Strix의 가치 중 하나는 pentest 기능 자체보다 실행형 에이전트를 안정적으로 운영하기 위한 패턴이다.

### Orchestrator와 Worker 분리

루트 에이전트가 모든 탐색과 도구 실행을 직접 수행하기보다 전체 계획과 전문 에이전트 배정을 담당한다. 이는 범용 개발 harness에서도 Main Session → Analysis/Worker/Reviewer 구조에 적용하기 좋은 패턴이다.

### Tool-rich Sandbox

에이전트가 host에서 직접 명령을 실행하지 않고 Docker sandbox에 도구를 미리 구성한다. 범용 coding agent에서도 빌드/테스트/분석 도구를 사전 구성한 worker image를 두는 방식으로 응용할 수 있다.

### Skill Injection

보안 지식을 모두 system prompt에 넣는 대신 취약점/도구/프레임워크별 재사용 가능한 Skill로 분리하는 구조가 중요하다. 필요한 시점에 도메인 지식을 공급하는 방식은 context 절약에도 유리하다.

### Tool Result Budget

대형 저장소에서 Semgrep 결과가 100만 token 이상 context에 들어가 ContextWindowExceededError가 발생한 실제 사례가 있었다. 이후 tool output truncation, context/memory budget 관리가 중요해졌다. 이는 일반 coding harness에서도 `command output → filter/summarize → context` 계층이 필수라는 좋은 사례다.

## 장점

### 실제 검증 중심

정적 분석 결과를 나열하는 것이 아니라 실행 가능한 PoC와 재현 절차를 목표로 하므로 false positive를 줄이고 개발자가 우선순위를 판단하기 쉽다.

### 강력한 도구 조합

LLM 자체의 보안 지식에만 의존하지 않고 검증된 보안 CLI와 브라우저/HTTP proxy를 사용한다. 즉 LLM은 판단·계획·도구 선택을 담당하고 실제 측정은 전문 도구가 담당한다.

### 멀티 에이전트 구조

공격 표면이 넓은 애플리케이션을 전문 작업으로 분리하고 병렬화할 수 있다. 복잡한 장기 작업을 단일 context에 몰아넣지 않는다는 점도 중요하다.

### 개발 파이프라인 통합성

headless/CI 실행과 SARIF/보고서 계열 기능을 통해 일회성 pentest가 아니라 지속적 DevSecOps gate로 발전시키기 쉽다.

### Provider 선택 가능

오픈소스 CLI는 특정 LLM vendor에 완전히 고정되지 않는 구조다.

## 단점 및 한계

### 높은 token/API 비용 가능성

멀티 에이전트가 반복적으로 reconnaissance, 분석, 도구 실행, 검증을 수행하므로 일반 SAST보다 LLM 호출량이 커질 수 있다. 비용 제한 기능에 대한 사용자 요구도 존재한다. 전체 저장소를 매 commit마다 깊게 검사하기보다 PR 범위/위험도 기반으로 실행하는 편이 현실적이다.

### Context 폭주 위험

보안 도구는 매우 큰 로그/JSON을 생성할 수 있다. 실제 대형 repo에서 Semgrep 결과가 context window를 초과한 사례가 있었으며, tool output filtering과 memory compression이 핵심 운영 요소다.

### Sandbox 운영 복잡도

Docker와 sandbox image가 필요하며 보안 도구가 많아 이미지 크기와 초기 다운로드/실행 비용이 크다. 프로젝트는 이미지 크기를 약 7.2GB에서 3.8GB로 줄이는 개선도 수행했다.

### 에이전트 안정성

공개 issue에는 sandbox initialization, tool timeout, LLM connection, high agent fan-out 시 file descriptor 문제 등 실제 운영 이슈가 보고되어 있다. 빠르게 발전하는 프로젝트인 만큼 enterprise CI의 필수 gate로 바로 사용하려면 충분한 검증이 필요하다.

### 보안 및 권한

본질적으로 공격 도구를 실행하는 시스템이므로 대상 권한과 network boundary가 중요하다. 회사 환경에서는 허가된 target, outbound network, credential/secret 접근 범위를 명확히 제한해야 한다.

### Windows/Enterprise 환경

Docker 기반 실행이 중심이므로 Windows에서도 Docker 환경을 전제로 평가해야 한다. Perforce, TeamCity, 사내 인증망처럼 GitHub 중심이 아닌 enterprise 환경의 turnkey 통합은 공식 핵심 경로보다 별도 glue code가 필요할 가능성이 높다.

## 활용 사례

### PR 보안 검증

고위험 PR 또는 인증/네트워크/직렬화 관련 변경에 대해 Strix를 실행하고 검증된 finding만 merge gate 후보로 활용한다.

### 릴리스 전 AI Pentest Worker

Release pipeline에서 일반 unit/integration test 이후 별도 격리 환경에 서비스를 띄우고 Strix가 공격하도록 구성할 수 있다.

### 사내 보안 Agent

내부 도구/웹 서비스의 정기 pentest를 자동화하고 사람이 결과와 PoC를 최종 검토하는 구조가 가능하다.

### Harness 설계 참고

보안 기능을 사용하지 않더라도 `orchestrator → specialist workers → sandbox tools → evidence → report` 구조는 개발용 멀티 에이전트 harness 설계에 참고 가치가 높다.

## 기존 도구와 비교

| 구분 | 전통 SAST/SCA | 단일 LLM 코드 리뷰 | Strix |
|---|---|---|---|
| 분석 방식 | 규칙/패턴 중심 | 코드 reasoning | agent reasoning + 실제 도구 실행 |
| 동적 검증 | 제한적 | 거의 없음 | 핵심 기능 |
| PoC | 보통 없음 | 추론 기반 | 실제 검증 지향 |
| 멀티 에이전트 | 없음 | 보통 없음 | 지원 |
| 실행 환경 | scanner | LLM context | 격리 sandbox + 보안 toolkit |
| 비용 예측성 | 높음 | 중간 | 상대적으로 낮음 |
| CI 속도 | 빠름 | 중간 | 깊은 scan은 느릴 수 있음 |
| 적합 용도 | 넓은 1차 탐지 | 리뷰 보조 | 고위험 finding 검증/자동 pentest |

따라서 Strix가 SAST를 완전히 대체한다기보다 `빠른 정적 검사 → 위험 후보 → agentic dynamic validation`의 후단 계층으로 사용하는 편이 실무적으로 자연스럽다.

## 활용 아이디어

### 바로 적용 가능

- 개인/PoC 웹 프로젝트를 대상으로 로컬 Strix scan 수행
- release 전 수동 security validation 단계에 추가
- Agent Skill 구조와 sandbox tool 구성 방식을 내부 harness 설계 참고자료로 활용

### PoC 가치 있음

- TeamCity build 후 테스트 배포본을 대상으로 Strix headless scan 실행
- 보안 관련 changelist만 선별하여 실행하는 Perforce trigger/CI job 구성
- Strix 결과를 AI reviewer에게 전달해 `취약점 검증 → 수정 → 재검증` loop 구성
- 사내 개발 harness의 독립 Security Agent 역할로 연결

### 아이디어 참고

- Root orchestrator를 실행보다 delegation 중심으로 제한하는 패턴
- 도메인 지식을 Skill로 외부화하는 방식
- tool output을 LLM context에 넣기 전 truncate/filter/summarize하는 gateway
- 각 worker를 목적별 sandbox image에서 실행하는 구조
- evidence 기반 final report 생성 패턴

### 현재는 도입 가치 낮음

- 모든 Perforce changelist마다 full autonomous pentest를 필수 gate로 실행
- LLM 비용/실행시간 budget 없이 대형 UE5 repository 전체를 반복 scan
- 격리되지 않은 사내 PC에서 광범위한 network 권한으로 실행

## 결론

Strix는 단순한 'AI 취약점 스캐너'라기보다 **보안 도메인에 특화된 멀티 에이전트 harness**에 가깝다. LLM이 전문 보안 도구를 선택하고 실제 sandbox에서 실행한 뒤 결과를 검증하고 다음 행동을 결정하는 구조가 핵심이다.

실무적으로는 기존 SAST를 제거하고 전면 교체하기보다 고위험 변경이나 릴리스 후보에 대한 2차 동적 검증 계층으로 시작하는 것이 적합하다. 특히 멀티 에이전트 분업, sandbox tool runtime, Skill injection, context/output budget 관리 패턴은 보안 외의 범용 AI 개발 harness에도 참고 가치가 높다.

**평가: PoC 가치 높음.** 보안 자동화 자체뿐 아니라 AI harness 구조 연구 대상으로도 가치가 있다.

## 참고 자료

- Repository: https://github.com/usestrix/strix
- Documentation: https://docs.strix.ai/
- Sandbox tools: https://docs.strix.ai/tools/sandbox
- GitHub Releases: https://github.com/usestrix/strix/releases
- GitHub Issues: https://github.com/usestrix/strix/issues
- Agent guide: https://github.com/usestrix/strix/blob/main/AGENTS.md
