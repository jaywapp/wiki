# WPF DrawingVisual 캔버스의 빈 공간 히트테스트 함정 + SQLite FTS5 검색어 escape

> 2026-07-03, WAM(Work As a Map) 프로젝트 버그 수정 중 정리.

## 1. WPF: DrawingVisual 기반 캔버스에서 빈 공간이 마우스 이벤트를 못 받는 문제

### 증상
- `FrameworkElement`를 상속해 `DrawingVisual` 레이어들로 직접 그리는 캔버스에서,
  **아무것도 그려지지 않은 빈 영역은 드래그(팬)·더블클릭이 전혀 동작하지 않음**.
- 노드(그려진 도형) 위에서는 이벤트가 정상 발생 → "노드 위 드래그만 되고 배경 팬은 안 됨" 같은
  비대칭 증상으로 나타나서 원인을 착각하기 쉬움.

### 원인
WPF 마우스 이벤트는 **비주얼 히트테스트**를 통과한 지점에서만 발생한다.
`Background`가 없는 `FrameworkElement` + `DrawingVisual` 조합에서는
그려진 픽셀만 히트테스트에 걸리고, 빈 공간은 투명 취급되어 이벤트가 라우팅되지 않는다.

### 해결
요소 전체를 히트테스트 대상으로 만드는 `HitTestCore` 오버라이드 한 줄이면 된다:

```csharp
protected override HitTestResult HitTestCore(PointHitTestParameters hitTestParameters) =>
    new PointHitTestResult(this, hitTestParameters.HitPoint);
```

대안: 최하단 레이어에 `Brushes.Transparent`로 전체 영역 사각형을 그려도 되지만
(Transparent는 히트테스트에 걸림), 뷰포트 변경마다 다시 그려야 해서 오버라이드가 깔끔하다.

## 2. SQLite FTS5: 사용자 검색어를 MATCH에 그대로 넣으면 안 됨

### 증상
- `WHERE nodes_fts MATCH @Query` 에 사용자 입력을 바인딩해도 **문법 예외**가 발생 가능.
- Parameter binding은 SQL injection만 막아줄 뿐, FTS5 쿼리 문법(`"`, `NEAR`, `AND`, `-`, 괄호 등)은
  별도 언어라서 `foo-bar`, `"` 같은 입력이 `SqliteException`을 던진다.
- Rx 스트림(`Subscribe(onNext)`)에 에러 핸들러가 없으면 예외 한 번에 검색 스트림이 죽는다.

### 해결 패턴
토큰 단위로 쪼개 각 토큰을 큰따옴표 문자열로 감싸고(내부 `"`는 `""`로 이중화),
마지막 토큰만 prefix 매치(`*`)를 붙인다:

```csharp
private static string BuildFtsQuery(string query)
{
    var tokens = query.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
    if (tokens.Length == 0) return "\"\"";
    var quoted = tokens.Select(t => $"\"{t.Replace("\"", "\"\"")}\"").ToArray();
    quoted[^1] += "*";                    // "로그인" "버그"* ← 유효한 FTS5 문법
    return string.Join(" ", quoted);
}
```

방어선 2중화:
1. repository의 `SearchAsync`는 `SqliteException` → 빈 결과 반환 (검색은 절대 크래시 금지)
2. ViewModel의 Rx 파이프라인에서도 `try/catch`로 스트림 생존 보장

## 3. 덤: Undo 커맨드는 FK cascade 삭제분까지 스냅샷해야 함

노드 삭제 시 `ON DELETE CASCADE`로 relations가 함께 지워지는 스키마라면,
`DeleteNodeCommand.ExecuteAsync`에서 **삭제 직전 incident relations를 스냅샷**하고
`UndoAsync`에서 노드 복원 후 관계도 재저장 + 이벤트 재발행해야 한다.
노드/위치만 복원하면 연결선이 영구 유실된다. (Redo를 위해 스냅샷은 execute마다 갱신)
