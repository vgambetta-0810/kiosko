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
  category: Joi.string().required(),
  price: Joi.number().min(0).required(),
  cost: Joi.number().min(0).required(),
  stock: Joi.number().min(0).default(0),
  delayDays: Joi.number().min(0).default(0)
});

exports.supplierSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().optional().allow(''),
  phone: Joi.string().optional().allow(''),
  address: Joi.string().optional().allow('')
});

exports.purchaseSchema = Joi.object({
  supplier: Joi.string().hex().length(24).required(),
  items: Joi.array().items(
    Joi.object({ product: Joi.string().hex().length(24).required(), quantity: Joi.number().min(1).required(), cost: Joi.number().min(0).required() })
  ).min(1).required()
});

exports.saleSchema = Joi.object({
  client: Joi.string().hex().length(24).optional().allow(null),
  items: Joi.array().items(
    Joi.object({ product: Joi.string().hex().length(24).required(), quantity: Joi.number().min(1).required() })
  ).min(1).required(),
  discount: Joi.number().min(0).default(0),
  paymentMethod: Joi.string().valid('CASH', 'TRANSFER', 'CARD', 'MP').required()
});

exports.reservationSchema = Joi.object({
  client: Joi.string().hex().length(24).required(),
  items: Joi.array().items(
    Joi.object({ product: Joi.string().hex().length(24).required(), quantity: Joi.number().min(1).required(), price: Joi.number().min(0).required() })
  ).min(1).required(),
  paidAmount: Joi.number().min(0).default(0),
  expiresAt: Joi.date().required()
});

exports.accountMovementSchema = Joi.object({
  ownerType: Joi.string().valid('CLIENT', 'SUPPLIER').required(),
  ownerId: Joi.string().hex().length(24).required(),
  type: Joi.string().valid('DEBT', 'PAYMENT', 'RECHARGE').required(),
  amount: Joi.number().min(0.01).required(),
  notes: Joi.string().optional().allow('')
});
