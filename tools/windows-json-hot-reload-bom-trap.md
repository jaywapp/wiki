# 손으로 고치는 JSON 설정의 핫리로드 — PowerShell BOM 함정

재기동 없이 반영되는 JSON 설정 파일(`fs.watch` + `JSON.parse`)을 Windows에서 운영할 때
겪은 함정과, 그 과정에서 정리된 설계 원칙.

- 실측 환경: Node 22, Windows 11, PowerShell 5.1
- 사례: Dina Discord 봇의 `~/.dina/{policy,presets,briefings}.json`

---

## 1. 함정: `Out-File -Encoding utf8` 이 BOM을 붙인다

PowerShell 5.1에서 설정 파일을 고치는 가장 자연스러운 방법이 이것이다.

```powershell
'{ "enabled": true }' | Out-File -FilePath $p -Encoding utf8
```

그런데 이렇게 쓰면 파일 앞에 **UTF-8 BOM(`EF BB BF`)** 이 붙는다.

```powershell
$bytes = [System.IO.File]::ReadAllBytes($p)
($bytes[0..3] | ForEach-Object { $_.ToString('X2') }) -join ' '
# EF BB BF 7B   ← 7B 이 '{' 이고, 앞의 3바이트가 BOM
```

Node가 `fs.readFileSync(p, 'utf-8')` 로 읽으면 BOM이 `U+FEFF` 문자로 **문자열에 남고**,
`JSON.parse` 는 이걸 거부한다.

```
[briefings] ...briefings.json is not valid JSON, keeping current values:
Unexpected token '', "  "enab"... is not valid JSON
```

**에디터에서는 아무것도 안 보인다.** 파일은 멀쩡해 보이는데 반영만 안 되는,
원인을 찾기 어려운 실패다.

### 해결

읽은 직후 BOM을 떼어낸다. 한 줄이다.

```ts
let raw = fs.readFileSync(filePath, 'utf-8');
if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
```

`JSON.parse` 는 BOM을 절대 허용하지 않으므로(RFC 8259), 관용은 읽는 쪽 몫이다.

### 덤: UTF-16으로 저장된 경우

PowerShell의 `>`, `>>`, `Out-File` 은 환경에 따라 UTF-16LE로 쓰기도 한다.
이건 `'utf-8'` 로 읽으면 **에러가 아니라 깨진 문자열**이 되어 더 헷갈린다.
파싱 에러로 흘려보내지 말고 인코딩 문제라고 이름을 붙여준다.

```ts
if (raw.charCodeAt(0) === 0xfffd || raw.includes('\u0000')) {
  console.warn(`${filePath} does not look like UTF-8 (saved as UTF-16?)`);
  return;
}
```

### 로그 자체가 UTF-16인 경우

런처가 `*>> $logPath` 로 리다이렉트하면 로그 파일이 UTF-16LE로 쓰인다.
`grep` 이 아무것도 못 찾는데 파일은 1.8MB인 상황이 이것이다.

```powershell
Get-Content .\dina.log -Encoding Unicode -Tail 50   # grep 대신
```

---

## 2. 함께 정리된 설계 원칙

핫리로드 설정 파일에서 **틀리면 조용히 틀리는** 것들.

### 파일이 아니라 디렉토리를 감시한다

에디터는 temp 파일에 쓰고 rename 하는 경우가 많다. 파일에 건 `fs.watch` 는
Windows에서 그 순간 끊긴다.

```ts
fs.watch(path.dirname(filePath), (_event, filename) => {
  if (filename && filename !== path.basename(filePath)) return;
  // 150ms 디바운스 — 저장 한 번에 이벤트가 여러 번 온다
});
```

### 파싱 실패 시 기본값이 아니라 **직전 값**을 유지한다

에디터는 두 단계로 저장하므로 감시자는 **반드시** 반쯤 쓰인 파일을 본다.
그 순간 기본값으로 되돌리면 운영 중인 한계값이 흔들린다.

### 잘못된 값은 "동작하는 쪽"으로 넘어뜨린다

예: 예약 알림의 `pausedUntil` 을 파싱 못 하면 **일시정지를 무시하고 알림을 보낸다.**
안 와야 할 알림이 오는 건 무시하면 그만이지만, 와야 할 알림이 조용히 영영 안 오는 건
접종일을 놓치는 쪽으로 이어진다. 실패 방향은 도메인이 정한다.

### 쓰기 경로(`set`)도 같은 `coerce` 를 통과시킨다

명령으로 설정하는 값과 손으로 고치는 값의 검증이 갈라지면,
명령으로만 넣을 수 있는 잘못된 상태가 생긴다.

```ts
set(next: T): void {
  const value = coerce(serialize ? serialize(next) : next);  // 먼저 검증
  current = value;                                           // 즉시 메모리 반영
  write(serialize ? serialize(value) : value);               // 그 다음 디스크
}
```

**메모리를 먼저 갱신하는 게 핵심이다.** 감시 이벤트를 기다렸다가 반영하면
"설정했습니다" 라고 답하는 시점에 프로세스는 아직 옛 값을 들고 있다.

### 건너뛴 작업은 이유를 로그로 남긴다

조건이 안 맞아 실행을 건너뛴 스케줄 작업이 아무 말도 안 하면,
**죽은 것과 구분할 수 없다.** "왜 안 왔지?" 를 조사할 때 이 한 줄이 전부다.

```ts
const skip = skipReason(getSettings(), job, new Date());
if (skip) console.log(`[briefing] ${label}: skipped — ${skip}`);
else if (shouldRun()) await work();
```

---

## 3. 검증 방법

핫리로드는 **실행 중인 프로세스에 실제로 반영되는지** 확인해야 의미가 있다.
단위 테스트로는 "파일을 읽으면 파싱된다" 까지만 증명된다.

```powershell
# 1) 돌고 있는 프로세스가 있는 상태에서 파일을 손으로 고친다
'{ "enabled": { "morning": false } }' | Out-File -FilePath $p -Encoding utf8
Start-Sleep -Seconds 3

# 2) 프로세스 로그에 reload가 찍혔는지 본다
Get-Content .\app.log -Encoding Unicode -Tail 12 | Where-Object { $_ -match '\[settings\]' }
# [settings] reloaded — morning: on -> off
```

이 절차로 BOM 함정을 잡았다. 단위 테스트는 `fs.writeFileSync(p, json, 'utf-8')` 로
BOM 없이 썼기 때문에 전부 통과했고, 실제 사용자가 쓰는 경로에서만 깨졌다.
**"파일을 만드는 방법"까지 재현해야 진짜 검증이다.**

---

## 관련

- [ai-workflow/claude-agent-sdk-mcpservers-override.md](../ai-workflow/claude-agent-sdk-mcpservers-override.md) — 설정이 조용히 덮어써지는 다른 함정
- [tools/headless-chrome-ui-testing.md](headless-chrome-ui-testing.md) — PS5.1 멀티라인 함정
