const asyncHandler = require('../utils/asyncHandler');
const { addMovement, getOrCreateAccount } = require('../services/account.service');
const { AccountMovement } = require('../models/Account');
const { withTransaction } = require('../services/stock.service');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

exports.addMovement = asyncHandler(async (req, res) => {
  const result = await withTransaction((session) =>
    addMovement({ ...req.body, createdBy: req.user.id, session })
  );
  res.status(201).json(result);
});

exports.movementsByOwner = asyncHandler(async (req, res) => {
  const { ownerType, ownerId } = req.params;
  const isAdminOrSeller = ['ADMIN', 'SELLER'].includes(req.user.role);
  if (!isAdminOrSeller) {
    if (ownerType !== 'CLIENT') throw new ApiError(403, 'Prohibido');
    if (req.user.role === 'CLIENT' && req.user.id !== ownerId) throw new ApiError(403, 'Prohibido');
    if (req.user.role === 'PARENT') {
      const child = await User.findOne({ where: { id: ownerId, parentId: req.user.id, role: 'CLIENT' } });
      if (!child) throw new ApiError(403, 'Prohibido');
    }
  }
  const account = await getOrCreateAccount(ownerType, ownerId);
  const movements = await AccountMovement.findAll({ where: { accountId: account.id } });
  res.json({ account, movements });
});
