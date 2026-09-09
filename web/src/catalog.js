export const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ko');
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const titleCollator = new Intl.Collator('ko', {numeric:true});
export function filterDocuments(documents, {query='',folder='',tag='',sort='new'}={}) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  const needsDate = !['title','reverse','relevance'].includes(sort);
  const rows = documents.flatMap(doc => {
    if (folder && !doc.path.startsWith(folder + '/')) return [];
    if (tag && !doc.tags.includes(tag)) return [];
    const dated = needsDate ? Date.parse(doc.updated) || 0 : 0;
    if (!terms.length) return [{doc,score:0,dated}];
    const title = normalize(doc.title), path = normalize(doc.path);
    const text = normalize(doc.text), tags = normalize(doc.tags.join(' '));
    if (!terms.every(term => [title,path,text,tags].some(field => field.includes(term)))) return [];
    const score = terms.reduce((n,t) => n+(title.includes(t)?12:0)+(path.includes(t)?4:0)+(tags.includes(t)?6:0)+(text.includes(t)?1:0),0);
    return [{doc,score,dated}];
  });
  rows.sort((a,b) => {
    const title = sort==='title'||sort==='reverse'?titleCollator.compare(a.doc.title,b.doc.title):0;
    const diff = sort==='title'?title:sort==='reverse'?-title:sort==='old'?a.dated-b.dated:sort==='relevance'?b.score-a.score:b.dated-a.dated;
    return diff || titleCollator.compare(a.doc.path,b.doc.path);
  });
  return rows.map(row=>row.doc);
}
export function createTree(documents) {
  const root = {folders:new Map(),documents:[]};
  for (const doc of documents) {
    let node=root;
    for (const part of doc.path.split('/').slice(0,-1)) {
      if(!node.folders.has(part))node.folders.set(part,{folders:new Map(),documents:[]});
      node=node.folders.get(part);
    }
    node.documents.push(doc);
  }
  return root;
}
export function resolveDocumentLink(href, sourcePath, paths) {
  if (!href || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return null;
  let decoded;
  try { decoded=decodeURIComponent(href.split('#')[0].split('?')[0]); } catch { return null; }
  if(!decoded)return {path:sourcePath,hash:href.includes('#')?href.slice(href.indexOf('#')):''};
  const base=sourcePath.split('/').slice(0,-1);
  const parts=decoded.startsWith('/')?[]:base;
  for(const part of decoded.split('/')){if(part==='..')parts.pop();else if(part&&part!=='.')parts.push(part);}
  const path=parts.join('/');
  const candidates=[path,path+'/README.md',path+'/index.md'];
  // Resolve known historic folder moves only when the current target exists.
  for(const from of ['ax/ai/','ai-workflow/','ax/']) {
    if(path.startsWith(from))candidates.push('ai/'+path.slice(from.length));
  }
  const expanded=candidates.flatMap(candidate=>[candidate,candidate+'/README.md',candidate+'/index.md']);
  let result=expanded.find(candidate=>paths.has(candidate));
  if(!result&&/^(ax\/|ai-workflow\/)/.test(path)){
    const filename=path.split('/').at(-1);
    const matches=[...paths].filter(candidate=>candidate.startsWith('ai/')&&candidate.split('/').at(-1)===filename);
    if(matches.length===1)result=matches[0];
  }
  if(!result){
    const repeated=path.replace(/(^|\/)([^/]+)\/\2(?=\/)/g,'$1$2');
    if(paths.has(repeated))result=repeated;
  }
  if(result)return {path:result,hash:href.includes('#')?href.slice(href.indexOf('#')):''};
  const folder=candidates.find(candidate=>[...paths].some(item=>item.startsWith(candidate+'/')));
  return folder?{path:null,folder,hash:''}:null;
}
