import { expect, test } from '@playwright/test';

test.setTimeout(30_000);

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
      '优先给**格温**装备，训练假人不应匹配。',
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

test('guide body champion names open a compact champion card without marking title or tags', async ({ page }) => {
  let dataRequestCount = 0;
  await page.route('**/api/guides/tdd-inline', (route) => route.fulfill({ json: guideResponse }));
  await page.route('**/api/data?**', (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('type') === 'champions') {
      dataRequestCount += 1;
      return route.fulfill({ json: dataResponse });
    }

    return route.continue();
  });

  await page.goto('/guides/tdd-inline', { waitUntil: 'domcontentloaded', timeout: 15_000 });

  await expect(page.getByRole('heading', { name: '格温测试攻略', level: 1 }).first()).toBeVisible();
  await expect(page.getByTestId('inline-reference-格温')).toHaveCount(1);
  await expect(page.getByTestId('inline-reference-训练假人')).toHaveCount(0);

  await page.getByTestId('inline-reference-格温').click();

  const card = page.getByRole('dialog', { name: '格温英雄资料' });
  await expect(card).toBeVisible();
  await expect(card.getByText('4费')).toBeVisible();
  await expect(card.getByText('灵魂莲华')).toBeVisible();
  await expect(card.getByText('裁决战士')).toBeVisible();
  await expect(card.getByText('快刀剪乱')).toBeVisible();
  await expect(card.getByText('冲刺并造成魔法伤害。')).toBeVisible();
  expect(dataRequestCount).toBe(1);
});
