---
title: AgentBox
category: tools
tags:
  - ai
  - agent
  - claude-code
  - sandbox
  - docker
  - podman
source: https://github.com/fletchgqc/agentbox
updated: 2026-09-17
---

# AgentBox

> Claude Code 같은 코딩 에이전트를 프로젝트 디렉터리만 노출된 일회성 컨테이너에서 높은 권한으로 실행하기 위한 경량 샌드박스 개발 환경.

## 프로젝트 개요

AgentBox는 AI 코딩 에이전트에게 `--dangerously-skip-permissions`와 같은 높은 권한을 주면서도 호스트 시스템 전체가 노출되는 위험을 줄이기 위해 Docker/Podman 컨테이너 안에서 에이전트를 실행한다.

프로젝트 소스는 의도적으로 단순하다. 핵심은 `agentbox` 런처 스크립트, `Dockerfile`, `entrypoint.sh`이며 Claude Code와 OpenCode가 기본 지원된다. 다른 CLI 에이전트는 프로젝트가 제공하는 프롬프트를 이용해 사용자가 직접 지원 코드를 추가하는 방식을 취한다.

## 해결하려는 문제

코딩 에이전트의 permission prompt를 계속 승인하면 자율성이 낮아지고 작업 흐름이 끊긴다. 반대로 호스트에서 권한 검사를 제거하면 파일 시스템, 인증 정보, 개발 환경 전체가 에이전트의 실수나 잘못된 명령에 노출될 수 있다.

AgentBox는 권한 프롬프트를 샌드박스 내부에서는 최소화하되 호스트와의 경계를 컨테이너로 이동시키는 접근이다.

## 핵심 기능

- 현재 프로젝트 디렉터리를 컨테이너에 bind mount하여 결과는 즉시 호스트에 반영
- 실행 종료 시 제거되는 ephemeral container (`--rm`)
- Claude Code 및 OpenCode 기본 지원
- Python, Node.js, Java, shell 도구를 포함한 단일 개발 이미지
- 프로젝트별 cache/history를 호스트에 보존
- Claude/OpenCode 인증 상태를 별도 persistent mount로 유지
- 전용 `~/.agentbox/ssh`를 이용한 SSH 격리
- 전역/프로젝트 `.env`와 `-e KEY=VALUE` 환경변수 전달
- `--add-dir`로 추가 프로젝트 디렉터리 mount
- Docker Desktop 환경에서 선택적으로 Docker socket mount
- Dockerfile/entrypoint 변경 또는 이미지가 오래되면 자동 rebuild

## 아키텍처

```text
Host
├─ Project A ───────────────┐
├─ Project B ────────────┐  │
├─ ~/.claude             │  │ persistent auth/config
├─ ~/.agentbox/ssh       │  │ isolated SSH
├─ ~/.cache/agentbox     │  │ package cache
└─ ~/.agentbox/projects  │  │ history
                         │  │
                         ▼  ▼
                ┌─────────────────┐
                │ agentbox launcher│
                └────────┬────────┘
                         │ docker/podman run --rm
              ┌──────────┴──────────┐
              ▼                     ▼
      ┌───────────────┐     ┌───────────────┐
      │ Container A   │     │ Container B   │
      │ Claude/OpenCode│    │ Claude/OpenCode│
      │ project mount │     │ project mount │
      └───────────────┘     └───────────────┘
```

핵심 철학은 "에이전트 권한을 세밀하게 매번 승인"하는 대신 "에이전트가 자유롭게 행동해도 되는 실행 경계를 먼저 만든다"는 것이다.

## 장점

### 높은 자율성과 안전 경계의 절충

Claude Code의 permission prompt를 줄이면서 호스트 전체에 직접 권한을 주는 것보다 blast radius를 제한할 수 있다.

### 매우 단순한 구조

대규모 orchestration framework가 아니라 shell script + Docker image 중심이어서 동작을 파악하고 조직 환경에 맞게 fork하기 쉽다.

### 프로젝트별 격리

여러 프로젝트를 각각 ephemeral container로 실행하면서 cache와 history는 선택적으로 지속시킬 수 있다. 병렬 에이전트 실행 구조의 기본 격리 단위로도 활용 가능하다.

### Agent-Extensible 방식

모든 AI CLI를 upstream에 넣기보다 `docs/prompts/add-tool.md`를 통해 에이전트에게 지원 코드를 추가시키는 방식은 유지보수 범위를 줄이는 흥미로운 패턴이다.

## 단점 및 한계

### 완전한 보안 샌드박스는 아님

프로젝트 디렉터리는 bind mount되어 있으므로 에이전트가 해당 소스를 삭제하거나 잘못 수정할 수 있다. Git/Perforce 등의 복구 수단은 여전히 필요하다.

### Docker socket mount 위험

`--dangerously-mount-docker`는 컨테이너 격리를 크게 약화한다. 프로젝트도 Native Linux Docker에서는 root-equivalent host access 위험 때문에 이를 차단한다.

### 네트워크 제어가 부족

현재 공개 issue에 firewall 도입 논의가 남아 있다. 기업 환경에서 요구되는 egress allowlist, proxy, audit 정책을 AgentBox 자체가 완성형으로 제공한다고 보기는 어렵다.

### Claude plugin 호환성 이슈

공개 issue에는 Claude Code plugin marketplace 설치 실패 사례가 열려 있다. Plugin 중심 Claude workspace라면 검증이 필요하다.

### 버전 재현성

