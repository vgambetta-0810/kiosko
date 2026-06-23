const { sequelize } = require('../config/db');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { roles } = require('../constants/enums');
const ApiError = require('../utils/ApiError');

exports.adjustStock = async ({ productId, type, quantity, reason, note, referenceType, referenceId, supplierId, userId, movementDate, session: transaction }) => {
  const parsedQuantity = Number(quantity);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
    throw new ApiError(400, 'La cantidad debe ser un número entero mayor a cero');
  }
  const delta = type === 'IN' || type === 'RETURN' ? parsedQuantity : -parsedQuantity;
  const product = await Product.findByPk(productId, { transaction });
  if (!product) throw new Error('Producto no encontrado');

  const stockBefore = Number(product.stock);
  if (!Number.isInteger(stockBefore) || stockBefore < 0) {
    throw new ApiError(409, `El stock actual de ${product.name} no es un número entero válido`);
  }
  if (stockBefore + delta < 0) throw new Error(`Stock insuficiente para ${product.name}`);
  product.stock = stockBefore + delta;
  await product.save({ transaction });

  await StockMovement.create({
    productId,
    type,
    quantity: type === 'WASTE' ? -parsedQuantity : parsedQuantity,
    reason,
    note: note || null,
    referenceType,
    referenceId,
    supplierId: supplierId || null,
    stockBefore,
    stockAfter: product.stock,
    createdById: userId,
    ...(movementDate ? { createdAt: movementDate, updatedAt: movementDate } : {})
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
