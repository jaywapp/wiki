# Windows React Native·Expo Android 빌드의 긴 경로 오류

상태: 2026-10-03, 짧은 경로에서 APK 빌드·서명·설치·방문자 실행 검증 완료.

깊은 worktree에서 Android 네이티브 빌드를 실행하면 CMake/Ninja 중간 파일 경로가 길어져 260자 제한 오류가 발생할 수 있다. JavaScript 타입 검사와 번들 생성이 통과해도 발생할 수 있으므로, 실패 로그에 나온 실제 객체 파일 경로와 길이를 먼저 확인한다.

## 짧은 경로에서 재검증

1. 원본 소스 변경을 잠시 멈추고 `D:\rn-build`처럼 짧은 별도 검증 경로를 준비한다.
2. 소스·자산·로컬 네이티브 모듈·빌드 스크립트·설정·`package.json`·`package-lock.json`을 복사한다. 원본 **루트**의 `node_modules`, 생성된 `android`/`ios`, `.expo`, 빌드 산출물은 제외한다. 로컬 모듈 안의 `android`는 소스이므로 보존한다. Robocopy `/XD`에는 제외할 루트 폴더의 절대 경로를 지정한다.
3. 같은 대상 경로에 여러 Robocopy를 동시에 실행하지 않는다. 각 복사가 끝난 뒤 다음 복사를 실행하며, 종료 코드 8 이상이면 실패로 처리한다. `.env`, 서명 키, 개인 환경 설정은 일반 소스 복사에 포함하지 않는다.
4. 상대 경로별 파일 목록과 SHA-256으로 원본·복사본의 소스 및 잠금파일이 일치하는지 확인한다. `App`, `src`, `modules`, `plugins`, `assets`, `scripts`와 앱 설정을 포함하고, 생성물·비밀 파일은 비교 대상에서 제외한다.
5. 최종 복사와 해시 비교가 끝난 뒤 복사본에서 설치·native 생성·빌드를 순서대로 실행한다. 프로젝트에 아래 스크립트가 정의된 경우의 예다.

```powershell
npm ci
npm run prebuild:android
npm run build:android
```

같은 디렉터리에서 복사와 `npm ci`, 또는 여러 `npm ci`를 겹치면 의존성 삭제·설치와 파일 교체가 경합한다. 대상 디렉터리마다 한 작업만 실행한다. 원본 `node_modules`나 깊은 경로가 들어 있는 CMake/Ninja 캐시를 재사용하지 않는다. 필요한 비밀 값은 기존 보안 경로로만 주입하고 문서·로그에 출력하지 않는다.

## 결과를 인정하는 기준

소스 해시 외에 생성된 Android 설정도 확인한다. 앱 ID·버전, Hermes 등 런타임 설정, ABI 목록과 서명 방식이 의도한 조건과 같은지 대조하고, 성능 실험에서 의도적으로 변경한 옵션은 따로 기록한다. 설치 전에 APK의 ABI 목록·서명 인증서 지문·앱 식별자·버전을 확인하고 에뮬레이터 또는 기기에서 설치·실행 스모크를 수행한다.

빌드 종료나 APK 파일 존재만으로 해결을 확정하지 않는다. 성공한 짧은 경로, 도구 버전, 소스·설정 비교 결과, ABI·서명 일치 여부와 실행 결과를 기록하되 비밀 값은 남기지 않는다.

## 이번 검증 결과

- 경충FC의 깊은 worktree에서 실패했던 빌드를 `D:\station\.work\gcpm`에서 완료했다. Node 22.19, JDK 17, Android SDK/API 36, NDK 27.1.12297006, CMake 3.22.1 환경이다.
- 원본과 짧은 빌드 경로의 입력 142개 SHA-256을 빌드 전후 대조했다. 같은 입력으로 R8를 끈 기준 APK와 켠 최적화 APK를 만들었고 기존 서명과 4 ABI를 유지했다.
- Android 16/API 36 x86_64 임시 read-only AVD에 기존 앱을 삭제하지 않고 설치했다. 방문자 검사 42개를 통과하고 후보·manifest·설치 APK의 SHA가 일치함을 확인했다. 실제 휴대전화와 다른 ABI의 실행을 검증한 결과는 아니다.
- 첫 시도는 에뮬레이터 System UI 응답 없음 대화상자로 실패했다. 증거를 보존하고 기기를 복구한 뒤 동일 APK·동일 검사·동일 제한 시간으로 전체 검사를 다시 통과했다.
- APK 비교에서는 JS·앱 assets·native .so 보존을 확인했다. R8가 코드에 맞춰 다시 생성하는 `assets/dexopt/baseline.prof`, `baseline.profm` 두 파일은 hash·size 차이를 별도로 기록했다. 모든 assets 차이를 무시하는 방식으로 검증을 완화하지 않았다.

## 참고

- [Windows 최대 경로 길이](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation)
- [Android Baseline Profiles와 R8 변환](https://developer.android.com/topic/performance/baselineprofiles/overview)
