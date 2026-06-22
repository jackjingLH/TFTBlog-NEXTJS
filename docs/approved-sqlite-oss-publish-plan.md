# SQLite + OSS/CDN 文章发布方案

来源：用户希望一步到位把 TFT 攻略发布链路从“文章和图片打包进项目”升级为“SQLite 内容库 + 阿里云 OSS/CDN 图片 + 发布后线上立刻可见”。用户已确认采用静态壳加运行时 API，并接受发布脚本通过 SSH/SCP 写服务器 SQLite。

## Goal

将攻略发布从代码仓库内置内容改为独立内容发布链路：

```text
Obsidian Markdown
  -> 本地发布脚本
  -> 图片上传阿里云 OSS/CDN
  -> 文章写入服务器 SQLite
  -> 线上静态壳通过运行时 API 读取 SQLite
```

发布新文章后，不需要重新 build 前端、不需要重新部署整包，线上列表和详情页应能立刻读取到新内容。

## Scope

1. 建立 SQLite 内容库，保存攻略元数据、正文 Markdown、标签和发布状态。
2. 建立阿里云 OSS 图片上传能力，图片不再进入 Git，也不进入 SQLite。
3. 建立本地发布脚本，解析 Obsidian Markdown、上传图片、替换正文图片 URL，并通过 SSH/SCP 写入服务器 SQLite。
4. 改造线上运行时 API，使当前低内存静态服务可以从 SQLite 返回攻略列表和详情。
5. 改造首页、攻略列表、攻略详情为静态壳 + API 数据加载，保留当前移动端阅读体验。
6. 迁移现有 5 篇文章为 SQLite + OSS/CDN 发布数据，并验证线上实时读取。

## Constraints

- 不做后台文章编辑器。
- 不做审核流。
- 不开放公网写入 API，第一版只允许本地 SSH/SCP 发布。
- 继续兼容低内存服务器，不在服务器执行 Next build。
- 图片正式链路走 OSS/CDN；`public/guides` 只作为迁移源或历史备份。
- CDN HTTPS 证书若尚未签发，代码必须允许通过 `OSS_PUBLIC_BASE_URL` 切换临时 HTTP CDN/OSS 公网域名或最终 CDN HTTPS 域名。
- 临时使用 `http://cdn.jingcc.cc` 可以绕开证书等待，但主站 `https://www.jingcc.cc` 可能因混合内容策略拦截 HTTP 图片；证书签发后应切回 `https://cdn.jingcc.cc` 并更新已发布内容 URL。
- AccessKey 只能放在 `.env.local` 或服务器环境变量中，不提交到 Git。

## Data Model

SQLite 至少包含：

```text
guides
- id
- slug
- title
- excerpt
- contentMarkdown
- coverUrl
- source
- updatedAt
- publishedAt
- status
- readingMinutes
- createdAt
- modifiedAt

guide_tags
- guideId
- tag
```

## Publishing Flow

目标命令：

```bash
npm run publish:guide "D:\ob\JLH\21 TFT\某篇攻略.md"
```

流程：

1. 读取 Markdown。
2. 校验 frontmatter：`title`、`tags`、`cover`、`source`、`updatedAt`。
3. 解析 Obsidian 图片引用：`![[name.png]]` 和 `![[name.png|560]]`。
4. 从 Obsidian 附件目录或文章相邻目录找到图片。
5. 上传图片到 OSS：`guides/<slug>/<hash>-<filename>`。
6. 将正文图片替换为 CDN/OSS 公网 URL。
7. 生成文章 payload。
8. 通过 SCP 上传 payload 到服务器临时目录。
9. 通过 SSH 执行服务器 import 脚本，将文章 upsert 到 SQLite。
10. 线上页面通过运行时 API 读取新内容。

## Runtime API

当前部署是静态 HTML + `scripts/static-mvp-server.mjs` 轻量 Node 服务。第一版不切回 `next start`，而是在轻量服务中增加运行时 API：

```text
GET /api/guides
GET /api/guides/:slug
```

API 从服务器 SQLite 读取数据并返回 JSON。前台页面作为静态壳，通过 fetch 获取数据。

## Validation

- `npm run check:guide-contract` 或新的发布前校验能发现缺字段、缺图片、OSS 配置缺失。
- `npm run publish:guide <md>` 成功后，线上 `/guides` 能看到新文章。
- 线上 `/guides/<slug>` 能打开新文章详情。
- 正文和封面图片 URL 使用 `OSS_PUBLIC_BASE_URL`，不再依赖 `/guides/<slug>/*.png`。
- 不执行服务器侧 Next build。
- PM2 静态服务保持低内存运行。
- Chrome DevTools 移动端检查详情页无横向溢出，图片正常加载。

## Risks

- SQLite 是单机文件数据库，适合当前单人/少量发布，不适合多人高并发写入。
- CDN HTTPS 证书签发前，最终 `https://cdn.jingcc.cc` 可能暂时不可用；实现要允许环境变量切换到临时 `http://cdn.jingcc.cc`，并在证书可用后切回 HTTPS。
- 如果 OSS Bucket 保持私有，需要在 CDN 侧启用私有 Bucket 授权回源；否则 CDN 能连到源站但会收到 OSS `AccessDenied`。
- OSS AccessKey 权限需要后续收紧到目标 bucket 最小权限。
- 如果服务器 SQLite 文件损坏或被覆盖，需要有备份/恢复流程。
