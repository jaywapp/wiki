---
title: AI Harness Token Scout - 2026-09-21
category: trend
tags:
  - ai
  - harness
  - context-engineering
  - token-optimization
  - codex
  - deep-agents
  - mcp
  - skills
  - supply-chain
  - perforce
updated: 2026-09-21
---

# 2026-09-21 AI Harness · Context/Token Optimization Trend

## 조사 기준

`ai/trend/`의 2026-09-10~20 보고서와 Wiki 기존 문서를 먼저 대조했다. 이미 다룬 Tool/Skill deferral, model-visible token accounting, request budget admission, cache affinity, review cursor/checkpoint compatibility, CCompactor, Docket, HarnessMark, Context Router, Skill catalog invalidation, Capability Snapshot, Token Optimizer MCP v7.1~7.2, Better Harness evidence externalization, SoL-Pi, post-turn compaction 등은 반복하지 않았다.

오늘 새벽까지 확인한 범위에서는 Claude Code의 최신 stable은 `v2.1.278`이며 9월 19일 이후 새 stable release가 없었다. Token Optimizer MCP도 최신 release는 `v7.2.0`이며 전일 보고서 이후 새로운 token/context benchmark 결과는 확인하지 못했다.

따라서 오늘은 **실질적으로 새로 들어온 구현 변화 2건과, 기존 Trend에서 빠졌지만 현재 Harness 설계에 직접 적용 가치가 높은 최근 자료 2건**만 남긴다.

| 항목 | 오늘/최근 확인한 핵심 | 평가 |
|---|---|---|
| Codex subagent MCP elicitation | child thread가 parent relay 없이 직접 사용자 입력을 요청 | **PoC / schema는 바로 적용** |
| Deep Agents Talon approval batching | 같은 approval round의 독립 Tool 승인을 한 번에 묶음 | **바로 적용 아이디어 / PoC** |
| Scanning the Harness + harness-eval | 3,171개 repo에서 Harness supply-chain defect를 실증, deterministic CI scanner 제공 | **바로 적용** |
| OpenAI Agents API | Codex의 managed sessions·compaction·recovery·subagent orchestration을 API로 노출 | **아이디어 참고 / 제한적 PoC** |

---

## 1. Codex — Subagent도 직접 MCP Elicitation을 요청할 수 있게 됨

2026-09-20 19:33 UTC, 한국 시간으로 2026-09-21 04:33경 Codex `main`에 `Allow subagents to request MCP elicitation input (#46877)`이 반영됐다.

이전에는 MCP server가 사용자 입력을 요구하면 subagent는 요청을 처리할 수 없고 parent agent에게 다시 물어보라는 guidance를 받았다. Browser sign-in, form input, interactive connector authorization처럼 child가 실제 작업 문맥을 가장 잘 알고 있는 상황에서도 다음과 같은 relay가 필요했다.

```text
Subagent
   ↓
Parent에게 질문 전달
   ↓
Parent가 사용자에게 질문
   ↓
사용자 응답
   ↓
Parent가 child에 전달
   ↓
Subagent 재개
```

변경 후에는 subagent가 기존 approval policy와 automatic review 규칙 아래에서 MCP elicitation을 직접 surface하고 응답을 기다릴 수 있다. Connector authentication이 승인되면 retry guidance를 반환할 수 있고, 사용자가 거절하면 원래 실패를 보존한다.

중요한 경계도 유지된다. 기존 legacy tool approval의 `request_user_input`은 계속 root thread에만 허용된다. 즉 **모든 권한을 child에 넘긴 것이 아니라 MCP의 사용자 입력 channel만 child context에 맞게 개방**한 것이다.

### Harness 설계 원칙

이 변화는 `Subagent isolation = 사용자와 절대 직접 상호작용하지 못함`이라는 단순 규칙보다 다음 구조가 적합하다는 뜻이다.

```text
SubagentCapability
  ├─ can_use_tools
  ├─ can_request_mcp_input
  ├─ can_request_destructive_approval = false
  └─ interaction_policy
```

즉 **작업 정보가 필요한 질문과 권한 승인을 분리**해야 한다.

추천 `InteractionEnvelope`:

```text
interaction_id
parent_task_id
agent_session_id
tool_call_id
kind = input | auth | approval
risk_class
prompt
policy_hash
expires_at
```

### Token / Context 관점

공개된 token 절감 수치는 없다. 다만 parent relay를 없애면 다음 비용을 줄일 가능성이 있다.

