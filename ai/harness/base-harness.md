---
title: base-harness
category: harness
tags:
  - ai
  - harness
  - claude-code
  - codex
  - opencode
  - multi-runtime
  - hooks
source: https://github.com/areopact/base-harness
updated: 2026-09-11
---

# base-harness

> Claude Code·Codex CLI·OpenCode용 규칙, Skill, Hook을 하나의 공통 Harness 소스에서 정의하고 런타임별 Adapter가 네이티브 구성으로 생성하는 신생 멀티 런타임 Harness 템플릿이다.

## 프로젝트 개요

`areopact/base-harness`는 2026-09-08 생성되었고 2026-09-10 첫 공개 버전 0.1.0을 낸 매우 초기 단계 프로젝트다. 핵심 목적은 Claude Code, Codex CLI, OpenCode마다 별도 `AGENTS.md`, Skill, Hook, 설정을 수동 유지하면서 발생하는 drift를 줄이는 것이다.

공통 정의는 `harness/` 아래에 두고 bootstrap이 각 런타임이 기대하는 경로와 형식으로 materialize한다. 프로젝트는 단순 프롬프트 모음보다 Contract, Skills, Rules, Hooks, Adapters, Registries, Doctor, Memory lane을 포함한 실행 환경 템플릿에 가깝다.

## 해결하려는 문제

멀티 에이전트 런타임을 함께 쓰면 같은 정책을 Claude Code, Codex, OpenCode에 각각 복제하게 된다. 런타임마다 Hook 지원 수준, trust 모델, 파일 위치, Skill 호출 방식이 달라 다음 문제가 생긴다.

- 동일 규칙의 런타임별 사본이 서로 달라지는 configuration drift
- "파일이 존재함"과 "실제 런타임에서 로드·실행됨"을 구분하지 못하는 검증 문제
- Hook을 지원하지 않거나 신뢰 승인이 필요한 런타임에서 정책이 사라지는 문제
- 기존 저장소에 Harness를 이식할 때 원래 규칙과 파일을 덮어쓰는 위험

base-harness는 공통 Source of Truth와 runtime adapter, 그리고 단계별 verification evidence로 이를 해결하려 한다.

## 핵심 기능

- 공통 Contract: `harness/CONTRACT.md` + host 전용 contract에서 `AGENTS.md`를 생성하고 Claude Code는 `CLAUDE.md`에서 이를 참조한다.
- Skill 선택/생성: `harness/skills/`를 원본으로 두고 선택된 pack만 런타임별 위치로 materialize한다.
- Rule routing: always-on / path-scoped rule을 registry로 관리한다.
- Hook 공통 구현: Python 구현 하나를 shell/PowerShell/Codex dispatcher 등 런타임별 wrapper로 연결한다.
- Runtime Adapter: `harness/adapters/{claude,codex,opencode}`가 런타임별 구성을 생성한다.
- Registry: runtime, capability, structure, selection, source, environment 정보를 JSON으로 관리한다.
- Doctor: `configured`, `loaded`, `trusted`, `fired`, `enforced`, `outcome-proven`처럼 구성과 실제 실행 증거를 분리해 보고한다.
- Degradation ladder: 네이티브 Hook → Contract text → SCM pre-commit guard 순으로 가능한 수준까지 정책을 유지한다.
- Adopt: 기존 저장소에 Harness kernel을 추가하되 README 등을 덮어쓰지 않는 도입 경로를 제공한다.

## 아키텍처

```text
                 harness/  (Single Source of Truth)
                 ├─ CONTRACT
                 ├─ skills/
                 ├─ rules/
                 ├─ hooks/
                 └─ registry/
                       │
                 Bootstrap / Generator
             ┌─────────┼──────────┐
             │         │          │
       Claude Adapter  Codex Adapter  OpenCode Adapter
             │         │          │
       native files  native files  native files
             │         │          │
             └──── Doctor / Evidence ────┘
                        │
             configured → loaded → fired
                        → enforced → outcome-proven
```

특히 유용한 아이디어는 **"정책 정의"와 "런타임 표현"을 분리하는 것**이다. 런타임별 설정은 사람이 편집하는 원본이 아니라 생성 산출물로 취급한다.

## 장점

첫째, 여러 AI Coding Runtime을 함께 쓰는 환경에서 규칙을 한 번만 관리할 수 있다. 둘째, Doctor가 단순 파일 존재 여부가 아니라 실제 적용 증거 수준을 구분해 "설정은 되어 있지만 Hook은 실제로 안 돈다" 같은 실패를 드러낸다. 셋째, Windows용 PowerShell, NTFS junction/copy mode, bash/Python 요구사항 등을 명시해 Windows 실무 환경을 비교적 적극적으로 고려한다.

