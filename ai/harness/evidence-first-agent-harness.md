---
title: Evidence-First Agent Harness
category: harness
tags:
  - ai
  - agent
  - harness
  - context-engineering
  - reasoning
  - debugging
  - token-optimization
  - claude-code
source: internal-session-analysis
updated: 2026-09-07
---

# Evidence-First Agent Harness

> 결정론적으로 확인할 수 있는 것은 도구로 확인하고, 큰 정보는 컨텍스트에 넣기 전에 축소하며, 비싼 실험은 가장 싼 관측으로 가설을 검증한 뒤 수행한다.

## 프로젝트 개요

Spotify의 Shunt 방식은 비싼 메인 모델의 컨텍스트에 대용량 파일을 직접 넣지 않고 Hook과 저비용 워커를 이용해 Context I/O 비용을 줄인다. 그러나 실제 개발 세션을 회고하면 전체 낭비가 항상 Context I/O에서 발생하지 않는다.

Gaudi/UE 개발 세션에서는 대용량 로그와 MCP 응답을 이미 grep, Python, 파일 저장, targeted read로 축소하고 있었지만, 잘못된 enum 값 기억이나 검증되지 않은 가설 때문에 Build/Render를 여러 차례 반복하는 비용이 더 컸다.

따라서 이 문서는 Spotify식 Context Routing을 확장해 **Context Guardrail + Reasoning Guardrail**의 두 축으로 Agent Harness를 설계한다.

## 해결하려는 문제

Agent 세션 비용은 크게 두 종류로 나눌 수 있다.

| 비용 | 원인 | 대표 사례 | Context Routing 효과 |
|---|---|---|---|
| Context I/O Cost | 큰 파일·로그·Tool 응답을 메인 모델이 직접 읽음 | 1,348줄 task.md, 대형 MCP 응답 | 높음 |
| Reasoning Rework Cost | 잘못된 전제·가설로 수정/빌드/실행 반복 | enum 값 착각, root motion 가설 | 낮음 |

Spotify/Shunt는 첫 번째 문제에는 강하지만 두 번째 문제를 직접 해결하지 못한다.

실무에서는 토큰 비용뿐 아니라 다음 비용을 함께 봐야 한다.

- Main model input/output token
- Worker model token
- Tool round-trip latency
- Build/Test 시간
- Render/Editor 실행 시간
- 잘못된 수정의 rollback/rework
- 사람의 판단 및 대기 시간

## 핵심 원칙

### 1. Do not spend intelligence where determinism is available

LLM에게 넘기기 전에 grep, ripgrep, jq, Python, compiler, static analysis 등 결정론적 도구로 답을 얻을 수 있는지 확인한다.

```text
Deterministic Tool
  grep / rg / jq / python / compiler
            ↓ 불가능
Cheap Worker Model
            ↓ 부족
Main Reasoning Model
```

Cheap Model보다 더 싸고 빠른 계층은 deterministic tool이다.

### 2. Evidence before hypothesis commitment

가설 자체를 금지하지 않는다. 다만 가설을 기반으로 비용이 큰 작업을 수행하기 전에 가장 싼 관측으로 핵심 전제를 검증한다.

```text
Hypothesis
    ↓
Cheapest Observable Measurement
    ↓
Evidence
    ↓
Supported?
 ┌──┴──┐
 No   Yes
 ↓      ↓
Discard  Edit / Build / Render
```

### 3. Source beats memory

코드베이스에서 결정론적으로 확인 가능한 사실을 모델의 기억에 의존하지 않는다.

반드시 선언부 또는 원본을 확인할 대상:

- enum values
- API signatures
- default values
- configuration values
- inheritance
- ownership/lifetime
- call sites
- serialization/schema
- build flags

### 4. Shrink before context

큰 데이터를 메인 모델 컨텍스트에 넣기 전에 필요한 정보만 축소한다.

```text
Large Input
    ↓
Can deterministic extraction solve it?
 ┌──┴──┐
 Yes   No
 ↓      ↓
grep   Cheap Worker
python bulk-reader
 ↓      ↓
Evidence/Summary
      ↓
Main Agent
```

### 5. Expensive action requires stronger evidence

작업 비용이 커질수록 실행 전 요구하는 evidence 수준도 높인다.

예:

- grep/read: 낮은 검증 비용 → 바로 수행 가능
- Edit: 대상 코드 targeted read 후 수행
- Build: 변경 근거와 컴파일 영향 확인
- Render/Integration Test: 핵심 가설을 최소 측정으로 먼저 검증
- Submit/Deploy: Build/Test/Review 통과 후 수행

## 아키텍처

