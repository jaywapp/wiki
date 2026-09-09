import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';
import { escapeHtml, resolveDocumentLink } from './catalog.js';

export function renderMarkdown(doc, paths, makeUrl) {
  const headings=[],slugs=new Map();
  const parser=new Marked({gfm:true,breaks:false});
  parser.use({renderer:{
    html({text}) { return escapeHtml(text); },
    heading({tokens,depth}) {
      const label=this.parser.parseInline(tokens).replace(/<[^>]*>/g,'');
      const base=label.toLowerCase().replace(/<[^>]+>/g,'').replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu,'').trim().replace(/\s/g,'-');
      const seen=slugs.get(base)||0;slugs.set(base,seen+1);
      const id=seen?`${base}-${seen}`:base;
      headings.push({id,text:label,depth});
      return `<h${depth} id="${escapeHtml(id)}">${this.parser.parseInline(tokens)}</h${depth}>`;
    },
    code({text,lang}) {
      const language=(lang||'').split(/\s/)[0].toLowerCase();
      if(language==='mermaid')return `<pre class="diagram-source"><code>${escapeHtml(text)}</code></pre>`;
      const value=language&&hljs.getLanguage(language)?hljs.highlight(text,{language,ignoreIllegals:true}).value:escapeHtml(text);
      return `<pre><code class="hljs${language?' language-'+escapeHtml(language):''}">${value}</code></pre>`;
    },
    link({href,title,tokens}) {
      const label=this.parser.parseInline(tokens);
      const target=resolveDocumentLink(href,doc.path,paths);
      if(target?.folder){
        const url=new URL(makeUrl(), 'https://wiki.invalid');url.searchParams.set('folder',target.folder);url.searchParams.set('pane','browse');
        return `<a href="${escapeHtml(url.pathname+url.search)}" data-folder-target="${escapeHtml(target.folder)}">${label}</a>`;
      }
      if(target)return `<a href="${escapeHtml(makeUrl(target.path,target.hash))}" data-document="${escapeHtml(target.path)}" data-anchor="${escapeHtml(target.hash)}">${label}</a>`;
      if(/^https?:\/\//i.test(href)||/^mailto:/i.test(href))return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${title?' title="'+escapeHtml(title)+'"':''}>${label}</a>`;
      if(!/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) {
        const targetUrl=new URL(href,`https://github.com/jaywapp/wiki/blob/develop/${doc.path}`);
        return `<a href="${escapeHtml(targetUrl.href)}" target="_blank" rel="noopener noreferrer" title="사이트에 없는 경로입니다. GitHub에서 확인합니다.">${label}</a>`;
      }
      return label;
    },
    image({href,text}) {
      let url;
      try{url=new URL(href,`https://raw.githubusercontent.com/jaywapp/wiki/develop/${doc.path}`);}catch{return escapeHtml(text);}
      if(url.protocol!=='https:')return escapeHtml(text);
      return `<img src="${escapeHtml(url.href)}" alt="${escapeHtml(text)}" loading="lazy" referrerpolicy="no-referrer">`;
    }
  }});
  const html=DOMPurify.sanitize(parser.parse(doc.markdown),{USE_PROFILES:{html:true},ADD_ATTR:['target'],FORBID_TAGS:['style','form','input','button','iframe'],FORBID_ATTR:['style']});
  return {html,headings};
}

let mermaidPromise;
export async function enhanceDiagrams(container, isCurrent) {
  const elements=[...container.querySelectorAll('.diagram-source')];
  if(!elements.length)return;
  try {
    mermaidPromise ||= import('mermaid').then(module=>{
      module.default.initialize({startOnLoad:false,securityLevel:'strict',theme:'dark',suppressErrorRendering:true,flowchart:{htmlLabels:false},fontFamily:'Noto Sans KR, sans-serif'});
      return module.default;
    });
    const mermaid=await mermaidPromise;
    for(const element of elements){
      if(!isCurrent())return;
      try {
        const code=element.textContent;
        const {svg}=await mermaid.render(`diagram-${crypto.randomUUID()}`,code);
        if(!isCurrent())return;
        const figure=document.createElement('figure');figure.className='diagram';
        figure.innerHTML=DOMPurify.sanitize(svg,{USE_PROFILES:{svg:true,svgFilters:true}});
        const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='다이어그램 코드 보기';details.append(summary,element.cloneNode(true));figure.append(details);element.replaceWith(figure);
      } catch {
        const note=document.createElement('p');note.className='diagram-note';note.textContent='이 다이어그램은 원본 코드로 표시합니다.';element.before(note);
      }
    }
  }catch{if(isCurrent())elements.forEach(el=>{el.title='다이어그램을 불러오지 못해 원본 코드를 표시합니다.';});}
}
