- Status: Idea
- Version: 0.1
- Created: 2026-08-26
- Updated: 2026-08-26
- Tags: agent-backlog, claude-code, codex, automation, cli, ai-workflow, scm

# agent-backlog

## 1. 한 줄 요약

Claude Code와 Codex에서 당장 수행하지 않을 작업을 **완전한 작업지시서**로 로컬 백로그에 등록하고, 사용자가 지정한 시작 시각에 백그라운드에서 FIFO 순서로 자동 수행하는 로컬 CLI 도구다.

중단된 AI 세션은 기존 session ID로 이어서 실행하고, 작업별 결과·검증·로그·SCM 상태를 남겨 사용자가 다음에 안전하게 검토하고 이어갈 수 있게 한다.

## 2. 배경 및 문제

Claude Code나 Codex로 개발·조사·문서 작업을 하다 보면 지금 바로 할 필요는 없지만 AI가 나중에 처리해 두면 좋은 작업이 계속 발생한다. 현재는 이런 작업을 메모해 두거나 사용자가 직접 다시 AI를 실행해야 하므로 다음 문제가 있다.

- 아이디어 수준의 요청이 실행 가능한 작업지시서로 구체화되지 않은 채 남는다.
- 사용자가 AI를 사용하지 않는 시간의 Claude/Codex 사용 가능량을 활용하기 어렵다.
- 나중에 작업을 다시 시작할 때 원래 목적과 맥락을 재설명해야 한다.
- 장시간 작업이 사용량 제한, 프로세스 종료, PC 종료 등으로 끊기면 이어서 처리하기 번거롭다.
- 여러 작업이 쌓이면 실행 순서, 현재 상태, 결과를 일관되게 관리하기 어렵다.
- 코드 작업에서는 AI가 만든 변경과 기존 사용자 변경이 섞이거나, 검증 없이 완료되었다고 판단할 위험이 있다.

`agent-backlog`은 이를 해결하기 위해 **작업 정의**와 **작업 실행**을 분리한다.

Claude/Codex의 공통 Skill이 사용자와 대화하며 실행 가능한 작업지시서를 만들고, `agent-backlog`이 로컬 queue에서 이를 실행·재개·검증·기록한다.

## 3. 목표

### 핵심 목표

1. 사용자의 거친 요청을 Claude/Codex Skill이 실행 가능한 작업지시서로 구체화한 뒤 backlog에 등록한다.
2. 지정된 시각에 사용자가 개입하지 않아도 backlog 작업을 순차 실행한다.
3. 작업이 중간에 끊겨도 기존 AI session을 resume해 이어서 수행할 수 있게 한다.
4. AI의 자기 선언이 아니라 prompt에 정의된 완료 조건과 검증 결과를 근거로 작업 상태를 관리한다.
5. 코드 변경은 사람이 검토할 수 있는 SCM 상태까지만 준비하고 commit/push/submit은 자동 수행하지 않는다.
6. prompt, 상태, 로그, 보고서, 산출물을 작업 단위로 보존해 추적 가능하게 한다.

### 성공 기준

MVP에서는 다음을 만족하면 핵심 가치가 검증된 것으로 본다.

- Claude/Codex에서 backlog Skill을 호출해 독립 실행 가능한 작업 폴더가 만들어진다.
- 사용자가 다시 설명하지 않아도 `pending` 작업이 예약 시각에 자동 실행된다.
- 실행 중 끊긴 작업이 기존 session ID로 정상적으로 resume된다.
- 검증 가능한 코드 작업은 지정된 build/test를 수행하고 결과가 `report.md`에 남는다.
- Git 작업은 stage, Perforce 작업은 pending changelist 상태까지만 준비된다.
- 자동 commit, push, submit이 발생하지 않는다.
- 사용자는 CLI만으로 작업 조회, 수동 실행, 로그 확인, 세션 재개가 가능하다.

## 4. 대상 사용자

초기 대상은 로컬 PC에서 Claude Code와 Codex CLI를 사용하는 개인 개발자다.

