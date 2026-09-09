import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const output=path.join(root,'.vercel','output');
const target=path.resolve(output,'static');
const content=JSON.parse(await readFile(path.join(dist,'content.json'),'utf8'));
if(!content.documents?.length)throw new Error('Refusing to package an empty catalog. Run sync and build first.');
await readFile(path.join(dist,'index.html'));
if(target!==path.join(root,'.vercel','output','static')||path.resolve(output)!==path.join(root,'.vercel','output'))throw new Error('Unsafe build output path');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await cp(dist,target,{recursive:true});
await writeFile(path.join(output,'config.json'),JSON.stringify({
  version:3,
  routes:[
    {src:'/(.*)',headers:{'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin'},continue:true},
    {src:'/content.json',headers:{'Cache-Control':'public, max-age=0, must-revalidate'},continue:true},
    {src:'/assets/(.*)',headers:{'Cache-Control':'public, max-age=31536000, immutable'},continue:true},
    {handle:'filesystem'}
  ]
},null,2)+'\n');
console.log(`Packaged ${content.documents.length} documents for Vercel (${content.commit.slice(0,8)}).`);
