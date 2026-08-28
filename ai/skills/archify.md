---
title: Archify
category: skills
tags:
  - ai
  - agent
  - agent-skill
  - architecture
  - diagram
  - claude-code
  - codex
source: https://github.com/tt-a1i/archify
updated: 2026-08-28
---

# Archify

> AI 코딩 에이전트가 코드베이스나 시스템 설명을 분석해, 검증 가능한 typed JSON IR을 거쳐 고품질 인터랙티브 아키텍처 다이어그램으로 만드는 Agent Skill + Node.js 렌더링/검증 도구다.

## 프로젝트 개요

Archify는 Cursor, Claude Code, Codex CLI, OpenCode 등에서 사용할 수 있는 Agent Skill이다. 에이전트가 자연어 요구사항 또는 실제 저장소 근거를 바탕으로 typed JSON 중간 표현(IR)을 작성하고, Archify가 이를 결정론적으로 검증·렌더링해 self-contained HTML/SVG 산출물로 만든다.

단순 Mermaid 테마나 자동 레이아웃 도구가 아니라, 에이전트의 구조 판단과 deterministic validator/renderer를 결합해 '읽기 좋은 기술 커뮤니케이션 산출물'을 만드는 데 초점을 둔다.

조사 기준: 2026-08-28. README에는 개발 버전 v2.16.0-dev.0이 표시되어 있으며 최신 안정 릴리스는 v2.15.0(2026-08-17)이다.

## 해결하려는 문제

AI가 시스템 구조를 설명할 때 Mermaid 같은 텍스트 다이어그램을 쉽게 만들 수 있지만 다음 문제가 있다.

- 복잡도가 올라가면 자동 레이아웃 결과가 쉽게 난잡해진다.
- 선 교차, 라벨 충돌, 노드 겹침 등 시각 품질을 자동으로 보증하기 어렵다.
- AI가 실제 코드에 없는 관계를 추론해 그릴 수 있다.
- 결과를 리뷰/공유하기 좋은 독립 HTML이나 이미지로 만드는 후처리가 필요하다.
- 아키텍처 변경 전후를 구조적 사실 단위로 비교하기 어렵다.

Archify는 에이전트에게 작은 typed JSON spec을 작성하게 하고, 스키마/레이아웃/HTML/SVG/route/label clearance 등의 검증을 통과한 결과만 전달하도록 설계한다.

## 핵심 기능

### 1. 5가지 다이어그램 유형

- Architecture: 컴포넌트, 서비스, 스토리지, 보안/신뢰 경계
- Workflow: CI/CD, 승인 흐름, tool call, runbook
- Sequence: API 호출, 인증, 캐시 fallback, async trace
- Data Flow: pipeline, ETL/ELT, lineage, 데이터 경계
- Lifecycle: 상태 전이, retry, wait, cancellation, terminal state

### 2. Typed JSON IR + 결정론적 검증

에이전트가 직접 HTML/SVG를 즉흥 생성하는 대신 JSON IR을 먼저 만든다. 이후 `validate` → `deliver` 흐름으로 검사한다. Showcase 품질에서는 schema뿐 아니라 composition, route, label 충돌 등까지 검사하며 실패 시 machine-readable diagnostic과 수정 가능한 대상/방법을 제공한다.

### 3. 인터랙티브 standalone HTML

생성된 HTML은 별도 서버 없이 열 수 있으며 다음과 같은 탐색 기능을 제공한다.

- 검색 및 node focus
- authored upstream/downstream reach
- 정확한 authored route 탐색
- semantic role 비교
- guided story / presentation
- dark/light theme
- PNG/SVG/WebM/share card export

중요한 점은 viewer interaction이 새로운 topology를 추론하지 않고 authored relationship을 재사용한다는 것이다.

### 4. 코드 근거 기반 Architecture

필요한 경우 repository evidence를 사용해 node에 revision-pinned source/file/line 근거를 연결할 수 있다. 일반 다이어그램에서는 source evidence를 강제하지 않고 명시적으로 요청한 경우에만 활성화한다.

### 5. Architecture Delta

검증된 두 architecture snapshot을 Before / Delta / After 형태로 비교해 added, removed, changed, moved, rerouted 사실을 계산한다. PR 또는 설계 리뷰에서 유용하다.

### 6. Agent Skill 배포

기본 설치 예시는 다음과 같다.

```bash
npx skills add tt-a1i/archify -g
```

Cursor, Claude Code, Codex, OpenCode를 지원하며 DeepSeek Harness용 opt-in community bundle도 제공한다.

## 아키텍처

```text
User / Repository
       |
       v
Coding Agent
(Cursor / Claude Code / Codex / OpenCode)
       |
       | Agent Skill instructions
       v
Typed JSON IR
       |
       v
Archify CLI
  |-- schemas
  |-- validators
  |-- layout / routing
  |-- renderers
  |-- delta comparison
       |
       +--> validate --json
       |      \-- diagnostics / repair receipt
       |
       +--> deliver
              |
              v
     Self-contained HTML + SVG
              |
              +--> interactive viewer
              +--> PNG / SVG / WebM
              +--> Share Card
```

