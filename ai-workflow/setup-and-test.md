# 토큰 최적화 환경: 직접 구성 & 테스트 가이드

> 직접 손으로 구성해서 **실제 토큰 절감을 측정**해보기 위한 실행형 문서.
> 배경/전략은 [token-optimization-claude-codex.md](token-optimization-claude-codex.md), 스위처는 [ccsw](ccsw/README.md) 참고.
> 환경: Windows 11 + PowerShell 기준(설치 명령은 2026-06 시점, 각 저장소에서 최신 확인 권장).

---

## 0. 이 가이드로 얻는 것

- lean / balanced 두 프로파일을 직접 깔고
- **같은 작업을 2번**(최적화 전/후) 돌려
- `tokscale`로 **세션당 토큰을 실측 비교**한다.

소요: 약 30~40분.

---

## 사전 점검

```powershell
claude --version      # Claude Code
codex --version       # Codex CLI (없으면 Claude만으로도 진행 가능)
pwsh --version        # 또는 Windows PowerShell 5.1
git --version
node --version        # tokscale 실행용(npx)
```

> Codex가 없으면 Codex 관련 단계는 건너뛰고 Claude Code 기준으로 측정하면 된다.

---

## STEP 1 — 측정 도구 설치 + 베이스라인 (가장 먼저)

**측정 없이는 최적화 효과를 확인할 수 없다.** 아무것도 바꾸기 전에 현재 사용량을 먼저 본다.

```powershell
npx tokscale@latest          # 인터랙티브 TUI (Claude Code + Codex 자동 감지)
# 또는 특정 화면
npx tokscale@latest models   # 모델별
npx tokscale@latest monthly  # 일/월별
```

tokscale은 `~/.claude/projects/`(Claude Code)와 `~/.codex/sessions/`(Codex)를 스캔한다.

> **베이스라인 기록**: 오늘 날짜의 총 토큰/비용을 메모해 둔다. 이게 비교 기준이다.

---

## STEP 2 — 압축 도구 설치 (명령어 출력 압축)

명령어 출력(git/npm/build)이 최대 소비처다. 둘 중 하나 선택:

### 옵션 A) RTK — CLI, 가볍고 무료 (권장: WSL 사용자)

```bash
# WSL/Linux/macOS
brew install rtk                                  # Homebrew
# 또는
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
# 또는
cargo install --git https://github.com/rtk-ai/rtk

rtk --version
rtk init -g          # Claude Code 훅 설치 → Claude Code 재시작
rtk gain             # 절감 통계 확인
```

> ⚠️ **Windows 네이티브 주의**: RTK 자동 재작성 훅은 **WSL이 필요**하다. 순수 Windows에선 `rtk` 명령을 명시적으로 쓰는 정도만 동작. WSL이 없으면 옵션 B 권장.

### 옵션 B) Headroom — GUI 프록시 (Windows 네이티브 친화)

- [extraheadroom.com](https://extraheadroom.com/) 앱 설치 → 실행 → 최적화 활성화.
- Claude Code + Codex 둘 다 로컬 프록시로 가역 압축. 내부에 RTK 번들 포함.

---

## STEP 3 — ccsw 스위처 셋업

ccsw는 이 wiki에 들어있다(`ai-workflow/ccsw/`). PowerShell 프로파일에 별칭을 등록한다.

```powershell
# $PROFILE 파일이 없으면 생성
if (-not (Test-Path $PROFILE)) { New-Item -ItemType File -Force -Path $PROFILE | Out-Null }

# 별칭 추가 (경로는 본인 환경에 맞게)
Add-Content $PROFILE 'function ccsw { & "D:\workspace\repositories\wiki\ai-workflow\ccsw\ccsw.ps1" @args }'

# 현재 세션에 즉시 반영
. $PROFILE

ccsw list      # balanced, lean, max
ccsw status    # 아직 활성 프로파일 없음
```

> ccsw는 전환 시 `~/.claude/settings.json`·`~/.codex/config.toml`을 `.ccsw-bak`으로 백업한다(롤백은 STEP 7).

---

## STEP 4 — 프로파일 적용

```powershell
ccsw use lean       # 절약형부터 시작
ccsw status         # 적용된 모델/압축 확인
```

> env 변수는 User 스코프라 **새 터미널/에이전트 재시작 후** 적용된다. 적용 후 Claude Code/Codex를 새로 띄운다.

---

## STEP 5 — A/B 테스트 (핵심)

**같은 작업을 동일 조건에서 2번** 돌려 비교한다. 작업은 토큰을 적당히 쓰는 현실적인 것으로(예: "이 모듈 리팩터링", "테스트 추가", "버그 수정").

### A. 최적화 OFF (베이스라인)

```powershell
ccsw status         # 압축 미적용 상태(또는 압축 끄기)에서
# 새 Claude Code 세션에서 작업 1회 수행 → 완료 후 /clear
```

### B. 최적화 ON

```powershell
ccsw use lean       # 압축 + 저가 모델 적용
# 새 세션에서 "동일한 작업"을 다시 수행 → 완료 후 /clear
```

### C. 비교

```powershell
npx tokscale@latest      # 두 세션의 토큰/비용 비교
rtk gain                 # (RTK 사용 시) 명령어 출력 절감량
```

비교 포인트:
- **세션 총 입력/출력 토큰** (tokscale)
- **캐시 적중** — 반복 작업에서 캐시 읽기 비중
- **결과 품질** — 절감했는데 결과가 나빠지면 의미 없음(동일 결론 도달 여부 확인)

> 공정한 비교를 위해: 작업 내용·프롬프트를 최대한 동일하게, 각 세션은 `/clear`로 격리.

---

## STEP 6 — 판단 & 튜닝

| 관찰 | 조치 |
|------|------|
| lean에서 품질 저하 | balanced로(`ccsw use balanced`), 설계는 Opus로 |
| 토큰 거의 안 줆 | 소비처가 명령어 출력이 아닐 수 있음 → tokscale로 비싼 프롬프트 추적 |
| 캐시 읽기 0 | 시스템 프롬프트/도구 목록에 변동 요소 있는지 점검(silent invalidator) |
| 출력이 장황 | CLAUDE.md에 terse 규칙 추가 / caveman 스킬 |

작업 성격별로 `lean`(일상) ↔ `balanced`(설계/복잡) 전환하며 쓴다.

---

## STEP 7 — 롤백

```powershell
# Claude 설정 복원
Copy-Item "$HOME\.claude\settings.json.ccsw-bak" "$HOME\.claude\settings.json" -Force
# Codex 설정 복원
Copy-Item "$HOME\.codex\config.toml.ccsw-bak" "$HOME\.codex\config.toml" -Force
# RTK 훅 제거
rtk init -g --uninstall
```

---

## 체크리스트

- [ ] tokscale로 베이스라인 기록
- [ ] RTK(WSL) 또는 Headroom(GUI) 설치
- [ ] ccsw 별칭 등록, `ccsw list` 확인
- [ ] 동일 작업 A/B(OFF→ON) 수행
- [ ] tokscale/`rtk gain`으로 절감률·품질 비교
- [ ] 결과 보고 프로파일 운영 방침 결정

---

## 참고

- tokscale: https://github.com/junhoyeo/tokscale
- RTK: https://github.com/rtk-ai/rtk
- Headroom: https://extraheadroom.com/
- ccsw(이 저장소): [ai-workflow/ccsw](ccsw/README.md)
