# Code-Virtualize

> LLM에게 소스코드 전체를 읽히는 대신, 코드베이스를 탐색 가능한 가상 표현으로 변환하고 필요한 코드 조각만 지연 로드하는 **Code Context Virtualization Layer** 아이디어.

**상태:** Idea / 주말 Astra와 구체화 예정  
**목표:** Claude Code 기반 대규모 프로젝트 탐색 시 불필요한 파일 읽기와 토큰 소비를 줄이고, symbol 중심의 deterministic navigation을 제공한다.

## 1. 문제

일반적인 코드 에이전트는 요구사항을 해결하기 위해 다음 과정을 반복한다.

```text
검색 → 파일 Read → 추가 검색 → 관련 파일 Read → 주석/참조 탐색 → 작업
```

큰 프로젝트에서는 실제 작업에 필요한 코드보다 탐색 과정에서 읽는 코드가 훨씬 많아질 수 있다.

Code-Virtualize는 이를 다음 구조로 바꾼다.

```text
질문
 ↓
Virtual Index 조회
 ↓
관련 Symbol 식별
 ↓
필요한 source / remark / reference만 resolve
 ↓
작업
```

즉 **"LLM에게 코드베이스를 읽힌다"에서 "LLM이 코드베이스를 질의한다"로 전환**한다.

## 2. 기본 구조

```text
code-virtualize
│
├─ virtual-symbol
│  └─ class / method / property / field / variable
│      → file + line range + signature
│
├─ virtual-remark
│  └─ comment / XML docs
│      → remark-key → 실제 주석
│
├─ virtual-reference
│  └─ symbol
│      → reference locations
│
└─ resolver
   └─ virtual key / symbol → 실제 source fragment 반환
```

향후 `virtual-dependency`, `virtual-diff`, `virtual-history` 등의 계층도 검토한다.

## 3. Virtual-Symbol

프로젝트마다 클래스, 메서드, 프로퍼티, 필드 등의 위치를 인덱싱한다.

```json
{
  "symbol": "UserService.LoginAsync",
  "kind": "method",
  "file": "src/Services/UserService.cs",
  "startLine": 47,
  "endLine": 83,
  "parent": "UserService",
  "signature": "Task<User> LoginAsync(string id)",
  "references": ["LoginViewModel.cs:94", "AuthController.cs:52"]
}
```

LLM은 `LoginAsync`를 찾기 위해 프로젝트 전체를 grep하고 파일을 순차적으로 읽는 대신 symbol index를 먼저 조회한다.

```text
UserService.LoginAsync
  symbol: VS:a82f
  source: UserService.cs:47-83
  remarks: VR:91ac
  references: 6
```

필요할 경우에만 `resolve VS:a82f`로 실제 코드를 요청한다.

## 4. Progressive Symbol Virtualization

모든 symbol을 동일한 시점과 깊이로 인덱싱할 필요는 없다. 접근 범위와 symbol의 scope에 따라 **생성 시점과 materialization depth를 다르게 가져가는 계층형 virtualization**을 검토한다.

```text
Code-Virtualize
│
├─ Project Symbol Index
│  └─ public / internal API, type
│
├─ Type Symbol Index
│  └─ protected / private member
│
└─ Local Symbol Index
   └─ parameter / local variable / local function / lambda
```

### Virtualization Depth

```text
L0 Project
   public API / type
       ↓ resolve
L1 Type
   public / protected / private members
       ↓ resolve
L2 Method
   parameters / locals / local functions
       ↓ 필요 시
L3 Expression
   lambda / capture / temporary dependency
```

초기 가설은 다음과 같다.

| Symbol 범위 | 기본 생성 시점 | 저장 범위 |
|---|---|---|
| public | Project indexing | Project Index / 장기 |
| internal | Project indexing | Project Index / 장기 |
| protected | Type indexing 또는 resolve | Type Index |
| private member | Type indexing 또는 접근 시 | Type Index / 선택적 |
| parameter/local variable | Method resolve | Session / 임시 |
| lambda/local function | Method resolve | Session / 임시 |

특히 local variable까지 프로젝트 전체 dictionary에 영구 저장하는 것은 비용 대비 가치가 낮을 가능성이 있다.

예를 들어 처음에는:

```text
find_symbol("UserService")

UserService
├─ LoginAsync()
├─ LogoutAsync()
└─ RefreshTokenAsync()
```

정도만 노출하고 `LoginAsync()`를 resolve한 뒤에야:

```text
LoginAsync()
├─ private dependency
│  └─ _repository
└─ local symbols
   ├─ userId
   ├─ user
   └─ token
```

처럼 하위 symbol을 materialize할 수 있다.

단, access modifier만으로 materialization 여부를 결정해서는 안 된다. private method가 핵심 로직일 수도 있고 public property가 단순 DTO 데이터일 수도 있다.

