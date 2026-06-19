const bcrypt = require('bcryptjs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { OAuth2Client } = require('google-auth-library');
const { Op } = require('../models');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const clientService = require('./client.service');
const { withTransaction } = require('./stock.service');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const isInternalClientEmail = (email = '') => email.endsWith('@clientes.local');

const buildAuthPayload = (user) => ({ user, token: signToken({ sub: user.id, role: user.role }) });

const findExistingEmailOwner = async (email, transaction) =>
  User.findOne({ where: { email }, transaction });

const completeClientRegistration = async ({ clientId, name, email, passwordHash, googleId = null, transaction }) => {
  const user = await User.findOne({ where: { id: clientId, role: 'CLIENT' }, transaction });
  if (!user) throw new ApiError(404, 'Cliente a vincular no encontrado');
  if (user.email && !isInternalClientEmail(user.email) && user.email !== email) {
    throw new ApiError(409, 'La ficha seleccionada ya tiene otra cuenta asociada');
  }
  const emailOwner = await findExistingEmailOwner(email, transaction);
  if (emailOwner && emailOwner.id !== user.id) throw new ApiError(409, 'El email ya pertenece a otra persona registrada');

  await user.update(
    {
      name: user.name || name,
      email,
      password: passwordHash || user.password,
      googleId: googleId || user.googleId,
      role: 'CLIENT',
      isActive: true
    },
    { transaction }
  );
  return user;
};

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
          const matches = await clientService.findClientMatches({ name: profile.displayName, email }, { includeWeakName: false });
          const linkable = matches.find((match) => !match.hasAccessAccount);
          if (linkable) {
            user = await withTransaction((transaction) =>
              completeClientRegistration({
                clientId: linkable.id,
                name: profile.displayName,
                email: email.trim().toLowerCase(),
                googleId: profile.id,
                transaction
              })
            );
          } else {
            user = await User.create({ name: profile.displayName, email, googleId: profile.id, role: 'CLIENT' });
          }
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

exports.register = async ({ name, email, password, role, age, parent, linkClientId }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const hash = await bcrypt.hash(password, 10);
  if (role !== 'CLIENT' || parent) {
    const existing = await User.findOne({ where: { email: normalizedEmail } });
    if (existing) throw new ApiError(409, 'El email ya pertenece a una cuenta registrada');
    const user = await User.create({ name, email: normalizedEmail, password: hash, role, age, parentId: parent || null });
    return buildAuthPayload(user);
  }

  if (linkClientId) {
    const user = await withTransaction((transaction) =>
      completeClientRegistration({ clientId: linkClientId, name, email: normalizedEmail, passwordHash: hash, transaction })
    );
    return buildAuthPayload(user);
  }

  const existing = await User.findOne({ where: { email: normalizedEmail } });
  if (existing) {
    if (existing.role === 'CLIENT' && isInternalClientEmail(existing.email)) {
      const user = await withTransaction((transaction) =>
        completeClientRegistration({ clientId: existing.id, name, email: normalizedEmail, passwordHash: hash, transaction })
      );
      return buildAuthPayload(user);
    }
    throw new ApiError(409, 'El email ya pertenece a una cuenta registrada');
  }

  const matches = await clientService.findClientMatches({ name, email: normalizedEmail });
  const linkableMatches = matches.filter((match) => !match.hasAccessAccount);
  if (linkableMatches.length) {
    throw new ApiError(409, 'Ya existe una ficha de cliente que podría corresponder a esta persona. Confirmá si querés vincularla.', {
      code: 'CLIENT_IDENTITY_MATCH',
      matches: linkableMatches
    });
  }

  const user = await User.create({ name, email: normalizedEmail, password: hash, role, age, parentId: parent || null });
  return buildAuthPayload(user);
};

exports.login = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user || !user.password) throw new ApiError(401, 'Invalid credentials');
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new ApiError(401, 'Invalid credentials');
  return buildAuthPayload(user);
};

exports.loginWithGoogleToken = async ({ idToken, linkClientId }) => {
  let profile;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    profile = ticket.getPayload();
  } catch (_error) {
    throw new ApiError(400, 'Token de Google inválido');
  }
  const normalizedEmail = profile?.email?.trim().toLowerCase();
  const googleId = profile?.sub;
  const name = profile?.name || [profile?.given_name, profile?.family_name].filter(Boolean).join(' ') || normalizedEmail;
  if (!normalizedEmail || !googleId) throw new ApiError(400, 'Token de Google inválido');

  if (linkClientId) {
    const user = await withTransaction((transaction) =>
      completeClientRegistration({ clientId: linkClientId, name, email: normalizedEmail, googleId, transaction })
    );
    return buildAuthPayload(user);
  }

  let user = await User.findOne({ where: { [Op.or]: [{ googleId }, { email: normalizedEmail }] } });
  if (user) {
    if (!user.googleId) await user.update({ googleId });
    return buildAuthPayload(user);
  }

  const matches = await clientService.findClientMatches({ name, email: normalizedEmail });
  const linkableMatches = matches.filter((match) => !match.hasAccessAccount);
  if (linkableMatches.length) {
    throw new ApiError(409, 'Ya existe una ficha de cliente que podría corresponder a esta persona. Confirmá si querés vincularla.', {
      code: 'CLIENT_IDENTITY_MATCH',
      matches: linkableMatches
    });
  }

  user = await User.create({ name, email: normalizedEmail, googleId, role: 'CLIENT' });
  return buildAuthPayload(user);
};

exports.passport = passport;
