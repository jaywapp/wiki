---
title: AI Harness & Token Scout - 2026-09-12
category: news
tags:
  - ai
  - harness
  - agent
  - claude-code
  - codex
  - context-engineering
  - token-optimization
source: GitHub and official project sources
updated: 2026-09-12
---

# AI Harness & Token Scout - 2026-09-12

> 2026-09-11 리포트 이후 새롭게 확인된 Coding Harness·Context Engineering·Token Optimization 변화 중 실무 가치가 높은 것만 선별한 일일 리포트.

## 한줄 요약

오늘의 핵심은 세 가지다. **Claude Code는 cache correctness와 plugin eval을 강화했고, Codex main branch는 context를 단순 truncate하는 대신 최종 request budget을 먼저 편성하는 방향으로 이동했으며, Flow는 session memory를 source-cited structured knowledge로 승격하는 Brain 구조를 구체화했다.**

## 전일 리포트와 중복 제외

2026-09-11 리포트에서 이미 다룬 다음 항목은 반복하지 않았다.

- Strands Agents Context Manager
- Claude Code v2.1.268 stable-prefix/cache 변화
- Codex transcript/compaction 분리 이슈
- Token Optimizer MCP의 deny→retry 비용 실험
- base-harness
- 이전 Scout의 superharness, AOS Harness, repo-harness, Harness Kit, agent-harness-dev

## 1. Claude Code v2.1.269 — Cache correctness와 Harness Eval 강화

### 무엇이 새로워졌나

Claude Code v2.1.269는 2026-09-11 19:17 UTC에 공개되었다. 한국 시간으로는 2026-09-12 04:17경이다.

토큰/하네스 관점에서 중요한 변경은 다음과 같다.

- output-token limit 때문에 response가 자동 resume된 다음 turn에서 prompt cache 일부가 invalidated되던 문제 수정
- mid-thought interrupt 후 session resume 시 이전 context 재전송 형태가 바뀌어 cache reuse가 낮아지던 문제 수정
- cloud session 첫 request의 prompt-cache miss를 줄이기 위해 server configuration을 잠시 기다리도록 수정
- 매우 큰 Agent SDK prompt에서 auto-compaction할 완전한 이전 exchange가 없을 때 `Prompt is too long`에 영구 고착되던 문제 수정
- `claude plugin eval` 추가: plugin eval suite를 실행하고 scored JSON/HTML report 생성
- Bash가 파일을 수정한 경우 tool result에 changed-file diff를 포함할 수 있는 `bashEditDiffEnabled` 추가
- Workflow tool의 inference-bound fan-out용 `CLAUDE_CODE_WORKFLOW_MAX_CONCURRENT_AGENTS` 추가

### 내부적으로 의미하는 것

전일 리포트의 `stable prefix` 원칙을 한 단계 확장하면, cache benchmark는 정상적인 turn 연속 실행만 보면 안 된다.

```text
Normal turn ──────────────┐
Output limit → resume ────┤
Interrupt → resume ───────┤──> Cache Read / Uncached Input 비교
Compaction ───────────────┤
Cloud first request ──────┘
```

즉 Harness가 세션 복구나 자동 재개를 지원한다면 **recovery path 자체가 cache key/prefix 안정성을 깨뜨리지 않는지**도 비용 테스트에 포함해야 한다.

`claude plugin eval`은 Skill/Hook/Plugin 변경을 사람이 체감으로 평가하는 대신 reproducible eval로 검증할 수 있다는 점에서 중요하다. Token-saving Hook을 추가했을 때 단순히 입력 토큰이 줄었는지가 아니라 task score가 유지되는지 자동 비교하는 기반으로 사용할 수 있다.

### 토큰 절감 원리

직접적인 새 압축 알고리즘은 아니다. 대신 cache miss를 줄여 같은 prefix를 반복 계산/청구하는 비용을 낮추는 correctness 개선이다. 공개 release note에는 정량 절감률이 없다.

### Perforce + Claude/Codex Harness 적용

