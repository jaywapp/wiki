---
title: Windows AI PC Caretaker GitHub 조사
category: research
tags:
  - ai
  - claude-code
  - codex
  - agent-skill
  - windows
  - pc-cleanup
source: GitHub repositories
updated: 2026-09-12
---

# Windows AI PC Caretaker GitHub 조사

> Claude Code와 Codex를 이용한 Windows PC 정리 Skill은 이미 여러 구현이 존재하지만, 개발 PC 전체를 안전하게 관리하는 사실상의 표준은 아직 없으며 기존 프로젝트의 장점을 조합한 Caretaker 구조가 유망하다.

## 프로젝트 개요

GitHub에서 Claude Code / Codex 기반 Windows 디스크 정리, 개발 캐시 정리, Docker/WSL 정리, 대용량 파일 분석 프로젝트를 조사했다. 직접적인 AI 통합 후보 6개를 확인했으며 대부분 2026년에 등장한 초기 프로젝트다.

## 주요 후보

| 프로젝트 | 형태 | 강점 |
|---|---|---|
| hqc135/codex-windows-disk-auditor | Codex Skill | manifest, exact-ID 승인, dry-run, 재검증, 실행 후 verify 등 안전 구조 |
| az9713/claude-skill-disk-cleanup | Claude Code Skill | 실제 Windows 개발 PC 정리 PowerShell 레시피 |
| xiaofenggan01/disk-cleaner-skills | Claude Code Skill | AI 분류, HTML UI, npm/pnpm/pip/NuGet 등 개발 캐시 지식 |
| crrristang726/windows-c-drive-cleanup-skill | Codex Skill | C: 및 Windows Installer 보수적 관리, quarantine/hash |
| Konilo/claude-skill-docker-wsl-cleanup | Claude Code Skill | Docker Desktop/WSL2/VHDX 정리 전문 절차 |
| YANZHANLIN/disk-cleanup-skill | Claude Code Skill | 대용량 파일 read-only 분석과 위험도 기반 시각화 |

## 핵심 평가

가장 좋은 단일 기반은 `hqc135/codex-windows-disk-auditor`다. cleanup recipe 자체보다 `scan → candidate → exact ID approval → manifest → dry-run → target revalidation → execute → verify`라는 실행 계약이 잘 설계되어 있다. AI가 임의의 삭제 명령을 생성하지 않고 deterministic PowerShell executor가 승인된 정확한 대상만 처리하게 하는 방식이 핵심이다.

Claude에서 즉시 참고하기 좋은 구현은 `az9713/claude-skill-disk-cleanup`이다. Temp, Docker, npm/uv, Chrome, Windows Update, Python venv, Android SDK, Downloads 분석 등 개발자 PC에서 실제로 발생하는 공간 문제를 PowerShell 레시피로 다룬다.

`xiaofenggan01/disk-cleaner-skills`는 npm/pnpm/pip/NuGet/Docker 등의 개발 캐시 지식과 AI semantic classification, HTML 보고서가 강점이다. 다만 조사 시점의 프로젝트 문서상 Windows 코드는 작성되었으나 실제 Windows 검증이 충분하지 않다고 명시되어 있어 executor보다는 분류/recipe 참고용이 적합하다.

`Konilo/claude-skill-docker-wsl-cleanup`은 Docker/WSL2 전용 서브스킬로 가치가 높다. Docker prune 이후에도 WSL2 sparse VHDX가 host 공간을 반환하지 않는 문제를 다루며 Docker graceful stop → WSL shutdown → VHDX compact → 재시작 → 공간 검증 흐름을 갖는다.

## 해결되지 않은 영역

조사한 상위 후보에서는 Visual Studio/.NET의 `bin`, `obj`, `.vs`, `TestResults` 및 Unreal Engine의 `Intermediate`, `Saved`, `DerivedDataCache`를 개발 프로젝트 문맥과 함께 안전하게 정리하는 전용 규칙이 상대적으로 부족했다. 특히 폴더 이름만 보고 삭제하지 않고 `.sln`, `.csproj`, UE 프로젝트 증거와 Git/Perforce 상태, 실행 중 빌드 프로세스를 확인하는 기능은 차별화 가치가 높다.

## 권장 아키텍처

