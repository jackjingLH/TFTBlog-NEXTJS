'use client';

import { useState, useEffect } from 'react';

// 平台配置
const PLATFORMS = {
  TFTimes: { name: 'TFT Times', icon: '🇯🇵', color: 'text-blue-600' },
  YouTube: { name: 'YouTube', icon: '📺', color: 'text-red-600' },
  Tacter: { name: 'Tacter', icon: '📖', color: 'text-purple-600' },
  'B站': { name: 'B站', icon: '📹', color: 'text-pink-600' },
  Douyin: { name: '抖音', icon: '🎵', color: 'text-cyan-600' },
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
        <div className="text-gray-600 dark:text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          聚合管理
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          管理所有数据来源，查看实时更新统计
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">数据源</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalSources}</p>
            </div>
            <span className="text-3xl">🌐</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">总文章数</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalArticles}</p>
            </div>
            <span className="text-3xl">📊</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">周发布数</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{weeklyArticles}</p>
            </div>
            <span className="text-3xl">📅</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">平台数</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
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
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span className="mr-2">{platform.icon}</span>
            {platform.name}
          </button>
        ))}
      </div>

      {/* 数据源统计表格 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">数据统计</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                平台
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                博主/频道
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                总文章数
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                周发布频率
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                最后发布
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                状态
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
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
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-xl mr-2">{platform?.icon || '📄'}</span>
                      <span className={`font-medium ${platform?.color || 'text-gray-900 dark:text-white'}`}>
                        {source.platform}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {source.author}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {source.totalCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {source.weeklyCount > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                        {source.weeklyCount} 篇/周
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">0 篇/周</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`text-sm ${isRecent ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                      {formattedDate}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {source.weeklyCount > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                        ✓ 活跃
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
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
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">
            暂无数据
          </div>
        )}
      </div>

      {/* 博主管理模块 */}
      <div className="mt-8">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            博主管理
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            添加或删除数据源。修改后，下次抓取时自动生效。
          </p>
        </div>

        {Object.entries(PLATFORMS).map(([key, platform]) => {
          const platformKey = key === 'B站' ? 'Bilibili' : key;
          const platformSources = sourcesByPlatform[key] || [];

          return (
            <div key={key} className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              {/* 平台标题 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-3xl mr-3">{platform.icon}</span>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{platform.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
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
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-base text-gray-900 dark:text-white truncate">
                            {source.name}
                          </h5>

                          {/* 平台特定信息 */}
                          {source.youtube && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {source.youtube.id} • {source.youtube.type}
                              </p>
                              {source.youtube.fans && (
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  {source.youtube.fans} 粉丝
                                </p>
                              )}
                            </div>
                          )}
                          {source.bilibili && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                UID: {source.bilibili.uid}
                              </p>
                              {source.bilibili.fans && (
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  {source.bilibili.fans} 粉丝
                                </p>
                              )}
                            </div>
                          )}
                          {source.douyin && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                ID: {source.douyin.userId.substring(0, 20)}...
                              </p>
                              {source.douyin.fans && (
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  {source.douyin.fans} 粉丝
                                </p>
                              )}
                            </div>
                          )}
                          {source.tacter && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                @{source.tacter.username}
                              </p>
                            </div>
                          )}
                          {source.tftimes && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600 dark:text-gray-400">
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
                              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                              title="删除"
                            >
                              删除
                            </button>
                          ) : (
                            <span className="px-2 py-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 rounded">
                              固定源
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          添加 {platformName}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 通用字段：名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="显示名称"
            />
          </div>

          {/* YouTube 特定字段 */}
          {platform === 'YouTube' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    <span className="text-sm text-gray-700 dark:text-gray-300">User</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="channel"
                      checked={formData.youtubeType === 'channel'}
                      onChange={(e) => setFormData({ ...formData, youtubeType: 'channel' })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Channel</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  频道 ID *
                </label>
                <input
                  type="text"
                  value={formData.youtubeId}
                  onChange={(e) => setFormData({ ...formData, youtubeId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="如 @RerollTFT"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  粉丝数
                </label>
                <input
                  type="text"
                  value={formData.youtubeFans}
                  onChange={(e) => setFormData({ ...formData, youtubeFans: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="如 120万+"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  描述
                </label>
                <textarea
                  value={formData.youtubeDescription}
                  onChange={(e) => setFormData({ ...formData, youtubeDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  UP主 UID *
                </label>
                <input
                  type="text"
                  value={formData.bilibiliUid}
                  onChange={(e) => setFormData({ ...formData, bilibiliUid: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="如 18343134"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  粉丝数
                </label>
                <input
                  type="text"
                  value={formData.bibiliFans}
                  onChange={(e) => setFormData({ ...formData, bibiliFans: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="如 186万"
                />
              </div>
            </>
          )}

          {/* Douyin 特定字段 */}
          {platform === 'Douyin' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  抖音用户 ID *
                </label>
                <input
                  type="text"
                  value={formData.douyinUserId}
                  onChange={(e) => setFormData({ ...formData, douyinUserId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="如 MS4wLjABAAAA..."
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  从抖音主页 URL 中获取用户 ID
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  粉丝数
                </label>
                <input
                  type="text"
                  value={formData.douyinFans}
                  onChange={(e) => setFormData({ ...formData, douyinFans: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="如 50万"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  描述
                </label>
                <textarea
                  value={formData.douyinDescription}
                  onChange={(e) => setFormData({ ...formData, douyinDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  用户名 *
                </label>
                <input
                  type="text"
                  value={formData.tacterUsername}
                  onChange={(e) => setFormData({ ...formData, tacterUsername: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="如 tftips"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  描述
                </label>
                <textarea
                  value={formData.tacterDescription}
                  onChange={(e) => setFormData({ ...formData, tacterDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '添加中...' : '确认添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
