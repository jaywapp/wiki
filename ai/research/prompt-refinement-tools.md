---
title: AI Prompt Refinement Tools 조사
category: research
tags:
  - ai
  - prompt-engineering
  - prompt-refinement
  - claude
  - chatgpt
  - coding-agent
updated: 2026-09-19
---

# AI Prompt Refinement Tools 조사

> 사용자가 AI 입력창에 거친 질문을 쓴 뒤 단축키 한 번으로 프롬프트를 정제하고 다시 붙여넣는 방식은 이미 여러 브라우저 확장·데스크톱 도구·IDE 확장에서 구현되고 있으며, 핵심 패턴은 **Prompt Preprocessor / Prompt Compiler**다.

## 조사 배경

Threads 게시물에서 다음 UX가 소개됐다.

1. 최초 1회 로그인
2. AI 입력창에 질문 작성
3. 단축키로 질문을 다듬음
4. `Ctrl+V`로 정제된 프롬프트 적용

게시물 캡처에는 `Ctrl+\`가 표시되어 있으나, 공개 검색으로 해당 단축키와 Google 로그인을 동시에 명시한 제품을 신뢰성 있게 특정하지 못했다. 따라서 특정 제품명은 추측하지 않고 **동일한 UX/기술 패턴을 구현하는 공개 도구군**을 조사했다.

## 핵심 패턴

```text
Rough Prompt
    ↓
Hotkey / Button
    ↓
Prompt Capture
    ↓
Rewrite Policy / Meta Prompt
    ↓
LLM 또는 Local Model
    ↓
Refined Prompt
    ↓
Clipboard / In-place Replace
    ↓
ChatGPT / Claude / Gemini / Coding Agent
```

중요한 점은 사용자의 질문을 답하는 것이 아니라 **실제 대상 AI에 전달하기 전에 질문 자체를 변환하는 전처리 계층**이라는 것이다.

## 확인된 구현 사례

### Prompt Enhancer — Chrome + Gemini Nano

Chrome Web Store의 Prompt Enhancer는 ChatGPT, Gemini, Claude, Perplexity 입력창에서 동작한다. `Ctrl+Shift+E`로 즉시 정제하고, `Ctrl+Shift+D`에서는 추가 질문을 통해 context를 보강한다.

특징:
- Chrome 내장 Gemini Nano 사용
- on-device 처리
- 별도 계정/API key 불필요
- diff 표시
- 최근 20개 prompt history를 로컬 저장
- 지원되지 않는 사이트에서는 선택 텍스트 → 우클릭 → clipboard 방식

이 구현은 외부 API 호출 없이 prompt preprocessing을 구현할 수 있다는 점에서 특히 흥미롭다.

### AI Prompt Enhancer

또 다른 Chrome 확장은 Tab / Shift+Tab / Ctrl+Tab을 각각 best-practice rewrite, 유사 prompt 검색, true-intent 기반 강한 rewrite에 할당한다.

- Gemini API key를 브라우저에 로컬 저장
- 최근 100개 prompt를 로컬 저장
- rewrite 요청만 Gemini로 전송
- 입력 필드 내부에서 직접 동작

단순 rewrite에 prompt history retrieval을 결합했다는 점이 차별점이다.

### PromptJolt

ChatGPT, Claude, Gemini composer에 직접 통합되는 Chrome 확장이다.

- `Ctrl+M`으로 rewrite
- 원문 복원 Undo
- prompt history
- 다국어 지원
- 자체 backend를 사용하므로 BYOK가 필요하지 않음

브라우저 입력창에 직접 개입하므로 UX는 좋지만 prompt가 외부 backend를 통과한다는 점은 사내 환경에서 검토가 필요하다.

### Prompto

Windows 전역 hotkey 방식의 prompt preprocessor다.

ChatGPT나 Claude에 한정되지 않고 editor, terminal 등 텍스트를 입력하는 여러 앱에서 동작한다. 입력 → hotkey → rewrite → 검토 → 전송이라는 구조다.

브라우저 DOM integration보다 **OS-level prompt gateway**에 가깝다는 점이 중요하다.

### Prompt Enhancer — VS Code

VS Code Marketplace에도 clipboard 중심 구현이 존재한다. 확장 간 chat panel의 입력 내용을 직접 읽거나 수정하기 어려운 제약 때문에 결과를 clipboard에 넣고 사용자가 paste하도록 설계한다.

이 패턴은 캡처의 `다듬기 → Ctrl+V` UX와 구조적으로 매우 유사하다.

### Prompt Enhancer — Windows selection replacement

공개 GitHub 구현 중에는 다음 방식도 확인된다.

```text
선택 텍스트
  ↓
