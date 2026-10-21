---
title: GitHub Document Publishing Skill
category: skills
tags:
  - github
  - skill
  - documentation
  - wiki
  - reliability
  - automation
source: https://github.com/jaywapp/wiki
updated: 2026-10-22
---

# GitHub Document Publishing Skill

> AI Agent가 완성된 문서를 GitHub 저장소의 지정 브랜치와 경로에 안전하게 생성·업데이트하고, 실제 원격 반영까지 검증하기 위한 재사용 가능한 publishing workflow.

## 목적

GitHub 문서 반영 작업은 단순히 API의 성공 응답을 받는 것으로 끝나지 않는다. 실제 운영에서는 connector의 write-safety 차단, 기존 파일 충돌, stale SHA, branch head 변경, 임시 브랜치에만 저장된 상태, 원문을 읽지 못해 placeholder가 저장되는 문제처럼 GitHub 자체 오류와 다른 실패가 발생할 수 있다.

이 Skill의 목표는 다음 불변조건을 보장하는 것이다.

1. 사용자가 지정한 repository / branch / path를 canonical destination으로 취급한다.
2. 기존 파일을 먼저 확인하고 create와 update를 구분한다.
3. 보고서·문서의 원문 전체를 보존한다.
4. write 응답이 아니라 **원격 재조회 결과**로 성공을 판정한다.
5. 일시적인 connector write 차단은 제한적으로 재시도한다.
6. canonical branch 반영이 실패하면 명시적인 fallback을 사용한다.
7. 실제로 존재하지 않는 commit, branch, PR, 파일을 성공했다고 보고하지 않는다.
8. 원문을 확보하지 못하면 placeholder나 기억에 의존한 축약본을 게시하지 않는다.

## 적용 대상

- Wiki / Knowledge Base Markdown
- 조사 보고서
- 기술 문서
- 설계 문서
- 자동화가 생성한 날짜별 보고서
- 기존 문서 업데이트

코드 변경 자체의 Git workflow나 대규모 source branch 전략을 대신하는 Skill은 아니다. 주 대상은 **문서 artifact publishing**이다.

## 입력 계약

게시 전에 다음 값을 확정한다.

- `repository`: 예) `jaywapp/wiki`
- `canonical_branch`: 예) `develop`
- `canonical_path`: 예) `ai/trend/report.md`
- `content`: 게시할 **완전한 원문**
- `commit_message`
- `update_policy`: create-only / update-existing / upsert
- `fallback_policy`: none / temporary-branch / PR
- 기존 분류 정책이 있다면 해당 SSOT

경로를 추측해서는 안 된다. Knowledge Base라면 분류 SSOT를 먼저 읽는다.

## 핵심 Workflow

### 1. Preflight

1. Repository metadata를 조회해 접근 가능 여부와 기본 branch를 확인한다.
2. canonical branch가 존재하는지 확인한다.
3. 필요하면 branch protection / ruleset을 읽되, 관리 API의 403을 곧바로 branch가 protected라는 의미로 해석하지 않는다.
4. canonical path를 조회한다.

판정:

- 파일 없음 → CREATE
- 파일 있음 + 변경 필요 → UPDATE
- 파일 있음 + 내용 동일 → NOOP

기존 파일이 있는데 `create_file`을 호출하거나, 현재 SHA 없이 `update_file`을 시도하지 않는다.

### 2. Source Integrity Gate

write 전에 content를 검증한다.

금지:

- `No readable content was found...`
- 빈 문자열
- 다운로드/읽기 실패 안내문
- 원문 대신 임의로 만든 짧은 요약
- 이전 대화 기억만으로 복원한 문서
- 잘린 파일을 전체 파일이라고 간주

가능하면 최소한 다음을 검사한다.

- 예상 title/date 존재
- 최소 합리적 길이
- frontmatter가 필요한 문서라면 frontmatter 존재
- 원본 source와 최종 content의 hash/length 기록

원문이 확보되지 않으면 **게시하지 않고 source unavailable로 종료**한다.

