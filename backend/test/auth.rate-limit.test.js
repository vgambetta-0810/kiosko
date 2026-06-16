const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

process.env.SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.LOGIN_RATE_LIMIT_MAX = '2';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-secret';
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://127.0.0.1/auth/google/callback';

const app = require('../src/app');
const connectDB = require('../src/config/db');
const { sequelize } = require('../src/config/db');
const { User } = require('../src/models');

let server;
let baseUrl;

const postLogin = (password = '123456') =>
  fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password })
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
  await User.create({
    name: 'Admin',
    email: 'admin@test.com',
    password: await bcrypt.hash('123456', 10),
    role: 'ADMIN'
  });
});

test('los logins exitosos repetidos no consumen el limite de intentos', async () => {
  const responses = [];

  for (let index = 0; index < 4; index += 1) {
    responses.push(await postLogin());
  }

  assert.deepEqual(
    responses.map((response) => response.status),
    [200, 200, 200, 200]
  );

  const tokens = await Promise.all(responses.map(async (response) => (await response.json()).token));
  assert.equal(new Set(tokens).size, tokens.length);
});

test('los intentos fallidos siguen limitados', async () => {
  const responses = [];

  for (let index = 0; index < 3; index += 1) {
    responses.push(await postLogin('wrong-password'));
  }

  assert.deepEqual(
    responses.map((response) => response.status),
    [401, 401, 429]
  );
});
