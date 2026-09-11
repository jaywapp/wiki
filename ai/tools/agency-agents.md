---
title: Agency Agents
category: tools
tags: [AX, AI-Agent, Claude-Code, Codex, Multi-Agent, Agent-Prompt]
source: https://github.com/msitarzewski/agency-agents
updated: 2026-09-12
---

# Agency Agents

> 전문 역할 프롬프트를 대규모 카탈로그로 관리하고 여러 AI 코딩 도구에 변환·설치하는 Agent Engineering 자산 저장소.

## 프로젝트 개요

Agency Agents(The Agency)는 개발, 디자인, PM, 테스트, 보안, 마케팅, 게임 개발 등 다양한 직무의 전문 에이전트를 Markdown 정의로 제공한다. 자체 LLM 런타임이라기보다 역할 정의, 변환기, 설치 계층이 핵심이다. 2026-09-09 최신 커밋 기준 279 agents × 14 tools 변환 검증이 언급될 정도로 카탈로그와 지원 대상이 크게 확장되었다.

Claude Code에서는 원본 Markdown agent를 네이티브로 사용하며, 다른 호스트는 변환/설치 스크립트를 통해 대응한다. 공식 데스크톱 앱도 별도 제공되지만 앱 자체 역시 agent runtime은 아니다.

## 해결하려는 문제

- 한 범용 에이전트가 설계·구현·리뷰·UX·테스트를 모두 수행할 때 역할별 품질 기준이 흐려지는 문제
- 반복적인 역할 프롬프트 작성 비용
- 프로젝트/팀마다 달라지는 AI 작업 방식
- Claude Code, Codex, Cursor 등 호스트별 프롬프트 자산 파편화
- 작업의 deliverable과 success criteria가 불명확한 문제

## 핵심 기능

### 전문 Agent Catalog

각 에이전트는 단순 persona보다 Identity, Mission, Rules, Deliverables, Workflow, Success Metrics, Communication Style 등을 포함하는 재사용 가능한 업무 역할 정의에 가깝다.

### Multi-tool 배포

원본 agent definitions를 도구별 형식으로 변환하고 설치한다. Claude Code는 `~/.claude/agents/`에 직접 설치하며 GitHub Copilot, Gemini 계열, OpenCode, Cursor, Aider, Windsurf, OpenClaw, Codex, Hermes 등 다양한 호스트를 지원하는 방향으로 확장되고 있다.

### Workflow Examples

`examples/`에는 단순 역할 목록 외에도 Startup MVP, Landing Page, Book Chapter, Memory 연동, NEXUS Spatial Discovery 같은 multi-agent workflow 예제가 있다.

Startup MVP 예시는 Sprint Prioritizer와 UX Researcher의 병렬 작업 → Backend Architect → Frontend Developer/Rapid Prototyper → Reality Checker → Growth Hacker → 최종 Reality Check 흐름을 제시한다.

핵심 패턴은 sequential handoff, parallel work, quality gate, context passing이다. 특히 예제는 에이전트 간 shared memory를 전제로 하지 않고 이전 agent output을 다음 prompt에 전달하도록 명시한다.

## 아키텍처

```text
Agent Markdown Catalog
  ├─ engineering/
  ├─ design/
  ├─ game-development/
  ├─ security/testing/...
  └─ divisions.json
          │
          ▼
   convert / install layer
          │
          ├─ Claude Code agents
          ├─ Copilot agents
          ├─ Cursor rules
          ├─ Gemini/OpenCode
          ├─ Codex
          └─ Hermes plugin 등
          │
          ▼
     Host Agent Runtime
```

Workflow 관점에서는 다음처럼 볼 수 있다.

```text
User Task
   │
   ▼
Planner / Specialist A
   │ output/context
   ├──────────────┐
   ▼              ▼
Specialist B   Specialist C
   └──────┬───────┘
          ▼
     Implementer
          ▼
   Reality Checker
          │
      fail│ pass
          ├──→ specialist 재작업
          └──→ 완료
```

중요한 점은 기본 저장소가 이 그래프를 강제 실행하는 orchestration engine은 아니라는 것이다. 실제 호출, 세션, tool use, context 관리는 호스트가 담당한다. 다만 Hermes 통합처럼 일부 대상에서는 실제 specialist delegation을 위한 plugin 계층도 발전하고 있다.

## 장점

- 사내 Agent Catalog 설계 시 참고할 수 있는 방대한 역할 샘플
- 역할뿐 아니라 프로세스·산출물·성공 기준까지 정의되어 persona prompt보다 실무적
- 동일 agent asset을 여러 호스트로 배포할 수 있음
- MIT 라이선스로 조직 특화 역할로 개조하기 쉬움
- workflow 예제를 통해 Planner → Worker → Reviewer 패턴을 빠르게 실험 가능
- 최근에는 변환 산출물과 installer에 대한 회귀 검증이 강화되어 단순 prompt dump보다 engineering asset에 가까워지고 있음

