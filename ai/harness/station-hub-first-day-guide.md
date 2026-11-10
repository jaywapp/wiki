---
title: station 허브 조립 설명서 (처음 온 사람용)
category: harness
tags:
  - ai
  - claude-code
  - workflow
  - onboarding
  - git-submodule
source: station 허브 CLAUDE.md, docs/workflow.md (2026-11-11)
updated: 2026-11-11
---

# station 허브 조립 설명서 (처음 온 사람용)

station 허브(`D:\station`)에서 처음 일하는 사람이 위에서 아래로 따라 하도록 만든 설명서다. 말은 줄이고 그림과 순서만 담았다. 규칙의 기준은 허브 `CLAUDE.md`이고, 이 문서와 다르면 `CLAUDE.md`가 맞다.

## 완성하면 이런 모습

```text
      YOU
       |
       v
 +-------------+         +------------------+
 |  1 session  |  ---->  |  1 task          |
 |  D:\station |         |  start --> done  |
 +-------------+         +------------------+
       |
       +--> subagents (same session)
```

과업 하나를 세션 하나가 끝까지 맡는다. 세션을 여러 개 띄워 일을 넘기지 않는다.

## 상자 안에 든 것

```text
 D:\station
 |
 +-- [A] repos/<name>     x 70+
 +-- [B] CLAUDE.md        x 1
 +-- [C] docs/
 +-- [D] .work/
 +-- [E] .worktrees/
 +-- [F] .temp/
 +-- [G] .tools/
 +-- [H] .secret/
```

| 부품 | 이름 | 쓰임 | git |
|---|---|---|---|
| A | `repos/<name>` | 레포 하나당 폴더 하나. 서브모듈이고 각자 독립 저장소다 | 레포별 |
| B | `CLAUDE.md` | 허브 규칙. 세션이 시작할 때 읽는다 | 추적 |
| C | `docs/` | 운영 가이드(`workflow.md`), 설계(`specs/`), 계획(`plans/`) | 추적 |
| D | `.work/YYYY-MM-DD-<slug>/` | 과업 기록 | 무시 |
| E | `.worktrees/` | 같은 레포의 추가 체크아웃 | 무시 |
| F | `.temp/` | 임시 파일. 언제 비워도 된다 | 무시 |
| G | `.tools/` | 공용 도구(SDK, JDK 등) | 무시 |
| H | `.secret/` | 로컬 시크릿 | 무시 |

## 준비물

```text
 [ PowerShell 5.1 ]   [ git + GitHub SSH key ]   [ claude ]   [ gh ]
```

서브모듈 폴더가 비어 있으면 한 번 받는다.

```powershell
git submodule update --init --jobs 8
```

## 조립 전에 꼭 볼 것

```text
 [X] commit on main / develop        [OK] commit on <type>/<slug>
 [X] push, PR, merge without asking  [OK] ask first
 [X] files in the hub root           [OK] .temp/  or  .work/<task>/
 [X] 2 sessions, 1 checkout          [OK] .worktrees/<repo>-<slug>
 [X] 2 heavy builds at once          [OK] one at a time
 [X] secrets in output or commits    [OK] placeholder
```

```text
   ?           ( ask )
  /|\   --->   never guess
  / \
```

모호하면 추측하지 말고 묻는다.

## 조립 순서

### 1. 세션을 켠다

```powershell
cd D:\station
claude
```

```text
 /rename <task name>      phone: /rc
```

실행 스크립트나 역할 프롬프트는 없다. 허브에서 켠 세션이면 규칙이 그대로 적용된다.

### 2. 과업을 말한다

```text
 YOU: "do X"  --->  SESSION: 1 question at a time
                    - purpose
                    - scope
                    - done when?
                    - must not do?
```

묻지 않고 가길 원하면 "질문 없이 진행"이라고 한다. 세션은 가정을 밝히고 진행한다.

### 3. 고칠 레포의 상태를 본다

```powershell
git -C repos/<name> status
git -C repos/<name> branch --show-current
```

```text
 clean, my branch ............ work here
 detached HEAD ............... git -C repos/<name> switch <branch>
 someone else's changes ...... use a worktree (below)
 another task's branch ....... use a worktree (below)
```

