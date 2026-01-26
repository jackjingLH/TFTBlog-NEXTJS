# 项目环境配置指南

## 🚀 新电脑开发环境搭建

### 第一步：克隆项目

```bash
git clone https://github.com/您的用户名/tftblog-nextjs.git
cd tftblog-nextjs
```

### 第二步：安装依赖

```bash
npm install
```

### 第三步：配置环境变量

#### 1. 复制环境变量模板

```bash
cp .env.example .env.local
```

#### 2. 获取数据库凭据

**方式 1**：询问项目负责人获取密码

**方式 2**：从团队密码管理器获取（如果有）

**方式 3**：从服务器获取
```bash
ssh root@47.99.202.3 "cat /var/www/TFTBlog-NEXTJS/.env.production"
```

#### 3. 填写真实凭据

编辑 `.env.local`，将以下占位符替换为真实值：
- `YOUR_PASSWORD_HERE` → 数据库密码
- `your-secret-key-here` → JWT 密钥
- `your_bilibili_cookie_here` → B站 Cookie（可选）

### 第四步：启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000` 验证是否成功。

---

## 🔐 数据库凭据说明

### 应用数据库账户
- **用户名**：`tftblog_user`
- **数据库**：`tftblog`
- **权限**：读写
- **密码**：请询问项目负责人或查看团队文档

### 管理员账户（谨慎使用）
- **用户名**：`admin`
- **数据库**：`admin`
- **权限**：全部权限
- **用途**：仅用于数据库管理操作

---

## ⚠️ 安全注意事项

1. **不要提交 `.env.local`** - 已在 `.gitignore` 中忽略
2. **不要提交 `.mongodb-credentials.txt`** - 已在 `.gitignore` 中忽略
3. **不要在代码中硬编码密码**
4. **定期更换密码**

---

## 🆘 常见问题

### Q: 找不到 `.env.local`？
A: 这是正常的，该文件被 Git 忽略。请按上述步骤从 `.env.example` 创建。

### Q: 连接数据库失败？
A: 检查：
1. `.env.local` 文件是否存在
2. 密码是否正确
3. 服务器 IP 是否正确
4. 本地网络能否访问服务器

### Q: 如何获取 B站 Cookie？
A: 
1. 登录 B站
2. 打开浏览器开发者工具（F12）
3. 访问任意 B站页面
4. Network 标签 → 找到请求 → 复制 Cookie

---

## 📞 联系方式

如有问题，请联系项目负责人。
