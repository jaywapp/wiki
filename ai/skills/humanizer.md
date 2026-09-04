---
title: Humanizer
category: skills
tags:
  - ai
  - agent-skill
  - writing
  - claude-code
  - codex
source: https://github.com/blader/humanizer
updated: 2026-09-04
---

# Humanizer

> AI가 작성한 티가 나는 문장을 35개 패턴으로 찾아내고, 원래 의미와 사실을 유지하면서 사람이 쓴 것처럼 자연스럽게 다시 쓰는 범용 Agent Skill.

## 프로젝트 개요

Humanizer는 `blader/humanizer`가 공개한 오픈소스 Agent Skill이다. 별도 모델이나 서버를 제공하는 도구가 아니라, 에이전트에게 글을 어떻게 검토하고 다시 써야 하는지 알려주는 `SKILL.md` 중심의 지침 패키지다.

핵심 기준은 Wikipedia WikiProject AI Cleanup의 "Signs of AI writing"이며, 현재 `SKILL.md` 메타데이터 기준 버전은 2.11.2다. MIT 라이선스다.

Skills CLI, Claude Code plugin, Claude Desktop ZIP/Skill, 수동 `SKILL.md` 복사를 지원한다. Markdown 지침을 읽는 다른 Agent Harness에도 이식하기 쉽다.

## 해결하려는 문제

LLM이 생성한 문서는 내용이 맞더라도 반복적인 표현과 구조 때문에 읽기 피곤하거나 AI가 작성한 티가 강하게 날 수 있다.

대표적인 패턴은 다음과 같다.

- 중요성을 과장하는 표현
- 근거 없는 전문가/자료 인용
- `showcasing`, `highlighting` 같은 상투적인 분석 표현
- 홍보문 같은 문체
- `It's not just X, it's Y` 구조
- 억지로 세 항목을 맞추는 문장
- 과도한 대시, 볼드, 이모지
- `Great question`, `I hope this helps` 같은 챗봇 잔여 문구
- 불필요한 완곡어법과 filler
- 의미 없이 문장을 멋있게 보이게 만드는 결론

Humanizer는 이런 특징을 단순 금칙어 치환이 아니라 문맥을 포함한 편집 규칙으로 다룬다.

## 핵심 기능

### 35개 AI writing pattern

현재 패턴은 크게 다음 범주로 나뉜다.

| 범주 | 예시 |
| --- | --- |
| Content | 중요성 과장, name-dropping, 얕은 분석, 홍보성 표현, vague source |
| Language | AI 단골 어휘, `is/are` 회피, rule of three, synonym cycling, passive voice |
| Style | em/en dash, 과도한 bold, mini-heading list, title case, emoji, curly quote |
| Chatbot | 챗봇 인사/마무리, 지식 한계 변명, 과도한 동조 |
| Filler | 장황한 filler, 과도한 qualifier, generic positive ending |

### 2단계 rewrite

동작 방식은 사실상 편집 Agent의 review loop에 가깝다.

```text
원문
  ↓
35개 패턴 검사
  ↓
1차 rewrite
  ↓
AI스러운 흔적 재검토
  ↓
원문의 claim/fact와 비교
  ↓
필요한 부분만 2차 rewrite
  ↓
최종 문서
```

원래 문단 구조를 고정하지 않기 때문에 문장 병합/분리와 문단 재구성이 가능하다.

### 사실 보존

중요한 설계 원칙이다. 이름, 숫자, 날짜, 인용, citation 등 사실 정보는 원문이나 작성자가 제공하지 않았다면 새로 만들지 못하도록 명시한다.

즉 "더 인간적으로 보이게 만들기 위해 그럴듯한 경험이나 사실을 창작"하는 방식과 거리를 둔다.

### Writer voice matching

사용자가 2~3개 문단 정도의 자신의 글을 제공하면 문장 길이, 단어 선택, 구두점, 반복 표현, transition 등을 분석해 해당 스타일을 우선한다.

이 경우 기본 Humanizer 규칙보다 writer sample이 우선될 수 있다. 예를 들어 작성자가 원래 em dash를 자주 쓴다면 무조건 제거하지 않는다.

### 파일 단위 적용

파일을 대상으로 사용할 경우 prose를 수정하되 code, data, frontmatter, link target 등은 유지하도록 설계되어 있다. 따라서 Markdown 기술 문서 후처리에 적합하다.

## 구조 및 아키텍처

Repository는 매우 작다.

```text
humanizer/
├── SKILL.md          # runtime prompt / Single Source of Truth
├── README.md
├── AGENTS.md
├── .claude-plugin/   # Claude Code plugin metadata
├── agents/           # agent integration metadata
└── scripts/          # packaging/validation 관련 스크립트
```