```text
                       Main Agent
                           │
              ┌────────────┴────────────┐
              │                         │
       Context Guardrail         Reasoning Guardrail
              │                         │
       "읽을 필요가 있나?"       "이 전제를 믿어도 되나?"
              │                         │
         PreToolUse                Investigation
              │                      Policy
      ┌───────┴────────┐        ┌──────┴─────────┐
      │                │        │                │
 Targeted Read     Large Read  Fact Verify    Hypothesis
      │                │        │                │
 Main Agent      deterministic 선언부 확인     최소 실측
                 extraction      │                │
                    ↓            └──── Evidence ──┘
               Cheap Worker              │
                    ↓                  Reason
                  Summary                 │
                                          Edit
                                           │
                                      Build/Test
```

## Context Guardrail

### Large Read 정책

350줄은 Spotify Shunt의 기본 아이디어에서 가져온 시작점일 뿐 절대값으로 취급하지 않는다. 프로젝트별로 조정 가능해야 한다.

```text
Read Request
    ↓
Offset/Limit specified?
 ┌──┴──┐
 Yes   No
 ↓      ↓
Allow  Check Size
           ↓
      <= threshold → Allow
      > threshold  → Block
                       ↓
               Extraction Router
```

### Extraction Router

대용량 입력을 바로 Worker LLM으로 보내지 않는다.

우선순위:

1. Grep / ripgrep
2. jq / structured query
3. Python aggregation
4. header/index extraction
5. targeted read
6. Cheap Worker bulk-reader
7. Main Agent direct read — 최후 수단

### Bash Read 감시

Read tool만 막으면 `cat`, `head`, `tail`, `less` 등으로 우회할 수 있으므로 PreToolUse에서 Bash 읽기도 감시한다.

단, `grep`, `rg`, 집계용 Python 등 데이터 축소 명령은 허용한다.

## Reasoning Guardrail

### Evidence-First Investigation Policy

Agent의 시스템 룰 또는 프로젝트 룰에 다음 정책을 둘 수 있다.

```text
1. 코드베이스에서 결정론적으로 확인 가능한 사실을 기억으로 가정하지 않는다.
2. enum/API/default/config/schema가 추론의 전제라면 원본 선언부를 확인한다.
3. Build/Render/Test 비용이 큰 가설은 가장 싼 observable measurement로 먼저 검증한다.
4. 가설이 반증되면 동일 가설의 변형을 바로 시도하지 않는다. Evidence를 갱신하고 새 가설을 세운다.
5. Edit 직전 정확한 대상 코드를 targeted read한다.
6. Edit가 anchor mismatch로 실패하면 동일한 큰 old_string을 반복하지 않고 더 짧고 고유한 anchor로 축소한다.
7. 실행 결과가 예상과 다르면 새로운 코드 변경 전에 현재 가설의 전제를 다시 검증한다.
```

### 가설 검증 예시

잘못된 흐름:

```text
"ESwapRootBone::None은 아마 0"
        ↓
Edit
        ↓
Build
        ↓
Render
        ↓
실패
        ↓
새 추측
        ↓
Build / Render 반복
```

Evidence-First:

```text
ESwapRootBone 값 필요
        ↓
rg ESwapRootBone
        ↓
선언부 Targeted Read
        ↓
실제 enum 값 확인
        ↓
Edit
        ↓
Build / Render
```

Root Motion과 같은 가설도 먼저 최소 계측을 추가해 예상 observable 값이 실제로 나타나는지 확인한 뒤 비용이 큰 검증으로 넘어간다.

## 편집 정책

기본적으로 편집은 Main Agent가 직접 수행한다.

이유:

- Worker 요약에는 정확한 코드 위치가 손실될 수 있다.
- 수정은 주변 context와 side effect를 이해해야 한다.
- 잘못된 수정의 rework 비용이 token 절감보다 클 수 있다.

단, 다음과 같은 **정형화된 반복 편집**은 별도 Worker 경로를 PoC할 가치가 있다.

- 동일 패턴 로그 추가
- 반복 boilerplate 생성
- 명확한 mechanical migration
- 이미 검증된 convention 반복

이 경우에도 다음 구조를 사용한다.

```text
Main Agent Spec
      ↓
Mechanical Edit Worker
      ↓
Pending Workspace / CL
      ↓
Diff
      ↓
Main Agent or Reviewer
      ↓
Build/Test
```

Worker가 바로 Submit/Deploy하지 않는다.

## 기존 세션에서 확인된 사례

### 이미 잘 동작한 패턴

- 수천~1만 줄 Gaudi.log를 통째로 읽지 않고 grep/Python 집계 후 결과만 확인
- 60K~125K 문자 MCP 응답을 파일 저장 후 필요한 부분만 검색
- 코드 편집 전 offset/limit targeted read
- 복잡한 UE/ImGui 디버깅은 Main Agent가 직접 추론
- p4-prep의 CL 분석/분류를 Subagent에 위임하고 정리된 결과만 Main Context로 반환

### Context Guardrail이 막을 수 있었던 사례

- `system-registry.md` 453줄 전체 Read — Infrastructure 섹션만 필요
- `task.md` 1,348줄 대량 Read — 25K token cap 이후에야 header grep + targeted read로 전환

