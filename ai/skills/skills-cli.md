---
title: Vercel Skills CLI
category: skills
tags:
  - ai
  - agent
  - skills
source: https://github.com/vercel-labs/skills
updated: 2026-10-22
---

# Vercel Skills CLI

> Agent Skills의 검색·설치·갱신 CLI

## 프로젝트 개요
skills.sh 생태계에서 스킬을 찾고 여러 Coding Agent에 설치·관리한다.

## 해결하려는 문제
Agent별 스킬 설치·업데이트 방식이 다른 문제를 줄인다.

## 핵심 기능
skills.sh 생태계에서 스킬을 찾고 여러 Coding Agent에 설치·관리한다.

## 아키텍처
npx skills find/add/list/check/update/remove/init/use; Node.js 22.20 이상 요구.

## 장점
반복 작업을 자동화하고 AI Agent 워크플로우에 통합할 수 있는 가능성이 있다. 실제 효과는 별도 벤치마크가 필요하다.

## 단점 및 한계
외부 Skill은 신뢰 경계와 공급망 위험을 확인해야 함.

## 활용 사례
Claude Code/Codex 공통 Skill 배포에 바로 적용.

## 기존 도구와 비교
직접 비교 벤치마크는 수행하지 않았다. 공식 기능과 제약을 중심으로 평가한다.

## 활용 아이디어
- 적용 판단: Claude Code/Codex 공통 Skill 배포에 바로 적용.
- 도입 전 확인: 설치 재현성, 권한, Windows 지원, 운영 비용, 테스트 결과.

## 결론
Agent Skills의 검색·설치·갱신 CLI 실무 도입 전 소규모 PoC 및 안전성 검증을 권장한다.

## 참고 자료
- https://github.com/vercel-labs/skills

> 조사 범위: 공식 README 중심 1차 분석. 세부 소스·Issues·실행 검증은 미완료.
