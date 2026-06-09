const asyncHandler = require('../utils/asyncHandler');
const { Op } = require('../models');
const { col, fn, where } = require('sequelize');
const Product = require('../models/Product');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const { findOrCreateCategory, normalizeCategoryName } = require('../utils/categories');

const normalizeSku = (sku) => {
  const normalized = String(sku || '').trim().toUpperCase();
  return normalized || null;
};
const normalizeBarcode = (barcode) => {
  const normalized = String(barcode || '').trim();
  return normalized || null;
};
const findCodeConflict = async (codigoBarras, excludedProductId) => {
  const normalized = normalizeBarcode(codigoBarras);
  if (!normalized) return null;

  return Product.findOne({
    where: {
      ...(excludedProductId ? { id: { [Op.ne]: excludedProductId } } : {}),
      [Op.or]: [
        where(fn('lower', col('codigoBarras')), normalized.toLowerCase()),
        { sku: normalizeSku(normalized) }
      ]
    }
  });
};
const ensureCodeAvailable = async (codigoBarras, excludedProductId) => {
  if (await findCodeConflict(codigoBarras, excludedProductId)) {
    throw new ApiError(409, 'El codigo de barras ya esta registrado');
  }
};
const throwCodeConflict = (err, codigoBarras) => {
  if (codigoBarras && err.name === 'SequelizeUniqueConstraintError') {
    throw new ApiError(409, 'El codigo de barras ya esta registrado');
  }
  throw err;
};
const mapProduct = (product) => {
  const raw = product.toJSON();
  if (raw.categoryEntity?.name) raw.category = raw.categoryEntity.name;
  return raw;
};

const resolveCategory = async ({ categoryId, category, newCategoryName }) => {
  if (categoryId) {
    const byId = await Category.findByPk(categoryId);
    if (!byId) throw new ApiError(400, 'Categoria no encontrada');
    return byId;
  }

  const candidate = normalizeCategoryName(newCategoryName || category);
  if (!candidate) throw new ApiError(400, 'Categoria requerida');

  return findOrCreateCategory(candidate);
};

exports.create = asyncHandler(async (req, res) => {
  const normalizedBarcode = normalizeBarcode(req.body.codigoBarras);
  const normalizedSku = normalizeSku(req.body.sku);
  await ensureCodeAvailable(normalizedBarcode);
  if (normalizedSku && normalizedSku !== normalizeSku(normalizedBarcode)) {
    await ensureCodeAvailable(normalizedSku);
  }
  const categoryEntity = await resolveCategory(req.body);
  const payload = {
    ...req.body,
    sku: normalizedSku,
    codigoBarras: normalizedBarcode,
    categoryId: categoryEntity.id,
    category: categoryEntity.name
  };

  let created;
  try {
    created = await Product.create(payload);
  } catch (err) {
    throwCodeConflict(err, normalizedBarcode || normalizedSku);
  }
  const product = await Product.findByPk(created.id, { include: [{ model: Category, as: 'categoryEntity' }] });
  res.status(201).json(mapProduct(product));
});

exports.list = asyncHandler(async (_req, res) => {
  const products = await Product.findAll({ include: [{ model: Category, as: 'categoryEntity' }] });
  res.json(products.map(mapProduct));
});

exports.lookup = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ message: 'q is required' });

  const include = [{ model: Category, as: 'categoryEntity' }];
  const sku = normalizeSku(q);
  const exactCode = await Product.findOne({
    where: {
      isActive: true,
      [Op.or]: [{ sku }, where(fn('lower', col('codigoBarras')), q.toLowerCase())]
    },
    include
  });
  if (exactCode) return res.json({ items: [mapProduct(exactCode)] });

  const byId = await Product.findByPk(q, { include });
  if (byId && byId.isActive) return res.json({ items: [mapProduct(byId)] });

  const items = await Product.findAll({
    where: {
      isActive: true,
      [Op.or]: [{ name: { [Op.like]: `%${q}%` } }, { sku: { [Op.like]: `%${sku}%` } }, { codigoBarras: { [Op.like]: `%${q}%` } }]
    },
    include,
    order: [['name', 'ASC']],
    limit: 10
  });

  return res.json({ items: items.map(mapProduct) });
});

exports.update = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).json({ message: 'Not found' });

  const payload = { ...req.body };
  if (Object.prototype.hasOwnProperty.call(payload, 'codigoBarras')) {
    payload.codigoBarras = normalizeBarcode(payload.codigoBarras);
    await ensureCodeAvailable(payload.codigoBarras, product.id);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'sku')) {
    payload.sku = normalizeSku(payload.sku);
    if (payload.sku && payload.sku !== normalizeSku(payload.codigoBarras || product.codigoBarras)) {
      await ensureCodeAvailable(payload.sku, product.id);
    }
  }
  if (payload.categoryId || payload.category || payload.newCategoryName) {
    const categoryEntity = await resolveCategory(payload);
    payload.categoryId = categoryEntity.id;
    payload.category = categoryEntity.name;
  }

  try {
    await product.update(payload);
  } catch (err) {
    throwCodeConflict(err, payload.codigoBarras || payload.sku);
  }
  const updated = await Product.findByPk(product.id, { include: [{ model: Category, as: 'categoryEntity' }] });
  res.json(mapProduct(updated));
});

exports.remove = asyncHandler(async (req, res) => {
  await Product.destroy({ where: { id: req.params.id } });
  res.status(204).send();
});
