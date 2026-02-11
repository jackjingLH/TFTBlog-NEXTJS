import { auth } from '@/auth';
import { NextResponse } from 'next/server';

/**
 * 路由保护中间件
 * @see https://authjs.dev/reference/nextjs#middleware
 * @see CLAUDE.md 项目规范
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // 受保护的路由
  const protectedPaths = ['/dashboard'];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  // 访问受保护路由但未登录 -> 重定向到登录页
  if (isProtectedPath && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 已登录访问登录页 -> 重定向到控制台
  if (pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/api/dashboard/:path*',
  ],
};
