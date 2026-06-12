const { Account, AccountMovement } = require('../models/Account');
const ApiError = require('../utils/ApiError');

exports.getOrCreateAccount = async (ownerType, ownerId, session) => {
  let account = await Account.findOne({ where: { ownerType, ownerId }, transaction: session });
  if (!account) {
    account = await Account.create({ ownerType, ownerId, balance: 0 }, { transaction: session });
  }
  return account;
};

const movementDelta = (type, amount) => {
  if (type === 'PAYMENT' || type === 'CONSUMPTION') return -amount;
  return amount;
};

exports.addMovement = async ({ ownerType, ownerId, type, amount, status = 'CONFIRMED', notes, createdBy, session, requireAvailableBalance = false }) => {
  const account = await exports.getOrCreateAccount(ownerType, ownerId, session);
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new ApiError(400, 'El monto debe ser mayor a cero');

  const delta = movementDelta(type, numericAmount);
  if (requireAvailableBalance && account.balance + delta < 0) throw new ApiError(400, 'Saldo insuficiente para completar la operacion');

  account.balance += delta;
  await account.save({ transaction: session });

  const movement = await AccountMovement.create(
    { accountId: account.id, type, amount: numericAmount, balanceAfter: account.balance, status, notes, createdById: createdBy },
    { transaction: session }
  );

  return { account, movement };
};
