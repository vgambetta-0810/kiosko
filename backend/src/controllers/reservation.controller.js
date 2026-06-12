const asyncHandler = require('../utils/asyncHandler');
const reservationService = require('../services/reservation.service');
const User = require('../models/User');
const { Op } = require('../models');

exports.create = asyncHandler(async (req, res) => {
  const reservation = await reservationService.createReservation({ ...req.body, userId: req.user.id });
  res.status(201).json(reservation);
});
exports.list = asyncHandler(async (req, res) => {
  let clientId = req.query.clientId;
  if (req.user.role === 'CLIENT') clientId = req.user.id;
  if (req.user.role === 'PARENT') {
    const children = await User.findAll({ where: { parentId: req.user.id, role: 'CLIENT' }, attributes: ['id'] });
    const childIds = children.map((c) => c.id);
    if (clientId && !childIds.includes(clientId)) return res.status(403).json({ message: 'Prohibido' });
    clientId = { [Op.in]: childIds };
  }
  res.json(await reservationService.listReservations({ clientId, status: req.query.status }));
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const reservation = await reservationService.updateReservationStatus({
    id: req.params.id,
    status: req.body.status,
    userId: req.user.id
  });
  res.json(reservation);
});
