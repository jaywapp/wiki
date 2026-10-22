---
title: REA (Reverse Engineer Anything)
category: tools
tags:
  - ai
  - agent
  - tools
source: https://github.com/morluto/rea
updated: 2026-10-22
---

# REA (Reverse Engineer Anything)

> 바이너리·앱·웹을 분석하는 역공학 MCP

## 프로젝트 개요
Hopper/Ghidra/IDA 등과 연동하고 JS/Electron·.NET·네이티브 분석을 지원한다.

## 해결하려는 문제
소스가 없는 프로그램의 구조·동작을 조사하기 어렵다는 문제를 다룬다.

## 핵심 기능
Hopper/Ghidra/IDA 등과 연동하고 JS/Electron·.NET·네이티브 분석을 지원한다.

## 아키텍처
Agent → MCP → 분석 엔진/정적 분석 → 근거 포함 결과. Compact MCP schema 지원.

## 장점
반복 작업을 자동화하고 AI Agent 워크플로우에 통합할 수 있는 가능성이 있다. 실제 효과는 별도 벤치마크가 필요하다.

## 단점 및 한계
저작권·라이선스·권한 준수 필수; 추론 결과의 검증 필요.

## 활용 사례
자체 소유 바이너리 분석, 레거시 프로그램 이해 PoC.

## 기존 도구와 비교
직접 비교 벤치마크는 수행하지 않았다. 공식 기능과 제약을 중심으로 평가한다.

## 활용 아이디어
- 적용 판단: 자체 소유 바이너리 분석, 레거시 프로그램 이해 PoC.
- 도입 전 확인: 설치 재현성, 권한, Windows 지원, 운영 비용, 테스트 결과.

## 결론
바이너리·앱·웹을 분석하는 역공학 MCP 실무 도입 전 소규모 PoC 및 안전성 검증을 권장한다.

## 참고 자료
- https://github.com/morluto/rea

> 조사 범위: 공식 README 중심 1차 분석. 세부 소스·Issues·실행 검증은 미완료.
