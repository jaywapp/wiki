# Windows Terminal 멀티 프로젝트 사용법

## 시작

바탕화면 `Work - Codex` 바로가기를 실행한다. 또는 `D:\work\.workspace\windows-terminal\Open-Codex.cmd`를 더블 클릭한다.

왼쪽은 `D:\work`의 Codex 오케스트레이터, 오른쪽은 프로젝트 창이다. 왼쪽 CLI가 초기 신뢰 확인이나 로그인을 표시하면 사용자가 직접 확인한다.

오른쪽에서 **Ctrl+Shift+P**를 누르고 **Work Codex 저장소명**을 입력한 뒤 선택한다. 선택한 저장소에서 위쪽 Codex, 아래쪽 로그/테스트용 PowerShell이 한 탭으로 열린다. 같은 방식으로 필요한 프로젝트를 추가한다. 새 탭은 명령 팔레트를 연 현재 창에 생긴다.

## 이동

| 조작 | 단축키 |
|---|---|
| 프로젝트 검색 / 명령 팔레트 | Ctrl+Shift+P |
| 다음 / 이전 탭 | Ctrl+Tab / Ctrl+Shift+Tab |
| 위 / 아래 패널 이동 | Alt+↑ / Alt+↓ |
| 현재 패널 확대 / 복귀 | Ctrl+Shift+Enter |
| Codex 오케스트레이터 창으로 이동 | Ctrl+Alt+O |
| Codex 프로젝트 창으로 이동 | Ctrl+Alt+P |

마지막 세 키는 기존 사용자 설정에 같은 키가 있으면 등록을 생략한다. 창 이동 키는 Terminal이 실행 중일 때 동작한다. 다른 앱이 같은 전역 키를 선점하면 사용할 수 없다.

두 창의 크기는 문자 단위로 계산한 근사 35:65이다. 모니터 배율에 따라 가장자리를 드래그하거나 Windows 스냅으로 조절한다. 실행기를 다시 누르면 기존 이름의 창에 새 탭이 추가되며 기존 세션은 종료되지 않는다.

## Claude 작업

기존 Codex 작업을 정리한 후 `Work - Claude` 바로가기 또는 `Open-Claude.cmd`를 실행한다. 오른쪽 명령 팔레트에서는 `Work Claude 저장소명`을 선택한다. 창 이동 전역 키는 Codex용이고, Claude 창 이동은 Alt+Tab을 사용한다.

이 구성은 독립 CLI 터미널을 배치한다. 세션 간 자동 통신, 위임, 작업 상태 집계 기능을 추가하지 않는다. 기존 Codex 앱 작업이 새 CLI로 자동 이전되는 것도 아니다. 종료한 CLI 프로세스가 자동 복원되지는 않는다.

## 새 저장소 반영 / 복구

```powershell
& D:\work\.workspace\windows-terminal\Configure-Terminal.ps1 -Install
```

`D:\work` 바로 아래 `.git`이 존재하는 디렉터리를 다시 검색한다. 사용자 실행 정책은 변경하지 않는다. 스크립트가 정책에 의해 차단되면 오류 원인을 확인한다.

기존 설정 백업은 `%LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json.work-backup-<timestamp>`에 있다. 설정 UI를 닫고 필요한 백업을 `settings.json`으로 복사하면 복구할 수 있다. 백업 이후 추가한 사용자 설정도 되돌아가므로 먼저 현재 파일을 보관한다. 백업은 외부 전송하거나 Git에 추가하지 않는다.
