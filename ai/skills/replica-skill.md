---
title: Replica Skill
category: skills
tags:
  - ai
  - agent
  - claude-code
  - agent-skills
  - reverse-engineering
  - app-clone
source: https://github.com/Jakeschincariol/replica-skill
updated: 2026-10-07
---

# Replica Skill

> 기존 앱의 기능과 UX 흐름을 clean-room 방식으로 조사하고, 설계·구현·테스트·기능 parity 검증·사용자 불만 분석·리브랜딩·출시·배포까지 이어 주는 11개의 Claude Agent Skill 묶음.

## 프로젝트 개요

Replica Skill은 독립 애플리케이션이나 프레임워크 런타임이라기보다 Claude Code에서 사용하는 11개의 `SKILL.md`와 6개의 표준 라이브러리 Python 도구로 구성된 workflow pack이다.

핵심 특징은 각 Skill이 독립적으로 끝나지 않고 프로젝트의 `replica/` 디렉터리에 산출물을 남기며 다음 Skill이 이를 읽는다는 점이다. 즉 파일 기반 상태 전달을 이용해 제품 분석부터 배포까지 긴 작업을 단계별로 이어 간다.

MIT 라이선스이며 Python 3.8+ 외 별도 Python 패키지 설치를 요구하지 않는다.

## 해결하려는 문제

AI 코딩 에이전트에게 단순히 "이 앱과 비슷하게 만들어줘"라고 요청하면 다음 문제가 생기기 쉽다.

- 화면 몇 개만 보고 기능 범위를 임의로 추정한다.
- UI 복제에 치우쳐 실제 사용자 흐름과 edge case가 빠진다.
- 분석, 설계, 구현, 테스트 사이의 상태가 일관되게 이어지지 않는다.
- 무엇이 구현되었고 무엇이 빠졌는지 정량적으로 알기 어렵다.
- 원본의 상표·문구·에셋까지 무분별하게 복제할 위험이 있다.
- 원본보다 나은 제품을 만들 근거 없이 단순 copycat으로 끝난다.

Replica Skill은 이를 "정찰 → 구조화 → 구현 → 검증 → 차별화 → 출시"라는 고정 파이프라인으로 바꾼다.

## 핵심 기능

| Skill | 역할 | 주요 산출물 |
| --- | --- | --- |
| `replica-recon` | 공개 자료와 사용자 자신의 계정에서 화면·flow·component·data model 추론 | `recon.md`, `features.csv`, reference screenshots |
| `replica-architect` | stack, DB schema, API 및 build order 설계 | architecture |
| `replica-design` | 색상·타이포·spacing·component를 design token으로 재구성 | design tokens |
| `replica-build` | recon map을 기준으로 화면과 상태 구현 | clone implementation |
| `replica-backend` | auth, DB, payment, integration 구성 | backend |
| `replica-test` | flow 기반 test plan, Playwright E2E, bug report | test artifacts |
| `replica-diff` | feature parity와 screenshot layout 차이 측정 | `parity.md`, diff images |
| `replica-entrepreneur` | 실제 사용자 review의 불만·요구를 분석해 개선안/positioning 생성 | `reviews.csv`, `feedback.md`, `fixes.md` |
| `replica-brand` | 새 이름·palette·voice 등 독자 brand로 변경 | brand artifacts |
| `replica-launch` | landing page, pricing, store listing 준비 | launch artifacts |
| `replica-deploy` | preflight gate 후 production 배포 절차 수행 | `deploy.md` |

## 아키텍처

```text
Target App
   │
   ├─ public docs / pricing / changelog / store listing
   ├─ screenshots / walkthroughs
   └─ user's own account
   │
   ▼
[replica-recon]
   │
   ├─ replica/recon.md
   ├─ replica/features.csv  ← 핵심 공유 상태
   └─ replica/screens/
   │
   ▼
[architect] → [design]
   │             │
   └──────┬──────┘
          ▼
       [build]
          │
          ▼
      [backend]
          │
          ▼
       [test]
          │
          ▼
       [diff] ── feature/layout/behaviour parity
          │
          ▼
 [entrepreneur] ── real user reviews → gaps/fixes
          │
          ▼
       [brand]
          │
          ▼
       [launch]
          │
          ▼
       [deploy]
          │
          └─ tests + parity + rebrand sweep + listing/build gate
```

