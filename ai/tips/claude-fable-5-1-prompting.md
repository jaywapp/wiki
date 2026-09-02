---
title: Claude Fable 5.1 Prompting Guide
category: tips
tags:
  - ai
  - claude
  - fable
  - prompt-engineering
  - agent
  - harness
source: https://platform.claude.com/docs/ko/build-with-claude/prompt-engineering/prompting-claude-fable-5-1
updated: 2026-09-02
---

# Claude Fable 5.1 Prompting Guide

> Claude Fable 5.1은 장기 에이전트 작업에 강하지만, `effort` 선택·도구 호출 병렬화·append-only 대화 기록·자율 완료 지시를 하네스에서 명시적으로 설계해야 비용과 지연을 줄이면서 성능을 제대로 끌어낼 수 있다.

## 프로젝트 개요

Anthropic이 2026-09-01 공개한 Claude Fable 5.1의 모델별 프롬프팅 가이드다. 일반적인 프롬프트 작성법보다는 Fable 5.1을 코딩 에이전트, 리서치 에이전트, 장기 실행 하네스에서 운용할 때 나타나는 행동 차이와 보정 패턴을 다룬다.

Fable 5.1은 1M context, 최대 128K output, adaptive thinking을 지원하며 기본 effort는 `high`다. 공식 문서는 기존 Fable 5 프롬프트가 대부분 그대로 동작하지만, 에이전트 실행기 수준에서 조정할 부분이 있다고 설명한다.

## 해결하려는 문제

Fable 5.1을 기존 Claude 하네스에 단순 교체하면 다음과 같은 비효율이 생길 수 있다.

- 작업 난이도와 관계없이 높은 effort를 사용해 비용과 latency가 커짐
- 긴 tool chain 동안 사용자에게 진행 상황이 잘 보이지 않음
- 암시된 독립 tool call을 한 번에 하나씩 실행해 round trip이 증가함
- 이전 conversation turn을 수정하는 하네스가 thinking block binding과 prompt cache를 깨뜨림
- 긴 autonomous task 도중 다음 단계 수행 대신 사용자에게 다시 허락을 구함
- 작은 코드 변경에도 파일 전체를 재작성해 output token이 증가함
- `low` effort에서 최신 AI/개발도구 정보를 검색하지 않고 기억에 의존할 가능성이 높음
- subagent가 실행되는 동안 lead agent가 기다려 전체 wall-clock time이 늘어남

즉 핵심은 **좋은 사용자 프롬프트 하나를 만드는 것보다 Fable 5.1의 실행 특성을 하네스에 맞추는 것**이다.

## 핵심 기능 및 프롬프팅 패턴

### 1. Effort를 모델 라우팅 축으로 사용

지원 수준은 `low`, `medium`, `high`, `xhigh`, `max`이며 기본값은 `high`다.

Anthropic은 모델 버전이 바뀌면 동일 effort 이름도 동일한 thinking 양을 뜻하지 않으므로 자체 eval로 다시 sweep할 것을 권장한다. 공식 설명상 `medium`은 많은 작업에서 Fable 5 수준의 결과를 더 낮은 비용으로 낼 수 있고, `low`도 작은 모델을 높은 effort로 사용하는 경우와 비교할 가치가 있다.

실무적으로는 모델 자체를 교체하는 라우팅뿐 아니라 같은 Fable 5.1 안에서 effort를 동적으로 선택하는 라우터를 두는 것이 유용하다.

예시:

```text
단순 조회/분류/요약     -> low
일반 구현/코드 수정     -> medium
복잡한 분석/설계        -> high
난해한 디버깅/장기 계획 -> xhigh
최고 난도 제한적 작업   -> max
```

단, `low`는 검색/조회 tool을 덜 호출할 수 있으므로 최신성이 중요한 작업에는 별도 search policy가 필요하다.

### 2. 독립 Tool Call을 한 턴에 배치

Fable 5.1은 명시된 병렬 호출은 잘 처리하지만 코딩/컴퓨터 사용 루프에서 작업상 암시된 독립 호출을 턴당 하나씩 요청할 수 있다.

공식 가이드의 핵심 넛지는 다음 의미다.

