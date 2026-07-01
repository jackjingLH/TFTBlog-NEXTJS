import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildInlineReferenceIndex,
  createInlineReferenceLoader,
  getFloatingReferenceCardPosition,
  INLINE_REFERENCE_CARD_METRICS,
  reduceInlineReferenceInteraction,
  splitMarkdownLineForInlineReferences,
  splitTextByInlineReferences,
} from '../lib/inline-data-references.mjs';

const championReferences = [
  {
    type: 'champion',
    id: 'gwen',
    name: '格温',
    cost: 4,
    traits: ['灵魂莲华', '裁决战士'],
    imageUrl: '/gwen.png',
    skill: { name: '快刀剪乱', detail: '造成魔法伤害。' },
  },
  {
    type: 'champion',
    id: 'dummy',
    name: '训练假人',
    cost: null,
    traits: ['特殊对象'],
    imageUrl: '/dummy.png',
  },
];

const traitReferences = [
  {
    type: 'trait',
    id: 'soul-fighter',
    name: '灵魂莲华',
    imageUrl: '/traits/soul-fighter.png',
    description: '你的队伍获得额外属性。',
    levels: [{ threshold: 3, effect: '获得10%攻击力。' }],
    champions: [{ id: 'gwen', name: '格温', cost: 4, imageUrl: '/gwen.png' }],
  },
];

const itemReferences = [
  {
    type: 'item',
    id: 'deathblade-a',
    name: '死亡之刃',
    imageUrl: '/items/deathblade-a.png',
    categoryLabel: '成装',
    effectText: '提供攻击力。',
    rules: ['唯一 - 每位英雄仅可装备1件。'],
    formula: [
      { id: 'bf-sword', name: '暴风大剑', imageUrl: '/items/bf-sword.png' },
      { id: 'bf-sword-2', name: '暴风大剑', imageUrl: '/items/bf-sword.png' },
    ],
  },
  {
    type: 'item',
    id: 'deathblade-b',
    name: '死亡之刃',
    imageUrl: '/items/deathblade-b.png',
    categoryLabel: '特殊',
    effectText: '同名脏数据，v1 不应优先展示。',
  },
];

const augmentReferences = [
  {
    type: 'augment',
    id: 'going-long',
    name: '遥遥领先',
    imageUrl: '/augments/going-long.png',
    tier: '3',
    tierLabel: '彩',
    effectText: '获得大量金币。',
    rules: ['只能在特定阶段出现。'],
  },
];

test('matches regular champion names and ignores special champion objects', () => {
  const index = buildInlineReferenceIndex({ champions: championReferences });

  const segments = splitTextByInlineReferences('格温携带装备，训练假人不应匹配。', index);

  assert.deepEqual(
    segments.map((segment) => ({
      text: segment.text,
      referenceName: segment.reference?.name,
    })),
    [
      { text: '格温', referenceName: '格温' },
      { text: '携带装备，训练假人不应匹配。', referenceName: undefined },
    ],
  );
});

test('matches only the first full champion name occurrence per article without partial matching', () => {
  const index = buildInlineReferenceIndex({
    champions: [
      ...championReferences,
      {
        type: 'champion',
        id: 'aurelion-sol',
        name: '奥瑞利安-索尔',
        cost: 5,
        traits: ['星神'],
        imageUrl: '/aurelion-sol.png',
      },
    ],
  });

  const seenReferenceIds = new Set();
  const segments = splitTextByInlineReferences('格温过渡到奥瑞利安-索尔，索尔单独写不匹配，格温再次出现。', index, {
    seenReferenceIds,
  });

  assert.deepEqual(
    segments.filter((segment) => segment.reference).map((segment) => segment.text),
    ['格温', '奥瑞利安-索尔'],
  );
});

test('keeps inline data references extensible while enabling supported data reference types', () => {
  const index = buildInlineReferenceIndex({
    champions: championReferences,
    traits: traitReferences,
    items: itemReferences,
    augments: [
      {
        type: 'augment',
        id: 'hedge-fund',
        name: '对冲基金',
        imageUrl: '/hedge-fund.png',
      },
    ],
  });

  const segments = splitTextByInlineReferences('格温带死亡之刃，强化选对冲基金。', index);

  assert.deepEqual(
    segments.filter((segment) => segment.reference).map((segment) => ({
      text: segment.text,
      type: segment.reference.type,
    })),
    [
      { text: '格温', type: 'champion' },
      { text: '死亡之刃', type: 'item' },
      { text: '对冲基金', type: 'augment' },
    ],
  );
  assert.deepEqual(index.types, ['champion', 'trait', 'item', 'augment']);
});

