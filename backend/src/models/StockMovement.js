const mongoose = require('mongoose');
const { stockMovementTypes, stockMovementReasons } = require('../constants/enums');

const stockMovementSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    type: { type: String, enum: stockMovementTypes, required: true },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, enum: stockMovementReasons, required: true },
    note: { type: String, trim: true },
    referenceType: { type: String, trim: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockMovement', stockMovementSchema);
