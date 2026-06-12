# Web 도구 공장 (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 광고 수익용 웹 툴을 대량 생산할 수 있는 모노레포 기반을 구축하고, 첫 번째 툴(대출 이자 계산기)을 Vercel 배포 가능한 상태로 완성한다.

**Architecture:** pnpm workspace 모노레포. `packages/ui`에 공유 컴포넌트(레이아웃, 광고 슬롯), `apps/<툴이름>`에 개별 툴. 각 앱은 외부 API 없는 정적 SPA로, Vercel에 앱 단위로 배포한다. 계산 로직은 UI와 분리된 순수 함수로 작성해 TDD로 검증한다.

**Tech Stack:** pnpm workspaces, Vite, React 18, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), Vitest

**Repo 위치:** `D:\workspace\repositories\tool-factory` (신규 레포)

**스코프 노트:** 스펙의 Phase 2(Flutter 앱 공장)는 웹 검증 이후 별도 계획으로 작성한다. 이 계획은 Phase 1 기반 + 첫 툴 1개까지만 다룬다. AdSense 실제 승인·스니펫 삽입은 배포 후 수동 작업(승인 심사 필요)이므로 광고 자리(슬롯 컴포넌트)까지만 구현한다.

---

## File Structure

```
tool-factory/
├── package.json                  # 워크스페이스 루트 (스크립트만, 코드 없음)
├── pnpm-workspace.yaml
├── .gitignore
├── README.md                     # 새 툴 추가 절차 문서
├── packages/
│   └── ui/                       # 공유 컴포넌트 패키지 (@factory/ui)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts          # 공개 API (배럴 export)
│           ├── ToolLayout.tsx    # 공통 레이아웃 (헤더/푸터/광고 배치)
│           └── AdSlot.tsx        # 광고 슬롯 (AdSense 코드 자리)
└── apps/
    └── loan-calculator/          # 첫 번째 툴
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts
        ├── index.html            # SEO 메타 포함
        ├── DESIGN.md             # 선택한 디자인 컨셉 (awesome-design-md에서 fetch)
        └── src/
            ├── main.tsx
            ├── App.tsx           # UI (입력 폼 + 결과 표)
            ├── index.css
            └── lib/
                ├── loan.ts       # 대출 계산 순수 함수 (테스트 대상)
                └── loan.test.ts
```

**책임 분리:**
- `packages/ui` — 모든 툴이 공유하는 **구조** (광고 슬롯 배치, 페이지 골격). 시각 컨셉을 강제하지 않음.
- `apps/*/DESIGN.md` — 툴별 **시각 컨셉**. [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)의 73개 브랜드 디자인 시스템 중 선택해 fetch. AI가 UI 생성/수정 시 이 파일을 따른다.
- `apps/*/src/lib/` — 계산 로직. React를 모름(순수 TypeScript). 테스트는 여기에 집중.
- `apps/*/src/App.tsx` — lib 함수를 호출해 화면에 뿌리는 접착 코드.

