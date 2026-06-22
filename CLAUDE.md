# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TFT 金铲铲博客 - A Next.js 14 blog application for League of Legends: Teamfight Tactics content, featuring guides, hero analysis, and version updates.

**Key characteristics:**
- Low-memory deployment: local build + SCP upload (server cannot access GitHub)
- Dual content system: SQLite runtime content + static shell pages
- Obsidian-first workflow: guides authored in Obsidian Markdown, published via CLI scripts

## Development Commands

```bash
npm run dev                      # Start dev server at http://localhost:3000
npm run build                    # Build production bundle (.next/)
npm run lint                     # Run ESLint

# Guide content validation
npm run check:guide-contract     # Validate guide frontmatter and assets
npm run import:guide-assets      # Copy images from Obsidian to public/guides/

# SQLite publishing
npm run check:sqlite-contract    # Validate SQLite schema
npm run check:publish-contract   # Validate publish payload structure
npm run publish:guide            # Publish guide to production SQLite

# Static deployment
npm run build:static-deploy      # Build static MVP bundle (.deploy/)
npm run check:static-api-contract    # Validate runtime API contract
npm run check:static-shell-contract  # Validate static shell structure
```

## Architecture

### Content Flow

```
Obsidian Markdown (content/guides/<slug>/TFT.md)
        ↓
publish:guide script
        ↓
[Upload images to server /uploads/guides/<slug>/]
        ↓
[Import payload to server SQLite]
        ↓
Runtime API (/api/guides) reads SQLite
        ↓
Static shell pages fetch and render
```

### Dual Content System

**Why SQLite + Static Shell:**
- Server has 1.6GB RAM, cannot run full Next.js build
- Solution: pre-render static HTML + lightweight Node server serving SQLite data

**File structure:**
```
.deploy/tftblog-static-mvp/
├── server.mjs              # Lightweight runtime (scripts/static-mvp-server.mjs)
├── site/                   # Static prerendered pages
│   ├── index.html          # Homepage shell
│   ├── guides/             # Guide list shell
│   └── _next/              # Client JS/CSS
└── html/                   # API shell templates

data/tftblog.sqlite         # Content database (gitignored)
uploads/guides/<slug>/      # Guide images (persistent, not in .deploy)
```

### Key Files

**Content layer:**
- `lib/guide-content-store.ts` - SQLite repository for guides (upsert, list, findBySlug)
- `lib/guides.ts` - Markdown fallback reader (when SQLite absent)
- `lib/guide-publisher.ts` - Publish orchestrator (parse MD → upload images → import SQLite)
- `lib/server-upload-assets.ts` - SCP image uploader

**Runtime:**
- `scripts/static-mvp-server.mjs` - Production server (serves static + API from SQLite)
- `app/guides/[slug]/page.tsx` - Client-side shell that fetches `/api/guides/<slug>`

**Validation:**
- `scripts/check-guide-contract.ts` - Validate frontmatter schema
- `scripts/check-sqlite-contract.ts` - Validate SQLite schema
- `scripts/check-publish-contract.ts` - Validate publish payload structure

### Guide Content Contract

Guides must live at `content/guides/<slug>/TFT.md` with frontmatter:

```yaml
---
title: 格温 派克
cover: dataTFT (73).png      # Filename in public/guides/<slug>/
source: tftacademy
updatedAt: 2026-06-02        # YYYY-MM-DD format
tags:
  - 格温
  - 派克
---
```

Run `npm run check:guide-contract` before publishing. Missing fields or invalid dates cause clear errors listing the slug and reason.

## Deployment

**Server:** 47.99.202.3 at `/var/www/TFTBlog-NEXTJS`  
**Access:** http://47.99.202.3 or https://www.jingcc.cc  
**PM2 app:** `tftblog-nextjs` on port 3002  
**Nginx:** reverse proxy to localhost:3002

### Code Deployment (infrequent)

When updating app features or UI:

```bash
npm run build                                      # 1. Build .next/
npm run build:static-deploy                        # 2. Build .deploy/ bundle
scp -r .deploy/tftblog-static-mvp.tar.gz root@47.99.202.3:/tmp/  # 3. Upload
ssh root@47.99.202.3 "cd /var/www/TFTBlog-NEXTJS && \
  tar -xzf /tmp/tftblog-static-mvp.tar.gz && \
  pm2 restart tftblog-nextjs && pm2 save"          # 4. Extract & restart
```

### Guide Publishing (frequent)

When adding or updating guide content:

```bash
npm run publish:guide -- content/guides/<slug>/TFT.md
```

This:
1. Validates frontmatter
2. Uploads images to server `/var/www/TFTBlog-NEXTJS/uploads/guides/<slug>/`
3. Imports guide payload to server SQLite via SCP + SSH
4. New content appears immediately on https://www.jingcc.cc/guides without rebuild

**Image URLs:** Stored in SQLite as `/uploads/guides/<slug>/<hash>-<filename>`, served by Nginx with long-term cache headers.

## Environment Variables

**Required in `.env.local` or `.env.production`:**

```env
# SQLite content database (local/server)
DATABASE_URL=file:./data/tftblog.sqlite

# Publishing (SSH/SCP to server)
PUBLISH_SSH_TARGET=root@47.99.202.3
PUBLISH_REMOTE_APP_DIR=/var/www/TFTBlog-NEXTJS
PUBLISH_REMOTE_DATABASE_URL=file:./data/tftblog.sqlite
PUBLISH_UPLOADS_DIR=/var/www/TFTBlog-NEXTJS/uploads
PUBLISH_UPLOADS_PUBLIC_BASE=/uploads
```

**MongoDB (legacy, for RSS aggregation only):**
```env
MONGODB_URI=mongodb://47.99.202.3:27017/tftblog
```

## File Management Rules

**Never create duplicate files for the same purpose:**
- ❌ Don't create `deploy-v2.bat` when `deploy.bat` exists → update `deploy.bat`
- ❌ Don't create `test-api-new.ts` when `test-api.ts` exists → update `test-api.ts`
- ✅ Check if a file exists before creating a similar one
- ✅ Delete temporary test files after validation

**Don't auto-generate documentation:**
- ❌ Don't create README.md, architecture docs, API docs unless explicitly asked
- ✅ Scripts for automation are fine (.sh, .bat, .js, .mjs)

## Path Aliases

Import using `@/*` alias (defined in tsconfig.json):

```typescript
import { GuideContentStore } from '@/lib/guide-content-store';
import { getAllGuides } from '@/lib/guides';
```

## Production Server Info

**PM2 commands:**
```bash
pm2 status                    # View app status
pm2 logs tftblog-nextjs      # View logs
pm2 restart tftblog-nextjs   # Restart app
pm2 save                     # Save process list
```

**Nginx:**
- Config: `/etc/nginx/sites-enabled/tftblog` (or similar)
- Logs: `/www/wwwlogs/tftblog.log`
- Serves `/uploads/` from filesystem with immutable cache headers

**SQLite database:**
- Path: `/var/www/TFTBlog-NEXTJS/data/tftblog.sqlite`
- Schema: `guides` and `guide_tags` tables
- Backup: included in server backup (uploads/ directory is source of truth for images)
