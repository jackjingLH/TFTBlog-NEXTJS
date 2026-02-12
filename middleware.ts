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
  const userRole = req.auth?.user?.role;

  // 受保护的路由（需要管理员权限）
  const adminPaths = ['/dashboard'];
  const isAdminPath = adminPaths.some((path) => pathname.startsWith(path));

  // 访问管理员路由但未登录 -> 重定向到登录页
  if (isAdminPath && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 访问管理员路由但不是管理员 -> 重定向到欢迎页
  if (isAdminPath && isLoggedIn && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/welcome', req.url));
  }

  // 已登录访问登录页 -> 根据角色重定向
  if (pathname === '/login' && isLoggedIn) {
    if (userRole === 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    } else {
      return NextResponse.redirect(new URL('/welcome', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/welcome',
    '/api/dashboard/:path*',
  ],
};
