---
title: AI Assistant에서 Agent Development Loop로의 전환
category: tips
tags:
  - ai
  - agent
  - assistant
  - agentic-development
  - development-loop
  - workflow
source:
  - https://kyungseo.github.io/posts/ai-assistant-vs-agent/
  - https://kyungseo.github.io/posts/agent-development-loop/
updated: 2026-09-04
---

# AI Assistant에서 Agent Development Loop로의 전환

> AI 코딩의 핵심 변화는 대화를 더 잘하는 Assistant를 쓰는 데서 끝나지 않고, 목표를 위임받아 계획·실행·검증·수정 루프를 스스로 돌리는 Agent 중심 개발 방식으로 이동하는 것이다.

## 개요

두 글은 별개의 주제라기보다 하나의 흐름으로 읽는 편이 실무적으로 유용하다.

1. **Assistant와 Agent는 무엇이 다른가?**
2. **그 차이를 실제 소프트웨어 개발 프로세스에 적용하면 어떤 실행 루프가 필요한가?**

Assistant는 사람이 각 단계에 개입하면서 작업을 진행하는 협업 인터페이스에 가깝다. 반면 Agent는 목표와 제약을 전달받고 도구를 사용해 여러 단계를 연속 수행하며, 결과를 검증하고 필요하면 다시 수정하는 실행 주체에 가깝다.

따라서 개발 환경에서 중요한 것은 단순히 Claude Code, Codex 같은 도구를 도입하는 것이 아니라 **사람이 모든 세부 작업을 지시하는 구조에서 목표·정책·검증 기준을 관리하는 구조로 역할을 이동시키는 것**이다.

## AI Assistant와 AI Agent의 차이

| 관점 | Assistant | Agent |
|---|---|---|
| 기본 동작 | 요청에 응답 | 목표를 추구 |
| 인간 개입 | 매 단계 높음 | 주요 Gate 중심 |
| 작업 단위 | 질문·명령 | Goal / Task |
| 실행 방식 | Prompt → Response | Goal → Plan → Act → Observe → Iterate |
| 도구 사용 | 요청 시 단발성 | 작업 과정에서 연속 사용 |
| 상태 관리 | 대화 Context 중심 | 작업 상태·Artifact·Memory 필요 |
| 검증 | 사람이 결과 확인 | 자동 검증 + Human Gate |
| 적합한 작업 | 탐색, 설명, 초안 | 구현, 조사, 반복 수정, 자동화 |

핵심 차이는 단순한 Tool Calling 유무가 아니라 **다음 행동을 누가 결정하는가**에 있다.

```text
Assistant
Human → Prompt → AI → Result → Human → Next Prompt

Agent
Human → Goal
          ↓
        Plan
          ↓
        Execute
          ↓
        Observe
          ↓
        Verify
          ↓
      ┌─ Success → Report
      └─ Failure → Re-plan / Fix ─┐
                                  └→ Execute
```

## 왜 개발 환경에서 Agent가 중요한가

소프트웨어 개발은 한 번의 코드 생성으로 끝나지 않는다.

```text
요구사항 이해
→ 코드베이스 탐색
→ 영향 범위 분석
→ 구현 계획
→ 코드 수정
→ Build
→ Test
→ 오류 분석
→ 수정
→ Review
→ 완료 판단
```

Assistant 방식에서는 이 단계 사이를 사람이 연결한다. 예를 들어 빌드 오류가 발생하면 사람이 로그를 읽고 다시 AI에게 전달하며 다음 행동을 지시한다.

Agent 방식에서는 이 연결 자체가 실행 루프에 포함된다.

```text
Goal
 ↓
Context / Repository Scan
 ↓
Plan
 ↓
Implementation
 ↓
Build / Test / Lint
 ↓
Evidence 수집
 ↓
판단
 ├─ 실패 → Diagnose → Fix → 재검증
 └─ 성공 → Review → 완료
```

이 차이 때문에 Agent의 생산성은 모델 성능만으로 결정되지 않는다. **Harness, Tool, Context, Verification, Memory, Human Gate** 설계가 함께 중요해진다.

## Agent Development Loop

실무 개발 Agent의 최소 루프는 다음과 같이 볼 수 있다.

### 1. Goal

사람은 구현 세부 절차보다 원하는 결과와 제약을 정의한다.

좋은 Goal에는 다음이 포함된다.

- 무엇을 달성해야 하는가
- 완료 조건은 무엇인가
- 변경해서는 안 되는 범위
- 반드시 지켜야 할 개발 규칙
- 사람의 승인이 필요한 작업

### 2. Context Acquisition

Agent가 작업 전에 필요한 정보를 직접 확보한다.

- Repository 구조
- 관련 코드
- 프로젝트 지침
- Build/Test 명령
- 최근 변경
- 기존 문서
- 의존 관계

