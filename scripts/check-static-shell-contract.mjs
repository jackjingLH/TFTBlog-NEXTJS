import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import sqlite3 from 'sqlite3';

const root = process.cwd();
const bundleRoot = path.join(root, '.deploy', 'tftblog-static-mvp');
const serverPath = path.join(bundleRoot, 'server.mjs');
const guideShellPath = path.join(bundleRoot, 'html', 'guides', '_shell.html');
const staleGuideHtmlPath = path.join(bundleRoot, 'html', 'guides', 'runtime-guide.html');
const bundledGuideAssetsRoot = path.join(bundleRoot, 'site', 'guides');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tftblog-static-shell-contract-'));
const databasePath = path.join(tempRoot, 'content.sqlite');
const port = 40200 + Math.floor(Math.random() * 1000);

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required static shell artifact is missing: ${filePath}`);
  }
}

function hasBundledGuideAssets(dir) {
  if (!fs.existsSync(dir)) return false;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && hasBundledGuideAssets(fullPath)) return true;
    if (entry.isFile()) return true;
  }

  return false;
}

function exec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => (error ? reject(error) : resolve()));
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (error) => (error ? reject(error) : resolve()));
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
    CREATE TABLE guides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      cover_url TEXT,
      source TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      published_at TEXT,
      status TEXT NOT NULL DEFAULT 'published',
      reading_minutes INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      modified_at TEXT NOT NULL
    );
    CREATE TABLE guide_tags (
      guide_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (guide_id, tag)
    );
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
    CREATE TABLE trait_champions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trait_id INTEGER NOT NULL REFERENCES traits(id),
      champion_id INTEGER NOT NULL REFERENCES champions(id),
      game_version TEXT NOT NULL,
      set_id TEXT NOT NULL
    );
  `);

  const now = new Date().toISOString();
  await run(db, `
    INSERT INTO guides (
      slug, title, excerpt, content_markdown, cover_url, source,
      updated_at, published_at, status, reading_minutes, created_at, modified_at
    )
    VALUES (
      'runtime-guide', '运行时攻略', '运行时摘要', '# 运行时攻略\\n\\n正文',
      'https://cdn.example.com/guides/runtime/cover.png', 'contract',
      '2026-06-09', ?, 'published', 2, ?, ?
    )
  `, [now, now, now]);
  await run(db, 'INSERT INTO guide_tags (guide_id, tag) VALUES (1, ?)', ['运行时']);
  await run(db, `
    INSERT INTO sources (id, source_url, game_version, set_id, synced_at, status)
    VALUES (1, 'https://example.test/tft', 'current', 'current', ?, 'partial')
  `, [now]);
  await run(db, `
    INSERT INTO champions (
      source_id, external_id, slug, name_zh, cost, traits_json,
      image_path, image_url, game_version, set_id
    )
    VALUES
      (1, 'aatrox', 'aatrox', '亚托克斯', 1, '["幻灵战队","堡垒卫士"]',
       'assets/tft/champions/aatrox.png', 'https://cdn.example.test/aatrox.png', 'current', 'current'),
      (1, 'jinx', 'jinx', '金克丝', 2, '["幻灵战队"]',
       'assets/tft/champions/jinx.png', 'https://cdn.example.test/jinx.png', 'current', 'current')
  `);
  await run(db, `
    INSERT INTO traits (
      source_id, external_id, slug, name_zh, description, levels_json, image_path, image_url, game_version, set_id
    )
    VALUES (1, 'anima', 'anima', '幻灵战队',
      '每击败一名敌人时，【幻灵战队】成员会获得攻击力和法术强度。',
      '[{"threshold":3,"effect":"(3) 10%攻击力和法术强度"},{"threshold":5,"effect":"(5) 20%攻击力和法术强度"}]',
      'assets/tft/traits/anima.png', 'https://cdn.example.test/anima.png', 'current', 'current')
  `);
  await run(db, `
    INSERT INTO items (
      source_id, external_id, slug, name_zh, category, effect_text, rules_json, keywords_json, formula_json, image_path, image_url, game_version, set_id
    )
    VALUES (1, 'broken-prototype', 'broken-prototype', '破损原型', '4',
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
      'assets/tft/items/gwens-shears-2.png', 'https://cdn.example.test/gwens-shears-2.png', 'current', 'current')
  `);
  await run(db, `
    INSERT INTO trait_champions (trait_id, champion_id, game_version, set_id)
    VALUES
      (1, 1, 'current', 'current'),
      (1, 2, 'current', 'current')
  `);
  await close(db);
}

