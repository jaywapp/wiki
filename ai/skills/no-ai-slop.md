---
title: No AI Slop
category: skills
tags:
  - ai
  - agent-skill
  - writing
  - editing
  - codex
  - chatgpt
source: https://github.com/petergyang/no-ai-slop
updated: 2026-09-13
---

# No AI Slop

> AI가 자주 만드는 상투적 문장 패턴을 제거하되 작성자의 고유한 어조와 개성을 최대한 보존하도록 설계된 글쓰기 편집 Agent Skill.

## 프로젝트 개요

Peter Yang이 공개한 오픈소스 글쓰기 Skill이다. 일반적인 AI 문장 교정기가 문장을 매끈하게 만드는 과정에서 작성자의 어휘, 리듬, 유머, 거친 표현까지 평준화하는 문제를 피하는 데 초점을 둔다.

핵심은 AI 작성 여부를 판정하는 detector가 아니라, 확인 가능한 문체 패턴을 찾아 수정하거나 보고하는 규칙 기반 편집 워크플로우라는 점이다. 저장소는 MIT 라이선스이며 ChatGPT/Codex용 plugin metadata와 Agent Skill 구조를 함께 제공한다.

## 해결하려는 문제

LLM이 작성하거나 다듬은 글에는 반복적으로 등장하는 문체가 있다. 예를 들어 `It's not X. It's Y.`, 과장된 중요성 표현, 출처 없는 `experts agree`, 의미 없이 극적인 단문, 결론에서의 가짜 통찰 등이 있다.

반대로 AI에게 단순히 `더 자연스럽게 써줘`라고 요청하면 이런 패턴뿐 아니라 실제 작성자의 개성까지 제거될 수 있다. No AI Slop은 최소 수정 원칙을 두어 강한 인간적 문장은 그대로 두고 문제 패턴만 제거하려 한다.

## 핵심 기능

- **Edit 모드**: 초안을 수정하고 전체 수정본과 변경 요약을 반환한다.
- **Detect 모드**: 원문을 다시 쓰지 않고 발견한 패턴, 해당 문장, 짧은 수정 방향을 제시한다.
- **Voice preservation**: 어휘, 문장 리듬, 직설성, 유머, 불확실성, 여담과 같은 작성자 특성을 보존한다.
- **20+ AI-slop 패턴 규칙**: binary contrast, throat-clearing, faux insight, colon reveal, superficial analysis, importance puffery, weasel attribution, synonym cycling, dramatic fragmentation, fake-profound ending 등을 검사한다.
- **Self-evaluation**: 수정 후 `eval.md` 체크리스트를 이용해 의미 보존, 과도한 수정 여부, 패턴 제거 여부를 자체 점검한다.

## 아키텍처

```text
User Draft
    |
    v
/no-ai-slop Skill
    |
    +--> Detect request? ---- Yes ---> Pattern scan ---> Findings only
    |
    No
    v
Identify core point + voice traits
    |
    v
Minimum effective edit
    |
    v
eval.md self-check
    |
    +---- Fail ---> revise ---> eval again
    |
    v
Edited draft + What changed
```

구조 자체는 매우 가볍다. 별도의 서버, 모델 라우터, 벡터 DB가 있는 시스템이 아니라 `SKILL.md`가 편집 정책과 실행 절차를 정의하고 `eval.md`가 결과 검증 규칙을 담당한다. `.codex-plugin/plugin.json`은 ChatGPT/Codex plugin 패키징 정보를 제공한다.

## 주요 편집 원칙

특히 참고할 가치가 있는 규칙은 다음과 같다.

- **Minimum effective edit**: 필요한 부분만 수정한다.
- **Portability test**: 사람·회사·제품을 바꿔도 그대로 통하는 문장은 filler일 가능성이 높다고 본다.
- **Protect the specific fact**: 구체적인 수치나 사실을 추상적인 `생산성을 크게 향상` 같은 문장으로 평준화하지 않는다.
- **Show, don't tell**: `중요하다`, `놀랍다`라고 독자에게 해석을 지시하기보다 사실과 결과로 보여준다.
- **Do not infer AI authorship**: AI가 작성했는지를 추측하지 않고 관찰 가능한 패턴만 보고한다.

## 장점

1. **토큰 대비 효과가 좋다.** 별도 서비스나 실행 인프라 없이 재사용 가능한 프롬프트/Skill 계층으로 동작한다.
2. **일반적인 humanizer보다 목적이 명확하다.** 무조건 인간처럼 보이게 만드는 것이 아니라 특정 문체 문제를 이름 붙여 제거한다.
3. **검증 루프가 포함되어 있다.** `SKILL.md → edit → eval.md → retry` 구조는 다른 사내 Skill 설계에도 재사용할 만하다.
4. **작성자 voice 보존을 명시한다.** 문서 전체를 동일한 기업 문체로 평준화하는 위험을 줄인다.
5. **외부 서버 의존성이 없다.** plugin submission 설명 기준 인증이나 별도 서버 없이 사용할 수 있다.

## 단점 및 한계

