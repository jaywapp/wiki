# AX / AI

AI를 활용해 개발·업무 경험을 개선하는 **Agent Experience(AX)** 자료를 한곳에 모은 인덱스입니다.

기존 `ai-workflow/`와 `ax/` 자료를 저장소 루트의 `ai/` 아래로 통합하고, 문서의 성격에 따라 분류합니다.

## Categories

- `news/` — AI/에이전트 생태계의 개별 소식·발표·업데이트
- `trend/` — 동일 주제를 지속 조사하며 변화와 방향성을 누적하는 Scout/Trend 보고서
- `tips/` — 실전 설정, 문제 해결, 비용·토큰 최적화, 운영 팁
- `harness/` — 여러 모델·에이전트·도구를 조합하는 실행 하니스와 워크플로우
- `tools/` — 에이전트 도구, 프레임워크, 오픈소스 프로젝트 분석
- `skills/` — Agent Skill 및 작업 능력 확장 자료
- `research/` — 비교·검토·심층 분석 자료
- `etc/` — 위 범주에 명확히 속하지 않는 AX/AI 자료

## 분류 원칙

1. 동일 주제를 날짜별·주기적으로 관찰하며 변화와 방향성을 추적하면 `trend`.
2. 새 제품/기능/릴리스 등 개별 사건 자체가 핵심이면 `news`.
3. 바로 적용할 설정·운영법·최적화 방법이면 `tips`.
4. 모델/에이전트를 연결해 작업 파이프라인을 만드는 내용이면 `harness`.
5. 특정 도구·MCP·프레임워크·오픈소스 프로젝트 소개/분석이면 `tools`.
6. 재사용 가능한 Agent Skill 자체 또는 Skill 비교면 `skills`.
7. 모델/제품/방법론 비교와 장문의 검토는 `research`.
8. 애매한 자료만 `etc`에 두고, `etc`가 비대해지면 새 카테고리를 만든다.

## Trend

`trend/`는 지속 관찰형 데이터의 canonical 위치입니다. 일일 AI Harness·Context Engineering·Token Optimization Scout는 다음 규칙을 사용합니다.

```text
ai/trend/ai-harness-token-scout-YYYY-MM-DD.md
```

Trend 보고서에서 발견한 개별 프로젝트가 별도 분석 가치가 있다면 해당 프로젝트의 상세 문서는 `tools/`, `harness/`, `research/` 등 적절한 카테고리에서 관리합니다. 날짜별 수집 보고서 자체는 다른 카테고리에 중복 저장하지 않습니다.

> 폴더는 저장소 루트의 `ai/`입니다. 과거 `ax/ai/`·`ax/`·`ai-workflow/` 경로로 된 링크는 웹 리더가 현재 문서로 연결하지만, 새 문서에서는 `ai/`를 사용합니다.
