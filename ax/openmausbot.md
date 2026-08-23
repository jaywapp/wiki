# OpenMausBot

> 태그: `AX` `AI Agent` `Multi-Agent` `Claude Code` `Codex` `Local-first` `Electron` `Composio` `Computer Use`

## 한줄 요약

OpenMausBot은 Claude·Codex·Grok 등의 로컬 CLI 에이전트를 메신저의 연락처처럼 여러 개 운영하면서, 각 에이전트에 모델·대화 컨텍스트·컴퓨터·외부 앱을 연결하는 오픈소스 local-first 멀티 에이전트 데스크톱 UI다.

## 프로젝트 개요

OpenMausBot은 Grok Bot의 ‘AI를 채팅 연락처처럼 다룬다’는 UX를 오픈소스/local-first 방식으로 재구성한다. 사용자가 이미 설치하고 로그인한 `claude`, `codex`, `grok` CLI를 그대로 실행하므로 별도의 모델 프록시 계정을 강제하지 않는다.

현재 저장소 README 기준 macOS(Apple Silicon/Intel), Windows x64, Ubuntu 24.04 x64 배포를 표방하며, React + Tailwind 프런트엔드와 로컬 Node harness server, Electron 데스크톱 셸로 구성된다.

## 해결하려는 문제

CLI 기반 AI 에이전트는 강력하지만 여러 에이전트를 동시에 운용할 때 세션, 모델, 권한 승인, 컴퓨터 사용, 외부 SaaS 연결을 각각 관리해야 한다. OpenMausBot은 이를 하나의 메신저형 UI로 통합한다.

핵심 문제는 다음과 같다.

- 여러 AI CLI의 UX와 이벤트 형식이 서로 다름
- 역할별 에이전트와 대화 컨텍스트 관리가 번거로움
- 에이전트의 shell/file/computer 작업에 명시적 승인 계층이 필요함
- Gmail, Slack, GitHub 등 외부 서비스 연결을 에이전트별로 직접 구현하기 어려움
- CLI 에이전트의 작업 상태를 비개발자도 이해할 수 있는 UI가 부족함

## 핵심 기능

- **Bot roster**: 에이전트를 메신저 연락처처럼 생성·핀·복제·숨김·삭제
- **Per-bot model**: 봇별 Claude/Codex/Grok 모델 선택 및 대화 중 변경
- **Local CLI reuse**: 기존 CLI 로그인/구독을 그대로 활용
- **Computer use**: Cloud Linux desktop, Local VM, 호스트 컴퓨터 제어 옵션
- **Permission broker**: shell 명령, 파일 편집 등 위험 작업을 Allow/Deny 카드로 승인
- **Connected apps**: Composio를 통해 Gmail, Slack, GitHub, Notion, Linear 등 다수 앱 연결
- **Channels**: Work/Personal/프로젝트별 독립 transcript, instructions, working folder, bot roster 구성
- **Streaming runtime**: 서로 다른 provider 이벤트를 canonical event stream으로 정규화하고 SSE로 UI에 전달
- **Voice**: macOS dictation 및 ElevenLabs 기반 음성 응답/대화 기능
- **Local storage**: transcript, config, event 등을 `~/.openmausbot`에 저장

## 아키텍처

```text
React + Tailwind App
        │ HTTP commands
        ▼
Harness Server (127.0.0.1:8799)
 ├─ Driver Registry
 │   ├─ Claude CLI
 │   ├─ Codex CLI
 │   └─ Grok CLI
 ├─ Event Bus ── SSE ──> App
 ├─ Permission Broker
 ├─ Computer lifecycle
 └─ Connectors
      ├─ Composio
      └─ Cloud computer / Local VM / Host

Electron
 ├─ Desktop shell
 ├─ Dictation
 ├─ Screen capture
 └─ Computer-use bridge
```

### 주요 계층

| 계층 | 역할 |
|---|---|
| `server/drivers/` | provider별 CLI protocol adapter |
| `server/harness/` | agent registry와 fan-in event bus |
| `server/index.ts` | bot/turn/approval/model/computer/connector HTTP + SSE API |
| `src/` | 채팅 중심 React UI와 server-backed state |
| `electron/` | 데스크톱 shell, 화면/음성/호스트 제어 |

설계의 핵심은 UI가 Claude/Codex 프로토콜을 직접 알지 않고 **Driver → canonical runtime event → SSE** 경계를 사용한다는 점이다. 따라서 새로운 agent provider는 driver 계층에 추가하는 방식으로 확장할 수 있다.

## 장점

