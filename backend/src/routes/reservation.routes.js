const express = require('express');
const c = require('../controllers/reservation.controller');
const { auth, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { reservationSchema, reservationStatusSchema } = require('../validators/schemas');

const router = express.Router();
router.get('/', auth, c.list);
router.post('/', auth, authorize('ADMIN', 'SELLER', 'CLIENT'), validate(reservationSchema), c.create);
router.patch('/:id/status', auth, authorize('ADMIN', 'SELLER'), validate(reservationStatusSchema), c.updateStatus);
module.exports = router;
