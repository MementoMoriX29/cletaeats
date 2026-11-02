// Cada archivo de tests tiene su propio pool de conexiones: se cierra al terminar.
afterAll(async () => {
  await require('../src/config/db').end();
});
