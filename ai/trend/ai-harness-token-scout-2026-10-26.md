---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-26"
date: 2026-10-26
category: trend
tags: [ai-harness, agent-orchestration, context-engineering, token-optimization, perforce, claude-code, codex, deepagents, open-swe, opencode, durable-state, evidence-verification]
---

# AI Harness · Context/Token Optimization Scout — 2026-10-26

> 조사 기준: **2026-10-26 05:57 KST / 2026-10-25 20:57 UTC**. 전일 Scout의 기준시각(10/25 05:56 KST) 이후에 병합된 GitHub 원본 커밋·테스트를 우선 조사했다. 모델 토큰, 실제 청구 USD, DB/네트워크 바이트, CPU 시간, UI 지연은 서로 다른 지표다. **이번 관찰 구간에서 동일 품질 작업 대비 모델 입력 토큰 또는 실제 청구액이 몇 % 감소했다는 신규 검증 결과는 확인하지 못했다.** 이하 정량 성과 대부분은 제작자가 수행한 fake-model·synthetic·브라우저 벤치마크이며 자체 재현 결과가 아니다. 최신 커밋이 곧 패키지 안정 버전 출시를 의미하지 않는다.

## 0. 전일 보고서 대비 중복·배포 상태

- 비교 기준: [10/25 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-25.md), [10/24 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-24.md), [10/23 Scout](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-10-23.md)와 [GitHub Document Publishing Skill](https://github.com/jaywapp/wiki/blob/develop/ai/skills/github-document-publishing.md).
- 재보고 제외: Open SWE Typed Inbox #4511, Claude Code v2.1.310의 dense-text compaction 수정, OpenCode 비용 receipt 및 quota 분리, Deep Agents 0.7.32 provider lazy imports, MCP Tool 이름 단축 #4545, 앞서 다룬 TokenEconomizer/ContextBench의 벤치마크와 Deep Agents 55% checkpoint 저장량 사례.
- 공식 release 점검: 10/26 기준 확인된 Claude Code 최신 릴리스는 [v2.1.310](https://github.com/anthropics/claude-code/releases/tag/v2.1.310)(10/23 23:39 UTC), Codex 최신 안정 릴리스는 [rust-v0.164.0](https://github.com/openai/codex/releases/tag/rust-v0.164.0)(10/23 04:48 UTC), Deep Agents SDK는 [0.7.32](https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.32)(10/23 21:30 UTC). 이번 조사 구간에서 이 3종의 새로운 안정 릴리스를 발견하지 못했다. **10/24~25 병합된 Deep Agents Code·Open SWE·OpenCode 변경은 소스 HEAD 기준으로 서술한다.**
- 이번 스캔에서 Codex, Gemini CLI, Microsoft Agent Framework의 지정 시간 범위에서 새로 병합된 관련 커밋은 확인하지 못했다. 이들을 빠졌다는 이유만으로 이전 내용을 신규 항목으로 재포장하지 않는다.

## 1. 오늘의 변화 우선순위

| 우선 | 신규 근거 | 재현/제작자 측정 | 토큰·비용 직접 절감 여부 | Perforce·Claude Code·Codex 평가 |
| --- | --- | --- | --- | --- |
| P0 | Open SWE #4563: 리뷰 diff를 line-range + sandbox index로 변환 | 57 MB 계획 → 1.49 MB, 34.3 → 0.27초 | 모델 토큰 **미측정**; 상태·CPU 감축 | **PoC** |
| P0 | Open SWE #4561: Tool 결과를 페이지·행동에 따라 선택 조회 | 320 → 0, 15,300 → 0/4 HTTP requests | 네트워크 감축; 모델 토큰 **아님** | **바로 적용 원칙** |
| P0 | Deep Agents #7233: Forked Sub-agent 부모 환경 컨텍스트 재사용 | 120~133 → 35~36 ms/task | 캐시 접두부 재사용 가능, hit/원가 미측정 | **PoC** |
| P0 | Deep Agents #7244: Indexed checkpoint history fast-path | 상태 조회 2.30→0.61초 등, SHA-256 동일 | 모델 토큰 **아님**, 재개 CPU·지연 절감 | **PoC** |
| P0 | Deep Agents #7245: In-process writer queue + cross-process fence | 209~308 → 22~43 ms/tool | 모델 토큰 **아님**, Tool-heavy 오버헤드 감소 | **PoC** |
| P1 | OpenCode #58656: Session media content-addressable blob | hash 참조와 hydrate 구현, 수치 없음 | 중복 저장 회피 기대, 모델 입력 절감 미확인 | **PoC** |
| P1 | Open SWE #4569: 선택 passage의 구조화된 Reply/Handoff | source·line·주변 문맥 contract + 테스트 | 필요한 근거만 전달 가능, 절감 미측정 | **PoC** |
| P1 | Open SWE #4530: Native GitHub merge queue read-only observer | signed event + 1분 reconciliation + SHA membership | 신뢰성 개선; 토큰 절감 무관 | **PoC** |
| P1 | OpenCode #58848: Tool schema 등록 시 1회 변환 | 이전 #58798 WeakMap 방식 대체, 회귀 테스트 | 변환 CPU 최적화; schema token 수 그대로 | **바로 적용 원칙** |
| P1 | Deep Agents #7247: Tracing-off middleware thread-hop 제거 | read_file 20.3→8.8 ms/tool 등 | 토큰 절감 아님 | **PoC** |
| P1 | Open SWE #4562: ThreadStore 내부 경로 단축 | 이전 1.96초, 이후 ~0.65초는 **추정** | 작업 시작 지연·상태 일관성 | **PoC** |
| P2 | OpenCode #58923/#58813: durable event encode 지연 / ETag 재검증 | 단위 테스트, 정량 USD 없음 | 전자는 CPU, 후자는 catalog 통신·정확도 | **바로 적용 원칙** |
| P2 | Open SWE #4567: agent graph factory 단계별 계측 | 기존 graph load 2.2~4.9초 관측 | 계측만 추가; 비용 절감 주장 금지 | **바로 적용** |
| P2 | Deep Agents #7250/#7246: UI row pruning·cache-expiry tick 개선 | 296→8ms, 43→<0.01ms 등 | **LLM compaction/cache hit 개선 아님** | **아이디어 참고** |

## 2. Open SWE #4563 — 대형 PR의 모든 라인을 저장하지 않고 Range Ledger로 관리

**원본·신규성:** [2026-10-25 커밋 ee3162b](https://github.com/langchain-ai/open-swe/commit/ee3162b02d2ff8a95a6daf55f8068f538793788d). 변경 파일은 `openswe/walkthrough/`, `openswe/review_guide/`, migration `0083_6416028c3ce3_keep_walkthrough_lines_as_ranges.py`, 관련 walkthrough/review 테스트. 10/25의 Typed Inbox와는 별개의 **리뷰 증거 상태 인덱스 교체**다.

**내부 동작:** 종전 backend는 PR의 변경 라인마다 텍스트를 함께 보관하고, chunk 배치·Other 분류·reviewed 표시가 모든 라인을 순회했다. 신규 구조는 인접 변경 줄을 `LineSet` 형태의 line ranges로 저장하고, 실제 diff 텍스트와 chunk 렌더링은 PR revision별로 한 번 sandbox에서 색인한다. force-push 후에는 merge base·git line mapping으로 유지 가능한 리뷰 범위를 carry하고, 이동된 줄이나 매핑할 수 없는 삭제 줄을 안전하게 **미검토로 되돌린다**. DB에는 사용자·PR당 검토 범위를 통합한다.

**제작자 실측:** M-series 노트북에서 720,000 changed lines, 18,000 blocks synthetic PR, best-of-three, **backend 처리만** 계측. Split 11.1→0.36초, Assign 9.2→0.26초, Move Other 34.3→0.27초. Stored plan 57MB→0.76MB + diff index 0.73MB = **1.49MB(약 97.4% 감소)**. DB·sandbox latency, 실제 비용은 포함되지 않았다.

**절감 원리·Trade-off:** 전체 줄 내용의 반복 복제 및 O(lines) 처리 대신 range 기반 O(hunks) 상태 조작. 모델이 읽는 diff 원문까지 97.4% 감소했다는 뜻은 **아니다**. Migration 과정에서 기존 다른 채널에 공유되던 과거 seen 상태 일부가 초기화된다. 파일 이동·rename, merge base 부재, P4 integrate의 라인 이동에 유의해야 한다.

**P4 Harness 적용:** `ReviewRange(path, depot_rev, diff_base, hunk_id, start, end, head_digest, evidence_uri, reviewed_by)`를 운영 DB에 기록하고 TeamCity 상세 로그·UE5 변경 diff는 사용자 요청 시만 materialize. 100/1,000/100,000 changed line의 per-line vs range DB 크기, review false-approval, P4 resolve 이후 old-head 승인 재사용 오류를 비교. **판정: PoC(우선순위 높음)**. Claude/Codex Reviewer는 헤더·range index를 먼저 받고 실제 소스는 selective fetch한다.

## 3. Open SWE #4561 — Tool Output을 UI에서도 지연 로딩, 재조회 폭증 제거

**원본:** [2026-10-25 커밋 c3ee6cf](https://github.com/langchain-ai/open-swe/commit/c3ee6cfc494081999b33b68025723c4ed9fd86fd), `ui/src/features/agents/lib/transcript/reducer.ts`, `useThreadTranscript.ts`, `ReviewChatActions.tsx` 및 새 `.claude/skills/dashboard-preview/SKILL.md`. 테스트는 transcript reducer와 preview 트래픽 검증을 포함한다.

**내부 동작:** 일반 thread 화면에서 review-page 전용 code가 Tool 결과까지 내려받고, 실시간 transcript update 때 이전 응답이 다시 다운로드되는 것을 수정. 이제 일반 thread는 result body를 조회하지 않으며, review 페이지도 코멘트/리뷰/노트에 필요한 Tool 결과만 조회한다. 캐시된 result를 reuse하고 실패한 요청은 재시도 가능, 동시 history 요청은 coalesce한다.

**실측:** 제작자 설명상 실제 운영에서 **약 180,000 requests/hour**의 불필요한 조회가 발생했다. Browser: 보관 Tool 결과 320개인 idle thread를 열면 **320→0** requests. Test harness: 300-call thread에 50 live updates 시 **15,300→0**(일반 thread), 리뷰 페이지는 필요한 **4**건. 이는 HTTP/DB/대역폭/브라우저 개선이며 **LLM에 이미 들어간 ToolMessage 토큰을 줄인 수치가 아니다**.

**P4 적용:** `ToolResultReceipt(call_id, status, summary, byte_count, content_sha, artifact_uri, expires_at)`만 ledger·대시보드에 보여주고, `p4 describe` 본문, TeamCity 로그, UE5 빌드 로그는 source handle 클릭/검증 단계에서 로드. Reviewer에는 필요 근거의 `line_span`·hash만 prefill. 재요청 0이어도 필요한 증거 접근성이 나빠지지 않는지 테스트. **장점:** 즉시 구현 가능·대규모 트래픽 절감 가능. **단점:** 만료된 artifact나 누락된 summary를 감지하고 재조회해야 함. **판정: 바로 적용 원칙, Tool-to-model 축약은 별도 PoC.**

## 4. Deep Agents #7233 — Forked Sub-agent의 동일 컨텍스트 스냅샷과 캐시 접두부

**원본:** [2026-10-24 21:37 UTC 커밋 8d2c868](https://github.com/langchain-ai/deepagents/commit/8d2c868e010fdf0939e6285bb4965deea42bf1e6), `libs/code/deepagents_code/local_context.py` 및 `tests/unit_tests/test_local_context.py`.

**구현:** 병렬/반복 `task` 호출을 위한 fork가 매번 환경 감지 명령을 수행하는 대신 **부모의 Local Context 문자열**을 복사한다. 스냅샷은 thread별 LRU 32개까지 보관하며, 부모 snapshot을 찾지 못하면 기존 감지로 fallback. Isolated subagent의 자체 컨텍스트와 summarization 후 refresh는 변경하지 않는다. 테스트는 FakeChatModel의 system prompt 일치와 감지 횟수를 확인한다.

**실측·토큰 원리:** Fake-model 10회 순차 호출에서 fork task latency **120~133ms→35~36ms**. 동일한 system prompt prefix는 prefix cache reuse를 돕지만 **cache-read 토큰 증가량 또는 USD 절감률은 새 측정으로 공개되지 않았다**. 부모 context가 오래되어 실제 workspace 상태와 달라지면 잘못된 경로/브랜치/CL을 안내할 수 있다.

**P4·Claude/Codex PoC:** `ContextSnapshot(workspace_root, p4_client, stream, have_change, stream_head, skill_digest, policy_digest, captured_at)`를 부모가 구축하고 fork worker에게 read-only 전달. P4 client/CL/branch가 바뀌면 무효화. 각 worker는 개인 대화·scratchpad·tools를 독립 유지하되 공통 정적 prefix만 공유. 30-task workload에서 local-context 탐지 횟수, cache-read/write tokens, stale-state 오류율, 성공 CL당 USD를 측정. **판정: PoC(토큰 최적화 최우선).**

## 5. Deep Agents #7244 + #7245 — Durable Session의 Indexed Read와 Writer Fence

### 5.1 #7244: Checkpointer Wrapper의 성능 역전 수정

**원본:** [2026-10-24 커밋 5fa7317](https://github.com/langchain-ai/deepagents/commit/5fa73172dec5a96f042ebd6aaec5237571df7e8d), `libs/code/deepagents_code/_checkpointer_adapter.py`, `client/launch/server_manager.py` 및 `tests/unit_tests/test_checkpointer_adapter.py`.

LangGraph의 `_CustomCheckpointerAdapter`가 내장 기본 `aget_delta_channel_history`를 노출하는 탓에 `__getattr__`가 SQLite saver 구현을 전달하지 못했다. 긴 대화의 checkpoint를 조상별로 하나씩 읽고 디코드한 오류를, 조건부 fast-path forwarding으로 해결. 내부 saver가 고속 override를 제공하지 않으면 안전하게 fallback하며 upstream에서 고치면 제거할 임시 compatibility patch다.

제작자 테스트는 **76GB sessions DB 복사본 / 3,734 checkpoints / 972 messages**에서 `GET /threads/{id}/state` 응답의 SHA-256 일치를 확인했다. 네 라운드 중앙값 **2.30→0.61초; 6.23→0.38초; 2.18→1.35초; 1.22→0.38초**. 조용한 환경에서 **1.04~1.21→0.26~0.29초**, `-r` resume 역사 표시 **2.61→1.88초**. 서버 부하에 따른 분산이 크며 모델 호출량은 변하지 않는다.

### 5.2 #7245: Writer poll을 queue로 대체

**원본:** [2026-10-24 커밋 d5801f1](https://github.com/langchain-ai/deepagents/commit/d5801f121c8f320a253ac13fd6a3988ea1f8bf71), `libs/code/deepagents_code/thread_ownership.py`, `test_thread_ownership.py`. 동일 프로세스 이벤트 루프의 concurrent write는 `asyncio.Lock`으로 순서를 정해 기존 10ms lock polling을 없앤다. **Cross-process filelock 및 ownership validation은 유지**한다. 테스트는 8 concurrent writer의 직렬화·poll 없음·취소시 잠금 해제를 확인한다.

Fake-model `write_todos` 50 호출 평균 시간(원본 제시 범위): **209~308→22~43ms/tool**. Guard만 분리해 4 writer 경합 **36.4~36.9→3.4~3.7ms**, 1 writer **1.05~1.42→0.74~0.83ms**. 이는 Tool 호출 사이 DB 상태 쓰기 오버헤드이며 LLM 생성 속도/토큰 절감이 아니다.

**P4 적용:** `TaskLedger`에 `execution_generation`, `checkpoint_revision`, `writer_lease`, `fence_token`과 immutable effect receipt를 보유. 동일 작업 내 write는 in-process queue, 서로 다른 TeamCity 에이전트/PC는 서버-side lease+fence. `p4 submit`은 DB write 보장과 별개인 외부 부작용이므로 응답 불명확 시 Perforce authoritative query 후 정산; 절대 자동 재제출 금지. Session 100/1,000/5,000 checkpoint resume p50/p95 및 crash/restart 상태 해시 동일성 시험. **판정: 두 변경 모두 PoC(상태 정확도 최우선), private-adapter monkey patch 직접 복사 채택은 주의.**

## 6. OpenCode #58656 — Content-addressed Media Blob + Inbox/Handoff

**원본:** [2026-10-25 커밋 70c69f0](https://github.com/anomalyco/opencode/commit/70c69f06f9d7ae3103d923898d926d88f3c97f4d), `packages/core/src/session/blob.ts`, migration `20261025123711_blob.ts`, `session/history.ts`, `session/inbox.ts`.

**동작:** 이미지·첨부 및 Tool media를 매 메시지에 Base64로 반복 내장하지 않고 `media:<hash>` 콘텐츠 주소 URI로 참조한다. SQLite `blob(hash PK,mime,bytes,width,height,data,created)` 및 `blob_ref(session_id,message_id,hash,seq)`에 원본과 참조를 분리. history와 inbox를 읽을 때 필요한 hash를 중복 제거해 최대 **500건씩 DB 조회**, 필요한 media만 hydration. Blob 유실 시 참조 URI가 그대로 모델에 노출되지 않도록 텍스트 `[media unavailable: …]`로 대체.

**효과·위험:** 반복 media 저장, history deserialize, resume payload 크기를 줄일 가능성. **스토리지 바이트/실제 모델 입력 토큰 감소 실측은 공개되지 않았다.** 이미지 해상도가 여전히 동일하게 모델에 전달된다면 추론 토큰은 줄지 않는다. 사용처 별 허용 데이터 보존기간, 접근 제어, blob GC, 민감 이미지 dedup collision/visibility 검증이 중요하다.

**P4 적용:** 빌드 screenshot, Unreal callstack 첨부, asset diff 이미지를 `EvidenceBlob(hash,mime,size,access_scope,retention)`로 보관하고 ledger에는 handle만. Fork worker로 전송할 때만 선택 hydration, 외부 모델 전송 전에 정보 분류 검사. 동일/유사 첨부 100건의 DB 크기·resume latency·model input tokens·evidence recall 비교. **판정: PoC.**

## 7. Open SWE #4569 — Selective Passage Reply를 명시적 Context Contract로 전달

**원본:** [2026-10-25 커밋 8430437](https://github.com/langchain-ai/open-swe/commit/84304373c34ceb92702edc2b74a5286e0d7f8550), `openswe/utils/dashboard_handoff.py`, `openswe/input_messages.py`, `ui/.../SelectionReply.tsx` 및 `tests/agent/test_input_messages.py`/`tests/e2e/tests/dashboard_transcript.spec.ts`.

**구현:** 사용자 화면의 transcript·terminal·file에서 **일부만 선택해 답변**한다. 별도 `PassageReply` 모델이 `source(conversation/terminal/file), file, lines, before, selection, after, comment`를 받아 전송한다. 예를 들어 file의 6행과 그 주변만 `<input-message><reply>…</reply></input-message>`로 첨부하고, XML escape로 인용 텍스트가 지시문 구조를 위조하지 못하도록 한다. 컨텍스트 양옆 각각 최대 **4,000 문자**, 선택·코멘트 각각 최대 **20,000 문자** 입력 제약이 있다.

**토큰 원리:** 대화 전체 재탐색보다 선택 구간과 위치를 보내 재검색 범위를 좁힐 수 있지만, 다수 reply가 동시에 쌓이면 오히려 토큰이 증가할 수 있다. 숫자 제한은 **문자 수이지 토큰 수가 아니다**. 인용 주변의 의미가 누락되면 false confidence가 생긴다.

**P4 적용:** Reviewer가 TeamCity 실패 로그 또는 `p4 diff -du`의 한 문단을 선택하면 `EvidenceSelection(depot_path, revision, line_start, line_end, snippet_hash, pre/post_window, user_question)` 구조로 전달. 후속 Agent는 depot revision과 SHA가 맞는지 확인하고 정확한 근거만 추가 조회. 선택형 vs 로그 전체 주입에서 입력 토큰, 오류 원인 적중률, 경계 밖 근거 recall 측정. **판정: PoC(Context Engineering + evidence verification).**

## 8. Open SWE #4530 — Native Merge Queue의 Authoritative Snapshot과 Candidate 재식별

**원본:** [2026-10-24 23:06 UTC 커밋 73d1058](https://github.com/langchain-ai/open-swe/commit/73d105847faed8b5b33c0024865e359c7a889e77), [docs/MERGE_QUEUE.md](https://github.com/langchain-ai/open-swe/blob/main/docs/MERGE_QUEUE.md), `openswe/merge_queue/native.py`, `github/queue.py`, migration `0082_40e708f0898f_observe_native_merge_queue_candidates.py`.

**동작:** signed `merge_group`/PR/push webhook은 단순한 **wake 신호**로만 취급한다. 상태의 권위는 GitHub GraphQL 현재 queue 조회에 있고, candidate SHA와 merge commit parent chain을 따라 PR들의 정확한 membership을 재구성한다. 매분 reconciliation이 유실 webhook을 보정하고, 권한 오류/불완전 목록에서는 마지막 정상 snapshot을 유지한다. Snapshot에 target SHA·PR head·review decision·candidate parent를 함께 저장한다. 최대 **100 entries**, 같은 repo·merge-commit queue만 지원. 기존 custom queue는 pause/drain 필요하며 **읽기 전용 관찰기이고 merge/CI/check publish 기능은 없다**. 합병 후 자동 활성화되지 않는다.

**원리·트레이드오프:** stale candidate ABC에서 B를 제거한 뒤 재구성된 AC의 결론에 ABC 검증 결과를 잘못 붙이는 위험을 SHA 단위로 줄인다. 상태 조회/증거 정확도 개선이지 모델 토큰 절감은 아니다. 100개 초과·API 부정확·cross-repo PR에 별도 정책이 필요하다.

**Perforce 적용:** `ChangeCandidate(stream, depot_change, base_cl, sources[], head_sha, test_suite_sha, generation)`를 식별자로, webhook/TeamCity 완료 알림은 단지 wake. 최종 build artifacts·P4 submitted change·shelved diff의 권위 정보는 각각 원천 서비스에서 fetch하여 확정한다. Rebuild/rebase 뒤 통과한 과거 candidate 증거를 승계하지 않는다. **판정: PoC(durable evidence와 task lifecycle).**

## 9. OpenCode #58798→#58848 — Tool Schema 변환 위치를 등록 단계로 이동

**신규성·소스:** [선행 #58798, 10/24 21:34 UTC](https://github.com/anomalyco/opencode/commit/13a615b90249cf732e3323a36856ae696bd45d87) → [후속 #58848, 10/25 03:22 UTC](https://github.com/anomalyco/opencode/commit/e0b6039e1f26b753c07d690f6ea0ba7035e72c9d). **최신 HEAD 구현이 중요**: 선행 Tool schema identity WeakMap 캐시는 후속 변경에서 제거됐고, 현재는 `packages/core/src/tool.ts` registry에 ToolDefinition의 변환 결과를 보관한다. `session/model-request.ts`는 Plugin Hook이 Tool schema를 in-place 수정할 수 있으므로 **deep copy**를 Hook마다 건넨다. 단위 테스트 `tool-registry.test.ts`와 `session-model-request-hooks.test.ts`가 반복 변환·수정 누수를 검증한다.

**절감 원리·트레이드오프:** 매 step에서 Tool schema를 JSON Schema로 다시 바꾸지 않는 **host CPU/할당량 최적화**이며 schema 텍스트가 모델에 노출되는 횟수 또는 input tokens가 줄었다는 주장은 할 수 없다. Registry 업데이트가 발생하면 snapshot version을 올려 재등록해야 하고 deep copy 비용이 생긴다. Hook에 전달한 스키마를 공유 원본으로 사용하면 이후 모델 호출의 Tool contract가 오염된다.

**P4 적용:** Tool registry snapshot에 `tool_id/version/schema_digest`를 보관해 재사용하고, Worktree/Perforce client 변경 시 Tool capability·allowlist refresh. Claude Code와 Codex의 role별 schema 노출 최적화와 **schema convert CPU**를 구분 계측. 100개 Tool, 50 step에서 conversion 횟수=등록된 스키마 수, Tool call 유효성 100%, Hook isolation 회귀 0 확인. **판정: 바로 적용 원칙.**

## 10. Deep Agents #7247 — 추적 미사용 시 빈 Middleware Thread-hop 제거

**원본:** [2026-10-24 커밋 fb05a5d](https://github.com/langchain-ai/deepagents/commit/fb05a5db3a070f89e3022a3aa869225fb6dae647), `libs/code/deepagents_code/_langsmith_runtime.py`, `memory_guard.py`, `tests/unit_tests/test_langsmith_runtime.py`.

**기전:** LangSmith `traceable` decorator가 tracing off인데도 hook 시작·종료 bookkeeping을 worker thread로 넘겨 각 Tool round trip마다 대략 40회 불필요한 context switch를 만들었다. 새 override는 tracing이 확실히 꺼져 있을 때 빈 setup/teardown만 event loop에서 inline 실행하고, 네트워크 가능 코드·실제 tracing은 기존 worker 실행을 유지한다. Memory guard도 write/edit/delete가 아닌 Tool은 path 계산 자체를 건너뛴다.

**제작자 측정:** Fake-model/tracing off 50 Tool calls x 3 runs, `write_todos` **18.1→9.7ms/call**, `read_file` **20.3→8.8ms/call**. Executor calls는 153 Tool round trips 범위에서 `write_todos` 6,879→795, `read_file` 7,029→945. 모델 토큰 효과 없음. 향후 tracing enabled 또는 ContextVar propagation이 필요할 때 이 최적화를 무조건 활성화하면 안 된다.

**P4 적용:** 로그 정책상 tracing off worker에서 no-op wrappers를 skip하는 패턴만 차용. Security/permission/log masking Hook은 off 대상으로 취급 금지. CPU profiler로 Tool-before/after hooks, context switch, p50/p95 latency, 감사 로그 누락 0을 검증. **판정: PoC(토큰 절감 우선순위는 낮음).**

## 11. Open SWE #4562 + #4567 — Runtime Adapter와 Factory Timing의 분리

**ThreadStore 변경:** [2026-10-25 커밋 15ea90d](https://github.com/langchain-ai/open-swe/commit/15ea90d7c2a76cc17acfe5aaeaf630959b580836). 새 `openswe/threads/store.py`는 내부 dashboard command가 자기 자신의 공개 API를 다시 호출해 thread를 읽고 업데이트하던 왕복을 줄인다. PostgreSQL 상태와 Managed Deep Agents dispatch의 store contract를 통합하고, metadata copy는 백그라운드에서 **순서대로** 처리하며 thread 삭제는 pending 복제 완료 뒤 진행한다. 기존 API route도 같은 store 경유. 종전 실제 예시에서 run 생성 약 **1.4초**, dashboard 전체 요청 **1.96초**; 작성자가 제시한 개선 예상치 **~0.65초는 아직 사후 측정값이 아니다**.

**Factory 계측:** [2026-10-25 커밋 a37f08a](https://github.com/langchain-ai/open-swe/commit/a37f08abfb3df35a7329ec6f69a110e50756c4f1), `mda/agent.py`, `mda/README.md`. 이미 production graph load **2.2~4.9초** 편차를 관찰했지만 어디에서 지체하는지 불명확하여 run ID별 `catalog_ms, models_ms, operation_tools_ms, file_tools_ms, subagents_ms, code_mode_ms, middleware_ms, factory_ms`와 compiler 잔여시간을 분리해 기록. **계측만 추가**했고 실제 속도·USD 개선은 없다.

**P4 적용:** P4/TeamCity/Claude/Codex를 `RuntimeAdapter`로 캡슐화하며 orchestration → DB → worker dispatch의 불필요한 loopback 없애기. Start latency를 `enqueue / lease / runtime_ready / tools_ready / first_model_token`으로 구분. Metadata replication이 지연·실패할 때 generation fencing과 최종 authoritative replay를 보장. **판정: ThreadStore PoC, 단계별 관측 지표는 바로 적용.**

## 12. OpenCode #58656 후속 참고 + #58923/#58813 — Durable Cost/Metadata Hot Path

**Durable Event encode 조건부 실행:** [#58923](https://github.com/anomalyco/opencode/commit/2d91ed57aef9b9aae8c3799c50ad34968d3d6f81) `packages/core/src/bus.ts`, `test/bus-unpersisted.test.ts`. 버스가 이벤트를 실제 영속 저장하지 않는 상황에도 모든 typed payload를 encode하던 경로를 함수로 지연해 저장할 경우에만 encode. **CPU 최적화이지 durable delivery 포기나 토큰 절감이 아니다.** 이벤트가 persistence required인 경우 serialization과 ordering은 동일하게 보존해야 한다.

**Catalog Cache ETag:** [#58813](https://github.com/anomalyco/opencode/commit/0b7f4c416104387deaa6c1184718d9eb7da35d93), `packages/core/src/models-dev.ts`, `test/models.test.ts`. models.dev catalog 응답의 ETag를 metadata에 저장하고 refresh 시 `If-None-Match`를 사용해 불변 catalog를 다시 전송받지 않도록 한다. `304` 와 오류/변경 응답을 구분한다. 이는 비용 계산 pricebook·context window·provider routing 가능 모델의 최신성을 유지하며 네트워크 비용을 절감할 수 있지만, 실제 비용 감소치·모델 token 절감치는 공개되지 않았다.

**적용·위험:** Tool/event 자체를 모델에 보낼 필요가 없는 운영 경로에서만 delayed encoding; 정책·감사·부작용 receipt는 지속 저장. Catalog에 model/context/cost 버전과 `checked_at, etag, source`를 둬 stale catalog 때문에 잘못된 routing·가격 산정을 막는다. 304 적중률, catalog bytes, raw provider cost receipt와 estimated pricebook 차이를 측정. **판정: 바로 적용 원칙.**

## 13. Deep Agents #7250/#7246 — UI Pruning과 Model Compaction을 혼동하지 말 것

- [#7250](https://github.com/langchain-ai/deepagents/commit/ec9847732f947d9809c41e92f0d78c9131caeb2a), `app.py`: TUI는 최근 최대 800개 메시지 widget을 화면에 두고 스크롤로 과거를 다시 로드한다. 삭제할 widget을 일괄 수집 후 한 번 `batch_update`로 제거하고 스페이서 크기를 동시에 고정. Headless synthetic UI benchmark에서 old row 8개 삭제 **296→8ms**, 100개 삭제 **1,232→112ms**.
- [#7246](https://github.com/langchain-ai/deepagents/commit/97f518d5870c77673db8551de831c9ec71295928), `app.py`: Prompt cache 만료 banner의 1Hz 조회를 full DOM walk에서 ID lookup으로 변경, 텍스트가 바뀔 때만 갱신. 800 메시지/약 10k widget에서 **43~44→<0.01ms** per refresh, synthetic UI stalls 5초 기준 4~11→0.
- 이 두 커밋의 `prune`은 **UI 위젯 삭제**이고 `cache expiry`는 **표시 최적화**다. LLM prompt compaction·cache hit·cache bill이 바뀐 것으로 보고하면 잘못이다. P4 harness dashboard가 긴 작업 기록을 보여줄 때 가상 스크롤·단일 refresh 프레임으로 적용하는 것은 가능하지만, 모델 비용 최적화 목적으로는 **도입 가치 낮음**.

## 14. 적용 설계: P4/TeamCity + Claude Code/Codex Harness

### 14.1 명시적 데이터 계약

~~~text
TaskLedger:
  task_id, generation, parent_task_id, p4_client, stream, base_cl,
  runtime_adapter, model_route, skill_snapshot_sha, context_snapshot_sha,
  state, writer_lease, fence_token, checkpoint_rev, last_event_seq
ContextSnapshot:
  client, stream, have_cl, head_cl, build_target, policy_digest,
  static_prompt_digest, captured_at, invalidation_reason
EvidenceReceipt:
  source_system, source_ref, depot_path, source_revision,
  diff_base, hunk_range, content_sha, artifact_uri, byte_count,
  truncated, complete, seen_generation, validation_suite_sha
EffectReceipt:
  operation_id, idempotency_key, intent_sha, admitted_at, dispatched_at,
  authoritative_outcome, checked_at, version
CostReceipt:
  provider, model, route, effort, request_id, input_tokens, output_tokens,
  reasoning_tokens, cache_read_tokens, cache_write_tokens,
  provider_billed_usd, pricebook_estimated_usd, source, observed_at
~~~

- **Progressive disclosure:** 기본 Skill/CLAUDE.md/AGENTS.md에는 안전 불변조건과 명령 선택 기준만. UE5/P4/TeamCity 상세 reference는 작업 유형으로 선택 후 읽고 Tool Schema도 역할·Skill에 맞춰 지연 노출. **오늘 관련 신규 정량 token benchmark 없음**.
- **Sub-agent isolation vs shared cache:** 공유하는 것은 검증된 정적 환경·policy snapshot뿐; worker별 scratchpad와 Tool 결과는 따로. Fork로 복제된 부모 상태에 stale P4 ClientSpec/CL이 있으면 요청 거부 후 refresh.
- **Selective context/RAG:** P4 depot index/코드 심볼 검색 → 파일 위치·revision·근거 요약만 handoff → Reviewer가 원문 부분 fetch. 오늘 RAG 모델 품질·recall 신규 공개 벤치마크는 없고 #4569의 선택 인용 인터페이스와 #4563의 range index가 재현 가능한 소재다.
- **Tool output:** Tool 응답은 요약·exit code·truncated flag·SHA·artifact pointer를 반환, 모델이 `read_evidence(ref, line_range)`로 근거를 다시 읽는 경로를 보장한다. truncate된 로그만으로 pass/fail 최종 판정 금지.
- **Cache / compaction:** Anthropic·Codex cache/read/write receipt를 다른 요금항목으로 분리. Deep Agents fork parent prefix 고정 실험은 cache-hit 실제 증가가 확인될 때만 절감으로 보고. Summary/compaction 뒤 policy·evidence hash continuity를 검증한다.
- **Durable lifecycle:** `queued→admitted→running→validating→handoff→completed`와 `outcome_unknown→reconcile` 상태를 분리. P4 submit/CI trigger/GitHub docs publish의 응답이 없으면 blind retry 대신 authoritative source read-back. UI row pruning은 이 lifecycle과 무관하다.
- **Routing:** [OpenCode Responses reasoning options #58872](https://github.com/anomalyco/opencode/commit/ed623cc6480bc74b04786ff012371027f994755e)의 `reasoning.mode/context` 전달은 프로토콜 capability 변화이며 실제 지원·비용/품질 benchmark가 없으므로 **아이디어 참고**. 현재 요청별 reasoning effort·model 라우팅은 capability 및 가격 증거를 검증한 후 제한적으로 A/B 시험한다.

### 14.2 실행 가능한 PoC 및 통과 기준

| 실험군 / 단위 | 고정 조건 | 주요 측정치 | 통과 기준 |
| --- | --- | --- | --- |
| Baseline: 동일한 P4 변경 30건 이상 | 같은 agent model/version/effort, tool allowlist, CL/테스트 | 성공 CL당 USD, prompt/cache/reasoning tokens, p50/p95, false approve | 기준선 |
| Fork local-context snapshot | 동일 Task 3~10개로 분할 | environment detection 호출, cache-read/write tokens, stale error | stale context 0, 품질 유지·USD/verified-CL 감소 |
| Range ledger + selective fetch | 동일 100/1k/100k line diff | DB bytes, diff parse latency, evidence recall, wrong review | critical evidence recall 100%, false approve 0 |
| Indexed state read / writer queue | 동일 Session 100~5k checkpoints | resume p95, hash 일치, concurrent writer·crash | state hash 동일, duplicate external effect 0 |
| Tool output pointer/UI lazy result | 300 Tool results × 50 updates | HTTP request 수·bytes, model injected tokens, on-demand evidence recovery | unused refetch 0, 검증에 필요한 fetch 성공 100% |
| CAS media / selective hydration | 동일 첨부 100개 반복 | DB 크기, resume latency, hydration misses, 모델 영상/이미지 토큰 | 데이터 손실 0, access isolation 유지 |
| Role/skill Tool schema | 100 Tool, 50 모델 step | conversion 횟수, schema input tokens, Tool 선택 실패 | conversion once/registration, 필수 Tool 누락 0 |
| Cost & routing receipt | 동일 요청 30개, 캐시 warm/cold 교차 | billed vs estimated USD, 304 hit, fallback 오류 | 청구 근거 분리, 비용·품질 모두 확인 |

최소 보고 산식은 **USD / verified completed CL**, **input/cache-read/cache-write/reasoning/output tokens / CL**, **critical evidence recall**, **replay success ratio**, **side-effect duplicate count**. 저렴한 세션이 실패 CL을 늘리면 개선이 아니다. P4 대규모 UE5 asset·binary 및 엔진 전체 빌드에는 별도 그룹으로 구간을 층화해야 한다.

## 15. 범위별 추가 근거 유무 및 다음 관찰 포인트

| 추적 범주 | 이번 구간 신규 검증 근거 / 공백 |
| --- | --- |
| coding agent workflow / orchestration | Open SWE ThreadStore·Merge Queue observer·factory timing, Deep Agents durable writer |
| skills/hooks / progressive disclosure | Open SWE dashboard-preview 검증 Skill, OpenCode Tool schema 재등록, Deep Agents trace-off hook; **새로운 Skill 파일 토큰 절감 실측 없음** |
| context pruning/compaction | Deep Agents UI prune는 모델 compaction이 아님; 새 cache-aware LLM context pruning % 결과 없음 |
| sub-agent context isolation | Deep Agents fork parent local-context snapshot과 isolated worker 구분 |
| RAG/selective context | Open SWE line-range review index·passage Reply; 별도 retrieval benchmark 없음 |
| prompt·skill 파일 경량화 | 오늘 검증 가능한 신규 파일 절감 benchmark 없음 |
| tool output 축약 | Open SWE UI full-result 불필요 refetch 제거(HTTP), 모델 input 축약은 미측정 |
| cache 활용 | Deep Agents 동일 prefix 재사용 가능성, OpenCode ETag는 **HTTP cache**이지 LLM prompt cache가 아님 |
| session/handoff / durable state | Deep Agents SQLite delta fastpath·writer fence, OpenCode CAS media, Open SWE ThreadStore |
| model routing / token-cost | OpenCode Responses routing fields·model catalog ETag; provider별 실제 USD/품질 개선 실측 없음 |
| evidence verification / task lifecycle | Open SWE candidate membership source SHA 검증 및 signed wake reconciliation |

## 16. 출처·판정 주의·게시 계약

1차 자료는 위 GitHub 공식 repo의 병합 커밋·해당 patch·테스트 경로 및 공식 release API다. 제작자 측 벤치마크와 스펙의 **사후 미측정 추정**을 구분한다. PR 요약이나 GitHub commit 메시지는 작성자의 설명이며 이 보고서에서 실제 성능 테스트를 직접 재실행하지 않았다.

이번 날짜별 자동 수집 보고서의 **유일한 canonical 경로**는 `jaywapp/wiki` / `develop` / `ai/trend/ai-harness-token-scout-2026-10-26.md`이다. `ai/news/`, `ai/tools/`, `ai/harness/`, `ai/research/`, `ai/tips/`에는 동명의 날짜별 사본을 만들지 않는다. 최종 게시 성공은 **GitHub Contents API 쓰기 응답이 아닌 develop 전체 원문 read-back 일치**로 별도 판정하며, 본문 작성 시점에 미리 성공 선언하지 않는다.
