---
title: book-to-skill
category: skills
tags:
  - ai
  - agent-skills
  - claude-code
  - context-engineering
  - knowledge-management
  - token-optimization
source: https://github.com/virgiliojr94/book-to-skill
updated: 2026-09-13
---

# book-to-skill

> 기술 서적·문서 묶음을 에이전트가 필요할 때만 부분 로드하는 재사용 가능한 Agent Skill로 컴파일하는 도구다.

## 프로젝트 개요

`book-to-skill`은 PDF/EPUB/DOCX/HTML/Markdown 등 문서를 구조화된 Agent Skill로 변환한다. 단순 요약본을 만드는 것이 아니라 핵심 mental model, chapter index, glossary, patterns, cheatsheet와 장별 파일을 생성하고, Claude Code·GitHub Copilot CLI·Amp·Hermes 등 호환 호스트가 필요한 파일만 읽도록 설계한다.

## 해결하려는 문제

긴 책이나 내부 문서를 매 세션 컨텍스트에 넣으면 토큰 비용이 크고, 에이전트가 매번 목차와 관련 장을 다시 탐색하는 Discovery Loop가 반복된다. 반대로 짧은 노트 하나로 압축하면 세부 근거와 구조가 사라진다. 이 프로젝트는 변환 시점에 구조화 비용을 한 번 지불하고 실행 시점에는 관련 장만 로드하는 compile-time over runtime 접근을 사용한다.

## 핵심 기능

- PDF, EPUB, DOCX, HTML, RTF, Markdown, reStructuredText, AsciiDoc, MOBI/AZW 계열 등 다중 포맷 추출
- 파일 하나뿐 아니라 폴더·glob·복수 소스를 하나의 Skill로 통합
- `SKILL.md`에 핵심 mental model과 chapter/topic index 생성
- `chapters/*.md`를 필요 시에만 읽는 progressive/on-demand disclosure
- `glossary.md`, `patterns.md`, `cheatsheet.md` 생성
- reference/study 목적과 technical/text 유형에 따른 장별 깊이 조절
- 기존 Skill에 새로운 자료를 fold-in/update하는 워크플로우
- Claude/Copilot/Amp/Hermes 렌즈를 통한 Skill 검증
- 생성 Skill에 대한 prompt-injection 패턴 스캔

## 아키텍처

```text
PDF / EPUB / DOCX / Docs folder
            |
            v
+-------------------------------+
| Deterministic Python Extractor|
| parsers / sanitize / metadata |
+-------------------------------+
            |
            | full_text.txt
            | metadata.json
            v
+-------------------------------+
| Agent follows SKILL.md spec   |
| structure -> depth -> compile |
+-------------------------------+
            |
            v
<skills-home>/<slug>/
  SKILL.md          (~4K core/index)
  chapters/*.md     (~1K each, on demand)
  glossary.md
  patterns.md
  cheatsheet.md
            |
            v
Claude Code / Copilot CLI / Amp / Hermes
       relevant chapter only
```

구조는 크게 deterministic extractor와 spec-driven generator 두 부분이다. Python 계층은 문서를 clean text와 metadata로 바꾸며, 실제 의미 분석과 Skill 생성은 에이전트가 `SKILL.md`에 정의된 절차를 따라 수행한다. 즉 문서 파싱 자체는 재현 가능한 코드이고, 지식 구조화는 LLM의 의미 이해를 활용하는 하이브리드 구조다.

## Token / Cost

프로젝트가 공개한 `tiktoken` 기반 측정에서는 질문 하나에 전체 책을 컨텍스트로 넣는 방식 대비 약 24~51배 적은 입력 토큰을 사용한다고 보고한다. 예를 들어 약 119K~256K 토큰 책을 통째로 넣는 대신 resident core 약 4K + 관련 chapter 약 1K, 총 약 5K 토큰을 목표로 한다. 자체 Discovery Loop 모델과 비교한 절감 폭은 약 2.4~15.6배다.

다만 이는 일반적인 RAG 시스템 전체와의 벤치마크가 아니라 저장소가 정의한 context-dump/discovery-loop 모델과의 비교다. 따라서 숫자를 모든 환경에 그대로 일반화하면 안 된다.

Skill 생성 자체는 전체 문서를 한 번 분석해야 하므로 초기 비용이 존재한다. 공개 예시에서는 Sonnet 4.5 가격 가정으로 책 한 권당 대략 1달러 전후의 생성 비용을 제시한다. 반복 참조 횟수가 많을수록 이 선행 비용을 상쇄하기 쉽다.

## 장점

- 긴 문서를 매번 재탐색하지 않고 지식 구조를 재사용할 수 있다.
- 단일 거대 `SKILL.md` 대신 장별 파일로 나눠 컨텍스트 사용량을 억제한다.
- 단순 vector retrieval과 달리 framework, decision rule, anti-pattern, cheatsheet 같은 사람이 활용하기 좋은 지식 형태를 미리 생성한다.
- Agent Skills 표준을 이용해 특정 호스트 하나에만 묶이지 않는 방향을 취한다.
- extractor와 generator를 분리해 문서 파싱 실패와 LLM 분석 단계를 구분하기 쉽다.
- 로컬 추출을 기본으로 하며 zero-width 문자 제거, DOCX XML 공격 방어, 생성 Skill 스캔 등 document-to-agent 공급망 보안을 의식하고 있다.

