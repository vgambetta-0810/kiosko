const path = require('path');
const { Sequelize } = require('sequelize');

const storage = process.env.SQLITE_PATH || path.join(__dirname, '../../data.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: false
});

const ensureSchema = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const productsTable = await queryInterface.describeTable('Products');

  if (!productsTable.sku) {
    await queryInterface.addColumn('Products', 'sku', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addIndex('Products', ['sku'], {
      unique: true,
      where: {
        sku: {
          [Sequelize.Op.ne]: null
        }
      }
    });
  }

  if (!productsTable.categoryId) {
    await queryInterface.addColumn('Products', 'categoryId', {
      type: Sequelize.UUID,
      allowNull: true
    });
  }

  if (!productsTable.codigoBarras) {
    await queryInterface.addColumn('Products', 'codigoBarras', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }

  const salesTable = await queryInterface.describeTable('Sales');
  if (!salesTable.paidAt) {
    await queryInterface.addColumn('Sales', 'paidAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  }

  const productIndexes = await queryInterface.showIndex('Products');
  if (!productIndexes.some((index) => index.name === 'products_codigo_barras')) {
    try {
      await queryInterface.addIndex('Products', ['codigoBarras'], {
        name: 'products_codigo_barras',
        unique: true,
        where: {
          codigoBarras: {
            [Sequelize.Op.ne]: null
          }
        }
      });
    } catch (err) {
      if (!/unique constraint/i.test(err.message)) throw err;
      console.warn('No se pudo crear el indice unico de codigo de barras porque existen duplicados previos');
    }
  }

  const usersTable = await queryInterface.describeTable('Users');
  if (!usersTable.phone) {
    await queryInterface.addColumn('Users', 'phone', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }

  if (!usersTable.cardId) {
    await queryInterface.addColumn('Users', 'cardId', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }

  const accountMovementsTable = await queryInterface.describeTable('AccountMovements');
  if (!accountMovementsTable.balanceAfter) {
    await queryInterface.addColumn('AccountMovements', 'balanceAfter', {
      type: Sequelize.FLOAT,
      allowNull: true
    });
  }

  const addMissingColumns = async (tableName, definitions) => {
    const table = await queryInterface.describeTable(tableName);
    for (const [name, definition] of Object.entries(definitions)) {
      if (!table[name]) await queryInterface.addColumn(tableName, name, definition);
    }
  };

  await addMissingColumns('Suppliers', {
    normalizedName: { type: Sequelize.STRING, allowNull: true },
    businessName: { type: Sequelize.STRING, allowNull: true },
    cuit: { type: Sequelize.STRING, allowNull: true },
    notes: { type: Sequelize.TEXT, allowNull: true }
  });

  await sequelize.query(
    `UPDATE Suppliers SET normalizedName = lower(trim(name)) WHERE normalizedName IS NULL OR normalizedName = ''`
  );

  await addMissingColumns('Purchases', {
    status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'DRAFT' },
    purchaseDate: { type: Sequelize.DATE, allowNull: true },
    notes: { type: Sequelize.TEXT, allowNull: true },
    confirmedAt: { type: Sequelize.DATE, allowNull: true },
    cancelledAt: { type: Sequelize.DATE, allowNull: true }
  });

  await addMissingColumns('StockMovements', {
    stockBefore: { type: Sequelize.FLOAT, allowNull: true },
    stockAfter: { type: Sequelize.FLOAT, allowNull: true },
    supplierId: { type: Sequelize.UUID, allowNull: true },
    note: { type: Sequelize.TEXT, allowNull: true }
  });
};

const connectDB = async () => {
  await sequelize.authenticate();
  await sequelize.sync();
  await ensureSchema();
  console.log('SQLite connected');
};

module.exports = connectDB;
module.exports.sequelize = sequelize;
