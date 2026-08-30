---
title: Claude-Mem
category: tools
tags:
  - ai
  - agent
  - claude-code
  - memory
  - context-engineering
source: https://github.com/thedotmack/claude-mem
updated: 2026-08-31
---

# Claude-Mem

> Claude Code의 도구 사용과 세션 결과를 자동 관찰·압축해 로컬 영속 메모리로 저장하고, 다음 세션에서 필요한 기억만 점진적으로 검색·주입하는 메모리 계층이다.

## 프로젝트 개요

Claude-Mem은 Claude Code 세션이 끝나면 사라지는 작업 맥락을 보존하기 위한 persistent memory compression system이다. Claude Code lifecycle hook으로 프롬프트와 도구 실행을 포착하고, 별도 worker가 이를 AI로 구조화·압축하여 SQLite에 저장한다. 이후 새 세션 시작 시 최근 맥락을 주입하거나 `mem-search` Skill/MCP를 통해 과거 작업을 검색한다.

2026-08-31 조사 기준 최신 릴리스는 v13.18.0이며, 최근에도 릴리스와 커밋이 활발하다.

## 해결하려는 문제

AI 코딩 에이전트는 세션 경계를 넘으면 이전 작업의 의도, 수정 이유, 실패 기록, 파일 관계를 다시 읽어야 한다. 단순 transcript 전체를 매번 넣으면 토큰 비용이 커지고 관련 없는 과거 정보가 context를 오염시킨다.

Claude-Mem은 다음 방식으로 이를 해결한다.

- 작업 중 발생한 tool execution을 자동 수집
- AI observer가 원시 이벤트를 observation/summary로 압축
- 세션 간 SQLite 기반 영속 저장
- 검색 결과를 한꺼번에 풀지 않고 index → timeline → detail 순으로 공개
- 새 세션에는 설정된 양의 최근 context만 자동 주입

## 핵심 기능

1. **Persistent Memory**: 세션 종료 후에도 프로젝트 맥락 유지
2. **자동 Capture**: Claude Code lifecycle hook 기반으로 별도 기록 작업 없이 수집
3. **AI Compression**: Claude Agent SDK 또는 Gemini/OpenRouter provider를 이용해 observation과 summary 생성
4. **Progressive Disclosure**: 검색 → 주변 timeline → 선택 observation 상세 조회의 단계적 retrieval
5. **Hybrid Search**: SQLite FTS5와 선택적 Chroma semantic search
6. **Web Viewer**: worker가 React 기반 실시간 memory stream UI 제공
7. **Privacy Control**: `<private>` 태그로 저장 제외 가능
8. **멀티 플랫폼 확장**: Claude Code 외 OpenCode, Antigravity, OpenClaw 통합과 Codex 관련 plugin 구조가 존재

## 아키텍처

```text
Claude Code
   │
   ├─ SessionStart ───────────────┐
   ├─ UserPromptSubmit            │
   ├─ PreToolUse(Read)            │ lifecycle hooks
   ├─ PostToolUse(*)              │
   └─ Stop ───────────────────────┘
                  │
                  v
          Claude-Mem Worker
        Express + Bun process
          │             │
          │             ├─ SSE → Web Viewer
          │             │
          v             v
     AI Observer     Search API
 Claude/Gemini/etc.      │
          │              ├─ FTS5
          v              └─ Chroma(optional)
 observation/summary      │
          └──────┬────────┘
                 v
             SQLite DB
                 │
                 ├─ next SessionStart context
                 └─ mem-search / MCP retrieval
```

### 주요 컴포넌트

- **Hooks**: Setup version check와 SessionStart/UserPromptSubmit/PreToolUse/PostToolUse/Stop lifecycle 처리
- **Worker Service**: Express HTTP API, SSE, observation 비동기 처리
- **AI Processor**: Claude Agent SDK가 기본이며 Gemini/OpenRouter도 지원
- **SQLite + FTS5**: session, prompt, observation, summary 영속 저장과 keyword 검색
- **Chroma**: 선택적 vector semantic index
- **mem-search Skill/MCP**: 과거 작업을 자연어로 검색
- **Viewer UI**: 저장된 memory와 처리 흐름 확인

### 실행 흐름

```text
1. SessionStart
   → worker 확인/시작
   → 이전 session context 주입

2. UserPromptSubmit
   → session 생성
   → raw prompt 저장

3. Tool 실행
   → PostToolUse가 이벤트 포착
   → worker에 observation 처리 요청

4. Worker
   → AI observer가 이벤트에서 structured learning 추출
   → SQLite에 observation 기록

5. Stop
   → request/completion/learning 중심 final summary 생성

6. 다음 세션
   → 최근 summary/observation 자동 주입
   → 필요하면 mem-search로 과거 memory 탐색
```

## Progressive Disclosure와 Token 관점

이 프로젝트에서 가장 참고할 만한 설계는 단순한 "memory 저장"보다 retrieval 방식이다.

