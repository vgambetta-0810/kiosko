const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SQLITE_PATH = ':memory:';

const connectDB = require('../src/config/db');
const { sequelize } = require('../src/config/db');
const { Category } = require('../src/models');
const { findOrCreateCategory, normalizeCategoryName } = require('../src/utils/categories');

test.before(async () => {
  await connectDB();
});

test.beforeEach(async () => {
  await sequelize.sync({ force: true });
});

test('normaliza espacios y evita categorias duplicadas por mayusculas', async () => {
  const [created, reused] = await Promise.all([
    findOrCreateCategory('  Bebidas   Frias  '),
    findOrCreateCategory('bebidas frias')
  ]);

  assert.equal(created.name, 'Bebidas Frias');
  assert.equal(reused.id, created.id);
  assert.equal(await Category.count(), 1);
});

test('no normaliza una categoria vacia a un nombre valido', () => {
  assert.equal(normalizeCategoryName('   '), '');
});
