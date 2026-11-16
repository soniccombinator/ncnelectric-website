// Rental application endpoint: validates on the server, recalculates the estimate,
// emails NCN (alert) and the applicant (confirmation). Recipients for NCN are fixed server-side.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const crypto = require('node:crypto');

const MAX_BODY = 64 * 1024;
const RATE_LIMIT = 5;                 // applications per IP per window
const RATE_WINDOW_MS = 60 * 60 * 1000;
const DUPLICATE_MS = 10 * 60 * 1000;  // identical submissions inside this window are not re-sent

const TEXT_FIELDS = {
  company: ['Customer / company', 160], contact: ['Contact name', 120], email: ['Email', 254],
  phone: ['Phone', 40], project: ['Project / event', 300], billing: ['Billing address', 500],
  site: ['Rental / site address', 500], onsite: ['On-site contact / phone', 300],
  start: ['Requested start date', 10], end: ['Requested return date', 10],
};
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const oneLine = v => String(v ?? '').replace(/[\r\n]+/g, ' ').trim();

let modelPromise;
const model = () => modelPromise ||= import(pathToFileURL(path.join(__dirname, 'website', 'rental-model.mjs')).href);

async function validate(input) {
  if (!input || typeof input !== 'object') return { error: 'Invalid request.' };
  const out = {};
  for (const [key, [label, max]] of Object.entries(TEXT_FIELDS)) {
    const v = oneLine(input[key]);
    if (!v) return { error: `${label} is required.` };
    if (v.length > max) return { error: `${label} is too long.` };
    out[key] = v;
  }
  out.notes = String(input.notes ?? '').trim().slice(0, 5000);
  if (!/^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/.test(out.email)) return { error: 'Enter a valid email address.' };
  const date = /^\d{4}-\d{2}-\d{2}$/;
  if (!date.test(out.start) || !date.test(out.end) || Number.isNaN(Date.parse(out.start)) || Number.isNaN(Date.parse(out.end))) return { error: 'Enter valid rental dates.' };
  if (out.end < out.start) return { error: 'Return date must be on or after the requested start date.' };
  if (input.acknowledged !== true) return { error: 'Please check the request acknowledgement box.' };
  const num = k => (input[k] === '' || input[k] == null ? 0 : Number(input[k]));
  const rental = {
    kw: Number(input.kw), period: String(input.period), customer: String(input.customer),
    quantity: Number(input.quantity), miles: num('miles'), extraHours: num('extraHours'),
    gallons: num('gallons'), fuelCost: num('fuelCost'),
  };
  const estimate = (await model()).estimateRental(rental);
  if (!estimate.valid) return { error: 'Check the generator and rental selections.' };
  return { application: out, rental, estimate };
}

function estimateRows(rental, e) {
  const unit = { daily: 'day', weekly: 'week', monthly: 'month' }[rental.period];
  return [
    ['Generator', `${rental.kw} kW Diesel, ${rental.quantity} ${unit}${rental.quantity === 1 ? '' : 's'} (${rental.period})`],
    ['Customer type', rental.customer === 'ncn' ? 'Active NCN project' : 'Event / venue'],
    ['Rental', money(e.rental)], ['Delivery / standard setup', money(e.setup)],
    ['Additional mileage', `${money(e.mileage)} (${rental.miles} one-way miles)`],
    ['Excess operating hours', `${money(e.excess)} (${rental.extraHours} hours)`],
    ['NCN-supplied diesel', `${money(e.fuel)} (${rental.gallons} gal at ${money(rental.fuelCost)} + $3/gal)`],
    ['Estimated total before tax', e.customQuote ? 'Custom quote required (event beyond 85 one-way miles)' : money(e.total)],
  ];
}
const table = rows => `<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows.map(([k, v]) => `<tr><td style="border:1px solid #ddd;background:#f6f6f6;font-weight:bold;vertical-align:top">${esc(k)}</td><td style="border:1px solid #ddd;white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}</table>`;
const wrap = inner => `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:680px">${inner}</div>`;

