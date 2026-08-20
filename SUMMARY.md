# Wiki Daily Summary

`jaywapp/wiki`의 전날 변경 내용을 날짜별로 요약하는 페이지입니다.

- 기준 시간대: **KST (Asia/Seoul)**
- 집계 범위: 전날 00:00 ~ 23:59 KST
- 대상: `develop` 브랜치의 문서 변경
- 원칙: 단순 인덱스/링크 갱신은 압축하고, 실제 추가·수정된 지식 중심으로 요약

---

## 2026-08-20

> **7 commits · 핵심 문서 변경 5건 · 인덱스 갱신 2건**

### 1. GSD Core 최신 내용 보강

[`ax/skills/gsd-core.md`](./ax/skills/gsd-core.md)

- GSD Core를 AI 개발 Workflow / Context Engineering Framework 관점으로 다시 정리.
- `Discuss → Plan → Execute → Verify → Ship` 흐름과 fresh-context subagent 기반 Context Rot 대응을 상세화.
- 기존 `gsd-build/get-shit-done`에서 `open-gsd/gsd-core`로 이어진 현재 프로젝트 관계와 지원 Runtime을 정리.
- 장기 Agent 개발에서 상태를 모델 기억보다 `STATE.md`, `CONTEXT.md` 같은 파일 기반 artifact로 유지하는 관점을 강조.

### 2. GSD Core vs Superpowers 비교 문서 추가

[`ax/skills/gsd-core-vs-superpowers.md`](./ax/skills/gsd-core-vs-superpowers.md)

- **GSD Core = Project / Context Orchestration**
- **Superpowers = Engineering Discipline / Skills Workflow**
- GSD는 장기 프로젝트 상태·컨텍스트 관리에 강하고, Superpowers는 TDD·디버깅·리뷰 같은 개발 규율에 강하다는 차이를 정리.
- 둘을 그대로 중복 설치하기보다 한쪽을 기본 프레임워크로 두고 다른 쪽의 규칙/Skill을 선별 적용하는 방향을 제안.

### 3. Claude Code `Concise` Output Style 정리

[`ax/claude-code-concise-output-style.md`](./ax/claude-code-concise-output-style.md)

- Claude Code의 `/config` 또는 `settings.json`에서 `outputStyle: "Concise"`를 사용하는 방법 정리.
- 결과 우선·짧은 기본 응답으로 터미널 노이즈와 출력 토큰을 줄이는 용도.
- 전체 토큰 최적화 기능이라기보다는 **출력 표현을 간결하게 만드는 설정**으로 보는 것이 적절하다고 정리.

### 4. CatchUp 소개 추가

[`ax/catchup.md`](./ax/catchup.md)

- Claude Code, Codex, Cursor 등 서로 다른 Coding Agent 사이에서 세션 컨텍스트를 복구·검색·인계하는 local-first CLI.
- Claude 사용량 제한 후 Codex로 전환하거나, 긴 세션을 정리해 새 세션으로 이어가는 용도에 적합.
- native fork와 cross-agent transcript handoff의 차이, `--since-compact`, `--last`, 검색, worktree 대응 등을 정리.
- 별도 SaaS 없이 각 Agent의 로컬 세션 저장소를 활용한다는 점이 핵심.

### 5. Hermes Desktop Bot Mode 소개 추가

[`ax/hermes-desktop-bot-mode.md`](./ax/hermes-desktop-bot-mode.md)

- Hermes Profile을 이름·역할·모델·메모리·Skill을 가진 **영구 Agent**로 운영하는 Bot Mode를 정리.
- Bot 간 `@mention`, Direct Message, Group Chat, Routine, multi-machine routing 등을 하나의 Desktop UX로 제공.
- `Profile + Persistent Memory + Skill Isolation + Routine + Bot-to-Bot Messaging`을 결합한 개인 Agent Team 구성에 특히 유용.
- 2026-08-20 기준 빠르게 개발 중인 기능이므로 중요 작업에 바로 전면 도입하기보다는 테스트 Bot/Profile로 검증 후 확대하는 편이 안전.

### 기타

- CatchUp 문서를 `ax` 인덱스에 연결.
- Hermes Desktop Bot Mode 문서를 `ax` 인덱스에 연결.

---

<!--
자동 갱신 규칙
1. 매일 아침 전날 KST 기준 develop 브랜치 커밋을 조회한다.
2. SUMMARY.md 자체를 갱신한 자동 커밋은 다음 날 요약 대상에서 제외한다.
3. 커밋 메시지만 나열하지 말고 실제 diff/문서 내용을 확인한다.
4. 동일 주제의 연속 커밋은 하나의 항목으로 병합한다.
5. 새 날짜를 이 주석 바로 위가 아니라 기존 최신 날짜 섹션보다 위에 추가해 최신순으로 유지한다.
6. 변경이 없는 날은 섹션을 생성하지 않는다.
-->
