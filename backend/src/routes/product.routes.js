const express = require('express');
const c = require('../controllers/product.controller');
const { auth, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { productSchema } = require('../validators/schemas');
const { productSuppliers } = require('../controllers/supplier.controller');

const router = express.Router();
router.get('/', auth, c.list);
router.get('/lookup', auth, authorize('ADMIN', 'SELLER'), c.lookup);
router.get('/:productId/suppliers', auth, authorize('ADMIN'), productSuppliers);
router.post('/', auth, authorize('ADMIN'), validate(productSchema), c.create);
router.patch('/:id', auth, authorize('ADMIN'), c.update);
router.delete('/:id', auth, authorize('ADMIN'), c.remove);
module.exports = router;
