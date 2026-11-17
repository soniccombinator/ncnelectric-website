// Sends website email through Microsoft 365 (Microsoft Graph) from one mailbox (agent@ncnelectric.com).
// Ways to send, chosen automatically from the Railway variables (first match wins):
//
// 0. Resend (current setup; no Microsoft admin approval): RESEND_API_KEY. The ncnelectric.com domain is verified
//    in Resend with DNS records in GoDaddy (resend._domainkey TXT, send + rsend CNAMEs). Optional MAIL_FROM_NAME.
// 1. Signed-in mailbox (current setup, no admin app approval needed):
//      MS_REFRESH_TOKEN   created once by `node scripts/connect-email.cjs` (agent@ signs in on a phone/browser)
//      DATA_DIR           Railway volume (/data); the token renews itself and is saved there
//      MS_TENANT (default ncnelectric.com), MS_CLIENT_ID (default: Microsoft's public Graph client)
// 2. App registration (if IT ever sets one up): MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET.
//
// Always: MAIL_SENDER (agent@ncnelectric.com), MAIL_ADMIN_TO (generator team), optional MAIL_GENERAL_TO
// (contact/bid and careers; defaults to MAIL_ADMIN_TO).
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');

const PUBLIC_CLIENT = '14d82eec-204b-4c2f-b7e8-296a70dab67e'; // Microsoft Graph Command Line Tools (public client)
const DELEGATED_SCOPES = 'offline_access User.Read Mail.Send';
const list = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
const sha = v => crypto.createHash('sha256').update(v).digest('hex');

function tokenFile(env) { return env.DATA_DIR ? path.join(env.DATA_DIR, 'ms_refresh_token.json') : null; }

function mailConfig(env = process.env) {
  const common = { sender: String(env.MAIL_SENDER || '').trim(), adminTo: list(env.MAIL_ADMIN_TO), generalTo: list(env.MAIL_GENERAL_TO) };
  const missing = [];
  if (!common.sender) missing.push('MAIL_SENDER');
  if (!common.adminTo.length) missing.push('MAIL_ADMIN_TO');
  if (String(env.RESEND_API_KEY || '').trim()) {
    if (missing.length) return { enabled: false, missing };
    return { enabled: true, mode: 'resend', apiKey: env.RESEND_API_KEY.trim(), fromName: String(env.MAIL_FROM_NAME || 'NCN Electric').trim(), ...common };
  }
  if (String(env.MS_CLIENT_SECRET || '').trim()) {
    for (const k of ['MS_TENANT_ID', 'MS_CLIENT_ID']) if (!String(env[k] || '').trim()) missing.push(k);
    if (missing.length) return { enabled: false, missing };
    return { enabled: true, mode: 'app', tenant: env.MS_TENANT_ID.trim(), clientId: env.MS_CLIENT_ID.trim(), secret: env.MS_CLIENT_SECRET.trim(), ...common };
  }
  const file = tokenFile(env);
  const hasSaved = file && fs.existsSync(file);
  if (!String(env.MS_REFRESH_TOKEN || '').trim() && !hasSaved) missing.push('MS_REFRESH_TOKEN');
  if (missing.length) return { enabled: false, missing };
  return { enabled: true, mode: 'delegated', tenant: String(env.MS_TENANT || 'ncnelectric.com').trim(),
    clientId: String(env.MS_CLIENT_ID || PUBLIC_CLIENT).trim(), envToken: String(env.MS_REFRESH_TOKEN || '').trim(), file, ...common };
}

// Delegated tokens rotate on every refresh. Keep the newest in DATA_DIR; if the Railway variable was replaced
// (someone re-ran connect-email), the new variable wins over the saved file.
function createTokenStore(config) {
  let current = null;
  return {
    get() {
      if (current) return current;
      if (config.file && fs.existsSync(config.file)) {
        try {
          const saved = JSON.parse(fs.readFileSync(config.file, 'utf8'));
          if (!config.envToken || saved.seed === sha(config.envToken)) return (current = saved.rt);
        } catch {}
      }
      return (current = config.envToken);
    },
    save(rt) {
      current = rt;
      if (!config.file) return;
      fs.mkdirSync(path.dirname(config.file), { recursive: true });
      fs.writeFileSync(config.file, JSON.stringify({ rt, seed: config.envToken ? sha(config.envToken) : null, savedAt: new Date().toISOString() }));
    },
  };
}

function createMailer(config, fetchImpl = fetch) {
  let token = null, tokenExpires = 0;
  const store = config.mode === 'delegated' ? createTokenStore(config) : null;
  async function getToken(force = false) {
    if (!force && token && Date.now() < tokenExpires - 60_000) return token;
    const body = config.mode === 'app'
      ? new URLSearchParams({ client_id: config.clientId, client_secret: config.secret, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' })
      : new URLSearchParams({ client_id: config.clientId, grant_type: 'refresh_token', refresh_token: store.get(), scope: DELEGATED_SCOPES });
    const r = await fetchImpl(`https://login.microsoftonline.com/${encodeURIComponent(config.tenant)}/oauth2/v2.0/token`, { method: 'POST', body });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.access_token) throw new Error(`Microsoft sign-in failed (${r.status} ${data.error || ''})`.trim());
    if (store && data.refresh_token) store.save(data.refresh_token);
    token = data.access_token; tokenExpires = Date.now() + (Number(data.expires_in) || 3600) * 1000;
    return token;
  }
  // to: array of addresses. html: full HTML body. replyTo: optional address.
  async function send({ to, subject, html, replyTo, attachments }) {
    if (config.mode === 'resend') {
      const body = { from: `${config.fromName} <${config.sender}>`, to, subject, html };
      if (replyTo) body.reply_to = replyTo;
      if (attachments && attachments.length) body.attachments = attachments.map(a => ({ filename: a.name, content: a.content }));
      const r = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (r.status !== 200) {
        const detail = await r.json().catch(() => ({}));
        throw new Error(`Email service did not accept the email (${r.status} ${detail.name || detail.message || ''})`.trim());
      }
      return;
    }
    const message = {
      subject,
      body: { contentType: 'HTML', content: html },
      toRecipients: to.map(address => ({ emailAddress: { address } })),
    };
    if (replyTo) message.replyTo = [{ emailAddress: { address: replyTo } }];
    if (attachments && attachments.length) message.attachments = attachments.map(a => ({ '@odata.type': '#microsoft.graph.fileAttachment', name: a.name, contentType: a.type, contentBytes: a.content }));
    const who = config.mode === 'app' ? `users/${encodeURIComponent(config.sender)}` : 'me';
    const r = await fetchImpl(`https://graph.microsoft.com/v1.0/${who}/sendMail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, saveToSentItems: true }),
    });
    if (r.status !== 202) {
      const detail = await r.json().catch(() => ({}));
      throw new Error(`Microsoft did not accept the email (${r.status} ${detail.error?.code || ''})`.trim());
    }
  }
  // Signed-in tokens expire after 90 days without use; refreshing daily keeps them alive even with no form traffic.
  function keepAlive(log = console) {
    if (config.mode !== 'delegated') return null;
    const run = () => getToken(true).then(() => log.log('Email sign-in refreshed.')).catch(e => log.error('Email sign-in refresh failed:', e.message));
    run();
    const t = setInterval(run, 24 * 60 * 60 * 1000); t.unref?.();
    return t;
  }
  return { send, keepAlive, getToken, mode: config.mode, adminTo: config.adminTo, generalTo: config.generalTo, sender: config.sender };
}

module.exports = { mailConfig, createMailer, PUBLIC_CLIENT, DELEGATED_SCOPES };
