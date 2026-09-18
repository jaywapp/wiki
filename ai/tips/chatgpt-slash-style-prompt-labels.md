---
title: ChatGPT Slash-style Prompt Labels
category: tips
tags:
  - ai
  - chatgpt
  - prompting
  - productivity
source: https://help.openai.com/en/articles/10032626
updated: 2026-09-10
---

# ChatGPT Slash-style Prompt Labels

> `/explain`, `/summarize`, `/research` 같은 표현은 대부분 ChatGPT의 숨겨진 공식 명령어가 아니라, 원하는 작업 의도를 짧게 전달하는 **프롬프트 레이블(prompt label)** 이다.

## 프로젝트 개요

SNS에서 「한국인에게 추천하는 ChatGPT 핵심 명령어 20」처럼 `/explain`, `/summarize`, `/rewrite`, `/debug` 등을 명령어로 소개하는 이미지가 공유된다. 이 표현들은 대부분 실제 제품 기능을 호출하는 고정 command가 아니라 자연어 prompt shorthand로 보는 것이 정확하다.

OpenAI 공식 가이드는 좋은 프롬프트의 핵심으로 작업을 명확히 지정하고 필요한 context와 원하는 결과 형식을 구체적으로 제공하는 방식을 권장한다. 따라서 `/summarize` 하나보다 `/summarize 아래 문서를 개발자 대상 5줄 + 리스크 3개로`처럼 쓰는 편이 안정적이다.

예외적으로 ChatGPT에는 실제 shortcut/UI 기능과 연결된 사례도 있다. 예를 들어 Study Mode는 지원 환경에서 `@study` 또는 일부 환경의 `/study` suggestion을 통해 실제 Study 기능을 선택할 수 있다. macOS 앱에도 과거 Search/Reason/Image 생성 등을 빠르게 선택하는 slash commands가 제공된 적이 있다. 즉 **제품 shortcut과 prompt label을 구분해야 한다.**

## 이미지의 20개 레이블 검증

| Label | 의도 | 실무 평가 |
|---|---|---|
| `/explain` | 개념 설명 | 유용. 대상 수준·예시·깊이를 함께 지정 권장 |
| `/summarize` | 요약 | 매우 유용. 길이와 보존할 정보를 명시 |
| `/rewrite` | 재작성 | 매우 유용. 목적·독자·톤을 추가 |
| `/improve` | 개선 | 너무 추상적. 평가 기준을 같이 주는 것이 중요 |
| `/translate` | 번역 | 유용. 대상 언어·문체·용어 보존 규칙 추가 |
| `/grammar` | 문법/맞춤법 교정 | 유용. 교정만 할지 문체까지 바꿀지 지정 |
| `/debug` | 코드 오류 분석 | 유용. 코드·오류 로그·기대 동작이 필요 |
| `/optimize` | 최적화 | 기준 없는 최적화는 모호함. 성능/메모리/토큰 등 목표 지정 |
| `/brainstorm` | 아이디어 발산 | 유용. 아이디어 수와 제약을 지정하면 좋음 |
| `/plan` | 실행 계획 | 매우 유용. 목표·기간·제약·완료조건 추가 |
| `/compare` | 비교 | 매우 유용. 비교 기준과 사용 시나리오 지정 |
| `/research` | 조사 | 이름만으로 웹 조사/Deep Research가 보장되지는 않음 |
| `/quiz` | 문제 생성/학습 | 유용. Study Mode와 결합하면 더 적합 |
| `/resume` | 이력서 작성 | 유용. 직무공고·경력·형식 제공 필요 |
| `/linkedin` | LinkedIn 글 작성 | 일반 prompt label. 공식 LinkedIn 기능 호출 아님 |
| `/carousel` | 카드뉴스 구성 | 일반 prompt label. 플랫폼/장수/카피 규칙 지정 |
| `/script` | 영상/릴스 대본 | 유용. 길이·매체·톤·CTA 지정 |
| `/sql` | SQL 생성 | 유용하지만 DB dialect/schema 제공 필요 |
| `/goal` | 목표/전략 수립 | 다소 추상적. 현재 상태·기간·측정지표 필요 |
| `/examples` | 예시 생성 | 유용. 개수·난이도·현실성 기준 추가 |

## 핵심 문제

이 이미지의 가장 큰 오해 가능성은 **`/`를 붙이면 ChatGPT 내부의 특별 기능이 실행되는 것처럼 보인다는 점**이다.

대부분은 아래 두 문장이 본질적으로 동일하다.

```text
/summarize 이 문서
```

```text
이 문서를 요약해줘.
```

`/summarize`라는 문자열 자체가 별도의 API나 고정된 summarizer를 호출하는 것이 아니라 모델이 `summarize`라는 자연어 의도를 해석한다. 따라서 모델, context, custom instructions에 따라 결과가 달라질 수 있다.

