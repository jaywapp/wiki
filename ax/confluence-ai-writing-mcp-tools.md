# Confluence AI 문서 작성·품질 개선 도구

> 태그: `Confluence` `Rovo` `MCP` `AI Agent` `Documentation` `AX` `Agent Skills` `Claude Skills`

## 한줄 요약

2026년 기준 Confluence 문서 작성 자동화는 **Confluence Rovo + Atlassian 공식 Rovo MCP Server + 문서 품질 Skill** 조합이 가장 실용적이다. 공개 GitHub Skill 중에서는 `borghei/Claude-Skills`의 `confluence-expert`가 문서 구조·정보 설계 측면에서 가장 가깝고, `SpillwaveSolutions/confluence-skill`은 실제 Confluence 게시·변환 계층을 보완하기 좋다.

## 프로젝트 개요

Confluence 문서를 AI로 생성·재작성·요약하고 기존 Jira/Confluence 맥락을 활용하는 공식 기능, MCP 및 공개 Agent Skill을 조사했다.

핵심 후보:

1. Atlassian Rovo / Create with Rovo
2. Atlassian Rovo MCP Server (공식)
3. borghei/Claude-Skills — confluence-expert
4. SpillwaveSolutions/confluence-skill
5. Anthropic claude-tag-plugins — confluence-api
6. dmarreco/skills — confluence-reader / confluence-writer
7. plexusone/mcp-atlassian
8. InfraMCP/atlassian-mcp-server

## 해결하려는 문제

- 빈 페이지에서 문서 구조를 잡는 비용
- 긴 문서의 낮은 가독성과 중복
- 팀마다 다른 제목/섹션/문체
- Jira/기존 Confluence 내용을 다시 복사하는 작업
- 변경사항을 문서에 수동 반영하는 비용
- AI가 생성한 Markdown/HTML을 Confluence 포맷에 안전하게 반영하는 문제
- AI에게 단순히 '문서 작성'을 지시해도 일정 수준 이상의 정보 구조와 가독성을 보장하고 싶은 문제

## 핵심 기능

### Atlassian Rovo

Confluence 내부에서 바로 사용할 수 있는 AI 작성·편집 계층이다. 프롬프트 기반 콘텐츠 생성, 기존 콘텐츠를 이용한 작성, 선택 영역 재작성·요약 등에 적합하다.

### Atlassian Rovo MCP Server

Atlassian 공식 원격 MCP 서버로 Confluence/Jira의 검색·읽기·쓰기를 외부 AI Agent와 연결하는 I/O 계층이다. OAuth와 기존 Atlassian 권한 체계를 활용할 수 있다는 것이 핵심 장점이다.

공식 저장소: https://github.com/atlassian/atlassian-mcp-server

## 공개 GitHub Confluence Skill

### 1. borghei/Claude-Skills — confluence-expert

현재 조사한 공개 Skill 가운데 **'Confluence 문서를 잘 구성하는 방법'이라는 목적에 가장 가까운 후보**다.

- Confluence page architecture
- documentation architecture
- macros
- templates
- content organization
- knowledge management
- content governance
- 별도 playbook/templates/red-flags 레퍼런스 활용

즉 API 호출법보다 **문서 구조와 지식 관리 방법론**에 더 가깝다. 자체 `confluence-writer`를 만든다면 가장 먼저 참고할 베이스 Skill이다.

https://github.com/borghei/claude-skills/blob/main/project-management/confluence-expert/SKILL.md

### 2. SpillwaveSolutions/confluence-skill

문서 품질 규칙보다는 **작성된 콘텐츠를 실제 Confluence 문서로 만드는 실행 계층**이 강하다.

- Markdown ↔ Confluence 변환
- 페이지 생성/업로드
- 이미지 처리
- Mermaid/PlantUML
- Git → Confluence sync
- 문서 크기와 작업 특성에 따라 MCP/REST 방식 활용

