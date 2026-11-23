# TeamCity + Jira + Confluence Cloud 통합 도입 심층 리서치

**조사 기준일: 2026-11-23, Asia/Seoul**

## 경영진 요약

현재 JetBrains TeamCity를 안정적으로 CI/CD에 사용 중인 조직이라면, **TeamCity를 교체하지 않고 Jira Cloud를 개발 업무·이슈 추적의 허브로, Confluence Cloud를 기술·운영 지식의 허브로 추가하는 구성이 기술적으로 타당하다.** 특히 2026년 기준 TeamCity에는 Jira Cloud에 대한 공식 네이티브 통합이 존재하며, 커밋 메시지에 Jira 이슈 키가 있으면 TeamCity에서 이슈를 연결하고, TeamCity 빌드·배포 상태를 Jira Cloud의 Builds/Deployments 영역으로 전송할 수 있다. 반면 **TeamCity → Confluence Cloud 직접 게시 기능은 JetBrains의 현재 공식 통합 목록에 포함되어 있지 않아 REST API, Atlassian Automation 또는 별도 중계 서비스 구현이 필요하다.** citeturn292769search3turn292769search5turn850149search4

Jira와 Confluence Cloud 사이의 연동은 세 조합 중 가장 성숙하다. 같은 Atlassian 조직에 속한 Jira와 Confluence는 별도 Application Link를 수동으로 만들지 않아도 연계되며, Jira 이슈를 Confluence 페이지에 삽입하거나 Confluence에서 Jira 이슈를 생성하고, 페이지와 이슈 간 링크를 자동 생성할 수 있다. Jira 필터·보드·일정 등을 Smart Link나 매크로로 문서에 포함하는 것도 지원된다. citeturn156377search1turn156377search2turn156377search3

따라서 추천 구조는 **“TeamCity는 실행 시스템(System of Execution), Jira는 업무·변경 추적의 System of Record, Confluence는 설명·결정·운영지식의 System of Record”** 로 역할을 분리하는 것이다. TeamCity의 모든 상세 로그를 Jira/Confluence에 복제하기보다는, 식별자·상태·요약·URL을 Atlassian 쪽에 전달하는 방식이 유지보수성과 데이터 중복을 최소화한다. 이는 TeamCity가 Jira Cloud의 Builds/Deployments API에 빌드 결과를 보내는 현재 공식 모델과도 잘 맞는다. citeturn850149search0turn850149search1turn850149search2

실제 사례도 확인된다. 보험 소프트웨어 기업 **Keylane**은 약 1,000명의 개발자를 지원하고 TeamCity에서 2,000개 이상의 빌드를 운영하면서 Jira, Confluence, 온프레미스 Bitbucket을 계속 사용하고 있으며, TeamCity 빌드 상태를 Jira와 Bitbucket에서 볼 수 있도록 구성했다고 공개했다. 다만 공개 사례에는 **TeamCity가 Confluence로 릴리스 페이지를 자동 갱신한다는 내용까지는 없다.** 즉, “세 제품을 함께 사용한 실제 조직”이라는 점은 확인되지만 세 제품 간 모든 자동화가 공개 검증된 것은 아니다. citeturn425832search0

별도의 역사적 실례로 JetBrains 엔지니어는 2010년에 TeamCity의 커스텀 빌드 태스크로 산출물을 올리고 **Confluence Wiki 페이지를 자동 갱신**했다고 공개했다. 현재 Confluence Cloud API와는 기술 세대가 다르지만, “CI 빌드가 위키의 릴리스 정보를 갱신한다”는 운영 패턴 자체가 실무에서 오래 사용돼 왔음을 보여준다. 현재는 이를 Confluence Cloud REST API v2 또는 Automation으로 구현하는 것이 적절하다. citeturn227490view2turn850149search4

**결론적으로는 도입을 권고한다.** 단, Jira/Confluence를 TeamCity의 또 다른 로그 저장소로 만들지 말고, 1차 PoC에서 **① Jira 키 기반 추적성, ② Jira의 Build/Deployment 정보, ③ Confluence 릴리스 페이지 자동 생성/갱신, ④ 인증·네트워크·권한 모델** 네 가지를 먼저 검증한 후 확장하는 방식이 가장 안전하다.