- child 결과를 parent가 다시 요약하는 coordination context
- parent/child 사이의 추가 handoff turn
- 사용자의 답을 parent가 다시 child에 전달하는 중복 serialization

특히 browser/connector 작업처럼 child가 독립 context를 유지하는 경우, **질문을 만든 Agent와 답을 소비할 Agent를 동일하게 유지하는 것**이 context integrity에도 유리하다.

### Perforce + Claude/Codex Harness 적용

- Analysis/Research child는 필요한 추가 입력을 직접 요청할 수 있게 하되 destructive action 승인은 root Orchestrator만 처리.
- Worker child가 인증/폼 입력을 요구하는 Tool을 쓸 경우 `InteractionEnvelope`를 통해 사용자 interaction을 노출.
- `submit`, workspace mapping 변경, 대량 revert처럼 irreversible하거나 범위가 큰 작업은 direct child approval 대상에서 제외.
- child가 멈춘 동안 durable state에 `waiting_for_interaction`과 `interaction_id`를 기록해 resume 가능하게 유지.

**평가: 🟢 Interaction schema와 권한 분리 원칙은 바로 적용. 🟡 실제 child-direct interaction routing은 PoC.**

Source:
- https://github.com/openai/codex/commit/c45ea25ffb72d5f7324489d824d0c677283aa0b4

---

## 2. Deep Agents Talon — Concurrent Approval을 한 번의 사용자 결정으로 Batch

2026-09-20 Deep Agents의 Talon에는 `batch concurrent tool approvals (#6435)`가 들어왔다.

### 무엇이 달라졌나

동시에 대기 중인 protected action이 같은 approval round에 속하면 각각 따로 질문하지 않고 한 prompt로 묶는다.

```text
기존
Tool A → approve?
Tool B → approve?
Tool C → approve?

변경
Tool A
Tool B  → approve ALL / deny ALL ?
Tool C
```

한 번의 결정은 각 원래 interrupt에 다시 mapping되며 action count와 audit event도 보존된다. Malformed batch는 사용자에게 질문하기 전에 실패하고, unattended run은 자동 deny한다. MCP input request와 Tool approval이 섞여 있어도 MCP input cancellation semantics는 유지된다.

또 batch prompt에는 **결정이 모든 action에 적용된다는 점을 명시**한다. `approve 1`처럼 일부만 승인하려는 답변은 유효한 batch decision으로 보지 않고 다시 질문하며, 다음 approval round에서는 반드시 새로운 결정을 요구한다.

프로젝트는 이 변경에 대해 180개의 targeted Python test와 17개의 WhatsApp bridge test, formatting/Ruff/type check를 통과했다고 명시한다.

### 핵심 원칙 — Interaction Coalescing

최근 Tool output coalescing, build-result notification coalescing과 같은 방향이다.

```text
같은 시점 + 같은 policy + 독립 action
         ↓
    하나의 Interaction
         ↓
각 Action에는 독립 Audit/Evidence 유지
```

중요한 점은 **승인 UI를 합치는 것이지 action identity를 합치는 것은 아니라는 것**이다.

### Token / 비용 관점

직접적인 token benchmark는 공개되지 않았다. 하지만 approval prompt가 N개에서 1개로 줄면 적어도 human interaction round 수는 `N → 1`로 감소한다. Harness가 approval마다 모델을 깨우거나 parent agent가 다시 reasoning해야 하는 구조라면 inference turn도 줄일 수 있다.

### Perforce Harness 적용

Batch 가능한 예:

- 같은 task에서 여러 독립 파일에 대한 동일 risk-class write
- 동일한 외부 서비스에 대한 여러 read/write 호출
- 같은 검증 단계에서 병렬 Tool들이 요청한 동일 정책의 승인

Batch하면 안 되는 예:

- `submit`과 파일 삭제를 한 batch로 묶기
- 서로 다른 depot/workspace scope를 하나의 승인으로 합치기
- read/write와 irreversible action을 같은 risk class로 취급

추천 구조:

```text
ApprovalBatch
  batch_id
  policy_hash
  risk_class
  member_action_ids[]
  scope_hash
  decision
  decided_by
  decided_at
```

그리고 batch 이후 action별 audit record를 별도로 남긴다.

**평가: 🟢 Approval coalescing 원칙은 바로 적용 가치 높음. 🟡 실제 Perforce/Tool approval batcher는 PoC.**

