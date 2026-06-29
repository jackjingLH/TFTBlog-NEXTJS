import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import sqlite3 from 'sqlite3';

const port = 43400 + Math.floor(Math.random() * 1000);
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tftblog-data-page-contract-'));
const databasePath = path.join(tempRoot, 'content.sqlite');
const chromiumExecutable = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((filePath) => filePath && fs.existsSync(filePath));

function exec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => (error ? reject(error) : resolve()));
  });
}

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()));
  });
}

async function seedDatabase() {
  const db = new sqlite3.Database(databasePath);
  await exec(db, `
    CREATE TABLE sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_url TEXT NOT NULL,
      game_version TEXT NOT NULL,
      set_id TEXT NOT NULL,
      synced_at TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE champions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL REFERENCES sources(id),
      external_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      name_zh TEXT NOT NULL,
      name_en TEXT NOT NULL DEFAULT '',
      cost INTEGER,
      traits_json TEXT NOT NULL DEFAULT '[]',
      skill_name TEXT NOT NULL DEFAULT '',
      skill_type TEXT NOT NULL DEFAULT '',
      skill_detail TEXT NOT NULL DEFAULT '',
      skill_image_url TEXT NOT NULL DEFAULT '',
      stats_json TEXT NOT NULL DEFAULT '{}',
      image_path TEXT NOT NULL,
      image_url TEXT NOT NULL,
      game_version TEXT NOT NULL,
      set_id TEXT NOT NULL
    );

    CREATE TABLE traits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL REFERENCES sources(id),
      external_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      name_zh TEXT NOT NULL,
      name_en TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      levels_json TEXT NOT NULL DEFAULT '[]',
      image_path TEXT NOT NULL,
      image_url TEXT NOT NULL,
      game_version TEXT NOT NULL,
      set_id TEXT NOT NULL
    );

    CREATE TABLE items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL REFERENCES sources(id),
      external_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      name_zh TEXT NOT NULL,
      name_en TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      effect_text TEXT NOT NULL DEFAULT '',
      rules_json TEXT NOT NULL DEFAULT '[]',
      keywords_json TEXT NOT NULL DEFAULT '[]',
      formula_json TEXT NOT NULL DEFAULT '[]',
      image_path TEXT NOT NULL,
      image_url TEXT NOT NULL,
      game_version TEXT NOT NULL,
      set_id TEXT NOT NULL
    );

    CREATE TABLE augments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL REFERENCES sources(id),
      external_id TEXT NOT NULL,
      slug TEXT NOT NULL,
      name_zh TEXT NOT NULL,
      name_en TEXT NOT NULL DEFAULT '',
      tier TEXT NOT NULL DEFAULT '',
      effect_text TEXT NOT NULL DEFAULT '',
      rules_json TEXT NOT NULL DEFAULT '[]',
      image_path TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL,
      game_version TEXT NOT NULL,
      set_id TEXT NOT NULL
    );

    CREATE TABLE trait_champions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trait_id INTEGER NOT NULL REFERENCES traits(id),
      champion_id INTEGER NOT NULL REFERENCES champions(id),
      game_version TEXT NOT NULL,
      set_id TEXT NOT NULL
    );

    INSERT INTO sources (id, source_url, game_version, set_id, synced_at, status)
    VALUES (1, 'https://example.test/tft', 'current', 'current', '2026-06-25T00:00:00.000Z', 'partial');

    INSERT INTO champions (
      source_id, external_id, slug, name_zh, cost, traits_json,
      stats_json, image_path, image_url, game_version, set_id
    )
    VALUES
      (1, 'aatrox', 'aatrox', '亚托克斯', 1, '["堡垒卫士"]',
       '{"role":"物理战士","englishName":"TFT17_Aatrox","baseHealth":"650","baseAttack":"35","attackGrowth":"35/53/79","healthGrowth":"650/1170/2106","healthMultiplier":"1.8","attackMultiplier":"1.5","armor":"40","magicResist":"40","attackSpeed":"0.6","range":"1","mana":"30/100","critRate":"25","critDamage":"140"}',
       'assets/tft/champions/aatrox.png', 'https://cdn.example.test/aatrox.png', 'current', 'current'),
      (1, 'jinx', 'jinx', '金克丝', 2, '["幻灵战队"]',
       '{}',
       'assets/tft/champions/jinx.png', 'https://cdn.example.test/jinx.png', 'current', 'current'),
      (1, 'forge', 'forge', '成装锻造器', 8, '[]',
       '{}',
       'assets/tft/champions/forge.png', 'https://cdn.example.test/forge.png', 'current', 'current');

    INSERT INTO traits (
      source_id, external_id, slug, name_zh, description, levels_json, image_path, image_url, game_version, set_id
    )
    VALUES
      (1, 'anima', 'anima', '幻灵战队',
       '每击败一名敌人时，【幻灵战队】成员会获得攻击力和法术强度。',
       '[{"threshold":3,"effect":"(3) 10%攻击力和法术强度"},{"threshold":5,"effect":"(5) 20%攻击力和法术强度"}]',
       'assets/tft/traits/anima.png', 'https://cdn.example.test/anima.png', 'current', 'current');

    INSERT INTO items (
      source_id, external_id, slug, name_zh, category, effect_text, rules_json, keywords_json, formula_json, image_path, image_url, game_version, set_id
    )
    VALUES
      (1, 'broken-prototype', 'broken-prototype', '破损原型', '4',
       '+100生命值;对战开始时：获得一个15%最大生命值的护盾。',
       '["唯一 - 每位英雄仅可装备1件。"]',
       '["破损原型","隐藏关键词"]',
       '[]',
       'assets/tft/items/broken-prototype.png', 'https://cdn.example.test/broken-prototype.png', 'current', 'current'),
      (1, 'bf-sword', 'bf-sword', '暴风大剑', '1', '', '[]', '["攻击力"]', '[]',
       'assets/tft/items/bf-sword.png', 'https://cdn.example.test/bf-sword.png', 'current', 'current'),
      (1, 'challenger-emblem', 'challenger-emblem', '挑战者纹章', '2',
       '+30%攻击速度;携带者获得【挑战者】羁绊。',
       '[]',
       '["挑战者纹章"]',
       '[{"id":"bf-sword","name":"暴风大剑","imageUrl":"https://cdn.example.test/bf-sword.png"},{"id":"missing","name":"未知材料 missing","imageUrl":"","unresolved":true}]',
       'assets/tft/items/challenger-emblem.png', 'https://cdn.example.test/challenger-emblem.png', 'current', 'current'),
      (1, 'investor-blade-a', 'investor-blade-a', '投机者之刃', '7',
       '+55%攻击速度;',
       '[]',
       '["投机者之刃"]',
       '[]',
       'assets/tft/items/investor-blade-a.png', 'https://cdn.example.test/investor-blade-a.png', 'current', 'current'),
      (1, 'investor-blade-b', 'investor-blade-b', '投机者之刃', '7',
       '+15%攻击速度;',
       '[]',
       '["投机者之刃"]',
       '[]',
       'assets/tft/items/investor-blade-b.png', 'https://cdn.example.test/investor-blade-b.png', 'current', 'current'),
      (1, 'gwens-shears-2', 'gwens-shears-2', '【格温的剪子】(还可使用2次！)', '9',
       '对一个弈子使用，即可移除其所有装备。',
       '[]',
       '["格温的剪子"]',
       '[]',
       'assets/tft/items/gwens-shears-2.png', 'https://cdn.example.test/gwens-shears-2.png', 'current', 'current');

    INSERT INTO augments (
      source_id, external_id, slug, name_zh, tier, effect_text, rules_json, image_path, image_url, game_version, set_id
    )
    VALUES
      (1, '94573', '94573', '有用之材 I', '1',
       '未携带装备的弈子们在阵亡时有40%几率掉落1金币。',
       '[]',
       '', 'https://game.gtimg.cn/images/lol/act/img/tft/hex/94573.png', '16.13', '2026.S17'),
      (1, '94574', '94574', '英勇福袋', '2',
       '获得2个【次级英雄复制器】和5金币。',
       '["这个物品允许你能复制一个3费或以下的弈子。"]',
       '', 'https://game.gtimg.cn/images/lol/act/img/tft/hex/94574.png', '16.13', '2026.S17'),
      (1, '94572', '94572', '遥遥领先', '3',
       '你不再获得利息。即刻获得16金币。在你的回合开始时，获得4经验。',
       '["利息是你每储存10金币时获得的额外金币。"]',
       '', 'https://game.gtimg.cn/images/lol/act/img/tft/hex/94572.png', '16.13', '2026.S17');

    INSERT INTO trait_champions (trait_id, champion_id, game_version, set_id)
    VALUES
      (1, 1, 'current', 'current'),
      (1, 2, 'current', 'current');
  `);
  await close(db);
}

