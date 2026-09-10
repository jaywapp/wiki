---
title: 실무 Agent Skills 추천 목록 분석
category: skills
tags:
  - ai
  - agent
  - skills
  - claude-code
  - codex
  - workflow
source: Instagram screenshots + original GitHub repositories
updated: 2026-09-10
---

# 실무 Agent Skills 추천 목록 분석

> SNS에서 추천된 Agent Skill 중 개발 생산성·메모리·커뮤니케이션·성장 영역을 원본 저장소 기준으로 검증하고, 실제 개발 환경에서의 도입 우선순위를 정리한다.

## 프로젝트 개요

2026-09-10 공유된 이미지에서 확인되는 추천 Skill은 다음과 같다.

- 엔지니어링: `code-review-and-quality`, `evals-skills`, `mcp-builder`, `prompt-engineering`, `superpowers`, `webapp-testing`
- 메모리: `obsidian-skills`, `planning-with-files`
- 커뮤니케이션: `atomic-mail-agentic`, `internal-comms`
- 성장·발굴: `claude-seo`, `skill-creator`

이미지에 보이지 않는 CATEGORY 02/05 및 마지막 슬라이드의 항목은 본 문서 범위에서 제외했다.

## 핵심 판단

추천 목록 전체를 그대로 설치하기보다는 **범용 실행 규율 → 지속 계획/메모리 → 검증 → 전문 작업** 순으로 계층화하는 편이 효율적이다.

```text
요청
  ↓
[계획/상태] planning-with-files
  ↓
[구현 규율] superpowers / 프로젝트 전용 skill
  ↓
[전문 작업] mcp-builder / webapp-testing / evals-skills
  ↓
[품질 게이트] code-review-and-quality
  ↓
[외부 업무] atomic-mail-agentic / internal-comms

지식 저장소가 필요할 때: obsidian-skills
Skill 자체를 개선할 때: skill-creator
SEO 업무가 있을 때만: claude-seo
```

## Skill별 평가

### code-review-and-quality

원본 계열: `addyosmani/agent-skills`

정확성, 가독성, 아키텍처, 보안, 성능의 5개 축으로 변경을 검토하고 merge 전 품질 게이트를 만드는 Skill이다. 단순 스타일 리뷰보다 리뷰 기준을 고정한다는 점이 핵심이다.

**평가: 바로 적용 가능.** 구현 Agent와 Reviewer를 분리하는 Harness에서 Reviewer의 기본 체크리스트로 쓰기 좋다. 다만 프로젝트 고유 규칙과 정적 분석/테스트 결과를 추가하지 않으면 일반론적 리뷰가 될 수 있다.

### evals-skills

원본: `hamelsmu/evals-skills` 및 후속 `ai-evals-course/evals-skills`

LLM 제품의 eval pipeline을 감사하고, failure 분석, synthetic data, LLM-as-Judge, evaluator 검증, RAG 평가 등을 지원한다. foundation-model benchmark가 아니라 **제품/에이전트 동작의 평가 체계**에 초점이 있다.

**평가: PoC 가치 높음.** AI 코드리뷰나 사내 Agent 품질을 감으로 평가하지 않고 회귀 테스트 가능한 eval로 바꾸는 데 유용하다. 일반 애플리케이션 테스트를 대체하지는 않는다.

### mcp-builder

원본: `anthropics/skills/skills/mcp-builder`

MCP 서버를 research → implementation → testing → evaluation 단계로 만드는 공식 Skill이다. TypeScript MCP SDK와 Python/FastMCP를 다루며 tool naming, schema, pagination, error message, tool annotation 및 MCP 자체 평가까지 포함한다.

**평가: 바로 적용 가능.** 사내 Perforce/TeamCity/업무 API를 MCP로 노출할 때 특히 가치가 높다. 단순 서버 코드 생성보다 “LLM이 실제로 잘 사용할 수 있는 tool surface”를 설계하는 가이드라는 점이 중요하다.

### prompt-engineering

이미지에는 이름이 있으나, 조사 시점 기준 `anthropics/skills`에는 Claude 전용 공식 `prompt-engineering` Skill을 요청하는 공개 Issue가 존재하며 공식 Skill 자체는 확인되지 않았다. 동명 커뮤니티 Skill이 다수 존재하므로 **출처를 확인하지 않고 설치하면 안 된다.**

