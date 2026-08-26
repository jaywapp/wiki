Status: Idea
Version: 0.1
Created: 2026-08-26
Updated: 2026-08-26
Tags: agent-backlog, Claude Code, Codex, backlog, automation, CLI, AI workflow

# agent-backlog

## 1. 한 줄 요약

Claude Code와 Codex에서 당장 수행하지 않을 작업을 완전한 작업지시서 형태로 로컬 백로그에 등록하고, 사용자가 지정한 시작 시각에 백그라운드에서 FIFO 순서로 자동 수행하는 로컬 CLI 도구다. 중단된 AI 세션은 이어서 실행하고, 결과·검증·로그·SCM 변경 상태까지 작업 단위로 보존한다.

## 2. 배경 및 문제

Claude Code나 Codex로 개발·조사·문서 작업을 하다 보면 지금 바로 실행할 필요는 없지만 AI가 대신 처리해 두면 좋은 작업이 계속 발생한다. 현재 방식에서는 이런 작업을 별도 메모에 남기거나 사용자가 직접 다시 AI를 실행해야 하므로 다음 문제가 있다.

- 작업 아이디어가 실행 가능한 수준으로 구체화되지 않은 채 남는다.
- 사용자가 AI를 사용하지 않는 시간의 Claude/Codex 사용 가능량을 활용하기 어렵다.
- 작업을 나중에 다시 시작할 때 원래 의도와 필요한 맥락을 다시 설명해야 한다.
- 장시간 작업이 토큰/사용량 제한, 프로세스 종료, PC 종료 등으로 중단되면 이어서 처리하기 번거롭다.
- 여러 작업이 쌓였을 때 실행 순서와 진행 상태, 결과를 일관되게 관리하기 어렵다.
- 코드 작업에서 실제 변경 내용과 검증 결과, Git/Perforce 상태를 사용자가 다시 확인해야 한다.

`agent-backlog`은 작업의 **정의 단계**와 **실행 단계**를 분리한다. Claude/Codex의 Skill이 사용자와 대화하면서 먼저 완전한 작업지시서를 만들고, `agent-backlog`은 이를 로컬 큐에서 안전하게 실행·재개·기록한다.

## 3. 목표

### 핵심 목표

1. 사용자의 거친 요청을 Claude/Codex Skill이 실행 가능한 작업지시서로 구체화한 뒤 백로그에 등록한다.
2. 지정된 시각에 사용자가 개입하지 않아도 백로그 작업을 순차 실행한다.
3. 작업 도중 세션이 끊겨도 세션 ID를 이용해 다음 실행에서 이어서 수행할 수 있게 한다.
4. 완료 조건과 빌드/테스트 등 검증 결과를 근거로 작업 완료 여부를 관리한다.
5. 코드 변경은 검토 가능한 상태까지만 준비하고 commit/push/submit은 자동 수행하지 않는다.
6. 작업별 prompt, 상태, 로그, 보고서, 산출물을 로컬 파일 구조로 남겨 추적 가능하게 한다.

### 성공 판단 기준

- Claude/Codex에서 백로그 등록 Skill 하나로 실행 가능한 작업 폴더가 생성된다.
- 등록된 `pending` 작업을 사용자가 다시 설명하지 않아도 자동 실행할 수 있다.
- 실행 중 중단된 작업이 기존 session ID를 이용해 정상적으로 resume된다.
- 검증 가능한 코드 작업은 지정된 빌드/테스트를 수행하고 결과가 `report.md`에 남는다.
- Git 작업은 stage, Perforce 작업은 pending changelist 상태까지만 준비되며 자동 commit/push/submit이 발생하지 않는다.
- `agent-backlog list`, `run`, `open`만으로 기본적인 조회·수동 실행·세션 복귀가 가능하다.

## 4. 대상 사용자

초기 대상은 로컬 PC에서 Claude Code와 Codex CLI를 함께 사용하는 개인 개발자다.

핵심 요구는 다음과 같다.

