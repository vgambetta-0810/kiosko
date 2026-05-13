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
exports.list = asyncHandler(async (_req, res) => {
  const sales = await Sale.findAll({ include: [{ model: User, as: 'client' }] });
  const ids = [...new Set(sales.flatMap((s) => (s.items || []).map((i) => i.product)))];
  const products = ids.length ? await Product.findAll({ where: { id: ids } }) : [];
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  res.json(sales.map((s) => ({ ...s.toJSON(), items: (s.items || []).map((i) => ({ ...i, product: byId[i.product] || null })) })));
});

exports.clients = asyncHandler(async (_req, res) => {
  const clients = await User.findAll({ where: { role: { [Op.in]: ['CLIENT', 'PARENT'] }, isActive: true } });
  res.json(clients);
});

exports.detail = asyncHandler(async (req, res) => {
  const sale = await Sale.findByPk(req.params.id, { include: [{ model: User, as: 'client' }] });
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  const ids = [...new Set((sale.items || []).map((i) => i.product))];
  const products = ids.length ? await Product.findAll({ where: { id: ids } }) : [];
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  return res.json({ ...sale.toJSON(), items: (sale.items || []).map((i) => ({ ...i, product: byId[i.product] || null })) });
});

exports.remove = asyncHandler(async (req, res) => {
  await Sale.destroy({ where: { id: req.params.id } });
  res.status(204).send();
});
