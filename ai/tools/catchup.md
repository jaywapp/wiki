# CatchUp

> Claude Code, Codex, Cursor 등 서로 다른 AI 코딩 에이전트 사이에서 이전 세션의 대화 컨텍스트를 복구·검색·인계하는 local-first CLI

- Repository: https://github.com/wilbeibi/catchup
- 라이선스: MIT
- 구현: Go
- 성격: Coding Agent Session Context Handoff CLI
- 최신 확인 버전: v0.5.1 (2026-07-22 릴리스)

## 한 줄 요약

CatchUp은 **AI 코딩 에이전트를 교체하거나 세션 컨텍스트가 소진됐을 때, 이전 작업 맥락을 다시 설명하지 않고 이어서 작업하도록 돕는 도구**다.

Claude Code에서 작업하다 사용량 제한에 걸렸다면 로컬에 저장된 Claude 세션을 읽어 깨끗한 Markdown 대화로 만들고, Codex를 그 컨텍스트로 시작할 수 있다.

```text
Claude Code session
      │
      ▼
   catchup
      │
      ├─ recap/search → Markdown
      │
      ├─ native fork → Claude Code
      │
      └─ transcript handoff → Codex / Cursor / Cline / Kimi / ...
```

즉, 새로운 Agent Runtime이나 Orchestrator라기보다는 **기존 에이전트들의 세션 저장소 위에 올라가는 Context Handoff Layer**다.

---

## 왜 필요한가

AI 코딩 도구를 여러 개 병행하면 보통 다음 문제가 생긴다.

1. Claude Code에서 진행하던 작업이 사용량 제한에 걸린다.
2. Codex로 이동한다.
3. 지금까지 무엇을 했는지 다시 설명한다.
4. 수정한 파일, 결정 사항, 남은 작업을 다시 탐색한다.
5. 컨텍스트 복구 자체에 토큰과 시간이 소비된다.

CatchUp은 3~4번 과정을 자동화한다.

```bash
catchup fork claude --into codex
```

이 명령은 Claude Code의 로컬 세션을 찾아 필요한 대화를 추출한 뒤 Codex를 해당 transcript와 함께 시작한다.

---

## 지원 에이전트

README 기준 지원 대상은 다음과 같다.

- Claude Code
- Codex
- Cursor
- Cline
- Kimi
- Antigravity
- OpenCode
- Pi Agent
- ZCode
- DeepSeek Harness

코드 구조도 `internal/claude`, `internal/codex`, `internal/cursor`, `internal/cline`, `internal/kimi` 등 에이전트별 adapter가 분리되어 있다.

---

## 핵심 기능

### 1. 최근 세션 목록

```bash
catchup --list
```

현재 디렉터리를 기준으로 여러 에이전트의 최근 세션을 확인한다.

특정 에이전트만 보려면:

```bash
catchup claude --list
catchup codex --list
```

### 2. 이전 세션 읽기

```bash
catchup claude
```

Claude Code의 로컬 세션을 읽어 사람이 읽기 쉬운 Markdown으로 출력한다.

전체 tool call, reasoning trace, command output을 그대로 덤프하는 것이 아니라 **대화 중심으로 정제된 결과**를 만든다.

### 3. Compaction 이후 부분만 복구

```bash
catchup claude --since-compact
```

컨텍스트 compaction 이후의 마지막 작업 구간만 읽는다.

에이전트 Skill에서도 기본적으로 `--since-compact` 사용을 권장한다.

컨텍스트가 커졌을 때 전체 과거 대화를 다시 넣는 것보다 효율적이다.

### 4. 최근 N개 대화만 가져오기

```bash
catchup claude --last 20
```

전체 transcript가 필요하지 않을 때 최근 exchange만 가져올 수 있다.

### 5. 키워드로 과거 세션 찾기

```bash
catchup claude -q "auth"
```

오래된 세션 중 특정 주제와 관련된 작업을 검색할 수 있다.

또는 순번/ID를 직접 지정한다.

```bash
catchup claude/3
catchup claude --id <session-id>
```

### 6. 같은 에이전트에서 native fork

```bash
catchup fork claude
```