저장소의 핵심 패키지는 `archify/` 아래에 있으며 `SKILL.md`, `bin/`, `schemas/`, `renderers/`, `delta/`, `recipes/`, `references/`, `examples/`, `test/` 등으로 구성된다.

### 실행 흐름

1. 에이전트가 요청에 맞는 diagram type을 선택한다.
2. 해당 schema와 최소 예제를 읽는다.
3. 최대 12개 정도의 핵심 node를 중심으로 JSON candidate를 작성한다.
4. `validate <type> ... --quality showcase --json`을 실행한다.
5. 실패하면 diagnostic이 지목한 subject만 제한적으로 수정한다.
6. 최종 `deliver`가 검증된 spec을 HTML로 원자적으로 반영한다.
7. 필요 시 `visual-check`로 여러 desktop viewport의 containment와 screenshot evidence를 생성한다.

이 방식은 LLM에게 반복적으로 전체 그림을 다시 쓰게 하기보다 '에이전트의 의미 판단 + deterministic repair loop'를 결합한다는 점이 핵심이다.

## 장점

### AI 코딩 에이전트와 궁합이 좋음

별도 GUI 편집기를 조작하는 방식이 아니라 Skill + JSON + CLI 구조라 Claude Code/Codex 같은 터미널 기반 에이전트가 자연스럽게 사용할 수 있다.

### 결과 품질을 검증 가능

단순히 '그럴듯해 보이는 SVG'를 만드는 것이 아니라 validator가 객관적인 오류를 검출하고 수정 receipt를 반환한다. 반복 자동화에 특히 유리하다.

### 산출물의 휴대성이 높음

self-contained HTML 중심이라 Confluence 첨부, Wiki 링크, PR artifact, 설계 리뷰 자료 등으로 전달하기 쉽다. PNG/SVG/share card도 만들 수 있다.

### 실제 코드 근거를 붙일 수 있음

revision-verified source evidence를 선택적으로 사용할 수 있어 AI hallucination을 줄이는 방향이 명확하다.

### PR/설계 리뷰 활용성이 큼

Architecture Delta는 단순 시각화보다 한 단계 더 나아가 구조 변경 자체를 리뷰 artifact로 사용할 가능성이 있다.

## 단점 및 한계

### LLM의 구조 해석 품질에는 여전히 의존

validator는 authored topology의 시각적/구조적 일관성을 검사하지만 실제 시스템을 완전히 이해했다는 사실까지 보증하지 않는다. 저장소 분석이 잘못되면 '잘 검증된 잘못된 다이어그램'이 나올 수 있다.

### 범용 drawing tool이 아님

WYSIWYG 편집기나 자유형 다이어그램 도구가 아니다. 임의 배치와 디자인을 사람이 직접 세밀하게 조정하려는 용도에는 Excalidraw/Figma류가 더 적합하다.

### 복잡한 시스템은 의도적으로 축약해야 함

Skill 자체가 명확한 main path와 제한된 primary node를 권장한다. 거대한 enterprise topology 전체를 한 장에 담는 목적에는 맞지 않는다.

### 브라우저/Node 기반 도구 체인

Node.js가 필요하며 visual-check 및 일부 export에는 Chrome/Chromium 환경이 필요하다. 폐쇄망/Enterprise PC에서는 실행 정책과 브라우저 설치 여부를 확인해야 한다.

### 한국어 Viewer UI

작성된 다이어그램의 설명은 한국어로 만들 수 있지만 renderer-owned locale은 현재 `en`, `zh-CN` 중심이며 그 외 언어는 Viewer UI가 영어 fallback된다. 한국어 문서에서 UI까지 완전 현지화하려면 제약이 있다.

### 빠르게 변화 중인 프로젝트

2026-08 기준 v2.x에서 기능 추가와 viewer 수정이 활발하다. 최근에도 viewer navigation 및 CI 관련 commit이 이어지고 있어 안정화된 장기 API라기보다는 발전 중인 프로젝트로 보는 것이 안전하다.

## 활용 사례

### 코드베이스 온보딩

신규 개발자가 저장소를 처음 볼 때 핵심 runtime path와 외부 dependency만 8~12개 node로 시각화한다.

### PR Architecture Review

PR 전후 snapshot을 생성하고 Architecture Delta로 구조 변화만 검토한다. 큰 refactoring, service split, storage 변경 등에 적합하다.

### CI/CD 및 Agent Workflow 문서화

TeamCity/GitHub Actions/Agent pipeline 같은 흐름을 Workflow 타입으로 만들면 텍스트 문서보다 실행 순서와 분기를 빠르게 이해할 수 있다.

### API/인증/캐시 흐름 설명

Sequence 타입으로 Browser → API → Auth → Redis → DB fallback 같은 요청 경로를 문서화한다.

### AI Harness 구조 문서화

