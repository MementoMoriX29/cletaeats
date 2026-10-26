// Punto de entrada: levanta HTTP + Socket.IO y cierra limpio al recibir SIGTERM (Docker).
const http = require('http');
const env  = require('./config/env');
const db   = require('./config/db');
const { app }          = require('./app');
const { attachSocket } = require('./socket/trackingSocket');

const httpServer = http.createServer(app);
const io = attachSocket(httpServer);

httpServer.listen(env.port, () => {
  console.log(`CletaEats API escuchando en el puerto ${env.port} (${env.isProduction ? 'producción' : 'desarrollo'})`);
});

const shutdown = (signal) => {
  console.log(`${signal} recibido, cerrando…`);
  io.close();
  httpServer.close(async () => {
    await db.end().catch(() => {});
    process.exit(0);
  });
  // Si algo queda colgado, salir igual a los 10 s
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
