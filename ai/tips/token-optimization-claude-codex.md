# Claude + Codex 토큰 최적화 워크플로우 설계

> 태그: `Claude Code`, `Codex`, `Token Optimization`, `Context Engineering`, `AX`, `AI Workflow`
>
> Claude Code/Codex를 장시간 사용하는 개발자를 위한 비용·사용량 절감 가이드. 2026-09-12 Claude Code v2.1.269와 Codex의 최근 context-budget/token-telemetry 구현을 반영해 업데이트.

## 한줄 요약

**Claude Code/Codex 비용 절감의 핵심은 짧은 프롬프트가 아니라 작고 관련성 높은 컨텍스트를 유지하면서, 필수 증거를 보존하고 실제 사용 모델별 비용을 측정하는 것**이다.

## 프로젝트 개요

Anthropic의 Claude Code 운영 가이드와 context engineering 원칙, 최근 Claude Code/Codex 구현에서 확인되는 context budget 패턴을 실무 개발 워크플로우에 적용한 비용 절감 전략이다. 컨텍스트에는 대화뿐 아니라 CLAUDE.md/AGENTS.md, 도구 정의, MCP, 파일 읽기, 명령 출력, 서브에이전트 결과, reviewer evidence까지 포함되므로 긴 세션을 무조건 유지하기보다 작업 단위로 컨텍스트 수명과 입력 우선순위를 관리한다.

## 해결하려는 문제

- 긴 세션에서 이전 대화와 tool result 누적
- 무관한 과거 작업이 다음 요청에도 포함
- 대형 파일 전체 읽기, 빌드/테스트 로그, MCP JSON의 컨텍스트 오염
- 모든 작업을 고성능 모델/높은 effort로 처리해 usage limit 조기 소진
- 작업 상태를 대화에만 의존해 새 세션 전환 비용 증가
- context window 초과 직전에 임의 truncate하여 중요한 지침·승인·검증 증거를 잃는 문제
- 한 turn 안에서 compaction/reviewer/worker가 다른 모델을 쓰는데 session 총량만 보아 비용 원인을 잘못 판단하는 문제

## 핵심 기능

### 1. 작업이 끝나면 `/clear`

서로 관계없는 작업으로 넘어갈 때 기존 대화를 비우고 fresh context에서 시작한다.

```text
작업 A 완료
→ 필요한 결정/진행상태를 문서 또는 VCS/ledger에 남김
→ /clear
→ 작업 B 시작
```

같은 문제를 계속 디버깅 중이라면 무조건 clear하지 않는다. 필요한 원인 분석과 결정까지 사라져 재탐색 비용이 생길 수 있다.

### 2. 긴 동일 작업은 `/compact`

같은 작업을 이어가야 하지만 대화가 길어졌다면 `/compact`로 핵심 결정, 미해결 문제, 구현 상태를 남기고 과거 tool output 등의 노이즈를 압축한다. Compaction 결과는 durable history의 대체물이 아니라 다시 만들 수 있는 working snapshot으로 취급하는 편이 안전하다.

### 3. 새 세션에서 `/context` 확인

새 세션을 열었을 때 `/context`로 어떤 CLAUDE.md, MCP, 도구 등이 로드되었는지 확인한다. 사용하지 않는 MCP/도구/지침이 항상 로드된다면 그 자체가 고정 컨텍스트 비용이다.

### 4. CLAUDE.md / AGENTS.md는 짧고 안정적으로

- 항상 필요한 코딩 규칙·명령·프로젝트 구조만 고정 지침에 둔다.
- 특정 작업의 상세 절차는 Skill/문서로 분리한다.
- 진행 상태와 장기 결정은 durable state에 둔다.
- 일회성 작업 정보와 긴 예제는 필요할 때만 로드한다.

Claude Code v2.1.268~2.1.269의 prompt-cache 관련 수정이 보여주듯, cache 효율을 위해서는 단순히 내용이 짧은 것보다 **stable prefix가 실제 byte/request 관점에서도 안정적인가**가 중요하다.

### 5. 필요한 파일만 JIT 로드

