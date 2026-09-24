---
title: Google AX
category: harness
tags:
  - ai
  - agent
  - orchestration
  - harness
  - kubernetes
  - sandbox
source: https://github.com/google/ax
updated: 2026-09-24
---

# Google AX

> Kubernetes와 유사한 선언형 리소스 모델로 대규모 자율 Agent workload를 격리·준비·통제·중단/재개하는 Google의 오픈소스 Agent orchestration runtime.

## 프로젝트 개요

Google AX는 일반적인 Agent SDK나 대화형 Agent 프레임워크가 아니라, Agent 실행 자체를 클러스터 단위의 workload로 취급하는 orchestration/runtime 계층이다. 사용자는 YAML manifest로 Task, Workspace, Gateway, Model을 선언하고 CLI로 apply/get/describe/watch/delete/suspend/resume한다.

AX는 Agent Substrate 위에서 sandboxed execution을 제공하며, Kubernetes CRD에 수백만 개의 단기 Task를 저장하는 대신 Redis와 Redis Streams를 사용해 대규모 task 상태와 reconciliation을 처리하도록 설계되어 있다.

현재 저장소는 안정화 전 단계이며 README에서 stable release 이전에 core concepts/protocol/specification의 breaking change 가능성을 명시한다.

## 해결하려는 문제

Agent workload는 전통적인 stateless microservice나 단순 batch job과 다르다.

- 실행 중 상태가 축적된다.
- Git repository, MCP server, skill 등 실행 전 환경 준비가 필요하다.
- 신뢰할 수 없는 코드와 tool execution을 격리해야 한다.
- 외부 model/tool endpoint 접근을 제한해야 한다.
- 장시간 idle 상태에서도 상태를 보존해야 한다.
- 잘못된 loop가 compute/token 비용을 계속 소모할 수 있다.
- 수많은 Agent task를 cluster 수준에서 관찰하고 lifecycle을 관리해야 한다.

AX는 이를 application 내부 orchestration 문제가 아니라 infrastructure/runtime 문제로 끌어내려 선언적으로 관리하려 한다.

## 핵심 기능

### Task

격리 실행의 최소 단위다. Container image/command, CPU·memory request/limit, environment, Gateway, 하나 이상의 Workspace binding을 정의한다.

Agent가 작업을 분해하면 하나의 Task가 전체 job일 수도 있고 root task 아래 task tree를 구성할 수도 있다.

### Workspace

Agent가 실행되기 전에 필요한 환경을 선언한다.

- Git repository checkout
- MCP server/registry
- Skill registry 및 materialization path
- 자연어 goal 기반 workspace bootstrap

같은 환경을 여러 Task에서 재사용할 수 있다.

### Gateway

Task의 network boundary다.

- inbound listener
- outbound host/port allowlist

Agent가 접근 가능한 model API, Git host, MCP server 등을 제한하는 보안 계층으로 사용할 수 있다.

### Model

Model 자체가 아니라 cluster에서 재사용 가능한 model configuration resource다.

Provider, model identifier, generation parameter, Kubernetes Secret credential reference를 중앙 관리한다.

### Suspend / Resume

실행 중 Task의 actor state를 checkpoint하고 중단한 뒤 재개할 수 있다. Roadmap에는 idle detection을 통한 자동 suspend와 stateful task branching도 포함되어 있다.

### Debug / Observability

`ax watch`로 상태 transition을 보고, debug가 활성화된 Task는 `ax ssh`로 sandbox 내부를 검사할 수 있다.

## 아키텍처

```text
Developer / CI / Agent
        |
        | ax apply / gRPC
        v
+--------------------+
|     ax-server      |
| stateless gRPC API |
+---------+----------+
          |
          | state + event
          v
+--------------------+
|       Redis        |
| Hash / Streams /   |
| PubSub             |
+---------+----------+
          |
          | XREADGROUP
          v
+--------------------+
|   ax-controller    |
| reconciliation     |
| workers            |
+---------+----------+
          |
          | gRPC
          v
+--------------------------+
|     Agent Substrate      |
| atespace / actor /       |
| worker / egress policy   |
+------------+-------------+
             |
             v
+--------------------------+
| Task Sandbox             |
| ax-task-runner           |
| Workspace + MCP + Skills |
| Agent command            |
+--------------------------+
```

주요 binary는 다음 네 가지다.

