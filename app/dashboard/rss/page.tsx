export default function RSSManagementPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        RSS 源管理
      </h2>
      <div className="text-gray-600 dark:text-gray-400">
        <p className="mb-4">功能开发中...</p>
        <ul className="space-y-2 list-disc list-inside">
          <li>查看当前 RSS 订阅源列表</li>
          <li>添加新订阅源</li>
          <li>删除订阅源</li>
          <li>手动刷新订阅源</li>
        </ul>
      </div>
    </div>
  );
}
