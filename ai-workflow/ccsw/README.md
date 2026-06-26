# ccsw — Claude + Codex 환경 스위처

토큰 최적화 프로파일(모델 라우팅 · Codex 설정 · env · 압축 레이어)을 **한 명령으로 구축/스위칭**하는 경량 인프라 프로그램.
배경·전략은 [token-optimization-claude-codex.md](../token-optimization-claude-codex.md) 참고.

---

## 1. 환경 구축안 (프리셋 3종)

| 프로파일 | 대상 작업 | Claude 모델 | Codex effort | 압축 | 권장 effort |
|----------|-----------|-------------|--------------|------|-------------|
| **lean** | 일상·단순·반복 | Sonnet 4.6 (+탐색 Haiku) | low | RTK(훅) | low–medium |
| **balanced** | 기본 데일리 | Opus 4.8 (설계) / Codex·Sonnet (구현) | high | Headroom | high |
| **max** | 최난도·장기 에이전트 | Opus 4.8 (필요시 Fable 5) | high | Headroom | xhigh–max |

설계 원칙(요약):
- **모델 티어 분담** — 설계/리뷰=상위, 구현/반복=하위, 탐색 서브에이전트=Haiku.
- **압축은 필수 인프라** — 명령어 출력(git/npm/build)이 최대 소비처. lean은 가벼운 RTK 훅, balanced/max는 캐시 안정화까지 하는 Headroom.
- **세션 위생** — 작업 단위 분리, 긴 세션은 compaction.
- **교차 리뷰** — 한 도구의 diff는 반대 도구가 검토.

> 프로파일은 `profiles/*.json` 으로 정의된다. 팀 표준에 맞게 추가/수정 가능.

---

## 2. 인프라 프로그램 선택지

| 접근 | 장점 | 한계 |
|------|------|------|
| **Headroom 단독** | 압축·캐시 안정화를 GUI로 토글 | 모델 라우팅/Codex config/MCP 세트 스위칭은 안 됨 |
| **mise / direnv + dotfiles** | 프로젝트별 env·버전 관리 성숙 | Claude/Codex 설정·압축 토글을 묶어주진 않음(직접 글루 필요) |
| **ccsw (이 도구)** | 모델·Codex config·env·압축을 **한 번에** 전환, JSON 프로파일로 버전관리 | effort/Headroom GUI는 안내만(자동화 한계) |

→ **권장: ccsw로 오케스트레이션 + 압축은 RTK/Headroom에 위임.** 어느 단일 기존 도구도 (Claude 모델 + Codex config + 압축 레이어)를 함께 토글하지 못하는 공백을 ccsw가 메운다.

ccsw가 전환 시 자동으로 하는 일:
1. `~/.claude/settings.json` 에 모델 등 설정 병합(기존 파일 `.ccsw-bak` 백업)
2. `~/.codex/config.toml` 의 관리 키(model, reasoning effort) 갱신(다른 줄 보존, 백업)
3. 프로파일 env 변수 User 스코프 설정(이전 프로파일 키는 정리)
4. 압축 레이어 토글 — RTK는 `rtk init -g` / `--uninstall` 호출, Headroom은 시작 안내 (RTK 자동 재작성은 Windows에서 WSL 필요)
5. 활성 상태를 `~/.ccsw/active.json` 에 기록
6. 권장 effort/메모 출력

> effort와 Headroom(GUI)은 안전상 자동 강제하지 않고 **안내**한다(잘못된 키로 설정을 깨지 않기 위함).

---

## 3. 사용법

```powershell
# 프로파일 목록
./ccsw.ps1 list

# 전환
./ccsw.ps1 use balanced

# 현재 상태
./ccsw.ps1 status
```

PATH에 별칭을 걸면 어디서나 `ccsw use lean` 처럼 쓸 수 있다 (PowerShell `$PROFILE`):

```powershell
function ccsw { & "D:\workspace\repositories\wiki\ai-workflow\ccsw\ccsw.ps1" @args }
```

> macOS/Linux 사용 시 동일 로직을 bash로 포팅 가능(파일 경로/`SetEnvironmentVariable` 부분만 교체). 현재 레퍼런스는 Windows(PowerShell 5.1+) 기준.

---

## 4. 안전장치 / 주의

- 전환마다 `settings.json`·`config.toml`을 `.ccsw-bak`으로 백업(직전 1개 보관).
- `settings.json` 병합은 **top-level 키 shallow merge**(예측 가능, 중첩 객체는 통째 교체).
- env 변수는 User 스코프 → **새 터미널/에이전트 재시작 후 적용**.
- 압축 도구(RTK/Headroom)는 별도 설치 필요. ccsw는 토글만 담당.
- 첫 도입 시 `tokscale`로 베이스라인을 재고, 프로파일별 실제 절감률을 검증할 것.

---

## 5. 압축 레이어 런처 (cc-compress)

`ccsw`가 프로파일 전환 시 압축을 토글한다면, `cc-compress.ps1`은 **압축 도구만 독립적으로 켜고 끄고 상태 확인**하는 런처다(아침에 Headroom 켜고 밤에 끄는 식).

```powershell
./cc-compress.ps1 status            # RTK 훅/Headroom 프로세스 상태
./cc-compress.ps1 rtk on            # rtk init -g (Claude Code 훅 설치)
./cc-compress.ps1 rtk off           # rtk init -g --uninstall
./cc-compress.ps1 headroom start    # Headroom 앱 실행
./cc-compress.ps1 headroom stop     # Headroom 종료
```

별칭 등록(선택):

```powershell
Add-Content $PROFILE 'function ccx { & "D:\workspace\repositories\wiki\ai-workflow\ccsw\cc-compress.ps1" @args }'
```

**플랫폼 주의**:
- RTK 자동 재작성 훅은 **Windows에서 WSL 필요**(네이티브는 명시적 `rtk` 사용만).
- **Headroom은 로컬 프록시**(원격 서버 아님 → 다중 세션이 중앙 서버에 부하를 주지 않음). 다만 macOS 중심 앱이라 **Windows 지원은 확인 필요**. Windows에서 경로 지정 실행은 `$env:HEADROOM_PATH` 설정 후 `headroom start`.
- **성능·동시성**: Headroom은 단일 로컬 프록시 + ~2GB 런타임 상주(요청당 ~52ms). 세션을 **동시에 많이** 띄우면 로컬 CPU/메모리 경합 가능 → 그런 워크로드는 RTK(상주 프로세스 없음, <10ms)를 권장.

---

## 6. 향후 확장 아이디어

- 프로파일별 `CLAUDE.md` 스니펫 자동 주입(terse 규칙 등)
- 전환 시 `tokscale` 스냅샷 자동 기록으로 프로파일 간 비용 A/B
- 독립 저장소로 분리 후 scoop/winget 패키징
