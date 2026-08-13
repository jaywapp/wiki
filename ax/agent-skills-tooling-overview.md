# Agent Tooling Skills 정리

> `agent-browser`, `find-skills`, `GSD Core(get-shit-done)`, `mcp-builder` 비교

## 한눈에 보기

| 항목 | 핵심 역할 | 성격 | 추천도 |
|---|---|---|---|
| `agent-browser` | AI가 웹/브라우저를 직접 조작 | Tool + Skill | ⭐⭐⭐⭐⭐ |
| `find-skills` | 필요한 Agent Skill 검색·설치 | Meta Skill | ⭐⭐⭐⭐⭐ |
| `GSD Core` (`get-shit-done`) | 복잡한 개발을 계획→구현→검증→배포로 운영 | 개발 Framework | ⭐⭐⭐⭐⭐ |
| `mcp-builder` | 품질 좋은 MCP 서버 설계·개발 | 개발 Skill | ⭐⭐⭐⭐ |

네 가지는 서로 경쟁 관계라기보다 역할이 다르다.

- `find-skills`: 필요한 능력을 찾아준다.
- `agent-browser`: 브라우저를 실제로 조작하는 실행 능력을 준다.
- `mcp-builder`: 새로운 외부 도구/MCP를 만드는 방법을 제공한다.
- `GSD Core`: 이 능력들을 포함한 개발 작업 전체를 구조화해서 운영하는 프레임워크에 가깝다.

---

## 1. agent-browser

Vercel Labs가 개발하는 **AI Agent용 브라우저 자동화 CLI**다.

단순히 웹페이지 내용을 읽는 것이 아니라 실제 브라우저를 대상으로 다음 작업을 수행할 수 있다.

- 페이지 이동
- 버튼/링크 클릭
- 폼 입력
- 로그인 및 인증 상태 유지
- 데이터 추출
- 스크린샷
- 웹 애플리케이션 QA/E2E 테스트
- Electron 애플리케이션 자동화

### 특징

DOM 전체를 모델에게 넘기는 방식보다는 accessibility tree를 활용해 `@e1`, `@e2` 같은 compact element reference를 제공한다.

이를 통해 코딩 에이전트가 비교적 작은 컨텍스트로 웹 UI를 조작할 수 있다.

세션 유지, 인증 vault, 상태 저장, 영상 녹화 등의 기능도 제공한다.

### 설치

```bash
npm i -g agent-browser
agent-browser install

npx skills add vercel-labs/agent-browser
```

설치된 버전에 맞는 사용 지침을 가져올 수도 있다.

```bash
agent-browser skills get core
agent-browser skills get core --full

agent-browser skills get electron
agent-browser skills get slack
agent-browser skills get dogfood
```

### 적합한 작업

- 사내 웹 관리 페이지 자동화
- 웹 기반 운영 업무 자동화
- E2E/QA
- 웹사이트 데이터 수집 후 후속 작업 수행
- Electron 기반 앱 자동화

### 링크

- GitHub: https://github.com/vercel-labs/agent-browser
- Skill: https://github.com/vercel-labs/agent-browser/blob/main/skills/agent-browser/SKILL.md

---

## 2. find-skills

Vercel Labs의 `skills` 프로젝트에 포함된 **Skill 검색용 Meta Skill**이다.

에이전트가 자신에게 없는 전문 능력이 필요할 때 공개된 Agent Skill을 검색하고 적절한 스킬을 찾아 설치하도록 유도한다.

예를 들어 React 성능 개선 관련 전문 Skill이 필요한 경우 다음처럼 검색할 수 있다.

```bash
npx skills find react performance
```

### 주요 명령

```bash
npx skills find "browser automation"
npx skills find "ui ux"
npx skills add <owner/repo@skill>
npx skills update
```

### 개념적 흐름

```text
사용자 요청
    ↓
기본 능력으로 가능한가?
    ├─ Yes → 실행
    │
    └─ No / 전문성이 필요한가?
             ↓
        find-skills
             ↓
       Skill 검색/검증
             ↓
          설치
             ↓
          작업 수행
```

Skill 자체에서도 추천 전 설치 수, 제작자 신뢰도, GitHub popularity 등을 살펴보도록 안내한다.

공식/신뢰 가능한 소스를 우선하는 방식이므로 범용 Claude Code/Codex 환경의 기본 Meta Skill로 활용하기 좋다.

### 링크

- GitHub Skill: https://github.com/vercel-labs/skills/blob/main/skills/find-skills/SKILL.md
- Skill 검색: https://skills.sh

---

## 3. GSD Core (get-shit-done)

`get-shit-done`은 단순한 Skill보다는 **AI Coding Agent를 위한 Spec-driven Development / Context Engineering Framework**에 가깝다.

기존 `gsd-build/get-shit-done` 저장소는 archive되었고 현재 개발은 `open-gsd/gsd-core`에서 이어지고 있다.

### 핵심 Workflow

```text
Discuss
   ↓
Plan
   ↓
Execute
   ↓
Verify
   ↓
Ship
```

GSD가 중요하게 보는 문제 중 하나는 **Context Rot**다.

하나의 거대한 AI 세션에서 계속해서

```text
조사
→ 설계
→ 구현
→ 디버깅
→ 수정
→ 리뷰
```

