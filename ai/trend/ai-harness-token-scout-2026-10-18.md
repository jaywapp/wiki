---
title: "AI Harness · Context/Token Optimization Scout — 2026-10-18"
date: 2026-10-18
category: trend
tags: [ai-harness, coding-agent, context-engineering, tool-schema, mcp, evidence, perforce, durable-state, runtime-adapter, token-optimization]
---

# 2026-10-18 AI Harness · Context/Token Optimization Scout

> 조사 마감: 2026-10-18 약 06:00 KST(2026-10-17 약 21:00 UTC). 주 조사 기간은 2026-10-16 21:00~2026-10-17 21:00 UTC. GitHub의 커밋 설명·코드 차분·변경된 테스트·공식 릴리스 정보를 직접 확인했다. 아직 내부 벤치마크를 실행하지 않았으므로 토큰·비용 절감 수치를 임의로 주장하지 않는다.

## 조사 범위 및 중복 제거

GitHub 원본 기준으로 `openai/codex`, `langchain-ai/open-swe`, `langchain-ai/deepagents`, `anthropics/claude-code`를 검토했다. `jaywapp/wiki`의 `develop/ai/trend/` 디렉터리를 GitHub API로 실제 조회한 결과, 해당 브랜치에서 확인된 가장 최근 canonical 날짜별 Scout는 2026-10-03이다. 직전 보고서(10월 17일까지)에서 다룬 Claude Code 2.1.302, Codex의 환경 간 파일 복사 및 Hook content hash, Guardian evidence provenance, Open SWE Managed Runtime 전환, Deep Agents의 async child 알림 및 0.7.28 등은 신규 항목에서 제외했다.

**핵심: 이번 기간에 재현 가능한 독립적인 신규 '모델 토큰 절감률'은 확인하지 못했다.** 유의미한 구현 업데이트는 Evidence/Context 타입, MCP Tool 연결 출처, 검색 경로 정합성, Transport 압축, Review revision cache 및 Trace 품질에 집중돼 있다. 전송 바이트 절감·서버 메모리 감소를 모델 토큰 절감으로 계산하지 않는다.

## 선별 결과

| 항목 | 신규성 | 영향 | 도입 판단 |
|---|---|---|---|
| Codex #54776 | ContentItem 기반 Context Fragment, media/role/attribution 보존 | Evidence fidelity, 품질·재검색 비용 | **PoC** |
| Open SWE #3747 | MCP 연결 출처(user/workspace/instance/managed)와 override 표시 | 도구 선택·권한 근거 가시화 | **바로 적용** |
| Deep Agents #7028 | CompositeBackend 검색 경로 prefix 복원 버그 수정 | Search→Read 정합성 | **바로 적용** |
| Open SWE #4182 | Review highlight cache를 base/head SHA별 격리 | 오래된 Evidence 재사용 예방 | **바로 적용** |
| Codex #54930 | WebSocket zstd stream 협상 압축 | 네트워크 바이트 절감 가능, **모델 토큰과 무관** | **PoC** |
| Open SWE #4179 | Code Mode `eval` 호출의 모델 작성 실행 목적 라벨 | Trace 가독성 향상, 약간의 토큰 증가 가능 | **PoC** |
| Open SWE #4199 | 대기열 메트릭 실패 시 `get_thread` 전체 실패 방지 | Durable task 가용성 | **바로 적용** |
| Codex #54754 | Tool JSON Schema의 Rust heap 저장 공간 축소 | 프로세스 메모리, serialized schema 크기 불변 | **아이디어 참고** |
| Deep Agents Code 0.1.86 / #6999 | NVIDIA OpenShell Sandbox Provider | Runtime Adapter 확대(전일 누락 보강) | **제한적 PoC** |

## 1. Codex #54776 — Typed Context Fragment, 의미와 출처 보존

**날짜:** 2026-10-17 04:02 UTC. 이전의 Guardian provenance 보존과는 다르게 `context-fragments` 구현에서 Context fragment body가 반환하는 데이터 타입 자체가 String에서 `ContentItem`으로 확장됐다.

**구현:** `codex-rs/context-fragments/src/fragment.rs`, `annotated_content.rs`, `additional_context.rs` 및 연계 Code Mode conversion. 텍스트에만 start/end marker를 적용하고 이미지·오디오는 원래 ContentItem으로 취급한다. ContentItemKind와 Metadata(제작자·출처)를 보존한다. 비텍스트 world-state fragment의 fingerprint는 직렬화한 내용과 role을 이용한다. 업스트림은 InputText, OutputText, file-backed/inline image, audio의 변환과 attribution을 테스트했다.

