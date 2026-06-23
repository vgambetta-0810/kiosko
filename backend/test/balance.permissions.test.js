const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'balance-permissions-test-secret';
process.env.API_RATE_LIMIT_MAX = '100';
process.env.GOOGLE_CLIENT_ID = 'balance-test-google-client';
process.env.GOOGLE_CLIENT_SECRET = 'balance-test-google-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://127.0.0.1/auth/google/callback';

const app = require('../src/app');
const connectDB = require('../src/config/db');
const { sequelize } = require('../src/config/db');
const { User, Account, AccountMovement } = require('../src/models');
const { signToken } = require('../src/utils/jwt');

let server;
let baseUrl;
let admin;
let seller;
let client;

const request = (path, user, options = {}) =>
  fetch(`${baseUrl}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${signToken({ sub: user.id })}`,
      ...options.headers
    }
  });

test.before(async () => {
  await connectDB();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test.beforeEach(async () => {
  await sequelize.sync({ force: true });
  admin = await User.create({ name: 'Admin', email: 'admin-balance@test.com', role: 'ADMIN' });
  seller = await User.create({ name: 'Seller', email: 'seller-balance@test.com', role: 'SELLER' });
  client = await User.create({ name: 'Cliente', email: 'client-balance@test.com', role: 'CLIENT', cardId: 'CARD-1' });
});

test('un cliente no puede cargarse saldo desde una llamada manual', async () => {
  const response = await request('/client/me/balance-charge', client, {
    method: 'POST',
    body: JSON.stringify({ amount: 5000, paymentMethod: 'DevTools' })
  });

  assert.equal(response.status, 403);
  assert.equal(await Account.count(), 0);
  assert.equal(await AccountMovement.count(), 0);
});

test('un vendedor no puede modificar saldo por endpoints administrativos o genéricos', async () => {
  const legacyResponse = await request(`/clients/${client.id}/balance-charge`, seller, {
    method: 'POST',
    body: JSON.stringify({ amount: 1000, paymentMethod: 'Efectivo' })
  });
  const directResponse = await request(`/clients/${client.id}/balance-movements`, seller, {
    method: 'POST',
    body: JSON.stringify({ operation: 'RECHARGE', amount: 1000, paymentMethod: 'Efectivo' })
  });
  const genericResponse = await request('/accounts/movements', seller, {
    method: 'POST',
    body: JSON.stringify({ ownerType: 'CLIENT', ownerId: client.id, type: 'RECHARGE', amount: 1000 })
  });

  assert.equal(legacyResponse.status, 403);
  assert.equal(directResponse.status, 403);
  assert.equal(genericResponse.status, 403);
  assert.equal(await AccountMovement.count(), 0);
});

test('un administrador puede cargar, descontar y corregir saldo con auditoría', async () => {
  const recharge = await request(`/clients/${client.id}/balance-movements`, admin, {
    method: 'POST',
    body: JSON.stringify({ operation: 'RECHARGE', amount: 2000, paymentMethod: 'Efectivo', notes: 'Carga inicial' })
  });
  const deduction = await request(`/clients/${client.id}/balance-movements`, admin, {
    method: 'POST',
    body: JSON.stringify({ operation: 'DEDUCTION', amount: 500, notes: 'Corrección de cobro' })
  });
  const adjustment = await request(`/clients/${client.id}/balance-movements`, admin, {
    method: 'POST',
    body: JSON.stringify({ operation: 'ADJUSTMENT', amount: 1000, notes: 'Saldo verificado' })
  });

  assert.equal(recharge.status, 201);
  assert.equal(deduction.status, 201);
  assert.equal(adjustment.status, 201);

  const account = await Account.findOne({ where: { ownerType: 'CLIENT', ownerId: client.id } });
  const movements = await AccountMovement.findAll({ where: { accountId: account.id }, order: [['createdAt', 'ASC']] });

  assert.equal(account.balance, 1000);
  assert.deepEqual(movements.map((movement) => movement.type), ['RECHARGE', 'DEDUCTION', 'ADJUSTMENT']);
  assert.deepEqual(movements.map((movement) => movement.delta), [2000, -500, -500]);
  assert.deepEqual(movements.map((movement) => movement.balanceAfter), [2000, 1500, 1000]);
  assert.ok(movements.every((movement) => movement.createdById === admin.id));
  assert.ok(movements.every((movement) => movement.createdAt instanceof Date));

  const clientHistoryResponse = await request('/client/me/balance', client);
  const clientHistory = await clientHistoryResponse.json();
  assert.equal(clientHistoryResponse.status, 200);
  assert.equal(clientHistory.account.balance, 1000);
  assert.equal(clientHistory.movements.length, 3);
  assert.equal(clientHistory.movements[0].createdBy.name, admin.name);
});

test('un descuento no puede dejar saldo negativo', async () => {
  const response = await request(`/clients/${client.id}/balance-movements`, admin, {
    method: 'POST',
    body: JSON.stringify({ operation: 'DEDUCTION', amount: 100 })
  });

  assert.equal(response.status, 400);
  assert.equal(await AccountMovement.count(), 0);
  const account = await Account.findOne({ where: { ownerType: 'CLIENT', ownerId: client.id } });
  assert.equal(Number(account?.balance || 0), 0);
});
