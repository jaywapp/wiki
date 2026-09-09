# 업데이트 페이지 작업

orchestrator: Codex

같은 UI와 Git 상태를 공유하고 검증이 구현에 의존하므로 순차 실행한다.

| 작업 | owner | model | effort | depends_on | parallel_group | files | verification | status |
|---|---|---|---|---|---|---|---|---|
| 승인된 페이지 구현 | Codex | gpt-6-astra | medium | 없음 | sequential | web/src/updates.js, updates-model.js, main.js, style.css | 파서 테스트·빌드 | 완료 |
| 통합 검증 | Codex | gpt-6-astra | high | 구현 | sequential | web/tests/updates.test.mjs | 기존 테스트·모바일 확인 | 완료 |
| 커밋·푸시·PR 병합 | Codex | gpt-6-astra | medium | 검증 | sequential | 이번 변경만 | GitHub 병합 결과 | 완료 |

검증 결과: 23개 테스트 통과, Vite production build 성공. 1440px/390px에서 가로 넘침·중복 ID 없음. 날짜 이동, 자료 본문 이동, 일반 검색의 SUMMARY 제외, 기존 SUMMARY 주소 및 콘솔 오류 없음 확인. 기존 Mermaid 청크 크기 경고는 유지된다. 기존 웹 리더는 원격 PR #9로 이미 병합된 상태임을 확인했다.

## 완료 확인

2026-09-09: 구현 커밋 `74ad4a5`를 푸시하고 [PR #10](https://github.com/jaywapp/wiki/pull/10)을 develop에 squash 병합했다 (`6be43e15`). 병합 콘텐츠 157개로 테스트 23개와 production build를 다시 통과했다. [운영 업데이트 페이지](https://jaywapp-wiki.vercel.app/?page=updates)에 수동 배포 완료, 17개 날짜·정상 화면·콘솔 오류 없음 확인. 배포 ID: `dpl_4C3gEJbuoVQfpPkwGPtXjiKLiWBz`. Git 자동 배포 연결은 기존 미완료 상태다.
