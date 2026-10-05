# Android APK 발행 검증 근거 남기기

작성일: 2026-10-05 · 작성 도구: Codex

서명 APK를 만들어 설치 검사한 뒤 공개 배포하는 작업에서는 각 단계가 같은 파일을 사용했는지 확인한다. 검사한 실행·소스 커밋·앱 ID·버전·파일 SHA-256과 검증 범위를 함께 기록한다. 공개 메모에는 비공개 저장소의 코드·주소·커밋·회원 정보·자격 증명을 옮기지 않는다.

## 같은 파일을 연결하는 기준

| 단계 | 남길 근거 |
| --- | --- |
| 소스 | 저장소, workflow 실행 ID, 실행 번호, 이벤트·브랜치·head SHA, 검사 결과 |
| 빌드 | APK 앱 ID, versionName/versionCode, 전체 파일 크기·SHA-256 |
| 서명 | apksigner 검증 결과와 승인한 공개 인증서 fingerprint |
| 설치 | 기기/에뮬레이터 OS·API, 검사 수, 설치 APK와 빌드 APK의 해시 대조 |
| 공개 배포 | 릴리스 태그·draft 여부, 자산 이름·크기·업로드 digest, 실제 무인증 다운로드 해시 |
| 업데이트 조회 | 앱이 사용하는 실제 parser로 메타데이터 확인, 공개 APK·manifest와 값 대조 |

`latest` 별칭만 확인하면 구버전 또는 다른 빌드를 놓칠 수 있다. 버전별 자산·latest 별칭을 각각 내려받아 같은 APK인지 확인한다. 체크섬 목록이나 서버가 제공하는 digest는 로컬에서 다운로드 파일 전체를 계산한 값과 대조한다. manifest에는 앱 ID·버전·자산명·크기·해시·출시 안내 등 실제 클라이언트의 입력 계약을 적용한다.

## 성공 실행에도 화면 증거 보존

UI smoke가 PNG·XML을 생성해도 upload 대상에 넣지 않으면 실행 종료 후 받을 수 없다. 성공 artifact의 `path`에 APK·manifest·검사 결과와 필요한 PNG를 명시한다. 실패용 artifact만 남기면 정상 출시 화면을 검토하기 어렵다. 숨김 디렉터리 사용 여부와 업로드 경로를 확인하고, 받아 본 artifact에서 실제 파일 존재까지 확인한다.

GitHub Actions artifact의 digest는 업로드 묶음의 무결성 근거다. 개별 APK 해시와 구분해서 사용한다. [GitHub 공식 artifact 문서](https://docs.github.com/en/actions/tutorials/store-and-share-data)

검사 APK를 다시 빌드해서 공개 파일로 바꾸면 앞선 설치 검증과 파일이 달라진다. 검증한 APK 자체를 패키징·발행하고, 발행 직전 자산 검사와 발행 후 무인증 다운로드를 연결한다. 수정이 필요하면 증가한 별도 버전으로 검사한다.

## Windows 확인 예시

PowerShell에서는 파일 전체 해시를 계산한다.

```powershell
Get-FileHash -LiteralPath 'D:\evidence\release.apk' -Algorithm SHA256
```

Android SDK Build Tools의 apksigner로 공개 APK 서명을 확인한다.

```text
apksigner verify --verbose --print-certs release.apk
```

apksigner는 APK 서명과 지원 Android 플랫폼에 대한 검증 결과를 제공한다. 예상 공개 fingerprint와의 일치는 별도로 대조한다. 개인 서명 키를 읽거나 로그에 출력할 필요가 없다. [Android 공식 apksigner 문서](https://developer.android.com/tools/apksigner)

## 결과를 보고할 범위

방문자 에뮬레이터 smoke 통과, 합성 인증/REST 화면 테스트, 실제 회원 단말의 전화 앱·권한·업데이트 설치는 각각 별도 근거다. Android 검증으로 iOS 성공을 대신하지 않는다. 완료 기록은 확인한 플랫폼·기기·실행·파일과 수행하지 않은 사용자 흐름을 함께 남긴다.
