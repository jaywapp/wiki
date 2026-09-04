# Wiki Daily Summary

`jaywapp/wiki`의 전날 변경 내용을 날짜별로 요약하는 페이지입니다.

- 기준 시간대: **KST (Asia/Seoul)**
- 집계 범위: 전날 00:00 ~ 23:59 KST
- 대상: `develop` 브랜치의 문서 변경
- 원칙: 단순 인덱스/링크 갱신은 압축하고, 실제 추가·수정된 지식 중심으로 요약

---

## 2026-09-04

> **12 commits · 핵심 주제 7건**

### 1. GPT-6 Astra — Agentic Workflow 중심 차세대 모델 분석

[`ai/news/gpt-6-astra.md`](./ai/news/gpt-6-astra.md)

- GPT-6 Astra를 단순 대화 모델보다 **computer use·브라우징·코딩·다단계 tool workflow를 끝까지 수행하는 agentic work 모델**로 정리하고, 1.05M context·128K output·`low~max` reasoning effort를 포함한 실행 특성을 분석.
- Async Tool Calling과 Mid-turn Steering을 장시간 Agent Harness의 핵심 변화로 보고, 모든 작업에 Astra를 쓰기보다 **고난도 Orchestrator/Analysis/Review → 저비용 Worker**로 난이도 기반 라우팅하는 방향을 권장.
- 높은 단가와 강한 사이버 역량 때문에 sandbox, permission boundary, audit log를 포함한 제한된 실행 환경이 필요하다고 정리.

### 2. Agent Team 실행환경 — Herdr + Claude Workspace Orchestrator + 공통 작업 계약

[`ai/tools/herdr.md`](./ai/tools/herdr.md) · [`idea/claude-workspace-orchestrator.md`](./idea/claude-workspace-orchestrator.md) · [`AGENTS.md`](./AGENTS.md) · [`CLAUDE.md`](./CLAUDE.md) · [`docs/README.md`](./docs/README.md) · [`docs/workspace-environment-setup-analysis.md`](./docs/workspace-environment-setup-analysis.md) · [`docs/workspace-environment-setup-design.md`](./docs/workspace-environment-setup-design.md) · [`docs/workspace-environment-setup-tasks.md`](./docs/workspace-environment-setup-tasks.md)

- **Herdr**를 Claude Code·Codex 등 기존 CLI를 유지하면서 persistent terminal, agent 상태(`working/blocked/idle/done`), attach/resume, socket/CLI 제어를 제공하는 **Agent Runtime substrate**로 분석하고, orchestration brain보다 실행·상태 계층으로 쓰는 방향을 제안.
- **Claude Workspace Orchestrator**는 root의 Main Claude가 프로젝트별 장기 Claude 세션에 작업을 분배하고 결과를 취합하며 별도 Deploy Agent가 `release/`를 담당하는 `Main Orchestrator + Persistent Project Agents + Deploy Agent` 구조로 구체화.
- 저장소 공통 계약에는 분석/설계/작업계획 artifact, model/effort·병렬 그룹, file ownership, UX 3안 gate, 검증·Git·보안 규칙을 명시해 Claude/Codex가 같은 운영 경계를 따르도록 표준화.

### 3. oh-my-fable — Claude Fable 5.1 실행 규칙의 Hook 기반 자동 주입

[`ai/tools/oh-my-fable.md`](./ai/tools/oh-my-fable.md)

- Fable 5.1 프롬프팅 권장사항을 `SessionStart`/`SubagentStart` hook으로 자동 주입해 프로젝트별 `CLAUDE.md`에 반복 복사하지 않고 **자율 완료, surgical edit, 병렬 tool call, 진행 보고** 같은 행동 정책을 공통 적용하는 플러그인으로 정리.
- `/fable-prompt`가 짧은 요청을 Goal/Context/Scope/Done criteria로 구조화하고, 메인 세션과 서브에이전트의 공통 행동 규칙을 맞추는 패턴을 Agent Team 운영에 참고할 수 있다고 평가.

### 4. Magnitude — 기존 Coding Agent를 유지하는 로컬 추론 Control Layer

[`ai/tools/magnitude.md`](./ai/tools/magnitude.md)

- 하드웨어를 프로파일링해 적합한 로컬 모델·quantization·예상 token/s를 추천하고 다운로드·튜닝·서빙·Agent provider 연결까지 자동화하는 **agent-first local inference runtime**으로 분석.
- OpenAI-compatible API와 모델 lifecycle/scheduling을 통해 Claude Code·Codex·OpenCode 등의 기존 Harness를 유지하면서 반복 탐색·로그 분석·문서화 Worker만 로컬 모델로 이동하는 **Frontier Orchestrator + Local Workers** 구조를 PoC 대상으로 제안.
- Windows는 WSL 의존이며 초기 runtime 안정성·권한·로컬 endpoint 보안 이슈가 있어 Enterprise 표준화 전 격리된 PoC가 필요하다고 정리.

### 5. Humanizer + polish-doc — AI 문서의 문체·정보구조 후처리 계층

[`ai/skills/humanizer.md`](./ai/skills/humanizer.md) · [`ai/skills/polish-doc.md`](./ai/skills/polish-doc.md)

- **Humanizer**는 35개 AI writing pattern을 검사해 사실·숫자·링크를 보존하면서 과장, rule-of-three, 챗봇 잔여 표현, 과도한 구조화 등을 다시 쓰는 범용 Skill로 분석하고, Wiki에서는 fact/citation 검증 뒤 최종 prose polishing 단계에 두는 흐름을 제안.
- **polish-doc**은 초안·분석 결과를 결론 우선, 짧은 문장, 반복 제거, 표/inline SVG 등으로 재구성해 standalone HTML로 만드는 편집 Skill로, `LLM = 편집 엔진 / Skill = 편집 정책 / Template = 표현 규격` 구조를 정리.
- 두 도구 모두 생성 단계와 분리된 **최종 Human-readable Quality Pass**로 활용하되, 기술 명세의 정보 손실과 LLM 기반 비결정성을 별도 검증해야 한다고 평가.

### 6. Agent Development Loop + Commerce Agents — 자율 실행과 안전 Gate 설계

[`ai/tips/ai-agent-development-operating-model.md`](./ai/tips/ai-agent-development-operating-model.md) · [`ai/tools/claude-commerce-agents.md`](./ai/tools/claude-commerce-agents.md)

- 개발 방식을 `Human → Prompt → Result` 중심 Assistant에서 **Goal → Context → Plan → Execute → Observe → Verify → Iterate**의 Agent Development Loop로 전환하고, 사람은 세부 Driver보다 Goal/Policy/Decision Owner로 이동해야 한다고 정리.
- Claude Commerce Agents에서는 실제 쓰기 작업을 prompt 신뢰에 맡기지 않고 **fencing, provenance gate, grounding, cap/guardrail, stage → approval → apply → re-check**를 코드 계층에서 강제하는 reference architecture를 분석.
- 두 문서에서 공통적으로 Agent 자율성의 핵심은 더 긴 prompt가 아니라 **도구 권한 경계, 외부 evidence 기반 완료 판정, Human Gate**라는 원칙을 도출.

