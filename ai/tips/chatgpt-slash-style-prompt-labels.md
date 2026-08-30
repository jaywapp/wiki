---
title: ChatGPT Slash-style Prompt Labels
category: tips
tags:
  - ai
  - chatgpt
  - prompting
  - study
  - productivity
source: https://help.openai.com/en/articles/11780217-chatgpt-study-mode-faq
updated: 2026-08-31
---

# ChatGPT Slash-style Prompt Labels

> `/cheatsheet`, `/blueprint`, `/flashcards`, `/mindmap` 같은 표현은 대체로 ChatGPT의 숨겨진 공식 명령어가 아니라, 원하는 출력 형태를 짧게 지정하는 **프롬프트 레이블(prompt label)** 로 이해하는 것이 정확하다.

## 프로젝트 개요

2026년 8월 소셜 미디어와 블로그에서 `/cheatsheet`, `/blueprint`, `/flashcards`, `/mindmap` 등을 이른바 "ChatGPT secret commands" 또는 "slash commands"로 소개하는 사례가 확산되고 있다.

조사 결과, OpenAI 공식 문서가 실제 shortcut으로 설명하는 것은 Study 같은 제품 기능이다. 예를 들어 일부 환경에서는 `/study`를 입력하면 suggestion list가 열리고 Study를 선택해 Study Mode를 켤 수 있다. 반면 `/cheatsheet`, `/blueprint`, `/flashcards`, `/mindmap` 네 표현을 OpenAI가 동일한 종류의 공식 내장 command로 문서화한 근거는 확인되지 않았다.

따라서 이 네 표현은 **자연어 프롬프트의 앞부분에 붙이는 출력 포맷 약어**로 사용하는 것이 적절하다.

## 핵심 구분

| 유형 | 예시 | 동작 방식 |
|---|---|---|
| 제품 Shortcut / 기능 선택 | `/study`, `@study` | 지원 환경에서 suggestion을 열고 실제 Study 기능을 선택/활성화 |
| Prompt Label | `/cheatsheet`, `/blueprint`, `/flashcards`, `/mindmap` | 모델이 문자열의 의미를 해석해 원하는 형태의 답변을 생성 |
| Custom Convention | `/review`, `/architecture`, `/research` 등 | 개인/팀이 자체적으로 정의하여 반복 사용 가능 |

즉 `/` 문자가 특별한 능력을 부여하는 것은 아니다. 모델에게 의도를 빠르게 전달하기 위한 convention으로서 가치가 있다.

## 4가지 레이블

### `/cheatsheet`

**목적:** 정보를 압축하고 빠르게 참조할 수 있도록 만든다.

인지 작업으로 보면 **Condense + Prioritize**에 가깝다.

추천 출력:
- 핵심 개념
- 명령어 / 문법
- 자주 쓰는 패턴
- 주의사항
- 한눈에 보는 표

예시:

```text
/cheatsheet C# async/await
대상: 실무 .NET 개발자
1페이지 분량으로 핵심 문법, 실수하기 쉬운 부분, 예제를 정리해줘.
```

### `/blueprint`

**목적:** 시스템이나 아이디어를 구성 요소와 관계 중심으로 분해한다.

인지 작업으로 보면 **Decompose + Relate**에 가깝다.

추천 출력:
- 목표
- 주요 컴포넌트
- 책임
- 데이터 흐름
- 인터페이스
- 실행 순서
- 기술 선택
- 구현 단계

예시:

```text
/blueprint AI Code Review Agent
Orchestrator, Analyzer, Reviewer의 역할과 데이터 흐름을 포함하고
Mermaid architecture diagram과 구현 단계를 작성해줘.
```

AI/AX 업무에서는 네 가지 중 실용성이 특히 높다. 시스템 설계 초안이나 Agent Harness 설계에 바로 활용할 수 있다.

### `/flashcards`

**목적:** 정보를 질문/답변 단위로 변환하여 기억 회상을 연습한다.

