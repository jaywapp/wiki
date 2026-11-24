# AI Harness · Context/Token Optimization Scout — 2026-11-25

조사 범위: 11월 24일 UTC 공개 GitHub 자료. develop의 11/23, 11/24 Scout 원문을 직접 조회해 중복 제거. 오늘 canonical 경로는 조회 시 HTTP 404였다. 전체 Wiki 및 모든 릴리스의 전수 검사는 아니다. 새로 독립 검증된 동일 품질 작업당 Provider 청구 비용 절감률은 없다.

## 1. gh-aw — Adaptive Routing의 비용 표본 정합성
원본: https://github.com/github/gh-aw/issues/80782
소스: https://github.com/github/gh-aw/blob/main/actions/setup/js/routing_history.cjs (조회 blob 5e152e9881a40227f28f2595dbc566407e325749).
신규성: 11/24 이슈는 단순 Child 비용 누락이 아니라 비용 예측에 사용하는 두 EMA의 모집단 불일치를 지적한다. 신고 예시에서 첫 실행은 main 30 credits, Child 가격 미상으로 전체 null; 두 번째 실행은 전체와 main 모두 10. 기존 계산은 전체 10, main 28로 산출해 단가 비율 0.1인 후보의 예측 비용이 -15.2 credits가 된다. 이는 합성 예시이지 실제 청구액이 아니다.
직접 조회한 main의 averages 함수는 전체 비용이 null이 아닐 때만 두 EMA를 함께 갱신한다. 따라서 현재 소스는 신고된 불일치를 방지하는 형태다. 수정 커밋 및 릴리스 시점은 확인하지 못했다. 예시를 현재 코드로 계산하면 두 EMA 모두 10, 예측 1 credit이다.
절감 원리: 가격 미상 요청을 0으로 처리하지 않고 동일 표본으로 전체/모델 비용을 추정하여 잘못된 저가 모델 선택 및 재작업을 방지한다. 장점은 비용 예측의 일관성, 단점은 완전 가격 표본이 적을 때 선택이 느려지는 것. 실제 절감률 미측정.
적용: Claude Code/Codex adapter에서 root 및 child request receipt를 합산하고 priced_complete 여부를 별도 저장. P4 리뷰, UE5 로그 분석, TeamCity 장애 진단별로 모델/effort 후보를 분리. 합성 표본 30개에서 total>=main>=0, predicted>=0, unknown을 무료로 처리하는 경우 0을 검증. 평가: 바로 적용.

## 2. gh-aw — Routing verdict와 영속 reconciliation
원본: https://github.com/github/gh-aw/issues/80781 및 https://github.com/github/gh-aw/issues/80780
신규성: 11/24 adaptive routing pilot 준비 과정의 구체적 실패 분류 및 retention 문제. 병합 여부 미확인.
#80781은 endpoint 불일치와 정책 거부가 모델 실패로 집계될 수 있음을 지적한다. 선택된 모델 자체의 실패와 플랫폼 차단을 분리해야 한다. 단, 정책 위반을 무조건 성공이나 무조건 제외로 처리해서는 안 되며 실제 선택/실행 정책과 원인을 확인한다.
#80780은 runs.jsonl 500행 retention과 조회 페이지의 최신 100개씩의 이벤트별 실행 목록을 reconciliation 근거로 겸용할 때 이미 처리한 실행이 재집계되는 문제를 설명한다. 예시에서 run 50이 삭제된 뒤 run 556에서 다시 unsaved로 기록되어 unexplained가 1에서 2로 증가한다. 합성 사례이며 운영 발생률 미확인.
원리: 비용/성공률 학습 데이터의 중복과 오염을 줄인다. 직접 토큰 절감은 아니며 잘못된 routing 탐색 및 재시도 방지 효과는 미측정. 장점은 재현 가능한 모델 선택, 단점은 장기 idempotency index와 오류 분류 유지 비용.
적용: TeamCity build ID와 attempt, P4 CL, task ID, routing generation을 키로 영속 reconciliation ledger 구성. 원본 audit retention과 처리 완료 인덱스 분리. 600회 합성 실행, API partial failure, retry 및 오래된 event 재등장 실험. 중복 비용 0, infrastructure 오류의 모델 성능 오귀속 0을 목표로 한다. 평가: PoC 최우선.

## 3. gh-aw — Instruction Prefix 계약의 실제 파일 단위 경량화
원본: https://github.com/github/gh-aw/issues/80791
소스: https://github.com/github/gh-aw/blob/main/scripts/check-instruction-prefixes.py (blob 752dab3601862063bbc4f5a1cb171ddb517783f0).
11/23 보고서의 일반 Prefix Attribution과 달리 11/24 Audit은 구체적 수정 대상과 검증 명령을 제시한다. 직접 확인한 검사기에는 QUERY_BYTES=8000, CONTRACT_BYTES=7500, instruction-prefix-end marker가 존재한다. 이 한도는 해당 프로젝트의 계약이며 Claude Code/Codex 공통 한도가 아니다.
4개 실행의 첫 요청 중앙값 26,899.5자, 보고된 p95 28,699자. 60초 조회 제한으로 약 2시간만 관측했고 proxy 입력 토큰은 확보하지 못했다.
- test-quality-sentinel.md: 계약 14,988B, 목표 7,500B. 약 49.96% 계약 바이트 감소 가능(전체 파일 29,813B의 약 25.1%). 필수 지침을 marker 앞에 배치.
- daily-code-metrics.md: 시각화 지침 1,122B를 on-demand skill로 이동하는 제안. 요청 27,546자 대비 약 4%라는 Audit 추정은 단위가 달라 실제 토큰 절감률이 아니다.
- mattpocock-skills-reviewer.md: 검색으로 다시 발견하는 목록 1,022B 삭제 제안. 선택 힌트는 보존.
원리: mandatory policy와 선택적 실행 지침을 분리하고 중복 discovery 제거. 장점은 첫 요청 경량화, 단점은 skill 선택 실패와 지침 손실. 아직 수정 후 측정 없음.
적용: P4 프로젝트 CLAUDE.md/AGENTS.md에 UTF-8 byte budget 검사기를 CI로 도입하고 정책·검증·중단 조건을 앞부분에 유지. 20개 작업에서 실제 provider input/cache usage 및 정책 준수 비교. 원본 프로젝트 재현 명령: python3 scripts/check-instruction-prefixes.py --json .github/workflows/<file>.md; make recompile. 평가: 바로 적용 원칙 / PoC.