## 확인된 사례와 2026년 생태계 현황

공개적으로 확인 가능한 사례 가운데 현재 검토 상황과 가장 유사한 것은 Keylane이다. 이 회사는 기존 CI 환경을 TeamCity로 재설계하면서 Jira와 Confluence를 유지했고, 약 27M LOC 규모의 주요 애플리케이션 빌드를 1시간 이상에서 약 6분으로 줄였으며, TeamCity에서 2,000개가 넘는 빌드를 관리한다고 JetBrains가 공개했다. 여기에서 중요한 점은 “Atlassian 제품을 쓰기 때문에 CI까지 Atlassian Bamboo로 통일해야 한다”는 전제가 실제 대규모 사용 조직에서는 성립하지 않는다는 것이다. citeturn425832search0

또한 Atlassian Marketplace에는 Stiltsoft의 **TeamCity Integration for Jira**가 현재도 존재한다. 2026-11-23 조회 시 Cloud와 Data Center를 모두 지원한다고 표시되며, Jira에서 TeamCity 빌드 상세정보 조회, 특정 이슈와 관련된 빌드 조회, Jira에서 TeamCity 빌드 실행, Fixed in Build 필드, Dashboard gadget 등의 기능을 제공한다. Data Center 10.x용 4.0.4는 **2026-11-17** 출시된 것으로 확인된다. 다만 이 앱은 Atlassian 자체 기능이 아니라 Marketplace 파트너 제품이고, 보안·데이터 처리 책임 또한 파트너에게 있으므로 네이티브 통합보다 공급자 종속성과 개인정보·운영 리스크 평가가 더 필요하다. citeturn227490view1turn961394search4

반면 과거의 **TeamCity Integration for Confluence 앱은 Marketplace에서 Archived 상태**로 확인된다. 따라서 2026년 신규 아키텍처에서 해당 앱을 전제로 설계하는 것은 권장하기 어렵고, TeamCity → Confluence는 REST API 또는 Automation을 기본 경로로 보는 편이 현실적이다. citeturn961394search17

JetBrains 자체 제품 방향도 TeamCity를 다른 생태계와 결합하는 쪽을 유지하고 있다. TeamCity 2026.2/2026.3 문서는 Jira 연결을 공식 지원하며, REST API와 Webhooks도 기본 제공한다. TeamCity의 공식 통합 페이지에는 Jira가 명시되어 있지만 Confluence는 없다. 즉, **Jira 연계는 제품 기능, Confluence 연계는 확장 지점(API/Webhook)을 사용하는 구조**가 현재 공급자의 의도와도 일치한다. citeturn292769search5turn371840search0turn371840search4

Atlassian 쪽에서는 Cloud 중심 전환이 더 강해졌다. **신규 Jira/Confluence Data Center 판매는 2026-03-30 종료됐고, 영향을 받는 Data Center 제품은 2029-03-28 EOL 예정**이다. 기존 고객은 일정 기간 확장·갱신할 수 있지만, 지금 Jira와 Confluence를 새로 도입하는 조직이라면 Cloud를 기준선으로 잡는 것이 공급자 로드맵 측면에서도 합리적이다. Bitbucket과 Bamboo Data Center는 이 EOL 대상에서 제외되지만 Jira와 Confluence Data Center는 포함된다. citeturn141446search0

## 권장 통합 아키텍처와 네이티브 지원 범위

권장 구조는 다음과 같다.