실제 핵심 로직은 프로그램 코드가 아니라 `SKILL.md`다. 따라서 별도 inference service, database, MCP server가 필요하지 않는다.

```text
Agent (Claude/Codex/etc.)
        │
        ├─ user text / markdown file
        │
        └─ Humanizer SKILL.md
                 │
                 ▼
        LLM 자체가 pattern 검사 + rewrite
                 │
                 ▼
          humanized document
```

이 구조 때문에 설치와 이식은 쉽지만, 결과 품질은 실행하는 LLM의 instruction-following과 편집 능력에 영향을 받는다.

## 설치

Skills CLI:

```bash
npx skills add blader/humanizer --global
```

프로젝트 단위 설치는 `--global`을 빼면 된다.

Claude Code 2.1.142 이상에서는 plugin 방식도 지원한다.

```text
/plugin marketplace add blader/humanizer
/plugin install humanizer@humanizer
```

호출 명령은 `/humanizer:humanizer`다.

수동 설치는 `SKILL.md`를 사용하는 Agent의 skill directory에 복사하면 된다.

## 장점

### 의존성이 거의 없다

핵심이 Markdown prompt라 서버, API key, 별도 모델이 없다. 기존 Claude Code/Codex 기반 환경에 넣기 쉽다.

### 규칙이 구체적이다

단순히 "자연스럽게 써줘"라고 지시하는 것보다 35개 패턴과 before/after가 제공되므로 모델이 무엇을 고쳐야 하는지 명확하다.

### 사실 왜곡 방지 규칙이 강하다

Humanizer류 도구에서 문제가 될 수 있는 가짜 경험/가짜 사실 추가를 명시적으로 금지한다.

### 기술 문서에도 적용 가능하다

개인적인 글에 무조건 감성적인 표현을 넣지 않고 technical/reference prose는 neutral/plain하게 유지한다.

### Agent 간 이동성이 좋다

특정 Claude API 기능에 강하게 결합된 구조가 아니라 `SKILL.md` 기반이라 다양한 skill-compatible harness에 적용할 수 있다.

## 단점 및 한계

### AI detector 우회 도구가 아니다

목적은 AI detector 점수를 낮추는 것이 아니라 읽기 품질과 문체를 개선하는 것이다. "humanized" 결과가 특정 detector를 통과한다고 보장할 수 없다.

### 규칙 과적용 위험

35개 규칙을 기계적으로 모두 적용하면 오히려 작성자의 원래 문체를 지울 수 있다. 특히 dash, bold, passive voice, heading style은 문서 성격에 따라 정상적인 표현일 수 있다.

Writer sample 우선 규칙이 이 문제를 완화하지만 팀 문서에서는 별도 style guide가 더 안정적이다.

### 영어 중심 패턴

기반 자료와 대부분의 예제가 영어 문체다. 한국어에도 "과도한 구조화", "상투적 결론", "챗봇 말투" 같은 개념은 적용할 수 있지만, 영어용 lexical pattern을 그대로 한국어 문서에 적용하는 것은 한계가 있다.

### 추가 token 비용

1차 rewrite 후 critique/review와 재작성까지 수행하므로 단순 생성보다 token과 latency가 늘어난다. 긴 Wiki 전체를 매번 Humanizer에 통과시키기보다는 최종 prose polishing 단계에서 사용하는 편이 낫다.

### 품질이 실행 모델에 종속

Humanizer 자체에 deterministic parser나 scoring engine이 있는 것이 아니다. 같은 `SKILL.md`라도 Claude, Codex 또는 다른 모델에서 결과가 다를 수 있다.

### Enterprise 문서의 정확성 검증을 대체하지 않는다

사실을 새로 만들지 말라는 규칙은 있지만 기존 원문의 사실 자체가 맞는지 검증하는 도구는 아니다. 기술 조사 문서는 source verification 단계가 별도로 필요하다.

## 프로젝트 성숙도

2026-09-04 조사 기준으로 프로젝트는 활발하게 개선된 흔적이 있다. 2026년 7~8월에 여러 버전이 연속적으로 배포되었고, 8월에는 Plain Language 전환, Claude Desktop packaging 수정, README 개선 등이 이어졌다.

Skills.sh에는 약 5천 회 이상의 설치가 표시되며 GitHub에서도 수만 개의 star를 받은 프로젝트라 Agent writing skill 중 인지도가 높은 편이다. 다만 star/install 수는 품질 자체를 보장하는 지표로 보지는 않는 것이 좋다.

## 활용 사례

### AI가 생성한 Markdown 문서 후처리

