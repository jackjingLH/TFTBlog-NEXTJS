'use client';

import { useState, useEffect } from 'react';

// 平台配置
const PLATFORMS = {
  TFTimes: { name: 'TFT Times', icon: '🇯🇵', color: 'text-primary-400' },
  YouTube: { name: 'YouTube', icon: '📺', color: 'text-primary-400' },
  Tacter: { name: 'Tacter', icon: '📖', color: 'text-primary-400' },
  'B站': { name: 'B站', icon: '📹', color: 'text-primary-400' },
  Douyin: { name: '抖音', icon: '🎵', color: 'text-primary-400' },
};

interface SourceStats {
  platform: string;
  author: string;
  totalCount: number;
  weeklyCount: number;
  latestPublished: string;
}

interface Source {
  _id: string;
  platform: string;
  name: string;
  enabled: boolean;
  youtube?: { type: string; id: string; fans?: string; description?: string };
  bilibili?: { uid: string; fans?: string };
  douyin?: { userId: string; fans?: string; description?: string };
  tacter?: { username: string; description?: string };
  tftimes?: { category: string };
}

export default function AggregationPage() {
  const [stats, setStats] = useState<SourceStats[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlatformForAdd, setSelectedPlatformForAdd] = useState<string | null>(null);

  // 获取统计数据
  useEffect(() => {
    fetchStats();
    fetchSources();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/aggregation/stats');
      const data = await res.json();
      if (data.status === 'success') {
        setStats(data.data);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/sources');
      const data = await res.json();
      if (data.status === 'success') {
        setSources(data.data);
      }
    } catch (error) {
      console.error('获取数据源失败:', error);
    }
  };

  const handleDelete = async (id: string, name: string, platform: string) => {
    if (platform === 'TFTimes') {
      alert('TFTimes 是固定数据源，无法删除');
      return;
    }

    if (!confirm(`确定要删除 "${name}" 吗？\n\n删除后，下次抓取时将不再处理该数据源。`)) {
      return;
    }

    try {
      const res = await fetch(`/api/sources/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.status === 'success') {
        alert('删除成功！');
        fetchSources(); // 刷新列表
      } else {
        alert(`删除失败: ${data.message}`);
      }
    } catch (error: any) {
      alert(`删除失败: ${error.message}`);
    }
  };

  const handleAddSource = () => {
    setShowAddModal(false);
    setSelectedPlatformForAdd(null);
    fetchSources(); // 刷新列表
  };

  // 过滤数据
  const filteredStats = selectedPlatform
    ? stats.filter(s => s.platform === selectedPlatform)
    : stats;

  // 按平台分组数据源
  const sourcesByPlatform = sources.reduce((acc, source) => {
    const key = source.platform === 'Bilibili' ? 'B站' : source.platform;
    if (!acc[key]) acc[key] = [];
    acc[key].push(source);
    return acc;
  }, {} as Record<string, Source[]>);

  // 计算总数
  const totalSources = stats.length;
  const totalArticles = stats.reduce((sum, s) => sum + s.totalCount, 0);
  const weeklyArticles = stats.reduce((sum, s) => sum + s.weeklyCount, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-textLight-200">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-textLight-100 mb-2">
          聚合管理
        </h2>
        <p className="text-sm text-textLight-200">
          管理所有数据来源，查看实时更新统计
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-primary-500/10 rounded-lg p-4 border border-primary-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-textLight-200">数据源</p>
              <p className="text-2xl font-bold text-primary-400">{totalSources}</p>
            </div>
            <span className="text-3xl">🌐</span>
          </div>
        </div>
        <div className="bg-primary-500/10 rounded-lg p-4 border border-primary-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-textLight-200">总文章数</p>
              <p className="text-2xl font-bold text-primary-400">{totalArticles}</p>
            </div>
            <span className="text-3xl">📊</span>
          </div>
        </div>
        <div className="bg-primary-500/10 rounded-lg p-4 border border-primary-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-textLight-200">周发布数</p>
              <p className="text-2xl font-bold text-primary-400">{weeklyArticles}</p>
            </div>
            <span className="text-3xl">📅</span>
          </div>
        </div>
        <div className="bg-primary-500/10 rounded-lg p-4 border border-primary-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-textLight-200">平台数</p>
              <p className="text-2xl font-bold text-primary-400">
                {Object.keys(PLATFORMS).length}
              </p>
            </div>
            <span className="text-3xl">🔄</span>
          </div>
        </div>
      </div>

      {/* 平台筛选 */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedPlatform(null)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            selectedPlatform === null
              ? 'bg-primary-500 text-white shadow-md'
              : 'bg-bgDark-600 text-textLight-200 hover:bg-bgDark-500'
          }`}
        >
          全部平台
        </button>
        {Object.entries(PLATFORMS).map(([key, platform]) => (
          <button
            key={key}
            onClick={() => setSelectedPlatform(key)}
            className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
              selectedPlatform === key
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-bgDark-600 text-textLight-200 hover:bg-bgDark-500'
            }`}
          >
            <span className="mr-2">{platform.icon}</span>
            {platform.name}
          </button>
        ))}
      </div>

      {/* 数据源统计表格 */}
      <div className="bg-bgDark-600 rounded-lg shadow-sm overflow-hidden mb-8 border border-border">
        <div className="px-6 py-4 bg-bgDark-700 border-b border-border">
          <h3 className="text-lg font-semibold text-textLight-100">数据统计</h3>
        </div>
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-bgDark-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-textLight-300 uppercase tracking-wider">
                平台
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-textLight-300 uppercase tracking-wider">
                博主/频道
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-textLight-300 uppercase tracking-wider">
                总文章数
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-textLight-300 uppercase tracking-wider">
                周发布频率
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-textLight-300 uppercase tracking-wider">
                最后发布
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-textLight-300 uppercase tracking-wider">
                状态
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredStats.map((source, index) => {
              const platform = PLATFORMS[source.platform as keyof typeof PLATFORMS];
              const latestDate = new Date(source.latestPublished);
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
              const isRecent = latestDate >= oneWeekAgo;
              const formattedDate = latestDate.toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <tr
                  key={index}
                  className="hover:bg-bgDark-500 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-xl mr-2">{platform?.icon || '📄'}</span>
                      <span className="font-medium text-primary-400">
                        {source.platform}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-textLight-100">
                      {source.author}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-semibold text-textLight-100">
                      {source.totalCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {source.weeklyCount > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400">
                        {source.weeklyCount} 篇/周
                      </span>
                    ) : (
                      <span className="text-sm text-textLight-300">0 篇/周</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`text-sm ${isRecent ? 'text-primary-400 font-medium' : 'text-textLight-300'}`}>
                      {formattedDate}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {source.weeklyCount > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400">
                        ✓ 活跃
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-bgDark-500 text-textLight-300">
                        ○ 待更新
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredStats.length === 0 && (
          <div className="text-center py-12 text-textLight-200">
            暂无数据
          </div>
        )}
      </div>

      {/* 博主管理模块 */}
      <div className="mt-8">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-textLight-100 mb-2">
            博主管理
          </h3>
          <p className="text-sm text-textLight-200">
            添加或删除数据源。修改后，下次抓取时自动生效。
          </p>
        </div>

        {Object.entries(PLATFORMS).map(([key, platform]) => {
          const platformKey = key === 'B站' ? 'Bilibili' : key;
          const platformSources = sourcesByPlatform[key] || [];

          return (
            <div key={key} className="mb-6 bg-bgDark-600 rounded-lg shadow-sm p-6 border border-border">
              {/* 平台标题 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-3xl mr-3">{platform.icon}</span>
                  <div>
                    <h4 className="text-lg font-semibold text-textLight-100">{platform.name}</h4>
                    <p className="text-sm text-textLight-300">
                      {platformSources.length} 个数据源
                    </p>
                  </div>
                </div>

                {/* 添加按钮 (TFTimes 除外) */}
                {key !== 'TFTimes' && (
                  <button
                    onClick={() => {
                      setSelectedPlatformForAdd(platformKey);
                      setShowAddModal(true);
                    }}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
                  >
                    + 添加{platform.name === 'YouTube' ? '频道' : platform.name === 'B站' ? 'UP主' : '作者'}
                  </button>
                )}
              </div>

              {/* 博主列表 */}
              {platformSources.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {platformSources.map((source) => (
                    <div
                      key={source._id}
                      className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow bg-bgDark-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-base text-textLight-100 truncate">
                            {source.name}
                          </h5>

                          {/* 平台特定信息 */}
                          {source.youtube && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-textLight-200">
                                {source.youtube.id} • {source.youtube.type}
                              </p>
                              {source.youtube.fans && (
                                <p className="text-xs text-textLight-300">
                                  {source.youtube.fans} 粉丝
                                </p>
                              )}
                            </div>
                          )}
                          {source.bilibili && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-textLight-200">
                                UID: {source.bilibili.uid}
                              </p>
                              {source.bilibili.fans && (
                                <p className="text-xs text-textLight-300">
                                  {source.bilibili.fans} 粉丝
                                </p>
                              )}
                            </div>
                          )}
                          {source.douyin && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-textLight-200">
                                ID: {source.douyin.userId.substring(0, 20)}...
                              </p>
                              {source.douyin.fans && (
                                <p className="text-xs text-textLight-300">
                                  {source.douyin.fans} 粉丝
                                </p>
                              )}
                            </div>
                          )}
                          {source.tacter && (
                            <div className="mt-2">
                              <p className="text-xs text-textLight-200">
                                @{source.tacter.username}
                              </p>
                            </div>
                          )}
                          {source.tftimes && (
                            <div className="mt-2">
                              <p className="text-xs text-textLight-200">
                                分类: {source.tftimes.category}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="ml-3 flex-shrink-0">
                          {source.platform !== 'TFTimes' ? (
                            <button
                              onClick={() => handleDelete(source._id, source.name, source.platform)}
                              className="text-red-400 hover:text-red-300 text-sm font-medium"
                              title="删除"
                            >
                              删除
                            </button>
                          ) : (
                            <span className="px-2 py-1 text-xs text-textLight-300 bg-bgDark-500 rounded">
                              固定源
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-textLight-200">
                  暂无数据源
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 添加博主对话框 */}
      {showAddModal && selectedPlatformForAdd && (
        <AddSourceModal
          platform={selectedPlatformForAdd}
          onClose={() => {
            setShowAddModal(false);
            setSelectedPlatformForAdd(null);
          }}
          onSuccess={handleAddSource}
        />
      )}
    </div>
  );
}

// 添加数据源对话框组件
function AddSourceModal({
  platform,
  onClose,
  onSuccess,
}: {
  platform: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<any>({
    name: '',
    // YouTube
    youtubeType: 'user',
    youtubeId: '',
    youtubeFans: '',
    youtubeDescription: '',
    // Bilibili
    bilibiliUid: '',
    bibiliFans: '',
    // Douyin
    douyinUserId: '',
    douyinFans: '',
    douyinDescription: '',
    // Tacter
    tacterUsername: '',
    tacterDescription: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let payload: any = {
        platform,
        name: formData.name,
      };

      // 构建平台特定数据
      if (platform === 'YouTube') {
        payload.youtube = {
          type: formData.youtubeType,
          id: formData.youtubeId,
          fans: formData.youtubeFans,
          description: formData.youtubeDescription,
        };
      } else if (platform === 'Bilibili') {
        payload.bilibili = {
          uid: formData.bilibiliUid,
          fans: formData.bibiliFans,
        };
      } else if (platform === 'Douyin') {
        payload.douyin = {
          userId: formData.douyinUserId,
          fans: formData.douyinFans,
          description: formData.douyinDescription,
        };
      } else if (platform === 'Tacter') {
        payload.tacter = {
          username: formData.tacterUsername,
          description: formData.tacterDescription,
        };
      }

      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.status === 'success') {
        alert('添加成功！下次抓取时将自动生效。');
        onSuccess();
      } else {
        alert(`添加失败: ${data.message}`);
      }
    } catch (error: any) {
      alert(`添加失败: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const platformName = platform === 'YouTube' ? 'YouTube 频道' :
                        platform === 'Bilibili' ? 'B站 UP主' :
                        platform === 'Douyin' ? '抖音账号' :
                        platform === 'Tacter' ? 'Tacter 作者' : platform;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-bgDark-700 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-border">
        <h3 className="text-xl font-bold text-textLight-100 mb-4">
          添加 {platformName}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 通用字段：名称 */}
          <div>
            <label className="block text-sm font-medium text-textLight-200 mb-1">
              名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-bgDark-600 text-textLight-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="显示名称"
            />
          </div>

          {/* YouTube 特定字段 */}
          {platform === 'YouTube' && (
            <>
              <div>
                <label className="block text-sm font-medium text-textLight-200 mb-1">
                  频道类型 *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="user"
                      checked={formData.youtubeType === 'user'}
                      onChange={(e) => setFormData({ ...formData, youtubeType: 'user' })}
                      className="mr-2"
                    />
                    <span className="text-sm text-textLight-200">User</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="channel"
                      checked={formData.youtubeType === 'channel'}
                      onChange={(e) => setFormData({ ...formData, youtubeType: 'channel' })}
                      className="mr-2"
                    />
                    <span className="text-sm text-textLight-200">Channel</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-textLight-200 mb-1">
                  频道 ID *
                </label>
                <input
                  type="text"
                  value={formData.youtubeId}
                  onChange={(e) => setFormData({ ...formData, youtubeId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bgDark-600 text-textLight-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="如 @RerollTFT"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-textLight-200 mb-1">
                  粉丝数
                </label>
                <input
                  type="text"
                  value={formData.youtubeFans}
                  onChange={(e) => setFormData({ ...formData, youtubeFans: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bgDark-600 text-textLight-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="如 120万+"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-textLight-200 mb-1">
                  描述
                </label>
                <textarea
                  value={formData.youtubeDescription}
                  onChange={(e) => setFormData({ ...formData, youtubeDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bgDark-600 text-textLight-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="频道描述"
                />
              </div>
            </>
          )}

          {/* Bilibili 特定字段 */}
          {platform === 'Bilibili' && (
            <>
              <div>
                <label className="block text-sm font-medium text-textLight-200 mb-1">
                  UP主 UID *
                </label>
                <input
                  type="text"
                  value={formData.bilibiliUid}
                  onChange={(e) => setFormData({ ...formData, bilibiliUid: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bgDark-600 text-textLight-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="如 18343134"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-textLight-200 mb-1">
                  粉丝数
                </label>
                <input
                  type="text"
                  value={formData.bibiliFans}
                  onChange={(e) => setFormData({ ...formData, bibiliFans: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bgDark-600 text-textLight-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="如 186万"
                />
              </div>
            </>
          )}

          {/* Douyin 特定字段 */}
          {platform === 'Douyin' && (
            <>
              <div>
                <label className="block text-sm font-medium text-textLight-200 mb-1">
                  抖音用户 ID *
                </label>
                <input
                  type="text"
                  value={formData.douyinUserId}
                  onChange={(e) => setFormData({ ...formData, douyinUserId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bgDark-600 text-textLight-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="如 MS4wLjABAAAA..."
                />
                <p className="mt-1 text-xs text-textLight-300">
                  从抖音主页 URL 中获取用户 ID
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-textLight-200 mb-1">
                  粉丝数
                </label>
                <input
                  type="text"
                  value={formData.douyinFans}
                  onChange={(e) => setFormData({ ...formData, douyinFans: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bgDark-600 text-textLight-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="如 50万"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-textLight-200 mb-1">
                  描述
                </label>
                <textarea
                  value={formData.douyinDescription}
                  onChange={(e) => setFormData({ ...formData, douyinDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bgDark-600 text-textLight-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="账号描述"
                />
              </div>
            </>
          )}

          {/* Tacter 特定字段 */}
          {platform === 'Tacter' && (
            <>
              <div>
                <label className="block text-sm font-medium text-textLight-200 mb-1">
                  用户名 *
                </label>
                <input
                  type="text"
                  value={formData.tacterUsername}
                  onChange={(e) => setFormData({ ...formData, tacterUsername: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bgDark-600 text-textLight-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="如 tftips"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-textLight-200 mb-1">
                  描述
                </label>
                <textarea
                  value={formData.tacterDescription}
                  onChange={(e) => setFormData({ ...formData, tacterDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-bgDark-600 text-textLight-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="作者描述"
                />
              </div>
            </>
          )}

          {/* 按钮 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-textLight-200 hover:bg-bgDark-600 disabled:opacity-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {submitting ? '添加中...' : '确认添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
