---
title: 21st MCP (formerly Magic MCP)
category: tools
tags:
  - ai
  - agent
  - tools
source: https://github.com/21st-dev/magic-mcp
updated: 2026-10-22
---

# 21st MCP (formerly Magic MCP)

> UI 컴포넌트 탐색·생성을 위한 MCP

## 프로젝트 개요
기존 Magic MCP는 21st MCP 호환 프록시로 전환되었고 21st CLI가 권장된다.

## 해결하려는 문제
UI 레퍼런스 탐색과 구현 반복 비용을 줄인다.

## 핵심 기능
기존 Magic MCP는 21st MCP 호환 프록시로 전환되었고 21st CLI가 권장된다.

## 아키텍처
Coding Agent → HTTP MCP → 컴포넌트 검색/코드 조회/AI 생성.

## 장점
반복 작업을 자동화하고 AI Agent 워크플로우에 통합할 수 있는 가능성이 있다. 실제 효과는 별도 벤치마크가 필요하다.

## 단점 및 한계
API 키 필요; 생성 기능은 계정의 AI 권한에 의존하며 구 Magic 키는 유효하지 않음.

## 활용 사례
앱 UI 초안과 디자인 레퍼런스 탐색에 바로 시험.

## 기존 도구와 비교
직접 비교 벤치마크는 수행하지 않았다. 공식 기능과 제약을 중심으로 평가한다.

## 활용 아이디어
- 적용 판단: 앱 UI 초안과 디자인 레퍼런스 탐색에 바로 시험.
- 도입 전 확인: 설치 재현성, 권한, Windows 지원, 운영 비용, 테스트 결과.

## 결론
UI 컴포넌트 탐색·생성을 위한 MCP 실무 도입 전 소규모 PoC 및 안전성 검증을 권장한다.

## 참고 자료
- https://github.com/21st-dev/magic-mcp

> 조사 범위: 공식 README 중심 1차 분석. 세부 소스·Issues·실행 검증은 미완료.
