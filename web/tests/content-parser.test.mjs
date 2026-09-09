import assert from "node:assert/strict";
import test from "node:test";

import {
  markdownToPlainText,
  parseDocument,
  selectUpdated,
  shouldIncludeDocument,
} from "../scripts/content.mjs";

test("parses YAML metadata and preserves searchable body text", () => {
  const markdown = `---
title: 명시된 제목
category: 도구
tags:
  - Git
  - Windows
updated: 2024-01-02
---
# 무시되는 제목

[공식 문서](https://example.com)를 참고합니다. 다음 문장입니다.

\`git fetch\`를 실행합니다.
`;
  const document = parseDocument({
    filePath: "tools/git-guide.md",
    markdown,
    gitTimestamp: "2026-08-20T12:34:56+09:00",
    commit: "abc123",
    repository: "jaywapp/wiki",
    branch: "develop",
  });

  assert.equal(document.id, "tools/git-guide.md");
  assert.equal(document.title, "명시된 제목");
  assert.equal(document.category, "도구");
  assert.deepEqual(document.tags, ["Git", "Windows"]);
  assert.equal(document.updated, "2026-08-20T03:34:56.000Z");
  assert.equal(document.description, "공식 문서를 참고합니다.");
  assert.doesNotMatch(document.markdown, /^---/);
  assert.doesNotMatch(document.markdown, /title: 명시된 제목/);
  assert.match(document.markdown, /^# 무시되는 제목/);
  assert.match(document.text, /공식 문서를 참고합니다/);
  assert.match(document.text, /git fetch를 실행합니다/);
  assert.equal(document.sourceUrl, "https://github.com/jaywapp/wiki/blob/abc123/tools/git-guide.md");
});

test("falls back to the first H1, direct parent folder, and filename", () => {
  const fromHeading = parseDocument({
    filePath: "dotnet/wpf/setup.markdown",
    markdown: "# WPF 설정\n\n설정 방법입니다.",
    gitTimestamp: "2026-01-01T00:00:00Z",
    commit: "def456",
    repository: "jaywapp/wiki",
    branch: "develop",
  });
  const fromFilename = parseDocument({
    filePath: "README.md",
    markdown: "본문만 있습니다.",
    gitTimestamp: "2026-01-01T00:00:00Z",
    commit: "def456",
    repository: "jaywapp/wiki",
    branch: "develop",
  });

  assert.equal(fromHeading.title, "WPF 설정");
  assert.equal(fromHeading.category, "wpf");
  assert.equal(fromFilename.title, "README");
  assert.equal(fromFilename.category, "root");
});

test("includes public Markdown and excludes source, instruction, hidden, generated, and sensitive paths", () => {
  for (const filePath of ["README.md", "SUMMARY.markdown", "docs/guide.md", "nested/web-guide.md"]) {
    assert.equal(shouldIncludeDocument(filePath), true, filePath);
  }
  for (const filePath of [
    "AGENTS.md",
    "nested/CLAUDE.md",
    ".github/README.md",
    "docs/.draft/note.md",
    "node_modules/pkg/README.md",
    "docs/ux-concepts/wiki-reader/readme.md",
    "web/README.md",
    "secrets.md",
    "private-keys/service.md",
    "notes.txt",
  ]) {
    assert.equal(shouldIncludeDocument(filePath), false, filePath);
  }
});

test("uses Git timestamp first and valid frontmatter date only as fallback", () => {
  assert.equal(
    selectUpdated("2026-09-08T10:00:00+09:00", "2020-01-01"),
    "2026-09-08T01:00:00.000Z"
  );
  assert.equal(selectUpdated("", "2024-05-06"), "2024-05-06T00:00:00.000Z");
  assert.equal(selectUpdated("invalid", "also invalid"), null);
});

test("plain text removes Markdown syntax without dropping useful words", () => {
  const text = markdownToPlainText("## 제목\n\n- **굵게**\n- [링크](https://example.com)\n\n| A | B |\n|---|---|\n| 값 | 둘 |");
  assert.equal(text, "제목 굵게 링크 A B 값 둘");
});

test("description removes blockquote and list markers", () => {
  const document = parseDocument({
    filePath: "notes/summary.md",
    markdown: "> 한글 요약입니다.\n\n- 다음 내용입니다.",
    gitTimestamp: "2026-01-01T00:00:00Z",
    commit: "abc123",
    repository: "jaywapp/wiki",
    branch: "develop",
  });
  assert.equal(document.description, "한글 요약입니다.");
});
