import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium, expect } from '@playwright/test';

const port = Number(process.env.INLINE_REFERENCE_VERIFY_PORT || 3120);
const baseUrl = `http://127.0.0.1:${port}`;

const guideResponse = {
  guide: {
    id: 1,
    slug: 'tdd-inline',
    title: '格温测试攻略',
    excerpt: '正文英雄引用测试',
    contentMarkdown: [
      '# 格温测试攻略',
      '',
      '标签：格温 / 测试',
      '',
      '## 前置说明',
      '',
      '这是一段用于撑开页面的说明文字。',
      '',
      '这是一段用于撑开页面的说明文字。',
      '',
      '这是一段用于撑开页面的说明文字。',
      '',
      '这是一段用于撑开页面的说明文字。',
      '',
      '这是一段用于撑开页面的说明文字。',
      '',
      '这是一段用于撑开页面的说明文字。',
      '',
      '这是一段用于撑开页面的说明文字。',
      '',
      '优先给**格温**装备，做出死亡之刃，再补挑战者纹章，激活灵魂莲华，拿到遥遥领先，训练假人不应匹配，格温再次出现也不应再次标记，灵魂莲华再次出现也不应再次标记，死亡之刃再次出现也不应再次标记，挑战者纹章再次出现也不应再次标记，遥遥领先再次出现也不应再次标记。',
      '',
      '这是一段用于撑开页面的说明文字。',
    ].join('\n'),
    coverUrl: null,
    source: 'tdd',
    updatedAt: '2026-06-30',
    publishedAt: '2026-06-30',
    readingMinutes: 1,
    tags: ['格温', '测试'],
    status: 'published',
    createdAt: '2026-06-30',
    modifiedAt: '2026-06-30',
  },
};

const dataResponse = {
  type: 'champions',
  available: true,
  total: 2,
  items: [
    {
      id: 'gwen',
      slug: 'gwen',
      name: '格温',
      imageUrl: '/champions/gwen.png',
      cost: 4,
      traits: ['灵魂莲华', '裁决战士'],
      skill: {
        name: '快刀剪乱',
        type: '主动',
        detail: '冲刺并造成魔法伤害。',
        imageUrl: '/skills/gwen.png',
      },
    },
    {
      id: 'dummy',
      slug: 'dummy',
      name: '训练假人',
      imageUrl: '/champions/dummy.png',
      cost: null,
      traits: ['特殊对象'],
    },
  ],
};

const traitResponse = {
  type: 'traits',
  available: true,
  total: 1,
  items: [
    {
      id: 'soul-fighter',
      slug: 'soul-fighter',
      name: '灵魂莲华',
      imageUrl: '/traits/soul-fighter.png',
      description: '你的队伍获得额外属性。',
      levels: [
        { threshold: 3, effect: '获得10%攻击力。' },
        { threshold: 5, effect: '获得20%攻击力。' },
      ],
      champions: [
        { id: 'gwen', slug: 'gwen', name: '格温', cost: 4, imageUrl: '/champions/gwen.png' },
      ],
    },
  ],
};

