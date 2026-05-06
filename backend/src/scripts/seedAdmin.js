require('dotenv').config();
const connectDB = require('../config/db');
const { ensureDefaultAdmin } = require('../services/bootstrap.service');

(async () => {
  await connectDB();
  const result = await ensureDefaultAdmin();
  if (result.created) console.log(`Admin created: ${result.email} / ${process.env.DEFAULT_ADMIN_PASSWORD || '1234'}`);
  else console.log('Admin already exists');
  process.exit(0);
})();
