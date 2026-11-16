# NCN Generator website: instructions for Claude

People at NCN Electric use Claude to update this website by asking in plain language, for example
"change the header to say ...". They are not developers. Your job is to make the change, publish it,
and confirm it is live. Do not ask them technical questions or make them run any commands.

Live site: https://ncnelectric-website-production.up.railway.app

## How publishing works
- Anything that reaches the `main` branch on GitHub goes live automatically on Railway in about 1 to 2 minutes.
- If you are working on a session branch (for example `claude/...`) and cannot push to `main`, just push the branch.
  The "Auto-publish" GitHub Action tests it and merges it into `main` for you.

## Steps for every change request
1. Make the smallest edit that does what was asked. Keep the current design, colors, fonts and layout unless the
   person asks to change them. If the request is unclear, ask one short plain-language question first.
2. Run `npm test`. It must print `OK`. If it fails, fix the problem before publishing.
3. Commit with a short, plain message that says what changed (for example "Header: new phone number").
4. Publish:
   - `git fetch origin main && git rebase origin/main`
   - `git push origin HEAD:main`
   - If that push is rejected, run `git push origin HEAD` to push your branch. Auto-publish merges it.
5. Wait about 90 seconds. Then fetch the live page and confirm the new text or style is there. If you pushed a branch,
   first check that the Auto-publish run succeeded (`gh run list` if available, or check the live page).
6. Reply in plain language: what changed, and the live link. Do not paste code or diffs unless they ask.

## Undoing a change
If someone says "undo that" or "put it back", revert the commit with `git revert <commit>`. Never rewrite history.
Publish the revert the same way as any other change.

## Where things are (`website/` is the site; nothing outside it is served)
- `index.html` is the home page: top bar/header, navigation, services, contact block.
- `calculator.html` is the rental calculator and application page.
- CSS: `branding.css` (colors, fonts, logo), `hub.css` (main layout), `services-home.css`, `rental.css`,
  `calculator.css`, `contact-us.css`.
- JS: `services-home.js` and `app.js` (home page), `rental.js` and `rental-model.mjs` (calculator and pricing),
  `application.js`, `acknowledgement.js`, `delivery.js`.
- `terms.json` holds the rental terms text. `NCN T&C FINAL.docx` and `NCN-Generator-Services.pdf` are downloads.
- Images: `flyer-*.png`, `generator-services-*.png`, `ncn-electric-logo.jpg`.
- If someone uploads a new image, save it in `website/` with a simple lowercase name and no spaces.

## Changes that need extra care
- **Prices, rental terms, the T&C document, or legal wording** (`rental-model.mjs`, `terms.json`, the `.docx`):
  before publishing, repeat the exact change back to the person and get a clear "yes". The terms are pending
  counsel approval.
- **Email** (application alerts to NCN and confirmations to applicants) is sent by the server through Microsoft 365
  from the mailbox in the `MAIL_SENDER` Railway variable. Code: `api.cjs` (email text, validation) and `mail.cjs`.
  Wording changes to these emails are fine (edit the text in `api.cjs`, run `npm test`). Never put email addresses
  for NCN recipients in browser code; they live in the `MAIL_ADMIN_TO` Railway variable. If online submission shows
  as unavailable, the Railway email variables are missing; tell the person to contact Sonic.
- `server.cjs`, `mail.cjs`, `railway.json`, `package.json`, `scripts/`, `test/` and `.github/` keep the site running.
  Do not change them for normal content requests.
- This repository is public. Never add passwords, keys, tokens, customer data or internal documents to it.
