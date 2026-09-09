import { escapeHtml as e } from './catalog.js';
import { renderMarkdown, enhanceDiagrams } from './markdown.js';
import { isDailySummary, parseUpdates } from './updates-model.js';

export function renderUpdates(dataset, app) {
  document.title = '업데이트 · jaywapp wiki';
  document.body.classList.add('updates-view');
  const doc = dataset.documents.find(isDailySummary);
  const paths = new Set(dataset.documents.map(item => item.path));
  const entries = parseUpdates(doc?.markdown);
  const makeUrl = (path, hash = '') => path === 'SUMMARY.md' ? `/?page=updates${hash}` : `/?doc=${encodeURIComponent(path || 'README.md')}${hash}`;
  const content = entry => {
    const { html } = renderMarkdown({ ...doc, markdown: entry.markdown }, paths, makeUrl);
    return html.replace(/id="([^"]+)"/g, (_, id) => `id="${entry.date}-${id}"`);
  };
  app.innerHTML = `<header class="topbar"><a class="brand" href="/">jaywapp<span> / wiki</span></a><nav class="site-pages" aria-label="사이트"><a href="/">자료실</a><a href="/?page=updates" aria-current="page">업데이트</a></nav></header>
    <main class="updates-layout" id="reader" tabindex="-1"><header class="updates-heading"><h1>업데이트</h1><p class="intro">날짜별로 모아 보는 새로운 자료와 변경 기록.</p>${doc ? `<a href="${e(doc.sourceUrl)}" target="_blank" rel="noopener noreferrer">GitHub 원문</a>` : ''}</header>
    ${entries.length ? `<nav class="update-dates" aria-label="업데이트 날짜">${entries.map(entry => `<a href="#${e(entry.date)}">${e(entry.date)}</a>`).join('')}</nav><div class="update-feed">${entries.map(entry => `<section class="update-entry" aria-labelledby="${e(entry.date)}"><h2 id="${e(entry.date)}"><a href="#${e(entry.date)}"><time datetime="${e(entry.date)}">${e(entry.date)}</time></a></h2><div class="markdown-body">${content(entry)}</div></section>`).join('')}</div>` : doc ? `<div class="markdown-body">${renderMarkdown(doc, paths, makeUrl).html}</div>` : '<p class="empty-state">아직 업데이트 기록이 없습니다. <a href="/">자료실 둘러보기</a></p>'}</main>`;
  enhanceDiagrams(app, () => true);
  if (location.hash) {
    try { requestAnimationFrame(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView()); } catch {}
  }
}
