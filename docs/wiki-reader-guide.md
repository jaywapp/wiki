# 위키 웹 리더 운영 안내

공개 주소: **https://jaywapp-wiki.vercel.app** (2026-09-19 Vercel Git 연동 후 첫 배포, 커밋 `9cf0dbf` 기준 공개 문서 237개).

## 구성

- 운영 앱: `web/`, Vite + 네이티브 JavaScript. 사용자 선택 B 그래파이트 카탈로그.
- 콘텐츠: 공개 GitHub `jaywapp/wiki`, `develop` 브랜치.
- 동기화는 `web/.content-cache/repository`에 별도 Git 캐시를 만들고 원격 커밋의 문서만 읽는다. 로컬 미커밋 원문은 게시하지 않는다.
- 인증·데이터베이스가 없는 읽기 전용 정적 사이트. 브라우저에 보기/정렬 취향만 저장한다.
- 검색: 한글·영문 제목, 본문, 경로, 태그. 공백으로 나눈 검색어는 모두 포함되어야 한다.
- 목록 행에는 제목과 최대 4개의 태그, 본문 첫 문장에서 만든 짧은 설명을 함께 보여준다. 설명은 모바일에서 두 줄까지 보인다.
- 필터: 폴더와 태그 교집합. 정렬: Git 최신 수정순, 오래된순, 제목 양방향, 검색 관련도.
- 트리는 폴더를 이름순으로 배치하고 각 폴더 안 문서에 선택한 정렬을 적용한다.
- 모바일 하단의 문서 탐색/본문 읽기로 전환한다. URL에는 문서·검색·필터·정렬·보기가 보존된다.

## 로컬 실행과 문서 갱신

PowerShell에서 `D:\work\wiki\web`으로 이동 후 실행한다.

```powershell
npm.cmd ci
npm.cmd run sync
npm.cmd run dev
```

새 문서는 `develop`에 push(PR 머지 포함)하면 Vercel이 다시 빌드해 반영한다(아래 '자동 배포: Vercel Git 연동' 참고). Vercel 빌드는 `npm test`를 돌리지 않으므로, 앱 코드를 바꾼 PR은 머지 전에 로컬에서 테스트한다.

```powershell
npm.cmd run sync
npm.cmd test
npm.cmd run build
```

동기화 실패 시 중단한다. 최신 콘텐츠인 것처럼 오래된 인덱스를 조용히 사용하지 않는다. 테스트에는 전체 수집 문서 렌더링 검증이 있으므로 최초 테스트 전 sync가 필요하다.

## 배포

프로젝트 이름은 `jaywapp-wiki`(scope `jaywapp16-2281s-projects`). `web/.vercel/project.json`은 로컬 연결 정보이며 커밋하지 않는다. 작업 브랜치 `codex/workspace-environment-20260904`의 커밋 `88dc2a6`은 GitHub에 푸시했다. production 배포는 2026-09-19부터 Vercel Git 연동이 `develop` push마다 수행한다.

### 콘텐츠는 빌드 시점에 구워진다

콘텐츠는 런타임에 GitHub에서 읽어오지 않고 빌드 시점에 `public/content.json`으로 구워진다. 따라서 **배포가 실행되지 않으면 develop에 무엇을 push해도 사이트는 그대로다.** 2026-09-09 배포 이후 2026-09-11까지 28개 커밋·21개 신규 문서가 반영되지 않고 누적된 사례가 있었고, 2026-09-11부터 2026-09-19까지는 GitHub Actions 배포가 한 번도 성공하지 못해 같은 일이 되풀이됐다. 에러도 빌드 실패 알림도 없이 조용히 낡으므로 캐시 문제로 오진하기 쉽다.

갱신 여부는 라이브 인덱스의 수집 커밋과 develop 원격 HEAD를 비교해 판별한다.

```powershell
curl.exe -s https://jaywapp-wiki.vercel.app/content.json | Select-String -Pattern '"commit"', '"generatedAt"'
git ls-remote https://github.com/jaywapp/wiki.git develop
```

원인·진단·일반화는 [빌드 시점에 콘텐츠를 구워 넣는 Vercel 사이트가 Git 연동 없이 조용히 낡는 함정](../tools/vercel-build-time-content-stale-trap.md)에 정리했다.

### 자동 배포: Vercel Git 연동

