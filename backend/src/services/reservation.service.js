const Reservation = require('../models/Reservation');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Product = require('../models/Product');
const { Op } = require('../models');
const { withTransaction, adjustStock } = require('./stock.service');
const ApiError = require('../utils/ApiError');

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

exports.listReservations = async ({ clientId, status } = {}) => {
  const where = {
    ...(clientId ? { clientId } : {}),
    ...(status && status !== 'ALL' ? { status: String(status).trim().toUpperCase() } : {})
  };
  const reservations = await Reservation.findAll({
    where,
    include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email', 'phone', 'cardId'] }],
    order: [['createdAt', 'DESC']]
  });
  const ids = [...new Set(reservations.flatMap((reservation) => (reservation.items || []).map((item) => item.product)))];
  const products = ids.length ? await Product.findAll({ where: { id: ids } }) : [];
  const byId = Object.fromEntries(products.map((product) => [product.id, product]));
  return reservations.map((reservation) => ({
    ...reservation.toJSON(),
    items: (reservation.items || []).map((item) => ({ ...item, product: byId[item.product] || null }))
  }));
};

exports.updateReservationStatus = async ({ id, status, userId, clientId }) => {
  const nextStatus = String(status || '').trim().toUpperCase();
  if (!['ACTIVE', 'RETIRED', 'CANCELLED'].includes(nextStatus)) throw new ApiError(400, 'Estado de reserva invalido');

  return withTransaction(async (transaction) => {
    const reservation = await Reservation.findByPk(id, { transaction });
    if (!reservation) throw new ApiError(404, 'Reserva no encontrada');
    if (clientId && reservation.clientId !== clientId) throw new ApiError(403, 'Prohibido');
    const previousStatus = reservation.status;
    if (previousStatus === nextStatus) return reservation;
    if (previousStatus !== 'ACTIVE') throw new ApiError(400, 'Solo se pueden modificar reservas activas');

    if (nextStatus === 'CANCELLED') {
      for (const item of reservation.items || []) {
        await adjustStock({
          productId: item.product,
          type: 'RETURN',
          quantity: item.quantity,
          reason: 'RESERVATION_CANCELLED',
          referenceType: 'Reservation',
          referenceId: reservation.id,
          userId,
          session: transaction
        });
      }
    }

    await reservation.update({ status: nextStatus }, { transaction });
    return reservation;
  });
};

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
