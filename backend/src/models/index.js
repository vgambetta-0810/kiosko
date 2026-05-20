const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING },
  googleId: { type: DataTypes.STRING },
  role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'CLIENT' },
  parentId: { type: DataTypes.UUID, allowNull: true },
  age: { type: DataTypes.INTEGER },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const Product = sequelize.define('Product', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sku: { type: DataTypes.STRING, allowNull: true, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  cost: { type: DataTypes.FLOAT, allowNull: false },
  stock: { type: DataTypes.FLOAT, defaultValue: 0 },
  delayDays: { type: DataTypes.INTEGER, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const Supplier = sequelize.define('Supplier', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  address: { type: DataTypes.STRING },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const StockMovement = sequelize.define('StockMovement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.FLOAT, allowNull: false },
  reason: { type: DataTypes.STRING },
  referenceType: { type: DataTypes.STRING },
  referenceId: { type: DataTypes.UUID }
});

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.STRING, defaultValue: 'INFO' },
  read: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const Sale = sequelize.define('Sale', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  sellerId: { type: DataTypes.UUID, allowNull: false },
  clientId: { type: DataTypes.UUID, allowNull: true },
  items: { type: DataTypes.JSON, allowNull: false },
  total: { type: DataTypes.FLOAT, allowNull: false },
  discount: { type: DataTypes.FLOAT, defaultValue: 0 },
  finalTotal: { type: DataTypes.FLOAT, allowNull: false },
  paymentMethod: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'PAID' },
  deletedAt: { type: DataTypes.DATE, allowNull: true }
});

const Purchase = sequelize.define('Purchase', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  items: { type: DataTypes.JSON, allowNull: false },
  total: { type: DataTypes.FLOAT, allowNull: false }
});

const Reservation = sequelize.define('Reservation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  items: { type: DataTypes.JSON, allowNull: false },
  total: { type: DataTypes.FLOAT, allowNull: false },
  paidAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'ACTIVE' },
  notifiedExpired: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const Account = sequelize.define(
  'Account',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ownerType: { type: DataTypes.STRING, allowNull: false },
    ownerId: { type: DataTypes.UUID, allowNull: false },
    balance: { type: DataTypes.FLOAT, defaultValue: 0 }
  },
  { indexes: [{ unique: true, fields: ['ownerType', 'ownerId'] }] }
);

const AccountMovement = sequelize.define('AccountMovement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'CONFIRMED' },
  notes: { type: DataTypes.STRING }
});

User.belongsTo(User, { as: 'parent', foreignKey: 'parentId' });
StockMovement.belongsTo(Product, { as: 'product', foreignKey: 'productId' });
StockMovement.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });
Notification.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Sale.belongsTo(User, { as: 'seller', foreignKey: 'sellerId' });
Sale.belongsTo(User, { as: 'client', foreignKey: 'clientId' });
Purchase.belongsTo(Supplier, { as: 'supplier', foreignKey: 'supplierId' });
Purchase.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });
Reservation.belongsTo(User, { as: 'client', foreignKey: 'clientId' });
AccountMovement.belongsTo(Account, { as: 'account', foreignKey: 'accountId' });
AccountMovement.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });

module.exports = {
  Op,
  User,
  Product,
  Supplier,
  StockMovement,
  Notification,
  Sale,
  Purchase,
  Reservation,
  Account,
  AccountMovement
};