| 항목 | 값 |
|---|---|
| 연결 저장소 | `github:jaywapp/wiki` |
| Production Branch | `develop` |
| Root Directory | `web` |
| Build Command / Output | `npm run build:fresh` / `dist` (`web/vercel.json`) |

- `develop` push(PR 머지 포함)는 production으로 빌드·배포된다. 1~2분 뒤 공개 주소에 반영된다.
- 다른 브랜치 push와 PR은 preview로 배포된다. **preview도 콘텐츠는 develop에서 읽는다**(`web/scripts/sync-content.mjs`의 `BRANCH = "develop"`). 문서만 바꾼 PR의 preview에는 그 PR의 문서가 보이지 않으므로, preview는 앱 코드 변경을 확인하는 용도로만 본다.
- 설정 파일은 `web/vercel.json`이다. 빌드 컨테이너에는 로컬 `.content-cache`가 없어 공개 저장소를 새로 clone하므로 동기화 스크립트가 그대로 동작한다.
- Vercel 빌드에는 `npm test` 게이트가 없다. 빌드만 통과하면 테스트가 깨진 앱 코드도 배포된다.

연결 상태는 `vercel project inspect`로는 확인할 수 없다(CLI 54.4.1 기준, 연결 후에도 Git 항목이 나오지 않는다). 프로젝트 API의 `link`를 본다.

```powershell
vercel.cmd api /v9/projects/jaywapp-wiki --scope jaywapp16-2281s-projects --raw | ConvertFrom-Json | Select-Object -ExpandProperty link | Select-Object type, org, repo, productionBranch
```

### 수동 재배포

push 없이 다시 배포해야 하면 둘 중 하나를 쓴다. 어느 쪽이든 Vercel이 develop을 직접 빌드한다.

- 대시보드: Deployments에서 최신 production 배포를 Redeploy.
- API: 아래 본문을 `deploy.json`으로 저장하고 배포를 만든다. `project`는 `web/.vercel/project.json`의 `projectId`, `repoId`는 `gh api repos/jaywapp/wiki --jq .id` 값(1243546405)이다.

```json
{
  "name": "jaywapp-wiki",
  "project": "<projectId>",
  "target": "production",
  "gitSource": { "type": "github", "repoId": 1243546405, "ref": "develop" }
}
```

```powershell
vercel.cmd api /v13/deployments -X POST --input deploy.json --scope jaywapp16-2281s-projects
```

배포가 `READY`가 되면 위의 `content.json` 비교로 반영을 확인한다. `web`에서 `vercel deploy --prebuilt`로 올리던 예전 수동 경로는 Root Directory 때문에 더는 동작하지 않는다(아래 함정 참고).

### 2026-09-19 전환 기록: GitHub Actions → Vercel Git 연동

2026-09-11에 도입한 GitHub Actions 워크플로(`.github/workflows/deploy-wiki-reader.yml`)는 2026-09-19까지 실패 64회, 취소 13회로 한 번도 성공하지 못했다. 모든 실패가 `vercel pull` 단계의 `Error: Could not retrieve Project Settings.`였다. 원인은 확정하지 못했다(`VERCEL_TOKEN`의 범위와 `VERCEL_ORG_ID`가 가리키는 scope가 맞지 않는다고 의심). 그동안 라이브 사이트는 마지막 수동 배포 시점에 머물렀다. 결정 근거는 [자동 배포 분석](wiki-reader-auto-deploy-analysis.md)에 있다.

계정 소유자가 Vercel GitHub App의 Repository access에 `wiki`를 추가한 뒤(GitHub sudo mode 재인증이 필요해 소유자만 할 수 있다) 아래 순서로 전환했다.

1. Root Directory `.` → `web`: `vercel.cmd api /v9/projects/<projectId> -X PATCH -f rootDirectory=web --scope jaywapp16-2281s-projects`. 저장소 루트에 `package.json`이 없어 이 단계를 건너뛰면 첫 빌드가 install에서 실패한다.
2. Git 연결: `web`에서 `vercel.cmd git connect https://github.com/jaywapp/wiki --yes --scope jaywapp16-2281s-projects`.
3. Production Branch `master` → `develop`: `vercel.cmd api /v9/projects/<projectId>/branch -X PATCH -f branch=develop --scope jaywapp16-2281s-projects`.
4. 워크플로 비활성화(`gh workflow disable deploy-wiki-reader.yml --repo jaywapp/wiki`) 후 파일 삭제.
5. API로 develop 배포를 만들고 라이브 `content.json`의 `commit`이 develop HEAD `9cf0dbf`와 같은지 확인.

