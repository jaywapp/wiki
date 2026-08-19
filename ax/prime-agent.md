# Prime Agent

> 장기 실행 작업, 재귀 서브에이전트, 지속 상태, 스케줄링, 자기개선 하네스를 중심으로 설계된 오픈소스 코딩·리서치 에이전트 런타임

- Repository: https://github.com/PrimeIntellect-ai/prime-agent
- 제작: Prime Intellect
- 라이선스: MIT
- 성격: Coding Agent + Research Agent + Long-running Agent Runtime
- 기반: TypeScript/Node.js, `pi` 계열 에이전트 런타임

## 한 줄 요약

Prime Agent는 새로운 LLM 자체라기보다 **Codex, Claude, Gemini, Kimi 등 여러 모델 위에 얹어 사용하는 장기 실행형 Agent Harness/Runtime**에 가깝다.

일반적인 코딩 CLI가 한 세션 안에서 파일을 읽고 명령을 실행하는 데 집중한다면, Prime Agent는 여기에 다음 기능을 핵심 런타임 기능으로 포함한다.

- 지속되는 Python 제어 환경
- 재귀 서브에이전트
- daemon 기반 장기 실행 세션
- Agent-to-Agent 메시징
- Heartbeat와 Scheduler
- Persistent Goal
- bounded autonomous mode
- 자동 Context Compaction
- 지속적인 Harness 개선
- RPC/JSON 기반 외부 프로그램 연동

---

## 핵심 개념 1 — RLM (Recursive Language Model)

Prime Agent의 첫 번째 핵심은 **RLM**이다.

일반적인 Agent Harness에서는 모델에게 다음과 같이 많은 Tool을 개별적으로 제공한다.

```text
read_file
write_file
bash
search
spawn_agent
...
```

Prime Agent는 기본적으로 **Persistent IPython 환경을 모델의 프로그래밍 가능한 제어면(Control Plane)** 으로 사용한다.

```text
LLM
 ↓
Persistent IPython
 ├─ 파일 읽기/수정
 ├─ Shell 실행
 ├─ 데이터 처리
 ├─ Skill 호출
 └─ rlm(...) → 서브에이전트 생성
```

Python 변수, import, 함수, 파싱 결과 등이 tool call 사이에서 유지된다. Context가 compaction되더라도 IPython kernel의 working state는 계속 유지될 수 있다.

### Subagent 호출

서브에이전트도 하나의 프로그래밍 primitive처럼 호출한다.

```python
reviewer = await rlm(
    "Review the authentication flow",
    name="auth-reviewer"
)
```

여러 child agent를 생성하면 다음과 같은 구조가 된다.

```text
Root Agent
 ├─ api-reviewer
 ├─ test-reviewer
 └─ integration-audit
```

각 child는 독립적인 context/session directory를 갖고, 부모와 메시지나 파일을 통해 결과를 교환한다.

핵심은 **Subagent를 단발성 Tool 호출이 아니라 유지 가능한 독립 Agent Session으로 취급한다는 점**이다.

---

## 핵심 개념 2 — Continual Harness

Prime Agent의 두 번째 핵심은 **Continual Harness**이다.

단순히 conversation history를 보존하는 것이 아니라 Agent가 반복해서 사용할 수 있는 운영 지식을 durable state로 유지한다.

대표적으로 다음과 같은 정보가 대상이다.

```text
Supplemental Prompt
Memory
Skill Description
Reusable Subagent Specification
```

`/refine` 명령은 현재까지의 작업 trajectory를 검토하고, 근거가 있는 작은 개선사항을 Harness에 반영한다.

```text
작업
 ↓
성공 / 실패 경험
 ↓
/refine
 ↓
재사용할 수 있는 교훈 추출
 ↓
Harness 상태 업데이트
 ↓
다음 작업에 재사용
```

중요한 점은 Agent가 immutable base system prompt를 임의로 다시 쓰는 구조가 아니라는 것이다. Supplemental state를 작은 단위로 개선하고 refinement history/snapshot을 남겨 검토와 rollback이 가능하도록 설계되어 있다.

따라서 Prime Agent가 말하는 **Self-Improving Agent**는 모델 자체를 학습시키는 의미보다는 **Agent Harness가 작업 경험을 통해 조금씩 개선되는 구조**에 가깝다.

---

## 장기 실행 Agent 구조

