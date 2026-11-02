// Cuentas de usuario (todos los roles comparten la tabla account).
const db = require('../config/db');

module.exports = {
  getById: (id) => db.callOne('sp_account_get', [id]),
  getCredentialsByEmail: (email) => db.callOne('sp_account_get_credentials_by_email', [email]),
  getCredentialsById: (id) => db.callOne('sp_account_get_credentials_by_id', [id]),

  createClient: ({ email, passwordHash, name, phone }) =>
    db.callOne('sp_account_create_client', [email, passwordHash, name, phone]),

  createCourier: ({ email, passwordHash, name, phone, nationalId, vehicle }) =>
    db.callOne('sp_account_create_courier', [email, passwordHash, name, phone, nationalId, vehicle]),

  updateProfile: (id, { name, phone }) => db.callOne('sp_account_update_profile', [id, name, phone]),

  // Devuelve la nueva versión de sesión (los tokens anteriores dejan de valer).
  updatePassword: async (id, passwordHash) =>
    (await db.callOne('sp_account_update_password', [id, passwordHash])).session_version,

  touchLogin: (id) => db.callSets('sp_account_touch_login', [id]),

  upsertAdmin: ({ email, passwordHash, name }) => db.callOne('sp_admin_upsert', [email, passwordHash, name]),

  listClients: (search) => db.call('sp_client_list', [search]),
  setClientStatus: (id, status) => db.callOne('sp_client_set_status', [id, status]),
};
