---
title: Token Optimizer MCP
category: tools
tags:
  - ai
  - token-optimization
  - context-engineering
  - mcp
  - hooks
  - claude-code
  - codex
source: https://github.com/ooples/token-optimizer-mcp
updated: 2026-09-11
---

# Token Optimizer MCP

> AI Coding Agent의 비싼 반복 Read/Search/Tool output을 Hook·MCP·지식 그래프로 축약하고, 절감 효과를 추측이 아니라 transport/usage ledger로 측정하려는 토큰 최적화 프로젝트다.

## 프로젝트 개요

`ooples/token-optimizer-mcp`는 Claude Code, Codex, Gemini 계열 등 여러 AI Coding Client에서 context 비용을 줄이기 위해 Hook, MCP Server, per-project knowledge graph, token accounting을 결합한다. 단순히 프롬프트를 짧게 만드는 도구가 아니라 **에이전트가 context를 읽고 다시 읽는 경로 자체를 바꾸는 것**이 핵심이다.

2026-09 초의 최근 변경은 특히 중요하다. 프로젝트는 "비싼 도구를 거부하고 더 싼 MCP Tool을 다시 호출하게 하는 방식"이 추가 turn 때문에 오히려 비용을 키울 수 있음을 자체 benchmark로 확인한 뒤, 같은 tool call 안에서 input/result를 rewrite하는 방향으로 이동하고 있다.

## 해결하려는 문제

Coding Agent 비용은 한 번의 긴 입력보다 반복되는 다음 패턴에서 커질 수 있다.

- 동일 파일 전체를 여러 번 다시 읽음
- test/build/log의 반복 출력이 매 turn context에 쌓임
- Grep/Search가 이미 알고 있는 위치를 다시 찾음
- MCP Tool schema 자체가 항상 prompt prefix에 포함됨
- context를 줄이기 위해 tool call을 거부했더니 agent가 한 turn을 더 써서 재시도함
- "몇 token 줄였다"는 수치가 실제 provider bill, cache read, 재확장 비용을 섞어 과장됨

Token Optimizer는 Hook interception과 compact representation, durable graph, 별도 accounting ledger로 이 문제를 다룬다.

## 핵심 기능

### 1. Hook 기반 Tool Rewrite

Read/Bash/Search 등의 호출 전에 Hook이 개입하여 큰 결과를 outline, bounded output, compact result 등으로 바꾼다. 중요한 방향은 **deny → retry가 아니라 같은 호출을 rewrite**하는 것이다.

프로젝트의 2026-09-09 THOL 실험에서는 16개 완전 데이터 task에서 `assist`가 control 대비 median cost 0.932, `enforce`가 1.724였고, enforce는 turn도 11.5에서 15.0으로 증가했다. 저자는 추가 비용의 대부분을 redirect 이후 재시도 turn과 cache-read 증가로 분석했다. 이 결과는 프로젝트 자체 실험이므로 독립 benchmark로 보기는 어렵지만, "토큰을 아끼려다 turn을 늘리면 전체 비용이 커질 수 있다"는 실무 가설을 강하게 뒷받침한다.

### 2. Progressive / Selective Context

큰 파일은 전체 원문 대신 outline 또는 compact representation을 제공하고 필요할 때만 확장한다. 최근 구현에서는 대형 Read를 직접 거부하지 않고 Hook이 같은 파일의 outline으로 경로를 바꾸는 방식이 사용된다.

핵심 원칙은 다음과 같다.

- 첫 관찰에서 필요한 정보를 지나치게 자르지 않는다.
- 이미 본 결과의 반복부터 delta/compact 대상으로 삼는다.
- test/build output은 시작과 끝 또는 새로 생긴 줄을 우선 보존한다.
- exit code와 실패 의미를 바꾸는 shell rewrite는 절대 허용하지 않는다.

### 3. Per-project Knowledge Graph

파일, symbol, finding, decision, dead-end 등을 프로젝트 단위 graph로 축적하고 이후 세션에서 관련 context만 다시 전달한다. content hash와 anchor를 이용해 오래된 finding을 무효화하려는 구조다.

다만 프로젝트 자체 warm-track 실험에서는 한 시점에 graph가 충분한 재사용 효과를 내지 못한 결과도 기록되어 있다. 따라서 graph의 장기 효과는 아직 검증 중으로 보는 편이 적절하다.

