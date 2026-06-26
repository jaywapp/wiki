# Claude + Codex 토큰 최적화 워크플로우 설계

> Claude(Claude Code)와 Codex(Codex CLI)를 함께 쓰는 개발자가 토큰 사용량을 체계적으로 줄이기 위한 원리·전략·도구·SOP 정리.
> 작성: 2026-06-26. 가격·캐싱 수치는 Anthropic 공식 기준, 오픈소스 도구 절감률은 각 프로젝트의 자체 주장(벤더 클레임)이므로 워크로드별 실측 권장.

---

## 0. TL;DR (한 줄 요약)

1. **모델 티어를 작업에 맞춰라** — 설계·디버깅은 상위, 반복 구현은 하위 모델.
2. **컨텍스트를 작게 유지하라** — 프롬프트 캐시를 깨지 않는 안정적 프리픽스 + 주기적 압축/초기화.
3. **명령어 출력 노이즈를 잘라라** — git/npm/build 로그가 토큰의 최대 소비처. 프록시/훅으로 압축.
4. **측정 없이는 최적화 없다** — `tokscale` 등으로 세션별 토큰을 계측하고 비싼 프롬프트를 찾아라.
5. **Claude↔Codex 역할을 나눠라** — 한 도구가 만든 diff는 다른 도구가 리뷰(교차 검증), 전환은 작업 경계에서만.

---

## 1. 토큰이 소비되는 근본 원리

코딩 에이전트의 토큰 비용을 이해하면 어디를 줄여야 할지 보인다.

### 1.1 입력 토큰 누적이 진짜 비용

LLM API는 **stateless**다. 매 턴마다 전체 대화 히스토리(시스템 프롬프트 + 도구 정의 + 이전 메시지 전부)를 다시 보낸다. 따라서:

- 대화가 길어질수록 **매 요청의 입력 토큰이 선형 증가**한다.
- 50턴짜리 세션은 50번째 요청 한 번에 앞의 49턴을 전부 재전송한다.
- 출력보다 **입력 누적이 총비용을 지배**하는 경우가 많다(특히 긴 에이전트 루프).

### 1.2 가격 구조 (Anthropic 기준, per 1M tokens)

| 모델 | 입력 | 출력 | 용도 |
|------|------|------|------|
| Claude Opus 4.8 | $5 | $25 | 설계·복잡 디버깅·리뷰 |
| Claude Sonnet 4.6 | $3 | $15 | 균형(대량 구현) |
| Claude Haiku 4.5 | $1 | $5 | 단순·속도 중심 |
| Claude Fable 5 | $10 | $50 | 최난도 장기 에이전트 작업 |

- **출력이 입력의 5배** 가격 → 출력 verbosity 억제가 효과적.
- **캐시 읽기는 입력의 0.1배** → 캐시 적중이 가장 큰 레버.

### 1.3 프롬프트 캐싱의 메커니즘 (가장 중요한 레버)

캐싱은 **prefix match**다. 렌더 순서는 `tools → system → messages`.

- 프리픽스의 **단 1바이트라도 바뀌면 그 이후 전부 캐시 무효화**.
- 캐시 쓰기 비용: 5분 TTL = 1.25배, 1시간 TTL = 2배.
- 캐시 읽기 비용: 0.1배 (최대 90% 절감).
- **5분 TTL**가 기본 — 연속 작업 중에는 따뜻하게 유지되지만, 5분 이상 멈추면 식는다.
- 손익분기: 5분 TTL 기준 **요청 2회**면 이득.

**캐시를 조용히 깨는 안티패턴(silent invalidator):**
- 시스템 프롬프트에 `현재 시각`, UUID, 요청 ID 삽입
- 도구 목록을 세션 중간에 추가/제거/재정렬 (위치 0이라 전체 무효화)
- 세션 중간 모델 전환 (캐시는 모델 스코프)
- 비결정적 JSON 직렬화(키 정렬 안 함)

→ **검증법**: 응답의 `cache_read_input_tokens`가 반복 요청에서 0이면 invalidator가 있다.

