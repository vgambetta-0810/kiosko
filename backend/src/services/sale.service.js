const Sale = require('../models/Sale');
const Product = require('../models/Product');
const User = require('../models/User');
const { Op } = require('../models');
const { withTransaction, adjustStock } = require('./stock.service');
const { addMovement } = require('./account.service');

const normalizeItem = (item) => ({
  productId: item.productId || item.product,
  quantity: Number(item.quantity)
});

const consolidateItems = (items) => {
  const byProduct = new Map();

  for (const item of items) {
    if (!item.productId) throw new Error('Product is required');
    if (!Number.isFinite(item.quantity) || item.quantity === 0) throw new Error('Quantity cannot be 0');

    byProduct.set(item.productId, (byProduct.get(item.productId) || 0) + item.quantity);
  }

  return Array.from(byProduct.entries())
    .map(([productId, quantity]) => ({ productId, quantity }))
    .filter((item) => item.quantity !== 0);
};

exports.createSale = async ({ clientId, client, items, discount = 0, paymentMethod, status = 'PAID', createdBy }) =>
  withTransaction(async (transaction) => {
    const normalizedItems = consolidateItems((items || []).map(normalizeItem));
    const resolvedClientId = clientId || client || null;

    if (!normalizedItems.length) throw new Error('Sale has no effective items');

    let total = 0;
    const saleItems = [];

    for (const item of normalizedItems) {
      const product = await Product.findByPk(item.productId, { transaction });
      if (!product) throw new Error('Product not found');

      if (item.quantity > 0 && product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      const itemPrice = Number(product.price);
      total += item.quantity * itemPrice;
      saleItems.push({ productId: product.id, quantity: item.quantity, price: itemPrice });
    }

    const numericDiscount = Number(discount) || 0;
    if (numericDiscount < 0) throw new Error('Discount cannot be negative');

    const discountCap = Math.max(0, total);
    if (numericDiscount > discountCap) throw new Error('Discount cannot exceed total');

    const normalizedStatus = status === 'PENDING' ? 'PENDING' : 'PAID';
    if (normalizedStatus === 'PENDING') {
      if (!resolvedClientId) throw new Error('Client is required for pending sales');
      const clientExists = await User.findOne({ where: { id: resolvedClientId, isActive: true }, transaction });
      if (!clientExists) throw new Error('Client not found');
    }

    const finalTotal = total - numericDiscount;
    const sale = await Sale.create(
      {
        sellerId: createdBy,
        clientId: resolvedClientId,
        items: saleItems,
        total,
        discount: numericDiscount,
        finalTotal,
        paymentMethod,
        status: normalizedStatus
      },
      { transaction }
    );

    for (const item of saleItems) {
      const isReturn = item.quantity < 0;
      await adjustStock({
        productId: item.productId,
        type: isReturn ? 'RETURN' : 'OUT',
        quantity: Math.abs(item.quantity),
        reason: isReturn ? 'SALE_RETURN' : 'SALE',
        referenceType: 'Sale',
        referenceId: sale.id,
        userId: createdBy,
        session: transaction
      });
    }

    if (normalizedStatus === 'PENDING' && finalTotal > 0) {
      await addMovement({
        ownerType: 'CLIENT',
        ownerId: resolvedClientId,
        type: 'DEBT',
        amount: finalTotal,
        createdBy,
        session: transaction,
        notes: `Pending sale ${sale.id}`
      });
    }

    return sale;
  });

exports.listSales = async ({ dateFrom, dateTo, sellerId, clientId }) => {
  const where = { deletedAt: null };
  if (sellerId) where.sellerId = sellerId;
  if (clientId) where.clientId = clientId;

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
    if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
  }

  return Sale.findAll({
    where,
    include: [
      { model: User, as: 'seller', attributes: ['id', 'name', 'email', 'role'] },
      { model: User, as: 'client', attributes: ['id', 'name', 'email', 'role'] }
    ],
    order: [['createdAt', 'DESC']]
  });
};
