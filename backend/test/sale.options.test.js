const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SQLITE_PATH = ':memory:';

const connectDB = require('../src/config/db');
const { sequelize } = require('../src/config/db');
const { SaleOption, User, Product } = require('../src/models');
const saleController = require('../src/controllers/sale.controller');
const { createSale } = require('../src/services/sale.service');
const { KINDS, createSaleOption } = require('../src/utils/saleOptions');

const invokeController = async (controller, req) => {
  let body;
  let status = 200;
  const res = {
    status(value) {
      status = value;
      return this;
    },
    json(value) {
      body = value;
      return value;
    }
  };

  await controller(req, res, (error) => {
    throw error;
  });
  return { body, status };
};

test.before(async () => {
  await connectDB();
});

test.beforeEach(async () => {
  await sequelize.sync({ force: true });
});

test('normaliza y reutiliza métodos de pago duplicados', async () => {
  const first = await createSaleOption({ kind: KINDS.PAYMENT_METHOD, name: '  Billetera   virtual ' });
  const duplicate = await createSaleOption({ kind: KINDS.PAYMENT_METHOD, name: 'billetera virtual' });

  assert.equal(first.id, duplicate.id);
  assert.equal(first.name, 'Billetera virtual');
  assert.equal(
    await SaleOption.count({ where: { kind: KINDS.PAYMENT_METHOD, normalizedName: 'billetera virtual' } }),
    1
  );
});

test('crea clientes normalizados sin duplicarlos', async () => {
  const first = await invokeController(saleController.createClient, { body: { name: '  María   Pérez ' } });
  const duplicate = await invokeController(saleController.createClient, { body: { name: 'maría pérez' } });
  await User.update({ isActive: false }, { where: { id: first.body.id } });
  const reactivated = await invokeController(saleController.createClient, { body: { name: ' MARÍA PÉREZ ' } });
  const concurrent = await Promise.all([
    invokeController(saleController.createClient, { body: { name: 'Juan López' } }),
    invokeController(saleController.createClient, { body: { name: '  juan   lópez ' } })
  ]);

  assert.equal(first.status, 201);
  assert.equal(duplicate.status, 200);
  assert.equal(first.body.id, duplicate.body.id);
  assert.equal(first.body.id, reactivated.body.id);
  assert.equal((await User.findByPk(first.body.id)).isActive, true);
  assert.equal(concurrent[0].body.id, concurrent[1].body.id);
  assert.equal(await User.count({ where: { role: 'CLIENT' } }), 2);
});

test('un tipo de venta fiado personalizado exige cliente', async () => {
  const saleType = await createSaleOption({ kind: KINDS.SALE_TYPE, name: 'Cuenta corriente' });
  const seller = await User.create({ name: 'Seller', email: 'seller@test.local', role: 'SELLER' });
  const client = await User.create({ name: 'Client', email: 'client@test.local', role: 'CLIENT' });
  const product = await Product.create({
    name: 'Gaseosa',
    category: 'Bebidas',
    price: 100,
    cost: 60,
    stock: 5
  });

  assert.equal(saleType.requiresClient, true);
  await assert.rejects(
    createSale({
      createdBy: seller.id,
      paymentMethod: 'CASH',
      status: saleType.code,
      items: [{ productId: product.id, quantity: 1 }]
    }),
    /cliente es obligatorio/i
  );

  const sale = await createSale({
    createdBy: seller.id,
    clientId: client.id,
    paymentMethod: 'CASH',
    status: saleType.code,
    items: [{ productId: product.id, quantity: 1 }]
  });
  assert.equal(sale.clientId, client.id);
});
