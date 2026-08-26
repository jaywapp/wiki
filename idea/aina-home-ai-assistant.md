- Status: Idea
- Version: 0.1
- Created: 2026-08-26
- Updated: 2026-08-26
- Tags: Aina, AI비서, Claude, Codex, Discord, Voice, Realtime, Agent4Discord, HomeAssistant, 음성인터페이스

# 아이나(Aina) 홈 AI 비서 확장

## 1. 한 줄 요약

현재 Discord에서 Claude 기반으로 운영 중인 `Aina`를 특정 AI나 채널에 종속된 봇이 아니라, **여러 Agent와 여러 입출력 인터페이스를 연결하는 가정용 AI 비서**로 확장한다.

1차 확장 목표는 기존 Claude/Discord 기능을 유지하면서 **Codex 세션을 Agent로 추가**하고, 주방에서 “아이나”라고 불러 자연스럽게 대화할 수 있는 **음성 인터페이스**를 연결하는 것이다.

## 2. 배경 및 문제

Aina는 현재 `Agent4Discord`를 개편한 프로젝트를 기반으로 운영 중이며, Discord 채널에서 Claude와 대화하고 작업을 수행하는 형태다.

현재 방식은 PC나 모바일에서 Discord에 접근해야 하기 때문에, 주방처럼 손을 사용하기 어렵거나 즉시 질문하고 싶은 공간에서는 접근성이 떨어진다. 가정용 비서로 확장하려면 스마트 스피커처럼 이름을 부르고 바로 대화할 수 있는 음성 인터페이스가 필요하다.

동시에 기존 Claude 중심 구조에 Codex 세션을 추가하여, Aina가 필요에 따라 서로 다른 Agent를 사용할 수 있도록 확장하고자 한다.

따라서 해결해야 할 문제는 크게 두 가지다.

- Aina가 Claude에만 종속되지 않고 Codex 세션도 지속적으로 생성·재개·사용할 수 있어야 한다.
- Discord 외에 주방용 음성 단말을 추가해 손을 쓰지 않고 Aina와 대화할 수 있어야 한다.

추가로 Discord와 음성 인터페이스의 대화 화면을 완전히 동기화하는 것 자체는 핵심 요구가 아니다. 사용자가 중요하게 보는 것은 **어느 인터페이스에서 대화했든 Aina가 필요한 내용을 기억하고 이어서 대화할 수 있는 것**이다.

## 3. 목표

### 제품 목표

- 기존 Aina의 Claude + Discord 사용 경험을 유지한다.
- Codex를 Aina의 추가 Agent로 연결하고 Codex 세션을 지속적으로 사용할 수 있게 한다.
- 주방에 상시 설치 가능한 음성 단말을 통해 Wake Word로 Aina를 호출한다.
- ChatGPT Voice와 유사하게 자연스러운 실시간 음성 대화를 지향한다.
- 일상 대화와 실제 작업 수행을 분리하여, 음성 대화는 빠르게 응답하고 필요한 경우 Codex 등의 Agent에 작업을 위임한다.
- Discord와 Voice가 동일한 대화 UI를 공유하지 않더라도 Aina 차원에서 필요한 기억과 컨텍스트를 공유한다.
- 향후 모바일 앱, 웹 UI, 추가 방의 음성 단말 등이 생겨도 Agent와 Client가 독립적으로 확장될 수 있는 구조를 만든다.

### MVP 성공 판단 기준

구체적인 수치 기준은 Prototype 측정 후 확정한다. 초기에는 다음을 검증한다.

- 주방에서 “아이나” 호출 후 별도 조작 없이 음성 대화를 시작할 수 있는가.
- 일반적인 질문이 체감상 불편하지 않은 지연시간으로 응답되는가.
- Aina가 말하는 중 사용자가 끼어드는 상황을 자연스럽게 처리할 수 있는가.
- Voice에서 시작한 대화의 중요 정보가 이후 Discord에서도 활용되는가.
- Discord 또는 Voice에서 Codex 작업을 요청하고 기존 Codex 세션을 이어갈 수 있는가.
- 기존 Claude/Discord 기능이 신규 구조 때문에 불안정해지지 않는가.

