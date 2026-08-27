# Claude Hermes

> Tags: `Claude Code` `Personal Agent` `Discord` `Telegram` `Memory` `Automation` `Self-Evolution` `SQLite` `Skills`

## 한줄 요약

Claude Code를 백그라운드 데몬으로 상시 실행하면서 Discord/Telegram을 인터페이스로 사용하고, SQLite 기반 장기 메모리·세션 라우팅·자동화·Skill 학습·검증 기반 자기개선까지 결합한 개인용 에이전트 런타임이다.

## 프로젝트 개요

Claude Hermes는 `moazbuilds/claudeclaw`에서 출발한 포크지만, 단순 메신저 브리지 수준을 넘어 상태 관리와 메모리, Skill 학습, 모델 라우팅, 자기개선 파이프라인을 재설계한 프로젝트다.

웹 대시보드를 제거하고 Discord/Telegram/CLI를 유일한 인터페이스로 삼는다. Bun 기반 데몬이 Claude Code CLI를 호출하며, 예약 작업·heartbeat·음성 명령·멀티세션·장기 메모리 등을 제공한다.

## 해결하려는 문제

일반적인 Claude Code 사용은 사용자가 터미널 세션을 열고 직접 작업을 시작해야 하며, 세션 간 기억과 장기 실행, 메신저 기반 접근, 예약 실행이 제한적이다. Hermes는 이를 다음 방향으로 해결한다.

- Claude Code를 항상 켜져 있는 개인 비서/에이전트로 운영
- Discord/Telegram에서 장소와 장치에 관계없이 작업 요청
- 대화·작업 이력을 장기 메모리로 유지
- Discord 채널/스레드별 컨텍스트 격리
- Cron/Heartbeat 기반 반복 업무 자동화
- 반복 작업을 Skill 후보로 축적하고 검증 후 활성화
- 에이전트 자체 코드 변경도 테스트를 통과한 경우에만 반영

## 핵심 기능

### 1. 상시 실행 Claude Code 데몬

Claude Code를 Bun 기반 백그라운드 프로세스로 실행한다. Heartbeat와 timezone-aware Cron Job을 지원하며 Job 파일은 주기적으로 hot reload된다.

### 2. Discord / Telegram 인터페이스

텍스트·이미지·음성을 지원한다. Discord에서는 DM, 서버 mention/reply, slash command, voice message, reaction feedback을 지원하며 작업 진행 상태도 호출자에게 전달한다.

Discord 채널 이름을 이용한 정책도 제공한다.

- `listen-*`, `ask-*`: mention 없이 자유 대화
- `deliver-*`: 전달 전용
- 일반 서버 채널: 기본적으로 mention/reply 시 응답
- DM: 모든 메시지 응답

### 3. Scope 기반 세션 라우팅

세션 범위를 `dm`, `per-channel-user`, `per-thread`, `shared`, `workspace` 등으로 분리할 수 있다.

Discord Thread는 독립 Claude CLI session과 독립 queue를 사용한다. 같은 thread 내부 메시지는 직렬화하지만 서로 다른 thread는 병렬 실행한다. 동일 Claude session에 동시에 `--resume`을 호출하는 충돌을 피하면서 병렬성을 확보하는 구조다.

### 4. SQLite + FTS5 기반 메모리

상태를 flat JSON 중심으로 관리하던 원본 Claw와 달리 `bun:sqlite`의 단일 `state.db`를 중심으로 관리한다.

메모리는 크게 세 층이다.

- Identity: `SOUL.md`, `IDENTITY.md`, `USER.md`, `CLAUDE.md`, workspace override
- Episodic: 성공한 turn을 SQLite `messages`에 기록하고 FTS5 검색
- Runtime digest: 최근 durable fact와 과거 대화 snippet을 매 호출의 system prompt에 주입

추가로 labeled memory block, agent scratchpad, nightly Dream consolidation, learned skill library를 제공한다.

### 5. Skill 자동 학습/승격

성공한 실제 tool trace에서 candidate skill을 수집할 수 있다. 기본 정책은 7일 내 20회 이상 실행되고 성공률 85% 이상이면 `active`로 승격하는 방식이다. 승격 후 rollback window에서 성공률이 70% 아래로 떨어지면 `shadow`로 강등한다.

활성화된 Skill만 `.claude/skills/hermes_<name>/`으로 노출되어 spawned agent가 사용할 수 있다.

### 6. Agentic Model Routing

