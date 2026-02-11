import Link from 'next/link';
import { auth } from '@/auth';
import { signOut } from '@/auth';

export default async function Navbar() {
  const session = await auth();

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
              TFT Blog
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            <Link
              href="/"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              首页
            </Link>
            <Link
              href="/guides"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              攻略
            </Link>
            <Link
              href="/about"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              关于
            </Link>

            {/* 已登录时显示控制台链接、用户信息和退出按钮 */}
            {session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  控制台
                </Link>
                <span className="text-sm text-gray-600 dark:text-gray-400">
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