### 7. public-apis-4Kr — 국내 Public API Discovery 레퍼런스

[`development/public-apis-4kr.md`](./development/public-apis-4kr.md)

- 한국 서비스 개발에서 활용 가능한 공공·민간 Public API를 분야별로 탐색하는 카탈로그를 정리하고, 날씨·부동산·금융·관광·사업자 정보 등 국내 데이터 연동의 시작점으로 활용할 수 있다고 평가.
- Agent/MCP 환경에서는 `요구사항 → API 카탈로그 검색 → 후보 선택 → 인증 확인 → Tool/호출 코드 생성`의 discovery layer나 사내 API Registry 원천으로 확장하는 아이디어를 제안.

### 기타

- [`idea/README.md`](./idea/README.md)에 Claude Workspace Orchestrator 링크를 추가해 아이디어 인덱스에 연결.

---

## 2026-09-03

> **2 commits · 핵심 문서 변경 2건 · 핵심 주제 2건**

### 1. Human-readable Markdown — AI 문서를 독자 중심으로 만드는 Skill 파이프라인

[`ai/skills/human-readable-markdown-skills.md`](./ai/skills/human-readable-markdown-skills.md)

- AI 문서의 문제를 단순한 말투가 아니라 **과도한 heading/list, 반복 구조, 추상적 평가어, 정보 중요도 평탄화** 같은 정보 구조 문제로 정의하고, Humanizer만으로 해결하기 어렵다고 정리.
- 기본 작성에는 Continue `docs-style`과 `technical-writing`의 reader goal·progressive disclosure·concrete/factual safety 원칙을 사용하고, 이후 `human-voice`/Humanizer와 Markdown validation을 거치는 **Docs Writer → Human Voice Review → Validation** 파이프라인을 권장.
- Wiki 전용 `human-readable-docs` Skill을 만들어 heading/list 최소화, 중복 제거, 실제 명령·값·예제 우선, 기술 용어 보존을 공통 규칙으로 적용하고 기존 문서 A/B 테스트로 품질을 검증하는 방향을 제안.

### 2. gpt-image — Coding Agent에 이미지 생성·편집 능력을 붙이는 경량 Adapter

[`ai/skills/gpt-image.md`](./ai/skills/gpt-image.md)

- `egoist/gpt-image`를 OpenAI `gpt-image-2`를 `bunx gpt-image` CLI와 Agent Skill로 감싼 **경량 이미지 생성/편집 Adapter**로 분석하고, Claude Code/Codex가 자연어 요청에서 직접 asset 파일을 생성하는 흐름을 정리.
- text-to-image, image edit, 다중 reference, 품질/크기 제어를 하나의 CLI로 제공하며, API Key 외에 Codex CLI 인증을 재사용하는 ChatGPT OAuth 경로도 지원하지만 비공식 방식이라 장기 자동화·Enterprise 환경에는 API Key 기반 구성을 권장.
- UI placeholder·아이콘·배너·Wiki illustration·게임 concept asset 생성에 바로 활용할 수 있고, Agent Team에서는 별도 **Image Worker** 역할로 분리할 수 있으나 quota/비용, Bun 의존성, 생성물 검수 정책이 필요하다고 정리.

---

## 2026-09-02

> **1 commit · 핵심 문서 변경 1건**

### 1. Claude Fable 5.1 — 장기 Agent Harness 프롬프팅·운영 패턴 정리

[`ai/tips/claude-fable-5-1-prompting.md`](./ai/tips/claude-fable-5-1-prompting.md)

- Fable 5.1을 기존 Claude 하네스에 단순 교체하기보다 **effort routing, 독립 Tool Call 병렬화, append-only conversation history, autonomous completion, surgical edit**를 Runtime Policy로 명시해야 비용·지연·불필요한 diff를 줄일 수 있다고 정리.
- `low → medium → high → xhigh/max`를 작업 난이도에 따라 선택하는 effort 라우팅과, 최신 정보가 중요한 low-effort 작업에는 별도 Search Policy를 두는 방식을 제안.
- thinking block·prompt cache를 보존하기 위해 이전 turn을 수정하지 않는 append-only 기록과 compaction boundary를 강조하고, 장기 작업에서는 추가 허락을 반복 요구하지 않도록 완료 조건과 scope control을 명시하도록 권장.
- Subagent를 실행한 뒤 Lead Agent가 idle하지 않고 자신의 분석·구현을 계속하는 **비동기 Subagent + 별도 wait/join** 구조를 통해 Agent Team의 wall-clock time을 줄이는 Harness 패턴을 정리.

---

## 2026-08-31

> **12 commits · 핵심 문서 변경 12건 · 핵심 주제 6건**

### 1. Aegis — Workspace 전역 Agent Team 실행·관제 계층 아이디어 구체화

[`idea/aegis.md`](./idea/aegis.md)

- Claude와 Codex를 작업 특성에 따라 동적으로 조합하고 **Task Graph → Dynamic Team Formation → Adaptive Parallelism → Independent Review → Failure Recovery**로 실행하는 Workspace 공통 Agent Runtime 아이디어를 정리.
- Home은 `Codex + Claude + Git`, Work는 `Claude + Codex + Perforce`를 기본 Environment Profile로 두되 Harness/SCM을 추상화하고, 작은 작업은 Lead가 직접 처리해 Multi-Agent 오버헤드를 피하도록 설계.
- Agent별 전체 컨텍스트를 복제하지 않고 Objective·Relevant Decisions·Target Files·Dependencies·Validation Criteria만 담은 Task Context Package를 전달하고, File Ownership과 SCM Adapter로 병렬 코드 수정 충돌을 제어하는 구조를 제안.
- **Live Runtime Viewer / Control Center**를 핵심 UX로 두어 Team 상태, Task Graph, 병렬 실행 수, Block/Retry/Fallback, File Ownership, Review/Test 진행 상황을 실시간으로 시각화하고 Agent 수 증가가 실제 성과로 이어지는지 Task Report로 측정하도록 정의.

### 2. Ruflo + OmniRoute — Coding Agent 위의 Meta-Harness와 Model Gateway 계층

[`ai/harness/ruflo.md`](./ai/harness/ruflo.md) · [`ai/tools/omniroute.md`](./ai/tools/omniroute.md)

