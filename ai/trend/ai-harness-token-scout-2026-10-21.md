---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-21"
date: 2026-10-21
category: trend
tags: [ai-harness, coding-agent, token-optimization, context-engineering, claude-code, codex, deepagents, open-swe, perforce, durable-state]
---

# AI Harness · Context/Token Optimization Scout — 2026-10-21

> 조사 기준: 2026-10-21 오전 KST. 신규 변경은 주로 2026-10-19~20 UTC 병합 커밋이며, 원본 GitHub 코드/테스트와 Claude Code 공식 릴리스에 근거한다. 토큰 절감 *측정치*와 기대 효익을 명확히 구분한다.

## 기존 보고 대비 중복 점검

`jaywapp/wiki`의 `develop`에서 9월 말 및 10/01, 10/02, 10/04, 10/05, 10/06, 10/08 Scout의 존재·내용을 확인했다. 기존 10/14 조사에서 이미 다룬 Codex Capability Inventory V2, speculative compaction, incomplete-response usage, Open SWE async checkpoint, Deep Agents Skill pin 등의 일반 설명은 되풀이하지 않았다. **단, develop에 10/09~20 날짜별 canonical 보고서가 없어 그 구간과의 완전한 자동 중복 비교는 불가능했다.** 아래 선정 항목은 최근 병합된 구체적 SHA에 집중한다.

| 항목 | 실질 변화 | 판정 |
|---|---|---|
| Codex PromptCacheKey #55587 | Session ID와 캐시 키 정책 분리 | **PoC** |
| Deep Agents idle compaction #6956 | 캐시 만료 직전 선택적 오프로드 | **PoC** |
| Open SWE search_tools #4217 | BM25 도구 검색, code mode 경유 실행 | **PoC** |
| Deep Agents document refs #7049 | 첨부 문서 prompt 자동 inline 제거 | **바로 적용 원칙** |
| Codex frozen skills #55631 | 재현 가능한 Skill snapshot/read | **PoC** |
| Codex Guardian #55395/#55391 | 중단 Review rollback과 evidence dedupe | **바로 적용 원칙** |
| Codex messages #55657 | publication과 consumption lifecycle 분리 | **PoC** |
| Open SWE MDA #4264/#4270 | sandbox 소유권과 안전한 503 재시도 구분 | **PoC/바로 적용** |
| Codex compressed search #55652 | 압축된 세션 기록 최대 4개 병렬 검색 | **PoC** |
| Deep Agents output #7074 / Codex timing #55653 | UTF-8 바이트 상한과 결과 버퍼 체류시간 | **바로 적용/PoC** |
| Claude Code 2.1.304~305 | Skill/ToolSearch/compaction/journal 회귀 수정 | **바로 적용 검증** |
| Deep Agents resume #7011 | headless thread를 정확히 이어서 실행 | **PoC** |

## 1. Codex: PromptCacheKey를 Session ID에서 분리

