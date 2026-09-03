---
title: Human-readable Markdown Skills
category: skills
tags:
  - ai
  - agent-skill
  - markdown
  - technical-writing
  - humanizer
source: https://github.com/continuedev/continue/blob/main/.claude/skills/docs-style/SKILL.md
updated: 2026-09-03
---

# Human-readable Markdown Skills

> AI가 만든 티를 단순히 지우는 것보다, 문서 구조를 독자 중심으로 재편하고 마지막에 문체를 정리하는 2단계 Skill 조합이 실무 Markdown 문서에 더 적합하다.

## 프로젝트 개요

LLM이 Markdown 문서를 생성하면 형식 자체는 깔끔해도 사람이 읽기에는 피곤한 경우가 많다. 대표적으로 모든 내용을 동일한 깊이의 목록으로 만들거나, 섹션마다 `개요 → 핵심 기능 → 장점 → 결론` 같은 틀을 반복하고, 중요하지 않은 설명까지 강조하는 패턴이 생긴다.

이 문제를 다루는 공개 Skill은 크게 두 종류다.

1. **Documentation / Technical Writing Skill**: 정보 구조, 독자 목표, progressive disclosure, 예제 중심 구성에 집중한다.
2. **Humanizer Skill**: AI 특유의 반복, 균일한 문장 리듬, 추상적인 표현과 과도한 친절함을 제거한다.

실무 문서에는 두 번째만 쓰기보다 첫 번째를 기본 생성 규칙으로 사용하고 Humanizer를 후처리로 두는 편이 낫다.

## 해결하려는 문제

AI Markdown의 읽기 어려움은 단순한 어휘 문제가 아니다.

- 제목과 소제목이 지나치게 많다.
- 모든 정보를 bullet list로 평탄화한다.
- 문단 길이와 문장 리듬이 지나치게 균일하다.
- 같은 내용을 요약, 본문, 결론에서 반복한다.
- `핵심`, `강력한`, `효율적인` 같은 추상적 평가가 실제 정보보다 많다.
- 독자가 원하는 작업보다 기능 목록을 먼저 보여준다.
- 중요도와 정보 깊이를 구분하지 않아 스캔하기 어렵다.

따라서 Markdown lint만 맞추거나 금지 단어를 치환하는 것으로는 해결되지 않는다.

## 추천 Skill

### Continue `docs-style`

Source: https://github.com/continuedev/continue/blob/main/.claude/skills/docs-style/SKILL.md

개발 문서 작성용으로 가장 직접적인 후보다.

핵심 원칙:

- concise: filler 제거
- task-oriented: 제품 기능보다 독자가 하려는 일을 기준으로 구성
- progressive disclosure: 쉬운 내용에서 고급 내용 순서로 공개
- 추상 설명보다 실제 예제 사용
- 복사 가능한 코드 예제
- prerequisite를 앞에 배치
- 한 페이지에 한 주제
- 반복 설명 대신 링크
- 목차만 훑어도 구조가 보이는 heading
- 실행 후 예상 결과 제시

**평가:** AI 티 제거보다 "사람이 실제로 찾고 읽는 개발 문서"를 만드는 목적에 더 잘 맞는다. 바로 적용 가치가 높다.

### `technical-writing`

Source: https://github.com/gwagjiug/technical-writing

Claude Code와 Codex를 대상으로 한 개발자 문서 작성 Skill이다.

핵심 흐름은 다음과 같다.

`Reader goal → document type → predictable structure → concrete sentences → factual safety`

특히 추상적인 AI 문장을 실제 actor/action/value 중심 문장으로 바꾸는 규칙이 유용하다. 명령어, API 이름, 파라미터, 버전, 오류 메시지를 보존하는 factual safety도 기술 Wiki에 적합하다.

**평가:** 사내 기술 Wiki, 설계/운영 문서 작성에 PoC 가치가 높다.

### `human-voice`

Source: https://github.com/stephenoffer/human-voice

단어 몇 개를 치환하는 방식보다 문장 shape, syntax, paragraph uniformity, rhythm을 먼저 교정하는 접근이다.

**평가:** 이미 생성된 긴 문서를 후처리할 때 유용하다. 기술 구조 자체를 개선하는 Skill은 아니므로 docs-style과 조합하는 것이 좋다.

### Humanizer 계열

대표 후보:

- https://github.com/c-b-g-m/blader-humanizer
- https://github.com/debgotwired/humanize
- https://github.com/AshwinSathian/humanize-writing-skill
- https://github.com/harshaneel/humanize

공통적으로 AI writing pattern을 찾아 반복적인 표현, 과도한 수식, 균일한 리듬, generic claim 등을 제거한다.

일부 구현은 개인 writing sample을 입력해 voice를 맞추는 방식도 지원한다.

**평가:** 블로그/보고서에는 유용하지만 기술 문서의 정보 구조 문제까지 해결한다고 기대하면 안 된다.

### `claude-md-skill`

Source: https://github.com/RedondoK/claude-md-skill

GFM과 markdownlint 규칙 준수에 초점을 둔다.

