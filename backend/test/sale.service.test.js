const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SQLITE_PATH = ':memory:';
process.env.LOW_STOCK_THRESHOLD = '1';

const connectDB = require('../src/config/db');
const { sequelize } = require('../src/config/db');
const { User, Product, Sale, StockMovement, Account, AccountMovement } = require('../src/models');
const { createSale, listSales, updateSaleStatus } = require('../src/services/sale.service');
const { addMovement } = require('../src/services/account.service');

async function baseData() {
  const now = Date.now();
  const seller = await User.create({ name: 'Seller', email: `seller-${now}@x.com`, role: 'SELLER' });
  const client = await User.create({ name: 'Client', email: `client-${now}@x.com`, role: 'CLIENT' });
  const product = await Product.create({
    sku: `SKU-${now}`,
    name: 'Coca Cola',
    category: 'Bebidas',
    price: 100,
    cost: 60,
    stock: 20,
    delayDays: 0,
    isActive: true
  });
  return { seller, client, product };
}

test.before(async () => {
  await connectDB();
});

test.beforeEach(async () => {
  await sequelize.sync({ force: true });
});

test('consolida items repetidos del mismo producto', async () => {
  const { seller, product } = await baseData();

  const sale = await createSale({
    createdBy: seller.id,
    paymentMethod: 'CASH',
    status: 'PAID',
    discount: 0,
    items: [
      { productId: product.id, quantity: 2 },
      { productId: product.id, quantity: 3 }
    ]
  });

  assert.equal(sale.items.length, 1);
  assert.equal(sale.items[0].quantity, 5);

  const refreshed = await Product.findByPk(product.id);
  assert.equal(refreshed.stock, 15);
});

test('rechaza cantidades negativas o decimales', async () => {
  const { seller, product } = await baseData();

  await assert.rejects(
    createSale({
      createdBy: seller.id,
      paymentMethod: 'CASH',
      status: 'PAID',
      discount: 0,
      items: [{ productId: product.id, quantity: -4 }]
    }),
    /número entero/
  );
  await assert.rejects(
    createSale({
      createdBy: seller.id,
      paymentMethod: 'CASH',
      status: 'PAID',
      discount: 0,
      items: [{ productId: product.id, quantity: 1.5 }]
    }),
    /número entero/
  );

  assert.equal((await Product.findByPk(product.id)).stock, 20);
  assert.equal(await StockMovement.count(), 0);
});

test('filtra ventas por estado y cliente', async () => {
  const { seller, client, product } = await baseData();
  const otherClient = await User.create({ name: 'Other Client', email: `other-${Date.now()}@x.com`, role: 'CLIENT' });

  await createSale({
    createdBy: seller.id,
    clientId: client.id,
    paymentMethod: 'CASH',
    status: 'PENDING',
    discount: 0,
    items: [{ productId: product.id, quantity: 1 }]
  });
  await createSale({
    createdBy: seller.id,
    clientId: otherClient.id,
    paymentMethod: 'CASH',
    status: 'PENDING',
    discount: 0,
    items: [{ productId: product.id, quantity: 1 }]
  });
  await createSale({
    createdBy: seller.id,
    paymentMethod: 'CASH',
    status: 'PAID',
    discount: 0,
    items: [{ productId: product.id, quantity: 1 }]
  });

  const pendingForClient = await listSales({ status: 'pending', clientId: client.id });
  assert.equal(pendingForClient.length, 1);
  assert.equal(pendingForClient[0].status, 'PENDING');
  assert.equal(pendingForClient[0].client.id, client.id);

  const paidSales = await listSales({ status: 'PAID' });
  assert.equal(paidSales.length, 1);
  assert.equal(paidSales[0].status, 'PAID');
});

test('filtra ventas de un dia completo cuando desde y hasta son iguales', async () => {
  const { seller, product } = await baseData();

  const firstSale = await createSale({
    createdBy: seller.id,
    paymentMethod: 'CASH',
    status: 'PAID',
    discount: 0,
    items: [{ productId: product.id, quantity: 1 }]
  });
  const lastSale = await createSale({
    createdBy: seller.id,
    paymentMethod: 'CASH',
    status: 'PAID',
    discount: 0,
    items: [{ productId: product.id, quantity: 1 }]
  });
  const nextDaySale = await createSale({
    createdBy: seller.id,
    paymentMethod: 'CASH',
    status: 'PAID',
    discount: 0,
    items: [{ productId: product.id, quantity: 1 }]
  });

  await Sale.update({ createdAt: new Date(2026, 0, 15, 0, 0, 0, 0) }, { where: { id: firstSale.id } });
  await Sale.update({ createdAt: new Date(2026, 0, 15, 23, 59, 59, 999) }, { where: { id: lastSale.id } });
  await Sale.update({ createdAt: new Date(2026, 0, 16, 0, 0, 0, 0) }, { where: { id: nextDaySale.id } });

  const sales = await listSales({ dateFrom: '2026-01-15', dateTo: '2026-01-15' });
  const ids = sales.map((sale) => sale.id).sort();

  assert.deepEqual(ids, [firstSale.id, lastSale.id].sort());
});