### 3. Canonical Write

문서 하나를 게시하는 일반적인 경우 GitHub Contents API를 우선한다.

CREATE:

`create_file(repository, path, full_content, message, branch=canonical_branch)`

UPDATE:

1. `fetch_file`에서 current blob SHA 확보
2. `update_file(..., content_sha=current_sha, branch=canonical_branch)`

단순 문서 게시에 blob → tree → commit → update_ref 같은 저수준 Git object 경로를 먼저 사용하지 않는다. 필요한 API 호출 수와 실패 지점을 늘리기 때문이다.

### 4. Write Failure Classification

실패를 구분한다.

#### GitHub API 오류

예:

- 404 repository/path/ref
- 409 conflict
- 422 validation
- 403 GitHub permission/protection 응답

실제 HTTP/API 응답을 근거로 원인을 기록한다.

#### Connector / Safety 차단

GitHub까지 mutation이 전달되지 않은 연결 계층 실패다.

이 경우 **GitHub 권한 부족이나 branch protection이라고 추측하지 않는다.**

#### Lease / SHA Conflict

UPDATE 직전 다른 commit이 들어가 current SHA가 바뀐 경우다.

최신 파일을 다시 fetch하고 사용자 문서와 충돌 여부를 확인한 뒤 reconcile한다. 이전 SHA로 무작정 반복하지 않는다.

### 5. Bounded Retry

첫 write가 connector/safety 계층에서 실패했다면:

1. canonical path를 즉시 다시 fetch한다.
2. 실제로 파일이 생성/업데이트돼 있으면 성공 후보로 넘어간다.
3. 파일이 없다면 **동일 Contents API write를 한 번만 즉시 재시도**한다.

무한 retry하지 않는다.

GitHub의 명확한 validation/permission 오류에는 동일 요청을 반복하지 않는다.

### 6. Fallback Branch

두 번째 canonical write도 connector 계층에서 실패했고 fallback이 허용된다면:

1. canonical branch의 **최신 HEAD**를 다시 읽는다.
2. `automation/<document-id>` 등 deterministic temporary branch를 만든다.
3. 같은 **원문 전체**를 같은 repository path에 저장한다.
4. 임시 branch에서 `fetch_file`로 검증한다.
5. 가능하면 canonical branch 대상 PR을 생성한다.

임시 branch에만 존재하는 상태를 canonical 반영 성공이라고 부르지 않는다.

### 7. Post-write Verification

write API가 commit SHA를 반환해도 아직 성공이 아니다.

반드시 canonical branch에서 다시:

`fetch_file(repository, path, ref=canonical_branch)`

을 실행하고 확인한다.

- 파일 존재
- 예상 title/date
- 원문과 동일한 content 또는 의도된 update
- blob SHA
- 가능하면 commit SHA / branch HEAD

자동화라면 content hash 또는 length도 비교한다.

**canonical branch의 verified read-back만 최종 성공 조건이다.**

## 상태 모델

```text
SOURCE_READY
    ↓
PREFLIGHT
    ├─ SAME → VERIFIED_NOOP
    ├─ CREATE
    └─ UPDATE
         ↓
CANONICAL_WRITE
    ├─ success ───────────────┐
    └─ connector failure      │
            ↓                 │
       READ_AFTER_FAILURE     │
       ├─ present ────────────┤
       └─ absent              │
            ↓                 │
       RETRY_ONCE             │
       ├─ success ────────────┤
       └─ failure             │
            ↓                 │
       FALLBACK_BRANCH        │
            ↓                 │
       OPTIONAL_PR            │
                              ↓
                    CANONICAL_READBACK
                    ├─ match → VERIFIED_SUCCESS
                    └─ absent/mismatch → NOT_CANONICAL
```

## 결과 보고 규칙

### Canonical 성공

```text
✅ Wiki 반영 완료
- Branch: develop
- Path: ai/...
- Commit: ...
- Blob: ...
- Verification: develop read-back OK
```

