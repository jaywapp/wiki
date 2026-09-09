import test from 'node:test';
import assert from 'node:assert/strict';
import { filterDocuments } from '../src/catalog.js';
import { parsePreferences } from '../src/preferences.js';

test('corrupt, empty and non-object preferences use safe defaults', () => {
  for (const value of [null, '', '{', 'null', '[]', '1', 'true', '"text"']) {
    assert.deepEqual(parsePreferences(value), {});
  }
  assert.deepEqual(parsePreferences('{"sort":"old","view":"tree"}'), {sort:'old',view:'tree'});
});

const documents = [
  {path:'a/10.md',title:'문서 10',text:'needle',tags:[],updated:'invalid'},
  {path:'a/2.md',title:'문서 2',text:'',tags:['needle'],updated:'2026-01-01'},
  {path:'a/1.md',title:'문서 2',text:'',tags:[],updated:'2026-01-01'},
];
test('numeric Korean sort and path ties preserve existing order', () => {
  const paths = sort => filterDocuments(documents,{sort}).map(doc=>doc.path);
  assert.deepEqual(paths('title'), ['a/1.md','a/2.md','a/10.md']);
  assert.deepEqual(paths('reverse'), ['a/10.md','a/1.md','a/2.md']);
  assert.deepEqual(paths('new'), ['a/1.md','a/2.md','a/10.md']);
  assert.deepEqual(paths('old'), ['a/10.md','a/1.md','a/2.md']);
  assert.deepEqual(paths('relevance'), ['a/1.md','a/2.md','a/10.md']);
  assert.deepEqual(filterDocuments(documents,{query:'needle',sort:'relevance'}).map(doc=>doc.path), ['a/2.md','a/10.md']);
});
test('empty query avoids reading large body text and does not mutate input', () => {
  const doc = {path:'a',title:'A',tags:[],updated:null,get text(){throw new Error('Body was unnecessarily read');}};
  const input=Object.freeze([Object.freeze(doc)]);
  assert.deepEqual(filterDocuments(input),[doc]);
  assert.deepEqual(filterDocuments([], {query:'anything'}),[]);
});