## 4. 대상 사용자

### 1차 사용자

현재 Aina를 사용하는 가정 내 사용자.

### 핵심 사용 상황

- 주방에서 요리·설거지 등으로 손을 사용하기 어려운 상태에서 질문 또는 요청
- 간단한 일정·정보·기억 확인
- 이전에 다른 인터페이스에서 이야기한 내용의 연속 대화
- Codex에 이미 진행 중인 작업을 이어서 수행하도록 요청
- 장기적으로 집안의 여러 작업과 서비스를 Aina를 통해 호출

## 5. 핵심 아이디어

Aina를 `Discord Claude Bot`이 아니라 **Aina Core를 중심으로 Client와 Agent를 연결하는 구조**로 정의한다.

개념 구조는 다음과 같다.

```text
                      Aina Core
                         │
          ┌──────────────┴──────────────┐
          │                             │
       Clients                        Agents
          │                             │
   ┌──────┴──────┐              ┌──────┴──────┐
 Discord       Voice          Claude         Codex
                                 │              │
                          Claude Session   Codex Thread
```

Client는 사용자가 Aina와 접촉하는 방법이고, Agent는 Aina가 대화 또는 작업을 처리하기 위해 사용하는 실행 주체다.

이렇게 분리하면 Discord와 Voice가 서로 직접 연결될 필요가 없고, Claude와 Codex도 각 Client 구현에 종속되지 않는다.

### Voice의 역할 분리

음성 인터페이스에서는 다음 역할 분리를 우선 검토한다.

```text
주방 Voice Device
    │
    ├─ Wake Word
    ├─ Microphone / Audio Capture
    ├─ Speaker
    └─ Network Client
          │
          ▼
     Aina Server
          │
     Realtime Voice
          │
     Aina Core / Tools
          │
     ┌────┴────┐
  Memory     Codex
```

음성 단말 자체는 가능한 한 가볍게 유지하고, AI 모델·API Key·Memory·Codex 세션 관리는 Aina Server에 둔다.

## 6. 주요 사용 흐름

### 6.1 일반 음성 대화

1. Voice Device가 로컬에서 Wake Word를 대기한다.
2. 사용자가 “아이나”라고 부른다.
3. 장치가 호출을 감지하고 듣기 상태를 사용자에게 알린다.
4. 이후 음성을 Aina Server로 스트리밍한다.
5. Aina의 Realtime Voice 계층이 사용자와 실시간으로 대화한다.
6. 별도 작업이 필요하지 않은 질문은 Voice 계층에서 빠르게 응답한다.
7. 응답 음성이 Voice Device의 스피커에서 재생된다.
8. 대화 중 생성된 중요 컨텍스트는 필요에 따라 Aina Memory에 반영한다.

### 6.2 Codex 작업 요청

1. 사용자가 Discord 또는 Voice에서 Codex가 필요한 작업을 요청한다.
2. Aina가 요청을 Codex Agent로 위임해야 하는지 판단한다.
3. Aina가 신규 Codex Thread를 만들거나 기존 Thread를 resume한다.
4. 요청을 해당 Codex Thread의 Turn으로 전달한다.
5. Codex의 진행 상태와 결과를 Aina가 받는다.
6. Discord에서는 적절한 텍스트/상태 UI로 보여주고, Voice에서는 핵심 상태와 결과를 음성으로 전달한다.
7. 긴 작업 결과 전체를 음성으로 읽기보다 필요한 요약만 말하고, 상세 산출물은 적합한 Client에서 확인할 수 있게 한다.

### 6.3 인터페이스를 넘나드는 기억

예시:

1. 주방에서 “토요일에 부모님 집 가는 거 기억해줘”라고 말한다.
2. Aina가 해당 정보를 Memory에 저장한다.
3. 이후 Discord에서 “토요일에 뭐 하기로 했지?”라고 묻는다.
4. Discord 메시지 자체가 Voice 대화와 동기화되어 있지 않아도 Aina가 저장된 정보를 이용해 답한다.

