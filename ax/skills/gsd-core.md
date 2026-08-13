# GSD Core (get-shit-done)

> AI Coding Agent용 Spec-driven Development / Context Engineering Framework

| 항목 | 내용 |
|---|---|
| 성격 | 개발 Framework |
| 제공 | `open-gsd/gsd-core` (구 `gsd-build/get-shit-done`, archived) |
| 역할 | 복잡한 개발을 계획→구현→검증→배포로 운영 |
| 추천도 | ⭐⭐⭐⭐⭐ |

## 개요

`get-shit-done`은 단순한 Skill보다는 **AI Coding Agent를 위한 Spec-driven Development / Context Engineering Framework**에 가깝다.

기존 `gsd-build/get-shit-done` 저장소는 archive되었고 현재 개발은 `open-gsd/gsd-core`에서 이어지고 있다.

## 핵심 Workflow

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

## Context Rot 대응

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

## 지원 환경

Claude Code 전용 구조가 아니라 여러 Coding Agent runtime에서 사용할 수 있도록 확장되고 있다.

예:

- Claude Code
- Codex
- OpenCode
- Cursor
- Windsurf
- Copilot
- Kimi CLI

## 설치

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

## 평가

비교 대상 네 가지 중 **개발 Agent 운영 방식 자체에 가장 큰 영향을 주는 프로젝트**다.

단순히 능력을 하나 추가하는 것이 아니라 다음 질문에 대한 하나의 구현체를 제공한다.

> 복잡한 소프트웨어 개발 프로젝트를 AI에게 어떤 단위로 나누어 맡기고, 상태와 컨텍스트를 어떻게 관리할 것인가?

따라서 실제 도입을 검토한다면 다음 항목을 추가로 분석할 가치가 높다.

- 폴더 구조
- 명령어 체계
- Subagent 구조
- Context 관리 방식
- 상태 파일 구조
- Plan / Execute / Verify 사이의 데이터 전달 방식

## 링크

- 현재 GitHub: https://github.com/open-gsd/gsd-core
- 구 저장소(Archive): https://github.com/gsd-build/get-shit-done

## 관련 문서

- [Agent Tooling Skills 비교](../agent-skills-tooling-overview.md)
