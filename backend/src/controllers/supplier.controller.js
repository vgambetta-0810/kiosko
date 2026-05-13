const asyncHandler = require('../utils/asyncHandler');
const Supplier = require('../models/Supplier');

exports.create = asyncHandler(async (req, res) => res.status(201).json(await Supplier.create(req.body)));
exports.list = asyncHandler(async (_req, res) => res.json(await Supplier.findAll()));
exports.update = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) return res.status(404).json({ message: 'Not found' });
  await supplier.update(req.body);
  res.json(supplier);
});
exports.remove = asyncHandler(async (req, res) => { await Supplier.destroy({ where: { id: req.params.id } }); res.status(204).send(); });