`confluence-expert`가 Information Design 역할을 한다면 이 Skill은 Publishing/Rendering 역할로 조합하기 좋다.

https://github.com/SpillwaveSolutions/confluence-skill

### 3. Anthropic claude-tag-plugins — confluence-api

Confluence Cloud를 Agent가 안정적으로 조작하기 위한 API 중심 Skill이다.

- 검색/읽기
- 페이지 생성·수정
- 댓글/첨부/라벨
- Confluence Storage XHTML
- ADF 처리

가독성 개선 Skill이라기보다는 **Confluence API Adapter Skill**에 가깝다.

https://github.com/anthropics/claude-tag-plugins/blob/main/confluence/skills/confluence-api/SKILL.md

### 4. dmarreco/skills — confluence-reader / confluence-writer

Confluence 읽기와 쓰기 역할을 Agent Skill로 분리한 구현이다. 역할 분리와 최소 권한 구조를 설계할 때 참고할 가치가 있다.

https://github.com/dmarreco/skills

## MCP 후보

### plexusone/mcp-atlassian

Confluence Storage Format(XHTML)을 안전하게 처리하는 것을 강조하는 MCP 구현이다. 자체 호스팅이나 표현 계층을 세밀하게 제어해야 할 때 후보가 된다.

https://github.com/plexusone/mcp-atlassian

### InfraMCP/atlassian-mcp-server

Confluence/Jira/JSM 모듈을 선택적으로 활성화할 수 있는 커뮤니티 MCP 서버다.

https://github.com/InfraMCP/atlassian-mcp-server

## 아키텍처

권장 구조:

```text
User
  ↓
Claude / ChatGPT / Coding Agent
  ↓
Confluence Writer / Quality Skill
  ├─ 문서 유형 판별
  ├─ Information Architecture
  ├─ TL;DR / Progressive Disclosure
  ├─ 중복 제거
  ├─ 표·콜아웃·코드·다이어그램 판단
  ├─ 문체/용어 통일
  └─ Quality Gate
  ↓
Atlassian Rovo MCP Server
  ├─ Confluence Search/Read/Write
  └─ Jira Search/Read
  ↓
Atlassian Cloud
```

핵심 역할 분리:

- **MCP** = Confluence/Jira 접근 I/O
- **Skill** = 읽기 좋은 문서를 만드는 작성·편집 정책
- **LLM/Agent** = 맥락 이해와 콘텐츠 생성
- **Confluence** = 최종 지식 저장 및 협업 계층

## 장점

- 공개 Skill을 활용하면 처음부터 문서 작성 규칙을 설계할 필요가 없다.
- `confluence-expert`의 문서 구조 방법론을 기반으로 사내 규칙을 추가할 수 있다.
- Publishing/API Skill과 Writing Quality Skill을 분리할 수 있다.
- MCP를 별도 계층으로 두면 Claude, ChatGPT, Codex 등 Agent가 바뀌어도 작성 정책을 재사용할 수 있다.
- 기존 Confluence 문서를 참고한 신규 문서 생성과 개선 자동화로 확장하기 쉽다.

## 단점 및 한계

- 공개 Skill 중 '가독성 최대화'를 완성형 Quality Gate로 제공하는 것은 아직 드물다.
- 프로젝트별 문서 스타일과 사내 규칙은 별도 커스터마이징이 필요하다.
- API/MCP Skill은 접근 기능은 좋지만 문서 품질을 자동으로 보장하지 않는다.
- 자동 Write 권한은 Human-in-the-loop와 최소 권한 정책이 필요하다.
- 공개 Skill은 업데이트 중단 가능성이 있으므로 핵심 규칙은 내부 Skill로 흡수하는 편이 안전하다.

## 기존 도구와 비교

