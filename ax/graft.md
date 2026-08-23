# Graft

> 태그: `AI Agent`, `Coding Agent`, `Codebase Context`, `Knowledge Graph`, `Claude Code`, `Codex`, `MCP`, `Token Optimization`, `tree-sitter`

## 한줄 요약

Graft는 코드베이스의 구조·호출 관계·의미를 로컬 Context Graph로 만들어 Claude Code, Codex, Cursor, Gemini 같은 코딩 에이전트가 매 세션마다 저장소를 처음부터 재탐색하는 비용을 줄이는 오픈소스 도구다.

## 프로젝트 개요

- 프로젝트: NanoNets/Graft
- 패키지: `@nanonets/graft`
- 현재 확인 버전: 0.8.2
- 라이선스: MIT
- 런타임: Node.js 20+
- 구현: TypeScript + tree-sitter
- 핵심 산출물: `graft/` 로컬 그래프 캐시와 `graft/.graph/wiring.json`
- 통합 대상: Claude Code, Codex/AGENTS 계열, Cursor, Gemini, GitHub Copilot, Kiro, Windsurf 등

핵심 포지션은 **Coding Agent용 Codebase Memory / Context Layer**다. 임베딩과 Vector DB를 중심으로 한 전통적인 Code RAG와 달리, 구조 그래프와 사람이 읽을 수 있는 Markdown 노드를 사용한다.

## 해결하려는 문제

Coding Agent는 새 작업을 받을 때마다 `grep → file open → import/call 추적 → 관련 파일 재탐색`을 반복한다. 이전 세션에서 이미 파악한 코드 구조가 다음 세션에 충분히 재사용되지 않기 때문에 Tool Call, 입력 Token, 지연시간과 비용이 누적된다.

Graft는 저장소를 한 번 구조화해 이후 작업에서 재사용 가능한 그래프로 제공함으로써 에이전트의 반복적인 '코드베이스 재온보딩' 비용을 줄인다.

## 핵심 기능

### 1. 구조 그래프 + 의미 그래프

기본 `graft build`는 tree-sitter로 함수, 클래스, import, call edge 등을 분석해 per-symbol 구조 그래프를 만든다. 이 단계는 결정론적이며 LLM/API Key가 필요 없다.

선택적 `graft build --deep`은 LLM을 이용해 파일 요약, 개념 노드, symbol summary와 핵심 코드(crux)를 추가한다.

### 2. Markdown Context Graph

시스템·API·개념을 연결된 Markdown node로 표현한다. 각 node에는 Summary, Crux, Sources, typed links(`depends_on`, `part_of`, `uses`, `implements`, `produces`)와 사용자가 직접 적는 Notes가 들어갈 수 있다.

### 3. 증분 갱신

분석 결과를 content hash로 캐시한다. 변경된 파일만 다시 처리하며, `ask`, `grep`, `callers`, `skeleton`, `map` 같은 retrieval 명령은 working tree 변경 여부를 먼저 확인해 구조 그래프를 갱신한다. 이 자동 refresh 자체는 LLM을 호출하지 않는다.

### 4. CLI 탐색

주요 명령은 다음과 같다.

- `graft ask`: 질문과 관련된 node/code 탐색
- `graft skeleton`: 함수 body 없이 파일 API surface 확인
- `graft callers`: symbol의 caller/callee 및 transitive blast radius 추적
- `graft grep`: symbol 문맥을 포함한 regex 검색
- `graft map`: 저장소의 directory cluster, hub, hotspot 파악
- `graft blast`: diff가 영향을 줄 수 있는 영역 분석
- `graft check`: 코드와 graph의 drift 검사
- `graft viz`: 그래프 시각화

### 5. MCP Server

`graft init`으로 MCP를 지원하는 Agent에 연결할 수 있다. 대표 도구는 `graft_find_code`, `graft_file_api`, `graft_trace_calls`, `graft_find_all`, `graft_repo_map`, `graft_check_freshness`다.

### 6. Claude Code Deep Integration

Claude Code에는 skill뿐 아니라 statusline, hook, prompt별 관련 node context, edit 후 blast-radius 경고, background graph sync가 연결된다. 기존 `CLAUDE.md`를 덮어쓰지 않고 Graft 소유 설정을 별도로 관리한다.

### 7. 다양한 Agent 연결

`graft init`은 Agent별 native instruction을 사용한다.

- Codex/OpenCode 계열: `AGENTS.md`
- Claude Code: `.claude/skills/graft/SKILL.md`
- Cursor: `.cursor/rules/graft.mdc`
- Gemini: `GEMINI.md`
- Copilot: `.github/copilot-instructions.md`
- Kiro/Windsurf 등: 전용 rule/steering 파일

Codex 선택 시 user-level `~/.codex/config.toml`, hook 설정도 구성할 수 있으므로 `graft init --dry-run`으로 변경 파일을 먼저 확인하는 것이 안전하다.

