const asyncHandler = require('../utils/asyncHandler');
const Category = require('../models/Category');
const { Op } = require('../models');

exports.list = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const where = q ? { name: { [Op.like]: `%${q}%` } } : undefined;
  const categories = await Category.findAll({ where, order: [['name', 'ASC']], limit: 50 });
  res.json(categories);
});

exports.create = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ message: 'El nombre de categoria es obligatorio' });

  const existing = await Category.findOne({ where: { name } });
  if (existing) return res.json(existing);

  const category = await Category.create({ name });
  res.status(201).json(category);
});
