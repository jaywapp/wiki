# workspace-harness 설계 초안

- 프로젝트: wiki; orchestrator: **Codex**
- 작업 유형: non-ui; 웹 스택·UX/UI 콘셉트·스킬: N/A
- 상태: **review — 설계 초안 작성 완료, 구현 미승인·미실행**
- 작성일·갱신일: 2026-09-06 (Asia/Seoul)
- 근거: [분석](workspace-harness-analysis.md), [작업 계획](workspace-harness-tasks.md)

## 1. 확정 요구사항과 설계 경계

루트는 요청 분해·질문 답변·진행 확인·최종 검증을 담당하고, 워커는 D:\work\<repository> 경계 안에서 작업한다. 같은 실행 계획은 Codex로 통일한다. 다른 도구로 전환하려면 별도 작업 경계와 핸드오프가 필요하다.

이 문서는 앞으로 만들거나 연결할 구조를 제안한다. 이번 산출물은 문서뿐이다. 사용자 결정 Q-01..Q-05가 필요한 부분은 해당 설계만 미확정으로 두며, 조사 완료와 운영 구현 완료를 구분한다.

## 2. 권장 구조와 단계

**작은 Codex exec/resume 검증부터 시작하고, 확인된 공백만 조정 계층으로 보완한다.** 공급자 실행기를 새로 구현하지 않는다.

1. 현재 CLI로 읽기 전용 1개 프로젝트의 구조화 질문·답변·결과 왕복을 확인한다.
2. 동시에 필요한 경우 Windows foreground App Server의 agents/queue --remote를 별도 검증해 기존 기능의 재사용 범위를 정한다.
3. 검증된 실행 경로 위에 업무 상태·질문·중복·소유권만 관리하는 coordinator를 둔다.
4. 상시 대화형 TUI 공유가 필수일 때 App Server adapter를 추가한다. WebSocket 실험 기능 수용은 사용자 결정이다.
5. 다중 프로젝트 DAG·동시성·복구를 추가한다. 첫 pilot는 프로젝트 1개, 동시 작업 1개로 한정한다.

### 구성도 — 제안

~~~mermaid
flowchart LR
  U["사용자"] <--> R["루트 Codex"]
  R <-->|"작업·질문·답변·결과"| C["Coordinator"]
  C <--> S[("작업·질문·이벤트 저장")]
  C --> P["Preflight / 정책 / 소유권"]
  P --> A["Codex 실행 Adapter"]
  A <--> W["프로젝트 워커"]
  W --> D["D:/work/대상 저장소"]
  C --> V["상태·로그 읽기 화면"]
  V --> T["기존 Windows Terminal"]
~~~

Coordinator, Adapter, 상태 저장소와 표시 클라이언트는 제안된 구성요소이며 현재 .workspace에 구현돼 있지 않다. MVP의 기존 Terminal AI pane은 별도 수동 세션으로 남을 수 있다. 그것을 관리 워커의 동일한 대화 화면이라고 표시하지 않는다.

### 책임

| 구성요소 | 책임 |
| --- | --- |
| 루트 Codex | 요청 해석, 의존 순서, 확정된 요구사항에 근거한 답변, 결과 내용 검토 |
| Coordinator | 실행 접수, 업무 상태, 질문·답변 상관관계, 중복 제거, 단일 writer, timeout/복구 |
| Preflight | repo/cwd, Git baseline, 지침, 도구 버전·model/effort, 기존 실행 여부 확인 |
| ExecAdapter | CLI 자식 프로세스 시작, JSONL 수신, 정확한 session ID 재개, 결과 정규화 |
| AppServerAdapter | 선택 사항. thread/turn/event 및 native 질문·승인 handler |
| 저장소 | 업무 ID와 provider ID 연결, checkpoint, 질문/답변, 검증 근거 |
| 표시 클라이언트 | 상태와 로그 조회. task 자체를 실행하거나 중복 재개하지 않음 |

루트와 coordinator 연결은 MCP stdio 같은 기존 도구 인터페이스를 우선 검토한다. 별도 로컬 클라이언트가 필요하면 인증된 Windows named pipe 등 같은 사용자 범위 IPC를 후보로 둔다. 최초 pilot에는 외부 HTTP 서버·DB·웹 UI를 만들지 않는다.

