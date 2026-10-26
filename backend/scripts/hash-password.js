// Genera el hash bcrypt para ADMIN_PASSWORD_HASH.
// Uso: npm run hash-password -- "mi-contraseña-segura"
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Uso: npm run hash-password -- "contraseña de al menos 12 caracteres"');
  process.exit(1);
}

console.log(bcrypt.hashSync(password, 12));