**신규성·내부 동작.** 10/20 [#55587](https://github.com/openai/codex/commit/ab6095dde0040bb8cdf8592acb89c344e5f27a56)는 `StartThreadOptions`의 `PromptCacheKey`에 세 정책(기본 session 파생 key / custom key / omit)을 추가했다. Session·thread identity header는 별도이며, child agent·delegation·Guardian review에 정책을 상속한다. 복구한 thread에 대해서는 host가 동일 정책을 다시 적용해야 한다. 구현: `codex-rs/core/src/thread_manager.rs`, `client.rs`, `core/tests/suite/prompt_cache_key.rs`.

**토큰 원리·품질 대가.** 여러 독립 thread가 정확히 같은 고정 prefix를 사용하는 경우 캐시 재사용 제어에 유리할 수 있다. 그러나 **키만 공유한다고 서로 다른 내용의 prefix가 hit되는 것은 아니다.** 보안·policy generation이 바뀌는데 키를 재사용하면 잘못된 범위의 공유가 발생할 위험이 있다. 확정 절감률 없음.

**Perforce 적용·판정.** `CacheIdentity(tenant,repo,stream,task_class,model,tool_schema_hash,skill_hash,policy_rev)`를 Runtime Adapter에 둔다. 실제 API 지원 범위 안에서 default/custom/omit 3-arm으로 cache read/write, total billed tokens, USD/verified task, prompt prefix mismatch를 비교한다. **PoC.**

## 2. Deep Agents Code: 캐시 만료 직전 자동 요약

**신규성·내부 동작.** 10/20 [#6956](https://github.com/langchain-ai/deepagents/commit/3698b146b7c2db6d15d42b2d77568f93e169f36a)은 기본 OFF인 idle compaction을 도입했다. `[history] idle_compaction_tokens = 100000` 또는 `DEEPAGENTS_CODE_IDLE_COMPACTION_TOKENS=100000`으로 활성화한다. 알려진 prompt cache window의 **마지막 20%, 최대 120초** 범위에서 기준 token 이상인 유휴 세션을 기존 `/offload`로 요약·아카이브한다. 5분 창은 60초다. 타이핑·진행 중·queued input·unknown cache window에서는 실행하지 않고 Escape 취소도 지원한다. 구현/테스트: `libs/code/deepagents_code/config_manifest.py`, `tests/unit_tests/test_idle_compaction.py`. 후속 [#7078](https://github.com/langchain-ai/deepagents/commit/215392aa3dfa08d21bc30a696b2347dcfbd44ebf)은 자동 작업에서 빈 offload 안내 메시지를 제거했다.

**효과·비용.** 큰 history가 캐시 만료 후 다시 전송되는 비용을 줄일 수 있지만 요약 자체도 토큰을 사용한다. 나중에 재개하지 않으면 선투입 비용만 남고, 요약이 근거를 놓치면 리뷰 품질이 하락한다. 실제 비용 절감량은 미공개다.

**Perforce 적용·판정.** `CompactionReceipt(before_tokens,summary_cost,after_tokens,cache_expiry,evidence_refs,ledger_cursor)`를 보존하고 P4 submit/review가 pending인 세션은 압축을 보류한다. OFF/idle/manual의 verified completion, critical evidence recall, 재개율별 순비용을 비교한다. **PoC.**

## 3. Open SWE: BM25 검색으로 도구를 고르고 Code Mode로 실행

**신규성·동작.** 10/20 [#4217](https://github.com/langchain-ai/open-swe/commit/c4768a014dc92942e0f4292616fde8437d6a58cf)은 sandbox의 HTTP `/list`, `/search`, `/invoke` 경로를 제거하고 code mode 도구 표면으로 합쳤다. `search_tools(query,limit)`가 동적 MCP까지 포함한 Tool의 이름·설명·파라미터명에 BM25를 적용해 상위 결과의 description, JSON schema, `code_name`을 반환한다. 모델은 `eval`의 `tools.<code_name>`으로 호출하고 worker coordination 등 일부 핵심 도구는 직접 노출한다. 코드/테스트: `openswe/tools/search_tools.py`, `tests/sandbox/test_thread_tools.py`. 기존 curl 도구 호출은 호환되지 않으며 background heartbeat 경로는 보존된다.

**효과·trade-off.** 모든 Tool schema를 최초 prompt에 넣는 대신 필요한 후보만 선택할 수 있다. 그러나 검색 호출도 token/latency를 쓰고 BM25 어휘 미스가 있다. 공급자의 기존 ToolSearch와 이중 비용이 되지 않게 비교해야 한다.

**Perforce 적용·판정.** P4 명령, UE 빌드/심볼 탐색, TeamCity API를 공통 registry로 관리한다. 모든 schema 노출 / 검색 상위 5개 / TaskClass whitelist의 3-arm에서 schema tokens, discovery p95, wrong-tool rate, permission fail, USD/verified task 측정. 검색 결과와 도구 권한은 독립 검증한다. **PoC.**

## 4. Deep Agents: 문서 첨부를 자동 inline하지 않는 지연 접근

**신규성.** 10/20 [#7049](https://github.com/langchain-ai/deepagents/commit/fc210741b2da06c93409100e0c92be3391db70a5)은 Slack·Discord·Telegram·WhatsApp 첨부 문서의 본문을 대화에 자동 넣지 않고 signed download reference 또는 로컬 파일 경로로 제공한다. 인증 다운로드를 모델 컨텍스트 밖에서 처리하며, 원격 runtime의 sandbox에는 실제 파일을 staging한 뒤 접근 가능한 경로만 표시한다. 크기·경로 containment·업로드 실패 확인이 있고 Slack은 여러 첨부 중 성공한 파일을 보존한다.

**원리·대가.** 대형 로그·문서 전체를 불필요하게 prompt에 넣지 않게 된다. 전송 bytes는 모델 tokens가 아니며 중요한 내용을 검색하지 못하면 반복 조회 비용이 증가한다.

**Perforce 적용·판정.** CL 관련 UE crash log·TeamCity artifact를 `ArtifactReference(uri,sha,size,auth_scope)`로 보존한다. 모델에 파일 메타데이터를 알리고, 검색→일부 줄 읽기→원본 SHA 검증을 거쳐 evidence만 전달한다. **바로 적용 원칙**, 원격 staging은 PoC.

## 5. Codex: immutable Cloud Skill Snapshot

**신규성.** 10/20 [#55631](https://github.com/openai/codex/commit/e776b27eb0422c3d10fba676c632ff08ffb4469b)은 app-server가 `--cloud-skills-snapshot PATH`로 Skill catalog·resource를 JSON에서 시작할 때 1회 로드하게 한다. `skills.list`/`skills.read`를 통해 제공하고 파일을 지운 뒤에도 같은 snapshot을 계속 사용한다. alias·visibility를 유지하며 누락·중복·패키지 경계·크기 오류는 기동 자체를 실패시킨다. live MCP와 cache는 분리한다.

**효과·한계.** Skill의 전체 본문 선공개 대신 목록과 필요할 때 read의 구조로 연결 가능하다. 이는 snapshot 안정성·재현성의 이점이지 JSON 파일을 로딩하는 행위 자체가 model token을 줄이는 것은 아니다. 오래된 Skill이 남을 위험이 있다.

**Perforce 적용·판정.** `SkillSnapshot(snapshot_sha,source_rev,policy_generation)`를 Task Ledger에 저장하고 필수 Skill이 누락되면 작업 시작 전에 fail-closed한다. Claude Code와 Codex의 서로 다른 Skill API를 Runtime Adapter로 조정한다. **PoC.**

## 6. Codex Guardian: Review rollback, evidence 중복 억제

**신규성.** 10/19 [#55395](https://github.com/openai/codex/commit/affa861ddf3525f4c7e0b6635eb7f26f95731c9e)은 취소/timeout으로 일부 증거만 수용한 Reviewer가 기존 세션을 그대로 재사용하지 않고 마지막 완료된 review checkpoint로 rollback하도록 했다. Pending evidence는 다음 review에 재전송되며 encrypted evidence가 정확히 한 번 들어가는지 검증한다. [#55391](https://github.com/openai/codex/commit/e64530972398604464a6aa0d1ace7b9399e9e942)은 history와 pending 내 native agent message를 ID로 dedupe하고 ID가 같은데 author/recipient/content가 다르면 거부한다. ID 없는 메시지는 버리지 않고 이미 저장된 복사본이 compaction으로 사라지면 다시 보낼 수 있다.

**효과·trade-off.** 동일 증거가 reviewer token budget을 잠식하는 일을 줄이고 누락 검토를 예방한다. Message hash만으로 다른 CL revision의 사건을 같은 것으로 취급하면 정확성이 나빠질 수 있다. 절감률 미공개.

**Perforce 적용·판정.** `ReviewAttempt(review_id,committed_cursor,pending_evidence,cl_revision)`과 각 evidence의 source SHA를 관리한다. Interrupted review를 재개할 때 과거 완료 상태로 복귀하고 pending을 검증하며 제출 승인에 CL revision fence를 적용한다. **바로 적용 원칙.**

## 7. Codex: inter-agent 메시지 publish와 consume의 구분

**신규성.** 10/20 [#55657](https://github.com/openai/codex/commit/66d0de9983e82b266e89ee29523324c9d08a5472)은 `MessageLifecycleContributor`와 `PendingAgentMessage`로 발행 단계에서 extension state를 캡처하고, 수신자의 history가 모델 sampling 이전에 실제 변경됐을 때 consume callback을 at-most-once 실행한다. Mailbox eviction 중에도 delivery state를 보존하고 abandoned message는 정리한다. 복원한 history를 다시 publish하지 않는다. 구현: `codex-rs/ext/extension-api/src/message_lifecycle.rs`, `core/src/agent_communication.rs`, `core/tests/suite/agent_mailbox.rs`. [#55644](https://github.com/openai/codex/commit/305db3808cf860ced585808ee4a191bb018a3b18)은 `wait_agent`/`clock.sleep` 이전에 도착한 steering injection도 다음 model call에 반영되게 한다.

**효과·적용.** 직접 token 최적화보다는 중복 handoff, 누락 재탐색, orphan task 예방 효과가 기대된다. `HandoffEnvelope(id,from,to,cl_revision,evidence_refs,published,consumed,committed)`를 durable state로 보존하고 eviction/kill/restart를 fault injection하여 loss/duplicate를 점검한다. **PoC**, 상태 전이 분리는 바로 적용할 원칙.

## 8. Open SWE: sandbox owner와 안전한 재시도 경계

**신규성.** 10/20 [#4264](https://github.com/langchain-ai/open-swe/commit/78ad1dbe9b1dbef03fdd32eee2304d8402ab6e2e)는 Managed Deep Agents가 thread별 sandbox의 이름·개설·채택·재시작·교체 책임을 갖고 backend는 보고받은 box를 바인딩하도록 했다. Worker는 coordinator와 box를 공유할 수 있으므로 thread isolation과 sandbox isolation은 같은 뜻이 아니다. 10/20 [#4270](https://github.com/langchain-ai/open-swe/commit/b4eb13d1937ef509223ef30e1ccb1331832eb912)은 rollout HTTP 503 때 catalog/prepare 및 안전한 모델 준비 phase만 재전송하며 **Tool 실행 요청은 자동 재전송하지 않는다**. 서버가 일을 수행한 다음 죽어도 gateway는 503을 보낼 수 있기 때문이다.

**Perforce 적용·판정.** RuntimeIdentity(runtime_id,thread_id,sandbox_owner,p4_client,lease_generation)를 별도 기록. P4 submit/resolve 및 TeamCity build trigger가 timeout/503이면 `outcome=unknown`으로 저장하고 authoritative 서버 조회로 결과를 확정하기 전 같은 작업을 재실행하지 않는다. Prepare/search는 bounded retry로 운영한다. **원칙 바로 적용, sandbox owner 구현 PoC.**

## 9. Rollout selective retrieval, UTF-8 output bound, latency tracing

**Codex [#55652](https://github.com/openai/codex/commit/801bd4d773ab374959344c36640ddbdec270ddb7):** 압축된 session rollout 경로를 최대 **4개 batch**로 병렬 검색하고 각 batch에서 패턴을 재사용한다. 7개 파일 중 손상 파일이 있어도 나머지 match snippet을 반환하도록 테스트했다. history에서 필요한 evidence만 model prompt로 가져오는 검색 속도를 개선할 수 있지만 **병렬 검색 자체가 token 절감은 아니다**. 압축 100/1000파일과 손상 파일 1%로 p95, recall, 최종 prompt bytes 측정. **PoC.**

**Deep Agents [#7074](https://github.com/langchain-ai/deepagents/commit/953d5dda8bd866663f49dfa0659a87c3f2cf0c26):** `LocalShellBackend`의 output 크기 제한을 문자 수가 아니라 UTF-8 **byte** 수로 강제한다. 한글·이모지 등 다바이트 텍스트에서 truncation 경계가 중요하다. **바로 적용.**

**Codex [#55653](https://github.com/openai/codex/commit/87f3c3284e1669b90ad9f4925039e9e3bc769b61):** `CodeModeCellTiming`, `result_buffered_for`가 결과 완료부터 host가 회수하기 전까지의 체류시간을 런타임/stdio/gRPC에 기록한다. 즉시 결과는 0, 아직 완료되지 않은 wait는 미측정이다. `codex-rs/code-mode-protocol/src/runtime.rs` 등이 근거다. Tool 소요시간과 결과 버퍼링 시간을 분리하여 지연 병목을 찾는다. **PoC.**

**Perforce 적용:** Raw UE/TeamCity 로그는 immutable artifact로 보존하고 모델에는 오류 위치 중심의 제한된 일부 줄, hash, evidence pointer만 전달한다. `ToolOutputReceipt(raw_bytes,retained_bytes,truncated,utf8_valid,evidence_range,artifact_hash)`를 도입하고 truncation 후 문제 원인 추출률을 측정한다.

## 10. Claude Code v2.1.304~305의 실제 context 비용 관련 회귀 수정

**공식 출처:** [v2.1.304](https://github.com/anthropics/claude-code/releases/tag/v2.1.304) (10/19 UTC), [v2.1.305](https://github.com/anthropics/claude-code/releases/tag/v2.1.305) (10/20 UTC).

- **2.1.304:** Compaction 후 Skill 목록을 새로 알려주되 `/reload-skills`는 새로운/변경된 Skill만 제공한다. Resume/cloud startup에서 전체 Skill 목록을 반복해서 보내던 버그를 수정. `/loop` 1시간 wakeup이 cache TTL 바로 뒤에 일어나 uncached history를 읽던 문제와 compacted headless session의 재개 지연을 보완했다. 대량의 auto mode classifier 상태를 session file에 반복 저장하던 문제도 축소했다. Fork subagent의 기본 활성 범위 변화는 full parent history prefix 복제 비용에 영향을 줄 수 있다.
- **2.1.305:** 2.1.304에서 일부 third-party gateway가 ToolSearch를 거부해 전체 요청이 실패한 회귀 수정. `modelOverrides` 대소문자/1M 표기 차이에도 `/effort`, `/autocompact`가 적용되게 수정. Compaction에서 오래된 메시지를 누락했을 때 알림. Workflow resume은 이미 완료된 `pipeline()`/`parallel()` agent를 재실행하지 않고 **run journal**의 결과를 사용한다. Subagent fallback model 이름·worktree cleanup도 개선.

**평가·검증:** 공식 릴리스에 수치화된 토큰 절감률은 없다. Claude Code/Bedrock/Vertex/custom gateway 조합에서 버전별 Skill 재주입 횟수, prefix bytes, cache hit, journal replay, interrupt 후 evidence recall을 측정한다. **바로 적용 검증**(검증 전 자동 업그레이드 금지).

## 11. Deep Agents Code: noninteractive thread resume

10/20 [#7011](https://github.com/langchain-ai/deepagents/commit/a2f88434c5a4b5ce5244c468bb9f69b27831842d)은 `dcode -r <thread-id> -n "..."`를 통해 **비대화형으로 생성한** thread의 history, agent, 마지막 model을 재개하게 했다. 이전에는 `-r` 옵션이 조용히 무시되고 새 세션을 만들 수 있었다. 잘못된 디렉터리·호환되지 않는 옵션은 명시적으로 실패하며, Quiet 실행은 thread ID를 stderr로 남긴다. Interactive thread는 이 headless resume 대상이 아니다. 기존 history를 또 전송하면 token이 늘 수도 있으므로 TaskResumeToken과 cache/compaction ledger의 연동이 필요하다. **PoC.**

## 12. 이번 주 Perforce harness 실험 계획과 판정 기준

1. **즉시 적용 원칙:** Write side effect(P4 submit/resolve, TeamCity build)에 대한 unknown-outcome receipt와 재조회, Reviewer evidence exactly-once, UTF-8 byte output cap, immutable Tool artifact + bounded evidence snippet.
2. **우선 PoC:** ToolRegistry(BM25 top-5 vs 전체 schema), Skill snapshot, cache-key default/custom/omit, idle compaction OFF/ON/manual.
3. **후속 PoC:** Guardian rollback/eviction/resume, worker sandbox owner, headless thread resume, 병렬 compressed-rollout search.

비교 단위는 동일 입력을 가진 **30개 이상 CL/task**이며 결과는 input/output/cache read/cache write, 비용/검증 완료 task, first-token 및 p95 latency, wrong-tool, tool-output retain bytes, critical-evidence recall, double-side-effect 0건 여부로 본다. Task Ledger는 `(task_id,goal_rev,cl_rev,p4_client,runtime_generation,skill_snapshot,cache_policy,evidence_cursor,handoff_state,mutation_receipt)`를 유지한다. Compaction 요약·검토 답변은 원본 Server/파일 SHA를 다시 확인할 때만 유효하다.

**오늘은 동일 조건으로 재현된 신규 model routing 비용 수치, RAG 정량 비교, Skill 파일 경량화의 verified token 절감률이 확인되지 않았다.** 운영 파라미터의 `20%/120초/100K/4 batch`는 측정된 절감률이 아니다. [Codex compaction 버그 신고 #54584](https://github.com/openai/codex/issues/54584)는 오래된 assistant 메시지가 요약으로 사용될 수 있음을 제기하지만 수정 확정 근거가 아니므로 관찰 항목으로만 둔다.

## Wiki 반영 검증 상태

기준 경로는 `jaywapp/wiki`의 `develop`: `ai/trend/ai-harness-token-scout-2026-10-21.md`. GitHub 커넥터를 이용한 직접 생성이 안전 확인 단계에서 차단돼 **실제 원격 반영은 실패**했다. 이 파일은 원본 Markdown 로컬 백업이며 GitHub에 게시된 것으로 간주하지 않는다. 전날까지의 자동 수집 리포트 누락은 별도 복구 문제로 남는다.