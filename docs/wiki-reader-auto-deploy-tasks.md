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
| 7 | 커밋·push·PR #14 병합 | 사용자 승인 후 Claude | opus | low | 3,4,5,6 | - | - | PR 병합 | blocked (사용자 확인 대기) |
| 8 | 첫 실행 검증: 각 단계 통과, 라이브 `content.json` 커밋 일치 | Claude | opus | low | 7 | - | - | Actions 로그, 라이브 인덱스 조회 | todo |
| 9 | (선택) 토큰을 `production` Environment 시크릿으로 이전하고 배포 브랜치 제한 | 사용자 | - | low | 8 | - | - | 워크플로 재실행 | 제안 |
| 10 | (선택) CSP Report-Only, develop 삭제·강제 push 금지 규칙, `installCommand: npm ci` | 사용자 판단 | - | low | 8 | - | - | - | 제안 |

작업 3·4·5는 같은 PR 브랜치의 서로 다른 파일이라 순서대로 처리했다. 작업 1·2는 읽기 전용이라 병렬로 실행했다.
