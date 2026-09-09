# workspace-harness 분석

- 프로젝트: wiki — D:\work 멀티 프로젝트 하네스 조사
- orchestrator: **Codex**
- 작업 유형: non-ui; 웹 스택·UX/UI 게이트·스킬: N/A
- 상태: **ready — 조사 완료, 설계 선택은 검토 대기**
- 작성일·갱신일: 2026-09-06 (Asia/Seoul)
- 관련 문서: [설계 초안](workspace-harness-design.md), [작업 계획](workspace-harness-tasks.md)

## 1. 요청과 결론

루트가 프로젝트 워커에게 작업을 전달하고 질문에 응답하며 진행·결과를 회수하는 환경을 조사했다. **현재 Windows Terminal 구성은 독립 CLI 창 실행기이고, 하네스의 작업 계약·상태 저장·질문 처리와 연결돼 있지 않다.** 다만 공급자별 기존 기능은 다르므로 모든 통신 기능을 새로 만들 필요는 없다.

- Codex: exec/정확한 UUID 재개와 JSON 출력을 이용한 최소 검증이 가능하다. 설치 CLI에 agents/queue도 있지만 공유 App Server 전제이며 Windows에서 foreground remote 경로의 실제 왕복은 미검증이다.
- Claude: 현재 공식 문서에는 독립 세션 메시징과 일회 idle 알림이 있고, 설치 2.1.261은 Windows 버전 요건을 충족한다. 실제 계정·세션 정책의 가용성은 미검증이다.
- 권장: orchestrator=Codex를 유지하고, 기존 기능으로 단일 프로젝트 왕복을 먼저 검증한다. 그 다음 부족한 작업 레지스트리·질문 상태·중복 방지·복구를 구현한다. 상시 TUI 공유가 필수이면 App Server remote 경로를 별도 검증한다.
- Claude 기능 조사는 Codex 에이전트가 했다. Claude 모델로 위임하거나 같은 작업계획에서 두 실행 도구를 혼합하지 않았다.

조사와 문서 작성만 수행했다. 제품 코드·사용자 설정 변경, 설치, 기존 세션 종료, commit/push/PR/merge, 배포 및 모델을 호출하는 하네스 E2E 시험은 하지 않았다. 임시 스키마 생성·정적 검사와 도움말 확인은 조사에 포함했다.

## 2. 조사 방식과 현재 상태

### 근거 구분

| 표기 | 의미 |
| --- | --- |
| 로컬 확인 | 설치 실행 파일의 버전·help·생성 스키마, 파일 내용, 읽기 전용 검증 |
| 공식 문서 확인 | 2026-09-06 실제 열람한 공급자 문서의 명세; 현재 계정의 성공 보장은 아님 |
| 제안 | 조사 결과를 바탕으로 이번에 작성한 설계; 아직 구현·검증하지 않음 |
| 미확인 | 모델 실행, 세션 시작, 계정/권한 확인 또는 추가 구현이 필요한 사항 |

A/B/C는 각각 gpt-5.6-sol/high, gpt-5.6-sol/high, gpt-5.6-sol/medium을 명시한 독립 Codex 서브에이전트로 병렬 수행했다. 생성 성공했고 대체 모델은 사용하지 않았다. 이는 현재 앱 도구에서의 지원 확인이며 PATH CLI의 계정별 모델 가용성과는 구분한다. 메인은 공통 요구사항·검증 시나리오를 병행 작성하고 결과의 핵심을 공식 본문·설치 help·설정 원본과 대조했다.

### 파일·Git 기준선

- 공통 규칙 C:\Users\jaywa\.ai\rules\의 모든 .md, D:\work와 wiki의 AGENTS.md·CLAUDE.md·README를 확인했다.
- [문서 규칙](README.md), D:\work\.workspace\templates\docs\의 analysis/design/tasks 템플릿, 기존 환경·터미널 문서를 확인했다.
- D:\work는 Git 저장소가 아니다. 직접 하위 Git 저장소는 조사 시 51개였다.
- wiki: branch **codex/workspace-environment-20260904**, HEAD **2f41092**. 조사 C가 확인한 upstream 대비는 로컬 참조 기준 0/0이며 fetch하지 않았다.
- 기존 변경: README.md와 docs/README.md 수정, docs/windows-terminal-workspace-{analysis,design,guide,tasks}.md 미추적 4개. 기존 본문을 보존하고 인덱스에 이번 문서 링크만 추가했다.
- sandbox 계정과 저장소 소유자가 달라 기본 Git 읽기가 거절됐다. 특정 저장소 한정으로 git -c safe.directory=D:/work/wiki -C D:\work\wiki를 사용했다. 전역 safe.directory 설정은 변경하지 않았다.
- PATH의 rg WinGet 링크가 실행 실패해 PowerShell 파일 탐색·Select-String 등으로 대체했다.