### 1.4 코딩 에이전트에서 토큰을 가장 많이 먹는 곳

실측 보고들이 공통적으로 지목하는 소비처(큰 순):
1. **명령어 출력** — `npm install`, `git status/diff`, 빌드/테스트 로그 (수천 토큰을 컨텍스트에 그대로 투입)
2. **대용량 파일 전체 읽기** — 필요 없는 부분까지
3. **MCP 도구 응답** — 장황한 JSON 덤프
4. **누적된 대화 히스토리** — 압축/초기화 안 함
5. **출력 verbosity** — 장황한 설명·서문

---

## 2. Claude Code vs Codex 도구 특성 비교

| 항목 | Claude Code | Codex CLI |
|------|-------------|-----------|
| 컨텍스트 압축 | `/compact`, 서버측 compaction(beta), context editing | 자동 컨텍스트 관리 |
| 캐싱 | Anthropic 프롬프트 캐싱(5분/1시간 TTL, prefix) | OpenAI 자동 프롬프트 캐싱(prefix, 자동 할인) |
| 추론 깊이 제어 | `effort`(low/medium/high/xhigh/max) | reasoning effort(minimal/low/medium/high) |
| 서브에이전트 | Task/subagent, 모델별 위임 | (제한적) |
| 모델 티어 | Opus/Sonnet/Haiku/Fable | GPT-5.x 계열 |
| 프로젝트 메모리 | `CLAUDE.md` | `AGENTS.md` |
| 배치 할인 | Batch API 50% | — |

> 핵심 공통점: **둘 다 프리픽스 캐싱을 쓰므로 "안정적인 프리픽스 + 변동은 뒤로" 원칙이 동일하게 적용된다.**

---

## 3. 핵심 전략 (네이티브 기능)

### 3.1 모델 티어 선택 (역할 분담)

워크스페이스 공통 규칙(`ai-roles.md`)과 일치:

- **상위 모델(Opus/Fable, GPT-5 high)**: 아키텍처 설계, 복잡한 디버깅, 코드 리뷰, 모호성 해소
- **하위 모델(Sonnet/Haiku, GPT-5 low/minimal)**: 확정된 스펙 구현, 보일러플레이트, 반복 작업
- **서브에이전트는 저가 모델로**: 탐색·검색 서브에이전트는 Haiku로 (Claude Code의 Explore 패턴)

비용 환산: Opus로 할 일을 Haiku로 옮기면 입력 5배·출력 5배 절감.

### 3.2 effort / reasoning 조정

- 단순 작업·서브에이전트: `effort: low` (도구 호출 통합, 서문 최소화, 짧은 확인)
- 대부분의 작업: `high`가 품질/토큰의 스위트스폿
- 정답이 비용보다 중요할 때만: `max`
- Codex도 동일 — 기계적 작업은 minimal/low로 추론 토큰 절약.

### 3.3 컨텍스트 관리

- **세션을 작업 단위로 분할** — 무관한 작업은 새 세션(`/clear`)으로. 긴 단일 세션은 매 턴 비용 폭증.
- **주기적 압축** — Claude `/compact`, 서버측 compaction(beta), context editing(오래된 tool result/thinking 제거).
- **`CLAUDE.md`/`AGENTS.md`를 간결하게** — 매 요청 프리픽스에 들어가므로 비대하면 모든 요청이 비싸진다. (관련: [[claude-md-optimization]])
- **대용량 파일은 부분 읽기** — 필요한 라인 범위만.

### 3.4 프롬프트 캐싱 최적화

- 시스템 프롬프트를 **동결**(timestamp/세션ID 삽입 금지).
- 도구 목록을 **결정적으로** 정렬, 세션 중 변경 금지.
- 변동 컨텍스트(질문, 타임스탬프)는 **마지막 breakpoint 뒤로**.
- 동일 프리픽스 대량 요청은 1건 먼저 보내 캐시를 데운 뒤 나머지 병렬 발사.

### 3.5 작업 분해·위임·병렬화