메시지를 planning 또는 implementation으로 분류해 planning은 Opus, implementation은 Sonnet으로 보내는 모델 라우팅을 지원한다. Rate limit 발생 시 backup model로 자동 재시도할 수도 있다.

### 7. Verify-gated Self Evolution

`scripts/evolve.ts`를 사람이 명시적으로 실행하면 Claude가 Hermes 자체 코드를 수정한다. 이후 다음 검증 단계를 모두 통과해야 commit한다.

`typecheck → lint → unit → smoke → integration`

하나라도 실패하면 변경을 `git restore`로 되돌린다. branch switching, force push, `--no-verify`, cwd 외부 쓰기 등을 막는 guard prompt도 둔다.

### 8. Security Level

네 가지 tool 접근 단계를 제공한다.

- `locked`: Read/Grep/Glob만 허용
- `strict`: Bash/WebSearch/WebFetch 제외
- `moderate`: 모든 tool 허용, project directory 범위 제한
- `unrestricted`: 모든 tool 허용, directory 제한 없음

## 아키텍처

```text
Discord / Telegram / CLI
          │
          ▼
   Message / Envelope Router
          │
     Scope Resolution
          │
   ┌──────┴─────────┐
   │                │
Global Queue    Thread/Scope Queue
   │                │
   └──────┬─────────┘
          ▼
      Claude Runner
          │
   Model Routing / Fallback
          │
          ▼
     Claude Code CLI
          │
   ┌──────┼───────────┐
   ▼      ▼           ▼
state.db  Memory     Skills
SQLite    Digest     Pipeline
 + FTS5

Automation
Heartbeat / Cron ───────→ Runner

Self Evolution
Human Trigger → Claude Edit → Verify 5 stages
                          ├─ Green → Commit
                          └─ Red   → Restore
```

핵심 설계 포인트는 **메신저 UI와 Claude Code 실행 계층을 분리하고, 중앙 상태 DB + scope router + queue를 통해 장기 실행과 병렬 세션을 안전하게 관리한다는 것**이다.

## 장점

1. **Claude Code를 그대로 활용한다.** 별도 Agent SDK 앱을 처음부터 만드는 것보다 기존 Claude Code 생태계와 Skill을 활용하기 쉽다.
2. **개인 비서 운영에 필요한 요소가 한 프로젝트에 모여 있다.** 메신저, 음성, Cron, Heartbeat, Memory, Skill, 세션 관리가 통합되어 있다.
3. **SQLite 단일 상태 저장소가 운영하기 쉽다.** 별도 Vector DB나 서버 인프라 없이 FTS5 검색과 durable state를 확보한다.
4. **Discord Thread 병렬성이 실용적이다.** 대화/작업별 session을 격리하면서 thread 간 병렬 처리가 가능하다.
5. **Skill 학습에 promotion/rollback 개념이 있다.** 단순 자동 생성보다 운영 성능을 기반으로 승격/강등하는 구조가 안전하다.
6. **Self Evolution에 검증 gate가 있다.** 자기수정 기능을 무조건 적용하지 않고 테스트 전체 통과를 요구한다.
7. **웹 UI가 없어 배포 구조가 단순하다.** 메신저가 곧 UI이므로 개인 서버/미니 PC에 올리기 쉽다.

## 단점 및 한계

1. **Claude Code CLI에 강하게 의존한다.** 범용 LLM agent runtime이라기보다 Claude Code를 상시 서비스화하는 구조에 가깝다.
2. **Headless tool 권한의 위험이 있다.** 특히 `moderate`/`unrestricted`는 장기 실행 데몬 특성상 prompt injection이나 잘못된 자동 작업의 영향이 커질 수 있다.
3. **Skill 자동 승격 기준이 실행 성공률 중심이다.** 성공의 의미가 실제 업무 품질과 항상 동일하지 않으며 20회/85% 같은 임계치는 환경별 튜닝이 필요하다.
4. **FTS5는 가볍지만 semantic retrieval 한계가 있다.** Vector/graph 기반 장기 기억이 필요한 규모에서는 검색 품질이 제한될 수 있다.
5. **Thread session lifecycle에 제약이 있다.** 문서 기준 thread session 수 제한이 없고 자동 compact가 없으며 `/reset`도 global session만 대상으로 한다.
6. **Self Evolution은 테스트 품질에 의존한다.** verify가 green이라고 해서 설계적으로 올바른 변경이라는 보장은 없다.
7. **웹 관리 화면이 없다.** 서버 상태, memory, schedule, skill 상태를 시각적으로 관리하려면 CLI/DB/메신저에 의존해야 한다.