Claude가 파일명을 보고 반복 탐색하게 하기보다 필요한 파일을 직접 참조한다. 대형 파일은 전체보다 필요한 범위를 우선한다. 코드베이스 전체 지식은 upfront prompt에 넣기보다 검색/graph/RAG에서 필요한 조각만 가져온다.

### 6. 명령 출력과 MCP 결과 최소화

- verbose build/test 로그는 실패 부분 중심으로 제한
- `p4 diff`, status/search 결과도 필요한 범위만
- 성공 결과는 summary/delta 위주로 반환
- 필요한 MCP만 활성화
- 큰 탐색 결과는 subagent로 격리하고 메인에는 결론+evidence pointer만 반환
- 가능하면 `deny → agent 재시도`보다 Hook/adapter가 같은 turn에서 output을 compact/rewrite

### 7. effort를 난이도에 맞춘다

| 작업 | 권장 effort |
|---|---|
| 파일 검색, 단순 수정, 보일러플레이트 | low/medium |
| 일반 구현 | medium/high |
| 복잡한 디버깅·아키텍처 | high |
| 매우 어려운 장기 작업 | xhigh/max 필요 시 |

낮은 effort가 항상 싼 것은 아니다. 어려운 작업에서 실패와 재시도가 늘면 총비용이 더 커질 수 있다.

### 8. 서브에이전트로 컨텍스트 격리

코드베이스 탐색, 문서 조사, 로그 분석처럼 중간 결과가 큰 작업은 subagent에 맡기고 메인 세션에는 요약된 결론만 반환한다. 병렬화보다 **context isolation** 효과가 중요하다.

### 9. Context Budget은 `truncate`가 아니라 Admission Control로 관리

2026-09 Codex Guardian 구현은 reviewer evidence 자체만 크기를 보는 대신, history·tools·output format·reminder 등 **최종 조립된 요청 전체**를 기준으로 budget을 계산하도록 변경되었다.

핵심 패턴은 다음과 같다.

```text
Model Input Limit
      │
      ├─ Stable/System Prefix
      ├─ History
      ├─ Tool Schemas
      ├─ Output Format / Reminder
      ├─ Mandatory Evidence
      ├─ Optional Evidence
      └─ Safety Margin
```

실전 규칙:

1. tool/context가 모두 확정된 뒤 최종 request 크기를 계산한다.
2. 작은 safety margin을 별도로 예약한다. Codex Guardian 구현은 256-token margin을 둔다.
3. 사용자 지침, 제한사항, 승인, 실행할 action 인자처럼 의미가 깨지면 안 되는 정보는 `mandatory`로 취급한다.
4. 오래된 verbose log나 중복 evidence는 `optional`로 분류해 먼저 제외한다.
5. 그래도 넘으면 summary compaction을 제한적으로 시도한다.
6. mandatory evidence까지 잘라서 억지로 요청을 보내기보다 fail/defer/다른 reviewer로 넘긴다.

이 방식은 단순 token 절약을 넘어 **작은 context를 만들면서도 중요한 정보의 의미를 보존하는 방법**이다.

### 10. 사용량은 Session 총량이 아니라 `Turn × Model × Token Type`으로 측정

Codex main branch의 최근 변경은 model switch와 compaction이 섞인 turn에서 session-level token total만 보면 실제 비용 귀속이 잘못될 수 있다는 점을 해결한다. 각 response의 resolved step model을 기준으로 turn 내 token usage를 모델별로 누적한다.

내부 Harness에서도 다음 ledger가 유용하다.

```text
Task / Pending CL
  └─ Root Turn
      ├─ Claude: input/cache/output
      ├─ Codex Worker: input/cache/output
      ├─ Compactor: input/output
      └─ Reviewer: input/output
```

권장 KPI:

- `cost / solved task`
- `tokens / solved task`
- `turns / solved task`
- `cache read / uncached input`
- `model별 token/cost`
- `compaction cost / 이후 절감량`
- `optional evidence omission 후 retry율`

### 11. Prompt Cache를 깨뜨리는 Resume/Auto-Resume를 관찰

