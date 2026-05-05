const express = require('express');
const c = require('../controllers/account.controller');
const { auth, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { accountMovementSchema } = require('../validators/schemas');

const router = express.Router();
router.post('/movements', auth, authorize('ADMIN', 'SELLER'), validate(accountMovementSchema), c.addMovement);
router.get('/:ownerType/:ownerId/movements', auth, c.movementsByOwner);
module.exports = router;
