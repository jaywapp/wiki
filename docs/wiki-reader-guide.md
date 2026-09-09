# 위키 웹 리더 운영 안내

공개 주소: **https://jaywapp-wiki.vercel.app** (2026-09-08 배포, 최신 동기화 기준 공개 문서 145개).

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

프로젝트 이름은 `jaywapp-wiki`. `web/.vercel/project.json`은 로컬 연결 정보이며 커밋하지 않는다. 현재는 Git 자동 배포를 연결하지 않았다. 사이트 소스를 commit/push하지 않았기 때문이다.

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
