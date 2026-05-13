const Reservation = require('../models/Reservation');
const Notification = require('../models/Notification');
const { Op } = require('../models');
const { withTransaction, adjustStock } = require('./stock.service');

exports.createReservation = async ({ client, items, paidAmount = 0, expiresAt, userId }) =>
  withTransaction(async (transaction) => {
    let total = 0;
    for (const item of items) total += item.quantity * item.price;

    const reservation = await Reservation.create(
      { clientId: client, items, total, paidAmount, expiresAt, status: 'ACTIVE' },
      { transaction }
    );

    const movementType = paidAmount >= total ? 'OUT' : 'RESERVED';
    for (const item of items) {
      await adjustStock({
        productId: item.product,
        type: movementType,
        quantity: item.quantity,
        reason: 'RESERVATION',
        referenceType: 'Reservation',
        referenceId: reservation.id,
        userId,
        session: transaction
      });
    }

    return reservation;
  });

exports.expireReservations = async () => {
  const now = new Date();
  const graceDays = Number(process.env.RESERVATION_GRACE_DAYS || 7);
  const toExpire = await Reservation.findAll({ where: { status: 'ACTIVE', expiresAt: { [Op.lt]: now } } });

  for (const reservation of toExpire) {
    if (!reservation.notifiedExpired) {
      await Notification.create({
        userId: reservation.clientId,
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
      await withTransaction(async (transaction) => {
        for (const item of reservation.items) {
          await adjustStock({
            productId: item.product,
            type: 'RETURN',
            quantity: item.quantity,
            reason: 'EXPIRED',
            referenceType: 'Reservation',
            referenceId: reservation.id,
            session: transaction
          });
        }
        reservation.status = 'RETURNED';
        await reservation.save({ transaction });
      });
    }
  }
};
