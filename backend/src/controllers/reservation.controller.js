const asyncHandler = require('../utils/asyncHandler');
const reservationService = require('../services/reservation.service');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const Product = require('../models/Product');
const { Op } = require('../models');

exports.create = asyncHandler(async (req, res) => {
  const reservation = await reservationService.createReservation({ ...req.body, userId: req.user.id });
  res.status(201).json(reservation);
});
exports.list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.user.role === 'CLIENT') where.clientId = req.user.id;
  if (req.user.role === 'PARENT') {
    const children = await User.findAll({ where: { parentId: req.user.id, role: 'CLIENT' }, attributes: ['id'] });
    where.clientId = { [Op.in]: children.map((c) => c.id) };
  }
  const reservations = await Reservation.findAll({ where, include: [{ model: User, as: 'client' }] });
  const ids = [...new Set(reservations.flatMap((s) => (s.items || []).map((i) => i.product)))];
  const products = await Product.findAll({ where: { id: ids } });
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  res.json(reservations.map((s) => ({ ...s.toJSON(), items: (s.items || []).map((i) => ({ ...i, product: byId[i.product] || null })) })));
});