```text
개발자
  │
  │ commit / PR
  ▼
Git / Bitbucket / GitHub / GitLab
  │
  │ VCS trigger
  ▼
┌─────────────────────── TeamCity ────────────────────────┐
│ Build / Test / Package / Deploy                  │
│                                                  │
│  Jira Issue Tracker Integration                  │──▶ Jira 이슈 링크
│  Jira Cloud Integration                          │──▶ Builds / Deployments
│  REST API / Webhook / build script               │
└───────────────────────┬──────────────────────────┘
                   │ HTTPS outbound
                   ▼
         Integration / Automation Layer
       ┌────────────────┴──────────────┐
       ▼                            ▼
    Jira Cloud                Confluence Cloud
 Issues / Releases       ADR / Runbook / Release Notes
 Builds / Deployments    Operations / Knowledge Base
       │                            ▲
       └──────── native Atlassian ────────┘
       Jira ↔ Confluence links / macros / Smart Links
```

통합별 지원 수준은 다음처럼 구분하는 것이 중요하다.

| 흐름 | 2026년 권장 방식 | 지원 수준 | 커스텀 개발 |
|---|---|---:|---:|
| TeamCity → Jira 이슈 링크 | TeamCity Issue Tracker connection | **JetBrains 네이티브** | 불필요 |
| Commit → Jira 이슈 | 커밋 메시지에 `ABC-123` | **JetBrains 네이티브** | 불필요 |
| TeamCity Build → Jira Builds | Jira Cloud Integration build feature | **JetBrains 네이티브** | 불필요 |
| TeamCity Deployment → Jira Deployments | deployment build + environment 지정 | **JetBrains 네이티브** | 불필요 |
| Jira → TeamCity 빌드 실행 | Marketplace 앱 또는 Jira Automation → TeamCity API | 서드파티/커스텀 | 보통 필요 |
| Jira ↔ Confluence 문서 | Atlassian Cloud 내부 연결 | **Atlassian 네이티브** | 불필요 |
| Confluence → Jira 이슈 생성 | Jira work item 기능/매크로 | **Atlassian 네이티브** | 불필요 |
| TeamCity → Confluence 릴리스 노트 | Confluence REST API v2 | 공식 API | **필요** |
| TeamCity → Confluence 이벤트 기반 갱신 | TeamCity webhook → Automation/API | 공식 확장 기능 | **필요** |
| Confluence → TeamCity | Automation Send web request → TeamCity | 공식 확장 기능 | **필요** |

TeamCity의 Jira Cloud Integration은 커밋 메시지에서 Jira 키를 찾고, 관련 Build 또는 Deployment 정보를 Jira Cloud로 전송한다. Deployment의 경우 환경 이름과 환경 유형을 지정해야 Jira의 Deployment 정보로 표현된다. Jira Builds API에는 **한 build ID당 연결 가능한 Jira 이슈 수 100개 제한**이 있으며 TeamCity 문서도 이 제약을 명시하고 있다. citeturn115767search0turn425832search3

Jira Cloud 쪽 Build/Deployment API는 외부 CI 도구와의 통합을 정식 사용 사례로 지원한다. Atlassian은 온프레미스 도구용 OAuth 방식과 `api.atlassian.com` 프록시 경로를 제공하며 Development Information, Builds, Deployments를 외부 도구가 주입할 수 있도록 한다. 따라서 TeamCity 네이티브 기능으로 부족한 커스텀 메타데이터가 있다면 별도 Integration Service가 이 API를 직접 호출하는 것도 가능하다. citeturn850149search0turn850149search1turn850149search2turn850149search3

Confluence Cloud는 REST API v2에서 페이지 생성과 업데이트를 공식 제공한다. 따라서 TeamCity 빌드 마지막 단계에서 릴리스 버전, Git SHA, Jira JQL 결과 링크, artifact URL, 배포환경, 테스트 결과 요약을 JSON/ADF 또는 storage representation으로 조립해 릴리스 페이지를 생성·갱신하는 패턴을 구현할 수 있다. 이것은 **공식 API를 이용한 커스텀 통합이지 TeamCity 네이티브 Confluence 기능은 아니다.** citeturn850149search4turn850149search5

## 실무 자동화 유스케이스

