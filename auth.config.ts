import type { NextAuthConfig } from 'next-auth';

/**
 * NextAuth 边缘运行时配置（用于 middleware）
 * 不包含数据库依赖，仅用于会话验证和路由保护
 * @see https://authjs.dev/getting-started/session-management/protecting
 * @see CLAUDE.md 项目规范
 */
export const authConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnLogin = nextUrl.pathname.startsWith('/login');
      const isOnWelcome = nextUrl.pathname.startsWith('/welcome');

      // 访问 dashboard 需要登录
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // 重定向到登录页
      }

      // 已登录用户访问登录页，重定向到 dashboard
      if (isOnLogin && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      return true;
    },
  },
  providers: [], // 在 Edge Runtime 中不需要 providers
} satisfies NextAuthConfig;