Orchestrator → Analysis Agent → Worker → Reviewer → Tool/MCP 관계를 Architecture/Workflow로 분리해 표현하기 좋다.

## 기존 도구와 비교

| 항목 | Archify | Mermaid | Excalidraw / Figma |
|---|---|---|---|
| 주 작성자 | AI Agent 중심 | 사람/AI | 사람 중심 |
| 입력 | typed JSON IR | DSL | GUI |
| 자동 검증 | 강함 | 제한적 | 거의 없음 |
| 인터랙티브 탐색 | 내장 | 제한적 | 도구 의존 |
| 코드 근거 연결 | 지원 | 직접 구현 필요 | 수동 |
| 변경 비교 | Architecture Delta | 별도 diff 필요 | 수동 |
| 자유로운 디자인 | 제한적 | 제한적 | 매우 강함 |
| 자동화/CI 적합성 | 높음 | 높음 | 낮음 |

Archify의 경쟁력은 '예쁜 Mermaid'가 아니라 AI Agent가 반복적으로 신뢰 가능한 기술 시각화 artifact를 생산하도록 만드는 검증 파이프라인에 있다.

## 활용 아이디어

### 바로 적용 가능

**Claude Code / Codex의 repository analysis 후처리 Skill**로 붙일 가치가 높다. 코드 분석 작업이 끝난 뒤 결과를 Markdown만 남기지 않고 Architecture/Sequence HTML까지 생성하게 하면 온보딩 및 리뷰 품질을 높일 수 있다.

예시 요청:

```text
이 저장소의 실제 코드를 분석하고 Archify를 사용해 runtime architecture를 작성해줘.
핵심 컴포넌트는 8~12개로 제한하고 primary execution path와 외부 의존성,
trust boundary를 표시해. 추측한 관계는 넣지 말고 가능한 경우 source evidence를 연결해.
```

### PoC 가치 있음

**PR Architecture Delta 자동 생성**은 개발 생산성 측면에서 특히 가치가 있다. 큰 PR에 대해서만 base/head 구조 snapshot을 생성해 PR artifact 또는 Wiki에 링크하는 방식으로 시험해볼 만하다.

또한 기존 AI Harness에서 작업 종료 단계에 Archify를 선택적으로 호출해 다음 artifact를 자동 생성할 수 있다.

```text
Analysis Agent
   -> implementation / review
   -> architecture changed?
        | no  -> finish
        | yes -> Archify snapshot
                   -> validate
                   -> delta
                   -> PR/Wiki artifact
```

### 아이디어 참고

Archify의 `typed IR → deterministic validation → targeted repair receipt → atomic delivery` 구조는 다이어그램 외 AI artifact 생성에도 참고할 가치가 크다. AI가 문서/설정/코드를 생성한 뒤 전체 재생성 대신 validator가 수정 범위를 제한하는 패턴이다.

### 현재는 도입 가치 낮음

모든 소규모 코드 변경마다 자동으로 다이어그램을 만드는 것은 비용과 noise가 더 클 가능성이 높다. architecture boundary가 변하는 PR, 신규 서비스, onboarding 문서 등으로 trigger를 제한하는 편이 적절하다.

## Enterprise / Windows 관점

v2.15.0 release에서 DeepSeek Harness packaging의 Windows portability 수정이 포함됐고 DSH integration release matrix도 Windows를 포함한다. 다만 실제 사내 도입에서는 다음을 별도로 확인해야 한다.

- `npx skills` 실행 허용 여부
- Node.js 버전 정책
- Chrome/Chromium 실행 가능 여부
- 생성 HTML의 사내 보안 정책
- source evidence에 내부 repository 경로/코드 정보가 포함될 때의 배포 범위
- 외부 brand icon capture 기능 사용 제한

내부 코드라면 artifact를 외부 공개하지 않고 사내 Wiki/CI artifact 범위에서만 관리하는 것이 적절하다.

## 결론

Archify는 단순한 다이어그램 생성기보다 **AI Agent용 기술 시각화 compiler/validator**에 가깝다. 특히 Claude Code나 Codex가 코드베이스를 분석한 뒤 사람이 리뷰하기 좋은 결과를 남기는 마지막 단계에 잘 맞는다.

실무 평가: **PoC 가치 높음**.

가장 먼저 시험할 시나리오는 다음 두 가지다.

1. 기존 저장소 runtime architecture 자동 생성 + source evidence 정확도 검증
2. 큰 PR 하나를 대상으로 Architecture Delta가 실제 코드리뷰 시간을 줄이는지 검증

두 시나리오에서 topology 정확도와 artifact 가독성이 충분하면 AI 개발 workflow의 표준 문서화 Skill로 채택할 가치가 있다.

## 참고 자료

- Repository: https://github.com/tt-a1i/archify
- Project page: https://tt-a1i.github.io/archify/
- Skill definition: https://github.com/tt-a1i/archify/blob/main/archify/SKILL.md
- Design system: https://github.com/tt-a1i/archify/blob/main/DESIGN.md
- Releases: https://github.com/tt-a1i/archify/releases
