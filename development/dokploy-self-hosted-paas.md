---
title: Dokploy 셀프호스팅 PaaS 분석
category: development
tags: [dokploy, self-hosted, paas, docker, deployment, vercel, vps]
source: https://github.com/Dokploy/dokploy
updated: 2026-11-11
---

# Dokploy — 자체 서버에서 운영하는 오픈소스 PaaS

> 조사일: 2026-11-11. 소셜 게시물의 주장을 공식 문서와 비교 검토한 자료.

## 핵심 요약

Dokploy는 Docker와 Traefik을 활용하여 Git 기반 애플리케이션 배포, 도메인·TLS, 데이터베이스, Docker Compose, 로그·모니터링을 관리하는 오픈소스 셀프호스팅 PaaS다. Vercel/Heroku/Netlify의 일부 배포 경험을 자체 VPS에서 구현하지만, 관리형 플랫폼의 운영 책임까지 대체하지는 않는다.

## 주요 기능과 구조

- Git 저장소 및 Webhook 연동을 통한 자동 배포, Dockerfile·Compose 지원.
- PostgreSQL, MySQL, Redis 등 데이터베이스 배포·관리 및 백업 기능.
- Traefik 기반 도메인 라우팅과 자동 TLS, 로그 및 리소스 모니터링.
- Docker Swarm 기반 다중 노드 운영과 API/CLI, 알림 기능.

공식 문서에 따른 단순화 구조:

```text
Git repository → Webhook → Dokploy control plane
                              │
                     Docker build/deploy
                              │
                  Traefik HTTPS routing
                              │
                 App / API / Database
```

Self-Hosted에서는 Dokploy UI, 관리용 PostgreSQL·Redis, Traefik과 애플리케이션이 사용자의 서버에서 동작한다. Cloud 버전에서는 관리 계층을 Dokploy가 운영하고 애플리케이션은 사용자의 서버에서 실행한다.

## 게시물 팩트체크

| 주장 | 판단 | 보충 |
| --- | --- | --- |
| GitHub 스타 3.8만 | 시점 의존 | 외부 2026-11 초 집계는 약 3.8만, 실시간 확인 필요 |
| 명령 한 줄 설치 | 조건부 사실 | 사전 VPS 준비, 포트·DNS·보안 설정 필요 |
| Git Push 자동 배포 | 지원 | Git 연동 및 Webhook 설정 필요 |
| 무료 SSL·커스텀 도메인 | 지원 | 도메인 소유와 DNS 설정은 별도 |
| Redis/PostgreSQL/MySQL 생성 | 지원 | DB 리소스·백업 운영은 사용자 책임 |
| Docker 기반 무료 호스팅 | 표현 주의 | OSS 사용료 무료, 서버·스토리지·네트워크는 유료 가능 |
| 월 5천 원 VPS면 충분 | 미검증 일반화 | 워크로드, VPS 가격, 빌드 RAM에 따라 달라짐 |
| Vercel과 동일한 서비스 | 부정확 | 관리형 플랫폼과 셀프호스팅의 운영 책임이 다름 |

## 비용과 운영 제약

공식 설치 문서의 최소 권장 사양은 RAM 2GB와 디스크 30GB다. 80/443/3000 포트가 필요하며 관리 포트 3000의 외부 노출은 접근 통제와 TLS를 고려해야 한다. 작은 VPS에서는 빌드와 DB가 자원을 경쟁할 수 있다. 외부 백업, 복원 테스트, 보안 패치, 모니터링, 장애 대응, 디스크 증설은 별도로 계획한다.

Dokploy Self-Hosted OSS는 무료다. Dokploy Cloud는 공식 가격표 기준 Hobby $4.50/월/서버부터이며, **이 요금은 애플리케이션을 실행할 VPS 비용과 구별해야 한다.** 가격은 변경될 수 있다.

## Vercel과의 선택 기준

| 기준 | Vercel | Dokploy Self-Hosted |
| --- | --- | --- |
| 초기 운영 부담 | 낮음 | Linux/Docker 운영 필요 |
| 서버 통제 | 제한적 | 높음 |
| 비용 예측 | 플랜 및 사용량에 의존 | VPS와 부가 인프라에 의존 |
| DB/백그라운드 워커 | 별도 서비스·구성 활용 | 같은 인프라에 직접 배포 가능 |
| 확장·장애 대응 | 관리형 플랫폼 활용 | 직접 설계·운영 |

정적 사이트·소규모 프론트엔드는 Vercel 무료 범위가 적합할 수 있다. 여러 API·워커·DB를 직접 통제하고 운영할 역량이 있는 1인 SaaS에는 Dokploy가 매력적이다. 다중 노드 운영에는 Docker Swarm 네트워크와 장애 복구에 대한 이해가 필요하다.

## 도입 절차

1. 테스트용 Linux VPS에 RAM 2GB·디스크 30GB 이상을 준비한다.
2. 공식 설치 스크립트 내용을 검토한 뒤 설치한다: `curl -sSL https://dokploy.com/install.sh | sh`
3. 관리자 접근 제어, 방화벽, 도메인·DNS 및 HTTPS를 설정한다.
4. Git 저장소 연결 후 테스트 앱을 배포하고 Push → 빌드 → 롤백을 검증한다.
5. 데이터베이스 영속 볼륨과 외부 백업, 복원, 업데이트 및 장애 대응을 시험한다.

## 출처

- 공식 저장소: https://github.com/Dokploy/dokploy
- 공식 소개: https://docs.dokploy.com/docs/core
- 설치 및 최소 사양: https://docs.dokploy.com/docs/core/installation
- Self-Hosted vs Cloud: https://docs.dokploy.com/docs/core/differences
- 공식 요금: https://dokploy.com/pricing
- 외부 스타 집계 참고(변동 가능): https://opendeer.net/en/repo/dokploy/dokploy

원본 소셜 게시물은 사용자 제공 이미지이며 게시물 URL은 미확인.
