# .NET 데스크톱 앱: 버전 변경 감지 릴리스 자동화 + Inno Setup per-user 설치본

WPF/.NET 데스크톱 앱을 **`master` push만으로 GitHub Release + 설치 프로그램**까지
자동 게시하는 패턴. 적용: WAM (`github.com/jaywapp/wam`), 2026-07-04.

## 핵심 아이디어

"push마다 릴리스"는 문서 커밋에도 릴리스가 생겨 지저분하다. 대신
**csproj `<Version>`이 바뀐 경우에만** 릴리스한다 — 판단은 태그 존재 여부로.

```
master push
  → <Version> 파싱 (예: 0.2.0)
  → 태그 v0.2.0 이미 있음?  →  YES: 아무 것도 안 함 (문서/리팩토링 커밋)
                            →  NO : 테스트 → publish → 설치본 → 태그+Release
```

버전을 올리고 싶을 때만 `<Version>`을 올려 push하면 된다. 별도 태그 수작업 불필요.

## GitHub Actions (`.github/workflows/release.yml`)

- 트리거: `push: branches: [master]` + `workflow_dispatch`
- 권한: `permissions: contents: write` (기본 `GITHUB_TOKEN`만, 별도 시크릿 없음)
- 버전 파싱 (PowerShell, PropertyGroup 여러 개여도 안전):
  ```powershell
  [xml]$csproj = Get-Content src/App/App.csproj
  $version = ($csproj.Project.PropertyGroup.Version | Where-Object { $_ } | Select-Object -First 1).Trim()
  $exists = (git tag -l "v$version")   # 있으면 should_release=false
  ```
  → `$env:GITHUB_OUTPUT`에 기록, 이후 스텝은 `if: steps.ver.outputs.should_release == 'true'`
- 태그 조회하려면 checkout에 `fetch-depth: 0` 필수 (얕은 클론엔 태그 없음).
- 빌드: `dotnet publish -c Release -r win-x64 --self-contained -o publish`
- 릴리스: `gh release create v$version <asset> --generate-notes --target $env:GITHUB_SHA`
  - `gh release create`는 **없는 태그를 자동 생성**한다 → 별도 태그 push 스텝 불필요.
  - 이 방식이 "태그 push → 두 번째 워크플로 트리거" 2단계보다 낫다:
    `GITHUB_TOKEN`으로 만든 태그는 다른 워크플로를 **트리거하지 않는** 함정이 있어
    2단계는 PAT가 필요해진다. 단일 워크플로면 그 함정을 통째로 피한다.

## Inno Setup per-user 설치본 (`installer/wam.iss`)

회사 PC 등 관리자 권한이 없는 환경까지 커버하려면 **per-user** 설치가 답이다.

```ini
[Setup]
AppId={{고정-GUID}}                       ; 버전 간 유지 → 업그레이드가 제자리 덮어쓰기
PrivilegesRequired=lowest                 ; UAC 없음
DefaultDirName={localappdata}\Programs\WAM
SetupIconFile=..\src\App\Assets\app.ico
Compression=lzma2
SolidCompression=yes                      ; self-contained 191MB → 설치본 ~57MB
OutputBaseFilename=WAM-Setup-{#AppVersion}

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion
```

- 버전·소스경로는 커맨드라인 주입 (`#ifndef`로 기본값):
  ```powershell
  & "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" `
    "/DAppVersion=0.2.0" "/DSourceDir=$(Resolve-Path publish)" installer\wam.iss
  ```
- 사용자 데이터(`%AppData%\WAM`: DB·설정·로그)는 `[Files]`에 없으므로 제거해도 보존.
- CI에선 `choco install innosetup -y --no-progress` 후 `ISCC.exe` 풀패스 호출.
  (windows-latest에 사전 설치돼 있지만 choco로 못박으면 이미지 변경에 안전.)
- `AppId` GUID는 **반드시 16진수**만 — 의미 있는 문자열(WAM0WORKASMAP 등)을 넣으면
  컴파일은 되지만 GUID로 부적합. `uuid4()`로 뽑아 고정한다.

## 앱 아이콘 한 벌로 3곳 공용

멀티 해상도 `.ico` 하나(16~256px)를 만들어:
- `csproj`: `<ApplicationIcon>Assets\app.ico</ApplicationIcon>` + `<Resource Include>` (exe 아이콘)
- `MainWindow.xaml`: `Icon="Assets/app.ico"` (타이틀바·작업표시줄)
- Inno Setup: `SetupIconFile=` (설치 프로그램 아이콘)

로고 PNG에서 종이/배경을 지울 땐 **테두리에서 flood-fill**로 배경만 투명화하고
(내부의 같은 색은 보존) → getbbox 크롭 → 여백 두고 정사각 패딩 → LANCZOS 다운스케일.
Pillow `img.save('app.ico', sizes=[(16,16),...,(256,256)])`로 멀티 해상도 한 방에.

## 검증 순서 (CI 실패 전에 로컬에서)

1. 버전 파싱 PowerShell 한 줄 실행 → 값 확인
2. `dotnet publish ... --self-contained` → `publish\App.exe` 생성 확인
3. `dotnet test -c Release` → 통과 확인
4. 위가 다 되면 push. 첫 push가 파이프라인 전체를 실증한다 (v0.2.0 생성).

`publish/`, `installer/Output/`은 반드시 `.gitignore`에 (191MB 산출물 커밋 방지).
