---
title: AI Harness Token Scout - 2026-09-17
category: trend
tags:
  - ai
  - harness
  - context-engineering
  - token-optimization
  - codex
  - skills
  - tool-offloading
  - benchmark
  - mcp
  - durable-state
updated: 2026-09-17
---

# AI Harness Token Scout - 2026-09-17

> 오늘의 핵심은 **"무엇을 압축할까"보다 "무엇을 애초에 모델 Context에 넣지 않을까", 그리고 최적화가 실제 Provider 비용을 줄였는지 어떻게 실험할까** 쪽으로 이동하고 있다는 점이다. 특히 Token Optimizer MCP의 새 live A/B는 과거 자체 결론 일부를 뒤집었고, Codex는 환경별 Skill 제외와 cold rollout의 lossless background compression을 추가했다.

## 조사 범위와 중복 제외

`ai/trend/`의 2026-09-10~16 보고서를 기준점으로 확인했다. 이미 다룬 Strands Context Manager/preset, Codex budget admission·model-visible token accounting·bounded recap·cache affinity·delta reviewer·checkpoint compatibility, CCompactor, Docket, Flow, GSD Pi, GitHub Copilot output compression, HydraFusion, Deep Agents의 inline/fork/isolated topology 등은 반복하지 않았다.

Claude Code 공식 feed의 최신 stable은 여전히 `v2.1.273`이며, 전일 보고서 이후 확인된 public commit은 주로 UI diff surface 수정이라 Harness/Token 관점의 신규 핵심 항목으로 올리지 않았다. Strands Harness SDK의 같은 기간 변경도 cancellation/audio 계열이 중심이라 Context Manager 변화로 보지 않았다.

오늘은 실제 신규성 또는 기존 결론을 바꾸는 실험 결과가 있는 **5개 흐름**만 남겼다.

| 항목 | 신규성 | 핵심 | 평가 |
|---|---|---|---|
| Token Optimizer MCP PR #386 | 2026-09-16 merge | Provider-ledger live A/B로 history substitution 실패와 tool-definition deferral 효과를 재검증 | **바로 적용 / PoC** |
| Codex environment-scoped Skill omission | 2026-09-16 main | 환경별 disabled `SKILL.md`를 discovery 단계에서 model context에서 완전 제외 | **바로 적용** |
| Codex cold rollout compression | 2026-09-16 main | durable rollout을 inference와 분리해 lossless background storage compression | **PoC / 아이디어 참고** |
| Deep Agents 0.7.15 | 2026-09-16 release | offloaded tool-result pointer 충돌 수정 + subagent private-state propagation | **바로 적용** |
| HarnessMark 1.0.0 | 2026-09-15 신규 | 모델 고정 후 harness의 lift/cost/topology/long-horizon 효과만 비교하는 benchmark | **PoC / 방법론 바로 적용** |
| OpenHands Agent Profile scoping | 2026-09-16 release/main | Agent별 MCP·secret allow-list로 capability surface를 줄이는 profile contract | **바로 적용 / PoC** |

---

## 1. Token Optimizer MCP — 실제 Provider 비용으로 다시 재보니 결론이 바뀌었다

Repository: https://github.com/ooples/token-optimizer-mcp  
PR: https://github.com/ooples/token-optimizer-mcp/pull/386

### 무엇이 새로웠나

9월 16일 병합된 PR #386은 단순 기능 업데이트보다 **측정 방법 자체를 교정한 대규모 실험 업데이트**다. 기존 Scout에서 이 프로젝트는 `deny → retry`보다 same-turn rewrite가 싸다는 실험을 다뤘는데, 이번에는 더 깊게 들어가 **offline byte/token proxy가 실제 Provider 비용을 잘못 설명할 수 있음을 직접 확인**했다.

가장 중요한 교정은 history substitution 실험이다. Claude Code local transcript의 `thinking` field는 실제 reasoning text가 아니라 빈 문자열과 signature 중심으로 저장되는 경우가 있어, 과거 evidence-survival 테스트가 실질 reasoning 삭제를 검증하지 못했다. 프로젝트가 실제 세션을 세어 본 결과 710개의 thinking block에서 reasoning text는 0 bytes였고 signature는 약 1.7 MB였다. 기존 substitution이 제거했다고 계산한 reasoning은 전체 signature 대비 약 0.04% 수준이어서, 과거의 "needle loss 0" 결과는 사실상 **검증 대상이 없는 vacuous benchmark**였다고 스스로 철회했다.

