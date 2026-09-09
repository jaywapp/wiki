---
title: polish-doc
category: skills
tags:
  - ai
  - claude-code
  - skill
  - documentation
  - html
  - humanizer
source: https://github.com/albertrim/polish-doc
updated: 2026-09-04
---

# polish-doc

> 분석 결과·회의 노트·초안을 사람이 읽기 쉬운 하나의 독립형 HTML 문서로 재구성하고, 마지막에 AI 특유의 문체까지 제거하는 Claude Code Skill.

## 프로젝트 개요

`polish-doc`는 Markdown을 예쁘게 렌더링하는 도구라기보다 **문서 편집 규칙을 Skill로 패키징한 문서 폴리셔**에 가깝다. 입력 파일, 붙여넣은 텍스트, 또는 직전에 생성한 분석 결과를 읽어 하나의 standalone HTML로 만든다.

핵심 대상은 개발자가 아닌 독자다. 짧은 문장, 쉬운 단어, 결론 우선 구조, 반복 제거, 표와 다이어그램 활용을 강제한다. 최종 단계에서는 AI 문서에서 자주 보이는 균일한 문장 길이, 3개씩 묶는 습관, `먼저/또한/마지막으로` 같은 연결어, 과도한 완곡 표현 등을 다시 제거한다.

2026-09-04 기준 저장소는 매우 작은 초기 프로젝트이며, 확인된 커밋도 최초 공개 커밋 1건이다. 따라서 아이디어와 Skill 규칙은 유용하지만 성숙한 문서 플랫폼으로 평가하기에는 이르다.

## 해결하려는 문제

LLM으로 기술 문서를 만들면 정보는 많지만 실제 사람이 읽기에는 다음 문제가 자주 생긴다.

- 분석 결과가 길고 반복된다.
- 모든 섹션과 문장의 리듬이 비슷해 AI가 쓴 문서처럼 보인다.
- 중요한 결론보다 배경 설명이 먼저 나온다.
- 아키텍처나 흐름을 긴 문장으로 설명한다.
- 문서마다 스타일과 레이아웃이 달라진다.
- 공유 시 CSS, 이미지, CDN 등 외부 파일이 필요할 수 있다.

`polish-doc`는 이를 프롬프트 한 번의 요청이 아니라 **반복 가능한 편집 정책 + 고정 HTML Template**으로 해결하려 한다.

## 핵심 기능

### 1. 여러 입력을 하나의 문서로 통합

`.md`, `.txt`, `.html`, 붙여넣은 내용 또는 현재 세션의 결과를 입력으로 받는다. 여러 파일을 주면 파일별 섹션으로 단순 연결하지 않고 하나의 문서로 재편집한다.

### 2. 사람이 읽기 위한 강한 문장 규칙

- 한 문장에 하나의 주장
- 섹션 시작은 결론부터
- 중복, 변경 이력, 의미 없는 서론·마무리 제거
- 숫자, 날짜, 경로, ID, 명령어, 사람이 결정해야 하는 선택지는 보존
- 한국어/일본어 약 40자, 영어 약 18단어 수준의 짧은 문장을 목표로 함

### 3. 설명을 시각 구조로 치환

- 3단계 이상 절차 → flow box
- 시스템 간 이동 → inline SVG 아키텍처
- 오해와 실제 → 2열 비교
- 일정 → timeline
- 담당 관계 → 2-panel
- 동일 축의 3개 이상 비교 → table

외부 이미지나 JavaScript를 쓰지 않고 inline SVG/CSS만 사용한다.

### 4. AI 문체 제거 Revision Pass

초안 작성 후 반드시 다시 읽으며 AI writing tell을 제거하도록 지시한다.

특히 한국어에서는 `~라고 할 수 있습니다`, `~라는 점입니다`, `먼저/또한/마지막으로`, 번역투 표현 등을 줄이도록 명시한다. 문장 길이를 일부러 다양하게 만들고, 모든 항목을 3개로 맞추는 패턴도 깨도록 한다.

### 5. 다국어와 locale

Claude Code에서는 OS locale을 우선 사용한다. `ko_KR` 환경에서는 영어 입력도 기본적으로 한국어 문서로 만들 수 있다. CJK, Arabic, Devanagari fallback과 RTL 레이아웃도 고려한다.

### 6. standalone HTML

고정 `TEMPLATE.html`을 사용하며 외부 script, CDN, image file에 의존하지 않는다. 결과 HTML 하나만 전달해도 브라우저에서 동일하게 볼 수 있도록 설계되어 있다.

## 아키텍처

