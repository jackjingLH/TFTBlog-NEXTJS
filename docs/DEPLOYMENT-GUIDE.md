# Next.js 生产环境部署完全指南

本文档详细解释 Next.js 应用在生产环境中的工作原理，包括构建产物、进程管理和 Web 服务器配置。

---

## 目录

1. [Next.js 构建产物 (.next) 详解](#nextjs-构建产物-next-详解)
2. [PM2 进程管理器完全指南](#pm2-进程管理器完全指南)
3. [Nginx 反向代理配置详解](#nginx-反向代理配置详解)
4. [完整部署架构工作流程](#完整部署架构工作流程)
5. [性能优化与监控](#性能优化与监控)

---

## Next.js 构建产物 (.next) 详解

### 什么是 .next 目录？

当你运行 `npm run build` 时，Next.js 会执行生产环境优化构建，所有构建产物都存放在 `.next` 目录中。

### .next 目录结构

```
.next/
├── cache/                    # 构建缓存（加速重复构建）
│   ├── webpack/              # Webpack 缓存
│   └── swc/                  # SWC 编译器缓存
│
├── server/                   # 服务器端代码
│   ├── app/                  # App Router 页面（服务端组件）
│   │   ├── page.js           # 主页服务端代码
│   │   ├── about/            # 关于页面
│   │   │   └── page.js
│   │   └── api/              # API 路由
│   │       ├── about/
│   │       │   └── route.js  # /api/about 接口
│   │       └── feeds/
│   │           └── route.js  # /api/feeds 接口
│   │
│   ├── pages/                # Pages Router (如果使用)
│   ├── chunks/               # 代码分割的块
│   └── middleware.js         # 中间件（如果有）
│
├── static/                   # 静态资源
│   ├── chunks/               # 静态 JavaScript 块
│   ├── css/                  # 提取的 CSS 文件
│   └── media/                # 图片、字体等媒体文件
│
├── BUILD_ID                  # 构建 ID（用于缓存管理）
├── package.json              # 依赖信息
├── required-server-files.json # 运行时需要的文件列表
└── routes-manifest.json      # 路由映射表
```

### 构建过程详解

#### 1. **编译阶段**

```bash
npm run build
```

**执行流程：**

```
源代码 (TypeScript/JSX)
    ↓
[SWC/Babel 编译]
    ↓
JavaScript (ES5/ES6)
    ↓
[Webpack 打包]
    ↓
优化的 Bundle
    ↓
.next 目录
```

**关键操作：**
- **代码转译**：TypeScript → JavaScript，JSX → React.createElement()
- **代码分割**：根据路由自动分割代码，实现按需加载
- **Tree Shaking**：移除未使用的代码
- **压缩混淆**：减小文件体积
- **CSS 提取**：将 CSS 提取为独立文件

#### 2. **静态生成 (SSG)**

对于标记为静态的页面：

```typescript
// app/about/page.tsx
export default function About() {
  // 构建时生成 HTML
  return <div>关于页面</div>
}
```

**构建输出：**
- `.next/server/app/about/page.js` - 服务端代码
- `.next/server/app/about.html` - 预渲染的 HTML（如果是纯静态）

#### 3. **服务端渲染 (SSR)**

对于需要动态数据的页面：

```typescript
// app/api/feeds/route.ts
export async function GET(request: NextRequest) {
  // 每次请求时执行
  const data = await fetchFromDatabase()
  return NextResponse.json(data)
}
```

**运行时行为：**
- 代码在 Node.js 服务器上执行
- 每次请求都会调用函数
- 返回动态生成的响应

### .next 如何在服务器上工作？

#### 启动流程

```bash
# 在服务器上启动应用
npm run start
# 等同于
node .next/standalone/server.js  # 如果使用 standalone 模式
# 或
node node_modules/next/dist/bin/next start
```

**运行时流程：**

```
用户请求
    ↓
http://47.99.202.3/about
    ↓
[Nginx 接收]
    ↓
反向代理到 localhost:3000
    ↓
[Next.js 服务器]
    ↓
1. 查找路由: /about
2. 读取: .next/server/app/about/page.js
3. 执行服务端代码
4. 渲染 React 组件
5. 返回 HTML + JavaScript
    ↓
[Nginx 转发]
    ↓
用户浏览器接收响应
    ↓
浏览器执行客户端 JavaScript
    ↓
页面交互激活（Hydration）
```

#### 关键概念：水合 (Hydration)

**服务端：**
```javascript
// .next/server/app/about/page.js
// 渲染 React 组件为 HTML 字符串
const html = ReactDOMServer.renderToString(<AboutPage />)
```

**客户端：**
```javascript
// .next/static/chunks/app/about/page.js
// 将 React 组件"附加"到已有的 HTML 上
ReactDOM.hydrateRoot(document.getElementById('root'), <AboutPage />)
```

**效果：**
1. 用户立即看到完整的 HTML（快速首屏）
2. JavaScript 加载后，页面变为可交互的 React 应用

---

## PM2 进程管理器完全指南

### PM2 是什么？

**PM2 (Process Manager 2)** 是一个**生产级别的 Node.js 进程管理器**，用于：
- 保持应用持续运行
- 自动重启崩溃的应用
- 负载均衡（多进程模式）
- 日志管理
- 性能监控

### 为什么需要 PM2？

#### 问题：直接运行 Node.js 的缺陷

```bash
# 直接启动 Next.js
node .next/standalone/server.js
```

**缺点：**
1. ❌ 进程崩溃后不会自动重启
2. ❌ 终端关闭后进程停止
3. ❌ 无法查看历史日志
4. ❌ 无法进行性能监控
5. ❌ 无法实现零停机重启

#### 解决方案：使用 PM2

```bash
# PM2 启动应用
pm2 start ecosystem.config.js
```

**优点：**
1. ✅ 自动重启崩溃的进程
2. ✅ 后台运行，终端关闭也不影响
3. ✅ 自动记录日志
4. ✅ 提供性能监控面板
5. ✅ 支持零停机重启（reload）

### PM2 配置文件详解

#### ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    // 应用名称（用于管理和日志）
    name: 'tftblog-nextjs',

    // 启动脚本路径
    script: 'node_modules/next/dist/bin/next',

    // 传递给脚本的参数
    args: 'start',

    // 工作目录
    cwd: '/var/www/TFTBlog-NEXTJS',

    // 实例数量
    instances: 1,              // 单个实例
    // instances: 'max',       // 使用所有 CPU 核心（集群模式）

    // 执行模式
    exec_mode: 'cluster',      // 集群模式（支持多实例和零停机重启）
    // exec_mode: 'fork',      // 单进程模式

    // 内存限制（超过后自动重启）
    max_memory_restart: '1G',

    // 环境变量
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      MONGODB_URI: 'mongodb://47.99.202.3:27017/tftblog'
    },

    // 开发环境变量
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    },

    // 日志配置
    error_file: '/var/log/pm2/tftblog-error.log',
    out_file: '/var/log/pm2/tftblog-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // 自动重启配置
    autorestart: true,         // 崩溃后自动重启
    watch: false,              // 不监听文件变化（生产环境关闭）
    max_restarts: 10,          // 最大重启次数
    min_uptime: '10s',         // 最小运行时间（避免频繁重启）

    // 启动延迟
    listen_timeout: 3000,      // 等待应用启动的时间
    kill_timeout: 5000,        // 停止应用的超时时间
  }]
}
```

### PM2 工作原理

#### 进程管理架构

```
┌─────────────────────────────────────┐
│         PM2 Daemon (守护进程)        │
│  - 监控所有应用                      │
│  - 自动重启崩溃进程                  │
│  - 收集日志和性能数据                │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌──────▼──────┐
│  Instance 1 │  │  Instance 2 │  (如果 instances > 1)
│             │  │             │
│ Next.js     │  │ Next.js     │
│ Server      │  │ Server      │
│ Port: 3000  │  │ Port: 3001  │
└─────────────┘  └─────────────┘
```

#### 自动重启机制

```javascript
// 应用代码发生错误
throw new Error('Database connection failed')

