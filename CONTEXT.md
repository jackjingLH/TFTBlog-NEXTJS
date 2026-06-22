# Project Context

## Domain Language

### Core Concepts

**Guide (攻略)**
A TFT strategy article authored in Obsidian Markdown and published to the site. Each guide contains:
- Title, tags, cover image
- Strategic content (team compositions, item builds, positioning)
- Metadata (source, update date, reading time)

**Slug**
URL-safe identifier for a guide (e.g., `gwen-pyke`, `woodland-gnar`). Used in URLs (`/guides/<slug>`) and file paths.

**Frontmatter Contract**
Required YAML metadata in guide markdown files:
- `title` - Display title
- `cover` - Cover image filename
- `source` - Content source attribution
- `updatedAt` - Last update date (YYYY-MM-DD)
- `tags` - Array of tag strings

**Shell Page**
Static HTML page that fetches content from runtime API. The dual-content architecture uses:
- Pre-rendered static shells (HTML/CSS/JS)
- Client-side data fetching from SQLite-backed API
- No server-side rendering in production

**Static MVP Server**
Lightweight Node.js server (`scripts/static-mvp-server.mjs`) that:
- Serves pre-built static HTML/CSS/JS
- Provides runtime API endpoints (`/api/guides`)
- Reads from SQLite database
- Runs on low-memory server (1.6GB RAM)

### Visual Design Terms

**AI Hero Style**
Design language characterized by:
- White/light background with ample whitespace
- Modern sans-serif typography
- Card-based content layout
- Responsive design with mobile-first approach
- Clean, education-focused aesthetic

**Content Card**
Visual component displaying guide summary:
- Cover image (aspect ratio TBD)
- Title and excerpt
- Tags and metadata (source, date)
- Click target linking to detail page

## Goals

Provide a mobile-first TFT guide aggregation site where:
- Users can browse latest guides quickly
- Content is easy to read on mobile devices
- Publishing workflow remains Obsidian → CLI → SQLite
- Design is professional and modern (AI Hero inspired)

## Architecture

### Dual Content System

**Why SQLite + Static Shell:**
- Production server has 1.6GB RAM
- Cannot run full Next.js server-side rendering
- Solution: pre-render static HTML + lightweight runtime API

**Content Flow:**
```
Obsidian Markdown
    ↓
publish:guide script
    ↓
Upload images → /uploads/guides/<slug>/
    ↓
Import to SQLite
    ↓
Runtime API reads SQLite
    ↓
Static shell fetches and renders
```

### Image Handling

**Storage:** `/uploads/guides/<slug>/<hash>-<filename>`
**Serving:** Nginx with long-term cache headers
**URLs:** Root-relative paths `/uploads/guides/...`

Cover images are stored separately from content, allowing flexible aspect ratios and future optimization without republishing.

## Constraints

### Infrastructure
- Server: 1.6GB RAM, cannot access GitHub
- Deployment: Local build + SCP upload
- No server-side Next.js builds
- PM2 process management

### Content Workflow
- Obsidian-first authoring (no web CMS)
- CLI-based publishing
- SQLite as content database
- Images uploaded separately from content

### Design
- Mobile-first responsive design
- Support for Chinese content (primary language)
- White/light color scheme (AI Hero inspired)
- Maintain fast load times on mobile

## Open Questions

- Cover image aspect ratio standard (currently flexible)
- Featured/pinned guide selection mechanism
- Tag taxonomy and display limits
- Mock data strategy for incomplete sections
