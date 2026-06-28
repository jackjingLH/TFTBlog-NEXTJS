import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sqlite3 from 'sqlite3';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tftblog-next-data-api-contract-'));
const databasePath = path.join(tempRoot, 'content.sqlite');
const port = 42300 + Math.floor(Math.random() * 1000);

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
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
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
      image_path TEXT NOT NULL,
      image_url TEXT NOT NULL,
      game_version TEXT NOT NULL,
      set_id TEXT NOT NULL,
      UNIQUE(external_id, game_version, set_id)
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
      set_id TEXT NOT NULL,
      UNIQUE(external_id, game_version, set_id)
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
      set_id TEXT NOT NULL,
      UNIQUE(external_id, game_version, set_id)
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
      set_id TEXT NOT NULL,
      UNIQUE(external_id, game_version, set_id)
    );

    CREATE TABLE trait_champions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trait_id INTEGER NOT NULL REFERENCES traits(id),
      champion_id INTEGER NOT NULL REFERENCES champions(id),
      game_version TEXT NOT NULL,
      set_id TEXT NOT NULL,
      UNIQUE(trait_id, champion_id, game_version, set_id)
    );

    INSERT INTO sources (id, source_url, game_version, set_id, synced_at, status)
    VALUES (1, 'https://example.test/tft', 'current', 'current', '2026-06-25T00:00:00.000Z', 'partial');

    INSERT INTO champions (
      source_id, external_id, slug, name_zh, cost, traits_json,
      image_path, image_url, game_version, set_id
    )
    VALUES
      (1, 'aatrox', 'aatrox', '亚托克斯', 1, '["幻灵战队","堡垒卫士"]',
       'assets/tft/champions/aatrox.png', 'https://cdn.example.test/aatrox.png', 'current', 'current'),
      (1, 'jinx', 'jinx', '金克丝', 2, '["幻灵战队"]',
       'assets/tft/champions/jinx.png', 'https://cdn.example.test/jinx.png', 'current', 'current'),
      (1, 'forge', 'forge', '成装锻造器', 8, '[]',
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

function requestJson(pathname) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${pathname}`, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch (error) {
          reject(new Error(`Expected JSON response, got ${res.statusCode}: ${body}`));
        }
      });
    });
    req.setTimeout(5000, () => {
      req.destroy(new Error(`Request timed out: ${pathname}`));
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
      await requestJson('/api/data');
      return;
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

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForServer(child);
    const response = await requestJson('/api/data?type=champions&q=堡垒');

    if (response.statusCode !== 200 || response.body.type !== 'champions' || response.body.available !== true || response.body.total !== 1) {
      throw new Error(`Invalid Next data API response: ${JSON.stringify(response)}`);
    }

    if (response.body.items[0]?.name !== '亚托克斯' || !response.body.items[0]?.traits.includes('堡垒卫士')) {
      throw new Error(`Expected filtered champion result: ${JSON.stringify(response.body.items)}`);
    }

    const traitResponse = await requestJson('/api/data?type=traits&q=幻灵');
    if (
      traitResponse.statusCode !== 200 ||
      traitResponse.body.type !== 'traits' ||
      traitResponse.body.total !== 1 ||
      traitResponse.body.items[0]?.name !== '幻灵战队'
    ) {
      throw new Error(`Invalid Next trait API response: ${JSON.stringify(traitResponse)}`);
    }
    if (
      !traitResponse.body.items[0]?.description?.includes('每击败一名敌人') ||
      traitResponse.body.items[0]?.levels?.[0]?.threshold !== 3 ||
      !traitResponse.body.items[0]?.levels?.[0]?.effect.includes('10%攻击力')
    ) {
      throw new Error(`Next trait API should include official description and levels: ${JSON.stringify(traitResponse.body.items[0])}`);
    }
    const associatedNames = (traitResponse.body.items[0]?.champions || []).map((champion) => `${champion.name}:${champion.cost}`).join(',');
    if (associatedNames !== '亚托克斯:1,金克丝:2' || !traitResponse.body.items[0]?.champions?.[0]?.imageUrl) {
      throw new Error(`Next trait API should include associated champions: ${JSON.stringify(traitResponse.body.items[0])}`);
    }

    const itemResponse = await requestJson('/api/data?type=items&q=破损');
    if (
      itemResponse.statusCode !== 200 ||
      itemResponse.body.type !== 'items' ||
      itemResponse.body.total !== 1 ||
      itemResponse.body.items[0]?.name !== '破损原型' ||
      itemResponse.body.items[0]?.categoryLabel !== '强化'
    ) {
      throw new Error(`Invalid Next item API response: ${JSON.stringify(itemResponse)}`);
    }
    if (
      !itemResponse.body.items[0]?.effectText?.includes('15%最大生命值的护盾') ||
      itemResponse.body.items[0]?.rules?.[0] !== '唯一 - 每位英雄仅可装备1件。'
    ) {
      throw new Error(`Next item API should include cleaned effect text and rule tags: ${JSON.stringify(itemResponse.body.items[0])}`);
    }
    if (JSON.stringify(itemResponse.body.items[0]).includes('keywords')) {
      throw new Error(`Next item API should not expose retained keywords in v1: ${JSON.stringify(itemResponse.body.items[0])}`);
    }
    if (Array.isArray(itemResponse.body.items[0]?.formula) && itemResponse.body.items[0].formula.length !== 0) {
      throw new Error(`Next items without formulas should not carry formula materials: ${JSON.stringify(itemResponse.body.items[0])}`);
    }

    const keywordOnlyResponse = await requestJson('/api/data?type=items&q=隐藏关键词');
    if (
      keywordOnlyResponse.statusCode !== 200 ||
      keywordOnlyResponse.body.type !== 'items' ||
      keywordOnlyResponse.body.total !== 0
    ) {
      throw new Error(`Next item search should not match retained keywords: ${JSON.stringify(keywordOnlyResponse.body)}`);
    }

    const formulaResponse = await requestJson('/api/data?type=items&q=挑战者');
    if (
      formulaResponse.statusCode !== 200 ||
      formulaResponse.body.type !== 'items' ||
      formulaResponse.body.total !== 1 ||
      formulaResponse.body.items[0]?.formula?.[0]?.name !== '暴风大剑' ||
      formulaResponse.body.items[0]?.formula?.[0]?.imageUrl !== 'https://cdn.example.test/bf-sword.png' ||
      formulaResponse.body.items[0]?.formula?.[1]?.name !== '未知材料 missing'
    ) {
      throw new Error(`Next item API should include resolved and unresolved formula materials: ${JSON.stringify(formulaResponse.body)}`);
    }

    const variantResponse = await requestJson('/api/data?type=items&q=投机者');
    if (
      variantResponse.statusCode !== 200 ||
      variantResponse.body.type !== 'items' ||
      variantResponse.body.total !== 2 ||
      variantResponse.body.items.some((item) => item.name !== '投机者之刃') ||
      variantResponse.body.items.some((item) => item.categoryLabel === '分类 7')
    ) {
      throw new Error(`Next item API should preserve same-name variants and use readable type 7 labels: ${JSON.stringify(variantResponse.body)}`);
    }

    const otherResponse = await requestJson('/api/data?type=items&q=格温');
    if (
      otherResponse.statusCode !== 200 ||
      otherResponse.body.total !== 1 ||
      otherResponse.body.items[0]?.name !== '【格温的剪子】(还可使用2次！)' ||
      otherResponse.body.items[0]?.name.includes('<rules>') ||
      otherResponse.body.items[0]?.categoryLabel === '分类 9'
    ) {
      throw new Error(`Next item API should expose cleaned names and readable type 9 labels: ${JSON.stringify(otherResponse.body)}`);
    }

    const augmentResponse = await requestJson('/api/data?type=augments');
    if (
      augmentResponse.statusCode !== 200 ||
      augmentResponse.body.type !== 'augments' ||
      augmentResponse.body.available !== true ||
      augmentResponse.body.total !== 3 ||
      augmentResponse.body.items[0]?.name !== '有用之材 I' ||
      augmentResponse.body.items[2]?.tierLabel !== '彩'
    ) {
      throw new Error(`Invalid Next augment API response: ${JSON.stringify(augmentResponse)}`);
    }
    const goingLong = augmentResponse.body.items.find((item) => item.name === '遥遥领先');
    if (
      goingLong?.tier !== '3' ||
      goingLong?.effectText?.includes('利息是你每储存10金币') ||
      goingLong?.rules?.[0] !== '利息是你每储存10金币时获得的额外金币。' ||
      goingLong?.gameVersion !== '16.13' ||
      goingLong?.setId !== '2026.S17'
    ) {
      throw new Error(`Next augment API should expose display fields and split rules: ${JSON.stringify(goingLong)}`);
    }

    const augmentSearchResponse = await requestJson('/api/data?type=augments&q=利息');
    if (
      augmentSearchResponse.statusCode !== 200 ||
      augmentSearchResponse.body.type !== 'augments' ||
      augmentSearchResponse.body.total !== 1 ||
      augmentSearchResponse.body.items[0]?.name !== '遥遥领先'
    ) {
      throw new Error(`Next augment search should match effect/rule text: ${JSON.stringify(augmentSearchResponse.body)}`);
    }

    const augmentTierResponse = await requestJson('/api/data?type=augments&tier=3');
    if (
      augmentTierResponse.statusCode !== 200 ||
      augmentTierResponse.body.total !== 1 ||
      augmentTierResponse.body.items[0]?.name !== '遥遥领先'
    ) {
      throw new Error(`Next augment tier filter should return matching tier only: ${JSON.stringify(augmentTierResponse.body)}`);
    }

    console.log('Next data API contract check passed.');
  } finally {
    await stopChild(child);
    fs.rmSync(tempRoot, { recursive: true, force: true });
    if (stdout.trim()) {
      console.error(stdout.trim());
    }
    if (stderr.trim()) {
      console.error(stderr.trim());
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
