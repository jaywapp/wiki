# CodeBurn vs ccusage

AI 코딩 에이전트 사용량 분석 도구인 **CodeBurn**과 **ccusage**의 차이를 정리한다.

## 한 줄 요약

- **ccusage**: "얼마나 썼나?"를 빠르고 정확하게 확인하는 사용량 계기판
- **CodeBurn**: "왜 많이 썼고, 무엇을 바꾸면 효율이 좋아지는가?"까지 분석하는 최적화 도구

CodeBurn은 ccusage에서 영감을 받은 프로젝트이지만, 단순 사용량 집계를 넘어 모델 비교·낭비 탐지·컨텍스트 분석·Git 결과물 대비 비용 분석까지 확장되어 있다.

## 기능 비교

| 항목 | ccusage | CodeBurn |
|---|---|---|
| 핵심 목적 | 토큰/비용 집계 | 비용 + 생산성/효율 분석 |
| Claude Code | ✅ | ✅ |
| Codex | ✅ | ✅ |
| 기타 Agent CLI | ✅ 다수 | ✅ 다수 |
| 일/주/월별 사용량 | ✅ 매우 강함 | ✅ |
| Session별 사용량 | ✅ | ✅ |
| 프로젝트별 분석 | ✅ | ✅ |
| 모델별 비용 | ✅ | ✅ |
| Cache token | ✅ | ✅ |
| JSON 출력 | ✅ | ✅ |
| Claude 5시간 block 확인 | ✅ 특화 | 상대적으로 비중 낮음 |
| Claude Status Line | ✅ | 핵심 기능 아님 |
| 실시간 burn rate | ✅ Statusline | 대시보드 중심 |
| Task 종류 자동 분류 | ❌ | ✅ |
| One-shot 성공률 | ❌ | ✅ |
| Retry 분석 | ❌ | ✅ |
| 모델 A/B 비교 | 기본 비용 비교 | ✅ `compare` |
| MCP 사용량 분석 | ❌ | ✅ |
| Skill/Agent 분석 | ❌ | ✅ |
| Bash/Tool 사용 분석 | ❌ | ✅ |
| 토큰 낭비 탐지 | ❌ | ✅ `optimize` |
| CLAUDE.md 비대화 분석 | ❌ | ✅ |
| Context 구성 분석 | ❌ | ✅ `context` |
| Git 결과물 대비 비용 | ❌ | ✅ `yield` |
| UI 성격 | CLI 표 중심 | TUI/Web/대시보드 중심 |

## ccusage

ccusage의 강점은 **로컬 AI 코딩 도구 로그를 읽어 사용량과 비용을 빠르게 보여주는 것**이다.

Claude Code, Codex, OpenCode, Amp, Droid, Kimi, Qwen, Copilot CLI, Gemini CLI 등 여러 도구의 로그를 읽어 daily / weekly / monthly / session 단위로 토큰과 추정 비용을 보여준다.

### 기본 사용

```bash
npx ccusage@latest

npx ccusage@latest daily
npx ccusage@latest weekly
npx ccusage@latest monthly
npx ccusage@latest session

npx ccusage@latest claude daily
npx ccusage@latest codex daily
```

### Claude Code Status Line

Claude Code를 주력으로 사용한다면 Status Line 기능이 특히 유용하다.

```bash
npx ccusage@latest blocks
npx ccusage@latest statusline
```

작업 중 다음과 같은 정보를 바로 확인할 수 있다.

- 현재 세션 비용
- 오늘 누적 비용
- 현재 모델
- Burn rate
- Context 사용량
- Claude 5시간 block 정보

즉 ccusage는 **현재 얼마나 사용하고 있는지를 실시간으로 확인하는 용도**에 강하다.

과거 `blocks --live`는 Anthropic의 실제 usage limit과 정확히 맞지 않는 문제로 deprecated 방향으로 정리되었으며, 현재는 `blocks`와 `statusline` 중심으로 사용하는 편이 적절하다.

## CodeBurn

CodeBurn은 단순 사용량 집계보다 **AI 개발 워크플로의 비효율을 찾는 것**에 초점이 있다.

### Optimize

```bash
codeburn optimize
```

다음과 같은 낭비 패턴을 찾아낸다.

- 동일 파일 반복 읽기
- 과도한 Bash 출력
- 사용하지 않는 MCP 서버
- 사용되지 않는 Agent / Skill / Slash Command
- 과도하게 큰 `CLAUDE.md`
- Context-heavy session
- Context 대비 지나치게 낮은 output 비율

단순히 "토큰을 많이 사용했다"에서 끝나는 것이 아니라 **어디에서 낭비가 발생하는지와 예상 절감량**을 보여주는 것이 핵심이다.

### 모델 비교

```bash
codeburn compare
```

모델 간 단순 비용 비교뿐 아니라 다음 항목을 비교할 수 있다.

- One-shot rate
- Retry rate
- Self-correction
- Cost / call
- Cost / edit
- Output tokens / call
- Cache hit rate
- Task category별 성공률
- Delegation rate
- Planning rate

이를 통해 예를 들어 "호출당 비용은 A 모델이 싸지만 retry까지 포함하면 B 모델의 실제 작업 비용이 더 낮다" 같은 판단이 가능하다.

### Context 분석

```bash
codeburn context
```

Claude Code와 Codex 세션의 Context Window를 분석해 어떤 요소가 공간을 차지하는지 확인할 수 있다.

예:

```text
CLAUDE.md       8%
Tool schemas   17%
MCP schemas    12%
Messages       25%
Tool results   19%
...
```

Agent, Skill, MCP를 많이 사용하는 환경에서 특히 가치가 높다.

### Yield

```bash
codeburn yield
```

AI 세션 비용이 실제 Git commit / merge 같은 결과물로 얼마나 이어졌는지 분석한다.

Git 시점과 AI 세션을 매칭하는 heuristic이므로 완전한 인과관계를 의미하지는 않지만, 장기적으로 AI 개발 비용 대비 산출물을 보는 지표로 활용할 수 있다.

## 추천 운영 방식

둘 중 하나만 선택하기보다 역할을 나누면 좋다.

```text
Claude Code / Codex 작업 중
        │
        ▼
ccusage
- 현재 토큰
- 비용
- burn rate
- context
- Claude Status Line
        │
        ▼
일/주 단위 작업 종료 후
        │
        ▼
CodeBurn
- 토큰 낭비 분석
- Retry / One-shot 분석
- 모델 비교
- MCP / Skill / Tool 분석
- Context 구성 분석
- 생산성 대비 비용 분석
```

즉,

> **ccusage = 계기판**  
> **CodeBurn = 정비소 + 블랙박스 분석기**

으로 보는 것이 가장 이해하기 쉽다.

## 하나만 선택한다면

AI 코딩 도구를 단순히 모니터링하는 것이 목적이라면 **ccusage**가 더 간단하고 직관적이다.

하지만 Claude Code와 Codex를 병행하면서 다음과 같은 질문에 답하고 싶다면 **CodeBurn**이 더 적합하다.

- 어떤 모델이 실제로 더 효율적인가?
- 왜 Context가 빨리 차는가?
- Retry가 어디에서 발생하는가?
- MCP / Skill / CLAUDE.md가 얼마나 토큰을 소비하는가?
- 어떤 작업에는 어떤 모델을 사용해야 하는가?

특히 여러 Agent·Skill·MCP를 적극적으로 사용하는 환경에서는 CodeBurn의 `optimize`, `compare`, `context` 기능의 가치가 크다.

## 관련 링크

- CodeBurn: https://github.com/getagentseal/codeburn
- ccusage: https://github.com/ccusage/ccusage
