---
title: cc-jsonl-monitor — Claude Code 세션 JSONL 뷰어 (Chrome 확장)
category: tools
tags: [claude-code, jsonl, chrome-extension, session-log, local-first]
source: https://github.com/jaywapp/cc-jsonl-monitor
updated: 2026-11-10
---

# cc-jsonl-monitor

## 핵심 요약
직접 만든 Claude Code 세션 기록(JSONL) 뷰어. 왼쪽 파일 트리에서 고르고 오른쪽에서 읽는다. Chrome 확장은 서버 없이 폴더·파일을 읽기 전용으로 연결하고, 로컬 Node.js 서버 버전은 절대 경로 입력을 지원한다. 로그를 외부로 보내지 않는다.

## 메모
- 2026-09-14 첫 구현(파일 트리 기반 로컬 뷰어), 2026-09-15 Chrome 확장·다크 모드·기록 제목 필터·대화형 보기, 2026-09-16 작업 패턴 분석. Chrome Web Store에 게시됨.
- 기록 제목별 필터(사용자 요청·Claude·도구 호출·도구 결과·생각 기록 등), 오류만 보기, 세션·기간 필터, 대화형/목록형 보기.
- 처리 한도: 파일 128 MiB, 한 줄 512 KiB, 50,000 이벤트. 변경 시 전체를 다시 파싱하며 증분 인덱스는 없다.
- 기록에 없는 정보를 추정하지 않는다(경로 역변환·세션 ID 생성 안 함).
- 합성 데이터로 검증했으며 Claude Code 모든 내부 버전 호환을 보장하지 않는다.

## 참고 자료
- 원본 저장소: https://github.com/jaywapp/cc-jsonl-monitor
- 제품 맥락: https://github.com/jaywapp/cc-jsonl-monitor/blob/main/PRODUCT.md
- 개인정보 처리 안내: https://github.com/jaywapp/cc-jsonl-monitor/blob/main/docs/extension/privacy.md
- 기록 패턴: https://github.com/jaywapp/cc-jsonl-monitor/blob/main/docs/record-patterns.md
- 설치 방식과 업데이트: https://github.com/jaywapp/cc-jsonl-monitor/blob/main/docs/extension/updates.md
- Chrome Web Store: https://chromewebstore.google.com/detail/cc-jsonl-monitor/kmmfkpamdjpeadbbbgdefmdhahlefjin
