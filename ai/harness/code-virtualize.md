# Code-Virtualize

> LLM에게 소스코드 전체를 읽히는 대신, 코드베이스를 탐색 가능한 가상 표현으로 변환하고 필요한 코드 조각만 지연 로드하는 **Code Context Virtualization Layer** 아이디어.

**상태:** Idea / 주말 Astra와 구체화 예정  
**목표:** Claude Code 기반 대규모 프로젝트 탐색 시 불필요한 파일 읽기와 토큰 소비를 줄이고, symbol 중심의 deterministic navigation을 제공한다.

## 1. 문제와 핵심 원칙

일반적인 코드 에이전트는 `검색 → 파일 Read → 추가 검색 → 관련 파일 Read → 주석/참조 탐색 → 작업`을 반복한다. Code-Virtualize는 이를 `질문 → Virtual Index 조회 → 관련 Symbol 식별 → 필요한 source/remark/reference만 resolve → 작업`으로 바꾼다.

```text
Codebase != Context
Virtual Index != Source of Truth
```

**소스코드는 Source of Truth이고 `.cv`는 현재 AI 세션의 탐색을 가속하는 disposable optimization/index layer다.**

## 2. `.cv` — Code-Virtualized Data

Code-Virtualize의 공식 데이터 확장자는 **`.cv`**로 통일한다. 기존 논의의 `.vd` 표현은 폐기한다.

세션 시작 시 현재 workspace를 기준으로 snapshot을 생성한다.

```text
.code-virtualize/
└─ session-{id}/
   ├─ manifest.cv
   ├─ symbol.cv
   ├─ remark.cv
   ├─ reference.cv
   └─ diff.cv
```

`manifest.cv`에는 session ID, 생성 시각, workspace/VCS 기준점, schema version 등의 metadata를 둔다. Perforce 환경에서는 have revision/changelist/digest 등을 기준점 후보로 검토한다.

### Session Lifecycle

```text
SESSION START
    ↓
Full .cv Build
    ↓
VALID
    ↓ source edit
DIRTY
    ↓ changed-file incremental build
VALID
    ↓
SESSION END
    ↓
DISCARD
```

세션 시작마다 현재 source로 `.cv`를 재구축함으로써 세션 간 stale data 전파를 줄인다. 세션 도중 Claude가 파일을 수정하면 Harness가 변경 파일만 감지하여 incremental re-index한다.

## 3. 기본 구조

```text
code-virtualize
├─ virtual-symbol
│  └─ class / method / property / field / variable → file + line range + signature
├─ virtual-remark
│  └─ comment / XML docs → remark-key → 실제 주석
├─ virtual-reference
│  └─ symbol → reference locations
├─ virtual-diff
│  └─ session baseline ↔ current semantic/symbol change
└─ resolver
   └─ virtual key / symbol → 실제 source fragment 반환
```

향후 `virtual-dependency`, `virtual-history` 등의 계층도 검토한다.

## 4. Virtual-Symbol

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

LLM은 프로젝트 전체를 grep/read하기 전에 `symbol.cv`를 조회한다. 필요한 경우에만 실제 source range를 resolve한다.

## 5. Progressive Symbol Virtualization

모든 symbol을 동일한 시점과 깊이로 인덱싱할 필요는 없다.

```text
L0 Project   : public API / type
   ↓ resolve
L1 Type      : public / protected / private members
   ↓ resolve
L2 Method    : parameters / locals / local functions
   ↓ 필요 시
L3 Expression: lambda / capture / temporary dependency
```

| Symbol 범위 | 기본 생성 시점 | 저장 범위 |
|---|---|---|
| public | Project indexing | Project Index / session |
| internal | Project indexing | Project Index / session |
| protected | Type indexing 또는 resolve | Type Index |
| private member | Type indexing 또는 접근 시 | Type Index / 선택적 |
| parameter/local variable | Method resolve | 임시 |
| lambda/local function | Method resolve | 임시 |

Access modifier만으로 materialization 여부를 결정하지 않는다.

```text
Materialization Priority
 = Visibility
 + Symbol Kind
 + Reference Count
 + Call/Dependency Distance
 + Current Task Relevance
```

Visibility는 symbol을 언제/어느 깊이까지 materialize할지 결정하는 signal 중 하나다.

## 6. Virtual-Remark

주석을 별도 `remark.cv`로 추출하고 작은 key로 연결한다. 코드 로직만 이해하는 상황에서는 주석 원문을 context에 넣지 않고 의미가 필요할 때만 resolve한다.

**주석을 제거하는 것이 아니라 comment context loading을 lazy하게 만드는 것**이 목적이다.

## 7. Virtual-Reference

Symbol별 사용 위치를 `reference.cv`로 관리한다.

```text
UserService.LoginAsync
→ LoginViewModel.cs:94
→ AuthController.cs:52
→ LoginCommand.cs:31
```

반복적인 grep/rg를 줄이는 동시에 변경 symbol의 영향 범위를 계산하는 기반이 된다.

## 8. Self-Healing / Fallback

`.cv`는 source of truth가 아니므로 누락되거나 틀려도 Claude의 작업이 중단되면 안 된다.

```text
Claude
 ↓
.cv 조회
 ├─ HIT + VALID → fast path
 ├─ MISS ───────┐
 └─ INVALID ────┴→ source grep/search/read
                     ↓
                  symbol 발견
                     ↓
                  .cv repair
                     ↓
                  작업 계속
```

`find` MISS는 symbol 부재를 확정하지 않는다. 의미적으로 `NOT_INDEXED_OR_NOT_FOUND`로 취급한다.

```text
USE → DETECT → FALLBACK → DISCOVER → REPAIR → REUSE
```

