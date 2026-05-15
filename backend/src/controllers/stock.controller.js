const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { adjustStock, withTransaction } = require('../services/stock.service');

exports.list = asyncHandler(async (_req, res) =>
  res.json(await StockMovement.findAll({ include: [{ model: Product, as: 'product' }, { model: User, as: 'createdBy' }] }))
);

exports.getProductStock = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ message: 'Producto no encontrado' });
  const movements = await StockMovement.findAll({
    where: { productId: product.id },
    include: [{ model: User, as: 'createdBy' }],
    order: [['createdAt', 'DESC']],
    limit: 100
  });
  return res.json({ product, movements });
});

exports.adjust = asyncHandler(async (req, res) => {
  const { productId, type, quantity, reason } = req.body;
  const product = await withTransaction((transaction) =>
    adjustStock({
      productId,
      type,
      quantity,
      reason: reason || 'Manual adjustment',
      referenceType: 'ManualAdjustment',
      referenceId: null,
      userId: req.user.id,
      session: transaction
    })
  );
  return res.status(201).json(product);
});