test('matches trait references alongside regular champion references', () => {
  const index = buildInlineReferenceIndex({
    champions: championReferences,
    traits: traitReferences,
  });

  const seenReferenceIds = new Set();
  const segments = splitTextByInlineReferences('格温带灵魂莲华过渡，灵魂莲华再次出现不重复标记。', index, {
    seenReferenceIds,
  });

  assert.deepEqual(index.types, ['champion', 'trait']);
  assert.deepEqual(
    segments.filter((segment) => segment.reference).map((segment) => ({
      text: segment.text,
      type: segment.reference.type,
      name: segment.reference.name,
    })),
    [
      { text: '格温', type: 'champion', name: '格温' },
      { text: '灵魂莲华', type: 'trait', name: '灵魂莲华' },
    ],
  );
});

test('matches item references and keeps the first duplicate item name', () => {
  const index = buildInlineReferenceIndex({
    champions: championReferences,
    traits: traitReferences,
    items: itemReferences,
  });

  const seenReferenceIds = new Set();
  const segments = splitTextByInlineReferences('死亡之刃适合格温，死亡之刃再次出现不重复标记。', index, {
    seenReferenceIds,
  });

  assert.deepEqual(index.types, ['champion', 'trait', 'item']);
  assert.deepEqual(
    segments.filter((segment) => segment.reference).map((segment) => ({
      text: segment.text,
      type: segment.reference.type,
      id: segment.reference.id,
      name: segment.reference.name,
    })),
    [
      { text: '死亡之刃', type: 'item', id: 'deathblade-a', name: '死亡之刃' },
      { text: '格温', type: 'champion', id: 'gwen', name: '格温' },
    ],
  );
});

test('matches augment references once per article', () => {
  const index = buildInlineReferenceIndex({
    champions: championReferences,
    traits: traitReferences,
    items: itemReferences,
    augments: augmentReferences,
  });

  const seenReferenceIds = new Set();
  const segments = splitTextByInlineReferences('拿到遥遥领先后转经济，遥遥领先再次出现不重复标记。', index, {
    seenReferenceIds,
  });

  assert.deepEqual(index.types, ['champion', 'trait', 'item', 'augment']);
  assert.deepEqual(
    segments.filter((segment) => segment.reference).map((segment) => ({
      text: segment.text,
      type: segment.reference.type,
      name: segment.reference.name,
    })),
    [{ text: '遥遥领先', type: 'augment', name: '遥遥领先' }],
  );
});

test('uses longer names before shorter names across all reference types', () => {
  const index = buildInlineReferenceIndex({
    champions: [
      {
        type: 'champion',
        id: 'sol',
        name: '索尔',
        cost: 5,
        traits: ['星神'],
        imageUrl: '/sol.png',
      },
      {
        type: 'champion',
        id: 'aurelion-sol',
        name: '奥瑞利安-索尔',
        cost: 5,
        traits: ['星神'],
        imageUrl: '/aurelion-sol.png',
      },
    ],
    items: [
      {
        type: 'item',
        id: 'long-item',
        name: '奥瑞利安-索尔之冠',
      },
    ],
  });

  const segments = splitTextByInlineReferences('奥瑞利安-索尔之冠不是索尔。', index, {
    seenReferenceIds: new Set(),
  });

  assert.deepEqual(
    segments.filter((segment) => segment.reference).map((segment) => ({
      text: segment.text,
      type: segment.reference.type,
      id: segment.reference.id,
    })),
    [
      { text: '奥瑞利安-索尔之冠', type: 'item', id: 'long-item' },
      { text: '索尔', type: 'champion', id: 'sol' },
    ],
  );
});

test('uses type priority for same-length names across all reference types', () => {
  const sharedName = '共用名';
  const index = buildInlineReferenceIndex({
    augments: [{ type: 'augment', id: 'augment-shared', name: sharedName }],
    items: [{ type: 'item', id: 'item-shared', name: sharedName }],
    traits: [{ type: 'trait', id: 'trait-shared', name: sharedName }],
    champions: [
      {
        type: 'champion',
        id: 'champion-shared',
        name: sharedName,
        cost: 1,
        traits: ['测试羁绊'],
        imageUrl: '/shared.png',
      },
    ],
  });

  const [segment] = splitTextByInlineReferences(sharedName, index).filter((part) => part.reference);

  assert.deepEqual(
    {
      type: segment.reference.type,
      id: segment.reference.id,
    },
    { type: 'champion', id: 'champion-shared' },
  );
});

test('keeps other reference types available when one type is empty and falls back when all are empty', () => {
  const index = buildInlineReferenceIndex({
    champions: [],
    traits: traitReferences,
    items: [],
    augments: [],
  });

  assert.deepEqual(index.types, ['trait']);
  assert.deepEqual(
    splitTextByInlineReferences('灵魂莲华仍可匹配。', index)
      .filter((segment) => segment.reference)
      .map((segment) => segment.reference.type),
    ['trait'],
  );

  const emptyIndex = buildInlineReferenceIndex({
    champions: [],
    traits: [],
    items: [],
    augments: [],
  });

  assert.deepEqual(emptyIndex.types, []);
  assert.deepEqual(splitTextByInlineReferences('灵魂莲华仍然作为普通正文显示。', emptyIndex), [
    { text: '灵魂莲华仍然作为普通正文显示。' },
  ]);
});

