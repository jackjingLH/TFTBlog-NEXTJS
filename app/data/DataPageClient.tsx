'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type DataType = 'champions' | 'traits' | 'items' | 'augments';

type DataItem = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  cost?: number | null;
  traits?: string[];
  description?: string;
  levels?: Array<{ threshold: number; effect: string }>;
  champions?: Array<{ id: string; slug: string; name: string; cost: number | null; imageUrl: string }>;
  categoryLabel?: string;
  effectText?: string;
  rules?: string[];
  formula?: Array<{ id: string; name: string; imageUrl: string; unresolved?: boolean }>;
};

type DataResponse = {
  type: DataType;
  available: boolean;
  total: number;
  items: DataItem[];
};

const tabs: Array<{ type: DataType; label: string; disabled?: boolean }> = [
  { type: 'champions', label: '英雄' },
  { type: 'traits', label: '羁绊' },
  { type: 'items', label: '装备' },
  { type: 'augments', label: '强化符文', disabled: true },
];

const placeholders: Record<DataType, string> = {
  champions: '搜索英雄或羁绊',
  traits: '搜索羁绊',
  items: '搜索装备',
  augments: '强化符文待补充',
};

function normalizeType(value: string | null): DataType {
  return value === 'traits' || value === 'items' || value === 'augments' ? value : 'champions';
}

function resultLabel(type: DataType) {
  return tabs.find((tab) => tab.type === type)?.label || '英雄';
}

function buildDataUrl(type: DataType, query: string) {
  const params = new URLSearchParams();
  params.set('type', type);
  if (query.trim()) {
    params.set('q', query.trim());
  }
  return `/api/data?${params.toString()}`;
}