- `normal / resume / auto-resume / compact` 4개 시나리오를 Token Regression Test로 구성
- Hook/Skill 변경 시 `plugin eval`을 CI gate로 활용하는 PoC
- Bash diff와 유사하게 `p4 opened + p4 diff`를 evidence bundle로 자동 첨부
- Workflow fan-out 증가는 token 절약이 아니므로 동시성 확대 전 `cost / solved task`와 total turn 수를 함께 측정

**평가: 바로 적용**

## 2. Codex main branch — Request Budget Admission + Per-Model Turn Telemetry

### 무엇이 새로워졌나

현재 최신 공식 Codex release는 2026-09-09의 `rust-v0.154.0`이고, 아래 변경들은 그 이후 main branch commit이므로 아직 정식 release에 포함되었다고 볼 수 없다.

최근 Guardian/context 관련 구현은 다음 방향으로 움직였다.

- reviewer evidence를 선택하기 전에 history, tools, output format, reminder 등을 포함한 **최종 request overhead** 계산
- model input limit에서 256-token margin을 예약
- optional evidence는 생략할 수 있지만 required section이 들어가지 않으면 요청 자체를 reject
- budget 초과 시 summary compaction을 한 번 시도하고, 계속 초과하면 reviewer를 retire/defer
- user instruction·manual approval 등 중요한 증거를 가능한 완전한 형태로 유지
- action argument도 임의 truncate하지 않고 complete action을 budget 기준으로 처리
- incoming prompt를 pre-turn compaction 실패에도 history에서 잃지 않도록 보존

동시에 token telemetry는 session 총량이 아니라 각 response가 실제 사용한 resolved model을 기준으로 **turn 내부 모델별 token usage**를 누적하도록 변경되었다.

### 핵심 패턴: Admission Control

```text
Model Input Limit
      │
      ├─ System / Global Instructions
      ├─ Existing History
      ├─ Tool Schemas
      ├─ Output Format / Reminders
      ├─ Required Evidence
      ├─ Optional Evidence
      └─ Reserved Margin
              │
              ├─ fits → sample
              └─ overflow
                   ├─ optional 제거
                   ├─ summary compaction 1회
                   └─ reject / defer
```

이 접근의 핵심은 **overflow가 난 뒤 아무 텍스트나 잘라내는 것이 아니라, 요청을 보내기 전에 무엇을 반드시 보존할지 결정한다**는 것이다.

### Token/Cost 측정 관점

Multi-model Harness에서 한 task가 다음처럼 실행될 수 있다.

```text
Root Task
 ├─ Planner: Model A
 ├─ Worker: Model B
 ├─ Compactor: Model C
 └─ Reviewer: Model A
```

이 경우 session total만 보면 routing 효율을 평가하기 어렵다. 최소한 `task → root turn → child turn/model → token type` 계층으로 usage를 저장해야 한다.

추천 metric:

- cost / solved task
- tokens / solved task
- turns / solved task
- model별 input/cache/output
- compaction 비용과 이후 절감량
- reviewer optional-evidence 제거율과 retry율

### Perforce + Claude/Codex Harness 적용

Reviewer context를 아래처럼 우선순위화할 수 있다.

**Required**
- 사용자 요구사항/금지사항
- Pending CL 번호와 대상 workspace
- `p4 opened`
- 핵심 diff
- failing test와 직접 원인 evidence

**Optional**
- 오래된 full build log
- 이미 summary된 탐색 로그
- 중복 코드 조각
- 과거 성공 test의 verbose output

그리고 task/CL 단위 telemetry에 `root_turn_id`, child agent, runtime, model, token type을 기록하면 Claude와 Codex 중 어느 역할에 어떤 모델이 실제 효율적인지 측정할 수 있다.

**평가: 바로 적용할 설계 원칙 + PoC 가치 높음**

## 3. Flow — Session Memory를 Source-cited Project Brain으로 승격

Repository: https://github.com/samyakkkk/flow

### 무엇이 새로워졌나

Flow는 2026-09-11에 `Brain` 기능을 크게 전면화했다. 최근 병합된 PR #108은 기존 standalone memory가 conversation history와 중복되고 수정이 어렵다는 문제를 지적하며 다음 구조로 변경했다.