const itemResponse = {
  type: 'items',
  available: true,
  total: 3,
  items: [
    {
      id: 'deathblade-a',
      slug: 'deathblade-a',
      name: '死亡之刃',
      imageUrl: '/items/deathblade-a.png',
      categoryLabel: '成装',
      effectText: '提供大量攻击力。',
      rules: ['唯一 - 每位英雄仅可装备1件。'],
      formula: [
        { id: 'bf-sword', name: '暴风大剑', imageUrl: '/items/bf-sword.png' },
        { id: 'bf-sword', name: '暴风大剑', imageUrl: '/items/bf-sword.png' },
      ],
    },
    {
      id: 'challenger-emblem',
      slug: 'challenger-emblem',
      name: '挑战者纹章',
      imageUrl: '/items/challenger-emblem.png',
      categoryLabel: '纹章',
      effectText: '携带者获得挑战者羁绊。',
      rules: [
        '用于验证长装备卡片的第一条说明。',
        '用于验证长装备卡片的第二条说明。',
        '用于验证长装备卡片的第三条说明。',
        '用于验证长装备卡片的第四条说明。',
        '用于验证长装备卡片的第五条说明。',
        '用于验证长装备卡片的第六条说明。',
        '用于验证长装备卡片的第七条说明。',
        '用于验证长装备卡片的第八条说明。',
        '用于验证长装备卡片的第九条说明。',
        '用于验证长装备卡片的第十条说明。',
      ],
      formula: [
        { id: 'bf-sword', name: '暴风大剑', imageUrl: '/items/bf-sword.png' },
        { id: 'chain-vest', name: '锁子甲', imageUrl: '/items/chain-vest.png' },
      ],
    },
    {
      id: 'deathblade-b',
      slug: 'deathblade-b',
      name: '死亡之刃',
      imageUrl: '/items/deathblade-b.png',
      categoryLabel: '特殊',
      effectText: '同名脏数据，不应优先展示。',
      rules: [],
      formula: [],
    },
  ],
};

const augmentResponse = {
  type: 'augments',
  available: true,
  total: 1,
  items: [
    {
      id: 'going-long',
      slug: 'going-long',
      name: '遥遥领先',
      imageUrl: '/augments/going-long.png',
      tier: '3',
      tierLabel: '彩',
      effectText: '获得大量金币。',
      rules: ['只能在特定阶段出现。'],
    },
  ],
};

function startServer() {
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });
  return { child, getOutput: () => output };
}

