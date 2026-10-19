---
title: "AI Harness · Context/Token Optimization Scout — 2026-09-28"
date: 2026-09-28
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, claude-code, codex, deep-agents, perforce]
---

# 2026-09-28 AI Harness · Context/Token Optimization Scout

## 요약

`jaywapp/wiki` develop의 `ai/trend/`를 확인했다. canonical 일일 보고서는 2026-09-24까지 존재하고 9월 25~27일 파일은 없지만, 해당 자동화 실행에서 이미 조사한 RRSI, Tool Schema Budget, catalog-first MCP startup, deferred mailbox, Harness-R1, Ecdysis, JIT-Agent, OpenMemory, Claude Code 2.1.283, Persistent Billable State, Repowise, cache-aware routing 등은 중복을 피하기 위해 제외했다.

Claude Code CHANGELOG는 조사 시점에도 2.1.283이 최신이어서 전일 내용을 반복하지 않았다. 오늘은 새 구현 변화 3건과 최근 공개된 실측 연구 2건이 특히 유의미했다.

| 항목 | 신규성 / 핵심 변화 | 평가 |
|---|---|---|
| Deep Agents/Talon `/context-doctor` | 모델 호출 없이 prompt·memory·skill·tool/MCP·conversation별 context 비용을 read-only 진단 | **바로 적용** |
| Open-SWE shared MCP catalog cache | prod run 43%가 MCP discovery cache miss, p90 3.1s/max 31s → cross-worker shared stale-while-revalidate cache | **바로 적용 / PoC** |
| Codex Guardian independent transcript | parent compaction/resume/rollback과 독립된 bounded reviewer transcript + rollback provenance | **바로 적용** |
| CliffCompaction | LLM summary 없이 tool-heavy history를 기계적으로 제거, 최대 50% cost 절감·긴 세션 품질 유지 | **PoC 1순위** |
| Growing Harness | 반복 control을 prompt/context가 아니라 executable harness code로 승격, LLM calls 76.0~91.8% 감소 | **PoC 가치 매우 높음** |

## 1. Deep Agents/Talon — `/context-doctor`

Deep Agents main의 commit `60c0228`은 Talon에 `/context-doctor`를 추가했다. 현재 thread의 active checkpoint와 configured sources를 읽어 system prompt, memory, skills, tool schema(MCP 포함), effective conversation의 추정 token 비용을 분리해 보여주며 provider가 보고한 마지막 input-token metadata도 함께 사용할 수 있다.

진단 자체가 Agent를 호출하지 않고 checkpoint를 변경하지 않으며 실행 중인 turn도 중단하지 않는다. source content/path 대신 aggregate count만 노출하고 message inspection도 bounded하게 처리한다. 프로젝트는 관련 context/host/runtime/Discord 경계에 대해 208개의 focused test를 통과시켰다고 명시한다.

### 내부 동작 / 절감 원리

전체 input token만 보면 Skill, MCP schema, memory, conversation 중 무엇이 비대한지 구분하기 어렵다. 이 패턴은 model-visible context를 source별로 계측해 최적화 대상을 찾는 observability layer다. 측정 자체에 모델 호출이 없으므로 진단 inference 비용도 없다.

### Perforce · Claude Code · Codex 적용

```text
ContextCostSnapshot
  system_instructions
  workspace_instructions
  memory
  skill_catalog
  skill_loaded_body
  tool_schema
  mcp_server_instructions
  evidence_projection
  conversation_effective
  provider_reported_input
  cache_read / cache_create
```

`CLAUDE.md/AGENTS.md`, Perforce/UE Skill, TeamCity MCP schema, build evidence, reviewer history를 별도 bucket으로 나누고 bucket별 estimated token과 provider actual input을 함께 기록한다.

장점은 model-free/read-only라는 점이고, middleware/provider 내부 overhead는 추정에서 빠질 수 있으므로 billing truth로 쓰면 안 된다.

**평가: 바로 적용.**

Source: https://github.com/langchain-ai/deepagents/commit/60c0228aad14d042080743ead04e135994d3fa75

## 2. Open-SWE — MCP Tool Catalog를 cross-worker shared cache로

Open-SWE commit `89ff499`는 production Agent startup telemetry에서 43%의 run이 MCP tool-discovery cache miss를 겪고 있었고 third-party MCP discovery 때문에 graph factory가 막히는 시간이 p90 3.1초, 최대 31초였다고 공개했다.

기존 per-process cache는 새 worker가 뜨거나 thread가 다른 worker에 배치될 때 다시 discovery를 했다. 변경 후에는 source namespace/connection/revision에 묶인 shared catalog cache를 사용하고, revision이 동일하면 만료된 catalog도 우선 제공한 뒤 background refresh한다. 새 revision을 오래된 refresh가 덮어쓰지 못하도록 generation ordering도 둔다. hit/stale/miss와 discovery phase를 run telemetry에 남긴다.

### 절감 원리

```text
Run startup
  ↓
Shared Catalog Cache
  ├─ HIT → 즉시 schema 사용
  ├─ STALE + same revision → stale 제공 + background refresh
  └─ MISS → live discovery
```