**디자인 컨셉 선택 흐름:** [getdesign.md](https://getdesign.md)에서 카탈로그를 둘러보고 → 툴 성격에 맞는 브랜드를 고른 뒤 → 아래 명령으로 raw 파일을 가져온다 (레포 구조: `design-md/<브랜드>/DESIGN.md`):

```powershell
curl.exe -o apps/<툴이름>/DESIGN.md https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/<브랜드>/DESIGN.md
```

주의: 브랜드 분석 파일은 색·타이포·간격 등 **디자인 언어의 영감**으로만 사용한다. 로고·브랜드명·고유 일러스트를 모방하지 않는다.

---

### Task 1: 모노레포 스캐폴드

**Files:**
- Create: `D:\workspace\repositories\tool-factory\package.json`
- Create: `D:\workspace\repositories\tool-factory\pnpm-workspace.yaml`
- Create: `D:\workspace\repositories\tool-factory\.gitignore`

- [ ] **Step 1: 레포 디렉터리 생성 및 git 초기화**

```powershell
New-Item -ItemType Directory -Force D:\workspace\repositories\tool-factory
Set-Location D:\workspace\repositories\tool-factory
git init -b main
```

- [ ] **Step 2: 루트 package.json 작성**

`package.json`:
```json
{
  "name": "tool-factory",
  "private": true,
  "scripts": {
    "test": "pnpm -r test",
    "build": "pnpm -r build"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 3: pnpm-workspace.yaml 작성**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 4: .gitignore 작성**

`.gitignore`:
```
node_modules/
dist/
.env
.env.local
.env.*.local
.vercel
```

- [ ] **Step 5: pnpm 설치 확인**

Run: `pnpm --version`
Expected: 버전 출력 (예: `9.x.x`). 없으면 `npm install -g pnpm` 후 재확인.

- [ ] **Step 6: Commit**

```powershell
git add package.json pnpm-workspace.yaml .gitignore
git commit -m "chore: scaffold pnpm workspace monorepo"
```

---

### Task 2: 공유 UI 패키지 (@factory/ui)

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`
- Create: `packages/ui/src/AdSlot.tsx`
- Create: `packages/ui/src/ToolLayout.tsx`

- [ ] **Step 1: 패키지 메타 작성**

`packages/ui/package.json`:
```json
{
  "name": "@factory/ui",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.6.0"
  }
}
```

소스를 그대로 export한다(빌드 없음). 앱의 Vite가 함께 번들하므로 패키지 빌드 단계가 필요 없다 — 유지보수 최소화.

`packages/ui/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 2: AdSlot 컴포넌트 작성**

`packages/ui/src/AdSlot.tsx`:
```tsx
interface AdSlotProps {
  /** AdSense 승인 후 발급받는 슬롯 ID. 없으면 자리표시자 렌더 */
  slotId?: string;
  className?: string;
}

/**
 * 광고 슬롯. AdSense 승인 전에는 회색 자리표시자를 렌더하고,
 * slotId가 주어지면 <ins class="adsbygoogle"> 태그를 렌더한다.
 * AdSense 로더 스크립트는 각 앱의 index.html <head>에서 1회 로드한다.
 */
export function AdSlot({ slotId, className = "" }: AdSlotProps) {
  if (!slotId) {
    return (
      <div
        className={`flex h-24 items-center justify-center rounded bg-gray-100 text-sm text-gray-400 ${className}`}
        aria-hidden="true"
      >
        AD
      </div>
    );
  }
  return (
    <ins
      className={`adsbygoogle block ${className}`}
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
      data-ad-slot={slotId}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
```

`ca-pub-XXXXXXXXXXXXXXXX`는 AdSense 승인 후 실제 게시자 ID로 치환한다(배포 후 수동 작업).

- [ ] **Step 3: ToolLayout 컴포넌트 작성**

`packages/ui/src/ToolLayout.tsx`:
```tsx
import type { ReactNode } from "react";
import { AdSlot } from "./AdSlot";

interface ToolLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

/**
 * 모든 툴의 공통 골격: 제목 + 상단 광고 + 본문 + 하단 광고 + 푸터.
 * 광고 슬롯 2개가 기본 포함된다 (스펙의 "광고 슬롯 2개" 요구사항).
 */
export function ToolLayout({ title, description, children }: ToolLayoutProps) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-gray-500">{description}</p>
      </header>
      <AdSlot className="mb-6" />
      <main>{children}</main>
      <AdSlot className="mt-8" />
      <footer className="mt-8 border-t pt-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} jaywapp tools
      </footer>
    </div>
  );
}
```

- [ ] **Step 4: 배럴 export 작성**

`packages/ui/src/index.ts`:
```ts
export { AdSlot } from "./AdSlot";
export { ToolLayout } from "./ToolLayout";
```

- [ ] **Step 5: 의존성 설치 및 타입 체크**

```powershell
pnpm install
pnpm --filter @factory/ui exec tsc --noEmit
```

Expected: 에러 없이 종료 (exit 0)

- [ ] **Step 6: Commit**

```powershell
git add packages/
git commit -m "feat: add shared UI package with ToolLayout and AdSlot"
```

---

### Task 3: 첫 툴 앱 스캐폴드 (loan-calculator)

**Files:**
- Create: `apps/loan-calculator/package.json`
- Create: `apps/loan-calculator/tsconfig.json`
- Create: `apps/loan-calculator/vite.config.ts`
- Create: `apps/loan-calculator/index.html`
- Create: `apps/loan-calculator/src/main.tsx`
- Create: `apps/loan-calculator/src/index.css`
- Create: `apps/loan-calculator/src/App.tsx` (임시 빈 셸 — Task 5에서 구현)

- [ ] **Step 1: package.json 작성**

`apps/loan-calculator/package.json`:
```json
{
  "name": "loan-calculator",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@factory/ui": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: tsconfig.json 작성**

`apps/loan-calculator/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src", "../../packages/ui/src"]
}
```

- [ ] **Step 3: vite.config.ts 작성**

`apps/loan-calculator/vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

- [ ] **Step 4: index.html 작성 (SEO 메타 포함)**

`apps/loan-calculator/index.html`:
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>대출 이자 계산기 — 원리금균등·원금균등 월 상환액 계산</title>
    <meta
      name="description"
      content="대출 원금, 연이율, 기간을 입력하면 원리금균등·원금균등 방식의 월 상환액과 총 이자를 즉시 계산합니다. 무료, 설치 없음."
    />
    <meta property="og:title" content="대출 이자 계산기" />
    <meta property="og:description" content="원리금균등·원금균등 월 상환액 즉시 계산" />
    <!-- AdSense 승인 후 아래 주석 해제 및 client ID 치환
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
    -->
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: 엔트리 파일 작성**

`apps/loan-calculator/src/index.css`:
```css
@import "tailwindcss";
/* Tailwind v4는 node_modules를 스캔하지 않으므로 워크스페이스 UI 패키지 경로를 명시 */
@source "../../../packages/ui/src";
```

`apps/loan-calculator/src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

`apps/loan-calculator/src/App.tsx` (임시 셸 — Task 5에서 교체):
```tsx
import { ToolLayout } from "@factory/ui";

export function App() {
  return (
    <ToolLayout
      title="대출 이자 계산기"
      description="원리금균등·원금균등 월 상환액을 즉시 계산합니다."
    >
      <p>구현 예정</p>
    </ToolLayout>
  );
}
```

- [ ] **Step 6: 디자인 컨셉 fetch (stripe — 금융 툴에 적합)**

```powershell
curl.exe -o apps/loan-calculator/DESIGN.md https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/stripe/DESIGN.md
```

Expected: `apps/loan-calculator/DESIGN.md` 생성, 내용에 색상·타이포그래피 토큰 포함

- [ ] **Step 7: 설치 및 dev 서버 기동 확인**

```powershell
pnpm install
pnpm --filter loan-calculator dev
```

Expected: `http://localhost:5173` 접속 시 제목·회색 AD 자리표시자 2개·"구현 예정" 표시. 확인 후 Ctrl+C로 종료.

- [ ] **Step 8: Commit**

```powershell
git add apps/
git commit -m "feat: scaffold loan-calculator app with shared layout and design concept"
```

---

### Task 4: 대출 계산 로직 (TDD)

**Files:**
- Create: `apps/loan-calculator/src/lib/loan.test.ts`
- Create: `apps/loan-calculator/src/lib/loan.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/loan-calculator/src/lib/loan.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { calcEqualPayment, calcEqualPrincipal } from "./loan";

describe("calcEqualPayment (원리금균등)", () => {
  // 검증값: 1억원, 연 5%, 12개월 → 월 상환액 8,560,748원 (표준 공식 계산)
  it("1억원 연5% 12개월의 월 상환액을 계산한다", () => {
    const r = calcEqualPayment({ principal: 100_000_000, annualRate: 5, months: 12 });
    expect(r.monthlyPayment).toBe(8_560_748);
    expect(r.totalInterest).toBe(r.monthlyPayment * 12 - 100_000_000);
  });

  it("이율 0%면 원금/개월수를 그대로 나눈다", () => {
    const r = calcEqualPayment({ principal: 12_000_000, annualRate: 0, months: 12 });
    expect(r.monthlyPayment).toBe(1_000_000);
    expect(r.totalInterest).toBe(0);
  });
});

describe("calcEqualPrincipal (원금균등)", () => {
  it("1억원 연5% 12개월: 첫달 상환액과 총이자를 계산한다", () => {
    const r = calcEqualPrincipal({ principal: 100_000_000, annualRate: 5, months: 12 });
    // 첫달 = 원금 8,333,333 + 이자 416,667 = 8,750,000
    expect(r.firstPayment).toBe(8_750_000);
    // 총이자 = 월이자율 × 원금 × (n+1)/2 = 0.05/12 × 1억 × 6.5 = 2,708,333
    expect(r.totalInterest).toBe(2_708_333);
  });

  it("이율 0%면 총이자 0", () => {
    const r = calcEqualPrincipal({ principal: 12_000_000, annualRate: 0, months: 12 });
    expect(r.firstPayment).toBe(1_000_000);
    expect(r.totalInterest).toBe(0);
  });
});

describe("입력 검증", () => {
  it("원금/개월이 0 이하면 throw", () => {
    expect(() => calcEqualPayment({ principal: 0, annualRate: 5, months: 12 })).toThrow();
    expect(() => calcEqualPayment({ principal: 1000, annualRate: 5, months: 0 })).toThrow();
    expect(() => calcEqualPayment({ principal: 1000, annualRate: -1, months: 12 })).toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm --filter loan-calculator test`
Expected: FAIL — `Cannot find module './loan'` 또는 유사 에러

- [ ] **Step 3: 구현 작성**

`apps/loan-calculator/src/lib/loan.ts`:
```ts
export interface LoanInput {
  /** 대출 원금 (원) */
  principal: number;
  /** 연이율 (%, 예: 5는 5%) */
  annualRate: number;
  /** 상환 기간 (개월) */
  months: number;
}

export interface EqualPaymentResult {
  /** 매월 상환액 (원, 반올림) */
  monthlyPayment: number;
  /** 총 이자 (원) */
  totalInterest: number;
}

export interface EqualPrincipalResult {
  /** 첫 달 상환액 (원, 반올림) — 가장 큰 달 */
  firstPayment: number;
  /** 총 이자 (원, 반올림) */
  totalInterest: number;
}

function validate({ principal, annualRate, months }: LoanInput): void {
  if (principal <= 0) throw new Error("원금은 0보다 커야 합니다");
  if (months <= 0) throw new Error("기간은 1개월 이상이어야 합니다");
  if (annualRate < 0) throw new Error("이율은 0 이상이어야 합니다");
}

/** 원리금균등: 매월 동일 금액 상환 */
export function calcEqualPayment(input: LoanInput): EqualPaymentResult {
  validate(input);
  const { principal, annualRate, months } = input;
  const r = annualRate / 100 / 12;
  const monthlyPayment =
    r === 0
      ? Math.round(principal / months)
      : Math.round((principal * r * (1 + r) ** months) / ((1 + r) ** months - 1));
  return {
    monthlyPayment,
    totalInterest: monthlyPayment * months - principal,
  };
}

/** 원금균등: 매월 동일 원금 + 잔액 이자 (첫 달이 가장 큼) */
export function calcEqualPrincipal(input: LoanInput): EqualPrincipalResult {
  validate(input);
  const { principal, annualRate, months } = input;
  const r = annualRate / 100 / 12;
  const monthlyPrincipal = principal / months;
  return {
    firstPayment: Math.round(monthlyPrincipal + principal * r),
    totalInterest: Math.round(r * principal * ((months + 1) / 2)),
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm --filter loan-calculator test`
Expected: PASS — 6 tests passed

- [ ] **Step 5: Commit**

```powershell
git add apps/loan-calculator/src/lib/
git commit -m "feat: add loan calculation logic with tests"
```

---

### Task 5: UI 연결

**Files:**
- Modify: `apps/loan-calculator/src/App.tsx` (Task 3의 임시 셸 전체 교체)

- [ ] **Step 1: App.tsx 구현**

`apps/loan-calculator/src/App.tsx` 전체 교체:
```tsx
import { useState } from "react";
import { ToolLayout } from "@factory/ui";
import { calcEqualPayment, calcEqualPrincipal } from "./lib/loan";

const fmt = (n: number) => n.toLocaleString("ko-KR");

export function App() {
  const [principal, setPrincipal] = useState("100000000");
  const [rate, setRate] = useState("5");
  const [months, setMonths] = useState("360");

  const p = Number(principal);
  const r = Number(rate);
  const m = Number(months);
  const valid = p > 0 && r >= 0 && m > 0;

  const ep = valid ? calcEqualPayment({ principal: p, annualRate: r, months: m }) : null;
  const epr = valid ? calcEqualPrincipal({ principal: p, annualRate: r, months: m }) : null;

  return (
    <ToolLayout
      title="대출 이자 계산기"
      description="원리금균등·원금균등 월 상환액을 즉시 계산합니다."
    >
      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">대출 원금 (원)</span>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">연이율 (%)</span>
          <input
            type="number"
            step="0.1"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">상환 기간 (개월)</span>
          <input
            type="number"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>

        {!valid && (
          <p className="text-sm text-red-500">원금·기간은 0보다 커야 합니다.</p>
        )}

        {ep && epr && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h2 className="font-semibold">원리금균등</h2>
              <p className="mt-2 text-sm text-gray-500">매월 상환액</p>
              <p className="text-xl font-bold">{fmt(ep.monthlyPayment)}원</p>
              <p className="mt-2 text-sm text-gray-500">총 이자</p>
              <p className="text-lg">{fmt(ep.totalInterest)}원</p>
            </div>
            <div className="rounded-lg border p-4">
              <h2 className="font-semibold">원금균등</h2>
              <p className="mt-2 text-sm text-gray-500">첫 달 상환액</p>
              <p className="text-xl font-bold">{fmt(epr.firstPayment)}원</p>
              <p className="mt-2 text-sm text-gray-500">총 이자</p>
              <p className="text-lg">{fmt(epr.totalInterest)}원</p>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
```

- [ ] **Step 2: DESIGN.md 컨셉 적용**

`apps/loan-calculator/DESIGN.md`를 읽고, Step 1의 App.tsx Tailwind 클래스를 컨셉에 맞게 조정한다(색상 팔레트, 폰트 굵기, 버튼·카드 스타일, 모서리 곡률, 간격). 로직(`lib/loan.ts` 호출부)과 컴포넌트 구조는 변경하지 않는다 — className과 시각 요소만 수정.

AI에게 맡길 경우 프롬프트:
> apps/loan-calculator/DESIGN.md를 읽고, src/App.tsx의 Tailwind 클래스를 이 디자인 시스템의 색상·타이포그래피·컴포넌트 스타일에 맞게 수정해줘. 컴포넌트 구조와 로직은 그대로 두고 className만 바꿔. 브랜드명·로고는 사용하지 마.

- [ ] **Step 3: dev 서버에서 수동 확인**

Run: `pnpm --filter loan-calculator dev`
확인 항목:
1. 기본값(1억/5%/360개월)으로 원리금균등 월 상환액 536,822원이 표시됨
2. 원금을 0으로 바꾸면 빨간 안내 문구 표시, 크래시 없음
3. 광고 자리표시자 2개(상단/하단) 표시
4. DESIGN.md 컨셉(색·타이포)이 반영된 모습

확인 후 Ctrl+C로 종료.

- [ ] **Step 4: 빌드 확인**

Run: `pnpm --filter loan-calculator build`
Expected: `dist/` 생성, 에러 없음

- [ ] **Step 5: Commit**

```powershell
git add apps/loan-calculator/src/App.tsx
git commit -m "feat: wire loan calculator UI with stripe design concept"
```

---

### Task 6: 배포 준비 및 문서화

**Files:**
- Create: `README.md` (레포 루트)

- [ ] **Step 1: README 작성 (새 툴 추가 절차 포함)**

`README.md`:
````markdown
# tool-factory

광고 수익용 웹 툴 모노레포. 서버 없음, 외부 API 없음, Vercel 무료 배포.

## 구조

- `packages/ui` — 공유 컴포넌트 (`ToolLayout`, `AdSlot`)
- `apps/<툴이름>` — 개별 툴 (Vite + React + Tailwind)

## 명령어

```bash
pnpm install                          # 전체 설치
pnpm --filter <앱이름> dev            # 개발 서버
pnpm --filter <앱이름> test           # 테스트
pnpm build                            # 전체 빌드
```

## 공장 워크플로우

새 툴은 항상 3단계로 만든다: **목표 설정 → design.md 선정 → 작업 시작**

### ① 목표 설정

- 무엇을 만들지 한 문장으로 정의 (예: "전세 vs 월세 비교 계산기")
- Google Trends / 네이버 검색량으로 수요 확인 (30분 이내)
- 핵심 기능 1개 + 광고 포인트 위치 결정

### ② design.md 선정

[getdesign.md](https://getdesign.md)에서 툴 성격에 맞는 브랜드 컨셉을 고른다:

| 툴 성격 | 컨셉 예시 |
|---------|----------|
| 금융 계산기 | `stripe`, `revolut`, `wise` |
| 개발자 도구 | `linear.app`, `vercel`, `raycast` |
| 문서/정보 | `notion`, `mintlify` |
| 퀴즈/재미 | `nintendo-2001`, `spotify` |

```bash
curl -o apps/<새이름>/DESIGN.md https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/<브랜드>/DESIGN.md
```

### ③ 작업 시작

1. `apps/loan-calculator`를 복사해 `apps/<새이름>`으로 붙여넣기
2. `package.json`의 `name`, `index.html`의 title/description 변경
3. `src/lib/`에 계산 로직 + 테스트 작성 (TDD)
4. `src/App.tsx`에서 UI 연결 — AI에게 "DESIGN.md를 따라 스타일링해줘" 프롬프트
5. Vercel에서 새 프로젝트 생성 (아래 배포 설정 참고)

## Vercel 배포 설정 (앱마다 1회)

Vercel 대시보드 → Add New Project → 이 레포 선택 후:

| 설정 | 값 |
|------|-----|
| Root Directory | `apps/<툴이름>` |
| Framework Preset | Vite |
| Build Command | `pnpm build` (기본값) |
| Install Command | 기본값 (pnpm 자동 감지) |

→ 배포 URL: `<프로젝트명>.vercel.app`

## AdSense 연결 (승인 후 1회)

1. [AdSense](https://adsense.google.com) 가입 → 사이트 등록 → 승인 대기 (1~2주)
2. 승인 후 각 앱 `index.html`의 AdSense `<script>` 주석 해제, `ca-pub-XXXX`를 실제 게시자 ID로 치환
3. `packages/ui/src/AdSlot.tsx`의 `data-ad-client`도 동일하게 치환
4. 광고 단위 생성 → 슬롯 ID를 `<AdSlot slotId="...">`로 전달
````

- [ ] **Step 2: 전체 테스트·빌드 최종 확인**

```powershell
pnpm test
pnpm build
```

Expected: 둘 다 에러 없이 종료

- [ ] **Step 3: Commit**

```powershell
git add README.md
git commit -m "docs: add monorepo usage and deployment guide"
```

- [ ] **Step 4: GitHub 레포 생성 및 push**

```powershell
gh repo create jaywapp/tool-factory --private --source . --push
```

Expected: `https://github.com/jaywapp/tool-factory` 생성, main 브랜치 push 완료

---

### Task 7: Vercel 배포 (수동 단계)

코드 작업이 아닌 1회성 수동 설정. 실행자는 사용자에게 안내만 한다.

- [ ] **Step 1: Vercel 프로젝트 생성 안내**

사용자에게 안내:
1. https://vercel.com/new 접속 → GitHub 연동 → `tool-factory` 레포 선택
2. Root Directory를 `apps/loan-calculator`로 설정
3. Framework Preset: Vite 확인 후 Deploy

- [ ] **Step 2: 배포 확인**

`https://<프로젝트명>.vercel.app` 접속 → 계산기 동작 확인

- [ ] **Step 3: AdSense 신청 안내**

배포된 URL로 AdSense 사이트 등록 → 승인 대기. 승인 후 README의 "AdSense 연결" 절차 수행.

---

### Task 8: new-tool 스킬 작성 (1호기 완성 후)

공장 워크플로우를 워크스페이스 스킬로 만들어 2호기부터 자동화한다.

**Files:**
- Create: `D:\workspace\.claude\skills\new-tool\SKILL.md`

- [ ] **Step 1: superpowers:writing-skills 스킬을 사용해 작성**

스킬 내용 요구사항:
- 트리거: "/new-tool <툴 이름>" 또는 "새 툴 만들어줘"
- ① 목표 설정: 핵심 기능 1개 + 광고 포인트 확정 (사용자에게 질문)
- ② design.md 선정: 툴 성격 분류 → 컨셉 2~3개 제안 → 사용자 선택 → awesome-design-md에서 curl fetch
- ③ 작업 시작: `apps/loan-calculator` 복사 → 메타 변경 → 계산 로직 TDD → App.tsx UI + DESIGN.md 스타일 → 빌드 확인 → 커밋 → Vercel 배포 안내
- 1호기 실행에서 드러난 함정(빌드 에러, 설정 이슈)을 스킬 본문에 반영

- [ ] **Step 2: 스킬 등록 확인**

D:\workspace\CLAUDE.md의 스킬 표에 `new-tool` 행 추가

- [ ] **Step 3: 검증**

`/new-tool` 호출로 2호기 1개를 실제 생산해 절차가 막힘없이 도는지 확인

---

## 이후 계획 (이 plan 범위 밖)

- 툴 2~4호 추가 (월 2~4개 목표) — `/new-tool` 스킬로 반복
- 2주 트래픽 모니터링 후 Flutter 포팅 후보 선별 → Phase 2 plan 별도 작성
