'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: '数据统计', icon: '📊' },
  { href: '/dashboard/fetch', label: '数据抓取', icon: '🔄' },
  { href: '/dashboard/aggregation', label: '聚合管理', icon: '🌐' },
  { href: '/dashboard/guides', label: '攻略管理', icon: '📝' },
  { href: '/', label: '返回首页', icon: '🏠' },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <ul className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