| 유스케이스 | 효과 | 난이도 | 구현 |
|---|---:|---:|---|
| **커밋 ↔ Jira 자동 추적** | 매우 높음 | 하 | 커밋/브랜치 규칙에 Jira 키 포함. TeamCity Issue Tracker Integration 사용. citeturn425832search3 |
| **Jira에서 Build 상태 표시** | 매우 높음 | 하 | TeamCity의 Jira Cloud Integration build feature 활성화. citeturn115767search0 |
| **Jira에서 Production 배포 이력 표시** | 매우 높음 | 하~중 | TeamCity deployment configuration에 environment type/name 설정. citeturn850149search2turn425832search3 |
| **릴리스된 Jira 이슈 자동 목록화** | 높음 | 중 | TeamCity build 변경 목록 + Jira API/JQL 조합 후 Confluence에 게시. |
| **Confluence Release Note 자동 생성** | 매우 높음 | 중 | 성공한 release build 후 Confluence REST `POST /pages` 또는 `PUT /pages/{id}`. citeturn850149search5 |
| **운영 배포 페이지 자동 갱신** | 높음 | 중 | TeamCity webhook `BUILD_FINISHED` → integration service → Confluence REST. citeturn371840search4 |
| **Jira Release 승인 후 TeamCity 배포 시작** | 높음 | 중~상 | Jira Automation `Send web request` → API Gateway → TeamCity REST build queue. citeturn141446search15turn371840search0 |
| **빌드 실패 시 Jira Bug 자동 생성/갱신** | 중~높음 | 중 | TeamCity webhook → Jira Automation incoming webhook 또는 Jira REST API. 중복 방지를 위해 buildType/error fingerprint 사용. citeturn141446search3turn850149search7 |
| **ADR/결정사항 ↔ Jira Epic 연결** | 높음 | 하 | Confluence Decision/ADR 템플릿 + Jira 링크. Decision report macro로 결정사항 집계. citeturn156377search20turn156377search3 |
| **팀 운영 대시보드** | 높음 | 하~중 | Confluence 페이지에 Jira 이슈 매크로/Smart Link를 배치하고 TeamCity build URL 또는 요약 데이터를 삽입. citeturn156377search21turn156377search27 |

첫 번째로 적용할 것은 커밋 키 규칙이다. 예를 들어 `PAY-231 fix payment timeout`처럼 Jira 키를 commit message 또는 branch에 강제하면, 코드→빌드→Jira 이슈의 기본 추적 체인이 생긴다. TeamCity 공식 문서도 Jira 통합의 효과를 높이기 위해 VCS commit comment에 이슈 키를 항상 포함하도록 권고한다. citeturn425832search3

두 번째는 “릴리스 노트 자동화”다. TeamCity에서 release build가 성공할 때 `/Release/2026.11.3` 같은 Confluence 페이지를 만들고 **빌드번호, commit SHA, 포함된 Jira 이슈, 테스트 요약, artifact, 배포환경, rollback URL** 정도만 기록한다. 상세 빌드 로그는 TeamCity 링크로 남겨야 문서가 과도하게 비대해지는 것을 방지할 수 있다.

세 번째로 효과가 큰 것은 배포 승인 흐름이다. Jira의 Release/Change 이슈가 Approved 상태로 전환되면 Jira Automation이 `Send web request`를 통해 TeamCity 빌드를 시작할 수 있다. 하지만 이 구조는 Atlassian Cloud에서 사내 TeamCity로 **인바운드 연결**이 필요하므로 인터넷에 TeamCity 본체를 직접 노출하기보다는 API Gateway·reverse proxy·integration relay를 앞에 두고 허용 명령을 제한하는 것이 낫다. Atlassian은 Cloud에서 외부 시스템으로 나가는 연결에 사용되는 IP 범위를 공식 게시하지만 그 범위는 변경될 수 있다고 명시한다. citeturn141446search15turn850149search8

## Cloud·Data Center 차이, 보안과 TCO

**Jira Cloud와 Jira Data Center의 TeamCity 통합은 동일하지 않다.** TeamCity는 Jira Cloud와 self-managed Jira 모두에서 이슈 키를 인식하고 링크를 표시할 수 있지만, TeamCity가 Builds/Deployments 상태를 Jira에 네이티브로 보고하는 기능은 Jira Cloud 쪽이 중심이다. Data Center에서 더 깊은 빌드 보기·원격 실행 등이 필요하면 Marketplace 앱이나 별도 개발을 검토해야 한다. citeturn115767search0turn227490view1

