---
title: i-have-adhd
category: skills
tags:
  - ai
  - agent
  - skill
  - productivity
  - output-style
  - claude-code
  - codex
source: https://github.com/ayghri/i-have-adhd
updated: 2026-09-09
---

# i-have-adhd

> 코딩 에이전트의 답변을 "설명 우선"에서 "행동 우선"으로 재구성해, 다음 행동·진행 상태·오류 해결책을 빠르게 파악하도록 만드는 출력 스타일 Agent Skill.

## 프로젝트 개요

`i-have-adhd`는 ADHD 진단 도구가 아니라 LLM/코딩 에이전트의 **출력 형식과 상호작용 규칙을 바꾸는 Skill**이다. README도 “ADHD-friendly outputs. No ADHD diagnosis needed”라고 명시한다.

핵심 목표는 긴 서론, 불필요한 맥락, 곁가지 제안, 모호한 시간 표현 때문에 사용자가 실제 행동으로 넘어가지 못하는 문제를 줄이는 것이다.

2026-09-09 기준 저장소는 Claude Code, Codex, Gemini CLI, GitHub Copilot, OpenCode, Hermes, Pi 등 여러 에이전트/CLI 환경을 지원하는 설치·통합 경로를 제공한다.

## 해결하려는 문제

일반적인 LLM 답변은 다음과 같은 패턴을 자주 가진다.

- 실제 해결 명령보다 배경 설명이 먼저 나온다.
- 하나의 문제를 해결하는 도중 다른 개선점을 함께 제시한다.
- 여러 작업이 긴 문단 안에 섞인다.
- "조금 걸린다" 같은 모호한 시간 표현을 사용한다.
- 여러 턴이 지나면 현재 진행 상태가 화면에서 사라진다.

이 Skill은 모델의 추론 능력을 높이는 것이 아니라 **사용자가 결과를 소비하고 실행하는 비용을 낮추는 것**에 집중한다.

## 핵심 기능

`SKILL.md`의 핵심 규칙은 10개다.

1. 다음 행동을 첫 줄에 배치한다.
2. 여러 단계의 작업은 번호 목록으로 분리한다.
3. 답변 마지막에는 하나의 구체적인 다음 행동만 남긴다.
4. 현재 문제와 관계없는 곁가지를 억제한다.
5. 매 턴 현재 진행 상태를 다시 표시한다.
6. 시간은 "조금" 대신 분/시간 단위로 구체화한다.
7. 완료된 작업과 성공 상태를 눈에 띄게 표시한다.
8. 오류는 감정적 표현 없이 위치·원인·해결책을 제시한다.
9. 긴 목록은 우선순위 그룹으로 나누도록 유도한다.
10. 서론, 완료 후 반복 요약, 의례적인 맺음말을 제거한다.

단순한 `be concise` 프롬프트와 다른 점은 **짧게 쓰는 것 자체가 목적이 아니라 실행 가능한 정보 구조를 강제한다는 것**이다.

## 아키텍처

핵심 자체는 매우 단순하다.

```text
User / Session
      |
      v
Skill / Plugin activation
      |
      v
SKILL.md rules injected into agent context
      |
      v
LLM generation
      |
      v
Action-first response
```

저장소는 하나의 `SKILL.md`를 중심으로 여러 에이전트 환경에 어댑터를 제공하는 형태다.

```text
skills/i-have-adhd/SKILL.md   <- Single behavioral ruleset
        |
        +-- Claude Code plugin / SessionStart hook
        +-- Codex plugin / AGENTS.md
        +-- Gemini command / extension
        +-- GitHub Copilot Agent Skills
        +-- OpenCode plugin
        +-- Hermes
        +-- Pi extension
        +-- 기타 Agent Skills 호환 클라이언트
```

`disable-model-invocation: true`를 사용해 기본적으로 모델이 임의 활성화하는 대신 사용자가 명시적으로 호출하는 방식을 취한다. Skill 내부에는 세션 동안 규칙을 유지하고 `stop adhd mode` 또는 `normal mode`로 해제하는 persistence 규칙도 포함되어 있다.

Claude Code에서는 선택적으로 flag file과 `SessionStart` hook을 사용해 항상 활성화할 수 있고, Codex에서는 `AGENTS.md`에 핵심 규칙을 넣는 always-on 방식도 안내한다.

## 예외 처리 설계

흥미로운 부분은 규칙을 무조건 적용하지 않는다는 점이다. 다음 상황에서는 task/harness 요구사항을 우선한다.

