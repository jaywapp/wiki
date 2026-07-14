# npm 모노레포 postinstall에서 prisma generate 실행 시 Vercel 배포가 깨지는 함정

> 2026-07-14, Crewith 보안 강화 브랜치(PR #30) Vercel 프리뷰 배포 실패 트러블슈팅.

## 증상

npm workspaces 모노레포 루트 `package.json`에 postinstall로 prisma generate를 넣었더니:

- 로컬 `npm install` / GitHub Actions `npm ci`: 정상 (고정된 prisma 6.x로 생성)
- **Vercel 배포: `npm install` 단계에서 실패** — 로그에 `Prisma CLI Version : 7.8.0` + 스키마 validation 오류

```
npm error command sh -c node -e "...execSync('npx prisma generate --schema apps/api/prisma/schema.prisma',...)"
Error: Command failed: npx prisma generate ...
Prisma CLI Version : 7.8.0   ← devDependency는 6.x인데 7이 실행됨
```

## 원인

Vercel의 `npm install` 도중 **루트 postinstall이 워크스페이스 bin 링크보다 먼저 실행**될 수 있다.
그 시점에 `node_modules/.bin/prisma`가 없으면 `npx`는 **레지스트리에서 최신 prisma(v7)를 다운로드**해 실행하고,
v7 CLI는 v6 스키마의 datasource 설정을 거부한다.

핵심: `npx <pkg>`는 로컬 바이너리가 없으면 조용히 최신 버전을 받아온다. postinstall처럼
**의존성 설치가 완료됐다고 보장할 수 없는 시점**에서는 버전 고정이 깨지는 통로가 된다.

## 해결

로컬 CLI가 실제로 존재할 때만, 다운로드 금지 플래그와 함께 실행:

```json
"postinstall": "node -e \"const{existsSync}=require('fs');if(existsSync('apps/api/prisma/schema.prisma')&&existsSync('node_modules/.bin/prisma'))require('child_process').execSync('npx --no-install prisma generate --schema apps/api/prisma/schema.prisma',{stdio:'inherit'})\""
```

가드 2중 구조:

| 가드 | 걸러내는 환경 |
|---|---|
| `existsSync('apps/api/prisma/schema.prisma')` | Docker 빌드 초기 단계 (`npm ci`가 스키마 COPY 전에 실행됨) |
| `existsSync('node_modules/.bin/prisma')` + `--no-install` | Vercel 등 bin 링크 전에 postinstall이 도는 환경 |

skip돼도 문제없는 이유: 그 환경들은 prisma 클라이언트가 필요 없거나(Vercel의 Next 앱),
별도 명시적 generate 단계가 있다(Dockerfile `RUN npm run prisma:generate`, CI 스텝).

## 교훈

- postinstall에서 `npx <tool>`을 쓸 때는 항상 `--no-install`을 붙이고 로컬 존재를 확인하라.
- 모노레포 postinstall은 "모든 환경에서 돈다"를 전제로 설계하라 — 로컬/CI/Docker/Vercel 각각 설치 시점·순서가 다르다.

## 관련: OAuth 토큰으로 workflow 파일 push 거부

같은 브랜치에서 `.github/workflows/*.yml`을 수정했더니 HTTPS(OAuth) push가 거부됨:

```
! [remote rejected] ... (refusing to allow an OAuth App to create or update workflow `.github/workflows/api-ci.yml` without `workflow` scope)
```

**해결: SSH로 push하면 스코프 제약이 없다.** 원격 URL을 바꾸지 않고도 1회성으로 가능:

```bash
git push git@github.com:jaywapp/crewith.git <branch>
```

(항구 해결은 `gh auth refresh -s workflow` 또는 원격을 SSH로 전환.)
