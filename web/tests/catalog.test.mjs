import test from 'node:test';
import assert from 'node:assert/strict';
import { filterDocuments, createTree, resolveDocumentLink, escapeHtml } from '../src/catalog.js';
const documents=[
  {path:'ai/skills/a.md',title:'한글 검색',text:'WPF and System.IO',tags:['개발'],updated:'2026-08-01'},
  {path:'ai/b.md',title:'Alpha',text:'한글 자료',tags:['AI'],updated:'2026-09-01'},
  {path:'git/c.md',title:'Git guide',text:'한글 검색 Git',tags:['개발'],updated:'2026-07-01'}
];
test('Korean and case-insensitive body search combines terms, folder and tag',()=>{
  assert.deepEqual(filterDocuments(documents,{query:'한글 system.io',folder:'ai',tag:'개발'}).map(d=>d.path),['ai/skills/a.md']);
  assert.equal(filterDocuments(documents,{query:'not found'}).length,0);
  assert.equal(filterDocuments(documents,{folder:'a'}).length,0);
});
test('date, title and relevance order are stable',()=>{
  assert.equal(filterDocuments(documents,{sort:'new'})[0].path,'ai/b.md');
  assert.equal(filterDocuments(documents,{sort:'old'})[0].path,'git/c.md');
  assert.equal(filterDocuments(documents,{query:'검색',sort:'relevance'})[0].path,'ai/skills/a.md');
  assert.equal(filterDocuments(documents,{sort:'title'}).length,3);
});
test('tree preserves ancestors and filtered document order',()=>{
  const root=createTree(filterDocuments(documents,{folder:'ai'}));
  assert.equal(root.folders.size,1);
  assert.equal(root.folders.get('ai').folders.get('skills').documents[0].path,'ai/skills/a.md');
});
test('document links resolve relative paths, directories, Korean names and known aliases',()=>{
  const paths=new Set(['ai/skills/a.md','ai/README.md','한글.md']);
  assert.deepEqual(resolveDocumentLink('../skills/a.md#section','ai/tips/x.md',paths),{path:'ai/skills/a.md',hash:'#section'});
  assert.equal(resolveDocumentLink('/ai/','README.md',paths).path,'ai/README.md');
  assert.equal(resolveDocumentLink('ax/ai/skills/a.md','README.md',paths).path,'ai/skills/a.md');
  assert.equal(resolveDocumentLink('%ED%95%9C%EA%B8%80.md','README.md',paths).path,'한글.md');
  assert.equal(resolveDocumentLink('javascript:alert(1)','README.md',paths),null);
  assert.equal(resolveDocumentLink('//evil.test','README.md',paths),null);
  assert.equal(resolveDocumentLink('%zz','README.md',paths),null);
});
test('text and attributes are HTML escaped',()=>assert.equal(escapeHtml('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;'));
test('historic moves and directory links stay inside the catalog',()=>{
  const paths=new Set(['ai/tips/token-optimization-claude-codex.md','ai/skills/a.md']);
  assert.equal(resolveDocumentLink('ai-workflow/token-optimization-claude-codex.md','SUMMARY.md',paths).path,'ai/tips/token-optimization-claude-codex.md');
  assert.equal(resolveDocumentLink('ax/ai/tips/','README.md',paths).folder,'ai/tips');
  assert.equal(resolveDocumentLink('skills/a.md','ai/skills/b.md',paths).path,'ai/skills/a.md');
});
