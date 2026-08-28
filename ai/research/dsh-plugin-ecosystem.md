---
title: DeepSeek Harness Plugin Ecosystem
category: research
tags:
  - ai
  - agent
  - deepseek
  - deepseek-harness
  - dsh
  - plugin
source: https://github.com/topics/dsh-plugin
updated: 2026-08-29
---

# DeepSeek Harness Plugin Ecosystem

> `dsh-plugin`은 DeepSeek Harness의 공식 권장 플러그인 발견용 GitHub Topic이며, DSH의 `Everything is a Plugin` 구조를 바탕으로 빠르게 커지는 확장 생태계를 보여준다.

## 프로젝트 개요

DeepSeek Harness(`dsh`)는 DeepSeek AI가 공개한 오픈소스 Agent Harness다. 핵심 설계는 Cordis를 기반으로 하며 모델, 도구, UI, 메모리, 실행 기능 등을 플러그인으로 조립하는 방향을 취한다.

공식 README는 플러그인 저장소에 `dsh-plugin` GitHub Topic을 붙여 검색 가능하게 만들 것을 권장한다. 따라서 `github.com/topics/dsh-plugin`은 사실상 현재 DSH 커뮤니티 플러그인의 공개 discovery surface 역할을 한다.

2026-08-29 확인 시 Topic 페이지는 12,520개의 public repository를 표시했다. 다만 Topic 태그는 누구나 붙일 수 있으므로 이 숫자를 실제 호환 플러그인 수로 해석해서는 안 된다. 실제 목록에는 DSH 전용 플러그인이 아닌 프로젝트도 섞여 있다.

## 해결하려는 문제

Agent Harness는 모델 호출만으로 완성되지 않는다. 실제 개발 환경에서는 메모리, 모델 선택, 비용 측정, 세션 상태, MCP, UI, 서브에이전트, 디자인/다이어그램 등 다양한 기능이 필요하다.

DSH는 이 기능을 코어에 계속 추가하기보다 플러그인 seam으로 분리하여 다음 문제를 해결하려 한다.

- 코어 비대화 방지
- 기능별 독립 개발 및 배포
- 사용자별 Harness 구성 차이 수용
- 외부 개발자가 Harness를 수정하지 않고 기능 추가
- 새로운 모델/도구/워크플로우를 빠르게 실험

## 핵심 구조

```text
DeepSeek Harness Core
        │
        ├─ Cordis / extension seams
        │
        ├─ Model / Provider plugins
        ├─ Tool / MCP plugins
        ├─ Memory / Knowledge plugins
        ├─ Session / Usage plugins
        ├─ Subagent / Orchestration plugins
        └─ UI / Workflow extensions

GitHub repositories
        │
        └─ topic: dsh-plugin
             └─ discovery / curated lists / community registries
```

커뮤니티 플러그인 저장소 사례에서는 각 플러그인을 독립 npm package로 두고 `package.json`에 `dsh.bundle` manifest를 선언하는 패턴이 확인된다. 설치는 `dsh plugin add <package-name>` 형태를 사용한다.

## 현재 생태계에서 주목할 영역

### Memory / Knowledge

`NinjaSln-labs/dsh-plugins`의 `dsh-knowledge-sqlite`는 cross-session knowledge, SQLite FTS5 기반 검색, knowledge tool을 제공한다. DSH를 일회성 coding agent가 아니라 장기 실행 Agent로 사용할 때 중요한 확장 영역이다.

### Session / Token / Cost

같은 컬렉션의 `dsh-session-health`는 session health, token/cost 상태 및 handoff 관련 기능을 제공한다. `Yihong89/dsh-plugins`의 usage-report 계열과 `dsh-usage-stats`처럼 토큰/모델 사용량을 관찰하는 플러그인도 등장하고 있다.

이는 장시간 Agent 운영에서 observability가 별도 플러그인 계층으로 성장하고 있음을 보여준다.

### Model Routing / Subagent

`dsh-subagent-model-picker`는 subagent 호출마다 provider/model/max_tokens를 지정할 수 있게 한다. Harness 레벨에서 작업 성격에 따라 모델을 분리하는 구조에 직접 활용할 수 있다.

### Design / Diagram / Skills

Topic 상위에는 `open-design`, `archify`, `distilly`처럼 DSH 외 Claude Code, Codex 등 여러 Agent에서도 사용할 수 있는 프로젝트가 보인다. DSH 플러그인 생태계가 순수 DSH 전용 패키지만이 아니라 Agent Skill과 외부 workflow를 연결하는 방향으로 확장되고 있음을 보여준다.

### Meta Harness / Orchestration

`ruflo` 같은 multi-agent/meta-harness 프로젝트도 `dsh-plugin` topic에 들어와 있다. DSH가 다른 orchestration layer와 결합될 수 있다는 점은 흥미롭지만, Topic 태그만으로 실제 DSH plugin API 호환성을 판단해서는 안 된다.

## 플러그인 탐색 시 주의점

