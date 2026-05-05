const StockMovement = require('../models/StockMovement');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (_req, res) => res.json(await StockMovement.find().populate('product createdBy')));
