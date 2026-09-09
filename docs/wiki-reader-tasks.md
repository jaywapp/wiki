# 위키 웹 리더 작업 계획

orchestrator: Codex. 같은 작업 트리의 owner는 Codex로 통일한다. 탐색은 낮은 effort, 설계·통합은 높은 effort를 사용한다. 샘플은 공유 데이터·컨트롤을 사용하므로 부모가 순차 작성하며 독립 문서 조사는 서브에이전트에 위임한다.

| ID | 작업 | orchestrator | owner | model | effort | depends_on | parallel_group | files | verification | status |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 저장소 문서 구조 조사 | Codex | Codex | gpt-5.6-sol | low | 없음 | discovery | 읽기 전용 | 실제 문서·링크 표본 | complete |
| B | 분석·설계 초안 | Codex | Codex | gpt-6-astra | high | 초기 탐색 | discovery | docs/wiki-reader-*.md | 요구사항과 근거 대조 | complete |
| C | 공통 시연 기능과 콘셉트 3종 | Codex | Codex | gpt-6-astra | medium | B | sequential | docs/ux-concepts/wiki-reader/** | 반응형·접근성·기능 확인 | complete |
| D | 콘셉트·원본·설계 확인 | Codex | Codex | gpt-6-astra | low | C | sequential | 분석·설계·계획 | 사용자 명시적 선택 | complete |
| E | 운영 사이트와 문서 인덱스 | Codex | Codex | gpt-6-astra | medium | A,D | sequential | web/**, docs/wiki-reader-*.md | 빌드·검색·링크·문서 검증 | complete |
| F | 호스팅과 최종 검증 | Codex | Codex | gpt-6-astra | high | E | sequential | web/**, docs/wiki-reader-*.md | 배포 URL·직접 접근 | complete |

## B 선택 후 운영 작업

| ID | 작업 | orchestrator | owner | model | effort | depends_on | parallel_group | files | verification | status |
|---|---|---|---|---|---|---|---|---|---|---|
| I | 공개 문서 수집기 및 단위 검증 | Codex | Codex | gpt-5.6-sol | medium | B 선택 | production | web/scripts/**, web/tests/content* | 공개 커밋·프론트매터·제외·메타데이터 | complete |
| J | 그래파이트 웹 리더 | Codex | Codex | gpt-6-astra | high | B 선택 | production | web/src/**, web/package*, web/index.html | 검색·필터·정렬·본문·모바일 | complete |
| K | 통합 빌드·배포·검증 | Codex | Codex | gpt-6-astra | high | I,J | sequential | web/vercel.json, docs/wiki-reader-*.md | 빌드·링크·XSS·배포 직접 접근 | complete |

I/J는 계약을 공유하되 파일 소유권을 나눠 병렬 처리한다. 루트 패키지와 공유 문서는 부모만 수정한다.

## 샘플 검증 결과

## 카탈로그 스타일 추가 비교

공통 동작과 스타일 기반을 공유하므로 같은 파일의 동시 편집을 피하고 부모가 순차 작성한다.

| ID | 작업 | orchestrator | owner | model | effort | depends_on | parallel_group | files | verification | status |
|---|---|---|---|---|---|---|---|---|---|---|
| G | 카탈로그 스타일 3종 및 모바일 이동 | Codex | Codex | gpt-6-astra | medium | C, 사용자 카탈로그 지정 | sequential | docs/ux-concepts/wiki-reader/catalog-*/**, catalog-variants.* | 동일 기능·반응형·키보드 | complete |
| H | 추가 시안 캡처와 비교 제공 | Codex | Codex | gpt-6-astra | high | G | sequential | 각 시안 preview/mobile-*.png | 1440px·390px, 목록·본문 | complete |

### 이전 검증

- 모바일 이용 빈도가 높다는 사용자 피드백 기록. 세 시안의 390×844 탐색/본문 화면 총 6장을 각 concept 디렉터리의 mobile-browse.png, mobile-read.png로 제공.

- app.js/data.js 구문 검사 및 git diff --check 통과.
- HTTP 200, 세 화면 데스크톱 1440px·모바일 390px 확인. 모바일 가로 넘침 없음.
- 제목·본문 검색, 필터 교집합, 무결과·초기화, 트리/목록 전환, 날짜/제목 정렬, 문서 선택 확인. 브라우저 오류 로그 없음.
- 모바일 분류 배치와 예시 코드의 불필요한 문자를 한 차례 수정 후 확인.
- 시안에는 실제 저장소 동기화·완전한 Markdown 렌더러가 없으며 운영 빌드·배포는 아직 실행하지 않음.
- 로컬 미리보기: http://127.0.0.1:4317/ (포트 4317, Python 정적 서버). 다른 컴퓨터에서 접속하는 공개 URL이 아님.
- 기존 README와 기존 작업 문서는 보존. docs/README.md에는 이번 문서 링크만 추가했다. 이 시점의 샘플 검증에는 commit/push가 없었다.

### 카탈로그 추가 검증 결과

- A/B/C 모두 390×844 모바일 및 1440×1050 데스크톱 캡처 제공.
- 세 모바일 문서 너비 375px, 뷰포트 390px으로 가로 넘침 없음.
- 하단 본문 이동, 탐색 복귀, WPF 검색어 유지, 트리 검색 System.IO 1건 확인.
- 추가 JS 구문 검사 통과, 브라우저 오류 로그 없음. 정적 샘플 단계이며 운영 배포는 미실행.

## 운영 최종 검증 (2026-09-08)

- I/J 병렬 작업을 통합한 뒤 K를 순차 완료했다. 사용자가 B 그래파이트를 선택하여 D 게이트를 해제했다.
- 공개 develop 커밋 15a426bf456eecb185c4ac39dc774ee97af5a69e에서 145개 문서 수집.
- 테스트 20개 통과: 검색/필터/정렬/트리/이전 링크/프론트매터/HTML 차단/설명 정리/전체 145개 렌더링.
- Vite 빌드 성공. Mermaid 지연 청크 크기 경고는 운영 안내에 기록.
- Vercel production 배포 READY, https://jaywapp-wiki.vercel.app 루트 HTTP 200 및 공개 content.json 145개 확인.
- 공개 사이트 모바일 390×844에서 System.IO 검색, 문서 선택, 직접 주소 새로고침, 목록 복귀 검증. 본문 너비 375px로 가로 넘침 없음.
- 로컬 통합 검증에서 필터 교집합/무결과/초기화/트리 11개 결과/표/Mermaid SVG 2개 및 오류 없음 확인.
- 최종 산출물: web/**, docs/wiki-reader-guide.md, production-mobile-*.png. 사용자 기존 변경 보존.
- 커밋 `88dc2a6`을 `origin/codex/workspace-environment-20260904`에 푸시하고 최신 목록 기능을 production에 반영했다.
- 자동 Git 배포는 Vercel GitHub 권한 승인 전까지 미연결이다. 승인 후 `develop` push와 PR preview를 자동화한다.