MCP 검색은 대략 다음 순서를 사용한다.

```text
search
  ↓ compact result index
  약 50~100 tokens/result

timeline
  ↓ 관련 시점의 주변 맥락 확인

get_observations
  ↓ 필요한 ID만 상세 로딩
  약 500~1,000 tokens/result
```

README는 이 방식이 상세 결과를 처음부터 모두 가져오는 것보다 약 10배의 token 절감을 목표로 한다고 설명한다. 또한 mem-search Skill 방식은 MCP tool 정의를 항상 context에 올리는 방식보다 session당 약 2,250 token 절감을 주장한다. 이 수치는 프로젝트 자체 설명이므로 독립 benchmark로 보기는 어렵지만, **검색 후보를 먼저 좁히고 상세 context를 늦게 로딩한다**는 구조 자체는 재사용 가치가 높다.

## 장점

### 1. 거의 자동으로 동작

사용자가 매 세션마다 `memory.md`를 갱신하거나 요약을 지시하지 않아도 hook이 작업을 포착한다. 기억 유지가 사람의 습관에 의존하지 않는다는 점이 크다.

### 2. Transcript 저장보다 context 효율이 좋음

원시 대화 전체가 아니라 observation과 summary로 변환하고, 검색도 progressive disclosure를 사용한다. 장기 프로젝트에서 context budget 관리에 유리하다.

### 3. Local-first 저장 구조

기본 DB는 `~/.claude-mem/claude-mem.db`의 SQLite다. Cloud Sync를 쓰지 않는 기본 사용에서는 프로젝트 memory의 중심 저장소가 로컬에 있다.

### 4. 검색 가능한 작업 역사

"예전에 authentication bug를 어떻게 해결했나?" 같은 질문을 session transcript를 직접 뒤지지 않고 검색할 수 있다. 단순 memory injection보다 knowledge retrieval 계층에 가깝다.

### 5. 프로젝트 성숙도와 개발 속도

2026-08 말에도 v13.16.x → 13.17.x → 13.18.0 릴리스가 연속적으로 나왔고 Windows 안정화 등 실제 운영 문제를 빠르게 다루고 있다.

## 단점 및 한계

### 1. 시스템 복잡도가 꽤 높음

Claude Code hook만 추가되는 가벼운 plugin이 아니다. Node.js/Bun worker, SQLite, 선택적 Chroma/uv/Python 계층, AI provider, HTTP/SSE가 결합된다. memory 기능 하나 때문에 별도 daemon 수준의 운영 요소가 생긴다.

### 2. Memory 생성 자체가 AI 비용과 latency를 발생시킴

PostToolUse가 빈번하게 발생하고 worker가 AI observer를 사용한다. 압축된 context로 이후 token을 절약할 수 있지만 capture 단계의 inference 비용은 별도로 존재한다. 총비용은 작업량과 provider/model 설정에 따라 측정해야 한다.

### 3. Context 자동 주입 크기 문제

2026-08-31 현재 open issue #3802에서는 Claude Code hook output의 약 10K character 한계를 넘으면 실제 context 대신 persisted-output stub이 들어갈 수 있다는 실측 보고가 있다. 기본 observation count가 성숙한 프로젝트에서 과도할 수 있다는 주장이다. 즉 자동 memory injection은 budget 기반 selection이 아직 중요한 개선 영역이다.

### 4. Worker 안정성 이슈

최근 issue에는 worker port/liveness, 장시간 session에서 `Prompt is too long`, observer auth 실패가 memory 손실로 이어질 가능성 등이 보고되어 있다. 프로젝트가 빠르게 개선되고 있지만 daemon + observer architecture가 갖는 운영 복잡성은 분명하다.

### 5. CJK 검색 한계

Open issue #3801은 SQLite FTS5 기본 `unicode61` tokenizer 때문에 중국어 phrase 검색이 제대로 되지 않는 문제를 보고한다. 한국어도 tokenizer 특성상 별도 실사용 검증이 필요하다. Chroma semantic path를 사용하는 경우 영향이 달라질 수 있다.

### 6. 보안/Privacy 검토 필요

도구 실행과 prompt를 장기 저장하므로 회사 코드, 경로, 명령, 업무 맥락이 DB에 축적된다. `<private>` exclusion 기능이 있지만 사용자의 수동 표시만 믿기보다 Enterprise 환경에서는 저장 범위, retention, 암호화, cloud sync 여부와 provider 전송 정책을 별도로 검토해야 한다.

## Windows / Enterprise 적용성

v13.16.1은 Windows 11 실기 검증을 포함한 대규모 Windows 안정화 릴리스였다. Chroma process tree cleanup, tree-sitter.exe resolution, Windows tilde path, Git Bash preflight, PowerShell 호환 build/log 기능 등이 개선되었다.