- 현재 작업 흐름을 끊지 않고 나중에 할 일을 AI에게 맡겨 두고 싶다.
- 밤이나 별도로 정한 시각에 로컬 PC에서 자동으로 작업을 실행하고 싶다.
- 작업 결과를 다음 날 빠르게 검토하고 싶다.
- 장시간 AI 작업이 중단되어도 처음부터 다시 시작하고 싶지 않다.
- Git/Perforce 변경은 사람이 최종 검토·제출하고 싶다.

## 5. 핵심 아이디어

시스템은 크게 두 부분으로 나뉜다.

### 5.1 Backlog 등록 Skill

Claude Code와 Codex에 공통 규약의 Skill을 제공한다.

사용자가 백로그 등록을 요청하면 Skill은 단순히 사용자의 문장을 저장하지 않는다.

1. 현재 요청과 대화 맥락을 확인한다.
2. 작업 수행에 필요한 핵심 정보가 빠졌다면 사용자에게 질문한다.
3. 필요한 경우 현재 workspace의 관련 파일과 구조를 최소 범위로 조사한다.
4. 목적, 대상, 요구사항, 완료 조건, 검증 방법을 포함한 완전한 `prompt.md`를 만든다.
5. 작업 메타데이터와 함께 로컬 backlog에 등록한다.

불완전한 작업지시서는 기본적으로 등록하지 않는다. 사용자가 작업 이름을 지정하지 않으면 AI가 자동 생성한다. 별도 요청이 없으면 작업을 등록한 provider가 실행 provider가 된다.

workspace 사전조사는 토큰을 아끼기 위해 **작업지시서 작성에 필요한 최소 범위**만 수행하고, 대규모 분석은 실제 backlog 실행 시점으로 미룬다.

### 5.2 agent-backlog 실행기

`agent-backlog`은 로컬 백로그 디렉터리를 읽어 작업을 관리한다.

- 백그라운드 프로세스로 실행된다.
- 설정된 **작업 시작 시각**에 pending queue 실행을 시작한다.
- 시작 후에는 별도의 종료 시간 창을 두지 않고 queue를 소진할 때까지 계속 처리한다.
- 초기 버전은 한 번에 하나의 작업만 실행한다.
- 실행 순서는 FIFO다.
- 작업이 실패해도 전체 큐를 중단하지 않고 다음 작업으로 진행한다.
- 자동 재시도는 하지 않는다.

## 6. 주요 사용 흐름

### 6.1 작업 등록

