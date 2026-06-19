const express = require('express');
const controller = require('../controllers/waste.controller');
const { auth, authorize } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { wasteSchema } = require('../validators/schemas');

const router = express.Router();
router.get('/', auth, authorize('ADMIN'), controller.list);
router.get('/:id', auth, authorize('ADMIN'), controller.get);
router.post('/', auth, authorize('ADMIN'), validate(wasteSchema), controller.create);

module.exports = router;
