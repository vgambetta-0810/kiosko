const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SQLITE_PATH = ':memory:';
process.env.LOW_STOCK_THRESHOLD = '1';

const connectDB = require('../src/config/db');
const { sequelize } = require('../src/config/db');
const { User, Product, StockMovement } = require('../src/models');
const { createSale } = require('../src/services/sale.service');

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

test('soporta cantidad negativa y devuelve stock con RETURN', async () => {
  const { seller, product } = await baseData();

  const sale = await createSale({
    createdBy: seller.id,
    paymentMethod: 'CASH',
    status: 'PAID',
    discount: 0,
    items: [{ productId: product.id, quantity: -4 }]
  });

  assert.equal(sale.items[0].quantity, -4);

  const refreshed = await Product.findByPk(product.id);
  assert.equal(refreshed.stock, 24);

  const movement = await StockMovement.findOne({ where: { referenceId: sale.id } });
  assert.equal(movement.type, 'RETURN');
  assert.equal(movement.quantity, 4);
});

test('elimina producto cuando suma neta queda en cero', async () => {
  const { seller, product } = await baseData();

  await assert.rejects(
    createSale({
      createdBy: seller.id,
      paymentMethod: 'CASH',
      status: 'PAID',
      discount: 0,
      items: [
        { productId: product.id, quantity: 5 },
        { productId: product.id, quantity: -5 }
      ]
    }),
    /Sale has no effective items/
  );
});
