'use client';

import { useState, useRef, useEffect } from 'react';

// 可用的平台列表
const PLATFORMS = [
  { name: 'TFTimes', label: 'TFT Times', icon: '🇯🇵', color: 'from-primary-500 to-primary-600' },
  { name: 'TFTips', label: 'TFTips', icon: '🎮', color: 'from-primary-500 to-primary-600' },
  { name: 'YouTube', label: 'YouTube', icon: '📺', color: 'from-primary-500 to-primary-600' },
  { name: 'Tacter', label: 'Tacter', icon: '📖', color: 'from-primary-500 to-primary-600' },
  { name: 'Bilibili', label: 'B站', icon: '📹', color: 'from-primary-500 to-primary-600' },
  { name: 'Douyin', label: '抖音', icon: '♪', color: 'from-[#FE2C55] to-[#FE2C55]' },
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
      <h2 className="text-2xl font-bold text-textLight-100 mb-6">
        数据抓取
      </h2>

      <div className="space-y-6">
        {/* 操作按钮区域 */}
        <div className="bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-xl p-8 border-2 border-primary-500/40 shadow-lg">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-textLight-100 mb-2">
              执行抓取任务
            </h3>
            <p className="text-sm text-textLight-200">
              从 TFT Times、TFTips、YouTube、Tacter、Bilibili 和抖音抓取最新的云顶之弈内容
            </p>
          </div>

          {/* 全部抓取按钮 */}
          <div className="mb-6 bg-bgDark-700/50 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleFetch()}
                disabled={isFetching}
                className="inline-flex items-center px-8 py-4 text-white text-lg font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl hover:shadow-2xl hover:scale-105 border-2"
                style={{
                  background: 'linear-gradient(to right, #D68910, #B8700B)',
                  borderColor: 'rgba(214, 137, 16, 0.4)'
                }}
                onMouseEnter={(e) => {
                  if (!isFetching) {
                    e.currentTarget.style.background = 'linear-gradient(to right, #E69A1A, #C97D0F)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isFetching) {
                    e.currentTarget.style.background = 'linear-gradient(to right, #D68910, #B8700B)';
                  }
                }}
              >
                {isFetching ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
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
                    <span className="text-2xl mr-2">🔄</span>
                    抓取全部平台
                  </>
                )}
              </button>

              {isFetching && (
                <button
                  onClick={handleStop}
                  className="inline-flex items-center px-6 py-3 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg"
                >
                  <span className="text-xl mr-2">🛑</span>
                  停止
                </button>
              )}

              {logs.length > 0 && !isFetching && (
                <button
                  onClick={() => setLogs([])}
                  className="text-sm text-textLight-300 hover:text-textLight-100 transition-colors"
                >
                  清空日志
                </button>
              )}
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-primary-500/30 my-6"></div>

          {/* 单个平台按钮 */}
          <div className="bg-bgDark-700/50 rounded-lg p-4 backdrop-blur-sm">
            <h4 className="text-base font-semibold text-textLight-100 mb-4">
              抓取指定平台
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.name}
                  onClick={() => handleFetch(platform.name)}
                  disabled={isFetching}
                  className="inline-flex items-center justify-center px-4 py-3 text-white font-semibold rounded-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md border"
                  style={{
                    background: 'linear-gradient(to right, #D68910, #B8700B)',
                    borderColor: 'rgba(214, 137, 16, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isFetching) {
                      e.currentTarget.style.boxShadow = '0 10px 40px -10px rgba(214, 137, 16, 0.5)';
                      e.currentTarget.style.background = 'linear-gradient(to right, #E69A1A, #C97D0F)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isFetching) {
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.background = 'linear-gradient(to right, #D68910, #B8700B)';
                    }
                  }}
                >
                  {platform.name === 'TFTips' ? (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2" style={{ fill: 'currentColor' }}>
                      <path style={{ fillOpacity: 1, strokeWidth: 0.242424 }} d="m 113.50683,2.4056419 c -1.57088,0.00273 -3.14001,0.969192 -6.53485,2.9027593 -6.78969,3.8671346 -6.5339,3.4296407 -6.52003,11.1402978 0.0139,7.710655 -0.24318,7.275112 6.56038,11.118633 6.80356,3.843522 6.28989,3.843806 13.07957,-0.02333 6.78969,-3.867135 6.5339,-3.429641 6.52003,-11.140296 -0.0139,-7.710657 0.244,-7.2742803 -6.55955,-11.1178021 -3.40179,-1.9217609 -4.97469,-2.8829925 -6.54555,-2.8802637 z m 0.12351,7.0894309 c 0.77684,-0.0013 1.55385,0.465287 3.23613,1.3988902 3.36456,1.867208 3.23751,1.655546 3.24437,5.401433 0.006,3.745885 0.13391,3.533584 -3.22378,5.412262 -3.3577,1.878679 -3.10442,1.878039 -6.46897,0.01084 -3.36456,-1.867207 -3.23751,-1.654713 -3.24437,-5.400599 -0.006,-3.745885 -0.13309,-3.533584 3.22461,-5.412263 1.67885,-0.9393392 2.45517,-1.4092282 3.23201,-1.4105542 z" transform="matrix(0.82933656,0,0,0.80530515,-82.645364,-1.7181152)" />
                    </svg>
                  ) : (
                    <span className={`mr-2 text-lg ${platform.name === 'Douyin' ? 'text-[#FE2C55] font-bold' : ''}`}>
                      {platform.icon}
                    </span>
                  )}
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
          <div className="bg-bgDark-600 rounded-lg border-2 border-dashed border-border p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-textLight-200 text-lg mb-2">
              暂无日志
            </p>
            <p className="text-textLight-300 text-sm">
              点击&ldquo;开始抓取&rdquo;按钮执行数据抓取任务
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
