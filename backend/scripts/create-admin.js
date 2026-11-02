// Crea la cuenta de administración (o le cambia la contraseña si ya existe).
// No hay administradores en los datos de demostración: así ninguna contraseña de admin queda en el repo.
//
//   npm run create-admin -- admin@cletaeats.cr "Nombre Apellido"
//
// Pide la contraseña sin mostrarla. Para usarlo sin interacción (por ejemplo en un script de despliegue),
// pasala en la variable ADMIN_PASSWORD.
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env'), quiet: true });
const readline = require('node:readline');
const bcrypt = require('bcryptjs');

const MIN_LENGTH = 12;

const askHidden = (question) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl.stdoutMuted = false;
  // eslint-disable-next-line no-underscore-dangle
  rl._writeToOutput = (text) => { if (!rl.stdoutMuted) process.stdout.write(text); };
  rl.question(question, (answer) => {
    rl.close();
    process.stdout.write('\n');
    resolve(answer);
  });
  rl.stdoutMuted = true;
});

async function main() {
  const [email, ...nameParts] = process.argv.slice(2);
  const name = nameParts.join(' ').trim() || 'Soporte CletaEats';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Uso: npm run create-admin -- correo@dominio.com "Nombre Apellido"');
    process.exit(1);
  }

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await askHidden(`Contraseña para ${email} (mínimo ${MIN_LENGTH} caracteres): `);
    const again = await askHidden('Repetila: ');
    if (password !== again) throw new Error('Las contraseñas no coinciden');
  }
  if (password.length < MIN_LENGTH) throw new Error(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres`);

  // Se carga acá para que el mensaje de uso salga aunque falten variables de entorno
  const env = require('../src/config/env');
  const db = require('../src/config/db');
  try {
    const passwordHash = await bcrypt.hash(password, Math.max(env.bcryptRounds, 12));
    const result = await db.callOne('sp_admin_upsert', [email.trim().toLowerCase(), passwordHash, name]);
    console.log(result.action === 'created'
      ? `✓ Cuenta de administración creada: ${email}`
      : `✓ Contraseña actualizada para ${email} (las sesiones abiertas se cerraron)`);
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
