# FC Online(NEXON Open API) 선수 이미지 사용법

> 목적: NEXON Open API 이미지 endpoint로 FC Online 선수 이미지를 표시할 때의 URL 규칙, 식별자, 실제 응답 특성, 대체 순서, 이용약관 요점.
> 확인일: 2026-10-06 (실제 요청으로 확인). 출처:
> - [이미지 정보 조회](https://openapi.nexon.com/ko/game/fconline/?id=6)
> - [이용약관](https://openapi.nexon.com/ko/support/terms/) (2024-09-09 시행본)

## 1. 이미지 endpoint

서버는 `https://fco.dn.nexoncdn.co.kr`이고 API Key가 필요 없다.

| 경로 | 설명 |
|---|---|
| `/live/externalAssets/common/playersAction/p{spid}.png` | 카드별 액션샷 |
| `/live/externalAssets/common/playersAction/p{pid}.png` | 선수 기본 액션샷 |
| `/live/externalAssets/common/players/p{spid}.png` | 카드별 선수 이미지 |
| `/live/externalAssets/common/players/p{pid}.png` | 선수 기본 이미지 |

시즌(클래스) 엠블럼은 `https://open.api.nexon.com/static/fconline/meta/seasonid.json`의 `seasonImg` 필드에 전체 URL이 들어 있다.
예: 25 LIVE → `https://ssl.nexon.com/s2/game/fc/online/obt/externalAssets/new/season/live.png`

## 2. 식별자와 메타데이터

- `spid = seasonId(3자리) + pid(6자리)`, `pid = spid % 1000000`
- 선수명·spid: `https://open.api.nexon.com/static/fconline/meta/spid.json` (약 6.5MB, Key 불필요)
- 시즌명: `https://open.api.nexon.com/static/fconline/meta/seasonid.json`
- 예: `250233731` = seasonId `250`(21 TOTS) + pid `233731`(알렉산데르 이사크)
- `spid.json`의 이름은 공백 없이 붙어 있다 (예: "알렉산데르이사크"). 표시용으로 쓰려면 별도 처리가 필요하다.

## 3. 실제 응답 특성

- **이미지가 없으면 404가 아니라 403**(content-type `application/xml`)을 반환한다. 403은 "권한 없음"이 아니라 "이미지 없음"으로 처리한다.
- 이사크(pid 233731) 확인 결과
  - `playersAction/p{spid}`: 210/219/250/253 시즌 카드는 200, 300(25 LIVE)은 403
  - `players/p{spid}`: 모든 카드 403
  - `players/p233731`, `playersAction/p233731`: 200
- 25 LIVE 뉴캐슬 선수 카드 14장 확인 결과
  - `playersAction/p{spid}`: 모두 403
  - `playersAction/p{pid}`: 5명만 200
  - `players/p{pid}`: 14명 모두 200

즉 카드별(spid) 이미지는 카드마다 있고 없음이 갈리고, 선수 기본(pid) 이미지가 가장 넓게 존재한다. 단일 URL만 믿으면 안 된다.

## 4. 권장 대체(fallback) 순서

- 큰 영역(상세, 비교 카드): `playersAction/p{spid}` → `playersAction/p{pid}` → `players/p{pid}` → 이니셜 플레이스홀더
- 작은 영역(토큰, 목록 행): `players/p{spid}` → `players/p{pid}` → 이니셜

브라우저 `<img>`의 `error` 이벤트로 다음 단계로 넘어가는 예시:

```js
const BASE = "https://fco.dn.nexoncdn.co.kr/live/externalAssets/common";

function playerImageChain(spid, pid, large) {
  return large
    ? [`${BASE}/playersAction/p${spid}.png`, `${BASE}/playersAction/p${pid}.png`, `${BASE}/players/p${pid}.png`]
    : [`${BASE}/players/p${spid}.png`, `${BASE}/players/p${pid}.png`];
}

function loadPlayerImage(img, spid, pid, large, onExhausted) {
  const chain = playerImageChain(spid, pid, large);
  let i = 0;
  img.onerror = () => {
    i += 1;
    if (i < chain.length) img.src = chain[i];
    else { img.onerror = null; onExhausted(); } // e.g. render initials placeholder
  };
  img.src = chain[0];
}
```

### 403 반복 요청 줄이기

위 방식은 카드마다 최대 3회까지 실패 요청이 생긴다. 메타데이터 갱신 배치에서 카드별로 사용 가능한 단계를 미리 확인해 저장해 두고, 클라이언트는 URL 하나만 요청하는 방식을 권장한다.

## 5. 이용약관 요점

| 조항 | 요점 | 실무 영향 |
|---|---|---|
| 제6조 ④ | 결과 데이터에 "NEXON Open API" 이용 사실을 명시할 의무 | 구체 표기 형식은 **미확인** |
| 제5조 ⑤ | 허용 범위를 넘는 무단 복제·저장·가공·배포 금지 | 이미지는 복사·재호스팅하지 말고 CDN URL을 직접 참조 |
| API 문서 고지 | 크롤링한 데이터는 30일 이내 갱신 의무 | 메타데이터 갱신 배치 주기를 30일 이내로 |
| 제5조 ③, 제6조 ⑥ | 승낙 없는 영리 이용 금지, 게임 IP 사용 가이드 준수 | 수익화 전 확인 필요 |
| 제5조 ④, 제6조 ③ | 브랜드 모방 금지 | 공식 서비스로 오인될 디자인 지양 |

미확인: 게임 IP 사용 가이드상 선수 이미지 사용 범위. 상용 서비스에 쓰기 전 NEXON에 확인한다.

## 6. 함정

일부 샌드박스 환경(예: Claude 아티팩트)은 CSP로 외부 이미지 로드를 막아 data URI로 넣어야 한다. 이는 이미지 복제·저장에 해당할 수 있으므로 비공개 검토용으로만 쓰고 공개 배포물에는 쓰지 않는다.