- **Ruflo**를 Claude Code/Codex 위에 Router, Swarm, Memory/RAG, Knowledge Graph, Hooks/Daemon, Learning Loop, MCP를 얹는 대규모 **Agent Meta-Harness**로 정리하고, 전체 도입보다 orchestration·memory·routing 패턴을 선별적으로 참고하는 방향을 권장.
- Ruflo의 실제 multi-agent publish race 사례를 통해 공유 checkout 동시 수정 위험과 Agent별 worktree/workspace 격리 필요성을 중요한 운영 교훈으로 정리.
- **OmniRoute**는 Claude Code·Codex·Cursor 등을 하나의 OpenAI 호환 endpoint에 연결하고 Provider/Model 선택, quota, health, fallback, token compression, usage 관측을 중앙화하는 local-first **LLM Gateway**로 분석.
- Harness가 물리 모델명을 직접 고정하기보다 `analysis-high`, `coding-fast`, `review-independent` 같은 논리 profile만 요청하고 실제 모델·Provider·fallback은 Gateway가 담당하는 구조를 PoC 가치가 높은 패턴으로 제안.

### 3. Claude-Mem — 세션 간 영속 메모리와 Progressive Retrieval 패턴

[`ai/tools/claude-mem.md`](./ai/tools/claude-mem.md)

- Claude Code lifecycle hook으로 prompt/tool event를 자동 포착하고 AI observer가 observation/summary로 압축해 SQLite에 저장한 뒤 다음 세션에서 필요한 기억만 검색·주입하는 **persistent memory compression layer**를 분석.
- 핵심 설계는 transcript 전체를 다시 넣는 것이 아니라 `search → timeline → selected observation detail` 순서로 상세 context를 늦게 로딩하는 Progressive Disclosure 방식이며, 장기 Agent Harness의 Shared Memory 설계에 재사용 가치가 높다고 평가.
- 자동 context injection의 크기 제한, CJK/한국어 FTS5 검색 품질, observer 비용·worker lifecycle·보안/retention 등 실제 운영 리스크도 함께 정리해 즉시 표준화보다 PoC 후 검증을 권장.

### 4. Claude Code Setup + Task Observer — Agent 환경의 진단·지속 개선 Loop

[`ai/skills/claude-code-setup.md`](./ai/skills/claude-code-setup.md) · [`ai/skills/task-observer.md`](./ai/skills/task-observer.md)

- Anthropic 공식 **Claude Code Setup**은 코드베이스의 언어·프레임워크·테스트·CI/CD·기존 `.claude` 설정을 읽고 MCP, Skill, Hook, Subagent, Plugin 중 가치가 높은 항목만 추천하는 read-only Repository AI Readiness 진단기로 정리.
- 조직 환경에서는 `공식 Recommender → 사내 allowlist/보안/OS/비용 Policy Filter → Human Approval → Implementation Agent`로 진단과 실제 변경 권한을 분리하는 구조를 제안.
- **Task Observer**는 실제 작업 중 사용자 수정·반복 작업·Skill 실패·workflow friction을 observation으로 축적해 기존 Skill 개선점과 신규 Skill 후보를 발견하는 self-improving meta-skill로 분석.
- 자동 관찰은 하되 Skill 자체를 즉시 수정하지 않고 staging/review를 거치며, observation별 Markdown + frontmatter scan + on-demand reference loading으로 장기 backlog의 context 비용과 병렬 session collision을 줄이는 설계가 핵심.

### 5. Prompt/Claude 실무 최적화 — Prompt Compiler, Slash Label, 한글 Tool Call 대응

[`ai/skills/prompt-master.md`](./ai/skills/prompt-master.md) · [`ai/tips/chatgpt-slash-style-prompt-labels.md`](./ai/tips/chatgpt-slash-style-prompt-labels.md) · [`ai/tips/claude-code-korean-tool-call-corruption.md`](./ai/tips/claude-code-korean-tool-call-corruption.md)

- **Prompt Master**를 단순 prompt template 모음보다 `rough request → intent extraction → target-tool routing → scope/approval/done/verification을 갖춘 Task Contract`로 변환하는 **Prompt Compiler Skill**로 평가하고, Coding Agent 앞단의 경량 Prompt Gateway/Quality Gate로 활용하는 아이디어를 제안.
- `/cheatsheet`, `/blueprint`, `/flashcards`, `/mindmap`은 숨겨진 ChatGPT 공식 명령어가 아니라 원하는 출력 형태를 축약해서 지정하는 **prompt label**로 정리하고, 팀 차원의 `/research`, `/review`, `/rootcause` 같은 intent vocabulary를 실제 Skill Router로 확장하는 방향을 제안.
- Claude Code에서 Tool Call 파라미터의 한국어가 다른 정상 한글 음절로 치환되는 특정 증상은 `\uXXXX` escape 생성 오류 가능성이 있으며, `CLAUDE.md`에서 비 ASCII tool parameter를 **literal UTF-8로 작성하도록 강제**하는 prompt-level workaround와 회귀 검증 방법을 정리.

### 6. Agent가 읽고 만드는 외부 지식·UI — Design System, Archify, Instagram Reels

[`ai/research/ai-friendly-design-systems.md`](./ai/research/ai-friendly-design-systems.md) · [`ai/skills/archify.md`](./ai/skills/archify.md) · [`ai/research/instagram-reels-programmatic-access.md`](./ai/research/instagram-reels-programmatic-access.md)

- AI 친화적 디자인 시스템을 **문서 참조형 → AI용 Context/Skill 제공형 → MCP/CLI/JSON API를 가진 Agent-native형**으로 구분하고, Meta Astryx·SEED AI Skill·Adobe Spectrum 등을 통해 사내 Design System도 token/component/rule/anti-pattern을 Skill/MCP로 노출하는 방향을 제안.
- Archify 문서를 v2.16.0 기준으로 갱신해 typed JSON IR, deterministic validator/renderer, source evidence, Architecture Delta에 더해 constraint-driven Workflow Compiler, last-good preview, atomic delivery 등 Agent-native diagram pipeline의 안정성 패턴을 보강.
- Instagram Reels는 소유/권한 계정에는 공식 Graph API, 임의 공개 Reel URL에는 관리형 수집 API 또는 제한적 Browser Adapter를 분리하고, `Fetch Adapter → normalized media → transcript/OCR/vision → 공식 자료 재검증 → Wiki` 형태로 접근과 분석을 격리하는 구조를 정리.

---

## 2026-08-29

> **11 commits · 핵심 문서 변경 10건 · 핵심 주제 4건**

### 1. DeepSeek Harness — 플러그인 중심 Agent Runtime과 생태계 분석

[`ai/harness/deepseek-harness.md`](./ai/harness/deepseek-harness.md) · [`ai/research/dsh-plugin-ecosystem.md`](./ai/research/dsh-plugin-ecosystem.md)