### Reasoning Guardrail이 막을 수 있었던 사례

- ESwapRootBone enum 값을 기억에 의존해 잘못 가정하고 Render 반복
- Root Motion 가설을 최소 실측 전에 채택
- Edit old_string mismatch 후 재읽기/재시도 반복

## Hooks / Scripts / Skills

### Hooks — 강제 정책

- `check-file-size`
- `check-bash-read`
- 필요 시 expensive-action guard
- 기존 Perforce checkout hook과 같은 enforcement 계층에 배치

### Scripts — 결정론적 배관

- 파일 line/byte count
- grep/rg extraction
- structured data query
- Python aggregation
- Worker model invocation
- timeout/error unwrap
- token/latency logging

### Skills / Rules — Agent 행동 규율

- Evidence-First Investigation
- Large File Reading
- Hypothesis Validation
- Safe Editing
- Worker Delegation

Hook은 강제 가능한 정책에 사용하고, Reasoning Guardrail 전체를 억지로 Hook으로 구현하지 않는다. 가설의 품질은 의미론적 판단이 필요하므로 Rules/Skills와 Review가 더 적합하다.

## 측정 지표

도입 효과를 token만으로 평가하지 않는다.

권장 지표:

- Main model input tokens
- Worker tokens
- large-read block count
- deterministic extraction count
- Build/Test/Render 횟수
- hypothesis reversal count
- Edit retry count
- time-to-first-correct-hypothesis
- rework time
- task completion latency

특히 **Build/Render 횟수와 hypothesis reversal**은 Reasoning Rework Cost를 관찰하는 데 중요하다.

## 도입 우선순위

### P0 — Evidence-First Investigation Rule

즉시 적용 가능.

구현 비용이 낮고 잘못된 전제와 고비용 검증 반복을 직접 줄인다.

### P1 — Large Read PreToolUse Hook

PoC 가치 높음.

대형 Markdown, 로그, MCP dump 등의 직접 로드를 예방하고 targeted read 또는 extraction으로 전환한다.

### P2 — Extraction Router + Worker Infrastructure

PoC 가치 있음.

먼저 deterministic extraction을 시도하고 의미적 요약이 필요한 경우에만 cheap worker를 호출한다.

### P3 — Mechanical Edit Worker

제한적 PoC.

Perforce pending CL/workspace 격리, diff review, Build/Test가 갖춰진 경우에만 반복 편집을 위임한다.

## Enterprise / Windows / Perforce 적용

기존 Perforce checkout Hook 체계가 있다면 Large Read Guard도 같은 PreToolUse/PostToolUse 계층에 추가할 수 있다.

Perforce 환경에서는 Git worktree 대신 workspace 또는 pending CL을 isolation boundary로 사용할 수 있다.

```text
Main Agent
   │
   ├─ Context Guard
   ├─ Reasoning Guard
   │
   ├─ Project Agent
   │      ↓
   │   Perforce Workspace / Pending CL
   │
   ├─ Mechanical Worker
   │      ↓
   │   Isolated Pending CL
   │
   ├─ TeamCity Build/Test
   │
   └─ Codex/Reviewer
          ↓
        Submit
```

## Spotify Shunt와의 차이

Spotify 방식에서 가져오는 핵심:

- Main model context 보호
- PreToolUse enforcement
- large read routing
- cheap worker
- straight-to-disk 형태의 worker 활용

추가하는 핵심:

- deterministic extraction을 Worker보다 우선
- source-before-memory
- evidence-first hypothesis validation
- expensive-action barrier
- reasoning rework 비용 측정
- Perforce/TeamCity/Reviewer 기반 안전한 edit delegation

즉 이 Harness의 목표는 단순한 **Token Router**가 아니라 **Cost of Wrong Reasoning까지 줄이는 Agent Execution Policy**다.

## 결론

실제 개발 세션에서 가장 비싼 낭비는 항상 '비싼 모델이 값싼 일을 했다'에서 나오지 않는다. 잘못된 전제 하나가 여러 번의 Edit, Build, Render, Test를 유발하면 Context token 절감보다 훨씬 큰 비용이 발생할 수 있다.

따라서 최적화 원칙은 다음 세 문장으로 압축한다.

> **결정론적으로 알 수 있는 것은 Tool로 확인한다.**
>
> **큰 정보는 Context에 넣기 전에 축소한다.**
>
> **비싼 실험은 가장 싼 관측으로 가설을 검증한 뒤 수행한다.**

이 세 원칙을 Context Guardrail과 Reasoning Guardrail로 구조화하면 token 비용과 reasoning rework 비용을 함께 줄일 수 있다.

## 참고 자료

- Spotify Agent Architecture / Shunt 조사: `ai/harness/spotify-agent-architecture.md`
- 실제 Gaudi/UE/ImGui 개발 세션 회고를 기반으로 한 내부 분석
