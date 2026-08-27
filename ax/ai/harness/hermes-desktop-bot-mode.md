# Hermes Desktop Bot Mode

> Hermes Desktop에서 기존 Profile을 영구적인 전문 Bot으로 운영하는 멀티에이전트 기능.

## 한 줄 요약

**Bot Mode = Hermes Profile을 이름·역할·모델·메모리·스킬을 가진 영구 Agent로 만들고, 여러 Bot이 서로 대화·협업·정기 실행까지 할 수 있게 만든 Desktop UI다.**

공식 문서: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/bot-mode.md

## 핵심 개념

Hermes에서 Bot은 완전히 새로운 실행 단위가 아니다.

**Bot = Hermes Profile** 이다.

각 Profile은 다음을 독립적으로 가질 수 있다.

- 설정
- 모델 / Provider
- Memory
- Skills
- Toolsets
- MCP Servers
- Credentials
- SOUL.md
- Chat History

Profile 데이터는 기본적으로 다음에 저장된다.

```text
~/.hermes/profiles/<name>/
```

따라서 Desktop의 Bot Mode에서 만든 Bot은 CLI에서도 그대로 사용할 수 있다.

```bash
hermes -p <bot> chat
```

Bot Mode는 별도의 Agent Runtime을 추가하는 기능이라기보다 기존 Profile 시스템 위에 만들어진 멀티에이전트 UX에 가깝다.

## Bot 생성

Desktop의 Bots 탭에서 **New Agent**를 통해 생성한다.

기본 설정:

- Name
- Title
- Description

Advanced 설정:

- 기존 Profile Clone
- Fresh Profile 생성
- 빈 Profile 생성
- Model / Provider 고정
- SOUL.md 지정
- Skill 선택
- Toolset 선택
- MCP Server 선택
- Credential 공유

즉 역할별 Bot에 서로 다른 모델을 배정할 수 있다.

예:

| Bot | 역할 | 모델 예시 | 기능 |
|---|---|---|---|
| Researcher | 조사 | 강한 reasoning 모델 | Web / Browser / Research Skills |
| Coder | 구현 | Coding 모델 | Git / Shell / Code Skills |
| Reviewer | 검토 | 별도 모델 | Review Skills |
| Daily | 개인 비서 | 저비용 모델 | Calendar / Mail / Routine |

## Forever Chat

각 Bot은 생성될 때 **Bot Chat**이라는 canonical persistent conversation을 가진다.

일반 세션처럼 계속 `/new`를 만들어 관계를 분리하기보다 하나의 지속적인 대화를 유지하는 방식이다.

Bot Chat에서 `/new`, `/reset`은 실제 새 세션 대신 `/compact` 방향으로 처리된다.

즉 Bot과 사용자 사이의 장기 컨텍스트를 유지하는 것이 Bot Mode의 중요한 설계 목표다.

## Bot 간 통신

### @mention

현재 Bot의 채팅에서 다른 Bot을 호출할 수 있다.

```text
@researcher 이 기술 조사해줘
```

현재 Bot은 대상 Bot에게 작업을 전달하고 응답을 받아 사용자에게 다시 전달한다.

Bot 이름을 변경하면 친화적인 mention handle도 만들어진다.

### Direct Message

Bot끼리 서로 직접 메시지를 보낼 수도 있다.

내부적으로 대상 Profile의 canonical Bot Chat에 메시지를 전달해 한 번의 Agent Turn을 실행하는 방식이다.

### Cross-machine

여러 Hermes backend를 Desktop의 Connections에 등록하면 다른 PC에 있는 Bot도 같은 roster에서 사용할 수 있다.

이름이 충돌하면 다음과 같은 device-qualified handle을 사용한다.

```text
@research-homelab
```

Bot이 실행되는 머신은 그대로 유지되고 Desktop이 메시지만 라우팅한다.

## Group Chat

여러 Bot을 하나의 그룹에 넣어 협업시킬 수 있다.

그룹 채팅은 2~6 Bot으로 구성할 수 있으며 사용자의 메시지에 대해 Bot들이 순차적으로 의견을 주고받는다.

기본 동작:

- 특정 Bot을 @mention하면 해당 Bot 중심으로 응답
- mention이 없으면 필요한 Bot들이 판단해서 응답
- Bot이 다른 Bot을 @mention하여 추가 의견 요청 가능
- 사용자의 판단이 필요하면 `@user`로 escalation
- 최대 3 rounds
- 한 요청에서 최대 10 messages

이 제한은 Agent끼리 무한 대화를 반복하는 상황을 방지하기 위한 guard다.

각 Bot은 그룹별로 별도의 persistent session을 유지한다.

```text
Group: <group-name>
```

