# 04. 엔진과 프로젝트 표준화 — 소스 엔진, BuildConfiguration, 팀 규칙

> "런처 엔진 vs 소스 엔진" 선택부터, 팀 전체가 같은 빌드 설정을 쓰게 만드는 표준화까지.
> 이 챕터의 결과물은 **"새 팀원이 반나절 안에 에디터를 띄울 수 있는 온보딩 절차"** 다.

---

## 1. 런처 엔진 vs 소스 엔진

| 관점 | 런처(Epic Games Launcher) 엔진 | 소스(GitHub/P4) 엔진 |
|---|---|---|
| 설치 | 클릭 몇 번 | 최초 빌드 1~4시간 |
| 엔진 수정 | 불가 | 가능 (콘솔 플랫폼 지원, 엔진 패치) |
| 콘솔(PS5/Xbox/Switch) 타깃 | 불가 | 필수 경로 |
| 설치형 엔진 배포(Installed Build) | 해당 없음 | BuildGraph로 직접 제작 가능 |
| Horde/UGS와의 궁합 | 제한적 | 정식 시나리오 |

**판단 기준**: 콘솔 타깃이 있거나, 엔진 수정이 필요하거나, UGS로 precompiled binaries를 배포할 계획이면 소스 엔진. PC/모바일만 + 소규모면 런처 엔진으로 시작해도 된다.

### 소스 엔진 최초 빌드 절차

```bat
:: 1) GitHub(EpicGames/UnrealEngine, 계정 연동 필요)에서 클론 또는 P4 depot에서 sync
:: 2) 의존성 다운로드
Setup.bat

:: 3) 프로젝트 파일 생성
GenerateProjectFiles.bat

:: 4) 에디터 빌드 (Visual Studio에서 UE5 타깃, Development Editor / Win64)
::    또는 커맨드라인:
Engine\Build\BatchFiles\Build.bat UnrealEditor Win64 Development
```

> Visual Studio는 "Game development with C++" 워크로드 + Windows SDK가 필요하다. 팀원 전원이 **같은 VS 버전·같은 SDK 버전**을 쓰도록 버전을 문서로 고정할 것 — DDC와 빌드 재현성이 여기에 걸린다.

## 2. 팀 표준 BuildConfiguration.xml

UBT 설정 파일은 여러 위치에서 읽히는데, 팀 표준은 **프로젝트 저장소에 커밋**해서 전원이 같은 값을 쓰게 만든다.

| 위치 | 용도 |
|---|---|
| `Engine/Saved/UnrealBuildTool/BuildConfiguration.xml` | 엔진 전역(개인) |
| `<사용자 문서>/Unreal Engine/UnrealBuildTool/BuildConfiguration.xml` | 사용자 개인 |
| `<프로젝트>/Saved/UnrealBuildTool/BuildConfiguration.xml` | **프로젝트별 — 문서상 권장 위치** |

팀 표준 시작점 (Horde 도입 전 단계):

```xml
<?xml version="1.0" encoding="utf-8" ?>
<Configuration xmlns="https://www.unrealengine.com/BuildConfiguration">
  <BuildConfiguration>
    <!-- 반복(증분) 빌드 가속 -->
    <bUseUBTMakefiles>true</bUseUBTMakefiles>
    <!-- 첫 오류에서 중단해 CPU 낭비 방지 (개인 취향에 따라 조정) -->
    <bStopCompilationAfterErrors>true</bStopCompilationAfterErrors>
    <!-- 로컬 병렬 액션 수 - 코어 수에 맞게. 미지정 시 자동 -->
    <!-- <MaxParallelActions>16</MaxParallelActions> -->
  </BuildConfiguration>
</Configuration>
```

Horde 도입 후(06장)에는 여기에 `bAllowUBAExecutor` + `Horde` 섹션이 추가된다.

## 3. 프로젝트 설정 표준화 — 커밋해야 하는 것들

팀 빌드 환경의 절반은 "설정 파일을 커밋으로 강제"하는 것이다.

| 파일 | 표준화 내용 |
|---|---|
| `Config/DefaultEngine.ini` | DDC 설정(05장), Zen AutoLaunch(08장), 타깃 플랫폼 |
| `Config/DefaultGame.ini` | 패키징 설정, pak/Io Store 사용 여부 |
| `Config/ConsoleVariables.ini` | 셰이더 디버깅·개발 편의 cvar (아래) |
| `*.uproject` | 활성 플러그인 목록 — 개인이 임의로 켜지 않기 |
| `Saved/UnrealBuildTool/BuildConfiguration.xml` | 위 2절 |

`ConsoleVariables.ini` 개발 표준 예시:

```ini
; 셰이더 컴파일 오류 시 재시도 + 디버깅 편의
r.ShaderDevelopmentMode=1
; 문제 조사 시에만 켠다 (용량 큼): Saved/ShaderDebugInfo에 디버그 산출물 기록
; r.DumpShaderDebugInfo=1
```

## 4. 에디터 배포 전략 — 아티스트는 컴파일하지 않는다

아티스트/디자이너 PC에서 C++ 컴파일을 없애는 것이 온보딩과 일상 효율의 핵심이다. 선택지 두 가지:

### A. Installed Build (설치형 엔진) — BuildGraph로 제작

소스 엔진을 "런처 엔진처럼 쓸 수 있는 형태"로 구워서 공유 스토리지에 배포:

```bat
Engine\Build\BatchFiles\RunUAT.bat BuildGraph ^
  -Script=Engine/Build/InstalledEngineBuild.xml ^
  -Target="Make Installed Build Win64" ^
  -set:HostPlatformOnly=true ^
  -Clean
```

### B. UGS precompiled binaries

CI(Horde)가 에디터 바이너리를 빌드해 zip으로 depot에 커밋하면, UGS가 아티스트 PC에 자동 배포. 코드가 자주 바뀌는 팀에서 A보다 유연하다.

> 시작은 A(주 1회 수동 제작)로 하고, Horde CI가 안정화되면 B로 전환하는 것이 현실적이다.

## 5. 온보딩 문서의 골격 (이대로 사내 위키에 복사)

1. P4V 설치 → 팀 서버(`ssl:p4.<사내도메인>:1666`) 접속, 워크스페이스 생성 (직군별 매핑 템플릿 사용)
2. `//MyGame/Dev` sync
3. 프로그래머: VS <고정 버전> 설치 → `GenerateProjectFiles.bat` → 에디터 빌드
4. 아티스트: 공유 스토리지의 Installed Build(또는 UGS) 설치 → `.uproject` 더블클릭
5. 첫 실행 시 DDC 환경변수 확인 (05장) — 셰이더 컴파일이 "수만 개"면 DDC 미연결 신호
6. 디스코드/슬랙의 `#build-status` 채널 구독 (07장 CI 알림)

## 6. 완료 체크리스트

- [ ] 엔진 선택(런처/소스) 결정 및 사유 기록
- [ ] VS·SDK 버전 고정 문서화
- [ ] `BuildConfiguration.xml` 프로젝트 커밋
- [ ] `ConsoleVariables.ini` 표준 커밋
- [ ] 아티스트용 에디터 배포 경로(A 또는 B) 확정, 1회 배포 테스트
- [ ] 신규 입사자 1명(또는 깨끗한 PC)으로 온보딩 절차 리허설 — 반나절 내 에디터 실행 확인

## 다음 챕터

→ [05. 공유 DDC (Zen)](05-shared-ddc.md) — 투자 대비 효과가 가장 큰 구간.
