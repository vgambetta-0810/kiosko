const mongoose = require('mongoose');
const { reservationStatus } = require('../constants/enums');

const reservationSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 }
      }
    ],
    total: { type: Number, required: true },
    paidAmount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: reservationStatus, default: 'ACTIVE' },
    notifiedExpired: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reservation', reservationSchema);
