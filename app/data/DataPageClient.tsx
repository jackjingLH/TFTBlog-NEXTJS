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
  tier?: string;
  tierLabel?: string;
  gameVersion?: string;
  setId?: string;
  cost?: number | null;
  traits?: string[];
  traitDetails?: Array<{ id: string; slug: string; name: string; imageUrl: string }>;
  description?: string;
  levels?: Array<{ threshold: number; effect: string }>;
  champions?: Array<{ id: string; slug: string; name: string; cost: number | null; imageUrl: string }>;
  categoryLabel?: string;
  effectText?: string;
  rules?: string[];
  formula?: Array<{ id: string; name: string; imageUrl: string; unresolved?: boolean }>;
  skill?: { name: string; type: string; detail: string; imageUrl: string };
  stats?: {
    role?: string;
    attackGrowth?: string;
    healthGrowth?: string;
    armor?: string;
    magicResist?: string;
    attackSpeed?: string;
    range?: string;
    mana?: string;
  };
};

type DataResponse = {
  type: DataType;
  available: boolean;
  total: number;
  items: DataItem[];
};

const tabs: Array<{ type: DataType; label: string }> = [
  { type: 'champions', label: '英雄' },
  { type: 'traits', label: '羁绊' },
  { type: 'items', label: '装备' },
  { type: 'augments', label: '强化符文' },
];

const augmentTiers = [
  { value: '', label: '全部' },
  { value: '1', label: '银' },
  { value: '2', label: '金' },
  { value: '3', label: '彩' },
];

const placeholders: Record<DataType, string> = {
  champions: '搜索英雄或羁绊',
  traits: '搜索羁绊',
  items: '搜索装备',
  augments: '搜索强化符文',
};

function normalizeType(value: string | null): DataType {
  return value === 'traits' || value === 'items' || value === 'augments' ? value : 'champions';
}

function resultLabel(type: DataType) {
  return tabs.find((tab) => tab.type === type)?.label || '英雄';
}

function buildDataUrl(type: DataType, query: string, tier: string) {
  const params = new URLSearchParams();
  params.set('type', type);
  if (query.trim()) {
    params.set('q', query.trim());
  }
  if (type === 'augments' && ['1', '2', '3'].includes(tier)) {
    params.set('tier', tier);
  }
  return `/api/data?${params.toString()}`;
}

