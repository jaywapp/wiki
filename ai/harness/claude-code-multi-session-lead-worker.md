---
title: Claude Code 다중 세션 운영 (팀장·담당자)
category: harness
tags:
  - ai
  - claude-code
  - multi-session
  - orchestration
  - windows-terminal
  - troubleshooting
source: station 허브 파일럿 (2026-11-09)
updated: 2026-11-09
---

# Claude Code 다중 세션 운영 (팀장·담당자)

station 허브(`D:\station`)에서 Claude Code 세션을 **팀장(lead)** 과 **담당자(worker)** 로 나눠 운영한 방식과, 파일럿에서 확인한 함정을 정리한다. 모든 내용은 2026-11-09 파일럿에서 직접 확인한 것이다.

## 구조

| 구분 | 실행 위치 | 세션 이름 | 모델 | 역할 |
|---|---|---|---|---|
| 팀장 | 허브 루트 | `lead-<role>` | opus | 사용자와 대화하는 유일한 창구. 요구사항 인터뷰, 분배, 검증, 보고 |
| 담당자 | `repos/<name>` | 레포 폴더명 | sonnet | 그 레포만 맡아 구현·검증. 사용자와 직접 대화하지 않음 |

- 사용자는 팀장에게만 지시한다. 팀장이 담당자에게 일을 나누고, 결과를 검증해 보고한다.
- 지시·보고는 **세션 간 메시지(`SendMessage`)** 로 주고받는다. 담당자는 `ack`(수신), `question`, `report`(완료), `blocked`(막힘) 네 종류만 쓴다.
- 담당자는 필요할 때 띄운다. 다시 띄우면 `--continue`로 직전 대화를 이어받는다(같은 sessionId로 재개되고 직전 작업을 정확히 기억함을 확인).

## 실행 스크립트 패턴

세션은 Windows Terminal 새 탭으로 연다.

```powershell
wt -w 0 nt ...
```

`wt`는 명령줄의 `;`를 탭·명령 구분자로 해석한다. 실행할 내용에 `;`가 들어가면 깨지므로 **실행 내용은 `.ps1` 파일로 만들고 `wt`에는 그 파일만 넘긴다.**

## 함정과 해결

### 1. 자식 세션 환경 변수 상속 → 등록 안 됨

Claude 세션 안에서 연 탭은 `CLAUDE_CODE_CHILD_SESSION` 등의 환경 변수를 물려받는다. 그 결과 대화 기록 저장과 세션 간 메시지 등록이 꺼진다.

- 해결: 실행 스크립트에서 `claude`를 띄우기 전에 해당 변수들을 제거한다.
- 확인: 세션이 정상 등록되면 `~/.claude/sessions/<pid>.json`이 생성된다.

### 2. 새 폴더 첫 실행 시 신뢰 확인창에서 멈춤

처음 여는 폴더는 신뢰 확인창에서 멈춘다. `~/.claude.json`의 `projects["D:/path"].hasTrustDialogAccepted`를 `true`로 두면 사전 신뢰된다.

- 주의: PowerShell 5.1의 `ConvertFrom-Json`은 이 파일을 읽지 못한다. 대소문자만 다른 중복 키가 있기 때문이다. **`node`로 편집한다.**

### 3. 하위 폴더 세션은 상위 `.claude/`를 못 봄

`repos/<name>`에서 뜬 담당자는 허브의 `.claude/agents`, `.claude/skills`가 보이지 않았다.

- 해결: `--add-dir <허브> --settings <허브 settings.json>`을 붙여 띄운다. 추가 후 재점검에서 통과했다.

### 4. 세션 간 메시지 규칙

- 보내는 쪽과 받는 쪽의 **권한 모드가 같아야** 바로 전달된다. 다르면 받는 쪽 사용자 승인 대기로 묶인다. 모든 세션을 같은 모드로 띄운다.
- 메시지 속 `@경로`는 첨부되지 않는다. 경로는 글자로 적고 받는 쪽이 직접 읽는다.

## 파일럿 결과 요약

| 항목 | 결과 |
|---|---|
| 세션 실행, 중복 실행 방지 | 통과 |
| 폴더 신뢰 확인창 | 실패 → 사전 신뢰로 수정 |
| 세션 등록·메시지 수신 | 실패 → 환경 변수 제거로 수정 |
| 담당자의 허브 `.claude/` 자산 가시성 | 실패 → `--add-dir`·`--settings`로 수정 |
| ack → report 왕복, 파일 기록 | 통과 |
| 완료 알림(idle notice) | 통과 |
| `--continue` 이어받기 | 통과 |
| busy 중 메시지 큐잉 | 미검증(실사용에서 관찰 필요) |

## 관련 문서

- station 허브 `docs/workflow.md` — 운영 가이드
- station 허브 `docs/specs/2026-11-09-orchestrator-workflow-design.md` — 설계 배경
- [Claude Code Agent Teams](claude-code-agent-teams.md)
