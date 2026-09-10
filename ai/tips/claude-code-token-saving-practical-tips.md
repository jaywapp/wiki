---
title: Claude Code 실전 토큰 절약 팁
category: tips
tags:
  - ai
  - claude-code
  - token-optimization
  - subagent
  - context-management
source: Instagram grab.frontier 게시물 및 Anthropic Claude Code 공식 문서
updated: 2026-09-10
---

# Claude Code 실전 토큰 절약 팁

> Claude Code의 비용과 컨텍스트 소비를 줄이려면 **서브에이전트 모델 라우팅, 낮은 effort, 작은 검색 결과, 짧은 세션/깨끗한 작업 상태, 캐시 친화적 설정**을 함께 운영하는 것이 효과적이다. 단, 게시물의 일부 설정/수치는 공식 문서에서 확인되지 않아 그대로 적용하기보다 검증이 필요하다.

## 프로젝트 개요

2026-09-01 Instagram `grab.frontier`에 게시된 「클로드 코드 실전 팁 5편 - 토큰 아끼기」의 슬라이드 중 사용자가 제공한 2~6번 내용을 Claude Code 공식 문서와 대조해 실무 적용 관점에서 정리한다.

게시물에서 제안하는 핵심은 다음과 같다.

1. 서브에이전트에 상대적으로 저렴한 모델을 사용한다.
2. 작업 종료 후 변경사항을 커밋해 반복적인 diff 재독해를 줄인다.
3. `ripgrep`, `ast-grep`처럼 결과를 좁힐 수 있는 검색 도구를 사용한다.
4. 기본 reasoning effort를 낮춘다.
5. 세션 중 캐시를 깨뜨릴 수 있는 설정 변경을 최소화한다.

## 해결하려는 문제

Claude Code 비용은 단순히 최종 답변 길이만으로 결정되지 않는다. 긴 코드 검색 결과, 반복되는 파일 읽기, 도구 정의, 서브에이전트 호출, 추론 토큰, 긴 대화 히스토리가 누적되면서 입력/출력 토큰과 컨텍스트 사용량이 커진다.

따라서 최적화의 핵심은 `검색량 → 컨텍스트 유입량 → reasoning → 반복 재독해`의 전체 경로를 줄이는 것이다.

## 핵심 팁과 검증

### 1. 서브에이전트 모델을 낮춰 사용

게시물 예시:

```json
{
  "env": {
    "CLAUDE_CODE_SUBAGENT_MODEL": "sonnet"
  }
}
```

공식 문서에서 `CLAUDE_CODE_SUBAGENT_MODEL` 환경 변수는 실제 지원된다. 서브에이전트 모델 결정 시 이 환경 변수가 가장 높은 우선순위를 갖는다.

다만 모든 서브에이전트를 Sonnet으로 강제하는 것이 항상 최선은 아니다. 공식 문서는 단순 탐색에는 Haiku 등 더 빠르고 저렴한 모델을 사용할 수 있다고 안내하며, built-in Explore agent 역시 읽기 전용 코드 탐색에 최적화된 경량 모델을 사용한다.

**권장:** 전역 강제보다 에이전트 역할별 `model` 지정이 더 유연하다.

### 2. 작업이 끝나면 커밋

게시물의 논리는 변경사항이 오래 쌓일수록 Claude가 반복적으로 `git diff`를 읽어야 하므로 커밋 단위를 작게 유지하자는 것이다.

이 주장은 특정 공식 토큰 절감 기능이라기보다 **작업 상태 관리 패턴**으로 보는 것이 정확하다. 깨끗한 working tree는 diff 범위를 줄이고 에이전트가 현재 변경사항을 파악하는 비용을 줄이는 데 도움이 될 수 있다.

단, 의미 없는 micro-commit을 강제할 필요는 없다. 실무에서는 하나의 논리적 작업 단위가 끝났을 때 커밋하는 방식이 적절하다.

### 3. ripgrep / ast-grep으로 검색 결과를 줄이기

게시물은 `rg`, `ast-grep`을 설치하고 Bash permission을 허용한 뒤 CLAUDE.md에 검색 규칙을 적는 방법을 제안한다.

