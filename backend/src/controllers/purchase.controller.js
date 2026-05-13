const asyncHandler = require('../utils/asyncHandler');
const purchaseService = require('../services/purchase.service');
const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');

exports.create = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.createPurchase({ ...req.body, createdBy: req.user.id });
  res.status(201).json(purchase);
});
exports.list = asyncHandler(async (_req, res) => {
  const purchases = await Purchase.findAll({ include: [{ model: Supplier, as: 'supplier' }] });
  const ids = [...new Set(purchases.flatMap((s) => (s.items || []).map((i) => i.product)))];
  const products = await Product.findAll({ where: { id: ids } });
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  res.json(purchases.map((s) => ({ ...s.toJSON(), items: (s.items || []).map((i) => ({ ...i, product: byId[i.product] || null })) })));
});