**평가: 출처 확인 전 보류.** 최신 모델별 공식 prompting 문서와 쉽게 충돌하거나 노후화될 수 있다.

### superpowers

원본 계열: `obra/superpowers`

계획, TDD, 디버깅, 실행 규율을 Agent workflow에 강제하는 범용 Skill 묶음이다. 구현 전에 계획하고 검증하는 습관을 Agent에 주입하는 성격이라 개별 기술 Skill보다 상위 레이어에 가깝다.

**평가: 바로 적용 가능하나 기존 Harness와 중복 검토 필요.** 이미 Orchestrator/Analysis/Work/Review 단계가 명확한 환경에서는 전체 도입보다 필요한 규율만 가져오는 편이 낫다.

### webapp-testing

원본: `anthropics/skills`

브라우저를 실제로 조작해 로컬 웹 앱의 동작, 스크린샷, 콘솔/브라우저 상태를 확인하는 테스트 Skill이다.

**평가: 웹 UI 프로젝트라면 바로 적용 가능.** WPF/UE Editor 중심 작업에는 우선순위가 낮고 Blazor/dashboard 같은 웹 프론트 검증에는 유용하다.

### obsidian-skills

원본: `kepano/obsidian-skills`

Obsidian Markdown, Bases, JSON Canvas 및 vault 작업을 Agent가 수행하도록 만드는 Skill 모음이다. 단순 “기억”이라기보다 **Obsidian vault를 canonical knowledge store로 조작하는 인터페이스**에 가깝다.

**평가: Obsidian을 실제 KB로 쓸 때만 바로 적용.** GitHub Wiki/Markdown을 이미 SoT로 쓰는 환경에서는 저장소가 이원화될 수 있다.

### planning-with-files

원본: `OthmanAdi/planning-with-files`

장기 작업의 계획, 발견 사항, 진행 상태를 Markdown 파일에 외부화해 `/clear`, context compaction, 세션 중단 후에도 작업 상태를 복원하는 Manus 스타일 패턴이다.

**평가: 최우선 PoC.** 긴 Claude Code/Codex 작업에서 context rot와 목표 이탈을 줄이는 효과가 기대된다. 다만 모든 작은 작업에 사용하면 파일 I/O와 관리 오버헤드가 커진다.

### atomic-mail-agentic

원본: `Atomic-Mail/atomic-mail-agentic`

AI Agent가 자체 `@atomicmail.ai` inbox를 등록하고 JMAP으로 읽기/쓰기/검색/회신하는 Agent 전용 이메일 인프라다. MCP, AgentSkill, REST, LangChain 등의 통합을 제공한다. 가입에는 PoW를 사용하며 Agent가 사람의 OAuth/CAPTCHA 없이 inbox를 만들 수 있게 설계됐다.

**평가: 아이디어/PoC 가치 있음.** newsletter 수집, support inbox, 비동기 인터뷰 같은 독립 Agent에 유용하다. 회사 메일을 직접 다루는 용도라면 기존 Gmail/Exchange 권한 체계와 보안 정책을 우선해야 한다. inbound email은 prompt injection을 포함한 비신뢰 입력으로 취급해야 한다.

### internal-comms

원본: `anthropics/skills`

상태 보고, 리더십 업데이트, FAQ, newsletter, incident communication 등 사내 커뮤니케이션 문서 작성 패턴을 제공하는 Skill이다.

**평가: 바로 적용 가능하지만 ROI는 중간.** 기술적 실행 능력보다 산출물 형식을 표준화하는 용도다. 조직별 보고서 템플릿으로 커스터마이징할수록 가치가 커진다.

### claude-seo

원본: `AgriciDaniel/claude-seo`

기술 SEO, E-E-A-T, Schema.org, GEO/AEO, local/e-commerce/international SEO 등을 다루는 대형 Claude Code 플러그인이다. 조사 시점 공개 저장소 설명 기준 25개 sub-skill과 18개 specialist agent를 병렬 활용한다.

**평가: 현재 개발 생산성 목적에는 도입 가치 낮음.** SEO/마케팅 프로젝트가 생겼을 때 별도 설치하는 전문 Skill로 보는 것이 맞다. 범용 Harness에 상주시킬 이유는 적다.

