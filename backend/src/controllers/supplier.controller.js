const { col, fn, where } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Op, Supplier, Product, ProductSupplier } = require('../models');

const normalizeName = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
const cleanOptional = (value) => {
  const cleaned = String(value || '').trim().replace(/\s+/g, ' ');
  return cleaned || null;
};
const cleanCuit = (value) => {
  const cleaned = String(value || '').replace(/\D/g, '');
  return cleaned || null;
};

const supplierPayload = (body) => ({
  name: String(body.name || '').trim().replace(/\s+/g, ' '),
  normalizedName: normalizeName(body.name),
  businessName: cleanOptional(body.businessName),
  cuit: cleanCuit(body.cuit),
  email: cleanOptional(body.email),
  phone: cleanOptional(body.phone),
  address: cleanOptional(body.address),
  notes: cleanOptional(body.notes),
  ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {})
});

const ensureUnique = async ({ name, businessName, cuit, excludedId }) => {
  const candidates = new Set([normalizeName(name), normalizeName(businessName)].filter(Boolean));
  const normalizedCuit = cleanCuit(cuit);
  const suppliers = await Supplier.findAll({
    where: excludedId ? { id: { [Op.ne]: excludedId } } : undefined
  });
  const conflict = suppliers.find((supplier) => (
    (normalizedCuit && cleanCuit(supplier.cuit) === normalizedCuit)
    || candidates.has(normalizeName(supplier.name))
    || candidates.has(normalizeName(supplier.businessName))
  ));
  if (!conflict) return;
  if (normalizedCuit && cleanCuit(conflict.cuit) === normalizedCuit) throw new ApiError(409, 'El CUIT ya está registrado');
  throw new ApiError(409, 'Ya existe un proveedor con ese nombre');
};

exports.create = asyncHandler(async (req, res) => {
  await ensureUnique(req.body);
  res.status(201).json(await Supplier.create(supplierPayload(req.body)));
});

exports.list = asyncHandler(async (req, res) => {
  const q = String(req.query.search || req.query.q || '').trim();
  const qLower = q.toLowerCase();
  const qCuit = cleanCuit(q);
  const activeFilter = req.query.active;
  const suppliers = await Supplier.findAll({
    where: {
      ...(activeFilter !== undefined ? { isActive: activeFilter !== 'false' } : {}),
      ...(q
        ? {
            [Op.or]: [
              where(fn('lower', col('name')), { [Op.like]: `%${qLower}%` }),
              where(fn('lower', col('businessName')), { [Op.like]: `%${qLower}%` }),
              where(fn('lower', col('email')), { [Op.like]: `%${qLower}%` }),
              where(fn('lower', col('phone')), { [Op.like]: `%${qLower}%` }),
              { cuit: { [Op.like]: `%${q}%` } },
              ...(qCuit ? [{ cuit: { [Op.like]: `%${qCuit}%` } }] : [])
            ]
          }
        : {})
    },
    order: [['name', 'ASC']]
  });
  res.json(suppliers);
});

exports.update = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) throw new ApiError(404, 'Proveedor no encontrado');
  const next = { ...supplier.toJSON(), ...req.body };
  await ensureUnique({ name: next.name, businessName: next.businessName, cuit: next.cuit, excludedId: supplier.id });
  await supplier.update(supplierPayload(next));
  res.json(supplier);
});

exports.status = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) throw new ApiError(404, 'Proveedor no encontrado');
  await supplier.update({ isActive: Boolean(req.body.isActive) });
  res.json(supplier);
});

exports.products = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) throw new ApiError(404, 'Proveedor no encontrado');
  const links = await ProductSupplier.findAll({
    where: { supplierId: supplier.id },
    include: [{ model: Product, as: 'product' }],
    order: [['preferred', 'DESC'], ['createdAt', 'DESC']]
  });
  res.json(links);
});

exports.addProduct = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByPk(req.params.id);
  const product = await Product.findByPk(req.body.productId);
  if (!supplier || !product) throw new ApiError(404, 'Proveedor o producto no encontrado');
  const existing = await ProductSupplier.findOne({ where: { supplierId: supplier.id, productId: product.id } });
  if (existing) throw new ApiError(409, 'El producto ya está asociado a este proveedor');

  if (req.body.preferred) {
    await ProductSupplier.update({ preferred: false }, { where: { productId: product.id } });
  }
  const link = await ProductSupplier.create({ ...req.body, supplierId: supplier.id });
  res.status(201).json(await ProductSupplier.findByPk(link.id, { include: [{ model: Product, as: 'product' }] }));
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const link = await ProductSupplier.findOne({
    where: { supplierId: req.params.id, productId: req.params.productId }
  });
  if (!link) throw new ApiError(404, 'Relación producto-proveedor no encontrada');
  if (req.body.preferred) {
    await ProductSupplier.update({ preferred: false }, { where: { productId: link.productId } });
  }
  await link.update(req.body);
  res.json(await ProductSupplier.findByPk(link.id, { include: [{ model: Product, as: 'product' }] }));
});

exports.removeProduct = asyncHandler(async (req, res) => {
  const removed = await ProductSupplier.destroy({
    where: { supplierId: req.params.id, productId: req.params.productId }
  });
  if (!removed) throw new ApiError(404, 'Relación producto-proveedor no encontrada');
  res.status(204).send();
});

exports.productSuppliers = asyncHandler(async (req, res) => {
  const links = await ProductSupplier.findAll({
    where: { productId: req.params.productId },
    include: [{ model: Supplier, as: 'supplier' }],
    order: [['preferred', 'DESC'], ['createdAt', 'DESC']]
  });
  res.json(links);
});
