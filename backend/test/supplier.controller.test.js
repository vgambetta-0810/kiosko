const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SQLITE_PATH = ':memory:';

const connectDB = require('../src/config/db');
const { sequelize } = require('../src/config/db');
const { Supplier } = require('../src/models');
const supplierController = require('../src/controllers/supplier.controller');

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

test('busca proveedores activos por razon social, CUIT, email y telefono', async () => {
  await Supplier.bulkCreate([
    {
      name: 'La Central',
      normalizedName: 'la central',
      businessName: 'Central Escolar SA',
      cuit: '30711222333',
      email: 'ventas@central.test',
      phone: '1144556677',
      isActive: true
    },
    {
      name: 'Proveedor inactivo',
      normalizedName: 'proveedor inactivo',
      businessName: 'Central Escolar Norte',
      isActive: false
    }
  ]);

  const byBusinessName = await invokeController(supplierController.list, { query: { search: 'escolar', active: 'true' } });
  const byCuit = await invokeController(supplierController.list, { query: { search: '30-711222333', active: 'true' } });
  const byEmail = await invokeController(supplierController.list, { query: { search: 'ventas@central', active: 'true' } });
  const byPhone = await invokeController(supplierController.list, { query: { search: '4455', active: 'true' } });

  assert.deepEqual(byBusinessName.body.map((supplier) => supplier.name), ['La Central']);
  assert.deepEqual(byCuit.body.map((supplier) => supplier.name), ['La Central']);
  assert.deepEqual(byEmail.body.map((supplier) => supplier.name), ['La Central']);
  assert.deepEqual(byPhone.body.map((supplier) => supplier.name), ['La Central']);
});

test('evita duplicados por nombre o razon social normalizados', async () => {
  await invokeController(supplierController.create, {
    body: { name: 'Distribuidora Escolar', businessName: 'Escolar SRL' }
  });

  await assert.rejects(
    invokeController(supplierController.create, {
      body: { name: 'Otro proveedor', businessName: '  distribuidora   escolar ' }
    }),
    /Ya existe un proveedor/
  );
});