## 3. 실행 경로별 대안

| 대안 | 기존 기능으로 얻는 것 | 부족하거나 확인할 것 | 판단 |
| --- | --- | --- | --- |
| Codex exec/resume | cwd·model·sandbox·JSONL·schema·대화 재개 | 구조화 질문 계약, 업무 상태·복구 | **첫 검증 권장** |
| Codex shared App Server + remote TUI/queue | 세션 API, 실시간 표시와 메시지 전달 후보 | Windows foreground 경로 E2E, 구독·writer 경계, 실험 상태 | 실시간 TUI가 필수일 때 조건부 |
| Codex Desktop 작업 도구 | 앱의 작업 생성·후속 메시지·대기·결과 회수 | 저장 프로젝트 등록, CLI와 다른 제어면 | UI 변경을 수용하면 자체 구현 축소 후보 |
| 기존 Orca 재사용 | README상 추적·steering·알림·worktree | 현재 실행 여부와 task/question 계약 검증 | 새 저장소 작성 전 비교 |
| 별도 Claude 작업으로 전환 | native 메시징·background·agent view | 사용자 전환 결정, 실제 세션 정책·왕복 검증 | 기능상 유력 대안, 이번 owner와 혼합 안 함 |
| Terminal 키 입력 주입/화면 파싱 | 기존 창을 조작하는 외형 | 접수·식별·복구 불안정, 잘못된 창 위험 | 주 통신 경로로 채택하지 않음 |
| 전용 범용 런타임 전면 재작성 | 완전한 제어 | 중복 구현과 유지 비용 | 기존 경로 검증 전 시작하지 않음 |

공식 기능 근거는 [분석의 Codex/Claude 비교](workspace-harness-analysis.md)에 연결돼 있다. 특히 “Codex는 전달 기능이 전혀 없다” 또는 “Claude는 독립 세션과 통신할 수 없다”를 전제로 설계하지 않는다.

## 4. 업무 계약 — 제안 인터페이스

아래 이름은 **새 coordinator 내부 계약**이며 설치 CLI 명령이나 공급자 API 이름이 아니다.

- submitTask: 새 업무 접수. idempotency key가 같으면 기존 접수 결과를 반환한다.
- getTask / waitEvents: task 상태·검증 가능한 결과·미응답 질문 조회. cursor 이후 이벤트만 수신한다.
- answerQuestion: task/attempt/question 및 예상 상태 버전을 검증하고 답변을 기록한다.
- reconcileTask: 연결 유실·미확인 전송 후 실제 실행 상태와 기록을 맞춘다.
- requestCancel: 명시적 사용자 취소를 처리하는 향후 경로. 이번 작업에서는 사용하지 않았다.

| 레코드 | 주요 필드 |
| --- | --- |
| Run | run_id, orchestrator, created_at_utc, root_binding, policy_version |
| Task | task_id, run_id, repo_id, canonical_cwd, instruction_manifest, requested_model, requested_effort, allowed_scope, depends_on, state, state_version |
| Attempt | attempt_id, task_id, adapter, binary_path, binary_version, provider_thread_id, provider_turn_id, effective_model, effective_effort, process_handle, owner_epoch |
| Question | question_id, task_id, attempt_id, provider_request_id, item_id, blocking, question, answer, answered_by, state |
| Event | event_id, task_id, attempt_id, sequence, type, observed_at_utc, payload_ref |
| Result | result_id, task_id, attempt_id, summary, changed_files, verification, evidence_refs, unresolved, validated_by |

경로는 Windows 대소문자·junction·worktree 경계를 고려해 정규화한다. 표시 이름이나 PID만으로 세션을 식별하지 않는다. 공급자의 thread/session/turn ID 명칭은 adapter에서 매핑하며 서로 같은 값이라고 추정하지 않는다.

모델의 requested 값과 실행 응답의 effective 값은 별도다. effective를 얻을 수 없으면 unknown으로 저장한다. 실제 지원 모델로 대체할 때 원래 값·선택 값·지원 확인 근거를 남기며 다른 provider로 자동 전환하지 않는다.

## 5. 상태·질문·복구

### 상태 전이

