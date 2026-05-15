const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const { withTransaction, adjustStock } = require('./stock.service');

exports.createPurchase = async ({ supplier, items, createdBy }) =>
  withTransaction(async (transaction) => {
    let total = 0;
    for (const item of items) {
      const product = await Product.findByPk(item.product, { transaction });
      if (!product) throw new Error('Producto no encontrado');
      total += item.quantity * item.cost;
    }

    const purchase = await Purchase.create({ supplierId: supplier, items, total, createdById: createdBy }, { transaction });

    for (const item of items) {
      await Product.update({ cost: item.cost }, { where: { id: item.product }, transaction });
      await adjustStock({
        productId: item.product,
        type: 'IN',
        quantity: item.quantity,
        reason: 'PURCHASE',
        referenceType: 'Purchase',
        referenceId: purchase.id,
        userId: createdBy,
        session: transaction
      });
    }

    return purchase;
  });
