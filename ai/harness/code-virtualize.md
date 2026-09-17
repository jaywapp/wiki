# Code-Virtualize

> LLM에게 소스코드 전체를 읽히는 대신, 코드베이스를 탐색 가능한 가상 표현으로 변환하고 필요한 코드 조각만 지연 로드하는 **Code Context Virtualization Layer** 아이디어.

**상태:** Idea / 주말 Astra와 구체화 예정  
**목표:** Claude Code 기반 대규모 프로젝트 탐색 시 불필요한 파일 읽기와 토큰 소비를 줄이고, symbol 중심의 deterministic navigation을 제공한다.

## 1. 문제

일반적인 코드 에이전트는 `검색 → 파일 Read → 추가 검색 → 관련 파일 Read → 주석/참조 탐색 → 작업`을 반복한다. 큰 프로젝트에서는 실제 작업에 필요한 코드보다 탐색 과정에서 읽는 코드가 훨씬 많아질 수 있다.

Code-Virtualize는 이를 `질문 → Virtual Index 조회 → 관련 Symbol 식별 → 필요한 source/remark/reference만 resolve → 작업`으로 바꾼다. 즉 **"LLM에게 코드베이스를 읽힌다"에서 "LLM이 코드베이스를 질의한다"로 전환**한다.

## 2. 기본 구조

```text
code-virtualize
├─ virtual-symbol
│  └─ class / method / property / field / variable → file + line range + signature
├─ virtual-remark
│  └─ comment / XML docs → remark-key → 실제 주석
├─ virtual-reference
│  └─ symbol → reference locations
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

LLM은 프로젝트 전체를 grep하고 파일을 순차적으로 읽는 대신 symbol index를 먼저 조회한다. 필요할 경우에만 `resolve VS:a82f`로 실제 코드를 요청한다.

## 4. Progressive Symbol Virtualization

모든 symbol을 동일한 시점과 깊이로 인덱싱할 필요는 없다. 접근 범위와 symbol의 scope에 따라 **생성 시점과 materialization depth를 다르게 가져가는 계층형 virtualization**을 검토한다.

```text
L0 Project  : public API / type
   ↓ resolve
L1 Type     : public / protected / private members
   ↓ resolve
L2 Method   : parameters / locals / local functions
   ↓ 필요 시
L3 Expression: lambda / capture / temporary dependency
```

| Symbol 범위 | 기본 생성 시점 | 저장 범위 |
|---|---|---|
| public | Project indexing | Project Index / 장기 |
| internal | Project indexing | Project Index / 장기 |
| protected | Type indexing 또는 resolve | Type Index |
| private member | Type indexing 또는 접근 시 | Type Index / 선택적 |
| parameter/local variable | Method resolve | Session / 임시 |
| lambda/local function | Method resolve | Session / 임시 |

특히 local variable까지 프로젝트 전체 dictionary에 영구 저장하는 것은 비용 대비 가치가 낮을 가능성이 있다.

단, access modifier만으로 materialization 여부를 결정해서는 안 된다. private method가 핵심 로직일 수도 있고 public property가 단순 DTO 데이터일 수도 있다.

```text
Materialization Priority
 = Visibility
 + Symbol Kind
 + Reference Count
 + Call/Dependency Distance
 + Current Task Relevance
```

**Visibility는 저장 여부 그 자체가 아니라 symbol을 언제/어느 깊이까지 materialize할지를 결정하는 하나의 signal**로 취급한다.

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

## 8. Self-Healing Virtualization / Source of Truth

Virtualized data는 **source of truth가 아니라 cache/index**로 취급한다. 실제 source code가 항상 최종 진실이다. 따라서 virtual data가 없거나 stale/incorrect한 경우에도 Claude의 작업이 막히면 안 된다.

```text
Claude
  ↓
Virtual Index 조회
  ├─ HIT + VALID → virtual path 사용
  ├─ MISS        → source fallback
  └─ STALE/INVALID → source fallback
                       ↓
                    실제 코드 탐색
                       ↓
                    symbol 재발견
                       ↓
                    index repair
                       ↓
                    작업 계속
```

### 핵심 원칙

```text
Virtual Index = Optimization Layer
Source Code    = Source of Truth
```

Virtualization이 실패하면 기존 Claude Code의 `grep/search/read` 방식으로 자연스럽게 돌아간다. 즉 Code-Virtualize는 기존 탐색 기능을 제거하는 것이 아니라 **fast path를 앞에 추가하는 구조**다.

### Validation

각 virtual entry에 source 상태를 검증할 metadata를 둘 수 있다.

```json
{
  "id": "VS:a82f",
  "file": "UserService.cs",
  "startLine": 47,
  "endLine": 83,
  "sourceHash": "9ac4...",
  "indexedRevision": 184921,
  "signature": "LoginAsync(string id)"
}
```

resolve 시 전체 프로젝트를 다시 분석하는 대신 file revision/hash/signature 등의 값으로 해당 entry가 아직 유효한지 빠르게 확인한다.

Perforce 환경에서는 `have revision`, changelist, file digest 등을 validation signal로 활용하는 방안을 검토한다.

### Missing Symbol

`find_symbol` 결과가 없다고 해서 **symbol이 존재하지 않는다고 판단해서는 안 된다.** 결과는 `NOT_FOUND`가 아니라 의미적으로 `NOT_INDEXED_OR_NOT_FOUND`에 가깝다.

```text
find_symbol("Foo")
    ↓ MISS
