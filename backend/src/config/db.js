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
};

const connectDB = async () => {
  await sequelize.authenticate();
  await sequelize.sync();
  await ensureSchema();
  console.log('SQLite connected');
};

module.exports = connectDB;
module.exports.sequelize = sequelize;
