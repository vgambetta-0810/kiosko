import { memo } from 'react';

const moneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2
});

const compactMoneyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

function InventoryMetrics({ metrics, compact = false, className = '' }) {
  const formatMoney = compact ? compactMoneyFormatter : moneyFormatter;
  const cards = [
    { label: 'Total Productos', value: metrics.totalProducts },
    { label: 'Stock Bajo', value: metrics.lowStock, tone: 'warning' },
    { label: 'Sin Stock', value: metrics.outOfStock, tone: 'danger' },
    { label: 'Valor Inventario', value: formatMoney.format(metrics.inventoryValue) },
    { label: 'Valor Potencial de Venta', value: formatMoney.format(metrics.potentialSalesValue) },
    { label: 'Reservados', value: metrics.reservedUnits }
  ];
  const visibleCards = compact ? cards.slice(0, 4) : cards;
  const classNames = ['inventory-metrics', compact ? 'inventory-metrics--compact' : '', className].filter(Boolean).join(' ');

  return (
    <section className={classNames} aria-label="Metricas de inventario">
      {visibleCards.map((card) => (
        <article key={card.label} className={`inventory-metric ${card.tone ? `inventory-metric--${card.tone}` : ''}`}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </section>
  );
}

export default memo(InventoryMetrics);