GitHub Topic 자체는 registry가 아니다. 실제 Topic 페이지에 DSH와 직접 관계가 약한 repository도 확인된다.

따라서 설치 전 최소한 다음을 확인해야 한다.

1. 실제 `dsh.bundle` manifest 또는 공식 extension seam 사용 여부
2. 지원하는 DSH 버전/peer dependency
3. 최근 commit과 release 상태
4. install/build script
5. filesystem/network 접근 범위
6. secret/API key 처리 방식
7. DSH breaking change 대응 여부

특히 DSH 공식 프로젝트는 현재 Developer Preview이며 compatibility-breaking change 가능성을 명시하고 있으므로 플러그인 호환성 유지 비용이 크다.

## Curated List의 가치

Raw Topic 대신 curated repository를 함께 사용하는 편이 안전하다.

`walkinglabs/awesome-deepseek-harness-plugins`는 단순 Topic 등록 여부가 아니라 실제 manifest/extension seam을 확인하고 dependency, script, entrypoint, workflow, sensitive operation 등에 대한 정적 보안 triage를 수행한다고 설명한다.

`awesome-dsh-plugin` 및 `awesome-deepseek-harness` 계열 프로젝트도 생태계 탐색에 유용하다. 단, curated list 역시 공식 registry 또는 보안 감사 결과는 아니다.

## 장점

- Harness 코어를 수정하지 않고 기능 확장 가능
- 작은 기능을 독립적으로 교체/실험하기 쉬움
- 모델 라우팅, memory, observability 같은 운영 기능을 조합 가능
- Claude Code/Codex/Agent Skills/MCP 생태계와 교차 연결 가능성이 높음
- DeepSeek 모델에 최적화된 개인 Harness를 구축하기 좋은 구조

## 단점 및 한계

- DSH 자체가 Developer Preview 단계라 API 안정성이 낮음
- Topic 기반 discovery는 노이즈가 매우 많음
- 플러그인별 품질과 유지보수 수준 편차가 큼
- third-party build/install script는 supply-chain 위험이 있음
- 플러그인이 많아질수록 dependency 및 configuration 충돌 가능성 증가
- Enterprise 환경에서는 네트워크, secret, package source 검증 정책이 추가로 필요
- Windows 호환성은 플러그인별로 별도 검증 필요

## 기존 방식과 비교

Claude Code나 Codex가 Skill, MCP, hook/configuration 등을 조합해 확장되는 것과 목적은 유사하지만, DSH는 `Everything is a Plugin`을 Harness의 중심 설계로 더 강하게 밀어붙인다.

이 때문에 DSH의 장점은 하나의 완성된 coding agent보다 **조립 가능한 Agent runtime**으로 볼 때 더 명확하다. 반대로 사용자가 안정된 turnkey coding agent를 원하는 경우에는 현재의 빠른 API 변화와 plugin compatibility 관리가 부담이 될 수 있다.

## 활용 아이디어

### 바로 적용 가능

- usage/session-health plugin으로 DeepSeek 기반 Agent의 token/cost 관찰
- knowledge plugin으로 cross-session memory PoC
- 검증된 Skill/diagram plugin을 개발 문서화 workflow에 연결

### PoC 가치 있음

- Orchestrator는 상위 모델, Worker는 DeepSeek 계열 모델로 분리하고 model-picker plugin으로 routing
- 장시간 coding session에서 session health → 자동 handoff → knowledge persistence 흐름 구성
- DSH를 Claude Code/Codex와 병렬 worker로 사용하는 multi-agent Harness 실험

### 아이디어 참고

- 내부 Agent 플랫폼도 기능을 코어에 누적하기보다 plugin contract로 분리
- model/provider/tool/memory/observability를 동일 extension model 아래 두는 구조 참고
- GitHub Topic + manifest 검증 crawler 형태의 사내 plugin catalog 구축

### 현재는 도입 가치 낮음

- API 안정성과 장기 지원이 필수인 Enterprise production Harness의 즉시 전면 전환
- 검증 없이 Topic에 등록된 플러그인을 자동 설치하는 운영 방식

## 결론

`dsh-plugin` Topic의 핵심 가치는 개별 플러그인 숫자보다 DeepSeek Harness가 어떤 방향으로 확장되고 있는지 보여주는 데 있다. 특히 memory, observability, model routing, skills, UI가 빠르게 별도 plugin으로 등장하고 있어 DSH는 단순 DeepSeek coding CLI보다는 조립형 Agent Harness로 발전할 가능성이 크다.

실무적으로는 **지금 당장 표준 Harness로 채택하기보다는, 플러그인 구조와 DeepSeek worker 활용을 PoC하면서 검증된 플러그인만 선별 도입하는 전략**이 적절하다.

## 참고 자료

- https://github.com/topics/dsh-plugin
- https://github.com/deepseek-ai/deepseek-harness
- https://github.com/NinjaSln-labs/dsh-plugins
- https://github.com/walkinglabs/awesome-deepseek-harness-plugins
- https://github.com/topics/deepseek-harness-plugin
