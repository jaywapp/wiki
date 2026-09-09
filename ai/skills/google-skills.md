---
title: Google Skills
category: skills
tags:
  - ai
  - agent
  - agent-skills
  - google-cloud
  - claude-code
  - codex
  - mcp
source: https://github.com/google/skills
updated: 2026-09-09
---

# Google Skills

> Google 제품과 Google Cloud 작업을 AI 에이전트가 더 안전하고 일관되게 수행하도록 만든 공식 Agent Skills 카탈로그이자, 일부 Skill과 MCP를 Claude Code·Codex 등 여러 harness에 배포하는 플러그인 저장소다.

## 프로젝트 개요

`google/skills`는 Google이 관리하는 Agent Skills 저장소다. Google Cloud를 중심으로 AI/ML, GKE, 데이터베이스, 관측성, 보안, IAM, Cloud Run, Firebase, Ads, Analytics 등 제품별 지침과 멀티 제품 솔루션 workflow를 제공한다.

단순한 프롬프트 모음보다는 **에이전트가 특정 도메인에서 어떤 순서와 제약으로 행동해야 하는지를 코드 옆에 버전 관리하는 운영 지식 계층**에 가깝다.

저장소는 현재 활발히 개발 중이며 Apache 2.0 라이선스로 공개되어 있다.

## 해결하려는 문제

범용 LLM은 Google Cloud처럼 명령·API·제품 구성이 빠르게 바뀌는 환경에서 다음 문제가 있다.

- 오래된 CLI 문법이나 flag를 기억에 의존해 생성할 수 있다.
- destructive operation을 충분한 검증 없이 수행할 수 있다.
- `list` 결과를 과도하게 가져와 context/token을 낭비할 수 있다.
- 제품별 best practice와 실행 순서가 세션마다 달라질 수 있다.
- 복잡한 멀티 제품 아키텍처 설계에서 요구사항 확인, 설계, 구현, 검증 단계가 누락될 수 있다.

Google Skills는 이런 지식을 `SKILL.md`와 필요 시 `references/`, `assets/`로 패키징해 agent harness가 재사용하도록 만든다.

## 핵심 기능

### 1. 공식 Google 제품 Skill 카탈로그

대표 영역은 다음과 같다.

- Google Cloud onboarding/authentication
- Agent Platform / Gemini API / Genkit / Live API
- AI agent 및 multi-agent solution architecture
- GKE 운영, 보안, 네트워킹, storage, inference, troubleshooting
- BigQuery, AlloyDB, Spanner, Cloud SQL, Bigtable
- Cloud Monitoring / Logging / SLO / Cost Optimization
- IAM / DPoP / Security Command Center
- Cloud Run / Firebase
- Google Ads / Analytics

### 2. Skill + Reference 분리 구조

일부 Skill은 하나의 거대한 문서에 모든 지식을 넣지 않고 다음과 같이 구성된다.

```text
skill-name/
├── SKILL.md
├── references/
│   └── ...
└── assets/
    └── ...
```

예를 들어 `gcloud` Skill은 `SKILL.md`와 별도의 `references/`를 두며, AI agent 구축 Skill은 `SKILL.md + references + assets`로 구성된다.

이 구조는 로컬 Skill을 설계할 때 특히 참고 가치가 높다. 핵심 행동 규칙과 routing 정보는 `SKILL.md`에 유지하고, 상세 지식·제품 매핑·템플릿은 필요할 때 읽는 파일로 분리할 수 있다.

### 3. 실행 Guardrail을 Skill 자체에 포함

`gcloud` Skill은 단순 사용법보다 실행 정책을 강하게 정의한다.

- 정확한 leaf command에 대해 `gcloud help <leaf_command>`를 먼저 확인
- 부모 command help만으로 validation하지 않음
- command syntax 검증에 웹 검색을 사용하지 않음
- `list` 명령은 `--limit`, `--filter`, `--format` 중 하나 이상 사용
- project/location을 명시적으로 scope
- shell pipe/redirection/command substitution을 금지
- non-interactive 실행을 고려

즉 Skill을 **지식 문서가 아니라 agent execution policy**로 사용한다.

### 4. Workflow Skill

`google-cloud-solution-build-deploy-agents`는 복잡한 작업을 단계형 workflow로 고정한다.

1. Requirements discovery and analysis
2. Solution design
3. Implementation plan
4. Solution validation

