const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SQLITE_PATH = ':memory:';
process.env.LOW_STOCK_THRESHOLD = '0';

const connectDB = require('../src/config/db');
const { sequelize } = require('../src/config/db');
const { User, Product, Waste, StockMovement } = require('../src/models');
const { createWaste } = require('../src/services/waste.service');

test.before(async () => {
  await connectDB();
});

test.beforeEach(async () => {
  await sequelize.sync({ force: true });
});

async function baseData() {
  const suffix = `${Date.now()}-${Math.random()}`;
  const admin = await User.create({ name: 'Admin', email: `admin-waste-${suffix}@x.com`, role: 'ADMIN' });
  const product = await Product.create({
    name: 'Yogur',
    category: 'Lácteos',
    price: 1200,
    cost: 700,
    stock: 10,
    isActive: true
  });
  return { admin, product };
}

test('crear merma descuenta stock, calcula el valor perdido y genera movimiento trazable', async () => {
  const { admin, product } = await baseData();
  const date = new Date(Date.now() - 60_000);
  const waste = await createWaste({
    requestId: crypto.randomUUID(),
    productId: product.id,
    quantity: 3,
    reason: 'EXPIRED',
    note: 'Cadena de frío interrumpida',
    date,
    createdBy: admin.id
  });

  const updatedProduct = await Product.findByPk(product.id);
  const movement = await StockMovement.findOne({ where: { referenceId: waste.id } });

  assert.equal(updatedProduct.stock, 7);
  assert.equal(waste.previousStock, 10);
  assert.equal(waste.newStock, 7);
  assert.equal(waste.unitCost, 700);
  assert.equal(waste.totalCost, 2100);
  assert.equal(movement.type, 'WASTE');
  assert.equal(movement.quantity, -3);
  assert.equal(movement.stockBefore, 10);
  assert.equal(movement.stockAfter, 7);
  assert.equal(movement.reason, 'EXPIRED');
  assert.equal(movement.note, 'Cadena de frío interrumpida');
  assert.equal(movement.createdById, admin.id);
  assert.equal(waste.date.toISOString(), date.toISOString());
  assert.equal(movement.createdAt.toISOString(), date.toISOString());
});

test('conserva una hora específica en la merma y en su movimiento', async () => {
  const { admin, product } = await baseData();
  const date = new Date('2025-06-19T21:30:00.000Z');

  const waste = await createWaste({
    requestId: crypto.randomUUID(),
    productId: product.id,
    quantity: 1,
    reason: 'BROKEN',
    date,
    createdBy: admin.id
  });
  const movement = await StockMovement.findOne({ where: { referenceId: waste.id } });

  assert.equal(waste.date.toISOString(), '2025-06-19T21:30:00.000Z');
  assert.equal(movement.createdAt.toISOString(), '2025-06-19T21:30:00.000Z');
  assert.equal((await Product.findByPk(product.id)).stock, 9);
});

test('rechaza fechas inválidas o futuras sin modificar inventario', async () => {
  const { admin, product } = await baseData();
  const basePayload = {
    productId: product.id,
    quantity: 1,
    reason: 'LOSS',
    createdBy: admin.id
  };

  await assert.rejects(
    createWaste({ ...basePayload, requestId: crypto.randomUUID(), date: 'fecha-invalida' }),
    /no es válida/
  );
  await assert.rejects(
    createWaste({ ...basePayload, requestId: crypto.randomUUID(), date: new Date(Date.now() + 60_000) }),
    /no puede ser futura/
  );

  assert.equal((await Product.findByPk(product.id)).stock, 10);
  assert.equal(await Waste.count(), 0);
  assert.equal(await StockMovement.count(), 0);
});

test('rechaza una merma mayor al stock disponible sin modificar inventario', async () => {
  const { admin, product } = await baseData();

  await assert.rejects(
    createWaste({
      requestId: crypto.randomUUID(),
      productId: product.id,
      quantity: 11,
      reason: 'THEFT',
      date: new Date(),
      createdBy: admin.id
    }),
    /supera el stock disponible/
  );

  assert.equal((await Product.findByPk(product.id)).stock, 10);
  assert.equal(await Waste.count(), 0);
  assert.equal(await StockMovement.count(), 0);
});

test('un reintento con el mismo requestId no descuenta stock dos veces', async () => {
  const { admin, product } = await baseData();
  const requestId = crypto.randomUUID();
  const payload = {
    requestId,
    productId: product.id,
    quantity: 2,
    reason: 'BROKEN',
    date: new Date(),
    createdBy: admin.id
  };

  const first = await createWaste(payload);
  const repeated = await createWaste(payload);

  assert.equal(first.id, repeated.id);
  assert.equal((await Product.findByPk(product.id)).stock, 8);
  assert.equal(await Waste.count(), 1);
  assert.equal(await StockMovement.count(), 1);
});
