const asyncHandler = require('../utils/asyncHandler');
const saleService = require('../services/sale.service');
const Sale = require('../models/Sale');
const User = require('../models/User');
const Product = require('../models/Product');

exports.create = asyncHandler(async (req, res) => {
  const sale = await saleService.createSale({ ...req.body, createdBy: req.user.id });
  res.status(201).json(sale);
});
exports.list = asyncHandler(async (_req, res) => {
  const sales = await Sale.findAll({ include: [{ model: User, as: 'client' }] });
  const ids = [...new Set(sales.flatMap((s) => (s.items || []).map((i) => i.product)))];
  const products = await Product.findAll({ where: { id: ids } });
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  res.json(sales.map((s) => ({ ...s.toJSON(), items: (s.items || []).map((i) => ({ ...i, product: byId[i.product] || null })) })));
});