~~~text
queued → dispatching → running → result_ready → validating → completed
                          │
                          ├→ needs_input → queued (같은 thread의 후속 turn)
                          ├→ failed
                          └→ recovering → running / needs_input / blocked
queued 또는 running → blocked (정책·환경·사용자 결정 의존)
validating → failed (스키마·근거·내용 불일치: invalid_result)
validating → blocked (검증 환경 또는 필수 사용자 결정 누락)
~~~

공급자 turn 완료는 업무 완료와 다르다. exec가 needs_input을 반환하고 정상 종료해도 task는 완료되지 않는다. idle, exit code 0, “끝났다”는 자연어 중 하나만으로 completed를 기록하지 않는다. 스키마, task ID, 근거, 검증 결과가 맞아야 한다.

### 질문 라우팅

1. 워커 질문을 task·attempt·question에 연결하고 중복 수신을 제거한다.
2. 루트가 이미 확정된 요구사항으로 답할 수 있으면 그 근거와 함께 답한다.
3. 새 제품 결정·모호한 범위·권한 확대는 사용자 답변이 필요한 항목으로 분류한다.
4. 답변은 해당 질문에만 적용한다. 다른 task ID·이미 끝난 attempt·오래된 state_version의 답변은 거절한다.
5. 필수 질문의 timeout은 답변이나 승인으로 간주하지 않는다. needs_input/blocked로 유지하며 독립 task만 계속할 수 있다.
6. 기술적 권한 요청은 일반 요구사항 질문과 별도 채널이다. 루트가 다른 세션을 통해 거절된 권한을 우회하거나 사용자 승인으로 가장하지 않는다.

### 중복·장애·동시성

- 접수 후 실행 전에 기록을 영속화한다. 재전달은 같은 idempotency key로 조회한다.
- 프로세스 시작 직후 접수 기록을 잃으면 실행 여부가 불명확할 수 있다. “정확히 한 번”을 무조건 보장하지 않고 recovering으로 분류해 실행·결과를 먼저 조사한다.
- lease 만료만으로 같은 repo의 두 번째 writer를 시작하지 않는다. 기존 실행이 종료됐거나 소유권이 안전하게 회수됐는지 확인해야 한다.
- 파일을 바꿀 수 있는 작업은 repo/worktree별 한 writer가 기본이다. 파일 경계가 겹치면 순차 실행한다.
- 질문 대기 중에는 프로세스 슬롯을 반납할 수 있지만 task의 프로젝트 예약은 유지한다. 다른 쓰기 작업을 실행하려면 명시적 전환과 baseline 재검사가 필요하다.
- JSONL의 잘린 마지막 줄, 중복 이벤트, 비정상 종료는 보관·진단하고 완성 결과로 파싱하지 않는다.
- 재개는 기록된 정확한 UUID와 같은 canonical cwd로 수행한다. --last 및 이름만으로 재개하지 않는다.
- 재시도는 동일 task의 새 attempt다. 외부 효과가 있을 수 있는 작업은 결과 불명 상태에서 자동 재실행하지 않는다.
- 루트 TUI가 idle이면 외부 결과가 자동으로 새 turn을 깨운다고 가정하지 않는다. MVP는 제한 시간의 waitEvents를 통해 실행 중 루트가 결과를 회수한다. 루트가 종료되면 pending 결과를 보존하고 다음 실행에서 조회한다.

상태 저장은 단일 coordinator가 쓰는 SQLite 같은 트랜잭션 저장소를 우선 검토한다. 로컬 상태는 사용자 영역, 공유 가능한 조사·설계·검증 문서는 대상 저장소 docs에 둔다. 정확한 런타임 디렉터리·로그 보존·암호화는 Q-02/Q-05 결정 후 확정한다. 이번에는 DB나 런타임 디렉터리를 만들지 않았다.

## 6. Preflight와 기존 Terminal 연결

### 모든 워커 시작 전

