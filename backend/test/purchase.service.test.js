const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SQLITE_PATH = ':memory:';
process.env.LOW_STOCK_THRESHOLD = '0';

const connectDB = require('../src/config/db');
const { sequelize } = require('../src/config/db');
const { User, Product, Supplier, ProductSupplier, StockMovement } = require('../src/models');
const { createPurchase, confirmPurchase, cancelPurchase } = require('../src/services/purchase.service');

test.before(async () => {
  await connectDB();
});

test.beforeEach(async () => {
  await sequelize.sync({ force: true });
});

async function baseData() {
  const suffix = Date.now();
  const admin = await User.create({ name: 'Admin', email: `admin-purchase-${suffix}@x.com`, role: 'ADMIN' });
  const supplier = await Supplier.create({
    name: 'Distribuidora Escolar',
    normalizedName: 'distribuidora escolar',
    isActive: true
  });
  const product = await Product.create({
    name: 'Alfajor',
    category: 'Golosinas',
    price: 100,
    cost: 50,
    stock: 4,
    isActive: true
  });
  return { admin, supplier, product };
}

test('guardar un borrador no modifica stock ni crea movimientos', async () => {
  const { admin, supplier, product } = await baseData();
  const purchase = await createPurchase({
    supplierId: supplier.id,
    createdBy: admin.id,
    items: [{ productId: product.id, quantity: 6, unitCost: 55 }]
  });

  assert.equal(purchase.status, 'DRAFT');
  assert.equal((await Product.findByPk(product.id)).stock, 4);
  assert.equal(await StockMovement.count(), 0);
});

test('confirmar aumenta stock, actualiza costo y registra la relación proveedor-producto', async () => {
  const { admin, supplier, product } = await baseData();
  const purchase = await createPurchase({
    supplierId: supplier.id,
    createdBy: admin.id,
    items: [{ productId: product.id, quantity: 6, unitCost: 55 }]
  });

  const confirmed = await confirmPurchase({ id: purchase.id, userId: admin.id });
  const refreshed = await Product.findByPk(product.id);
  const movement = await StockMovement.findOne({ where: { referenceId: purchase.id } });
  const link = await ProductSupplier.findOne({ where: { productId: product.id, supplierId: supplier.id } });

  assert.equal(confirmed.status, 'CONFIRMED');
  assert.equal(refreshed.stock, 10);
  assert.equal(refreshed.cost, 55);
  assert.equal(movement.reason, 'PURCHASE');
  assert.equal(movement.stockBefore, 4);
  assert.equal(movement.stockAfter, 10);
  assert.equal(link.lastCost, 55);
});

test('una compra confirmada no puede confirmarse dos veces', async () => {
  const { admin, supplier, product } = await baseData();
  const purchase = await createPurchase({
    supplierId: supplier.id,
    createdBy: admin.id,
    items: [{ productId: product.id, quantity: 2, unitCost: 55 }]
  });
  await confirmPurchase({ id: purchase.id, userId: admin.id });

  await assert.rejects(
    confirmPurchase({ id: purchase.id, userId: admin.id }),
    /ya fue confirmada/
  );
  assert.equal((await Product.findByPk(product.id)).stock, 6);
  assert.equal(await StockMovement.count({ where: { referenceId: purchase.id } }), 1);
});

test('una compra confirmada no se anula sin una reversa explícita', async () => {
  const { admin, supplier, product } = await baseData();
  const purchase = await createPurchase({
    supplierId: supplier.id,
    createdBy: admin.id,
    items: [{ productId: product.id, quantity: 1, unitCost: 55 }],
    status: 'CONFIRMED'
  });

  await assert.rejects(cancelPurchase({ id: purchase.id }), /requiere una reversa/);
});