화면상의 전체 대화 로그 동기화보다 **Aina Core의 기억 공유**를 우선한다.

## 7. 핵심 기능

### 7.1 Agent Provider 확장

**설명**  
현재 Claude 연동과 Codex 연동을 각각 Agent Provider로 분리할 수 있는 구조를 만든다.

예시 개념:

```text
AgentProvider
├─ ClaudeProvider
└─ CodexProvider
```

**필요한 이유**  
향후 모델이나 Agent가 추가되어도 Discord·Voice 구현을 수정하지 않도록 하기 위함이다.

**우선순위**  
MVP 필수.

### 7.2 Codex Session/Thread 관리

**설명**  
Codex의 장기 실행 세션을 Aina가 생성·식별·resume하고 메시지를 전달할 수 있게 한다.

Codex 연결은 `codex app-server` 기반 Thread/Turn 구조를 우선 검토한다. 단순 요청마다 독립적인 Codex 프로세스를 실행하는 방식보다 Aina가 세션 수명주기를 관리하는 형태를 목표로 한다.

**필요한 이유**  
사용자가 “아까 Codex에서 하던 작업 이어서 해줘”라고 요청했을 때 기존 작업 컨텍스트를 유지해야 하기 때문이다.

**우선순위**  
MVP 필수.

### 7.3 Voice Client

**설명**  
주방에 설치된 음성 단말이 Aina Server와 양방향 오디오를 주고받는다.

Voice Client의 책임은 최대한 다음으로 제한한다.

- Wake Word 감지
- 마이크 입력
- 필요한 오디오 전처리
- 음성 스트리밍
- 스피커 출력
- Mute/Volume/상태 표시

**필요한 이유**  
STT, AI, Memory, Agent 기능을 단말에 넣으면 장치 업데이트와 유지보수가 복잡해지기 때문이다.

**우선순위**  
MVP 필수.

### 7.4 Realtime Voice Gateway

**설명**  
Aina Server에서 Voice Device의 오디오와 실시간 음성 모델 사이의 세션을 관리한다.

ChatGPT Voice와 유사한 사용감을 목표로 speech-to-speech Realtime 방식을 우선 검토한다. 시작 모델 후보는 비용과 응답성을 고려해 `GPT-Realtime-2.1 mini`를 우선 검토하고, 품질이 부족할 경우 상위 Realtime 모델로 교체할 수 있도록 모델 선택을 설정화한다.

**필요한 이유**  
`녹음 → STT → LLM → TTS → 재생`의 완전한 순차 구조보다 자연스러운 대화, 빠른 반응, 사용자 끼어들기 처리에 적합하기 때문이다.

**우선순위**  
MVP 핵심 검증 대상.

### 7.5 Agent Tool Delegation

**설명**  
Realtime Voice 모델이 모든 작업을 직접 해결하지 않고 필요한 기능을 Aina Tool로 호출한다.

예시 개념:

```text
delegate_to_codex(...)
remember(...)
lookup_schedule(...)
```

일상 대화는 Voice 모델이 직접 처리하고 복잡한 실행 작업은 Codex 등에 위임하는 구조를 지향한다.

**필요한 이유**  
음성 응답 속도와 작업 Agent의 전문성을 동시에 확보하고, Voice 모델에 과도한 책임을 부여하지 않기 위해서다.

**우선순위**  
MVP 필수.

### 7.6 Aina Memory

**설명**  
Claude Session 또는 Codex Thread 자체를 Aina 전체의 장기 기억으로 간주하지 않고, 필요 정보는 Aina 차원의 Memory에서 관리한다.

최소 요구사항은 Discord와 Voice 중 어느 쪽에서 입력된 정보라도 이후 다른 Client에서 활용할 수 있는 것이다.

**필요한 이유**  
Agent 세션 또는 Client가 바뀌어도 Aina라는 하나의 비서로 인식되어야 하기 때문이다.

