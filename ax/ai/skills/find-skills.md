# find-skills

> 필요한 Agent Skill을 검색·설치하는 Meta Skill (Vercel Labs)

| 항목 | 내용 |
|---|---|
| 성격 | Meta Skill |
| 제공 | Vercel Labs (`skills` 프로젝트) |
| 역할 | 필요한 Agent Skill 검색·설치 |
| 추천도 | ⭐⭐⭐⭐⭐ |

## 개요

Vercel Labs의 `skills` 프로젝트에 포함된 **Skill 검색용 Meta Skill**이다.

에이전트가 자신에게 없는 전문 능력이 필요할 때 공개된 Agent Skill을 검색하고 적절한 스킬을 찾아 설치하도록 유도한다.

예를 들어 React 성능 개선 관련 전문 Skill이 필요한 경우 다음처럼 검색할 수 있다.

```bash
npx skills find react performance
```

## 주요 명령

```bash
npx skills find "browser automation"
npx skills find "ui ux"
npx skills add <owner/repo@skill>
npx skills update
```

## 개념적 흐름

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

## 신뢰도 판단

Skill 자체에서도 추천 전 설치 수, 제작자 신뢰도, GitHub popularity 등을 살펴보도록 안내한다.

공식/신뢰 가능한 소스를 우선하는 방식이므로 범용 Claude Code/Codex 환경의 기본 Meta Skill로 활용하기 좋다.

## 링크

- GitHub Skill: https://github.com/vercel-labs/skills/blob/main/skills/find-skills/SKILL.md
- Skill 검색: https://skills.sh

## 관련 문서

- [Agent Tooling Skills 비교](../agent-skills-tooling-overview.md)
- [agent-browser](agent-browser.md) — find-skills로 찾게 되는 대표적인 실행 능력 Skill
