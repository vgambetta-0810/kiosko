const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Op, User, Account, AccountMovement, Reservation, Notification, Product } = require('../models');
const clientService = require('../services/client.service');
const reservationService = require('../services/reservation.service');
const { getOrCreateAccount } = require('../services/account.service');

const publicEmail = (email) => (email?.endsWith('@clientes.local') ? '' : email || '');

const getVisibleClientIds = async (user) => {
  if (user.role === 'CLIENT') return [user.id];
  if (user.role === 'PARENT') {
    const children = await User.findAll({ where: { parentId: user.id, role: 'CLIENT', isActive: true }, attributes: ['id'] });
    return children.map((child) => child.id);
  }
  throw new ApiError(403, 'Prohibido');
};

const getClientProfiles = async (clientIds) => {
  if (!clientIds.length) return [];
  const clients = await User.findAll({
    where: { id: clientIds, role: 'CLIENT' },
    attributes: ['id', 'name', 'email', 'phone', 'cardId', 'isActive']
  });
  const accounts = await Account.findAll({ where: { ownerType: 'CLIENT', ownerId: clientIds } });
  const balances = new Map(accounts.map((account) => [account.ownerId, Number(account.balance || 0)]));
  return clients.map((client) => ({
    ...client.toJSON(),
    email: publicEmail(client.email),
    balance: balances.get(client.id) || 0
  }));
};

const getSingleClientId = async (user) => {
  const clientIds = await getVisibleClientIds(user);
  if (clientIds.length !== 1) throw new ApiError(400, 'Selecciona una cuenta de cliente para operar');
  return clientIds[0];
};

exports.me = asyncHandler(async (req, res) => {
  const clientIds = await getVisibleClientIds(req.user);
  const [clients, accounts, activeReservations, productRecords, unreadNotifications] = await Promise.all([
    getClientProfiles(clientIds),
    clientIds.length ? Account.findAll({ where: { ownerType: 'CLIENT', ownerId: clientIds } }) : [],
    clientIds.length ? Reservation.count({ where: { clientId: clientIds, status: 'ACTIVE' } }) : 0,
    clientIds.length ? clientService.listProductsByClient({ clientId: clientIds }) : [],
    Notification.count({ where: { userId: req.user.id, read: false } })
  ]);

  const balance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: publicEmail(req.user.email),
      role: req.user.role
    },
    clients,
    summary: {
      balance,
      activeReservations,
      productRecords: productRecords.length,
      unreadNotifications
    }
  });
});

exports.reservations = asyncHandler(async (req, res) => {
  const clientIds = await getVisibleClientIds(req.user);
  if (!clientIds.length) return res.json([]);
  res.json(await reservationService.listReservations({ clientId: clientIds, status: req.query.status }));
});

exports.products = asyncHandler(async (req, res) => {
  const products = await Product.findAll({
    where: { isActive: true },
    attributes: ['id', 'name', 'category', 'sku', 'codigoBarras', 'price', 'stock', 'isActive'],
    order: [['name', 'ASC']]
  });
  res.json(products);
});

exports.productHistory = asyncHandler(async (req, res) => {
  const clientIds = await getVisibleClientIds(req.user);
  if (!clientIds.length) return res.json([]);
  res.json(await clientService.listProductsByClient({ clientId: clientIds, productId: req.query.productId }));
});

exports.createReservation = asyncHandler(async (req, res) => {
  const clientId = await getSingleClientId(req.user);
  const product = await Product.findOne({ where: { id: req.body.productId, isActive: true } });
  if (!product) throw new ApiError(404, 'Producto no encontrado');
  const quantity = Number(req.body.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) throw new ApiError(400, 'La cantidad debe ser mayor a cero');
  if (Number(product.stock || 0) < quantity) throw new ApiError(400, 'Stock insuficiente para reservar este producto');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + Number(product.delayDays || process.env.RESERVATION_DEFAULT_DAYS || 7));

  const reservation = await reservationService.createReservation({
    client: clientId,
    items: [{ product: product.id, quantity, price: Number(product.price || 0) }],
    expiresAt,
    userId: req.user.id
  });
  res.status(201).json(reservation);
});

exports.cancelReservation = asyncHandler(async (req, res) => {
  const clientId = await getSingleClientId(req.user);
  const reservation = await reservationService.updateReservationStatus({
    id: req.params.id,
    status: 'CANCELLED',
    userId: req.user.id,
    clientId
  });
  res.json(reservation);
});

exports.balance = asyncHandler(async (req, res) => {
  const clientIds = await getVisibleClientIds(req.user);
  if (!clientIds.length) return res.json({ account: { balance: 0 }, movements: [] });

  if (clientIds.length === 1) {
    const accountData = await clientService.getBalanceMovements(clientIds[0]);
    return res.json(accountData);
  }

  await Promise.all(clientIds.map((clientId) => getOrCreateAccount('CLIENT', clientId)));
  const accounts = await Account.findAll({ where: { ownerType: 'CLIENT', ownerId: clientIds } });
  const accountIds = accounts.map((account) => account.id);
  const movements = accountIds.length
    ? await AccountMovement.findAll({
        where: { accountId: accountIds },
        include: [{ model: User, as: 'createdBy', attributes: ['id', 'name'] }],
        order: [['createdAt', 'DESC']]
      })
    : [];

  res.json({
    account: {
      ownerType: 'CLIENT',
      balance: accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0)
    },
    movements
  });
});

exports.notifications = asyncHandler(async (req, res) => {
  res.json(await Notification.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] }));
});

exports.chargeBalance = asyncHandler(async (req, res) => {
  const clientId = await getSingleClientId(req.user);
  const result = await clientService.chargeBalance({
    clientId,
    amount: req.body.amount,
    paymentMethod: req.body.paymentMethod,
    notes: req.body.notes || req.body.note || '',
    createdBy: req.user.id
  });
  res.status(201).json(result);
});
