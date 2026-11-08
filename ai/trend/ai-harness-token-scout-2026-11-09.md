---
title: "AI Harness · Context/Token Optimization Scout — 2026-11-09"
category: trend
tags: [ai-harness, coding-agent, orchestration, context-engineering, token-optimization, mcp, skills, hooks, progressive-disclosure, selective-context, multimodal, compaction, prompt-cache, subagents, durable-state, runtime-adapter, evidence-verification, session-handoff, task-lifecycle, model-routing, cost-accounting, perforce, claude-code, codex]
source:
  - https://github.com/anomalyco/opencode/pull/62176
  - https://github.com/anomalyco/opencode/pull/62270
  - https://github.com/anomalyco/opencode/pull/61254
  - https://github.com/anomalyco/opencode/pull/62702
  - https://github.com/anomalyco/opencode/pull/62672
  - https://github.com/anomalyco/opencode/pull/62734
  - https://github.com/anomalyco/opencode/pull/62774
  - https://github.com/openai/codex/pull/60188
  - https://github.com/openai/codex/pull/60190
  - https://github.com/openai/codex/pull/60280
  - https://github.com/openai/codex/pull/60286
  - https://github.com/openai/codex/issues/60199
  - https://github.com/anomalyco/opencode/releases/tag/v2.2.6
  - https://github.com/anthropics/claude-code/releases/tag/v2.1.319
updated: 2026-11-09
---

# AI Harness · Context/Token Optimization Scout — 2026-11-09

> **조사 시점:** 2026-11-09 오전 약 06:00 KST(11/08 약 21:00 UTC). 핵심 기준은 2026-11-08 UTC에 병합된 PR과 해당 시각까지 확인 가능한 공식 릴리스다. 단순 작성·업데이트 날짜가 아니라 GitHub REST의 merged_at, release published_at을 대조했다. **본 보고서의 성능 및 품질 수치는 업스트림 PR 작성자 측정**이며 사내 Perforce/Claude Code/Codex에서 독립 재현한 데이터가 아니다.

## 0. 전일 대비 결론, 조사 범위, 중복 제거

이번 날짜에는 **의미 있는 신규 변경이 있다.** 가장 직접적인 비용/Context 성과는 OpenCode Code Mode Tool Catalog의 업데이트 Token을 11,255→1,918개로 줄인 구현이다. 그 외 **이미지 History가 모델의 토큰 예산 계산을 우회해 Request Body만 폭증하는 문제**, **MCP 서버에서는 실행에 성공했지만 반환 Schema 오류 때문에 에이전트가 실패로 오인하는 문제**, **Skill/Instruction 서버가 장애 나도 중앙 보안 Policy를 잃지 않는 캐시 격리**, **Agent Tree 식별과 Remote MCP 연결 시 시작 상태 정합성**이 새로 확인됐다.

