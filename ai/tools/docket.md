---
title: Docket
category: tools
tags:
  - ai
  - coding-agent
  - evidence
  - code-review
  - claude-code
  - codex
  - verification
source: https://github.com/Dillonsmart/docket
updated: 2026-09-14
---

# Docket

> Agent가 만든 코드의 최종 diff만 리뷰하지 않고, 각 hunk에 누가·왜·어떻게 수정했는지와 수정 이후 어떤 테스트·coverage가 검증했는지를 provenance/evidence record로 남기는 코드 리뷰 보조 도구.

## 프로젝트 개요

Docket은 2026-09-13 공개된 Go 기반 프로젝트다. Claude Code, Codex CLI, opencode의 local session과 Hook event를 읽어 Agent 편집 이력을 재구성하고, 최종 commit diff의 각 hunk에 task·intent·실패했던 이전 시도·테스트·coverage·human contact를 연결한다.

2026-09-13 v0.0.4가 공개되었고 macOS/Linux/Windows용 static binary를 제공한다. Git repository에서는 signed evidence record를 orphan ref에 저장하고 commit trailer에는 record digest만 남긴다.

## 해결하려는 문제

Coding Agent가 코드를 빠르게 생성해도 reviewer가 받는 것은 보통 완성된 diff뿐이다. 이 과정에서 다음 정보가 사라진다.

- 어떤 Agent/model/tool이 해당 줄을 만들었는가
- 왜 그 구현을 선택했는가
- 어떤 잘못된 시도를 했다가 되돌렸는가
- 해당 수정 이후 어떤 테스트가 실제로 실행되었는가
- coverage가 변경 라인을 실제로 지나갔는가
- 사람이 실제로 본 영역과 아무도 확인하지 않은 영역은 어디인가

Docket은 Harness가 이미 생성한 execution trace를 review-time evidence로 재사용한다.

## 핵심 기능

### 1. Per-line / Per-hunk Provenance

Agent transcript를 ordered event stream으로 파싱하고 각 파일의 edit를 순서대로 replay한다. 각 line에 provenance vector를 전달한 뒤 최종 committed file과 정렬해 hunk별 출처를 계산한다.

단순 timestamp로 attribution하지 않는다. 해당 edit의 recorded output에 같은 text가 있고 정렬된 위치도 맞을 때만 attribution한다. 중간에 shell/editor/human 변경 때문에 pre-image가 어긋나면 추측하지 않고 `unknown`으로 표시한 뒤 recorded truth에서 다시 seed한다.

```text
Agent Transcript / Hook Events
          │
          ▼
     Ordered Edit Stream
          │
          ▼
     File Replay + Provenance
          │
          ├─ mismatch → unknown / re-seed
          │
          ▼
      Final Diff Hunks
          │
          ▼
    Evidence Attribution
```

### 2. Shell Edit Observation

Transcript에 남는 `Edit`, `Write`, `apply_patch`만으로는 heredoc, `sed -i`, formatter, generator 등 shell 기반 변경을 놓칠 수 있다. Docket은 `PreToolUse`에서 working tree를 snapshot하고 `PostToolUse`에서 diff를 계산해 이런 변경을 직접 관찰한다.

### 3. Temporal Evidence Correlation

테스트·type check·static analysis가 실행되었다는 사실만으로 evidence로 인정하지 않는다. 코드가 작성된 **이후** 실행된 check만 해당 edit의 evidence로 연결한다. Coverage도 report가 code보다 오래되었다면 무시하고, line 단위로 hunk와 매칭한다.

### 4. Evidence Density

Hunk마다 0~1 score를 계산한다. 공개된 가중치 기준으로 coverage는 최대 0.5, edit 이후 pass한 check는 0.3(이 변경으로 green이 되었다면 0.35), type/static check 합계 0.1, recorded human contact 0.1이다.

하지만 무검증 코드가 metric만 높이는 것을 막기 위해 cap도 둔다. 어떤 실행도 해당 코드를 통과하지 않았다면 최대 0.15, 작성자를 확인할 수 없다면 최대 0.5, local claim은 CI attested record보다 낮게 평가한다.

이 점은 evidence score를 `correctness probability`가 아니라 **review attention allocator**로 사용하려는 설계다.

### 5. Signed Commit Evidence Record

Record 전체를 commit message에 넣지 않고 digest만 trailer에 남기며, 실제 signed record는 별도 ref에 둔다. Trust tier도 `local_claimed`와 `ci_attested`로 구분한다.

### 6. Privacy / Redaction

전체 transcript나 전체 file을 record에 저장하지 않고 짧은 redacted excerpt만 남긴다. known credential, private key, JWT, Authorization header, password/secret assignment뿐 아니라 random-looking long token도 fail-closed 방식으로 redaction한다.

## 실제 측정 결과

프로젝트가 공개한 `docket gate` 결과는 attribution 자체가 어느 정도 가능한지 보여준다.

