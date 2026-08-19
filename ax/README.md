# ax — Agent Experience

AI 코딩 에이전트(Claude Code, Codex 등)의 능력을 확장하는 Skill·Tool·Framework 정리.

## 비교 문서

- [agent-skills-tooling-overview.md](agent-skills-tooling-overview.md) — Agent Tooling Skills 비교 (agent-browser / find-skills / GSD Core / mcp-builder)
- [design-skills-comparison.md](design-skills-comparison.md) — AI UI/UX 디자인 스킬 비교 (Taste / UI UX Pro Max / Impeccable)
- [codeburn-vs-ccusage.md](codeburn-vs-ccusage.md) — AI 코딩 사용량 분석 도구 CodeBurn과 ccusage 비교

## 도구

- [CodeBurn](codeburn.md) — Claude Code·Codex·Cursor 등의 토큰, 비용, 모델 효율, 생산성을 로컬 세션 로그 기반으로 분석하는 도구
- [Prime Agent](prime-agent.md) — RLM·Continual Harness·daemon session·subagent·scheduler·RPC를 결합한 장기 실행형 Agent Runtime

## 스킬별 문서

### Agent Tooling

| 스킬 | 핵심 역할 | 성격 |
|---|---|---|
| [agent-browser](skills/agent-browser.md) | AI가 웹/브라우저를 직접 조작 | Tool + Skill |
| [find-skills](skills/find-skills.md) | 필요한 Agent Skill 검색·설치 | Meta Skill |
| [GSD Core](skills/gsd-core.md) | 개발을 Discuss→Plan→Execute→Verify→Ship로 운영 | 개발 Framework |
| [mcp-builder](skills/mcp-builder.md) | 품질 좋은 MCP 서버 설계·개발 | 개발 Skill |

### UI/UX Design

| 스킬 | 핵심 역할 | 사용 단계 |
|---|---|---|
| [UI UX Pro Max](skills/ui-ux-pro-max.md) | 디자인 지식 검색 및 Design System 생성 | 방향·시스템 결정 |
| [Taste Skill](skills/taste-skill.md) | 디자인 미감과 Art Direction 강화 | 초기 구현 |
| [Impeccable](skills/impeccable.md) | 설계-리뷰-감사-개선 워크플로 | 검수·반복 개선 |
