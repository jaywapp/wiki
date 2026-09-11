# 위키 웹 리더 운영 안내

공개 주소: **https://jaywapp-wiki.vercel.app** (2026-09-11 배포, 커밋 `9985c9a9` 기준 공개 문서 179개).

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

새 문서는 자동 실시간 반영이 아니다. GitHub의 develop 변경 후 아래 과정을 실행해 재배포한다.

```powershell
npm.cmd run sync
npm.cmd test
npm.cmd run build
npm.cmd run package:vercel
vercel.cmd deploy --prebuilt --prod --yes --scope jaywapp16-2281s-projects
```

동기화 실패 시 중단한다. 최신 콘텐츠인 것처럼 오래된 인덱스를 조용히 사용하지 않는다. 테스트에는 전체 수집 문서 렌더링 검증이 있으므로 최초 테스트 전 sync가 필요하다.

## 배포

프로젝트 이름은 `jaywapp-wiki`. `web/.vercel/project.json`은 로컬 연결 정보이며 커밋하지 않는다. 작업 브랜치 `codex/workspace-environment-20260904`의 커밋 `88dc2a6`은 GitHub에 푸시했다. production 배포는 아직 수동 prebuilt 업로드가 유일한 경로다.

### develop push만으로는 사이트가 바뀌지 않는다

콘텐츠는 런타임에 GitHub에서 읽어오지 않고 빌드 시점에 `public/content.json`으로 구워진다. 따라서 **배포가 실행되지 않으면 develop에 무엇을 push해도 사이트는 그대로다.** 2026-09-09 배포 이후 2026-09-11까지 28개 커밋·21개 신규 문서가 반영되지 않고 누적된 사례가 있었다. 에러도 빌드 실패 알림도 없이 조용히 낡으므로 캐시 문제로 오진하기 쉽다.

갱신 여부는 라이브 인덱스의 수집 커밋과 develop 원격 HEAD를 비교해 판별한다.

```powershell
curl.exe -s https://jaywapp-wiki.vercel.app/content.json | Select-String -Pattern '"commit"', '"generatedAt"'
git ls-remote https://github.com/jaywapp/wiki.git develop
```

원인·진단·일반화는 [빌드 시점에 콘텐츠를 구워 넣는 Vercel 사이트가 Git 연동 없이 조용히 낡는 함정](../tools/vercel-build-time-content-stale-trap.md)에 정리했다.

### Git 자동 배포 연결 순서

Vercel 계정의 GitHub 연동 승인이 필요하며, **순서가 중요하다.**

1. [Build & Deployment 설정](https://vercel.com/jaywapp16-2281s-projects/jaywapp-wiki/settings/build-and-deployment)에서 **Root Directory를 `.`에서 `web`으로** 바꾼다. 저장소 루트에 `package.json`이 없고 `web/`에 있으므로, 이 단계를 건너뛰고 연동하면 첫 빌드가 install 단계에서 실패한다.
2. [Vercel Git 설정](https://vercel.com/jaywapp16-2281s-projects/jaywapp-wiki/settings/git)에서 GitHub를 연결하고 `jaywapp/wiki` 저장소 접근을 승인한다.
3. `web`에서 `vercel git connect --yes --scope jaywapp16-2281s-projects`를 실행한다.

Root Directory는 Vercel CLI로 바꿀 수 없다. `vercel project`는 `add`/`checks`/`inspect`만, `vercel git`은 `connect`/`disconnect`만 제공하므로 대시보드나 REST API(`PATCH /v9/projects/{id}`의 `rootDirectory`)를 써야 한다.

연결되면 `develop` push는 production, 다른 브랜치와 PR은 preview로 배포된다. Root Directory가 `web`이면 설정 파일은 `web/vercel.json`이 되고, 빌드 컨테이너에서는 로컬 `.content-cache` 없이 공개 저장소를 새로 clone하므로 동기화 스크립트가 그대로 동작한다.

Windows에서 `vercel build --prod`가 `spawn cmd.exe ENOENT`로 실패하여, 검증된 Vite 산출물을 Vercel Build Output API v3로 포장하는 `package-vercel.mjs`를 제공한다. 이 스크립트는 정확한 `web/.vercel/output` 경로를 검증하고 이전 빌드 출력만 교체한다. `.vercel`의 환경 파일은 업로드 산출물에 포함하지 않는다.

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
