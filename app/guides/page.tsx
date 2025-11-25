import { redirect } from 'next/navigation';
import { getAllGuides } from '@/lib/guides';

export default function GuidesPage() {
  const guides = getAllGuides();

  // 如果有攻略，重定向到第一个攻略
  if (guides.length > 0) {
    redirect(`/guides/${guides[0].slug}`);
  }

  // 如果没有攻略，显示提示
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">暂无攻略内容</h1>
        <p className="text-gray-600">请在 public/guides/ 目录下添加 markdown 文件</p>
      </div>
    </div>
  );
}
