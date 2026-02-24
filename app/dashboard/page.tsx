import dbConnect from '@/lib/mongodb';
import Article from '@/models/Article';

async function getDashboardStats() {
  await dbConnect();

  const [totalArticles, platforms, authors] = await Promise.all([
    Article.countDocuments(),
    Article.distinct('platform'),
    Article.distinct('author'),
  ]);

  // 获取今日新增文章数
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayArticles = await Article.countDocuments({
    fetchedAt: { $gte: today },
  });

  // 按平台统计文章数
  const platformStats = await Article.aggregate([
    { $group: { _id: '$platform', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return {
    totalArticles,
    totalPlatforms: platforms.length,
    totalAuthors: authors.length,
    todayArticles,
    platformStats,
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <h2 className="text-2xl font-bold text-textLight-100 mb-6">
        数据统计
      </h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="总文章数" value={stats.totalArticles} icon="📄" />
        <StatCard title="今日新增" value={stats.todayArticles} icon="🆕" />
        <StatCard title="平台数量" value={stats.totalPlatforms} icon="📡" />
        <StatCard title="作者数量" value={stats.totalAuthors} icon="✍️" />
      </div>

      {/* 平台分布 */}
      <div className="bg-bgDark-600 rounded-lg p-6 border border-border">
        <h3 className="text-lg font-semibold text-textLight-100 mb-4">
          平台分布
        </h3>
        <div className="space-y-3">
          {stats.platformStats.map((platform) => (
            <div
              key={platform._id}
              className="flex justify-between items-center"
            >
              <span className="text-textLight-200">
                {platform._id}
              </span>
              <span className="font-semibold text-primary-400">
                {platform.count} 篇
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="bg-primary-500/10 rounded-lg p-6 border border-primary-500/30">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold text-primary-400">
          {value}
        </span>
      </div>
      <p className="text-sm text-textLight-200">{title}</p>
    </div>
  );
}
