// Sends email through Microsoft 365 (Microsoft Graph, app-only) from one approved mailbox.
// Configuration comes only from environment variables (Railway variables in production):
//   MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET  Entra app registration (secret stays on the server)
//   MAIL_SENDER                                    mailbox the site sends from, e.g. sonic@ncnelectric.com
//   MAIL_ADMIN_TO                                  comma-separated NCN recipients for application alerts
const REQUIRED = ['MS_TENANT_ID', 'MS_CLIENT_ID', 'MS_CLIENT_SECRET', 'MAIL_SENDER', 'MAIL_ADMIN_TO'];

function mailConfig(env = process.env) {
  const missing = REQUIRED.filter(k => !String(env[k] || '').trim());
  if (missing.length) return { enabled: false, missing };
  return {
    enabled: true,
    tenant: env.MS_TENANT_ID.trim(),
    clientId: env.MS_CLIENT_ID.trim(),
    secret: env.MS_CLIENT_SECRET.trim(),
    sender: env.MAIL_SENDER.trim(),
    adminTo: env.MAIL_ADMIN_TO.split(',').map(s => s.trim()).filter(Boolean),
  };
}

function createMailer(config, fetchImpl = fetch) {
  let token = null, tokenExpires = 0;
  async function getToken() {
    if (token && Date.now() < tokenExpires - 60_000) return token;
    const body = new URLSearchParams({
      client_id: config.clientId, client_secret: config.secret,
      scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials',
    });
    const r = await fetchImpl(`https://login.microsoftonline.com/${encodeURIComponent(config.tenant)}/oauth2/v2.0/token`, { method: 'POST', body });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.access_token) throw new Error(`Microsoft sign-in failed (${r.status} ${data.error || ''})`.trim());
    token = data.access_token; tokenExpires = Date.now() + (Number(data.expires_in) || 3600) * 1000;
    return token;
  }
  // to: array of addresses. html: full HTML body. replyTo: optional address.
  async function send({ to, subject, html, replyTo }) {
    const message = {
      subject,
      body: { contentType: 'HTML', content: html },
      toRecipients: to.map(address => ({ emailAddress: { address } })),
    };
    if (replyTo) message.replyTo = [{ emailAddress: { address: replyTo } }];
    const r = await fetchImpl(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.sender)}/sendMail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, saveToSentItems: true }),
    });
    if (r.status !== 202) {
      const detail = await r.json().catch(() => ({}));
      throw new Error(`Microsoft did not accept the email (${r.status} ${detail.error?.code || ''})`.trim());
    }
  }
  return { send, adminTo: config.adminTo, sender: config.sender };
}

module.exports = { mailConfig, createMailer };
