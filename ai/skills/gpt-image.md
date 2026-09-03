---
title: gpt-image
category: skills
tags:
  - ai
  - agent-skill
  - image-generation
  - gpt-image-2
  - claude-code
  - codex
source: https://github.com/egoist/gpt-image
updated: 2026-09-03
---

# gpt-image

> OpenAI `gpt-image-2`를 터미널과 Agent Skill에서 이미지 생성·편집 도구처럼 사용할 수 있게 만드는 경량 CLI + Skill 프로젝트.

## 프로젝트 개요

`egoist/gpt-image`는 `gpt-image-2`를 CLI에서 호출하고, Claude Code 같은 Agent 환경에서 자연어 이미지 요청을 자동으로 CLI 실행으로 연결하기 위한 프로젝트다.

저장소는 크게 두 부분으로 구성된다.

- `gpt-image/`: Bun 기반 CLI
- `skill/`: Claude Code 등 Agent가 CLI 사용법을 이해하도록 하는 Agent Skill

핵심은 이미지 API를 직접 매번 구현하는 대신 `bunx gpt-image`라는 단순한 실행 인터페이스를 Agent에게 제공하는 것이다.

## 해결하려는 문제

Coding Agent 환경에서는 코드·문서 생성은 자연스럽지만 이미지 생성은 별도 API 코드, 인증, 파일 저장 로직을 직접 구성해야 하는 경우가 많다.

이 프로젝트는 이를 다음 흐름으로 단순화한다.

```text
사용자 자연어 요청
        ↓
Agent Skill
        ↓
gpt-image CLI
        ↓
gpt-image-2
        ↓
PNG/JPEG/WebP 파일
```

Claude Code가 "로고 만들어줘", "이 스크린샷을 수정해줘" 같은 요청을 받으면 Skill 지침에 따라 CLI를 실행할 수 있다.

## 핵심 기능

### 이미지 생성

```bash
bunx gpt-image generate "a watercolor red fox in snowy forest" -o fox.png
```

### 이미지 편집

```bash
bunx gpt-image edit "make the sky a dramatic sunset" -i photo.jpg -o sunset.png
```

### 다중 Reference 이미지

여러 `-i` 옵션을 전달하여 여러 이미지를 조합하거나 참고 이미지로 사용할 수 있다.

### 크기와 품질 제어

- `--size`
- `--quality low|medium|high|auto`
- `-n 1~10`

등을 지원한다.

### 두 가지 인증 방식

1. `OPENAI_API_KEY`
2. ChatGPT Subscription OAuth

특히 OAuth 모드는 기존 Codex CLI의 `~/.codex/auth.json` 인증을 재사용할 수 있다.

따라서 이미 Codex를 로그인해 사용하고 있다면 별도 API Key 없이 ChatGPT 플랜 quota를 활용하는 구성이 가능하다.

단, README에서 이 OAuth 경로를 비공식 경로로 명시하고 있으며 OpenAI 측 변경으로 동작이 깨질 가능성이 있다.

## 아키텍처

```text
Claude Code / Agent
       │
       │ Skill trigger
       ▼
skill/SKILL.md
       │
       ▼
bunx gpt-image
       │
       ├── generate
       ├── edit
       └── login
       │
       ▼
OpenAI gpt-image-2
       │
       ▼
Local Image File
```

Skill은 자체 이미지 생성 모델을 포함하지 않는다.

Agent에게 언제 이미지 도구를 사용해야 하는지, 어떤 CLI 명령을 호출해야 하는지, 품질·비용·편집 시 주의점 등을 알려주는 실행 지침 역할을 한다.

## 장점

### Agent 친화적인 인터페이스

이미지 생성 코드를 매번 작성할 필요 없이 CLI 한 줄로 처리할 수 있다.

### Claude Code와 자연스럽게 결합

Agent Skill로 설치하면 이미지 생성/편집 요청을 자동으로 감지하는 워크플로우를 만들 수 있다.

### Codex 인증 재사용

Codex CLI 로그인 정보를 활용할 수 있어 개인 개발 환경에서 설정 부담이 작다.

### 생성과 편집을 동일한 인터페이스로 처리

Text-to-image뿐 아니라 이미지 수정, 여러 reference 이미지 결합도 지원한다.

### 설치가 단순함

```bash
npx skills add egoist/gpt-image
```

형태로 Skill 설치가 가능하다.

## 단점 및 한계

### OAuth 경로의 안정성

ChatGPT Subscription 인증 방식은 프로젝트에서도 비공식 경로라고 명시한다. OpenAI backend 변경에 따라 깨질 수 있으므로 Enterprise/CI 환경에서는 API Key 방식이 더 안정적이다.

### Bun 의존성

