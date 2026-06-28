import fs from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';

const defaultDatabaseUrl = 'file:./data/tftblog.sqlite';
const itemCategoryLabels = {
  '1': '基础',
  '2': '成装',
  '3': '特殊',
  '4': '强化',
  '5': '光明',
  '6': '神器',
  '7': '特殊',
  '9': '其他',
};

const augmentTierLabels = {
  '1': '银',
  '2': '金',
  '3': '彩',
};

export function resolveDataReferenceDatabasePath(databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl) {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('DATABASE_URL must use a file: SQLite URL.');
  }

  const filePath = databaseUrl.slice('file:'.length);
  if (!filePath.trim()) {
    throw new Error('DATABASE_URL file path is empty.');
  }

  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function parseTraits(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function parseTraitLevels(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((level) => ({
        threshold: Number(level?.threshold),
        effect: String(level?.effect || '').trim(),
      }))
      .filter((level) => Number.isFinite(level.threshold) && level.effect);
  } catch {
    return [];
  }
}

function parseStringList(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed.map(String).map((item) => item.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function parseChampionStats(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return {
      role: String(parsed.role || '').trim(),
      attackGrowth: String(parsed.attackGrowth || '').trim(),
      healthGrowth: String(parsed.healthGrowth || '').trim(),
      armor: String(parsed.armor || '').trim(),
      magicResist: String(parsed.magicResist || '').trim(),
      attackSpeed: String(parsed.attackSpeed || '').trim(),
      range: String(parsed.range || '').trim(),
      mana: String(parsed.mana || '').trim(),
    };
  } catch {
    return {};
  }
}

function isSpecialChampion(cost, traits) {
  return traits.length === 0 || !cost || cost < 1 || cost > 5;
}

function normalizeQuery(query) {
  return (query || '').trim();
}

function likeQuery(query) {
  return `%${query.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
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

async function tableColumns(db, tableName) {
  return all(db, `PRAGMA table_info(${tableName})`);
}

async function tableExists(db, tableName) {
  const row = await new Promise((resolve, reject) => {
    db.get(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`, [tableName], (error, result) =>
      error ? reject(error) : resolve(result),
    );
  });
  return Boolean(row);
}

function mapChampion(row, traitsByName = new Map()) {
  const parsedTraits = parseTraits(row.traits_json);
  const traits = isSpecialChampion(row.cost, parsedTraits) ? ['特殊对象'] : parsedTraits;
  const traitDetails = parsedTraits
    .map((traitName) => traitsByName.get(traitName))
    .filter(Boolean);

  return {
    id: row.external_id,
    slug: row.slug,
    name: row.name_zh,
    cost: row.cost,
    traits,
    imageUrl: row.image_url,
    skill: {
      name: row.skill_name || '',
      type: row.skill_type || '',
      detail: row.skill_detail || '',
      imageUrl: row.skill_image_url || '',
    },
    stats: parseChampionStats(row.stats_json),
    traitDetails,
  };
}

function mapSimpleReference(row) {
  return {
    id: row.external_id,
    slug: row.slug,
    name: row.name_zh,
    imageUrl: row.image_url,
  };
}

function mapTrait(row, champions = []) {
  return {
    id: row.external_id,
    slug: row.slug,
    name: row.name_zh,
    imageUrl: row.image_url,
    description: row.description || '',
    levels: parseTraitLevels(row.levels_json),
    champions,
  };
}

function itemCategoryLabel(category) {
  return itemCategoryLabels[category] || `分类 ${category || '-'}`;
}

function mapItem(row) {
  const formula = parseItemFormula(row.formula_json);
  return {
    id: row.external_id,
    slug: row.slug,
    name: row.name_zh,
    category: row.category,
    categoryLabel: itemCategoryLabel(row.category),
    imageUrl: row.image_url,
    effectText: row.effect_text || '',
    rules: parseStringList(row.rules_json),
    formula,
  };
}