따라서 장기적으로는 다음과 같은 priority 모델을 검토한다.

```text
Materialization Priority
 = Visibility
 + Symbol Kind
 + Reference Count
 + Call/Dependency Distance
 + Current Task Relevance
```

즉 **Visibility는 저장 여부 그 자체가 아니라 symbol을 언제/어느 깊이까지 materialize할지를 결정하는 하나의 signal**로 취급한다.

## 5. Virtual-Remark

소스의 주석을 별도 dictionary로 추출하고 원본 코드에는 작은 key만 연결한다. LLM이 코드 로직만 이해하는 상황에서는 주석 원문을 context에 넣지 않고 의미가 필요할 때만 `resolve VR:91ac` 형태로 가져온다.

목표는 **주석을 제거하는 것이 아니라 주석의 context loading을 lazy하게 만드는 것**이다.

## 6. Virtual-Reference

Symbol별 사용 위치를 미리 관리한다.

```text
references VS:a82f
→ LoginViewModel.cs:94
→ AuthController.cs:52
→ LoginCommand.cs:31
```

이를 통해 에이전트가 `grep`, `rg` 등을 반복하면서 reference를 발견하는 비용을 줄일 수 있다.

## 7. Resolver

LLM이 사용하는 인터페이스는 최대한 작게 유지한다.

```text
find_symbol <query>
resolve <virtual-id>
references <virtual-id>
remark <virtual-id>
```

Index 자체를 프롬프트에 넣지 않는다. Dictionary는 tool/database 형태로 외부에 존재하고 LLM은 query 결과만 받는다.

## 8. 기대 흐름

```text
User Request
     ↓
 Claude Code
     │ find_symbol("LoginAsync")
     ↓
Code-Virtualize
     ├─ Virtual-Symbol
     ├─ Virtual-Remark
     └─ Virtual-Reference
     ↓
Minimal Context

VS:a82f
UserService.cs:47-83
references: 6
remark: VR:91ac
     ↓
필요한 정보만 resolve
```

## 9. 기대 효과

- **Token 절감:** 전체 파일 대신 필요한 line range만 전달
- **탐색 호출 감소:** `grep → read → grep → read`를 symbol lookup 중심으로 단축
- **결정적 탐색:** AST/language-aware index 기반 symbol 위치 제공
- **대형 프로젝트 대응:** 코드베이스 크기와 LLM context 크기의 결합 약화
- **Harness 공통 계층:** Claude/Codex 등 특정 모델에 종속되지 않는 탐색 계층

## 10. 핵심 원칙

```text
Codebase != Context
```

```text
Codebase
   ↓ virtualization
Virtual Code Map
   ↓ query
Relevant Context
   ↓ resolve
Actual Source Fragment
```

Code-Virtualize의 목적은 **소스코드를 압축해서 LLM에게 전달하는 것이 아니라, 소스코드를 주소화(addressable)하여 필요한 순간에 필요한 만큼만 context로 materialize하는 것**이다.

## 11. Astra와 구체화할 항목

- Symbol index 생성 방식: AST / LSP / compiler API / tree-sitter 비교
- C# / C++ / UE5에서 공통 schema가 가능한지
- Progressive Symbol Virtualization의 실제 depth 정책
- visibility별 eager/lazy indexing 비용 비교
- line number 변경 시 index invalidation 전략
- symbol ID의 안정성: hash / qualified name / AST identity
- overloaded method 처리
- partial class / generated code 처리
- macro가 많은 UE C++ 처리
- reference index 생성 비용
- Perforce changelist와 incremental indexing 연동
- index 저장 형식: JSONL / SQLite / embedded DB
- Claude Code에서 tool/MCP/skill 중 어느 계층으로 노출할지
- resolve 단위를 symbol / line range / dependency graph 중 어떻게 결정할지
- 실제 토큰 절감률 측정 방법
- 기존 grep/read 방식 대비 latency benchmark
- stale index 발생 시 fallback 전략

## 12. 초기 PoC 제안

첫 PoC에서는 범위를 의도적으로 작게 잡는다.

```text
C# project
  ↓
AST parser
  ↓
Virtual-Symbol index
  ↓
find_symbol
  ↓
resolve source range
```

먼저 **Virtual-Symbol만으로 Claude의 탐색 Read 호출과 input token이 얼마나 줄어드는지 측정**한다.

효과가 확인되면 `Virtual-Symbol → Virtual-Remark → Virtual-Reference → Dependency/Diff/History` 순으로 확장한다.

---

### 한 줄 정의

> **Code-Virtualize는 코드베이스를 LLM context에 직접 적재하는 대신 symbol·remark·reference 단위로 가상화하고, 필요한 코드만 지연 materialize하는 LLM용 Code Context Virtualization Layer다.**
