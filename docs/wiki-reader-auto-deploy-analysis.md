# 위키 리더 자동 배포 — 분석

## 요청

`develop`에 push하면 위키 리더 사이트가 자동으로 다시 배포되게 한다.

## 현재 상태와 근거

- 리더는 콘텐츠를 런타임에 읽지 않고 빌드 시점에 `public/content.json`으로 구워 넣는다.
  `web/scripts/sync-content.mjs`는 공개 저장소를 clone해 `develop`의 FETCH_HEAD 시점 문서를 수집한다
  (`BRANCH = "develop"`, `web/scripts/sync-content.mjs:11`).
- Vercel Git 연동이 없어 배포 경로가 워크스테이션의 수동 `vercel deploy --prebuilt` 하나뿐이었다.
  그래서 2026-09-09부터 2026-09-11까지 28개 커밋과 21개 신규 문서가 조용히 미반영으로 쌓였다
  (`tools/vercel-build-time-content-stale-trap.md`).
- 2026-09-11 기준 라이브 인덱스는 수동 배포로 develop HEAD(`31a0f47`, 문서 181개)와 일치한다.
  즉 지금은 최신이지만 다음 push부터 다시 낡는다.
- 저장소 시크릿은 `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`에 이어 2026-09-11 `VERCEL_TOKEN`까지 등록됐다.

## 결정과 근거

| 결정 | 내용 | 근거 |
|---|---|---|
| 배포 방식 | A. GitHub Actions 워크플로 | Vercel 프로젝트의 Root Directory를 건드리지 않아 수동 배포가 예비 경로로 남는다 |
| 비채택 | B. Vercel Git 연동 | Root Directory를 `web`으로 바꿔야 하는데, 그러면 수동 배포와 이 워크플로가 모두 경로 중복으로 깨진다. Vercel GitHub App에 저장소 접근을 추가하려면 GitHub sudo mode 재인증이 필요해 계정 소유자만 할 수 있다 |
| 대가 | Vercel 토큰을 GitHub 시크릿으로 보관, PR 프리뷰 없음 | 토큰은 `jaywapp-wiki` 프로젝트 범위로 좁혀 위험을 제한한다. PR 프리뷰는 콘텐츠를 develop에서 읽는 구조라 앱 코드와 콘텐츠가 섞여 오해를 부른다 |

사용자 확인(2026-09-12): 방식 A로 확정, 병합 전에 결과를 확인받는다.

## 범위

- 범위: `.github/workflows/deploy-wiki-reader.yml`, `web/vercel.json`의 캐시 헤더, 관련 문서 정합성.
- 비범위: Vercel Git 연동, CSP 도입, develop 브랜치 보호 규칙, 빌드·배포 잡 분리,
  `installCommand`를 `npm ci`로 바꾸는 변경. 모두 후속 판단 사항으로 남긴다.

## 완료 기준

1. `develop` push에서 워크플로가 성공한다.
2. 배포 뒤 라이브 `content.json`의 `commit`이 그 push의 커밋을 포함한다.
3. `npm test`가 배포 전에 실행되고, 실패하면 배포되지 않는다.
4. 옛 실행을 재실행하거나 다른 브랜치에서 실행하면 배포되지 않고 명확한 오류로 멈춘다.