를 수행하면 컨텍스트가 비대해지고 에이전트의 작업 품질이 떨어질 수 있다.

GSD는 무거운 작업을 fresh-context subagent에 나누어 실행하고 `STATE.md`, `CONTEXT.md` 같은 구조화된 파일을 이용해 세션 간 상태를 유지한다.

구현 이후 명시적인 Verify 단계까지 포함하는 것도 중요한 특징이다.

### 지원 환경

Claude Code 전용 구조가 아니라 여러 Coding Agent runtime에서 사용할 수 있도록 확장되고 있다.

예:

- Claude Code
- Codex
- OpenCode
- Cursor
- Windsurf
- Copilot
- Kimi CLI

### 설치

```bash
npx @opengsd/gsd-core@latest
```

새 프로젝트:

```text
/gsd-new-project
```

기존 프로젝트:

```text
/gsd-onboard
```

### 평가

네 가지 중 **개발 Agent 운영 방식 자체에 가장 큰 영향을 주는 프로젝트**다.

단순히 능력을 하나 추가하는 것이 아니라 다음 질문에 대한 하나의 구현체를 제공한다.

> 복잡한 소프트웨어 개발 프로젝트를 AI에게 어떤 단위로 나누어 맡기고, 상태와 컨텍스트를 어떻게 관리할 것인가?

따라서 실제 도입을 검토한다면 다음 항목을 추가로 분석할 가치가 높다.

- 폴더 구조
- 명령어 체계
- Subagent 구조
- Context 관리 방식
- 상태 파일 구조
- Plan / Execute / Verify 사이의 데이터 전달 방식

### 링크

- 현재 GitHub: https://github.com/open-gsd/gsd-core
- 구 저장소(Archive): https://github.com/gsd-build/get-shit-done

---

## 4. mcp-builder

Anthropic의 `anthropics/skills`에 포함된 **MCP Server 제작용 공식 Skill**이다.

목적은 단순히 MCP 코드를 생성하는 것이 아니라, 외부 API나 서비스를 LLM이 실제로 잘 사용할 수 있는 형태의 MCP Server로 설계하도록 돕는 것이다.

### 지원 방향

- Python FastMCP
- Node/TypeScript MCP SDK
- Tool 설계
- API coverage
- Workflow 중심 인터페이스 설계
- Pagination / filtering
- Context 크기 관리
- Actionable error message
- Evaluation

### 중요한 설계 관점

API endpoint를 무조건 1:1 Tool로 wrapping하는 것보다 **에이전트가 실제 수행해야 하는 workflow와 API coverage 사이의 균형**을 고려하도록 한다.

즉,

```text
API Endpoint
     ↓
Endpoint별 MCP Tool 생성
```

이라는 단순한 접근보다

```text
사용자가 수행하려는 작업
        ↓
Agent가 필요한 Workflow
        ↓
적절한 MCP Tool Interface 설계
        ↓
필요 API 조합
```

방식을 권장하는 쪽에 가깝다.

### 개발 Workflow

```text
1. Research & Planning
2. Implementation
3. Review / Refinement
4. Evaluation
```

마지막 Evaluation 단계에서는 단순히 API 호출이 성공하는지만 보는 것이 아니라 **LLM이 MCP를 이용해 실제 복잡한 작업을 해결할 수 있는지**를 검증하는 것이 중요하다.

Remote MCP는 Streamable HTTP, Local MCP는 stdio를 고려하도록 안내하며 TypeScript 기반 구현을 적극적으로 다룬다.

### 설치 예시

```bash
npx skills add https://github.com/anthropics/skills --skill mcp-builder
```

### 링크

- GitHub Skill: https://github.com/anthropics/skills/blob/main/skills/mcp-builder/SKILL.md

---

## 네 가지의 관계

```text
┌──────────────────────────────┐
│          find-skills         │
│   "필요한 능력을 찾아라"    │
└──────────────┬───────────────┘
               ↓

┌──────────────────────────────┐
│        agent-browser         │
│    "웹을 직접 조작해라"     │
└──────────────────────────────┘

┌──────────────────────────────┐
│         mcp-builder          │
│ "새로운 Tool/MCP를 만들어라"│
└──────────────────────────────┘

그리고 개발 Workflow 관점에서

┌──────────────────────────────┐
│           GSD Core           │
│ Discuss → Plan → Execute     │
│ → Verify → Ship              │
│                              │
│ "개발 자체를 체계적으로      │
│  운영해라"                   │
└──────────────────────────────┘
```

## 도입 관점 정리

범용 AI 개발 환경에서 능력을 확장한다면 다음 순서가 자연스럽다.

1. **find-skills** — 필요한 전문 Skill을 스스로 찾을 수 있게 한다.
2. **agent-browser** — 웹/브라우저 작업 능력을 추가한다.
3. **mcp-builder** — 필요한 외부 시스템용 Tool/MCP를 직접 만들 수 있게 한다.
4. **GSD Core** — 위 능력들을 포함한 복잡한 개발 Workflow 전체를 구조화하는 방식을 검토한다.

특히 `GSD Core`는 다른 세 항목처럼 단일 기능을 추가하는 Skill이 아니라 Agent 기반 소프트웨어 개발 프로세스 자체를 바꾸는 프레임워크이므로 별도의 심층 검토 대상으로 보는 것이 적절하다.