## 더 좋은 사용 패턴

```text
/<intent> <target>
Context: ...
Goal: ...
Constraints: ...
Output: ...
```

예:

```text
/debug WPF ViewModel
Context: .NET 8 + Prism + ReactiveUI
Problem: command 실행 후 UI가 갱신되지 않음
Include: 가능한 원인, 확인 순서, 최소 수정안
Output: 원인 후보를 가능성 순으로 정리
```

```text
/research Agent Harness
Goal: Perforce 환경에서 Claude/Codex를 함께 쓰는 구조 조사
Include: context 전달, token 절약, review 단계, Windows 제약
Output: 비교표 + 권장 architecture + PoC 순서
```

## AI/AX 관점의 활용

### 바로 적용 가능 — 개인 Prompt Vocabulary

20개를 그대로 외우기보다는 반복 빈도가 높은 8~12개만 개인 vocabulary로 정하는 것이 낫다.

```text
/explain     설명
/summarize   압축
/rewrite     재작성
/research    조사
/compare     비교
/plan        계획
/debug       문제 분석
/review      검토
/blueprint   구조 설계
/cheatsheet  빠른 참조
```

### PoC 가치 있음 — Slash Label → Skill Routing

일반 ChatGPT에서는 prompt label이지만 자체 Harness에서는 실제 command contract로 승격할 수 있다.

```text
User Input
    │
    ├─ /research ──→ Research Skill ──→ Web/GitHub Tools
    ├─ /debug ─────→ Debug Skill ─────→ Code + Logs
    ├─ /review ────→ Review Skill ────→ Reviewer Model
    └─ /plan ──────→ Planning Skill ──→ Task Breakdown
```

이렇게 구현하면 짧은 prefix가 실제 Skill 선택, system prompt 로딩, tool permission, output schema를 결정한다. 단순한 '비밀 명령어'보다 훨씬 실용적인 활용이다.

### 조직 적용 시 권장

명령어 이름보다 **Output Contract**를 정의하는 것이 중요하다.

예를 들어 `/research`를 팀 표준으로 만든다면 최소한 다음을 고정할 수 있다.

- 원본/공식 자료 우선
- 확인되지 않은 내용 명시
- 장점과 한계 모두 평가
- 실무 도입 수준 분류
- 출처 포함

그러면 사용자가 긴 프롬프트를 매번 작성하지 않아도 일관된 품질을 얻을 수 있다.

## 장점

- 모바일에서 입력량을 크게 줄일 수 있다.
- 반복 작업의 의도를 빠르게 전달한다.
- 개인·팀 vocabulary를 표준화하기 쉽다.
- Skill/Harness router와 결합하기 좋다.

## 단점 및 한계

- 대부분 공식 command가 아니므로 동작 계약이 없다.
- `/improve`, `/optimize`, `/goal`처럼 기준이 빠진 단어는 결과 편차가 크다.
- `/research`라고 쓴다고 자동으로 웹 검색이나 특정 Research 기능이 활성화된다고 가정하면 안 된다.
- `/sql`, `/debug` 등은 입력 context가 부족하면 그럴듯하지만 잘못된 결과를 만들 수 있다.
- 20개를 암기하는 것보다 작업별 template/Skill을 만드는 편이 반복 업무에는 효과적이다.

## 결론

이미지의 20개 표현은 **쓸모는 있지만 'ChatGPT 핵심 명령어 20개'라는 표현은 기술적으로 부정확하다.** 대부분은 자연어 프롬프트를 짧게 쓴 alias다.

개인 사용에서는 `/summarize`, `/compare`, `/debug` 같은 짧은 label + 구체적인 context/output 조건 조합을 추천한다. AI/AX 환경에서는 여기서 한 단계 더 나아가 `/research`, `/review`, `/plan` 등을 실제 Skill Router와 연결해 **명령어 → Skill → Tool → Output Contract** 구조로 만드는 것이 가장 가치가 높다.

## 참고 자료

- OpenAI Help Center — Prompt engineering best practices for ChatGPT: https://help.openai.com/en/articles/10032626
- OpenAI Help Center — How do I create a good prompt for an AI model?: https://help.openai.com/en/articles/4936848
- OpenAI Help Center — Using Study Mode in ChatGPT: https://help.openai.com/en/articles/11780217-chatgpt-study-mode-faq
- OpenAI Help Center — ChatGPT macOS app release notes: https://help.openai.com/en/articles/9703738

> 조사 기준: 2026-09-10. 이미지에 제시된 20개 항목을 OpenAI 공식 문서의 prompt/shortcut 동작과 비교해 검토했다.
