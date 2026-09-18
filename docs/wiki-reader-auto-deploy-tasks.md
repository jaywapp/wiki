# 위키 리더 자동 배포 — 작업

`orchestrator`: Claude

| # | 작업 | owner | model | effort | depends_on | parallel_group | files | verification | status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 워크플로 리뷰(정확성) | Claude | opus | high | - | review | - | 리뷰 보고 | done |
| 2 | 워크플로 리뷰(보안) | Claude | opus | high | - | review | - | 리뷰 보고 | done |
| 3 | 워크플로 하드닝: 가드 단계, 테스트 게이트, 구운 인덱스 확인, 라이브 검증 재시도, SHA 고정, 권한·타임아웃, 빌드 단계 토큰 제거 | Claude | opus | medium | 1,2 | - | `.github/workflows/deploy-wiki-reader.yml` | YAML 파싱, 액션 SHA·CLI 버전 실재 확인 | done |
| 4 | `/assets/*` immutable 캐시 헤더 추가 | Claude | opus | low | 1 | docs | `web/vercel.json` | JSON 파싱 | done |
| 5 | 문서 정합성 수정: 수동 배포가 유일하다는 문장, 토큰 범위·교체 안내, Root Directory 전환 시 워크플로 제거, Linux 러너 검증 표기 | Claude | opus | low | 1,2 | docs | `docs/wiki-reader-guide.md`, `tools/vercel-build-time-content-stale-trap.md` | 문서 재확인 | done |
| 6 | 분석·설계·작업 문서 작성 | Claude | opus | low | 3,4,5 | docs | `docs/wiki-reader-auto-deploy-*.md`, `docs/README.md` | 인덱스 링크 확인 | done |
| 7 | 커밋·push·PR #14 병합 | 사용자 승인 후 Claude | opus | low | 3,4,5,6 | - | - | PR 병합 | done (`c14ccaf`) |
| 8 | 첫 실행 검증: 각 단계 통과, 라이브 `content.json` 커밋 일치 | Claude | opus | low | 7 | - | - | Actions 로그, 라이브 인덱스 조회 | failed (2026-09-19 확인: 64회 전부 `vercel pull` 실패, 성공 0회. 병합 후 검증이 누락됐다) |
| 9 | (선택) 토큰을 `production` Environment 시크릿으로 이전하고 배포 브랜치 제한 | 사용자 | - | low | 8 | - | - | 워크플로 재실행 | 폐기 (방식 B 전환) |
| 10 | (선택) CSP Report-Only, develop 삭제·강제 push 금지 규칙, `installCommand: npm ci` | 사용자 판단 | - | low | 8 | - | - | - | 제안 |

작업 3·4·5는 같은 PR 브랜치의 서로 다른 파일이라 순서대로 처리했다. 작업 1·2는 읽기 전용이라 병렬로 실행했다.

## 2026-09-19 전환: B. Vercel Git 연동

`orchestrator`: Claude

| # | 작업 | owner | model | effort | depends_on | parallel_group | files | verification | status |
|---|---|---|---|---|---|---|---|---|---|
| 11 | 워크플로 실패 원인 조사: 실행 이력, 실패 단계, 라이브 인덱스 커밋 | Claude | opus | medium | - | - | - | `gh run list/view`, 라이브 `content.json` 조회 | done |
| 12 | Vercel GitHub App Repository access에 `wiki` 추가 | 사용자 | - | low | - | - | - | Vercel `search-repo`에서 `jaywapp/wiki` 조회 | done |
| 13 | Root Directory `.` → `web` | Claude | opus | low | 12 | - | Vercel 프로젝트 설정 | 프로젝트 API `rootDirectory` | done |
| 14 | Git 연결(`vercel git connect <url>`) | Claude | opus | low | 13 | - | Vercel 프로젝트 설정 | 프로젝트 API `link.repo` | done |
| 15 | Production Branch `master` → `develop` | Claude | opus | low | 14 | - | Vercel 프로젝트 설정 | 프로젝트 API `link.productionBranch` 재조회 | done |
| 16 | 워크플로 비활성화 | Claude | opus | low | 14 | - | - | `gh workflow list` = `disabled_manually` | done |
| 17 | API로 develop production 배포, 라이브 확인 | Claude | opus | low | 15,16 | - | - | 배포 `READY`, 라이브 `commit` = `9cf0dbf`, 문서 237개 | done |
| 18 | 워크플로 파일 삭제, 가이드·트러블슈팅·자동 배포 문서 갱신 | Claude | opus | low | 17 | - | `.github/workflows/deploy-wiki-reader.yml`, `docs/wiki-reader-guide.md`, `tools/vercel-build-time-content-stale-trap.md`, `docs/wiki-reader-auto-deploy-*.md` | 문서 재확인, `git diff` | done |
| 19 | 커밋·push·PR 생성 | Claude | opus | low | 18 | - | - | PR 열림 | done (사용자 요청) |
| 20 | 병합 push로 자동 배포 확인: Vercel 배포 생성, 라이브 `commit` = 병합 커밋 | Claude | opus | low | 19 | - | - | 프로젝트 배포 목록, 라이브 `content.json` | todo (PR 병합 후) |
| 21 | 저장소 시크릿 `VERCEL_TOKEN`·`VERCEL_ORG_ID`·`VERCEL_PROJECT_ID` 삭제, Vercel 토큰 revoke | 사용자 | - | low | 16 | - | - | `gh secret list` | 제안 |
| 22 | (선택) Build Command에 `npm test` 추가, preview 브랜치 제한 | 사용자 판단 | - | low | 20 | - | `web/vercel.json` 또는 Vercel 설정 | preview 배포로 확인 | 제안 |

작업 13~17은 같은 Vercel 프로젝트 설정을 차례로 바꾸는 작업이라 순서대로 처리했다. 작업 15는 연결 직후 `productionBranch`가 `master`로 잡힌 것을 보고 추가했다.