**평가:** 문법 품질과 일관성에는 좋지만 "AI스럽지 않고 읽기 좋은 문서" 문제의 핵심 해결책은 아니다. formatter/validator 역할로 보는 편이 맞다.

## 권장 아키텍처

```text
Raw Notes / Research
        │
        ▼
[Docs Writer]
- reader goal 결정
- 정보 중요도 결정
- progressive disclosure
- heading/list 최소화
- concrete example 배치
        │
        ▼
[Human Voice Review]
- 반복 제거
- AI식 문장 패턴 제거
- 문장/문단 리듬 조정
- 불필요한 결론/요약 제거
        │
        ▼
[Markdown Validation]
- GFM
- markdownlint
- link/code 검증
        │
        ▼
Human-readable Markdown
```

핵심은 **Humanizer를 생성기의 앞단이 아니라 리뷰 단계에 두는 것**이다.

## 실무용 권장 조합

현재 기준 추천 순서는 다음과 같다.

| 역할 | 후보 | 판단 |
|---|---|---|
| 기본 문서 작성 | Continue `docs-style` | 바로 적용 가능 |
| 기술 문장 강화 | `technical-writing` | 바로 적용/PoC |
| AI 문체 후처리 | `human-voice` 또는 Humanizer | 보조 Skill |
| Markdown 규칙 검사 | `claude-md-skill` | 선택적 validator |

단일 Skill만 고른다면 `docs-style`을 먼저 적용하는 것을 권장한다.

## 활용 아이디어

### 바로 적용 가능

Claude Code/Codex 공통 프로젝트 Skill로 `human-readable-docs`를 만들고 Continue `docs-style`의 정보 구조 원칙과 `technical-writing`의 concrete/factual safety 규칙을 합친다.

생성 규칙에는 다음을 명시하는 것이 좋다.

- 독자가 이 문서에서 얻으려는 결과를 먼저 정의한다.
- heading은 탐색에 필요한 경우에만 만든다.
- 3개 이하 항목이면 억지 bullet list를 만들지 않는다.
- 같은 내용을 Summary와 Conclusion에서 반복하지 않는다.
- 중요하지 않은 문장을 bold 처리하지 않는다.
- 설명보다 실제 명령, 값, 예제를 우선한다.
- 모든 섹션을 동일한 템플릿으로 만들지 않는다.
- 짧은 문단과 긴 문단을 자연스럽게 섞는다.
- `핵심`, `강력한`, `효율적` 같은 평가어는 근거가 있을 때만 쓴다.

### PoC 가치 있음

기존 Wiki 문서 5~10개를 대상으로 다음 세 가지 출력을 비교한다.

1. 현재 프롬프트
2. docs-style만 적용
3. docs-style + human-voice 후처리

평가 기준은 문서 길이보다 `찾고 싶은 정보를 찾는 시간`, 중복률, heading 수, bullet 비율, 사람이 수정한 줄 수로 잡는 것이 실용적이다.

### 아이디어 참고

사용자가 직접 작성한 좋은 Wiki 문서 몇 개를 voice/style reference로 두고 Skill에서 참고하도록 하면 일반적인 Humanizer보다 개인 Knowledge Base의 문체를 안정적으로 유지할 수 있다.

## 장점

- 모델을 바꾸어도 문서 품질 기준을 재사용할 수 있다.
- Claude Code/Codex 같은 Agent 환경에서 반복 적용하기 쉽다.
- 단순 prompt보다 Skill로 분리하면 문서 생성 시점에만 context를 로드할 수 있다.
- Wiki 전체의 정보 구조와 문체를 일관되게 유지할 수 있다.

## 단점 및 한계

- Humanizer를 과하게 적용하면 기술적 정확도나 용어가 변형될 수 있다.
- 좋은 문체와 좋은 정보 구조는 별개이므로 Humanizer 하나로 해결되지 않는다.
- 개인 voice matching은 충분한 기준 문서가 필요하다.
- Markdown lint 통과 여부는 가독성을 보장하지 않는다.
- 여러 Skill을 연속 적용하면 token 사용량과 처리 시간이 증가한다.

## 결론

현재 문제에는 "AI 문장을 사람처럼 바꾸는 Humanizer"보다 **독자 중심 Documentation Skill을 생성 단계에 넣는 것**이 우선이다.

가장 현실적인 구성은 `docs-style → human-voice → markdown validation` 파이프라인이다. 특히 개인 Wiki/사내 기술 문서라면 공개 Skill을 그대로 사용하는 것보다 `docs-style`과 `technical-writing`의 원칙을 합쳐 전용 `human-readable-docs` Skill을 만드는 것이 장기적으로 가장 가치가 높다.

## 참고 자료

- https://github.com/continuedev/continue/blob/main/.claude/skills/docs-style/SKILL.md
- https://github.com/gwagjiug/technical-writing
- https://github.com/stephenoffer/human-voice
- https://github.com/c-b-g-m/blader-humanizer
- https://github.com/debgotwired/humanize
- https://github.com/AshwinSathian/humanize-writing-skill
- https://github.com/harshaneel/humanize
- https://github.com/RedondoK/claude-md-skill
