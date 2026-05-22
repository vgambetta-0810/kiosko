const { Op } = require('../models');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const User = require('../models/User');

const PAYMENT_METHODS = ['CASH', 'TRANSFER', 'CARD', 'MP'];

const toDate = (value, fallback) => {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const getRange = ({ preset, dateFrom, dateTo }) => {
  const now = new Date();

  if (preset === 'today') {
    return { from: startOfDay(now), to: endOfDay(now) };
  }

  if (preset === 'week') {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return { from: startOfDay(from), to: endOfDay(now) };
  }

  if (preset === 'month') {
    const from = new Date(now);
    from.setDate(now.getDate() - 29);
    return { from: startOfDay(from), to: endOfDay(now) };
  }

  const parsedFrom = toDate(dateFrom, startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)));
  const parsedTo = toDate(dateTo, now);
  return { from: startOfDay(parsedFrom), to: endOfDay(parsedTo) };
};

const currency = (num) => Number((num || 0).toFixed(2));

const toHourBucket = (date) => new Date(date).getHours();
const toDayBucket = (date) => new Date(date).toISOString().slice(0, 10);

const emptyPaymentBreakdown = () => ({ CASH: 0, TRANSFER: 0, CARD: 0, MP: 0 });

const buildWhere = ({ from, to, sellerId, clientId }) => {
  const where = {
    deletedAt: null,
    createdAt: { [Op.gte]: from, [Op.lte]: to }
  };

  if (sellerId) where.sellerId = sellerId;
  if (clientId) where.clientId = clientId;
  return where;
};

const saleToItems = (sale) => (Array.isArray(sale.items) ? sale.items : []);

const aggregateSales = (sales) => {
  const kpis = {
    netSales: 0,
    grossSales: 0,
    totalDiscount: 0,
    salesCount: 0,
    pendingAmount: 0,
    paidAmount: 0,
    pendingCount: 0,
    paidCount: 0,
    returnCount: 0,
    returnAmount: 0
  };

  const paymentBreakdown = emptyPaymentBreakdown();
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, gross: 0, net: 0, count: 0 }));
  const dailyMap = new Map();
  const topProducts = new Map();
  const returnsByProduct = new Map();

  for (const sale of sales) {
    const gross = Number(sale.total || 0);
    const net = Number(sale.finalTotal || 0);
    const discount = Number(sale.discount || 0);

    kpis.grossSales += gross;
    kpis.netSales += net;
    kpis.totalDiscount += discount;
    kpis.salesCount += 1;

    if (sale.status === 'PENDING') {
      kpis.pendingAmount += net;
      kpis.pendingCount += 1;
    } else {
      kpis.paidAmount += net;
      kpis.paidCount += 1;
      paymentBreakdown[sale.paymentMethod] = (paymentBreakdown[sale.paymentMethod] || 0) + net;
    }

    const hour = toHourBucket(sale.createdAt);
    hourly[hour].gross += gross;
    hourly[hour].net += net;
    hourly[hour].count += 1;

    const dayKey = toDayBucket(sale.createdAt);
    const day = dailyMap.get(dayKey) || { date: dayKey, gross: 0, net: 0, count: 0, paid: 0, pending: 0 };
    day.gross += gross;
    day.net += net;
    day.count += 1;
    if (sale.status === 'PAID') day.paid += net;
    if (sale.status === 'PENDING') day.pending += net;
    dailyMap.set(dayKey, day);

    for (const item of saleToItems(sale)) {
      const productId = item.productId;
      if (!productId) continue;
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0);

      if (qty > 0) {
        const agg = topProducts.get(productId) || { productId, quantity: 0, gross: 0 };
        agg.quantity += qty;
        agg.gross += qty * price;
        topProducts.set(productId, agg);
      }

      if (qty < 0) {
        const absQty = Math.abs(qty);
        kpis.returnCount += absQty;
        kpis.returnAmount += absQty * price;

        const ret = returnsByProduct.get(productId) || { productId, quantity: 0, amount: 0 };
        ret.quantity += absQty;
        ret.amount += absQty * price;
        returnsByProduct.set(productId, ret);
      }
    }
  }

  return {
    kpis: Object.fromEntries(Object.entries(kpis).map(([k, v]) => [k, currency(v)])),
    paymentBreakdown: PAYMENT_METHODS.map((method) => ({ method, amount: currency(paymentBreakdown[method] || 0) })),
    hourly: hourly.map((h) => ({ ...h, gross: currency(h.gross), net: currency(h.net) })),
    daily: Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ ...d, gross: currency(d.gross), net: currency(d.net), paid: currency(d.paid), pending: currency(d.pending) })),
    topProducts: Array.from(topProducts.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8),
    returnsByProduct: Array.from(returnsByProduct.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8)
  };
};

