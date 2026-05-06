const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { withTransaction, adjustStock } = require('./stock.service');
const { addMovement } = require('./account.service');

exports.createSale = async ({ client, items, discount = 0, paymentMethod, createdBy }) =>
  withTransaction(async (session) => {
    let subtotal = 0;
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) throw new Error('Product not found');
      if (product.stock < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);
      subtotal += item.quantity * product.price;
      item.price = product.price;
    }

    const total = Math.max(0, subtotal - discount);
    const ticketNumber = `T-${Date.now()}`;
    const [sale] = await Sale.create([{ client, items, subtotal, discount, total, paymentMethod, ticketNumber, createdBy }], { session });

    for (const item of items) {
      await adjustStock({
        productId: item.product,
        type: 'OUT',
        quantity: item.quantity,
        reason: 'SALE',
        referenceType: 'Sale',
        referenceId: sale._id,
        userId: createdBy,
        session
      });
    }

    if (client && paymentMethod === 'CASH') {
      await addMovement({ ownerType: 'CLIENT', ownerId: client, type: 'DEBT', amount: total, createdBy, session, notes: 'Fiado sale' });
    }

    return sale;
  });
