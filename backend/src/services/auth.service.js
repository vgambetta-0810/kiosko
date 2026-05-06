const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const { roles } = require('../constants/enums');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const buildAuthResponse = (user) => ({
  user,
  token: signToken({ userId: user._id.toString(), role: user.role })
});

exports.register = async ({ name, email, password, role, age, parentId }, currentUser) => {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'Email already in use');

  const isPrivilegedRole = role && role !== roles.CLIENT;
  const finalRole = isPrivilegedRole
    ? currentUser?.role === roles.ADMIN
      ? role
      : roles.CLIENT
    : roles.CLIENT;

  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hash,
    role: finalRole,
    age,
    parentId: parentId || null
  });
  return buildAuthResponse(user);
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !user.password) throw new ApiError(401, 'Invalid credentials');
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new ApiError(401, 'Invalid credentials');
  if (!user.isActive) throw new ApiError(403, 'Inactive user');
  return buildAuthResponse(user);
};

exports.googleLogin = async ({ idToken }) => {
  if (!process.env.GOOGLE_CLIENT_ID) throw new ApiError(500, 'Google OAuth is not configured');
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();
  const email = payload?.email?.toLowerCase();
  const googleId = payload?.sub;
  const name = payload?.name;

  if (!email || !googleId) throw new ApiError(401, 'Invalid Google token');

  let user = await User.findOne({ $or: [{ googleId }, { email }] });
  if (!user) {
    user = await User.create({ name: name || email.split('@')[0], email, googleId, role: roles.CLIENT });
  } else if (!user.googleId) {
    user.googleId = googleId;
    await user.save();
  }

  if (!user.isActive) throw new ApiError(403, 'Inactive user');
  return buildAuthResponse(user);
};
