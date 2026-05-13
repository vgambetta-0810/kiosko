const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (_req, res) =>
  res.json(await StockMovement.findAll({ include: [{ model: Product, as: 'product' }, { model: User, as: 'createdBy' }] }))
);
