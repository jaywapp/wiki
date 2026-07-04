# WPF 프로젝트에서 `Path`/`File`/`Directory`가 CS0103으로 안 잡히는 문제

## 증상

`ImplicitUsings=enable`인 .NET 프로젝트에서 `Path.Combine(...)`, `File.Exists(...)` 등을
using 없이 잘 쓰다가, **`UseWPF=true`인 프로젝트**(WPF 앱, WPF 테스트 프로젝트 포함)에서만
갑자기 컴파일 오류가 난다:

```
error CS0103: 'Path' 이름이 현재 컨텍스트에 없습니다
error CS0103: 'Directory' 이름이 현재 컨텍스트에 없습니다
error CS0103: 'File' 이름이 현재 컨텍스트에 없습니다
```

## 원인

WPF SDK(`UseWPF=true`)는 암시적 전역 using 목록에서 **`System.IO`와 `System.Net.Http`를
제거**한다. WPF 네임스페이스와의 타입 충돌(`System.IO.Path` vs
`System.Windows.Shapes.Path` 등)을 피하기 위한 의도된 동작이다.

같은 솔루션이라도 `net8.0` 클래스 라이브러리에서는 되고, `net8.0-windows` + `UseWPF`
프로젝트(예: xUnit 테스트 프로젝트가 WPF VM을 참조해서 UseWPF를 켠 경우)에서만 깨지기
때문에 원인을 눈치채기 어렵다.

## 해결

해당 파일에 명시적으로 추가:

```csharp
using System.IO;
```

프로젝트 전체에 되살리고 싶으면 csproj에:

```xml
<ItemGroup>
  <Using Include="System.IO" />
</ItemGroup>
```

단, 이 경우 XAML 코드비하인드에서 `Path` 모호성 오류가 날 수 있으니 파일 단위 using이 안전하다.

발견: 2026-07-04, WAM Perforce 플러그인 테스트 작성 중 (Wam.Tests.Unit은 WPF VM 참조로 UseWPF=true).
