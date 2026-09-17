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

Code-Virtualize의 공식 데이터 확장자는 **`.cv`**다.

```text
.code-virtualize/
├─ config.json
├─ baseline/
│  ├─ manifest.cv
│  ├─ symbol.cv
│  ├─ remark.cv
│  └─ reference.cv
├─ current/
│  ├─ manifest.cv
│  ├─ symbol.cv
│  ├─ remark.cv
│  └─ reference.cv
└─ diff/
   └─ current.diff.cv
```

`manifest.cv`에는 session ID, 생성 시각, workspace/VCS 기준점, schema version 등을 둔다. Perforce 환경에서는 have revision/changelist/digest 등을 기준점 후보로 검토한다.

### Session Lifecycle

```text
SESSION START → Full .cv Build → VALID
                              ↓ source edit
                            DIRTY
                              ↓ changed-file incremental build
                            VALID
                              ↓
                         SESSION END
                              ↓
                           DISCARD
```

세션 시작마다 현재 source로 `.cv`를 재구축하고 세션 도중 파일 수정 시 변경 파일만 incremental re-index한다.

## 3. 기본 구조

```text
code-virtualize
├─ virtual-symbol
├─ virtual-remark
├─ virtual-reference
├─ virtual-diff
└─ resolver
```

향후 `virtual-dependency`, `virtual-history` 등의 계층도 검토한다.

## 4. Virtual-Symbol / Progressive Virtualization

프로젝트의 class/method/property/field/variable을 file + line range + signature 형태로 주소화한다.

```text
L0 Project    : public API / type
   ↓ resolve
L1 Type       : public / protected / private members
   ↓ resolve
L2 Method     : parameters / locals / local functions
   ↓ 필요 시
L3 Expression : lambda / capture / temporary dependency
```

| Symbol 범위 | 기본 생성 시점 | 저장 범위 |
|---|---|---|
| public/internal | Project indexing | Project Index / session |
| protected | Type indexing 또는 resolve | Type Index |
| private member | Type indexing 또는 접근 시 | Type Index / 선택적 |
| parameter/local | Method resolve | 임시 |
| lambda/local function | Method resolve | 임시 |

```text
Materialization Priority
 = Visibility
 + Symbol Kind
 + Reference Count
 + Call/Dependency Distance
 + Current Task Relevance
```

Visibility는 materialization을 결정하는 signal 중 하나일 뿐이다.

## 5. Virtual-Remark / Reference

`remark.cv`는 comment/XML docs를 별도 보관하고 필요할 때만 lazy resolve한다. `reference.cv`는 symbol별 사용 위치를 관리하여 반복적인 grep/rg를 줄이고 변경 영향 분석의 기반으로 사용한다.

## 6. Self-Healing / Fallback

`.cv`는 source of truth가 아니다.

```text
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

세션 시작 full build + edit 시 incremental update를 **1차 freshness 방어선**, validation/self-healing을 **2차 방어선**으로 둔다.

```text
USE → DETECT → FALLBACK → DISCOVER → REPAIR → REUSE
```

## 7. Virtual-Diff와 코드 리뷰

세션 시작 `CV₀`와 작업 후 `CV₁`을 비교해 textual diff와 별도의 semantic/symbol diff를 만든다.

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

`.cv`는 review scope를 찾는 index이며 실제 source/diff가 최종 증거다.

```text
CL diff = textual change
CV diff = semantic/symbol change
```

## 8. Tool Architecture

CLI/tool prefix는 **`cv-*`**로 통일한다.

| 도구 | 역할 |
|---|---|
| `cv-build` | Source → `.cv` snapshot |
| `cv-find` | symbol 검색 |
| `cv-resolve` | symbol → 실제 source range |
| `cv-update` | changed-file incremental re-index |
| `cv-diff` | CV₀ ↔ CV₁ semantic diff |
| `cv-impact` | reference/dependency 영향 분석 |
| `cv-validate` | `.cv` ↔ source 검증 |
| `cv-inspect` | 사람이 보는 CV debugger |

Claude에게는 초기에는 `cv_find`, `cv_get`, `cv_impact` 정도만 노출하고 lifecycle 작업은 Harness가 자동 수행한다.

## 9. Workspace Integration

Claude workspace에서는 Claude 설정과 CV runtime을 분리한다.

```text
workspace/
├─ CLAUDE.md
├─ .claude/
│  ├─ settings.json
│  ├─ skills/
│  │  └─ code-virtualize/
│  │     └─ SKILL.md
│  └─ hooks/
├─ .code-virtualize/
│  ├─ config.json
│  ├─ baseline/
│  ├─ current/
│  └─ diff/
└─ src/
```

`.claude/`는 **Claude가 CV를 어떻게 사용할지 정의하는 AI Integration Layer**, `.code-virtualize/`는 **CV Engine runtime/data layer**다. `.code-virtualize/`는 재생성 가능한 artifact이므로 Git/Perforce ignore 대상으로 본다.

## 10. Installation Model — Global + Workspace

Code-Virtualize는 전역 설치와 특정 workspace 설치를 모두 지원하는 방향으로 설계한다.

```text
Code-Virtualize
├─ Engine
├─ Agent Integration
└─ Workspace Data (.cv)
```

전역 설치를 해도 `.cv` runtime data는 각 workspace에 존재한다.

```text
Global CV Engine
      ↓
