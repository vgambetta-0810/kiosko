const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const authService = require('../services/auth.service');

exports.register = asyncHandler(async (req, res) => {
  if (req.body.age && req.body.age < 12 && !req.body.parent) throw new ApiError(400, 'Clients under 12 require parent');
  const payload = await authService.register(req.body);
  res.status(201).json(payload);
});

exports.login = asyncHandler(async (req, res) => {
  const payload = await authService.login(req.body);
  res.json(payload);
});
exports.me = asyncHandler(async (req, res) => res.json(authService.toPublicUser(req.user)));

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await authService.changePassword({ userId: req.user.id, ...req.body });
  res.json(user);
});

exports.google = asyncHandler(async (req, res) => {
  const payload = await authService.loginWithGoogleToken(req.body);
  res.json(payload);
});

exports.googleCallback = [
  authService.passport.authenticate('google', { session: false }),
  (req, res) => {
    const token = require('../utils/jwt').signToken({ sub: req.user.id, role: req.user.role });
    res.redirect(`${process.env.FRONTEND_URL}/oauth-success?token=${token}`);
  }
];
