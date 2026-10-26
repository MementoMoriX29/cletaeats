// Antes de correr los tests: borra y recrea la base de pruebas con los datos de prueba.
require('./env');
const { setupDatabase } = require('../scripts/db-setup');

module.exports = async () => {
  if (!process.env.DB_NAME.endsWith('_test'))
    throw new Error(`Por seguridad los tests solo corren sobre una base *_test (DB_NAME=${process.env.DB_NAME})`);
  await setupDatabase({ withReset: true, withSeed: true, log: () => {} });
};
