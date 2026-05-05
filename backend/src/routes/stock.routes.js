const express = require('express');
const c = require('../controllers/stock.controller');
const { auth, authorize } = require('../middlewares/auth');
const router = express.Router();
router.get('/movements', auth, authorize('ADMIN', 'SELLER'), c.list);
module.exports = router;