주요 요구는 다음과 같다.

- 현재 작업 흐름을 끊지 않고 나중에 할 일을 AI에게 맡겨 두고 싶다.
- 밤이나 별도로 정한 시각에 로컬 PC에서 자동으로 작업을 실행하고 싶다.
- 다음 사용 시점에 결과와 검증 내용을 빠르게 검토하고 싶다.
- 장시간 AI 작업이 중단되어도 처음부터 다시 시작하고 싶지 않다.
- Git/Perforce 최종 반영은 사람이 직접 결정하고 싶다.

## 5. 핵심 아이디어

시스템은 두 개의 책임으로 나뉜다.

### 5.1 Backlog 등록 Skill

Claude Code와 Codex에 동일한 작업 등록 규약을 사용하는 Skill을 제공한다.

사용자가 backlog 등록을 요청하면 Skill은 단순히 현재 문장을 저장하지 않는다.

1. 현재 요청과 대화 맥락을 확인한다.
2. 작업 수행에 필요한 핵심 정보가 부족하면 사용자에게 질문한다.
3. 필요한 경우 현재 workspace의 관련 파일과 구조를 최소 범위로 조사한다.
4. 목적, 작업 대상, 요구사항, 완료 조건, 검증 방법이 포함된 `prompt.md`를 작성한다.
5. provider, workspace, SCM 등 작업 메타데이터와 함께 backlog에 등록한다.

작업 이름을 사용자가 지정하지 않으면 AI가 자동 생성한다. 별도 변경 요청이 없으면 작업을 등록한 agent가 실행 provider가 된다.

workspace 사전조사는 토큰을 과도하게 소비하지 않도록 **작업지시서를 만드는 데 필요한 최소 범위**로 제한한다. 대규모 코드 분석은 실제 backlog 실행 단계로 미룬다.

### 5.2 agent-backlog 실행기

`agent-backlog`은 로컬 backlog 폴더를 읽어 작업을 관리하고 Claude/Codex CLI를 실행한다.

- 백그라운드 프로세스로 동작한다.
- 설정된 **작업 시작 시각**에 queue 실행을 시작한다.
- 시작 후 별도의 종료 시간 window는 두지 않고 queue를 소진할 때까지 계속한다.
- 초기 버전은 한 번에 하나의 작업만 실행한다.
- 실행 순서는 FIFO다.
- 하나의 작업이 실패해도 다음 작업으로 진행한다.
- 자동 재시도는 하지 않는다.

## 6. 주요 사용 흐름

### A. 작업 등록

