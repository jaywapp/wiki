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
  - cursor
source: https://github.com/tt-a1i/archify
updated: 2026-08-31
---

# Archify

> AI 코딩 에이전트가 코드베이스나 시스템 설명을 typed JSON IR로 구조화하고, 결정론적 검증·렌더링을 거쳐 신뢰 가능한 인터랙티브 기술 다이어그램을 만드는 Agent Skill + Node.js 도구 체인이다.

## 프로젝트 개요

Archify는 Cursor, Claude Code, Codex CLI, OpenCode에서 사용할 수 있는 Agent Skill이다. 자연어 시스템 설명만으로도 동작하며, 필요하면 실제 Git 저장소와 특정 revision의 source evidence를 연결할 수 있다.

에이전트가 직접 SVG/HTML을 즉흥 생성하는 대신 typed JSON IR을 만들고 Archify가 schema, layout, route, label clearance, artifact 조건을 검증한 뒤 self-contained HTML/SVG로 컴파일한다. 따라서 핵심은 '예쁜 Mermaid'가 아니라 **Agent의 의미 판단과 deterministic compiler/validator를 결합한 기술 커뮤니케이션 파이프라인**이다.

조사 기준: 2026-08-31. 최신 안정 버전은 **v2.16.0 (2026-08-30)**이며 저장소는 8월 30일까지 localization 관련 변경이 merge되는 등 활발히 개발 중이다.

## 해결하려는 문제

AI가 Mermaid나 직접 생성 SVG로 시스템 구조를 설명하면 빠르지만 복잡도가 올라갈수록 선 교차, 라벨 충돌, 노드 겹침, 불안정한 재생성 문제가 발생한다. 더 중요한 문제는 AI가 실제 코드에 없는 관계를 그럴듯하게 추가할 수 있다는 점이다.

Archify는 이를 다음 방식으로 줄인다.

- 의미 구조를 typed JSON IR로 제한
- schema/layout/render 단계의 deterministic validation
- 실패 시 machine-readable repair receipt 제공
- source evidence 사용 시 Git revision과 파일/라인을 검증
- viewer interaction도 authored topology만 재사용
- 최종 산출물을 atomic delivery하여 실패한 후보가 마지막 정상 결과를 덮지 않도록 함

## 핵심 기능

### 1. 5가지 다이어그램

- **Architecture**: 컴포넌트, 서비스, storage, trust/security boundary
- **Workflow**: CI/CD, 승인, tool call, runbook, agent workflow
- **Sequence**: API call, auth, cache fallback, async trace
- **Data Flow**: pipeline, lineage, PII/data boundary
- **Lifecycle**: state, retry, wait, cancellation, terminal outcome

### 2. Typed JSON IR + 검증 파이프라인

기본 흐름은 `Generate → Validate → Preview(optional) → Deliver → Iterate`다. `validate --json`과 `deliver --json`은 실패 원인, 대상 subject, 측정 evidence, 지원되는 수정 방법을 구조화된 diagnostics로 반환한다.

### 3. Self-contained interactive artifact

결과 HTML은 hosted editor 없이 독립 실행할 수 있다. 검색/focus, authored upstream/downstream reach, 정확한 route 탐색, semantic role 비교, guided story, dark/light theme를 제공하고 PNG/SVG/WebM 및 1200×630 Share Card로 export할 수 있다.

### 4. Revision-verified source evidence

Architecture는 opt-in으로 public GitHub repository URL, full commit SHA, component별 source file/line을 연결할 수 있다. Archify는 local origin, commit, blob, line range를 확인한 뒤 viewer에 source evidence를 노출한다. 일반 다이어그램에는 이 기능을 강제하지 않는다.

### 5. Architecture Delta

두 validated architecture snapshot을 stable authored ID 기준으로 비교하여 Before / Delta / After artifact를 만든다. added, removed, changed, moved, rerouted 사실을 구분하지만 risk, blast radius, merge safety까지 추론하지 않는 것이 중요한 설계 원칙이다.

### 6. Last-Good Preview / Atomic Delivery

`preview`는 loopback-only local session에서 JSON 변경을 감시하고 검증을 통과한 revision만 reload한다. 잘못된 저장이나 incomplete candidate는 이전 정상 artifact를 유지한다. `deliver` 역시 candidate 검증 후에만 최종 파일을 교체한다.

### 7. v2.16.0 Constraint-driven Workflow Compiler

Workflow schema v2의 `readable-v2`는 logical rank와 실제 measured scene을 분리하고 node placement, phase/group frame, route, semantic label, content bounds, diagnostics, SVG serialization을 하나의 compiler가 관리한다. 기존 schema v1은 `fixed-v1` geometry로 호환성을 유지하며 migration command도 제공한다.

### 8. Agent Skill 배포

기본 설치:

```bash
npx skills add tt-a1i/archify -g
```

