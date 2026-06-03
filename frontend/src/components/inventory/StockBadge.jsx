import { memo } from 'react';
import { LOW_STOCK_LIMIT } from '../../hooks/useInventoryProducts';

function getStockState(stock) {
  const numericStock = Number(stock || 0);
  if (numericStock <= 0) return { label: 'SIN STOCK', tone: 'danger' };
  if (numericStock <= LOW_STOCK_LIMIT) return { label: 'STOCK BAJO', tone: 'warning' };
  return { label: 'NORMAL', tone: 'success' };
}

function StockBadge({ stock }) {
  const state = getStockState(stock);
  return <span className={`inventory-badge inventory-badge--${state.tone}`}>{state.label}</span>;
}

export default memo(StockBadge);