- DeepSeek Harness를 단순 DeepSeek Coding CLI가 아니라 **모델·도구·세션·Agent Loop·Sandbox·UI를 교체 가능한 플러그인으로 조립하는 Agent Runtime/Harness Platform**으로 정리.
- Cordis 기반 `Everything is a Plugin`, Profile/Bundle/Patch 계층, append-only SessionEvent log, tool 실행 전후 interception, Claude Code·Codex subagent 연결 등 Harness Engineering 관점의 핵심 설계를 분석.
- `dsh-plugin` 생태계에서는 memory/knowledge, session health·token/cost observability, model routing, diagram/skill, orchestration 확장이 빠르게 등장하고 있음을 확인.
- 다만 DSH 자체가 Developer Preview이고 Topic 기반 discovery에는 노이즈가 많아, 현재는 production 표준보다 **DeepSeek Worker + Claude/Codex Reviewer 같은 PoC와 plugin contract 설계 참고용**이 적합하다고 평가.

### 2. Capafy — Agent Skill을 유료 상품으로 만드는 Marketplace 구조 분석

[`ai/skills/capafy-skills.md`](./ai/skills/capafy-skills.md)

- Capafy를 Skill 파일 공유가 아니라 **검색·결제·클라우드 실행·IP 보호·버전 관리·정산이 가능한 Agent Marketplace**로 정리하고 후속 조사로 수익화 구조를 보강.
- `Run on Capafy`는 핵심 Skill을 서버에 유지하고 로컬에는 Thin Skill만 설치해 원격 Agent로 라우팅하며, `Download`는 전체 Skill Package를 구매자에게 전달하는 두 실행 모델을 비교.
- Publisher Skill은 deterministic Python tooling으로 secret scan·package·validation·upload를 처리하고 host LLM이 이를 orchestration하는 구조이며, User Skill은 검색·구매·구독·Thin Skill 설치·cloud instance resume를 담당.
- Agent Skill이 프롬프트 자산을 넘어 **배포·실행·과금 가능한 소프트웨어 상품 단위**로 발전하는 실제 사례로서, 사내 Skill Catalog/Marketplace 설계에도 참고 가치가 있다고 정리.

### 3. AI·Quant Trading Stack — 예측·리서치·최적화·실행 계층 조사

[`ai/tools/kronos.md`](./ai/tools/kronos.md) · [`ai/tools/nautilus-trader.md`](./ai/tools/nautilus-trader.md) · [`ai/tools/vibe-trading.md`](./ai/tools/vibe-trading.md) · [`ai/tools/skfolio.md`](./ai/tools/skfolio.md) · [`ai/tools/gs-quant.md`](./ai/tools/gs-quant.md)

- **Kronos**는 OHLCV/K-line을 금융 전용 token으로 변환해 미래 캔들 시퀀스를 생성하는 Foundation Model로, 단독 매매 oracle보다 forecast/scenario signal provider로 활용하는 방향을 제안.
- **Vibe-Trading**은 자연어 질문을 시장 데이터·전략 생성·백테스트·멀티에이전트 분석·MCP·선택적 broker 실행까지 연결하는 금융 Research Agent Platform으로, 한국 KRX 백테스트도 지원하지만 실거래 기능은 아직 보수적 검증이 필요하다고 평가.
- **skfolio**는 portfolio optimization을 scikit-learn estimator처럼 학습·walk-forward/purged CV·튜닝하는 결정론적 자산배분/리스크 계층, **GS Quant**는 Goldman Sachs의 시계열·상품·pricing/risk 도메인 툴킷으로 정리.
- **NautilusTrader**는 Rust 기반 이벤트 엔진으로 Backtest/Sandbox/Live를 같은 domain model에서 연결하는 execution/risk 계층이며, AI가 직접 broker API를 호출하기보다 `Agent Signal → deterministic optimizer/risk → execution engine`으로 역할을 분리하는 구조가 공통 권장 패턴으로 도출됨.

### 4. 축구 분석 자동화 — 오픈소스 분석 스택과 Betman 공식 배당 수집 전략

[`soccer/open-source-football-analytics.md`](./soccer/open-source-football-analytics.md) · [`soccer/korea-sportstoto-official-odds-collection.md`](./soccer/korea-sportstoto-official-odds-collection.md)

- 축구 분석은 **Kloppy → SoccerAction(xT/VAEP) → mplsoccer 시각화 → PenaltyBlog 확률/Poisson/Elo** 조합을 기본으로 하고, Tracking 데이터가 확보되면 DataBallPy/Floodlight까지 확장하는 오픈소스 스택을 정리.
- K리그는 라이브러리보다 원천 Event/Tracking 데이터 확보가 병목이며, 경기결과 → 통계 → Event → Tracking의 4단계 데이터 성숙도에 맞춰 Momentum/xT/VAEP/공간 분석을 확장하는 전략을 제안.
- 스포츠토토 공식 배당은 **Betman 공개 XHR/Fetch 확인 → 직접 수집 → 필요 시 Playwright → WiseToto fallback → 실제 구매 캡처를 정산 최종값**으로 사용하는 우선순위를 정의.
- 현재 배당 overwrite 대신 snapshot history와 `source / collected_at / market / line`을 저장하고, 분석 직전 refresh 및 line movement를 함께 관리해 EV 계산과 실제 구매가격 정산을 분리하는 데이터 모델을 제시.

---

## 2026-08-28

> **1 commit · 핵심 문서 변경 1건**

### 1. Archify — Agent 기반 아키텍처 시각화·검증 파이프라인 분석

[`ai/skills/archify.md`](./ai/skills/archify.md)

- Claude Code·Codex·Cursor·OpenCode 같은 Coding Agent가 코드베이스나 시스템 설명을 분석해 **typed JSON IR → deterministic validation → self-contained HTML/SVG**로 아키텍처 다이어그램을 만드는 Agent Skill을 정리.
- Architecture·Workflow·Sequence·Data Flow·Lifecycle 5개 유형과 schema/layout/route/label 충돌 검증, machine-readable diagnostic 기반 repair loop를 통해 단순 Mermaid 생성보다 반복 가능한 품질 보증에 초점을 둔 구조를 분석.
- repository evidence를 node에 연결해 실제 코드 근거를 붙이거나, 두 architecture snapshot의 added/removed/changed/moved/rerouted를 계산하는 **Architecture Delta**를 PR·설계 리뷰 artifact로 활용할 수 있음을 정리.
- 코드베이스 온보딩, CI/CD·Agent Workflow 문서화, API/인증 흐름 설명에 특히 적합하며, 사내 환경에서는 Node/Chromium 실행 제약과 LLM의 구조 해석 오류 가능성을 별도 검증해야 한다고 평가.

---

## 2026-08-27

> **12 commits · 핵심 주제 4건**

### 1. Claude Hermes — 상시 실행형 개인 Agent Runtime 분석

[`ai/harness/claude-hermes.md`](./ai/harness/claude-hermes.md)

