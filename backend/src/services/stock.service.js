const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { roles } = require('../constants/enums');

exports.adjustStock = async ({ productId, type, quantity, reason, note, referenceType, referenceId, userId, session }) => {
  const delta = type === 'IN' || type === 'RETURN' ? quantity : -quantity;
  const product = await Product.findById(productId).session(session);
  if (!product) throw new Error('Product not found');
  if (product.stock + delta < 0) throw new Error(`Insufficient stock for ${product.name}`);

  product.stock += delta;
  await product.save({ session });

  await StockMovement.create(
    [{ productId: productId, type, quantity, reason, note, referenceType, referenceId, createdBy: userId }],
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
  } finally {
    await session.endSession();
  }
};
