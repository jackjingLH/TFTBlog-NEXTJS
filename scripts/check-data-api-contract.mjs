import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sqlite3 from 'sqlite3';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tftblog-data-api-contract-'));
const databasePath = path.join(tempRoot, 'content.sqlite');
const port = 41200 + Math.floor(Math.random() * 1000);

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
      stats_json TEXT NOT NULL DEFAULT '{}',
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
      source_id, external_id, slug, name_zh, cost, traits_json, stats_json,
      image_path, image_url, game_version, set_id
    )
    VALUES
      (1, 'aatrox', 'aatrox', '亚托克斯', 1, '["幻灵战队","法官"]',
       '{"role":"物理战士","attackGrowth":"35/53/79","healthGrowth":"650/1170/2106","armor":"40","magicResist":"40","attackSpeed":"0.6","range":"1","mana":"30/100"}',
       'assets/tft/champions/aatrox.png', 'https://cdn.example.test/aatrox.png', 'current', 'current'),
      (1, 'jinx', 'jinx', '金克丝', 2, '["幻灵战队"]', '{}',
       'assets/tft/champions/jinx.png', 'https://cdn.example.test/jinx.png', 'current', 'current'),
      (1, 'forge', 'forge', '成装锻造器', 8, '[]', '{}',
       'assets/tft/champions/forge.png', 'https://cdn.example.test/forge.png', 'current', 'current');

    INSERT INTO traits (
      source_id, external_id, slug, name_zh, description, levels_json, image_path, image_url, game_version, set_id
    )
    VALUES
      (1, 'anima', 'anima', '幻灵战队',
       '每击败一名敌人时，【幻灵战队】成员会获得攻击力和法术强度。',
       '[{"threshold":3,"effect":"(3) 10%攻击力和法术强度"},{"threshold":5,"effect":"(5) 20%攻击力和法术强度"}]',
       'assets/tft/traits/anima.png', 'https://cdn.example.test/anima.png', 'current', 'current'),
      (1, 'judge', 'judge', '法官',
       '制订一份独特的神圣律法。',
       '[{"threshold":2,"effect":"(2) 为你的律法选择1个成因和效果"}]',
       'assets/tft/traits/judge.png', 'https://cdn.example.test/judge.png', 'current', 'current');

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
      throw new Error(`Static server exited before readiness with code ${child.exitCode}`);
    }

    try {
      await request('/api/data');
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  throw new Error('Static server did not become ready.');
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

function parseJson(response) {
  try {
    return JSON.parse(response.body);
  } catch {
    throw new Error(`Expected JSON response, got ${response.statusCode} ${response.contentType}: ${response.body}`);
  }
}

async function main() {
  await seedDatabase();
  const child = spawn(process.execPath, ['scripts/static-mvp-server.mjs'], {
    cwd: process.cwd(),
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
    const response = await request('/api/data');
    const body = parseJson(response);

    if (response.statusCode !== 200 || body.type !== 'champions' || body.available !== true || body.total !== 3) {
      throw new Error(`Invalid default champion response: ${JSON.stringify({ statusCode: response.statusCode, body })}`);
    }

    const names = body.items.map((item) => item.name);
    if (names.join(',') !== '亚托克斯,金克丝,成装锻造器') {
      throw new Error(`Default champion order should keep regular champions before special objects: ${names.join(',')}`);
    }

    const special = body.items.find((item) => item.name === '成装锻造器');
    if (!special || !special.traits.includes('特殊对象')) {
      throw new Error(`Special object should be labeled 特殊对象: ${JSON.stringify(special)}`);
    }

    const aatrox = body.items.find((item) => item.name === '亚托克斯');
    if (
      aatrox?.stats?.role !== '物理战士' ||
      aatrox.stats.attackGrowth !== '35/53/79' ||
      aatrox.stats.healthGrowth !== '650/1170/2106' ||
      aatrox.stats.armor !== '40' ||
      aatrox.stats.magicResist !== '40' ||
      aatrox.stats.attackSpeed !== '0.6' ||
      aatrox.stats.range !== '1' ||
      aatrox.stats.mana !== '30/100'
    ) {
      throw new Error(`Champion response should include curated stats: ${JSON.stringify(aatrox)}`);
    }
    const aatroxTraitNames = (aatrox?.traitDetails || []).map((trait) => trait.name).join(',');
    if (
      aatroxTraitNames !== '幻灵战队,法官' ||
      aatrox.traitDetails[0]?.imageUrl !== 'https://cdn.example.test/anima.png' ||
      aatrox.traitDetails[1]?.imageUrl !== 'https://cdn.example.test/judge.png'
    ) {
      throw new Error(`Champion response should include full trait details with icons: ${JSON.stringify(aatrox)}`);
    }

    const traitResponse = await request('/api/data?type=traits&q=幻灵');
    const traitBody = parseJson(traitResponse);
    if (traitResponse.statusCode !== 200 || traitBody.type !== 'traits' || traitBody.total !== 1 || traitBody.items[0]?.name !== '幻灵战队') {
      throw new Error(`Invalid trait response: ${JSON.stringify({ statusCode: traitResponse.statusCode, body: traitBody })}`);
    }
    if (
      !traitBody.items[0]?.description?.includes('每击败一名敌人') ||
      traitBody.items[0]?.levels?.[0]?.threshold !== 3 ||
      !traitBody.items[0]?.levels?.[0]?.effect.includes('10%攻击力')
    ) {
      throw new Error(`Trait response should include official description and levels: ${JSON.stringify(traitBody.items[0])}`);
    }
    const associatedNames = (traitBody.items[0]?.champions || []).map((champion) => `${champion.name}:${champion.cost}`).join(',');
    if (associatedNames !== '亚托克斯:1,金克丝:2' || !traitBody.items[0]?.champions?.[0]?.imageUrl) {
      throw new Error(`Trait response should include associated champions: ${JSON.stringify(traitBody.items[0])}`);
    }

    const itemResponse = await request('/api/data?type=items&q=破损');
    const itemBody = parseJson(itemResponse);
    if (
      itemResponse.statusCode !== 200 ||
      itemBody.type !== 'items' ||
      itemBody.total !== 1 ||
      itemBody.items[0]?.name !== '破损原型' ||
      itemBody.items[0]?.categoryLabel !== '强化'
    ) {
      throw new Error(`Invalid item response: ${JSON.stringify({ statusCode: itemResponse.statusCode, body: itemBody })}`);
    }
    if (
      !itemBody.items[0]?.effectText?.includes('15%最大生命值的护盾') ||
      itemBody.items[0]?.rules?.[0] !== '唯一 - 每位英雄仅可装备1件。'
    ) {
      throw new Error(`Item response should include cleaned effect text and rule tags: ${JSON.stringify(itemBody.items[0])}`);
    }
    if (JSON.stringify(itemBody.items[0]).includes('keywords')) {
      throw new Error(`Item response should not expose retained keywords in v1: ${JSON.stringify(itemBody.items[0])}`);
    }
    if (Array.isArray(itemBody.items[0]?.formula) && itemBody.items[0].formula.length !== 0) {
      throw new Error(`Items without formulas should not carry formula materials: ${JSON.stringify(itemBody.items[0])}`);
    }

    const keywordOnlyResponse = await request('/api/data?type=items&q=隐藏关键词');
    const keywordOnlyBody = parseJson(keywordOnlyResponse);
    if (keywordOnlyResponse.statusCode !== 200 || keywordOnlyBody.type !== 'items' || keywordOnlyBody.total !== 0) {
      throw new Error(`Item search should not match retained keywords: ${JSON.stringify(keywordOnlyBody)}`);
    }

    const formulaResponse = await request('/api/data?type=items&q=挑战者');
    const formulaBody = parseJson(formulaResponse);
    if (
      formulaResponse.statusCode !== 200 ||
      formulaBody.type !== 'items' ||
      formulaBody.total !== 1 ||
      formulaBody.items[0]?.formula?.[0]?.name !== '暴风大剑' ||
      formulaBody.items[0]?.formula?.[0]?.imageUrl !== 'https://cdn.example.test/bf-sword.png' ||
      formulaBody.items[0]?.formula?.[1]?.name !== '未知材料 missing'
    ) {
      throw new Error(`Item response should include resolved and unresolved formula materials: ${JSON.stringify(formulaBody)}`);
    }

    const variantResponse = await request('/api/data?type=items&q=投机者');
    const variantBody = parseJson(variantResponse);
    if (
      variantResponse.statusCode !== 200 ||
      variantBody.type !== 'items' ||
      variantBody.total !== 2 ||
      variantBody.items.some((item) => item.name !== '投机者之刃') ||
      variantBody.items.some((item) => item.categoryLabel === '分类 7')
    ) {
      throw new Error(`Item API should preserve same-name variants and use readable type 7 labels: ${JSON.stringify(variantBody)}`);
    }

    const otherResponse = await request('/api/data?type=items&q=格温');
    const otherBody = parseJson(otherResponse);
    if (
      otherResponse.statusCode !== 200 ||
      otherBody.total !== 1 ||
      otherBody.items[0]?.name !== '【格温的剪子】(还可使用2次！)' ||
      otherBody.items[0]?.name.includes('<rules>') ||
      otherBody.items[0]?.categoryLabel === '分类 9'
    ) {
      throw new Error(`Item API should expose cleaned names and readable type 9 labels: ${JSON.stringify(otherBody)}`);
    }

    const augmentResponse = await request('/api/data?type=augments');
    const augmentBody = parseJson(augmentResponse);
    if (
      augmentResponse.statusCode !== 200 ||
      augmentBody.type !== 'augments' ||
      augmentBody.available !== true ||
      augmentBody.total !== 3 ||
      augmentBody.items[0]?.name !== '有用之材 I' ||
      augmentBody.items[2]?.tierLabel !== '彩'
    ) {
      throw new Error(`Invalid augment response: ${JSON.stringify({ statusCode: augmentResponse.statusCode, body: augmentBody })}`);
    }
    const goingLong = augmentBody.items.find((item) => item.name === '遥遥领先');
    if (
      goingLong?.tier !== '3' ||
      goingLong?.effectText?.includes('利息是你每储存10金币') ||
      goingLong?.rules?.[0] !== '利息是你每储存10金币时获得的额外金币。' ||
      goingLong?.gameVersion !== '16.13' ||
      goingLong?.setId !== '2026.S17'
    ) {
      throw new Error(`Augment response should expose display fields and split rules: ${JSON.stringify(goingLong)}`);
    }

    const augmentSearchResponse = await request('/api/data?type=augments&q=利息');
    const augmentSearchBody = parseJson(augmentSearchResponse);
    if (
      augmentSearchResponse.statusCode !== 200 ||
      augmentSearchBody.type !== 'augments' ||
      augmentSearchBody.total !== 1 ||
      augmentSearchBody.items[0]?.name !== '遥遥领先'
    ) {
      throw new Error(`Augment search should match effect/rule text: ${JSON.stringify(augmentSearchBody)}`);
    }

    const augmentInternalKeyResponse = await request('/api/data?type=augments&q=TFT10_Augment_GoingLong');
    const augmentInternalKeyBody = parseJson(augmentInternalKeyResponse);
    if (augmentInternalKeyResponse.statusCode !== 200 || augmentInternalKeyBody.total !== 0) {
      throw new Error(`Augment search should not match internal English keys: ${JSON.stringify(augmentInternalKeyBody)}`);
    }

    const augmentTierResponse = await request('/api/data?type=augments&tier=3');
    const augmentTierBody = parseJson(augmentTierResponse);
    if (
      augmentTierResponse.statusCode !== 200 ||
      augmentTierBody.total !== 1 ||
      augmentTierBody.items[0]?.name !== '遥遥领先'
    ) {
      throw new Error(`Augment tier filter should return matching tier only: ${JSON.stringify(augmentTierBody)}`);
    }

    const writableDb = new sqlite3.Database(databasePath);
    try {
      await exec(writableDb, `DROP TABLE augments`);
    } finally {
      await close(writableDb);
    }
    const missingAugmentResponse = await request('/api/data?type=augments');
    const missingAugmentBody = parseJson(missingAugmentResponse);
    if (
      missingAugmentResponse.statusCode !== 200 ||
      missingAugmentBody.type !== 'augments' ||
      missingAugmentBody.available !== false ||
      missingAugmentBody.total !== 0 ||
      missingAugmentBody.items.length !== 0
    ) {
      throw new Error(`Missing augment table should degrade to unavailable response: ${JSON.stringify(missingAugmentBody)}`);
    }

    console.log('Data API contract check passed.');
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