- Claude Code를 백그라운드 데몬으로 상시 실행하고 Discord/Telegram을 UI로 사용하는 개인용 Agent Runtime을 분석.
- SQLite + FTS5 장기 메모리, scope/thread 기반 세션 라우팅, Cron/Heartbeat, 모델 라우팅, Skill 후보 자동 승격·rollback, 검증 gate를 둔 self-evolution 구조를 정리.
- 특히 `메신저 → scope → queue → Claude session` 분리와 Discord Thread를 독립 Agent Workspace로 사용하는 패턴을 실무 적용 포인트로 제시.

### 2. AI 지식 베이스 구조 통합 및 Orchestration 규칙 정립

[`ai/README.md`](./ai/README.md) · [`ai/Orchestration.md`](./ai/Orchestration.md)

- 기존 `ai-workflow/`와 `ax/`에 흩어진 AI/AX 문서를 최종적으로 루트 `ai/` 아래에 통합하고 `news / tips / harness / tools / skills / research / etc` 구조로 재분류.
- 문서 목적에 따라 시점 중심은 `news`, 즉시 적용 노하우는 `tips`, 여러 모델/도구 연결은 `harness`, 독립 도구는 `tools`, 재사용 Skill은 `skills`, 비교·심층분석은 `research`로 분류하는 우선순위를 정의.
- 중복 문서 생성을 피하고 기존 문서 통합을 우선하며, 새 카테고리는 동일 성격 문서가 최소 3개 이상 형성될 때 검토하는 운영 규칙을 추가.

### 3. DeepSeek V4 Flash 실사용 평가 + Opus/Fable Harness 구체화

[`ai/research/deepseek-v4-flash.md`](./ai/research/deepseek-v4-flash.md) · [`ai/research/deepseek-v4-flash-real-world-usage.md`](./ai/research/deepseek-v4-flash-real-world-usage.md) · [`ai/harness/claude-opus-fable-deepseek-v4-flash.md`](./ai/harness/claude-opus-fable-deepseek-v4-flash.md)

- V4 Flash 0731을 단독 만능 모델보다 **명확한 계획을 실행하는 저비용 Coding/Tool Worker**로 평가하고, OpenCode·Hermes 등 실사용 후기를 통해 짧고 명확한 Task에서 강하고 장기 Planning·목표 유지에는 약점이 있음을 정리.
- 권장 구조를 `Opus/Fable Analyze·Plan → Flash Execute → deterministic Build/Test/Diff Gate → Opus/Fable Review`로 구체화.
- Task Contract, 파일 scope 제한, 2~3회 retry 후 Opus escalation, 증거 기반 완료 판정, Human approval이 필요한 고위험 작업 등 Harness guardrail을 명시.

### 4. AI UI 구현에서 shadcn/ui를 공통 어휘로 사용하는 가이드

[`ai/tips/ai-ui-shadcn.md`](./ai/tips/ai-ui-shadcn.md)

- shadcn/ui를 단순 컴포넌트 모음이 아니라 **사람과 AI Agent가 공유하는 UI 구현 vocabulary**로 설명하고, Tailwind와 결합해 생성 결과의 일관성과 수정 가능성을 높이는 방식을 정리.
- `Dialog`, `Sheet`, `Tabs`, `Form` 같은 상위 컴포넌트 명칭으로 프롬프트의 추상화 수준을 높이고, 프로젝트 내부 코드 소유 방식 덕분에 AI 생성 결과를 장기 제품 코드로 발전시키기 쉽다는 점을 강조.
- 사내 공통 `components/ui`/registry와 디자인 Skill을 결합해 조직 전용 AI UI vocabulary로 확장하는 아이디어를 제안.

### 기타

- Claude Hermes 문서를 기존 AX 인덱스에 연결한 뒤 AI 지식 베이스 구조 개편에 맞춰 `ai/harness/`로 이동.
- `ax/ai/` 통합을 거쳐 최종적으로 루트 `ai/`로 이동하면서 README 링크와 문서 경로를 정리.
- 구조 이동 과정에서 DeepSeek V4 Flash 연구 문서를 새 `ai/research/`, Harness 문서를 `ai/harness/` 위치에 복원·분리.

---

## 2026-08-26

> **18 commits · 핵심 문서 변경 10건 · 구조/인덱스 변경 8건**

### 1. Paperthin — Agent 품질·위생 Skill 패턴 정리

[`ax/paperthin.md`](./ax/paperthin.md)

- Paperthin을 특정 런타임에 종속되지 않는 **Agent Quality / Hygiene Layer**로 정리하고, 약 28개의 작은 Markdown Skill이 AI 산출물의 비대화·문맥 드리프트·SSOT 분산·검증 누락을 교정하는 구조를 설명.
- `re0`, `readchk`, `ssotize`, `debloat`, `factchk`, `sip`, `re0-memo`, `prism` 등 Skill을 Depth/Breadth/Coil/Mesh 관점으로 분류하고, 거대한 orchestration보다 필요한 반사 동작을 조합하는 접근을 분석.
- Claude Code/Codex 공통 품질팩, 문서 후처리 파이프라인, 사내 검증 Skill 확장 등 실무 적용 아이디어를 제시.

### 2. Claude Code 토큰 최적화 가이드 최신화

[`ai-workflow/token-optimization-claude-codex.md`](./ai-workflow/token-optimization-claude-codex.md)

- Anthropic의 공식 Context Engineering 가이드를 반영해 핵심을 **짧은 프롬프트보다 작고 관련성 높은 컨텍스트 유지**로 재정리.
- 작업 경계에서는 `/clear`, 연속 작업은 `/compact`, 시작 시 `/context`, 단순 작업은 낮은 effort를 우선 적용하는 실전 운영 원칙을 강화.
- 대형 파일·빌드 로그·MCP 응답·장기 대화가 컨텍스트를 오염시키는 주요 원인임을 정리하고, 세션을 작업 단위로 나누는 방향을 권장.

### 3. DeepSeek-V4-Flash AX 활용 조사

[`DeepSeek-V4-Flash.md`](./DeepSeek-V4-Flash.md)

- 1M 토큰 컨텍스트와 MoE 구조를 가진 DeepSeek-V4-Flash를 **비용 민감형 Coding/Agent Worker 모델** 후보로 분석.
- 모든 작업을 최고가 모델에 맡기기보다 `Planner/Reviewer → V4-Flash Worker → Build/Test → Reviewer` 형태의 계층형 모델 라우팅을 제안.
- CI 로그 분석, 대규모 코드베이스 탐색, 반복 수정 Worker, 문서/RAG 등 처리량 중심 AX 워크로드와 자체 평가 지표를 정리.

### 4. Toss Open API 자동 트레이딩 사례 조사

[`deep-research/toss-openapi-auto-trading-bot-cases.md`](./deep-research/toss-openapi-auto-trading-bot-cases.md)