function request(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${pathname}`, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => resolve({ statusCode: res.statusCode, body, contentType: res.headers['content-type'] || '' }));
    });
    req.on('error', reject);
  });
}

async function waitForServer(child) {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    if (child.exitCode !== null) {
      throw new Error(`Static bundle server exited before readiness with code ${child.exitCode}`);
    }

    try {
      await request('/api/guides');
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  throw new Error('Static bundle server did not become ready.');
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
  requireFile(serverPath);
  requireFile(guideShellPath);
  if (hasBundledGuideAssets(bundledGuideAssetsRoot)) {
    throw new Error('Static deploy bundle should not include guide image assets under site/guides.');
  }
  fs.mkdirSync(path.dirname(staleGuideHtmlPath), { recursive: true });
  fs.writeFileSync(staleGuideHtmlPath, '<html><body>stale static guide html</body></html>', 'utf8');
  await seedDatabase();

  const child = spawn(process.execPath, [serverPath], {
    cwd: bundleRoot,
    env: {
      ...process.env,
      PORT: String(port),
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

    const home = await request('/');
    const list = await request('/guides');
    const detail = await request('/guides/runtime-guide');
    const freshDetail = await request('/guides/fresh-guide-not-built');
    const api = await request('/api/guides');
    const apiDetail = await request('/api/guides/runtime-guide');
    const dataChampionApi = await request('/api/data?type=champions');
    const dataTraitApi = await request('/api/data?type=traits');
    const dataItemApi = await request('/api/data?type=items&q=破损');
    const dataAugmentApi = await request('/api/data?type=augments');

    for (const [name, response] of Object.entries({ home, list, detail, freshDetail })) {
      if (response.statusCode !== 200 || !response.contentType.includes('text/html')) {
        throw new Error(`${name} did not return static HTML 200: ${JSON.stringify(response)}`);
      }
    }

    if (detail.body.includes('stale static guide html')) {
      throw new Error('/guides/runtime-guide served stale per-slug HTML instead of the runtime guide shell.');
    }

    if (api.statusCode !== 200 || !api.body.includes('runtime-guide')) {
      throw new Error(`/api/guides did not return runtime SQLite content: ${api.body}`);
    }

    if (apiDetail.statusCode !== 200 || !apiDetail.body.includes('contentMarkdown')) {
      throw new Error(`/api/guides/runtime-guide did not return detail content: ${apiDetail.body}`);
    }

    if (dataChampionApi.statusCode !== 200 || !dataChampionApi.body.includes('亚托克斯')) {
      throw new Error(`/api/data?type=champions did not return runtime SQLite champion references: ${dataChampionApi.body}`);
    }

    if (dataTraitApi.statusCode !== 200 || !dataTraitApi.body.includes('幻灵战队')) {
      throw new Error(`/api/data?type=traits did not return runtime SQLite trait references: ${dataTraitApi.body}`);
    }
    if (
      !dataTraitApi.body.includes('每击败一名敌人') ||
      !dataTraitApi.body.includes('10%攻击力') ||
      !dataTraitApi.body.includes('金克丝')
    ) {
      throw new Error(`/api/data?type=traits did not return enriched trait references: ${dataTraitApi.body}`);
    }

    if (dataItemApi.statusCode !== 200 || !dataItemApi.body.includes('破损原型')) {
      throw new Error(`/api/data?type=items&q=破损 did not return runtime SQLite item references: ${dataItemApi.body}`);
    }
    if (
      !dataItemApi.body.includes('15%最大生命值的护盾') ||
      !dataItemApi.body.includes('唯一 - 每位英雄仅可装备1件。') ||
      dataItemApi.body.includes('隐藏关键词')
    ) {
      throw new Error(`/api/data?type=items&q=破损 did not return cleaned item details without keywords: ${dataItemApi.body}`);
    }
    const dataFormulaApi = await request('/api/data?type=items&q=挑战者');
    if (
      dataFormulaApi.statusCode !== 200 ||
      !dataFormulaApi.body.includes('挑战者纹章') ||
      !dataFormulaApi.body.includes('暴风大剑') ||
      !dataFormulaApi.body.includes('未知材料 missing')
    ) {
      throw new Error(`/api/data?type=items&q=挑战者 did not return formula materials: ${dataFormulaApi.body}`);
    }
    const dataVariantApi = await request('/api/data?type=items&q=投机者');
    if (
      dataVariantApi.statusCode !== 200 ||
      !dataVariantApi.body.includes('"total":2') ||
      dataVariantApi.body.includes('分类 7')
    ) {
      throw new Error(`/api/data?type=items&q=投机者 should preserve same-name variants and readable type 7 labels: ${dataVariantApi.body}`);
    }
    const dataOtherApi = await request('/api/data?type=items&q=格温');
    if (
      dataOtherApi.statusCode !== 200 ||
      !dataOtherApi.body.includes('【格温的剪子】(还可使用2次！)') ||
      dataOtherApi.body.includes('<rules>') ||
      dataOtherApi.body.includes('分类 9')
    ) {
      throw new Error(`/api/data?type=items&q=格温 should return cleaned names and readable type 9 labels: ${dataOtherApi.body}`);
    }

    if (dataAugmentApi.statusCode !== 200 || !dataAugmentApi.body.includes('"available":false')) {
      throw new Error(`/api/data?type=augments did not return unavailable response: ${dataAugmentApi.body}`);
    }

    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      const detailApiRequests = [];
      page.on('request', (req) => {
        if (req.url().includes('/api/guides/')) {
          detailApiRequests.push(req.url());
        }
      });

      await page.goto(`http://127.0.0.1:${port}/guides/runtime-guide`, { waitUntil: 'networkidle' });
      await page.waitForSelector('text=运行时攻略', { timeout: 5000 });

      if (detailApiRequests.some((url) => url.endsWith('/api/guides/__guide_shell__'))) {
        throw new Error('Runtime guide detail shell requested the static placeholder slug.');
      }

      if (!detailApiRequests.some((url) => url.endsWith('/api/guides/runtime-guide'))) {
        throw new Error(`Runtime guide detail shell did not request the pathname slug: ${detailApiRequests.join(', ')}`);
      }

      for (const [route, text] of [
        ['/data?type=champions', '亚托克斯'],
        ['/data?type=traits', '幻灵战队'],
        ['/data?type=items&q=破损', '破损原型'],
      ]) {
        await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle' });
        await page.waitForSelector(`text=${text}`, { timeout: 5000 });
      }

      await page.goto(`http://127.0.0.1:${port}/data?type=items&q=破损`, { waitUntil: 'networkidle' });
      await page.waitForSelector('text=15%最大生命值的护盾', { timeout: 5000 });
      await page.waitForSelector('text=唯一 - 每位英雄仅可装备1件。', { timeout: 5000 });
      const itemPageText = await page.locator('body').innerText();
      for (const marker of ['<br>', '<tftitemrules>', '<rules>', '@TFTUnitProperty', '%i:', '隐藏关键词']) {
        if (itemPageText.includes(marker)) {
          throw new Error(`/data static shell should not expose raw item marker or hidden keyword ${marker}: ${itemPageText}`);
        }
      }
      if (itemPageText.includes('合成公式')) {
        throw new Error(`/data static shell should not show an empty formula area: ${itemPageText}`);
      }

      await page.goto(`http://127.0.0.1:${port}/data?type=items&q=挑战者`, { waitUntil: 'networkidle' });
      await page.waitForSelector('text=挑战者纹章', { timeout: 5000 });
      await page.waitForSelector('text=合成公式', { timeout: 5000 });
      await page.waitForSelector('text=暴风大剑', { timeout: 5000 });
      await page.waitForSelector('text=未知材料 missing', { timeout: 5000 });

      await page.goto(`http://127.0.0.1:${port}/data?type=items&q=投机者`, { waitUntil: 'networkidle' });
      await page.waitForSelector('text=装备 · “投机者” · 2 条结果', { timeout: 5000 });
      if ((await page.getByText('投机者之刃', { exact: true }).count()) !== 2) {
        throw new Error('/data static shell should render both same-name item variants.');
      }
      const variantPageText = await page.locator('body').innerText();
      if (variantPageText.includes('分类 7')) {
        throw new Error(`/data static shell should not expose category code labels for type 7: ${variantPageText}`);
      }

      await page.goto(`http://127.0.0.1:${port}/data?type=items&q=格温`, { waitUntil: 'networkidle' });
      await page.waitForSelector('text=【格温的剪子】(还可使用2次！)', { timeout: 5000 });
      const otherPageText = await page.locator('body').innerText();
      if (otherPageText.includes('<rules>') || otherPageText.includes('分类 9')) {
        throw new Error(`/data static shell should show cleaned names and readable type 9 labels: ${otherPageText}`);
      }

      await page.goto(`http://127.0.0.1:${port}/data?type=traits`, { waitUntil: 'networkidle' });
      await page.waitForSelector('text=每击败一名敌人时', { timeout: 5000 });
      await page.waitForSelector('text=(3) 10%攻击力和法术强度', { timeout: 5000 });
      await page.waitForSelector('text=金克丝', { timeout: 5000 });

      await page.goto(`http://127.0.0.1:${port}/data?type=augments`, { waitUntil: 'networkidle' });
      if (!(await page.getByRole('button', { name: '强化符文' }).isDisabled())) {
        throw new Error('/data?type=augments should keep the augment tab disabled.');
      }
      const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      if (hasHorizontalOverflow) {
        throw new Error('/data static shell has horizontal overflow on default browser viewport.');
      }
    } finally {
      await browser.close();
    }

    console.log('Static shell contract check passed.');
  } finally {
    await stopChild(child);
    fs.rmSync(staleGuideHtmlPath, { force: true });
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
