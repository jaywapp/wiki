---
title: Skill File Context Optimization
category: skills
tags:
  - ai
  - agent
  - skill
  - context-engineering
  - token-optimization
  - progressive-disclosure
source: https://developers.openai.com/api/docs/guides/latest-model
updated: 2026-09-09
---

# Skill File Context Optimization

> 거대한 `SKILL.md`를 하나의 프롬프트로 유지하지 말고, **항상 필요한 제어면(control plane)만 얇게 남기고 세부 지식·예제·절차는 필요할 때 읽는 reference로 분리**하는 것이 핵심이다.

## 프로젝트 개요

로컬 Agent Skill은 사용하면서 규칙, 예외, 예제, 체크리스트가 계속 추가되기 쉽다. 문제는 `SKILL.md`가 커질수록 활성화될 때마다 불필요한 정보까지 context에 들어가 토큰 비용, attention dilution, instruction conflict 가능성이 함께 증가한다는 점이다.

OpenAI의 최신 모델 가이드 역시 기존 prompt stack을 그대로 누적하기보다 **제품 계약을 보존하는 가장 작은 prompt에서 시작해 필요한 지침만 추가**하는 접근을 권장한다. 또한 skill/AGENTS.md 같은 파일의 불명확하거나 충돌하는 지침이 모델 행동에 영향을 줄 수 있으므로 audit를 권장한다.

이 문제는 단순 문장 압축보다 **Skill을 계층형 지식 구조로 재설계**하는 것이 효과적이다.

## 해결하려는 문제

대형 단일 `SKILL.md`에는 보통 다음이 섞여 있다.

- Skill activation / trigger
- 절대 지켜야 하는 규칙
- 작업 workflow
- 세부 domain knowledge
- 예외 처리
- 긴 예제
- 플랫폼별 차이
- troubleshooting
- 과거에 추가된 중복 지침

이 중 실제 매 실행마다 필요한 것은 일부뿐이다. 전체 파일을 항상 읽으면 context window를 불필요하게 점유하고, 핵심 규칙과 참고 정보의 우선순위도 흐려진다.

## 핵심 방법론: Progressive Disclosure

권장 구조는 3계층이다.

```text
Level 0: Skill metadata / description
        ↓ activation 판단
Level 1: SKILL.md
        ↓ 핵심 규칙 + routing + 최소 workflow
Level 2: references/*.md
        ↓ 해당 상황에서만 세부 정보 로드
Level 3: scripts / tools / external data
        ↓ deterministic 작업 또는 대용량 처리
```

핵심은 `SKILL.md`를 **백과사전이 아니라 라우터(router)** 로 바꾸는 것이다.

## 권장 디렉터리 구조

```text
my-skill/
├── SKILL.md
├── references/
│   ├── workflow.md
│   ├── rules.md
│   ├── examples.md
│   ├── troubleshooting.md
│   ├── windows.md
│   └── enterprise.md
├── templates/
│   └── output-template.md
└── scripts/
    ├── validate.py
    └── inspect.py
```

### `SKILL.md`에 남길 것

- Skill 목적
- activation 조건
- 절대 규칙 / invariants
- 기본 실행 순서
- 어떤 상황에서 어떤 reference를 읽을지에 대한 routing table
- 완료 조건

### `references/`로 이동할 것

- 긴 설명
- 상세 예제
- edge case 목록
- 플랫폼별 지침
- API / CLI reference
- troubleshooting
- 비교표
- 드물게 쓰는 workflow

### `scripts/`로 이동할 것

LLM이 매번 텍스트로 추론할 필요가 없는 deterministic 작업은 코드로 내린다.

- validation
- parsing
- formatting
- file scanning
- schema 검사
- 반복적인 변환

이렇게 하면 instruction token뿐 아니라 reasoning token도 줄일 수 있다.

## SKILL.md 예시

```markdown
# My Skill

## Goal
작업 X를 안전하고 일관되게 수행한다.

## Core Rules
1. A는 항상 지킨다.
2. B를 변경하기 전 C를 확인한다.
3. 사용자 요청 범위를 넘어 리팩터링하지 않는다.

## Workflow
1. 입력을 분류한다.
2. 필요한 reference만 읽는다.
3. 작업한다.
4. validator를 실행한다.
5. 결과를 보고한다.

## Load references only when needed
- 일반 작업 → `references/workflow.md`
- Windows 문제 → `references/windows.md`
- 실패/오류 → `references/troubleshooting.md`
- 출력 예제가 필요한 경우 → `references/examples.md`

관련 없는 reference는 읽지 않는다.
```