Source:
- https://github.com/langchain-ai/deepagents/commit/16601472424400ab4a90608d7d95e8fc61f23267

---

## 3. Scanning the Harness — Harness 자체가 Supply Chain이라는 실증 결과

기존 Trend에서 빠져 있던 최근 연구 중 지금 설계에 가장 직접적으로 영향을 주는 자료다.

`Scanning the Harness: An Empirical Study of Supply-Chain Defects in AI Coding-Agent Configurations`는 Claude Code, Cursor, Copilot, Codex 등에서 사용하는 instruction file, Skill, Hook, MCP declaration, Subagent definition을 하나의 **Harness dependency layer**로 보고 3,171개 GitHub repository를 조사했다.

Corpus는 다음으로 구성된다.

- 2,660개의 실제 assembled setup
- 511개의 published Skill collection

검증된 headline 결과:

- **16.0%**의 setup에 confirmed security defect
- **16.7%**에 어떤 형태든 confirmed defect
- **9.8%**는 version이 pin되지 않은 MCP package 설치
- **3.1%**는 `Bash(python:*)`처럼 좁아 보이지만 arbitrary execution을 사실상 pre-approve
- **3.8%**는 설치 시 shell을 pre-approve하는 Skill 포함
- 이러한 Skill 문제가 published collection의 **3.7%**에서도 발견

연구진은 credential exfiltration path 자체가 확인됐다고 주장하지 않으며, raw scanner 출력과 verified defect를 분리했다. 모든 counted finding은 독립 구현 재검증과 model adjudication/re-check 절차를 거쳤다.

### 실제 도구: `harness-eval`

연구에 사용된 계열의 `harness-eval`은 coding-agent 설정을 대상으로 하는 deterministic static scanner다.

현재 공개 README 기준으로 다음을 자동 탐지한다.

- CLAUDE.md / AGENTS.md 등 context file
- Skills / Commands
- Hooks
- MCP config
- Subagents
- Cursor/Copilot/OpenCode/Codex 계열 설정

현재 도구는 97개의 deterministic rule을 제공하며 `harness-lint`, `harness-security`, 설치 전 `skill-verify`를 지원한다. 분석은 offline으로 실행할 수 있다.

### 현재 Harness에 바로 필요한 것 — `harness.lock`

NPM/Poetry처럼 Harness component에도 설치 identity를 고정할 필요가 있다.

```text
harness.lock
  components:
    - type: skill
      source: github
      repo: ...
      commit: <sha>
      content_hash: ...
      allowed_tools: [...]

    - type: mcp
      package: ...
      version: x.y.z
      package_hash: ...
      network_policy: ...

    - type: hook
      path: ...
      content_hash: ...
      event: PreToolUse
```

CI/TeamCity preflight에서는 최소 다음을 검사하는 것이 좋다.

1. MCP package/version이 pin됐는가
2. Skill/Hook source commit과 hash가 lock과 일치하는가
3. Shell/PowerShell/Python 계열 pre-approval이 광범위하지 않은가
4. project-local config가 global permission을 우회하지 않는가
5. 선언된 Skill/Hook path가 실제 존재하는가
6. 허용 capability와 runtime에서 materialize된 capability가 일치하는가

### Token/Context와의 연결

이건 직접적인 압축 기술은 아니다. 그러나 Harness component가 매 실행마다 다른 version으로 resolve되면 Tool schema/Skill text가 바뀌어 cache prefix 안정성도 깨진다.

즉 `harness.lock`은 security뿐 아니라 다음에도 도움을 준다.

```text
Reproducible Capability Graph
        ↓
Stable Skill / Tool Catalog
        ↓
Stable Prompt Prefix
        ↓
Benchmark와 Cache 결과 재현 가능
```

**평가: 🟢 바로 적용 가치 매우 높음. 특히 외부 Skill/MCP를 늘리기 전에 lock + preflight scan을 먼저 두는 것이 좋다.**

Sources:
- https://arxiv.org/abs/2609.07360
- https://github.com/redhat-community-ai-tools/harness-eval
- https://github.com/Benkapner/harness-eval-experiments

---

## 4. 최근 누락 보강 — OpenAI Agents API가 보여주는 Managed Harness 경계

9월 10일 공개됐지만 기존 Trend에 직접 정리되지 않았던 항목이라 이번에 보강한다.

