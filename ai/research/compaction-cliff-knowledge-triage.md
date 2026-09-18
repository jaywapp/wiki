---
title: The Compaction Cliff / Knowledge Triage
category: research
tags:
  - ai
  - agent
  - context-engineering
  - compaction
  - token-optimization
  - claude-code
source: https://arxiv.org/abs/2608.22752
updated: 2026-09-13
---

# The Compaction Cliff / Knowledge Triage

> **한줄 요약:** 장기 Agent의 Context를 타입 구분 없이 반복 요약하면 hard rule이 급격히 사라질 수 있으며, `Constraint / Procedural / Belief / Preference / Episodic` 타입별 보존 정책을 적용하면 compaction·decomposition·retrieval을 더 안전하고 저렴하게 만들 수 있다는 실증 연구다.

## 프로젝트 개요

`The Compaction Cliff in Long-Running AI Agent Memory`는 2026 CIKM 논문으로, long-running agent에서 context compaction이 안전 규칙과 운영 규칙을 얼마나 잘 보존하는지 측정하고 `Knowledge Triage`라는 type-aware context management 방식을 제안한다.

공개 reference implementation과 companion Agent Skill도 제공된다.

- Paper: https://arxiv.org/abs/2608.22752
- Reference implementation: https://github.com/searchsim-org/cikm26-knowledge-triage
- Claude Code / Agent Skill: https://github.com/searchsim-org/knowledge-triage-skill

## 해결하려는 문제

일반적인 context compaction은 대화 기록, 사실, 사용자 선호, exact command, safety rule을 동일한 요약 대상처럼 취급한다.

하지만 정보마다 허용 가능한 왜곡 수준이 다르다.

```text
"지난번 빌드는 성공했다"
→ 요약/삭제 가능

"prod에서는 migration을 절대 실행하지 않는다"
→ 단어 하나가 바뀌어도 의미 훼손

"ssh -A -J bastion deploy@10.0.3.7"
→ exact command 유지 필요
```

따라서 `관련성`이나 `최근성`만으로 context를 줄이면 장기 session에서 정작 가장 중요한 rule이 사라질 수 있다.

## 핵심 실험 결과

논문/공개 저장소가 보고한 주요 결과는 다음과 같다.

| 실험 | Type-blind baseline | Knowledge Triage |
|---|---:|---:|
| 50% compaction 1회, Claude Code `/compact` + Sonnet 4.6 | constraint recall 약 **0.53** | TypeCompact **1.00** |
| 50% compaction 5회 | 약 **0.10** | **0.96** |
| 10% budget compaction | best baseline **0.24** | **0.80** |
| Decomposition locality violation | **93%** configs | **0%** |
| Retrieval recall@50, in-scope rule | **0.73** | **1.00** |

Reference implementation README는 deterministic operator 호출 자체가 `<1 ms`, `0 LLM token`으로 동작하고, 비교한 LLM baseline은 5~420초 및 36k~57k token을 사용했다고 보고한다.

주의할 점은 이 수치가 일반적인 모든 Claude/Codex 작업의 비용 절감률을 뜻하지는 않는다는 것이다. **constraint preservation과 해당 benchmark 조건에서의 측정값**이다.

## 핵심 아이디어: Typed Knowledge

Knowledge Triage는 knowledge item을 다섯 타입으로 나눈다.

| Type | 의미 | 압축 허용도 |
|---|---|---|
| Constraint | 위반하면 실패하는 hard rule | **0에 가까움, verbatim pin** |
| Procedural | 정확한 절차/명령 | 매우 낮음 |
| Belief | 사실/지식 | 의미 보존 요약 가능 |
| Preference | soft rule/선호 | 병합·요약 가능 |
| Episodic | 과거 event/log | 가장 높은 삭제 허용 |

이 구분은 단순 taxonomy가 아니라 compaction operator의 실행 정책을 바꾼다.

## 아키텍처

```text
                    Raw Context / Memory
                            │
                            ▼
                      Type Classifier
                            │
      ┌────────────┬────────┼────────┬───────────┐
      │            │        │        │           │
 Constraint   Procedural  Belief Preference   Episodic
      │            │        │        │           │
    PIN           PIN     compact    merge       drop
      │            │        │        │           │
      └────────────┴────── Type-aware Operators ─┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
        TypeCompact    TypeDecompose   TypeRetrieve
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                     Working Context
```

### TypeCompact

공개 `operators.py` 구현은 constraint와 deduplicated procedure의 token budget을 가장 먼저 계산한다.

이 pinned set만으로 target budget을 초과하면 임의로 rule을 잘라내지 않고 `COMPACTION_UNSAFE`를 반환한다.

남은 공간에만 belief/preference/episodic을 우선순위에 따라 넣는다.

### TypeDecompose

큰 knowledge base를 여러 partition으로 나눌 때, 특정 partition에 적용되는 constraint를 해당 partition마다 복제한다.

즉 context partitioning 때문에 rule의 scope가 끊어지는 문제를 방지한다.

### TypeRetrieve

일반 relevance ranking에서 hard rule이 낮은 similarity score 때문에 탈락하지 않도록, 현재 scope에 적용되는 constraint를 relevance보다 우선해 결과에 넣는다.

## Claude Code Skill 구현

Companion `knowledge-triage-skill`은 Claude Code에서 다음 흐름을 사용한다.

