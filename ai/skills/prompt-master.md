---
title: Prompt Master
category: skills
tags:
  - ai
  - prompt-engineering
  - agent-skill
  - claude
  - claude-code
  - codex
source: https://github.com/nidhinjs/prompt-master
updated: 2026-08-31
---

# Prompt Master

> 사용자의 거친 요구사항을 대상 AI 도구에 맞는 구조화된 production-ready 프롬프트로 변환하는 Claude Skill.

## 프로젝트 개요

Prompt Master는 일반적인 프롬프트 모음이 아니라, 사용자의 의도를 분석하고 대상 AI 도구를 식별한 뒤 해당 도구의 특성에 맞춰 프롬프트를 생성·개선하는 재사용 가능한 Skill이다. Claude.ai Skill 업로드 또는 Claude Code의 skills 디렉터리에 설치하는 방식을 제공한다.

핵심 목표는 반복적인 re-prompt를 줄여 첫 시도 성공률을 높이고 토큰/크레딧 낭비를 줄이는 것이다.

조사 기준 버전은 `SKILL.md`의 v1.8.0이며, 2026-08-24에도 Claude/OpenAI/Grok 라우팅 갱신 커밋이 있어 현재도 모델 변화에 대응하는 유지보수가 진행되고 있다.

## 해결하려는 문제

AI 도구별로 효과적인 프롬프트 구조가 다르고 사용자가 매번 이를 기억하기 어렵다. 모호한 요청은 결과 불일치 → 재질문 → 재생성으로 이어져 시간과 토큰을 소모한다.

Prompt Master는 이를 다음 흐름으로 표준화한다.

```text
Rough Request
    ↓
Target Tool Detection
    ↓
Intent Extraction (9 dimensions)
    ↓
Critical Missing Context?
 ┌──Yes──┐
 ↓       │
≤3 Questions
 ↓       │
 └───────┘
    ↓
Tool-specific Routing
    ↓
Prompt Template / Safe Techniques
    ↓
Token Efficiency Audit
    ↓
Production-ready Prompt
```

## 핵심 기능

### 1. 9개 Intent Dimension 추출

- Task
- Target tool
- Output format
- Constraints
- Input
- Context
- Audience
- Success criteria
- Examples

필수 정보가 부족하면 최대 3개의 질문만 수행한다.

### 2. AI 도구별 Prompt Routing

Claude/Claude Code, ChatGPT/GPT, Codex, Grok, Gemini, Qwen, Ollama, DeepSeek, Cursor/Windsurf, Copilot, Devin, Midjourney, Stable Diffusion, Sora, Runway, ElevenLabs, Zapier/Make/n8n 등 다양한 대상별 프로필을 제공한다.

특히 coding agent에서는 단순 역할 프롬프트보다 file scope, action boundary, stop condition, acceptance criteria, verification command를 강조한다.

### 3. Prompt Template 자동 선택

프로젝트가 명시하는 주요 템플릿은 다음과 같다.

- RTF
- CO-STAR
- RISEN
- CRISPE
- Auditable Reasoning
- Few-Shot
- File-Scope Template
- ReAct + Stop Conditions
- Visual Descriptor
- Reference Image Editing
- ComfyUI
- Prompt Decompiler
- Current Claude Task Brief

프레임워크 이름 자체를 사용자 결과에 노출하기보다 최종 프롬프트를 바로 복사할 수 있게 만드는 것이 기본 정책이다.

### 4. 위험한 Meta-Reasoning 억제

Tree of Thought, Graph of Thought, simulated Mixture of Experts, Universal Self-Consistency 등 실제 외부 실행 구조 없이 한 번의 프롬프트에서 흉내내는 기법을 기본적으로 사용하지 않는다.

또한 hidden chain-of-thought를 요구하지 않고 conclusions, assumptions, evidence, verification 결과를 요청하도록 설계되어 있다.

### 5. Model Recency Gate

모델 이름이나 API 제어값처럼 변경 가능성이 높은 정보가 필요한 경우 공식 provider 문서를 확인하도록 규칙화한다. 이는 모델별 프롬프트 가이드가 빠르게 노후화되는 문제를 줄이기 위한 장치다.

## 아키텍처

실행 코드 중심의 Agent Framework라기보다 Markdown 기반 Skill이다.

