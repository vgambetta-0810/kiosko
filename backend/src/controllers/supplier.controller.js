const Supplier = require('../models/Supplier');
const asyncHandler = require('../utils/asyncHandler');

exports.create = asyncHandler(async (req, res) => res.status(201).json(await Supplier.create(req.body)));
exports.list = asyncHandler(async (_req, res) => res.json(await Supplier.find()));
exports.update = asyncHandler(async (req, res) => res.json(await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true })));
exports.remove = asyncHandler(async (req, res) => { await Supplier.findByIdAndDelete(req.params.id); res.status(204).send(); });
