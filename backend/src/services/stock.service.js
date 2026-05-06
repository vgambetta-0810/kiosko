const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { roles } = require('../constants/enums');

exports.adjustStock = async ({ productId, type, quantity, reason, referenceType, referenceId, userId, session }) => {
  const delta = type === 'IN' || type === 'RETURN' ? quantity : -quantity;
  const product = await Product.findById(productId).session(session);
  if (!product) throw new Error('Product not found');
  if (product.stock + delta < 0) throw new Error(`Insufficient stock for ${product.name}`);

  product.stock += delta;
  await product.save({ session });

  await StockMovement.create(
    [{ product: productId, type, quantity, reason, referenceType, referenceId, createdBy: userId }],
    { session }
  );

  const threshold = Number(process.env.LOW_STOCK_THRESHOLD || 10);
  if (product.stock <= threshold) {
    const admins = await User.find({ role: roles.ADMIN, isActive: true }).session(session);
    if (admins.length) {
      await Notification.insertMany(
        admins.map((admin) => ({
          user: admin._id,
          title: 'Low stock alert',
          message: `${product.name} has low stock (${product.stock})`,
          type: 'LOW_STOCK'
        })),
        { session }
      );
    }
  }

  return product;
};

exports.withTransaction = async (handler) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await handler(session);
    });
    return result;
  } catch (error) {
    const noTxnSupport = String(error?.message || '').includes('Transaction numbers are only allowed on a replica set member or mongos');
    if (!noTxnSupport) throw error;
    return handler(null);
  } finally {
    await session.endSession();
  }
};
