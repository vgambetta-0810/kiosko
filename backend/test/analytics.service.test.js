const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SQLITE_PATH = ':memory:';

const connectDB = require('../src/config/db');
const { sequelize } = require('../src/config/db');
const { Product, Sale, User } = require('../src/models');
const { getDashboardAnalytics } = require('../src/services/analytics.service');

const createBaseData = async () => {
  const suffix = Date.now();
  const seller = await User.create({ name: 'Seller', email: `analytics-seller-${suffix}@x.com`, role: 'SELLER' });
  const product = await Product.create({
    name: 'Alfajor',
    category: 'Golosinas',
    price: 100,
    cost: 60,
    stock: 20,
    isActive: true
  });

  return { seller, product };
};

const createSaleAt = async ({ seller, product, createdAt, total = 100 }) => {
  await Sale.create({
    sellerId: seller.id,
    items: [{ productId: product.id, quantity: 1, price: total }],
    total,
    discount: 0,
    finalTotal: total,
    paymentMethod: 'CASH',
    status: 'PAID',
    createdAt,
    updatedAt: createdAt
  });
};

test.before(async () => {
  await connectDB();
});

test.beforeEach(async () => {
  await sequelize.sync({ force: true });
});

test('el preset de 30 dias incluye desde fecha actual menos 30 dias', async () => {
  const { seller, product } = await createBaseData();
  const fromBoundary = new Date();
  fromBoundary.setDate(fromBoundary.getDate() - 30);
  fromBoundary.setHours(0, 0, 0, 0);

  const beforeBoundary = new Date(fromBoundary.getTime() - 1);

  await createSaleAt({ seller, product, createdAt: fromBoundary, total: 100 });
  await createSaleAt({ seller, product, createdAt: beforeBoundary, total: 200 });

  const analytics = await getDashboardAnalytics({ preset: 'month' });

  assert.equal(analytics.kpis.salesCount, 1);
  assert.equal(analytics.kpis.netSales, 100);
});
