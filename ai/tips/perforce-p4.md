# Perforce(P4) 환경에서의 토큰 최적화

> git이 아니라 Perforce(Helix Core) 워크스페이스에서 Claude Code/Codex를 쓸 때의 토큰 최적화 적응안.
> 일반 전략은 [token-optimization-claude-codex.md](token-optimization-claude-codex.md), 구성·테스트는 [setup-and-test.md](setup-and-test.md) 참고.

---

## 0. 왜 P4는 따로 봐야 하나

1. **에이전트가 git을 가정한다** — Claude Code/Codex는 기본적으로 `git status`/`git diff`를 시도한다. P4 워크스페이스에선 실패하거나 빈 결과 → **헛도는 명령·재시도로 토큰 낭비**.
2. **p4 출력이 장황하다** — `p4 opened`, `p4 fstat`, `p4 describe`, `p4 sync` 기본 출력이 길다. 그대로 컨텍스트에 들어가면 비싸다.
3. **압축 도구가 git 중심** — RTK는 git/npm/cargo 등 100+ 명령을 압축하지만 **p4 명령 커버는 보장되지 않는다**(저장소에서 확인 필요). 즉 git용 절감 인프라를 그대로 못 쓴다.
4. **diff/변경파일 추출 방식이 다르다** — 리뷰·교차검증의 핵심인 diff를 git이 아니라 p4 방식으로 뽑아야 한다.

→ 결론: **(A) 에이전트에게 P4를 선언하고, (B) p4 출력을 네이티브 플래그로 줄이고, (C) 압축은 VCS-무관 프록시(Headroom)로 보완**한다.

---

## A. 에이전트에 "이건 Perforce" 선언 (가장 큰 절감)

가장 먼저, `AGENTS.md`(또는 `CLAUDE.md`)에 아래 블록을 넣는다. git 시도를 막는 것만으로 낭비가 크게 준다.

```markdown
## Version control: Perforce (NOT git)
이 워크스페이스는 Perforce(Helix Core)다. git 명령을 쓰지 말 것 — 실패하거나 오도한다.
- 변경/오픈 파일:   p4 -F "%depotFile% %action%" opened
- 펜딩 작업 diff:    p4 diff -du
- 제출된 CL의 diff:  p4 describe -du <CL>   (요약만 필요하면 -s)
- 이력:             p4 changes -m 10 -s submitted //path/...
- 파일 내용은 동기화된 워크스페이스 파일을 직접 읽는다(p4 print 회피).
- 출력 토큰을 줄이기 위해 위의 terse 플래그를 항상 사용한다.
- p4 submit / revert / delete 는 사용자 승인 없이는 절대 실행하지 않는다.
```

> 워크스페이스 공통 규칙상 `AGENTS.md`와 `CLAUDE.md`는 동등하다 — 어느 쪽이든 무방.

---

## B. p4 출력을 네이티브로 압축 (RTK 없이도 가능)

P4는 출력 토큰을 줄이는 플래그가 풍부하다. **terse 플래그를 쓰면 RTK 같은 압축기 없이도 절감**된다.

| 목적 | 기본(장황) | terse(권장) |
|------|-----------|-------------|
| 오픈 파일 목록 | `p4 opened` | `p4 -F "%depotFile% %action%" opened` |
| 펜딩 diff | `p4 diff` | `p4 diff -du`(필요 파일만) |
| 제출 CL diff | `p4 describe <CL>` | `p4 describe -du <CL>` / 요약은 `-s` |
| 변경 이력 | `p4 changes` | `p4 changes -m 10 -s submitted //path/...` |
| 파일 메타 | `p4 fstat <f>` | `p4 fstat -T "depotFile,headRev,action" <f>` |
| 동기화 | `p4 sync` | `p4 sync -q` (파일별 줄 억제) |
| 파일 내용 | `p4 print <f>` | 워크스페이스 파일 직접 read / 부득이하면 `p4 print -q` |
| 블레임 | `p4 annotate <f>` | `p4 annotate -q <f>` |

