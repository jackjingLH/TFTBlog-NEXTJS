import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

/**
 * 路由保护中间件（Edge Runtime 兼容版本）
 * 使用轻量级 auth.config 避免数据库依赖
 * @see https://authjs.dev/reference/nextjs#middleware
 * @see CLAUDE.md 项目规范
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/welcome',
    '/api/dashboard/:path*',
  ],
};
