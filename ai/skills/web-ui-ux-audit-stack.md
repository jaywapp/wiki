# 웹 UX/UI 점검용 플러그인·스킬 조합

## 결론

웹 프로젝트를 AI로 점검하려면 단일 디자인 스킬보다는 다음 2계층 조합이 가장 실용적이다.

1. **Impeccable** — UX/UI 품질 판단, 접근성·반응형·성능·시각적 완성도 감사
2. **Playwright MCP** — 실제 브라우저에서 페이지 순회, 클릭/입력/폼/상태 전환 및 접근성 트리 확인

필요하면 **Chrome DevTools MCP**를 추가해 성능, 네트워크, 콘솔, 런타임 문제까지 확장한다.

---

## 1. Impeccable — 1순위

GitHub: https://github.com/pbakaus/impeccable

기존 웹 UI를 체계적으로 검수하려는 목적에 가장 직접적으로 맞는다.

주요 기능:

- `/audit`: 코드 수준의 기술 품질 감사
- `/critique`: UX/UI 관점의 디자인 리뷰
- `/polish`: 마감 품질 개선
- `/harden`: 오류 상태, 긴 텍스트, i18n, edge case 보강
- `/adapt`: 반응형·디바이스 대응
- `/optimize`: 성능 개선
- deterministic detector를 통한 반복적 AI UI 안티패턴 탐지

`/audit`는 특히 다음 항목을 점검한다.

- 접근성(A11y)
- 키보드 탐색과 focus
- semantic HTML / ARIA
- contrast
- responsive behavior
- performance
- 구현 품질

설치 예:

```bash
npx impeccable install
```

설치 후 AI 코딩 도구에서:

```text
/impeccable init
```

### 추천 평가

**웹 UX/UI 점검 스킬 하나만 고른다면 Impeccable.**

---

## 2. Playwright MCP — 실제 화면 검증 담당

공식 문서/저장소:

- https://github.com/microsoft/playwright
- https://github.com/microsoft/playwright-mcp

Playwright MCP는 AI 에이전트가 실제 브라우저를 열어 웹 페이지를 탐색하고 상호작용하게 해준다.

주요 장점:

- 접근성 트리 기반으로 요소를 안정적으로 인식
- 실제 클릭/입력/폼 제출 가능
- 로그인 세션 유지 가능
- Chromium / Firefox / WebKit 지원
- screenshot, network mocking, storage, tracing 등 제공

Claude Code 설치:

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

### UX/UI 점검에서의 역할

Impeccable이 "무엇이 잘못됐는지" 판단한다면 Playwright는 "실제로 화면을 돌아다니며 확인"하는 역할이다.

예:

```text
Playwright로 localhost 웹 앱을 실행해서 주요 사용자 플로우를 모두 순회해.
각 화면마다 Impeccable 기준으로 UX/UI를 점검하고 문제를 Critical / Major / Minor로 정리해.
모바일 viewport도 함께 확인해.
```

---

## 3. Chrome DevTools MCP — 선택적 추가

GitHub: https://github.com/ChromeDevTools/chrome-devtools-mcp

다음까지 보고 싶을 때 추가한다.

- console error
- network request
- runtime 상태
- performance
- Chrome DevTools 기반 진단

기본 브라우저 UX 점검은 Playwright MCP가 더 편하고, 성능·런타임 원인 분석이 필요할 때 Chrome DevTools MCP를 추가하는 구성이 좋다.

---

## 4. UI UX Pro Max

GitHub: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

UI UX Pro Max는 점검 자동화보다 **디자인 지식베이스** 성격이 강하다.

- UI style
- color palette
- typography
- component/stack 가이드
- UX guideline

따라서 기존 화면의 결함을 찾아내는 1차 감사 도구보다는, 발견된 문제를 어떻게 개선할지 결정할 때 보조로 쓰는 편이 좋다.

추천 역할:

```text
Impeccable = 검사
Playwright MCP = 실제 브라우저 검증
UI UX Pro Max = 개선안 설계 참고
```

---

## 5. Taste / Design Taste

예:

- https://github.com/tyfarrago-hub/taste
- https://github.com/arez-xd/ux-ui-design-taste

Taste 계열은 hierarchy, spacing, typography, visual polish 등 **미감과 디자인 판단력**을 강화하는 데 좋다.

다만 자동화된 기술 감사보다는 "이 UI가 왜 촌스럽거나 AI스럽게 보이는가"를 다듬는 쪽에 더 가깝다.

---

## 추천 스택

### 최소 구성

```text
Claude Code
├─ Impeccable
└─ Playwright MCP
```

### 풀 구성

```text
Claude Code
├─ Impeccable          # UX/UI audit / critique / polish
├─ Playwright MCP      # 실제 브라우저 순회 및 사용자 플로우 검증
├─ Chrome DevTools MCP # 성능 / 콘솔 / 네트워크 진단
└─ UI UX Pro Max       # 개선안 및 디자인 지식
```

## 권장 자동 점검 흐름

```text
1. 앱 실행
2. Playwright로 주요 페이지와 사용자 플로우 탐색
3. desktop / tablet / mobile viewport 확인
4. Impeccable audit 수행
5. Impeccable critique 수행
6. console/network/runtime 문제 확인
7. Critical / Major / Minor로 이슈 분류
8. 수정 우선순위 제안
9. 수정 후 같은 플로우 재검증
```

## 최종 추천

현재 목적이 "웹 프로젝트 전반 UX/UI 점검"이라면 **Impeccable + Playwright MCP**부터 도입하는 것이 가장 효율적이다. 이후 성능 및 런타임 진단까지 필요하면 Chrome DevTools MCP를 추가한다.

## 관련 문서

- [Impeccable](skills/impeccable.md)
- [UI UX Pro Max](skills/ui-ux-pro-max.md)
- [Taste Skill](skills/taste-skill.md)
- [AI UI/UX 디자인 스킬 비교](design-skills-comparison.md)
