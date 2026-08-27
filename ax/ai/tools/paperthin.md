# Paperthin

> 태그: `AI Agent`, `Agent Skills`, `AX`, `Claude Code`, `Codex`, `Prompt Engineering`, `Workflow`, `SSOT`, `Quality`

## 한줄 요약

Paperthin은 AI 에이전트가 작업할수록 산출물이 비대해지고 문맥·사실·구조가 드리프트하는 문제를, 오래된 소프트웨어 엔지니어링 원칙을 작은 재사용 가능 Skill로 만들어 자동 교정하는 에이전트 비종속(agent-agnostic) 스킬 모음이다.

## 프로젝트 개요

Paperthin의 핵심 철학은 **“Trust the artifact, not the author”**와 **“추가보다 절제”**다. Claude Code, Codex, OpenCode, Copilot, Cursor, Hermes 등 특정 에이전트에 종속되지 않는 Markdown 기반 Skill을 제공한다.

설치 예시:

```bash
npx skills@latest add LilMGenius/paperthin --global --agent '*'
```

현재 카탈로그는 약 28개 Skill로 구성되며, 하나의 거대한 프레임워크가 아니라 특정 실패 패턴에 반응하는 작은 ‘반사 동작(reflex)’들을 에이전트에 심는 접근이다.

## 해결하려는 문제

AI 코딩/문서 에이전트는 장시간 작업할수록 다음 문제가 누적되기 쉽다.

- 기존 내용을 정리하기보다 계속 덧붙여 문서·코드가 비대해짐
- 사용자의 요청을 잘못 이해한 상태로 완성도 높게 잘못된 작업을 수행
- 같은 사실이 README, 문서, 설정 등에 중복되어 서로 다른 값으로 드리프트
- 작성자가 자기 산출물을 검토하면서 오류를 놓침
- 반복 개발에서 실패의 교훈보다 기존 구현 자체가 관성적으로 유지됨
- 긴 세션/재진입 시 현재 상태와 다음 행동을 다시 파악하는 비용 증가
- 에이전트가 필요 이상으로 강한 모델과 reasoning을 선택하거나 반대로 과소 투입

Paperthin은 이런 문제를 별도의 거대한 orchestration layer보다 작고 조합 가능한 Skill로 해결한다.

## 핵심 기능

### Depth — 하나의 산출물을 지금 개선

- `re0`: 누적 패치 대신 현재 사실을 기준으로 깨끗한 v0로 재작성
- `readchk`: 요청 해석을 재검증하고 실제로 남는 모호성만 질문
- `aim`: 전달받은 데이터에서 의도를 먼저 추론해 확인
- `modelchk`: 작업에 필요한 최소 충분 모델 tier/reasoning effort 제안
- `hate`: 계획을 무너뜨릴 수 있는 가장 중요한 반론과 가장 싼 검증 실험 제시
- `macrothink`: 기존 프레이밍을 제거하고 여러 독립 해석의 divergence를 먼저 확인
- `feynman`: 결정을 스스로 설명할 수 있는지 압박 검증
- `autobahn`: 위험한 범위를 먼저 분리하고 안전한 범위는 빠르게 실행
- `detool`: 문서에 박힌 특정 도구명을 실제 메커니즘으로 일반화
- `debloat`: 규칙은 유지하면서 불필요한 표현 제거
- `shower`: 세션 문맥이 없는 낯선 독자의 관점으로 산출물 검증
- `factchk`: 주장과 출처를 양방향으로 검증
- `sip`: 변경 직후 repo 자체의 clean-and-true 검사를 자동 실행

### Breadth — 여러 위치의 진실 통합

- `ssotize`: 여러 파일에 흩어진 동일 사실을 하나의 SSOT로 통합하고 나머지는 참조하도록 정리
- `re0-upgrade`: 설치된 Paperthin Skill을 현재 카탈로그와 reconcile

### Coil — 반복 개발에서 학습 누적

