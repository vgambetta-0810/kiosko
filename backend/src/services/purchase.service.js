const ApiError = require('../utils/ApiError');
const { Purchase, PurchaseItem, Product, ProductSupplier, Supplier, User } = require('../models');
const { withTransaction, adjustStock } = require('./stock.service');

const purchaseInclude = [
  { model: Supplier, as: 'supplier' },
  { model: User, as: 'createdBy', attributes: ['id', 'name'] },
  { model: PurchaseItem, as: 'purchaseItems', include: [{ model: Product, as: 'product' }] }
];

const normalizeItems = (items = []) => {
  const consolidated = new Map();
  for (const raw of items) {
    const productId = raw.productId || raw.product;
    const quantity = Number(raw.quantity);
    const unitCost = Number(raw.unitCost ?? raw.cost);
    if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
      throw new ApiError(400, 'Cada producto debe tener una cantidad mayor a 0');
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new ApiError(400, 'Cada producto debe tener un costo mayor o igual a 0');
    }
    const previous = consolidated.get(productId);
    if (previous) {
      previous.quantity += quantity;
      previous.unitCost = unitCost;
    } else {
      consolidated.set(productId, { productId, quantity, unitCost });
    }
  }
  if (!consolidated.size) throw new ApiError(400, 'La compra debe tener al menos un producto');
  return [...consolidated.values()].map((item) => ({ ...item, subtotal: item.quantity * item.unitCost }));
};

const getPurchase = (id, transaction) =>
  Purchase.findByPk(id, { include: purchaseInclude, transaction });

exports.listPurchases = ({ status, supplierId } = {}) =>
  Purchase.findAll({
    where: {
      ...(status ? { status: String(status).toUpperCase() } : {}),
      ...(supplierId ? { supplierId } : {})
    },
    include: purchaseInclude,
    order: [['purchaseDate', 'DESC'], ['createdAt', 'DESC']]
  });

exports.getPurchase = async (id) => {
  const purchase = await getPurchase(id);
  if (!purchase) throw new ApiError(404, 'Compra no encontrada');
  return purchase;
};

exports.createPurchase = async ({ supplierId, supplier, items, purchaseDate, notes, status, createdBy }) =>
  withTransaction(async (transaction) => {
    const resolvedSupplierId = supplierId || supplier;
    const supplierRecord = await Supplier.findByPk(resolvedSupplierId, { transaction });
    if (!supplierRecord || !supplierRecord.isActive) throw new ApiError(400, 'Proveedor no encontrado o inactivo');

    const normalizedItems = normalizeItems(items);
    const products = await Product.findAll({
      where: { id: normalizedItems.map((item) => item.productId), isActive: true },
      transaction
    });
    if (products.length !== normalizedItems.length) throw new ApiError(400, 'Uno o más productos no existen o están inactivos');

    const total = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const purchase = await Purchase.create({
      supplierId: resolvedSupplierId,
      total,
      status: 'DRAFT',
      purchaseDate: purchaseDate || new Date(),
      notes: notes || null,
      createdById: createdBy,
      items: normalizedItems.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
        cost: item.unitCost
      }))
    }, { transaction });

    await PurchaseItem.bulkCreate(
      normalizedItems.map((item) => ({ ...item, purchaseId: purchase.id })),
      { transaction }
    );

    if (String(status || '').toUpperCase() === 'CONFIRMED') {
      return exports.confirmPurchase({ id: purchase.id, userId: createdBy, outerTransaction: transaction });
    }
    return getPurchase(purchase.id, transaction);
  });

exports.updatePurchase = async ({ id, supplierId, items, purchaseDate, notes }) =>
  withTransaction(async (transaction) => {
    const purchase = await Purchase.findByPk(id, { transaction });
    if (!purchase) throw new ApiError(404, 'Compra no encontrada');
    if (purchase.status !== 'DRAFT') throw new ApiError(409, 'Sólo se pueden editar compras en borrador');

    const nextSupplierId = supplierId || purchase.supplierId;
    const supplierRecord = await Supplier.findByPk(nextSupplierId, { transaction });
    if (!supplierRecord || !supplierRecord.isActive) throw new ApiError(400, 'Proveedor no encontrado o inactivo');

    let total = purchase.total;
    let legacyItems = purchase.items;
    if (items) {
      const normalizedItems = normalizeItems(items);
      const products = await Product.findAll({ where: { id: normalizedItems.map((item) => item.productId) }, transaction });
      if (products.length !== normalizedItems.length) throw new ApiError(400, 'Uno o más productos no existen');
      total = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
      legacyItems = normalizedItems.map((item) => ({ product: item.productId, quantity: item.quantity, cost: item.unitCost }));
      await PurchaseItem.destroy({ where: { purchaseId: purchase.id }, transaction });
      await PurchaseItem.bulkCreate(normalizedItems.map((item) => ({ ...item, purchaseId: purchase.id })), { transaction });
    }

    await purchase.update({
      supplierId: nextSupplierId,
      total,
      items: legacyItems,
      purchaseDate: purchaseDate || purchase.purchaseDate,
      notes: notes !== undefined ? notes : purchase.notes
    }, { transaction });
    return getPurchase(purchase.id, transaction);
  });

exports.confirmPurchase = async ({ id, userId, outerTransaction }) => {
  const run = async (transaction) => {
    const purchase = await Purchase.findByPk(id, {
      include: [{ model: PurchaseItem, as: 'purchaseItems' }],
      transaction
    });
    if (!purchase) throw new ApiError(404, 'Compra no encontrada');
    if (purchase.status === 'CONFIRMED') throw new ApiError(409, 'La compra ya fue confirmada');
    if (purchase.status === 'CANCELLED') throw new ApiError(409, 'No se puede confirmar una compra anulada');

    for (const item of purchase.purchaseItems) {
      await adjustStock({
        productId: item.productId,
        type: 'IN',
        quantity: item.quantity,
        reason: 'PURCHASE',
        referenceType: 'Purchase',
        referenceId: purchase.id,
        supplierId: purchase.supplierId,
        userId,
        session: transaction
      });
      await Product.update({ cost: item.unitCost }, { where: { id: item.productId }, transaction });
      await ProductSupplier.upsert({
        productId: item.productId,
        supplierId: purchase.supplierId,
        lastCost: item.unitCost,
        isActive: true
      }, { transaction });
    }

    await purchase.update({ status: 'CONFIRMED', confirmedAt: new Date() }, { transaction });
    return getPurchase(purchase.id, transaction);
  };
  return outerTransaction ? run(outerTransaction) : withTransaction(run);
};

exports.cancelPurchase = async ({ id }) =>
  withTransaction(async (transaction) => {
    const purchase = await Purchase.findByPk(id, { transaction });
    if (!purchase) throw new ApiError(404, 'Compra no encontrada');
    if (purchase.status === 'CONFIRMED') {
      throw new ApiError(409, 'Una compra confirmada requiere una reversa de stock y no puede anularse directamente');
    }
    if (purchase.status === 'CANCELLED') throw new ApiError(409, 'La compra ya está anulada');
    await purchase.update({ status: 'CANCELLED', cancelledAt: new Date() }, { transaction });
    return getPurchase(purchase.id, transaction);
  });