Confluence Cloud는 페이지 REST API와 Cloud Automation을 이용하는 것이 표준이다. 반면 Data Center에서는 서버 플러그인이나 Application Link 등 서버 내 확장 방식이 더 자유롭다. 그러나 Jira/Confluence Data Center는 2029년 EOL이 이미 발표됐으므로, 신규 도입 시 Data Center 전용 통합에 투자하면 2~3년 뒤 재작업 위험이 커진다. citeturn141446search0

인증은 개인 사용자 계정에 장기 API 토큰을 묶지 않는 것이 좋다. Atlassian은 service account용 API token과 OAuth 2.0 credential을 지원하며, scoped token으로 Jira와 Confluence 권한 범위를 제한할 수 있다. Confluence REST API 호출은 호출 사용자에게 실제 페이지/스페이스 권한이 있어야 한다. citeturn141446search24turn141446search42turn141446search13turn850149search5

Atlassian Cloud SSO·SCIM·인증 정책이 필요하면 Atlassian Guard를 고려해야 한다. Guard Standard에서 SAML/Google Workspace SSO와 복수 authentication policy를 적용할 수 있다. 단, 사람의 SSO와 CI용 API 인증은 별도 문제이므로 “SSO를 켰으니 API도 SSO로 인증된다”는 식으로 설계하면 안 된다. citeturn850149search9turn769873search19

TeamCity REST API는 Bearer access token을 지원하며, JetBrains는 외부 자동화를 위한 REST API를 공식 제공한다. 자동화 전용 TeamCity 사용자를 만들고 필요한 프로젝트의 build trigger/read 권한만 부여하는 방식이 적절하다. citeturn371840search0turn371840search5

네트워크 관점에서 가장 단순하고 안전한 구조는 **TeamCity → Atlassian Cloud outbound HTTPS만 허용하는 방향**이다. TeamCity가 Jira와 Confluence API를 호출하는 경우 사내 방화벽에 외부 HTTPS egress만 필요하다. Jira/Confluence가 TeamCity API를 호출해야 하는 기능은 별도 relay 또는 gateway를 두는 편이 공격면을 줄인다. Atlassian은 Cloud 서비스가 외부로 연결할 때 사용하는 IP range를 공식 제공하지만 변경 가능성을 명시하므로 IP를 코드에 고정하지 않고 운영 절차를 마련해야 한다. citeturn850149search8

라이선스 TCO는 사용자 수에 크게 좌우된다. 2026-11 조회 시 Jira Cloud Standard 가격 페이지는 **사용자당 월 $7.91**을 표시하며 Premium은 $14.54로 표시한다. Atlassian은 월간 Cloud에 점진적 사용자 가격과 Maximum Quantity Billing을 적용하므로 실제 계약 가격은 사용자 수·계약 방식에 따라 달라진다. citeturn769873search1turn514303search2

Confluence Standard의 공식 라이선싱 표에는 1~100 사용자 구간에 **월 $6.70/user**가 확인된다. 따라서 100명 조직의 단순 예시로 Jira Standard $7.91 + Confluence Standard $6.70을 적용하면 연간 약 **$17,532**이다. 이는 세금·환율·연간 할인·Marketplace 앱·Guard를 제외한 단순 모델이다. citeturn180880search10turn769873search1

현재 TeamCity를 이미 보유하고 있다면 CI 라이선스는 대부분 sunk cost에 해당한다. 신규 TeamCity Enterprise On-Premises 기준 공개 가격은 서버 **$2,399/년**, 추가 build agent는 **$359/agent/년**이며 Professional은 3 agents/100 build configurations까지 무료다. citeturn790899search0turn790899search1

