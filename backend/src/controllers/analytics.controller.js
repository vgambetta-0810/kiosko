const asyncHandler = require('../utils/asyncHandler');
const analyticsService = require('../services/analytics.service');

exports.dashboard = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboardAnalytics({
    preset: req.query.preset,
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    sellerId: req.query.sellerId,
    clientId: req.query.clientId
  });

  res.json(data);
});

exports.filters = asyncHandler(async (_req, res) => {
  const data = await analyticsService.getFiltersMetadata();
  res.json(data);
});