- 사용자가 자세한 설명을 요구한 경우
- 삭제·force push·schema migration 등 파괴적 작업
- 3회 이상 같은 디버깅이 실패한 경우
- 요청 자체가 실제로 모호한 경우
- 목록/선택지 자체가 답인 경우
- 상위 system/harness 규칙과 충돌하는 경우

즉 이 프로젝트의 좋은 점은 "항상 짧게 답하라"가 아니라 **출력 UX를 기본값으로 두되 작업 정확성과 안전성을 우선하는 escape hatch**를 갖고 있다는 것이다.

## 장점

### 1. 코딩 에이전트의 실행 UX 개선

명령, 파일 경로, 테스트 방법이 앞쪽으로 이동한다. Claude Code/Codex처럼 터미널에서 사용하는 에이전트에서는 스크롤과 재탐색 비용을 줄이는 효과가 크다.

### 2. 규칙이 작고 이식성이 높음

핵심은 Markdown Skill이므로 특정 모델 API나 서버가 필요하지 않는다. 다양한 Agent Skills 계열 도구에 동일한 행동 규칙을 재사용할 수 있다.

### 3. 세션 진행 상태 유지

"Step 3 of 5 done" 같은 상태 재표시는 긴 작업에서 사용자가 이전 문맥을 다시 읽는 비용을 낮춘다.

### 4. Harness 규칙으로 재사용하기 좋음

이 프로젝트의 규칙은 ADHD 용도에 한정하지 않고 내부 개발 에이전트의 **Response UX Policy**로 추출할 가치가 있다.

## 단점 및 한계

### 1. 정확도를 높이는 Skill은 아님

검색, 코드 분석, reasoning, tool use 능력을 추가하지 않는다. 모델이 틀린 답을 더 짧고 실행하기 쉽게 보여줄 수도 있다.

### 2. 지나친 압축 위험

`Cap lists at 5 items` 같은 규칙은 모델이 문자 그대로 해석하면 중요한 항목을 누락할 가능성이 있다. 실제 저장소 Issue #96에서도 이 문제가 제기되어 있다. 따라서 내부 도입 시에는 "최종 출력에서 우선순위를 그룹화하되 관련 결과를 버리지 않는다"로 수정하는 편이 안전하다.

### 3. Context/Token 비용

always-on 구현에서 전체 `SKILL.md`를 context에 삽입하면 매 세션/요청의 컨텍스트 비용이 증가할 수 있다. Issue #153에서도 전체 ruleset 주입 크기를 줄이는 최적화가 제안되어 있다.

### 4. 클라이언트별 통합 편차

Claude Code, Codex, OpenCode, Copilot 등은 Skill/plugin/hook 처리 방식이 다르다. 실제 Issue에는 OpenCode command 등록, Claude Desktop SessionStart, subagent/fork propagation 등 통합 문제들이 보고되어 있다.

### 5. ADHD라는 이름의 범용화 한계

실제 규칙 상당수는 ADHD 여부와 무관하게 개발자에게 유용한 정보 설계 원칙이다. 조직 표준으로 사용한다면 이름을 그대로 가져오기보다 `action-first-output`, `developer-response-ux` 같은 중립적인 내부 Skill로 재구성하는 편이 낫다.

## 활용 사례

### Claude Code / Codex 디버깅

```text
Test fails at FooTests.cs:42: expected 200, got 401.
Cause: Authorization header missing.
Fix: add Bearer token to the request.

Next: rerun FooTests only.
```

에러 설명보다 위치 → 원인 → 수정 → 검증 순서가 고정되어 디버깅 루프가 빨라진다.

### 장기 Agent 작업

여러 턴에 걸친 refactoring, migration, build troubleshooting에서 매 턴 `3/5 완료`처럼 상태를 노출하는 규칙을 사용할 수 있다.

### 사내 개발 도구 Assistant

CLI/VSIX/사내 Agent에서 사용자에게 장문의 설명 대신 실행 명령과 결과 확인 방법을 먼저 제공하는 UX 정책으로 적용 가능하다.

## 기존 방식과 비교

| 방식 | 특징 | 한계 |
|---|---|---|
| `Be concise` | 답변 길이 축소 | 실행 순서/상태 관리 규칙 없음 |
| 일반 system prompt | 자유롭게 UX 규칙 정의 | 재사용·배포·버전 관리가 약할 수 있음 |
| `i-have-adhd` | 행동 우선 + 상태 재표시 + tangent 억제 + next action | 출력 UX만 개선, 규칙 과적용 가능 |
| Task/Plan tool | 실제 작업 상태를 구조화 | 사용자에게 보여주는 문장 UX까지 자동 개선하지는 않음 |

