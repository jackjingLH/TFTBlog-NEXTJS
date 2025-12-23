# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供此项目的开发指南。

## 🚫 禁止行为

1. **禁止自动创建 Markdown 文档**
   - ❌ 不主动生成 README、指南、报告、总结等 .md 文件
   - ❌ 不生成技术文档、使用说明、最佳实践等文档
   - ❌ 不创建架构说明、API 文档、部署指南等
   - ✅ 仅在用户明确要求时才创建文档

2. **脚本文件管理**
   - ✅ 可以创建必要的脚本文件（.sh、.bat、.js 等）
   - ✅ 脚本文件用于自动化任务、数据抓取、部署等

3. **文件管理原则**
   - ❌ 避免创建测试文件、备份文件、临时文件
   - ❌ 不创建多个版本的同一功能文件
   - ✅ 保持代码库简洁，只保留必要文件

## 项目概述

TFT金铲铲博客 (TFT Blog) - 一个基于 Next.js 的全栈博客应用，专注于云顶之弈内容聚合，包括阵容攻略、英雄解析、装备合成、版本更新和新手教程。

## 开发命令

```bash
npm run dev      # 启动开发服务器 http://localhost:3000
npm run build    # 构建生产版本
npm run start    # 启动生产服务器
npm run lint     # 运行 ESLint 代码检查
```

## 技术架构

### 技术栈
- **框架**: Next.js 14 with App Router
- **语言**: TypeScript (严格模式)
- **数据库**: MongoDB (Mongoose 8.x)
- **样式**: Tailwind CSS
- **进程管理**: PM2 (生产环境)

### 目录结构

```
app/
├── api/              # API 路由 (Next.js route handlers)
│   ├── posts/        # 文章接口
│   ├── categories/   # 分类接口
│   ├── feeds/        # RSS 聚合接口
│   └── about/        # 关于页面接口
├── components/       # React 组件
│   ├── Navbar.tsx
│   └── FeedList.tsx
├── about/            # 关于页面
│   └── page.tsx
├── layout.tsx        # 根布局
└── page.tsx          # 首页

lib/
├── mongodb.ts        # MongoDB 连接工具（带缓存）
└── services/         # 服务层
    ├── cache.service.ts     # 缓存服务
    ├── rsshub.service.ts    # RSSHub 服务
    └── tftimes.service.ts   # TFT Times 服务

types/
├── article.ts        # 文章类型定义
└── mongoose.d.ts     # Mongoose 全局类型
```

### 数据库连接模式

项目在 `lib/mongodb.ts` 中使用缓存的 MongoDB 连接模式：
- 全局缓存连接，防止开发环境热重载时产生多个连接
- 使用 Mongoose，设置 `bufferCommands: false`
- 需要 `MONGODB_URI` 环境变量
- 首次请求时建立连接（懒加载）

### API 路由模式

API 路由遵循 Next.js App Router 约定：
- 位于 `app/api/[resource]/route.ts`
- 导出异步函数：`GET`, `POST`, `PUT`, `DELETE`
- 通过 `mongoose.connection.db` 直接访问 MongoDB 集合
- 支持 `page` 和 `limit` 查询参数分页
- 返回标准化的 JSON 响应，包含 `status`、`data` 和元数据

API 响应结构示例：
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

### 路径别名

项目使用 `@/*` 路径别名指向根目录（在 tsconfig.json 中配置）。

导入示例：
```typescript
import dbConnect from '@/lib/mongodb';
import { Article } from '@/types/article';
```

## 环境变量

开发环境（`.env.local`）和生产环境（`.env.production`）所需的环境变量：

```env
MONGODB_URI=mongodb://47.99.202.3:27017/tftblog
JWT_SECRET=your-secret-key
NODE_ENV=development|production
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 数据库架构

MongoDB 数据库包含以下集合：

### posts 集合
- 文章数据：标题、内容、标签、浏览量、创建时间
- 预置了 5 篇示例文章

### categories 集合
- 5 个分类：阵容攻略、英雄解析、装备合成、版本更新、新手教程

### about 集合
- 关于页面内容
- 包含：标题、描述、Markdown 内容、特性列表、统计数据

### chat 集合
- 聊天或反馈记录（遗留数据）

## API 接口测试

开发环境 API 端点：
- `http://localhost:3000/api/posts?page=1&limit=10` - 获取分页文章
- `http://localhost:3000/api/categories` - 获取所有分类
- `http://localhost:3000/api/feeds?limit=15` - 获取 RSS 聚合内容
- `http://localhost:3000/api/about` - 获取关于页面数据

