const asyncHandler = require('../utils/asyncHandler');
const { addMovement, getOrCreateAccount } = require('../services/account.service');
const { AccountMovement } = require('../models/Account');
const { withTransaction } = require('../services/stock.service');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

exports.addMovement = asyncHandler(async (req, res) => {
  const result = await withTransaction((session) =>
    addMovement({ ...req.body, createdBy: req.user._id, session })
  );
  res.status(201).json(result);
});

exports.movementsByOwner = asyncHandler(async (req, res) => {
  const { ownerType, ownerId } = req.params;
  const isAdminOrSeller = ['ADMIN', 'SELLER'].includes(req.user.role);
  if (!isAdminOrSeller) {
    if (ownerType !== 'CLIENT') throw new ApiError(403, 'Forbidden');
    if (req.user.role === 'CLIENT' && req.user._id.toString() !== ownerId) throw new ApiError(403, 'Forbidden');
    if (req.user.role === 'PARENT') {
      const child = await User.findOne({ _id: ownerId, parent: req.user._id, role: 'CLIENT' });
      if (!child) throw new ApiError(403, 'Forbidden');
    }
  }
  const account = await getOrCreateAccount(ownerType, ownerId);
  const movements = await AccountMovement.find({ account: account._id });
  res.json({ account, movements });
});
