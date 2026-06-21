import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const DB_PATH = path.resolve(process.cwd(), 'prisma', 'dev.db');
const EXPORT_DIR = path.resolve(process.cwd(), 'data-export');
const OUTPUT_FILE = path.join(EXPORT_DIR, 'sqlite-export.sql');

if (!fs.existsSync(DB_PATH)) {
  console.error(`Database file not found: ${DB_PATH}`);
  process.exit(1);
}

fs.mkdirSync(EXPORT_DIR, { recursive: true });

const db = new Database(DB_PATH, { readonly: true });

const sqlParts: string[] = [
  '-- SQLite database export',
  `-- Generated: ${new Date().toISOString()}`,
  `-- Source: ${DB_PATH}`,
  '',
  'PRAGMA foreign_keys=OFF;',
  'BEGIN TRANSACTION;',
  '',
];

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;").all() as Array<{ name: string }>;

for (const table of tables) {
  const tableName = table.name;

  const columns = db.prepare(`PRAGMA table_info("${tableName}");`).all() as Array<{
    name: string;
    pk: number;
  }>;

  const primaryKeyColumns = columns
    .filter((column) => column.pk > 0)
    .sort((a, b) => a.pk - b.pk)
    .map((column) => column.name);

  const columnNames = columns.map((column) => column.name);
  const quotedColumnNames = columnNames.map((column) => `"${column}"`);

  sqlParts.push(`-- Table: ${tableName}`);
  sqlParts.push(`DROP TABLE IF EXISTS "${tableName}";`);
  sqlParts.push(`CREATE TABLE "${tableName}" (`);
  sqlParts.push(
    columns
      .map((column) => {
        const primaryKey = primaryKeyColumns.includes(column.name) ? ' PRIMARY KEY' : '';
        return `  "${column.name}"${primaryKey}`;
      })
      .join(',\n'),
  );
  sqlParts.push(');');
  sqlParts.push('');

  const rows = db.prepare(`SELECT ${columnNames.map((column) => `"${column}"`).join(', ')} FROM "${tableName}";`).all();

  if (rows.length > 0) {
    for (const row of rows) {
      const values = columnNames.map((column) => sqlValue((row as Record<string, unknown>)[column]));
      sqlParts.push(`INSERT INTO "${tableName}" (${quotedColumnNames.join(', ')}) VALUES (${values.join(', ')});`);
    }

    sqlParts.push('');
  }
}

sqlParts.push('COMMIT;');
sqlParts.push('PRAGMA foreign_keys=ON;');

fs.writeFileSync(OUTPUT_FILE, sqlParts.join('\n'), 'utf-8');

db.close();

console.log(`✅ Exported SQLite database to ${OUTPUT_FILE}`);

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}
