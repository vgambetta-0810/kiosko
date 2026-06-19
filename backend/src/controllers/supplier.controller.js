const { col, fn, where } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { Op, Supplier, Product, ProductSupplier } = require('../models');

const normalizeName = (value) => String(value || '').trim().toLocaleLowerCase('es');
const cleanOptional = (value) => {
  const cleaned = String(value || '').trim();
  return cleaned || null;
};

const supplierPayload = (body) => ({
  name: String(body.name || '').trim(),
  normalizedName: normalizeName(body.name),
  businessName: cleanOptional(body.businessName),
  cuit: cleanOptional(body.cuit),
  email: cleanOptional(body.email),
  phone: cleanOptional(body.phone),
  address: cleanOptional(body.address),
  notes: cleanOptional(body.notes),
  ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {})
});

const ensureUnique = async ({ name, cuit, excludedId }) => {
  const conflict = await Supplier.findOne({
    where: {
      ...(excludedId ? { id: { [Op.ne]: excludedId } } : {}),
      [Op.or]: [
        { normalizedName: normalizeName(name) },
        ...(cleanOptional(cuit) ? [{ cuit: cleanOptional(cuit) }] : [])
      ]
    }
  });
  if (!conflict) return;
  if (cleanOptional(cuit) && conflict.cuit === cleanOptional(cuit)) throw new ApiError(409, 'El CUIT ya está registrado');
  throw new ApiError(409, 'Ya existe un proveedor con ese nombre');
};

exports.create = asyncHandler(async (req, res) => {
  await ensureUnique(req.body);
  res.status(201).json(await Supplier.create(supplierPayload(req.body)));
});

exports.list = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const suppliers = await Supplier.findAll({
    where: q
      ? {
          [Op.or]: [
            where(fn('lower', col('name')), { [Op.like]: `%${q.toLowerCase()}%` }),
            { businessName: { [Op.like]: `%${q}%` } },
            { cuit: { [Op.like]: `%${q}%` } }
          ]
        }
      : undefined,
    order: [['name', 'ASC']]
  });
  res.json(suppliers);
});

exports.update = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) throw new ApiError(404, 'Proveedor no encontrado');
  const next = { ...supplier.toJSON(), ...req.body };
  await ensureUnique({ name: next.name, cuit: next.cuit, excludedId: supplier.id });
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
