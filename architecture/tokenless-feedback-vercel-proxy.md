# 배포형 데스크톱 앱의 토큰 없는 피드백 → GitHub 이슈 (Vercel 프록시 패턴)

## 문제

데스크톱 앱에 "인앱 피드백 → GitHub 이슈 자동 등록" 기능을 넣으면 GitHub 토큰이 필요하다.

- 토큰을 앱에 심으면(하드코딩/리소스) 배포 순간 유출과 같다.
- 각 PC의 환경변수/로컬 설정에 의존하면 **토큰을 넣은 PC에서만 동작**한다 —
  다른 PC·다른 사용자는 피드백 기능이 죽는다.

## 해결: 서버리스 프록시

토큰을 Vercel 서버리스 함수의 환경변수에만 두고, 클라이언트는 토큰 없이 프록시에 POST한다.

```
앱 (어느 PC든, 자격 증명 없음)
  → POST https://<project>.vercel.app/api/feedback  { title, description, type }
  → Vercel Function이 서버 env의 토큰으로 GitHub Issues API 호출
  → { url: 이슈 URL } 반환
```

장점: 토큰이 클라이언트에 존재하지 않음, 유출 시 서버에서만 교체(클라이언트 재배포 불필요),
검증·라벨 정책을 서버에서 강제.

## 구현 요점 (WAM 사례: `wam/server/feedback-proxy`)

- **서버**: 빌드 설정 없는 순수 Node 함수 하나 (`api/feedback.js`, CommonJS).
  Node 20의 전역 `fetch`로 GitHub API 호출. `req.body`는 Vercel이 JSON 자동 파싱.
  - POST만 허용(405), 제목 필수·길이 제한(400), GitHub 오류는 502로 요약 전달.
- **클라이언트 폴백 전략**: 로컬 토큰(환경변수→settings.json)이 있으면 GitHub 직접 호출
  (관리자/개발 모드), 없으면 프록시 — 조립 지점(composition root)에서 if 하나로 분기.
- **배포**:
  ```bash
  cd server/feedback-proxy
  vercel link --yes --project <name>     # 프로젝트 생성+연결 (.vercel/은 gitignore)
  vercel env add WAM_GITHUB_TOKEN production   # 값은 stdin으로 — 화면에 노출 금지
  vercel deploy --prod                   # <name>.vercel.app 별칭 자동
  ```
  환경변수를 먼저 넣고 배포해야 함수에 반영된다 (이후 변경 시 재배포 필요).
- **토큰 파이프 요령 (PowerShell)**: 값을 출력하지 않고 사용자 환경변수에서 바로 전달:
  ```powershell
  [Environment]::GetEnvironmentVariable('WAM_GITHUB_TOKEN','User') | vercel env add WAM_GITHUB_TOKEN production
  ```
- **토큰 권장**: 대상 레포 Issues write만 가진 fine-grained PAT. 유출 의심 시
  GitHub에서 폐기 → `vercel env rm/add` → 재배포로 끝 (클라이언트 무관).

## 스팸/남용에 대해

엔드포인트는 공개다. 이슈 등록만 가능하므로 피해 범위는 "스팸 이슈"에 한정된다.
필요해지면: 서버 측 길이 제한(이미 적용) + Vercel 방화벽/rate limit, 또는 회전 가능한
클라이언트 식별 헤더를 추가한다. 클라이언트에 비밀을 두는 순간 이 패턴의 이점이 사라지므로
"클라이언트 시크릿"은 추가하지 않는다.

## 검증 시 주의

- `GET → 405`, `빈 제목 POST → 400`은 이슈를 만들지 않고 함수 동작을 확인할 수 있다.
- 실제 등록 테스트는 진짜 이슈를 만든다 — 앱의 피드백 창에서 1회 보내고 닫는 것이 가장 자연스럽다.
- 위 두 프로브(405/400)는 GitHub `fetch`에 **도달하기 전**에 끝나므로, 헤더/토큰 관련
  런타임 버그는 잡아내지 못한다. 성공 경로(실제 fetch)는 진짜 이슈 등록으로만 검증된다.

## 함정: 토큰에 붙는 BOM → `fetch` 헤더 크래시 (500 FUNCTION_INVOCATION_FAILED)

PowerShell에서 토큰을 `vercel env add`로 **파이프**하면 값 앞에 UTF-8 BOM(U+FEFF, 65279)이
딸려 들어갈 수 있다. 이 값을 그대로 `Authorization: Bearer <token>` 헤더에 쓰면 Node의
`fetch`가 던진다:

```
TypeError: Cannot convert argument to a ByteString because the character
at index 7 has a value of 65279 which is greater than 255.
```

- index 7 = `"Bearer "` 바로 다음 = 토큰 첫 글자에 BOM.
- **직통 경로에선 안 드러난다** — 로컬 `.env`/OS API는 BOM 없이 읽히기도 하고, .NET
  HttpClient는 관대하다. 프록시(Node fetch)를 **처음 실제로 태울 때** 터지는 잠복 버그.
- Vercel 로그로 원인 확정: `vercel logs <deployment-url> --json`의 message 필드.
- **해결(방어)**: 서버에서 토큰을 `.trim()` — JS `trim`은 U+FEFF(BOM)와 공백을 함께
  제거하므로 env를 어떻게 넣었든 안전해진다.
  ```js
  const token = process.env.WAM_GITHUB_TOKEN?.trim();
  ```
- 교훈: 파이프로 넣은 시크릿은 인코딩 아티팩트를 의심하고, 서버 쪽에서 정규화(trim)한다.

적용: 2026-07-04, WAM (`github.com/jaywapp/wam`, Vercel 프로젝트 `wam-feedback`).