Cursor, Claude Code, Codex, OpenCode를 지원한다. DeepSeek Harness에는 별도의 opt-in `@tt-a1i/archify-dsh` bundle이 있고 Raven은 manual ZIP 설치 경로를 지원한다.

## 구조 및 아키텍처

```text
User / Repository
       |
       v
Coding Agent
(Cursor / Claude Code / Codex / OpenCode)
       |
       | SKILL.md instructions
       v
Typed JSON IR
       |
       v
Archify CLI
  |-- schemas
  |-- validators / diagnostics
  |-- layout / routing compiler
  |-- renderers
  |-- delta comparison
  |-- evidence verification
       |
       +--> validate --json
       |      \-- repair receipt
       |
       +--> preview (optional)
       |      \-- last-good artifact
       |
       +--> deliver
              |
              v
     Self-contained HTML + SVG
              |
              +--> interactive viewer
              +--> PNG / SVG / WebM
              +--> Route / Reach Share Card
```

실제 `archify/` 패키지에는 `SKILL.md`, `bin/`, `schemas/`, `renderers/`, `delta/`, `migrations/`, `recipes/`, `references/`, `examples/`, `test/`, `brand-marks/` 등이 존재한다.

## 장점

### Agent-native

GUI 편집기를 자동 조작하는 대신 Skill + JSON + CLI 구조이므로 Claude Code/Codex/Cursor 같은 코딩 에이전트가 자연스럽게 사용할 수 있다.

### 검증 가능한 산출물

시각 결과를 LLM의 감각에만 맡기지 않고 schema와 geometry 검사를 수행한다. 실패 범위를 좁혀 수정하게 만드는 repair receipt도 자동화 친화적이다.

### Portable

기본 결과가 self-contained HTML이므로 PR artifact, Wiki, 설계 리뷰, 온보딩 자료로 전달하기 쉽다.

### Truthful interaction 지향

route, reach, story 등의 viewer 기능이 authored relationship을 재사용하며 runtime impact나 blast radius를 함부로 주장하지 않는다.

### 변경 리뷰에 특화된 기능

Architecture Delta는 일반 다이어그램 도구보다 PR/설계 리뷰 workflow와 직접 결합하기 좋다.

### 활발한 개선

v2.12~v2.16 사이에 source evidence, delta, repair receipt, reachability, share card, DeepSeek Harness 배포, workflow compiler 등이 빠르게 추가됐다.

## 단점 및 한계

### 의미 정확도는 여전히 Agent에 의존

validator는 authored topology가 실제 시스템을 정확히 이해했는지까지 증명하지 않는다. repository analysis가 틀리면 '잘 검증된 잘못된 다이어그램'이 될 수 있다.

### 범용 drawing editor가 아님

WYSIWYG 자유 편집이 목적이 아니다. 사람이 픽셀 단위로 자유롭게 구성하려면 Figma/Excalidraw가 적합하다.

### 큰 시스템은 축약이 필요

한 장에 전체 enterprise topology를 넣기보다는 primary path와 핵심 component를 선별하는 도구다.

### Toolchain 제약

Node.js가 필요하고 visual-check/export 일부 기능은 Chrome/Chromium 환경을 사용한다. 폐쇄망/Enterprise Windows 환경에서는 실행 정책을 검토해야 한다.

### Repository evidence 범위 제한

현재 source evidence는 명시적이고 revision-pinned된 근거를 중심으로 하며, live infrastructure나 private repository의 모든 상태를 자동 검증하는 시스템은 아니다.

### 한국어 Viewer localization 미지원

v2.16.0에서 renderer-owned locale은 `en`, `zh-CN`을 지원한다. authored content는 한국어로 작성할 수 있지만 Viewer UI는 영어 fallback이 필요하다.

### 빠른 변화 속도

기능 추가와 release cadence가 빠르므로 장기 API 안정성이 중요한 enterprise 표준 도구로 채택하기 전 버전 pinning과 회귀 검증이 필요하다.

## 활용 사례

### 코드베이스 온보딩

핵심 runtime path, 외부 dependency, trust boundary를 8~12개 핵심 component로 시각화하고 필요 시 source evidence를 연결한다.

### PR Architecture Review

대형 refactoring, service split, storage 변경 등 architecture boundary가 변하는 PR에 base/head snapshot과 Architecture Delta를 생성한다.

### CI/CD 및 Agent Workflow 문서화

TeamCity/GitHub Actions/Agent pipeline의 participant, phase, branch, rollback을 Workflow로 표현한다. v2.16.0 Workflow compiler 개선으로 특히 관심 가치가 높다.

### API / 인증 / 캐시 흐름

Sequence로 Browser → API → Auth → Redis → DB fallback 같은 실제 요청 경로를 설명한다.

### AI Harness 문서화

Orchestrator → Analysis → Worker → Reviewer → Tool/MCP 구조를 Architecture와 Workflow로 분리해 표현하기 좋다.

## 기존 도구와 비교