## 아키텍처

```text
Source Repository
   │
   ├─ tree-sitter (Tier 1, deterministic, $0)
   │      └─ symbols / imports / calls
   │             └─ graft/.graph/wiring.json
   │
   └─ optional --deep
          ├─ Pass 1: LLM file summaries
          └─ Pass 2: concept grouping + typed links
                    └─ graft/*.md
                           │
             ┌─────────────┼──────────────┐
             ▼             ▼              ▼
           CLI            MCP        Agent Hooks
      ask/map/blast   find/trace...  Claude/Codex/...
```

구조 정보는 tree-sitter가 담당하고 의미 요약은 선택적으로 LLM이 담당하는 **Hybrid Code Graph** 구조다. `graft/`는 Git에 커밋하는 문서가 아니라 개발자별 재생성 가능한 로컬 캐시이며 Agent wiring만 저장소에서 공유한다.

## 지원 언어

Full-fidelity 계층은 TypeScript/JavaScript, Python, Go, Java를 지원한다. Broad tree-sitter 계층에는 Rust, C, C++, C#, Ruby, PHP, Kotlin, Scala, Swift, Elixir, Solidity, OCaml, Zig, Dart, Clojure 등이 포함된다.

일부 언어는 `--lsp`를 통해 rust-analyzer, clangd, gopls, pyright, typescript-language-server 기반의 더 정밀한 call edge를 선택적으로 추가할 수 있다. 따라서 C++/C#도 분석 대상이지만 TS/Python/Go/Java와 동일한 정밀도라고 가정하면 안 된다.

## 장점

### 반복 탐색과 Token 낭비 감소

Graft가 공개한 162-run controlled benchmark에서는 Cold Claude Code 대비 Token 42%, Tool Call 46%, latency 60% 감소하면서 correctness는 93%로 동일했다. SWE-bench Verified 50개 instance 실험에서는 54%에서 66%로 해결률이 올라가고 Token 23%, Tool Call 25%, wall-clock 32% 감소했다고 보고한다.

다만 프로젝트 자체가 수행한 benchmark이므로 실제 사내 monorepo에서는 별도 A/B 검증이 필요하다.

### Vector DB/Embedding 인프라 불필요

별도 검색 서버나 Vector DB를 운영하지 않아도 된다. 결과가 파일과 JSON이므로 관찰·디버깅하기 쉽다.

### 구조 정보와 의미 정보 분리

LLM이 없어도 symbol/call graph를 만들 수 있고, 필요할 때만 Deep Build로 의미 정보를 추가한다. 비용과 정확성의 경계를 관리하기 좋다.

### Agent 독립성

Claude Code에 가장 깊게 통합되지만 Codex, Cursor, Gemini 등 여러 Agent가 같은 Codebase Context Layer를 사용할 수 있다.

### Working Tree 기준 Freshness

commit 여부와 무관하게 현재 working-tree byte를 기준으로 변경을 감지하므로 Agent가 방금 수정한 코드도 구조 탐색에 반영할 수 있다.

### Blast Radius 분석

단순 검색뿐 아니라 caller graph와 diff 기반 영향 범위를 Agent에게 제공한다는 점이 실무적으로 강하다. 대규모 수정에서 '한 파일만 고치고 sibling/consumer를 놓치는' 문제를 줄이는 방향이다.

## 단점 및 한계

### Deep Build의 비용과 hallucination 가능성

자연어 Summary/Concept node는 LLM 생성물이므로 실제 코드 의미를 잘못 요약할 가능성이 있다. 구조 edge와 LLM summary의 신뢰도를 구분해야 한다.

### 언어별 분석 품질 차이

21개 언어를 지원하지만 full-fidelity와 broad-tier의 정밀도는 다르다. 특히 대규모 C++/C#/UE 프로젝트에서는 실제 call resolution 품질을 검증해야 한다.

### 로컬 캐시 중심

`graft/`가 기본적으로 `.gitignore`되는 개발자별 cache이므로 완성된 semantic graph를 팀 전체가 Git artifact로 공유하는 구조는 아니다.

### 기존 Agent 기능과 중복

Agent 자체 code search, LSP, repo map, memory/context tool을 이미 사용하는 환경에서는 기능이 일부 겹친다. Graft가 추가한 context가 오히려 prompt를 불필요하게 키우는지도 측정해야 한다.

### 초기/Deep 분석 비용

대형 repository에서 최초 Deep Build는 파일별 LLM 요약 때문에 시간과 API 비용이 발생한다. 증분 cache가 이를 줄이지만 최초 도입 비용은 존재한다.

### Machine-wide 설정 주의

