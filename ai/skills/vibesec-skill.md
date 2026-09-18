---
title: VibeSec-Skill
category: skills
tags:
  - ai
  - agent-skill
  - security
  - secure-coding
  - claude-code
  - codex
source: https://github.com/BehiSecc/VibeSec-Skill
updated: 2026-09-13
---

# VibeSec-Skill

> AI 코딩 에이전트에게 버그 바운티 헌터 관점의 보안 지침을 주입해, 웹 애플리케이션 코드를 작성·리뷰할 때 흔한 취약점을 예방하도록 만드는 단일 보안 Agent Skill.

## 프로젝트 개요

VibeSec-Skill은 BehiSecc가 공개한 보안 중심 Agent Skill이다. 실행형 보안 스캐너나 SAST 엔진이 아니라 약 24KB 규모의 `SKILL.md`에 보안 원칙, 취약점별 공격/우회 패턴, 안전한 구현 예시와 체크리스트를 정리해 모델의 코딩·리뷰 행동을 바꾸는 방식이다.

저장소 자체는 `README.md`, `SKILL.md`, `LICENSE` 중심의 매우 단순한 구조이며 Apache-2.0 라이선스다. Claude Code뿐 아니라 Cursor, Codex, GitHub Copilot, Antigravity용 설치 위치도 안내한다.

## 해결하려는 문제

AI 코딩은 기능 구현 속도는 빠르지만 인증·인가 누락, 하드코딩된 비밀키, IDOR, XSS, SSRF, SQL Injection, 잘못된 파일 업로드 처리 같은 보안 결함까지 빠르게 생성할 수 있다. VibeSec은 보안 검토를 개발 마지막 단계의 별도 작업으로만 두지 않고, 코드 생성 시점부터 모델의 컨텍스트에 secure-by-default 규칙을 넣는 것을 목표로 한다.

## 핵심 기능

- Access Control: IDOR, 권한 상승, 수평/수직 접근, Mass Assignment, 토큰 폐기
- Client Side: Stored/Reflected/DOM XSS, CSRF, Secret 노출, Open Redirect
- Server Side: SSRF, SQL Injection, XXE, Path Traversal, 위험한 파일 업로드
- Authentication: 비밀번호, 세션, 계정 생명주기, JWT 보안
- API: Mass Assignment, GraphQL depth/complexity/batching 대응
- React/Vue/Node.js/Python/Java/.NET 등 프레임워크별 패턴
- AWS/GCP/Azure metadata endpoint 등 클라우드 관련 방어
- 단순 원칙뿐 아니라 우회 기법·edge case·검증 체크리스트 제공

저자는 공개 버전이 흔한 취약점의 약 60~70%를 다룬다고 설명한다. 이 수치는 독립 벤치마크 결과라기보다 프로젝트 자체 설명으로 봐야 한다.

## 아키텍처

```text
Developer Request
      |
      v
Claude / Codex / Cursor / Copilot
      |
      +---- load ----> VibeSec SKILL.md
      |                 |
      |                 +-- secure coding principles
      |                 +-- vulnerability patterns
      |                 +-- bypass / edge cases
      |                 +-- framework examples
      |                 +-- verification checklists
      |
      v
Code Generation / Review
      |
      v
Security-aware implementation
```

별도 서버, MCP, 데이터베이스, 외부 API가 필요한 구조는 아니다. 즉 런타임 보안 시스템이 아니라 **모델의 판단 컨텍스트를 강화하는 지식형 Skill**이다.

## 장점

1. 설치 비용이 매우 낮다. 기존 Claude Code/Codex 프로젝트의 Skill 디렉터리에 넣는 것만으로 적용 가능하다.
2. 개발 중 보안을 앞단으로 이동시키는 Shift-left 효과가 있다.
3. 단순 OWASP 항목 나열보다 bypass와 edge case까지 포함해 일반적인 보안 프롬프트보다 구체적이다.
4. Claude Code와 Codex 양쪽에서 동일한 보안 기준을 공유하기 쉽다.
5. 실행 코드나 외부 서비스가 없어 도입·운영 복잡도가 낮다.

## 단점 및 한계