**토큰 원리 및 trade-off:** 토큰 압축은 아니다. 멀티모달 Evidence를 강제로 문자열화하면서 발생하는 오류와 그로 인한 재조회·재시도를 줄일 가능성이 있다. 반대로 실제 이미지·오디오 payload가 늘면 비용·Context도 커질 수 있다.

**Perforce 적용 아이디어:** `EvidenceEnvelope = {content_type, producer_role, origin_tool, p4_client, CL_or_revision, artifact_uri, sha256, bounded_text_projection}`. Task/Reviewer에게는 짧은 projection과 참조만 전달하고 승인 전에 원본 hash를 다시 검증한다. **재현:** 이미지 기반 UI 실패, 빌드 로그, 텍스트 diff 세 종류를 summarize→compaction→resume→review한 뒤 provenance 유지율·중요 근거 누락률·총 모델 토큰을 A/B 비교한다.

**평가: PoC.** 정합성 목적, 정량 절감 미검증.

원본: https://github.com/openai/codex/commit/ce0323f2f2d3b25e82806cd555237da3db4e1897

## 2. Open SWE #3747 — MCP 연결의 안전한 출처 메타데이터

**날짜:** 2026-10-17 03:36 UTC.

**구현:** `openswe/mcp/models.py`, `runtime.py`, `records.py`, `managed.py`, `resources/prompts/tools/mcp-provenance.md.jinja`; `tests/mcp/`, `tests/reviewer/` 테스트. `MCPScope = instance | workspace | user | managed`, `MCPToolProvenance = {connection_name, scope, overridden_scopes}`를 정의하고 Tool discovery/catalog 및 Runtime Tool metadata로 전달한다. 모델은 특정 Tool이 개인 연결을 이용하는지, workspace보다 우선하는지 알 수 있다. Credential 자체는 노출하지 않으며 실제 인증·권한·우선순위는 변경하지 않는다.

**토큰 원리 및 trade-off:** 직접 절감은 없다. 잘못된 MCP 연결 호출·재승인·반복 탐색을 예방할 수 있지만, 모든 Tool schema에 긴 metadata를 반복하면 Prompt Prefix 비용이 증가한다. 최소한의 이름과 scope만 model-visible로 내보내고 실제 credential reference는 서버에서 보존하는 것이 좋다.

**Perforce 적용:** P4/TeamCity/GitHub Connector discovery에서 `tool_id, connection_scope, effective_identity, overridden_scopes, policy_generation, credential_ref(비공개)`를 관리한다. Model-visible 정보와 authoritative execution identity를 반드시 분리한다. **재현:** 동일한 Tool 이름으로 user/workspace/instance 연결을 각각 만든 뒤 선택 precedence, 감사 로그, 비밀정보 비노출, 권한 오류 재시도 횟수를 측정한다.

**평가: 바로 적용.** Tool trust boundary를 구체화한 구현.

원본: https://github.com/langchain-ai/open-swe/commit/d177a79fbdd33f5f695bbdb38f611f9851b7ed74

## 3. Deep Agents #7028 — CompositeBackend 검색 경로를 그대로 읽을 수 있게

**날짜:** 2026-10-17 20:44 UTC. 안정 릴리스 포함 여부는 별도 추적이 필요하다.

**구현:** `libs/deepagents/deepagents/backends/composite.py`에서 `route_prefix[:-1]`을 `route_prefix.rstrip('/')`으로 교체했다. `ls`, `glob`, `grep`이 반환하는 path가 경로 prefix에 후행 슬래시가 있거나 없어도 완전한 가상 경로(`/memories/note.md`)를 유지한다. `libs/deepagents/tests/unit_tests/backends/test_composite_backend.py`의 `test_search_results_preserve_route_prefix`는 `ls`, 2종 glob, 2종 grep 결과와 후속 read 성공을 검증한다.

**토큰 원리:** 직접적인 모델 토큰 절감 수치 없음. 검색 결과가 올바른데 후속 read가 경로 훼손 때문에 실패하는 경우 반복 검색·추론·모델 호출이 발생한다. 이 품질 손실을 줄인다.

