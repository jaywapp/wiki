---
title: im-not-ai (Humanize KR)
category: skills
tags:
  - ai
  - agent-skill
  - korean
  - writing
  - claude-code
  - codex
  - gemini
source: https://github.com/epoko77-ai/im-not-ai
updated: 2026-09-09
---

# im-not-ai (Humanize KR)

> AI가 생성한 한국어에서 번역투·기계적 구조·상투 표현 같은 'AI 티'를 패턴 기반으로 찾아, 사실과 주장 자체는 보존하면서 문체만 자연스러운 한국어로 재작성하는 에이전트 Skill/파이프라인.

## 프로젝트 개요

`im-not-ai`의 핵심은 범용적인 "문장을 예쁘게 고쳐주는 프롬프트"가 아니라 한국어 LLM 출력에 반복되는 구조적 특징을 taxonomy와 rewriting rule로 명시하고, 이를 Claude Code·GitHub Copilot CLI·OpenAI Codex CLI·Gemini CLI에서 재사용 가능한 Skill로 제공하는 것이다.

README 기준으로 번역투, 영어식 과잉 설명, 기계적 병렬 구조, AI 상투어, 문장 리듬 균일화, 수식어 중복, 과도한 hedging, 접속사 남발, 의존명사/형식명사 남용, 시각적 장식 등을 10개 범주와 70여 개 세부 패턴으로 관리한다.

조사 기준: 2026-09-09, `main` 최근 커밋 `9747f036cdc28a1a8aea4dc71fef1f7846eb96f7`. 최신 GitHub Release는 v2.3.2(2026-08-18)이지만 main에는 이후 규칙 개선이 추가되어 있다.

## 해결하려는 문제

LLM에게 단순히 "자연스러운 한국어로 써줘"라고 요청해도 영어식 문장 구조가 한국어 어미만 입은 형태, `~를 통해`, `~에 있어서`, 과도한 피동, `첫째/둘째/셋째`, `결론적으로`, `시사하는 바가 크다` 같은 구조가 반복될 수 있다.

이 프로젝트는 이 문제를 단순 취향이 아니라 탐지 가능한 패턴으로 분해한다. 중요한 차이는 **AI가 썼는지를 판정하는 detector가 아니라, 한국어 품질을 떨어뜨리는 특정 span을 찾아 고치는 post-editing 시스템**이라는 점이다.

## 핵심 기능

1. **한국어 전용 AI-tell taxonomy**
   - 번역투, 피동, 대명사, 구조적 병렬, 상투 표현, hedging, 접속사, 리듬 등을 규칙화한다.
   - 규칙은 severity와 처방을 가지며, 최근 main에서도 A-16/A-22/A-23/A-24 같은 패턴이 실측 결과에 따라 계속 수정되고 있다.

2. **의미 보존 우선**
   - 사실, 주장, 숫자, 날짜, 고유명사, 직접 인용은 보존 대상으로 취급한다.
   - 탐지된 부분만 수정하는 span-grounded editing을 지향한다.

3. **변경률 안전장치**
   - 변경률이 30%를 넘으면 경고하고 50%를 넘으면 중단하는 정책을 둔다.
   - 과도한 humanizing이 원문 의미나 register를 훼손하는 것을 막기 위한 장치다.

4. **입력 난이도에 따른 라우팅**
   - deterministic pre-score가 `route_hint`를 계산한다.
   - light: 1 LLM call
   - standard: diagnose → targeted rewrite, 2 calls
   - heavy: diagnose → rewrite → finalize, 3+ calls
   - 장문은 필요할 때만 chunking하며 single-call-first를 지향한다.

5. **다중 Agent/CLI 지원**
   - Claude Code: 플러그인/Skill + 다중 호출 정밀 경로
   - Codex CLI / GitHub Copilot CLI: single-call 경로
   - Gemini CLI: extension 형태

6. **결정적 검증 스크립트**
   - `prepare_monolith_input.py`, `verify_change_rate.py`, metrics/eval 계열 스크립트 등으로 LLM 판단만 사용하지 않고 정량 게이트를 보조한다.

## 아키텍처

```text
Korean input
    |
    v
prepare_monolith_input.py
- sanitize / metrics
- deterministic pre-score
- route_hint
    |
    +--> light ------------------------------+
    |     monolith x1                        |
    |                                        |
    +--> standard                            |
    |     diagnostician -> targeted rewrite  |
    |                                        |
    +--> heavy                               |
          diagnostician -> rewrite           |
          -> finalizer                       |
                                             v
                                         final.md
                                             |
                                             v
                                   deterministic gates
                                   / change-rate verify
```

### 주요 구성 요소

- `skills/humanize-korean/SKILL.md`: 오케스트레이션 계약
- `skills/humanize-korean/references/`: taxonomy, rewriting playbook, scholarship, metrics 관련 지식
- `agents/`: diagnostician, monolith, finalizer 및 규칙/품질 분석 역할
- `scripts/`: pre-score, calibration, diagnosis rule 생성, 검증, 평가, 복원 로직
- `codex/`: Codex CLI용 단일 호출 포팅
- `commands/`, `GEMINI.md`: Gemini/command interface

