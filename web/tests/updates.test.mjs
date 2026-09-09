import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUpdates, isDailySummary } from '../src/updates-model.js';

test('updates sort by date and preserve document links and body', () => {
  const entries = parseUpdates('# Wiki Daily Summary\n\n## 2026-08-20\n\n[Read](./ax/example.md)\n\n## 2026-09-01\n\n### New document\n\n설명입니다.\n');
  assert.deepEqual(entries.map(entry => entry.date), ['2026-09-01', '2026-08-20']);
  assert.match(entries[1].markdown, /\[Read\]\(\.\/ax\/example.md\)/);
  assert.match(entries[0].markdown, /설명입니다/);
});

test('code blocks and nested headings cannot create update dates', () => {
  const entries = parseUpdates('## 2026-08-20\n\n```md\n## 2099-01-01\n```\n\n> ## 2098-01-01\n\n### 2097-01-01\n');
  assert.equal(entries.length, 1);
  assert.match(entries[0].markdown, /2099-01-01/);
  assert.deepEqual(parseUpdates('No dated updates'), []);
});

test('only root daily summary is excluded from the catalog', () => {
  assert.equal(isDailySummary({ path: 'SUMMARY.md' }), true);
  assert.equal(isDailySummary({ path: 'docs/SUMMARY.md' }), false);
});
