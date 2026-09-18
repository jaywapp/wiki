---
title: Google ARTEMIS
category: tools
tags: [ai, agent, android, mobile-automation, mcp, testing, claude-code, codex]
source: https://github.com/google/artemis
updated: 2026-09-18
---

# Google ARTEMIS

> 자연어 지시를 실제 Android 기기 조작·검증·로그 수집으로 연결하고, MCP를 통해 Claude Code·Codex 같은 코딩 에이전트에 모바일 테스트 능력을 붙이는 Android automation toolkit.

## 프로젝트 개요

ARTEMIS는 Android 기기/에뮬레이터를 AI가 사람처럼 조작하도록 만드는 오픈소스 자동화 프로젝트다. 자연어 테스트 시나리오를 받아 화면 상태를 관찰하고 UI 요소를 찾은 뒤 탭·입력·앱 실행 등을 수행하며 스크린샷·로그·실행 기록을 수집한다. 특히 MCP 서버를 제공해 Claude Code, Codex, Cursor, Windsurf, Antigravity 등이 실제 Android 기기를 tool처럼 사용할 수 있다.

조사 기준: 2026-09-18.

## 해결하려는 문제

기존 Appium/UIAutomator 계열은 selector와 테스트 절차를 사람이 명시적으로 작성·유지해야 한다. UI가 자주 바뀌거나 Compose/Flutter/Canvas처럼 접근성 트리가 불완전하면 유지비가 커진다. ARTEMIS는 자연어 E2E 테스트, hierarchy+OCR+vision 결합 탐색, 실제 화면 feedback 기반 closed-loop 실행, 코딩 에이전트의 구현→실기기 검증 루프, 장시간 실행의 context 압축을 목표로 한다.

## 핵심 기능

### Cross-App Android Automation
여러 앱을 오가는 workflow를 자연어로 수행한다.

### Multimodal Element Locating
가능하면 accessibility hierarchy의 element/index를 사용하고 부족하면 OCR·좌표·visual locating으로 fallback한다.

### MCP 통합
mcp_server를 통해 모바일 제어를 AI coding assistant에 노출한다. Claude Code용 testing mindset rules도 설치할 수 있다.

### Flash / Pro 실행 프로필
- Flash: graph orchestration 없는 빠른 reactive observe→think→act loop. 단순·결정적 작업용이며 공식 설명은 대략 3~5초/step이다.
- Pro: persistent plan, checkpoint, diagnostics, branching exploration이 필요한 작업용. 행동 전 현재 UI tree/pixel을 확인하는 검증 단계가 있다.

### Context Compression
오래된 screenshot을 visual summary로 치환하고 완료 step을 history chunk/era로 압축한다. 필요하면 search_history, replay_steps, video analyzer 등을 통해 과거 정보를 다시 조회한다.

### Web Console / CLI / SDK
Web Visual Test Console, MCP Server, CLI, Python SDK를 제공해 수동 탐색부터 CI 연동까지 지원한다.

## 아키텍처

    Claude Code / Codex / AI IDE
              |
             MCP
              v
       ARTEMIS MCP Server
       tools + testing rules
              |
              v
         ARTEMIS Runtime
       Flash / Pro execution
       history compression
       video / trace / logs
          /          \
         v            v
    UI hierarchy    Vision/OCR
          \          /
              v
          ADB / Device
              |
              v
      Android / Emulator

Repository 주요 영역은 artemis(core runtime), mcp_server(IDE integration), apps, packages(SDK/package), playground, config, scripts 등이다. Android에는 Accessibility Helper를 설치할 수 있으며 실패 시 UIAutomator2 fallback을 지원한다고 문서화되어 있다.

## 실행 흐름

    사용자 테스트 요구
      → Claude Code/Codex가 작업 생성
      → ARTEMIS MCP tool 호출
      → 현재 화면 관찰
      → UI hierarchy 우선 탐색
      → 필요 시 OCR/vision/coordinate fallback
      → 행동 실행
      → 화면 + Logcat + trace 재관찰
      → 성공 판단 / 다음 행동
      → history 압축 + 결과 반환

핵심은 테스트 script를 먼저 완전히 생성하는 방식보다 실제 화면 상태를 지속적으로 feedback 받아 다음 행동을 결정하는 closed-loop라는 점이다.

## Benchmark

README는 Google Research AndroidWorld의 100개 이상 multi-step task에서 99%+ completion rate를 주장한다. 프로젝트 자체가 제시한 수치이므로 도입 전에는 사용하는 model/device/app version/benchmark configuration을 고정한 독립 재현 테스트가 필요하다.

## 장점

- AI Coding Agent의 검증 루프를 코드 수정→APK Build→설치→앱 실행→UI 조작→Screenshot/Logcat 확인→재수정까지 확장할 수 있다.
- 정적 selector만 사용하지 않아 UI 변경이 잦은 개발 단계와 exploratory testing에 유리하다.
- MCP 기반이라 기존 Claude Code/Codex harness에 결합하기 쉽다.
- screenshot/action history를 raw context에 계속 넣지 않고 summary/chunk로 압축하는 구조는 장시간 agent harness의 context engineering 참고 사례다.