1. 저장소 등록값과 실제 Git root/cwd가 일치하는지 확인한다. D:\work 자체를 하나의 Git 저장소로 취급하지 않는다.
2. 공통 rules, 루트 AGENTS/CLAUDE, 저장소 AGENTS/CLAUDE/README, 하위 지침의 경로·해시·읽기 결과를 기록한다. 우선순위는 사용자 요청과 저장소 계약에 맞춘다.
3. Git branch·HEAD·기존 변경을 기록하고 사용자 변경에 대한 소유권을 주장하지 않는다.
4. executable의 절대 경로와 버전, model/effort 지원을 확인한다. PATH CLI 0.149.1과 Desktop 0.153.4를 혼용하지 않는다.
5. 기존 활성 writer와 미응답 질문·복구 상태를 확인한다.
6. 최소 권한·필요한 읽기 경로와 실행 한도를 설정한다. 첫 검증은 read-only다.
7. SDK/MCP/hook 등 부수 실행 조건을 확인한다. required 도구 실패를 무시하지 않는다.

공통 지침을 읽었다는 모델의 말만으로 완료하지 않는다. 원문 로드 기록과 해시, App Server에서 가능한 instructionSources를 비교한다. user config·.env·토큰 전체를 로그에 남기지 않는다.

### 표시 계층

현재 Work Codex/Work Claude 프로필은 기본 CLI를 연다. 향후 연결 시 “수동 CLI”와 “관리 워커 상태”를 명확히 표시하고, logs라는 이름만 붙이지 말고 해당 task 이벤트를 실제 구독하도록 한다.