### 설치 도구

| 대상 | 로컬 결과 | 해석 |
| --- | --- | --- |
| PATH Codex | codex-cli 0.149.1 | Windows Terminal의 bare codex가 사용하는 npm 설치 |
| Desktop 번들 Codex | codex-cli 0.153.4 (조사 A) | PATH CLI와 버전이 다름; 공통 기능으로 간주하지 않음 |
| Claude Code | 2.1.261 | 메인과 B가 각각 버전 확인 |
| Node.js / Python | v22.19.0 / 3.12.10 (조사 A) | SDK 후보 실행 환경 |
| Codex·Claude SDK | 확인한 전역 npm/Python 환경에서 미설치 | 저장소별 모든 가상환경까지 부재를 증명한 것은 아님 |
| Windows Terminal | wt.exe alias 존재, 버전 미확인 | 현재 설정·정적 레이아웃 검증은 가능 |
| tmux / WSL | PATH tmux 미발견; WSL 배포판 조회 권한 오류 | WSL 설치 상태와 실제 운영 가용성 미확인 |

## 3. Codex 기능과 제한 — 조사 A

| 실행 표면 | 확인 기능과 근거 | 제한·추가 조건 |
| --- | --- | --- |
| 독립 TUI | 새 세션, resume UUID, remote 연결 옵션. 로컬 --help / resume --help | resume은 대화 기록 재개다. 이미 독립 실행 중인 프로세스에 외부 제어자를 붙이는 기능으로 확인되지 않음 |
| agents / queue | 로컬 agents --help와 queue --help에 공유 서버 탐색, --thread UUID/name --message, --remote 존재 | agent 탐색은 shared app-server 전제. Windows에서 daemon version은 Unix 전용 오류. foreground 서버의 queue --remote 왕복은 미확인 |
| exec | cwd·sandbox·model·config 지정, JSONL 이벤트, --output-schema, 최종 -o 파일. 로컬 exec --help | 질문을 기다리는 일반 대화 UI가 없다. 구조화 needs_input 결과와 재개 계약은 별도 설계 |
| exec resume | 정확한 UUID, -m, -c, --json, --output-schema, -o 지원. 로컬 resume help | 하위명령에 -C/-s 없음. 재개는 작업별 cwd에서 실행하고 sandbox_mode config를 재명시. --last는 자동화에서 배제 |
| App Server | thread/turn 제어, 이벤트·질문·승인·모델 목록, instructionSources. 공식 명세와 설치 스키마 | 관리 프로세스 수명·단일 writer 조정 필요. WebSocket/App Server 실험 상태를 고려 |
| SDK | 프로그램에서 start/run/resume 제공 | 현재 검사한 환경에 SDK 없음; 언어별 API·기능 범위는 동일하지 않음 |
| Desktop 도구 | 현재 도구 계약에 create_thread/send_message/read/wait/fork/handoff 존재 | 앱 작업 제어면이며 bare Terminal CLI와 동일하지 않음. 하위 저장소의 saved project 등록은 별도 조건 |
| 내장 subagent | 이번 실행에서 spawn·메시지·결과 수집 확인 | 부모 세션 트리 내부 기능이다. 이 호스트는 루트 포함 4슬롯; 일반 제품 한도로 확대 해석하지 않음 |

