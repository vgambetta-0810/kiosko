const express = require('express');
const c = require('../controllers/purchase.controller');
const { auth, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { purchaseSchema } = require('../validators/schemas');

const router = express.Router();
router.get('/', auth, authorize('ADMIN'), c.list);
router.get('/:id', auth, authorize('ADMIN'), c.get);
router.post('/', auth, authorize('ADMIN'), validate(purchaseSchema), c.create);
router.patch('/:id', auth, authorize('ADMIN'), validate(purchaseSchema.fork(['supplierId', 'items'], (schema) => schema.optional())), c.update);
router.post('/:id/confirm', auth, authorize('ADMIN'), c.confirm);
router.post('/:id/cancel', auth, authorize('ADMIN'), c.cancel);
module.exports = router;
