const asyncHandler = require('../utils/asyncHandler');
const saleService = require('../services/sale.service');
const User = require('../models/User');

exports.create = asyncHandler(async (req, res) => {
  const sale = await saleService.createSale({ ...req.body, sellerId: req.user._id });
  res.status(201).json(sale);
});

exports.list = asyncHandler(async (req, res) => {
  const sales = await saleService.listSales({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    sellerId: req.query.sellerId,
    clientId: req.query.clientId
  });
  res.json(sales);
});

exports.detail = asyncHandler(async (req, res) => {
  const sale = await saleService.getSaleById(req.params.id);
  res.json(sale);
});

exports.remove = asyncHandler(async (req, res) => {
  const sale = await saleService.softDeleteSale({ id: req.params.id, userId: req.user._id });
  res.json(sale);
});

exports.clients = asyncHandler(async (_req, res) => {
  const clients = await User.find({ role: 'CLIENT', isActive: true }).select('name email');
  res.json(clients);
});
