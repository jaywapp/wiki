# workspace-harness 작업 계획

- 프로젝트: wiki; orchestrator: **Codex**
- 작업 유형: non-ui; 웹 스택·UX/UI 게이트·스킬: N/A
- 상태: **done — 이번 조사·문서 작성·최종 검증 완료**
- 작성일·갱신일: 2026-09-06 (Asia/Seoul)
- 관련 문서: [분석](workspace-harness-analysis.md), [설계 초안](workspace-harness-design.md)
- 이번 범위: 조사·문서 작성. 후속 구현은 별도 요청 전 실행하지 않음.

## 1. 모델·병렬 실행 원칙

A/B/C는 사용자가 지정한 gpt-5.6-sol과 effort를 명시해 생성한 Codex 서브에이전트다. 세 생성이 성공했고 fallback은 필요하지 않았다. B는 Claude의 기능을 조사했지만 실행 주체는 Codex였다.

메인 표의 gpt-6-astra/high는 통합·검토 역할 배정값이다. 메인의 별도 모델 전환이나 effort 재설정 호출은 하지 않았으며, 이 표를 backend 실측 effort 증명으로 사용하지 않는다. PATH CLI/앱 버전과 모델 지원은 별도 검증 대상이다.

에이전트는 공유 문서를 수정하지 않고 결과를 메인에게 반환했다. 메인만 세 문서와 인덱스를 작성했다. 같은 파일을 통합하는 T-02/T-03은 순차 진행했다.

## 2. 이번 조사·문서 작업

| ID | 작업 | owner | model | effort | depends_on | parallel_group | files/범위 | verification | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-00 | 공통 규칙·지침·Git baseline | Codex | gpt-6-astra | high | - | P0 | 루트/wiki 읽기 | 공통 규칙 전체, 지침, 기존 변경 확인 | done |
| T-A | Codex 기능 조사 | Codex | gpt-5.6-sol | high | T-00 | P1 | 공식 문서/설치 CLI 읽기 | 버전·help·App Server 생성 스키마·CLI 한계 | done |
| T-B | Claude 기능 조사 | Codex | gpt-5.6-sol | high | T-00 | P1 | 공식 문서/설치 CLI 읽기 | 버전·help·native 메시징·SDK·Windows 한계 | done |
| T-C | 워크스페이스 감사 | Codex | gpt-5.6-sol | medium | T-00 | P1 | 규칙/템플릿/Terminal 설정 | 파일·라인·호출관계·정적 검증·기존 설정 보존 | done |
| T-01 | 공통 요구사항·검증 시나리오 | Codex | gpt-6-astra | high | T-00 | P1 | 문서 초안 | R-01..R-09와 왕복/실패 검증 대응 | done |
| T-02 | 근거 검토·설계 통합 | Codex | gpt-6-astra | high | T-A,T-B,T-C,T-01 | P2 | 요청 문서 3종 | 확인/제안/미확인, 대안·기존/추가 구현 구분 | done |
| T-R | 통합 문서 읽기 전용 재검토 | Codex | gpt-5.6-sol | medium | T-02 | P3 | 요청 문서 3종 읽기 | 조사 범위·사실·의존성·검증 모순 검토 | done |
| T-03 | 문서·인덱스 검증 및 보고 | Codex | gpt-6-astra | high | T-02,T-R | P4 | 문서 3종, README.md, docs/README.md | 내용·링크·표·범위·기존 본문 보존 | done |

### 의존 순서

~~~text
P0: T-00
P1: T-A || T-B || T-C || T-01
P2: T-02 (P1 전체 결과 수신 후)
P3: T-R || 메인 사전 파일 검사
P4: T-03 (리뷰 반영 후 최종 검증·보고)
~~~

조사 A/B/C의 canonical task 이름은 /root/codex_research, /root/claude_research, /root/workspace_audit다. 메인과 세 에이전트가 이 호스트의 4개 슬롯을 사용했다. 이후 같은 조사를 중복 생성하지 않았고, C 에이전트에 T-R의 짧은 읽기 전용 재검토를 요청했다.

## 3. 조사 검증 결과

