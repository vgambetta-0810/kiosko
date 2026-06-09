const { Op, Sale, Product, User } = require('../models');
const { withTransaction, adjustStock } = require('./stock.service');
const { addMovement } = require('./account.service');
const ApiError = require('../utils/ApiError');
const { KINDS, ensureDefaultSaleOptions, findSaleOptionByCode } = require('../utils/saleOptions');

const activeSaleWhere = { deletedAt: null };

const consolidateItems = (items) => {
  const byProduct = new Map();
  for (const rawItem of items || []) {
    const quantity = Number(rawItem.quantity);
    if (!rawItem.productId || Number.isNaN(quantity) || quantity === 0) {
      throw new ApiError(400, 'Quantity must be different from 0');
    }
    byProduct.set(rawItem.productId, (byProduct.get(rawItem.productId) || 0) + quantity);
  }

  return [...byProduct.entries()]
    .filter(([, quantity]) => quantity !== 0)
    .map(([productId, quantity]) => ({ productId, quantity }));
};

const addProductsToSaleItems = async (sale) => {
  const raw = sale.toJSON ? sale.toJSON() : sale;
  const items = raw.items || [];
  const productIds = [...new Set(items.map((item) => item.productId).filter(Boolean))];
  const products = productIds.length ? await Product.findAll({ where: { id: productIds }, attributes: ['id', 'name', 'price', 'sku', 'codigoBarras'] }) : [];
  const productsById = new Map(products.map((product) => [product.id, product.toJSON()]));

  return {
    ...raw,
    items: items.map((item) => ({
      ...item,
      product: productsById.get(item.productId) || null
    }))
  };
};

exports.createSale = async ({ sellerId, createdBy, clientId = null, items, discount = 0, paymentMethod, status = 'PAID' }) => {
  await ensureDefaultSaleOptions();
  return withTransaction(async (session) => {
    const effectiveSellerId = sellerId || createdBy;
    if (!effectiveSellerId) throw new ApiError(400, 'Seller is required');

    const [paymentOption, saleTypeOption] = await Promise.all([
      findSaleOptionByCode(KINDS.PAYMENT_METHOD, paymentMethod),
      findSaleOptionByCode(KINDS.SALE_TYPE, status)
    ]);
    if (!paymentOption) throw new ApiError(400, 'Metodo de pago invalido');
    if (!saleTypeOption) throw new ApiError(400, 'Tipo de venta invalido');
    if (saleTypeOption.requiresClient && !clientId) throw new ApiError(400, 'El cliente es obligatorio para este tipo de venta');

    let total = 0;
    const preparedItems = [];
    const consolidatedItems = consolidateItems(items);

    if (!consolidatedItems.length) throw new ApiError(400, 'Sale has no effective items');

    for (const rawItem of consolidatedItems) {
      const product = await Product.findByPk(rawItem.productId, { transaction: session });
      if (!product) throw new ApiError(404, 'Product not found');
      if (rawItem.quantity > 0 && product.stock < rawItem.quantity) throw new ApiError(400, `Insufficient stock for ${product.name}`);

      preparedItems.push({
        productId: product.id,
        quantity: rawItem.quantity,
        price: product.price
      });
      total += rawItem.quantity * product.price;
    }

    if (total >= 0 && discount > total) throw new ApiError(400, 'Discount cannot exceed total');

    const finalTotal = total - discount;
    const sale = await Sale.create(
      { sellerId: effectiveSellerId, clientId: clientId || null, items: preparedItems, total, discount, finalTotal, paymentMethod, status },
      { transaction: session }
    );

    for (const item of preparedItems) {
      await adjustStock({
        productId: item.productId,
        type: item.quantity < 0 ? 'RETURN' : 'OUT',
        quantity: Math.abs(item.quantity),
        reason: 'SALE',
        referenceType: 'Sale',
        referenceId: sale.id,
        userId: effectiveSellerId,
        session
      });
    }

    if (saleTypeOption.requiresClient) {
      await addMovement({
        ownerType: 'CLIENT',
        ownerId: clientId,
        type: 'DEBT',
        amount: finalTotal,
        createdBy: effectiveSellerId,
        session,
        notes: `PENDING SALE ${sale.id}`
      });
    }

    return sale;
  });
};

exports.listSales = async ({ dateFrom, dateTo, sellerId, clientId }) => {
  const where = { ...activeSaleWhere };

  if (sellerId) where.sellerId = sellerId;
  if (clientId) where.clientId = clientId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
    if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
  }

  const sales = await Sale.findAll({
    where,
    include: [
      { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'client', attributes: ['id', 'name', 'email'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  return Promise.all(sales.map(addProductsToSaleItems));
};

exports.getSaleById = async (id) => {
  const sale = await Sale.findOne({
    where: { id, ...activeSaleWhere },
    include: [
      { model: User, as: 'seller', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'client', attributes: ['id', 'name', 'email'] }
    ]
  });
  if (!sale) throw new ApiError(404, 'Sale not found');
  return addProductsToSaleItems(sale);
};

exports.softDeleteSale = async ({ id, userId }) => {
  const sale = await Sale.findOne({ where: { id, ...activeSaleWhere } });
  if (!sale) throw new ApiError(404, 'Sale not found');
  await sale.update({ deletedAt: new Date() });
  return sale;
};