```powershell
git -C repos/<name> worktree add D:\station\.worktrees\<name>-<slug> -b <type>/<slug>
```

레포에 `CLAUDE.md`나 `AGENTS.md`가 있으면 먼저 읽는다. 허브 규칙과 다르면 레포 규칙이 우선이다.

### 4. 작업 브랜치를 만든다

```powershell
git -C repos/<name> switch -c <type>/<slug>
```

```text
 <type> = feat | fix | docs | refactor | chore
```

### 5. 일을 나눈다

```text
 1 step?  ---yes--->  session does it
    |
    no
    |
    +--> developer      (build)
    +--> code-reviewer  (review)
    +--> qa-verifier    (verify)
```

서브에이전트는 세션 안에서 뜬다. 허브 메모리를 읽지 못하므로 필요한 규칙은 지시문에 직접 적는다. 서브에이전트는 커밋·push·PR을 하지 않는다.

### 6. 직접 확인한다

```text
 subagent says "done"  --X-->  report to user
 subagent says "done"  ----->  read diff --> rerun checks --> run the app --> report
```

작성자가 자기 변경을 승인하지 않는다. 리뷰·QA의 Critical·High는 해결되거나 사용자가 수용하기 전까지 완료가 아니다.

### 7. 커밋하고 멈춘다

```text
 commit (work branch)  --->  STOP  --->  ask  --->  push / PR / merge / deploy
```

```powershell
git -C repos/<name> commit -m "feat: short english summary"
```

멈추고 확인받는 것:

- 요구사항·완료 기준 확정, 시안 선택
- push, PR 생성
- PR 병합, 배포, 패키지 게시, 태그, 릴리스
- 저장소 설정 변경, 서브모듈 추가·제거, 허브 커밋

### 8. 기록을 남긴다

```text
 .work/YYYY-MM-DD-<slug>/
 |
 +-- brief.md     purpose, scope, done-when, decisions
 +-- plan.md      only if multi-step or multi-repo
 +-- report.md    changes, checks, risks, open decisions
 +-- artifacts/   logs/
```

레포를 고치는 과업만 기록한다. 질문·조회·한 스텝 작업은 기록하지 않는다.

## 다 조립했는지 확인

- [ ] 세션 하나가 과업 하나를 맡았다
- [ ] 변경이 작업 브랜치에 있다(`main`·`develop` 아님)
- [ ] 검증 명령을 직접 돌려 결과를 봤다
- [ ] push·PR·병합 전에 확인을 받았다
- [ ] 허브 루트에 새 파일이 없다
- [ ] `.work/<과업>/report.md`가 있다

## 부품이 남거나 모자랄 때

| 증상 | 조치 |
|---|---|
| 서브모듈이 detached HEAD다 | `git submodule update` 직후에는 정상이다. 고치기 전에 브랜치로 전환한다 |
| 허브 `git status`에 `M repos/<name>`이 보인다 | 서브모듈에 커밋하면 생기는 표시다. 허브 커밋은 요청받았을 때만 따로 한다 |
| 필요한 MCP 서버가 꺼져 있다 | 그 세션의 `/mcp`에서 켠다. 허브는 잘 쓰지 않는 서버를 기본으로 꺼 둔다 |
| 메모리가 모자란다 | 세션 수를 줄이고 무거운 빌드·테스트를 하나씩 돌린다 |
| 같은 레포를 다른 세션이 쓰고 있다 | `.worktrees/<repo>-<slug>`에서 작업한다 |
| 규칙이 헷갈린다 | 허브 `CLAUDE.md`의 "과업 세션" 절을 본다 |

## 선택 부품: `issus-based`

```text
 "do #123 issus-based"  --->  issue = source of truth
                              questions --> issue comments
                              done      --> push + PR without asking
                              merge, deploy --> still ask
```

사용자가 `issus-based`로 진행하라고 명시한 과업에만 쓴다. 이슈를 언급했다고 켜지지 않는다.

## 관련 문서

- station 허브 `CLAUDE.md` — 규칙의 기준
- station 허브 `docs/workflow.md` — 운영 가이드
- [Claude Code 다중 세션 운영 (팀장·담당자)](claude-code-multi-session-lead-worker.md) — 이전 방식과 걷어낸 이유
- [Claude Code Agent Teams](claude-code-agent-teams.md)
