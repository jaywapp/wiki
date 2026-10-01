# Expo 푸시 설정과 비동기 검증 메모

Expo Android 푸시를 준비할 때 혼동하기 쉬운 계정 로그인, 프로젝트 연결, FCM 파일과 검증 범위를 정리한다. 예약/해제 경쟁 조건과 네이티브 애니메이션 관찰 절차도 재사용 가능한 설계 지식으로 기록한다. 특정 앱이나 서비스의 설정·실행 결과를 담은 문서는 아니다.

## 1. 웹 로그인과 EAS CLI 로그인 확인

Expo 웹사이트에 로그인했다는 사실만으로 터미널의 EAS CLI 인증이 완료되었다고 판단하지 않는다. CLI 작업 전 `eas whoami`로 현재 인증된 계정을 확인하고, 필요한 경우 `eas login`을 실행한다. 조직 프로젝트라면 그 계정에 대상 프로젝트 권한이 있는지도 확인한다. Expo CLI에 이미 인증된 경우 세션을 사용할 수 있다는 안내와, 브라우저 로그인 여부는 구분한다. [Expo EAS Build 공식 안내](https://docs.expo.dev/build/setup/)

```sh
eas whoami
eas login
eas whoami
```

위 명령은 인증 확인 순서를 설명한다. 계정 인증 성공, 프로젝트 연결 성공, 빌드 성공, 푸시 수신 성공은 서로 다른 확인 항목이다.

## 2. dynamic app.config와 실제 EAS UUID 연결

`app.config.js` 또는 `app.config.ts`는 동적 설정이다. 정적 설정과 달리 CLI의 자동 편집을 기대하기 어렵고 개발자가 직접 갱신해야 한다. 최종 해석 결과는 `npx expo config`로 확인한다. [Expo app config 공식 문서](https://docs.expo.dev/workflow/configuration/)

`extra.eas.projectId`에는 EAS에 실제로 존재하고 권한을 확인한 프로젝트의 UUID를 연결한다. 앱 slug, Android 패키지 이름, Firebase 프로젝트 ID와 혼동하지 않는다. 임의 UUID나 임시 문자열은 정상 프로젝트 연결의 근거가 될 수 없다. Expo 푸시 토큰도 프로젝트 UUID를 사용해 귀속된다. [Expo 푸시 projectId 안내](https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid)

다음은 기존 설정을 보존하며 외부에서 공급한 값을 연결하는 독립 예시다. 환경변수의 이름은 설명용이며 실제 값은 문서에 넣지 않는다. UUID 형식 검사만으로 프로젝트 존재나 권한을 보장할 수 없으므로 별도로 확인한다.

```js
export default ({config}) => {
  const projectId = process.env.EAS_PROJECT_ID;
  if (!projectId) throw new Error('EAS_PROJECT_ID is required');

  return {
    ...config,
    extra: {
      ...config.extra,
      eas: {...config.extra?.eas, projectId},
    },
  };
};
```

app config의 `extra`는 클라이언트에 노출될 수 있다. 환경변수로 전달했다고 시크릿 저장소가 되는 것은 아니며, 서비스 계정 키나 서버 권한 키를 넣지 않는다. [설정값 읽기 공식 안내](https://docs.expo.dev/workflow/configuration/#reading-configuration-values-in-your-app)

## 3. FCM JSON 파일의 역할 구분

| 파일 | 용도 | 처리 원칙 |
| --- | --- | --- |
| `google-services.json` | Android 앱의 Firebase 클라이언트 설정과 FCM 등록 | 앱의 패키지 이름과 대상 Firebase 프로젝트에 맞는 파일을 빌드에 연결 |
| 서비스 계정 JSON | FCM HTTP v1 발신 측 인증에 필요한 서버 자격 증명 | 앱 번들·저장소·로그에 넣지 않고 승인된 자격 증명 저장 경로에서 관리 |

Expo에서는 클라이언트 파일 경로를 `android.googleServicesFile`로 연결하고 FCM v1 서비스 계정 키는 EAS의 푸시 자격 증명으로 관리한다. 두 파일은 교환해서 사용할 수 없다. [Expo FCM 자격 증명 공식 안내](https://docs.expo.dev/push-notifications/fcm-credentials/)

Firebase는 Android 앱 등록 시 해당 앱의 `google-services.json`을 내려받도록 안내한다. 이 파일의 클라이언트 식별 정보와 서비스 계정의 비밀 키는 성격이 다르다. FCM HTTP v1 전송은 서버 환경의 인증이 필요하다. [Firebase Android 설정](https://firebase.google.com/docs/android/setup), [Google FCM HTTP v1 인증](https://firebase.google.com/docs/cloud-messaging/send/v1-api)

설정 파일을 연결한 것과 실제 기기에서 토큰을 발급받아 푸시를 수신한 것은 따로 검증한다. 공개 문서에는 실제 프로젝트 ID, JSON 내용, 키와 푸시 토큰을 기록하지 않는다.

## 4. 예약/해제 async race와 소유자 세대

다음은 앱별 구현과 무관한 비동기 자원 소유권 설계 패턴이다. 예약 요청을 보낸 뒤 사용자가 취소하거나 로그인 소유자가 바뀌면, 이전 요청의 응답이 늦게 도착해 이미 해제한 자원을 다시 활성화할 수 있다.

1. 예약 시작 시 현재 인증 소유자와 단조 증가하는 `generation`을 캡처한다.
2. 서버가 인증된 소유자의 예약을 실제로 받아들였다는 ACK를 기다린다. 요청 전송이나 Promise 생성만으로 예약 완료를 선언하지 않는다.
3. ACK 직후 캡처한 소유자와 `generation`이 현재 상태와 같은지 다시 확인한다.
4. 바뀌었다면 늦게 성공한 예약을 현재 UI에 반영하지 않고, 그 ACK가 식별한 예약만 조건부로 해제한다.
5. 해제 응답도 같은 세대를 확인한 뒤 UI에 반영한다. 오래된 해제가 새 소유자의 예약을 삭제하지 않도록 서버에서도 예약 식별자·소유권 조건을 검증한다.

세대 확인은 모든 관련 `await` 이후에 적용해야 한다. 클라이언트 세대 번호는 인증 증명이 아니므로 서버는 요청 소유자를 직접 인증·인가해야 한다. 네트워크 오류로 ACK를 잃은 경우에는 멱등 요청 식별자나 상태 조회로 성공 여부를 조정한다. Supabase의 역할·행 소유권 검사는 이 서버 경계를 설계할 때 참고할 수 있다. 세대 패턴 자체는 Supabase 기능 명세가 아니다. [Supabase RLS 공식 안내](https://supabase.com/docs/guides/database/postgres/row-level-security)

테스트에서는 예약 ACK를 지연한 채 취소, 소유자 변경, 새 예약을 순서대로 발생시킨다. 이후 이전 ACK를 반환해 이전 예약의 정리와 새 예약 보존을 각각 확인한다. ACK 전에 한 번만 검사하는 테스트로는 이 경쟁 조건을 검증하기 어렵다.

## 5. PGlite fixture와 운영 PostgreSQL의 검증 범위

PGlite는 WASM으로 실행되는 PostgreSQL이며 테스트마다 독립 DB를 만들어 SQL과 데이터 규칙을 빠르게 검사할 수 있다. [PGlite 공식 소개](https://pglite.dev/docs/about)

fixture 테스트가 검증하는 것은 fixture가 구성한 스키마, 함수, 역할과 데이터다. 인증 함수나 확장 기능을 대체했다면 대체한 범위와 원래 운영 환경을 같은 것으로 취급하지 않는다. fixture 성공만으로 배포된 마이그레이션, 운영 역할 권한, 실제 JWT·RLS 경로, 여러 연결의 동시 트랜잭션이 검증되었다고 보고하지 않는다.

운영과 같은 PostgreSQL 버전·확장·마이그레이션을 가진 격리된 환경에서 실제 역할별 허용/거부, 함수 권한과 경쟁 조건을 추가 확인한다. 운영 DB 자체의 검사는 승인된 비파괴 범위로 구분하고 검증 환경을 결과에 명시한다. Supabase는 DB 구조, 함수, 데이터 무결성과 RLS를 pgTAP으로 테스트하는 방법을 안내한다. [Supabase 테스트 공식 안내](https://supabase.com/docs/guides/local-development/testing/overview)

| 확인 결과 | 보고할 수 있는 근거 |
| --- | --- |
| PGlite fixture 통과 | fixture에서 실행한 SQL과 데이터 규칙 |
| 실제 PostgreSQL 검증 통과 | 지정 버전·역할·마이그레이션 환경에서의 DB 동작 |
| 인증 API 통합 검사 통과 | 실제 인증 요청과 RLS/권한 경로의 결과 |
| 기기 푸시 수신 | 해당 빌드·기기·자격 증명 조건의 종단 간 수신 |

## 6. 반복 스플래시의 네이티브 움직임 관찰

정지 화면만으로 반복 애니메이션의 움직임이나 반복 횟수를 확인할 수 없다. 네이티브 화면 녹화에서 위치·회전·투명도 변화를 시간에 따라 비교한다. Android `animator_duration_scale=0`은 Animator 기반 애니메이션을 즉시 끝내므로, 먼저 현재 값을 읽고 검사 중에만 `1`로 설정한 뒤 `finally`에서 원래 값을 복원한다. 모든 애니메이션 엔진이 이 설정을 따르는 것은 아니다. [Android Animator scale 공식 문서](https://developer.android.com/reference/android/provider/Settings.Global#ANIMATOR_DURATION_SCALE)

다음은 PowerShell 예시다. 기록 중 다른 터미널이나 기기 조작으로 앱을 시작해 스플래시를 재현한다. 여러 기기가 연결되어 있으면 각 adb 명령에 동일한 `-s` 장치 선택을 추가한다. 실행 권한과 기록 성공 여부도 확인한다.

```powershell
$previousScale = adb shell settings get global animator_duration_scale
if ($LASTEXITCODE -ne 0) { throw 'Could not read animator scale' }
$previousScale = $previousScale.Trim()
if ($previousScale -ne 'null' -and $previousScale -notmatch '^\d+(\.\d+)?$') {
    throw 'Unexpected animator scale value'
}

try {
    adb shell settings put global animator_duration_scale 1
    if ($LASTEXITCODE -ne 0) { throw 'Could not set animator scale' }
    adb shell screenrecord --time-limit 15 /sdcard/splash-check.mp4
    if ($LASTEXITCODE -ne 0) { throw 'Screen recording failed' }
    adb pull /sdcard/splash-check.mp4 ./splash-check.mp4
    if ($LASTEXITCODE -ne 0) { throw 'Could not retrieve recording' }
} finally {
    if ($previousScale -eq 'null') {
        adb shell settings delete global animator_duration_scale
    } else {
        adb shell settings put global animator_duration_scale $previousScale
    }
    if ($LASTEXITCODE -ne 0) { Write-Warning 'Animator scale restoration failed' }
}
```

`screenrecord`와 `adb pull`은 Android 공식 녹화 절차를 사용한다. 앱 시작 전부터 녹화하고 최소 두 주기를 비교할 수 있는 길이를 확보한다. 원래 scale 값과 복원 확인, 기기/OS, 녹화 구간과 관찰 결과를 기록한다. 호스트나 프로세스가 강제 종료되면 `finally` 실행을 보장할 수 없으므로 원래 값을 이용해 복원 상태를 확인한다. [Android adb 녹화 공식 안내](https://developer.android.com/tools/adb#screenrecord)

## 7. Windows Supabase CLI의 명령별 인증 호환 확인

로그인 후 `projects list`는 성공하지만 `secrets list`만 `Access token not provided`로 실패하면, 로그인 전체가 실패했다고 단정하지 않는다. v2.102.0의 동일 Windows 설치에서 이 차이를 재현했으며 함께 배포된 `supabase-go.exe`로 시크릿 메타데이터 조회에 성공했다. 이 결과는 해당 설치 환경에 대한 관찰이며 모든 Windows 설치나 최신 CLI의 문제를 뜻하지 않는다.

공식 v2.102.0 소스에서 `projects list`와 기존 `login`은 Go 실행 파일로 전달된다. `secrets list`는 TypeScript 구현과 별도 자격 증명 읽기 경로를 사용한다. 따라서 먼저 버전·설치 위치·프로필을 확인하고 같은 환경에서 명령별 결과를 비교한다. 구체적인 자격 증명 백엔드 실패 원인은 별도 진단 없이 단정하지 않는다. [프로젝트 조회 처리](https://github.com/supabase/cli/blob/v2.102.0/apps/cli/src/legacy/commands/projects/list/list.handler.ts), [시크릿 조회 처리](https://github.com/supabase/cli/blob/v2.102.0/apps/cli/src/legacy/commands/secrets/list/list.handler.ts), [자격 증명 읽기](https://github.com/supabase/cli/blob/v2.102.0/apps/cli/src/legacy/auth/legacy-credentials.layer.ts)

공식 설치에 함께 있는 기존 실행 파일을 확인한 뒤 읽기 전용 명령으로 접근을 검증할 수 있다. 다음 경로와 프로젝트 식별자는 설명용 자리표시자다.

```powershell
$cliGoBinary = 'C:\path\to\official-install\bin\supabase-go.exe'
& $cliGoBinary --version
& $cliGoBinary secrets list --project-ref '<project-ref>' --output json
```

시크릿 목록은 이름과 digest 메타데이터이며 비밀 원문을 반환하지 않는다. 원문을 디버그 로그나 명령 인수에 넣지 않는다. 검증된 실행 파일과 버전을 기록하고, CLI 업그레이드는 해당 문제의 해결 여부를 재확인한 뒤 판단한다. [공식 Go 실행 파일 탐색](https://github.com/supabase/cli/blob/v2.102.0/apps/cli/src/shared/legacy/go-proxy.layer.ts), [공식 시크릿 목록 구현](https://github.com/supabase/cli/blob/v2.102.0/apps/cli-go/internal/secrets/list/list.go)

## 8. GitHub Release 초안은 ID로 조회

Release 초안 생성과 파일 업로드는 성공했는데 태그로 조회하는 REST 요청이 404를 반환할 수 있다. 초안에 대응하는 Git 태그가 아직 생성되지 않은 상태에서는 조회 실패를 토큰 쓰기 권한 부족으로 단정하지 않는다. 먼저 GitHub CLI로 초안의 숫자 ID를 조회한 뒤 해당 ID의 REST 경로에서 실제 asset 메타데이터를 확인한다. [GitHub CLI Release 조회](https://cli.github.com/manual/gh_release_view), [GitHub Release ID 조회 API](https://docs.github.com/en/rest/releases/releases#get-a-release)

다음은 저장소와 태그를 설명용 자리표시자로 둔 PowerShell 예시다.

```powershell
$releaseRepository = 'owner/repository'
$releaseTag = '<release-tag>'
$releaseId = gh release view $releaseTag --repo $releaseRepository --json databaseId --jq .databaseId
if ($LASTEXITCODE -ne 0 -or $releaseId.Trim() -notmatch '^[1-9][0-9]*$') {
    throw 'Could not resolve release ID'
}
$releaseApiPath = 'repos/' + $releaseRepository + '/releases/' + $releaseId.Trim()
gh api $releaseApiPath --jq '{draft:.draft,asset_count:(.assets|length)}'
if ($LASTEXITCODE -ne 0) { throw 'Could not read release metadata' }
```

초안 검증과 공개 게시는 각각 기록한다. `draft=true`, 예상 파일 개수·이름, 업로드 상태, 크기와 digest를 확인한 결과만으로 무인증 다운로드나 자동 CI 게시 완료를 선언하지 않는다. 검증 전에 공개하지 않고, 공개된 Release를 재업로드로 덮어쓰지 않는다.

이 문서의 명령과 예시는 독립적으로 작성한 설명용 자료다. 계정 로그인, EAS 연결, 자격 증명 업로드, 실제 DB 검사와 기기 녹화를 수행했다는 근거를 대신하지 않는다.

## 9. EAS Android FCM v1 메뉴와 기존 키 연결

EAS credentials의 Android 상위 메뉴에서 `Google Service Account`를 선택하면 Play Store 제출용과 Push Notifications (FCM V1) 용도를 구분할 수 있다. 이름에 Legacy가 있는 메뉴는 다른 인증 방식이므로 FCM v1에 사용하지 않는다. 메뉴의 set up은 로컬 서비스 계정 JSON 업로드와 기존 키 연결을 포함한다. 실제 동작과 선택할 파일을 확인한 뒤 진행한다. [Expo Android 푸시 인증 안내](https://docs.expo.dev/push-notifications/fcm-credentials/)

`google-services.json`은 앱 빌드에 필요한 Firebase client 설정이고, 서비스 계정 JSON은 서버에서 FCM v1 발송을 인증하는 비밀이다. 동일한 파일로 취급하지 않는다. 필요한 Firebase 프로젝트와 Android 패키지에 해당하는 FCM 전용 서비스 계정 키를 Expo의 해당 앱 credentials에 연결한 뒤, 키 업로드와 Android 연결 결과를 각각 확인한다.

Windows PTY에서 대화형 CLI가 지연되면 로그인 실패나 키 업로드 실패를 추정하지 않는다. 이미 성공한 업로드를 다시 수행하기 전에 같은 계정·프로젝트·패키지의 자격 증명 메타데이터를 조회해 상태를 확인한다. 공식 CLI 구현의 조회·연결 함수를 진단에 활용할 경우 설치 버전에 따른 내부 API이며 안정된 공개 SDK로 간주하지 않는다. 프로젝트 식별을 먼저 검증하고 FCM 용도만 다루며 토큰·개인 키·전체 응답을 출력하지 않는다.

FCM 연결 확인은 실제 기기 수신 확인과 다르다. 발송 OFF로 함수 배포를 확인한 뒤 승인된 테스트 회원과 실제 Android에서 ticket·receipt·화면 표시를 각각 검증한다. 로컬 서비스 계정 키를 보관할 때는 암호화 보관본의 복원 일치를 확인하고 일시 평문 사본을 제거한다. 어느 단계에서도 비밀 파일을 Git 또는 공개 APK Release에 넣지 않는다.

## 10. GitHub runner의 Android 도구 PATH

Android SDK가 설치된 runner에서도 `sdkmanager: command not found`가 발생할 수 있다. `ANDROID_HOME`이 있는지와 command-line tools 아래 실제 sdkmanager·avdmanager 위치를 먼저 확인한다. SDK 환경변수가 설정돼 있다는 사실만으로 해당 bin 디렉토리가 PATH에 포함됐다고 가정하지 않는다. 도구를 찾았으면 실행 권한을 검사하고 GitHub의 `GITHUB_PATH` 파일에 bin 경로를 등록해 다음 step에서 사용한다. 에뮬레이터와 adb도 같은 SDK를 사용하도록 환경을 확인한다.

command-line tools는 latest 경로 또는 설치 버전 디렉토리에 있을 수 있다. runner 이미지의 실제 디렉토리와 공식 목록을 기준으로 찾고, SDK 설치·라이선스·네이티브 빌드 실패를 각각 구분한다. YAML/셸 문법 검사만으로 실제 Android 빌드 성공을 선언하지 않는다. [공식 Ubuntu runner 도구 목록](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md) · [GitHub PATH 등록](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands#adding-a-system-path)

## 11. AVD 생성 경로와 에뮬레이터 탐색 경로 일치

`avdmanager create avd`가 성공해도 실행기가 같은 AVD를 찾는다는 뜻은 아니다. `Unknown AVD name`과 즉시 종료가 보이면 부팅 시간제한을 늘리기 전에 생성된 `.ini`와 데이터 경로, 두 프로세스의 환경을 비교한다. KVM 사용 가능·메모리 여유·디스크 여유는 별도 조건이며 AVD 탐색 성공의 근거가 되지 않는다.

공식 문서에서 `ANDROID_USER_HOME`은 SDK 사용자 설정, `ANDROID_EMULATOR_HOME`은 에뮬레이터 설정, `ANDROID_AVD_HOME`은 AVD 파일 디렉토리다. 실행기의 AVD 탐색 순서는 `ANDROID_AVD_HOME`, `ANDROID_USER_HOME/avd`, 기본 `$HOME/.android/avd`다. 생성기와 실행기에 동일한 환경을 전달하고 임시 Android 홈 아래로 경로를 모은다. SDK 설치 경로인 `ANDROID_HOME`과 구분한다. [Android 환경 변수](https://developer.android.com/tools/variables)

다음은 Bash 독립 예시다. SDK와 지정 system image가 설치돼 있고 도구 PATH가 준비됐다는 전제이며 이름·이미지는 설명용이다. 생성과 실행을 다른 CI step으로 나누면 이 세 환경 변수를 다음 step에도 전달한다.

```bash
set -euo pipefail
android_ci_home="$(mktemp -d)"
export ANDROID_USER_HOME="$android_ci_home"
export ANDROID_EMULATOR_HOME="$android_ci_home"
export ANDROID_AVD_HOME="$android_ci_home/avd"
mkdir -p "$ANDROID_AVD_HOME"

avd_name="example_ci"
image_package="system-images;android-36;google_apis;x86_64"
printf 'no\n' | avdmanager create avd \
  -n "$avd_name" -k "$image_package" \
  -p "$ANDROID_AVD_HOME/$avd_name.avd"

test -f "$ANDROID_AVD_HOME/$avd_name.ini"
avdmanager list avd
emulator -list-avds
```

`-p`는 AVD 데이터 디렉토리를 지정한다. `.ini`가 존재하고 두 도구의 목록에 같은 이름이 나타나는지 확인한 후 실행한다. 이 예시는 경로를 명시하는 패턴이며 실제 수정 후 CI 부팅·설치·검사가 성공했다는 증거가 아니다. 설치된 도구 버전의 도움말도 확인한다. [avdmanager 경로 옵션](https://developer.android.com/tools/avdmanager)

### 설치 전에 실패해도 진단 파일 보존

stdout만 보고 있으면 에뮬레이터 조기 종료의 원인을 잃을 수 있다. 시작 전부터 파일에 저장하고 실패 여부와 관계없이 artifact를 수집한다. 아래는 위 예시에 이어 사용하는 수집 패턴이다. 진단 디렉토리는 CI artifact 업로드 경로로 지정한다.

```bash
diagnostics_dir="./emulator-diagnostics"
mkdir -p "$diagnostics_dir"
emulator -accel-check > "$diagnostics_dir/acceleration.txt" 2>&1 || true
df -h > "$diagnostics_dir/disk.txt" 2>&1
free -h > "$diagnostics_dir/memory.txt" 2>&1
emulator -avd "$avd_name" -port 5554 -no-window -no-audio \
  -no-snapshot -verbose > "$diagnostics_dir/emulator.log" 2>&1 &
emulator_pid=$!
adb devices -l > "$diagnostics_dir/adb-devices.txt" 2>&1
```

부팅 대기는 프로세스 생존 확인(`kill -0 "$emulator_pid"`), 대상 장치의 `sys.boot_completed=1` 확인, 전체 시간제한을 분리한다. 각 adb 호출에도 시간제한을 두어 연결 대기가 전체 제한을 넘지 않게 한다. 프로세스가 먼저 종료되면 즉시 실패로 처리하고 종료 코드와 로그를 남긴다. 살아 있지만 부팅 완료가 제한 시간 내 확인되지 않은 경우는 별도 시간초과로 기록한다. 실패 시 장치 목록·디스크·메모리를 다시 저장하고, APK 설치 이전 실패에서도 이 파일들을 artifact로 업로드한다. 장치 연결만으로 부팅 완료나 APK 검사 통과를 선언하지 않는다. [에뮬레이터 실행·진단 옵션](https://developer.android.com/studio/run/emulator-commandline)

## 12. 네이티브 빌드 후 에뮬레이터 디스크 여유 검증

부팅만 따로 성공한 runner라도 네이티브 빌드 후에는 캐시·중간 산출물·APK가 공간을 소모한다. AVD 생성·KVM 확인과 디스크 여유 검사를 분리하고, SDK 준비 전·빌드 후·에뮬레이터 시작 전 같은 파일시스템의 `df`를 기록한다. GitHub의 runner 사양 표를 현재 여유 공간으로 해석하지 않는다. [GitHub-hosted runner 사양](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)

CI 공간 probe는 예상 빌드 점유량만큼 임시 파일에 실제 블록을 할당한 상태에서 부팅 검사를 수행하는 방법이다. sparse 파일은 실제 디스크 점유를 모사하지 못할 수 있으므로 할당 전후 `df` 차이를 확인한다. probe 파일은 검사가 끝날 때 해제하되 부팅 중에는 유지한다. 점유량·최소 여유는 프로젝트 빌드 측정값을 근거로 정하고, 검사를 시작하기 전에 최소 공간 미달이면 즉시 실패시킨다. 모사 통과와 실제 빌드·설치·검사 통과를 별도로 기록한다.

미사용 toolchain을 정리한다면 GitHub-hosted Linux 임시 runner인지 확인하는 가드를 먼저 둔다. self-hosted나 개발자 머신에서는 실행하지 않는다. 현재 이미지의 공식 도구 목록과 업무 의존성을 확인한 뒤 .NET·Swift·Haskell·CodeQL 등 이번 job이 사용하지 않는 도구만 고정 목록으로 지정한다. 디렉토리 추측이나 광범위한 패턴 삭제를 피하고, Android SDK·Java·Node·Python은 빌드와 검사에 필요한 보존 대상으로 둔다. 이 목록은 모든 프로젝트에 적용하는 삭제 권장이 아니다. [공식 runner 이미지·도구 목록](https://github.com/actions/runner-images)

부팅 실패 artifact에는 진단 로그뿐 아니라 이미 빌드·서명 검사를 통과한 APK와 체크섬도 보존하면 다시 빌드하는 비용을 줄일 수 있다. 설치·smoke가 미완료인 APK임을 명시하고 공개 배포 성공과 구분한다. 실패 여부와 관계없이 수집하도록 업로드 조건을 구성하며 키·자격 증명 파일은 포함하지 않는다. [GitHub workflow artifact 보존](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-what-your-workflow-does/storing-and-sharing-data-from-a-workflow)

위 절차는 공간 부족을 조기에 발견하고 증거를 남기기 위한 일반 설계다. 특정 CI 수정의 부팅·설치·자동 배포 성공을 확인한 결과가 아니다.

## 13. UI XML 생성 실패와 시스템 팝업을 따로 진단

UI 검사의 XML parse 오류만으로 전송 방식의 결함을 확정하지 않는다. `uiautomator dump`의 응답·종료 코드와 실제 파일 원문을 따로 보존하고, 명령이 끝났지만 파일 생성은 실패한 경우를 구분한다. 화면이 idle 상태가 되지 않았거나 UI root가 아직 없다는 명시적인 응답만 횟수·시간 제한을 두고 재시도하며, 끝내 실패하면 검사 실패로 기록한다. stdout·stderr를 함께 보존하고 모든 오류 줄이 허용된 일시 오류인지 먼저 검사한다. 알려진 오류에 미지 오류가 섞이면 즉시 실패시킨다. 덤프 전에 이전 임시 XML을 제거하여 생성 실패에서 과거 화면을 읽지 않도록 한다. 오래된 XML을 현재 화면으로 인정하거나 임의로 XML 앞부분을 잘라 통과시키지 않는다.

```bash
adb -s "$device_serial" shell uiautomator dump /sdcard/layout.xml > dump-response.txt 2>&1
adb -s "$device_serial" pull /sdcard/layout.xml ./layout.xml
```

파일을 `adb pull`로 복사해 원문을 먼저 저장한 뒤 파싱하면 오류 발생 시 입력 바이트를 확인할 수 있다. stdout으로 읽은 결과와 파일을 각각 보존하면 두 방식의 내용이 실제로 다른지도 비교할 수 있다. 정상 XML인데 앱 제목이 없다면 package·resource-id·표시 문구를 확인하여 시스템 권한창, 시스템 UI 응답 없음, 앱 충돌창, 실제 앱 화면을 구분한다. [공식 ADB 파일 복사](https://developer.android.com/tools/adb#copyfiles)

부팅 프로퍼티와 ADB 연결만으로 앱 검사 준비를 완료 처리하지 않는다. 잠금 해제 후 홈 화면이 연속된 최신 덤프에 나타나고 시스템 오류 팝업이 없는지 확인한다. 준비 단계에도 전체 제한·개별 ADB 제한을 적용하고 덤프 생성 실패 때 이전 파일을 재사용하지 않는다. 시스템 또는 앱 응답 없음 팝업을 자동으로 닫아 정상 판정하지 않는다. 실패 시 XML·스크린샷·제한된 logcat을 함께 보존한다. 로그와 화면에 계정·토큰이 있는지 확인하고 비공개 검사 자료를 공개 위키로 옮기지 않는다.

CPU 소프트웨어 렌더링에서 해상도를 낮춘다면 dp 화면 크기도 계산한다. `dp = px × 160 / density`이므로 해상도와 density를 같은 비율로 줄이면 기존 논리 화면 크기를 유지할 수 있다. 예를 들어 900×1800 / 360dpi와 600×1200 / 240dpi는 모두 400×800dp다. 해상도만 낮추고 density를 유지하면 메뉴가 아래로 숨겨져 검사 기준 자체가 바뀔 수 있다. 실제 화면 크기와 접근 가능한 제어를 확인하고 자원 부족·팝업 원인 해결과 화면 검증 성공을 구분한다. 에뮬레이터 설정 항목은 설치된 SDK의 `hardware-properties.ini`와 현재 공식 도움말을 확인한다. [공식 에뮬레이터 옵션](https://developer.android.com/studio/run/emulator-commandline)

## 14. 푸시 정상 운영 전환과 관리형 DB 권한

제한된 테스트 계정 목록을 정상 운영 모드로 바꿀 때는 기존 활성 회원·종류별 동의·현재 기기 바인딩·허용 프로젝트·업무 수신 범위 검증을 유지한다. 발송 중지 상태에서도 outbox가 쌓일 수 있으므로 운영 시작 시각을 기록하고 이전 변경 알림을 제외한다. 예약 알림은 첫 실행 때 새 outbox로 생성될 수 있어 생성 시각만으로 과거 알림을 막지 못한다. 원래 예정 시각에도 시작 기준을 적용한다. 공급자가 이미 수락한 ticket의 receipt는 회원이 수신을 끈 이후에도 확인하되 새 발송과 구분한다.

PostgreSQL 권한 변경 SQL의 성공 응답만으로 접근 차단을 판정하지 않는다. 객체 소유자가 다른 관리형 역할이면 `REVOKE`가 warning만 남기고 실제 권한은 유지될 수 있다. `has_table_privilege`, `has_sequence_privilege`, `has_function_privilege`와 객체 owner/ACL을 운영에서 확인한다. 로컬 fixture의 객체 소유자가 운영과 같다는 보장이 없으므로 fixture 검사와 운영 catalog 확인을 별도 증거로 둔다. [PostgreSQL REVOKE](https://www.postgresql.org/docs/current/sql-revoke.html)

`pg_net`은 요청 큐에 HTTP 헤더를 저장한다. 설치 버전의 기본 권한과 실제 객체 소유자를 확인하고, 장기 인증 값을 넣기 전에 앱 역할의 큐 읽기·수정 권한이 차단됐는지 검증한다. Vault에서 값을 읽었다는 사실만으로 다음 저장 경로까지 안전해지지 않는다. Cron의 성공은 비동기 요청 접수만 뜻할 수 있으므로 응답의 HTTP 상태도 확인한다. [Supabase pg_net](https://supabase.com/docs/guides/database/extensions/pg_net) · [공식 확장 SQL](https://github.com/supabase/pg_net/blob/master/sql/pg_net.sql)

큐 권한을 관리할 수 없다면 큐에 인증 값을 저장하지 않는 호출 방식을 검토한다. 동기 `http` 확장도 선택지지만 DB 연결을 호출 시간만큼 점유하므로 워커 제한과 연결/요청 제한을 맞추고, 업무 행을 잠근 채 외부 워커를 기다리지 않는다. 요청 헤더·응답 원문·예외 원문을 저장하지 않으며 HTTP 상태·처리 개수·고정 오류 분류만 기록한다. 확장 버전에 따라 redirect 추적을 끌 수 없거나 디버그 로그에 헤더가 포함될 수 있으므로 라이브러리 소스와 운영 로그 수준을 함께 확인한다. [Supabase http](https://supabase.com/docs/guides/database/extensions/http) · [pgsql-http](https://github.com/pramsey/pgsql-http)

업무 알림의 실제 검증에는 켠 기기와 같은 종류만 끈 기기를 동시에 두면 수신과 차단을 함께 확인할 수 있다. 설정 저장·서버 대상 계산·ticket·receipt·휴대전화 표시·탭 이동은 각각 기록한다. 직접 공급자에 보낸 테스트 알림의 성공을 DB outbox와 자동 워커 경로 전체 통과로 보고하지 않는다.

pgsql-http 버전에 따라 POST redirect 추적을 비활성화하는 옵션이 없을 수 있다. 임의 인증 헤더는 redirect에도 전달될 수 있으므로 장기 시크릿을 사용하는 경우 고정 HTTPS 목적지·TLS 검증과 표준 Authorization의 교차 호스트 제한을 확인한다. 실제 동작 검사는 시크릿 대신 공개 가상 marker를 사용하고, 목적지의 정상 응답과 marker 부재를 함께 확인한다. 403 오류 응답에 marker가 없다는 사실은 redirect 보호 통과 증거가 아니다. C 확장의 DEBUG 로그가 요청 헤더를 출력하는지도 확인한다. [libcurl 인증 전달 정책](https://curl.se/libcurl/c/CURLOPT_UNRESTRICTED_AUTH.html) · [pgsql-http 1.6 소스](https://github.com/pramsey/pgsql-http/blob/v1.6.0/http.c)
