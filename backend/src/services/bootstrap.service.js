const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { roles } = require('../constants/enums');

exports.ensureDefaultAdmin = async () => {
  const email = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD || '1234';

  const existing = await User.findOne({ email });
  if (existing) return { created: false, email };

  const hash = await bcrypt.hash(password, 10);
  await User.create({
    name: 'Administrador',
    email,
    password: hash,
    role: roles.ADMIN
  });

  return { created: true, email };
};
