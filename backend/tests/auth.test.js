// Registro, inicio de sesión, sesiones y perfil.
const {
  api, auth, unique, uniquePhone, uniqueNationalId, login, registerClient, createAdmin, addAddress,
  DEMO_PASSWORD, SEED,
} = require('./helpers');

describe('registro e inicio de sesión', () => {
  test('un cliente se registra y queda con la sesión iniciada', async () => {
    const email = unique('nuevo');
    const res = await api().post('/api/auth/register').send({
      name: '  Ana Pérez Mora ', email: email.toUpperCase(), phone: '+506 8888-1234', password: DEMO_PASSWORD,
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      name: 'Ana Pérez Mora', email, phone: '8888-1234', role: 'client', status: 'active',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password/);
  });

  test('no permite dos cuentas con el mismo correo', async () => {
    const { user } = await registerClient();
    const res = await api().post('/api/auth/register').send({
      name: 'Otra Persona', email: user.email, phone: uniquePhone(), password: DEMO_PASSWORD,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe una cuenta con ese correo');
  });

  test('valida los datos e indica qué campo está mal', async () => {
    const res = await api().post('/api/auth/register').send({
      name: 'Ana', email: 'no-es-un-correo', phone: '123', password: 'corta',
    });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields).sort()).toEqual(['email', 'password', 'phone']);
  });

  test('un solo login para todos los roles: el rol sale de la cuenta', async () => {
    expect((await login(SEED.client)).user.role).toBe('client');
    expect((await login(SEED.restaurant1Owner)).user.role).toBe('restaurant');
    expect((await login('andres.jimenez@example.com')).user.role).toBe('courier');
  });

  test('el campo "rol" que mandaba la app anterior se ignora', async () => {
    const res = await api().post('/api/auth/login')
      .send({ email: SEED.client, password: DEMO_PASSWORD, rol: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('client');
  });

  test('contraseña incorrecta y correo inexistente responden igual', async () => {
    const wrong = await api().post('/api/auth/login').send({ email: SEED.client, password: 'incorrecta' });
    const missing = await api().post('/api/auth/login').send({ email: unique('nadie'), password: 'incorrecta' });
    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(wrong.body).toEqual(missing.body);
  });

  test('las rutas privadas piden una sesión válida', async () => {
    expect((await api().get('/api/me')).status).toBe(401);
    expect((await api().get('/api/me').set(auth('token-falso'))).status).toBe(401);
  });

  test('JSON mal formado', async () => {
    const res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_JSON');
  });
});

describe('solicitud de repartidor', () => {
  test('queda pendiente: ve el estado de su solicitud pero no puede tomar pedidos', async () => {
    const res = await api().post('/api/auth/register-courier').send({
      name: 'Diego Prueba Mora', email: unique('repartidor'), phone: uniquePhone(), password: DEMO_PASSWORD,
      national_id: '1-1111-2222', vehicle: 'scooter',
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ role: 'courier', status: 'pending' });
    const { token } = res.body;

    const me = await api().get('/api/courier/me').set(auth(token));
    expect(me.status).toBe(200);
    expect(me.body.profile).toMatchObject({ status: 'pending', vehicle: 'scooter', availability: 'offline' });

    expect((await api().get('/api/courier/offers').set(auth(token))).status).toBe(403);
    expect((await api().put('/api/courier/availability').set(auth(token)).send({ online: true })).status).toBe(403);
  });

  test('una cédula solo puede registrarse una vez', async () => {
    const nationalId = uniqueNationalId();
    const body = () => ({
      name: 'Repartidor Uno', email: unique('rep'), phone: uniquePhone(), password: DEMO_PASSWORD, national_id: nationalId,
    });
    expect((await api().post('/api/auth/register-courier').send(body())).status).toBe(201);
    const again = await api().post('/api/auth/register-courier').send(body());
    expect(again.status).toBe(409);
    expect(again.body.error).toBe('Esa cédula ya está registrada');
  });
});

describe('cambio de contraseña', () => {
  test('cierra las demás sesiones y devuelve una nueva', async () => {
    const { token, user } = await registerClient();
    const otherDevice = await login(user.email);

    const wrong = await api().put('/api/me/password').set(auth(token))
      .send({ current_password: 'no-es-esta', new_password: 'OtraClave-2026' });
    expect(wrong.status).toBe(400);

    const res = await api().put('/api/me/password').set(auth(token))
      .send({ current_password: DEMO_PASSWORD, new_password: 'OtraClave-2026' });
    expect(res.status).toBe(200);

    expect((await api().get('/api/me').set(auth(token))).status).toBe(401);
    expect((await api().get('/api/me').set(auth(otherDevice.token))).status).toBe(401);
    expect((await api().get('/api/me').set(auth(res.body.token))).status).toBe(200);
    await login(user.email, 'OtraClave-2026');
  });
});

describe('suspensión', () => {
  test('una cuenta suspendida no puede entrar y su sesión deja de valer al instante', async () => {
    const admin = await createAdmin();
    const { token, user } = await registerClient();

    await api().post(`/api/admin/clients/${user.id}/suspend`).set(auth(admin.token)).expect(200);
    expect((await api().get('/api/me').set(auth(token))).status).toBe(403);
    const blocked = await api().post('/api/auth/login').send({ email: user.email, password: DEMO_PASSWORD });
    expect(blocked.status).toBe(403);

    await api().post(`/api/admin/clients/${user.id}/reactivate`).set(auth(admin.token)).expect(200);
    await login(user.email);
  });
});

describe('perfil y direcciones', () => {
  test('edita nombre y teléfono', async () => {
    const { token } = await registerClient();
    const res = await api().put('/api/me').set(auth(token)).send({ name: 'Nombre Nuevo', phone: '7000 1234' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Nombre Nuevo', phone: '7000-1234' });
  });

  test('cada cliente solo ve y edita sus direcciones', async () => {
    const a = await registerClient();
    const b = await registerClient();
    const address = await addAddress(a.token);
    const path = `/api/me/addresses/${address.id}`;
    const body = { label: 'Trabajo', line: 'Universidad Nacional, Heredia', lat: 10.0011, lng: -84.1106 };

    expect((await api().put(path).set(auth(b.token)).send(body)).status).toBe(404);
    expect((await api().delete(path).set(auth(b.token))).status).toBe(404);
    expect((await api().get('/api/me/addresses').set(auth(b.token))).body).toEqual([]);

    const updated = await api().put(path).set(auth(a.token)).send(body);
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ label: 'Trabajo', details: null });
    expect((await api().delete(path).set(auth(a.token))).status).toBe(204);
    expect((await api().delete(path).set(auth(a.token))).status).toBe(404);
  });

  test('las direcciones tienen que estar en Costa Rica y hay un máximo de 10', async () => {
    const { token } = await registerClient();
    const outside = await api().post('/api/me/addresses').set(auth(token))
      .send({ label: 'Casa', line: 'Ciudad de Panamá, centro', lat: 8.98, lng: -79.52 });
    expect(outside.status).toBe(400);

    for (let i = 0; i < 10; i++) await addAddress(token);
    const extra = await api().post('/api/me/addresses').set(auth(token))
      .send({ label: 'Otra', line: 'Heredia centro, frente al parque', lat: 9.998, lng: -84.117 });
    expect(extra.status).toBe(409);
  });

  test('solo los clientes tienen direcciones', async () => {
    const restaurant = await login(SEED.restaurant1Owner);
    expect((await api().get('/api/me/addresses').set(auth(restaurant.token))).status).toBe(403);
  });
});