- `re0-plan`: 새 iteration의 DESIGN/WORKFLOW/EVIDENCE 구조 생성
- `re0-loop`: build → QA → memo → clean restart 루프 운영
- `re0-memo`: 성공/실패 사이클에서 교훈과 anti-pattern 추출
- `re0-work`: 기존 구현 자체보다 검증된 교훈만 가지고 v0부터 재시작
- `catchup`: live state에서 잃어버린 프로젝트 문맥 재구성
- `nba`: 현재 상태에서 단 하나의 next best action 제안

### Mesh — 여러 관점의 충돌 활용

- `prism`: 하나의 산출물을 독립적인 관점으로 나누어 평가하고 평균적 합의보다 충돌 지점을 노출

## 아키텍처

Paperthin은 런타임 프레임워크보다 **Markdown Skill catalog**에 가깝다.

```text
skills/
├── depth/      # 하나의 산출물/요청을 현재 시점에서 개선·검증
├── breadth/    # 여러 파일·플랫폼에 흩어진 사실 정합성 관리
├── coil/       # 여러 iteration에 걸친 학습과 재진입
└── mesh/       # 여러 독립 관점의 비교·수렴
```

분류 축은 **cardinality(하나↔여러 개) × time(현재↔iteration)**이다. 각 Skill은 독립적인 `SKILL.md`로 정의되고 기본 구조는 Goal → Workflow → Rules → Verification이다.

중요한 설계 원칙은 Skill 간 강한 런타임 의존성을 피하는 것이다. orchestrator는 설치된 model-invoked Skill만 사용하고 없는 Skill은 건너뛰도록 설계되어 점진적 도입이 가능하다.

## 장점

1. **에이전트 비종속성** — Claude Code/Codex/Cursor 등 여러 도구에서 같은 품질 규칙을 재사용할 수 있다.
2. **작은 단위의 조합성** — 전체 프레임워크를 갈아엎지 않고 필요한 Skill만 사고방식에 적용할 수 있다.
3. **AI 특유의 누적 비대화 억제** — `re0`, `debloat`, `ssotize`가 특히 실무 문서와 장기 프로젝트의 드리프트에 유용하다.
4. **반복 작업의 학습 구조화** — `re0-memo` → `re0-work` 접근은 실패한 구현을 보존하려는 에이전트의 관성을 줄인다.
5. **검증을 행동으로 변환** — “검토해라” 같은 추상 지침 대신 언제 어떤 검사를 실행할지 Skill로 구체화한다.
6. **낮은 기술적 진입장벽** — 대부분 Markdown 기반이라 조직 내부 규칙에 맞게 fork/수정하기 쉽다.

## 단점

1. Skill 수가 많아지면 어떤 Skill이 언제 발동해야 하는지 자체가 새로운 복잡성이 될 수 있다.
2. 품질 개선 효과는 사용하는 에이전트가 Skill 지침을 얼마나 안정적으로 따르는지에 의존한다.
3. `shower`, `macrothink`, `prism`, `factchk` 같은 반복 검증은 토큰과 latency를 증가시킬 수 있다.
4. 범용 원칙 중심이라 특정 조직의 코드 규칙·CI·Perforce·문서 체계 등은 별도 Skill로 확장해야 한다.
5. 자동 실행되는 model-invoked Skill이 많아지면 간단한 작업에서도 과도한 검증이 발생할 수 있으므로 선택적 적용과 비용 측정이 필요하다.
6. 기존 프로젝트에 도입할 때 `re0` 같은 재작성 중심 전략은 diff가 커질 수 있어 코드 영역에서는 리뷰 정책과 함께 써야 한다.

## 기존 도구와 비교