// PM2 检测到进程退出
PM2 Daemon: 检测到进程 'tftblog-nextjs' 崩溃
            ↓
PM2 Daemon: 等待 min_uptime (10秒)
            ↓
PM2 Daemon: 重启进程 (尝试 1/10)
            ↓
PM2 Daemon: 新进程启动成功
            ↓
PM2 Daemon: 继续监控...
```

### PM2 常用命令详解

#### 启动和管理

```bash
# 1. 启动应用
pm2 start ecosystem.config.js
pm2 start app.js --name "my-app"

# 2. 查看所有应用状态
pm2 status
pm2 list
# 输出示例：
# ┌────┬──────────────┬─────────┬─────────┬──────────┬────────┐
# │ id │ name         │ mode    │ pid     │ status   │ cpu    │
# ├────┼──────────────┼─────────┼─────────┼──────────┼────────┤
# │ 1  │ tftblog-next │ cluster │ 1283865 │ online   │ 0.3%   │
# └────┴──────────────┴─────────┴─────────┴──────────┴────────┘

# 3. 重启应用
pm2 restart tftblog-nextjs        # 标准重启（会有短暂停机）
pm2 reload tftblog-nextjs         # 零停机重启（推荐）

# 4. 停止和删除
pm2 stop tftblog-nextjs           # 停止应用
pm2 delete tftblog-nextjs         # 删除应用

