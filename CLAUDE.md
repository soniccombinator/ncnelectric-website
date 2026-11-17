# NCN Electric website: instructions for Claude

People at NCN Electric (for example Blythe) update this website by asking in plain language and attaching files:
"add Michelle's bio and photo", "change the 30 kW price to $225", "post an apprentice job opening".
They are not developers. Make the change, publish it, confirm it is live, and reply in plain language.
Do not ask them technical questions or make them run commands.

Live site: https://www.ncnelectric.com (Railway service `ncnelectric-website`, auto-deploys from `main`).

## How publishing works
- Anything merged into `main` on GitHub goes live in about 2 to 3 minutes.
- If you cannot push to `main`, push your session branch (`claude/...`). The "Auto-publish" GitHub Action builds,
  tests and merges it into `main` for you.

## Steps for every change request
1. Make the smallest change that does what was asked. Keep the design, colors and layout unless asked to change them.
   If the request is unclear, ask one short plain-language question first.
2. Run `npm ci` (first time in a session), then `npm run build` and `npm test`. Both must pass. Fix anything that fails.
3. Commit with a short, plain message (for example "Team: add Michelle's bio and photo").
4. Publish: `git fetch origin main && git rebase origin/main`, then `git push origin HEAD:main`.
   If that push is rejected, `git push origin HEAD` and Auto-publish merges it.
5. Wait about 3 minutes, fetch the live page, and confirm the change is there.
6. Reply in plain language with what changed and the link. No code or diffs unless asked.

Undo: if someone says "undo that", `git revert <commit>` and publish the same way. Never rewrite history.

## Where things are
| What people ask about | File to edit |
|---|---|
| Phone, email, addresses, hours, license, LinkedIn, generator contacts (Jose, Blythe) | `src/lib/site.ts` |
| Team members, titles, bios, photos | `src/content/team/<firstname>.md` (one file per person; the text under `---` is the bio) |
| Job openings | `src/content/openings/<job>.md` (copy `_example.md` without the underscore; delete the file when filled) |
| Generator prices and fees (used by the website, Power Planner and server) | `src/lib/rental-model.mjs` (`rates` and `fees`) |
| Generator FAQ, project gallery, testimonials, client logos, badges | `src/data/content.ts` |
| Commercial services | `src/data/services.ts` |
| Sectors and their projects | `src/data/sectors.ts` |
| Power Planner items and wattages | `src/components/PowerPlanner.astro` (`loads` list at the top) |
| Rental terms text | `src/data/terms.json` (one paragraph per line) - see "Extra care" below |
| About page timeline and values | `src/pages/about.astro` (lists at the top) |
| Page wording | `src/pages/*.astro` (home is `index.astro`; generator pages are in `src/pages/generators/`) |
| Colors, fonts, buttons | `src/styles/global.css` |
| Email wording sent by forms | `api.cjs` |
| Old website addresses that redirect | `redirects.cjs` |

## Photos and files people attach
- Save images in `src/assets/img/<folder>/` with a simple lowercase name, no spaces (for example `team/michelle.jpg`,
  `projects/venice-ymca-1.jpg`). The site resizes and compresses them automatically; any size is fine.
- Team photo: save as `src/assets/img/team/<firstname>.jpg` and add `photo: team/<firstname>.jpg` to that person's file.
  Square-ish head-and-shoulders photos look best.
- Project photos: add to `src/assets/img/projects/` and list them in the project's `images` in `src/data/content.ts`.
- PDFs for download (brochures): put in `public/` and link as `/<file>.pdf`.

## Team page rules
- Only Paul's title (CEO & President) is confirmed. Do not invent titles or bios for anyone. Leave `title` out until
  someone tells you the title. A bio of "Bio coming soon." shows as a placeholder.
- Use the name exactly as given. Add a last name only when told.

## Changes that need extra care
- **Prices, fees, rental terms or legal pages** (`rental-model.mjs`, `terms.json`, `privacy.astro`, `terms-of-use.astro`):
  repeat the exact change back to the person and get a clear "yes" before publishing. The rental terms are pending
  attorney review; never add internal notes, "counsel should..." text or drafts to public pages.
- **Forms and email**: forms send email through Microsoft 365 only when the Railway email variables are set
  (`MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MAIL_SENDER`, `MAIL_ADMIN_TO`, optional `MAIL_GENERAL_TO`).
  Until then forms show "being connected" with phone and email. If someone asks why forms don't work, explain that and
  tell them to contact Sonic. Never put passwords, keys or recipient lists in website code.
- `server.cjs`, `api.cjs`, `mail.cjs`, `redirects.cjs`, `astro.config.mjs`, `package.json`, `railway.json`, `scripts/`,
  `test/` and `.github/` keep the site running. Do not change them for normal content requests.
- This repository is public. Never add passwords, keys, customer data or internal documents, and only publish staff phone numbers when asked.
