const { sequelize } = require('../config/db');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { roles } = require('../constants/enums');

exports.adjustStock = async ({ productId, type, quantity, reason, referenceType, referenceId, supplierId, userId, session: transaction }) => {
  const delta = type === 'IN' || type === 'RETURN' ? quantity : -quantity;
  const product = await Product.findByPk(productId, { transaction });
  if (!product) throw new Error('Producto no encontrado');
  if (product.stock + delta < 0) throw new Error(`Stock insuficiente para ${product.name}`);

  const stockBefore = Number(product.stock);
  product.stock = stockBefore + delta;
  await product.save({ transaction });

  await StockMovement.create({
    productId,
    type,
    quantity,
    reason,
    referenceType,
    referenceId,
    supplierId: supplierId || null,
    stockBefore,
    stockAfter: product.stock,
    createdById: userId
  }, { transaction });

  const threshold = Number(process.env.LOW_STOCK_THRESHOLD || 10);
  if (product.stock <= threshold) {
    const admins = await User.findAll({ where: { role: roles.ADMIN, isActive: true }, transaction });
    if (admins.length) {
      await Notification.bulkCreate(
        admins.map((admin) => ({
          userId: admin.id,
          title: 'Alerta de stock bajo',
          message: `${product.name} tiene stock bajo (${product.stock})`,
          type: 'LOW_STOCK'
        })),
        { transaction }
      );
    }
  }

  return product;
};

exports.withTransaction = async (handler) => {
  return sequelize.transaction(async (transaction) => handler(transaction));
};
