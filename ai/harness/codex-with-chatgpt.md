---
title: Codex with ChatGPT
category: harness
tags:
  - ai
  - codex
  - chatgpt
  - mcp
  - harness
  - token-optimization
source: https://github.com/XiaoDuoYa/codex-with-chatgpt
updated: 2026-09-09
---

# Codex with ChatGPT

> ChatGPT 웹을 계획·리뷰 두뇌로, Codex를 실행 하네스로 분리해 서로 다른 사용량/권한 경계를 활용하는 오픈소스 하네스 구성이다.

## 프로젝트 개요

Codex with ChatGPT는 ChatGPT 웹과 Codex를 역할 분담시키는 비공식 커뮤니티 프로젝트다. 핵심 철학은 **“ChatGPT thinks. Codex works.”** 이다.

ChatGPT는 계획, 추론, 코드 리뷰를 담당하고 Codex는 실제 파일 수정, 셸 실행, Git, 테스트 등 실행을 담당한다. 두 환경은 OAuth로 보호되는 읽기 전용 MCP Workspace Bridge로 연결된다.

AI Sparkup 글은 이를 “남는 ChatGPT 웹 할당량을 계획 두뇌로 활용하고 Codex 사용량을 실행에 집중시키는 방법”으로 소개한다.

## 해결하려는 문제

일반적인 코딩 에이전트 세션에서는 하나의 모델/제품 사용량이 다음 단계에 모두 소비된다.

1. 코드베이스 탐색
2. 문제 분석
3. 구현 계획
4. 코드 수정
5. 테스트
6. 리뷰

Codex with ChatGPT는 이 중 **계획·분석·리뷰와 실행을 분리**한다.

- ChatGPT 웹: Reason / Plan / Review
- Codex: Edit / Shell / Git / Test

따라서 핵심은 단순한 모델 교체가 아니라 **서로 다른 제품의 컨텍스트·사용량·권한을 역할별로 배치하는 하네스 설계**다.

## 핵심 기능

### ChatGPT를 Planning / Review Agent로 사용

ChatGPT 웹이 현재 워크스페이스를 읽고 구현 계획이나 리뷰를 수행한다.

### Codex가 실행 권한 유지

파일 수정, 명령 실행, 테스트, 커밋 등의 실행 기능은 Codex에 남는다. V1 MCP 서버에는 쓰기/실행 도구 자체가 없다.

### 읽기 전용 Workspace MCP

ChatGPT는 저장소 전체를 한 번에 업로드받는 대신 MCP를 통해 필요한 파일, 검색 결과, diff 등을 필요할 때 가져온다.

### OAuth 및 Pairing

OAuth 2.1, PKCE, 동적 클라이언트 등록, 일회성 pairing code를 사용한다. Access token은 workspace에 바인딩된다.

### Cloudflare Tunnel

로컬 bridge는 127.0.0.1에만 bind하고 외부 ChatGPT와의 연결에는 Cloudflare Quick Tunnel 또는 Named Tunnel을 사용한다.

## 아키텍처

```text
┌────────────────────────────┐
│       ChatGPT Web          │
│  Reason / Plan / Review    │
└─────────────┬──────────────┘
              │
        MCP / OAuth
              │
              ▼
┌────────────────────────────┐
│        C2C Bridge          │
│ - Read-only MCP Server     │
│ - OAuth Authorization      │
│ - Pairing Manager          │
│ - Tunnel Manager           │
│ - Local Admin API          │
└─────────────┬──────────────┘
              │ read-only
              ▼
┌────────────────────────────┐
│      Local Workspace       │
└─────────────▲──────────────┘
              │ edit/shell/git/test
┌─────────────┴──────────────┐
│       Codex Harness        │
└────────────────────────────┘
```

프로젝트 자체 설명에서는 Computer Use를 작은 상태 메시지를 전달하는 **control plane**, MCP를 파일·diff·검색 결과를 가져오는 **data plane**으로 구분한다.

