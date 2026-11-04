---
title: "2026-11-03 급상승 AI 도구 및 Agent Skills 6종"
category: trend
tags: [ai, github-trending, agent-skills, gpu, coding-agent, ui-ux]
source: "사용자 제공 2026-11-03 순위 게시물"
updated: 2026-11-04
---

# 2026-11-03 급상승 AI 도구 및 Agent Skills 6종

> 조사: 2026-11-04. 순위 수치는 사용자가 제공한 11월 3일 스냅샷이며 실시간 수치가 아니다. GitHub 별과 skills.sh 설치 수는 서로 다른 지표다.

## 요약

최근 생성된 GitHub 프로젝트 세 개와 skills.sh에서 주목받은 Skill 세 개를 소개한 자료. 시각화, GPU 연산, 저장소 자동화, UI/UX, 스킬 탐색, AI 영상이라는 여섯 활용 영역을 보여준다. 인기 수치가 품질·보안·재현성을 보장하지 않는다.

| 분류 | 프로젝트 | 게시물 수치 | 공식 위치 |
| --- | --- | ---: | --- |
| GitHub | Anatomy | ★24,084 | https://github.com/wheresryan22/anatomy |
| GitHub | gpu-unlock | ★14,567 | https://github.com/zagitta/gpu-unlock |
| GitHub | dsh-superagent-prototype | ★12,882 | https://github.com/deepseek-ai/dsh-superagent-prototype |
| Skill | uizze-ui | 18,093회 | https://www.skills.sh/uizze/uizze/uizze-ui |
| Skill | find-skills | 17,660회 | https://www.skills.sh/vercel-labs/skills/find-skills |
| Skill | ai-avatar-video | 10,147회 | 동명 Skill이 여러 배포처에 존재해 원문 항목의 소유자 확인 필요 |

## 프로젝트별 분석

### Anatomy
- 기술 개념을 실제 기계의 작동 원리에 빗대어 인터랙티브 등각투영 도해로 생성하는 Agent Skill.
- SVG, 선택적 WebGL, 베타 3D, HTML 및 React 구성 요소 출력에 활용.
- 기술 문서와 교육 자료에 적합하지만 생성한 기계적 비유와 수치·동작의 사실성을 검토해야 한다.
- 소스: https://github.com/wheresryan22/anatomy

### gpu-unlock
- GeForce 20/30/40 시리즈의 일부 FP16/BF16/TF32 Tensor 연산 처리량 제한을 다루는 저수준 프로젝트.
- 저장소의 최대 2배 주장은 특정 Tensor 처리량을 뜻하며 실제 추론·학습·이미지 생성 성능은 워크로드마다 다르다.
- 부팅/드라이버 로딩에 관여하므로 OS·GPU 지원 범위, 복구 가능성, 보안·안정성을 별도 검증하고 업무용 PC에는 신중하게 적용.
- 소스: https://github.com/zagitta/gpu-unlock

### dsh-superagent-prototype
- DeepSeek Harness 기반으로 단일 GitHub 저장소의 요청을 티켓·격리 작업 세션·코드 수정·PR 흐름으로 처리하는 자율 코딩 에이전트 연구 프로토타입.
- DeepSeek 조직에 공개되었지만 완성된 상용 제품으로 간주해서는 안 된다.
- PoC에서는 최소 권한, 비밀정보 보호, 브랜치/PR 승인, 실패 복구를 확인.
- 소스: https://github.com/deepseek-ai/dsh-superagent-prototype

### uizze-ui
- 기존 코드·에셋·디자인 토큰을 살펴 UI/UX를 개선하도록 지시하는 Agent Skill.
- 레이아웃, 시각적 계층, 타이포그래피, 접근성, 반응형 상태 검증에 유용.
- 디자인 품질은 생성 결과의 실제 브라우저 검수와 제품 요구사항 확인에 좌우됨.
- 소스: https://www.skills.sh/uizze/uizze/uizze-ui

### find-skills
- 필요한 Agent Skill을 검색하고 설치 경로를 발견하는 탐색 Skill.
- 외부 Skill은 설치 전 출처, 권한, 스크립트, 유지보수 상태 검토 필요.
- 기존 상세 문서: [find-skills](../skills/find-skills.md)
- 소스: https://www.skills.sh/vercel-labs/skills/find-skills

### ai-avatar-video
- 텍스트·아바타 기반 영상 제작을 목적으로 하는 Skill 계열.
- skills.sh에서 동명 항목이 복수 저장소에 나타나므로 10,147회 수치와 정확히 대응하는 owner/repo는 미확인.
- 검증 전 설치 명령·특정 제작사·요금제 확정 금지.
- 탐색: https://www.skills.sh/trending

## 평가 및 권장 순서

| 우선순위 | 후보 | 실무 가치 | 검증 포인트 |
| --- | --- | --- | --- |
| 1 | Anatomy | 아키텍처/Wiki 설명 시각화 | 정확성, 렌더링, 재사용 가능한 소스 |
| 2 | find-skills | Agent Skill 발굴과 표준화 | 공급망 신뢰, 설치 스크립트 |
| 3 | dsh-superagent-prototype | GitHub 이슈→PR 자동화 PoC | 권한·격리·승인·복구 |
| 조건부 | uizze-ui | 프런트엔드 UI 개선 | 접근성·반응형·라이선스 |
| 조건부 | gpu-unlock | 지원 GPU의 AI 처리량 개선 | 하드웨어·OS·안정성·실측 |
| 조건부 | ai-avatar-video | 영상 제작 | 배포처 식별, 비용·권리 |

## 수치와 분류의 주의점

- 게시물은 '최근 30일 안에 생성된 저장소의 별 순'과 skills.sh 인기 급상승 설치 수를 섞어 보여준다. 동일 모집단의 통합 순위가 아니다.
- Anatomy 자체도 Agent Skill이며 '도구 3개 vs Skill 3개'는 수집 플랫폼을 기준으로 한 구분이다.
- 11월 4일 확인한 공개 자료에서 Anatomy 별은 약 24.3K, gpu-unlock은 약 15.4K로 관찰되었다. 실시간 값은 변한다.
- skills.sh 순위·설치 수는 페이지별 갱신 시점과 집계 기준에 따라 달라진다.

## 출처

- 사용자 제공 게시물 (2026-11-03 기준)
- https://github.com/wheresryan22/anatomy
- https://github.com/zagitta/gpu-unlock
- https://github.com/deepseek-ai/dsh-superagent-prototype
- https://www.skills.sh/trending
- https://www.skills.sh/uizze/uizze/uizze-ui
- https://www.skills.sh/vercel-labs/skills/find-skills
- https://www.repoburst.com/repo/wheresryan22/anatomy

조사일: 2026-11-04
