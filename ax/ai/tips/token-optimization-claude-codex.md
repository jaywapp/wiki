# Claude + Codex 토큰 최적화 워크플로우 설계

> 태그: `Claude Code`, `Codex`, `Token Optimization`, `Context Engineering`, `AX`, `AI Workflow`
>
> Claude Code/Codex를 장시간 사용하는 개발자를 위한 비용·사용량 절감 가이드. 2026-08-26 Anthropic 공식 컨텍스트 엔지니어링 가이드 내용을 반영해 업데이트.

## 한줄 요약

**Claude Code 비용 절감의 핵심은 짧은 프롬프트가 아니라 작고 관련성 높은 컨텍스트를 유지하는 것**이다. 작업 경계에는 `/clear`, 연속 작업에는 `/compact`, 시작할 때 `/context`, 단순 작업에는 낮은 effort를 우선 적용한다.

## 프로젝트 개요

Anthropic의 Claude Code 운영 가이드와 context engineering 원칙을 실무 개발 워크플로우에 적용한 비용 절감 전략이다. 컨텍스트에는 대화뿐 아니라 CLAUDE.md, 도구 정의, MCP, 파일 읽기, 명령 출력, 서브에이전트 결과까지 포함되므로 긴 세션을 무조건 유지하기보다 작업 단위로 컨텍스트 수명을 관리한다.

## 해결하려는 문제

- 긴 세션에서 이전 대화와 tool result 누적
- 무관한 과거 작업이 다음 요청에도 포함
- 대형 파일 전체 읽기, 빌드/테스트 로그, MCP JSON의 컨텍스트 오염
- 모든 작업을 고성능 모델/높은 effort로 처리해 usage limit 조기 소진
- 작업 상태를 대화에만 의존해 새 세션 전환 비용 증가

## 핵심 기능

### 1. 작업이 끝나면 `/clear`

서로 관계없는 작업으로 넘어갈 때 기존 대화를 비우고 fresh context에서 시작한다.

```text
작업 A 완료
→ 필요한 결정/진행상태를 문서 또는 git에 남김
→ /clear
→ 작업 B 시작
```

같은 문제를 계속 디버깅 중이라면 무조건 clear하지 않는다. 필요한 원인 분석과 결정까지 사라져 재탐색 비용이 생길 수 있다.

### 2. 긴 동일 작업은 `/compact`

같은 작업을 이어가야 하지만 대화가 길어졌다면 `/compact`로 핵심 결정, 미해결 문제, 구현 상태를 남기고 과거 tool output 등의 노이즈를 압축한다. Anthropic은 장기 에이전트의 대표적인 context engineering 기법으로 compaction을 제시한다.

### 3. 새 세션에서 `/context` 확인

새 세션을 열었을 때 `/context`로 어떤 CLAUDE.md, MCP, 도구 등이 로드되었는지 확인한다. 사용하지 않는 MCP/도구/지침이 항상 로드된다면 그 자체가 고정 컨텍스트 비용이다.

### 4. CLAUDE.md는 짧고 안정적으로

- CLAUDE.md: 항상 필요한 코딩 규칙·명령·프로젝트 구조
- Skill/문서: 특정 작업에서만 필요한 상세 절차
- 진행상태 파일: 장기 작업의 체크포인트

일회성 작업 정보와 긴 예제는 CLAUDE.md에서 분리해 필요할 때만 로드한다.

### 5. 필요한 파일만 JIT 로드

Claude가 파일명을 보고 반복 탐색하게 하기보다 필요한 파일을 직접 참조한다. 대형 파일은 전체보다 필요한 범위를 우선한다. Anthropic은 Claude Code가 CLAUDE.md를 upfront context로 사용하면서 glob/grep 등을 통해 나머지 정보를 just-in-time 검색하는 하이브리드 구조라고 설명한다.

### 6. 명령 출력과 MCP 결과 최소화

- verbose build/test 로그는 실패 부분 중심으로 제한
- git diff/status/search 결과도 필요한 범위만
- 가능하면 quiet 옵션 사용
- 필요한 MCP만 활성화
- 큰 탐색 결과는 subagent로 격리하고 메인에는 결론만 반환

### 7. effort를 난이도에 맞춘다

Anthropic은 effort를 품질/사고량과 latency/usage-limit 소비 사이의 트레이드오프로 설명한다.

| 작업 | 권장 effort |
|---|---|
| 파일 검색, 단순 수정, 보일러플레이트 | low/medium |
| 일반 구현 | medium/high |
| 복잡한 디버깅·아키텍처 | high |
| 매우 어려운 장기 작업 | xhigh/max 필요 시 |

낮은 effort가 항상 싼 것은 아니다. 어려운 작업에서 실패와 재시도가 늘면 총비용이 더 커질 수 있다.

### 8. 서브에이전트로 컨텍스트 격리

코드베이스 탐색, 문서 조사, 로그 분석처럼 중간 결과가 큰 작업은 subagent에 맡기고 메인 세션에는 요약된 결론만 반환한다. 병렬화보다 **context isolation** 효과가 중요하다.