function mapAugment(row) {
  return {
    id: row.external_id,
    slug: row.slug,
    name: row.name_zh,
    tier: row.tier,
    tierLabel: augmentTierLabels[row.tier] || `品质 ${row.tier || '-'}`,
    imageUrl: row.image_url,
    effectText: row.effect_text || '',
    rules: parseStringList(row.rules_json),
    gameVersion: row.game_version,
    setId: row.set_id,
  };
}

function parseItemFormula(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((material) => ({
        id: String(material?.id || '').trim(),
        name: String(material?.name || '').trim(),
        imageUrl: String(material?.imageUrl || '').trim(),
        unresolved: material?.unresolved === true,
      }))
      .filter((material) => material.id && material.name);
  } catch {
    return [];
  }
}

export async function listDataReferences(options = {}) {
  const type = options.type === 'traits' || options.type === 'items' || options.type === 'augments' ? options.type : 'champions';

  const databasePath = resolveDataReferenceDatabasePath(options.databaseUrl);
  if (!fs.existsSync(databasePath)) {
    throw new Error(`Data reference database not found: ${databasePath}`);
  }

  const db = new sqlite3.Database(databasePath, sqlite3.OPEN_READONLY);
  try {
    const query = normalizeQuery(options.q);
    if (type === 'augments') {
      if (!(await tableExists(db, 'augments'))) {
        return { type, available: false, total: 0, items: [] };
      }

      const totalRow = await new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) AS count FROM augments`, [], (error, row) => (error ? reject(error) : resolve(row)));
      });
      if (!totalRow?.count) {
        return { type, available: false, total: 0, items: [] };
      }

      const tier = ['1', '2', '3'].includes(String(options.tier || '')) ? String(options.tier) : '';
      const whereParts = [];
      const params = [];
      if (query) {
        whereParts.push("(name_zh LIKE ? ESCAPE '\\' OR effect_text LIKE ? ESCAPE '\\' OR rules_json LIKE ? ESCAPE '\\')");
        params.push(likeQuery(query), likeQuery(query), likeQuery(query));
      }
      if (tier) {
        whereParts.push('tier = ?');
        params.push(tier);
      }
      const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';
      const rows = await all(
        db,
        `
          SELECT external_id, slug, name_zh, tier, image_url, effect_text, rules_json, game_version, set_id
          FROM augments
          ${where}
          ORDER BY CAST(tier AS INTEGER), name_zh
        `,
        params,
      );
      const items = rows.map(mapAugment);
      return { type, available: true, total: items.length, items };
    }

    if (type === 'traits') {
      const columns = await tableColumns(db, 'traits');
      const columnNames = new Set(columns.map((column) => column.name));
      const descriptionSelect = columnNames.has('description') ? 'description' : "'' AS description";
      const levelsSelect = columnNames.has('levels_json') ? 'levels_json' : "'[]' AS levels_json";
      const where = query ? 'WHERE name_zh LIKE ? ESCAPE \'\\\'' : '';
      const params = query ? [likeQuery(query)] : [];
      const rows = await all(
        db,
        `
          SELECT id AS row_id, external_id, slug, name_zh, image_url, ${descriptionSelect}, ${levelsSelect}
          FROM traits
          ${where}
          ORDER BY name_zh
        `,
        params,
      );
      const championsByTrait = new Map();
      if (rows.length > 0 && (await tableExists(db, 'trait_champions'))) {
        const placeholders = rows.map(() => '?').join(',');
        const championRows = await all(
          db,
          `
            SELECT
              tc.trait_id,
              c.external_id,
              c.slug,
              c.name_zh,
              c.cost,
              c.image_url
            FROM trait_champions tc
            JOIN champions c ON c.id = tc.champion_id
            WHERE tc.trait_id IN (${placeholders})
            ORDER BY c.cost, c.name_zh
          `,
          rows.map((row) => row.row_id),
        );

        for (const champion of championRows) {
          const list = championsByTrait.get(champion.trait_id) || [];
          list.push({
            id: champion.external_id,
            slug: champion.slug,
            name: champion.name_zh,
            cost: champion.cost,
            imageUrl: champion.image_url,
          });
          championsByTrait.set(champion.trait_id, list);
        }
      }

      const items = rows.map((row) => mapTrait(row, championsByTrait.get(row.row_id) || []));
      return { type, available: true, total: items.length, items };
    }

    if (type === 'items') {
      const columns = await tableColumns(db, 'items');
      const columnNames = new Set(columns.map((column) => column.name));
      const effectTextSelect = columnNames.has('effect_text') ? 'effect_text' : "'' AS effect_text";
      const rulesSelect = columnNames.has('rules_json') ? 'rules_json' : "'[]' AS rules_json";
      const formulaSelect = columnNames.has('formula_json') ? 'formula_json' : "'[]' AS formula_json";
      const where = query ? 'WHERE name_zh LIKE ? ESCAPE \'\\\' OR category LIKE ? ESCAPE \'\\\'' : '';
      const params = query ? [likeQuery(query), likeQuery(query)] : [];
      const rows = await all(
        db,
        `
          SELECT external_id, slug, name_zh, category, image_url, ${effectTextSelect}, ${rulesSelect}, ${formulaSelect}
          FROM items
          ${where}
          ORDER BY category, name_zh
        `,
        params,
      );
      const items = rows.map(mapItem);
      return { type, available: true, total: items.length, items };
    }

    if (type !== 'champions') {
      return { type, available: true, total: 0, items: [] };
    }

    const championColumns = await tableColumns(db, 'champions');
    const championColumnNames = new Set(championColumns.map((column) => column.name));
    const skillNameSelect = championColumnNames.has('skill_name') ? 'skill_name' : "'' AS skill_name";
    const skillTypeSelect = championColumnNames.has('skill_type') ? 'skill_type' : "'' AS skill_type";
    const skillDetailSelect = championColumnNames.has('skill_detail') ? 'skill_detail' : "'' AS skill_detail";
    const skillImageSelect = championColumnNames.has('skill_image_url') ? 'skill_image_url' : "'' AS skill_image_url";
    const statsSelect = championColumnNames.has('stats_json') ? 'stats_json' : "'{}' AS stats_json";
    const where = query ? 'WHERE name_zh LIKE ? ESCAPE \'\\\' OR traits_json LIKE ? ESCAPE \'\\\'' : '';
    const params = query ? [likeQuery(query), likeQuery(query)] : [];
    const rows = await all(
      db,
      `
        SELECT external_id, slug, name_zh, cost, traits_json, image_url, ${skillNameSelect}, ${skillTypeSelect}, ${skillDetailSelect}, ${skillImageSelect}, ${statsSelect}
        FROM champions
        ${where}
        ORDER BY
          CASE
            WHEN cost BETWEEN 1 AND 5 AND traits_json != '[]' THEN 0
            ELSE 1
          END,
          COALESCE(cost, 99),
          name_zh
      `,
      params,
    );
    const traitNames = [...new Set(rows.flatMap((row) => parseTraits(row.traits_json)))];
    const traitsByName = new Map();
    if (traitNames.length > 0) {
      const placeholders = traitNames.map(() => '?').join(',');
      const traitRows = await all(
        db,
        `
          SELECT external_id, slug, name_zh, image_url
          FROM traits
          WHERE name_zh IN (${placeholders})
        `,
        traitNames,
      );
      for (const trait of traitRows) {
        traitsByName.set(trait.name_zh, {
          id: trait.external_id,
          slug: trait.slug,
          name: trait.name_zh,
          imageUrl: trait.image_url,
        });
      }
    }

    const items = rows.map((row) => mapChampion(row, traitsByName));
    return { type, available: true, total: items.length, items };
  } finally {
    await close(db);
  }
}
