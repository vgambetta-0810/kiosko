const express = require('express');
const c = require('../controllers/notification.controller');
const { auth } = require('../middlewares/auth');
const router = express.Router();
router.get('/mine', auth, c.listMine);
module.exports = router;
