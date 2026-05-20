const express = require('express');
const c = require('../controllers/category.controller');
const { auth, authorize } = require('../middlewares/auth');

const router = express.Router();
router.get('/', auth, c.list);
router.post('/', auth, authorize('ADMIN'), c.create);

module.exports = router;
