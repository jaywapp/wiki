# .NET 데스크톱 앱: 외부 레포 플러그인 (계약 NuGet + 공유 AssemblyLoadContext)

호스트 앱에 "누구나 별도 레포에서 만들 수 있는 플러그인" 구조를 넣는 실전 패턴.
WAM(WPF/.NET 8)에서 검증. 핵심은 **계약을 NuGet 패키지로 배포**하고, **런타임에
공유 계약을 지키며 로드**하는 것.

## 문제

플러그인을 호스트 솔루션 안에 `ProjectReference` + 하드코딩(`new FooPlugin()`)으로
두면 컴파일타임 결합이 생겨, 제3자가 독립적으로 만들 수 없다. 목표:

- 플러그인은 **계약 어셈블리 하나만** 참조(호스트·UI 프레임워크 의존 0)
- 플러그인은 **별도 레포**에서 빌드·배포
- 호스트는 **런타임에 발견·로드**

## 구조 (3계층)

```
Contract: 계약 어셈블리 → 공개 NuGet (예: Jaywapp.Wam.Core)
    인터페이스(IPlugin), 도메인 타입, 스키마 기반 설정 API. UI 프레임워크 의존 0.
Host: 앱
    %AppData%\<App>\plugins\<id>\ (manifest + DLL) 스캔 → ALC 로드 → 기여 적용
Plugin: 각자 레포
    계약 NuGet 참조, DLL + manifest 산출
```

## 함정 ①: 공유 계약 어셈블리의 타입 정체성 (가장 중요)

.NET에서 **같은 어셈블리라도 다른 AssemblyLoadContext(ALC)로 로드되면 타입이
다르다.** 플러그인이 들고 온 `Contract.dll`을 플러그인 전용 ALC로 또 로드하면
`호스트의 IPlugin ≠ 플러그인의 IPlugin`이 되어 `(IPlugin)instance` 캐스팅이
`InvalidCastException`으로 실패한다.

**해결**: 커스텀 ALC의 `Load`에서 **호스트가 이미 로드한 어셈블리는 null을 반환**해
기본 컨텍스트(호스트 인스턴스)로 위임한다. 플러그인 고유 DLL과 그 사설 의존성만
격리 로드한다.

```csharp
internal sealed class PluginLoadContext : AssemblyLoadContext
{
    private readonly AssemblyDependencyResolver _resolver;
    public PluginLoadContext(string pluginDllPath) : base(isCollectible: false)
        => _resolver = new AssemblyDependencyResolver(pluginDllPath);

    protected override Assembly? Load(AssemblyName name)
    {
        // 호스트가 이미 로드한 공유 어셈블리(계약, 프레임워크)는 위임 → 타입 정체성 유지
        if (Default.Assemblies.Any(a => a.GetName().Name == name.Name)) return null;
        var path = _resolver.ResolveAssemblyToPath(name);
        return path is null ? null : LoadFromAssemblyPath(path);
    }
}
```

그리고 플러그인 csproj는 계약 패키지를 **런타임에 복사하지 않도록** 참조한다.
(안 그러면 플러그인 폴더의 `Contract.dll`이 위 위임 로직을 우회할 여지가 생기고,
불필요한 배포 파일도 늘어난다.)

```xml
<PackageReference Include="Jaywapp.Wam.Core" Version="0.3.0">
  <Private>false</Private>
  <ExcludeAssets>runtime</ExcludeAssets>
</PackageReference>
```

> 참고: 패키지 id(`Jaywapp.Wam.Core`)와 어셈블리명(`Wam.Core`)이 달라도 된다.
> ALC 위임은 **어셈블리명**(`Wam.Core`)으로 매칭되므로 정체성은 유지된다.

## 함정 ②: 파일 잠금 (비수집 ALC)

`isCollectible: false` ALC로 `LoadFromAssemblyPath` 한 DLL은 프로세스 종료 전까지
파일이 잠긴다. 테스트에서 임시 폴더 정리가 `UnauthorizedAccessException`을 던질 수
있으니 정리는 best-effort(try/catch)로. 앱 재빌드 시 실행 중이면 MSB3026도 이 때문.

## 발견 & 매니페스트

폴더 스캔 + `plugin.json`으로 메타데이터를 명시하면 버전·호환성 검증이 쉽다.

```json
{ "id": "wam.plugin.perforce", "displayName": "Perforce", "version": "0.1.0",
  "entryAssembly": "Wam.Plugins.Perforce.dll", "targetCoreVersion": "0.3.0" }
```

- `targetCoreVersion`의 **major**를 호스트 계약 major와 비교해 불일치면 스킵(경고).
  호스트 계약 버전은 `typeof(IPlugin).Assembly.GetName().Version`으로 얻는다
  (계약 csproj에 `<Version>`을 설정해야 어셈블리 버전에 반영됨).
- 각 플러그인 로드를 **try/catch로 격리** — 불량 플러그인 하나가 앱 시작을 막지 않게.

## 함정 ③: 설정 UI 결합

플러그인이 설정 화면을 WPF View로 제공하게 하면 계약이 UI 프레임워크에 묶여
"계약만 참조" 목표가 깨진다. **설정을 스키마로 선언**(필드 종류·라벨·기본값)하게 하고
호스트가 제네릭 폼을 렌더링하면, 플러그인은 순수 계약만 의존한다. 값은 키→문자열
평면 맵으로 저장하고 런타임에 타입별 게터로 읽는다.

## 개발 워크플로우 (공개 발행 전)

계약을 nuget.org에 올리기 전에도 로컬에서 끝까지 검증 가능:

```bash
# 호스트 레포에서 계약을 로컬 폴더 피드로 pack
dotnet pack src/Wam.Core -c Release -o build/local-nuget
```

플러그인 레포에 `nuget.config`로 그 폴더를 소스 추가:
```xml
<configuration><packageSources>
  <add key="local-wam" value="../WAM/build/local-nuget" />
  <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
</packageSources></configuration>
```

공개 발행은 nuget.org API 키로 `dotnet nuget push` 한 번이면 끝. 이후 플러그인의
`nuget.config`에서 로컬 소스만 빼면 된다.

## 기존 in-repo 플러그인 → 별도 레포 이관

이력 보존하며 옮기려면 `git subtree split`:
```bash
git subtree split --prefix=plugins/perforce -b perforce-split
git push git@github.com:jaywapp/wam-plugin-perforce.git perforce-split:master
```
이후 클론해서 csproj를 계약 PackageReference로 바꾸고, manifest 추가, 설정을 스키마로
변환한다.

## 검증

가장 확실한 end-to-end 검증은 **실제 빌드된 플러그인 DLL + manifest**를
`%AppData%\<App>\plugins\<id>\`에 두고 앱을 띄워 로그에서 "Loaded plugin ..."을
확인하는 것. 단위 테스트로는 계약을 참조한 픽스처 플러그인을 임시 폴더에 배치해
로더가 실제 ALC 경로로 로드·캐스팅함을 검증한다.

적용: 2026-07-05, WAM (`github.com/jaywapp/wam`),
플러그인 레포 `wam-plugin-perforce` · `wam-plugin-sample`.
