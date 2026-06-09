const asyncHandler = require('../utils/asyncHandler');
const saleService = require('../services/sale.service');
const User = require('../models/User');
const { createHash } = require('crypto');
const { Op } = require('../models');
const { KINDS, createSaleOption, listSaleOptions, normalizeOptionName } = require('../utils/saleOptions');

const optionKinds = {
  'payment-methods': KINDS.PAYMENT_METHOD,
  'sale-types': KINDS.SALE_TYPE
};

exports.create = asyncHandler(async (req, res) => {
  const sale = await saleService.createSale({ ...req.body, sellerId: req.user._id });
  res.status(201).json(sale);
});

exports.list = asyncHandler(async (req, res) => {
  const sellerId = req.user.role === 'SELLER' ? req.user.id : req.query.sellerId;
  const sales = await saleService.listSales({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    sellerId,
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

exports.clients = asyncHandler(async (req, res) => {
  const q = normalizeOptionName(req.query.q);
  const clients = await User.findAll({
    where: {
      role: 'CLIENT',
      isActive: true,
      ...(q ? { name: { [Op.like]: `%${q}%` } } : {})
    },
    attributes: ['id', 'name', 'email'],
    order: [['name', 'ASC']]
  });
  res.json(clients);
});

exports.createClient = asyncHandler(async (req, res) => {
  const name = normalizeOptionName(req.body?.name);
  if (!name) return res.status(400).json({ message: 'El nombre del cliente es obligatorio' });

  const clients = await User.findAll({ where: { role: 'CLIENT' }, attributes: ['id', 'name', 'email', 'isActive'] });
  const existing = clients.find((client) => normalizeOptionName(client.name).toLocaleLowerCase('es') === name.toLocaleLowerCase('es'));
  if (existing) {
    if (!existing.isActive) await existing.update({ isActive: true, name });
    return res.json({ id: existing.id, name: existing.name, email: existing.email });
  }

  const normalizedKey = name.toLocaleLowerCase('es');
  const internalEmail = `cliente-${createHash('sha256').update(normalizedKey).digest('hex').slice(0, 24)}@clientes.local`;
  let client;
  try {
    client = await User.create({ name, email: internalEmail, role: 'CLIENT' });
  } catch (error) {
    if (error.name !== 'SequelizeUniqueConstraintError') throw error;
    client = await User.findOne({ where: { email: internalEmail, role: 'CLIENT' } });
    if (!client.isActive) await client.update({ isActive: true, name });
  }
  res.status(201).json({ id: client.id, name: client.name, email: client.email });
});

exports.options = asyncHandler(async (req, res) => {
  const kind = optionKinds[req.params.kind];
  if (!kind) return res.status(404).json({ message: 'Catalogo no encontrado' });
  res.json(await listSaleOptions({ kind, query: req.query.q }));
});

exports.createOption = asyncHandler(async (req, res) => {
  const kind = optionKinds[req.params.kind];
  if (!kind) return res.status(404).json({ message: 'Catalogo no encontrado' });
  const option = await createSaleOption({ kind, name: req.body?.name });
  res.status(201).json(option);
});