```text
Raw material
  │
  ├─ md / txt / html
  ├─ pasted notes
  └─ current Claude result
  │
  ▼
SKILL.md
  ├─ language selection
  ├─ content reduction
  ├─ sentence rules
  ├─ diagram selection
  └─ AI-tell revision
  │
  ▼
TEMPLATE.html
  ├─ fixed CSS
  ├─ inline SVG / CSS diagrams
  └─ locale-aware metadata
  │
  ▼
<topic>-<purpose>-YYYYMMDD.html
```

실질적인 엔진은 별도 프로그램이 아니라 `SKILL.md`의 지침을 수행하는 Claude다. `TEMPLATE.html`은 표현 계층을 고정한다. 즉 **LLM = 편집 엔진, Skill = 편집 정책, Template = 렌더링 규격**이라는 구조다.

## 설치 및 사용

Claude Code 글로벌 설치:

```bash
./install.sh
```

프로젝트 단위 설치:

```bash
./install.sh --project /path/to/repo
```

직접 복사:

```bash
cp -R skill/polish-doc ~/.claude/skills/
```

사용 예:

```text
/polish-doc analysis.md
/polish-doc meeting-notes.txt reference.html
/polish-doc <붙여넣은 내용>
/polish-doc
```

Claude Code 외부에서도 사용할 수 있다. 저장소의 `manual/PROMPT.md`는 `TEMPLATE.html`과 프롬프트를 ChatGPT, Gemini, claude.ai 등에 붙여 넣는 방식으로 같은 패턴을 재현한다.

## 장점

### 문서 품질 규칙이 구체적이다

`읽기 좋게 해줘` 수준이 아니라 무엇을 자르고, 무엇을 보존하고, 언제 그림으로 바꿀지까지 규칙화되어 있다. Skill 설계 참고 자료로 가치가 높다.

### 한국어 AI 문체 문제를 직접 다룬다

영어 Humanizer만 고려하는 프로젝트와 달리 한국어의 장황한 종결어미와 연결어까지 명시적으로 다룬다.

### 결과물의 일관성이 좋다

CSS를 매번 생성하지 않고 동일한 Template을 유지한다. 팀 내부 보고서나 분석 문서의 스타일 통일에 적합하다.

### 배포가 단순하다

HTML 한 파일이므로 Slack 전달, 브라우저 열람, 인쇄, 첨부가 쉽다. 외부 CDN도 필요 없다.

### Claude Code에 종속된 아이디어는 아니다

Skill 버전과 별도로 수동 프롬프트가 제공되어 ChatGPT/Gemini 같은 다른 LLM에도 편집 규칙을 이식할 수 있다.

## 단점 및 한계

### 매우 초기 단계다

2026-09-04 기준 최초 공개 커밋 수준이다. Release, 장기간의 유지보수 기록, 충분한 Issue/Discussion 기반 실사용 검증은 확인되지 않았다.

### HTML 중심이다

Confluence, Markdown, DOCX, PDF 등을 직접 목표 포맷으로 만드는 Skill은 아니다. 특히 Wiki의 Markdown을 그대로 개선하고 싶은 경우에는 출력 계층을 별도로 수정해야 한다.

### 정보 손실 위험이 있다

`half the raw material gets cut`처럼 적극적인 축약을 지향한다. 기술 명세, 감사 문서, 요구사항처럼 원문의 모든 조건을 보존해야 하는 문서에는 그대로 적용하기 위험하다.

### LLM의 판단에 의존한다

어떤 문장을 삭제할지, 어떤 설명을 다이어그램으로 바꿀지는 Claude의 판단이다. deterministic formatter나 validator가 아니므로 동일 입력에서도 결과가 달라질 수 있다.

### Template 고정의 양면성

일관성은 높지만 회사 디자인 시스템, Confluence 스타일, Wiki Markdown 규칙 등과 결합하려면 `TEMPLATE.html` 또는 출력 규칙을 포크해야 한다.

### Windows locale 처리 보완 필요

현재 Skill의 locale 탐지는 macOS `AppleLocale`과 Linux 계열 환경 변수를 중심으로 설명되어 있다. Windows/PowerShell 중심의 Enterprise 개발 환경에서는 locale 탐지 로직을 별도로 보강하는 편이 안전하다.

## 기존 도구와 비교

### 일반 Humanizer Prompt

Humanizer는 주로 문장 표현을 자연스럽게 만드는 데 집중한다. `polish-doc`는 문장뿐 아니라 **정보 구조, 시각화, HTML 레이아웃, 공유 형태**까지 한 번에 다룬다는 차이가 있다.

### Markdown Formatter / Linter

Formatter와 linter는 deterministic하게 문법과 스타일을 검사하지만 문서 내용을 재편집하지 않는다. `polish-doc`는 의미를 이해하고 내용을 삭제·병합·재배치하므로 역할이 다르다.

### 문서 생성 Agent