```text
prompt-master/
├── SKILL.md
│   ├── identity / hard rules
│   ├── intent extraction
│   ├── tool routing
│   ├── model-specific guidance
│   └── output contract
├── references/
│   ├── templates.md
│   └── patterns.md
├── README.md
└── LICENSE
```

`SKILL.md`가 orchestration 및 policy 역할을 하고, 상세 템플릿과 anti-pattern은 `references/`로 분리한다. 따라서 별도의 서버, MCP, 데이터베이스, 런타임이 필요한 구조가 아니다.

## 장점

- **범용성**: 하나의 Skill에서 coding agent, LLM, image/video generation, automation 도구까지 라우팅한다.
- **Prompt 작성 표준화**: task/context/constraints/done criteria 같은 항목을 일관되게 보강한다.
- **Agent 작업에 적합**: Claude Code/Codex 계열에서 scope, approval boundary, stop condition, verification을 명시하도록 유도한다.
- **토큰 효율 지향**: 긴 프롬프트 자체를 목표로 하지 않고 출력에 영향을 주지 않는 문장을 제거하는 방향이다.
- **낮은 도입 비용**: Markdown Skill이므로 별도 서비스 운영이 필요 없다.
- **최신 모델 대응 의식**: Model Recency Gate와 최근 라우팅 업데이트가 존재한다.

## 단점 및 한계

### 모델별 가이드의 노후화 가능성

가장 큰 구조적 위험이다. 모델명, 제품 UI, API 옵션과 권장 prompting 방식은 빠르게 변한다. Model Recency Gate가 이를 완화하지만 Skill 내부에도 모델별 세부 정보가 상당량 하드코딩되어 있으므로 지속적인 업데이트가 필요하다.

### 프롬프트 최적화 효과를 정량적으로 보장하지 않음

README의 "zero wasted tokens", 첫 시도 성공 같은 표현은 프로젝트의 목표/마케팅 주장으로 보는 것이 적절하다. 실제 task benchmark나 A/B 평가 체계가 저장소에서 확인되는 것은 아니다.

### Skill 자체의 Context 비용

`SKILL.md`가 약 32KB이고 references도 존재한다. Progressive disclosure가 제대로 적용되지 않는 환경에서 전체 내용을 항상 context에 주입하면 오히려 토큰 비용이 증가할 수 있다.

### 특정 모델 정보의 정확성 의존

Tool profile이 잘못되거나 오래되면 Prompt Master가 생성하는 프롬프트 역시 잘못 최적화될 수 있다. 특히 API parameter와 consumer UI 옵션을 구분해야 한다.

### Enterprise 보안 정책은 핵심 기능이 아님

Issue에서 confidential code / proprietary information / personal data를 외부 AI prompt에 그대로 포함하지 않는 정책이 별도 개선점으로 제안된 바 있다. 사내 도입 시에는 Prompt Master 자체 규칙 외에 조직의 data classification 및 외부 전송 정책을 상위 규칙으로 두는 것이 안전하다.

## 활용 사례

### Claude Code / Codex 작업 지시서 생성

개발자가 "이 기능 수정해줘" 정도의 요구만 입력해도 다음 요소를 보강하는 전처리 계층으로 사용할 수 있다.

```text
Developer Intent
      ↓
Prompt Master
      ↓
Goal
Context
Scope
Constraints
Approval Boundaries
Done / Verification
      ↓
Claude Code / Codex
```

특히 여러 coding agent를 사용하는 조직에서 프롬프트 품질 편차를 줄이는 용도로 가치가 있다.

### Prompt Linter / Compiler

이미 작성된 프롬프트를 입력하여 모호한 task, scope 부족, success criteria 누락, 과도한 autonomy 등을 검출하고 대상 모델에 맞게 다시 생성하는 방식으로 활용할 수 있다.

### AI Workflow Front Door

사용자의 자연어 요구를 바로 Worker Agent에 전달하지 않고 Prompt Master와 유사한 정규화 단계를 먼저 거치게 할 수 있다.

```text
User Request
   ↓
Prompt Normalizer
   ↓
Task Contract
   ↓
Orchestrator
   ├─ Analysis Agent
   ├─ Coding Agent
   └─ Review Agent
```

