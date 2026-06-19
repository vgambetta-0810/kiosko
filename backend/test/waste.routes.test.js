const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'waste-route-test-secret';
process.env.API_RATE_LIMIT_MAX = '100';
process.env.LOW_STOCK_THRESHOLD = '0';
process.env.GOOGLE_CLIENT_ID = 'waste-route-google-client';
process.env.GOOGLE_CLIENT_SECRET = 'waste-route-google-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://127.0.0.1/auth/google/callback';

const app = require('../src/app');
const connectDB = require('../src/config/db');
const { sequelize } = require('../src/config/db');
const { User, Product, StockMovement } = require('../src/models');
const { signToken } = require('../src/utils/jwt');

let server;
let baseUrl;
let admin;
let client;
let product;

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
  admin = await User.create({ name: 'Admin', email: 'admin-waste-route@test.com', role: 'ADMIN' });
  client = await User.create({ name: 'Cliente', email: 'client-waste-route@test.com', role: 'CLIENT' });
  product = await Product.create({
    name: 'Jugo',
    category: 'Bebidas',
    price: 1000,
    cost: 500,
    stock: 5,
    isActive: true
  });
});

test('solo administradores pueden ver y crear mermas', async () => {
  const clientList = await request('/waste', client);
  const clientCreate = await request('/waste', client, {
    method: 'POST',
    body: JSON.stringify({
      requestId: crypto.randomUUID(),
      productId: product.id,
      quantity: 1,
      reason: 'THEFT',
      date: new Date().toISOString()
    })
  });
  const adminCreate = await request('/waste', admin, {
    method: 'POST',
    body: JSON.stringify({
      requestId: crypto.randomUUID(),
      productId: product.id,
      quantity: 1,
      reason: 'THEFT',
      date: new Date().toISOString()
    })
  });

  assert.equal(clientList.status, 403);
  assert.equal(clientCreate.status, 403);
  assert.equal(adminCreate.status, 201);
  assert.equal((await Product.findByPk(product.id)).stock, 4);
});

test('la API conserva la fecha y hora elegidas y rechaza fechas futuras', async () => {
  const selectedDate = '2025-06-19T21:30:00.000Z';
  const created = await request('/waste', admin, {
    method: 'POST',
    body: JSON.stringify({
      requestId: crypto.randomUUID(),
      productId: product.id,
      quantity: 1,
      reason: 'BROKEN',
      date: selectedDate
    })
  });
  const waste = await created.json();
  const movement = await StockMovement.findOne({ where: { referenceId: waste.id } });
  const future = await request('/waste', admin, {
    method: 'POST',
    body: JSON.stringify({
      requestId: crypto.randomUUID(),
      productId: product.id,
      quantity: 1,
      reason: 'LOSS',
      date: new Date(Date.now() + 60_000).toISOString()
    })
  });

  assert.equal(created.status, 201);
  assert.equal(new Date(waste.date).toISOString(), selectedDate);
  assert.equal(movement.createdAt.toISOString(), selectedDate);
  assert.equal(future.status, 400);
  assert.equal((await Product.findByPk(product.id)).stock, 4);
});