## 단점 및 한계

- 생성 단계는 결국 LLM 기반이므로 잘못된 요약·분류·누락 가능성이 사라지지 않는다.
- 코드·표가 많은 PDF는 `pdftotext` 사용 시 구조가 손실될 수 있다. 프로젝트 측 측정에서도 technical mode의 Docling은 구조 보존이 좋지만 훨씬 느렸다.
- 한국어 장 제목 감지(`제N장`) 관련 open issue가 있어 한국어 서적에서는 자동 chapter segmentation을 검증할 필요가 있다.
- 최초 변환 시 전체 문서를 분석하므로 일회성 문서에는 오히려 비용/시간 대비 이점이 작을 수 있다.
- 원본 문서가 갱신되면 Skill도 다시 fold-in/update해야 하므로 최신성 관리가 필요하다.
- 사내 기밀 문서는 추출이 로컬이어도 실제 generator로 사용하는 cloud model의 데이터 처리 정책을 별도로 확인해야 한다.
- 저작권 있는 책으로 만든 Skill을 외부에 배포하는 것은 별도의 저작권 문제가 될 수 있다.

## 활용 사례

### 바로 적용 가능

- Claude Code에서 반복 참조하는 기술 서적을 개인 Skill로 변환
- 사내 개발 가이드·코딩 규칙·운영 문서를 프로젝트 Skill로 구조화
- Perforce/UE5/TeamCity처럼 여러 문서에 흩어진 운영 지식을 하나의 reference Skill로 통합
- AI/AX Knowledge Base의 긴 research 문서를 실행용 Skill로 별도 컴파일

### PoC 가치 있음

개인/회사 Harness에서 `docs -> book-to-skill -> skills` 파이프라인을 만들 가치가 높다. 특히 root orchestrator가 모든 문서를 직접 읽지 않고, 작업별 Skill index를 보고 필요한 chapter만 가져오도록 하면 컨텍스트 예산을 더 예측 가능하게 관리할 수 있다.

```text
Knowledge Sources
      |
      v
book-to-skill compiler
      |
      +--> ue5-development skill
      +--> perforce-operations skill
      +--> teamcity-ci skill
      +--> internal-tools skill
                 |
                 v
        Root Orchestrator
                 |
        topic/chapter routing
                 |
                 v
           Worker Agent
```

### 아이디어 참고

핵심 인사이트는 "문서를 검색 가능하게 만들기"보다 "에이전트가 소비하기 좋은 실행 지식으로 사전 컴파일하기"다. 이 패턴은 책뿐 아니라 Wiki, ADR, 장애 대응 문서, 프로젝트 회고에도 적용할 수 있다.

### 현재는 도입 가치 낮음

한 번만 읽을 문서, 매우 짧은 문서, 항상 최신 원본을 직접 확인해야 하는 데이터에는 변환·동기화 비용이 더 클 수 있다.

## 기존 방식과 비교

| 방식 | 장점 | 약점 | 적합한 상황 |
|---|---|---|---|
| 전체 문서 Context Dump | 구현이 가장 단순 | 토큰 비용과 반복 입력이 큼 | 짧은 문서/일회성 분석 |
| PDF/파일 검색 | 원문 접근 쉬움 | 매 질문마다 탐색 반복 | 원문 확인 중심 |
| 일반 RAG | 대규모 자료 검색에 유리 | chunk 품질·retrieval 설계 필요 | 많은 문서에서 사실 검색 |
| book-to-skill | 구조·규칙을 미리 컴파일하고 부분 로드 | 초기 생성비용·갱신 관리 | 반복 참조하는 기술 지식 |

RAG의 완전한 대체라기보다 반복적으로 사용하는 bounded knowledge를 Agent Skill로 컴파일하는 계층으로 보는 것이 적절하다. 대규모 동적 지식은 RAG, 안정적인 핵심 운영 지식은 Skill이라는 하이브리드 구성이 실용적이다.

## 결론

`book-to-skill`의 가치가 가장 큰 부분은 PDF 변환 자체보다 **compile-time knowledge structuring + runtime progressive disclosure** 패턴이다. 반복적으로 참조하는 기술 자료가 많고 Claude Code/Codex 계열 Harness의 컨텍스트 비용을 관리하려는 환경이라면 PoC 가치가 높다. 특히 장기적으로는 Wiki를 사람용 Knowledge Base로, 생성 Skill을 Agent 실행용 Knowledge Layer로 분리하는 구조에 활용하기 좋다.

## 참고 자료

- Repository: https://github.com/virgiliojr94/book-to-skill
- Architecture: https://github.com/virgiliojr94/book-to-skill/blob/master/docs/architecture.md
- Performance: https://github.com/virgiliojr94/book-to-skill/blob/master/docs/performance.md
- Releases: https://github.com/virgiliojr94/book-to-skill/releases
- Issues: https://github.com/virgiliojr94/book-to-skill/issues