따라서 그룹 대화 컨텍스트도 다음 실행까지 유지된다.

## Routines

각 Bot에 반복 작업을 연결할 수 있다.

예:

```text
매일 아침 이메일 요약
매일 AI 뉴스 조사
매주 코드베이스 상태 점검
```

Routines의 실체는 기존 Hermes Cron Job이다.

```text
[bot:<name>] <routine>
```

CLI에서도 확인 가능하다.

```bash
hermes cron list
```

Routine 결과는 해당 Bot의 Chat History에 기록된다.

## Avatar / Identity

각 Bot은 별도의 시각적 Identity를 가질 수 있다.

지원 방식:

- 자동 생성 Blob face
- Geometric face
- 업로드 이미지
- AI-generated portrait
- Pixel pet

Avatar, Title, Description은 Profile metadata로 저장된다.

## 기존 Sessions와 차이

| Sessions | Bot Mode |
|---|---|
| 일회성/작업별 대화 중심 | 영구 Agent 중심 |
| 하나의 Profile에서 여러 Session | 각 Bot 자체가 Profile |
| 역할 구분이 약함 | 역할·모델·메모리·Skill 독립 |
| 사용자↔Agent 중심 | Bot↔Bot 통신 가능 |
| Cron과 Session 분리 | Routine이 Bot에 귀속 |
| 다중 Agent UI 없음 | Roster / Group Chat 제공 |

## CLI와의 대응 관계

| Bot Mode | CLI |
|---|---|
| Bot과 대화 | `hermes -p <bot> chat` |
| Bot의 파일/Skills/Memory | `~/.hermes/profiles/<bot>/` |
| Routine | `hermes cron list` |
| Bot/Profile 생성 | `hermes profile create` |
| Profile 목록 | `hermes profile list` |

Desktop 전용 기능처럼 보이지만 Core primitive는 Profile이므로 CLI와 상태가 공유된다.

## Bot Mode 비활성화

Desktop에서 다음 경로로 끌 수 있다.

```text
Settings → Plugins → Bots
```

비활성화해도 Profile, Session, Cron Job은 삭제되지 않는다.

Bot Mode는 데이터를 소유하는 계층이 아니라 기존 Hermes 데이터를 표현하고 연결하는 UI 계층이다.

## 주목할 점

### 1. Agent를 '세션'이 아니라 '인물/역할'로 다룸

일반 AI Coding Agent는 작업 단위 Session이 핵심인 경우가 많다.

Bot Mode는 다음 관점이다.

```text
Researcher
Coder
Reviewer
Assistant
```

한 번 만든 전문 Agent를 계속 재사용한다.

### 2. Profile isolation이 강력함

Bot마다 모델·메모리·스킬·MCP를 분리할 수 있기 때문에 Agent별 context pollution을 줄이기 좋다.

### 3. 멀티에이전트 orchestration을 UI에서 제공

복잡한 orchestration framework를 직접 만들지 않아도 다음 구조를 Desktop에서 구성할 수 있다.

```text
User
 ↓
Lead Bot
 ├─ @Researcher
 ├─ @Coder
 └─ @Reviewer
```

또는 Group Chat 자체를 작은 Agent Team으로 사용할 수 있다.

### 4. Local + Remote Agent를 하나의 roster로 구성 가능

여러 PC의 Hermes를 Connections / Peer로 연결해 한 Desktop에서 관리할 수 있다.

개인 서버, 작업 PC, 원격 머신을 Agent별 실행 노드로 분리하는 형태도 가능하다.

## 현재 상태에 대한 주의

Bot Mode는 2026-08-20 기준 매우 빠르게 개발 중이다.

같은 날에도 다음 영역의 수정이 연속적으로 반영되고 있다.

- Group Chat UI 중복
- Group member clarify / approval 처리
- Canonical Bot Chat 유지 문제
- Rename 후 @mention 처리
- Group metadata 동기화

따라서 기능 방향은 상당히 흥미롭지만 **아직 안정화 단계의 신기능**으로 보는 것이 좋다.

당장 중요한 장기 작업을 전적으로 맡기기보다는 별도 테스트 Profile/Bot을 만들어 동작을 검증한 뒤 확대하는 편이 안전하다.

## 평가

Hermes Desktop Bot Mode의 핵심 가치는 단순 Multi-Agent 실행이 아니다.

**Profile + Persistent Memory + Skill Isolation + Routine + Bot-to-Bot Messaging + Group Chat + Multi-machine routing**을 하나의 UX로 묶었다는 점이 핵심이다.

특히 여러 전문 Agent를 장기간 유지하고 필요할 때 서로 호출하는 개인 Agent Team을 구성하려는 경우 상당히 매력적인 구조다.
