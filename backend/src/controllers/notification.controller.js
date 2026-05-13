const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

exports.listMine = asyncHandler(async (req, res) =>
  res.json(await Notification.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] }))
);
