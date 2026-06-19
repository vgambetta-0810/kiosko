const express = require('express');
const c = require('../controllers/supplier.controller');
const { auth, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { supplierSchema, productSupplierSchema } = require('../validators/schemas');

const router = express.Router();
router.get('/', auth, authorize('ADMIN'), c.list);
router.post('/', auth, authorize('ADMIN'), validate(supplierSchema), c.create);
router.patch('/:id', auth, authorize('ADMIN'), validate(supplierSchema.fork(['name'], (schema) => schema.optional())), c.update);
router.patch('/:id/status', auth, authorize('ADMIN'), c.status);
router.get('/:id/products', auth, authorize('ADMIN'), c.products);
router.post('/:id/products', auth, authorize('ADMIN'), validate(productSupplierSchema), c.addProduct);
router.patch('/:id/products/:productId', auth, authorize('ADMIN'), c.updateProduct);
router.delete('/:id/products/:productId', auth, authorize('ADMIN'), c.removeProduct);
module.exports = router;
