# ncnelectric-website

NCN Generator Services website. Currently the original ChatGPT build (v26); to be replaced by the v2 full-company site.

## How updates go live
1. A change is committed to `main` (Claude makes these on request).
2. GitHub Actions runs `npm test` (checks every page asset loads and the pricing module/terms parse).
3. Railway auto-deploys `main` once the check passes ("Wait for CI" enabled).

## Run locally
`npm start` then open http://127.0.0.1:8080 (Node 20+, no installs needed).

## Known issues before public launch
- Rental terms page and `NCN T&C FINAL.docx` still contain internal drafting notes; counsel approval pending.
- Never commit passwords, tokens or Microsoft 365 secrets; use Railway variables.

## Email (rental applications)
The server emails each application to NCN (`MAIL_ADMIN_TO`) and a confirmation to the applicant, sent through
Microsoft 365 from `MAIL_SENDER` (sonic@ncnelectric.com). Until all five Railway variables are set
(`MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MAIL_SENDER`, `MAIL_ADMIN_TO`) the form shows
"Online submission unavailable" and nothing is sent.
- One-time Microsoft 365 setup (NCN admin): `powershell -ExecutionPolicy Bypass -File scripts\setup-m365-mail.ps1`
- Live test: `railway run node scripts/mail-test.cjs`
- The client secret expires (24 months by default). Re-run the setup script to rotate it.
