const { Op, Sale, Product, User } = require('../models');
const { withTransaction, adjustStock } = require('./stock.service');
const { addMovement } = require('./account.service');
const ApiError = require('../utils/ApiError');
const { KINDS, ensureDefaultSaleOptions, findSaleOptionByCode } = require('../utils/saleOptions');

const activeSaleWhere = { deletedAt: null };
const payableStatuses = new Set(['PAID', 'PENDING']);
const balancePaymentCodes = new Set(['BALANCE', 'SALDO', 'TARJETA', 'SALDO_TARJETA']);

const normalizeStatus = (status) => String(status || '').trim().toUpperCase();

const isDateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

const parseLocalDateOnly = (value, boundary) => {
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(boundary === 'end' ? 23 : 0, boundary === 'end' ? 59 : 0, boundary === 'end' ? 59 : 0, boundary === 'end' ? 999 : 0);
  return date;
};

const parseSaleDateBoundary = (value, boundary) => {
  if (!value) return null;
  if (isDateOnly(value)) return parseLocalDateOnly(value, boundary);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, 'Rango de fechas invalido');
  return date;
};

const expandToLocalDayBoundary = (value, boundary) => {
  const date = parseSaleDateBoundary(value, 'start');
  date.setHours(boundary === 'end' ? 23 : 0, boundary === 'end' ? 59 : 0, boundary === 'end' ? 59 : 0, boundary === 'end' ? 999 : 0);
  return date;
};

const normalizeSalesDateRange = (dateFrom, dateTo) => {
  if (!dateFrom && !dateTo) return null;

  const sameDate = dateFrom && dateTo && String(dateFrom) === String(dateTo);
  const from = sameDate ? expandToLocalDayBoundary(dateFrom, 'start') : parseSaleDateBoundary(dateFrom, 'start');
  const to = sameDate ? expandToLocalDayBoundary(dateTo, 'end') : parseSaleDateBoundary(dateTo, 'end');

  if (from && to && from > to) throw new ApiError(400, 'Desde no puede ser mayor que Hasta');
  return { from, to };
};

const consolidateItems = (items) => {
  const byProduct = new Map();
  for (const rawItem of items || []) {
    const quantity = Number(rawItem.quantity);
    if (!rawItem.productId || !Number.isInteger(quantity) || quantity <= 0) {
      throw new ApiError(400, 'La cantidad debe ser un número entero mayor a cero');
    }
    byProduct.set(rawItem.productId, (byProduct.get(rawItem.productId) || 0) + quantity);
  }

  return [...byProduct.entries()].map(([productId, quantity]) => ({ productId, quantity }));
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
    const saleStatus = normalizeStatus(status || 'PAID');
    if (!effectiveSellerId) throw new ApiError(400, 'Seller is required');

    const [paymentOption, saleTypeOption] = await Promise.all([
      findSaleOptionByCode(KINDS.PAYMENT_METHOD, paymentMethod),
      findSaleOptionByCode(KINDS.SALE_TYPE, saleStatus)
    ]);
    if (!paymentOption) throw new ApiError(400, 'Metodo de pago invalido');
    if (!saleTypeOption) throw new ApiError(400, 'Tipo de venta invalido');
    if (saleTypeOption.requiresClient && !clientId) throw new ApiError(400, 'El cliente es obligatorio para este tipo de venta');
    const usesBalance = balancePaymentCodes.has(paymentOption.code);
    if (usesBalance && !clientId) throw new ApiError(400, 'Selecciona un cliente para pagar con saldo');
    if (usesBalance && saleStatus !== 'PAID') throw new ApiError(400, 'El pago con saldo debe registrarse como venta pagada');

    let total = 0;
    const preparedItems = [];
    const consolidatedItems = consolidateItems(items);

    if (!consolidatedItems.length) throw new ApiError(400, 'Sale has no effective items');

    for (const rawItem of consolidatedItems) {
      const product = await Product.findByPk(rawItem.productId, { transaction: session });
      if (!product) throw new ApiError(404, 'Product not found');
      if (product.stock < rawItem.quantity) throw new ApiError(400, `Insufficient stock for ${product.name}`);

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
      {
        sellerId: effectiveSellerId,
        clientId: clientId || null,
        items: preparedItems,
        total,
        discount,
        finalTotal,
        paymentMethod,
        status: saleStatus,
        paidAt: saleStatus === 'PAID' ? new Date() : null
      },
      { transaction: session }
    );

    for (const item of preparedItems) {
      await adjustStock({
        productId: item.productId,
        type: 'OUT',
        quantity: item.quantity,
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

    if (usesBalance && finalTotal > 0) {
      await addMovement({
        ownerType: 'CLIENT',
        ownerId: clientId,
        type: 'CONSUMPTION',
        amount: finalTotal,
        createdBy: effectiveSellerId,
        session,
        requireAvailableBalance: true,
        notes: `CONSUMPTION SALE ${sale.id}`
      });
    }

    return sale;
  });
};

exports.listSales = async ({ dateFrom, dateTo, sellerId, clientId, status }) => {
  const where = { ...activeSaleWhere };
  const saleStatus = normalizeStatus(status);
  const dateRange = normalizeSalesDateRange(dateFrom, dateTo);

  if (sellerId) where.sellerId = sellerId;
  if (clientId) where.clientId = clientId;
  if (saleStatus) {
    if (!payableStatuses.has(saleStatus)) throw new ApiError(400, 'Estado de venta invalido');
    where.status = saleStatus;
  }
  if (dateRange) {
    where.createdAt = {};
    if (dateRange.from) where.createdAt[Op.gte] = dateRange.from;
    if (dateRange.to) where.createdAt[Op.lte] = dateRange.to;
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

exports.updateSaleStatus = async ({ id, status, userId }) => {
  const nextStatus = normalizeStatus(status);
  if (nextStatus !== 'PAID') throw new ApiError(400, 'Solo se puede marcar una venta como pagada');

  const saleId = await withTransaction(async (session) => {
    const sale = await Sale.findOne({ where: { id, ...activeSaleWhere }, transaction: session });
    if (!sale) throw new ApiError(404, 'Sale not found');
    if (sale.status !== 'PENDING') throw new ApiError(400, 'Solo se pueden cobrar ventas pendientes');

    const paidAt = new Date();
    await sale.update({ status: 'PAID', paidAt }, { transaction: session });

    if (sale.clientId) {
      await addMovement({
        ownerType: 'CLIENT',
        ownerId: sale.clientId,
        type: 'PAYMENT',
        amount: sale.finalTotal,
        createdBy: userId || sale.sellerId,
        session,
        notes: `PAYMENT SALE ${sale.id}`
      });
    }

    return sale.id;
  });

  return exports.getSaleById(saleId);
};
