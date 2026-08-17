# Next.js App Router: `_` 폴더 라우팅 제외 함정과 인증 뒤 컴포넌트 검증 패턴

> 2026-08-17, gyungchung(경충FC) 일정 상세 페이지·운영진 콘솔 개편 작업에서 정리.
> Next.js 15.5 App Router + Claude in Chrome 확장 환경.

## 함정 1: `_`로 시작하는 폴더는 라우팅되지 않는다

임시 프리뷰 페이지를 만들려고 `app/__preview/page.tsx`를 두었더니 404가 났다.
빌드도 성공하고 파일도 제자리에 있는데 라우트 목록에 아예 뜨지 않는다.

App Router는 **밑줄로 시작하는 폴더를 private folder로 취급**해 라우팅 대상에서
제외한다. 코로케이션(컴포넌트·유틸을 `app/` 안에 같이 두기)을 위한 기능이라
`_components`, `_lib` 같은 이름이 URL이 되지 않도록 막는 것이다.
`__preview`처럼 밑줄 두 개도 동일하게 걸린다.

```
app/__preview/page.tsx   → 라우트 없음 (404)
app/preview-check/page.tsx → /preview-check
```

**증상 판별법**: `next build` 출력의 Route 표에 해당 경로가 없으면 라우팅 제외다.
파일 경로 오타나 export 문제라면 빌드가 실패하거나 경로는 잡힌 채 에러가 난다.

```
Route (app)                    Size  First Load JS
┌ ○ /                         158 B         103 kB
├ ○ /events                   158 B         103 kB
├ ƒ /events/[date]            158 B         103 kB   ← 여기 없으면 라우팅 제외
```

### 뒤처리: `.next/types`에 유령 타입이 남는다

프리뷰 라우트를 지운 뒤 `tsc --noEmit`이 이런 에러를 낸다.

```
.next/types/app/preview-check/page.ts(2,24): error TS2307:
  Cannot find module '../../../../app/preview-check/page.js'
```

`next build`가 라우트마다 생성해 둔 타입 파일이 소스만 지웠을 때 그대로 남아서다.
해당 디렉터리를 지우면 된다.

```bash
rm -rf .next/types/app/preview-check
```

## 패턴: 인증 뒤에 있는 컴포넌트를 임시 프리뷰 라우트로 검증하기

운영진 로그인이 있어야 열리는 관리 콘솔의 폼을 고쳤는데, 자격증명을 쓰지 않고
렌더링과 상호작용을 확인해야 하는 상황. 절차는 이렇다.

1. 검증할 컴포넌트를 **임시로 export** 한다 (모듈 private였다면).
2. `app/preview-check/page.tsx`에 목 데이터를 채워 렌더한다.
   실제 타입(`Profile`, `Event`, `Attendance` …)을 그대로 써야 타입 오류로 실수를 잡는다.
3. dev 서버를 띄우고 브라우저로 확인 + 상호작용 단언.
4. **라우트 삭제 → export 원복 → `.next/types` 정리 → `tsc`·`lint`·`build` 재실행.**

4번을 빼먹으면 프리뷰 라우트가 프로덕션에 배포되거나 유령 타입 에러가 남는다.

```tsx
// app/preview-check/page.tsx (검증 후 삭제)
"use client";
import { AttendanceRoster, TeamScoreboard } from "@/components/admin-console";

const profiles: Profile[] = [/* 실제 타입으로 목 데이터 */];

export default function PreviewPage() {
  return <main style={{ display: "grid", gap: 40, padding: 40 }}>
    <form className="editor match-day"><AttendanceRoster … /></form>
    <form className="editor match-day"><TeamScoreboard … /></form>
  </main>;
}
```

## 함정 2: 폼 컨트롤을 갈아엎을 때 저장 페이로드 회귀 확인

number input 그리드를 스테퍼·토글·점 선택으로 바꾸면서 **저장 로직은 건드리지 않는 것**이
목표였다. 새 컨트롤은 상태를 hidden input으로 흘려보내 기존 필드명을 유지했다.

이때 회귀 확인은 스크린샷이 아니라 `FormData` diff로 한다.

```js
const before = Object.fromEntries([...new FormData(form).entries()]);
row.querySelectorAll(".stepper.inline button")[1].click();   // 골 +1
row.querySelectorAll(".rating-dots button")[3].click();      // 평점 토글
await new Promise(r => setTimeout(r, 300));                  // React 리렌더 대기
const after = Object.fromEntries([...new FormData(form).entries()]);
({ before, after });
```

- 건드린 필드만 바뀌고 **나머지가 문자열까지 동일**하면 저장 경로가 안전하다.
- 체크박스처럼 복수 값이면 `getAll("name")`로 배열 비교.
- 값 **형식**까지 봐야 한다. `"8"` → `8`처럼 타입이 바뀌면 서버 파싱이 달라질 수 있다.
  해제는 빈 문자열 `""`로 보내야 기존 `nullif(… ,'')` 처리와 맞는다.

## 함정 3: 브라우저 확장 환경에서 뷰포트 폭을 못 바꿀 때

Claude in Chrome 등 확장 기반 자동화에서는 창 리사이즈가 막히는 경우가 있다
(`Bounds must be at least 50% within visible screen space`, 또는 리사이즈해도
`window.innerWidth`가 그대로).

`document.documentElement.style.zoom`으로 **레이아웃 폭은 넓힐 수 있지만
미디어 쿼리는 여전히 실제 뷰포트로 평가**된다. 즉 줌만 걸면
"넓은 컨테이너 + 모바일 오버라이드"라는 실제로 존재하지 않는 조합을 보게 된다.

데스크톱 분기를 확인하려면 모바일 오버라이드를 임시로 무력화한다.

```js
document.documentElement.style.zoom = "0.55";           // 레이아웃 폭 확보
const s = document.createElement("style");
s.textContent = `@media (max-width:760px){
  .roster-person { flex: 1 1 150px !important }
}`;                                                      // 모바일 규칙 무력화
document.head.appendChild(s);
```

이건 어디까지나 근사치다. **실기기 폭 검증을 대체하지 못한다는 점을 보고에 남길 것.**
헤드리스 Chrome CLI를 쓸 수 있는 상황이면 iframe 하니스가 더 정확하다 →
[tools/headless-chrome-ui-testing.md](../tools/headless-chrome-ui-testing.md)

## 관련

- [tools/headless-chrome-ui-testing.md](../tools/headless-chrome-ui-testing.md) — 헤드리스 Chrome 최소 창 폭 클램프와 iframe 하니스
- 적용 사례: gyungchung [PR #57](https://github.com/jaywapp/gyungchung/pull/57)
