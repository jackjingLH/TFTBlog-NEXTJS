import Link from 'next/link';
import { auth } from '@/auth';
import { signOut } from '@/auth';

export default async function Navbar() {
  const session = await auth();

  return (
    <nav className="bg-bgDark-800 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-textLight-100">
              TFT Blog
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            <Link
              href="/"
              className="text-textLight-200 hover:text-textLight-100 transition-colors"
            >
              首页
            </Link>
            <Link
              href="/guides"
              className="text-textLight-200 hover:text-textLight-100 transition-colors"
            >
              攻略
            </Link>
            <Link
              href="/about"
              className="text-textLight-200 hover:text-textLight-100 transition-colors"
            >
              关于
            </Link>

            {/* 已登录时显示控制台链接、用户信息和退出按钮 */}
            {session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-primary-500 hover:text-primary-400 font-medium transition-colors"
                >
                  控制台
                </Link>
                <span className="text-sm text-textLight-300">
                  {session.user.email}
                </span>
                <form
                  action={async () => {
                    'use server';
                    await signOut({ redirectTo: '/' });
                  }}
                >
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
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
