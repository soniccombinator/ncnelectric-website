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
Forms email NCN and send confirmations through Microsoft 365 (Microsoft Graph, app-only, sending from `MAIL_SENDER`).
Until these Railway variables are set the forms show phone and email instead:
`MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MAIL_SENDER`, `MAIL_ADMIN_TO` (generator team),
optional `MAIL_GENERAL_TO` (contact/bid and careers; defaults to `MAIL_ADMIN_TO`).
- One-time Microsoft 365 setup (NCN admin): `powershell -ExecutionPolicy Bypass -File scripts\setup-m365-mail.ps1`
- Live test: `railway run node scripts/mail-test.cjs`

## Known items before relying on legal pages
- Rental terms, Privacy Policy and Terms of Use were prepared with AI assistance and need review by NCN's attorney.