전일 [11/08](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-08.md), [11/07](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-07.md), [11/06](https://github.com/jaywapp/wiki/blob/develop/ai/trend/ai-harness-token-scout-2026-11-06.md)을 develop에서 직접 읽었다. 11/08의 Codex #60157/#60163 Incremental Nested Tools, OpenCode #62459 Durable Tool, Guardian #59994~60002 Original Evidence, MCP Lazy Startup #60037~39, Strands Truncation #5792, Resume Trust Boundary #5922는 재수록하지 않았다. 오늘 #60188은 **기존 증분 Tool 기능에 모델별 문구 Override를 적용하는 후속 PR**이고 #62176은 **다른 프로젝트인 OpenCode에서 실제 증분 Catalog 변화량·품질을 측정한 개선**이므로 신규성 범위가 다르다. 11/06의 과거 대형 Text Tool Output과 달리 #62270은 **Base64 이미지 Byte Payload** 제어다.

### 우선순위 표

| 우선 | 신규 구현 / 원본 | 측정·제약 | 평가 |
|---|---|---|---|
| 1 | [OpenCode #62176](https://github.com/anomalyco/opencode/pull/62176): stable Code Mode Catalog Delta | Tool Update **11,255→1,918 token(−83%)**. 모델별 성능 편차 | **PoC 최우선** |
| 2 | [OpenCode #62270](https://github.com/anomalyco/opencode/pull/62270): 이미지 History 요청 Byte Budget | 25MiB 초과 시 15MiB까지 오래된 이미지 제외; 1.x backport | **바로 적용 원칙 / PoC** |
| 3 | [OpenCode #61254](https://github.com/anomalyco/opencode/pull/61254): MCP 반환 Schema 불일치로 인한 거짓 실패 수정 | Side Effect 성공 뒤 Agent 거짓 실패 예방; 출력 스키마 검증 완화의 위험 | **바로 적용 설계 원칙 / PoC** |
| 4 | [OpenCode #62702](https://github.com/anomalyco/opencode/pull/62702): Policy와 Skill/Instruction 캐시 장애 격리 | 503/비정상 JSON에도 정책 유지. 740개 테스트 통과 주장 | **바로 적용 원칙** |
| 5 | [Codex #60188](https://github.com/openai/codex/pull/60188): 모델별 증분 Exec Tool 안내 문구 | UTF-8 512바이트 필드별 상한; 실제 token 절감 미측정 | **PoC** |
| 6 | [Codex #60190](https://github.com/openai/codex/pull/60190): Agent Tree ID와 Environment Removal | Loaded Tree vs Persisted Thread 식별 분리 | **바로 적용 원칙** |
| 7 | [Codex #60280](https://github.com/openai/codex/pull/60280): Shared MCP Startup Tracking | 누락 알림·중복 진단·TUI 무한 Busy 방지 | **바로 적용 원칙** |
| 8 | [OpenCode #62734/#62774](https://github.com/anomalyco/opencode/pull/62734): Event-driven Session Wake | Source 정보와 비신뢰 이벤트 격리, 제한 시간 watch | **PoC** |
| 9 | [Codex #60286](https://github.com/openai/codex/pull/60286): 이전 Task 검색을 Cursor 기반으로 확장 | 오래된 History 접근 개선, 모델 Context 절감 직접 검증 없음 | **아이디어 참고** |
| 위험 신호 | [Codex #60199](https://github.com/openai/codex/issues/60199): Windows 장기 Compaction Rollout | 사용자 보고, 11.44GiB 세션 파일 사례; 미해결 여부 별도 확인 필요 | **모니터링/재현 PoC** |

**중요한 정량 구분:** Code Mode 업데이트 83% 절감은 **전체 Task Provider Bill 83% 절감이 아니다.** 아래의 34.7k→23.3k Input Token 변화도 특정 벤치마크에서만 확인됐다. MCP 시작 시간·이미지 Byte 수·DB 조회 지연·성공률과 LLM 과금은 각각 다른 지표다. **동일 품질의 Verified Task당 실제 청구 USD 감소율을 독립 확인한 신규 사례는 없다.**

## 1. OpenCode: Code Mode Catalog Delta 안정화 — #62176

**신규성/시점:** 2026-11-08 16:56:56 UTC에 dev 병합. 전일 Codex #60157/#60163의 Tool Delta 기능과 달리, OpenCode는 자체 Catalog 선택/차이 계산 방식을 바꾼 뒤 **여러 모델·실제 MCP Tool·모의 서버 평가를 함께 게시**했다. 파일: packages/core/src/codemode/catalog.ts, instructions.ts, tool.ts 및 catalog/instructions/session-runner 테스트. 실제 PR에는 세션 중 Namespace Arrival, Remove, Tool 변경, Compaction, Fork 검증도 포함된다.

**기존 병목:** 전체 2k 정도의 Tool Catalog 예산을 저렴한 서명 먼저 정렬하는 방식으로 채우면 새 MCP Server가 붙을 때 기존 Tool들의 표시 여부가 뒤바뀐다. 실제 Tool이 삭제·수정되지 않았어도 변경 공지에는 전체 Catalog(약 2.2k Token)를 반복 게시한다. 이 반복 메시지들은 History에 계속 남는다. 추가로 Catalog 재생성 때 모든 Tool Signature를 미리 렌더링해 CPU도 소모한다.

**구현:** Namespace를 Path 순서로 Round-robin해 한 번에 한 Tool씩 선정하고 실제 선택된 Signature(및 다음 검사 후보)만 Lazy Render한다. Namespace별 **모든 Tool Path**를 메타데이터로 남겨 '표시되지 않았던 Tool'과 '진짜 새 Tool'을 구분한다. 변경 알림은 추가된 Namespace/Tool, 변경된 Signature, 삭제된 Tool/Namespace만 나열하고 부분 Catalog 업데이트를 약 1,000 Token 이하로 제한한다. Pinned/Unpinned 또는 다른 Namespace 때문에 인라인 목록이 흔들린 것만으로는 알리지 않는다. 처음 Catalog가 부분 목록이 됐을 때만 'search로 숨겨진 Tool을 찾으라'는 안내를 한 번 전파한다. 빈 Catalog 진입/복원 또는 전체가 더 짧을 때만 전체 Catalog를 다시 표시한다.

**PR 작성자 측정:**

| 테스트 | 기존 dev | 패치 후 | 해석 |
|---|---:|---:|---|
| 동적 Server/Tool 변경 누적 Update Tokens | 11,255 | 1,918 | **약 83% 절감**, Task 전체 입력 아님 |
| codemode-novel 480 trials, 성공률 | 0.97 | 0.98 | 큰 차이는 아님 |
| codemode-novel, 평균 Input Tokens | 34.7k | 23.3k | **약 32.9% 감소**, 특정 평가 |
| codemode-novel, 평균 Steps | 4.43 | 3.34 | Tool Discovery 호출 감소 |
| codemode-novel, 평균 Seconds | 11.4 | 6.3 | **약 45% 감소**, 테스트 환경 |
| known-tool 256 trials, 성공률 | 0.86 | 0.84 | 품질 퇴보 가능성 |
| known-tool, 평균 Input Tokens | 53.3k | 57.1k | **약 7.1% 증가** |
| real MCP 11 tasks×9 models×2 repeats, 8모델 성공률 | 0.98 | 0.97 | 실서버에서 비용 차이 작음 |
| real MCP, 평균 Input Tokens | 42.3k | 41.3k | **약 2.4% 감소** |
| 중간 Server 도착 평가, Input Tokens | 36.2k | 24.5k | 약 32.3% 감소 |

핵심 Trade-off는 **약한 모델의 Search 실패**다. 실제 MCP 평가에서 gpt-5-nano는 **22회 중 7회 성공→2회 성공**으로 악화됐다고 작성자가 보고했다. 보이지 않는 GitHub Issue 조회 Tool을 탐색하지 않고 존재하지 않는 것으로 판단하는 사례다. 알파벳 앞부분의 Tool만 노출되는 구조의 편향과 Search 안내 준수율을 함께 측정해야 한다. Tool List가 이미 작으면 Catalog 부분 공개는 오히려 불필요한 단계가 될 수 있다.

**Perforce/Claude/Codex 적용:** P4 MCP, TeamCity, 내부 Web, GitHub, Slack 등 약 150개 Tool을 고정된 Name/Schema Hash 순서로 기록하되, 모델에게는 일상적인 10~20개만 먼저 알린다. Exec/Source Control 쓰기 권한을 Tool 노출과 혼동하지 않고 Runtime ACL에서 매 호출 확인한다. Unknown Tool의 Discovery 성공률, 모델별 Search 사용률을 계측한다. Tool Delta는 Session World State에 Catalog Generation과 Removal Tombstone을 저장하고 Compaction/Resume 때 최신 Snapshot으로 재생성한다. **판정: PoC 최우선**, 소형 모델에는 별도 Tool Discovery Prompt 또는 명시적 핵심 Tool Pinning이 필요하다.

## 2. OpenCode 1.x: Base64 이미지 History Byte Budget — #62270

**신규성/시점:** 2026-11-08 04:41:25 UTC 병합, 단 **base=v1**. 2.x의 기존 #39929/#56983 정책을 1.x에 Backport한 것이다. **새 알고리즘 발명이라기보다는 구버전의 운영상 심각한 결함을 막는 릴리스 계열 변경**으로 분류한다. 기존 11/06 Text Log 축약과 서로 다른 Bytes/Token 문제다.

**병목:** 이미지 Content를 매 모델 요청 시 Base64로 다시 붙이면 비싼 네트워크 Body가 누적된다. 이미지가 기존 Text Token 기반 Compaction 카운터에 충분히 반영되지 않는 구간에서 1M Context 모델의 요청 크기가 **100~200MB**가 될 수 있었다고 PR은 기술한다. 2026-11-05 Gateway로 들어온 64MB 초과 요청 29.4k건 중 1.x 발신 23.4k건, 2.x 발신 232건이라는 운영 관찰을 인용한다. 이는 **각 버전 전체 요청 대비 발생률이 아니며 원인/모델 분포가 통제된 A/B도 아니다.**

**구현:** packages/opencode/src/session/message-v2.ts의 toModelMessagesEffect에서 변환된 실제 ModelMessage 배열의 Inline Image Base64 Bytes를 별도로 센다. 총량이 **25MiB를 넘으면 가장 오래된 이미지부터 Placeholder로 교체해 15MiB 이하**까지 줄인다. 교체 경계는 새로운 이미지가 약 10MiB 더 추가될 때에만 움직이므로 Prompt Cache Prefix가 매 Turn 바뀌는 현상을 완화한다. User Image, File, Tool Result의 media/image-data/file-data, Tool Result 이미지를 Synthetic User Message로 옮기는 Provider 호환 경로까지 검사한다. 원격 이미지 URL은 이 Inline Byte 합계에 넣지 않는다. Error Classifier에는 'Request body too large', 'multimodal data size is too large'를 Overflow로 추가했다.

**비용·품질 Trade-off:** Request Byte, Gateway Memory, Provider 413/400, 실패 재시도 측면의 개선이 목표이며 **Token/정산액 감소량은 없다**. 오래된 이미지가 모델에서 사라지므로 장기 대화의 정확한 Visual Reference는 저하될 수 있다. Placeholder는 '이 이미지는 제거되어 더는 볼 수 없으므로 기억만으로 주장하지 말고 다시 조회하라'는 취지를 담는다. Cached Prompt가 끊기는 10MiB 경계 때 Input Cache Read와 Write 비용도 달라진다.

**P4/UE5 적용:** Visual QA Screenshots, Crash Stack Screenshot, Blueprint Diff 이미지를 원본 Artifact Store에 Hash/URI로 보존하고, 모델 요청에서는 25/15MiB 또는 더 보수적인 정책으로 오래된 Inline만 제외한다. P4 CL/Crash ID와 Artifact URI를 삭제 불가능한 Evidence Ledger에 유지한다. Provider별 image token 계산과 byte 측정을 분리하고, Image Reacquisition을 허용한다. **판정: 바로 적용 설계 원칙 / PoC**. OpenCode 2.x 사용 시 이미 포함된 기존 정책을 중복 구현하지 않는다.

## 3. MCP Output Schema 위반을 '작업 실패'로 오인하지 않기 — #61254

**신규성/시점:** 2026-11-08 06:40:55 UTC dev 병합. packages/core/src/mcp/client.ts, test/mcp.test.ts. PR은 Zoom MCP의 meeting_delete/meeting_update가 HTTP 204로 끝나서 실제로는 회의가 삭제됐는데, Output Schema의 structuredContent 미존재 때문에 SDK가 예외를 던지는 사례를 재현했다. 다른 Tool은 실제 반환된 Role이 서버 자체의 Enum 정의와 달라 SDK 검증에 실패했다.

**동작:** MCP Client가 SDK callTool에 전달하는 Definition에서 **outputSchema만 제거**하여 SDK의 Return Validation을 우회한다. Input Schema는 현대 MCP Param Header 생성 때문에 계속 전달한다. Catalog/Code Mode 측에 공개하는 Tool의 outputSchema는 남으므로 Tool 검색과 정적 타입 표현은 유지한다. Server 응답의 structuredContent가 없으면 Text/null로 이어지는 기존 Fallback을 사용한다. 실제 SDK Client 경로를 사용하는 Legacy/Modern Protocol 테스트를 추가했으며 82개 MCP 테스트 통과를 PR이 보고한다.

**핵심적 위험:** 출력 형식 검증을 전혀 하지 않으면 불량한 Server 응답을 그대로 신뢰할 수 있다. 이 변경을 **모든 출력 검증을 버려도 좋다**로 일반화하면 안 된다. 사내 Harness의 추천 방식은 Server Response를 (1) Transport/Execution ACK, (2) Structured Payload Validity, (3) External State Verification의 세 상태로 분리하는 것이다. **서버가 실행 완료를 보고했다면 출력 Parse 실패만으로 같은 Side Effect Tool을 재호출하지 않는다.** 대신 TeamCity Queue Status 또는 P4 CL 제출 상태를 서버에서 재조회하고, 검증이 불가능하면 '실행 결과 불명'으로 기록해 사람 승인에 넘긴다.

**Token/Cost:** 중복 Tool Retry를 줄일 수 있지만 실제 USD/Token 측정은 없다. 반대로 Reconcile에 조회 호출이 추가된다. **판정: 바로 적용 원칙 / PoC**, 특히 P4 Submit·Build Trigger·배포처럼 이중 실행이 위험한 경로에 최우선이다.

## 4. Skill·Instruction 장애가 보안 Policy를 없애지 않게 분리 — #62702 (+ #62672 주의)

**신규성/시점:** [#62672](https://github.com/anomalyco/opencode/pull/62672)는 11/08 00:30:41 UTC에 Instruction·Skill 목록의 HTTP 요청을 병렬화해 Startup 왕복 경로를 단축했으나, [#62702](https://github.com/anomalyco/opencode/pull/62702)는 같은 날 **06:31 UTC**에 구조를 추가 수정했다. **최종 병합 순서의 후속 구현인 #62702를 기준으로 채택**해야 한다.

**실패 원인:** 중앙 /api/v2/config 안에서 Instruction과 Skill List를 동시에 가져오도록 묶으면 목록만 503/Invalid JSON이어도 전체 Config가 실패해 **Policy Deny 자체가 유실**되거나 오래된 정책으로 고착될 수 있다. Tool/Skill Context 최적화가 Authorization을 침범한 사례다.

**수정:** Config(Policy 포함)와 Instructions, Skills를 **각기 독립 SharedCache Entry**로 분리한다. 503 또는 Schema Malformed일 때 Instruction/Skill은 마지막 정상 복사본을 유지하거나 초기라면 목록 없이 시작하지만, 보안 정책은 독립적으로 가져와 적용한다. 404와 비-SSO 403은 해당 목록 Empty로 처리한다. 새 회귀 테스트는 Config가 sudo deny를 반환하고 양 List가 503일 때에도 Policy가 적용되는지, 목록 정상화 뒤 반영되는지, 뒤이은 Invalid JSON이 이전 Instruction을 지우지 않는지 검증한다. 업스트림 설명에서 740 Pass/0 Fail이며 live 서버에서 독립 측정한 수치는 아니다. 목록 재시도 자체가 Startup을 지연시키는 한계는 남는다.

**Perforce Harness:** Policy Snapshot(tenant, role, expiry, generation, signature)과 Skill/Prompt Context Snapshot을 절대 같은 성공/실패 Transaction으로 묶지 않는다. 임시 Skill 다운 실패는 검색 품질 저하로 처리하되, **Policy 원본을 못 받았고 검증된 정상 Policy Snapshot도 없다면 위험한 쓰기 Tool은 Fail Closed**한다. ACL은 Tool Search 결과에 존재하는 것과 무관하게 Runtime에서 다시 확인한다. **판정: 바로 적용 원칙**, Token 절감률 없음. #62672의 병렬 Fetch 변경은 #62702로 최종 재배치돼 독립적인 신규 도입 성과로 집계하지 않는다.

## 5. Codex: 모델별 Incremental Exec Catalog 안내 문구 — #60188

**신규성/시점:** 11/08 **01:13:46 UTC** main 병합. 기존 #60157/#60163의 Nested Tool Delta 방식을 **모델별 안내 문구 Override**까지 확장했다. 파일: codex-rs/core/src/context/world_state/top_level_tools.rs, core/tests/suite/scenarios_exec_tools.rs, core/tests/suite/snapshots/...incremental_exec_tools_catalog_messages.snap, codex-rs/prompts/src/model_messages/incremental_tools.rs.

**동작:** model_messages.tools.incremental_tools에 exec_tools_update_hint, exec_tools_removed_definitions_header 두 문자열을 추가한다. 각 Override는 **UTF-8 기준 512바이트 이하**이며 누락/null/초과 길이는 Bundled Default로 안전하게 Fallback한다. **빈 문자열은 안내 문구를 생략하지만 변경된 Tool Definition 또는 Removal Key 자체는 그대로 보낸다.** Override 문구만 바뀌었다는 이유로 불필요한 Catalog Update를 생성하지 않는다. 테스트는 UTF-8 경계, 모델 전환, Tool 추가·삭제, Compaction 뒤 복원을 포함한다.

**절감·위험:** 모델에 맞춘 짧은 Prompt를 선택하고 Header 중복을 줄일 수 있지만 측정된 절감량 없음. 문구를 너무 짧게 만들면 제거된 Tool을 계속 호출하거나 Definition Priority를 오해할 수 있다. **기본 기능은 Provider/Feature Gate가 충족되어야 하며 모든 Codex/Claude Code 세션에 기본 적용된다고 보지 않는다.**

**적용:** Claude Code·Codex 별 Model Profile에 Tool-Delta Parsing Instructions 버전을 저장하고, Tool Catalog Generation/Hash, Visibility와 ACL Generation을 분리한다. Lower-cost Model은 Removal/Unknown Tool Search 안내를 오히려 강화해야 한다. 20개 Tool Add/Remove, Model Switch 10회, Compaction 10회, Policy Revoke 10회로 테스트. **판정: PoC**.

## 6. Codex Agent Tree ID / 실행환경 제거 — #60190

**신규성/시점:** 11/08 **02:28:13 UTC** 병합. CodexThread::agent_tree_id()를 공개해 **현재 메모리에 Load된 Agent Tree 세대**와 영속 Thread ID를 분리했다. Root와 Native Child는 동일 Tree ID를 가지지만, 이전 Thread ID를 재사용해 새 Tree로 다시 Load하면 **다른 Tree ID**가 된다. Fork, Warm Reuse, Cold Reload의 ID 일관성을 테스트한다. exec-server EnvironmentManager::remove_environment()도 Registry에서 ID를 제거하되 이미 발급한 Arc Handle과 Default ID를 무효화하지 않는 방식으로 추가됐다. 파일: codex-rs/core/src/{codex_thread.rs,agent/control/runtime.rs}, core/tests/suite/agent_control_tests.rs, exec-server/src/environment.rs.

**왜 중요한가:** Ledger가 Thread ID만을 실행 소유권으로 쓰면 같은 Thread의 Cold Resume, 다른 Run, Subagent Fork가 같은 작업 세대처럼 보일 수 있다. 반대로 Tree Generation만 저장하면 원래 사용자 Task/Changelist의 연속성이 끊긴다.

**P4/TeamCity 설계:** Task ID(영속) → Execution Attempt ID(재시작마다 생성) → Agent Tree ID(해당 Runtime 세대) → Child Agent ID → Tool Call Key → External Operation Receipt를 별도 컬럼으로 저장한다. Environment Registry에서 제거된 인스턴스도 기존 외부 작업을 기다릴 수 있으므로 종료·리소스 정리와 Registry Removal을 별도 Transition으로 둔다. Host Crash 후 같은 Task/CL로 재시작해도 이전 In-Flight Submit은 Receipt/Reconcile을 먼저 수행한다.

**품질/비용:** 복구 중복, 유실, 감사 추적 개선. 모델 Token 절감량 없음. **판정: 바로 적용 아키텍처 원칙.**

## 7. Codex Shared App Server MCP Startup 상태기계 — #60280

**신규성/시점:** 11/08 **19:04:25 UTC** main 병합. 기존 11/08 Cached MCP Catalog를 이용한 Lazy Startup 설계의 **서버 등록/알림 레이스를 보정하는 후속 구현**이다. 공유 App Server에 중간 시점에 Attach하면 Client의 로컬 MCP 설정과 서버 측 실제 목록이 다를 수 있고, Startup의 일부 Notification이 이미 지나갔을 수 있다. 이전 TUI는 로컬의 모든 서버가 Ready가 되길 기다리다가 무한 Busy로 고착될 수 있었다.

**구현:** Remote/Shared App Server와 Subagent에서는 **실제 수신한 Start 알림이 있는 서버만** 추적한다. 이미 진행 중이던 Round에 대한 Terminal-only Failure/Cancel도 표시하고, 중복 진단은 Retry 또는 Event Lag가 확인될 때까지 억제한다. Standalone Terminal Update 때문에 끝난 Startup Round를 다시 열지 않는다. 테스트는 Attach Before/During/After, Idle Keyboard, Missed Start, Failure/Cancel, Repeated Failures를 포함한다. 파일: codex-rs/tui/src/app/app_server_events.rs 및 tui/src/app/tests/mcp_startup.rs 등.

**적용:** Claude Code/Codex Runtime Adapter는 'Configured Server 목록'과 'Remote Runtime이 보고한 이번 Startup Generation의 서버'를 분리하고, Completion을 관측된 Set 기준으로 판단한다. Tool 호출 직전에는 Runtime Health/권한 검증을 별도로 한다. **모델 Token 절감 실측 없음**; Task Stall 및 불필요한 Timeout/Retry 방지 목적. **판정: 바로 적용 원칙.**

## 8. OpenCode Console: MCP 이벤트 기반 Wake와 비신뢰 메시지 구분 — #62734 / #62774

**신규성:** #62734는 11/08 **13:26:58 UTC**, #62774는 **20:27:31 UTC** dev 병합. Core 변경이 아니라 **Console 내장 Watch Plugin** 확장이다. packages/core/src/plugin/provider/opencode-watches.ts 및 provider-opencode-watches.test.ts. #62734는 Workspace에 등록된 MCP Server의 Event Type을 열거하는 events Tool, watch(server,event,arguments) 기능을 추가했다. Link Watch와 Server Event Watch를 동시에 지정하면 거절한다. 이벤트가 오면 Server/Event/정제 Link/본문을 별도 Fence로 모델에 전달하고, **사용자 직접 지시가 아닌 외부 데이터**임을 명시한다. 작성자는 Unit Test 24/24를 보고했으나 **실제 MCP Event Server 대상으로 검증하지 못했다**고 기록한다.

#62774는 Slack Channel에 Agent가 메시지를 올린 후 15분 동안 Top-Level Post도 관찰하는 기능을 추가했다. 새 channel_post는 '내 발언 이후 해당 채널에 올라온 관련 없을 수 있는 메시지'로 전달한다. Tool은 minutes 하드 Deadline을 받고 Console 최대 14일(20,160분)을 제한한다. 작성자의 Test 26/26. 두 구현 모두 **외부 Slack/MCP Event로 Agent가 즉시 행동하도록 승인한 것은 아니다.**

**P4/TeamCity 적용:** TeamCity Build Finished, P4 Submit Validation, Slack Mention, CI Incident Update를 Poll 대신 Event로 수집하되 (eventId, server, source, timestamp, payloadHash, relatedTaskId, authorization) Envelope에 영속 저장한다. 원래 사용자 지시와 상관없는 'deploy now' 같은 메시지는 Context에 인용할 수 있지만 **새 권한으로 실행하지 않는다**. Overlap된 Watch는 Dedupe, ACK, TTL/Max-Wake Rate를 둔다. Hook/Watch가 여러 번 깨운 경우 호출 Token, Wasted Retries와 Task Completeness를 함께 측정한다. **판정: PoC**, Provider Bill 절감 수치는 미측정이다.

## 9. Codex: 오래된 Task를 검색 기반으로 조회 — #60286

**시점:** 11/08 **19:36:18 UTC** main 병합. Command Center는 이전에 화면에 Browse로 Load된 Task만 검색해 옛 Task를 찾으려면 History Page를 반복 Load해야 했다. 변경 후 Active Backend History를 **Query마다 독립 Cursor**로 Page Scan하고, 대소문자와 무관하게 Name, Preview, CWD를 검사한다. Show More/Retry/Loading, Superseded Search 취소, Stale Result 무시, Browse Result와 Search Result의 격리, Search 종료 시 원래 선택 복원을 테스트한다. 파일: codex-rs/tui/src/app/agents_overview_discovery.rs, ...agents_overview*.rs, test/snapshot 등.

**평가:** 이것은 **사용자 UI의 Task History 검색**이며 모델에 RAG/Selective Context를 직접 추가하거나 Token을 줄인 구현은 아니다. 그러나 영속 Ledger를 한꺼번에 Context로 밀지 말고 Query 별 Backend Paging으로 조회한다는 설계는 참고 가능하다. Query ID·Cursor·Permission Scope를 함께 쓰고, 검색 결과에서 Task 원본을 재개하기 전 실제 Workspace/CL 접근 권한을 검증한다. **판정: 아이디어 참고.**

## 10. 새 장애 관찰: Windows Codex 대화 Rollout/Compaction 저장 폭증 — #60199

**원본:** [Issue #60199](https://github.com/openai/codex/issues/60199), 2026-11-08에 등록된 Windows 사례. 사용자는 약 30분짜리 Read/Compaction 반복에서 GiB 단위 파일 생성과 한 대화의 Rollout이 **11.44GiB**에 이른 사례, 약 280MiB 레코드가 반복 추가되는 정황을 보고했다. Windows 앱 패키지 26.1103.4239.0으로 기재했다.

**확인 수준:** 사용자 이슈 제보이며 공식 재현이나 근본 원인 확정/패치 병합이라고 볼 수 없다. 전일 #5792의 '중간 크기 텍스트 블록 압축 실패'와 증상이 연관돼 보여도 **같은 원인이라고 판단하지 않는다**.

**권고 진단:** (A) 모델 입력 Token/Cache Tokens, (B) Local Rollout JSONL Byte/Write Count, (C) Compaction Attempt/Success, (D) Tool Output 중복, (E) Retry Generation, (F) Disk Free, (G) Provider Billing을 별도 시간축으로 수집한다. 동일 Content Hash에 대한 Compaction 무한루프 Guard, Local Rollout 안전 Size Ceiling 및 Artifact Offload를 시험한다. **판정: 모니터링·재현 PoC**, 해결 완료로 보고하지 않는다.

## 11. 기술 축별 오늘 신규성 판정

| 범위 | 오늘 유의미한 변화 | 판단 |
|---|---|---|
| Coding Agent Workflow / Orchestration | #60190 Tree Generation, #60280 Startup Round 정합성 | 실무 적용 높음 |
| Skills / Hooks / Progressive Disclosure | #62176 Tool Delta, #62702 Skill 캐시와 Policy 분리 | 우선 적용 |
| Prompt/Skill 경량화 | #60188 모델별 안내 문구 축약 | PoC, 실제 Token 미측정 |
| RAG / Selective Context | #60286 Task History Backend Search | 사용자 검색 개선. 모델 RAG 신규 독립 실측 아님 |
| Context Pruning / Compaction | #62270 Image Bytes, #60199 Windows Loop 보고 | Byte Budget/유실 위험 동시 측정 |
| Tool Output 축약 | #61254 Output Validation 결과 인식, #62270 Image Payload 제어 | 원본 Evidence 보존 필요 |
| Prompt Cache | #62176 Stable Catalog Delta, #62270 Stable Image Cut | Cache Read/Write A/B 필요 |
| Subagent Isolation | #60190 Child/Tree ID 공유·Fork 세대 구분 | Task Ledger로 연결 |
| Session/Handoff/Durable State | #60190 Tree ID, #60280 observed Startup, #62734 Event Wake | 복구·중복 방지 |
| Model Routing | #60188 Model-specific Update Wording; #62176 Nano 퇴보 | 모델별 공개 Tool 수 최적화 |
| Evidence Verification | #61254 Execution ACK와 Output Parse 분리; #62774 신뢰 경계 | Fail Closed/Read-after-Write |
| Token/Cost 측정 | #62176 Update/Task Input Tokens의 실제 PR 수치 | USD/Verified Task 독립 검증 없음 |
| 최근 공식 릴리스 | Claude Code 최신 확인 v2.1.319(11/06 UTC), OpenCode v2.2.6(11/06 UTC), Codex Rust alpha 0.169.0-alpha.3(11/07 UTC) | **11/08 UTC 신규 공식 정식 릴리스로 재소개할 근거 없음** |

조사 범위: GitHub PR Search에서 11/08 merged_at 대상으로 openai/codex, anomalyco/opencode, langchain-ai/deepagents, langchain-ai/open-swe, microsoft/agent-framework, google-gemini/gemini-cli, strands-agents/harness-sdk, langchain-ai/langgraph, langchain-ai/langchainjs를 확인하고 일부 Release/API, PR Body, Changed Files, Test Patch를 읽었다. Deep Agents에서는 해당 날짜 의미 있는 Harness 변경 병합이 발견되지 않았고 Open SWE/Agent Framework/Gemini CLI/Strands/LangGraph도 해당 시간 범위에 신규 도입 수준의 확인 항목은 없다. **이는 조사 시점·검색 범위의 결과이지 모든 저장소의 모든 Commit에 변경이 없었다는 뜻은 아니다.** 별도의 신규 논문에서 독립 재현 가능한 비용 절감 결과도 확인하지 못했다.

## 12. Perforce · Claude Code · Codex Harness PoC 실행 순서

### 실험 A — Tool Catalog Delta + Model Router (우선 1)

**구성:** 동일한 Tool Registry 150개(예: P4 50, TeamCity 30, GitHub 30, Docs 20, Slack/일반 20), 50개 실제 업무 Task를 골라 3회씩 반복한다. A0 전체 Tool 목록, A1 안정적 정렬+선택 공개, A2 증분 Update+Search, A3 A2+모델별 짧은 안내 문구를 비교한다. Session 중 Server Attach/Detach 20회, Schema Edit 20회, Tool Removal/Permission Revoke 10회, Compaction/Resume 10회를 섞는다.

**측정:** first-turn input tokens, cumulative input, cached input/read/write, output/reasoning tokens, 실제 provider bill, catalog-update token, steps, p50/p95 latency, success@verified, tool recall, deleted/revoked Tool 호출 0, 잘못된 Tool 선택 0. 모델별로 strong/low-cost를 분리하고, **작은 모델의 성공률 손실을 가리는 전체 평균만 제시하지 않는다**. 확인 기준: 사내 작업에서 Baseline 대비 Verified Success가 악화되지 않는 조건 아래 Cost/Verified Task와 p95 개선; 절감 실측을 얻기 전까지 83%를 사내 성과로 주장하지 않는다.

### 실험 B — Image/Log Byte Budget과 Evidence 보존 (우선 2)

**구성:** UE5 Crash·Build 로그 500건 + Screenshot이 포함된 시나리오 50건. Text Log는 Hash+Artifact URI, Image는 Inline Bytes Budget(25→15MiB), 기존 Baseline, 모든 이미지를 Source Reference로만 넣는 방법을 비교한다. 2k~6k 문자 블록과 1~100MiB 이미지를 의도적으로 혼합한다.

**측정:** Request Body Bytes, LLM-visible Text/Image Tokens(Provider 별), Cache Miss, HTTP 413/400, Compaction Iteration, Crash 원인 분류/이미지 필요성 재조회 성공률, Evidence Hash 정합성, 전체 비용. **필수 Screenshot과 CL Provenance는 절대로 침묵 속 삭제 금지**; 삭제되면 모델에 명시하고 Signed Artifact Retrieval 또는 '확인 불가'로 처리한다.

### 실험 C — Tool Side Effect Receipt (우선 3)

**계약:** actionKey=taskId:attemptId:toolCallId와 serverRequestId를 Durable Ledger에 먼저 쓰고, Remote Job/Submit/Build Trigger를 보낸다. Tool의 Return Schema가 잘못됐어도 204/2xx ACK와 Event ID가 있으면 **같은 요청을 곧바로 재실행하지 않는다**. 상태는 Requested → Started → Verified → Committed 또는 Unknown/ReconcileRequired. 이미 실행됐을 수 있으면 P4 CL/TeamCity Job ID로 Read-after-Write 확인.

**장애 시나리오:** SDK Return Schema 예외, 204 빈 Body, MCP 연결 끊김, Worker Kill 직전, 재개 시 Cold Runtime 및 같은 Thread/다른 Tree Generation, Event 중복 100회, Policy 503. 목표: Double P4 Submit 0, Duplicate Build Queue 0, Lost Commit Receipt 0, ACL 우회 0. 모델로부터 받은 Text를 '최종 실행 증거'로 쓰지 않는다.

### 실험 D — Policy/Skill Cache + Event Wake

Skill/Instruction 503·Malformed JSON·초기 Cold Start를 각각 발생시키고 **Policy deny 적용률 100%**와 비인가 Tool 실행 0을 검사한다. Event Wake에는 Source Role과 Trust Boundary를 보존한다. 외부 Slack Top-Level Post/MCP Event는 '사용자 작업 변경 요청'이 아니며 명시적 승인 없이 Side Effect를 일으키지 않는다. Event 중복·만료·늦은 수신에 대비해 ACK/TTL를 영속 저장하고 Poll 대비 Model Wake 수/Token/Task Completion을 비교한다.

### 아키텍처 제안

- **Registry/Policy Plane:** Role·Tenant별 ACL, Signed Policy Generation, Stable Tool Metadata 및 Discovery Index. Permission Enforcement는 Tool Call Runtime.
- **Context Plane:** Model Profile별 Stable Prefix, Tool Delta, Source-selective Context, Image/Log Byte Budget, 보존된 Artifact References, Compaction/Catalog Checkpoint.
- **Execution Plane:** Claude Code/Codex Runtime Adapter, Task ID / Attempt ID / Agent Tree ID / Child ID / Tool Call ID / External Job ID.
- **Durability Plane:** Transactional Outbox + Ledger + Environment Generation + Tool Start/Finish Receipts, 중복 방지·강제 종료 복구.
- **Evidence Plane:** P4 Changelist Base Revision·File Digest, Build Verdict, Test Logs, Human Approval, Original Artifact URI, Evidence Delivery/Read ACK.
- **Measurement Plane:** Provider Usage(Cached Input, Cache Creation, Uncached Input, Output/Reasoning), Model Config, Tool/Compaction/Retry Waste, Cost per Verified Task, Quality/Latency 함께 기록.

**핵심 설계 원칙:** Token/Context 절약은 Verification·Permission·Original Evidence의 손실을 정당화하지 않는다. Model-visible Context만 최소화하고 Authority/Action/Receipt/Original Evidence는 별도 영속 계층으로 보존한다.

## 13. 근거와 확인 수준

**원본 PR/소스·테스트 우선:** [OpenCode #62176](https://github.com/anomalyco/opencode/pull/62176), [#62270](https://github.com/anomalyco/opencode/pull/62270), [#61254](https://github.com/anomalyco/opencode/pull/61254), [#62702](https://github.com/anomalyco/opencode/pull/62702), [#62672](https://github.com/anomalyco/opencode/pull/62672), [#62734](https://github.com/anomalyco/opencode/pull/62734), [#62774](https://github.com/anomalyco/opencode/pull/62774), [Codex #60188](https://github.com/openai/codex/pull/60188), [#60190](https://github.com/openai/codex/pull/60190), [#60280](https://github.com/openai/codex/pull/60280), [#60286](https://github.com/openai/codex/pull/60286), [Issue #60199](https://github.com/openai/codex/issues/60199).

**공식 Release 확인:** [OpenCode v2.2.6](https://github.com/anomalyco/opencode/releases/tag/v2.2.6), [Claude Code v2.1.319](https://github.com/anthropics/claude-code/releases/tag/v2.1.319), [Codex rust-v0.169.0-alpha.3](https://github.com/openai/codex/releases/tag/rust-v0.169.0-alpha.3), [Deep Agents 0.7.34](https://github.com/langchain-ai/deepagents/releases/tag/deepagents%3D%3D0.7.34).

**한계:** PR 작성자 수치는 조건이 다른 벤치마크 간 직접 합산할 수 없다. 병합 사실과 현재 안정 버전 포함 여부는 별도다. 특히 v1 Branch Backport를 v2의 신규 기능으로 재소개하지 않았으며, Codex의 실험 Feature Flag가 모두 켜진 상태라고 전제하지 않았다. 지금 기록한 절감율을 사내 실제 결제 비용 절감률로 주장하지 않는다.
