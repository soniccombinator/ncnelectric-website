// One-time (or reconnect) sign-in so the website can send as agent@ncnelectric.com. No admin app approval needed.
// Run from this repo folder (linked to the Railway service):  node scripts/connect-email.cjs
// It prints a Microsoft link and code; sign in AS agent@ncnelectric.com. The new token goes straight into the
// Railway variable MS_REFRESH_TOKEN (never printed). Railway then restarts the site with email on.
const { spawnSync } = require('node:child_process');
const { PUBLIC_CLIENT, DELEGATED_SCOPES } = require('../mail.cjs');
const tenant = process.env.MS_TENANT || 'ncnelectric.com';
const expected = (process.argv[2] || 'agent@ncnelectric.com').toLowerCase();
const form = o => new URLSearchParams(o);
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const start = await (await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/devicecode`, { method: 'POST', body: form({ client_id: PUBLIC_CLIENT, scope: DELEGATED_SCOPES }) })).json();
  if (!start.device_code) throw new Error(`Could not start sign-in: ${start.error_description || start.error}`);
  console.log(`\nOpen ${start.verification_uri} and enter code ${start.user_code}\nSign in as ${expected}. Waiting (code valid ${Math.round(start.expires_in / 60)} minutes)...\n`);
  let interval = (start.interval || 5) * 1000, tok;
  const deadline = Date.now() + start.expires_in * 1000;
  while (Date.now() < deadline) {
    await sleep(interval);
    const r = await (await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, { method: 'POST', body: form({ grant_type: 'urn:ietf:params:oauth:grant-type:device_code', client_id: PUBLIC_CLIENT, device_code: start.device_code }) })).json();
    if (r.refresh_token) { tok = r; break; }
    if (r.error === 'slow_down') interval += 5000;
    else if (r.error !== 'authorization_pending') throw new Error(`Sign-in failed: ${r.error_description || r.error}`);
  }
  if (!tok) throw new Error('The code expired before sign-in finished. Run the script again.');
  const me = await (await fetch('https://graph.microsoft.com/v1.0/me?$select=userPrincipalName,mail', { headers: { Authorization: `Bearer ${tok.access_token}` } })).json();
  const who = String(me.mail || me.userPrincipalName || '').toLowerCase();
  if (who !== expected) throw new Error(`Signed in as ${who}, not ${expected}. Nothing was saved; run again and sign in as ${expected}.`);
  const set = spawnSync('railway', ['variables', '--service', 'ncnelectric-website', '--set-from-stdin', 'MS_REFRESH_TOKEN'], { input: tok.refresh_token, encoding: 'utf8', shell: process.platform === 'win32' });
  if (set.status !== 0) throw new Error(`Saving to Railway failed: ${(set.stderr || set.stdout || '').slice(0, 200)}`);
  console.log(`Connected as ${who}. Token saved to Railway (MS_REFRESH_TOKEN); the site restarts with email on.`);
})().catch(e => { console.error(e.message); process.exit(1); });
