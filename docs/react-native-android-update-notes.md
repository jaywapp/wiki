# React Native Android APK 업데이트 검증 메모

Android APK를 직접 배포할 때 재사용할 수 있는 서명 호환성, 접근성 상태, 릴리즈 자산 관리와 검증 근거를 정리한다. 특정 앱의 구현이나 테스트 결과를 기록한 문서는 아니다.

## 1. Android API 수준과 서명 인증서

`PackageInfo.signingInfo`와 `GET_SIGNING_CERTIFICATES`는 API 28부터 제공된다. `minSdk`가 24, 25, 26, 27이면 실행 기기의 API 수준에 따라 분기해야 한다. 높은 `compileSdk`로 빌드해도 구형 기기에 해당 API가 생기지 않는다. [PackageInfo 공식 문서](https://developer.android.com/reference/android/content/pm/PackageInfo#signingInfo), [PackageManager 공식 문서](https://developer.android.com/reference/android/content/pm/PackageManager#GET_SIGNING_CERTIFICATES)

| 실행 기기 | 조회 플래그 | 인증서 정보 |
| --- | --- | --- |
| API 24–27 | `GET_SIGNATURES` | `PackageInfo.signatures` |
| API 28 이상 | `GET_SIGNING_CERTIFICATES` | `PackageInfo.signingInfo` |

두 구형 항목은 API 28에서 deprecated가 되었지만 API 24–27 호환 분기에 필요하다. 인증서 배열의 순서는 보장되지 않으므로 첫 항목만 비교하지 않는다. [signatures 공식 문서](https://developer.android.com/reference/android/content/pm/PackageInfo#signatures)

다음은 인증서 조회 분기를 보여 주는 독립적인 Kotlin 예시다. APK 경로와 설치본을 조회할 때 같은 플래그를 사용한다. 조회 실패 또는 비어 있는 서명 정보는 검증 실패로 처리해야 한다.

```kotlin
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.pm.Signature
import android.os.Build

@Suppress("DEPRECATION")
fun certificateFlags(): Int =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        PackageManager.GET_SIGNING_CERTIFICATES
    } else {
        PackageManager.GET_SIGNATURES
    }

@Suppress("DEPRECATION")
fun currentSigners(info: PackageInfo): Array<Signature> =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        info.signingInfo?.apkContentsSigners ?: emptyArray()
    } else {
        info.signatures ?: emptyArray()
    }
```

고정된 배포 키를 사용하는 정책에서는 `getPackageArchiveInfo`로 얻은 검사 대상 APK와 `getPackageInfo`로 얻은 설치본의 현재 서명 인증서 집합을 비교한다. 인증서 원본 바이트 또는 인증서의 SHA-256 지문을 정규화해 집합으로 비교하고, 신뢰하는 배포 인증서에도 일치하는지 확인한다. 조회 API는 [PackageManager 공식 문서](https://developer.android.com/reference/android/content/pm/PackageManager)에 정의되어 있다.

위 예시는 현재 서명자만 반환한다. 키 교체를 허용하려면 별도의 정책이 필요하다. API 28 이상의 `SigningInfo`는 다중 서명 여부와 서명 이력을 구분하며, `signingCertificateHistory`를 현재 서명자 집합처럼 취급하면 안 된다. [SigningInfo 공식 문서](https://developer.android.com/reference/android/content/pm/SigningInfo)

배포 키는 빌드마다 임의로 바꾸지 않는다. Play App Signing을 사용하면 업로드 키와 사용자 설치본의 앱 서명 키가 다를 수 있으므로 실제 배포 채널의 인증서를 기준으로 판단한다. [앱 서명 공식 안내](https://developer.android.com/studio/publish/app-signing)

업데이트 파일 검사는 다음 조건을 함께 확인하도록 설계한다.

- **파일 SHA-256와 바이트 크기:** 다운로드된 APK가 신뢰하는 배포 메타데이터와 같은 파일인지 확인한다. 파일 SHA-256와 인증서 SHA-256는 서로 다른 값이다. APK와 체크섬이 함께 변조될 수 있으므로 체크섬만으로 배포자를 인증하지 않는다.
- **앱 ID:** APK의 패키지 이름이 업데이트하려는 설치본과 같은지 확인한다.
- **서명 인증서:** 검사 대상 APK, 설치본, 신뢰하는 배포 키의 관계가 정책에 맞는지 확인한다.
- **versionCode:** 새 릴리즈는 설치본보다 큰 값을 사용한다. `versionName`은 사용자에게 보이는 문자열이며 업데이트 순서를 대신하지 않는다. [버전 관리 공식 안내](https://developer.android.com/studio/publish/versioning)

이 항목들은 업데이트 클라이언트의 사전 검사 정책이다. 최종 설치 호환성은 Android 패키지 설치 과정에서도 확인한다.

## 2. React Native 0.86.3의 busy 상태와 contentDescription

`v0.86.3`의 Android `BaseViewManager.updateViewContentDescription`은 label, 일부 접근성 상태, value text로 목록을 만들고 목록이 비어 있지 않을 때만 `setContentDescription`을 호출한다. `busy=true`는 상태 설명을 추가하지만 `busy=false`는 추가하지 않는다. label과 다른 설명 요소가 없으면 true→false 전환 뒤 목록이 비어 이전 설명이 남을 수 있다. 이는 해당 소스의 조건문에서 도출한 동작이다. [v0.86.3 고정 태그 소스](https://github.com/facebook/react-native/blob/v0.86.3/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/uimanager/BaseViewManager.java#L330-L410)

재현은 같은 버튼을 유지한 채 label 없이 busy를 false→true→false로 바꾸고, 각 시점의 UI 계층 XML에서 동일 노드의 `content-desc`를 비교한다. 마지막 XML에 이전 busy 설명이 남는지 관찰한다. 문구는 기기 언어에 따라 달라진다. 다음 XML은 관찰 항목을 설명하기 위한 예시이며 실제 실행 결과가 아니다.

```xml
<!-- While busy is true -->
<node content-desc="busy" clickable="true" />
<!-- After busy becomes false: inspect whether the old value remains -->
<node content-desc="busy" clickable="true" />
```

버튼에 명시적인 label을 제공하면 busy가 해제되어도 설명 목록에 label이 남아 갱신할 수 있다. 아래는 독립적인 TSX 예시다.

```tsx
import React, {useState} from 'react';
import {Pressable, Text} from 'react-native';

export function UpdateButton({runUpdate}: {runUpdate: () => Promise<void>}) {
  const [busy, setBusy] = useState(false);

  async function handlePress() {
    if (busy) return;
    setBusy(true);
    try {
      await runUpdate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Check for updates"
      accessibilityState={{busy, disabled: busy}}
      disabled={busy}
      onPress={handlePress}>
      <Text>{busy ? 'Checking...' : 'Check for updates'}</Text>
    </Pressable>
  );
}
```

수정 후 같은 절차로 idle XML의 `content-desc`가 버튼 label인지 확인한다. 다른 속성 변경이나 노드 재생성도 설명 값에 영향을 줄 수 있다. XML은 접근성 속성의 근거이고 TalkBack 발화는 기기에서 별도로 확인해야 한다. `busy:false` 때문에 항상 설명이 추가된다는 해석은 소스와 맞지 않는다.

## 3. APK 릴리즈 자산을 완성한 뒤 게시하기

APK 직접 배포에서는 다음 절차를 운영 원칙으로 사용한다.

1. 새 태그와 증가한 `versionCode`로 APK를 빌드한다.
2. 릴리즈를 draft로 만든다.
3. 서명된 APK, 업데이트 manifest, checksum 파일을 모두 첨부한다. 여기서 manifest는 APK 내부 `AndroidManifest.xml`과 별개인 배포 메타데이터이며, 앱 ID, `versionCode`, APK 파일명, 바이트 크기와 파일 SHA-256가 서로 일치해야 한다.
4. 첨부 자산을 다시 읽어 검증한 뒤 draft를 게시한다.
5. 게시된 자산은 불변으로 관리한다. 수정이 필요하면 새 `versionCode`와 새 태그로 릴리즈한다.

GitHub의 immutable releases가 활성화된 경우 게시 후 자산과 연결된 태그 변경이 실제로 제한된다. 일반 릴리즈까지 자동으로 불변인 것은 아니므로 플랫폼 설정과 운영 원칙을 구분해야 한다. GitHub도 draft에 모든 자산을 첨부한 후 게시하는 순서를 안내한다. [불변 릴리즈 공식 안내](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases), [릴리즈 관리 공식 안내](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)

기존 태그의 워크플로를 재실행해 게시된 APK만 교체하면 설치본, manifest, 캐시, checksum이 서로 다른 파일을 가리킬 수 있다. 실패한 draft 작업을 재시도할 때도 모든 자산의 일치를 다시 확인한다. 게시 이후에는 새 릴리즈를 만드는 원칙으로 추적 가능성을 유지한다.

## 4. 검증 근거를 구분해서 기록하기

| 검증 종류 | 확인할 수 있는 내용 | 완료 보고에 남길 근거 |
| --- | --- | --- |
| 코드·빌드·정적 검사 | API 분기, 자료형, 패키징과 검사 로직 | 검사 명령, 성공/실패, 대상 버전과 산출물 식별 정보 |
| 에뮬레이터 | 지정 API 수준의 실행 경로, UI 상태 전환과 설치 흐름 | API 수준, 초기 설치 버전, 수행 단계, XML 전후 차이와 설치 결과 |
| 실제 기기·실제 계정 설치 | 배포 채널의 다운로드·권한·인증·설치와 데이터 보존 | 기기/OS, 이전·이후 versionCode, 배포 자산 일치 여부와 관찰 결과 |

코드 검사 성공만으로 에뮬레이터나 실제 계정 설치가 검증되었다고 기록하지 않는다. 실제 계정이 필요한 흐름을 시험하지 않았으면 미검증으로 명시한다. API 24–27 호환성은 해당 API 기기에서, API 28 이상 경로는 별도 기기에서 확인한다. 최초 설치와 기존 버전에서의 업데이트도 구분한다.

이 메모는 공식 문서와 공개 소스에 근거한 절차 설명이다. 예시 코드는 특정 앱에서 실행·컴파일한 결과가 아니며, XML 예시는 재현 결과를 대신하지 않는다. 공개 검증 기록에는 개인 계정, 인증 정보와 내부 다운로드 주소를 포함하지 않는다.

## 5. 공개 APK 채널과 비공개 소스를 나누기

소스가 비공개인 앱도 APK 전용 공개 저장소에서 설치 파일을 제공할 수 있다. 공개 릴리즈 자산은 GitHub 계정 없이 받을 수 있으므로 앱의 회원 기능 권한은 앱 로그인·서버 권한으로 관리한다. 공개 저장소에는 배포 파일·체크섬·정제된 변경 안내를 두고, 소스 커밋·내부 로그를 공개 릴리즈 본문에 자동으로 넣지 않는다. [릴리즈 자산 API](https://docs.github.com/en/rest/releases/assets)

소스 저장소의 Actions가 다른 저장소에 릴리즈를 올릴 때는 게시 대상의 권한을 별도로 준비한다. 기본 GITHUB_TOKEN을 모든 저장소의 쓰기 토큰으로 가정하지 않는다. 공개 배포 저장소만 Contents:write를 허용한 전용 토큰이나 GitHub App 설치 토큰을 사용하고, 소스 조회에는 기존 워크플로 토큰을 사용할 수 있다. [워크플로 인증 공식 안내](https://docs.github.com/en/actions/tutorials/authenticate-with-github_token)

### 공개 자산 조회와 REST 호출 한도

익명 REST 호출의 기본 한도는 출발 IP별 시간당60회다. 릴리즈20개와 릴리즈별 작은 자산2개를 모두 REST로 읽으면 한 번에41회를 쓰므로, 성공 캐시10분만으로 충분하지 않을 수 있다. 이는 호출 수를 계산한 예시이며 실제 부하 측정값이 아니다. [REST 호출 한도](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)

공개 릴리즈 목록은 REST로 읽고, 자산은 browser_download_url로 다운로드하는 구성을 검토한다. 허용된 공개 저장소의 HTTPS URL·태그·파일명을 검증하고, 자산 및 CDN 요청에 저장소 토큰을 전달하지 않는다. 목록 호출을 줄이는 캐시·동시 요청 병합도 함께 적용한다. 공개 파일의 바이트 크기·체크섬 검증과 회원 기능의 서버 권한 검사는 각각 유지한다.

### draft 검증에는 release ID 사용

태그 생성과 draft 공개 순서에 따라 by-tag REST 조회가404를 반환할 수 있으므로, 게시 전 자산 검증은 draft의 release ID를 확보하여 수행한다. GitHub CLI의 release view JSON에는 databaseId가 있다. [CLI 공식 안내](https://cli.github.com/manual/gh_release_view)

```bash
release_id=$(gh release view "$tag" --repo "$release_repo" --json databaseId --jq .databaseId)
gh api "repos/$release_repo/releases/$release_id" > draft-release.json
```

ID를 사용하는 것은 접근 권한을 바꾸는 작업이 아니다. draft에 대한 권한이 있는 인증 환경에서 자산의 업로드 완료·크기·digest를 확인하고, 모든 검증이 끝난 뒤 공개한다. 공개 태그의 대상은 공개 저장소 안에서 실제로 존재하는 커밋으로 선택한다.