따라서 과거보다 Windows 적용성은 크게 좋아졌지만, open issue에 worker lifecycle 관련 Windows 사례가 여전히 다수 연결되어 있어 회사 표준 도구로 즉시 배포하기보다는 PoC 후 운영 검증이 적합하다.

Enterprise에서는 특히 다음을 확인해야 한다.

- source/prompt가 observer provider로 전송되는 범위
- SQLite DB 접근 권한 및 retention
- Cloud Sync 비활성/활성 정책
- proxy 환경에서 observer 인증/통신
- plugin hook이 Claude Code 입력을 block하는 장애 가능성
- Chroma/Python/Bun 설치 허용 여부

## 활용 사례

### 장기 코드베이스 유지보수

수주~수개월 동안 반복해서 다루는 코드베이스에서 과거 수정 이유, 해결한 bug, 사용한 command, 관련 파일을 기억하게 한다.

### 세션 handoff

Claude Code를 종료하거나 context를 clear한 뒤에도 이전 작업을 다시 설명하는 비용을 줄인다.

### 반복 장애 분석

과거에 동일한 오류를 언제 어떻게 해결했는지 observation 검색으로 찾는다.

### Agent Harness의 Shared Memory

Claude-Mem 자체는 Claude Code 중심이지만, `event capture → compression → persistent store → progressive retrieval` 패턴은 멀티 에이전트 harness의 공용 memory 설계로 가져올 수 있다.

## 기존 방식과 비교

| 방식 | 장점 | 한계 |
|---|---|---|
| CLAUDE.md / 수동 memory 문서 | 단순하고 예측 가능 | 사람이 지속적으로 갱신해야 함 |
| Session transcript 전체 검색 | 정보 손실 적음 | 검색/토큰 비용이 큼 |
| Vector DB RAG | semantic retrieval 강함 | 무엇을 저장·요약할지 별도 pipeline 필요 |
| Claude-Mem | capture부터 compression/retrieval까지 자동화 | worker와 AI observer 운영 복잡성 |

Claude-Mem의 차별점은 "vector memory DB" 자체보다 **Claude Code lifecycle에 붙어 memory 생성 과정을 자동화한 것**에 있다.

## 활용 아이디어

### 바로 적용 가능 — 개인 Claude Code 장기 프로젝트

장기간 유지하는 repository에서 세션 continuity를 개선하려는 용도에는 직접 설치해 시험할 가치가 높다. 다만 context observation 수는 기본값을 그대로 신뢰하기보다 실제 hook output과 token을 보면서 조정하는 편이 좋다.

### PoC 가치 있음 — Windows 개발 환경

Windows 안정화가 크게 진행되었으므로 Windows 11 개발 PC에서 PoC할 시점은 됐다. worker 재시작, PC sleep/wake, plugin update, proxy, 한글 검색을 포함한 테스트가 필요하다.

### PoC 가치 높음 — 자체 AI Harness memory 계층

프로젝트를 그대로 도입하는 것보다 다음 설계를 참고할 가치가 특히 높다.

```text
Agent Tool Events
      ↓
Observation Queue
      ↓
Cheap Observer Model
      ↓
Structured Memory Store
      ↓
Search Index
      ↓
Progressive Retrieval
      ↓
Orchestrator / Worker / Reviewer
```

핵심은 모든 history를 다음 agent에 넘기지 않고 `search index → timeline → selected details`로 context를 전달하는 것이다. 장기 실행 harness에서 token 증가를 억제하는 좋은 패턴이다.

### 아이디어 참고 — Task Observer와 결합

별도 observer가 agent의 행동을 평가/기록하는 구조를 설계한다면 Claude-Mem의 PostToolUse capture와 AI compression pipeline을 참고할 수 있다. Observer 결과까지 persistent observation으로 남기면 "작업 기억"과 "품질/실패 기억"을 함께 축적할 수 있다.

## 도입 판단

**평가: PoC 가치 높음.**

단순 Claude Code plugin 관점에서도 유용하지만, 더 큰 가치는 **에이전트가 장기간 작업하면서 memory를 어떻게 수집하고, 압축하고, 필요할 때만 다시 꺼낼 것인가**에 대한 구현 사례라는 점이다.

개인 개발 환경에는 바로 시험해볼 수 있다. 반면 조직 공통 개발환경에 넣을 경우 observer 비용, 민감정보 저장, worker 안정성, proxy/Windows lifecycle을 검증한 뒤 도입하는 것이 적절하다.

## 참고 자료

- Repository: https://github.com/thedotmack/claude-mem
- Documentation: https://docs.claude-mem.ai/
- Architecture: https://docs.claude-mem.ai/architecture/overview
- Search Tools: https://docs.claude-mem.ai/usage/search-tools
- Latest checked release: v13.18.0 (2026-08-29)
- Windows stabilization: v13.16.1
- Relevant open issues: #3802 context injection budget, #3801 CJK FTS5, #3800 long-running observer prompt growth, #3795 auth failure durability, #3603 worker liveness
