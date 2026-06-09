const asyncHandler = require('../utils/asyncHandler');
const saleService = require('../services/sale.service');
const Sale = require('../models/Sale');
const User = require('../models/User');
const Product = require('../models/Product');
const { Op } = require('../models');

exports.create = asyncHandler(async (req, res) => {
  const sale = await saleService.createSale({ ...req.body, createdBy: req.user.id });
  res.status(201).json(sale);
});

exports.list = asyncHandler(async (req, res) => {
  const sales = await saleService.listSales({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    sellerId: req.query.sellerId,
    clientId: req.query.clientId
  });
  const ids = [...new Set(sales.flatMap((s) => (s.items || []).map((i) => i.productId)))];
  const products = ids.length ? await Product.findAll({ where: { id: ids } }) : [];
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  res.json(sales.map((s) => ({ ...s.toJSON(), items: (s.items || []).map((i) => ({ ...i, product: byId[i.productId] || null })) })));
});

exports.clients = asyncHandler(async (_req, res) => {
  const clients = await User.findAll({ where: { role: { [Op.in]: ['CLIENT', 'PARENT'] }, isActive: true } });
  res.json(clients);
});

exports.detail = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({
    where: { id: req.params.id, deletedAt: null },
    include: [
      { model: User, as: 'seller', attributes: ['id', 'name', 'email', 'role'] },
      { model: User, as: 'client', attributes: ['id', 'name', 'email', 'role'] }
    ]
  });
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  const ids = [...new Set((sale.items || []).map((i) => i.productId))];
  const products = ids.length ? await Product.findAll({ where: { id: ids } }) : [];
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  return res.json({ ...sale.toJSON(), items: (sale.items || []).map((i) => ({ ...i, product: byId[i.productId] || null })) });
});

exports.remove = asyncHandler(async (req, res) => {
  const sale = await Sale.findByPk(req.params.id);
  if (!sale || sale.deletedAt) return res.status(404).json({ message: 'Sale not found' });
  sale.deletedAt = new Date();
  await sale.save();
  res.status(200).json({ message: 'Sale soft deleted' });
});
