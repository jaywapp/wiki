# Confluence AI 문서 작성·품질 개선 도구

> 태그: `Confluence` `Rovo` `MCP` `AI Agent` `Documentation` `AX`

## 한줄 요약

2026년 기준 Confluence 문서 작성 자동화는 **Confluence Rovo + Atlassian 공식 Rovo MCP Server + 외부 AI Agent의 문서 품질 규칙(Skill)** 조합이 가장 실용적이다. MCP는 접근/검색/생성/수정 계층이고, 실제로 읽기 좋은 문서를 만드는 품질 규칙은 별도 Skill/Agent 계층에 두는 것이 좋다.

## 프로젝트 개요

Confluence 문서를 AI로 생성·재작성·요약하고, 기존 Jira/Confluence 맥락을 읽어 신규 문서를 만들거나 지속적으로 갱신할 수 있는 공식 기능과 MCP 생태계를 조사했다.

핵심 후보:

1. Atlassian Rovo / Create with Rovo
2. Atlassian Rovo MCP Server (공식)
3. InfraMCP/atlassian-mcp-server
4. plexusone/mcp-atlassian
5. xuanxt/atlassian-mcp 및 기타 커뮤니티 MCP

## 해결하려는 문제

- 빈 페이지에서 문서 구조를 잡는 비용
- 긴 문서의 낮은 가독성과 중복
- 팀마다 다른 제목/섹션/문체
- Jira/기존 Confluence 내용을 다시 복사하는 작업
- 변경사항을 문서에 수동 반영하는 비용
- AI가 생성한 Markdown/HTML을 Confluence 포맷에 안전하게 반영하는 문제

## 핵심 기능

### 1. Atlassian Rovo

Confluence 내부에서 가장 즉시 사용할 수 있는 선택지다.

- 프롬프트 기반 페이지/Live Doc/Whiteboard/Database/Slides 초안 생성
- 기존 링크와 파일을 컨텍스트로 사용
- 선택 영역 재작성·요약 및 AI 편집
- 템플릿과 결합 가능
- Confluence/Jira 지식을 이용한 콘텐츠 생성
- 2026년에는 콘텐츠 유형별 Rovo Skill 제안과 Create with Rovo 기능이 확대되고 있다.

### 2. Atlassian Rovo MCP Server

Atlassian이 직접 제공하는 공식 원격 MCP 서버다. 2026년 GA.

- Confluence read/write/search
- Jira read/write/search
- JSM, Bitbucket, Compass 연계
- OAuth 2.1/API Token
- 기존 Atlassian 사용자 권한 상속
- IP allowlist 및 관리 정책 지원
- ChatGPT, Claude, Cursor, VS Code 등 외부 AI 클라이언트와 연결 가능

공식 저장소: https://github.com/atlassian/atlassian-mcp-server

### 3. InfraMCP/atlassian-mcp-server

Confluence/Jira/JSM 모듈을 선택적으로 활성화할 수 있는 커뮤니티 MCP 서버. OAuth 기반이며 AI Agent에서 페이지와 프로젝트 컨텍스트를 다루기 좋다.

https://github.com/InfraMCP/atlassian-mcp-server

### 4. plexusone/mcp-atlassian

Confluence Storage Format(XHTML)을 안전하게 다루는 것을 강조한다. Confluence/Jira용 26개 도구, OAuth 2.1 PKCE, Vault 계열 credential 지원과 composable skill 구조가 특징이다.

https://github.com/plexusone/mcp-atlassian

### 5. xuanxt/atlassian-mcp

Confluence 13개, Jira 38개 등 총 51개 도구를 제공하는 범용 MCP 구현. NPM/Docker 배포를 지원한다.

https://github.com/xuanxt/atlassian-mcp

## 아키텍처

권장 구조:

```text
User
  ↓
Claude / ChatGPT / Coding Agent
  ↓
Confluence Quality Skill
  ├─ 문서 유형 판별
  ├─ 구조/스타일 규칙
  ├─ 중복 제거
  ├─ 표·콜아웃·코드·다이어그램 정책
  └─ 품질 점수/리뷰
  ↓
Atlassian Rovo MCP Server
  ├─ Confluence Search/Read/Write
  └─ Jira Search/Read
  ↓
Atlassian Cloud
```

핵심은 **MCP와 Skill의 역할을 분리**하는 것이다.

- MCP = Confluence/Jira에 접근하는 I/O 계층
- Skill = 좋은 문서를 만드는 편집 정책
- LLM/Agent = 맥락 이해와 변환

## 장점

- 공식 MCP 사용 시 별도 Confluence REST 래퍼 개발이 거의 필요 없다.
- 기존 사용자 권한을 그대로 활용하기 쉬움.
- Jira → 설계/장애/릴리스 문서 생성 자동화에 특히 적합.
- Skill을 별도로 두면 Claude, ChatGPT, Codex 등 모델이 바뀌어도 문서 규칙을 재사용할 수 있다.
- 페이지 생성뿐 아니라 기존 문서 품질 개선 워크플로로 확장 가능하다.

## 단점