실제 1년차 TCO에서는 라이선스보다 **통합 구현·문서 구조 설계·권한 정비·사용자 교육**이 더 큰 변수가 될 수 있다. 내부 계획용으로는 100명 규모에서 “Jira+Confluence 기본 라이선스 $17.5k/년 + 필요 시 Guard/Marketplace 앱 + 초기 통합 10~30 engineer-days + 이후 0.1~0.3 FTE 유지보수” 정도를 시작점으로 두고 PoC에서 조정하는 것이 현실적이다. 여기서 engineer-days와 FTE 수치는 제품 가격이 아니라 **예산 계획을 위한 추정치**다.

## 대안 비교, 실패 패턴과 PoC

| 방안 | 장점 | 단점 | 판단 |
|---|---|---|---|
| **TeamCity + Jira Cloud + Confluence Cloud** | 기존 CI 투자 유지, Jira/Confluence 연계 강력, 점진 도입 | Confluence 연계 일부 커스텀 | **추천** |
| TeamCity + Jira만 도입 | 변화량 적음 | 지식·ADR·Runbook 분산 지속 | 단기형 |
| TeamCity + Confluence만 | 문서 개선 | 개발 업무 추적·Build traceability 부족 | 비추천 |
| Bamboo + Jira + Confluence | Atlassian 일원화 | TeamCity 이전 비용·리스크, 기존 CI 자산 폐기 | TeamCity 불만이 큰 경우만 |
| YouTrack + Knowledge Base + TeamCity | JetBrains 생태계 통합성 | 조직이 Jira/Confluence 표준을 원하는 경우 부적합 | 대안 |
| Jira/Confluence Data Center | 자가 운영 통제 | 신규 판매 종료, 2029 EOL | 신규 도입 비추천 citeturn141446search0 |

특히 **“Atlassian을 도입하므로 TeamCity를 Bamboo로 바꿔야 한다”는 근거는 약하다.** Jira Cloud는 외부 CI/CD의 Builds/Deployments API를 공식 제공하고 TeamCity도 이를 네이티브 지원한다. Keylane 사례도 TeamCity와 Jira/Confluence가 공존하는 대규모 구성을 보여준다. citeturn850149search0turn425832search0

실패 패턴은 대체로 다음과 같다. 가장 흔한 것은 commit에 Jira 키가 빠져 추적성이 끊어지는 경우, TeamCity 상세 로그를 Jira/Confluence에 그대로 복제해 중복 데이터가 폭증하는 경우, 개인 API token을 운영 자동화에 사용해 퇴사·권한 변경 때 장애가 나는 경우, Jira와 Confluence 권한 모델을 별개로 설계해 링크는 보이는데 문서는 열 수 없는 경우, 인터넷에서 TeamCity REST API를 직접 노출하는 경우, Marketplace 앱을 많이 추가한 뒤 업그레이드·보안·라이선스 비용을 통제하지 못하는 경우다. Jira↔Confluence 연결 실패의 실제 Atlassian KB에서도 Jira/Confluence 권한 부족이 주요 원인으로 명시된다. citeturn156377search5

PoC에서는 기능 시연보다 운영조건을 검증해야 한다.

1. `ABC-123` 커밋 → TeamCity build → Jira Builds가 일관되게 연결되는가.
2. deployment build가 Dev/Test/Prod 환경별로 Jira Deployments에 정확히 보이는가.
3. squash merge·merge commit·여러 Jira 키가 있는 commit에서도 연결이 기대대로 동작하는가.
4. 릴리스 1회에 Jira 이슈가 100개를 넘는 경우 API 제한을 어떻게 처리할 것인가. citeturn425832search3
5. TeamCity 성공 후 Confluence release page 생성/갱신이 idempotent한가.
6. 같은 build webhook이 두 번 들어와도 Jira 이슈 또는 Confluence 페이지가 중복 생성되지 않는가.
7. 서비스 계정 token 만료·회전 시 무중단 교체가 가능한가.
8. TeamCity가 외부에서 접근 불가능한 상태에서도 필요한 자동화 대부분을 outbound 방식으로 구현할 수 있는가.
9. Jira/Confluence 접근권한이 다른 사용자가 링크를 따라갔을 때 정보가 과다 노출되지 않는가.
10. TeamCity, Atlassian API 중 한쪽 장애 시 CI/CD 자체가 실패하지 않도록 integration step을 non-blocking 또는 retry 가능한 형태로 설계했는가.

