import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import DashboardNav from './components/DashboardNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 侧边栏 + 内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* 侧边导航 */}
          <aside className="w-64 flex-shrink-0">
            <DashboardNav />
          </aside>

          {/* 主内容区 */}
          <main className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