Prime Agent는 터미널 프로세스 자체를 Agent의 생명주기로 보지 않는다.

```text
TUI / CLI / RPC
       ↓
AgentConnection
       ↓
Daemon Supervisor
       ↓
Session Worker
 ├─ AgentSession
 ├─ Persistent IPython Kernel
 ├─ Scheduler
 └─ RLM Child Agents
       ↓
Session JSONL / Artifacts
```

터미널 UI는 Client에 가깝고, 실제 Agent 작업은 daemon-backed worker가 소유한다.

따라서 터미널을 닫더라도 worker가 계속 실행될 수 있고 나중에 다시 연결할 수 있다.

```bash
prime-agent agents
prime-agent attach <agent>
prime-agent --resume <path|id>
prime-agent status
```

이 구조는 몇 분짜리 일회성 코딩 작업보다 **수 시간~수 일 동안 이어지는 research, migration, benchmark, monitoring workflow**에 특히 적합하다.

---

## Agent-to-Agent Communication

Prime Agent는 실행 중인 Agent끼리 직접 메시지를 교환할 수 있다.

```bash
prime-agent send <agent> "Please verify the latest migration"
```

IPython에서도 `agent_message`를 사용하여 다른 Agent나 child agent를 제어할 수 있다.

메시지 전달에는 대표적으로 다음 모드가 있다.

| 모드 | 의미 |
|---|---|
| `auto` | 상대 상태에 따라 즉시 전달 또는 steering |
| `steer` | 현재 실행 중인 작업에 지시를 주입 |
| `follow_up` | 현재 작업 종료 후 다음 지시로 전달 |

즉 멀티에이전트 시스템을 외부 Orchestrator만으로 구성하지 않고 Agent Runtime 자체의 기본 기능으로 제공한다.

---

## Heartbeat와 Scheduler

Prime Agent는 반복 또는 예약 실행을 기본 기능으로 제공한다.

### 사용자 Heartbeat

```text
/heartbeat every 10m Check the deployment and report meaningful changes
```

### 일반 Schedule

```bash
prime-agent schedule add worker "in 30m" -- "Check the benchmark result"
prime-agent schedule add worker "0 9 * * 1-5" -- "Review open work"
```

### Agent 내부 Heartbeat

Agent 자체도 `rlm_heartbeat`를 통해 내부 반복 작업을 생성할 수 있다.

예를 들어 테스트가 끝났는지 5분마다 확인하고, 배포 상태는 10분마다 확인하는 식의 구조를 Agent가 프로그래밍할 수 있다.

---

## Persistent Goal

`/goal`은 세션을 넘어 계속 유지해야 하는 목표를 기록한다.

```text
/goal Ship the release and verify every published artifact
```

Goal에는 상태와 progress뿐 아니라 token usage, elapsed time, continuation count, optional token budget 등이 기록된다.

구조적으로는 다음과 같이 이해할 수 있다.

```text
Persistent Goal
      ↓
Agent Runtime
 ├─ Autonomous continuation
 ├─ Subagents
 ├─ Heartbeats
 ├─ Scheduler
 ├─ Context Compaction
 └─ Quality Gates
      ↓
Goal Complete
```

Goal과 Autonomous Mode는 서로 다른 개념이다.

- **Goal**: 무엇을 끝내야 하는지 지속적으로 보존
- **Autonomous Mode**: 사람이 입력하지 않아도 다음 turn을 계속 진행할지 결정

---

## Autonomous Mode

Prime Agent는 bounded autonomous execution을 지원한다.

```bash
prime-agent \
  --autonomous \
  --autonomous-gate "npm run check" \
  --autonomous-max-turns 20 \
  "Implement and verify the requested change"
```

자동 실행에는 다음과 같은 한도를 둘 수 있다.

- continuation 수
- assistant turn 수
- token
- wall-clock time
- quality gate

Quality gate가 실패하면 그 결과를 Agent에게 다시 전달하여 수정하게 할 수 있다.

따라서 무한 autonomous loop보다는 **예산과 검증 조건이 있는 제한된 자율 실행**을 지향한다.

---

## Context Compaction

장기 작업에서는 context가 계속 커지는 문제가 발생한다.

Prime Agent는 오래된 대화를 요약하고 최근 context를 유지하는 automatic compaction을 제공한다.

