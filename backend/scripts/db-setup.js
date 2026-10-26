// Crea la base de datos y carga db/01_schema.sql, db/02_routines.sql y db/03_seed.sql
// usando mysql2, sin necesitar el cliente `mysql` instalado (sirve en Docker y en CI).
//
// Uso:
//   npm run db:setup                 # crea/actualiza esquema y procedimientos + datos de prueba
//   npm run db:setup -- --no-seed    # sin datos de prueba
//   npm run db:setup -- --reset      # BORRA la base de datos y la crea de cero (¡cuidado!)
require('dotenv').config({ quiet: true });
const fs    = require('fs');
const path  = require('path');
const mysql = require('mysql2/promise');

const args   = new Set(process.argv.slice(2));
const reset  = args.has('--reset');
const seed   = !args.has('--no-seed');
const sqlDir = process.env.DB_SQL_DIR ?? path.resolve(__dirname, '../../db');
const dbName = process.env.DB_NAME;

const read = (file) => fs.readFileSync(path.join(sqlDir, file), 'utf8');

// Los procedimientos usan "DELIMITER //" (sintaxis del cliente mysql): se separan a mano
const splitRoutines = (sql) =>
  sql
    .split('\n')
    .filter((line) => !/^\s*DELIMITER\b/i.test(line))
    .join('\n')
    .split(/\/\/[ \t]*$/m)
    .map((statement) => statement.trim())
    .filter((statement) => statement && !/^(--[^\n]*\n?)+$/.test(statement));

async function setupDatabase({ withSeed = seed, withReset = reset, log = console.log } = {}) {
  if (!dbName || !/^[A-Za-z0-9_]+$/.test(dbName)) throw new Error(`DB_NAME inválido: ${dbName}`);

  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT ?? 3306),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    charset:  'UTF8MB4_UNICODE_CI',
    multipleStatements: true,
  });

  try {
    if (withReset) {
      log(`→ Borrando base de datos ${dbName}`);
      await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    }
    log(`→ Creando base de datos ${dbName}`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE \`${dbName}\``);

    log('→ Esquema');
    await connection.query(read('01_schema.sql'));

    log('→ Funciones y procedimientos');
    let skippedFunctions = 0;
    for (const statement of splitRoutines(read('02_routines.sql'))) {
      try {
        await connection.query(statement);
      } catch (err) {
        // Con binlog activo (HeatWave, MySQL por defecto), crear FUNCIONES exige SUPER o
        // log_bin_trust_function_creators=ON. Las funciones fn_* son auxiliares (la API calcula
        // la factura en Node), así que si no hay permiso se omiten en lugar de abortar.
        if (err.errno === 1419 && /CREATE FUNCTION/i.test(statement)) {
          skippedFunctions++;
          continue;
        }
        throw err;
      }
    }
    if (skippedFunctions) {
      log(`  ⚠ Se omitieron ${skippedFunctions} funciones fn_* (requieren log_bin_trust_function_creators=ON). La API no las usa.`);
    }

    if (withSeed) {
      log('→ Datos de prueba');
      await connection.query(read('03_seed.sql'));
    }
    log('✓ Base de datos lista');
  } finally {
    await connection.end();
  }
}

module.exports = { setupDatabase };

if (require.main === module) {
  setupDatabase().catch((err) => {
    console.error('✗ Error preparando la base de datos:', err.message);
    process.exit(1);
  });
}
