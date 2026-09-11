# 위키 리더 자동 배포 — 설계

## 확인된 요구사항

`develop` push마다 리더를 production에 배포하고, 배포된 결과가 실제로 그 커밋의 콘텐츠인지 확인한다.
검증 없이 나가는 배포와, 앱 코드와 콘텐츠가 어긋난 배포를 막는다.

## 파이프라인

`.github/workflows/deploy-wiki-reader.yml`, 트리거는 `push: [develop]`과 `workflow_dispatch`.

| 단계 | 하는 일 | 이유 |
|---|---|---|
| 가드 | 시크릿 3개 존재 확인, `git ls-remote`로 develop 끝 == `GITHUB_SHA` 확인 | 시크릿 누락 시 원인이 분명한 오류로 멈춘다. 옛 실행 재실행 시 옛 앱 코드에 최신 콘텐츠가 얹히는 것을 막는다 |
| `vercel pull` | production 설정을 받는다 | 이후 빌드가 API 호출 없이 로컬 설정만 읽는다 |
| `vercel build --prod` | `vercel.json`의 `build:fresh`(sync → vite build) 실행 | 콘텐츠를 새로 구워 넣는다 |
| `npm test` | 수집 문서 렌더링·하드닝 테스트 | 수동 절차에 있던 게이트를 CI가 승계한다 |
| 인덱스 확인 | 구운 `content.json`의 커밋이 이번 커밋을 포함하는지 | sync가 낡은 tip을 읽었는지 배포 전에 잡는다 |
| `vercel deploy --prebuilt --prod` | 빌드 산출물만 업로드 | 러너에서 다시 빌드하지 않는다 |
| 라이브 검증 | 라이브 `content.json`의 커밋을 구운 커밋과 비교, 10초 간격 6회 재시도 | 조용히 낡는 상태를 다시 만들지 않는다 |

### 비교 기준을 구운 커밋으로 둔 이유

배포되는 콘텐츠의 커밋은 빌드 시점 develop tip이고 `GITHUB_SHA`와 다를 수 있다. `GITHUB_SHA`와
비교하면 정상 상황에서도 불일치가 난다. 또 라이브가 더 새로운 커밋일 때 그 커밋은 러너 클론에 없어
`git merge-base --is-ancestor`가 실패(exit 128)하므로, 비교 전에 `git fetch origin develop`을 한다.

## 보안 결정

| 항목 | 결정 | 이유 |
|---|---|---|
| 토큰 범위 | `jaywapp-wiki` 프로젝트 범위 + 만료 지정 | 팀 범위 토큰이면 같은 팀의 다른 프로젝트를 재배포해 그 환경 변수의 토큰까지 노출시킬 수 있다 |
| 빌드 단계 토큰 | 넘기지 않는다 | 그 단계에서 모든 의존성의 설치·빌드 스크립트가 실행된다. `vercel pull` 이후 빌드는 토큰이 필요 없다 |
| 토큰 전달 | `--token` 인자 대신 `env` | 프로세스 목록·로그 노출 경로를 줄인다 |
| 액션 고정 | 커밋 SHA 고정, `vercel@59.16.0` 정확 고정 | 이동하는 태그 하이재킹 대비 |
| 권한 | `permissions: contents: read`, `persist-credentials: false` | 저장소 기본값이 write로 바뀌어도 이 워크플로는 read로 남는다. 체크아웃 이후 git 인증이 필요 없다 |
| 실행 ref | 잡에 `if: github.ref == 'refs/heads/develop'` | dispatch로 임의 브랜치 코드가 production에 나가는 것을 막는다 |
| 타임아웃 | `timeout-minutes: 15` | 배포가 걸려도 러너를 오래 잡지 않는다 |

## 대안과 트레이드오프

- **Vercel Git 연동(B)**: 토큰 보관이 필요 없고 PR 프리뷰가 생기지만, Root Directory 변경이 수동 배포와
  이 워크플로를 동시에 깨뜨린다. 비채택.
- **빌드와 배포 잡 분리**: 빌드 단계 코드가 토큰 근처에도 못 오게 하는 완전 격리. 아티팩트를 주고받아야 하고
  헤더 설정이 `vercel.json`과 `package-vercel.mjs`로 이중 관리된다. 지금은 빌드 단계 토큰 제거로 충분하다고 보고 보류.
- **Environment 시크릿(`production`) + 배포 브랜치 제한**: 저장소 시크릿은 어느 브랜치의 워크플로에서도
  읽히므로 더 좁힐 수 있다. 토큰 재등록이 필요해 사용자 결정으로 남긴다.

## 캐시 헤더

`vercel build` 경로는 `web/vercel.json`의 `headers`만 반영한다. 수동 경로(`package-vercel.mjs`)가 주던
`/assets/*`의 `max-age=31536000, immutable`이 빠지므로 같은 규칙을 `vercel.json`에 추가했다.

## 검증 전략

1. 병합 전: YAML 파싱, 액션 SHA와 CLI 버전 실재 확인, 시크릿 3개 등록 확인.
2. 병합 직후 첫 실행: 각 단계 통과 여부, 특히 `vercel build`가 토큰 없이 성공하는지,
   `.vercel/output/static/content.json` 경로가 맞는지, `npm test`가 러너에서 통과하는지.
3. 실행 후: 라이브 `content.json`의 `commit`과 develop HEAD 비교.