같은 에이전트에서 작업을 계속할 경우 transcript를 새로 주입하기보다 해당 Agent의 native resume/fork 기능을 사용한다.

장점은 **원래 세션 상태를 최대한 유지한다는 것**이다.

### 7. 다른 에이전트로 handoff

```bash
catchup fork claude --into codex
```

Claude Code 세션을 Markdown transcript로 변환한 뒤 Codex를 새 세션으로 시작한다.

반대 방향도 가능하다.

```bash
catchup fork codex --into claude
```

이 기능이 CatchUp의 핵심 사용 사례다.

---

## native fork와 cross-agent handoff의 차이

| 방식 | 명령 | 세션 상태 | 용도 |
|---|---|---|---|
| Same-agent native fork | `catchup fork claude` | 원래 native session state 유지 | 같은 Agent에서 계속 |
| Cross-agent handoff | `catchup fork claude --into codex` | transcript로 새 Agent를 seed | 다른 Agent로 이동 |
| Same-agent clean restart | `catchup fork claude --into claude --since-compact` | native state 없이 정제 transcript로 재시작 | 컨텍스트가 너무 커졌을 때 |

중요한 점은 cross-agent handoff가 **Claude의 내부 session state를 Codex가 그대로 사용하는 방식은 아니라는 것**이다.

CatchUp이 공통 포맷인 대화 transcript를 중간 계층으로 사용한다.

---

## 외부 transcript에서 시작

CatchUp v0.4부터 로컬 agent session이 아닌 일반 파일, stdin, URL도 handoff source로 사용할 수 있다.

```bash
catchup fork --into codex --from handoff.md
```

파이프도 가능하다.

```bash
cat handoff.md | catchup fork --into claude --from -
```

따라서 CatchUp은 단순 session parser뿐 아니라 **일반적인 agent handoff 문서 launcher**로도 쓸 수 있다.

---

## 다른 디렉터리 / Worktree

CatchUp의 세션 선택은 기본적으로 작업이 실행된 디렉터리와 연결된다.

새 Git worktree에서 원본 workspace의 세션을 이어가고 싶다면:

```bash
catchup fork claude --dir <original-path>
```

예를 들어:

```text
repo/
  main workspace       ← 기존 Claude 세션
repo-fix/
  git worktree         ← 새 작업 위치
```

새 worktree에서도 `--dir`로 원래 세션 위치를 지정할 수 있다.

---

## Skill 지원

저장소에는 `SKILL.md`가 함께 제공된다.

```bash
catchup install-skill
```

또는 특정 에이전트만 설치할 수 있다.

```bash
catchup install-skill claude
```

Skill이 설치되면 사용자가 다음과 같이 요청했을 때 Agent가 CatchUp을 직접 활용하도록 유도할 수 있다.

```text
catch up on the last session
what did the last session do?
get me up to speed
I switched agents
```

Skill의 역할은 크게 세 가지로 정리된다.

```text
RECAP    이전 세션 읽기
FIND     필요한 세션 검색
HANDOFF  같은/다른 에이전트로 작업 이어가기
```

---

## 설치

### Homebrew

```bash
brew install wilbeibi/tap/catchup
```

### Go

```bash
go install github.com/wilbeibi/catchup@latest
```

### Linux/macOS prebuilt binary

```bash
curl -fsSL https://raw.githubusercontent.com/wilbeibi/catchup/main/scripts/install.sh | sh
```

Windows는 GitHub Releases에서 prebuilt binary를 제공한다.

---

## Local-first 설계

CatchUp의 중요한 특징 중 하나는 **세션 복구를 위해 별도 클라우드 서비스를 필요로 하지 않는다는 것**이다.

각 coding agent가 로컬에 저장하는 session/history 데이터를 읽는다.

```text
Agent local session
      ↓
CatchUp parser
      ↓
normalized conversation
      ↓
Markdown / JSON / HTML
```

지원 출력 포맷:

```bash
catchup claude
catchup claude --json
catchup claude --html
```

따라서 사내 코드나 대화 기록을 별도의 SaaS session broker에 업로드하지 않고도 handoff 계층을 만들 수 있다는 장점이 있다.

---

