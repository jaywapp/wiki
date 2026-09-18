---
title: AI Harness Token Scout - 2026-09-14
category: trend
updated: 2026-09-14
---

# AI Harness Token Scout - 2026-09-14

오늘의 핵심은 장기 세션 handoff를 계층형 artifact로 만들고, audit 및 evidence metadata를 모델이 실제 소비하는 context와 분리하는 방향이다.

## 주요 발견

### CCompactor
장기 agent transcript를 짧은 기본 handoff와 deterministic ledger, 필요 시 원문으로 돌아갈 수 있는 retrieval index로 분리한다. Perforce에서는 Pending CL과 depot revision을 durable identity로 사용해 적용할 수 있다.

### Docket
Agent가 만든 최종 diff에 edit provenance와 변경 이후 실행된 test, static check, coverage evidence를 연결한다. 내부 Harness에서는 Pending CL Evidence Collector 형태로 적용할 가치가 높다.

### Codex context 분리 패턴
Observability와 audit에 필요한 metadata를 durable ledger에는 보존하되 모델 inference와 compaction budget에는 필요한 projection만 제공하는 방향이 강화되고 있다.

### Step-level execution attribution
Multi-model workflow에서는 turn 전체보다 실제 tool 요청을 발행한 step의 model, effort, tool inventory, approval policy를 기록하는 것이 정확한 비용 및 evidence 분석에 유리하다.

### Context Strategy Routing
Task 성격에 따라 conservative, balanced, aggressive context reduction 정책을 선택하는 Context Router를 Model Router와 함께 운영하는 패턴을 검토할 가치가 있다.

## 적용 우선순위

1. Audit payload와 model-visible payload 분리
2. Structured layered handoff
3. Pending CL Evidence Collector
4. Step-level execution metadata
5. Task별 Context Strategy Router
