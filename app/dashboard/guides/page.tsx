'use client';

import { useEffect, useState } from 'react';

interface Guide {
  id: string;
  name: string;
  title: string;
  imageCount: number;
  coverImage: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function GuidesManagementPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // 获取攻略列表
  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    try {
      const res = await fetch('/api/guides');
      const data = await res.json();
      if (data.status === 'success') {
        setGuides(data.data);
      }
    } catch (error) {
      console.error('获取攻略列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 删除攻略
  const handleDelete = async (guideId: string, guideTitle: string) => {
    if (!confirm(`确定要删除攻略 "${guideTitle}" 吗？此操作不可恢复！`)) {
      return;
    }

    setDeleteLoading(guideId);
    try {
      const res = await fetch(`/api/guides/${guideId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.status === 'success') {
        alert('删除成功');
        // 从列表中移除
        setGuides(guides.filter((g) => g.id !== guideId));
      } else {
        alert(data.message || '删除失败');
      }
    } catch (error) {
      console.error('删除攻略失败:', error);
      alert('删除失败');
    } finally {
      setDeleteLoading(null);
    }
  };

  // 上传攻略
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.name.endsWith('.zip')) {
      alert('请上传 ZIP 压缩包');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/guides/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.status === 'success') {
        alert('上传成功');
        // 重新获取列表
        fetchGuides();
      } else {
        alert(data.message || '上传失败');
      }
    } catch (error) {
      console.error('上传攻略失败:', error);
      alert('上传失败');
    } finally {
      setUploading(false);
      // 重置文件输入
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600 dark:text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          攻略管理
        </h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            共 {guides.length} 个攻略
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".zip"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
            <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm">
              {uploading ? '上传中...' : '上传攻略 ZIP'}
            </span>
          </label>
        </div>
      </div>

      {guides.length === 0 ? (
        <div className="text-center py-12 text-gray-600 dark:text-gray-400">
          暂无攻略
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  标题
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  文件夹名
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {guides.map((guide) => (
                <tr
                  key={guide.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {guide.title}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {guide.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleDelete(guide.id, guide.title)}
                      disabled={deleteLoading === guide.id}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
                    >
                      {deleteLoading === guide.id ? '删除中...' : '删除'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