- structured Markdown Conversation Notes
- revisioned user instructions
- work logs / findings / continuation
- source citation/evidence required
- bounded linked retrieval chunks
- Auto-Docs / Auto-Skills를 같은 versioned document mechanism으로 관리
- 근거 없는 user attribution을 durable memory로 전파하지 않음

### 아키텍처

```text
Agent Sessions + Repository
            │
            ▼
         Flow Brain
   ┌────────┼─────────┐
   │        │         │
 Graph    Notes    Docs/Skills
   │        │         │
   └────────┴─────────┘
            │
    bounded/source-linked
        retrieval
            │
   Claude / Codex / Cursor / ...
```

현재 canonical Brain 구현은 `flow-t3/shared/`에 있고, local host는 FalkorDB와 embedding service를 관리하며 Brain별 graph와 SQLite store를 둔다.

### 토큰 절감 원리

공개 benchmark에서 실제 token 절감률은 확인되지 않았다. 따라서 수치 주장은 하지 않는다.

다만 context engineering 구조는 명확하다.

- transcript 전체 replay 대신 structured note retrieval
- linked retrieval 결과 수 제한
- 반복 knowledge를 docs/skills로 승격
- source/evidence를 유지해 오래된 잘못된 summary를 다시 탐색하는 비용 감소

반대로 indexing, embedding, curation 비용이 추가되므로 실제 효율은 반드시 측정해야 한다.

### Perforce 환경에서 가져올 아이디어

Flow 전체를 즉시 도입하기보다 다음을 PoC하는 편이 현실적이다.

```text
Task / Pending CL
   ├─ continuation
   ├─ revisioned instructions
   ├─ findings + evidence
   └─ work log
          │
          ├─ verified docs
          └─ promoted skills
          │
   bounded retrieval
          │
   Claude / Codex
```

Evidence는 Git commit 대신 `//depot/path#rev`, Pending CL, TeamCity Build ID, Test Result ID 등을 사용할 수 있다.

**평가: PoC 가치 높음 / 전체 제품 즉시 도입은 낮음**

## 오늘의 실무 결론

전일에는 `durable ledger + stable prefix + tool-output rewrite`가 핵심이었다면 오늘은 그 위에 세 가지를 추가할 가치가 있다.

```text
                Durable Task State
                       │
        ┌──────────────┼──────────────┐
        │              │              │
 Revisioned Notes   Evidence      Root Turn ID
        │              │              │
        └──────────┬───┘              │
                   ▼                  │
             Context Budget           │
      required / useful / optional    │
                   │                  │
                   ▼                  ▼
              Runtime Adapter → Turn×Model Telemetry
               Claude / Codex
                   │
                   ▼
          Cache/Quality Regression
```

추천 우선순위:

1. **바로 적용** — Reviewer context를 Required/Optional로 분류하고 최종 request 기준 budget admission 적용
2. **바로 적용** — Task/turn/model 단위 token-cost telemetry 설계
3. **바로 적용** — Claude resume/auto-resume/compact cache regression test 추가
4. **PoC** — Pending CL 기반 revisioned notes + evidence-required findings
5. **PoC** — 반복 검증된 project knowledge를 Skill/Doc로 승격

## 결론

오늘 새로 확인된 방향은 단순한 '더 많이 압축하기'가 아니다. **중요한 context를 먼저 정의하고, optional context만 선택적으로 버리며, 실제 비용을 task와 model 단위로 귀속하고, 세션에서 검증된 지식을 source-linked durable state로 승격하는 것**이 최신 Harness 설계의 공통 축으로 보인다.

## 참고 자료

- Claude Code v2.1.269: https://github.com/anthropics/claude-code/releases/tag/v2.1.269
- OpenAI Codex latest releases: https://github.com/openai/codex/releases
- Codex request budget commit #44281: https://github.com/openai/codex/commit/fcd90d8f07ab558dc4a5d44ca85f9c6ae67d13e1
- Codex per-model turn token telemetry #44656: https://github.com/openai/codex/commit/c8a8295e798af970ef5a2bcd9ce2229db87edb6b
- Flow: https://github.com/samyakkkk/flow
- Flow structured notes / Auto-Docs / Auto-Skills PR #108: https://github.com/samyakkkk/flow/pull/108
