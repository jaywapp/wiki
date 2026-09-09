import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
const dom=new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window=dom.window;
const { renderMarkdown }=await import('../src/markdown.js');
const render=markdown=>renderMarkdown({path:'guide/start.md',markdown},new Set(['guide/start.md','guide/next.md']), (path,hash='')=>`/?doc=${encodeURIComponent(path)}${hash}`);
test('renders GFM, highlighted code and unique Korean heading anchors',()=>{
  const {html,headings}=render('## 한글 제목\n\n## 한글 제목\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n```js\nconst x = 1;\n```');
  assert.match(html,/<table>/);assert.match(html,/hljs-keyword/);
  assert.deepEqual(headings.map(h=>h.id),['한글-제목','한글-제목-1']);
});
test('does not execute raw HTML or allow dangerous links',()=>{
  const {html}=render('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[bad](javascript:alert%281%29)\n\n![bad](data:text/html;base64,PHNjcmlwdD4=)');
  const root=new JSDOM(html).window.document;
  assert.equal(root.querySelectorAll('script,iframe,img,[onerror],a[href^="javascript:"]').length,0);
});
test('internal documents keep app navigation and external links are isolated',()=>{
  const {html}=render('[next](next.md#heading)\n\n[external](https://example.com)');
  const root=new JSDOM(html).window.document;
  assert.equal(root.querySelector('a[data-document]').getAttribute('data-document'),'guide/next.md');
  assert.match(root.querySelector('a[target]').getAttribute('rel'),/noopener/);
});
test('Mermaid is escaped until the strict lazy renderer processes it',()=>{
  const {html}=render('```mermaid\ngraph TD\nA-->B\n```');
  assert.match(html,/class="diagram-source"/);assert.match(html,/A--&gt;B/);
});
test('all synchronized public documents render without dropping the page',async()=>{
  const {documents}=JSON.parse(await readFile(new URL('../public/content.json',import.meta.url),'utf8'));
  const paths=new Set(documents.map(d=>d.path));
  assert.ok(documents.length>0);
  for(const doc of documents){
    const {html}=renderMarkdown(doc,paths,(path='',hash='')=>`/?doc=${encodeURIComponent(path)}${hash}`);
    assert.ok(html.length>0,doc.path);
  }
});