그래서 proxy가 실제 request body를 선택적으로 capture하도록 만들고, 압축 판단 전 원본 요청을 저장하도록 변경했다. capture는 기본 off이며 반드시 저장 directory를 지정해야 하고, startup 때 저장 경로와 중단 방법을 명시한다. benchmark도 다음처럼 바뀌었다.

```text
Agent
  ↓
real proxy
  ├─ original request capture
  ├─ optimization arm
  └─ provider request
          ↓
Provider usage ledger
          ↓
Build/Test oracle로 correctness 검증
```

### 핵심 실험 1 — Tool definition deferral은 실제로 크게 이겼다

동일 task를 실제 agent/API를 통해 비교한 weighted input 기준:

```text
weighted_input = input
               + 1.25 * cache_creation
               + 0.1  * cache_read
```

- deferral ON: **124,372**
- deferral OFF: **253,799**
- 차이: 약 **-51%**

반면 history substitution은:

- proxy default: **136,047**
- substitution 추가: **139,762**
- 약 **+2.7% 악화**
- 실행시간 약 **24% 증가**
- output token 약 **36% 증가**

프로젝트는 output 증가를 모델이 삭제된 정보를 다시 추론/재구성한 신호로 해석한다. 즉 **"History를 더 세게 압축하면 무조건 이득"이라는 가설은 이 실험에서는 실패**했다.

### 핵심 실험 2 — 작은 Tool까지 모두 defer하는 쪽이 더 쌌다

기존에는 1,500 characters 미만 Tool definition은 discovery round-trip을 피하기 위해 항상 prompt에 남겼다. 하지만 실제 capture에서는 115개 Tool 중 88개가 이 예외에 걸려 약 55 KB가 cached prefix에 남았다.

4-arm live 비교:

| Arm | weighted input | Quality | Control 대비 |
|---|---:|---:|---:|
| Control (null proxy) | 134,706 | 4/4 PASS | 기준 |
| Deferral floor 1500 | 100,818 | 4/4 PASS | **-25%** |
| Deferral floor 0 | 49,053 | 4/4 PASS | **-64%** |
| HeadRoom shipped proxy | 48,626 | 4/4 PASS | **-64%** |

예상했던 "숨긴 Tool을 찾느라 discovery turn이 증가"하는 현상은 이 표본에서는 나타나지 않았고, floor=0 arm이 오히려 가장 빨랐으며 output token도 가장 적었다.

### 실험 설계에서 더 중요한 교정 — A/B 순서가 Prompt Cache를 오염시켰다

초기 benchmark는 arm을 항상 같은 순서로 돌렸다. Provider prompt cache는 앞선 arm이 만든 prefix cache를 뒤 arm이 읽을 수 있기 때문에, 항상 마지막에 실행된 competitor가 자신이 생성하지 않은 cache benefit을 얻었다. 실제로 한 arm은 1,192 tokens만 cache-create했는데 37,655 cached tokens를 읽은 사례가 있었다.

수정 후에는:

- N회 반복에서 각 arm이 각 position을 동일 횟수 차지하도록 **rotation**
- Control도 proxy 없이 돌리지 않고 **동일 proxy의 null mode**를 통과
- failed request의 비용도 unknown charge로 보존
- correctness는 agent self-report가 아니라 실제 test 재실행으로 판단

이건 내부 Harness benchmark에 거의 그대로 가져올 수 있다.

### 더 큰 live campaign 결과

PR이 보존한 frozen 120-pair / 12-family 비교에서는 119개의 fully measured pair 기준으로 자체 proxy가 competitor 대비:

- estimated cost **26.9% 낮음**
- wall time **30.1% 빠름**
- quality: 자체 119/120, competitor 120/120

