# 빌드 시점에 콘텐츠를 구워 넣는 Vercel 사이트가 Git 연동 없이 조용히 낡는 함정

> 2026-09-11, `jaywapp-wiki` 위키 리더에서 "저장소에 글을 올렸는데 웹페이지가 갱신되지 않는" 문제 트러블슈팅.

## 증상

- 콘텐츠 저장소(`jaywapp/wiki`) `develop`에 문서를 계속 push했다.
- 배포된 사이트(https://jaywapp-wiki.vercel.app)는 며칠 전 상태 그대로였다.
- 에러 없음. 빌드 실패 알림 없음. 404도 없음. 루트는 HTTP 200을 정상 반환한다.

조용히 낡기 때문에 "캐시 문제"나 "CDN 문제"로 오진하기 쉽다. 실제로는 **배포가 한 번도 실행되지 않은 것**이다.

## 원인

두 조건이 겹치면 발생한다.

1. **콘텐츠가 런타임이 아니라 빌드 시점에 정적 파일로 구워진다.**
   `jaywapp-wiki`는 `scripts/sync-content.mjs`가 빌드 중에 콘텐츠 저장소를 clone해서
   `public/content.json`으로 직렬화한다(`npm run build:fresh` = `sync` + `build`).
   사이트는 런타임에 GitHub를 읽지 않는다.
2. **배포 트리거가 없다.**
   Vercel 프로젝트에 Git 연동이 연결되어 있지 않고, GitHub Actions·cron도 없었다.
   유일한 배포 경로가 수동 `vercel deploy --prebuilt --prod`였다.

즉 **콘텐츠 저장소 push는 배포를 유발하지 않고, 배포가 없으면 `content.json`은 갱신되지 않는다.**
사이트는 마지막 수동 배포 시점의 스냅샷에 영구히 고정된다.
이 사례에서는 2026-09-09 배포 이후 28개 커밋·21개 신규 문서가 반영되지 않고 누적됐다.

## 진단 방법

산출물에 수집 커밋을 심어두면 한 줄로 판별된다. `content.json`의 `commit`·`generatedAt`을
콘텐츠 저장소의 원격 HEAD와 비교한다.

```powershell
curl.exe -s https://jaywapp-wiki.vercel.app/content.json | Select-String -Pattern '"commit"', '"generatedAt"'
git ls-remote https://github.com/jaywapp/wiki.git develop
```

두 커밋이 다르면 배포가 밀린 것이다. 배포 이력으로 교차 확인한다.

```powershell
vercel.cmd list jaywapp-wiki --scope <scope>
```

- `Duration`이 0~3초면 빌드가 돌지 않은 **prebuilt 업로드**다.
- `vercel.cmd inspect <url>`에 Git 메타데이터(커밋·브랜치)가 없으면 CLI 수동 배포다.
- `vercel.cmd project inspect <name>`에 Git Repository 항목이 없으면 연동 자체가 없다.

**교훈: 생성된 콘텐츠 인덱스에는 항상 소스 커밋과 생성 시각을 기록한다.** 이게 없으면
"낡았다"는 사실 자체를 증명할 수 없다.

## 해결

### 1. 즉시 최신화 (수동)

```powershell
cd <repo>\web
npm.cmd run build:fresh
npm.cmd run package:vercel
vercel.cmd deploy --prebuilt --prod --yes --scope <scope>
```

배포 후 라이브 `content.json`의 `commit`이 원격 HEAD와 일치하는지 반드시 재확인한다.

### 2. 근본 해결 A — CI에서 배포 (권장)

배포 트리거를 저장소 안으로 가져온다. GitHub Actions가 `develop` push마다 `vercel pull` →
`vercel build --prod` → `vercel deploy --prebuilt --prod`를 실행하고, 마지막에 라이브
`content.json`의 커밋을 검증한다.

```yaml
on:
  push:
    branches: [develop]
  workflow_dispatch:
concurrency:
  group: deploy-wiki-reader
  cancel-in-progress: true
```

`VERCEL_TOKEN`·`VERCEL_ORG_ID`·`VERCEL_PROJECT_ID`를 시크릿으로 넣어야 한다. 토큰은 해당 프로젝트 범위로
좁히고, 빌드 단계에는 넘기지 않는다. 그 단계에서 의존성의 설치·빌드 스크립트가 모두 실행되기 때문이다.
Linux 러너에서 `vercel build`가 동작해 Windows용 prebuilt 포장 우회가 필요 없는지는 첫 성공 실행에서 확인한다.

검증은 push된 커밋이 아니라 **이번 빌드가 구운 커밋**을 기준으로 한다. 콘텐츠는 빌드 시점 develop tip에서
오므로 두 값이 다를 수 있고, 라이브가 더 새로운 커밋이면 그 커밋은 러너 클론에 없어 조상 비교가 실패한다.

이 방식의 장점은 **Vercel 프로젝트 설정을 건드리지 않는다**는 것이다. Root Directory를
그대로 비워 둘 수 있어 워크스테이션의 수동 배포가 예비 경로로 계속 살아 있다.

### 3. 근본 해결 B — Vercel Git 연동

앱이 저장소 하위 디렉터리(`web/`)에 있으면 **Root Directory를 먼저 바꿔야 한다.**
저장소 루트에 `package.json`이 없으므로, 이 단계를 건너뛰고 연동하면 연동 직후 첫 빌드가
install 단계에서 실패한다.

1. Settings › Build & Deployment에서 **Root Directory를 `.` → `web`**으로 변경.
2. Settings › Git에서 GitHub를 고른다.
3. 저장소 검색 결과가 비어 있으면 Vercel GitHub App이 **선택된 저장소만** 접근하도록
   설치된 것이다. "Configure GitHub App"에서 Repository access에 해당 저장소를 추가한다.
4. `vercel git connect --yes --scope <scope>`.

#### 이 경로에서 실제로 막히는 지점

- **계정 수준 GitHub 연결은 이미 되어 있을 수 있다.** 막힌 원인이 OAuth 미승인이라고
  단정하지 말고 저장소 목록이 비어 있는 것인지 먼저 확인한다. 둘의 해결책이 다르다.
- **GitHub App 설치 설정 변경은 GitHub sudo mode 재인증을 요구한다.** 패스키·TOTP이므로
  계정 소유자만 통과할 수 있고 자동화로 대신할 수 없다.

### 함정: Root Directory와 수동 CLI 배포는 양립하지 않는다

Root Directory를 `web`으로 설정한 뒤 `web/`에서 수동 배포를 실행하면 CLI가 경로를
한 번 더 붙여 실패한다.

```
Error: The provided path "D:\work\wiki\web\web" does not exist.
```

Root Directory를 설정하면 수동 배포는 저장소 루트에서 실행해야 하는데, 루트에는 프로젝트
링크(`.vercel`)가 없다. 즉 Git 연동을 붙이는 순간 기존 수동 배포 절차는 그대로 쓸 수 없다.
CI 워크플로도 `web/`에서 `vercel build`를 돌리므로 같은 이유로 함께 깨진다. Git 연동으로 바꾸려면
워크플로를 먼저 지우거나 비활성화해야 한다. 수동 배포를 예비 경로로 유지하려면 Root Directory를
비워 두고 CI 방식을 쓴다.

### Root Directory는 CLI로 못 바꾼다

Vercel CLI에는 이 값을 변경하는 명령이 없다. `vercel project`는 `add`/`checks`/`inspect`만,
`vercel git`은 `connect`/`disconnect`만 제공한다. 대시보드 또는 REST API
(`PATCH /v9/projects/{id}`, `rootDirectory` 필드)로만 변경할 수 있다.

### 버전은 추측하지 말고 확인한다

워크플로우를 쓸 때 액션·CLI 메이저 버전을 기억으로 적으면 대체로 틀린다. 확인 후 고정한다.

```powershell
gh api repos/actions/checkout/releases/latest --jq .tag_name
npm view vercel version
```

## 일반화

빌드 시점에 외부 소스를 구워 넣는 모든 구조(SSG, 콘텐츠 인덱스, 검색 인덱스)에 동일하게 적용된다.

- 콘텐츠 소스와 배포 트리거는 **별개**다. 소스 저장소가 앱 저장소와 같아도 트리거가 없으면 갱신되지 않는다.
- 콘텐츠 저장소와 앱 저장소가 **다르면** Git 연동만으로는 부족하다.
  콘텐츠 push가 앱 빌드를 유발하지 않으므로 Deploy Hook + 콘텐츠 쪽 webhook, 또는 주기적 cron 재빌드가 필요하다.
- 생성 산출물에는 소스 커밋·생성 시각을 심고, 배포 후 그 값을 검증한다.
  "파일이 존재한다"는 확인만으로 최신이라고 선언하지 않는다.

## 관련 문서

- [위키 웹 리더 운영 안내](../docs/wiki-reader-guide.md) — 이 사이트의 배포·갱신 절차
- [npm 모노레포 postinstall에서 prisma generate 실행 시 Vercel 배포가 깨지는 함정](npm-postinstall-prisma-vercel-trap.md)

공식 참고: [Vercel Git 연동](https://vercel.com/docs/deployments/git), [Root Directory 설정](https://vercel.com/docs/project-configuration#root-directory), [Deploy Hooks](https://vercel.com/docs/deployments/deploy-hooks).