OpenAI Agents API는 **Codex가 사용하는 Harness와 infrastructure를 managed API로 노출**한다. 공식 문서 기준 Harness가 직접 담당하는 범위는 다음을 포함한다.

- persistent session
- orchestration
- context compaction
- recovery/resume
- Tool/MCP execution
- Subagent delegation
- Sandbox/file execution
- intermediate artifact 저장

Subagent는 각자 자신의 context를 유지하고, main agent가 결과를 다시 합친다. `max_concurrent_subagents`로 병렬 정도를 제한할 수 있고, execution environment는 OpenAI-hosted, self-hosted 또는 partner sandbox를 선택할 수 있다.

### 왜 중요한가

지금까지 Runtime Adapter를 다음 수준으로 생각하기 쉬웠다.

```text
ClaudeCodeRuntime
CodexRuntime
```

Agents API는 한 단계 더 분리할 필요성을 보여준다.

```text
Task / Evidence Contract
        ↓
Harness Runtime
  ├─ Local Claude Code
  ├─ Local Codex CLI
  └─ Managed Codex Harness API
        ↓
Execution Environment
  ├─ local workspace
  ├─ self-hosted sandbox
  └─ managed sandbox
```

즉 **Agent runtime과 execution environment를 같은 개념으로 묶지 않는 것**이 좋다.

### 공개 수치의 해석

OpenAI 소개 페이지에는 한 고객 사례로 evaluation score가 `0.71 → 0.85`, 기존 자체 orchestration 대비 latency가 약 1/4로 줄었다는 testimonial이 있다. 이것은 OpenAI의 일반 benchmark가 아니라 특정 고객 사례이므로 그대로 기대값으로 사용하면 안 된다.

또 공식 API는 selected model usage와 sandbox 비용을 각각 과금하며, managed compaction/recovery가 직접 몇 %의 token을 줄이는지 공개한 수치는 확인되지 않았다.

### Perforce 중심 환경에서의 판단

Local Perforce workspace, pending CL, TeamCity evidence를 강하게 제어해야 하는 coding task를 곧바로 managed Harness로 옮기는 것은 적합하지 않을 수 있다.

반면 다음과 같은 task는 PoC 대상이 될 수 있다.

- source write가 없는 research / dependency analysis
- 대형 문서/로그 조사
- 독립적인 external investigation
- Harness 자체 benchmark용 side arm

이렇게 하면 내부 `TaskContract`와 `EvidenceContract`가 특정 runtime에 종속되지 않았는지 검증할 수 있다.

**평가: 🟡 현재는 아이디어 참고 / 제한적 PoC. 내부 Perforce coding path의 1순위 runtime으로 볼 단계는 아님.**

Sources:
- https://openai.com/index/introducing-the-agents-api/
- https://developers.openai.com/api/docs/guides/agents-api/overview

---

## 오늘의 통합 결론

오늘 새로 강하게 드러난 축은 `더 많이 압축하기`가 아니라 **Interaction과 Capability를 Harness가 더 정확하게 통제하는 것**이다.

```text
Pinned Harness Components
        │
Capability / Policy Snapshot
        │
Task → Subagent
        │
        ├─ normal execution
        ├─ MCP input request
        └─ approval request
                │
        Interaction Router
        ├─ direct child input
        ├─ batched same-risk approval
        └─ root-only destructive approval
                │
        Durable Audit Ledger
```

현재 구현 우선순위는 다음이 적합하다.

1. **Harness Lockfile + preflight scanner**
2. **InteractionEnvelope 도입**
3. **ApprovalBatch + action별 audit 유지**
4. **Subagent direct input과 destructive approval 권한 분리**
5. **Runtime과 Execution Environment 분리**

특히 첫 번째가 중요하다. 최근까지 Context/Token 최적화는 `무엇을 모델에게 보여줄 것인가`에 집중했지만, Skill/MCP/Hook이 계속 늘어나면 **그 Context와 Capability 자체가 어떤 version에서 왔는지를 재현할 수 있어야** cache, benchmark, review 결과도 신뢰할 수 있다.

## Wiki 반영

Canonical Trend 보고서는 다음 경로에만 생성한다.

```text
ai/trend/ai-harness-token-scout-2026-09-21.md
```

다른 `ai/news/`, `ai/tools/`, `ai/harness/`, `ai/research/`, `ai/tips/`에는 오늘 날짜별 Scout 보고서를 생성하지 않는다.
