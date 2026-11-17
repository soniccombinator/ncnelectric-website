// Form endpoints. Everything validates on the server; NCN recipients are fixed in Railway variables.
//   GET  /api/status       -> { applications, forms } (whether email is configured)
//   POST /api/application  -> full generator rental application (alert to MAIL_ADMIN_TO + confirmation)
//   POST /api/lead         -> quick generator quote, contact/bid request, careers, terms acknowledgement
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const crypto = require('node:crypto');

const RATE_LIMIT = 5;                 // submissions per IP per window (per endpoint)
const RATE_WINDOW_MS = 60 * 60 * 1000;
const DUPLICATE_MS = 10 * 60 * 1000;  // identical submissions inside this window are not re-sent
const MAX_ATTACHMENT = 3 * 1024 * 1024;

const TEXT_FIELDS = {
  company: ['Customer / company', 160], contact: ['Contact name', 120], email: ['Email', 254],
  phone: ['Phone', 40], project: ['Project / event', 300], billing: ['Billing address', 500],
  site: ['Rental / site address', 500], onsite: ['On-site contact / phone', 300],
  start: ['Requested start date', 10], end: ['Requested return date', 10],
};
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const oneLine = v => String(v ?? '').replace(/[\r\n]+/g, ' ').trim();
const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/;
const newRef = () => 'NCN-' + crypto.randomBytes(3).toString('hex').toUpperCase();

let modelPromise;
const model = () => modelPromise ||= import(pathToFileURL(path.join(__dirname, 'src', 'lib', 'rental-model.mjs')).href);

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
  if (!EMAIL.test(out.email)) return { error: 'Enter a valid email address.' };
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

