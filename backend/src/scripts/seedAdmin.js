require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const { roles } = require('../constants/enums');

(async () => {
  await connectDB();
  const email = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@gmail.com').trim().toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD || '1234';
  const exists = await User.findOne({ where: { email } });
  if (!exists) {
    await User.create({ name: 'Administrador', email, password: await bcrypt.hash(password, 10), role: roles.ADMIN });
    console.log(`Admin created: ${email} / ${password}`);
  } else {
    console.log('Admin already exists');
  }
  process.exit(0);
})();
