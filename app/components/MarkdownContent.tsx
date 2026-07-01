'use client';

/* eslint-disable @next/next/no-img-element */

import Image from 'next/image';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  buildInlineReferenceIndex,
  getFloatingReferenceCardPosition,
  INLINE_REFERENCE_CARD_METRICS,
  reduceInlineReferenceInteraction,
  splitMarkdownLineForInlineReferences,
  type InlineDataReference,
  type InlineReferenceIndex,
  type InlineReferenceToken,
} from '@/lib/inline-data-references.mjs';
import { loadInlineReferences } from '@/lib/inline-data-reference-client';

interface MarkdownContentProps {
  markdown: string;
}

type ActiveReference = {
  reference: InlineDataReference;
  rect: { left: number; top: number; bottom: number };
  locked: boolean;
  lockedBy?: 'hover' | 'manual';
};

const MANUAL_ACTIVATION_SCROLL_GRACE_MS = 250;

function readAnchorRect(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    bottom: rect.bottom,
  };
}

function slugifyHeading(text: string) {
  return text
    .replace(/[`*_#]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function referenceTypeLabel(type: InlineDataReference['type']) {
  if (type === 'augment') return '强化符文';
  if (type === 'item') return '装备';
  if (type === 'trait') return '羁绊';
  return '英雄';
}

function ReferenceTypeBadge({ label }: { label: string }) {
  return (
    <span className="flex-none rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] leading-4 text-text-secondary">
      {label}
    </span>
  );
}

function InlineReferenceCard({ active }: { active: ActiveReference }) {
  const reference = active.reference;
  const typeLabel = referenceTypeLabel(reference.type);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardSize, setCardSize] = useState<{ width: number; height: number }>({
    width: INLINE_REFERENCE_CARD_METRICS.width,
    height: INLINE_REFERENCE_CARD_METRICS.height,
  });
  const position = getFloatingReferenceCardPosition({
    anchorRect: active.rect,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    card: cardSize,
    gap: INLINE_REFERENCE_CARD_METRICS.gap,
    margin: INLINE_REFERENCE_CARD_METRICS.margin,
  });

  useLayoutEffect(() => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    setCardSize({
      width: Math.max(INLINE_REFERENCE_CARD_METRICS.width, Math.ceil(rect.width)),
      height: Math.ceil(rect.height),
    });
  }, [active.reference.id]);

  return (
    <div
      role="dialog"
      aria-label={`${reference.name}${typeLabel}资料`}
      data-testid="inline-reference-card"
      data-inline-reference-interactive="true"
      ref={cardRef}
      className="not-prose fixed z-50 !m-0 max-h-[min(360px,calc(100vh-24px))] w-[min(280px,calc(100vw-24px))] overflow-y-auto overscroll-contain rounded-md border border-border bg-white p-2.5 text-left shadow-lg"
      onPointerDown={(event) => event.stopPropagation()}
      style={{
        left: position.left,
        top: position.top,
      }}
    >
      {reference.type === 'augment' ? (
        <AugmentReferenceCardContent reference={reference} typeLabel={typeLabel} />
      ) : reference.type === 'item' ? (
        <ItemReferenceCardContent reference={reference} typeLabel={typeLabel} />
      ) : reference.type === 'trait' ? (
        <TraitReferenceCardContent reference={reference} typeLabel={typeLabel} />
      ) : (
        <ChampionReferenceCardContent reference={reference} typeLabel={typeLabel} />
      )}
    </div>
  );
}

function ChampionReferenceCardContent({ reference, typeLabel }: { reference: InlineDataReference; typeLabel: string }) {
  const traits = reference.traits?.filter((trait) => trait !== '特殊对象') || [];
  const skill = reference.skill;

  return (
    <>
      <div className="flex gap-2.5">
        {reference.imageUrl ? (
          <img
            src={reference.imageUrl}
            alt={reference.name}
            className="h-10 w-10 flex-none rounded-md border border-border bg-gray-100 object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-semibold leading-5 text-text-primary">{reference.name}</p>
            <ReferenceTypeBadge label={typeLabel} />
            <span className="flex-none rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] leading-4 text-amber-700">
              {reference.cost || '-'}费
            </span>
          </div>
          {traits.length ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {traits.map((trait) => (
                <span key={trait} className="rounded bg-accent-light px-1.5 py-0.5 text-[11px] leading-4 text-accent">
                  {trait}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {skill?.name || skill?.detail ? (
        <div className="mt-2 border-t border-border pt-2">
          <div className="flex items-center gap-2">
            {skill?.name ? <p className="text-[13px] font-semibold leading-5 text-text-primary">{skill.name}</p> : null}
            {skill?.type ? <ReferenceTypeBadge label={skill.type} /> : null}
          </div>
          {skill?.detail ? <p className="mt-1 whitespace-pre-line text-[11px] leading-4 text-text-secondary">{skill.detail}</p> : null}
        </div>
      ) : null}
    </>
  );
}

function TraitReferenceCardContent({ reference, typeLabel }: { reference: InlineDataReference; typeLabel: string }) {
  return (
    <>
      <div className="flex gap-2.5">
        {reference.imageUrl ? (
          <img
            src={reference.imageUrl}
            alt={reference.name}
            className="h-10 w-10 flex-none rounded-md border border-slate-600 bg-slate-700 p-1.5 object-contain"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-semibold leading-5 text-text-primary">{reference.name}</p>
            <ReferenceTypeBadge label={typeLabel} />
          </div>
          {reference.description ? <p className="mt-1 text-[11px] leading-4 text-text-secondary">{reference.description}</p> : null}
        </div>
      </div>
      {reference.levels?.length ? (
        <div className="mt-2 border-t border-border pt-2">
          <div className="flex flex-wrap gap-1.5">
            {reference.levels.map((level) => (
              <span key={`${reference.id}-${level.threshold}`} className="rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] leading-4 text-text-secondary">
                {level.effect}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {reference.champions?.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {reference.champions.map((champion) => (
            <span key={`${reference.id}-${champion.id}`} className="inline-flex max-w-full items-center gap-1.5 rounded border border-border bg-white px-1.5 py-1 text-[11px] leading-4 text-text-secondary">
              {champion.imageUrl ? (
                <img src={champion.imageUrl} alt={champion.name} className="h-5 w-5 flex-none rounded border border-border bg-gray-100 object-cover" />
              ) : null}
              <span className="truncate">{champion.name}</span>
              <span className="flex-none text-amber-700">{champion.cost || '-'}费</span>
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}

function ItemReferenceCardContent({ reference, typeLabel }: { reference: InlineDataReference; typeLabel: string }) {
  return (
    <>
      <div className="flex gap-2.5">
        {reference.imageUrl ? (
          <img
            src={reference.imageUrl}
            alt={reference.name}
            className="h-10 w-10 flex-none rounded-md border border-border bg-gray-100 object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-semibold leading-5 text-text-primary">{reference.name}</p>
            <ReferenceTypeBadge label={typeLabel} />
            {reference.categoryLabel ? <ReferenceTypeBadge label={reference.categoryLabel} /> : null}
          </div>
          {reference.effectText ? <p className="mt-1 whitespace-pre-line text-[11px] leading-4 text-text-secondary">{reference.effectText}</p> : null}
        </div>
      </div>
      {reference.rules?.length ? (
        <div className="mt-2 border-t border-border pt-2">
          <div className="space-y-1">
            {reference.rules.map((rule) => (
              <p key={`${reference.id}-${rule}`} className="rounded border border-border bg-surface px-1.5 py-1 text-[11px] leading-4 text-text-secondary">
                {rule}
              </p>
            ))}
          </div>
        </div>
      ) : null}
      {reference.formula?.length ? (
        <div className="mt-2">
          <p className="text-[11px] font-semibold leading-4 text-text-primary">合成公式</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {reference.formula.map((material, materialIndex) => (
              <span key={`${reference.id}-${material.id}-${materialIndex}`} className="inline-flex max-w-full items-center gap-1.5 rounded border border-border bg-white px-1.5 py-1 text-[11px] leading-4 text-text-secondary">
                {material.imageUrl ? (
                  <img src={material.imageUrl} alt={material.name} className="h-5 w-5 flex-none rounded border border-border bg-gray-100 object-cover" />
                ) : null}
                <span className="truncate">{material.name}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function AugmentReferenceCardContent({ reference, typeLabel }: { reference: InlineDataReference; typeLabel: string }) {
  return (
    <>
      <div className="flex gap-2.5">
        {reference.imageUrl ? (
          <img
            src={reference.imageUrl}
            alt={reference.name}
            className="h-10 w-10 flex-none rounded-md border border-border bg-gray-100 object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-semibold leading-5 text-text-primary">{reference.name}</p>
            <ReferenceTypeBadge label={typeLabel} />
            {reference.tierLabel ? <ReferenceTypeBadge label={reference.tierLabel} /> : null}
          </div>
          {reference.effectText ? <p className="mt-1 whitespace-pre-line text-[11px] leading-4 text-text-secondary">{reference.effectText}</p> : null}
        </div>
      </div>
      {reference.rules?.length ? (
        <div className="mt-2 border-t border-border pt-2">
          <div className="space-y-1">
            {reference.rules.map((rule) => (
              <p key={`${reference.id}-${rule}`} className="rounded border border-border bg-surface px-1.5 py-1 text-[11px] leading-4 text-text-secondary">
                {rule}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function InlineReferenceButton({
  token,
  strong,
  onActivate,
  onHoverLock,
  onHoverLeave,
}: {
  token: InlineReferenceToken;
  strong?: boolean;
  onActivate: (reference: InlineDataReference, element: HTMLElement, locked: boolean) => void;
  onHoverLock: (reference: InlineDataReference, element: HTMLElement) => number;
  onHoverLeave: () => void;
}) {
  const lockTimer = useRef<number | null>(null);
  const pointerActivated = useRef(false);
  const reference = token.reference;

  if (!reference) {
    return token.text;
  }

  const clearLockTimer = () => {
    if (lockTimer.current !== null) {
      window.clearTimeout(lockTimer.current);
      lockTimer.current = null;
    }
  };

  return (
    <button
      type="button"
      data-testid={`inline-reference-${reference.name}`}
      data-inline-reference-interactive="true"
      className={`inline cursor-pointer border-0 border-b border-dashed border-accent bg-transparent p-0 text-accent decoration-dashed underline-offset-4 hover:text-blue-700 ${
        strong ? 'font-semibold text-orange-600' : ''
      }`}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        clearLockTimer();
        pointerActivated.current = true;
        onActivate(reference, event.currentTarget, true);
      }}
      onPointerEnter={(event) => {
        onActivate(reference, event.currentTarget, false);
        lockTimer.current = onHoverLock(reference, event.currentTarget);
      }}
      onPointerLeave={() => {
        clearLockTimer();
        onHoverLeave();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (pointerActivated.current) {
          pointerActivated.current = false;
          return;
        }
        clearLockTimer();
        onActivate(reference, event.currentTarget, true);
      }}
    >
      {token.text}
    </button>
  );
}

function renderInline(
  text: string,
  referenceIndex: InlineReferenceIndex | null,
  seenReferenceIds: Set<string>,
  onActivate: (reference: InlineDataReference, element: HTMLElement, locked: boolean) => void,
  onHoverLock: (reference: InlineDataReference, element: HTMLElement) => number,
  onHoverLeave: () => void,
) {
  const parsed = splitMarkdownLineForInlineReferences(text, referenceIndex, { seenReferenceIds });

  return parsed.tokens.map((token, index) => {
    if (token.kind === 'strong-reference') {
      return (
        <strong key={index} className="font-semibold text-orange-600">
          <InlineReferenceButton token={token} strong onActivate={onActivate} onHoverLock={onHoverLock} onHoverLeave={onHoverLeave} />
        </strong>
      );
    }

    if (token.kind === 'reference') {
      return <InlineReferenceButton key={index} token={token} onActivate={onActivate} onHoverLock={onHoverLock} onHoverLeave={onHoverLeave} />;
    }

    if (token.kind === 'strong') {
      return (
        <strong key={index} className="font-semibold text-orange-600">
          {token.text}
        </strong>
      );
    }

    if (token.kind === 'code') {
      return (
        <code key={index} className="break-words rounded bg-gray-100 px-2 py-0.5 text-sm text-accent font-mono">
          {token.text}
        </code>
      );
    }

    if (token.kind === 'hashtag') {
      return (
        <span key={index} className="mr-1 inline-flex break-words text-sm text-accent">
          {token.text}
        </span>
      );
    }

    return token.text;
  });
}

export default function MarkdownContent({ markdown }: MarkdownContentProps) {
  const [champions, setChampions] = useState<InlineDataReference[]>([]);
  const [traits, setTraits] = useState<InlineDataReference[]>([]);
  const [items, setItems] = useState<InlineDataReference[]>([]);
  const [augments, setAugments] = useState<InlineDataReference[]>([]);
  const [activeReference, setActiveReference] = useState<ActiveReference | null>(null);
  const lastManualActivationAt = useRef(0);
  const activeReferenceAnchor = useRef<HTMLElement | null>(null);
  const activeReferenceRef = useRef<ActiveReference | null>(null);

  const syncActiveReferenceRect = (reference: InlineDataReference) => {
    window.requestAnimationFrame(() => {
      const anchor = activeReferenceAnchor.current;
      if (!anchor?.isConnected) return;

      setActiveReference((current) =>
        current?.reference.id === reference.id
          ? {
              ...current,
              rect: readAnchorRect(anchor),
            }
          : current,
      );
    });
  };

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([
      loadInlineReferences('champion'),
      loadInlineReferences('trait'),
      loadInlineReferences('item'),
      loadInlineReferences('augment'),
    ]).then((results) => {
      if (cancelled) return;

      setChampions(results[0].status === 'fulfilled' ? (results[0].value as InlineDataReference[]) : []);
      setTraits(results[1].status === 'fulfilled' ? (results[1].value as InlineDataReference[]) : []);
      setItems(results[2].status === 'fulfilled' ? (results[2].value as InlineDataReference[]) : []);
      setAugments(results[3].status === 'fulfilled' ? (results[3].value as InlineDataReference[]) : []);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    activeReferenceRef.current = activeReference;
  }, [activeReference]);

  useEffect(() => {
    const close = (event: Event) => {
      if (
        event.type === 'scroll' &&
        window.performance.now() - lastManualActivationAt.current < MANUAL_ACTIVATION_SCROLL_GRACE_MS
      ) {
        if (activeReferenceRef.current?.reference) {
          syncActiveReferenceRect(activeReferenceRef.current.reference);
        }
        return;
      }

      const path = event.composedPath();
      const clickedInlineReference = path.some(
        (target) =>
          target instanceof HTMLElement &&
          target.dataset.inlineReferenceInteractive === 'true',
      );

      if (!clickedInlineReference) {
        activeReferenceAnchor.current = null;
        setActiveReference(null);
      }
    };
    document.addEventListener('pointerdown', close);
    window.addEventListener('scroll', close, { passive: true });

    return () => {
      document.removeEventListener('pointerdown', close);
      window.removeEventListener('scroll', close);
    };
  }, []);

  const referenceIndex = useMemo(() => buildInlineReferenceIndex({ champions, traits, items, augments }), [champions, traits, items, augments]);

  const activateReference = (reference: InlineDataReference, element: HTMLElement, locked: boolean) => {
    activeReferenceAnchor.current = element;
    if (locked) {
      lastManualActivationAt.current = window.performance.now();
    }

    setActiveReference((current) =>
      reduceInlineReferenceInteraction(current, {
        kind: 'activate',
        reference,
        rect: readAnchorRect(element),
        locked,
      }),
    );
    syncActiveReferenceRect(reference);
  };

  const hoverLockReference = (reference: InlineDataReference, element: HTMLElement) =>
    window.setTimeout(() => {
      setActiveReference((current) =>
        reduceInlineReferenceInteraction(current, {
          kind: 'lock',
          reference,
          rect: readAnchorRect(element),
        }),
      );
    }, 500);

  const hoverLeaveReference = () => {
    setActiveReference((current) => reduceInlineReferenceInteraction(current, { kind: 'hover-leave' }));
  };

  const lines = markdown
    .replace(/<!--\s*tft-page:\s*\d+\s*-->/g, '\n---page---\n')
    .split(/\r?\n/);
  const seenReferenceIds = new Set<string>();

  return (
    <div className="min-w-0 space-y-4 overflow-hidden text-base leading-7 text-text-primary">
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();

        if (!line || line === '---') return null;

        if (line === '---page---') {
          return <div key={index} className="h-px w-full bg-border my-8" />;
        }

        const heading = line.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
          const level = heading[1].length;
          const text = heading[2].trim();
          const id = slugifyHeading(text);
          const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3';

          return (
            <Tag
              key={index}
              id={id}
              className={
                level === 1
                  ? 'break-words pt-2 text-3xl font-bold leading-tight text-text-primary sm:text-4xl'
                  : level === 2
                    ? 'scroll-mt-24 break-words pt-6 text-2xl font-bold leading-tight text-text-primary'
                    : 'scroll-mt-24 break-words pt-4 text-xl font-semibold text-text-primary'
              }
            >
              {text}
            </Tag>
          );
        }

        const obsidianImage = line.match(/^!\[\[([^\]]+)\]\]$/)?.[1];
        const markdownImage = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        const src = obsidianImage || markdownImage?.[2];

        if (obsidianImage || markdownImage) {
          const alt = markdownImage?.[1] || obsidianImage || '攻略图片';

          if (!src) {
            return (
              <div key={index} className="rounded-lg border border-dashed border-border bg-surface px-4 py-5 text-sm text-text-muted">
                图片待整理：{alt}
              </div>
            );
          }

          return (
            <figure key={index} className="my-6 max-w-full overflow-hidden rounded-lg border border-border bg-surface">
              <Image
                src={src.startsWith('http') ? src : src}
                alt={alt}
                width={900}
                height={520}
                className="h-auto w-full max-w-full object-contain"
                unoptimized
              />
            </figure>
          );
        }

        if (line.startsWith('封面：')) return null;

        if (line.startsWith('标签：')) {
          return (
            <p key={index} className="rounded-lg border border-accent-light bg-accent-light/30 px-4 py-3 text-sm leading-6 text-text-primary">
              {line}
            </p>
          );
        }

        if (line.startsWith('来源：')) {
          return (
            <p key={index} className="pt-4 text-sm text-text-muted">
              {line}
            </p>
          );
        }

        return (
          <p key={index} className="break-words text-text-secondary">
            {renderInline(line, referenceIndex, seenReferenceIds, activateReference, hoverLockReference, hoverLeaveReference)}
          </p>
        );
      })}
      {activeReference ? <InlineReferenceCard active={activeReference} /> : null}
    </div>
  );
}
