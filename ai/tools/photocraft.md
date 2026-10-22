---
title: PhotoCraft
category: tools
tags:
  - ai
  - agent
  - tools
source: https://github.com/storytold/photocraft
updated: 2026-10-22
---

# PhotoCraft

> Rust 기반 PSD 호환 이미지 편집기

## 프로젝트 개요
레이어·마스크·조정 레이어·PSD 편집을 제공하며 CLI/MCP/JSON 제어 채널을 통한 자동화가 가능하다.

## 해결하려는 문제
이미지 편집을 GUI 수작업에 의존하는 문제를 줄인다.

## 핵심 기능
레이어·마스크·조정 레이어·PSD 편집을 제공하며 CLI/MCP/JSON 제어 채널을 통한 자동화가 가능하다.

## 아키텍처
Rust GPU 합성, 명령 기반 편집, PSD 입출력.

## 장점
반복 작업을 자동화하고 AI Agent 워크플로우에 통합할 수 있는 가능성이 있다. 실제 효과는 별도 벤치마크가 필요하다.

## 단점 및 한계
초기 Alpha로 PSD 호환성 및 Windows 안정성 실무 검증 필요.

## 활용 사례
앱 스토어 이미지와 썸네일의 템플릿 기반 제작 PoC.

## 기존 도구와 비교
직접 비교 벤치마크는 수행하지 않았다. 공식 기능과 제약을 중심으로 평가한다.

## 활용 아이디어
- 적용 판단: 앱 스토어 이미지와 썸네일의 템플릿 기반 제작 PoC.
- 도입 전 확인: 설치 재현성, 권한, Windows 지원, 운영 비용, 테스트 결과.

## 결론
Rust 기반 PSD 호환 이미지 편집기 실무 도입 전 소규모 PoC 및 안전성 검증을 권장한다.

## 참고 자료
- https://github.com/storytold/photocraft

> 조사 범위: 공식 README 중심 1차 분석. 세부 소스·Issues·실행 검증은 미완료.