### Context 전달 방식

별도 orchestration server나 agent runtime을 두지 않는다. 각 Skill이 `replica/` 아래의 Markdown, CSV, JSON, screenshot을 읽고 수정하면서 다음 단계에 context를 전달한다.

이 방식은 단순하지만 실용적이다.

- 세션이 바뀌어도 파일이 상태를 보존한다.
- 사람이 중간 산출물을 검토하거나 수정할 수 있다.
- 특정 vendor의 agent memory에 덜 의존한다.
- Git으로 workflow 결과를 추적하기 쉽다.

반대로 schema validation이나 중앙 orchestrator가 없기 때문에 Skill이 산출물 계약을 어기면 이후 단계가 흔들릴 수 있다.

## 중요한 설계 아이디어

### 1. Feature Matrix를 중심 상태로 사용

`features.csv`는 단순 checklist가 아니다. recon에서 기능을 기록하고 build가 구현 상태를 갱신하며 diff가 parity를 계산하고 entrepreneur가 원본에는 없는 개선 기능을 추가한다.

즉 제품 요구사항, 구현 진척도, 비교 평가를 하나의 작은 구조화 데이터로 연결한다.

### 2. Pixel Clone보다 Functional Parity

`replica-diff`는 must/should/could를 각각 3/2/1로 가중하고 partial은 절반으로 계산한다. 의도적으로 제외한 기능은 점수에서 빼며 must-have가 남아 있으면 shippable로 보지 않는다.

Screenshot 비교도 기본적으로 색상 자체보다 edge/layout 구조를 비교한다. 목표를 "원본과 똑같이 보이기"보다 "같은 일을 할 수 있고 익숙한 정보 구조를 제공하기"로 잡는다.

### 3. Clean-room Guardrail

`replica-recon`은 공개 자료와 사용자가 소유한 계정만 허용하며 source code, private API, binary decompile, login/paywall 우회를 금지한다.

배포 전에는 `sweep.py`로 원본 이름·domain·색상 등의 잔존 여부를 검사하고 rebrand가 완료되지 않으면 배포하지 않도록 지침화했다.

이는 법적 안전성을 보장하는 장치가 아니라 agent가 무분별한 copycat 구현으로 흐르는 것을 줄이는 workflow guardrail이다.

### 4. Clone에서 Product Discovery로 확장

가장 흥미로운 부분은 `replica-entrepreneur`다. App Store, Google Play, G2, Capterra, Reddit 등 실제 review를 수집하고 불만/누락 기능/미해결 job을 분류한다.

그 결과를 원본 parity 이후의 차별화 기능으로 다시 `features.csv`에 넣는다. 즉 "복제"를 baseline 확보 수단으로 쓰고 실제 목표는 원본보다 명확한 niche/positioning을 가진 제품으로 이동하는 구조다.

## 포함된 Python 도구

- `imgdiff.py`: screenshot edge/layout 비교
- `parity.py`: feature matrix 기반 parity score
- `reviews.py`: review theme 분석
- `contrast.py`: design token의 WCAG contrast 검사
- `sweep.py`: 원본 brand 흔적 검사
- `listing.py`: App Store/Google Play listing 제한 및 copycat 관련 검사

모두 Python 표준 라이브러리만 사용하는 것을 목표로 하며 network 접근 자체는 하지 않는다.

## 장점

### 구조화된 End-to-End Workflow

단순 coding skill이 아니라 조사부터 production까지 전체 lifecycle을 단계화했다. 각 단계의 입력/출력이 비교적 명확해 장시간 agent 작업에서 방향이 흐트러지는 것을 줄일 수 있다.

### File-based Handoff

복잡한 agent memory나 외부 DB 없이 파일을 계약으로 사용한다. Harness 관점에서도 참고 가치가 높다. 특히 CSV/Markdown/JSON을 중간 표현으로 사용하는 패턴은 Claude Code와 Codex 사이의 handoff에도 응용할 수 있다.

### 정량적 완료 기준

"비슷해 보인다"가 아니라 feature priority, parity score, S1/S2 bug, preflight gate를 사용한다. Agent workflow에서 종료 조건을 명시하는 좋은 사례다.

### 차별화 단계 포함

사용자 review를 evidence로 개선 항목을 만들기 때문에 단순 복제보다 제품 discovery workflow에 가깝게 확장된다.

