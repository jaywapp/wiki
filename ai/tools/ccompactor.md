---
title: CCompactor
category: tools
tags:
  - ai
  - agent
  - context-engineering
  - handoff
  - claude-code
  - codex
  - pi
  - token-optimization
source: https://github.com/ccompactor/ccompactor
updated: 2026-09-14
---

# CCompactor

> Claude Code·Codex·Pi의 장기 세션 transcript를 그대로 넘기지 않고, deterministic ledger + 계층형 compact artifact + provenance pointer + 필요 시 원문 retrieval로 다른 Agent가 이어받게 만드는 세션 handoff 도구.

## 프로젝트 개요

CCompactor는 2026-09-12 공개된 TypeScript CLI다. Claude Code/OpenClaude, Codex CLI, Pi가 로컬에 남긴 transcript를 읽고 공통 IR/ledger로 변환한 뒤 다른 Coding Agent가 이어서 작업할 수 있는 handoff artifact를 만든다.

2026-09-13 기준 v0.1.16이 공개되었고, Windows x64/arm64를 포함한 standalone binary도 제공한다. 저장소는 `adapters`, `artifact`, `compact`, `ledgers`, `handoff`, `bench`, `skill`, `triage`, `tui` 등으로 분리되어 있어 README 수준의 wrapper가 아니라 실제 세션 변환·검증 파이프라인을 구현하고 있다.

## 해결하려는 문제

장기 Coding Agent 작업을 다른 세션이나 다른 Agent로 넘길 때 흔히 두 극단이 생긴다.

- 전체 transcript를 넘겨 토큰을 과도하게 사용한다.
- 마지막 몇 turn 또는 자유형 summary만 넘겨 오래된 결정·제약·실패 이력을 잃는다.

CCompactor는 transcript 자체는 source of truth로 남겨두고, successor Agent에는 작은 handoff artifact와 원문으로 돌아갈 수 있는 provenance pointer를 제공하는 중간 방식을 택한다.

## 핵심 기능

### 1. Agent별 Transcript Adapter

Claude Code, Codex CLI, Pi의 서로 다른 local session format을 adapter로 읽고 공통 구조로 정규화한다. Agent별 차이는 입력 adapter에 가두고 이후 ledger/compact/handoff 단계는 공통 처리한다.

### 2. Deterministic-first Handoff

`--llm none`으로 모델 호출 없이도 완전한 artifact를 만들 수 있다. 프로젝트가 공개한 실제 측정에서는 103,757-event 세션을 약 4,050-token artifact로 2초 안에 변환했다고 보고한다.

핵심은 먼저 모델에게 전체 transcript를 요약시키는 방식이 아니라 deterministic ledger를 만들고 필요한 경우에만 LLM narration을 얹는 것이다.

### 3. Progressive Disclosure 4-Layer Artifact

```text
Raw Agent Transcript
        │
        ▼
Agent Adapter / Common IR
        │
        ├─ File Ledger
        ├─ Command Ledger
        ├─ Error Signatures
        └─ Tool Census
        │
        ▼
Handoff Artifact
  ├─ L0 Brief
  │    goal / hard constraints / last commands / verify-first
  ├─ L1 Continuation Summary
  │    optional model-written narrative
  ├─ L2 Deterministic Ledgers
  │    files / commands / errors / tools
  └─ L3 Retrieval Index
       omitted episodes → event ranges
```

Reader는 L0만으로 충분하면 멈추고, 부족하면 L2 또는 L3로 내려간다. 이는 upfront context를 최소화하면서 필요한 정보만 점진적으로 가져오는 progressive disclosure 패턴이다.

### 4. Provenance-linked Retrieval

Artifact의 claim은 transcript event range를 가리키며 `expand`로 실제 원문 event를 다시 조회할 수 있다. Summary가 source of truth가 아니라 derived view이고 원본은 다시 확인할 수 있다는 점이 중요하다.

### 5. Verify / Handoff

`verify`는 artifact schema뿐 아니라 quote가 실제 transcript에 존재하는지, 파일이 여전히 존재하는지 등을 다시 검사한다. `handoff --to`는 결과를 Claude/Codex/Pi로 전달해 후속 Agent를 실행한다.

## 토큰·컨텍스트 절감 원리

CCompactor의 절감 포인트는 단순 요약이 아니라 다음 구조에 있다.

1. 전체 transcript 대신 작은 L0/L1만 기본 주입한다.
2. 파일·명령·오류는 자연어 서술보다 deterministic ledger로 압축한다.
3. 누락된 episode를 버리지 않고 event pointer로 L3에 남겨 필요할 때만 조회한다.
4. 모델 요약은 선택 사항이므로 handoff 생성 자체에 별도 inference 비용이 필수적이지 않다.
5. successor가 다시 프로젝트를 처음부터 탐색하는 turn을 줄이는 것을 목표로 한다.

