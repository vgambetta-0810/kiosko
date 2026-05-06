const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { withTransaction, adjustStock } = require('./stock.service');
const { addMovement } = require('./account.service');
const ApiError = require('../utils/ApiError');

exports.createSale = async ({ sellerId, clientId = null, items, discount = 0, paymentMethod, status = 'PAID' }) =>
  withTransaction(async (session) => {
    let total = 0;
    const preparedItems = [];

    for (const rawItem of items) {
      if (!rawItem.quantity || rawItem.quantity <= 0) throw new ApiError(400, 'Quantity must be greater than 0');
      const product = await Product.findById(rawItem.productId).session(session);
      if (!product) throw new ApiError(404, 'Product not found');
      if (product.stock < rawItem.quantity) throw new ApiError(400, `Insufficient stock for ${product.name}`);

      preparedItems.push({
        productId: product._id,
        quantity: rawItem.quantity,
        price: product.price
      });
      total += rawItem.quantity * product.price;
    }

    if (discount > total) throw new ApiError(400, 'Discount cannot exceed total');

    const finalTotal = total - discount;
    const [sale] = await Sale.create(
      [{ sellerId, clientId, items: preparedItems, total, discount, finalTotal, paymentMethod, status }],
      { session }
    );

    for (const item of preparedItems) {
      await adjustStock({
        productId: item.productId,
        type: 'OUT',
        quantity: item.quantity,
        reason: 'SALE',
        referenceType: 'Sale',
        referenceId: sale._id,
        userId: sellerId,
        session
      });
    }

    if (status === 'PENDING') {
      if (!clientId) throw new ApiError(400, 'Client is required for pending sales');
      await addMovement({
        ownerType: 'CLIENT',
        ownerId: clientId,
        type: 'DEBT',
        amount: finalTotal,
        createdBy: sellerId,
        session,
        notes: `PENDING SALE ${sale._id}`
      });
    }

    return sale;
  });

exports.listSales = async ({ dateFrom, dateTo, sellerId, clientId }) => {
  const query = { isDeleted: false };

  if (sellerId) query.sellerId = sellerId;
  if (clientId) query.clientId = clientId;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  return Sale.find(query)
    .sort({ createdAt: -1 })
    .populate('sellerId', 'name email')
    .populate('clientId', 'name email')
    .populate('items.productId', 'name price');
};

exports.getSaleById = async (id) => {
  const sale = await Sale.findOne({ _id: id, isDeleted: false })
    .populate('sellerId', 'name email')
    .populate('clientId', 'name email')
    .populate('items.productId', 'name price');
  if (!sale) throw new ApiError(404, 'Sale not found');
  return sale;
};

exports.softDeleteSale = async ({ id, userId }) => {
  const sale = await Sale.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: userId } },
    { new: true }
  );

  if (!sale) throw new ApiError(404, 'Sale not found');
  return sale;
};
