const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

exports.listMine = asyncHandler(async (req, res) => res.json(await Notification.find({ user: req.user._id }).sort({ createdAt: -1 })));