```text
User
  ↓
Claude Code / Codex
  ↓
Read-only Scanner
  ↓
inventory.json
  ↓
AI Classifier + Recipe Library
  ↓
cleanup-plan.json
  ↓
Exact ID User Approval
  ↓
Deterministic Safe Executor
  ↓
Re-scan / Verify
  ↓
cleanup-result.json
```

AI는 판단과 설명을 담당하고 실제 삭제 가능 여부는 deterministic executor가 결정한다. protected path, wildcard, reparse point, 활성 프로세스, 승인 후 변경된 target 등을 executor 단계에서 다시 검사해야 한다.

## PC-Caretaker 활용 아이디어

### 바로 적용 가능

- `hqc135/codex-windows-disk-auditor`의 approval/manifest/verify 모델 참고
- `az9713/claude-skill-disk-cleanup`의 Windows 개발 캐시 레시피 참고
- `Konilo/claude-skill-docker-wsl-cleanup`을 Docker/WSL recipe로 활용

### PoC 가치 있음

공용 PowerShell core와 Claude/Codex용 얇은 Skill wrapper를 분리한다.

```text
pc-caretaker/
├─ references/
├─ scripts/
│  ├─ Scan-PC.ps1
│  ├─ New-CleanupPlan.ps1
│  ├─ Invoke-SafeCleanup.ps1
│  └─ Verify-Cleanup.ps1
└─ recipes/
   ├─ windows-temp.ps1
   ├─ dotnet.ps1
   ├─ visual-studio.ps1
   ├─ node.ps1
   ├─ python.ps1
   ├─ docker-wsl.ps1
   └─ unreal.ps1
```

Claude Code는 Skill/Plugin/hooks를 통해 destructive command를 통제하고, Codex는 Skill과 sandbox/approval 정책을 활용한다. 두 에이전트가 scanner/executor를 공유하도록 하면 중복 구현을 줄일 수 있다.

## 장점

- LLM의 파일 삭제 판단 오류와 실제 삭제 권한을 분리할 수 있다.
- 개발 캐시처럼 재생성 가능한 데이터를 프로젝트 문맥으로 판단할 수 있다.
- 월별 snapshot을 남기면 단순 cleaner가 아니라 PC growth/health caretaker로 발전할 수 있다.
- Claude와 Codex가 동일한 core를 공유할 수 있다.

## 단점 및 한계

- 발견된 프로젝트 대부분이 초기 단계이며 장기간 유지보수와 대규모 사용자 검증이 부족하다.
- 관리자 권한이 필요한 Windows 영역은 자동화 위험이 크다.
- 회사 PC에서는 파일명/경로 정보 자체가 모델 컨텍스트로 전달되는 정책을 검토해야 한다.
- Git/Perforce workspace와 build artifact를 구분하려면 일반 디스크 cleaner보다 훨씬 많은 환경 문맥이 필요하다.
- 자동 정기 삭제보다 정기 scan/report + 사용자 승인 실행이 안전하다.

## 결론

새로운 PC 정리 Skill을 처음부터 전부 구현할 필요는 없다. `hqc`의 안전 executor 구조를 중심으로 `az9713`의 개발 PC recipe, `xiaofeng`의 개발 캐시 지식, `Konilo`의 Docker/WSL 절차를 결합하는 방식이 가장 합리적이다.

차별화 포인트는 **Windows Developer PC + Visual Studio/.NET + Unreal + Git/Perforce를 이해하는 PC-Caretaker**다. 특히 회사 환경까지 고려한다면 Perforce opened 상태와 workspace 보호를 cleanup gate에 포함하는 것이 기존 공개 프로젝트와 구분되는 핵심 기능이 될 수 있다.

## 참고 자료

- https://github.com/hqc135/codex-windows-disk-auditor
- https://github.com/az9713/claude-skill-disk-cleanup
- https://github.com/xiaofenggan01/disk-cleaner-skills
- https://github.com/crrristang726/windows-c-drive-cleanup-skill
- https://github.com/Konilo/claude-skill-docker-wsl-cleanup
- https://github.com/YANZHANLIN/disk-cleanup-skill
- Claude Code Skills / Plugins 공식 문서
- OpenAI Codex Skills / approvals / hooks 공식 문서
