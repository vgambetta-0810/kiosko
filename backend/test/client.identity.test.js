const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

process.env.SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-secret';
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://127.0.0.1/auth/google/callback';

const connectDB = require('../src/config/db');
const { sequelize } = require('../src/config/db');
const { User, Account, AccountMovement, ClientMergeAudit, Notification, Reservation, Sale } = require('../src/models');
const clientService = require('../src/services/client.service');
const authService = require('../src/services/auth.service');
const { addMovement } = require('../src/services/account.service');

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
  assert.equal(result.user.password, undefined);
  assert.equal(result.user.hasPassword, true);
  assert.equal(await User.count({ where: { role: 'CLIENT' } }), 1);
  assert.equal(await Sale.count({ where: { clientId: client.id } }), 1);
});

test('un administrador vincula y fusiona una cuenta cliente duplicada sin perder historial', async () => {
  const admin = await User.create({ name: 'Admin', email: 'admin@test.com', role: 'ADMIN' });
  const seller = await User.create({ name: 'Seller', email: 'seller3@test.com', role: 'SELLER' });
  const manualClient = await clientService.createClient({ name: 'Valen', phone: '555' });
  const registeredClient = await User.create({
    name: 'Valentina',
    email: 'valen@test.com',
    role: 'CLIENT',
    password: await bcrypt.hash('secret123', 10)
  });

  await addMovement({ ownerType: 'CLIENT', ownerId: manualClient.id, type: 'RECHARGE', amount: 1000, createdBy: admin.id });
  await addMovement({ ownerType: 'CLIENT', ownerId: registeredClient.id, type: 'RECHARGE', amount: 500, createdBy: admin.id });
  await Reservation.create({
    clientId: registeredClient.id,
    items: [],
    total: 0,
    paidAmount: 0,
    expiresAt: new Date(),
    status: 'ACTIVE'
  });
  await Sale.create({
    sellerId: seller.id,
    clientId: registeredClient.id,
    items: [],
    total: 0,
    finalTotal: 0,
    paymentMethod: 'CASH',
    status: 'PAID'
  });
  await Notification.create({ userId: registeredClient.id, title: 'Aviso', message: 'Mensaje', type: 'INFO' });

  const candidates = await clientService.getLinkCandidates({ clientId: manualClient.id });
  assert.equal(candidates.candidates[0].id, registeredClient.id);
  assert.equal(candidates.candidates[0].suggested, true);

  const linked = await clientService.linkUserAccount({
    clientId: manualClient.id,
    userId: registeredClient.id,
    mergeClientId: registeredClient.id,
    adminId: admin.id
  });

  assert.equal(linked.id, manualClient.id);
  assert.equal(linked.email, 'valen@test.com');
  assert.equal(linked.hasAccessAccount, true);
  assert.equal(linked.balance, 1500);
  assert.equal(await User.count({ where: { role: 'CLIENT', mergedIntoClientId: null } }), 1);
  assert.equal(await Reservation.count({ where: { clientId: manualClient.id } }), 1);
  assert.equal(await Sale.count({ where: { clientId: manualClient.id } }), 1);
  assert.equal(await Notification.count({ where: { userId: manualClient.id } }), 1);

  const finalAccount = await Account.findOne({ where: { ownerType: 'CLIENT', ownerId: manualClient.id } });
  assert.equal(finalAccount.balance, 1500);
  assert.equal(await Account.count({ where: { ownerType: 'CLIENT' } }), 1);
  assert.equal(await AccountMovement.count({ where: { accountId: finalAccount.id } }), 2);
  assert.equal(await ClientMergeAudit.count({ where: { finalClientId: manualClient.id, linkedUserId: registeredClient.id, adminId: admin.id } }), 1);

  const oldDuplicate = await User.findByPk(registeredClient.id);
  assert.equal(oldDuplicate.isActive, false);
  assert.equal(oldDuplicate.mergedIntoClientId, manualClient.id);

  const login = await authService.login({ email: 'valen@test.com', password: 'secret123' });
  assert.equal(login.user.id, manualClient.id);
});
