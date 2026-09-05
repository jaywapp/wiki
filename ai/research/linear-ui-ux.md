---
title: Linear UI/UX
category: research
tags:
  - ui
  - ux
  - linear
  - product-design
  - ax
source: https://linear.app/now/behind-the-latest-design-refresh
updated: 2026-09-06
---

# Linear UI/UX

> Linear의 UI/UX 핵심은 단순한 미니멀리즘이 아니라, **정보 밀도는 유지하면서 작업 대상만 시각적으로 전면에 두고, 키보드·마우스·Command Menu를 동일한 작업 모델 위에 겹쳐 놓는 것**이다.

## 조사 범위

- Linear 공식 2024 UI redesign 글
- 2026 UI refresh 및 디자인 회고
- 공식 Docs의 issue selection, board/list, display options, favorites, issue creation
- contextual menu와 command menu 설계
- 2025~2026 모바일 navigation 변화

## 프로젝트 개요

Linear는 issue tracker에서 출발했지만 현재는 issue, project, initiative, document, review, agent workflow까지 포괄하는 product development system으로 확장되고 있다. 이 때문에 UI는 기능을 계속 추가하면서도 복잡도가 화면에 그대로 노출되지 않도록 만드는 방향으로 반복적으로 재설계됐다.

2024년 redesign은 sidebar, tabs, headers, panels의 visual noise를 줄이고 hierarchy와 density를 개선하는 데 초점을 두었다. 2026년 refresh에서는 한 단계 더 나아가 projects, issues, reviews, documents 사이의 header/navigation/view controls를 일관되게 만들고 sidebar를 더 어둡게 처리해 main content가 전면에 오도록 했다.

## 해결하려는 문제

Linear가 반복해서 다루는 문제는 기능 부족이 아니라 **기능 증가에 따른 인터페이스 엔트로피**다.

- 기능별로 action 위치가 달라지면 사용자가 매 화면을 다시 학습해야 한다.
- sidebar와 chrome이 지나치게 강조되면 실제 작업 내용과 시각적 attention을 경쟁한다.
- 많은 metadata를 단순히 숨기면 전문 도구가 요구하는 정보 밀도가 손실된다.
- keyboard-only UX만 강조하면 신규 사용자와 mouse user의 discoverability가 떨어진다.
- 기능을 계속 추가하면 예외 UI와 일회성 component가 늘어 design debt가 커진다.

따라서 Linear는 '기능을 줄여 단순하게 보이기'보다 **공통 구조를 만들고 secondary UI를 후퇴시켜 복잡도를 관리**한다.

## 핵심 UI/UX 원칙

### 1. Attention hierarchy

2026 refresh에서 가장 명시적인 원칙은 'earned하지 않은 attention을 차지하지 않는다'는 것이다. navigation sidebar 같은 orientation UI는 존재하지만 main workspace보다 낮은 contrast를 사용한다.

```text
[Navigation / orientation]  -> 낮은 시각적 강조
[Current context / header]  -> 위치와 상태 파악
[Primary workspace]         -> 가장 높은 attention
[Contextual actions]        -> 필요할 때만 등장
```

이는 단순 dark theme 스타일이 아니라 화면에서 무엇이 사용자의 attention을 가져갈 자격이 있는지 결정하는 hierarchy 정책이다.

### 2. High density, low noise

Linear는 enterprise/productivity UI에서 흔한 '큰 카드 + 넓은 padding' 방식과 반대 방향이다. 많은 issue와 metadata를 한 화면에서 볼 수 있도록 density를 유지하되 border, chrome, 반복 label, 과도한 contrast를 줄인다.

핵심은 **low density가 아니라 low visual noise**다.

### 3. Predictable chrome

2026 refresh에서는 projects, issues, reviews, documents의 header/navigation/view controls를 통일했다. 사용자는 콘텐츠 종류가 바뀌어도 '현재 위치', 'view 변경', 'page action'을 같은 영역에서 찾을 수 있다.