```text
다음에 필요한 항목을 먼저 내부적으로 정리하고,
서로 의존하지 않는 항목은 같은 응답에서 모두 요청한다.
```

파일 여러 개 읽기, 여러 검색 수행, 독립된 상태 조회 등을 병렬화하면 품질 변화 없이 tool round trip과 실제 완료 시간을 줄일 수 있다.

### 3. Conversation History를 Append-only로 유지

Fable 5.1의 thinking block은 생성 당시의 정확한 conversation prefix와 결합될 수 있다. 따라서 하네스가 이전 메시지를 수정하거나 중간 system prompt를 갈아끼우는 방식은 피하는 것이 좋다.

권장 구조:

```text
System
  ↓
User request
  ↓
Assistant(thinking + tool_use)
  ↓ append
User(tool_result)
  ↓ append
Assistant(...)
```

핵심 규칙:

- assistant turn은 thinking block을 포함해 반환된 그대로 저장
- 이전 turn을 삭제/수정하지 않음
- turn별 지시는 mid-conversation / turn-scoped system message 사용
- compaction은 서버 측 기능을 우선 사용
- client compaction을 직접 한다면 과거 기록을 억지로 편집하지 말고 `summary + new user turn`으로 새 context를 시작

이 패턴은 thinking binding뿐 아니라 prompt cache 효율에도 중요하다.

### 4. Autonomous Completion을 명시

장기 작업에서는 모델이 이미 요청된 다음 단계를 실행하지 않고 "진행할까요?"라고 멈추는 경우가 있다.

하네스의 system prompt에는 다음 원칙을 두는 것이 좋다.

- 원 요청에서 자연스럽게 이어지는 reversible action은 추가 허락 없이 진행
- destructive action 또는 실제 scope change에서만 정지
- 종료 전 아직 수행하지 않은 계획이나 next step이 남아 있으면 가능한 작업을 먼저 수행
- 한 부분이 막혀도 독립적인 나머지 작업은 완료
- 사용자의 원 요청 자체를 deliverable scope로 유지

이 지시는 비동기 코딩 에이전트나 사람이 계속 지켜보지 않는 Agent Team에서 특히 중요하다.

### 5. 변경 범위를 명시적으로 제한

Fable 5.1은 요청된 기능 주변의 버그나 정리할 코드까지 손대는 경향이 있을 수 있다.

권장 정책:

- 요청하지 않은 기존 버그/성능 문제는 필수 의존성이 아니면 수정하지 않음
- 발견 사항은 최종 summary의 follow-up으로 보고
- ambiguity가 있으면 주변 코드와 요청 문구가 가장 직접적으로 지지하는 해석 하나만 구현
- scratch verification을 영구 테스트 파일로 과도하게 승격하지 않음
- repository의 기존 테스트 관례와 요청 범위에 맞는 focused test만 유지

Enterprise 코드베이스에서 diff 크기와 review 부담을 통제하는 데 유용하다.

### 6. 작은 수정은 Surgical Edit 우선

Fable 5.1은 작은 변경에도 파일 전체를 재작성할 가능성이 있다. 결과가 같다면 targeted edit을 우선하도록 지시하는 것이 output token과 시간을 줄인다.

특히 대형 C#/C++ 파일, Unreal 프로젝트 설정, CI 설정 파일에서 효과가 크다.

### 7. `low` Effort에서는 Search Policy 보강

`low` effort는 검색/조회 도구 호출 빈도가 낮아질 수 있다. AI 모델, SDK, 개발도구처럼 수개월 안에 정보가 바뀌는 영역은 이름을 알고 있다는 이유로 검색을 생략하지 않도록 명시하는 것이 좋다.

권장 정책:

```text
최신성이 높은 AI 모델/개발도구/서비스 이름이 핵심이면
기억에 익숙하더라도 검색으로 현재 상태를 검증한다.
사용자가 입력한 정확한 이름을 검색어 중 하나에 포함한다.
```

### 8. Subagent와 Lead Agent를 동시에 일하게 하기

공식 가이드에서 실무 가치가 큰 부분이다. subagent를 실행한 뒤 lead agent가 결과가 올 때까지 idle하지 않도록 하네스를 설계한다.

