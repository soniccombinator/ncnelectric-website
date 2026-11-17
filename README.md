# ncnelectric-website

The NCN Electric website (https://www.ncnelectric.com): commercial electrical services, sectors, projects, team,
careers, and NCN Generator Services (Power Planner, rental application, rental terms).

Built with [Astro](https://astro.build) (static pages) plus a small Node server (`server.cjs`) for redirects and the
form/email API. Hosted on Railway; every push to `main` deploys automatically.

## Editing
Staff edit by prompting Claude. `CLAUDE.md` maps every common request to the file to change.

## Run locally
```
npm ci
npm run build
npm start        # http://127.0.0.1:8080
npm test         # site smoke test + form API test
```
`npm run dev` gives a live-reload preview of the pages (forms need `npm start`).

## Email (forms)
Forms email NCN and send confirmations through Microsoft 365 from `agent@ncnelectric.com` (`MAIL_SENDER`).
Recipients: `MAIL_ADMIN_TO` (generator team), optional `MAIL_GENERAL_TO` (contact/bid and careers; defaults to `MAIL_ADMIN_TO`).
Until email is connected the forms show phone and email instead.
- **Connect / reconnect** (no admin approval): `node scripts/connect-email.cjs`, then sign in as agent@ncnelectric.com
  with the code shown. The token is stored in Railway (`MS_REFRESH_TOKEN`), renews itself daily and is kept on the
  Railway volume (`DATA_DIR=/data`). agent@ must have MFA set up first (NCN's tenant requires it).
- Alternative if IT ever creates an app registration: `scripts\setup-m365-mail.ps1` (sets `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`).
- Live test: `railway run node scripts/mail-test.cjs`

## Known items before relying on legal pages
- Rental terms, Privacy Policy and Terms of Use were prepared with AI assistance and need review by NCN's attorney.
