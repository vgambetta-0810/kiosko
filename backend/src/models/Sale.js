const mongoose = require('mongoose');
const { paymentMethods } = require('../constants/enums');

const saleSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 }
      }
    ],
    total: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    finalTotal: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: paymentMethods, required: true },
    status: { type: String, enum: ['PAID', 'PENDING'], default: 'PAID', required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sale', saleSchema);
