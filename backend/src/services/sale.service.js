const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { withTransaction, adjustStock } = require('./stock.service');
const { addMovement } = require('./account.service');

exports.createSale = async ({ client, items, discount = 0, paymentMethod, createdBy }) =>
  withTransaction(async (transaction) => {
    let subtotal = 0;
    for (const item of items) {
      const product = await Product.findByPk(item.product, { transaction });
      if (!product) throw new Error('Producto no encontrado');
      if (product.stock < item.quantity) throw new Error(`Stock insuficiente para ${product.name}`);
      subtotal += item.quantity * product.price;
      item.price = product.price;
    }

    const total = Math.max(0, subtotal - discount);
    const ticketNumber = `T-${Date.now()}`;
    const sale = await Sale.create({ clientId: client, items, subtotal, discount, total, paymentMethod, ticketNumber, createdById: createdBy }, { transaction });

    for (const item of items) {
      await adjustStock({
        productId: item.product,
        type: 'OUT',
        quantity: item.quantity,
        reason: 'Venta',
        referenceType: 'Venta',
        referenceId: sale.id,
        userId: createdBy,
        session: transaction
      });
    }

    if (client && paymentMethod === 'CASH') {
      await addMovement({ ownerType: 'CLIENT', ownerId: client, type: 'DEBT', amount: total, createdBy, session: transaction, notes: 'Venta fiada' });
    }

    return sale;
  });
