const express = require('express');
const c = require('../controllers/client.controller');
const { auth, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { balanceChargeSchema, balanceOperationSchema, clientLinkUserSchema, clientSchema, clientUpdateSchema } = require('../validators/schemas');

const router = express.Router();

router.get('/', auth, authorize('ADMIN', 'SELLER'), c.list);
router.post('/', auth, authorize('ADMIN', 'SELLER'), validate(clientSchema), c.create);
router.get('/products', auth, authorize('ADMIN', 'SELLER'), c.products);
router.get('/unlinked-users', auth, authorize('ADMIN'), c.unlinkedUsers);
router.get('/:id/link-candidates', auth, authorize('ADMIN'), c.linkCandidates);
router.post('/:id/link-user', auth, authorize('ADMIN'), validate(clientLinkUserSchema), c.linkUser);
router.patch('/:id', auth, authorize('ADMIN', 'SELLER'), validate(clientUpdateSchema), c.update);
router.get('/:id/reservations', auth, authorize('ADMIN', 'SELLER'), c.reservations);
router.get('/:id/balance-movements', auth, authorize('ADMIN', 'SELLER'), c.balanceMovements);
router.post('/:id/balance-charge', auth, authorize('ADMIN'), validate(balanceChargeSchema), c.chargeBalance);
router.post('/:id/balance-movements', auth, authorize('ADMIN'), validate(balanceOperationSchema), c.modifyBalance);

module.exports = router;