### skill-creator

원본: `anthropics/skills`

반복 작업을 재사용 가능한 Agent Skill로 설계·작성·검증하는 메타 Skill이다.

**평가: 최우선 적용 후보.** 사내 Perforce, TeamCity, UE5, 코드리뷰 규칙처럼 일반 공개 Skill보다 조직 특화 지식이 중요한 환경에서 특히 유용하다. 외부 Skill을 계속 추가하는 것보다 검증된 내부 절차를 작은 Skill로 승격시키는 방식이 장기적으로 낫다.

## 장점

- 반복 업무를 prompt 복붙이 아닌 버전 관리 가능한 실행 규칙으로 만든다.
- Agent별 품질 편차를 줄이고 작업 단계/검증 기준을 표준화할 수 있다.
- planning/eval/review 같은 메타 Skill은 특정 언어나 프레임워크에 덜 종속된다.
- 공개 Skill을 참고해 조직 전용 Skill을 빠르게 설계할 수 있다.

## 단점 및 한계

- Skill을 많이 설치할수록 description/metadata 탐색 및 instruction 충돌 가능성이 증가한다.
- 비슷한 역할의 Skill을 중복 설치하면 어느 규칙이 우선인지 불명확해진다.
- 인기/별점은 실제 코드베이스 적합성을 보장하지 않는다.
- Skill 문서가 오래되면 최신 Claude/Codex 동작 및 공식 권장사항과 충돌할 수 있다.
- 외부 Skill의 shell script, hook, MCP, package install은 공급망 보안 검토가 필요하다.
- 메모리/계획 Skill은 작은 작업까지 적용할 경우 오히려 context와 파일을 늘린다.

## 기존 Harness에 적용하는 방법

기존 Orchestrator → Analysis → Work → Review 구조를 유지한다면 Skill을 Agent 역할별로 제한하는 것이 좋다.

| 단계 | 추천 | 비고 |
|---|---|---|
| Orchestrator | planning-with-files | 긴 작업에서만 상태 외부화 |
| Analysis | 프로젝트 전용 분석 Skill | 범용 Skill 남발 금지 |
| Work | mcp-builder, webapp-testing 등 | task domain에 따라 lazy-load |
| Review | code-review-and-quality, evals-skills | 코드 품질 + AI 동작 평가 분리 |
| Meta | skill-creator | 반복 패턴을 내부 Skill로 승격 |

핵심은 **모든 Skill을 모든 Agent에게 주지 않는 것**이다. 역할별로 필요한 Skill만 노출해야 context 비용과 지시 충돌을 줄일 수 있다.

## 도입 우선순위

1. **바로 적용:** `skill-creator`, `code-review-and-quality`, `mcp-builder`
2. **PoC 최우선:** `planning-with-files`, `evals-skills`
3. **조건부 적용:** `webapp-testing`, `internal-comms`, `obsidian-skills`, `superpowers`
4. **특정 업무 전용:** `atomic-mail-agentic`, `claude-seo`
5. **출처 확인 필요:** 이미지의 `prompt-engineering`

## 결론

이 추천 목록에서 개발 생산성 관점의 핵심은 Skill 개수를 늘리는 것이 아니다. `planning-with-files`로 상태를 외부화하고, `skill-creator`로 조직의 반복 절차를 Skill화하며, `code-review-and-quality`/`evals-skills`로 검증 루프를 만드는 조합이 가장 실용적이다.

특히 기존 멀티-Agent Harness가 있다면 `superpowers` 같은 완성형 workflow를 통째로 겹쳐 쓰기보다 필요한 규율만 선택적으로 흡수하고, 역할별 Skill lazy-loading을 적용하는 편이 낫다.

## 참고 자료

- https://github.com/addyosmani/agent-skills
- https://github.com/hamelsmu/evals-skills
- https://github.com/ai-evals-course/evals-skills
- https://github.com/anthropics/skills
- https://github.com/obra/superpowers
- https://github.com/kepano/obsidian-skills
- https://github.com/OthmanAdi/planning-with-files
- https://github.com/Atomic-Mail/atomic-mail-agentic
- https://github.com/AgriciDaniel/claude-seo
