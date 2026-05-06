const express = require('express');
const c = require('../controllers/sale.controller');
const { auth, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { saleSchema } = require('../validators/schemas');

const router = express.Router();
router.get('/', auth, authorize('ADMIN', 'SELLER'), c.list);
router.get('/clients', auth, authorize('ADMIN', 'SELLER'), c.clients);
router.get('/:id', auth, authorize('ADMIN', 'SELLER'), c.detail);
router.post('/', auth, authorize('ADMIN', 'SELLER'), validate(saleSchema), c.create);
router.delete('/:id', auth, authorize('ADMIN'), c.remove);
module.exports = router;
