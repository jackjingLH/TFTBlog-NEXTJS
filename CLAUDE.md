# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TFT金铲铲博客 (TFT Blog) - A full-stack Next.js blog application for Teamfight Tactics content, including guides, hero analysis, equipment synthesis, version updates, and beginner tutorials.

## Development Commands

```bash
npm run dev      # Start development server on http://localhost:3000
npm run build    # Build production version
npm run start    # Start production server
npm run lint     # Run ESLint code checking
```

## Architecture

### Technology Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode enabled)
- **Database**: MongoDB (Mongoose 8.x)
- **Styling**: Tailwind CSS
- **Process Manager**: PM2 (for production deployment)

### Directory Structure

```
app/
├── api/              # API Routes (Next.js route handlers)
│   ├── posts/        # Article endpoints
│   └── categories/   # Category endpoints
├── components/       # React components
│   ├── Navbar.tsx
│   └── ArticleList.tsx
├── layout.tsx        # Root layout
└── page.tsx          # Homepage

lib/
└── mongodb.ts        # MongoDB connection utility with caching

types/
├── article.ts        # TypeScript interfaces for articles
└── mongoose.d.ts     # Global Mongoose type definitions
```

### Database Connection Pattern

The project uses a cached MongoDB connection pattern in `lib/mongodb.ts`:
- Connection is cached globally to prevent multiple connections in development hot-reloading
- Uses Mongoose with `bufferCommands: false` option
- Requires `MONGODB_URI` environment variable
- Connection is established lazily on first request

### API Routes Pattern

API routes use Next.js App Router conventions:
- Located in `app/api/[resource]/route.ts`
- Export async functions: `GET`, `POST`, `PUT`, `DELETE`
- Direct MongoDB collection access via `mongoose.connection.db`
- Support pagination with `page` and `limit` query parameters
- Return standardized JSON responses with `status`, `data`, and metadata

Example API response structure:
```typescript
{
  status: 'success',
  count: number,
  total: number,
  page: number,
  pageSize: number,
  data: Array
}
```

### Path Aliases

The project uses `@/*` path alias pointing to the root directory (configured in tsconfig.json).

Example imports:
```typescript
import dbConnect from '@/lib/mongodb';
import { Article } from '@/types/article';
```

## Environment Variables

Required environment variables (in `.env.local` for development, `.env.production` for production):

```
MONGODB_URI=mongodb://host:port/tftblog
JWT_SECRET=your-secret-key
NODE_ENV=development|production
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Schema

The MongoDB database contains two main collections:

**posts** collection:
- Contains articles with title, content, tags, views, createdAt
- Pre-populated with 5 sample articles

**categories** collection:
- 5 categories: 阵容攻略, 英雄解析, 装备合成, 版本更新, 新手教程

## Testing and Accessing APIs

API endpoints for development testing:
- `http://localhost:3000/api/posts?page=1&limit=10` - Get paginated posts
- `http://localhost:3000/api/categories` - Get all categories

## Deployment

The project includes PM2 configuration for production deployment:
- Config file: `ecosystem.config.js`
- App name: `tftblog-nextjs`
- Deployment guide: See `DEPLOYMENT.md`
- Deploy script: `./deploy.sh` (automated pull, build, restart)

Production deployment steps:
```bash
npm install
npm run build
pm2 start ecosystem.config.js
pm2 save
```

## File Management Guidelines

### 🚫 Avoid File Duplication

**PRINCIPLE: Do not create duplicate files for the same functionality.**

When working on this project:

1. **Single Source of Truth**: Each functionality should have only one dedicated file
2. **Modify Existing Files**: Instead of creating new versions, update the existing file
3. **Consolidate Related Code**: Keep similar functionality together in logical groups
4. **Avoid Test File Proliferation**: Delete test files after verification, don't keep multiple versions

**Examples of what NOT to do:**
- Creating `deploy-v2.bat` when `deploy.bat` exists → Instead: modify `deploy.bat`
- Creating `test-api-new.ts` when `test-api.ts` exists → Instead: update `test-api.ts`
- Creating `config-backup.js` when `config.js` exists → Instead: modify `config.js`

**Proper workflow:**
1. Check if a file for the functionality already exists
2. If yes, modify the existing file
3. If no, create a new well-named file
4. Delete temporary/test files after use

## Database Connection Details

Cloud MongoDB instance: `mongodb://47.99.202.3:27017/tftblog`

Note: This is an existing cloud database with pre-populated data from a previous project migration.
