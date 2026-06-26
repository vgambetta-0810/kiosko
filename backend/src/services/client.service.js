const { createHash } = require('crypto');
const { Op, User, Account, AccountMovement, Reservation, Sale, Product, Notification, ClientMergeAudit } = require('../models');
const { addMovement, getOrCreateAccount } = require('./account.service');
const { withTransaction } = require('./stock.service');
const ApiError = require('../utils/ApiError');
const { normalizeOptionName } = require('../utils/saleOptions');

const CLIENT_ATTRIBUTES = ['id', 'name', 'email', 'phone', 'cardId', 'isActive', 'mergedIntoClientId', 'mergedAt', 'createdAt', 'updatedAt'];
const CLIENT_MATCH_ATTRIBUTES = [...CLIENT_ATTRIBUTES, 'password', 'googleId', 'role'];

const publicEmail = (email) => (email?.endsWith('@clientes.local') ? '' : email || '');
const hasAccessAccount = (client) => Boolean(client.password || client.googleId);

const normalizeIdentityKey = (value) =>
  normalizeOptionName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');

const normalizeIdentityCompact = (value) => normalizeIdentityKey(value).replace(/[^a-z0-9]+/g, '');

const namesAreSimilar = (left = '', right = '') => {
  const a = normalizeIdentityCompact(left);
  const b = normalizeIdentityCompact(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  const leftTokens = normalizeIdentityKey(left).split(/\s+/).filter((token) => token.length >= 4);
  const rightTokens = new Set(normalizeIdentityKey(right).split(/\s+/).filter((token) => token.length >= 4));
  return leftTokens.some((token) => rightTokens.has(token));
};

const matchClientIdentity = (target, candidate) => {
  const reasons = [];
  const targetEmail = publicEmail(target.email).toLocaleLowerCase('es');
  const candidateEmail = publicEmail(candidate.email).toLocaleLowerCase('es');
  if (targetEmail && candidateEmail && targetEmail === candidateEmail) reasons.push('email');
  if (target.phone && candidate.phone && normalizeIdentityCompact(target.phone) === normalizeIdentityCompact(candidate.phone)) reasons.push('telefono');
  if (target.cardId && candidate.cardId && normalizeIdentityCompact(target.cardId) === normalizeIdentityCompact(candidate.cardId)) reasons.push('documento');
  if (target.name && candidate.name && namesAreSimilar(target.name, candidate.name)) reasons.push(normalizeIdentityCompact(target.name) === normalizeIdentityCompact(candidate.name) ? 'nombre' : 'nombre similar');
  return reasons;
};

const normalizeClient = async (client) => {
  const raw = client.toJSON ? client.toJSON() : client;
  const account = await getOrCreateAccount('CLIENT', raw.id);
  const accessAccount = hasAccessAccount(raw);
  return {
    ...raw,
    email: publicEmail(raw.email),
    balance: Number(account.balance || 0),
    hasAccessAccount: accessAccount,
    identityStatus: raw.mergedIntoClientId ? 'MERGED' : accessAccount ? 'WITH_ACCOUNT' : 'WITHOUT_ACCOUNT',
    possibleDuplicate: false,
    duplicateReasons: []
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

const getReservationCountByClient = async (clientIds, transaction) => {
  if (!clientIds.length) return new Map();
  const rows = await Reservation.findAll({
    where: { clientId: clientIds },
    attributes: ['clientId', [Reservation.sequelize.fn('COUNT', Reservation.sequelize.col('id')), 'reservationCount']],
    group: ['clientId'],
    raw: true,
    transaction
  });
  return new Map(rows.map((row) => [row.clientId, Number(row.reservationCount || 0)]));
};

const getMovementCountByClient = async (clientIds, transaction) => {
  if (!clientIds.length) return new Map();
  const accounts = await Account.findAll({ where: { ownerType: 'CLIENT', ownerId: clientIds }, transaction });
  if (!accounts.length) return new Map();
  const accountOwnerById = new Map(accounts.map((account) => [account.id, account.ownerId]));
  const rows = await AccountMovement.findAll({
    where: { accountId: accounts.map((account) => account.id) },
    attributes: ['accountId', [AccountMovement.sequelize.fn('COUNT', AccountMovement.sequelize.col('id')), 'movementCount']],
    group: ['accountId'],
    raw: true,
    transaction
  });
  const result = new Map();
  for (const row of rows) {
    const ownerId = accountOwnerById.get(row.accountId);
    result.set(ownerId, (result.get(ownerId) || 0) + Number(row.movementCount || 0));
  }
  return result;
};

const getClientActivitySummary = async (clientId, transaction) => {
  const account = await getOrCreateAccount('CLIENT', clientId, transaction);
  const [reservationCount, salesCount, movementCount] = await Promise.all([
    Reservation.count({ where: { clientId }, transaction }),
    Sale.count({ where: { clientId, deletedAt: null }, transaction }),
    AccountMovement.count({ where: { accountId: account.id }, transaction })
  ]);
  return {
    reservationCount,
    salesCount,
    movementCount,
    balance: Number(account.balance || 0)
  };
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
    hasAccessAccount: hasAccessAccount(raw),
    identityStatus: raw.mergedIntoClientId ? 'MERGED' : hasAccessAccount(raw) ? 'WITH_ACCOUNT' : 'WITHOUT_ACCOUNT'
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
    where: { role: 'CLIENT', mergedIntoClientId: null, [Op.or]: clauses },
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
  const client = await User.findOne({ where: { id: clientId, role: 'CLIENT', mergedIntoClientId: null }, transaction });
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

exports.listClients = async ({ q = '', identityStatus = '' } = {}) => {
  const query = normalizeOptionName(q);
  const where = {
    role: 'CLIENT',
    ...(identityStatus === 'MERGED' ? { mergedIntoClientId: { [Op.ne]: null } } : { mergedIntoClientId: null }),
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

  const clients = await User.findAll({ where, attributes: CLIENT_MATCH_ATTRIBUTES, order: [['name', 'ASC']] });
  const normalizedClients = addDuplicateIndicators(await Promise.all(clients.map(normalizeClient)));
  if (!identityStatus || identityStatus === 'ALL' || identityStatus === 'MERGED') return normalizedClients;
  return normalizedClients.filter((client) => client.identityStatus === identityStatus);
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

exports.listUnlinkedUsers = async ({ q = '' } = {}) => {
  const query = normalizeIdentityKey(q);
  const users = await User.findAll({
    where: { role: 'CLIENT', mergedIntoClientId: null, isActive: true },
    attributes: CLIENT_MATCH_ATTRIBUTES,
    order: [['createdAt', 'DESC']]
  });
  return users
    .filter((user) => hasAccessAccount(user))
    .map((user) => formatMatchCandidate(user))
    .filter((user) => {
      if (!query) return true;
      return [user.name, user.email, user.phone, user.cardId].filter(Boolean).some((value) => normalizeIdentityKey(value).includes(query));
    });
};

exports.getLinkCandidates = async ({ clientId, q = '' }) => {
  const target = await User.findOne({ where: { id: clientId, role: 'CLIENT', mergedIntoClientId: null }, attributes: CLIENT_MATCH_ATTRIBUTES });
  if (!target) throw new ApiError(404, 'Cliente no encontrado');

  const query = normalizeIdentityKey(q);
  const clients = await User.findAll({
    where: { role: 'CLIENT', id: { [Op.ne]: clientId }, mergedIntoClientId: null, isActive: true },
    attributes: CLIENT_MATCH_ATTRIBUTES,
    order: [['createdAt', 'DESC']]
  });
  const candidates = clients
    .filter((client) => hasAccessAccount(client))
    .map((client) => {
      const raw = client.toJSON();
      const reasons = matchClientIdentity(target, raw);
      return {
        ...formatMatchCandidate(raw),
        matchReasons: reasons,
        suggested: reasons.length > 0
      };
    })
    .filter((candidate) => {
      if (!query) return true;
      return [candidate.name, candidate.email, candidate.phone, candidate.cardId].filter(Boolean).some((value) => normalizeIdentityKey(value).includes(query));
    })
    .sort((a, b) => Number(b.suggested) - Number(a.suggested) || new Date(b.createdAt) - new Date(a.createdAt));

  const ids = candidates.map((candidate) => candidate.id);
  const [salesCountByClient, reservationCountByClient, movementCountByClient] = await Promise.all([
    getSalesCountByClient(ids),
    getReservationCountByClient(ids),
    getMovementCountByClient(ids)
  ]);

  return {
    client: await normalizeClient(target),
    clientSummary: await getClientActivitySummary(target.id),
    candidates: candidates.map((candidate) => ({
      ...candidate,
      salesCount: salesCountByClient.get(candidate.id) || 0,
      reservationCount: reservationCountByClient.get(candidate.id) || 0,
      movementCount: movementCountByClient.get(candidate.id) || 0
    }))
  };
};

const createMergedEmail = (clientId) => `cliente-fusionado-${clientId}@clientes.local`;

exports.linkUserAccount = async ({ clientId, userId, mergeClientId = '', adminId }) => {
  const linked = await withTransaction(async (transaction) => {
    const finalClient = await User.findOne({ where: { id: clientId, role: 'CLIENT', mergedIntoClientId: null }, transaction });
    if (!finalClient) throw new ApiError(404, 'Cliente destino no encontrado');

    const linkedUser = await User.findOne({ where: { id: userId, role: 'CLIENT', mergedIntoClientId: null }, transaction });
    if (!linkedUser) throw new ApiError(404, 'Cuenta de cliente no encontrada');
    if (finalClient.id === linkedUser.id) throw new ApiError(400, 'La cuenta ya corresponde a este cliente');
    if (!hasAccessAccount(linkedUser)) throw new ApiError(400, 'La cuenta seleccionada no tiene acceso de usuario para vincular');
    if (hasAccessAccount(finalClient)) throw new ApiError(409, 'El cliente destino ya tiene una cuenta asociada');

    const duplicateClientId = mergeClientId || linkedUser.id;
    if (duplicateClientId !== linkedUser.id) {
      const duplicate = await User.findOne({ where: { id: duplicateClientId, role: 'CLIENT', mergedIntoClientId: null }, transaction });
      if (!duplicate) throw new ApiError(404, 'Cliente duplicado a fusionar no encontrado');
      if (duplicate.id !== linkedUser.id) throw new ApiError(400, 'En este modelo la cuenta y el cliente duplicado deben ser el mismo registro');
    }

    const finalPublicEmail = publicEmail(finalClient.email);
    const linkedPublicEmail = publicEmail(linkedUser.email);
    const linkedPassword = linkedUser.password;
    const linkedGoogleId = linkedUser.googleId;
    if (finalPublicEmail && linkedPublicEmail && finalPublicEmail !== linkedPublicEmail) {
      throw new ApiError(409, 'El cliente destino ya tiene un email diferente');
    }

    const before = {
      finalClient: {
        id: finalClient.id,
        name: finalClient.name,
        email: publicEmail(finalClient.email),
        phone: finalClient.phone,
        cardId: finalClient.cardId
      },
      linkedUser: {
        id: linkedUser.id,
        name: linkedUser.name,
        email: publicEmail(linkedUser.email),
        phone: linkedUser.phone,
        cardId: linkedUser.cardId
      },
      finalSummary: await getClientActivitySummary(finalClient.id, transaction),
      linkedSummary: await getClientActivitySummary(linkedUser.id, transaction)
    };

    const finalAccount = await getOrCreateAccount('CLIENT', finalClient.id, transaction);
    const sourceAccount = await Account.findOne({ where: { ownerType: 'CLIENT', ownerId: linkedUser.id }, transaction });
    if (sourceAccount && sourceAccount.id !== finalAccount.id) {
      await AccountMovement.update({ accountId: finalAccount.id }, { where: { accountId: sourceAccount.id }, transaction });
      finalAccount.balance = Number(finalAccount.balance || 0) + Number(sourceAccount.balance || 0);
      await finalAccount.save({ transaction });
      await sourceAccount.destroy({ transaction });
    }

    await Promise.all([
      Reservation.update({ clientId: finalClient.id }, { where: { clientId: linkedUser.id }, transaction }),
      Sale.update({ clientId: finalClient.id }, { where: { clientId: linkedUser.id }, transaction }),
      Notification.update({ userId: finalClient.id }, { where: { userId: linkedUser.id }, transaction })
    ]);

    await linkedUser.update(
      {
        email: createMergedEmail(linkedUser.id),
        password: null,
        googleId: null,
        isActive: false,
        mergedIntoClientId: finalClient.id,
        mergedAt: new Date()
      },
      { transaction }
    );

    await finalClient.update(
      {
        name: finalClient.name || linkedUser.name,
        email: linkedPublicEmail || finalClient.email,
        password: linkedPassword || finalClient.password,
        googleId: linkedGoogleId || finalClient.googleId,
        phone: finalClient.phone || linkedUser.phone || null,
        cardId: finalClient.cardId || linkedUser.cardId || null,
        age: finalClient.age || linkedUser.age || null,
        parentId: finalClient.parentId || linkedUser.parentId || null,
        isActive: true
      },
      { transaction }
    );

    await ClientMergeAudit.create(
      {
        adminId,
        finalClientId: finalClient.id,
        linkedUserId: linkedUser.id,
        mergedClientId: linkedUser.id,
        action: 'LINK_USER',
        snapshot: before
      },
      { transaction }
    );

    return finalClient.reload({ transaction });
  });

  return normalizeClient(linked);
};

exports.updateClient = async (id, payload) => {
  const client = await User.findOne({ where: { id, role: 'CLIENT', mergedIntoClientId: null } });
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
  const [totalClients, activeReservations, accounts, visibleClients] = await Promise.all([
    User.count({ where: { role: 'CLIENT', isActive: true, mergedIntoClientId: null } }),
    Reservation.count({ where: { status: 'ACTIVE' } }),
    Account.findAll({ where: { ownerType: 'CLIENT' } }),
    User.findAll({ where: { role: 'CLIENT', mergedIntoClientId: null }, attributes: CLIENT_MATCH_ATTRIBUTES })
  ]);

  const balances = accounts.map((account) => Number(account.balance || 0));
  const clientsWithDuplicates = addDuplicateIndicators(visibleClients.map((client) => ({ ...client.toJSON(), email: publicEmail(client.email), hasAccessAccount: hasAccessAccount(client) })));
  return {
    totalClients,
    clientsWithBalance: balances.filter((balance) => balance > 0).length,
    activeReservations,
    totalBalance: balances.filter((balance) => balance > 0).reduce((sum, balance) => sum + balance, 0),
    possibleDuplicates: clientsWithDuplicates.filter((client) => client.possibleDuplicate).length
  };
};

exports.getBalanceMovements = async (clientId) => {
  const client = await User.findOne({ where: { id: clientId, role: 'CLIENT', mergedIntoClientId: null }, attributes: CLIENT_ATTRIBUTES });
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
  const client = await User.findOne({ where: { id: clientId, role: 'CLIENT', mergedIntoClientId: null } });
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

const addDuplicateIndicators = (clients) =>
  clients.map((client) => {
    if (client.mergedIntoClientId) return { ...client, identityStatus: 'MERGED' };

    const matches = clients
      .filter((candidate) => candidate.id !== client.id && !candidate.mergedIntoClientId)
      .map((candidate) => ({ candidate, reasons: matchClientIdentity(client, candidate) }))
      .filter(({ candidate, reasons }) => reasons.length && (client.hasAccessAccount !== candidate.hasAccessAccount || !client.hasAccessAccount));

    if (!matches.length) return client;
    return {
      ...client,
      identityStatus: client.hasAccessAccount ? 'WITH_ACCOUNT' : 'POSSIBLE_DUPLICATE',
      possibleDuplicate: true,
      duplicateReasons: [...new Set(matches.flatMap((match) => match.reasons))]
    };
  });

exports.modifyBalance = async ({ clientId, operation, amount, paymentMethod = '', notes = '', createdBy }) => {
  const client = await User.findOne({ where: { id: clientId, role: 'CLIENT', mergedIntoClientId: null } });
  if (!client) throw new ApiError(404, 'Cliente no encontrado');

  return withTransaction(async (session) => {
    const account = await getOrCreateAccount('CLIENT', clientId, session);
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0) throw new ApiError(400, 'El monto no es válido');

    if (operation === 'RECHARGE') {
      if (numericAmount <= 0) throw new ApiError(400, 'El monto debe ser mayor a cero');
      return addMovement({
        ownerType: 'CLIENT',
        ownerId: clientId,
        type: 'RECHARGE',
        amount: numericAmount,
        createdBy,
        session,
        notes: [paymentMethod, notes].filter(Boolean).join(' - ')
      });
    }

    if (operation === 'DEDUCTION') {
      if (numericAmount <= 0) throw new ApiError(400, 'El monto debe ser mayor a cero');
      return addMovement({
        ownerType: 'CLIENT',
        ownerId: clientId,
        type: 'DEDUCTION',
        amount: numericAmount,
        createdBy,
        session,
        requireAvailableBalance: true,
        notes
      });
    }

    if (operation === 'ADJUSTMENT') {
      const currentBalance = Number(account.balance || 0);
      const delta = numericAmount - currentBalance;
      if (delta === 0) throw new ApiError(400, 'El saldo indicado coincide con el saldo actual');
      return addMovement({
        ownerType: 'CLIENT',
        ownerId: clientId,
        type: 'ADJUSTMENT',
        amount: Math.abs(delta),
        delta,
        createdBy,
        session,
        notes
      });
    }

    throw new ApiError(400, 'Operación de saldo inválida');
  });
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
