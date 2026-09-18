---
title: PWN
category: tools
tags:
  - ai
  - agent
  - security
  - devsecops
  - sast
  - automation
source: https://github.com/0dayInc/pwn
updated: 2026-09-14
---

# PWN

> 보안 자동화 모듈과 전통적인 보안 도구를 AI 에이전트·메모리·학습·MCP·Swarm 구조와 결합한 Ruby 기반 오픈 보안 자동화 프레임워크.

## 프로젝트 개요

PWN은 0day Inc.가 개발하는 MIT 라이선스 기반 보안 자동화 프레임워크다. 핵심 개념은 재사용 가능한 모듈을 조합해 `driver`라는 자동화 패키지를 만드는 것이다. 초기에는 침투 테스트·리버스 엔지니어링·취약점 스캐닝·SDR·SAST 등을 자동화하는 성격이 강했지만, 최근 버전에서는 `pwn-ai`를 중심으로 AI 에이전트 실행 구조가 크게 확장되고 있다.

2026-09-14 조사 기준 GitHub Releases에는 0.5.600 계열이 표시되며, RubyGems에는 0.5.63x 계열까지 게시된 기록이 확인된다. 릴리스가 매우 잦은 편이다.

## 해결하려는 문제

보안 자동화는 스캐너, 프록시, SAST, OS 명령, API, 리포팅 등이 서로 분리되어 있고 조직마다 이를 연결하는 사내 스크립트를 반복 작성하게 된다. PWN은 공통 기능을 공개 모듈로 만들고 이를 driver와 AI agent가 조합하도록 하여 다음 문제를 줄이려 한다.

- 보안 도구별 자동화 코드의 중복
- 스캔 결과를 사람이 반복 해석하는 비용
- 여러 도구/API/CLI 사이의 실행 흐름 단절
- 일회성 스크립트의 재사용성과 검증 부족
- AI 에이전트가 실제 보안 도구를 안전하게 호출하기 위한 실행 계층 부족

## 핵심 기능

### Security Automation Drivers

PWN 모듈을 조합해 테스트·기록·재생·배포 가능한 custom driver를 작성한다. Burp Suite, ZAP, SAST, reconnaissance, hardware/SDR 등 넓은 보안 영역을 다룬다.

### AI Provider 계층

소스의 `lib/pwn/ai/`에는 Anthropic, OpenAI, Gemini, Grok, Ollama, Open WebUI 등의 구현이 존재한다. 특정 모델 하나에 고정하기보다 provider를 교체할 수 있는 구조다.

### Agent Harness

`PWN::AI::Agent`에는 Registry, RequestRuntime, Profiles, Dispatch, PromptBuilder, Loop, Manifest, Metrics 등 에이전트 실행기의 전형적인 구성 요소가 존재한다.

특히 다음 모듈이 흥미롭다.

- EngagementMemory: 작업/engagement 기억
- Learning / Mistakes: 실행 경험 및 실패 학습
- Reflect / Extrospection: 결과 성찰 및 외부 상태 분석
- Swarm: 다중 에이전트 협업
- Reward / Verification: 결과 평가와 검증
- Curriculum: 단계적 작업/학습 구성
- Policy / PolicyEvaluation / ToolGuard: 도구 실행 정책과 보호 계층
- PromptCache: 프롬프트 캐싱
- TaskSummarizer: 작업 요약

### Security-specific Agents

Agent namespace에는 Assembly, BTC, BurpSuite, HackerOne, GQRX, SAST, TransparentBrowser, VulnGen 등이 포함되어 있다. 범용 coding agent가 아니라 실제 보안 도메인의 도구를 호출하는 전문 agent를 지향한다.

### Memory / Sessions / Cron

최근 릴리스에서는 memory, sessions, agent delegation, cron 기능이 `pwn-ai`에 통합되었다. 단발성 LLM wrapper보다 지속적으로 작업하는 agent runtime에 가까워지고 있다.

### MCP

`PWN::AI::MCP` 구현이 존재하여 외부 MCP 생태계와 연결할 수 있다.

## 아키텍처

```text
                  User / pwn-ai REPL
                         |
                         v
               +-------------------+
               | Agent Runtime/Loop|
               +-------------------+
                  |      |      |
          Prompt/Context |   Policy/Guard
                  |      |      |
                  v      v      v
             +-----------------------+
             | Dispatch / Registry   |
             +-----------------------+
                |       |       |
                v       v       v
          PWN Modules   CLI     MCP
                |
        +-------+-------------------+
        |       |       |           |
       SAST   Burp    Recon      Security APIs
        |       |       |           |
        +-------+-------+-----------+
                        |
                        v
                 Observation/Result
                        |
          +-------------+-------------+
          |                           |
      Verification                 Memory
          |                           |
       Reward                   Learning/Mistakes
          |                           |
          +---------- Reflect --------+
                        |
                     Next Turn
```

핵심은 LLM 자체보다 `도구 실행 → observation → 검증 → memory/learning → 다음 실행`의 폐쇄 루프에 있다.

## 장점

