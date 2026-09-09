---
title: Spotify Agent Architecture
category: harness
tags:
  - ai
  - agent
  - claude-code
  - token-optimization
  - model-routing
  - shunt
  - portal
source: https://github.com/spotify/portal-ai-plugins
updated: 2026-09-09
---

# Spotify Agent Architecture

> Spotify의 Shunt는 고성능 메인 에이전트의 컨텍스트를 추론에 집중시키고, 대용량 I/O와 예측 가능한 코드 생성을 저비용 AiKA worker로 라우팅하며, 이 정책을 PreToolUse Hook으로 강제하는 토큰 최적화 harness다.

## 프로젝트 개요

Spotify가 `spotify/portal-ai-plugins`를 Apache-2.0으로 공개했다. 저장소는 Spotify Portal을 Claude Code, Codex, Cursor에 연결하는 플러그인 marketplace이며, Portal CLI 인증·카탈로그/문서 검색·서비스 브리핑·진단·Portal action 호출 workflow를 제공한다.

이 중 **shunt**는 현재 Claude Code 전용 플러그인으로, 대용량 파일 읽기와 boilerplate 생성 같은 I/O-heavy 작업을 Portal CLI actions registry를 통해 AiKA mode에 위임한다.

## 해결하려는 문제

AI coding agent의 비용은 복잡한 추론뿐 아니라 대량 파일 읽기, 반복적인 코드 생성, 원문이 대화 context에 계속 남는 데서 발생한다. 단순히 CLAUDE.md에 '큰 파일은 작은 모델에 맡겨라'고 적으면 agent가 지침을 놓칠 수 있다.

Shunt는 라우팅 정책을 모델 밖의 Hook으로 옮겨 large read를 실제로 차단하고 worker 경로를 사용하게 만든다.

## 핵심 기능

- `portal`: Portal CLI setup/auth, doctor, catalog/docs search, service briefing, actions, feedback workflow
- `shunt`: bulk read와 boilerplate generation을 worker로 위임
- Claude Code / Codex / Cursor용 plugin metadata 제공 (`shunt`는 현재 Claude Code only)
- Portal actions 호출 전 help/dry-run/confirmation safeguard
- worker mode 이름을 server-side에서 resolve하고 필요하면 mode id로 pin 가능

## 아키텍처

```text
User Request
    |
    v
Main Agent (Claude Code)
    |
    | Tool Call
    v
PreToolUse Hooks  <--- Enforcement Layer
    |
    +-- targeted/small read ----------> normal tool execution
    |
    +-- large read (> threshold) -----> BLOCK
                                        |
                                        v
                                      Skill
                                        |
                                        v
                                      Script
                                        |
                                        v
                              Portal CLI Actions Registry
                                        |
                                  aika:invoke-chat
                                        |
                                   AiKA Mode
                                   /       \
                          bulk-reader   code-writer
                              |             |
                     structured result   direct-to-disk
                              |
                              v
                         Main Context
```

### 1. Hooks — 강제 정책

`shunt`는 Claude Code PreToolUse Hook을 사용한다.

- `check-file-size`: 기본 350줄을 넘는 full `Read`를 차단
- offset/limit targeted read는 허용
- `check-bash-read`: `cat`, `head`, `tail`, `less`, `more`를 통한 우회도 검사
- pipe/redirection/targeted flag처럼 context로 전체 파일을 넣지 않는 경우는 허용
- threshold는 `SHUNT_MIN_LINES`로 조정

핵심은 **prompt는 suggestion이고 hook은 architecture**라는 점이다.

### 2. Scripts — 전송 배관

- `scripts/lib/aika.sh`: 공통 `aika:invoke-chat` transport
- `bulk-read`: 파일을 XML `<file path="...">` 경계로 감싸 worker에 전달
- `code-write`: spec + reference를 worker에 전달하고 markdown fence를 제거하며 `--target`으로 disk 직접 기록 가능

Claude가 자연어로 bash pipeline을 즉석 조립하지 않고 named arguments를 가진 script를 호출하게 만든 것도 안정성 측면에서 중요하다.