```text
Lead Agent
 ├─ spawn Research Agent ─────────────┐
 ├─ spawn Codebase Agent ──────────┐  │
 ├─ 자신의 분석/구현 계속 수행     │  │
 │                                  │  │
 ├─ receive Codebase result <───────┘  │
 ├─ 통합 작업                          │
 └─ receive Research result <──────────┘
```

구현 조건:

1. subagent spawn tool은 즉시 반환
2. 결과가 준비되면 이후 user/tool-result 메시지로 lead에게 전달
3. 정말 기다려야 할 때만 사용하는 별도 wait/join tool 제공

이는 품질과 token 사용량을 크게 바꾸지 않으면서 평균 wall-clock time을 줄이는 방향이다.

### 9. 긴 출력에서 `xhigh`/`max` 남용 금지

`xhigh`와 특히 `max`는 긴 deliverable을 쓰기 전에 더 오래 생각할 수 있어 긴 문서/대형 코드 파일에서는 token budget을 빠르게 소비할 수 있다.

따라서 긴 결과물은 우선 `high`에서 시작하고 eval로 품질 이득이 확인될 때만 상향하는 편이 좋다. `max_tokens`는 최종 답변뿐 아니라 thinking까지 포함하는 총 budget이라는 점을 하네스에서 고려해야 한다.

### 10. Progress Update 표시

긴 tool chain에서 Fable 5.1은 사용자 대상 진행 설명을 덜 생성할 수 있다. API에서 thinking progress update를 표시하려면 관련 display 설정을 사용하고, UI가 tool output을 숨긴다면 사용자가 알아야 할 결과를 최종 응답에 다시 포함하도록 지시한다.

## 아키텍처

Fable 5.1에 적합한 에이전트 하네스는 다음 형태로 볼 수 있다.

```text
User Request
     │
     ▼
Task / Effort Router
     │
     ├── low / medium / high / xhigh / max
     ▼
Lead Fable 5.1 Agent
     │
     ├── Parallel Tool Calls
     ├── Async Subagents
     ├── Search/Retrieval Policy
     └── Surgical File Editor
     │
     ▼
Append-only Conversation Store
     │
     ├── thinking blocks preserved
     ├── tool results appended
     └── compaction boundary 관리
     │
     ▼
Verification / Summary
```

핵심은 **Prompt + Runtime Policy + Conversation Store + Tool Scheduler**를 하나의 설계 문제로 보는 것이다.

## 장점

- 복잡한 장기 에이전트 작업에 맞는 구체적인 운영 패턴을 공식적으로 제공한다.
- effort routing으로 품질/비용/latency를 같은 모델 안에서 조정할 수 있다.
- 병렬 tool call과 async subagent 패턴은 Agent Team의 wall-clock time 개선에 직접 연결된다.
- append-only history 규칙은 prompt caching과 thinking continuity를 함께 고려하게 한다.
- scope control과 surgical edit 지침은 대규모 실무 repository에서 불필요한 diff를 줄이는 데 유용하다.

## 단점 및 한계

- 일부 기능은 beta header와 API 옵션에 의존하므로 자체 하네스 구현 복잡도가 증가한다.
- effort별 최적점은 Anthropic의 일반 권장값만으로 결정할 수 없고 조직별 eval이 필요하다.
- `low` effort의 search 감소처럼 effort에 따라 행동 특성이 달라져 단순한 비용 라우팅만으로는 부족하다.
- append-only history 요구는 기존에 turn을 재작성하거나 임의 trimming하는 conversation manager와 충돌할 수 있다.
- Fable 5.1 자체가 고가 모델이므로 단순 작업까지 일괄 적용하면 비용 효율이 낮다.
- 모델별 프롬프트 튜닝을 하네스에 많이 넣을수록 향후 모델 교체 시 migration layer 관리가 필요하다.

## 활용 사례

### 비동기 코딩 Agent

요구사항 분석 → 여러 파일/문서 병렬 조회 → 구현 → 검증 → 요약까지 중간 승인 없이 수행하는 장기 작업에 적합하다.

### Agent Team