새 화면을 추가할 때 독자적인 toolbar를 만드는 것보다 공통 application shell에 맞추는 방식이다.

### 4. Keyboard-first, mouse-complete

Linear는 keyboard shortcut을 power-user accelerator로 적극 활용한다.

- `C`: issue 생성
- `Cmd/Ctrl + K`: command menu
- `J/K` 또는 방향키: issue 이동
- `X`: 선택
- `Cmd/Ctrl + B`: board/list 전환
- `Shift + V`: display options

하지만 keyboard shortcut만 제공하지 않는다. 같은 action을 contextual/right-click menu와 visible control에서도 제공한다. Context menu에는 shortcut도 표시되어 mouse 사용자가 자연스럽게 shortcut을 학습할 수 있다.

즉 interaction model은 대략 다음과 같다.

```text
                  +-> Keyboard shortcut
User intent ------+-> Command menu
                  +-> Context menu
                  +-> Visible control
                         |
                         v
                  Same domain action
```

### 5. Command Menu as universal escape hatch

`Cmd/Ctrl + K` Command Menu는 단순 검색창이 아니라 현재 context에 따라 관련 action을 우선하는 command surface다. 기능이 많아져도 모든 action을 toolbar에 노출할 필요가 없어진다.

이 구조는 AI/Agent 제품에도 특히 유용하다. 화면에는 핵심 action만 남기고 저빈도 action, agent command, navigation을 command palette에 수용할 수 있다.

### 6. Progressive disclosure

모든 metadata/action을 항상 보여주지 않는다.

- hover 시 selection checkbox
- right-click 시 contextual actions
- display options 안에 grouping/order/layout 설정
- sidebar personalization/favorites
- issue 상세의 property 영역

사용 빈도와 context에 따라 정보가 단계적으로 나타난다.

### 7. Personalization without structural fragmentation

sidebar는 reorder/hide가 가능하고 Favorites로 issue, project, view, document 등을 개인 shortcut으로 만들 수 있다. 하지만 application의 기본 navigation grammar 자체는 유지된다.

개인화가 product structure를 깨뜨리지 않는 것이 중요하다.

### 8. Multiple views, same data model

Issue는 list와 board로 전환할 수 있고 grouping/order/filter/display property를 변경할 수 있다. view를 별도 기능으로 만드는 것이 아니라 동일한 domain data에 대한 projection으로 취급한다.

이 패턴은 dashboard나 agent task viewer에서 특히 재사용 가치가 높다.

## 구조 및 아키텍처 관점

Linear UI를 구현 관점에서 추상화하면 다음과 같이 볼 수 있다.

```text
┌──────────────── Application Shell ────────────────┐
│ Sidebar / Tabs / Location                         │
├───────────────────────────────────────────────────┤
│ Context Header       | View Controls | Actions    │
├───────────────────────────────────────────────────┤
│                                                   │
│ Domain View                                        │
│  List / Board / Detail / Document / Agent Session │
│                                                   │
├───────────────────────────────────────────────────┤
│ Contextual UI: menu / popover / command palette   │
└───────────────────────────────────────────────────┘
             │
             v
       Domain actions
             │
     ┌───────┼────────┐
 keyboard  mouse   command menu
```

중요한 점은 shortcut, context menu, command menu가 별도 기능을 구현하는 것이 아니라 동일 domain action을 호출하는 구조가 적합하다는 것이다. 그래야 interaction surface가 늘어도 동작이 서로 달라지는 것을 방지할 수 있다.

## 2024 → 2026 변화에서 보이는 설계 철학

### 2024 redesign

- sidebar/tabs/header/panel 정리
- visual alignment 개선
- navigation density 개선
- light/dark theme contrast 조정
- 주요 view stress test
- component behavior 정의
- feature flag → private beta → gradual rollout → GA

### 2026 refresh

- 서로 다른 workflow의 chrome 일관성 강화
- icon redraw/resize
- sidebar attention 감소
- content area 강조
- agent workflow 증가를 고려한 UI 기반 정리

