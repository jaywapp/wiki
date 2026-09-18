---
title: Flow Coding Harness
category: tools
tags:
  - ai
  - coding-agent
  - harness
  - context-engineering
  - memory
  - skills
source: https://github.com/samyakkkk/flow
updated: 2026-09-12
---

# Flow Coding Harness

> 여러 Coding Agent의 작업 흔적을 프로젝트 단위 `Brain`에 축적하고, 이를 구조화된 Notes·Knowledge Graph·Auto-Docs·Auto-Skills로 재사용하는 로컬 우선 Coding Harness.

## 프로젝트 개요

Flow는 T3 Code를 실행 UI/런타임 기반으로 사용하면서, 그 위에 장기 프로젝트 컨텍스트를 유지하는 `Brain` 계층을 결합한 오픈소스 Coding Harness다. Codex, Claude Code, Cursor, Grok Build, OpenCode, Google Antigravity 등 기존 CLI/계정을 그대로 사용하고, 에이전트 세션에서 이미 발생한 작업 증거를 프로젝트 지식으로 축적하는 방향을 택한다.

2026-09-11 기준 프로젝트는 Brain 기능을 전면에 내세우며, 단순 대화 저장이 아니라 검색 가능한 Knowledge Graph, Conversation Notes, Living Documentation, 재사용 가능한 Skills를 같은 프로젝트 컨텍스트로 관리한다.

## 해결하려는 문제

일반적인 Coding Agent 세션은 다음 문제가 있다.

- 세션이 바뀌면 이전 결정·시도·실패 원인을 다시 설명해야 한다.
- 긴 transcript 전체를 다시 넣으면 context/token 비용이 커진다.
- 단순 summary는 출처와 근거가 약해 시간이 지날수록 잘못된 기억이 누적될 수 있다.
- 별도 memory와 대화 기록을 동시에 유지하면 정보가 중복되고 수정이 어려워진다.
- agent가 만든 제안과 사용자가 직접 준 지침이 섞이면 잘못된 사용자 선호가 장기 기억으로 굳을 수 있다.

Flow PR #108은 이러한 문제를 이유로 기존 standalone memory write를 줄이고, revision·source citation을 가진 구조화된 Conversation Notes를 중심으로 이동했다.

## 핵심 기능

### 1. Project Brain

프로젝트마다 하나의 Brain을 두고 repository와 agent session에서 나온 정보를 결합한다.

```text
Repositories ──────────────┐
                           │
Agent Sessions ────────────┼──> Flow Brain
                           │      ├─ Knowledge Graph
                           │      ├─ Conversation Notes
                           │      ├─ Auto-Docs
                           │      └─ Auto-Skills
                           │
                           └──> Selective Context → Agent
```

핵심은 transcript를 그대로 영구 prompt로 사용하는 것이 아니라, 프로젝트 지식 계층을 만들고 다음 세션이 필요한 부분만 다시 조회하게 하는 것이다.

### 2. Structured Conversation Notes

2026-09-11 병합된 PR #108에서 Conversation Notes는 다음 종류로 구조화되었다.

- `continuation`: 다음 세션에서 바로 이어갈 내용
- `preference`: 사용자 지침/선호와 revision
- `log`: 작업 기록
- `finding`: 발견한 사실
- `legacy`: 이전 형식 호환용

Preference는 revision을 갖고, 일반 note entry는 source evidence 번호를 요구한다. 따라서 단순히 "모델이 그렇게 기억했다"가 아니라 어떤 증거에서 파생되었는지 추적할 수 있도록 설계했다.

### 3. Bounded Linked Retrieval

Notes는 검색용 chunk를 별도로 저작하지 않고 유지되는 Markdown Notes에서 파생한다. 특정 chunk를 조회할 때 연결된 chunk를 양방향으로 찾아오되 기본적으로 제한된 개수만 반환하도록 구현되어 있다.

```text
Selected Note
   │
   ├─ explicit outgoing references
   └─ explicit incoming references
           │
           └─ bounded result set
```

이 방식은 과거 대화 전체를 다시 prompt에 넣는 대신 현재 작업과 직접 연결된 기록만 가져오는 selective context 전략으로 볼 수 있다.

