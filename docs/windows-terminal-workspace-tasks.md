# Windows Terminal 작업 계획

orchestrator: Codex

| id | 작업 | owner | model | effort | depends_on | parallel_group | verification | status |
|---|---|---|---|---|---|---|---|---|
| T1 | 기존 설정 조사·분석·설계 | Codex | gpt-6-astra | medium | - | - | 프로필 수, 경로, Git 상태 확인 | done |
| T2 | Terminal 설정과 실행 진입점 작성 | Codex | gpt-6-astra | medium | T1 | A | PS5 파싱, JSON 및 보존 검증 | done |
| T3 | 공식 스키마 독립 검토 | Codex | gpt-5.6-sol | medium | T1 | A | 공식 문서와 action 구조 비교 | done |
| T4 | 설정 설치·실행 및 문서 갱신 | Codex | gpt-6-astra | medium | T2,T3 | - | 설치 전 백업, 창/프로세스, 재적용 검사 | done |

T2는 `.workspace/windows-terminal`, T3는 읽기 전용 검토를 담당한다. 실제 사용자 설정 변경은 단일 작성자가 T4에서 순차 수행한다. wiki 문서는 `docs`에만 추가한다. 현재 요청에서 Git commit/push/merge는 수행하지 않는다.

## 검증 결과

- 2026-09-05: 실제 설정 적용 완료. 기존 프로필 7개, 사용자 명령 4개와 사용자 단축키 및 비관리 설정 보존 확인.
- 51개 저장소 × Codex/Claude = 102개 프로젝트 명령. 모든 시작 경로, 25% 로그 분할, 고유 ID 검증 통과.
- PowerShell 5.1과 현재 PowerShell에서 `Verify-Terminal.ps1` 통과. 버전별 메뉴 정렬 차이를 ordinal 정렬로 해결하고, UTF-8 한국어 프로필 이름 읽기를 명시적으로 처리했다.
- `ORCHESTRATOR | Codex`, `PROJECTS | Codex` 두 가시 창과 Codex 셸 1개, 일반 셸 2개 실행을 확인했다.
- 바탕화면 `Work - Codex.lnk`, `Work - Claude.lnk` 생성 완료. Claude CLI는 현재 Codex 작업에 섞어 실행하지 않았다.
- 명령 팔레트의 GUI 클릭은 자동화하지 않았다. 프로젝트 메뉴는 공식 스키마 구조와 생성 설정으로 검증했다.
- 설정 원본 백업: Terminal LocalState의 `settings.json.work-backup-20260905-225041-803`. 메뉴 정렬 갱신 시 추가 백업도 생성했다.
- wiki `git diff --check` 통과.
