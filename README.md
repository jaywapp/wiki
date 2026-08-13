# wiki

> **jaywapp (Junyoung Park)** 의 개인 위키입니다.
> 개발 경험, 기술 정리, 프로젝트 메모 등을 기록합니다.

---

## 목차

- [github/repo-structure.md](github/repo-structure.md) — GitHub 레포지토리 구조 및 역할
- [git/monorepo-subtree.md](git/monorepo-subtree.md) — Git Subtree로 모노레포 구성하기
- [tools/sentry-flutter-pii-masking.md](tools/sentry-flutter-pii-masking.md) — Sentry Flutter PII 마스킹: copyWith(user: null) 함정
- [tools/npm-postinstall-prisma-vercel-trap.md](tools/npm-postinstall-prisma-vercel-trap.md) — 모노레포 postinstall의 npx prisma가 Vercel에서 v7을 받아와 깨지는 함정 (+ OAuth workflow scope push 거부)
- [tools/headless-chrome-ui-testing.md](tools/headless-chrome-ui-testing.md) — 헤드리스 Chrome UI 검증: 최소 창 폭 500px 클램프 함정, iframe 하니스 패턴, PS5.1 gh CLI 멀티라인 함정
- [tools/keyman-local-mcp-install.md](tools/keyman-local-mcp-install.md) — KeyMan 로컬 설치, Codex·Claude 전역 MCP 플러그인 등록, Windows 실행 파일명 충돌 주의사항
- [ai-workflow/token-optimization-claude-codex.md](ai-workflow/token-optimization-claude-codex.md) — Claude+Codex 토큰 최적화 워크플로우(원리·전략·오픈소스 도구·SOP)
- [ai-workflow/ccsw/](ai-workflow/ccsw/README.md) — ccsw: Claude+Codex 진입 런처(WPF GUI) + 프리셋 스위처 + RTK/Headroom 설치·토글·세션 실행·VS Code 연동
- [ai-workflow/setup-and-test.md](ai-workflow/setup-and-test.md) — 직접 구성 & A/B 테스트 가이드(측정→압축→ccsw→실측)
- [ai-workflow/perforce-p4.md](ai-workflow/perforce-p4.md) — Perforce(P4) 환경 토큰 최적화 적응안(git 미사용 환경)
- [ai-workflow/claude-agent-sdk-mcpservers-override.md](ai-workflow/claude-agent-sdk-mcpservers-override.md) — Agent SDK options.mcpServers가 파일 기반 MCP 설정을 대체하는 함정 (timetree 미노출 원인)
- [dotnet/wpf-drawingvisual-hittest-and-fts5-escape.md](dotnet/wpf-drawingvisual-hittest-and-fts5-escape.md) — WPF DrawingVisual 빈 공간 히트테스트 함정 · SQLite FTS5 검색어 escape · Undo와 FK cascade
- [dotnet/csharp-from-variable-with-expression-parse-error.md](dotnet/csharp-from-variable-with-expression-parse-error.md) — `from` 변수명 + `with` 식이 LINQ 쿼리로 오파싱되는 함정과 연쇄 오류 판독법
- [dotnet/wpf-implicit-usings-system-io.md](dotnet/wpf-implicit-usings-system-io.md) — UseWPF 프로젝트에서 ImplicitUsings의 System.IO가 제거되어 Path/File이 CS0103 나는 함정
- [architecture/tokenless-feedback-vercel-proxy.md](architecture/tokenless-feedback-vercel-proxy.md) — 배포형 데스크톱 앱의 토큰 없는 피드백→GitHub 이슈 (Vercel 서버리스 프록시 패턴)
- [dotnet/dotnet-desktop-release-automation.md](dotnet/dotnet-desktop-release-automation.md) — .NET 데스크톱 앱: 버전 변경 감지 릴리스 자동화 + Inno Setup per-user 설치본 (GitHub Actions)
- [dotnet/dotnet-plugin-external-repos-alc.md](dotnet/dotnet-plugin-external-repos-alc.md) — 외부 레포 플러그인: 계약 NuGet + 공유 AssemblyLoadContext 타입 정체성 함정 + 스키마 설정
- [ue5/ue5-build-farm.md](ue5/ue5-build-farm.md) — UE5 빌드 구성 키워드 분석 (Horde·HLOD·DCC Nightly·Zen Streaming·Shader Build·stat/telemetry)
- [ue5/build-env/](ue5/build-env/README.md) — UE5 조직 빌드 환경 구축 가이드 (초보자용 10챕터: 인프라→Perforce→DDC→Horde→CI/CD→Zen Streaming→관측→로드맵)
- [ue5/build-env/teamcity-perforce-workspace-optimization.md](ue5/build-env/teamcity-perforce-workspace-optimization.md) — TeamCity + Perforce Persistent Workspace 최적화 설계 (TeamCity / TeamCitizen / perforce-syncer 책임 분리)

## 디자인 자료

- [design/gaudi/brief.md](design/gaudi/brief.md) — GAUDI 사내 업무 허브 랜딩 페이지 디자인 브리프
- [design/gaudi/copy.md](design/gaudi/copy.md) — GAUDI 사내 업무 허브의 화면 구조·카피·상태 문구 가이드
- [design/gaudi/designs/cohere.md](design/gaudi/designs/cohere.md) — Cohere 웹 디자인 시스템 분석 및 구현 가이드
- [design/gaudi/designs/kraken.md](design/gaudi/designs/kraken.md) — Kraken 웹 디자인 시스템 분석 및 구현 가이드
- [design/gaudi/designs/stripe.md](design/gaudi/designs/stripe.md) — Stripe 웹 디자인 시스템 분석 및 구현 가이드

## 기획/설계

- [docs/superpowers/specs/2026-06-12-ad-revenue-app-factory-design.md](docs/superpowers/specs/2026-06-12-ad-revenue-app-factory-design.md) — 광고 수익 앱 공장 설계 (서버리스 + AdSense/AdMob, 월 30~50만원 목표)

## 관련 링크

- GitHub: [@jaywapp](https://github.com/jaywapp)
- 프로젝트 목록: [Projects](https://github.com/jaywapp/Projects)
- 블로그: [jaywapp.tistory.com](https://jaywapp.tistory.com/)
- 위키: [wiki](https://github.com/jaywapp/wiki)
