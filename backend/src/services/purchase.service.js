const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const { withTransaction, adjustStock } = require('./stock.service');

exports.createPurchase = async ({ supplier, items, createdBy }) =>
  withTransaction(async (session) => {
    let total = 0;
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error('Product not found');
      total += item.quantity * item.cost;
    }

    const [purchase] = await Purchase.create([{ supplier, items, total, createdBy }], { session });

    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, { $set: { cost: item.cost } }, { session });
      await adjustStock({
        productId: item.product,
        type: 'IN',
        quantity: item.quantity,
        reason: 'PURCHASE',
        referenceType: 'Purchase',
        referenceId: purchase._id,
        userId: createdBy,
        session
      });
    }

    return purchase;
  });