test('filtra ventas por rango inclusivo y conserva filtros de estado y cliente', async () => {
  const { seller, client, product } = await baseData();
  const otherClient = await User.create({ name: 'Other Client', email: `range-other-${Date.now()}@x.com`, role: 'CLIENT' });

  const firstDaySale = await createSale({
    createdBy: seller.id,
    clientId: client.id,
    paymentMethod: 'CASH',
    status: 'PENDING',
    discount: 0,
    items: [{ productId: product.id, quantity: 1 }]
  });
  const lastDaySale = await createSale({
    createdBy: seller.id,
    clientId: client.id,
    paymentMethod: 'CASH',
    status: 'PENDING',
    discount: 0,
    items: [{ productId: product.id, quantity: 1 }]
  });
  const otherClientSale = await createSale({
    createdBy: seller.id,
    clientId: otherClient.id,
    paymentMethod: 'CASH',
    status: 'PENDING',
    discount: 0,
    items: [{ productId: product.id, quantity: 1 }]
  });
  const paidSale = await createSale({
    createdBy: seller.id,
    clientId: client.id,
    paymentMethod: 'CASH',
    status: 'PAID',
    discount: 0,
    items: [{ productId: product.id, quantity: 1 }]
  });

  await Sale.update({ createdAt: new Date(2026, 2, 10, 0, 0, 0, 0) }, { where: { id: firstDaySale.id } });
  await Sale.update({ createdAt: new Date(2026, 2, 12, 23, 59, 59, 999) }, { where: { id: lastDaySale.id } });
  await Sale.update({ createdAt: new Date(2026, 2, 11, 12, 0, 0, 0) }, { where: { id: otherClientSale.id } });
  await Sale.update({ createdAt: new Date(2026, 2, 11, 12, 0, 0, 0) }, { where: { id: paidSale.id } });

  const sales = await listSales({
    dateFrom: '2026-03-10',
    dateTo: '2026-03-12',
    status: 'PENDING',
    clientId: client.id
  });
  const ids = sales.map((sale) => sale.id).sort();

  assert.deepEqual(ids, [firstDaySale.id, lastDaySale.id].sort());
});

test('marca una venta pendiente como pagada y registra el cobro', async () => {
  const { seller, client, product } = await baseData();
  const sale = await createSale({
    createdBy: seller.id,
    clientId: client.id,
    paymentMethod: 'CASH',
    status: 'PENDING',
    discount: 0,
    items: [{ productId: product.id, quantity: 2 }]
  });

  const updated = await updateSaleStatus({ id: sale.id, status: 'paid', userId: seller.id });
  assert.equal(updated.status, 'PAID');
  assert.ok(updated.paidAt);

  const account = await Account.findOne({ where: { ownerType: 'CLIENT', ownerId: client.id } });
  assert.equal(account.balance, 0);

  const payment = await AccountMovement.findOne({ where: { type: 'PAYMENT', notes: `PAYMENT SALE ${sale.id}` } });
  assert.equal(payment.amount, sale.finalTotal);
});

test('rechaza cambios de estado invalidos', async () => {
  const { seller, product } = await baseData();
  const sale = await createSale({
    createdBy: seller.id,
    paymentMethod: 'CASH',
    status: 'PAID',
    discount: 0,
    items: [{ productId: product.id, quantity: 1 }]
  });

  await assert.rejects(updateSaleStatus({ id: sale.id, status: 'PENDING', userId: seller.id }), /Solo se puede marcar una venta como pagada/);
  await assert.rejects(updateSaleStatus({ id: sale.id, status: 'PAID', userId: seller.id }), /Solo se pueden cobrar ventas pendientes/);
});

test('permite pagar con saldo y registra consumo', async () => {
  const { seller, client, product } = await baseData();
  await addMovement({
    ownerType: 'CLIENT',
    ownerId: client.id,
    type: 'RECHARGE',
    amount: 500,
    createdBy: seller.id
  });

  const sale = await createSale({
    createdBy: seller.id,
    clientId: client.id,
    paymentMethod: 'BALANCE',
    status: 'PAID',
    discount: 0,
    items: [{ productId: product.id, quantity: 2 }]
  });

  assert.equal(sale.finalTotal, 200);

  const account = await Account.findOne({ where: { ownerType: 'CLIENT', ownerId: client.id } });
  assert.equal(account.balance, 300);

  const consumption = await AccountMovement.findOne({ where: { type: 'CONSUMPTION', notes: `CONSUMPTION SALE ${sale.id}` } });
  assert.equal(consumption.amount, 200);
  assert.equal(consumption.balanceAfter, 300);
});

test('rechaza pago con saldo insuficiente', async () => {
  const { seller, client, product } = await baseData();
  await addMovement({
    ownerType: 'CLIENT',
    ownerId: client.id,
    type: 'RECHARGE',
    amount: 50,
    createdBy: seller.id
  });

  await assert.rejects(
    createSale({
      createdBy: seller.id,
      clientId: client.id,
      paymentMethod: 'BALANCE',
      status: 'PAID',
      discount: 0,
      items: [{ productId: product.id, quantity: 1 }]
    }),
    /Saldo insuficiente/
  );

  const account = await Account.findOne({ where: { ownerType: 'CLIENT', ownerId: client.id } });
  assert.equal(account.balance, 50);
});
