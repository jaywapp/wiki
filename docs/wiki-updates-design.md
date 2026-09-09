# 업데이트 페이지 설계

- 기존 Graphite B의 색·폰트와 Markdown 렌더러를 재사용한다. impeccable과 design-taste-frontend를 적용하며 읽기 중심의 좁은 본문과 날짜 탐색을 사용한다.
- `/?page=updates`가 별도 페이지 상태이며 자료실과 업데이트는 기본 앵커로 이동한다. 모바일에도 상단에 두 링크를 유지한다.
- SUMMARY.md의 최상위 Markdown 토큰 중 날짜 H2만 섹션 경계로 인식한다. 코드 블록의 가짜 제목은 무시한다. 날짜 내림차순으로 렌더링한다.
- 기존 `?doc=SUMMARY.md` 주소는 업데이트로 연결한다. 일반 자료실 데이터에서는 SUMMARY만 제외한다.
- 기존 안전한 Markdown 렌더러로 XSS 방어와 상대 문서 링크 해석을 유지한다. 날짜별 제목 ID에 접두사를 부여해 중복을 막는다.
- 날짜 없는 문서는 원문 전체를 대체 표시하고, 파일이 없거나 로딩에 실패하면 복구 링크를 제공한다.
- 검증: 파서 단위 테스트, 전체 기존 테스트와 production build, 모바일 및 데스크톱 탐색 확인.

## 완료 확인

2026-09-09: 구현 커밋 `74ad4a5`를 푸시하고 [PR #10](https://github.com/jaywapp/wiki/pull/10)을 develop에 squash 병합했다 (`6be43e15`). 병합 콘텐츠 157개로 테스트 23개와 production build를 다시 통과했다. [운영 업데이트 페이지](https://jaywapp-wiki.vercel.app/?page=updates)에 수동 배포 완료, 17개 날짜·정상 화면·콘솔 오류 없음 확인. 배포 ID: `dpl_4C3gEJbuoVQfpPkwGPtXjiKLiWBz`. Git 자동 배포 연결은 기존 미완료 상태다.
