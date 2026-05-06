const express = require('express');
const c = require('../controllers/stock.controller');
const { auth, authorize } = require('../middlewares/auth');
const router = express.Router();
router.get('/movements', auth, authorize('ADMIN', 'SELLER'), c.list);
router.get('/product/:id', auth, authorize('ADMIN', 'SELLER'), c.getProductStock);
router.post('/adjust', auth, authorize('ADMIN'), c.adjust);
module.exports = router;
