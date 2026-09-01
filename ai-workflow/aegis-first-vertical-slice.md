# Aegis 첫 수직 슬라이스

> Workspace Root에 적용되는 Agent Team 실행·관제 계층 Aegis의 M0/M0.5와 첫 M1 흐름을 구현하며 확정한 구조, 실행 명령, 트러블슈팅을 기록한다.

## 한 줄 요약

Aegis는 AI Harness(Claude Code·Codex)를 직접 믿고 실행시키는 런처가 아니라, Workspace Root·Task·Plan·Run·Effect를 기록하고 정책으로 감싼 로컬 우선 Control Plane이다.

핵심 흐름은 다음과 같다.

```text
Workspace Root 등록
  → Registry 동기화(AGENTS.md/CLAUDE.md·system/teams)
  → Context Pack 생성(비밀값 마스킹)
  → 확인된 Plan 생성
  → Dry-run 정책 평가
  → Fixture Harness 실행
  → 검증된 Artifact 기록
```

## 구현 기준선

- 런타임: .NET 10, `global.json`으로 SDK 10.0.400 계열을 고정한다.
- 저장: append-only JSONL Event Journal을 정본으로 두고 SQLite projection을 조회용으로 사용한다.
- 무결성: 이벤트마다 `sequence`, `previousHash`, `hash`를 연결해 tamper-evident 로그를 만든다.
- 안전성: 입력·Context Pack·Harness 결과는 저장 전에 Secret Redactor를 거치며, 경로는 Workspace Root와 보호 경로 검사를 통과해야 한다.
- 효과 정책: Root 내부 파일 읽기·쓰기는 허용하고, Command·Network·External 효과는 기본적으로 `ApprovalRequired`로 평가한다.
- 실행 검증: 현재 첫 수직 슬라이스는 실제 외부 프로세스를 실행하지 않는 Fixture Harness다. Claude Code와 Codex는 PATH에서 발견만 하며 `observed_only`로 표시한다.
- 결과물: 실행 전 Dry-run은 효과를 만들지 않고, 정상 실행은 원자적 파일 쓰기와 SHA-256 검증을 마친 뒤 Artifact를 남긴다.

## 재현 명령

저장소 루트에서 다음 명령으로 도움말과 전체 안전 데모를 확인할 수 있다.

```powershell
$dotnet = 'C:\Users\jaywa\AppData\Local\AegisSdk\.dotnet\dotnet.exe'
& $dotnet build Aegis.sln --no-restore --configuration Release
& $dotnet test Aegis.sln --no-restore --configuration Release --verbosity minimal
& $dotnet run --project .\src\Aegis.Cli\Aegis.Cli.csproj --no-build --configuration Release -- help
& $dotnet run --project .\src\Aegis.Cli\Aegis.Cli.csproj --no-build --configuration Release -- harness list
& $dotnet run --project .\src\Aegis.Cli\Aegis.Cli.csproj --no-build --configuration Release -- demo --root .\demo-root
```

`demo`는 Root 등록, Task 생성, Registry·Context Pack 구성, Plan 확정, Dry-run, Fixture 실행, Artifact 해시 검증을 한 번에 수행한다. 테스트나 데모 뒤의 `.aegis`와 데모 Root는 커밋하지 않는다.

수동 명령은 Aegis 저장소의 [`docs/12-cli-reference.md`](https://github.com/jaywapp/aegis/blob/codex/aegis-docs/docs/12-cli-reference.md)를 기준으로 한다.

## 운영상 중요한 경계

1. `Task`에는 원문 목표를 저장하지 않고 redacted payload와 idempotency key를 저장한다.
2. `Plan`은 Registry Snapshot hash와 Context Pack ID를 함께 고정한다. 규칙이 바뀌면 같은 계획으로 계속 실행하지 않는다.
3. `Run`은 `Requested → PolicyEvaluated → Authorized → Started → Succeeded`의 증거가 모두 있어야 성공으로 본다.
4. Artifact는 Workspace Root 안의 상대 경로로만 만들고, 임시 파일 flush 후 atomic move한다.
5. SQLite가 손상되거나 projection이 비어 있으면 JSONL Journal을 검증하고 projection을 재생성한다.
6. 사용자의 승인이 필요한 효과는 현재 TTY·Principal·프로세스·만료를 확인하는 로컬 승인 모델을 사용한다. Named Pipe 승인 채널은 다음 단계다.

## 트러블슈팅

### `global.json` 때문에 SDK를 찾지 못하는 경우

시스템 SDK가 .NET 9뿐이면 .NET 10 SDK가 필요하다. 저장소 안에 SDK를 넣지 말고 사용자 로컬의 명시적 경로를 사용하거나, CI에서는 `actions/setup-dotnet`으로 .NET 10을 설치한다. 실행 파일은 다음처럼 직접 지정할 수 있다.

```powershell
& 'C:\Users\jaywa\AppData\Local\AegisSdk\.dotnet\dotnet.exe' --info
```

### `TreatWarningsAsErrors`와 SQLite 패키지 취약점이 충돌하는 경우

`Microsoft.Data.Sqlite` 메타패키지는 플랫폼에 따라 `SQLitePCLRaw.lib.e_sqlite3`를 끌어올 수 있다. Windows 우선 로컬 실행 기준에서는 `Microsoft.Data.Sqlite.Core`와 `SQLitePCLRaw.bundle_winsqlite3` 조합을 사용하고, 다음 명령으로 전이 의존성을 확인한다.

```powershell
& $dotnet list Aegis.sln package --vulnerable --include-transitive
```

### Git이 저장소를 dubious ownership으로 거부하는 경우

샌드박스가 만든 저장소는 실제 사용자 SID와 소유자가 다를 수 있다. 전역 예외를 무턱대고 추가하지 말고, 명시한 저장소 한 곳에만 `safe.directory`를 적용한다.

```powershell
git -c safe.directory='D:/workspace/workflow/agentic-team' status --short
```

### Registry를 두 번 동기화해도 매번 새 Snapshot이 되는 경우

Snapshot hash 계산에 생성 시각이나 랜덤 ID를 넣으면 동일한 파일 목록도 달라진다. Aegis는 경로·종류·내용 SHA-256·크기만으로 hash를 계산하고, Registry entry ID도 같은 입력에서 안정적으로 만든다.

## 다음 구현 순서

- 실제 Claude Code·Codex Adapter의 명시적 실행과 입출력 캡처
- Named Pipe 기반 Approval Broker와 만료·재시작 reconciliation
- Run/Step/Effect 상태 전이의 런타임 강제와 checkpoint/resume
- Review/Handoff 및 운영 대시보드

관련 설계와 ADR은 [Aegis docs](https://github.com/jaywapp/aegis/tree/codex/aegis-docs/docs)에서 확인한다.
