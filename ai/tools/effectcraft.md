---
title: EffectCraft
category: tools
tags:
  - ai
  - agent
  - tools
source: https://github.com/storytold/effectcraft
updated: 2026-10-22
---

# EffectCraft

> Agent 제어 가능한 Rust 모션그래픽 합성기

## 프로젝트 개요
키프레임·레이어·효과·렌더 큐와 MCP/CLI/headless 렌더링을 지원한다.

## 해결하려는 문제
반복 영상 제작을 수동 편집에 의존하는 문제를 줄인다.

## 핵심 기능
키프레임·레이어·효과·렌더 큐와 MCP/CLI/headless 렌더링을 지원한다.

## 아키텍처
공통 Command Registry → MCP/CLI/GUI → 합성 엔진 → 렌더 큐. JSON .ecproj 프로젝트.

## 장점
반복 작업을 자동화하고 AI Agent 워크플로우에 통합할 수 있는 가능성이 있다. 실제 효과는 별도 벤치마크가 필요하다.

## 단점 및 한계
Alpha; Windows UI 버그 및 렌더 충실도 문제, 프로덕션 사용 비권장.

## 활용 사례
쇼츠·앱 프로모션 모션그래픽 자동화 PoC.

## 기존 도구와 비교
직접 비교 벤치마크는 수행하지 않았다. 공식 기능과 제약을 중심으로 평가한다.

## 활용 아이디어
- 적용 판단: 쇼츠·앱 프로모션 모션그래픽 자동화 PoC.
- 도입 전 확인: 설치 재현성, 권한, Windows 지원, 운영 비용, 테스트 결과.

## 결론
Agent 제어 가능한 Rust 모션그래픽 합성기 실무 도입 전 소규모 PoC 및 안전성 검증을 권장한다.

## 참고 자료
- https://github.com/storytold/effectcraft

> 조사 범위: 공식 README 중심 1차 분석. 세부 소스·Issues·실행 검증은 미완료.
