# Windows Terminal 작업 공간 설계

## 구조

`D:\work\.workspace\windows-terminal`에 기존 Windows Terminal을 설정하는 스크립트와 실행 진입점을 둔다. 별도 GUI를 개발하지 않는다.

- `Configure-Terminal.ps1`: 실제 저장소를 열거하고 기존 settings.json에 관리 대상 프로필·프로젝트 명령·단축키를 병합한다. 원본 백업은 Terminal LocalState에 둔다.
- `Start-Workspace.ps1`: Codex 또는 Claude를 선택하여 도구 이름이 포함된 두 창을 연다. 오케스트레이터는 D:\work에서, 프로젝트 선택용 초기 셸도 D:\work에서 시작한다.
- `Open-Codex.cmd`, `Open-Claude.cmd`: 더블 클릭 실행 진입점. 실행 정책을 변경하거나 우회하지 않는다.
- 프로젝트 명령: newTab → splitPane(down, 25%) → moveFocus(up). 두 패널의 시작 디렉터리는 같은 저장소다. 공식 문서의 horizontal과 같은 방향이며, 최신 스키마 호환성을 위해 down을 사용한다.

창 위치는 기본 모니터의 작업 영역으로 계산한다. Terminal 크기 옵션은 픽셀이 아닌 문자 단위이므로 35:65는 근사값이며 Windows 스냅으로 조정할 수 있다.

## 기존 설정 보존

추가 항목은 `Work.*` ID와 고정 GUID로 식별한다. 다른 프로필, 작업, 키, 메뉴, 기본 프로필은 유지한다. 같은 키가 이미 사용자 설정에 있으면 새 키 배정을 생략한다. 생성 직후 JSON을 다시 파싱한다. 재적용 시 생성 항목만 교체하고 중복을 만들지 않는다.

현재 사용자 파일은 PowerShell 5.1에서 파싱 가능한 JSON임을 확인했다. UTF-8로 읽고 JSON을 재직렬화하므로 들여쓰기·속성 순서는 변경될 수 있다. 주석이 있는 JSONC로 바뀌면 PowerShell 5.1 파싱 오류로 적용을 중단한다. 임시 후보 파일을 만든 후 원자적으로 교체하며, 동시에 원본 백업을 보존한다. 저장소 순서는 .NET 버전별 문화권 정렬 차이를 피하도록 OrdinalIgnoreCase로 고정한다.

## 운영

기본 실행은 Codex. Claude 실행기는 별도 창 이름과 프로필을 사용한다. 도구 전환 시 기존 작업을 정리한다. 이 설정은 터미널 표시를 관리하며 서로 독립적인 CLI 세션 사이에 통신을 자동 연결하지 않는다.

명령 팔레트에서 `Work Codex <repository>` 또는 `Work Claude <repository>`를 선택한다. 선택한 현재 창에 프로젝트 탭이 추가되므로 오른쪽 프로젝트 창에서 사용한다. 새 저장소를 clone한 후 구성 스크립트를 다시 실행하면 메뉴가 갱신된다.

## 검증

PowerShell 5.1 파서 및 실제 JSON 생성 검사, 저장소별 명령/경로/패널 구성 검사, 기존 설정의 비관리 항목 보존 검사, 반복 생성 결과 비교, 실행 프로세스/창 제목 확인을 수행한다.

## 근거

- https://learn.microsoft.com/en-us/windows/terminal/command-line-arguments
- https://learn.microsoft.com/en-us/windows/terminal/customize-settings/actions
