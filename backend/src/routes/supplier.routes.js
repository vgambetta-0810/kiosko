const express = require('express');
const c = require('../controllers/supplier.controller');
const { auth, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { supplierSchema } = require('../validators/schemas');

const router = express.Router();
router.get('/', auth, c.list);
router.post('/', auth, authorize('ADMIN'), validate(supplierSchema), c.create);
router.patch('/:id', auth, authorize('ADMIN'), c.update);
router.delete('/:id', auth, authorize('ADMIN'), c.remove);
module.exports = router;