1. 사용자가 Claude Code 또는 Codex에서 backlog 등록 Skill을 호출한다.
2. AI가 요청이 독립 실행 가능한 수준인지 확인한다.
3. 부족한 정보가 있으면 필요한 질문을 한다.
4. 필요 시 workspace의 관련 파일만 제한적으로 조사한다.
5. AI가 작업 이름을 생성하거나 사용자가 지정한 이름을 사용한다.
6. 보관 중 동일한 작업 이름이 있으면 등록하지 않는다.
7. `%LOCALAPPDATA%\.backlog\{등록일}\{작업이름}\`에 작업 폴더를 생성한다.
8. 초기 상태를 `pending`으로 기록한다.

### B. 예약 자동 실행

1. background scheduler가 설정된 시작 시각을 감시한다.
2. 시작 시각이 되면 pending 작업을 등록 순서대로 조회한다.
3. 첫 작업을 `running`으로 변경한다.
4. session ID가 없으면 새 Claude/Codex 세션을 시작한다.
5. session ID가 있고 작업이 완료되지 않았다면 기존 세션을 resume한다.
6. AI가 `prompt.md`에 따라 작업을 수행한다.
7. 완료 조건과 build/test 등 검증 항목을 확인한다.
8. `report.md`와 `log.txt`를 기록한다.
9. 코드 작업이면 SCM 정책에 따라 사람이 검토 가능한 상태로 변경을 준비한다.
10. 작업 상태를 갱신하고 다음 FIFO 작업을 실행한다.
11. pending 작업이 없으면 해당 실행 사이클을 종료한다.

### C. 사용자 판단이 필요한 경우

1. 무인 상태에서 AI가 임의로 결정하면 안 되는 상황이 발생한다.
2. 작업을 `waiting-user` 상태로 전환한다.
3. 사용자가 `agent-backlog open {작업이름}`으로 기존 AI 세션을 resume한다.
4. 필요한 판단이나 정보를 제공한다.
5. 작업을 다시 queue에 넣어 이후 실행에서 이어서 처리한다.

### D. 결과 검토

1. 사용자는 `agent-backlog list`로 현재 대기/실행 상태를 확인한다.
2. `report`, `log`, `open` 명령으로 결과와 세션을 확인한다.
3. 코드 작업이면 staged 변경 또는 pending changelist를 직접 검토한다.
4. commit/push/submit 등 최종 반영은 사용자가 직접 수행한다.

## 7. 핵심 기능

### 7.1 표준 작업 폴더

기본 위치:

    %LOCALAPPDATA%\.backlog\YYYY-MM-DD\{task-name}\

구성:

    task.json
    prompt.md
    session-id.txt
    report.md
    log.txt
    result\          # 별도 산출물이 있을 때만 생성
    conversation.txt # 전체 대화 저장 옵션 사용 시에만 생성

`YYYY-MM-DD`는 작업 등록일이다.

`result`는 문서, 분석 파일 등 별도 산출물이 있는 경우에만 사용한다. 코드 작업은 원 workspace 자체가 결과물이므로 별도 복사본을 만들지 않는다.

### 7.2 task.json

작업 실행과 관리에 필요한 메타데이터를 저장한다.

필요 정보:

- 작업 이름
- provider (`claude` / `codex`)
- workspace 절대 경로
- status
- 등록 시각
- 실행 시작/종료 시각
- FIFO 판정을 위한 등록 순서 또는 timestamp
- SCM 종류 (`git` / `perforce` / `none`)
- repository/root 정보
- Git branch 또는 Perforce workspace/stream 정보
- 관련 pending changelist 정보
- 전체 대화 저장 여부
- 최근 실행 종료 사유

실제 AI session ID는 `session-id.txt`에 저장한다.

### 7.3 prompt.md

`prompt.md`는 단순 사용자 요청이 아니라 다른 대화 맥락 없이도 실행할 수 있는 작업지시서여야 한다.

기본 항목:

- 목적
- 배경 및 현재 상황
- 작업 대상/workspace
- 수행해야 할 내용
- 요구사항 및 제약조건
- 제외 범위
- 완료 조건
- 검증 방법
- 예상 결과물
- SCM 처리 조건
- 종료 시 보고해야 할 내용

작업 성격상 완료 조건과 검증 방법을 정의할 수 있는데 빠져 있다면 Skill은 등록 전에 이를 보완해야 한다.

### 7.4 report.md

권장 구조:

- 최종 결과 상태
- 수행 요약
- 변경 사항
- 완료 조건 충족 여부
- build/test/기타 검증 결과
- 생성된 산출물
- 남은 문제 또는 실패 원인
- 사용자가 확인하거나 결정해야 할 사항
- SCM 상태

프로그램이 완료 여부를 안정적으로 판정할 수 있도록 향후 `report.md`에 machine-readable frontmatter 또는 고정 결과 블록을 정의한다.

### 7.5 로그

`log.txt`에는 두 종류의 로그를 모두 보존한다.

- agent-backlog 자체 실행 로그
- Claude/Codex 프로세스 stdout/stderr

전체 AI 대화 저장은 옵션으로 제공하고 활성화한 경우에만 별도 `conversation.txt`를 남긴다.

### 7.6 세션 재개

- 최초 실행은 새 Claude/Codex 세션으로 시작한다.
- 생성된 session ID는 가능한 즉시 `session-id.txt`에 저장한다.
- session ID가 존재하지만 작업이 완료되지 않았다면 중간에 끊긴 작업으로 본다.
- 다음 실행에서는 새 세션을 만들지 않고 해당 provider의 resume 기능을 우선 사용한다.
- 완료된 작업도 `agent-backlog open`으로 기존 세션을 다시 열 수 있다.

### 7.7 완료와 검증

AI가 단순히 완료했다고 응답하는 것만으로 `completed` 처리하지 않는다.

- `prompt.md`에 정의된 완료 조건을 기준으로 판단한다.
- build/test가 가능한 작업이고 검증 대상으로 정의되어 있다면 반드시 실행한다.
- 필수 검증이 실패하면 completed가 될 수 없다.
- 사용자 판단이 필요하면 `waiting-user`로 전환한다.

프로그램이 의미적인 완료 여부를 직접 이해하기 어렵기 때문에 실행 Agent가 표준 결과 형식으로 완료 조건과 검증 결과를 기록하고, agent-backlog이 이를 읽어 상태를 갱신하는 프로토콜이 필요하다.

### 7.8 SCM 처리

#### Git

1. 작업 시작 전 working tree baseline을 확인한다.
2. AI가 이번 작업으로 변경한 파일을 식별한다.
3. 검증 완료 후 해당 변경만 stage한다.
4. commit하지 않는다.
5. push하지 않는다.

#### Perforce

1. workspace/stream 정보를 확인한다.
2. 작업용 pending changelist를 사용한다.
3. AI가 변경한 파일을 해당 changelist에 open/reconcile한다.
4. submit하지 않는다.

기존 사용자 변경이 AI 작업에 섞이지 않도록 실행 전 SCM baseline과 실행 후 diff를 비교해 **이번 작업에서 발생한 변경만** stage 또는 pending changelist에 포함하는 방향을 권장한다.

### 7.9 CLI

MVP 명령 후보:

    agent-backlog list
    agent-backlog list --all
    agent-backlog list --status <status>

    agent-backlog run
    agent-backlog open <task-name>
    agent-backlog retry <task-name>
    agent-backlog requeue <task-name>
    agent-backlog cancel <task-name>
    agent-backlog remove <task-name>

    agent-backlog log <task-name>
    agent-backlog report <task-name>

    agent-backlog start
    agent-backlog stop
    agent-backlog status
    agent-backlog config

기본 `list`는 `pending`과 `running` 작업만 표시한다.

`run`은 예약과 관계없이 현재 pending queue를 즉시 실행하는 명령으로 사용한다.

`open`은 내부 뷰어가 아니라 실제 Claude/Codex CLI의 resume 기능으로 해당 세션을 인터랙티브하게 연다.

### 7.10 설정과 실행 시각 추천

기본 설정 위치:

    %LOCALAPPDATA%\.backlog\config.json

설정 후보:

- 자동 실행 시작 시각
- provider별 CLI 실행 경로
- 전체 대화 저장 여부
- 로그 레벨
- 완료 작업 보관 기간
- 위험 작업 승인 정책
- background daemon 설정

설정은 파일 직접 편집뿐 아니라 `agent-backlog config`로 조회·변경할 수 있게 한다.

별도의 실행 시각 추천 Skill을 제공해 사용자의 평소 Claude/Codex 사용 시간, PC 가동 시간, 피하고 싶은 시간, 주중/주말 패턴을 바탕으로 적절한 자동 실행 시작 시각을 추천한다.

## 8. 범위

### MVP

- Claude Code/Codex 공통 backlog 등록 Skill
- 필요한 사용자 질의와 최소 workspace 조사를 통한 `prompt.md` 생성
- `task.json` 기반 작업 메타데이터 관리
- 등록일/작업명 기반 로컬 저장
- 보관 중 작업명 중복 방지
- Claude/Codex provider adapter
- 새 세션 실행과 기존 세션 resume
- FIFO 단일 작업 순차 실행
- 실패 후 다음 작업 계속 실행
- 설정된 시각의 background 자동 실행
- 수동 `run`
- list/open/report/log/status/config 등 관리 CLI
- waiting-user 처리
- 완료 조건 및 build/test 검증
- stdout/stderr와 실행 로그 보존
- 선택적 전체 대화 저장
- Git stage / Perforce pending changelist 준비
- 위험 작업 차단
- 30일 보관/정리 정책
- 실행 시각 추천 Skill

### Later

- provider 사용량/quota를 직접 감지해 스케줄을 동적으로 조절하는 기능
- 실행 통계와 작업 이력 분석
- 우선순위 queue
- Claude/Codex provider 간 작업 handoff
- 로그인/재부팅 이후 daemon 자동 시작 UX 고도화
- 팀 단위 공유 backlog 또는 원격 실행

### Out of Scope

초기 버전에서는 다음을 다루지 않는다.

- GUI/Tray UI
- 병렬 작업 실행
- 실제 사용자 idle 상태 감지
- 사용자가 Claude/Codex를 다시 사용하기 시작했는지 감지해 작업 중단
- 자동 재시도
- 자동 Git commit/push
- 자동 Perforce submit
- 사용자 승인 없는 배포 또는 외부 시스템 변경

## 9. 운영 방식

### 작업 상태

현재 필요한 핵심 상태는 다음과 같다.

- `pending`: 실행 대기
- `running`: 실행 중
- `waiting-user`: 사용자 판단/추가 정보 필요
- `completed`: 완료 조건과 검증 충족
- `failed`: 작업 수행 실패
- `cancelled`: 사용자 취소

토큰/사용량 제한, 프로세스 종료, PC 종료 같은 경우를 일반 실패와 구분하기 위해 `rate-limited`, `interrupted` 같은 상태를 추가하는 방안을 검토한다.

상태명과 별개로 다음 복구 원칙은 확정한다.

- session ID가 존재하고 작업이 완료되지 않았다면 가능한 경우 기존 세션을 resume한다.
- 자동 재시도는 하지 않는다.
- 사용자가 명시적으로 retry/requeue하는 것은 허용한다.

### 백그라운드 실행

초기 제품은 Windows CLI이며 npm을 통해 전역 설치할 수 있게 한다.

    npm install -g agent-backlog
    agent-backlog start

scheduler가 감시하는 시간은 **실행 가능 시간 범위**가 아니라 **queue 실행을 시작하는 시각**이다.

한 번 실행 사이클이 시작되면 종료 시각 제한 없이 queue가 빌 때까지 계속 처리한다.

## 10. 데이터 및 연동

### 데이터 저장

MVP에서는 별도 DB 없이 `%LOCALAPPDATA%\.backlog` 파일 시스템을 source of truth로 사용한다.

장점:

- 사람이 직접 열어 확인할 수 있다.
- 백업과 디버깅이 단순하다.
- Claude/Codex Skill도 같은 규약으로 작업을 생성할 수 있다.
- 별도 서버가 필요 없다.

### 외부 연동

- Claude Code CLI
- Codex CLI
- Git CLI
- Perforce CLI (`p4`)

AI CLI마다 새 세션, resume, session ID 획득, 종료 이유 판정 방식이 다르므로 provider별 adapter로 격리한다.

## 11. 기술적 고려사항

초기 구현 기술은 **Node.js + TypeScript**로 한다.

선정 이유:

- `npm install -g` 배포가 자연스럽다.
- Claude/Codex child process 실행과 stdout/stderr 스트리밍 구현이 용이하다.
- Windows CLI와 background process를 빠르게 구성할 수 있다.
- 향후 macOS/Linux로 확장하기 쉽다.

Provider Adapter는 최소 다음 기능을 추상화해야 한다.

- 새 세션 실행
- 기존 세션 resume
- 인터랙티브 open
- session ID 추출
- 프로세스 종료 사유 판정
- rate/token limit 감지
- stdout/stderr 수집

또한 scheduler와 사용자의 수동 `run`이 같은 queue를 동시에 실행하지 않도록 global lock/PID 관리가 필요하다. 작업 단위 lock도 두어 동일 작업의 중복 실행을 막아야 한다.

## 12. 제약 조건

- Claude/Codex CLI의 명령과 resume 방식 변경에 영향을 받을 수 있다.
- provider가 사용량 제한 원인을 명확한 exit code로 제공하지 않으면 rate-limit 판정이 어려울 수 있다.
- PC가 꺼져 있으면 예약 시각에 실행할 수 없다.
- 장시간 작업 중 PC/프로세스가 종료될 수 있으므로 상태와 session ID를 즉시 저장해야 한다.
- 작업 등록 단계에서 workspace를 과도하게 조사하면 백로그를 만드는 데 더 많은 토큰을 쓸 수 있다.
- 기존 Git/Perforce 변경과 AI 작업 변경이 섞일 수 있으므로 SCM baseline 관리가 중요하다.

## 13. 위험 요소 및 대응

### 기존 사용자 변경 오염

**위험:** `git add` 또는 Perforce reconcile 과정에서 AI 작업과 무관한 기존 변경이 포함될 수 있다.

**대응:** 작업 시작 전 SCM baseline을 저장하고 실행 이후 생긴 delta만 stage/pending changelist에 포함한다.

### 무인 실행 중 위험 작업

**위험:** 파일 대량 삭제, 배포, 외부 메시지 전송, 시스템 설정 변경 등 되돌리기 어려운 작업을 사용자가 없는 상태에서 실행할 수 있다.

**대응:** 위험 작업 정책을 두고 자동 진행할 수 없는 작업은 `waiting-user`로 전환한다.

commit/push/submit은 별도 승인 여부와 관계없이 자동 수행하지 않는다.

### 근거 없는 완료 처리

**위험:** 일부 작업만 수행했거나 검증이 실패했는데 AI가 완료로 보고할 수 있다.

**대응:** `prompt.md`의 완료 조건, 검증 방법, 표준 `report.md` 결과 프로토콜을 기반으로 상태를 결정한다.

### 세션 복구 실패

**위험:** CLI 업데이트, 세션 만료 또는 손상으로 resume에 실패할 수 있다.

**대응:** 실패 원인을 로그에 남기고 임의로 새 세션을 만들어 처음부터 다시 시작하지 않는다. 사용자가 retry/open으로 복구 방향을 결정할 수 있게 한다.

### 한 작업의 장시간 점유

**위험:** 종료 시간 window를 두지 않으므로 하나의 작업이 queue를 장시간 점유할 수 있다.

**대응:** MVP에서는 순차 실행을 유지하되 실행 시간과 마지막 활동 시각을 기록한다. timeout/heartbeat는 실제 사용 결과를 바탕으로 후속 결정한다.

## 14. 결정된 사항

- 제품명은 `agent-backlog`이다.
- Claude Code와 Codex를 지원한다.
- 작업은 공통 Skill을 통해 등록한다.
- 작업지시서가 불완전하면 AI가 필요한 내용을 사용자에게 질문한 뒤 등록한다.
- 작업 이름을 사용자가 지정하지 않으면 AI가 생성한다.
- 별도 변경 요청이 없으면 등록한 agent가 실행 provider가 된다.
- 저장 경로의 날짜는 작업 등록일이다.
- 작업별 workspace 정보를 저장한다.
- 작업 메타데이터를 위해 `task.json`을 추가한다.
- `result`는 별도 산출물이 있을 때만 사용한다. 코드 변경은 원 workspace에 남긴다.
- 등록 단계 workspace 조사는 가능하지만 토큰 사용량을 고려해 최소화한다.
- 최초 실행은 새 session으로 시작한다.
- session ID가 있고 작업이 완료되지 않은 경우 중간에 끊긴 작업으로 보고 resume한다.
- 완료된 작업도 `open`으로 세션을 다시 열 수 있다.
- 사용자 판단이 필요하면 `waiting-user` 상태로 전환한다.
- 작업은 한 번에 하나씩 FIFO 순서로 처리한다.
- 하나의 작업이 실패해도 다음 작업을 계속 처리한다.
- 자동 재시도는 하지 않는다.
- 초기 버전은 병렬 실행하지 않는다.
- 자동 실행은 실제 사용자 idle 감지가 아니라 설정된 시각을 기준으로 한다.
- 설정 시각은 실행 가능 window가 아니라 queue 실행 시작 시각이다.
- 백그라운드 프로그램이 설정 시각을 감시한다.
- 실행이 시작되면 queue를 소진할 때까지 처리한다.
- 사용자의 Claude/Codex 재사용 여부는 감지하지 않는다.
- 기본 `list`는 pending/running 작업을 보여준다.
- 보관 중 작업명 중복을 허용하지 않는다.
- agent-backlog 로그와 Claude/Codex stdout/stderr를 모두 보존한다.
- 전체 대화 저장은 옵션으로 제공한다.
- AI의 자기 선언만으로 완료 처리하지 않고 prompt의 완료/검증 조건을 기준으로 판정한다.
- 가능한 build/test 검증은 실행한다.
- Git은 stage, Perforce는 pending changelist 상태까지만 준비한다.
- 자동 commit/push/submit은 수행하지 않는다.
- 위험 동작은 제한하고 사용자 판단이 필요하면 waiting-user로 전환한다.
- 초기 제품은 Windows CLI이며 npm으로 설치 가능해야 한다.
- 초기 구현 기술은 Node.js + TypeScript로 한다.
- GUI는 초기 범위에서 제외한다.
- 설정은 `%LOCALAPPDATA%\.backlog\config.json`에 저장하고 CLI에서도 관리한다.
- 작업 보관 기간은 30일을 기본으로 한다.
- 별도 archive 개념은 두지 않는다.
- 실행 시각 추천 Skill을 제공한다.

## 15. 미결정 사항

- `rate-limited`, `interrupted`를 독립 상태로 둘지 종료 사유만 task metadata에 기록할지.
- `waiting-user` 작업을 다시 pending으로 전환하는 명령을 `requeue`로 확정할지.
- 최초 실행 이후 provider 변경을 금지할지, Claude↔Codex handoff를 허용할지.
- `report.md`의 machine-readable 결과 포맷과 Agent 종료 프로토콜.
- 하루에 여러 자동 실행 시작 시각을 지원할지.
- 30일 자동 정리 대상 상태를 completed/failed/cancelled로 한정할지. pending/running/waiting-user 자동 삭제는 피하는 방향을 우선 검토한다.
- Windows 로그인/재부팅 후 daemon 자동 시작 여부.
- 지나치게 오래 실행되는 작업에 timeout/heartbeat를 둘지.
- 기존 session을 더 이상 resume할 수 없는 경우 새 session으로 handoff하는 정책.

## 16. 다음 작업

1. **작업 상태 머신 확정** — interruption, rate limit, waiting-user의 상태와 복구 전이를 정의한다.
2. **Backlog 등록 Skill 명세 작성** — Claude Code/Codex가 동일한 `prompt.md`와 `task.json`을 생성하도록 규약을 만든다.
3. **task.json JSON Schema 확정** — provider, workspace, SCM, timestamp, status 필드를 구체화한다.
4. **Provider Adapter 기술 검증** — Claude/Codex의 새 session, session ID 획득, resume, stdout/stderr, 종료 코드 동작을 실제 CLI에서 검증한다.
5. **완료 프로토콜 설계** — `report.md`의 구조화 결과와 검증 결과를 프로그램이 안정적으로 읽는 방법을 정의한다.
6. **SCM 안전성 Prototype** — Git baseline→task delta→stage와 Perforce baseline→pending CL 흐름을 작은 workspace에서 검증한다.
7. **Scheduler/daemon Prototype** — start/stop/status, global lock, 예약 시각, FIFO drain 동작을 검증한다.
8. **MVP 구현 계획 작성** — CLI command별 개발 Task와 테스트 항목으로 분해한다.
9. **실사용 알파 테스트** — 실제 Claude/Codex 작업을 예약 실행해 중단 복구, 결과 품질, 토큰 효율, 검토 시간을 측정한다.
