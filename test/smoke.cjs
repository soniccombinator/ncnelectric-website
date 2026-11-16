// CI smoke test: every file the pages reference must be served, and the pricing module must load.
const assert=require('node:assert'),fs=require('node:fs'),path=require('node:path'),server=require('../server.cjs');
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  const get=async p=>{const r=await fetch(base+p);return {status:r.status,text:await r.text()}};
  assert.equal((await get('/')).status,200,'home page');assert.equal((await get('/healthz')).status,200,'health');
  assert.equal((await get('/../package.json')).status!==200,true,'path traversal blocked');
  const web=path.join(__dirname,'..','website'),refs=new Set();
  for(const f of fs.readdirSync(web).filter(f=>/\.(html|js|mjs|css)$/.test(f))){
    const src=fs.readFileSync(path.join(web,f),'utf8');
    for(const m of src.matchAll(/(?:src|href)=["']([^"'#?:$]+\.(?:png|jpg|pdf|css|js|mjs|docx))["']|from\s*["']\.\/([^"']+)["']|url\(["']?([^"')]+\.(?:png|jpg))/g)){const ref=m[1]||m[2]||m[3];if(!/^https?:|\$\{/.test(ref))refs.add(ref.replace(/^\.\//,''))}
  }
  for(const ref of refs){const r=await fetch(base+'/'+ref);assert.equal(r.status,200,`missing file: ${ref}`)}
  await import(path.join(web,'rental-model.mjs'));JSON.parse(fs.readFileSync(path.join(web,'terms.json'),'utf8'));
  console.log(`OK: home, health, ${refs.size} referenced files, rental-model.mjs, terms.json`);server.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
