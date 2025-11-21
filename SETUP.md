# TFT金铲铲博客 - Next.js 全栈项目

## ✅ 已完成配置

### 1. 项目初始化
- ✅ Next.js 14 + TypeScript
- ✅ Tailwind CSS
- ✅ ESLint
- ✅ App Router

### 2. 数据库配置
- ✅ MongoDB (Mongoose)
- ✅ 云数据库连接: `mongodb://47.99.202.3:27017/tftblog`
- ✅ 数据库连接工具: `lib/mongodb.ts`
- ✅ 环境变量配置: `.env.local`

### 3. API Routes
- ✅ `/api/posts` - 获取文章列表
- ✅ `/api/categories` - 获取分类列表

## 🚀 快速开始

### 1. 安装依赖
```bash
cd D:/code/TEXTCODE/tftblog-nextjs
npm install
```

### 2. 配置环境变量
已创建 `.env.local`，包含：
- MONGODB_URI
- JWT_SECRET

### 3. 启动开发服务器
```bash
npm run dev
```

访问: http://localhost:3000

### 4. 测试 API
- http://localhost:3000/api/posts
- http://localhost:3000/api/categories

## 📁 项目结构

```
tftblog-nextjs/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── posts/         # 文章 API
│   │   └── categories/    # 分类 API
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首页
├── lib/                   # 工具函数
│   └── mongodb.ts         # MongoDB 连接
├── types/                 # TypeScript 类型
│   └── mongoose.d.ts      # Mongoose 全局类型
├── .env.local             # 环境变量
├── package.json
└── tsconfig.json
```

## 📊 云数据库数据

已有数据（由之前的项目初始化）：
- **5个分类**: 阵容攻略、英雄解析、装备合成、版本更新、新手教程
- **5篇文章**: 包含完整内容、标签、浏览量等

## 🔨 下一步开发

### 1. 完善 API Routes
- [ ] 添加单篇文章查询 `/api/posts/[slug]`
- [ ] 添加按分类查询 `/api/categories/[slug]/posts`
- [ ] 添加管理员登录 `/api/admin/login`
- [ ] 添加文章管理 CRUD 接口

### 2. 开发前端页面
- [ ] 首页展示文章列表
- [ ] 文章详情页
- [ ] 分类筛选页
- [ ] 管理后台

### 3. 添加功能
- [ ] 搜索功能
- [ ] 标签过滤
- [ ] 分页组件
- [ ] SEO 优化

## 📝 API 使用示例

### 获取文章列表
```typescript
const response = await fetch('/api/posts?page=1&limit=10');
const data = await response.json();
```

### 获取分类列表
```typescript
const response = await fetch('/api/categories');
const data = await response.json();
```

## 🔧 开发命令

```bash
npm run dev      # 开发模式
npm run build    # 构建生产版本
npm run start    # 启动生产服务器
npm run lint     # 代码检查
```

## 📦 已安装依赖

- next: 14.2.33
- react: ^18
- mongoose: ^8
- typescript: ^5
- tailwindcss: ^3.4.1

## 🌐 部署

### 本地测试
```bash
npm run build
npm run start
```

### 云端部署
可部署到：
- Vercel (推荐)
- Railway
- 宝塔面板
- Docker

## ⚠️ 注意事项

1. `.env.local` 文件包含敏感信息，不要提交到 Git
2. 生产环境需要修改 JWT_SECRET
3. MongoDB URI 需要根据环境切换
4. 首次运行需要确保云数据库可访问

## 🎯 旧项目备份

旧项目数据已备份在:
- `D:/code/TEXTCODE/tftblog/_backup_config.txt`
- 云数据库中的数据完整保留

---

**项目状态**: ✅ 基础框架搭建完成，可以开始开发
**下一步**: 测试 API 接口，然后开发前端页面
