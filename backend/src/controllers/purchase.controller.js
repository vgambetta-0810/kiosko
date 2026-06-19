const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/purchase.service');

exports.create = asyncHandler(async (req, res) => {
  const purchase = await service.createPurchase({ ...req.body, createdBy: req.user.id });
  res.status(201).json(purchase);
});
exports.list = asyncHandler(async (req, res) => {
  res.json(await service.listPurchases(req.query));
});
exports.get = asyncHandler(async (req, res) => {
  res.json(await service.getPurchase(req.params.id));
});
exports.update = asyncHandler(async (req, res) => {
  res.json(await service.updatePurchase({ id: req.params.id, ...req.body }));
});
exports.confirm = asyncHandler(async (req, res) => {
  res.json(await service.confirmPurchase({ id: req.params.id, userId: req.user.id }));
});
exports.cancel = asyncHandler(async (req, res) => {
  res.json(await service.cancelPurchase({ id: req.params.id }));
});