```text
Session
   │
   ├─ PreCompact Hook
   │      └─ 새 turn에서 durable directive 추출
   │
   ├─ type classification
   │
   ├─ constraint / exact command
   │      └─ .claude/rules/knowledge-triage/
   │
   └─ Compaction
          │
          └─ runtime이 rule file을 다시 로드
```

Skill은 `PreCompact`와 `SessionEnd`에서 새 rule을 추출하고, constraint/command를 `.claude/rules/knowledge-triage/`에 기록한다. path scope를 지정한 rule은 관련 파일을 다룰 때만 로드하는 방식도 제안한다.

다만 저장소의 `0 extra tokens per turn` 표현은 그대로 받아들이기보다 주의해서 해석해야 한다. operator 자체가 LLM을 호출하지 않는다는 점과 별개로:

- rule extraction 시 LLM 호출이 발생할 수 있고
- 다시 context에 로드된 rule text는 결국 model input의 일부이며
- provider cache 여부에 따라 실제 billing token은 달라질 수 있다.

따라서 live session 도입 시에는 `cache_read / uncached_input / extractor cost`를 별도 계측하는 것이 좋다.

## 장점

- Context를 의미 없는 단일 token bag으로 보지 않고 **왜곡 허용도**에 따라 다룸
- hard rule이 summary에서 유실되는 문제를 구조적으로 줄임
- compaction뿐 아니라 decomposition과 retrieval에 같은 원칙 적용 가능
- deterministic operator는 LLM summarizer보다 재현성이 높음
- `COMPACTION_UNSAFE`처럼 안전하게 실패하는 contract를 만들 수 있음
- Claude Code Hook/Rules 구조와 결합하기 쉬움

## 단점 및 한계

- 모든 line을 정확히 type classification하는 것 자체가 새로운 실패 지점
- domain-specific rule은 generic classifier가 오분류할 수 있음
- rule을 과도하게 pin하면 context가 다시 커져 compaction 이점을 상쇄
- source code, build log, diff chunk처럼 line-based knowledge taxonomy가 바로 적용되지 않는 데이터도 있음
- companion Skill의 live-session A/B 효과는 논문의 corpus benchmark와 별도로 검증해야 함
- exact rule을 파일로 외부화할 때 권한/변조/신뢰 경계를 관리해야 함

## Perforce + Claude Code + Codex 적용 아이디어

현재 Harness에서는 5종 taxonomy를 그대로 쓰기보다 개발 workflow에 맞춰 다음 4 lane으로 단순화하는 것이 실용적이다.

```text
PINNED
- 보안 정책
- 절대 금지 command
- submit/review gate
- exact build/test command
- workspace/path invariant

REQUIRED
- 현재 task objective
- Pending CL
- p4 opened
- 핵심 diff
- failing test

RETRIEVABLE
- architecture fact
- 이전 결정
- 관련 코드 탐색 결과

EPHEMERAL
- verbose build log
- 성공한 command output
- 이미 반영된 과거 exploration
```

### 바로 적용 가능

1. `PINNED` 항목은 compactor에 넘기지 않고 매 request에서 별도 stable prefix로 조립한다.
2. `REQUIRED`는 현재 task가 끝날 때까지 유지한다.
3. `RETRIEVABLE`은 ID/evidence pointer만 남기고 JIT 조회한다.
4. `EPHEMERAL`은 head/tail 또는 failure-only로 aggressive compact한다.
5. pinned budget이 context budget을 넘으면 silent truncation하지 않고 fail한다.

### PoC 가치 있음

`PreCompact` Hook에서 현재 task ledger를 읽어 다음을 자동 생성한다.

```text
.ai/context/pinned.md
.ai/context/handoff.json
.ai/evidence/index.jsonl
```

Claude와 Codex adapter 모두 같은 typed context contract를 사용하고 provider별 표현만 달리한다.

## 기존 방식과 비교

| 방식 | 선택 기준 | Rule 보존 | 비용/복잡도 |
|---|---|---|---|
| 최근 N turn | recency | 낮음 | 낮음 |
| 일반 LLM summary | semantic summary | 불안정 | LLM 호출 필요 |
| RAG top-k | relevance | 낮은-score rule 탈락 가능 | index 필요 |
| Head/Tail | 위치 | 우연적 | 매우 낮음 |
| **Knowledge Triage** | type + scope + relevance | 높음 | classifier/metadata 필요 |

## 활용 아이디어 평가

- **바로 적용 가능**: policy/command/evidence를 별도 lane으로 pin하는 설계 원칙
- **PoC 가치 높음**: PreCompact + typed context manifest
- **아이디어 참고**: 공개 classifier를 사내 규칙 분류에 그대로 사용
- **현재 도입 가치 낮음**: 모든 source/log line을 세밀한 5종 타입으로 사전 분류

## 결론

이 연구의 핵심 가치는 `더 좋은 summary prompt`가 아니다. **Context에 들어 있는 정보마다 손실 허용도가 다르므로, compaction 이전에 retention contract를 구조화해야 한다**는 점이다.

현재 개발 Harness에는 특히 `hard rule / exact command / approval / evidence`를 일반 대화와 분리해 pin하는 원칙을 바로 적용할 가치가 높다.

## 참고 자료

- Paper: https://arxiv.org/abs/2608.22752
- Reference implementation: https://github.com/searchsim-org/cikm26-knowledge-triage
- Agent Skill: https://github.com/searchsim-org/knowledge-triage-skill
