import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sqlite3 from 'sqlite3';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tftblog-assets-import-contract-'));
const sourcePath = path.join(tempRoot, 'source-assets.sqlite');
const targetPath = path.join(tempRoot, 'target.sqlite');

function exec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => (error ? reject(error) : resolve()));
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row)));
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()));
  });
}

function runImport() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/import-tft-assets-db.mjs', sourcePath, targetPath], {
      cwd: process.cwd(),
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
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Import exited with ${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
      }
    });
  });
}

async function seedSourceDatabase() {
  const db = new sqlite3.Database(sourcePath);
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
      image_path TEXT NOT NULL,
      image_url TEXT NOT NULL,
      game_version TEXT NOT NULL,
      set_id TEXT NOT NULL,
      UNIQUE(external_id, game_version, set_id)
    );

    CREATE TABLE raw_payloads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL REFERENCES sources(id),
      payload_type TEXT NOT NULL,
      url TEXT NOT NULL,
      body_json TEXT NOT NULL,
      captured_at TEXT NOT NULL
    );

    INSERT INTO sources (id, source_url, game_version, set_id, synced_at, status)
    VALUES (1, 'https://game.gtimg.cn/images/lol/act/img/tft/js/race.js', 'current', 'current', '2026-06-26T00:00:00.000Z', 'complete');

    INSERT INTO champions (
      id, source_id, external_id, slug, name_zh, name_en, cost, traits_json,
      image_path, image_url, game_version, set_id
    )
    VALUES
      (1, 1, 'judge-a', 'judge-a', '裁决者A', '', 1, '["法官"]',
       'assets/tft/champions/judge-a.png', 'https://cdn.example.test/judge-a.png', 'current', 'current'),
      (2, 1, 'judge-b', 'judge-b', '裁决者B', '', 3, '["法官","堡垒卫士"]',
       'assets/tft/champions/judge-b.png', 'https://cdn.example.test/judge-b.png', 'current', 'current'),
      (3, 1, 'outsider', 'outsider', '局外弈子', '', 2, '["堡垒卫士"]',
       'assets/tft/champions/outsider.png', 'https://cdn.example.test/outsider.png', 'current', 'current');

    INSERT INTO traits (
      id, source_id, external_id, slug, name_zh, name_en, image_path, image_url, game_version, set_id
    )
    VALUES
      (1, 1, '10296', 'judge', '法官', '',
       'assets/tft/traits/judge.png', 'https://cdn.example.test/judge.png', 'current', 'current'),
      (2, 1, '10308', 'graves-trait', '军工1号', '',
       'assets/tft/traits/graves-trait.png', 'https://cdn.example.test/graves-trait.png', 'current', 'current'),
      (3, 1, '10319', 'bastion', '堡垒卫士', '',
       'assets/tft/traits/bastion.png', 'https://cdn.example.test/bastion.png', 'current', 'current');

    INSERT INTO items (
      id, source_id, external_id, slug, name_zh, name_en, category, image_path, image_url, game_version, set_id
    )
    VALUES
      (1, 1, '92506', 'bf-sword', '暴风大剑', '', '1',
       'assets/tft/items/bf-sword.png', 'https://cdn.example.test/bf-sword.png', 'current', 'current'),
      (2, 1, '91913', 'support-gloves', '辅助手套', '', '9',
       'assets/tft/items/support-gloves.png', 'https://cdn.example.test/support-gloves.png', 'current', 'current'),
      (3, 1, '92512', 'chain-vest', '锁子甲', '', '1',
       'assets/tft/items/chain-vest.png', 'https://cdn.example.test/chain-vest.png', 'current', 'current'),
      (4, 1, '92120', 'challenger-emblem', '挑战者纹章', '', '2',
       'assets/tft/items/challenger-emblem.png', 'https://cdn.example.test/challenger-emblem.png', 'current', 'current'),
      (5, 1, '92121', 'missing-emblem', '缺失材料纹章', '', '2',
       'assets/tft/items/missing-emblem.png', 'https://cdn.example.test/missing-emblem.png', 'current', 'current'),
      (6, 1, '92350', 'investor-blade-a', '投机者之刃', '', '7',
       'assets/tft/items/investor-blade-a.png', 'https://cdn.example.test/investor-blade-a.png', 'current', 'current'),
      (7, 1, '92351', 'investor-blade-b', '投机者之刃', '', '7',
       'assets/tft/items/investor-blade-b.png', 'https://cdn.example.test/investor-blade-b.png', 'current', 'current'),
      (8, 1, '91920', 'gwens-shears-2', '【格温的剪子】<rules>(还可使用2次！)</rules>', '', '9',
       'assets/tft/items/gwens-shears-2.png', 'https://cdn.example.test/gwens-shears-2.png', 'current', 'current');
  `);

  const racePayload = {
    version: 'test',
    season: 'current',
    data: [
      {
        raceId: '10296',
        name: '法官',
        traitId: '10296',
        introduce: '制订一份独特的神圣律法，可使你选择一个成因。',
        level: {
          2: '<row>(2) 为你的律法选择1个成因和效果</row>',
          3: '<row>(3) 效果变得更强。</row>',
        },
      },
      {
        raceId: '10308',
        name: '军工1号',
        traitId: '10308',
        introduce:
          '参与对战后，打开一个武器库为你最强大的【格雷福斯】购买*永久*【升级】。下一个【升级】@TFTUnitProperty.trait:TFT17_GravesTrait_RoundsUntilUpgrade@回合。',
        level: {
          1: '参与对战后，打开一个武器库为你最强大的【格雷福斯】购买*永久*【升级】。下一个【升级】@TFTUnitProperty.trait:TFT17_GravesTrait_RoundsUntilUpgrade@回合。',
        },
      },
      {
        raceId: '10319',
        name: '堡垒卫士',
        traitId: '10319',
        introduce: '你的队伍获得15护甲和魔抗。',
        level: {
          2: '(2) 16 %i:scaleArmor%%i:scaleMR%',
        },
      },
    ],
  };

  await new Promise((resolve, reject) => {
    db.run(
      `
        INSERT INTO raw_payloads (source_id, payload_type, url, body_json, captured_at)
        VALUES (1, 'trait', 'https://game.gtimg.cn/images/lol/act/img/tft/js/race.js', ?, '2026-06-26T00:00:00.000Z')
      `,
      [JSON.stringify(racePayload)],
      (error) => (error ? reject(error) : resolve()),
    );
  });

  const itemPayload = {
    version: 'test',
    data: [
      {
        equipId: '91913',
        type: '9',
        name: '辅助手套',
        effect:
          '+20%暴击几率;+150生命值;每一回合：装备2件随机辅助装。<br><br><tftitemrules>[需要用掉3个装备格。]</tftitemrules><br>',
        keywords: '辅助手套,辅助装',
        formula: '',
        imagePath: 'https://cdn.example.test/support-gloves.png',
        TFTID: '91913',
        englishName: 'TFT_Item_SupportGloves',
        id: 'raw-support-gloves',
      },
      {
        equipId: '92120',
        type: '2',
        name: '挑战者纹章',
        effect: '+30%攻击速度;携带者获得【挑战者】羁绊。',
        keywords: '挑战者纹章',
        formula: '92506,92512',
        imagePath: 'https://cdn.example.test/challenger-emblem.png',
        TFTID: '92120',
        englishName: 'TFT_Item_ChallengerEmblem',
        id: 'raw-challenger-emblem',
      },
      {
        equipId: '92121',
        type: '2',
        name: '缺失材料纹章',
        effect: '+10%攻击力;携带者获得一个测试羁绊。',
        keywords: '缺失材料纹章',
        formula: '92506,99999',
        imagePath: 'https://cdn.example.test/missing-emblem.png',
        TFTID: '92121',
        englishName: 'TFT_Item_MissingEmblem',
        id: 'raw-missing-emblem',
      },
      {
        equipId: '92350',
        type: '7',
        name: '投机者之刃',
        effect: '+55%攻击速度;',
        keywords: '投机者之刃',
        formula: '',
        imagePath: 'https://cdn.example.test/investor-blade-a.png',
        TFTID: '92350',
        id: 'raw-investor-blade-a',
      },
      {
        equipId: '92351',
        type: '7',
        name: '投机者之刃',
        effect: '+15%攻击速度;',
        keywords: '投机者之刃',
        formula: '',
        imagePath: 'https://cdn.example.test/investor-blade-b.png',
        TFTID: '92351',
        id: 'raw-investor-blade-b',
      },
      {
        equipId: '91920',
        type: '9',
        name: '【格温的剪子】<rules>(还可使用2次！)</rules>',
        effect: '对一个弈子使用，即可移除其所有装备。',
        keywords: '格温的剪子',
        formula: '',
        imagePath: 'https://cdn.example.test/gwens-shears-2.png',
        TFTID: '91920',
        id: 'raw-gwens-shears-2',
      },
    ],
  };

  await new Promise((resolve, reject) => {
    db.run(
      `
        INSERT INTO raw_payloads (source_id, payload_type, url, body_json, captured_at)
        VALUES (1, 'item', 'https://game.gtimg.cn/images/lol/act/img/tft/js/equip.js', ?, '2026-06-26T00:00:00.000Z')
      `,
      [JSON.stringify(itemPayload)],
      (error) => (error ? reject(error) : resolve()),
    );
  });

  await close(db);
}

async function main() {
  try {
    await seedSourceDatabase();
    const importResult = await runImport();

    const db = new sqlite3.Database(targetPath, sqlite3.OPEN_READONLY);
    try {
      const columns = await all(db, `PRAGMA table_info(traits)`);
      const columnNames = new Set(columns.map((column) => column.name));
      if (!columnNames.has('description') || !columnNames.has('levels_json')) {
        throw new Error(`traits table should persist description and levels_json columns: ${[...columnNames].join(',')}`);
      }

      const judge = await get(db, `SELECT description, levels_json FROM traits WHERE name_zh = ?`, ['法官']);
      if (!judge?.description?.includes('神圣律法')) {
        throw new Error(`Expected imported trait description, got: ${JSON.stringify(judge)}`);
      }

      const levels = JSON.parse(judge.levels_json);
      if (!Array.isArray(levels) || levels[0]?.threshold !== 2 || !levels[0]?.effect.includes('为你的律法选择1个成因和效果')) {
        throw new Error(`Expected imported trait levels, got: ${judge.levels_json}`);
      }

      const graves = await get(db, `SELECT description, levels_json FROM traits WHERE name_zh = ?`, ['军工1号']);
      if (graves?.description?.includes('@TFTUnitProperty') || graves?.levels_json?.includes('@TFTUnitProperty')) {
        throw new Error(`Imported trait text should not expose dynamic property placeholders: ${JSON.stringify(graves)}`);
      }
      if (JSON.parse(graves.levels_json).length !== 0) {
        throw new Error(`Single-level duplicate trait text should not be repeated as a level: ${graves.levels_json}`);
      }

      const bastion = await get(db, `SELECT levels_json FROM traits WHERE name_zh = ?`, ['堡垒卫士']);
      if (bastion?.levels_json?.includes('%i:') || !bastion?.levels_json?.includes('护甲') || !bastion?.levels_json?.includes('魔抗')) {
        throw new Error(`Imported trait levels should render stat icon placeholders as readable labels: ${JSON.stringify(bastion)}`);
      }

      const itemColumns = await all(db, `PRAGMA table_info(items)`);
      const itemColumnNames = new Set(itemColumns.map((column) => column.name));
      for (const columnName of ['effect_text', 'rules_json', 'keywords_json', 'formula_json']) {
        if (!itemColumnNames.has(columnName)) {
          throw new Error(`items table should persist ${columnName}: ${[...itemColumnNames].join(',')}`);
        }
      }

      const supportGloves = await get(db, `SELECT effect_text, rules_json, keywords_json FROM items WHERE name_zh = ?`, ['辅助手套']);
      if (!supportGloves?.effect_text?.includes('每一回合：装备2件随机辅助装')) {
        throw new Error(`Expected imported item effect text, got: ${JSON.stringify(supportGloves)}`);
      }
      if (supportGloves.effect_text.includes('<') || supportGloves.effect_text.includes('tftitemrules') || supportGloves.effect_text.includes('需要用掉3个装备格')) {
        throw new Error(`Imported item effect should not expose official markup or rule text: ${JSON.stringify(supportGloves)}`);
      }

      const itemRules = JSON.parse(supportGloves.rules_json);
      if (!Array.isArray(itemRules) || itemRules[0] !== '需要用掉3个装备格。') {
        throw new Error(`Expected imported item rules, got: ${supportGloves.rules_json}`);
      }

      const itemKeywords = JSON.parse(supportGloves.keywords_json);
      if (!Array.isArray(itemKeywords) || !itemKeywords.includes('辅助手套') || !itemKeywords.includes('辅助装')) {
        throw new Error(`Expected retained item keywords, got: ${supportGloves.keywords_json}`);
      }

      const challengerEmblem = await get(db, `SELECT formula_json FROM items WHERE name_zh = ?`, ['挑战者纹章']);
      const formula = JSON.parse(challengerEmblem.formula_json);
      if (
        !Array.isArray(formula) ||
        formula.length !== 2 ||
        formula[0]?.id !== '92506' ||
        formula[0]?.name !== '暴风大剑' ||
        formula[0]?.imageUrl !== 'https://cdn.example.test/bf-sword.png' ||
        formula[1]?.id !== '92512' ||
        formula[1]?.name !== '锁子甲'
      ) {
        throw new Error(`Expected resolved item formula materials, got: ${challengerEmblem.formula_json}`);
      }

      const missingEmblem = await get(db, `SELECT formula_json FROM items WHERE name_zh = ?`, ['缺失材料纹章']);
      const missingFormula = JSON.parse(missingEmblem.formula_json);
      if (missingFormula[1]?.id !== '99999' || missingFormula[1]?.name !== '未知材料 99999') {
        throw new Error(`Expected unresolved material fallback, got: ${missingEmblem.formula_json}`);
      }
      if (!importResult.stdout.includes('unresolved item formula materials: 1')) {
        throw new Error(`Import should report unresolved formula material count, got stdout: ${importResult.stdout}`);
      }

      const shears = await get(db, `SELECT name_zh FROM items WHERE external_id = ?`, ['91920']);
      if (shears?.name_zh !== '【格温的剪子】(还可使用2次！)' || shears.name_zh.includes('<rules>')) {
        throw new Error(`Imported item names should keep readable variant suffixes without markup, got: ${JSON.stringify(shears)}`);
      }

      const investorVariants = await all(db, `SELECT external_id, name_zh FROM items WHERE name_zh = ? ORDER BY external_id`, ['投机者之刃']);
      if (investorVariants.length !== 2 || investorVariants[0].external_id !== '92350' || investorVariants[1].external_id !== '92351') {
        throw new Error(`Imported same-name official variants should remain separate: ${JSON.stringify(investorVariants)}`);
      }

      const relationColumns = await all(db, `PRAGMA table_info(trait_champions)`);
      const relationColumnNames = new Set(relationColumns.map((column) => column.name));
      if (!relationColumnNames.has('trait_id') || !relationColumnNames.has('champion_id')) {
        throw new Error(`trait_champions table should persist trait and champion ids: ${[...relationColumnNames].join(',')}`);
      }

      const associatedChampions = await all(
        db,
        `
          SELECT c.name_zh
          FROM trait_champions tc
          JOIN traits t ON t.id = tc.trait_id
          JOIN champions c ON c.id = tc.champion_id
          WHERE t.name_zh = ?
          ORDER BY c.cost, c.name_zh
        `,
        ['法官'],
      );
      const associatedNames = associatedChampions.map((champion) => champion.name_zh).join(',');
      if (associatedNames !== '裁决者A,裁决者B') {
        throw new Error(`Expected imported trait champion associations, got: ${associatedNames}`);
      }
    } finally {
      await close(db);
    }

    console.log('TFT assets import contract check passed.');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
