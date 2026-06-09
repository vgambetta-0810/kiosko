export const getProductCode = (product) =>
  product?.codigoBarras || product?.legacyCode || product?.sku || '';

export const getProductCodeLabel = (product) => getProductCode(product) || 'Sin código';