- Rovo만 사용하면 팀 고유의 문서 스타일을 강하게 강제하기 어렵다.
- MCP 자체는 문서 품질을 보장하지 않는다.
- 자동 수정 권한을 넓게 주면 잘못된 대량 편집 위험이 있다.
- Confluence Storage Format/ADF/매크로 등 표현 계층에서 AI 출력과 실제 렌더링 차이가 발생할 수 있다.
- 사내 데이터 사용 시 외부 AI Client, MCP 인증, 감사로그 및 데이터 정책 검토가 필요하다.

## 기존 도구와 비교

| 후보 | 문서 생성/편집 | 기존 문서 검색 | 자동 게시 | 품질 규칙 커스텀 | 도입 난이도 | 추천 |
|---|---|---|---|---|---|---|
| Rovo | 매우 좋음 | 매우 좋음 | 제한적 | 보통 | 낮음 | ★★★★★ |
| 공식 Rovo MCP | 좋음 | 매우 좋음 | 매우 좋음 | Agent에 위임 | 낮음~중간 | ★★★★★ |
| plexusone MCP | 좋음 | 좋음 | 좋음 | 높음 | 중간 | ★★★★☆ |
| InfraMCP | 좋음 | 좋음 | 좋음 | 높음 | 중간 | ★★★★☆ |
| xuanxt MCP | 좋음 | 좋음 | 좋음 | 높음 | 중간 | ★★★☆☆ |

## 활용 아이디어

### Confluence Quality Skill

직접 만들 가치가 가장 높은 부분이다.

예시 명령:

```text
/confluence-improve <page>
/confluence-create design-doc
/confluence-review <page>
/confluence-sync JIRA-1234
```

Skill이 수행할 작업:

1. 페이지와 하위 페이지 및 관련 Jira 읽기
2. 문서 유형 자동 분류
3. TL;DR 생성
4. H1/H2/H3 구조 재편
5. 긴 문단 분할
6. 중복 내용 병합
7. 핵심 수치/비교는 표로 변환
8. 주의사항/결정사항을 Callout으로 변환
9. 코드/명령은 Code Block으로 변환
10. 흐름 설명은 Mermaid/다이어그램 후보로 변환
11. 용어와 문체 통일
12. 관련 Confluence/Jira 링크 자동 연결
13. 변경 전 Diff 제시
14. 사용자 승인 후 MCP를 통해 업데이트

### 문서 품질 점수

100점 기반 평가를 붙일 수 있다.

- 구조 20
- 가독성 20
- 중복/간결성 15
- 정보 탐색성 15
- 시각화 10
- 링크/근거 10
- 최신성 10

예:

```text
현재 62/100
→ 개선안 88/100
```

### 사내 PoC 추천

1단계: 공식 Atlassian Rovo MCP를 읽기 전용으로 연결
2단계: `/confluence-review` Skill로 품질 평가만 수행
3단계: Diff 기반 수정 제안
4단계: 승인된 페이지만 MCP write 허용
5단계: Jira 상태 변경/릴리스 후 문서 업데이트 Agent 추가

이 방식이면 처음부터 완전 자동화를 하지 않고 Human-in-the-loop를 유지할 수 있다.

## Top 5 추천

1. **Atlassian Rovo MCP Server** — 사내 표준 연결 계층
2. **Confluence Rovo / Create with Rovo** — Confluence 내부 즉시 활용
3. **자체 Confluence Quality Skill** — 가독성과 팀 표준화를 담당
4. **plexusone/mcp-atlassian** — 자체 호스팅/Storage Format 제어가 필요할 때
5. **InfraMCP/atlassian-mcp-server** — 모듈식 Atlassian Agent PoC

## 결론

단순히 'Confluence MCP 하나 설치'로는 읽기 좋은 문서가 자동으로 만들어지지 않는다. 가장 좋은 구조는 **공식 Atlassian MCP를 데이터/실행 계층으로 사용하고, 별도의 Confluence Quality Skill을 문서 편집 정책 계층으로 두는 것**이다.

특히 사내 AX 관점에서는 기존 Jira/Confluence 데이터를 읽고 `검색 → 초안 → 품질 검사 → Diff → 승인 → 업데이트` 흐름을 하나의 Agent workflow로 만드는 것이 효과가 크다.

## 참고 링크

- Atlassian Rovo MCP Server: https://github.com/atlassian/atlassian-mcp-server
- Atlassian Remote MCP 소개: https://www.atlassian.com/blog/announcements/remote-mcp-server
- Rovo MCP GA: https://www.atlassian.com/blog/announcements/atlassian-rovo-mcp-ga
- Confluence Create with Rovo: https://support.atlassian.com/confluence-cloud/docs/create-new-content-items-with-rovo/
- Confluence Rovo writing/editing: https://support.atlassian.com/confluence-cloud/docs/write-or-edit-content-using-atlassian-intelligence/
- InfraMCP: https://github.com/InfraMCP/atlassian-mcp-server
- plexusone MCP: https://github.com/plexusone/mcp-atlassian
- xuanxt MCP: https://github.com/xuanxt/atlassian-mcp
