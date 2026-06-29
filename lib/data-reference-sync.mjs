import path from 'node:path';
import sqlite3 from 'sqlite3';

export const dataReferenceTables = ['sources', 'champions', 'traits', 'items', 'augments', 'trait_champions'];

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

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()));
  });
}

async function assertStagingCoreTablesHaveRows(db) {
  for (const tableName of ['champions', 'traits', 'items', 'augments']) {
    const row = await get(db, `SELECT COUNT(*) AS count FROM staging.${tableName}`);
    if (!row?.count) {
      throw new Error(`staging ${tableName} must contain at least one row`);
    }
  }
}

async function assertRequiredTables(db, schemaName, tableNames, label = schemaName) {
  for (const tableName of tableNames) {
    const row = await get(db, `SELECT name FROM ${schemaName}.sqlite_master WHERE type = 'table' AND name = ?`, [tableName]);
    if (!row) {
      throw new Error(`${label} missing required table: ${tableName}`);
    }
  }
}

async function tableCounts(db) {
  const counts = {};
  for (const tableName of dataReferenceTables) {
    const source = await get(db, `SELECT COUNT(*) AS count FROM staging.${tableName}`);
    const target = await get(db, `SELECT COUNT(*) AS count FROM main.${tableName}`);
    counts[tableName] = {
      source: source?.count ?? 0,
      target: target?.count ?? 0,
    };
  }
  return counts;
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function tableColumns(db, schemaName, tableName) {
  return all(db, `PRAGMA ${schemaName}.table_info(${tableName})`);
}

async function copyTableFromStaging(db, tableSchema) {
  const columnNames = tableSchema.columns.map((column) => column.name);
  const columnsSql = columnNames.map(quoteIdentifier).join(', ');
  await exec(
    db,
    `INSERT INTO ${quoteIdentifier(tableSchema.name)} (${columnsSql}) SELECT ${columnsSql} FROM staging.${quoteIdentifier(tableSchema.name)};`,
  );
}

async function stagingTableSchema(db, tableName) {
  const row = await get(db, `SELECT sql FROM staging.sqlite_master WHERE type = 'table' AND name = ?`, [tableName]);
  const columns = await tableColumns(db, 'staging', tableName);
  if (columns.length === 0) {
    throw new Error(`staging missing columns for table: ${tableName}`);
  }

  if (row?.sql) {
    return {
      name: tableName,
      sql: String(row.sql),
      columns,
    };
  }

  const definitions = columns.map((column) => {
    const parts = [quoteIdentifier(column.name), column.type || 'TEXT'];
    if (column.pk) parts.push('PRIMARY KEY');
    if (column.notnull) parts.push('NOT NULL');
    if (column.dflt_value !== null && column.dflt_value !== undefined) parts.push('DEFAULT', String(column.dflt_value));
    return parts.join(' ');
  });
  return {
    name: tableName,
    sql: `CREATE TABLE ${quoteIdentifier(tableName)} (${definitions.join(', ')})`,
    columns,
  };
}

async function stagingTableSchemas(db) {
  const schemas = [];
  for (const tableName of dataReferenceTables) {
    schemas.push(await stagingTableSchema(db, tableName));
  }
  return schemas;
}

async function recreateMainReferenceTablesFromStaging(db, schemas) {
  for (const tableName of [...dataReferenceTables].reverse()) {
    await exec(db, `DROP TABLE IF EXISTS main.${quoteIdentifier(tableName)};`);
  }

  for (const tableSchema of schemas) {
    await exec(db, tableSchema.sql);
  }
}

export async function syncDataReferenceTables(options) {
  const targetDatabasePath = path.resolve(options.targetDatabasePath);
  const stagingDatabasePath = path.resolve(options.stagingDatabasePath);
  const db = new sqlite3.Database(targetDatabasePath);

  try {
    await exec(db, 'PRAGMA foreign_keys = OFF;');
    await exec(db, `ATTACH DATABASE ${quoteSqlLiteral(stagingDatabasePath)} AS staging;`);
    await assertRequiredTables(db, 'main', ['guides', 'guide_tags'], 'production');
    await assertRequiredTables(db, 'staging', dataReferenceTables);
    await assertStagingCoreTablesHaveRows(db);
    const schemas = await stagingTableSchemas(db);
    await exec(db, 'BEGIN IMMEDIATE TRANSACTION;');
    try {
      await recreateMainReferenceTablesFromStaging(db, schemas);

      for (const tableSchema of schemas) {
        await copyTableFromStaging(db, tableSchema);
      }

      await exec(db, 'COMMIT;');
      return {
        tableCounts: await tableCounts(db),
      };
    } catch (error) {
      await exec(db, 'ROLLBACK;').catch(() => undefined);
      throw error;
    } finally {
      await exec(db, 'DETACH DATABASE staging;').catch(() => undefined);
      await exec(db, 'PRAGMA foreign_keys = ON;').catch(() => undefined);
    }
  } finally {
    await close(db);
  }
}
