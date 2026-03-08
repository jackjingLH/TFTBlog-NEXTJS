'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: '数据统计', icon: '📊' },
  { href: '/dashboard/fetch', label: '数据抓取', icon: '🔄' },
  { href: '/dashboard/aggregation', label: '聚合管理', icon: '🌐' },
  { href: '/dashboard/guides', label: '攻略管理', icon: '📝' },
  { href: '/dashboard/logs', label: '任务日志', icon: '📋' },
  { href: '/', label: '返回首页', icon: '🏠' },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-bgDark-700 rounded-lg shadow-sm p-4 border border-border">
      <ul className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-textLight-200 hover:bg-bgDark-600'
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