핵심 플래그: `-F`(필드 포맷), `-T`(fstat 필드 제한), `-s`(describe 요약), `-q`(헤더/진행 억제), `-m N`(개수 제한).

### git → p4 매핑 (에이전트가 알아야 할 치환)

| 의도 | git | p4 |
|------|-----|----|
| 변경 파일 | `git status` | `p4 -F "%depotFile% %action%" opened` |
| 변경 내용 | `git diff` | `p4 diff -du` |
| 특정 변경 | `git show <sha>` | `p4 describe -du <CL>` |
| 이력 | `git log` | `p4 changes -m 10 -s submitted //path/...` |
| 되돌리기 | `git checkout --` | `p4 revert` ⚠️ 승인 후 |
| 제출 | `git commit/push` | `p4 submit` ⚠️ 승인 후 |

> 선택: 위 terse 플래그를 기본으로 거는 래퍼 함수(`p4q`)를 만들어 두고 AGENTS.md에서 "p4 대신 p4q 사용"이라고 지시하면 에이전트가 플래그를 빠뜨려도 안전하다.

---

## C. 압축 레이어 — Headroom 권장

- **RTK**: git 중심. p4 명령 자동 재작성은 기대하지 말 것(지원 여부는 저장소 확인). + Windows 자동훅은 WSL 필요.
- **Headroom**: 프록시 레벨에서 **도구 출력 종류와 무관하게** 로그·보일러플레이트를 가역 압축 → **p4 출력에도 그대로 적용**된다. 따라서 P4 환경에선 **Headroom이 더 적합**.

즉 P4에선: **A(선언) + B(terse 플래그) 로 1차 절감 → Headroom으로 잔여 출력까지 압축**.

---

## D. 리뷰/교차검증 워크플로우 (P4판)

git diff 대신:
- **펜딩 변경 리뷰**: `p4 diff -du` 결과를 반대 도구(Claude↔Codex)에 전달.
- **제출된 변경 리뷰**: `p4 describe -du <CL>` 의 diff만 전달(메타데이터만 필요하면 `-s`).
- **변경 파일 범위 좁히기**: 먼저 `p4 -F "%depotFile% %action%" opened`로 목록 → 필요한 파일만 워크스페이스에서 직접 read(전체 `p4 print` 금지).
- code-review-graph(Tree-sitter)는 VCS와 무관하게 파일 기준으로 동작하므로 P4에서도 그대로 쓸 수 있다.

---

## E. ccsw 연계

ccsw 프로파일 자체는 VCS 중립이라 P4에서도 `lean/balanced/max` 그대로 쓴다. 차이는 **압축 레이어를 Headroom으로** 두는 것:

- `profiles/*.json` 의 `compression` 을 `"headroom"` 으로(이미 balanced/max는 headroom).
- P4 선언 블록(위 A)은 프로젝트 `AGENTS.md`/`CLAUDE.md`에 직접 넣는다(향후 ccsw의 "CLAUDE.md 스니펫 주입" 확장 시 p4 변형으로 자동화 가능).

---

## 체크리스트 (P4)

- [ ] `AGENTS.md`/`CLAUDE.md`에 "Perforce, git 금지" 블록 추가
- [ ] p4 terse 플래그(또는 `p4q` 래퍼) 규약 명시
- [ ] 압축은 Headroom으로(RTK는 git 전용으로 간주)
- [ ] 리뷰는 `p4 describe -du`/`p4 diff -du` 기반
- [ ] `p4 print` 대신 워크스페이스 파일 직접 read
- [ ] submit/revert/delete는 승인 게이트
- [ ] tokscale로 P4 작업 세션 토큰 실측

---

## 참고

- Perforce 명령 레퍼런스: `p4 help <command>`, `p4 help formats`(-F 포맷 필드)
- Headroom: https://extraheadroom.com/
- 일반 전략: [token-optimization-claude-codex.md](token-optimization-claude-codex.md)
