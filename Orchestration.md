---
title: Wiki Global Classification Policy
category: governance
tags: [wiki, classification, orchestration]
source: https://github.com/jaywapp/wiki
updated: 2026-11-04
---

# Global Orchestration

## Scope and precedence
This policy chooses the top-level domain for knowledge documents. Domain-specific `{domain}/Orchestration.md` controls finer classification when present. The publishing procedure is [GitHub Document Publishing](ai/skills/github-document-publishing.md). Preserve existing paths; do not bulk-migrate.

## Domain selection
Classify by the main subject and purpose, not input format:
- `ai/`: AI models, agents, harnesses, AI tools and AI-specific research; follow [AI policy](ai/Orchestration.md).
- `development/`: general programming, application development, full-stack deployment recipes, APIs and development practices.
- `architecture/`: system architecture and cross-component design.
- `design/`: visual design, UI/UX and references.
- `github/` and `git/`: GitHub platform workflows and Git concepts, respectively.
- `nextjs/`, `dotnet/`, `teamcity/`: material primarily about the named ecosystem.
- `idea/`: user-proposed ideas, hypotheses and planning notes, not verified technology guides.
- `deep-research/`: broad multi-source research whose primary purpose is research synthesis.
- `soccer/`: football subjects.
- `docs/`: repository/project operational documentation, not general knowledge articles.
- Other existing domains retain their current subject boundary as established by existing content and local policy.

## Publishing decisions
Search existing titles, aliases and source URLs before writing. Prefer updating an existing article over duplicating it. Use kebab-case Markdown filenames, front matter with title/category/tags/source/updated, factual citations and an explicit verification date. New domain or category creation requires documented rationale and consistent README/policy updates. Never claim publication without read-back on `develop`.