인지 작업으로 보면 **Question + Retrieval Practice**에 해당한다.

OpenAI 공식 Study Mode 역시 사용자가 퀴즈, 연습문제, flashcard-style review를 요청할 수 있다고 안내한다. 또한 2026년 공개된 College Student plugin은 course material을 이용한 flashcards 생성을 지원한다.

예시:

```text
/flashcards MCP Architecture
20개를 만들어줘.
앞면: 질문
뒷면: 답 + 한 줄 설명
쉬움 5 / 보통 10 / 어려움 5
```

### `/mindmap`

**목적:** 개념을 계층과 관계 중심으로 조직한다.

인지 작업으로 보면 **Organize + Connect**에 가깝다.

추천 출력:
- 중심 주제
- 1차 개념
- 하위 개념
- 개념 간 관계
- 필요하면 Mermaid mindmap

예시:

```text
/mindmap AI Agent Ecosystem
Model / Agent / Tool / MCP / Skill / Harness를 중심으로
관계를 Mermaid mindmap으로 표현해줘.
```

## 왜 동작하는가

LLM 입장에서 `/cheatsheet` 같은 문자열도 결국 prompt token이다.

```text
User Prompt
   ↓
/cheatsheet + Topic + Constraints
   ↓
LLM이 'cheatsheet'의 의미와 문맥 해석
   ↓
출력 구조 추론
   ↓
요약/표/핵심 포인트 생성
```

따라서 동일한 의미를 자연어로 풀어 써도 결과를 얻을 수 있다.

```text
/cheatsheet Git
```

와

```text
Git을 빠르게 참고할 수 있는 1페이지 치트시트로 정리해줘.
```

는 본질적으로 같은 종류의 요청이다.

## 장점

- 반복 프롬프트를 매우 짧게 만들 수 있다.
- 사용자가 원하는 출력 형태를 빠르게 고정할 수 있다.
- 개인 또는 팀 차원의 prompt vocabulary를 만들 수 있다.
- 모바일에서 긴 프롬프트를 입력할 필요가 줄어든다.
- Skill이나 Custom Instructions와 결합하기 쉽다.

## 단점 및 한계

### 공식 API나 명령어 계약이 아니다

`/cheatsheet`라는 이름만으로 특정 schema나 결과 형식이 보장되지 않는다.

모델, 대화 context, 사용자 지침 등에 따라 결과가 달라질 수 있다.

### 인터넷의 "Secret Commands" 목록은 주의

커뮤니티에는 `/xray`, `/deepdive`, `/redteam`, `/architecture`, `/visualize` 등 수십~수백 개의 표현을 secret code처럼 소개하는 자료가 있다.

대부분은 별도의 숨겨진 기능이라기보다 **의미 있는 영어 단어를 prompt shorthand로 사용하는 패턴**이다.

### `/`만으로 품질이 올라가지는 않는다

다음 두 요청 중 후자가 일반적으로 더 안정적이다.

```text
/blueprint MCP Server
```

```text
/blueprint MCP Server
대상: .NET 개발자
포함: Components, Data Flow, Security, Deployment
출력: Mermaid + 설명
```

즉 레이블은 **prompt를 대체하는 것이 아니라 prompt의 시작점**이다.

## 실무 활용 사례

### 기술 조사

```text
/cheatsheet Claude Code
```

빠른 기능 파악용.

### 시스템 설계

```text
/blueprint Multi-Agent Code Review Harness
```

PoC architecture 설계용.

### 기술 학습

```text
/flashcards MCP Protocol
```

새로운 기술 학습 및 복습용.

### Knowledge 구조화

```text
/mindmap Agentic Coding Ecosystem
```

새로운 분야를 탐색할 때 전체 구조를 잡는 용도.

## AI/AX 관점 활용 아이디어

### 바로 적용 가능 — 개인 Prompt Vocabulary

자주 사용하는 작업을 `/keyword` convention으로 통일할 가치가 있다.