## Token / Cost 관점

이 프로젝트에서 특히 참고할 만한 부분은 **규칙 파일을 작게 만드는 것만이 토큰 최적화가 아니라는 점**이다.

README가 제시하는 측정에서는 10,000자 문서를 7개 chunk call로 처리했을 때 약 610K tokens, 같은 문서를 single call로 처리했을 때 약 134K tokens가 사용되었다고 설명한다. 핵심 원인은 chunk마다 rulebook/context를 반복 로드하는 비용이다.

따라서 전략은 다음과 같다.

- 먼저 deterministic shim으로 작업 난이도를 판단한다.
- 잘 쓴 글은 1 call로 끝낸다.
- 진단이 필요한 경우에만 추가 agent call을 사용한다.
- context window가 허용하면 chunking보다 monolithic call을 우선한다.
- 큰 reference 문서를 매 호출마다 재주입하지 않는다.

이 구조는 대형 Skill 파일 최적화에도 참고 가치가 높다. **Skill 자체를 무조건 축약하기보다, cheap deterministic routing + progressive disclosure + single-call-first로 반복 context loading을 줄이는 접근**이다.

## 장점

### 1. 한국어에 특화된 문제 정의

영어 humanizer의 단어 치환 방식과 달리 한국어 번역투와 문장 구조를 직접 겨냥한다. 특히 피동, 대명사 생략, 명사화, 의존명사, 영어식 논리 구조 등은 한국어 전용 처방이 필요하다.

### 2. 규칙과 LLM의 역할 분리

정규식/metric으로 모든 윤문을 해결하려 하지 않고, 결정 가능한 부분은 코드로 계측하고 실제 rewrite는 LLM에 맡긴다. Agent workflow에서 deterministic layer와 probabilistic layer를 분리하는 좋은 사례다.

### 3. 과윤문 방어

"사람처럼 바꿔라"는 지시만 주면 모델이 원문의 주장까지 개선하려 들기 쉽다. 이 프로젝트는 meaning immutable, span-grounded, genre/register preservation, change-rate gate 같은 계약으로 이를 제한한다.

### 4. 실제 운영 피드백이 구조에 반영됨

최근 Issue에는 route_hint coverage, 짧은 문서의 z-score 오탐, 한국어 피동 정규식, 동시 실행 run_id race, Windows Git Bash symlink 문제, metadata가 modality restore를 방해하는 문제 등이 보고되어 있다. 즉 단순 prompt collection보다 실제 실행 시스템에 가까운 실패 모드를 다루고 있다.

## 단점 및 한계

### 1. 규칙 체계 자체가 크고 복잡하다

`SKILL.md`와 references, agents, scripts가 함께 움직이므로 단순 윤문 Skill보다 유지보수 비용이 높다. taxonomy 변경 시 quick rules, diagnosis rules, playbook, 각 CLI 포팅 간 정합성을 유지해야 한다.

### 2. deterministic routing이 완전하지 않다

Issue #104에서는 route_hint가 제한된 카운트 지표만 보고 실제로 많은 AI 패턴이 있는 문서를 light로 보낸 사례가 보고됐다. 즉 "결정적 라우팅"도 관측 가능한 feature가 빈약하면 잘못된 확신을 줄 수 있다.

### 3. 한국어 형태소를 regex로 다루는 한계

Issue #131처럼 `~에 의해` 피동 탐지에서 종성 결합과 어절 경계 때문에 정규식이 실제 표현을 놓치는 문제가 있었다. 한국어 활용형을 regex만으로 안정적으로 처리하기 어렵다는 사례다.

### 4. 짧은 문서의 통계 지표 신뢰성

Issue #130에서는 2~3문장짜리 학술 초록에서 comma 기반 z-score가 과도하게 튀는 문제가 보고됐다. corpus 기반 metric은 최소 표본 수와 genre baseline이 중요하다.

### 5. 플랫폼별 기능 차이

Claude Code는 multi-call diagnose/finalize 경로를 사용할 수 있지만 Codex/Copilot 경로는 single-call 중심이다. 동일한 Skill 이름이라도 실행 품질과 비용 특성이 플랫폼별로 다를 수 있다.

### 6. Windows 설치 주의

Issue #95에서는 Windows Git Bash에서 `ln -s`가 실제 symlink가 아닌 copy로 조용히 전락할 수 있다는 문제가 보고됐다. Windows 중심 Enterprise 환경에서는 WSL 또는 copy/install/update 정책을 명확히 검증할 필요가 있다.

### 7. AI detector 우회 도구로 오해될 수 있음

프로젝트도 이를 명시적으로 부정한다. 목적은 provenance 세탁이나 detector bypass 보장이 아니라 한국어 writing quality 개선이다.

## 활용 사례

### 기술 문서/사내 Wiki

AI가 만든 조사 보고서에서 지나치게 정형화된 문장과 번역투를 제거한 뒤 사람이 읽기 좋은 Markdown으로 만드는 후처리 단계에 적합하다.

