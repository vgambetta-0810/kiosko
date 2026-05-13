const { Account, AccountMovement } = require('../models/Account');

exports.getOrCreateAccount = async (ownerType, ownerId, session) => {
  let account = await Account.findOne({ where: { ownerType, ownerId }, transaction: session });
  if (!account) {
    account = await Account.create({ ownerType, ownerId, balance: 0 }, { transaction: session });
  }
  return account;
};

exports.addMovement = async ({ ownerType, ownerId, type, amount, status = 'CONFIRMED', notes, createdBy, session }) => {
  const account = await exports.getOrCreateAccount(ownerType, ownerId, session);
  const sign = type === 'DEBT' ? 1 : -1;
  account.balance += sign * amount;
  await account.save({ transaction: session });

  const movement = await AccountMovement.create(
    { accountId: account.id, type, amount, status, notes, createdById: createdBy },
    { transaction: session }
  );

  return { account, movement };
};
