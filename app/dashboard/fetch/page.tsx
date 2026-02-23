'use client';

import { useState, useRef, useEffect } from 'react';

// 可用的平台列表
const PLATFORMS = [
  { name: 'TFTimes', label: 'TFT Times', icon: '🇯🇵', color: 'from-blue-600 to-blue-700' },
  { name: 'YouTube', label: 'YouTube', icon: '📺', color: 'from-red-600 to-red-700' },
  { name: 'Tacter', label: 'Tacter', icon: '📖', color: 'from-purple-600 to-purple-700' },
  { name: 'Bilibili', label: 'B站', icon: '📹', color: 'from-pink-600 to-pink-700' },
  { name: 'Douyin', label: '抖音', icon: '🎵', color: 'from-cyan-600 to-cyan-700' },
];

export default function FetchDataPage() {
  const [isFetching, setIsFetching] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleFetch = async (platforms?: string) => {
    setIsFetching(true);
    setLogs([]);

    // 创建 AbortController 用于取消请求
    abortControllerRef.current = new AbortController();

    try {
      // 构建 URL，如果有 platforms 参数则添加
      const url = platforms
        ? `/api/fetch?platforms=${platforms}`
        : '/api/fetch';

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('请求失败');
      }

      // 处理 SSE 流
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // 解析 SSE 数据
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              setLogs((prev) => [...prev, data.message]);
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setLogs((prev) => [...prev, '\n⚠️ 抓取任务已停止\n']);
      } else {
        setLogs((prev) => [...prev, `\n❌ 错误: ${error.message}\n`]);
      }
    } finally {
      setIsFetching(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLogs((prev) => [...prev, '\n🛑 正在停止任务...\n']);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        数据抓取
      </h2>

      <div className="space-y-6">
        {/* 操作按钮区域 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              执行抓取任务
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              从 TFT Times、YouTube、Tacter、Bilibili 和抖音抓取最新的云顶之弈内容
            </p>
          </div>

          {/* 全部抓取按钮 */}
          <div className="mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleFetch()}
                disabled={isFetching}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {isFetching ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    抓取中...
                  </>
                ) : (
                  <>
                    <span className="text-xl mr-2">🔄</span>
                    抓取全部平台
                  </>
                )}
              </button>

              {isFetching && (
                <button
                  onClick={handleStop}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg"
                >
                  <span className="text-xl mr-2">🛑</span>
                  停止
                </button>
              )}

              {logs.length > 0 && !isFetching && (
                <button
                  onClick={() => setLogs([])}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  清空日志
                </button>
              )}
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-gray-300 dark:border-gray-600 my-4"></div>

          {/* 单个平台按钮 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              抓取指定平台
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.name}
                  onClick={() => handleFetch(platform.name)}
                  disabled={isFetching}
                  className={`inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r ${platform.color} text-white font-medium rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
                >
                  <span className="mr-2">{platform.icon}</span>
                  {platform.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 日志显示区域 */}
        {logs.length > 0 && (
          <div className="bg-gray-900 rounded-lg overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-mono text-sm">●</span>
                <span className="text-gray-300 font-semibold">执行日志</span>
              </div>
              <span className="text-xs text-gray-500">
                共 {logs.length} 行
              </span>
            </div>
            <div
              className="overflow-y-auto custom-scrollbar p-4 font-mono text-sm"
              style={{ maxHeight: '500px' }}
            >
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className="text-gray-300 whitespace-pre-wrap break-words leading-relaxed"
                  >
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* 空状态提示 */}
        {logs.length === 0 && !isFetching && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">
              暂无日志
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              点击"开始抓取"按钮执行数据抓取任务
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
