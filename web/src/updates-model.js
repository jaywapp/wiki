import { lexer } from 'marked';

export const isDailySummary = doc => doc.path === 'SUMMARY.md';

export function parseUpdates(markdown) {
  const entries = [];
  let current;
  for (const token of lexer(markdown || '')) {
    const date = token.type === 'heading' && token.depth === 2 && /^\d{4}-\d{2}-\d{2}$/.test(token.text.trim()) ? token.text.trim() : null;
    if (date) {
      current = { date, markdown: '' };
      entries.push(current);
    } else if (current && !(token.type === 'html' && token.raw.trim().startsWith('<!--'))) {
      current.markdown += token.raw;
    }
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}