Agent 품질은 모델에게 얼마나 많은 Context를 넣느냐보다 **필요한 Context를 정확히 찾아오는 능력**에 크게 좌우된다.

### 3. Plan

Goal을 실행 가능한 작은 단계로 분해한다.

복잡한 작업일수록 바로 코드부터 생성하기보다 영향 범위와 검증 전략을 먼저 결정하는 것이 안전하다.

### 4. Execute

Agent가 Editor, Shell, Git, Build Tool, MCP 등의 도구를 사용해 실제 작업을 수행한다.

여기서 Agent는 단순 코드 생성기가 아니라 **개발 환경을 조작하는 실행 주체**가 된다.

### 5. Observe

도구 실행 결과를 다시 Context로 받아들인다.

예:

- compiler error
- test failure
- lint warning
- diff
- runtime log
- static analysis

### 6. Verify

완료 여부를 자연어 자신감으로 판단하면 안 된다. 가능한 경우 실제 Evidence를 요구한다.

```text
Build succeeded
Tests passed
Expected files changed
Unexpected diff 없음
Acceptance criteria 충족
```

### 7. Iterate

검증 실패 시 사람이 다시 프롬프트를 입력하기 전에 Agent가 원인을 분석하고 수정 루프를 반복한다.

이 단계가 Assistant 기반 개발과 Agent 기반 개발을 실질적으로 구분하는 핵심이다.

## Human-in-the-Loop의 역할 변화

Agent 도입은 인간을 제거하는 것이 아니라 개입 위치를 바꾸는 것이다.

Assistant 환경:

```text
Human = Driver
AI = Navigator
```

Agent 환경:

```text
Human = Goal / Policy / Decision Owner
Agent = Execution Owner
```

사람이 계속 담당해야 할 영역은 다음과 같다.

- 요구사항과 제품 의미
- 모호한 정책 결정
- 보안·비용·운영 위험 판단
- 외부 시스템에 영향을 주는 작업 승인
- Release / Deploy / Merge 등의 중요 Gate

반대로 다음은 Agent에 위임하기 좋은 영역이다.

- 코드 탐색
- 반복 구현
- 빌드와 테스트
- 오류 수정 루프
- 문서 동기화
- 정적 분석
- 변경점 요약

## Agent를 구성하는 핵심 요소

```text
                  Human
                    │
              Goal / Policy
                    │
                    ▼
              Orchestrator
                    │
       ┌────────────┼────────────┐
       ▼            ▼            ▼
    Context       Planner      Memory
       │            │            │
       └────────────┼────────────┘
                    ▼
                 Worker
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
        Code      Shell      MCP/Tool
          │         │         │
          └─────────┼─────────┘
                    ▼
                Verifier
                    │
            Pass? ──┴── No
              │          │
             Yes      Diagnose/Fix
              │          └──────→ Worker
              ▼
           Human Gate
```

### Harness

Agent가 어떤 순서로 사고하고 도구를 사용하며 언제 종료하는지 관리한다.

### Tool

Agent가 실제 세계에 영향을 줄 수 있게 한다.

예: filesystem, shell, compiler, test runner, Git, Perforce, browser, issue tracker, MCP.

### Context

현재 작업에 필요한 코드와 규칙을 공급한다. 무작정 전체 저장소를 Context에 넣는 방식은 비용과 정확도 모두에서 불리할 수 있다.

### Memory / Artifact

장시간 작업과 세션 재개를 위해 결정·계획·진행 상태를 대화 밖에 남긴다.

### Verification

Agent의 완료 선언을 신뢰하는 대신 Build/Test/Diff 같은 외부 Evidence로 확인한다.

## 장점

### 반복적인 마이크로 매니지먼트 감소

사람이 `파일 열어줘 → 수정해줘 → 빌드해줘 → 오류 고쳐줘`를 반복할 필요가 줄어든다.

### 긴 작업 단위 위임 가능

작업 단위가 Prompt에서 Goal로 커진다.

### 실패 복구 자동화

컴파일 오류나 테스트 실패를 다음 Prompt를 기다리는 종료 조건이 아니라 루프의 입력으로 처리할 수 있다.

### 개발 프로세스 표준화

Agent가 항상 동일한 Build/Test/Review 규칙을 따르도록 Harness에 정책을 넣을 수 있다.

## 단점 및 한계

### Token과 비용 증가

Agent는 탐색·계획·도구 호출·검증·재시도를 반복하므로 단일 Assistant 요청보다 비용이 커질 수 있다.

### 잘못된 자율성의 위험

Goal이나 권한 경계가 불명확하면 Agent가 필요 이상의 변경을 수행할 수 있다.

### Context Drift

긴 루프에서는 초기 요구사항이나 중요한 제약이 Context에서 약해질 수 있다. 따라서 durable artifact와 주기적인 상태 재확인이 필요하다.

