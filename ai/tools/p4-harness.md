---
title: p4-harness — Claude Code와 Codex가 함께 쓰는 Perforce 작업 하네스
category: tools
tags: [perforce, p4, claude-code, codex, agent-harness, hooks, python]
source: https://github.com/jaywapp/p4-harness
updated: 2026-11-26
---

# p4-harness

## 핵심 요약
직접 만든 Perforce 작업 하네스. Claude Code와 Codex가 같은 규칙·Python CLI(`p4h`)·작업 상태를 쓰게 해서, 파일 수정 전 checkout, 작업별 numbered changelist, 명시적 작업 범위, 파일 상태에 묶인 검증, 두 에이전트 사이의 인계를 일관되게 처리한다. Python 3.11+ 표준 라이브러리만 쓰고 MCP 서버나 모델 API 키가 필요 없다. submit·sync·integrate는 하지 않고 pending CL과 보고서를 남긴다.

## 메모
- 버전 0.2.0(`pyproject.toml`). 저장소 커밋은 2026-09-14 하루에 집중돼 있다.
- 편집 전 훅(`PreToolUse`)이 지원되는 native 편집을 작업 CL로 checkout한다. shell 편집은 먼저 `prepare`가 필요하다.
- 한 물리 워크스페이스에는 active task 하나와 작성 세션 하나만 둔다. 동시 작성은 별도 client/root로 격리해야 한다.
- 검증 결과는 snapshot(CL·환경·have revision·파일 action/type/해시)에 묶인다. 파일이나 check 설정이 바뀌면 이전 통과 기록으로 `finish`할 수 없다. 필수 검증이 없으면 `not_configured`로 보고한다.
- 0.2부터 `collect`·`changes`·`verify` 기본 출력이 요약형이다. 실제 토큰·비용 절감률은 측정하지 않았다고 문서가 밝힌다.
- 훅은 협업 장치이며 OS 보안 경계가 아니다. 임의 shell·MCP·외부 편집기의 쓰기는 막지 못한다.
- 테스트 49개(임시 P4/P4D 서버 통합 27개 포함). 로그인된 실제 CLI 세션과 회사 서버 환경은 별도 확인 대상이다.
- 계획·리뷰 흐름은 별도 저장소 jsonl-prr(비공개)가 담당한다. 글의 원본 근거로 쓰지 않는다.

## 참고 자료
- 원본 저장소: https://github.com/jaywapp/p4-harness
- README: https://github.com/jaywapp/p4-harness/blob/master/README.md
- 핵심 아이디어: https://github.com/jaywapp/p4-harness/blob/master/docs/core-ideas.md
- 구조와 설계 결정: https://github.com/jaywapp/p4-harness/blob/master/docs/architecture.md
- 설정과 명령: https://github.com/jaywapp/p4-harness/blob/master/docs/configuration.md
- 작업과 복구: https://github.com/jaywapp/p4-harness/blob/master/docs/workflow.md
- 토큰 효율 설계: https://github.com/jaywapp/p4-harness/blob/master/docs/token-efficiency.md
- 테스트와 설치 확인: https://github.com/jaywapp/p4-harness/blob/master/docs/testing.md
- P4 코어와 작업 워크플로우의 경계: https://github.com/jaywapp/p4-harness/blob/master/docs/workflow-boundary.md