fallback_search("Foo")
    ↓ FOUND
create/update VS entry
    ↓
continue
```

### Incorrect Location

line range가 변경되어 `resolve VS:a82f`가 예상한 declaration을 찾지 못하면 resolver가 이를 validation failure로 처리한다.

```text
resolve VS:a82f
→ UserService.cs:L47-L83
→ expected LoginAsync declaration 없음
→ INVALIDATE VS:a82f
→ source search
→ LoginAsync 발견 L62-L101
→ REPAIR VS:a82f
→ return source
```

LLM에게 잘못된 코드를 그대로 넘기는 것보다 resolver 계층에서 자동 복구하는 것이 중요하다.

### Self-Healing Index

이 구조에서는 Claude의 실제 작업 자체가 index를 개선하는 feedback loop가 된다.

```text
USE → DETECT → FALLBACK → DISCOVER → REPAIR → REUSE
```

따라서 초기 index가 완벽할 필요가 없으며, 프로젝트 사용 과정에서 점진적으로 정확도를 높이는 **Self-Healing Virtualization**으로 발전시킬 수 있다.

### Confidence / Freshness

향후 entry별 신뢰도를 노출하는 방안도 검토한다.

```text
VS:a82f
freshness: current
confidence: verified
```

또는 내부적으로 `VERIFIED / STALE / UNKNOWN / INVALID` 상태를 관리하여 resolver가 fallback 여부를 결정할 수 있다.

## 9. 기대 흐름

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
Validation
 ├─ valid → Minimal Context
 └─ invalid/miss → Source Fallback → Repair
     ↓
필요한 정보만 resolve
```

## 10. 기대 효과

- **Token 절감:** 전체 파일 대신 필요한 line range만 전달
- **탐색 호출 감소:** `grep → read → grep → read`를 symbol lookup 중심으로 단축
- **결정적 탐색:** AST/language-aware index 기반 symbol 위치 제공
- **Fault Tolerance:** virtual index가 불완전해도 기존 source 탐색으로 복구
- **Self-Healing:** 실제 작업 중 발견된 최신 정보를 index에 반영
- **대형 프로젝트 대응:** 코드베이스 크기와 LLM context 크기의 결합 약화
- **Harness 공통 계층:** Claude/Codex 등 특정 모델에 종속되지 않는 탐색 계층

## 11. 핵심 원칙

```text
Codebase != Context
Virtual Index != Source of Truth
```

```text
Codebase
   ↓ virtualization
Virtual Code Map
   ↓ query + validation
Relevant Context
   ↓ resolve
Actual Source Fragment
```

Code-Virtualize의 목적은 **소스코드를 압축해서 LLM에게 전달하는 것이 아니라, 소스코드를 주소화(addressable)하여 필요한 순간에 필요한 만큼만 context로 materialize하는 것**이다.

## 12. Astra와 구체화할 항목

- Symbol index 생성 방식: AST / LSP / compiler API / tree-sitter 비교
- C# / C++ / UE5에서 공통 schema가 가능한지
- Progressive Symbol Virtualization의 실제 depth 정책
- visibility별 eager/lazy indexing 비용 비교
- sourceHash / revision / signature 중 validation 비용 대비 효율
- Perforce have revision / changelist / digest 기반 freshness 검증
- fallback 탐색을 어느 조건에서 실행할지
- self-healing update가 동시 작업에서 충돌하지 않도록 하는 방법
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
- stale index 발생 시 fallback 비용 benchmark

## 13. 초기 PoC 제안

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
validate
  ├─ valid → resolve source range
  └─ miss/stale → source fallback → repair index
```

먼저 **Virtual-Symbol만으로 Claude의 탐색 Read 호출과 input token이 얼마나 줄어드는지**, 그리고 stale index 발생 시 fallback/repair 비용을 함께 측정한다.

효과가 확인되면 `Virtual-Symbol → Virtual-Remark → Virtual-Reference → Dependency/Diff/History` 순으로 확장한다.

---

### 한 줄 정의

> **Code-Virtualize는 코드베이스를 LLM context에 직접 적재하는 대신 symbol·remark·reference 단위로 가상화하고, 필요한 코드만 지연 materialize하며, 가상 정보가 실패하면 실제 source로 fallback하여 스스로 복구하는 LLM용 Code Context Virtualization Layer다.**