가장 좋은 형태는 Task/Plan 시스템과 이 Skill의 출력 원칙을 결합하는 것이다. Skill도 harness가 task/plan tool을 제공하면 그것을 사용하라고 명시한다.

## 활용 아이디어

### 바로 적용 가능 — Response UX 규칙 추출

개인 Claude Code/Codex 환경에는 원본을 그대로 설치해볼 가치가 있다. 특히 다음 6개 규칙은 범용성이 높다.

- Action first
- One bounded action per step
- Current state restatement
- Error = location + cause + fix
- One concrete next action
- No unnecessary preamble/closing

### PoC 가치 있음 — workspace-harness 출력 계층

`workspace-harness` 또는 멀티 에이전트 Harness에서 reasoning/work policy와 response UX를 분리한다.

```text
System / Safety
      |
Harness workflow rules
      |
Role-specific skill
      |
Response UX skill  <- i-have-adhd에서 추출
      |
Final answer
```

이렇게 하면 Analysis/Work/Review Agent 내부 사고방식은 건드리지 않고 **최종 사용자 출력에만** action-first 정책을 적용할 수 있다.

### PoC 가치 있음 — Skill 파일 최적화 실험

현재 프로젝트가 가진 전체 `SKILL.md` 설명을 그대로 주입하는 대신 다음처럼 분리할 수 있다.

```text
SKILL.md
  -> 짧은 operational rules
references/
  -> rationale / bad-good examples / detailed exceptions
```

이는 Skill 자체가 커질 때 발생하는 토큰 문제를 줄이는 실험 사례로 활용하기 좋다.

### 아이디어 참고 — 사내 표준 응답 UX Skill

원본 이름과 ADHD 설명을 제거하고 사내 용도로 다음과 같이 재구성할 수 있다.

```text
developer-response-ux/
├── SKILL.md
└── references/
    ├── debugging.md
    ├── planning.md
    └── error-reporting.md
```

특히 Perforce/TeamCity/UE 빌드 문제처럼 로그가 긴 업무에서 "원인 → 조치 → 검증" 출력 규칙이 효과적이다.

## 실무 평가

**평가: 바로 적용 가능 + 내부 Skill 설계 참고 가치 높음.**

이 프로젝트의 가치는 ADHD 전용 기능보다 **Agent 답변을 인간이 실행하기 쉬운 인터페이스로 바꾸는 UX 규칙집**이라는 데 있다.

다만 원본을 조직 전체에 그대로 always-on 하는 것은 권장하지 않는다. `Cap lists at 5`, 전체 ruleset context 주입, 클라이언트별 persistence 방식은 조정할 필요가 있다.

개인 개발 환경에서는 그대로 시험해보고, 사내 Harness에는 핵심 규칙만 추출한 경량 `response-ux` Skill로 재구성하는 방향이 가장 적합하다.

## 프로젝트 성숙도 메모

2026-09-09 기준 최근 커밋이 2026-09-08에도 존재하며 Windows/OpenCode 호환 수정이 병합되는 등 개발 활동이 이어지고 있다. 저장소에는 `evals`, `tests`, `scripts`, 여러 클라이언트별 plugin/extension 구조가 존재한다.

반면 open issue에서 context overhead, OpenCode command 등록, Claude Desktop hook, subagent/fork propagation 등의 개선점이 논의되고 있으므로 여러 클라이언트에서 완전히 안정화된 범용 표준이라고 보기는 이르다.

## 결론

`i-have-adhd`는 모델 성능을 높이는 Skill이 아니라 **LLM 출력의 정보 구조를 개선하는 Skill**이다. 특히 "다음 행동을 먼저 보여준다", "진행 상태를 반복해서 노출한다", "오류를 위치·원인·수정으로 구조화한다"는 원칙은 일반적인 개발 에이전트 UX에도 매우 유용하다.

가장 참고할 만한 포인트는 하나의 거대한 system prompt가 아니라 재사용 가능한 **Response UX Layer**를 Skill로 분리했다는 점이다.

## 참고 자료

- Repository: https://github.com/ayghri/i-have-adhd
- README: https://github.com/ayghri/i-have-adhd/blob/main/README.md
- Skill: https://github.com/ayghri/i-have-adhd/blob/main/skills/i-have-adhd/SKILL.md
- Install: https://github.com/ayghri/i-have-adhd/blob/main/INSTALL.md
- Issues: https://github.com/ayghri/i-have-adhd/issues