**우선순위**  
MVP에서는 최소 구조 필요. 상세한 장기 기억·검색 기능은 단계적으로 확장 가능.

## 8. 범위

### Vision

Aina를 집 안에서 언제든 부를 수 있고, Discord·Voice·향후 앱 등 다양한 Client를 통해 동일한 기억과 Agent 능력을 사용하는 개인/가정용 AI 비서 플랫폼으로 발전시킨다.

여러 공간에 Voice Satellite를 설치하거나 일정·홈 자동화·파일·개발 작업 등 다양한 기능을 Aina Tool로 확장할 수 있는 구조를 지향한다.

### MVP

- 현재 Claude + Discord 기능 유지
- Agent Provider 경계 정의
- Codex Agent 연결
- Codex Thread 생성 및 resume
- 주방 Voice Device 1대 연결
- “아이나” Wake Word 기반 호출
- Voice Device ↔ Aina Server 양방향 오디오 통신
- Aina Realtime Voice Gateway
- 기본적인 실시간 음성 대화
- 음성 대화 중 Codex 작업 위임
- Discord/Voice 간 최소 공통 Memory
- API Key 등 비밀정보는 Aina Server에서 관리

### Later

- 여러 방에 Voice Satellite 추가
- 사용자/화자 구분
- 대화 전체 검색 및 회상
- Voice에서 진행 중인 Codex 작업의 세밀한 상태 알림
- 스마트홈/IoT 연동
- 일정·쇼핑·가족정보 등 전용 Tool 확대
- 웹/모바일 Aina Client
- Voice 장치 OTA 및 중앙 관리
- 상황별 Voice Persona 또는 음성 선택
- 네트워크 단절 시 제한적인 로컬 기능

### Out of Scope

- 초기 단계에서 Aina 전용 PCB 또는 완전한 자체 하드웨어 제작
- Discord와 Voice의 모든 메시지를 1:1로 복제하는 강제 동기화
- 모든 음성 데이터를 항상 서버 또는 외부 API로 전송하는 구조
- 초기 MVP에서 집 전체 스마트홈 플랫폼을 한 번에 구축하는 것

## 9. 결정된 사항

- 기존 프로젝트명은 `Aina(아이나)`다.
- 현재 Aina는 `Agent4Discord`를 개편한 Claude 기반 Discord 프로젝트로 운영 중이다.
- Aina에 Codex Agent 연결 구조를 추가한다.
- Codex는 단발 API 호출보다 지속적인 세션과 연결하는 방향이다.
- Aina에 주방에서 사용할 음성 인터페이스를 추가한다.
- 주방에서는 음성으로 Aina를 부르고 대화할 수 있어야 한다.
- 장비를 개발 단계마다 교체하는 방식보다 하나의 장비를 구매해 계속 사용하는 방향을 선호한다.
- Discord와 Voice 대화 화면을 완전히 동기화할 필요는 없다.
- 중요한 것은 Aina가 인터페이스와 무관하게 필요한 대화 내용을 기억하는 것이다.
- ChatGPT Voice와 유사한 Realtime 음성 경험을 우선 검토한다.

## 10. 미결정 사항

### Voice 하드웨어

**AI 우선 제안:** `Home Assistant Voice Preview Edition` 1대를 Aina Voice Device 후보로 사용한다.

선정 이유는 듀얼 마이크, 음성 전처리용 하드웨어, 스피커, 물리 Mute, 볼륨 조작, Wi-Fi, 오픈 펌웨어 생태계가 하나의 완제품에 통합되어 있어 별도의 Pi·마이크 배열·스피커·케이스를 반복 구매하지 않아도 되기 때문이다.

아직 실제 구매 및 최종 채택은 확정되지 않았다.

### Voice Device ↔ Aina Server 통신

다음 중 어떤 방식을 사용할지 Prototype에서 결정한다.

- ESPHome/Home Assistant 생태계를 최대한 유지하면서 Aina로 중계
- Voice PE 펌웨어를 Aina 전용 Voice Satellite 형태로 개편