실시간 공유안을 선택하면 새 foreground App Server 아래의 thread와 remote TUI를 처음부터 연결한다. 기존 독립 TUI를 자동 이전·종료하거나 동시에 resume하지 않는다. Windows daemon lifecycle을 운영 전제로 삼지 않으며 supervisor·ready check·호스트 종료 처리도 검증해야 한다. [공식 App Server 연결](https://learn.chatgpt.com/docs/app-server)

## 7. 단일 프로젝트 최소 검증 절차 — 아직 실행하지 않음

목표는 **wiki 한 프로젝트에서 작업 전달 → 질문·응답 → 실행 → 결과 회수**를 증명하는 것이다. 제품 변경과 Git 원격 동작은 필요 없다.

### 준비물과 통과 기준

후속 실행이 승인되면 시험용 evidence 디렉터리, 다음 schema, 두 prompt를 준비한다. 예시 위치는 D:\work\wiki\docs\harness-pilot\<run-id>이며 이번에는 생성하지 않았다. 여기서 read-only는 워커의 프로젝트 읽기 권한을 뜻한다. 시험 host는 별도로 승인된 evidence 위치에 prompt·schema·JSONL·-o 결과 파일을 기록한다. host의 증거 기록과 워커의 제품 파일 수정을 구분해 검사한다. 실행 사용자·권한·도구 경로를 명시하고 기존 세션을 사용하지 않는다.

첫 prompt는 업무 task_id와 일회 nonce를 전달하고 “요약할 문서가 아직 지정되지 않았으므로 question_id=q-document로 질문하고 status=needs_input을 반환하라”고 지시한다. 두 번째 prompt에는 같은 task/question ID와 “README.md를 한국어 두 문장으로 요약하고 근거 위치를 반환하라”는 답변만 넣는다. **nonce 값은 두 번째 prompt에 다시 넣지 않는다.** 원래 공통·루트·repo 지침 읽기와 금지 범위도 두 prompt의 계약에 포함한다.

예시 결과 schema는 다음과 같다. 공급자 schema 지원과 별도로 coordinator가 상태별 의미를 검사해야 한다.

~~~json
{
  "type": "object",
  "properties": {
    "task_id": { "type": "string" },
    "status": { "type": "string", "enum": ["needs_input", "completed", "failed"] },
    "nonce": { "type": "string" },
    "question_id": { "type": "string" },
    "question": { "type": "string" },
    "summary": { "type": "string" },
    "evidence": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["task_id", "status", "nonce", "question_id", "question", "summary", "evidence"],
  "additionalProperties": false
}
~~~

첫 결과는 summary와 evidence가 비어 있고 질문이 있어야 한다. 완료 결과는 질문을 새로 만들지 않고 같은 question_id와 nonce, 실제 README 근거를 반환해야 한다.

### 수행 순서

| 단계 | 수행 | 관찰·합격 기준 |
| --- | --- | --- |
| V-01 | wiki 지침/HEAD/변경·실행 파일·모델·권한 확인 | baseline과 허용 범위 기록; 기존 writer 충돌 없음 |
| V-02 | coordinator 또는 시험 host가 첫 exec 요청 전달 | task 접수 기록 후 실행, JSONL thread.started에서 정확한 UUID 저장 |
| V-03 | 첫 결과 수신 | exit/JSON 오류 없음, status=needs_input, task_id·nonce·question_id 일치 |
| V-04 | root에 질문 제시, q-document 답변 기록 | 답변 전 요약·의존 실행 없음; 루트가 보류했던 문서명을 응답 |
| V-05 | 같은 UUID를 exec resume으로 재개 | cwd·권한 재확인, --last 미사용, 동일 업무의 후속 turn |
| V-06 | 워커가 README 읽기·요약 실행 | status=completed, 동일 nonce 기억, summary와 근거 위치 존재 |
| V-07 | 루트가 원본과 결과 비교 | 실제 두 문장·한국어·내용 일치·금지 변경 없음 |
| V-08 | task 완료 및 재시작 조회 | 검증 후 completed 저장, 재조회에도 같은 결과·질문 기록 |

### 로컬 0.149.1 도움말에 맞춘 명령 형태

아래는 **미실행 예시**다. 변수는 준비 단계에서 정한 절대 경로와 prompt 문자열이며 실제 비밀 값을 넣지 않는다. stdout JSONL과 stderr는 시험 host가 각각 수집한다.

~~~powershell
$taskCodex = 'C:\Users\jaywa\AppData\Roaming\npm\codex.cmd'
Set-Location -LiteralPath 'D:\work\wiki'
& $taskCodex exec -C 'D:\work\wiki' -s read-only -m gpt-5.6-sol -c 'model_reasoning_effort="high"' -c 'approval_policy="never"' --json --output-schema $taskSchema -o $taskFirstResult $taskFirstPrompt
& $taskCodex exec resume $taskThreadId -m gpt-5.6-sol -c 'model_reasoning_effort="high"' -c 'sandbox_mode="read-only"' -c 'approval_policy="never"' --json --output-schema $taskSchema -o $taskSecondResult $taskSecondPrompt
~~~

두 명령 사이에 V-03/V-04 검사와 답변 기록이 반드시 있어야 한다. 연속 자동 실행 예시가 아니다. resume 하위명령에는 -C/-s를 넣지 않는다. 초기 UUID를 잃으면 --last로 추정하지 않고 해당 시도를 실패로 기록한다. PowerShell 5.1의 native 인자 전달·인코딩은 후속 host 시험에서 확인하며, 구현에서는 shell 문자열 결합보다 process argument 배열과 stdout/stderr 스트림 API를 사용한다. [비대화형 실행 근거](https://learn.chatgpt.com/docs/non-interactive-mode)

### App Server 추가 검증 — 조건부

모델 호출 없는 initialize→initialized→model/list와 설치 버전 스키마 확인부터 시작한다. 이후 폐기 가능한 시험 repo/session으로 thread/start, turn/start, 질문 이벤트, response, turn 결과를 확인한다. 로컬 wire method는 item/tool/requestUserInput이며 provider 요청 id·question ID·item/thread/turn을 모두 연결해야 한다.

native 질문 이벤트가 나오지 않으면 성공으로 간주하지 않는다. 노출 조건을 기록하고 exec의 needs_input 경로로 기본 왕복을 검증한다. 응답 이후 serverRequest/resolved와 실제 후속 진행을 별도로 확인한다. 재연결 시 과거 JSON-RPC request ID가 유효하다고 가정하지 않는다.

상시 TUI안은 foreground server + remote TUI + queue --remote의 동일 thread 전달을 추가로 확인한다. 하나의 writer가 요청을 제어하고 다른 연결은 조회 중심으로 둔다. 어느 경로도 기존 사용자 TUI에서 먼저 시험하지 않는다.

### 별도 Claude 작업의 최소 경로 — 비교용

orchestrator=Claude로 새 작업을 선택한다면 이름 있는 루트와 프로젝트 워커를 시작하고, ListAgents/SendMessage로 task/question/result를 왕복하며 agents --json·idle 알림으로 상태를 확인하는 절차가 가능하다. 먼저 실제 inbox·inbound 정책과 동일 Windows 실행 영역을 확인해야 한다. 문서화된 기능이므로 새로운 메시지 전송기를 만들기 전에 시험할 가치가 있다. 이번에는 이 경로를 실행하지 않았다. [공식 세션 메시징](https://code.claude.com/docs/en/cross-session-messaging)

## 8. 실패·복구 검증

| ID | 시험 | 기대 동작 | 요구사항 |
| --- | --- | --- | --- |
| F-01 | 같은 접수 key를 두 번 제출 | task 1개·실행 1개로 매핑, 기존 접수 반환 | R-03 |
| F-02 | 다른 task/question의 답변 | 거절, 원래 질문 대기 유지 | R-04 |
| F-03 | 답변 없이 timeout | 완료/승인으로 바꾸지 않음 | R-04,R-08 |
| F-04 | 프로세스 시작 직후 coordinator 연결 유실 | recovering; 기존 실행 확인 전 새 실행 금지 | R-03,R-06 |
| F-05 | 결과 직전 연결 끊김·잘린 JSONL | 결과 재조회/검증, 부분 결과로 completed 금지 | R-05,R-06 |
| F-06 | 같은 repo의 두 쓰기 작업 | 두 번째는 queued/blocked, 변경 겹침 없음 | R-01,R-06 |
| F-07 | 다른 provider 또는 미지원 effort | 시작 전 실패 또는 기록된 같은-provider 대체 | R-01,R-07 |
| F-08 | root 지침 누락·cwd 불일치 | 실행 차단 및 누락 근거 표시 | R-01 |
| F-09 | 워커가 commit/push 권한 요청 | 일반 질문 답변으로 승인하지 않음 | R-08 |
| F-10 | root 종료 후 워커 결과 도착 | 결과 보존, 다음 root 실행에서 회수 | R-05,R-06 |
| F-11 | result=completed지만 근거 없음/내용 불일치 | validating 실패; 성공 보고 금지 | R-05 |
| F-12 | 기존 수동 TUI가 열려 있음 | 종료·입력 주입·자동 resume 없음 | R-09 |

첫 pilot에서 V-01..V-08 및 F-01..F-03/F-11을 확인한다. 실제 coordinator 구현 후 crash·lease·재시작을 포함한 나머지 실패 시나리오를 실행한다. 모든 항목은 이번 조사에서 **미실행**이다.

## 9. 후속 구현의 보안·운영·기술 선택

- 제품 코드 원본은 Q-02에서 결정한 Git 저장소에 둔다. .workspace 아래에 임시 대형 구현을 흩어놓지 않는다.
- 빌드 가능한 CLI/coordinator/adapter/test 구조를 사용한다. PowerShell은 실행·진단 래퍼로 제한하는 안이다.
- SDK가 필요하면 패키지 버전과 lockfile을 고정한다. SDK가 없는 현재 환경에 자동 설치하지 않는다.
- 업무 레코드에는 인증 값 대신 secret reference만 둔다. 전체 transcript를 무조건 저장·전송하지 않고 진단에 필요한 이벤트를 제한한다.
- Git/파일 효과는 prompt만으로 보장하지 않는다. adapter 권한과 명시적 허용 동작, 변경 전후 검증을 함께 사용한다.
- 하위 repo 간 독립 read-only 조사는 병렬화할 수 있지만 실제 모델 quota와 호스트 슬롯 제한을 적용한다.
- 중앙 docs는 이번처럼 wiki/docs에, 프로젝트 구현 문서는 각 프로젝트 docs에 둔다.
- 기존 템플릿·규칙·Terminal 변경은 별도 작업계획에서 원본/생성물/사용자 설정 diff를 검토한 뒤 수행한다.

## 10. 승인·변경 기록

- 2026-09-06: A/B/C 조사 결과로 초안 작성. 공식 기능·설치 기능·실동작 미확인을 분리했다.
- 사용자 구현 승인: 없음. 제품/설정/Git 원격 변경: 없음.
- Q-01..Q-05의 미응답 사항은 [분석 질문 표](workspace-harness-analysis.md)에 모았다.
- 다음 작업은 [tasks 후속 구현 표](workspace-harness-tasks.md)의 의존 순서를 따른다. 조사 문서 완료는 해당 구현 작업의 자동 실행 승인이 아니다.