핵심은 검색 명령 자체가 아니라 **검색 후 컨텍스트에 들어오는 결과량을 줄이는 것**이다.

- `rg`: 문자열/정규식 기반 빠른 탐색
- `ast-grep`: AST 구조 기반 코드 검색 및 변환

대형 코드베이스에서는 전체 파일을 읽기보다 후보 파일과 코드 블록을 먼저 좁힌 뒤 필요한 범위만 읽는 방식이 효율적이다.

주의: Claude Code 자체에도 Grep/Glob/Explore 등의 검색 수단이 있으므로 외부 CLI 설치가 필수는 아니다. 특히 Windows/Enterprise 환경에서는 별도 바이너리 배포 및 허용 정책을 고려해야 한다.

### 4. effort를 medium으로 낮추기

공식 Claude Code 문서는 `/effort` 명령과 effort 수준을 지원한다. 낮은 effort는 응답당 reasoning을 줄여 지연시간과 토큰 비용을 낮춘다.

공식 문서 기준 용도:

- low: 파일 조회, 디렉터리 목록 등 단순 작업
- medium: 일반적인 수정과 표준 작업
- high: 리팩터링, 디버깅 등 깊은 분석
- xhigh/max: 복잡한 agentic/multi-step 문제

따라서 모든 작업을 높은 effort로 처리하기보다 **기본 medium + 어려운 문제에서만 high/xhigh**가 합리적이다.

게시물의 “기본값이 high”라는 설명은 SDK/모델/버전에 따라 다를 수 있으므로 일반화하면 안 된다. 공식 SDK 문서에서도 Python은 미지정 시 모델 기본값을 따르고 TypeScript SDK는 high가 기본이라고 설명한다.

### 5. 세션 중 설정 변경 최소화

게시물은 prompt cache가 `tool definitions → CLAUDE.md → conversation history` 순서의 prefix에 의존하므로 모델/MCP/CLAUDE.md/effort 변경이 캐시 효율에 영향을 줄 수 있다고 설명한다.

원칙적으로 **안정적인 prompt prefix를 유지하면 캐시 재사용에 유리하다**는 방향은 타당하다. 따라서 자주 바꾸는 프로젝트 지침을 거대한 CLAUDE.md에 넣거나 불필요한 MCP를 항상 활성화하는 것은 피하는 편이 좋다.

공식 비용 가이드 역시 `/context`로 컨텍스트 소비를 확인하고 사용하지 않는 MCP 서버를 비활성화하라고 권장한다. 또한 MCP 대신 CLI가 가능한 경우 CLI가 tool schema 오버헤드를 줄일 수 있다고 안내한다.

그러나 게시물에 등장하는 `subagentPromptCacheTtl: "1h"` 설정은 2026-09-10 조사 시점의 공개 Claude Code settings 공식 문서에서 확인하지 못했다. **미공개/실험 옵션 또는 게시물 오류 가능성이 있으므로 검증 전 적용하지 않는다.**

## 권장 운영 구조

```text
사용자 요청
   │
   ▼
Main Claude
   │
   ├─ 단순 탐색 ──> Explore / Haiku / low~medium
   │                    │
   │                    └─ rg / ast-grep / Grep로 후보 축소
   │
   ├─ 일반 구현 ──> Sonnet / medium
   │
   └─ 복잡한 설계·디버깅 ──> high/xhigh 또는 상위 모델

검색 결과는 필요한 범위만 Main Context로 반환
   │
   ▼
논리적 작업 단위 완료 → diff/review → commit
   │
   ▼
다음 작업은 가능한 깨끗한 상태에서 시작
```

## 장점

- 코드 탐색 결과가 메인 컨텍스트를 오염시키는 것을 줄일 수 있다.
- 쉬운 작업에 과도한 reasoning을 사용하는 것을 방지한다.
- 서브에이전트 역할별 모델 라우팅으로 비용과 속도를 조절할 수 있다.
- 작은 작업 단위와 clean diff가 에이전트의 상태 파악을 단순화한다.
- 불필요한 MCP/tool schema를 줄이면 컨텍스트 효율이 좋아질 수 있다.

## 단점 및 한계