- 독립 작업은 서브에이전트로 분산 → 메인 루프 컨텍스트를 작게 유지.
- 대량 비실시간 작업은 **Batch API(50% 할인)**.
- 중간 결과가 큰 다단계 작업은 programmatic tool calling으로 컨텍스트 오염 차단.

### 3.6 출력 verbosity 억제

- 시스템 프롬프트/`CLAUDE.md`에 "서문 없이 직접 응답, 불필요한 요약 생략" 명시.
- 출력 토큰은 입력의 5배 가격이라 효과가 즉각적.

---

## 4. 오픈소스 도구 활용

> 절감률은 각 프로젝트 자체 주장이므로 자신의 워크로드로 실측할 것. 대부분 **명령어 출력 압축**과 **컨텍스트 압축** 두 갈래.

### 4.1 명령어 출력 압축 (가장 효과 큰 범주)

**RTK (Rust Token Killer)** — `github.com/rtk-ai/rtk`
- Rust 단일 바이너리, 무설정 CLI 프록시. git/npm/cargo/ls/cat 등 100+ 명령어 출력을 LLM에 닿기 전 압축.
- Claude Code에는 **PreToolUse 훅**으로 Bash 명령을 압축 등가물로 재작성.
- 주장: 공통 dev 명령 **60–90% 절감**, 명령당 <10ms 오버헤드. 예: `git status` 2,000→200 토큰, 30분 세션 118k→23.9k.
- 의존성 제로, Claude Code/Cursor/Copilot 호환.

### 4.2 컨텍스트 압축 프록시

**Headroom** — `extraheadroom.com`, `github.com/gglucass/headroom-desktop`
- 로컬 프록시: 클라이언트↔API 사이에서 로그·보일러플레이트·반복 컨텍스트를 **가역 압축**(원본 필요 시 복원 가능), 동적 콘텐츠 안정화로 캐시 적중률 개선.
- macOS 메뉴바 앱. 내부적으로 `rtk`(bash 압축) + `headroom` 라이브러리 + `markitdown` 번들.
- **데스크톱 셸은 MIT 오픈소스**, 계정/유료 기능은 프로프라이어터리.
- Claude Code + Codex 모두 지원. 주장: ~50% 절감(플랜 2배 활용), 멀티툴 에이전트 76.3% 압축에 정확도 유지.
- 모든 최적화가 **로컬 실행** → 프롬프트·코드가 기기를 벗어나지 않음(보안 규칙 부합).

**token-optimizer** — `github.com/alexgreensh/token-optimizer`
- 명령어 출력 압축 + 비대한 config·미사용 skill·낡은 메모리·compaction 손실·모델 미스라우팅 등 "나머지 75%"를 함께 다룸.
- 자동 압축, 체크포인트, 품질 스코어링, 대시보드. Claude Code/OpenCode/Codex/Copilot(beta) 지원.

> **성능·동시성 주의 (RTK vs Headroom)**
> - **Headroom은 로컬 프록시** — 원격/공유 서버가 아니다. 프롬프트는 기기 밖으로 나가지 않으며, "세션을 많이 써도 중앙 서버 부하"는 발생하지 않는다. 대신 **부하 대상은 본인 PC**다. 요청당 지연 중앙값 ~52ms, 단일 프록시 프로세스 + ~2GB 런타임이 상주하므로 **세션을 동시에 많이 띄우면 로컬 CPU/메모리 경합·병목**이 생길 수 있다(동시성 한계는 공식 미명시).
> - **RTK는 PreToolUse 훅** — 상주 프로세스 없이 명령 1회 재작성(<10ms)이라 다중·동시 세션에 로컬 부담이 거의 없다.
> - → **다중 동시 세션은 RTK, 강력 압축이 필요한 단일/소수 세션은 Headroom.** (프리셋: lean=RTK, balanced/max=Headroom 이 이 점과도 일치)
> - RTK/Headroom을 켜고 끄고 상태 확인하는 런처: [ccsw/cc-compress.ps1](ccsw/README.md)

### 4.3 컨텍스트 정밀 선택