| 접근 | 중심 역할 | Paperthin과의 차이 |
|---|---|---|
| CLAUDE.md / AGENTS.md | 프로젝트 상시 규칙 | Paperthin은 규칙집보다 특정 상황에 실행되는 작은 workflow/reflex 집합 |
| Superpowers류 개발 Skill | 기획·구현·디버깅 개발 프로세스 | Paperthin은 개발 방법론보다 산출물의 clean/true 상태와 드리프트 억제에 집중 |
| MCP | 외부 도구·데이터 연결 | Paperthin은 연결 계층이 아니라 에이전트 행동/검증 패턴 계층 |
| 일반 Prompt Library | 필요할 때 프롬프트 선택 | model-invoked Skill을 통해 일부 패턴을 자동 반사 동작으로 만드는 것을 지향 |
| Linter / CI | 기계적으로 판정 가능한 품질 검사 | Paperthin은 요청 해석, 설계 반론, 문맥 독립성 등 의미론적 품질까지 다룸 |

따라서 Paperthin은 기존 Agent Harness나 MCP를 대체하기보다는 그 위에 얹는 **품질·위생 레이어**로 보는 편이 적절하다.

## 활용 사례

- 장기 AI 코딩 세션에서 README/설계 문서가 누적 수정으로 비대해질 때 `re0`
- 프로젝트 여러 문서에 동일 설정값·상태가 복제됐을 때 `ssotize`
- AI가 구현 전에 요구사항을 잘못 읽었는지 검증할 때 `readchk`
- 중요한 설계안의 치명적 약점을 빠르게 찾을 때 `hate`
- 여러 에이전트/관점의 의견이 왜 다른지 파악할 때 `prism`
- 며칠 뒤 프로젝트에 재진입해 현재 상태를 복원할 때 `catchup`
- 반복 PoC에서 실패 구현은 버리고 검증된 교훈만 다음 사이클에 넘길 때 `re0-memo` + `re0-work`
- 산출물 완료 후 자동 QA gate로 `sip`

## 활용 아이디어

### 1. 공통 Agent Quality Pack으로 도입

Claude Code와 Codex에서 공통으로 사용할 최소 세트를 먼저 적용한다.

```text
readchk → 작업 시작 전 의도 검증
hate    → 큰 설계/계획의 치명점 검증
re0     → 문서/설계 산출물 정리
ssotize → 중복 정보 정합성 관리
sip     → 완료 직후 품질 게이트
```

전체 28개를 처음부터 켜기보다 이 5개부터 효과와 토큰 비용을 측정하는 편이 안전하다.

### 2. AX 문서 품질 자동화

AI가 Confluence/Markdown 문서를 작성한 뒤 `debloat → shower → factchk → re0` 순서로 후처리하는 문서 품질 파이프라인을 만들 수 있다. 특히 AI가 만든 장문 문서의 중복 문장과 세션 문맥 의존 표현 제거에 적합하다.

### 3. 사내 규칙과 결합한 Custom Paperthin

Paperthin의 구조를 그대로 가져와 사내 전용 Skill을 추가할 수 있다. 예를 들어 `teamcitychk`, `p4chk`, `wpfchk`, `docchk`처럼 특정 환경의 검증 규칙을 작은 Skill로 분리하고 `sip` 계열 orchestrator가 필요한 검사만 호출하게 만들 수 있다.

### 4. AI 작업 비용 최적화와 연결

`modelchk`를 작업 분류 앞단에 배치하고 실제 토큰 사용량/성공률을 기록하면 “이 작업은 frontier가 필요한가?”를 경험적으로 보정하는 모델 라우팅 정책의 입력으로 사용할 수 있다. Paperthin 자체는 실제 모델을 라우팅하지 않고 neutral tier를 제안한다는 점도 안전하다.

### 5. 반복 PoC의 실패 자산화

`re0-plan → build → QA → re0-memo → re0-work` 패턴을 PoC 템플릿으로 만들면 실패한 코드를 억지로 확장하는 대신 실패 원인과 검증된 원칙을 다음 iteration으로 전달할 수 있다.

## 참고 링크

- 원본 저장소: https://github.com/LilMGenius/paperthin
- 한국어 README: https://github.com/LilMGenius/paperthin/blob/main/docs/readme/README.ko.md
- Authoring Guide: https://github.com/LilMGenius/paperthin/blob/main/CLAUDE.md
