---
title: KeyMan — Windows 로컬 API 키 보관함 (GUI·CLI·MCP)
category: tools
tags: [windows, api-key, credential-manager, cli, mcp, claude-code, codex]
source: https://github.com/jaywapp/key-man
updated: 2026-11-10
---

# KeyMan

## 핵심 요약
직접 만든 Windows용 로컬 API 키·토큰 보관함. 실제 값은 Windows 자격 증명 관리자에, 이름·서비스·환경·만료일 같은 메타데이터는 `%LOCALAPPDATA%\KeyMan\vault.json`에 나눠 저장한다. WPF GUI, CLI(`key-man.exe`), stdio MCP 서버(`key-man-mcp.exe`)가 같은 보관함을 쓴다. MCP 도구 결과에는 비밀값을 싣지 않는다.

## 메모
- 2026-07-22 첫 커밋(WPF·CLI), 2026-07-23 MCP 서버 추가, 2026-11-06 공개 알파 `v1.1.0-alpha.1`.
- MCP 도구: `keyman_list`, `keyman_copy`, `keyman_register_from_clipboard`, `keyman_register_from_environment`, `keyman_remove`. `get` 도구는 없다.
- GUI·MCP는 복사 30초 뒤 자신이 복사한 클립보드 정리를 시도한다. CLI `copy`는 자동으로 지우지 않는다.
- 같은 사용자 권한의 프로그램이나 셸을 쓸 수 있는 에이전트로부터 값을 격리하는 장치는 아니다.
- 팀 공유·클라우드 동기화·키 발급·자동 회전은 범위 밖. 설치 파일은 코드 서명이 없다.
- 로컬 설치·MCP 연결 절차 메모는 `tools/keyman-local-mcp-install.md` 참고.

## 참고 자료
- 원본 저장소: https://github.com/jaywapp/key-man
- 아키텍처: https://github.com/jaywapp/key-man/blob/main/docs/architecture.md
- MCP 연결: https://github.com/jaywapp/key-man/blob/main/docs/mcp.md
- CLI 사용법: https://github.com/jaywapp/key-man/blob/main/docs/cli.md
- 보안 정책: https://github.com/jaywapp/key-man/blob/main/SECURITY.md
- 알파 릴리스: https://github.com/jaywapp/key-man/releases/tag/v1.1.0-alpha.1