## 部署方式

### ⚠️ 重要说明

**服务器无法访问 GitHub**，因此采用**本地构建 + SCP 上传**的部署方式。

### 部署流程

#### 1. 本地构建

```bash
# 在本地构建生产版本
npm run build
```

构建产物位于 `.next` 目录。

#### 2. 上传构建产物

```bash
# 使用 SCP 上传 .next 目录到服务器
scp -r .next root@47.99.202.3:/var/www/TFTBlog-NEXTJS/
```

#### 3. 重启 PM2 应用

```bash
# SSH 连接服务器并重启应用
ssh root@47.99.202.3 "cd /var/www/TFTBlog-NEXTJS && pm2 restart tftblog-nextjs && pm2 save"
```

#### 4. 验证部署

```bash
# 测试生产环境页面
curl -I http://47.99.202.3/about

# 测试 API 接口
curl http://47.99.202.3/api/about
```

### 完整部署脚本示例

```bash
# 本地构建
npm run build

# 上传到服务器
scp -r .next root@47.99.202.3:/var/www/TFTBlog-NEXTJS/

# 重启应用
ssh root@47.99.202.3 "cd /var/www/TFTBlog-NEXTJS && pm2 restart tftblog-nextjs && pm2 save"

# 验证部署
curl -I http://47.99.202.3/
```

### PM2 配置

生产环境使用 PM2 进行进程管理：
- 配置文件：`ecosystem.config.js`
- 应用名称：`tftblog-nextjs`
- 实例数：1
- 内存限制：1G

```bash
# PM2 常用命令
pm2 status                    # 查看应用状态
pm2 logs tftblog-nextjs      # 查看日志
pm2 restart tftblog-nextjs   # 重启应用
pm2 stop tftblog-nextjs      # 停止应用
pm2 save                     # 保存当前进程列表
```

## 文件管理规范

### 🚫 避免文件重复

**原则：不要为同一功能创建重复文件。**

开发时遵循：

1. **单一数据源**：每个功能只应有一个专用文件
2. **修改现有文件**：不要创建新版本，而是更新现有文件
3. **整合相关代码**：将相似功能保持在逻辑分组中
4. **避免测试文件泛滥**：验证后删除测试文件，不要保留多个版本

**错误示例：**
- 存在 `deploy.bat` 时创建 `deploy-v2.bat` → 应该：修改 `deploy.bat`
- 存在 `test-api.ts` 时创建 `test-api-new.ts` → 应该：更新 `test-api.ts`
- 存在 `config.js` 时创建 `config-backup.js` → 应该：修改 `config.js`

**正确流程：**
1. 检查功能对应的文件是否已存在
2. 如果存在，修改现有文件
3. 如果不存在，创建命名规范的新文件
4. 使用后删除临时/测试文件

## 数据库连接详情

云端 MongoDB 实例：`mongodb://47.99.202.3:27017/tftblog`

注意：这是一个现有的云数据库，包含从之前项目迁移的预置数据。

## RSS 聚合服务

项目从以下来源聚合内容：

1. **RSSHub** - 开源 RSS 订阅服务
   - 荡狗天天开心
   - 手刃猫咪
   - 襄平霸王东

2. **TFT Times** - 日本云顶之弈资讯站
   - 分类：メタ＆攻略、パッチノート、ニュース

### 缓存策略

- 内存缓存：15 分钟
- 缓存服务：`lib/services/cache.service.ts`
- 手动刷新：`POST /api/feeds/refresh`

## 生产环境信息

- **服务器地址**：47.99.202.3
- **访问地址**：http://47.99.202.3
- **项目路径**：/var/www/TFTBlog-NEXTJS
- **Nginx 配置**：反向代理到 localhost:3000
- **日志路径**：
  - Nginx: `/www/wwwlogs/tftblog.log`
  - MongoDB: `/www/server/mongodb/log/mongodb.log`
  - PM2: `pm2 logs tftblog-nextjs`


