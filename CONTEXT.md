# Project Context

## Domain Language

### Core Concepts

**Guide (攻略)**
A TFT strategy article authored in Obsidian Markdown and published to the site. Each guide contains:
- Title, tags, cover image
- Strategic content (team compositions, item builds, positioning)
- Metadata (source, update date, reading time)

**Guide Batch Publish (攻略批量发布)**
The operation of publishing a numbered range of Obsidian guide Markdown files into the production guide database. It uploads referenced guide images and upserts guide rows, but it is not a frontend deployment and does not synchronize data-reference tables.
_Avoid_: Full deployment, data reference sync, static rebuild

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

**AIHero-Inspired Editorial Style**
Visual direction for the site: minimal, reading-first, and close to AIHero's editorial content feel. It favors strong typography, clear content hierarchy, restrained borders, generous section rhythm, and simple image-led cards over decorative game UI.
_Avoid_: Generic Tailwind card grid, dashboard UI, game-themed decorative UI

**Content Card**
Visual component displaying guide summary:
- Cover image (aspect ratio TBD)
- Title and excerpt
- Tags and metadata (source, date)
- Click target linking to detail page

**Data Reference (资料)**
A compact TFT lookup entry for the latest imported TFT game facts such as champions, traits, and items. It supports browsing and quick recognition, not historical version lookup or a full interactive team-building tool.
_Avoid_: Asset, raw data, database row, historical archive

**Data Reference Table Sync (资料表同步)**
The deployment operation that replaces only the data-reference tables in the production SQLite database from a local staging copy. Guide tables remain production-owned and are not changed by this operation.
_Avoid_: Full database sync, guide sync, source import

**Item Detail (装备详细数据)**
Official factual fields attached to every item reference shown in the data index, such as effect text, crafting formula, and item rules. The detail is scannable in the data index rather than a separate item page, and is not strategy guidance, strength scoring, or recommended holder data.
_Avoid_: 装备攻略, 装备推荐, 强度评级

**Item Reference (装备资料)**
An item-table reference entry shown in the data index, even when another entry has the same display name. Official variants remain separate entries rather than being merged by name.
_Avoid_: Deduplicated item, canonical item

**Champion Reference (英雄资料)**
A champion-table reference entry shown in the data index even when it represents a special unit, dummy, orb, tome, or other non-standard game object. The data page should not silently filter these entries out of the hero tab.
_Avoid_: Playable champion only, normal unit only

**Champion Detail (英雄详细数据)**
Official factual fields attached to a champion reference and revealed on demand in the hero tab, covering its ability (name, type, description) and combat stats (cost-tier growth for attack and health, plus base defensive stats and role). Synergies reuse the champion's existing trait data. It is scannable factual lookup, not strategy guidance, strength scoring, or recommended item builds.
_Avoid_: 英雄攻略, 推荐出装, 强度评级, 阵容推荐
_Note_: Recommended equipment (recEquip) is intentionally excluded — the official source provides no data for it.

**Inline Champion Reference (正文英雄引用)**
A guide-body mention of a regular 1-5 cost champion name that gives readers a lightweight entry point to that champion's factual details while staying in the article. It is a reading aid, not champion strategy guidance, recommended equipment, strength scoring, composition recommendation, or a reference to special objects.
_Avoid_: 英雄攻略链接, 阵容推荐入口, 标签匹配

**Inline Data Reference (正文资料引用)**
攻略正文中第一次出现的资料名称，给读者一个轻量查看事实资料的入口。v1 覆盖英雄、装备、羁绊和强化符文；同名资料不在正文里做变体消歧，重复名称优先视为资料清理问题。
当多个资料名称在同一位置重叠时，优先匹配更长的资料名称；长度相同时按英雄、羁绊、装备、强化符文的顺序处理。
v1 在攻略页加载四类当前资料并在前端建索引，不在攻略导入阶段预提取或保存命中项。
卡片只展示已有资料 API 提供的事实字段：英雄技能与羁绊、羁绊描述与等级、装备效果与合成、强化符文品质与效果；不展示推荐、强度、阵容适配或胜率。
同一篇攻略里，同一个资料项只标记第一次；不同资料项可各自标记第一次。
_Avoid_: 多处重复标记, 正文维基化, 变体选择器, 攻略推荐入口

**Augment Reference (强化符文资料)**
An augment-table reference entry shown in the data index, sourced from the official simulator's buff/hex data and treated as factual lookup. It includes the augment's name, tier, icon, cleaned effect text, and rule notes when present. It is not augment recommendation, composition guidance, or win-rate analysis.
_Avoid_: 强化推荐, 海克斯攻略, 阵容适配, 胜率排行
_Note_: Rule notes are explanatory `<rules>` text split from the official description, not part of the main effect text.

**Special Object (特殊对象)**
A champion reference with no trait data or an unusual cost that still belongs in the hero tab. It should be labeled as 特殊对象 and sorted after regular 1-5 cost champions.
_Avoid_: Missing trait data, invalid champion

**Unavailable Data Type (未接入资料类型)**
A planned reference category shown as unavailable when the site does not yet have enough source data to make it useful.
_Avoid_: Empty section, broken feature

**Data Index Page (资料索引页)**
A mobile-first single-page reference view under `/data` that switches between champions, traits, and items. It favors quick scanning over deep per-entry detail pages.
_Avoid_: Wiki, database admin page, team builder

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
