const ApiError = require('../utils/ApiError');
const { Waste, Product, User, StockMovement, Op } = require('../models');
const { adjustStock, withTransaction } = require('./stock.service');

const wasteInclude = [
  { model: Product, as: 'product' },
  { model: User, as: 'createdBy', attributes: ['id', 'name'] }
];

const localOffset = process.env.APP_TIMEZONE_OFFSET || '-03:00';

const parseWasteDate = (value) => {
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new ApiError(400, 'La fecha y hora de la merma no es válida');
  if (parsed.getTime() > Date.now()) throw new ApiError(400, 'La fecha y hora de la merma no puede ser futura');
  return parsed;
};

const normalizeDateRange = (from, to) => {
  const where = {};
  if (from) where.date = { ...(where.date || {}), [Op.gte]: new Date(`${from}T00:00:00${localOffset}`) };
  if (to) where.date = { ...(where.date || {}), [Op.lte]: new Date(`${to}T23:59:59.999${localOffset}`) };
  return where;
};

exports.listWaste = ({ productId, reason, from, to } = {}) =>
  Waste.findAll({
    where: {
      ...(productId ? { productId } : {}),
      ...(reason ? { reason: String(reason).toUpperCase() } : {}),
      ...normalizeDateRange(from, to)
    },
    include: wasteInclude,
    order: [['date', 'DESC'], ['createdAt', 'DESC']]
  });

exports.getWaste = async (id) => {
  const waste = await Waste.findByPk(id, { include: wasteInclude });
  if (!waste) throw new ApiError(404, 'Merma no encontrada');
  return waste;
};

exports.createWaste = async ({ requestId, productId, quantity, reason, note, date, createdBy }) => {
  const existing = await Waste.findOne({ where: { requestId }, include: wasteInclude });
  if (existing) return existing;

  return withTransaction(async (transaction) => {
    const repeated = await Waste.findOne({ where: { requestId }, include: wasteInclude, transaction });
    if (repeated) return repeated;

    const product = await Product.findByPk(productId, { transaction });
    if (!product || !product.isActive) throw new ApiError(400, 'Producto no encontrado o inactivo');

    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      throw new ApiError(400, 'La cantidad debe ser un número entero mayor a cero');
    }
    const previousStock = Number(product.stock);
    if (parsedQuantity > previousStock) {
      throw new ApiError(409, `La cantidad supera el stock disponible (${previousStock})`);
    }

    const wasteDate = parseWasteDate(date);
    const unitCost = Number(product.cost || 0);
    const waste = await Waste.create({
      requestId,
      productId,
      quantity: parsedQuantity,
      reason,
      note: note || null,
      unitCost,
      totalCost: unitCost * parsedQuantity,
      previousStock,
      newStock: previousStock - parsedQuantity,
      createdById: createdBy,
      date: wasteDate,
      status: 'ACTIVE'
    }, { transaction });

    await adjustStock({
      productId,
      type: 'WASTE',
      quantity: parsedQuantity,
      reason,
      note,
      referenceType: 'Waste',
      referenceId: waste.id,
      userId: createdBy,
      movementDate: wasteDate,
      session: transaction
    });

    return Waste.findByPk(waste.id, { include: wasteInclude, transaction });
  });
};

exports.getWasteMovement = (wasteId) =>
  StockMovement.findOne({ where: { referenceType: 'Waste', referenceId: wasteId } });