하지만 cost-only loss, speed-only loss, 둘 다 진 pair도 그대로 공개한다. 별도 Responses 구현 8-pair는 16/16 PASS, cost **41.3% 낮음**이지만 speed는 **4.2% 느림**이었다. Tool-description whitespace experiment는 **36.6% 비용 증가**로 default 채택이 거부됐다.

즉 이 프로젝트의 새 결론은 "압축은 좋다"가 아니라 훨씬 좁다.

> **Tool/Capability를 필요 전까지 Context에서 빼는 deferral은 강한 후보지만, reasoning/history substitution은 실제 Provider ledger로 검증하기 전에는 이득이라고 보면 안 된다.**

### Perforce + Claude Code + Codex 적용

**바로 적용**

- Tool/Skill catalog를 항상 전부 prompt에 넣지 말고 `task → capability shortlist → deferred discovery` 구조로 전환
- A/B benchmark arm 순서를 rotation하여 prompt-cache 위치 효과 상쇄
- 모든 arm을 동일 transport/proxy path로 통과시켜 측정 조건 통일
- 비용은 `input/cache-create/cache-read/output`을 분리하고 실제 provider receipt/ledger를 우선
- correctness는 `p4 diff` + build/test 결과로 판정하고 agent의 "완료" 문장을 metric으로 사용하지 않음

**PoC**

```text
Task
 ↓
Capability Router
 ↓
Minimal Tool/Skill Set
 ↓
Claude / Codex
 ↓ need more capability
Deferred discovery
```

처음에는 전체 MCP Tool을 숨기지 말고, 사용 빈도가 낮은 사내 Tool/Skill부터 10~20개 단위로 deferred set을 만들어 `cost / solved task`, extra discovery turns, cache-read, task score를 비교하는 것이 안전하다.

**평가: 🟢 benchmark 방법론·Tool deferral은 바로 적용 / 🟡 proxy compression·dedup은 PoC**

---

## 2. Codex — Skill 경량화가 "요약"이 아니라 환경별 완전 제외로 이동

Commit: https://github.com/openai/codex/commit/fc2ea82e7eff22c618a56db29c68a6b1967cba7d

### 무엇이 새로웠나

Codex `main`은 9월 16일 `ExecutorSkillProvider::with_disabled_skill_paths`를 추가했다. 발견된 Skill을 모두 활성화하던 기존 방식에서, **environment ID별로 특정 `SKILL.md`를 disabled로 지정하고 두 discovery route 모두에서 catalog entry 자체를 비활성화**한다.

중요한 점은 disabled skill을 짧게 요약해서 넣는 것이 아니라 **모델 Context에서 완전히 빼는 것**이다. 공식 scenario test도 실제 model-visible request snapshot에서 active skill은 존재하고 disabled skill 이름은 존재하지 않음을 확인한다.

```text
All discovered skills
      │
      ▼
Environment Skill Policy
  env=A: disable X,Y
  env=B: disable Z
      │
      ▼
Active catalog only
      │
      ▼
Model Context
```

### 토큰 절감 원리

Skill이 많아질수록 이름/description/instruction locator/index metadata만으로도 stable prefix가 커진다. 이번 방식은 Skill body를 압축하는 것이 아니라 **irrelevant capability의 catalog footprint를 0으로 만든다.**

정량 절감률은 공개되지 않았지만, 비용은 대략 다음에 비례한다.

```text
saved context ≈ Σ(disabled skill의 model-visible catalog + instruction payload)
```

Prompt cache가 있다면 매 turn uncached input만 보는 것이 아니라, cache creation/read 비용에도 영향을 줄 수 있다.

### Perforce Harness 적용

현재 프로젝트별/agent별 Skill set을 명시적으로 만들 수 있다.

```text
SkillPolicy
  workspace_id
  runtime        = claude | codex
  role           = analysis | work | review | release
  allow[]
  deny[]
  policy_hash
```

예:

- `Analysis`: architecture/search/read 관련 Skill만
- `Work`: C#/WPF/UE/Perforce/build Skill
- `Review`: diff/test/evidence/security 관련 Skill만
- `Release`: TeamCity/deploy/submit 관련 Skill만