### 3. Skills — soft routing

- `bulk-reader/SKILL.md`
- `code-writer/SKILL.md`

Skill은 언제 위임할지 설명한다. bulk read는 Hook이 강제하지만 code writer는 강제 Hook이 없고 Skill 판단에 의존한다.

## 실행 특성

`aika:invoke-chat` 호출은 one-shot/ephemeral이다. 서버에 대화를 유지하지 않으며 Shunt도 이전 worker turn을 replay하지 않는다. 같은 corpus를 다시 보낼 수 있지만 그 corpus는 worker context에만 들어가므로 main Claude context를 오염시키지 않는 것이 설계의 핵심이다.

Mode 이름은 server-side에서 case-insensitive로 resolve하며 본인 mode → group mode → public mode 순으로 선호한다. 이름이 모호하면 실패하고 candidate id를 반환하며, 환경변수로 특정 mode id를 pin할 수 있다.

## 라우팅 규칙

```text
READ
 |
 +-- Offset/Limit 지정? ------ YES --> Main Agent targeted read
 |
 +-- 파일 <= 350 lines? ------ YES --> Main Agent direct read
 |
 +-- 파일 > 350 lines? ------- YES --> BLOCK --> bulk-reader

GENERATION
 |
 +-- 반복적/패턴 기반 boilerplate? --> code-writer
 |
 +-- architecture/reasoning/edit? ---> Main Agent
```

350줄은 기본값일 뿐이며 환경별 튜닝이 필요하다.

## Worker 구성

### bulk-reader

대형 파일 또는 여러 파일을 질문과 함께 worker context에서 처리하고 필요한 구조화 결과만 main context로 반환한다. 권장 출력은 짧은 bullet, 정확한 identifier/위치 중심이며 불필요한 prose와 원문 복제를 피한다.

### code-writer

테스트, config scaffolding, type stub 등 패턴 기반 생성을 위임한다. `--reference`가 필수라서 기존 프로젝트 convention을 기준으로 생성하도록 강제한다. 결과는 stdout 또는 target file로 직접 기록할 수 있다.

## 메인 모델이 직접 처리해야 할 영역

- debugging 및 복잡한 reasoning
- architecture decision
- precise editing
- 작은 파일/작업
- worker summary만으로 수행하는 정확한 코드 수정

수정이 필요하면 worker summary로 위치를 좁힌 뒤 main agent가 offset/limit targeted read로 실제 코드를 확인하는 방식이 적합하다.

## 설정

주요 환경변수:

| 변수 | 기본값 | 목적 |
|---|---:|---|
| `SHUNT_MIN_LINES` | `350` | large-read 기준 |
| `SHUNT_PORTAL_INSTANCE` | CLI default | Portal instance |
| `PORTAL_CLI_BIN` | `portal-cli` 또는 `npx` | CLI 실행 방식 |
| `SHUNT_MAX_PAYLOAD_BYTES` | macOS 400000 / Linux 120000 | argv payload ceiling |
| `SHUNT_TIMEOUT_SECONDS` | `180` | worker 호출 timeout |
| `SHUNT_BULK_READER_MODE_ID` | - | bulk mode pin |
| `SHUNT_CODE_WRITER_MODE_ID` | - | writer mode pin |

## Benchmark

공개 README의 162K-line Java monorepo 측정:

| Scenario | Lines | Without | With Shunt | Savings |
|---|---:|---:|---:|---:|
| Single large file | 4,014 | 33,684 tokens | 5,737 | 82% |
| Source + test pair | 7,408 | 75,990 | 4,148 | 94% |
| Multi-file cross-service | 1,281 | 16,221 | 821 | 94% |
| Code-write | 3,667 | 40,614 tokens + generation | 833 lines to disk | - |

README가 보고하는 bulk-read 평균 절감은 **90%**다. 이는 특정 benchmark/workload 결과이지 모든 코드베이스에서 보장되는 수치는 아니다.

## 검증 구조

저장소에는 hook/transport/end-to-end 평가가 포함된다.