1. 사용자가 Claude Code 또는 Codex에서 작업 중 백로그 등록 Skill을 호출한다.
2. AI가 현재 요청이 실행 가능한 수준인지 판단한다.
3. 부족한 정보가 있으면 사용자에게 필요한 질문을 한다.
4. 필요 시 workspace의 관련 파일만 제한적으로 조사한다.
5. AI가 작업 이름을 정하거나 사용자가 지정한 이름을 사용한다.
6. 동일 작업명이 이미 존재하면 등록하지 않는다.
7. `%LOCALAPPDATA%\.backlog\{등록일}\{작업이름}\`에 작업을 생성한다.
8. 작업 상태는 `pending`으로 시작한다.

### 6.2 예약 자동 실행

1. `agent-backlog` 백그라운드 프로세스가 설정된 시작 시각을 감시한다.
2. 시작 시각이 되면 pending 작업을 등록 순서대로 조회한다.
3. 첫 작업을 `running`으로 변경한다.
4. session ID가 없으면 새 Claude/Codex 세션을 시작한다.
5. session ID가 있고 완료 보고서가 없는 중단 작업이면 기존 세션을 resume한다.
6. AI가 `prompt.md`에 따라 작업을 수행하고 완료 조건을 검증한다.
7. 결과와 검증 내용을 `report.md`에 기록한다.
8. stdout/stderr와 agent-backlog 실행 로그를 `log.txt`에 남긴다.
9. 코드 작업이면 SCM 정책에 따라 검토 가능한 상태로 변경을 준비한다.
10. 완료 또는 중단 상태를 저장하고 다음 FIFO 작업을 실행한다.
11. pending 작업이 없으면 실행 사이클을 종료한다.

### 6.3 사용자 개입이 필요한 작업

1. AI가 사용자 판단 없이는 안전하게 진행할 수 없는 상황을 발견한다.
2. 작업을 `waiting-user` 상태로 전환한다.
3. 사용자가 `agent-backlog open {작업이름}`으로 기존 AI 세션을 resume한다.
4. 사용자가 필요한 판단이나 정보를 제공한다.
5. 작업을 다시 queue에 넣은 뒤 이후 실행에서 이어서 처리한다.

### 6.4 결과 검토

1. 사용자는 `agent-backlog list`로 현재 pending/running 작업을 확인한다.
2. `report`, `log`, `open` 명령으로 결과와 세션을 확인한다.
3. 코드 작업이면 staged 변경 또는 pending changelist를 직접 검토한다.
4. commit/push/submit 등 최종 반영은 사용자가 직접 수행한다.

## 7. 핵심 기능

### 7.1 표준 작업 폴더

기본 저장 위치:

    %LOCALAPPDATA%\.backlog\YYYY-MM-DD\{task-name}\

기본 구성:

    task.json
    prompt.md
    session-id.txt
    report.md
    log.txt
    result\          # 별도 산출물이 있는 경우에만 생성
    conversation.txt # 전체 대화 보존 옵션 사용 시에만 생성

`YYYY-MM-DD`는 작업 **등록일**이다.

#### task.json

작업 실행과 관리에 필요한 메타데이터의 source of truth로 사용한다.

권장 필드:

- 작업 이름
- provider (`claude` / `codex`)
- workspace 절대 경로
- status
- 등록 시각
- 실행 시작/종료 시각
- 등록 순번 또는 FIFO 판정을 위한 timestamp
- SCM 종류 (`git` / `perforce` / `none`)
- repository/root 정보
- Git branch 또는 Perforce workspace/stream 정보
- 관련 changelist 정보
- 전체 대화 보존 여부
- 최근 실행/종료 사유

`session-id.txt`는 provider의 실제 세션 ID를 저장한다.

### 7.2 prompt.md 규약

`prompt.md`는 단순 사용자 요청이 아니라 독립 실행 가능한 작업지시서다.

필수 항목:

- 목적
- 배경 및 현재 상황
- 작업 대상/workspace
- 구체적인 수행 내용
- 요구사항 및 제약조건
- 제외 범위
- 완료 조건
- 검증 방법
- 예상 결과물
- SCM 처리 조건
- 작업 종료 시 `report.md`에 기록해야 할 내용

완료 조건과 검증 방법이 작업 성격상 정의 가능한데도 빠져 있으면 Skill은 등록 전에 이를 보완해야 한다.

### 7.3 report.md

권장 구조:

- 최종 결과 상태
- 수행 요약
- 변경 사항
- 완료 조건 충족 여부
- 빌드/테스트/기타 검증 결과
- 생성된 산출물
- 남은 문제 또는 실패 원인
- 사용자가 확인하거나 결정해야 할 사항
- SCM 상태

향후 프로그램이 완료 상태를 안정적으로 판정할 수 있도록 `report.md`의 machine-readable frontmatter 또는 고정 결과 블록을 정의하는 것을 권장한다.

### 7.4 로그

`log.txt`에는 두 종류의 로그를 모두 남긴다.

- agent-backlog 자체 실행 로그
- Claude/Codex 프로세스 stdout/stderr

전체 AI 대화 보존은 설정 옵션으로 제공하며, 활성화한 작업에 대해서만 `conversation.txt`를 생성한다.

### 7.5 세션 재개

- 최초 실행은 새로운 Claude/Codex 세션으로 시작한다.
- 생성된 session ID는 즉시 `session-id.txt`에 저장한다.
- session ID가 존재하지만 최종 보고가 없는 작업은 중간에 끊긴 작업으로 판단한다.
- 다음 실행에서는 새 세션을 만들지 않고 해당 provider의 resume 기능을 사용한다.
- 완료된 작업도 `agent-backlog open`으로 기존 세션을 다시 열 수 있다.

### 7.6 완료와 검증

AI가 단순히 “완료했다”고 응답하는 것만으로 `completed` 처리하지 않는다.

- `prompt.md`의 완료 조건을 기준으로 검증한다.
- 빌드/테스트가 가능한 작업이고 검증 항목에 포함되어 있다면 반드시 실행한다.
- 필수 검증이 실패하면 `completed`가 될 수 없다.
- 사용자 판단이 필요하면 `waiting-user`로 전환한다.

프로그램이 의미적 완료 여부를 직접 판정하기 어렵기 때문에, 실행 Agent가 표준 결과 형식으로 완료 조건과 검증 결과를 기록하고 agent-backlog이 이를 파싱하는 프로토콜이 필요하다.

### 7.7 SCM 처리

#### Git

- 작업 시작 전 기존 working tree 상태를 확인한다.
- AI가 작업으로 변경한 파일을 식별한다.
- 검증 완료 후 해당 변경만 stage한다.
- 자동 commit 금지.
- 자동 push 금지.

#### Perforce

- workspace/stream 정보를 작업 메타데이터에 기록한다.
- 작업용 pending changelist를 사용한다.
- AI가 변경한 파일을 해당 changelist에 open/reconcile한다.
- 자동 submit 금지.

기존 사용자 변경을 실수로 stage하거나 changelist에 포함하지 않도록 **실행 전 SCM baseline과 실행 후 diff를 비교해 작업이 만든 변경만 처리**하는 방식을 권장한다.

### 7.8 CLI

MVP에서 필요한 명령:

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

기본 `list`는 `pending`과 `running` 작업만 보여준다.

`run`은 예약 시각과 관계없이 지금 즉시 pending queue를 실행하는 수동 명령으로 정의한다.

`open`은 내부 뷰어가 아니라 실제 Claude/Codex CLI의 resume 기능으로 기존 세션을 인터랙티브하게 연다.

### 7.9 설정

기본 설정 파일:

    %LOCALAPPDATA%\.backlog\config.json

권장 설정 항목:

- 작업 시작 시각/스케줄
- provider별 CLI 실행 경로
- 전체 대화 보존 여부
- 로그 레벨
- 완료 작업 보관 기간: 30일
- 위험 작업 승인 정책
- 백그라운드 프로세스 설정

설정은 파일 직접 편집뿐 아니라 `agent-backlog config`로 조회·변경할 수 있게 한다.

별도의 스케줄 추천 Skill을 제공해 사용자의 평소 Claude/Codex 사용 시간, PC 가동 시간, 피하고 싶은 시간, 주중/주말 패턴을 바탕으로 적절한 시작 시각을 추천한다.

## 8. 범위

### MVP

- Claude Code/Codex 공통 backlog 등록 Skill
- 사용자 질의와 최소 workspace 조사를 통한 완전한 `prompt.md` 생성
- task.json 기반 작업 메타데이터 관리
- 등록일/작업명 기반 로컬 파일 저장
- 중복 작업명 방지
- Claude/Codex provider adapter
- 새 세션 시작과 기존 세션 resume
- FIFO 단일 작업 순차 실행
- 실패 후 다음 작업 계속 실행
- 자동 재시도 없음
- 설정된 시작 시각의 백그라운드 자동 실행
- 수동 `run`
- list/open/report/log/status/config 등 관리 CLI
- waiting-user 처리
- 완료 조건 및 빌드/테스트 검증
- stdout/stderr와 실행 로그 보존
- 선택적 전체 대화 보존
- Git stage / Perforce pending changelist 준비
- 위험 작업 차단
- 완료 작업 30일 보관 정책
- 실행 시각 추천 Skill

### Later

- provider 사용량/quota를 직접 감지해 스케줄을 동적으로 조절하는 기능
- 더 정교한 실행 통계와 작업 이력 분석
- 우선순위 큐
- Claude/Codex provider 간 작업 이전 정책
- PC 로그인/부팅 시 daemon 자동 시작 UX 개선
- 팀 단위 공유 backlog 또는 원격 실행

### Out of Scope

초기 버전에서는 다음을 다루지 않는다.

- GUI/Tray UI
- 병렬 작업 실행
- 실제 사용자 idle 상태를 감지해 실행/중단하는 기능
- 자동 재시도
- 자동 Git commit/push
- 자동 Perforce submit
- 사용자 승인 없는 배포 또는 외부 시스템 변경

## 9. 운영 방식

### 작업 상태

현재 확정된 핵심 상태는 다음과 같다.

- `pending`: 실행 대기
- `running`: 실행 중
- `waiting-user`: 사용자 판단/정보 필요
- `completed`: 완료 조건 및 검증 충족
- `failed`: 작업 수행 실패
- `cancelled`: 사용자 취소

추가로 토큰/사용량 제한과 프로세스·PC 종료를 일반 실패와 구분하기 위해 `rate-limited`, `interrupted` 같은 상태를 두는 방안을 검토한다.

중요한 복구 규칙은 상태명과 별개로 다음과 같다.

- session ID가 존재하고 작업이 완료되지 않았다면 가능한 경우 해당 세션을 resume한다.
- 자동 재시도는 하지 않지만, 중단 복구와 사용자가 명시적으로 요청한 retry/requeue는 허용한다.

### 백그라운드 실행

사용자는 Windows에서 CLI를 설치하고 background scheduler를 실행한다.

    npm install -g agent-backlog
    agent-backlog start

scheduler는 설정된 시작 시각에 queue를 실행한다. 시작 가능한 시간대를 의미하는 것이 아니라 **실행을 개시하는 시각**이다. 해당 시각에 시작한 실행 사이클은 종료 시각 제한 없이 backlog를 소진할 때까지 계속된다.

## 10. 데이터 및 연동

### 데이터 저장

MVP에서는 별도 DB 없이 `%LOCALAPPDATA%\.backlog` 아래 파일 시스템을 source of truth로 사용한다.

장점:

- 사람이 직접 열어 확인 가능
- 백업과 디버깅이 단순함
- Claude/Codex Skill도 동일한 파일 규약으로 작업 생성 가능
- 별도 서비스가 필요 없음

### 외부 연동

- Claude Code CLI
- Codex CLI
- Git CLI
- Perforce CLI (`p4`)

각 AI CLI의 명령 형식과 session ID 획득 방식이 달라질 수 있으므로 provider별 Adapter로 격리한다.

## 11. 기술적 고려사항

### 구현 기술

초기 구현은 **Node.js + TypeScript**를 사용한다.

선정 이유:

- `npm install -g agent-backlog` 형태의 배포가 자연스럽다.
- Claude/Codex CLI 프로세스 실행과 stdout/stderr 스트리밍 처리가 단순하다.
- Windows CLI와 백그라운드 프로세스를 빠르게 구현하기 적합하다.
- 향후 macOS/Linux 지원으로 확장하기 쉽다.

초기 지원 OS는 Windows이며 GUI는 제공하지 않는다.

### Provider Adapter

Claude와 Codex 차이를 핵심 로직에 직접 넣지 않고 다음 인터페이스로 분리하는 방향을 권장한다.

- 새 세션 실행
- 기존 세션 resume
- 인터랙티브 open
- session ID 추출
- 프로세스 종료 사유 판정
- rate/token limit 감지
- stdout/stderr 수집

### 동시 실행 방지

백그라운드 scheduler와 사용자의 수동 `run`이 동시에 같은 큐를 실행하지 않도록 global lock/PID 관리가 필요하다. 작업 단위로도 lock을 두어 동일 작업의 중복 실행을 방지해야 한다.

### 작업 이름

`open {작업이름}`을 고유 식별자로 사용할 수 있도록 보관 중인 backlog에서는 작업 이름 중복을 허용하지 않는다. 30일 정리 후 삭제된 이름의 재사용 허용 여부는 구현 단계에서 정의한다.

## 12. 제약 조건

- Claude/Codex의 CLI 명령과 session resume 방식 변경에 영향을 받을 수 있다.
- provider가 사용량 제한 원인을 명확한 exit code로 제공하지 않으면 rate-limit 판정이 어려울 수 있다.
- PC가 종료되어 있으면 예약 실행 자체가 시작되지 않는다.
- 장시간 실행 중 PC가 종료되거나 프로세스가 강제 종료될 수 있으므로 상태 저장은 실행 단계마다 즉시 반영해야 한다.
- 작업 등록 단계에서 과도한 workspace 분석을 수행하면 백로그를 만드는 데 더 많은 토큰을 소비할 수 있다.
- 사용자가 이미 수정한 Git/Perforce 파일과 AI 작업 변경을 잘못 섞을 위험이 있다.

## 13. 위험 요소 및 대응

### 기존 사용자 변경 오염

**위험:** `git add` 또는 Perforce reconcile 과정에서 AI 작업과 무관한 기존 변경이 포함될 수 있다.

**대응:** 작업 시작 전 SCM baseline을 저장하고 실행 후 생성된 delta만 stage/pending CL에 포함한다.

### 무인 실행 중 위험한 작업 수행

**위험:** 파일 대량 삭제, 배포, 외부 메시지 전송, 시스템 설정 변경 등 사용자가 직접 보지 않는 상태에서 되돌리기 어려운 작업을 수행할 수 있다.

**대응:** 위험 동작 정책을 두고 자동 진행할 수 없는 작업은 `waiting-user`로 전환한다.

commit/push/submit은 별도 승인 정책과 관계없이 자동 수행하지 않는다.

### AI가 근거 없이 완료 처리

**위험:** 작업을 일부만 수행했거나 테스트가 실패했는데 완료로 기록할 수 있다.

**대응:** `prompt.md`의 완료 조건 및 검증 방법과 표준 `report.md` 결과 프로토콜을 기반으로 상태를 결정한다.

### 세션 복구 실패

**위험:** CLI 업데이트, session 만료, 손상 등으로 resume에 실패할 수 있다.

**대응:** session resume 실패 원인을 로그에 보존하고 자동으로 새 세션을 만들어 작업을 처음부터 다시 시작하지 않는다. 사용자가 retry/open으로 복구 방향을 결정할 수 있게 한다.

### 작업이 무한히 오래 실행됨

**위험:** 종료 시간 제한을 두지 않으므로 한 작업이 queue를 장시간 점유할 수 있다.

**대응:** MVP에서는 순차 실행 원칙을 유지하되, 실행 시간 및 마지막 활동 시간을 로그에 남긴다. timeout/heartbeat 정책은 실제 사용 결과를 보고 후속 설계한다.

## 14. 결정된 사항

- 제품명은 `agent-backlog`이다.
- Claude Code와 Codex 모두 지원한다.
- 작업은 공통 Skill을 통해 등록한다.
- 불완전한 작업은 AI가 사용자에게 필요한 내용을 질문해 완전한 작업지시서로 만든 후 등록한다.
- 작업 이름을 사용자가 지정하지 않으면 AI가 생성한다.
- 별도 변경 요청이 없으면 작업을 등록한 AI provider가 실행 provider가 된다.
- 작업은 등록일 기준 디렉터리에 저장한다.
- 작업별 workspace를 저장한다.
- 메타데이터가 필요하므로 `task.json`을 추가한다.
- `result`는 별도 산출물이 존재할 때만 사용하며 코드 변경 자체는 원 workspace에서 수행한다.
- 등록 시 workspace 조사는 가능하지만 토큰 사용량을 고려해 최소화한다.
- 최초 실행은 새 세션으로 시작한다.
- session ID가 있는데 완료 보고가 없는 경우 중간에 끊긴 작업으로 보고 resume한다.
- 완료된 작업도 `open`으로 세션을 다시 열 수 있다.
- 사용자 판단이 필요하면 `waiting-user`로 전환한다.
- 작업은 한 번에 하나씩 FIFO 순서로 처리한다.
- 하나의 작업이 실패해도 다음 작업을 계속 처리한다.
- 자동 재시도는 하지 않는다.
- 초기 버전은 병렬 실행하지 않는다.
- 자동 실행은 사용자 idle 감지가 아닌 설정된 시각 기반이다.
- 설정된 시간은 실행 가능 window가 아니라 queue 실행을 시작하는 시각이다.
- agent-backlog은 계속 실행되는 백그라운드 프로그램 형태로 동작한다.
- 실행이 시작되면 queue를 소진할 때까지 계속 처리한다.
- 사용자가 Claude/Codex를 직접 사용하기 시작했는지는 감지하지 않는다.
- 기본 `list`는 pending/running 작업을 보여준다.
- 작업명 중복을 허용하지 않는다.
- 로그는 agent-backlog 로그와 Claude/Codex stdout/stderr를 모두 보존한다.
- 전체 대화 저장은 옵션으로 제공한다.
- AI의 선언만으로 완료 처리하지 않고 prompt의 완료/검증 조건을 기준으로 판정한다.
- 가능한 빌드/테스트 검증은 수행한다.
- Git 작업은 stage 상태까지만 준비한다.
- Perforce 작업은 pending changelist 상태까지만 준비한다.
- 자동 commit/push/submit은 수행하지 않는다.
- 위험 동작은 제한하며 사용자 판단이 필요하면 waiting-user로 보낸다.
- 초기 제품은 Windows CLI이며 npm으로 설치 가능해야 한다.
- 초기 구현 기술은 Node.js + TypeScript로 한다.
- GUI는 초기 범위에서 제외한다.
- 설정은 `%LOCALAPPDATA%\.backlog\config.json`에 저장하고 `agent-backlog config`에서도 관리한다.
- 완료 작업은 보관하되 30일 정리 정책을 적용한다.
- 별도의 archive 개념은 두지 않는다.
- 실행 시각 추천 Skill을 제공한다.

## 15. 미결정 사항

1. `rate-limited`, `interrupted`를 독립 상태로 둘지, 종료 사유만 메타데이터에 기록할지 결정 필요.
2. `waiting-user` 작업을 다시 pending으로 전환하는 최종 CLI 명칭을 `requeue`로 확정할지 검토 필요.
3. 작업이 최초 실행된 이후 provider 변경을 금지할지, provider 간 handoff를 허용할지 결정 필요.
4. `report.md`의 machine-readable 결과 포맷과 agent 종료 프로토콜 정의 필요.
5. 하루에 복수의 자동 실행 시작 시각을 지원할지 결정 필요.
6. 30일 자동 정리 대상 상태를 completed/failed/cancelled에 한정할지 결정 필요. pending/running/waiting-user는 자동 삭제하지 않는 방향을 권장한다.
7. 백그라운드 daemon을 Windows 로그인/재부팅 후 자동 시작할지 결정 필요.
8. 특정 작업이 지나치게 오래 걸리는 경우 timeout/heartbeat를 둘지 결정 필요.
9. session resume 자체가 불가능한 provider 오류가 발생했을 때 새 세션으로 handoff하는 정책 정의 필요.

## 16. 다음 작업

1. **작업 상태 머신 확정** — interruption/rate limit/waiting-user의 상태와 복구 전이를 정의한다.
2. **Backlog Skill 규약 작성** — Claude Code/Codex 양쪽에서 동일한 `prompt.md`와 `task.json`을 생성하도록 Skill 명세를 만든다.
3. **task.json 스키마 확정** — provider, workspace, SCM, timestamp, status 필드를 JSON Schema 수준으로 정의한다.
4. **Provider Adapter 기술 검증** — Claude/Codex의 새 세션 실행, session ID 획득, resume, stdout/stderr, 종료 코드 동작을 실제 CLI에서 검증한다.
5. **완료 프로토콜 설계** — `report.md`의 구조화 결과와 검증 결과를 프로그램이 안정적으로 읽을 수 있는 규약을 정한다.
6. **SCM 안전성 Prototype** — Git baseline→task delta→stage와 Perforce baseline→pending CL 흐름을 작은 workspace에서 검증한다.
7. **Scheduler/daemon Prototype** — `start/stop/status`, global lock, 예약 시각, FIFO drain 동작을 검증한다.
8. **MVP 구현 계획 작성** — CLI command별 Task와 테스트 항목으로 분해한다.
9. **실사용 알파 테스트** — 실제 Claude/Codex 작업을 밤 시간에 등록해 중단 복구, 결과 품질, 토큰 효율, 다음 날 검토 시간을 측정한다.
