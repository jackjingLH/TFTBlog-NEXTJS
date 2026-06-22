## REVIEW-01
- Source doc: docs/DEPLOYMENT-GUIDE.md
- Review agent: fallback independent-context
- Scope checked: approved Nginx `/uploads` guide image delivery design, CSV closure state, active publish path, static deploy packaging, production API/image delivery, Chrome mobile rendering evidence.
- Evidence checked: `lib/guide-publisher.ts`, `lib/server-upload-assets.ts`, `scripts/check-publish-contract.ts`, `scripts/build-static-deploy.mjs`, `scripts/check-static-shell-contract.mjs`, `.env.example`, `docs/DEPLOYMENT-GUIDE.md`, current CSV notes, production Chrome DevTools checks, SSH PM2/Nginx checks, local verification commands.
- Claim/evidence alignment: matched
- Limited validation honestly reported: yes
- Result: vision_met
- Gaps: none
- Follow-up issues added: none
- Assumptions: production guide republish evidence is accepted from completed publish commands plus API/detail/HEAD verification; browser image load evidence covers `gwen-pyke` as required by the approved validation section.
- Decision debt: none; after explicit approval, the legacy OSS code/script/dependencies were removed from the active workspace. Historical OSS planning documents remain as past mission records only.
- Human-required blockers: none

### Evidence Summary
- `npm run check:publish-contract`: passed; publish payload uses `/uploads/guides/<slug>/<hash>-<filename>`, missing images fail before SQLite import, same-slug upsert remains idempotent.
- `npm run check:sqlite-contract`: passed.
- `npm run lint`: passed with no ESLint warnings or errors.
- `npm run build`: passed.
- `npm run build:static-deploy`: passed.
- `npm run check:static-shell-contract`: passed and rejects bundled guide image assets.
- `npm run check:static-api-contract`: passed.
- `Test-Path .deploy\tftblog-static-mvp\site\guides`: `False`.
- `Select-String .env.example 'OSS_|cdn\.jingcc|aliyuncs'`: no matches.
- `lib/oss-assets.ts`, `scripts/check-oss-contract.ts`, `check:oss-contract`, `ali-oss`, and `@types/ali-oss`: removed after explicit approval.
- Chrome DevTools production API audit: `/api/guides` returned 5 guides; all five detail APIs returned `/uploads/guides/...` URLs; 26 unique guide image URLs returned HEAD 200 with `image/png` and `Cache-Control: public, max-age=31536000, immutable`; no `cdn.jingcc.cc`, OSS, or `/public/guides` URLs found.
- Chrome DevTools mobile audit for `https://www.jingcc.cc/guides/gwen-pyke` at 390x844: after scrolling lazy images, 6/6 guide images had `naturalWidth > 0`, `scrollWidth` was 390, `horizontalOverflow` was false, and all image URLs were `/uploads/guides/...`.
- SSH production checks: active Nginx config contains `location /uploads/` aliasing `/var/www/TFTBlog-NEXTJS/uploads/`; `nginx -t` passed; `/var/www/TFTBlog-NEXTJS/uploads` and `/var/www/TFTBlog-NEXTJS/uploads/guides` exist; PM2 `tftblog-nextjs` process is online.