# 5. 保存当前进程列表（开机自启）
pm2 save
pm2 startup                       # 生成开机启动脚本
```

#### 日志管理

```bash
# 查看实时日志
pm2 logs tftblog-nextjs           # 所有日志
pm2 logs tftblog-nextjs --lines 100  # 最近100行

# 清空日志
pm2 flush

# 查看日志文件
tail -f /var/log/pm2/tftblog-out.log
tail -f /var/log/pm2/tftblog-error.log
```

#### 监控和调试

```bash
# 实时监控（CPU、内存）
pm2 monit

# 详细信息
pm2 show tftblog-nextjs
# 输出：
#   status            : online
#   memory usage      : 48.2mb
#   uptime            : 2h
#   script path       : /var/www/TFTBlog-NEXTJS/.next/...
#   error log path    : /var/log/pm2/tftblog-error.log
#   out log path      : /var/log/pm2/tftblog-out.log

# 性能分析
pm2 plus                          # 连接到 PM2 Plus（云监控）
```

### PM2 集群模式 vs Fork 模式

#### Fork 模式（单进程）

```javascript
{
  instances: 1,
  exec_mode: 'fork'
}
```

**特点：**
- 只运行一个 Node.js 进程
- 简单直接，资源占用少
- 重启时会有短暂停机

**适用场景：**
- 低流量应用
- 开发环境

#### Cluster 模式（多进程）

```javascript
{
  instances: 4,        // 或 'max' 使用所有 CPU 核心
  exec_mode: 'cluster'
}
```

**特点：**
- 运行多个 Node.js 进程
- 自动负载均衡
- 支持零停机重启
- 充分利用多核 CPU

**工作原理：**

```
用户请求
    ↓
Nginx → localhost:3000
    ↓
PM2 Master Process (负载均衡器)
    ↓
┌─────┼─────┼─────┼─────┐
│     │     │     │     │
Worker Worker Worker Worker
(3000) (3000) (3000) (3000)
```

**零停机重启流程：**

```
pm2 reload tftblog-nextjs