Lead가 research/codebase/test subagent를 비동기로 실행하고 자신도 계속 작업하는 구조에 적합하다.

### 대형 Repository 수정

surgical edit과 scope control을 system policy로 넣어 AI가 인접 코드를 과도하게 수정하는 것을 억제할 수 있다.

### 기술 조사 Agent

최신 AI/개발도구는 low effort에서도 강제 검색하고, 여러 원본 문서를 병렬 조회하도록 설계하면 조사 latency를 줄일 수 있다.

## 기존 방식과 비교

| 항목 | 단순 Claude 호출 | Fable 5.1 최적화 Harness |
|---|---|---|
| 사고량 | 고정/기본값 의존 | task별 effort routing |
| Tool 호출 | 모델 기본 행동 의존 | 독립 호출 batching |
| Subagent | 실행 후 대기하기 쉬움 | async spawn + lead 지속 작업 |
| History | trimming/수정 가능 | append-only 중심 |
| 파일 수정 | whole-file rewrite 가능 | surgical edit 우선 |
| 작업 종료 | 중간 확인 요청 가능 | autonomous completion policy |
| 최신 정보 | 모델 판단에 의존 | low effort search policy 보강 |

## 활용 아이디어

### 바로 적용 가능

현재 Claude 기반 코딩/업무 Agent system prompt에 다음 네 가지를 우선 반영할 가치가 높다.

1. 이미 승인된 reversible step은 끝까지 수행
2. 서로 독립적인 tool call은 한 턴에 batch
3. 요청 범위 밖 수정 금지
4. 작은 변경은 surgical edit

프롬프트 몇 줄만으로 적용 가능하고 하네스 구조 변경이 적다.

### PoC 가치 있음

#### Effort Router

작업 분류 결과에 따라 `low → medium → high`를 기본 라우팅하고, 실패/난이도 신호가 있을 때만 `xhigh/max`로 escalation하는 방식을 평가한다.

측정 지표:

- task success rate
- 평균 input/output token
- wall-clock latency
- tool-call round trip 수
- 재작업률

#### Async Subagent Runtime

Agent Team에서 subagent spawn을 non-blocking으로 바꾸고 lead agent가 병렬로 분석/구현을 진행하도록 한다. 현재 멀티 에이전트 구조에서 가장 직접적인 성능 개선 후보 중 하나다.

#### Append-only Context Manager

conversation history를 immutable event log처럼 저장하고 compaction 시 새 context boundary를 만드는 방식을 검토한다. 장기적으로 Claude뿐 아니라 다른 모델의 agent trace/replay에도 활용할 수 있다.

### 아이디어 참고

progress update, mannered prose 제거, formatting 보정은 사용자 경험 개선에는 유용하지만 core agent architecture보다 우선순위는 낮다.

### 현재는 도입 가치 낮음

모든 작업을 `xhigh/max`로 고정하는 방식은 권장하기 어렵다. 긴 output에서는 thinking이 token budget과 latency를 크게 사용할 수 있고, 공식 가이드도 `high`에서 시작해 eval로 이득이 확인된 경우에만 올리도록 권한다.

## 결론

이 문서의 핵심은 "Fable 5.1용 마법의 프롬프트"가 아니다. **에이전트 하네스를 Fable 5.1의 실행 특성에 맞게 설계하라**는 운영 가이드에 가깝다.

실무 우선순위를 잡으면 다음 순서가 적절하다.

1. autonomous completion + scope control system prompt 적용
2. tool call batching
3. surgical edit
4. task별 effort routing eval
5. append-only conversation 관리
6. async subagent runtime

특히 여러 에이전트를 조합하는 개발 생산성 환경에서는 `effort router + parallel tools + async subagents + append-only context` 조합이 Fable 5.1 활용의 핵심 패턴이 될 가능성이 높다.

## 참고 자료

- Anthropic, Claude Fable 5.1 Prompting Guide: https://platform.claude.com/docs/ko/build-with-claude/prompt-engineering/prompting-claude-fable-5-1
- Anthropic, Claude Fable 5.1 Overview: https://platform.claude.com/docs/en/models/fable-5-1/overview
- Anthropic, Prompting Best Practices: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