## 분해 기준

파일 크기 자체보다 **활성화 빈도 × 읽히는 토큰 수**를 기준으로 본다.

### Hot
거의 모든 호출에 필요하다.

`SKILL.md`에 유지한다.

### Warm
특정 workflow에서 자주 필요하다.

`references/workflow-*.md`로 분리한다.

### Cold
예외, troubleshooting, 상세 예제처럼 가끔 필요하다.

별도 reference로 완전히 분리한다.

즉 다음 값을 줄이는 것이 목표다.

```text
Expected Context Cost
≈ Σ(reference tokens × load probability)
```

단순히 전체 파일을 30% 압축하는 것보다, 70%의 내용을 호출 확률 10%짜리 reference로 이동하는 편이 효과가 훨씬 크다.

## 추가 최적화 패턴

### 1. Routing Table

reference를 무조건 순서대로 읽게 하지 말고 조건을 명시한다.

```text
IF task == debugging       → debugging.md
IF platform == windows     → windows.md
IF task == release         → release.md
IF validation failed       → troubleshooting.md
```

### 2. Example Budget

예제는 토큰을 크게 소비한다. 대표적인 positive example 1~2개만 유지하고 나머지는 `examples/`로 이동한다.

### 3. Rule Deduplication

비슷한 규칙이 여러 표현으로 반복되면 하나의 invariant로 통합한다.

```text
Before
- 요청하지 않은 파일 수정 금지
- 범위 밖 변경 금지
- 관련 없는 리팩터링 금지

After
- Scope invariant: 요청을 수행하는 데 직접 필요한 변경만 한다.
```

단, 의미가 달라질 정도의 과도한 압축은 피한다.

### 4. Positive Instructions

가능하면 금지문을 길게 나열하기보다 원하는 행동을 직접 기술한다. Anthropic의 prompting 가이드도 모델에게 하지 말아야 할 것보다 해야 할 것을 명시하는 방식을 권장한다.

### 5. Deterministic Offloading

200줄짜리 validation 규칙을 자연어로 설명하기보다 validator script로 만들고 Skill에는 `검증 스크립트를 실행하고 실패 시 중단`만 남기는 방식이 더 안정적일 수 있다.

### 6. State와 Instruction 분리

세션별 상태, 최근 작업 결과, observation backlog 등을 SKILL.md에 넣지 않는다. persistent state 파일이나 별도 store로 분리하고 필요한 metadata만 scan한다.

`Task Observer`가 observation body 전체 대신 frontmatter를 우선 scan하는 패턴도 같은 원리다.

## 구조 및 아키텍처

```text
User Task
   ↓
Skill activation
   ↓
Small SKILL.md
   ├─ core invariants
   ├─ workflow skeleton
   └─ reference router
          ↓
     task classification
       ├─ debugging → references/debugging.md
       ├─ release   → references/release.md
       ├─ windows   → references/windows.md
       └─ normal    → no extra load
          ↓
      tools / scripts
          ↓
       validation
          ↓
        result
```

이 구조의 목적은 **정보를 없애는 것이 아니라 로딩 시점을 늦추는 것**이다.

## 장점

### Context 비용 감소

매 호출에 전체 지침을 읽지 않으므로 평균 input token을 크게 줄일 수 있다.

### 핵심 규칙의 가시성 향상

핵심 invariant가 긴 예제와 예외 목록에 묻히지 않는다.

### Instruction conflict 감소

오래된 지침이나 특정 상황 전용 규칙이 일반 작업에 영향을 주는 위험이 줄어든다.

### 유지보수성 향상

Windows, release, debugging 등 관심사별로 독립적으로 수정할 수 있다.

### Skill 확장성

Skill이 커져도 `SKILL.md` 자체는 거의 일정한 크기로 유지할 수 있다.

## 단점 및 한계

### Harness가 on-demand file loading을 지원해야 함

Progressive disclosure의 효과는 Agent가 필요할 때 reference를 읽을 수 있을 때 가장 크다. Harness가 Skill 전체를 무조건 하나의 prompt로 합치는 구조라면 파일만 분리해도 토큰 절감 효과가 없다.