- 모델을 지나치게 낮추면 탐색 누락과 잘못된 판단 때문에 오히려 재작업 토큰이 증가할 수 있다.
- `rg`/`ast-grep` 규칙을 무조건 강제하면 Claude의 built-in 탐색 전략보다 비효율적인 상황도 생긴다.
- 잦은 커밋은 팀의 Git/Perforce 운영 정책과 충돌할 수 있다.
- Perforce 중심 환경에서는 “commit after every task”를 그대로 적용할 수 없으며 changelist 단위로 해석해야 한다.
- 게시물의 캐시 TTL 관련 설정은 공식 확인이 필요하다.
- 토큰 절약만 최적화하면 정확도와 작업 성공률이 떨어질 수 있다. 최종 목표는 **task당 총비용(cost per successful task)** 이어야 한다.

## 활용 사례

### 바로 적용 가능

- 기본 effort를 `medium`으로 사용하고 디버깅/설계에서만 높인다.
- 코드 탐색을 서브에이전트로 격리해 메인 컨텍스트를 보존한다.
- `/context`로 MCP/도구/CLAUDE.md가 차지하는 비중을 점검한다.
- 사용하지 않는 MCP를 비활성화한다.
- 검색 결과는 파일 전체보다 후보와 필요한 코드 범위 중심으로 반환한다.

### PoC 가치 있음

- `rg + ast-grep` 기반 코드 검색 Skill을 만들어 기존 Claude 탐색과 토큰 사용량 비교.
- 역할별 subagent model/effort 라우팅 정책을 만들어 작업 성공률과 토큰을 측정.
- Perforce 환경에서 `작업 완료 → p4 diff/describe → CL 정리` 패턴이 반복 읽기를 얼마나 줄이는지 측정.

### 아이디어 참고

- prompt cache 친화적인 stable-prefix 설계.
- CLAUDE.md를 핵심 규칙만 남기고 상세 지침은 Skill/on-demand 문서로 분리.

### 현재 도입 가치 낮음

- 공식 문서에서 확인되지 않은 `subagentPromptCacheTtl`을 운영 설정에 바로 추가하는 것.

## 기존 방식과 비교

| 방식 | 컨텍스트 비용 | 정확도 | 권장 용도 |
|---|---:|---:|---|
| Main agent가 전체 탐색 | 높음 | 높음 | 작은 저장소/복잡한 연속 추론 |
| Explore/Subagent 탐색 | 낮음 | 중~높음 | 대형 저장소 탐색 |
| 항상 high effort | 높음 | 높음 | 복잡한 문제 |
| 기본 medium + 필요 시 승격 | 중간 | 높음 | 일반 개발 세션 |
| 전체 파일 반복 읽기 | 높음 | 높음 | 작은 파일 |
| rg/AST로 후보 축소 후 읽기 | 낮음 | 높음 | 대형 코드베이스 |

## 결론

게시물의 방향은 전반적으로 실용적이다. 특히 **모델/effort 라우팅, 탐색 격리, 결과 범위 축소, 안정적인 컨텍스트 유지**는 Claude Code 공식 문서의 비용 관리 방향과도 일치한다.

다만 설정값을 그대로 복사하기보다 역할별 모델 지정과 `/context` 기반 측정을 우선해야 한다. 가장 중요한 개선은 “토큰을 적게 쓰는 것” 자체가 아니라 **불필요한 토큰을 줄이면서 한 번에 작업을 성공시키는 구조**를 만드는 것이다.

## 참고 자료

- Claude Code Docs — Model configuration: https://code.claude.com/docs/en/model-config
- Claude Code Docs — Subagents: https://code.claude.com/docs/en/sub-agents
- Claude Code Docs — Commands: https://code.claude.com/docs/en/commands
- Claude Code Docs — Costs: https://code.claude.com/docs/en/costs
- Claude Code Docs — Settings: https://code.claude.com/docs/en/settings
- Claude Code Docs — Agent loop / effort: https://code.claude.com/docs/en/agent-sdk/agent-loop
- 사용자 제공 Instagram 슬라이드: grab.frontier 「클로드 코드 실전 팁 5편 - 토큰 아끼기」 (2026-09-01)