특히 project1 작업에서 project2/3 전용 Skill까지 전역 index에 남기는 구조는 피하는 것이 좋다.

### 장단점

장점은 context와 capability surface를 동시에 줄이고, 환경 간 accidental leakage를 막는다는 점이다. 단점은 잘못된 deny policy가 필요한 Skill discovery 자체를 차단할 수 있다는 것이다. 따라서 Skill이 없어서 task가 막혔을 때 **explicit capability escalation path**가 필요하다.

**평가: 🟢 바로 적용**

---

## 3. Codex — Context Compaction과 Durable Rollout Compression은 별도 문제다

Commit: https://github.com/openai/codex/commit/0d083092b465a6eefdacadfdade55af8c266adbb

### 무엇이 새로웠나

Codex app-server에 experimental `rollout/compress` endpoint가 추가됐다. 이건 LLM context를 summarize하는 기능이 아니라 **cold local rollout 파일을 background에서 lossless하게 압축하는 durable-state maintenance API**다.

특징:

- parameter 없음
- 호출 즉시 `{}` 반환 — "완료"가 아니라 **스케줄됨**만 의미
- existing worker lock / writer lock / concurrency limit / cooldown 유지
- `local_thread_store_compression` startup flag가 꺼져 있어도 explicit trigger 가능
- local thread store만 지원
- experimental API capability 필요
- integration test에서 compressed rollout을 다시 읽었을 때 **lossless readback** 검증
- 같은 Codex home을 공유하는 client는 compressed rollout format을 이해해야 함

```text
Hot Session / Working Context
          │
          └──── inference path

Cold Durable Rollout
          │
          └─ background compression
               │
               └─ lossless readback
```

### 왜 Harness 관점에서 중요한가

최근 Trend에서는 `context compaction`과 `append-only durable ledger`를 분리해야 한다고 계속 봤다. 이번 구현은 그 구분을 실제 제품 계층에서도 보여준다.

- **Context compaction**: 모델이 볼 working set을 줄임. 정보 손실/summary compatibility가 문제.
- **Rollout compression**: durable history의 storage representation을 줄임. lossless decoding과 format compatibility가 문제.

두 기능을 같은 `compact()`로 구현하면 사고하기 쉽다.

### Perforce Harness 적용

`.ai/ledger/` 또는 DB event payload를 오래된 task 단위로 archive할 때:

```text
Active task
  raw event ledger
  ↓ task cold / closed
background archival
  zstd/blob pack
  ↓
immutable compressed segment
  + index
  + schema_version
  + content hash
```

모델에게 제공할 Context projection은 이 storage compression과 독립적으로 다시 생성한다.

### Trade-off

Token 절감은 직접 발생하지 않는다. 대신 장기 durable history를 보존하면서 disk/IO cost를 줄이고, 원본 삭제 없이 장기간 task ledger를 유지할 수 있다. 반대로 여러 runtime/버전이 같은 state root를 공유하면 format compatibility 문제가 생긴다.

**평가: 🟡 Durable Ledger가 커진 뒤 PoC / 지금은 설계 참고**

---

## 4. Deep Agents 0.7.15 — Progressive Disclosure는 Pointer 무결성이 깨지면 더 위험하다

Release: https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.15  
PR #6316: https://github.com/langchain-ai/deepagents/pull/6316  
PR #5553: https://github.com/langchain-ai/deepagents/pull/5553

### 무엇이 새로웠나

Deep Agents `0.7.15`는 큰 기능보다 Context isolation/offload correctness에 중요한 두 수정이 들어갔다.

#### A. ID 없는 Tool output offload가 서로 덮어쓰던 문제

대형 Tool result를 Context 밖 파일로 offload하는 proactive path에서 `tool_call_id`가 없으면 모든 결과가 `/large_tool_results/unknown`에 저장됐다. 두 번째 offload가 첫 번째 파일을 overwrite하고, 두 Tool notice가 같은 path를 가리키면서 Agent가 나중에 **다른 Tool의 결과를 읽을 수 있었다.**