## 실행 로드맵과 추천안

**첫 30일은 기반을 만드는 단계**가 적절하다. Jira Cloud와 Confluence Cloud를 소수 개발팀으로 개설하고 프로젝트·스페이스·권한 체계를 정의한다. `JIRA-KEY` commit convention을 정하고 TeamCity의 Jira Issue Tracker Integration을 연결한다. 대표 빌드 2~3개에 Jira Cloud Integration을 추가해 Build/Deployment 표시를 검증한다. 동시에 Confluence에는 Architecture Decision Record, Runbook, Release Note 템플릿 세 가지만 만든다. Jira와 Confluence는 같은 Atlassian 조직 안에서 네이티브 연계를 우선 사용한다. citeturn425832search3turn156377search2

**60일까지는 자동화와 보안을 붙인다.** 릴리스 TeamCity configuration에서 Confluence REST API를 호출해 Release Note를 자동 생성하는 PoC를 구현하고, service account·scoped token 또는 OAuth를 적용한다. Jira Automation incoming webhook/Send web request도 시험하되 TeamCity를 인터넷에 직접 공개하지 않고 relay/API gateway를 사용한다. API token rotate, retry, timeout, duplicate webhook 처리와 감사 로그를 포함한다. citeturn141446search3turn141446search15turn141446search24

**90일까지는 표준화와 확산 여부를 결정한다.** 성공한 패턴을 TeamCity Kotlin DSL/template 또는 공통 build feature로 묶어 신규 프로젝트가 동일한 통합을 자동 상속하도록 만들고, Jira project template과 Confluence space template도 표준화한다. 실제 사용 데이터를 통해 “이슈에 build가 연결된 비율, release note 자동 생성률, 장애 시 runbook 접근시간, 수작업 release note 작성시간” 등을 측정해 전사 확대 여부를 판단하는 것이 좋다.

최종 추천 구성은 **TeamCity 유지 + Jira Cloud Standard 또는 Premium + Confluence Cloud Standard/Premium**이다. Jira Premium은 여러 팀 간 계획, 더 높은 automation allowance, 99.9% SLA가 필요할 때 선택하고, 그렇지 않으면 Standard에서 시작하는 것이 경제적이다. Jira Standard는 현재 사용자당 월 400 automation steps, Premium은 750 steps로 공식 가격 페이지에 표시된다. citeturn769873search1

Confluence는 기술문서·운영지식 용도라면 Standard부터 시작할 수 있고, 24/7 Premium support, unlimited storage, 고급 관리자 기능과 99.9% SLA가 중요하면 Premium을 검토하면 된다. citeturn227490view4turn769873search7

가장 중요한 설계 원칙은 **TeamCity의 원본 CI 데이터는 TeamCity에 두고 Jira/Confluence에는 의미 있는 메타데이터와 링크만 전달하는 것**이다. 이 원칙을 지키면 API 변경이나 Atlassian Marketplace 앱 장애가 발생해도 실제 빌드·배포 파이프라인이 영향을 받지 않는다.

### 리스크 매트릭스

| 리스크 | 가능성 | 영향 | 대응 |
|---|---|---|---|
| Jira 키 누락으로 traceability 단절 | 중 | 높음 | branch/commit 정책, PR 검사 |
| TeamCity → Atlassian token 유출 | 낮~중 | 매우 높음 | service account, scoped token, secret vault, rotation |
| Atlassian → 사내 TeamCity 네트워크 노출 | 중 | 매우 높음 | API Gateway/relay, 최소 endpoint, IP/인증 검증 |
| Confluence 자동 게시 API 변경 | 중 | 중 | REST v2 사용, adapter 계층, contract test |
| Marketplace 앱 vendor 종속 | 중 | 중~높음 | 네이티브/API 우선, 앱 최소화 |
| Jira/Confluence 권한 불일치 | 높음 | 중 | 그룹 기반 권한, PoC permission test |
| Automation 사용량 증가 | 중 | 중 | rule 통합, event filter, plan 검토 |
| 중복 webhook/중복 문서 | 중 | 중 | buildId/version 기반 idempotency |
| CI가 Atlassian 장애에 종속 | 중 | 높음 | 외부 게시 단계 non-blocking/retry |
| Data Center 선택 후 재마이그레이션 | 높음 | 높음 | 신규 Jira/Confluence는 Cloud 우선 citeturn141446search0 |