예:

```text
/cheatsheet  → 빠른 참조 자료
/blueprint   → 시스템 설계
/flashcards  → 학습 카드
/mindmap     → 개념 구조화
/research    → 심층 기술 조사
/compare     → 기술 비교
/review      → 설계/코드 검토
```

이렇게 하면 긴 프롬프트를 반복 입력하는 대신 짧은 의도 표현 + 세부 조건만 입력할 수 있다.

### PoC 가치 있음 — Slash Label → Skill Routing

단순 convention을 실제 Agent Harness의 router로 승격시킬 수 있다.

```text
User
  │
  ├─ /cheatsheet ─→ Cheatsheet Skill
  ├─ /blueprint  ─→ Architecture Skill
  ├─ /flashcards ─→ Learning Skill
  ├─ /mindmap    ─→ Visualization Skill
  └─ /research   ─→ Research Agent
```

이 경우 `/keyword`가 단순 prompt가 아니라 실제 Skill 선택 명령이 된다.

예를 들어 Claude Code, Codex 또는 사내 Agent Harness에서 command parser가 prefix를 읽고 해당 Skill/Agent/System Prompt를 로드하도록 만들 수 있다.

### 아이디어 참고 — 조직 공용 AI Command Set

팀 차원에서 10~20개의 command vocabulary를 정의하면 AI 활용법을 표준화할 수 있다.

예:

```text
/brief
/research
/blueprint
/implement
/review
/test
/rootcause
/postmortem
/cheatsheet
```

각 명령에 output contract를 정의하면 개인별 prompt 편차를 줄이는 효과가 있다.

## 권장 사용법

가장 안정적인 형태는 다음 구조다.

```text
/<intent> <topic>

Context: ...
Goal: ...
Include: ...
Exclude: ...
Output: ...
```

예:

```text
/blueprint AI Code Review Agent

Context: Perforce + TeamCity 기반 사내 개발환경
Goal: PR/CL 코드리뷰 자동화
Include: Agent 역할, Context 전달, Tool 연결, 실패 처리
Output: Mermaid Architecture + Component 설명 + 구현 단계
```

Slash label의 짧은 사용성과 structured prompt의 안정성을 동시에 얻을 수 있다.

## 결론

`/cheatsheet`, `/blueprint`, `/flashcards`, `/mindmap`은 유용하지만 **ChatGPT의 비밀 내장 명령어라고 이해하면 안 된다.**

현재 공식 문서에서 확인되는 slash shortcut은 `/study`처럼 실제 제품 기능의 suggestion/activation과 연결되는 사례가 있으며, 그 사용 가능 여부도 앱과 계정에 따라 달라질 수 있다.

반면 네 레이블의 핵심 가치는 **짧고 기억하기 쉬운 prompt vocabulary**라는 점이다.

AI/AX 실무에서는 이를 그대로 사용하는 것보다 팀의 Skill/Agent 체계와 연결해 `/research`, `/blueprint`, `/review` 같은 **의도 기반 라우팅 규약**으로 발전시키는 것이 더 가치가 크다.

## 참고 자료

- OpenAI Help Center — Using Study Mode in ChatGPT: https://help.openai.com/en/articles/11780217-chatgpt-study-mode-faq
- OpenAI Academy — Use the College Student Plugin to Create Interactive Study Materials for Your Courses: https://academy.openai.com/public/clubs/higher-education-05x4z/blogs/college-student-plugin-interactive-study-materials
- OpenAI Academy — Turn Readings and Notes into Study Materials: https://academy.openai.com/en/public/clubs/higher-education-05x4z/blogs/turn-readings-and-notes-into-study-materials-2026-05-18
- OpenAI Help Center — ChatGPT Release Notes: https://help.openai.com/en/articles/6825453-chatgpt-release-notes

> 조사 기준: 2026-08-31. 공식 OpenAI 문서와 2026년 8월 커뮤니티/교육 자료를 교차 확인했다.
