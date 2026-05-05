const asyncHandler = require('../utils/asyncHandler');
const purchaseService = require('../services/purchase.service');
const Purchase = require('../models/Purchase');

exports.create = asyncHandler(async (req, res) => {
  const purchase = await purchaseService.createPurchase({ ...req.body, createdBy: req.user._id });
  res.status(201).json(purchase);
});
exports.list = asyncHandler(async (_req, res) => res.json(await Purchase.find().populate('supplier items.product')));