## 4. Deep Agents — 출력 예약이 입력 예산을 0으로 만드는 회귀
원본: https://github.com/langchain-ai/deepagents/issues/7985
신규성: 11/24 신고. langchain-fireworks 1.8.0의 Kimi K3.1 Pro 기본 출력 예약 1,048,576이 context window와 같아 첫 모델 호출 전에 ContextOverflowError. 1.7.3 기본값 131,072에서는 동작했다는 신고.
내부: 신고된 SummarizationMiddleware._input_budget은 max(0, 0.95*max_input_tokens-max_tokens). window 1,048,576이면 이전 예약 기준 약 865,075 입력 토큰, 새 예약 기준 0이다. 소스 독립 확인 및 수정 병합은 미실시.
원리: 모델 최대 출력 능력과 실제 작업별 예약량을 분리. 입력 길이, safety margin, 최소 출력 예산을 계산하여 허용되는 요청만 보낸다. 장점은 불필요한 초기 overflow 및 compaction 방지, 단점은 출력 제한이 긴 코드 생성 품질에 영향. 청구 비용 절감 실측 없음.
적용: Claude Code/Codex gateway에서 model capability와 task output budget을 분리하고 입력+출력+margin<=window 계약 검사. 8k/32k/128k 입력, 작은/큰 출력 예약, tool schema 포함 조건별 30회 비교. 첫 호출 실패율, 잘린 응답, 검증 완료 비용 기록. 평가: PoC.

## 5. 추가 신규 신호
- Codex #63732 https://github.com/openai/codex/issues/63732 : Python SDK의 상대 executable 경로 검증 후 cwd 변경으로 실행 실패. 신고자가 main ae21235afbd5ba6556c2ab4b64f6afc96a139ef8에서 확인. 모델 호출 없이 재현 가능. Runtime adapter에서 실행 파일 절대 경로와 작업 cwd를 분리해 검증. 직접 토큰 절감 없음, 환경 이동성 개선과 경로 정책 검증 필요. 평가: 바로 적용 원칙.
- Codex #63733 https://github.com/openai/codex/issues/63733 : 예약 실행 기록은 있으나 대상 task에 새 turn 및 승인된 browser route가 없었던 신고. 스케줄러 성공과 작업 실행 성공을 분리하는 근거. 원인 확정 불가. task receipt에 target turn ID와 verified artifact를 요구하고 권한 없는 경우 incomplete로 종료. 평가: PoC.
- Deep Agents #7982 https://github.com/langchain-ai/deepagents/issues/7982 : 인증된 MCP에서 공유 결정 검색 도구만 노출하는 예제 요청. #7981과 중복 제외. 신규 구현이나 benchmark가 아니라 제안. P4 CL 결정 기록 검색 시 namespace별 읽기 권한 및 top-k evidence 적용. 검색 누락 및 오래된 결정 위험. 평가: 아이디어 참고.
- gh-aw #80789 https://github.com/github/gh-aw/issues/80789 : driver exit 0, safe-output MCP 호출 0, terminal safe output 없음. 실제 완료 불명. 기존 완료 검증 원칙의 추가 운영 증거로만 기록. 평가: 아이디어 참고.

## 6. 범주별 점검
Coding workflow/orchestration: routing verdict 및 scheduled task receipt. Skills/hooks/progressive disclosure: prefix 검사 및 on-demand visualization. Pruning/compaction: 출력 예약 회귀. Subagent isolation: 완전 가격 표본과 root/child 비용 분리. RAG/selective context: MCP 검색 예제 제안만 확인. Prompt/skill 경량화: 3개 파일 수정 후보. Tool output 축약 및 cache: 신규 독립 실험 미확인, 이전 Scout 반복 제외. Session/handoff/durable state: reconciliation coverage와 실행 receipt. Model routing/token/cost: paired EMA와 오류 분류. Runtime adapter: executable/cwd 및 context budget. Evidence verification/task lifecycle: terminal safe output과 실제 결과 분리.

## 7. 통합 실험 계획
공통 이벤트: task_id, run_id, attempt_id, parent_session_id, provider_request_id, model, effort, priced_complete, total_cost, model_cost, failure_class, generation, reconciled_at, input_tokens, output_reserved, cache_read, cache_write, instruction_manifest_sha, artifact_sha, verified_completion.
비용 지표: 동일 범위 실제 청구액 합계 / 검증 완료 작업 수. 미확정 가격은 별도 표기하고 실패·재시도 비용 포함. Cold/Warm cache 분리. P4 Submit 및 Build Cancel은 별도 승인, 모델이 보고한 완료를 실제 완료로 간주하지 않는다.
우선순위: paired cost EMA 및 output budget 계약 → reconciliation index → prefix lint와 skill on-demand 실험. 신규 알고리즘을 억지로 추가하지 않는다. 조사한 공개 이슈는 정식 릴리스와 구분하며, 직접 확인한 두 gh-aw 소스의 현재 상태 외에는 패치 병합을 확정하지 않는다.