| 실제 세션 | Hunk attribution | Added line attribution | Content verified |
|---|---:|---:|---:|
| Claude Code Edit/Write, Laravel 4 commits / 98 edits | 98.1% | 99.8% | 100% |
| Codex apply_patch, Python 4 commits / 256 edits | 94.7% | 95.7% | 99.8% |
| opencode 100 edits, uncommitted | - | 92.9% | - |
| Claude shell-heavy, PHP 12 commits / 79 edits | 59.2% | 82.1% | 100% |

이는 프로젝트 자체 측정이며 독립 benchmark는 아니다. 특히 shell-heavy 세션에서 attribution이 낮아지는 결과가 중요한 한계다. Docket은 설명되지 않는 변경을 후보 command와 함께 `unknown`으로 남기며 억지로 attribution rate를 높이지 않는다.

## 장점

- Agent code review를 단순 diff에서 evidence-aware review로 확장한다.
- 실패했던 시도와 그 실패를 검증한 command까지 보존할 수 있다.
- line/hunk 단위 provenance라 Reviewer가 위험한 영역부터 볼 수 있다.
- attribution 실패를 `unknown`으로 명시해 잘못된 확신을 피한다.
- 검증 evidence가 edit 이후 발생했는지 시간 순서를 확인한다.
- local claim과 CI attestation을 구분한다.
- Claude Code와 Codex 모두 지원하고 Windows binary도 제공한다.

## 단점 및 한계

- 2026-09-13 공개된 매우 초기 프로젝트다.
- 현재 구현은 Git commit/hook/ref 구조에 강하게 묶여 있다.
- shell/generator 변경은 Hook 설치 전 기록을 복원할 수 없고 실제 측정에서도 attribution이 낮았다.
- evidence가 있다고 해서 코드가 올바르다는 뜻은 아니다. 테스트 자체가 부실할 수 있다.
- evidence density는 공개 formula가 있어도 KPI화하면 gaming될 수 있다.
- Gemini/ACP, GitLab, cross-repository aggregation, path policy gate 등은 아직 미구현이다.
- 회사 코드/terminal trace를 다루므로 enterprise 환경에서는 trace retention/redaction policy 검증이 필요하다.

## Perforce + Claude Code + Codex 적용

Docket 자체보다 **evidence record pattern**이 현재 Perforce Harness와 매우 잘 맞는다.

```text
Claude / Codex
     │
     ├─ Edit / Patch / Shell Hook
     ├─ Build / Test / Static Check
     └─ Review interaction
              │
              ▼
       Evidence Collector
              │
       file/revision replay
              │
              ▼
        Pending CL Diff
              │
      per-hunk Evidence Map
              │
              ▼
         Codex Reviewer
     low evidence hunks first
              │
       PASS / RETRY / HUMAN
```

Git commit 대신 Perforce에서는 evidence identity를 다음처럼 잡는 것이 현실적이다.

```text
pending_cl
workspace_id
depot_path
base_revision
content_hash
edit_event_ids[]
verification_event_ids[]
human_review_event_ids[]
```

Record storage는 VCS history에 억지로 넣기보다 Harness DB나 `.ai/evidence/`에 두고, submit 직전 Pending CL snapshot과 binding하면 된다. Submit 후에는 submitted CL number와 final depot revision/hash를 append해 immutable record로 승격할 수 있다.

중요한 원칙은 **Agent 자신에게 evidence record를 자기평가 형식으로 작성시키지 않는 것**이다. Hook/collector가 실제 edit와 check event에서 deterministic하게 만들어야 한다.

## 활용 아이디어

**바로 적용 가능:** Worker 결과를 Reviewer에게 보낼 때 `changed hunk → test/static/coverage evidence → source event` pointer를 같이 전달하고, evidence 없는 hunk를 먼저 리뷰한다.

**PoC 가치 있음:** Pending CL 하나를 대상으로 `p4 diff` hunk와 Claude/Codex Hook event를 매칭해 `evidence.json`을 만드는 collector. 초기에는 line attribution보다 `file/hunk + after-edit check`만 구현해도 가치가 있다.

**아이디어 참고:** `local_claimed / ci_attested`와 유사하게 `agent_observed / local_verified / ci_verified / human_reviewed` trust tier를 둔다.

**현재는 도입 가치 낮음:** evidence density score를 품질 KPI나 submit 자동 승인 기준으로 직접 사용하는 것. 이 점수는 reviewer priority signal로만 쓰는 편이 안전하다.

## 결론

Docket은 Coding Agent Harness의 trace를 단순 observability 로그로 끝내지 않고 **코드 리뷰 evidence로 승격**한다는 점이 핵심이다. 현재 설계 중인 `Work → Evidence Bundle → Codex Review` 흐름을 구체화할 수 있는 좋은 참고 구현이며, Perforce에서는 commit 대신 Pending CL을 evidence binding 단위로 바꾸면 된다.

**평가: 🟡 PoC 가치 매우 높음**

## 참고 자료

- Repository: https://github.com/Dillonsmart/docket
- Latest checked release: https://github.com/Dillonsmart/docket/releases/tag/v0.0.4
- Commit Evidence Record spec: https://github.com/Dillonsmart/docket/tree/main/spec