## 단점 및 한계

- 현재 Android 중심이며 iOS는 roadmap이다.
- AI-in-the-loop 때문에 deterministic UI automation보다 latency와 inference 비용이 크다.
- visual fallback은 비결정적일 수 있어 strict CI gate에는 기존 selector 기반 test 병행이 필요하다.
- ADB, accessibility, screenshot, log 접근을 AI agent에 주므로 Enterprise에서는 전용 device, tool allowlist, credential 및 데이터 전송 정책이 필요하다.
- 2026-09-11 공개 issue에는 MCP 입력의 package_name/URL 등이 ADB shell command로 이어질 때 shell injection 가능성이 있다는 보고가 있으며 수정 PR이 제안됐다. 사용하는 revision에서 해결 여부를 확인해야 한다.
- Minitap/mobile-use 코드 attribution 누락 주장이 issue에서 제기됐고 이후 README에는 Minitap 개발 코드 포함 attribution이 추가됐다. Enterprise 도입 시 provenance/license 검토가 필요하다.

## Windows / Enterprise 적용성

Windows용 start.bat가 제공된다. 회사 환경에서는 Developer PC의 Claude Code/Codex → ARTEMIS MCP → 전용 Android Test Device 구성이 적절하다. CI에서는 APK build worker와 ARTEMIS SDK/CLI, emulator/device farm 조합을 고려할 수 있다.

검증 항목: 사내 proxy, model API endpoint, USB/ADB 정책, Accessibility Helper 허용 여부, screenshot/log 외부 전송 범위, 테스트 credential 처리, MCP tool 권한.

## 활용 사례

- Claude Code 기반 Android 개발 harness의 구현 후 acceptance test
- Jira/issue 재현 절차를 실행하는 Bug Reproduction Agent
- 신규 기능 exploratory testing
- PR별 APK 설치 후 자연어 smoke test
- Appium/UIAutomator failure를 분석하는 AI fallback tester

## 기존 도구와 비교

| 구분 | ARTEMIS | Appium / UIAutomator |
|---|---|---|
| 테스트 정의 | 자연어 중심 | 코드/selector 중심 |
| 실행 | AI closed-loop | deterministic script |
| UI 변경 대응 | hierarchy + vision fallback | selector 유지보수 |
| 속도 | 상대적으로 느림 | 빠름 |
| 결정성 | 낮음 | 높음 |
| 탐색 테스트 | 강점 | 별도 logic 필요 |
| 대규모 regression | 비용/속도 검토 | 강점 |
| Coding Agent 연결 | MCP 핵심 기능 | 별도 integration |

완전한 대체보다는 deterministic regression + agentic exploratory/diagnostic layer 조합이 현실적이다.

## AI Harness 관점의 인사이트

### Dynamic-First, Fallback
ARTEMIS의 Structured UI → OCR → Vision/Coordinate 순서는 코드 harness에서 Symbol/Index/.cv → Targeted Source Read → Broad Semantic Exploration 구조로 대응시킬 수 있다.

### History Compression + Recall
모든 과거 정보를 현재 context에 유지하지 않고 summary/chunk로 virtualize한 뒤 필요할 때 recall한다. code virtualization/context 절감 구조와 직접 연결되는 패턴이다.

### Fast / Deep Model Routing
단순 deterministic task는 Flash, 계획·diagnostics·branching이 필요한 task는 Pro로 보내는 구조는 coding harness의 cheap/deep execution tier 설계에 참고할 만하다.

## 활용 아이디어

### 바로 적용 가능
Claude Code/Codex Android MCP 테스트, APK smoke test, bug reproduction, screenshot+Logcat 수집.

### PoC 가치 있음
PR acceptance test, 구현→빌드→설치→UI 검증→수정 self-verification loop, 기존 UI test failure 자동 원인 분석.

### 아이디어 참고
Flash/Pro routing, history compression, structured-first→expensive-fallback 전략을 일반 coding harness/context virtualization에 적용.

### 현재는 도입 가치 낮음
수천 건 deterministic regression 전체 대체, strict latency test, iOS 중심 프로젝트.

## 결론

ARTEMIS는 Android 매크로보다 AI coding agent에게 실제 모바일 환경을 관찰·조작하는 실행/검증 capability를 제공하는 도구로 보는 것이 적절하다. Claude Code/Codex가 코드만 작성하고 끝나지 않고 실제 앱을 빌드·설치·조작·검증하는 closed-loop harness를 만들 때 특히 가치가 있다.

다만 latency/cost, 비결정성, ADB/accessibility 권한, 공개 보안 이슈와 provenance 논란은 Enterprise 도입 전에 확인해야 한다. 기존 deterministic UI automation을 대체하기보다 Agentic Mobile Testing / Exploratory Testing / Self-Verification Layer로 결합하는 PoC 가치가 높다.

## 참고 자료

- https://github.com/google/artemis
- https://github.com/google/artemis/blob/main/README.md
- https://github.com/google/artemis/blob/main/mcp_server/README.md
- https://github.com/google/artemis/blob/main/mcp_server/rules.md
- https://github.com/google/artemis/issues/40
- https://github.com/google/artemis/issues/55