### 4. Session Harvest

2026-09-10 변경에서는 별도 API Key나 local model이 없어도 현재 사용 중인 AI Client의 headless CLI를 semantic extraction backend로 재사용하는 opt-in 경로를 추가했다. Claude CLI와 Copilot CLI를 실제 session digest에 연결해 finding extraction과 anchor validation을 검증했다.

이 설계에서 중요한 운영 포인트는 child harvester가 다시 Stop Hook을 실행하여 무한 재귀하지 않도록 child process의 optimizer mode 자체를 끈다는 것이다. Windows에서는 CLI마다 stdin/argument 전달 특성이 달라 prompt-file 전달까지 별도로 처리한다.

### 5. Token Accounting

이 프로젝트에서 가장 참고 가치가 높은 부분 중 하나다. 다음 수치를 구분한다.

- Observed returned context: 실제 MCP response boundary를 통과한 text의 local tokenizer 수치
- Gross verified transport reduction: 원래 materialized payload와 반환 payload의 차이
- Expansion debit: 이후 사용자가/agent가 다시 확장한 payload 비용
- Net verified MCP transport avoided: gross reduction - expansion debit

Graph reuse 추정치나 repository scan byte는 verified saving에 합치지 않는다. Provider usage가 존재하면 uncached input, cache creation, cache read, output도 분리한다. 즉 **"줄인 byte"와 "실제 provider 비용"을 같은 숫자로 취급하지 않는다.**

## 아키텍처

```text
Agent Client
   │
   ├─ PreToolUse Hook ──> Router
   │                      ├─ allow unchanged
   │                      ├─ rewrite to outline/diff
   │                      └─ compact repeat output
   │
   ├─ Tool / MCP
   │      │
   │      └─ progressive result ──> optional expand
   │
   ├─ PostToolUse / Stop
   │      └─ capture / derive / harvest
   │
   ├─ Project Knowledge Graph
   │      └─ file/symbol/finding + staleness
   │
   └─ Token Ledger
          ├─ gross reduction
          ├─ expansion debit
          └─ native provider usage/cache dimensions
```

## 토큰 절감 방법론에서 배울 점

### Rewrite가 Redirect보다 싸다

Agent에게 "이 Tool 쓰지 말고 다른 Tool을 호출해"라고 시키면 한 번의 reasoning/tool round trip이 추가된다. 긴 prompt prefix를 다시 읽는 비용까지 포함하면, 줄인 payload보다 추가 turn 비용이 더 커질 수 있다. 가능한 경우 PreToolUse에서 **현재 호출을 수정한 뒤 그대로 실행**하는 편이 낫다.

### First full, repeat compact

첫 test 실패나 첫 파일 read에서 핵심 정보를 과도하게 제거하면 agent가 즉시 재실행한다. 따라서 첫 결과는 충분히 보여주고, 동일 command/file을 다시 볼 때 delta, outline, dedup을 적용하는 전략이 안전하다.

### ANSI/Presentation bytes도 비용이다

프로젝트의 debug-loop 측정에서는 Jest 출력의 ANSI escape sequence 제거만으로 상당한 token 감소가 관찰되었다. 다만 filter pipeline으로 후처리하면 exit status를 잘못 바꿀 수 있으므로, 가능하면 `NO_COLOR`처럼 **출력 원천에서 presentation noise를 생성하지 않는 방식**이 안전하다.

### MCP Tool schema도 context tax다

프로젝트의 소규모 자체 실험에서는 동일 build의 4개 저비용 task, 각 1회라는 매우 제한적인 조건에서 MCP server를 제거한 hooks-only arm이 비용을 낮췄다. 표본이 너무 작아 일반화할 수 없지만, Agent가 직접 선택할 필요가 없는 최적화 기능은 MCP Tool로 노출하지 않고 Hook/Runtime layer에 둘 가치가 있다는 PoC 가설을 제공한다.

## 장점

