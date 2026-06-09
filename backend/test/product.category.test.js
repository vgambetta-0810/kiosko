const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SQLITE_PATH = ':memory:';

const connectDB = require('../src/config/db');
const { sequelize } = require('../src/config/db');
const { Category, Product } = require('../src/models');
const productController = require('../src/controllers/product.controller');

const invokeController = async (controller, req) => {
  let responseBody;
  let responseStatus = 200;

  const res = {
    status(status) {
      responseStatus = status;
      return this;
    },
    json(payload) {
      responseBody = payload;
      return payload;
    }
  };

  await controller(req, res, (err) => {
    throw err;
  });

  return { body: responseBody, status: responseStatus };
};

const createProduct = (body) => invokeController(productController.create, { body });
const updateProduct = (id, body) => invokeController(productController.update, { params: { id }, body });
const lookupProduct = (q) => invokeController(productController.lookup, { query: { q } });

const productPayload = (name, category) => ({
  name,
  category,
  price: 150,
  cost: 100,
  stock: 5
});

test.before(async () => {
  await connectDB();
});

test.beforeEach(async () => {
  await sequelize.sync({ force: true });
});

test('crea un producto con una categoria existente', async () => {
  const category = await Category.create({ name: 'Bebidas' });
  const result = await createProduct({ ...productPayload('Agua', 'Bebidas'), categoryId: category.id });

  assert.equal(result.status, 201);
  assert.equal(result.body.categoryId, category.id);
  assert.equal(result.body.category, 'Bebidas');
  assert.equal(await Category.count(), 1);
});

test('crea un producto con categoria nueva y la reutiliza normalizada', async () => {
  const first = await createProduct(productPayload('Papas', '  Snacks   Salados '));
  const second = await createProduct(productPayload('Mani', 'snacks salados'));

  assert.equal(first.body.category, 'Snacks Salados');
  assert.equal(second.body.categoryId, first.body.categoryId);
  assert.equal(await Category.count(), 1);
  assert.equal(await Product.count(), 2);
});

test('crea productos con o sin codigo de barras sin generar sku', async () => {
  const withBarcode = await createProduct({ ...productPayload('Gaseosa', 'Bebidas'), codigoBarras: '  7791234567890  ' });
  const withoutBarcode = await createProduct(productPayload('Pan casero', 'Panificados'));

  assert.equal(withBarcode.body.codigoBarras, '7791234567890');
  assert.equal(withBarcode.body.sku, null);
  assert.equal(withoutBarcode.body.codigoBarras, null);
  assert.equal(withoutBarcode.body.sku, null);
});

test('rechaza codigos de barras duplicados y colisiones con sku legacy', async () => {
  await createProduct({ ...productPayload('Alfajor', 'Golosinas'), codigoBarras: 'ABC-123' });
  await Product.create({
    sku: 'LEGACY-456',
    name: 'Producto legacy',
    category: 'Otros',
    price: 10,
    cost: 5,
    stock: 1
  });

  await assert.rejects(
    createProduct({ ...productPayload('Otro alfajor', 'Golosinas'), codigoBarras: 'abc-123' }),
    /codigo de barras ya esta registrado/
  );
  await assert.rejects(
    createProduct({ ...productPayload('Colision legacy', 'Otros'), codigoBarras: 'legacy-456' }),
    /codigo de barras ya esta registrado/
  );
  await assert.rejects(
    createProduct({ ...productPayload('Cliente API antiguo', 'Otros'), sku: 'abc-123' }),
    /codigo de barras ya esta registrado/
  );
});

test('edita un producto legacy usando su sku previo como codigo de barras', async () => {
  const legacy = await Product.create({
    sku: 'LEGACY-789',
    name: 'Producto legacy',
    category: 'Otros',
    price: 10,
    cost: 5,
    stock: 1
  });

  const result = await updateProduct(legacy.id, { codigoBarras: legacy.sku });

  assert.equal(result.body.codigoBarras, 'LEGACY-789');
  assert.equal(result.body.sku, 'LEGACY-789');
});

test('busca un producto por codigo de barras sin distinguir mayusculas', async () => {
  const created = await createProduct({ ...productPayload('Yerba', 'Almacen'), codigoBarras: 'AbC-999' });
  const result = await lookupProduct('abc-999');

  assert.equal(result.body.items.length, 1);
  assert.equal(result.body.items[0].id, created.body.id);
});