| 항목 | Archify | Mermaid | Excalidraw / Figma |
|---|---|---|---|
| 주 작성자 | AI Agent 중심 | 사람/AI | 사람 중심 |
| 입력 | typed JSON IR | DSL | GUI |
| 자동 검증 | 강함 | 제한적 | 거의 없음 |
| 인터랙티브 탐색 | 내장 | 제한적 | 도구 의존 |
| 코드 근거 연결 | revision evidence 지원 | 별도 구현 | 수동 |
| 변경 비교 | Architecture Delta | 별도 diff 필요 | 수동 |
| 자유 디자인 | 제한적 | 제한적 | 매우 강함 |
| CI/자동화 적합성 | 높음 | 높음 | 낮음 |

Archify의 차별점은 렌더링 미학보다 **AI가 기술 시각화 artifact를 반복 생성해도 검증·수정·전달 과정이 통제된다는 것**이다.

## 활용 아이디어

### 바로 적용 가능

Claude Code/Codex의 repository analysis 후처리 Skill로 사용한다. 분석 종료 시 Markdown 설명뿐 아니라 runtime Architecture 또는 Sequence artifact를 함께 생성한다.

```text
이 저장소의 실제 코드를 분석하고 Archify로 runtime architecture를 작성해줘.
핵심 컴포넌트는 8~12개로 제한하고 primary execution path, 외부 의존성,
trust boundary를 표시해. 추측한 관계는 넣지 말고 가능한 경우 source evidence를 연결해.
```

### PoC 가치 높음

**PR Architecture Delta 자동 생성**이 가장 실무적인 PoC다. 모든 PR이 아니라 architecture boundary가 변한 대형 PR만 대상으로 base/head snapshot → validate → compare → PR artifact 흐름을 붙인다.

```text
Implementation / Review
        |
        v
architecture changed?
   | no        | yes
   v           v
 finish    Archify snapshot
                |
             validate
                |
              delta
                |
           PR / Wiki artifact
```

### PoC 가치 있음 — Agent Workflow 문서화

v2.16.0의 constraint-driven Workflow compiler를 활용해 Orchestrator/Worker/Reviewer 및 CI/CD 흐름을 표준 문서로 생성하는 방식을 시험할 가치가 있다. 특히 사람이 유지하던 workflow diagram과 실제 agent configuration 사이의 문서 drift를 줄이는 용도로 적합하다.

### 아이디어 참고

`typed IR → deterministic validation → targeted repair receipt → atomic delivery` 패턴 자체가 중요하다. 다이어그램뿐 아니라 AI가 생성하는 설정, 문서, 배포 spec에도 동일한 '생성 후 검증 가능한 중간 표현' 설계를 적용할 수 있다.

### 현재는 도입 가치 낮음

모든 작은 코드 변경마다 자동 다이어그램을 생성하는 것은 noise와 CI 비용이 커질 가능성이 높다. 신규 서비스, onboarding, architecture-changing PR, 복잡한 workflow 설명처럼 사람이 실제로 읽을 상황으로 trigger를 제한하는 편이 좋다.

## Enterprise / Windows 관점

DeepSeek Harness bundle은 Windows command resolution까지 release acceptance에서 다루고 있다. 다만 실제 사내 도입에서는 다음을 확인해야 한다.

- `npx skills` 및 Node.js 실행 허용 여부
- Chrome/Chromium 실행 정책
- 생성 HTML/JS artifact 보안 정책
- 내부 source path/line evidence의 배포 범위
- 외부 brand icon capture 및 network access 제한
- update reminder network를 원치 않을 경우 `ARCHIFY_UPDATE_CHECK_DISABLED=1` 적용
- 안정 버전 pinning 및 내부 regression fixture 운영

## 결론

Archify는 단순 다이어그램 생성기라기보다 **AI Agent용 기술 시각화 compiler/validator**에 가깝다. Agent가 시스템을 해석하고, typed IR로 구조화하고, deterministic tool이 검증·렌더링하는 역할 분리가 잘 되어 있다.

실무 평가는 **PoC 가치 높음**이다. 우선순위는 다음과 같다.

1. 실제 사내 저장소 하나의 runtime architecture + source evidence 정확도 검증
2. architecture-changing PR 하나의 Architecture Delta 검증
3. 복잡한 Agent/CI workflow를 v2.16 Workflow compiler로 문서화

이 세 시나리오에서 topology 정확도와 artifact 가독성이 충분하면 AI 개발 workflow의 표준 문서화 Skill 후보로 볼 가치가 있다.

## 참고 자료

- Repository: https://github.com/tt-a1i/archify
- Project page: https://tt-a1i.github.io/archify/
- Skill definition: https://github.com/tt-a1i/archify/blob/main/archify/SKILL.md
- Design system: https://github.com/tt-a1i/archify/blob/main/DESIGN.md
- Changelog: https://github.com/tt-a1i/archify/blob/main/CHANGELOG.md
- Releases: https://github.com/tt-a1i/archify/releases
