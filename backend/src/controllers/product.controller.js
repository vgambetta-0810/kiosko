const asyncHandler = require('../utils/asyncHandler');
const Product = require('../models/Product');

exports.create = asyncHandler(async (req, res) => res.status(201).json(await Product.create(req.body)));
exports.list = asyncHandler(async (_req, res) => res.json(await Product.findAll()));
exports.update = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ message: 'Not found' });
  await product.update(req.body);
  res.json(product);
});
exports.remove = asyncHandler(async (req, res) => { await Product.destroy({ where: { id: req.params.id } }); res.status(204).send(); });
