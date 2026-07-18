# 헤드리스 Chrome으로 웹 UI 검증하기 — 최소 창 폭 함정과 iframe 하니스 패턴

> 2026-07-18, squad-maker 반응형 UX 개편 작업에서 정리.
> 빌드 도구 없는 정적 웹앱을 서버·브라우저 확장 없이 검증하는 패턴.

## 함정 1: `--window-size` 폭이 500px 미만이면 무시된다

```powershell
& $chrome --headless=new --window-size=390,844 --screenshot=out.png $url
```

- 헤드리스 Chrome은 **창 폭을 최소 500px로 클램프**한다. 뷰포트는 500px인데 스크린샷 이미지는 390px로 잘려 나온다.
- 결과: "모바일에서 오른쪽이 잘린다"처럼 보이는 **가짜 레이아웃 버그**가 찍힌다. 실제 390px 뷰포트 동작과 다르다.
- 확인 방법:
  ```powershell
  & $chrome --headless=new --window-size=390,844 --dump-dom `
    "data:text/html,<body><script>document.body.textContent=innerWidth</script></body>"
  # → 500
  ```

### 해결: iframe 래퍼로 진짜 모바일 뷰포트 만들기

500px 이상 창 안에 원하는 폭의 iframe을 두고 그 안에 앱을 로드한다.

```html
<!-- mobile-shot.html -->
<body style="margin:0;background:#444;">
<iframe src="/index.html" style="width:390px;height:844px;border:0;display:block;"></iframe>
</body>
```

```powershell
& $chrome --headless=new --window-size=500,880 --hide-scrollbars `
  --virtual-time-budget=9000 --screenshot=mobile.png "http://localhost:8391/mobile-shot.html"
```

## 함정 2: file:// iframe은 same-origin이 아니다

iframe 하니스에서 `iframe.contentWindow.eval(...)`로 앱 내부 상태를 단언하려면
**같은 오리진**이어야 한다. `file://`은 오리진이 불투명해 접근이 막힌다.

### 해결: node 원라이너 정적 서버 (설치 없음)

앱 디렉토리와 하니스(스크래치) 디렉토리를 하나의 오리진으로 서빙:

```powershell
$server = Start-Process node -ArgumentList '-e', "`"const h=require('http'),fs=require('fs');
h.createServer((q,s)=>{const p=q.url==='/'?'/index.html':q.url.split('?')[0];
const roots=['D:/path/to/app','D:/path/to/scratch'];
for(const r of roots){try{s.end(fs.readFileSync(r+p));return}catch(e){}}
s.statusCode=404;s.end()}).listen(8391)`"" -PassThru -WindowStyle Hidden
```

## 하니스 패턴: iframe + eval + dump-dom

테스트 페이지가 iframe으로 앱을 로드하고, 단언 결과를 `<pre id="out">`에 기록.
`--dump-dom`으로 결과를 셸에서 읽는다 (`--virtual-time-budget`으로 setTimeout 가속).

```powershell
& $chrome --headless=new --window-size=900,700 --virtual-time-budget=15000 `
  --dump-dom "http://localhost:8391/harness.html" | Select-String 'PASS|FAIL'
```

핵심 기법:

- **앱 내부 상태 접근**: 최상위 `let/const`는 window 프로퍼티가 아니므로
  `iframe.contentWindow.eval('getFieldScale()')`로 읽는다.
- **마우스/터치 시뮬레이션**: iframe의 window로 이벤트를 생성해야 한다.
  ```js
  const e = new w.MouseEvent('mousedown', { bubbles:true, clientX:x, clientY:y, view:w });
  target.dispatchEvent(e);
  // 터치는 new w.Touch({identifier:1, target, clientX, clientY}) + new w.TouchEvent(...)
  ```
- **롱프레스 등 타이머 검증**: dispatch 후 `setTimeout(check, 600)` — virtual-time-budget이 가속해줌.
- **localStorage 격리 함정**: 같은 오리진의 iframe 두 개(편집기/뷰어)는 localStorage를 공유한다.
  "뷰어가 저장 안 함"을 단언하려면 먼저 편집기 쪽 debounce 타이머를 `clearTimeout`으로 정리하고
  키를 지운 뒤 검사할 것 — 편집기의 지연 저장이 키를 다시 만들어 false-fail이 난다.

## 함정 3: PowerShell 5.1에서 gh CLI에 멀티라인 본문 전달

- here-string(`@'...'@`)에 **큰따옴표**가 섞이면 네이티브 인자 파싱이 깨져
  `unknown arguments` 오류가 난다. bash heredoc(`<<EOF`)은 PowerShell에 없다.
- 해결: 본문을 파일로 쓰고 `gh pr create --body-file body.md` / `gh pr comment N --body-file reply.md`.

## 관련

- 앱 쪽 검증 절차 예시: squad-maker `README.md`의 "검증 방법" 섹션
- 반응형 스케일링 설계: squad-maker `docs/superpowers/specs/2026-07-18-responsive-ux-overhaul-design.md`