function ChampionRow({ item }: { item: DataItem }) {
  return (
    <div className="flex min-h-[60px] items-center gap-3 border-b border-border/70 bg-white px-3 py-2 last:border-b-0">
      <img
        src={item.imageUrl}
        alt={item.name}
        className="h-11 w-11 flex-none rounded-md border border-border bg-gray-100 object-cover"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-text-primary">{item.name}</p>
          <span className="flex-none rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
            {item.cost || '-'}费
          </span>
        </div>
        <div className="mt-1 flex gap-1 overflow-hidden">
          {(item.traits || []).slice(0, 3).map((trait) => (
            <span
              key={trait}
              className={`truncate rounded px-1.5 py-0.5 text-xs ${
                trait === '特殊对象' ? 'bg-gray-100 text-text-secondary' : 'bg-accent-light text-accent'
              }`}
            >
              {trait}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SimpleRow({ item, type }: { item: DataItem; type: DataType }) {
  return (
    <div className="flex min-h-[56px] items-center gap-3 border-b border-border/70 bg-white px-3 py-2 last:border-b-0">
      <img
        src={item.imageUrl}
        alt={item.name}
        className="h-9 w-9 flex-none rounded-md border border-border bg-gray-100 object-cover"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">{item.name}</p>
        {type === 'items' && item.categoryLabel ? <p className="mt-0.5 text-xs text-text-secondary">{item.categoryLabel}</p> : null}
      </div>
    </div>
  );
}

function ItemRow({ item }: { item: DataItem }) {
  return (
    <div className="flex gap-3 border-b border-border/70 bg-white px-3 py-3 last:border-b-0">
      <img
        src={item.imageUrl}
        alt={item.name}
        className="h-10 w-10 flex-none rounded-md border border-border bg-gray-100 object-cover"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-text-primary">{item.name}</p>
          {item.categoryLabel ? (
            <span className="flex-none rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-text-secondary">
              {item.categoryLabel}
            </span>
          ) : null}
        </div>
        {item.effectText ? <p className="mt-1 line-clamp-3 text-xs leading-5 text-text-secondary">{item.effectText}</p> : null}
        {item.rules?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.rules.map((rule) => (
              <span key={`${item.id}-${rule}`} className="rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-text-secondary">
                {rule}
              </span>
            ))}
          </div>
        ) : null}
        {item.formula?.length ? (
          <div className="mt-2">
            <p className="text-xs font-medium text-text-primary">合成公式</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {item.formula.map((material) => (
                <span
                  key={`${item.id}-${material.id}`}
                  className="inline-flex max-w-full items-center gap-1.5 rounded border border-border bg-white px-1.5 py-1 text-xs text-text-secondary"
                >
                  {material.imageUrl ? (
                    <img
                      src={material.imageUrl}
                      alt={material.name}
                      className="h-5 w-5 flex-none rounded border border-border bg-gray-100 object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <span className="truncate">{material.name}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TraitRow({ item }: { item: DataItem }) {
  return (
    <div className="flex gap-3 border-b border-border/70 bg-white px-3 py-3 last:border-b-0">
      <img
        src={item.imageUrl}
        alt={item.name}
        className="h-10 w-10 flex-none rounded-md border border-slate-600 bg-slate-700 p-1.5 object-contain"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">{item.name}</p>
        {item.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary">{item.description}</p> : null}
        {item.levels?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.levels.map((level) => (
              <span key={`${item.id}-${level.threshold}`} className="rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-text-secondary">
                {level.effect}
              </span>
            ))}
          </div>
        ) : null}
        {item.champions?.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {item.champions.map((champion) => (
              <span key={champion.id} className="inline-flex max-w-full items-center gap-1.5 rounded border border-border bg-white px-1.5 py-1 text-xs text-text-secondary">
                <img
                  src={champion.imageUrl}
                  alt={champion.name}
                  className="h-5 w-5 flex-none rounded border border-border bg-gray-100 object-cover"
                  loading="lazy"
                />
                <span className="truncate">{champion.name}</span>
                <span className="flex-none text-amber-700">{champion.cost || '-'}费</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white px-4 py-8 text-center">
      <h2 className="text-base font-bold text-text-primary">没有找到相关资料</h2>
      <p className="mt-2 text-sm text-text-secondary">换个关键词试试</p>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-white px-4 py-8 text-center">
      <h2 className="text-base font-bold text-text-primary">资料暂时无法加载</h2>
    </div>
  );
}

export default function DataPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeType = normalizeType(searchParams.get('type'));
  const query = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(query);
  const [data, setData] = useState<DataResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(buildDataUrl(activeType, query), { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Data request failed: ${response.status}`);
        }
        return response.json() as Promise<DataResponse>;
      })
      .then((body) => {
        if (!cancelled) {
          setData(body);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          console.error(requestError);
          setError(true);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeType, query]);

  useEffect(() => {
    if (inputValue === query) return;

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('type', activeType);
      if (inputValue.trim()) {
        params.set('q', inputValue.trim());
      } else {
        params.delete('q');
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [activeType, inputValue, pathname, query, router, searchParams]);

  const summary = useMemo(() => {
    const label = resultLabel(activeType);
    if (query) {
      return `${label} · “${query}” · ${data?.total ?? 0} 条结果`;
    }
    return `${label} · ${data?.total ?? 0} 条结果`;
  }, [activeType, data?.total, query]);

  function selectType(nextType: DataType) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', nextType);
    params.delete('q');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const items = data?.items || [];

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b border-border bg-surface px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-text-primary">资料查询</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
            英雄、羁绊和装备快速查询。强化符文数据补齐后开放。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-3 px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="资料类型">
          {tabs.map((tab) => (
            <button
              key={tab.type}
              type="button"
              disabled={tab.disabled}
              onClick={() => selectType(tab.type)}
              className={`h-10 flex-none rounded-lg border px-3 text-sm font-medium transition ${
                activeType === tab.type
                  ? 'border-accent bg-accent text-white'
                  : tab.disabled
                    ? 'border-border bg-gray-100 text-gray-400'
                    : 'border-border bg-white text-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="sr-only">搜索资料</span>
          <input
            aria-label="搜索资料"
            value={inputValue}
            disabled={activeType === 'augments'}
            onChange={(event) => setInputValue(event.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:bg-gray-100"
            placeholder={placeholders[activeType]}
          />
        </label>

        <p className="px-1 text-sm text-text-secondary">{summary}</p>

        {error ? (
          <ErrorState />
        ) : loading ? (
          <div className="rounded-lg border border-border bg-white px-4 py-8 text-center text-sm text-text-secondary">加载中</div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            {items.map((item) =>
              activeType === 'champions' ? (
                <ChampionRow key={item.id} item={item} />
              ) : activeType === 'traits' ? (
                <TraitRow key={item.id} item={item} />
              ) : activeType === 'items' ? (
                <ItemRow key={item.id} item={item} />
              ) : (
                <SimpleRow key={item.id} item={item} type={activeType} />
              ),
            )}
          </div>
        )}
      </section>
    </main>
  );
}
