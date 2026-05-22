const express = require('express');
const c = require('../controllers/analytics.controller');
const { auth, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/dashboard', auth, authorize('ADMIN', 'SELLER'), c.dashboard);
router.get('/filters', auth, authorize('ADMIN', 'SELLER'), c.filters);

module.exports = router;