이전 Scout의 Codex catalog-first startup이 cached declaration을 live connection보다 먼저 쓸 수 있다는 설계였다면, 이번 변화는 production miss rate와 cross-worker 공유의 효과를 실제 운영 수치로 보여준다. 공개 token 절감률은 없지만 반복 discovery와 catalog materialization, prompt-prefix churn을 줄일 수 있다.

### Perforce 적용

`CapabilityCatalogCacheKey`에 project/workspace identity, runtime/connector identity, catalog revision, permission/policy generation, role, model-visible schema budget을 포함한다. Perforce Adapter나 TeamCity MCP reconnect만으로는 catalog를 버리지 않고 behavior/revision이 바뀔 때만 invalidate한다. catalog-ready와 execution-ready는 분리한다.

**평가: shared cache 원칙은 바로 적용, stale-while-revalidate 실행은 PoC.**

Source: https://github.com/langchain-ai/open-swe/commit/89ff499efa11be6bcaf62fe9763b26805f2171b4

## 3. Codex Guardian — Parent Compaction과 독립된 Reviewer Transcript

Codex commit `#48779`는 `guardian_reuse_parent_compaction`을 끈 모드에서 Guardian reviewer가 bounded independent transcript를 유지하도록 보강했다. Sync review와 async scoring이 parent checkpoint에 종속되지 않고 parent가 local/remote compaction을 해도 reviewer는 자기 transcript delta로 계속 진행한다.

reviewer transcript에는 rollback provenance를 지속시키고 compaction output과 synthetic summary는 evidence/rollback boundary에서 제외한다. rollback 시 persistence order가 아니라 acceptance ordering으로 취소된 evidence를 제거한다. 테스트는 compaction, resume, rollback, checkpoint serialization compatibility까지 포함한다.

### 신규성 / 절감 원리

9월 23일 Scout에서는 Guardian thread-owned context와 parent checkpoint payload validation을 다뤘다. 이번 신규점은 parent checkpoint를 재사용하지 않는 격리 모드에서도 reviewer evidence가 compaction/resume/rollback을 견디는 독립 durable transcript가 됐다는 점이다.

Reviewer가 Worker 전체 history나 compaction summary를 반복 replay할 필요가 없고, review evidence만 bounded하게 유지한 뒤 delta만 추가할 수 있다.

### Perforce 적용

```text
Worker Ledger
  edits / build / tool chatter
       ├─ parent compaction
       └─ verified evidence refs
                    ↓
Reviewer Transcript
  task contract
  diff/evidence generation
  authorization provenance
  accepted evidence sequence
  rollback boundary
```

Claude Worker session이 compact돼도 Codex Reviewer의 Pending CL evidence identity는 유지한다. Worker rollback/revert가 발생하면 해당 generation 이후 review evidence만 무효화한다.

**평가: 바로 적용. Reviewer-owned durable evidence view 권장.**

Source: https://github.com/openai/codex/commit/21eb35513df478a2a090bfc2c0293caaf435b36d

## 4. CliffCompaction — LLM Summary 없이 Tool History를 Cliff에서만 제거

2026-09-22 공개된 CliffCompaction은 Claude Code, Codex 등 기존 Harness 앞에 놓을 수 있는 API proxy 형태의 deterministic compactor다. 핵심은 rephrase/summarize하지 않고 drop/truncate만 한다는 것이다.

논문은 long-horizon coding에서 최대 50% cost 절감을 보고하고 Terminal-Bench에서 bounded context를 쓰면서 성능을 유지하거나 개선했다고 보고한다. Claude Code + GLM 5.3 Flash의 matched 약 45K peak context에서는 native auto-compaction 70.97% 대비 CliffCompaction 76.69%였다. 같은 45K 조건의 task cost는 native 약 $0.14, Cliff 약 $0.16으로 항상 가장 싼 것은 아니며 품질/비용 trade-off가 있다.

uncompacted trajectory 분석에서는 Tool result 56% + Tool call 28% = 84%가 Tool traffic이었다. 그래서 오래된 대형 Tool result를 주요 제거 대상으로 삼는다.

### 내부 동작

- system/task head와 최근 `keep_recent` turn은 유지
- Tool result는 500 chars 이하만 보존, 큰 결과는 제거
- Tool call은 name + 핵심 argument signature로 축약
- 이전 compacted output을 다시 compact하지 않고 버린 뒤 original/live prefix 기준으로 새 compacted form 생성
- parse/store/prefix match 실패 시 fail-open passthrough
- `--shadow`로 실제 request 변경 없이 사전 측정 가능

이 방식은 summary-of-summary drift를 피하고 compaction 사이 원 prefix를 유지해 cache locality를 높인다.

### Perforce · Claude Code · Codex PoC

보존 대상은 user constraint/approval, Pending CL/depot scope, root build/test error, reviewer verdict, irreversible evidence다. 축약 후보는 반복 file read body, 오래된 `p4 describe` raw body, 성공 build log, grep/search bulk output, 이미 Evidence Store에 있는 Tool result다.