이 현상은 provider/proxy가 SSE opener chunk를 누락하여 tool-call id가 비는 경우 실제 발생 가능하다. 수정 후 fallback은 `unknown-<8-hex>` 형태의 unique path를 사용하고 sync/async 모두 regression test한다.

```text
잘못된 방식
Tool A ─┐
        ├─ /offload/unknown  ← overwrite
Tool B ─┘

수정
Tool A → /offload/unknown-a1b2c3d4
Tool B → /offload/unknown-e5f6a7b8
```

### 토큰 절감과의 관계

Progressive disclosure는 "큰 결과를 파일로 빼고 pointer만 context에 둔다"는 패턴인데, pointer가 잘못되면 절감은 유지되더라도 **품질이 조용히 망가진다.** 즉 offload store는 단순 cache가 아니라 evidence store로 취급해야 한다.

#### B. Custom SubAgentMiddleware에 private state key propagation

별도 수정은 제공된 SubAgentMiddleware를 override할 때 `PrivateStateAttr`로 표시된 private state key를 final middleware stack에 전달하도록 고쳤다. Subagent isolation을 사용할 때 **무엇을 숨길지뿐 아니라, 허용된 private state contract가 adapter 교체 후에도 유지되는지**가 중요하다는 사례다.

### Perforce Harness 적용

모든 offloaded artifact는 human-readable filename 하나에 의존하지 말고 다음 identity를 가지는 것이 좋다.

```text
ArtifactRef
  task_id
  step_id
  tool_call_id?       # optional
  kind
  content_hash        # authoritative
  storage_key         # unique
  created_at
  source_revision
```

Tool call id가 비어도 `step_id + content_hash + nonce`로 unique key를 만들고, retrieval 시 hash를 다시 검증한다.

예:

- UE build full log
- TeamCity raw log
- `p4 describe` full payload
- large test JSON
- generated analysis artifact

이렇게 하면 L0 Context에는 요약과 pointer만 두면서도 잘못된 artifact를 읽는 silent failure를 줄일 수 있다.

**평가: 🟢 바로 적용**

---

## 5. HarnessMark — 모델 Benchmark가 아니라 Harness 자체의 Lift를 재려는 신규 Benchmark

Repository: https://github.com/aliacollins/harnessmark

### 무엇이 새로웠나

`HarnessMark`는 2026-09-15 생성된 매우 신생 benchmark로, SWE-bench처럼 "이 모델이 bug를 고치나"보다 **같은 모델을 두고 harness만 바꿨을 때 얼마나 좋아지거나 비싸지는가**를 재려 한다.

Reference harness는 의도적으로 작다.

```text
one model loop
+ bash
+ edit
- planning
- subagent
- index
```

실제 harness와 이 reference를 같은 model string, 같은 task, 같은 sandbox, 같은 grader에서 paired 비교한다.

### 핵심 Metric

- **lift**: 동일 모델/동일 task에서 harness와 reference의 paired resolve-rate delta
- **cost per resolve**: total spend / resolved task
- **topology**: tool calls, delegation ratio, retries, re-read ratio, result bytes, context growth per turn
- **long-horizon chains**: 연속 commit을 한 session으로 처리하고 step-1 대비 이후 step 비용 변화를 측정
- **cold/warm state**: local index/code graph 같은 persisted state가 후속 task 비용을 실제 줄이는지 측정

이 metric 구성은 내부 Harness 실험과 매우 잘 맞는다.

### Oracle-based grading

Agent가 "완료"라고 말하는 것은 점수가 아니다. Candidate patch는 runner가 `git diff`로 수집하고, upstream fix commit의 test를 주입해서 fail-to-pass/pass-to-pass를 확인한다. Agent가 test를 수정해 score를 속이지 못하도록 oracle test/support 파일을 복구한 뒤 평가한다.

Perforce에서는 다음처럼 치환할 수 있다.

```text
candidate = p4 diff -du / opened files
oracle    = deterministic test/build suite
resolved  = patch exists
         && required tests pass
         && regression tests pass
```

### 아주 중요한 Benchmark 오염 사례

HarnessMark는 초기 prompt에 PR 번호가 남아 있어 Agent가 공개 GitHub에서 답을 찾아온 문제를 발견했다.

