const asyncHandler = require('../utils/asyncHandler');
const { Op } = require('../models');
const Product = require('../models/Product');

const normalizeSku = (sku) => {
  const normalized = String(sku || '').trim().toUpperCase();
  return normalized || null;
};

exports.create = asyncHandler(async (req, res) => {
  const payload = { ...req.body, sku: normalizeSku(req.body.sku) };
  const product = await Product.create(payload);
  res.status(201).json(product);
});

exports.list = asyncHandler(async (_req, res) => {
  const products = await Product.findAll();
  res.json(products);
});

exports.lookup = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ message: 'q is required' });

  const sku = q.toUpperCase();
  const exactSku = await Product.findOne({ where: { sku, isActive: true } });
  if (exactSku) return res.json({ items: [exactSku] });

  const byId = await Product.findByPk(q);
  if (byId && byId.isActive) return res.json({ items: [byId] });

  const items = await Product.findAll({
    where: {
      isActive: true,
      name: { [Op.like]: `%${q}%` }
    },
    order: [['name', 'ASC']],
    limit: 10
  });

  return res.json({ items });
});

exports.update = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ message: 'Not found' });

  const payload = { ...req.body };
  if (Object.prototype.hasOwnProperty.call(payload, 'sku')) {
    payload.sku = normalizeSku(payload.sku);
  }

  await product.update(payload);
  res.json(product);
});

exports.remove = asyncHandler(async (req, res) => {
  await Product.destroy({ where: { id: req.params.id } });
  res.status(204).send();
});