### 검증 없는 Agent는 위험하다

코드를 수정할 수 있다는 사실만으로 개발 Agent가 되는 것은 아니다. 실제 Build/Test/Review가 연결되지 않으면 빠르게 잘못된 결과를 만들어낼 뿐이다.

### Enterprise 환경 제약

사내 환경에서는 다음이 Agent의 자율성을 제한한다.

- 접근 권한
- Perforce/Git 정책
- 사내망
- Credential 관리
- CI 비용
- 승인 프로세스
- 보안 정책

따라서 완전 자율 Agent보다 **권한이 제한된 Agent + 명확한 Human Gate**가 현실적인 경우가 많다.

## 실무 적용 패턴

### Level 1 — Assistant

```text
Human ↔ Claude/Codex
```

설명, 코드 초안, 단일 수정에 적합하다.

### Level 2 — Tool-using Assistant

```text
Human ↔ AI ↔ Repository / Shell
```

Claude Code나 Codex CLI처럼 코드베이스를 탐색하고 명령을 실행하지만, 사람이 계속 작업 방향을 제어한다.

### Level 3 — Single Agent Loop

```text
Goal → Agent → Code → Build/Test → Fix Loop → Result
```

명확한 기능 구현이나 버그 수정에 가장 현실적인 자동화 단계다.

### Level 4 — Orchestrated Agents

```text
                    Orchestrator
             ┌─────────┼─────────┐
             ▼         ▼         ▼
          Analysis    Work      Review
             │         │         │
             └─────────┴─────────┘
                       ↓
                    Evidence
```

복잡한 작업을 역할별 Agent에 분배한다. 이 단계부터 Agent 자체보다 **Orchestration과 상태 전달 방식**이 더 중요한 문제가 된다.

## 현재 개발 환경에 적용할 때의 시사점

이 관점은 프로젝트별 Claude 세션과 상위 Orchestrator를 두는 구조에도 그대로 적용할 수 있다.

```text
Root Orchestrator
   │
   ├── project1 Agent Session
   │      └── plan → edit → build → test → report
   │
   ├── project2 Agent Session
   │      └── plan → edit → build → test → report
   │
   ├── project3 Agent Session
   │      └── plan → edit → build → test → report
   │
   └── Release Agent
          └── integration / validation / deployment
```

중요한 것은 Root가 모든 구현 Context를 직접 들고 있는 것이 아니다.

Root Orchestrator는 다음만 관리하는 편이 좋다.

- Goal
- 프로젝트 라우팅
- 작업 상태
- 의존 관계
- 승인 Gate
- 최종 결과

각 프로젝트 Agent는 자기 프로젝트의 세부 Context와 개발 루프를 소유한다.

이렇게 하면 **Assistant → Agent → Multi-Agent Harness**로 자연스럽게 확장할 수 있다.

## 도입 판단

| 단계 | 평가 |
|---|---|
| Assistant 활용 | 이미 일반적인 기본 도구 |
| 단일 Agent 개발 루프 | **바로 적용 가능** |
| Build/Test 자동 복구 루프 | **바로 적용 가치 높음** |
| 프로젝트별 Persistent Agent | **PoC 가치 높음** |
| Root Orchestrator + 프로젝트 Agent | **PoC 가치 높음** |
| 완전 무인 개발/배포 | 현재는 신중하게 제한 |

특히 실무에서는 멀티 Agent부터 시작하기보다 **한 프로젝트에서 Goal → Implement → Build → Test → Fix → Verify 루프를 안정화한 뒤 Orchestrator를 추가하는 순서**가 좋다.

## 결론

Assistant와 Agent의 차이는 이름이나 UI가 아니라 **작업 제어권과 실행 루프의 위치**에 있다.

AI Assistant 시대에는 사람이 개발 프로세스를 실행하고 AI가 각 단계에서 도움을 줬다. Agent 기반 개발에서는 사람이 목표·정책·승인 기준을 정의하고 Agent가 그 사이의 실행 루프를 담당한다.

따라서 AI 개발 생산성을 높이기 위한 다음 단계는 더 좋은 Prompt를 만드는 것만이 아니라 다음을 설계하는 것이다.

```text
Goal
+ Context Discovery
+ Tool Access
+ Execution Loop
+ Verification
+ Memory
+ Human Gates
= Practical Development Agent
```

그리고 여러 프로젝트로 확장할 때는 각각의 Agent가 로컬 Context와 실행 루프를 소유하고, 상위 Orchestrator가 목표·상태·의존성만 관리하는 구조가 자연스럽다.

## 참고 자료

- https://kyungseo.github.io/posts/ai-assistant-vs-agent/
- https://kyungseo.github.io/posts/agent-development-loop/
