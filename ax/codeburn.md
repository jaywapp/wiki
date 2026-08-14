# CodeBurn

> AI 코딩 도구의 토큰·비용·생산성을 로컬 세션 로그 기반으로 분석하는 오픈소스 도구

- Repository: https://github.com/getagentseal/codeburn
- 대상: Claude Code, Codex, Cursor 등 다양한 AI 코딩 에이전트/도구
- 특징: 별도 프록시나 API Key 없이 각 도구가 남긴 로컬 세션 파일을 읽어 분석

## 핵심 기능

| 기능 | 설명 |
|---|---|
| Usage | 도구 / 모델 / 프로젝트 / 작업별 토큰 및 비용 분석 |
| Optimize | 낭비되는 토큰 패턴을 찾아 절감안 제시 |
| Compare | 모델별 one-shot, retry, cost/edit 등의 효율 비교 |
| Yield | AI 사용 비용이 실제 Git commit/merge 결과로 이어졌는지 추정 |
| Guard | Claude Code 세션 비용에 soft/hard cap 적용 |
| Context | Claude/Codex의 context window가 무엇으로 채워지는지 분석 |
| MCP | Claude/Cursor 등에서 CodeBurn 분석 결과를 자연어로 질의 |
| Web UI | localhost 기반 대시보드 제공 |
| Multi-device | LAN 내 여러 PC의 사용량을 통합 분석 |

## Optimize

`codeburn optimize`는 단순 사용량 집계보다 한 단계 더 나아가 토큰 낭비 원인을 찾는 기능이다.

대표적으로 다음을 탐지한다.

- 반복적으로 다시 읽는 파일
- 불필요하게 큰 Bash 출력
- 사용하지 않는 MCP 서버
- 호출되지 않는 Agent / Skill / Slash Command
- 비대한 `CLAUDE.md`
- context가 과도하게 커진 세션

일부 설정은 `--apply`로 자동 적용할 수 있고 undo도 지원한다.

## 모델 비교

`codeburn compare`를 사용하면 AI 모델을 단순 비용이 아니라 실제 작업 효율 관점에서 비교할 수 있다.

주요 지표 예시:

- one-shot rate
- retry rate
- self-correction
- cost/call
- cost/edit
- cache hit rate

장기간 데이터를 쌓으면 다음과 같은 판단에 활용할 수 있다.

- 설계 작업에서는 고성능 모델이 비용 대비 효과가 있는가?
- 단순 구현에서는 더 저렴한 모델로 충분한가?
- 특정 모델이 리팩터링이나 수정 작업에서 retry가 적은가?
- 프로젝트별로 어떤 모델의 cost/edit가 가장 좋은가?

즉 CodeBurn은 단순 토큰 모니터링보다 **AI 개발 생산성 측정 및 모델 선택 최적화 도구**에 가깝다.

## 기본 사용법

```bash
# 설치 없이 실행
npx codeburn

# 전역 설치
npm install -g codeburn

# 브라우저 대시보드
codeburn web

# 최근 사용 패턴의 낭비 분석
codeburn optimize

# 모델 비교
codeburn compare

# Git 결과물과 비용 연결 분석
codeburn yield

# 모델별 비용
codeburn models --by-task
```

## MCP 연동

Claude Code에 CodeBurn MCP를 추가할 수 있다.

```bash
claude mcp add codeburn -- npx -y codeburn mcp
```

이후 Claude에서 사용량이나 절감 가능성을 자연어로 질의할 수 있다.

주요 MCP 기능:

- `get_usage`
- `get_savings`

프로젝트명은 기본적으로 pseudonymize된다.

## 주의사항

### 비용은 실제 구독료와 다를 수 있음

비용은 API 가격 기준으로 환산되는 경우가 있으므로 Claude Pro/Max, Cursor Pro 등의 실제 체감 비용과 일치하지 않을 수 있다.

구독 플랜을 설정할 수는 있지만, 각 소비자 플랜의 정확한 내부 토큰 allowance가 공개되어 있지 않기 때문에 완벽한 사용 한도 모델링은 어렵다.

### Yield는 휴리스틱

`codeburn yield`는 Git commit 시점과 AI 세션 시간을 매칭해 결과물을 추정한다.

따라서 "특정 AI 세션이 이 코드를 만들었다"는 엄밀한 인과관계 분석이 아니라 생산성 분석을 위한 근사치로 보는 것이 좋다.

### Windows

macOS 메뉴바 앱과 같은 상시 UI 대신 Windows에서는 `codeburn web` 기반 대시보드를 사용하는 방향이 적합하다.

## 활용 포인트

Claude Code와 Codex를 함께 사용하는 환경에서 특히 유용하다.

기존에는 다음 항목을 경험적으로 판단하는 경우가 많다.

- 어떤 모델이 어떤 종류의 작업에 적합한가?
- 고성능 모델을 쓸 가치가 있는 작업은 무엇인가?
- Agent / Skill / MCP를 너무 많이 로딩하고 있지는 않은가?
- `CLAUDE.md`나 컨텍스트가 비대해져 토큰을 낭비하고 있지는 않은가?

CodeBurn을 사용하면 이러한 판단을 실제 세션 데이터를 기반으로 수행할 수 있다.

### 추천 도입 순서

1. `npx codeburn`으로 기존 Claude/Codex 세션 로그 인식 여부 확인
2. `codeburn web`으로 전체 사용 패턴 파악
3. `codeburn optimize`로 토큰 낭비 요소 탐색
4. `codeburn compare`로 모델별 효율 비교
5. 데이터가 충분히 쌓이면 모델 선택 및 Agent/Skill/MCP 구성 정책에 반영

## 한 줄 평가

> **Claude Code·Codex 등의 AI 코딩 환경을 감이 아니라 실제 토큰·비용·성과 데이터로 최적화하기 위한 관측 도구.**