또한 런타임 capability가 다를 때 완전한 동일 동작을 강요하지 않고 degradation ladder로 가능한 수준까지 정책을 유지하는 접근은 Enterprise Harness에 적합하다.

## 단점 및 한계

프로젝트는 2026-09-08 생성된 매우 초기 단계이며 첫 공개 버전도 2026-09-10이다. 현재 별도 SLA가 없고 런타임 버전 변화에 대한 호환성 보장을 하지 않는다고 명시한다. 공개 지표도 아직 매우 작으므로 성숙한 프레임워크로 보기는 어렵다.

Codex CLI의 Hook enforcement는 프로젝트 작성자 환경에서 아직 완전하게 자동 검증되지 않았다. Codex의 trust 및 hook hash approval가 개입하여 headless 검증에 제약이 있다고 프로젝트가 기록하고 있다.

또한 현재 구현은 Git을 전제로 한다. `.githooks/pre-commit`, branch workflow, git mode 등이 Harness의 하위 안전망에 포함되어 있어 Perforce 환경에 그대로 적용할 수 없다.

Skill 12개 중 다수는 `spec-only` 상태이며, "공통 정의가 실제 세 런타임에서 동일 의미를 보장한다"는 장기 운영 증거는 아직 부족하다.

## 활용 사례

- Claude Code와 Codex를 같은 저장소에서 병행하지만 팀 규칙을 중복 관리하고 싶지 않은 경우
- Skill/Hook/Agent 정책을 한 곳에서 정의한 뒤 여러 런타임에 배포하고 싶은 경우
- Enterprise 환경에서 "설치됨"과 "실제 정책이 실행됨"을 자동 진단해야 하는 경우
- 프로젝트마다 공통 Harness kernel을 이식하면서 host-specific 규칙은 분리해야 하는 경우

## 기존 방식과 비교

일반적인 방식은 `CLAUDE.md`, `AGENTS.md`, 각 런타임 설정, Hook 스크립트를 직접 각각 관리한다. base-harness는 이를 **공통 registry/contract → generator → runtime-native artifact** 구조로 바꾼다.

이전 조사한 runtime adapter 계열 Harness와 방향은 유사하지만, base-harness의 차별점은 Adapter뿐 아니라 Skill selector, Hook, Doctor evidence, host profile, degradation ladder까지 하나의 repo template으로 묶었다는 점이다.

## Perforce + Claude Code + Codex 활용 아이디어

직접 도입보다 아키텍처를 차용하는 PoC 가치가 높다. Git-specific 부분을 Perforce로 치환하면 다음 구조가 적합하다.

```text
Internal Harness SoT
├─ contract/
├─ skills/
├─ rules/
├─ hooks/
└─ registry/
       │
       ├─ Claude Code Adapter
       └─ Codex Adapter
              │
          Harness Doctor
              │
  configured / loaded / fired / enforced
              │
      Perforce Submit Guard
```

- `.githooks/pre-commit` 대신 Pending CL 검사 또는 submit 전 검증기를 최종 안전망으로 사용한다.
- branch/profile 개념 대신 Perforce workspace / stream / pending CL 정보를 registry fact로 둔다.
- Claude/Codex 설정 파일은 직접 편집하지 않고 공통 registry에서 생성한다.
- Doctor는 `p4 info`, workspace 상태, Hook 등록 여부, 실제 Hook fire evidence까지 점검한다.
- 런타임에 Hook 기능이 없거나 제한되면 `AGENTS.md` 정책으로 degrade하고 최종적으로 Perforce submit gate에서 막는다.

## 활용 평가

**PoC 가치 있음.** 지금 프로젝트 자체를 팀 표준으로 채택하기에는 너무 이르지만, **Common Harness SoT → Runtime Adapter → Evidence Doctor → SCM floor** 패턴은 Claude Code + Codex + Perforce 환경에 바로 참고할 가치가 높다.

## 결론

base-harness의 핵심 가치는 새로운 Agent 기능 자체보다 **여러 AI Coding Runtime의 운영 규칙을 한 번 정의하고, 각 런타임으로 생성하며, 실제 적용 증거까지 검증하는 운영 구조**다. Perforce 환경에서는 Git 계층을 교체해야 하지만, 내부 Harness의 configuration drift를 줄이는 설계 참고자료로 매우 유용하다.

## 참고 자료

- Repository: https://github.com/areopact/base-harness
- README: https://github.com/areopact/base-harness/blob/main/README.md
- Verification: https://github.com/areopact/base-harness/blob/main/docs/VERIFICATION.md
- Architecture: https://github.com/areopact/base-harness/blob/main/docs/ARCHITECTURE.md
