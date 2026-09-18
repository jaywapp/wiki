# 위키 리더 자동 배포 — 분석

> 2026-09-19 방식 B(Vercel Git 연동)로 전환했다. 아래 "2026-09-19 전환" 절이 현재 결정이고,
> 그 앞의 내용은 방식 A(GitHub Actions)를 채택했던 2026-09-12 기록이다.

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

## 2026-09-19 전환: B. Vercel Git 연동

### 요청

"wiki에 push하면 웹 페이지에 반영되게 되어 있는가"라는 확인 요청에서 시작했다. 확인해 보니 반영되지 않고 있었다.

### 현재 상태와 근거

- 워크플로 `Deploy wiki reader`는 2026-09-11부터 2026-09-19까지 실패 64회, 취소 13회였고 성공은 0회였다.
  첫 실행, 중간 실행, 마지막 실행 모두 `Pull project settings`(`vercel pull`) 단계에서
  `Error: Could not retrieve Project Settings.`로 실패했다.
- 원인은 확정하지 못했다. 시크릿 값은 볼 수 없어서, 토큰 범위와 `VERCEL_ORG_ID`가 가리키는 scope가
  맞지 않는다고 의심만 했다.
- 라이브 인덱스는 `98fa866`(2026-09-18 07:52 UTC 생성, 문서 233개)로 수동 배포 시점에 머물렀고,
  develop HEAD는 `9cf0dbf`였다.
- 이전 작업 문서의 "첫 실행 검증"(작업 8)이 끝나지 않은 채 남아 있어 실패를 알아채지 못했다.
- 계정 소유자가 Vercel GitHub App의 Repository access에 `wiki`를 추가했다. 방식 B를 막던 조건
  (GitHub sudo mode 재인증이 필요해 소유자만 할 수 있음)이 풀렸다.

### 결정과 근거

| 결정 | 내용 | 근거 |
|---|---|---|
| 배포 방식 | B. Vercel Git 연동 | 저장소 접근이 열려 토큰 없이 배포할 수 있다. 토큰·scope 문제를 풀지 않아도 되고 GitHub 시크릿에 토큰을 둘 필요도 없다 |
| 기준 브랜치 | `develop` | 저장소 기본 브랜치이고, 동기화 스크립트가 `develop`만 읽는다(`web/scripts/sync-content.mjs:11`). `main`은 없다 |
| 워크플로 | 비활성화 후 삭제 | Root Directory가 `web`이면 워크플로도 경로 중복으로 깨지고, 두 경로를 같이 쓸 수 없다 |
| 대가 | 수동 prebuilt 배포 경로 상실, `npm test` 배포 게이트 상실, 모든 브랜치·PR에 preview 생성 | 수동 재배포는 대시보드 Redeploy나 API 배포로 대신한다. 나머지 두 가지는 후속 판단으로 남긴다 |

사용자 확인(2026-09-19): 방식 B, develop 기준으로 확정. 가이드 수정과 워크플로 삭제를 PR로 올리도록 요청받았다.

### 범위

- 범위: Vercel 프로젝트 설정(Root Directory, Git 연결, Production Branch), 워크플로 비활성화·삭제,
  `docs/wiki-reader-guide.md`, `tools/vercel-build-time-content-stale-trap.md`, 이 문서 3종.
- 비범위: 워크플로 시크릿·Vercel 토큰 정리(사용자 작업), Vercel 빌드에 `npm test` 추가,
  preview 배포 범위 제한, 동기화 스크립트가 PR 브랜치의 문서를 읽게 바꾸는 변경.

### 완료 기준

1. Vercel 프로젝트의 `link`가 `github:jaywapp/wiki`, `productionBranch`가 `develop`, `rootDirectory`가 `web`이다.
2. develop에서 만든 production 배포가 `READY`가 되고, 라이브 `content.json`의 `commit`이 develop HEAD와 같다.
3. 워크플로가 비활성화되고, 파일 삭제가 develop에 병합된다.
4. 그 병합 push로 Vercel이 자동 배포를 만들고, 라이브 `commit`이 병합 커밋으로 바뀐다.
