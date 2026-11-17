// Server for the NCN Electric website. Works locally and on Railway.
// Serves the built site in dist/ (run `npm run build` first), old-URL redirects, /healthz and the form API (api.cjs).
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const { mailConfig, createMailer } = require('./mail.cjs');
const { createApi } = require('./api.cjs');
const { redirectFor } = require('./redirects.cjs');

const root = path.join(__dirname, 'dist');
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.pdf': 'application/pdf',
};
const compressible = /^(text\/|application\/(json|xml)|image\/svg)/;
const security = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Strict-Transport-Security': 'max-age=31536000',
};

const config = mailConfig();
const api = createApi({ mailer: config.enabled ? createMailer(config) : null });
if (require.main === module) console.log(config.enabled ? `Email: on (sending as ${config.sender})` : `Email: off (missing ${config.missing.join(', ')})`);

const cache = new Map(); // path -> { body, gzip, br, type }
function load(file) {
  if (cache.has(file)) return cache.get(file);
  let body; try { body = fs.readFileSync(file); } catch { return null; }
  const type = mime[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const entry = { body, type };
  if (compressible.test(type) && body.length > 1024) { entry.br = zlib.brotliCompressSync(body); entry.gzip = zlib.gzipSync(body); }
  if (cache.size < 2000) cache.set(file, entry);
  return entry;
}
function resolveFile(pathname) {
  const clean = path.resolve(root, '.' + pathname);
  if (clean !== root && !clean.startsWith(root + path.sep)) return null;
  for (const candidate of [clean, path.join(clean, 'index.html'), clean + '.html']) {
    try { if (fs.statSync(candidate).isFile()) return candidate; } catch {}
  }
  return null;
}
function send(req, res, status, entry, extra = {}) {
  const headers = { 'Content-Type': entry.type, ...security, ...extra, Vary: 'Accept-Encoding' };
  const ae = String(req.headers['accept-encoding'] || '');
  let body = entry.body;
  if (entry.br && /\bbr\b/.test(ae)) { body = entry.br; headers['Content-Encoding'] = 'br'; }
  else if (entry.gzip && /\bgzip\b/.test(ae)) { body = entry.gzip; headers['Content-Encoding'] = 'gzip'; }
  headers['Content-Length'] = body.length;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

const server = http.createServer(async (req, res) => {
  try { if (await api(req, res)) return; }
  catch (e) { console.error('API error:', e.message); if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end('{"error":"Server error."}'); } return; }

  let url; try { url = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400); return res.end('Bad request'); }
  if (url.pathname === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }

  let pathname; try { pathname = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end('Bad request'); }
  const to = redirectFor(pathname);
  if (to) { res.writeHead(301, { Location: to, ...security }); return res.end(); }

  const file = resolveFile(pathname);
  if (!file) { const nf = load(path.join(root, '404.html')); if (nf) return send(req, res, 404, nf, { 'Cache-Control': 'no-cache' }); res.writeHead(404); return res.end('Not found'); }
  const entry = load(file);
  if (!entry) { res.writeHead(404); return res.end('Not found'); }
  const immutable = pathname.startsWith('/_astro/');
  send(req, res, 200, entry, { 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : entry.type.startsWith('text/html') ? 'no-cache' : 'public, max-age=86400' });
});

// Railway sets PORT and needs 0.0.0.0; locally defaults to 127.0.0.1:8080.
const port = Number(process.env.PORT) || 8080, host = process.env.PORT ? '0.0.0.0' : '127.0.0.1';
if (require.main === module) server.listen(port, host, () => console.log(`NCN site: http://${host}:${port}`));
module.exports = server;
