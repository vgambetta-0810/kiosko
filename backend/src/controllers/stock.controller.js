const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const { adjustStock, withTransaction } = require('../services/stock.service');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const { productId, dateFrom, dateTo, type } = req.query;
  const filter = {};
  if (productId) filter.productId = productId;
  if (type) filter.type = type;
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }
  const movements = await StockMovement.find(filter)
    .populate('productId', 'name')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
  res.json(movements);
});

exports.getProductStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const movements = await StockMovement.find({ productId: id })
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
  res.json({ product: { name: product.name, stock: product.stock }, movements });
});

exports.adjust = asyncHandler(async (req, res) => {
  const { productId, quantity, reason } = req.body;
  const userId = req.user._id;
  const type = quantity > 0 ? 'IN' : 'OUT';
  const absQuantity = Math.abs(quantity);
  const result = await withTransaction(async (session) => {
    return await adjustStock({
      productId,
      type,
      quantity: absQuantity,
      reason: 'MANUAL_ADJUSTMENT',
      note: reason,
      referenceType: 'Manual',
      referenceId: null,
      userId,
      session
    });
  });
  res.json(result);
});
