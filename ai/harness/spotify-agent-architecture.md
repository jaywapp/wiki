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
  - backstage
  - portal
source: https://engineering.atspotify.com/2026/9/spotifys-backstage-portal-cut-my-claude-code-token-usage-by-90
updated: 2026-09-07
---

# Spotify Agent Architecture

> Spotify의 Shunt 패턴은 고성능 메인 에이전트의 컨텍스트를 추론에 집중시키고, 대용량 I/O와 예측 가능한 코드 생성을 저비용 워커로 라우팅하며, 이 정책을 프롬프트가 아니라 PreToolUse Hook으로 강제하는 토큰 최적화 아키텍처다.

## 프로젝트 개요

Spotify Engineering이 2026-09-03 공개한 사례는 Claude Code의 토큰 사용량을 줄이기 위해 Portal by Spotify의 AiKA Modes와 Claude Code plugin `shunt`를 결합한 구조다. 핵심은 더 작은 모델을 단순히 추천하는 것이 아니라, 메인 에이전트가 불필요한 대용량 원문과 생성물을 컨텍스트에 넣지 못하도록 실행 경로 자체를 분리하는 것이다.

예시 worker는 Gemini 2.5 Flash지만 특정 모델에 종속된 설계는 아니다.

## 해결하려는 문제

AI coding agent의 비용은 추론뿐 아니라 대량 파일 읽기, 반복적인 코드 생성, 생성 결과의 재입력 등 I/O성 컨텍스트 소비에서 크게 발생한다. CLAUDE.md에 '큰 파일은 작은 모델에 위임하라'고 적는 방식은 권고일 뿐이므로 에이전트가 무시할 수 있고 프로젝트마다 규칙을 복제해야 한다.

Shunt는 라우팅 정책을 모델 밖의 Hook으로 옮겨 이를 강제한다.

## 핵심 원칙

- 메인 고성능 모델: reasoning, architecture decision, 정확한 editing 담당
- 저비용 worker: bulk read, 요약, boilerplate/test/config/type stub 생성 담당
- 원문 대용량 파일은 가능한 메인 context에 넣지 않는다.
- worker가 생성한 예측 가능한 코드는 메인 context를 통과하지 않고 disk에 직접 기록할 수 있다.
- routing policy는 prompt가 아니라 Hook에서 enforce한다.

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
                                 Portal / AiKA Mode
                                        |
                                  Cheap Worker Model
                                   /            \
                          bulk-reader         code-writer
                              |                    |
                       structured bullets     straight to disk
                              |
                              v
                         Main Context
```

## 3단계 라우팅 구조

### 1. Hooks — 강제 정책

`shunt`는 Claude Code의 PreToolUse Hook을 사용한다.

- `check-file-size`: Read 호출 전에 파일 크기를 검사한다. 기본 임계값은 350줄이다.
- 임계값을 넘는 전체 읽기는 block하고 `/bulk-reader` 경로를 안내한다.
- offset/limit이 지정된 targeted read는 허용한다.
- `check-bash-read`: `cat`, `head`, `tail`, `less`, `more` 등을 통한 우회를 감지한다.
- `cat file | grep ...` 같은 targeted pipeline은 허용한다.
- 임계값은 `SHUNT_MIN_LINES`로 조정 가능하다.

핵심은 **prompt는 suggestion이고 hook은 architecture**라는 점이다.

### 2. Scripts — 전송 배관

스크립트가 모델 호출 세부사항을 처리한다.

- request 조합
- Portal CLI invocation
- error unwrap
- token usage reporting
- XML tag를 이용한 파일 경계 표시
- worker output 정규화

`bulk-read`는 질문과 파일 목록을 worker에 전달한다.

`code-write`는 specification + reference file + optional target path를 전달한다.

### 3. Skills — 사용 안내

Markdown skill은 메인 agent에게 언제/어떻게 delegation해야 하는지를 설명한다. Skill이 누락되거나 agent가 이를 따르지 않아도 Hook이 고비용 read를 차단하므로 정책 자체는 유지된다.

## 라우팅 규칙

```text
READ 요청
 |
 +-- Offset/Limit 지정? ------ YES --> Main Agent targeted read
 |
 +-- 파일 <= 350 lines? ------ YES --> Main Agent direct read
 |
 +-- 파일 > 350 lines? ------- YES --> BLOCK --> bulk-reader

CODE GENERATION
 |
 +-- 반복적/패턴 기반 boilerplate? --> code-writer worker
 |
 +-- architecture/reasoning/edit? ---> Main Agent