세션 시작 full build + edit 시 incremental update를 **1차 freshness 방어선**, validation/self-healing을 **예외 상황을 위한 2차 방어선**으로 둔다.

## 9. Virtual-Diff와 코드 리뷰

세션 시작 snapshot을 `CV₀`, 작업 후 상태를 `CV₁`로 보면 textual diff와 별도로 semantic/symbol diff를 만들 수 있다.

```text
CV₀ ── Claude 작업 ── CV₁
 │                      │
 └──── Virtual Diff ────┘

UserService.LoginAsync
  signature : unchanged
  body      : changed
  references: 4 → 6
  remarks   : changed

AuthService.Validate
  body      : changed

UserService._cache
  added
```

리뷰 흐름은 다음처럼 구성한다.

```text
Perforce/Text Diff + Virtual Diff
              ↓
        Changed Symbols
              ↓
 Reference / Dependency Expansion
              ↓
          Review Scope
              ↓
필요한 실제 Source/Diff만 resolve
              ↓
          Review Agent
```

`.cv`만으로 리뷰 결론을 내리지 않는다. **실제 source/diff가 최종 증거이고 `.cv`는 review scope를 찾는 index**다.

Perforce 환경에서는 다음 두 레이어를 함께 활용한다.

```text
CL diff = textual change
CV diff = semantic/symbol change
```

## 10. Tool Architecture

내부 엔진의 CLI/tool prefix는 **`cv-*`**로 통일한다.

| 도구 | 역할 | 실행 시점 |
|---|---|---|
| `cv-build` | Source → `.cv` session snapshot 생성 | 세션 시작 |
| `cv-find` | 이름/종류로 symbol 검색 | 작업 중 |
| `cv-resolve` | virtual symbol → 실제 source range | 작업 중 |
| `cv-update` | 수정된 파일만 재분석 | Edit 후 자동 |
| `cv-diff` | CV₀ ↔ CV₁ semantic diff | 작업/리뷰 |
| `cv-impact` | reference/dependency 영향 분석 | 리뷰 |
| `cv-validate` | `.cv`와 source 일치 확인 | fallback/필요 시 |
| `cv-inspect` | `.cv` 상태를 사람이 확인하는 debugger | 개발/진단 |

### AI Interface와 Engine 분리

Claude에게 내부 도구를 모두 노출할 필요는 없다. 초기 AI interface는 최소화한다.

```text
cv_find(query)
cv_get(symbol_id)
cv_impact(symbol_id)
```

`cv-build`, `cv-update`, validation/repair 등 lifecycle 작업은 Harness가 자동 수행한다.

```text
Claude Edit
    ↓
Harness detects changed file
    ↓
cv-update <file>
    ↓
*.cv refresh
```

이를 통해 CV Engine은 Claude에 종속되지 않고 Codex/Astra/Review Agent에서도 재사용할 수 있다.

## 11. cv-inspect

초기 개발 단계에서 virtual data를 사람이 검증하기 위한 debugger가 필요하다.

```text
cv-inspect UserService.LoginAsync

Symbol
  ID          VS:a82f
  Kind        Method
  Visibility  Public
  Source      UserService.cs:47-83
  State       VALID

References (6)
  LoginViewModel.cs:94
  AuthController.cs:52

Remarks
  VR:91ac

Changed
  No
```

초기에는 CLI로 구현하고 필요하면 이후 web viewer로 확장한다.

## 12. 개발 순서

```text
cv-build
   ↓
cv-find
   ↓
cv-resolve
   ↓
cv-inspect
   ↓
cv-update
   ↓
virtual-reference / cv-impact
   ↓
cv-diff
   ↓
review integration
```

### Phase 1 — Symbol PoC

```text
C# Project
  ↓ Roslyn/AST
cv-build
  ↓
symbol.cv
  ↓
cv-find
  ↓
cv-resolve
```

목표는 기존 Claude 탐색 대비 **Read 호출 수, input token, 탐색 latency**를 측정하는 것이다.

### Phase 2 — Session Consistency

File watcher/Harness edit detection과 `cv-update`를 연결해 수정 파일만 incremental re-index한다.

### Phase 3 — Reference / Review

`reference.cv`, `cv-impact`, `cv-diff`를 추가하고 Perforce changelist 기반 코드 리뷰에 적용한다.

## 13. Astra와 구체화할 항목

- `.cv`의 실제 serialization format: JSONL / SQLite / custom binary 여부
- `.cv` schema/versioning
- Symbol index 생성: Roslyn / AST / LSP / compiler API / tree-sitter 비교
- C# / C++ / UE5 공통 schema 가능성
- Progressive Symbol Virtualization depth 정책
- visibility별 eager/lazy indexing 비용
- session start full-build 비용과 허용 가능한 startup latency
- changed-file incremental indexing 방식
- Perforce have revision / changelist / digest 기반 session baseline
- sourceHash/revision/signature validation 비용
- fallback 실행 조건
- self-healing update 동시성
- symbol ID 안정성
- overloaded method / partial class / generated code 처리
- UE C++ macro 처리
- reference index 생성 비용
- `cv-impact` dependency expansion 범위
- textual diff ↔ virtual diff mapping
- review agent context 구성 방식
- Claude Code에서 MCP/tool/hook 중 노출 계층
- 실제 token/read-call/latency 절감 benchmark

---

### 한 줄 정의

> **Code-Virtualize는 세션 시작 시 현재 코드베이스를 `.cv`로 가상화하고, symbol·remark·reference를 통해 필요한 코드만 지연 materialize하며, 변경 시 incremental update하고 실패 시 실제 source로 fallback하는 LLM용 Code Context Virtualization Layer다.**