**Perforce 적용:** `depot://`, `p4workspace://`, `build://`, `evidence://`의 Virtual Path Resolver에 `search result path === readable path` 계약 테스트를 도입한다. 접두사(`/` 유무), Stream 매핑, 파일명 대소문자, Symlink, CL revision과 ACL까지 조합한다. 결과 0건과 범위 미완료는 구별한다.

**평가: 바로 적용.** selective retrieval/RAG의 검색 경로 정합성.

원본: https://github.com/langchain-ai/deepagents/commit/0ce837bf69ff0efb10c2fa100039cc0c78a74a11

## 4. Open SWE #4182 — Review Diff 캐시를 Revision으로 격리

**날짜:** 2026-10-16 21:30 UTC. 직전 Scout 범위 마감 직후 반영.

**구현:** `ui/src/features/reviews/page/diffEntries.ts`. 기존에는 같은 경로라는 이유로 다른 PR/Revision의 하이라이트 캐시를 공유할 수 있었다. 새 키는 `baseSha:headSha:path:whole`로, 서로 다른 base/head Revision의 결과를 분리한다. 커밋에는 GitHub E2E fixture를 활용한 비교 설명이 있다.

**효과와 trade-off:** Model Token에는 직접 영향 없음. Evidence stale/review diff 잘못된 줄/하이라이트 렌더러 오류를 차단한다. Revision별 캐시가 늘어날 수 있으므로 수명·삭제 정책이 필요하다.

**Perforce 적용:** `ReviewEvidenceKey = depot_path + base_rev + target_rev + CL_or_shelf_generation + content_hash`. 같은 경로여도 CL, Shelf 또는 have-list가 바뀌면 Review Evidence를 재검증한다. **재현:** 같은 파일명에 대한 CL A/B 수정본을 번갈아 표시하며 hunk hash와 표시 줄이 실제 Revision에 일치하는지 확인한다.

**평가: 바로 적용.** 승인·Evidence Verification의 기본 계약.

원본: https://github.com/langchain-ai/open-swe/commit/237328ee13e9562804086c13a30f781b1129b68c

## 5. Codex #54930 — App-server WebSocket zstd 협상형 압축

**날짜:** 2026-10-17 20:54 UTC. 오늘 조사 말미 반영.

**구현:** `codex-rs/app-server-transport/src/websocket_compression.rs`, `transport/websocket.rs`, `transport/unix_socket.rs`, `transport/websocket_compression_tests.rs`, `websocket_compression_tests.rs`. `x-codex-app-server-compression: zstd-stream-v1`을 협상하면 WebSocket JSON 메시지를 Binary Frame으로 전달한다. 방향별로 독립된 zstd stream을 유지한다. 협상하지 않은 peer는 기존 Text JSON을 사용한다. 압축 해제된 메시지는 64 MiB, window는 1 MiB로 제한한다. 여러 메시지 연속 처리, legacy fallback, malformed frame과 TCP/로컬 roundtrip 회귀 테스트가 포함됐다.

**토큰 원리:** **LLM 토큰 절감은 직접적으로 없다.** 절감 대상은 Network wire bytes이며 압축·복호화 CPU 비용을 추가한다. 프롬프트 Cache Hit이나 Token Cost에 대한 수치로 인용하면 안 된다.

**Perforce 적용:** TeamCity ↔ Orchestrator / Remote Runtime에서 대량 Event가 흐르는 구간에 A/B. 지표는 `uncompressed_bytes, wire_bytes, compress_cpu_ms, reconnect_errors, p95_latency, verified_task_cost`를 구분한다. LAN에서 이점이 적으면 적용 가치 낮음.

**평가: PoC(원격 Runtime에 한정).**

원본: https://github.com/openai/codex/commit/8d9f6466ff0294785d56f55b1fe363d132fe4133

## 6. Open SWE #4179 — Code Mode eval 작업 설명 라벨

**날짜:** 2026-10-16 22:57 UTC.

**구현:** `mda/rt/middleware.py`, `mda/agent.py`, `openswe/remote_runtime/graph.py`, `openswe/resources/prompts/tools/display-description.md`, `tests/e2e/fake_llm.py`. `DescribedToolsMiddleware`가 지정한 Tool(현 구현은 `eval`)에 `display_description` 인자를 요구하고, 실행 전에 인자에서 제거한다. 호출 transcript에는 라벨을 보존해 사용자에게 `eval` 같은 단순 Tool 이름 대신 무엇을 확인 중인지 보여준다. MDA Code Mode 내부에서 Schema를 변경해 실제 노출 Tool과 정합성을 맞춘다.