## 기존 도구와 비교

### Claude Hermes vs ClaudeClaw

| 항목 | Claude Hermes | ClaudeClaw 계열 |
|---|---|---|
| 상태 저장 | SQLite + FTS5 | Flat JSON 중심 |
| Session | scope router + thread 병렬 session | global 중심 |
| Skill | candidate → active → rollback | 수동 설치 중심 |
| 자기개선 | human-triggered + verify gate | 기본 제공 없음 |
| 모델 | planning/implementation routing | 단일 모델 중심 |
| UI | Discord/Telegram/CLI | Web dashboard 포함 |
| 검증 | typecheck/lint/unit/smoke/integration | 수동 중심 |

### Claude Hermes vs 일반 Discord Claude Bot

일반 Bot은 `Discord → LLM API → 응답` 구조에 집중하지만 Hermes는 그 위에 Claude Code session, tool 실행, workspace, memory, scheduler, skill learning을 올린 **Agent Runtime**에 가깝다.

### Claude Hermes vs Agent SDK 기반 자체 비서

Agent SDK는 자유도가 높고 provider/runtime를 직접 설계하기 좋지만 session, memory, scheduler, messaging bridge 등을 직접 만들어야 한다. Hermes는 Claude Code 중심이라는 제약 대신 개인 비서에 필요한 기본 구조를 즉시 제공한다.

## 활용 사례

- Discord에서 24시간 접근 가능한 개인 개발 비서
- 정기 GitHub/업무 정보 수집 및 요약
- 서버/빌드/프로젝트 상태 heartbeat 점검
- 음성 메시지를 이용한 이동 중 작업 등록
- Discord thread별 독립 개발/리서치 세션
- 반복 업무에서 reusable Skill 후보 자동 추출
- 장기간 누적되는 개인 업무 지식과 대화 기억

## 내가 활용할 수 있는 아이디어

### 1. 기존 Discord AI 비서의 런타임 참고 구조

메신저 브리지를 직접 확장하는 경우 Hermes의 `message → scope → queue → Claude session` 분리를 참고할 가치가 크다. 특히 채널과 thread를 단순 UI가 아니라 **작업 컨텍스트 경계**로 사용하는 방식이 유용하다.

### 2. Discord Thread = Agent Workspace 패턴

하나의 Discord thread를 하나의 독립 session/work item으로 매핑하면 여러 작업을 동시에 운영하기 쉬워진다. 같은 thread는 serial queue로 보호하고 서로 다른 thread만 병렬화하는 방식은 Claude CLI 기반 orchestration에 그대로 재사용할 수 있다.

### 3. 경량 장기 메모리

개인용 에이전트에서는 처음부터 Vector DB를 도입하기보다 SQLite + FTS5 + importance/recency/relevance scoring으로 시작하고, 검색 품질이 실제 한계에 도달했을 때 embedding/vector 계층을 추가하는 단계적 접근이 적합하다.

### 4. Skill Candidate → Promotion → Rollback

반복 작업을 즉시 정식 Skill로 만들지 않고 candidate/shadow 상태로 수집한 뒤 성공률과 사용 횟수를 기준으로 승격시키는 개념은 사내 Agent Skill 운영에도 적용할 수 있다. 여기에 사용자 평가와 테스트 fixture를 추가하면 더 안정적인 Skill lifecycle을 만들 수 있다.

### 5. Verify-gated Agent Self Improvement

자기수정 자체보다 중요한 것은 **수정 → 자동검증 → 반영/롤백** 구조다. 에이전트가 자신의 prompt, skill, automation script 등을 개선하도록 할 때 동일한 gate 패턴을 적용할 수 있다.

### 6. 운영 안전성 강화 아이디어

실제 업무 환경에 적용한다면 Hermes 기본 security level 외에 다음을 추가하는 것이 좋다.

- command allowlist/denylist
- workspace별 filesystem sandbox
- destructive operation 별도 승인
- credential 분리
- 외부 입력 기반 tool 실행 전 prompt-injection 검사
- audit log와 실행 비용/토큰 budget

## 참고 링크

- GitHub: https://github.com/sypsyp97/claude-hermes
- Upstream ClaudeClaw: https://github.com/moazbuilds/claudeclaw
- Multi-session 문서: https://github.com/sypsyp97/claude-hermes/blob/main/docs/MULTI_SESSION.md
- Letta: https://github.com/letta-ai/letta
- Voyager: https://github.com/MineDojo/Voyager
- Generative Agents: https://arxiv.org/abs/2304.03442
