// Site smoke test (run after `npm run build`): every page loads, every local link/image works,
// old URLs redirect, the 404 page works, prices match the pricing file, and no internal notes are public.
const assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), { pathToFileURL } = require('node:url');
const dist = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) { console.error('dist/ is missing. Run `npm run build` first.'); process.exit(1); }
const server = require('../server.cjs');

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = (p, opts = {}) => fetch(base + p, { redirect: 'manual', ...opts });

  // 1. Every page in the sitemap loads.
  const sitemap = await (await get('/sitemap.xml')).text();
  const pages = [...sitemap.matchAll(/<loc>https:\/\/www\.ncnelectric\.com([^<]*)<\/loc>/g)].map(m => m[1] || '/');
  assert.ok(pages.length >= 25, `sitemap lists ${pages.length} pages`);
  const html = {};
  for (const p of pages) { const r = await get(p); assert.equal(r.status, 200, `page ${p}`); html[p] = await r.text(); }

  // 2. Every local link, image and script referenced by those pages works.
  const refs = new Set();
  for (const [p, h] of Object.entries(html)) {
    for (const m of h.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) refs.add(m[1]);
    for (const m of h.matchAll(/srcset="([^"]+)"/g)) for (const part of m[1].split(',')) refs.add(part.trim().split(/\s+/)[0]);
    for (const m of h.matchAll(/data-lightbox="([^"]+)"/g)) for (const u of JSON.parse(m[1].replace(/&quot;|&#34;/g, '"').replace(/&amp;/g, '&')).images) refs.add(u);
  }
  let checked = 0;
  for (const ref of refs) {
    if (!ref.startsWith('/') || ref.startsWith('/api/')) continue;
    const r = await get(ref);
    assert.ok(r.status === 200 || r.status === 301, `broken link or file: ${ref} (${r.status})`);
    checked++;
  }

  // 3. Old WordPress URLs redirect permanently.
  for (const [from, to] of [['/about-ncn-2/', '/about'], ['/sectors-2/healthcare/', '/sectors/healthcare'], ['/sectors-2/project-gallery/', '/projects'],
    ['/careers/apply-today/', '/careers#apply'], ['/contact-2/', '/contact'], ['/our-team/', '/team'], ['/portal/login/', '/']]) {
    const r = await get(from); assert.equal(r.status, 301, `redirect ${from}`); assert.equal(r.headers.get('location'), to, `redirect target ${from}`);
  }

  // 4. 404 page, path traversal, health, compression.
  const nf = await get('/no-such-page'); assert.equal(nf.status, 404); assert.ok((await nf.text()).includes('This circuit is dead'));
  assert.notEqual((await get('/../package.json')).status, 200, 'path traversal blocked');
  assert.equal((await get('/healthz')).status, 200);
  assert.equal((await get('/', { headers: { 'Accept-Encoding': 'gzip' } })).headers.get('content-encoding'), 'gzip');

  // 5. Prices on the generator page come from the pricing file.
  const { rates } = await import(pathToFileURL(path.join(__dirname, '..', 'src', 'lib', 'rental-model.mjs')).href);
  for (const r of rates) assert.ok(html['/generators'].includes(`$${r.daily}`), `generator page shows $${r.daily}/day for ${r.kw} kW`);

  // 6. No internal drafting or counsel notes on the public terms page.
  assert.ok(!/drafting notes|counsel (must|should)|remove after counsel/i.test(html['/generators/terms']), 'terms page has no internal notes');

  console.log(`OK: ${pages.length} pages, ${checked} links/files, redirects, 404, compression, prices, terms clean`);
  server.close();
})().catch(e => { console.error(e.message); process.exit(1); });
