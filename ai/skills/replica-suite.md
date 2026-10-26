---
title: Replica Suite - 앱·웹 재구현을 위한 멀티 클라이언트 Agent Skills
category: skills
tags:
  - ai
  - agent-skills
  - reverse-engineering
  - web-reconstruction
  - mobile
  - codex
  - claude-code
source: https://github.com/yazzang-homelab/replica-suite
updated: 2026-10-26
---

# Replica Suite

> 웹사이트·앱·네이티브 프로그램의 증거 수집, 명세화, 재구현, 검증을 지원하는 41개 공유 Agent Skill 번들.

## 핵심 요약

- 조사 기준: 2026-10-26, 공개 README 기준 v0.3.0.
- Codex, Claude Code, GJC를 대상으로 하나의 공유 Skill 집합을 제공한다.
- 단순 원클릭 복제기가 아니라 **Evidence → Spec → Build → Verify** 절차를 안내하는 Skill 모음이다.
- 실무에서는 자사 웹 UI 마이그레이션, 화면 레퍼런스 분석, 레거시 앱 재구현의 PoC에 적합하다.

## 구성과 아키텍처

| 영역 | Skill 수 | 역할 |
| --- | ---: | --- |
| app | 8 | 앱 재구현 |
| web | 10 | HTML, React, Vue, Svelte, React Native, UnoCSS, QML 등 |
| shot | 8 | 스크린샷 기반 재구성 및 비교 |
| mobile | 7 | APK, IPA, Flutter, Unity 관련 작업 |
| native | 7 | Ghidra, 네이티브 바이너리, C++ 및 게임 포팅 |
| root router | 1 | `replica` 진입점과 분기 |

```text
입력(URL / screenshot / mobile package / binary)
             |
        replica router
             |
   app / web / shot / mobile / native
             |
        Evidence 수집
             |
        Specification
             |
          Build
             |
          Verify
```

위 도식은 README에 명시된 단계와 분류를 요약한 개념도이며, 실제 자동 실행 순서를 강제하는 런타임이라는 의미는 아니다.

`skills/`와 `lib/`, `scripts/`, `references/`가 번들 단위로 공유된다. 개별 Skill 폴더만 떼어 복사하는 방식은 권장하지 않는다.

## 설치와 실행

### Claude Code

```bash
claude plugin marketplace add yazzang-homelab/replica-suite
claude plugin install replica-suite@replica-suite-local
claude plugin list --json
```

새 세션에서 `/replica-suite:replica`를 실행한다.

### Codex

```bash
codex plugin marketplace add yazzang-homelab/replica-suite
codex plugin add replica-suite@replica-suite-local
codex plugin list --json
```

새 세션에서 Skill picker의 `replica-suite:replica`를 선택한다.

Node.js 20 이상(22 권장), Python 3.13 권장, Git이 필요하다. 브라우저 자동화용 Playwright와 Ghidra·jadx·Frida 등 특화 도구는 별도 설치가 필요하다. 설치된 플러그인 캐시에 의존성이 위치할 수 있으므로 실제 활성 번들 경로에서 설치해야 한다.

## 검증과 제약

저장소가 안내하는 개발 검증 명령:

```bash
npm run check
npm run test:e2e
python3 scripts/check_clients.py --client all
```

README가 밝힌 검증 클라이언트 버전은 Codex 0.164.0, Claude Code 2.1.310, GJC 0.19.0이다. 설치 및 발견 검증은 Linux에서, 단위 및 브라우저 테스트는 Ubuntu 24.04 CI에서 수행됐다. Windows와 macOS 런타임은 검증됐다고 주장하지 않는다. 테스트 통과가 모델 간 출력 동등성이나 실제 모바일 기기·Ghidra·Qt 기능 검증을 뜻하지도 않는다.

상위 소스 40개를 요청해 39개를 검토했으며, 접근 불가였던 `minosdevs/copycat-skill`은 통합하지 않았다고 README에 기록돼 있다. 제3자 라이선스 조건은 별도로 준수해야 한다.

## 장점과 단점

**장점**
- 증거 중심 분석과 구현 명세를 분리해 무근거 UI 추측을 줄이는 절차.
- 웹·모바일·네이티브를 한 번들에서 다루는 폭넓은 스킬 분류.
- Codex/Claude Code/GJC에서 공유 자원을 재사용하는 멀티 클라이언트 구성.
- 브라우저 E2E 및 이미지 비교 등 검증 단계 포함.

**제약**
- 원클릭 완전 복제 도구가 아니며 결과는 대상, 모델, 검토 품질에 좌우된다.
- 외부 도구와 플랫폼별 SDK 의존성이 크다.
- Windows 및 Enterprise 환경에서는 실행 호환성, 바이너리 분석 허용 범위, 외부 데이터 전송, 라이선스 검토가 필요하다.
- 공개 README와 저장소 구조 확인에 기반한 평가이며 실제 대상 앱 복제 성능을 독립 재현한 결과는 아니다.

## 실무 적용 제안

1. 자사 소유 웹페이지 1개를 대상으로 URL/스크린샷에서 UI 명세를 생성한다.
2. React 등 목표 스택으로 재구현하고 브라우저 렌더링 차이를 비교한다.
3. 명세 누락, 시각적 차이, 테스트 재현성, 도구 설치 시간, 토큰/실행 비용을 측정한다.
4. 보안·라이선스 검토 후 팀 표준 Skill 채택 여부를 결정한다.

기존 Wiki의 [Replica Skill](./replica-skill.md)은 11개 Claude Skill을 이용해 제품 조사부터 리브랜딩·출시까지 다루는 별개 프로젝트다. Replica Suite는 41개 스킬과 여러 클라이언트 지원, 웹/모바일/네이티브 재구현 범위에 초점이 있어 별도 문서로 관리한다.

## 참고 자료

- 원본 저장소 및 README: https://github.com/yazzang-homelab/replica-suite
- 한국어 README: https://github.com/yazzang-homelab/replica-suite/blob/main/README.ko.md
- 의존성 및 실행 설명: https://github.com/yazzang-homelab/replica-suite/blob/main/references/runtime.md
- 조사 날짜: 2026-10-26