주요 모듈은 다음과 같다.

| 모듈 | 역할 |
| --- | --- |
| `bridge/` | HTTP bridge와 runtime/admin API |
| `mcp/` | 9개의 read-only MCP tool |
| `auth/` | OAuth 2.1, PKCE, token rotation/revocation |
| `pairing/` | 일회성 pairing code 관리 |
| `workspace/` | 경로 containment, 민감 파일 차단, 검색, git diff |
| `tunnel/` | Cloudflare Quick/Named Tunnel 추상화 |
| `execution/` | 실행 기록 및 선택적 sanitized output |
| `process/` | daemon lifecycle |
| `cli/` | `c2c` CLI |
| `skill/` | Codex에서 전체 UX를 자동화하는 Skill |

## 보안 모델

이 프로젝트에서 눈여겨볼 부분은 단순히 MCP를 붙인 것이 아니라 **실행 권한을 의도적으로 분리했다는 점**이다.

- one bridge = one workspace
- token은 workspace ID에 바인딩
- ChatGPT MCP는 read-only
- `.env`, key, SSH/cloud credential 등 민감 파일 deny-by-default
- canonical path 검증으로 workspace traversal/symlink escape 방어
- access token 1시간, refresh token rotation
- bridge는 localhost에만 bind
- public surface는 OAuth로 보호된 HTTPS tunnel
- 로그와 실행 결과에 credential redaction 적용

V1에서는 ChatGPT가 파일 쓰기, 삭제, shell 실행, commit, package 설치를 수행할 수 없다.

다만 token hash와 client registration 저장은 아직 OS keychain이 아니라 파일 기반이며, keychain integration은 V2 항목으로 명시되어 있다.

## 장점

### 1. 역할 분리 자체가 명확하다

Planning/Review와 Execution을 별도 에이전트로 나누므로 복잡한 코딩 하네스 설계의 좋은 참고 사례다.

### 2. 실행 권한 최소화

Planning agent가 실수하거나 prompt injection 영향을 받아도 직접 shell/file write를 할 수 없는 구조다.

### 3. Context를 pull 방식으로 전달

전체 저장소를 프롬프트에 밀어 넣는 대신 ChatGPT가 필요한 파일과 diff를 MCP로 가져온다. 대형 코드베이스에서 context 전달 패턴으로 참고할 가치가 높다.

### 4. Codex Skill로 UX 자동화

사용자가 MCP/OAuth/tunnel 세부 구조를 직접 관리하기보다 Skill이 setup, doctor, pairing 등을 처리하도록 만든 점이 실용적이다.

## 단점 및 한계

### 비공식 프로젝트

OpenAI 공식 프로젝트가 아니므로 ChatGPT 웹 UI, connector 동작, Codex Skill 환경 변경에 영향을 받을 가능성이 있다.

### 웹 UI/Computer Use 의존

API 기반 서비스 간 호출보다 UI 자동화 요소가 포함된 구조는 장기적인 안정성과 운영 자동화 측면에서 불리하다. 로그인, CAPTCHA, 2FA는 사용자 개입이 필요하다.

### Cloudflare 의존성

기본 원격 연결에 `cloudflared`가 필요하다. Tunnel 추상화는 존재하지만 현재 실사용 경로는 Cloudflare에 강하게 의존한다.

### Enterprise 환경 제약

회사 코드에 적용하려면 외부 ChatGPT, 외부 tunnel, MCP endpoint 노출에 대한 보안 정책 검토가 필요하다. 읽기 전용이라고 해도 소스 코드가 외부 AI 서비스에 전달될 수 있다는 점은 별도 승인 대상이 될 수 있다.

### 비용 절감 효과는 환경 의존

이 프로젝트가 주장하는 이점은 ChatGPT 웹 사용량과 Codex/API 사용량의 비대칭이 존재할 때 가장 크다. 실제 절감량은 각 구독 정책, 사용량 제한, 작업 패턴에 따라 달라지므로 정량적 절감률은 확인되지 않았다.