function adminEmail({ application: a, rental, estimate }, ref) {
  const details = Object.entries(TEXT_FIELDS).map(([k, [label]]) => [label, a[k]]);
  details.push(['Site requirements / notes', a.notes || '(none)']);
  return {
    subject: `New rental application: ${a.company} - ${rental.kw} kW (${ref})`,
    html: wrap(`<h2 style="margin:0 0 8px">New generator rental application</h2>
<p>Reference <b>${esc(ref)}</b>. Reply to this email to answer the applicant directly.</p>
<h3>Customer and project</h3>${table(details)}
<h3>Requested rental and estimate</h3>${table(estimateRows(rental, estimate))}
<p style="color:#666">The applicant confirmed this is a request for review only, not a confirmed reservation. Estimate recalculated on the server.</p>`),
  };
}

function confirmationEmail({ application: a, rental, estimate }, ref) {
  return {
    subject: `We received your generator rental request (${ref})`,
    html: wrap(`<p>Hi ${esc(a.contact)},</p>
<p>Thank you for your generator rental application with NCN Electric. Our team will review it and contact you about availability and a final quote.</p>
<p><b>This is not a confirmed reservation.</b> Availability, tax and any additional work are confirmed by NCN in your quote.</p>
<h3>Your request</h3>${table([['Reference', ref], ['Company', a.company], ['Project / event', a.project], ['Site address', a.site], ['Dates', `${a.start} to ${a.end}`], ...estimateRows(rental, estimate)])}
<p>Questions? Reply to this email.</p><p>NCN Electric<br>Power Generational Service</p>`),
  };
}

function createApi({ mailer, now = Date.now, log = console }) {
  const hits = new Map(), recent = new Map();
  function limited(ip) {
    const t = now(), list = (hits.get(ip) || []).filter(x => t - x < RATE_WINDOW_MS);
    list.push(t); hits.set(ip, list);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(x => t - x < RATE_WINDOW_MS)) hits.delete(k);
    return list.length > RATE_LIMIT;
  }
  const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };

  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/status' && req.method === 'GET') return json(res, 200, { applications: Boolean(mailer) }), true;
    if (url.pathname !== '/api/application') return false;
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' }), true;
    if (!mailer) return json(res, 503, { error: 'Online submission is not available yet.' }), true;
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, { error: 'Invalid request.' }), true;

    let size = 0; const chunks = [];
    try {
      for await (const c of req) { size += c.length; if (size > MAX_BODY) return json(res, 413, { error: 'Application is too large.' }), true; chunks.push(c); }
    } catch { return json(res, 400, { error: 'Invalid request.' }), true; }
    let input; try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return json(res, 400, { error: 'Invalid request.' }), true; }

    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    if (limited(ip)) return json(res, 429, { error: 'Too many applications from this connection. Please try again later or call NCN.' }), true;
    // Honeypot: real visitors never fill the hidden "website" field. Pretend success.
    if (input && input.website) return json(res, 200, { ok: true, reference: 'NCN-' + crypto.randomBytes(3).toString('hex').toUpperCase() }), true;

    const v = await validate(input);
    if (v.error) return json(res, 400, { error: v.error }), true;

    const t = now();
    for (const [k, x] of recent) if (t - x.at > DUPLICATE_MS) recent.delete(k);
    const key = crypto.createHash('sha256').update(JSON.stringify([v.application, v.rental])).digest('hex');
    if (recent.has(key)) return json(res, 200, { ok: true, reference: recent.get(key).ref, duplicate: true }), true;

    const ref = 'NCN-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    try {
      await mailer.send({ to: mailer.adminTo, replyTo: v.application.email, ...adminEmail(v, ref) });
    } catch (e) {
      log.error(`[application ${ref}] NCN alert failed: ${e.message}`);
      return json(res, 502, { error: 'Your application could not be sent. Please try again, or print it and email it to NCN.' }), true;
    }
    recent.set(key, { at: t, ref });
    let confirmationSent = true;
    try { await mailer.send({ to: [v.application.email], replyTo: mailer.adminTo[0], ...confirmationEmail(v, ref) }); }
    catch (e) { confirmationSent = false; log.error(`[application ${ref}] confirmation failed: ${e.message}`); }
    log.log(`[application ${ref}] sent to NCN; confirmation ${confirmationSent ? 'sent' : 'failed'}`);
    return json(res, 200, { ok: true, reference: ref, confirmationSent }), true;
  };
}

module.exports = { createApi, validate, adminEmail, confirmationEmail };