- 실제 SAST/DAST, dependency scanner, secret scanner를 실행하는 도구가 아니다. 모델이 코드를 놓치거나 잘못 판단할 가능성이 남는다.
- 단일 `SKILL.md`가 약 24KB/572 LOC로 비교적 크기 때문에 항상 로드하면 컨텍스트 비용이 발생한다.
- 웹 애플리케이션 보안에 초점이 있어 Unreal Engine, WPF, native desktop, Perforce 자체 보안 등에는 직접 적용 범위가 좁다.
- 프로젝트에 자동 테스트, benchmark, 취약 코드 corpus 기반 탐지율 검증이 확인되지 않아 정량적인 효과는 검증하기 어렵다.
- GitHub Security 페이지 기준 별도 `SECURITY.md` 정책이 없다.
- 보안 Skill 하나만으로 전문 보안 리뷰를 대체해서는 안 된다.

## 활용 사례

### 바로 적용 가능

웹/API 프로젝트의 `.claude/skills` 또는 `.agents/skills`에 project-level로 설치해 인증, API, 사용자 입력, 파일 업로드, DB 접근 코드를 작성할 때 보안 기본 규칙으로 사용한다.

### PoC 가치 있음

AI 코드 리뷰 파이프라인에서 일반 Reviewer와 별도로 `Security Reviewer` 단계에 VibeSec을 적용할 가치가 있다. 특히 Claude가 구현하고 Codex가 리뷰하는 구조라면 리뷰 에이전트에만 VibeSec을 로드해 토큰 비용을 제한할 수 있다.

```text
Requirement
   -> Coding Agent
   -> Tests
   -> Security Reviewer + VibeSec
   -> General Reviewer
   -> Human / CI
```

### 아이디어 참고

VibeSec의 가장 중요한 인사이트는 보안 지식을 거대한 공통 프롬프트에 넣는 대신 필요 작업에서 Skill로 주입한다는 점이다. 사내 환경에서는 이를 `web-security`, `dotnet-security`, `perforce-security`, `ci-security`처럼 도메인별 작은 Skill로 분리하는 방식이 더 효율적일 수 있다.

## 기존 도구와 비교

| 방식 | VibeSec | SAST/Semgrep/CodeQL | 일반 보안 프롬프트 |
|---|---|---|---|
| 적용 시점 | 생성/리뷰 중 | 주로 작성 후 분석 | 생성/리뷰 중 |
| 실행 엔진 | LLM | 정적 분석 엔진 | LLM |
| 설치 부담 | 매우 낮음 | 중간 | 매우 낮음 |
| 공격 맥락 설명 | 강점 | 규칙에 따라 다름 | 프롬프트 품질 의존 |
| 재현성 | LLM 의존 | 높음 | LLM 의존 |
| 보안 게이트 용도 | 단독 사용 부적합 | 적합 | 부적합 |

따라서 경쟁 관계보다는 **VibeSec으로 생성 단계 예방 + Semgrep/CodeQL 등으로 결정론적 검사 + 사람/에이전트 리뷰**의 조합이 적합하다.

## 활용 아이디어

현재 AI Harness 관점에서는 모든 Worker에 전역 설치하기보다 보안 민감 작업과 Review 단계에 선택적으로 활성화하는 것이 적합하다. 이렇게 하면 24KB 수준의 Skill을 불필요한 작업마다 컨텍스트에 넣지 않으면서 보안 품질을 강화할 수 있다.

권장 패턴:

```text
Orchestrator
  |
  +-- normal task --------> Work Agent
  |
  +-- auth/API/web task --> Work Agent + VibeSec
                              |
                              v
                        Security Review
                              |
                         VibeSec + scanner
```

## 결론

**평가: 바로 적용 가능 + Security Reviewer PoC 가치 높음.**

VibeSec은 새로운 보안 엔진이 아니라 잘 정리된 보안 전문 지식을 Agent Skill 형태로 패키징한 프로젝트다. 장점은 가벼운 도입과 구체적인 공격자 관점이며, 한계는 LLM 판단에 의존한다는 것이다. 따라서 단독 보안 게이트보다 Claude/Codex의 코딩·리뷰 품질을 높이는 1차 방어층으로 사용하는 것이 가장 현실적이다.

## 참고 자료

- https://github.com/BehiSecc/VibeSec-Skill
- https://github.com/BehiSecc/VibeSec-Skill/blob/main/SKILL.md
- https://github.com/BehiSecc/VibeSec-Skill/security