| 검증 | 결과 | 검증 범위 |
| --- | --- | --- |
| 실행 모델 배정 | PASS | A/B gpt-5.6-sol/high, C gpt-5.6-sol/medium 생성 성공, 대체 없음 |
| CLI 버전 | PASS | 메인 재확인: Codex 0.149.1, Claude 2.1.261 |
| Codex 명령 | PASS | 메인이 agents/queue/exec resume help 재검토. queue 기능 존재와 Windows 공유 서버 제약을 분리 |
| Codex 질문 wire method | PASS (스키마) | A의 0.149.1 기본/experimental schema: item/tool/requestUserInput. 모델 실호출은 미실행 |
| Claude 메시징 | PASS (문서·버전 요건) | 메인이 공식 cross-session/SDK/teams 본문 재검토. 실제 세션 전달은 미실행 |
| 지침 로드 | 발견 사항 기록 | 공식 Git root→cwd 탐색과 루트 README 가정의 차이 확인 |
| Terminal 원본 | PASS (읽기) | 메인이 bare CLI 프로필·빈 shell·Start/Verify 원본 대조 |
| Terminal 재생성·보존 | PASS (C 실행) | Verify-Terminal.ps1 검사, 기존 설정 전후 해시 동일 |
| Terminal Preview / parser | PASS (C 실행) | Preview 정상, 파서 오류 0. GUI 명령 팔레트/창 시작은 미실행 |
| 메인 Git 읽기 | PASS (수정된 명령) | 소유권 차이 및 비 Git cwd 오류 후 특정 repo의 -c safe.directory와 -C로 재확인, 전역 설정 변경 없음 |
| 하네스 E2E·복구 | NOT RUN | 조사 범위이므로 설계 V/F 절차만 작성 |
| 앱 작업 생성·provider 작업 실행 | NOT RUN | 조사용 내장 subagent 외 별도 작업/모델 시험을 시작하지 않음 |
| 최종 문서 검사 | PASS | 다음 절의 파일·표·링크·범위 검사 완료 |

SDK 미설치는 검사한 전역 npm/Python 환경에 한정한다. 현재 provider의 quota·권한·실제 동시 실행 상한은 검증하지 않았다. Verify-Terminal PASS를 세션 간 통신 성공으로 해석하지 않는다.

## 4. 최종 문서 검증

- 요청된 세 문서의 실제 존재·UTF-8·내용·상호 링크를 검사한다.
- task 표의 owner/model/effort/depends_on/parallel_group/verification/status 및 ID 중복·의존 순환을 검사한다.
- 설계의 결과 schema를 JSON으로 파싱하고 필수 상태·필드를 확인한다.
- 기존 Terminal 문서 4개를 시작 시 본문과 비교한다.
- 기존 인덱스 두 개는 이번 링크 추가분을 제외한 본문이 동일한지 비교한다.
- Git diff --check와 status로 범위를 확인한다. 기존 Git 변경과 이번 추가 변경을 구분한다.
- Markdown 링크·충돌 마커·빈 후속 작업·조사 진행 중 잔여 문구를 검사한다.
- 문서만 변경했으므로 애플리케이션 build/test는 실행하지 않는다.

최종 검사 결과: **PASS**.

- 요청 문서 3개를 엄격한 UTF-8 디코딩으로 읽었고, 실질 본문·상호 참조를 확인했다.
- 이번 작업 8행과 후속 작업 9행, 총 17행의 필수 10열·고유 ID·Codex owner·모델/effort·의존성 존재·비순환을 확인했다.
- 설계 결과 schema의 JSON 파싱·7개 required 필드 연결·상태 enum을 확인했다. 실제 모델의 schema 준수는 E2E 미실행이므로 확인하지 않았다.
- V-01..V-08과 F-01..F-12가 있으며, 리뷰에서 발견한 검증 실패 전이·pilot 의존성·host 증거 쓰기 경계를 보완했다.
- 깨진 로컬 링크 0개, 충돌 마커·템플릿 잔여·후행 공백 없음.
- 기존 Terminal 문서 4개는 시작 시 본문과 동일하다. README.md와 docs/README.md는 이번 링크 추가분을 제외하면 기존 본문과 동일하다.
- Git diff --check 통과. 기존 인덱스의 LF→CRLF 예고 경고만 있었고 오류는 없었다. branch와 HEAD는 각각 codex/workspace-environment-20260904, 2f41092로 유지됐다.
- 이번 변경은 요청 문서 3개와 기존 인덱스 2개의 링크 추가다. 기존 미추적 Terminal 문서를 이번 산출물로 간주하지 않는다.
- 제품 build/test, provider 모델을 호출하는 pilot, 설치·설정 변경·commit/push/PR/merge·배포는 수행하지 않았다.

## 5. 다음 구현 작업 — 미실행 계획

아래는 이번 조사 완료 조건에 포함되지 않는다. status의 planned_out_of_scope는 향후 사용자 요청 후 실행할 후보, needs_input은 특정 설계 결정 의존을 뜻한다. 모든 owner는 현재 선택한 Codex 프로필이며 Claude 구현은 별도 핸드오프 계획이 필요하다.