프로젝트의 `bench`는 `none / tail / artifact / retrieval` arm을 비교한다. 자체 세션에서는 `none`과 `tail`이 거의 답하지 못하고 artifact가 약 1/4, retrieval이 그보다 대략 두 배 수준이라고 설명한다. 다만 과거 sctxx와의 직접 비교는 질문 집합이 달라 프로젝트 스스로 철회했다. 실제로 공통 22문항만 비교하면 sctxx 14/22, CCompactor 3/22로 CCompactor가 뒤진다고 명시한다. 따라서 정량 성능은 아직 성숙했다고 보기 어렵다.

## 장점

- Claude↔Codex처럼 Runtime이 달라도 동일한 handoff contract를 사용할 수 있다.
- transcript 전체를 successor context에 넣지 않아도 된다.
- deterministic-first라 summary hallucination 의존도를 줄인다.
- provenance pointer가 있어 compact 결과에서 원문으로 되돌아갈 수 있다.
- 모델/API 없이 로컬에서 artifact 생성이 가능하다.
- Windows standalone binary가 있어 Windows 개발 환경에서 PoC하기 쉽다.
- benchmark가 불리한 결과도 숨기지 않고 공개해 현재 한계를 판단하기 쉽다.

## 단점 및 한계

- 매우 신생 프로젝트이며 장기간 운영 안정성은 확인되지 않았다.
- 프로젝트 자체 benchmark에서 retrieval 성능이 경쟁 방식보다 낮은 사례가 있다.
- local transcript format이 Claude/Codex 업데이트로 바뀌면 adapter 유지보수가 필요하다.
- artifact가 작아도 필요한 사실이 retrieval loop에서 늦게 발견되면 추가 turn 비용이 생긴다.
- transcript 자체에 잘못된 Agent 판단이 있으면 deterministic ledger도 그 사실을 자동 검증하지는 않는다.
- Perforce task/Pending CL identity는 기본 지원 대상이 아니다.

## Perforce + Claude Code + Codex 적용

CCompactor 전체를 그대로 도입하는 것보다 handoff architecture를 내부 Harness에 이식할 가치가 높다.

```text
Pending CL / Task ID
        │
        ├─ Claude Session
        ├─ Codex Session
        └─ Tool/Event Ledger
               │
               ▼
        Common Handoff IR
               │
   ┌───────────┼───────────┐
   │           │           │
 L0 Brief    L2 Ledger   L3 Evidence Index
   │           │           │
   └───────────┴─────┬─────┘
                     ▼
            Successor Runtime
             Claude / Codex
                     │
          need more evidence?
                     │
               bounded expand
```

Git commit 대신 `PendingCL`, `depot path#revision`, `workspace`, `p4 opened`, build/test evidence를 common IR의 durable identity로 사용하면 된다.

추천 schema는 다음 정도다.

```text
task_id
pending_cl
goal
hard_constraints[]
completed_outcomes[]
changed_files[]
last_commands[]
errors[]
evidence_refs[]
next_action?
source_event_ranges[]
```

## 활용 아이디어

**바로 적용 가능:** handoff를 L0/L1/L2/L3로 계층화하고, 모든 compact claim에 원문 evidence pointer를 남기는 설계 원칙.

**PoC 가치 있음:** Claude 세션과 Codex 세션을 공통 IR로 변환하고 Pending CL별 `.ai/handoff/` artifact를 만드는 작은 exporter. successor는 L0만 우선 읽고 부족할 때 `expand`한다.

**아이디어 참고:** deterministic ledger를 기반으로 한 `Session Close` 단계. 자연어 summary보다 파일/명령/오류/검증을 먼저 구조화한 뒤 optional narrative를 생성한다.

**현재는 도입 가치 낮음:** CCompactor의 benchmark 수치를 근거로 전체 handoff engine을 바로 표준화하는 것. 프로젝트 자체도 아직 retrieval 품질 개선이 필요하다고 보여준다.

## 결론

CCompactor의 가장 큰 가치는 특정 CLI가 아니라 **“전체 transcript → summary” 대신 “durable transcript → deterministic ledger → 작은 handoff → bounded rehydration”**으로 handoff를 재설계한 점이다. 현재 Perforce + Claude Code + Codex Harness에서 세션 교체 비용과 토큰 사용을 동시에 줄이려면 충분히 PoC할 가치가 있다.

**평가: 🟡 PoC 가치 높음**

## 참고 자료

- Repository: https://github.com/ccompactor/ccompactor
- Package README / benchmark: https://github.com/ccompactor/ccompactor/blob/main/packages/ccompactor/README.md
- Specification: https://github.com/ccompactor/ccompactor/blob/main/SPEC.md
- Latest checked release: https://github.com/ccompactor/ccompactor/releases/tag/v0.1.16
