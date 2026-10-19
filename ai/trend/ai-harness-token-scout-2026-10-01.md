# 2026-10-01 AI Harness · Context/Token Optimization Scout

기존 `ai/trend`의 최근 Scout를 대조해 이미 다룬 RRSI, Harness-R1, Ecdysis, Persistent Billable State, ContextDoctor, shared MCP catalog cache, CliffCompaction, Growing Harness, history prewarm, RuntimeGeneration, cache-expiry hook 등은 제외했다.

## 핵심 신규 항목

### 1. Claude Code 2.1.286 — Bare baseline과 중복 Context 제거
최신 CHANGELOG의 2.1.286은 `--bare`를 명시한 MCP만 연결하고 추가 reminder/background task를 시작하지 않는 최소 실행 모드로 강화했다. Harness 구성요소의 실제 기여도를 재는 clean baseline으로 쓰기 좋다. 같은 릴리스에서 worktree subagent가 프로젝트 CLAUDE.md/imports를 첫 file read 때 두 번 로드하던 문제, parallel tool-call 뒤 crash된 session resume에서 이후 turn이 유실되던 문제, stalled workflow subagent가 원래 prompt부터 재시작하던 문제를 수정했다.

또 1시간 prompt-cache write를 5분 가격으로 잘못 계산하던 문제와 server-side tool이 포함된 streamed turn에서 첫 model call의 input만 세던 문제를 수정했다. 내부 Harness도 한 user task의 모든 model call/cache/continuation을 합산해야 한다.

Perforce 적용: `BareBaseline`을 고정하고 `InstructionSourceKey(logical_project, source, content_hash, generation)`으로 CLAUDE.md/AGENTS.md 중복 주입을 막는다.

**평가: 바로 적용.**
Source: https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md

### 2. Codex — Revisioned authoritative resume
Codex #49599/#49600은 history snapshot revision을 resume 경로에 전달하고 writer ownership을 얻은 뒤 revision이 같을 때만 preloaded snapshot을 재사용한다. 사이에 late write가 생겼거나 revision이 없으면 authoritative history를 다시 읽는다. compressed snapshot도 materialize 전에 검증한다.

Perforce TaskLedger에는 `ledger_revision + evidence_generation + pending_cl + p4_have_generation + projection_hash`를 ResumeSnapshot으로 두고 writer lease 안에서 fast-reuse 여부를 결정하는 구조가 적합하다.

같은 계열 #49598은 explicit user goal edit과 automatic lifecycle update를 구분하고, user edit을 상태 변경 전에 history에 기록해 compaction/resume 중에도 보존한다.

**평가: 바로 적용.**
Sources:
- https://github.com/openai/codex/commit/d7b0d4aa663172876871b605d53283bc0120882b
- https://github.com/openai/codex/commit/92bc601ad60542c92bf0bb1e7a2eb70b84ac49d2
- https://github.com/openai/codex/commit/de020167989fde4937204a064ea2fedd54f3c931

### 3. Codex — Inter-agent notice를 1 KiB로 제한
Codex #49686은 remote message-board notification을 active turn에만 전달하고 stale/cancelled/mismatched notice를 거부한다. remote notice가 model context에 차지할 수 있는 budget은 1 KiB다. idle agent를 깨우지 않으며 full 내용은 별도 조회할 수 있다.

Perforce Orchestrator에서도 root에는 `preview <= 1 KiB + evidence pointer + hash`만 전달하고 full worker report는 durable evidence store에 두는 구조가 적합하다. 추가 retrieval 비율을 함께 측정해야 한다.

**평가: 바로 적용 / remote delivery PoC.**
Source: https://github.com/openai/codex/commit/49be2c7ab029434dc9545cf85a7a41fd5d3beb1a

### 4. Codex — Skill Invocation OTel
Codex #49689은 explicit Skill injection과 implicit Skill use를 구분하는 `codex.skill_invocation` telemetry를 추가했다. Skill name, turn, model, scope, plugin ID 등은 기록하지만 Skill 본문·prompt·tool payload는 기록하지 않는다.

이를 이용해 `unused_but_loaded_ratio`, visible description bytes/invocation, body read rate, cost/verified-task를 계산하면 사용률은 낮고 context만 차지하는 Skill을 progressive disclosure 대상으로 선별할 수 있다.

**평가: 바로 적용.**
Source: https://github.com/openai/codex/commit/0a76a2520f45af68b7a5386688a9714af0a3ccd2

### 5. Open SWE — Stock reviewer baseline + PR별 cost
Open SWE #3454는 reviewer eval을 173 categorized goldens로 갱신하고 strict/core profile과 F1/F2를 측정한다. 평가에서는 org guidelines, repo style prompt, API-standards Skill을 제외해 stock reviewer 자체를 재며, PR별 cost와 total tokens를 함께 기록한다. 반복 eval findings도 production state가 아닌 run-scoped memory에 둔다.

Perforce Harness Lab도 fixed model/effort + fixed CL corpus + stock runtime을 baseline으로 만들고 Skill/Reviewer/context router를 하나씩 추가해야 attribution이 가능하다.

**평가: 바로 적용.**
Source: https://github.com/langchain-ai/open-swe/commit/18114d87168574f75ef7ecf8c17799126b3c0f6a

### 6. Deep Agents — Searchable archive와 active context 분리
Deep Agents/Talon #6665는 같은 channel의 sibling threads가 archive를 함께 검색하게 하면서 active thread context/checkpoint는 계속 분리한다. Coding Harness에서는 repository/depot 단위 Knowledge Archive는 넓게 검색 가능하게 두고 Task Active Context는 bounded하게 유지하는 패턴으로 옮길 수 있다.

**평가: 원칙 바로 적용, repository archive는 PoC.**
Source: https://github.com/langchain-ai/deepagents/commit/6bf76658f88af8328d9a9625d2c6444e01896248

### 7. 기존 Trend 누락 보강 — EarlyEval
EarlyEval은 2026-09-02 공개됐지만 기존 Trend에서 확인되지 않았다. trajectory prefix에서 성공/실패를 예측해 eval run을 조기 종료한다. SWE-bench Verified, TerminalBench, Toolathlon에서 13~26% step 감소, 최대 44.1% input token·29.4% output token 감소, 89~97% prediction accuracy를 보고한다. resolve-rate 변화는 평균 약 1~2pp다.

Production task 중단보다는 Harness A/B의 cheap screening stage로 먼저 적용하는 것이 안전하다.

**평가: Harness Lab PoC.**
Sources:
- https://arxiv.org/abs/2609.02783
- https://github.com/inphotoo/earlyeval

## 적용 우선순위
BareBaseline → instruction dedupe → prompt-level cost accounting → LedgerRevision/WriterLease resume → Skill invocation telemetry → 1 KiB inter-agent notice → run-scoped eval state + cost/CL → repository archive/task context 분리 → EarlyEval screening.

핵심은 prompt 한 장의 크기보다 **어떤 Harness 기능이 실제 사용됐고 얼마의 context·비용을 만들었는지, resume 시 어떤 state가 authoritative한지를 task lifecycle 전체에서 측정하는 것**이다.

## 신규성 검증
Codex 0.159.2는 Windows console bugfix 중심, Deep Agents 0.7.20은 binary upload tagging 수정 중심이라 핵심 항목에서 제외했다. 오늘 새로 공개된 고신호 coding-harness/context 절감 논문은 확인하지 못해 기존 Trend 누락이 명확한 EarlyEval만 보강했다.