- Claude Code Sonnet 5: **96/250 trials**에서 `gh pr view` 등 upstream answer path 사용
- reference: 21/50
- pi: 27/50
- 해당 trial들은 모두 해결됨
- Claude Code resolve rate는 answer lookup을 제외하면 **87.2% → 79.2%**로 하락

그래서 v1/v2 수치는 모두 철회하고, v3부터 PR/issue/link/SHA를 prompt에서 redaction하고 transcript audit로 upstream lookup을 fatal failure로 처리한다.

이건 사내 Harness 평가에서도 매우 중요하다. Agent가 이전 solution artifact, 제출된 CL, 생성 답안, 다른 workspace의 결과를 볼 수 있다면 **Harness 성능이 아니라 leakage를 측정할 수 있다.**

### 현재 Benchmark 성숙도

아직 매우 초기다. 현재 v1.0.0 leaderboard의 비교 가능한 run은 Claude Code + Sonnet 5, Hono 50 task × 5 trial 한 그룹뿐이다. 246 scored trial에서 resolve rate는 **71.1%**, Wilson 95% CI **[65.2%, 76.4%]**다. 그러나 같은 모델의 reference run이 없어서 headline `lift`는 아직 계산할 수 없다.

따라서 결과 leaderboard 자체보다 **측정 설계**가 더 가치 있다.

### 내부 Harness PoC 제안

```text
Baseline
Claude Code + minimal tools
           │
           ├──────── Same Task Set ────────┐
           │                               │
           ▼                               ▼
Current Harness                       New Harness
skills/hooks/context                new router/cache
           │                               │
           └──────── deterministic oracle ─┘
```

기본 KPI:

- solve rate + confidence interval
- cost / solved task
- input/output/cache-read/cache-create / solve
- turns / solve
- re-read ratio
- tool-result bytes
- context growth ratio
- reviewer retry rate
- warm-state step-2+ / step-1 cost ratio

**평가: 🟡 도구 자체는 초기라 PoC / 🟢 benchmark 방법론은 바로 적용**

---

## 6. OpenHands — Agent Profile을 Capability Firewall로 사용

Release: https://github.com/OpenHands/OpenHands/releases/tag/v1.19.0  
MCP scope PR: https://github.com/OpenHands/OpenHands/pull/17289  
Secret scope PR: https://github.com/OpenHands/OpenHands/pull/17237

### 무엇이 새로웠나

OpenHands `v1.19.0`은 Agent Profile이 접근할 MCP server를 직접 좁힐 수 있도록 `mcp_server_refs`를 노출했다. 이전에는 profile이 모든 user-configured MCP server를 보게 되어, "코드 탐색만 하고 수정 권한은 없는 Agent"를 만들기 어려웠다.

`mcp_server_refs`는 tri-state다.

```text
null       = 모든 configured MCP server
[github]   = 선택한 server만
[]         = user MCP server 없음
```

9월 16일 main에는 `secret_refs` 선택 UI도 병합됐다. Agent Server가 실제 enforcement를 담당하고 Canvas는 profile identity와 allow-list를 보존한다.

### Context/Token 절감 관점

이 변화의 주목점은 보안만이 아니다. Agent가 볼 수 있는 MCP server가 줄면 **Tool schema/capability catalog도 함께 줄일 수 있는 구조**가 된다. Codex의 environment-scoped Skill omission과 같은 방향이다.

```text
Agent Profile
 ├─ MCP allow-list
 ├─ Skill allow/deny
 ├─ Secret allow-list
 ├─ Depot path allow-list
 └─ Runtime permission profile
          ↓
    Materialized Capability Set
          ↓
       Model Context
```

### 주의할 점 — fail-open

OpenHands PR 자체가 중요한 caveat를 기록한다. dangling MCP ref가 발생했을 때 cloud 쪽 broad catch가 profile resolution failure를 `None`으로 바꾸어 **unscoped composed settings로 fallback하는 fail-open 경로**가 존재한다. 또한 platform-owned MCP server는 user MCP allow-list 밖이라 `[]`이 literal "MCP 없음"을 뜻하지 않을 수 있다.

내부 Harness는 반대로 설계하는 편이 안전하다.