일반적인 문서 Agent가 `자료 → 초안`을 담당한다면 `polish-doc`는 `초안 → 사람이 읽는 최종 산출물`에 더 가깝다. 따라서 기존 Research/Analysis Agent 뒤에 post-processing 단계로 배치하기 좋다.

## 활용 사례

- AI 조사 결과를 비개발자에게 공유하는 HTML 보고서
- 회의 메모 여러 개를 하나의 의사결정 문서로 통합
- 긴 Claude/Codex 분석 결과를 읽기 쉬운 문서로 압축
- 아키텍처 설명을 inline SVG로 변환
- Slack/메일 첨부용 단일 HTML 리포트
- 사내 AI가 작성한 문서에서 AI 특유의 문체를 줄이는 최종 편집 단계

## 활용 아이디어

### 바로 적용 가능 — AI Research 결과의 최종 Polish 단계

현재 AI Knowledge Base 조사 흐름에 그대로 아이디어를 가져올 가치가 높다.

```text
Research
  → Technical Analysis
  → Wiki Draft
  → Polish/Humanize Pass
  → Validation
  → Wiki Commit
```

다만 Wiki는 Markdown이므로 `TEMPLATE.html` 부분은 제외하고 `SKILL.md`의 sentence/revision 규칙만 재사용하는 방식이 적합하다.

### 바로 적용 가능 — Confluence 문서 작성 Skill의 규칙 소스로 활용

기존 Confluence 가독성 개선 Skill을 설계할 때 다음 규칙을 차용할 가치가 높다.

- 결론 우선
- 중복 제거
- 한 문장 한 주장
- 표/다이어그램 우선
- AI tell 제거
- 독자 수준에 따른 용어 조정

### PoC 가치 있음 — 범용 `polish-doc-md` 포크

HTML 대신 Markdown을 출력하는 변형을 만들면 Wiki/Confluence/GitHub 문서 작성 파이프라인에 훨씬 쉽게 결합할 수 있다.

권장 구조:

```text
analysis agent
      │
      ▼
polish-doc-md
  ├─ preserve facts
  ├─ restructure
  ├─ humanize Korean
  └─ markdown readability
      │
      ▼
validator
      │
      ▼
Wiki / Confluence
```

특히 `절대 삭제하면 안 되는 정보`를 frontmatter나 옵션으로 지정하는 보존 규칙을 추가하는 것이 좋다.

### 아이디어 참고 — 문서 품질 Validator 분리

현재 Skill은 작성과 검수를 같은 LLM pass에서 처리한다. 이를 Writer와 Reviewer로 나누면 더 안정적인 Harness가 된다.

```text
Writer → Polish Skill → Reviewer → Publish
```

Reviewer는 숫자/경로/명령어 누락, 의미 변경, AI tell 잔존 여부만 검사하도록 제한할 수 있다.

## 실무 평가

**도입 판단: 바로 참고·적용할 가치가 높음.**

특히 AI가 생성한 Markdown/Confluence 문서가 너무 AI스럽고 읽기 어렵다는 문제에 직접 맞닿아 있다. 완성된 HTML 도구 자체보다 `SKILL.md`에 정의된 편집 규칙이 더 가치 있다.

현재 환경에서는 원본을 그대로 설치하는 것보다 다음 방향이 더 적합하다.

1. Humanize/revision 규칙을 공통 문서 Skill에 흡수한다.
2. HTML 대신 Markdown/Confluence 출력 adapter를 둔다.
3. 숫자·경로·명령·결정사항 보존 검증을 별도 Reviewer가 수행한다.
4. Windows locale 처리를 추가한다.

이렇게 하면 Research Agent, Wiki 자동화, Confluence 작성, Claude Code/Codex 결과 정리 모두에 재사용할 수 있는 **Document Polish Layer**가 된다.

## 결론

`polish-doc`는 작은 프로젝트지만 문제 정의가 좋다. 핵심은 HTML 생성이 아니라 **LLM 문서 생성 후 반드시 거쳐야 하는 편집 규칙을 Skill로 만든 것**이다.

특히 한국어 AI 문체 제거와 다이어그램 전환 규칙은 바로 가져다 쓸 만하다. 반면 적극적인 내용 삭제 정책은 기술 문서에 그대로 적용하기보다 fact-preservation validator와 함께 사용하는 것이 안전하다.

현재 AI/AX 환경에는 독립 도구로 도입하기보다 **공통 문서 폴리싱 Skill 또는 Research/Wiki Harness의 후처리 단계로 흡수하는 방향**을 추천한다.

## 참고 자료

- Repository: https://github.com/albertrim/polish-doc
- Skill rules: https://github.com/albertrim/polish-doc/blob/main/skill/polish-doc/SKILL.md
- Manual prompt: https://github.com/albertrim/polish-doc/blob/main/manual/PROMPT.md