## 활용 사례

### 개인 개발 환경

ChatGPT에 설계와 리뷰를 맡기고 Codex가 구현하도록 하여 고비용 reasoning과 실행 작업을 분리할 수 있다.

### 대형 코드베이스 분석

ChatGPT가 MCP search/read/diff를 이용해 필요한 context만 가져오게 하는 패턴을 실험할 수 있다.

### Reviewer 분리

Codex가 만든 변경사항을 동일 실행 에이전트가 자기 검토하는 대신 별도 ChatGPT 세션이 diff를 읽고 검토하게 만들 수 있다.

## 기존 방식과 비교

| 방식 | 계획/리뷰 | 실행 | 특징 |
| --- | --- | --- | --- |
| Codex 단독 | Codex | Codex | 가장 단순하지만 동일 사용량/컨텍스트를 공유 |
| 일반 Sub-agent | 별도 agent/model | main agent | 동일 하네스 내부에서 역할 분리 |
| Codex with ChatGPT | ChatGPT Web | Codex | 제품·사용량·권한 경계까지 분리 |

이 프로젝트의 차별점은 단순히 “좋은 모델에게 계획시키기”가 아니라 **서로 다른 AI 제품을 MCP와 Skill로 연결해 하나의 coding harness처럼 운영한다는 것**이다.

## 활용 아이디어

### 바로 적용 가능

개인 환경에서 Codex + ChatGPT를 모두 사용하고 있다면 Planning/Review 분리 패턴을 직접 시험해볼 수 있다.

### PoC 가치 있음

현재 사용하는 AI Workflow에서 다음 구조를 실험할 가치가 있다.

```text
Orchestrator
   │
   ├─ Planning / Analysis → 강한 reasoning 모델
   │                         │
   │                    read-only tools
   │                         │
   └─ Execution → Coding Harness → edit / shell / test
```

특히 **Planning agent는 read-only, Worker만 write/exec**라는 권한 분리는 멀티 에이전트 하네스 설계에 그대로 가져올 만하다.

### 아이디어 참고

C2C의 control plane / data plane 분리는 다른 하네스에도 적용 가능하다.

- control plane: task ID, 상태, handoff 등 작은 메시지
- data plane: MCP를 통한 코드, diff, 검색 결과의 필요 시 조회

이 구조는 서브에이전트 간 대규모 context 복사를 줄이는 방법론으로도 활용할 수 있다.

### 현재 도입 가치 낮음

Enterprise 소스 코드 환경에서 외부 ChatGPT 및 Cloudflare tunnel 사용이 허용되지 않는다면 프로젝트 자체를 그대로 도입하기보다는 **read-only planner + write-enabled worker 패턴만 내부 인프라로 재구현**하는 편이 적합하다.

## 결론

Codex with ChatGPT는 “ChatGPT 웹 할당량을 아낀다”는 아이디어보다 **Planning/Review와 Execution을 권한·컨텍스트·사용량 단위로 분리한 하네스 구조**가 더 흥미로운 프로젝트다.

실무적으로 가장 참고할 부분은 세 가지다.

1. Planner/Reviewer를 read-only로 제한한다.
2. 코드 컨텍스트를 복사하지 않고 MCP data plane으로 필요할 때 가져온다.
3. 실제 수정·실행 권한은 Coding Harness 하나에 집중한다.

개인 환경에서는 직접 사용해볼 가치가 있고, Enterprise 환경에서는 프로젝트 자체보다 이 아키텍처 패턴을 내부 하네스에 흡수하는 쪽이 더 현실적이다.

## 참고 자료

- AI Sparkup: https://aisparkup.com/posts/15678
- GitHub: https://github.com/XiaoDuoYa/codex-with-chatgpt
- Architecture: https://github.com/XiaoDuoYa/codex-with-chatgpt/blob/main/docs/architecture.md
- Security: https://github.com/XiaoDuoYa/codex-with-chatgpt/blob/main/docs/security.md
