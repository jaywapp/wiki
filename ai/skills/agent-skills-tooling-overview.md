# Agent Tooling Skills 정리

> `agent-browser`, `find-skills`, `GSD Core(get-shit-done)`, `mcp-builder` 비교
>
> 각 스킬의 상세 내용은 [`skills/`](skills/) 하위 개별 문서로 분리했다.

## 한눈에 보기

| 항목 | 핵심 역할 | 성격 | 추천도 | 상세 |
|---|---|---|---|---|
| `agent-browser` | AI가 웹/브라우저를 직접 조작 | Tool + Skill | ⭐⭐⭐⭐⭐ | [문서](skills/agent-browser.md) |
| `find-skills` | 필요한 Agent Skill 검색·설치 | Meta Skill | ⭐⭐⭐⭐⭐ | [문서](skills/find-skills.md) |
| `GSD Core` (`get-shit-done`) | 복잡한 개발을 계획→구현→검증→배포로 운영 | 개발 Framework | ⭐⭐⭐⭐⭐ | [문서](skills/gsd-core.md) |
| `mcp-builder` | 품질 좋은 MCP 서버 설계·개발 | 개발 Skill | ⭐⭐⭐⭐ | [문서](skills/mcp-builder.md) |

네 가지는 서로 경쟁 관계라기보다 역할이 다르다.

- [`find-skills`](skills/find-skills.md): 필요한 능력을 찾아준다.
- [`agent-browser`](skills/agent-browser.md): 브라우저를 실제로 조작하는 실행 능력을 준다.
- [`mcp-builder`](skills/mcp-builder.md): 새로운 외부 도구/MCP를 만드는 방법을 제공한다.
- [`GSD Core`](skills/gsd-core.md): 이 능력들을 포함한 개발 작업 전체를 구조화해서 운영하는 프레임워크에 가깝다.

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

1. **[find-skills](skills/find-skills.md)** — 필요한 전문 Skill을 스스로 찾을 수 있게 한다.
2. **[agent-browser](skills/agent-browser.md)** — 웹/브라우저 작업 능력을 추가한다.
3. **[mcp-builder](skills/mcp-builder.md)** — 필요한 외부 시스템용 Tool/MCP를 직접 만들 수 있게 한다.
4. **[GSD Core](skills/gsd-core.md)** — 위 능력들을 포함한 복잡한 개발 Workflow 전체를 구조화하는 방식을 검토한다.

특히 `GSD Core`는 다른 세 항목처럼 단일 기능을 추가하는 Skill이 아니라 Agent 기반 소프트웨어 개발 프로세스 자체를 바꾸는 프레임워크이므로 별도의 심층 검토 대상으로 보는 것이 적절하다.