1. 启动新 Worker 1'
2. 等待 Worker 1' 就绪
3. 停止旧 Worker 1
4. 启动新 Worker 2'
5. 等待 Worker 2' 就绪
6. 停止旧 Worker 2
... 依次类推

结果：全程保持至少 3 个 Worker 在线
```

---

## Nginx 反向代理配置详解

### Nginx 是什么？

**Nginx** 是一个高性能的 **Web 服务器**和**反向代理服务器**。

### 为什么需要 Nginx？

#### 直接访问 Next.js 的问题

```
用户浏览器 → http://47.99.202.3:3000 → Next.js 服务器
```

**缺点：**
1. ❌ 端口暴露（需要记住端口号）
2. ❌ 无法处理静态资源缓存
3. ❌ 无法实现 HTTPS
4. ❌ 无法部署多个应用（端口冲突）
5. ❌ 缺少安全防护（DDoS、限流）

#### 使用 Nginx 反向代理

```
用户浏览器 → http://47.99.202.3 (80端口)
                ↓
           [Nginx 处理]
                ↓
    → localhost:3000 (Next.js)
```

**优点：**
1. ✅ 使用标准 80/443 端口
2. ✅ 静态资源缓存，提升性能
3. ✅ 支持 HTTPS (SSL/TLS)
4. ✅ 一个服务器运行多个应用
5. ✅ 内置安全防护功能

### 项目 Nginx 配置详解

#### /etc/nginx/sites-available/tftblog (或 nginx.conf)

```nginx
# HTTP 服务器块
server {
    # 监听端口
    listen 80;

    # 服务器名称（域名或IP）
    server_name 47.99.202.3;
    # server_name tftblog.com www.tftblog.com;  # 生产环境使用域名

    # 访问日志
    access_log /www/wwwlogs/tftblog.log;

    # 错误日志
    error_log /www/wwwlogs/tftblog-error.log;

    # 反向代理到 Next.js 应用
    location / {
        # 代理目标（Next.js 服务器地址）
        proxy_pass http://localhost:3000;

        # HTTP 版本（支持 WebSocket）
        proxy_http_version 1.1;

        # WebSocket 支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # 传递原始 Host 头
        proxy_set_header Host $host;

        # 绕过缓存（用于 Upgrade 头）
        proxy_cache_bypass $http_upgrade;

        # 传递真实客户端 IP
        proxy_set_header X-Real-IP $remote_addr;

        # 传递代理链 IP
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 传递协议（http/https）
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js 静态资源优化
    location /_next/static {
        # 代理到 Next.js
        proxy_pass http://localhost:3000;

        # 缓存 60 分钟
        proxy_cache_valid 200 60m;

        # 添加缓存控制头
        add_header Cache-Control "public, immutable";
    }

    # 公共静态文件
    location /public {
        proxy_pass http://localhost:3000;
    }
}
```

### 配置项详解

#### 1. **基础配置**

```nginx
listen 80;
server_name 47.99.202.3;
```

**作用：**
- `listen 80`: 监听 80 端口（HTTP 默认端口）
- `server_name`: 匹配请求的域名/IP

**请求匹配流程：**
```
用户访问: http://47.99.202.3/about
         ↓
Nginx: 检查 server_name 是否匹配 "47.99.202.3" → ✅ 匹配
      ↓
Nginx: 使用此 server 块处理请求
```

#### 2. **反向代理核心配置**

```nginx
location / {
    proxy_pass http://localhost:3000;
}
```

**工作原理：**

```
客户端请求: GET http://47.99.202.3/about
              ↓
Nginx 接收: GET /about HTTP/1.1
            Host: 47.99.202.3
              ↓
Nginx 转发: GET http://localhost:3000/about HTTP/1.1
              ↓
Next.js 处理并返回响应
              ↓
Nginx 转发给客户端
```

#### 3. **请求头传递**

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

**为什么需要？**

```javascript
// Next.js 代码中获取客户端 IP
export async function GET(request: NextRequest) {
  // 如果没有 X-Real-IP 头，这里会是 127.0.0.1（Nginx 的 IP）
  const clientIP = request.headers.get('X-Real-IP')

  // 如果没有 X-Forwarded-Proto，HTTPS 重定向可能失败
  const protocol = request.headers.get('X-Forwarded-Proto')

  console.log(`真实客户端 IP: ${clientIP}`)  // 例如: 123.45.67.89
  console.log(`访问协议: ${protocol}`)       // http 或 https
}
```

**各个头的作用：**

| 头名称 | 作用 | 示例值 |
|--------|------|--------|
| `Host` | 原始请求的域名 | `tftblog.com` |
| `X-Real-IP` | 客户端真实 IP | `123.45.67.89` |
| `X-Forwarded-For` | 完整的代理链 | `123.45.67.89, 10.0.0.1` |
| `X-Forwarded-Proto` | 原始协议 | `https` |

#### 4. **WebSocket 支持**

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
proxy_cache_bypass $http_upgrade;
```

**为什么需要？**

Next.js 开发模式使用 WebSocket 进行热更新（HMR）：

```
浏览器                    Nginx                   Next.js
  |                        |                        |
  | ---- WebSocket握手 --> |                        |
  |                        | ---- 传递Upgrade头 --> |
  |                        |                        |
  | <-------- 建立WebSocket连接 ------------------- |
  |                        |                        |
  | <========= 实时通信 =========================> |
```

没有这些配置，HMR 会失败，导致开发体验下降。

#### 5. **静态资源缓存**

```nginx
location /_next/static {
    proxy_pass http://localhost:3000;
    proxy_cache_valid 200 60m;
    add_header Cache-Control "public, immutable";
}
```

**工作流程：**

```
首次请求: GET /_next/static/chunks/app.js
            ↓
Nginx: 缓存中未找到
            ↓
Nginx → Next.js 获取文件
            ↓
Nginx: 存储到缓存（60分钟）
            ↓
返回给客户端 + Cache-Control: public, immutable

第二次请求: GET /_next/static/chunks/app.js
            ↓
Nginx: 缓存命中！
            ↓
直接返回缓存内容（不访问 Next.js）
```

**性能提升：**
- 响应时间：从 ~50ms 降到 ~1ms
- Next.js 负载：减少 90%+

### Nginx 命令常用操作

```bash
# 测试配置文件语法
sudo nginx -t

# 重新加载配置（平滑重启，不中断服务）
sudo nginx -s reload

# 停止 Nginx
sudo nginx -s stop

# 优雅停止（处理完当前请求后停止）
sudo nginx -s quit

# 查看 Nginx 状态
sudo systemctl status nginx

# 启动 Nginx
sudo systemctl start nginx

# 查看错误日志
tail -f /www/wwwlogs/tftblog-error.log

# 查看访问日志
tail -f /www/wwwlogs/tftblog.log
```

---

## 完整部署架构工作流程

### 整体架构图

```
┌─────────────┐
│   用户浏览器   │
│ 123.45.67.89 │
└──────┬──────┘
       │ HTTP请求
       │ http://47.99.202.3/about
       ↓
┌────────────────────────────────────┐
│         服务器 (47.99.202.3)        │
│                                    │
│  ┌──────────────────────────────┐ │
│  │   Nginx (端口 80)             │ │
│  │   - 接收 HTTP 请求            │ │
│  │   - 静态资源缓存               │ │
│  │   - SSL终止 (如有HTTPS)        │ │
│  │   - 安全过滤                  │ │
│  └──────────┬───────────────────┘ │
│             │ 反向代理              │
│             │ http://localhost:3000 │
│             ↓                      │
│  ┌──────────────────────────────┐ │
│  │   PM2 进程管理器              │ │
│  │   - 进程监控                  │ │
│  │   - 自动重启                  │ │
│  │   - 日志收集                  │ │
│  │   - 负载均衡                  │ │
│  └──────────┬───────────────────┘ │
│             │                      │
│             ↓                      │
│  ┌──────────────────────────────┐ │
│  │   Next.js 应用                │ │
│  │   - 读取 .next 目录           │ │
│  │   - 执行服务端代码            │ │
│  │   - 渲染 React 组件           │ │
│  │   - API 路由处理              │ │
│  └──────────┬───────────────────┘ │
│             │                      │
│             ↓                      │
│  ┌──────────────────────────────┐ │
│  │   MongoDB (端口 27017)        │ │
│  │   - 存储文章、分类数据         │ │
│  │   - 关于页面内容              │ │
│  └──────────────────────────────┘ │
│                                    │
└────────────────────────────────────┘
```

### 请求处理完整流程

#### 示例：访问关于页面

```
1. 用户在浏览器输入: http://47.99.202.3/about
                    ↓
2. DNS 解析（如果是域名）
   47.99.202.3 → 服务器 IP
                    ↓
3. TCP 连接建立
   客户端 ←→ 服务器:80
                    ↓
4. HTTP 请求发送
   GET /about HTTP/1.1
   Host: 47.99.202.3
                    ↓
┌───────────────── Nginx ─────────────────┐
│                                          │
│ 5. Nginx 接收请求                         │
│    - 匹配 server_name: 47.99.202.3       │
│    - 匹配 location: /                    │
│    - 检查缓存: 未命中                     │
│                    ↓                     │
│ 6. Nginx 代理转发                         │
│    GET http://localhost:3000/about       │
│    Headers:                              │
│      X-Real-IP: 123.45.67.89            │
│      X-Forwarded-For: 123.45.67.89      │
│      X-Forwarded-Proto: http            │
│                                          │
└──────────────────┬───────────────────────┘
                   │
┌───────────────── PM2 ────────────────────┐
│                                          │
│ 7. PM2 接收请求                           │
│    - 检查进程状态: online ✅               │
│    - 转发到 Next.js 进程                  │
│                                          │
└──────────────────┬───────────────────────┘
                   │
┌────────────── Next.js ───────────────────┐
│                                          │
│ 8. Next.js 路由匹配                       │
│    /about → app/about/page.tsx           │
│                    ↓                     │
│ 9. 服务端组件执行                          │
│    - 检查是否缓存: 有缓存 → 返回缓存        │
│    - 无缓存: 执行组件代码                  │
│                    ↓                     │
│ 10. 客户端组件准备                         │
│     - 'use client' 标记的组件             │
│     - 准备 hydration 数据                │
│                    ↓                     │
│ 11. API 数据获取 (如果需要)                │
│     fetch('/api/about')                  │
│         ↓                                │
│     API Route: app/api/about/route.ts    │
│         ↓                                │
│  ┌──── MongoDB 查询 ────┐                │
│  │ db.collection('about') │               │
│  │ .findOne({})          │               │
│  └───────┬───────────────┘               │
│          │                               │
│          ↓                               │
│     返回 JSON 数据                         │
│                    ↓                     │
│ 12. 组件渲染                              │
│     React Component → HTML String        │
│                    ↓                     │
│ 13. 生成响应                              │
│     HTML + 内联数据 + JavaScript chunks   │
│                                          │
└──────────────────┬───────────────────────┘
                   │
┌───────────────── PM2 ────────────────────┐
│ 14. PM2 记录请求                          │
│     日志: GET /about 200 123ms           │
└──────────────────┬───────────────────────┘
                   │
┌───────────────── Nginx ──────────────────┐
│ 15. Nginx 接收响应                        │
│     - 添加缓存头                          │
│     - 记录访问日志                        │
│     - 压缩响应 (gzip)                     │
└──────────────────┬───────────────────────┘
                   │
                   ↓
16. 响应返回客户端
    HTTP/1.1 200 OK
    Content-Type: text/html
    Cache-Control: s-maxage=31536000

    <html>...</html>
                   ↓
17. 浏览器处理
    - 解析 HTML
    - 下载 JavaScript chunks
    - 执行 React hydration
    - 页面可交互 ✅
```

### 性能优化点

在这个架构中的优化：

1. **Nginx 层**
   - 静态资源缓存（减少 Next.js 负载）
   - Gzip 压缩（减少传输大小）
   - SSL 终止（Next.js 不处理 HTTPS）

2. **PM2 层**
   - 集群模式（充分利用多核 CPU）
   - 自动重启（提高可用性）
   - 内存限制（防止内存泄漏）

3. **Next.js 层**
   - 代码分割（按需加载）
   - 服务端渲染（快速首屏）
   - 增量静态生成（ISR）
   - React 缓存

4. **MongoDB 层**
   - 索引优化
   - 连接池复用
   - 查询缓存

---

## 性能优化与监控

### 监控指标

```bash
# 1. Nginx 性能
# 查看连接数
netstat -an | grep :80 | wc -l

# 查看访问日志统计
awk '{print $1}' /www/wwwlogs/tftblog.log | sort | uniq -c | sort -rn | head -10

# 2. PM2 监控
pm2 monit                # 实时监控
pm2 show tftblog-nextjs  # 详细信息

# 3. 系统资源
top                      # CPU/内存
df -h                    # 磁盘
free -m                  # 内存详情

# 4. Next.js 构建信息
ls -lh .next/static/chunks/  # 查看 bundle 大小
```

### 性能优化建议

```bash
# 1. 启用 Nginx 缓存
# 在 nginx.conf 中添加:
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;

location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 5m;
}

# 2. 启用 Gzip 压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;

# 3. PM2 集群模式
# ecosystem.config.js
{
  instances: 'max',  # 使用所有 CPU 核心
  exec_mode: 'cluster'
}

# 4. Next.js 优化
# next.config.js
module.exports = {
  compress: true,           # 启用压缩
  swcMinify: true,          # 使用 SWC 压缩
  images: {
    formats: ['image/webp'], # 使用 WebP 格式
  }
}
```

---

## 故障排查

### 常见问题诊断

```bash
# 1. 页面无法访问
# 检查 Nginx 状态
sudo systemctl status nginx
# 检查端口
netstat -tuln | grep :80

# 2. 应用崩溃
# 查看 PM2 日志
pm2 logs tftblog-nextjs --lines 100
# 检查错误日志
tail -f /var/log/pm2/tftblog-error.log

# 3. 数据库连接失败
# 测试 MongoDB
mongo mongodb://47.99.202.3:27017/tftblog --eval "db.stats()"
# 查看 MongoDB 日志
tail -f /www/server/mongodb/log/mongodb.log

# 4. 构建失败
# 清除缓存重新构建
rm -rf .next
npm run build
```

---

## 总结

### 核心概念回顾

1. **.next 目录**
   - 存储所有构建产物
   - 包含服务端代码、客户端代码和静态资源
   - 运行时 Next.js 读取此目录提供服务

2. **PM2**
   - 进程管理器，保持应用持续运行
   - 自动重启、日志管理、性能监控
   - 支持集群模式和零停机重启

3. **Nginx**
   - Web 服务器和反向代理
   - 处理 HTTP 请求，转发给 Next.js
   - 提供缓存、压缩、HTTPS 等功能

### 数据流总结

```
用户 → Nginx (80端口) → PM2 → Next.js (3000端口) → MongoDB (27017端口)
     ←        ←        ←       ←                    ←
```

这个三层架构提供了：
- **高可用性**（PM2 自动重启）
- **高性能**（Nginx 缓存、PM2 集群）
- **易维护**（日志集中、配置清晰）
- **安全性**（Nginx 防护、端口隔离）

希望这份详细的指南能帮助您深入理解 Next.js 生产部署的每个环节！