Project A/.code-virtualize/
Project B/.code-virtualize/
Project C/.code-virtualize/
```

설정 precedence는 다음을 기본안으로 한다.

```text
Built-in Default
      ↓
Global Config
      ↓
Workspace Config
      ↓
Session Override
```

개념적 CLI UX:

```text
cv install --global
cv install --workspace
cv integrate claude --global
cv integrate claude --workspace
cv integrate codex --global
cv integrate codex --workspace
```

## 11. Distribution Architecture — CLI/Core + Agent Plugin

**Code-Virtualize 자체를 Claude Plugin으로 만들지 않는다.** 독립적인 AI Code Context Engine으로 만들고 Claude Plugin은 첫 번째 adapter/integration으로 둔다.

```text
                 Code-Virtualize Engine
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          Claude       Codex       Astra
             │           │           │
             └───────────┼───────────┘
                         ▼
                  Workspace .cv
                         │
                         ▼
                    Source Code
```

### npm의 역할

npm은 우선 **배포/launcher 수단**으로 검토한다.

```text
npm install -g code-virtualize

cv init
cv build
cv status
cv inspect
```

Workspace local 설치도 지원할 수 있다.

```text
npm install -D code-virtualize
npx cv init
```

단, npm을 사용한다고 해서 Core 구현 전체를 Node/TypeScript로 제한하지 않는다. C#은 Roslyn worker, C++은 clang/tree-sitter 등 언어별 native/별도 adapter를 사용할 수 있다.

```text
npm package / cv launcher
        │
        ├─ C# Adapter → Roslyn worker
        ├─ C++ Adapter → clang / tree-sitter
        └─ Generic Adapter → tree-sitter 등
```

### Claude Plugin의 책임

Claude Plugin에는 CV engine 자체보다 **언제/어떻게 CV를 사용할지에 대한 integration logic**을 둔다.

```text
code-virtualize-claude/
├─ plugin metadata
├─ skills/
│  └─ code-virtualize/
│     └─ SKILL.md
└─ hooks/
   ├─ session-start → cv build
   └─ source-changed → cv update
```

즉 역할은 다음처럼 분리한다.

```text
CV CLI/Core
  Source → .cv
  .cv → Query / Resolve / Diff / Impact

Claude Plugin
  Claude session lifecycle
  ↓
  언제 CV Engine을 호출할지 결정
```

이렇게 하면 같은 Engine을 Claude, Codex, Astra, VS Code Extension, CI Review 등에서 공유할 수 있다.

> **Code-Virtualize는 Claude Plugin이 아니다. 독립적인 AI Code Context Engine이고, Claude Plugin은 첫 번째 integration이다.**

## 12. Repository / Package 구조 초안

초기에는 하나의 repository에서 monorepo 형태를 검토한다.

```text
code-virtualize/
├─ packages/
│  ├─ cli/
│  │  └─ cv
│  ├─ core/
│  ├─ adapters/
│  │  ├─ csharp/
│  │  └─ cpp/
│  └─ claude/
│     ├─ skills/
│     └─ hooks/
├─ docs/
└─ tests/
```

Core 구현 언어와 npm package 구조는 PoC 결과에 따라 조정한다.

## 13. 개발 순서

```text
cv-build
 → cv-find
 → cv-resolve
 → cv-inspect
 → cv-update
 → virtual-reference / cv-impact
 → cv-diff
 → review integration
```

### Phase 1 — Symbol PoC
C# + Roslyn/AST를 우선 후보로 `symbol.cv`를 만들고 기존 Claude 탐색 대비 Read 호출 수, input token, latency를 측정한다.

### Phase 2 — Session Consistency
File watcher/Harness edit detection + `cv-update`로 changed-file incremental indexing을 구현한다.

### Phase 3 — Reference / Review
`reference.cv`, `cv-impact`, `cv-diff`를 추가하고 Perforce changelist 기반 코드 리뷰에 적용한다.

## 14. Astra와 구체화할 항목

- npm을 launcher/distribution으로 사용할지
- Core 구현 언어와 package 경계
- Claude Plugin packaging 방식
- Global/Workspace installation lifecycle
- `.cv` serialization: JSONL / SQLite / custom binary
- `.cv` schema/versioning
- Roslyn / LSP / compiler API / tree-sitter 비교
- C# / C++ / UE5 공통 schema
- Progressive Symbol Virtualization depth
- session start full-build latency
- changed-file incremental indexing
- Perforce baseline/freshness 검증
- symbol ID 안정성
- UE C++ macro/generated code
- `cv-impact` dependency expansion
- textual diff ↔ virtual diff mapping
- Claude Code MCP/tool/hook 노출 방식
- token/read-call/latency benchmark

---

### 한 줄 정의

> **Code-Virtualize는 세션 시작 시 현재 코드베이스를 `.cv`로 가상화하고 필요한 코드만 지연 materialize하는 독립적인 AI Code Context Engine이며, npm/CLI를 배포 인터페이스로, Claude Plugin을 첫 번째 Agent Integration으로 사용하는 구조를 지향한다.**
