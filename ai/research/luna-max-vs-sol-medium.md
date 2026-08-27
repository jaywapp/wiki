# Luna Max vs Sol Medium

> 작성일: 2026-08-19
> 주제: Codex 환경에서 `Luna Max`와 `Sol Medium`의 실용적 선택 기준 비교

## 요약

Codex의 에이전트 코딩 관점에서는 **Luna Max가 Sol Medium과 상당히 겹치는 성능대를 제공하면서 비용 효율이 더 좋은 선택**으로 볼 수 있다.

반면 **대규모 코드베이스 이해, 긴 컨텍스트 유지, 모호한 요구사항 해석, 아키텍처 판단**이 중요한 작업에서는 Sol Medium 쪽이 더 안정적이다.

핵심적으로는 다음처럼 볼 수 있다.

- **Luna Max**: 저렴한 모델에 높은 reasoning effort를 투입해 상위 모델 성능에 근접
- **Sol Medium**: 모델 자체의 기본 지능과 컨텍스트 효율이 높아 더 적은 토큰으로 복잡한 판단 수행
- 일반 구현 작업은 Luna Max가 비용 대비 효율적
- 복잡한 설계/리포지토리 이해는 Sol 계열이 유리

---

## 주요 비교

Artificial Analysis의 Codex 계열 코딩 에이전트 비교에서 확인되는 경향은 다음과 같다.

| 항목 | Luna Max | Sol Medium |
|---|---:|---:|
| Coding Agent Index | 59 | 61 |
| DeepSWE | 63% | 64% |
| Terminal-Bench v2 | 80% | 78% |
| SWE-Atlas-QnA | 33% | 40% |
| 평균 Task 비용 | $1.57 | $2.99 |
| 평균 실행시간 | 8.0분 | 5.2분 |
| 평균 Token 사용량 | 15.5M | 5.8M |

이 데이터를 기준으로 보면 **전체 코딩 성능 차이는 작지만 비용 차이는 크다.**

즉, 에이전트 코딩에서 Luna Max는 Sol Medium에 근접한 결과를 내면서도 평균 비용은 크게 낮다.

---

## Luna Max가 강한 이유

Luna는 Sol보다 작은 모델이지만 reasoning effort를 Max로 높이면 에이전트 환경에서 상당한 성능을 확보할 수 있다.

개념적으로는 다음과 같다.

```text
Luna Max
= 저렴한 모델 + 많은 추론/시도

Sol Medium
= 더 강한 모델 + 상대적으로 적은 추론/시도
```

Codex처럼 다음 기능을 제공하는 harness에서는 이 차이가 더욱 줄어든다.

- 파일 탐색
- 터미널 실행
- 테스트 실행
- 실패 후 재시도
- 코드 수정 반복
- 도구 사용 기반 검증

즉 모델 자체의 지능 차이를 **도구 실행과 반복 루프가 일정 부분 보완**한다.

---

## 비용 효율

OpenAI 공식 가격 구조에서는 Luna와 Sol 사이에 기본 토큰 가격 차이가 크다.

| 모델 | Input / 1M | Output / 1M |
|---|---:|---:|
| Luna | $1 | $6 |
| Terra | $2.50 | $15 |
| Sol | $5 | $30 |

동일 토큰 기준으로 Luna는 Sol보다 훨씬 저렴하기 때문에, Luna Max가 더 많은 reasoning token을 사용하더라도 전체 작업 비용은 여전히 낮을 수 있다.

### 특징

Luna Max:

- 토큰을 많이 사용
- 실행 시간이 길어질 수 있음
- 비용은 낮음
- 명확한 구현 작업에서 높은 효율

Sol Medium:

- 토큰 사용량이 상대적으로 적음
- 실행이 빠름
- 비용은 높음
- 복잡한 판단과 컨텍스트 이해가 강함

---

## 속도 차이

측정 결과에서는 Sol Medium이 Luna Max보다 빠르게 작업을 완료하는 경향을 보인다.

```text
Luna Max   : 약 8.0분 / task
Sol Medium : 약 5.2분 / task
```

따라서 다음처럼 해석할 수 있다.

### 인터랙티브 개발

사용자가 Codex 결과를 기다리며 바로 다음 지시를 내리는 경우:

```text
수정
→ 결과 확인
→ 다음 요청
→ 수정
```

Sol Medium 쪽 체감이 좋을 수 있다.

### 자율 에이전트 작업

반대로 다음처럼 맡겨두는 경우:

```text
기능 구현
→ 테스트
→ 실패 수정
→ 재테스트
→ 완료
```

Luna Max의 느린 속도는 상대적으로 큰 문제가 되지 않는다.

---

## 코드베이스 이해 능력

두 모델의 차이는 단순 코딩보다 **리포지토리 이해와 판단**에서 더 잘 나타난다.

### Terminal-Bench

Luna Max가 Sol Medium과 동등하거나 일부 측정에서 앞서는 경향을 보인다.

이는 다음 작업에 Luna Max가 강하다는 의미로 볼 수 있다.

- CLI 실행
- 테스트 반복
- 명확한 파일 수정
- 자동화된 구현 작업

### SWE-Atlas-QnA

Sol Medium이 더 높은 결과를 보인다.

이는 다음 능력에서 Sol 계열이 상대적으로 유리하다는 신호다.

- 리포지토리 구조 파악
- 여러 파일 관계 이해
- 코드베이스 기반 질의응답
- 설계 의도 추론

---

## Long Context

Luna와 Sol의 가장 큰 구조적 차이 중 하나는 긴 컨텍스트 처리 능력이다.

