const asyncHandler = require('../utils/asyncHandler');
const reservationService = require('../services/reservation.service');
const Reservation = require('../models/Reservation');

exports.create = asyncHandler(async (req, res) => {
  const reservation = await reservationService.createReservation({ ...req.body, userId: req.user._id });
  res.status(201).json(reservation);
});
exports.list = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'CLIENT' ? { client: req.user._id } : {};
  res.json(await Reservation.find(filter).populate('items.product client'));
});
