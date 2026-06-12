const { createHash } = require('crypto');
const { Op, User, Account, AccountMovement, Reservation, Sale, Product } = require('../models');
const { addMovement, getOrCreateAccount } = require('./account.service');
const { withTransaction } = require('./stock.service');
const ApiError = require('../utils/ApiError');
const { normalizeOptionName } = require('../utils/saleOptions');

const CLIENT_ATTRIBUTES = ['id', 'name', 'email', 'phone', 'cardId', 'isActive', 'createdAt', 'updatedAt'];

const publicEmail = (email) => (email?.endsWith('@clientes.local') ? '' : email || '');

const normalizeClient = async (client) => {
  const raw = client.toJSON ? client.toJSON() : client;
  const account = await getOrCreateAccount('CLIENT', raw.id);
  return {
    ...raw,
    email: publicEmail(raw.email),
    balance: Number(account.balance || 0)
  };
};

const createInternalEmail = (name, phone = '', cardId = '') => {
  const key = normalizeOptionName(`${name} ${phone} ${cardId}`).toLocaleLowerCase('es');
  return `cliente-${createHash('sha256').update(key).digest('hex').slice(0, 24)}@clientes.local`;
};

exports.listClients = async ({ q = '' } = {}) => {
  const query = normalizeOptionName(q);
  const where = {
    role: 'CLIENT',
    ...(query
      ? {
          [Op.or]: [
            { name: { [Op.like]: `%${query}%` } },
            { email: { [Op.like]: `%${query}%` } },
            { phone: { [Op.like]: `%${query}%` } },
            { cardId: { [Op.like]: `%${query}%` } }
          ]
        }
      : {})
  };

  const clients = await User.findAll({ where, attributes: CLIENT_ATTRIBUTES, order: [['name', 'ASC']] });
  return Promise.all(clients.map(normalizeClient));
};

exports.createClient = async ({ name, email = '', phone = '', cardId = '', isActive = true }) => {
  const normalizedName = normalizeOptionName(name);
  if (!normalizedName) throw new ApiError(400, 'El nombre del cliente es obligatorio');

  const cleanEmail = normalizeOptionName(email).toLocaleLowerCase('es');
  const cleanPhone = normalizeOptionName(phone);
  const cleanCardId = normalizeOptionName(cardId);

  const duplicateWhere = [];
  if (cleanEmail) duplicateWhere.push({ email: cleanEmail });
  if (cleanPhone) duplicateWhere.push({ phone: cleanPhone });
  if (cleanCardId) duplicateWhere.push({ cardId: cleanCardId });
  duplicateWhere.push({ name: normalizedName });

  const existing = await User.findOne({ where: { role: 'CLIENT', [Op.or]: duplicateWhere } });
  if (existing) {
    if (!existing.isActive && isActive) await existing.update({ isActive: true });
    return { ...(await normalizeClient(existing)), __created: false };
  }

  const internalEmail = cleanEmail || createInternalEmail(normalizedName, cleanPhone, cleanCardId);
  let client;
  let created = true;
  try {
    client = await User.create({
      name: normalizedName,
      email: internalEmail,
      phone: cleanPhone || null,
      cardId: cleanCardId || null,
      isActive,
      role: 'CLIENT'
    });
  } catch (error) {
    if (error.name !== 'SequelizeUniqueConstraintError') throw error;
    client = await User.findOne({ where: { email: internalEmail, role: 'CLIENT' } });
    if (!client) throw error;
    created = false;
    if (!client.isActive && isActive) await client.update({ isActive: true, name: normalizedName });
  }
  await getOrCreateAccount('CLIENT', client.id);
  return { ...(await normalizeClient(client)), __created: created };
};

exports.updateClient = async (id, payload) => {
  const client = await User.findOne({ where: { id, role: 'CLIENT' } });
  if (!client) throw new ApiError(404, 'Cliente no encontrado');

  const updates = {};
  if (payload.name !== undefined) updates.name = normalizeOptionName(payload.name);
  if (payload.email !== undefined) updates.email = normalizeOptionName(payload.email).toLocaleLowerCase('es') || createInternalEmail(updates.name || client.name, payload.phone || client.phone, payload.cardId || client.cardId);
  if (payload.phone !== undefined) updates.phone = normalizeOptionName(payload.phone) || null;
  if (payload.cardId !== undefined) updates.cardId = normalizeOptionName(payload.cardId) || null;
  if (payload.isActive !== undefined) updates.isActive = Boolean(payload.isActive);
  if (!updates.name && payload.name !== undefined) throw new ApiError(400, 'El nombre del cliente es obligatorio');

  await client.update(updates);
  return normalizeClient(client);
};

