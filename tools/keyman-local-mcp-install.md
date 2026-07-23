# KeyMan 로컬 MCP 설치와 검증

KeyMan은 Windows Credential Manager에 비밀값을 저장하고, Codex와 Claude Code에는 비밀값 대신 로컬 작업 도구만 제공한다.

## 설치 결과

기본 설치 경로는 `%LOCALAPPDATA%\Programs\KeyMan`이다.

| 파일 | 용도 |
|---|---|
| `KeyMan.Gui.exe` | WPF GUI |
| `key-man.exe` | CLI |
| `keyman.exe` | CLI 호환 별칭 |
| `key-man-mcp.exe` | Codex·Claude 공용 stdio MCP 서버 |

설치 프로그램은 사용자 `PATH`에 설치 경로를 추가하고 `KEYMAN_HOME`을 등록한다. 이미 실행 중인 터미널에는 새 환경변수가 반영되지 않으므로 새 터미널을 연다.

## 전역 플러그인 설치

`<marketplace-root>`는 `.agents/plugins/marketplace.json`과 `.claude-plugin/marketplace.json`이 들어 있는 marketplace 저장소 루트다.

```powershell
codex plugin marketplace add <marketplace-root>
codex plugin add key-man-mcp@jaywapp-marketplace

claude plugin marketplace add --scope user <marketplace-root>
claude plugin install --scope user key-man-mcp@jaywapp-marketplace
```

플러그인은 사용자 전역 범위로 설치한다. 설치 후 Codex와 Claude Code에서 새 세션을 시작해야 새 스킬과 MCP 서버가 로드된다.

## 검증

```powershell
Get-Command key-man.exe
Get-Command key-man-mcp.exe
codex plugin list
claude plugin details key-man-mcp@jaywapp-marketplace
claude mcp list
```

Claude의 정상 연결 표시는 다음과 같다.

```text
plugin:key-man-mcp:key-man: key-man-mcp.exe - Connected
```

Codex는 `codex plugin list`에서 `installed, enabled` 상태를 확인한다.

## 보안 경계

- MCP 응답은 키·토큰 값을 반환하지 않는다.
- `keyman_copy`는 비밀값을 로컬 클립보드에만 복사한다.
- 등록은 로컬 클립보드 또는 이름이 지정된 환경변수에서만 수행한다.
- `.env`, 토큰, 키 값을 프롬프트나 로그에 출력하지 않는다.

## Windows 파일명 충돌 주의

Windows 파일시스템은 일반적으로 파일명 대소문자를 구분하지 않는다. 따라서 GUI `KeyMan.exe`와 CLI 별칭 `keyman.exe`를 같은 디렉터리에 설치하면 하나가 다른 하나를 덮어쓴다. GUI 설치 파일명은 `KeyMan.Gui.exe`처럼 완전히 다른 이름을 사용해야 한다.