- 토스증권 Open API의 국내·미국 주식 시세/계좌/주문/조건주문 지원 범위와 공개 자동매매 구현 사례를 조사.
- 공개 프로젝트에서 공통적으로 사용하는 **dry-run 기본, 실주문 이중 잠금, 고정 허용 IP, rate limit 대응, 체결 재동기화, AI 판단과 주문 실행 계층 분리**를 핵심 안전 패턴으로 정리.
- Read-only → Dry-run → 수동 승인 → 제한 자동화 → 완전 자동화의 단계적 도입과 MCP 기반 Agent 연동 사례를 포함.

### 5. 아이디어 백로그·기획 워크플로 구축

[`idea/idea-planning-wiki-workflow.md`](./idea/idea-planning-wiki-workflow.md)

- 정리되지 않은 아이디어를 AI와 대화하며 **확정 / AI 제안 / 확인 필요**로 분리하고, Vision/MVP/Later/Out of Scope를 관리한 뒤 표준 Markdown으로 Wiki에 축적하는 워크플로를 정의.
- 동일·유사 아이디어는 신규 문서 생성보다 기존 문서 업데이트를 우선하고, Wiki를 후속 PRD·설계·구현의 출발점으로 사용하는 구조를 제안.

### 6. 제품/서비스 아이디어 3건 구체화

- [`idea/mamma-story.md`](./idea/mamma-story.md): 이유식 재료·가공·제작·섭취·도감·퀘스트를 게임의 인벤토리 문법으로 연결하는 **맘마스토리** Alpha→Beta→정식 서비스 구상.
- [`idea/marvelog.md`](./idea/marvelog.md): 마블 영상물을 공개순/시간순/히어로/세계관별로 체크하고 진행률·공유 스냅샷·친구 비교를 제공하는 **Marvelog** 정주행 서비스 구상.
- [`idea/bescore-reboot.md`](./idea/bescore-reboot.md): 과거 BeScore의 경기 조회 경험을 분석·예측 없이 날짜별 일정·라이브스코어·경기 이벤트 중심의 반응형 웹으로 재구현하는 **BeScore Reboot** 구상.

### 7. Aina 홈 AI 비서 확장 설계

[`idea/aina-home-ai-assistant.md`](./idea/aina-home-ai-assistant.md)

- 기존 Discord + Claude 기반 Aina를 **Aina Core 중심의 Client/Agent 분리 구조**로 확장하고 Codex Session/Thread와 주방 Voice Client를 추가하는 방향을 정리.
- Voice 단말은 Wake Word·오디오 입출력만 담당하고, Realtime Voice·Memory·Agent 위임은 서버에 두는 경량 단말 구조를 제안.
- Discord와 Voice의 전체 대화 로그 동기화보다 Aina Core의 공통 기억과 Agent 세션 지속성을 우선하는 설계를 명시.

### 8. agent-backlog 로컬 AI 작업 큐 설계

[`idea/agent-backlog.md`](./idea/agent-backlog.md)

- Claude Code/Codex에서 나중에 수행할 일을 완전한 `prompt.md`로 등록하고 지정 시각부터 **FIFO 순차 실행·세션 resume·검증·결과 보고**까지 처리하는 로컬 CLI 아이디어를 구체화.
- `task.json`, `session-id.txt`, `report.md`, `log.txt` 등 작업 단위 artifact와 `waiting-user` 상태, Git stage/Perforce pending changelist까지만 자동화하는 안전 경계를 정의.

### 기타

- 루트 Wiki에 `idea/` 백로그 인덱스를 연결하고 Marvelog·agent-backlog를 아이디어 인덱스에 등록.
- `agent-backlog` 문서를 초기 위치에서 `idea/` 백로그로 이동해 아이디어 문서 체계에 통합.

---

## 2026-08-25

> **3 commits · 핵심 문서 변경 2건**

### 1. persona-lightsim 합성 페르소나 시장조사·시뮬레이션 분석 추가

[`ax/persona-lightsim.md`](./ax/persona-lightsim.md)

- NVIDIA Nemotron-Personas 기반 10개국 합성 인구를 Claude Code Skill/Agent 워크플로우에 연결해 제품 시장조사, 지불의사, 반응 시뮬레이션, persona card 생성을 수행하는 **synthetic pre-research layer**로 정리.
- 별도 웹앱이나 상시 서버 없이 Claude Code를 오케스트레이터/UI로 사용하고 Python이 샘플링·가공을 담당하며, 국가별 analyst fan-out과 batch judgment로 개별 persona 대화보다 비용을 낮추는 구조를 설명.
- 1차 집단 의견을 다시 주입하는 mean-field 2-pass, deterministic aggregation, SQLite persona pack 등 반복 가능한 실험 구조와 한계를 정리.
- 실제 소비자 행동 데이터 대체재가 아니라 아이디어 스크리닝·국가별 반응 가설·UX 사전 검증용으로 적합하며, 동일 seed population을 활용한 Persona Regression Test 같은 응용을 제안.

### 2. Confluence AI 문서 작성·품질 개선 스택과 공개 Skill 조사

[`ax/confluence-ai-writing-mcp-tools.md`](./ax/confluence-ai-writing-mcp-tools.md)

- Confluence 자동화의 권장 구조를 **Rovo / 공식 Atlassian Rovo MCP Server / 별도 문서 품질 Skill**의 역할 분리로 정리하고, MCP는 검색·읽기·쓰기 I/O, Skill은 정보 구조·가독성·품질 규칙을 담당하도록 제안.
- 후속 조사에서 `borghei/Claude-Skills`의 `confluence-expert`, `SpillwaveSolutions/confluence-skill`, Anthropic `confluence-api`, `dmarreco/skills` 등 공개 GitHub Skill을 추가 비교.
- `confluence-expert`는 Information Architecture·template·governance 등 **문서 구조 방법론**, SpillwaveSolutions는 Markdown 변환·페이지 게시·다이어그램 등 **Publishing/Rendering 계층**으로 조합 가치가 높다고 평가.
- 사내 적용은 `검색 → 초안 → 품질 검사 → Diff → 승인 → 업데이트` 흐름과 Human-in-the-loop를 유지하면서, 공개 Skill의 좋은 규칙을 내부 Confluence Writer/Quality Skill로 흡수하는 방향을 권장.

---

## 2026-08-24

> **8 commits · 핵심 문서 변경 5건 · 인덱스/링크 변경 2건**

### 1. NanoNets Graft 코드베이스 Context Graph 분석 보강

[`ax/graft.md`](./ax/graft.md)