- 보안 자동화와 agent harness가 하나의 프레임워크에 공존한다.
- OpenAI/Anthropic/Gemini/Grok/Ollama 등 모델 선택지가 넓다.
- 실제 CLI와 보안 모듈을 실행하는 구조가 이미 존재한다.
- Memory, verification, policy, tool guard, reward 등 장기 실행 agent에 필요한 개념이 코드 수준에서 분리되어 있다.
- MIT 라이선스로 내부 PoC와 구조 참고에 부담이 적다.
- SAST/Burp 같은 실제 보안 workflow와 AI introspection을 연결하는 방향이 명확하다.

## 단점 및 한계

- Ruby/RVM 중심이라 Windows 중심 개발 조직에서는 도입 장벽이 크다. 공식 README 기준 테스트 환경도 Debian 계열 Linux와 macOS 중심이다.
- 매우 넓은 기능 범위 때문에 dependency와 운영 복잡도가 크다.
- 릴리스 빈도가 매우 높아 API 안정성 및 장기 유지보수 관점에서 검증이 필요하다.
- AI agent 기능이 빠르게 추가되고 있어 각 모듈의 성숙도와 production 안정성은 별도 검증이 필요하다.
- 보안 자동화 특성상 agent가 CLI/스캐너/네트워크 기능을 자율 실행할 경우 권한 통제와 audit가 중요하다.
- 모델 호출, reflection, verification, swarm을 함께 사용하면 token/cost가 빠르게 증가할 수 있다. 구체적인 benchmark는 확인되지 않았다.
- Enterprise Windows/Perforce 환경에 대한 공식적인 최적화 사례는 확인되지 않았다.

## 활용 사례

### DevSecOps 자동화

CI에서 SAST를 수행하고 AI가 결과를 분류·설명한 뒤 보고서로 생성하는 파이프라인.

### 보안 조사 Agent

Recon → 도구 실행 → 결과 분석 → 추가 검사 결정의 반복 루프를 자동화할 수 있다.

### Burp/ZAP 결과 분석

Proxy history 또는 scanner 결과를 AI introspection으로 분석해 중요한 항목을 선별하는 방식에 활용할 수 있다.

### 내부 보안 Harness 설계 참고

PWN 전체를 도입하지 않더라도 Registry → Dispatch → ToolGuard → Verification → Memory → Learning 구조는 사내 agent harness 설계에 참고할 가치가 높다.

## 기존 도구와 비교

PWN은 단순 pentest framework나 단순 AI coding agent 중 하나로 보기 어렵다. Metasploit처럼 exploit 중심인 프레임워크보다는 자동화 모듈의 범위가 넓고, Claude Code/Codex 같은 coding agent보다 security tool orchestration에 초점이 맞춰져 있다. LangGraph류의 범용 agent orchestration 프레임워크와 비교하면 범용성은 낮지만 보안 도메인 모듈과 실행 기능이 이미 결합되어 있다는 점이 차별점이다.

## 활용 아이디어

### 바로 적용 가능 — 구조 참고

`Registry → Dispatch → ToolGuard → Result → Verification` 구조를 내부 AI harness의 tool execution layer 설계에 참고할 수 있다.

### PoC 가치 있음 — AI Code Review / SAST

사내 코드 리뷰 PoC에 정적 분석 결과를 함께 넣고 Reviewer agent가 `SAST 결과 + diff + repository context`를 통합 검증하는 형태가 적합하다.

### PoC 가치 있음 — Perforce 환경

PWN을 직접 Windows에 설치하기보다 Linux worker/container에서 보안 분석을 수행하고 Perforce workspace의 변경 파일만 입력으로 전달하는 형태가 현실적이다.

```text
Perforce CL
   |
   v
Changed Files
   |
   +--> SAST / Security Tools
   |          |
   |          v
   |      Findings
   |          |
   +------> Review Agent
              |
       Verification/Policy
              |
              v
       Review Report / CL
```

### 아이디어 참고 — 자기 개선 Harness

Learning, Mistakes, Reflect, Reward, Curriculum 모듈의 분리는 장기적으로 agent가 실패 사례를 축적하고 다음 작업의 tool selection/prompt를 개선하는 구조를 설계할 때 참고할 만하다.

### 현재는 도입 가치 낮음 — 전체 프레임워크 교체

Windows/.NET/Perforce 기반 기존 개발 생산성 환경을 PWN 중심으로 교체하는 것은 기술 스택 차이와 보안 도구 중심 설계 때문에 비용 대비 효과가 낮다. 필요한 패턴만 선별적으로 가져오는 편이 적합하다.

## 결론

PWN의 가장 흥미로운 부분은 오래된 보안 자동화 프레임워크에 LLM을 단순히 붙인 것이 아니라, 최근에는 memory, delegation, policy, verification, reflection, learning, swarm까지 포함하는 agent harness로 확장하고 있다는 점이다.

일반 개발 생산성 도구로 직접 채택하기보다는 **보안 자동화용 Agent Harness의 실제 구현 사례**로 보는 것이 가치가 높다. 특히 내부 AI Code Review/SAST 파이프라인을 설계한다면 ToolGuard, Verification, Memory/Learning 분리 방식은 PoC 대상으로 충분하다.

## 참고 자료

- https://github.com/0dayInc/pwn
- https://github.com/0dayInc/pwn/releases
- https://www.0dayinc.com/post/exploring-the-pwn-ruby-gem-advancing-security-automation-with-ai-agentic-introspection
- https://rubygems.org/gems/pwn