1. **기존 CLI 구독 활용** — Claude Code/Codex 등의 기존 로그인과 구독을 재사용한다.
2. **Local-first** — 핵심 harness와 transcript가 로컬에 위치해 클라우드 중계 의존성을 줄인다.
3. **멀티 에이전트 UX가 직관적** — 복잡한 orchestrator 대신 ‘사람에게 메시지 보내듯 봇에게 메시지’라는 모델을 제공한다.
4. **Provider abstraction** — driver registry와 canonical event stream으로 서로 다른 CLI를 동일 UI에서 다룬다.
5. **Human-in-the-loop** — permission broker가 실제 명령/파일 작업의 승인 경계를 담당한다.
6. **Computer + SaaS 도구 통합** — 단순 채팅이 아니라 실제 업무 수행형 agent desktop에 가깝다.
7. **Channels 모델** — 같은 봇을 복제하지 않고 프로젝트/업무별 컨텍스트를 분리할 수 있다.

## 단점

1. **보안 경계가 로컬 사용자 신뢰에 의존** — harness가 127.0.0.1에만 bind되고 인증을 두지 않는 구조이므로 외부 노출 시 위험하다.
2. **CLI 권한이 곧 에이전트 권한** — Claude/Codex 프로세스가 사용자 권한으로 실행되므로 permission broker 우회 취약점의 영향이 크다.
3. **외부 서비스 의존성** — Composio, cloud computer, ElevenLabs 등의 고급 기능은 외부 서비스/API 키가 필요하다.
4. **플랫폼별 기능 격차** — host computer control, dictation 등은 OS별 구현 성숙도가 다르다.
5. **빠르게 변화하는 초기 프로젝트** — 기능/배포 구조와 지원 provider가 자주 변할 가능성이 높아 운영 표준으로 도입하기 전 검증이 필요하다.
6. **Agent orchestration은 제한적** — 메시징/채널 UX는 강하지만 복잡한 DAG, queue, retry, policy 기반 workflow orchestration이 주목적은 아니다.

## 기존 도구와 비교

| 도구 유형 | OpenMausBot과의 차이 |
|---|---|
| Claude Code / Codex CLI | 단일 CLI 자체가 아니라 여러 CLI를 통합하는 상위 UX/harness |
| 일반 Chat UI | 모델 대화뿐 아니라 shell/file/computer/app 실행과 승인 흐름까지 포함 |
| Open WebUI류 | 로컬 모델 채팅 허브보다 ‘실행 가능한 coding/desktop agent roster’에 초점 |
| CrewAI / LangGraph류 | 코드 기반 workflow graph보다 사람이 여러 agent와 협업하는 interactive UI에 초점 |
| SaaS AI assistant | 로컬 CLI/기존 구독을 활용하고 transcript/harness를 로컬에 두는 방향 |

## 활용 사례

- 역할별 개발 에이전트: Planner / Coder / Reviewer / DevOps 봇
- 장시간 작업을 별도 봇에 맡기고 UI에서 진행 상황 확인
- GitHub/Slack/Gmail 등을 연결한 업무 자동화
- 개발 프로젝트별 Channel을 만들고 working folder와 지침을 분리
- 로컬/VM/cloud computer를 선택적으로 할당해 위험 작업 격리
- 비개발자에게 CLI 에이전트를 메신저형 UX로 제공하는 사내 AI 포털의 참고 구현

## 활용 아이디어

### 1. 사내 Agent Desktop의 프런트엔드 패턴

CLI를 직접 노출하는 대신 역할별 봇을 연락처로 표현하고, 실제 실행기는 별도 harness로 분리하는 구조를 참고할 수 있다. 특히 **UI → typed command → harness → provider driver → normalized event** 패턴은 여러 AI 실행기를 통합할 때 유용하다.

### 2. Permission Broker 독립 모듈화

AI 에이전트가 파일 수정, shell 실행, 배포, Perforce 작업 등을 수행하기 전에 공통 approval event를 발행하도록 만들면 provider와 무관한 중앙 정책 계층을 구성할 수 있다.

```text
Agent Request
   ↓
Policy Engine
   ├─ auto allow: read-only
   ├─ user approval: file edit / submit
   └─ deny: destructive / restricted
```

### 3. Channel = 프로젝트 실행 컨텍스트

Channel마다 working directory, shared instructions, 허용 tool, agent roster를 저장하는 방식은 프로젝트 전환 시 컨텍스트 혼선을 크게 줄일 수 있다.

### 4. Driver SPI를 사내 도구에 적용

Claude/Codex뿐 아니라 사내 agent, MCP 기반 worker, CI agent 등을 같은 driver interface로 감싸고 UI는 canonical event만 처리하게 하면 실행 백엔드 교체 비용을 줄일 수 있다.

### 5. Agent observability UI

tool call, approval, screenshot, streaming event를 transcript에 함께 기록하는 패턴을 활용해 ‘AI가 무엇을 했는지’ 추적 가능한 업무 감사 로그로 발전시킬 수 있다.

## 참고 링크

- GitHub: https://github.com/milind-soni/OpenMausBot
- Security Policy: https://github.com/milind-soni/OpenMausBot/blob/main/SECURITY.md
- Linux Desktop: https://github.com/milind-soni/OpenMausBot/blob/main/docs/linux-desktop.md

## 조사 시점

2026-08-24 기준 저장소 README 및 공개 문서를 기준으로 정리.