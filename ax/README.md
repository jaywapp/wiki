# AX — Agent Experience

> AI 에이전트를 **더 잘 설계하고, 연결하고, 운영하고, 검증하기 위한 실무 지식 베이스**.
>
> Claude Code, Codex 등 AI 코딩 에이전트를 중심으로 Skill · Tool · MCP · Framework · Workflow를 조사하고, 실제 개발 업무에 적용할 수 있는 형태로 정리한다.

## 빠른 탐색

| 영역 | 이런 내용을 찾을 때 |
|---|---|
| [Agent / Framework](#agent--framework) | 에이전트 런타임, 멀티에이전트, 장기 실행 구조 |
| [Context / Memory](#context--memory) | 세션 인계, 코드베이스 메모리, 컨텍스트 관리 |
| [Tool / Integration](#tool--integration) | 외부 서비스 연결, 브라우저 자동화, MCP |
| [Workflow / Engineering](#workflow--engineering) | 개발 방법론, 출력 최적화, 그래프 기반 작업 구조 |
| [UI / UX](#ui--ux) | 디자인 생성·검수·웹 UX 개선 자동화 |
| [Usage / Cost](#usage--cost) | 토큰·비용·모델 효율 분석 |
| [비교 문서](#비교-문서) | 비슷한 도구와 접근법을 빠르게 비교 |

---

## Agent / Framework

| 문서 | 핵심 |
|---|---|
| [Prime Agent](prime-agent.md) | RLM, Continual Harness, daemon session, subagent, scheduler, RPC를 결합한 장기 실행형 Agent Runtime |
| [Agency Agents](agency-agents.md) | 역할별 전문 AI 에이전트를 구성해 실제 조직과 유사한 멀티에이전트 팀을 만드는 프레임워크 |
| [OpenMausBot](openmausbot.md) | 메시징 인터페이스와 AI 에이전트를 결합한 개인용 에이전트/Bot 운영 구조 |
| [Hermes Desktop Bot Mode](hermes-desktop-bot-mode.md) | Hermes Profile을 영구 Bot으로 운영하고 Bot 간 통신·Group Chat·Routine·멀티머신 협업을 제공 |
| [Graft](graft.md) | 에이전트가 기존 코드베이스와 개발 컨텍스트를 이해하고 작업하도록 돕는 Agent Engineering 접근 |

## Context / Memory

| 문서 | 핵심 |
|---|---|
| [CatchUp](catchup.md) | Claude Code·Codex·Cursor 사이의 로컬 세션 컨텍스트 복구·검색·인계 CLI |
| [codebase-memory-mcp](codebase-memory-mcp.md) | 코드베이스를 영속 Knowledge Graph로 인덱싱해 구조 탐색·영향도 분석·호출 추적·토큰 효율을 개선 |

## Tool / Integration

| 문서 | 핵심 |
|---|---|
| [Agent Reach](agent-reach.md) | AI 에이전트가 다양한 외부 플랫폼과 서비스에 접근할 수 있도록 도달 범위를 확장 |
| [agent-browser](skills/agent-browser.md) | AI 에이전트가 웹 브라우저를 직접 탐색·조작하도록 지원 |
| [find-skills](skills/find-skills.md) | 필요한 Agent Skill을 검색하고 설치하는 Meta Skill |
| [mcp-builder](skills/mcp-builder.md) | MCP 서버를 체계적으로 설계하고 구현하기 위한 개발 Skill |

## Workflow / Engineering

| 문서 | 핵심 |
|---|---|
| [GSD Core](skills/gsd-core.md) | 개발을 Discuss → Plan → Execute → Verify → Ship 흐름으로 운영 |
| [GSD Core vs Superpowers](skills/gsd-core-vs-superpowers.md) | 두 개발 워크플로 프레임워크의 철학·구조·적용 방식 비교 |
| [Superpowers Verification & Systematic Debugging](skills/superpowers-verification-and-systematic-debugging.md) | 검증 우선 개발과 체계적인 디버깅 절차 |
| [Claude Graph Engineering](claude-graph-engineering.md) | 복잡한 에이전트 작업을 그래프 형태로 구조화하는 엔지니어링 접근 |
| [Claude Code Concise Output Style](claude-code-concise-output-style.md) | Claude Code 출력량을 줄이고 작업 집중도와 토큰 효율을 높이는 방식 |

## UI / UX

| 문서 | 핵심 |
|---|---|
| [UI UX Pro Max](skills/ui-ux-pro-max.md) | 디자인 지식 검색 및 Design System 생성 — 방향·시스템 결정 |
| [Taste Skill](skills/taste-skill.md) | 디자인 미감과 Art Direction 강화 — 초기 구현 |
| [Impeccable](skills/impeccable.md) | 설계 → 리뷰 → 감사 → 개선 루프 — 검수·반복 개선 |
| [Web UX Improvement Loop](skills/web-ux-improvement-loop.md) | 웹 UI/UX를 점검 → 개선점 수집 → 수정 → 재검증하는 자동화 루프 |
| [Web UI/UX Audit Stack](web-ui-ux-audit-stack.md) | 웹 UI/UX 품질 점검에 사용할 수 있는 도구·스킬 조합 |

## Usage / Cost

| 문서 | 핵심 |
|---|---|
| [CodeBurn](codeburn.md) | Claude Code·Codex·Cursor의 로컬 세션 로그에서 토큰·비용·모델 효율·생산성을 분석 |
| [CodeBurn vs ccusage](codeburn-vs-ccusage.md) | AI 코딩 사용량 분석 도구 CodeBurn과 ccusage 비교 |
| [Luna Max vs Sol Medium](luna-max-vs-sol-medium.md) | AI 코딩 모델의 성능·비용·실사용 특성을 비교 |

## 비교 문서

| 문서 | 비교 대상 |
|---|---|
| [Agent Tooling Skills Overview](agent-skills-tooling-overview.md) | agent-browser / find-skills / GSD Core / mcp-builder |
| [Design Skills Comparison](design-skills-comparison.md) | Taste / UI UX Pro Max / Impeccable |
| [GSD Core vs Superpowers](skills/gsd-core-vs-superpowers.md) | 개발 워크플로 프레임워크 비교 |
| [CodeBurn vs ccusage](codeburn-vs-ccusage.md) | AI 코딩 사용량·비용 분석 도구 비교 |

---

## AX 문서 분류 기준

새 문서를 추가할 때는 가능한 한 아래 기준으로 배치한다.

- **Agent / Framework** — 에이전트 자체, 런타임, 오케스트레이션, 멀티에이전트
- **Context / Memory** — 메모리, 세션, 컨텍스트, 코드베이스 지식
- **Tool / Integration** — MCP, 브라우저, 외부 서비스 연결, Agent Tool
- **Workflow / Engineering** — 개발 방법론, 프롬프트/컨텍스트 운용, 검증·디버깅
- **UI / UX** — 디자인 생성, 디자인 시스템, UI/UX 감사·개선
- **Usage / Cost** — 토큰, 비용, 사용량, 모델 효율
- **Comparison** — 둘 이상의 도구·프레임워크를 직접 비교하는 문서

## 문서 작성 원칙

AX 문서는 단순 프로젝트 소개보다 **실무 적용 판단**에 초점을 맞춘다.

기본적으로 다음 내용을 포함한다.

1. 한줄 요약 / 프로젝트 개요
2. 해결하려는 문제
3. 핵심 기능
4. 구조 및 아키텍처
5. 장점
6. 단점 및 한계
7. 기존 도구와의 차이
8. 활용 사례와 적용 아이디어
9. 참고 링크

---

[← Wiki 홈으로](../README.md)