두 번의 변화에서 중요한 점은 Linear가 redesign을 '브랜드 스킨 변경'으로 보지 않는다는 것이다. 제품 기능이 증가하면서 생긴 structural inconsistency를 정리하는 engineering/product 작업에 가깝다.

## 장점

### 빠른 조작

반복 업무를 shortcut과 command menu로 처리할 수 있어 숙련 사용자의 pointer 이동 비용이 낮다.

### 높은 정보 밀도

Issue tracker, developer tool, monitoring dashboard처럼 많은 정보를 동시에 확인해야 하는 도구에 적합하다.

### 낮은 시각적 피로

navigation과 secondary chrome을 낮은 contrast로 처리하고 현재 작업을 강조한다.

### 확장성

새 기능을 추가할 때 toolbar button을 계속 추가하는 대신 command/context/display-option 계층에 배치할 수 있다.

### 학습 가능한 power UX

Mouse UI에 shortcut hint가 노출되어 novice → power user 전환 경로가 존재한다.

## 단점 및 한계

### 신규 사용자에게는 기능이 숨겨져 보일 수 있음

Progressive disclosure와 shortcut 중심 설계는 discoverability를 떨어뜨릴 수 있다. Command Menu의 존재를 모르면 기능을 찾기 어려울 수 있다.

### 지나친 모방 위험

Linear의 dark theme, 작은 font, 얇은 border만 복제하면 Linear UX가 되지 않는다. 핵심은 action model, hierarchy, density, navigation consistency다.

### 접근성 검증 필요

낮은 contrast를 시각적 hierarchy 용도로 과도하게 사용하면 사용자에 따라 가독성이 악화될 수 있다. 실제 구현에서는 WCAG contrast, focus state, keyboard navigation을 별도로 검증해야 한다.

### 일반 소비자 서비스에는 과도할 수 있음

Shortcut과 dense table/list interaction은 장시간 사용하는 professional tool에 특히 적합하다. 간헐적으로 사용하는 consumer UI라면 더 명시적인 navigation이 나을 수 있다.

### 디자인 시스템 유지 비용

공통 chrome과 action grammar를 유지하려면 새 feature를 만들 때도 component/interaction consistency 검토가 필요하다. 초기 개발 속도만 보면 자유로운 화면별 구현보다 제약이 크다.

## 기존 방식과 비교

| 항목 | 전통적 Enterprise UI | 단순 Minimal UI | Linear식 UI |
|---|---|---|---|
| 정보 밀도 | 높음 | 낮음 | 높음 |
| Visual noise | 높기 쉬움 | 낮음 | 낮음 |
| 기능 노출 | 대부분 visible | 기능 자체가 적음 | context에 따라 노출 |
| Power user | 메뉴 탐색 중심 | 제한적 | shortcut/command 중심 |
| Mouse UX | 강함 | 강함 | 강함 |
| Keyboard UX | 제한적 | 제한적 | 핵심 UX |
| 확장 방식 | toolbar/menu 증가 | 기능 제한 | command/context 계층 |

## AI/AX 제품에 적용할 포인트

### 바로 적용 가능

1. **App Shell 표준화**  
   Sidebar → Context Header → Main Workspace 구조를 모든 화면에 동일하게 적용한다.

2. **Main content와 navigation의 contrast 분리**  
   sidebar를 강조하지 말고 현재 task/agent/session 영역이 가장 강한 visual weight를 갖게 한다.

3. **Command Palette 도입**  
   `Ctrl+K`에서 task 생성, agent 실행, project 이동, filter, session navigation 등 대부분의 명령을 검색·실행한다.

4. **Context menu + shortcut hint**  
   마우스 사용자가 shortcut을 자연스럽게 학습하게 한다.

5. **List/Board는 동일 데이터의 view로 구현**  
   task 상태를 list, kanban, agent runtime view로 projection하되 domain model은 공유한다.

### PoC 가치 있음

#### Agent Team Runtime Dashboard

현재 실행 중인 Orchestrator/Analysis/Work/Review agent를 Linear식 UI로 표현할 수 있다.