test('loads inline reference data by type once and reuses the cached result', async () => {
  let fetchCount = 0;
  const loader = createInlineReferenceLoader({
    fetcher: async (type) => {
      fetchCount += 1;
      assert.equal(type, 'champion');
      return championReferences;
    },
  });

  const [first, second] = await Promise.all([
    loader.load('champion'),
    loader.load('champion'),
  ]);
  const third = await loader.load('champion');

  assert.equal(fetchCount, 1);
  assert.equal(first, second);
  assert.equal(second, third);
});

test('only applies inline references to guide body text and keeps strong emphasis', () => {
  const index = buildInlineReferenceIndex({ champions: championReferences });

  assert.deepEqual(splitMarkdownLineForInlineReferences('# 格温', index).inlineReferenceCount, 0);
  assert.deepEqual(splitMarkdownLineForInlineReferences('标签：格温 / 慢D牌', index).inlineReferenceCount, 0);

  const body = splitMarkdownLineForInlineReferences('优先给**格温**装备，格温可以收割。', index, {
    seenReferenceIds: new Set(),
  });

  assert.equal(body.inlineReferenceCount, 1);
  assert.deepEqual(
    body.tokens.map((token) => ({
      text: token.text,
      kind: token.kind,
      referenceName: token.reference?.name,
    })),
    [
      { text: '优先给', kind: 'text', referenceName: undefined },
      { text: '格温', kind: 'strong-reference', referenceName: '格温' },
      { text: '装备，格温可以收割。', kind: 'text', referenceName: undefined },
    ],
  );
});

test('positions floating reference cards below the trigger and keeps them inside the viewport', () => {
  assert.deepEqual(INLINE_REFERENCE_CARD_METRICS, { width: 280, height: 176, gap: 8, margin: 12 });

  assert.deepEqual(
    getFloatingReferenceCardPosition({
      anchorRect: { left: 40, top: 100, bottom: 122 },
      viewport: { width: 390, height: 800 },
      card: INLINE_REFERENCE_CARD_METRICS,
      gap: INLINE_REFERENCE_CARD_METRICS.gap,
      margin: INLINE_REFERENCE_CARD_METRICS.margin,
    }),
    { left: 40, top: 130, placement: 'bottom' },
  );

  assert.deepEqual(
    getFloatingReferenceCardPosition({
      anchorRect: { left: 360, top: 700, bottom: 722 },
      viewport: { width: 390, height: 800 },
      card: INLINE_REFERENCE_CARD_METRICS,
      gap: INLINE_REFERENCE_CARD_METRICS.gap,
      margin: INLINE_REFERENCE_CARD_METRICS.margin,
    }),
    { left: 98, top: 516, placement: 'top' },
  );
});

test('keeps unlocked hover cards temporary while manual locked cards toggle on repeated activation', () => {
  const gwen = championReferences[0];

  const hovered = reduceInlineReferenceInteraction(null, {
    kind: 'activate',
    reference: gwen,
    rect: { left: 20, top: 40, bottom: 62 },
    locked: false,
  });

  assert.equal(hovered?.reference.name, '格温');
  assert.equal(hovered?.locked, false);
  assert.equal(reduceInlineReferenceInteraction(hovered, { kind: 'hover-leave' }), null);

  const locked = reduceInlineReferenceInteraction(null, {
    kind: 'activate',
    reference: gwen,
    rect: { left: 20, top: 40, bottom: 62 },
    locked: true,
  });

  assert.equal(locked?.locked, true);
  assert.equal(
    reduceInlineReferenceInteraction(locked, {
      kind: 'activate',
      reference: gwen,
      rect: { left: 20, top: 40, bottom: 62 },
      locked: true,
    }),
    null,
  );
  assert.equal(reduceInlineReferenceInteraction(locked, { kind: 'close' }), null);
});

test('converts hover locked cards to manual locked cards instead of closing on click', () => {
  const gwen = championReferences[0];

  const hovered = reduceInlineReferenceInteraction(null, {
    kind: 'activate',
    reference: gwen,
    rect: { left: 20, top: 40, bottom: 62 },
    locked: false,
  });
  const hoverLocked = reduceInlineReferenceInteraction(hovered, {
    kind: 'lock',
    reference: gwen,
    rect: { left: 20, top: 40, bottom: 62 },
  });
  const clicked = reduceInlineReferenceInteraction(hoverLocked, {
    kind: 'activate',
    reference: gwen,
    rect: { left: 20, top: 40, bottom: 62 },
    locked: true,
  });

  assert.equal(clicked?.reference.name, '格温');
  assert.equal(clicked?.locked, true);
});

test('falls back to plain text when no inline reference data is available', () => {
  const index = buildInlineReferenceIndex({ champions: [] });

  assert.deepEqual(splitTextByInlineReferences('格温仍然作为普通正文显示。', index), [
    { text: '格温仍然作为普通正文显示。' },
  ]);
  assert.equal(splitMarkdownLineForInlineReferences('格温仍然作为普通正文显示。', index).inlineReferenceCount, 0);
});
