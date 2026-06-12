const asyncHandler = require('../utils/asyncHandler');
const saleService = require('../services/sale.service');
const clientService = require('../services/client.service');
const { KINDS, createSaleOption, listSaleOptions, normalizeOptionName } = require('../utils/saleOptions');

const optionKinds = {
  'payment-methods': KINDS.PAYMENT_METHOD,
  'sale-types': KINDS.SALE_TYPE
};

exports.create = asyncHandler(async (req, res) => {
  const sale = await saleService.createSale({ ...req.body, sellerId: req.user._id });
  res.status(201).json(sale);
});

exports.list = asyncHandler(async (req, res) => {
  const sellerId = req.user.role === 'SELLER' ? req.user.id : req.query.sellerId;
  const sales = await saleService.listSales({
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    sellerId,
    clientId: req.query.clientId,
    status: req.query.status
  });
  res.json(sales);
});

exports.detail = asyncHandler(async (req, res) => {
  const sale = await saleService.getSaleById(req.params.id);
  res.json(sale);
});

exports.remove = asyncHandler(async (req, res) => {
  const sale = await saleService.softDeleteSale({ id: req.params.id, userId: req.user._id });
  res.json(sale);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const sale = await saleService.updateSaleStatus({ id: req.params.id, status: req.body.status, userId: req.user._id });
  res.json(sale);
});

exports.clients = asyncHandler(async (req, res) => {
  res.json(await clientService.listClients({ q: req.query.q }));
});

exports.createClient = asyncHandler(async (req, res) => {
  const client = await clientService.createClient({ name: req.body?.name });
  const status = client.__created ? 201 : 200;
  delete client.__created;
  res.status(status).json(client);
});

exports.options = asyncHandler(async (req, res) => {
  const kind = optionKinds[req.params.kind];
  if (!kind) return res.status(404).json({ message: 'Catalogo no encontrado' });
  res.json(await listSaleOptions({ kind, query: req.query.q }));
});

exports.createOption = asyncHandler(async (req, res) => {
  const kind = optionKinds[req.params.kind];
  if (!kind) return res.status(404).json({ message: 'Catalogo no encontrado' });
  const option = await createSaleOption({ kind, name: req.body?.name });
  res.status(201).json(option);
});