**토큰 원리 및 단점:** Schema 확장과 매 호출의 설명 문구로 토큰은 오히려 증가할 수 있다. 그러나 운영자가 멈춘 작업, 잘못 실행된 Tool, 검증 경로를 더 빠르게 파악할 수 있다. 설명은 모델 생성 텍스트이므로 권한 증거로 사용하면 안 된다.

**Perforce 적용:** `p4 describe`, `p4 shelve`, TeamCity Build Tool 실행마다 짧은 목적 라벨과 실제 Tool Input/Receipt를 쌍으로 저장한다. **PoC:** 20건의 실패 이력에서 운영자 원인 파악 시간, 추가 토큰, 라벨-실제 실행 불일치율을 비교.

**평가: PoC(관측성 목적).**

원본: https://github.com/langchain-ai/open-swe/commit/46aa2f197ec4c605724b276d3788e6e58afd7c89

## 7. Open SWE #4199 — Thread 조회의 보조 메트릭 장애 격리

**날짜:** 2026-10-17 15:15 UTC.

**구현:** `openswe/tools/threads.py`의 `_queued_message_count`. 대기 메시지 수 조회 실패 시 0으로 fallback하도록 작성됐으나, 오류 로그에서 예약된 Python `LogRecord.thread` 필드를 `extra`에 사용해 KeyError를 일으키면서 `get_thread` 전체가 실패했다. `thread`를 `thread_id`로 교체해 회피했다.

**토큰/품질:** 모델 호출 시 불필요한 재조회·재시도를 예방할 가능성은 있으나 계측 수치 없음. 중요한 것은 Task의 authoritative state 조회와 부가 QueueDepth의 장애를 분리하는 것. 0으로 fallback했다는 사실은 degraded/unknown을 통해 나타내는 편이 더 정확하다.

**Perforce 적용:** QueueDepth, pending-review count 같은 부가 조회에 실패해도 Task/CL 상태는 제공하고, degraded flag를 둔다. 예약된 structured logging key 회귀 테스트를 추가한다.

**평가: 바로 적용.**

원본: https://github.com/langchain-ai/open-swe/commit/d4efde8a18263bd4f65bda1f532b37776a9a0f52

## 8. Codex #54754 — JSON Schema 객체 메모리 경량화

**날짜:** 2026-10-17 01:08 UTC.

**구현:** `codex-rs/tools/src/json_schema/types.rs`, `tool_search.rs`, `json_schema_tests.rs`. JsonSchema의 문자열·배열을 boxed 타입으로, 선택적 map을 boxed map으로 저장한다. 완성 이후 확장되지 않는 데이터가 불필요하게 spare capacity를 보유하지 않게 한다. **Wire에 직렬화되는 JSON Schema는 변경하지 않는다고 커밋이 명시한다.**

**토큰 영향:** **없음(직접).** Tool별 JSON schema 토큰 크기는 그대로다. Tool Catalog가 큰 상주 프로세스의 heap footprint를 줄일 가능성은 있으나 RSS·비용 측정이 없다. 모델 입력 토큰 최적화 사례로 분류하면 안 된다.

**평가: 아이디어 참고.** Tool Schema 메모리 사용량이 병목인 경우에만 A/B.

원본: https://github.com/openai/codex/commit/e16b631d08cdf82773831f9bbfb793da687d5299

## 9. Deep Agents Code 0.1.86 — OpenShell Sandbox Provider 보강

**시점:** 구현 #6999는 2026-10-16 19:29 UTC, 공식 `deepagents-code==0.1.86`은 2026-10-16 21:20 UTC. 전일 Scout에 빠진 Runtime Adapter 확장이어서 누락 보강으로 추가했다.

**구현:** `libs/code/deepagents_code/integrations/sandbox_factory.py`, `sandbox_registry.py`, `main.py`, `libs/code/tests/unit_tests/test_sandbox_factory.py`. 기존 OpenShell backend는 이미 시작된 Sandbox를 감싸는 역할이었지만, 새 `_OpenShellProvider`는 Sandbox 생성·접속·정리 Lifecycle을 관리한다. `openshell` extra 설치 및 `--sandbox openshell` 방식이다.

