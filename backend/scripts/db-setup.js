// Crea la base de datos y carga db/01_schema.sql, db/02_routines.sql y db/03_seed.sql.
// Funciona sin el cliente de consola mysql (útil en Docker y en la nube).
//
//   npm run db:setup                     # crea lo que falta y carga los datos de demostración
//   npm run db:setup -- --no-seed        # sin datos de demostración
//   npm run db:setup -- --no-history     # con restaurantes y cuentas, pero sin pedidos de ejemplo
//   npm run db:setup -- --reset          # BORRA la base de datos y la crea de cero (¡cuidado!)
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env'), quiet: true });
const fs    = require('node:fs');
const path  = require('node:path');
const mysql = require('mysql2/promise');
const { seedHistory } = require('./seed-history');

const SCHEMA_VERSION = '2';
const SQL_DIR = process.env.DB_SQL_DIR ?? path.join(__dirname, '..', '..', 'db');

const read = (file) => fs.readFileSync(path.join(SQL_DIR, file), 'utf8');

// mysql2 no entiende DELIMITER (es un comando del cliente de consola): se quitan esas líneas
// y cada procedimiento termina con // al final de una línea.
const splitRoutines = (sql) => sql
  .split('\n')
  .filter((line) => !/^\s*DELIMITER\b/i.test(line))
  .join('\n')
  .split(/\/\/[ \t]*$/m)
  .map((statement) => statement.trim())
  .filter((statement) => statement && !/^(--[^\n]*\s*)+$/.test(statement));

// Una base creada con la versión 1 (tablas client, combo, delivery_person…) no es compatible.
const checkSchemaVersion = async (connection, dbName) => {
  const [tables] = await connection.query(
    'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ?', [dbName]);
  if (!tables.length) return;
  const names = new Set(tables.map((t) => t.name));
  let version = null;
  if (names.has('app_meta')) {
    const [[row]] = await connection.query("SELECT meta_value FROM app_meta WHERE meta_key = 'schema_version'");
    version = row?.meta_value ?? null;
  }
  if (version !== SCHEMA_VERSION) {
    throw new Error(
      `La base "${dbName}" tiene un esquema anterior (versión ${version ?? '1'}). ` +
      'Para pasar a la versión 2 hay que recrearla: npm run db:setup -- --reset (borra los datos). ' +
      'Con Docker: docker compose exec api npm run db:setup -- --reset');
  }
};

async function setupDatabase({
  withSeed = !process.argv.includes('--no-seed'),
  withHistory = !process.argv.includes('--no-history'),
  withReset = process.argv.includes('--reset'),
  log = console.log,
} = {}) {
  const dbName = process.env.DB_NAME;
  if (!dbName || !/^[A-Za-z0-9_]+$/.test(dbName)) throw new Error(`DB_NAME inválido: ${dbName}`);

  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT ?? 3306),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    charset:  'UTF8MB4_UNICODE_CI',
    timezone: 'Z',
    decimalNumbers: true,
    multipleStatements: true,
  });

  try {
    await connection.query("SET time_zone = '+00:00'");
    if (withReset) {
      log(`→ Borrando base de datos ${dbName}`);
      await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    }
    log(`→ Base de datos ${dbName}`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${dbName}\``);
    await checkSchemaVersion(connection, dbName);

    log('→ Tablas y vistas');
    await connection.query(read('01_schema.sql'));

    log('→ Procedimientos almacenados');
    const routines = splitRoutines(read('02_routines.sql'));
    for (const statement of routines) await connection.query(statement);
    log(`  ${routines.filter((s) => /^CREATE PROCEDURE/i.test(s)).length} procedimientos`);

    if (withSeed) {
      log('→ Datos de demostración');
      await connection.query(read('03_seed.sql'));
      if (withHistory) {
        const created = await seedHistory(connection, { log });
        if (created) log(`  ${created} pedidos de los últimos 30 días`);
      }
    }
    log('✓ Base de datos lista');
  } finally {
    await connection.end();
  }
}

module.exports = { setupDatabase, splitRoutines };

if (require.main === module) {
  setupDatabase().catch((err) => {
    console.error('✗ Error preparando la base de datos:', err.message);
    process.exit(1);
  });
}
