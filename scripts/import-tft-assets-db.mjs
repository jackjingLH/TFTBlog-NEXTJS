import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

const projectRoot = process.cwd();
const defaultSourcePath = 'D:/ob/JLH/21 TFT/assets/tft/tft_assets.db';
const defaultTargetPath = path.join(projectRoot, 'data', 'tftblog.sqlite');

const sourcePath = process.argv[2] || defaultSourcePath;
const targetPath = process.argv[3] || defaultTargetPath;

function quoteSqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

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

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (error) => (error ? reject(error) : resolve()));
  });
}

async function countRows(db, table) {
  const row = await get(db, `SELECT COUNT(*) AS count FROM ${table}`);
  return row.count;
}

async function tableExists(db, tableName, schemaName = 'main') {
  const row = await get(db, `SELECT name FROM ${schemaName}.sqlite_master WHERE type = 'table' AND name = ?`, [tableName]);
  return Boolean(row);
}

async function ensureColumn(db, tableName, columnName, definition) {
  const columns = await all(db, `PRAGMA table_info(${tableName})`);
  if (!columns.some((column) => column.name === columnName)) {
    await run(db, `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

const inlineIconLabels = new Map([
  ['scaleAD', '攻击力'],
  ['scaleAP', '法术强度'],
  ['scaleArmor', '护甲'],
  ['scaleAS', '攻击速度'],
  ['scaleDA', '伤害增幅'],
  ['scaleDR', '伤害减免'],
  ['scaleHealth', '生命值'],
  ['scaleMR', '魔抗'],
  ['scaleSV', '全能吸血'],
  ['set14AmpIcon', '强化'],
  ['TFTManaRegen', '法力回复'],
]);

function normalizeInlineIconPlaceholders(value) {
  return String(value || '').replace(/(?:%i:[^%]+%)+/g, (sequence) => {
    const labels = [...sequence.matchAll(/%i:([^%]+)%/g)]
      .map((match) => inlineIconLabels.get(match[1]) || '')
      .filter(Boolean);
    return labels.length > 0 ? labels.join('/') : '';
  });
}

function normalizeOfficialText(value) {
  return normalizeInlineIconPlaceholders(value)
    .replace(/<[^>]+>/g, '')
    .replace(/@TFTUnitProperty[^@]*@/g, '')
    .replace(/\*/g, '')
    .replace(/下一个【升级】\s*回合。?/g, '')
    .replace(/剩余回合：\s*/g, '')
    .replace(/最后一次的奖励：\s*/g, '')
    .replace(/剩余战斗次数：\s*/g, '')
    .replace(/已获得的金币数：\s*/g, '')
    .replace(/献祭次数：\s*\(\s*\/\s*\d+\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([，。；：！？、）】%])/g, '$1')
    .replace(/([（【])\s+/g, '$1')
    .replace(/[：:]\s*([。；，,）)]|$)/g, '$1')
    .trim();
}

function comparableText(value) {
  return String(value || '').replace(/\s+/g, '');
}

function parseTraitLevels(levels) {
  if (!levels || typeof levels !== 'object' || Array.isArray(levels)) {
    return [];
  }

  return Object.entries(levels)
    .map(([threshold, effect]) => ({
      threshold: Number(threshold),
      effect: normalizeOfficialText(effect),
    }))
    .filter((level) => Number.isFinite(level.threshold) && level.effect)
    .sort((a, b) => a.threshold - b.threshold);
}

function parseStringArrayJson(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function parseOfficialPayloadRows(rawPayloadRows) {
  const values = [];

  for (const row of rawPayloadRows) {
    let body;
    try {
      body = JSON.parse(row.body_json);
    } catch {
      continue;
    }

    const payloadItems = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
    values.push(...payloadItems);
  }

  return values;
}

function traitMetadataKeys(trait) {
  return [trait.traitId, trait.raceId, trait.jobId, trait.TFTID, trait.id, trait.name].map(String).filter(Boolean);
}

function collectTraitMetadata(rawPayloadRows) {
  const metadata = new Map();

  for (const trait of parseOfficialPayloadRows(rawPayloadRows)) {
    const description = normalizeOfficialText(trait.introduce);
    const levels = parseTraitLevels(trait.level).filter((level) => comparableText(level.effect) !== comparableText(description));
    if (!description && levels.length === 0) {
      continue;
    }

    const value = { description, levelsJson: JSON.stringify(levels) };
    for (const key of traitMetadataKeys(trait)) {
      metadata.set(key, value);
    }
  }

  return metadata;
}

async function applyTraitMetadata(db) {
  if (!(await tableExists(db, 'raw_payloads', 'source_assets'))) {
    return;
  }

  const rawPayloadRows = await all(
    db,
    `
      SELECT body_json
      FROM source_assets.raw_payloads
      WHERE payload_type = 'trait'
    `,
  );
  const metadata = collectTraitMetadata(rawPayloadRows);
  if (metadata.size === 0) {
    return;
  }

  const traits = await all(db, `SELECT id, external_id, name_zh FROM traits`);
  for (const trait of traits) {
    const value = metadata.get(String(trait.external_id)) || metadata.get(String(trait.name_zh));
    if (!value) {
      continue;
    }

    await run(db, `UPDATE traits SET description = ?, levels_json = ? WHERE id = ?`, [
      value.description,
      value.levelsJson,
      trait.id,
    ]);
  }
}

function normalizeRuleText(value) {
  return normalizeOfficialText(value)
    .replace(/^\[(.*)\]$/, '$1')
    .trim();
}

function extractItemEffectAndRules(effect) {
  const rules = [];
  const effectWithoutRules = String(effect || '').replace(/<(?:tftitemrules|rules)[^>]*>([\s\S]*?)<\/(?:tftitemrules|rules)>/gi, (_match, ruleText) => {
    const normalizedRule = normalizeRuleText(ruleText);
    if (normalizedRule) {
      rules.push(normalizedRule);
    }
    return ' ';
  });

  return {
    effectText: normalizeOfficialText(effectWithoutRules),
    rules,
  };
}

function parseItemKeywords(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((keyword) => keyword.trim()).filter(Boolean);
  }

  return String(value || '')
    .split(/[,，;；]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function normalizeItemName(value) {
  return normalizeOfficialText(value);
}

function itemMetadataKeys(item) {
  return [item.equipId, item.TFTID, item.id, item.name].map(String).filter(Boolean);
}

function parseItemFormula(value, itemsByExternalId) {
  return String(value || '')
    .split(',')
    .map((materialId) => materialId.trim())
    .filter(Boolean)
    .map((materialId) => {
      const material = itemsByExternalId.get(materialId);
      if (material) {
        return {
          id: material.external_id,
          name: material.name_zh,
          imageUrl: material.image_url,
        };
      }

      return {
        id: materialId,
        name: `未知材料 ${materialId}`,
        imageUrl: '',
        unresolved: true,
      };
    });
}

function collectItemMetadata(rawPayloadRows, itemsByExternalId) {
  const metadata = new Map();
  let unresolvedFormulaMaterials = 0;

  for (const item of parseOfficialPayloadRows(rawPayloadRows)) {
    const { effectText, rules } = extractItemEffectAndRules(item.effect);
    const keywords = parseItemKeywords(item.keywords);
    const formula = parseItemFormula(item.formula, itemsByExternalId);
    unresolvedFormulaMaterials += formula.filter((material) => material.unresolved).length;
    if (!effectText && rules.length === 0 && keywords.length === 0 && formula.length === 0) {
      continue;
    }

    const value = {
      name: normalizeItemName(item.name),
      effectText,
      rulesJson: JSON.stringify(rules),
      keywordsJson: JSON.stringify(keywords),
      formulaJson: JSON.stringify(formula),
    };
    for (const key of itemMetadataKeys(item)) {
      metadata.set(key, value);
    }
  }

  return { metadata, unresolvedFormulaMaterials };
}

async function applyItemMetadata(db) {
  if (!(await tableExists(db, 'raw_payloads', 'source_assets'))) {
    return 0;
  }

  const rawPayloadRows = await all(
    db,
    `
      SELECT body_json
      FROM source_assets.raw_payloads
      WHERE payload_type = 'item'
    `,
  );
  const items = await all(db, `SELECT id, external_id, name_zh FROM items`);
  const itemsByExternalId = new Map();
  for (const item of await all(db, `SELECT external_id, name_zh, image_url FROM items`)) {
    itemsByExternalId.set(String(item.external_id), item);
  }

  const { metadata, unresolvedFormulaMaterials } = collectItemMetadata(rawPayloadRows, itemsByExternalId);
  if (metadata.size === 0) {
    return unresolvedFormulaMaterials;
  }

  for (const item of items) {
    const value = metadata.get(String(item.external_id)) || metadata.get(String(item.name_zh));
    if (!value) {
      continue;
    }

    await run(db, `UPDATE items SET name_zh = ?, effect_text = ?, rules_json = ?, keywords_json = ?, formula_json = ? WHERE id = ?`, [
      value.name || item.name_zh,
      value.effectText,
      value.rulesJson,
      value.keywordsJson,
      value.formulaJson,
      item.id,
    ]);
  }

  return unresolvedFormulaMaterials;
}

function traitMapKey(name, gameVersion, setId) {
  return `${name}\n${gameVersion}\n${setId}`;
}

async function applyTraitChampionAssociations(db) {
  const traits = await all(db, `SELECT id, name_zh, game_version, set_id FROM traits`);
  const traitsByName = new Map();
  for (const trait of traits) {
    traitsByName.set(traitMapKey(trait.name_zh, trait.game_version, trait.set_id), trait);
  }

  const champions = await all(
    db,
    `
      SELECT id, traits_json, game_version, set_id
      FROM champions
      WHERE traits_json != '[]'
    `,
  );

  for (const champion of champions) {
    for (const traitName of parseStringArrayJson(champion.traits_json)) {
      const trait = traitsByName.get(traitMapKey(traitName, champion.game_version, champion.set_id));
      if (!trait) {
        continue;
      }

      await run(
        db,
        `
          INSERT OR IGNORE INTO trait_champions (trait_id, champion_id, game_version, set_id)
          VALUES (?, ?, ?, ?)
        `,
        [trait.id, champion.id, champion.game_version, champion.set_id],
      );
    }
  }
}

async function main() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source database not found: ${sourcePath}`);
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  if (fs.existsSync(targetPath)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${targetPath}.${stamp}.bak`;
    fs.copyFileSync(targetPath, backupPath);
    console.log(`Backup created: ${backupPath}`);
  }

  const db = new sqlite3.Database(targetPath);
  const sourceLiteral = quoteSqlLiteral(sourcePath);

  try {
    await exec(db, `
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_url TEXT NOT NULL,
        game_version TEXT NOT NULL,
        set_id TEXT NOT NULL,
        synced_at TEXT NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS champions (
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

      CREATE TABLE IF NOT EXISTS traits (
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

      CREATE TABLE IF NOT EXISTS items (
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

      CREATE TABLE IF NOT EXISTS trait_champions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trait_id INTEGER NOT NULL REFERENCES traits(id) ON DELETE CASCADE,
        champion_id INTEGER NOT NULL REFERENCES champions(id) ON DELETE CASCADE,
        game_version TEXT NOT NULL,
        set_id TEXT NOT NULL,
        UNIQUE(trait_id, champion_id, game_version, set_id)
      );
    `);

    await ensureColumn(db, 'traits', 'description', "TEXT NOT NULL DEFAULT ''");
    await ensureColumn(db, 'traits', 'levels_json', "TEXT NOT NULL DEFAULT '[]'");
    await ensureColumn(db, 'items', 'effect_text', "TEXT NOT NULL DEFAULT ''");
    await ensureColumn(db, 'items', 'rules_json', "TEXT NOT NULL DEFAULT '[]'");
    await ensureColumn(db, 'items', 'keywords_json', "TEXT NOT NULL DEFAULT '[]'");
    await ensureColumn(db, 'items', 'formula_json', "TEXT NOT NULL DEFAULT '[]'");

    await exec(db, `
      ATTACH DATABASE ${sourceLiteral} AS source_assets;

      BEGIN IMMEDIATE TRANSACTION;
      DELETE FROM trait_champions;
      DELETE FROM items;
      DELETE FROM traits;
      DELETE FROM champions;
      DELETE FROM sources;

      INSERT INTO sources
        (id, source_url, game_version, set_id, synced_at, status)
        SELECT id, source_url, game_version, set_id, synced_at, status
        FROM source_assets.sources;

      INSERT INTO champions
        (id, source_id, external_id, slug, name_zh, name_en, cost, traits_json, image_path, image_url, game_version, set_id)
        SELECT id, source_id, external_id, slug, name_zh, name_en, cost, traits_json, image_path, image_url, game_version, set_id
        FROM source_assets.champions;

      INSERT INTO traits
        (id, source_id, external_id, slug, name_zh, name_en, description, levels_json, image_path, image_url, game_version, set_id)
        SELECT id, source_id, external_id, slug, name_zh, name_en, '', '[]', image_path, image_url, game_version, set_id
        FROM source_assets.traits;

      INSERT INTO items
        (id, source_id, external_id, slug, name_zh, name_en, category, image_path, image_url, game_version, set_id)
        SELECT id, source_id, external_id, slug, name_zh, name_en, category, image_path, image_url, game_version, set_id
        FROM source_assets.items;
    `);

    await applyTraitMetadata(db);
    const unresolvedFormulaMaterials = await applyItemMetadata(db);
    await applyTraitChampionAssociations(db);

    await exec(db, `
      COMMIT;
      DETACH DATABASE source_assets;
    `);

    const tables = ['sources', 'champions', 'traits', 'items'];
    for (const table of tables) {
      console.log(`${table}: ${await countRows(db, table)}`);
    }
    console.log(`unresolved item formula materials: ${unresolvedFormulaMaterials}`);
  } finally {
    await new Promise((resolve, reject) => {
      db.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
