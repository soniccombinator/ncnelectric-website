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
- Online application submit is disabled until Microsoft 365 sending is set up (see docs/).
- Never commit passwords, tokens or Microsoft 365 secrets; use Railway variables.
