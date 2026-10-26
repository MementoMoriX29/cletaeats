// Variables para los tests. Se cargan antes que la app, y dotenv no las sobrescribe.
// Los tests usan SIEMPRE una base separada (por defecto cletaeats_test), que se borra y recrea.
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'cletaeats_test';
process.env.DB_HOST = process.env.DB_HOST ?? '127.0.0.1';
process.env.DB_USER = process.env.DB_USER ?? 'root';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-solo-para-pruebas-automatizadas-0123456789';
process.env.ADMIN_EMAIL = 'admin@test.local';
// Hash bcrypt de "Admin-Test-2026!" (solo para pruebas)
process.env.ADMIN_PASSWORD_HASH = '$2b$10$RjLvcGaWQknoISJJl2qrJOHv5UyIY2rTYyw3CUZB5py0gMy2hSr/u';
