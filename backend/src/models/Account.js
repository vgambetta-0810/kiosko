const mongoose = require('mongoose');
const { accountOwnerTypes, accountMovementTypes } = require('../constants/enums');

const accountSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: accountOwnerTypes, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    balance: { type: Number, default: 0 }
  },
  { timestamps: true }
);

accountSchema.index({ ownerType: 1, ownerId: 1 }, { unique: true });

const accountMovementSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
    type: { type: String, enum: accountMovementTypes, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    status: { type: String, default: 'CONFIRMED' },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = {
  Account: mongoose.model('Account', accountSchema),
  AccountMovement: mongoose.model('AccountMovement', accountMovementSchema)
};
