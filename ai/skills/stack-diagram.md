---
title: Stack Diagram - 자연어 기반 기술 아키텍처 다이어그램 Agent Skill
category: ai/skills
tags: [agent-skill, architecture-diagram, visualization, claude-code, codex]
source: https://github.com/caru-ini/stack-diagram
updated: 2026-11-02
---

# Stack Diagram

## 핵심 요약
[stack-diagram](https://github.com/caru-ini/stack-diagram)은 기술 스택을 자연어로 설명하면 공식 브랜드 로고와 연결 관계를 갖춘 아키텍처 다이어그램을 생성하는 Agent Skill이다. Claude Code, Codex, Cursor 등 Agent Skills 호환 환경에서 활용한다.

## 주요 기능
- 자연어 기술 구성 설명을 다이어그램으로 시각화
- SVGL, Devicon, gilbarbara/logos, 브랜드 저장소 및 AWS 공식 아이콘 활용
- 연결선이 레이블을 관통하지 않도록 라우팅하고 렌더링 결과 점검
- Light/Dark 테마 제공
- 기본 출력은 폰트와 로고를 내장한 독립 실행형 HTML; PNG, 의존성 없는 React 컴포넌트 및 Artifact 형식 지원
- 클라우드 아키텍처, 모노레포 개발 도구, AI 앱, AWS 네트워크 예시 제공

## 설치 및 실행 조건
```bash
npx skills add caru-ini/stack-diagram
```
Python 3.9 이상이 필요하며 로고 다운로드 시 네트워크 접근이 필요하다. PNG 내보내기에는 Playwright와 Chromium이 필요하다. Claude 앱에서는 릴리스의 ZIP Skill 업로드 방식을 안내한다.

## 활용 예시
> Next.js 프런트엔드는 Vercel에 배포하고 Supabase에서 인증과 PostgreSQL을 관리한다. GitHub Actions로 CI/CD를 수행하는 아키텍처 다이어그램을 만들어줘.

## 적용 판단
- 적합: README, 설계 문서, Wiki, 개발자 온보딩, 프레젠테이션용 기술 스택 시각화
- 장점: 공식 로고 기반 가독성, 공유 가능한 독립형 HTML, 다양한 Agent 지원
- 제약: 자연어 입력에서 실제 서비스 간 연결을 잘못 해석할 수 있으므로 사람이 검토해야 한다. 외부 로고 출처·상표권, Enterprise 환경의 외부 다운로드 제한을 검토해야 한다.
- 비교: Mermaid는 텍스트 기반 버전 관리와 간단한 흐름도에 유리하고, Stack Diagram은 브랜드 아이콘이 포함된 완성형 아키텍처 시각화에 강점이 있다. 이는 용도에 따른 평가이며 성능 벤치마크 결과는 아니다.

## 출처 및 확인 범위
- [공식 GitHub README](https://github.com/caru-ini/stack-diagram) — 2026-11-02 확인
- [Skill 배포 페이지](https://skills.sh/caru-ini/stack-diagram)
- 라이선스: 코드 및 문서 MIT, 번들 폰트 OFL 1.1. 브랜드 로고의 권리는 각 소유자에게 있다.
- 실제 설치·렌더링 테스트는 수행하지 않았다.