## 핵심 공식 출처와 확인 날짜

| 출처 | 날짜 | URL |
|---|---|---|
| JetBrains, **Integrating TeamCity with Jira**, TeamCity 2026.x | 문서 조회 2026-11-23 / 페이지 내 가이드 2026-04-04 | https://www.jetbrains.com/help/teamcity/jira.html citeturn115767search0 |
| JetBrains, **Integrating TeamCity with Other Tools** | 조회 2026-11-23 | https://www.jetbrains.com/help/teamcity/integrating-teamcity-with-other-tools.html citeturn292769search6 |
| JetBrains, **TeamCity REST API** | TeamCity 2026.2, 조회 2026-11-23 | https://www.jetbrains.com/help/teamcity/rest/teamcity-rest-api-documentation.html citeturn371840search0 |
| JetBrains, **TeamCity Webhooks** | TeamCity 2026.2, 조회 2026-11-23 | https://www.jetbrains.com/help/teamcity/teamcity-webhooks.html citeturn371840search4 |
| JetBrains, **Keylane customer story** | 조회 2026-11-23 | https://www.jetbrains.com.cn/en-us/teamcity/customers/keylane/ citeturn425832search0 |
| Atlassian, **Jira Software Cloud Builds API** | 조회 2026-11-23 | https://developer.atlassian.com/cloud/jira/software/rest/api-group-builds/ citeturn850149search1 |
| Atlassian, **Jira Software Cloud Deployments API** | 조회 2026-11-23 | https://developer.atlassian.com/cloud/jira/software/rest/api-group-deployments/ citeturn850149search2 |
| Atlassian, **Confluence Cloud REST API v2** | 조회 2026-11-23 | https://developer.atlassian.com/cloud/confluence/rest/v2/intro/ citeturn850149search4 |
| Atlassian, **Use Jira and Confluence together** | 조회 2026-11-23 | https://support.atlassian.com/confluence-cloud/docs/use-jira-and-confluence-together/ citeturn156377search3 |
| Atlassian, **Cloud Automation incoming webhook** | 조회 2026-11-23 | https://support.atlassian.com/cloud-automation/docs/configure-the-incoming-webhook-trigger-in-atlassian-automation/ citeturn141446search3 |
| Atlassian, **Automation Send web request** | 조회 2026-11-23 | https://support.atlassian.com/cloud-automation/docs/jira-automation-actions/ citeturn141446search15 |
| Atlassian, **Data Center End of Life** | 정책 기준 2026-03-30 / EOL 2029-03-28, 조회 2026-11-23 | https://www.atlassian.com/licensing/data-center-end-of-life citeturn141446search0 |
| Atlassian Marketplace, **TeamCity Integration for Jira – Stiltsoft** | DC 4.0.4 출시 2026-11-17, 조회 2026-11-23 | https://marketplace.atlassian.com/apps/1210766/teamcity-integration-for-jira citeturn227490view1 |
| Atlassian Marketplace, **TeamCity Integration for Confluence – Archived** | 조회 2026-11-23 | https://marketplace.atlassian.com/archive/1015949 citeturn961394search17 |
| Atlassian, **Jira Cloud pricing** | 조회 2026-11-23 | https://www.atlassian.com/software/jira/pricing citeturn769873search1 |
| JetBrains, **TeamCity pricing** | 조회 2026-11-23 | https://www.jetbrains.com/teamcity/buy/ citeturn790899search0 |