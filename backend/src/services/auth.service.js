const bcrypt = require('bcryptjs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { signToken } = require('../utils/jwt');

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
        let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });
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
  const user = await User.create({ name, email, password: hash, role, age, parent });
  return { user, token: signToken({ sub: user._id, role: user.role }) };
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user || !user.password) throw new Error('Invalid credentials');
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new Error('Invalid credentials');
  return { user, token: signToken({ sub: user._id, role: user.role }) };
};

exports.passport = passport;
