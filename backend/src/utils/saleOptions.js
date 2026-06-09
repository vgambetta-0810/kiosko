const { Op } = require('../models');
const SaleOption = require('../models/SaleOption');
const ApiError = require('./ApiError');

const KINDS = {
  PAYMENT_METHOD: 'PAYMENT_METHOD',
  SALE_TYPE: 'SALE_TYPE'
};

const DEFAULT_OPTIONS = [
  { kind: KINDS.PAYMENT_METHOD, code: 'CASH', name: 'Efectivo' },
  { kind: KINDS.PAYMENT_METHOD, code: 'TRANSFER', name: 'Transferencia' },
  { kind: KINDS.PAYMENT_METHOD, code: 'CARD', name: 'Tarjeta' },
  { kind: KINDS.PAYMENT_METHOD, code: 'MP', name: 'Mercado Pago' },
  { kind: KINDS.SALE_TYPE, code: 'PAID', name: 'Contado', requiresClient: false },
  { kind: KINDS.SALE_TYPE, code: 'PENDING', name: 'Fiado', requiresClient: true }
];

let optionQueue = Promise.resolve();
let defaultsQueue = Promise.resolve();

const normalizeOptionName = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const getOptionKey = (value) => normalizeOptionName(value).toLocaleLowerCase('es');

const toOptionCode = (value) =>
  normalizeOptionName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const inferRequiresClient = (name) => /fiad|pendient|cuenta\s*corriente|credito|crédito/i.test(name);

const ensureDefaultSaleOptions = () => {
  const operation = defaultsQueue.then(async () => {
    for (const option of DEFAULT_OPTIONS) {
      await SaleOption.findOrCreate({
        where: { kind: option.kind, code: option.code },
        defaults: {
          ...option,
          normalizedName: getOptionKey(option.name),
          requiresClient: Boolean(option.requiresClient)
        }
      });
    }
  });

  defaultsQueue = operation.catch(() => undefined);
  return operation;
};

const listSaleOptions = async ({ kind, query = '' }) => {
  await ensureDefaultSaleOptions();
  const normalizedQuery = normalizeOptionName(query);
  const where = {
    kind,
    isActive: true,
    ...(normalizedQuery ? { name: { [Op.like]: `%${normalizedQuery}%` } } : {})
  };
  return SaleOption.findAll({ where, order: [['name', 'ASC']] });
};

const findSaleOptionByCode = async (kind, code) => {
  return SaleOption.findOne({ where: { kind, code: String(code || '').trim().toUpperCase(), isActive: true } });
};

const createSaleOption = async ({ kind, name }) => {
  const normalizedName = normalizeOptionName(name);
  if (!Object.values(KINDS).includes(kind)) throw new ApiError(400, 'Tipo de opción inválido');
  if (!normalizedName) throw new ApiError(400, 'El nombre es obligatorio');

  const operation = optionQueue.then(async () => {
    await ensureDefaultSaleOptions();
    const normalizedKey = getOptionKey(normalizedName);
    const existing = await SaleOption.findOne({ where: { kind, normalizedName: normalizedKey } });
    if (existing) {
      if (!existing.isActive) await existing.update({ isActive: true });
      return existing;
    }

    const baseCode = toOptionCode(normalizedName) || 'OPTION';
    let code = baseCode;
    let suffix = 2;
    while (await SaleOption.findOne({ where: { kind, code } })) {
      code = `${baseCode}_${suffix}`;
      suffix += 1;
    }

    return SaleOption.create({
      kind,
      code,
      name: normalizedName,
      normalizedName: normalizedKey,
      requiresClient: kind === KINDS.SALE_TYPE && inferRequiresClient(normalizedName)
    });
  });

  optionQueue = operation.catch(() => undefined);
  return operation;
};

module.exports = {
  KINDS,
  normalizeOptionName,
  ensureDefaultSaleOptions,
  listSaleOptions,
  findSaleOptionByCode,
  createSaleOption
};
