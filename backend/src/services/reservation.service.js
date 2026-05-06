const Reservation = require('../models/Reservation');
const Notification = require('../models/Notification');
const { withTransaction, adjustStock } = require('./stock.service');

exports.createReservation = async ({ client, items, paidAmount = 0, expiresAt, userId }) =>
  withTransaction(async (session) => {
    let total = 0;
    for (const item of items) total += item.quantity * item.price;

    const [reservation] = await Reservation.create(
      [{ client, items, total, paidAmount, expiresAt, status: 'ACTIVE' }],
      { session }
    );

    const movementType = paidAmount >= total ? 'OUT' : 'RESERVED';
    for (const item of items) {
      await adjustStock({
        productId: item.product,
        type: movementType,
        quantity: item.quantity,
        reason: 'RESERVATION',
        referenceType: 'Reservation',
        referenceId: reservation._id,
        userId,
        session
      });
    }

    return reservation;
  });

exports.expireReservations = async () => {
  const now = new Date();
  const graceDays = Number(process.env.RESERVATION_GRACE_DAYS || 7);
  const toExpire = await Reservation.find({ status: 'ACTIVE', expiresAt: { $lt: now } });

  for (const reservation of toExpire) {
    if (!reservation.notifiedExpired) {
      await Notification.create({
        user: reservation.client,
        title: 'Reservation expired',
        message: 'Your reservation has expired. You have a 7-day grace period to recover it.',
        type: 'RESERVATION'
      });
      reservation.notifiedExpired = true;
      reservation.status = 'EXPIRED';
      await reservation.save();
    }

    const graceLimit = new Date(reservation.expiresAt);
    graceLimit.setDate(graceLimit.getDate() + graceDays);
    if (now > graceLimit && reservation.status !== 'RETURNED') {
      await withTransaction(async (session) => {
        for (const item of reservation.items) {
          await adjustStock({
            productId: item.product,
            type: 'RETURN',
            quantity: item.quantity,
            reason: 'EXPIRED',
            referenceType: 'Reservation',
            referenceId: reservation._id,
            session
          });
        }
        reservation.status = 'RETURNED';
        await reservation.save({ session });
      });
    }
  }
};
