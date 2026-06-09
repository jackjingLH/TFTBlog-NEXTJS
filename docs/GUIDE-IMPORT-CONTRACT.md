# TFT 攻略导入契约

本项目不提供后台编辑器。攻略内容继续从 Obsidian Markdown 导入，每篇文章必须放在：

```text
content/guides/<slug>/TFT.md
```

## 必填 Frontmatter

```yaml
---
title: 木灵族 纳尔
cover: dataTFT (75).png
source: tftacademy
updatedAt: 2026-06-04
tags:
  - 纳尔
  - 木灵族
  - 赌狗阵容
---
```

- `title`: 首页、列表页、详情页展示的标题。
- `cover`: 封面图片文件名，必须能在 `public/guides/<slug>/` 找到；支持 `dataTFT (75).png` 或 Obsidian 的 `![[dataTFT (75).png]]`。
- `source`: 内容来源名。
- `updatedAt`: 更新时间，格式固定为 `YYYY-MM-DD`。
- `tags`: 至少 1 个标签，前 8 个用于站内展示。

正文里的 `# 标题`、`标签：`、`封面：`、`来源：` 可以保留给 Obsidian 阅读，但站点元数据只读取 frontmatter，避免同一字段有两个事实来源。

## 导入检查

导入或上线前运行：

```bash
npm run check:guide-contract
npm run import:guide-assets
```

缺少必填字段、日期格式错误或封面图片不存在时，检查脚本会列出具体文章 slug 和错误原因。
