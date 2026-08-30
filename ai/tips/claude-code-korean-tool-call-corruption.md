---
title: Claude Code 한글 Tool Call 깨짐 대응
category: tips
tags:
  - ai
  - claude-code
  - unicode
  - korean
  - troubleshooting
source: https://github.com/anthropics/claude-code/issues/83033
updated: 2026-08-31
---

# Claude Code 한글 Tool Call 깨짐 대응

> Claude Code에서 일반 대화는 정상인데 `AskUserQuestion` 등 Tool Call의 한국어만 이상한 한글로 바뀐다면, 비 ASCII 문자열을 `\\uXXXX` escape가 아니라 literal UTF-8로 쓰도록 `CLAUDE.md`에 지시하는 것이 현재 가장 간단한 우회책이다.

## 현상

Claude Code의 일반 채팅이나 파일 출력은 정상인데 구조화된 Tool Call 파라미터에서만 한국어 음절이 다른 유효한 한글 음절로 바뀌는 사례가 보고되고 있다.

대표 영향 영역:

- `AskUserQuestion` 질문/옵션
- `TodoWrite` 등 구조화된 tool parameter
- 긴 한국어 JSON 인자

전형적인 CP949/UTF-8 mojibake처럼 깨진 기호가 나오는 것이 아니라, **형태는 한글인데 다른 음절로 치환되어 문장이 이상해지는 것**이 특징이다.

## 원인 분석

2026년 8월 공개된 Claude Code 이슈 #83033의 재현 실험에서는 Sonnet 5가 한국어 tool-call parameter를 literal UTF-8 대신 `\\uXXXX` Unicode escape로 생성하는 경우가 관찰됐다.

문제는 모델이 각 한글 음절의 Unicode code point를 4자리 16진수로 직접 생성하는 과정에서 일부 값을 잘못 쓰면, JSON 파싱 자체는 성공하지만 **다른 정상 한글 code point**로 해석된다는 점이다.

보고된 A/B 실험에서는 escape-writing이 발생한 45회 모두 이 유형의 한글 손상이 나타났고, literal UTF-8 사용을 강제한 조건에서는 해당 유형이 사라졌다.

따라서 이 증상은 OS locale이나 terminal encoding만의 문제로 보기 어렵다. 별도로 VS Code extension의 카드 UI에서 유사 증상이 보고된 이슈도 있으므로, 모든 한글 깨짐이 동일 원인이라고 단정해서는 안 된다.

## 바로 적용 가능한 해결책

프로젝트의 `CLAUDE.md` 또는 사용자 전역 `~/.claude/CLAUDE.md`에 다음 한 줄을 추가한다.

```text
Always write Korean (and other non-ASCII) strings in tool-call parameters as literal UTF-8; never as `\\uXXXX` unicode escapes.
```

한국어 지침으로 표현한다면 다음처럼 쓸 수 있다.

```text
Tool Call 파라미터의 한국어 및 비 ASCII 문자열은 항상 literal UTF-8 문자 그대로 작성하고, `\\uXXXX` Unicode escape 형식으로 작성하지 않는다.
```

영문 규칙은 실제 재현 보고에서 검증된 문구에 가깝기 때문에 우선 권장한다.

## 적용 위치

### 모든 프로젝트에 적용

```text
~/.claude/CLAUDE.md
```

Claude Code의 사용자 레벨 memory/instruction으로 사용하면 모든 세션에 적용할 수 있다.

### 특정 프로젝트에만 적용

```text
./CLAUDE.md
```

팀과 공유할 프로젝트 규칙에 적합하다.

### 개인 프로젝트 설정으로만 적용

```text
./CLAUDE.local.md
```

저장소에 commit하지 않을 개인 규칙으로 사용할 수 있다.

같은 규칙을 여러 scope에 중복해서 넣기보다 한 곳에서 명확하게 관리하는 편이 낫다.

## 검증 방법

