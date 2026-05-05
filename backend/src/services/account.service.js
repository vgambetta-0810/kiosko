const { Account, AccountMovement } = require('../models/Account');

exports.getOrCreateAccount = async (ownerType, ownerId, session) => {
  let account = await Account.findOne({ ownerType, ownerId }).session(session);
  if (!account) {
    [account] = await Account.create([{ ownerType, ownerId, balance: 0 }], { session });
  }
  return account;
};

exports.addMovement = async ({ ownerType, ownerId, type, amount, status = 'CONFIRMED', notes, createdBy, session }) => {
  const account = await exports.getOrCreateAccount(ownerType, ownerId, session);
  const sign = type === 'DEBT' ? 1 : -1;
  account.balance += sign * amount;
  await account.save({ session });

  const [movement] = await AccountMovement.create(
    [{ account: account._id, type, amount, status, notes, createdBy }],
    { session }
  );

  return { account, movement };
};