### Vendor Lock-in이 비교적 낮은 데이터 구조

공식 제공 형태는 Claude Skill/Plugin 중심이지만 핵심 절차는 Markdown이고 상태도 일반 파일이다. README는 개별 `SKILL.md`를 일반 chat에 붙여 사용하는 방식도 설명한다. 다만 helper script 실행과 자동 Skill discovery 경험은 Claude Code가 가장 자연스럽다.

## 단점 및 한계

### 프로젝트 성숙도가 매우 낮음

2026-10-07 조사 시점의 GitHub 공개 화면은 repository history가 1 commit이며 issues 0, pull requests 3으로 표시된다. 아이디어와 문서 구성은 흥미롭지만 장기간 유지보수, 실제 대규모 프로젝트 적용, backward compatibility는 아직 검증됐다고 보기 어렵다.

### Orchestration이 실제 Runtime이 아님

11단계가 pipeline처럼 보이지만 이를 강제하는 workflow engine이 있는 것은 아니다. 실제 orchestration은 Claude가 각 `SKILL.md`의 절차를 준수하고 파일을 올바르게 업데이트하는 데 의존한다.

### Token/Context 비용

각 단계가 이전 단계의 문서를 다시 읽고 원본 자료도 조사해야 한다. 복잡한 앱에서는 recon map, screenshots, review data, architecture, test artifacts가 빠르게 커질 수 있다. Context를 단계별로 분리하는 장점은 있지만 전체 토큰 비용을 자동 최적화하는 기능은 확인되지 않았다.

### 추론된 Data Model의 신뢰도

Recon은 UI와 공개 문서에서 data model을 추론한다. confidence/evidence를 기록하도록 하지만 실제 내부 모델과 같다는 보장은 없다. 이 결과를 그대로 architecture로 확정하기보다 새 제품의 요구사항에 맞는 독립 설계로 다시 검증해야 한다.

### Legal/Terms Risk는 사라지지 않음

프로젝트가 clean-room 규칙과 rebranding을 강조하더라도 특정 서비스의 약관, trade dress, 특허, 저작권, 상표, 경쟁법 문제를 자동으로 해결해 주는 것은 아니다. 상업 출시 전 별도 검토가 필요하다.

### Review Research의 수작업 비중

`replica-entrepreneur`는 무단 scraping을 피하기 위해 사람처럼 review를 읽고 CSV로 수집하도록 요구한다. 신뢰성에는 도움이 되지만 100+ review를 여러 source에서 모으는 작업은 비용이 크다.

### Windows / Enterprise

Python 3.8+와 일반 파일 중심이라 OS 종속성은 낮은 편이다. 다만 enterprise 환경에서는 외부 앱 조사, screenshot 저장, review 수집, public SaaS 사용 자체가 보안/법무 정책과 충돌할 수 있다. 또한 repository 자체에 enterprise governance나 감사 기능이 있는 것은 아니다.

## 활용 사례

### 경쟁 제품 기반 MVP 설계

검증된 제품의 core loop를 조사해 필요한 화면과 flow를 빠르게 정의하고, niche에 필요한 기능만 남긴 MVP를 만드는 데 적합하다.

### 사내 Legacy Tool 재구축

상용 경쟁 앱을 복제하는 대신 기존 사내 도구의 사용자 flow를 recon하고 새 stack으로 재구축하는 workflow로 변형할 수 있다. 이 경우 법적 위험도 훨씬 낮다.

### Product Benchmarking

실제로 clone을 출시하지 않더라도 `replica-recon` + `replica-diff` + `replica-entrepreneur` 조합만 사용해 경쟁 제품의 기능 matrix와 사용자 불만을 구조화할 수 있다.

### UI/UX Regression 기준 만들기

원본 앱이 아니라 자사 제품의 이전 버전을 기준으로 `imgdiff.py --mode pixel`과 flow test를 활용하는 방식도 가능하다.

## 기존 도구와 비교

### 일반 Claude Code Skill

일반 Skill이 특정 작업의 수행 방법을 캡슐화하는 데 집중한다면 Replica Skill은 여러 Skill이 공통 파일을 통해 순차 협업한다는 점이 다르다. 사실상 작은 file-based workflow/harness 패턴을 Skill만으로 구현한 사례다.

### Superpowers 계열 개발 Workflow와의 차이