각 단계에서 사용자 확인과 reference 문서 조회, architecture 생성, validation을 명시한다. 단순한 "전문가 역할 프롬프트"보다 실제 작업 상태 머신에 가깝다.

### 5. 여러 Agent Harness 지원

README 기준 설치 경로가 제공된다.

- 일반 Agent Skills: `npx skills add google/skills`
- Claude Code plugin marketplace
- Codex plugin marketplace
- Antigravity CLI

또한 `plugins/cloud/google-cloud-developer`에는 `.claude-plugin`, `.codex-plugin`, MCP 설정, rules, skills가 함께 존재한다. 따라서 이 저장소는 Agent Skills 자체뿐 아니라 **Skill + Rules + MCP를 harness별 packaging하는 예시**로도 가치가 있다.

## 아키텍처

```text
                    google/skills
                         │
          ┌──────────────┴──────────────┐
          │                             │
       skills/                       plugins/
          │                             │
   ┌──────┴──────┐              harness packaging
 SKILL.md     references/        ┌──────┼──────┐
   │          assets/          Claude  Codex   MCP
   │
   ├─ trigger / scope
   ├─ workflow
   ├─ guardrails
   ├─ validation rules
   └─ reference routing
```

핵심은 모델 자체를 변경하는 것이 아니라, harness가 task에 맞는 Skill을 선택하고 Skill이 필요한 reference/tool 사용법과 실행 정책을 제공하는 구조다.

## 장점

### 공식 출처의 운영 지식

Google Cloud처럼 변경이 잦고 오작동 비용이 큰 영역에서는 일반 모델 지식보다 공식 Skill의 검증 규칙을 활용하는 편이 안전하다.

### Skill 설계 레퍼런스로 매우 좋음

특히 다음 패턴이 유용하다.

- 짧은 metadata description으로 trigger 범위를 명확화
- `Use when` / `Don't use when`으로 Skill 경계 설정
- 핵심 규칙은 `SKILL.md`
- 상세 내용은 `references/`
- 생성 산출물 template은 `assets/`
- 실행 전 validation rule을 mandatory로 지정
- workflow 단계마다 approval/checkpoint 정의

### Context 절감에 대한 명시적 설계

`gcloud` Skill은 결과 projection, limit, filter, schema discovery를 명시적으로 요구한다. Tool output이 context window를 잠식하는 문제를 Skill 레벨에서 제어하는 좋은 사례다.

### Harness 독립성 방향

Agent Skills 설치뿐 아니라 Claude Code와 Codex plugin packaging이 함께 제공되어 특정 모델 하나에만 종속된 프롬프트 저장소보다 재사용성이 높다.

## 단점 및 한계

### Google 생태계 중심

대부분 Google Cloud/Google 제품 작업을 위한 Skill이다. 일반 소프트웨어 개발 workflow나 사내 Perforce/TeamCity 같은 환경에 직접 적용할 수 있는 Skill은 제한적이다.

### Skill 품질과 크기가 균일하지 않음

Skill마다 범위와 복잡도가 크게 다르다. 예를 들어 `gcloud/SKILL.md` 자체도 13KB 이상이며, 복잡한 solution Skill 역시 13KB 이상이다. 따라서 "공식 저장소이므로 모든 Skill이 작고 token-efficient하다"고 볼 수는 없다.

### 지나치게 강한 규칙의 비용

매번 leaf-level help를 확인하거나 approval checkpoint를 요구하는 방식은 안전성을 높이지만 단순 작업에서는 latency와 tool call 수가 증가한다.

### 플랫폼 동작 차이

Claude Code, Codex, Antigravity 등이 Skill/rules/plugin을 로드하고 적용하는 방식은 동일하지 않을 수 있다. 저장소가 공통 packaging을 제공한다고 해서 runtime semantics까지 완전히 같다고 가정하면 안 된다.

### 활발한 변경

README가 명시하듯 active development 상태다. 2026-09-09에도 Agent Platform troubleshooting, Filestore auditing, IAM 관련 Skill 변경이 연속적으로 들어오고 있어 특정 Skill 동작을 장기간 고정된 규격으로 취급하기 어렵다.

## 로컬 Skill 최적화 관점에서 얻을 점

이 저장소에서 가장 참고할 만한 부분은 **큰 SKILL.md를 무조건 압축하는 것보다 역할을 분리하는 방식**이다.

권장 패턴:

```text
my-skill/
├── SKILL.md              # trigger + 핵심 workflow + 절대 규칙
├── references/
│   ├── architecture.md   # 상세 설명
│   ├── commands.md       # command reference
│   └── troubleshooting.md
├── assets/
│   └── template.md       # 결과물 template
└── scripts/
    └── validate.*        # deterministic 작업이 있다면 코드화
```

`SKILL.md`에는 "항상 필요한 행동"만 남기고, 특정 단계에서만 필요한 세부 지식은 reference로 넘기는 것이 좋다.

특히 다음 세 가지를 분리하면 효과가 크다.

1. **Routing**: 이 Skill을 언제 사용/사용하지 않는가
2. **Policy/Workflow**: 반드시 지켜야 하는 실행 순서와 guardrail
3. **Knowledge**: 긴 설명, 예제, 제품별 세부사항

Google Skills는 1·2를 `SKILL.md`에 두고 3을 references/assets로 분리하는 사례를 여러 곳에서 보여준다.

## 활용 사례

### 바로 적용 가능

- 사내 Claude Code/Codex Skill의 디렉터리 구조 개선
- 거대한 SKILL.md를 core instruction + references로 분리
- destructive CLI 작업에 validation/authorization guardrail 추가
- Tool output에 limit/filter/projection 규칙 추가
- `Use when` / `Don't use when`을 description에 넣어 잘못된 Skill activation 감소

### PoC 가치 있음

- 동일한 Skill source를 Claude Code와 Codex에서 공통 관리
- Skill + MCP + rules를 하나의 plugin package로 묶는 사내 배포 방식
- architecture/workflow Skill에 phase checklist와 approval gate 적용

### 아이디어 참고

- Perforce CLI Skill에서 `p4 help` 기반 command validation
- TeamCity API/CLI Skill에서 destructive action denylist
- UE Commandlet Skill에서 schema discovery → 최소 결과 조회 → 실제 작업 순서 적용

## 기존 방식과 비교

| 방식 | 특징 | 적합한 경우 |
|---|---|---|
| 거대한 단일 system prompt | 모든 규칙을 항상 context에 포함 | 규칙이 매우 작고 항상 필요할 때 |
| 단일 대형 SKILL.md | task별 activation은 가능하지만 활성화 후 context 부담이 큼 | 중간 규모의 독립 작업 |
| Google Skills식 분리 | core workflow + references/assets | 지식이 크거나 단계별로 필요한 정보가 다를 때 |
| MCP만 사용 | capability/tool schema 중심 | 행동 지침보다 외부 시스템 접근이 핵심일 때 |
| Skill + MCP | Skill이 판단/절차, MCP가 실행 capability 담당 | enterprise agent workflow |

## 활용 아이디어

현재 로컬 Skill 최적화 문제에는 Google Skills 구조를 그대로 복사하기보다 다음 원칙만 가져오는 것을 추천한다.

**SKILL.md를 router + policy + workflow로 축소하고 knowledge를 references로 이동한다.**

특히 사내 개발 도구 Skill은 다음처럼 나누는 것이 좋다.

```text
perforce/
├── SKILL.md
├── references/
│   ├── changelist.md
│   ├── integrate.md
│   ├── workspace.md
│   └── troubleshooting.md
└── scripts/
    └── inspect-cl.*
```

이렇게 하면 단순 CL 조회 작업에서 integrate/troubleshooting 전체 지식을 context에 넣지 않아도 된다.

## 결론

Google Skills는 "Google Cloud Skill 모음"이라는 실용 가치도 있지만, **대규모 Agent Skill 저장소를 어떻게 구조화하고 안전 규칙·workflow·reference·MCP를 결합할지 보여주는 공식 사례**라는 점이 더 중요하다.

로컬 Skill 파일이 비대해지는 문제를 해결하려는 관점에서는 `SKILL.md + references + assets` 분리, 명확한 trigger scope, tool output reduction, deterministic validation을 우선 벤치마킹할 가치가 높다.

평가: **바로 적용 가능 + 구조 설계 레퍼런스로 높은 가치**.

## 참고 자료

- https://github.com/google/skills
- https://github.com/google/skills/blob/main/skills/cloud/gcloud/SKILL.md
- https://github.com/google/skills/tree/main/skills/cloud/google-cloud-solution-build-deploy-agents
- https://github.com/google/skills/tree/main/plugins/cloud/google-cloud-developer
- https://agentskills.io/home
