# 웹 리더 성능·오류 방어 작업

orchestrator: Codex

| 작업 | owner | model | effort | depends_on | parallel_group | files | verification | status |
|---|---|---|---|---|---|---|---|---|
| 검색·정렬 재계산 제거 | Codex | gpt-6-astra | high | 분석·설계 | root-wiki | web/src/catalog.js | 검색 및 정렬 회귀 | complete |
| 손상 설정 방어·테스트 | Codex | gpt-6-astra | high | 분석·설계 | root-wiki | web/src/preferences.js, main.js, tests | node:test, build | complete |

기존 미커밋 웹 리더를 수정하므로 파일 소유 충돌을 피하려고 저장소 내 순차 진행한다.

검증 완료: 2026-09-09. 전체 테스트와 Vite 빌드가 통과했다.

검증: npm test → 20/20 PASS (추가 4개); npm run build → PASS. 기존 Markdown 렌더링·악성 링크·카탈로그 테스트 포함. 기존 사용자 파일/문서 변경 보존. 브라우저 상호작용 E2E는 이번 변경에서 목록 태그·설명 표시를 확인했다.
