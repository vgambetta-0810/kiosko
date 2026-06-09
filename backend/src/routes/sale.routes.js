const express = require('express');
const c = require('../controllers/sale.controller');
const { auth, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { saleSchema } = require('../validators/schemas');

const router = express.Router();
router.get('/', auth, authorize('ADMIN', 'SELLER'), c.list);
router.get('/clients', auth, authorize('ADMIN', 'SELLER'), c.clients);
router.post('/clients', auth, authorize('ADMIN', 'SELLER'), c.createClient);
router.get('/options/:kind', auth, authorize('ADMIN', 'SELLER'), c.options);
router.post('/options/:kind', auth, authorize('ADMIN', 'SELLER'), c.createOption);
router.get('/:id', auth, authorize('ADMIN', 'SELLER'), c.detail);
router.post('/', auth, authorize('ADMIN', 'SELLER'), validate(saleSchema), c.create);
router.delete('/:id', auth, authorize('ADMIN'), c.remove);
module.exports = router;
