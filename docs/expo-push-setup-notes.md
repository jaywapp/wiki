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

이 문서의 명령과 예시는 독립적으로 작성한 설명용 자료다. 계정 로그인, EAS 연결, 자격 증명 업로드, 실제 DB 검사와 기기 녹화를 수행했다는 근거를 대신하지 않는다.