```text
┌ Agents ─────────────────────────────────────────┐
│ Inbox                                           │
│ My tasks                                        │
│                                                 │
│ Workspace                                       │
│  Project 1                                      │
│  Project 2                                      │
│  Release                                        │
├─────────────────────────────────────────────────┤
│ Project 1 / Runtime        Filter  View  ...    │
├─────────────────────────────────────────────────┤
│ Running                                         │
│ ● Work Agent       Implement Sitemap     02:31  │
│ ● Review Agent     Waiting for diff      00:48  │
│                                                 │
│ Queued                                          │
│ ○ Analysis Agent   Review requirement           │
└─────────────────────────────────────────────────┘
```

Agent detail을 열면 오른쪽 panel 또는 detail view에 다음을 배치한다.

- 현재 goal
- 상태
- elapsed time
- model
- token/cost
- latest action
- tool calls
- child agent
- artifact/diff
- stop/retry/reassign

여기서 평소에는 핵심 상태만 노출하고 token/tool-call/log 같은 상세 정보는 progressive disclosure로 제공하는 것이 Linear 철학과 잘 맞는다.

### 아이디어 참고

- Favorites → 자주 보는 project/agent/session pin
- My Issues → My Agent Tasks
- Triage → 사용자 요청/agent 생성 작업의 intake queue
- Issue relations → task dependency / blocked-by
- Cycle → sprint 또는 execution batch
- Project update → agent가 자동 생성하는 작업 진행 summary

### 현재는 피해야 할 것

- Linear의 색상/gradient/dark theme를 그대로 복제
- 모든 action에 keyboard shortcut부터 부여
- 지나치게 작은 typography
- 상태 정보를 무조건 icon으로만 표현
- command menu를 domain action과 별도로 구현

## 구현 체크리스트

Linear 스타일의 UX를 실제 제품에 적용한다면 시각 디자인보다 다음 순서가 적절하다.

1. Domain action 정의
2. Application shell 정의
3. Navigation grammar 통일
4. Information hierarchy 정의
5. Main/secondary/tertiary visual weight 결정
6. Visible action 최소화
7. Context menu 연결
8. Command palette 연결
9. Keyboard shortcut 연결
10. List/Board/Detail projection 구현
11. Focus/hover/selected/disabled/loading state 검증
12. Keyboard-only 및 accessibility 검증

## 결론

Linear UI의 가장 중요한 특징은 '예쁘고 미니멀한 dark UI'가 아니다.

**전문 사용자가 요구하는 높은 정보 밀도를 유지하면서도, 현재 작업과 관계없는 UI는 attention 경쟁에서 물러나게 만드는 것**이 핵심이다. 여기에 동일 action을 visible UI, context menu, command palette, keyboard shortcut으로 연결하면서 novice와 power user를 동시에 지원한다.

AI Agent dashboard나 개발 생산성 도구를 설계할 때 Linear에서 가장 먼저 가져와야 할 것은 색상이나 component 모양이 아니라 다음 네 가지다.

- Attention hierarchy
- Predictable application shell
- Shared domain action model
- Progressive disclosure + keyboard acceleration

특히 여러 Agent의 진행 상황을 실시간으로 보여주는 Runtime Dashboard에는 Linear의 dense list, contextual action, command palette, muted navigation 패턴이 높은 재사용 가치를 가진다.

## 참고 자료

- https://linear.app/now/a-design-reset
- https://linear.app/now/how-we-redesigned-the-linear-ui
- https://linear.app/now/behind-the-latest-design-refresh
- https://linear.app/changelog/2026-03-12-ui-refresh
- https://linear.app/docs/select-issues
- https://linear.app/docs/display-options
- https://linear.app/docs/board-layout
- https://linear.app/docs/favorites
- https://linear.app/docs/creating-issues
- https://linear.app/now/invisible-details
- https://linear.app/changelog/2019-12-18-new-command-menu
- https://linear.app/changelog/2025-10-16-mobile-app-redesign
