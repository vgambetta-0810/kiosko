const asyncHandler = require('../utils/asyncHandler');
const reservationService = require('../services/reservation.service');
const Reservation = require('../models/Reservation');
const User = require('../models/User');

exports.create = asyncHandler(async (req, res) => {
  const reservation = await reservationService.createReservation({ ...req.body, userId: req.user._id });
  res.status(201).json(reservation);
});
exports.list = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role === 'CLIENT') filter = { client: req.user._id };
  if (req.user.role === 'PARENT') {
    const children = await User.find({ parentId: req.user._id, role: 'CLIENT' }).select('_id');
    filter = { client: { $in: children.map((c) => c._id) } };
  }
  res.json(await Reservation.find(filter).populate('items.product client'));
});
