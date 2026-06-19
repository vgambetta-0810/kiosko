const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-secret';
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://127.0.0.1/auth/google/callback';

const connectDB = require('../src/config/db');
const { sequelize } = require('../src/config/db');
const { User, Sale } = require('../src/models');
const clientService = require('../src/services/client.service');
const authService = require('../src/services/auth.service');

test.before(async () => {
  await connectDB();
});

test.beforeEach(async () => {
  await sequelize.sync({ force: true });
});

test('detecta coincidencias al crear cliente y permite vincular con ventas previas', async () => {
  const seller = await User.create({ name: 'Seller', email: 'seller@test.com', role: 'SELLER' });
  const registered = await User.create({ name: 'Pedro Gomez', email: 'pedro@test.com', role: 'CLIENT', password: 'hash' });
  await Sale.create({
    sellerId: seller.id,
    clientId: registered.id,
    items: [],
    total: 0,
    finalTotal: 0,
    paymentMethod: 'CASH',
    status: 'PAID'
  });

  await assert.rejects(
    clientService.createClient({ name: 'Pedro Gomez', email: 'pedro@test.com', phone: '123' }),
    (error) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.details.code, 'CLIENT_IDENTITY_MATCH');
      assert.equal(error.details.matches[0].id, registered.id);
      assert.equal(error.details.matches[0].salesCount, 1);
      return true;
    }
  );

  const linked = await clientService.createClient({
    name: 'Pedro Gomez',
    email: 'pedro@test.com',
    phone: '123',
    duplicateAction: 'link',
    linkClientId: registered.id
  });

  assert.equal(linked.id, registered.id);
  assert.equal(linked.phone, '123');
  assert.equal(await User.count({ where: { role: 'CLIENT' } }), 1);
});

test('vincula un registro propio a un cliente creado por administrador sin duplicar identidad', async () => {
  const client = await clientService.createClient({ name: 'Laura Perez', phone: '555' });
  const seller = await User.create({ name: 'Seller', email: 'seller2@test.com', role: 'SELLER' });
  await Sale.create({
    sellerId: seller.id,
    clientId: client.id,
    items: [],
    total: 0,
    finalTotal: 0,
    paymentMethod: 'CASH',
    status: 'PAID'
  });

  await assert.rejects(
    authService.register({ name: 'Laura Perez', email: 'laura@test.com', password: 'secret123', role: 'CLIENT' }),
    (error) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.details.matches[0].id, client.id);
      return true;
    }
  );

  const result = await authService.register({
    name: 'Laura Perez',
    email: 'laura@test.com',
    password: 'secret123',
    role: 'CLIENT',
    linkClientId: client.id
  });

  assert.equal(result.user.id, client.id);
  assert.equal(result.user.email, 'laura@test.com');
  assert.ok(result.user.password);
  assert.equal(await User.count({ where: { role: 'CLIENT' } }), 1);
  assert.equal(await Sale.count({ where: { clientId: client.id } }), 1);
});
