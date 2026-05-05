const express = require('express');
const c = require('../controllers/purchase.controller');
const { auth, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { purchaseSchema } = require('../validators/schemas');

const router = express.Router();
router.get('/', auth, authorize('ADMIN', 'SELLER'), c.list);
router.post('/', auth, authorize('ADMIN', 'SELLER'), validate(purchaseSchema), c.create);
module.exports = router;