### 4. Versioned Auto-Docs / Auto-Skills

Auto-Docs와 Auto-Skills도 같은 versioned document mechanism을 사용한다. 즉 장기 지식이 memory, docs, skills마다 완전히 별도 저장 방식으로 흩어지지 않도록 통합하려는 방향이다.

### 5. Source-aware Attribution

사용자 선호로 기록하려면 직접적인 human evidence가 있거나 특정 제안을 사용자가 명시적으로 수락한 근거가 있어야 한다. 근거 없는 user attribution은 전파하지 않고 수정하는 것을 목표로 한다.

이 부분은 장기 Agent Harness에서 중요한 방어 장치다. Agent가 스스로 만든 판단을 "사용자 규칙"으로 승격시키면 다음 세션부터 오류가 구조적으로 증폭되기 때문이다.

## 아키텍처

Flow의 현재 integration boundary는 다음처럼 정리할 수 있다.

```text
               T3 Code UI / Runtime
                       │
           Host Brain Adapters
                       │
              flow-t3/shared
       ┌───────────────┼───────────────┐
       │               │               │
    Gateway       Orchestrator       Prompts
       │               │               │
       └───────────────┼───────────────┘
                       │
           Local Brain Services
              ├─ FalkorDB
              ├─ Embedding Service
              └─ per-Brain SQLite Store
                       │
                  Agent Context
```

로컬 host는 하나의 FalkorDB process와 embedding service를 소유하고, 각 Brain은 독립 graph와 memory SQLite store를 가진다. Session/index worker는 동일 DB socket과 embedding endpoint를 공유한다.

## 토큰·컨텍스트 절감 원리

Flow는 현재 공개 자료에서 명확한 before/after token benchmark를 제시하지 않는다. 따라서 정량 절감률을 주장할 근거는 부족하다.

다만 구조적으로 다음 비용을 줄일 가능성이 있다.

1. **Transcript replay 감소**: 전체 과거 대화 대신 structured note를 조회한다.
2. **Bounded retrieval**: 연결된 note라도 무제한 재귀 로드하지 않는다.
3. **Progressive knowledge promotion**: 반복되는 작업 지식을 Auto-Docs/Skills로 승격해 매번 재탐색하는 비용을 줄인다.
4. **Source citation**: 잘못된 기억을 다시 검증하기 위해 장시간 탐색하는 비용을 줄일 수 있다.

반대로 Knowledge Graph 구축, embedding, passive curation 자체에도 로컬 compute와 추가 agent/model 호출 비용이 발생할 수 있다. 따라서 실제 효율은 `retrieval로 줄어든 재탐색 비용 - curation/indexing 비용`으로 측정해야 한다.

## 장점

- Claude Code와 Codex 등 여러 coding runtime 위에 공통 project memory를 둘 수 있다.
- Session transcript와 durable project knowledge를 분리한다.
- revision과 evidence를 통해 장기 기억의 수정 가능성과 추적성을 높인다.
- Notes → Docs → Skills의 knowledge promotion 방향이 장기 프로젝트와 잘 맞는다.
- 로컬 우선이라 소스코드와 agent process를 로컬에 유지할 수 있다.
- context를 단순 summary가 아니라 source-linked 구조로 관리한다.

## 단점 및 한계

- 프로젝트가 아직 초기 단계이며 README도 rough edges와 frequent changes를 명시한다.
- 2026-09-11 PR #108 시점에 historical regeneration runner는 완성되지 않았다.
- Cross-chat semantic retrieval 전체 기능은 해당 변경 범위 밖이라고 명시되어 있다.
- 공개된 토큰 절감 benchmark가 없어 비용 효과를 정량적으로 평가하기 어렵다.
- FalkorDB + embedding service + SQLite라는 별도 운영 계층이 생긴다.
- Git/worktree 중심의 UI/운영 요소가 있어 Perforce 환경에서는 adapter가 필요하다.
- README 기준 Windows native installer는 아직 Planned 상태다.
- 자동 생성 Skill/Doc가 품질 검증 없이 축적되면 오래된 규칙이 오히려 agent를 오염시킬 수 있다.

## 활용 사례

