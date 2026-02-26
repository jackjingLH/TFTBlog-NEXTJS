'use client';

import { useState, useEffect } from 'react';

// 平台配置
const PLATFORMS = {
  TFTimes: { name: 'TFT Times', color: 'text-primary-400' },
  TFTips: { name: 'TFTips', color: 'text-primary-400' },
  YouTube: { name: 'YouTube', color: 'text-primary-400' },
  Tacter: { name: 'Tacter', color: 'text-primary-400' },
  'B站': { name: 'B站', color: 'text-primary-400' },
  Douyin: { name: '抖音', color: 'text-primary-400' },
};

function PlatformIcon({ platform, className }: { platform: string; className: string }) {
  if (platform === 'TFTips') {
    return (
      <svg viewBox="0 0 24 24" className={className} style={{ fill: 'currentColor' }}>
        <path style={{ fillOpacity: 1, strokeWidth: 0.242424 }} d="m 113.50683,2.4056419 c -1.57088,0.00273 -3.14001,0.969192 -6.53485,2.9027593 -6.78969,3.8671346 -6.5339,3.4296407 -6.52003,11.1402978 0.0139,7.710655 -0.24318,7.275112 6.56038,11.118633 6.80356,3.843522 6.28989,3.843806 13.07957,-0.02333 6.78969,-3.867135 6.5339,-3.429641 6.52003,-11.140296 -0.0139,-7.710657 0.244,-7.2742803 -6.55955,-11.1178021 -3.40179,-1.9217609 -4.97469,-2.8829925 -6.54555,-2.8802637 z m 0.12351,7.0894309 c 0.77684,-0.0013 1.55385,0.465287 3.23613,1.3988902 3.36456,1.867208 3.23751,1.655546 3.24437,5.401433 0.006,3.745885 0.13391,3.533584 -3.22378,5.412262 -3.3577,1.878679 -3.10442,1.878039 -6.46897,0.01084 -3.36456,-1.867207 -3.23751,-1.654713 -3.24437,-5.400599 -0.006,-3.745885 -0.13309,-3.533584 3.22461,-5.412263 1.67885,-0.9393392 2.45517,-1.4092282 3.23201,-1.4105542 z" transform="matrix(0.82933656,0,0,0.80530515,-82.645364,-1.7181152)" />
      </svg>
    );
  }
  if (platform === 'TFTimes') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    );
  }
  if (platform === 'Bilibili' || platform === 'B站') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#00A1D6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M3 10a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v6a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4v-6z" />
        <path d="M8 3l2 3" /><path d="M16 3l-2 3" />
        <path d="M9 13v-2" /><path d="M15 11v2" />
      </svg>
    );
  }
  if (platform === 'YouTube') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="#FF0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M2 8a4 4 0 0 1 4 -4h12a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-12a4 4 0 0 1 -4 -4v-8"/>
        <path d="M10 9l5 3l-5 3l0 -6"/>
      </svg>
    );
  }
  if (platform === 'Douyin') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M21 7.917v4.034a9.948 9.948 0 0 1 -5 -1.951v4.5a6.5 6.5 0 1 1 -8 -6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917"/>
      </svg>
    );
  }
  if (platform === 'Tacter') {
    return (
      <svg viewBox="0 0 32 32" className={className}>
        <path fillRule="evenodd" clipRule="evenodd" d="M12.7458 0V6.50847H25.4915V19.2542C29.0117 19.2542 32 16.2659 32 12.7458V0H12.7458ZM0 12.7458H6.50847V19.2542C2.91342 19.2542 0 16.3408 0 12.7458ZM19.2542 12.7458V32H12.7458V12.7458H19.2542Z" fill="#F1E9D6"/>
      </svg>
    );
  }
  return null;
}

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
    if (platform === 'TFTimes' || platform === 'TFTips') {
      alert(`${platform} 是固定数据源，无法删除`);
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
            <PlatformIcon platform={key} className="w-4 h-4 mr-2" />
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
                      <PlatformIcon platform={source.platform} className="w-5 h-5 mr-2" />
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
                  {key === 'TFTips' ? (
                    <svg viewBox="0 0 24 24" className="w-8 h-8 mr-3" style={{ fill: 'currentColor' }}>
                      <path style={{ fillOpacity: 1, strokeWidth: 0.242424 }} d="m 113.50683,2.4056419 c -1.57088,0.00273 -3.14001,0.969192 -6.53485,2.9027593 -6.78969,3.8671346 -6.5339,3.4296407 -6.52003,11.1402978 0.0139,7.710655 -0.24318,7.275112 6.56038,11.118633 6.80356,3.843522 6.28989,3.843806 13.07957,-0.02333 6.78969,-3.867135 6.5339,-3.429641 6.52003,-11.140296 -0.0139,-7.710657 0.244,-7.2742803 -6.55955,-11.1178021 -3.40179,-1.9217609 -4.97469,-2.8829925 -6.54555,-2.8802637 z m 0.12351,7.0894309 c 0.77684,-0.0013 1.55385,0.465287 3.23613,1.3988902 3.36456,1.867208 3.23751,1.655546 3.24437,5.401433 0.006,3.745885 0.13391,3.533584 -3.22378,5.412262 -3.3577,1.878679 -3.10442,1.878039 -6.46897,0.01084 -3.36456,-1.867207 -3.23751,-1.654713 -3.24437,-5.400599 -0.006,-3.745885 -0.13309,-3.533584 3.22461,-5.412263 1.67885,-0.9393392 2.45517,-1.4092282 3.23201,-1.4105542 z" transform="matrix(0.82933656,0,0,0.80530515,-82.645364,-1.7181152)" />
                    </svg>
                  ) : (
                    <PlatformIcon platform={key} className="w-8 h-8 mr-3" />
                  )}
                  <div>
                    <h4 className="text-lg font-semibold text-textLight-100">{platform.name}</h4>
                    <p className="text-sm text-textLight-300">
                      {platformSources.length} 个数据源
                    </p>
                  </div>
                </div>

                {/* 添加按钮 (TFTimes 和 TFTips 除外) */}
                {key !== 'TFTimes' && key !== 'TFTips' && (
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
                          {source.platform === 'TFTips' && (
                            <div className="mt-2">
                              <p className="text-xs text-textLight-200">
                                固定数据源
                              </p>
                            </div>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="ml-3 flex-shrink-0">
                          {source.platform !== 'TFTimes' && source.platform !== 'TFTips' ? (
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
  // ID 输入字段
  const [idInput, setIdInput] = useState('');
  const [youtubeType, setYoutubeType] = useState<'user' | 'channel'>('user');

  // 自动获取的用户信息
  const [userInfo, setUserInfo] = useState<any>(null);
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 获取用户信息
  const handleFetchInfo = async () => {
    if (!idInput.trim()) {
      alert('请输入 ID');
      return;
    }

    setFetching(true);

    try {
      let requestBody: any = { platform };

      // 构建请求体
      if (platform === 'Bilibili') {
        requestBody.bilibili = { uid: idInput };
      } else if (platform === 'Douyin') {
        requestBody.douyin = { userId: idInput };
      } else if (platform === 'YouTube') {
        requestBody.youtube = { id: idInput, type: youtubeType };
      } else if (platform === 'Tacter') {
        requestBody.tacter = { username: idInput };
      }

      const res = await fetch('/api/sources/fetch-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (data.status === 'success') {
        setUserInfo(data.data);
      } else {
        alert(`获取用户信息失败: ${data.message}`);
      }
    } catch (error: any) {
      alert(`获取用户信息失败: ${error.message}`);
    } finally {
      setFetching(false);
    }
  };

  // 提交添加数据源
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userInfo) {
      alert('请先获取用户信息');
      return;
    }

    setSubmitting(true);

    try {
      let payload: any = {
        platform,
        name: userInfo.name,
      };

      // 构建平台特定数据
      if (platform === 'Bilibili') {
        payload.bilibili = {
          uid: idInput,
          fans: userInfo.fans,
        };
      } else if (platform === 'Douyin') {
        payload.douyin = {
          userId: idInput,
          fans: userInfo.fans,
          description: userInfo.description,
        };
      } else if (platform === 'YouTube') {
        payload.youtube = {
          type: youtubeType,
          id: idInput,
          fans: userInfo.fans,
          description: userInfo.description,
        };
      } else if (platform === 'Tacter') {
        payload.tacter = {
          username: idInput,
          description: userInfo.description,
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

  const idLabel = platform === 'Bilibili' ? 'UP主 UID' :
                  platform === 'Douyin' ? '用户 ID (sec_user_id)' :
                  platform === 'YouTube' ? '频道 ID' :
                  platform === 'Tacter' ? '用户名' : 'ID';

  const idPlaceholder = platform === 'Bilibili' ? '如 18343134' :
                        platform === 'Douyin' ? '如 MS4wLjABAAAA...' :
                        platform === 'YouTube' ? '如 @RerollTFT' :
                        platform === 'Tacter' ? '如 tftips' : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-bgDark-700 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-border">
        <h3 className="text-xl font-bold text-textLight-100 mb-4">
          添加 {platformName}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* YouTube 频道类型选择 */}
          {platform === 'YouTube' && (
            <div>
              <label className="block text-sm font-medium text-textLight-200 mb-1">
                频道类型
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="user"
                    checked={youtubeType === 'user'}
                    onChange={() => setYoutubeType('user')}
                    className="mr-2"
                    disabled={!!userInfo}
                  />
                  <span className="text-sm text-textLight-200">User</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="channel"
                    checked={youtubeType === 'channel'}
                    onChange={() => setYoutubeType('channel')}
                    className="mr-2"
                    disabled={!!userInfo}
                  />
                  <span className="text-sm text-textLight-200">Channel</span>
                </label>
              </div>
            </div>
          )}

          {/* ID 输入 */}
          <div>
            <label className="block text-sm font-medium text-textLight-200 mb-1">
              {idLabel} *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                required
                disabled={!!userInfo}
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-bgDark-600 text-textLight-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                placeholder={idPlaceholder}
              />
              <button
                type="button"
                onClick={handleFetchInfo}
                disabled={fetching || !!userInfo}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {fetching ? '获取中...' : userInfo ? '✓ 已获取' : '获取信息'}
              </button>
            </div>
            {platform === 'Douyin' && (
              <p className="mt-1 text-xs text-textLight-300">
                从抖音主页 URL 中获取用户 ID (sec_user_id)
              </p>
            )}
          </div>

          {/* 显示获取到的用户信息 */}
          {userInfo && (
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-primary-400">获取到的用户信息</h4>
                <button
                  type="button"
                  onClick={() => setUserInfo(null)}
                  className="text-xs text-textLight-300 hover:text-textLight-100"
                >
                  重新获取
                </button>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex">
                  <span className="text-textLight-300 w-20">名称:</span>
                  <span className="text-textLight-100 font-medium">{userInfo.name}</span>
                </div>
                {userInfo.fans && (
                  <div className="flex">
                    <span className="text-textLight-300 w-20">粉丝数:</span>
                    <span className="text-textLight-100">{userInfo.fans}</span>
                  </div>
                )}
                {userInfo.description && (
                  <div className="flex">
                    <span className="text-textLight-300 w-20">描述:</span>
                    <span className="text-textLight-100 text-xs line-clamp-2">{userInfo.description}</span>
                  </div>
                )}
              </div>
            </div>
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
