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

향후 다음과 같은 계층도 검토한다.

```text
virtual-dependency
virtual-diff
virtual-history
```

## 3. Virtual-Symbol

프로젝트마다 클래스, 메서드, 프로퍼티, 필드 등의 위치를 사전 인덱싱한다.

예시:

```json
{
  "symbol": "UserService.LoginAsync",
  "kind": "method",
  "file": "src/Services/UserService.cs",
  "startLine": 47,
  "endLine": 83,
  "parent": "UserService",
  "signature": "Task<User> LoginAsync(string id)",
  "references": [
    "LoginViewModel.cs:94",
    "AuthController.cs:52"
  ]
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

필요할 경우에만 실제 코드를 요청한다.

```text
resolve VS:a82f
```

## 4. Virtual-Remark

소스의 주석을 별도 dictionary로 추출하고 원본 코드에는 작은 key만 연결하는 방식이다.

```text
source
  ↓
comment extraction
  ↓
remark dictionary
  ↓
VR:key
```

LLM이 코드 로직만 이해하는 상황에서는 주석 원문을 컨텍스트에 넣지 않는다.

주석의 의미가 필요하다고 판단될 때만:

```text
resolve VR:91ac
```

형태로 가져온다.

목표는 **주석을 제거하는 것이 아니라 주석의 context loading을 lazy하게 만드는 것**이다.

## 5. Virtual-Reference

Symbol별 사용 위치를 미리 관리한다.

```text
references VS:a82f

→ LoginViewModel.cs:94
→ AuthController.cs:52
→ LoginCommand.cs:31
```

이를 통해 에이전트가 `grep`, `rg` 등을 반복하면서 reference를 발견하는 비용을 줄일 수 있다.

## 6. Resolver

LLM이 사용하는 인터페이스는 최대한 작게 유지한다.

개념적으로는 다음 정도면 된다.

```text
find_symbol <query>
resolve <virtual-id>
references <virtual-id>
remark <virtual-id>
```

중요한 점은 index 자체를 모두 프롬프트에 넣지 않는 것이다. Dictionary 역시 tool/database 형태로 외부에 존재하고 LLM은 query 결과만 받아야 한다.

## 7. 기대 흐름

```text
User Request
     │
     ▼
 Claude Code
     │
     │ find_symbol("LoginAsync")
     ▼
Code-Virtualize
     │
     ├─ Virtual-Symbol
     ├─ Virtual-Remark
     └─ Virtual-Reference
     │
     ▼
Minimal Context

VS:a82f
UserService.cs:47-83
references: 6
remark: VR:91ac
     │
     ▼
필요한 정보만 resolve
```

## 8. 기대 효과

### Token 절감

전체 파일 대신 필요한 line range만 전달한다.

### 탐색 호출 감소

`grep → read → grep → read` 패턴을 symbol lookup 중심으로 단축한다.

### 결정적 탐색

파일명/문자열 검색이 아니라 AST 또는 language-aware index를 기반으로 정확한 symbol 위치를 제공할 수 있다.

### 대형 프로젝트 대응

프로젝트 크기가 커져도 LLM context 크기와 코드베이스 전체 크기의 결합을 약화시킨다.

### Harness 공통 계층

Claude, Codex 등 특정 모델에 종속되지 않는 코드 탐색 계층으로 사용할 수 있다.

## 9. 핵심 원칙

```text
Codebase != Context
```

코드베이스 전체가 LLM의 context일 필요는 없다.

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

## 10. Astra와 구체화할 항목

- Symbol index 생성 방식: AST / LSP / compiler API / tree-sitter 비교
- C# / C++ / UE5에서 공통 schema가 가능한지
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

## 11. 초기 PoC 제안

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

효과가 확인되면 순서대로:

```text
Virtual-Symbol
      ↓
Virtual-Remark
      ↓
Virtual-Reference
      ↓
Dependency / Diff / History
```

를 추가한다.

---

### 한 줄 정의

> **Code-Virtualize는 코드베이스를 LLM context에 직접 적재하는 대신 symbol·remark·reference 단위로 가상화하고, 필요한 코드만 지연 materialize하는 LLM용 Code Context Virtualization Layer다.**