exports.getSummary = async () => {
  const [totalClients, activeReservations, accounts] = await Promise.all([
    User.count({ where: { role: 'CLIENT', isActive: true } }),
    Reservation.count({ where: { status: 'ACTIVE' } }),
    Account.findAll({ where: { ownerType: 'CLIENT' } })
  ]);

  const balances = accounts.map((account) => Number(account.balance || 0));
  return {
    totalClients,
    clientsWithBalance: balances.filter((balance) => balance > 0).length,
    activeReservations,
    totalBalance: balances.filter((balance) => balance > 0).reduce((sum, balance) => sum + balance, 0)
  };
};

exports.getBalanceMovements = async (clientId) => {
  const client = await User.findOne({ where: { id: clientId, role: 'CLIENT' }, attributes: CLIENT_ATTRIBUTES });
  if (!client) throw new ApiError(404, 'Cliente no encontrado');
  const account = await getOrCreateAccount('CLIENT', clientId);
  const movements = await AccountMovement.findAll({
    where: { accountId: account.id },
    include: [{ model: User, as: 'createdBy', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']]
  });
  return { client: await normalizeClient(client), account, movements };
};

exports.chargeBalance = async ({ clientId, amount, paymentMethod, notes = '', createdBy }) => {
  const client = await User.findOne({ where: { id: clientId, role: 'CLIENT' } });
  if (!client) throw new ApiError(404, 'Cliente no encontrado');

  return withTransaction((session) =>
    addMovement({
      ownerType: 'CLIENT',
      ownerId: clientId,
      type: 'RECHARGE',
      amount,
      createdBy,
      session,
      notes: [paymentMethod, notes].filter(Boolean).join(' - ')
    })
  );
};

exports.listProductsByClient = async ({ clientId = '', productId = '' } = {}) => {
  const saleWhere = clientId ? { clientId } : {};
  const reservationWhere = clientId ? { clientId } : {};
  const [sales, reservations] = await Promise.all([
    Sale.findAll({
      where: { ...saleWhere, deletedAt: null },
      include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']]
    }),
    Reservation.findAll({
      where: reservationWhere,
      include: [{ model: User, as: 'client', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']]
    })
  ]);

  const productIds = [
    ...sales.flatMap((sale) => (sale.items || []).map((item) => item.productId)),
    ...reservations.flatMap((reservation) => (reservation.items || []).map((item) => item.product))
  ].filter(Boolean);
  const products = productIds.length
    ? await Product.findAll({ where: { id: productIds }, attributes: ['id', 'name', 'price', 'codigoBarras', 'sku'] })
    : [];
  const productsById = new Map(products.map((product) => [product.id, product.toJSON()]));

  const purchased = sales.flatMap((sale) =>
    (sale.items || []).map((item) => ({
      id: `sale-${sale.id}-${item.productId}`,
      client: sale.client,
      product: productsById.get(item.productId) || null,
      quantity: item.quantity,
      price: item.price,
      date: sale.createdAt,
      status: sale.status === 'PAID' ? 'COMPRADO' : 'PENDIENTE',
      source: 'sale'
    }))
  );

  const reserved = reservations.flatMap((reservation) =>
    (reservation.items || []).map((item) => ({
      id: `reservation-${reservation.id}-${item.product}`,
      client: reservation.client,
      product: productsById.get(item.product) || null,
      quantity: item.quantity,
      price: item.price,
      date: reservation.createdAt,
      status: reservation.status === 'RETIRED' ? 'RETIRADO' : reservation.status === 'CANCELLED' ? 'CANCELADO' : 'RESERVADO',
      source: 'reservation'
    }))
  );

  return [...purchased, ...reserved]
    .filter((item) => !productId || item.product?.id === productId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};
