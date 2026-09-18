# 하네스 구현 재개 작업 계획

orchestrator: Codex

| ID | 작업 | owner | model | effort | depends_on | parallel_group | files | verification | status |
|---|---|---|---|---|---|---|---|---|---|
| E00 | 선행 세션·문서·Git 확인 | Codex | gpt-6-astra | high | - | - | wiki/docs 읽기 | T-03 완료 및 N 후속 범위 확인 | done |
| E01 | 원본 저장소 준비 | Codex | gpt-6-astra | high | E00 | P0 | workspace-harness | 권장 로컬 경로 가정 공지·초기화 | done |
| E02 | 기존 Orca 재사용 검토 | Codex | gpt-5.6-sol | high | E00 | P0 | orca 읽기 전용 | 실제 API·실행 의존성·재사용 비용 | done |
| E03 | 독립 구현용 코어 계약 검토 | Codex | gpt-5.6-sol | high | E00 | P0 | 기존 설계 읽기 전용 | 질문/상태/중복/복구 API 계약 | done |
| E04 | 소형 host·단일 프로젝트 왕복 pilot | Codex | gpt-6-astra | high | E01,E02 | P1 | workspace-harness/tools/PilotHost | 사용자 승인 후 실제 질문·resume·근거 PASS | done |
| E05 | 코어·저장 계약 확정 | Codex | gpt-6-astra | high | E03,E04 | P2 | workspace-harness/src/Core | 계약 build PASS | done |
| E06 | ExecAdapter와 지침 preflight | Codex | gpt-5.6-sol | high | E05 | P3 | workspace-harness/src/Adapter | 23/23 PASS, 실제 wiki resume PASS | done |
| E07 | 질문·결과·루트 도구 | Codex | gpt-5.6-sol | high | E05 | P3 | workspace-harness/src/Coordinator | 22/22 PASS, 실제 review·재조회 PASS | done |
| E08 | Terminal 연결·운영 검증·로컬 병합 | Codex | gpt-6-astra | high | E06,E07 | P4 | 통합/설치/문서 | 로컬 90개 검사·실제 왕복·main merge PASS | done |

E02/E03은 수정 없이 보고서만 반환한다. E06/E07은 코어 계약 확정 후 변경 경로를 분리한다. Git 브랜치·통합 변경은 메인만 수행한다.

## 검토 결과

- 읽기 전용 MVP 구현은 `D:\work\workspace-harness`의 `c620e74`이며 `9ac8031`로 로컬 main 병합을 완료했다. 원격 생성·push·PR 병합은 미실행이다. 이 wiki의 기존 미커밋 문서와 변경은 보존했다.
- 실제 관리 하네스에서 wiki task가 질문/답변→같은 UUID의 2개 invocation→ResultReady→루트 원문 검토→Completed로 진행됐고 새 CLI에서도 재조회했다. 세부 근거와 운영법은 `workspace-harness/docs/harness-verification.md`, `harness-operations.md`를 기준으로 한다.
- E08 완료 범위는 읽기 전용 MVP다. 쓰기 워커·자동 프로젝트 Git 병합/배포·Claude adapter·기존 TUI 공유·강제 복구는 후속 범위로 남는다. Windows Terminal 상태 탭 추가 명령은 exit 0이며 화면 캡처 검증을 주장하지 않는다.

- 2026-09-06 사용자 명시 승인 후 읽기 전용 wiki pilot을 실행했다. 스키마 UTF-8 BOM 오류를 수정한 뒤 정확한 UUID 재개·nonce 기억·질문/응답·README 근거/두 문장 대조를 통과했다. 원시 기록은 workspace-harness/artifacts의 Git 제외 경로에만 보관한다.
- 첫 통합은 읽기 전용 관리 워커에 한정한다. 쓰기 워커·자동 프로젝트 병합·Claude adapter·기존 TUI 공유는 별도 검증 항목이며 이번 pilot 성공으로 완료 처리하지 않는다.
- Core 계약을 고정하고 adapter와 coordinator를 파일 소유권이 겹치지 않도록 병렬 위임했다. 메인이 CLI·Terminal 상태 조회·통합 검증·Git을 담당한다.

- E03: 논리적 재시도 Attempt와 각 exec/resume 호출 Invocation을 분리한다. 질문을 여러 번 주고받을 때 provider UUID와 프로세스별 결과를 잃지 않도록 한다.
- E03: 업무 version과 이벤트 cursor를 구분하고, 질문 답변·상태·writer 소유권 변경을 원자적으로 저장한다.
- E03: 실행 여부가 불명확하면 recovering으로 남기고 재실행하지 않는다. 시간 경과만으로 writer 소유권을 다른 작업에 넘기지 않는다.
- E03: adapter와 coordinator/질문 검증을 분리한 계약 스케치를 받았다. 실제 코어 API 확정은 왕복 pilot 이후 E05에서 수행한다.