원문은 Agent가 쓰지 못하는 Evidence Store에 두고 model context에는 signature + content hash + artifact ref만 남긴다. `solve rate, cost/solve, cache-read, uncached input, reread/re-exec count, turns/solve`를 함께 측정한다.

**평가: PoC 1순위.** build/file-read heavy Perforce workload에서 shadow A/B 가치가 높다.

Sources:
- https://arxiv.org/abs/2609.26779
- https://github.com/nguyenvuthientrang/cliffcompaction

## 5. Growing Harness — Context 대신 반복 Control을 실행 코드로 승격

2026-09-22 공개된 `Grow the Harness, Not the Context`는 recurring task에서 같은 control decision을 prompt/context 안에서 반복 추론하는 대신 failure feedback을 이용해 재사용 가능한 executable harness code로 옮긴다.

strategy-free scaffold에서 시작해 function-level execution trace로 failure를 bounded code surface에 연결하고, 여러 failure를 함께 repair한 뒤 success-first held-out gate를 통과한 변경만 Harness에 누적한다. 기존 성공 capability를 깨면 repair sequence를 rollback한다.

BrowseComp-Plus와 WebArena-Verified, 4B~120B 모델 평가에서 Tool-Calling agent 대비 **LLM calls 76.0~91.8% 감소, deployed-agent inference cost 74.4~98.6% 감소**를 보고했다. 6개 benchmark-model 조합 중 5개에서 최고 평균 성공률을 기록했고 나머지 1개도 최고 대비 0.7pp 차이였다.

### 절감 원리 / Perforce 적용

Prompt/Skill에 반복 control rule을 넣으면 매 request마다 그 token과 reasoning 비용을 다시 지불한다. 반복적이고 검증 가능한 control만 code/hook으로 내린다.

승격 후보:
- edit 후 targeted compile/test 선택
- `p4 opened`가 비면 review를 시작하지 않는 gate
- Pending CL/workspace mismatch fail
- build log root diagnostic 추출
- stale MCP catalog retry/fallback
- 동일 depot path mutation lease 충돌 차단

architecture 선택, ambiguous defect diagnosis, 사용자 의도처럼 semantic judgment가 필요한 항목은 model context에 남긴다. 과거 성공 task를 포함한 held-out Perforce corpus에서 regression gate를 통과한 patch만 persistent policy로 승격한다.

**평가: PoC 가치 매우 높음.** RRSI/Ecdysis/Harness-R1의 experiment/failure ledger를 executable control로 승격하는 다음 단계다.

Source: https://arxiv.org/abs/2609.26760

## 오늘의 통합 결론

오늘 흐름은 Context Engineering이 단순 압축을 넘어 **관측 → 캐시 → 격리 → 결정적 압축 → 반복 reasoning의 코드화**로 이동하고 있음을 보여준다.

권장 구현 순서는 다음과 같다.

1. Read-only ContextDoctor — source별 context/token bucket 계측
2. Shared CapabilityCatalogCache — worker 간 MCP/Tool discovery 공유
3. Reviewer-owned transcript — Worker compaction과 독립된 evidence/rollback view
4. CliffCompaction shadow PoC — 대형 Tool traffic만 deterministic하게 제거
5. Harness promotion gate — 반복 failure/control만 executable hook/policy로 승격

공통 Runtime Adapter에는 `ContextCostSnapshot`, `CapabilityCatalogCacheKey + generation`, `ReviewTranscript + accepted_event_seq`, `CompactionReceipt`, `HarnessPolicyVersion + heldout_eval_hash`를 추가할 가치가 높다.

> 매 turn의 context를 더 잘 요약하는 것보다, 반복 Tool schema는 캐시하고, Reviewer evidence는 독립시키고, 재조회 가능한 Tool history는 결정적으로 버리며, 반복되는 control reasoning은 아예 Harness 코드로 내리는 쪽이 장기적으로 더 큰 절감 여지가 있다.

## 신규성 / 중복 확인

- `ai/trend/` canonical 보고서는 develop 기준 2026-09-24까지 존재함을 재확인했다.
- 9월 25~27 canonical 파일은 없지만 해당 자동화 실행에서 이미 조사한 항목은 이번 보고서에서 반복하지 않았다.
- Wiki 검색에서 `context-doctor`, `CliffCompaction`, `Open-SWE MCP` 관련 기존 항목이 없는 것을 확인했다.
- Claude Code 공식 CHANGELOG는 여전히 2.1.283이 최신이므로 전일 내용을 반복하지 않았다.
- Microsoft Agent Framework Harness 공식 자료도 확인했으나 오늘 5개 항목보다 직접적인 신규 실측/변화가 적어 본문 항목 수를 억지로 늘리지 않았다.

## Wiki 반영

Canonical path:

`ai/trend/ai-harness-token-scout-2026-09-28.md`

다른 `ai/news/`, `ai/tools/`, `ai/harness/`, `ai/research/`, `ai/tips/`에는 이 날짜별 보고서를 중복 생성하지 않는다.