## 아키텍처

```text
User Task
   │
   ├─ 새/무관한 작업 ─────────→ /clear
   │
   └─ 기존 작업 연속
          │
          ├─ context 작음 ────→ 계속 진행
          └─ context 큼 ──────→ /compact

Fresh/Compact Session
   │
   ├─ /context 확인
   ├─ 최소 CLAUDE.md
   ├─ 필요한 파일만 JIT 로드
   ├─ noisy 탐색 → subagent
   └─ 난이도 → model/effort 선택
```

장기 작업에서는 대화를 영구 메모리로 사용하지 않고 progress 문서와 git history를 외부 상태 저장소로 사용한다.

## 장점

- 별도 유료 도구 없이 Claude Code 기본 기능으로 상당 부분 적용 가능
- usage limit 소모와 API 비용을 동시에 줄일 수 있음
- 컨텍스트 오염 감소로 장기 세션의 집중도 개선 가능
- 작업 단위 세션 관리가 자동화/Agent workflow와 잘 맞음
- subagent가 코드베이스 탐색 결과로 메인 컨텍스트가 범람하는 것을 방지

## 단점

- `/clear` 과사용 시 필요한 맥락을 다시 탐색해 오히려 토큰 증가
- `/compact`가 미묘하지만 중요한 정보를 잃을 가능성
- 낮은 effort가 복잡한 문제에서 재시도를 늘릴 수 있음
- CLAUDE.md를 지나치게 줄이면 규칙을 반복 탐색해야 함
- subagent도 토큰을 사용하므로 작은 작업까지 위임하면 총량 증가

## 기존 도구와 비교

| 방식 | 장점 | 한계 | 추천 시점 |
|---|---|---|---|
| `/clear` | 과거 컨텍스트 완전 제거 | 연속성 손실 | 작업 경계 |
| `/compact` | 연속성 유지 + 압축 | 정보 손실 가능 | 긴 동일 작업 |
| `/context` | 고정 컨텍스트 진단 | 직접 절감 기능 아님 | 세션 시작/점검 |
| CLAUDE.md 최소화 | 매 턴 기본 부담 감소 | 과도한 축약 위험 | 항상 |
| Subagent | 탐색 컨텍스트 격리 | 추가 호출 비용 | 큰 탐색/조사 |
| 낮은 effort | reasoning 사용량 감소 | 품질 저하 가능 | 단순 작업 |
| RTK 등 출력 압축 | CLI 로그 축소 | 추가 도구 운영 | 로그 많은 환경 |

## 활용 사례

### 작은 버그 수정

`/clear → 관련 파일 직접 지정 → low/medium effort → 테스트 결과 최소 출력 → 종료`

### 대형 리팩터링

`high effort 계획 → 탐색 subagent → 단계별 구현 → progress 기록 → /compact → 다음 단계`

### 장기 Agent 작업

Anthropic의 long-running agent 연구처럼 `progress.md`와 git history를 세션 외부의 durable state로 사용한다. fresh context의 다음 agent가 현재 상태를 빠르게 복구하도록 한다.

## 내가 활용할 수 있는 아이디어

1. **Session Close Skill**: 작업 완료 시 변경사항·미해결 항목·다음 행동을 `progress.md`에 기록하고 작업 경계에서 `/clear`.
2. **Context Budget Check Skill**: `/context` 결과를 검사해 불필요한 MCP/CLAUDE.md 항목 탐지.
3. **Effort Router**: `search / mechanical / implementation / architecture / debugging`으로 분류해 effort 자동 추천.
4. **Quiet Command Wrapper**: build/test/git 결과를 성공 시 한 줄, 실패 시 핵심 오류 주변만 반환.
5. **Backlog형 에이전트**: 각 backlog item을 fresh session으로 실행하고 결과/진행상태만 외부 저장소에 남김.

## 실무 SOP

```text
[세션 시작]
1. /context 확인
2. 무관한 MCP/지침 과다 로드 여부 확인
3. 난이도에 맞춰 model/effort 결정

[작업 중]
4. 필요한 파일만 직접 참조/JIT 로드
5. 빌드·테스트·검색 출력 최소화
6. 큰 탐색은 subagent로 분리
7. 동일 작업이 길어지면 /compact

[작업 완료]
8. 결정사항/진행상태를 git·문서에 기록
9. 다음 작업이 무관하면 /clear
```

## 참고 링크

- Anthropic Engineering — Effective context engineering for AI agents (2025-09-29)
- Anthropic Engineering — Effective harnesses for long-running agents (2025-11-26)
- Anthropic — Claude Code quality / effort update (2026-04-23)
- Anthropic — Claude Opus 4.8 / effort control (2026-05-28)
- Anthropic — Claude Code Foundations webinar (2026-07-08)
- Headroom / RTK / token-optimizer 등 외부 압축 도구는 벤더 주장과 실제 워크로드 실측을 구분해 평가할 것.
