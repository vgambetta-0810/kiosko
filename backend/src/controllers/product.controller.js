const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

exports.create = asyncHandler(async (req, res) => res.status(201).json(await Product.create(req.body)));
exports.list = asyncHandler(async (_req, res) => res.json(await Product.find()));
exports.update = asyncHandler(async (req, res) => res.json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })));
exports.remove = asyncHandler(async (req, res) => { await Product.findByIdAndDelete(req.params.id); res.status(204).send(); });