- Graft를 Coding Agent용 **Codebase Memory / Context Layer**로 정리하고, tree-sitter 기반 구조 그래프와 선택적 LLM Deep Build를 결합하는 Hybrid Code Graph 구조를 상세화.
- `ask`, `skeleton`, `callers`, `grep`, `map`, `blast`, `check`, `viz` 등 CLI와 MCP 인터페이스를 통해 저장소 구조·호출 관계·영향 범위를 반복 재탐색하지 않고 재사용하는 흐름을 설명.
- Claude Code, Codex, Cursor, Gemini, Copilot 등 Agent별 native integration과 변경된 파일만 다시 처리하는 증분 갱신 방식을 정리.
- 프로젝트 자체 benchmark의 토큰·Tool Call 절감 수치는 참고하되, 실제 사내 monorepo/C++·C# 환경에서는 별도 A/B 검증이 필요하다는 주의를 명시.

### 2. codebase-memory-mcp 영속 코드 지식 그래프 분석 추가

[`ax/codebase-memory-mcp.md`](./ax/codebase-memory-mcp.md)

- Tree-sitter AST + Hybrid LSP로 함수·클래스·호출·HTTP route·서비스 관계를 **SQLite 기반 영속 Knowledge Graph**에 저장하고 MCP로 제공하는 구조를 정리.
- 158개 언어 파싱과 주요 언어의 타입/호출 해석 보강, background watcher, impact analysis, dead-code detection, Cypher 질의 등 관계형 코드 탐색 기능을 소개.
- 대형 저장소에서 `grep → 파일 읽기 → 참조 검색`을 반복하는 대신 공통 코드 구조 메모리를 Claude Code/Codex 등에 공유하는 활용 패턴을 제안.
- C#/C++도 Hybrid LSP 대상이므로 대형 .NET/Unreal 저장소 PoC에서 인덱싱 시간, graph accuracy, 재색인 속도, 토큰·Tool Call 절감률을 측정할 가치가 있다고 정리.

### 3. Agency Agents 역할별 전문 Agent 카탈로그 분석

[`ax/agency-agents.md`](./ax/agency-agents.md)

- 개발·디자인·PM·보안·마케팅 등 역할별 전문 Agent 정의를 여러 AI Coding Runtime으로 변환·설치하는 **Agent Role Library**로 정리.
- 각 Agent 정의가 Identity, Mission, Rules, Deliverables, Workflow, Success Metrics까지 포함해 단순 persona prompt보다 구체적인 업무 규약을 제공한다는 점을 설명.
- 자체 실행 엔진이나 복잡한 orchestration보다는 역할 프롬프트 자산의 표준화와 Claude Code/Codex/Cursor 등으로의 이식성이 핵심이라고 평가.
- `Planner → Worker → Reviewer`, 작업별 Agent Router, 필요한 역할만 동적 로딩, eval 기반 역할 품질 검증 같은 확장 아이디어를 제시.

### 4. Agent Reach 인터넷 Capability Layer 분석

[`ax/agent-reach.md`](./ax/agent-reach.md)

- Twitter/X, Reddit, YouTube, GitHub, Web, RSS 등 플랫폼별 인터넷 접근 도구를 직접 새로 구현하기보다 **선택·설치·설정·상태 진단·fallback 라우팅**하는 상위 capability layer로 정리.
- `agent-reach doctor`로 채널별 상태를 진단하고, 실제 요청 시에는 `gh`, `yt-dlp`, Jina Reader 등 업스트림 CLI/MCP를 Agent가 직접 호출하는 낮은 결합도 구조를 설명.
- Research Agent의 공통 인터넷 계층, 세션 시작 전 capability health check, backend 장애 자동 복구 같은 활용 패턴을 제안.
- Cookie·비공식 접근·업스트림 공급망 의존성이 있으므로 기업 환경에서는 인증정보와 보안 정책 검토가 필요하다고 명시.

### 5. OpenMausBot Local-first Multi-Agent Desktop 분석

[`ax/openmausbot.md`](./ax/openmausbot.md)

- Claude·Codex·Grok CLI를 메신저의 연락처처럼 여러 Bot으로 운영하는 **local-first 멀티에이전트 데스크톱 UI/harness**로 정리.
- provider별 Driver를 canonical runtime event로 정규화하고 SSE로 UI에 전달하는 구조, Permission Broker, Computer Use, Connected Apps, 프로젝트별 Channel 모델을 분석.
- 기존 CLI 로그인·구독을 재사용하면서 역할별 Agent, 컴퓨터, SaaS 앱, 승인 흐름을 하나의 UX로 통합한다는 장점을 설명.
- 복잡한 DAG orchestration보다는 사람이 여러 Agent를 직접 협업시키는 인터랙티브 UI에 초점이 있으며, 사내 Agent Desktop·공통 Approval Layer·Agent observability UI 설계 참고 사례로 평가.

### 기타

- `codebase-memory-mcp` 문서를 `ax` 인덱스에 연결.
- `ax/README.md`를 재정리해 새로 추가된 AX 도구/프로젝트 문서 탐색 구조를 보강.

---

## 2026-08-22

> **3 commits · 핵심 문서 변경 2건**

### 1. 웹 UX/UI 자동 점검 스택 정리

[`ax/web-ui-ux-audit-stack.md`](./ax/web-ui-ux-audit-stack.md)

- 단일 디자인 스킬보다 **Impeccable + Playwright MCP** 조합을 기본 스택으로 제안하고, 필요 시 Chrome DevTools MCP와 UI UX Pro Max를 보조 계층으로 추가하는 구조를 정리.
- Impeccable은 접근성·반응형·성능·시각 품질 판단, Playwright MCP는 실제 브라우저 플로우·상태 전환 검증, DevTools MCP는 콘솔·네트워크·성능 진단 역할로 분리.
- `앱 실행 → 주요 플로우 순회 → desktop/tablet/mobile 확인 → audit/critique → 런타임 진단 → 이슈 분류 → 수정 → 재검증`의 권장 자동 점검 흐름을 제시.

### 2. Web UX Improvement Loop 스킬 설계 및 인증 처리 보강

[`ax/skills/web-ux-improvement-loop.md`](./ax/skills/web-ux-improvement-loop.md)

- 웹 프로젝트를 **Inspect → Audit → Collect → Prioritize → Improve → Verify → Report**로 반복하는 통합 스킬 구조를 추가하고, 발견 이슈를 Severity·Category·Evidence·Impact·Recommendation까지 포함한 표준 형식으로 관리하도록 설계.
- 수정 후 동일한 사용자 플로우를 다시 실행하고 Resolved / Remaining / Regression으로 결과를 판정하는 재검증 원칙을 명시.
- 후속 변경으로 로그인 필요 페이지를 위한 **Auth Bootstrap** 단계를 추가해 persistent profile, `storageState`, 테스트 계정, 최초 1회 수동 인증 순으로 세션 재사용 전략을 정리.
- 인증 상태 파일과 쿠키를 비밀정보로 취급하고 Git에 커밋하지 않으며, SSO/MFA는 무리한 완전 자동화보다 최초 인증 후 세션 재사용을 권장.
- 역할별 인증 상태를 분리해 user/manager/admin 등 권한별 UI와 login/logout/session-expired/접근 거부 UX까지 같은 루프로 검증하도록 확장.

