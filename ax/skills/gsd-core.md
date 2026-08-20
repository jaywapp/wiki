# GSD Core

> Git. Ship. Done. — AI Coding Agent용 Spec-driven Development / Context Engineering Framework

| 항목 | 내용 |
|---|---|
| 성격 | AI 개발 Workflow / Context Engineering Framework |
| 현재 저장소 | `open-gsd/gsd-core` |
| 이전 프로젝트 | `gsd-build/get-shit-done` — 2026-06-26 archive |
| 핵심 목적 | 긴 개발 작업에서 Context Rot을 줄이고 계획→구현→검증→배포를 구조화 |
| 지원 Runtime | Claude Code, Codex, OpenCode, Cursor, Windsurf, Copilot, Kimi CLI 등 |
| 최신 확인 버전 | v1.11.0 (2026-08-19) |

## 한 줄 요약

`GSD Core`는 AI 코딩 에이전트에게 단순한 기능 하나를 추가하는 Skill이 아니라, **복잡한 개발 작업 전체를 일정한 루프로 운영하기 위한 상위 Workflow Framework**다.

기존 `gsd-build/get-shit-done` 프로젝트는 archive되었고 현재 개발은 `open-gsd/gsd-core`에서 이어지고 있다.

## 핵심 Workflow

```text
Discuss
   ↓
Plan
   ↓
Execute
   ↓
Verify
   ↓
Ship
```

### 1. Discuss

구현 전에 요구사항과 중요한 설계 결정을 먼저 명시한다.

### 2. Plan

조사와 작업 분해를 수행하고, 각 실행 계획이 하나의 fresh context에서 처리 가능한 크기인지 검토한다.

### 3. Execute

계획을 실행 단위로 나누고 fresh-context executor/subagent에게 맡긴다. 독립 작업은 wave 단위 병렬 실행이 가능하다.

### 4. Verify

코드가 만들어졌다는 사실만으로 완료 처리하지 않고 실제 동작을 검증하고 실패 시 수정 계획을 만든다.

### 5. Ship

완료된 phase를 정리하고 PR/배포 단계로 넘긴 뒤 다음 phase를 반복한다.

## 가장 중요한 개념: Context Rot 대응

긴 AI 코딩 세션에서 계속해서

```text
조사
→ 설계
→ 구현
→ 디버깅
→ 수정
→ 리뷰
```

를 반복하면 컨텍스트가 커지고 이전 정보와 현재 작업이 섞이면서 품질이 떨어질 수 있다.

GSD Core는 이를 피하기 위해:

- 메인 세션은 orchestration 중심으로 가볍게 유지
- 조사 / 계획 / 실행 같은 무거운 작업은 fresh-context subagent에서 수행
- `STATE.md`, `CONTEXT.md` 등 파일 기반 artifact로 세션 간 상태를 유지
- 구현 뒤 명시적인 Verify 단계를 수행

하는 구조를 사용한다.

즉 **AI의 기억에 프로젝트 상태를 맡기기보다 파일 시스템과 명시적인 workflow에 맡기는 방식**이다.

## Open GSD 제품군에서의 위치

Open GSD는 현재 세 가지 주요 도구로 구성된다.

| 도구 | 역할 |
|---|---|
| **GSD Core** | 기존 Claude Code / Codex / Cursor 등의 Runtime 위에 Spec-driven Workflow를 얹음 |
| **GSD Pi** | 독립 실행형 로컬 Coding Agent / Orchestrator |
| **GSD Browser** | Agent용 Browser Automation |

이미 Claude Code나 Codex를 사용하고 있다면 가장 직접적인 대상은 **GSD Core**다.

## 설치

```bash
npx @opengsd/gsd-core@latest
```

설치 과정에서 사용할 Runtime과 global/local 설치 여부를 선택한다.

공식 문서는 Runtime 호환성을 위해 `agents/`나 `commands/` 파일을 직접 복사하지 말고 installer를 사용할 것을 권장한다.

## 시작 명령

새 프로젝트:

```text
/gsd-new-project
```

기존 프로젝트 Onboarding:

```text
/gsd-onboard
```

공식 Open GSD 문서 기준 GSD Core는 Research → Plan → Execute → Verify → Ship 흐름과 65개 이상의 slash command를 제공한다.

## 기존 get-shit-done과의 관계

```text
gsd-build/get-shit-done
        ↓
  repository archived
        ↓
open-gsd/gsd-core
```

구 저장소 README에서도 현재 개발이 `open-gsd/gsd-core`로 이동했다고 명시하고 있다.

따라서 신규 설치나 문서 탐색은 **GSD Core 기준으로 보는 것이 맞다.**

## 현재 상태

2026-08-20 확인 기준 최신 GitHub Release는 **v1.11.0**, 릴리스 날짜는 **2026-08-19**다.

최근 버전에서도 plan 간 dependency/coupling 검증, plan drift 방지, executor routing, execution scope 검증 등 장기 agent workflow의 신뢰성을 높이는 기능이 계속 강화되고 있다.

## 어떤 경우에 유용한가

특히 다음 상황에 적합하다.

- 한 번의 프롬프트로 끝나지 않는 중대형 개발
- 여러 세션에 걸쳐 이어지는 구현
- 요구사항 → 조사 → 설계 → 구현 → 검증 trace가 필요한 작업
- Claude Code / Codex의 긴 세션에서 context가 지저분해지는 문제
- 여러 subagent를 역할별로 나누어 운영하고 싶은 경우

반대로 간단한 버그 수정이나 한두 파일 수정에는 workflow overhead가 더 클 수 있다.

## 평가

GSD Core의 핵심 가치는 모델 자체의 성능 향상이 아니라 **AI 개발 프로세스의 구조화**다.

```text
좋은 모델
  +
좋은 Prompt
  +
Context 관리
  +
작업 분해
  +
검증 Loop
```

에서 뒤의 세 요소를 Framework로 제공한다고 보면 이해하기 쉽다.

실제 도입을 검토한다면 다음을 추가 분석할 가치가 높다.

- `.planning` / 상태 artifact 구조
- 전체 slash command 체계
- Plan / Execute / Verify 간 데이터 전달
- Subagent 및 model routing 구조
- 기존 프로젝트 onboarding 동작
- Claude Code와 Codex 각각의 설치 결과 차이
- Token 사용량과 workflow overhead

## 링크

- GitHub: https://github.com/open-gsd/gsd-core
- Documentation: https://docs.opengsd.net/
- Open GSD: https://opengsd.net/
- 구 저장소(Archive): https://github.com/gsd-build/get-shit-done

## 관련 문서

- [Agent Tooling Skills 비교](../agent-skills-tooling-overview.md)