### 여러 Coding Agent 사이의 장기 Handoff

Claude Code에서 분석한 뒤 Codex로 구현/리뷰를 넘길 때 transcript 전체 대신 동일 Project Brain에서 현재 작업의 continuation, finding, evidence를 재구성한다.

### 대형 코드베이스의 재탐색 감소

한 번 발견한 service 관계나 API 구조를 graph/document로 유지하고 다음 세션은 필요한 항목만 조회한다.

### 반복 작업을 Skill로 승격

반복되는 build/debug/release 패턴을 수동으로 긴 지침 파일에 계속 추가하기보다 검증된 패턴만 reusable Skill로 승격하는 구조에 참고할 수 있다.

## 기존 도구와 비교

| 접근 | Durable State | Retrieval | 지식 승격 | 특징 |
|---|---|---|---|---|
| 일반 CLAUDE.md / AGENTS.md | 파일 | 전체 upfront 중심 | 수동 | 단순하지만 고정 context 증가 |
| Session summary | summary | summary 전체 | 없음 | 저렴하지만 근거 손실 가능 |
| RAG/Memory MCP | 외부 store | semantic retrieval | 보통 별도 | 도구별 구현 차이 큼 |
| Flow Brain | graph + notes + docs/skills | bounded/source-linked | Auto-Docs/Auto-Skills | Coding Harness와 memory가 통합됨 |

## Perforce + Claude Code + Codex 적용 아이디어

직접 Flow를 도입하기보다 `Brain`의 설계 원칙을 기존 Harness에 옮기는 PoC가 더 현실적이다.

```text
Pending CL / Task ID
        │
        ├─ continuation.md
        ├─ findings.md (evidence required)
        ├─ decisions.md (revisioned)
        └─ work-log
                │
         Knowledge Promotion
          ├─ Project Docs
          └─ Verified Skills
                │
        Selective Retrieval
                │
        Claude / Codex Adapter
```

Perforce에서는 evidence identity를 Git commit 대신 다음처럼 둘 수 있다.

```text
//depot/path/file.cpp#revision
PendingCL:123456
Build:<TeamCity build id>
Test:<suite/result id>
```

특히 다음 세 가지를 작은 PoC로 가져올 가치가 높다.

1. **Revisioned instruction**: 프로젝트 규칙이 바뀌면 과거 규칙을 덮어쓰기보다 revision으로 관리.
2. **Evidence-required finding**: 장기 finding은 depot revision/build/test evidence가 없으면 durable memory로 승격하지 않음.
3. **Bounded linked retrieval**: task handoff 시 연관 note 최대 N개만 주입하고 필요할 때 추가 조회.

## 활용 아이디어 평가

- **바로 적용 가능:** durable finding에 evidence/source ID를 강제하는 규칙
- **PoC 가치 있음:** Pending CL 기반 structured notes + bounded linked retrieval
- **PoC 가치 있음:** 반복 검증된 notes를 Project Skill로 승격하는 pipeline
- **아이디어 참고:** FalkorDB 기반 Knowledge Graph 전체 도입
- **현재 도입 가치 낮음:** Flow Desktop 자체를 회사 Perforce/Windows 환경의 기본 Harness로 즉시 교체

## 결론

Flow의 가장 중요한 아이디어는 "긴 대화를 잘 요약한다"가 아니라 **세션에서 나온 증거를 수정 가능한 프로젝트 지식으로 승격하고 다음 Agent가 필요한 조각만 다시 가져오게 한다**는 점이다.

현재 Perforce + Claude Code + Codex Harness에는 Flow 전체를 도입하기보다 `revisioned note + evidence + bounded retrieval + verified skill promotion` 네 가지 패턴을 흡수하는 것이 비용과 운영 복잡도 측면에서 더 적절하다.

## 참고 자료

- Repository: https://github.com/samyakkkk/flow
- README: https://github.com/samyakkkk/flow/blob/main/README.md
- Structured Notes / Auto-Docs / Auto-Skills PR #108: https://github.com/samyakkkk/flow/pull/108
- Flow Brain integration boundary: https://github.com/samyakkkk/flow/blob/main/flow-t3/README.md