Codex integration 일부는 `~/.codex/`를 수정할 수 있다. 여러 repository와 Agent 설정을 엄격하게 분리하는 환경에서는 `--dry-run`, `--no-global`, `--no-mcp`, `--no-hooks` 옵션을 검토해야 한다.

## 기존 도구와 비교

| 방식 | 핵심 Context | 저장 | 강점 | 약점 |
|---|---|---|---|---|
| Graft | AST/call graph + 선택적 LLM 의미 요약 | 로컬 Markdown/JSON graph | 구조 관계, 투명성, 다중 Agent, 증분 갱신 | 언어별 품질 차이, Deep 비용 |
| Vector Code RAG | chunk embedding | Vector DB | 대규모 semantic retrieval | 구조 관계/호출 관계가 약할 수 있음, 별도 인프라 |
| AGENTS.md / CLAUDE.md | 사람이 작성한 규칙/지식 | Git | 정확한 정책 전달 | 코드 변화 자동 추적 어려움 |
| Agent 기본 Search | 실시간 grep/open | session context | 설정 불필요 | 세션마다 반복 탐색 |
| LSP/IDE Index | symbol/reference/type | IDE index | 정밀한 코드 탐색 | 시스템의 의미/개념 설명 부족 |
| Session Memory 도구 | 이전 작업/대화 요약 | 별도 memory | 작업 연속성 | repository 전체 구조 이해와는 다른 문제 |

Graft는 **LSP/정적 분석과 Semantic Code RAG 사이**, 그리고 **AGENTS.md와 Agent session memory 아래쪽**에 위치하는 repository-memory 계층으로 보는 것이 적절하다.

## 활용 사례

- 대규모/Legacy repository에서 Coding Agent의 초기 탐색 단축
- Claude Code와 Codex를 병행하는 Multi-Agent 개발
- 버그 수정/리팩터링 시 caller와 blast radius 확인
- 반복 작업에서 codebase onboarding token 절감
- 신규 개발자와 Agent가 함께 사용하는 repository map
- PR/CI에서 diff 영향 범위를 Markdown/JSON으로 산출

## 내가 활용할 수 있는 아이디어

### 1. Claude Code + Codex 공통 Context Layer PoC

동일 repository에서 두 Agent가 각자 전체 코드를 재탐색하지 않도록 Graft를 공통 구조 이해 계층으로 둔다.

```text
              Graft
           Code Graph
          /          \
 Claude Code        Codex
      \              /
          Repository
```

### 2. 실제 사내 저장소 A/B Test

공개 benchmark 대신 실제 업무 repository에서 Cold Agent와 Graft Agent를 비교한다.

측정값은 Task당 input/cache token, tool-call 수, 최초 유효 수정까지 시간, 총 작업시간, 수정 파일 누락률, build/test 성공률, 리뷰 재작업 횟수가 적합하다.

### 3. C++/UE 프로젝트 적합성 검증

C++은 broad-tier이며 clangd를 이용한 LSP edge를 추가할 수 있다. UE처럼 macro/reflection이 많은 코드에서는 작은 module을 골라 `graft build --lsp` 전후의 caller/blast 결과를 실제 IDE reference 결과와 비교하는 PoC가 필요하다.

### 4. Token 최적화 계층화

```text
Cheap/local LLM → Graft Deep Build
                      ↓
               Repository Context
                      ↓
             Expensive Coding Agent
```

저가/로컬 모델은 장기 재사용되는 summary 생성에 사용하고, 상위 모델은 실제 설계·구현·검증에 집중시키는 방식이다.

### 5. Context 책임 분리

```text
Repository 구조/의미 : Graft
Project 정책/규칙    : AGENTS.md / CLAUDE.md
Task/Session 인계     : session memory/handoff
실제 추론/수정        : Claude Code / Codex
```

모든 기억을 하나의 거대한 instruction 파일에 넣기보다 책임을 분리할 수 있다.

### 6. 변경 영향도 Review Gate

`graft blast --base origin/main --format markdown/json`을 PR pipeline에 붙여 변경 영향 영역을 자동 산출하고, Agent review가 해당 consumer/sibling까지 확인했는지 검사하는 보조 gate로 활용할 수 있다.

## 도입 추천 순서

1. `npx @nanonets/graft init --dry-run`으로 변경 범위 확인
2. 작은 실제 repository에서 structural build만 적용
3. `map`, `callers`, `blast`, MCP의 정확성 확인
4. Claude Code/Codex 각각 Cold vs Graft A/B Test
5. 효과가 확인되면 `--deep`과 저가 모델 조합 테스트
6. C++/UE는 `--lsp`까지 포함해 별도 정확성 검증
7. 검증 후 팀 공통 Agent wiring만 Git에 반영

## 참고 링크

- https://github.com/NanoNets/Graft
- npm: `@nanonets/graft`

## 검토 시점

2026-08-24 기준 공개 저장소 README 및 package metadata를 기준으로 정리.