- 규칙 기반이므로 AI 문체의 모든 변형을 포착하지 못한다.
- 금지 단어와 특정 영어 문장 패턴이 중심이라 한국어 문서에는 그대로 적용하기 어렵다.
- 일부 규칙은 문맥에 따라 정상적인 문체까지 과잉 수정할 수 있다. 예를 들어 binary contrast나 짧은 단문 자체가 항상 나쁜 것은 아니다.
- LLM이 `eval.md`를 스스로 수행하므로 독립적인 deterministic validator는 아니다.
- 사실 검증 도구는 아니다. 허위 정보나 논리적 오류를 자동 검증하는 역할과는 구분해야 한다.
- Enterprise 환경에서 문서 보안, 모델 데이터 정책 등은 이 Skill 자체가 해결하지 않는다.

## 활용 사례

### 바로 적용 가능

- AI가 작성한 사내 Wiki/기술 문서의 최종 문체 정리
- Claude Code/Codex가 생성한 README, PR 설명, 설계 문서 후처리
- 블로그/LinkedIn 초안의 AI 특유 표현 제거
- AI 문서 생성 Harness의 마지막 `Editor` 단계

### PoC 가치 있음

현재 사용하는 AI Workflow에 `Draft → Technical Review → No-Slop Review → Human Approval` 단계를 추가할 가치가 있다. 특히 문서 생성 Agent와 코드 작성 Agent가 함께 있는 Harness라면 별도의 `Writing Reviewer` Skill로 두는 편이 좋다.

```text
Research/Analysis Agent
        |
        v
Document Writer
        |
        v
Technical/Factual Review
        |
        v
No-AI-Slop Skill
        |
        v
Human Review
```

기술 검증보다 뒤에 배치하는 이유는 문체 편집 과정에서 구체적인 기술 사실이 손상되지 않았는지 최종적으로 확인하기 쉽기 때문이다.

### 아이디어 참고

`eval.md` 패턴은 글쓰기뿐 아니라 사내 Agent Skill 품질 관리 방식으로 확장할 수 있다. 즉 Skill마다 `SKILL.md + eval.md`를 한 쌍으로 두고 작업 결과를 반환하기 전에 자체 체크하도록 만드는 구조다.

### 현재는 도입 가치 낮음

한국어 문서만 처리하면서 영어 규칙을 그대로 사용하는 경우 효과가 제한적이다. 한국어용 상투 표현, 번역투, 불필요한 `~하는 데 있어`, `단순한 X를 넘어 Y`, 과도한 요약/결론 패턴 등을 별도로 정의해야 실무 가치가 높아진다.

## 기존 방식과 비교

| 방식 | 특징 | No AI Slop과 차이 |
|---|---|---|
| `더 자연스럽게 써줘` 프롬프트 | 간단하지만 모델 재량이 큼 | 구체적 패턴과 최소 수정 규칙을 명시 |
| AI detector | AI 작성 확률을 추정 | 작성 주체를 추측하지 않고 패턴만 제시 |
| 일반 grammar checker | 문법·맞춤법·가독성 중심 | AI 특유 수사법과 voice preservation에 집중 |
| Humanizer 도구 | AI 탐지 회피를 목표로 하는 경우가 많음 | 탐지 회피보다 글 자체의 품질과 개성 유지가 목적 |

## 프로젝트 성숙도

조사 시점 기준 저장소에는 Skill, eval, plugin packaging, GitHub Actions와 tagged release가 존재한다. 최신 확인 release는 v1.0.6이며 MIT 라이선스다. 프로젝트 규모는 작고 핵심 로직이 자연어 규칙이므로 유지보수 비용은 낮지만, 품질은 사용하는 모델의 instruction-following 능력에 크게 좌우된다.

## 활용 아이디어

개인/사내 AI Harness 관점에서는 프로젝트 전체를 도입하기보다 다음 두 아이디어를 가져오는 것이 특히 유용하다.

1. **문서 전용 Reviewer Skill**: 기술 문서 생성 후 AI 상투 표현과 불필요한 과장을 제거한다.
2. **Skill별 eval 파일 표준화**: 각 Skill에 `eval.md`를 붙여 결과 반환 전 self-review를 수행한다.

한국어 중심 환경이라면 원본을 fork하기보다 `no-ai-slop-ko` 성격의 내부 Skill을 만들고 실제 사내 AI 문서에서 자주 발견되는 패턴을 지속적으로 추가하는 방향이 더 적합하다.

## 결론

No AI Slop은 거대한 AI 도구가 아니라 작고 명확한 편집 Skill이다. 프로젝트 자체보다 **구체적인 실패 패턴을 명문화하고, 최소 수정 후 eval로 재검증하는 Skill 설계 방식**이 더 큰 인사이트다.

AI가 생성하는 Wiki, 보고서, PR 설명이 많아질수록 최종 출력의 획일적인 AI 문체를 줄이는 Reviewer 단계로 활용 가치가 있다. 다만 한국어 업무 환경에서는 패턴 현지화가 필요하다.

## 참고 자료

- https://github.com/petergyang/no-ai-slop
- https://github.com/petergyang/no-ai-slop/blob/main/skills/no-ai-slop/SKILL.md
- https://github.com/petergyang/no-ai-slop/blob/main/skills/no-ai-slop/eval.md
- https://github.com/petergyang/no-ai-slop/releases
