const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  phone: { type: DataTypes.STRING },
  cardId: { type: DataTypes.STRING },
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
  codigoBarras: { type: DataTypes.STRING, allowNull: true, unique: true },
  category: { type: DataTypes.STRING, allowNull: false },
  categoryId: { type: DataTypes.UUID, allowNull: true },
  price: { type: DataTypes.FLOAT, allowNull: false },
  cost: { type: DataTypes.FLOAT, allowNull: false },
  stock: { type: DataTypes.FLOAT, defaultValue: 0 },
  delayDays: { type: DataTypes.INTEGER, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const Category = sequelize.define('Category', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true }
});

const Supplier = sequelize.define('Supplier', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  normalizedName: { type: DataTypes.STRING, allowNull: false, unique: true },
  businessName: { type: DataTypes.STRING },
  cuit: { type: DataTypes.STRING, unique: true },
  email: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  address: { type: DataTypes.STRING },
  notes: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const StockMovement = sequelize.define('StockMovement', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.FLOAT, allowNull: false },
  reason: { type: DataTypes.STRING },
  note: { type: DataTypes.TEXT },
  referenceType: { type: DataTypes.STRING },
  referenceId: { type: DataTypes.UUID },
  stockBefore: { type: DataTypes.FLOAT },
  stockAfter: { type: DataTypes.FLOAT }
});

const Waste = sequelize.define('Waste', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  requestId: { type: DataTypes.UUID, allowNull: false, unique: true },
  quantity: { type: DataTypes.FLOAT, allowNull: false },
  reason: { type: DataTypes.STRING, allowNull: false },
  note: { type: DataTypes.TEXT },
  unitCost: { type: DataTypes.FLOAT, allowNull: false },
  totalCost: { type: DataTypes.FLOAT, allowNull: false },
  previousStock: { type: DataTypes.FLOAT, allowNull: false },
  newStock: { type: DataTypes.FLOAT, allowNull: false },
  date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'ACTIVE' }
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
  paidAt: { type: DataTypes.DATE, allowNull: true },
  deletedAt: { type: DataTypes.DATE, allowNull: true }
});

const SaleOption = sequelize.define(
  'SaleOption',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    kind: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    normalizedName: { type: DataTypes.STRING, allowNull: false },
    requiresClient: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  },
  {
    indexes: [
      { unique: true, fields: ['kind', 'code'] },
      { unique: true, fields: ['kind', 'normalizedName'] }
    ]
  }
);

const Purchase = sequelize.define('Purchase', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  items: { type: DataTypes.JSON, allowNull: true },
  total: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'DRAFT' },
  purchaseDate: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  notes: { type: DataTypes.TEXT },
  confirmedAt: { type: DataTypes.DATE },
  cancelledAt: { type: DataTypes.DATE }
});

const PurchaseItem = sequelize.define('PurchaseItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  quantity: { type: DataTypes.FLOAT, allowNull: false },
  unitCost: { type: DataTypes.FLOAT, allowNull: false },
  subtotal: { type: DataTypes.FLOAT, allowNull: false }
});

const ProductSupplier = sequelize.define(
  'ProductSupplier',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    supplierSku: { type: DataTypes.STRING },
    lastCost: { type: DataTypes.FLOAT },
    preferred: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  },
  { indexes: [{ unique: true, fields: ['productId', 'supplierId'] }] }
);

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
  balanceAfter: { type: DataTypes.FLOAT, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: 'CONFIRMED' },
  notes: { type: DataTypes.STRING }
});

User.belongsTo(User, { as: 'parent', foreignKey: 'parentId' });
Product.belongsTo(Category, { as: 'categoryEntity', foreignKey: 'categoryId' });
StockMovement.belongsTo(Product, { as: 'product', foreignKey: 'productId' });
StockMovement.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });
Waste.belongsTo(Product, { as: 'product', foreignKey: 'productId' });
Waste.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });
Notification.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Sale.belongsTo(User, { as: 'seller', foreignKey: 'sellerId' });
Sale.belongsTo(User, { as: 'client', foreignKey: 'clientId' });
Purchase.belongsTo(Supplier, { as: 'supplier', foreignKey: 'supplierId' });
Purchase.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });
Purchase.hasMany(PurchaseItem, { as: 'purchaseItems', foreignKey: 'purchaseId', onDelete: 'CASCADE' });
PurchaseItem.belongsTo(Purchase, { as: 'purchase', foreignKey: 'purchaseId' });
PurchaseItem.belongsTo(Product, { as: 'product', foreignKey: 'productId' });
Supplier.hasMany(ProductSupplier, { as: 'productLinks', foreignKey: 'supplierId' });
Product.hasMany(ProductSupplier, { as: 'supplierLinks', foreignKey: 'productId' });
ProductSupplier.belongsTo(Supplier, { as: 'supplier', foreignKey: 'supplierId' });
ProductSupplier.belongsTo(Product, { as: 'product', foreignKey: 'productId' });
StockMovement.belongsTo(Supplier, { as: 'supplier', foreignKey: 'supplierId' });
Reservation.belongsTo(User, { as: 'client', foreignKey: 'clientId' });
AccountMovement.belongsTo(Account, { as: 'account', foreignKey: 'accountId' });
AccountMovement.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });

module.exports = {
  Op,
  User,
  Product,
  Category,
  Supplier,
  StockMovement,
  Waste,
  Notification,
  Sale,
  SaleOption,
  Purchase,
  PurchaseItem,
  ProductSupplier,
  Reservation,
  Account,
  AccountMovement
};