const LEAD_KINDS = {
  generator: { label: 'Generator quote request', team: 'generators' },
  acknowledgement: { label: 'Rental terms acknowledgement', team: 'generators' },
  contact: { label: 'Website inquiry', team: 'general' },
  careers: { label: 'Careers application', team: 'general' },
};
function validateLead(input) {
  if (!input || typeof input !== 'object') return { error: 'Invalid request.' };
  const kind = String(input.kind || '');
  if (!LEAD_KINDS[kind]) return { error: 'Invalid request.' };
  const f = {
    name: oneLine(input.name).slice(0, 120), company: oneLine(input.company).slice(0, 160), email: oneLine(input.email).slice(0, 254),
    phone: oneLine(input.phone).slice(0, 40), topic: oneLine(input.topic).slice(0, 120), location: oneLine(input.location).slice(0, 200),
    date: oneLine(input.date).slice(0, 10), page: oneLine(input.page).slice(0, 200), message: String(input.message ?? '').trim().slice(0, 5000),
  };
  if (!f.name) return { error: 'Please enter your name.' };
  if (!EMAIL.test(f.email)) return { error: 'Enter a valid email address.' };
  if (!f.phone) return { error: 'Please enter a phone number.' };
  if (input.consent !== true) return { error: 'Please check the consent box.' };
  if (kind === 'generator' && !f.location) return { error: 'Please enter the city or venue.' };
  if (kind === 'contact' && !f.message) return { error: 'Please enter a message.' };
  if (f.date && !/^\d{4}-\d{2}-\d{2}$/.test(f.date)) return { error: 'Enter a valid date.' };
  let attachment = null;
  if (input.attachment) {
    if (kind !== 'careers') return { error: 'Attachments are not accepted here.' };
    const a = input.attachment, name = oneLine(a.name).slice(0, 120);
    if (!/\.(pdf|docx?)$/i.test(name) || typeof a.content !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(a.content)) return { error: 'Attach a PDF or Word file.' };
    if (Buffer.byteLength(a.content, 'base64') > MAX_ATTACHMENT) return { error: 'Please attach a file smaller than 3 MB.' };
    attachment = { name, type: /\.pdf$/i.test(name) ? 'application/pdf' : 'application/octet-stream', content: a.content };
  }
  return { kind, lead: f, attachment };
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
function leadAdminEmail({ kind, lead: l }, ref) {
  const rows = [['Reference', ref], ['Type', LEAD_KINDS[kind].label], ['Name', l.name], ['Company', l.company], ['Email', l.email], ['Phone', l.phone],
    ['Topic / position', l.topic], ['City or venue', l.location], ['Date', l.date], ['Message', l.message], ['Sent from page', l.page]].filter(([, v]) => v);
  return {
    subject: `${LEAD_KINDS[kind].label}: ${l.name}${l.company ? ` (${l.company})` : ''} [${ref}]`,
    html: wrap(`<h2 style="margin:0 0 8px">${esc(LEAD_KINDS[kind].label)}</h2><p>From the NCN Electric website. Reply to this email to answer ${esc(l.name)} directly.</p>${table(rows)}`),
  };
}
function leadConfirmationEmail({ kind, lead: l }, ref) {
  const what = { generator: 'generator quote request', acknowledgement: 'rental terms acknowledgement', contact: 'message', careers: 'application' }[kind];
  return {
    subject: `NCN Electric received your ${what} (${ref})`,
    html: wrap(`<p>Hi ${esc(l.name)},</p><p>Thank you for contacting NCN Electric. We received your ${esc(what)} and will be in touch soon.</p><p>Your reference number is <b>${esc(ref)}</b>.</p>${l.message ? `<p style="color:#555">What you sent:</p><blockquote style="border-left:3px solid #ddd;margin:0;padding-left:12px;color:#555;white-space:pre-wrap">${esc(l.message)}</blockquote>` : ''}<p>NCN Electric<br>(941) 488-0005<br>www.ncnelectric.com</p>`),
  };
}

function createApi({ mailer, now = Date.now, log = console }) {
  const hits = new Map(), recent = new Map();
  function limited(key) {
    const t = now(), list = (hits.get(key) || []).filter(x => t - x < RATE_WINDOW_MS);
    list.push(t); hits.set(key, list);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(x => t - x < RATE_WINDOW_MS)) hits.delete(k);
    return list.length > RATE_LIMIT;
  }
  function seen(payload) {
    const t = now();
    for (const [k, x] of recent) if (t - x.at > DUPLICATE_MS) recent.delete(k);
    const key = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    return { key, prior: recent.get(key) };
  }
  const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); return true; };
  async function readJson(req, res, max) {
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) { json(res, 415, { error: 'Invalid request.' }); return null; }
    let size = 0; const chunks = [];
    try { for await (const c of req) { size += c.length; if (size > max) { json(res, 413, { error: 'Submission is too large.' }); return null; } chunks.push(c); } }
    catch { json(res, 400, { error: 'Invalid request.' }); return null; }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { json(res, 400, { error: 'Invalid request.' }); return null; }
  }
  const ipOf = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const generatorsTo = () => mailer.adminTo;
  const generalTo = () => (mailer.generalTo && mailer.generalTo.length ? mailer.generalTo : mailer.adminTo);

  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return false;
    if (url.pathname === '/api/status' && req.method === 'GET') return json(res, 200, { applications: Boolean(mailer), forms: Boolean(mailer) });
    const route = { '/api/application': 'application', '/api/lead': 'lead' }[url.pathname];
    if (!route) return json(res, 404, { error: 'Not found.' });
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
    if (!mailer) return json(res, 503, { error: 'Online submission is not available yet.' });
    const input = await readJson(req, res, route === 'lead' ? 6 * 1024 * 1024 : 64 * 1024);
    if (input === null) return true;
    if (limited(`${route}:${ipOf(req)}`)) return json(res, 429, { error: 'Too many submissions from this connection. Please try again later or call NCN at (941) 488-0005.' });
    // Honeypot: real visitors never fill the hidden "website" field. Pretend success.
    if (input && input.website) return json(res, 200, { ok: true, reference: newRef() });

    if (route === 'application') {
      const v = await validate(input);
      if (v.error) return json(res, 400, { error: v.error });
      const { key, prior } = seen([v.application, v.rental]);
      if (prior) return json(res, 200, { ok: true, reference: prior.ref, duplicate: true });
      const ref = newRef();
      try { await mailer.send({ to: generatorsTo(), replyTo: v.application.email, ...adminEmail(v, ref) }); }
      catch (e) { log.error(`[application ${ref}] NCN alert failed: ${e.message}`); return json(res, 502, { error: 'Your application could not be sent. Please try again, or print it and email it to NCN.' }); }
      recent.set(key, { at: now(), ref });
      let confirmationSent = true;
      try { await mailer.send({ to: [v.application.email], replyTo: generatorsTo()[0], ...confirmationEmail(v, ref) }); }
      catch (e) { confirmationSent = false; log.error(`[application ${ref}] confirmation failed: ${e.message}`); }
      log.log(`[application ${ref}] sent to NCN; confirmation ${confirmationSent ? 'sent' : 'failed'}`);
      return json(res, 200, { ok: true, reference: ref, confirmationSent });
    }

    const v = validateLead(input);
    if (v.error) return json(res, 400, { error: v.error });
    const { key, prior } = seen([v.kind, v.lead, v.attachment && v.attachment.content.length]);
    if (prior) return json(res, 200, { ok: true, reference: prior.ref, duplicate: true });
    const ref = newRef();
    const to = LEAD_KINDS[v.kind].team === 'generators' ? generatorsTo() : generalTo();
    try { await mailer.send({ to, replyTo: v.lead.email, ...leadAdminEmail(v, ref), attachments: v.attachment ? [v.attachment] : undefined }); }
    catch (e) { log.error(`[lead ${ref}] NCN alert failed: ${e.message}`); return json(res, 502, { error: 'Your request could not be sent.' }); }
    recent.set(key, { at: now(), ref });
    let confirmationSent = true;
    try { await mailer.send({ to: [v.lead.email], replyTo: to[0], ...leadConfirmationEmail(v, ref) }); }
    catch (e) { confirmationSent = false; log.error(`[lead ${ref}] confirmation failed: ${e.message}`); }
    log.log(`[lead ${ref}] ${v.kind} sent to NCN; confirmation ${confirmationSent ? 'sent' : 'failed'}`);
    return json(res, 200, { ok: true, reference: ref, confirmationSent });
  };
}

module.exports = { createApi, validate, validateLead, adminEmail, confirmationEmail };