Claude Code v2.1.269에서는 다음 prompt-cache correctness 문제가 수정되었다.

- output-token limit에 걸린 응답이 자동 resume된 다음 turn에서 cache 일부가 invalidated되던 문제
- mid-thought interrupt 후 session resume 시 이전 context 재전송 형태가 바뀌어 cache reuse가 낮아지던 문제
- cloud session 첫 요청 전에 server config가 확정되지 않아 cache miss가 나던 문제

따라서 Harness benchmark는 정상 연속 대화만 측정하면 부족하다. 최소한 `normal`, `interrupt/resume`, `output-limit auto-resume`, `compaction` 경로별 cache hit/비용을 비교해야 한다.

## 아키텍처

```text
Task / Pending CL
      │
      ├─ Durable Ledger
      │     └─ raw evidence / decisions / handoff
      │
      └─ Working Context Manager
             ├─ stable prefix
             ├─ recent turns
             ├─ JIT file/context retrieval
             ├─ mandatory evidence
             ├─ optional evidence
             └─ budget admission + compaction
                       │
                Runtime Adapter
                ├─ Claude Code
                └─ Codex
                       │
                 Token Ledger
                 └─ turn × model × token type
```

장기 작업에서는 대화를 영구 메모리로 사용하지 않고 progress 문서, VCS 정보, task ledger를 외부 durable state로 사용한다.

## 장점

- 별도 유료 도구 없이 Claude Code/Codex 기본 기능과 Hook layer로 상당 부분 적용 가능
- usage limit 소모와 API 비용을 동시에 줄일 수 있음
- 컨텍스트 오염 감소로 장기 세션의 집중도 개선 가능
- 작업 단위 세션 관리가 자동화/Agent workflow와 잘 맞음
- 중요 evidence의 의미 손실을 줄이면서 optional context만 줄일 수 있음
- multi-model routing의 실제 비용을 더 정확하게 측정 가능

## 단점

- `/clear` 과사용 시 필요한 맥락을 다시 탐색해 오히려 토큰 증가
- `/compact`가 미묘하지만 중요한 정보를 잃을 가능성
- 낮은 effort가 복잡한 문제에서 재시도를 늘릴 수 있음
- 고정 지침을 지나치게 줄이면 규칙을 반복 탐색해야 함
- subagent도 토큰을 사용하므로 작은 작업까지 위임하면 총량 증가
- 정확한 request-budget 계산에는 provider별 token estimator 차이를 다뤄야 함
- 모델별 telemetry를 세밀하게 저장하면 observability/저장 구조가 복잡해짐

## 기존 도구와 비교

| 방식 | 장점 | 한계 | 추천 시점 |
|---|---|---|---|
| `/clear` | 과거 컨텍스트 완전 제거 | 연속성 손실 | 작업 경계 |
| `/compact` | 연속성 유지 + 압축 | 정보 손실 가능 | 긴 동일 작업 |
| `/context` | 고정 컨텍스트 진단 | 직접 절감 기능 아님 | 세션 시작/점검 |
| 고정 지침 최소화 | 매 턴 기본 부담 감소 | 과도한 축약 위험 | 항상 |
| Subagent | 탐색 컨텍스트 격리 | 추가 호출 비용 | 큰 탐색/조사 |
| 낮은 effort | reasoning 사용량 감소 | 품질 저하 가능 | 단순 작업 |
| RTK/Hook 출력 압축 | CLI 로그 축소 | 추가 도구 운영 | 로그 많은 환경 |
| Budget admission | 필수 evidence 보존 | estimator/우선순위 설계 필요 | reviewer/agent handoff |
| Turn×Model telemetry | routing 비용 정확히 파악 | 계측 복잡도 | multi-model Harness |

## 활용 사례

### 작은 버그 수정

`/clear → 관련 파일 직접 지정 → low/medium effort → 테스트 결과 최소 출력 → 종료`

### 대형 리팩터링

`high effort 계획 → 탐색 subagent → 단계별 구현 → progress 기록 → /compact → 다음 단계`

### 장기 Agent 작업

