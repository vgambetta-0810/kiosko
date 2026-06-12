const express = require('express');
const c = require('../controllers/clientDashboard.controller');
const { auth, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { balanceChargeSchema, clientReservationSchema } = require('../validators/schemas');

const router = express.Router();

router.get('/me', auth, authorize('CLIENT', 'PARENT'), c.me);
router.get('/me/reservations', auth, authorize('CLIENT', 'PARENT'), c.reservations);
router.post('/me/reservations', auth, authorize('CLIENT', 'PARENT'), validate(clientReservationSchema), c.createReservation);
router.patch('/me/reservations/:id/cancel', auth, authorize('CLIENT', 'PARENT'), c.cancelReservation);
router.get('/me/products', auth, authorize('CLIENT', 'PARENT'), c.products);
router.get('/me/product-history', auth, authorize('CLIENT', 'PARENT'), c.productHistory);
router.get('/me/balance', auth, authorize('CLIENT', 'PARENT'), c.balance);
router.get('/me/balance-movements', auth, authorize('CLIENT', 'PARENT'), c.balance);
router.post('/me/balance-charge', auth, authorize('CLIENT', 'PARENT'), validate(balanceChargeSchema), c.chargeBalance);
router.get('/me/notifications', auth, authorize('CLIENT', 'PARENT'), c.notifications);

module.exports = router;