**토큰·비용 trade-off:** 직접적인 토큰 절감 없음. Perforce Workspace/CL의 소유권을 중앙에 남긴 채 Model Runtime/Sandbox만 교체하는 인터페이스 참조 사례로 가치가 있다. Startup latency, credential boundary, cleanup 및 license 제약 검증이 필요하다.

**평가: 제한적 PoC.** 현 Perforce Runner를 곧바로 대체할 근거는 없다.

원본: https://github.com/langchain-ai/deepagents/commit/84d4b146cdc3ab45e3e0b9c79c972690ad814ab1  
릴리스: https://github.com/langchain-ai/deepagents/releases/tag/deepagents-code%3D%3D0.1.86

## Perforce·Claude Code·Codex Harness 적용 계약

| Durable Record | 필드 | 적용 목적 |
|---|---|---|
| TaskLedger | task/turn/run id, phase, owner, runtime_generation, event_sequence, terminal/interrupt 상태 | Resume/Handoff 및 중복 실행 차단 |
| WorkspaceLease | p4_client, stream, have-list generation, CL/shelf, owner/expiry | Runner 변경 시 Workspace 소유권 검증 |
| EvidenceRef | producer role, Tool ID, media type, base/head revision, sha256, original URI, model-visible projection | Compaction 후 원본 Evidence 복원 |
| ToolCapability | Tool ID, scope/identity, schema hash, permission generation, override scopes | MCP discovery와 권한 실제 실행의 분리 |
| CostReceipt | model/provider, attempted vs successful tokens, cache creation/read, retry, child cost, USD | 비용 관측과 Context 상태 분리 |
| RuntimeAdapter | spawn/cancel/recover, event stream, capability generation, artifact transfer | Claude Code/Codex/기타 Sandbox 교체 |

**A/B 측정 설계:** 과거 CL 20~30건을 난도·미디어 유형·빌드 실패·Resume 포함으로 고정한다. Search→Read 성공률, evidence origin 정확도, stale review 0건, authority mismatch 0건, verified-task completion, 총 모델 토큰·캐시 히트·청구 USD·p95 latency·runtime CPU/RAM·네트워크 바이트를 **각각** 측정한다. 1회 성공만으로 도입하지 않으며 중요 결함 탐지율 저하가 확인되면 토큰이 줄어도 채택하지 않는다.

## 추적 항목별 결론

- **Coding-agent workflow / orchestration / durable state:** #4199의 degraded-read, #4182의 Revision-aware Evidence와 #3747의 provenance를 추가 계약으로 채택할 수 있다.
- **Skills / hooks / progressive disclosure:** 이번 24시간 구간에 신규로 입증된 절감 벤치마크는 없음. 10월 초부터 추적한 Skill Tool lazy disclosure는 중복 보고하지 않았다.
- **Context pruning / compaction / handoff:** #54776은 내용 타입·귀속 보존의 중요성에 관한 새 구현이며 직접적인 압축 기법은 아니다.
- **Subagent isolation / cache / model routing:** 전일 보고된 Fork/context/cost 변경을 제외하면 오늘 새 정량 결과는 없음.
- **Selective RAG / Search:** #7028의 Virtual Path 수정이 읽기 성공률에 직접 연결된다.
- **Tool Output 축약:** #54930은 Transport 압축이지 Model Context 축약이 아니다.
- **Token/Cost 측정:** 신규 실측 절감률 확인 안 됨. 실험 시 총비용과 verified task 당 품질을 함께 보라.
- **Runtime adapter:** OpenShell Provider 누락 보강.

## 검증 범위와 Wiki 상태

본 문서는 업스트림 소스/커밋/테스트의 **정적 검토 결과**로, 로컬에서 upstream 전체 테스트 또는 Perforce 실환경 A/B를 수행한 결과가 아니다. 2026-10-18의 canonical 목표 경로는 `jaywapp/wiki` → `develop` → `ai/trend/ai-harness-token-scout-2026-10-18.md`이다. 해당 경로 외의 `ai/news/`, `ai/tools/`, `ai/harness/`, `ai/research/`, `ai/tips/`에는 날짜별 보고서를 생성하지 않는다.

이 실행에서는 GitHub `create_file` 요청이 안전성 검사에 의해 차단됐다. **실제 Wiki 반영 실패.** 안전 검사를 우회하지 않았으며 해당 경로에서 파일을 다시 읽어 최종 상태를 별도로 확인해야 한다. 다운로드 가능한 로컬 백업 파일은 `ai-harness-token-scout-2026-10-18.md`이다.