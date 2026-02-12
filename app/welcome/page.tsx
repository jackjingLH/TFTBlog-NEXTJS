import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

/**
 * 普通用户欢迎页面
 */
export default async function WelcomePage() {
  const session = await auth();

  // 未登录重定向到登录页
  if (!session) {
    redirect('/login');
  }

  // 管理员重定向到控制台
  if (session.user.role === 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              欢迎，{session.user.name}！
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              你已成功登录 TFT Blog
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              账号信息
            </h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">邮箱：</dt>
                <dd className="text-gray-900 dark:text-white font-medium">
                  {session.user.email}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">角色：</dt>
                <dd className="text-gray-900 dark:text-white font-medium">
                  普通用户
                </dd>
              </div>
            </dl>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
              更多功能正在开发中...
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