- 토큰 최적화를 prompt tip이 아니라 runtime interception 문제로 다룬다.
- 절감량을 gross saving만 표시하지 않고 expansion debit과 native provider usage를 분리한다.
- benchmark가 잘못되었을 때 commit에서 측정 오류와 correction을 비교적 적극적으로 공개한다.
- Claude/Codex 등 여러 client를 같은 원칙으로 지원하려 한다.
- Windows CLI prompt 전달, Hook recursion, shell exit semantics 같은 실제 운영 edge case를 많이 다룬다.

## 단점 및 한계

- 복잡도가 높다. Hook rewrite, MCP, graph, capture, harvest, benchmark가 결합되어 유지보수 비용이 작지 않다.
- 자체 benchmark가 여러 차례 측정 결함을 발견하고 수정했다. 이는 검증 태도 측면에서는 장점이지만, 과거 headline 수치를 그대로 신뢰하면 안 된다는 뜻이기도 하다.
- Knowledge graph의 실제 장기 비용 절감 효과는 아직 확정적이지 않다.
- Tool output을 자동 변경하는 기능은 잘못 구현하면 exit code, shell state, 실패 메시지를 훼손할 수 있다.
- MCP schema tax 관련 수치는 작은 자체 표본이므로 일반화할 수 없다.
- Enterprise 환경에서는 session transcript, source content, knowledge graph 저장 정책과 민감정보 경계를 별도로 검토해야 한다.

## Perforce + Claude Code + Codex 활용 아이디어

프로젝트 자체를 바로 설치하기보다 방법론을 내부 Harness에 이식할 가치가 높다.

### 바로 적용 가능

- Build/Test/`p4 diff`/`p4 describe` 결과에 ANSI 및 presentation noise 제거 옵션 적용
- 같은 command의 **첫 실행은 충분한 결과**, 반복 실행부터 delta/compact
- Token metric을 `raw saved` 하나로 두지 않고 `gross - re-expand/re-read`로 기록
- provider receipt가 있으면 uncached input / cache read / cache write / output을 따로 저장

### PoC 가치 있음

Perforce file identity를 다음처럼 만들 수 있다.

```text
FileIdentity = DepotPath + HaveRevision + ContentHash
```

동일 identity가 같은 task/session에서 재요청되면 전체 파일 대신 diff/outline을 제공한다. 파일이 open/edit/sync되어 hash나 have revision이 바뀌면 compact cache를 무효화한다.

또한 Pending CL을 graph anchor로 사용하면 다음 연결이 가능하다.

```text
Pending CL
 ├─ Depot File @ Revision
 ├─ Build/Test Evidence
 ├─ Finding / Decision
 └─ Review Result
```

이렇게 하면 Git commit 대신 Perforce CL이 durable context의 중심 식별자가 된다.

### 아이디어 참고

명시적 MCP Tool을 늘리기 전에 "이 기능을 Agent가 선택해야 하는가, 아니면 Hook이 투명하게 적용해도 되는가?"를 구분한다. 자동 formatting/output compaction/cache는 Hook layer가 더 적합할 수 있고, 실제 탐색/외부 작업처럼 모델 선택이 필요한 기능만 Tool surface에 남긴다.

## 활용 평가

**PoC 가치 매우 높음.** 제품 전체를 그대로 채택하기보다 `rewrite > redirect`, `first full → repeat compact`, `net accounting`, `tool schema tax 측정`, `content-hash 기반 staleness`를 내부 Harness의 실험 항목으로 가져오는 것이 좋다.

## 결론

Token Optimizer MCP에서 가장 중요한 것은 특정 압축 알고리즘이 아니라 **Coding Agent의 비용은 token 수뿐 아니라 turn 수, cache prefix, tool schema, 반복 read, 재확장까지 함께 측정해야 한다**는 점이다. 특히 "최적화를 위해 한 turn을 더 쓰게 만들지 말라"는 결과는 Claude Code/Codex Harness 설계에서 바로 검증할 가치가 있다.

## 참고 자료

- Repository: https://github.com/ooples/token-optimizer-mcp
- Token accounting: https://github.com/ooples/token-optimizer-mcp/blob/master/docs/TOKEN_ACCOUNTING.md
- Rewrite vs refusal commit: https://github.com/ooples/token-optimizer-mcp/commit/7072f0c1fab99711e89b48b73e761036d45af9db
- Host CLI harvest commit: https://github.com/ooples/token-optimizer-mcp/commit/1fca4e1bfd3471bf230c7558993938f7f72b0e93
