const asyncHandler = require('../utils/asyncHandler');
const saleService = require('../services/sale.service');
const Sale = require('../models/Sale');

exports.create = asyncHandler(async (req, res) => {
  const sale = await saleService.createSale({ ...req.body, createdBy: req.user._id });
  res.status(201).json(sale);
});
exports.list = asyncHandler(async (_req, res) => res.json(await Sale.find().populate('client items.product')));