OpenAI의 long-context 평가에서는 Sol이 Luna보다 크게 우세한 결과를 보인다.

특히 코드베이스가 커지거나 세션이 길어질수록 Luna 계열은 앞서 읽은 정보를 놓칠 가능성이 상대적으로 높다.

예를 들어 다음과 같은 상황이다.

```text
파일 A 확인
파일 B 확인
파일 C 확인
파일 D 확인
...

→ 초기에 확인했던 파일 A의 제약조건을 놓침
```

반면 Sol은 대규모 코드베이스나 긴 세션에서 이러한 정보 유지 측면에서 더 안정적인 선택이 될 수 있다.

---

## Luna Max에 적합한 작업

다음 유형은 Luna Max를 우선 선택하기 좋다.

- 명확한 기능 구현
- 작은~중간 규모 코드 수정
- 테스트 작성
- 버그 재현 후 수정
- 반복적인 리팩터링
- API wrapper 작성
- boilerplate 구현
- CLI/tool 호출이 많은 작업
- 이미 계획이 만들어진 implementation
- 범위가 명확한 issue 처리

예:

```text
UserService에 캐시를 추가하고
기존 테스트가 깨지지 않도록 수정해.
```

이런 작업은 Luna Max에 잘 맞는다.

---

## Sol Medium에 적합한 작업

다음 작업은 Sol Medium의 장점이 더 잘 드러난다.

### 요구사항이 모호한 작업

```text
프로젝트 전체 구조를 보고
인증 구조의 문제점을 찾아 개선해.
```

### 여러 subsystem이 연결된 작업

```text
WPF → API → DB → CI Pipeline까지
변경 영향을 분석해.
```

### 대규모 Repository

- 수백~수천 파일 탐색
- 여러 subsystem 관계 분석
- 긴 세션 유지

### 설계 판단

```text
기존 구조를 유지할지
아키텍처를 변경할지 판단해.
```

### 실패 비용이 큰 작업

- 대규모 refactoring
- migration
- 핵심 시스템 변경

---

## 중요한 해석

`Luna Max ≈ Sol Medium`이라는 표현은 **모든 영역에서 두 모델이 동일하다는 의미가 아니다.**

이 비교는 특히 Codex 같은 **agentic coding harness 환경**에서 의미가 크다.

모델 자체의 일반적인 intelligence 측면에서는 여전히 대략 다음 구조로 보는 것이 적절하다.

```text
Sol > Terra > Luna
```

하지만 Codex가 tool execution, retry, test loop를 제공하면서 Luna Max가 코딩 에이전트 업무에서는 Sol Medium과의 격차를 상당 부분 줄인다.

---

## 추천 모델 라우팅

실전 Codex 운용에서는 다음처럼 사용할 수 있다.

```text
일반적인 코딩
↓
Luna High

조금 어려운 구현
↓
Luna Max

복잡한 문제 / 구조 파악
↓
Sol Medium

아키텍처 / 어려운 버그 / 대규모 변경
↓
Sol High

매우 중요한 검토 / 해결이 어려운 문제
↓
Sol xHigh / Max
```

하지만 Luna Max와 Sol Medium의 역할이 상당히 겹치기 때문에 보다 단순한 라우팅은 다음과 같다.

```text
기본 Agent
Luna Max

↓

Luna가 2번 이상 실패
또는
Repository 전체 이해 필요
또는
설계 판단 필요

↓

Sol High
```

즉 역할을 다음처럼 나누는 방식이다.

```text
Luna Max = 작업자
Sol High = 시니어 / 문제 해결사
```

이 방식에서는 Sol Medium을 생략함으로써 모델 선택 구조도 단순화할 수 있다.

---

## 실전 권장안

### 비용/사용량을 우선할 때

```text
Luna High
→ Luna Max
→ Sol High
```

### 응답 속도를 우선할 때

```text
Luna High
→ Sol Medium
→ Sol High
```

### 대형 Repository 중심일 때

```text
Sol Medium
→ Sol High
```

### Agent에게 오래 맡기는 작업

```text
Luna Max
```

가 기본값으로 상당히 매력적이다.

---

## 최종 결론

Codex의 일반적인 구현 작업에서는 **Luna Max를 Sol Medium 대신 사용하는 전략이 충분히 합리적**이다.

특히 다음 조건에서는 Luna Max가 유리하다.

- 비용/사용량이 중요함
- 작업 범위가 명확함
- 에이전트가 자율적으로 테스트와 수정을 반복함
- 실행 시간이 약간 길어져도 문제가 없음

반대로 다음 조건에서는 Sol Medium 또는 Sol High가 낫다.

- 대규모 코드베이스
- 긴 컨텍스트
- 여러 subsystem 분석
- 설계 판단
- 요구사항이 모호함
- 실패 비용이 큼

따라서 실전 라우팅 관점에서는 다음 전략이 가장 단순하고 실용적이다.

```text
Luna High
→ Luna Max
→ Sol High
```

Sol Medium은 분명 더 강력하지만 Luna Max와 역할이 많이 겹치므로, 필요에 따라 **Luna Max에서 바로 Sol High로 승급하는 방식**도 좋은 운영 전략이다.

---

## 참고 자료

- OpenAI — GPT-5.6 모델 및 가격/평가 자료
  - https://openai.com/index/gpt-5-6/
- OpenAI Help — Codex Rate Card
  - https://help.openai.com/ko-kr/articles/20001106-codex-rate-card
- Artificial Analysis — Coding Agents / Codex 비교
  - https://artificialanalysis.ai/agents/coding-agents/comparisons/claude-code-vs-codex
- Sebastian Raschka 관련 분석
  - https://substack.com/@rasbt
