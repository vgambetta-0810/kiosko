require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  await connectDB();
  const email = 'admin@kiosco.com';
  const exists = await User.findOne({ where: { email } });
  if (!exists) {
    await User.create({ name: 'Admin', email, password: await bcrypt.hash('admin1234', 10), role: 'ADMIN' });
    console.log('Admin created: admin@kiosco.com / admin1234');
  } else {
    console.log('Admin already exists');
  }
  process.exit(0);
})();