핵심 원칙은 단말이 OpenAI API에 직접 접근하지 않고 **Aina Server를 통해 연결**하는 것이다.

### Wake Word

최종 호출어는 “아이나”를 목표로 한다. Voice Device에서 커스텀 Wake Word를 어떤 엔진/모델로 처리할지는 기술 검증이 필요하다.

### Memory 범위 및 저장 방식

인터페이스 간 기억 공유는 필요하지만 다음은 미결정이다.

- 어떤 내용을 자동으로 장기 기억할지
- 전체 대화 로그를 어느 수준까지 저장할지
- 사용자가 기억을 수정·삭제하는 방법
- 저장소 및 검색 기술

### Realtime 모델

`GPT-Realtime-2.1 mini`는 현재 AI 우선 제안이며 확정 기술은 아니다. 실제 한국어 음성 품질, 주방 소음 환경, 응답 지연, 끼어들기 처리, 비용을 Prototype에서 비교한 뒤 결정한다.

### 현재 Aina 구조의 리팩터링 범위

기존 개편된 Agent4Discord 코드의 실제 의존성을 분석한 뒤 `Client / Aina Core / Agent Provider` 경계를 어디까지 분리할지 결정한다. 구조를 만들기 위해 기존 기능을 불필요하게 대규모 재작성하지 않는다.

## 11. 기술적 고려사항

### 11.1 Aina Server 중심 구조

API Key, Realtime 세션, Codex 세션, Memory, Tool 권한은 서버에 둔다. Voice Device에는 비밀정보와 Agent 로직을 최소화한다.

이를 통해 장치가 분실되거나 교체되어도 핵심 설정과 데이터가 단말에 남지 않도록 한다.

### 11.2 주방 환경의 오디오 품질

주방은 다음과 같은 소음이 발생한다.

- 환풍기
- 물 소리
- 조리음
- 식기류 충돌음
- 주변 TV/대화
- Aina 자신의 스피커 출력

따라서 단순 마이크 감도보다 Echo Cancellation, Noise Reduction, Gain Control 등 음성 전처리가 중요하다. 하드웨어 후보 평가 시 이 요소를 최우선으로 본다.

### 11.3 Barge-in

Aina가 말하는 중에도 사용자가 “잠깐”, “아니” 등으로 끼어들 수 있어야 스마트 스피커가 아니라 자연스러운 AI 비서 경험에 가까워진다.

Voice Device의 Echo Cancellation과 Realtime 세션의 interruption 처리를 함께 검증한다.

### 11.4 Codex 연결

Codex Agent Adapter는 `Thread → Turn → Event` 개념을 Aina 내부 Session 모델에 매핑하는 방향을 우선 검토한다.

Codex 이벤트를 Discord와 Voice가 각각 필요한 형태로 표현할 수 있도록 Agent 이벤트와 Client 표현을 분리한다.

### 11.5 음성 응답의 정보량

Codex의 긴 로그나 코드 변경 내용을 Voice에서 그대로 읽지 않는다.

Voice는 다음과 같은 정보에 집중한다.

- 작업 시작 여부
- 승인 또는 추가 입력이 필요한지
- 작업 완료 여부
- 핵심 결과 요약
- 오류 및 사용자가 즉시 알아야 하는 상태

상세한 diff, 파일, 로그는 Discord 등 화면이 있는 Client를 이용한다.

## 12. 위험 요소 및 대응

### 음성 인식 품질 부족

**위험**  
주방 소음이나 거리 때문에 Wake Word 또는 발화 인식률이 낮으면 실제 사용성이 급격히 떨어진다.

**대응**  
소프트웨어 기능을 확장하기 전에 실제 주방 위치에서 Wake Word, AEC, 음성 스트리밍 품질을 우선 검증한다.

### 응답 지연

**위험**  
음성 호출 후 응답이 늦으면 Discord보다 편리하다는 핵심 가치가 사라질 수 있다.