### AI Research Pipeline

```text
Research Agent
  -> factual draft
  -> citation/fact verification
  -> humanize-korean
  -> final Markdown
```

중요한 점은 humanize를 **사실 검증 이후**에 배치하는 것이다. 이 Skill은 사실을 조사하는 도구가 아니라 표현을 다듬는 도구다.

### Agent Harness의 Final Polish 단계

Analysis/Work/Review 구조가 있는 Harness라면 Reviewer 이후 최종 산출물에만 적용하는 편이 안전하다. 코드나 구조화 데이터가 아니라 사용자에게 노출되는 설명/문서에 한정하는 것이 좋다.

## 기존 방식과 비교

| 방식 | 장점 | 한계 |
|---|---|---|
| `자연스럽게 써줘` 프롬프트 | 가장 단순 | 결과 편차가 크고 과윤문 통제가 약함 |
| 범용 영어 Humanizer | 서비스 접근성이 좋음 | 한국어 번역투·조사·피동·생략 구조에 약함 |
| 단순 치환/Regex | 빠르고 결정적 | 문맥 판단과 자연스러운 rewrite가 어려움 |
| **im-not-ai** | 한국어 taxonomy + LLM rewrite + gate 결합 | 규칙/파이프라인 복잡도와 유지비용 증가 |

## 활용 아이디어

### 바로 적용 가능

**AI Wiki 문서의 최종 후처리 Skill**로 가치가 높다. 조사/분석 단계에서 사용하면 모델이 근거 문장을 재구성할 위험이 있으므로, factual content가 확정된 Markdown을 마지막에 한 번 통과시키는 방식이 적합하다.

권장 흐름:

```text
원본 조사
 -> 분석 문서 작성
 -> source/citation 검증
 -> humanize-korean (light/standard)
 -> diff/change-rate 확인
 -> Wiki commit
```

### PoC 가치 있음

기존 로컬 Skill이 너무 커서 context/token 비용이 문제라면 이 저장소의 구조를 직접 벤치마크할 가치가 있다.

- giant `SKILL.md` 하나에 모든 지식을 넣는 방식
- 작은 router + 필요 reference만 읽는 progressive disclosure
- monolith single-call
- chunked multi-call

네 방식을 같은 문서 세트로 비교하면 실제 token/latency/quality trade-off를 측정할 수 있다.

### 아이디어 참고

`route_hint`처럼 **LLM을 호출하기 전에 cheap code가 난이도를 분류**하는 패턴은 문서 윤문 외에도 코드 리뷰, 로그 분석, 테스트 실패 triage, context selection에 적용할 수 있다.

### 현재 도입 가치가 낮은 경우

- 짧은 채팅 메시지만 다듬는 경우
- 원문을 적극적으로 재구성해야 하는 마케팅 copy
- 사실 관계까지 수정/보강해야 하는 research 단계
- 한국어가 아닌 문서가 주 대상인 workflow

## 실무 평가

**도입 가치: 높음 — 특히 Skill 설계 사례로 가치가 크다.**

단순히 "AI 티 제거" 기능만 보면 취향성 도구로 볼 수 있지만, Agent/Skill 설계 관점에서는 더 흥미롭다. taxonomy를 reference로 분리하고, deterministic pre-score로 route를 정하고, 난이도에 따라 LLM call 수를 바꾸며, 마지막에 deterministic gate를 두는 구조는 일반적인 Agent Skill 최적화 패턴으로 재사용할 수 있다.

특히 대형 Skill 파일의 token 비용을 고민할 때 이 프로젝트의 결론은 참고할 만하다. **무조건 chunking하거나 모델을 싸게 바꾸는 것보다, 반복해서 주입되는 context를 줄이고 필요할 때만 추가 call을 쓰는 것이 더 중요할 수 있다.**

다만 route_hint와 metric 구현에서 실제 이슈가 계속 발견되고 있으므로, 전체 파이프라인을 그대로 신뢰하기보다 "routing / progressive disclosure / verification 구조"를 가져오는 쪽이 안전하다.

## 결론

`im-not-ai`는 한국어 AI 문체를 자연스럽게 고치는 Skill이면서, 동시에 비교적 잘 설계된 **LLM post-processing harness** 사례다.

기능 자체는 AI 문서/Wiki의 최종 polishing에 바로 써볼 수 있고, 더 큰 가치는 Skill 아키텍처에 있다. `deterministic pre-score -> adaptive LLM calls -> deterministic verification` 구조와 single-call-first 전략은 토큰 최적화 및 대형 Skill 설계에 직접 참고할 만하다.

## 참고 자료

- Repository: https://github.com/epoko77-ai/im-not-ai
- English README: https://github.com/epoko77-ai/im-not-ai/blob/main/README.en.md
- Skill: https://github.com/epoko77-ai/im-not-ai/blob/main/skills/humanize-korean/SKILL.md
- Latest release v2.3.2: https://github.com/epoko77-ai/im-not-ai/releases/tag/v2.3.2
- Issues: https://github.com/epoko77-ai/im-not-ai/issues
