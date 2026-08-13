# AI UI/UX 디자인 스킬 비교

정리 기준일: 2026-08-14

비교 대상:
- [Taste Skill](skills/taste-skill.md)
- [UI UX Pro Max](skills/ui-ux-pro-max.md)
- [Impeccable](skills/impeccable.md)

> 각 스킬의 상세 내용은 [`skills/`](skills/) 하위 개별 문서로 분리했다.

## 요약

세 프로젝트 모두 Claude Code, Codex 등 AI 코딩 에이전트의 UI/UX 결과물을 개선하지만 역할이 다르다.

| 스킬 | 핵심 역할 | 가장 잘 맞는 용도 | 상세 |
|---|---|---|---|
| Taste Skill | 디자인 미감과 Art Direction 강화 | AI 특유의 평범한 UI 제거 | [문서](skills/taste-skill.md) |
| UI UX Pro Max | 디자인 지식 검색 및 Design System 생성 | 제품별 디자인 방향과 일관성 확립 | [문서](skills/ui-ux-pro-max.md) |
| Impeccable | 설계-리뷰-감사-개선 워크플로 | 기존 UI 검수와 지속적인 품질 개선 | [문서](skills/impeccable.md) |

한 문장으로 정리하면 **Taste는 미감, UI UX Pro Max는 디자인 지식, Impeccable은 디자인 운영 체계**에 가깝다.

---

## 핵심 차이

### Taste = 어떤 감각으로 만들 것인가

시각적 결과가 AI스럽지 않도록 미감과 Art Direction을 강화한다. 새로운 UI를 만들 때 결과물의 개성을 높이는 데 가장 직접적이다.

→ [Taste Skill 상세](skills/taste-skill.md)

### UI UX Pro Max = 무엇을 어떤 디자인 시스템으로 만들 것인가

제품 특성을 기반으로 스타일, 색상, typography, UX 규칙을 결정하고 이를 지속 가능한 Design System으로 만든다.

→ [UI UX Pro Max 상세](skills/ui-ux-pro-max.md)

### Impeccable = 만든 결과물을 어떻게 검수하고 개선할 것인가

디자인 컨텍스트를 유지하면서 설계, critique, audit, polish를 반복하는 운영 프로세스에 강하다.

→ [Impeccable 상세](skills/impeccable.md)

---

## 선택 가이드

- **AI 디자인이 너무 평범하다** → [Taste Skill](skills/taste-skill.md)
- **프로젝트 전체 Design System이 필요하다** → [UI UX Pro Max](skills/ui-ux-pro-max.md)
- **기존 서비스 UI의 품질을 지속 관리한다** → [Impeccable](skills/impeccable.md)
- **WPF/WinUI 같은 Desktop UI까지 디자인 가이드가 필요하다** → [UI UX Pro Max](skills/ui-ux-pro-max.md)
- **이미지 reference → code 흐름이 필요하다** → [Taste Skill](skills/taste-skill.md)
- **자동 design audit가 중요하다** → [Impeccable](skills/impeccable.md)

---

## 세 가지를 함께 사용하는 방법

세 스킬은 완전히 대체 관계가 아니므로 단계별 역할을 분리하면 같이 사용할 수 있다.

1. **[UI UX Pro Max](skills/ui-ux-pro-max.md)**로 제품에 맞는 Design System을 결정한다.
2. **[Taste Skill](skills/taste-skill.md)**로 초기 구현의 Art Direction과 시각적 개성을 강화한다.
3. **[Impeccable](skills/impeccable.md)**로 critique, audit, polish, harden을 수행한다.

즉 다음처럼 볼 수 있다.

> UI UX Pro Max = 디자인 방향과 시스템
>
> Taste = 미감과 Art Direction
>
> Impeccable = 검수와 반복 개선

다만 세 스킬 모두 디자인 규칙에 개입하므로 동시에 모든 지침을 무조건 적용하기보다는 각 단계의 역할을 분리해서 사용하는 편이 충돌과 컨텍스트 증가를 줄이기 좋다.

## 출처

- Taste Skill GitHub: https://github.com/Leonxlnx/taste-skill
- Taste Skill Docs: https://www.tasteskill.dev/docs
- UI UX Pro Max GitHub: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Impeccable GitHub: https://github.com/pbakaus/impeccable
- Impeccable Website: https://impeccable.style/