공식 근거: [CLI 명령](https://developers.openai.com/codex/cli/reference/), [비대화형 실행](https://learn.chatgpt.com/docs/non-interactive-mode), [App Server](https://learn.chatgpt.com/docs/app-server), [SDK](https://developers.openai.com/codex/sdk/), [Subagents](https://developers.openai.com/codex/subagents/). agents/queue의 최신 로컬 노출과 공식 명령 목록은 일치하지 않는 부분이 있어, 설치 도움말에서 확인한 기능과 실동작 미확인을 구분했다.

### 질문 API의 정확한 경계

조사 A가 0.149.1로 기본/experimental JSON Schema를 임시 생성해 대조했다. 실제 method는 **item/tool/requestUserInput**이다. 필수 params는 isBlocking, itemId, questions, threadId, turnId이며 응답에는 answers가 필요하다. JSON-RPC 요청 id는 외부 메시지에 존재하므로 업무 question ID와 따로 저장해야 한다.

공식 문서 일부의 tool/requestUserInput 표기를 그대로 구현하면 안 된다. 두 스키마 모두 method를 포함하지만 타입 설명은 experimental이다. 특정 모델·모드에서 질문 도구가 실제 호출되는 조건은 확인하지 않았다. native 요청 handler와 구조화 결과 방식은 서로 다른 채널로 설계한다. [공식 질문·승인 흐름](https://learn.chatgpt.com/docs/app-server#approvals)

### 모델·effort와 지침

- CLI 후보는 -m gpt-5.6-sol, -c model_reasoning_effort 값으로 지정한다. 실제 model/list와 지원 effort를 확인한 뒤 requested/effective 값을 각각 기록해야 한다. 문서의 모델 지원과 현재 계정 quota는 다르다. [모델 문서](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [설정 참조](https://developers.openai.com/codex/config-reference/)
- Codex의 기본 지침 탐색은 보통 Git root부터 cwd까지이다. D:\work\wiki 자체에 .git이 있으면 상위 D:\work\AGENTS.md 자동 로드를 전제할 수 없다. 이번 앱은 루트 지침을 사용자 메시지로 받았으므로 bare CLI와 상황이 다르다.
- AGENTS.md와 CLAUDE.md를 동등하게 취급한다는 작업 규칙이 곧 CLI의 자동 발견 동작은 아니다. 워커 계약에 공통·루트·저장소 지침의 명시적 읽기와 우선순위를 넣고, 가능한 경우 instructionSources로 대조해야 한다. 기본 문서 바이트 한도도 점검 대상이다. [지침 발견 규칙](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

## 4. Claude 기능과 제한 — 조사 B

| 실행 표면 | 확인 기능 | 한계 |
| --- | --- | --- |
| 대화형·background | --name, --session-id, --resume, --bg, attach/logs/respawn help | 활성 동일 세션을 복수 writer로 재개하지 않음 |
| Agent view | agents --json/--all/--cwd와 모델·effort 옵션을 메인에서도 확인 | agent 상태와 업무 완료 검증은 별개 |
| Cross-session messaging | 공식 ListAgents/SendMessage, notify_when_idle | 설치 버전 요건 충족, 실제 세션 가용성은 미시험 |
| print | -p, JSON/stream-json, --json-schema | --bg와 동시 사용 불가; 질문/권한 host 없이 자동 왕복 보장 안 됨 |
| Agent SDK | 스트리밍·resume, canUseTool의 AskUserQuestion 및 권한 요청 처리 | 검사한 환경에서 SDK 미설치; 질문 UI/정책/상태 저장은 별도 |
| subagents | 부모 결과 반환과 병렬 분해 | 사용자 질문 도구는 하위 agent에 직접 제공되지 않아 부모로 전달 필요 |
| agent teams | 공유 작업·팀 메시지 | 실험 기능, interactive 전제. in-process teammate 재개 제한; WT split-pane 지원 안 함 |
| workflows | 반복·병렬 파이프라인 | 실행 중 요구사항 질문을 받는 주 흐름에 적합하지 않음 |

근거: [CLI](https://code.claude.com/docs/en/cli-usage), [Agent view](https://code.claude.com/docs/en/agent-view), [Headless](https://code.claude.com/docs/en/headless), [SDK 질문 처리](https://code.claude.com/docs/en/agent-sdk/user-input), [Subagents](https://code.claude.com/docs/en/sub-agents), [Agent teams](https://code.claude.com/docs/en/agent-teams), [Workflows](https://code.claude.com/docs/en/workflows).

### 독립 세션 메시징은 기존 기능이다

공식 문서는 native Windows 2.1.234+를 지원하고, 설치 2.1.261은 이를 충족한다. 같은 머신의 native Windows 세션은 인증된 named pipe를 사용하며 WSL 세션과는 발견·IPC 영역이 다르다. 텍스트만 전달되고 대화·파일이 자동 공유되지 않는다. 수신 정책에 따라 전달·보류·거절되며 메시지가 사용자 권한 승인을 대신하지 않는다.

idle/exit 알림은 한 번의 구독이며 업무 성공을 뜻하지 않는다. 최종 결과와 검증을 별도로 회수해야 한다. 자체 child hook/스크립트의 inbox 경로는 문서에 있으나 일반 외부 제어 CLI나 내구성 있는 task API로 간주하지 않는다. 세션 인증 토큰은 조사하지 않았다. [독립 세션 메시징](https://code.claude.com/docs/en/cross-session-messaging)

### 모델·effort

로컬 도움말은 --model과 low/medium/high/xhigh/max effort를 제공한다. 모델 별칭은 시간이 지나면 다른 모델을 가리킬 수 있고, 지원 effort는 모델·제공자·계정에 따라 다르므로 실제 선택값을 확인해야 한다. Codex effort 집합을 Claude에 그대로 복사하지 않는다. 이번에는 Claude 모델 실행이나 구독·조직 allowlist 확인을 하지 않았다. [모델 설정](https://code.claude.com/docs/en/model-config)

## 5. 워크스페이스 감사 — 조사 C와 메인 검토

아래 항목은 **수정 제안**이며 기존 규칙·설정 파일은 변경하지 않았다.

| ID / 중요도 | 근거 파일·위치 | 영향 및 개선 제안 |
| --- | --- | --- |
| C-01 / 높음 | C:\Users\jaywa\.ai\rules\documentation.md:4, debate-records.md:6·10; git.md:5 | 이전 D:\workspace\repositories 및 자동 push가 현재 경로·권한과 충돌. 사용자 요청 우선으로 처리하고 원본 규칙은 후속 정비 |
| C-02 / 높음 | D:\work\README.md:14와 Codex 지침 발견 문서 | 저장소 안에서 상위 루트 지침도 자동 적용된다는 설명은 보장되지 않음. 지침 manifest·명시적 로드 검증 필요 |
| C-03 / 필수 기능 누락 | D:\work\.workspace\windows-terminal\Configure-Terminal.ps1:18·19·32, Start-Workspace.ps1:20 | bare CLI 실행과 창 배치만 수행. task/session ID·질문·상태·접수·잠금 계층이 없음. 기존 설계의 명시적 제외 사항이기도 함 |
| C-04 / 중간 | Configure-Terminal.ps1:30·33 | AI + logs의 logs는 빈 Work Shell. 자동 출력 수집으로 오인 가능; 명칭 또는 명시적 로그 구독을 보완 |
| C-05 / 중간 | 전역 ai-roles.md:11·15, AGENTS.template.md:56, Terminal tasks:7 | Claude 모델 중심 전역 규칙과 추상 Codex 배정값. 문서 model/effort가 실제 CLI 인자와 연결되지 않음 |
| C-06 / 중간 | D:\work 비 Git, .workspace\templates\README.md:3 | 루트 규칙·템플릿·실행 원본의 현재 로컬 버전 관리 부재. 별도 원본 저장소와 dry-run/diff 기반 동기화 후보 |
| C-07 / 중간 | root AGENTS.md/CLAUDE.md 동일 해시, template↔wiki 치환 비교 | 현재 일치하나 복제 drift 검사가 없음. 저장소 고유·생성 원본 보존 필요 |
| C-08 / 중간 | 바로가기 조사 및 windows-terminal-workspace-tasks.md:20 | 현재 .lnk는 정상이나 생성 절차 재현성이 부족. 숨김 실행 실패 시 오류 표시 경로도 보완 |
| C-09 / 중간 | wiki/docs/README.md:10 | “같은 오케스트레이터의 Codex 서브에이전트”는 Claude 선택 시 모순. 후속 원문 정정 후보 |
| C-10 / 낮음 | D:\work\README.md:96 | 빈 세션 도구 정책 절. 표시 계층과 통신 계층의 차이를 설명할 필요 |
| C-11 / 낮음 | Configure-Terminal.ps1:6, Start-Workspace.ps1:5·10 | Store Stable Terminal 경로·주 모니터 고정. 현재 지원 범위 명시 필요 |

현재 Terminal 구성은 관리 프로필 3개, 프로젝트 액션 102개와 보조 액션 3개, keybinding 3개를 갖는다. 조사 C는 원본 백업을 기준으로 Verify-Terminal.ps1의 재생성·기존 설정 보존 검사를 재현했고 PASS를 받았다. 파서 오류 0, Preview 정상, 설정 파일의 전후 해시 동일을 확인했다. 이는 **설정 구조 검사**이며 GUI 클릭, 모델 실행, 세션 메시지 E2E 성공을 의미하지 않는다.

### 기존 아이디어·구현의 재사용 범위

- [이전 Claude Workspace Orchestrator 아이디어](../idea/claude-workspace-orchestrator.md)는 회사 root/src/release·Deploy Agent를 전제로 한 별도 구상이다. 현행 D:\work 실행 규칙으로 가져오지 않는다.
- D:\work\orca의 README: 추적·후속 지시·완료 알림·worktree 기능은 재사용 후보다. PATH에서 orca 명령을 찾지 못했으며 이번 앱에서 Orca 전용 callable tool도 발견하지 못했다. 따라서 설치·작동·통합 완료로 주장하지 않는다.
- D:\work\AutoAgent의 README: GitHub 이슈와 자동 commit/push 중심이다. 현재 요청과 권한 모델이 달라 그대로 채택하지 않는다. 문서의 --full-auto/--instructions는 조사한 Codex 0.149.1 파서에서 거절됐으므로 CLI 호환성 재검토도 필요하다.
- 새 하네스 저장소를 만들기 전에 위 후보의 통신·질문·상태 계약을 좁게 검증하는 것이 후속 작업이다.

## 6. 공통 요구사항과 추가 구현

| ID | 요구사항 | 기존 기능 / 추가할 부분 |
| --- | --- | --- |
| R-01 | 단일 도구·프로젝트 경계 | cwd·sandbox는 기존 기능. repo 등록·정규 경로 검증·지침 로드 확인은 추가 |
| R-02 | 프로젝트/task/attempt/session 연결 | 공급자 session ID는 존재. 업무 ID 매핑·저장·소유권은 추가 |
| R-03 | 전달·접수·중복 처리 | 실행/메시지 기능은 존재. idempotency·접수 기록·전송 불명 상태 처리 추가 |
| R-04 | 질문·답변 | native 질문 또는 메시징/구조화 출력 활용. question ID 라우팅·미응답 상태·권한 질문 구분 추가 |
| R-05 | 진행·결과 | JSONL/상태/idle 이벤트 활용. 업무 성공 판정·검증 증거 회수 추가 |
| R-06 | 복구·동시성 | resume 기능 활용. 단일 writer·lease·재시도·재조정 추가 |
| R-07 | 모델/effort | 공급자 옵션 활용. requested/effective·버전·fallback 근거 기록 추가 |
| R-08 | 루트 답변 범위 | 확정 요구사항은 루트가 답변. 승인·새 설계 결정은 사용자에게 올리는 정책 추가 |
| R-09 | Terminal 유지 | 기존 창 배치 활용. 작업 상태 표시·로그 연결 및 관리 세션 여부 명시 추가 |

추가 구현은 제안이지 현재 파일에 숨어 있는 기능이 아니다. durable project context와 상시 실행 프로세스는 서로 다르며, MVP는 저장된 session ID 재사용으로 시작할 수 있다.

## 7. 질문·답변·가정

| ID | 사용자 결정이 필요한 항목 | 현재 답변·권장 초안 | 영향 / 상태 |
| --- | --- | --- | --- |
| Q-01 | 기존 독립 TUI를 반드시 그대로 제어해야 하는가, 관리 워커를 새로 시작해도 되는가? | 미응답. 새 관리 워커 + 기존 수동 창 유지 권장 | 전송 방식 확정만 needs-input |
| Q-02 | 구현 원본 저장소는 Orca 등 기존 프로젝트인가, 별도 저장소인가? | 미응답. 기존 후보 계약 검사 후 결정 | 코드 위치·기술 스택 확정만 needs-input |
| Q-03 | 루트가 자동으로 답해도 되는 질문 범위는? | 미응답. 이미 확정된 요구사항 재전달까지만 제안 | 질문 정책 확정만 needs-input |
| Q-04 | 실험적 App Server/remote 경로를 수용할 것인가? | 미응답. 첫 검증은 exec/resume, 실시간 공유는 별도 gate | 상시 TUI 경로만 needs-input |
| Q-05 | 동시 작업 수·시간/비용 한도·로그 보존 기간은? | 미응답. pilot는 프로젝트 1개·동시 1작업, 장기 값은 미정 | 다중 프로젝트·운영 설정만 needs-input |

확정 답변: 이번 owner는 모두 Codex, 현재 경로는 D:\work, 산출물은 wiki/docs, 조사·문서만 수행, 사용자 미응답은 모아서 기록한다. “이어서” 및 08:50 후속 예약은 이 범위의 미완료 작업 재개로 해석하며 구현 승인으로 해석하지 않았다.

가정: 같은 Windows 사용자·같은 provider 실행 영역을 기본 대상으로 한다. 웹 화면 작업이 아니므로 Vercel/Supabase·UX 3종 샘플은 적용하지 않는다. 런타임 저장 위치·제품 구조는 설계 제안이며 이번에는 생성하지 않았다.

## 8. 미확인과 후속 검증

1. Windows foreground App Server에서 remote TUI + queue의 실제 전달/구독/동시 writer 동작.
2. native item/tool/requestUserInput 노출·blocking·응답 및 재연결 후 pending request 처리.
3. 실제 계정에서 모델/effort와 동시 실행 한도. 앱의 지원값을 CLI 인증 환경에 전이하지 않음.
4. Claude 독립 세션의 현재 inbound 정책·가시성·named pipe 도달 여부.
5. SDK의 실제 설치·호환성, Orca의 로컬 실행 및 기존 구현 재사용 범위.
6. 공급자 history 보존·로그 및 thread 시작의 부수 상태 변경. 실제 사용자 세션을 대상으로 첫 시험하지 않음.

이 항목은 설계 초안에 명시된 검증 backlog다. 확인 불가능한 기능을 확정하지 않는 것으로 이번 조사 범위는 완료할 수 있다.

## 9. 로컬 확인 명령과 결과 요약

| 조사 | 명령/검사 | 결과 |
| --- | --- | --- |
| 메인·A | C:\Users\jaywa\AppData\Roaming\npm\codex.cmd --version | 0.149.1 |
| 메인·B | C:\Users\jaywa\AppData\Roaming\npm\claude.cmd --version | 2.1.261 |
| 메인·A | codex agents --help; queue --help; exec resume --help | 원격/큐 옵션, resume의 지원 옵션 확인; 메시지는 보내지 않음 |
| A | codex app-server daemon version | Windows에서 Unix-only 오류; daemon 시작 안 함 |
| A | app-server generate-json-schema 기본/--experimental, 임시 --out | 실제 질문 wire method 확인; 임시 결과 정리 |
| 메인·B | claude agents --help; claude --help | JSON 상태·cwd 필터·모델·effort·background 옵션 |
| A/B | 전역 npm 목록 및 Python 패키지 조회 | 조사한 환경의 SDK 미설치 |
| C | Start-Workspace.ps1 -Tool Codex -Preview, PowerShell AST 파서 | Preview 정상, 오류 0; 창 실행 안 함 |
| C | Verify-Terminal.ps1 -BaselinePath (기존 20260905-225041-803 백업) | 재생성·기존 설정 보존·ID·프로젝트 레이아웃 PASS |
| 메인 | Git status/branch/log/diff --check, 기존 본문 비교 | 문서 범위 확인; 최종 상세는 tasks 검증 기록 |

메인이 다시 확인한 핵심은 두 CLI 버전, agents/queue/resume·Claude agents 도움말, 공식 질문·메시징·지침 발견 규칙, Terminal 실행 원본이다. 기타 표의 로컬 세부 검사는 담당 조사 에이전트 결과로 명시했다. 설정·로그 전체나 시크릿을 외부 문서 조회에 전송하지 않았다.

## 10. 완료 기준

- [x] A/B/C 병렬 조사와 메인 핵심 근거 검토
- [x] 확인 기능·제안·미확인 구분 및 기존 기능/추가 구현 경계
- [x] 최소 왕복과 실패·복구 검증 절차 설계
- [x] 작업별 owner/model/effort/의존성/verification/status 기록
- [x] 미응답 결정만 미확정으로 보존
- 최종 파일·링크·범위·기존 변경 보존 검사는 [tasks](workspace-harness-tasks.md)에 기록한다.