## 제한 사항

CatchUp이 모든 Agent 상태를 완전히 이동시키는 것은 아니다.

### 1. 대화 중심

출력에서는 tool call, command output, reasoning trace 등을 제거한다.

따라서 외부 Agent로 이동할 때 실제 shell process나 tool runtime 상태까지 넘어가는 것은 아니다.

### 2. 한 번에 하나의 Agent history

여러 Agent의 history를 자동 merge하는 orchestration 도구가 아니다.

### 3. Cross-agent는 transcript seed

Claude session을 Codex native session으로 변환하는 것이 아니다.

공통 transcript를 만들어 새 Agent에게 초기 컨텍스트로 제공한다.

### 4. 로컬 경로 의존성

세션은 작업 디렉터리 기준으로 연결되는 경우가 있으므로 workspace 이동, re-clone, worktree에서는 `--dir`가 필요할 수 있다.

---

## 실전 사용 패턴

### 패턴 A — Claude 사용량 제한 → Codex

```bash
catchup fork claude --into codex
```

가장 대표적인 패턴이다.

```text
Claude Code
  ↓ usage limit
CatchUp
  ↓ transcript
Codex
  ↓ continue work
```

### 패턴 B — Codex에서 Claude로 리뷰 넘기기

```bash
catchup fork codex --into claude
```

Codex에서 구현 후 Claude 쪽에서 계속 수정하거나 리뷰할 때 사용할 수 있다.

### 패턴 C — Context가 너무 커진 Claude 세션 정리

```bash
catchup fork claude --into claude --since-compact
```

기존 native state를 버리고 필요한 최근 대화만 포함한 깨끗한 Claude 세션을 시작한다.

### 패턴 D — 예전 작업 다시 찾기

```bash
catchup claude -q "perforce"
```

검색 결과에서 원하는 session ID를 선택한 뒤:

```bash
catchup claude --id <id>
```

### 패턴 E — handoff 문서 기반 실행

```bash
catchup fork --into codex --from task-handoff.md
```

에이전트가 만든 작업 인계 문서를 다른 에이전트의 시작점으로 사용할 수 있다.

---

## 현재 평가

CatchUp의 장점은 기능 범위가 매우 명확하다는 점이다.

### 장점

- Claude Code ↔ Codex 등 Agent 전환 비용 감소
- 별도 server/database 없이 local-first
- 기존 Agent의 native session 저장소 활용
- 같은 Agent는 native fork 지원
- 다른 Agent는 공통 transcript 방식으로 호환
- session 검색 기능 제공
- context compaction 이후 부분만 추출 가능
- Skill 설치 지원
- Worktree 환경 대응
- 일반 파일/stdin/URL도 handoff source로 사용 가능

### 아쉬운 점

- 실행 중인 프로세스/tool state까지 이동하지는 못함
- 여러 Agent 작업 history를 자동 병합하지 않음
- session format이 각 Agent 버전에 따라 바뀌면 adapter 유지보수가 필요함
- cross-agent handoff 품질은 결국 transcript가 필요한 정보를 얼마나 잘 보존하느냐에 의존함

---

## AX 관점에서의 포지션

CatchUp은 다음 영역에 위치한다.

```text
Coding Agent
   │
   ├─ Claude Code
   ├─ Codex
   ├─ Cursor
   └─ ...
         │
         ▼
     CatchUp
   Session Handoff Layer
```

즉 다음과 구분해서 보는 것이 좋다.

- Agent Harness: 실제 작업 수행 제어
- Orchestrator: 여러 Agent/Task를 분배·조정
- Scheduler: 작업 실행 시점 관리
- CatchUp: **이미 존재하는 Agent session의 context 복구·이동**

기능이 좁은 대신 기존 개발 환경에 끼워 넣기 쉽고, 여러 코딩 에이전트를 병행하는 환경에서 효과가 크다.

---

## 참고

- GitHub: https://github.com/wilbeibi/catchup
- Releases: https://github.com/wilbeibi/catchup/releases
- SKILL.md: https://github.com/wilbeibi/catchup/blob/main/SKILL.md
- herdr plugin: https://github.com/wilbeibi/herdr-catchup