- `ax`: kubectl 스타일 개발자 CLI
- `ax-server`: manifest validation, Redis persistence, event publish를 담당하는 stateless gRPC API
- `ax-controller`: Redis stream을 소비하며 Agent Substrate의 actor/atespace/network policy를 reconcile
- `ax-task-runner`: Task container의 PID 1로 workspace를 준비하고 실제 Agent command를 실행

### 실행 흐름

1. 사용자가 Task/Workspace/Gateway/Model manifest를 `ax apply`한다.
2. ax-server가 검증 후 Redis에 상태를 저장하고 event를 발행한다.
3. ax-controller worker가 Redis Streams에서 event를 소비한다.
4. Agent Substrate를 통해 sandbox actor와 network policy를 준비한다.
5. ax-task-runner가 Workspace의 Git/MCP/Skill을 materialize한다.
6. 필요하면 Workspace goal을 이용해 실행 환경을 준비한다.
7. Agent command가 실행된다.
8. AX가 status/condition을 갱신하며 watch/ssh/suspend/resume 인터페이스를 제공한다.

## 기존 방식과의 차이

### 일반 Agent Framework와의 차이

LangGraph, CrewAI 같은 framework가 Agent의 reasoning/workflow/tool 호출을 application 내부에서 구성하는 데 집중한다면 AX는 그 Agent가 실행되는 sandbox, workspace, network, lifecycle, cluster scheduling 계층에 가깝다.

따라서 서로 직접 대체하기보다 Agent framework를 AX Task 안에서 실행하는 형태가 자연스럽다.

### Kubernetes와의 차이

사용 경험은 Kubernetes와 유사하지만 Task를 Kubernetes CRD로 직접 모델링하지 않는다. AX 설계 문서는 millions of short-lived tasks를 etcd에 넣을 경우 storage/write-rate/control-plane 문제가 발생할 수 있다고 보고 Redis + Redis Streams를 별도 control plane으로 사용한다.

또한 Workspace, MCP, Skill, Model, suspend/resume 등 Agent workload에 특화된 primitive를 제공한다.

## 장점

- Agent 실행 환경을 코드가 아닌 declarative manifest로 표준화할 수 있다.
- sandbox, resource limit, egress policy를 Agent workload의 기본 요소로 취급한다.
- Git/MCP/Skill 준비를 Workspace라는 재사용 가능한 resource로 분리한다.
- suspend/resume 구조는 장시간 실행 Agent의 비용 및 cluster density 관리에 유리하다.
- application Agent framework와 infrastructure orchestration을 분리할 수 있다.
- Redis Streams + horizontally scaled controller 구조는 대량의 short-lived task를 염두에 둔 설계다.
- custom runner 계약을 통해 특정 Agent harness에 강하게 고정되지 않는 방향을 취한다.

## 단점 및 한계

### 아직 매우 초기 단계

API가 `v1alpha1`이며 프로젝트 스스로 stable release 전 breaking change 가능성을 경고한다. 현재 production 표준으로 고정하기에는 위험하다.

### Kubernetes + Agent Substrate 운영 부담

Quick Start만 해도 Kubernetes cluster, container registry, ko, Redis, Agent Substrate가 필요하다. 개인 개발 환경이나 작은 팀에서는 Agent를 직접 container/process로 실행하는 것보다 운영 복잡도가 크게 증가한다.

### 보안/거버넌스가 아직 진행 중

Roadmap에 SPIFFE identity, least-privilege policy, governance, telemetry가 향후 항목으로 남아 있다. 최근 issue에서도 task-scoped authority, control-plane authentication/authorization 등 production security와 관련된 논의가 진행 중이다.

### 현재 구현과 문서 간 간극 가능성

최근 issue에는 provider 지원, controller throughput, validation, snapshot 설정 등 구현/문서의 불일치를 지적하는 항목이 존재한다. alpha 프로젝트로 보고 실제 도입 전 반드시 현재 commit 기준 검증이 필요하다.

### Windows/Enterprise

AX 자체는 Kubernetes/Linux container 중심 구조다. Windows-native 개발환경을 직접 관리하는 harness라기보다는 Linux/Kubernetes 기반 remote execution plane으로 보는 편이 적절하다. Perforce/사내 인증/Windows toolchain 같은 enterprise 환경은 별도 Workspace setup, custom image/runner, credential policy 설계가 필요하다.

## Token / Cost 관점

AX 자체가 prompt token을 직접 최적화하는 프로젝트는 아니다. 대신 비용 폭주를 runtime 수준에서 제어할 기반을 제공한다.

- Task compute limits
- lifecycle 관리
- suspend/resume
- 향후 token/timeout budget 및 approval policy
- idle detection 기반 auto suspension