**code-review-graph** — Tree-sitter로 레포를 AST 파싱, 리뷰/작업에 **실제로 필요한 최소 파일 집합**만 계산. MCP 설정. 주장: 코드리뷰 6.8배, 일상 작업 최대 49배 토큰 절감.

**context-mode** — 도구 출력을 대화에 덤프하지 않고 **샌드박스 지식베이스로 라우팅**. MCP 관련 토큰 50–90% 절감.

### 4.4 출력 압축

**caveman** — Claude Code skill. 기술적 내용은 보존하되 관사·인사말 등 필러 제거로 출력 ~75% 감소.

### 4.5 측정·모니터링 (최적화의 전제)

**tokscale** — `github.com/junhoyeo/tokscale`. Claude Code/Codex/Gemini/Cursor/OpenCode 등 다중 도구의 토큰 사용량 추적 CLI(+리더보드/기여 그래프).

**claude-usage / claude-usage-monitor** — JSONL 로그 기반 로컬 대시보드 / 터미널 실시간 burn-rate 모니터.

> Claude Code 자체 기능: `/code-review`의 세션 리포트, `session-report` 스킬로 토큰·캐시·서브에이전트·비싼 프롬프트 분석 가능.

### 4.6 설정 템플릿

**claude-token-efficient**, **nadimtuhin/claude-token-optimizer** — 응답을 terse하게 만들고 문서를 최적화하는 드롭인 `CLAUDE.md`/셋업 프롬프트.

### 도구 선택 가이드

| 문제 | 추천 도구 |
|------|-----------|
| 빌드/git/npm 로그가 컨텍스트를 폭파 | RTK |
| 전반적 컨텍스트 압축 + 캐시 안정화 | Headroom |
| MCP 응답이 비대 | context-mode |
| 코드리뷰/대규모 레포에서 파일 과다 로드 | code-review-graph |
| 출력이 장황 | caveman |
| 어디서 새는지 모름 | tokscale → 계측 먼저 |

---

## 5. 통합 워크플로우 설계 (Claude + Codex 병행)

### 5.1 기본 셋업 (한 번)

1. **계측 도입**: `tokscale` 설치 → 베이스라인 측정.
2. **명령어 출력 압축**: RTK 또는 Headroom 설치(Claude Code + Codex 공통 프록시).
3. **프로젝트 메모리 정리**: `CLAUDE.md`/`AGENTS.md`를 간결하게 — 두 파일 동등하게 유지.
4. **출력 규칙**: terse 응답 규칙을 메모리에 명시.

### 5.2 작업 사이클 (역할 분담)

```
[설계/계획]  ──→  Claude 상위 모델 (Opus/Fable)
     │ 계획 확정(작업 경계)
     ▼
[구현]      ──→  Codex 또는 Claude 하위 모델 (확정 스펙 구현)
     │ 구현 완료(작업 경계)
     ▼
[교차 리뷰]  ──→  반대편 도구로 diff 리뷰 (Claude diff는 Codex가, 반대도)
     │
     ▼
[검증/커밋]
```

원칙(`ai-roles.md`):
- **도구 전환은 작업 경계에서만** — 작업 중간 전환은 컨텍스트 재구축 비용(=토큰)이 크다.
- **교차 리뷰**로 품질 확보하되, 같은 컨텍스트를 양쪽에 중복 적재하지 말 것(diff만 전달).

### 5.3 세션 위생(hygiene)

- 작업 1개 = 세션 1개. 끝나면 `/clear`.
- 긴 작업은 중간에 `/compact`.
- 5분 이상 휴식 후 재개 시 캐시는 식었다고 가정(필요 시 1시간 TTL 고려).
- 무관한 탐색은 서브에이전트(저가 모델)에 위임.

---

## 6. 체크리스트

**셋업 (1회)**
- [ ] `tokscale`로 베이스라인 측정
- [ ] RTK/Headroom 등 명령어·컨텍스트 압축 프록시 설치
- [ ] `CLAUDE.md`/`AGENTS.md` 간결화 + terse 출력 규칙
- [ ] 모델 티어 정책 합의(설계=상위, 구현=하위)

