'use client';

import { useState, useRef, useEffect } from 'react';

// 可用的平台列表
const PLATFORMS = [
  { name: 'TFTimes', label: 'TFT Times' },
  { name: 'TFTips', label: 'TFTips' },
  { name: 'YouTube', label: 'YouTube' },
  { name: 'Tacter', label: 'Tacter' },
  { name: 'Bilibili', label: 'B站' },
  { name: 'Douyin', label: '抖音' },
];

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
    <div className="space-y-6">

      {/* 页面标题 */}
      <div>
        <h2 className="text-2xl font-bold text-textLight-100">数据抓取</h2>
        <p className="text-sm text-textLight-300 mt-1">从各平台拉取最新云顶之弈内容并同步至数据库</p>
      </div>

      {/* 主操作区 */}
      <div className="bg-bgDark-600 rounded-xl border border-border p-6">

        {/* 全量抓取行 */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => handleFetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
          >
            {isFetching ? (
              <>
                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                抓取中…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M8 16H3v5"/>
                </svg>
                抓取全部平台
              </>
            )}
          </button>

          {isFetching && (
            <button
              onClick={handleStop}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg font-medium transition-colors text-sm"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
              停止
            </button>
          )}

          {logs.length > 0 && !isFetching && (
            <button
              onClick={() => setLogs([])}
              className="ml-auto text-xs text-textLight-300 hover:text-textLight-100 transition-colors"
            >
              清空日志
            </button>
          )}
        </div>

        {/* 分割线 + 单平台标题 */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-medium text-textLight-300 uppercase tracking-wider whitespace-nowrap">单独抓取</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* 平台卡片网格 */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.name}
              onClick={() => handleFetch(platform.name)}
              disabled={isFetching}
              className="flex flex-col items-center gap-2.5 py-4 px-2 bg-bgDark-700 hover:bg-bgDark-500 border border-border hover:border-primary-500/60 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all group"
            >
              <PlatformIcon platform={platform.name} className="w-6 h-6 group-disabled:grayscale" />
              <span className="text-xs font-medium text-textLight-200">{platform.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 日志区域 */}
      {logs.length > 0 && (
        <div className="bg-bgDark-700 rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bgDark-600">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isFetching ? 'bg-green-400 animate-pulse' : 'bg-textLight-300'}`} />
              <span className="text-sm font-semibold text-textLight-100">执行日志</span>
            </div>
            <span className="text-xs text-textLight-300">{logs.length} 行</span>
          </div>
          <div className="p-4 font-mono text-sm overflow-y-auto" style={{ maxHeight: '480px' }}>
            <div className="space-y-0.5">
              {logs.map((log, index) => (
                <div key={index} className="text-textLight-200 whitespace-pre-wrap break-words leading-relaxed">
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {logs.length === 0 && !isFetching && (
        <div className="flex flex-col items-center justify-center py-20 text-textLight-300">
          <svg viewBox="0 0 24 24" className="w-10 h-10 mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <p className="text-sm">点击上方按钮开始抓取</p>
        </div>
      )}

    </div>
  );
}