---

## 2026-08-21

> **2 commits · 핵심 문서 변경 2건**

### 1. Claude Graph Engineering 개념과 실전 패턴 정리

[`ax/claude-graph-engineering.md`](./ax/claude-graph-engineering.md)

- Graph Engineering을 공식 제품명이 아니라, **작업을 DAG로 분해해 여러 전문 Agent를 노드 단위로 연결하는 멀티에이전트 설계 관점**으로 정의.
- Prompt/Context/Loop Engineering과 구분해, 핵심 대상을 프롬프트가 아닌 **작업 토폴로지와 의존성 설계**로 설명.
- Orchestrator-Workers, Evaluator-Optimizer와의 관계와 함께 Fan-out, Merge, Verifier, Gate 같은 핵심 구조를 정리.
- `ayaangazali/graph-engineering`의 `/graph`, `/graph-plan`, `/graph-save`, persistent graph 명령과 대표 패턴을 소개.
- 대규모 Repository Audit·Migration·Security Review·Deep Research처럼 병렬화와 독립 검증이 중요한 작업에 유리하지만, 작은 수정에는 Agent/토큰 오버헤드가 크다는 적용 기준을 제시.

### 2. Superpowers 검증·체계적 디버깅 규율 정리

[`ax/skills/superpowers-verification-and-systematic-debugging.md`](./ax/skills/superpowers-verification-and-systematic-debugging.md)

- `verification-before-completion`의 핵심을 **Evidence before claims**로 정리하고, 완료 선언 전에 현재 시점의 테스트·빌드·재현 결과를 직접 확인하도록 규정.
- `systematic-debugging`은 수정부터 시도하지 않고 **재현 → 증거 수집 → Root Cause 추적 → 단일 가설 검증 → 최소 수정** 순서로 진행하는 방식으로 정리.
- 3회 이상 수정이 실패하면 추가 땜질보다 아키텍처 자체를 다시 의심하도록 하는 원칙을 포함.
- 두 Skill을 `원인 규명 및 수정 → 실제 검증 → 완료 보고`의 연속된 품질 통제 흐름으로 연결해 설명.
- Agent의 추측성 수정, Subagent 결과의 무검증 수용, 근거 없는 완료 보고를 줄이는 실무적 효과를 강조.

---

## 2026-08-20

> **7 commits · 핵심 문서 변경 5건 · 인덱스 갱신 2건**

### 1. GSD Core 최신 내용 보강

[`ax/skills/gsd-core.md`](./ax/skills/gsd-core.md)

- GSD Core를 AI 개발 Workflow / Context Engineering Framework 관점으로 다시 정리.
- `Discuss → Plan → Execute → Verify → Ship` 흐름과 fresh-context subagent 기반 Context Rot 대응을 상세화.
- 기존 `gsd-build/get-shit-done`에서 `open-gsd/gsd-core`로 이어진 현재 프로젝트 관계와 지원 Runtime을 정리.
- 장기 Agent 개발에서 상태를 모델 기억보다 `STATE.md`, `CONTEXT.md` 같은 파일 기반 artifact로 유지하는 관점을 강조.

### 2. GSD Core vs Superpowers 비교 문서 추가

[`ax/skills/gsd-core-vs-superpowers.md`](./ax/skills/gsd-core-vs-superpowers.md)

- **GSD Core = Project / Context Orchestration**
- **Superpowers = Engineering Discipline / Skills Workflow**
- GSD는 장기 프로젝트 상태·컨텍스트 관리에 강하고, Superpowers는 TDD·디버깅·리뷰 같은 개발 규율에 강하다는 차이를 정리.
- 둘을 그대로 중복 설치하기보다 한쪽을 기본 프레임워크로 두고 다른 쪽의 규칙/Skill을 선별 적용하는 방향을 제안.

### 3. Claude Code `Concise` Output Style 정리

[`ax/claude-code-concise-output-style.md`](./ax/claude-code-concise-output-style.md)

- Claude Code의 `/config` 또는 `settings.json`에서 `outputStyle: "Concise"`를 사용하는 방법 정리.
- 결과 우선·짧은 기본 응답으로 터미널 노이즈와 출력 토큰을 줄이는 용도.
- 전체 토큰 최적화 기능이라기보다는 **출력 표현을 간결하게 만드는 설정**으로 보는 것이 적절하다고 정리.

### 4. CatchUp 소개 추가

[`ax/catchup.md`](./ax/catchup.md)

- Claude Code, Codex, Cursor 등 서로 다른 Coding Agent 사이에서 세션 컨텍스트를 복구·검색·인계하는 local-first CLI.
- Claude 사용량 제한 후 Codex로 전환하거나, 긴 세션을 정리해 새 세션으로 이어가는 용도에 적합.
- native fork와 cross-agent transcript handoff의 차이, `--since-compact`, `--last`, 검색, worktree 대응 등을 정리.
- 별도 SaaS 없이 각 Agent의 로컬 세션 저장소를 활용한다는 점이 핵심.

### 5. Hermes Desktop Bot Mode 소개 추가

[`ax/hermes-desktop-bot-mode.md`](./ax/hermes-desktop-bot-mode.md)

- Hermes Profile을 이름·역할·모델·메모리·Skill을 가진 **영구 Agent**로 운영하는 Bot Mode를 정리.
- Bot 간 `@mention`, Direct Message, Group Chat, Routine, multi-machine routing 등을 하나의 Desktop UX로 제공.
- `Profile + Persistent Memory + Skill Isolation + Routine + Bot-to-Bot Messaging`을 결합한 개인 Agent Team 구성에 특히 유용.
- 2026-08-20 기준 빠르게 개발 중인 기능이므로 중요 작업에 바로 전면 도입하기보다는 테스트 Bot/Profile로 검증 후 확대하는 편이 안전.

### 기타

- CatchUp 문서를 `ax` 인덱스에 연결.
- Hermes Desktop Bot Mode 문서를 `ax` 인덱스에 연결.

---

<!--
자동 갱신 규칙
1. 매일 아침 전날 KST 기준 develop 브랜치 커밋을 조회한다.
2. SUMMARY.md 자체를 갱신한 자동 커밋은 다음 날 요약 대상에서 제외한다.
3. 커밋 메시지만 나열하지 말고 실제 diff/문서 내용을 확인한다.
4. 동일 주제의 연속 커밋은 하나의 항목으로 병합한다.
5. 새 날짜를 이 주석 바로 위가 아니라 기존 최신 날짜 섹션보다 위에 추가해 최신순으로 유지한다.
6. 변경이 없는 날은 섹션을 생성하지 않는다.
-->
