const bcrypt = require('bcryptjs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { Op } = require('../models');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        let user = await User.findOne({ where: { [Op.or]: [{ googleId: profile.id }, { email }] } });
        if (!user) {
          user = await User.create({ name: profile.displayName, email, googleId: profile.id, role: 'CLIENT' });
        } else if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }
        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

exports.register = async ({ name, email, password, role, age, parent }) => {
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hash, role, age, parentId: parent || null });
  return { user, token: signToken({ sub: user.id, role: user.role }) };
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });
  if (!user || !user.password) throw new ApiError(401, 'Invalid credentials');
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new ApiError(401, 'Invalid credentials');
  return { user, token: signToken({ sub: user.id, role: user.role }) };
};

exports.passport = passport;