```

350줄은 Spotify 사례의 기본값이며 보편적인 최적값은 아니다. `SHUNT_MIN_LINES`로 환경별 튜닝해야 한다.

## Bulk Reader

대형 파일 또는 여러 파일을 질문과 함께 worker context에서 처리한다. 원문 전체 대신 질문에 필요한 구조화된 결과만 main context로 반환한다.

권장 worker output 규칙:

- prose 금지
- 인사/서론/결론 금지
- 구조화된 bullet만 출력
- 함수명/변수명/대상 또는 위치 정보 중심
- 질문과 관련 없는 내용 제거

이 방식의 진짜 절감 효과는 첫 read뿐 아니라 이후 모든 turn에서 대형 원문이 main conversation context에 남지 않는 데서 발생한다.

## Code Writer

테스트, config scaffolding, type stub 등 기존 패턴으로 결과를 예측할 수 있는 작업을 worker에 맡긴다.

필수 입력:

- specification
- reference file

reference file이 중요한 이유는 worker가 프로젝트 convention을 추측하지 않고 기존 패턴을 복제하도록 하기 위해서다.

출력 규칙:

- code only
- 설명 금지
- markdown fence 금지
- reference convention 준수

생성물은 필요하면 main context를 거치지 않고 target file에 직접 쓸 수 있다.

## 메인 모델이 직접 처리해야 할 영역

### 정확한 파일 편집

worker summary의 위치 정보만 믿고 edit하지 않는다. 수정할 위치를 좁힌 후 offset/limit targeted read로 실제 코드를 메인 모델이 확인한다.

### 복잡한 추론

architecture decision, concurrency/thread-safety, subtle bug, security-sensitive 판단 등은 고성능 모델이 담당한다.

### 작은 작업

위임에는 worker invocation latency가 있으므로 작은 파일/단순 작업은 직접 처리하는 편이 효율적일 수 있다. Spotify 사례에서 350줄 threshold는 이 trade-off를 위한 기본값이다.

## Worker Mode 예시 설정

Spotify 사례의 두 Mode는 Gemini 2.5 Flash를 worker로 사용하며 temperature 0.2를 사용한다. 모델은 Portal에 설정된 다른 모델로 교체 가능하다.

### bulk-reader system rules

```text
You are a bulk code reader.
Analyze only what is required to answer the supplied question.
Do not write prose, introductions, conclusions, or greetings.
Return only structured bullet points.
Start each bullet with the relevant symbol, function, class, variable, file, or location when available.
Do not reproduce large source blocks.
Preserve exact identifiers needed by the primary agent.
```

### code-writer system rules

```text
You are a code generation worker.
Follow the supplied specification and reference file exactly.
Match naming, structure, formatting, and conventions from the reference.
Return code only.
Do not explain the code.
Do not add markdown fences.
Do not add commentary outside the requested implementation.
```

## 실무 적용용 메인 Agent Rules

다음은 Claude Code/Codex 계열 harness에 적용할 수 있는 정책 형태다.

```text
# Context Routing Policy

Your primary responsibility is reasoning, planning, architecture decisions, precise editing, and verification.
Do not spend primary-model context on bulk I/O or predictable boilerplate when a worker route is available.

## Reading
- Read small files directly.
- Use targeted reads with offset/limit when the relevant region is known.
- Never bypass a large-file routing hook.
- When a large read is blocked, delegate through bulk-reader.
- Treat worker summaries as navigation/context, not as authoritative source text for precise edits.

## Writing
- Delegate predictable boilerplate, tests, configuration scaffolding, and type stubs when a suitable reference file exists.
- Require a reference file for delegated code generation.
- Allow worker output to go directly to disk only for low-risk pattern-based generation.
- Review or validate generated files through build/test/lint before considering the task complete.

## Never Delegate
- architecture decisions
- subtle debugging/reasoning
- concurrency or thread-safety analysis
- security-sensitive reasoning
- precise edits based only on summarized source
- small operations where delegation overhead exceeds expected savings

## Verification
- After delegation, use targeted reads for sections requiring exact reasoning.
- Run deterministic build/test/lint checks whenever available.
- Escalate to the primary model when worker output is ambiguous or validation fails.
```

## 장점

- 대형 원문이 main context에 누적되는 것을 방지
- 이후 turn의 context 비용까지 감소
- 고성능 모델을 reasoning에 집중
- worker model 교체 가능
- policy와 transport/model을 분리
- CLAUDE.md보다 강한 enforcement
- 프로젝트별 prompt 복제 감소

Spotify 글 제목의 '90%'는 작성자의 실제 workflow 사례 결과이며 모든 프로젝트에서 동일하게 재현된다는 의미의 benchmark는 아니다.

## 단점 및 한계

- worker summary에서 중요한 세부사항이 누락될 수 있음
- 350줄이라는 정적 기준은 언어/파일 구조에 따라 부적절할 수 있음
- worker invocation latency 발생
- 여러 worker 호출 시 전체 wall-clock time이 오히려 증가할 수 있음
- direct-to-disk generation에는 반드시 deterministic validation이 필요
- Portal/AiKA를 그대로 사용할 경우 Spotify ecosystem 의존성이 생김
- Claude Code 이외 agent에서는 동일 Hook API가 없을 수 있어 별도 interceptor 구현 필요

## 활용 아이디어

### 바로 적용 가능

- Claude Code PreToolUse Hook으로 large-file read 차단
- `SHUNT_MIN_LINES`와 유사한 configurable threshold 도입
- bulk-reader용 저비용 모델 분리
- targeted read 예외 허용
- code generation worker에 reference file 필수화

### PoC 가치 있음

사내 개발 Harness에서는 다음 구조로 확장할 수 있다.

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

Perforce 환경에서는 worker의 direct-to-disk 변경을 pending changelist에 격리하고 TeamCity 또는 로컬 build/test를 통과한 뒤 reviewer가 검수하도록 구성하는 것이 안전하다.

### 아이디어 참고

라인 수뿐 아니라 예상 token 수, 파일 유형, task type, cache hit, worker latency, 모델 가격 등을 이용해 동적 routing score로 발전시킬 수 있다.

## 결론

Spotify Shunt 사례의 핵심은 'Gemini Flash를 사용한다'가 아니다. **비싼 모델의 context를 하나의 희소 자원으로 취급하고, 무엇이 그 context에 들어올 수 있는지를 모델 외부의 deterministic policy로 통제한다**는 점이다.

Agent에게 토큰 절약을 부탁하는 prompt optimization에서 한 단계 더 나아가, Hook → Script → Worker Mode라는 실행 아키텍처로 token policy를 강제한다는 점이 실무적으로 가장 참고할 가치가 높다.

## 참고 자료

- Spotify Engineering, "Portal by Spotify cut my Claude Code token usage by 90%", 2026-09-03
- Portal by Spotify / AiKA Modes
- Spotify `portal-ai-plugins` marketplace (`portal`, `shunt` plugins)
