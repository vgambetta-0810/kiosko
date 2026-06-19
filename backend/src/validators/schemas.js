const Joi = require('joi');

exports.registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('ADMIN', 'SELLER', 'CLIENT', 'PARENT').default('CLIENT'),
  age: Joi.number().integer().min(0).max(120).optional(),
  parent: Joi.string().hex().length(24).optional().allow(null)
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

exports.productSchema = Joi.object({
  name: Joi.string().required(),
  sku: Joi.string().optional().allow('', null),
  codigoBarras: Joi.string().optional().allow('', null),
  category: Joi.string().optional().allow(''),
  categoryId: Joi.string().guid({ version: ['uuidv4'] }).optional().allow('', null),
  newCategoryName: Joi.string().optional().allow(''),
  price: Joi.number().min(0).required(),
  cost: Joi.number().min(0).required(),
  stock: Joi.number().min(0).default(0),
  delayDays: Joi.number().min(0).default(0)
}).or('category', 'categoryId', 'newCategoryName');

exports.supplierSchema = Joi.object({
  name: Joi.string().trim().required(),
  businessName: Joi.string().trim().optional().allow('', null),
  cuit: Joi.string().trim().optional().allow('', null),
  email: Joi.string().email().optional().allow('', null),
  phone: Joi.string().trim().optional().allow('', null),
  address: Joi.string().trim().optional().allow('', null),
  notes: Joi.string().trim().optional().allow('', null),
  isActive: Joi.boolean().optional()
});

exports.purchaseSchema = Joi.object({
  supplierId: Joi.string().guid({ version: ['uuidv4'] }).required(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().guid({ version: ['uuidv4'] }).required(),
      quantity: Joi.number().positive().required(),
      unitCost: Joi.number().min(0).required()
    })
  ).min(1).required(),
  purchaseDate: Joi.date().optional(),
  notes: Joi.string().optional().allow('', null),
  status: Joi.string().uppercase().valid('DRAFT', 'CONFIRMED').optional()
});

exports.productSupplierSchema = Joi.object({
  productId: Joi.string().guid({ version: ['uuidv4'] }).required(),
  supplierSku: Joi.string().trim().optional().allow('', null),
  lastCost: Joi.number().min(0).optional().allow(null),
  preferred: Joi.boolean().optional(),
  isActive: Joi.boolean().optional()
});

exports.saleSchema = Joi.object({
  clientId: Joi.string().guid({ version: ['uuidv4'] }).optional().allow(null, ''),
  items: Joi.array().items(
    Joi.object({ productId: Joi.string().guid({ version: ['uuidv4'] }).required(), quantity: Joi.number().invalid(0).required() })
  ).min(1).required(),
  discount: Joi.number().min(0).default(0),
  paymentMethod: Joi.string().trim().required(),
  status: Joi.string().trim().default('PAID')
});

exports.clientSchema = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().email().optional().allow('', null),
  phone: Joi.string().trim().optional().allow('', null),
  cardId: Joi.string().trim().optional().allow('', null),
  isActive: Joi.boolean().optional()
});

exports.clientUpdateSchema = Joi.object({
  name: Joi.string().trim().optional(),
  email: Joi.string().email().optional().allow('', null),
  phone: Joi.string().trim().optional().allow('', null),
  cardId: Joi.string().trim().optional().allow('', null),
  isActive: Joi.boolean().optional()
}).min(1);

exports.saleStatusSchema = Joi.object({
  status: Joi.string().trim().uppercase().valid('PAID').required()
});

exports.reservationSchema = Joi.object({
  client: Joi.string().guid({ version: ['uuidv4'] }).required(),
  items: Joi.array().items(
    Joi.object({ product: Joi.string().guid({ version: ['uuidv4'] }).required(), quantity: Joi.number().min(1).required(), price: Joi.number().min(0).required() })
  ).min(1).required(),
  paidAmount: Joi.number().min(0).default(0),
  expiresAt: Joi.date().required(),
  status: Joi.string().trim().uppercase().valid('ACTIVE', 'RETIRED', 'CANCELLED').optional()
});

exports.reservationStatusSchema = Joi.object({
  status: Joi.string().trim().uppercase().valid('ACTIVE', 'RETIRED', 'CANCELLED').required()
});

exports.clientReservationSchema = Joi.object({
  productId: Joi.string().guid({ version: ['uuidv4'] }).required(),
  quantity: Joi.number().integer().min(1).required()
});

exports.balanceChargeSchema = Joi.object({
  amount: Joi.number().positive().required(),
  paymentMethod: Joi.string().trim().required(),
  notes: Joi.string().trim().optional().allow(''),
  note: Joi.string().trim().optional().allow('')
});

exports.accountMovementSchema = Joi.object({
  ownerType: Joi.string().valid('CLIENT', 'SUPPLIER').required(),
  ownerId: Joi.string().guid({ version: ['uuidv4'] }).required(),
  type: Joi.string().valid('DEBT', 'PAYMENT', 'RECHARGE', 'CONSUMPTION', 'ADJUSTMENT').required(),
  amount: Joi.number().min(0.01).required(),
  notes: Joi.string().optional().allow('')
});
