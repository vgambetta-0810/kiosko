const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const authService = require('../services/auth.service');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

exports.register = asyncHandler(async (req, res) => {
  if (req.body.age && req.body.age < 12 && !req.body.parentId) throw new ApiError(400, 'Clients under 12 require parentId');
  const payload = await authService.register(req.body, req.user);
  res.status(201).json(payload);
});

exports.login = asyncHandler(async (req, res) => {
  const payload = await authService.login(req.body);
  res.json(payload);
});

exports.google = asyncHandler(async (req, res) => {
  const payload = await authService.googleLogin(req.body);
  res.json(payload);
});

exports.me = asyncHandler(async (req, res) => {
  let user = req.user;
  if (!user) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) throw new ApiError(401, 'Unauthorized');
    const token = header.split(' ')[1];
    const payload = verifyToken(token);
    user = await User.findById(payload.userId || payload.sub);
    if (!user || !user.isActive) throw new ApiError(401, 'Invalid token');
  }
  res.json(user);
});