`raw task ledger + compact working context`로 분리하고 fresh context의 다음 agent가 필요한 evidence만 재조회하도록 한다.

### Reviewer Agent

```text
전체 evidence 수집
→ Mandatory / Optional 분류
→ Request overhead 포함 budget 계산
→ Optional 제거
→ 필요하면 1회 compact
→ Reviewer 실행
→ PASS / RETRY / HUMAN
```

## 내가 활용할 수 있는 아이디어

1. **Session Close Skill**: 작업 완료 시 변경사항·미해결 항목·다음 행동을 `progress.md`/task ledger에 기록하고 작업 경계에서 `/clear`.
2. **Context Budget Check**: 고정 context + current history + tool schema + evidence 예상량을 계산해 overflow 전에 경고.
3. **Effort Router**: `search / mechanical / implementation / architecture / debugging`으로 분류해 effort 자동 추천.
4. **Quiet Command Wrapper**: build/test/p4 결과를 성공 시 한 줄, 실패 시 핵심 오류 주변만 반환.
5. **Backlog형 에이전트**: 각 backlog item을 fresh session으로 실행하고 결과/진행상태만 외부 저장소에 남김.
6. **Evidence Priority**: 사용자 지시/승인, `p4 opened`, 핵심 diff, failing test를 mandatory로 두고 오래된 build log를 optional로 분류.
7. **Per-model Cost Ledger**: Orchestrator/Worker/Reviewer/Compactor의 실제 사용 모델별 usage를 task ID와 함께 저장.
8. **Cache Regression Test**: normal/resume/auto-resume/compact 시나리오별 cache read와 uncached input을 자동 비교.

## 실무 SOP

```text
[세션 시작]
1. /context 확인
2. 무관한 MCP/지침 과다 로드 여부 확인
3. stable prefix와 dynamic tail 분리
4. 난이도에 맞춰 model/effort 결정

[작업 중]
5. 필요한 파일만 JIT 로드
6. 빌드·테스트·검색 출력 최소화
7. 큰 탐색은 subagent로 분리
8. reviewer 요청은 mandatory/optional evidence로 예산 편성
9. 동일 작업이 길어지면 /compact

[작업 완료]
10. 결정사항/진행상태를 VCS·durable ledger에 기록
11. task별 turn/model/token telemetry 기록
12. 다음 작업이 무관하면 /clear
```

## 2026-09-12 업데이트에서 얻은 운영 원칙

### 원칙 A — Context Budget은 마지막에 계산한다

파일·tool·review schema가 다 조립되기 전에 evidence만 따로 제한하면 최종 prompt가 여전히 overflow할 수 있다. **최종 request를 기준으로 admission control**해야 한다.

### 원칙 B — 줄일 대상에 우선순위를 둔다

무조건 앞에서부터 truncate하지 않는다. `mandatory > useful > optional` 등급을 두고 optional evidence부터 제거한다.

### 원칙 C — Multi-model 비용은 모델별로 귀속한다

한 turn 안에서 compaction은 저가 모델, review는 고성능 모델을 사용할 수 있다. session 총량만 보면 routing 최적화를 평가할 수 없다.

### 원칙 D — Cache benchmark에 실패/복구 경로를 포함한다

Prompt cache는 정상 루프뿐 아니라 interrupt/resume, output-limit auto-resume, cloud first request 같은 경계에서 깨질 수 있다.

## 참고 링크

- Anthropic Engineering — Effective context engineering for AI agents (2025-09-29)
- Anthropic Engineering — Effective harnesses for long-running agents (2025-11-26)
- Claude Code v2.1.269: https://github.com/anthropics/claude-code/releases/tag/v2.1.269
- Codex complete Guardian request budget commit: https://github.com/openai/codex/commit/fcd90d8f07ab558dc4a5d44ca85f9c6ae67d13e1
- Codex per-model turn token telemetry commit: https://github.com/openai/codex/commit/c8a8295e798af970ef5a2bcd9ce2229db87edb6b
- Headroom / RTK / token-optimizer 등 외부 압축 도구는 벤더 주장과 실제 워크로드 실측을 구분해 평가할 것.