CLI 실행을 위해 Bun 1.0 이상이 필요하다. Node/Python 중심으로 표준화된 기업 환경에서는 추가 런타임 관리가 필요하다.

### 이미지 생성 비용/Quota

API Key 사용 시 이미지별 비용이 발생하고 OAuth 사용 시 ChatGPT 플랜 quota를 소비한다. Agent가 반복 생성하도록 방치하면 비용 또는 quota 사용량이 커질 수 있다.

Skill도 기본적으로 한 장, auto quality를 권장한다.

### OAuth 기능 제한

OAuth 모드에서는 mask, JPEG/WebP 출력, compression이 지원되지 않으며 편집 reference 이미지 수도 제한된다.

### 프로젝트 성숙도

2026-07에 생성된 비교적 작은 프로젝트다. 장기 유지보수성과 OAuth 호환성은 관찰이 필요하다.

## 활용 사례

### AI Coding Agent의 디자인 Asset 생성

Claude Code/Codex 기반 개발 작업에서 다음을 한 흐름으로 처리할 수 있다.

```text
UI 구현
→ 필요한 이미지 판단
→ 이미지 생성
→ 프로젝트 assets 저장
→ 코드에서 이미지 사용
```

### 문서 및 Wiki용 이미지 생성

아키텍처 설명용 illustration, banner, concept image 등을 문서 작성 Agent가 직접 생성하도록 구성할 수 있다.

### 게임 개발 Asset PoC

게임 개발 과정에서 placeholder 이미지, concept asset, icon, texture reference 등을 빠르게 생성하는 용도로 활용 가능하다.

최종 production asset보다는 초기 시안과 placeholder 생성에 특히 적합하다.

## 기존 도구와 비교

GitHub에는 유사한 GPT Image Skill이 여러 개 존재한다.

- `wuyoscar/GPT-Image2-Skill`: prompt gallery와 craft reference를 포함한 보다 무거운 workflow
- `ycwfs/gpt-image`: Python CLI + 명시적 Codex delegation 구조
- `GENEXIS-AI/gpt-image-skill`: ChatGPT/Codex built-in image generation 중심
- `inference-sh/skills`: GPT Image 외 FLUX, Gemini, Grok 등 여러 모델을 routing

`egoist/gpt-image`의 강점은 범용 image platform보다는 **작고 단순한 CLI + Agent Skill + Codex OAuth 재사용**에 있다.

## 활용 아이디어

### 바로 적용 가능

개인 Claude Code/Codex 개발 환경에서 이미지 생성 Skill로 설치할 가치가 높다.

특히 이미 Codex 인증을 사용한다면 초기 설정 비용이 매우 낮다.

### PoC 가치 있음

AI Agent가 UI를 구현하면서 필요한 placeholder/icon/banner를 자동 생성하는 workflow.

```text
Requirement
   ↓
Coding Agent
   ├── Code
   ├── UI
   └── gpt-image Skill
          ↓
      Asset Generation
```

### Harness 결합

기존 Agent Team/Harness에 `Image Worker` 역할을 추가하는 방식도 가능하다.

```text
Orchestrator
 ├─ Analysis Agent
 ├─ Coding Agent
 ├─ Review Agent
 └─ Image Agent
      └─ gpt-image
```

UI 개발, 문서화, 게임 Tool 제작 과정에서 이미지가 필요할 때 Image Agent에게 위임할 수 있다.

### Enterprise 환경

OAuth보다 API Key 기반 실행을 권장한다. API Key 보관, 비용 제한, 생성 Asset 검수 및 라이선스 정책을 별도로 설계해야 한다.

## 결론

`egoist/gpt-image`는 복잡한 이미지 플랫폼이라기보다 **Coding Agent에게 이미지 생성 능력을 붙이는 얇은 Adapter**에 가깝다.

Claude Code/Codex 중심의 개발 workflow를 운영한다면 설치 난이도가 낮고 활용 범위도 넓다. 특히 Codex 인증을 재사용할 수 있다는 점은 개인 환경에서 매력적이다.

다만 ChatGPT OAuth 방식은 비공식 경로이므로 장기적인 자동화나 Enterprise 환경에서는 API Key 기반 구성을 우선하는 것이 안전하다.

평가: **바로 적용 가능 + Agent Harness 확장용 PoC 가치 높음**.

## 참고 자료

- https://github.com/egoist/gpt-image
- https://github.com/egoist/gpt-image/blob/main/README.md
- https://github.com/egoist/gpt-image/blob/main/skill/SKILL.md
- https://github.com/wuyoscar/GPT-Image2-Skill
- https://github.com/ycwfs/gpt-image
- https://github.com/GENEXIS-AI/gpt-image-skill
