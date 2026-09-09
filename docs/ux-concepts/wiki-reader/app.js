const docs = window.sampleDocuments;
const mode = document.body.dataset.mode;
const titles = {explorer:['문서 탐색','폴더를 따라 찾고, 바로 옆에서 읽으세요.'],notebook:['나의 읽기 목록','다시 꺼내 읽는 개발의 기록.'],catalog:['자료 카탈로그','분류와 정렬로 필요한 자료를 좁혀보세요.']};
let category = '전체 문서', view = mode === 'explorer' ? 'tree' : 'list', selected = docs[0].id;
document.body.innerHTML = `<a class="skip" href="#reader">본문으로 건너뛰기</a><header class="topbar"><a class="brand" href="../index.html">jaywapp<span> / wiki</span></a><nav class="toplinks" aria-label="사이트"><a href="../index.html">콘셉트 비교</a><a href="https://github.com/jaywapp/wiki" target="_blank" rel="noopener noreferrer">GitHub 원본</a></nav></header><p class="sample-note">화면 시안 · 공통 예시 문서 6개 · 본문은 요약 시연이며 날짜는 예시입니다.</p><main class="workspace"><aside class="sidebar" aria-label="문서 분류"><h2>라이브러리</h2><div id="categories"></div><p class="side-note">흩어져 있던 기록을<br>다시 쓸 수 있는 지식으로.</p></aside><section class="collection" aria-label="문서 탐색"><h1>${titles[mode][0]}</h1><p class="collection-intro">${titles[mode][1]}</p><label class="search-label" for="search">문서 검색</label><input class="search" id="search" type="search" placeholder="제목, 본문, 경로 검색" autocomplete="off"><div class="toolbar"><div class="view-switch" aria-label="보기 방식"><button id="tree">트리뷰</button><button id="list">리스트뷰</button></div><div class="sort-wrap"><label for="sort">정렬</label><select id="sort"><option value="new">최신순</option><option value="old">오래된순</option><option value="az">제목순 A–Z</option><option value="za">제목순 Z–A</option></select></div></div><div class="result-status"><span id="count" role="status" aria-live="polite"></span><button class="reset" id="reset">조건 초기화</button></div><div id="results"></div></section><article class="reader" id="reader" tabindex="-1" aria-label="선택한 문서"></article></main>`;
const $ = id => document.getElementById(id);
const normalize = text => text.normalize('NFKC').toLocaleLowerCase();
function renderCategories(){
  $('categories').replaceChildren();
  ['전체 문서',...new Set(docs.map(d=>d.category))].forEach(name=>{
    const button=document.createElement('button');button.className='category';button.setAttribute('aria-pressed',String(name===category));
    const label=document.createElement('b');label.style.fontWeight='500';label.textContent=name;
    const count=document.createElement('span');count.textContent=name==='전체 문서'?docs.length:docs.filter(d=>d.category===name).length;
    button.append(label,count);button.onclick=()=>{category=name;renderCategories();renderResults()};$('categories').append(button);
  });
  if(mode==='notebook') $('categories').style.display='contents';
}
function resultButton(d){
  const button=document.createElement('button');button.className='result'+(d.id===selected?' current':'');button.setAttribute('aria-pressed',String(d.id===selected));
  button.innerHTML=`<span><strong>${d.title}</strong><span class="desc">${d.description}</span></span><span class="result-path">${d.path}</span><span class="meta"><span>${d.category}</span><time datetime="${d.date}">${d.date.replaceAll('-','. ')}</time></span>`;
  button.onclick=()=>{selected=d.id;renderReader();renderResults();if(matchMedia('(max-width:800px)').matches)$('reader').scrollIntoView({behavior:'instant',block:'start'});$('reader').focus({preventScroll:true})};return button;
}
function renderResults(){
  const terms=normalize($('search').value.trim()).split(/\s+/).filter(Boolean);
  const filtered=docs.filter(d=>(category==='전체 문서'||d.category===category)&&terms.every(t=>normalize(`${d.title} ${d.path} ${d.description} ${d.body.replace(/<[^>]*>/g,' ')}`).includes(t)));
  const sort=$('sort').value;filtered.sort((a,b)=>(sort==='az'?a.title.localeCompare(b.title,'ko'):sort==='za'?b.title.localeCompare(a.title,'ko'):sort==='old'?a.date.localeCompare(b.date):b.date.localeCompare(a.date))||a.path.localeCompare(b.path));
  $('count').textContent=`${filtered.length}개 문서 · ${category}`;$('tree').setAttribute('aria-pressed',String(view==='tree'));$('list').setAttribute('aria-pressed',String(view==='list'));$('results').replaceChildren();
  if(!filtered.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='일치하는 문서가 없습니다. 다른 검색어를 입력하거나 조건을 초기화하세요.';$('results').append(empty);return;}
  if(view==='list'){filtered.forEach(d=>$('results').append(resultButton(d)));return;}
  const root={folders:new Map(),files:[]};
  filtered.forEach(d=>{let node=root;for(const part of d.path.split('/').slice(0,-1)){if(!node.folders.has(part))node.folders.set(part,{folders:new Map(),files:[]});node=node.folders.get(part)}node.files.push(d)});
  function appendTree(node,parent){[...node.folders.entries()].sort(([a],[b])=>a.localeCompare(b)).forEach(([name,child])=>{const folder=document.createElement('details');folder.open=true;const summary=document.createElement('summary');summary.textContent=name;folder.append(summary);appendTree(child,folder);parent.append(folder)});node.files.forEach(d=>parent.append(resultButton(d)))}appendTree(root,$('results'));
}
function renderReader(){const d=docs.find(d=>d.id===selected);$('reader').innerHTML=`<div class="breadcrumb">${d.path.split('/').join(' / ')}</div><h1>${d.title}</h1><div class="article-meta"><span>${d.category}</span><span>수정 ${d.date} (예시)</span><a href="https://github.com/jaywapp/wiki/blob/develop/${d.path}" target="_blank" rel="noopener noreferrer">원문 열기</a></div><div class="article-body">${d.body}</div><footer class="reader-footer">이 본문은 화면 비교를 위한 요약 예시입니다. 실제 사이트에서는 저장소의 전체 문서를 읽게 됩니다.</footer>`;}
$('search').addEventListener('input',renderResults);$('sort').addEventListener('change',renderResults);['tree','list'].forEach(v=>$(v).onclick=()=>{view=v;renderResults()});$('reset').onclick=()=>{$('search').value='';$('sort').value='new';category='전체 문서';renderCategories();renderResults()};renderCategories();renderResults();renderReader();