Global Hotkey
  ↓
Ctrl+C simulation
  ↓
LLM rewrite
  ↓
Ctrl+V simulation
  ↓
원래 clipboard 복원
```

이 방식은 특정 AI 서비스의 DOM/API에 의존하지 않아 ChatGPT, Claude, IDE, terminal 등에서 공통으로 사용할 수 있다.

### FixMyPrompt — Claude Code

Claude Code 전용으로 prompt submit 시점에 prompt를 정제하는 프로젝트도 존재한다. 다만 Claude Code Hook API는 현재 composer 내용을 수정 가능한 상태로 다시 채워 넣는 기능을 제공하지 않는다.

따라서 FixMyPrompt는 rewrite를 승인해 전송하거나 clipboard에 넣어 사용자가 수정하도록 우회한다. tmux 환경에서는 pane paste를 이용해 입력창에 다시 넣는 방법을 사용한다.

이는 CLI agent에서 prompt preprocessor를 만들 때 **Hook만으로 완전한 in-place rewrite를 구현하기 어렵다**는 중요한 제약이다.

## 기존 Prompt Master와의 관계

Wiki의 `ai/skills/prompt-master.md`와 목적은 유사하지만 계층이 다르다.

```text
Prompt Master
= LLM 내부 Skill
= prompt → skill 호출 → refined prompt
= Skill 자체도 context/token 소비

Hotkey Prompt Refiner
= LLM 외부 Preprocessor
= text → 별도 처리 → refined prompt → target LLM
= 대상 session의 context를 소비하지 않음
```

따라서 반복적으로 prompt를 정제해야 하는 환경에서는 외부 preprocessor 방식이 대상 Claude/Codex 세션의 token budget 관점에서 더 깔끔할 수 있다. 단, rewrite에 별도 LLM을 사용한다면 전체 시스템 비용이 사라지는 것은 아니며 **비용이 target session 밖으로 이동하는 것**에 가깝다.

## 장점

- 대상 AI session의 context를 오염시키지 않는다.
- ChatGPT/Claude/Codex마다 prompt-refinement Skill을 설치할 필요가 없다.
- 사용자가 평소처럼 짧게 입력해도 구조화된 task request로 변환할 수 있다.
- 전역 hotkey 방식이면 브라우저, IDE, terminal을 공통 지원할 수 있다.
- 로컬 모델/Gemini Nano를 사용하면 rewrite 비용과 외부 전송을 줄일 수 있다.
- clipboard 방식은 특정 UI DOM 변화에 대한 의존성이 낮다.

## 단점 및 한계

### Prompt inflation

좋은 prompt가 반드시 긴 prompt는 아니다. rewrite 모델이 role, 배경, 출력 형식을 기계적으로 추가하면 오히려 target model의 input token이 증가할 수 있다.

따라서 optimizer의 목표는 "더 길게"가 아니라 **ambiguity 제거 + 필요한 constraint만 추가**여야 한다.

### Hallucinated requirements

사용자가 말하지 않은 framework, 기술 스택, 성공 기준 등을 rewrite 모델이 임의로 추가하면 원래 의도가 변형될 수 있다.

Enterprise/coding 환경에서는 다음 원칙이 필요하다.

- 명시되지 않은 사실을 만들어내지 않음
- 불확실한 값은 placeholder 또는 unspecified로 유지
- destructive action/permission을 임의로 확대하지 않음

### 보안

Hosted backend형 확장은 입력 prompt가 제3자 서버를 통과할 수 있다. 사내 코드, 경로, issue 내용, credential 등이 prompt에 포함될 수 있으므로 기업 환경에서는 중요한 제약이다.

선호 순서는 다음과 같다.

```text
Rule-based Local
      ↓
On-device Small Model
      ↓
Enterprise-approved LLM endpoint
      ↓
BYOK external provider
      ↓