```text
Research Agent
      ↓
초안 Markdown
      ↓
Fact / Citation 검증
      ↓
Humanizer
      ↓
Wiki 저장
```

이 프로젝트의 AI Wiki 작성 흐름에 특히 잘 맞는다. 조사 Agent가 사실과 구조를 만든 뒤 Humanizer가 마지막 문체 정리만 담당하게 하면 역할이 분리된다.

### Confluence / 사내 기술 문서

AI가 만든 문서에서 과도한 소제목, bold list, 상투적 요약, "핵심 인사이트" 같은 표현을 줄이는 final editor로 사용할 수 있다.

### PR / 설계 문서

설계 내용을 바꾸지 않고 설명 문장만 간결하게 다듬는 용도로 활용할 수 있다. 다만 code block과 identifier는 반드시 보존해야 한다.

### 개인 스타일 기반 문서 생성

사용자의 기존 문서 몇 개를 style sample로 제공하고 Humanizer를 마지막 단계에 배치하면 일반적인 "AI 말투 제거"보다 개인 문체에 가까운 결과를 만들 수 있다.

## 기존 방식과 비교

| 방식 | 특징 | Humanizer 대비 |
| --- | --- | --- |
| `자연스럽게 써줘` prompt | 간단함 | 기준이 모호하고 결과 편차가 큼 |
| Team style guide | 조직 문체를 정확히 정의 가능 | 직접 규칙을 작성/관리해야 함 |
| AI detector 기반 rewrite | detector score 최적화 중심 | Humanizer는 readability/editing 중심 |
| Humanizer | 35개 공개 패턴 + voice matching + fact preservation | 영어 중심이며 LLM 품질에 의존 |

Humanizer의 가장 큰 장점은 "좋은 글을 써라"는 추상적 지시를 재사용 가능한 editing checklist로 만든 점이다.

## 활용 아이디어

### 바로 적용 가능: Wiki finalizer

현재 AI Knowledge Base 생성 파이프라인의 마지막 단계에 넣을 가치가 높다.

```text
조사
 → 사실 검증
 → Wiki 구조화
 → citation/source 확인
 → Humanizer
 → Markdown validation
 → commit
```

중요한 점은 Humanizer를 조사 전에 실행하거나 사실 검증과 섞지 않는 것이다. 역할을 "문체 편집"으로 제한하면 안정적이다.

### 바로 적용 가능: 문서 작성 Agent의 optional skill

모든 응답에 강제하기보다 다음과 같은 명령으로 필요할 때만 호출하는 편이 좋다.

```text
/docs-humanize
/wiki-finalize
/review-prose
```

### PoC 가치 있음: 사내 Korean Humanizer

원본 35개 규칙을 그대로 쓰기보다 실제 사내 AI 문서에서 반복되는 한국어 패턴을 수집해 확장할 가치가 있다.

예:

- "단순히 ~를 넘어"
- "핵심은 ~입니다"
- 모든 항목을 3개로 맞추는 구조
- 모든 bullet에 굵은 mini heading 사용
- 과도한 "효율성/생산성/혁신" 표현
- 결론에서 앞 내용을 다시 반복
- 필요 이상의 이모지

이를 `humanizer-ko` 또는 사내 `docs-style` skill로 만들면 실제 업무 문서에 더 직접적인 효과를 기대할 수 있다.

### PoC 가치 있음: Humanizer + lint

Humanizer는 LLM 기반이라 결과가 비결정적이다. 따라서 일부 규칙은 Markdown lint/static check로 분리할 수 있다.

```text
LLM Humanizer
   +
Markdown lint
   +
Forbidden phrase / style check
```

예를 들어 excessive heading, emoji, repeated bold, 특정 filler phrase는 deterministic check가 가능하다.

## 결론

Humanizer는 기능적으로 복잡한 AI 도구라기보다 잘 설계된 "편집 지침 패키지"다. 그 단순함이 오히려 장점이다.

특히 AI로 Markdown, Wiki, Confluence 문서를 많이 만드는 환경에서는 최종 결과가 지나치게 AI스럽고 구조화되는 문제를 줄이는 final editing layer로 바로 적용할 가치가 높다.

현재 환경에서는 원본 Skill을 그대로 사용하는 것보다 먼저 적용해 보고, 실제 한국어 문서에서 반복되는 문제를 수집한 뒤 `Humanizer + 한국어/사내 style rule`로 확장하는 방향을 권장한다.

평가: **바로 적용 가능 + 한국어 확장 PoC 가치 높음**

## 참고 자료

- https://github.com/blader/humanizer
- https://github.com/blader/humanizer/blob/main/SKILL.md
- https://www.skills.sh/blader/humanizer
- https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
