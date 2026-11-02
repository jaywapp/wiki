# 화면 제목의 자동 포커스 테두리

확인일: 2026-11-02 · orchestrator: Codex

화면 전환 후 읽기 시작점을 알리려고 `tabindex="-1"`인 제목에 `focus()`를 호출하면, 최초 접속 때 브라우저 기본 포커스 테두리가 사각 박스로 나타날 수 있다. 실제 Chromium 화면에서 제목의 초점과 `outline: auto 1px`을 확인했다.

제목이 조작 요소가 아닌 경우, 접근성을 위한 초점 이동을 유지하면서 해당 요소에만 표시 예외를 둘 수 있다.

```css
/* Keep navigation focus without styling the heading as an interactive control. */
#page-title[tabindex='-1']:focus { outline: none; }
```

`*:focus` 같은 전역 선택자로 테두리를 제거하지 않는다. 버튼·링크·입력·본문 바로가기의 키보드 포커스는 유지한다. 사용자 입력 없이 시작된 프로그램 초점도 브라우저가 표시할 수 있으므로 마우스로 클릭한 상태만 확인해서는 재현을 놓칠 수 있다.

검증은 새로고침 직후 제목의 초점 유지·테두리 제거를 확인하고, Tab으로 다음 버튼에 이동해 포커스 표시가 남는지 확인한다. 이번 사례에서는 밝은·어두운 테마와 모바일 폭에서 확인했고, 제목은 `outline-style: none`, 버튼은 `solid 3px`이었다. 스크린리더 음성 출력 자체의 검증과는 구분한다.
