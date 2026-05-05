const asyncHandler = require('../utils/asyncHandler');
const { addMovement, getOrCreateAccount } = require('../services/account.service');
const { AccountMovement } = require('../models/Account');
const { withTransaction } = require('../services/stock.service');

exports.addMovement = asyncHandler(async (req, res) => {
  const result = await withTransaction((session) =>
    addMovement({ ...req.body, createdBy: req.user._id, session })
  );
  res.status(201).json(result);
});

exports.movementsByOwner = asyncHandler(async (req, res) => {
  const account = await getOrCreateAccount(req.params.ownerType, req.params.ownerId);
  const movements = await AccountMovement.find({ account: account._id });
  res.json({ account, movements });
});
