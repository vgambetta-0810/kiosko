const asyncHandler = require('../utils/asyncHandler');
const { Op } = require('../models');
const Product = require('../models/Product');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');

const normalizeSku = (sku) => {
  const normalized = String(sku || '').trim().toUpperCase();
  return normalized || null;
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

  const candidate = String(newCategoryName || category || '').trim();
  if (!candidate) throw new ApiError(400, 'Categoria requerida');

  const existing = await Category.findOne({ where: { name: candidate } });
  if (existing) return existing;
  return Category.create({ name: candidate });
};

exports.create = asyncHandler(async (req, res) => {
  const normalizedSku = normalizeSku(req.body.sku);
  const categoryEntity = await resolveCategory(req.body);
  const payload = {
    ...req.body,
    sku: normalizedSku,
    categoryId: categoryEntity.id,
    category: categoryEntity.name
  };

  const created = await Product.create(payload);
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
  const sku = q.toUpperCase();
  const exactSku = await Product.findOne({ where: { sku, isActive: true }, include });
  if (exactSku) return res.json({ items: [mapProduct(exactSku)] });

  const byId = await Product.findByPk(q, { include });
  if (byId && byId.isActive) return res.json({ items: [mapProduct(byId)] });

  const items = await Product.findAll({
    where: {
      isActive: true,
      name: { [Op.like]: `%${q}%` }
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
  if (Object.prototype.hasOwnProperty.call(payload, 'sku')) {
    payload.sku = normalizeSku(payload.sku);
  }
  if (payload.categoryId || payload.category || payload.newCategoryName) {
    const categoryEntity = await resolveCategory(payload);
    payload.categoryId = categoryEntity.id;
    payload.category = categoryEntity.name;
  }

  await product.update(payload);
  const updated = await Product.findByPk(product.id, { include: [{ model: Category, as: 'categoryEntity' }] });
  res.json(mapProduct(updated));
});

exports.remove = asyncHandler(async (req, res) => {
  await Product.destroy({ where: { id: req.params.id } });
  res.status(204).send();
});