특히 중요한 점은 **대화 context를 compact해도 Persistent IPython kernel state는 유지할 수 있다는 것**이다.

따라서 오래 실행되는 작업에서 다음 항목을 대화창에 계속 들고 다닐 필요가 줄어든다.

- parsed data
- helper function
- task handle
- imported modules
- 작업 중간 결과

---

## Skill 구조

Prime Agent는 Agent Skills의 `SKILL.md` 형식을 지원하며, 여기에 Python-backed skill을 확장한다.

Instruction-only skill뿐 아니라 실제 Python package와 callable을 함께 제공할 수 있다.

예:

```python
report = await release_audit(
    repository=".",
    target_version="0.4.0"
)
```

Python-backed skill 내부에서도 `rlm(...)`을 호출해 다른 Agent에게 작업을 위임할 수 있다.

즉 Skill은 단순 prompt snippet이 아니라 **Agent가 import하여 호출하는 재사용 가능한 프로그래밍 capability**로 발전할 수 있다.

---

## 모델 / Provider 지원

Prime Agent는 특정 모델에 종속된 CLI가 아니다.

Subscription 방식으로는 다음을 지원한다.

- ChatGPT Plus / Pro → Codex
- Claude Pro / Max
- GitHub Copilot

API Key 방식으로는 다음을 포함한 다양한 Provider를 지원한다.

- OpenAI
- Anthropic
- Google Gemini
- Azure OpenAI
- Amazon Bedrock
- Prime Inference
- DeepSeek
- Mistral
- Groq
- Cerebras
- xAI
- OpenRouter
- Vercel AI Gateway
- Kimi for Coding
- MiniMax
- Hugging Face
- Fireworks
- 기타 custom provider

따라서 관계는 다음처럼 이해하는 편이 맞다.

```text
Prime Agent Runtime
       ↓
 ┌─────┼──────┬──────┐
Codex Claude Gemini Kimi ...
```

---

## Codex / Claude Code와의 차이

Prime Agent는 경쟁 LLM이 아니라 Harness이므로 직접적인 모델 비교 대상은 아니다.

| 항목 | 일반적인 Codex / Claude Code 사용 | Prime Agent |
|---|---|---|
| 주요 목적 | 코딩 작업 수행 | 장기 실행 Agent Runtime |
| 모델 | 각 제품 중심 | Multi-provider |
| Tool 구조 | 여러 Tool 호출 | Persistent IPython 중심 |
| Subagent | 제품별 지원 | RLM 핵심 primitive |
| 세션 지속 | 제품별 방식 | daemon 기반 핵심 구조 |
| Background | 제품별 차이 | 기본 설계 |
| Agent ↔ Agent | 제한적 | 직접 Messaging |
| Scheduler | 외부 구성하는 경우 많음 | 내장 |
| Persistent Goal | 별도 설계 필요 | 내장 |
| Self-improvement | 외부 Memory/Skill 구성 | Continual Harness |
| 외부 App 연동 | 제품별 API/SDK | RPC / JSON / SDK |

따라서 Prime Agent는 Codex/Claude를 대체하는 모델이라기보다 **그 모델을 장기 실행 Agent System으로 운영하는 상위 Runtime 후보**로 보는 것이 적절하다.

---

## RPC Mode

외부 프로그램과 연결할 때 가장 중요한 기능이다.

```bash
prime-agent --mode rpc
```

stdin/stdout JSONL 프로토콜을 통해 외부 Application이 Agent를 제어할 수 있다.

주요 기능은 다음과 같다.

```text
prompt
steer
follow_up
abort
new_session
get_state
get_messages
set_model
compact
schedule
heartbeat
agent messaging
observe
```

따라서 Discord Bot, Web UI, IDE, Voice Assistant 같은 Frontend와 Agent Runtime을 분리하기 좋다.

---

## Aina 적용 관점

Aina 같은 개인 AI 비서 구조에서는 Prime Agent를 **대화 UI가 아니라 Agent Backend Runtime**으로 활용하는 방식이 특히 유용하다.

예상 구조:

```text
Discord
Voice Device
     │
     ▼
┌─────────────┐
│    Aina     │
│ Channel/UX  │
└──────┬──────┘
       │ RPC
       ▼
┌────────────────────┐
│    Prime Agent     │
│ Runtime            │
├────────────────────┤
│ Root Agent         │
│ Continual Harness  │
│ Scheduler          │
│ Persistent Goal    │
│ Subagents          │
└─────────┬──────────┘
          │
      ┌───┴────┐
      ▼        ▼
    Codex    Claude
```