**대응**  
Realtime Voice 계층은 빠른 대화와 Tool 판단에 집중하고, 시간이 오래 걸리는 작업은 Codex에 비동기적으로 위임한 뒤 진행 상태를 짧게 안내한다.

### 구조적 복잡도 증가

**위험**  
Claude, Codex, Discord, Voice, Memory를 한 번에 추상화하려다 기존 Aina보다 복잡한 플랫폼을 먼저 만들 수 있다.

**대응**  
기존 Aina를 전면 재작성하지 않고 실제 확장 지점에서 필요한 경계만 추출한다. 첫 번째 목표는 `Codex 1개 + Voice Device 1개`가 동작하는 것이다.

### 비용 증가

**위험**  
Realtime 음성을 장시간 항상 연결하거나 불필요한 오디오를 외부 모델로 전송하면 비용이 증가한다.

**대응**  
Wake Word는 로컬 처리하고 호출 전 음성은 외부로 보내지 않는다. Realtime 세션의 종료 조건과 idle timeout을 명확히 한다.

### 프라이버시

**위험**  
가정 내 상시 마이크는 가족 구성원에게 민감할 수 있다.

**대응**  
물리적 Mute가 가능한 장비를 우선하고, Wake Word 이전 음성은 외부로 전송하지 않는 구조를 기본 원칙으로 한다.

## 13. 단계별 구현

### Phase 1. 기존 Aina 구조 분석 및 Codex 확장

1. 현재 개편된 Agent4Discord 코드에서 Discord/Claude 결합 지점을 파악한다.
2. 최소한의 Agent Provider 인터페이스를 정의한다.
3. 기존 Claude 동작을 유지한 상태에서 Codex Adapter를 추가한다.
4. Codex Thread 생성·resume·Turn 전송·이벤트 수신을 검증한다.
5. Discord에서 Codex 세션을 실제로 사용할 수 있게 한다.

### Phase 2. Voice Hardware Prototype

1. 최종 사용할 Voice Device를 선정한다.
2. 실제 주방 위치에서 마이크, 스피커, AEC, Wi-Fi 품질을 검증한다.
3. “아이나” Wake Word Prototype을 만든다.
4. Voice Device ↔ Aina Server 양방향 Audio Streaming을 구현한다.

### Phase 3. Realtime Voice

1. Aina Realtime Gateway를 만든다.
2. 실시간 음성 입출력을 연결한다.
3. Turn detection 및 사용자 interruption을 검증한다.
4. Voice Persona와 기본 시스템 지침을 정의한다.
5. 한국어 품질·지연·비용을 측정해 Realtime 모델을 최종 선택한다.

### Phase 4. Aina Tool / Memory 연결

1. Realtime Voice에서 Codex 위임 Tool을 호출할 수 있게 한다.
2. Voice에서 Codex Session resume을 검증한다.
3. Discord와 Voice에서 공통으로 사용할 최소 Memory를 만든다.
4. Voice에서 말한 정보를 Discord에서 회상하는 End-to-End 흐름을 검증한다.

## 14. 다음 작업

1. 현재 운영 중인 Aina 저장소의 실제 구조를 분석해 Claude/Discord 결합 지점을 정리한다.
2. `ClaudeProvider / CodexProvider` 수준의 최소 Agent 추상화 초안을 작성한다.
3. Codex app-server를 이용한 Session Adapter 기술 검증을 진행한다.
4. Home Assistant Voice Preview Edition을 Aina 전용 Voice Satellite로 사용할 때 필요한 수정 범위를 조사한다.
5. Voice PE 구매 전, Aina 연결에 필요한 오디오 입출력 경로와 커스텀 Wake Word 구현 가능성을 확인한다.
6. Prototype에서 사용할 `Voice Device ↔ Aina Server` 프로토콜을 결정한다.
7. Realtime Voice의 한국어 품질, 지연, barge-in, 예상 비용을 짧은 Prototype으로 검증한다.
8. 위 검증 결과를 바탕으로 MVP 기술 구조를 확정하고 Status를 `Planning`으로 전환할지 판단한다.
