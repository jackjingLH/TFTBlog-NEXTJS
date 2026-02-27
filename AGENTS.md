# 仓库协作指南

## 交流与回复约定
- 与本仓库相关的协作、评审、说明默认使用中文回复。
- 如需英文输出，需在当前任务中明确提出。

## 项目结构与模块划分
- `app/`：Next.js App Router 页面与接口（如 `app/api/**/route.ts`）。
- `app/components/`：页面与后台复用组件。
- `lib/`：通用逻辑（数据库连接、解析、缓存、服务）；`models/`：Mongoose 模型。
- `types/`：共享 TypeScript 类型与声明扩展。
- `public/guides/<slug>/`：攻略 Markdown 与生成图片；`docs/`：部署与运维文档。
- `scripts/`：抓取、清理、管理类脚本。

## 构建、测试与开发命令
- `npm install`：安装依赖（基于 `package-lock.json`）。
- `npm run dev`：本地开发（`http://localhost:3000`）。
- `npm run lint`：运行 ESLint（Next.js + TypeScript 规则）。
- `npm run build`：生产构建并进行类型/构建校验。
- `npm run start`：启动构建产物。
- `node scripts/fetch-all.js`：批量抓取各平台内容。
- `node scripts/check-prerequisites.js`：检查环境变量、MongoDB、RSSHub 可用性。

## 代码风格与命名规范
- 使用 TypeScript 严格模式，接口层与数据库边界保持显式类型。
- 遵循现有风格：2 空格缩进、单引号、语句分号。
- 保持 Next.js 约定文件名：`page.tsx`、`layout.tsx`、`route.ts`。
- 组件用 PascalCase（如 `GuidesList.tsx`）；函数/变量用 camelCase；内容目录用 kebab-case。
- 优先使用 `@/*` 路径别名导入。

## 测试与提交流程
- 当前未配置专门单元测试框架；每次改动至少执行 `npm run lint` 与 `npm run build`。
- 涉及抓取逻辑时，运行对应 `scripts/` 脚本并检查日志/输出。
- 提交信息建议使用 Conventional Commits：`feat:`、`fix:`、`refactor:`、`docs:`，避免无意义短提交。
- PR 应包含：变更说明、影响路径、环境变量变更、验证步骤；UI 改动附截图。

## 安全与配置
- 复制 `.env.example` 为 `.env.local`，严禁提交任何本地密钥文件。
- 将 `.mongodb-credentials.txt`、生产地址、认证配置视为敏感信息。
- 涉及 `auth.ts`、`middleware.ts` 的改动需在 PR 中单独说明风险与回滚方式。
