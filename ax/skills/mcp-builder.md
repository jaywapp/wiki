# mcp-builder

> MCP Server 제작용 공식 Skill (Anthropic)

| 항목 | 내용 |
|---|---|
| 성격 | 개발 Skill |
| 제공 | Anthropic (`anthropics/skills`) |
| 역할 | 품질 좋은 MCP 서버 설계·개발 |
| 추천도 | ⭐⭐⭐⭐ |

## 개요

Anthropic의 `anthropics/skills`에 포함된 **MCP Server 제작용 공식 Skill**이다.

목적은 단순히 MCP 코드를 생성하는 것이 아니라, 외부 API나 서비스를 LLM이 실제로 잘 사용할 수 있는 형태의 MCP Server로 설계하도록 돕는 것이다.

## 지원 방향

- Python FastMCP
- Node/TypeScript MCP SDK
- Tool 설계
- API coverage
- Workflow 중심 인터페이스 설계
- Pagination / filtering
- Context 크기 관리
- Actionable error message
- Evaluation

## 중요한 설계 관점

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

## 개발 Workflow

```text
1. Research & Planning
2. Implementation
3. Review / Refinement
4. Evaluation
```

마지막 Evaluation 단계에서는 단순히 API 호출이 성공하는지만 보는 것이 아니라 **LLM이 MCP를 이용해 실제 복잡한 작업을 해결할 수 있는지**를 검증하는 것이 중요하다.

Remote MCP는 Streamable HTTP, Local MCP는 stdio를 고려하도록 안내하며 TypeScript 기반 구현을 적극적으로 다룬다.

## 설치

```bash
npx skills add https://github.com/anthropics/skills --skill mcp-builder
```

## 링크

- GitHub Skill: https://github.com/anthropics/skills/blob/main/skills/mcp-builder/SKILL.md

## 관련 문서

- [Agent Tooling Skills 비교](../agent-skills-tooling-overview.md)