| 후보 | 주 역할 | 문서 구조/가독성 | 게시/수정 | 추천 용도 |
|---|---|---:|---:|---|
| borghei confluence-expert | Information Design | ★★★★★ | ★★☆☆☆ | Writer Skill 베이스 |
| Spillwave confluence-skill | Publishing/Conversion | ★★★☆☆ | ★★★★★ | 게시·이미지·다이어그램 |
| Anthropic confluence-api | API Adapter | ★★☆☆☆ | ★★★★★ | Confluence 조작 |
| dmarreco skills | Reader/Writer 역할 분리 | ★★★☆☆ | ★★★★☆ | Agent 구조 참고 |
| Atlassian Rovo MCP | 공식 I/O 계층 | Agent 의존 | ★★★★★ | 사내 표준 연결 계층 |
| plexusone MCP | 커스텀 MCP | Agent 의존 | ★★★★☆ | 자체 호스팅/포맷 제어 |

## 활용 아이디어

### 공개 Skill을 조합한 confluence-writer

0부터 새로 만드는 대신 다음처럼 구성하는 것이 효율적이다.

```text
borghei/confluence-expert
        │
        ├─ Page Architecture
        ├─ Template
        ├─ Macro
        ├─ Content Organization
        └─ Governance
              +
SpillwaveSolutions/confluence-skill
        │
        ├─ Mermaid
        ├─ Image
        ├─ Markdown Conversion
        └─ Confluence Upload
              +
Internal Quality Rules
        │
        ├─ TL;DR
        ├─ Progressive Disclosure
        ├─ 긴 문단 분리
        ├─ 표 자동 판단
        ├─ Callout 자동 판단
        ├─ Diagram 자동 판단
        ├─ 중복 제거
        ├─ 용어/문체 통일
        └─ 최종 가독성 Review
              ↓
       confluence-writer
```

### 사용 방식

사용자는 복잡한 명령을 몰라도 된다.

```text
이번 장애 원인과 대응 내용을 Confluence 문서로 작성해줘.
```

Skill이 자동으로 문서 유형을 판단하고 정보 구조를 설계한 뒤 Confluence 친화적인 형태로 출력한다.

명시적 모드는 다음 정도로 둘 수 있다.

```text
/confluence-write
/confluence-improve
/confluence-review
```

### Quality Gate

최종 작성 전에 다음 기준을 검사한다.

- 상단에서 핵심 내용을 빠르게 파악할 수 있는가?
- Heading 계층이 논리적인가?
- 긴 문단을 목록/표/섹션으로 변환할 필요가 없는가?
- 중복 정보가 없는가?
- 비교 데이터가 표로 표현되어 있는가?
- 중요한 결정/주의사항이 시각적으로 구분되는가?
- 3단계 이상의 복잡한 흐름은 Diagram이 더 적절하지 않은가?
- 코드/명령어가 일반 본문과 분리되어 있는가?
- 결론과 Action Item이 명확한가?

## 추천 조합

가장 현실적인 조합은 다음이다.

**borghei/confluence-expert + 자체 Quality Rules + Atlassian Rovo MCP**

여기에 실제 Markdown 변환, Mermaid, 이미지, Git sync가 필요하면 **SpillwaveSolutions/confluence-skill**의 구현 아이디어를 추가한다.

이 구조에서는 공개 Skill의 약 60~70%를 재사용하고 나머지를 사내 문서 스타일과 가독성 Quality Gate로 채우는 방식이 효율적이다.

## 참고 링크

- Atlassian Rovo MCP Server: https://github.com/atlassian/atlassian-mcp-server
- borghei confluence-expert: https://github.com/borghei/claude-skills/blob/main/project-management/confluence-expert/SKILL.md
- SpillwaveSolutions confluence-skill: https://github.com/SpillwaveSolutions/confluence-skill
- Anthropic confluence-api: https://github.com/anthropics/claude-tag-plugins/blob/main/confluence/skills/confluence-api/SKILL.md
- dmarreco skills: https://github.com/dmarreco/skills
- plexusone MCP: https://github.com/plexusone/mcp-atlassian
- InfraMCP: https://github.com/InfraMCP/atlassian-mcp-server