이 경우 Prompt Master 전체를 그대로 사용하는 것보다 intent extraction과 task contract 생성 부분을 독립 모듈로 가져오는 방식이 더 적합할 수 있다.

## 기존 도구와 비교

Prompt Master의 차별점은 단순 prompt template collection이 아니라 **target-tool routing + intent normalization + anti-pattern detection + output contract**를 하나의 Skill에 묶었다는 점이다.

일반적인 prompt library는 사용자가 적절한 템플릿을 직접 선택해야 하지만 Prompt Master는 대상 도구를 식별하고 내부적으로 템플릿을 선택한다.

반면 전용 Agent Framework처럼 실제 tool execution, parallel agent orchestration, persistent state, memory system을 제공하지는 않는다. 따라서 Harness라기보다 Prompt Engineering Skill로 보는 것이 정확하다.

## 활용 아이디어

### 바로 적용 가능 — 개인 Claude Skill

Claude.ai 또는 Claude Code에서 prompt 작성 전용 Skill로 사용하는 것은 도입 비용이 매우 낮다. 여러 AI 도구를 오가면서 작업하는 환경일수록 효용이 높다.

### PoC 가치 있음 — Coding Agent Prompt Gateway

Claude Code/Codex 등에 전달하기 전 다음 구조로 요구사항을 정규화하는 공통 Skill을 만들 가치가 있다.

```text
Goal
Context
Scope
Constraints
Approval Boundaries
Done
Verification
```

Prompt Master의 전체 tool profile보다 이 contract normalization 부분이 개발 생산성 환경에서는 특히 재사용 가치가 높다.

### PoC 가치 있음 — Prompt Quality Gate

프롬프트를 바로 실행하지 않고 다음 항목을 검사하는 linter로 변형할 수 있다.

- target tool 명확성
- scope 명확성
- acceptance criteria 존재
- destructive action boundary
- verification 존재
- unnecessary token 제거

### 아이디어 참고 — Harness의 Prompt Compiler

멀티 에이전트 Harness에서 Orchestrator가 직접 긴 작업지시서를 만드는 대신 Prompt Master의 intent extraction/template routing 개념을 `Prompt Compiler` 단계로 도입할 수 있다.

다만 Agent 간 task contract가 이미 엄격하게 정의되어 있다면 Prompt Master 전체를 중간에 넣는 것은 context 중복과 token overhead를 만들 수 있다.

## 도입 평가

**평가: 바로 적용 가능 + 내부 Prompt Compiler 설계에 PoC 가치 높음.**

특히 이 프로젝트의 가치가 큰 부분은 30개 이상의 도구 이름 자체가 아니라 다음 네 가지 설계 원칙이다.

1. 사용자 의도를 구조화된 task contract로 변환
2. 대상 agent/model에 따라 contract를 변형
3. scope / approval / done / verification을 강제
4. 불필요한 prompt token 제거

따라서 그대로 설치해서 개인용 Prompt Skill로 사용하는 것과 별개로, 사내 AI Workflow에서는 핵심 원칙만 추출한 경량 Prompt Compiler를 만드는 방향이 더 장기적으로 유용하다.

## 결론

Prompt Master는 "프롬프트를 길게 만들어주는 도구"보다 **AI 작업 요청을 실행 가능한 계약(Task Contract)으로 컴파일하는 Skill**로 보는 편이 정확하다.

Claude Code/Codex 같은 agentic coding 환경에서는 단순 역할 지정보다 scope, action boundary, stop condition, acceptance criteria와 verification을 자동 보강하는 점이 실용적이다.

다만 모델별 세부 정보가 빠르게 낡을 수 있고 실제 토큰 절감/첫 시도 성공률에 대한 독립 benchmark는 확인되지 않으므로, 모든 규칙을 정답처럼 사용하기보다 Prompt Compiler의 설계 참고자료로 활용하는 것이 적절하다.

## 참고 자료

- https://github.com/nidhinjs/prompt-master
- https://github.com/nidhinjs/prompt-master/blob/main/SKILL.md
- https://github.com/nidhinjs/prompt-master/blob/main/references/templates.md
- https://github.com/nidhinjs/prompt-master/blob/main/references/patterns.md
- Repository issues and recent commits, checked 2026-08-31