exports.getDashboardAnalytics = async ({ preset, dateFrom, dateTo, sellerId, clientId }) => {
  const { from, to } = getRange({ preset, dateFrom, dateTo });

  const where = buildWhere({ from, to, sellerId, clientId });
  const prevSpanMs = Math.max(24 * 60 * 60 * 1000, to.getTime() - from.getTime() + 1);
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - prevSpanMs + 1);

  const [sales, prevSales] = await Promise.all([
    Sale.findAll({ where, order: [['createdAt', 'ASC']] }),
    Sale.findAll({ where: buildWhere({ from: prevFrom, to: prevTo, sellerId, clientId }) })
  ]);

  const current = aggregateSales(sales);
  const previous = aggregateSales(prevSales);

  const allProductIds = [...new Set([...current.topProducts, ...current.returnsByProduct].map((p) => p.productId))];
  const products = allProductIds.length ? await Product.findAll({ where: { id: allProductIds }, attributes: ['id', 'name', 'sku', 'category'] }) : [];
  const productById = Object.fromEntries(products.map((p) => [p.id, p]));

  const withProductNames = (rows) =>
    rows.map((row) => ({
      ...row,
      product: productById[row.productId] || null
    }));

  const variation = (nowValue, prevValue) => {
    if (!prevValue && !nowValue) return 0;
    if (!prevValue) return 100;
    return currency(((nowValue - prevValue) / prevValue) * 100);
  };

  const changes = {
    netSales: variation(current.kpis.netSales, previous.kpis.netSales),
    grossSales: variation(current.kpis.grossSales, previous.kpis.grossSales),
    totalDiscount: variation(current.kpis.totalDiscount, previous.kpis.totalDiscount),
    salesCount: variation(current.kpis.salesCount, previous.kpis.salesCount),
    pendingAmount: variation(current.kpis.pendingAmount, previous.kpis.pendingAmount),
    paidAmount: variation(current.kpis.paidAmount, previous.kpis.paidAmount)
  };

  return {
    filters: {
      preset: preset || 'custom',
      dateFrom: from.toISOString(),
      dateTo: to.toISOString(),
      sellerId: sellerId || null,
      clientId: clientId || null
    },
    kpis: current.kpis,
    previousKpis: previous.kpis,
    changes,
    finance: {
      collected: current.kpis.paidAmount,
      pendingDebt: current.kpis.pendingAmount,
      discounts: current.kpis.totalDiscount,
      returnsLost: current.kpis.returnAmount
    },
    charts: {
      dailySales: current.daily,
      hourlySales: current.hourly,
      paymentMethods: current.paymentBreakdown,
      topProducts: withProductNames(current.topProducts),
      returns: {
        quantity: current.kpis.returnCount,
        amount: current.kpis.returnAmount,
        topReturnedProducts: withProductNames(current.returnsByProduct)
      }
    }
  };
};

exports.getFiltersMetadata = async () => {
  const [sellers, clients] = await Promise.all([
    User.findAll({ where: { role: 'SELLER', isActive: true }, attributes: ['id', 'name', 'email'], order: [['name', 'ASC']] }),
    User.findAll({ where: { role: { [Op.in]: ['CLIENT', 'PARENT'] }, isActive: true }, attributes: ['id', 'name', 'email'], order: [['name', 'ASC']] })
  ]);

  return { sellers, clients };
};
