---
title: ai-job-search
category: tools
tags: [ai, agent, claude-code, job-search]
source: https://github.com/MadsLorentzen/ai-job-search
updated: 2026-09-13
---

# ai-job-search

> Claude Code를 중심으로 채용 검색, 적합도 평가, 맞춤 CV·커버레터 생성, 검토, 면접 준비와 결과 추적을 로컬에서 연결하는 AI 구직 프레임워크.

## 프로젝트 개요

단순 이력서 생성기가 아니라 개인의 구직 과정을 저장소에 상태로 유지하고 `/setup`, `/scrape`, `/rank`, `/apply`, `/interview`, `/outcome` 명령으로 실행하는 워크플로우다. 기본 런타임은 Claude Code이며 일부 포털 검색 기능은 Agent Skills 형태로 분리되어 다른 Agent 런타임에서도 재사용할 수 있다.

## 해결하려는 문제

일반적인 AI 구직 지원은 공고마다 프로필을 다시 전달해야 하고 검색·평가·문서 작성·면접·결과 관리가 분리된다. 이 프로젝트는 후보자 프로필을 지속적인 로컬 컨텍스트로 유지하면서 전체 파이프라인을 명령 기반으로 연결한다.

## 핵심 기능

- `/setup`: 문서, CV 또는 인터뷰를 통한 후보자 프로필 구성
- `/scrape`: 여러 채용 포털 검색 및 중복 제거
- `/rank`: 공고 일괄 적합도 평가와 우선순위화
- `/apply`: 공고 분석 → CV/커버레터 작성 → reviewer 검토 → 수정 → PDF 컴파일 → ATS 점검
- `/interview`, `/outcome`: 면접 준비와 지원 결과 관리
- `/gmail-sync`, `/notion-sync`, `/html-report`: 상태 추적과 리포트
- `/add-portal`, `/add-template`: 채용 포털 Skill과 문서 템플릿 확장

## 아키텍처

```mermaid
flowchart LR
 D[개인 문서/CV] --> S[/setup]
 S --> P[Candidate Profile]
 P --> Q[/scrape]
 Q --> J[Portal Skills]
 J --> R[/rank]
 R --> A[/apply]
 P --> A
 A --> W[Draft]
 W --> V[Reviewer]
 V --> X[Revision]
 X --> PDF[PDF Compile]
 PDF --> ATS[ATS Check]
 ATS --> O[/outcome]
```

명령 파일이 orchestration을 담당하고 `.agents/skills`의 포털 Skill/CLI가 외부 검색을 담당한다. `/apply`는 drafter-reviewer 패턴과 실제 PDF/ATS 검증까지 포함한다.

## 장점

- 검색부터 결과 추적까지 구직 전체를 하나의 Harness로 연결한다.
- 개인 프로필과 지원 이력을 로컬 파일 중심으로 유지한다.
- 생성 후 별도 reviewer의 비판과 수정 루프가 있다.
- PDF 렌더링과 ATS 텍스트 추출까지 최종 산출물을 검증한다.
- Agent Skills와 `/add-portal`을 통해 시장별 확장이 가능하다.
- 개인화된 저장소와 upstream 업데이트를 함께 운영하기 위한 version/update checker가 있다.

## 단점 및 한계

- 전체 워크플로우는 Claude Code 중심이며 다른 Agent 런타임의 동등한 호환성은 보장되지 않는다.
- Python, Bun, LaTeX 환경이 필요해 설치 부담이 있다.
- 기본 포털이 LinkedIn 및 덴마크 시장 중심이라 한국에서는 별도 포털 Skill이 필요하다.
- 외부 채용 공고를 LLM이 읽기 때문에 prompt injection 위험이 있으며 instruction-level 방어는 sandbox가 아니다.
- 개인 데이터를 공개 fork에 넣지 않도록 주의해야 하며 개인용은 private repository + upstream 방식이 적합하다.
- reviewer 조사와 반복 PDF 수정 때문에 단순 생성보다 토큰과 실행 시간이 늘어날 수 있다. 공식 토큰/비용 벤치마크는 확인되지 않았다.
- 2026년 9월 기준 URL 검증 및 동일 회사 복수 역할 처리 관련 edge case 이슈가 남아 있다.

## 활용 사례

- 매일 수집된 공고를 내 경력 기준으로 자동 우선순위화
- 사실 기반 프로필을 유지하면서 공고별 지원 문서 생성
- 지원 결과를 tracker에 누적하고 면접 준비로 연결
- 개인 Career Agent를 Git 저장소 기반으로 장기 운영

## 기존 도구와 비교

일반 Resume Builder나 단발성 ChatGPT 프롬프트보다 문서 생성 자체가 아니라 **구직 업무의 상태와 반복 프로세스를 저장소 + Agent 명령 + Skill로 구조화**한 것이 핵심이다. 완성 SaaS보다 개인용 Job Search Harness에 가깝다.

## 활용 아이디어

### 바로 적용 가능
`setup → scrape → rank → execute → review → outcome` 상태 전이와 drafter-reviewer-final validation 패턴은 개발 생산성 Harness에도 적용 가치가 높다.

### PoC 가치 있음
- 한국 채용 포털용 Agent Skill 추가
- Claude 작성 + Codex 독립 검토 구조 실험
- 구직 대신 사내 업무 요청을 `수집 → rank → execute → review → outcome`으로 일반화

### 아이디어 참고
매번 긴 프롬프트를 다시 주는 대신 도메인 상태를 파일에 유지하고 작은 명령과 Skill이 단계적으로 상태를 변환하는 방식이 핵심 인사이트다.

## 프로젝트 성숙도

2026년 7월 v1.0.0에서 stable baseline을 선언했고 8월 CHANGELOG에는 v1.4.0이 확인된다. CI, 테스트, 활발한 기여가 있지만 9월에도 edge case 이슈가 보고되고 있어 빠르게 성숙하는 오픈소스 프레임워크로 보는 것이 적절하다.

## 결론

취업 도구라는 목적보다 **파일 기반 상태 + 명령 + Skill + Reviewer + artifact validation으로 개인 업무 도메인을 자동화한 Agent Harness 사례**라는 점이 특히 가치 있다. 개발 생산성 Harness 설계에서 orchestration, 상태 관리, 독립 검토와 최종 산출물 검증 구조를 참고할 만하다.

평가: **PoC 가치 있음 / Harness 설계 패턴은 바로 적용 가능**.

## 참고 자료

- https://github.com/MadsLorentzen/ai-job-search
- Releases, CHANGELOG, SECURITY, Issues, Discussions
