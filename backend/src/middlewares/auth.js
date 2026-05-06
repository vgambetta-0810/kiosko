const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

exports.auth = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next(new ApiError(401, 'Unauthorized'));
  const token = header.split(' ')[1];
  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return next(new ApiError(401, 'Invalid token'));
    req.user = user;
    return next();
  } catch (_e) {
    return next(new ApiError(401, 'Invalid token'));
  }
};

exports.optionalAuth = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  const token = header.split(' ')[1];
  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.userId || payload.sub);
    if (user && user.isActive) req.user = user;
  } catch (_e) {
    // ignore optional auth errors
  }
  return next();
};

exports.authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new ApiError(403, 'Forbidden'));
  return next();
};
