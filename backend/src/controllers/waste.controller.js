const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/waste.service');

exports.list = asyncHandler(async (req, res) => {
  res.json(await service.listWaste(req.query));
});

exports.get = asyncHandler(async (req, res) => {
  res.json(await service.getWaste(req.params.id));
});

exports.create = asyncHandler(async (req, res) => {
  const waste = await service.createWaste({ ...req.body, createdBy: req.user.id });
  res.status(201).json(waste);
});