### 과도한 분해는 tool-call overhead를 만든다

작은 파일 수십 개로 쪼개면 탐색 비용과 latency가 증가한다. 의미 있는 작업 단위로 분리해야 한다.

### Routing 오류 가능성

SKILL.md가 필요한 reference를 정확히 안내하지 못하면 중요한 지침을 읽지 않고 작업할 수 있다. 따라서 핵심 safety/invariant는 reference로 내리면 안 된다.

### Reference 간 충돌

서로 다른 reference가 같은 규칙을 복제하면 다시 instruction conflict가 발생한다. 공통 규칙은 상위 계층으로 끌어올리는 것이 좋다.

## 활용 사례

### Claude Code / Codex Skill

`SKILL.md`를 100~300줄 수준의 control plane으로 유지하고 세부 domain 지식을 references로 이동한다. 정확한 숫자는 목표치가 아니라 구조 점검용 휴리스틱이다.

### 대형 사내 Workflow Skill

Perforce, TeamCity, release, review 등 여러 workflow를 하나의 Skill이 담당한다면 각 workflow를 reference로 분리하고 SKILL.md에는 task router만 둔다.

### Enterprise 규칙

보안/컴플라이언스의 핵심 invariant는 SKILL.md에 남기고, 상세 절차와 플랫폼별 구현만 별도 reference로 분리한다.

## 기존 방식과 비교

| 방식 | 초기 구현 | 평균 Context | 유지보수 | 확장성 |
|---|---:|---:|---:|---:|
| 단일 대형 SKILL.md | 쉬움 | 높음 | 낮음 | 낮음 |
| 문장 압축 | 쉬움 | 중간 | 중간 | 낮음 |
| Progressive disclosure | 중간 | 낮음 | 높음 | 높음 |
| Retrieval/RAG 기반 Skill | 높음 | 매우 낮게 가능 | 중간~높음 | 매우 높음 |
| 코드/validator offload | 중간 | 낮음 | 높음 | 높음 |

## 활용 아이디어

### 바로 적용 가능

현재 대형 `SKILL.md`를 `Core / Workflow / Reference / Example / State`로 태깅한 뒤 Core와 router만 남기고 나머지를 references로 이동한다.

### PoC 가치 높음 — Skill Optimizer

Skill 자체를 정적 분석하는 meta-skill 또는 CLI를 만들 수 있다.

입력:

```text
/path/to/skill
```

출력:

```text
Total tokens: 18,420
Always-on tokens: 15,300
Duplicated rules: 12
Examples: 5,800 tokens
Cold sections: 7,200 tokens

Suggested split:
SKILL.md                  2,300
references/workflow.md    3,100
references/examples.md    5,800
references/edge-cases.md  4,200
references/platform.md    3,020
```

여기에 실제 실행 telemetry를 결합하면 어떤 reference가 얼마나 자주 로드되는지 측정해 `tokens × load frequency` 기준으로 재구성할 수 있다.

### 다음 단계

Skill 최적화는 다음 순서가 효율적이다.

```text
1. Measure   : 현재 token / section 크기 측정
2. Classify  : Hot / Warm / Cold 분류
3. Dedup     : 중복·충돌 규칙 제거
4. Split     : references로 분리
5. Route     : SKILL.md에 조건부 load 규칙 추가
6. Offload   : deterministic logic을 script/tool로 이동
7. Evaluate  : 대표 task로 성공률 + token 비교
8. Iterate   : 실제 load frequency 기반 재조정
```

## 결론

큰 Skill 파일의 가장 좋은 최적화 방향은 **요약해서 하나의 작은 파일로 만드는 것**이 아니라 **작은 항상-on control plane + 필요할 때만 읽는 knowledge plane**으로 재설계하는 것이다.

특히 로컬 Harness를 직접 제어할 수 있다면 `SKILL.md → reference router → selective loading → script offloading` 구조를 적용하는 것이 가장 실용적이다.

## 참고 자료

- OpenAI Model Guidance: https://developers.openai.com/api/docs/guides/latest-model
- Anthropic Prompting Best Practices: https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/prompt-templates-and-variables
- 기존 Wiki: `ai/skills/task-observer.md` — progressive disclosure와 frontmatter scan 사례
