# agent-browser

> AI Agent용 브라우저 자동화 CLI (Vercel Labs)

| 항목 | 내용 |
|---|---|
| 성격 | Tool + Skill |
| 제공 | Vercel Labs |
| 역할 | AI가 웹/브라우저를 직접 조작 |
| 추천도 | ⭐⭐⭐⭐⭐ |

## 개요

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

## 특징

DOM 전체를 모델에게 넘기는 방식보다는 accessibility tree를 활용해 `@e1`, `@e2` 같은 compact element reference를 제공한다.

이를 통해 코딩 에이전트가 비교적 작은 컨텍스트로 웹 UI를 조작할 수 있다.

세션 유지, 인증 vault, 상태 저장, 영상 녹화 등의 기능도 제공한다.

## 설치

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

## 적합한 작업

- 사내 웹 관리 페이지 자동화
- 웹 기반 운영 업무 자동화
- E2E/QA
- 웹사이트 데이터 수집 후 후속 작업 수행
- Electron 기반 앱 자동화

## 링크

- GitHub: https://github.com/vercel-labs/agent-browser
- Skill: https://github.com/vercel-labs/agent-browser/blob/main/skills/agent-browser/SKILL.md

## 관련 문서

- [Agent Tooling Skills 비교](../agent-skills-tooling-overview.md)
- [find-skills](find-skills.md) — 필요한 Skill을 찾는 Meta Skill
