# 개인 개발자를 위한 서버 운영 플랫폼 비교 (2026)

> 작성: 2026-10-18 · 대상: 다중 웹·Android 앱 운영 · 가격 및 무료 한도는 변경될 수 있으므로 도입 전 공식 페이지 재확인

## 핵심 결론

- **Cloudflare Workers + Neon**: 여러 소규모 웹/API와 독립 PostgreSQL DB를 무료 할당량 내에서 운영할 때 우선 검토.
- **Supabase**: DB·인증·스토리지를 통합 제공하지만 무료 활성 프로젝트는 일반적으로 2개로 제한.
- **Vercel Hobby**: 비상업적 개인 프로젝트에 유용하며 상업적 앱에는 플랜 조건 확인 필수.
- **Firebase**: Android 앱의 인증·푸시·오류 추적에 유리.
- **Railway / Render / Cloud Run**: 크롤링, 지속 실행 워커, 별도 API 서버가 필요한 경우 검토.

## 플랫폼별 역할

| 분류 | 플랫폼 | 용도 |
|---|---|---|
| 웹 호스팅·서버리스 | Vercel, Netlify, Cloudflare Pages/Workers | 프론트엔드, API |
| BaaS | Supabase, Firebase | 인증, DB, 스토리지, 실시간 |
| 관리형 DB | Neon, PlanetScale | 독립 DB |
| 앱 서버·컨테이너 | Railway, Render, Fly.io, Google Cloud Run | 백엔드, 워커 |
| 종합 클라우드/VPS | AWS, Google Cloud, Azure, DigitalOcean, Oracle Cloud | 맞춤형 인프라 |

## 무료 프로젝트 운영 수와 제약

**주의:** 프로젝트 수, 배포 서비스 수, 동시 실행 수, 무료 요청량은 서로 다르다. 아래 수치는 조사 당시 알려진 정책의 *확인 필요 스냅샷*으로, 계정·시점·플랜별 차이가 있다.

| 플랫폼 | 무료 프로젝트/서비스 수 참고 | 중요한 제약 |
|---|---|---|
| Supabase Free | 활성 프로젝트 2개 | 조직 간 합산 정책, 유휴 프로젝트 일시중지, DB·스토리지 공유 |
| Vercel Hobby | 프로젝트 최대 200개 참고 | 비상업적 개인 사용, 빌드·대역폭·함수 할당량 |
| Cloudflare Workers Free | Worker 스크립트 최대 100개 참고 | 계정 단위 일 10만 요청 등 실행 제한 |
| Neon Free | 최대 100개 DB 프로젝트라는 2026년 정책 발표 참고 | DB 저장량·컴퓨트·브랜치 제한 재확인 |
| Render Hobby | 프로젝트 개수보다 서비스·무료 인스턴스 시간 제한이 중요 | 무료 서비스 절전, 공유 무료 시간 |
| Firebase Spark | Google Cloud 프로젝트 생성 할당량에 따름 | 프로젝트별 앱 등록과 제품별 무료 할당량 구분 |
| Railway Free | 프로젝트 수 별도 확인 | 월 크레딧 및 리소스 소비 |
| Netlify Free | 사이트·사용량 한도 별도 확인 | 배포·대역폭·함수 사용량 |
| Fly.io | 일반적인 상시 무료 운영으로 가정 금지 | 체험/VM 사용량 과금 |

공식 확인 링크:
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq)
- [Vercel Pricing](https://vercel.com/pricing)
- [Vercel Limits](https://vercel.com/docs/limits)
- [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Neon Pricing](https://neon.com/pricing)
- [Render Pricing](https://render.com/pricing)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Railway Pricing](https://railway.com/pricing)
- [Netlify Pricing](https://www.netlify.com/pricing/)
- [Google Cloud Run Pricing](https://cloud.google.com/run/pricing)

## 비용 모델

| 구성 | 월 기본료 예시 | 적합 |
|---|---:|---|
| Cloudflare Free + Neon Free | $0 (할당량 내) | 다수의 소형 서비스 |
| Vercel Pro + Supabase Pro | 약 $45부터 | 상업용 웹 + 통합 백엔드 |
| Vercel Pro + Supabase Pro + Railway | 약 $50부터 + 사용량 | 수집기/워커 추가 |

위 금액은 확정 견적이 아니며 좌석 수, 컴퓨트, 네트워크 송신량, DB 저장량, 백업, 로그, 도메인, 세금, AI API 비용을 제외한다. 무료라고 해도 프로젝트 개수가 늘면 공유 할당량을 소진할 수 있다.

## 다중 앱 운영 설계

1. GitHub 저장소와 배포 프로젝트는 앱별로 분리한다.
2. DB는 가능하면 앱별로 분리한다. Supabase 1개 프로젝트에 여러 앱을 묶는 것은 가능하지만 인증·리소스·장애 범위를 공유한다.
3. 앱별 시크릿, 권한, RLS, 스토리지 정책을 분리한다.
4. 오류 추적, 비용 알림, 백업 및 복원 테스트를 마련한다.
5. 무료 플랜의 상업적 사용 조건과 유휴 서비스 정지 정책을 확인한다.
6. 크롤러와 장시간 AI 분석은 서버리스 요청 처리와 분리한다.

## 프로젝트별 후보 (확정 변경 아님)

| 프로젝트 | 후보 조합 | 비고 |
|---|---|---|
| Jhannel | Vercel + Supabase | 기존 확정 방향 유지 우선 |
| K리그 이적 루머 트래커 | Cloudflare/Vercel + Neon/Supabase + 워커 | 크롤링·AI 비용 별도 |
| squad-maker | 로컬 우선 + Firebase 선택 | 오프라인 동작 보존 |
| fc-squad-maker | Cloudflare 또는 Vercel + DB | 저장/공유 기능 기준 |
| fc-offline | 로컬 우선 + Supabase 선택 | 동기화 도입 시 검토 |

## 최종 의사결정 기준

- **무료 앱 다수**: Cloudflare + Neon을 검증 대상으로 우선 선정.
- **인증·파일·DB 통합 생산성**: Supabase 우선.
- **Next.js 중심 웹 배포**: Vercel 우선. 수익화 시 Hobby 이용 제한 확인.
- **Android 푸시·크래시 분석**: Firebase 기능별 도입.
- **상시 실행 작업**: Railway/Render/Cloud Run의 실행시간과 비용 비교.

### 도입 전 재검증 체크리스트

- [ ] 현재 무료 프로젝트 생성/활성 수
- [ ] 상업적 사용 가능 여부
- [ ] 앱 1/3/5/10개에서의 공유 리소스 한도
- [ ] 유휴 절전 및 콜드 스타트
- [ ] 백업·복원 및 데이터 이전
- [ ] 월 비용 상한 및 초과 과금 알림
- [ ] 서울/아시아 리전 지원과 지연시간