전환 중 막힌 곳:

- **Production Branch가 `master`로 잡혔다.** 저장소 기본 브랜치는 `develop`인데, 연결 직후 `link.productionBranch`는 초기 커밋만 남은 옛 `master`였다. 그대로 두면 develop push가 preview로만 나가 사이트는 계속 낡는다. 연결 직후 위의 `link` 확인 명령으로 반드시 본다. `/branch` 엔드포인트는 `vercel api list`에 나오지 않지만 2026-09-19에 동작을 확인했다.
- **서브모듈 체크아웃에서는 인자 없는 `vercel git connect`가 실패한다.** `.git`이 폴더가 아니라 파일인 서브모듈 안의 `web`에서 실행하면 `Error: No local Git repository found.`가 난다. 저장소 URL을 인자로 넘기면 연결된다.

워크플로가 쓰던 저장소 시크릿 `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`는 더 쓰지 않는다. 토큰은 Vercel에서 revoke하고 `gh secret delete <이름> --repo jaywapp/wiki`로 지운다.

### 함정: Root Directory와 수동 배포는 양립하지 않는다

Root Directory를 `web`으로 설정한 뒤 `web`에서 수동 배포를 실행하면 CLI가 경로를 한 번 더 붙여 실패한다.

```
Error: The provided path "D:\work\wiki\web\web" does not exist.
```

Root Directory를 설정하면 수동 배포는 저장소 루트에서 실행해야 하고, 루트에는 프로젝트 링크(`.vercel`)가 없다. Root Directory는 전용 CLI 명령이 없어 대시보드나 REST API(`PATCH /v9/projects/{id}`의 `rootDirectory`, `vercel api`로 호출 가능)로 바꾼다. 지금은 Git 연동을 쓰므로 수동 재배포는 위의 대시보드 Redeploy나 API 배포를 쓴다.

`package-vercel.mjs`는 예전 수동 prebuilt 경로에서 쓰던 스크립트로, 현재 배포 경로에서는 쓰지 않는다. Windows에서 `vercel build --prod`가 `spawn cmd.exe ENOENT`로 실패해서, 검증된 Vite 산출물을 Vercel Build Output API v3로 포장하려고 만들었다. 정확한 `web/.vercel/output` 경로를 검증하고 이전 빌드 출력만 교체하며, `.vercel`의 환경 파일은 업로드 산출물에 포함하지 않는다.

다른 PC에서는 Vercel CLI로 로그인한 뒤 `web`에서 기존 프로젝트를 연결한다.

```powershell
vercel.cmd link --yes --project jaywapp-wiki --scope jaywapp16-2281s-projects
```

## 렌더링과 알려진 한계

- 표·코드 하이라이트·목차·내부 링크·Mermaid 지원. 원시 HTML은 실행하지 않고 텍스트로 표시한다.
- Mermaid는 필요할 때만 다운로드한다. 문법 오류가 있는 다이어그램은 원본 코드로 표시한다.
- 확인 가능한 ax/ai, ax, ai-workflow 이전 경로는 존재하는 현재 문서로 연결한다. 동일 파일명이 여럿이면 임의 선택하지 않는다. README가 없는 폴더 링크는 해당 폴더 목록을 연다.
- 해결할 수 없는 기존 원문 링크는 GitHub로 연결해 확인할 수 있게 한다. 원문 자체를 임의 수정하지 않는다.
- 빌드의 500KB 청크 경고는 지연 로드되는 Mermaid 관련 청크에서 발생한다. 초기 앱 스크립트는 gzip 약 87KB이다.
- 시안 캡처·작업 문서·테스트·의존성·로컬 미커밋 원문은 정적 사이트 산출물에 포함되지 않는다. 공개 저장소에 이미 커밋된 docs 문서는 콘텐츠로 포함된다.

공식 참고: [Vite 배포](https://vercel.com/docs/frameworks/frontend/vite), [Build Output API](https://vercel.com/docs/build-output-api/configuration).