function ChampionRow({ item }: { item: DataItem }) {
  const [expanded, setExpanded] = useState(false);
  const skill = item.skill;
  const stats = item.stats;
  const traitDetails = item.traitDetails || [];
  const statItems = [
    { label: '定位', value: stats?.role },
    { label: '攻击成长', value: stats?.attackGrowth },
    { label: '生命成长', value: stats?.healthGrowth },
    { label: '护甲', value: stats?.armor },
    { label: '魔抗', value: stats?.magicResist },
    { label: '攻速', value: stats?.attackSpeed },
    { label: '射程', value: stats?.range },
    { label: '法力', value: stats?.mana },
  ].filter((stat) => stat.value);
  const canExpand = Boolean((skill && (skill.name || skill.detail)) || statItems.length > 0 || traitDetails.length > 0);

  return (
    <div className="border-b border-border/70 bg-white last:border-b-0">
      <button
        type="button"
        onClick={() => canExpand && setExpanded((value) => !value)}
        aria-expanded={canExpand ? expanded : undefined}
        disabled={!canExpand}
        className="flex min-h-[60px] w-full items-center gap-3 px-3 py-2 text-left disabled:cursor-default"
      >
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
        {canExpand ? (
          <span className={`flex-none text-xs text-text-secondary transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden>
            ▾
          </span>
        ) : null}
      </button>
      {canExpand && expanded ? (
        <div className="border-t border-border/60 bg-surface px-3 py-3">
          <div className="flex gap-3">
            {skill?.imageUrl ? (
              <img
                src={skill.imageUrl}
                alt={skill.name}
                className="h-10 w-10 flex-none rounded-md border border-border bg-gray-100 object-cover"
                loading="lazy"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-text-primary">{skill?.name}</p>
                {skill?.type ? (
                  <span className="flex-none rounded border border-border bg-white px-1.5 py-0.5 text-xs text-text-secondary">
                    {skill.type}
                  </span>
                ) : null}
              </div>
              {skill?.detail ? (
                <p className="mt-1 whitespace-pre-line text-xs leading-5 text-text-secondary">{skill.detail}</p>
              ) : null}
            </div>
          </div>
          {statItems.length ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {statItems.map((stat) => (
                <div key={stat.label} className="min-w-0 rounded border border-border bg-white px-2 py-1.5">
                  <p className="text-[11px] leading-4 text-text-secondary">{stat.label}</p>
                  <p className="truncate text-xs font-semibold text-text-primary">{stat.value}</p>
                </div>
              ))}
            </div>
          ) : null}
          {traitDetails.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {traitDetails.map((trait) => (
                <span
                  key={`${item.id}-${trait.id}`}
                  className="inline-flex max-w-full items-center gap-1.5 rounded border border-border bg-white px-1.5 py-1 text-xs text-text-secondary"
                >
                  <img
                    src={trait.imageUrl}
                    alt={trait.name}
                    className="h-5 w-5 flex-none rounded border border-slate-600 bg-slate-700 p-0.5 object-contain"
                    loading="lazy"
                  />
                  <span className="truncate">{trait.name}</span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
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

function AugmentRow({ item }: { item: DataItem }) {
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
          {item.tierLabel ? (
            <span className="flex-none rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-text-secondary">
              {item.tierLabel}
            </span>
          ) : null}
        </div>
        {item.effectText ? <p className="mt-1 text-xs leading-5 text-text-secondary">{item.effectText}</p> : null}
        {item.rules?.length ? (
          <div className="mt-2 space-y-1">
            {item.rules.map((rule) => (
              <p key={`${item.id}-${rule}`} className="rounded border border-border bg-surface px-2 py-1 text-xs leading-5 text-text-secondary">
                {rule}
              </p>
            ))}
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
  const activeTier = ['1', '2', '3'].includes(searchParams.get('tier') || '') ? searchParams.get('tier') || '' : '';
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

    fetch(buildDataUrl(activeType, query, activeTier), { cache: 'no-store' })
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
  }, [activeTier, activeType, query]);

  useEffect(() => {
    if (inputValue === query) return;

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('type', activeType);
      if (activeType !== 'augments') {
        params.delete('tier');
      }
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
    if (activeType === 'augments') {
      const version = data?.items?.[0]?.gameVersion || '';
      const prefix = query ? `${label} · “${query}” · 常规模式` : `${label} · 常规模式`;
      return `${prefix}${version ? ` · ${version}` : ''} · ${data?.total ?? 0} 条结果`;
    }
    if (query) {
      return `${label} · “${query}” · ${data?.total ?? 0} 条结果`;
    }
    return `${label} · ${data?.total ?? 0} 条结果`;
  }, [activeType, data?.items, data?.total, query]);

  function selectType(nextType: DataType) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', nextType);
    params.delete('q');
    params.delete('tier');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function selectAugmentTier(nextTier: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', 'augments');
    if (nextTier) {
      params.set('tier', nextTier);
    } else {
      params.delete('tier');
    }
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
              onClick={() => selectType(tab.type)}
              className={`h-10 flex-none rounded-lg border px-3 text-sm font-medium transition ${
                activeType === tab.type
                  ? 'border-accent bg-accent text-white'
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
            onChange={(event) => setInputValue(event.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-text-primary outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            placeholder={placeholders[activeType]}
          />
        </label>

        {activeType === 'augments' ? (
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="强化符文品质">
            {augmentTiers.map((tier) => (
              <button
                key={tier.value || 'all'}
                type="button"
                onClick={() => selectAugmentTier(tier.value)}
                className={`h-9 flex-none rounded-lg border px-3 text-sm font-medium transition ${
                  activeTier === tier.value ? 'border-accent bg-accent text-white' : 'border-border bg-white text-text-secondary'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>
        ) : null}

        <p className="px-1 text-sm text-text-secondary">{summary}</p>

        {error ? (
          <ErrorState />
        ) : loading ? (
          <div className="rounded-lg border border-border bg-white px-4 py-8 text-center text-sm text-text-secondary">加载中</div>
        ) : data?.available === false ? (
          <div className="rounded-lg border border-dashed border-border bg-white px-4 py-8 text-center">
            <h2 className="text-base font-bold text-text-primary">资料待补充</h2>
          </div>
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
              ) : activeType === 'augments' ? (
                <AugmentRow key={item.id} item={item} />
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
