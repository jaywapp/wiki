import '@fontsource-variable/noto-sans-kr';
import 'highlight.js/styles/github-dark.css';
import './style.css';
import { escapeHtml as e, filterDocuments, createTree } from './catalog.js';
import { renderMarkdown, enhanceDiagrams } from './markdown.js';
import { parsePreferences } from './preferences.js';
import { isDailySummary } from './updates-model.js';
import { renderUpdates } from './updates.js';

const app=document.getElementById('app');
let dataset,documents=[],paths,state,filtered=[],readerVersion=0,visibleCount=50;
const closedFolders=new Set();
const $=id=>document.getElementById(id);
const formatDate=date=>date&&Number.isFinite(Date.parse(date))?new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date)):'날짜 없음';
const folderOf=path=>path.includes('/')?path.split('/')[0]:'루트';
function loadPreferences(){try{return parsePreferences(localStorage.getItem('wiki-preferences'));}catch{return {};}}
function readState(){
  const params=new URLSearchParams(location.search),preferences=loadPreferences();
  const sort=params.get('sort')||preferences.sort||'new';
  return {query:params.get('q')||'',folder:params.get('folder')||'',tag:params.get('tag')||'',sort:['new','old','title','reverse','relevance'].includes(sort)?sort:'new',view:(params.get('view')||preferences.view)==='tree'?'tree':'list',document:params.get('doc')||(documents.find(d=>d.path==='README.md')||documents[0]).path,reading:params.has('doc')&&params.get('pane')!=='browse'};
}
function urlFor(path=state.document,hash=''){
  const url=new URL(location.href);url.search='';url.hash=hash;
  const params=url.searchParams;
  if(path)params.set('doc',path);
  if(state.query)params.set('q',state.query);
  if(state.folder)params.set('folder',state.folder);
  if(state.tag)params.set('tag',state.tag);
  params.set('view',state.view);params.set('sort',state.sort);
  return url.pathname+url.search+url.hash;
}
function saveState(push=false,hash=''){
  const url=new URL(urlFor(state.document,hash),location.origin);
  if(!state.reading)url.searchParams.set('pane','browse');
  history[push?'pushState':'replaceState']({},'',url.pathname+url.search+url.hash);
  try{localStorage.setItem('wiki-preferences',JSON.stringify({view:state.view,sort:state.sort}));}catch{}
}
function showReading(reading){
  state.reading=reading;document.body.classList.toggle('is-reading',reading);
  $('browse-tab').setAttribute('aria-pressed',String(!reading));$('read-tab').setAttribute('aria-pressed',String(reading));
  if(matchMedia('(max-width:800px)').matches)window.scrollTo({top:0,behavior:'instant'});
}
function skeleton(){
  app.innerHTML=`<header class="topbar"><a class="brand" href="/">jaywapp<span> / wiki</span></a><nav aria-label="사이트"><a href="https://github.com/jaywapp/wiki" target="_blank" rel="noopener noreferrer">GitHub 원본</a></nav></header><main class="workspace"><aside class="sidebar" aria-label="문서 분류"><h2>라이브러리</h2><div id="categories"></div><p class="sync-note">${e(documents.length)}개 문서<br>수집 ${e(formatDate(dataset.generatedAt))}</p></aside><section class="collection" aria-label="문서 탐색"><h1>자료 카탈로그</h1><p class="intro">개발의 기록을 찾고, 다시 꺼내 읽으세요.</p><label class="field-label" for="search">문서 검색</label><div class="search-wrap"><input type="search" id="search" placeholder="제목, 본문, 경로, 태그 검색" autocomplete="off"><kbd>/</kbd></div><div class="toolbar"><div class="views" aria-label="보기 방식"><button id="tree-view" type="button">트리뷰</button><button id="list-view" type="button">리스트뷰</button></div><div class="controls"><label>폴더<select id="folder-filter" aria-label="폴더"><option value="">모든 폴더</option></select></label><label>태그<select id="tag-filter" aria-label="태그"><option value="">모든 태그</option></select></label><label>정렬<select id="sort" aria-label="정렬"><option value="new">최신 수정순</option><option value="old">오래된순</option><option value="title">제목 오름차순</option><option value="reverse">제목 내림차순</option><option value="relevance">검색 관련도순</option></select></label></div></div><div class="result-bar"><span id="result-count" role="status" aria-live="polite"></span><button id="reset" class="quiet">조건 초기화</button></div><div class="list-header" aria-hidden="true"><span>문서</span><span>경로</span><span>분류 · 수정일</span></div><div id="results"></div><button id="more" class="load-more" hidden>문서 더 보기</button></section><article id="reader" class="reader" tabindex="-1" aria-label="선택한 문서"></article></main><nav class="mobile-navigation" aria-label="모바일 문서 이동"><button id="browse-tab" type="button">문서 탐색</button><button id="read-tab" type="button">본문 읽기</button></nav><div id="announcement" class="sr-only" role="status" aria-live="polite"></div>`;
  const folders=new Set();
  for(const doc of documents){const parts=doc.path.split('/').slice(0,-1);parts.forEach((_,i)=>folders.add(parts.slice(0,i+1).join('/')));}
  [...folders].sort().forEach(folder=>$('folder-filter').add(new Option(folder,folder)));
  [...new Set(documents.flatMap(doc=>doc.tags))].sort((a,b)=>a.localeCompare(b,'ko')).forEach(tag=>$('tag-filter').add(new Option(tag,tag)));
  if(state.folder&&!folders.has(state.folder))$('folder-filter').add(new Option(state.folder,state.folder));
  if(state.tag&&![...$('tag-filter').options].some(o=>o.value===state.tag))$('tag-filter').add(new Option(state.tag,state.tag));
  document.querySelector('.topbar nav').insertAdjacentHTML('afterbegin','<a href="/" aria-current="page">자료실</a><a href="/?page=updates">업데이트</a>');
  document.querySelector('.topbar nav').classList.add('site-pages');
  bindEvents();syncControls();renderCategories();renderResults();renderReader();showReading(state.reading);
}
function syncControls(){ $('search').value=state.query;$('folder-filter').value=state.folder;$('tag-filter').value=state.tag;$('sort').value=state.sort; }
function renderCategories(){
  const groups=[...new Set(documents.map(d=>folderOf(d.path)))].filter(f=>f!=='루트').sort();
  $('categories').innerHTML=[['','전체 문서',documents.length],...groups.map(folder=>[folder,folder,documents.filter(d=>d.path.startsWith(folder+'/')).length])].map(([folder,name,count])=>`<button type="button" class="category" data-folder="${e(folder)}" aria-pressed="${folder===state.folder}"><span>${e(name)}</span><small>${count}</small></button>`).join('');
}
function rowTags(doc){
  const tags=Array.isArray(doc.tags)?doc.tags.filter(Boolean):[];
  if(!tags.length)return '';
  const visible=tags.slice(0,4);
  return `<span class="row-tags" aria-label="태그">${visible.map(tag=>`<span class="row-tag">#${e(tag)}</span>`).join('')}${tags.length>visible.length?`<span class="row-tag-more">+${tags.length-visible.length}</span>`:''}</span>`;
}
function rowDescription(doc){
  const description=String(doc.description||'').replace(/^\s*(?:>\s*)+/,'').replace(/\s+/g,' ').trim();
  if(!description||description===String(doc.title||'').trim())return '';
  return `<span class="document-description">${e(description)}</span>`;
}
function row(doc){
  const match=state.document===doc.path;
  return `<a class="document-row${match?' current':''}" href="${e(urlFor(doc.path))}" data-document="${e(doc.path)}"${match?' aria-current="page"':''}><span class="document-name"><strong>${e(doc.title)}</strong>${rowTags(doc)}${rowDescription(doc)}${state.query?`<span class="excerpt">${e(excerpt(doc))}</span>`:''}</span><span class="document-path">${e(doc.path)}</span><span class="document-meta"><span>${e(doc.category||folderOf(doc.path))}</span><time datetime="${e(doc.updated||'')}">${e(formatDate(doc.updated))}</time></span></a>`;
}
function excerpt(doc){
  const text=doc.text.replace(/\s+/g,' '),first=state.query.trim().split(/\s+/)[0],index=text.toLowerCase().indexOf(first.toLowerCase());
  const start=Math.max(0,index-35);return (start?'… ':'')+text.slice(start,start+150)+(text.length>start+150?' …':'');
}
function renderResults(){
  filtered=filterDocuments(documents,state);
  $('result-count').textContent=`${filtered.length}개 문서${state.query?' · “'+state.query+'”':''}${state.folder?' · '+state.folder:''}${state.tag?' · #'+state.tag:''}`;
  $('tree-view').setAttribute('aria-pressed',String(state.view==='tree'));$('list-view').setAttribute('aria-pressed',String(state.view==='list'));
  document.querySelector('.list-header').hidden=state.view==='tree';
  $('more').hidden=state.view==='tree'||filtered.length<=visibleCount;
  if(!filtered.length){$('results').innerHTML='<div class="empty-state"><h2>일치하는 문서가 없습니다</h2><p>검색어를 줄이거나 폴더·태그 조건을 초기화해 보세요.</p></div>';return;}
  if(state.view==='list'){$('results').innerHTML=filtered.slice(0,visibleCount).map(row).join('');return;}
  const tree=createTree(filtered);
  function branch(node,prefix=''){
    return [...node.folders].sort(([a],[b])=>a.localeCompare(b,'ko')).map(([name,child])=>{
      const path=prefix?prefix+'/'+name:name;
      return `<details class="tree-folder" data-folder-path="${e(path)}"${!closedFolders.has(path)||state.query?' open':''}><summary>${e(name)}</summary><div class="tree-children">${branch(child,path)}</div></details>`;
    }).join('')+node.documents.map(row).join('');
  }
  $('results').innerHTML=branch(tree);
}
function renderReader(anchor=''){
  const version=++readerVersion,doc=documents.find(d=>d.path===state.document);
  if(!doc){$('reader').innerHTML='<div class="empty-state"><h1>문서를 찾을 수 없습니다</h1><p>문서가 이동하거나 삭제되었을 수 있습니다. 문서 탐색에서 다시 찾아보세요.</p></div>';document.title='문서를 찾을 수 없습니다 · wiki';return;}
  document.title=`${doc.title} · jaywapp wiki`;
  const {html,headings}=renderMarkdown(doc,paths,urlFor);
  const toc=headings.filter(h=>h.depth===2||h.depth===3);
  const readMinutes=Math.max(1,Math.ceil(doc.text.length/650));
  $('reader').innerHTML=`<div class="reader-tools"><span class="breadcrumb">${e(doc.path)}</span><div><button id="copy-link" class="quiet">링크 복사</button><a href="${e(doc.sourceUrl)}" target="_blank" rel="noopener noreferrer">원문</a></div></div><h1 class="document-title">${e(doc.title)}</h1><div class="article-meta"><span>${e(doc.category||folderOf(doc.path))}</span><span>수정 ${e(formatDate(doc.updated))}</span><span>약 ${readMinutes}분</span></div>${doc.tags.length?`<div class="document-tags">${doc.tags.map(tag=>`<button class="tag" data-tag="${e(tag)}">#${e(tag)}</button>`).join('')}</div>`:''}${toc.length?`<details class="toc"><summary>이 문서의 목차 · ${toc.length}</summary><nav aria-label="문서 목차">${toc.map(h=>`<a href="${e(urlFor(doc.path,'#'+encodeURIComponent(h.id)))}" data-anchor="#${e(encodeURIComponent(h.id))}" data-document="${e(doc.path)}" class="depth-${h.depth}">${e(h.text)}</a>`).join('')}</nav></details>`:''}<div class="markdown-body">${html}</div><footer class="reader-footer">GitHub에 기록한 지식 · <a href="${e(doc.sourceUrl)}" target="_blank" rel="noopener noreferrer">원문에서 변경 이력 확인</a></footer>`;
  const firstHeading=$('reader').querySelector('.markdown-body > h1');
  if(firstHeading&&firstHeading.textContent.trim()===doc.title.trim())firstHeading.classList.add('original-title');
  enhanceDiagrams($('reader'),()=>readerVersion===version);
  if(anchor)scrollAnchor(anchor);
}
function scrollAnchor(anchor){
  let id;try{id=decodeURIComponent(anchor.replace(/^#/,''));}catch{return;}
  requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({block:'start'}));
}
function selectDocument(path,anchor=''){
  if(path==='SUMMARY.md'){location.href='/?page=updates'+anchor;return;}
  const changed=state.document!==path;state.document=path;showReading(true);saveState(true,anchor);
  if(changed)renderReader(anchor);else if(anchor)scrollAnchor(anchor);
  renderResults();
  if(!anchor){$('reader').scrollIntoView({block:'start',behavior:'instant'});$('reader').focus({preventScroll:true});}
}
function updateResults(){visibleCount=50;saveState();renderCategories();renderResults();}
function bindEvents(){
  $('search').addEventListener('input',()=>{state.query=$('search').value;updateResults();});
  $('folder-filter').addEventListener('change',()=>{state.folder=$('folder-filter').value;updateResults();});
  $('tag-filter').addEventListener('change',()=>{state.tag=$('tag-filter').value;updateResults();});
  $('sort').addEventListener('change',()=>{state.sort=$('sort').value;updateResults();});
  for(const view of ['tree','list'])$(view+'-view').addEventListener('click',()=>{state.view=view;updateResults();});
  $('reset').addEventListener('click',()=>{state.query='';state.folder='';state.tag='';state.sort='new';syncControls();updateResults();});
  $('more').addEventListener('click',()=>{visibleCount+=50;renderResults();});
  $('categories').addEventListener('click',event=>{const button=event.target.closest('[data-folder]');if(button){state.folder=button.dataset.folder;syncControls();updateResults();}});
  $('results').addEventListener('toggle',event=>{const path=event.target.dataset.folderPath;if(path){if(event.target.open)closedFolders.delete(path);else closedFolders.add(path);}},true);
  $('browse-tab').addEventListener('click',()=>{showReading(false);saveState();});
  $('read-tab').addEventListener('click',()=>{showReading(true);saveState();});
  app.addEventListener('click',async event=>{
    const link=event.target.closest('a[data-document]');
    if(link&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&event.button===0){event.preventDefault();selectDocument(link.dataset.document,link.dataset.anchor||'');}
    const folderLink=event.target.closest('a[data-folder-target]');
    if(folderLink&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&event.button===0){event.preventDefault();state.folder=folderLink.dataset.folderTarget;state.query='';state.tag='';showReading(false);syncControls();updateResults();document.querySelector('.collection').scrollIntoView({block:'start'});}
    const tag=event.target.closest('[data-tag]');if(tag){state.tag=tag.dataset.tag;showReading(false);syncControls();updateResults();}
    if(event.target.closest('#copy-link')){
      try{await navigator.clipboard.writeText(new URL(urlFor(),location.origin).href);$('announcement').textContent='문서 링크를 복사했습니다.';$('copy-link').textContent='복사됨';}
      catch{$('announcement').textContent='복사하지 못했습니다. 브라우저 주소를 복사해 주세요.';$('copy-link').textContent='주소창에서 복사';}
    }
  });
}
window.addEventListener('popstate',()=>{if(!state)return;state=readState();visibleCount=50;syncControls();renderCategories();renderResults();showReading(state.reading);renderReader(location.hash);});
window.addEventListener('keydown',event=>{
  if(state&&event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)&&!event.target.isContentEditable){event.preventDefault();showReading(false);$('search').focus();}
});
async function start(){
  try{
    const response=await fetch('/content.json');if(!response.ok)throw new Error('Content unavailable');
    dataset=await response.json();documents=dataset.documents;
    if(!Array.isArray(documents)||!documents.length)throw new Error('Empty catalog');
    const params=new URLSearchParams(location.search);
    if(params.get('page')==='updates'||params.get('doc')==='SUMMARY.md'){renderUpdates(dataset,app);return;}
    paths=new Set(documents.map(d=>d.path));documents=documents.filter(doc=>!isDailySummary(doc));state=readState();skeleton();if(location.hash)scrollAnchor(location.hash);
  }catch{
    app.innerHTML='<div class="loading-page"><h1>문서를 불러오지 못했습니다</h1><p>연결 상태를 확인하고 다시 시도해 주세요.</p><button id="retry">다시 시도</button><p><a href="https://github.com/jaywapp/wiki">GitHub에서 원문 보기</a></p></div>';$('retry').onclick=()=>location.reload();
  }
}
start();