| ID | 작업 | owner | model | effort | depends_on | parallel_group | files/범위 | verification | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N-00 | pilot 필수 결정·구현 범위 확정 | Codex | gpt-6-astra | high | T-03 | N0 | 승인된 프로젝트 docs | Q-01..Q-03, 프로젝트 1개·동시 1작업의 pilot 한도 확인 | needs_input |
| N-01 | 기존 Orca/앱 기능 재사용 및 전송 방식 비교 검증 | Codex | gpt-5.6-sol | high | N-00 | N1 | 선택한 repo의 조사/시험 영역 | 새 구현 없이 가능한 범위, Windows queue remote 여부 | planned_out_of_scope |
| N-02 | exec/resume 단일 프로젝트 왕복 pilot | Codex | gpt-5.6-sol | high | N-01 | N2 | pilot schema/prompts/evidence | V-01..V-08, F-01..F-03/F-11 | planned_out_of_scope |
| N-03 | 빌드 가능한 코어·업무 schema·상태 저장·소유권 | Codex | gpt-5.6-sol | high | N-02 | N3 | 선택 repo Core/Store 계약 | 상태 전이·idempotency·single writer·트랜잭션 | planned_out_of_scope |
| N-04 | ExecAdapter·명시적 지침/모델 preflight | Codex | gpt-5.6-sol | high | N-03 | N4 | Adapters/Exec, Preflight | 정확한 UUID/cwd, 인코딩, JSONL·오류·한도 | planned_out_of_scope |
| N-05 | 질문 라우팅·루트 도구·결과 검증 | Codex | gpt-5.6-sol | high | N-03 | N4 | Questions/RootTools | 잘못된 답변 거절, 승인 경계, 근거 검증 | planned_out_of_scope |
| N-06 | 템플릿·원본 관리·Terminal 연결 정비 | Codex | gpt-5.6-sol | medium | N-04,N-05 | N5 | 승인된 원본/생성물/설치 diff | 사용자 설정 보존, root 규칙 로드, 모델 실측 표시 | planned_out_of_scope |
| N-07 | crash recovery·DAG·다중 repo 운영 검증 | Codex | gpt-5.6-sol | high | N-06 | N6 | 복구/스케줄러/통합시험 | Q-05 운영 한도 확정, F-04..F-10/F-12, 재시작·기존 변경 보존 | needs_input |
| N-08 | 실시간 AppServerAdapter·remote TUI | Codex | gpt-5.6-sol | high | N-01,N-03 | N-OPTIONAL | 조건부 adapter/supervisor | native 질문·queue·구독·단일 writer·Windows 생명주기 | needs_input |

N-04/N-05만 코어 계약 확정 후 서로 다른 폴더·테스트를 맡겨 병렬화할 수 있다. 공통 schema 변경이 필요하면 먼저 N-03에 반영하고 순차 통합한다. N-06은 사용자 규칙과 설정을 함께 다루므로 한 담당자가 수행한다. Q-05의 장기 운영 값은 N-07 전에 확정하고, N-08은 Q-04 승인 및 선택 조건이 충족된 경우에만 별도로 진행한다. Q-04와 장기 Q-05 미응답을 N-02의 기본 exec pilot 전체를 막는 조건으로 사용하지 않는다.

첫 구현 요청은 N-00..N-02까지만 좁게 묶는 것이 권장안이다. 전송·질문 왕복을 입증하기 전에 전체 coordinator/UI를 구현하지 않는다.

## 6. 진행 기록

| 일시 (KST) | 작업 | 상태·결과 |
| --- | --- | --- |
| 2026-09-06 03:45 | 예약 시작 | orchestrator=Codex, 범위·지침·기존 변경 확인 |
| 03:45 실행 구간 | T-A/T-B/T-C, T-01 | 요청 모델로 병렬 조사와 메인 요구사항·초안 작성 |
| 조사 결과 회수 | T-A/T-B/T-C | 모두 완료. 공식 문서·로컬 help/schema/설정 근거 수신 |
| 2026-09-06 08:50 | 후속 1회 예약·이어서 진행 | 문서가 초안임을 확인. 기존 조사 결과를 재사용하여 통합 재개 |
| 08:50 이후 | T-02 | 분석·설계·후속 작업 통합, 메인 핵심 도움말 재검토 |
| 최종 리뷰 | T-R | pilot/운영 결정 의존 분리, validating 실패 전이, 워커 읽기 권한과 host 증거 쓰기 구분 반영 |
| 최종 검사 | T-03 | 파일·표·schema·링크·기존 변경 보존·Git 범위 PASS, 조사·문서 완료 |

미응답 질문은 분석에 보존했다. 이번 조사·문서 작성의 완료 상태를 후속 구현의 승인/완료와 혼동하지 않는다. 추가 반복 예약은 생성하지 않는다.

## 7. 완료 조건

- [x] T-00/T-A/T-B/T-C/T-01/T-02 완료 및 근거 기록
- [x] 확인 기능·제안·미확인 구분
- [x] 최소 왕복·실패·복구 검증 절차 작성
- [x] 다음 구현 작업과 사용자 결정 항목 분리
- [x] T-03 최종 파일·인덱스·범위 검증 및 한국어 보고