```text
unknown capability ref
policy materialization failure
          ↓
      FAIL CLOSED
          ↓
human/config repair
```

### Perforce Harness 적용

역할별 capability profile을 task 시작 전에 materialize한다.

- Analysis Agent: read/search + architecture docs, write/submission 없음
- Worker: 해당 workspace의 p4 edit/revert/build/test만
- Reviewer: p4 diff/describe/test evidence read-only
- Release Agent: approved CL + TeamCity/deploy/submit capability

그리고 materialized profile hash를 task ledger와 evidence에 남겨 "이 Agent가 어떤 Tool/Secret/Depot 범위에서 행동했는가"를 나중에 재현 가능하게 한다.

**평가: 🟢 capability profile/fail-closed 원칙은 바로 적용 / 🟡 runtime adapter 구현은 PoC**

---

## 오늘의 통합 결론

오늘 조사에서 가장 강하게 반복된 패턴은 **Selective Context보다 한 단계 앞의 Selective Capability**다.

```text
Task Contract
     │
Capability Profile
 ├─ Skills
 ├─ MCP
 ├─ Secrets
 └─ Depot scope
     │
     ▼
Deferred / Active Catalog
     │
     ▼
Model-visible Context
     │
     ▼
Claude / Codex
     │
Large Tool Result
     │
     ├─ compact summary
     └─ unique content-addressed pointer
     │
     ▼
Evidence / Durable Ledger
     │
 cold task
     ▼
lossless storage compression
```

그리고 이 구조가 실제 이득인지 판단하는 방법도 더 명확해졌다.

```text
Same model
Same task set
Same transport
Rotated A/B order
Deterministic build/test oracle
Provider usage ledger
        ↓
 cost / solved task
 + quality / context growth / reread / retries
```

### 내부 Harness 우선순위

1. **바로 적용 — Role/Workspace별 Skill·MCP Capability Profile**
   - 불필요한 Skill/MCP metadata를 model context에 넣지 않는다.
2. **바로 적용 — Benchmark hygiene**
   - arm rotation, 동일 proxy path, provider usage 분리, deterministic oracle.
3. **바로 적용 — Offload ArtifactRef 무결성**
   - generic `unknown` path 금지, content hash + step identity 사용.
4. **PoC — Tool definition deferral**
   - low-frequency Tool부터 context에서 제거하고 discovery cost와 총 비용을 비교.
5. **PoC — HarnessMark식 baseline/lift 측정**
   - same-model minimal harness를 zero point로 둔다.
6. **후순위 — Cold durable rollout compression**
   - ledger가 실제로 커진 뒤 storage optimization으로 도입.

## 오늘의 한 문장

> **가장 싼 Context는 잘 압축한 Context가 아니라 처음부터 불필요한 Capability를 넣지 않은 Context이며, 그 효과는 offline byte count가 아니라 같은 모델·같은 task·같은 transport에서 Provider usage와 deterministic quality를 함께 봐야 한다.**

## 참고 자료

- Token Optimizer MCP PR #386: https://github.com/ooples/token-optimizer-mcp/pull/386
- Codex environment-scoped Skill omission: https://github.com/openai/codex/commit/fc2ea82e7eff22c618a56db29c68a6b1967cba7d
- Codex rollout compression: https://github.com/openai/codex/commit/0d083092b465a6eefdacadfdade55af8c266adbb
- Deep Agents 0.7.15: https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.15
- Deep Agents offload fix #6316: https://github.com/langchain-ai/deepagents/pull/6316
- Deep Agents subagent state fix #5553: https://github.com/langchain-ai/deepagents/pull/5553
- HarnessMark: https://github.com/aliacollins/harnessmark
- HarnessMark methodology: https://github.com/aliacollins/harnessmark/blob/main/docs/METHODOLOGY.md
- OpenHands v1.19.0: https://github.com/OpenHands/OpenHands/releases/tag/v1.19.0
- OpenHands MCP profile scoping: https://github.com/OpenHands/OpenHands/pull/17289
- OpenHands secret profile scoping: https://github.com/OpenHands/OpenHands/pull/17237