function request(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${pathname}`, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
  });
}

async function waitForServer(child) {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    if (child.exitCode !== null) {
      throw new Error(`Next dev server exited before readiness with code ${child.exitCode}`);
    }

    try {
      const status = await request('/data');
      if (status === 200) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  throw new Error('Next dev server did not become ready.');
}

function stopChild(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }

    child.once('exit', () => resolve());
    child.kill();
    setTimeout(resolve, 2000);
  });
}

async function main() {
  await seedDatabase();
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', String(port), '--hostname', '127.0.0.1'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: `file:${databasePath}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForServer(child);
    const browser = await chromium.launch(chromiumExecutable ? { executablePath: chromiumExecutable } : {});
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });

      await page.goto(`http://127.0.0.1:${port}/data`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: '资料查询' }).waitFor({ timeout: 10000 });
      await page.getByRole('button', { name: '英雄' }).waitFor({ timeout: 10000 });
      await page.getByText(/英雄 · \d+ 条结果/).waitFor({ timeout: 10000 });
      await page.getByText('成装锻造器').waitFor({ timeout: 10000 });
      await page.getByText('特殊对象').first().waitFor({ timeout: 10000 });
      await page.getByText('亚托克斯').click();
      await page.getByText('基础生命').waitFor({ timeout: 10000 });
      await page.getByText('暴击率').waitFor({ timeout: 10000 });
      await page.getByText('英文内部名').waitFor({ timeout: 10000 });
      await page.getByText('TFT17_Aatrox').waitFor({ timeout: 10000 });
      await page.getByRole('textbox', { name: '搜索资料' }).fill('堡垒');
      await page.waitForURL(/type=champions/, { timeout: 10000 });
      await page.getByText('堡垒卫士').first().waitFor({ timeout: 10000 });
      await page.getByRole('textbox', { name: '搜索资料' }).fill('不存在的资料');
      await page.getByText('没有找到相关资料').waitFor({ timeout: 10000 });
      await page.getByText('换个关键词试试').waitFor({ timeout: 10000 });

      await page.goto(`http://127.0.0.1:${port}/data?type=traits`, { waitUntil: 'domcontentloaded' });
      await page.getByPlaceholder('搜索羁绊').waitFor({ timeout: 10000 });
      await page.getByText(/羁绊 · \d+ 条结果/).waitFor({ timeout: 10000 });
      await page.getByText('幻灵战队', { exact: true }).waitFor({ timeout: 10000 });
      await page.getByText(/每击败一名敌人时/).waitFor({ timeout: 10000 });
      await page.getByText('(3) 10%攻击力和法术强度').waitFor({ timeout: 10000 });
      await page.getByText('亚托克斯').waitFor({ timeout: 10000 });
      await page.getByText('金克丝').waitFor({ timeout: 10000 });

      await page.goto(`http://127.0.0.1:${port}/data?type=items&q=破损`, { waitUntil: 'domcontentloaded' });
      await page.getByPlaceholder('搜索装备').waitFor({ timeout: 10000 });
      await page.getByText('装备 · “破损” · 1 条结果').waitFor({ timeout: 10000 });
      await page.getByText('破损原型').waitFor({ timeout: 10000 });
      await page.getByText('强化', { exact: true }).waitFor({ timeout: 10000 });
      await page.getByText(/15%最大生命值的护盾/).waitFor({ timeout: 10000 });
      await page.getByText('唯一 - 每位英雄仅可装备1件。').waitFor({ timeout: 10000 });
      const itemPageText = await page.locator('body').innerText();
      for (const marker of ['<br>', '<tftitemrules>', '<rules>', '@TFTUnitProperty', '%i:', '隐藏关键词']) {
        if (itemPageText.includes(marker)) {
          throw new Error(`Data page should not expose raw item marker or hidden keyword ${marker}: ${itemPageText}`);
        }
      }
      if (itemPageText.includes('合成公式')) {
        throw new Error(`Item without formula should not show an empty formula area: ${itemPageText}`);
      }

      await page.goto(`http://127.0.0.1:${port}/data?type=items&q=挑战者`, { waitUntil: 'domcontentloaded' });
      await page.getByText('挑战者纹章').waitFor({ timeout: 10000 });
      await page.getByText('合成公式').waitFor({ timeout: 10000 });
      await page.getByText('暴风大剑').waitFor({ timeout: 10000 });
      await page.getByText('未知材料 missing').waitFor({ timeout: 10000 });

      await page.goto(`http://127.0.0.1:${port}/data?type=items&q=投机者`, { waitUntil: 'domcontentloaded' });
      await page.getByText('装备 · “投机者” · 2 条结果').waitFor({ timeout: 10000 });
      if ((await page.getByText('投机者之刃', { exact: true }).count()) !== 2) {
        throw new Error('Data page should render both same-name item variants.');
      }
      await page.getByText('特殊', { exact: true }).first().waitFor({ timeout: 10000 });
      const variantPageText = await page.locator('body').innerText();
      if (variantPageText.includes('分类 7')) {
        throw new Error(`Data page should not expose category code labels for type 7: ${variantPageText}`);
      }

      await page.goto(`http://127.0.0.1:${port}/data?type=items&q=格温`, { waitUntil: 'domcontentloaded' });
      await page.getByText('【格温的剪子】(还可使用2次！)').waitFor({ timeout: 10000 });
      await page.getByText('其他', { exact: true }).waitFor({ timeout: 10000 });
      const otherPageText = await page.locator('body').innerText();
      if (otherPageText.includes('<rules>') || otherPageText.includes('分类 9')) {
        throw new Error(`Data page should show cleaned names and readable type 9 labels: ${otherPageText}`);
      }

      await page.goto(`http://127.0.0.1:${port}/data`, { waitUntil: 'domcontentloaded' });
      if (await page.getByRole('button', { name: '强化符文' }).isDisabled()) {
        throw new Error('Augment tab should be enabled when augment API is available.');
      }

      await page.goto(`http://127.0.0.1:${port}/data?type=augments`, { waitUntil: 'domcontentloaded' });
      await page.getByPlaceholder('搜索强化符文').waitFor({ timeout: 10000 });
      await page.getByText('强化符文 · 常规模式 · 16.13 · 3 条结果').waitFor({ timeout: 10000 });
      await page.getByRole('button', { name: '全部' }).waitFor({ timeout: 10000 });
      await page.getByRole('button', { name: '银' }).waitFor({ timeout: 10000 });
      await page.getByRole('button', { name: '金' }).waitFor({ timeout: 10000 });
      await page.getByRole('button', { name: '彩' }).waitFor({ timeout: 10000 });
      await page.getByText('遥遥领先').waitFor({ timeout: 10000 });
      await page.locator('span').filter({ hasText: /^彩$/ }).first().waitFor({ timeout: 10000 });
      await page.getByText(/即刻获得16金币/).waitFor({ timeout: 10000 });
      await page.getByText('利息是你每储存10金币时获得的额外金币。').waitFor({ timeout: 10000 });

      await page.getByRole('button', { name: '彩' }).click();
      await page.waitForURL(/tier=3/, { timeout: 10000 });
      await page.getByText('强化符文 · 常规模式 · 16.13 · 1 条结果').waitFor({ timeout: 10000 });
      await page.getByText('遥遥领先').waitFor({ timeout: 10000 });
      if ((await page.getByText('有用之材 I').count()) !== 0) {
        throw new Error('Augment tier filter should hide other tiers.');
      }

      await page.getByRole('textbox', { name: '搜索资料' }).fill('利息');
      await page.waitForURL(/q=%E5%88%A9%E6%81%AF/, { timeout: 10000 });
      await page.getByText('遥遥领先').waitFor({ timeout: 10000 });
      await page.getByRole('button', { name: '全部' }).click();
      await page.waitForURL((url) => !url.searchParams.has('tier') && url.searchParams.get('q') === '利息', { timeout: 10000 });
      await page.getByText('强化符文 · “利息” · 常规模式 · 16.13 · 1 条结果').waitFor({ timeout: 10000 });
      if ((await page.getByText('PROTOTYPE').count()) !== 0) {
        throw new Error('Formal data page should not contain prototype traces.');
      }
      if ((await page.locator('a', { hasText: '亚托克斯' }).count()) !== 0) {
        throw new Error('Data reference rows should not link to detail pages in v1.');
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      if (overflow) {
        throw new Error('Data page should not have horizontal overflow on mobile viewport.');
      }

      const errorPage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
      await errorPage.route('**/api/data**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json; charset=utf-8',
          body: JSON.stringify({ error: 'forced_contract_error' }),
        });
      });
      await errorPage.goto(`http://127.0.0.1:${port}/data`, { waitUntil: 'domcontentloaded' });
      await errorPage.getByText('资料暂时无法加载').waitFor({ timeout: 10000 });
      await errorPage.close();
    } finally {
      await browser.close();
    }

    console.log('Data page browser contract check passed.');
  } finally {
    await stopChild(child);
    fs.rmSync(tempRoot, { recursive: true, force: true });
    if (stderr.trim()) {
      console.error(stderr.trim());
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
