---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-28"
date: 2026-10-28
category: trend
tags: [ai-harness, coding-agent, context-engineering, token-optimization, progressive-disclosure, skill-scoped-mcp, prompt-cache, compaction, durable-state, runtime-adapter, evidence-verification, handoff-ledger, perforce, claude-code, codex]
---

# AI Harness · Context/Token Optimization Scout — 2026-10-28

> **조사 시점:** 2026-10-28 05:58 KST(= 10/27 20:58 UTC). **주요 신규 변경 구간:** 2026-10-26 20:56~2026-10-27 20:58 UTC. 공식 GitHub commits/pulls/releases 및 소스·테스트 중심. 비교 기준: [10/27 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-27.md), [10/26](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-26.md), [10/25](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-25.md), Wiki [Publishing Skill](https://github.com/jaywapp/wiki/blob/develop/ai/skills/github-document-publishing.md). 성능 수치는 **원본 작성자 실험**이며 사내 Perforce/UE5에서 재현한 값이 아니다. Stable 릴리스와 main/HEAD 병합을 구분한다.

## 0. 핵심 결론과 중복 제거

- **오늘 우선순위:** ① Codex *모델에 노출할 Skill catalog에서 description 생략* (#57500)과 *실행 중 dynamic tool catalog 교체/영속화* (#57553), ② Deep Agents Talon *Skill을 읽을 때만 MCP schema 노출* (#7280), ③ OpenCode v2.2.0 *TTL 설정과 keyed session instructions* 정식 공개, ④ Open SWE의 *checkpointed credential refresh*, ⑤ Microsoft Agent Framework의 *병렬 장애 시 완료된 step checkpoint 보존*, ⑥ Claude Code 2.1.311/312의 *compaction·subagent·대형 지침 파일 정합성* 수정.
- **직접적인 LLM 토큰/청구비 절감률은 오늘 새로 실측 확인되지 않았다.** Tool schema 축약, cache TTL 연장, 중복 compaction 및 재시도 방지는 비용 절감 **가설**이다. 실제 측정된 숫자는 QuickJS hook 처리 시간, MCP startup, Git snapshot latency 등으로 **token 절감이라고 표기하지 않는다.**
- **지난 보고서와 중복 제외:** Open SWE stateless backend 12.0→0.85MB, compiled graph 24~25→0.5ms, Codex MCP stdio pool, Deep Agents run-scoped prompt slot, Agent Framework checkpoint lineage, TokenEconomizer 18.4~30.9%, 이전 OpenCode Tool schema 1회 변환 등의 기존 성과를 신규 항목처럼 반복하지 않았다.
- **릴리스 경계:** [Claude Code 2.1.311](https://github.com/anthropics/claude-code/releases/tag/v2.1.311) 10/26 21:51 UTC, [2.1.312](https://github.com/anthropics/claude-code/releases/tag/v2.1.312) 10/27 20:24 UTC, [Codex rust-v0.165.0](https://github.com/openai/codex/releases/tag/rust-v0.165.0) 10/27 20:09 UTC, [OpenCode 2.2.0](https://github.com/anomalyco/opencode/releases/tag/v2.2.0) 10/27 09:04 UTC, [langchain-quickjs 0.3.11](https://github.com/langchain-ai/deepagents/releases/tag/langchain-quickjs%3D%3D0.3.11) 10/27 17:02 UTC. Codex 10/27 늦은 HEAD 커밋 대부분은 0.165.0 릴리스 포함이라고 단정하지 않는다.

### 신규성·측정·판정 표

| 구분 | 원본 변경 | 확인 가능한 효과 | 모델 token/cost 상태 | Perforce harness 평가 |
|---|---|---|---|---|
| Context | [Codex #57500](https://github.com/openai/codex/pull/57500) catalog description omit | 모델 가시 catalog에서 이름·locator만 유지, 설명은 제거 가능 | token 수치 미공개 | **PoC 최우선** |
| Tool lifecycle | [Codex #57553](https://github.com/openai/codex/commit/f088e0c4ffdfab3a7d4480c14855a9db00450384) runtime tool replacement | in-flight Tool 보존, resume/compaction 후 최신 catalog 복구 | schema 노출 최적화 가능, 미측정 | **PoC 최우선** |
| Progressive disclosure | [Deep Agents Talon #7280](https://github.com/langchain-ai/deepagents/commit/2a5b748dcc1e76c3eb5cd1735351e230788f00d7) | `skillOnly` 서버 schema는 skill 읽기 전 비노출 | 직접 원리 명확, 수치 미측정 | **PoC 최우선** |
| Session/context | [OpenCode v2.2.0 / #56550](https://github.com/anomalyco/opencode/pull/56550) | keyed 지침 갱신 시 extra inbox/model turn 불필요 | token 미측정 | **PoC 최우선** |
| Prompt cache | [OpenCode v2.2.0 / #59157](https://github.com/anomalyco/opencode/pull/59157) | 5m/30m/1h/12h/24h TTL 전달, 실제 API 응답 확인 | 비용 추정 과소계상 위험 명시 | **PoC 최우선** |
| Compaction | [OpenCode #59441](https://github.com/anomalyco/opencode/commit/bc175f675ca199f964555e9e75b1368391bc2cd4) | provider 마지막 토큰 계측 우선, overflow면 fallback | 불필요 삭제 방지, 수치 미측정 | **바로 적용 원칙** |
| Durable credentials | [Open SWE #4638](https://github.com/langchain-ai/open-swe/pull/4638) | token 만료 10분 전 checkpoint 기반 refresh | retry 감소 기대, 미측정 | **바로 적용 원칙** |
| Checkpoint | [Agent Framework #9644](https://github.com/microsoft/agent-framework/pull/9644) | 병렬 step 실패 중 완료 step 저장 보존, 회귀 테스트 | 재실행·중복 side effect 억제 | **바로 적용 원칙** |
| Lazy runtime | [QuickJS 0.3.11/#7301](https://github.com/langchain-ai/deepagents/pull/7301) | 비-eval turn 준비 **660.3→0.2ms**, 정리 **69.4→0.1ms** | SDK hook latency만 | **바로 적용 검증** |
| MCP startup | [Deep Agents #7303](https://github.com/langchain-ai/deepagents/pull/7303) | 로컬 MCP load **1198→996ms**, extra probe 2→0 | startup/network만 | **PoC** |
| Snapshot | [OpenCode #59419](https://github.com/anomalyco/opencode/pull/59419) | 8 병렬 clean capture: 977→199ms(VS Code), 2048→496ms(Linux), 37.9→9.7s(Chromium) | Git snapshot latency만 | **PoC** |
| Reviewer | [Codex #57522](https://github.com/openai/codex/pull/57522), [#57519](https://github.com/openai/codex/commit/6574bcdba89a630257c659418e241a3d7a242f6b) | Reviewer context 격리, heartbeat prefix 정규화 | 재사용/압축 수치 미측정 | **PoC** |
| Safety | [Codex #57451](https://github.com/openai/codex/commit/824b7666fb149033ad07fe0f5f3e261943295a27) | spawn/send/followup/interrupt Guardian 심사 | 보안·품질 우선 | **바로 적용 원칙** |
| Ledger | [Agent Framework #9720](https://github.com/microsoft/agent-framework/commit/45ea037d474b6707e38b0af6d881e7d09a48cbb7) | streaming workflow의 누락 usage 복원 | 관측 정확성 향상 | **바로 적용** |
| Memory safety | [Codex #57358](https://github.com/openai/codex/commit/adfcac1a427ac70f6a1eabb85f836eb85341f995) + [#57360](https://github.com/openai/codex/commit/ff2346f33f851bd4e90c8e42ae60abcc7e7f293b) | cross-process lock, 30초 timeout | 재실행 방지, token 미측정 | **바로 적용 원칙** |
| Claude runtime | [Claude 2.1.311/312](https://github.com/anthropics/claude-code/releases/tag/v2.1.312) | 대형 CLAUDE.md/Skill discovery, compaction, hook concurrency 수정 | 실측 token 수치 없음 | **바로 적용 버전 검증** |
| Model error | [OpenCode #59649](https://github.com/anomalyco/opencode/commit/618b89066773e707601577230ba7211605c8b569), [#59500](https://github.com/anomalyco/opencode/commit/24bf4d488acabad808b5374fc7fa26893f4c5e42) | HTTP 429 분류/TTL 모델 variant 오류 수정 | 잘못된 compaction 방지 | **바로 적용 원칙** |

## 1. Claude Code 2.1.311/2.1.312 — 지침 파일·Compaction·Subagent 수명주기 정확성

**신규성/공식 근거:** [2.1.311 릴리스 원문](https://github.com/anthropics/claude-code/releases/tag/v2.1.311), [2.1.312 릴리스 원문](https://github.com/anthropics/claude-code/releases/tag/v2.1.312). CLI 배포 릴리스이며 SDK 내부 코드가 공개된 것처럼 서술하지 않는다.

**내부 동작/고장 형태:** 2.1.311은 CLAUDE.md의 매우 긴 list item으로 startup/read/edit가 오래 멈추는 문제, 200K 넘는 표준 context가 잘못 1M credits 오류로 끝나는 대신 compaction 후 지속하게 하는 처리, 최근 수정한 `MEMORY.md`/`CLAUDE.md`가 compaction 직후 오래된 본문으로 보이는 문제를 수정했다. 무응답 MCP resource read/Skill 다운로드 중 중단이 지연되던 현상, 늦게 연결된 MCP를 subagent가 보지 못하던 현상, `SubagentStop` hook이 진행 중 1분에 두 번가량 잘못 실행되던 현상, subagent의 배경 자식 작업이 남아 있는데 isolated worktree가 삭제되던 현상, resume 뒤 Agent Team task list 유실을 수정했다. 사용자가 요청하지 않은 extra model turn을 유발한 background wake 문제도 포함된다.

2.1.312는 매우 큰 CLAUDE.md/rules/@include가 **앞부분만 읽힌 상태에서 전체 Write로 덮어써지는 위험**을 막기 위해 Write 시 전체 read 또는 국소 Edit를 요구한다. Bash에서 repo 하위로 `cd` 한 뒤 directory/`paths:` Skill을 찾지 못하는 문제, resume 직후 답변 누락, model/effort 변경의 OTel 기록이 실제 적용 시점과 달랐던 문제를 수정한다. `autoCompactWindow`의 subagent 설정은 상위 env 한도를 **낮추는** 데만 작용하고 올리지는 못한다. Hook 동시성은 세션(하위 Agent 포함) 최대 **24개**, 추가로 timeout을 넘긴 대기 hook **12개**로 제한되며 1초 미만 timeout도 1초로 취급한다. Custom deployment model 이름은 Bedrock/Vertex/Foundry/Mantle에서 간소한 system prompt로 갈 수 있어 `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0`으로 opt-out 가능하다.

**절감 원리·trade-off:** 중복 SubagentStop, 잘못된 extra turn, 잘못된 compaction/retry를 제거하면 추론 낭비가 줄어들 수 있다. 그러나 release에 별도 USD/token 벤치마크는 없다. 간소 system prompt는 token 절감 가능성이 있지만 미인식 모델에 원래 필요했던 설정이 빠질 수 있다. Hook 병렬 제한은 폭주를 막지만 hook latency 증가 가능. 긴 파일 Write 차단은 안전성을 높이는 대신 추가 Read token/latency가 든다.

**Perforce·Claude/Codex 적용:** P4 depot에 두는 `AGENTS.md`·`CLAUDE.md`와 경로별 Skill 파일은 truncated read를 확인한 뒤 Edit/diff anchoring으로만 수정. compaction 이후 `policy_hash`/`skill_hash`와 실제 읽은 문서 revision을 재확인. Background Subagent가 `p4 sync`/UE5 build/TeamCity 증거 수집을 실행 중인 동안 workspace/client 삭제 금지; 자식 job refcount와 lease 종료를 확인. 100KB+ 지침 파일, 긴 single-line, 2차 subagent, 200K 전후 장기 세션, mid-task effort 변경 각각 회귀 테스트. **평가: 바로 적용 버전 검증.**

## 2. Codex #57500 — Skill catalog는 이름+locator로 줄이고 필요할 때 설명 읽기

**근거:** [10/27 16:16 UTC merged PR](https://github.com/openai/codex/pull/57500), `codex-rs/core/src/skills` 관련 render/config, `core/tests/suite/model_visible_layout.rs`, `scenarios_skill_catalog_dedup` snapshot. **HEAD 변경이며 0.165.0에 자동 포함되는 것으로 가정하지 않는다.**

**구현:** opt-in `omit_skill_descriptions` flag는 기본 **off**. 켜면 host/executor/cloud Skills의 model-visible catalog에 **이름과 위치만** 남기고 긴 설명을 빼며, catalog 소개문·사용법·alias token budget을 이 규칙에 맞춰 다시 계산한다. 선택을 catalog snapshot에 저장하고 이전 snapshot을 resume할 때 정책 변경을 처리한다. 설명만 바뀐 delta는 생략 모드에서 무시한다. Skill 본문을 읽을 때 필요한 상세 지침을 얻는 단계적 공개 방식이다.

**장점:** 매 model turn에 반복되는 Skill 설명이 prefix에 들어가는 양을 줄일 직접적 구조. **위험:** 모호한 이름으로 Skill 선택 recall이 떨어질 수 있고, 위치 경로만으로 특수 작업을 발견하지 못할 수 있다. Plugin alias 중복 및 pinned Skill 기준도 확인해야 한다. 업스트림에 절감 토큰 수치 없음.

**P4 PoC:** 60 Skills(UE5 20, P4 20, CI 20), 설명 50/150/350자 교차. A(기본 전체 설명), B(이름/locator), C(이름/1줄 역할)의 `visible_schema_tokens`, `skill_selection_recall@1`, wrong-skill 수, cache-read tokens, tasks/USD 비교. 필수 권한·위험 표시는 제목/별도 policy에 유지. **평가: PoC 최우선.**

## 3. Codex #57553 — Tool catalog의 실행 중 교체도 durable event다

**근거:** [10/27 19:50 UTC 커밋](https://github.com/openai/codex/commit/f088e0c4ffdfab3a7d4480c14855a9db00450384), `codex-rs/core/src/codex_thread.rs`, `session/dynamic_tools_tests.rs`, `rollout_reconstruction.rs`, history/compaction tests.

**구현:** `CodexThread::replace_dynamic_tools`는 별도 turn 시작 없이 **다음 model step 이후의 catalog를 교체**한다. 이미 진행 중인 Tool 호출은 기존 계약으로 완료한다. 빈 배열은 catalog 전체 clear. 영속 thread에서는 host가 `allow_persistent_dynamic_tool_updates`를 명시적으로 활성화해야 하며 update event를 **먼저 durable log에 기록한 뒤** 소비자에게 공개한다. Resume 시 마지막 catalog를 복원하고 compaction/override/restart에서 명시적 clear와 업데이트를 유지한다. Caller가 기다리기를 취소해도 queue에 들어간 작업의 결과가 미정일 수 있고, persistence error 뒤에는 **같은 replacement 재적용 후 계속**하도록 명시한다.

**Token 원리:** Task/단계별로 불필요한 Tool schema를 제거할 수 있지만 실제 절감률 미공개. 교체 사이 race와 replay/version 호환성 난도가 늘어난다.

**P4 PoC:** `DISCOVER(read-only p4 files/search) → EDIT(p4 edit/diff) → REVIEW(build evidence) → SUBMIT(승인된 tool)`로 단계별 ToolCatalog를 replace. `catalog_version`, `grant_hash`, `policy_hash`를 durable state에 추가; Tool call은 자신이 시작한 version으로 검증. 중간 crash/restart/compaction/하위 Agent fork 100건에서 privilege escalation 0, 잘못된 catalog 0, prompt schema tokens와 cache 비용 계측. **평가: PoC 최우선.**

## 4. Deep Agents Talon #7280 — `skillOnly` MCP Tool과 정확한 include 목록

**근거:** [10/27 16:04 UTC 커밋](https://github.com/langchain-ai/deepagents/commit/2a5b748dcc1e76c3eb5cd1735351e230788f00d7), `libs/talon/deepagents_talon/{mcp.py,mcp_config.py,mcp_middleware.py,runtime.py}` 및 `tests/unit_tests/test_skill_mcp.py`.

**구현:** MCP 서버 설정에 `skillOnly: true`를 지정하고 Skill frontmatter `metadata.include_tools`에 **정확히 prefixed MCP Tool 이름**을 적는다. Talon 자체 loader에서 Skill disclosure middleware로 연결한다. Skill을 읽거나 pin하기 전에는 **Tool JSON schema를 모델에서 숨긴다**. 하지만 startup의 MCP 서버 discovery와 OAuth는 그대로 이루어지며, Tool 승인 정책도 그대로이다. Scheduled runs는 approval-required action을 거부하고, fresh Subagent에도 부모 Skill의 hidden tools가 자동으로 노출되지 않는다.

**차이점:** 기존 Wiki에서 Deep Agents code-mode Skill-scoped schema 패턴을 다뤘지만 **Talon이 별도 MCP loader 때문에 해당 기능을 자동 승계하지 못했던 틈을 실제로 메운 후속 구현**이 오늘 신규성이다. startup HTTP/connection 최적화와 모델 schema 절감은 별도 개념.

**P4 적용:** `p4-read` Skill은 `p4_files,p4_describe`만, `p4-submit` Skill은 승인된 `p4_submit`만. 같은 MCP 연결에서도 모델에 Tool 정의 공개를 후행시킨다. 50개 서버/150개 Tool에서 cold/warm discovery latency, visible schema tokens, Skill 선택·권한 오류·tool call 실패율 측정. **평가: PoC 최우선.**

## 5. OpenCode v2.2.0 — Keyed durable instructions와 Cache TTL의 실전 주의점

**릴리스 근거:** [v2.2.0 10/27 09:04 UTC](https://github.com/anomalyco/opencode/releases/tag/v2.2.0), [session instruction PR #56550](https://github.com/anomalyco/opencode/pull/56550) (**10/21 merge; 10/27 공개 패키지 도달이 신규성**), [cache TTL PR #59157](https://github.com/anomalyco/opencode/pull/59157) (**10/26 merge**), [10/27 cache/variant follow-up #59500](https://github.com/anomalyco/opencode/commit/24bf4d488acabad808b5374fc7fa26893f4c5e42).

**A. Session instruction entry:** Plugin API `ctx.session.instructions.entry.{put,list,remove}`로 `sessionID, key, value` 단위 지침을 기록한다. 실제 지침은 `<context key="...">` 블록으로 후속 model step에서만 업데이트/삭제를 알리고 **synthetic inbox → extra model turn**을 만들지 않는다. Entry는 compaction/revert에도 보존된다. 핵심은 대화 전역 system prompt를 매번 고쳐 cache prefix를 깨는 대신 **작은 변경량만 durable context delta로 전달**하는 것. Upstream PR에서 plugin test **2 passed/26 assertions**. 변화의 token/USD 수치는 미공개. 너무 잦은 entry 갱신은 cache 명세와 update message 누적을 고려해야 하며 권한 관련 사항은 서버 정책 강제와 분리한다.

**B. Cache TTL:** Provider/model 설정 `cache.ttl`로 `5m / 30m / 1h / 12h / 24h` 같은 문자열을 지원하고 프로토콜별로 Anthropic marker의 `cache_control.ttl`, 최신 OpenAI의 `prompt_cache_options.ttl`, 구형 model의 `prompt_cache_retention` 등으로 매핑한다. PR이 Anthropic 1h, OpenAI GPT-5.6 30m/12h, OpenRouter/Zen, Moonshot 실제 API 수용 여부를 기록했다. **비용 함정:** Catalog 가격 추정이 TTL별 write price를 아직 반영하지 않아, Anthropic **1h cache write 2x**를 **기본 1.25x**로 잘못 추정할 수 있다(작성자 명시). TTL 증가로 read cache hit가 올라가더라도 write 단가 상승을 포함한 **실제 청구 비용**을 비교해야 한다. 후속 #59500은 model variant 설정 중 cache를 일반 model settings와 분리하여 정책 혼합을 막았다.

**P4 harness 설계:** `RunPolicy`는 고정 prefix와 volatile `RunContext`를 나눈다. State delta는 `instruction_id,version,value_hash`로 ledger에 저장; Policy/risk change는 client-side key 갱신뿐 아니라 runtime 권한 검증에 반영한다. 길이가 5분/30분/1시간을 넘는 CI/Build 대기를 가정해 5m/1h TTL A/B, 30개 작업의 cache-create/read token, 비용 영수증, 정책 누락, prompt prefix 변경 횟수, 성공율 측정. **평가: PoC 최우선.**

## 6. OpenCode #59441 — Compaction 크기는 공급자 측 직전 계측으로 판단

**근거:** [10/27 03:13 UTC](https://github.com/anomalyco/opencode/commit/bc175f675ca199f964555e9e75b1368391bc2cd4), `packages/core/src/session/compaction.ts`, `packages/core/test/session-compaction.test.ts`.

**내부:** 이전의 대화 문자수 추정은 provider가 과거 reasoning을 버린 경우 실제 token을 **과대 추정**할 수 있어 살아 있어야 할 context를 먼저 삭제했다. 변경은 정상 proactive compaction에서는 **provider 마지막 token count + 그 뒤 추가분 추정**으로 원본 요청의 크기를 판단한다. 요약 지시문/재요청 문장은 증가량을 반영한다. 실제 context overflow 응답이 온 경우 이 count에 더는 의존하지 않고 기존 문자수 기반 보수적 fallback을 사용한다. 실패·nudge·tail 전달에서 원본 요청 보존을 우선한다.

**장단점:** 낮은 token 사용 시 불필요한 context pruning 감소, 모델 품질 보존 가능. Provider count가 오래되거나 image/tool 멀티모달 계산이 다르면 overflow가 남을 수 있고 후속 retry가 필요하다. 실제 절감 USD 미공개.

**P4 적용:** 매 turn `provider_last_input_tokens`, `post_count_tool_tokens`, `confidence`, `overflow_seen`을 저장. 큰 build logs/diff는 handle로 외부화하고 `verified_evidence`는 summary와 별개 durable ledger에 고정. Compaction 전후 evidence recall/quality, 재요청 횟수, 청구비를 100 turn 장기 세션으로 측정. **평가: 바로 적용 원칙.**

## 7. Open SWE #4638 — 만료 토큰 관리 주체는 휘발성 백엔드가 아니라 Run checkpoint

**근거:** [10/27 20:49 UTC 커밋](https://github.com/langchain-ai/open-swe/commit/8cc3859dac8815751ae515f2d257ecf947c8a012), `mda/rt/loop.py`, `openswe/sandboxes/lifecycle.py`, `tests/sandbox/test_proxy_auth.py`, `mda/tests/test_loop.py`.

**실패 원인:** Sandbox GitHub proxy token은 약 1시간 뒤 만료되는데 backend replica의 process memory에 만료시각/box connector를 들고 있던 구 구조에서는 다른 replica로 resume하면 만료 갱신이 누락돼 `git/gh`가 401로 반복 실패했다.

**변경:** Runtime `RunLoop`가 `github_proxy_refresh_at`을 **thread checkpoint**에 저장한다. 만료까지 10분 이하가 남으면 `before_model`에서 명시적 `refresh_github_proxy` API를 **await**하고 backend는 현재 thread/box/repo scope를 읽어 무상태로 token을 갱신한 뒤 expiry를 돌려준다. 만료시각이 없는 box는 30분 후 재검토, 갱신 실패는 1분 후 재시도하도록 루프 소스가 정한다. 남은 기간이 충분하면 불필요한 요청 0. 만료 갱신 자체는 idempotent endpoint로 분류하며 첫 Tool 전에 차단성을 보장한다. **잔여:** 동일 이름으로 새로 만들어진 box는 기존과 동일하게 초기 connect 시 backend configuration에 의존한다.

**P4 적응:** P4 ticket/SSO token 또한 `credential_scope(depot/client/permission),expires_at,refresh_at,issuer,run_id`를 durable run metadata에 넣되 **원문 secret은 vault에만 보관**. TeamCity/Perforce worker 재시작·백엔드 replica 교체·30/70분 sleep 뒤에도 `p4 login -s`/read-only test가 유효하고 refresh failure는 Tool 전에 분류하는지 검증. 과금 절감은 실패한 Agent turn 감소의 간접효과. **평가: 바로 적용 원칙.**

## 8. Microsoft Agent Framework #9644 — 완료한 step의 checkpoint save를 sibling failure가 죽이면 안 된다

**근거:** [10/27 13:05 UTC merged](https://github.com/microsoft/agent-framework/commit/63d0998c9e3a44ff993e482fd5b70f08e4cf04bc), [상세 PR 검증](https://github.com/microsoft/agent-framework/pull/9644), `python/packages/core/agent_framework/_workflows/_functional.py`, `test_functional_workflow.py`.

**내부:** Parallel steps 중 하나가 `executor_completed`를 낸 뒤 storage write를 `await` 중인데 다른 sibling이 실패하면 기존 cleanup이 그 save task를 취소하여 재시작할 때 완료한 step을 **중복 실행**하는 버그였다. Save를 별도 tracked task로 두고 framework-owned failure cleanup에서는 save와 하위 storage task를 `shield`/drain한다. Snapshot은 async save 이전에 **동기적으로 구성**해 sibling이 state를 바꾸는 race를 막았다. 사용자 **명시적 cancellation**은 진행 중 저장을 취소할 수 있도록 유지한다. Process kill, storage I/O 장애까지 durable guarantee를 주지는 않는다.

**검증 범위:** PR 본문에 sibling-failure/replay 회귀 3종, cancellation 케이스 18종, 작성자 로컬 workflow suite **1,304 passed, 6 skipped, 1 xfailed** (후속 head 기록). 정식 released Python package 포함은 아직 단정하지 않는다.

**P4 적용:** `p4_submit`/CL 번호 생성/TeamCity 실행처럼 side effect가 있는 step은 checkpoint와 별도로 `idempotency_key`, `operation_receipt`, `reconcile_on_resume`가 필요하다. 2개 병렬 step에 0~500ms 랜덤 storage latency와 sibling failure, worker SIGTERM, caller cancellation을 각각 100회 주입. 동일 CL 재-submit 0, 중복 빌드 0, 완료 step 결과 보존률·복구 시간 측정. **평가: 바로 적용 원칙.**

## 9. Codex #57522/#57519/#57451 — Reviewer Context Isolation + Heartbeat 압축 + native multi-agent 승인

**근거:** [#57522 isolated review](https://github.com/openai/codex/commit/19d730175f68d56aba23eae6c765b4e133299069), [#57519 heartbeat context](https://github.com/openai/codex/commit/6574bcdba89a630257c659418e241a3d7a242f6b), [#57451 state-changing multi-agent calls](https://github.com/openai/codex/commit/824b7666fb149033ad07fe0f5f3e261943295a27), [#57433 synchronous native tool review](https://github.com/openai/codex/commit/ed1b92fa45817df7fb2553e87aa90d4b6cb0e3a) (모두 10/27 HEAD).

**내부:** `ReviewerPool::review_isolated`는 reusable warmed reviewer의 기존 session/snapshot을 **읽지도 수정하지도 않는** 일회용 Reviewer를 생성한다. Cross-task evidence/policy 오염을 막되 매번 새 session initialization 및 prefix cache cold-start 비용은 늘 수 있다. Scheduled heartbeat 메시지는 수집 즉시 압축하지 않고 원래 provenance를 보존하다 `prepare_sync_context` 시 **전체 transcript에서 반복 heartbeat를 압축한 뒤 suffix를 선택**, full/delta prompt의 reference numbering을 유지한다. 준비되지 않은 scheduled message는 prompt compose에서 거부한다.

Multi-Agent V2의 `spawn_agent`, `send_message`, `followup_task`, `interrupt_agent`는 `GuardianNativeMultiAgentHistory` opt-in 설정에서 Guardian review 대상으로 연결된다. Native tool call wire 기록/암호화 parent reply가 Reviewer와 후속 Model에 정확히 한 번 전달되는 snapshot 테스트를 추가했다. 이는 모델이 하위 Agent를 띄우거나 중단하는 행위 자체가 **권한 변경/side effect**임을 인정한 구조다.

**P4 적용:** Reviewer에는 `evidence_digest, policy_id, diff_anchor, candidate_action`만 주입하고 이전 Worker transcript는 차단. 반복 Heartbeat/모니터 로그는 `count,last_seen,source_ref`로 묶되 causal order·명시적 사용자 지시는 보존. P4 client 생성/비용 높은 UE5 빌드/submit을 수반하는 spawn/followup은 action review gate를 통과. 40개 연속 다른 프로젝트 리뷰에서 evidence leak 0, diff anchor 정확도, input tokens/approval latency를 비교. **평가: 바로 적용 원칙(권한 경계), 모델 비용은 PoC.**

## 10. Codex #57358/#57360/#57563 — Session Ledger 내구성과 모델 HTTP 출력 보유량 제한

**원본:** [10/27 04:47 UTC index lock](https://github.com/openai/codex/commit/adfcac1a427ac70f6a1eabb85f836eb85341f995), [10/27 04:52 writer lock](https://github.com/openai/codex/commit/ff2346f33f851bd4e90c8e42ae60abcc7e7f293b), [10/27 20:42 HTTP response stream](https://github.com/openai/codex/commit/d93071fae87f73ba1d251ebb3808773f18f0b77a).

**구현:** 여러 Codex process가 같은 home에 쓰는 `session_index.jsonl`을 process-local mutex 대신 파일 기반 `session_index.jsonl.lock`으로 직렬화. Cancellation 중에도 blocking writer가 끝날 때까지 lock 소유권을 유지하고 **30초** 경합 timeout을 준다. 삭제는 permission을 유지한 unique temp file rewrite. Thread writer coordination도 50ms polling/30초 timeout으로 idle unload가 무기한 멈추는 문제를 방지하고, 잠금이 풀린 후 durable turn으로 resume 가능하도록 테스트한다. 마지막 #57563은 HTTP stream에서 inference tracing이 꺼진 경우 완료된 output item 배열을 response 종료까지 붙잡지 않게 하며 WebSocket 마지막 응답 경로에만 channel을 만든다. Regression test는 response가 계속 열려 있어도 `Arc` payload가 해제되는지 검사한다.

**토큰/비용:** RAM 및 session consistency 문제이지 token 절감률 공개 없음. tracing과 evidence 기록을 생략하면 audit가 약화될 수 있으므로 **trace-off** 모드에서만 최적화 조건을 충족해야 한다.

**P4 적용:** 여러 worker가 하나의 session index/store를 공유하면 lease+OS lock 및 atomic rename, cancellation after publication 보장. Tool output은 모델에 들어갈 **요약/참조**와 원본 artifact/object-store TTL을 분리하고, tracing 필요 시만 원본 보유. 8개 병렬 세션, 강제 종료/lock contention 주입, session rename/index corruption 0, memory high-water, resume success/cleanup p95 측정. **평가: 바로 적용 원칙.**

## 11. Deep Agents 0.3.11/#7301 + #7303 — Lazy Interpreter와 불필요한 MCP probes 제거

**QuickJS 릴리스:** [0.3.11](https://github.com/langchain-ai/deepagents/releases/tag/langchain-quickjs%3D%3D0.3.11), [#7301 10/27 16:45 UTC](https://github.com/langchain-ai/deepagents/commit/12b4a7801981e6edcc928da158dcb872a870a447), `libs/partners/quickjs/langchain_quickjs/{middleware.py,_repl.py}`, snapshot/PTC tests.

**구현:** JS를 사용하지 않는 Agent turn에는 QuickJS interpreter 준비와 snapshot 복원이 필요 없으므로 **첫 evaluation까지 지연**한다. 중간 non-eval turn이 있더라도 저장된 변수는 유지한다. Restore 오류는 snapshot/HMAC을 정리하고 Tool error로 처리하며, 실패한 상태에서 임의 코드를 실행하지 않는다. 제작자 7개 fresh Python process **median, 네트워크/모델 호출 제외:** non-eval turn 준비 **660.3→0.2ms**, snapshot/cleanup **69.4→0.1ms**. 첫 eval의 초기화 비용은 이후로 이동한다.

**MCP startup:** [#7303 10/26 22:35 UTC](https://github.com/langchain-ai/deepagents/commit/1f4237af32eef17581e507f914424d523fd7b296), `libs/code/deepagents_code/mcp_tools.py` 및 proxy tests. 실제 connection 실패로 진단할 수 있는데 별도 probe를 중복 전송하던 것을 제거하고 ready 서버부터 tool loading, 동시성 제한, network connect **2초** fail-fast 처리. 저자 local 2 endpoint/5 fresh process의 MCP load **1198→996ms**, extra connection check **2→0**. Auth token refresh/load timeout은 별도 보장. **이 시간은 LLM token 비용이 아니다.**

**P4:** Python MCP worker 및 sandbox interpreter는 user task에서 실제 필요할 때만 시작. 단, `security sandbox policy`, credential scope, secret redaction은 lazy init보다 앞서 강제. cold/warm/first-tool p95, interpreter snapshot 복원, failed tool recoverability를 측정. **평가: 바로 적용 검증(QuickJS), MCP startup PoC.**

## 12. OpenCode #59419 — 동시 Git snapshot의 coalescing을 Perforce HaveList에도

**근거:** [10/27 17:29 UTC PR](https://github.com/anomalyco/opencode/pull/59419), `packages/core/src/git.ts`/`packages/core/test/git.test.ts`.

**구현:** 같은 store/scope에서 pending capture를 공유하되 이미 시작된 캡처의 결과를 뒤늦게 온 요청에 재활용하지 않는다. N 동시 요청은 최대 2 capture로 수렴하도록 queue를 구성. 2MiB 초과로 제외한 untracked file은 size/mtime 기반으로 다시 제외하고, repo `.git/info/exclude`를 조회 단계에서 반영해 중복 ignore check 제거.

**원본 A/B:** 8 concurrent clean captures: VS Code 19k files **977→199ms**, Linux 97k **2048→496ms**, Chromium 500k **37.9→9.7초**. 3개 3MiB untracked의 clean capture VSCode **113→99ms**, Linux **260→232ms**. 이는 Git snapshot 경로 성능이지 token 절감 아님.

**P4 적용:** `p4 have`/`p4 opened`/`p4 fstat` 기반 depot snapshot에 `(P4PORT,P4CLIENT,have_change,view_hash,scope)` coalescing. 실행 시점 차이로 중간 변경을 놓치지 않도록 **요청 뒤 시작된 capture만 합류**. CI 8 병렬 reviewer에서 P4 RPC 횟수, p95 snapshot latency, stale have-list 0, diff freshness 측정. **평가: PoC.**

## 13. Agent Framework #9720 + Code Interpreter #9744 — Evidence/Usage Receipt의 완전성

**근거:** [10/27 12:30 UTC usage](https://github.com/microsoft/agent-framework/commit/45ea037d474b6707e38b0af6d881e7d09a48cbb7), [10/27 13:15 UTC code interpreter](https://github.com/microsoft/agent-framework/commit/10a94cf736d730289488496c42eaad9bfc4dd473). 코드 `_workflows/_agent.py`, `agent_framework_openai/_chat_client.py`, workflow/client tests.

**Usage:** `WorkflowAgent`가 `AgentResponse`를 streaming updates로 변환하면서 토큰 사용량을 버리던 문제. 변경은 마지막 update에 usage content를 포함하고, 사용자에게 노출할 메시지가 0개여도 usage-only update를 내되 internal raw messages를 노출하지 않는다. 따라서 streaming 비용 회계가 non-streaming과 일관해진다. 새 token 절감이 아니라 **비용 계측 유실 회복**이다.

**Code Interpreter:** `response.output_item.added`는 실행 전에 발생해 logs/images가 비어 있을 수 있으므로 완료된 `response.output_item.done`에서 최종 code/output을 읽고 `merge_mode=replace`로 authoritative 결과를 한 번만 유지한다. Evidence 누락·중복을 동시에 방지한다.

**P4 적용:** `ModelUsageReceipt(run,turn,model,input,cache_write,cache_read,output,provider_cost,source,stream_complete)`는 terminal update라도 저장. `ToolEvidenceReceipt`는 START/PROGRESS/DONE을 구분하고 `output_hash,artifact_uri,complete`는 DONE에서만 확정. 사용자에게 보이지 않는 내부 메시지와 모델 비용 ledger를 분리. **평가: 바로 적용.**

## 14. OpenCode #59649 및 Cache Error Taxonomy — 429를 context overflow로 오인하지 않기

**원본:** [10/27 16:47 UTC](https://github.com/anomalyco/opencode/commit/618b89066773e707601577230ba7211605c8b569), `packages/ai/src/provider-error.ts` 및 test.

**사례:** Cerebras `token_quota_exceeded`는 per-minute throttle인데 단순 `quota_exceeded` 검사로 잔액 부족처럼, 또는 `too many tokens processed`라는 설명 때문에 `context-overflow`처럼 오진할 수 있었다. 변경은 429 메시지의 quota 검사에서 `token_quota_exceeded`를 제외하고, 상태가 **HTTP 429이면 단순 텍스트 매칭으로 context overflow로 분류하지 않도록** 조정한다. 4xx/streaming status 미표기 별도 경로에는 overflow 검사를 유지.

**비용 연결:** throttle에서 compaction을 시작하면 정상 evidence가 불필요하게 손실되고 summary token·재시도 비용이 발생. 정확한 taxonomy는 `rate_limit(retry_after)`, `workspace_quota`, `token_budget`, `context_overflow`, `policy_rejection`을 구분한다. A/B 비용 벤치마크는 없다. **P4 적용:** Claude/Codex/사내 Gateway 모든 에러에 `provider,status,raw_code,normalized_kind,retryable,context_action`을 기록하고, context pruning은 `context_overflow`에서만. **평가: 바로 적용 원칙.**

## 15. Open SWE의 MDA 0.10 브라우저/runtime adapter 진화 — 다른 경계의 증거

**근거:** [Open SWE #4547 10/27 19:01 UTC](https://github.com/langchain-ai/open-swe/commit/0421a363f436042c6590bd7f8a063b1016a62092), [#4628 10/27 19:37 UTC](https://github.com/langchain-ai/open-swe/commit/d6774cdec76707d0902a4bbf99227d728a388411), `vendor/managed-deepagents-sdk/UPSTREAM` 및 `mda/rt/browser.py`·`mda/tests/test_shared_graph.py`.

**변화:** Managed Deep Agents SDK의 `mda/0.10` head를 자체 vendor tree에 통합하면서 async subagent update strategy/fork mode, `runtime.thread` metadata, Slack/GitHub/Linear channel adapter 개선을 반영했다. Browser facade는 `browser_run`, `browser_snapshot`, `browser_screenshot`을 동일 thread sandbox localhost에 연결된 브라우저로 제공하되 `browser_handoff`는 노출하지 않는다. Browser watcher가 별도의 run을 깨우는 경로는 유지하여 handoff/UI 단계의 race를 분리한다. **특정 vendor snapshot에 대한 변화**이며 업스트림 모든 public runtime의 표준으로 일반화하지 않는다.

**P4 의미:** UE5 Editor remote automation, TeamCity web console, 웹 기반 CL review에도 browser/runtime adapter 경계를 둘 수 있다. 단 sandbox localhost 권한/브라우저 쿠키 격리/스크린샷 PII/하위 Agent 역할별 Tool grant를 독립 검증. **토큰 절감 근거는 없다. 평가: 아이디어 참고 / UI 자동화 PoC.**

## 16. 단계별 적용 로드맵 — Perforce·Claude Code·Codex Harness

### P0 — 지금 고정할 불변조건(바로 적용 원칙)

1. `RunTicket`의 durable fields: `task_id,attempt,generation,p4_port,p4_client,have_cl,policy_hash,tool_catalog_hash,skill_hash,model_route,credential_refresh_at,expires_at`. Secrets는 durable plaintext에 남기지 않는다. `RunContext`는 process나 backend pod의 캐시가 아닌 authoritative checkpoint에서 복구한다.
2. `TaskLifecycle`: `NEW → DISCOVER → PLAN → EXECUTE → EVIDENCE_PENDING → VERIFY → HUMAN_APPROVAL → SUBMIT → VERIFIED_DONE`; 각 edge에 `idempotency_key`와 actor/permission을 둔다. `FAILED_RETRYABLE`과 `FAILED_TERMINAL`을 구분한다. Reviewer는 확인된 증거로만 승인.
3. `ToolCatalogSnapshot`: role별 허가 목록과 hash/version; model-visible Tool schema와 server-side ACL을 분리. Tool 이름이 같아도 workspace/permission이 다르면 동일 cache slot 사용 금지.
4. `EvidenceLedger`: `(depot_path,base_rev,target_rev,diff_range,content_hash,build_id,test_receipt,reviewer_id)`로 immutable anchor 생성. 원본 UE5 log와 binary는 object store artifact URI로, 모델에는 짧은 digest와 필요한 line-range만 공급. 모델 요약은 증거 자체를 대체하지 않는다.
5. `ModelUsageReceipt`: 시도/하위 Agent/Tool/compaction 단위 usage, cache-read/write, 실제 청구 금액, provider 근거, 비용 unknown 여부. 호출이 실패/중단/streaming인 경우도 ledger에 기록한다. Cache TTL별 write price를 덮어쓰지 않는다.

### P1 — PoC 우선순위와 합격 기준

| PoC | 실험설계 | 핵심 계측 | 합격 기준(제안, 사내 검증 기준) |
|---|---|---|---|
| Catalog disclosure | 60 Skill + 150 MCP Tool, A 전체/B 이름+locator/C 단계별 pin | model-visible schema/input tokens, Recall@1, cache hit, USD/verified task | 품질 저하 **0~1pp 이하**를 먼저 요구, 토큰 절감은 실제 측정치로만 판정 |
| Cache TTL + delta instructions | 5m/30m/1h, Tool/CI 대기 2/10/40분, 30 tasks | prompt-cache hit/write/read, 실제 billed USD, policy recall | **USD/verified task 개선** 및 지침 누락 0 |
| Durable resume/credential | 8 Worker, 2 backend replica, 70m idle, storage delay + forced restart | duplicate p4 submit, 401, resume latency, checkpoint replay | 허가되지 않은 submit/중복 submit **0건**, 유효 credential 검증 |
| Reviewer Isolation | 도메인이 다른 40 review, 긴 로그/반복 heartbeat | evidence leak, anchor accuracy, input tokens, review latency | cross-task leakage **0**, diff anchor 오류 0 |
| P4 snapshot coalescing | 동일 client의 8개 병렬 CL review, 변경 race 주입 | RPC 수, latency p95, freshness, stale have | stale snapshot **0**, RPC·latency 개선 |

### P2 — 추가 모니터링 / 중복 제외

- **Codex 0.165.0**: release는 [10/27 공식 공개](https://github.com/openai/codex/releases/tag/rust-v0.165.0)이나 Memory V2·attached forks·effort 변경을 기존 Scout가 이미 다뤘으므로 **오늘의 새 구현으로 재집계하지 않음**. 반대로 10/27 늦은 dynamic tools/Skill-description/Guardian HEAD 변경은 release inclusion 여부를 별도 추적.
- **Codex 간소 plugin hint:** [#57317](https://github.com/openai/codex/commit/ce7adb6a31f2909a48afa538c2cdb7a6254a0e4b) `features.simplified_selection_hints` opt-in은 상세 plugin capability instruction을 짧은 선택 안내로 교체한다. `#57500`과 함께 같은 Skill catalog 실험에서 비교; 독립 절감률 공개 없음.
- **Codex trace ordering:** [#57311](https://github.com/openai/codex/commit/e977cb394d12aacdb4b24a70ddee5b0069062759) 같은 Tool call의 trim 전후 output version 보존과 history causal ordering 회복. Evidence Ledger 설계에 포함; 직접 모델 절감 아님.
- **Claude Code 2.1.311**은 `/usage`에서 큰 cache miss를 누락하던 문제도 수정했으므로 개인·Enterprise 비용 추적 대조에 활용. 동일 릴리스는 `DISABLE_COMPACT` 준수, 모델별 cache miss 경고, 계획/하위 Agent 사용량 표시 같은 설정 정확성 검증에 유의.
- **새 논문/벤치마크:** 이번 변경 구간에서 원본 source와 재현 조건까지 확인한 **새로운 LLM token 절감율/비용 벤치마크 논문은 없음**. TokenEconomizer의 과거 277-task 결과를 10/28 새 수치로 재활용하지 않았다.
- [Claude Code Issue #105352](https://github.com/anthropics/claude-code/issues/105352)처럼 cache-read 크기가 큰 사례는 사용자 제보/댓글 관측일 뿐 통제된 실험이 아님. 비용 원인 후보로만 보고 공식 절감량으로 인용하지 않는다.

## 17. 조사·검증 규약

- **원본 확인 수준:** GitHub API에서 repository별 10/26 20:55~10/27 20:58 UTC merged commits 목록과 주요 commit message·변경파일 경로를 비교, 중요 항목에 대해 commit diff/PR 상세/테스트와 릴리스 본문을 대조했다. 예: Codex `codex-rs/core`와 `ext/guardian-reviewer`, Deep Agents `libs/talon`/`libs/partners/quickjs`, Open SWE `mda/rt`/`openswe/sandboxes`, Agent Framework `python/packages/core`, OpenCode `packages/core/src/session`/`git.ts`.
- **Evidence tier:** A=공식 stable 릴리스 및 release note; B=main 병합 소스·테스트·PR; C=저자 로컬 benchmark(독립 재현 전); D=Issue/Discussion 단독 주장(참고). B의 commit을 A와 혼동하지 않는다.
- **측정 분리:** ① 실제 API input/output/cache 토큰, ② billed USD, ③ HTTP bytes/RPC count, ④ runtime latency/RSS, ⑤ 성공률·안전성. 이 5축을 서로 변환하거나 합산하지 않는다.
- **세션 전략:** 모델-visible context는 task-specific·role-specific 최소 정보만, 변경 이벤트는 durable log, 대용량 증거는 URI+hash, 재시작 복구는 catalog/grant version 및 checkpoint generation을 검증한 뒤 시행한다.
- **추적 키워드 유지:** durable state, runtime adapter, evidence verification, handoff/ledger, task lifecycle, skill/tool progressive disclosure, context pruning/compaction, selective retrieval/RAG, tool output 축약, cache TTL, model routing, token/cost accounting.
- **본문은 Wiki의 연속 관측 canonical 자료**이며 이 날짜의 보고서 복제본을 `ai/news/`, `ai/tools/`, `ai/harness/`, `ai/research/`, `ai/tips/`에 추가하지 않는다.

---
**조사 마감:** 2026-10-28 05:58 KST. GitHub canonical 게시·원문 재조회는 본문 생성 뒤 별도 검증한다.