최신 LTS/안정 버전을 가져오고 일정 시간이 지나면 이미지를 rebuild하는 정책은 유지보수에는 편하지만, 엄격한 reproducibility가 필요한 기업 환경에서는 dependency pinning이 필요하다.

### Windows 직접 지원성

문서 요구사항과 shell 중심 구현은 Linux/macOS 친화적이다. Windows에서는 WSL2/Docker Desktop 계층을 전제로 별도 검증하는 편이 현실적이다.

## 활용 사례

- Claude Code를 YOLO 모드에 가깝게 실행하는 개인 개발 환경
- 신뢰도가 낮은 생성 코드를 실행/테스트하는 격리 환경
- 프로젝트별 Claude/Codex/OpenCode 실행 환경 표준화의 기반
- 병렬 코딩 에이전트에 프로젝트별 실행 경계를 제공하는 구조
- 교육/PoC에서 호스트 환경 오염을 줄인 실습 환경

## 기존 도구와 비교

AgentBox는 DevContainer처럼 IDE 개발 환경 전체를 정의하는 것보다 "AI 에이전트 실행 격리"에 초점을 둔다. 프로젝트 README에 따르면 ClaudeBox보다 프로필/slot 관리 기능을 줄이고 단일 이미지와 프로젝트별 컨테이너라는 단순한 구조를 선택했다.

따라서 복잡한 원격 개발 플랫폼이나 multi-agent orchestrator의 대체재라기보다 그 아래에 위치하는 **agent execution sandbox layer**로 보는 것이 적절하다.

## 활용 아이디어

### 바로 적용 가능

개인 Git 프로젝트에서 Claude Code를 격리해 실행하고, 프로젝트 소스만 mount하는 개발 패턴을 검증할 수 있다.

### PoC 가치 있음 — Claude Harness의 Execution Sandbox

현재 설계 중인 Claude 기반 workspace harness에 다음 계층으로 결합할 가치가 있다.

```text
Workspace Harness
      │
      ├─ Orchestrator
      │
      ├─ Project Session Manager
      │       │
      │       ├─ AgentBox(project1)
      │       ├─ AgentBox(project2)
      │       └─ AgentBox(project3)
      │
      └─ Release / Review Agent
```

Harness가 작업 분배와 context/session을 관리하고 AgentBox 계층은 실제 명령 실행의 격리 경계를 담당하도록 역할을 분리할 수 있다.

### 회사 Perforce 환경

아이디어 자체는 유용하지만 그대로 도입하기보다 별도 PoC가 필요하다. 특히 다음을 검증해야 한다.

- P4 CLI/인증 ticket 전달 방식
- workspace/client mapping과 container path의 일치
- Windows/WSL2에서 UE5 및 대용량 workspace I/O 성능
- `.claude`, MCP, plugin 설정의 mount 정책
- 사내 proxy/인증서/네트워크 allowlist
- agent별 Perforce workspace 분리
- host의 민감한 credential을 container에 직접 공유하지 않는 방식

UE5 빌드 전체를 컨테이너화하기보다 초기에는 **Claude가 사용하는 shell/tool execution만 sandbox화하고 실제 UE Editor/대형 빌드는 host-side controlled tool로 위임**하는 하이브리드 구조가 더 현실적인 PoC 후보이다.

### 아이디어 참고 — Prompt as Extension

AgentBox가 새 CLI 지원을 코드에 모두 내장하지 않고 "지원 기능을 생성하는 프롬프트"를 유지하는 방식은 Harness 확장 기능 관리에도 참고할 수 있다. 드물게 사용하는 integration은 core에 영구 포함하지 않고 필요 시 agent가 생성/검증하게 하는 disposable extension 패턴이다.

## 프로젝트 성숙도

2026-09-17 조사 기준 공개 저장소는 유지되고 있으며 최근 확인 가능한 commit은 2026-05-29의 환경변수 전달 기능이다. README는 2025년 9월 이후 적극적으로 지원해 왔다고 설명하지만 장기 지원을 보장하지 않는다고 명시한다.

따라서 조직의 핵심 인프라로 바로 채택하기보다 코드가 단순하다는 장점을 활용해 fork/pinning하고 자체 검증하는 방식이 적합하다.

## 결론

AgentBox의 가장 중요한 가치는 또 하나의 코딩 에이전트가 아니라 **코딩 에이전트의 실행 권한을 호스트에서 컨테이너 경계로 이동시키는 작은 실행 계층**이라는 점이다.

Claude 기반 Harness 관점에서는 orchestration을 대체하지 않는다. 오히려 `Orchestrator → Session → AgentBox → Tool execution` 구조에서 마지막 실행 sandbox 역할로 결합하는 것이 가장 자연스럽다.

특히 여러 프로젝트 세션을 동시에 상시 운용하려는 환경에서는 프로젝트별 container boundary라는 아이디어를 참고할 가치가 높다. 다만 Perforce/Windows/UE5/사내 네트워크 환경은 upstream의 주 사용 시나리오와 차이가 크므로 직접 도입보다 execution sandbox 설계 패턴을 가져와 사내 환경에 맞춘 PoC를 권장한다.

## 참고 자료

- https://github.com/fletchgqc/agentbox
- Repository README
- Repository source structure (`agentbox`, `Dockerfile`, `entrypoint.sh`)
- GitHub issues #35 (Firewall), #48 (Claude plugin issue)
- Recent repository commits (checked 2026-09-17)