이렇게 구성하면 Aina 쪽에서 직접 구현해야 할 다음 영역을 상당 부분 Prime Agent에 맡길 수 있다.

- Session lifecycle
- Background execution
- Agent resume / attach
- Subagent 관리
- Context compaction
- Scheduler
- Heartbeat
- Persistent Goal
- Agent-to-Agent messaging
- Model provider switching

Aina는 다음 역할에 집중할 수 있다.

- Discord / Voice Channel
- 사용자 인증
- 메시지 Routing
- 권한 정책
- UX
- 개인 데이터 연결

즉 **Frontend/Assistant UX와 Agent Runtime의 책임을 명확하게 분리**할 수 있다.

### PoC 우선순위

Aina와 연결을 검토한다면 다음 순서가 적절하다.

1. 별도 테스트 Repository에서 Prime Agent 설치
2. Codex provider 연결
3. daemon session detach / attach 확인
4. RPC mode에서 prompt / steer / get_state 검증
5. Subagent 생성 및 parent-child messaging 테스트
6. Heartbeat / schedule 장기 실행 테스트
7. `/goal` + autonomous quality gate 테스트
8. 기존 Aina Discord Adapter와 RPC bridge PoC
9. Continual Harness가 실제 개인 비서 Memory에 적합한지 검증

---

## 기술 구조

현재 Repository는 TypeScript/Node 모노레포 형태이며 주요 workspace가 분리되어 있다.

```text
packages/
 ├─ ai
 ├─ agent
 ├─ coding-agent
 └─ tui
```

Node.js 22.8 이상을 요구하며 `pi` 기반 Agent 구조를 확장하고 있다.

---

## 보안상 주의점

Prime Agent의 worker와 IPython kernel은 lifecycle isolation과 failure containment를 위해 별도 process로 분리되지만 **Security Sandbox가 아니다.**

모델이 생성한 Python과 Shell command가 기본적으로 사용자의 OS 권한으로 실행된다.

따라서 다음 원칙이 필요하다.

- 신뢰할 수 없는 Repository에서는 직접 실행하지 않기
- 외부 Skill 설치 전 코드 검토
- 중요한 Workspace는 Git/Perforce checkpoint 확보
- disposable clone 또는 별도 worktree 사용
- 신뢰하지 않는 작업은 container/VM 등 외부 sandbox에서 실행
- Personal Assistant와 연결할 경우 실행 권한과 접근 가능한 디렉터리를 제한

특히 장기 실행 및 autonomous 기능을 활성화할수록 이 권한 경계가 중요하다.

---

## 평가

Prime Agent에서 특히 참고 가치가 높은 영역은 다음과 같다.

1. **Daemon-based Agent Runtime**  
   CLI process가 아니라 지속적으로 살아 있는 Agent Service로 작업을 운영한다.

2. **RPC Interface**  
   Discord, Web, Voice 같은 UI Layer와 Agent Runtime을 쉽게 분리할 수 있다.

3. **RLM Subagent**  
   다른 Agent를 `rlm()`이라는 프로그램 primitive처럼 생성하고 유지한다.

4. **Continual Harness**  
   대화 내용뿐 아니라 Agent가 작업하는 방법 자체를 축적하고 개선한다.

5. **Goal + Heartbeat + Scheduler + Autonomous Mode**  
   사용자의 지속적인 prompt 입력 없이 장기 목표를 운영할 수 있다.

단순히 Codex/Claude Code를 대체하기 위한 CLI로 보기보다는 **개인 또는 조직용 Agent Platform을 구성할 때 사용할 Runtime/Architecture Reference**로 보는 것이 더 가치가 크다.

Aina 관점에서는 특히 RPC와 daemon architecture 때문에 차세대 Agent Backend 후보로 PoC할 가치가 높다.

---

## 참고 문서

- Repository: https://github.com/PrimeIntellect-ai/prime-agent
- Architecture: https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/architecture.md
- RLM Programming Model: https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/rlm.md
- Long-running Agents: https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/long-running-agents.md
- Providers: https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/providers.md
- RPC Mode: https://github.com/PrimeIntellect-ai/prime-agent/blob/main/packages/coding-agent/docs/rpc.md