즉 context compression 도구보다는 Agent의 실행 비용과 lifecycle을 infrastructure policy로 통제하는 방향이다.

## 활용 사례

### 대규모 Coding Agent Farm

PR/Issue별 coding agent를 각각 격리 Task로 실행하고 Workspace에 repository + MCP + skills를 선언한다.

### Agent CI Worker

CI 요청마다 ephemeral Agent Task를 만들고 제한된 Git/MCP endpoint만 Gateway로 허용한 뒤 결과를 수집한다.

### Multi-Agent Task Tree

Orchestrator가 작업을 분해할 때 하위 Agent를 별도 Task로 생성해 동일한 isolation/lifecycle 규칙을 적용한다.

### Enterprise Agent Sandbox

사내 Agent가 임의 endpoint에 접근하지 못하도록 Gateway allowlist와 resource policy를 중앙 통제한다.

## 활용 아이디어

### 바로 적용 가능: 아키텍처 패턴 참고

현재 직접 production 도입보다는 AX의 primitive 분리가 특히 참고 가치가 높다.

- Task = 실행 단위
- Workspace = 코드/도구/Skill/Context 환경
- Gateway = 권한 및 network boundary
- Model = model policy/config
- Runner = harness adapter

Agent harness를 설계할 때 execution과 environment preparation을 분리하는 기준으로 활용하기 좋다.

### PoC 가치 있음: 사내 Agent Worker Pool

Kubernetes 기반 Agent 실행 인프라가 필요하다면 소수 Task로 PoC할 가치가 있다. 특히 여러 coding agent를 장시간 운영하면서 isolation, suspend/resume, 중앙 network policy가 필요한 환경과 잘 맞는다.

### PoC 가치 있음: Perforce Workspace Adapter

현재 Workspace는 Git 중심이지만 custom runner/workspace setup 개념을 응용해 Perforce sync를 수행하는 adapter를 설계할 수 있다. 이 경우 repository 준비와 Agent 실행을 분리하는 AX roadmap의 setup actor 패턴도 참고할 만하다.

### 아이디어 참고: Harness Control Plane

기존 harness가 Agent 내부의 Plan/Run/Review를 담당한다면 AX와 같은 runtime은 그 바깥에서 sandbox 생성, workspace 준비, budget, network, lifecycle을 담당하는 2계층 구조로 분리할 수 있다.

```text
Harness / Orchestrator
  Plan -> Delegate -> Review
          |
          v
Runtime Control Plane
  Task -> Workspace -> Gateway -> Sandbox
          |
          v
Agent Runner
  Claude / Codex / custom agent
```

### 현재는 도입 가치 낮음

단일 PC에서 Claude Code/Codex를 몇 개 실행하거나 Kubernetes 운영 기반이 없는 경우 AX 전체 stack은 과하다. 이 경우 구조적 아이디어만 가져오는 편이 비용 대비 효율적이다.

## 프로젝트 성숙도

2026-09-24 조사 기준:

- API: v1alpha1
- Latest GitHub release: v0.2.2
- 공식적으로 breaking change 가능성 경고
- repository는 지속적으로 변경 중
- 최근에도 architecture/security/scalability 관련 issue가 활발히 등록됨

따라서 "완성된 Agent Kubernetes"라기보다 Google이 공개적으로 구체화하고 있는 Agent workload orchestration architecture의 초기 구현체로 보는 것이 적절하다.

## 결론

Google AX의 중요한 점은 특정 Agent 기능보다 **Agent를 새로운 infrastructure workload로 정의하는 방식**이다.

특히 Task/Workspace/Gateway/Model 분리와 sandbox lifecycle, Redis 기반 reconciliation, suspend/resume은 향후 대규모 Agent infrastructure가 어떤 primitive를 가져야 하는지 보여주는 좋은 참고 사례다.

현재 alpha 상태와 운영 의존성 때문에 일반 개발팀이 바로 production에 채택하기보다는, Agent platform/harness를 설계하는 입장에서 architecture reference로 분석하고 Kubernetes 기반 Agent farm이 실제 필요할 때 PoC하는 것이 현실적이다.

## 참고 자료

- https://github.com/google/ax
- https://github.com/google/ax/blob/main/DESIGN.md
- https://github.com/google/ax/blob/main/docs/concepts.md
- https://github.com/google/ax/blob/main/docs/manifests.md
- https://github.com/google/ax/blob/main/docs/roadmap.md
- https://github.com/google/ax/blob/main/docs/runner.md
- https://github.com/google/ax/releases
