---
title: Claude Code v2.1.307 릴리스
category: news
tags: [claude-code, anthropic, mcp, observability]
source: https://github.com/anthropics/claude-code/releases/tag/v2.1.307
updated: 2026-10-23
---
# Claude Code v2.1.307 릴리스 분석

2026-10-21 릴리스. 조사일: 2026-10-23.

## 요약
에이전트 실행 안정성과 안전성 관측성을 개선한 릴리스. 모델 자체의 코딩 성능 향상을 입증하지는 않는다.

## 주요 변경
- HTTP MCP 도구의 연결 종료 시 자동 재시도 대상을 읽기 전용 또는 멱등 도구로 제한해 중복 쓰기 위험을 줄였다.
- OpenTelemetry `claude_code.safety_event`를 추가해 권한 규칙, auto mode, 안전성 검사, hook, sandbox 개입을 추적한다.
- `/claude-api api-version`으로 Claude API 코드의 `2026-10-21` 버전 이전을 지원한다.
- 파싱 실패한 tool call 재시도, subagent 실행 구분, SDK 모델 변경 대기, macOS Keychain 및 절전 복구 문제를 개선했다.
- Cloud, VS Code, Self-hosted Runner 및 Code Review 관련 오류를 수정했다.

## 적용 시사점
GitHub 게시나 DB 변경을 수행하는 MCP 도구는 멱등성 선언과 구현을 일치시켜야 한다. 응답 유실 시 중복 실행 방지 기능만 믿지 말고 원격 상태를 조회한다. 안전성 이벤트 수집에는 별도 OTel 설정이 필요하다. API 마이그레이션은 CLI 업데이트와 별도로 테스트한다.

## 한계
공개 릴리스 문서 기반 분석이며 실제 성능 측정이나 실행 검증은 수행하지 않았다.

## 출처
- https://github.com/anthropics/claude-code/releases/tag/v2.1.307
- https://claudekit.io/en/updates/claude-code-2-1-307/