async function waitForServer(getOutput) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 60_000) {
    if (getOutput().includes('Ready')) return;
    try {
      const response = await fetch(`${baseUrl}/guides/tdd-inline`);
      if (response.status < 500) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Next dev server did not become ready on ${baseUrl}\n${getOutput()}`);
}

async function installRoutes(page, requestCounter) {
  await page.route('**/api/guides/tdd-inline', (route) => route.fulfill({ json: guideResponse }));
  await page.route('**/api/data?**', (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('type') === 'champions') {
      requestCounter.champions += 1;
      return route.fulfill({ json: dataResponse });
    }
    if (url.searchParams.get('type') === 'traits') {
      requestCounter.traits += 1;
      return route.fulfill({ json: traitResponse });
    }
    if (url.searchParams.get('type') === 'items') {
      requestCounter.items += 1;
      return route.fulfill({ json: itemResponse });
    }
    if (url.searchParams.get('type') === 'augments') {
      requestCounter.augments += 1;
      return route.fulfill({ json: augmentResponse });
    }
    return route.continue();
  });
}

async function assertCardHasBoundedInternalScroll(card) {
  const state = await card.evaluate((element) => {
    const computed = window.getComputedStyle(element);
    return {
      maxHeight: computed.maxHeight,
      overflowY: computed.overflowY,
      clientHeight: element.clientHeight,
      viewportHeight: window.innerHeight,
    };
  });

  assert.notEqual(state.maxHeight, 'none', 'Inline reference card should limit max-height');
  assert.equal(state.overflowY, 'auto', `Inline reference card should scroll internally, got ${state.overflowY}`);
  assert.ok(
    state.clientHeight <= state.viewportHeight - 24,
    `Inline reference card should stay within viewport height, got ${state.clientHeight}/${state.viewportHeight}`,
  );
}

async function assertScrollableCardKeepsOpenOnWheel(page, card) {
  const beforeScroll = await card.evaluate((element) => ({
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
  assert.ok(
    beforeScroll.scrollHeight > beforeScroll.clientHeight,
    `Expected long card to need internal scrolling, got ${beforeScroll.scrollHeight}/${beforeScroll.clientHeight}`,
  );

  const box = await card.boundingBox();
  assert.ok(box, 'Scrollable card should have a bounding box');
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height - 8, 48));
  await page.mouse.wheel(0, 240);
  await expect(card).toBeVisible();

  const scrollTop = await card.evaluate((element) => element.scrollTop);
  assert.ok(scrollTop > 0, `Expected wheel to scroll inside card, got scrollTop ${scrollTop}`);
}

async function verifyDesktop(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const requestCounter = { champions: 0, traits: 0, items: 0, augments: 0 };
  await installRoutes(page, requestCounter);
  await page.goto(`${baseUrl}/guides/tdd-inline`, { waitUntil: 'domcontentloaded', timeout: 20_000 });

  await expect(page.getByRole('heading', { name: '格温测试攻略', level: 1 }).first()).toBeVisible();
  await expect(page.getByTestId('inline-reference-格温')).toHaveCount(1);
  await expect(page.getByTestId('inline-reference-灵魂莲华')).toHaveCount(1);
  await expect(page.getByTestId('inline-reference-死亡之刃')).toHaveCount(1);
  await expect(page.getByTestId('inline-reference-挑战者纹章')).toHaveCount(1);
  await expect(page.getByTestId('inline-reference-遥遥领先')).toHaveCount(1);
  await expect(page.getByTestId('inline-reference-训练假人')).toHaveCount(0);

  await page.getByTestId('inline-reference-格温').click();
  const card = page.getByRole('dialog', { name: '格温英雄资料' });
  await expect(card).toBeVisible();
  const cardBox = await card.boundingBox();
  assert.ok(cardBox, 'Desktop champion card should have a bounding box');
  assert.ok(cardBox.width <= 280, `Desktop card should be compact, got width ${cardBox.width}`);
  await assertCardHasBoundedInternalScroll(card);
  await expect(card.getByText('4费')).toBeVisible();
  await expect(card.getByText('灵魂莲华')).toBeVisible();
  await expect(card.getByText('裁决战士')).toBeVisible();
  await expect(card.getByText('快刀剪乱')).toBeVisible();
  await expect(card.getByText('冲刺并造成魔法伤害。')).toBeVisible();

  await page.mouse.click(10, 10);
  await expect(card).toHaveCount(0);

  await page.getByTestId('inline-reference-灵魂莲华').click();
  const traitCard = page.getByRole('dialog', { name: '灵魂莲华羁绊资料' });
  await expect(traitCard).toBeVisible();
  await assertCardHasBoundedInternalScroll(traitCard);
  await expect(traitCard.getByText('羁绊')).toBeVisible();
  await expect(traitCard.getByText('你的队伍获得额外属性。')).toBeVisible();
  await expect(traitCard.getByText('获得10%攻击力。')).toBeVisible();
  await expect(traitCard.getByText('格温')).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(traitCard).toHaveCount(0);

  await page.getByTestId('inline-reference-死亡之刃').click();
  const itemCard = page.getByRole('dialog', { name: '死亡之刃装备资料' });
  await expect(itemCard).toBeVisible();
  await assertCardHasBoundedInternalScroll(itemCard);
  await expect(itemCard.getByText('装备', { exact: true })).toBeVisible();
  await expect(itemCard.getByText('成装')).toBeVisible();
  await expect(itemCard.getByText('提供大量攻击力。')).toBeVisible();
  await expect(itemCard.getByText('唯一 - 每位英雄仅可装备1件。')).toBeVisible();
  await expect(itemCard.getByText('合成公式')).toBeVisible();
  await expect(itemCard.getByAltText('暴风大剑')).toHaveCount(2);
  await expect(itemCard.getByText('同名脏数据，不应优先展示。')).toHaveCount(0);

  await page.getByTestId('inline-reference-挑战者纹章').click();
  const challengerItemCard = page.getByRole('dialog', { name: '挑战者纹章装备资料' });
  await expect(challengerItemCard).toBeVisible();
  await assertCardHasBoundedInternalScroll(challengerItemCard);
  await expect(challengerItemCard.getByText('携带者获得挑战者羁绊。')).toBeVisible();
  await expect(challengerItemCard.getByAltText('暴风大剑')).toHaveCount(1);
  await expect(challengerItemCard.getByAltText('锁子甲')).toHaveCount(1);
  await assertScrollableCardKeepsOpenOnWheel(page, challengerItemCard);
  await page.mouse.click(10, 10);
  await expect(challengerItemCard).toHaveCount(0);

  await page.getByTestId('inline-reference-遥遥领先').click();
  const augmentCard = page.getByRole('dialog', { name: '遥遥领先强化符文资料' });
  await expect(augmentCard).toBeVisible();
  await assertCardHasBoundedInternalScroll(augmentCard);
  await expect(augmentCard.getByText('强化符文', { exact: true })).toBeVisible();
  await expect(augmentCard.getByText('彩')).toBeVisible();
  await expect(augmentCard.getByText('获得大量金币。')).toBeVisible();
  await expect(augmentCard.getByText('只能在特定阶段出现。')).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(augmentCard).toHaveCount(0);

  assert.equal(requestCounter.champions, 1);
  assert.equal(requestCounter.traits, 1);
  assert.equal(requestCounter.items, 1);
  assert.equal(requestCounter.augments, 1);
  await page.close();
}

async function verifyMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const requestCounter = { champions: 0, traits: 0, items: 0, augments: 0 };
  await installRoutes(page, requestCounter);
  await page.goto(`${baseUrl}/guides/tdd-inline`, { waitUntil: 'domcontentloaded', timeout: 20_000 });

  const mobileChecks = [
    { name: '格温', dialog: '格温英雄资料', label: '英雄', text: '快刀剪乱' },
    { name: '灵魂莲华', dialog: '灵魂莲华羁绊资料', label: '羁绊', text: '获得10%攻击力。' },
    { name: '死亡之刃', dialog: '死亡之刃装备资料', label: '装备', text: '提供大量攻击力。' },
    { name: '挑战者纹章', dialog: '挑战者纹章装备资料', label: '装备', text: '携带者获得挑战者羁绊。' },
    { name: '遥遥领先', dialog: '遥遥领先强化符文资料', label: '强化符文', text: '获得大量金币。' },
  ];

  for (const check of mobileChecks) {
    const trigger = page.getByTestId(`inline-reference-${check.name}`);
    await trigger.evaluate((element) => element.scrollIntoView({ block: 'end' }));
    await trigger.tap();
    const card = page.getByRole('dialog', { name: check.dialog });
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    const triggerBox = await trigger.boundingBox();
    assert.ok(box, `${check.name} card should have a bounding box`);
    assert.ok(triggerBox, `${check.name} inline reference trigger should have a bounding box`);
    assert.ok(box.x >= 0, `${check.name} card x should stay inside viewport, got ${box.x}`);
    assert.ok(box.x + box.width <= 390, `${check.name} card width should stay inside viewport, got ${box.x + box.width}`);
    assert.ok(box.width <= 280, `${check.name} mobile card should be compact, got width ${box.width}`);
    await assertCardHasBoundedInternalScroll(card);
    await expect(card.getByText(check.label, { exact: true })).toBeVisible();
    await expect(card.getByText(check.text)).toBeVisible();
    assert.ok(box.y + box.height <= triggerBox.y, `${check.name} card should open above bottom trigger, card bottom ${box.y + box.height}, trigger y ${triggerBox.y}`);

    await page.touchscreen.tap(8, 8);
    await expect(card).toHaveCount(0);
  }
  assert.equal(requestCounter.champions, 1);
  assert.equal(requestCounter.traits, 1);
  assert.equal(requestCounter.items, 1);
  assert.equal(requestCounter.augments, 1);
  await context.close();
}

const server = startServer();
let browser;

try {
  await waitForServer(server.getOutput);
  browser = await chromium.launch();
  await verifyDesktop(browser);
  await verifyMobile(browser);
  console.log('inline champion reference browser verification passed');
} finally {
  if (browser) await browser.close();
  server.child.kill();
}
