require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { expireReservations } = require('./services/reservation.service');
const { ensureDefaultAdmin } = require('./services/bootstrap.service');

const port = process.env.PORT || 4000;

(async () => {
  await connectDB();
  const adminResult = await ensureDefaultAdmin();
  if (adminResult.created) console.log(`Default admin created: ${adminResult.email}`);
  setInterval(expireReservations, 60 * 60 * 1000);
  app.listen(port, () => console.log(`Server running on ${port}`));
})();
