const { createHash } = require('crypto');
const { Op, User, Account, AccountMovement, Reservation, Sale, Product } = require('../models');
const { addMovement, getOrCreateAccount } = require('./account.service');
const { withTransaction } = require('./stock.service');
const ApiError = require('../utils/ApiError');
const { normalizeOptionName } = require('../utils/saleOptions');

const CLIENT_ATTRIBUTES = ['id', 'name', 'email', 'phone', 'cardId', 'isActive', 'createdAt', 'updatedAt'];
const CLIENT_MATCH_ATTRIBUTES = [...CLIENT_ATTRIBUTES, 'password', 'googleId', 'role'];

const publicEmail = (email) => (email?.endsWith('@clientes.local') ? '' : email || '');
const hasAccessAccount = (client) => Boolean(client.password || client.googleId || !client.email?.endsWith('@clientes.local'));

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

const cleanIdentityInput = ({ name = '', email = '', phone = '', cardId = '' } = {}) => ({
  name: normalizeOptionName(name),
  email: normalizeOptionName(email).toLocaleLowerCase('es'),
  phone: normalizeOptionName(phone),
  cardId: normalizeOptionName(cardId)
});

const buildMatchWhere = ({ name, email, phone, cardId }, { includeWeakName = true } = {}) => {
  const clauses = [];
  if (email) clauses.push({ email });
  if (phone) clauses.push({ phone });
  if (cardId) clauses.push({ cardId });
  if (includeWeakName && name) clauses.push({ name });
  return clauses;
};

const getSalesCountByClient = async (clientIds, transaction) => {
  if (!clientIds.length) return new Map();
  const rows = await Sale.findAll({
    where: { clientId: clientIds, deletedAt: null },
    attributes: ['clientId', [Sale.sequelize.fn('COUNT', Sale.sequelize.col('id')), 'salesCount']],
    group: ['clientId'],
    raw: true,
    transaction
  });
  return new Map(rows.map((row) => [row.clientId, Number(row.salesCount || 0)]));
};

const formatMatchCandidate = (client, salesCount = 0) => {
  const raw = client.toJSON ? client.toJSON() : client;
  return {
    id: raw.id,
    name: raw.name,
    email: publicEmail(raw.email),
    phone: raw.phone || '',
    cardId: raw.cardId || '',
    createdAt: raw.createdAt,
    salesCount,
    hasAccessAccount: hasAccessAccount(raw)
  };
};

const addMatchReasons = (candidate, input) => {
  const reasons = [];
  if (input.email && candidate.email?.toLocaleLowerCase('es') === input.email) reasons.push('email');
  if (input.phone && candidate.phone === input.phone) reasons.push('telefono');
  if (input.cardId && candidate.cardId === input.cardId) reasons.push('documento');
  if (input.name && normalizeOptionName(candidate.name) === input.name) reasons.push('nombre');
  return { ...candidate, matchReasons: reasons };
};

exports.findClientMatches = async (payload, options = {}) => {
  const input = cleanIdentityInput(payload);
  const clauses = buildMatchWhere(input, options);
  if (!clauses.length) return [];

  const clients = await User.findAll({
    where: { role: 'CLIENT', [Op.or]: clauses },
    attributes: CLIENT_MATCH_ATTRIBUTES,
    order: [['createdAt', 'ASC']],
    transaction: options.transaction
  });
  const salesCountByClient = await getSalesCountByClient(clients.map((client) => client.id), options.transaction);
  return clients.map((client) => addMatchReasons(formatMatchCandidate(client, salesCountByClient.get(client.id) || 0), input));
};

const buildConflict = (message, matches) =>
  new ApiError(409, message, {
    code: 'CLIENT_IDENTITY_MATCH',
    matches
  });

const mergeClientFields = (client, { name, email, phone, cardId, isActive = true } = {}) => {
  const input = cleanIdentityInput({ name, email, phone, cardId });
  const updates = {};
  if (input.name && (!client.name || client.email?.endsWith('@clientes.local'))) updates.name = input.name;
  if (input.email && client.email?.endsWith('@clientes.local')) updates.email = input.email;
  if (input.phone && !client.phone) updates.phone = input.phone;
  if (input.cardId && !client.cardId) updates.cardId = input.cardId;
  if (isActive && !client.isActive) updates.isActive = true;
  return updates;
};

const linkExistingClient = async (clientId, payload, transaction) => {
  const client = await User.findOne({ where: { id: clientId, role: 'CLIENT' }, transaction });
  if (!client) throw new ApiError(404, 'Cliente a vincular no encontrado');

  const { email } = cleanIdentityInput(payload);
  if (email) {
    const emailOwner = await User.findOne({ where: { email, id: { [Op.ne]: client.id } }, transaction });
    if (emailOwner) throw new ApiError(409, 'El email ya pertenece a otra persona registrada');
  }

  const updates = mergeClientFields(client, payload);
  if (Object.keys(updates).length) await client.update(updates, { transaction });
  await getOrCreateAccount('CLIENT', client.id, transaction);
  return client.reload({ transaction });
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

exports.createClient = async ({ name, email = '', phone = '', cardId = '', isActive = true, duplicateAction = '', linkClientId = '' }) => {
  const normalizedName = normalizeOptionName(name);
  if (!normalizedName) throw new ApiError(400, 'El nombre del cliente es obligatorio');

  if (duplicateAction === 'cancel') throw new ApiError(409, 'Creación de cliente cancelada');

  if (duplicateAction === 'link') {
    if (!linkClientId) throw new ApiError(400, 'Debe indicar el cliente existente a vincular');
    const linked = await withTransaction((transaction) => linkExistingClient(linkClientId, { name, email, phone, cardId, isActive }, transaction));
    return { ...(await normalizeClient(linked)), __created: false, __linked: true };
  }

  const matches = await exports.findClientMatches({ name, email, phone, cardId });
  if (matches.length && duplicateAction !== 'create') {
    throw buildConflict('Se encontró una persona ya registrada en el sistema. ¿Desea vincular este cliente al usuario existente?', matches);
  }

  const { email: cleanEmail, phone: cleanPhone, cardId: cleanCardId } = cleanIdentityInput({ name, email, phone, cardId });

  const emailAlreadyUsed = cleanEmail ? await User.findOne({ where: { email: cleanEmail } }) : null;
  const internalEmail = cleanEmail && !emailAlreadyUsed ? cleanEmail : createInternalEmail(normalizedName, cleanPhone, cleanCardId);
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

exports.linkClientIdentity = async ({ clientId, payload }) => {
  const linked = await withTransaction((transaction) => linkExistingClient(clientId, payload, transaction));
  return normalizeClient(linked);
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