범용 개발 methodology/brainstorming/testing workflow는 "어떤 소프트웨어든 잘 개발하는 과정"이 중심이다. Replica Skill은 "이미 존재하는 제품을 evidence로 삼아 baseline을 만들고, parity를 측정한 뒤 차별화한다"는 훨씬 좁은 product reconstruction workflow다.

따라서 대체 관계라기보다 함께 사용할 수 있다. Replica가 제품 요구사항과 benchmark를 만들고 범용 개발 workflow가 구현 품질을 담당하는 구성이 가능하다.

## 활용 아이디어

### 바로 적용 가능

1. **`replica-recon`의 Screen/Flow ID 패턴**
   - S01, F01처럼 안정적인 ID를 부여하고 이후 문서가 이를 참조하는 방식.
   - 긴 agent workflow에서 자연어 이름만 쓰는 것보다 handoff 안정성이 높다.

2. **`features.csv` 기반 단일 상태판**
   - 요구사항 → 구현 → parity → 개선 기능을 하나의 구조화 파일로 연결한다.
   - AI 프로젝트의 plan/checklist보다 machine-readable한 진행 상태가 필요할 때 유용하다.

3. **Preflight Gate 패턴**
   - test, must-have parity, brand sweep, listing lint, build를 모두 통과해야 deploy 단계로 이동한다.
   - 배포뿐 아니라 PR merge/Perforce submit 전 agent gate로 일반화할 수 있다.

### PoC 가치 있음

#### 기존 Harness에 Artifact Contract 도입

Replica의 가장 참고할 부분은 개별 Skill 내용보다 **Skill 사이의 artifact contract**다.

예를 들어:

```text
analysis agent
   ↓ requirements.jsonl
design agent
   ↓ architecture.md
implementation agent
   ↓ implementation-status.csv
review agent
   ↓ review.jsonl
gate
```

각 agent가 자유로운 대화 context를 넘기는 대신 정해진 artifact만 handoff하면 context/token 사용량과 세션 결합도를 낮출 가능성이 있다.

#### Claude Code + Codex 혼합 Workflow

공통 `replica/` 파일을 protocol로 보고 Claude와 Codex가 서로 다른 단계를 담당하게 하는 실험도 가치가 있다.

예:
- Claude: recon / product reasoning / design
- Codex: implementation / test / diff automation
- Claude: entrepreneur / brand / launch

이때 핵심 검증 포인트는 agent 교체 시 artifact만으로 충분히 다음 단계가 수행되는지다.

### 아이디어 참고

- feature priority weighted parity
- evidence + confidence가 붙은 inferred model
- review evidence를 기능 backlog로 되돌리는 loop
- 원본 흔적을 검사하는 automated sweep
- "must-have missing = not shippable" 같은 명시적 종료 조건

### 현재는 도입 가치 낮음

11개 Skill 전체를 그대로 표준 개발 workflow로 채택하는 것은 아직 이르다. 저장소 성숙도가 낮고 "clone SaaS"라는 목적에 강하게 특화되어 있다.

현재 시점에는 **전체 설치보다 artifact handoff, parity gate, evidence-driven recon 패턴을 추출해 기존 Harness에 적용하는 것이 더 가치가 높다.**

## 결론

Replica Skill의 핵심 가치는 "AI에게 앱을 복제시키는 프롬프트"가 아니다.

가장 중요한 아이디어는 **긴 Agent 작업을 작은 Skill로 나누고, Markdown/CSV/JSON이라는 명시적 artifact contract로 상태를 전달하며, 각 단계에 측정 가능한 완료 조건을 둔 것**이다.

특히 `features.csv`가 recon → build → diff → entrepreneur 사이를 연결하는 구조는 AI Harness와 개발 workflow 설계 관점에서 참고 가치가 높다.

다만 2026-10-07 기준 프로젝트는 매우 초기 단계이므로 완성형 프레임워크로 도입하기보다 **workflow 설계 패턴을 추출하는 레퍼런스 + 제한된 PoC**로 보는 것이 적절하다.

## 참고 자료

- GitHub: https://github.com/Jakeschincariol/replica-skill
- README 및 repository source
- `replica-recon/SKILL.md`
- `replica-diff/SKILL.md`
- `replica-entrepreneur/SKILL.md`
- `replica-deploy/SKILL.md`
