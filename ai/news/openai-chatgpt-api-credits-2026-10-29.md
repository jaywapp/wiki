---
title: ChatGPT Pro·Business API 크레딧 혜택 발표
category: news
tags: [openai, chatgpt, api, credits, billing, pro, business]
source: https://developers.openai.com/api/docs/guides/chatgpt-api-credits
updated: 2026-10-29
---

# ChatGPT Pro·Business 구독자 API 크레딧 혜택 (2026-10-29)

## 핵심 요약
OpenAI는 2026-10-28(미국 시간) 적격 ChatGPT Pro·Business 구독자가 API 크레딧을 신청할 수 있다고 발표했다. **월 최대 $500**은 모든 구독자에게 일괄 지급되는 금액이 아니라 요금제·유료 좌석에 따른 상한이다.

## 요금제별 크레딧
| 구독 | 월 정규 지급액 |
| --- | ---: |
| Pro 100 | $100 |
| Pro 200 | $200 |
| Pro 500 | $500 |
| Business Standard | 유료 좌석당 $20 |
| Business Premium | 유료 좌석당 $100 |

Business는 워크스페이스 합산 월 $500 한도. 연간 선불 Business는 연간 최대 $6,000를 한 번에 지급받는다. 최초 지급은 남은 청구 기간에 비례하여 계산된다.

## 자격과 신청
- 유료 구독이 7일 이상 활성화되어야 하며 체험판·무료 제공 구독은 제외된다.
- ChatGPT 구독/워크스페이스 소유자이면서 수령할 API Organization의 소유자여야 한다.
- ChatGPT와 API 계정의 이메일이 같아야 한다.
- ChatGPT Settings → Billing(또는 Business 관리자의 워크스페이스 Billing)에서 API 혜택을 선택하고 API Organization에 연결한다.
- 연결된 API Platform Billing에서 지급액과 만료일을 확인한다.

## 사용 범위와 제약
- Responses, Agents, Realtime, Images 및 일부 내장 도구 등 연결된 조직의 유료 API 사용량에 적용된다.
- **API 키를 이용한 Codex 사용에는 적용되지 않는다.** ChatGPT 및 로그인 방식 Codex 사용 한도도 늘어나지 않는다.
- 미사용 월 크레딧은 청구 주기 종료 시 소멸하며 이월되지 않는다.
- 유효한 무료 크레딧만 사용할 때는 API 결제 수단이 필수는 아니다. 잔액 소진 후 구매 크레딧도 없다면 요청이 실패한다.
- API rate limit 등 제한은 별도로 적용된다. 혜택은 변경·종료될 수 있다.

## 실무 활용과 판단
문서 분류·지식베이스 자동화, Agent PoC, Responses API 기반 워크플로 실험에 활용할 수 있다. 단, 정기적으로 크레딧이 발생하더라도 실제 청구액과 API 사용량을 별도 추적하고, 자동 충전 설정을 확인한다.

## 확인된 사실과 유의사항
공식 개발자 가이드 및 도움말에 명시된 요건을 기준으로 작성했다. 개인 계정의 자격 여부·실제 지급 여부는 확인하지 않았다. 이미지에 등장한 제3자 요약은 공식 약관보다 우선하지 않는다.

## 출처
- OpenAI 공식 개발자 문서: https://developers.openai.com/api/docs/guides/chatgpt-api-credits
- OpenAI Help Center: https://help.openai.com/en/articles/20001626-api-credits-benefit-for-eligible-chatgpt-subscriptions
- OpenAI Developer Community 발표 재게시: https://community.openai.com/t/claim-up-to-500-in-api-credits-using-your-chatgpt-pro-or-business-subscription/1410579

조사일: 2026-10-29