## 단점 및 한계

- 전문 역할 prompt가 기반 모델 자체의 전문성을 높이는 것은 아님
- 수백 개 역할은 선택 비용과 관리 비용을 증가시킴
- 모든 agent를 상시 로딩하면 token/context 낭비 가능성이 큼
- 기본 workflow의 context handoff는 명시적 전달에 의존하며 shared memory/task graph가 자동 제공되는 것은 아님
- 호스트마다 agent/rule/skill 의미가 달라 변환 결과가 완전히 동등하다고 볼 수 없음
- 커뮤니티 기여가 빠른 만큼 조직 도입 전 prompt 품질, 보안 지침, tool 권한을 별도 검증해야 함
- 메인 저장소에는 GitHub Releases가 없어 버전 고정/변경 추적은 commit/tag 정책을 별도로 고려할 필요가 있음

## 활용 사례

- Backend Architect → Developer → Reality Checker 형태의 개발 품질 게이트
- UX Researcher → UI Designer → Frontend Developer 형태의 UI 작업 분업
- DevOps/Security/Testing reviewer를 변경 유형에 따라 선택 호출
- 조직 전용 WPF/.NET, Unreal, Perforce, TeamCity specialist agent 정의의 템플릿
- 프로젝트별 최소 agent set을 만들어 Claude Code/Codex에 배포

## 기존 도구와 비교

| 구분 | Agency Agents | 프로젝트별 Agent 정의 | CrewAI/AutoGen류 |
|---|---|---|---|
| 핵심 | 역할 자산 카탈로그/배포 | 프로젝트 최적화 역할 | 실행 오케스트레이션 |
| 실행 엔진 | 기본적으로 호스트 사용 | 호스트 사용 | 자체 runtime 중심 |
| 역할 카탈로그 | 매우 큼 | 직접 작성 | 직접 작성 중심 |
| Multi-tool 이식 | 강점 | 제한적 | 프레임워크 종속 |
| 자동 handoff | 호스트/통합에 의존 | 호스트에 의존 | 핵심 기능 |
| 적합 용도 | Agent Engineering 표준화 | 특정 프로젝트 최적화 | 복잡한 workflow 자동화 |

## 활용 아이디어

### 바로 적용 가능

전체 카탈로그 설치보다 역할 정의 스키마와 우수 agent 몇 개를 선별해 사내 표준 템플릿으로 활용하는 것이 좋다. 예: Planner, Backend Architect, Implementer, Test/Reality Checker, Release/DevOps 역할.

### PoC 가치 있음

현재 개발 harness에 `Task Classifier → Agent Selector → Specialist → Reviewer`를 추가하고 Agency Agents를 role catalog로만 사용하는 구조가 적합하다. 이렇게 하면 수백 개 agent prompt를 항상 context에 넣지 않고 필요한 정의만 lazy-load할 수 있다.

```text
Main Session / Orchestrator
        │
        ├─ task classify
        ▼
   Agent Registry
        │ select + lazy load
        ▼
   Specialist Session
        │ artifact/result
        ▼
 Independent Reviewer
        │
        └─ pass/fix loop
```

Perforce 환경에서는 agent마다 독립 workspace를 무조건 만드는 것보다 Analysis/Review 역할은 read-only 또는 동일 변경 목록을 읽게 하고 실제 파일 수정 Worker만 전용 workspace를 갖게 하는 구성이 운영 비용을 줄일 수 있다.

### 아이디어 참고

`Identity → Mission → Critical Rules → Deliverables → Workflow → Success Metrics` 구조와 agent별 eval을 결합해 사내 Agent Engineering 규격으로 발전시키는 것이 저장소를 그대로 설치하는 것보다 가치가 높다.

### 현재는 도입 가치 낮음

수백 개 agent를 전사 공용으로 한꺼번에 설치하고 사용자가 직접 이름을 골라 호출하는 방식. 역할 중복, discoverability, token/context, 유지보수 문제가 커질 가능성이 높다.

## 결론

Agency Agents의 핵심 가치는 '279개의 에이전트가 있다'는 숫자보다 **전문 역할을 버전 관리 가능한 자산으로 정의하고 여러 AI 호스트로 배포하는 Agent Catalog 패턴**에 있다. 실제 개발 harness에는 전체 도입보다 5~10개 핵심 역할을 선별하고 Router + lazy loading + 독립 Reviewer를 결합하는 방식이 더 실용적이다.

## 참고 자료

- Repository: https://github.com/msitarzewski/agency-agents
- Claude Code integration: https://github.com/msitarzewski/agency-agents/tree/main/integrations/claude-code
- Workflow examples: https://github.com/msitarzewski/agency-agents/tree/main/examples
- Official app releases: https://github.com/msitarzewski/agency-agents-app/releases
