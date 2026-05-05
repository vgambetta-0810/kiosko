const express = require('express');
const c = require('../controllers/user.controller');
const { auth, authorize } = require('../middlewares/auth');

const router = express.Router();
router.get('/me', auth, c.me);
router.get('/', auth, authorize('ADMIN'), c.list);
module.exports = router;
