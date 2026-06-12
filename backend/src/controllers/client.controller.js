const asyncHandler = require('../utils/asyncHandler');
const clientService = require('../services/client.service');
const reservationService = require('../services/reservation.service');

exports.list = asyncHandler(async (req, res) => {
  const [clients, summary] = await Promise.all([
    clientService.listClients({ q: req.query.q }),
    clientService.getSummary()
  ]);
  res.json({ clients, summary });
});

exports.create = asyncHandler(async (req, res) => {
  const client = await clientService.createClient(req.body);
  const status = client.__created ? 201 : 200;
  delete client.__created;
  res.status(status).json(client);
});

exports.update = asyncHandler(async (req, res) => {
  res.json(await clientService.updateClient(req.params.id, req.body));
});

exports.reservations = asyncHandler(async (req, res) => {
  res.json(await reservationService.listReservations({ clientId: req.params.id, status: req.query.status }));
});

exports.products = asyncHandler(async (req, res) => {
  res.json(await clientService.listProductsByClient({ clientId: req.query.clientId, productId: req.query.productId }));
});

exports.balanceMovements = asyncHandler(async (req, res) => {
  res.json(await clientService.getBalanceMovements(req.params.id));
});

exports.chargeBalance = asyncHandler(async (req, res) => {
  const result = await clientService.chargeBalance({
    clientId: req.params.id,
    amount: req.body.amount,
    paymentMethod: req.body.paymentMethod,
    notes: req.body.notes,
    createdBy: req.user.id
  });
  res.status(201).json(result);
});