Unknown hosted backend
```

### UI/Hook 제약

브라우저 확장은 DOM 변경에 영향을 받고, VS Code 확장은 다른 확장의 chat composer에 직접 접근하기 어렵고, Claude Code Hook은 입력창을 rewrite하여 되돌려 놓는 기능에 제약이 있다.

이 때문에 **clipboard가 가장 범용적인 interoperability layer**로 반복해서 등장한다.

## 실무 관점의 구조

가장 단순하고 범용적인 구조는 다음과 같다.

```text
              ┌─ ChatGPT
              ├─ Claude
User Input ───┼─ Claude Code
     │        ├─ Codex
     │        └─ IDE Chat
     ↓
Global Hotkey
     ↓
Capture Selected/Input Text
     ↓
Local Prompt Refiner
     │
     ├─ Rule Engine
     ├─ Local Model
     └─ Approved Remote Model
     ↓
Clipboard
     ↓
User Review
     ↓
Paste / Send
```

Prompt refinement를 target agent의 Skill이 아니라 **입력 장치와 Agent 사이의 독립 계층**으로 두는 것이 핵심이다.

## 활용 아이디어

### 바로 적용 가능 — Clipboard Prompt Refiner

Windows에서 다음 정도의 작은 tray app/CLI로 구현할 수 있다.

```text
Ctrl+Hotkey
 → current selection capture
 → rewrite
 → clipboard
 → Ctrl+V
```

AI chat 종류를 구분할 필요가 없기 때문에 구현 복잡도가 낮다.

### PoC 가치 있음 — Local Prompt Compiler

사내 환경에서는 local model 또는 승인된 endpoint를 이용해 다음 contract만 보강하는 경량 compiler가 적합하다.

```text
Goal
Context
Scope
Constraints
Expected Output
Done / Verification
```

항목이 필요하지 않은 task에서는 생략하여 prompt inflation을 막는다.

### PoC 가치 있음 — Target-aware Mode

동일한 원문이라도 목적에 따라 rewrite contract를 바꿀 수 있다.

```text
General Chat
Coding
Research
Debug
Code Review
Architecture
Documentation
```

단, 모델별 세부 prompt rule을 과도하게 하드코딩하면 유지보수 비용이 커진다.

### PoC 가치 있음 — Rewrite Cost / Effectiveness 측정

원문과 rewrite 결과를 함께 기록하면 실제 효과를 평가할 수 있다.

- original token
- refined token
- rewrite latency
- rewrite model cost
- target task token usage
- 추가 clarification 횟수
- 첫 시도 성공 여부
- 사용자가 rewrite를 수정/폐기했는지

단순히 "질문을 잘 써준다"가 아니라 **rewrite 비용보다 downstream 재작업 감소 효과가 큰지**를 검증해야 한다.

## 결론

Threads 캡처의 정확한 제품은 공개 자료만으로 특정하지 못했다. 그러나 해당 UX 자체는 이미 여러 제품에서 반복되는 명확한 패턴이다.

핵심은 Prompt Engineering Skill이 아니라 **LLM 호출 전에 위치하는 Prompt Preprocessing Layer**다.

특히 Claude Code/Codex 같은 coding agent 환경에서는 prompt refinement를 Skill로 구현하면 Skill 호출 자체가 target session의 context/token을 소비한다. 반면 hotkey + clipboard + 별도 local/cheap model 구조는 target session과 분리할 수 있다.

따라서 이 패턴에서 가장 참고 가치가 높은 요소는 특정 서비스가 아니라 다음 세 가지다.

1. **Global hotkey**
2. **Prompt preprocessing outside the target session**
3. **Clipboard as universal adapter**

향후 내부 구현을 검토한다면 "프롬프트를 길게 만드는 도구"보다 **사용자 intent를 최소한의 Task Contract로 컴파일하는 경량 로컬 도구**로 설계하는 것이 적합하다.

## 참고 자료

- Chrome Web Store — Prompt Enhancer (Gemini Nano), 확인 2026-09-19
- Chrome Web Store — AI Prompt Enhancer, 확인 2026-09-19
- Chrome Web Store — PromptJolt, 확인 2026-09-19
- Prompto 공식 사이트, 확인 2026-09-19
- Visual Studio Marketplace — Prompt Enhancer, 확인 2026-09-19
- GitHub — iamakashsoni/prompt-enhancer, 확인 2026-09-19
- GitHub — harshivpgajjar/fixmyprompt, 확인 2026-09-19
- 기존 Wiki — `ai/skills/prompt-master.md`
