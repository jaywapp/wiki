# 하네스 구현 재개 설계

선행 설계는 [workspace-harness-design.md](workspace-harness-design.md)다. 본 문서는 구현 재개 시 결정과 분업 경계를 기록한다.

## 구현 순서

1. 기존 Orca/앱 기능 재사용 가능 범위를 코드·실행 환경으로 확인한다.
2. 원본 저장소를 확정하고 .NET 10 기반의 빌드 가능한 CLI/Core/Adapter/Test 구조를 준비한다. 설치된 SDK는 10.0.400이다.
3. wiki 한 프로젝트에서 읽기 전용 exec → needs_input → 명시적 UUID resume → completed를 검증한다. 최초 nonce를 재개 prompt에 재전달하지 않는다.
4. 코어의 업무/질문/시도/이벤트 계약과 상태 저장·단일 writer 규칙을 먼저 고정한다.
5. 실행 adapter/preflight와 질문·결과·루트 도구를 별도 파일/테스트로 병렬 구현한다.
6. 통합 CLI와 Terminal의 관리 상태 표시를 연결하고, 복구·중복·다중 프로젝트 검증을 수행한다.
7. 각 분업 결과를 검토·테스트한 후 승인된 원본 저장소에서 통합·병합한다.

## 실행 경계

- provider는 Codex로 고정한다. Claude 기능은 이번 구현에서 실행하지 않는다.
- 제품 웹 UI를 새로 만들지 않고 기존 Windows Terminal을 표시 계층으로 사용한다.
- 독립 수동 CLI와 관리 워커 상태를 구분하며 terminal keystroke injection을 통신 방식으로 사용하지 않는다.
- 실제 모델/effort, cwd, provider UUID와 결과 검증 근거를 기록한다. 알 수 없는 effective 값은 unknown으로 둔다.
- 네트워크나 호스트 권한 차단은 지정된 승인 절차로 처리하며 샌드박스를 우회하지 않는다.
