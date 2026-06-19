const express = require('express');

const router = express.Router();
router.use('/auth', require('./auth.routes'));
router.use('/client', require('./clientDashboard.routes'));
router.use('/users', require('./user.routes'));
router.use('/clients', require('./client.routes'));
router.use('/products', require('./product.routes'));
router.use('/categories', require('./category.routes'));
router.use('/suppliers', require('./supplier.routes'));
router.use('/purchases', require('./purchase.routes'));
router.use('/waste', require('./waste.routes'));
router.use('/sales', require('./sale.routes'));
router.use('/stock', require('./stock.routes'));
router.use('/accounts', require('./account.routes'));
router.use('/reservations', require('./reservation.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/analytics', require('./analytics.routes'));

module.exports = router;
