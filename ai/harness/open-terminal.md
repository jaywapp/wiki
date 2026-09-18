# Open Terminal — AI Harness 관점의 토큰 최적화

> Reference: https://github.com/open-webui/open-terminal

## 개요

Open Terminal은 AI 에이전트가 실제 명령을 실행하고 파일을 읽고 쓰며 개발 환경과 상호작용할 수 있도록 터미널/워크스페이스 실행 계층을 제공한다.

Harness 관점에서 중요한 점은 Open Terminal 자체가 토큰을 직접 절약해 주는 것이 아니라, **LLM과 실제 Workspace 사이에 실행 계층을 분리함으로써 필요한 정보만 Context에 전달하는 구조를 만들 수 있다는 점**이다.

핵심 아이디어는 다음과 같다.

> 프로젝트와 작업 상태를 LLM Context에 계속 들고 있지 말고 Workspace를 외부 메모리이자 실행 환경으로 사용한다. LLM에는 의사결정에 필요한 최소 정보만 전달한다.

---

## 기존 Context 중심 방식

```text
CLAUDE.md
프로젝트 구조
관련 코드
빌드 방법
로그
이전 작업 내용
Perforce 상태
...
        ↓
      LLM
```

이 구조에서는 프로젝트 구조, 코드, 로그, 작업 이력 등이 반복적으로 Context에 포함될 가능성이 높다.

프로젝트와 Agent 수가 증가할수록 중복 Context가 커진다.

---

## Workspace 중심 방식

```text
      LLM
       │
       │ 필요한 정보만 조회
       ▼
 Terminal Runtime
       │
 ┌─────┼──────┐
 ▼     ▼      ▼
Files  P4    Build
       │
       ▼
Persistent Workspace
```

Agent는 모든 정보를 미리 전달받지 않는다.

필요할 때 다음과 같은 동작을 수행한다.

- 파일 검색
- 특정 파일 일부 읽기
- Perforce 상태 조회
- 빌드/테스트 실행
- 오류 확인
- Workspace 상태 조회

즉 **Context에 환경을 복사하는 방식에서 환경을 필요할 때 조회하는 방식으로 전환**한다.

---

## 토큰 절감 포인트

| 방식 | Context 소비 |
|---|---|
| 프로젝트 구조 전체 전달 | 큼 |
| 전체 파일 전달 | 매우 큼 |
| 전체 빌드 로그 전달 | 매우 큼 |
| 필요한 파일만 조회 | 작음 |
| 필요한 로그 부분만 조회 | 작음 |
| Workspace에 상태 저장 | 매우 작음 |

특히 효과가 큰 부분은 **명령 출력의 필터링**이다.

### 좋지 않은 구조

```text
Agent
 ↓
p4 sync
 ↓
18,000 lines
 ↓
LLM Context
```

`p4 sync`, 빌드, 테스트 등의 stdout/stderr 전체를 LLM에게 전달하면 작업 자체보다 로그가 더 많은 Context를 소비할 수 있다.

### 개선 구조

```text
Agent
 ↓
Terminal Runtime
 ↓
p4 sync
 ↓
Output Processor
 ↓
success
updated: 2431
failed: 0
duration: 83s
 ↓
LLM
```

실패한 경우에만 필요한 오류 정보를 추가한다.

```text
failed: 3

error summary:
- Foo.cpp permission denied
- Bar.uasset locked
- Baz.cpp resolve required
```

이 패턴은 Perforce뿐 아니라 다음에도 동일하게 적용할 수 있다.

- Unreal Build Tool
- MSBuild
- TeamCity
- 테스트 실행
- 패키징
- Git
- 정적 분석

---

## Workspace를 외부 메모리로 사용

Agent가 이전 작업 상태를 자연어 Context로 계속 유지할 필요도 없다.

예를 들어 Harness가 다음과 같은 상태 파일을 유지할 수 있다.

```text
.workspace/
  state.json
  tasks.json
  findings.md
  build-result.json
  p4-state.json
```

새로운 Agent 또는 새로운 세션은 전체 작업 이력을 전달받는 대신 필요한 상태만 조회한다.

```text
read state.json
```

이를 통해 다음을 분리할 수 있다.

```text
Conversation Memory
        ↓
요약 / Compact

Workspace State
        ↓
정확한 작업 상태 유지
```

대화는 압축하고 정확성이 필요한 개발 상태는 Workspace에 남기는 구조다.

---

## Workspace Harness 적용 구조

```text
              Workspace Harness
                     │
               Orchestrator
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
     Claude        Codex       Release
        │            │            │
        └────────────┼────────────┘
                     ▼
             Context Gateway
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
        Search     Execute     State
          │          │          │
          └──────────┼──────────┘
                     ▼
             Terminal Runtime
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
         src/       Perforce    Build
```

여기서 토큰 최적화의 핵심 컴포넌트는 **Context Gateway**다.

Terminal Runtime이 실행 결과를 그대로 LLM에 반환하지 않고 Context Gateway가 필요한 정보만 전달한다.

### 기본 정책

```text
search
  → narrow
  → read

execute
  → summarize

error
  → relevant lines

state
  → required fields
```

---

## Agent Runtime 분리

Agent별로 실행 환경을 분리할 수도 있다.

```text
Workspace Harness
        │
   Orchestrator
        │
 ┌──────┼────────┐
 ▼      ▼        ▼
Agent1 Agent2   Release
 │      │         │
 ▼      ▼         ▼
Runtime Runtime Runtime
 │      │         │
 ▼      ▼         ▼
src/p1  src/p2   release
```

예를 들어 설정을 다음과 같이 표현할 수 있다.

```yaml
agents:

  gaudi:
    workspace: src/GaudiTable
    runtime: terminal-gaudi
    model: claude
    vcs: perforce

  p4vcustom:
    workspace: src/P4VCustom
    runtime: terminal-p4vcustom
    model: claude
    vcs: perforce

  release:
    workspace: release
    runtime: terminal-release
    model: codex
    permissions:
      - build
      - package
      - deploy
```

---

## Harness 설계 원칙

Open Terminal에서 가져올 수 있는 가장 중요한 아이디어는 단순히 Terminal을 AI에게 제공하는 것이 아니다.

### 1. Workspace First

작업 상태는 가능한 한 Workspace에 저장한다.

### 2. Context On Demand

LLM이 실제로 필요한 정보만 조회한다.

### 3. Output Compression

명령 출력 전체가 아니라 결과 요약을 기본값으로 사용한다.

### 4. Error Expansion

실패했을 때만 상세 로그를 단계적으로 확장한다.

### 5. Agent Isolation

Agent별 Workspace/Runtime/Permission을 분리할 수 있도록 한다.

### 6. Context Gateway

LLM과 실행환경 사이에 Context를 제어하는 계층을 둔다.

---

## 최종 방향

Open Terminal을 그대로 Workspace Harness에 붙이는 것이 목표라기보다 다음 구조를 구현하는 것이 중요하다.

> **Workspace를 LLM의 외부 메모리 + 실행 환경으로 만들고, LLM Context에는 의사결정에 필요한 최소 정보만 올린다.**

이를 통해 Agent가 많아질수록 증가하는 중복 Context와 빌드/Perforce/도구 실행에서 발생하는 대량 출력에 의한 토큰 낭비를 줄일 수 있다.

특히 Claude + Codex + Perforce 기반 개발 Harness에서는 **Context Gateway + Terminal Runtime + Persistent Workspace** 조합을 핵심 아키텍처 후보로 검토할 가치가 있다.
