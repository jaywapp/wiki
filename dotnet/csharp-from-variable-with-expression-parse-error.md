# C#: `from` 변수명 + `with` 식 조합이 LINQ 쿼리로 오파싱되는 문제

## 증상

record의 `with` 식을 `from`이라는 이름의 변수에 사용하면 컴파일러가 LINQ 쿼리 식 시작으로 파싱해 엉뚱한 구문 오류가 쏟아진다.

```csharp
var from = positions.FirstOrDefault(p => p.NodeId == id);
if (from is null) continue;
moves.Add(new MoveNodeCommand(repo, bus, from,
    from with { X = from.X + dx, Y = from.Y + dy }));   // ← 여기서 폭발
```

오류 메시지가 실제 원인과 무관하게 나온다:

- `CS1001 식별자가 필요합니다` / `CS1003 'in'이 필요합니다`
- `CS0742 쿼리 본문은 select 절 또는 group 절로 끝나야 합니다`
- 파일 뒤쪽 멤버들에 연쇄로 `CS0106 'private' 한정자가 유효하지 않습니다`, `CS1022 EOF 필요`

`from`은 문맥 키워드라서 `from x with ...` 형태가 나오면 파서가 쿼리 식(`from ... in ...`)을 시도하기 때문. 선언(`var from = ...`) 자체는 합법이라 선언 줄에서는 오류가 없고, **사용하는 줄에서** 터져서 원인 찾기가 어렵다.

## 해결

변수명을 바꾼다 (`fromPos`, `origin` 등). `@from`으로 이스케이프해도 되지만 가독성상 개명이 낫다.

```csharp
var fromPos = positions.FirstOrDefault(p => p.NodeId == id);
moves.Add(new MoveNodeCommand(repo, bus, fromPos,
    fromPos with { X = fromPos.X + dx, Y = fromPos.Y + dy }));
```

## 디버깅 팁

- 브레이스 균형이 맞는데 파일 끝부분에 `CS0106`/`CS1022`가 나오면, 앞쪽 어딘가에서 파서가 derail된 것. `dotnet build`의 **첫 번째** 오류(가장 앞 줄 번호)를 봐야 한다 — 뒤쪽 오류는 전부 연쇄다.
- 같은 함정: `select`, `group`, `into`, `orderby`, `join`, `let`, `where` 등 쿼리 문맥 키워드를 지역 변수명으로 쓰고 뒤에 식별자/키워드가 이어지는 경우.

발견: 2026-07-04, WAM 다중 선택 그룹 이동 구현 중 (CanvasViewModel).
