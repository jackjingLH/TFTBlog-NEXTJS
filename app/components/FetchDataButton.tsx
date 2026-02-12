'use client';

import { useState, useRef, useEffect } from 'react';

export default function FetchDataButton() {
  const [isFetching, setIsFetching] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showLogs]);

  const handleFetch = async () => {
    setIsFetching(true);
    setShowLogs(true);
    setLogs([]);

    try {
      const response = await fetch('/api/fetch');

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
      setLogs((prev) => [...prev, `\n❌ 错误: ${error.message}`]);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handleFetch}
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
              抓取数据
            </>
          )}
        </button>

        {showLogs && (
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {showLogs ? '隐藏日志' : '显示日志'}
          </button>
        )}
      </div>

      {/* 日志显示区域 */}
      {showLogs && (
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-hidden">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-700">
            <span className="text-gray-400 font-semibold">执行日志</span>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              清空
            </button>
          </div>
          <div
            className="overflow-y-auto custom-scrollbar"
            style={{ maxHeight: '400px' }}
          >
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-4">
                等待日志输出...
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className="text-gray-300 whitespace-pre-wrap break-words"
                  >
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