```text
evals/
├── hook-evals.json          # Read hook 17
├── bash-hook-evals.json     # Bash hook 17
├── transport-evals.sh       # transport 17
├── evals.json               # end-to-end skill 3
└── benchmarks.json          # token scenarios 4
```

Hook + transport 기준 51개 테스트를 제공한다는 점은 단순 prompt recipe보다 재현 가능한 harness 구현에 가깝다는 근거다.

## 장점

- 대형 원문이 main context에 누적되는 것을 방지
- 이후 turn의 context 비용까지 감소
- 고성능 모델을 reasoning에 집중
- routing policy를 prompt가 아닌 deterministic hook으로 enforce
- worker mode/model을 교체·커스터마이즈 가능
- reference 기반 generation으로 context-free boilerplate 위험 감소
- hook/transport eval을 함께 공개해 구조를 직접 검증 가능

## 단점 및 한계

- `code-writer`에는 enforcement가 없어 agent의 Skill 준수에 의존
- worker summary에서 중요한 세부사항이 누락될 수 있음
- 350줄 정적 기준은 언어/파일 구조별 최적값이 아님
- worker invocation latency와 별도 inference 비용 발생
- Portal/AiKA를 그대로 사용하면 Spotify ecosystem 의존
- payload가 command-line argv를 통과해 OS `ARG_MAX` 제약을 받음. Linux는 single argument 128KiB 제한 때문에 기본 ceiling도 더 낮음
- 기본 worker timeout 180초라 큰 generation은 split 또는 설정 변경 필요
- 현재 Shunt는 Claude Code only

## 기존 방식과 비교

| 방식 | 강제성 | Main context 절약 | 구현 복잡도 |
|---|---|---|---|
| CLAUDE.md 지침 | 낮음 | 중간 | 낮음 |
| Skill 기반 위임 | 중간 | 높음 | 중간 |
| Shunt Hook + Skill + Worker | 높음 (bulk read) | 높음 | 높음 |

Shunt의 차별점은 더 싼 모델 자체가 아니라 **context ingress를 외부 정책 계층에서 통제**한다는 것이다.

## 활용 아이디어

### 바로 적용 가능

- Claude Code PreToolUse Hook으로 large-file read 차단
- configurable threshold 도입
- bulk-reader용 저비용 모델 분리
- targeted read 예외 허용
- code generation worker에 reference file 필수화

### PoC 가치 있음

사내 harness에는 다음처럼 적용할 가치가 높다.

```text
Main Orchestrator / Claude
          |
       Router Hook
       /         \
 targeted       bulk
   |              |
Main Model    Cheap Worker
   |              |
Reason/Edit    Read/Generate
       \          /
        Build/Test
            |
       Codex Review
            |
       Perforce CL
```

Perforce 환경에서는 worker direct-to-disk 변경을 별도 pending changelist/worktree에 격리하고 deterministic build/test를 통과한 뒤 reviewer가 검수하도록 하는 편이 안전하다.

### 아이디어 참고

라인 수만 보지 않고 예상 token 수, 파일 유형, task type, cache hit, worker latency, 모델 가격을 합친 dynamic routing score로 발전시킬 수 있다.

## 결론

이번 오픈소스 공개로 Spotify 사례는 단순한 엔지니어링 블로그 아이디어가 아니라 **Hooks → Scripts → Skills → Portal Actions → AiKA Worker**로 구성된 실제 구현체로 확인할 수 있게 됐다.

가장 참고할 부분은 '싼 모델을 쓰자'가 아니라 **비싼 메인 모델의 context를 희소 자원으로 보고, 무엇이 그 context에 진입할 수 있는지를 deterministic policy로 제어한다**는 설계다. 특히 자체 Claude Code/Codex harness를 운영한다면 Portal 자체를 도입하기보다 Shunt의 routing/enforcement 구조를 이식하는 PoC 가치가 높다.

## 참고 자료

- https://github.com/spotify/portal-ai-plugins
- https://github.com/spotify/portal-ai-plugins/tree/main/plugins/shunt
- Spotify Engineering, "Portal by Spotify cut my Claude Code token usage by 90%", 2026-09-03