1. 규칙을 `CLAUDE.md`에 추가한다.
2. 새 Claude Code session을 시작한다.
3. `/memory`로 해당 instruction 파일이 실제 로드됐는지 확인한다.
4. `AskUserQuestion`으로 여러 한국어 선택지를 출력하게 한다.
5. 질문/옵션의 한글 음절 치환이 다시 발생하는지 확인한다.

예시 테스트 요청:

```text
AskUserQuestion 도구를 사용해서 한국어로 3개의 선택지가 있는 질문을 만들어줘.
질문과 선택지 설명은 모두 자연스러운 한국어 문장으로 작성해.
```

## 왜 효과가 있는가

literal UTF-8 방식에서는 모델이 `한글` 자체를 생성한다.

반면 escape 방식에서는 개념적으로 다음과 같은 문자열을 생성해야 한다.

```text
\\uD55C\\uAE00
```

여기서 16진수 한 자리만 잘못 생성해도 JSON은 유효할 수 있지만 전혀 다른 Unicode 문자가 된다. 즉 encoding decoder가 망가지는 문제가 아니라 **모델이 잘못된 code point를 생성하는 문제**가 될 수 있다.

## 장점

- 설정 한 줄로 적용 가능
- OS/terminal 설정 변경 불필요
- 프로젝트 또는 사용자 전역으로 적용 가능
- `AskUserQuestion`뿐 아니라 다른 tool-call parameter에도 일반화 가능
- 보고된 재현 실험에서 효과가 확인됨

## 단점 및 한계

- Claude Code 자체 버그를 수정하는 것이 아니라 prompt-level workaround다.
- 모델의 instruction following에 의존하므로 이론적으로 100% 강제 장치는 아니다.
- U+FFFD, CP949 mojibake, VS Code webview rendering 등 다른 종류의 한글 문제에는 효과가 없을 수 있다.
- 향후 Claude Code/모델 업데이트에서 근본 수정되면 불필요한 규칙이 될 수 있다.

## 실무 활용 아이디어

### 바로 적용 가능

한국어를 사용하는 Claude Code 개발 환경의 공통 `CLAUDE.md` 규칙에 추가한다.

특히 다음 workflow에서는 우선 적용 가치가 높다.

- `AskUserQuestion`을 자주 사용하는 Skill
- 한국어 Todo/Plan을 구조화된 Tool Call로 생성하는 workflow
- MCP Tool에 한국어 parameter를 전달하는 workflow
- Agent가 한국어 description/prompt를 다른 agent/tool에 전달하는 harness

### PoC 가치 있음

팀 공통 Claude Code bootstrap/setup에 이 규칙을 포함하고, tool-call regression test를 추가할 수 있다.

예를 들어 한국어 질문 10~30개를 반복 생성하여 잘못된 음절 발생 여부를 확인하면 모델/버전 변경 시 회귀를 빠르게 탐지할 수 있다.

## 결론

현재 알려진 Claude Code의 특정 한국어 손상 패턴에 대해서는 `CLAUDE.md`에서 **Tool Call의 비 ASCII 문자열을 literal UTF-8로 생성하도록 명시**하는 방법이 비용 대비 가장 좋은 대응이다.

다만 모든 한글 깨짐의 원인이 Unicode escape는 아니다. 일반 채팅은 정상이고 Tool Call에서만 '정상 모양의 엉뚱한 한글 음절'이 나타나는 경우에 우선 적용하는 것이 적절하다.

## 참고 자료

- Claude Code Issue #83033 — Sonnet 5 Korean tool-call Unicode escape corruption: https://github.com/anthropics/claude-code/issues/83033
- Claude Code Issue #69522 — long unicode-escaped AskUserQuestion JSON parse failure: https://github.com/anthropics/claude-code/issues/69522
- Claude Code Issue #53665 — Opus 4.7 Korean tool_use JSON garbling: https://github.com/anthropics/claude-code/issues/53665
- Claude Code Issue #88132 — VS Code AskUserQuestion Korean rendering corruption: https://github.com/anthropics/claude-code/issues/88132
- Anthropic Claude Code Best Practices — CLAUDE.md scope and persistent instructions