### 임시 저장만 성공

```text
⚠️ canonical 반영 실패 / 임시 저장 성공
- Canonical: develop → 파일 없음
- Temporary branch: automation/...
- PR: #... 또는 생성 실패
- Verification: temporary branch read-back OK
```

### 완전 실패

```text
❌ Wiki 자동 반영 실패
- Canonical path: ...
- 확인된 원인: connector safety / GitHub API 422 / source unavailable ...
- Canonical read-back: 파일 없음
```

## 실패 사례에서 얻은 규칙

### 1. 같은 write가 나중에 성공할 수 있다

`jaywapp/wiki`에서 반복된 Scout 문서 반영 실패를 진단한 결과:

- 연결 계정은 admin/push 권한 보유
- `develop`은 protected가 아님
- repository ruleset 없음
- 실패했던 동일 Markdown을 이후 `create_file(branch=develop)`로 다시 실행했을 때 성공

따라서 connector safety 차단을 repository permission 오류로 오진하지 않는다. **read-after-failure + bounded retry**가 필요하다.

### 2. 임시 branch는 유효한 복구 자산이다

일부 실패 실행에서는 canonical write는 실패했지만 `automation/...` branch에 원본이 남았다. 이후 해당 blob을 그대로 canonical branch에 복원할 수 있었다.

따라서 fallback branch의 목적은 성공을 가장하는 것이 아니라 **원문을 Git object로 보존하는 것**이다.

### 3. Placeholder 게시가 누락보다 더 위험하다

과거 첨부파일을 읽는 과정에서 파일 핸들이 실제 본문 대신 `No readable content was found...` 문자열을 반환한 사례가 있었다. 이를 게시한 직후 read-back으로 발견해 삭제했다.

따라서 source integrity gate와 post-write verification은 선택 사항이 아니다.

### 4. GitHub 쓰기 성공과 Knowledge Base 반영 성공은 다르다

임시 branch commit, blob 생성, PR 생성만으로 canonical Wiki가 갱신됐다고 말할 수 없다. **지정 branch/path에서 최종 문서를 읽을 수 있어야 한다.**

## 자동화용 권장 알고리즘

```text
resolve canonical destination
fetch canonical file
validate source content

if file absent:
    try create_file(canonical)
else:
    try update_file(canonical, current_sha)

fetch canonical

if not correct and failure was connector-level:
    retry same contents write once
    fetch canonical

if canonical correct:
    report VERIFIED_SUCCESS
else if fallback allowed:
    create temp branch from latest canonical HEAD
    write exact same content
    verify temp
    optionally create PR
    report NOT_CANONICAL
else:
    report failure
```

## 하지 말아야 할 것

- write 응답만 보고 성공 선언
- connector safety 차단을 GitHub 403으로 표현
- 기존 파일 존재 여부 확인 없이 create
- stale SHA로 update 반복
- 원문 없이 기억으로 복구
- placeholder 게시
- canonical 실패를 임시 branch 성공으로 숨기기
- 실패할 때마다 blob/tree/ref 우회부터 시도
- 무한 retry
- branch protection을 확인하지 않고 원인으로 단정

## 적용 아이디어

### 바로 적용

- Wiki/Scout 자동화의 canonical create/update
- 조사 보고서 저장
- Skill/Tool 분석 문서 자동 반영
- 날짜별 Trend 보고서

### PoC

- content hash 기반 read-back
- fallback PR 자동 생성
- 누락된 날짜 보고서 reconciliation job
- 여러 문서의 transactional batch publishing

## 결론

GitHub 문서 게시의 핵심은 **write가 아니라 verified publication**이다.

가장 신뢰할 수 있는 기본 흐름은:

> source integrity → preflight → canonical Contents API write → read-after-write → bounded retry → fallback branch/PR → canonical verification

이다.

특히 Agent 자동화에서는 “API를 호출했다”와 “사용자가 지정한 branch/path에 문서가 실제 존재한다”를 명확히 구분해야 한다.