**작업 중 (매번)**
- [ ] 작업에 맞는 모델/effort 선택
- [ ] 작업 단위로 세션 분리, 끝나면 `/clear`
- [ ] 대용량 파일은 부분 읽기
- [ ] 도구 목록·시스템 프롬프트 동결(캐시 유지)
- [ ] 대량 비실시간 작업은 Batch API

**점검 (주기적)**
- [ ] `cache_read_input_tokens`로 캐시 적중 확인
- [ ] tokscale/대시보드로 비싼 프롬프트 식별
- [ ] 압축 도구 절감률 실측 재확인

---

## 7. 안티패턴

- 모든 작업을 최상위 모델로 처리 (Haiku로 충분한 일을 Opus로)
- 하나의 거대 세션에서 무관한 작업을 계속 (히스토리 누적)
- 빌드/테스트 로그를 압축 없이 그대로 컨텍스트에 투입
- 시스템 프롬프트에 timestamp/UUID 삽입 (캐시 전멸)
- 세션 중간 모델·도구 목록 변경 (캐시 무효화)
- 작업 중간에 Claude↔Codex 전환 (컨텍스트 재구축)
- 측정 없이 감으로 최적화

---

## 8. 효율적 환경 구축안 + 스위처 (ccsw)

위 전략을 실제로 굴리려면 "프로파일"로 묶어 한 번에 적용/전환하는 게 효율적이다. 권장 프리셋 3종:

| 프로파일 | 대상 | Claude | Codex effort | 압축 | 권장 effort |
|----------|------|--------|--------------|------|-------------|
| **lean** | 일상·단순·반복 | Sonnet 4.6 (+탐색 Haiku) | low | RTK 훅 | low–medium |
| **balanced** | 기본 데일리 | Opus 4.8(설계)/Codex·Sonnet(구현) | high | Headroom | high |
| **max** | 최난도·장기 에이전트 | Opus 4.8(필요시 Fable 5) | high | Headroom | xhigh–max |

**인프라 선택**: 어느 단일 기존 도구도 (Claude 모델 + Codex config + 압축 레이어)를 함께 토글하지 못한다.
- Headroom 단독 → 압축·캐시 안정화만, 모델/Codex 라우팅 스위칭 불가
- mise/direnv + dotfiles → env/버전 관리엔 좋지만 Claude/Codex/압축을 묶어주진 않음
- **권장: `ccsw`(경량 스위처)로 오케스트레이션 + 압축은 RTK/Headroom에 위임**

`ccsw` (레퍼런스 구현 포함, [ai-workflow/ccsw](ccsw/README.md))는 `ccsw use <profile>` 한 번에:
모델 설정(`settings.json` 병합·백업) → Codex `config.toml` 관리 키 갱신 → env 변수 전환 → 압축 레이어 토글(RTK install/uninstall, Headroom 안내) → 활성 상태 기록.
프로파일은 JSON으로 버전관리(`profiles/*.json`)되어 팀 표준화/A-B가 쉽다.

```powershell
ccsw list            # balanced, lean, max
ccsw use balanced    # 한 번에 전환
ccsw status          # 활성 프로파일 확인
```

---

## 참고 링크

- [Headroom](https://extraheadroom.com/) / [headroom-desktop (MIT)](https://github.com/gglucass/headroom-desktop)
- [RTK — Rust Token Killer](https://github.com/rtk-ai/rtk)
- [token-optimizer](https://github.com/alexgreensh/token-optimizer)
- [tokscale](https://github.com/junhoyeo/tokscale)
- [12 Ways to Cut Token Consumption in Claude Code (Firecrawl)](https://www.firecrawl.dev/blog/claude-code-token-efficiency)
- [6 free GitHub repos that cut your Claude Code token bill (DeployHQ)](https://www.deployhq.com/blog/free-github-repos-for-claude-code)
- Anthropic 프롬프트 캐싱·모델 가격: 공식 문서(`platform.claude.com`)
