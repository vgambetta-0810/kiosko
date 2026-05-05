const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (_req, res) => res.json(await User.find().populate('parent', 'name email')));
exports.me = asyncHandler(async (req, res) => res.json(req.user));
